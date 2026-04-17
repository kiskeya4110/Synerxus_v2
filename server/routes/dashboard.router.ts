import { logger } from "../logger";
import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import {
  getDashboardDataForOrganization,
  getDashboardDataForVolunteer,
  getSDGContributionsForOrganization
} from "../dashboard-service";
import { calculateOrganizationAIU, calculateProjectAIU } from "../aiu-service";
import { authMiddleware } from "../middleware/auth";
import { getAuthenticatedUser } from "./utils";
import { persistVolunteerKPIs, persistOrganizationKPIs } from "../kpi-persistence-service";
import { db } from "../db";
import { projectAiuSettings } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

export const dashboardRouter = Router();

// ===== HELPER FUNCTIONS =====

/**
 * Safe parseInt with NaN validation
 */
function safeParseInt(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Safe date validation
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safe array with null/undefined check
 */
function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Safe number access with default
 */
function safeNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// GET /api/organization/dashboard - Organization-specific dashboard
// Returns comprehensive dashboard data for organizations including:
// - Key metrics (projects, hours, SDGs, people impacted, volunteers)
// - SDG distribution
// - Project locations
// - Alerts and tasks
// - Impact over time
// - AI insights
// - Volunteer summaries
dashboardRouter.get("/organization", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Verify authenticated user
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    // Check if client is requesting fresh data (bypass cache)
    const forceRefresh = req.query.refresh === 'true' || req.headers['cache-control'] === 'no-cache';

    // Cache dashboard data for 30 seconds to improve performance (skip if refresh requested)
    if (!forceRefresh) {
      res.set('Cache-Control', 'private, max-age=30');
    } else {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    const projectFilter = req.query.projectId as string | undefined;
    const timePeriod = req.query.timePeriod as string | undefined;

    // SECURITY: Use authenticated user's ID instead of query parameter
    const userIdNum = authUser.id;

    // Verify user is an organization
    if (authUser.userType !== 'organization') {
      return res.status(403).json({ message: "Only organizations can access this dashboard" });
    }

    const user = await storage.getUser(userIdNum);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const organizationId = user.organizationId || userIdNum;

    // Use a single transaction or consistent snapshot if possible, but for now, just ensure IDs are used correctly
    // Fetch organization-specific data using efficient filtered queries (not full table scans)
    const allOrganizationProjects = await storage.listProjectsByOrganization(organizationId);

    // Apply project filter if specified (keep original list for filter dropdown)
    let organizationProjects = allOrganizationProjects;
    if (projectFilter && projectFilter !== 'all') {
      const filterProjectId = parseInt(projectFilter);
      organizationProjects = organizationProjects.filter(p => p.id === filterProjectId);
    }

    const organizationProjectIds = organizationProjects.map(p => p.id);
    const organizationProjectIdSet = new Set(organizationProjectIds);

    // Apply time period filter for activities/impacts
    let startDate = new Date(0);
    let endDate = new Date();
    if (timePeriod === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '90d') {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '1y') {
      // "Last year" means the previous calendar year (Jan 1 - Dec 31)
      const previousYear = new Date().getFullYear() - 1;
      startDate = new Date(previousYear, 0, 1);
      endDate = new Date(previousYear, 11, 31, 23, 59, 59, 999);
    }

    // Fetch data using efficient batch queries (only for this organization's projects)
    const [allTasks, allActivities, allImpacts, organizationAssignments, allImpactMetrics] = await Promise.all([
      storage.listTasksByProjectIds(organizationProjectIds),
      storage.listVolunteerActivitiesByProjectIds(organizationProjectIds),
      storage.listProjectImpactsByProjectIds(organizationProjectIds),
      storage.listProjectAssignmentsByProjectIds(organizationProjectIds),
      storage.listImpactMetrics(), // Impact metrics are static/cached, OK to fetch all
    ]);

    // Apply time filter to tasks, activities and impacts (only if time period specified)
    const shouldFilterByTime = timePeriod && timePeriod !== 'all';

    const organizationTasks = shouldFilterByTime
      ? allTasks.filter(t => {
          const taskDate = new Date(t.dueDate || t.createdAt);
          return taskDate >= startDate && taskDate <= endDate;
        })
      : allTasks;

    const organizationActivities = shouldFilterByTime
      ? allActivities.filter(a => {
          const activityDate = new Date(a.date);
          return !isNaN(activityDate.getTime()) && activityDate >= startDate && activityDate <= endDate;
        })
      : allActivities;

    const organizationImpacts = shouldFilterByTime
      ? allImpacts.filter(i => {
          const impactDate = new Date(i.date || i.createdAt);
          return !isNaN(impactDate.getTime()) && impactDate >= startDate && impactDate <= endDate;
        })
      : allImpacts;

    // Get volunteers using efficient batch query
    const volunteerIds = Array.from(new Set(organizationAssignments.map(pa => pa.volunteerId)));
    const organizationVolunteers = await storage.getUsersByIds(volunteerIds);

    // Identify people-related metrics
    const peopleMetricIds = new Set(
      allImpactMetrics
        .filter(metric => {
          const unit = metric.unit?.toLowerCase() || '';
          const category = metric.category?.toLowerCase() || '';
          const name = metric.name?.toLowerCase() || '';
          const keywords = ['people', 'person', 'beneficiar', 'student', 'child', 'family', 'participant', 'recipient', 'meal', 'service'];
          return keywords.some(keyword => unit.includes(keyword) || category.includes(keyword) || name.includes(keyword));
        })
        .map(m => m.id)
    );

    // Calculate key metrics
    const activeProjects = organizationProjects.filter(p => {
      const status = p.status?.toLowerCase();
      return status === 'in progress' || status === 'active';
    }).length;

    const completedProjects = organizationProjects.filter(p => {
      const status = p.status?.toLowerCase();
      return status === 'completed';
    }).length;

    const totalHours = organizationActivities.reduce((sum, a) => sum + (a.hours || 0), 0);

    // Count verified and pending activities for KPI display
    const verifiedCount = organizationActivities.filter((a: any) => a.verificationStatus === 'approved' || a.verificationStatus === 'verified').length;
    const pendingCount = organizationActivities.filter((a: any) => a.verificationStatus === 'pending' || a.verificationStatus === 'self_reported' || !a.verificationStatus).length;

    const uniqueSDGs = new Set<number>();
    organizationProjects.forEach(project => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach(goal => uniqueSDGs.add(goal));
      }
    });

    const totalPeopleImpacted = organizationImpacts
      .filter(i => i.metricId && peopleMetricIds.has(i.metricId))
      .reduce((sum, i) => sum + (i.value || 0), 0);

    // Calculate total AIU using the proper AIU service with 100% organization credit
    // Organizations get full credit for all volunteer + staff contributions to their projects
    // Apply filters to AIU calculation for consistent dashboard metrics
    let totalAiuEarned = 0;
    try {
      const aiuFilters = {
        projectId: projectFilter && projectFilter !== 'all' ? parseInt(projectFilter) : undefined,
        startDate: timePeriod !== 'all' ? startDate : undefined,
        endDate: timePeriod !== 'all' ? endDate : undefined,
        sdgGoal: req.query.sdgGoal ? parseInt(req.query.sdgGoal as string) : undefined,
      };
      const orgAiuSummary = await calculateOrganizationAIU(organizationId, aiuFilters);
      if (orgAiuSummary && orgAiuSummary.totalAiu > 0) {
        totalAiuEarned = orgAiuSummary.totalAiu;
      }
    } catch (aiuError) {
      logger.error("Error calculating organization AIU:", aiuError);
    }

    // Fallback: If no AIU from service, use hours-based calculation
    // This ensures organizations always see meaningful AIU based on their work
    if (totalAiuEarned === 0 && totalHours > 0) {
      // Formula: 1 AIU per 50 hours of volunteer work × SDG multiplier (10% bonus per SDG, max 2x)
      const sdgMultiplier = Math.min(1 + (uniqueSDGs.size * 0.1), 2.0);
      totalAiuEarned = Math.round((totalHours / 50) * sdgMultiplier * 100) / 100;
    }

    // SDG Distribution - track both contributing hours (full) and dedicated hours (proportional)
    const sdgDistribution: Record<number, { hours: number; dedicatedHours: number; projects: number; volunteers: number }> = {};
    organizationProjects.forEach(project => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals) && project.sdgGoals.length > 0) {
        const projectHours = organizationActivities
          .filter(a => a.projectId === project.id)
          .reduce((sum, a) => sum + (a.hours || 0), 0);
        const projectVolunteers = organizationAssignments
          .filter(pa => pa.projectId === project.id)
          .map(pa => pa.volunteerId);

        // Proportional hours = project hours divided by number of SDGs
        const dedicatedHoursPerSdg = projectHours / project.sdgGoals.length;

        project.sdgGoals.forEach(goal => {
          if (!sdgDistribution[goal]) {
            sdgDistribution[goal] = { hours: 0, dedicatedHours: 0, projects: 0, volunteers: 0 };
          }
          sdgDistribution[goal].hours += projectHours; // Full attribution (contributing hours)
          sdgDistribution[goal].dedicatedHours += dedicatedHoursPerSdg; // Proportional (dedicated hours)
          sdgDistribution[goal].projects += 1;
          sdgDistribution[goal].volunteers += projectVolunteers.length;
        });
      }
    });

    // Project locations for map
    const projectLocations = organizationProjects
      .filter(p => p.location)
      .map(p => ({
        id: p.id,
        name: p.name,
        location: p.location,
        status: p.status,
        sdgGoals: p.sdgGoals || [],
      }));

    // Alerts & Tasks (pending tasks, overdue tasks, new applications)
    const pendingTasks = organizationTasks.filter(t => t.status?.toLowerCase() === 'pending' || t.status?.toLowerCase() === 'in progress');
    const overdueTasks = organizationTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status?.toLowerCase() !== 'completed';
    });

    const alerts = [
      ...overdueTasks.map(t => ({
        id: `task-${t.id}`,
        type: 'overdue_task',
        title: t.title,
        message: `Task "${t.title}" is overdue`,
        severity: 'high' as const,
        projectId: t.projectId,
        createdAt: t.dueDate,
      })),
      ...pendingTasks.slice(0, 5).map(t => ({
        id: `pending-${t.id}`,
        type: 'pending_task',
        title: t.title,
        message: `Task "${t.title}" needs attention`,
        severity: 'medium' as const,
        projectId: t.projectId,
        createdAt: t.createdAt,
      })),
    ].slice(0, 10);

    // Impact Over Time - generate months based on time period filter
    const generateMonthsInRange = (trendStartDate: Date, trendEndDate: Date): string[] => {
      const months: string[] = [];
      const current = new Date(trendStartDate);
      current.setDate(1); // Start from first day of month

      while (current <= trendEndDate) {
        months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    };

    // Determine date range based on time period filter
    let trendStartDate: Date;
    let trendEndDate = new Date();

    if (timePeriod === '7d') {
      trendStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '30d') {
      trendStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '90d') {
      trendStartDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '1y') {
      // "Last year" means the previous calendar year (Jan 1 - Dec 31)
      const previousYear = new Date().getFullYear() - 1;
      trendStartDate = new Date(previousYear, 0, 1);
      trendEndDate = new Date(previousYear, 11, 31);
    } else {
      // For 'all', show last 12 months
      trendStartDate = new Date();
      trendStartDate.setMonth(trendStartDate.getMonth() - 11);
    }

    const monthsInRange = generateMonthsInRange(trendStartDate, trendEndDate);

    const impactOverTime = monthsInRange.map(monthKey => {
      const monthActivities = organizationActivities.filter(a => {
        const activityDate = new Date(a.date);
        const activityMonth = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
        return activityMonth === monthKey;
      });
      const monthImpacts = organizationImpacts.filter(i => {
        const impactDate = new Date(i.date);
        const impactMonth = `${impactDate.getFullYear()}-${String(impactDate.getMonth() + 1).padStart(2, '0')}`;
        return impactMonth === monthKey;
      });

      return {
        month: monthKey,
        hours: monthActivities.reduce((sum, a) => sum + (a.hours || 0), 0),
        peopleImpacted: monthImpacts.filter(i => i.metricId && peopleMetricIds.has(i.metricId)).reduce((sum, i) => sum + (i.value || 0), 0),
        volunteers: new Set(monthActivities.map(a => a.userId)).size,
      };
    });

    // AI Insights (generated based on data)
    const avgHoursPerVolunteer = organizationVolunteers.length > 0 ? Math.round(totalHours / organizationVolunteers.length) : 0;
    const completionRate = organizationTasks.length > 0
      ? Math.round((organizationTasks.filter(t => t.status?.toLowerCase() === 'completed').length / organizationTasks.length) * 100)
      : 0;
    const topSDG = Object.entries(sdgDistribution).sort((a, b) => b[1].hours - a[1].hours)[0];

    const aiInsights = [
      {
        id: 'insight-1',
        type: 'performance',
        title: 'Volunteer Engagement',
        message: avgHoursPerVolunteer > 10
          ? `Strong engagement with ${avgHoursPerVolunteer} avg hours per volunteer`
          : `Consider volunteer engagement initiatives - ${avgHoursPerVolunteer} avg hours per volunteer`,
        sentiment: avgHoursPerVolunteer > 10 ? 'positive' : 'neutral',
      },
      {
        id: 'insight-2',
        type: 'completion',
        title: 'Task Completion',
        message: completionRate >= 80
          ? `Excellent ${completionRate}% task completion rate`
          : `Task completion at ${completionRate}% - consider prioritizing pending tasks`,
        sentiment: completionRate >= 80 ? 'positive' : 'warning',
      },
      {
        id: 'insight-3',
        type: 'sdg',
        title: 'SDG Focus',
        message: topSDG
          ? `SDG ${topSDG[0]} leads with ${topSDG[1].hours} hours across ${topSDG[1].projects} projects`
          : 'Link projects to SDGs to track impact alignment',
        sentiment: topSDG ? 'positive' : 'neutral',
      },
    ];

    // Volunteer summaries
    const volunteerSummaries = organizationVolunteers.map(v => {
      const vActivities = organizationActivities.filter(a => a.userId === v.id);
      return {
        id: v.id,
        name: v.displayName || v.username || 'Unknown',
        avatar: v.avatar,
        hours: vActivities.reduce((sum, a) => sum + (a.hours || 0), 0),
        projects: new Set(vActivities.map(a => a.projectId)).size,
        lastActive: vActivities.length > 0 ? vActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : null,
      };
    }).sort((a, b) => b.hours - a.hours);

    // Quick actions available
    const quickActions = [
      { id: 'create-project', label: 'Create Project', icon: 'plus' },
      { id: 'invite-volunteer', label: 'Invite Volunteer', icon: 'user-plus' },
      { id: 'create-task', label: 'Create Task', icon: 'check-square' },
      { id: 'view-reports', label: 'View Reports', icon: 'bar-chart' },
    ];

    res.json({
      keyMetrics: {
        activeProjects,
        completedProjects,
        totalProjects: organizationProjects.length,
        totalHours,
        sdgsAddressed: uniqueSDGs.size,
        aiuEarned: totalAiuEarned, // Properly calculated AIU replacing raw livesTouched
        livesTouched: totalPeopleImpacted, // Keep for backwards compatibility
        activeVolunteers: organizationVolunteers.length,
        verifiedCount,
        pendingCount,
      },
      sdgDistribution: Object.entries(sdgDistribution).map(([goal, data]) => ({
        goal: parseInt(goal),
        ...data,
      })).sort((a, b) => b.hours - a.hours), // Sort by hours descending so top-performing SDGs are first
      projectLocations,
      alerts,
      impactOverTime,
      aiInsights,
      projects: organizationProjects.map(p => {
        // Calculate hours for this project from activities
        const projectHours = organizationActivities
          .filter(a => a.projectId === p.id)
          .reduce((sum, a) => sum + (a.hours || 0), 0);

        // Get configurable weights (default: 60% hours, 40% milestones)
        const hoursWeight = (p as any).completionHoursWeight ?? 60;
        const milestonesWeight = (p as any).completionMilestonesWeight ?? 40;

        // Calculate hours progress
        const expectedHours = p.projectTotalHours ||
                              (p.ongoingHoursPerWeek ? p.ongoingHoursPerWeek * 12 : 0);

        let hoursProgress = 0;
        if (expectedHours > 0) {
          hoursProgress = Math.min((projectHours / expectedHours) * 100, 100);
        } else if (projectHours > 0) {
          hoursProgress = Math.min((projectHours / 200) * 100, 50);
        }

        // Calculate milestone progress
        const milestones = (p as any).milestones as Array<{status: string; weight?: number}> | null;
        let milestoneProgress = 0;

        if (milestones && Array.isArray(milestones) && milestones.length > 0) {
          const hasCustomWeights = milestones.some(m => typeof m.weight === 'number' && m.weight > 0);
          if (hasCustomWeights) {
            const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 0), 0);
            const completedWeight = milestones
              .filter(m => m.status === 'completed')
              .reduce((sum, m) => sum + (m.weight || 0), 0);
            milestoneProgress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
          } else {
            const completedMilestones = milestones.filter(m => m.status === 'completed').length;
            milestoneProgress = (completedMilestones / milestones.length) * 100;
          }
        }

        // Calculate combined completion percentage
        let calculatedCompletion = 0;
        if (p.status === 'completed') {
          calculatedCompletion = 100;
        } else if (milestones && milestones.length > 0) {
          // Use weighted combination of hours + milestones
          const totalWeight = hoursWeight + milestonesWeight;
          const normalizedHoursWeight = (hoursWeight / totalWeight) * 100;
          const normalizedMilestonesWeight = (milestonesWeight / totalWeight) * 100;
          calculatedCompletion = Math.round(
            (normalizedHoursWeight / 100) * hoursProgress +
            (normalizedMilestonesWeight / 100) * milestoneProgress
          );
        } else {
          // No milestones - use hours only
          calculatedCompletion = Math.round(hoursProgress);
        }

        // Calculate people impacted for this project
        const projectImpacts = organizationImpacts.filter(i => i.projectId === p.id);
        const projectLivesTouched = projectImpacts
          .filter(i => i.metricId && peopleMetricIds.has(i.metricId))
          .reduce((sum, i) => sum + (i.value || 0), 0);

        // Calculate AIU for this project using 100% organization credit
        // Organizations get full credit for all impact from their projects
        let projectAiuEarned = 0;
        if (projectLivesTouched > 0) {
          // Primary: AIU based on people impacted (100% credit to organization)
          // 1 AIU = 10 people impacted, with verification bonus
          const projectVerifiedImpacts = projectImpacts.filter(i =>
            i.metricId && peopleMetricIds.has(i.metricId) &&
            (i.verificationStatus === 'verified' || i.verificationStatus === 'approved')
          );
          const verificationBonus = projectVerifiedImpacts.length > 0 ? 1.2 : 1.0;
          projectAiuEarned = Math.round((projectLivesTouched / 10) * verificationBonus * 100) / 100;
        } else if (projectHours > 0) {
          // Fallback: hours-based with SDG multiplier (100% credit)
          // 1 AIU = 50 hours of work × SDG multiplier
          const projectSdgCount = (p.sdgGoals || []).length;
          const projectSdgMultiplier = Math.min(1 + (projectSdgCount * 0.1), 2.0);
          projectAiuEarned = Math.round((projectHours / 50) * projectSdgMultiplier * 100) / 100;
        }

        // Calculate unique volunteer count from assignments + activities (filter null userIds)
        const projectAssigns = organizationAssignments.filter((a: any) => a.projectId === p.id);
        const projectVolunteerIds = new Set([
          ...projectAssigns.map((a: any) => a.volunteerId),
          ...organizationActivities.filter((a: any) => a.projectId === p.id && a.userId != null).map((a: any) => a.userId),
        ]);

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          completionPercentage: calculatedCompletion, // Hours + milestones weighted calculation
          expectedHours: expectedHours,
          sdgGoals: p.sdgGoals || [],
          location: p.location,
          totalHours: projectHours,
          volunteerCount: projectVolunteerIds.size,
          livesTouched: projectLivesTouched,
          aiuEarned: projectAiuEarned,
          // Milestone tracking data
          milestones: milestones || [],
          milestonesCompleted: milestones ? milestones.filter(m => m.status === 'completed').length : 0,
          milestonesTotal: milestones ? milestones.length : 0,
          // Completion breakdown for transparency
          completionBreakdown: {
            hoursProgress: Math.round(hoursProgress),
            milestoneProgress: Math.round(milestoneProgress),
            hoursWeight,
            milestonesWeight,
          },
        };
      }),
      volunteerSummaries: volunteerSummaries.slice(0, 10),
      pendingTasks: pendingTasks.slice(0, 5),
      quickActions,
      filters: {
        projectId: projectFilter || 'all',
        timePeriod: timePeriod || 'all',
        availableProjects: allOrganizationProjects.map(p => ({ id: p.id, name: p.name })),
      },
    });

    // Persist KPIs after dashboard computation (fire-and-forget)
    persistOrganizationKPIs(organizationId).catch(err =>
      logger.error("[KPI] Error persisting org KPIs after dashboard load:", err)
    );
  } catch (err) {
    logger.error("Error fetching organization dashboard:", err);
    res.status(500).json({ message: "Failed to fetch organization dashboard" });
  }
});

