import { storage } from "./storage";
import { calculateMatchScore } from "./matching-algorithm";
import { User, Opportunity } from "@shared/schema";

/**
 * Default match threshold for displaying projects to volunteers
 * Projects below this score will not be shown in volunteer dashboard
 */
const DEFAULT_MATCH_THRESHOLD = 40; // 40% match minimum

/**
 * Get visible project IDs for a volunteer based on assignments and AI matches
 * Enforces status-aware visibility rules:
 * - Include projects with active, completed, or on-hold assignments (accepted assignments only)
 * - Exclude projects with pending or declined assignments
 * - Optionally include AI-matched opportunities above threshold
 */
export async function getVisibleProjectIdsForVolunteer(
  volunteerId: number, 
  includeAIMatches: boolean = false,
  matchThreshold: number = DEFAULT_MATCH_THRESHOLD
): Promise<Set<number>> {
  const visibleProjectIds = new Set<number>();

  // OPTIMIZATION: Query only this volunteer's assignments instead of all assignments (N+1 fix)
  const volunteerAssignments = await storage.listProjectAssignmentsByVolunteer(volunteerId);
  
  // Filter for accepted assignments only (active, completed, on-hold)
  volunteerAssignments.forEach(pa => {
    const status = pa.status?.toLowerCase() || '';
    // Include: active, completed, on-hold (accepted assignments only)
    // Exclude: pending (not yet accepted), declined (rejected)
    if (status !== 'declined' && status !== 'pending') {
      visibleProjectIds.add(pa.projectId);
    }
  });

  // Optionally include AI-matched opportunities with high scores
  if (includeAIMatches) {
    try {
      const matchedOpportunities = await getProjectsForVolunteer(volunteerId, matchThreshold);
      matchedOpportunities.forEach((opp: any) => {
        if (opp.projectId) {
          visibleProjectIds.add(opp.projectId);
        }
      });
    } catch (error) {
      console.error("Error getting AI-matched projects:", error);
      // Continue without AI matches if there's an error
    }
  }

  return visibleProjectIds;
}

/**
 * Shared utility: Calculate total people impacted from impact metrics
 * Filters impacts to only people-related metrics and sums their values
 */
function calculatePeopleImpacted(impacts: any[], peopleMetricIds: Set<number>): number {
  return impacts
    .filter(i => i.metricId && peopleMetricIds.has(i.metricId))
    .reduce((sum, i) => sum + (i.value || 0), 0);
}

/**
 * Shared utility: Build monthly and cumulative impact time series
 * Used by both volunteer and organization dashboards to ensure consistent calculations
 */
interface MonthlyImpactSeries {
  monthly: Array<{ month: string; hours: number; peopleImpacted: number }>;
  cumulative: Array<{ month: string; cumulativeHours: number; cumulativePeople: number; monthlyHours: number; monthlyPeople: number }>;
}

function buildMonthlyImpactSeries(
  monthKeys: string[],
  scopedActivities: any[],
  scopedImpacts: any[],
  peopleMetricIds: Set<number>
): MonthlyImpactSeries {
  // OPTIMIZATION: Single pass - group activities and impacts by month instead of filtering multiple times
  const activitiesByMonth: Record<string, any[]> = {};
  const impactsByMonth: Record<string, any[]> = {};

  // Group activities by month
  scopedActivities.forEach(a => {
    const activityDate = new Date(a.date);
    const monthKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
    if (!activitiesByMonth[monthKey]) activitiesByMonth[monthKey] = [];
    activitiesByMonth[monthKey].push(a);
  });

  // Group impacts by month
  scopedImpacts.forEach(i => {
    const impactDate = new Date(i.date);
    const monthKey = `${impactDate.getFullYear()}-${String(impactDate.getMonth() + 1).padStart(2, '0')}`;
    if (!impactsByMonth[monthKey]) impactsByMonth[monthKey] = [];
    impactsByMonth[monthKey].push(i);
  });

  // Single pass through months to build all data
  const monthlyImpactData = monthKeys.map(monthKey => {
    const monthActivities = activitiesByMonth[monthKey] || [];
    const hours = monthActivities.reduce((sum, a) => sum + a.hours, 0);
    const monthImpacts = impactsByMonth[monthKey] || [];
    const peopleImpacted = calculatePeopleImpacted(monthImpacts, peopleMetricIds);

    return {
      month: monthKey,
      hours,
      peopleImpacted,
    };
  });

  // Build cumulative growth series
  let cumulativeHours = 0;
  let cumulativePeople = 0;
  
  const impactGrowthSeries = monthlyImpactData.map(monthData => {
    cumulativeHours += monthData.hours;
    cumulativePeople += monthData.peopleImpacted;

    return {
      month: monthData.month,
      cumulativeHours,
      cumulativePeople,
      monthlyHours: monthData.hours,
      monthlyPeople: monthData.peopleImpacted,
    };
  });

  return {
    monthly: monthlyImpactData,
    cumulative: impactGrowthSeries,
  };
}

/**
 * Calculate organization impact score with normalized weighted metrics
 * @param params - Monthly metrics and normalization baselines
 * @returns Impact score (0-100)
 */
