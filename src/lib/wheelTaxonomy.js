/**
 * Competence Wheels Taxonomy
 *
 * Defines the predefined segment taxonomy for all three wheels:
 * - Skills Wheel: What capabilities you bring
 * - Problem Wheel: What problems resonate with you
 * - Persona Wheel: Who you're drawn to serve
 *
 * These segments replace AI-generated cluster names with consistent,
 * predefined categories that flow through the entire app.
 */

// ============================================================================
// SKILLS WHEEL SEGMENTS
// Organized by value creation type
// ============================================================================

export const SKILLS_SEGMENTS = [
  {
    id: 'clarifying',
    displayName: 'Clarifying',
    aspirationalTitle: 'The Translator',
    tagline: 'You make the complex simple',
    keywords: ['explain', 'teach', 'simplify', 'translate', 'communicate', 'make clear', 'break down'],
    color: '#FF6B6B',
    icon: '💡',
    valueCreated: 'Turning confusion into understanding',
  },
  {
    id: 'analyzing',
    displayName: 'Analyzing',
    aspirationalTitle: 'The Pattern Spotter',
    tagline: 'You see what others miss',
    keywords: ['data', 'patterns', 'logic', 'debug', 'diagnose', 'research', 'investigate', 'numbers', 'spreadsheets'],
    color: '#FF8E53',
    icon: '📊',
    valueCreated: 'Turning data into insight',
  },
  {
    id: 'strategizing',
    displayName: 'Strategizing',
    aspirationalTitle: 'The Chess Player',
    tagline: 'You think 10 moves ahead',
    keywords: ['plan', 'strategy', 'prioritize', 'decide', 'roadmap', 'vision', 'direction', 'big picture'],
    color: '#FFD93D',
    icon: '🎯',
    valueCreated: 'Turning goals into plans',
  },
  {
    id: 'organizing',
    displayName: 'Organizing',
    aspirationalTitle: 'The Systems Architect',
    tagline: 'You create order from chaos',
    keywords: ['systems', 'processes', 'operations', 'logistics', 'order', 'structure', 'efficiency'],
    color: '#6BCB77',
    icon: '⚙️',
    valueCreated: 'Turning chaos into order',
  },
  {
    id: 'building',
    displayName: 'Building',
    aspirationalTitle: 'The Maker',
    tagline: 'You turn ideas into reality',
    keywords: ['make', 'build', 'code', 'engineer', 'create things', 'construct', 'develop', 'prototype'],
    color: '#4D96FF',
    icon: '🔨',
    valueCreated: 'Turning blueprints into reality',
  },
  {
    id: 'designing',
    displayName: 'Designing',
    aspirationalTitle: 'The Experience Crafter',
    tagline: 'You shape how things feel',
    keywords: ['design', 'UX', 'visual', 'aesthetic', 'experience', 'interface', 'beautiful', 'intuitive'],
    color: '#9B59B6',
    icon: '🎨',
    valueCreated: 'Turning function into experience',
  },
  {
    id: 'creating',
    displayName: 'Creating',
    aspirationalTitle: 'The Originator',
    tagline: 'You bring new things into existence',
    keywords: ['art', 'write', 'ideate', 'invent', 'imagine', 'originate', 'compose', 'creative'],
    color: '#E91E63',
    icon: '✨',
    valueCreated: 'Turning nothing into something',
  },
  {
    id: 'expressing',
    displayName: 'Expressing',
    aspirationalTitle: 'The Voice',
    tagline: 'You give form to what matters',
    keywords: ['story', 'perform', 'present', 'voice', 'speak', 'share', 'articulate', 'storytelling'],
    color: '#FF5722',
    icon: '🎙️',
    valueCreated: 'Turning ideas into impact',
  },
  {
    id: 'connecting',
    displayName: 'Connecting',
    aspirationalTitle: 'The Bridge Builder',
    tagline: 'You bring people together',
    keywords: ['network', 'empathy', 'facilitate', 'collaborate', 'bring together', 'relationships', 'listen'],
    color: '#00BCD4',
    icon: '🤝',
    valueCreated: 'Turning strangers into allies',
  },
  {
    id: 'influencing',
    displayName: 'Influencing',
    aspirationalTitle: 'The Catalyst',
    tagline: 'You move people to action',
    keywords: ['sell', 'persuade', 'convince', 'motivate', 'negotiate', 'advocate', 'inspire'],
    color: '#F44336',
    icon: '🔥',
    valueCreated: 'Turning resistance into momentum',
  },
  {
    id: 'nurturing',
    displayName: 'Nurturing',
    aspirationalTitle: 'The Grower',
    tagline: 'You develop potential in others',
    keywords: ['coach', 'mentor', 'develop', 'grow', 'support', 'care', 'guide', 'patience'],
    color: '#8BC34A',
    icon: '🌱',
    valueCreated: 'Turning potential into performance',
  },
  {
    id: 'synthesizing',
    displayName: 'Synthesizing',
    aspirationalTitle: 'The Integrator',
    tagline: 'You see the whole picture',
    keywords: ['integrate', 'wisdom', 'big-picture', 'meaning', 'philosophy', 'connect dots', 'holistic'],
    color: '#673AB7',
    icon: '🔮',
    valueCreated: 'Turning fragments into wholeness',
  },
];

