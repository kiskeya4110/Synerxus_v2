import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users, CheckSquare, Clock, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Project, Task, ProjectAssignment } from "@shared/schema";

interface ProjectWithDetails extends Project {
  tasks?: Task[];
  assignments?: ProjectAssignment[];
}

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  // Fetch projects for organization (hardcoded org ID for now)
  const { data: projects = [], isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ["/api/projects"],
    select: (data: Project[]) => data as ProjectWithDetails[]
  });

  // Fetch all tasks
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  // Fetch all assignments
  const { data: allAssignments = [] } = useQuery<ProjectAssignment[]>({
    queryKey: ["/api/project-assignments"]
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
        <Button className="min-h-[44px]" data-testid="button-add-project">
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </Button>
      </div>

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
                        <Button size="sm" variant="outline" data-testid={`button-add-task-${project.id}`}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Task
                        </Button>
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
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                {task.assigneeId ? (
                                  <span className="text-sm text-gray-600">
                                    Assigned to volunteer #{task.assigneeId}
                                  </span>
                                ) : (
                                  <Button size="sm" variant="outline">
                                    Assign
                                  </Button>
                                )}
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

      {filteredProjects.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No projects found</p>
          <Button className="mt-4" data-testid="button-create-first-project">
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Project
          </Button>
        </Card>
      )}
    </>
  );
}
