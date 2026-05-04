/**
 * Attributable Impact Units (AIU) Calculation System
 *
 * AIUs are auditable, SDG-mapped metrics that replace "Lives Touched" for CSR/ESG readiness.
 *
 * Definitions:
 * - AIU Unique: counts a unique beneficiary once per reporting window
 * - AIU Session: counts service instances (sessions, classes, hours) separately
 * - AttributionFactor: percentage of project ΔKPI credited to Synerxus-enabled volunteers
 *
 * Formulas:
 * - ΔKPI = KPI_after - KPI_before
 * - ΔSynerxus = ΔKPI × AttributionFactor
 * - AIU_i = ΔSynerxus × (w_i / Σw_j)
 *
 * where volunteer weight w_i = roleWeight × hours × reliabilityMultiplier
 */

/**
 * Role weights for attribution calculation
 *
 * Based on industry best practices:
 * - Taproot Foundation Pro Bono Valuation 2024: $220/hr for skilled pro bono vs $34.79 general (~6.3x)
 * - Independent Sector 2025: $34.79/hr national average for general volunteer time
 * - Bureau of Labor Statistics: Recommends role-based wage rates + 15.7% overhead
 * - SROI methodology: Skilled professional time valued 3-7x general volunteer time
 *
 * Weight tiers reflect responsibility level, skill requirements, and market value:
 * - Executive/Strategic: 3.0-4.0x (C-suite, board-level strategic guidance)
 * - Pro Bono Professional: 2.0-2.5x (licensed professionals: legal, medical, finance, IT)
 * - Project Leadership: 1.5-1.8x (coordinators, managers with direct accountability)
 * - Skilled/Technical: 1.2-1.4x (subject matter expertise, mentoring)
 * - General Support: 1.0x (baseline for standard volunteer activities)
 * - Administrative: 0.7-0.9x (clerical, data entry, logistics)
 * - Trainee/Observer: 0.3-0.5x (learning capacity, limited direct contribution)
 */
export const ROLE_WEIGHTS: Record<string, number> = {
  // Executive & Strategic Leadership (highest impact, strategic decision-making)
  executive: 4.0,       // C-suite executives, board advisors providing strategic guidance
  strategic_advisor: 3.5, // Senior consultants, strategic planners

  // Pro Bono Professionals (licensed/certified expertise - per Taproot Foundation valuation)
  pro_bono_legal: 3.0,  // Attorneys, legal counsel (based on ~$220/hr pro bono rate)
  pro_bono_medical: 3.0, // Doctors, nurses, healthcare professionals
  pro_bono_finance: 2.5, // CPAs, financial advisors, auditors
  pro_bono_tech: 2.5,   // Software engineers, IT architects, data scientists
  pro_bono_marketing: 2.0, // Marketing strategists, brand consultants

  // Project Leadership (accountability for outcomes)
  project_lead: 1.8,    // Project managers with full accountability
  lead: 1.5,            // Team leads, coordinators (legacy - retained for compatibility)
  team_captain: 1.5,    // Shift/team supervisors

  // Skilled Contributors (expertise without leadership responsibility)
  mentor: 1.4,          // Mentors, trainers, coaches
  specialist: 1.3,      // Subject matter experts (non-licensed)
  facilitator: 1.2,     // Workshop facilitators, event hosts

  // General Support (baseline tier)
  support: 1.0,         // General volunteers - Independent Sector baseline
  volunteer: 1.0,       // Alias for support (common terminology)

  // Administrative & Logistics
  admin: 0.8,           // Administrative support, data entry
  logistics: 0.7,       // Setup, teardown, transportation

  // Learning & Development
  trainee: 0.5,         // Volunteers in training (learning focus)
  observer: 0.3,        // Shadowing, observing only (minimal direct contribution)
};

/**
 * Role categories for UI grouping and selection
 */
export const ROLE_CATEGORIES: Record<string, { label: string; roles: string[] }> = {
  executive: {
    label: "Executive & Strategic",
    roles: ["executive", "strategic_advisor"]
  },
  pro_bono: {
    label: "Pro Bono Professional",
    roles: ["pro_bono_legal", "pro_bono_medical", "pro_bono_finance", "pro_bono_tech", "pro_bono_marketing"]
  },
  leadership: {
    label: "Project Leadership",
    roles: ["project_lead", "lead", "team_captain"]
  },
  skilled: {
    label: "Skilled Contributors",
    roles: ["mentor", "specialist", "facilitator"]
  },
  general: {
    label: "General Support",
    roles: ["support", "volunteer"]
  },
  administrative: {
    label: "Administrative & Logistics",
    roles: ["admin", "logistics"]
  },
  learning: {
    label: "Learning & Development",
    roles: ["trainee", "observer"]
  }
};

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    executive: "Executive/C-Suite",
    strategic_advisor: "Strategic Advisor",
    pro_bono_legal: "Pro Bono Legal",
    pro_bono_medical: "Pro Bono Medical",
    pro_bono_finance: "Pro Bono Finance",
    pro_bono_tech: "Pro Bono Tech/IT",
    pro_bono_marketing: "Pro Bono Marketing",
    project_lead: "Project Lead",
    lead: "Team Lead",
    team_captain: "Team Captain",
    mentor: "Mentor/Trainer",
    specialist: "Specialist",
    facilitator: "Facilitator",
    support: "General Support",
    volunteer: "Volunteer",
    admin: "Administrative",
    logistics: "Logistics",
    trainee: "Trainee",
    observer: "Observer"
  };
  return displayNames[role] || role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
}

