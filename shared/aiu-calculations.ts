/**
 * Attributable Impact Units (AIU) Calculation System
 *
 * AIUs are auditable, SDG-mapped metrics that replace "Lives Touched" for CSR/ESG readiness.
 *
 * Definitions:
 * - AIU Unique: counts a unique beneficiary once per reporting window
 * - AIU Session: counts service instances (sessions, classes, hours) separately
 * - AttributionFactor: percentage of project ΔKPI credited to Synerxus-enabled volunteers
 *
 * Formulas:
 * - ΔKPI = KPI_after - KPI_before
 * - ΔSynerxus = ΔKPI × AttributionFactor
 * - AIU_i = ΔSynerxus × (w_i / Σw_j)
 *
 * where volunteer weight w_i = roleWeight × hours × reliabilityMultiplier
 */

/**
 * Role weights for attribution calculation
 *
 * Based on industry best practices:
 * - Taproot Foundation Pro Bono Valuation 2024: $220/hr for skilled pro bono vs $34.79 general (~6.3x)
 * - Independent Sector 2024: $34.79/hr national average for general volunteer time
 * - Bureau of Labor Statistics: Recommends role-based wage rates + 15.7% overhead
 * - SROI methodology: Skilled professional time valued 3-7x general volunteer time
 *
 * Weight tiers reflect responsibility level, skill requirements, and market value:
 * - Executive/Strategic: 3.0-4.0x (C-suite, board-level strategic guidance)
 * - Pro Bono Professional: 2.0-2.5x (licensed professionals: legal, medical, finance, IT)
 * - Project Leadership: 1.5-1.8x (coordinators, managers with direct accountability)
 * - Skilled/Technical: 1.2-1.4x (subject matter expertise, mentoring)
 * - General Support: 1.0x (baseline for standard volunteer activities)
 * - Administrative: 0.7-0.9x (clerical, data entry, logistics)
 * - Trainee/Observer: 0.3-0.5x (learning capacity, limited direct contribution)
 */
export const ROLE_WEIGHTS: Record<string, number> = {
  // Executive & Strategic Leadership (highest impact, strategic decision-making)
  executive: 4.0,       // C-suite executives, board advisors providing strategic guidance
  strategic_advisor: 3.5, // Senior consultants, strategic planners

  // Pro Bono Professionals (licensed/certified expertise - per Taproot Foundation valuation)
  pro_bono_legal: 3.0,  // Attorneys, legal counsel (based on ~$220/hr pro bono rate)
  pro_bono_medical: 3.0, // Doctors, nurses, healthcare professionals
  pro_bono_finance: 2.5, // CPAs, financial advisors, auditors
  pro_bono_tech: 2.5,   // Software engineers, IT architects, data scientists
  pro_bono_marketing: 2.0, // Marketing strategists, brand consultants

  // Project Leadership (accountability for outcomes)
  project_lead: 1.8,    // Project managers with full accountability
  lead: 1.5,            // Team leads, coordinators (legacy - retained for compatibility)
  team_captain: 1.5,    // Shift/team supervisors

  // Skilled Contributors (expertise without leadership responsibility)
  mentor: 1.4,          // Mentors, trainers, coaches
  specialist: 1.3,      // Subject matter experts (non-licensed)
  facilitator: 1.2,     // Workshop facilitators, event hosts

  // General Support (baseline tier)
  support: 1.0,         // General volunteers - Independent Sector baseline
  volunteer: 1.0,       // Alias for support (common terminology)

  // Administrative & Logistics
  admin: 0.8,           // Administrative support, data entry
  logistics: 0.7,       // Setup, teardown, transportation

  // Learning & Development
  trainee: 0.5,         // Volunteers in training (learning focus)
  observer: 0.3,        // Shadowing, observing only (minimal direct contribution)
};

/**
 * Role categories for UI grouping and selection
 */