// ============================================================================
// PROBLEM WHEEL SEGMENTS
// Organized by Spheres of Impact: Self → Relational → Community → World
// ============================================================================

export const PROBLEM_SEGMENTS = [
  // Self Sphere
  {
    id: 'physical_vitality',
    displayName: 'Physical Vitality',
    aspirationalTitle: 'Body Whisperer',
    tagline: 'You help bodies thrive',
    keywords: ['health', 'fitness', 'energy', 'body', 'sleep', 'nutrition', 'illness', 'longevity', 'chronic'],
    color: '#FF6B6B',
    icon: '💪',
    sphere: 'self',
    exampleNiches: ['Fitness coaches', 'Nutritionists', 'Sleep consultants'],
  },
  {
    id: 'mental_wellbeing',
    displayName: 'Mental Wellbeing',
    aspirationalTitle: 'Mind Guardian',
    tagline: 'You restore inner peace',
    keywords: ['anxiety', 'stress', 'mindset', 'emotions', 'mental health', 'burnout', 'depression', 'overwhelm'],
    color: '#FF8E53',
    icon: '🧠',
    sphere: 'self',
    exampleNiches: ['Therapists', 'Mindset coaches', 'Meditation teachers'],
  },
  {
    id: 'personal_mastery',
    displayName: 'Personal Mastery',
    aspirationalTitle: 'Growth Catalyst',
    tagline: 'You unlock human potential',
    keywords: ['skills', 'learning', 'productivity', 'habits', 'growth', 'development', 'discipline', 'potential'],
    color: '#FFD93D',
    icon: '🎓',
    sphere: 'self',
    exampleNiches: ['Productivity coaches', 'Skill trainers', 'Habit designers'],
  },

  // Relational Sphere
  {
    id: 'intimate_bonds',
    displayName: 'Intimate Bonds',
    aspirationalTitle: 'Heart Healer',
    tagline: 'You deepen connection',
    keywords: ['relationship', 'marriage', 'dating', 'family', 'parenting', 'love', 'romance', 'partnership'],
    color: '#6BCB77',
    icon: '💕',
    sphere: 'relational',
    exampleNiches: ['Relationship coaches', 'Family therapists', 'Dating consultants'],
  },
  {
    id: 'service_care',
    displayName: 'Service & Care',
    aspirationalTitle: 'Care Champion',
    tagline: 'You support those who need it most',
    keywords: ['caregiving', 'elder', 'disability', 'support', 'helping others', 'healthcare', 'childcare'],
    color: '#4D96FF',
    icon: '🫶',
    sphere: 'relational',
    exampleNiches: ['Care coordinators', 'Support workers', 'Accessibility consultants'],
  },
  {
    id: 'creative_expression',
    displayName: 'Creative Expression',
    aspirationalTitle: 'Voice Liberator',
    tagline: 'You free creative spirits',
    keywords: ['art', 'creativity', 'voice', 'identity', 'expression', 'blocked', 'authentic', 'brand'],
    color: '#9B59B6',
    icon: '🎭',
    sphere: 'relational',
    exampleNiches: ['Creative coaches', 'Brand strategists', 'Art therapists'],
  },

  // Community Sphere
  {
    id: 'local_impact',
    displayName: 'Local Impact',
    aspirationalTitle: 'Community Builder',
    tagline: 'You strengthen local bonds',
    keywords: ['team', 'organization', 'community', 'neighborhood', 'local', 'culture', 'workplace'],
    color: '#E91E63',
    icon: '🏘️',
    sphere: 'community',
    exampleNiches: ['Team coaches', 'Culture consultants', 'Community organizers'],
  },
  {
    id: 'cultural_movements',
    displayName: 'Cultural Movements',
    aspirationalTitle: 'Movement Maker',
    tagline: 'You shape culture',
    keywords: ['belonging', 'identity', 'culture', 'movement', 'trends', 'subcultures', 'social'],
    color: '#FF5722',
    icon: '📢',
    sphere: 'community',
    exampleNiches: ['Community builders', 'Movement leaders', 'Cultural strategists'],
  },
  {
    id: 'economic_freedom',
    displayName: 'Economic Freedom',
    aspirationalTitle: 'Freedom Architect',
    tagline: 'You liberate from systems',
    keywords: ['money', 'business', 'career', 'job', 'income', 'financial', 'work', 'entrepreneur', 'freedom', '9-5'],
    color: '#00BCD4',
    icon: '🚀',
    sphere: 'community',
    exampleNiches: ['Business coaches', 'Financial advisors', 'Career strategists'],
  },

  // World Sphere
  {
    id: 'social_justice',
    displayName: 'Social Justice',
    aspirationalTitle: 'Equity Champion',
    tagline: 'You fight for fairness',
    keywords: ['inequality', 'discrimination', 'access', 'rights', 'fairness', 'advocacy', 'diversity'],
    color: '#F44336',
    icon: '⚖️',
    sphere: 'world',
    exampleNiches: ['Advocates', 'Policy consultants', 'DEI specialists'],
  },
  {
    id: 'planetary_health',
    displayName: 'Planetary Health',
    aspirationalTitle: 'Earth Guardian',
    tagline: 'You protect our planet',
    keywords: ['climate', 'environment', 'sustainability', 'planet', 'nature', 'conservation', 'green'],
    color: '#8BC34A',
    icon: '🌍',
    sphere: 'world',
    exampleNiches: ['Climate tech', 'Sustainability consultants', 'Environmental educators'],
  },
  {
    id: 'human_progress',
    displayName: 'Human Progress',
    aspirationalTitle: 'Future Builder',
    tagline: 'You advance humanity',
    keywords: ['technology', 'innovation', 'knowledge', 'future', 'advancement', 'education', 'breakthrough'],
    color: '#673AB7',
    icon: '🔬',
    sphere: 'world',
    exampleNiches: ['Tech ethicists', 'Futurists', 'Education reformers'],
  },
];

