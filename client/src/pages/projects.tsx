import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Users, CheckSquare, Clock, TrendingUp, ChevronDown, ChevronRight, Plus, Briefcase, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CreateProjectDialog, EditProjectDialog, DeleteProjectDialog } from "@/components/projects/project-dialogs";
import { CreateTaskDialog, EditTaskDialog, DeleteTaskDialog } from "@/components/projects/task-dialogs";
import { EditOpportunityDialog, DeleteOpportunityDialog } from "@/components/opportunities/opportunity-dialogs";
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

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getProjectTasks = (projectId: number) => {
    return allTasks.filter(task => task.projectId === projectId);
  };

  const getProjectAssignments = (projectId: number) => {
    return allAssignments.filter(assignment => assignment.projectId === projectId);
  };

  const getTaskAssignment = (taskId: number) => {
    return allTasks.find(task => task.id === taskId)?.assigneeId;
  };

  const calculateProjectProgress = (projectId: number) => {
    const projectTasks = getProjectTasks(projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  const calculateAssignmentMetrics = (projectId: number) => {
    const assignments = getProjectAssignments(projectId);
    const totalCommitted = assignments.reduce((sum, a) => sum + (a.hoursCommitted || 0), 0);
    const totalCompleted = assignments.reduce((sum, a) => sum + (a.hoursCompleted || 0), 0);
    return { totalCommitted, totalCompleted, volunteers: assignments.length };
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "in progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in progress":
        return "bg-blue-100 text-blue-800";
      case "todo":
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProjectName = (projectId: number | null | undefined) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name || null;
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  return (
    <>
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
        {currentUser?.organizationId && (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/post-core-opportunity">
                  <div className="p-4 border-2 border-primary/20 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer" data-testid="link-post-core-opportunity">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Core Opportunity</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          For skilled, ongoing, or project-based roles. Detailed posts for best skill & purpose matching.
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/post-urgent-opportunity">
                  <div className="p-4 border-2 border-amber-500/20 rounded-lg hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer" data-testid="link-post-urgent-opportunity">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Urgent Need / Event</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          For time-sensitive events like fundraisers, community drives, or disaster response.
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
                        <EditOpportunityDialog opportunity={opp} />
                        <DeleteOpportunityDialog opportunity={opp} />
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
          const tasks = getProjectTasks(project.id);
          const metrics = calculateAssignmentMetrics(project.id);
          const progress = calculateProjectProgress(project.id);
          const isExpanded = expandedProjects.has(project.id);

          return (
            <Card key={project.id}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleProject(project.id)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CardTitle className="text-xl">{project.name}</CardTitle>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-600 ml-11">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <EditProjectDialog project={project} />
                      <DeleteProjectDialog project={project} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 ml-11">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {metrics.volunteers} volunteer{metrics.volunteers !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{tasks.length} tasks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {metrics.totalCompleted}/{metrics.totalCommitted} hrs
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{progress}% complete</span>
                    </div>
                  </div>

                  <div className="mt-3 ml-11">
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Tasks</h3>
                        <CreateTaskDialog projectId={project.id} />
                      </div>

                      {tasks.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No tasks yet. Click "Add Task" to create one.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{task.title}</h4>
                                  <Badge className={getTaskStatusColor(task.status)} variant="outline">
                                    {task.status}
                                  </Badge>
                                </div>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                )}
                                {task.assigneeId && (
                                  <span className="text-xs text-gray-500 mt-1 block">
                                    Assigned to volunteer #{task.assigneeId}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <EditTaskDialog task={task} />
                                <DeleteTaskDialog task={task} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {filteredProjects.length === 0 && currentUser?.organizationId && (
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-4">No projects found</p>
          <CreateProjectDialog organizationId={currentUser.organizationId} />
        </Card>
      )}
    </>
  );
}