export const ROLE_CATEGORIES: Record<string, { label: string; roles: string[] }> = {
  executive: {
    label: "Executive & Strategic",
    roles: ["executive", "strategic_advisor"]
  },
  pro_bono: {
    label: "Pro Bono Professional",
    roles: ["pro_bono_legal", "pro_bono_medical", "pro_bono_finance", "pro_bono_tech", "pro_bono_marketing"]
  },
  leadership: {
    label: "Project Leadership",
    roles: ["project_lead", "lead", "team_captain"]
  },
  skilled: {
    label: "Skilled Contributors",
    roles: ["mentor", "specialist", "facilitator"]
  },
  general: {
    label: "General Support",
    roles: ["support", "volunteer"]
  },
  administrative: {
    label: "Administrative & Logistics",
    roles: ["admin", "logistics"]
  },
  learning: {
    label: "Learning & Development",
    roles: ["trainee", "observer"]
  }
};

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    executive: "Executive/C-Suite",
    strategic_advisor: "Strategic Advisor",
    pro_bono_legal: "Pro Bono Legal",
    pro_bono_medical: "Pro Bono Medical",
    pro_bono_finance: "Pro Bono Finance",
    pro_bono_tech: "Pro Bono Tech/IT",
    pro_bono_marketing: "Pro Bono Marketing",
    project_lead: "Project Lead",
    lead: "Team Lead",
    team_captain: "Team Captain",
    mentor: "Mentor/Trainer",
    specialist: "Specialist",
    facilitator: "Facilitator",
    support: "General Support",
    volunteer: "Volunteer",
    admin: "Administrative",
    logistics: "Logistics",
    trainee: "Trainee",
    observer: "Observer"
  };
  return displayNames[role] || role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
}

// Reliability multipliers based on verification status
export const RELIABILITY_MULTIPLIERS: Record<string, number> = {
  verified: 1.0,      // NGO/org verified
  self_reported: 0.8, // Self-reported, not yet verified
  pending: 0.7,       // Pending verification
  disputed: 0.5,      // Under dispute
};

// Verification status options
export type VerificationStatus = 'pending' | 'verified' | 'self_reported' | 'disputed' | 'rejected';

// AIU Types
export interface AIUCalculationInput {
  kpiBefore: number;
  kpiAfter: number;
  attributionFactor: number; // 0-1 (percentage as decimal)
  volunteers: VolunteerContribution[];
  reportingWindow?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface VolunteerContribution {
  volunteerId: number;
  volunteerName: string;
  role: string;
  hours: number;
  reliabilityStatus: string;
  sessionsCount?: number;
  uniqueBeneficiariesServed?: number;
}

export interface AIUResult {
  // Project-level metrics
  deltaKpi: number;
  deltaSynerxus: number;
  attributionFactor: number;
  totalWeight: number;

  // Aggregate AIUs
  aiuUniqueTotal: number;
  aiuSessionsTotal: number;

  // Per-volunteer AIUs
  volunteerAius: VolunteerAIU[];

