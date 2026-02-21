import { Opportunity, VolunteerProfile, User } from "@shared/schema";
import { normalizeSkillsWithSynonyms, normalizeSkillWithSynonyms, findPartialMatch } from "./skill-synonyms";

interface MatchResult {
  score: number;
  breakdown: {
    skillMatch: number;
    sectorMatch: number;
    trustScore: number;
    availabilityMatch: number;
    missionMatch: number;
    locationMatch: number;
    sdgMatch: number;
    interestMatch: number;
    experienceMatch: number;
    engagementBoost: number;
  };
  reasons: string[];
  matchCategory?: "nexus" | "strong" | "gap" | "no-match";
  dataQualityWarnings?: string[];
  confidence?: number;
  dataCompleteness?: number;
}

interface MatchingWeights {
  skillWeight: number;
  sectorWeight: number;
  locationWeight: number;
  sdgWeight: number;
  interestWeight: number;
  availabilityWeight: number;
  experienceWeight: number;
}

// 4-Factor Matching (CSRD Impact Assurance Engine):
// Skills (30%), Sector Relevance (15%), Geography/Trust (25%), SDG/Mission (15%), Availability (15%)
// Trust = engagement boost + experience + location reliability
// Mission = SDG alignment + interest overlap
const DEFAULT_WEIGHTS: MatchingWeights = {
  skillWeight: 0.30,
  sectorWeight: 0.15,
  locationWeight: 0.05,
  sdgWeight: 0.15,
  interestWeight: 0.00,
  availabilityWeight: 0.15,
  experienceWeight: 0.20,
};

// Cache for matching weights from database
let cachedWeights: MatchingWeights | null = null;
let weightsCacheTime: number = 0;
const WEIGHTS_CACHE_TTL = 60000; // 1 minute cache

/**
 * Get matching weights from database or use defaults
 * Allows dynamic tuning without code deployment
 */
export async function getMatchingWeights(): Promise<MatchingWeights> {
  const now = Date.now();

  // Return cached weights if still valid
  if (cachedWeights && (now - weightsCacheTime) < WEIGHTS_CACHE_TTL) {
    return cachedWeights;
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { storage } = await import("./storage");
    const dbWeights = await storage.getLatestMatchingWeights?.();

    if (dbWeights) {
      cachedWeights = {
        skillWeight: dbWeights.skillWeight ?? DEFAULT_WEIGHTS.skillWeight,
        sectorWeight: (dbWeights as any).sectorWeight ?? DEFAULT_WEIGHTS.sectorWeight,
        locationWeight: dbWeights.locationWeight ?? DEFAULT_WEIGHTS.locationWeight,
        sdgWeight: dbWeights.sdgWeight ?? DEFAULT_WEIGHTS.sdgWeight,
        interestWeight: DEFAULT_WEIGHTS.interestWeight, // Not in DB schema yet
        availabilityWeight: dbWeights.availabilityWeight ?? DEFAULT_WEIGHTS.availabilityWeight,
        experienceWeight: DEFAULT_WEIGHTS.experienceWeight, // Not in DB schema yet
      };
      weightsCacheTime = now;
      return cachedWeights;
    }
  } catch (error) {
    console.warn("Could not fetch matching weights from database, using defaults:", error);
  }

  return DEFAULT_WEIGHTS;
}

/**
 * Calculate completion rate for a volunteer based on their project assignments
 * Returns a value between 0 and 1
 */
export async function getVolunteerCompletionRate(volunteerId: number): Promise<number | undefined> {
  try {
    const { storage } = await import("./storage");
    const assignments = await storage.listProjectAssignmentsByVolunteer(volunteerId);

    if (!assignments || assignments.length === 0) {
      return undefined; // No history to calculate from
    }

    // Count completed vs total (excluding pending/declined)
    const relevantAssignments = assignments.filter(a =>
      a.status && ['active', 'completed', 'on-hold'].includes(a.status.toLowerCase())
    );

    if (relevantAssignments.length === 0) {
      return undefined;
    }

    const completed = relevantAssignments.filter(a =>
      a.status?.toLowerCase() === 'completed'
    ).length;

    const baseRate = completed / relevantAssignments.length;
    return baseRate;
  } catch (error) {
    console.warn("Could not calculate volunteer completion rate:", error);
    return undefined;
  }
}

