import type { Opportunity, User, VolunteerProfile } from "@shared/schema";

export interface AITip {
  type: "learning" | "skills" | "impact" | "career";
  title: string;
  description: string;
  icon: string;
}

/**
 * Generate AI-powered tips for a volunteer considering an opportunity
 * @param opportunity The opportunity being considered
 * @param volunteer The volunteer's user data
 * @param volunteerProfile The volunteer's extended profile data
 * @param matchScore The calculated match score (0-100)
 * @returns Array of AI-generated tips
 */
export function generateOpportunityTips(
  opportunity: Opportunity & { organization?: { name: string }; requiredSkills?: string[]; optionalSkills?: string[] },
  volunteer: User,
  volunteerProfile: VolunteerProfile | null,
  matchScore: number
): AITip[] {
  const tips: AITip[] = [];
  
  const volunteerSkills = volunteerProfile?.skills || volunteer.skills || [];
  const requiredSkills = opportunity.requiredSkills || [];
  const optionalSkills = opportunity.optionalSkills || [];
  const allOpportunitySkills = [...requiredSkills, ...optionalSkills];
  
  // Calculate skills overlap
  const matchingSkills = volunteerSkills.filter(skill => 
    allOpportunitySkills.some(oppSkill => 
      oppSkill.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(oppSkill.toLowerCase())
    )
  );
  
  const newSkills = requiredSkills.filter(skill => 
    !volunteerSkills.some(vSkill => 
      vSkill.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(vSkill.toLowerCase())
    )
  );

  // Learning Potential Tip
  if (newSkills.length > 0 && matchScore >= 50) {
    tips.push({
      type: "learning",
      title: "🎓 Strong Learning Opportunity",
      description: `You'll develop ${newSkills.length} new skill${newSkills.length > 1 ? 's' : ''}: ${newSkills.slice(0, 2).join(', ')}${newSkills.length > 2 ? ', and more' : ''}. This expands your skill set while leveraging your existing expertise.`,
      icon: "GraduationCap"
    });
  } else if (newSkills.length > 0) {
    tips.push({
      type: "learning",
      title: "🌱 Skill Development Opportunity",
      description: `Learn ${newSkills.slice(0, 2).join(' and ')}${newSkills.length > 2 ? ` plus ${newSkills.length - 2} more` : ''}. Great for expanding your capabilities in new areas.`,
      icon: "Sprout"
    });
  }

  // Skills Optimization Tip
  if (matchingSkills.length >= 2) {
    const skillRatings = volunteerProfile?.skillRatings as Record<string, number> || {};
    const ratedMatchingSkills = matchingSkills.filter(skill => skillRatings[skill]);
    
    if (ratedMatchingSkills.length > 0) {
      const avgRating = ratedMatchingSkills.reduce((sum, skill) => sum + (skillRatings[skill] || 0), 0) / ratedMatchingSkills.length;
      
      if (avgRating >= 75) {
        tips.push({
          type: "skills",
          title: "⭐ Perfect Skill Match",
          description: `Your ${matchingSkills.slice(0, 2).join(' and ')} skills are highly developed (${Math.round(avgRating)}% proficiency). You're well-positioned to make immediate impact.`,
          icon: "Star"
        });
      } else if (avgRating >= 50) {
        tips.push({
          type: "skills",
          title: "🎯 Skill Growth Opportunity",
          description: `Strengthen your ${matchingSkills.slice(0, 2).join(' and ')} skills through practical application. Current proficiency: ${Math.round(avgRating)}%.`,
          icon: "Target"
        });
      }
    } else {
      tips.push({
        type: "skills",
        title: "🔧 Skills Match",
        description: `Your ${matchingSkills.slice(0, 3).join(', ')} skills align well with this opportunity's needs.`,
        icon: "Wrench"
      });
    }
  }

  // Impact Potential Tip
  if (opportunity.impactMetricName && opportunity.primarySdg) {
    const volunteerSDGs = volunteerProfile?.preferredSdgs || [];
    const hasSDGMatch = volunteerSDGs.includes(opportunity.primarySdg);
    
    if (hasSDGMatch) {
      tips.push({
        type: "impact",
        title: "🌍 Aligned Impact Goals",
        description: `This opportunity directly addresses SDG ${opportunity.primarySdg}, which matches your interests. Expected impact: ${opportunity.impactMetricName}.`,
        icon: "Globe"
      });
    } else {
      tips.push({
        type: "impact",
        title: "📊 Measurable Impact",
        description: `Track your contribution through ${opportunity.impactMetricName}. This role contributes to achieving SDG ${opportunity.primarySdg}.`,
        icon: "BarChart"
      });
    }
  }

  // Career Development Tip
  const preferredWorkStyle = volunteerProfile?.preferredWorkStyle;
  const engagementMatch = preferredWorkStyle === opportunity.engagementType;
  
  if (engagementMatch && matchScore >= 70) {
    tips.push({
      type: "career",
      title: "💼 Career Development Fit",
      description: `${opportunity.engagementType === 'remote' ? 'Remote work' : opportunity.engagementType === 'hybrid' ? 'Hybrid arrangement' : 'In-person role'} matches your preferred work style. High overall match (${matchScore}%) suggests strong potential for professional growth.`,
      icon: "Briefcase"
    });
  }

  // Commitment Compatibility Tip
  if (volunteerProfile?.weeklyAvailability && opportunity.ongoingHoursPerWeek) {
    const availabilityRatio = opportunity.ongoingHoursPerWeek / volunteerProfile.weeklyAvailability;
    
    if (availabilityRatio <= 0.7) {
      tips.push({
        type: "career",
        title: "⏰ Good Time Fit",
        description: `Requires ${opportunity.ongoingHoursPerWeek} hrs/week (${Math.round(availabilityRatio * 100)}% of your ${volunteerProfile.weeklyAvailability} hrs/week availability). Leaves room for other commitments.`,
        icon: "Clock"
      });
    } else if (availabilityRatio <= 1) {
      tips.push({
        type: "career",
        title: "⚖️ Balanced Commitment",
        description: `${opportunity.ongoingHoursPerWeek} hrs/week commitment fits within your ${volunteerProfile.weeklyAvailability} hrs/week availability.`,
        icon: "Scale"
      });
    }
  }

  // Return top 3-4 most relevant tips
  return tips.slice(0, 4);
}