// ============================================================================
// PERSONA WHEEL SEGMENTS
// Psychographic types of customers you serve
// ============================================================================

export const PERSONA_SEGMENTS = [
  {
    id: 'seekers',
    displayName: 'Seekers',
    aspirationalTitle: 'The Compass',
    tagline: 'You guide lost souls home',
    keywords: ['lost', 'direction', 'purpose', 'meaning', 'clarity', 'finding themselves', 'confused'],
    color: '#FF6B6B',
    icon: '🧭',
    coreDrive: 'Direction',
    whatTheySeeking: 'Clarity on their path',
    yourRole: 'Guide, compass',
  },
  {
    id: 'builders',
    displayName: 'Builders',
    aspirationalTitle: 'The Architect',
    tagline: 'You help dreams take shape',
    keywords: ['creating', 'building', 'making', 'entrepreneurship', 'starting', 'launching', 'project'],
    color: '#FF8E53',
    icon: '🏗️',
    coreDrive: 'Creation',
    whatTheySeeking: 'Help building something',
    yourRole: 'Architect, enabler',
  },
  {
    id: 'healers',
    displayName: 'Healers',
    aspirationalTitle: 'The Mender',
    tagline: 'You restore what\'s broken',
    keywords: ['hurting', 'recovering', 'healing', 'trauma', 'pain', 'suffering', 'broken', 'wounded'],
    color: '#FFD93D',
    icon: '🩹',
    coreDrive: 'Wholeness',
    whatTheySeeking: 'Recovery from pain',
    yourRole: 'Healer, supporter',
  },
  {
    id: 'teachers',
    displayName: 'Teachers',
    aspirationalTitle: 'The Illuminator',
    tagline: 'You light the path of knowledge',
    keywords: ['learning', 'growing', 'developing', 'knowledge', 'education', 'skills', 'improve'],
    color: '#6BCB77',
    icon: '📚',
    coreDrive: 'Growth',
    whatTheySeeking: 'Knowledge and skills',
    yourRole: 'Mentor, expert',
  },
  {
    id: 'connectors',
    displayName: 'Connectors',
    aspirationalTitle: 'The Weaver',
    tagline: 'You create belonging',
    keywords: ['lonely', 'isolated', 'community', 'belonging', 'connection', 'friends', 'tribe'],
    color: '#4D96FF',
    icon: '🕸️',
    coreDrive: 'Belonging',
    whatTheySeeking: 'Community and relationships',
    yourRole: 'Host, facilitator',
  },
  {
    id: 'achievers',
    displayName: 'Achievers',
    aspirationalTitle: 'The Accelerator',
    tagline: 'You propel success',
    keywords: ['success', 'winning', 'status', 'recognition', 'ambitious', 'goals', 'competitive'],
    color: '#9B59B6',
    icon: '🏆',
    coreDrive: 'Success',
    whatTheySeeking: 'Status and recognition',
    yourRole: 'Coach, accelerator',
  },
  {
    id: 'explorers',
    displayName: 'Explorers',
    aspirationalTitle: 'The Liberator',
    tagline: 'You set the caged free',
    keywords: ['freedom', 'adventure', 'autonomy', 'escape', 'flexibility', 'travel', 'independent'],
    color: '#E91E63',
    icon: '🗺️',
    coreDrive: 'Freedom',
    whatTheySeeking: 'Adventure and autonomy',
    yourRole: 'Liberator, guide',
  },
  {
    id: 'visionaries',
    displayName: 'Visionaries',
    aspirationalTitle: 'The Pioneer',
    tagline: 'You chart new territories',
    keywords: ['future', 'change', 'innovation', 'big ideas', 'transformation', 'vision', 'disrupt'],
    color: '#FF5722',
    icon: '🔭',
    coreDrive: 'Impact',
    whatTheySeeking: 'Change the future',
    yourRole: 'Partner, amplifier',
  },
  {
    id: 'protectors',
    displayName: 'Protectors',
    aspirationalTitle: 'The Shield',
    tagline: 'You create safety',
    keywords: ['security', 'safety', 'stability', 'risk', 'protection', 'cautious', 'secure'],
    color: '#00BCD4',
    icon: '🛡️',
    coreDrive: 'Security',
    whatTheySeeking: 'Safety and stability',
    yourRole: 'Guardian, advisor',
  },
  {
    id: 'creators',
    displayName: 'Creators',
    aspirationalTitle: 'The Muse',
    tagline: 'You inspire expression',
    keywords: ['expression', 'art', 'originality', 'creativity', 'voice', 'unique', 'artistic'],
    color: '#F44336',
    icon: '🎨',
    coreDrive: 'Expression',
    whatTheySeeking: 'Voice and originality',
    yourRole: 'Muse, champion',
  },
  {
    id: 'nurturers',
    displayName: 'Nurturers',
    aspirationalTitle: 'The Anchor',
    tagline: 'You hold families together',
    keywords: ['family', 'caring', 'devoted', 'loved ones', 'support', 'children', 'parents'],
    color: '#8BC34A',
    icon: '⚓',
    coreDrive: 'Care',
    whatTheySeeking: 'Support for loved ones',
    yourRole: 'Helper, resource',
  },
  {
    id: 'challengers',
    displayName: 'Challengers',
    aspirationalTitle: 'The Truth Teller',
    tagline: 'You speak what must be said',
    keywords: ['injustice', 'change', 'disruption', 'truth', 'advocacy', 'rebel', 'fight'],
    color: '#673AB7',
    icon: '⚡',
    coreDrive: 'Justice',
    whatTheySeeking: 'Fight against injustice',
    yourRole: 'Ally, activist',
  },
];