/**
 * Calculate data completeness score for a volunteer profile
 * Returns percentage (0-100) of how complete their profile is for matching
 */
function calculateDataCompleteness(
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunity: Opportunity
): { score: number; missingFields: string[] } {
  const missingFields: string[] = [];
  let filledCount = 0;
  let totalWeight = 0;

  // Critical fields (high weight)
  const criticalFields = [
    { name: 'skills', weight: 3, check: () => volunteer.skills && volunteer.skills.length > 0 },
    { name: 'weeklyAvailability', weight: 2, check: () => volunteer.profile?.weeklyAvailability != null },
    { name: 'location', weight: 2, check: () => !!volunteer.profile?.location },
  ];

  // Important fields (medium weight)
  const importantFields = [
    { name: 'preferredWorkStyle', weight: 1.5, check: () => !!volunteer.profile?.preferredWorkStyle },
    { name: 'preferredSdgs', weight: 1.5, check: () => Array.isArray(volunteer.profile?.preferredSdgs) && volunteer.profile!.preferredSdgs.length > 0 },
    { name: 'skillRatings', weight: 1, check: () => volunteer.profile?.skillRatings && Object.keys(volunteer.profile.skillRatings as object).length > 0 },
  ];

  // Nice to have fields (low weight)
  const niceToHaveFields = [
    { name: 'yearsOfExperience', weight: 0.5, check: () => !!volunteer.profile?.yearsOfExperience },
    { name: 'preferredCauses', weight: 0.5, check: () => Array.isArray(volunteer.profile?.preferredCauses) && volunteer.profile!.preferredCauses.length > 0 },
    { name: 'interests', weight: 0.5, check: () => Array.isArray(volunteer.profile?.interests) && volunteer.profile!.interests.length > 0 },
  ];

  const allFields = [...criticalFields, ...importantFields, ...niceToHaveFields];

  for (const field of allFields) {
    totalWeight += field.weight;
    if (field.check()) {
      filledCount += field.weight;
    } else {
      missingFields.push(field.name);
    }
  }

  // Check opportunity-specific requirements
  if (opportunity.requiredSkills && opportunity.requiredSkills.length > 0) {
    if (!volunteer.skills || volunteer.skills.length === 0) {
      // Skills are especially important when opportunity requires them
      totalWeight += 2; // Additional penalty weight
    }
  }

  const score = Math.round((filledCount / totalWeight) * 100);
  return { score, missingFields };
}

/**
 * Calculate match confidence based on data quality and match characteristics
 * Returns 0-100 where higher = more confident in the match accuracy
 */