// GET /api/dashboard/summary - General dashboard summary
// Delegates to service layer based on user type (organization or volunteer)
dashboardRouter.get("/summary", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userIdNum = authUser.id;

    // Get user to determine type
    const user = await storage.getUser(userIdNum);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Use secure service layer based on user type
    if (user.userType === 'organization') {
      const dashboardData = await getDashboardDataForOrganization(userIdNum);
      // Return full dashboard data with enriched projects and volunteers
      res.json({
        ...dashboardData.summary,
        projectsWithVolunteers: dashboardData.projectsWithVolunteers,
        volunteerSummaries: dashboardData.volunteerSummaries,
        tasks: dashboardData.tasks,
        activities: dashboardData.activities,
        impacts: dashboardData.impacts,
        monthlyImpactData: dashboardData.monthlyImpactData,
        monthlyImpactTrend: dashboardData.monthlyImpactTrend,
        impactGrowthSeries: dashboardData.impactGrowthSeries,
        projectHours: dashboardData.projectHours,
        totalPeopleImpacted: dashboardData.totalPeopleImpacted,
        projects: dashboardData.projects,
      });

      // Persist org KPIs after dashboard computation (fire-and-forget)
      const orgId = user.organizationId || userIdNum;
      persistOrganizationKPIs(orgId).catch(err =>
        logger.error("[KPI] Error persisting org KPIs after summary load:", err)
      );
    } else if (user.userType === 'volunteer') {
      const dashboardData = await getDashboardDataForVolunteer(userIdNum);
      // Return full dashboard data with all arrays needed for charts
      res.json({
        ...dashboardData.summary,
        volunteerProfile: dashboardData.volunteerProfile,
        applicationStats: dashboardData.applicationStats,
        hoursByProject: dashboardData.hoursByProject,
        monthlyImpactTrend: dashboardData.monthlyImpactTrend,
        monthlyImpactData: dashboardData.monthlyImpactData,
        impactGrowthSeries: dashboardData.impactGrowthSeries,
        projects: dashboardData.projects,
        tasks: dashboardData.tasks,
        activities: dashboardData.activities,
        impacts: dashboardData.impacts,
        applications: dashboardData.applications,
        matchedOpportunities: dashboardData.matchedOpportunities,
        projectAssignments: dashboardData.projectAssignments,
      });

      // Persist volunteer KPIs after dashboard computation (fire-and-forget)
      persistVolunteerKPIs(userIdNum).catch(err =>
        logger.error("[KPI] Error persisting volunteer KPIs after summary load:", err)
      );
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }
  } catch (err) {
    logger.error("Error fetching dashboard summary:", err);
    res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
});