// ============================================================================
// DIMENSIONAL DATA
// Second dimensions for 2D wheel mapping
// ============================================================================

/**
 * Problem Types - Second dimension for Problem Wheel
 * Captures WHAT KIND of problem it is, not just the domain
 */
export const PROBLEM_TYPES = [
  {
    id: 'access',
    label: 'Access',
    description: "They can't get what they need",
    examples: ["I can't afford therapy", "There's no gym near me"],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    description: "They don't know how",
    examples: ["I don't know how to start a business", "I don't understand nutrition"],
  },
  {
    id: 'capability',
    label: 'Capability',
    description: "They lack the skills",
    examples: ["I can't code", "I'm not good at public speaking"],
  },
  {
    id: 'motivation',
    label: 'Motivation',
    description: "They can't make themselves do it",
    examples: ["I keep procrastinating", "I start but never finish"],
  },
  {
    id: 'connection',
    label: 'Connection',
    description: "They're isolated",
    examples: ["I have no network", "I don't know anyone in my industry"],
  },
  {
    id: 'system',
    label: 'System',
    description: "They're trapped by structures",
    examples: ["My job won't let me work remotely", "The system is rigged against me"],
  },
];

/**
 * Journey Stages - Rings for Persona Wheel
 * Where the customer is in their awareness journey
 */
