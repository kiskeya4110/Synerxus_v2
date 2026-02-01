export interface SDGGoal {
  id: number;
  name: string;
  shortName: string;
  description: string;
  color: string;
  keywords: string[];
  details: string;
  targets: string[];
}

export const SDG_GOALS: Record<number, SDGGoal> = {
  1: {
    id: 1,
    name: "No Poverty",
    shortName: "Poverty",
    description: "End poverty in all its forms everywhere",
    color: "#E5243B",
    keywords: ["poverty", "income", "economic", "resources", "basic services", "vulnerable", "poor"],
    details: "Goal 1 calls for an end to poverty in all its manifestations by 2030. It also aims to ensure social protection for the poor and vulnerable, increase access to basic services and support people harmed by climate-related extreme events and other economic, social and environmental shocks and disasters.",
    targets: ["Eradicate extreme poverty", "Reduce poverty by half", "Implement social protection systems", "Equal rights to economic resources"],
  },
  2: {
    id: 2,
    name: "Zero Hunger",
    shortName: "Hunger",
    description: "End hunger, achieve food security and improved nutrition",
    color: "#DDA63A",
    keywords: ["hunger", "food", "nutrition", "agriculture", "farming", "malnutrition"],
    details: "Goal 2 seeks to end hunger and all forms of malnutrition by 2030. It also commits to universal access to safe, nutritious and sufficient food at all times of the year. This will require sustainable food production systems and resilient agricultural practices, equal access to land, technology and markets and international cooperation on investments in infrastructure and technology to boost agricultural productivity.",
    targets: ["End hunger", "End malnutrition", "Double agricultural productivity", "Ensure sustainable food production systems"],
  },
  3: {
    id: 3,
    name: "Good Health and Well-being",
    shortName: "Health",
    description: "Ensure healthy lives and promote well-being for all",
    color: "#4C9F38",
    keywords: ["health", "healthcare", "medical", "disease", "wellness", "mental health", "pandemic"],
    details: "Goal 3 aims to ensure health and well-being for all at all ages by improving reproductive and maternal and child health; ending the epidemics of major communicable diseases; reducing non-communicable and environmental diseases; achieving universal health coverage; and ensuring access to safe, affordable and effective medicines and vaccines for all.",
    targets: ["Reduce maternal mortality", "End preventable deaths of children", "Combat communicable diseases", "Achieve universal health coverage"],
  },
  4: {
    id: 4,
    name: "Quality Education",
    shortName: "Education",
    description: "Ensure inclusive and equitable quality education",
    color: "#C5192D",
    keywords: ["education", "learning", "school", "literacy", "teachers", "students", "training"],
    details: "Goal 4 focuses on the acquisition of foundational and higher-order skills; greater and more equitable access to technical and vocational education and training and higher education; training throughout life; and the knowledge, skills and values needed to function well and contribute to society.",
    targets: ["Free primary and secondary education", "Equal access to quality pre-primary education", "Equal access to affordable technical and vocational education", "Increase literacy and numeracy"],
  },
  5: {
    id: 5,
    name: "Gender Equality",
    shortName: "Gender",
    description: "Achieve gender equality and empower all women and girls",
    color: "#FF3A21",
    keywords: ["gender", "women", "girls", "equality", "empowerment", "discrimination"],
    details: "Goal 5 aims to grant women and girls equal rights, opportunities to live free without violence and discrimination, and to be valued and empowered. It calls for gender equality in decision-making; access to sexual and reproductive health services; equal rights to economic resources, land and property; and more value for unpaid care and domestic work.",
    targets: ["End discrimination against women", "Eliminate violence against women", "Eliminate harmful practices", "Ensure universal access to sexual and reproductive health"],
  },
  6: {
    id: 6,
    name: "Clean Water and Sanitation",
    shortName: "Water",
    description: "Ensure availability and sustainable management of water",
    color: "#26BDE2",
    keywords: ["water", "sanitation", "hygiene", "clean water", "waste", "sewage"],
    details: "Goal 6 not only addresses the issues relating to drinking water, sanitation and hygiene, but also the quality and sustainability of water resources worldwide. Achieving this goal, which is critical to the survival of people and the planet, means expanding international cooperation and garnering the support of local communities in improving water and sanitation management.",
    targets: ["Achieve universal access to safe drinking water", "Access to adequate sanitation and hygiene", "Improve water quality", "Protect and restore water-related ecosystems"],
  },
  7: {
    id: 7,
    name: "Affordable and Clean Energy",
    shortName: "Energy",
    description: "Ensure access to affordable, reliable, sustainable energy",
    color: "#FCC30B",
    keywords: ["energy", "renewable", "electricity", "solar", "wind", "power", "sustainable"],
    details: "Goal 7 seeks to promote broader energy access and increased use of renewable energy, including through enhanced international cooperation and expanded infrastructure and technology for clean energy.",
    targets: ["Universal access to modern energy", "Increase share of renewable energy", "Double the global rate of improvement in energy efficiency", "Enhance international cooperation"],
  },
  8: {
    id: 8,
    name: "Decent Work and Economic Growth",
    shortName: "Economy",
    description: "Promote sustained, inclusive economic growth and employment",
    color: "#A21942",
    keywords: ["employment", "jobs", "economy", "work", "growth", "labor", "entrepreneurship"],
    details: "Goal 8 aims to provide opportunities for full and productive employment and decent work for all while eradicating forced labor, human trafficking and child labor.",
    targets: ["Sustain per capita economic growth", "Achieve higher economic productivity", "Promote development-oriented policies", "Eradicate forced labor and child labor"],
  },
  9: {
    id: 9,
    name: "Industry, Innovation and Infrastructure",
    shortName: "Innovation",
    description: "Build resilient infrastructure, promote innovation",
    color: "#FD6925",
    keywords: ["infrastructure", "innovation", "industry", "technology", "research", "development"],
    details: "Goal 9 focuses on promoting sustainable infrastructure, inclusive and sustainable industrialization, and innovation to drive economic growth and development while ensuring environmental sustainability.",
    targets: ["Develop quality, reliable infrastructure", "Promote inclusive and sustainable industrialization", "Increase access to financial services", "Upgrade infrastructure and retrofit industries"],
  },
  10: {
    id: 10,
    name: "Reduced Inequalities",
    shortName: "Equality",
    description: "Reduce inequality within and among countries",
    color: "#DD1367",
    keywords: ["inequality", "discrimination", "inclusion", "marginalized", "equity"],
    details: "Goal 10 calls for reducing inequalities in income, as well as those based on sex, age, disability, race, class, ethnicity, religion and opportunity—both within and among countries. It also aims to ensure safe, orderly and regular migration and addresses issues related to representation of developing countries in global decision-making.",
    targets: ["Progressively achieve income growth", "Promote social, economic and political inclusion", "Ensure equal opportunity", "Adopt policies for greater equality"],
  },
  11: {
    id: 11,
    name: "Sustainable Cities and Communities",
    shortName: "Cities",
    description: "Make cities and human settlements inclusive and sustainable",
    color: "#FD9D24",
    keywords: ["cities", "urban", "housing", "transport", "sustainable", "community"],
    details: "Goal 11 aims to renew and plan cities and other human settlements in a way that offers opportunities for all, with access to basic services, energy, housing, transportation and green public spaces, while reducing resource use and environmental impact.",
    targets: ["Access to adequate housing", "Access to safe transport systems", "Enhance inclusive urbanization", "Protect cultural and natural heritage"],
  },
  12: {
    id: 12,
    name: "Responsible Consumption and Production",
    shortName: "Consumption",
    description: "Ensure sustainable consumption and production patterns",
    color: "#BF8B2E",
    keywords: ["consumption", "production", "waste", "recycling", "sustainable", "resources"],
    details: "Goal 12 aims to promote resource and energy efficiency, sustainable infrastructure, and provide access to basic services, green and decent jobs and a better quality of life for all. It seeks to do more and better with less, creating net welfare gains from economic activities by reducing resource use.",
    targets: ["Implement sustainable consumption and production", "Achieve sustainable management of natural resources", "Halve per capita global food waste", "Achieve environmentally sound management of chemicals"],
  },
  13: {
    id: 13,
    name: "Climate Action",
    shortName: "Climate",
    description: "Take urgent action to combat climate change",
    color: "#3F7E44",
    keywords: ["climate", "global warming", "emissions", "carbon", "greenhouse", "adaptation"],
    details: "Goal 13 calls for urgent action to combat climate change and its impacts. It aims to strengthen resilience and adaptive capacity to climate-related disasters, integrate climate change measures into policies and planning, and improve education and awareness on climate change.",
    targets: ["Strengthen resilience to climate-related hazards", "Integrate climate measures into policies", "Improve education and awareness on climate change", "Implement commitments to the UN Framework Convention"],
  },
  14: {
    id: 14,
    name: "Life Below Water",
    shortName: "Oceans",
    description: "Conserve and sustainably use the oceans and marine resources",
    color: "#0A97D9",
    keywords: ["ocean", "marine", "sea", "fish", "coastal", "water pollution"],
    details: "Goal 14 seeks to promote the conservation and sustainable use of marine and coastal ecosystems, prevent marine pollution and increase the economic benefits to small island developing States and least developed countries from the sustainable use of marine resources.",
    targets: ["Prevent and reduce marine pollution", "Protect and restore ecosystems", "Minimize ocean acidification", "Regulate harvesting and end overfishing"],
  },
  15: {
    id: 15,
    name: "Life on Land",
    shortName: "Land",
    description: "Protect, restore and promote sustainable use of terrestrial ecosystems",
    color: "#56C02B",
    keywords: ["forest", "biodiversity", "wildlife", "ecosystem", "land", "deforestation"],
    details: "Goal 15 focuses on managing forests sustainably, restoring degraded lands and successfully combating desertification, reducing degraded natural habitats and ending biodiversity loss. All of these efforts in combination will help protect and prevent the extinction of threatened species.",
    targets: ["Ensure conservation of terrestrial ecosystems", "Promote sustainable forest management", "Combat desertification", "Ensure conservation of mountain ecosystems"],
  },
  16: {
    id: 16,
    name: "Peace, Justice and Strong Institutions",
    shortName: "Justice",
    description: "Promote peaceful and inclusive societies",
    color: "#00689D",
    keywords: ["peace", "justice", "institutions", "governance", "rights", "law"],
    details: "Goal 16 envisages peaceful and inclusive societies based on respect for human rights, the rule of law, good governance at all levels, and transparent, effective and accountable institutions. Many countries still face protracted violence and armed conflict, and far too many people are not well-supported by weak institutions and lack access to justice, information and other fundamental freedoms.",
    targets: ["Reduce violence everywhere", "End abuse, exploitation and trafficking", "Promote the rule of law", "Reduce corruption and bribery"],
  },
  17: {
    id: 17,
    name: "Partnerships for the Goals",
    shortName: "Partnership",
    description: "Strengthen the means of implementation and revitalize global partnerships",
    color: "#19486A",
    keywords: ["partnership", "collaboration", "cooperation", "global", "development"],
    details: "Goal 17 aims to strengthen global partnerships to support and achieve the ambitious targets of the 2030 Agenda, bringing together national governments, the international community, civil society, the private sector and other actors.",
    targets: ["Strengthen domestic resource mobilization", "Mobilize financial resources for developing countries", "Promote sustainable and resilient infrastructure", "Enhance global partnership for sustainable development"],
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

// Enhanced keyword list for better matching (Phase 5)
const EXTENDED_KEYWORDS: Record<number, string[]> = {
  1: ["poverty", "income", "economic", "resources", "basic services", "vulnerable", "poor", "livelihood", "microfinance", "welfare", "social protection", "homeless", "shelter"],
  2: ["hunger", "food", "nutrition", "agriculture", "farming", "malnutrition", "meal", "meals", "feeding", "food bank", "soup kitchen", "groceries", "harvest", "crop", "garden", "pantry"],
  3: ["health", "healthcare", "medical", "disease", "wellness", "mental health", "pandemic", "hospital", "clinic", "vaccination", "first aid", "medicine", "therapy", "counseling", "nursing"],
  4: ["education", "learning", "school", "literacy", "teachers", "students", "training", "tutor", "tutoring", "mentor", "mentoring", "classroom", "reading", "math", "stem", "scholarship", "library", "workshop", "curriculum"],
  5: ["gender", "women", "girls", "equality", "empowerment", "discrimination", "maternal", "feminine", "reproductive", "domestic violence"],
  6: ["water", "sanitation", "hygiene", "clean water", "waste", "sewage", "well", "borehole", "latrine", "handwashing", "purification", "plumbing"],
  7: ["energy", "renewable", "electricity", "solar", "wind", "power", "sustainable", "solar panel", "battery", "green energy", "off-grid"],
  8: ["employment", "jobs", "economy", "work", "growth", "labor", "entrepreneurship", "career", "wage", "skill building", "vocational", "internship", "resume"],
  9: ["infrastructure", "innovation", "industry", "technology", "research", "development", "internet", "connectivity", "digital", "software", "engineering", "bridge", "road"],
  10: ["inequality", "discrimination", "inclusion", "marginalized", "equity", "refugee", "migrants", "diaspora", "disability", "accessible", "minority"],
  11: ["cities", "urban", "housing", "transport", "sustainable", "community", "neighborhood", "public space", "park", "playground", "settlement", "affordable housing"],
  12: ["consumption", "production", "waste", "recycling", "sustainable", "resources", "upcycle", "compost", "reuse", "reduce", "circular economy", "zero waste"],
  13: ["climate", "global warming", "emissions", "carbon", "greenhouse", "adaptation", "tree", "trees", "planting", "reforestation", "environment", "sustainability", "flood", "drought"],
  14: ["ocean", "marine", "sea", "fish", "coastal", "water pollution", "coral", "beach", "mangrove", "fisheries", "aquatic"],
  15: ["forest", "biodiversity", "wildlife", "ecosystem", "land", "deforestation", "tree planting", "habitat", "conservation", "native plants", "species", "endangered", "restoration"],
  16: ["peace", "justice", "institutions", "governance", "rights", "law", "legal aid", "advocacy", "corruption", "democracy", "civic", "human rights", "conflict resolution"],
  17: ["partnership", "collaboration", "cooperation", "global", "development", "funding", "donor", "volunteer", "cross-sector", "alliance"],
};

export function suggestSDGsFromText(text: string): number[] {
  const lowerText = text.toLowerCase();
  const suggestions: { id: number; score: number }[] = [];

  Object.values(SDG_GOALS).forEach((sdg) => {
    let score = 0;

    // Check base keywords
    sdg.keywords.forEach((keyword) => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    // Check extended keywords (Phase 5)
    const extended = EXTENDED_KEYWORDS[sdg.id] || [];
    extended.forEach((keyword) => {
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

/**
 * Phase 5: Direct mapping of standard outcome types to SDGs
 * Maps common outcome type names (from project templates) to relevant SDG IDs
 */
export function mapOutcomeTypeToSDGs(outcomeType: string): number[] {
  const lower = outcomeType.toLowerCase().trim();

  const OUTCOME_SDG_MAP: Record<string, number[]> = {
    // Food & Hunger
    "meals served": [2],
    "meals distributed": [2],
    "meals": [2],
    "food distributed": [2],
    "food packages": [2],
    "food bank": [2],
    "groceries": [2],
    // Education
    "students tutored": [4],
    "tutoring sessions": [4],
    "tutoring": [4],
    "workshops": [4],
    "training sessions": [4],
    "books distributed": [4],
    "literacy": [4],
    "mentoring sessions": [4],
    "mentoring": [4],
    // Health
    "patients served": [3],
    "health screenings": [3],
    "vaccinations": [3],
    "counseling sessions": [3],
    "first aid": [3],
    "medical supplies": [3],
    // Environment
    "trees planted": [13, 15],
    "trees": [13, 15],
    "saplings planted": [13, 15],
    "area restored": [15],
    "cleanup events": [12, 14],
    "beach cleanup": [14],
    "waste collected": [12],
    "recycling": [12],
    // Water
    "wells built": [6],
    "wells constructed": [6],
    "water filters": [6],
    "water filters installed": [6],
    "water provided": [6],
    "clean water access": [6],
    // Gender
    "women empowered": [5],
    "girls supported": [5],
    // Economic
    "jobs created": [8],
    "businesses supported": [8],
    "microloans": [1, 8],
    // Housing / Community
    "homes built": [11],
    "houses repaired": [11],
    "shelters": [1, 11],
    // Legal / Justice
    "legal aid cases": [16],
    "advocacy campaigns": [16],
    // General
    "people helped": [1],
    "families supported": [1],
    "beneficiaries": [1],
    "lives impacted": [1],
    "households served": [1, 11],
    "animals rescued": [15],
    "volunteer hours": [17],
  };

  // Direct match
  if (OUTCOME_SDG_MAP[lower]) {
    return OUTCOME_SDG_MAP[lower];
  }

  // Partial match
  for (const [key, sdgs] of Object.entries(OUTCOME_SDG_MAP)) {
    if (lower.includes(key) || key.includes(lower)) {
      return sdgs;
    }
  }

  // Fallback: run through text suggestion
  return suggestSDGsFromText(outcomeType);
}
