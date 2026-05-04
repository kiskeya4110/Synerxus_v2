export interface OrganizationVolunteerSource {
  id: number;
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
  userType?: string | null;
}

export interface OrganizationVolunteerAssignmentSource {
  volunteerId?: number | null;
  projectId?: number | null;
}

export interface OrganizationVolunteerActivitySource {
  userId?: number | null;
  projectId?: number | null;
  hours?: number | null;
}

export interface OrganizationVolunteerSummary {
  id: number;
  displayName: string;
  name: string;
  email: string;
  avatar?: string | null;
  totalHours: number;
  activityCount: number;
  projectCount: number;
  projects: string[];
}

export function collectOrganizationVolunteerIds(params: {
  assignments?: OrganizationVolunteerAssignmentSource[];
  relationships?: Array<{ volunteerId?: number | null }>;
  applications?: Array<{ volunteerId?: number | null }>;
  activities?: Array<{ userId?: number | null }>;
  users?: OrganizationVolunteerSource[];
}): number[] {
  const ids = new Set<number>();

  params.assignments?.forEach((assignment) => {
    if (typeof assignment.volunteerId === "number") {
      ids.add(assignment.volunteerId);
    }
  });

  params.relationships?.forEach((relationship) => {
    if (typeof relationship.volunteerId === "number") {
      ids.add(relationship.volunteerId);
    }
  });

  params.applications?.forEach((application) => {
    if (typeof application.volunteerId === "number") {
      ids.add(application.volunteerId);
    }
  });

  params.activities?.forEach((activity) => {
    if (typeof activity.userId === "number") {
      ids.add(activity.userId);
    }
  });

  params.users?.forEach((user) => {
    if (user.userType === "volunteer" && typeof user.id === "number") {
      ids.add(user.id);
    }
  });

  return Array.from(ids);
}

export function buildOrganizationVolunteerSummaries(params: {
  volunteers: OrganizationVolunteerSource[];
  projects: Array<{ id: number; name?: string | null }>;
  assignments: OrganizationVolunteerAssignmentSource[];
  activities: OrganizationVolunteerActivitySource[];
}): OrganizationVolunteerSummary[] {
  const projectNameMap = new Map(
    params.projects.map((project) => [project.id, project.name || "Unknown Project"])
  );

  return params.volunteers.map((volunteer) => {
    const volunteerActivities = params.activities.filter((activity) => activity.userId === volunteer.id);
    const totalHours = volunteerActivities.reduce((sum, activity) => sum + (activity.hours || 0), 0);
    const activityCount = volunteerActivities.length;

    const assignedProjectIds = new Set<number>();
    params.assignments.forEach((assignment) => {
      if (assignment.volunteerId === volunteer.id && typeof assignment.projectId === "number") {
        assignedProjectIds.add(assignment.projectId);
      }
    });
    volunteerActivities.forEach((activity) => {
      if (typeof activity.projectId === "number") {
        assignedProjectIds.add(activity.projectId);
      }
    });

    const projectIds = Array.from(assignedProjectIds);
    const projects = projectIds.map((projectId) => projectNameMap.get(projectId) || "Unknown Project");

    return {
      id: volunteer.id,
      displayName: volunteer.displayName || volunteer.username || "Unknown Volunteer",
      name: volunteer.displayName || volunteer.username || "Unknown Volunteer",
      email: volunteer.email || "",
      avatar: volunteer.avatar || null,
      totalHours,
      activityCount,
      projectCount: projectIds.length,
      projects,
    };
  });
}