function calculateOrganizationImpactScore(params: {
  hours: number;
  beneficiaries: number;
  completedTasks: number;
  totalTasks: number;
  volunteers: number;
  sdgCount: number;
  maxHours: number;
  maxBeneficiaries: number;
  maxVolunteers: number;
  maxSDGs: number;
}): number {
  const {
    hours, beneficiaries, completedTasks, totalTasks, volunteers, sdgCount,
    maxHours, maxBeneficiaries, maxVolunteers, maxSDGs
  } = params;

  // Normalize each metric (0-100 scale) with fallbacks for zero denominators
  const hoursScore = maxHours > 0 ? Math.min((hours / maxHours) * 100, 100) : 0;
  const beneficiariesScore = maxBeneficiaries > 0 ? Math.min((beneficiaries / maxBeneficiaries) * 100, 100) : 0;
  const completionsScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const engagementScore = maxVolunteers > 0 ? (volunteers / maxVolunteers) * 100 : 0;
  const sdgScore = maxSDGs > 0 ? (sdgCount / maxSDGs) * 100 : 0;

  // Weighted average (hours: 35%, beneficiaries: 25%, completions: 15%, engagement: 15%, SDG: 10%)
  return Math.round(
    hoursScore * 0.35 +
    beneficiariesScore * 0.25 +
    completionsScore * 0.15 +
    engagementScore * 0.15 +
    sdgScore * 0.10
  );
}

/**
 * Get projects for a volunteer filtered by AI matching algorithm
 * Only returns opportunities above the match threshold
 */
export async function getProjectsForVolunteer(volunteerId: number, matchThreshold: number = DEFAULT_MATCH_THRESHOLD) {
  try {
    // Get the volunteer user
    const volunteer = await storage.getUser(volunteerId);
    if (!volunteer || volunteer.userType !== 'volunteer') {
      throw new Error("User is not a volunteer");
    }

    // Get volunteer profile from separate table
    const allProfiles = await storage.listVolunteerProfiles();
    const volunteerProfile = allProfiles.find(p => p.userId === volunteerId) || null;

    // Get all opportunities
    const opportunities = await storage.listOpportunities();
    
    // Get all organizations to enrich opportunities with organization names
    const allOrganizations = await storage.listOrganizations();
    const organizationMap = new Map(allOrganizations.map(org => [org.id, org]));
    
    // Combine user and profile for matching algorithm
    const volunteerWithProfile = { ...volunteer, profile: volunteerProfile };

    // Calculate match scores for each opportunity and enrich with organization data
    const matchedOpportunities = opportunities
      .map((opportunity: Opportunity) => {
        const matchResult = calculateMatchScore(volunteerWithProfile, opportunity);
        const organization = organizationMap.get(opportunity.organizationId);
        
        return {
          ...opportunity,
          organizationName: organization?.name || "Unknown Organization",
          matchScore: matchResult.score,
          matchPercentage: matchResult.score, // For frontend compatibility
          matchBreakdown: matchResult.breakdown,
          matchReasons: matchResult.reasons,
        };
      })
      .filter(opp => opp.matchScore >= matchThreshold)
      .sort((a, b) => b.matchScore - a.matchScore); // Sort by match score desc

    return matchedOpportunities;
  } catch (error) {
    console.error("Error getting projects for volunteer:", error);
    throw error;
  }
}

/**
 * Get all dashboard data for an organization user
 * Strictly scoped to organization's own data with no cross-organization references
 */
