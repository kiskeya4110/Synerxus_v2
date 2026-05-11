/**
 * Shared constants across the application
 * Centralizes magic numbers and configuration values
 */

// ============================================
// IMAGE CONFIGURATION
// ============================================

export const IMAGE_CONFIG = {
  // Maximum file size in bytes (5MB)
  MAX_FILE_SIZE: 5 * 1024 * 1024,

  // Minimum file size in bytes (100 bytes - very small to allow cropped images)
  MIN_FILE_SIZE: 100,

  // Allowed MIME types
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,

  // Allowed file extensions
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const,

  // Image dimension constraints
  DIMENSIONS: {
    MIN_WIDTH: 50,
    MIN_HEIGHT: 50,
    MAX_WIDTH: 4000,
    MAX_HEIGHT: 4000,

    // Profile avatars
    AVATAR: {
      WIDTH: 256,
      HEIGHT: 256,
      THUMBNAIL_WIDTH: 64,
      THUMBNAIL_HEIGHT: 64,
    },

    // Organization logos
    LOGO: {
      WIDTH: 512,
      HEIGHT: 512,
      THUMBNAIL_WIDTH: 128,
      THUMBNAIL_HEIGHT: 128,
    },

    // Project cover images
    COVER: {
      WIDTH: 1200,
      HEIGHT: 630, // 1.91:1 aspect ratio (social media friendly)
      THUMBNAIL_WIDTH: 400,
      THUMBNAIL_HEIGHT: 210,
    },
  },

  // Compression quality (1-100)
  COMPRESSION_QUALITY: {
    HIGH: 90,
    MEDIUM: 75,
    LOW: 60,
    THUMBNAIL: 70,
  },

  // Image types for storage organization
  IMAGE_TYPES: ['profile', 'logo', 'project_cover', 'spotlight', 'evidence'] as const,
} as const;

// ============================================
// API CONFIGURATION
// ============================================

export const API_CONFIG = {
  // Server port
  PORT: 5000,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Request timeout in ms
  REQUEST_TIMEOUT: 30000,

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
} as const;

// ============================================
// IMPACT & SCORING CONFIGURATION
// ============================================

export const IMPACT_CONFIG = {
  // Time window for deduplication (6 hours in ms)
  DEDUP_TIME_WINDOW_MS: 6 * 60 * 60 * 1000,

  // Volunteer value per hour (USD) - Independent Sector 2025 rate
  VOLUNTEER_HOUR_VALUE: 34.79,

  // Monthly volunteer hours target
  MONTHLY_HOURS_TARGET: 20,

  // Role weights for impact attribution
  ROLE_WEIGHTS: {
    lead: 1.0,
    support: 0.5,
    observer: 0.0,
  } as const,

  // Matching algorithm weights
  MATCHING_WEIGHTS: {
    REQUIRED_SKILLS: 0.35,
    OPTIONAL_SKILLS: 0.15,
    SDG_ALIGNMENT: 0.20,
    ENGAGEMENT_TYPE: 0.15,
    LOCATION: 0.10,
    EXPERIENCE: 0.05,
  } as const,

  // Profile completion field count
  PROFILE_COMPLETION_FIELDS: 7,
} as const;

// ============================================
// GAMIFICATION CONFIGURATION
// ============================================

export const GAMIFICATION_CONFIG = {
  // Points per action
  POINTS: {
    HOUR_LOGGED: 10,
    TASK_COMPLETED: 25,
    PROJECT_COMPLETED: 100,
    IMPACT_LOGGED: 15,
    BADGE_EARNED: 50,
  },

  // Badge thresholds
  BADGE_THRESHOLDS: {
    HOURS: {
      BRONZE: 10,
      SILVER: 50,
      GOLD: 100,
      PLATINUM: 500,
    },
    TASKS: {
      BRONZE: 5,
      SILVER: 25,
      GOLD: 50,
      PLATINUM: 100,
    },
    PROJECTS: {
      BRONZE: 1,
      SILVER: 5,
      GOLD: 10,
      PLATINUM: 25,
    },
  },
} as const;

// ============================================
// EMAIL & NOTIFICATION CONFIGURATION
// ============================================

