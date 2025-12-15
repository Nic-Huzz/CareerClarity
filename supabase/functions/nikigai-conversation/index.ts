// Supabase Edge Function: Nikigai Conversational Flow
// Uses Claude AI for natural conversation and semantic clustering

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const SYSTEM_PROMPT = `You are a warm, insightful career discovery guide helping someone uncover their unique Nikigai - the intersection of their skills, passions, and purpose.

Your role is to:
1. FOLLOW the structured question flow (you'll be given the current step)
2. Acknowledge the user's response naturally and warmly
3. Make connections between what they've shared
4. Transition smoothly to the next question
5. When at clustering steps, create meaningful semantic clusters from their responses

TONE & STYLE:
- Warm but not overly effusive
- Insightful - notice patterns and connections
- Concise - keep responses to 2-3 short paragraphs max
- Use "you" language, make it personal
- Natural conversational transitions, not robotic

RESPONSE FORMAT:
You will respond using the 'nikigai_response' function/tool.
- Always use the tool to structure your response
- Include a conversational message
- CRITICAL: When clustering is requested, you MUST include the clusters in BOTH:
  1. The message field (formatted nicely with markdown)
  2. The clusters array field (structured JSON with label, items, insight for each cluster)

CLUSTERING GUIDELINES (when asked to cluster):
- Create 2-5 clusters based on semantic meaning
- Each cluster needs a thematic label (2-4 words)
- Group items by underlying theme/pattern, not surface similarity
- Include ALL provided items in clusters
- Add brief insight about what each cluster reveals
- Look for deeper patterns: values, motivations, ways of being

Format clusters NICELY in your message text using markdown:

**Cluster Name**
- item 1
- item 2
*Brief insight about this cluster*

- After showing clusters, ALWAYS end with: "Do these clusters look good, or would you like me to re-create them?"

CLUSTER TYPES:

PRELIMINARY ROLE CLUSTERING (when CLUSTER TYPE is "skills"):
- You are creating PRELIMINARY ASPIRATIONAL ROLE ideas based on early patterns
- This is a first glimpse at potential career directions - keep it exploratory but inspiring
- CRITICAL: Name roles creatively and aspirationally - NOT generic corporate titles or skill themes
  * GOOD: "Creative Experience Designer", "Community Impact Leader", "Innovation Catalyst", "Wellness & Growth Guide"
  * AVOID: "Creative Expression", "Problem-Solving", "Product Manager", "Consultant"
- For each preliminary role:
  * Group activities/interests that point toward this role direction
  * Explain what this role could look like based on their early patterns
  * Frame as possibilities: "you might thrive as..." or "this could evolve into..."
  * Keep it inspiring but acknowledge these are early insights
- Look for recurring themes across different life stages (childhood → high school → post-school)
- Focus on where their natural interests could lead them professionally
- Help them see exciting possibilities they might not have considered

FINAL ROLE CLUSTERING (when CLUSTER TYPE is "roles"):
- You are creating ASPIRATIONAL ROLE RECOMMENDATIONS that inspire and excite
- Each cluster represents a unique career path that combines their talents in a meaningful way
- CRITICAL: Name roles creatively and aspirationally - NOT generic corporate titles
  * GOOD: "Learning Experience Architect", "Social Impact Entrepreneur", "Healing & Wellness Coach", "Creative Systems Designer", "Community Transformation Catalyst"
  * AVOID: "Product Manager", "Marketing Manager", "Software Developer", "Consultant"
- Create role names that:
  * Sound inspiring and forward-thinking
  * Combine multiple aspects of their unique skill set
  * Feel like a calling or mission, not just a job
  * Are specific to their particular combination of talents
- For each role cluster:
  * Group skills that naturally fit that aspirational role
  * Explain what this role does and the impact it creates
  * Explain why they'd excel at it and feel fulfilled doing it
  * Paint a vision of what their work would look like in this role
- Focus on roles that combine their natural talents with things they love doing AND the impact they want to create
- The items to cluster are SKILLS, but you're grouping them into ASPIRATIONAL ROLE clusters
- Create 3-5 specific, inspiring role recommendations that feel personalized to them

PROBLEMS CLUSTERING (when target is "problems"):
- Identify the underlying CHANGE or IMPACT the user wants to create
- Each cluster represents a PROBLEM SPACE they deeply care about
- Name clusters as the transformation/change: "Mental Health Access", "Personal Development", "Creative Expression"
- When processing role models: extract the IMPACT or LESSON, not the person's name
- Focus on what deeply matters to them based on their experiences

PERSONA CLUSTERING (when target is "persona"):
- Create personas representing FORMER VERSIONS of this person
- Each persona should be a specific life stage or struggle the user went through
- Name them as PEOPLE with struggles: "The Overwhelmed New Entrepreneur", "The Burnt-Out Corporate Professional"
- NOT aspirational roles like "Vision Catalyst" or "Transformation Guide"
- For each persona: who they are, what they're struggling with, what they need`

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
    console.log('Received request:', JSON.stringify(body, null, 2).substring(0, 500))

    const {
      currentStep,
      userResponse,
      conversationHistory,
      allResponses,
      shouldCluster,
      shouldGenerate,
      clusterSources,
      clusterType,
      generateType,
      clusterData
    } = body

    if (!currentStep || !userResponse) {
      throw new Error('Missing required fields: currentStep or userResponse')
    }

    // Build the conversation context
    let userPrompt = ''

    // Add conversation history context
    if (conversationHistory && conversationHistory.length > 0) {
      userPrompt += 'Previous conversation:\n'
      conversationHistory.slice(-6).forEach((msg: any) => {
        userPrompt += `${msg.isAI ? 'You' : 'User'}: ${msg.text}\n\n`
      })
    }

    // Add current step info
    userPrompt += `\n---\nCURRENT STEP: ${currentStep.id}\n`
    userPrompt += `QUESTION ASKED: ${currentStep.assistant_prompt}\n`
    userPrompt += `USER'S RESPONSE: ${userResponse}\n\n`

    // If we need to cluster
    if (shouldCluster && allResponses) {
      userPrompt += `\n---\nCLUSTERING TASK:\n`
      userPrompt += `CLUSTER TYPE: "${clusterType || 'skill'}"\n`
      userPrompt += `Follow the ${clusterType?.toUpperCase() || 'SKILL'} CLUSTERING guidelines from your system prompt.\n\n`

      // Get items from specified sources
      const items: string[] = []
      allResponses.forEach((resp: any) => {
        if (clusterSources.some((source: string) => resp.store_as === source || source.includes('*'))) {
          const bullets = resp.response_raw.split(/[\n\-\*]/)
            .map((b: string) => b.trim())
            .filter((b: string) => b.length > 0)
          items.push(...bullets)
        }
      })

      userPrompt += `Items to cluster:\n${items.map((item, i) => `${i+1}. ${item}`).join('\n')}\n\n`
      userPrompt += `IMPORTANT: Create semantic clusters and:\n`
      userPrompt += `1. Show them beautifully formatted in your MESSAGE field using markdown\n`
      userPrompt += `2. ALSO include them in the CLUSTERS array field as structured JSON\n`
      userPrompt += `3. Each cluster needs: label, items array, and insight\n`
      userPrompt += `4. End your message with: "Do these clusters look good, or would you like me to re-create them?"\n`
    } else if (shouldGenerate && generateType === 'integration_summary') {
      userPrompt += `\n---\nINTEGRATION SUMMARY TASK:\n`
      userPrompt += `The user has completed their Skills, Problems, and Persona discovery flows.\n\n`

      const userId = allResponses && allResponses.length > 0 ? allResponses[0].user_id : null

      if (userId && clusterData) {
        userPrompt += `Here are the user's finalized clusters from the database:\n\n`

        if (clusterData.skills && clusterData.skills.length > 0) {
          userPrompt += `**ROLE CLUSTERS (from Skills flow):**\n`
          clusterData.skills.forEach((cluster: any) => {
            userPrompt += `- **${cluster.cluster_label}**: ${JSON.stringify(cluster.items || [])}\n`
          })
          userPrompt += '\n'
        }

        if (clusterData.problems && clusterData.problems.length > 0) {
          userPrompt += `**PROBLEMS CLUSTERS:**\n`
          clusterData.problems.forEach((cluster: any) => {
            userPrompt += `- **${cluster.cluster_label}**: ${JSON.stringify(cluster.items || [])}\n`
          })
          userPrompt += '\n'
        }

        if (clusterData.persona && clusterData.persona.length > 0) {
          userPrompt += `**PERSONA CLUSTERS:**\n`
          clusterData.persona.forEach((cluster: any) => {
            userPrompt += `- **${cluster.cluster_label}**: ${JSON.stringify(cluster.items || [])}\n`
          })
          userPrompt += '\n'
        }

        userPrompt += `Display ALL of these clusters in a clean, organized format.\n`
      }
    } else {
      const nextStep = currentStep.nextStep
      if (nextStep) {
        userPrompt += `\nNEXT STEP: ${nextStep.id}\n`
        userPrompt += `NEXT QUESTION: ${nextStep.assistant_prompt}\n\n`
        userPrompt += `Generate a conversational response that:\n`
        userPrompt += `1. Acknowledges what the user shared (briefly)\n`
        userPrompt += `2. Notes any interesting patterns or connections\n`
        userPrompt += `3. Transitions naturally to the next question\n`
      } else {
        userPrompt += `\nThis is the final step. Generate a brief acknowledgment of what they shared.\n`
      }
    }

    console.log('Sending to Claude:', userPrompt.substring(0, 500) + '...')

    // Define the response tool/function
    const requiredFields = shouldCluster || shouldGenerate ? ["message", "clusters"] : ["message"]

    const tools = [{
      name: "nikigai_response",
      description: "Respond to the user with a conversational message and optional clusters",
      input_schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Your warm, conversational response to the user. Use markdown formatting for emphasis."
          },
          clusters: {
            type: "array",
            description: shouldCluster
              ? "REQUIRED: Array of semantic clusters. Each cluster MUST have label, items array, and insight."
              : "Array of clusters (only include when clustering is requested)",
            items: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  description: "Thematic label for the cluster (2-4 words)"
                },
                items: {
                  type: "array",
                  description: "Items/bullet points in this cluster",
                  items: { type: "string" }
                },
                insight: {
                  type: "string",
                  description: "Brief insight about what this cluster reveals (1-2 sentences)"
                }
              },
              required: ["label", "items", "insight"]
            }
          }
        },
        required: requiredFields
      }
    }]

    // Call Claude API with tool use
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: shouldCluster || shouldGenerate ? 2048 : 1024,
        system: SYSTEM_PROMPT,
        tools: tools,
        tool_choice: { type: "tool", name: "nikigai_response" },
        messages: [{
          role: 'user',
          content: userPrompt
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

    if (!toolUse || toolUse.name !== 'nikigai_response') {
      throw new Error('Expected nikigai_response tool use in Claude response')
    }

    const result = {
      message: toolUse.input.message || '',
      clusters: toolUse.input.clusters || null
    }

    return new Response(
      JSON.stringify({
        message: result.message,
        clusters: result.clusters || null,
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
    console.error('Error in nikigai-conversation:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        message: "I apologize, but I encountered an error processing your response. Let's continue - please share your thoughts again."
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
