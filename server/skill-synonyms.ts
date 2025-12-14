/**
 * Skill Synonym Mapping for Synerxus
 * Lightweight normalization layer - no external dependencies
 *
 * This maps variant skill names to canonical forms for improved matching.
 * Example: "UI Designer", "UX Designer", "Product Designer" all normalize to "ui/ux designer"
 *
 * Performance: O(1) lookup using reverse map, <1ms latency added
 *
 * Usage:
 *   import { normalizeSkillWithSynonyms } from './skill-synonyms';
 *   normalizeSkillWithSynonyms('UI Designer') // Returns: 'ui/ux designer'
 */

export const SKILL_MAP: Record<string, string[]> = {
  // ============ DESIGN ============
  'ui/ux designer': [
    'ui designer', 'ux designer', 'product designer', 'ux/ui designer',
    'ui ux designer', 'experience designer', 'interaction designer',
    'user experience designer', 'user interface designer', 'uxer',
    'ui/ux', 'ux/ui', 'ui design', 'ux design', 'user experience',
    'user interface', 'interface designer', 'designer'
  ],
  'graphic designer': [
    'visual designer', 'creative designer', 'digital designer',
    'graphics designer', 'brand designer', 'print designer',
    'graphic design', 'graphics', 'visual design'
  ],
  'web designer': ['website designer', 'webdesigner', 'site designer', 'web design'],

  // ============ DEVELOPMENT ============
  'software developer': [
    'software engineer', 'programmer', 'coder', 'developer', 'dev',
    'swe', 'engineer', 'software dev', 'application developer',
    'software development', 'programming', 'coding'
  ],
  'frontend developer': [
    'front-end developer', 'front end developer', 'ui developer',
    'frontend engineer', 'react developer', 'vue developer',
    'angular developer', 'frontend dev', 'client-side developer',
    'frontend', 'front-end', 'front end', 'frontend development'
  ],
  'backend developer': [
    'back-end developer', 'back end developer', 'server developer',
    'api developer', 'backend engineer', 'backend dev',
    'server-side developer', 'node developer', 'python developer',
    'backend', 'back-end', 'back end', 'backend development'
  ],
  'full stack developer': [
    'fullstack developer', 'full-stack developer', 'fullstack engineer',
    'full stack engineer', 'fullstack dev', 'full-stack dev',
    'fullstack', 'full-stack', 'full stack'
  ],
  'web developer': [
    'web dev', 'website developer', 'web programmer', 'webdev',
    'web development'
  ],
  'mobile developer': [
    'app developer', 'ios developer', 'android developer',
    'mobile engineer', 'react native developer', 'flutter developer',
    'mobile app developer', 'mobile dev', 'mobile development',
    'ios', 'android', 'mobile'
  ],
  'devops engineer': [
    'devops', 'site reliability engineer', 'sre', 'infrastructure engineer',
    'platform engineer', 'cloud engineer', 'devops developer'
  ],

  // ============ DATA ============
  'data analyst': [
    'data analytics', 'analytics specialist', 'business analyst',
    'bi analyst', 'analytics analyst', 'reporting analyst',
    'data analysis', 'analytics', 'business analysis'
  ],
  'data scientist': [
    'ml engineer', 'machine learning engineer', 'ai specialist',
    'data science', 'ml specialist', 'ai engineer',
    'machine learning', 'artificial intelligence', 'ml', 'ai'
  ],
  'data engineer': [
    'data infrastructure', 'etl developer', 'data pipeline engineer',
    'data engineering'
  ],

  // ============ MARKETING ============
  'marketing specialist': [
    'marketer', 'marketing coordinator', 'digital marketer',
    'marketing', 'marketing manager', 'growth marketer',
    'digital marketing', 'growth marketing'
  ],
  'social media manager': [
    'social media specialist', 'community manager', 'smm',
    'social media coordinator', 'social media', 'social manager',
    'social media marketing'
  ],
  'content writer': [
    'copywriter', 'content creator', 'blogger', 'content specialist',
    'writer', 'content marketing', 'copy writer', 'content',
    'writing', 'copywriting', 'content writing'
  ],
  'seo specialist': [
    'seo manager', 'seo expert', 'search specialist', 'seo',
    'search engine optimization', 'organic marketing'
  ],

  // ============ MANAGEMENT ============
  'project manager': [
    'program manager', 'project coordinator', 'pm', 'program coordinator',
    'project lead', 'delivery manager', 'project management',
    'programme manager', 'project coordination', 'program management',
    'project specialist', 'project professional', 'pmo',
    'project management professional', 'pmp'
  ],
  'product manager': [
    'product owner', 'po', 'product lead', 'product management'
  ],
  'operations manager': [
    'ops manager', 'operations coordinator', 'operations', 'ops'
  ],
  'team lead': [
    'team leader', 'tech lead', 'engineering manager', 'lead',
    'technical lead'
  ],

  // ============ FINANCE ============
  'accountant': [
    'bookkeeper', 'accounting specialist', 'finance specialist',
    'accounting', 'accounts', 'financial accountant',
    'accounting professional', 'cpa', 'certified accountant'
  ],
  'financial analyst': [
    'finance analyst', 'budget analyst', 'financial planning',
    'fp&a', 'financial analysis', 'finance professional',
    'financial professional', 'financial specialist', 'finance expert'
  ],
  'treasurer': [
    'finance officer', 'financial officer', 'cfo',
    'chief financial officer', 'finance director'
  ],

  // ============ HR & ADMIN ============
  'hr specialist': [
    'human resources', 'hr coordinator', 'recruiter',
    'talent acquisition', 'hr', 'people operations', 'hr manager',
    'recruitment', 'recruiting', 'hr professional', 'hr expert',
    'human resources professional', 'people professional',
    'talent specialist', 'personnel', 'personnel manager'
  ],
  'administrative assistant': [
    'admin assistant', 'office manager', 'secretary', 'admin',
    'executive assistant', 'office admin', 'administrative',
    'administration', 'admin professional', 'office professional',
    'administrative professional', 'office coordinator'
  ],

  // ============ NONPROFIT SPECIFIC ============
  'volunteer coordinator': [
    'volunteer manager', 'community coordinator', 'volunteer specialist',
    'volunteer management', 'volunteer organizer'
  ],
  'fundraiser': [
    'development officer', 'development coordinator', 'grant writer',
    'donor relations', 'fundraising', 'development director',
    'major gifts', 'philanthropy', 'grants'
  ],
  'program coordinator': [
    'program manager', 'program officer', 'program specialist',
    'program director', 'programs'
  ],
  'outreach coordinator': [
    'community outreach', 'outreach specialist', 'engagement coordinator',
    'outreach', 'community engagement', 'public outreach'
  ],
  'executive director': [
    'ed', 'nonprofit director', 'ceo', 'chief executive'
  ],

  // ============ EDUCATION ============
  'teacher': [
    'instructor', 'educator', 'tutor', 'trainer', 'teaching',
    'faculty', 'professor', 'lecturer', 'tutoring', 'education',
    'education professional', 'teaching professional', 'academic',
    'education specialist', 'learning professional'
  ],
  'curriculum developer': [
    'instructional designer', 'course developer', 'learning designer',
    'curriculum designer', 'learning specialist', 'instructional design',
    'curriculum specialist', 'education designer'
  ],
  'mentor': [
    'coach', 'advisor', 'counselor', 'guide', 'mentoring', 'coaching',
    'life coach', 'career coach', 'career advisor'
  ],

  // ============ HEALTHCARE ============
  'nurse': [
    'registered nurse', 'rn', 'nursing', 'lpn', 'nurse practitioner',
    'nursing professional', 'clinical nurse'
  ],
  'healthcare professional': [
    'health worker', 'medical assistant', 'caregiver',
    'healthcare', 'health professional', 'medical professional',
    'healthcare worker', 'health care professional', 'health care worker',
    'medical worker', 'healthcare specialist', 'medical specialist',
    'health specialist', 'clinical professional', 'clinical worker',
    'medical', 'health', 'clinical'
  ],
  'public health specialist': [
    'public health', 'public health professional', 'public health expert',
    'epidemiologist', 'health policy', 'community health',
    'population health', 'global health', 'health promotion',
    'disease prevention', 'health educator', 'public health officer'
  ],
  'doctor': [
    'physician', 'md', 'medical doctor', 'practitioner',
    'medical practitioner', 'general practitioner', 'gp'
  ],
  'therapist': [
    'physical therapist', 'occupational therapist', 'pt', 'ot',
    'therapy specialist', 'rehabilitation specialist', 'rehab specialist'
  ],
  'counselor': [
    'mental health counselor', 'therapist', 'psychologist',
    'mental health professional', 'behavioral health', 'social worker',
    'lcsw', 'clinical social worker', 'mental health specialist'
  ],

  // ============ LEGAL ============
  'lawyer': [
    'attorney', 'legal counsel', 'legal advisor', 'solicitor',
    'barrister', 'legal', 'legal professional', 'legal specialist',
    'legal expert', 'law professional', 'legal practitioner'
  ],
  'paralegal': [
    'legal assistant', 'legal secretary', 'legal support',
    'legal aide', 'legal coordinator'
  ],

  // ============ CREATIVE ============
  'photographer': [
    'photo specialist', 'photography', 'photojournalist',
    'photography professional', 'photo professional', 'camera operator'
  ],
  'videographer': [
    'video producer', 'video editor', 'filmmaker', 'video specialist',
    'cinematographer', 'video', 'video production', 'film',
    'video professional', 'film professional', 'media producer'
  ],
  'editor': [
    'copy editor', 'proofreader', 'editorial', 'managing editor', 'editing',
    'editorial professional', 'editor professional', 'content editor'
  ],
  'creative professional': [
    'creative', 'creative specialist', 'creative director',
    'art director', 'creative lead', 'creative manager'
  ],

  // ============ COMMUNICATIONS ============
  'communications specialist': [
    'communications', 'pr specialist', 'public relations',
    'communications coordinator', 'comms', 'pr', 'public affairs',
    'communications professional', 'pr professional', 'media specialist',
    'media professional', 'media relations', 'public relations professional'
  ],
  'event coordinator': [
    'event planner', 'event manager', 'events', 'event specialist',
    'event planning', 'event management'
  ],

  // ============ TECH SUPPORT ============
  'it support': [
    'tech support', 'it specialist', 'help desk', 'it',
    'technical support', 'it technician', 'support specialist',
    'it services', 'technology support', 'it professional',
    'tech professional', 'technology professional', 'it expert',
    'technical specialist', 'technology specialist'
  ],

  // ============ RESEARCH ============
  'researcher': [
    'research analyst', 'research specialist', 'research assistant',
    'research', 'analyst', 'research associate', 'research professional',
    'research scientist', 'research expert', 'academic researcher'
  ],

  // ============ TRANSLATION ============
  'translator': [
    'interpreter', 'translation', 'language specialist', 'linguist',
    'translation services', 'language services', 'language professional',
    'translation professional', 'multilingual specialist', 'localization specialist'
  ],

  // ============ SOFT SKILLS (TRANSFERABLE) ============
  'communication': [
    'communicator', 'verbal communication', 'written communication', 'public speaking',
    'presentation skills', 'interpersonal communication', 'communication skills',
    'effective communication', 'articulate', 'eloquent'
  ],
  'teamwork': [
    'team player', 'collaboration', 'collaborative', 'cooperative', 'team work',
    'team collaboration', 'group work', 'working with others', 'team building'
  ],
  'leadership': [
    'leader', 'leading', 'team leadership', 'management', 'supervisory',
    'motivating others', 'delegation', 'leadership skills', 'people management',
    'inspiring others', 'guiding teams'
  ],
  'problem-solving': [
    'problem solving', 'analytical thinking', 'critical thinking', 'troubleshooting',
    'solution-oriented', 'solutions', 'problem solver', 'analytical', 'analysis',
    'strategic thinking', 'logical thinking', 'reasoning'
  ],
  'time management': [
    'organization', 'organizational skills', 'prioritization', 'scheduling',
    'deadline management', 'punctual', 'punctuality', 'efficient', 'efficiency',
    'organized', 'planning', 'multitasking', 'multi-tasking'
  ],
  'adaptability': [
    'flexible', 'flexibility', 'adaptable', 'versatile', 'versatility',
    'adjustable', 'resilient', 'resilience', 'open to change', 'agile'
  ],
  'reliability': [
    'dependable', 'dependability', 'trustworthy', 'responsible', 'responsibility',
    'consistent', 'accountability', 'accountable', 'reliable', 'dedicated'
  ],
  'empathy': [
    'compassion', 'compassionate', 'understanding', 'empathetic', 'caring',
    'emotional intelligence', 'eq', 'sensitivity', 'supportive', 'patient'
  ],
  'work ethic': [
    'hardworking', 'hard working', 'diligent', 'dedicated', 'commitment',
    'committed', 'motivated', 'self-motivated', 'driven', 'persistent', 'perseverance'
  ],
  'creativity': [
    'creative', 'innovative', 'innovation', 'creative thinking', 'imagination',
    'inventive', 'original', 'artistic', 'out-of-the-box thinking', 'ideation'
  ],
  'interpersonal skills': [
    'people skills', 'social skills', 'relationship building', 'networking',
    'rapport building', 'customer service', 'client relations', 'stakeholder management'
  ],

  // ============ FIELDS & INDUSTRIES ============
  // Social Impact
  'youth development': [
    'children', 'youth', 'child development', 'youth work', 'youth services',
    'kids', 'teenagers', 'adolescents', 'child welfare', 'child care',
    'children & youth', 'child advocacy', 'youth advocacy', 'pediatric'
  ],
  'community development': [
    'community organizing', 'neighborhood development',
    'grassroots', 'civic engagement', 'community building', 'local development',
    'community empowerment', 'community services'
  ],
  'women empowerment': [
    "women's empowerment", 'gender equality', 'women rights', "women's rights",
    'female empowerment', 'gender equity', 'womens issues', 'maternal health',
    'girls education', 'women leadership'
  ],
  'international aid': [
    'humanitarian aid', 'disaster relief', 'emergency response', 'refugee services',
    'international development', 'global development', 'foreign aid', 'crisis response',
    'humanitarian work', 'relief work', 'ngo work'
  ],

  // Healthcare Fields
  'hospital work': [
    'hospitals', 'bedside care', 'hospital volunteer', 'medical facility', 'inpatient care'
  ],
  'holistic health': [
    'wellness', 'alternative medicine', 'integrative health', 'holistic care',
    'natural healing', 'complementary medicine', 'mind-body', 'holistic wellness'
  ],

  // Environment
  'conservation': [
    'environmental conservation', 'nature conservation', 'habitat preservation',
    'ecosystem protection', 'natural resources', 'sustainability', 'environmental protection',
    'green', 'eco-friendly', 'ecological'
  ],
  'wildlife': [
    'wildlife rescue', 'wildlife rehabilitation', 'wildlife protection',
    'endangered species', 'wildlife conservation', 'fauna'
  ],
  'agriculture': [
    'farming', 'sustainable farming', 'organic farming', 'farm work', 'gardening',
    'horticulture', 'urban farming', 'permaculture', 'agronomy', 'crops'
  ],
  'recycling': [
    'waste management', 'waste reduction', 'composting', 'upcycling', 'zero waste',
    'environmental cleanup', 'plastic reduction', 'circular economy'
  ],

  // Education Fields
  'classroom assistance': [
    'teaching assistant', 'classroom support', 'teacher aide', 'educational support',
    'school volunteer', 'classroom volunteer', 'learning support'
  ],

  // Animals
  'animal shelter': [
    'pet shelter', 'animal care', 'pet care', 'shelter volunteer', 
    'kennel', 'adoption center', 'pet adoption'
  ],
  'wildlife sanctuary': [
    'animal sanctuary', 'nature reserve', 'wildlife reserve', 'wildlife center',
    'conservation center', 'animal rehabilitation'
  ],

  // Arts & Culture
  'museum work': [
    'museums', 'gallery', 'art gallery', 'cultural heritage', 'curation',
    'museum volunteer', 'exhibition', 'heritage', 'art history', 'cultural preservation'
  ],
  'performing arts': [
    'theater', 'theatre', 'dance', 'music', 'performance', 'drama',
    'acting', 'stage production', 'performing', 'entertainment'
  ],

  // Community/Local
  'community center': [
    'community hub', 'recreation center', 'neighborhood center', 'civic center',
    'local community', 'community programs', 'community activities'
  ],
  'food bank': [
    'food pantry', 'food distribution', 'hunger relief', 'meal programs',
    'soup kitchen', 'feeding programs', 'food assistance', 'food security',
    'food rescue', 'meals on wheels'
  ],
  'neighborhood initiatives': [
    'local initiatives', 'neighborhood watch', 'block association', 'civic projects',
    'local projects', 'community projects', 'neighborhood improvement'
  ]
};