export const NOTIFICATION_CONFIG = {
  // Weekly digest interval in ms (7 days)
  DIGEST_INTERVAL_MS: 7 * 24 * 60 * 60 * 1000,

  // Minimum interval between digests (1 day)
  MIN_DIGEST_INTERVAL_MS: 24 * 60 * 60 * 1000,
} as const;

// ============================================
// CSR SCORING CONFIGURATION
// ============================================

export const CSR_SCORING = {
  // Default ESG scores
  DEFAULT_SCORES: {
    TRANSPARENCY: 90,
    IMPACT_VERIFICATION: 80,
    ACCOUNTABILITY: 85,
    COMMUNITY_ENGAGEMENT: 75,
    ENVIRONMENTAL: 82,
    SOCIAL: 88,
    GOVERNANCE: 84,
  },

  // Match score thresholds
  MATCH_THRESHOLDS: {
    EXCELLENT: 85,
    GOOD: 70,
    FAIR: 50,
    POOR: 0,
  },
} as const;

// ============================================
// DATA CUTOFF CONFIGURATION
// ============================================

/**
 * Data cutoff date - all metrics and data queries should only include
 * data from this date onwards. Data before this date should not be displayed.
 * This ensures the platform only shows relevant, current information.
 */
export const DATA_CUTOFF = {
  // The cutoff date - December 15, 2025
  DATE: new Date('2025-12-15T00:00:00.000Z'),

  // ISO format for database queries
  DATE_ISO: '2025-12-15',

  // Human-readable format
  DATE_DISPLAY: 'December 15, 2025',
} as const;

/**
 * Check if a date is within the valid data range (on or after cutoff)
 */
export function isDateAfterCutoff(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  return checkDate >= DATA_CUTOFF.DATE;
}

// ============================================
// FEATURE FLAGS CONFIGURATION
// ============================================

/**
 * Feature flags for controlling feature visibility
 *
 * TODO (Post-Pilot): Enable AIU display once marketing materials are ready.
 * The AIU system remains fully functional in the background for data collection
 * and internal validation. Only the user-facing display is controlled by this flag.
 */
export const FEATURE_FLAGS = {
  /**
   * Controls visibility of AIU (Attributable Impact Units) in the UI
   * When FALSE (Shadow Mode):
   * - AIU tracking is reserved for the full platform and NOT included in this pilot
   * - AIU calculations continue running in the background for data validation
   * - AIU is hidden from all user-facing UI
   * - AIU is excluded from API responses
   * - "Impact Score" is used as the primary metric instead
   *
   * When TRUE:
   * - Full AIU display is enabled (Reserved for future release)
   */
  ENABLE_AIU_DISPLAY: false,
} as const;

// Type exports for type-safe usage
export type ImageType = typeof IMAGE_CONFIG.IMAGE_TYPES[number];
export type AllowedMimeType = typeof IMAGE_CONFIG.ALLOWED_MIME_TYPES[number];
export type RoleWeight = keyof typeof IMPACT_CONFIG.ROLE_WEIGHTS;
export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// ============================================
// DOMAIN: EVIDENCE STATUSES
// ============================================

export const EVIDENCE_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  INCOMPLETE: 'incomplete',
} as const;
export type EvidenceStatus = typeof EVIDENCE_STATUS[keyof typeof EVIDENCE_STATUS];
export const EVIDENCE_STATUS_VALUES: EvidenceStatus[] = [
  EVIDENCE_STATUS.PENDING,
  EVIDENCE_STATUS.VERIFIED,
  EVIDENCE_STATUS.REJECTED,
  EVIDENCE_STATUS.INCOMPLETE,
];

// ============================================
// DOMAIN: EVIDENCE CONFIDENCE TIERS
// ============================================

export const CONFIDENCE_TIER = {
  VERIFIED: 'verified',
  PARTNER_REPORTED: 'partner_reported',
  DERIVED_MAPPED: 'derived_mapped',
} as const;
export type ConfidenceTier = typeof CONFIDENCE_TIER[keyof typeof CONFIDENCE_TIER];
export const CONFIDENCE_TIER_LABELS: Record<ConfidenceTier, string> = {
  [CONFIDENCE_TIER.VERIFIED]: 'Verified',
  [CONFIDENCE_TIER.PARTNER_REPORTED]: 'Partner-Reported',
  [CONFIDENCE_TIER.DERIVED_MAPPED]: 'Derived / Mapped',
};