  // Metadata
  calculatedAt: Date;
  formulaVersion: string;
}

export interface VolunteerAIU {
  volunteerId: number;
  volunteerName: string;
  role: string;
  hours: number;
  roleWeight: number;
  reliabilityMultiplier: number;
  volunteerWeight: number;
  weightPercentage: number;
  aiuUnique: number;
  aiuSessions: number;
  totalAiu: number;
}

export interface AIUExportRow {
  projectId: number;
  projectName: string;
  sdgIndicator: string;
  kpiBefore: number;
  kpiAfter: number;
  deltaKpi: number;
  attributionFactor: number;
  deltaSynerxus: number;
  aiuUniqueTotal: number;
  aiuSessionsTotal: number;
  volunteerId: number;
  volunteerName: string;
  role: string;
  hours: number;
  roleWeight: number;
  reliabilityMultiplier: number;
  volunteerWeight: number;
  volunteerAiu: number;
  verificationStatus: string;
  verifier: string | null;
  submissionTimestamp: Date;
  evidenceLinks: string[];
  version: string;
}

export interface AIUJsonExport {
  projectId: number;
  projectName: string;
  sdgIndicator: string;
  kpiMetrics: {
    before: number;
    after: number;
    delta: number;
    unit: string;
  };
  attribution: {
    factor: number;
    deltaSynerxus: number;
    methodology: string;
  };
  aiuSummary: {
    uniqueTotal: number;
    sessionsTotal: number;
    calculatedAt: string;
    formulaVersion: string;
  };
  volunteers: {
    id: number;
    name: string;
    role: string;
    hours: number;
    weight: {
      role: number;
      reliability: number;
      total: number;
      percentage: number;
    };
    aiu: {
      unique: number;
      sessions: number;
      total: number;
    };
  }[];
  verification: {
    status: string;
    verifier: string | null;
    verifiedAt: string | null;
    evidenceLinks: string[];
  };
  audit: {
    submitter: string;
    submittedAt: string;
    lastModifiedAt: string;
    version: string;
  };
}

/**
 * Calculate AIUs for a project based on KPI change and volunteer contributions
 */
export function calculateProjectAIUs(input: AIUCalculationInput): AIUResult {
  const { kpiBefore, kpiAfter, attributionFactor, volunteers } = input;

  // Step 1: Calculate ΔKPI
  const deltaKpi = kpiAfter - kpiBefore;

  // Step 2: Calculate ΔSynerxus (attributed change)
  const deltaSynerxus = deltaKpi * attributionFactor;

  // Step 3: Calculate volunteer weights
  const volunteersWithWeights = volunteers.map(v => {
    const roleWeight = ROLE_WEIGHTS[v.role] || ROLE_WEIGHTS.support;
    const reliabilityMultiplier = RELIABILITY_MULTIPLIERS[v.reliabilityStatus] || RELIABILITY_MULTIPLIERS.pending;
    const volunteerWeight = roleWeight * v.hours * reliabilityMultiplier;

    return {
      ...v,
      roleWeight,
      reliabilityMultiplier,
      volunteerWeight,
    };
  });

  // Step 4: Calculate total weight
  const totalWeight = volunteersWithWeights.reduce((sum, v) => sum + v.volunteerWeight, 0);

  // Step 5: Calculate per-volunteer AIUs
  const volunteerAius: VolunteerAIU[] = volunteersWithWeights.map(v => {
    const weightPercentage = totalWeight > 0 ? v.volunteerWeight / totalWeight : 0;
    const aiuUnique = deltaSynerxus * weightPercentage;
    const aiuSessions = v.sessionsCount || Math.ceil(v.hours / 2); // Default: 1 session per 2 hours

    return {
      volunteerId: v.volunteerId,
      volunteerName: v.volunteerName,
      role: v.role,
      hours: v.hours,
      roleWeight: v.roleWeight,
      reliabilityMultiplier: v.reliabilityMultiplier,
      volunteerWeight: v.volunteerWeight,
      weightPercentage: Math.round(weightPercentage * 10000) / 100, // As percentage with 2 decimals
      aiuUnique: Math.round(aiuUnique * 100) / 100, // Round to 2 decimals
      aiuSessions,
      totalAiu: Math.round((aiuUnique + aiuSessions * 0.1) * 100) / 100, // Sessions worth 0.1 AIU each
    };
  });

  // Step 6: Calculate totals
  const aiuUniqueTotal = Math.round(volunteerAius.reduce((sum, v) => sum + v.aiuUnique, 0) * 100) / 100;
  const aiuSessionsTotal = volunteerAius.reduce((sum, v) => sum + v.aiuSessions, 0);

  return {
    deltaKpi: Math.round(deltaKpi * 10000) / 10000,
    deltaSynerxus: Math.round(deltaSynerxus * 10000) / 10000,
    attributionFactor,
    totalWeight: Math.round(totalWeight * 100) / 100,
    aiuUniqueTotal,
    aiuSessionsTotal,
    volunteerAius,
    calculatedAt: new Date(),
    formulaVersion: '1.0.0',
  };
}

/**
 * Generate a sample AIU calculation for demonstration/testing
 * Education project: 120 students, KPI 0.40 → 0.46, Attribution 0.22
 */
export function generateSampleAIUCalculation(): AIUResult {
  const sampleInput: AIUCalculationInput = {
    kpiBefore: 0.40,
    kpiAfter: 0.46,
    attributionFactor: 0.22,
    volunteers: [
      {
        volunteerId: 1,
        volunteerName: 'Sarah Chen',
        role: 'lead',
        hours: 45,
        reliabilityStatus: 'verified',
        sessionsCount: 18,
        uniqueBeneficiariesServed: 35,
      },
      {
        volunteerId: 2,
        volunteerName: 'Marcus Johnson',
        role: 'mentor',
        hours: 32,
        reliabilityStatus: 'verified',
        sessionsCount: 14,
        uniqueBeneficiariesServed: 28,
      },
      {
        volunteerId: 3,
        volunteerName: 'Priya Patel',
        role: 'support',
        hours: 20,
        reliabilityStatus: 'self_reported',
        sessionsCount: 10,
        uniqueBeneficiariesServed: 22,
      },
    ],
    reportingWindow: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
    },
  };

