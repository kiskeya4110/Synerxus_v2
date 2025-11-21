/**
 * Utility functions for calculating proficiency metrics
 * Designed to be robust for ALL volunteers, handling edge cases
 */

export type SkillRatings = Record<string, number> | null | undefined;

export interface ProficiencyStats {
  averageProficiency: number;
  totalSkills: number;
  totalPoints: number;
  hasSkills: boolean;
}

/**
 * Calculate comprehensive proficiency statistics from skill ratings
 * Handles all edge cases: null, undefined, empty, non-numeric values
 * @param skillRatings - Skill ratings object from volunteer profile
 * @returns ProficiencyStats with safe defaults for all edge cases
 */
export const calculateProficiencyStats = (skillRatings: SkillRatings): ProficiencyStats => {
  // Edge case: null or undefined
  if (!skillRatings || typeof skillRatings !== 'object') {
    return {
      averageProficiency: 0,
      totalSkills: 0,
      totalPoints: 0,
      hasSkills: false,
    };
  }

  try {
    // Convert to entries and filter valid numeric values
    const validSkills = Object.entries(skillRatings)
      .filter(([_, proficiency]) => {
        const num = Number(proficiency);
        return typeof num === 'number' && !isNaN(num) && num >= 0 && num <= 100;
      })
      .map(([name, proficiency]) => ({
        name,
        proficiency: Math.round(Number(proficiency) * 100) / 100, // Round to 2 decimals
      }));

    // Edge case: no valid skills
    if (validSkills.length === 0) {
      return {
        averageProficiency: 0,
        totalSkills: 0,
        totalPoints: 0,
        hasSkills: false,
      };
    }

    // Calculate metrics
    const totalPoints = validSkills.reduce((sum, skill) => sum + skill.proficiency, 0);
    const averageProficiency = Math.round((totalPoints / validSkills.length) * 100) / 100;

    return {
      averageProficiency,
      totalSkills: validSkills.length,
      totalPoints: Math.round(totalPoints * 100) / 100,
      hasSkills: true,
    };
  } catch (error) {
    console.error('Error calculating proficiency stats:', error);
    return {
      averageProficiency: 0,
      totalSkills: 0,
      totalPoints: 0,
      hasSkills: false,
    };
  }
};

/**
 * Get formatted average proficiency percentage
 * @param stats - ProficiencyStats from calculateProficiencyStats
 * @returns Formatted percentage string (e.g., "79%")
 */
export const getFormattedAverageProficiency = (stats: ProficiencyStats): string => {
  if (!stats.hasSkills) return '0%';
  return `${Math.round(stats.averageProficiency)}%`;
};

/**
 * Get proficiency summary text
 * @param stats - ProficiencyStats from calculateProficiencyStats
 * @returns Summary text (e.g., "5 skills • 395 total points")
 */
export const getProficiencySummary = (stats: ProficiencyStats): string => {
  if (!stats.hasSkills) return 'No skills added yet';
  return `${stats.totalSkills} skill${stats.totalSkills !== 1 ? 's' : ''} • ${Math.round(stats.totalPoints)} total points`;
};