// ============================================
// DOMAIN: STANDARD ROLE LABELS
// ============================================

export const ROLE = {
  ADMIN: 'admin',
  ORGANIZATION: 'organization',
  CORPORATE_PARTNER: 'corporate-partner',
  VOLUNTEER: 'volunteer',
  VERIFIER: 'verifier',
  AUDITOR: 'auditor',
} as const;
export type Role = typeof ROLE[keyof typeof ROLE];
export const ROLE_LABELS: Record<Role, string> = {
  [ROLE.ADMIN]: 'Administrator',
  [ROLE.ORGANIZATION]: 'NGO / Organization',
  [ROLE.CORPORATE_PARTNER]: 'Corporate Partner',
  [ROLE.VOLUNTEER]: 'Volunteer',
  [ROLE.VERIFIER]: 'Authorized Verifier',
  [ROLE.AUDITOR]: 'Independent Auditor',
};

// ============================================
// DOMAIN: REPORT SECTION LABELS
// ============================================

export const REPORT_SECTION = {
  EXECUTIVE_SNAPSHOT: 'executive_snapshot',
  EVIDENCE_CONFIDENCE_TIERS: 'evidence_confidence_tiers',
  EVIDENCE_QUALITY_SCORECARD: 'evidence_quality_scorecard',
  FRAMEWORK_ALIGNMENT: 'framework_alignment',
  SAMPLE_VERIFIED_EVIDENCE_RECORDS: 'sample_verified_evidence_records',
  NEGATIVE_IMPACT_SCREENING_SUMMARY: 'negative_impact_screening_summary',
  CONTRIBUTION_PATHWAY: 'contribution_pathway',
  METHODOLOGY_AND_DEFINITIONS: 'methodology_and_definitions',
  ASSURANCE_BOUNDARY_STATEMENT: 'assurance_boundary_statement',
} as const;
export type ReportSection = typeof REPORT_SECTION[keyof typeof REPORT_SECTION];
export const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
  [REPORT_SECTION.EXECUTIVE_SNAPSHOT]: 'Section 1: Executive Snapshot',
  [REPORT_SECTION.EVIDENCE_CONFIDENCE_TIERS]: 'Section 2: Evidence Confidence Tiers',
  [REPORT_SECTION.EVIDENCE_QUALITY_SCORECARD]: 'Section 3: Evidence Quality Scorecard',
  [REPORT_SECTION.FRAMEWORK_ALIGNMENT]: 'Section 4: Framework Alignment for Reporting Support',
  [REPORT_SECTION.SAMPLE_VERIFIED_EVIDENCE_RECORDS]: 'Section 5: Sample Partner-Confirmed Records',
  [REPORT_SECTION.NEGATIVE_IMPACT_SCREENING_SUMMARY]: 'Section 6: Negative Impact Screening Summary',
  [REPORT_SECTION.CONTRIBUTION_PATHWAY]: 'Section 7: Contribution Pathway',
  [REPORT_SECTION.METHODOLOGY_AND_DEFINITIONS]: 'Section 8: Methodology & Definitions',
  [REPORT_SECTION.ASSURANCE_BOUNDARY_STATEMENT]: 'Section 9: Assurance Boundary Statement',
};
export const REPORT_SECTION_ORDER: ReportSection[] = [
  REPORT_SECTION.EXECUTIVE_SNAPSHOT,
  REPORT_SECTION.EVIDENCE_CONFIDENCE_TIERS,
  REPORT_SECTION.EVIDENCE_QUALITY_SCORECARD,
  REPORT_SECTION.FRAMEWORK_ALIGNMENT,
  REPORT_SECTION.SAMPLE_VERIFIED_EVIDENCE_RECORDS,
  REPORT_SECTION.NEGATIVE_IMPACT_SCREENING_SUMMARY,
  REPORT_SECTION.CONTRIBUTION_PATHWAY,
  REPORT_SECTION.METHODOLOGY_AND_DEFINITIONS,
  REPORT_SECTION.ASSURANCE_BOUNDARY_STATEMENT,
];
