import type { Task, Project, User, VolunteerProfile } from "@shared/schema";
import { findTopVolunteers } from "./matching-algorithm";
import type { Opportunity } from "@shared/schema";

/**
 * Build matching context for a task by inheriting from its parent project
 * This creates an "opportunity-like" object that can be used with the matching algorithm
 */
export function buildTaskMatchingContext(
  task: Task,
  project: Project | null
): Partial<Opportunity> {
  // Start with task-specific overrides
  const context: Partial<Opportunity> = {
    id: task.id as any, // For compatibility with Opportunity interface
    title: task.title,
    description: task.description || "",
    status: "open" as any, // Active tasks are "open" for matching purposes
  };

  // Inherit or use overrides for required skills
  // If override is explicitly set (even to empty array), use it; otherwise inherit from project
  if (task.requiredSkillsOverride !== null && task.requiredSkillsOverride !== undefined) {
    context.requiredSkills = task.requiredSkillsOverride;
  } else if (project?.requiredSkills) {
    context.requiredSkills = project.requiredSkills;
  } else {
    context.requiredSkills = [];
  }

  // Inherit or use overrides for SDG goals
  // If override is explicitly set (even to empty array), use it; otherwise inherit from project
  if (task.sdgGoalsOverride !== null && task.sdgGoalsOverride !== undefined) {
    context.sdgGoals = task.sdgGoalsOverride;
  } else if (project?.sdgGoals) {
    context.sdgGoals = project.sdgGoals;
  } else {
    context.sdgGoals = [];
  }

  // Inherit or use overrides for location/remote
  if (task.isRemoteOverride !== null && task.isRemoteOverride !== undefined) {
    context.isRemote = task.isRemoteOverride;
  } else if (project?.engagementType) {
    context.isRemote = project.engagementType === "remote";
  } else {
    context.isRemote = false;
  }

  // Use location override or inherit from project
  if (task.locationOverride) {
    context.location = task.locationOverride;
  } else if (project?.location) {
    context.location = project.location;
  }

  // Inherit category from project (for interest matching)
  // We can use the project's focus area or primary SDG as a category proxy
  if (project?.primarySdg) {
    context.category = `SDG ${project.primarySdg}`;
  }

  return context;
}

/**
 * Get recommended volunteers for a specific task
 */
export function getRecommendedVolunteersForTask(
  task: Task,
  project: Project | null,
  volunteers: Array<User & { profile?: VolunteerProfile | null }>,
  limit: number = 10,
  threshold: number = 0
): Array<User & { profile?: VolunteerProfile | null; matchScore: number; matchReasons: string[] }> {
  // Build matching context from task and project
  const matchingContext = buildTaskMatchingContext(task, project) as Opportunity;

  // Use the existing matching algorithm
  const scoredVolunteers = findTopVolunteers(matchingContext, volunteers, limit);

  // Filter by threshold if specified
  if (threshold > 0) {
    return scoredVolunteers.filter(v => v.matchScore >= threshold);
  }

  return scoredVolunteers;
}

/**
 * Get recommended volunteers for a project (general assignment)
 */
export function getRecommendedVolunteersForProject(
  project: Project,
  volunteers: Array<User & { profile?: VolunteerProfile | null }>,
  limit: number = 10,
  threshold: number = 0
): Array<User & { profile?: VolunteerProfile | null; matchScore: number; matchReasons: string[] }> {
  // Create an opportunity-like object from the project
  // Cast to Opportunity for matching algorithm compatibility
  const matchingContext = {
    id: project.id,
    title: project.name,
    description: project.description || "",
    organizationId: project.organizationId!,
    status: "open",
    requiredSkills: project.requiredSkills || [],
    optionalSkills: project.optionalSkills || [],
    sdgGoals: project.sdgGoals || [],
    location: project.location || "",
    isRemote: project.engagementType === "remote",
    engagementType: project.engagementType,
    category: project.primarySdg ? `SDG ${project.primarySdg}` : "",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    startDate: project.startDate,
    endDate: project.endDate,
    commitmentType: project.commitmentType || "project-based",
    ongoingHoursPerWeek: project.ongoingHoursPerWeek,
    projectTotalHours: project.projectTotalHours,
    isUrgent: false,
    experienceLevel: project.experienceLevel,
    primarySdg: project.primarySdg,
    impactMetricName: project.impactMetricName,
    impactMetricUnit: project.impactMetricUnit,
  } as unknown as Opportunity;

  // Use the existing matching algorithm
  const scoredVolunteers = findTopVolunteers(matchingContext, volunteers, limit);

  // Filter by threshold if specified
  if (threshold > 0) {
    return scoredVolunteers.filter(v => v.matchScore >= threshold);
  }

  return scoredVolunteers;
}
