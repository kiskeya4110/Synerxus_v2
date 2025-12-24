/**
 * AIU (Attributable Impact Units) Service
 *
 * Provides comprehensive AIU calculations with vertical tracking:
 * - Volunteer level: Individual AIU contributions
 * - Project level: Aggregated project AIUs
 * - Organization level: Organization-wide AIU summaries
 * - CSR level: Corporate Social Responsibility reporting metrics
 *
 * Formulas:
 * - ΔKPI = KPI_after - KPI_before
 * - ΔSynerxus = ΔKPI × AttributionFactor
 * - AIU_i = ΔSynerxus × (w_i / Σw_j)
 * where w_i = roleWeight × hours × reliabilityMultiplier
 */

import { db } from './db';
import {
  projects,
  projectImpacts,
  volunteerActivities,
  projectAssignments,
  users,
  organizations,
  projectAiuSettings,
  volunteerAiuRecords,
  impactMetrics
} from '@shared/schema';
import { eq, and, sql, gte, lte, inArray, desc, isNotNull } from 'drizzle-orm';
import {
  ROLE_WEIGHTS,
  RELIABILITY_MULTIPLIERS,
  VERIFICATION_MULTIPLIERS,
  calculateProjectAIUs,
  calculateLogarithmicAIU,
  calculatePureImpactAIU,
  AIU_CEILING_CONFIG,
  type AIUCalculationInput,
  type VolunteerContribution,
  type AIUResult,
  type VolunteerAIU,
  type LogarithmicAIUResult,
  type PureImpactAIUResult
} from '@shared/aiu-calculations';
import { isValidSdg } from './sdg-utils';

// =====================================================
// Types for AIU Service
// =====================================================

export interface VolunteerAIUSummary {
  volunteerId: number;
  volunteerName: string;
  totalAiu: number;
  aiuUnique: number;
  aiuSessions: number;
  totalHours: number;
  projectCount: number;
  sdgsContributed: number[];
  verificationRate: number; // Percentage of verified AIUs
  projects: {
    projectId: number;
    projectName: string;
    aiu: number;
    hours: number;
    role: string;
    sdgIndicator: string;
  }[];
}

export interface ProjectAIUSummary {
  projectId: number;
  projectName: string;
  organizationId: number | null;
  organizationName: string | null;
  sdgIndicator: string;
  kpiBefore: number;
  kpiAfter: number | null;
  deltaKpi: number;
  attributionFactor: number;
  deltaSynerxus: number;
  totalAiuUnique: number;
  totalAiuSessions: number;
  totalAiu: number;
  volunteerCount: number;
  totalHours: number;
  livesImpacted: number;
  verificationStatus: string;
  volunteers: {
    volunteerId: number;
    volunteerName: string;
    role: string;
    hours: number;
    aiu: number;
    weightPercentage: number;
  }[];
}

export interface OrganizationAIUSummary {
  organizationId: number;
  organizationName: string;
  totalAiu: number;
  aiuUnique: number;
  aiuSessions: number;
  projectCount: number;
  volunteerCount: number;
  totalHours: number;
  livesImpacted: number;
  sdgsCovered: number[];
  verificationRate: number;
  projects: {
    projectId: number;
    projectName: string;
    aiu: number;
    sdgIndicator: string;
    verificationStatus: string;
  }[];
}

export interface CSRAIUSummary {
  reportingPeriod: string;
  totalOrganizations: number;
  totalProjects: number;
  totalVolunteers: number;
  totalAiu: number;
  aiuUnique: number;
  aiuSessions: number;
  totalHours: number;
  livesImpacted: number;
  sdgBreakdown: {
    sdg: number;
    sdgName: string;
    aiu: number;
    projects: number;
    volunteers: number;
  }[];
  organizationBreakdown: {
    organizationId: number;
    organizationName: string;
    aiu: number;
    projects: number;
  }[];
  verificationMetrics: {
    verified: number;
    pending: number;
    selfReported: number;
    verificationRate: number;
  };
}

// SDG Names for reference
const SDG_NAMES: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health and Well-being",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water and Sanitation",
  7: "Affordable and Clean Energy",
  8: "Decent Work and Economic Growth",
  9: "Industry, Innovation and Infrastructure",
  10: "Reduced Inequalities",
  11: "Sustainable Cities and Communities",
  12: "Responsible Consumption and Production",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace, Justice and Strong Institutions",
  17: "Partnerships for the Goals"
};

// =====================================================
// Core AIU Calculation Functions
// =====================================================

/**
 * Calculate AIU for a specific project with all its volunteers
 * @param projectId - The project ID to calculate AIU for
 * @param useFullRoleWeights - If true, use 100% role weights (for organization reporting).
 *                             If false/undefined, use volunteer contribution percentages.
 */