export const JOURNEY_STAGES = [
  {
    id: 'awakening',
    label: 'Awakening',
    ring: 'inner',
    color: '#E9A23B', // Orange
    description: 'Just realized they have this problem',
    mindset: 'Something needs to change',
    businessAdvice: 'Educational content, free resources, awareness building',
  },
  {
    id: 'struggling',
    label: 'Struggling',
    ring: 'middle',
    color: '#E9A23B', // Orange
    description: 'Actively trying to solve, hitting walls',
    mindset: "I've tried things, nothing works",
    businessAdvice: 'Done-with-you offers, coaching, guided programs',
  },
  {
    id: 'ready',
    label: 'Ready',
    ring: 'outer',
    color: '#E9A23B', // Orange
    description: 'Have budget, urgency, seeking solution',
    mindset: 'I need help NOW, take my money',
    businessAdvice: 'Premium offers, done-for-you, high-touch services',
  },
];

/**
 * Problems Proficiency Rings - 3-ring system for Problems wheel
 * Based on opportunity stage: have you explored, pursued, or proven this problem space?
 */
export const PROBLEMS_PROFICIENCY_RINGS = [
  {
    id: 'exploring',
    label: 'Exploring',
    ring: 'inner',
    color: '#E9A23B', // Orange
    description: 'New opportunity, curious but haven\'t pursued yet',
    indicators: ['Interested but haven\'t started', 'Researching the space', 'No track record yet'],
    businessAdvice: 'Research more, test interest before committing, find mentors in this space',
  },
  {
    id: 'pursuing',
    label: 'Pursuing',
    ring: 'middle',
    color: '#E9A23B', // Orange
    description: 'Currently working on this problem',
    indicators: ['Actively building solutions', 'Learning through doing', 'Growing experience'],
    businessAdvice: 'Build here, document your journey, create offers while learning',
  },
  {
    id: 'proven',
    label: 'Proven',
    ring: 'outer',
    color: '#E9A23B', // Orange
    description: 'Previously pursued, have results and experience',
    indicators: ['Have success stories', 'Battle-tested knowledge', 'Others seek your advice'],
    businessAdvice: 'Lead with this, case studies, premium positioning, teaching content',
  },
];

