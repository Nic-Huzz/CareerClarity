import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { GradientWheel } from './CompetenceWheels'
import './CompetenceWheels/GradientWheel.css'
import { SKILLS_SEGMENTS, PROFICIENCY_RINGS } from '../lib/wheelTaxonomy'
import './FlowFinder.css'

const STORAGE_KEY = 'flowFinderSkills'

const defaultResponses = {
  q1_childhood: ['', '', '', '', ''],
  q2_highschool: ['', '', '', '', ''],
  q3_postschool: ['', '', '', '', ''],
  q4_work: ['', '', '', '', ''],
  q5_skills: ['', '', '', '', '']
}

export default function FlowFinderSkills() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get session_id from URL params (passed from Persona flow or Quiz)
  const quizSessionId = searchParams.get('session')

  // Generate a flow-specific session ID if no session provided
  const [flowSessionId] = useState(() => `skills-${crypto.randomUUID()}`)

  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [responses, setResponses] = useState(defaultResponses)
  const [clusters, setClusters] = useState([])
  const [preliminaryClusters, setPreliminaryClusters] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [litCells, setLitCells] = useState(new Set())
  // Proficiency ratings for Q3-Q5 items: { 'item_text': 'emerging' | 'establishing' | 'mastering' }
  const [proficiencyRatings, setProficiencyRatings] = useState({})

  // Add hue values to segments for wheel rendering
  const skillsWithHue = useMemo(() =>
    SKILLS_SEGMENTS.map((s, i) => ({ ...s, name: s.displayName, hue: i * 30 })),
    []
  )

  // Map cluster labels to wheel segment indices using keyword matching
  const mapClusterToSegments = (clusterLabel) => {
    const labelLower = clusterLabel.toLowerCase()

    // Map keywords to segment indices (matching SKILLS_SEGMENTS order)
    const segmentMappings = {
      // Clarifying (0)
      clarifying: [0], explaining: [0], teaching: [0], translating: [0], communicate: [0], 'make clear': [0],
      // Analyzing (1)
      analyzing: [1], analysis: [1], data: [1], patterns: [1], research: [1], investigate: [1], numbers: [1],
      // Strategizing (2)
      strategizing: [2], strategy: [2], planning: [2], vision: [2], direction: [2], 'big picture': [2], prioritize: [2],
      // Organizing (3)
      organizing: [3], systems: [3], operations: [3], processes: [3], logistics: [3], order: [3], structure: [3],
      // Building (4)
      building: [4], making: [4], engineering: [4], coding: [4], developing: [4], construct: [4], prototype: [4],
      // Designing (5)
      designing: [5], design: [5], ux: [5], visual: [5], aesthetic: [5], experience: [5], interface: [5],
      // Creating (6)
      creating: [6], creative: [6], art: [6], writing: [6], ideation: [6], invent: [6], compose: [6],
      // Expressing (7)
      expressing: [7], storytelling: [7], presenting: [7], speaking: [7], voice: [7], perform: [7],
      // Connecting (8)
      connecting: [8], networking: [8], collaboration: [8], facilitating: [8], relationships: [8], empathy: [8],
      // Influencing (9)
      influencing: [9], sales: [9], persuading: [9], motivating: [9], negotiate: [9], advocate: [9],
      // Nurturing (10)
      nurturing: [10], coaching: [10], mentoring: [10], supporting: [10], develop: [10], grow: [10], care: [10],
      // Synthesizing (11)
      synthesizing: [11], integrating: [11], wisdom: [11], holistic: [11], 'connect dots': [11], meaning: [11],
      // Compound terms
      'problem solving': [1, 2], 'problem-solving': [1, 2],
      'team building': [8, 10], leadership: [2, 9],
      communication: [0, 7], 'project management': [2, 3],
      innovation: [4, 6], entrepreneurship: [2, 4, 9],
    }

    const matchedSegments = new Set()
    Object.entries(segmentMappings).forEach(([keyword, indices]) => {
      if (labelLower.includes(keyword)) {
        indices.forEach(i => matchedSegments.add(i))
      }
    })

    // Default to Creating if no match
    return matchedSegments.size > 0 ? Array.from(matchedSegments) : [6]
  }

  // Map proficiency rating to ring index
  const getRingForProficiency = (rating) => {
    switch (rating) {
      case 'emerging': return 0
      case 'establishing': return 1
      case 'mastering': return 2
      default: return 1
    }
  }

  // Get all Q3-Q5 items for proficiency rating (business-relevant items)
  const getBusinessRelevantItems = () => {
    const items = []
    const q3Items = responses.q3_postschool.filter(r => r.trim().length > 0)
    const q4Items = responses.q4_work.filter(r => r.trim().length > 0)
    const q5Items = responses.q5_skills.filter(r => r.trim().length > 0)

    q3Items.forEach(item => items.push({ text: item.trim(), source: 'q3' }))
    q4Items.forEach(item => items.push({ text: item.trim(), source: 'q4' }))
    q5Items.forEach(item => items.push({ text: item.trim(), source: 'q5' }))

    return items
  }

  // Update proficiency rating for an item
  const setItemRating = (itemText, rating) => {
    setProficiencyRatings(prev => ({
      ...prev,
      [itemText]: rating
    }))
  }

  // Check if all items have been rated
  const allItemsRated = () => {
    const items = getBusinessRelevantItems()
    return items.length > 0 && items.every(item => proficiencyRatings[item.text])
  }

  // Update lit cells when clusters change - use proficiency for ring placement
  useEffect(() => {
    if (clusters.length > 0) {
      const newLitCells = new Set()

      clusters.forEach(cluster => {
        const segmentIndices = mapClusterToSegments(cluster.label)

        // Calculate dominant proficiency from item ratings
        const itemsWithProficiency = cluster.itemsWithProficiency || []
        const proficiencyCounts = { emerging: 0, establishing: 0, mastering: 0 }
        itemsWithProficiency.forEach(item => {
          if (item.rating) proficiencyCounts[item.rating]++
        })

        let dominantProficiency = cluster.proficiency || 'establishing'
        if (!cluster.proficiency) {
          let maxCount = 0
          Object.entries(proficiencyCounts).forEach(([level, count]) => {
            if (count > maxCount) {
              maxCount = count
              dominantProficiency = level
            }
          })
        }

        const ringIdx = getRingForProficiency(dominantProficiency)
        segmentIndices.forEach(segIdx => {
          newLitCells.add(`${segIdx}-${ringIdx}`)
        })
      })

      setLitCells(newLitCells)
    }
  }, [clusters])

  // Load saved progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        // Only restore if there's actual progress and screen is not complete
        if (data.currentScreen && data.currentScreen !== 'welcome' && data.currentScreen !== 'success') {
          setCurrentScreen(data.currentScreen)
          setResponses(data.responses || defaultResponses)
          setPreliminaryClusters(data.preliminaryClusters || [])
        }
      }
    } catch (err) {
      console.error('Error loading saved progress:', err)
    }
    setIsLoaded(true)
  }, [])

  // Save progress to localStorage whenever relevant state changes
  useEffect(() => {
    if (!isLoaded) return

    // Don't save if we're on success (flow is complete)
    if (currentScreen === 'success') {
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    const dataToSave = {
      currentScreen,
      responses,
      preliminaryClusters
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (err) {
      console.error('Error saving progress:', err)
    }
  }, [isLoaded, currentScreen, responses, preliminaryClusters])

  useEffect(() => {
    createSession()
  }, [])

  useEffect(() => {
    if (currentScreen === 'processing1' && preliminaryClusters.length === 0) {
      analyzePreliminary()
    }
  }, [currentScreen])

  const createSession = async () => {
    try {
      // First check if session already exists (handles React strict mode double-mount)
      const { data: existing } = await supabase
        .from('flow_sessions')
        .select('id')
        .eq('session_id', quizSessionId || flowSessionId)
        .eq('flow_type', 'nikigai_skills')
        .single()

      if (existing) {
        setSessionId(existing.id)
        return
      }

      const { data, error } = await supabase
        .from('flow_sessions')
        .insert({
          session_id: quizSessionId || flowSessionId,
          flow_type: 'nikigai_skills',
          status: 'in_progress'
        })
        .select()
        .single()

      if (error) throw error
      setSessionId(data.id)
    } catch (err) {
      console.error('Error creating session:', err)
    }
  }

  const addInput = (questionKey) => {
    setResponses(prev => ({
      ...prev,
      [questionKey]: [...prev[questionKey], '']
    }))
  }

  const updateResponse = (questionKey, index, value) => {
    setResponses(prev => {
      const newArray = [...prev[questionKey]]
      newArray[index] = value
      return { ...prev, [questionKey]: newArray }
    })
  }

  const hasMinimumResponses = (questionKey, minCount = 3) => {
    const filledResponses = responses[questionKey].filter(r => r.trim().length > 0)
    return filledResponses.length >= minCount
  }

  const goBack = (fromScreen) => {
    const screenOrder = ['welcome', 'q1', 'q2', 'q3', 'processing1', 'q4', 'q5', 'rating']
    const currentIndex = screenOrder.indexOf(fromScreen)
    if (currentIndex > 0) {
      let targetIndex = currentIndex - 1
      if (screenOrder[targetIndex] === 'processing1') targetIndex = currentIndex - 2
      setCurrentScreen(screenOrder[Math.max(0, targetIndex)])
    }
  }

  const BackButton = ({ fromScreen }) => (
    <button
      className="back-button"
      onClick={() => goBack(fromScreen)}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '4px 0 2px 0',
        marginTop: '16px',
        marginBottom: '0',
        display: 'block',
        width: '100%',
        textAlign: 'center'
      }}
    >
      Go Back
    </button>
  )

  const analyzePreliminary = async () => {
    try {
      const items = []
      ;['q1_childhood', 'q2_highschool', 'q3_postschool'].forEach(key => {
        responses[key].forEach(val => {
          if (val.trim()) items.push(val.trim())
        })
      })

      const allResponses = [{
        session_id: quizSessionId || flowSessionId,
        response_raw: items.join('\n'),
        store_as: 'preliminary_skills'
      }]

      const { data, error } = await supabase.functions.invoke('nikigai-conversation', {
        body: {
          currentStep: { id: 'skills_preliminary', assistant_prompt: 'Skills clustering from hobbies' },
          userResponse: 'Ready to see preliminary patterns',
          shouldCluster: true,
          clusterType: 'skills',
          clusterSources: ['preliminary_skills'],
          allResponses: allResponses,
          conversationHistory: []
        }
      })

      if (error) {
        console.error('Preliminary clustering error:', error)
        return
      }

      setPreliminaryClusters(data.clusters || [])
    } catch (err) {
      console.error('Error in preliminary analysis:', err)
    }
  }

  const analyzeResponses = async () => {
    setIsProcessing(true)
    setCurrentScreen('processing')

    try {
      // Transform responses to match edge function format
      // Include proficiency ratings for Q3-Q5 items
      const allItems = []
      const itemsWithRatings = []

      // Q1-Q2: Pattern items (childhood/highschool) - no ratings
      ;['q1_childhood', 'q2_highschool'].forEach(key => {
        responses[key].forEach(val => {
          if (val.trim()) {
            allItems.push(val.trim())
            itemsWithRatings.push({ text: val.trim(), source: key, rating: null })
          }
        })
      })

      // Q3-Q5: Business-relevant items - include ratings
      ;['q3_postschool', 'q4_work', 'q5_skills'].forEach(key => {
        responses[key].forEach(val => {
          if (val.trim()) {
            const rating = proficiencyRatings[val.trim()] || 'establishing'
            allItems.push(`${val.trim()} [${rating}]`)
            itemsWithRatings.push({ text: val.trim(), source: key, rating })
          }
        })
      })

      const allResponses = [{
        session_id: quizSessionId || flowSessionId,
        response_raw: allItems.join('\n'),
        store_as: 'all_skills',
        items_with_ratings: itemsWithRatings
      }]

      const { data, error } = await supabase.functions.invoke('nikigai-conversation', {
        body: {
          currentStep: { id: 'skills_final', assistant_prompt: 'Skills analysis complete' },
          userResponse: 'Ready to analyze my skills',
          shouldCluster: true,
          clusterType: 'roles',
          clusterSources: ['all_skills'],
          allResponses: allResponses,
          conversationHistory: []
        }
      })

      if (error) throw error

      const returnedClusters = data.clusters || []

      // Enrich clusters with proficiency ratings for each item
      const enrichedClusters = returnedClusters.map(cluster => {
        const itemsWithProficiency = (cluster.items || []).map(item => {
          // Clean item text (remove any [rating] suffix that might have been added)
          const cleanItem = item.replace(/\s*\[(emerging|establishing|mastering)\]\s*$/i, '').trim()
          const rating = proficiencyRatings[cleanItem] || null
          return { text: cleanItem, rating }
        })

        // Calculate dominant proficiency for this cluster
        const proficiencyCounts = { emerging: 0, establishing: 0, mastering: 0 }
        itemsWithProficiency.forEach(item => {
          if (item.rating) proficiencyCounts[item.rating]++
        })

        let dominantProficiency = 'establishing'
        let maxCount = 0
        Object.entries(proficiencyCounts).forEach(([level, count]) => {
          if (count > maxCount) {
            maxCount = count
            dominantProficiency = level
          }
        })

        return { ...cluster, itemsWithProficiency, proficiency: dominantProficiency }
      })

      // Save clusters to database with proficiency data
      const clustersToSave = enrichedClusters.map(cluster => ({
        session_id: quizSessionId || flowSessionId,
        cluster_type: 'skills',
        cluster_stage: 'final',
        cluster_label: cluster.label,
        insight: cluster.insight,
        proficiency: cluster.proficiency,
        items: cluster.itemsWithProficiency.map(i => ({
          text: i.text,
          rating: i.rating
        }))
      }))

      const { error: insertError } = await supabase
        .from('nikigai_clusters')
        .insert(clustersToSave)

      if (insertError) throw insertError

      setClusters(enrichedClusters)

      await supabase
        .from('flow_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId)

      // Clear localStorage on success
      localStorage.removeItem(STORAGE_KEY)

      setCurrentScreen('success')
    } catch (err) {
      console.error('Error analyzing responses:', err)
      alert('Error generating insights. Please try again.')
      setCurrentScreen('rating')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderWelcome = () => (
    <div className="ff-container ff-welcome-container">
      <h1 className="ff-welcome-greeting">Flow Finder: Skills Discovery</h1>
      <div className="ff-welcome-message">
        <p><strong>Hey there!</strong></p>
        <p>What does a business do? It solves a problem, for a person, using a set of skills.</p>
        <p>By identifying skills we're passionate about using, people we're passionate about serving and problems we're passionate about solving - we can identify dream business opportunities.</p>
        <p>This flow is inspired by Steve Jobs: <em>"you can't connect the dots looking forward, you can only connect them looking back."</em></p>
        <p><strong>For each question, aim for 5+ bullet points.</strong> The more dots we have, the better.</p>
      </div>
      <button className="ff-primary-button" onClick={() => setCurrentScreen('q1')}>
        Let's Start!
      </button>
    </div>
  )

  const renderQuestion1 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 1 of 5</div>
      <h2 className="ff-question-text">Let's start with Childhood</h2>
      <p className="ff-question-subtext">Thinking back to Pre-school & Primary: What did you love doing most? What activities did you gravitate towards during free-time?</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q1_childhood.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Playing with Legos" : index === 1 ? "Drawing and creating art" : index === 2 ? "Playing sports with friends" : index === 3 ? "Reading adventure books" : "Enter another activity..."}
              value={value}
              onChange={(e) => updateResponse('q1_childhood', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q1_childhood')}>+ Add More</button>

      {!hasMinimumResponses('q1_childhood') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('q2')}
        disabled={!hasMinimumResponses('q1_childhood')}
        style={{ opacity: hasMinimumResponses('q1_childhood') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q1" />
    </div>
  )

  const renderQuestion2 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 2 of 5</div>
      <h2 className="ff-question-text">Now think of your teenage years throughout High School</h2>
      <p className="ff-question-subtext">What did you enjoy doing most? What extra-curricular activities did you do? Any subjects or assignments that you loved?</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q2_highschool.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Being part of the debate team" : index === 1 ? "Playing in a band" : index === 2 ? "Coding my first website" : index === 3 ? "Organizing school events" : "Enter another activity..."}
              value={value}
              onChange={(e) => updateResponse('q2_highschool', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q2_highschool')}>+ Add More</button>

      {!hasMinimumResponses('q2_highschool') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('q3')}
        disabled={!hasMinimumResponses('q2_highschool')}
        style={{ opacity: hasMinimumResponses('q2_highschool') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q2" />
    </div>
  )

  const renderQuestion3 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 3 of 5</div>
      <h2 className="ff-question-text">After school and before full-time work life</h2>
      <p className="ff-question-subtext">What activities, projects or creative outlets do you enjoy the most?</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q3_postschool.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Building side projects" : index === 1 ? "Creating content for social media" : index === 2 ? "Learning new skills online" : index === 3 ? "Volunteering in the community" : "Enter another activity..."}
              value={value}
              onChange={(e) => updateResponse('q3_postschool', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q3_postschool')}>+ Add More</button>

      {!hasMinimumResponses('q3_postschool') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('processing1')}
        disabled={!hasMinimumResponses('q3_postschool')}
        style={{ opacity: hasMinimumResponses('q3_postschool') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q3" />
    </div>
  )

  const renderProcessing1 = () => {
    if (preliminaryClusters.length === 0) {
      return (
        <div className="ff-container ff-processing-container">
          <div className="ff-spinner"></div>
          <div className="ff-processing-text">Analyzing patterns...</div>
          <div className="ff-processing-subtext">
            Looking for skill themes across your childhood, high school, and recent activities.
            <br /><br />
            This usually takes 10-15 seconds.
          </div>
        </div>
      )
    }

    return (
      <div className="ff-container ff-welcome-container">
        <h1 className="ff-welcome-greeting">Here are some early patterns we're seeing</h1>
        <div className="ff-welcome-message">
          <p>Based on your childhood, high school, and recent activities, here are some skill themes emerging:</p>
        </div>

        <div className="ff-cluster-grid" style={{ margin: '32px 0' }}>
          {preliminaryClusters.map((cluster, index) => (
            <div key={index} className="ff-cluster-card" style={{ cursor: 'default', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
              <h3>{cluster.label}</h3>
              <p>{cluster.insight}</p>
            </div>
          ))}
        </div>

        <div className="ff-welcome-message">
          <p><strong>Next:</strong> Let's explore your work experience and skills you've deliberately developed.</p>
        </div>

        <button className="ff-primary-button" onClick={() => setCurrentScreen('q4')}>
          Continue to Work & Projects
        </button>
      </div>
    )
  }

  const renderQuestion4 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 4 of 5</div>
      <h2 className="ff-question-text">Let's explore your work and projects</h2>
      <p className="ff-question-subtext">Across your jobs, projects, or creative pursuits, what have you enjoyed doing most? Think of times you felt in flow.</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q4_work.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Leading a team to solve a problem" : index === 1 ? "Designing user experiences" : index === 2 ? "Writing and creating content" : index === 3 ? "Analyzing data to find insights" : "Enter another activity..."}
              value={value}
              onChange={(e) => updateResponse('q4_work', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q4_work')}>+ Add More</button>

      {!hasMinimumResponses('q4_work') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('q5')}
        disabled={!hasMinimumResponses('q4_work')}
        style={{ opacity: hasMinimumResponses('q4_work') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q4" />
    </div>
  )

  const renderQuestion5 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 5 of 5</div>
      <h2 className="ff-question-text">What skills have you loved to develop?</h2>
      <p className="ff-question-subtext">Think about skills you've intentionally worked on through courses, practice, or personal curiosity.</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q5_skills.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Public speaking and presentation" : index === 1 ? "Coding and software development" : index === 2 ? "Marketing and growth" : index === 3 ? "Design and visual communication" : "Enter another skill..."}
              value={value}
              onChange={(e) => updateResponse('q5_skills', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q5_skills')}>+ Add More</button>

      {!hasMinimumResponses('q5_skills') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('rating')}
        disabled={!hasMinimumResponses('q5_skills')}
        style={{ opacity: hasMinimumResponses('q5_skills') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q5" />
    </div>
  )

  const renderRating = () => {
    const items = getBusinessRelevantItems()
    const ratedCount = Object.keys(proficiencyRatings).length
    const totalCount = items.length

    return (
      <div className="ff-container ff-question-container">
        <div className="ff-question-number">Final Step</div>
        <h2 className="ff-question-text">Rate your proficiency</h2>
        <p className="ff-question-subtext">
          For each skill, ask yourself: <em>"Could I confidently teach this to someone else?"</em>
        </p>

        <div className="rating-legend" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '24px',
          fontSize: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fbbf24', fontWeight: '600' }}>Emerging</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Still learning</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#60a5fa', fontWeight: '600' }}>Establishing</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Can do well</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#6BCB77', fontWeight: '600' }}>Mastering</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Could teach it</div>
          </div>
        </div>

        <div className="rating-list" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '50vh',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {items.map((item, index) => (
            <div
              key={index}
              className="rating-item"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ fontWeight: '500', color: 'white' }}>{item.text}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setItemRating(item.text, 'emerging')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: proficiencyRatings[item.text] === 'emerging'
                      ? '#fbbf24'
                      : 'rgba(251, 191, 36, 0.15)',
                    color: proficiencyRatings[item.text] === 'emerging'
                      ? '#1a1a2e'
                      : '#fbbf24',
                    transition: 'all 0.2s'
                  }}
                >
                  Emerging
                </button>
                <button
                  onClick={() => setItemRating(item.text, 'establishing')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: proficiencyRatings[item.text] === 'establishing'
                      ? '#60a5fa'
                      : 'rgba(96, 165, 250, 0.15)',
                    color: proficiencyRatings[item.text] === 'establishing'
                      ? '#1a1a2e'
                      : '#60a5fa',
                    transition: 'all 0.2s'
                  }}
                >
                  Establishing
                </button>
                <button
                  onClick={() => setItemRating(item.text, 'mastering')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: proficiencyRatings[item.text] === 'mastering'
                      ? '#6BCB77'
                      : 'rgba(107, 203, 119, 0.15)',
                    color: proficiencyRatings[item.text] === 'mastering'
                      ? '#1a1a2e'
                      : '#6BCB77',
                    transition: 'all 0.2s'
                  }}
                >
                  Mastering
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
          {ratedCount} of {totalCount} rated
        </div>

        {!allItemsRated() && (
          <div className="ff-input-hint" style={{ color: '#fbbf24', marginBottom: '8px', textAlign: 'center' }}>
            Please rate all items to continue
          </div>
        )}

        <button
          className="ff-primary-button"
          onClick={analyzeResponses}
          disabled={!allItemsRated()}
          style={{ opacity: allItemsRated() ? 1 : 0.5 }}
        >
          Analyze My Skills
        </button>
        <BackButton fromScreen="rating" />
      </div>
    )
  }

  const renderProcessing = () => (
    <div className="ff-container ff-processing-container">
      <div className="ff-spinner"></div>
      <div className="ff-processing-text">Identifying your role archetypes...</div>
      <div className="ff-processing-subtext">
        Bringing together all your responses to reveal the skills and strengths where you naturally thrive.
        <br /><br />
        This usually takes 10-15 seconds.
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="ff-container ff-welcome-container">
      <h1 className="ff-welcome-greeting">Here's what we discovered about you</h1>
      <div className="ff-welcome-message">
        <p>Based on your responses, we've identified role archetypes where you naturally thrive:</p>
      </div>

      {/* Skills Wheel Visualization */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <GradientWheel
            segments={skillsWithHue}
            rings={PROFICIENCY_RINGS}
            litCells={litCells}
            size={280}
            centerLabel="SKILLS"
            interactive={true}
            celebrate={true}
          />
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            <span>Inner: Emerging</span>
            <span>Middle: Establishing</span>
            <span>Outer: Mastering</span>
          </div>
        </div>
      </div>

      <div className="ff-cluster-grid" style={{ margin: '32px 0' }}>
        {clusters.map((cluster, index) => {
          const segmentMatch = SKILLS_SEGMENTS.find(s =>
            mapClusterToSegments(cluster.label).includes(SKILLS_SEGMENTS.indexOf(s))
          )
          const proficiencyInfo = {
            emerging: { color: '#fbbf24', label: 'Emerging' },
            establishing: { color: '#60a5fa', label: 'Establishing' },
            mastering: { color: '#6BCB77', label: 'Mastering' }
          }[cluster.proficiency] || { color: '#60a5fa', label: 'Establishing' }

          return (
            <div key={index} className="ff-cluster-card" style={{ cursor: 'default', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {segmentMatch && <span style={{ fontSize: '24px' }}>{segmentMatch.icon}</span>}
                <h3 style={{ margin: 0 }}>{cluster.label}</h3>
              </div>
              {cluster.proficiency && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: `${proficiencyInfo.color}20`,
                  color: proficiencyInfo.color,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: proficiencyInfo.color }} />
                  {proficiencyInfo.label}
                </div>
              )}
              <p>{cluster.insight}</p>

              <div className="ff-cluster-evidence">
                <div className="ff-cluster-evidence-label">Based on your responses:</div>
                <ul className="ff-evidence-list">
                  {(cluster.itemsWithProficiency || cluster.items || []).slice(0, 3).map((item, i) => (
                    <li key={i}>"{typeof item === 'string' ? item : item.text}"</li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      <h1 className="ff-welcome-greeting" style={{ marginTop: '40px' }}>Skills Discovery Complete!</h1>
      <div className="ff-welcome-message">
        <p>These role archetypes represent where you naturally thrive.</p>
        <p style={{ marginTop: '24px' }}><strong>Next up:</strong> Let's bring it all together and find career opportunities that fit you.</p>
      </div>

      <Link to={`/nikigai/integration?session=${quizSessionId || flowSessionId}`} className="ff-primary-button">
        Continue to Career Opportunities
      </Link>
    </div>
  )

  const screens = {
    welcome: renderWelcome,
    q1: renderQuestion1,
    q2: renderQuestion2,
    q3: renderQuestion3,
    processing1: renderProcessing1,
    q4: renderQuestion4,
    q5: renderQuestion5,
    rating: renderRating,
    processing: renderProcessing,
    success: renderSuccess
  }

  return (
    <div className="flow-finder-app">
      <div className="ff-progress-container">
        <div className="ff-progress-dots">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`ff-progress-dot ${
                i === 0 && currentScreen === 'welcome' ? 'active' :
                i === 1 && ['q1', 'q2', 'q3'].includes(currentScreen) ? 'active' :
                i === 2 && currentScreen === 'processing1' ? 'active' :
                i === 3 && ['q4', 'q5'].includes(currentScreen) ? 'active' :
                i === 4 && currentScreen === 'rating' ? 'active' :
                i === 5 && currentScreen === 'processing' ? 'active' :
                i === 6 && currentScreen === 'success' ? 'active' : ''
              } ${
                (i === 0 && ['q1', 'q2', 'q3', 'processing1', 'q4', 'q5', 'rating', 'processing', 'success'].includes(currentScreen)) ||
                (i === 1 && ['processing1', 'q4', 'q5', 'rating', 'processing', 'success'].includes(currentScreen)) ||
                (i === 2 && ['q4', 'q5', 'rating', 'processing', 'success'].includes(currentScreen)) ||
                (i === 3 && ['rating', 'processing', 'success'].includes(currentScreen)) ||
                (i === 4 && ['processing', 'success'].includes(currentScreen)) ||
                (i === 5 && currentScreen === 'success')
                ? 'completed' : ''
              }`}
            ></div>
          ))}
        </div>
      </div>

      {screens[currentScreen]?.()}
    </div>
  )
}