export async function calculateProjectAIU(projectId: number, useFullRoleWeights?: boolean): Promise<ProjectAIUSummary | null> {
  // Fetch project with AIU settings
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return null;

  // Fetch AIU settings for the project (or use defaults)
  const [aiuSettings] = await db
    .select()
    .from(projectAiuSettings)
    .where(eq(projectAiuSettings.projectId, projectId))
    .orderBy(desc(projectAiuSettings.createdAt))
    .limit(1);

  // Fetch all volunteer activities for this project
  const activities = await db
    .select({
      userId: volunteerActivities.userId,
      hours: volunteerActivities.hours,
      date: volunteerActivities.date,
    })
    .from(volunteerActivities)
    .where(eq(volunteerActivities.projectId, projectId));

  // Fetch project assignments to get roles
  const assignments = await db
    .select({
      volunteerId: projectAssignments.volunteerId,
      role: projectAssignments.role,
      status: projectAssignments.status,
    })
    .from(projectAssignments)
    .where(eq(projectAssignments.projectId, projectId));

  // Fetch impacts for verification status
  const impacts = await db
    .select({
      userId: projectImpacts.userId,
      value: projectImpacts.value,
      verificationStatus: projectImpacts.verificationStatus,
    })
    .from(projectImpacts)
    .where(eq(projectImpacts.projectId, projectId));

  // Fetch volunteer details
  const volunteerIdSet = new Set([
    ...activities.map(a => a.userId).filter(Boolean),
    ...assignments.map(a => a.volunteerId).filter(Boolean)
  ]);
  const volunteerIds = Array.from(volunteerIdSet);

  const volunteerDetails = volunteerIds.length > 0
    ? await db.select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, volunteerIds as number[]))
    : [];

  const volunteerMap = new Map(volunteerDetails.map(v => [v.id, v.displayName || `Volunteer ${v.id}`]));

  // Aggregate hours per volunteer
  const volunteerHours: Map<number, number> = new Map();
  activities.forEach(a => {
    if (a.userId) {
      volunteerHours.set(a.userId, (volunteerHours.get(a.userId) || 0) + (a.hours || 0));
    }
  });

  // Get role per volunteer
  const volunteerRoles: Map<number, string> = new Map();
  assignments.forEach(a => {
    if (a.volunteerId && a.role) {
      volunteerRoles.set(a.volunteerId, a.role);
    }
  });

  // Get verification status per volunteer
  const volunteerVerification: Map<number, string> = new Map();
  impacts.forEach(i => {
    if (i.userId) {
      // Use the best verification status
      const current = volunteerVerification.get(i.userId);
      if (!current || (i.verificationStatus === 'verified' || i.verificationStatus === 'approved')) {
        volunteerVerification.set(i.userId, i.verificationStatus || 'pending');
      }
    }
  });

  // Build volunteer contributions
  const volunteerContributions: VolunteerContribution[] = [];
  volunteerHours.forEach((hours, volunteerId) => {
    volunteerContributions.push({
      volunteerId,
      volunteerName: volunteerMap.get(volunteerId) || `Volunteer ${volunteerId}`,
      role: volunteerRoles.get(volunteerId) || 'support',
      hours,
      reliabilityStatus: volunteerVerification.get(volunteerId) || 'pending',
      sessionsCount: Math.ceil(hours / 2), // Default: 1 session per 2 hours
    });
  });

  // Set up AIU calculation input from projectAiuSettings table
  const kpiBefore = aiuSettings?.kpiBefore ?? 0;
  const kpiAfter = aiuSettings?.kpiAfter ?? (kpiBefore + 0.05); // Default 5% improvement if not set
  const attributionFactor = aiuSettings?.attributionFactor ?? 0.2; // Default 20% attribution
  const sdgIndicator = aiuSettings?.sdgIndicator || `SDG ${project.primarySdg || project.sdgGoals?.[0] || 4}.1.1`;

  // Extract custom role contribution percentages from project's volunteerRoles if set
  //
  // The calculation uses two levels of contribution:
  // 1. totalVolunteerContribution: The total % of project impact attributed to ALL volunteers
  //    (e.g., 30% means volunteers collectively get 30% of project impact)
  // 2. volunteerRoles.contributionPercent: How the volunteer share is distributed among roles
  //    (e.g., lead gets 40% of the 30% = 12% of total project impact)
  //
  // For organization reporting (useFullRoleWeights=true): Use 100% role weights
  //   - Organizations get full credit for the project's impact
  // For volunteer reporting (useFullRoleWeights=false/undefined): Use contribution percentages
  //   - Volunteers only get credit for their share of the role's work
  let volunteerContributionPercents: Record<string, number> | undefined;
  if (!useFullRoleWeights && project.volunteerRoles && Array.isArray(project.volunteerRoles) && project.volunteerRoles.length > 0) {
    volunteerContributionPercents = {};
    // Get the total volunteer contribution (default to 100% if not set for backwards compatibility)
    const totalVolunteerPct = (project.totalVolunteerContribution ?? 100) / 100;

    (project.volunteerRoles as Array<{ role: string; contributionPercent: number }>).forEach(vr => {
      // Calculate effective contribution for this role:
      // effectivePercent = totalVolunteerContribution × roleContributionPercent
      // Example: totalVolunteerContribution=30%, role contributionPercent=40%
      // effectivePercent = 0.30 × 0.40 = 0.12 (12% of total project impact)
      const roleShareOfVolunteerPct = (vr.contributionPercent || 0) / 100;
      volunteerContributionPercents![vr.role] = totalVolunteerPct * roleShareOfVolunteerPct;
    });
  }
  // When useFullRoleWeights is true, volunteerContributionPercents remains undefined
  // This causes calculateProjectAIUs to use full base role weights (100% credit)

  const aiuInput: AIUCalculationInput = {
    kpiBefore,
    kpiAfter,
    attributionFactor,
    volunteers: volunteerContributions,
  };

  // Calculate AIUs:
  // - With contribution percentages for volunteer reporting (reduced weights)
  // - Without contribution percentages for organization reporting (full weights = 100% credit)
  const aiuResult = calculateProjectAIUs(aiuInput, volunteerContributionPercents);

  // Calculate lives impacted (from impacts table)
  const verifiedLivesImpacted = impacts
    .filter(i => i.verificationStatus === 'verified' || i.verificationStatus === 'approved')
    .reduce((sum, i) => sum + (i.value || 0), 0);
  const pendingLivesImpacted = impacts
    .filter(i => i.verificationStatus === 'pending' || i.verificationStatus === 'self_reported' || !i.verificationStatus)
    .reduce((sum, i) => sum + (i.value || 0), 0);
  const livesImpacted = verifiedLivesImpacted + Math.round(pendingLivesImpacted * 0.7);

  // Fetch organization name
  let organizationName: string | null = null;
  if (project.organizationId) {
    const [org] = await db.select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, project.organizationId));
    organizationName = org?.name || null;
  }

  return {
    projectId: project.id,
    projectName: project.name,
    organizationId: project.organizationId,
    organizationName,
    sdgIndicator,
    kpiBefore,
    kpiAfter,
    deltaKpi: aiuResult.deltaKpi,
    attributionFactor,
    deltaSynerxus: aiuResult.deltaSynerxus,
    totalAiuUnique: aiuResult.aiuUniqueTotal,
    totalAiuSessions: aiuResult.aiuSessionsTotal,
    totalAiu: aiuResult.aiuUniqueTotal + aiuResult.aiuSessionsTotal * 0.1,
    volunteerCount: volunteerContributions.length,
    totalHours: volunteerContributions.reduce((sum, v) => sum + v.hours, 0),
    livesImpacted,
    verificationStatus: aiuSettings?.verificationStatus || 'pending',
    volunteers: aiuResult.volunteerAius.map(v => ({
      volunteerId: v.volunteerId,
      volunteerName: v.volunteerName,
      role: v.role,
      hours: v.hours,
      aiu: v.totalAiu,
      weightPercentage: v.weightPercentage,
    })),
  };
}