/**
 * Verification multipliers based on ORGANIZATION verification status
 *
 * Key principle: Verification must come from the organization/NGO,
 * not from the volunteer uploading photos or self-reporting.
 *
 * Industry basis:
 * - Independent Sector: Third-party verification standards
 * - SROI Network: Stakeholder verification requirements
 * - GRI Standards: External assurance for impact claims
 */
export const VERIFICATION_MULTIPLIERS: Record<string, number> = {
  // Organization has verified this impact occurred
  verified: 1.0,
  approved: 1.0,      // Alias for verified

  // Organization is reviewing the claim
  pending: 0.7,
  under_review: 0.7,  // Alias for pending

  // Volunteer submitted, no org review yet
  submitted: 0.6,
  self_reported: 0.6, // Alias for submitted (legacy)

  // Impact claim is disputed or rejected
  disputed: 0.3,
  rejected: 0.0,      // No AIU for rejected claims
};

// Legacy alias for backwards compatibility
export const RELIABILITY_MULTIPLIERS = VERIFICATION_MULTIPLIERS;

// Verification status options
export type VerificationStatus = 'pending' | 'verified' | 'self_reported' | 'disputed' | 'rejected';

// =====================================================
// Logarithmic AIU Calculation System (V2)
// =====================================================

/**
 * AIU Ceiling Configuration
 *
 * Industry basis:
 * - Future of Humanity Institute: Law of Logarithmic Returns
 * - B Corp Assessment: Ceiling-based scoring methodology
 * - SROI Methodology: Duration decay and drop-off principles
 */
export const AIU_CEILING_CONFIG = {
  maxAiuPerProject: 100,      // Max AIU per volunteer per project
  maxProjectHours: 500,       // Reference max for hours factor calculation
  globalMaxAiu: 1000,         // Lifetime cap (sum across all projects)
  // NOTE: baselineMultiplier (k) is derived per-project, not hardcoded!
};

/**
 * REMOVED: Evidence upload bonus (v2.1)
 * Reason: Uploading a photo is a menial task, not real impact.
 * Verification should come from organization approval, not self-uploads.
 */

/**
 * REMOVED: Time decay (v2.1)
 * Reason: A life impacted 2 years ago is still a life impacted.
 * Real impact doesn't expire.
 */

/**
 * REMOVED: Consistency streak bonus (v2.1)
 * Reason: Showing up every month doesn't mean more lives were changed.
 * Focus on outcomes, not attendance.
 */

/**
 * Depth multipliers based on outcomeType field
 *
 * Based on IRIS+ Catalog and SROI "multiplier effect" standards:
 * - individual: Direct service delivery (baseline)
 * - shared: Training/capacity building has multiplier effect
 * - system: Systems change affects many beneficiaries
 */
export const DEPTH_MULTIPLIERS: Record<string, number> = {
  individual: 1.0,  // Direct service delivery
  shared: 1.5,      // Capacity building / training
  system: 2.0,      // Systems-level change
};

/**
 * Derive baseline multiplier (k) from project's expected maximum impact
 * Formula: k = MaxAIU / ln(1 + MaxExpectedEffectiveScore)
 *
 * This ensures AIU grows logarithmically toward the ceiling based on
 * the project's realistic expected impact scale.
 *
 * @param projectParams - Project parameters for deriving k
 * @returns The derived baseline multiplier k
 */
export function deriveBaselineMultiplier(projectParams: {
  expectedBeneficiaries: number;  // From projectAiuSettings.kpiAfter
}): number {
  const { maxAiuPerProject } = AIU_CEILING_CONFIG;

  // Calculate MaxExpectedEffectiveScore based on project scale
  // Uses maximum possible multipliers for ceiling calculation
  const maxDepth = Math.max(...Object.values(DEPTH_MULTIPLIERS));  // 2.0
  const maxRoleWeight = Math.max(...Object.values(ROLE_WEIGHTS));  // 4.0
  const maxReliability = 1.0;  // verified status
  const maxHoursFactor = 1.0;  // 500+ hours

  // Project's expected maximum effective score
  const maxExpectedEffectiveScore =
    projectParams.expectedBeneficiaries *
    maxDepth *
    maxRoleWeight *
    maxReliability *
    maxHoursFactor;

  // Derive k so that maxExpectedEffectiveScore approaches (but never reaches) ceiling
  const k = maxAiuPerProject / Math.log(1 + maxExpectedEffectiveScore);

  return Math.round(k * 100) / 100;  // Round to 2 decimals
}

/**
 * Logarithmic AIU calculation result
 */
export interface LogarithmicAIUResult {
  baseScore: number;
  hoursFactor: number;
  effectiveScore: number;
  aiu: number;
  percentOfCeiling: number;
  k: number;  // The derived baseline multiplier for transparency
}