/**
 * Role Archetypes - Rings for Skills Wheel (Primary 2D dimension)
 * How you primarily express each skill
 */
export const ROLES = [
  {
    id: 'maker',
    label: 'Maker',
    ring: 'ring-1', // Innermost
    description: 'Builds products, systems, content',
    jobTypes: ['Engineer', 'Developer', 'Creator', 'Producer'],
    deliveryMode: 'Products, Tools, Content',
  },
  {
    id: 'guide',
    label: 'Guide',
    ring: 'ring-2',
    description: 'Develops people directly',
    jobTypes: ['Coach', 'Teacher', 'Mentor', 'Therapist'],
    deliveryMode: '1:1 or Group Sessions',
  },
  {
    id: 'analyst',
    label: 'Analyst',
    ring: 'ring-3',
    description: 'Researches, discovers insights',
    jobTypes: ['Researcher', 'Data Scientist', 'Investigator'],
    deliveryMode: 'Reports, Analysis, Recommendations',
  },
  {
    id: 'strategist',
    label: 'Strategist',
    ring: 'ring-4',
    description: 'Plans, advises, directs',
    jobTypes: ['Consultant', 'Advisor', 'Fractional Executive'],
    deliveryMode: 'Strategy, Roadmaps, Decisions',
  },
  {
    id: 'connector',
    label: 'Connector',
    ring: 'ring-5', // Outermost
    description: 'Facilitates, networks, hosts',
    jobTypes: ['Community Builder', 'Networker', 'Facilitator'],
    deliveryMode: 'Events, Introductions, Spaces',
  },
];

/**
 * Proficiency Rings - 3-ring system for Skills/Problems/Persona wheels
 * Based on user self-assessment: "Could I confidently teach this?"
 */
export const PROFICIENCY_RINGS = [
  {
    id: 'emerging',
    label: 'Emerging',
    ring: 'inner',
    color: '#E9A23B', // Orange
    description: 'Still learning, passionate but developing',
    indicators: ['Still learning', 'Wouldn\'t offer professionally yet', 'Need more practice'],
    businessAdvice: 'Growth opportunity - develop before monetizing, or partner with experts',
  },
  {
    id: 'establishing',
    label: 'Establishing',
    ring: 'middle',
    color: '#E9A23B', // Orange
    description: 'Competent and building experience',
    indicators: ['Can do it well', 'Wouldn\'t call myself expert', 'Building track record'],
    businessAdvice: 'Supporting offer - "done for you" services, share your journey',
  },
  {
    id: 'mastering',
    label: 'Mastering',
    ring: 'outer',
    color: '#E9A23B', // Orange
    description: 'Expert level, could teach others',
    indicators: ['Could teach this confidently', 'People come to me for advice', 'Significant experience'],
    businessAdvice: 'Lead with this - core offer, premium pricing, teaching content',
  },
];

/**
 * Skill Maturity - Legacy dimension (kept for reference)
 * How developed the skill is
 */
