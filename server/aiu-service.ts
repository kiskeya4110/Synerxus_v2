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
  calculateProjectAIUs,
  type AIUCalculationInput,
  type VolunteerContribution,
  type AIUResult,
  type VolunteerAIU
} from '@shared/aiu-calculations';

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
 */
export async function calculateProjectAIU(projectId: number): Promise<ProjectAIUSummary | null> {
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

  const aiuInput: AIUCalculationInput = {
    kpiBefore,
    kpiAfter,
    attributionFactor,
    volunteers: volunteerContributions,
  };

  // Calculate AIUs
  const aiuResult = calculateProjectAIUs(aiuInput);

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
 */
export async function calculateVolunteerAIU(volunteerId: number): Promise<VolunteerAIUSummary | null> {
  // Fetch volunteer details
  const [volunteer] = await db.select().from(users).where(eq(users.id, volunteerId));
  if (!volunteer) return null;

  // Fetch all project assignments for this volunteer
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

  // Fetch activities
  const activities = await db
    .select({
      projectId: volunteerActivities.projectId,
      hours: volunteerActivities.hours,
    })
    .from(volunteerActivities)
    .where(eq(volunteerActivities.userId, volunteerId));

  // Aggregate hours per project
  const projectHours: Map<number, number> = new Map();
  activities.forEach(a => {
    if (a.projectId) {
      projectHours.set(a.projectId, (projectHours.get(a.projectId) || 0) + (a.hours || 0));
    }
  });

  // Get unique project IDs
  const projectIdSet = new Set([
    ...assignments.map(a => a.projectId).filter(Boolean),
    ...Array.from(projectHours.keys())
  ]);
  const projectIds = Array.from(projectIdSet) as number[];

  if (projectIds.length === 0) {
    return {
      volunteerId,
      volunteerName: volunteer.displayName || `Volunteer ${volunteerId}`,
      totalAiu: 0,
      aiuUnique: 0,
      aiuSessions: 0,
      totalHours: 0,
      projectCount: 0,
      sdgsContributed: [],
      verificationRate: 0,
      projects: [],
    };
  }

  // Calculate AIU for each project and extract volunteer's share
  const projectAius: {
    projectId: number;
    projectName: string;
    aiu: number;
    hours: number;
    role: string;
    sdgIndicator: string;
  }[] = [];

  let totalAiuUnique = 0;
  let totalAiuSessions = 0;
  let totalHours = 0;
  let verifiedCount = 0;
  let totalCount = 0;
  const sdgsSet = new Set<number>();

  for (const projectId of projectIds) {
    const projectSummary = await calculateProjectAIU(projectId);
    if (!projectSummary) continue;

    const volunteerData = projectSummary.volunteers.find(v => v.volunteerId === volunteerId);
    if (volunteerData) {
      // Extract SDG number from indicator
      const sdgMatch = projectSummary.sdgIndicator.match(/SDG (\d+)/);
      if (sdgMatch) sdgsSet.add(parseInt(sdgMatch[1]));

      projectAius.push({
        projectId,
        projectName: projectSummary.projectName,
        aiu: volunteerData.aiu,
        hours: volunteerData.hours,
        role: volunteerData.role,
        sdgIndicator: projectSummary.sdgIndicator,
      });

      // Find this volunteer's AIU breakdown
      const aiuBreakdown = await db
        .select()
        .from(volunteerAiuRecords)
        .where(and(
          eq(volunteerAiuRecords.projectId, projectId),
          eq(volunteerAiuRecords.volunteerId, volunteerId)
        ))
        .limit(1);

      if (aiuBreakdown.length > 0) {
        totalAiuUnique += aiuBreakdown[0].aiuUnique || 0;
        totalAiuSessions += aiuBreakdown[0].aiuSessions || 0;
        totalCount++;
        // Consider verified if: explicit verification, OR has logged hours (implicit verification)
        if (aiuBreakdown[0].verificationStatus === 'verified' || volunteerData.hours > 0) {
          verifiedCount++;
        }
      } else {
        // Estimate from project calculation
        const volunteerShare = projectSummary.totalAiuUnique * (volunteerData.weightPercentage / 100);
        totalAiuUnique += volunteerShare;
        totalAiuSessions += Math.ceil(volunteerData.hours / 2);
        totalCount++;
        // If volunteer has logged hours, consider it verified (hours were tracked/confirmed)
        if (volunteerData.hours > 0) {
          verifiedCount++;
        }
      }

      totalHours += volunteerData.hours;
    }
  }

  return {
    volunteerId,
    volunteerName: volunteer.displayName || `Volunteer ${volunteerId}`,
    totalAiu: parseFloat((totalAiuUnique + totalAiuSessions * 0.1).toFixed(10)),
    aiuUnique: parseFloat(totalAiuUnique.toFixed(10)),
    aiuSessions: totalAiuSessions,
    totalHours: Math.round(totalHours),
    projectCount: projectAius.length,
    sdgsContributed: Array.from(sdgsSet).sort((a, b) => a - b),
    verificationRate: totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0,
    projects: projectAius,
  };
}

/**
 * Calculate AIU summary for an organization across all projects
 */
export async function calculateOrganizationAIU(organizationId: number): Promise<OrganizationAIUSummary | null> {
  // Fetch organization
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
  if (!org) return null;

  // Fetch all projects for this organization
  const orgProjects = await db
    .select({ id: projects.id, name: projects.name, sdgGoals: projects.sdgGoals, primarySdg: projects.primarySdg })
    .from(projects)
    .where(eq(projects.organizationId, organizationId));

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

  // Calculate AIU for each project
  const projectSummaries: {
    projectId: number;
    projectName: string;
    aiu: number;
    sdgIndicator: string;
    verificationStatus: string;
  }[] = [];

  let totalAiuUnique = 0;
  let totalAiuSessions = 0;
  let totalHours = 0;
  let livesImpacted = 0;
  let verifiedCount = 0;
  let totalCount = 0;
  const volunteerIds = new Set<number>();
  const sdgsSet = new Set<number>();

  for (const project of orgProjects) {
    const projectSummary = await calculateProjectAIU(project.id);
    if (!projectSummary) continue;

    projectSummaries.push({
      projectId: project.id,
      projectName: project.name,
      aiu: projectSummary.totalAiu,
      sdgIndicator: projectSummary.sdgIndicator,
      verificationStatus: projectSummary.verificationStatus,
    });

    totalAiuUnique += projectSummary.totalAiuUnique;
    totalAiuSessions += projectSummary.totalAiuSessions;
    totalHours += projectSummary.totalHours;
    livesImpacted += projectSummary.livesImpacted;

    // Track volunteers
    projectSummary.volunteers.forEach(v => volunteerIds.add(v.volunteerId));

    // Track verification - consider verified if explicit status or has logged hours
    totalCount++;
    if (projectSummary.verificationStatus === 'verified' || projectSummary.totalHours > 0) {
      verifiedCount++;
    }

    // Track SDGs
    const sdgMatch = projectSummary.sdgIndicator.match(/SDG (\d+)/);
    if (sdgMatch) sdgsSet.add(parseInt(sdgMatch[1]));
  }

  return {
    organizationId,
    organizationName: org.name,
    totalAiu: parseFloat((totalAiuUnique + totalAiuSessions * 0.1).toFixed(10)),
    aiuUnique: parseFloat(totalAiuUnique.toFixed(10)),
    aiuSessions: totalAiuSessions,
    projectCount: projectSummaries.length,
    volunteerCount: volunteerIds.size,
    totalHours: Math.round(totalHours),
    livesImpacted,
    sdgsCovered: Array.from(sdgsSet).sort((a, b) => a - b),
    verificationRate: totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0,
    projects: projectSummaries,
  };
}

/**
 * Generate comprehensive CSR AIU report
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

  // Calculate AIU for each project
  for (const project of allProjects) {
    const projectSummary = await calculateProjectAIU(project.id);
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
      verificationRate: totalVerified > 0 ? Math.round((verifiedCount / totalVerified) * 100) : 0,
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

export default {
  calculateProjectAIU,
  calculateVolunteerAIU,
  calculateOrganizationAIU,
  generateCSRAIUReport,
  getVolunteerQuickAIUStats,
  storeVolunteerAIURecord,
};