/**
 * Calculate hours-scaled logarithmic AIU for a volunteer impact
 * Uses formula: AIU = min(MaxAIU, k × ln(1 + EffectiveScore))
 *
 * Industry basis:
 * - Future of Humanity Institute: Law of Logarithmic Returns
 * - B Corp Assessment: Ceiling-based scoring methodology
 * - SROI: Duration decay and drop-off principles
 *
 * @param input - Volunteer impact data including hours and project scale
 * @returns Calculation breakdown with AIU value
 */
export function calculateLogarithmicAIU(input: {
  livesImpacted: number;
  outcomeType: string;
  role: string;
  verificationStatus: string;
  hours: number;
  projectExpectedBeneficiaries: number;  // From projectAiuSettings.kpiAfter
}): LogarithmicAIUResult {
  const { maxAiuPerProject, maxProjectHours } = AIU_CEILING_CONFIG;

  // Derive k from project's expected scale (formula-based, not hardcoded!)
  const k = deriveBaselineMultiplier({
    expectedBeneficiaries: input.projectExpectedBeneficiaries
  });

  // Step 1: Calculate base impact score
  const depthMultiplier = DEPTH_MULTIPLIERS[input.outcomeType] || DEPTH_MULTIPLIERS.individual;
  const roleWeight = ROLE_WEIGHTS[input.role?.toLowerCase()] || ROLE_WEIGHTS.support;
  const reliabilityMultiplier = RELIABILITY_MULTIPLIERS[input.verificationStatus] || RELIABILITY_MULTIPLIERS.pending;
  const baseScore = input.livesImpacted * depthMultiplier * roleWeight * reliabilityMultiplier;

  // Step 2: Calculate hours factor (logarithmic scaling)
  const hoursFactor = input.hours > 0
    ? Math.log(1 + input.hours) / Math.log(1 + maxProjectHours)
    : 0;

  // Step 3: Calculate effective score
  const effectiveScore = baseScore * hoursFactor;

  // Step 4: Apply logarithmic formula with ceiling
  // k is derived from project parameters (not hardcoded!)
  const rawAiu = effectiveScore > 0 ? k * Math.log(1 + effectiveScore) : 0;
  const aiu = Math.min(maxAiuPerProject, rawAiu);

  // Step 5: Calculate percentage of ceiling
  const percentOfCeiling = (aiu / maxAiuPerProject) * 100;

  return {
    baseScore: Math.round(baseScore * 100) / 100,
    hoursFactor: Math.round(hoursFactor * 1000) / 1000,
    effectiveScore: Math.round(effectiveScore * 100) / 100,
    aiu: Math.round(aiu * 100) / 100,
    percentOfCeiling: Math.round(percentOfCeiling * 10) / 10,
    k,  // Include derived k for transparency
  };
}

/**
 * Pure Impact AIU Calculation (V3)
 *
 * DESIGN PRINCIPLES:
 * 1. Only real outcomes matter - lives impacted, depth of change
 * 2. No gameable factors - no bonus for uploading photos or showing up
 * 3. Verification comes from organizations, not self-reporting
 * 4. Past impact is still impact - no time decay
 *
 * FORMULA:
 * AIU = min(MaxAIU, k × ln(1 + EffectiveScore))
 *
 * Where:
 * - EffectiveScore = ImpactScore × EngagementFactor
 * - ImpactScore = LivesImpacted × DepthMultiplier × VerificationMultiplier
 * - EngagementFactor = RoleWeight × HoursFactor
 */

/**
 * Pure Impact AIU Result
 * Clean, transparent breakdown of how AIU was calculated
 */
export interface PureImpactAIUResult {
  // Impact Score Components (WHAT was achieved)
  livesImpacted: number;
  depthMultiplier: number;
  verificationMultiplier: number;
  impactScore: number;

  // Engagement Factor Components (HOW they contributed)
  roleWeight: number;
  hoursFactor: number;
  engagementFactor: number;

  // Consistency Bonus (small reward for sustained engagement)
  streakMonths: number;
  consistencyBonus: number;  // 0-10% bonus for long-term commitment

  // Final Calculation
  effectiveScore: number;
  k: number;
  aiu: number;
  percentOfCeiling: number;
}

/**
 * Calculate Pure Impact AIU (V3)
 *
 * This is the definitive AIU calculation focused entirely on real-world outcomes.
 * No gameable factors. No menial task bonuses. Just impact.
 *
 * Industry basis:
 * - SROI Methodology: Outcome-focused impact measurement
 * - IRIS+ Catalog: Standardized impact metrics
 * - GRI Standards: partner-confirmed output reporting
 * - Future of Humanity Institute: Law of Logarithmic Returns
 *
 * @param input - Volunteer impact data
 * @returns Pure impact calculation breakdown
 */