// Build reverse lookup map for O(1) normalization performance
// This pre-computes the mapping from every synonym to its canonical form
const REVERSE_MAP: Record<string, string> = {};
for (const [canonical, synonyms] of Object.entries(SKILL_MAP)) {
  // The canonical form maps to itself
  REVERSE_MAP[canonical] = canonical;
  // Each synonym maps to the canonical form
  for (const synonym of synonyms) {
    REVERSE_MAP[synonym] = canonical;
  }
}

/**
 * Normalize a single skill to its canonical form using synonym mapping
 * @param skill - The skill to normalize
 * @returns Canonical skill name, or original (lowercased) if not found in map
 *
 * @example
 * normalizeSkillWithSynonyms('UI Designer') // => 'ui/ux designer'
 * normalizeSkillWithSynonyms('Programmer')  // => 'software developer'
 * normalizeSkillWithSynonyms('PM')          // => 'project manager'
 */
export function normalizeSkillWithSynonyms(skill: string | null | undefined): string {
  if (!skill || typeof skill !== 'string') return '';
  const lower = skill.toLowerCase().trim();
  if (!lower) return '';
  return REVERSE_MAP[lower] || lower;
}

/**
 * Normalize an array of skills with synonym mapping and deduplication
 * @param skills - Array of skills to normalize
 * @returns Deduplicated array of canonical skill names
 *
 * @example
 * normalizeSkillsWithSynonyms(['UI Designer', 'UX Designer', 'Developer'])
 * // => ['ui/ux designer', 'software developer']
 */
