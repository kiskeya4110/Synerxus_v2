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
  if (volunteer.skills && volunteer.skills.length > 0 && opportunity.requiredSkills && opportunity.requiredSkills.length > 0) {
    const volunteerSkills = volunteer.skills.map(s => s.toLowerCase().trim());
    const requiredSkills = opportunity.requiredSkills.map(s => s.toLowerCase().trim());
    
    const matchingSkills = volunteerSkills.filter(skill =>
      requiredSkills.some(req => 
        req.includes(skill) || skill.includes(req) || skill === req
      )
    );
    
    breakdown.skillMatch = Math.min(
      (matchingSkills.length / requiredSkills.length) * 100,
      100
    );
    
    if (matchingSkills.length > 0) {
      reasons.push(`${matchingSkills.length} matching skill${matchingSkills.length > 1 ? 's' : ''}: ${matchingSkills.slice(0, 3).join(', ')}`);
    }
  } else if (!opportunity.requiredSkills || opportunity.requiredSkills.length === 0) {
    // No skills required - give moderate baseline score
    breakdown.skillMatch = 50;
    reasons.push("No specific skills required");
  } else if (!volunteer.skills || volunteer.skills.length === 0) {
    // Volunteer has no skills listed but opportunity requires them
    breakdown.skillMatch = 0;
  }

  // 2. Location Matching (25% weight)
  if (opportunity.isRemote) {
    breakdown.locationMatch = 100;
    reasons.push("Remote opportunity - location flexible");
  } else if (volunteer.profile?.location && opportunity.location) {
    const volLocation = volunteer.profile.location.toLowerCase().trim();
    const oppLocation = opportunity.location.toLowerCase().trim();
    
    if (volLocation.includes(oppLocation) || oppLocation.includes(volLocation)) {
      breakdown.locationMatch = 100;
      reasons.push("Same location");
    } else {
      // Check for same country/region
      const volParts = volLocation.split(',').map(p => p.trim());
      const oppParts = oppLocation.split(',').map(p => p.trim());
      
      if (volParts.some(vp => oppParts.some(op => vp.includes(op) || op.includes(vp)))) {
        breakdown.locationMatch = 50;
        reasons.push("Same region/country");
      } else {
        breakdown.locationMatch = 0;
      }
    }
  } else {
    // Missing location data - no match
    breakdown.locationMatch = 0;
  }

  // 3. SDG Overlap Matching (20% weight)
  // Check SDG alignment from volunteer's preferredSdgs field
  const volSDGs = volunteer.profile?.preferredSdgs || [];
  const oppSDGs = opportunity.sdgGoals || [];
  
  if (volSDGs.length > 0 && oppSDGs.length > 0) {
    const commonSDGs = volSDGs.filter(sdg => oppSDGs.includes(sdg));
    
    if (commonSDGs.length > 0) {
      breakdown.sdgMatch = Math.min((commonSDGs.length / Math.max(volSDGs.length, oppSDGs.length)) * 100, 100);
      reasons.push(`${commonSDGs.length} common SDG goal${commonSDGs.length > 1 ? 's' : ''}: #${commonSDGs.slice(0, 3).join(', #')}`);
    } else {
      breakdown.sdgMatch = 0;
    }
  } else if (oppSDGs.length === 0 && volSDGs.length === 0) {
    // Neither specified SDGs - neutral baseline
    breakdown.sdgMatch = 40;
  } else {
    // One party specified SDGs but not the other - low match
    breakdown.sdgMatch = 0;
  }

  // 4. Interest/Cause Matching (20% weight)
  if (volunteer.profile?.preferredCauses && volunteer.profile.preferredCauses.length > 0 && opportunity.category) {
    const causes = volunteer.profile.preferredCauses.map(c => c.toLowerCase().trim());
    const category = opportunity.category.toLowerCase().trim();
    
    if (causes.some(cause => cause.includes(category) || category.includes(cause))) {
      breakdown.interestMatch = 100;
      reasons.push(`Interest in ${opportunity.category}`);
    } else {
      breakdown.interestMatch = 0;
    }
  } else if (!opportunity.category && (!volunteer.profile?.preferredCauses || volunteer.profile.preferredCauses.length === 0)) {
    // Both missing - neutral baseline
    breakdown.interestMatch = 40;
  } else {
    // One party has data, other doesn't - no match
    breakdown.interestMatch = 0;
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