export function calculatePureImpactAIU(input: {
  // IMPACT: What was achieved
  livesImpacted: number;
  outcomeType: string;           // individual, shared, system
  verificationStatus: string;    // verified, pending, submitted, rejected

  // ENGAGEMENT: How they contributed
  role: string;
  hours: number;

  // PROJECT CONTEXT: For deriving k
  projectExpectedBeneficiaries: number;

  // OPTIONAL: Activity dates for streak calculation
  activityDates?: Date[];
}): PureImpactAIUResult {
  const { maxAiuPerProject, maxProjectHours } = AIU_CEILING_CONFIG;

  // ========================================
  // STEP 1: Calculate IMPACT SCORE
  // What real-world change was created?
  // ========================================

  // Lives Impacted: The core metric - how many people were helped
  const livesImpacted = Math.max(0, input.livesImpacted);

  // Depth Multiplier: How deep/lasting is the change?
  // - individual (1.0): Direct service (fed one person)
  // - shared (1.5): Capacity building (trained a teacher who teaches 30)
  // - system (2.0): Systems change (changed a policy affecting thousands)
  const depthMultiplier = DEPTH_MULTIPLIERS[input.outcomeType] || DEPTH_MULTIPLIERS.individual;

  // Verification Multiplier: Did the organization confirm this happened?
  // This is NOT about uploading photos - it's about org-level approval
  const verificationMultiplier = VERIFICATION_MULTIPLIERS[input.verificationStatus] || VERIFICATION_MULTIPLIERS.pending;

  // Impact Score = Lives × Depth × Verification
  const impactScore = livesImpacted * depthMultiplier * verificationMultiplier;

  // ========================================
  // STEP 2: Calculate ENGAGEMENT FACTOR
  // How did the volunteer contribute?
  // ========================================

  // Role Weight: What level of expertise/responsibility?
  // Higher weights for skilled roles (pro bono lawyer vs. general volunteer)
  const roleWeight = ROLE_WEIGHTS[input.role?.toLowerCase()] || ROLE_WEIGHTS.support;

  // Hours Factor: Time invested (logarithmic to prevent gaming)
  // First 10 hours matter a lot, next 100 hours matter less
  const hoursFactor = input.hours > 0
    ? Math.log(1 + input.hours) / Math.log(1 + maxProjectHours)
    : 0;

  // Engagement Factor = Role × Hours
  const engagementFactor = roleWeight * hoursFactor;

  // ========================================
  // STEP 3: Calculate EFFECTIVE SCORE
  // Impact × Engagement
  // ========================================

  const effectiveScore = impactScore * engagementFactor;

  // ========================================
  // STEP 4: Derive k from project scale
  // Smaller projects = faster AIU growth
  // Larger projects = more room for growth
  // ========================================

  const k = deriveBaselineMultiplier({
    expectedBeneficiaries: input.projectExpectedBeneficiaries
  });

  // ========================================
  // STEP 5: Calculate CONSISTENCY BONUS
  // Small reward (max 10%) for sustained long-term engagement
  // This rewards commitment without being gameable
  // ========================================

  let streakMonths = 0;
  let consistencyBonus = 0;

  if (input.activityDates && input.activityDates.length > 0) {
    // Count consecutive months with activity
    const sortedDates = input.activityDates
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    const monthsWithActivity = new Set<string>();
    sortedDates.forEach(date => {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsWithActivity.add(monthKey);
    });

    // Check for consecutive months from most recent
    const now = new Date();
    let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let consecutiveMonths = 0;

    for (let i = 0; i < 24; i++) { // Check up to 24 months back
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      if (monthsWithActivity.has(monthKey)) {
        consecutiveMonths++;
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      } else {
        break;
      }
    }

    streakMonths = consecutiveMonths;

    // Consistency bonus: 1% per month, max 10%
    // 3 months = 3%, 6 months = 6%, 12+ months = 10% (capped)
    consistencyBonus = Math.min(0.10, streakMonths * 0.01);
  }

  // ========================================
  // STEP 6: Apply logarithmic formula with consistency bonus
  // AIU = k × ln(1 + EffectiveScore) × (1 + consistencyBonus)
  // ========================================

  const rawAiu = effectiveScore > 0 ? k * Math.log(1 + effectiveScore) : 0;
  const aiuWithBonus = rawAiu * (1 + consistencyBonus);
  const aiu = Math.min(maxAiuPerProject, aiuWithBonus);
  const percentOfCeiling = (aiu / maxAiuPerProject) * 100;

  return {
    // Impact components
    livesImpacted,
    depthMultiplier: Math.round(depthMultiplier * 100) / 100,
    verificationMultiplier: Math.round(verificationMultiplier * 100) / 100,
    impactScore: Math.round(impactScore * 100) / 100,

    // Engagement components
    roleWeight: Math.round(roleWeight * 100) / 100,
    hoursFactor: Math.round(hoursFactor * 1000) / 1000,
    engagementFactor: Math.round(engagementFactor * 1000) / 1000,

    // Consistency bonus
    streakMonths,
    consistencyBonus: Math.round(consistencyBonus * 100) / 100, // as decimal (0.05 = 5%)

    // Final calculation
    effectiveScore: Math.round(effectiveScore * 100) / 100,
    k,
    aiu: Math.round(aiu * 100) / 100,
    percentOfCeiling: Math.round(percentOfCeiling * 10) / 10,
  };
}

// Legacy alias for backwards compatibility
export function calculateEnhancedLogarithmicAIU(input: {
  livesImpacted: number;
  outcomeType: string;
  role: string;
  verificationStatus: string;
  hours: number;
  projectExpectedBeneficiaries: number;
  hasEvidence?: boolean;
  evidenceCount?: number;
  impactDate?: Date;
  activityDates?: Date[];
}): PureImpactAIUResult & { evidenceBoost: number; timeDecayMultiplier: number; consistencyBonus: number; streakMonths: number; rawAiuBeforeEnhancements: number; baseScore: number } {
  const result = calculatePureImpactAIU(input);
  // Return with legacy fields set to neutral values (no effect)
  return {
    ...result,
    baseScore: result.impactScore,
    evidenceBoost: 0,
    timeDecayMultiplier: 1.0,
    consistencyBonus: 0,
    streakMonths: 0,
    rawAiuBeforeEnhancements: result.aiu,
  };
}