/**
 * Calculate AIU summary for a specific volunteer across all projects
 * NOW USES V3 PURE IMPACT FORMULA - focuses on real outcomes, no gameable factors
 */
export async function calculateVolunteerAIU(volunteerId: number): Promise<VolunteerAIUSummary | null> {
  // Use V3 Pure Impact calculation for accurate, outcome-focused AIU
  const pureImpactResult = await calculateVolunteerPureImpactAIU(volunteerId);
  if (!pureImpactResult) return null;

  // Fetch volunteer details for additional data
  const [volunteer] = await db.select().from(users).where(eq(users.id, volunteerId));
  if (!volunteer) return null;

  // Fetch all project assignments for this volunteer (for roles and verification tracking)
  const assignments = await db
    .select({
      projectId: projectAssignments.projectId,
      role: projectAssignments.role,
    })
    .from(projectAssignments)
    .where(and(
      eq(projectAssignments.volunteerId, volunteerId),
      sql`${projectAssignments.status} NOT IN ('declined', 'pending')`
    ));

  // Build role map from assignments
  const roleMap = new Map<number, string>();
  assignments.forEach(a => {
    if (a.projectId && a.role) {
      roleMap.set(a.projectId, a.role);
    }
  });

  // Calculate verification rate based on V3 results
  let verifiedCount = 0;
  let totalCount = 0;
  pureImpactResult.projects.forEach(p => {
    totalCount++;
    if (p.impactBreakdown.verificationStatus === 'verified' ||
        p.impactBreakdown.verificationStatus === 'approved') {
      verifiedCount++;
    }
  });
  const verificationRate = totalCount > 0
    ? Math.min(Math.round((verifiedCount / totalCount) * 100), 100)
    : 0;

  // Map V3 project results to V1-compatible format
  const projectAius = pureImpactResult.projects.map(p => ({
    projectId: p.projectId,
    projectName: p.projectName,
    aiu: p.impactBreakdown.aiu,
    hours: p.impactBreakdown.hours,
    role: roleMap.get(p.projectId) || p.impactBreakdown.role || 'support',
    sdgIndicator: `SDG ${pureImpactResult.sdgsContributed[0] || 4}.1.1`,
  }));

  // Calculate sessions estimate (1 session per 2 hours)
  const totalSessions = Math.ceil(pureImpactResult.totalHours / 2);

  return {
    volunteerId,
    volunteerName: pureImpactResult.volunteerName,
    totalAiu: pureImpactResult.totalAiu,
    aiuUnique: pureImpactResult.totalAiu, // V3 doesn't distinguish unique vs sessions
    aiuSessions: totalSessions,
    totalHours: pureImpactResult.totalHours,
    projectCount: pureImpactResult.projectCount,
    sdgsContributed: pureImpactResult.sdgsContributed,
    verificationRate,
    projects: projectAius,
  };
}

/**
 * Calculate AIU summary for an organization across all projects
 *
 * ORGANIZATION AIU FORMULA:
 * Organization AIU = Organization Direct Share + Sum of Volunteer AIUs
 *
 * Where:
 * - Organization Direct Share = Project Total AIU × (1 - attributionFactor)
 *   This is the portion of project impact attributed to the organization's
 *   management, resources, and infrastructure.
 *
 * - Sum of Volunteer AIUs = Total of all individual volunteer AIUs on the project
 *   Organizations get full credit for enabling and facilitating volunteer work.
 *
 * This ensures organizations are recognized for both:
 * 1. Their direct organizational contribution (remaining share)
 * 2. The volunteer impact they enabled (sum of volunteer work)
 */
export interface OrganizationAIUFilters {
  projectId?: number;
  startDate?: Date;
  endDate?: Date;
  sdgGoal?: number;
}

