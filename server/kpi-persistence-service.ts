import { logger } from "./logger";
import { storage } from "./storage";
import { extractSdgsFromProjects } from "./sdg-utils";
import { calculateVolunteerAIU } from "./aiu-service";
import type { InsertKpiSnapshot } from "@shared/schema";

/**
 * People-related metric keywords used to identify impact metrics
 * that count humans/beneficiaries (shared with dashboard-service logic)
 */
const PEOPLE_KEYWORDS = [
  'people', 'person', 'beneficiar', 'student', 'child', 'children',
  'adult', 'family', 'families', 'participant', 'recipient',
  'attendee', 'individual', 'community member'
];
const SERVICE_KEYWORDS = [
  'meal', 'service', 'healthcare', 'education', 'training'
];

/**
 * Build the set of metric IDs that represent people/beneficiaries
 */
async function getPeopleMetricIds(): Promise<Set<number>> {
  const allImpactMetrics = await storage.listImpactMetrics();
  return new Set(
    allImpactMetrics
      .filter(metric => {
        const unit = (metric.unit || '').toLowerCase();
        const category = (metric.category || '').toLowerCase();
        const name = (metric.name || '').toLowerCase();
        return PEOPLE_KEYWORDS.some(kw =>
          unit.includes(kw) || category.includes(kw) || name.includes(kw)
        ) || SERVICE_KEYWORDS.some(kw =>
          unit.includes(kw) || category.includes(kw) || name.includes(kw)
        );
      })
      .map(m => m.id)
  );
}

/**
 * Calculate people impacted from impact records (verified at 100%, pending at 70%)
 * Mirrors dashboard-service.ts calculatePeopleImpacted logic
 */
function calculatePeopleImpacted(impacts: any[], peopleMetricIds: Set<number>): number {
  const peopleImpacts = impacts.filter(i => i.metricId && peopleMetricIds.has(i.metricId));

  const verifiedSum = peopleImpacts
    .filter(i => i.verificationStatus === 'verified' || i.verificationStatus === 'approved')
    .reduce((sum, i) => sum + (i.value || 0), 0);

  const pendingSum = peopleImpacts
    .filter(i => i.verificationStatus === 'pending' || i.verificationStatus === 'self_reported' || !i.verificationStatus)
    .reduce((sum, i) => sum + (i.value || 0), 0);

  return verifiedSum + Math.round(pendingSum * 0.7);
}

/**
 * Persist computed KPIs for a volunteer user.
 * Queries the DB for the volunteer's activities, impacts, assignments, and projects,
 * computes all KPIs, then upserts into kpi_snapshots and leaderboard_stats.
 */
