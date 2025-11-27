import type { Opportunity } from "@shared/schema";
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
}

interface EnrichmentOptions {
  includeMatch: boolean;
  volunteerId?: number;
  matchThreshold?: number;
}

export async function getEnrichedOpportunities(
  storage: IStorage,
  options: EnrichmentOptions
): Promise<EnrichedOpportunity[]> {
  const { includeMatch, volunteerId, matchThreshold = 0 } = options;

  // Fetch all opportunities
  const opportunities = await storage.listOpportunities();

  // Fetch organizations in bulk for efficient lookups
  const organizationIds = Array.from(new Set(opportunities.map(opp => opp.organizationId)));
  const organizations = await storage.getOrganizationsByIds(organizationIds);

  // Create organization lookup map for O(1) access
  const organizationMap = new Map(
    organizations.map(org => [org.id, { name: org.name }])
  );

  // Get volunteer profile if match scoring is requested
  let volunteerWithProfile = null;
  if (includeMatch && volunteerId) {
    const user = await storage.getUser(volunteerId);
    const profile = await storage.getVolunteerProfile(volunteerId);
    if (user && profile) {
      volunteerWithProfile = { ...user, profile };
    }
  }

  // Enrich opportunities
  const enrichedOpportunities = opportunities.map((opportunity) => {
    const organization = organizationMap.get(opportunity.organizationId);
    
    const enriched: EnrichedOpportunity = {
      ...opportunity,
      organizationName: organization?.name || "Unknown Organization",
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

  // Filter by match threshold if match scoring is enabled
  if (includeMatch) {
    return enrichedOpportunities
      .filter(opp => (opp.matchScore ?? 0) >= matchThreshold)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  return enrichedOpportunities;
}
