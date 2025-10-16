import { Opportunity, VolunteerProfile, User } from "@shared/schema";

interface MatchResult {
  score: number;
  breakdown: {
    skillMatch: number;
    locationMatch: number;
    availabilityMatch: number;
    interestMatch: number;
    experienceMatch: number;
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
    availabilityMatch: 0,
    interestMatch: 0,
    experienceMatch: 0,
  };
  const reasons: string[] = [];

  // 1. Skills Matching (35% weight) - Most important factor
  if (volunteer.skills && opportunity.requiredSkills) {
    const volunteerSkills = volunteer.skills.map(s => s.toLowerCase());
    const requiredSkills = opportunity.requiredSkills.map(s => s.toLowerCase());
    
    const matchingSkills = volunteerSkills.filter(skill =>
      requiredSkills.some(req => 
        req.includes(skill) || skill.includes(req)
      )
    );
    
    breakdown.skillMatch = Math.min(
      (matchingSkills.length / requiredSkills.length) * 100,
      100
    );
    
    if (matchingSkills.length > 0) {
      reasons.push(`${matchingSkills.length} matching skill${matchingSkills.length > 1 ? 's' : ''}: ${matchingSkills.slice(0, 3).join(', ')}`);
    }
  }

  // 2. Location Matching (25% weight)
  if (opportunity.isRemote) {
    breakdown.locationMatch = 100;
    reasons.push("Remote opportunity - location flexible");
  } else if (volunteer.profile?.location && opportunity.location) {
    const volLocation = volunteer.profile.location.toLowerCase();
    const oppLocation = opportunity.location.toLowerCase();
    
    if (volLocation.includes(oppLocation) || oppLocation.includes(volLocation)) {
      breakdown.locationMatch = 100;
      reasons.push("Same location");
    } else {
      // Check for same country/region
      const volParts = volLocation.split(',').map(p => p.trim());
      const oppParts = oppLocation.split(',').map(p => p.trim());
      
      if (volParts.some(vp => oppParts.some(op => vp.includes(op) || op.includes(vp)))) {
        breakdown.locationMatch = 60;
        reasons.push("Same region/country");
      } else {
        breakdown.locationMatch = 20;
      }
    }
  }

  // 3. Availability Matching (20% weight)
  if (volunteer.profile?.weeklyAvailability && opportunity.timeCommitment) {
    const commitment = opportunity.timeCommitment.toLowerCase();
    const weeklyHours = volunteer.profile.weeklyAvailability;
    
    // Extract hours from time commitment string
    const hoursMatch = commitment.match(/(\d+)\s*hours?/i);
    if (hoursMatch) {
      const requiredHours = parseInt(hoursMatch[1]);
      
      if (weeklyHours >= requiredHours) {
        breakdown.availabilityMatch = 100;
        reasons.push("Sufficient availability");
      } else {
        breakdown.availabilityMatch = (weeklyHours / requiredHours) * 100;
      }
    } else {
      breakdown.availabilityMatch = 70; // Default if can't parse
    }
  }

  // 4. Interest/Cause Matching (15% weight)
  if (volunteer.profile?.preferredCauses && opportunity.category) {
    const causes = volunteer.profile.preferredCauses.map(c => c.toLowerCase());
    const category = opportunity.category.toLowerCase();
    
    if (causes.some(cause => cause.includes(category) || category.includes(cause))) {
      breakdown.interestMatch = 100;
      reasons.push(`Interest in ${opportunity.category}`);
    } else {
      breakdown.interestMatch = 40;
    }
  }

  // 5. Experience Level Matching (5% weight)
  if (volunteer.profile?.experience && opportunity.requirements) {
    const experience = volunteer.profile.experience as any[];
    const hasRelevantExperience = experience && experience.length > 0;
    
    if (hasRelevantExperience) {
      breakdown.experienceMatch = 100;
      reasons.push("Relevant experience");
    } else {
      breakdown.experienceMatch = 50;
    }
  }

  // Calculate weighted final score
  const weights = {
    skillMatch: 0.35,
    locationMatch: 0.25,
    availabilityMatch: 0.20,
    interestMatch: 0.15,
    experienceMatch: 0.05,
  };

  const finalScore = Math.round(
    breakdown.skillMatch * weights.skillMatch +
    breakdown.locationMatch * weights.locationMatch +
    breakdown.availabilityMatch * weights.availabilityMatch +
    breakdown.interestMatch * weights.interestMatch +
    breakdown.experienceMatch * weights.experienceMatch
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