export async function persistVolunteerKPIs(userId: number): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user || user.userType !== 'volunteer') return;

    // Fetch volunteer-specific data
    const volunteerAssignments = await storage.listProjectAssignmentsByVolunteer(userId);
    const visibleProjectIds = new Set(
      volunteerAssignments
        .filter(pa => (pa.status?.toLowerCase() || '') !== 'declined')
        .map(pa => pa.projectId)
    );
    const projectIdArray = Array.from(visibleProjectIds);

    const [
      volunteerActivities,
      allProjects,
      volunteerApplications,
    ] = await Promise.all([
      storage.listVolunteerActivitiesByUser(userId),
      storage.listProjects(),
      storage.listApplicationsByVolunteer(userId),
    ]);

    const assignedProjects = allProjects.filter(p => visibleProjectIds.has(p.id));

    // Fetch impacts and tasks for visible projects
    const [volunteerImpacts, volunteerTasks] = await Promise.all([
      projectIdArray.length > 0 ? storage.listProjectImpactsByProjectIds(projectIdArray) : Promise.resolve([]),
      projectIdArray.length > 0 ? storage.listTasksByProjectIds(projectIdArray) : Promise.resolve([]),
    ]);

    // Only count this volunteer's own impacts
    const volunteerOwnImpacts = volunteerImpacts.filter(i => i.userId === userId);

    // Core metrics
    const totalHours = volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
    const verifiedActivities = volunteerActivities.filter(a => {
      const status = (a as any).verificationStatus?.toLowerCase();
      return status === 'approved' || status === 'verified';
    });
    const verifiedHours = verifiedActivities.reduce((sum, a) => sum + (a.hours || 0), 0);

    const totalProjects = assignedProjects.length;
    const activeProjects = assignedProjects.filter(p => {
      const status = p.status?.toLowerCase() || '';
      return status === 'in progress' || status === 'active';
    }).length;
    const completedProjects = assignedProjects.filter(p =>
      p.status?.toLowerCase() === 'completed'
    ).length;

    // SDGs
    const uniqueSDGs = new Set(extractSdgsFromProjects(assignedProjects));

    // Tasks
    const relevantTasks = volunteerTasks.filter(t =>
      t.assigneeId === userId || (t.projectId && visibleProjectIds.has(t.projectId))
    );
    const completedTasks = relevantTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
    const totalTasks = relevantTasks.length;

    // People impacted
    const peopleMetricIds = await getPeopleMetricIds();
    const totalPeopleImpacted = calculatePeopleImpacted(volunteerOwnImpacts, peopleMetricIds);

    // Impact score (same formula as dashboard-service)
    const hoursScore = Math.min((totalHours / 100) * 100, 100);
    const peopleScore = Math.min((totalPeopleImpacted / 100) * 100, 100);
    const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const sdgScore = (uniqueSDGs.size / 17) * 100;
    const acceptedApplications = volunteerApplications.filter(app => app.status?.toLowerCase() === 'accepted').length;
    const matchScore = volunteerApplications.length > 0
      ? (acceptedApplications / volunteerApplications.length) * 100
      : 0;
    const impactScore = Math.round(
      hoursScore * 0.35 +
      peopleScore * 0.30 +
      tasksScore * 0.20 +
      sdgScore * 0.10 +
      matchScore * 0.05
    );

    // Engagement score (application acceptance rate)
    const engagementScore = Math.round(matchScore);

    // AIU
    let aiuEarned = 0;
    try {
      const aiuSummary = await calculateVolunteerAIU(userId);
      aiuEarned = aiuSummary?.totalAiu || 0;
    } catch {
      // AIU calculation may fail; use 0
    }

    // Pending counts
    const pendingActivities = volunteerActivities.filter(a =>
      (a as any).verificationStatus?.toLowerCase() === 'pending'
    ).length;
    const pendingImpacts = volunteerOwnImpacts.filter(i =>
      i.verificationStatus === 'pending'
    ).length;

    // Upsert KPI snapshot
    const snapshotData: InsertKpiSnapshot = {
      entityType: 'volunteer',
      entityId: userId,
      totalHours,
      verifiedHours,
      totalProjects,
      activeProjects,
      completedProjects,
      sdgsAddressed: uniqueSDGs.size,
      peopleImpacted: totalPeopleImpacted,
      aiuEarned,
      impactScore,
      activeVolunteers: 1,
      tasksCompleted: completedTasks,
      totalTasks,
      engagementScore,
      pendingActivities,
      pendingImpacts,
      computedAt: new Date(),
    };

    await storage.upsertKpiSnapshot(snapshotData);

    // Also update leaderboard_stats
    await storage.upsertLeaderboardStats(userId, {
      userType: 'volunteer',
      organizationId: user.organizationId,
      totalHours: Math.round(totalHours),
      tasksCompleted: completedTasks,
      projectsCompleted: completedProjects,
      impactsLogged: volunteerOwnImpacts.length,
      totalPoints: Math.round(aiuEarned * 100),
      lastActivityDate: volunteerActivities.length > 0
        ? new Date(Math.max(...volunteerActivities.map(a => new Date(a.createdAt).getTime())))
        : null,
    });

  } catch (error) {
    logger.error(`[KPI Persistence] Failed to persist volunteer KPIs for user ${userId}:`, error);
  }
}

