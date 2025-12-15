import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './FlowFinder.css'

export default function FlowFinderSkills() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get session_id from URL params (passed from Persona flow or Quiz)
  const quizSessionId = searchParams.get('session')

  // Generate a flow-specific session ID if no session provided
  const [flowSessionId] = useState(() => `skills-${crypto.randomUUID()}`)

  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [responses, setResponses] = useState({
    q1_childhood: ['', '', '', '', ''],
    q2_highschool: ['', '', '', '', ''],
    q3_postschool: ['', '', '', '', ''],
    q4_work: ['', '', '', '', ''],
    q5_skills: ['', '', '', '', '']
  })
  const [clusters, setClusters] = useState([])
  const [preliminaryClusters, setPreliminaryClusters] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

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
    const screenOrder = ['welcome', 'q1', 'q2', 'q3', 'processing1', 'q4', 'q5']
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
      const allItems = []
      Object.entries(responses).forEach(([key, values]) => {
        values.forEach(val => {
          if (val.trim()) allItems.push(val.trim())
        })
      })

      const allResponses = [{
        session_id: quizSessionId || flowSessionId,
        response_raw: allItems.join('\n'),
        store_as: 'all_skills'
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

      // Save clusters to database
      const clustersToSave = returnedClusters.map(cluster => ({
        session_id: quizSessionId || flowSessionId,
        cluster_type: 'skills',
        cluster_stage: 'final',
        cluster_label: cluster.label,
        insight: cluster.insight,
        items: Array.isArray(cluster.items) ? cluster.items : []
      }))

      const { error: insertError } = await supabase
        .from('nikigai_clusters')
        .insert(clustersToSave)

      if (insertError) throw insertError

      setClusters(returnedClusters)

      await supabase
        .from('flow_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId)

      setCurrentScreen('success')
    } catch (err) {
      console.error('Error analyzing responses:', err)
      alert('Error generating insights. Please try again.')
      setCurrentScreen('q5')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderWelcome = () => (
    <div className="container welcome-container">
      <h1 className="welcome-greeting">Flow Finder: Skills Discovery</h1>
      <div className="welcome-message">
        <p><strong>Hey there!</strong></p>
        <p>What does a business do? It solves a problem, for a person, using a set of skills.</p>
        <p>By identifying skills we're passionate about using, people we're passionate about serving and problems we're passionate about solving - we can identify dream business opportunities.</p>
        <p>This flow is inspired by Steve Jobs: <em>"you can't connect the dots looking forward, you can only connect them looking back."</em></p>
        <p><strong>For each question, aim for 5+ bullet points.</strong> The more dots we have, the better.</p>
      </div>
      <button className="primary-button" onClick={() => setCurrentScreen('q1')}>
        Let's Start!
      </button>
    </div>
  )

  const renderQuestion1 = () => (
    <div className="container question-container">
      <div className="question-number">Question 1 of 5</div>
      <h2 className="question-text">Let's start with Childhood</h2>
      <p className="question-subtext">Thinking back to Pre-school & Primary: What did you love doing most? What activities did you gravitate towards during free-time?</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q1_childhood.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Playing with Legos" : index === 1 ? "Drawing and creating art" : index === 2 ? "Playing sports with friends" : index === 3 ? "Reading adventure books" : "Enter another activity..."}
              value={value}
              onChange={(e) => updateResponse('q1_childhood', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q1_childhood')}>+ Add More</button>

      {!hasMinimumResponses('q1_childhood') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
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
    <div className="container question-container">
      <div className="question-number">Question 2 of 5</div>
      <h2 className="question-text">Now think of your teenage years throughout High School</h2>
      <p className="question-subtext">What did you enjoy doing most? What extra-curricular activities did you do? Any subjects or assignments that you loved?</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q2_highschool.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Being part of the debate team" : index === 1 ? "Playing in a band" : index === 2 ? "Coding my first website" : index === 3 ? "Organizing school events" : "Enter another activity..."}
              value={value}
              onChange={(e) => updateResponse('q2_highschool', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q2_highschool')}>+ Add More</button>

      {!hasMinimumResponses('q2_highschool') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
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
    <div className="container question-container">
      <div className="question-number">Question 3 of 5</div>
      <h2 className="question-text">After school and before full-time work life</h2>
      <p className="question-subtext">What activities, projects or creative outlets do you enjoy the most?</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q3_postschool.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Building side projects" : index === 1 ? "Creating content for social media" : index === 2 ? "Learning new skills online" : index === 3 ? "Volunteering in the community" : "Enter another activity..."}
              value={value}
              onChange={(e) => updateResponse('q3_postschool', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q3_postschool')}>+ Add More</button>

      {!hasMinimumResponses('q3_postschool') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
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
        <div className="container processing-container">
          <div className="spinner"></div>
          <div className="processing-text">Analyzing patterns...</div>
          <div className="processing-subtext">
            Looking for skill themes across your childhood, high school, and recent activities.
            <br /><br />
            This usually takes 10-15 seconds.
          </div>
        </div>
      )
    }

    return (
      <div className="container welcome-container">
        <h1 className="welcome-greeting">Here are some early patterns we're seeing</h1>
        <div className="welcome-message">
          <p>Based on your childhood, high school, and recent activities, here are some skill themes emerging:</p>
        </div>

        <div className="cluster-grid" style={{ margin: '32px 0' }}>
          {preliminaryClusters.map((cluster, index) => (
            <div key={index} className="cluster-card" style={{ cursor: 'default', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
              <h3>{cluster.label}</h3>
              <p>{cluster.insight}</p>
            </div>
          ))}
        </div>

        <div className="welcome-message">
          <p><strong>Next:</strong> Let's explore your work experience and skills you've deliberately developed.</p>
        </div>

        <button className="primary-button" onClick={() => setCurrentScreen('q4')}>
          Continue to Work & Projects
        </button>
      </div>
    )
  }

  const renderQuestion4 = () => (
    <div className="container question-container">
      <div className="question-number">Question 4 of 5</div>
      <h2 className="question-text">Let's explore your work and projects</h2>
      <p className="question-subtext">Across your jobs, projects, or creative pursuits, what have you enjoyed doing most? Think of times you felt in flow.</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q4_work.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Leading a team to solve a problem" : index === 1 ? "Designing user experiences" : index === 2 ? "Writing and creating content" : index === 3 ? "Analyzing data to find insights" : "Enter another activity..."}
              value={value}
              onChange={(e) => updateResponse('q4_work', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q4_work')}>+ Add More</button>

      {!hasMinimumResponses('q4_work') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
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
    <div className="container question-container">
      <div className="question-number">Question 5 of 5</div>
      <h2 className="question-text">What skills have you loved to develop?</h2>
      <p className="question-subtext">Think about skills you've intentionally worked on through courses, practice, or personal curiosity.</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q5_skills.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Public speaking and presentation" : index === 1 ? "Coding and software development" : index === 2 ? "Marketing and growth" : index === 3 ? "Design and visual communication" : "Enter another skill..."}
              value={value}
              onChange={(e) => updateResponse('q5_skills', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q5_skills')}>+ Add More</button>

      {!hasMinimumResponses('q5_skills') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
        onClick={analyzeResponses}
        disabled={!hasMinimumResponses('q5_skills')}
        style={{ opacity: hasMinimumResponses('q5_skills') ? 1 : 0.5 }}
      >
        Analyze My Answers
      </button>
      <BackButton fromScreen="q5" />
    </div>
  )

  const renderProcessing = () => (
    <div className="container processing-container">
      <div className="spinner"></div>
      <div className="processing-text">Identifying your role archetypes...</div>
      <div className="processing-subtext">
        Bringing together all your responses to reveal the skills and strengths where you naturally thrive.
        <br /><br />
        This usually takes 10-15 seconds.
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="container welcome-container">
      <h1 className="welcome-greeting">Here's what we discovered about you</h1>
      <div className="welcome-message">
        <p>Based on your responses, we've identified role archetypes where you naturally thrive:</p>
      </div>

      <div className="cluster-grid" style={{ margin: '32px 0' }}>
        {clusters.map((cluster, index) => (
          <div key={index} className="cluster-card" style={{ cursor: 'default', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
            <h3>{cluster.label}</h3>
            <p>{cluster.insight}</p>
            <div className="cluster-evidence">
              <div className="cluster-evidence-label">Based on your responses:</div>
              <ul className="evidence-list">
                {cluster.items?.map((item, i) => (
                  <li key={i}>"{item}"</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <h1 className="welcome-greeting" style={{ marginTop: '40px' }}>Skills Discovery Complete!</h1>
      <div className="welcome-message">
        <p>These role archetypes represent where you naturally thrive.</p>
        <p style={{ marginTop: '24px' }}><strong>Next up:</strong> Let's bring it all together and find career opportunities that fit you.</p>
      </div>

      <Link to={`/nikigai/integration?session=${quizSessionId || flowSessionId}`} className="primary-button">
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
    processing: renderProcessing,
    success: renderSuccess
  }

  return (
    <div className="flow-finder-app">
      <div className="progress-container">
        <div className="progress-dots">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`progress-dot ${
                i === 0 && currentScreen === 'welcome' ? 'active' :
                i === 1 && ['q1', 'q2', 'q3'].includes(currentScreen) ? 'active' :
                i === 2 && currentScreen === 'processing1' ? 'active' :
                i === 3 && ['q4', 'q5'].includes(currentScreen) ? 'active' :
                i === 4 && currentScreen === 'processing' ? 'active' :
                i === 5 && currentScreen === 'success' ? 'active' : ''
              } ${i < 5 && currentScreen === 'success' ? 'completed' : ''}`}
            ></div>
          ))}
        </div>
      </div>

      {screens[currentScreen]?.()}
    </div>
  )
}
