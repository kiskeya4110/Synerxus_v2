import { Opportunity, VolunteerProfile, User } from "@shared/schema";

interface MatchResult {
  score: number;
  breakdown: {
    skillMatch: number;
    locationMatch: number;
    sdgMatch: number;
    interestMatch: number;
    availabilityMatch: number;
    experienceMatch: number;
  };
  reasons: string[];
  matchCategory?: "nexus" | "strong" | "gap" | "no-match";
}

/**
 * Normalize and tokenize skills for better matching
 */
function normalizeSkills(skills: string[] | null | undefined): string[] {
  if (!skills || !Array.isArray(skills) || skills.length === 0) return [];
  return skills
    .filter((s) => s && typeof s === "string")
    .map((s) => s.toLowerCase().trim())
    .filter((s) => s.length > 0);
}

/**
 * Convert experience range string to numeric score (0-100)
 */
function getExperienceScore(yearsOfExperience: string | null | undefined): number {
  if (!yearsOfExperience || typeof yearsOfExperience !== "string") return 50;
  
  const exp = yearsOfExperience.toLowerCase().trim();
  if (exp.includes("0-1")) return 20;
  if (exp.includes("1-2")) return 40;
  if (exp.includes("3-5")) return 60;
  if (exp.includes("5-10")) return 80;
  if (exp.includes("10+")) return 100;
  return 50;
}

/**
 * Normalize location string for better geographic matching
 */
function normalizeLocation(location: string | null | undefined): {
  full: string;
  city: string;
  country: string;
  parts: string[];
} {
  if (!location || typeof location !== "string") {
    return { full: "", city: "", country: "", parts: [] };
  }

  const normalized = location.toLowerCase().trim();
  const parts = normalized
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    full: normalized,
    city: parts.length >= 2 ? parts[0] : "",
    country: parts.length >= 2 ? parts[parts.length - 1] : parts[0] || "",
    parts,
  };
}

/**
 * AI-powered matching algorithm that calculates compatibility between
 * volunteers and opportunities using weighted scoring across multiple dimensions
 */