export async function calculateOrganizationAIU(
  organizationId: number,
  filters?: OrganizationAIUFilters
): Promise<OrganizationAIUSummary | null> {
  // Fetch organization
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
  if (!org) return null;

  // Fetch all projects for this organization
  let orgProjects = await db
    .select({ id: projects.id, name: projects.name, sdgGoals: projects.sdgGoals, primarySdg: projects.primarySdg })
    .from(projects)
    .where(eq(projects.organizationId, organizationId));

  // Apply project filter
  if (filters?.projectId) {
    orgProjects = orgProjects.filter(p => p.id === filters.projectId);
  }

  // Apply SDG filter
  if (filters?.sdgGoal) {
    const sdgGoalFilter = filters.sdgGoal;
    orgProjects = orgProjects.filter(p =>
      p.primarySdg === sdgGoalFilter ||
      (p.sdgGoals && Array.isArray(p.sdgGoals) && p.sdgGoals.includes(sdgGoalFilter))
    );
  }

  if (orgProjects.length === 0) {
    return {
      organizationId,
      organizationName: org.name,
      totalAiu: 0,
      aiuUnique: 0,
      aiuSessions: 0,
      projectCount: 0,
      volunteerCount: 0,
      totalHours: 0,
      livesImpacted: 0,
      sdgsCovered: [],
      verificationRate: 0,
      projects: [],
    };
  }

  const orgProjectIds = orgProjects.map(p => p.id);

  // PERFORMANCE: Batch fetch all data needed for organization's projects
  const [allOrgImpacts, allOrgActivities, orgAssignments, orgAiuSettings] = await Promise.all([
    db.select().from(projectImpacts).where(inArray(projectImpacts.projectId, orgProjectIds)),
    db.select().from(volunteerActivities).where(inArray(volunteerActivities.projectId, orgProjectIds)),
    db.select().from(projectAssignments).where(inArray(projectAssignments.projectId, orgProjectIds)),
    db.select().from(projectAiuSettings).where(inArray(projectAiuSettings.projectId, orgProjectIds)),
  ]);

  // Apply time period filter to activities and impacts
  const startDate = filters?.startDate || new Date(0);
  const endDate = filters?.endDate || new Date();

  const orgActivities = allOrgActivities.filter(a => {
    if (!a.date) return true; // Include activities without dates
    const activityDate = new Date(a.date);
    return activityDate >= startDate && activityDate <= endDate;
  });

  const orgImpacts = allOrgImpacts.filter(i => {
    if (!i.date) return true; // Include impacts without dates
    const impactDate = new Date(i.date);
    return impactDate >= startDate && impactDate <= endDate;
  });

  // Create lookup maps
  const settingsMap = new Map(orgAiuSettings.map(s => [s.projectId, s]));

  // Aggregate hours per project and per volunteer
  const projectHoursMap = new Map<number, number>();
  const volunteerHoursPerProject = new Map<number, Map<number, number>>(); // projectId -> volunteerId -> hours

  orgActivities.forEach(a => {
    if (a.projectId) {
      // Total hours per project
      projectHoursMap.set(a.projectId, (projectHoursMap.get(a.projectId) || 0) + (a.hours || 0));

      // Hours per volunteer per project
      if (a.userId) {
        if (!volunteerHoursPerProject.has(a.projectId)) {
          volunteerHoursPerProject.set(a.projectId, new Map());
        }
        const projectVolunteers = volunteerHoursPerProject.get(a.projectId)!;
        projectVolunteers.set(a.userId, (projectVolunteers.get(a.userId) || 0) + (a.hours || 0));
      }
    }
  });

  // Track unique volunteers and their roles per project
  const volunteerIds = new Set<number>();
  const volunteerRolesPerProject = new Map<number, Map<number, string>>(); // projectId -> volunteerId -> role

  orgAssignments.forEach(pa => {
    if (pa.volunteerId && pa.status !== 'declined') {
      volunteerIds.add(pa.volunteerId);

      if (pa.projectId) {
        if (!volunteerRolesPerProject.has(pa.projectId)) {
          volunteerRolesPerProject.set(pa.projectId, new Map());
        }
        volunteerRolesPerProject.get(pa.projectId)!.set(pa.volunteerId, pa.role || 'support');
      }
    }
  });

  // Calculate AIU for each project
  const projectSummaries: {
    projectId: number;
    projectName: string;
    aiu: number;
    orgDirectShare: number;
    volunteerAiuSum: number;
    sdgIndicator: string;
    verificationStatus: string;
  }[] = [];

  let totalOrgDirectShare = 0;
  let totalVolunteerAiuSum = 0;
  let totalHours = 0;
  let totalLivesImpacted = 0;
  const sdgsSet = new Set<number>();

  // Verification tracking
  let verifiedCount = 0;
  let totalImpactCount = 0;

  for (const project of orgProjects) {
    // Get project settings (attribution factor)
    const settings = settingsMap.get(project.id);
    const attributionFactor = settings?.attributionFactor ?? 0.2; // Default 20% to volunteers
    const expectedBeneficiaries = settings?.kpiAfter || 100;

    // Get impacts for this project (exclude duplicates)
    const projectImpactsList = orgImpacts.filter(i => i.projectId === project.id && !i.isDuplicated);

    // Sum lives impacted for this project
    const livesImpacted = projectImpactsList.reduce((sum, i) => sum + (i.value || 0), 0);

    // Get hours for this project
    const hours = projectHoursMap.get(project.id) || 0;

    // Get volunteer roles and hours for this project
    const projectVolunteerHours = volunteerHoursPerProject.get(project.id) || new Map();
    const projectVolunteerRoles = volunteerRolesPerProject.get(project.id) || new Map();

    // Determine verification status from impacts
    const verificationStatus = projectImpactsList[0]?.verificationStatus || 'pending';
    const outcomeType = projectImpactsList[0]?.outcomeType || 'individual';

    // Get activity dates for streak calculation
    const projectActivityDates = orgActivities
      .filter(a => a.projectId === project.id && a.date)
      .map(a => new Date(a.date));

    // STEP 1: Calculate total project AIU (full potential impact)
    // This is the BASE from which volunteer and org shares are derived
    let totalProjectAiu = 0;
    if (livesImpacted > 0) {
      const aiuResult = calculatePureImpactAIU({
        livesImpacted,
        outcomeType,
        role: 'lead', // Full project potential uses lead role
        verificationStatus,
        hours,
        projectExpectedBeneficiaries: expectedBeneficiaries,
        activityDates: projectActivityDates,
      });
      totalProjectAiu = aiuResult.aiu;
    }

    // STEP 2: Calculate volunteer share of project AIU
    // Volunteers collectively get attributionFactor % of the total project AIU
    // This is distributed among volunteers proportionally by hours
    const totalVolunteerAllocation = totalProjectAiu * attributionFactor; // e.g., 20% of project goes to volunteers

    let volunteerAiuSum = 0;
    const volunteerCount = projectVolunteerHours.size;

    if (volunteerCount > 0 && totalVolunteerAllocation > 0) {
      const totalProjectHours = hours || 1;

      for (const [volunteerId, volunteerHours] of Array.from(projectVolunteerHours.entries())) {
        // Each volunteer's share is proportional to their hours contribution
        const hoursRatio = volunteerHours / totalProjectHours;
        const volunteerShare = totalVolunteerAllocation * hoursRatio;
        volunteerAiuSum += volunteerShare;
      }
    }

    // STEP 3: Calculate organization's direct share
    // Organization gets (1 - attributionFactor) % of total project AIU
    // e.g., if attributionFactor = 0.2, org gets 80% for management/resources
    const orgDirectShare = totalProjectAiu * (1 - attributionFactor);

    // STEP 4: Total organization AIU for this project
    // = Organization direct share + Volunteer share
    // This should equal totalProjectAiu (org is credited for enabling all impact)
    const projectOrgAiu = orgDirectShare + volunteerAiuSum;

    // Track SDGs
    if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
      project.sdgGoals.forEach((goal: unknown) => {
        if (isValidSdg(goal)) {
          sdgsSet.add(goal);
        }
      });
    }
    if (project.primarySdg) {
      sdgsSet.add(project.primarySdg);
    }

    // Determine project verification status
    const projectVerificationStatus = projectImpactsList.some(i =>
      i.verificationStatus === 'verified' || i.verificationStatus === 'approved'
    ) ? 'verified' : 'pending';

    // Track verification
    totalImpactCount++;
    if (projectVerificationStatus === 'verified') {
      verifiedCount++;
    }

    projectSummaries.push({
      projectId: project.id,
      projectName: project.name,
      aiu: Math.round(projectOrgAiu * 100) / 100,
      orgDirectShare: Math.round(orgDirectShare * 100) / 100,
      volunteerAiuSum: Math.round(volunteerAiuSum * 100) / 100,
      sdgIndicator: `SDG ${project.primarySdg || project.sdgGoals?.[0] || 4}.1.1`,
      verificationStatus: projectVerificationStatus,
    });

    totalOrgDirectShare += orgDirectShare;
    totalVolunteerAiuSum += volunteerAiuSum;
    totalHours += hours;
    totalLivesImpacted += livesImpacted;
  }

  // Total organization AIU = Direct share + Volunteer sum
  let totalAiu = totalOrgDirectShare + totalVolunteerAiuSum;

  // Apply global lifetime ceiling
  const { globalMaxAiu } = AIU_CEILING_CONFIG;
  totalAiu = Math.min(globalMaxAiu, totalAiu);

  // Calculate verification rate
  const verificationRate = totalImpactCount > 0
    ? Math.min(Math.round((verifiedCount / totalImpactCount) * 100), 100)
    : 0;

  // Calculate sessions estimate (1 session per 2 hours)
  const totalSessions = Math.ceil(totalHours / 2);

  return {
    organizationId,
    organizationName: org.name,
    totalAiu: Math.round(totalAiu * 100) / 100,
    aiuUnique: Math.round(totalOrgDirectShare * 100) / 100, // Organization's direct share
    aiuSessions: totalSessions,
    projectCount: projectSummaries.length,
    volunteerCount: volunteerIds.size,
    totalHours: Math.round(totalHours),
    livesImpacted: totalLivesImpacted,
    sdgsCovered: Array.from(sdgsSet).sort((a, b) => a - b),
    verificationRate,
    projects: projectSummaries,
  };
}

