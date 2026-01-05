import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, Plus, Briefcase, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/projects/project-dialogs";
import { EditOpportunityDialog, DeleteOpportunityDialog } from "@/components/opportunities/opportunity-dialogs";
import { ProjectListCard } from "@/components/projects/project-list-card";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationWelcomeBanner from "@/components/layout/organization-welcome-banner";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import VolunteerNav from "@/components/layout/volunteer-nav";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import PWAHeader from "@/components/pwa/pwa-header";
import Footer from "@/components/layout/footer";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import { CSRLayout } from "@/components/layout/csr-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Project, Task, ProjectAssignment, User, Opportunity } from "@shared/schema";

interface ProjectWithDetails extends Project {
  tasks?: Task[];
  assignments?: ProjectAssignment[];
}

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [autoOpenCreate, setAutoOpenCreate] = useState(false);
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const userType = localStorage.getItem('userType');
  const isVolunteer = userType === 'volunteer';
  const isCSR = userType === 'corporate-partner' || userType === 'corporate_partner' || userType === 'csr';

  // Check for ?create=true query parameter to auto-open create dialog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setAutoOpenCreate(true);
      // Clean up the URL by removing the query parameter
      setLocation('/projects', { replace: true });
    }
  }, [setLocation]);

  // Fetch current user to get organization ID
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser, isLoading: isUserLoading, isError: isUserError } = useQuery<User>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) throw new Error("No user ID found");
      const response = await fetch(`/api/users/me?userId=${id}`);
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
      const response = await fetch(`/api/projects?userId=${id}`);
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
      const response = await fetch(`/api/tasks?userId=${id}`);
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
      // For organizations, fetch activities for their projects
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) return [];
      // Fetch activities for each project
      const allActivities: VolunteerActivity[] = [];
      for (const projectId of projectIds) {
        const response = await fetch(`/api/volunteer-activities?projectId=${projectId}`);
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
      const response = await fetch(`/api/opportunities?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser && !!userId
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
      const totalCompleted = assignments.reduce((sum, a) => sum + (a.hoursCompleted || 0), 0);

      // Calculate unique volunteers from assignments and activities
      const uniqueVolunteerIds = new Set([
        ...assignments.map(a => a.volunteerId),
        ...projectActivities.map(a => a.userId)
      ]);
      const volunteerCount = uniqueVolunteerIds.size;

      // Calculate engagement score (0-100)
      const volunteerScore = Math.min((volunteerCount / 10) * 25, 25);
      const taskCompletionRate = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
      const taskScore = taskCompletionRate * 0.30;
      const hoursScore = totalCommitted > 0
        ? Math.min((totalCompleted / totalCommitted) * 25, 25)
        : 0;

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
    projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [projects, searchTerm]
  );

  // Volunteers can only view projects, not edit them
  const canManageProjects = currentUser?.userType === 'organization';
  // Use localStorage userType as fallback when currentUser hasn't loaded yet
  const isOrganization = currentUser?.userType === 'organization' || userType === 'organization';

  // Handle user loading or error state
  if (isUserLoading || (!currentUser && !isUserError)) {
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
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Handle user error or no user
  if (isUserError || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load user data</p>
          <p className="text-gray-500 text-sm">Please try refreshing the page or logging in again.</p>
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

  // Mobile organization PWA view
  if (isOrganization && isMobile) {
    return (
      <OrganizationPWALayout activeTab="projects">
        {/* Hero Banner */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 rounded-2xl p-4 text-slate-800 shadow-lg relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-400/30" />
              <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-purple-400/20" />
            </div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/40 backdrop-blur rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-indigo-700" />
                </div>
                <div>
                  <p className="text-indigo-700 text-[11px] font-medium uppercase tracking-wide mb-0.5">Project Management</p>
                  <h2 className="text-xl font-bold text-slate-800">Projects</h2>
                </div>
              </div>
              {canManageProjects && currentUser?.organizationId && (
                <CreateProjectDialog
                  organizationId={currentUser.organizationId}
                  defaultOpen={autoOpenCreate}
                  onOpenChange={(open) => !open && setAutoOpenCreate(false)}
                />
              )}
            </div>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white/40 backdrop-blur rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-slate-800">{projects.length}</p>
                <p className="text-[9px] text-indigo-700 font-medium">Projects</p>
              </div>
              <div className="bg-white/40 backdrop-blur rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-slate-800">{projects.filter(p => p.status === 'active').length}</p>
                <p className="text-[9px] text-indigo-700 font-medium">Active</p>
              </div>
              <div className="bg-white/40 backdrop-blur rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-slate-800">{allTasks.length}</p>
                <p className="text-[9px] text-indigo-700 font-medium">Tasks</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 text-sm bg-white border-slate-200 rounded-xl shadow-sm"
            />
          </div>

          {/* Post Opportunities - Mobile */}
          {currentUser?.userType === "organization" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-500" />
                  Post Opportunities
                </h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/post-core-opportunity">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">Core</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Skilled roles</p>
                    </div>
                  </Link>
                  <Link href="/post-urgent-opportunity">
                    <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">Urgent</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Time-sensitive</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Projects List Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Your Projects ({filteredProjects.length})
            </h3>
          </div>

          {/* Projects List - Mobile */}
          <div className="space-y-3">
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
                  isPWA={true}
                />
              );
            })}
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No projects yet</h3>
              <p className="text-sm text-slate-500 mb-4">
                {searchTerm ? "No projects match your search" : "Create your first project to get started"}
              </p>
              {!searchTerm && canManageProjects && currentUser?.organizationId && (
                <CreateProjectDialog
                  organizationId={currentUser.organizationId}
                  defaultOpen={autoOpenCreate}
                  onOpenChange={(open) => !open && setAutoOpenCreate(false)}
                />
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
      {isVolunteer && isMobile && <PWAHeader />}

      {/* Volunteer Desktop Navigation - only for volunteers */}
      {isVolunteer && !isMobile && <VolunteerNav />}

      {isOrganization && <OrganizationHeader activeTab="projects" />}
      {isOrganization && <OrganizationWelcomeBanner pageTitle="Projects & Tasks" />}
      <div className={`h-screen overflow-y-auto ${isVolunteer && isMobile ? 'pt-20 pb-24' : 'pb-24'}`} style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
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
          <CreateProjectDialog
            organizationId={currentUser.organizationId}
            defaultOpen={autoOpenCreate}
            onOpenChange={(open) => !open && setAutoOpenCreate(false)}
          />
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
          <CreateProjectDialog
            organizationId={currentUser.organizationId}
            defaultOpen={autoOpenCreate}
            onOpenChange={(open) => !open && setAutoOpenCreate(false)}
          />
        </Card>
      )}
      </div>

      {/* Mobile Bottom Navigation for Volunteers */}
      {isVolunteer && isMobile && <VolunteerPWANav activeTab="projects" />}

      {/* Mobile Bottom Navigation for Organizations */}
      {isOrganization && <MobileBottomNav />}

      {/* Footer - Hidden on mobile */}
      {!isMobile && <Footer />}
    </div>
  );
}