export function calculateMatchScore(
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunity: Opportunity,
): MatchResult {
  const breakdown = {
    skillMatch: 0,
    locationMatch: 0,
    sdgMatch: 0,
    interestMatch: 0,
    availabilityMatch: 0,
    experienceMatch: 0,
  };
  const reasons: string[] = [];

  // 1. Skills Matching (35% weight)
  const volunteerSkills = normalizeSkills(volunteer.skills);
  const requiredSkills = normalizeSkills(opportunity.requiredSkills);
  const optionalSkills = normalizeSkills(opportunity.optionalSkills);
  const rawSkillRatings =
    (volunteer.profile?.skillRatings as Record<string, number>) || {};

  // Create normalized skill-to-rating map for efficient proficiency lookups
  const normalizedRatings: Record<string, number> = {};
  Object.keys(rawSkillRatings).forEach((skill) => {
    const normalizedKey = skill.toLowerCase().trim();
    normalizedRatings[normalizedKey] = rawSkillRatings[skill];
  });

  if (volunteerSkills.length > 0 && requiredSkills.length > 0) {
    const matchingRequiredSkills = volunteerSkills.filter((skill) =>
      requiredSkills.some(
        (req) => req.includes(skill) || skill.includes(req) || skill === req,
      ),
    );

    const matchingOptionalSkills = volunteerSkills.filter((skill) =>
      optionalSkills.some(
        (opt) => opt.includes(skill) || skill.includes(opt) || skill === opt,
      ),
    );

    let proficiencyWeightedScore = 0;
    if (matchingRequiredSkills.length > 0) {
      const proficiencyScores = matchingRequiredSkills.map((skill) => {
        const proficiency =
          normalizedRatings[skill] !== undefined
            ? normalizedRatings[skill] / 100
            : 0.7; // Default 70% if no rating
        return proficiency;
      });

      const avgProficiency =
        proficiencyScores.reduce((sum, p) => sum + p, 0) /
        proficiencyScores.length;
      const baseScore =
        (matchingRequiredSkills.length / requiredSkills.length) * 100;
      proficiencyWeightedScore = baseScore * (0.7 + avgProficiency * 0.3);
    }

    let optionalBonus = 0;
    if (optionalSkills.length > 0 && matchingOptionalSkills.length > 0) {
      const optionalProficiencies = matchingOptionalSkills.map((skill) => {
        return normalizedRatings[skill] !== undefined
          ? normalizedRatings[skill] / 100
          : 0.7;
      });
      const avgOptionalProficiency =
        optionalProficiencies.reduce((sum, p) => sum + p, 0) /
        optionalProficiencies.length;
      optionalBonus = Math.min(
        (matchingOptionalSkills.length / optionalSkills.length) *
          20 *
          avgOptionalProficiency,
        20,
      );
    }

    breakdown.skillMatch = Math.min(
      proficiencyWeightedScore + optionalBonus,
      100,
    );

    if (matchingRequiredSkills.length > 0) {
      const highProficiencySkills = matchingRequiredSkills.filter((skill) => {
        return normalizedRatings[skill] && normalizedRatings[skill] >= 75;
      });

      if (highProficiencySkills.length > 0) {
        reasons.push(
          `${matchingRequiredSkills.length} matching skill${matchingRequiredSkills.length > 1 ? "s" : ""} (${highProficiencySkills.length} highly proficient): ${matchingRequiredSkills.slice(0, 3).join(", ")}`,
        );
      } else {
        reasons.push(
          `${matchingRequiredSkills.length} matching skill${matchingRequiredSkills.length > 1 ? "s" : ""}: ${matchingRequiredSkills.slice(0, 3).join(", ")}`,
        );
      }
    }
    if (matchingOptionalSkills.length > 0) {
      reasons.push(
        `+${matchingOptionalSkills.length} bonus skill${matchingOptionalSkills.length > 1 ? "s" : ""}`,
      );
    }
  } else if (requiredSkills.length === 0) {
    breakdown.skillMatch = 50;
    reasons.push("No specific skills required");
  } else if (volunteerSkills.length === 0) {
    breakdown.skillMatch = 20;
    reasons.push("Complete your skills profile for better matches");
  }

  // 2. Location Matching (25% weight)
  if (opportunity.isRemote || opportunity.engagementType === "remote") {
    breakdown.locationMatch = 100;
    reasons.push("Remote opportunity - location flexible");
  } else if (opportunity.engagementType === "hybrid") {
    breakdown.locationMatch = 75;
    reasons.push("Hybrid work - flexible location");
  } else {
    const volLoc = normalizeLocation(volunteer.profile?.location);
    const oppLoc = normalizeLocation(opportunity.location);

    if (volLoc.full && oppLoc.full) {
      if (volLoc.city && oppLoc.city && volLoc.city === oppLoc.city) {
        breakdown.locationMatch = 100;
        reasons.push("Same city");
      } else if (
        volLoc.country &&
        oppLoc.country &&
        volLoc.country === oppLoc.country
      ) {
        breakdown.locationMatch = 60;
        reasons.push("Same country");
      } else if (
        volLoc.parts.some((vp) =>
          oppLoc.parts.some((op) => vp.includes(op) || op.includes(vp)),
        )
      ) {
        breakdown.locationMatch = 40;
        reasons.push("Same region");
      } else {
        breakdown.locationMatch = 10;
      }
    } else if (!volLoc.full && oppLoc.full) {
      breakdown.locationMatch = 30;
      reasons.push("Add your location for better local matches");
    } else if (!oppLoc.full) {
      breakdown.locationMatch = 50;
    } else {
      breakdown.locationMatch = 30;
    }
  }

  // 3. SDG Overlap Matching (20% weight)
  const volSDGs = Array.isArray(volunteer.profile?.preferredSdgs)
    ? volunteer.profile.preferredSdgs
    : [];
  const oppSDGs = Array.isArray(opportunity.sdgGoals)
    ? opportunity.sdgGoals
    : [];

  if (volSDGs.length > 0 && oppSDGs.length > 0) {
    const commonSDGs = volSDGs.filter((sdg) => oppSDGs.includes(sdg));

    if (commonSDGs.length > 0) {
      const overlapPercentage =
        (commonSDGs.length / Math.min(volSDGs.length, oppSDGs.length)) * 100;
      breakdown.sdgMatch = Math.min(overlapPercentage, 100);
      reasons.push(
        `${commonSDGs.length} common SDG goal${commonSDGs.length > 1 ? "s" : ""}: #${commonSDGs.slice(0, 3).join(", #")}`,
      );
    } else {
      breakdown.sdgMatch = 10;
    }
  } else if (oppSDGs.length === 0 && volSDGs.length === 0) {
    breakdown.sdgMatch = 40;
  } else if (volSDGs.length === 0 && oppSDGs.length > 0) {
    breakdown.sdgMatch = 30;
    reasons.push("Set SDG preferences for better mission-aligned matches");
  } else {
    breakdown.sdgMatch = 40;
  }

  // 4. Interest/Cause Matching (20% weight)
  const volCauses = Array.isArray(volunteer.profile?.preferredCauses)
    ? volunteer.profile.preferredCauses
        .map((c: string) => c.toLowerCase().trim())
        .filter((c: string) => c.length > 0)
    : [];
  const volInterests = Array.isArray(volunteer.profile?.interests)
    ? volunteer.profile.interests
        .map((i: string) => i.toLowerCase().trim())
        .filter((i: string) => i.length > 0)
    : [];
  const allVolInterests = [...volCauses, ...volInterests];

  if (allVolInterests.length > 0 && opportunity.category) {
    const category = opportunity.category.toLowerCase().trim();

    const hasMatch = allVolInterests.some(
      (interest) => interest.includes(category) || category.includes(interest),
    );

    if (hasMatch) {
      breakdown.interestMatch = 100;
      reasons.push(`Interest in ${opportunity.category}`);
    } else {
      breakdown.interestMatch = 20;
    }
  } else if (!opportunity.category && allVolInterests.length === 0) {
    breakdown.interestMatch = 40;
  } else if (allVolInterests.length === 0 && opportunity.category) {
    breakdown.interestMatch = 30;
    reasons.push("Add your interests for better cause-aligned matches");
  } else {
    breakdown.interestMatch = 40;
  }

  // 5. Availability Matching (15% weight)
  const volWeeklyAvailability = volunteer.profile?.weeklyAvailability;
  const volPreferredWorkStyle = volunteer.profile?.preferredWorkStyle?.toLowerCase();
  const oppHoursPerWeek = opportunity.ongoingHoursPerWeek;
  const oppEngagementType = opportunity.engagementType?.toLowerCase();

  let availabilityScore = 0;
  let hasAvailabilityData = false;

  // Check hours availability compatibility
  if (volWeeklyAvailability && oppHoursPerWeek) {
    hasAvailabilityData = true;
    const hoursRatio = oppHoursPerWeek / volWeeklyAvailability;
    
    if (hoursRatio <= 0.7) {
      // Opportunity requires ≤70% of available time - excellent fit
      availabilityScore += 60;
      reasons.push(`⏰ Great time fit: ${oppHoursPerWeek}hrs/week (${Math.round(hoursRatio * 100)}% of your availability)`);
    } else if (hoursRatio <= 1.0) {
      // Opportunity requires 70-100% of available time - good fit
      availabilityScore += 40;
      reasons.push(`⏰ Fits your schedule: ${oppHoursPerWeek}hrs/week commitment`);
    } else {
      // Opportunity exceeds available time
      availabilityScore += 10;
      reasons.push(`⚠️ Requires ${oppHoursPerWeek}hrs/week (more than your ${volWeeklyAvailability}hrs/week availability)`);
    }
  }

  // Check work style compatibility
  if (volPreferredWorkStyle && oppEngagementType) {
    hasAvailabilityData = true;
    const workStyleMatch = volPreferredWorkStyle === oppEngagementType || 
                           volPreferredWorkStyle === 'hybrid' || 
                           oppEngagementType === 'hybrid';
    
    if (workStyleMatch) {
      availabilityScore += 40;
      const styleLabel = oppEngagementType.charAt(0).toUpperCase() + oppEngagementType.slice(1);
      reasons.push(`💼 ${styleLabel} work matches your preference`);
    } else {
      availabilityScore += 10;
    }
  }

  // Set final availability match score
  if (hasAvailabilityData) {
    breakdown.availabilityMatch = availabilityScore;
  } else {
    // No availability data - neutral score
    breakdown.availabilityMatch = 50;
    if (!volWeeklyAvailability || !volPreferredWorkStyle) {
      reasons.push("💡 Add availability info for better time-based matching");
    }
  }

  // 6. Experience Level Matching (10% weight - bonus factor)
  const volExperience = volunteer.profile?.yearsOfExperience;
  const expScore = getExperienceScore(volExperience);
  breakdown.experienceMatch = expScore;
  
  if (volExperience) {
    const expLabel = volExperience.toLowerCase().replace(/\+/, "plus");
    reasons.push(`🎓 ${expLabel} years of experience`);
  }

  // Calculate weighted final score
  // MVP Rule-Based Matching Weights:
  // - Skill Match: 40% (non-negotiable for project success)
  // - Availability/Time Match: 25% (non-negotiable for retention & completion)
  // - SDG/Mission Overlap: 20% (essential for alignment & satisfaction)
  // - Experience Level: 10% (valuable bonus factor for seniority/skill level)
  // - Language/Location: 5% (necessary filter but lower weight)
  const weights = {
    skillMatch: 0.40,
    locationMatch: 0.05,
    sdgMatch: 0.20,
    interestMatch: 0.00, // Absorbed into SDG matching
    availabilityMatch: 0.25,
    experienceMatch: 0.10,
  };

  const finalScore = Math.round(
    breakdown.skillMatch * weights.skillMatch +
      breakdown.locationMatch * weights.locationMatch +
      breakdown.sdgMatch * weights.sdgMatch +
      breakdown.interestMatch * weights.interestMatch +
      breakdown.availabilityMatch * weights.availabilityMatch +
      breakdown.experienceMatch * weights.experienceMatch,
  );

  // Add overall assessment reason
  if (finalScore >= 80) {
    reasons.unshift("🌟 Excellent match");
  } else if (finalScore >= 60) {
    reasons.unshift("✨ Good match");
  } else if (finalScore >= 40) {
    reasons.unshift("👍 Fair match");
  } else {
    reasons.unshift("🤔 Consider other opportunities");
  }

  return {
    score: finalScore,
    breakdown,
    reasons,
    matchCategory: getMatchCategory(finalScore),
  };
}

