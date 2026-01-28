import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { GradientWheel } from './CompetenceWheels'
import './CompetenceWheels/GradientWheel.css'
import { PERSONA_SEGMENTS, JOURNEY_STAGES } from '../lib/wheelTaxonomy'
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
  const [litCells, setLitCells] = useState(new Set())
  // Journey stage ratings for clusters: { 'cluster_index': 'awakening' | 'struggling' | 'ready' }
  const [personaRatings, setPersonaRatings] = useState({})

  // Add hue values to segments for wheel rendering
  const personasWithHue = useMemo(() =>
    PERSONA_SEGMENTS.map((s, i) => ({ ...s, name: s.displayName, hue: i * 30 })),
    []
  )

  // Map cluster labels to wheel segment indices using keyword matching
  const mapClusterToSegments = (clusterLabel) => {
    const labelLower = clusterLabel.toLowerCase()

    // Map keywords to segment indices (matching PERSONA_SEGMENTS order)
    const segmentMappings = {
      // Seekers (0)
      seeker: [0], lost: [0], direction: [0], purpose: [0], meaning: [0], clarity: [0], confused: [0], 'finding themselves': [0],
      // Builders (1)
      builder: [1], creating: [1], building: [1], making: [1], entrepreneurship: [1], starting: [1], launching: [1], project: [1],
      // Healers (2)
      healer: [2], hurting: [2], recovering: [2], healing: [2], trauma: [2], pain: [2], suffering: [2], broken: [2], wounded: [2],
      // Teachers (3)
      teacher: [3], learning: [3], growing: [3], developing: [3], knowledge: [3], education: [3], skills: [3], improve: [3],
      // Connectors (4)
      connector: [4], lonely: [4], isolated: [4], community: [4], belonging: [4], connection: [4], friends: [4], tribe: [4],
      // Achievers (5)
      achiever: [5], success: [5], winning: [5], status: [5], recognition: [5], ambitious: [5], goals: [5], competitive: [5],
      // Explorers (6)
      explorer: [6], freedom: [6], adventure: [6], autonomy: [6], escape: [6], flexibility: [6], travel: [6], independent: [6],
      // Visionaries (7)
      visionary: [7], future: [7], change: [7], innovation: [7], 'big ideas': [7], transformation: [7], vision: [7], disrupt: [7],
      // Protectors (8)
      protector: [8], security: [8], safety: [8], stability: [8], risk: [8], protection: [8], cautious: [8], secure: [8],
      // Creators (9)
      creator: [9], expression: [9], art: [9], originality: [9], creativity: [9], voice: [9], unique: [9], artistic: [9],
      // Nurturers (10)
      nurturer: [10], family: [10], caring: [10], devoted: [10], 'loved ones': [10], support: [10], children: [10], parents: [10],
      // Challengers (11)
      challenger: [11], injustice: [11], truth: [11], advocacy: [11], rebel: [11], fight: [11], justice: [11],
    }

    const matchedSegments = new Set()
    Object.entries(segmentMappings).forEach(([keyword, indices]) => {
      if (labelLower.includes(keyword)) {
        indices.forEach(i => matchedSegments.add(i))
      }
    })

    // Default to Seekers if no match
    return matchedSegments.size > 0 ? Array.from(matchedSegments) : [0]
  }

  // Map journey stage to ring index
  const getRingForJourneyStage = (stage) => {
    switch (stage) {
      case 'awakening': return 0
      case 'struggling': return 1
      case 'ready': return 2
      default: return 1
    }
  }

  // Set journey stage rating for a persona
  const setPersonaRating = (personaIndex, rating) => {
    setPersonaRatings(prev => ({
      ...prev,
      [personaIndex]: rating
    }))
  }

  // Check if all personas have been rated
  const allPersonasRated = () => {
    return clusters.length > 0 && clusters.every((_, idx) => personaRatings[idx])
  }

  // Update lit cells when clusters or journey stage changes
  useEffect(() => {
    if (clusters.length > 0) {
      const newLitCells = new Set()

      clusters.forEach((cluster, idx) => {
        const segmentIndices = mapClusterToSegments(cluster.label)
        const stage = personaRatings[idx] || cluster.journeyStage || 'struggling'
        const ringIdx = getRingForJourneyStage(stage)

        segmentIndices.forEach(segIdx => {
          newLitCells.add(`${segIdx}-${ringIdx}`)
        })
      })

      setLitCells(newLitCells)
    }
  }, [clusters, personaRatings])

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

      setClusters(data.clusters)

      // Go to rating screen instead of success
      setCurrentScreen('rating')
    } catch (err) {
      console.error('Error analyzing journey:', err)
      alert('Error generating insights. Please try again.')
      setCurrentScreen('confirm')
    } finally {
      setIsProcessing(false)
    }
  }

  // Save clusters with journey stage ratings to database
  const saveWithRatings = async () => {
    try {
      // Add journey stage to each cluster
      const clustersWithRatings = clusters.map((cluster, idx) => ({
        ...cluster,
        journeyStage: personaRatings[idx] || 'struggling'
      }))

      // Save clusters to database with proficiency column
      const clustersToSave = clustersWithRatings.map(cluster => ({
        session_id: quizSessionId || flowSessionId,
        cluster_type: 'persona',
        cluster_stage: 'final',
        cluster_label: cluster.label,
        insight: cluster.insight,
        proficiency: cluster.journeyStage, // awakening, struggling, or ready
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

      // Navigate to success screen
      setCurrentScreen('success')
    } catch (err) {
      console.error('Error saving with ratings:', err)
      alert('Error saving. Please try again.')
    }
  }

  const renderWelcome = () => (
    <div className="ff-container ff-welcome-container">
      <h1 className="ff-welcome-greeting">Flow Finder: Persona Discovery</h1>
      <div className="ff-welcome-message">
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

      <div className="ff-welcome-message">
        <p>I'll analyze your journey across the skills and problems flows to identify the personas you're uniquely qualified to serve.</p>
      </div>

      <button className="ff-primary-button" onClick={() => setCurrentScreen('confirm')}>
        Yes, show me!
      </button>
    </div>
  )

  const renderConfirm = () => (
    <div className="ff-container ff-welcome-container">
      <h1 className="ff-welcome-greeting">Ready to Discover Your People?</h1>
      <div className="ff-welcome-message">
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

      <div className="ff-welcome-message">
        <p>From this, I'll identify 3-5 personas former versions of you at different life stages who need what you've learned.</p>
      </div>

      <button className="ff-primary-button" onClick={analyzeJourney}>
        Generate Personas
      </button>
    </div>
  )

  const renderProcessing = () => (
    <div className="ff-container ff-processing-container">
      <div className="ff-spinner"></div>
      <div className="ff-processing-text">Analyzing your journey...</div>
      <div className="ff-processing-subtext">
        Looking across your life chapters, struggles, growth, and impact to identify the personas you're most qualified to serve.
        <br /><br />
        This usually takes 10-15 seconds.
      </div>
    </div>
  )

  const renderRating = () => {
    const ratedCount = Object.keys(personaRatings).length
    const totalCount = clusters.length

    return (
      <div className="ff-container ff-question-container">
        <div className="ff-question-number">Final Step</div>
        <h2 className="ff-question-text">Where are they on their journey?</h2>
        <p className="ff-question-subtext">
          For each persona, where are they in becoming aware of their problem?
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
            <div style={{ color: '#fbbf24', fontWeight: '600' }}>Awakening</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Just realized the problem</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#60a5fa', fontWeight: '600' }}>Struggling</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Actively trying to solve</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#6BCB77', fontWeight: '600' }}>Ready</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>Ready to invest in solution</div>
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
                  onClick={() => setPersonaRating(index, 'awakening')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: personaRatings[index] === 'awakening'
                      ? '#fbbf24'
                      : 'rgba(251, 191, 36, 0.15)',
                    color: personaRatings[index] === 'awakening'
                      ? '#1a1a2e'
                      : '#fbbf24',
                    transition: 'all 0.2s'
                  }}
                >
                  Awakening
                </button>
                <button
                  onClick={() => setPersonaRating(index, 'struggling')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: personaRatings[index] === 'struggling'
                      ? '#60a5fa'
                      : 'rgba(96, 165, 250, 0.15)',
                    color: personaRatings[index] === 'struggling'
                      ? '#1a1a2e'
                      : '#60a5fa',
                    transition: 'all 0.2s'
                  }}
                >
                  Struggling
                </button>
                <button
                  onClick={() => setPersonaRating(index, 'ready')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '13px',
                    background: personaRatings[index] === 'ready'
                      ? '#6BCB77'
                      : 'rgba(107, 203, 119, 0.15)',
                    color: personaRatings[index] === 'ready'
                      ? '#1a1a2e'
                      : '#6BCB77',
                    transition: 'all 0.2s'
                  }}
                >
                  Ready
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
          {ratedCount} of {totalCount} rated
        </div>

        {!allPersonasRated() && (
          <div className="ff-input-hint" style={{ color: '#fbbf24', marginBottom: '8px', textAlign: 'center' }}>
            Please rate all personas to continue
          </div>
        )}

        <button
          className="ff-primary-button"
          onClick={saveWithRatings}
          disabled={!allPersonasRated()}
          style={{ opacity: allPersonasRated() ? 1 : 0.5 }}
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
        <p>Based on your journey, we've identified personas former versions of yourself who need what you've learned:</p>
      </div>

      {/* Personas Wheel Visualization */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <GradientWheel
            segments={personasWithHue}
            rings={JOURNEY_STAGES}
            litCells={litCells}
            size={280}
            centerLabel="PERSONAS"
            interactive={true}
            celebrate={true}
          />
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            <span>Inner: Awakening</span>
            <span>Middle: Struggling</span>
            <span>Outer: Ready</span>
          </div>
        </div>
      </div>

      <div className="ff-cluster-grid" style={{ margin: '32px 0' }}>
        {clusters.map((cluster, index) => {
          const segmentMatch = PERSONA_SEGMENTS.find(s =>
            mapClusterToSegments(cluster.label).includes(PERSONA_SEGMENTS.indexOf(s))
          )
          const stageInfo = {
            awakening: { color: '#fbbf24', label: 'Awakening' },
            struggling: { color: '#60a5fa', label: 'Struggling' },
            ready: { color: '#6BCB77', label: 'Ready' }
          }[cluster.journeyStage] || { color: '#60a5fa', label: 'Struggling' }

          return (
            <div
              key={index}
              className="ff-cluster-card"
              style={{ cursor: 'default', borderColor: 'rgba(251, 191, 36, 0.3)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {segmentMatch && <span style={{ fontSize: '24px' }}>{segmentMatch.icon}</span>}
                <h3 style={{ margin: 0 }}>{cluster.label}</h3>
              </div>
              {cluster.journeyStage && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: `${stageInfo.color}20`,
                  color: stageInfo.color,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stageInfo.color }} />
                  {stageInfo.label}
                </div>
              )}
              <p>{cluster.insight}</p>

              <div className="ff-cluster-evidence">
                <div className="ff-cluster-evidence-label">Why you're qualified to serve them:</div>
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

      <h1 className="ff-welcome-greeting" style={{ marginTop: '40px' }}>Persona Discovery Complete!</h1>
      <div className="ff-welcome-message">
        <p>These are former versions of you. You understand their struggles because you've lived them.</p>
        <p style={{ marginTop: '24px' }}><strong>Next up:</strong> Let's discover your unique skills and strengths.</p>
      </div>

      <Link to={`/nikigai/skills?session=${quizSessionId || flowSessionId}`} className="ff-primary-button">
        Continue to Skills Discovery
      </Link>
    </div>
  )

  const screens = {
    welcome: renderWelcome,
    confirm: renderConfirm,
    processing: renderProcessing,
    rating: renderRating,
    success: renderSuccess
  }

  return (
    <div className="flow-finder-app">
      <div className="ff-progress-container">
        <div className="ff-progress-dots">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`ff-progress-dot ${
                i === 0 && currentScreen === 'welcome' ? 'active' :
                i === 1 && currentScreen === 'confirm' ? 'active' :
                i === 2 && currentScreen === 'processing' ? 'active' :
                i === 3 && currentScreen === 'rating' ? 'active' :
                i === 4 && currentScreen === 'success' ? 'active' : ''
              } ${
                (i === 0 && ['confirm', 'processing', 'rating', 'success'].includes(currentScreen)) ||
                (i === 1 && ['processing', 'rating', 'success'].includes(currentScreen)) ||
                (i === 2 && ['rating', 'success'].includes(currentScreen)) ||
                (i === 3 && currentScreen === 'success')
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
