// SDG (Sustainable Development Goals) Utilities
// SDGs are numbered 1-17, this validation ensures data integrity

/**
 * Validates if a value is a valid SDG number (1-17)
 */
export function isValidSdg(value: unknown): value is number {
  return typeof value === 'number' && value >= 1 && value <= 17;
}

/**
 * Filters an array to only include valid SDG numbers
 */
export function filterValidSdgs(sdgs: unknown[]): number[] {
  if (!Array.isArray(sdgs)) return [];
  return sdgs.filter(isValidSdg);
}

/**
 * Extracts unique valid SDG numbers from projects' sdgGoals arrays
 */
export function extractSdgsFromProjects(projects: any[]): number[] {
  const sdgsSet = new Set<number>();

  if (!Array.isArray(projects)) return [];

  projects.forEach(project => {
    if (project?.sdgGoals && Array.isArray(project.sdgGoals)) {
      project.sdgGoals.forEach((sdg: unknown) => {
        if (isValidSdg(sdg)) {
          sdgsSet.add(sdg);
        }
      });
    }
  });

  return Array.from(sdgsSet).sort((a, b) => a - b);
}

/**
 * Compares two SDG arrays and returns alignment analysis
 */
export function compareSdgArrays(committed: number[], contributed: number[]) {
  const committedSet = new Set(committed);
  const contributedSet = new Set(contributed);

  return {
    // SDGs that are both committed AND contributed (aligned work)
    aligned: committed.filter(sdg => contributedSet.has(sdg)),
    // SDGs committed but NOT contributed to (opportunities)
    uncommittedWork: committed.filter(sdg => !contributedSet.has(sdg)),
    // SDGs contributed to but NOT committed (bonus work)
    uncommittedContributions: contributed.filter(sdg => !committedSet.has(sdg))
  };
}