/**
 * Calculate detailed skills alignment for an opportunity
 * @param volunteerSkills Volunteer's skills
 * @param volunteerSkillRatings Volunteer's self-assessed skill proficiency ratings
 * @param requiredSkills Opportunity's required skills
 * @param optionalSkills Opportunity's optional skills
 * @returns Detailed skills alignment data
 */
export function calculateSkillsAlignment(
  volunteerSkills: string[],
  volunteerSkillRatings: Record<string, number> | null,
  requiredSkills: string[],
  optionalSkills: string[]
): {
  overallMatch: number;
  requiredMatch: number;
  optionalMatch: number;
  skillDetails: Array<{
    skill: string;
    required: boolean;
    matched: boolean;
    proficiency: number | null;
  }>;
} {
  const allOpportunitySkills = [...requiredSkills, ...optionalSkills];
  const skillDetails: Array<{
    skill: string;
    required: boolean;
    matched: boolean;
    proficiency: number | null;
  }> = [];

  // Analyze each opportunity skill
  requiredSkills.forEach(skill => {
    const matched = volunteerSkills.some(vSkill => 
      vSkill.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(vSkill.toLowerCase())
    );
    const matchedSkill = volunteerSkills.find(vSkill => 
      vSkill.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(vSkill.toLowerCase())
    );
    const proficiency = matchedSkill && volunteerSkillRatings ? (volunteerSkillRatings[matchedSkill] || null) : null;
    
    skillDetails.push({
      skill,
      required: true,
      matched,
      proficiency
    });
  });

  optionalSkills.forEach(skill => {
    const matched = volunteerSkills.some(vSkill => 
      vSkill.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(vSkill.toLowerCase())
    );
    const matchedSkill = volunteerSkills.find(vSkill => 
      vSkill.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(vSkill.toLowerCase())
    );
    const proficiency = matchedSkill && volunteerSkillRatings ? (volunteerSkillRatings[matchedSkill] || null) : null;
    
    skillDetails.push({
      skill,
      required: false,
      matched,
      proficiency
    });
  });

  // Calculate match percentages
  const requiredMatched = skillDetails.filter(sd => sd.required && sd.matched).length;
  const optionalMatched = skillDetails.filter(sd => !sd.required && sd.matched).length;
  
  const requiredMatch = requiredSkills.length > 0 ? (requiredMatched / requiredSkills.length) * 100 : 100;
  const optionalMatch = optionalSkills.length > 0 ? (optionalMatched / optionalSkills.length) * 100 : 0;
  
  // Overall match weighted 70% required, 30% optional
  const overallMatch = requiredSkills.length > 0 
    ? (requiredMatch * 0.7) + (optionalMatch * 0.3)
    : optionalMatch;

  return {
    overallMatch: Math.round(overallMatch),
    requiredMatch: Math.round(requiredMatch),
    optionalMatch: Math.round(optionalMatch),
    skillDetails
  };
}