/**
 * Persist computed KPIs for an organization.
 * Queries the DB for the org's projects, activities, impacts, and computes
 * all org-level KPIs, then upserts into kpi_snapshots.
 */
export async function persistOrganizationKPIs(organizationId: number): Promise<void> {
  try {
    // Get org projects
    const organizationProjects = await storage.listProjectsByOrganization(organizationId);
    const projectIdArray = organizationProjects.map(p => p.id);

    if (projectIdArray.length === 0) {
      // Still persist a zero snapshot
      const snapshotData: InsertKpiSnapshot = {
        entityType: 'organization',
        entityId: organizationId,
        totalHours: 0,
        verifiedHours: 0,
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        sdgsAddressed: 0,
        peopleImpacted: 0,
        aiuEarned: 0,
        impactScore: 0,
        activeVolunteers: 0,
        tasksCompleted: 0,
        totalTasks: 0,
        engagementScore: 0,
        pendingActivities: 0,
        pendingImpacts: 0,
        computedAt: new Date(),
      };
      await storage.upsertKpiSnapshot(snapshotData);
      return;
    }

    // Fetch project-scoped data
    const [allActivities, organizationImpacts, organizationAssignments, organizationTasks] = await Promise.all([
      storage.listVolunteerActivitiesByProjectIds(projectIdArray),
      storage.listProjectImpactsByProjectIds(projectIdArray),
      storage.listProjectAssignmentsByProjectIds(projectIdArray),
      storage.listTasksByProjectIds(projectIdArray),
    ]);

    // Only verified/approved activities for org metrics
    const organizationActivities = allActivities.filter((a: any) => {
      const status = a.verificationStatus?.toLowerCase();
      return status === 'approved' || status === 'verified';
    });

    const totalHours = organizationActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
    const verifiedHours = totalHours; // All org activities are already filtered to verified

    const activeProjects = organizationProjects.filter(p => {
      const status = p.status?.toLowerCase();
      return status === 'in progress' || status === 'active';
    }).length;
    const completedProjects = organizationProjects.filter(p =>
      p.status?.toLowerCase() === 'completed'
    ).length;

    const completedTasks = organizationTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
    const totalTasks = organizationTasks.length;

    // Unique SDGs
    const uniqueSDGs = new Set(extractSdgsFromProjects(organizationProjects));

    // People impacted
    const peopleMetricIds = await getPeopleMetricIds();
    const totalPeopleImpacted = calculatePeopleImpacted(organizationImpacts, peopleMetricIds);

    // Active volunteers
    const volunteerIds = new Set(organizationAssignments.map(pa => pa.volunteerId));
    const activeVolunteers = volunteerIds.size;

    // Engagement score (from applications)
    const organizationOpportunities = await storage.listOpportunitiesByOrganization(organizationId);
    const orgOpportunityIds = organizationOpportunities.map(opp => opp.id);
    const organizationApplications = await storage.listApplicationsByOpportunityIds(orgOpportunityIds);
    const acceptedApplications = organizationApplications.filter(app => app.status?.toLowerCase() === 'accepted').length;
    const engagementScore = organizationApplications.length > 0
      ? Math.round((acceptedApplications / organizationApplications.length) * 100)
      : 0;

    // Impact score (same formula as dashboard-service)
    const hoursScore = Math.min((totalHours / 100) * 100, 100);
    const peopleScore = Math.min((totalPeopleImpacted / 100) * 100, 100);
    const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const sdgScore = (uniqueSDGs.size / 17) * 100;
    const matchScore = engagementScore;
    const impactScore = Math.round(
      hoursScore * 0.35 +
      peopleScore * 0.30 +
      tasksScore * 0.20 +
      sdgScore * 0.10 +
      matchScore * 0.05
    );

    // AIU calculation (org-wide)
    let totalAiuEarned = 0;
    const orgSdgSet = new Set<number>();
    organizationProjects.forEach(p => {
      if (p.sdgGoals && Array.isArray(p.sdgGoals)) {
        p.sdgGoals.forEach(g => orgSdgSet.add(g));
      }
    });

    let hasAnyImpacts = false;
    organizationProjects.forEach(project => {
      const projectActivities = organizationActivities.filter(a => a.projectId === project.id);
      const projectHours = projectActivities.reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
      const projectImpacts = organizationImpacts.filter(i => i.projectId === project.id);

      const projectPeopleMetrics = projectImpacts.filter(i => i.metricId !== null && peopleMetricIds.has(i.metricId));
      const verifiedPeople = projectPeopleMetrics
        .filter(i => i.verificationStatus === 'verified')
        .reduce((sum, i) => sum + (Number(i.value) || 0), 0);
      const pendingPeople = projectPeopleMetrics
        .filter(i => i.verificationStatus !== 'verified')
        .reduce((sum, i) => sum + (Number(i.value) || 0) * 0.7, 0);
      const livesImpacted = verifiedPeople + pendingPeople;

      if (livesImpacted > 0) {
        hasAnyImpacts = true;
        const projectVolunteerCount = organizationAssignments.filter(pa => pa.projectId === project.id).length;
        const attributionFactor = projectVolunteerCount > 0 ? 1 / projectVolunteerCount : 1;
        const verificationMultiplier = verifiedPeople > 0 ? 1.0 : 0.8;
        const hoursNormalization = Math.max(projectHours, 1) / 10;
        const projectAiu = Math.round(
          (livesImpacted * attributionFactor * verificationMultiplier) / Math.max(hoursNormalization, 1) * 100
        ) / 100;
        totalAiuEarned += projectAiu;
      } else if (projectHours > 0) {
        const projectSdgCount = (project.sdgGoals || []).length;
        const projectSdgMultiplier = Math.min(1 + (projectSdgCount * 0.1), 2.0);
        const projectAiu = Math.round((projectHours / 50) * projectSdgMultiplier * 100) / 100;
        totalAiuEarned += projectAiu;
      }
    });

    if (!hasAnyImpacts && totalHours > 0 && totalAiuEarned === 0) {
      const sdgMultiplier = Math.min(1 + (orgSdgSet.size * 0.1), 2.0);
      totalAiuEarned = Math.round((totalHours / 50) * sdgMultiplier * 100) / 100;
    }
    totalAiuEarned = Math.round(totalAiuEarned * 100) / 100;

    // Pending counts
    const pendingActivities = allActivities.filter((a: any) =>
      a.verificationStatus?.toLowerCase() === 'pending'
    ).length;
    const pendingImpacts = organizationImpacts.filter(i =>
      i.verificationStatus === 'pending'
    ).length;

    // Upsert KPI snapshot
    const snapshotData: InsertKpiSnapshot = {
      entityType: 'organization',
      entityId: organizationId,
      totalHours,
      verifiedHours,
      totalProjects: organizationProjects.length,
      activeProjects,
      completedProjects,
      sdgsAddressed: uniqueSDGs.size,
      peopleImpacted: totalPeopleImpacted,
      aiuEarned: totalAiuEarned,
      impactScore,
      activeVolunteers,
      tasksCompleted: completedTasks,
      totalTasks,
      engagementScore,
      pendingActivities,
      pendingImpacts,
      computedAt: new Date(),
    };

    await storage.upsertKpiSnapshot(snapshotData);

  } catch (error) {
    logger.error(`[KPI Persistence] Failed to persist organization KPIs for org ${organizationId}:`, error);
  }
}

/**
 * Persist KPIs for both a volunteer and their associated organization.
 * Fire-and-forget helper used after data mutations.
 */
export async function persistKPIsForActivity(userId: number, organizationId?: number | null): Promise<void> {
  await persistVolunteerKPIs(userId);
  if (organizationId) {
    await persistOrganizationKPIs(organizationId);
  }
}