export const SKILL_MATURITY = [
  {
    id: 'emerging',
    label: 'Emerging',
    ring: 'inner',
    description: 'Beginning to develop',
    indicators: ['Just learning', 'Basic awareness', 'Needs guidance'],
  },
  {
    id: 'proficient',
    label: 'Proficient',
    ring: 'middle',
    description: 'Competent and growing',
    indicators: ['Can work independently', 'Solid foundation', 'Getting results'],
  },
  {
    id: 'mastery',
    label: 'Mastery',
    ring: 'outer',
    description: 'Expert level',
    indicators: ['Can teach others', 'Innovative applications', 'Industry recognition'],
  },
];

/**
 * Energy Source - Bonus dimension for Skills Wheel
 * Where the motivation to use this skill comes from
 */
export const ENERGY_SOURCES = [
  {
    id: 'intrinsic',
    label: 'Intrinsic',
    description: 'You LOVE doing this - it energizes you',
    flowCompassCorrelation: 'north', // Correlates with Flow state
  },
  {
    id: 'developed',
    label: 'Developed',
    description: "You're good at it but it's effort",
    flowCompassCorrelation: 'east', // Correlates with Redirect state
  },
  {
    id: 'compensated',
    label: 'Compensated',
    description: 'You only do it if well paid',
    flowCompassCorrelation: 'west', // Correlates with Honour state
  },
];

/**
 * Engagement Depth - Bonus dimension for Persona Wheel
 * What level of help they want
 */
