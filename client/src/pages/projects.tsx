import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Plus, Briefcase, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/projects/project-dialogs";
import { EditOpportunityDialog, DeleteOpportunityDialog } from "@/components/opportunities/opportunity-dialogs";
import { ProjectListCard } from "@/components/projects/project-list-card";
import OrganizationHeader from "@/components/layout/organization-header";
import Footer from "@/components/layout/footer";
import type { Project, Task, ProjectAssignment, User, Opportunity } from "@shared/schema";

interface ProjectWithDetails extends Project {
  tasks?: Task[];
  assignments?: ProjectAssignment[];
}

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  // Fetch current user to get organization ID
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery<User>({
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

  // Fetch all tasks
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  // Fetch all assignments
  const { data: allAssignments = [] } = useQuery<ProjectAssignment[]>({
    queryKey: ["/api/project-assignments"]
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
      };
    }>();
    
    projects.forEach(project => {
      const projectTasks = allTasks.filter(task => task.projectId === project.id);
      const assignments = allAssignments.filter(assignment => assignment.projectId === project.id);
      
      const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
      const progress = projectTasks.length === 0 ? 0 : Math.round((completedTasks / projectTasks.length) * 100);
      
      const totalCommitted = assignments.reduce((sum, a) => sum + (a.hoursCommitted || 0), 0);
      const totalCompleted = assignments.reduce((sum, a) => sum + (a.hoursCompleted || 0), 0);
      
      metricsMap.set(project.id, {
        tasks: projectTasks,
        progress,
        metrics: {
          totalCommitted,
          totalCompleted,
          volunteers: assignments.length
        }
      });
    });
    
    return metricsMap;
  }, [projects, allTasks, allAssignments]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  // Volunteers can only view projects, not edit them
  const canManageProjects = currentUser?.userType === 'organization';
  const isOrganization = currentUser?.userType === 'organization';

  return (
    <>
      {isOrganization && <OrganizationHeader activeTab="projects" />}
      <div className={isOrganization ? "max-h-screen overflow-y-auto max-w-[1400px] mx-auto p-6" : "max-h-screen overflow-y-auto"}>
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
      
      {/* Footer */}
      <Footer />
    </>
  );
}
