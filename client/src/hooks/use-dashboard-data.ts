/**
 * Dashboard Data Hook
 * Optimized data fetching for dashboard components
 *
 * Features:
 * - Batched queries to prevent waterfall requests
 * - Configurable polling intervals
 * - Automatic refetch on window focus
 * - Error handling with retry logic
 * - Memoized selectors for derived data
 */

import { useQuery, useQueries, UseQueryResult } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { safeArray, safeReduce, safeFilter } from "@/lib/safe-array";
import { auth } from "@/lib/firebase";

// Helper to get auth token for API requests
async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
  } catch (error) {
    console.error("Error getting auth token:", error);
  }
  return null;
}

// ============================================
// TYPES
// ============================================

export interface DashboardQueryConfig {
  userId?: number | string;
  organizationId?: number | string;
  partnerId?: number | string;
  userType?: "volunteer" | "organization" | "corporate-partner";
}

export interface DashboardMetrics {
  totalHours: number;
  tasksCompleted: number;
  projectsCompleted: number;
  impactsLogged: number;
  activeProjects: number;
  upcomingEvents: number;
}

export interface ProjectSummary {
  id: number;
  name: string;
  status: string;
  completionPercentage: number;
  totalHoursLogged: number;
  volunteerCount?: number;
}

export interface ActivitySummary {
  id: number;
  date: string;
  hours: number;
  projectName?: string;
  description?: string;
}

// ============================================
// QUERY HELPERS
// ============================================

const fetchJSON = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
};

// Query configurations with stale times
const QUERY_CONFIG = {
  // Data that changes frequently - poll every 30s
  LIVE: {
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  },
  // Data that changes occasionally - poll every 5 minutes
  MODERATE: {
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  },
  // Static data - no polling
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  },
} as const;

// ============================================
// VOLUNTEER DASHBOARD HOOK
// ============================================

export function useVolunteerDashboard(config: DashboardQueryConfig) {
  const { userId } = config;

  // Batch all queries together
  const queries = useQueries({
    queries: [
      {
        queryKey: ["/api/volunteer-activities", { userId }],
        queryFn: () => fetchJSON<ActivitySummary[]>(`/api/volunteer-activities?userId=${userId}`),
        enabled: !!userId,
        ...QUERY_CONFIG.LIVE,
      },
      {
        queryKey: ["/api/project-assignments", { volunteerId: userId }],
        queryFn: () => fetchJSON<any[]>(`/api/project-assignments?volunteerId=${userId}`),
        enabled: !!userId,
        ...QUERY_CONFIG.MODERATE,
      },
      {
        queryKey: ["/api/applications", { volunteerId: userId }],
        queryFn: () => fetchJSON<any[]>(`/api/applications?volunteerId=${userId}`),
        enabled: !!userId,
        ...QUERY_CONFIG.MODERATE,
      },
      {
        queryKey: ["/api/leaderboard", { userId }],
        queryFn: () => fetchJSON<any>(`/api/leaderboard?userId=${userId}`),
        enabled: !!userId,
        ...QUERY_CONFIG.MODERATE,
      },
      {
        queryKey: ["/api/badges", { userId }],
        queryFn: () => fetchJSON<any[]>(`/api/badges?userId=${userId}`),
        enabled: !!userId,
        ...QUERY_CONFIG.STATIC,
      },
    ],
  });

  const [activitiesQuery, assignmentsQuery, applicationsQuery, leaderboardQuery, badgesQuery] = queries;

  // Memoized metrics calculation
  const metrics = useMemo<DashboardMetrics>(() => {
    const activities = safeArray(activitiesQuery.data);
    const assignments = safeArray(assignmentsQuery.data);
    const applications = safeArray(applicationsQuery.data);

    return {
      totalHours: safeReduce(activities, (sum, a) => sum + (a.hours || 0), 0),
      tasksCompleted: safeFilter(assignments, (a) => a.status === "completed").length,
      projectsCompleted: safeFilter(assignments, (a) => a.completionPercentage === 100).length,
      impactsLogged: activities.length,
      activeProjects: safeFilter(assignments, (a) => a.status === "active").length,
      upcomingEvents: safeFilter(applications, (a) => a.status === "accepted").length,
    };
  }, [activitiesQuery.data, assignmentsQuery.data, applicationsQuery.data]);

  // Loading state
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const errors = queries.filter((q) => q.error).map((q) => q.error);

  return {
    // Raw data
    activities: safeArray(activitiesQuery.data),
    assignments: safeArray(assignmentsQuery.data),
    applications: safeArray(applicationsQuery.data),
    leaderboard: leaderboardQuery.data,
    badges: safeArray(badgesQuery.data),

    // Computed metrics
    metrics,

    // Query states
    isLoading,
    isError,
    errors,

    // Refetch functions
    refetch: useCallback(() => {
      queries.forEach((q) => q.refetch());
    }, [queries]),
  };
}