  return calculateProjectAIUs(sampleInput);
}

/**
 * Format AIU for display in UI
 */
export function formatAIUDisplay(aiu: number, type: 'unique' | 'sessions' = 'unique'): string {
  if (type === 'sessions') {
    return `${aiu} session${aiu !== 1 ? 's' : ''}`;
  }
  return aiu.toFixed(2);
}

/**
 * Generate volunteer resume line with AIU
 */
export function generateVolunteerResumeLine(
  volunteerAiu: VolunteerAIU,
  projectName: string,
  sdgIndicator: string,
  verifier: string,
  kpiBefore: number,
  kpiAfter: number,
): string {
  return `As ${volunteerAiu.role}, I contributed ${volunteerAiu.aiuUnique.toFixed(1)} AIUs to ${sdgIndicator}, supporting a change from ${(kpiBefore * 100).toFixed(0)}% → ${(kpiAfter * 100).toFixed(0)}%. Verified by ${verifier}.`;
}

/**
 * Generate LinkedIn snippet for volunteer
 */
export function generateLinkedInSnippet(
  volunteerAiu: VolunteerAIU,
  projectName: string,
  sdgIndicator: string,
  verifier: string,
  kpiBefore: number,
  kpiAfter: number,
): string {
  const role = volunteerAiu.role.charAt(0).toUpperCase() + volunteerAiu.role.slice(1);
  return `🌍 ${role} Volunteer at ${projectName}\n\nContributed ${volunteerAiu.aiuUnique.toFixed(1)} Attributable Impact Units (AIUs) to ${sdgIndicator}.\n\n📊 Impact: ${(kpiBefore * 100).toFixed(0)}% → ${(kpiAfter * 100).toFixed(0)}% improvement\n⏱️ ${volunteerAiu.hours} hours volunteered\n✅ Verified by ${verifier}\n\n#VolunteerImpact #SDGs #SocialImpact`;
}

/**
 * Generate project summary paragraph with AIUs
 */
export function generateProjectSummary(
  projectName: string,
  aiuResult: AIUResult,
  sdgIndicator: string,
  beneficiaryCount: number,
  verifier: string,
): string {
  return `${projectName} achieved ${aiuResult.aiuUniqueTotal.toFixed(1)} Unique AIUs and ${aiuResult.aiuSessionsTotal} Session AIUs during the reporting period. The project contributed to ${sdgIndicator} with a KPI improvement of ${(aiuResult.deltaKpi * 100).toFixed(1)} percentage points (Attribution Factor: ${(aiuResult.attributionFactor * 100).toFixed(0)}%). ${aiuResult.volunteerAius.length} volunteers served ${beneficiaryCount} unique beneficiaries across ${aiuResult.aiuSessionsTotal} service sessions. Impact verified by ${verifier}.`;
}

/**
 * AIU tooltip text for dashboard
 */
export const AIU_TOOLTIP_TEXT = `AIU Unique counts each beneficiary once per reporting window. AIU Session counts service instances. Both map to SDG indicators and include attribution math and verification metadata.`;

/**
 * Convert Lives Impacted input to AIU-ready data
 * This bridges the volunteer input (Lives Impacted) to the AIU system
 */