// GET /api/dashboard/sdg-contributions - SDG contributions overview
// Organization-only endpoint for SDG impact tracking
dashboardRouter.get("/sdg-contributions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userIdNum = authUser.id;

    // Get user to determine type
    const user = await storage.getUser(userIdNum);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only organizations can access SDG contributions overview
    if (user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organizations can access SDG contributions" });
    }

    const sdgData = await getSDGContributionsForOrganization(userIdNum);
    res.json(sdgData);
  } catch (err) {
    logger.error("Error fetching SDG contributions:", err);
    res.status(500).json({ message: "Failed to fetch SDG contributions" });
  }
});

// GET /api/dashboard/kpis/:entityType/:entityId - Read persisted KPI snapshot
// Returns pre-computed KPIs for a volunteer or organization
dashboardRouter.get("/dashboard/kpis/:entityType/:entityId", async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    if (entityType !== 'volunteer' && entityType !== 'organization') {
      return res.status(400).json({ message: "entityType must be 'volunteer' or 'organization'" });
    }

    const entityIdNum = parseInt(entityId);
    if (isNaN(entityIdNum)) {
      return res.status(400).json({ message: "entityId must be a valid number" });
    }

    const snapshot = await storage.getKpiSnapshot(entityType, entityIdNum);
    if (!snapshot) {
      return res.status(404).json({ message: "No KPI snapshot found for this entity" });
    }

    res.json(snapshot);
  } catch (err) {
    logger.error("Error fetching KPI snapshot:", err);
    res.status(500).json({ message: "Failed to fetch KPI snapshot" });
  }
});

