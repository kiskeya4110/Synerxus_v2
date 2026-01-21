/**
 * Hooks Index
 *
 * Central export point for commonly used hooks.
 * Import from "@/hooks" instead of individual files.
 */

// Authentication
export { useAuth, AuthProvider } from "./use-auth";

// Dashboard data fetching
export {
  useVolunteerDashboard,
  useOrganizationDashboard,
  useCSRDashboard,
  usePendingApprovals,
  useOrganizationAIU,
  useVolunteerAIU,
  useFilteredData,
  useAggregatedData,
  useGroupedData,
  type DashboardQueryConfig,
  type DashboardMetrics,
  type ProjectSummary,
  type ActivitySummary,
  type PendingActivity,
  type PendingImpact,
  type PendingApprovalsData,
  type OrganizationAIUSummary,
  type AIUFilters,
  type VolunteerAIUData,
} from "./use-dashboard-data";

// Toast notifications
export { useToast, toast } from "./use-toast";

// Onboarding
export { useOnboarding } from "./use-onboarding";

// Mobile detection
export { useIsMobile } from "./use-mobile";

// User ID
export { useCurrentUserId } from "./use-current-user-id";

// Animation
export { useCounterAnimation } from "./use-counter-animation";

// Feature flags
export { useFeatureFlags, useAIUDisplay, SHADOW_MODE_LABELS } from "./use-feature-flags";