/**
 * Categorize match score into MVP tiers for admin decision-making
 * - Nexus Match (≥80): Auto-connect - perfect fit
 * - Strong Candidate (60-79): Admin Review - solid match requiring verification
 * - Gap Detected (40-59): Manual Intervention - promising but needs discussion
 * - Below 40: Not a match
 */
export function getMatchCategory(score: number): "nexus" | "strong" | "gap" | "no-match" {
  if (score >= 80) return "nexus";
  if (score >= 60) return "strong";
  if (score >= 40) return "gap";
  return "no-match";
}

/**
 * Finds top matching opportunities for a volunteer
 */
export function findTopMatches(
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunities: Opportunity[],
  limit: number = 10,
): Array<Opportunity & { matchScore: number; matchReasons: string[] }> {
  const scoredOpportunities = opportunities
    .filter((opp) => opp.status === "open")
    .map((opp) => {
      const match = calculateMatchScore(volunteer, opp);
      return {
        ...opp,
        matchScore: match.score,
        matchReasons: match.reasons,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scoredOpportunities;
}

/**
 * Finds top matching volunteers for an opportunity
 */
export function findTopVolunteers(
  opportunity: Opportunity,
  volunteers: Array<User & { profile?: VolunteerProfile | null }>,
  limit: number = 10,
): Array<
  User & {
    profile?: VolunteerProfile | null;
    matchScore: number;
    matchReasons: string[];
  }
> {
  const scoredVolunteers = volunteers
    .filter((vol) => vol.userType === "volunteer")
    .map((vol) => {
      const match = calculateMatchScore(vol, opportunity);
      return {
        ...vol,
        matchScore: match.score,
        matchReasons: match.reasons,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scoredVolunteers;
}

// Potential Improvements
/**
 * 1. Parameterization: Allow dynamic adjustment of weights based on feedback.
 * 2. Performance Optimization: Consider using memoization for expensive calculations.
 * 3. Testing & Validation: Add unit tests for different scenarios to ensure accuracy.
 * 4. User Feedback Loop: Incorporate user feedback to refine matching criteria continuously.
 * 5. Logging: Implement logging for better traceability and debugging.
 */