// GET /api/organization/kpi-status - Returns KPI setup status for all org projects
dashboardRouter.get("/organization/kpi-status", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const user = await storage.getUser(authUser.id);
    if (!user || user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organizations can access this endpoint" });
    }

    const organizationId = user.organizationId || authUser.id;
    const projects = await storage.listProjectsByOrganization(organizationId);

    if (projects.length === 0) {
      return res.json({ projects: [], missingKpiCount: 0, totalProjects: 0 });
    }

    const projectIds = projects.map(p => p.id);
    const existingSettings = await db
      .select({ projectId: projectAiuSettings.projectId })
      .from(projectAiuSettings)
      .where(inArray(projectAiuSettings.projectId, projectIds));

    const projectsWithSettings = new Set(existingSettings.map(s => s.projectId));

    const kpiSnapshot = await storage.getKpiSnapshot('organization', organizationId);

    const projectStatuses = projects.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      hasKpiSettings: projectsWithSettings.has(p.id),
      impactMetricName: p.impactMetricName || null,
      impactMetricUnit: p.impactMetricUnit || null,
    }));

    res.json({
      projects: projectStatuses,
      missingKpiCount: projectStatuses.filter(p => !p.hasKpiSettings).length,
      totalProjects: projects.length,
      lastSync: kpiSnapshot?.computedAt || null,
    });
  } catch (err) {
    logger.error("Error fetching KPI status:", err);
    res.status(500).json({ message: "Failed to fetch KPI status" });
  }
});