// AIU Types
export interface AIUCalculationInput {
  kpiBefore: number;
  kpiAfter: number;
  attributionFactor: number; // 0-1 (percentage as decimal)
  volunteers: VolunteerContribution[];
  reportingWindow?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface VolunteerContribution {
  volunteerId: number;
  volunteerName: string;
  role: string;
  hours: number;
  reliabilityStatus: string;
  sessionsCount?: number;
  uniqueBeneficiariesServed?: number;
}

export interface AIUResult {
  // Project-level metrics
  deltaKpi: number;
  deltaSynerxus: number;
  attributionFactor: number;
  totalWeight: number;

  // Aggregate AIUs
  aiuUniqueTotal: number;
  aiuSessionsTotal: number;

  // Per-volunteer AIUs
  volunteerAius: VolunteerAIU[];

  // Metadata
  calculatedAt: Date;
  formulaVersion: string;
}

export interface VolunteerAIU {
  volunteerId: number;
  volunteerName: string;
  role: string;
  hours: number;
  roleWeight: number;
  reliabilityMultiplier: number;
  volunteerWeight: number;
  weightPercentage: number;
  aiuUnique: number;
  aiuSessions: number;
  totalAiu: number;
}

export interface AIUExportRow {
  projectId: number;
  projectName: string;
  sdgIndicator: string;
  kpiBefore: number;
  kpiAfter: number;
  deltaKpi: number;
  attributionFactor: number;
  deltaSynerxus: number;
  aiuUniqueTotal: number;
  aiuSessionsTotal: number;
  volunteerId: number;
  volunteerName: string;
  role: string;
  hours: number;
  roleWeight: number;
  reliabilityMultiplier: number;
  volunteerWeight: number;
  volunteerAiu: number;
  verificationStatus: string;
  verifier: string | null;
  submissionTimestamp: Date;
  evidenceLinks: string[];
  version: string;
}

export interface AIUJsonExport {
  projectId: number;
  projectName: string;
  sdgIndicator: string;
  kpiMetrics: {
    before: number;
    after: number;
    delta: number;
    unit: string;
  };
  attribution: {
    factor: number;
    deltaSynerxus: number;
    methodology: string;
  };
  aiuSummary: {
    uniqueTotal: number;
    sessionsTotal: number;
    calculatedAt: string;
    formulaVersion: string;
  };
  volunteers: {
    id: number;
    name: string;
    role: string;
    hours: number;
    weight: {
      role: number;
      reliability: number;
      total: number;
      percentage: number;
    };
    aiu: {
      unique: number;
      sessions: number;
      total: number;
    };
  }[];
  verification: {
    status: string;
    verifier: string | null;
    verifiedAt: string | null;
    evidenceLinks: string[];
  };
  audit: {
    submitter: string;
    submittedAt: string;
    lastModifiedAt: string;
    version: string;
  };
}

/**
 * Calculate AIUs for a project based on KPI change and volunteer contributions
 *
 * The calculation properly accounts for the volunteer contribution percentage:
 * - Each role has a base weight from ROLE_WEIGHTS (e.g., lead=1.5, support=1.0)
 * - The volunteer contribution percentage represents what portion of the role's work
 *   is done by volunteers vs. organization's internal paid staff
 * - Effective role weight = base weight × volunteer contribution percentage
 *
 * Example: A "lead" role (base weight 1.5) with 30% volunteer contribution
 * means the organization's paid staff carry 70% of the role's work, while
 * volunteers share the remaining 30%. Effective volunteer weight = 1.5 × 0.30 = 0.45
 *
 * @param input - AIU calculation input
 * @param volunteerContributionPercents - Optional volunteer contribution percentages per role (0-1 scale)
 */
export function calculateProjectAIUs(input: AIUCalculationInput, volunteerContributionPercents?: Record<string, number>): AIUResult {
  const { kpiBefore, kpiAfter, attributionFactor, volunteers } = input;

  // Step 1: Calculate ΔKPI
  const deltaKpi = kpiAfter - kpiBefore;

  // Step 2: Calculate ΔSynerxus (attributed change)
  const deltaSynerxus = deltaKpi * attributionFactor;

  // Step 3: Calculate volunteer weights
  // Combine base role weights with volunteer contribution percentages
  const volunteersWithWeights = volunteers.map(v => {
    // Get the base role weight from ROLE_WEIGHTS (reflects skill/impact level)
    const baseRoleWeight = ROLE_WEIGHTS[v.role] || ROLE_WEIGHTS.support;

    // Get the volunteer contribution percentage for this role (if specified)
    // This represents what fraction of the role's work is done by volunteers
    // vs. the organization's internal paid staff
    const volunteerContributionPct = volunteerContributionPercents?.[v.role];

    // Calculate effective role weight:
    // - If contribution percentage is specified: base weight × contribution %
    //   (volunteers only get credit for their share of the role's work)
    // - If not specified: use full base weight (assumes 100% volunteer contribution)
    const roleWeight = volunteerContributionPct !== undefined
      ? baseRoleWeight * volunteerContributionPct
      : baseRoleWeight;

    const reliabilityMultiplier = RELIABILITY_MULTIPLIERS[v.reliabilityStatus] || RELIABILITY_MULTIPLIERS.pending;
    const volunteerWeight = roleWeight * v.hours * reliabilityMultiplier;

    return {
      ...v,
      roleWeight,
      reliabilityMultiplier,
      volunteerWeight,
    };
  });

  // Step 4: Calculate total weight
  const totalWeight = volunteersWithWeights.reduce((sum, v) => sum + v.volunteerWeight, 0);

  // Step 5: Calculate per-volunteer AIUs
  const volunteerAius: VolunteerAIU[] = volunteersWithWeights.map(v => {
    const weightPercentage = totalWeight > 0 ? v.volunteerWeight / totalWeight : 0;
    const aiuUnique = deltaSynerxus * weightPercentage;
    const aiuSessions = v.sessionsCount || Math.ceil(v.hours / 2); // Default: 1 session per 2 hours

    return {
      volunteerId: v.volunteerId,
      volunteerName: v.volunteerName,
      role: v.role,
      hours: v.hours,
      roleWeight: v.roleWeight,
      reliabilityMultiplier: v.reliabilityMultiplier,
      volunteerWeight: v.volunteerWeight,
      weightPercentage: Math.round(weightPercentage * 10000) / 100, // As percentage with 2 decimals
      aiuUnique: Math.round(aiuUnique * 100) / 100, // Round to 2 decimals
      aiuSessions,
      totalAiu: Math.round((aiuUnique + aiuSessions * 0.1) * 100) / 100, // Sessions worth 0.1 AIU each
    };
  });

  // Step 6: Calculate totals
  const aiuUniqueTotal = Math.round(volunteerAius.reduce((sum, v) => sum + v.aiuUnique, 0) * 100) / 100;
  const aiuSessionsTotal = volunteerAius.reduce((sum, v) => sum + v.aiuSessions, 0);

  return {
    deltaKpi: Math.round(deltaKpi * 10000) / 10000,
    deltaSynerxus: Math.round(deltaSynerxus * 10000) / 10000,
    attributionFactor,
    totalWeight: Math.round(totalWeight * 100) / 100,
    aiuUniqueTotal,
    aiuSessionsTotal,
    volunteerAius,
    calculatedAt: new Date(),
    formulaVersion: '1.0.0',
  };
}

/**
 * Generate a sample AIU calculation for demonstration/testing
 * Education project: 120 students, KPI 0.40 → 0.46, Attribution 0.22
 */
export function generateSampleAIUCalculation(): AIUResult {
  const sampleInput: AIUCalculationInput = {
    kpiBefore: 0.40,
    kpiAfter: 0.46,
    attributionFactor: 0.22,
    volunteers: [
      {
        volunteerId: 1,
        volunteerName: 'Sarah Chen',
        role: 'lead',
        hours: 45,
        reliabilityStatus: 'verified',
        sessionsCount: 18,
        uniqueBeneficiariesServed: 35,
      },
      {
        volunteerId: 2,
        volunteerName: 'Marcus Johnson',
        role: 'mentor',
        hours: 32,
        reliabilityStatus: 'verified',
        sessionsCount: 14,
        uniqueBeneficiariesServed: 28,
      },
      {
        volunteerId: 3,
        volunteerName: 'Priya Patel',
        role: 'support',
        hours: 20,
        reliabilityStatus: 'self_reported',
        sessionsCount: 10,
        uniqueBeneficiariesServed: 22,
      },
    ],
    reportingWindow: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
    },
  };

