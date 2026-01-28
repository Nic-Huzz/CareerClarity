import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { GradientWheel } from './CompetenceWheels'
import './CompetenceWheels/GradientWheel.css'
import {
  PROBLEM_SEGMENTS, PERSONA_SEGMENTS, SKILLS_SEGMENTS,
  PROBLEMS_PROFICIENCY_RINGS, JOURNEY_STAGES, PROFICIENCY_RINGS
} from '../lib/wheelTaxonomy'
import './FlowFinder.css'

export default function FlowFinderIntegration() {
  const [searchParams] = useSearchParams()

  // Get session_id from URL params (passed from Skills flow or Quiz)
  const quizSessionId = searchParams.get('session')

  // Generate a flow-specific session ID if no session provided
  const [flowSessionId] = useState(() => `integration-${crypto.randomUUID()}`)

  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [sessionId, setSessionId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState(null)

  // Cluster data loaded from database
  const [skillsClusters, setSkillsClusters] = useState([])
  const [problemsClusters, setProblemsClusters] = useState([])
  const [personaClusters, setPersonaClusters] = useState([])
  const [quizResults, setQuizResults] = useState(null)

  // AI Analysis Results
  const [careerAnalysis, setCareerAnalysis] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})

  // Email capture for download
  const [downloadEmail, setDownloadEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [emailError, setEmailError] = useState('')

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  // Add hue values to segments for wheel rendering
  const problemsWithHue = useMemo(() =>
    PROBLEM_SEGMENTS.map((s, i) => ({ ...s, name: s.displayName, hue: i * 30 })),
    []
  )
  const personasWithHue = useMemo(() =>
    PERSONA_SEGMENTS.map((s, i) => ({ ...s, name: s.displayName, hue: i * 30 })),
    []
  )
  const skillsWithHue = useMemo(() =>
    SKILLS_SEGMENTS.map((s, i) => ({ ...s, name: s.displayName, hue: i * 30 })),
    []
  )

  // Map cluster labels to wheel segment indices
  const mapProblemsToSegments = (clusterLabel) => {
    const labelLower = clusterLabel.toLowerCase()
    const segmentMappings = {
      health: [0], fitness: [0], body: [0], energy: [0], physical: [0], vitality: [0],
      anxiety: [1], stress: [1], mindset: [1], mental: [1], wellbeing: [1], burnout: [1],
      skills: [2], learning: [2], productivity: [2], growth: [2], mastery: [2],
      relationship: [3], marriage: [3], dating: [3], family: [3], intimate: [3],
      caregiving: [4], support: [4], healthcare: [4], service: [4], care: [4],
      art: [5], creativity: [5], expression: [5], creative: [5],
      team: [6], community: [6], local: [6], culture: [6],
      belonging: [7], movement: [7], cultural: [7],
      money: [8], business: [8], career: [8], financial: [8], freedom: [8],
      inequality: [9], rights: [9], justice: [9], equity: [9],
      climate: [10], environment: [10], sustainability: [10], planet: [10],
      technology: [11], innovation: [11], future: [11], progress: [11],
    }
    const matchedSegments = new Set()
    Object.entries(segmentMappings).forEach(([keyword, indices]) => {
      if (labelLower.includes(keyword)) indices.forEach(i => matchedSegments.add(i))
    })
    return matchedSegments.size > 0 ? Array.from(matchedSegments) : [2]
  }

  const mapPersonasToSegments = (clusterLabel) => {
    const labelLower = clusterLabel.toLowerCase()
    const segmentMappings = {
      seeker: [0], lost: [0], direction: [0], purpose: [0],
      builder: [1], creating: [1], building: [1], entrepreneurship: [1],
      healer: [2], hurting: [2], healing: [2], trauma: [2],
      teacher: [3], learning: [3], knowledge: [3],
      connector: [4], lonely: [4], community: [4], belonging: [4],
      achiever: [5], success: [5], ambitious: [5],
      explorer: [6], freedom: [6], adventure: [6],
      visionary: [7], future: [7], innovation: [7],
      protector: [8], security: [8], safety: [8],
      creator: [9], expression: [9], artistic: [9],
      nurturer: [10], family: [10], caring: [10],
      challenger: [11], injustice: [11], justice: [11],
    }
    const matchedSegments = new Set()
    Object.entries(segmentMappings).forEach(([keyword, indices]) => {
      if (labelLower.includes(keyword)) indices.forEach(i => matchedSegments.add(i))
    })
    return matchedSegments.size > 0 ? Array.from(matchedSegments) : [0]
  }

  const mapSkillsToSegments = (clusterLabel) => {
    const labelLower = clusterLabel.toLowerCase()
    const segmentMappings = {
      clarifying: [0], explaining: [0], teaching: [0],
      analyzing: [1], analysis: [1], data: [1], research: [1],
      strategizing: [2], strategy: [2], planning: [2],
      organizing: [3], systems: [3], operations: [3],
      building: [4], making: [4], engineering: [4], coding: [4],
      designing: [5], design: [5], ux: [5], visual: [5],
      creating: [6], creative: [6], art: [6], writing: [6],
      expressing: [7], storytelling: [7], presenting: [7],
      connecting: [8], networking: [8], facilitating: [8],
      influencing: [9], sales: [9], persuading: [9],
      nurturing: [10], coaching: [10], mentoring: [10],
      synthesizing: [11], integrating: [11], wisdom: [11],
    }
    const matchedSegments = new Set()
    Object.entries(segmentMappings).forEach(([keyword, indices]) => {
      if (labelLower.includes(keyword)) indices.forEach(i => matchedSegments.add(i))
    })
    return matchedSegments.size > 0 ? Array.from(matchedSegments) : [6]
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

  // Generate lit cells from clusters
  const problemsLitCells = useMemo(() => {
    const cells = new Set()
    problemsClusters.forEach(cluster => {
      const ringIdx = getRingForProficiency(cluster.proficiency)
      mapProblemsToSegments(cluster.cluster_label).forEach(segIdx => cells.add(`${segIdx}-${ringIdx}`))
    })
    return cells
  }, [problemsClusters])

  const personasLitCells = useMemo(() => {
    const cells = new Set()
    personaClusters.forEach(cluster => {
      const ringIdx = getRingForProficiency(cluster.proficiency)
      mapPersonasToSegments(cluster.cluster_label).forEach(segIdx => cells.add(`${segIdx}-${ringIdx}`))
    })
    return cells
  }, [personaClusters])

  const skillsLitCells = useMemo(() => {
    const cells = new Set()
    skillsClusters.forEach(cluster => {
      const ringIdx = getRingForProficiency(cluster.proficiency)
      mapSkillsToSegments(cluster.cluster_label).forEach(segIdx => cells.add(`${segIdx}-${ringIdx}`))
    })
    return cells
  }, [skillsClusters])

  useEffect(() => {
    createSession()
    loadData()
  }, [])

  const createSession = async () => {
    try {
      // First check if session already exists (handles React strict mode double-mount)
      const { data: existing } = await supabase
        .from('flow_sessions')
        .select('id')
        .eq('session_id', quizSessionId || flowSessionId)
        .eq('flow_type', 'nikigai_integration')
        .single()

      if (existing) {
        setSessionId(existing.id)
        return
      }

      const { data, error } = await supabase
        .from('flow_sessions')
        .insert({
          session_id: quizSessionId || flowSessionId,
          flow_type: 'nikigai_integration',
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

  const loadData = async () => {
    try {
      // Load clusters for this session
      const { data: clusters, error: clustersError } = await supabase
        .from('nikigai_clusters')
        .select('*')
        .eq('session_id', quizSessionId || flowSessionId)
        .order('created_at', { ascending: false })

      if (clustersError) throw clustersError

      const skills = clusters.filter(c => c.cluster_type === 'skills')
      const problems = clusters.filter(c => c.cluster_type === 'problems')
      const persona = clusters.filter(c => c.cluster_type === 'persona')

      setSkillsClusters(skills)
      setProblemsClusters(problems)
      setPersonaClusters(persona)

      // Load quiz results for this session
      const { data: quiz, error: quizError } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('session_id', quizSessionId || flowSessionId)
        .single()

      if (!quizError && quiz) {
        setQuizResults(quiz)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const runCareerAnalysis = async () => {
    setIsProcessing(true)
    setProcessingError(null)
    setCurrentScreen('processing')

    console.log('Starting career analysis with:', {
      hasQuizResults: !!quizResults,
      problemsCount: problemsClusters.length,
      personaCount: personaClusters.length,
      skillsCount: skillsClusters.length
    })

    try {
      const { data, error } = await supabase.functions.invoke('career-analysis', {
        body: {
          quizResults: quizResults,
          problemsClusters: problemsClusters.map(c => ({
            cluster_label: c.cluster_label,
            insight: c.insight,
            items: c.items
          })),
          personaClusters: personaClusters.map(c => ({
            cluster_label: c.cluster_label,
            insight: c.insight,
            items: c.items
          })),
          skillsClusters: skillsClusters.map(c => ({
            cluster_label: c.cluster_label,
            insight: c.insight,
            items: c.items
          }))
        }
      })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      setCareerAnalysis(data.analysis)

      // Mark session as completed (only if sessionId exists)
      if (sessionId) {
        await supabase
          .from('flow_sessions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', sessionId)
      }

      setCurrentScreen('results')
    } catch (err) {
      console.error('Error running career analysis:', err)
      // Try to get error message from response
      let errorMsg = 'Error generating career analysis. Please try again.'
      if (err.context?.body) {
        try {
          const errorBody = JSON.parse(err.context.body)
          errorMsg = errorBody.error || errorMsg
        } catch (e) {}
      } else if (err.message) {
        errorMsg = err.message
      }
      setProcessingError(errorMsg)
      setCurrentScreen('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const downloadResults = () => {
    if (!careerAnalysis) return

    let content = `CAREER CLARITY RESULTS\n`
    content += `Generated: ${new Date().toLocaleDateString()}\n`
    content += `${'='.repeat(50)}\n\n`

    content += `CAREER SUMMARY\n${'-'.repeat(30)}\n`
    content += `${careerAnalysis.career_summary}\n\n`

    content += `JOB TITLES TO SEARCH FOR\n${'-'.repeat(30)}\n`
    if (Array.isArray(careerAnalysis.job_titles)) {
      careerAnalysis.job_titles.forEach((job, i) => {
        content += `${i + 1}. ${job.title}\n`
        content += `   Why it fits: ${job.why_fits}\n`
        content += `   Search keywords: ${Array.isArray(job.search_keywords) ? job.search_keywords.join(', ') : ''}\n\n`
      })
    }

    content += `TARGET INDUSTRIES\n${'-'.repeat(30)}\n`
    if (Array.isArray(careerAnalysis.industries)) {
      careerAnalysis.industries.forEach((ind, i) => {
        content += `${i + 1}. ${ind.name}\n`
        content += `   Why: ${ind.why_fits}\n`
        content += `   Example companies: ${Array.isArray(ind.example_companies) ? ind.example_companies.join(', ') : ''}\n\n`
      })
    }

    content += `COMPANY CHARACTERISTICS TO LOOK FOR\n${'-'.repeat(30)}\n`
    if (Array.isArray(careerAnalysis.company_characteristics)) {
      careerAnalysis.company_characteristics.forEach((char, i) => {
        content += `${i + 1}. ${char.characteristic}\n`
        content += `   Why it matters: ${char.why_matters}\n`
        content += `   How to identify: ${char.how_to_identify}\n\n`
      })
    }

    content += `INTERVIEW STORIES\n${'-'.repeat(30)}\n`
    if (Array.isArray(careerAnalysis.interview_stories)) {
      careerAnalysis.interview_stories.forEach((story, i) => {
        content += `${i + 1}. ${story.story_hook}\n`
        content += `   Situation: ${story.situation}\n`
        content += `   What it shows: ${story.what_it_shows}\n`
        content += `   When to use: ${story.when_to_use}\n\n`
      })
    }

    content += `LINKEDIN HEADLINES\n${'-'.repeat(30)}\n`
    if (Array.isArray(careerAnalysis.linkedin_headlines)) {
      careerAnalysis.linkedin_headlines.forEach((headline, i) => {
        content += `${i + 1}. ${headline}\n`
      })
    }
    content += '\n'

    content += `QUESTIONS TO ASK EMPLOYERS\n${'-'.repeat(30)}\n`
    if (Array.isArray(careerAnalysis.questions_to_ask)) {
      careerAnalysis.questions_to_ask.forEach((q, i) => {
        content += `${i + 1}. ${q.question}\n`
        content += `   Why ask: ${q.why_ask}\n`
        content += `   Red flag answer: ${q.red_flag_answer}\n\n`
      })
    }

    content += `RED FLAGS TO WATCH FOR\n${'-'.repeat(30)}\n`
    if (Array.isArray(careerAnalysis.red_flags)) {
      careerAnalysis.red_flags.forEach((rf, i) => {
        content += `${i + 1}. ${rf.red_flag}\n`
        content += `   Why problematic: ${rf.why_problematic}\n`
        content += `   What to look for: ${rf.what_to_look_for}\n\n`
      })
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `career-clarity-results-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const hasData = skillsClusters.length > 0 || problemsClusters.length > 0 || personaClusters.length > 0

  const renderWelcome = () => (
    <div className="ff-container ff-welcome-container">
      <h1 className="ff-welcome-greeting">Career Opportunities Analysis</h1>
      <div className="ff-welcome-message">
        <p><strong>Hey there!</strong></p>
        <p>You've done incredible work discovering your unique profile:</p>
      </div>

      {/* Three Wheels Display */}
      {hasData ? (
        <div style={{ margin: '32px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '24px', alignItems: 'center' }}>
            {/* Problems Wheel */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fbbf24', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Problems</h4>
              <GradientWheel
                segments={problemsWithHue}
                rings={PROBLEMS_PROFICIENCY_RINGS}
                litCells={problemsLitCells}
                size={220}
                centerLabel=""
                interactive={true}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                {problemsClusters.slice(0, 2).map((c, i) => (
                  <div key={i}>{c.cluster_label}</div>
                ))}
              </div>
            </div>

            {/* Personas Wheel */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#a855f7', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personas</h4>
              <GradientWheel
                segments={personasWithHue}
                rings={JOURNEY_STAGES}
                litCells={personasLitCells}
                size={220}
                centerLabel=""
                interactive={true}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                {personaClusters.slice(0, 2).map((c, i) => (
                  <div key={i}>{c.cluster_label}</div>
                ))}
              </div>
            </div>

            {/* Skills Wheel */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#6BCB77', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Skills</h4>
              <GradientWheel
                segments={skillsWithHue}
                rings={PROFICIENCY_RINGS}
                litCells={skillsLitCells}
                size={220}
                centerLabel=""
                interactive={true}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                {skillsClusters.slice(0, 2).map((c, i) => (
                  <div key={i}>{c.cluster_label}</div>
                ))}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            Hover over wheel segments to see details
          </p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px', margin: '32px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
            No discovery data found. Please complete the Problems, Persona, and Skills flows first.
          </p>
        </div>
      )}

      <div className="ff-welcome-message">
        <p>Now I'll analyze everything to generate personalized career guidance:</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        margin: '24px 0',
        textAlign: 'left'
      }}>
        {[
          { icon: '🎯', title: 'Job Titles', desc: 'Roles to search for' },
          { icon: '🏢', title: 'Industries', desc: 'Companies that fit' },
          { icon: '📖', title: 'Stories', desc: 'Interview narratives' },
          { icon: '💼', title: 'LinkedIn', desc: 'Headline options' },
          { icon: '❓', title: 'Questions', desc: 'To ask employers' },
          { icon: '🚩', title: 'Red Flags', desc: 'What to avoid' },
        ].map((item, i) => (
          <div key={i} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: '600', color: '#fbbf24', fontSize: '14px' }}>{item.title}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        className="ff-primary-button"
        onClick={runCareerAnalysis}
        disabled={!hasData}
        style={{ opacity: hasData ? 1 : 0.5 }}
      >
        Generate My Career Analysis
      </button>
    </div>
  )

  const renderProcessing = () => (
    <div className="ff-container ff-processing-container">
      <div className="ff-spinner"></div>
      <div className="ff-processing-text">Analyzing your career profile...</div>
      <div className="ff-processing-subtext">
        AI is connecting the dots between your problems, personas, and skills to generate personalized career guidance.
        <br /><br />
        This usually takes 20-30 seconds.
      </div>
    </div>
  )

  const renderError = () => (
    <div className="ff-container ff-welcome-container">
      <h1 className="ff-welcome-greeting" style={{ color: '#ef4444' }}>Analysis Error</h1>
      <div className="ff-welcome-message">
        <p>{processingError}</p>
      </div>
      <button className="ff-primary-button" onClick={runCareerAnalysis}>
        Try Again
      </button>
      <button
        className="ff-primary-button"
        onClick={() => setCurrentScreen('welcome')}
        style={{ background: 'rgba(255, 255, 255, 0.1)', marginTop: '12px' }}
      >
        Go Back
      </button>
    </div>
  )

  const CollapsibleSection = ({ title, isExpanded, onToggle, children }) => (
    <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: 'none',
          borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          color: '#fbbf24',
          fontSize: '16px',
          fontWeight: '700',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {title}
        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>
      {isExpanded && (
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      )}
    </div>
  )

  const renderResults = () => {
    if (!careerAnalysis) return null

    return (
      <div className="ff-container ff-welcome-container" style={{ maxWidth: '800px' }}>
        <h1 className="ff-welcome-greeting">Your Career Clarity Results</h1>

        {/* Career Summary */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '2px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', padding: '24px', margin: '32px 0', textAlign: 'left' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24', marginBottom: '16px' }}>Your Career Profile</h3>
          <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {careerAnalysis.career_summary}
          </p>
        </div>

        {/* Job Titles */}
        <CollapsibleSection
          title={`Job Titles to Search For (${Array.isArray(careerAnalysis.job_titles) ? careerAnalysis.job_titles.length : 0})`}
          isExpanded={expandedSections.jobTitles !== false}
          onToggle={() => toggleSection('jobTitles')}
        >
          {Array.isArray(careerAnalysis.job_titles) && careerAnalysis.job_titles.map((job, i) => (
            <div key={i} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i < careerAnalysis.job_titles.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>{job.title}</h4>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>{job.why_fits}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {job.search_keywords?.map((kw, j) => (
                  <span key={j} style={{ padding: '4px 12px', background: 'rgba(251, 191, 36, 0.2)', borderRadius: '20px', fontSize: '12px', color: '#fbbf24' }}>{kw}</span>
                ))}
              </div>
            </div>
          ))}
        </CollapsibleSection>

        {/* Industries */}
        <CollapsibleSection
          title={`Target Industries (${Array.isArray(careerAnalysis.industries) ? careerAnalysis.industries.length : 0})`}
          isExpanded={expandedSections.industries}
          onToggle={() => toggleSection('industries')}
        >
          {Array.isArray(careerAnalysis.industries) && careerAnalysis.industries.map((ind, i) => (
            <div key={i} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i < careerAnalysis.industries.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>{ind.name}</h4>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>{ind.why_fits}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                <strong>Examples:</strong> {ind.example_companies?.join(', ')}
              </p>
            </div>
          ))}
        </CollapsibleSection>

        {/* Company Characteristics */}
        <CollapsibleSection
          title={`What to Look For in Companies (${Array.isArray(careerAnalysis.company_characteristics) ? careerAnalysis.company_characteristics.length : 0})`}
          isExpanded={expandedSections.characteristics}
          onToggle={() => toggleSection('characteristics')}
        >
          {Array.isArray(careerAnalysis.company_characteristics) && careerAnalysis.company_characteristics.map((char, i) => (
            <div key={i} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i < careerAnalysis.company_characteristics.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>{char.characteristic}</h4>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}><strong>Why:</strong> {char.why_matters}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}><strong>How to spot:</strong> {char.how_to_identify}</p>
            </div>
          ))}
        </CollapsibleSection>

        {/* Interview Stories */}
        <CollapsibleSection
          title={`Interview Stories (${Array.isArray(careerAnalysis.interview_stories) ? careerAnalysis.interview_stories.length : 0})`}
          isExpanded={expandedSections.stories}
          onToggle={() => toggleSection('stories')}
        >
          {Array.isArray(careerAnalysis.interview_stories) && careerAnalysis.interview_stories.map((story, i) => (
            <div key={i} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: i < careerAnalysis.interview_stories.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fbbf24', marginBottom: '12px' }}>"{story.story_hook}"</h4>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}><strong>Situation:</strong> {story.situation}</p>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}><strong>What it shows:</strong> {story.what_it_shows}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', background: 'rgba(255, 255, 255, 0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                <strong>Use when asked:</strong> {story.when_to_use}
              </p>
            </div>
          ))}
        </CollapsibleSection>

        {/* LinkedIn Headlines */}
        <CollapsibleSection
          title={`LinkedIn Headlines (${Array.isArray(careerAnalysis.linkedin_headlines) ? careerAnalysis.linkedin_headlines.length : 0})`}
          isExpanded={expandedSections.linkedin}
          onToggle={() => toggleSection('linkedin')}
        >
          {Array.isArray(careerAnalysis.linkedin_headlines) && careerAnalysis.linkedin_headlines.map((headline, i) => (
            <div key={i} style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', borderLeft: '3px solid #fbbf24' }}>
              <p style={{ fontSize: '15px', color: 'white', margin: 0 }}>{headline}</p>
            </div>
          ))}
        </CollapsibleSection>

        {/* Questions to Ask */}
        <CollapsibleSection
          title={`Questions to Ask Employers (${Array.isArray(careerAnalysis.questions_to_ask) ? careerAnalysis.questions_to_ask.length : 0})`}
          isExpanded={expandedSections.questions}
          onToggle={() => toggleSection('questions')}
        >
          {Array.isArray(careerAnalysis.questions_to_ask) && careerAnalysis.questions_to_ask.map((q, i) => (
            <div key={i} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i < careerAnalysis.questions_to_ask.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>"{q.question}"</h4>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}><strong>Why ask:</strong> {q.why_ask}</p>
              <p style={{ fontSize: '13px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                <strong>Red flag answer:</strong> {q.red_flag_answer}
              </p>
            </div>
          ))}
        </CollapsibleSection>

        {/* Red Flags */}
        <CollapsibleSection
          title={`Red Flags to Watch For (${Array.isArray(careerAnalysis.red_flags) ? careerAnalysis.red_flags.length : 0})`}
          isExpanded={expandedSections.redFlags}
          onToggle={() => toggleSection('redFlags')}
        >
          {Array.isArray(careerAnalysis.red_flags) && careerAnalysis.red_flags.map((rf, i) => (
            <div key={i} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i < careerAnalysis.red_flags.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>{rf.red_flag}</h4>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}><strong>Why problematic:</strong> {rf.why_problematic}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}><strong>Look for:</strong> {rf.what_to_look_for}</p>
            </div>
          ))}
        </CollapsibleSection>

        {/* Action Buttons */}
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column' }}>
          {!emailSubmitted ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <input
                type="email"
                placeholder="Enter your email to download results"
                value={downloadEmail}
                onChange={(e) => {
                  setDownloadEmail(e.target.value)
                  setEmailError('')
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: emailError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {emailError && (
                <p style={{ color: '#ef4444', fontSize: '13px', margin: '4px 0 0 0' }}>{emailError}</p>
              )}
              <button
                className="ff-primary-button"
                style={{ marginTop: '8px' }}
                onClick={async () => {
                  if (!downloadEmail) {
                    setEmailError('Please enter your email')
                    return
                  }
                  if (!validateEmail(downloadEmail)) {
                    setEmailError('Please enter a valid email address')
                    return
                  }
                  // Save email to database
                  const { error: emailError } = await supabase.from('email_captures').insert({
                    email: downloadEmail,
                    session_id: quizSessionId || flowSessionId,
                    source: 'career_analysis_download'
                  })

                  if (emailError) {
                    console.error('Error saving email:', emailError)
                    // Still allow download even if email save fails
                  } else {
                    console.log('Email saved successfully:', downloadEmail)
                  }

                  setEmailSubmitted(true)
                  downloadResults()
                }}
              >
                Download Results
              </button>
            </div>
          ) : (
            <button className="ff-primary-button" onClick={downloadResults}>
              Download Results Again
            </button>
          )}
          <Link
            to="/"
            className="ff-primary-button"
            style={{ background: 'rgba(255, 255, 255, 0.1)', textDecoration: 'none', textAlign: 'center', marginTop: '8px' }}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const screens = {
    welcome: renderWelcome,
    processing: renderProcessing,
    error: renderError,
    results: renderResults
  }

  return (
    <div className="flow-finder-app">
      <div className="ff-progress-container">
        <div className="ff-progress-dots">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`ff-progress-dot ${
                i === 0 && currentScreen === 'welcome' ? 'active' :
                i === 1 && ['processing', 'error'].includes(currentScreen) ? 'active' :
                i === 2 && currentScreen === 'results' ? 'active' : ''
              } ${
                (i === 0 && currentScreen !== 'welcome') ||
                (i === 1 && currentScreen === 'results') ? 'completed' : ''
              }`}
            ></div>
          ))}
        </div>
      </div>
      {screens[currentScreen]?.()}
    </div>
  )
}