// ============================================
// ORGANIZATION DASHBOARD HOOK
// ============================================

export function useOrganizationDashboard(config: DashboardQueryConfig) {
  const { organizationId } = config;

  const queries = useQueries({
    queries: [
      {
        queryKey: ["/api/projects", { organizationId }],
        queryFn: () => fetchJSON<ProjectSummary[]>(`/api/projects?organizationId=${organizationId}`),
        enabled: !!organizationId,
        ...QUERY_CONFIG.MODERATE,
      },
      {
        queryKey: ["/api/opportunities", { organizationId }],
        queryFn: () => fetchJSON<any[]>(`/api/opportunities?organizationId=${organizationId}`),
        enabled: !!organizationId,
        ...QUERY_CONFIG.MODERATE,
      },
      {
        queryKey: ["/api/applications", { organizationId }],
        queryFn: () => fetchJSON<any[]>(`/api/applications?organizationId=${organizationId}`),
        enabled: !!organizationId,
        ...QUERY_CONFIG.LIVE,
      },
      {
        queryKey: ["/api/volunteer-activities", { organizationId }],
        queryFn: () => fetchJSON<ActivitySummary[]>(`/api/volunteer-activities?organizationId=${organizationId}`),
        enabled: !!organizationId,
        ...QUERY_CONFIG.LIVE,
      },
      {
        queryKey: ["/api/dashboard/organization", organizationId],
        queryFn: () => fetchJSON<any>(`/api/dashboard/organization?organizationId=${organizationId}`),
        enabled: !!organizationId,
        ...QUERY_CONFIG.MODERATE,
      },
    ],
  });

  const [projectsQuery, opportunitiesQuery, applicationsQuery, activitiesQuery, dashboardQuery] = queries;

  // Memoized metrics
  const metrics = useMemo<DashboardMetrics & { pendingApplications: number; activeVolunteers: number }>(() => {
    const projects = safeArray(projectsQuery.data);
    const applications = safeArray(applicationsQuery.data);
    const activities = safeArray(activitiesQuery.data);
    const opportunities = safeArray(opportunitiesQuery.data);

    const uniqueVolunteers = new Set(activities.map((a: any) => a.userId));

    return {
      totalHours: safeReduce(activities, (sum, a) => sum + (a.hours || 0), 0),
      tasksCompleted: 0, // Would need tasks query
      projectsCompleted: safeFilter(projects, (p) => p.status === "completed").length,
      impactsLogged: activities.length,
      activeProjects: safeFilter(projects, (p) => p.status === "active").length,
      upcomingEvents: safeFilter(opportunities, (o) => o.status === "open").length,
      pendingApplications: safeFilter(applications, (a) => a.status === "pending").length,
      activeVolunteers: uniqueVolunteers.size,
    };
  }, [projectsQuery.data, applicationsQuery.data, activitiesQuery.data, opportunitiesQuery.data]);

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  return {
    projects: safeArray(projectsQuery.data),
    opportunities: safeArray(opportunitiesQuery.data),
    applications: safeArray(applicationsQuery.data),
    activities: safeArray(activitiesQuery.data),
    dashboardData: dashboardQuery.data,
    metrics,
    isLoading,
    isError,
    refetch: useCallback(() => {
      queries.forEach((q) => q.refetch());
    }, [queries]),
  };
}

// ============================================
// CSR PARTNER DASHBOARD HOOK
// ============================================

