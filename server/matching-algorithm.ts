import { Opportunity, VolunteerProfile, User } from "@shared/schema";

interface MatchResult {
  score: number;
  breakdown: {
    skillMatch: number;
    locationMatch: number;
    sdgMatch: number;
    interestMatch: number;
  };
  reasons: string[];
}

/**
 * Normalize and tokenize skills for better matching
 */
function normalizeSkills(skills: string[] | null | undefined): string[] {
  if (!skills || !Array.isArray(skills) || skills.length === 0) return [];
  return skills
    .filter(s => s && typeof s === 'string')
    .map(s => s.toLowerCase().trim())
    .filter(s => s.length > 0);
}

/**
 * Normalize location string for better geographic matching
 */
function normalizeLocation(location: string | null | undefined): { 
  full: string; 
  city: string; 
  country: string; 
  parts: string[] 
} {
  if (!location || typeof location !== 'string') {
    return { full: '', city: '', country: '', parts: [] };
  }
  
  const normalized = location.toLowerCase().trim();
  const parts = normalized.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  // Only treat first part as city if we have at least 2 components
  // Otherwise, treat single value as country, not city
  return {
    full: normalized,
    city: parts.length >= 2 ? parts[0] : '',
    country: parts.length >= 2 ? parts[parts.length - 1] : (parts[0] || ''),
    parts,
  };
}

/**
 * AI-powered matching algorithm that calculates compatibility between
 * volunteers and opportunities using weighted scoring across multiple dimensions
 */