  return calculateProjectAIUs(sampleInput);
}

/**
 * Format AIU for display in UI
 */
export function formatAIUDisplay(aiu: number, type: 'unique' | 'sessions' = 'unique'): string {
  if (type === 'sessions') {
    return `${aiu} session${aiu !== 1 ? 's' : ''}`;
  }
  return aiu.toFixed(2);
}

/**
 * Generate volunteer resume line with AIU
 */
export function generateVolunteerResumeLine(
  volunteerAiu: VolunteerAIU,
  projectName: string,
  sdgIndicator: string,
  verifier: string,
  kpiBefore: number,
  kpiAfter: number,
): string {
  return `As ${volunteerAiu.role}, I contributed ${volunteerAiu.aiuUnique.toFixed(1)} AIUs to ${sdgIndicator}, supporting a change from ${(kpiBefore * 100).toFixed(0)}% → ${(kpiAfter * 100).toFixed(0)}%. Verified by ${verifier}.`;
}

/**
 * Generate LinkedIn snippet for volunteer
 */
export function generateLinkedInSnippet(
  volunteerAiu: VolunteerAIU,
  projectName: string,
  sdgIndicator: string,
  verifier: string,
  kpiBefore: number,
  kpiAfter: number,
): string {
  const role = volunteerAiu.role.charAt(0).toUpperCase() + volunteerAiu.role.slice(1);
  return `🌍 ${role} Volunteer at ${projectName}\n\nContributed ${volunteerAiu.aiuUnique.toFixed(1)} Attributable Impact Units (AIUs) to ${sdgIndicator}.\n\n📊 Impact: ${(kpiBefore * 100).toFixed(0)}% → ${(kpiAfter * 100).toFixed(0)}% improvement\n⏱️ ${volunteerAiu.hours} hours volunteered\n✅ Verified by ${verifier}\n\n#VolunteerImpact #SDGs #SocialImpact`;
}