// POST /api/organization/sync-kpis - Recalculate and persist KPIs for org + auto-seed missing project KPI settings
dashboardRouter.post("/organization/sync-kpis", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const user = await storage.getUser(authUser.id);
    if (!user || user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organizations can access this endpoint" });
    }

    const organizationId = user.organizationId || authUser.id;
    const projects = await storage.listProjectsByOrganization(organizationId);

    // Auto-seed project_aiu_settings for projects that have impactMetricName but no settings yet
    let seeded = 0;
    for (const project of projects) {
      if (!project.impactMetricName) continue;

      const [existing] = await db
        .select({ id: projectAiuSettings.id })
        .from(projectAiuSettings)
        .where(eq(projectAiuSettings.projectId, project.id))
        .limit(1);

      if (!existing) {
        const primarySdg = project.primarySdg || (project.sdgGoals && project.sdgGoals[0]) || 4;
        await db.insert(projectAiuSettings).values({
          projectId: project.id,
          sdgIndicator: `SDG ${primarySdg}.1.1`,
          kpiName: project.impactMetricName,
          kpiUnit: project.impactMetricUnit || 'units',
          kpiBefore: 0,
          kpiAfter: null,
          attributionFactor: 0.2,
          verificationStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        seeded++;
      }
    }

    // Recalculate and persist org KPIs
    await persistOrganizationKPIs(organizationId);

    const kpiSnapshot = await storage.getKpiSnapshot('organization', organizationId);

    res.json({
      success: true,
      message: `KPIs synced successfully. ${seeded} new KPI setting(s) created.`,
      seeded,
      totalProjects: projects.length,
      snapshot: kpiSnapshot,
    });
  } catch (err) {
    logger.error("Error syncing KPIs:", err);
    res.status(500).json({ message: "Failed to sync KPIs" });
  }
});

