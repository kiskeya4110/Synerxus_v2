import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import {
  getDashboardDataForOrganization,
  getDashboardDataForVolunteer,
  getSDGContributionsForOrganization
} from "../dashboard-service";
import { calculateProjectAIU } from "../aiu-service";

export const dashboardRouter = Router();

// =============================================================================
// ETAG SUPPORT FOR CONDITIONAL REQUESTS
// =============================================================================

/**
 * Generate ETag from response data
 * Uses MD5 hash for fast comparison
 */
function generateETag(data: any): string {
  const hash = crypto.createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash}"`;
}

/**
 * Check if client has fresh data (304 Not Modified)
 * Returns true if we should return 304 status
 */
function checkConditionalRequest(req: Request, etag: string): boolean {
  const clientETag = req.headers['if-none-match'];
  return clientETag === etag;
}

/**
 * Send JSON response with ETag support
 * Automatically handles conditional requests
 */
function sendWithETag(req: Request, res: Response, data: any, maxAge: number = 30): void {
  const etag = generateETag(data);

  // Set caching headers
  res.set({
    'ETag': etag,
    'Cache-Control': `private, max-age=${maxAge}`,
    'Vary': 'Accept-Encoding',
  });

  // Check if client has fresh data
  if (checkConditionalRequest(req, etag)) {
    res.status(304).end();
    return;
  }

  res.json(data);
}

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
dashboardRouter.get("/organization", async (req: Request, res: Response) => {
  try {
    // Cache dashboard data for 30 seconds to improve performance
    res.set('Cache-Control', 'private, max-age=30');

    const userId = req.query.userId as string | undefined;
    const projectFilter = req.query.projectId as string | undefined;
    const timePeriod = req.query.timePeriod as string | undefined;

    if (!userId) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    const user = await storage.getUser(userIdNum);
    if (!user || user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organizations can access this dashboard" });
    }

    const organizationId = user.organizationId || userIdNum;

    // Fetch all data
    const allProjects = await storage.listProjects();
    const allTasks = await storage.listTasks();
    const allActivities = await storage.listVolunteerActivities();
    const allImpacts = await storage.listProjectImpacts();
    const allProjectAssignments = await storage.listProjectAssignments();
    const allUsers = await storage.listUsers();
    const allImpactMetrics = await storage.listImpactMetrics();

    // Filter to organization's projects
    let organizationProjects = allProjects.filter(p => p.organizationId === organizationId);

    // Apply project filter if specified
    if (projectFilter && projectFilter !== 'all') {
      const filterProjectId = parseInt(projectFilter);
      organizationProjects = organizationProjects.filter(p => p.id === filterProjectId);
    }

    const organizationProjectIds = new Set(organizationProjects.map(p => p.id));

    // Apply time period filter for activities/impacts
    let startDate = new Date(0);
    const endDate = new Date();
    if (timePeriod === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '90d') {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    } else if (timePeriod === '1y') {
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    }

    // Filter data
    const organizationTasks = allTasks.filter(t => t.projectId && organizationProjectIds.has(t.projectId));
    const organizationActivities = allActivities.filter(a => {
      if (!a.projectId || !organizationProjectIds.has(a.projectId)) return false;
      const activityDate = new Date(a.date);
      return activityDate >= startDate && activityDate <= endDate;
    });
    const organizationImpacts = allImpacts.filter(i => {
      if (!i.projectId || !organizationProjectIds.has(i.projectId)) return false;
      const impactDate = new Date(i.date);
      return impactDate >= startDate && impactDate <= endDate;
    });
    const organizationAssignments = allProjectAssignments.filter(pa => organizationProjectIds.has(pa.projectId));

    // Get volunteers
    const volunteerIds = new Set(organizationAssignments.map(pa => pa.volunteerId));
    const organizationVolunteers = allUsers.filter(u => u.userType === 'volunteer' && volunteerIds.has(u.id));

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

    const totalHours = organizationActivities.reduce((sum, a) => sum + a.hours, 0);

    const uniqueSDGs = new Set<number>();
    organizationProjects.forEach(project => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach(goal => uniqueSDGs.add(goal));
      }
    });

    const totalPeopleImpacted = organizationImpacts
      .filter(i => i.metricId && peopleMetricIds.has(i.metricId))
      .reduce((sum, i) => sum + (i.value || 0), 0);

    // Calculate total AIU earned using the proper calculateProjectAIU service
    // This respects projectAiuSettings from the database for consistent calculations
    let totalAiuEarned = 0;
    const projectAiuMap: Map<number, number> = new Map();

    for (const project of organizationProjects) {
      try {
        const aiuSummary = await calculateProjectAIU(project.id);
        if (aiuSummary) {
          projectAiuMap.set(project.id, aiuSummary.totalAiu);
          totalAiuEarned += aiuSummary.totalAiu;
        }
      } catch (error) {
        console.error(`Error calculating AIU for project ${project.id}:`, error);
        // Fallback to basic calculation if AIU service fails
        const projectHours = organizationActivities
          .filter(a => a.projectId === project.id)
          .reduce((sum, a) => sum + a.hours, 0);
        const projectImpacts = organizationImpacts.filter(i => i.projectId === project.id);
        const livesImpacted = projectImpacts
          .filter(i => i.metricId && peopleMetricIds.has(i.metricId))
          .reduce((sum, i) => sum + (i.value || 0), 0);
        const attributionFactor = 0.2;
        const hoursNormalization = Math.max(projectHours, 1) / 10;
        const fallbackAiu = Math.round((livesImpacted * attributionFactor) / Math.max(hoursNormalization, 1) * 100) / 100;
        projectAiuMap.set(project.id, fallbackAiu);
        totalAiuEarned += fallbackAiu;
      }
    }
    totalAiuEarned = Math.round(totalAiuEarned * 100) / 100;

    // SDG Distribution
    const sdgDistribution: Record<number, { hours: number; projects: number; volunteers: number }> = {};
    organizationProjects.forEach(project => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        const projectHours = organizationActivities
          .filter(a => a.projectId === project.id)
          .reduce((sum, a) => sum + a.hours, 0);
        const projectVolunteers = organizationAssignments
          .filter(pa => pa.projectId === project.id)
          .map(pa => pa.volunteerId);

        project.sdgGoals.forEach(goal => {
          if (!sdgDistribution[goal]) {
            sdgDistribution[goal] = { hours: 0, projects: 0, volunteers: 0 };
          }
          sdgDistribution[goal].hours += projectHours;
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

    // Impact Over Time (last 12 months)
    const last12Months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last12Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const impactOverTime = last12Months.map(monthKey => {
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
        hours: monthActivities.reduce((sum, a) => sum + a.hours, 0),
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
        hours: vActivities.reduce((sum, a) => sum + a.hours, 0),
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

    // Build response data
    const responseData = {
      keyMetrics: {
        activeProjects,
        totalProjects: organizationProjects.length,
        totalHours,
        sdgsAddressed: uniqueSDGs.size,
        aiuEarned: totalAiuEarned, // Properly calculated AIU replacing raw livesTouched
        livesTouched: totalPeopleImpacted, // Keep for backwards compatibility
        activeVolunteers: organizationVolunteers.length,
      },
      sdgDistribution: Object.entries(sdgDistribution).map(([goal, data]) => ({
        goal: parseInt(goal),
        ...data,
      })).sort((a, b) => a.goal - b.goal),
      projectLocations,
      alerts,
      impactOverTime,
      aiInsights,
      projects: organizationProjects.map(p => {
        // Calculate hours for this project
        const projectHours = organizationActivities
          .filter(a => a.projectId === p.id)
          .reduce((sum, a) => sum + a.hours, 0);

        // Calculate people impacted for this project
        const projectImpacts = organizationImpacts.filter(i => i.projectId === p.id);
        const projectLivesTouched = projectImpacts
          .filter(i => i.metricId && peopleMetricIds.has(i.metricId))
          .reduce((sum, i) => sum + (i.value || 0), 0);

        // Use AIU from proper calculation (already computed above)
        const projectAiuEarned = projectAiuMap.get(p.id) || 0;

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          completionPercentage: p.completionPercentage || 0,
          sdgGoals: p.sdgGoals || [],
          location: p.location,
          totalHours: projectHours,
          livesTouched: projectLivesTouched,
          aiuEarned: projectAiuEarned,
        };
      }),
      volunteerSummaries: volunteerSummaries.slice(0, 10),
      pendingTasks: pendingTasks.slice(0, 5),
      quickActions,
      filters: {
        projectId: projectFilter || 'all',
        timePeriod: timePeriod || 'all',
        availableProjects: allProjects.filter(p => p.organizationId === organizationId).map(p => ({ id: p.id, name: p.name })),
      },
    };

    // OPTIMIZATION: Use ETag for conditional requests
    sendWithETag(req, res, responseData, 30);
  } catch (err) {
    console.error("Error fetching organization dashboard:", err);
    res.status(500).json({ message: "Failed to fetch organization dashboard" });
  }
});

// GET /api/dashboard/summary - General dashboard summary
// Delegates to service layer based on user type (organization or volunteer)
// OPTIMIZATION: Uses ETag for conditional requests (reduces bandwidth on repeat fetches)
dashboardRouter.get("/summary", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;

    if (!userId) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    // Get user to determine type
    const user = await storage.getUser(userIdNum);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Use secure service layer based on user type
    if (user.userType === 'organization') {
      const dashboardData = await getDashboardDataForOrganization(userIdNum);
      // Return full dashboard data with enriched projects and volunteers
      const responseData = {
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
      };
      // Use ETag support for conditional requests
      sendWithETag(req, res, responseData, 30);
    } else if (user.userType === 'volunteer') {
      const dashboardData = await getDashboardDataForVolunteer(userIdNum);
      // Return full dashboard data with all arrays needed for charts
      const responseData = {
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
      };
      // Use ETag support for conditional requests
      sendWithETag(req, res, responseData, 30);
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }
  } catch (err) {
    console.error("Error fetching dashboard summary:", err);
    res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
});

// GET /api/dashboard/sdg-contributions - SDG contributions overview
// Organization-only endpoint for SDG impact tracking
// OPTIMIZATION: Added ETag support and caching for expensive SDG calculations
dashboardRouter.get("/sdg-contributions", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;

    if (!userId) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

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

    // Use ETag for conditional requests (reduces bandwidth on repeat fetches)
    sendWithETag(req, res, sdgData, 60); // 60 second max-age for SDG data
  } catch (err) {
    console.error("Error fetching SDG contributions:", err);
    res.status(500).json({ message: "Failed to fetch SDG contributions" });
  }
});