/**
 * Generate comprehensive CSR AIU report
 * CSR (Corporate Social Responsibility) reports use full role weights (100% credit)
 * as this is organization-level reporting
 */
export async function generateCSRAIUReport(
  reportingPeriod?: { start: Date; end: Date }
): Promise<CSRAIUSummary> {
  // Fetch all organizations
  const allOrgs = await db.select().from(organizations);

  // Fetch all projects
  let projectQuery = db.select().from(projects);
  const allProjects = await projectQuery;

  // Initialize tracking
  const sdgBreakdown: Map<number, { aiu: number; projects: Set<number>; volunteers: Set<number> }> = new Map();
  const orgBreakdown: Map<number, { name: string; aiu: number; projects: number }> = new Map();
  allOrgs.forEach(org => {
    orgBreakdown.set(org.id, { name: org.name, aiu: 0, projects: 0 });
  });

  let totalAiuUnique = 0;
  let totalAiuSessions = 0;
  let totalHours = 0;
  let livesImpacted = 0;
  let verifiedCount = 0;
  let pendingCount = 0;
  let selfReportedCount = 0;
  const volunteerIds = new Set<number>();

  // Calculate AIU for each project using full role weights (100% credit for CSR reporting)
  for (const project of allProjects) {
    const projectSummary = await calculateProjectAIU(project.id, true);
    if (!projectSummary) continue;

    totalAiuUnique += projectSummary.totalAiuUnique;
    totalAiuSessions += projectSummary.totalAiuSessions;
    totalHours += projectSummary.totalHours;
    livesImpacted += projectSummary.livesImpacted;

    // Track volunteers
    projectSummary.volunteers.forEach(v => volunteerIds.add(v.volunteerId));

    // Track verification
    if (projectSummary.verificationStatus === 'verified') verifiedCount++;
    else if (projectSummary.verificationStatus === 'pending') pendingCount++;
    else selfReportedCount++;

    // Track SDGs
    const sdgMatch = projectSummary.sdgIndicator.match(/SDG (\d+)/);
    if (sdgMatch) {
      const sdgNum = parseInt(sdgMatch[1]);
      if (!sdgBreakdown.has(sdgNum)) {
        sdgBreakdown.set(sdgNum, { aiu: 0, projects: new Set(), volunteers: new Set() });
      }
      const sdgData = sdgBreakdown.get(sdgNum)!;
      sdgData.aiu += projectSummary.totalAiu;
      sdgData.projects.add(project.id);
      projectSummary.volunteers.forEach(v => sdgData.volunteers.add(v.volunteerId));
    }

    // Track organization
    if (project.organizationId && orgBreakdown.has(project.organizationId)) {
      const orgData = orgBreakdown.get(project.organizationId)!;
      orgData.aiu += projectSummary.totalAiu;
      orgData.projects++;
    }
  }

  const totalVerified = verifiedCount + pendingCount + selfReportedCount;

  return {
    reportingPeriod: reportingPeriod
      ? `${reportingPeriod.start.toISOString().split('T')[0]} to ${reportingPeriod.end.toISOString().split('T')[0]}`
      : 'All Time',
    totalOrganizations: allOrgs.length,
    totalProjects: allProjects.length,
    totalVolunteers: volunteerIds.size,
    totalAiu: parseFloat((totalAiuUnique + totalAiuSessions * 0.1).toFixed(10)),
    aiuUnique: parseFloat(totalAiuUnique.toFixed(10)),
    aiuSessions: totalAiuSessions,
    totalHours: Math.round(totalHours),
    livesImpacted,
    sdgBreakdown: Array.from(sdgBreakdown.entries())
      .map(([sdg, data]) => ({
        sdg,
        sdgName: SDG_NAMES[sdg] || `SDG ${sdg}`,
        aiu: parseFloat(data.aiu.toFixed(10)),
        projects: data.projects.size,
        volunteers: data.volunteers.size,
      }))
      .sort((a, b) => b.aiu - a.aiu),
    organizationBreakdown: Array.from(orgBreakdown.entries())
      .map(([orgId, data]) => ({
        organizationId: orgId,
        organizationName: data.name,
        aiu: parseFloat(data.aiu.toFixed(10)),
        projects: data.projects,
      }))
      .filter(o => o.aiu > 0 || o.projects > 0)
      .sort((a, b) => b.aiu - a.aiu),
    verificationMetrics: {
      verified: verifiedCount,
      pending: pendingCount,
      selfReported: selfReportedCount,
      // Always cap at 100% for safety
      verificationRate: totalVerified > 0 ? Math.min(Math.round((verifiedCount / totalVerified) * 100), 100) : 0,
    },
  };
}

