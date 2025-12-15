// Supabase Edge Function: Career Analysis
// Analyzes quiz results + flow clusters to generate career recommendations

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const SYSTEM_PROMPT = `You are an expert career advisor helping someone find their ideal job or career path. You have deep knowledge of job markets, career development, and what makes people thrive in different roles.

You will receive:
1. Their Career Clarity Quiz results (path preference, unmet needs, work style preferences)
2. Their Problems clusters (issues they care about solving)
3. Their Persona clusters (types of people they understand and can help)
4. Their Skills/Role clusters (what they're naturally good at)

Your task is to analyze all this data and provide comprehensive, actionable career guidance.

OUTPUT FORMAT:
You MUST respond using the 'career_analysis' function with ALL required fields filled in thoughtfully.

GUIDELINES:
- Be specific and actionable, not generic
- Job titles should be real, searchable titles (not made-up creative names)
- Industries should be specific sectors, not broad categories
- Interview stories should be based on their actual life experiences from persona/problems data
- Questions to ask should relate to their specific unmet needs
- Red flags should be concrete warning signs in job descriptions or interviews
- LinkedIn headlines should be compelling and keyword-rich

TONE:
- Direct and practical
- Encouraging but realistic
- Focused on actionable next steps`

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const body = await req.json()
    console.log('Career analysis request received')

    // Check API key
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const {
      quizResults,
      problemsClusters,
      personaClusters,
      skillsClusters
    } = body

    console.log('Data received:', {
      hasQuizResults: !!quizResults,
      problemsCount: problemsClusters?.length || 0,
      personaCount: personaClusters?.length || 0,
      skillsCount: skillsClusters?.length || 0
    })

    // Validate we have at least some data to analyze
    const hasProblems = problemsClusters && problemsClusters.length > 0
    const hasPersona = personaClusters && personaClusters.length > 0
    const hasSkills = skillsClusters && skillsClusters.length > 0

    if (!hasProblems && !hasPersona && !hasSkills && !quizResults) {
      throw new Error('No data to analyze. Please complete at least one discovery flow.')
    }

    // Build the analysis prompt
    let analysisPrompt = `Analyze this person's career profile and provide comprehensive recommendations.\n\n`

    // Quiz results (optional)
    if (quizResults) {
      analysisPrompt += `## CAREER CLARITY QUIZ RESULTS\n`
      analysisPrompt += `- Path Result: ${quizResults.path_result === 'job' ? 'Find the Right Job' : 'Build Own Thing'}\n`
      analysisPrompt += `- Unmet Needs: ${JSON.stringify(quizResults.unmet_needs || [])}\n`
      analysisPrompt += `- Accomplish Score: ${quizResults.accomplish_score} (higher = achievement-oriented)\n`
      analysisPrompt += `- Employment Score: ${quizResults.employment_score} (higher = suited for employment)\n\n`

      // Parse need answers for more context
      if (quizResults.need_answers) {
        analysisPrompt += `### Need Preferences:\n`
        Object.entries(quizResults.need_answers).forEach(([need, data]: [string, any]) => {
          const selection = data.selection === 'left' ? 'Accomplish' : data.selection === 'right' ? 'Connect' : 'Both'
          const met = data.met
          analysisPrompt += `- ${need}: Prefers ${selection}, Currently ${met}\n`
        })
        analysisPrompt += '\n'
      }
    }

    // Structural answers for work style
    if (quizResults && quizResults.structural_answers) {
      analysisPrompt += `### Work Style Preferences:\n`
      Object.entries(quizResults.structural_answers).forEach(([question, answer]: [string, any]) => {
        analysisPrompt += `- ${question}: ${answer}\n`
      })
      analysisPrompt += '\n'
    }

    // Problems clusters
    if (problemsClusters && problemsClusters.length > 0) {
      analysisPrompt += `## PROBLEMS THEY CARE ABOUT\n`
      problemsClusters.forEach((cluster: any) => {
        analysisPrompt += `**${cluster.cluster_label}**\n`
        analysisPrompt += `- Insight: ${cluster.insight || 'N/A'}\n`
        analysisPrompt += `- Items: ${JSON.stringify(cluster.items || [])}\n\n`
      })
    }

    // Persona clusters
    if (personaClusters && personaClusters.length > 0) {
      analysisPrompt += `## PEOPLE THEY UNDERSTAND (Former versions of themselves)\n`
      personaClusters.forEach((cluster: any) => {
        analysisPrompt += `**${cluster.cluster_label}**\n`
        analysisPrompt += `- Insight: ${cluster.insight || 'N/A'}\n`
        analysisPrompt += `- Items: ${JSON.stringify(cluster.items || [])}\n\n`
      })
    }

    // Skills clusters
    if (skillsClusters && skillsClusters.length > 0) {
      analysisPrompt += `## THEIR SKILLS & ROLE ARCHETYPES\n`
      skillsClusters.forEach((cluster: any) => {
        analysisPrompt += `**${cluster.cluster_label}**\n`
        analysisPrompt += `- Insight: ${cluster.insight || 'N/A'}\n`
        analysisPrompt += `- Items: ${JSON.stringify(cluster.items || [])}\n\n`
      })
    }

    analysisPrompt += `\n---\nBased on ALL of the above, provide comprehensive career guidance. Be specific and actionable. Job titles should be REAL searchable job titles. All recommendations should directly connect to their profile data.\n`

    console.log('Sending to Claude for analysis...')

    // Define the response tool
    const tools = [{
      name: "career_analysis",
      description: "Provide comprehensive career analysis and recommendations",
      input_schema: {
        type: "object",
        properties: {
          career_summary: {
            type: "string",
            description: "2-3 paragraph summary of who they are professionally and what kind of career will fulfill them. Reference their specific data."
          },
          job_titles: {
            type: "array",
            description: "5-8 specific, searchable job titles that fit their profile. Real titles like 'Product Manager', 'UX Researcher', not made-up names.",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "The job title" },
                why_fits: { type: "string", description: "1-2 sentences on why this fits their profile" },
                search_keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-3 keywords to search for this role on job boards"
                }
              },
              required: ["title", "why_fits", "search_keywords"]
            }
          },
          industries: {
            type: "array",
            description: "4-6 specific industries or sectors that align with their values and interests",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Industry/sector name" },
                why_fits: { type: "string", description: "Why this industry aligns with them" },
                example_companies: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-3 example companies in this space"
                }
              },
              required: ["name", "why_fits", "example_companies"]
            }
          },
          company_characteristics: {
            type: "array",
            description: "5-7 specific characteristics to look for in a company based on their needs",
            items: {
              type: "object",
              properties: {
                characteristic: { type: "string", description: "What to look for" },
                why_matters: { type: "string", description: "Why this matters for them specifically" },
                how_to_identify: { type: "string", description: "How to spot this in job descriptions or interviews" }
              },
              required: ["characteristic", "why_matters", "how_to_identify"]
            }
          },
          interview_stories: {
            type: "array",
            description: "4-5 specific stories they can tell in interviews based on their life experiences from persona/problems data",
            items: {
              type: "object",
              properties: {
                story_hook: { type: "string", description: "One-line description of the story" },
                situation: { type: "string", description: "The situation/challenge they faced" },
                what_it_shows: { type: "string", description: "What quality/skill this demonstrates" },
                when_to_use: { type: "string", description: "What interview question this answers" }
              },
              required: ["story_hook", "situation", "what_it_shows", "when_to_use"]
            }
          },
          linkedin_headlines: {
            type: "array",
            description: "3 LinkedIn headline options (max 120 chars each) that capture their value proposition",
            items: { type: "string" }
          },
          questions_to_ask: {
            type: "array",
            description: "6-8 specific questions to ask employers based on their unmet needs",
            items: {
              type: "object",
              properties: {
                question: { type: "string", description: "The question to ask" },
                why_ask: { type: "string", description: "What unmet need this addresses" },
                red_flag_answer: { type: "string", description: "What answer would be a warning sign" }
              },
              required: ["question", "why_ask", "red_flag_answer"]
            }
          },
          red_flags: {
            type: "array",
            description: "5-7 specific red flags to watch for in job descriptions or interviews based on their past frustrations",
            items: {
              type: "object",
              properties: {
                red_flag: { type: "string", description: "What to watch out for" },
                why_problematic: { type: "string", description: "Why this would be bad for them specifically" },
                what_to_look_for: { type: "string", description: "How this shows up in job postings or interviews" }
              },
              required: ["red_flag", "why_problematic", "what_to_look_for"]
            }
          }
        },
        required: ["career_summary", "job_titles", "industries", "company_characteristics", "interview_stories", "linkedin_headlines", "questions_to_ask", "red_flags"]
      }
    }]

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: tools,
        tool_choice: { type: "tool", name: "career_analysis" },
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', claudeResponse.status, errorText)
      throw new Error(`Claude API error ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()

    // Extract tool use response
    const toolUse = claudeData.content.find((block: any) => block.type === 'tool_use')

    if (!toolUse || toolUse.name !== 'career_analysis') {
      throw new Error('Expected career_analysis tool use in Claude response')
    }

    console.log('Career analysis completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        analysis: toolUse.input,
        model: 'claude-3-5-haiku-20241022'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Error in career-analysis:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
