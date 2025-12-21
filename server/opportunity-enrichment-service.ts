import type { Opportunity, Project } from "@shared/schema";
import type { IStorage } from "./storage";
import { calculateMatchScore, validateOpportunityData, validateVolunteerData } from "./matching-algorithm";
import { log } from "./vite";

interface EnrichedOpportunity extends Opportunity {
  organizationName?: string;
  matchScore?: number;
  matchPercentage?: number;
  matchReasons?: string[];
  matchBreakdown?: {
    skillMatch: number;
    locationMatch: number;
    sdgMatch: number;
    interestMatch: number;
    availabilityMatch: number;
    experienceMatch: number;
    engagementBoost: number;
  };
  sourceType?: 'opportunity' | 'project'; // Track where this came from
}

interface EnrichmentOptions {
  includeMatch: boolean;
  volunteerId?: number;
  matchThreshold?: number;
  includeProjects?: boolean; // Option to include projects as matchable items
}

/**
 * Convert a project to an opportunity-like format for matching
 * This allows projects to be discovered alongside opportunities
 */
function projectToOpportunityFormat(project: Project, organizationName: string): Opportunity {
  return {
    id: project.id,
    title: project.name,
    description: project.description || "",
    organizationId: project.organizationId!,
    projectId: project.id,
    status: project.status?.toLowerCase() === 'active' || project.status?.toLowerCase() === 'in-progress' || project.status?.toLowerCase() === 'in progress' ? 'open' : 'closed',
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
    primarySdg: project.primarySdg,
    impactMetricName: project.impactMetricName,
    impactMetricUnit: project.impactMetricUnit,
    // Additional required fields for Opportunity type
    volunteersNeeded: 1,
    volunteerRoles: null,
    totalVolunteerContribution: 100,
    timeCommitment: null,
    eventDate: null,
    eventStartTime: null,
    eventEndTime: null,
    benefits: null,
    requirements: null,
  } as Opportunity;
}

export async function getEnrichedOpportunities(
  storage: IStorage,
  options: EnrichmentOptions
): Promise<EnrichedOpportunity[]> {
  const { includeMatch, volunteerId, matchThreshold = 0, includeProjects = true } = options;

  // Fetch all open opportunities (filter out closed ones)
  const allOpportunities = await storage.listOpportunities();
  const opportunities = allOpportunities.filter(o => o.status === 'open');

  // Also fetch projects if includeProjects is true
  // This ensures volunteers can discover projects even if no opportunities exist
  let projects: Project[] = [];
  if (includeProjects) {
    projects = await storage.listProjects();
    // Only include active projects
    projects = projects.filter(p => {
      const status = p.status?.toLowerCase();
      return status === 'active' || status === 'in-progress' || status === 'in progress';
    });
  }

  // Collect all organization IDs from both opportunities and projects
  const opportunityOrgIds = opportunities.map(opp => opp.organizationId);
  const projectOrgIds = projects.map(p => p.organizationId).filter(id => id != null) as number[];
  const allOrgIds = Array.from(new Set([...opportunityOrgIds, ...projectOrgIds]));

  // Fetch organizations in bulk for efficient lookups
  const organizations = await storage.getOrganizationsByIds(allOrgIds);

  // Create organization lookup map for O(1) access
  const organizationMap = new Map(
    organizations.map(org => [org.id, { name: org.name }])
  );

  // Get volunteer profile if match scoring is requested
  let volunteerWithProfile = null;
  if (includeMatch && volunteerId) {
    const user = await storage.getUser(volunteerId);
    const profile = await storage.getVolunteerProfileByUserId(volunteerId);
    if (user && profile) {
      volunteerWithProfile = { ...user, profile };
    }
  }

  // Track which projects already have opportunities to avoid duplicates
  const projectIdsWithOpportunities = new Set(
    opportunities.filter(o => o.projectId).map(o => o.projectId)
  );

  // Enrich opportunities
  const enrichedOpportunities: EnrichedOpportunity[] = opportunities.map((opportunity) => {
    const organization = organizationMap.get(opportunity.organizationId);

    const enriched: EnrichedOpportunity = {
      ...opportunity,
      organizationName: organization?.name || "Unknown Organization",
      sourceType: 'opportunity',
    };

    // Add match scoring if requested and volunteer profile exists
    if (includeMatch && volunteerWithProfile) {
      const matchResult = calculateMatchScore(volunteerWithProfile, opportunity);
      enriched.matchScore = matchResult.score;
      enriched.matchPercentage = matchResult.score;
      enriched.matchReasons = matchResult.reasons;
      enriched.matchBreakdown = matchResult.breakdown;

      // Log data quality warnings for visibility and debugging
      if (matchResult.dataQualityWarnings && matchResult.dataQualityWarnings.length > 0) {
        log(`[Data Quality] Opportunity "${opportunity.title}" (ID: ${opportunity.id}): ${matchResult.dataQualityWarnings.join("; ")}`);
        log(`[Data Quality] Volunteer "${volunteerWithProfile.displayName}" (ID: ${volunteerWithProfile.id}): ${matchResult.dataQualityWarnings.join("; ")}`);
      }
    }

    return enriched;
  });

  // Convert projects without opportunities to opportunity format and enrich them
  const enrichedProjects: EnrichedOpportunity[] = projects
    .filter(project => !projectIdsWithOpportunities.has(project.id)) // Avoid duplicates
    .map((project) => {
      const organization = organizationMap.get(project.organizationId!);
      const orgName = organization?.name || "Unknown Organization";
      const opportunityFormat = projectToOpportunityFormat(project, orgName);

      const enriched: EnrichedOpportunity = {
        ...opportunityFormat,
        organizationName: orgName,
        sourceType: 'project',
      };

      // Add match scoring if requested and volunteer profile exists
      if (includeMatch && volunteerWithProfile) {
        const matchResult = calculateMatchScore(volunteerWithProfile, opportunityFormat);
        enriched.matchScore = matchResult.score;
        enriched.matchPercentage = matchResult.score;
        enriched.matchReasons = matchResult.reasons;
        enriched.matchBreakdown = matchResult.breakdown;

        // Log data quality warnings for visibility and debugging
        if (matchResult.dataQualityWarnings && matchResult.dataQualityWarnings.length > 0) {
          log(`[Data Quality] Project "${project.name}" (ID: ${project.id}): ${matchResult.dataQualityWarnings.join("; ")}`);
          log(`[Data Quality] Volunteer "${volunteerWithProfile.displayName}" (ID: ${volunteerWithProfile.id}): ${matchResult.dataQualityWarnings.join("; ")}`);
        }
      }

      return enriched;
    });

  // Combine opportunities and projects
  const allItems = [...enrichedOpportunities, ...enrichedProjects];

  // Filter by match threshold if match scoring is enabled
  if (includeMatch) {
    return allItems
      .filter(opp => (opp.matchScore ?? 0) >= matchThreshold)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  return allItems;
}
