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
    engagementBoost: number;
  };
  reasons: string[];
  matchCategory?: "nexus" | "strong" | "gap" | "no-match";
  dataQualityWarnings?: string[];
}

/**
 * Validate opportunity data completeness for accurate matching
 * Returns warnings for missing critical fields that affect match scoring
 */
export function validateOpportunityData(opportunity: Opportunity): string[] {
  const warnings: string[] = [];
  
  if (!opportunity.category) {
    warnings.push("⚠️ Missing category field - interest matching disabled");
  }
  if (!opportunity.engagementType) {
    warnings.push("⚠️ Missing engagement type - work style matching limited");
  }
  if (!opportunity.ongoingHoursPerWeek && opportunity.commitmentType !== "event") {
    warnings.push("⚠️ Missing weekly hours - availability matching limited");
  }
  if (!opportunity.requiredSkills || opportunity.requiredSkills.length === 0) {
    warnings.push("⚠️ No required skills specified - skill matching disabled");
  }
  if (!opportunity.primarySdg && (!opportunity.sdgGoals || opportunity.sdgGoals.length === 0)) {
    warnings.push("⚠️ No SDG alignment specified - mission matching disabled");
  }
  
  return warnings;
}

/**
 * Validate volunteer profile data completeness for accurate matching
 * Returns warnings for missing fields that affect match scoring
 */
export function validateVolunteerData(volunteer: User & { profile?: VolunteerProfile | null }): string[] {
  const warnings: string[] = [];
  const profile = volunteer.profile;
  
  if (!profile) {
    warnings.push("⚠️ No volunteer profile - comprehensive matching unavailable");
    return warnings;
  }
  
  if (!profile.location) {
    warnings.push("⚠️ Missing location - geographic matching disabled");
  }
  if (!profile.weeklyAvailability) {
    warnings.push("⚠️ Missing weekly availability - time-based matching limited");
  }
  if (!profile.preferredWorkStyle) {
    warnings.push("⚠️ Missing work style preference - work arrangement matching limited");
  }
  if (!profile.yearsOfExperience) {
    warnings.push("⚠️ Missing experience level - experience matching disabled");
  }
  if (!Array.isArray(profile.preferredSdgs) || profile.preferredSdgs.length === 0) {
    warnings.push("⚠️ No SDG preferences - mission alignment matching limited");
  }
  if (!Array.isArray(profile.skills) || profile.skills.length === 0) {
    warnings.push("⚠️ No skills listed - skill matching disabled");
  }
  
  return warnings;
}


/**
 * Calculate engagement boost based on volunteer activity and profile completeness
 * Returns a bonus score of 0-10 points
 */