export async function getDashboardDataForOrganization(userId: number) {
  try {
    // Get the organization user
    const user = await storage.getUser(userId);
    if (!user || user.userType !== 'organization') {
      throw new Error("User is not an organization");
    }

    // Use organizationId if available, otherwise use userId (user IS the organization)
    const organizationId = user.organizationId || userId;

    // Fetch ALL data (we'll filter below)
    const allProjects = await storage.listProjects();
    const allTasks = await storage.listTasks();
    const allActivities = await storage.listVolunteerActivities();
    const allImpacts = await storage.listProjectImpacts();
    const allProjectAssignments = await storage.listProjectAssignments();
    const allApplications = await storage.listApplications();
    const allUsers = await storage.listUsers();
    const allImpactMetrics = await storage.listImpactMetrics();

    // Filter to ONLY this organization's projects
    const organizationProjects = allProjects.filter(p => p.organizationId === organizationId);
    const organizationProjectIds = new Set(organizationProjects.map(p => p.id));

    // Filter tasks to only those belonging to organization's projects
    const organizationTasks = allTasks.filter(t => t.projectId && organizationProjectIds.has(t.projectId));

    // Filter activities to only those on organization's projects
    const organizationActivities = allActivities.filter(a => a.projectId && organizationProjectIds.has(a.projectId));

    // Filter impacts to only organization's projects
    const organizationImpacts = allImpacts.filter(i => i.projectId && organizationProjectIds.has(i.projectId));
    
    // Identify metrics that represent people/beneficiaries
    // Check unit, category, or name for people-related keywords
    const peopleMetricIds = new Set(
      allImpactMetrics
        .filter(metric => {
          const unit = metric.unit?.toLowerCase() || '';
          const category = metric.category?.toLowerCase() || '';
          const name = metric.name?.toLowerCase() || '';
          // Expanded keywords to capture more human-impact metrics
          const peopleKeywords = [
            'people', 'person', 'beneficiar', 'student', 'child', 'children',
            'adult', 'family', 'families', 'participant', 'recipient',
            'attendee', 'individual', 'community member'
          ];
          const serviceKeywords = [
            'meal', 'service', 'healthcare', 'education', 'training'
          ];
          
          return peopleKeywords.some(keyword => 
            unit.includes(keyword) || category.includes(keyword) || name.includes(keyword)
          ) || serviceKeywords.some(keyword => 
            unit.includes(keyword) || category.includes(keyword) || name.includes(keyword)
          );
        })
        .map(m => m.id)
    );

    // Filter project assignments to only organization's projects
    const organizationAssignments = allProjectAssignments.filter(pa => organizationProjectIds.has(pa.projectId));

    // Filter applications to only organization's opportunities
    const organizationOpportunities = await storage.listOpportunities();
    const orgOpportunityIds = new Set(
      organizationOpportunities
        .filter(opp => opp.organizationId === organizationId)
        .map(opp => opp.id)
    );
    const organizationApplications = allApplications.filter(app => app.opportunityId && orgOpportunityIds.has(app.opportunityId));

    // Get volunteers assigned to organization's projects
    const volunteerIds = new Set(organizationAssignments.map(pa => pa.volunteerId));
    const organizationVolunteers = allUsers.filter(u => u.userType === 'volunteer' && volunteerIds.has(u.id));

    // Get organization profile for selected SDGs
    const allOrgProfiles = await storage.listOrganizationProfiles();
    const organizationProfile = allOrgProfiles.find(p => p.organizationId === organizationId) || null;
    const organizationPrimarySdgs = organizationProfile?.primarySdgs || [];

    // Calculate summary metrics
    const uniqueVolunteerIds = new Set(organizationActivities.map(activity => activity.userId).filter((id): id is number => id !== null));
    const activeVolunteers = uniqueVolunteerIds.size;

    const totalHours = organizationActivities.reduce((sum, activity) => sum + activity.hours, 0);

    const activeProjects = organizationProjects.filter(
      project => {
        const status = project.status?.toLowerCase();
        return status === 'in progress' || status === 'active';
      }
    ).length;

    const completedTasks = organizationTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
    const totalTasks = organizationTasks.length;

    // Count unique SDGs addressed
    const uniqueSDGs = new Set<number>();
    organizationProjects.forEach(project => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach(goal => uniqueSDGs.add(goal));
      }
    });

    // Calculate Impact Score
    const hoursScore = Math.min((totalHours / 100) * 100, 100);
    const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const sdgScore = (uniqueSDGs.size / 17) * 100;
    const acceptedApplications = organizationApplications.filter(app => app.status?.toLowerCase() === 'accepted').length;
    const matchScore = organizationApplications.length > 0
      ? (acceptedApplications / organizationApplications.length) * 100
      : 0;

    const impactScore = Math.round(
      hoursScore * 0.40 +
      tasksScore * 0.30 +
      sdgScore * 0.20 +
      matchScore * 0.10
    );

    // Enrich projects with assigned volunteers and compute progress fallback
    const projectsWithVolunteers = organizationProjects.map(project => {
      // Get volunteers assigned to this project
      const projectVolunteerIds = organizationAssignments
        .filter(pa => pa.projectId === project.id)
        .map(pa => pa.volunteerId);
      
      const assignedVolunteers = organizationVolunteers
        .filter(v => projectVolunteerIds.includes(v.id))
        .map(v => ({
          id: v.id.toString(),
          name: v.displayName || v.username || 'Unknown',
          avatar: v.avatar || undefined,
        }));

      // Compute progress fallback if not set
      let progress = project.completionPercentage || 0;
      if (progress === 0) {
        const projectTasks = organizationTasks.filter(t => t.projectId === project.id);
        if (projectTasks.length > 0) {
          const completedCount = projectTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
          progress = Math.round((completedCount / projectTasks.length) * 100);
        }
      }

      return {
        ...project,
        volunteers: assignedVolunteers,
        completionPercentage: progress,
      };
    });

    // Create volunteer summaries with profile info
    const volunteerSummaries = organizationVolunteers.map(volunteer => {
      const volunteerActivities = organizationActivities.filter(a => a.userId === volunteer.id);
      const totalHours = volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
      const activityCount = volunteerActivities.length;
      
      // Get projects this volunteer is assigned to
      const assignedProjectIds = organizationAssignments
        .filter(pa => pa.volunteerId === volunteer.id)
        .map(pa => pa.projectId);
      const volunteerProjects = organizationProjects.filter(p => assignedProjectIds.includes(p.id));

      return {
        id: volunteer.id,
        name: volunteer.displayName || volunteer.username || 'Unknown Volunteer',
        email: volunteer.email,
        avatar: volunteer.avatar || undefined,
        totalHours,
        activityCount,
        projectCount: volunteerProjects.length,
        projects: volunteerProjects.map(p => p.name),
      };
    });

    // Create a map of project data for quick lookup
    const projectMap = new Map(
      organizationProjects.map(p => [p.id, { name: p.name, status: p.status }])
    );

    // Create a map of user data for assignee lookup
    const userMap = new Map(
      allUsers.map(u => [u.id, { name: u.displayName || u.username || 'Unknown', avatar: u.avatar }])
    );

    // Enrich tasks with project metadata and assignee details
    const tasksWithProjects = organizationTasks.map(task => ({
      ...task,
      projectId: task.projectId,
      projectName: task.projectId ? projectMap.get(task.projectId)?.name || 'Unknown Project' : undefined,
      projectStatus: task.projectId ? projectMap.get(task.projectId)?.status : undefined,
      assignee: task.assigneeId ? {
        id: task.assigneeId.toString(),
        name: userMap.get(task.assigneeId)?.name || 'Unknown',
        avatar: userMap.get(task.assigneeId)?.avatar,
      } : undefined,
    }));

    // Create unified activity feed
    const unifiedActivities: any[] = [];

    // Add volunteer hour logs
    organizationActivities.forEach(activity => {
      if (!activity.userId) return; // Skip if no userId
      const volunteer = userMap.get(activity.userId);
      const project = activity.projectId ? projectMap.get(activity.projectId) : undefined;
      unifiedActivities.push({
        id: `activity-${activity.id}`,
        type: 'hours_logged',
        userId: activity.userId,
        userName: volunteer?.name || 'Unknown Volunteer',
        userAvatar: volunteer?.avatar,
        action: `logged ${activity.hours} hours on`,
        target: project?.name || 'Unknown Project',
        timestamp: new Date(activity.createdAt),
        createdAt: activity.createdAt,
      });
    });

    // Add application submissions
    organizationApplications.forEach(app => {
      const volunteer = userMap.get(app.volunteerId);
      const opportunity = organizationOpportunities.find((o: any) => o.id === app.opportunityId);
      unifiedActivities.push({
        id: `application-${app.id}`,
        type: 'application_submitted',
        userId: app.volunteerId,
        userName: volunteer?.name || 'Unknown Volunteer',
        userAvatar: volunteer?.avatar,
        action: 'applied to',
        target: opportunity?.title || 'Unknown Opportunity',
        timestamp: new Date(app.appliedAt),
        createdAt: app.appliedAt,
      });
    });

    // Add volunteer assignments
    organizationAssignments.forEach(assignment => {
      const volunteer = userMap.get(assignment.volunteerId);
      const project = projectMap.get(assignment.projectId);
      unifiedActivities.push({
        id: `assignment-${assignment.id}`,
        type: 'volunteer_assigned',
        userId: assignment.volunteerId,
        userName: volunteer?.name || 'Unknown Volunteer',
        userAvatar: volunteer?.avatar,
        action: 'was assigned to',
        target: project?.name || 'Unknown Project',
        timestamp: new Date(assignment.assignedAt),
        createdAt: assignment.assignedAt,
      });
    });

    // Add task completions
    const completedTaskActivities = organizationTasks.filter(t => t.status?.toLowerCase() === 'completed');
    completedTaskActivities.forEach(task => {
      const assignee = task.assigneeId ? userMap.get(task.assigneeId) : null;
      const project = task.projectId ? projectMap.get(task.projectId) : undefined;
      unifiedActivities.push({
        id: `task-${task.id}`,
        type: 'task_completed',
        userId: task.assigneeId || null,
        userName: assignee?.name || 'Unknown',
        userAvatar: assignee?.avatar,
        action: 'completed task',
        target: `"${task.title}" in ${project?.name || 'Unknown Project'}`,
        timestamp: new Date(task.updatedAt),
        createdAt: task.updatedAt,
      });
    });

    // Sort by timestamp and get most recent 20
    const recentUnifiedActivities = unifiedActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    // Calculate monthly impact trend (7-month sliding window with two-pass normalization)
    const now = new Date();
    const months: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // First pass: collect metrics for all months
    const monthlyMetrics = months.map(monthKey => {
      // Filter activities for this month
      const monthActivities = organizationActivities.filter(a => {
        const activityDate = new Date(a.date);
        const activityMonthKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
        return activityMonthKey === monthKey;
      });

      // Filter impacts for this month
      const monthImpacts = organizationImpacts.filter(i => {
        const impactDate = new Date(i.date);
        const impactMonthKey = `${impactDate.getFullYear()}-${String(impactDate.getMonth() + 1).padStart(2, '0')}`;
        return impactMonthKey === monthKey;
      });

      // Filter tasks for this month (by creation date)
      const monthTasks = organizationTasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        const taskMonthKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}`;
        return taskMonthKey === monthKey;
      });

      // Calculate monthly aggregates
      const hours = monthActivities.reduce((sum, a) => sum + a.hours, 0);
      const beneficiaries = monthImpacts.reduce((sum, i) => sum + (i.value || 0), 0);
      const completedTasks = monthTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
      const totalTasks = monthTasks.length;
      
      // Count unique volunteers (filter out null userIds)
      const volunteers = new Set(monthActivities.map(a => a.userId).filter((id): id is number => id !== null)).size;
      
      // Count unique SDGs from projects with activities this month
      const monthProjectIds = new Set(monthActivities.map(a => a.projectId).filter((id): id is number => id !== null));
      const sdgs = new Set<number>();
      organizationProjects.forEach(p => {
        if (monthProjectIds.has(p.id) && p.sdgGoals) {
          p.sdgGoals.forEach(sdg => sdgs.add(sdg));
        }
      });
      
      return {
        month: monthKey,
        hours,
        beneficiaries,
        completedTasks,
        totalTasks,
        volunteers,
        sdgCount: sdgs.size,
      };
    });

    // Second pass: compute max values across all months (for normalization)
    const maxHours = Math.max(...monthlyMetrics.map(m => m.hours), 10); // Min 10 to avoid division by zero
    const maxBeneficiaries = Math.max(...monthlyMetrics.map(m => m.beneficiaries), 5); // Min 5
    const maxVolunteers = Math.max(...monthlyMetrics.map(m => m.volunteers), organizationVolunteers.length || 1);
    const maxSDGs = Math.max(organizationPrimarySdgs.length, uniqueSDGs.size, 1); // Use larger of org SDGs or observed SDGs

    // Third pass: calculate scores using normalized values
    const monthlyImpactTrend = monthlyMetrics.map(metrics => ({
      month: metrics.month,
      score: calculateOrganizationImpactScore({
        hours: metrics.hours,
        beneficiaries: metrics.beneficiaries,
        completedTasks: metrics.completedTasks,
        totalTasks: metrics.totalTasks,
        volunteers: metrics.volunteers,
        sdgCount: metrics.sdgCount,
        maxHours,
        maxBeneficiaries,
        maxVolunteers,
        maxSDGs,
      }),
    }));

    // Calculate project hours breakdown for "Total Volunteer Hours by Project" dialog
    const projectHoursMap = new Map<number, { projectId: number; projectName: string; organizationName: string; hours: number }>();
    organizationActivities.forEach(activity => {
      if (!activity.projectId) return;
      
      const project = organizationProjects.find(p => p.id === activity.projectId);
      if (!project) return;
      
      if (!projectHoursMap.has(activity.projectId)) {
        projectHoursMap.set(activity.projectId, {
          projectId: activity.projectId,
          projectName: project.name,
          organizationName: user.displayName || user.username || 'Unknown Organization',
          hours: 0
        });
      }
      
      const entry = projectHoursMap.get(activity.projectId)!;
      entry.hours += activity.hours;
    });
    
    const projectHours = Array.from(projectHoursMap.values()).sort((a, b) => b.hours - a.hours);

    // Calculate real monthly impact data (hours and peopleImpacted) for Impact Over Time chart
    const monthlyImpactData = monthlyMetrics.map(metrics => {
      // Calculate people impacted from impacts table using helper
      const monthImpacts = organizationImpacts.filter(i => {
        const impactDate = new Date(i.date);
        const impactMonthKey = `${impactDate.getFullYear()}-${String(impactDate.getMonth() + 1).padStart(2, '0')}`;
        return impactMonthKey === metrics.month;
      });
      
      const peopleImpacted = calculatePeopleImpacted(monthImpacts, peopleMetricIds);
      
      return {
        month: metrics.month,
        hours: metrics.hours,
        peopleImpacted,
      };
    });

    // Calculate total people impacted using helper
    const totalPeopleImpacted = calculatePeopleImpacted(organizationImpacts, peopleMetricIds);

    // Build cumulative impact growth series for Impact Visualization
    let cumulativeHours = 0;
    let cumulativePeople = 0;
    const impactGrowthSeries = monthlyImpactData.map(monthData => {
      cumulativeHours += monthData.hours;
      cumulativePeople += monthData.peopleImpacted;
      
      return {
        month: monthData.month,
        cumulativeHours,
        cumulativePeople,
        monthlyHours: monthData.hours,
        monthlyPeople: monthData.peopleImpacted,
      };
    });

    // Enrich recent activities with project and organization names (last 10 only)
    const enrichedRecentActivities = recentUnifiedActivities.slice(0, 10).map(activity => {
      // Extract project name from target if it's a task completion
      let projectName = '';
      let organizationName = user.displayName || user.username || 'Unknown Organization';
      
      if (activity.type === 'hours_logged' || activity.type === 'volunteer_assigned') {
        projectName = activity.target;
      } else if (activity.type === 'task_completed') {
        // Extract project name from "Task Title" in ProjectName format
        const match = activity.target.match(/in (.+)$/);
        projectName = match ? match[1] : '';
      }
      
      return {
        ...activity,
        projectName,
        organizationName,
      };
    });

    // Calculate impact by SDG from real project and activity data
    const impactBySDGMap = new Map<number, { sdgGoal: number; hours: number; projects: number; peopleImpacted: number }>();
    
    organizationProjects.forEach(project => {
      if (!project.sdgGoals || !Array.isArray(project.sdgGoals)) return;
      
      project.sdgGoals.forEach(sdgGoal => {
        if (!impactBySDGMap.has(sdgGoal)) {
          impactBySDGMap.set(sdgGoal, {
            sdgGoal,
            hours: 0,
            projects: 0,
            peopleImpacted: 0,
          });
        }
        
        const sdgData = impactBySDGMap.get(sdgGoal)!;
        sdgData.projects += 1;
        
        // Add hours from activities on this project
        const projectActivities = organizationActivities.filter(a => a.projectId === project.id);
        sdgData.hours += projectActivities.reduce((sum, a) => sum + a.hours, 0);
        
        // Add people impacted from impacts on this project using helper
        const projectImpacts = organizationImpacts.filter(i => i.projectId === project.id);
        sdgData.peopleImpacted += calculatePeopleImpacted(projectImpacts, peopleMetricIds);
      });
    });
    
    const impactBySDG = Array.from(impactBySDGMap.values()).sort((a, b) => b.hours - a.hours);

    return {
      summary: {
        activeVolunteers,
        totalHours,
        activeProjects,
        completedTasks,
        totalTasks,
        sdgsAddressed: uniqueSDGs.size,
        impactScore,
        recentActivities: enrichedRecentActivities, // Last 10 activities with project/org names
        organizationPrimarySdgs, // Organization's selected SDGs from profile settings
      },
      projects: organizationProjects,
      projectsWithVolunteers, // Enriched projects with volunteers and progress
      tasks: tasksWithProjects, // Enriched tasks with project metadata
      activities: enrichedRecentActivities, // Last 10 activities for activity tab
      impacts: organizationImpacts,
      volunteers: organizationVolunteers,
      volunteerSummaries, // Enriched volunteer data with summaries
      applications: organizationApplications,
      projectAssignments: organizationAssignments,
      monthlyImpactTrend, // Algorithm-evaluated monthly impact trend (normalized scores)
      projectHours, // Project-level hours breakdown for dialog
      monthlyImpactData, // Real monthly hours and people impacted for Impact Over Time chart
      impactGrowthSeries, // Cumulative impact growth over time for visualization
      impactBySDG, // Real impact aggregated by SDG for Impact by SDG chart
      totalPeopleImpacted, // Total people impacted across all projects
    };
  } catch (error) {
    console.error("Error getting dashboard data for organization:", error);
    throw error;
  }
}

/**
 * Get all dashboard data for a volunteer user
 * Includes AI-matched opportunities and volunteer's assigned projects
 */
export async function getDashboardDataForVolunteer(userId: number, matchThreshold: number = DEFAULT_MATCH_THRESHOLD) {
  try {
    // Get the volunteer user
    const user = await storage.getUser(userId);
    if (!user || user.userType !== 'volunteer') {
      throw new Error("User is not a volunteer");
    }

    // Get volunteer profile data
    const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
    console.log(`[Dashboard] Retrieved volunteer profile for user ${userId}:`, JSON.stringify({
      id: volunteerProfile?.id,
      userId: volunteerProfile?.userId,
      weeklyAvailability: volunteerProfile?.weeklyAvailability,
      skills: volunteerProfile?.skills?.slice(0, 2),
      interests: volunteerProfile?.interests?.slice(0, 2),
    }, null, 2));

    // Fetch data
    const allProjects = await storage.listProjects();
    const allTasks = await storage.listTasks();
    const allActivities = await storage.listVolunteerActivities();
    const allImpacts = await storage.listProjectImpacts();
    const allProjectAssignments = await storage.listProjectAssignments();
    const allApplications = await storage.listApplications();
    const allUsers = await storage.listUsers();
    const allOrganizations = await storage.listOrganizations();
    const allImpactMetrics = await storage.listImpactMetrics();

    // Get visible project IDs using status-aware filtering
    // Excludes declined and pending assignments, includes only accepted assignments (active/completed/on-hold)
    const visibleProjectIds = await getVisibleProjectIdsForVolunteer(userId, false, matchThreshold);
    const assignedProjects = allProjects.filter(p => visibleProjectIds.has(p.id));
    
    // Get volunteer's project assignments (excluding declined and pending)
    const volunteerAssignments = allProjectAssignments.filter(pa => {
      if (pa.volunteerId !== userId) return false;
      
      // Normalize status to handle database inconsistencies
      const status = pa.status?.toLowerCase() || '';
      return status !== 'declined' && status !== 'pending';
    });

    // Filter activities to only this volunteer's
    const volunteerActivities = allActivities.filter(a => a.userId === userId);
    
    // Filter impacts to all impacts from projects where volunteer has accepted assignments
    // This ensures volunteer's Impact Over Time graphs match organization view for shared projects
    // Removed strict assignment window filtering to align with organization dashboard behavior
    const volunteerImpacts = allImpacts.filter(i => {
      return i.projectId && visibleProjectIds.has(i.projectId);
    });

    // Filter tasks to ONLY tasks directly assigned to this volunteer
    // Strict data partitioning: volunteers only see tasks they're explicitly assigned to
    const volunteerTasks = allTasks.filter(t => t.assigneeId === userId);

    // Get AI-matched opportunities above threshold
    const matchedOpportunities = await getProjectsForVolunteer(userId, matchThreshold);

    // Filter applications to this volunteer's
    const volunteerApplications = allApplications.filter(app => app.volunteerId === userId);

    // Calculate summary metrics
    const totalHours = volunteerActivities.reduce((sum, activity) => sum + activity.hours, 0);
    const activeProjects = assignedProjects.filter(
      project => {
        const status = project.status?.toLowerCase() || '';
        return status === 'in progress' || status === 'active';
      }
    ).length;
    const completedTasks = volunteerTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
    const totalTasks = volunteerTasks.length;

    // Count unique SDGs from assigned projects
    const uniqueSDGs = new Set<number>();
    assignedProjects.forEach(project => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach(goal => uniqueSDGs.add(goal));
      }
    });

    // Calculate Impact Score - Updated weights with people impacted as major driver
    // Hours: 35%, People Impacted: 30%, Tasks: 20%, SDG: 10%, Match: 5%
    const hoursScore = Math.min((totalHours / 100) * 100, 100);
    const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const sdgScore = (uniqueSDGs.size / 17) * 100;
    const acceptedApplications = volunteerApplications.filter(app => app.status?.toLowerCase() === 'accepted').length;
    const matchScore = volunteerApplications.length > 0
      ? (acceptedApplications / volunteerApplications.length) * 100
      : 0;

    // Placeholder for impact score - will be calculated after peopleMetricIds are available
    let impactScore = 0;

    // Create organization map for enrichment
    const organizationMap = new Map(
      allOrganizations.map(org => [org.id, { name: org.name, logo: org.logo }])
    );

    // Enrich assigned projects with organization information
    const projectsWithOrganization = assignedProjects.map(project => ({
      ...project,
      organizationName: project.organizationId 
        ? organizationMap.get(project.organizationId)?.name || 'Unknown Organization'
        : undefined,
      organizationLogo: project.organizationId 
        ? organizationMap.get(project.organizationId)?.logo
        : undefined,
    }));

    // Create project map from enriched projects
    const projectMap = new Map(
      projectsWithOrganization.map(p => [
        p.id, 
        { 
          name: p.name, 
          status: p.status,
          organizationName: p.organizationName,
          organizationId: p.organizationId,
        }
      ])
    );

    // Create a map of user data for assignee lookup
    const userMap = new Map(
      allUsers.map(u => [u.id, { name: u.displayName || u.username || 'Unknown', avatar: u.avatar }])
    );

    // Enrich volunteer tasks with project metadata, organization, and assignee details
    const tasksWithProjects = volunteerTasks.map(task => {
      const projectInfo = task.projectId ? projectMap.get(task.projectId) : undefined;
      return {
        ...task,
        projectId: task.projectId,
        projectName: projectInfo?.name || 'Unknown Project',
        projectStatus: projectInfo?.status,
        organizationName: projectInfo?.organizationName,
        organizationId: projectInfo?.organizationId,
        assignee: task.assigneeId ? {
          id: task.assigneeId.toString(),
          name: userMap.get(task.assigneeId)?.name || 'Unknown',
          avatar: userMap.get(task.assigneeId)?.avatar,
        } : undefined,
      };
    });

    // Calculate application statistics
    const pendingApplications = volunteerApplications.filter(app => app.status?.toLowerCase() === 'pending').length;
    const rejectedApplications = volunteerApplications.filter(app => app.status?.toLowerCase() === 'rejected').length;

    // Calculate hours breakdown by project with organization info
    const hoursByProject = projectsWithOrganization.map(project => {
      const projectActivities = volunteerActivities.filter(a => a.projectId === project.id);
      const projectHours = projectActivities.reduce((sum, a) => sum + a.hours, 0);
      return {
        projectId: project.id,
        projectName: project.name,
        organizationName: project.organizationName,
        organizationId: project.organizationId,
        hours: projectHours,
        activityCount: projectActivities.length,
      };
    }).filter(p => p.hours > 0).sort((a, b) => b.hours - a.hours);

    // Calculate profile completeness
    const profileFields = {
      skills: volunteerProfile?.skills?.length || 0,
      interests: volunteerProfile?.interests?.length || 0,
      location: volunteerProfile?.location ? 1 : 0,
      preferredSdgs: volunteerProfile?.preferredSdgs?.length || 0,
      languages: volunteerProfile?.languages?.length || 0,
      motivations: volunteerProfile?.motivations ? 1 : 0,
      weeklyAvailability: volunteerProfile?.weeklyAvailability !== null && volunteerProfile?.weeklyAvailability !== undefined ? 1 : 0,
      preferredWorkStyle: volunteerProfile?.preferredWorkStyle ? 1 : 0,
    };
    const completedFields = Object.values(profileFields).filter(v => v > 0).length;
    const profileCompleteness = Math.round((completedFields / Object.keys(profileFields).length) * 100);

    // Derive people metric IDs BEFORE monthly impact trend (needed for monthly calculations)
    const peopleMetricIds = new Set<number>();
    allImpactMetrics.forEach(metric => {
      const unit = (metric.unit || '').toLowerCase();
      const category = (metric.category || '').toLowerCase();
      const name = (metric.name || '').toLowerCase();
      
      // Expanded keywords to capture more human-impact metrics
      const peopleKeywords = [
        'people', 'person', 'beneficiar', 'student', 'child', 'children',
        'adult', 'family', 'families', 'participant', 'recipient',
        'attendee', 'individual', 'community member'
      ];
      const serviceKeywords = [
        'meal', 'service', 'healthcare', 'education', 'training'
      ];
      
      const isPeopleMetric = peopleKeywords.some(keyword => 
        unit.includes(keyword) || category.includes(keyword) || name.includes(keyword)
      ) || serviceKeywords.some(keyword => 
        unit.includes(keyword) || category.includes(keyword) || name.includes(keyword)
      );
      
      if (isPeopleMetric) {
        peopleMetricIds.add(metric.id);
      }
    });

    // Calculate monthly impact scores (algorithm-evaluated data)
    const now = new Date();
    const months: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const monthlyImpactTrend = months.map(monthKey => {
      // Filter activities for this month
      const monthActivities = volunteerActivities.filter(a => {
        const activityDate = new Date(a.date);
        const activityMonthKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
        return activityMonthKey === monthKey;
      });

      // Filter tasks created or completed in this month
      const monthTasks = volunteerTasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        const taskMonthKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}`;
        return taskMonthKey === monthKey;
      });

      // Filter applications from this month
      const monthApplications = volunteerApplications.filter(app => {
        const appDate = new Date(app.appliedAt || app.createdAt);
        const appMonthKey = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, '0')}`;
        return appMonthKey === monthKey;
      });

      // Filter impacts from this month
      const monthImpacts = volunteerImpacts.filter(i => {
        const impactDate = new Date(i.createdAt);
        const impactMonthKey = `${impactDate.getFullYear()}-${String(impactDate.getMonth() + 1).padStart(2, '0')}`;
        return impactMonthKey === monthKey;
      });

      // Calculate monthly metrics
      const monthHours = monthActivities.reduce((sum, a) => sum + a.hours, 0);
      const monthCompletedTasks = monthTasks.filter(t => t.status?.toLowerCase() === 'completed').length;
      const monthTotalTasks = monthTasks.length;
      const monthAcceptedApps = monthApplications.filter(app => app.status?.toLowerCase() === 'accepted').length;

      // Calculate scores using updated formula with people impacted
      const monthHoursScore = Math.min((monthHours / 20) * 100, 100); // Normalized to 20 hours/month
      const monthPeopleImpacted = calculatePeopleImpacted(monthImpacts, peopleMetricIds);
      const monthPeopleScore = Math.min((monthPeopleImpacted / 100) * 100, 100);
      const monthTasksScore = monthTotalTasks > 0 ? (monthCompletedTasks / monthTotalTasks) * 100 : 0;
      const monthMatchScore = monthApplications.length > 0
        ? (monthAcceptedApps / monthApplications.length) * 100
        : 0;

      // Monthly impact score using NEW FORMULA with people impacted as major driver
      // Hours: 35%, People: 30%, Tasks: 20%, SDG: 10%, Match: 5%
      const monthImpactScore = Math.round(
        monthHoursScore * 0.35 +       // Hours contributed
        monthPeopleScore * 0.30 +       // People impacted (NEW - major driver)
        monthTasksScore * 0.20 +        // Task completion
        sdgScore * 0.10 +               // Overall SDG coverage (constant per user)
        monthMatchScore * 0.05          // Application success rate
      );

      return {
        month: monthKey,
        score: monthImpactScore,
      };
    });

    // Now calculate people impacted and recalculate impact score with people as a major driver
    const totalPeopleImpacted = calculatePeopleImpacted(volunteerImpacts, peopleMetricIds);
    const peopleScore = Math.min((totalPeopleImpacted / 100) * 100, 100);
    
    // Recalculate impact score with updated weights: Hours 35%, People 30%, Tasks 20%, SDG 10%, Match 5%
    impactScore = Math.round(
      hoursScore * 0.35 +
      peopleScore * 0.30 +
      tasksScore * 0.20 +
      sdgScore * 0.10 +
      matchScore * 0.05
    );

    // Compute real monthly hours and people impacted using shared utility
    const monthlyImpactSeries = buildMonthlyImpactSeries(
      months,
      volunteerActivities,
      volunteerImpacts,
      peopleMetricIds
    );
    const monthlyImpactData = monthlyImpactSeries.monthly;
    const impactGrowthSeries = monthlyImpactSeries.cumulative;

    return {
      summary: {
        activeVolunteers: 1, // Only themselves
        totalHours,
        activeProjects,
        completedTasks,
        totalTasks,
        sdgsAddressed: uniqueSDGs.size,
        impactScore,
        totalPeopleImpacted, // Add people impacted to summary so frontend can display it
        recentActivities: volunteerActivities
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      },
      volunteerProfile: volunteerProfile ? {
        ...volunteerProfile,
        profileCompleteness,
        weeklyAvailability: volunteerProfile.weeklyAvailability,
        availability: volunteerProfile.availability,
        skillRatings: volunteerProfile.skillRatings,
      } : null,
      applicationStats: {
        total: volunteerApplications.length,
        pending: pendingApplications,
        accepted: acceptedApplications,
        rejected: rejectedApplications,
      },
      hoursByProject, // Enriched with organization names
      monthlyImpactTrend, // Algorithm-evaluated monthly impact trend with month keys
      monthlyImpactData, // Real monthly hours and people impacted for Impact Over Time chart
      impactGrowthSeries, // Cumulative impact growth over time for visualization
      projects: projectsWithOrganization, // Enriched projects with organization information - ALL consumers get this
      tasks: tasksWithProjects, // Enriched tasks with project and organization metadata
      activities: volunteerActivities,
      impacts: volunteerImpacts, // Project impacts for assigned projects
      applications: volunteerApplications,
      matchedOpportunities, // AI-filtered opportunities above threshold
      projectAssignments: volunteerAssignments,
    };
  } catch (error) {
    console.error("Error getting dashboard data for volunteer:", error);
    throw error;
  }
}

/**
 * Get SDG contributions overview for an organization
 * Returns aggregated data for each SDG including hours, volunteers, and projects
 */
export async function getSDGContributionsForOrganization(userId: number) {
  try {
    // Get the organization user
    const user = await storage.getUser(userId);
    if (!user || user.userType !== 'organization') {
      throw new Error("User is not an organization");
    }

    // Use organizationId if available, otherwise use userId
    const organizationId = user.organizationId || userId;

    // Fetch organization's data
    const allProjects = await storage.listProjects();
    const allActivities = await storage.listVolunteerActivities();
    const allUsers = await storage.listUsers();

    // Filter to only this organization's projects
    const organizationProjects = allProjects.filter(p => p.organizationId === organizationId);
    const organizationProjectIds = new Set(organizationProjects.map(p => p.id));

    // Filter activities to only those on organization's projects
    const organizationActivities = allActivities.filter(a => a.projectId && organizationProjectIds.has(a.projectId));

    // Initialize SDG data for all 17 SDGs
    const sdgContributions = Array.from({ length: 17 }, (_, i) => {
      const sdgNumber = i + 1;
      return {
        sdgNumber,
        hours: 0,
        volunteers: new Set<number>(),
        projects: new Set<number>(),
      };
    });

    // Aggregate data for each SDG
    organizationProjects.forEach(project => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach(sdgGoal => {
          if (sdgGoal >= 1 && sdgGoal <= 17) {
            const sdgIndex = sdgGoal - 1;
            
            // Add project to this SDG
            sdgContributions[sdgIndex].projects.add(project.id);

            // Find activities for this project and aggregate hours and volunteers
            const projectActivities = organizationActivities.filter(a => a.projectId === project.id);
            projectActivities.forEach(activity => {
              sdgContributions[sdgIndex].hours += activity.hours;
              if (activity.userId) {
                sdgContributions[sdgIndex].volunteers.add(activity.userId);
              }
            });
          }
        });
      }
    });

    // Calculate total engagement hours
    const totalHours = organizationActivities.reduce((sum, activity) => sum + activity.hours, 0);

    // Format the result
    const result = sdgContributions
      .map(sdg => ({
        sdgNumber: sdg.sdgNumber,
        hours: sdg.hours,
        volunteers: sdg.volunteers.size,
        projects: sdg.projects.size,
      }))
      .filter(sdg => sdg.projects > 0); // Only include SDGs with projects

    return {
      sdgContributions: result,
      totalEngagementHours: totalHours,
    };
  } catch (error) {
    console.error("Error getting SDG contributions for organization:", error);
    throw error;
  }
}
