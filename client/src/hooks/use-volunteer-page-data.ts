/**
 * Volunteer Page Data Hook
 *
 * Centralises the five API queries used by volunteer-dashboard-new.tsx into
 * a single hook. Surfaces errors to callers instead of swallowing them
 * silently with try/catch returns of null / [].
 *
 * Usage:
 *   const { userData, summaryData, projects, logs, assignments, isLoading, errors }
 *     = useVolunteerPageData(userId, authLoading);
 */

import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";

export interface VolunteerPageErrors {
  user: boolean;
  summary: boolean;
  projects: boolean;
  logs: boolean;
  assignments: boolean;
}

export function useVolunteerPageData(
  userId: string | null,
  authLoading: boolean
) {
  // ── 1. Current user profile ────────────────────────────────────────────────
  const userQuery = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/me`, { headers, credentials: "include" });
      if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`);
      return response.json();
    },
    enabled: !!userId && !authLoading,
    retry: 2,
  });

  // ── 2. Dashboard summary (hours, matched opportunities, KPIs) ──────────────
  const summaryQuery = useQuery({
    queryKey: ["/api/dashboard/summary", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/dashboard/summary?userId=${userId}`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to fetch dashboard: ${response.status}`);
      return response.json();
    },
    enabled: !!userId && !authLoading,
    staleTime: 0,
    retry: 2,
  });

  // ── 3. Project list ────────────────────────────────────────────────────────
  const projectsQuery = useQuery({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/projects?userId=${userId}`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to fetch projects: ${response.status}`);
      return response.json();
    },
    enabled: !!userId,
    retry: 2,
  });

  // ── 4. Recent impact logs ──────────────────────────────────────────────────
  const logsQuery = useQuery({
    queryKey: ["/api/logs", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/logs?user_id=${userId}`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to fetch logs: ${response.status}`);
      const logs = await response.json();
      return logs.slice(0, 10).map((log: any) => ({
        id: log.id,
        projectName: log.project?.name || log.project_name || "Unknown Project",
        hours: log.hours,
        status: log.verificationStatus || log.verification_status || log.status || "pending",
        createdAt: log.createdAt || log.created_at,
        outcomeType: log.outcomes || log.outcome_type,
        outcomeValue: log.outcomeQuantity || log.outcome_value,
        sdgGoals: log.sdgTags || log.sdg_goals,
      }));
    },
    enabled: !!userId,
    staleTime: 0,
    retry: 2,
  });

  // ── 5. Assigned projects with enriched KPI data ────────────────────────────
  const assignmentsQuery = useQuery({
    queryKey: ["/api/project-assignments/details", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/project-assignments/details?volunteerId=${userId}`,
        { headers, credentials: "include" }
      );
      if (!response.ok) throw new Error(`Failed to fetch assignments: ${response.status}`);
      const data = await response.json();
      return data.filter((a: any) => a.status !== "declined");
    },
    enabled: !!userId,
    staleTime: 0,
    retry: 2,
  });

  const isLoading =
    userQuery.isLoading ||
    summaryQuery.isLoading ||
    logsQuery.isLoading ||
    assignmentsQuery.isLoading;

  const errors: VolunteerPageErrors = {
    user: userQuery.isError,
    summary: summaryQuery.isError,
    projects: projectsQuery.isError,
    logs: logsQuery.isError,
    assignments: assignmentsQuery.isError,
  };

  const hasAnyError = Object.values(errors).some(Boolean);

  return {
    // Data
    userData: userQuery.data ?? null,
    summaryData: summaryQuery.data ?? null,
    projects: (projectsQuery.data as any[]) ?? [],
    logs: (logsQuery.data as any[]) ?? [],
    assignments: (assignmentsQuery.data as any[]) ?? [],

    // Loading
    isLoading,
    isLoadingUser: userQuery.isLoading,
    isLoadingDashboard: summaryQuery.isLoading,
    isLoadingLogs: logsQuery.isLoading,
    isLoadingAssigned: assignmentsQuery.isLoading,

    // Errors
    errors,
    hasAnyError,
  };
}
