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
    
    // Combine user and profile for matching algorithm
    const volunteerWithProfile = { ...volunteer, profile: volunteerProfile };

    // Calculate match scores for each opportunity
    const matchedOpportunities = opportunities
      .map((opportunity: Opportunity) => {
        const matchResult = calculateMatchScore(volunteerWithProfile, opportunity);
        return {
          ...opportunity,
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

    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error("User does not have an associated organization");
    }

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

    // Calculate summary metrics
    const uniqueVolunteerIds = new Set(organizationActivities.map(activity => activity.userId));
    const activeVolunteers = uniqueVolunteerIds.size;

    const totalHours = organizationActivities.reduce((sum, activity) => sum + activity.hours, 0);

    const activeProjects = organizationProjects.filter(
      project => project.status === 'In Progress' || project.status === 'Active'
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
      : 50;

    const impactScore = Math.round(
      hoursScore * 0.40 +
      tasksScore * 0.30 +
      sdgScore * 0.20 +
      matchScore * 0.10
    );

    return {
      summary: {
        activeVolunteers,
        totalHours,
        activeProjects,
        completedTasks,
        totalTasks,
        sdgsAddressed: uniqueSDGs.size,
        impactScore,
        recentActivities: organizationActivities
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      },
      projects: organizationProjects,
      tasks: organizationTasks,
      activities: organizationActivities,
      impacts: organizationImpacts,
      volunteers: organizationVolunteers,
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

    // Fetch data
    const allProjects = await storage.listProjects();
    const allTasks = await storage.listTasks();
    const allActivities = await storage.listVolunteerActivities();
    const allProjectAssignments = await storage.listProjectAssignments();
    const allApplications = await storage.listApplications();

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
      : 50;

    const impactScore = Math.round(
      hoursScore * 0.40 +
      tasksScore * 0.30 +
      sdgScore * 0.20 +
      matchScore * 0.10
    );

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
      projects: assignedProjects,
      tasks: volunteerTasks,
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
