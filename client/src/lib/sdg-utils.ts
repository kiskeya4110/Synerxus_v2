/**
 * UN Sustainable Development Goals (SDG) Utilities
 * Centralized functions for SDG-related operations
 *
 * IMPORTANT: Use these exports instead of defining SDG colors/names locally.
 * This prevents duplication and ensures consistency across the application.
 */

// Re-export from shared for convenience
export { SDG_GOALS, getSDGColor as getSDGColorFromShared } from '@shared/sdg-goals';

// SDG Color Mapping - Exported for direct use in charts/visualizations
export const SDG_COLORS: Record<number, string> = {
  1: "#E5243B",  // No Poverty
  2: "#DDA63A",  // Zero Hunger
  3: "#4C9F38",  // Good Health and Well-being
  4: "#C5192D",  // Quality Education
  5: "#FF3A21",  // Gender Equality
  6: "#26BDE2",  // Clean Water and Sanitation
  7: "#FCC30B",  // Affordable and Clean Energy
  8: "#A21942",  // Decent Work and Economic Growth
  9: "#FD6925",  // Industry, Innovation and Infrastructure
  10: "#DD1367", // Reduced Inequalities
  11: "#FD9D24", // Sustainable Cities and Communities
  12: "#BF8B2E", // Responsible Consumption and Production
  13: "#3F7E44", // Climate Action
  14: "#0A97D9", // Life Below Water
  15: "#56C02B", // Life on Land
  16: "#00689D", // Peace, Justice and Strong Institutions
  17: "#19486A", // Partnerships for the Goals
};

// SDG Short Names - Exported for direct use
export const SDG_SHORT_NAMES: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water",
  7: "Clean Energy",
  8: "Decent Work",
  9: "Innovation",
  10: "Reduced Inequalities",
  11: "Sustainable Cities",
  12: "Responsible Consumption",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace & Justice",
  17: "Partnerships",
};

// SDG Full Names - Exported for direct use
export const SDG_FULL_NAMES: Record<number, string> = {
  1: "End poverty in all its forms everywhere",
  2: "End hunger, achieve food security and improved nutrition",
  3: "Ensure healthy lives and promote well-being for all",
  4: "Ensure inclusive and equitable quality education",
  5: "Achieve gender equality and empower all women and girls",
  6: "Ensure availability and sustainable management of water",
  7: "Ensure access to affordable, reliable, sustainable energy",
  8: "Promote sustained, inclusive economic growth and employment",
  9: "Build resilient infrastructure, promote innovation",
  10: "Reduce inequality within and among countries",
  11: "Make cities and human settlements inclusive and sustainable",
  12: "Ensure sustainable consumption and production patterns",
  13: "Take urgent action to combat climate change",
  14: "Conserve and sustainably use the oceans, seas and marine resources",
  15: "Protect, restore and promote sustainable use of terrestrial ecosystems",
  16: "Promote peaceful and inclusive societies for sustainable development",
  17: "Strengthen the means of implementation and revitalize partnerships",
};

/**
 * Get the official UN color for an SDG
 */
export function getSDGColor(sdgNumber: number): string {
  return SDG_COLORS[sdgNumber] || "#666666";
}

/**
 * Get the short name for an SDG
 */
export function getSDGName(sdgNumber: number): string {
  return SDG_SHORT_NAMES[sdgNumber] || `SDG ${sdgNumber}`;
}

/**
 * Get the full descriptive name for an SDG
 */
export function getSDGFullName(sdgNumber: number): string {
  return SDG_FULL_NAMES[sdgNumber] || `Sustainable Development Goal ${sdgNumber}`;
}

/**
 * Get all SDG numbers (1-17)
 */
export function getAllSDGNumbers(): number[] {
  return Array.from({ length: 17 }, (_, i) => i + 1);
}

/**
 * Get SDG color with opacity
 */
export function getSDGColorWithOpacity(sdgNumber: number, opacity: number): string {
  const color = getSDGColor(sdgNumber);
  // Convert hex to rgba
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Validate if a number is a valid SDG
 */
export function isValidSDG(sdgNumber: number): boolean {
  return sdgNumber >= 1 && sdgNumber <= 17;
}

/**
 * Sort SDG numbers in ascending order
 */
export function sortSDGs(sdgs: number[]): number[] {
  return [...sdgs].sort((a, b) => a - b);
}

/**
 * Get SDG icon emoji (fallback if images not available)
 */
export function getSDGEmoji(sdgNumber: number): string {
  const emojis: Record<number, string> = {
    1: "🏚️", 2: "🌾", 3: "🏥", 4: "📚", 5: "⚖️",
    6: "💧", 7: "⚡", 8: "💼", 9: "🏭", 10: "📊",
    11: "🏙️", 12: "♻️", 13: "🌍", 14: "🌊", 15: "🌳",
    16: "⚖️", 17: "🤝",
  };
  return emojis[sdgNumber] || "🎯";
}

/**
 * Calculate SDG distribution from metrics
 */
export interface SDGMetric {
  sdg: number;
  totalHours: number;
  uniqueEmployees?: number;
  projectsContributed?: number;
}

export interface SDGChartData {
  name: string;
  fullName: string;
  value: number;
  color: string;
  goal: number;
  hours: number;
  employees: number;
  projects: number;
}

export function calculateSDGDistribution(
  metrics: SDGMetric[],
  minPercentageForVisibility: number = 5
): SDGChartData[] {
  const totalHours = metrics.reduce((sum, m) => sum + (m.totalHours || 0), 0);

  return metrics
    .filter((m) => m.totalHours > 0)
    .map((metric) => {
      const percentage = totalHours > 0
        ? Math.round((metric.totalHours / totalHours) * 100)
        : 0;

      return {
        name: getSDGName(metric.sdg),
        fullName: getSDGFullName(metric.sdg),
        value: Math.max(minPercentageForVisibility, percentage),
        color: getSDGColor(metric.sdg),
        goal: metric.sdg,
        hours: metric.totalHours,
        employees: metric.uniqueEmployees || 0,
        projects: metric.projectsContributed || 0,
      };
    })
    .sort((a, b) => a.goal - b.goal);
}

/**
 * Filter metrics by selected SDGs
 */
export function filterMetricsBySDGs(
  metrics: SDGMetric[],
  selectedSDGs: number[]
): SDGMetric[] {
  if (selectedSDGs.length === 0) return metrics;
  return metrics.filter((m) => selectedSDGs.includes(m.sdg));
}

/**
 * Get SDGs not in organization's commitments (for AI insights)
 */
export function getUncommittedSDGs(
  activeSDGs: number[],
  committedSDGs: number[]
): number[] {
  return activeSDGs.filter((sdg) => !committedSDGs.includes(sdg)).sort((a, b) => a - b);
}
