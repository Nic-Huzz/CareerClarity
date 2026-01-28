import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { GradientWheel } from './CompetenceWheels'
import './CompetenceWheels/GradientWheel.css'
import { PROBLEM_SEGMENTS, PROBLEMS_PROFICIENCY_RINGS } from '../lib/wheelTaxonomy'
import './FlowFinder.css'

const STORAGE_KEY = 'flowFinderProblems'

const defaultResponses = {
  q1_topics: ['', '', '', '', ''],
  q2_impact: ['', '', '', '', ''],
  q3_chapters: ['', '', '', '', ''],
  q4_struggles: ['', '', '', '', ''],
  q5_rolemodels: ['', '', '', '', ''],
  q6_future: ['', '', '', '', ''],
  q7_pulls: ['', '', '']
}

export default function FlowFinderProblems() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get session_id from URL params (passed from Career Clarity Quiz)
  const quizSessionId = searchParams.get('session')

  // Generate a flow-specific session ID for this flow
  const [flowSessionId] = useState(() => `problems-${crypto.randomUUID()}`)

  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [responses, setResponses] = useState(defaultResponses)
  const [clusters, setClusters] = useState([])
  const [intermediateClusters1, setIntermediateClusters1] = useState([])
  const [intermediateClusters2, setIntermediateClusters2] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [litCells, setLitCells] = useState(new Set())
  // Engagement ratings for clusters: { 'cluster_index': 'exploring' | 'pursuing' | 'proven' }
  const [clusterEngagement, setClusterEngagement] = useState({})

  // Add hue values to segments for wheel rendering
  const problemsWithHue = useMemo(() =>
    PROBLEM_SEGMENTS.map((s, i) => ({ ...s, name: s.displayName, hue: i * 30 })),
    []
  )

  // Map cluster labels to wheel segment indices using keyword matching
  const mapClusterToSegments = (clusterLabel) => {
    const labelLower = clusterLabel.toLowerCase()

    // Map keywords to segment indices (matching PROBLEM_SEGMENTS order)
    const segmentMappings = {
      // Physical Vitality (0)
      health: [0], fitness: [0], body: [0], energy: [0], sleep: [0], nutrition: [0], physical: [0], vitality: [0],
      // Mental Wellbeing (1)
      anxiety: [1], stress: [1], mindset: [1], mental: [1], emotions: [1], burnout: [1], wellbeing: [1], depression: [1], overwhelm: [1],
      // Personal Mastery (2)
      skills: [2], learning: [2], productivity: [2], habits: [2], growth: [2], development: [2], discipline: [2], potential: [2], mastery: [2],
      // Intimate Bonds (3)
      relationship: [3], marriage: [3], dating: [3], family: [3], parenting: [3], love: [3], romance: [3], partnership: [3], intimate: [3],
      // Service & Care (4)
      caregiving: [4], elder: [4], disability: [4], support: [4], healthcare: [4], childcare: [4], service: [4], care: [4],
      // Creative Expression (5)
      art: [5], creativity: [5], voice: [5], identity: [5], expression: [5], authentic: [5], brand: [5], creative: [5],
      // Local Impact (6)
      team: [6], organization: [6], community: [6], neighborhood: [6], local: [6], culture: [6], workplace: [6],
      // Cultural Movements (7)
      belonging: [7], movement: [7], trends: [7], subcultures: [7], social: [7], cultural: [7],
      // Economic Freedom (8)
      money: [8], business: [8], career: [8], job: [8], income: [8], financial: [8], work: [8], entrepreneur: [8], freedom: [8], '9-5': [8],
      // Social Justice (9)
      inequality: [9], discrimination: [9], access: [9], rights: [9], fairness: [9], advocacy: [9], diversity: [9], justice: [9], equity: [9],
      // Planetary Health (10)
      climate: [10], environment: [10], sustainability: [10], planet: [10], nature: [10], conservation: [10], green: [10], earth: [10],
      // Human Progress (11)
      technology: [11], innovation: [11], knowledge: [11], future: [11], advancement: [11], education: [11], breakthrough: [11], progress: [11],
    }

    const matchedSegments = new Set()
    Object.entries(segmentMappings).forEach(([keyword, indices]) => {
      if (labelLower.includes(keyword)) {
        indices.forEach(i => matchedSegments.add(i))
      }
    })

    // Default to Personal Mastery if no match
    return matchedSegments.size > 0 ? Array.from(matchedSegments) : [2]
  }

  // Map proficiency rating to ring index
  const getRingForProficiency = (rating) => {
    switch (rating) {
      case 'exploring': return 0
      case 'pursuing': return 1
      case 'proven': return 2
      default: return 1
    }
  }

  // Set engagement rating for a cluster
  const setClusterRating = (clusterIndex, rating) => {
    setClusterEngagement(prev => ({
      ...prev,
      [clusterIndex]: rating
    }))
  }

  // Check if all clusters have been rated
  const allClustersRated = () => {
    return clusters.length > 0 && clusters.every((_, idx) => clusterEngagement[idx])
  }

  // Update lit cells when clusters or engagement changes
  useEffect(() => {
    if (clusters.length > 0) {
      const newLitCells = new Set()

      clusters.forEach((cluster, idx) => {
        const segmentIndices = mapClusterToSegments(cluster.label)
        const engagement = clusterEngagement[idx] || cluster.proficiency || 'pursuing'
        const ringIdx = getRingForProficiency(engagement)

        segmentIndices.forEach(segIdx => {
          newLitCells.add(`${segIdx}-${ringIdx}`)
        })
      })

      setLitCells(newLitCells)
    }
  }, [clusters, clusterEngagement])

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
          setIntermediateClusters1(data.intermediateClusters1 || [])
          setIntermediateClusters2(data.intermediateClusters2 || [])
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
      intermediateClusters1,
      intermediateClusters2
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (err) {
      console.error('Error saving progress:', err)
    }
  }, [isLoaded, currentScreen, responses, intermediateClusters1, intermediateClusters2])

  useEffect(() => {
    createSession()
  }, [])

  const createSession = async () => {
    try {
      // First check if session already exists (handles React strict mode double-mount)
      const { data: existing } = await supabase
        .from('flow_sessions')
        .select('id')
        .eq('session_id', quizSessionId || flowSessionId)
        .eq('flow_type', 'nikigai_problems')
        .single()

      if (existing) {
        setSessionId(existing.id)
        return
      }

      const { data, error } = await supabase
        .from('flow_sessions')
        .insert({
          session_id: quizSessionId || flowSessionId,
          flow_type: 'nikigai_problems',
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

  const hasMinimumAnswers = (questionKey, minCount = 3) => {
    const filledAnswers = responses[questionKey].filter(val => val.trim().length > 0)
    return filledAnswers.length >= minCount
  }

  const runIntermediateClustering1 = async () => {
    setIsProcessing(true)
    setProcessingError(null)
    setCurrentScreen('processing1')

    try {
      const items = [
        ...responses.q1_topics.filter(v => v.trim()),
        ...responses.q2_impact.filter(v => v.trim())
      ]

      const allResponses = [{
        session_id: quizSessionId || flowSessionId,
        response_raw: items.join('\n'),
        store_as: 'problems_intermediate1'
      }]

      const { data, error } = await supabase.functions.invoke('nikigai-conversation', {
        body: {
          currentStep: { id: 'problems_preview1', assistant_prompt: 'Early problem theme preview' },
          userResponse: 'Show me early patterns',
          shouldCluster: true,
          clusterType: 'problems',
          clusterSources: ['problems_intermediate1'],
          allResponses: allResponses,
          conversationHistory: []
        }
      })

      if (error) throw error
      setIntermediateClusters1(data.clusters || [])
      setIsProcessing(false)
    } catch (err) {
      console.error('Error in intermediate clustering 1:', err)
      setProcessingError('Could not generate preview. You can continue or retry.')
      setIsProcessing(false)
    }
  }

  const runIntermediateClustering2 = async () => {
    setIsProcessing(true)
    setProcessingError(null)
    setCurrentScreen('processing2')

    try {
      const items = [
        ...responses.q1_topics.filter(v => v.trim()),
        ...responses.q2_impact.filter(v => v.trim()),
        ...responses.q3_chapters.filter(v => v.trim()),
        ...responses.q4_struggles.filter(v => v.trim()),
        ...responses.q5_rolemodels.filter(v => v.trim())
      ]

      const allResponses = [{
        session_id: quizSessionId || flowSessionId,
        response_raw: items.join('\n'),
        store_as: 'problems_intermediate2'
      }]

      const { data, error } = await supabase.functions.invoke('nikigai-conversation', {
        body: {
          currentStep: { id: 'problems_preview2', assistant_prompt: 'Deeper problem theme preview' },
          userResponse: 'Show me deeper patterns',
          shouldCluster: true,
          clusterType: 'problems',
          clusterSources: ['problems_intermediate2'],
          allResponses: allResponses,
          conversationHistory: []
        }
      })

      if (error) throw error
      setIntermediateClusters2(data.clusters || [])
      setIsProcessing(false)
    } catch (err) {
      console.error('Error in intermediate clustering 2:', err)
      setProcessingError('Could not generate preview. You can continue or retry.')
      setIsProcessing(false)
    }
  }

  const analyzeResponses = async () => {
    if (!sessionId) {
      await createSession()
      if (!sessionId) {
        alert('Error starting flow. Please refresh and try again.')
        return
      }
    }

    setIsProcessing(true)
    setProcessingError(null)
    setCurrentScreen('processing')

    try {
      const allItems = []
      Object.entries(responses).forEach(([key, values]) => {
        values.forEach(val => {
          if (val.trim()) allItems.push(val.trim())
        })
      })

      const allResponses = [{
        session_id: quizSessionId || flowSessionId,
        response_raw: allItems.join('\n'),
        store_as: 'problems_all'
      }]

      const { data, error } = await supabase.functions.invoke('nikigai-conversation', {
        body: {
          currentStep: { id: 'problems_final', assistant_prompt: 'Problems clustering' },
          userResponse: 'Ready to see my problem themes',
          shouldCluster: true,
          clusterType: 'problems',
          clusterSources: ['problems_all'],
          allResponses: allResponses,
          conversationHistory: []
        }
      })

      if (error) throw error

      const returnedClusters = data.clusters || []

      const clustersToSave = returnedClusters.map(cluster => ({
        session_id: quizSessionId || flowSessionId,
        cluster_type: 'problems',
        cluster_stage: 'final',
        cluster_label: cluster.label,
        insight: cluster.insight,
        items: Array.isArray(cluster.items) ? cluster.items : []
      }))

      const { error: insertError } = await supabase
        .from('nikigai_clusters')
        .insert(clustersToSave)

      if (insertError) throw insertError

      setClusters(data.clusters)

      // Go to rating screen instead of success
      setCurrentScreen('rating')
    } catch (err) {
      console.error('Error analyzing responses:', err)
      setProcessingError('Error generating insights. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Save clusters with engagement ratings to database
  const saveWithRatings = async () => {
    try {
      // Add engagement level to each cluster
      const clustersWithRatings = clusters.map((cluster, idx) => ({
        ...cluster,
        proficiency: clusterEngagement[idx] || 'pursuing'
      }))

      // Save clusters to database with proficiency column
      const clustersToSave = clustersWithRatings.map(cluster => ({
        session_id: quizSessionId || flowSessionId,
        cluster_type: 'problems',
        cluster_stage: 'final',
        cluster_label: cluster.label,
        insight: cluster.insight,
        proficiency: cluster.proficiency,
        items: (cluster.items || []).map(item => ({
          text: typeof item === 'string' ? item : item.text || item
        }))
      }))

      const { error: insertError } = await supabase
        .from('nikigai_clusters')
        .insert(clustersToSave)

      if (insertError) throw insertError

      // Update local state with ratings
      setClusters(clustersWithRatings)

      // Mark session as completed
      await supabase
        .from('flow_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId)

      // Clear localStorage on success
      localStorage.removeItem(STORAGE_KEY)

      // Navigate to success screen
      setCurrentScreen('success')
    } catch (err) {
      console.error('Error saving with ratings:', err)
      alert('Error saving. Please try again.')
    }
  }

  const goBack = (fromScreen) => {
    const screenOrder = ['welcome', 'q1', 'q2', 'processing1', 'q3', 'q4', 'q5', 'processing2', 'q6', 'q7']
    const currentIndex = screenOrder.indexOf(fromScreen)
    if (currentIndex > 0) {
      let targetIndex = currentIndex - 1
      if (screenOrder[targetIndex] === 'processing1') targetIndex = currentIndex - 2
      if (screenOrder[targetIndex] === 'processing2') targetIndex = currentIndex - 2
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
        display: 'block',
        width: '100%',
        textAlign: 'center'
      }}
    >
      Go Back
    </button>
  )

  const renderWelcome = () => (
    <div className="ff-container ff-welcome-container">
      <h1 className="ff-welcome-greeting">Flow Finder: Problems Discovery</h1>
      <div className="ff-welcome-message">
        <p><strong>Hey there!</strong></p>
        <p>Let's start by discovering the <strong>problems and changes you care about</strong> — the things that matter to you and the impact you want to create.</p>
        <p>We'll explore your learning interests, impact you've made, life chapters, role models, and future vision.</p>
        <p><strong>For each question, aim for 3-5+ bullet points.</strong></p>
      </div>
      <button className="ff-primary-button" onClick={() => setCurrentScreen('q1')}>
        Let's Start!
      </button>
    </div>
  )

  const renderQuestion1 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 1 of 7</div>
      <h2 className="ff-question-text">What topics have you loved learning about?</h2>
      <p className="ff-question-subtext">What are the topics of your favourite non-fiction books or podcasts? What feels like fun to learn about?</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q1_topics.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Psychology how the mind works" : index === 1 ? "Business how ideas grow" : index === 2 ? "Health how the body heals" : index === 3 ? "Creativity how innovation happens" : "Philosophy what makes life meaningful"}
              value={value}
              onChange={(e) => updateResponse('q1_topics', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q1_topics')}>+ Add More</button>

      {!hasMinimumAnswers('q1_topics') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('q2')}
        disabled={!hasMinimumAnswers('q1_topics')}
        style={{ opacity: hasMinimumAnswers('q1_topics') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q1" />
    </div>
  )

  const renderQuestion2 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 2 of 7</div>
      <h2 className="ff-question-text">What impact have you enjoyed making for others?</h2>
      <p className="ff-question-subtext">What difference have you made? How have you helped others?</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q2_impact.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Helped a friend rebuild their confidence" : index === 1 ? "Created a system that saved my team 10 hours/week" : index === 2 ? "Mentored junior colleagues through career transitions" : index === 3 ? "Designed a workshop that helped people find clarity" : "Built a community where people felt safe"}
              value={value}
              onChange={(e) => updateResponse('q2_impact', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q2_impact')}>+ Add More</button>

      {!hasMinimumAnswers('q2_impact') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={runIntermediateClustering1}
        disabled={!hasMinimumAnswers('q2_impact')}
        style={{ opacity: hasMinimumAnswers('q2_impact') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q2" />
    </div>
  )

  const renderProcessing1 = () => (
    <div className="ff-container ff-processing-container">
      {isProcessing ? (
        <>
          <div className="ff-spinner"></div>
          <div className="ff-processing-text">Discovering early patterns...</div>
          <div className="ff-processing-subtext">Looking for themes across your learning interests and impact created.<br /><br />This usually takes 10-15 seconds.</div>
        </>
      ) : processingError ? (
        <>
          <div className="ff-processing-text" style={{ color: '#fbbf24' }}>{processingError}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button className="ff-primary-button" onClick={runIntermediateClustering1} style={{ background: 'rgba(255,255,255,0.1)' }}>Retry</button>
            <button className="ff-primary-button" onClick={() => setCurrentScreen('q3')}>Continue Anyway</button>
          </div>
        </>
      ) : (
        <>
          <div className="ff-processing-text">Early Problem Themes</div>
          <div className="ff-processing-subtext" style={{ marginBottom: '24px' }}>Based on your learning interests and impact:</div>

          <div className="cluster-preview" style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            {intermediateClusters1.map((cluster, index) => (
              <div key={index} style={{ marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', borderLeft: '3px solid #fbbf24' }}>
                <strong style={{ color: '#fbbf24' }}>{cluster.label}</strong>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>{cluster.insight}</p>
              </div>
            ))}
          </div>

          <div className="ff-processing-subtext" style={{ marginTop: '24px' }}>Let's go deeper your life story will reveal even more.</div>
          <button className="ff-primary-button" onClick={() => setCurrentScreen('q3')} style={{ marginTop: '24px' }}>Continue</button>
        </>
      )}
    </div>
  )

  const renderQuestion3 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 3 of 7</div>
      <h2 className="ff-question-text">If you saw your life as a story, what are the chapters?</h2>
      <p className="ff-question-subtext">Think of major phases or turning points in your journey</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q3_chapters.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "The Explorer Years" : index === 1 ? "The Rebuild" : index === 2 ? "The Awakening" : index === 3 ? "Finding My Voice" : "Building My Legacy"}
              value={value}
              onChange={(e) => updateResponse('q3_chapters', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q3_chapters')}>+ Add More</button>

      {!hasMinimumAnswers('q3_chapters') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('q4')}
        disabled={!hasMinimumAnswers('q3_chapters')}
        style={{ opacity: hasMinimumAnswers('q3_chapters') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q3" />
    </div>
  )

  const renderQuestion4 = () => {
    // Get chapters from Q3, filter out empty ones
    const chapters = responses.q3_chapters.filter(c => c.trim() !== '');

    return (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 4 of 7</div>
      <h2 className="ff-question-text">For each chapter, what struggle did you face?</h2>
      <p className="ff-question-subtext">Aim for at least 1 struggle per chapter</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q4_struggles.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={chapters[index] ? `${chapters[index]}: describe the struggle...` : "Add another struggle..."}
              value={value}
              onChange={(e) => updateResponse('q4_struggles', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q4_struggles')}>+ Add More</button>

      {!hasMinimumAnswers('q4_struggles') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('q5')}
        disabled={!hasMinimumAnswers('q4_struggles')}
        style={{ opacity: hasMinimumAnswers('q4_struggles') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q4" />
    </div>
  )}

  const renderQuestion5 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 5 of 7</div>
      <h2 className="ff-question-text">Who has inspired you the most?</h2>
      <p className="ff-question-subtext">Include both the person and why they're meaningful to you</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q5_rolemodels.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Brene Brown Her work on vulnerability" : index === 1 ? "My grandmother Showed me resilience" : index === 2 ? "Seth Godin Marketing as service" : index === 3 ? "Hermione Granger Being smart is powerful" : "My first manager Believed in me"}
              value={value}
              onChange={(e) => updateResponse('q5_rolemodels', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q5_rolemodels')}>+ Add More</button>

      {!hasMinimumAnswers('q5_rolemodels') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={runIntermediateClustering2}
        disabled={!hasMinimumAnswers('q5_rolemodels')}
        style={{ opacity: hasMinimumAnswers('q5_rolemodels') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q5" />
    </div>
  )

  const renderProcessing2 = () => (
    <div className="ff-container ff-processing-container">
      {isProcessing ? (
        <>
          <div className="ff-spinner"></div>
          <div className="ff-processing-text">Deepening the analysis...</div>
          <div className="ff-processing-subtext">Adding your life chapters, struggles, and role models.<br /><br />This usually takes 10-15 seconds.</div>
        </>
      ) : processingError ? (
        <>
          <div className="ff-processing-text" style={{ color: '#fbbf24' }}>{processingError}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button className="ff-primary-button" onClick={runIntermediateClustering2} style={{ background: 'rgba(255,255,255,0.1)' }}>Retry</button>
            <button className="ff-primary-button" onClick={() => setCurrentScreen('q6')}>Continue Anyway</button>
          </div>
        </>
      ) : (
        <>
          <div className="ff-processing-text">Your Problem Themes Are Taking Shape</div>
          <div className="ff-processing-subtext" style={{ marginBottom: '24px' }}>Your life story adds rich context:</div>

          <div className="cluster-preview" style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            {intermediateClusters2.map((cluster, index) => (
              <div key={index} style={{ marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', borderLeft: '3px solid #fbbf24' }}>
                <strong style={{ color: '#fbbf24' }}>{cluster.label}</strong>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>{cluster.insight}</p>
              </div>
            ))}
          </div>

          <div className="ff-processing-subtext" style={{ marginTop: '24px' }}>Almost there! Let's capture your vision for the future.</div>
          <button className="ff-primary-button" onClick={() => setCurrentScreen('q6')} style={{ marginTop: '24px' }}>Continue</button>
        </>
      )}
    </div>
  )

  const renderQuestion6 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 6 of 7</div>
      <h2 className="ff-question-text">What do you feel called to create, experience, or change?</h2>
      <p className="ff-question-subtext">What impact do you want to make? What do you want to exist?</p>
      <div className="ff-input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="ff-input-list">
        {responses.q6_future.map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Help people escape toxic work environments" : index === 1 ? "Create spaces where vulnerability is celebrated" : index === 2 ? "Build a community of people doing work that matters" : index === 3 ? "Write a book that helps people find their path" : "Design systems that make growth feel playful"}
              value={value}
              onChange={(e) => updateResponse('q6_future', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="ff-add-more-btn" onClick={() => addInput('q6_future')}>+ Add More</button>

      {!hasMinimumAnswers('q6_future') && (
        <div className="ff-input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('q7')}
        disabled={!hasMinimumAnswers('q6_future')}
        style={{ opacity: hasMinimumAnswers('q6_future') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q6" />
    </div>
  )

  const renderQuestion7 = () => (
    <div className="ff-container ff-question-container">
      <div className="ff-question-number">Question 7 of 7</div>
      <h2 className="ff-question-text">What are your top 3 future pulls?</h2>
      <p className="ff-question-subtext">From everything you shared, what feels most energizing?</p>

      <div className="ff-input-list">
        {responses.q7_pulls.slice(0, 3).map((value, index) => (
          <div className="ff-input-item" key={index}>
            <span className="ff-input-number">{index + 1}.</span>
            <input
              type="text"
              className="ff-text-input"
              placeholder={index === 0 ? "Building a coaching practice" : index === 1 ? "Creating a course" : "Starting a podcast"}
              value={value}
              onChange={(e) => updateResponse('q7_pulls', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        className="ff-primary-button"
        onClick={analyzeResponses}
        disabled={!hasMinimumAnswers('q7_pulls', 3)}
        style={{ opacity: hasMinimumAnswers('q7_pulls', 3) ? 1 : 0.5 }}
      >
        Analyze My Answers
      </button>
      <BackButton fromScreen="q7" />
    </div>
  )

  const renderProcessing = () => (
    <div className="ff-container ff-processing-container">
      {isProcessing ? (
        <>
          <div className="ff-spinner"></div>
          <div className="ff-processing-text">Creating your final problem themes...</div>
          <div className="ff-processing-subtext">This usually takes 10-15 seconds.</div>
        </>
      ) : processingError ? (
        <>
          <div className="ff-processing-text" style={{ color: '#ef4444' }}>{processingError}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button className="ff-primary-button" onClick={analyzeResponses}>Retry</button>
            <button className="ff-primary-button" onClick={() => setCurrentScreen('q7')} style={{ background: 'rgba(255,255,255,0.1)' }}>Go Back</button>
          </div>
        </>
      ) : null}
    </div>
  )

  const renderRating = () => {
    const ratedCount = Object.keys(clusterEngagement).length
    const totalCount = clusters.length

    return (
      <div className="ff-container ff-question-container">
        <div className="ff-question-number">Final Step</div>
        <h2 className="ff-question-text">Rate your engagement</h2>
        <p className="ff-question-subtext">
          For each problem theme, how engaged are you with solving it?
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
            <div style={{ color: '#fbbf24', fontWeight: '600' }}>Exploring</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Just learning</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#60a5fa', fontWeight: '600' }}>Pursuing</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Actively working on it</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#6BCB77', fontWeight: '600' }}>Proven</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Solved it / helping others</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {clusters.map((cluster, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: 'white', marginBottom: '4px' }}>{cluster.label}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{cluster.insight}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setClusterRating(index, 'exploring')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: clusterEngagement[index] === 'exploring'
                      ? '#fbbf24'
                      : 'rgba(251, 191, 36, 0.15)',
                    color: clusterEngagement[index] === 'exploring'
                      ? '#1a1a2e'
                      : '#fbbf24',
                    transition: 'all 0.2s'
                  }}
                >
                  Exploring
                </button>
                <button
                  onClick={() => setClusterRating(index, 'pursuing')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: clusterEngagement[index] === 'pursuing'
                      ? '#60a5fa'
                      : 'rgba(96, 165, 250, 0.15)',
                    color: clusterEngagement[index] === 'pursuing'
                      ? '#1a1a2e'
                      : '#60a5fa',
                    transition: 'all 0.2s'
                  }}
                >
                  Pursuing
                </button>
                <button
                  onClick={() => setClusterRating(index, 'proven')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: clusterEngagement[index] === 'proven'
                      ? '#6BCB77'
                      : 'rgba(107, 203, 119, 0.15)',
                    color: clusterEngagement[index] === 'proven'
                      ? '#1a1a2e'
                      : '#6BCB77',
                    transition: 'all 0.2s'
                  }}
                >
                  Proven
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
          {ratedCount} of {totalCount} rated
        </div>

        {!allClustersRated() && (
          <div className="ff-input-hint" style={{ color: '#fbbf24', marginBottom: '8px', textAlign: 'center' }}>
            Please rate all problem themes to continue
          </div>
        )}

        <button
          className="ff-primary-button"
          onClick={saveWithRatings}
          disabled={!allClustersRated()}
          style={{ opacity: allClustersRated() ? 1 : 0.5 }}
        >
          Save & See Results
        </button>
      </div>
    )
  }

  const renderSuccess = () => (
    <div className="ff-container ff-welcome-container">
      <h1 className="ff-welcome-greeting">Here's what we discovered about you</h1>
      <div className="ff-welcome-message">
        <p>Based on your responses, we've identified {clusters.length} problem themes that represent the impact you want to create:</p>
      </div>

      {/* Problems Wheel Visualization */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <GradientWheel
            segments={problemsWithHue}
            rings={PROBLEMS_PROFICIENCY_RINGS}
            litCells={litCells}
            size={280}
            centerLabel="PROBLEMS"
            interactive={true}
            celebrate={true}
          />
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            <span>Inner: Exploring</span>
            <span>Middle: Pursuing</span>
            <span>Outer: Proven</span>
          </div>
        </div>
      </div>

      <div className="ff-cluster-grid" style={{ margin: '32px 0' }}>
        {clusters.map((cluster, index) => {
          const segmentMatch = PROBLEM_SEGMENTS.find(s =>
            mapClusterToSegments(cluster.label).includes(PROBLEM_SEGMENTS.indexOf(s))
          )
          const engagementInfo = {
            exploring: { color: '#fbbf24', label: 'Exploring' },
            pursuing: { color: '#60a5fa', label: 'Pursuing' },
            proven: { color: '#6BCB77', label: 'Proven' }
          }[cluster.proficiency] || { color: '#60a5fa', label: 'Pursuing' }

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
                  background: `${engagementInfo.color}20`,
                  color: engagementInfo.color,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: engagementInfo.color }} />
                  {engagementInfo.label}
                </div>
              )}
              <p>{cluster.insight}</p>

              <div className="ff-cluster-evidence">
                <div className="ff-cluster-evidence-label">Based on your responses:</div>
                <ul className="ff-evidence-list">
                  {(cluster.items || []).slice(0, 3).map((item, i) => (
                    <li key={i}>"{typeof item === 'string' ? item : item.text}"</li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      <h1 className="ff-welcome-greeting" style={{ marginTop: '40px' }}>Problems Discovery Complete!</h1>
      <div className="ff-welcome-message">
        <p>These problem themes represent the impact you want to create in the world.</p>
        <p style={{ marginTop: '24px' }}><strong>Next up:</strong> Let's discover who you're most qualified to serve.</p>
      </div>

      <Link to={`/nikigai/persona?session=${quizSessionId || flowSessionId}`} className="ff-primary-button">
        Continue to Persona Discovery
      </Link>
    </div>
  )

  const getCurrentStep = () => {
    const screenToStep = {
      'welcome': 0, 'q1': 1, 'q2': 1, 'processing1': 2, 'q3': 3, 'q4': 3, 'q5': 3,
      'processing2': 4, 'q6': 5, 'q7': 5, 'processing': 6, 'rating': 7, 'success': 8
    }
    return screenToStep[currentScreen] || 0
  }

  const screens = {
    welcome: renderWelcome, q1: renderQuestion1, q2: renderQuestion2, processing1: renderProcessing1,
    q3: renderQuestion3, q4: renderQuestion4, q5: renderQuestion5, processing2: renderProcessing2,
    q6: renderQuestion6, q7: renderQuestion7, processing: renderProcessing, rating: renderRating, success: renderSuccess
  }

  return (
    <div className="flow-finder-app">
      <div className="ff-progress-container">
        <div className="ff-progress-dots">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`ff-progress-dot ${i === getCurrentStep() ? 'active' : ''} ${i < getCurrentStep() ? 'completed' : ''}`}
            ></div>
          ))}
        </div>
      </div>
      {screens[currentScreen]?.()}
    </div>
  )
}