export function useCSRDashboard(config: DashboardQueryConfig) {
  const { partnerId } = config;

  const queries = useQueries({
    queries: [
      {
        queryKey: ["/api/csr/partner", partnerId],
        queryFn: () => fetchJSON<any>(`/api/csr/partner?id=${partnerId}`),
        enabled: !!partnerId,
        ...QUERY_CONFIG.MODERATE,
      },
      {
        queryKey: ["/api/csr/employees", partnerId],
        queryFn: () => fetchJSON<any[]>(`/api/csr/employees?partnerId=${partnerId}`),
        enabled: !!partnerId,
        ...QUERY_CONFIG.LIVE,
      },
      {
        queryKey: ["/api/csr/challenges", partnerId],
        queryFn: () => fetchJSON<any[]>(`/api/csr/challenges?partnerId=${partnerId}`),
        enabled: !!partnerId,
        ...QUERY_CONFIG.MODERATE,
      },
      {
        queryKey: ["/api/csr/budget-links", partnerId],
        queryFn: () => fetchJSON<any[]>(`/api/csr/budget-links?partnerId=${partnerId}`),
        enabled: !!partnerId,
        ...QUERY_CONFIG.STATIC,
      },
    ],
  });

  const [partnerQuery, employeesQuery, challengesQuery, budgetQuery] = queries;

  const metrics = useMemo(() => {
    const employees = safeArray(employeesQuery.data);
    const challenges = safeArray(challengesQuery.data);

    return {
      totalEmployees: employees.length,
      activeEmployees: safeFilter(employees, (e) => e.hoursVolunteered > 0).length,
      totalHours: safeReduce(employees, (sum, e) => sum + (e.hoursVolunteered || 0), 0),
      activeChallenges: safeFilter(challenges, (c) => c.status === "active").length,
      completedChallenges: safeFilter(challenges, (c) => c.status === "completed").length,
    };
  }, [employeesQuery.data, challengesQuery.data]);

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  return {
    partner: partnerQuery.data,
    employees: safeArray(employeesQuery.data),
    challenges: safeArray(challengesQuery.data),
    budgetLinks: safeArray(budgetQuery.data),
    metrics,
    isLoading,
    isError,
    refetch: useCallback(() => {
      queries.forEach((q) => q.refetch());
    }, [queries]),
  };
}

// ============================================
// GENERIC DATA SELECTORS
// ============================================

/**
 * Create a memoized selector for filtering data
 */
export function useFilteredData<T>(
  data: T[],
  predicate: (item: T) => boolean,
  deps: unknown[] = []
): T[] {
  return useMemo(() => safeFilter(data, predicate), [data, ...deps]);
}

/**
 * Create a memoized selector for aggregating data
 */
export function useAggregatedData<T, R>(
  data: T[],
  reducer: (acc: R, item: T) => R,
  initialValue: R,
  deps: unknown[] = []
): R {
  return useMemo(() => safeReduce(data, reducer, initialValue), [data, initialValue, ...deps]);
}

/**
 * Create a memoized selector for grouping data
 */
export function useGroupedData<T>(
  data: T[],
  keyFn: (item: T) => string,
  deps: unknown[] = []
): Record<string, T[]> {
  return useMemo(() => {
    const grouped: Record<string, T[]> = {};
    safeArray(data).forEach((item) => {
      const key = keyFn(item);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    return grouped;
  }, [data, ...deps]);
}

// ============================================
// PENDING APPROVALS HOOK
// ============================================

export interface PendingActivity {
  id: number;
  projectId: number;
  userId: number;
  hours: number;
  description?: string;
  verificationStatus: string;
  volunteerName?: string;
  volunteerEmail?: string;
  projectName?: string;
  type: 'hours';
}

export interface PendingImpact {
  id: number;
  projectId: number;
  userId?: number;
  metricId?: number;
  value: number;
  verificationStatus: string;
  volunteerName?: string;
  volunteerEmail?: string;
  projectName?: string;
  metricName?: string;
  type: 'impact';
}

export interface PendingApprovalsData {
  pendingActivities: PendingActivity[];
  pendingImpacts: PendingImpact[];
  totalPending: number;
}

export function usePendingApprovals(userId: string | number | null) {
  const query = useQuery<PendingApprovalsData>({
    queryKey: ['/api/pending-approvals', userId],
    queryFn: async () => {
      if (!userId) return { pendingActivities: [], pendingImpacts: [], totalPending: 0 };
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Authentication is handled via Bearer token, no need to send userId in query
      const response = await fetch('/api/pending-approvals', { headers });
      if (!response.ok) return { pendingActivities: [], pendingImpacts: [], totalPending: 0 };
      return response.json();
    },
    enabled: !!userId,
    ...QUERY_CONFIG.LIVE,
  });

  const approveActivity = useCallback(async (activityId: number, reviewerId: number) => {
    const token = await getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api/volunteer-activities/${activityId}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reviewerId }),
    });
    if (!response.ok) throw new Error('Failed to approve activity');
    query.refetch();
    return response.json();
  }, [query]);

  const rejectActivity = useCallback(async (activityId: number) => {
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api/volunteer-activities/${activityId}/reject`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to reject activity');
    query.refetch();
    return response.json();
  }, [query]);

  const approveImpact = useCallback(async (impactId: number, reviewerId: number) => {
    const token = await getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api/project-impacts/${impactId}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reviewerId }),
    });
    if (!response.ok) throw new Error('Failed to approve impact');
    query.refetch();
    return response.json();
  }, [query]);

  const rejectImpact = useCallback(async (impactId: number) => {
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api/project-impacts/${impactId}/reject`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to reject impact');
    query.refetch();
    return response.json();
  }, [query]);

  return {
    pendingActivities: query.data?.pendingActivities ?? [],
    pendingImpacts: query.data?.pendingImpacts ?? [],
    totalPending: query.data?.totalPending ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    approveActivity,
    rejectActivity,
    approveImpact,
    rejectImpact,
  };
}