function calculateMatchConfidence(
  dataCompleteness: number,
  breakdown: MatchResult['breakdown'],
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunity: Opportunity
): number {
  let confidence = dataCompleteness; // Start with data completeness

  // Boost confidence if we have strong signals in multiple dimensions
  const strongSignals = [
    breakdown.skillMatch >= 70,
    breakdown.sectorMatch >= 70,
    breakdown.sdgMatch >= 70,
    breakdown.availabilityMatch >= 70,
    breakdown.locationMatch >= 70,
  ].filter(Boolean).length;

  if (strongSignals >= 3) {
    confidence = Math.min(confidence + 15, 100);
  } else if (strongSignals >= 2) {
    confidence = Math.min(confidence + 10, 100);
  }

  // Reduce confidence for edge cases
  if (!volunteer.profile) {
    confidence = Math.max(confidence - 30, 10);
  }

  // Reduce confidence if opportunity has no required skills (hard to validate match)
  if (!opportunity.requiredSkills || opportunity.requiredSkills.length === 0) {
    confidence = Math.max(confidence - 10, 20);
  }

  // Reduce confidence for very polarized breakdowns (some high, some very low)
  const scores = [
    breakdown.skillMatch,
    breakdown.sdgMatch,
    breakdown.availabilityMatch,
    breakdown.locationMatch,
    breakdown.interestMatch,
  ];
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  if (maxScore - minScore > 60) {
    // High variance indicates uncertainty
    confidence = Math.max(confidence - 10, 20);
  }

  return Math.round(confidence);
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
 * Uses synonym mapping to canonicalize skill names (e.g., "Programmer" -> "software developer")
 * This improves matching between equivalent skills with different names
 */
function normalizeSkills(skills: string[] | null | undefined): string[] {
  if (!skills || !Array.isArray(skills) || skills.length === 0) return [];
  // Use synonym-aware normalization for improved matching
  return normalizeSkillsWithSynonyms(skills);
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
 *
 * @param volunteer - Volunteer user with optional profile
 * @param opportunity - Opportunity to match against
 * @param weights - Optional custom weights (uses defaults if not provided)
 * @param completionRate - Optional volunteer completion rate for engagement boost
 */
export function calculateMatchScore(
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunity: Opportunity,
  weights?: MatchingWeights,
  completionRate?: number,
): MatchResult {
  // Use provided weights or defaults
  const matchWeights = weights || DEFAULT_WEIGHTS;
  const breakdown = {
    skillMatch: 0,
    sectorMatch: 0,
    trustScore: 0,
    availabilityMatch: 0,
    missionMatch: 0,
    locationMatch: 0,
    sdgMatch: 0,
    interestMatch: 0,
    experienceMatch: 0,
    engagementBoost: 0,
  };
  const reasons: string[] = [];
  
  // Validate data completeness and collect warnings
  const volunteerWarnings = validateVolunteerData(volunteer);
  const opportunityWarnings = validateOpportunityData(opportunity);
  const dataQualityWarnings = [...volunteerWarnings, ...opportunityWarnings];

  // 1. Skills Matching (35% weight)
  const volunteerSkills = normalizeSkills(volunteer.skills);
  const requiredSkills = normalizeSkills(opportunity.requiredSkills);
  const optionalSkills = normalizeSkills(opportunity.optionalSkills);
  const rawSkillRatings =
    (volunteer.profile?.skillRatings as Record<string, number>) || {};

  // Create normalized skill-to-rating map for efficient proficiency lookups
  // Uses synonym-aware normalization so proficiency is found even if skill names differ
  const normalizedRatings: Record<string, number> = {};
  Object.keys(rawSkillRatings).forEach((skill) => {
    const normalizedKey = normalizeSkillWithSynonyms(skill);
    if (normalizedKey) {
      normalizedRatings[normalizedKey] = rawSkillRatings[skill];
    }
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
            : 0.5; // Default 50% if no rating (conservative estimate)
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
          : 0.5; // Default 50% if no rating (conservative estimate)
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

  // 2. Industry Sector Matching (15% weight)
  const volunteerSectors = (volunteer.profile?.sectorExpertise as string[] || []).map(s => s.toLowerCase().trim());
  const opportunitySectors = ((opportunity as any).sectorRequirements as string[] || []).map(s => s.toLowerCase().trim());
  // Also consider the opportunity category as a sector signal
  const oppCategory = (opportunity.category || '').toLowerCase().trim();

  if (volunteerSectors.length > 0 && (opportunitySectors.length > 0 || oppCategory)) {
    const targetSectors = opportunitySectors.length > 0 ? opportunitySectors : (oppCategory ? [oppCategory] : []);
    const matchingSectors = volunteerSectors.filter(sector =>
      targetSectors.some(target =>
        target.includes(sector) || sector.includes(target) || target === sector
      )
    );

    if (matchingSectors.length > 0) {
      breakdown.sectorMatch = Math.min((matchingSectors.length / targetSectors.length) * 100, 100);
      reasons.push(`${matchingSectors.length} sector match${matchingSectors.length > 1 ? "es" : ""}: ${matchingSectors.slice(0, 2).join(", ")}`);
    } else {
      breakdown.sectorMatch = 10;
    }
  } else if (opportunitySectors.length === 0 && !oppCategory) {
    // No sector requirements - neutral match
    breakdown.sectorMatch = 50;
  } else if (volunteerSectors.length === 0) {
    breakdown.sectorMatch = 30;
    reasons.push("Add industry sectors to your profile for better matches");
  }

  // 3. Location Matching (25% weight)
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

  // 4. Interest/Cause Matching (10% weight) - granular scoring
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

    // Check for exact or partial matches
    const matchCount = allVolInterests.filter(
      (interest) => interest.includes(category) || category.includes(interest),
    ).length;

    if (matchCount > 0) {
      // Granular scoring: base 60% + bonus for match proportion
      const matchProportion = (matchCount / allVolInterests.length) * 100;
      breakdown.interestMatch = Math.min(60 + matchProportion * 0.4, 100); // Proportional bonus up to 100
      reasons.push(`${matchCount}/${allVolInterests.length} interests align with ${opportunity.category}`);
    } else {
      breakdown.interestMatch = 20; // Some interests, but category doesn't match
    }
  } else if (!opportunity.category && allVolInterests.length === 0) {
    breakdown.interestMatch = 40;
  } else if (allVolInterests.length === 0 && opportunity.category) {
    breakdown.interestMatch = 35; // Opportunity has category but volunteer has no interests
    reasons.push("Add your interests for better cause-aligned matches");
  } else if (opportunity.category) {
    // Category exists but no volunteer interests recorded - neutral
    breakdown.interestMatch = 40;
  } else {
    breakdown.interestMatch = 30;
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
      availabilityScore += 50;
      const styleLabel = oppEngagementType.charAt(0).toUpperCase() + oppEngagementType.slice(1);
      if (!volPreferredWorkStyle) {
        reasons.push(`💼 ${styleLabel} work available (set preference to lock this in)`);
      } else {
        reasons.push(`💼 ${styleLabel} work matches your preference`);
      }
    } else {
      // Work style mismatch: only add 5 points (significant penalty relative to match bonus)
      // This reduces availability score by 45 points compared to match (from 50 to 5)
      availabilityScore += 5;
      const volStyle = effectiveWorkStyle.charAt(0).toUpperCase() + effectiveWorkStyle.slice(1);
      const oppStyle = oppEngagementType.charAt(0).toUpperCase() + oppEngagementType.slice(1);
      reasons.push(`⚠️ Work style mismatch: You prefer ${volStyle}, this is ${oppStyle}`);
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
  // Uses completion rate if provided for reliability scoring
  const engagementResult = calculateEngagementBoost(volunteer, undefined, completionRate);
  breakdown.engagementBoost = engagementResult.boost;
  reasons.push(...engagementResult.reasons);

  // 4-Factor MVP Matching:
  // - Skills: 35% (critical for project success, proficiency-weighted)
  // - Trust: 30% (experience 25% + location reliability 5% + engagement boost)
  // - Availability: 25% (non-negotiable for retention & completion)
  // - Mission: 10% (SDG alignment)

  breakdown.trustScore = Math.min(
    Math.round(breakdown.experienceMatch * 0.75 + breakdown.locationMatch * 0.15 + breakdown.engagementBoost * 0.10),
    100
  );
  breakdown.missionMatch = breakdown.sdgMatch;

  // 4-Factor Score: Skills (30%) + Sector (15%) + Trust/Geo (25%) + SDG/Mission (15%) + Availability (15%)
  const finalScore = Math.min(Math.round(
    breakdown.skillMatch * matchWeights.skillWeight +
    breakdown.sectorMatch * matchWeights.sectorWeight +
    breakdown.trustScore * (matchWeights.experienceWeight + matchWeights.locationWeight) +
    breakdown.missionMatch * matchWeights.sdgWeight +
    breakdown.availabilityMatch * matchWeights.availabilityWeight
  ), 100);

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

  // Calculate data completeness and match confidence for certainty metrics
  const completenessResult = calculateDataCompleteness(volunteer, opportunity);
  const confidence = calculateMatchConfidence(
    completenessResult.score,
    breakdown,
    volunteer,
    opportunity
  );

  return {
    score: finalScore,
    breakdown,
    reasons,
    matchCategory: getMatchCategory(finalScore),
    dataQualityWarnings: dataQualityWarnings.length > 0 ? dataQualityWarnings : undefined,
    confidence,
    dataCompleteness: completenessResult.score,
  };
}

/**
 * Async version of calculateMatchScore that fetches dynamic weights from database
 * and calculates volunteer completion rate for engagement boost.
 * Use this for critical matching operations where accuracy is paramount.
 */
export async function calculateMatchScoreAsync(
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunity: Opportunity,
): Promise<MatchResult> {
  // Fetch dynamic weights from database
  const weights = await getMatchingWeights();

  // Calculate completion rate for engagement boost
  const completionRate = await getVolunteerCompletionRate(volunteer.id);

  // Calculate match with dynamic weights and completion rate
  return calculateMatchScore(volunteer, opportunity, weights, completionRate);
}

/**
 * Batch calculate match scores with shared weights (more efficient for bulk operations)
 * Fetches weights once and reuses them for all calculations
 */
export async function calculateMatchScoresBatch(
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunities: Opportunity[],
): Promise<Array<Opportunity & MatchResult>> {
  // Fetch dynamic weights once
  const weights = await getMatchingWeights();

  // Fetch completion rate once
  const completionRate = await getVolunteerCompletionRate(volunteer.id);

  // Calculate matches for all opportunities with shared weights
  return opportunities.map((opp) => ({
    ...opp,
    ...calculateMatchScore(volunteer, opp, weights, completionRate),
  }));
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
  console.log(`[findTopVolunteers] Input: ${volunteers.length} volunteers, limit=${limit}`);

  const volunteerTypeFiltered = volunteers.filter((vol) => vol.userType === "volunteer");
  console.log(`[findTopVolunteers] After userType filter: ${volunteerTypeFiltered.length} volunteers`);

  const scoredVolunteers = volunteerTypeFiltered
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

  console.log(`[findTopVolunteers] Output: ${scoredVolunteers.length} volunteers, top score: ${scoredVolunteers[0]?.matchScore || 'N/A'}`);
  return scoredVolunteers;
}

/**
 * Derive category from SDG goals for interest matching
 * Maps SDG numbers to categories like healthcare, education, environment, etc.
 */
export function deriveCategoryFromSDGs(sdgGoals: number[] | null | undefined, primarySdg?: number | null): string | null {
  const sdgToCategory: Record<number, string> = {
    1: "poverty",
    2: "hunger",
    3: "healthcare",
    4: "education",
    5: "gender equality",
    6: "clean water",
    7: "energy",
    8: "economy",
    9: "industry",
    10: "inequality",
    11: "cities",
    12: "sustainability",
    13: "climate",
    14: "ocean",
    15: "environment",
    16: "peace",
    17: "partnership",
  };

  // Use primarySdg first if available
  if (primarySdg && sdgToCategory[primarySdg]) {
    return sdgToCategory[primarySdg];
  }

  // Otherwise use first SDG goal
  if (sdgGoals && sdgGoals.length > 0 && sdgToCategory[sdgGoals[0]]) {
    return sdgToCategory[sdgGoals[0]];
  }

  return null;
}

/**
 * Track match analytics for feedback loop and algorithm tuning
 * Records match calculation results to enable:
 * - Analysis of match quality vs. actual outcomes
 * - A/B testing of different weight configurations
 * - Identification of matching patterns that lead to success
 */
export async function trackMatchAnalytics(
  volunteerId: number,
  opportunityId: number,
  matchResult: MatchResult,
  outcome?: 'viewed' | 'saved' | 'rejected' | 'applied' | 'ignored',
  weights?: MatchingWeights
): Promise<void> {
  try {
    const { storage } = await import("./storage");

    // Check if we already have an analytics record for this pair
    const existing = await storage.getMatchAnalytics?.(volunteerId, opportunityId);

    if (existing) {
      // Update existing record with new outcome
      if (outcome) {
        await storage.updateMatchAnalytics?.(existing.id, { outcome });
      }
      return;
    }

    // Create new analytics record
    await storage.createMatchAnalytics?.({
      volunteerId,
      opportunityId,
      matchScore: matchResult.score,
      confidence: matchResult.confidence ?? null,
      dataCompleteness: matchResult.dataCompleteness ?? null,
      matchCategory: matchResult.matchCategory ?? null,
      skillMatchScore: Math.round(matchResult.breakdown.skillMatch),
      sdgMatchScore: Math.round(matchResult.breakdown.sdgMatch),
      locationMatchScore: Math.round(matchResult.breakdown.locationMatch),
      availabilityMatchScore: Math.round(matchResult.breakdown.availabilityMatch),
      interestMatchScore: Math.round(matchResult.breakdown.interestMatch),
      experienceMatchScore: Math.round(matchResult.breakdown.experienceMatch),
      engagementBoost: Math.round(matchResult.breakdown.engagementBoost),
      outcome: outcome ?? null,
      weightsSnapshot: weights || DEFAULT_WEIGHTS,
    });
  } catch (error) {
    // Non-critical - log but don't fail the match operation
    console.warn("Failed to track match analytics:", error);
  }
}

/**
 * Update match outcome when volunteer takes action
 * Call this when:
 * - Volunteer saves an opportunity
 * - Volunteer rejects an opportunity
 * - Volunteer applies to an opportunity
 */
export async function updateMatchOutcome(
  volunteerId: number,
  opportunityId: number,
  outcome: 'saved' | 'rejected' | 'applied'
): Promise<void> {
  try {
    const { storage } = await import("./storage");
    const existing = await storage.getMatchAnalytics?.(volunteerId, opportunityId);

    if (existing) {
      await storage.updateMatchAnalytics?.(existing.id, { outcome });
    }
  } catch (error) {
    console.warn("Failed to update match outcome:", error);
  }
}

/**
 * Record volunteer feedback on match quality
 * Call this when volunteer rates how relevant a match was
 */
export async function recordMatchFeedback(
  volunteerId: number,
  opportunityId: number,
  feedback: 1 | 2 | 3 | 4 | 5
): Promise<void> {
  try {
    const { storage } = await import("./storage");
    const existing = await storage.getMatchAnalytics?.(volunteerId, opportunityId);

    if (existing) {
      await storage.updateMatchAnalytics?.(existing.id, { volunteerFeedback: feedback });
    }
  } catch (error) {
    console.warn("Failed to record match feedback:", error);
  }
}

/**
 * Calculate algorithm effectiveness metrics
 * Returns stats on how well matches are performing
 */
export async function getMatchEffectivenessMetrics(): Promise<{
  totalMatches: number;
  avgScore: number;
  avgConfidence: number;
  outcomeBreakdown: Record<string, number>;
  avgFeedback: number | null;
  conversionRate: number; // % of viewed that became applied
}> {
  try {
    const { storage } = await import("./storage");
    const analytics = await storage.listMatchAnalytics?.() || [];

    if (analytics.length === 0) {
      return {
        totalMatches: 0,
        avgScore: 0,
        avgConfidence: 0,
        outcomeBreakdown: {},
        avgFeedback: null,
        conversionRate: 0,
      };
    }

    const totalMatches = analytics.length;
    const avgScore = analytics.reduce((sum, a) => sum + a.matchScore, 0) / totalMatches;
    const withConfidence = analytics.filter(a => a.confidence != null);
    const avgConfidence = withConfidence.length > 0
      ? withConfidence.reduce((sum, a) => sum + (a.confidence || 0), 0) / withConfidence.length
      : 0;

    const outcomeBreakdown: Record<string, number> = {};
    for (const a of analytics) {
      const outcome = a.outcome || 'unknown';
      outcomeBreakdown[outcome] = (outcomeBreakdown[outcome] || 0) + 1;
    }

    const withFeedback = analytics.filter(a => a.volunteerFeedback != null);
    const avgFeedback = withFeedback.length > 0
      ? withFeedback.reduce((sum, a) => sum + (a.volunteerFeedback || 0), 0) / withFeedback.length
      : null;

    const viewed = outcomeBreakdown['viewed'] || 0;
    const applied = outcomeBreakdown['applied'] || 0;
    const conversionRate = viewed > 0 ? (applied / viewed) * 100 : 0;

    return {
      totalMatches,
      avgScore: Math.round(avgScore),
      avgConfidence: Math.round(avgConfidence),
      outcomeBreakdown,
      avgFeedback,
      conversionRate: Math.round(conversionRate * 10) / 10,
    };
  } catch (error) {
    console.warn("Failed to get match effectiveness metrics:", error);
    return {
      totalMatches: 0,
      avgScore: 0,
      avgConfidence: 0,
      outcomeBreakdown: {},
      avgFeedback: null,
      conversionRate: 0,
    };
  }
}

// Potential Improvements
/**
 * 1. Parameterization: Allow dynamic adjustment of weights based on feedback. ✅ DONE
 * 2. Performance Optimization: Consider using memoization for expensive calculations.
 * 3. Testing & Validation: Add unit tests for different scenarios to ensure accuracy.
 * 4. User Feedback Loop: Incorporate user feedback to refine matching criteria continuously. ✅ DONE
 * 5. Logging: Implement logging for better traceability and debugging. ✅ DONE via analytics
 */
