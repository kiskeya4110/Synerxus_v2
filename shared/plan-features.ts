/**
 * Synerxus Corporate Plan Feature Flags
 * Single source of truth for what each subscription tier includes.
 * Used on both client (feature gating) and server (enforcement).
 */

export type SubscriptionTier = "free" | "pilot" | "starter" | "growth" | "enterprise";

export interface PlanFeatures {
  /** Human-readable plan name */
  label: string;
  /** Max NGO partners the corporate can link to */
  maxNgoPartners: number;
  /** Max admin seats (users under this corporate account) */
  maxAdminSeats: number;
  /** Max distinct programs/projects a corporate can run concurrently */
  maxPrograms: number;
  /** Max verified outcomes per calendar month */
  maxMonthlyOutcomes: number;
  /** Can download verified ESG reports as PDF */
  esgReportExport: boolean;
  /** Can export raw data as CSV */
  csvExport: boolean;
  /**
   * Can access the REST API for system integrations.
   * TODO (Post-Pilot): Not yet implemented. Requires:
   *   1. API key generation + management (issue/revoke per corporate account)
   *   2. Versioned public endpoints (/api/v1/...)
   *   3. requirePlanFeature("apiAccess") gate on those routes
   * Do not sell Growth/Enterprise on this feature until built.
   */
  apiAccess: boolean;
  /** White-label impact reports (remove Synerxus branding) */
  whiteLabelReports: boolean;
  /** Advanced analytics dashboard (trend charts, SDG breakdown) */
  advancedAnalytics: boolean;
  /** Custom branding (upload logo, brand colours) */
  customBranding: boolean;
  /** SSO / SAML login */
  ssoAccess: boolean;
  /** Dedicated customer success manager */
  dedicatedCsm: boolean;
  /** SLA guarantee */
  slaGuarantee: boolean;
  /** CSRD / GRI compliance module */
  csrdModule: boolean;
  /** Multi-region / multi-subsidiary support */
  multiRegion: boolean;
}

export const PLAN_FEATURES: Record<SubscriptionTier, PlanFeatures> = {
  free: {
    label: "Free",
    maxNgoPartners: 1,
    maxAdminSeats: 1,
    maxPrograms: 0,
    maxMonthlyOutcomes: 0,
    esgReportExport: false,
    csvExport: false,
    apiAccess: false,
    whiteLabelReports: false,
    advancedAnalytics: false,
    customBranding: false,
    ssoAccess: false,
    dedicatedCsm: false,
    slaGuarantee: false,
    csrdModule: false,
    multiRegion: false,
  },
  pilot: {
    label: "Pilot",
    maxNgoPartners: 5,
    maxAdminSeats: 1,
    maxPrograms: 1,
    maxMonthlyOutcomes: 50,
    esgReportExport: true,
    csvExport: false,
    apiAccess: false,
    whiteLabelReports: false,
    advancedAnalytics: false,
    customBranding: false,
    ssoAccess: false,
    dedicatedCsm: false,
    slaGuarantee: false,
    csrdModule: false,
    multiRegion: false,
  },
  starter: {
    label: "Starter",
    maxNgoPartners: 10,
    maxAdminSeats: 3,
    maxPrograms: 3,
    maxMonthlyOutcomes: 50,
    esgReportExport: true,
    csvExport: true,
    apiAccess: false,
    whiteLabelReports: false,
    advancedAnalytics: false,
    customBranding: true,
    ssoAccess: false,
    dedicatedCsm: false,
    slaGuarantee: false,
    csrdModule: false,
    multiRegion: false,
  },
  growth: {
    label: "Growth",
    maxNgoPartners: Infinity,
    maxAdminSeats: 10,
    maxPrograms: Infinity,
    maxMonthlyOutcomes: 250,
    esgReportExport: true,
    csvExport: true,
    apiAccess: true,
    whiteLabelReports: true,
    advancedAnalytics: true,
    customBranding: true,
    ssoAccess: false,
    dedicatedCsm: false,
    slaGuarantee: false,
    csrdModule: true,
    multiRegion: false,
  },
  enterprise: {
    label: "Enterprise",
    maxNgoPartners: Infinity,
    maxAdminSeats: Infinity,
    maxPrograms: Infinity,
    maxMonthlyOutcomes: Infinity,
    esgReportExport: true,
    csvExport: true,
    apiAccess: true,
    whiteLabelReports: true,
    advancedAnalytics: true,
    customBranding: true,
    ssoAccess: true,
    dedicatedCsm: true,
    slaGuarantee: true,
    csrdModule: true,
    multiRegion: true,
  },
};

/** Returns feature flags for a given tier, falling back to "free" for unknown tiers */
export function getPlanFeatures(tier: string | null | undefined): PlanFeatures {
  return PLAN_FEATURES[(tier as SubscriptionTier) ?? "free"] ?? PLAN_FEATURES.free;
}