// ============================================
// ORGANIZATION AIU HOOK
// ============================================

export interface OrganizationAIUSummary {
  organizationId: number;
  organizationName: string;
  totalAiu: number;
  aiuUnique: number;
  aiuSessions: number;
  projectCount: number;
  volunteerCount: number;
  totalHours: number;
  livesImpacted: number;
  sdgsCovered: number[];
  verificationRate: number;
  projects: Array<{
    projectId: number;
    projectName: string;
    aiu: number;
    orgDirectShare: number;
    volunteerAiuSum: number;
    sdgIndicator: string;
    verificationStatus: string;
  }>;
}

export interface AIUFilters {
  projectId?: string;
  timePeriod?: string;
  sdgGoal?: string;
}

export function useOrganizationAIU(
  organizationId: number | string | null,
  filters: AIUFilters = {}
) {
  const { projectId, timePeriod, sdgGoal } = filters;

  const query = useQuery<OrganizationAIUSummary | null>({
    queryKey: ['/api/aiu/organization', organizationId, projectId, timePeriod, sdgGoal],
    queryFn: async () => {
      if (!organizationId) return null;
      const params = new URLSearchParams();
      if (projectId && projectId !== 'all') params.append('projectId', projectId);
      if (timePeriod && timePeriod !== 'all') params.append('timePeriod', timePeriod);
      if (sdgGoal) params.append('sdgGoal', sdgGoal);
      const queryString = params.toString();
      const url = `/api/aiu/organization/${organizationId}${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!organizationId,
    ...QUERY_CONFIG.MODERATE,
  });

  return {
    data: query.data,
    totalAiu: query.data?.totalAiu ?? 0,
    aiuUnique: query.data?.aiuUnique ?? 0,
    projectCount: query.data?.projectCount ?? 0,
    volunteerCount: query.data?.volunteerCount ?? 0,
    totalHours: query.data?.totalHours ?? 0,
    livesImpacted: query.data?.livesImpacted ?? 0,
    sdgsCovered: query.data?.sdgsCovered ?? [],
    verificationRate: query.data?.verificationRate ?? 0,
    projects: query.data?.projects ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================
// VOLUNTEER AIU HOOK
// ============================================

export interface VolunteerAIUData {
  volunteerId: number;
  totalAiu: number;
  projectAiu: Array<{
    projectId: number;
    projectName: string;
    aiu: number;
    hoursContributed: number;
    sdgIndicator: string;
  }>;
  sdgsContributed: number[];
}

export function useVolunteerAIU(volunteerId: number | string | null) {
  const query = useQuery<VolunteerAIUData | null>({
    queryKey: ['/api/aiu/volunteer', volunteerId],
    queryFn: async () => {
      if (!volunteerId) return null;
      const response = await fetch(`/api/aiu/volunteer/${volunteerId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!volunteerId,
    ...QUERY_CONFIG.MODERATE,
  });

  return {
    data: query.data,
    totalAiu: query.data?.totalAiu ?? 0,
    projectAiu: query.data?.projectAiu ?? [],
    sdgsContributed: query.data?.sdgsContributed ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default {
  useVolunteerDashboard,
  useOrganizationDashboard,
  useCSRDashboard,
  usePendingApprovals,
  useOrganizationAIU,
  useVolunteerAIU,
  useFilteredData,
  useAggregatedData,
  useGroupedData,
};