/**
 * Generate project summary paragraph with AIUs
 */
export function generateProjectSummary(
  projectName: string,
  aiuResult: AIUResult,
  sdgIndicator: string,
  beneficiaryCount: number,
  verifier: string,
): string {
  return `${projectName} achieved ${aiuResult.aiuUniqueTotal.toFixed(1)} Unique AIUs and ${aiuResult.aiuSessionsTotal} Session AIUs during the reporting period. The project contributed to ${sdgIndicator} with a KPI improvement of ${(aiuResult.deltaKpi * 100).toFixed(1)} percentage points (Attribution Factor: ${(aiuResult.attributionFactor * 100).toFixed(0)}%). ${aiuResult.volunteerAius.length} volunteers served ${beneficiaryCount} unique beneficiaries across ${aiuResult.aiuSessionsTotal} service sessions. Impact verified by ${verifier}.`;
}

/**
 * AIU tooltip text for dashboard
 */
export const AIU_TOOLTIP_TEXT = `AIU Unique counts each beneficiary once per reporting window. AIU Session counts service instances. Both map to SDG indicators and include attribution math and verification metadata.`;

/**
 * Convert Lives Impacted input to AIU-ready data
 * This bridges the volunteer input (Lives Impacted) to the AIU system
 */
export function convertLivesImpactedToAIU(
  livesImpacted: number,
  hours: number,
  role: string,
  verificationStatus: string,
  sessionsCount?: number,
): { uniqueBeneficiaries: number; sessions: number; estimatedAiu: number } {
  const roleWeight = ROLE_WEIGHTS[role] || ROLE_WEIGHTS.support;
  const reliabilityMultiplier = RELIABILITY_MULTIPLIERS[verificationStatus] || RELIABILITY_MULTIPLIERS.pending;

  // Sessions default to 1 per 2 hours if not specified
  const sessions = sessionsCount || Math.ceil(hours / 2);

  // Estimated AIU based on standard attribution (this is a simplified estimate)
  // Full AIU calculation requires project-level KPI data
  const estimatedAiu = livesImpacted * roleWeight * reliabilityMultiplier * 0.1; // 0.1 is a baseline factor

  return {
    uniqueBeneficiaries: livesImpacted,
    sessions,
    estimatedAiu: Math.round(estimatedAiu * 100) / 100,
  };
}

/**
 * Verification checklist for CSR teams
 */
export const CSR_VERIFICATION_CHECKLIST = [
  { id: 1, item: 'KPI baseline (before) documented with date and source', required: true },
  { id: 2, item: 'KPI endpoint (after) documented with date and source', required: true },
  { id: 3, item: 'Attribution factor methodology documented', required: true },
  { id: 4, item: 'Unique beneficiary count verified by NGO/partner', required: true },
  { id: 5, item: 'Volunteer hours verified against sign-in sheets', required: true },
  { id: 6, item: 'Session count matches attendance records', required: false },
  { id: 7, item: 'Evidence files (photos, documents) uploaded', required: false },
  { id: 8, item: 'Third-party verifier sign-off obtained', required: false },
];

/**
 * Generate CSV export data for AIU report
 */
