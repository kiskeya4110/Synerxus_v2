import { User, Opportunity, VolunteerProfile, VolunteerActivity } from "@shared/schema";
import { calculateMatchScore } from "./matching-algorithm";

interface RecommendationResult {
  opportunity: Opportunity & { matchScore: number; matchReasons: string[] };
  engagementReason: string;
}

/**
 * Extract skills and interests from past volunteer activities
 */
function extractEngagementProfile(
  activities: VolunteerActivity[],
  volunteer: User & { profile?: VolunteerProfile | null }
): {
  usedSkills: string[];
  engagedTopics: string[];
  totalHours: number;
  activeOrganizations: Set<number>;
  sdgsEngaged: Set<number>;
} {
  const usedSkills = new Set<string>();
  const engagedTopics = new Set<string>();
  const activeOrganizations = new Set<number>();
  const sdgsEngaged = new Set<number>();
  let totalHours = 0;

  // Extract from activities
  activities.forEach((activity) => {
    totalHours += activity.hours || 0;
    if (activity.projectId) activeOrganizations.add(activity.projectId);
    if (activity.skillsApplied) {
      activity.skillsApplied.forEach((skill) => usedSkills.add(skill.toLowerCase().trim()));
    }
  });

  // Extract from volunteer profile
  if (volunteer.profile?.skills) {
    volunteer.profile.skills.forEach((skill: string) => usedSkills.add(skill.toLowerCase().trim()));
  }
  if (volunteer.profile?.interests) {
    volunteer.profile.interests.forEach((interest: string) =>
      engagedTopics.add(interest.toLowerCase().trim())
    );
  }
  if (volunteer.profile?.preferredSdgs) {
    volunteer.profile.preferredSdgs.forEach((sdg: number) => sdgsEngaged.add(sdg));
  }

  return {
    usedSkills: Array.from(usedSkills),
    engagedTopics: Array.from(engagedTopics),
    totalHours,
    activeOrganizations,
    sdgsEngaged,
  };
}

/**
 * Generate personalized opportunity recommendations based on past engagement
 */
export function getPersonalizedRecommendations(
  volunteer: User & { profile?: VolunteerProfile | null },
  allOpportunities: Opportunity[],
  pastActivities: VolunteerActivity[]
): RecommendationResult[] {
  const engagement = extractEngagementProfile(pastActivities, volunteer);

  // Filter out opportunities volunteer already applied to or rejected
  const candidateOpportunities = allOpportunities.filter((opp) => {
    // Would be filtered by rejected/applied status in routes
    return opp && opp.id;
  });

  // Score and rank opportunities
  const scoredOpportunities = candidateOpportunities
    .map((opp) => {
      const matchResult = calculateMatchScore(volunteer, opp);
      
      // Boost score if opportunity uses skills volunteer has actively used
      let engagementBoost = 0;
      let engagementReason = "Matches your profile";
      
      if (opp.requiredSkills && Array.isArray(opp.requiredSkills)) {
        const requiredSkillsNorm = opp.requiredSkills.map((s: string) => s.toLowerCase().trim());
        const usedAndRequired = engagement.usedSkills.filter((skill) =>
          requiredSkillsNorm.some(
            (req) => req.includes(skill) || skill.includes(req) || skill === req
          )
        );
        
        if (usedAndRequired.length > 0) {
          engagementBoost = Math.min(usedAndRequired.length * 5, 15);
          engagementReason = `You've used ${usedAndRequired.length} of the required skill${usedAndRequired.length > 1 ? "s" : ""} (${usedAndRequired.join(", ")})`;
        }
      }

      // Boost if SDG aligns with past engagement
      if (opp.sdgGoals && Array.isArray(opp.sdgGoals)) {
        const alignedSdgs = opp.sdgGoals.filter((sdg) => engagement.sdgsEngaged.has(sdg));
        if (alignedSdgs.length > 0) {
          engagementBoost += Math.min(alignedSdgs.length * 3, 10);
          if (engagementReason === "Matches your profile") {
            engagementReason = `Aligns with SDG goals you've worked on (${alignedSdgs.join(", ")})`;
          }
        }
      }

      // Boost if volunteer has substantial engagement (20+ hours)
      if (engagement.totalHours >= 20) {
        engagementBoost += 5;
      }

      const finalScore = Math.min(matchResult.score + engagementBoost, 100);

      return {
        opportunity: { ...opp, matchScore: finalScore, matchReasons: matchResult.reasons },
        engagementReason,
        score: finalScore,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Return top 5 recommendations
    .map(({ opportunity, engagementReason }) => ({
      opportunity,
      engagementReason,
    }));

  return scoredOpportunities;
}
