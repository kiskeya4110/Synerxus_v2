export interface SDGGoal {
  id: number;
  name: string;
  shortName: string;
  description: string;
  color: string;
  keywords: string[];
}

export const SDG_GOALS: Record<number, SDGGoal> = {
  1: {
    id: 1,
    name: "No Poverty",
    shortName: "Poverty",
    description: "End poverty in all its forms everywhere",
    color: "#E5243B",
    keywords: ["poverty", "income", "economic", "resources", "basic services", "vulnerable", "poor"],
  },
  2: {
    id: 2,
    name: "Zero Hunger",
    shortName: "Hunger",
    description: "End hunger, achieve food security and improved nutrition",
    color: "#DDA63A",
    keywords: ["hunger", "food", "nutrition", "agriculture", "farming", "malnutrition"],
  },
  3: {
    id: 3,
    name: "Good Health and Well-being",
    shortName: "Health",
    description: "Ensure healthy lives and promote well-being for all",
    color: "#4C9F38",
    keywords: ["health", "healthcare", "medical", "disease", "wellness", "mental health", "pandemic"],
  },
  4: {
    id: 4,
    name: "Quality Education",
    shortName: "Education",
    description: "Ensure inclusive and equitable quality education",
    color: "#C5192D",
    keywords: ["education", "learning", "school", "literacy", "teachers", "students", "training"],
  },
  5: {
    id: 5,
    name: "Gender Equality",
    shortName: "Gender",
    description: "Achieve gender equality and empower all women and girls",
    color: "#FF3A21",
    keywords: ["gender", "women", "girls", "equality", "empowerment", "discrimination"],
  },
  6: {
    id: 6,
    name: "Clean Water and Sanitation",
    shortName: "Water",
    description: "Ensure availability and sustainable management of water",
    color: "#26BDE2",
    keywords: ["water", "sanitation", "hygiene", "clean water", "waste", "sewage"],
  },
  7: {
    id: 7,
    name: "Affordable and Clean Energy",
    shortName: "Energy",
    description: "Ensure access to affordable, reliable, sustainable energy",
    color: "#FCC30B",
    keywords: ["energy", "renewable", "electricity", "solar", "wind", "power", "sustainable"],
  },
  8: {
    id: 8,
    name: "Decent Work and Economic Growth",
    shortName: "Economy",
    description: "Promote sustained, inclusive economic growth and employment",
    color: "#A21942",
    keywords: ["employment", "jobs", "economy", "work", "growth", "labor", "entrepreneurship"],
  },
  9: {
    id: 9,
    name: "Industry, Innovation and Infrastructure",
    shortName: "Innovation",
    description: "Build resilient infrastructure, promote innovation",
    color: "#FD6925",
    keywords: ["infrastructure", "innovation", "industry", "technology", "research", "development"],
  },
  10: {
    id: 10,
    name: "Reduced Inequalities",
    shortName: "Equality",
    description: "Reduce inequality within and among countries",
    color: "#DD1367",
    keywords: ["inequality", "discrimination", "inclusion", "marginalized", "equity"],
  },
  11: {
    id: 11,
    name: "Sustainable Cities and Communities",
    shortName: "Cities",
    description: "Make cities and human settlements inclusive and sustainable",
    color: "#FD9D24",
    keywords: ["cities", "urban", "housing", "transport", "sustainable", "community"],
  },
  12: {
    id: 12,
    name: "Responsible Consumption and Production",
    shortName: "Consumption",
    description: "Ensure sustainable consumption and production patterns",
    color: "#BF8B2E",
    keywords: ["consumption", "production", "waste", "recycling", "sustainable", "resources"],
  },
  13: {
    id: 13,
    name: "Climate Action",
    shortName: "Climate",
    description: "Take urgent action to combat climate change",
    color: "#3F7E44",
    keywords: ["climate", "global warming", "emissions", "carbon", "greenhouse", "adaptation"],
  },
  14: {
    id: 14,
    name: "Life Below Water",
    shortName: "Oceans",
    description: "Conserve and sustainably use the oceans and marine resources",
    color: "#0A97D9",
    keywords: ["ocean", "marine", "sea", "fish", "coastal", "water pollution"],
  },
  15: {
    id: 15,
    name: "Life on Land",
    shortName: "Land",
    description: "Protect, restore and promote sustainable use of terrestrial ecosystems",
    color: "#56C02B",
    keywords: ["forest", "biodiversity", "wildlife", "ecosystem", "land", "deforestation"],
  },
  16: {
    id: 16,
    name: "Peace, Justice and Strong Institutions",
    shortName: "Justice",
    description: "Promote peaceful and inclusive societies",
    color: "#00689D",
    keywords: ["peace", "justice", "institutions", "governance", "rights", "law"],
  },
  17: {
    id: 17,
    name: "Partnerships for the Goals",
    shortName: "Partnership",
    description: "Strengthen the means of implementation and revitalize global partnerships",
    color: "#19486A",
    keywords: ["partnership", "collaboration", "cooperation", "global", "development"],
  },
};

export const sdgGoals = SDG_GOALS;

export function getSDGName(sdgId: number): string {
  return SDG_GOALS[sdgId]?.shortName || `SDG ${sdgId}`;
}

export function getSDGNameWithNumber(sdgId: number): string {
  const shortName = SDG_GOALS[sdgId]?.shortName;
  return shortName ? `${shortName} (SDG ${sdgId})` : `SDG ${sdgId}`;
}

export function getSDGFullName(sdgId: number): string {
  return SDG_GOALS[sdgId]?.name || `SDG ${sdgId}`;
}

export function getSDGColor(sdgId: number): string {
  return SDG_GOALS[sdgId]?.color || "#666666";
}

export function getSDGDescription(sdgId: number): string {
  return SDG_GOALS[sdgId]?.description || "";
}

export function suggestSDGsFromText(text: string): number[] {
  const lowerText = text.toLowerCase();
  const suggestions: { id: number; score: number }[] = [];

  Object.values(SDG_GOALS).forEach((sdg) => {
    let score = 0;
    
    // Check if any keywords match
    sdg.keywords.forEach((keyword) => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    // Check if SDG name is mentioned
    if (lowerText.includes(sdg.name.toLowerCase()) || lowerText.includes(sdg.shortName.toLowerCase())) {
      score += 2;
    }

    if (score > 0) {
      suggestions.push({ id: sdg.id, score });
    }
  });

  // Sort by score and return top 3
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.id);
}
