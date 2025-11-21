// Predefined Professional Skills Categories
export const PROFESSIONAL_SKILLS = [
  { value: "data-analysis", label: "Data Analysis", description: "Statistical analysis and data interpretation" },
  { value: "machine-learning", label: "Machine Learning", description: "AI and ML model development" },
  { value: "project-management", label: "Project Management", description: "Planning, executing, and delivering projects" },
  { value: "marketing", label: "Marketing", description: "Brand development and marketing strategies" },
  { value: "graphic-design", label: "Graphic Design", description: "Visual design and creative work" },
  { value: "web-development", label: "Web Development", description: "Frontend and backend development" },
  { value: "financial-analysis", label: "Financial Analysis", description: "Financial planning and analysis" },
  { value: "content-writing", label: "Content Writing", description: "Writing and content creation" },
  { value: "social-media", label: "Social Media", description: "Social media management and strategy" },
  { value: "research", label: "Research", description: "Research and data gathering" },
  { value: "training-education", label: "Training & Education", description: "Curriculum development and teaching" },
  { value: "legal-advice", label: "Legal Advice", description: "Legal consultation and support" },
  { value: "healthcare", label: "Healthcare", description: "Medical and health services" },
  { value: "engineering", label: "Engineering", description: "Technical engineering work" },
  { value: "architecture", label: "Architecture", description: "Architectural design and planning" },
  { value: "translation", label: "Translation", description: "Language translation services" },
  { value: "photography", label: "Photography", description: "Photo and visual content creation" },
  { value: "video-production", label: "Video Production", description: "Video editing and production" },
  { value: "grant-writing", label: "Grant Writing", description: "Grant proposals and fundraising documents" },
  { value: "fundraising", label: "Fundraising", description: "Fundraising campaigns and donor relations" },
  { value: "human-resources", label: "Human Resources", description: "HR management and recruitment" },
  { value: "accounting", label: "Accounting", description: "Accounting and bookkeeping" },
  { value: "strategic-planning", label: "Strategic Planning", description: "Long-term planning and strategy" },
  { value: "public-relations", label: "Public Relations", description: "PR and communications" },
];

// Years of Experience Options
export const YEARS_OF_EXPERIENCE = [
  { value: "0-1", label: "0-1 years" },
  { value: "1-2", label: "1-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5-10", label: "5-10 years" },
  { value: "10+", label: "10+ years" },
];

// SDG Goals with Emojis and Descriptions
export const SDG_GOALS = [
  {
    id: 1,
    emoji: "🚫💰",
    title: "No Poverty",
    description: "End poverty in all its forms everywhere",
    color: "#E5243B"
  },
  {
    id: 2,
    emoji: "🍽️",
    title: "Zero Hunger",
    description: "End hunger, achieve food security and improved nutrition",
    color: "#DDA63A"
  },
  {
    id: 3,
    emoji: "🏥",
    title: "Good Health and Well-being",
    description: "Ensure healthy lives and promote well-being for all",
    color: "#4C9F38"
  },
  {
    id: 4,
    emoji: "📚",
    title: "Quality Education",
    description: "Ensure inclusive and equitable quality education",
    color: "#C5192D"
  },
  {
    id: 5,
    emoji: "⚖️",
    title: "Gender Equality",
    description: "Achieve gender equality and empower all women and girls",
    color: "#FF3A21"
  },
  {
    id: 6,
    emoji: "💧",
    title: "Clean Water and Sanitation",
    description: "Ensure availability of water and sanitation for all",
    color: "#26BDE2"
  },
  {
    id: 7,
    emoji: "⚡",
    title: "Affordable and Clean Energy",
    description: "Ensure access to affordable, reliable, sustainable energy",
    color: "#FCC30B"
  },
  {
    id: 8,
    emoji: "💼",
    title: "Decent Work and Economic Growth",
    description: "Promote sustained, inclusive economic growth and employment",
    color: "#A21942"
  },
  {
    id: 9,
    emoji: "🏗️",
    title: "Industry, Innovation and Infrastructure",
    description: "Build resilient infrastructure, promote innovation",
    color: "#FD6925"
  },
  {
    id: 10,
    emoji: "⚖️",
    title: "Reduced Inequalities",
    description: "Reduce inequality within and among countries",
    color: "#DD1367"
  },
  {
    id: 11,
    emoji: "🏙️",
    title: "Sustainable Cities and Communities",
    description: "Make cities and human settlements inclusive and sustainable",
    color: "#FD9D24"
  },
  {
    id: 12,
    emoji: "♻️",
    title: "Responsible Consumption and Production",
    description: "Ensure sustainable consumption and production patterns",
    color: "#BF8B2E"
  },
  {
    id: 13,
    emoji: "🌍",
    title: "Climate Action",
    description: "Take urgent action to combat climate change",
    color: "#3F7E44"
  },
  {
    id: 14,
    emoji: "🌊",
    title: "Life Below Water",
    description: "Conserve and sustainably use oceans and marine resources",
    color: "#0A97D9"
  },
  {
    id: 15,
    emoji: "🌱",
    title: "Life on Land",
    description: "Protect, restore and promote sustainable use of ecosystems",
    color: "#56C02B"
  },
  {
    id: 16,
    emoji: "⚖️",
    title: "Peace, Justice and Strong Institutions",
    description: "Promote peaceful and inclusive societies",
    color: "#00689D"
  },
  {
    id: 17,
    emoji: "🤝",
    title: "Partnerships for the Goals",
    description: "Strengthen implementation through global partnership",
    color: "#19486A"
  },
];

// Time Commitment Options
export const TIME_COMMITMENT_OPTIONS = [
  { value: "1-5", label: "1-5 hours/week" },
  { value: "5-10", label: "5-10 hours/week" },
  { value: "10-20", label: "10-20 hours/week" },
  { value: "20+", label: "20+ hours/week" },
];

// Project Duration Options
export const PROJECT_DURATION_OPTIONS = [
  { value: "one-time", label: "One-time event" },
  { value: "short-term", label: "Short-term (1-3 months)" },
  { value: "long-term", label: "Long-term (3+ months)" },
  { value: "flexible", label: "Flexible / Open to all" },
];

// Remote Work Preferences
export const REMOTE_WORK_PREFERENCES = [
  { value: "remote", label: "Remote Only" },
  { value: "in-person", label: "In-person Only" },
  { value: "hybrid", label: "Hybrid (Both)" },
];

// Matching Priority Sliders (1-5 scale)
export const MATCHING_PRIORITIES = [
  { key: "skillsMatch", label: "Skills Match", description: "How important is matching your skills?" },
  { key: "causeAlignment", label: "Cause Alignment", description: "How important is alignment with your causes?" },
  { key: "timeFlexibility", label: "Time Flexibility", description: "How important is scheduling flexibility?" },
  { key: "geographicPreference", label: "Geographic Preference", description: "How important is location match?" },
  { key: "impactPotential", label: "Impact Potential", description: "How important is making a big impact?" },
];
