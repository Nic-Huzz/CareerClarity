import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './FlowFinder.css'

export default function FlowFinderPersona() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get session_id from URL params (passed from Problems flow or Quiz)
  const quizSessionId = searchParams.get('session')

  // Generate a flow-specific session ID if no session provided
  const [flowSessionId] = useState(() => `persona-${crypto.randomUUID()}`)

  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [clusters, setClusters] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

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
        .eq('flow_type', 'nikigai_persona')
        .single()

      if (existing) {
        setSessionId(existing.id)
        return
      }

      const { data, error } = await supabase
        .from('flow_sessions')
        .insert({
          session_id: quizSessionId || flowSessionId,
          flow_type: 'nikigai_persona',
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

  const analyzeJourney = async () => {
    setIsProcessing(true)
    setCurrentScreen('processing')

    try {
      // Fetch Problems clusters from this session to analyze for personas
      const { data: problemsClusters, error: fetchError } = await supabase
        .from('nikigai_clusters')
        .select('*')
        .eq('session_id', quizSessionId || flowSessionId)
        .eq('cluster_type', 'problems')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching problems clusters:', fetchError)
      }

      // Build context from problems clusters
      const problemsContext = problemsClusters?.map(c =>
        `${c.cluster_label}: ${c.insight}`
      ).join('\n') || 'No problems data available'

      const allResponses = [{
        session_id: quizSessionId || flowSessionId,
        response_raw: problemsContext,
        store_as: 'persona_analysis'
      }]

      const { data, error } = await supabase.functions.invoke('nikigai-conversation', {
        body: {
          currentStep: { id: 'persona_final', assistant_prompt: 'Persona clustering from user journey' },
          userResponse: 'Ready to discover who I serve',
          shouldCluster: true,
          clusterType: 'persona',
          clusterSources: ['persona_analysis'],
          allResponses: allResponses,
          conversationHistory: []
        }
      })

      if (error) throw error

      const returnedClusters = data.clusters || []

      const clustersToSave = returnedClusters.map(cluster => ({
        session_id: quizSessionId || flowSessionId,
        cluster_type: 'persona',
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
      console.error('Error analyzing journey:', err)
      alert('Error generating insights. Please try again.')
      setCurrentScreen('confirm')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderWelcome = () => (
    <div className="container welcome-container">
      <h1 className="welcome-greeting">Flow Finder: Persona Discovery</h1>
      <div className="welcome-message">
        <p><strong>Hey there!</strong></p>
        <p>Now let's discover <strong>who you're most qualified to serve.</strong></p>
      </div>

      <div className="insight-box" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderLeft: '4px solid #fbbf24',
        borderRadius: '8px',
        padding: '20px',
        margin: '32px 0',
        textAlign: 'left'
      }}>
        <p style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.8' }}><strong>Here's the key insight:</strong></p>
        <p style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.8' }}>You're most qualified to help <strong>former versions of yourself.</strong></p>
        <p style={{ marginBottom: 0, fontSize: '16px', lineHeight: '1.8' }}>The struggles you've overcome, the growth you've experienced that's your superpower. You understand those people because you <em>were</em> those people.</p>
      </div>

      <div className="welcome-message">
        <p>I'll analyze your journey across the skills and problems flows to identify the personas you're uniquely qualified to serve.</p>
      </div>

      <button className="primary-button" onClick={() => setCurrentScreen('confirm')}>
        Yes, show me!
      </button>
    </div>
  )

  const renderConfirm = () => (
    <div className="container welcome-container">
      <h1 className="welcome-greeting">Ready to Discover Your People?</h1>
      <div className="welcome-message">
        <p>I'll analyze:</p>
      </div>

      <div className="insight-box" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderLeft: '4px solid #fbbf24',
        borderRadius: '8px',
        padding: '20px',
        margin: '32px 0',
        textAlign: 'left'
      }}>
        <p style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.8' }}>Your life chapters and struggles</p>
        <p style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.8' }}>Your role models and their impact</p>
        <p style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.8' }}>Your learning topics and interests</p>
        <p style={{ marginBottom: '12px', fontSize: '16px', lineHeight: '1.8' }}>The impact you've created</p>
        <p style={{ marginBottom: 0, fontSize: '16px', lineHeight: '1.8' }}>Your future vision and desires</p>
      </div>

      <div className="welcome-message">
        <p>From this, I'll identify 3-5 personas former versions of you at different life stages who need what you've learned.</p>
      </div>

      <button className="primary-button" onClick={analyzeJourney}>
        Generate Personas
      </button>
    </div>
  )

  const renderProcessing = () => (
    <div className="container processing-container">
      <div className="spinner"></div>
      <div className="processing-text">Analyzing your journey...</div>
      <div className="processing-subtext">
        Looking across your life chapters, struggles, growth, and impact to identify the personas you're most qualified to serve.
        <br /><br />
        This usually takes 10-15 seconds.
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="container welcome-container">
      <h1 className="welcome-greeting">Here's what we discovered about you</h1>
      <div className="welcome-message">
        <p>Based on your journey, we've identified personas former versions of yourself who need what you've learned:</p>
      </div>

      <div className="cluster-grid" style={{ margin: '32px 0' }}>
        {clusters.map((cluster, index) => (
          <div
            key={index}
            className="cluster-card"
            style={{ cursor: 'default', borderColor: 'rgba(251, 191, 36, 0.3)' }}
          >
            <h3>{cluster.label}</h3>
            <p>{cluster.insight}</p>
            <div className="cluster-evidence">
              <div className="cluster-evidence-label">Why you're qualified to serve them:</div>
              <ul className="evidence-list">
                {cluster.items?.map((item, i) => (
                  <li key={i}>"{item}"</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <h1 className="welcome-greeting" style={{ marginTop: '40px' }}>Persona Discovery Complete!</h1>
      <div className="welcome-message">
        <p>These are former versions of you. You understand their struggles because you've lived them.</p>
        <p style={{ marginTop: '24px' }}><strong>Next up:</strong> Let's discover your unique skills and strengths.</p>
      </div>

      <Link to={`/nikigai/skills?session=${quizSessionId || flowSessionId}`} className="primary-button">
        Continue to Skills Discovery
      </Link>
    </div>
  )

  const screens = {
    welcome: renderWelcome,
    confirm: renderConfirm,
    processing: renderProcessing,
    success: renderSuccess
  }

  return (
    <div className="flow-finder-app">
      <div className="progress-container">
        <div className="progress-dots">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`progress-dot ${
                i === 0 && currentScreen === 'welcome' ? 'active' :
                i === 1 && currentScreen === 'confirm' ? 'active' :
                i === 2 && currentScreen === 'processing' ? 'active' :
                i === 3 && currentScreen === 'success' ? 'active' : ''
              } ${
                (i === 0 && ['confirm', 'processing', 'success'].includes(currentScreen)) ||
                (i === 1 && ['processing', 'success'].includes(currentScreen)) ||
                (i === 2 && currentScreen === 'success')
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
