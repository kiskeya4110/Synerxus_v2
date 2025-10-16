import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Clock, FolderKanban, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Task, Project, ProjectAssignment, User } from "@shared/schema";

interface TaskWithProject extends Task {
  project?: Project;
}

export default function MyTasks() {
  const [activeTab, setActiveTab] = useState("tasks");

  // Fetch current user to get their ID
  // TODO: /api/users/me currently returns hardcoded user. Implement proper session management.
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me"]
  });

  const volunteerId = currentUser?.id;

  // Fetch volunteer's task assignments
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { assigneeId: volunteerId }],
    queryFn: async () => {
      const response = await fetch("/api/tasks");
      const allTasks = await response.json();
      return allTasks.filter((task: Task) => task.assigneeId === volunteerId);
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's project assignments
  const { data: projectAssignments = [], isLoading: assignmentsLoading } = useQuery<ProjectAssignment[]>({
    queryKey: ["/api/project-assignments", { volunteerId }],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch all projects to get details
  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });

  const getProject = (projectId: number) => {
    return allProjects.find(p => p.id === projectId);
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

  const getAssignmentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const tasksByStatus = {
    todo: tasks.filter(t => t.status?.toLowerCase() === "todo" || t.status?.toLowerCase() === "pending"),
    inProgress: tasks.filter(t => t.status?.toLowerCase() === "in progress"),
    completed: tasks.filter(t => t.status?.toLowerCase() === "completed")
  };

  const totalHoursCommitted = projectAssignments.reduce((sum, a) => sum + (a.hoursCommitted || 0), 0);
  const totalHoursCompleted = projectAssignments.reduce((sum, a) => sum + (a.hoursCompleted || 0), 0);
  const progressPercentage = totalHoursCommitted > 0 
    ? Math.round((totalHoursCompleted / totalHoursCommitted) * 100)
    : 0;

  if (tasksLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading your tasks...</div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">My Tasks</h1>
        <p className="text-gray-600">Track your volunteer assignments and progress</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{tasksByStatus.inProgress.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{projectAssignments.filter(a => a.status === 'active').length}</p>
              </div>
              <FolderKanban className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hours Progress</p>
                <p className="text-2xl font-bold">{totalHoursCompleted}/{totalHoursCommitted}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {/* To Do Tasks */}
          <div>
            <h3 className="font-semibold mb-3">To Do ({tasksByStatus.todo.length})</h3>
            <div className="space-y-3">
              {tasksByStatus.todo.map((task) => {
                const project = getProject(task.projectId!);
                return (
                  <Card key={task.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}
                          {project && (
                            <p className="text-sm text-gray-500">
                              <FolderKanban className="inline h-3 w-3 mr-1" />
                              {project.name}
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" data-testid={`button-start-task-${task.id}`}>
                          Start Task
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {tasksByStatus.todo.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No pending tasks</p>
              )}
            </div>
          </div>

          {/* In Progress Tasks */}
          <div>
            <h3 className="font-semibold mb-3">In Progress ({tasksByStatus.inProgress.length})</h3>
            <div className="space-y-3">
              {tasksByStatus.inProgress.map((task) => {
                const project = getProject(task.projectId!);
                return (
                  <Card key={task.id} className="border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}
                          {project && (
                            <p className="text-sm text-gray-500">
                              <FolderKanban className="inline h-3 w-3 mr-1" />
                              {project.name}
                            </p>
                          )}
                        </div>
                        <Button size="sm" data-testid={`button-complete-task-${task.id}`}>
                          Mark Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {tasksByStatus.inProgress.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No tasks in progress</p>
              )}
            </div>
          </div>

          {/* Completed Tasks */}
          <div>
            <h3 className="font-semibold mb-3">Completed ({tasksByStatus.completed.length})</h3>
            <div className="space-y-3">
              {tasksByStatus.completed.slice(0, 5).map((task) => {
                const project = getProject(task.projectId!);
                return (
                  <Card key={task.id} className="opacity-75">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium line-through">{task.title}</h4>
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          {project && (
                            <p className="text-sm text-gray-500">
                              <FolderKanban className="inline h-3 w-3 mr-1" />
                              {project.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {tasksByStatus.completed.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No completed tasks yet</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {projectAssignments.map((assignment) => {
            const project = getProject(assignment.projectId);
            const projectTasks = tasks.filter(t => t.projectId === assignment.projectId);
            const completedTasks = projectTasks.filter(t => t.status?.toLowerCase() === "completed").length;
            const taskProgress = projectTasks.length > 0
              ? Math.round((completedTasks / projectTasks.length) * 100)
              : 0;

            if (!project) return null;

            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{project.name}</CardTitle>
                        <Badge className={getAssignmentStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                      {assignment.role && (
                        <p className="text-sm text-gray-600">Role: {assignment.role}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Tasks</p>
                        <p className="font-semibold">{completedTasks}/{projectTasks.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Hours</p>
                        <p className="font-semibold">
                          {assignment.hoursCompleted || 0}/{assignment.hoursCommitted || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Progress</p>
                        <p className="font-semibold">{taskProgress}%</p>
                      </div>
                    </div>
                    <div>
                      <Progress value={taskProgress} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {projectAssignments.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-gray-500">You're not assigned to any projects yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Browse opportunities to find projects to join
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
