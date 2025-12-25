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

  // Minimum file size in bytes (1KB - reject tiny/corrupted files)
  MIN_FILE_SIZE: 1024,

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

// Type exports for type-safe usage
export type ImageType = typeof IMAGE_CONFIG.IMAGE_TYPES[number];
export type AllowedMimeType = typeof IMAGE_CONFIG.ALLOWED_MIME_TYPES[number];
export type RoleWeight = keyof typeof IMPACT_CONFIG.ROLE_WEIGHTS;