export function generateAIUCsvExport(
  projectData: {
    projectId: number;
    projectName: string;
    sdgIndicator: string;
    kpiBefore: number;
    kpiAfter: number;
    verificationStatus: string;
    verifier: string | null;
    evidenceLinks: string[];
  },
  aiuResult: AIUResult,
): string {
  const headers = [
    'Project ID',
    'Project Name',
    'SDG Indicator',
    'KPI Before',
    'KPI After',
    'Delta KPI',
    'Attribution Factor',
    'Delta Synerxus',
    'AIU Unique Total',
    'AIU Sessions Total',
    'Volunteer ID',
    'Volunteer Name',
    'Role',
    'Hours',
    'Role Weight',
    'Reliability Multiplier',
    'Volunteer Weight',
    'Weight Percentage',
    'Volunteer AIU Unique',
    'Volunteer AIU Sessions',
    'Volunteer Total AIU',
    'Verification Status',
    'Verifier',
    'Submission Timestamp',
    'Evidence Links',
    'Formula Version',
  ];

  const rows = aiuResult.volunteerAius.map(v => [
    projectData.projectId,
    `"${projectData.projectName}"`,
    `"${projectData.sdgIndicator}"`,
    projectData.kpiBefore,
    projectData.kpiAfter,
    aiuResult.deltaKpi,
    aiuResult.attributionFactor,
    aiuResult.deltaSynerxus,
    aiuResult.aiuUniqueTotal,
    aiuResult.aiuSessionsTotal,
    v.volunteerId,
    `"${v.volunteerName}"`,
    `"${v.role}"`,
    v.hours,
    v.roleWeight,
    v.reliabilityMultiplier,
    v.volunteerWeight,
    v.weightPercentage,
    v.aiuUnique,
    v.aiuSessions,
    v.totalAiu,
    `"${projectData.verificationStatus}"`,
    `"${projectData.verifier || ''}"`,
    `"${aiuResult.calculatedAt.toISOString()}"`,
    `"${projectData.evidenceLinks.join('; ')}"`,
    `"${aiuResult.formulaVersion}"`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Generate JSON export data for AIU report
 */
export function generateAIUJsonExport(
  projectData: {
    projectId: number;
    projectName: string;
    sdgIndicator: string;
    kpiBefore: number;
    kpiAfter: number;
    kpiUnit: string;
    verificationStatus: string;
    verifier: string | null;
    verifiedAt: Date | null;
    evidenceLinks: string[];
    submitter: string;
    submittedAt: Date;
    lastModifiedAt: Date;
  },
  aiuResult: AIUResult,
): AIUJsonExport {
  return {
    projectId: projectData.projectId,
    projectName: projectData.projectName,
    sdgIndicator: projectData.sdgIndicator,
    kpiMetrics: {
      before: projectData.kpiBefore,
      after: projectData.kpiAfter,
      delta: aiuResult.deltaKpi,
      unit: projectData.kpiUnit,
    },
    attribution: {
      factor: aiuResult.attributionFactor,
      deltaSynerxus: aiuResult.deltaSynerxus,
      methodology: 'ΔSynerxus = ΔKPI × AttributionFactor; AIU_i = ΔSynerxus × (w_i / Σw_j)',
    },
    aiuSummary: {
      uniqueTotal: aiuResult.aiuUniqueTotal,
      sessionsTotal: aiuResult.aiuSessionsTotal,
      calculatedAt: aiuResult.calculatedAt.toISOString(),
      formulaVersion: aiuResult.formulaVersion,
    },
    volunteers: aiuResult.volunteerAius.map(v => ({
      id: v.volunteerId,
      name: v.volunteerName,
      role: v.role,
      hours: v.hours,
      weight: {
        role: v.roleWeight,
        reliability: v.reliabilityMultiplier,
        total: v.volunteerWeight,
        percentage: v.weightPercentage,
      },
      aiu: {
        unique: v.aiuUnique,
        sessions: v.aiuSessions,
        total: v.totalAiu,
      },
    })),
    verification: {
      status: projectData.verificationStatus,
      verifier: projectData.verifier,
      verifiedAt: projectData.verifiedAt?.toISOString() || null,
      evidenceLinks: projectData.evidenceLinks,
    },
    audit: {
      submitter: projectData.submitter,
      submittedAt: projectData.submittedAt.toISOString(),
      lastModifiedAt: projectData.lastModifiedAt.toISOString(),
      version: aiuResult.formulaVersion,
    },
  };
}

/**
 * Generate CSV headers for AIU export (for building UI)
 */
export const AIU_CSV_HEADERS = [
  'Project ID',
  'Project Name',
  'SDG Indicator',
  'KPI Before',
  'KPI After',
  'Delta KPI',
  'Attribution Factor',
  'Delta Synerxus',
  'AIU Unique Total',
  'AIU Sessions Total',
  'Volunteer ID',
  'Volunteer Name',
  'Role',
  'Hours',
  'Role Weight',
  'Reliability Multiplier',
  'Volunteer Weight',
  'Weight Percentage',
  'Volunteer AIU Unique',
  'Volunteer AIU Sessions',
  'Volunteer Total AIU',
  'Verification Status',
  'Verifier',
  'Submission Timestamp',
  'Evidence Links',
  'Formula Version',
];

/**
 * Generate downloadable blob for CSV export
 */
export function createAIUCsvBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generate downloadable blob for JSON export
 */
export function createAIUJsonBlob(jsonExport: AIUJsonExport): Blob {
  return new Blob([JSON.stringify(jsonExport, null, 2)], { type: 'application/json' });
}

/**
 * Format AIU export filename with timestamp
 */
export function generateAIUExportFilename(
  projectName: string,
  format: 'csv' | 'json',
  includeTimestamp = true,
): string {
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : '';
  return `aiu_export_${sanitizedName}${timestamp}.${format}`;
}

export default {
  // Original functions
  calculateProjectAIUs,
  generateSampleAIUCalculation,
  formatAIUDisplay,
  generateVolunteerResumeLine,
  generateLinkedInSnippet,
  generateProjectSummary,
  convertLivesImpactedToAIU,
  generateAIUCsvExport,
  generateAIUJsonExport,
  createAIUCsvBlob,
  createAIUJsonBlob,
  generateAIUExportFilename,
  // Original constants
  ROLE_WEIGHTS,
  RELIABILITY_MULTIPLIERS,
  VERIFICATION_MULTIPLIERS,
  AIU_TOOLTIP_TEXT,
  AIU_CSV_HEADERS,
  CSR_VERIFICATION_CHECKLIST,
  // V2: Logarithmic AIU calculation
  AIU_CEILING_CONFIG,
  DEPTH_MULTIPLIERS,
  deriveBaselineMultiplier,
  calculateLogarithmicAIU,
  // V3: Pure Impact AIU calculation (no gameable factors)
  calculatePureImpactAIU,
  // Legacy compatibility
  calculateEnhancedLogarithmicAIU,
};