/**
 * Get quick AIU stats for dashboard display
 */
export async function getVolunteerQuickAIUStats(volunteerId: number): Promise<{
  totalAiu: number;
  aiuThisMonth: number;
  rank: string;
  trend: 'up' | 'down' | 'stable';
}> {
  const summary = await calculateVolunteerAIU(volunteerId);
  if (!summary) {
    return { totalAiu: 0, aiuThisMonth: 0, rank: 'Newcomer', trend: 'stable' };
  }

  // Determine rank based on total AIU
  let rank = 'Newcomer';
  if (summary.totalAiu >= 100) rank = 'Impact Champion';
  else if (summary.totalAiu >= 50) rank = 'Change Maker';
  else if (summary.totalAiu >= 20) rank = 'Active Contributor';
  else if (summary.totalAiu >= 5) rank = 'Growing Impact';

  // Estimate this month's AIU (simplified - would need date filtering for accuracy)
  const aiuThisMonth = parseFloat((summary.totalAiu * 0.2).toFixed(10)); // Rough estimate

  return {
    totalAiu: summary.totalAiu,
    aiuThisMonth,
    rank,
    trend: summary.totalAiu > 5 ? 'up' : 'stable',
  };
}

/**
 * Store calculated AIU records for a volunteer
 */
export async function storeVolunteerAIURecord(
  projectId: number,
  volunteerId: number,
  aiuData: VolunteerAIU,
  aiuSettingsId?: number
): Promise<void> {
  await db.insert(volunteerAiuRecords).values({
    projectId,
    volunteerId,
    aiuSettingsId,
    role: aiuData.role,
    hoursContributed: aiuData.hours,
    sessionsCount: aiuData.aiuSessions,
    roleWeight: aiuData.roleWeight,
    reliabilityMultiplier: aiuData.reliabilityMultiplier,
    volunteerWeight: aiuData.volunteerWeight,
    weightPercentage: aiuData.weightPercentage,
    aiuUnique: aiuData.aiuUnique,
    aiuSessions: aiuData.aiuSessions,
    totalAiu: aiuData.totalAiu,
    verificationStatus: 'pending',
    calculatedAt: new Date(),
    formulaVersion: '1.0.0',
  });
}

// =====================================================
// V2: Logarithmic AIU Calculation (Hours-Scaled)
// =====================================================

/**
 * Result type for V2 logarithmic AIU calculation
 */
export interface VolunteerLogarithmicAIUSummary {
  volunteerId: number;
  volunteerName: string;
  totalAiu: number;
  percentOfLifetimeCeiling: number;
  totalHours: number;
  totalLivesImpacted: number;
  projectCount: number;
  sdgsContributed: number[];
  projects: {
    projectId: number;
    projectName: string;
    impactBreakdown: {
      livesImpacted: number;
      outcomeType: string;
      role: string;
      verificationStatus: string;
      hours: number;
      baseScore: number;
      hoursFactor: number;
      effectiveScore: number;
      k: number;
      aiu: number;
      percentOfProjectCeiling: number;
    };
  }[];
}

/**
 * Calculate logarithmic AIU for a volunteer using V2 formula
 *
 * This function uses the new hours-scaled logarithmic formula:
 * AIU = min(MaxAIU, k × ln(1 + EffectiveScore))
 *
 * Where k is derived from project's expected beneficiaries (kpiAfter)
 * and EffectiveScore = LivesImpacted × DepthMultiplier × RoleWeight × ReliabilityMultiplier × HoursFactor
 *
 * @param volunteerId - The volunteer ID to calculate AIU for
 * @returns Detailed logarithmic AIU breakdown
 */
