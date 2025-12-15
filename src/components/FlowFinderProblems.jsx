import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './FlowFinder.css'

export default function FlowFinderProblems() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get session_id from URL params (passed from Career Clarity Quiz)
  const quizSessionId = searchParams.get('session')

  // Generate a flow-specific session ID for this flow
  const [flowSessionId] = useState(() => `problems-${crypto.randomUUID()}`)

  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [responses, setResponses] = useState({
    q1_topics: ['', '', '', '', ''],
    q2_impact: ['', '', '', '', ''],
    q3_chapters: ['', '', '', '', ''],
    q4_struggles: ['', '', '', '', ''],
    q5_rolemodels: ['', '', '', '', ''],
    q6_future: ['', '', '', '', ''],
    q7_pulls: ['', '', '']
  })
  const [clusters, setClusters] = useState([])
  const [intermediateClusters1, setIntermediateClusters1] = useState([])
  const [intermediateClusters2, setIntermediateClusters2] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState(null)

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

      await supabase
        .from('flow_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId)

      setCurrentScreen('success')
    } catch (err) {
      console.error('Error analyzing responses:', err)
      setProcessingError('Error generating insights. Please try again.')
    } finally {
      setIsProcessing(false)
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
    <div className="container welcome-container">
      <h1 className="welcome-greeting">Flow Finder: Problems Discovery</h1>
      <div className="welcome-message">
        <p><strong>Hey there!</strong></p>
        <p>Let's start by discovering the <strong>problems and changes you care about</strong> — the things that matter to you and the impact you want to create.</p>
        <p>We'll explore your learning interests, impact you've made, life chapters, role models, and future vision.</p>
        <p><strong>For each question, aim for 3-5+ bullet points.</strong></p>
      </div>
      <button className="primary-button" onClick={() => setCurrentScreen('q1')}>
        Let's Start!
      </button>
    </div>
  )

  const renderQuestion1 = () => (
    <div className="container question-container">
      <div className="question-number">Question 1 of 7</div>
      <h2 className="question-text">What topics have you loved learning about?</h2>
      <p className="question-subtext">What are the topics of your favourite non-fiction books or podcasts? What feels like fun to learn about?</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q1_topics.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Psychology how the mind works" : index === 1 ? "Business how ideas grow" : index === 2 ? "Health how the body heals" : index === 3 ? "Creativity how innovation happens" : "Philosophy what makes life meaningful"}
              value={value}
              onChange={(e) => updateResponse('q1_topics', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q1_topics')}>+ Add More</button>

      {!hasMinimumAnswers('q1_topics') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
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
    <div className="container question-container">
      <div className="question-number">Question 2 of 7</div>
      <h2 className="question-text">What impact have you enjoyed making for others?</h2>
      <p className="question-subtext">What difference have you made? How have you helped others?</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q2_impact.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Helped a friend rebuild their confidence" : index === 1 ? "Created a system that saved my team 10 hours/week" : index === 2 ? "Mentored junior colleagues through career transitions" : index === 3 ? "Designed a workshop that helped people find clarity" : "Built a community where people felt safe"}
              value={value}
              onChange={(e) => updateResponse('q2_impact', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q2_impact')}>+ Add More</button>

      {!hasMinimumAnswers('q2_impact') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
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
    <div className="container processing-container">
      {isProcessing ? (
        <>
          <div className="spinner"></div>
          <div className="processing-text">Discovering early patterns...</div>
          <div className="processing-subtext">Looking for themes across your learning interests and impact created.<br /><br />This usually takes 10-15 seconds.</div>
        </>
      ) : processingError ? (
        <>
          <div className="processing-text" style={{ color: '#fbbf24' }}>{processingError}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button className="primary-button" onClick={runIntermediateClustering1} style={{ background: 'rgba(255,255,255,0.1)' }}>Retry</button>
            <button className="primary-button" onClick={() => setCurrentScreen('q3')}>Continue Anyway</button>
          </div>
        </>
      ) : (
        <>
          <div className="processing-text">Early Problem Themes</div>
          <div className="processing-subtext" style={{ marginBottom: '24px' }}>Based on your learning interests and impact:</div>

          <div className="cluster-preview" style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            {intermediateClusters1.map((cluster, index) => (
              <div key={index} style={{ marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', borderLeft: '3px solid #fbbf24' }}>
                <strong style={{ color: '#fbbf24' }}>{cluster.label}</strong>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>{cluster.insight}</p>
              </div>
            ))}
          </div>

          <div className="processing-subtext" style={{ marginTop: '24px' }}>Let's go deeper your life story will reveal even more.</div>
          <button className="primary-button" onClick={() => setCurrentScreen('q3')} style={{ marginTop: '24px' }}>Continue</button>
        </>
      )}
    </div>
  )

  const renderQuestion3 = () => (
    <div className="container question-container">
      <div className="question-number">Question 3 of 7</div>
      <h2 className="question-text">If you saw your life as a story, what are the chapters?</h2>
      <p className="question-subtext">Think of major phases or turning points in your journey</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q3_chapters.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "The Explorer Years" : index === 1 ? "The Rebuild" : index === 2 ? "The Awakening" : index === 3 ? "Finding My Voice" : "Building My Legacy"}
              value={value}
              onChange={(e) => updateResponse('q3_chapters', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q3_chapters')}>+ Add More</button>

      {!hasMinimumAnswers('q3_chapters') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
        onClick={() => setCurrentScreen('q4')}
        disabled={!hasMinimumAnswers('q3_chapters')}
        style={{ opacity: hasMinimumAnswers('q3_chapters') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q3" />
    </div>
  )

  const renderQuestion4 = () => (
    <div className="container question-container">
      <div className="question-number">Question 4 of 7</div>
      <h2 className="question-text">For each chapter, what struggle did you face?</h2>
      <p className="question-subtext">Aim for at least 1 struggle per chapter</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q4_struggles.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "The Explorer Years finding a place I felt safe" : index === 1 ? "The Rebuild recovering from burnout" : index === 2 ? "The Awakening letting go of others' expectations" : index === 3 ? "Finding My Voice overcoming fear of visibility" : "Building My Legacy balancing ambition with presence"}
              value={value}
              onChange={(e) => updateResponse('q4_struggles', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q4_struggles')}>+ Add More</button>

      {!hasMinimumAnswers('q4_struggles') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
        onClick={() => setCurrentScreen('q5')}
        disabled={!hasMinimumAnswers('q4_struggles')}
        style={{ opacity: hasMinimumAnswers('q4_struggles') ? 1 : 0.5 }}
      >
        Continue
      </button>
      <BackButton fromScreen="q4" />
    </div>
  )

  const renderQuestion5 = () => (
    <div className="container question-container">
      <div className="question-number">Question 5 of 7</div>
      <h2 className="question-text">Who has inspired you the most?</h2>
      <p className="question-subtext">Include both the person and why they're meaningful to you</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q5_rolemodels.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Brene Brown Her work on vulnerability" : index === 1 ? "My grandmother Showed me resilience" : index === 2 ? "Seth Godin Marketing as service" : index === 3 ? "Hermione Granger Being smart is powerful" : "My first manager Believed in me"}
              value={value}
              onChange={(e) => updateResponse('q5_rolemodels', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q5_rolemodels')}>+ Add More</button>

      {!hasMinimumAnswers('q5_rolemodels') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
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
    <div className="container processing-container">
      {isProcessing ? (
        <>
          <div className="spinner"></div>
          <div className="processing-text">Deepening the analysis...</div>
          <div className="processing-subtext">Adding your life chapters, struggles, and role models.<br /><br />This usually takes 10-15 seconds.</div>
        </>
      ) : processingError ? (
        <>
          <div className="processing-text" style={{ color: '#fbbf24' }}>{processingError}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button className="primary-button" onClick={runIntermediateClustering2} style={{ background: 'rgba(255,255,255,0.1)' }}>Retry</button>
            <button className="primary-button" onClick={() => setCurrentScreen('q6')}>Continue Anyway</button>
          </div>
        </>
      ) : (
        <>
          <div className="processing-text">Your Problem Themes Are Taking Shape</div>
          <div className="processing-subtext" style={{ marginBottom: '24px' }}>Your life story adds rich context:</div>

          <div className="cluster-preview" style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            {intermediateClusters2.map((cluster, index) => (
              <div key={index} style={{ marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', borderLeft: '3px solid #fbbf24' }}>
                <strong style={{ color: '#fbbf24' }}>{cluster.label}</strong>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>{cluster.insight}</p>
              </div>
            ))}
          </div>

          <div className="processing-subtext" style={{ marginTop: '24px' }}>Almost there! Let's capture your vision for the future.</div>
          <button className="primary-button" onClick={() => setCurrentScreen('q6')} style={{ marginTop: '24px' }}>Continue</button>
        </>
      )}
    </div>
  )

  const renderQuestion6 = () => (
    <div className="container question-container">
      <div className="question-number">Question 6 of 7</div>
      <h2 className="question-text">What do you feel called to create, experience, or change?</h2>
      <p className="question-subtext">What impact do you want to make? What do you want to exist?</p>
      <div className="input-hint" style={{ textAlign: 'center', marginTop: '-6px', marginBottom: '-24px' }}>Aim for 5+, the more the better</div>

      <div className="input-list">
        {responses.q6_future.map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Help people escape toxic work environments" : index === 1 ? "Create spaces where vulnerability is celebrated" : index === 2 ? "Build a community of people doing work that matters" : index === 3 ? "Write a book that helps people find their path" : "Design systems that make growth feel playful"}
              value={value}
              onChange={(e) => updateResponse('q6_future', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="add-more-btn" onClick={() => addInput('q6_future')}>+ Add More</button>

      {!hasMinimumAnswers('q6_future') && (
        <div className="input-hint" style={{ color: '#fbbf24', marginTop: '40px', marginBottom: '-28px', textAlign: 'center' }}>
          Please provide at least 3 answers to continue
        </div>
      )}

      <button
        className="primary-button"
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
    <div className="container question-container">
      <div className="question-number">Question 7 of 7</div>
      <h2 className="question-text">What are your top 3 future pulls?</h2>
      <p className="question-subtext">From everything you shared, what feels most energizing?</p>

      <div className="input-list">
        {responses.q7_pulls.slice(0, 3).map((value, index) => (
          <div className="input-item" key={index}>
            <span className="input-number">{index + 1}.</span>
            <input
              type="text"
              className="text-input"
              placeholder={index === 0 ? "Building a coaching practice" : index === 1 ? "Creating a course" : "Starting a podcast"}
              value={value}
              onChange={(e) => updateResponse('q7_pulls', index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        className="primary-button"
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
    <div className="container processing-container">
      {isProcessing ? (
        <>
          <div className="spinner"></div>
          <div className="processing-text">Creating your final problem themes...</div>
          <div className="processing-subtext">This usually takes 10-15 seconds.</div>
        </>
      ) : processingError ? (
        <>
          <div className="processing-text" style={{ color: '#ef4444' }}>{processingError}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button className="primary-button" onClick={analyzeResponses}>Retry</button>
            <button className="primary-button" onClick={() => setCurrentScreen('q7')} style={{ background: 'rgba(255,255,255,0.1)' }}>Go Back</button>
          </div>
        </>
      ) : null}
    </div>
  )

  const renderSuccess = () => (
    <div className="container welcome-container">
      <h1 className="welcome-greeting">Here's what we discovered about you</h1>
      <div className="welcome-message">
        <p>Based on your responses, we've identified {clusters.length} problem themes that represent the impact you want to create:</p>
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

      <h1 className="welcome-greeting" style={{ marginTop: '40px' }}>Problems Discovery Complete!</h1>
      <div className="welcome-message">
        <p>These problem themes represent the impact you want to create in the world.</p>
        <p style={{ marginTop: '24px' }}><strong>Next up:</strong> Let's discover who you're most qualified to serve.</p>
      </div>

      <Link to={`/nikigai/persona?session=${quizSessionId || flowSessionId}`} className="primary-button">
        Continue to Persona Discovery
      </Link>
    </div>
  )

  const getCurrentStep = () => {
    const screenToStep = {
      'welcome': 0, 'q1': 1, 'q2': 1, 'processing1': 2, 'q3': 3, 'q4': 3, 'q5': 3,
      'processing2': 4, 'q6': 5, 'q7': 5, 'processing': 6, 'success': 7
    }
    return screenToStep[currentScreen] || 0
  }

  const screens = {
    welcome: renderWelcome, q1: renderQuestion1, q2: renderQuestion2, processing1: renderProcessing1,
    q3: renderQuestion3, q4: renderQuestion4, q5: renderQuestion5, processing2: renderProcessing2,
    q6: renderQuestion6, q7: renderQuestion7, processing: renderProcessing, success: renderSuccess
  }

  return (
    <div className="flow-finder-app">
      <div className="progress-container">
        <div className="progress-dots">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`progress-dot ${i === getCurrentStep() ? 'active' : ''} ${i < getCurrentStep() ? 'completed' : ''}`}
            ></div>
          ))}
        </div>
      </div>
      {screens[currentScreen]?.()}
    </div>
  )
}