// GET /api/organization/report - Generate structured report data for organizations
// Supports filtering by projectId and/or date range (startDate+endDate or timePeriod)
dashboardRouter.get("/organization/report", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    if (authUser.userType !== 'organization') {
      return res.status(403).json({ message: "Only organizations can access this report" });
    }

    const user = await storage.getUser(authUser.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const organizationId = user.organizationId || authUser.id;
    const projectFilter = req.query.projectId as string | undefined;
    const timePeriod = req.query.timePeriod as string | undefined;
    const startDateParam = req.query.startDate as string | undefined;
    const endDateParam = req.query.endDate as string | undefined;

    // Resolve date range
    let startDate = new Date(0);
    let endDate = new Date();
    let filterByDate = false;

    if (startDateParam && endDateParam) {
      const s = new Date(startDateParam);
      const e = new Date(endDateParam);
      if (isValidDate(s) && isValidDate(e)) {
        startDate = s;
        endDate = new Date(e.setHours(23, 59, 59, 999));
        filterByDate = true;
      }
    } else if (timePeriod && timePeriod !== 'all') {
      filterByDate = true;
      if (timePeriod === '7d') {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (timePeriod === '30d') {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      } else if (timePeriod === '90d') {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      } else if (timePeriod === '1y') {
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      }
    }

    // Fetch all org projects then filter
    const allProjects = await storage.listProjectsByOrganization(organizationId);
    let reportProjects = allProjects;
    if (projectFilter && projectFilter !== 'all') {
      const fId = parseInt(projectFilter);
      if (!isNaN(fId)) reportProjects = reportProjects.filter(p => p.id === fId);
    }
    const projectIds = reportProjects.map(p => p.id);

    if (projectIds.length === 0) {
      return res.json({
        summary: { totalHours: 0, verifiedHours: 0, totalVolunteers: 0, totalProjects: 0, activeProjects: 0, completedProjects: 0, peopleImpacted: 0, sdgsAddressed: 0, aiuEarned: 0 },
        projects: [],
        volunteers: [],
        sdgDistribution: [],
        activityLog: [],
        generatedAt: new Date().toISOString(),
      });
    }

    // Batch fetch
    const [allActivities, allImpacts, allAssignments, allImpactMetrics] = await Promise.all([
      storage.listVolunteerActivitiesByProjectIds(projectIds),
      storage.listProjectImpactsByProjectIds(projectIds),
      storage.listProjectAssignmentsByProjectIds(projectIds),
      storage.listImpactMetrics(),
    ]);

    // Apply date filter
    const activities = filterByDate
      ? allActivities.filter(a => { const d = new Date(a.date); return isValidDate(d) && d >= startDate && d <= endDate; })
      : allActivities;
    const impacts = filterByDate
      ? allImpacts.filter(i => { const d = new Date((i as any).date || (i as any).createdAt); return isValidDate(d) && d >= startDate && d <= endDate; })
      : allImpacts;

    // People-related metrics
    const peopleMetricIds = new Set(
      allImpactMetrics
        .filter(m => {
          const kw = ['people', 'person', 'beneficiar', 'student', 'child', 'family', 'participant', 'recipient', 'meal', 'service'];
          return kw.some(k => (m.unit || '').toLowerCase().includes(k) || (m.name || '').toLowerCase().includes(k));
        })
        .map(m => m.id)
    );

    // Summary metrics
    const totalHours = activities.reduce((s, a) => s + safeNumber(a.hours), 0);
    const verifiedHours = activities
      .filter(a => (a as any).verificationStatus === 'approved' || (a as any).verificationStatus === 'verified')
      .reduce((s, a) => s + safeNumber(a.hours), 0);
    const uniqueVolunteerIds = new Set(allAssignments.map(a => a.volunteerId));
    const peopleImpacted = impacts
      .filter(i => i.metricId && peopleMetricIds.has(i.metricId))
      .reduce((s, i) => s + safeNumber(i.value), 0);
    const uniqueSDGs = new Set<number>(reportProjects.flatMap(p => (p.sdgGoals as number[]) || []));
    const activeProjects = reportProjects.filter(p => ['active', 'in progress'].includes((p.status || '').toLowerCase())).length;
    const completedProjects = reportProjects.filter(p => (p.status || '').toLowerCase() === 'completed').length;

    // AIU calculation
    let aiuEarned = 0;
    try {
      const aiuResult = await calculateOrganizationAIU(organizationId, {
        projectId: projectFilter && projectFilter !== 'all' ? parseInt(projectFilter) : undefined,
        startDate: filterByDate ? startDate : undefined,
        endDate: filterByDate ? endDate : undefined,
      });
      aiuEarned = aiuResult?.totalAiu || 0;
    } catch { /* fallback below */ }
    if (aiuEarned === 0 && totalHours > 0) {
      aiuEarned = Math.round((totalHours / 50) * Math.min(1 + uniqueSDGs.size * 0.1, 2.0) * 100) / 100;
    }

    // Per-project breakdown
    const projectsBreakdown = reportProjects.map(p => {
      const pActivities = activities.filter(a => a.projectId === p.id);
      const pHours = pActivities.reduce((s, a) => s + safeNumber(a.hours), 0);
      const pVerifiedHours = pActivities
        .filter(a => ['approved', 'verified'].includes((a as any).verificationStatus || ''))
        .reduce((s, a) => s + safeNumber(a.hours), 0);
      const pVolunteers = new Set(allAssignments.filter(a => a.projectId === p.id).map(a => a.volunteerId)).size;
      const pImpact = impacts
        .filter(i => i.projectId === p.id && i.metricId && peopleMetricIds.has(i.metricId))
        .reduce((s, i) => s + safeNumber(i.value), 0);
      return {
        id: p.id,
        name: p.name,
        status: p.status || 'active',
        sdgGoals: (p.sdgGoals as number[]) || [],
        totalHours: Math.round(pHours * 10) / 10,
        verifiedHours: Math.round(pVerifiedHours * 10) / 10,
        volunteerCount: pVolunteers,
        peopleImpacted: pImpact,
        completionPercentage: p.completionPercentage || 0,
        location: p.location || null,
        startDate: p.startDate || null,
        endDate: p.endDate || null,
      };
    });

    // Volunteer contributions
    const volunteerActivityMap: Record<number, { hours: number; activities: number; verifiedHours: number }> = {};
    activities.forEach(a => {
      if (a.userId == null) return;
      const uid = a.userId;
      if (!volunteerActivityMap[uid]) volunteerActivityMap[uid] = { hours: 0, activities: 0, verifiedHours: 0 };
      volunteerActivityMap[uid].hours += safeNumber(a.hours);
      volunteerActivityMap[uid].activities += 1;
      if (['approved', 'verified'].includes((a as any).verificationStatus || '')) {
        volunteerActivityMap[uid].verifiedHours += safeNumber(a.hours);
      }
    });
    const volunteerIds = Array.from(uniqueVolunteerIds);
    const volunteerUsers = await storage.getUsersByIds(volunteerIds);
    const volunteersBreakdown = volunteerUsers.map(u => ({
      id: u.id,
      displayName: u.displayName || u.username,
      avatar: u.avatar || null,
      hours: Math.round((volunteerActivityMap[u.id]?.hours || 0) * 10) / 10,
      verifiedHours: Math.round((volunteerActivityMap[u.id]?.verifiedHours || 0) * 10) / 10,
      activitiesCount: volunteerActivityMap[u.id]?.activities || 0,
    })).sort((a, b) => b.hours - a.hours);

    // SDG distribution
    const sdgMap: Record<number, { hours: number; projects: number; volunteers: number }> = {};
    reportProjects.forEach(p => {
      const pHours = activities.filter(a => a.projectId === p.id).reduce((s, a) => s + safeNumber(a.hours), 0);
      const pVols = new Set(allAssignments.filter(a => a.projectId === p.id).map(a => a.volunteerId)).size;
      ((p.sdgGoals as number[]) || []).forEach(goal => {
        if (!sdgMap[goal]) sdgMap[goal] = { hours: 0, projects: 0, volunteers: 0 };
        sdgMap[goal].hours += pHours;
        sdgMap[goal].projects += 1;
        sdgMap[goal].volunteers += pVols;
      });
    });
    const sdgDistribution = Object.entries(sdgMap).map(([goal, data]) => ({
      sdg: parseInt(goal),
      hours: Math.round(data.hours * 10) / 10,
      projects: data.projects,
      volunteers: data.volunteers,
    })).sort((a, b) => b.hours - a.hours);

    // Recent activity log (last 50 entries)
    const activityLog = activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50)
      .map(a => {
        const project = reportProjects.find(p => p.id === a.projectId);
        return {
          id: a.id,
          userId: a.userId,
          projectId: a.projectId,
          projectName: project?.name || 'Unknown',
          hours: a.hours || 0,
          date: a.date,
          description: a.description || '',
          verificationStatus: (a as any).verificationStatus || 'pending',
          skillsApplied: (a as any).skillsApplied || [],
        };
      });

    res.json({
      summary: {
        totalHours: Math.round(totalHours * 10) / 10,
        verifiedHours: Math.round(verifiedHours * 10) / 10,
        totalVolunteers: uniqueVolunteerIds.size,
        totalProjects: reportProjects.length,
        activeProjects,
        completedProjects,
        peopleImpacted,
        sdgsAddressed: uniqueSDGs.size,
        aiuEarned,
      },
      projects: projectsBreakdown,
      volunteers: volunteersBreakdown,
      sdgDistribution,
      activityLog,
      filters: {
        projectId: projectFilter || 'all',
        timePeriod: timePeriod || 'all',
        startDate: filterByDate ? startDate.toISOString() : null,
        endDate: filterByDate ? endDate.toISOString() : null,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Error generating organization report:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
});