export function normalizeSkillsWithSynonyms(skills: string[] | null | undefined): string[] {
  if (!skills || !Array.isArray(skills) || skills.length === 0) return [];
  const normalized = skills
    .map(normalizeSkillWithSynonyms)
    .filter((s): s is string => s.length > 0);
  return Array.from(new Set(normalized)); // Remove duplicates
}

/**
 * Check if two skills are equivalent (same canonical form)
 * @param skill1 - First skill
 * @param skill2 - Second skill
 * @returns True if both skills normalize to the same canonical form
 *
 * @example
 * skillsMatch('Developer', 'Software Engineer') // => true
 * skillsMatch('Designer', 'Accountant')         // => false
 */
export function skillsMatch(skill1: string, skill2: string): boolean {
  return normalizeSkillWithSynonyms(skill1) === normalizeSkillWithSynonyms(skill2);
}

/**
 * Get all synonyms for a skill (including the canonical form)
 * Useful for displaying what a skill matches with
 * @param skill - The skill to get synonyms for
 * @returns Array of all synonyms including canonical form
 */
export function getSynonyms(skill: string): string[] {
  const canonical = normalizeSkillWithSynonyms(skill);
  const synonyms = SKILL_MAP[canonical] || [];
  return [canonical, ...synonyms];
}

/**
 * Find partial matches for a skill that isn't in the synonym map
 * This is a fallback for skills not in our dictionary
 * @param skill - The skill to find partial matches for
 * @returns The canonical skill if a partial match is found, or the original
 */
export function findPartialMatch(skill: string): string {
  if (!skill) return '';
  const lower = skill.toLowerCase().trim();

  // First try exact match
  if (REVERSE_MAP[lower]) {
    return REVERSE_MAP[lower];
  }

  // Then try finding a canonical skill that contains this skill or vice versa
  for (const [canonical, synonyms] of Object.entries(SKILL_MAP)) {
    // Check if skill is contained in canonical or synonyms
    if (canonical.includes(lower) || lower.includes(canonical)) {
      return canonical;
    }
    for (const synonym of synonyms) {
      if (synonym.includes(lower) || lower.includes(synonym)) {
        return canonical;
      }
    }
  }

  return lower;
}

// Export the maps for debugging/testing purposes
export { REVERSE_MAP };