export const ENGAGEMENT_DEPTH = [
  {
    id: 'diy',
    label: 'DIY',
    description: 'Content, templates, self-serve',
    priceLevel: 'Low ticket',
    examples: ['eBooks', 'Templates', 'Courses'],
  },
  {
    id: 'guided',
    label: 'Guided',
    description: 'Courses, group coaching, community',
    priceLevel: 'Mid ticket',
    examples: ['Group programs', 'Cohort courses', 'Membership'],
  },
  {
    id: 'done_with',
    label: 'Done-With',
    description: '1:1 coaching, consulting, high-touch',
    priceLevel: 'High ticket',
    examples: ['1:1 coaching', 'Consulting', 'VIP days'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get segment by ID for any wheel type
 */
export function getSegmentById(wheelType, segmentId) {
  const segments = getSegmentsForWheel(wheelType);
  return segments.find(s => s.id === segmentId);
}

/**
 * Get all segments for a wheel type
 */
export function getSegmentsForWheel(wheelType) {
  switch (wheelType) {
    case 'skills':
      return SKILLS_SEGMENTS;
    case 'problems':
      return PROBLEM_SEGMENTS;
    case 'persona':
      return PERSONA_SEGMENTS;
    default:
      throw new Error(`Unknown wheel type: ${wheelType}`);
  }
}

/**
 * Get dimensional data for a wheel type
 *
 * Skills: 12 segments × 5 roles = 60 cells (2D throughout flow)
 * Problems: 12 domains × 6 problem types = 72 cells (1D during flow, 2D on summary)
 * Persona: 12 psychographics × 3 journey stages = 36 cells (1D during flow, 2D on summary)
 */
export function getDimensionsForWheel(wheelType) {
  switch (wheelType) {
    case 'skills':
      return { rings: ROLES, bonus: ENERGY_SOURCES }; // 5 role rings
    case 'problems':
      return { rings: PROBLEM_TYPES, bonus: null }; // 6 problem type rings
    case 'persona':
      return { rings: JOURNEY_STAGES, bonus: ENGAGEMENT_DEPTH }; // 3 journey stage rings
    default:
      throw new Error(`Unknown wheel type: ${wheelType}`);
  }
}

/**
 * Get combined identity statement from lit segments
 */
export function getCombinedIdentity(skillSegments, problemSegments, personaSegments) {
  const primarySkill = skillSegments[0];
  const primaryProblem = problemSegments[0];
  const primaryPersona = personaSegments[0];

  if (!primarySkill || !primaryProblem || !primaryPersona) {
    return null;
  }

  // Build a combined title
  const skillTitle = primarySkill.aspirationalTitle.replace('The ', '');
  const problemTitle = primaryProblem.aspirationalTitle;
  const personaTitle = primaryPersona.aspirationalTitle.replace('The ', '');

  return {
    title: `The ${skillTitle} ${problemTitle}`,
    description: `A ${skillTitle} who helps ${primaryPersona.displayName.toLowerCase()} ${primaryProblem.tagline.toLowerCase()}.`,
    superpower: `Your superpower: ${primarySkill.valueCreated} for ${primaryPersona.displayName.toLowerCase()}.`,
  };
}

/**
 * Get classification prompt for AI
 */
export function getClassificationPrompt(wheelType, response) {
  const segments = getSegmentsForWheel(wheelType);
  const segmentList = segments
    .map(s => `- ${s.id}: ${s.keywords.join(', ')}`)
    .join('\n');

  return `
Classify this user response into the predefined categories.

Response: "${response}"

Categories:
${segmentList}

Return JSON with segments array (can be 1-3 matches) and confidence scores (0-1).
Format: { "segments": [{ "id": "analyzing", "confidence": 0.9 }] }
`;
}

/**
 * Feature matrix for Product Blueprint
 * Maps problem domains to recommended product features
 */
export const FEATURE_ARCHETYPES = [
  { id: 'tracking', label: 'Tracking', description: 'Progress tracking, metrics, dashboards' },
  { id: 'analysis', label: 'Analysis', description: 'Reports, insights, recommendations' },
  { id: 'planning', label: 'Planning', description: 'Goal setting, roadmaps, schedules' },
  { id: 'communication', label: 'Communication', description: 'Messaging, notifications, sharing' },
  { id: 'creation', label: 'Creation', description: 'Content creation, templates, builders' },
  { id: 'learning', label: 'Learning', description: 'Courses, lessons, resources' },
  { id: 'accountability', label: 'Accountability', description: 'Check-ins, streaks, commitments' },
  { id: 'community', label: 'Community', description: 'Forums, groups, connections' },
  { id: 'matching', label: 'Matching', description: 'Discovery, recommendations, pairing' },
  { id: 'automation', label: 'Automation', description: 'Workflows, reminders, scheduling' },
];

/**
 * Maps problem domains to recommended features
 */
export const DOMAIN_FEATURE_MAP = {
  physical_vitality: ['tracking', 'analysis', 'accountability', 'planning'],
  mental_wellbeing: ['tracking', 'learning', 'accountability', 'community'],
  personal_mastery: ['learning', 'tracking', 'community', 'accountability'],
  intimate_bonds: ['communication', 'planning', 'tracking', 'learning'],
  service_care: ['planning', 'communication', 'matching', 'tracking'],
  creative_expression: ['creation', 'community', 'matching', 'learning'],
  local_impact: ['communication', 'planning', 'community', 'tracking'],
  cultural_movements: ['community', 'communication', 'creation', 'matching'],
  economic_freedom: ['analysis', 'planning', 'learning', 'automation'],
  social_justice: ['community', 'communication', 'matching', 'creation'],
  planetary_health: ['tracking', 'community', 'analysis', 'learning'],
  human_progress: ['learning', 'creation', 'community', 'analysis'],
};

/**
 * Maps problem types to feature priorities
 */
export const PROBLEM_TYPE_FEATURE_MAP = {
  access: ['matching', 'community', 'analysis'],
  knowledge: ['learning', 'analysis', 'creation'],
  capability: ['learning', 'tracking', 'accountability'],
  motivation: ['accountability', 'community', 'tracking'],
  connection: ['matching', 'communication', 'community'],
  system: ['planning', 'analysis', 'automation'],
};