export async function calculateVolunteerLogarithmicAIU(volunteerId: number): Promise<VolunteerLogarithmicAIUSummary | null> {
  // Fetch volunteer details
  const [volunteer] = await db.select().from(users).where(eq(users.id, volunteerId));
  if (!volunteer) return null;

  // Fetch all impacts logged by this volunteer
  const impacts = await db
    .select()
    .from(projectImpacts)
    .where(eq(projectImpacts.userId, volunteerId));

  // Fetch all activities for hours
  const activities = await db
    .select()
    .from(volunteerActivities)
    .where(eq(volunteerActivities.userId, volunteerId));

  // Aggregate hours per project
  const projectHoursMap: Map<number, number> = new Map();
  activities.forEach(a => {
    if (a.projectId) {
      projectHoursMap.set(a.projectId, (projectHoursMap.get(a.projectId) || 0) + (a.hours || 0));
    }
  });

  // Get unique project IDs from impacts
  const projectIdSet = new Set(impacts.map(i => i.projectId).filter(Boolean));
  const projectIds = Array.from(projectIdSet) as number[];

  if (projectIds.length === 0) {
    return {
      volunteerId,
      volunteerName: volunteer.displayName || `Volunteer ${volunteerId}`,
      totalAiu: 0,
      percentOfLifetimeCeiling: 0,
      totalHours: 0,
      totalLivesImpacted: 0,
      projectCount: 0,
      sdgsContributed: [],
      projects: [],
    };
  }

  // Fetch project details and AIU settings
  const projectDetails = await db
    .select()
    .from(projects)
    .where(inArray(projects.id, projectIds));

  const projectSettingsList = await db
    .select()
    .from(projectAiuSettings)
    .where(inArray(projectAiuSettings.projectId, projectIds));

  // Create maps for quick lookup
  const projectMap = new Map(projectDetails.map(p => [p.id, p]));
  const settingsMap = new Map(projectSettingsList.map(s => [s.projectId, s]));

  const projectResults: VolunteerLogarithmicAIUSummary['projects'] = [];
  let totalAiu = 0;
  let totalHours = 0;
  let totalLivesImpacted = 0;
  const sdgsSet = new Set<number>();

  // Calculate AIU for each project's impacts
  for (const projectId of projectIds) {
    const project = projectMap.get(projectId);
    const settings = settingsMap.get(projectId);
    if (!project) continue;

    // Get volunteer's impacts for this project
    const projectImpactsList = impacts.filter(i => i.projectId === projectId && !i.isDuplicated);

    // Sum lives impacted for this project
    const livesImpacted = projectImpactsList.reduce((sum, i) => sum + (i.value || 0), 0);
    if (livesImpacted === 0) continue;

    // Get hours for this project
    const hours = projectHoursMap.get(projectId) || 0;

    // Get expected beneficiaries from settings (or use default)
    const expectedBeneficiaries = settings?.kpiAfter || 100;

    // Use the most common outcomeType and role from impacts
    const outcomeType = projectImpactsList[0]?.outcomeType || 'individual';
    const role = projectImpactsList[0]?.role || 'support';
    const verificationStatus = projectImpactsList[0]?.verificationStatus || 'pending';

    // Calculate logarithmic AIU
    const aiuResult = calculateLogarithmicAIU({
      livesImpacted,
      outcomeType,
      role,
      verificationStatus,
      hours,
      projectExpectedBeneficiaries: expectedBeneficiaries,
    });

    // Track SDGs
    if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
      project.sdgGoals.forEach((goal: unknown) => {
        if (isValidSdg(goal)) {
          sdgsSet.add(goal);
        }
      });
    }
    if (project.primarySdg) {
      sdgsSet.add(project.primarySdg);
    }

    projectResults.push({
      projectId,
      projectName: project.name,
      impactBreakdown: {
        livesImpacted,
        outcomeType,
        role,
        verificationStatus,
        hours,
        baseScore: aiuResult.baseScore,
        hoursFactor: aiuResult.hoursFactor,
        effectiveScore: aiuResult.effectiveScore,
        k: aiuResult.k,
        aiu: aiuResult.aiu,
        percentOfProjectCeiling: aiuResult.percentOfCeiling,
      },
    });

    totalAiu += aiuResult.aiu;
    totalHours += hours;
    totalLivesImpacted += livesImpacted;
  }

  // Apply global lifetime ceiling
  const { globalMaxAiu } = AIU_CEILING_CONFIG;
  totalAiu = Math.min(globalMaxAiu, totalAiu);
  const percentOfLifetimeCeiling = Math.round((totalAiu / globalMaxAiu) * 1000) / 10;

  return {
    volunteerId,
    volunteerName: volunteer.displayName || `Volunteer ${volunteerId}`,
    totalAiu: Math.round(totalAiu * 100) / 100,
    percentOfLifetimeCeiling,
    totalHours: Math.round(totalHours),
    totalLivesImpacted,
    projectCount: projectResults.length,
    sdgsContributed: Array.from(sdgsSet).sort((a, b) => a - b),
    projects: projectResults,
  };
}

/**
 * Pure Impact AIU Summary (V3)
 * Clean, outcome-focused AIU calculation with no gameable factors
 */
export interface VolunteerPureImpactAIUSummary {
  volunteerId: number;
  volunteerName: string;
  totalAiu: number;
  percentOfLifetimeCeiling: number;
  totalHours: number;
  totalLivesImpacted: number;
  projectCount: number;
  sdgsContributed: number[];
  projects: {
    projectId: number;
    projectName: string;
    impactBreakdown: PureImpactAIUResult & {
      outcomeType: string;
      role: string;
      verificationStatus: string;
      hours: number;
    };
  }[];
}

/**
 * Calculate Pure Impact AIU for a volunteer (V3)
 *
 * DESIGN PRINCIPLES:
 * 1. Only real outcomes matter - lives impacted, depth of change
 * 2. Small consistency bonus (max 10%) for sustained engagement over months
 * 3. Verification comes from organizations, not self-reporting
 * 4. Past impact is still impact - no time decay
 *
 * Performance optimized with parallel queries using Promise.all()
 *
 * @param volunteerId - The volunteer ID to calculate AIU for
 * @returns Pure impact calculation breakdown
 */