export function convertLivesImpactedToAIU(
  livesImpacted: number,
  hours: number,
  role: string,
  verificationStatus: string,
  sessionsCount?: number,
): { uniqueBeneficiaries: number; sessions: number; estimatedAiu: number } {
  const roleWeight = ROLE_WEIGHTS[role] || ROLE_WEIGHTS.support;
  const reliabilityMultiplier = RELIABILITY_MULTIPLIERS[verificationStatus] || RELIABILITY_MULTIPLIERS.pending;

  // Sessions default to 1 per 2 hours if not specified
  const sessions = sessionsCount || Math.ceil(hours / 2);

  // Estimated AIU based on standard attribution (this is a simplified estimate)
  // Full AIU calculation requires project-level KPI data
  const estimatedAiu = livesImpacted * roleWeight * reliabilityMultiplier * 0.1; // 0.1 is a baseline factor

  return {
    uniqueBeneficiaries: livesImpacted,
    sessions,
    estimatedAiu: Math.round(estimatedAiu * 100) / 100,
  };
}

/**
 * Verification checklist for CSR teams
 */
export const CSR_VERIFICATION_CHECKLIST = [
  { id: 1, item: 'KPI baseline (before) documented with date and source', required: true },
  { id: 2, item: 'KPI endpoint (after) documented with date and source', required: true },
  { id: 3, item: 'Attribution factor methodology documented', required: true },
  { id: 4, item: 'Unique beneficiary count verified by NGO/partner', required: true },
  { id: 5, item: 'Volunteer hours verified against sign-in sheets', required: true },
  { id: 6, item: 'Session count matches attendance records', required: false },
  { id: 7, item: 'Evidence files (photos, documents) uploaded', required: false },
  { id: 8, item: 'Third-party verifier sign-off obtained', required: false },
];

/**
 * Generate CSV export data for AIU report
 */