export function calculateMatchScore(
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunity: Opportunity
): MatchResult {
  const breakdown = {
    skillMatch: 0,
    locationMatch: 0,
    sdgMatch: 0,
    interestMatch: 0,
  };
  const reasons: string[] = [];

  // 1. Skills Matching (35% weight) - Most important factor
  const volunteerSkills = normalizeSkills(volunteer.skills);
  const requiredSkills = normalizeSkills(opportunity.requiredSkills);
  const optionalSkills = normalizeSkills(opportunity.optionalSkills);
  const rawSkillRatings = (volunteer.profile?.skillRatings as Record<string, number>) || {};
  
  // Create normalized skill-to-rating map for efficient proficiency lookups
  const normalizedRatings: Record<string, number> = {};
  Object.keys(rawSkillRatings).forEach(skill => {
    const normalizedKey = skill.toLowerCase().trim();
    normalizedRatings[normalizedKey] = rawSkillRatings[skill];
  });
  
  if (volunteerSkills.length > 0 && requiredSkills.length > 0) {
    // Match required skills with proficiency weighting
    const matchingRequiredSkills = volunteerSkills.filter(skill =>
      requiredSkills.some(req => 
        req.includes(skill) || skill.includes(req) || skill === req
      )
    );
    
    // Match optional skills for bonus points
    const matchingOptionalSkills = volunteerSkills.filter(skill =>
      optionalSkills.some(opt => 
        opt.includes(skill) || skill.includes(opt) || skill === opt
      )
    );
    
    // Calculate proficiency-weighted score for required skills
    let proficiencyWeightedScore = 0;
    if (matchingRequiredSkills.length > 0) {
      // For each matching skill, factor in proficiency rating if available
      const proficiencyScores = matchingRequiredSkills.map(skill => {
        // Use normalized skill to lookup rating - explicit undefined check to preserve 0% ratings
        const proficiency = normalizedRatings[skill] !== undefined ? normalizedRatings[skill] / 100 : 0.7; // Default 70% if no rating
        return proficiency;
      });
      
      // Average proficiency of matching skills
      const avgProficiency = proficiencyScores.reduce((sum, p) => sum + p, 0) / proficiencyScores.length;
      
      // Base score from skill count, enhanced by proficiency
      const baseScore = (matchingRequiredSkills.length / requiredSkills.length) * 100;
      proficiencyWeightedScore = baseScore * (0.7 + (avgProficiency * 0.3)); // 70% count, 30% proficiency
    }
    
    // Calculate optional bonus with proficiency consideration
    let optionalBonus = 0;
    if (optionalSkills.length > 0 && matchingOptionalSkills.length > 0) {
      const optionalProficiencies = matchingOptionalSkills.map(skill => {
        return normalizedRatings[skill] !== undefined ? normalizedRatings[skill] / 100 : 0.7;
      });
      const avgOptionalProficiency = optionalProficiencies.reduce((sum, p) => sum + p, 0) / optionalProficiencies.length;
      optionalBonus = Math.min((matchingOptionalSkills.length / optionalSkills.length) * 20 * avgOptionalProficiency, 20);
    }
    
    breakdown.skillMatch = Math.min(proficiencyWeightedScore + optionalBonus, 100);
    
    if (matchingRequiredSkills.length > 0) {
      const highProficiencySkills = matchingRequiredSkills.filter(skill => {
        return normalizedRatings[skill] && normalizedRatings[skill] >= 75;
      });
      
      if (highProficiencySkills.length > 0) {
        reasons.push(`${matchingRequiredSkills.length} matching skill${matchingRequiredSkills.length > 1 ? 's' : ''} (${highProficiencySkills.length} highly proficient): ${matchingRequiredSkills.slice(0, 3).join(', ')}`);
      } else {
        reasons.push(`${matchingRequiredSkills.length} matching skill${matchingRequiredSkills.length > 1 ? 's' : ''}: ${matchingRequiredSkills.slice(0, 3).join(', ')}`);
      }
    }
    if (matchingOptionalSkills.length > 0) {
      reasons.push(`+${matchingOptionalSkills.length} bonus skill${matchingOptionalSkills.length > 1 ? 's' : ''}`);
    }
  } else if (requiredSkills.length === 0) {
    // No skills required - give moderate baseline score
    breakdown.skillMatch = 50;
    reasons.push("No specific skills required");
  } else if (volunteerSkills.length === 0) {
    // Volunteer has no skills listed but opportunity requires them - encourage profile completion
    breakdown.skillMatch = 20; // Give some baseline rather than 0 to encourage exploration
    reasons.push("Complete your skills profile for better matches");
  }

  // 2. Location Matching (25% weight)
  if (opportunity.isRemote || opportunity.engagementType === 'remote') {
    breakdown.locationMatch = 100;
    reasons.push("Remote opportunity - location flexible");
  } else if (opportunity.engagementType === 'hybrid') {
    // Hybrid opportunities are more flexible
    breakdown.locationMatch = 75;
    reasons.push("Hybrid work - flexible location");
  } else {
    const volLoc = normalizeLocation(volunteer.profile?.location);
    const oppLoc = normalizeLocation(opportunity.location);
    
    if (volLoc.full && oppLoc.full) {
      // Exact city match
      if (volLoc.city && oppLoc.city && volLoc.city === oppLoc.city) {
        breakdown.locationMatch = 100;
        reasons.push("Same city");
      }
      // Same country match
      else if (volLoc.country && oppLoc.country && volLoc.country === oppLoc.country) {
        breakdown.locationMatch = 60;
        reasons.push("Same country");
      }
      // Check for any overlapping parts
      else if (volLoc.parts.some(vp => oppLoc.parts.some(op => vp.includes(op) || op.includes(vp)))) {
        breakdown.locationMatch = 40;
        reasons.push("Same region");
      } else {
        breakdown.locationMatch = 10; // Give small score for having location data
      }
    } else if (!volLoc.full && oppLoc.full) {
      // Volunteer hasn't set location - encourage profile completion but don't penalize too much
      breakdown.locationMatch = 30;
      reasons.push("Add your location for better local matches");
    } else if (!oppLoc.full) {
      // Opportunity doesn't specify location - neutral score
      breakdown.locationMatch = 50;
    } else {
      breakdown.locationMatch = 30;
    }
  }

  // 3. SDG Overlap Matching (20% weight)
  // Check SDG alignment from volunteer's preferredSdgs field
  const volSDGs = Array.isArray(volunteer.profile?.preferredSdgs) ? volunteer.profile.preferredSdgs : [];
  const oppSDGs = Array.isArray(opportunity.sdgGoals) ? opportunity.sdgGoals : [];
  
  if (volSDGs.length > 0 && oppSDGs.length > 0) {
    const commonSDGs = volSDGs.filter(sdg => oppSDGs.includes(sdg));
    
    if (commonSDGs.length > 0) {
      // Score based on overlap percentage - rewards strong alignment
      const overlapPercentage = (commonSDGs.length / Math.min(volSDGs.length, oppSDGs.length)) * 100;
      breakdown.sdgMatch = Math.min(overlapPercentage, 100);
      reasons.push(`${commonSDGs.length} common SDG goal${commonSDGs.length > 1 ? 's' : ''}: #${commonSDGs.slice(0, 3).join(', #')}`);
    } else {
      breakdown.sdgMatch = 10; // Small baseline for having SDG data even without overlap
    }
  } else if (oppSDGs.length === 0 && volSDGs.length === 0) {
    // Neither specified SDGs - neutral baseline
    breakdown.sdgMatch = 40;
  } else if (volSDGs.length === 0 && oppSDGs.length > 0) {
    // Volunteer hasn't set SDG preferences - encourage profile completion
    breakdown.sdgMatch = 30;
    reasons.push("Set SDG preferences for better mission-aligned matches");
  } else {
    // Opportunity doesn't specify SDGs - neutral
    breakdown.sdgMatch = 40;
  }

  // 4. Interest/Cause Matching (20% weight)
  const volCauses = Array.isArray(volunteer.profile?.preferredCauses) 
    ? volunteer.profile.preferredCauses.map((c: string) => c.toLowerCase().trim()).filter((c: string) => c.length > 0)
    : [];
  const volInterests = Array.isArray(volunteer.profile?.interests)
    ? volunteer.profile.interests.map((i: string) => i.toLowerCase().trim()).filter((i: string) => i.length > 0)
    : [];
  const allVolInterests = [...volCauses, ...volInterests];
  
  if (allVolInterests.length > 0 && opportunity.category) {
    const category = opportunity.category.toLowerCase().trim();
    
    // Check for exact or partial match
    const hasMatch = allVolInterests.some(interest => 
      interest.includes(category) || category.includes(interest)
    );
    
    if (hasMatch) {
      breakdown.interestMatch = 100;
      reasons.push(`Interest in ${opportunity.category}`);
    } else {
      breakdown.interestMatch = 20; // Small baseline for having interest data
    }
  } else if (!opportunity.category && allVolInterests.length === 0) {
    // Both missing - neutral baseline
    breakdown.interestMatch = 40;
  } else if (allVolInterests.length === 0 && opportunity.category) {
    // Volunteer hasn't set interests - encourage profile completion
    breakdown.interestMatch = 30;
    reasons.push("Add your interests for better cause-aligned matches");
  } else {
    // Opportunity doesn't have category - neutral
    breakdown.interestMatch = 40;
  }

  // Calculate weighted final score
  // Weights: Skills 35%, Location 25%, SDG 20%, Interests 20%
  const weights = {
    skillMatch: 0.35,
    locationMatch: 0.25,
    sdgMatch: 0.20,
    interestMatch: 0.20,
  };

  const finalScore = Math.round(
    breakdown.skillMatch * weights.skillMatch +
    breakdown.locationMatch * weights.locationMatch +
    breakdown.sdgMatch * weights.sdgMatch +
    breakdown.interestMatch * weights.interestMatch
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
  };
}

/**
 * Finds top matching opportunities for a volunteer
 */
export function findTopMatches(
  volunteer: User & { profile?: VolunteerProfile | null },
  opportunities: Opportunity[],
  limit: number = 10
): Array<Opportunity & { matchScore: number; matchReasons: string[] }> {
  const scoredOpportunities = opportunities
    .filter(opp => opp.status === 'open')
    .map(opp => {
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
  limit: number = 10
): Array<User & { profile?: VolunteerProfile | null; matchScore: number; matchReasons: string[] }> {
  const scoredVolunteers = volunteers
    .filter(vol => vol.userType === 'volunteer')
    .map(vol => {
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