export async function calculateVolunteerPureImpactAIU(volunteerId: number): Promise<VolunteerPureImpactAIUSummary | null> {
  // Fetch volunteer details
  const [volunteer] = await db.select().from(users).where(eq(users.id, volunteerId));
  if (!volunteer) return null;

  // PERFORMANCE: Parallel queries
  const [impacts, activities] = await Promise.all([
    db.select().from(projectImpacts).where(eq(projectImpacts.userId, volunteerId)),
    db.select().from(volunteerActivities).where(eq(volunteerActivities.userId, volunteerId))
  ]);

  // Aggregate hours per project
  const projectHoursMap: Map<number, number> = new Map();
  activities.forEach(a => {
    if (a.projectId) {
      projectHoursMap.set(a.projectId, (projectHoursMap.get(a.projectId) || 0) + (a.hours || 0));
    }
  });

  // Get unique project IDs from impacts
  const projectIdSet = new Set(impacts.map(i => i.projectId).filter(Boolean));
  const projectIds = Array.from(projectIdSet) as number[];

  if (projectIds.length === 0) {
    return {
      volunteerId,
      volunteerName: volunteer.displayName || `Volunteer ${volunteerId}`,
      totalAiu: 0,
      percentOfLifetimeCeiling: 0,
      totalHours: 0,
      totalLivesImpacted: 0,
      projectCount: 0,
      sdgsContributed: [],
      projects: [],
    };
  }

  // PERFORMANCE: Batch fetch project details and settings in parallel
  const [projectDetails, projectSettingsList] = await Promise.all([
    db.select().from(projects).where(inArray(projects.id, projectIds)),
    db.select().from(projectAiuSettings).where(inArray(projectAiuSettings.projectId, projectIds))
  ]);

  // Create maps for quick lookup
  const projectMap = new Map(projectDetails.map(p => [p.id, p]));
  const settingsMap = new Map(projectSettingsList.map(s => [s.projectId, s]));

  const projectResults: VolunteerPureImpactAIUSummary['projects'] = [];
  let totalAiu = 0;
  let totalHours = 0;
  let totalLivesImpacted = 0;
  const sdgsSet = new Set<number>();

  // Calculate AIU for each project's impacts
  for (const projectId of projectIds) {
    const project = projectMap.get(projectId);
    const settings = settingsMap.get(projectId);
    if (!project) continue;

    // Get volunteer's impacts for this project (exclude duplicates)
    const projectImpactsList = impacts.filter(i => i.projectId === projectId && !i.isDuplicated);

    // Sum lives impacted for this project
    const livesImpacted = projectImpactsList.reduce((sum, i) => sum + (i.value || 0), 0);
    if (livesImpacted === 0) continue;

    // Get hours for this project
    const hours = projectHoursMap.get(projectId) || 0;

    // Get expected beneficiaries from settings (or use default)
    const expectedBeneficiaries = settings?.kpiAfter || 100;

    // Use the primary impact record's metadata
    const outcomeType = projectImpactsList[0]?.outcomeType || 'individual';
    const role = projectImpactsList[0]?.role || 'support';
    const verificationStatus = projectImpactsList[0]?.verificationStatus || 'pending';

    // Get activity dates for this project (for streak calculation)
    const projectActivityDates = activities
      .filter(a => a.projectId === projectId && a.date)
      .map(a => new Date(a.date));

    // Calculate PURE IMPACT AIU (V3) with streak bonus
    const aiuResult = calculatePureImpactAIU({
      livesImpacted,
      outcomeType,
      role,
      verificationStatus,
      hours,
      projectExpectedBeneficiaries: expectedBeneficiaries,
      activityDates: projectActivityDates,
    });

    // Apply attribution factor to get volunteer's share of project AIU
    // Volunteers collectively get attributionFactor % of project (e.g., 20%)
    // This volunteer's share depends on their hours contribution
    const attributionFactor = settings?.attributionFactor ?? 0.2;

    // Get total hours for this project to calculate volunteer's proportion
    const allProjectActivities = activities.filter(a => a.projectId === projectId);
    const totalProjectHours = allProjectActivities.reduce((sum, a) => sum + (a.hours || 0), 0) || hours || 1;
    const volunteerHoursRatio = hours / totalProjectHours;

    // Volunteer's attributed AIU = full project AIU × attribution factor × their hours share
    const attributedAiu = aiuResult.aiu * attributionFactor * volunteerHoursRatio;

    // Update aiuResult with attributed value
    const attributedAiuResult = {
      ...aiuResult,
      aiu: Math.round(attributedAiu * 100) / 100,
      rawAiu: aiuResult.aiu, // Keep original for reference
      attributionFactor,
      volunteerShare: attributionFactor * volunteerHoursRatio,
    };

    // Track SDGs
    if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
      project.sdgGoals.forEach((goal: unknown) => {
        if (isValidSdg(goal)) {
          sdgsSet.add(goal);
        }
      });
    }
    if (project.primarySdg) {
      sdgsSet.add(project.primarySdg);
    }

    projectResults.push({
      projectId,
      projectName: project.name,
      impactBreakdown: {
        ...attributedAiuResult,
        outcomeType,
        role,
        verificationStatus,
        hours,
      },
    });

    totalAiu += attributedAiuResult.aiu;
    totalHours += hours;
    totalLivesImpacted += livesImpacted;
  }

  // Apply global lifetime ceiling
  const { globalMaxAiu } = AIU_CEILING_CONFIG;
  totalAiu = Math.min(globalMaxAiu, totalAiu);
  const percentOfLifetimeCeiling = Math.round((totalAiu / globalMaxAiu) * 1000) / 10;

  return {
    volunteerId,
    volunteerName: volunteer.displayName || `Volunteer ${volunteerId}`,
    totalAiu: Math.round(totalAiu * 100) / 100,
    percentOfLifetimeCeiling,
    totalHours: Math.round(totalHours),
    totalLivesImpacted,
    projectCount: projectResults.length,
    sdgsContributed: Array.from(sdgsSet).sort((a, b) => a - b),
    projects: projectResults,
  };
}

// Legacy alias for backwards compatibility
export async function calculateVolunteerEnhancedAIU(volunteerId: number) {
  return calculateVolunteerPureImpactAIU(volunteerId);
}

export default {
  calculateProjectAIU,
  calculateVolunteerAIU,
  calculateOrganizationAIU,
  generateCSRAIUReport,
  getVolunteerQuickAIUStats,
  storeVolunteerAIURecord,
  // V2: Logarithmic AIU calculation
  calculateVolunteerLogarithmicAIU,
  // V3: Pure Impact AIU calculation (no gameable factors)
  calculateVolunteerPureImpactAIU,
  // Legacy alias
  calculateVolunteerEnhancedAIU,
};