export function generateAIUCsvExport(
  projectData: {
    projectId: number;
    projectName: string;
    sdgIndicator: string;
    kpiBefore: number;
    kpiAfter: number;
    verificationStatus: string;
    verifier: string | null;
    evidenceLinks: string[];
  },
  aiuResult: AIUResult,
): string {
  const headers = [
    'Project ID',
    'Project Name',
    'SDG Indicator',
    'KPI Before',
    'KPI After',
    'Delta KPI',
    'Attribution Factor',
    'Delta Synerxus',
    'AIU Unique Total',
    'AIU Sessions Total',
    'Volunteer ID',
    'Volunteer Name',
    'Role',
    'Hours',
    'Role Weight',
    'Reliability Multiplier',
    'Volunteer Weight',
    'Weight Percentage',
    'Volunteer AIU Unique',
    'Volunteer AIU Sessions',
    'Volunteer Total AIU',
    'Verification Status',
    'Verifier',
    'Submission Timestamp',
    'Evidence Links',
    'Formula Version',
  ];

  const rows = aiuResult.volunteerAius.map(v => [
    projectData.projectId,
    `"${projectData.projectName}"`,
    `"${projectData.sdgIndicator}"`,
    projectData.kpiBefore,
    projectData.kpiAfter,
    aiuResult.deltaKpi,
    aiuResult.attributionFactor,
    aiuResult.deltaSynerxus,
    aiuResult.aiuUniqueTotal,
    aiuResult.aiuSessionsTotal,
    v.volunteerId,
    `"${v.volunteerName}"`,
    `"${v.role}"`,
    v.hours,
    v.roleWeight,
    v.reliabilityMultiplier,
    v.volunteerWeight,
    v.weightPercentage,
    v.aiuUnique,
    v.aiuSessions,
    v.totalAiu,
    `"${projectData.verificationStatus}"`,
    `"${projectData.verifier || ''}"`,
    `"${aiuResult.calculatedAt.toISOString()}"`,
    `"${projectData.evidenceLinks.join('; ')}"`,
    `"${aiuResult.formulaVersion}"`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Generate JSON export data for AIU report
 */
export function generateAIUJsonExport(
  projectData: {
    projectId: number;
    projectName: string;
    sdgIndicator: string;
    kpiBefore: number;
    kpiAfter: number;
    kpiUnit: string;
    verificationStatus: string;
    verifier: string | null;
    verifiedAt: Date | null;
    evidenceLinks: string[];
    submitter: string;
    submittedAt: Date;
    lastModifiedAt: Date;
  },
  aiuResult: AIUResult,
): AIUJsonExport {
  return {
    projectId: projectData.projectId,
    projectName: projectData.projectName,
    sdgIndicator: projectData.sdgIndicator,
    kpiMetrics: {
      before: projectData.kpiBefore,
      after: projectData.kpiAfter,
      delta: aiuResult.deltaKpi,
      unit: projectData.kpiUnit,
    },
    attribution: {
      factor: aiuResult.attributionFactor,
      deltaSynerxus: aiuResult.deltaSynerxus,
      methodology: 'ΔSynerxus = ΔKPI × AttributionFactor; AIU_i = ΔSynerxus × (w_i / Σw_j)',
    },
    aiuSummary: {
      uniqueTotal: aiuResult.aiuUniqueTotal,
      sessionsTotal: aiuResult.aiuSessionsTotal,
      calculatedAt: aiuResult.calculatedAt.toISOString(),
      formulaVersion: aiuResult.formulaVersion,
    },
    volunteers: aiuResult.volunteerAius.map(v => ({
      id: v.volunteerId,
      name: v.volunteerName,
      role: v.role,
      hours: v.hours,
      weight: {
        role: v.roleWeight,
        reliability: v.reliabilityMultiplier,
        total: v.volunteerWeight,
        percentage: v.weightPercentage,
      },
      aiu: {
        unique: v.aiuUnique,
        sessions: v.aiuSessions,
        total: v.totalAiu,
      },
    })),
    verification: {
      status: projectData.verificationStatus,
      verifier: projectData.verifier,
      verifiedAt: projectData.verifiedAt?.toISOString() || null,
      evidenceLinks: projectData.evidenceLinks,
    },
    audit: {
      submitter: projectData.submitter,
      submittedAt: projectData.submittedAt.toISOString(),
      lastModifiedAt: projectData.lastModifiedAt.toISOString(),
      version: aiuResult.formulaVersion,
    },
  };
}

/**
 * Generate CSV headers for AIU export (for building UI)
 */
export const AIU_CSV_HEADERS = [
  'Project ID',
  'Project Name',
  'SDG Indicator',
  'KPI Before',
  'KPI After',
  'Delta KPI',
  'Attribution Factor',
  'Delta Synerxus',
  'AIU Unique Total',
  'AIU Sessions Total',
  'Volunteer ID',
  'Volunteer Name',
  'Role',
  'Hours',
  'Role Weight',
  'Reliability Multiplier',
  'Volunteer Weight',
  'Weight Percentage',
  'Volunteer AIU Unique',
  'Volunteer AIU Sessions',
  'Volunteer Total AIU',
  'Verification Status',
  'Verifier',
  'Submission Timestamp',
  'Evidence Links',
  'Formula Version',
];

/**
 * Generate downloadable blob for CSV export
 */
export function createAIUCsvBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generate downloadable blob for JSON export
 */
export function createAIUJsonBlob(jsonExport: AIUJsonExport): Blob {
  return new Blob([JSON.stringify(jsonExport, null, 2)], { type: 'application/json' });
}

/**
 * Format AIU export filename with timestamp
 */
export function generateAIUExportFilename(
  projectName: string,
  format: 'csv' | 'json',
  includeTimestamp = true,
): string {
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : '';
  return `aiu_export_${sanitizedName}${timestamp}.${format}`;
}

export default {
  calculateProjectAIUs,
  generateSampleAIUCalculation,
  formatAIUDisplay,
  generateVolunteerResumeLine,
  generateLinkedInSnippet,
  generateProjectSummary,
  convertLivesImpactedToAIU,
  generateAIUCsvExport,
  generateAIUJsonExport,
  createAIUCsvBlob,
  createAIUJsonBlob,
  generateAIUExportFilename,
  ROLE_WEIGHTS,
  RELIABILITY_MULTIPLIERS,
  AIU_TOOLTIP_TEXT,
  AIU_CSV_HEADERS,
  CSR_VERIFICATION_CHECKLIST,
};