function calculateEngagementBoost(
  volunteer: User & { profile?: VolunteerProfile | null },
  recentActivityDays?: number,
  completionRate?: number
): { boost: number; reasons: string[] } {
  let boost = 0;
  const reasons: string[] = [];

  // 1. Recent Activity Bonus (0-5 points)
  // Check if volunteer has had activity in the last 30 days
  // Note: lastActivityDate is on User, not profile
  const lastActivity = (volunteer as any).lastActivityDate;
  if (lastActivity) {
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceActivity <= 7) {
      boost += 5;
      reasons.push("🔥 Very active (activity this week)");
    } else if (daysSinceActivity <= 30) {
      boost += 3;
      reasons.push("✅ Recently active (activity this month)");
    } else if (daysSinceActivity <= 90) {
      boost += 1;
      reasons.push("📅 Active in last quarter");
    }
  } else if (recentActivityDays !== undefined && recentActivityDays <= 30) {
    boost += recentActivityDays <= 7 ? 5 : 3;
    reasons.push(recentActivityDays <= 7 ? "🔥 Very active volunteer" : "✅ Recently active");
  }

  // 2. Completion Rate Bonus (0-3 points) - if provided externally
  if (completionRate !== undefined) {
    if (completionRate >= 0.8) {
      boost += 3;
      reasons.push(`🎯 High completion rate (${Math.round(completionRate * 100)}%)`);
    } else if (completionRate >= 0.5) {
      boost += 1;
      reasons.push(`📊 Good completion rate (${Math.round(completionRate * 100)}%)`);
    }
  }

  // 3. Profile Completeness Bonus (0-2 points)
  const profile = volunteer.profile;
  if (profile) {
    let filledFields = 0;
    const totalFields = 10;
    
    if (profile.location) filledFields++;
    if (profile.yearsOfExperience) filledFields++;
    if (profile.weeklyAvailability) filledFields++;
    if (profile.preferredWorkStyle) filledFields++;
    if (Array.isArray(profile.preferredSdgs) && profile.preferredSdgs.length > 0) filledFields++;
    if (Array.isArray(profile.preferredCauses) && profile.preferredCauses.length > 0) filledFields++;
    if (profile.motivations) filledFields++;
    if (profile.onboardingCompleted) filledFields++;
    if (volunteer.skills && volunteer.skills.length > 0) filledFields++;
    if (profile.skillRatings && Object.keys(profile.skillRatings as object).length > 0) filledFields++;
    
    const completeness = filledFields / totalFields;
    if (completeness >= 0.9) {
      boost += 2;
      reasons.push("📋 Complete profile");
    } else if (completeness >= 0.7) {
      boost += 1;
      reasons.push("📝 Well-detailed profile");
    }
  }

  return { boost: Math.min(boost, 10), reasons };
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
    engagementBoost: 0,
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

  // 3. SDG Overlap Matching (20% weight) with Primary SDG Priority Boost
  const volSDGs = Array.isArray(volunteer.profile?.preferredSdgs)
    ? volunteer.profile.preferredSdgs
    : [];
  const oppSDGs = Array.isArray(opportunity.sdgGoals)
    ? opportunity.sdgGoals
    : [];
  // Get volunteer's primary SDG (first in their list, typically most important)
  const volunteerPrimarySDG = volSDGs.length > 0 ? volSDGs[0] : null;

  if (volSDGs.length > 0 && oppSDGs.length > 0) {
    const commonSDGs = volSDGs.filter((sdg) => oppSDGs.includes(sdg));

    if (commonSDGs.length > 0) {
      const overlapPercentage =
        (commonSDGs.length / Math.min(volSDGs.length, oppSDGs.length)) * 100;
      
      // Apply 1.2x boost if volunteer's PRIMARY SDG is in the match
      const primarySDGBoost = (volunteerPrimarySDG && commonSDGs.includes(volunteerPrimarySDG)) ? 1.2 : 1.0;
      breakdown.sdgMatch = Math.min(overlapPercentage * primarySDGBoost, 100);
      
      const primaryNote = primarySDGBoost > 1 ? " (primary SDG match!)" : "";
      reasons.push(
        `${commonSDGs.length} common SDG goal${commonSDGs.length > 1 ? "s" : ""}: #${commonSDGs.slice(0, 3).join(", #")}${primaryNote}`,
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

  // 5. Availability Matching (20% weight)
  const volWeeklyAvailability = volunteer.profile?.weeklyAvailability;
  const volPreferredWorkStyle = volunteer.profile?.preferredWorkStyle?.toLowerCase();
  const oppHoursPerWeek = opportunity.ongoingHoursPerWeek;
  const oppEngagementType = opportunity.engagementType?.toLowerCase();

  let availabilityScore = 0;
  let hasAvailabilityData = false;

  // Check hours availability compatibility - 4-tier granular scoring
  if (volWeeklyAvailability && oppHoursPerWeek) {
    hasAvailabilityData = true;
    const hoursRatio = oppHoursPerWeek / volWeeklyAvailability;
    
    if (hoursRatio <= 0.5) {
      // Opportunity requires ≤50% of available time - under-utilized, excellent fit
      availabilityScore += 100;
      reasons.push(`⏰ Perfect time fit: ${oppHoursPerWeek}hrs/week (${Math.round(hoursRatio * 100)}% of your availability)`);
    } else if (hoursRatio <= 0.8) {
      // Opportunity requires 50-80% of available time - good balanced fit
      availabilityScore += 80;
      reasons.push(`⏰ Great time fit: ${oppHoursPerWeek}hrs/week (${Math.round(hoursRatio * 100)}% of availability)`);
    } else if (hoursRatio <= 1.0) {
      // Opportunity requires 80-100% of available time - tight but doable
      availabilityScore += 60;
      reasons.push(`⏰ Fits your schedule: ${oppHoursPerWeek}hrs/week commitment`);
    } else {
      // Opportunity exceeds available time - over-committed
      availabilityScore += 20;
      reasons.push(`⚠️ Requires ${oppHoursPerWeek}hrs/week (more than your ${volWeeklyAvailability}hrs/week availability)`);
    }
  }

  // Check work style compatibility - use opportunity engagement type if preference not set
  let effectiveWorkStyle = volPreferredWorkStyle;
  if (!effectiveWorkStyle && oppEngagementType) {
    // If volunteer hasn't set preference, assume they can do the opportunity's engagement type
    effectiveWorkStyle = oppEngagementType;
  }

  if (effectiveWorkStyle && oppEngagementType) {
    hasAvailabilityData = true;
    const workStyleMatch = effectiveWorkStyle === oppEngagementType || 
                           effectiveWorkStyle === 'hybrid' || 
                           oppEngagementType === 'hybrid';
    
    if (workStyleMatch) {
      availabilityScore += 40;
      const styleLabel = oppEngagementType.charAt(0).toUpperCase() + oppEngagementType.slice(1);
      if (!volPreferredWorkStyle) {
        reasons.push(`💼 ${styleLabel} work available (set preference to lock this in)`);
      } else {
        reasons.push(`💼 ${styleLabel} work matches your preference`);
      }
    } else {
      availabilityScore += 10;
      reasons.push(`⚠️ Work style preference differs from opportunity type`);
    }
  }

  // Set final availability match score
  if (hasAvailabilityData) {
    breakdown.availabilityMatch = Math.min(availabilityScore, 100);
  } else {
    // No availability data - neutral score
    breakdown.availabilityMatch = 50;
    if (!volWeeklyAvailability || !volPreferredWorkStyle) {
      reasons.push("💡 Set your weekly availability & work style preference for better time-based matching");
    }
  }

  // 6. Experience Level Matching (5% weight - bonus factor)
  const volExperience = volunteer.profile?.yearsOfExperience;
  const expScore = getExperienceScore(volExperience);
  breakdown.experienceMatch = expScore;
  
  if (volExperience) {
    const expLabel = volExperience.toLowerCase().replace(/\+/, "plus");
    reasons.push(`🎓 ${expLabel} years of experience`);
  }

  // 7. Engagement Boost (0-10 bonus points)
  // Rewards active, reliable volunteers with complete profiles
  const engagementResult = calculateEngagementBoost(volunteer);
  breakdown.engagementBoost = engagementResult.boost;
  reasons.push(...engagementResult.reasons);

  // Calculate weighted final score
  // OPTIMIZED Matching Weights (Nov 2025):
  // - Skill Match: 35% (critical for project success, proficiency-weighted)
  // - SDG/Mission Overlap: 20% (essential for alignment & satisfaction)
  // - Availability/Time Match: 20% (non-negotiable for retention & completion)
  // - Interest/Cause Match: 10% (re-enabled for better mission alignment)
  // - Location Match: 10% (increased for hybrid work considerations)
  // - Experience Level: 5% (bonus factor for seniority)
  // + Engagement Boost: 0-10 bonus points for active, reliable volunteers
  const weights = {
    skillMatch: 0.35,
    locationMatch: 0.10,
    sdgMatch: 0.20,
    interestMatch: 0.10, // Re-enabled for mission alignment
    availabilityMatch: 0.20,
    experienceMatch: 0.05,
  };

  // Base weighted score (0-100) + Engagement boost (0-10 bonus)
  const baseScore = 
    breakdown.skillMatch * weights.skillMatch +
    breakdown.locationMatch * weights.locationMatch +
    breakdown.sdgMatch * weights.sdgMatch +
    breakdown.interestMatch * weights.interestMatch +
    breakdown.availabilityMatch * weights.availabilityMatch +
    breakdown.experienceMatch * weights.experienceMatch;
  
  // Final score capped at 100, includes engagement boost
  const finalScore = Math.min(Math.round(baseScore + breakdown.engagementBoost), 100);

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
