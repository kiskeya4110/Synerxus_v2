import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Plus, Briefcase, AlertCircle, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/projects/project-dialogs";
import { EditOpportunityDialog, DeleteOpportunityDialog } from "@/components/opportunities/opportunity-dialogs";
import { ProjectListCard } from "@/components/projects/project-list-card";
import OrganizationNav from "@/components/layout/organization-nav";
import VolunteerNav from "@/components/layout/volunteer-nav";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import PWAHeader from "@/components/pwa/pwa-header";
import Footer from "@/components/layout/footer";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import { CSRLayout } from "@/components/layout/csr-layout";
import { useViewportDetection, useIsPWAMode } from "@/hooks/use-mobile";
import { getAuthHeaders } from "@/lib/queryClient";
import type { Project, Task, ProjectAssignment, User, Opportunity } from "@shared/schema";

interface ProjectWithDetails extends Project {
  tasks?: Task[];
  assignments?: ProjectAssignment[];
}

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'volunteers'>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();
  const isPWAMode = useIsPWAMode();
  const userType = localStorage.getItem('userType');
  const isVolunteer = userType === 'volunteer';
  const isCSR = userType === 'corporate-partner' || userType === 'corporate_partner' || userType === 'csr';

  // Fetch current user to get organization ID
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser, isLoading: isUserLoading, isError: isUserError } = useQuery<User>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) throw new Error("No user ID found");
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users/me`, { headers, credentials: "include" });
      if (!response.ok) throw new Error("User not found");
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch projects scoped to the logged-in organization
  const { data: projects = [], isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ["/api/projects", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const headers = await getAuthHeaders();
      // Pass userId so the endpoint can scope projects to this org/volunteer
      const response = await fetch(`/api/projects?userId=${id}`, { headers, credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    select: (data: Project[]) => data as ProjectWithDetails[],
    enabled: !!currentUser && !!userId
  });

  // Fetch tasks scoped to the organization
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/tasks?userId=${id}`, { headers, credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser && !!userId
  });

  // Fetch assignments scoped to the organization's projects
  const { data: allAssignments = [] } = useQuery<ProjectAssignment[]>({
    queryKey: ["/api/project-assignments", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      // For organizations, fetch assignments for their projects
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) return [];
      // Fetch assignments for each project
      const allAssignments: ProjectAssignment[] = [];
      for (const projectId of projectIds) {
        const response = await fetch(`/api/project-assignments?projectId=${projectId}`);
        if (response.ok) {
          const assignments = await response.json();
          allAssignments.push(...assignments);
        }
      }
      return allAssignments;
    },
    enabled: !!currentUser && !!userId && projects.length > 0
  });

  // Fetch volunteer activities scoped to the organization's projects
  interface VolunteerActivity {
    id: number;
    projectId: number;
    userId: number;
    hours: number;
    createdAt: string;
  }
  const { data: allActivities = [] } = useQuery<VolunteerActivity[]>({
    queryKey: ["/api/volunteer-activities", userId, projects.map(p => p.id).join(',')],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      // For organizations, fetch activities for their projects
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) return [];
      // Fetch activities for each project
      const allActivities: VolunteerActivity[] = [];
      for (const projectId of projectIds) {
        const response = await fetch(`/api/volunteer-activities?projectId=${projectId}`, {
          headers, credentials: "include"
        });
        if (response.ok) {
          const activities = await response.json();
          allActivities.push(...activities);
        }
      }
      return allActivities;
    },
    enabled: !!currentUser && !!userId && projects.length > 0
  });

  // Fetch opportunities for the organization
  const { data: opportunities = [] } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/opportunities`, { headers, credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser && !!userId
  });

  const queryClient = useQueryClient();

  // KPI status for org users - shows which projects are missing KPI settings
  const { data: kpiStatus, refetch: refetchKpiStatus } = useQuery<{
    projects: Array<{ id: number; name: string; status: string; hasKpiSettings: boolean; impactMetricName: string | null; impactMetricUnit: string | null }>;
    missingKpiCount: number;
    totalProjects: number;
    lastSync: string | null;
  }>({
    queryKey: ["/api/organization/kpi-status"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/organization/kpi-status", { headers, credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser && currentUser.userType === 'organization',
  });

  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const syncKpisMutation = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/organization/sync-kpis", {
        method: "POST",
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Sync failed");
      return response.json();
    },
    onSuccess: (data) => {
      setSyncMessage({ type: 'success', text: data.message || "KPIs synced successfully." });
      refetchKpiStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setTimeout(() => setSyncMessage(null), 5000);
    },
    onError: () => {
      setSyncMessage({ type: 'error', text: "Failed to sync KPIs. Please try again." });
      setTimeout(() => setSyncMessage(null), 5000);
    },
  });

  const toggleProject = useCallback((projectId: number) => {
    setExpandedProjects(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(projectId)) {
        newExpanded.delete(projectId);
      } else {
        newExpanded.add(projectId);
      }
      return newExpanded;
    });
  }, []);

  // Memoize expensive calculations
  const projectMetrics = useMemo(() => {
    const metricsMap = new Map<number, {
      tasks: Task[];
      progress: number;
      metrics: {
        totalCommitted: number;
        totalCompleted: number;
        volunteers: number;
        engagementScore: number;
        engagementLevel: string;
      };
    }>();

    // Calculate date for 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    projects.forEach(project => {
      const projectTasks = allTasks.filter(task => task.projectId === project.id);
      const assignments = allAssignments.filter(assignment => assignment.projectId === project.id);
      const projectActivities = allActivities.filter(activity => activity.projectId === project.id);

      const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
      const progress = projectTasks.length === 0 ? 0 : Math.round((completedTasks / projectTasks.length) * 100);

      const totalCommitted = assignments.reduce((sum, a) => sum + (a.hoursCommitted || 0), 0);
      const activityHours = projectActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
      const assignmentHours = assignments.reduce((sum, a) => sum + (a.hoursCompleted || 0), 0);
      // Fall back to pre-computed totalHours from /api/projects if local fetches returned nothing
      const precomputedHours = (project as any).totalHours || 0;
      const totalCompleted = activityHours > 0 ? activityHours : assignmentHours > 0 ? assignmentHours : precomputedHours;

      // Calculate unique volunteers from assignments and activities (filter out null userIds)
      const uniqueVolunteerIds = new Set([
        ...assignments.map(a => a.volunteerId),
        ...projectActivities.filter(a => a.userId != null).map(a => a.userId)
      ]);
      // Fall back to pre-computed volunteerCount from /api/projects if local fetches returned nothing
      const precomputedVolunteers = (project as any).volunteerCount || 0;
      const volunteerCount = uniqueVolunteerIds.size > 0 ? uniqueVolunteerIds.size : precomputedVolunteers;

      // Calculate engagement score (0-100)
      const volunteerScore = Math.min((volunteerCount / 10) * 25, 25);
      const taskCompletionRate = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
      const taskScore = taskCompletionRate * 0.30;
      const hoursScore = totalCommitted > 0
        ? Math.min((totalCompleted / totalCommitted) * 25, 25)
        : totalCompleted > 0 ? Math.min((totalCompleted / 50) * 25, 25) : 0;

      // Recent activity score
      const recentActivities = projectActivities.filter(a => new Date(a.createdAt) >= thirtyDaysAgo);
      const activityScore = Math.min((recentActivities.length / 10) * 20, 20);

      const engagementScore = Math.round(volunteerScore + taskScore + hoursScore + activityScore);

      // Determine engagement level
      let engagementLevel: string;
      if (engagementScore >= 80) engagementLevel = 'excellent';
      else if (engagementScore >= 60) engagementLevel = 'good';
      else if (engagementScore >= 40) engagementLevel = 'moderate';
      else if (engagementScore >= 20) engagementLevel = 'low';
      else engagementLevel = 'minimal';

      metricsMap.set(project.id, {
        tasks: projectTasks,
        progress,
        metrics: {
          totalCommitted,
          totalCompleted,
          volunteers: volunteerCount,
          engagementScore,
          engagementLevel
        }
      });
    });

    return metricsMap;
  }, [projects, allTasks, allAssignments, allActivities]);

  const getProjectName = useCallback((projectId: number | null | undefined) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name || null;
  }, [projects]);

  const filteredProjects = useMemo(() =>
    projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === 'all' || statusFilter === 'volunteers') return true;
      if (statusFilter === 'active') {
        const s = (project.status || '').toLowerCase();
        return s === 'active' || s === 'in progress';
      }
      if (statusFilter === 'completed') {
        return (project.status || '').toLowerCase() === 'completed';
      }
      return true;
    }),
    [projects, searchTerm, statusFilter]
  );

  // Volunteers can only view projects, not edit them
  const canManageProjects = currentUser?.userType === 'organization';
  // Use localStorage userType as fallback when currentUser hasn't loaded yet
  const isOrganization = currentUser?.userType === 'organization' || userType === 'organization';

  // Wait for viewport detection to complete before rendering layout
  if (isViewportLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#faf9f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Handle no user ID - user not logged in
  if (!userId) {
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <OrganizationNav />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Please log in to view projects</p>
            <Link href="/landing">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle user loading state
  if (isUserLoading) {
    if (isOrganization && isMobile) {
      return (
        <OrganizationPWALayout activeTab="projects">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        </OrganizationPWALayout>
      );
    }
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <OrganizationNav />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  // Handle user error or no user
  if (isUserError || !currentUser) {
    if (isOrganization && isMobile) {
      return (
        <OrganizationPWALayout activeTab="projects">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 mb-2">Failed to load user data</p>
              <p className="text-stone-500 text-sm">Please try refreshing the page or logging in again.</p>
            </div>
          </div>
        </OrganizationPWALayout>
      );
    }
    return (
      <div className="min-h-screen bg-[#faf9f7]">
        <OrganizationNav />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-2">Failed to load user data</p>
            <p className="text-gray-500 text-sm">Please try refreshing the page or logging in again.</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state for projects
  if (isLoading) {
    if (isOrganization && isMobile) {
      return (
        <OrganizationPWALayout activeTab="projects">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        </OrganizationPWALayout>
      );
    }
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  // Mobile organization PWA view - MVP Layout
  if (isOrganization && isMobile) {
    // Calculate stats for MVP display
    const activeProjectsCount = projects.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s === 'active' || s === 'in progress';
    }).length;
    const completedProjectsCount = projects.filter(p => (p.status || '').toLowerCase() === 'completed').length;
    const totalVolunteers = new Set([
      ...allAssignments.map(a => a.volunteerId),
      ...allActivities.filter(a => a.userId != null).map(a => a.userId)
    ]).size;

    return (
      <OrganizationPWALayout activeTab="projects">
        <div className="px-4 py-4 space-y-4">
          {/* MVP Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-stone-900">Projects</h1>
              <p className="text-xs text-stone-600 mt-0.5">{projects.length} total · {activeProjectsCount} active</p>
            </div>
            {canManageProjects && currentUser?.organizationId && (
              <CreateProjectDialog organizationId={currentUser.organizationId} />
            )}
          </div>

          {/* MVP Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-xl p-3 border text-center transition-all active:scale-[0.97] ${
                statusFilter === 'all'
                  ? 'bg-white border-indigo-400 ring-2 ring-indigo-400/30 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              <p className="text-lg font-bold text-stone-900">{projects.length}</p>
              <p className="text-xs text-stone-600 font-medium">Total</p>
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`rounded-xl p-3 border text-center transition-all active:scale-[0.97] ${
                statusFilter === 'active'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30 shadow-sm'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <p className="text-lg font-bold text-emerald-800">{activeProjectsCount}</p>
              <p className="text-xs text-emerald-700 font-medium">Active</p>
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`rounded-xl p-3 border text-center transition-all active:scale-[0.97] ${
                statusFilter === 'completed'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/30 shadow-sm'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <p className="text-lg font-bold text-blue-800">{completedProjectsCount}</p>
              <p className="text-xs text-blue-700 font-medium">Done</p>
            </button>
            <button
              onClick={() => setStatusFilter('volunteers')}
              className={`rounded-xl p-3 border text-center transition-all active:scale-[0.97] ${
                statusFilter === 'volunteers'
                  ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/30 shadow-sm'
                  : 'bg-purple-50 border-purple-200'
              }`}
            >
              <p className="text-lg font-bold text-purple-800">{totalVolunteers}</p>
              <p className="text-xs text-purple-700 font-medium">Volunteers</p>
            </button>
          </div>

          {/* Per-project volunteer breakdown when volunteers filter is active */}
          {statusFilter === 'volunteers' && (
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm">
              <div className="px-4 py-3 border-b border-purple-100">
                <h3 className="text-sm font-semibold text-purple-800">Volunteers by Project</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {projects.map((project) => {
                  const metrics = projectMetrics.get(project.id);
                  if (!metrics) return null;
                  return (
                    <div key={project.id} className="px-4 py-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-stone-900 truncate flex-1">{project.name}</p>
                      <span className="text-sm font-bold text-purple-700">{metrics.metrics.volunteers}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Action - New Project */}
          <div className="flex gap-2">
            <Link href="/post-core-opportunity">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm whitespace-nowrap shadow-sm hover:bg-emerald-600 active:scale-95 transition-all">
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </Link>
            <button
              onClick={() => syncKpisMutation.mutate()}
              disabled={syncKpisMutation.isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap shadow-sm active:scale-95 transition-all disabled:opacity-50 ${
                kpiStatus && kpiStatus.missingKpiCount > 0
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${syncKpisMutation.isPending ? 'animate-spin' : ''}`} />
              {syncKpisMutation.isPending ? "Syncing..." : kpiStatus && kpiStatus.missingKpiCount > 0 ? `Sync KPIs (${kpiStatus.missingKpiCount})` : "Sync KPIs"}
            </button>
          </div>

          {/* KPI sync message */}
          {syncMessage && (
            <div className={`px-3 py-2 rounded-xl text-sm font-medium ${syncMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {syncMessage.text}
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-500" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 text-sm bg-white border-stone-300 rounded-xl shadow-sm text-stone-900 placeholder:text-stone-400"
            />
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-sm font-semibold text-stone-800">Your Projects</h2>
            <span className="text-xs text-stone-600 bg-stone-200 px-2 py-1 rounded-full">{filteredProjects.length}</span>
          </div>

          {/* MVP Project Cards */}
          <div className="space-y-3">
            {filteredProjects.map((project) => {
              const projectData = projectMetrics.get(project.id);
              if (!projectData) return null;
              const { progress, metrics } = projectData;

              // Status badge colors
              const statusColors: Record<string, string> = {
                active: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                completed: 'bg-blue-100 text-blue-800 border-blue-300',
                paused: 'bg-amber-100 text-amber-800 border-amber-300',
                draft: 'bg-stone-100 text-stone-700 border-stone-300',
              };

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer">
                    {/* Project Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-stone-900 truncate">{project.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[project.status || 'draft'] || statusColors.draft}`}>
                            {project.status || 'draft'}
                          </span>
                          <span className="text-xs text-stone-600">
                            {metrics.volunteers} volunteer{metrics.volunteers !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">Progress</span>
                        <span className="text-stone-800 font-medium">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* SDG Tags */}
                    {project.sdgGoals && project.sdgGoals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(project.sdgGoals as number[]).slice(0, 4).map((sdg: number) => (
                          <div
                            key={sdg}
                            className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center text-white"
                            style={{ backgroundColor: `hsl(${(sdg * 20) % 360}, 70%, 40%)` }}
                          >
                            {sdg}
                          </div>
                        ))}
                        {(project.sdgGoals as number[]).length > 4 && (
                          <span className="text-xs text-stone-600 self-center">
                            +{(project.sdgGoals as number[]).length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick Stats Row */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-200 text-xs text-stone-700">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {metrics.totalCompleted}h logged
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {metrics.engagementLevel}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Briefcase className="w-7 h-7 text-stone-500" />
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-1">No projects yet</h3>
              <p className="text-sm text-stone-600 mb-4">
                {searchTerm ? "No projects match your search" : "Create your first project to get started"}
              </p>
              {!searchTerm && canManageProjects && currentUser?.organizationId && (
                <Link href="/post-core-opportunity">
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-sm hover:bg-emerald-600 active:scale-95 transition-all">
                    <Plus className="h-4 w-4" />
                    Create Project
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>
      </OrganizationPWALayout>
    );
  }

  // CSR Layout wrapper for corporate partners
  if (isCSR) {
    return (
      <CSRLayout activeNav="portfolio" title="Partner Projects" subtitle="Browse and explore projects from partner organizations">
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.3s ease-in-out", maxWidth: "1200px" }}>
          {/* Search */}
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#9ca3af", zIndex: 1 }} />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "36px", minHeight: "44px" }}
            />
          </div>

          {/* Projects List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredProjects.map((project) => {
              const projectData = projectMetrics.get(project.id);
              if (!projectData) return null;
              const { tasks, progress, metrics } = projectData;
              const isExpanded = expandedProjects.has(project.id);
              return (
                <ProjectListCard
                  key={project.id}
                  project={project}
                  tasks={tasks}
                  metrics={metrics}
                  progress={progress}
                  isExpanded={isExpanded}
                  onToggle={() => toggleProject(project.id)}
                  canManageProjects={false}
                />
              );
            })}
          </div>

          {filteredProjects.length === 0 && (
            <Card style={{ padding: "48px", textAlign: "center" }}>
              <p style={{ color: "#6b7280" }}>No projects found</p>
            </Card>
          )}
        </div>
      </CSRLayout>
    );
  }

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      {/* Volunteer Mobile PWA Header */}
      {isVolunteer && isPWAMode && <PWAHeader />}

      {/* Volunteer Desktop Navigation - only for volunteers */}
      {isVolunteer && !isPWAMode && <VolunteerNav />}

      {isOrganization && <OrganizationNav />}
      <div className={`h-screen overflow-y-auto ${isVolunteer && isPWAMode ? 'pt-20 pb-36' : 'pb-36'}`} style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Projects & Tasks</h1>
        <p className="text-gray-600">Manage projects, tasks, and volunteer assignments</p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            data-testid="input-search-projects"
          />
        </div>
        {canManageProjects && currentUser?.organizationId && (
          <CreateProjectDialog organizationId={currentUser.organizationId} />
        )}
      </div>

      {/* Post Opportunities Section */}
      {currentUser?.userType === "organization" && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Post Volunteer Opportunities</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Attract the best volunteers by posting detailed opportunities. Your data powers AI Matching and Impact Tracking.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-1 md:gap-4">
                <Link href="/post-core-opportunity">
                  <div className="p-1.5 md:p-4 border-2 border-primary/20 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer" data-testid="link-post-core-opportunity">
                    <div className="flex items-start gap-1.5 md:gap-3">
                      <div className="p-1 md:p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <Briefcase className="h-3.5 md:h-5 w-3.5 md:w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5 text-xs md:text-base">Core Opportunity</h3>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 md:line-clamp-none">
                          For skilled roles
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/post-urgent-opportunity">
                  <div className="p-1.5 md:p-4 border-2 border-amber-500/20 rounded-lg hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer" data-testid="link-post-urgent-opportunity">
                    <div className="flex items-start gap-1.5 md:gap-3">
                      <div className="p-1 md:p-2 bg-amber-500/10 rounded-lg flex-shrink-0">
                        <AlertCircle className="h-3.5 md:h-5 w-3.5 md:w-5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5 text-xs md:text-base">Urgent Need</h3>
                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 md:line-clamp-none">
                          Time-sensitive events
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Data Sync Panel - org users only */}
      {currentUser?.userType === "organization" && kpiStatus && (
        <div className="mb-6">
          <Card className={kpiStatus.missingKpiCount > 0 ? "border-amber-300 bg-amber-50/40" : "border-emerald-300 bg-emerald-50/30"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {kpiStatus.missingKpiCount > 0 ? (
                    <XCircle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <CardTitle className="text-base">
                    {kpiStatus.missingKpiCount > 0
                      ? `${kpiStatus.missingKpiCount} project${kpiStatus.missingKpiCount !== 1 ? 's' : ''} missing KPI settings`
                      : "All project KPIs are up to date"}
                  </CardTitle>
                </div>
                <button
                  onClick={() => syncKpisMutation.mutate()}
                  disabled={syncKpisMutation.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <RefreshCw className={`h-4 w-4 ${syncKpisMutation.isPending ? 'animate-spin' : ''}`} />
                  {syncKpisMutation.isPending ? "Syncing..." : "Sync KPIs"}
                </button>
              </div>
              {kpiStatus.lastSync && (
                <p className="text-xs text-gray-500 mt-1">
                  Last synced: {new Date(kpiStatus.lastSync).toLocaleString()}
                </p>
              )}
            </CardHeader>
            {(kpiStatus.missingKpiCount > 0 || syncMessage) && (
              <CardContent className="pt-0">
                {syncMessage && (
                  <div className={`mb-3 px-3 py-2 rounded-lg text-sm font-medium ${syncMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {syncMessage.text}
                  </div>
                )}
                {kpiStatus.missingKpiCount > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">
                      Projects below have an impact metric defined but no KPI baseline set. Click <strong>Sync KPIs</strong> to auto-create settings, or edit each project to set custom values.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {kpiStatus.projects.filter(p => !p.hasKpiSettings && p.impactMetricName).map(p => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-white border border-amber-200 rounded-lg">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-amber-700">{p.impactMetricName} · {p.impactMetricUnit || 'units'}</p>
                          </div>
                          <Link href={`/projects/${p.id}/edit`}>
                            <button className="ml-2 text-xs text-indigo-600 hover:underline whitespace-nowrap">Set KPI</button>
                          </Link>
                        </div>
                      ))}
                      {kpiStatus.projects.filter(p => !p.hasKpiSettings && !p.impactMetricName).map(p => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg opacity-70">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">No impact metric defined</p>
                          </div>
                          <Link href={`/projects/${p.id}/edit`}>
                            <button className="ml-2 text-xs text-indigo-600 hover:underline whitespace-nowrap">Add KPI</button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Posted Opportunities Section */}
      {currentUser?.userType === "organization" && opportunities.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Posted Opportunities ({opportunities.length})</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your active volunteer opportunities. Core opportunities and urgent needs posted for matching.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`p-2 rounded-lg ${opp.isUrgent ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                          {opp.isUrgent ? (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Briefcase className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{opp.title}</h3>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className={opp.isUrgent ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}>
                              {opp.isUrgent ? 'Urgent Need' : 'Core Opportunity'}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {opp.status}
                            </Badge>
                            {opp.isRemote && <Badge variant="secondary">Remote</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/opportunities/${opp.id}`}>
                          <Button size="sm" variant="outline" data-testid={`button-view-opportunity-${opp.id}`}>View</Button>
                        </Link>
                        {canManageProjects && (
                          <>
                            <EditOpportunityDialog opportunity={opp} />
                            <DeleteOpportunityDialog opportunity={opp} />
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 ml-10">
                      {opp.description}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 ml-10 text-xs text-gray-500">
                      {opp.location && <span>📍 {opp.location}</span>}
                      {opp.volunteersNeeded && <span>👥 {opp.volunteersNeeded} needed</span>}
                      {opp.eventDate && <span>📅 {new Date(opp.eventDate).toLocaleDateString()}</span>}
                      {opp.projectId && getProjectName(opp.projectId) && (
                        <span className="font-medium text-primary">🔗 {getProjectName(opp.projectId)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {filteredProjects.map((project) => {
          const projectData = projectMetrics.get(project.id);
          if (!projectData) return null;

          const { tasks, progress, metrics } = projectData;
          const isExpanded = expandedProjects.has(project.id);

          return (
            <ProjectListCard
              key={project.id}
              project={project}
              tasks={tasks}
              metrics={metrics}
              progress={progress}
              isExpanded={isExpanded}
              onToggle={() => toggleProject(project.id)}
              canManageProjects={canManageProjects}
            />
          );
        })}
      </div>

      {filteredProjects.length === 0 && canManageProjects && currentUser?.organizationId && (
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-4">No projects found</p>
          <CreateProjectDialog organizationId={currentUser.organizationId} />
        </Card>
      )}
      </div>

      {/* Mobile Bottom Navigation for Volunteers */}
      {isVolunteer && isPWAMode && <VolunteerPWANav activeTab="projects" />}

      {/* Footer - Hidden on mobile */}
      {!isPWAMode && <Footer />}
    </div>
  );
}
