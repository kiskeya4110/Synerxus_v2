import { storage } from "./storage";
import { calculateMatchScore } from "./matching-algorithm";
import { User, Opportunity } from "@shared/schema";

/**
 * Default match threshold for displaying projects to volunteers
 * Projects below this score will not be shown in volunteer dashboard
 */
const DEFAULT_MATCH_THRESHOLD = 40; // 40% match minimum

/**
 * Get projects for a volunteer filtered by AI matching algorithm
 * Only returns projects above the match threshold
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

    // Filter to ONLY this organization's projects
    const organizationProjects = allProjects.filter(p => p.organizationId === organizationId);
    const organizationProjectIds = new Set(organizationProjects.map(p => p.id));

    // Filter tasks to only those belonging to organization's projects
    const organizationTasks = allTasks.filter(t => t.projectId && organizationProjectIds.has(t.projectId));

    // Filter activities to only those on organization's projects
    const organizationActivities = allActivities.filter(a => a.projectId && organizationProjectIds.has(a.projectId));

    // Filter impacts to only organization's projects
    const organizationImpacts = allImpacts.filter(i => i.projectId && organizationProjectIds.has(i.projectId));

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

    const completedTasks = organizationTasks.filter(t => t.status === 'Completed').length;
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
    const acceptedApplications = organizationApplications.filter(app => app.status === 'accepted').length;
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
          const completedCount = projectTasks.filter(t => t.status === 'Completed').length;
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
    const completedTaskActivities = organizationTasks.filter(t => t.status === 'Completed');
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

    return {
      summary: {
        activeVolunteers,
        totalHours,
        activeProjects,
        completedTasks,
        totalTasks,
        sdgsAddressed: uniqueSDGs.size,
        impactScore,
        recentActivities: recentUnifiedActivities, // Unified activity feed with all activity types
        organizationPrimarySdgs, // Organization's selected SDGs from profile settings
      },
      projects: organizationProjects,
      projectsWithVolunteers, // Enriched projects with volunteers and progress
      tasks: tasksWithProjects, // Enriched tasks with project metadata
      activities: recentUnifiedActivities, // Unified activity feed for activity tab
      impacts: organizationImpacts,
      volunteers: organizationVolunteers,
      volunteerSummaries, // Enriched volunteer data with summaries
      applications: organizationApplications,
      projectAssignments: organizationAssignments,
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

    // Fetch data
    const allProjects = await storage.listProjects();
    const allTasks = await storage.listTasks();
    const allActivities = await storage.listVolunteerActivities();
    const allProjectAssignments = await storage.listProjectAssignments();
    const allApplications = await storage.listApplications();
    const allUsers = await storage.listUsers();

    // Get projects the volunteer is assigned to
    const volunteerAssignments = allProjectAssignments.filter(pa => pa.volunteerId === userId);
    const assignedProjectIds = new Set(volunteerAssignments.map(pa => pa.projectId));
    const assignedProjects = allProjects.filter(p => assignedProjectIds.has(p.id));

    // Filter activities to only this volunteer's
    const volunteerActivities = allActivities.filter(a => a.userId === userId);

    // Filter tasks to assigned projects or tasks assigned to this volunteer
    const volunteerTasks = allTasks.filter(t =>
      (t.projectId && assignedProjectIds.has(t.projectId)) || t.assigneeId === userId
    );

    // Get AI-matched opportunities above threshold
    const matchedOpportunities = await getProjectsForVolunteer(userId, matchThreshold);

    // Filter applications to this volunteer's
    const volunteerApplications = allApplications.filter(app => app.volunteerId === userId);

    // Calculate summary metrics
    const totalHours = volunteerActivities.reduce((sum, activity) => sum + activity.hours, 0);
    const activeProjects = assignedProjects.filter(
      project => project.status === 'In Progress' || project.status === 'Active'
    ).length;
    const completedTasks = volunteerTasks.filter(t => t.status === 'Completed').length;
    const totalTasks = volunteerTasks.length;

    // Count unique SDGs from assigned projects
    const uniqueSDGs = new Set<number>();
    assignedProjects.forEach(project => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach(goal => uniqueSDGs.add(goal));
      }
    });

    // Calculate Impact Score
    const hoursScore = Math.min((totalHours / 100) * 100, 100);
    const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const sdgScore = (uniqueSDGs.size / 17) * 100;
    const acceptedApplications = volunteerApplications.filter(app => app.status === 'accepted').length;
    const matchScore = volunteerApplications.length > 0
      ? (acceptedApplications / volunteerApplications.length) * 100
      : 0;

    const impactScore = Math.round(
      hoursScore * 0.40 +
      tasksScore * 0.30 +
      sdgScore * 0.20 +
      matchScore * 0.10
    );

    // Create project map from assigned projects
    const projectMap = new Map(
      assignedProjects.map(p => [p.id, { name: p.name, status: p.status }])
    );

    // Create a map of user data for assignee lookup
    const userMap = new Map(
      allUsers.map(u => [u.id, { name: u.displayName || u.username || 'Unknown', avatar: u.avatar }])
    );

    // Enrich volunteer tasks with project metadata and assignee details
    const tasksWithProjects = volunteerTasks.map(task => ({
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

    // Calculate application statistics
    const pendingApplications = volunteerApplications.filter(app => app.status === 'pending').length;
    const rejectedApplications = volunteerApplications.filter(app => app.status === 'rejected').length;

    // Calculate hours breakdown by project
    const hoursByProject = assignedProjects.map(project => {
      const projectActivities = volunteerActivities.filter(a => a.projectId === project.id);
      const projectHours = projectActivities.reduce((sum, a) => sum + a.hours, 0);
      return {
        projectId: project.id,
        projectName: project.name,
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

      // Calculate monthly metrics
      const monthHours = monthActivities.reduce((sum, a) => sum + a.hours, 0);
      const monthCompletedTasks = monthTasks.filter(t => t.status === 'Completed').length;
      const monthTotalTasks = monthTasks.length;
      const monthAcceptedApps = monthApplications.filter(app => app.status === 'accepted').length;

      // Calculate scores (same formula as overall impact score)
      const monthHoursScore = Math.min((monthHours / 20) * 100, 100); // Normalized to 20 hours/month
      const monthTasksScore = monthTotalTasks > 0 ? (monthCompletedTasks / monthTotalTasks) * 100 : 0;
      const monthMatchScore = monthApplications.length > 0
        ? (monthAcceptedApps / monthApplications.length) * 100
        : 0;

      // Monthly impact score (weighted average)
      const monthImpactScore = Math.round(
        monthHoursScore * 0.50 +     // Higher weight for hours in monthly view
        monthTasksScore * 0.30 +      // Task completion
        sdgScore * 0.10 +              // Overall SDG coverage (constant per user)
        monthMatchScore * 0.10         // Application success rate
      );

      return {
        month: monthKey,
        score: monthImpactScore,
      };
    });

    return {
      summary: {
        activeVolunteers: 1, // Only themselves
        totalHours,
        activeProjects,
        completedTasks,
        totalTasks,
        sdgsAddressed: uniqueSDGs.size,
        impactScore,
        recentActivities: volunteerActivities
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      },
      volunteerProfile: volunteerProfile ? {
        ...volunteerProfile,
        profileCompleteness,
      } : null,
      applicationStats: {
        total: volunteerApplications.length,
        pending: pendingApplications,
        accepted: acceptedApplications,
        rejected: rejectedApplications,
      },
      hoursByProject,
      monthlyImpactTrend, // Algorithm-evaluated monthly impact trend with month keys
      projects: assignedProjects,
      tasks: tasksWithProjects, // Enriched tasks with project metadata
      activities: volunteerActivities,
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
