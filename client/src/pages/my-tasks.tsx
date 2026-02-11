import { useState } from "react";
import { formatDecimal } from "@/lib/format-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckSquare, Clock, FolderKanban, Calendar, TrendingUp, Building2, Plus, Edit2, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, Project, ProjectAssignment, User, Organization } from "@shared/schema";

interface TaskWithProject extends Task {
  project?: Project;
}

interface MyTasksProps {
  embedded?: boolean;
  // Allow any additional props from router
  [key: string]: any;
}

export default function MyTasks({ embedded = false, ...rest }: MyTasksProps) {
  const [activeTab, setActiveTab] = useState("tasks");
  const [taskHours, setTaskHours] = useState<{ [key: number]: string }>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    estimatedHours: "",
    assigneeId: ""
  });
  const { toast } = useToast();

  // Fetch current user to get their ID
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    }
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

  // Fetch volunteer's project assignments (now includes project data)
  const { data: projectAssignmentsRaw = [], isLoading: assignmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", { volunteerId }],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${volunteerId}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!volunteerId
  });
  // Ensure projectAssignments is always an array
  const projectAssignments = Array.isArray(projectAssignmentsRaw) ? projectAssignmentsRaw : [];

  // Fetch volunteer's activities for real-time hours tracking
  const { data: volunteerActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities", { userId: volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch all projects to get details (fallback for enrichment)
  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", { organizationId: currentUser?.organizationId, userId: currentUser?.id }],
    queryFn: async () => {
      // Projects endpoint requires userId or organizationId filter
      if (currentUser?.userType === 'organization' && currentUser?.organizationId) {
        const response = await fetch(`/api/projects?organizationId=${currentUser.organizationId}`);
        return response.ok ? response.json() : [];
      } else if (currentUser?.id) {
        const response = await fetch(`/api/projects?userId=${currentUser.id}`);
        return response.ok ? response.json() : [];
      }
      return [];
    },
    enabled: !!currentUser
  });

  // Fetch all organizations to enrich project data
  const { data: allOrganizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"]
  });

  // Fetch all users for task assignment (for org managers)
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      return response.ok ? response.json() : [];
    }
  });

  // Fetch organization volunteers if user is org manager
  const { data: orgVolunteers = [] } = useQuery<User[]>({
    queryKey: ["/api/organizations", currentUser?.organizationId, "volunteers"],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(`/api/organizations/${currentUser.organizationId}/volunteers?userId=${userId}`);
      return response.ok ? response.json() : [];
    },
    enabled: !!currentUser?.organizationId && currentUser?.userType === "organization"
  });

  const getProject = (projectId: number) => {
    return allProjects.find(p => p.id === projectId);
  };

  const getOrganization = (organizationId: number) => {
    return allOrganizations.find(org => org.id === organizationId);
  };

  // Mutation to update task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const userId = localStorage.getItem('currentUserId');
      const url = userId ? `/api/tasks/${taskId}?userId=${userId}` : `/api/tasks/${taskId}`;
      const response = await apiRequest("PATCH", url, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary", userId] });
      toast({
        title: "Task updated",
        description: "Task status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartTask = (taskId: number) => {
    updateTaskMutation.mutate({ taskId, status: "in progress" });
  };

  const handleCompleteTask = (taskId: number) => {
    updateTaskMutation.mutate({ taskId, status: "completed" });
  };

  // Mutation to log hours for a task
  const logHoursMutation = useMutation({
    mutationFn: async ({ taskId, projectId, hours }: { taskId: number; projectId: number; hours: number }) => {
      return await apiRequest("POST", "/api/volunteer-activities", {
        userId: volunteerId,
        projectId,
        taskId,
        hours,
        date: new Date().toISOString(),
        description: `Logged ${hours} hour(s) for task`
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Hours logged",
        description: `Successfully logged ${variables.hours} hour(s)`,
      });
      setTaskHours(prev => ({ ...prev, [variables.taskId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update task details
  const updateTaskDetailsMutation = useMutation({
    mutationFn: async (data: any) => {
      const userId = localStorage.getItem('currentUserId');
      const url = userId ? `/api/tasks/${editingTask?.id}?userId=${userId}` : `/api/tasks/${editingTask?.id}`;
      return await apiRequest("PATCH", url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Task details have been updated successfully.",
      });
      setEditingTask(null);
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const userId = localStorage.getItem('currentUserId');
      const url = userId ? `/api/tasks/${taskId}?userId=${userId}` : `/api/tasks/${taskId}`;
      return await apiRequest("DELETE", url, {});
    },
    onSuccess: () => {
      // Use predicate-based invalidation to match all related queries
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).includes('/api/tasks') ||
        String(query.queryKey[0]).includes('/api/projects') ||
        String(query.queryKey[0]).includes('/api/dashboard') ||
        String(query.queryKey[0]).includes('/api/project-assignments')
      });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      estimatedHours: task.estimatedHours?.toString() || "",
      assigneeId: task.assigneeId?.toString() || ""
    });
    setEditDialogOpen(true);
  };

  const handleSaveTask = () => {
    const updateData: any = {
      title: editFormData.title,
      description: editFormData.description,
      priority: editFormData.priority,
      estimatedHours: editFormData.estimatedHours ? parseInt(editFormData.estimatedHours) : null,
    };
    
    if (editFormData.dueDate) {
      updateData.dueDate = new Date(editFormData.dueDate);
    }
    
    if (currentUser?.userType === "organization" && editFormData.assigneeId) {
      updateData.assigneeId = parseInt(editFormData.assigneeId);
    }

    updateTaskDetailsMutation.mutate(updateData);
  };

  const tasksByStatus = {
    todo: tasks.filter(t => t.status?.toLowerCase() === "todo" || t.status?.toLowerCase() === "pending"),
    inProgress: tasks.filter(t => t.status?.toLowerCase() === "in progress"),
    completed: tasks.filter(t => t.status?.toLowerCase() === "completed")
  };

  // Calculate real hours from volunteer activities
  const totalHoursLogged = Array.isArray(volunteerActivities) ? volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0) : 0;
  const totalHoursCommitted = Array.isArray(projectAssignments) ? projectAssignments.reduce((sum, a) => sum + (a.hoursCommitted || 0), 0) : 0;
  const progressPercentage = totalHoursCommitted > 0 
    ? Math.round((totalHoursLogged / totalHoursCommitted) * 100)
    : 0;

  // Calculate task completion percentage
  const completedTaskCount = tasksByStatus.completed.length;
  const totalTaskCount = tasks.length;
  const taskCompletionPercentage = totalTaskCount > 0 
    ? Math.round((completedTaskCount / totalTaskCount) * 100)
    : 0;

  if (tasksLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading your tasks...</div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "px-4 sm:px-6 py-6"}>
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">My Tasks</h1>
          <p className="text-gray-600">Track your volunteer assignments and progress</p>
        </div>
      )}

      {/* Summary Cards with Live KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
                <p className="text-xs text-gray-500 mt-1">{taskCompletionPercentage}% completed</p>
              </div>
              <CheckSquare className="h-8 w-8 text-gray-400" />
            </div>
            <Progress value={taskCompletionPercentage} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{tasksByStatus.inProgress.length}</p>
                <p className="text-xs text-gray-500 mt-1">{tasksByStatus.todo.length} pending</p>
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
                <p className="text-xs text-gray-500 mt-1">{projectAssignments.length} total assigned</p>
              </div>
              <FolderKanban className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hours Logged</p>
                <p className="text-2xl font-bold">{formatDecimal(totalHoursLogged)}/{totalHoursCommitted}</p>
                <p className="text-xs text-gray-500 mt-1">{progressPercentage}% of target</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={Math.min(progressPercentage, 100)} className="mt-3 h-1" />
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
                const organization = project && project.organizationId ? getOrganization(project.organizationId) : null;
                return (
                  <Card key={task.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <StatusBadge status={task.status} />
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}
                          {project && (
                            <div className="flex flex-col gap-1">
                              <p className="text-sm text-gray-500">
                                <FolderKanban className="inline h-3 w-3 mr-1" />
                                {project.name}
                              </p>
                              {organization && (
                                <p className="text-sm text-gray-400">
                                  <Building2 className="inline h-3 w-3 mr-1" />
                                  {organization.name}
                                </p>
                              )}
                            </div>
                          )}
                          {task.priority && (
                            <Badge variant="outline" className="text-xs">
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </Badge>
                          )}
                          {task.dueDate && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEditTask(task)}
                          data-testid={`button-edit-task-${task.id}`}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStartTask(task.id)}
                          disabled={updateTaskMutation.isPending}
                          data-testid={`button-start-task-${task.id}`}
                        >
                          {updateTaskMutation.isPending ? "Updating..." : "Start Task"}
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
                const organization = project && project.organizationId ? getOrganization(project.organizationId) : null;
                return (
                  <Card key={task.id} className="border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <StatusBadge status={task.status} />
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}
                          {project && (
                            <div className="flex flex-col gap-1 mb-3">
                              <p className="text-sm text-gray-500">
                                <FolderKanban className="inline h-3 w-3 mr-1" />
                                {project.name}
                              </p>
                              {organization && (
                                <p className="text-sm text-gray-400">
                                  <Building2 className="inline h-3 w-3 mr-1" />
                                  {organization.name}
                                </p>
                              )}
                            </div>
                          )}
                          {/* Hours Input Section */}
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="Hours"
                              value={taskHours[task.id] || ""}
                              onChange={(e) => setTaskHours(prev => ({ ...prev, [task.id]: e.target.value }))}
                              className="w-20 h-8"
                              data-testid={`input-hours-task-${task.id}`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const hours = parseFloat(taskHours[task.id]);
                                if (!isNaN(hours) && hours > 0) {
                                  logHoursMutation.mutate({ taskId: task.id, projectId: task.projectId!, hours });
                                } else {
                                  toast({
                                    title: "Invalid input",
                                    description: "Please enter a valid number of hours",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              disabled={logHoursMutation.isPending}
                              data-testid={`button-log-hours-${task.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          {task.priority && (
                            <Badge variant="outline" className="text-xs">
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </Badge>
                          )}
                          {task.dueDate && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEditTask(task)}
                          data-testid={`button-edit-task-${task.id}`}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={updateTaskMutation.isPending}
                          data-testid={`button-complete-task-${task.id}`}
                        >
                          {updateTaskMutation.isPending ? "Updating..." : "Mark Complete"}
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
                const organization = project && project.organizationId ? getOrganization(project.organizationId) : null;
                return (
                  <Card key={task.id} className="opacity-75">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium line-through">{task.title}</h4>
                            <StatusBadge status={task.status} />
                          </div>
                          {project && (
                            <div className="flex flex-col gap-1">
                              <p className="text-sm text-gray-500">
                                <FolderKanban className="inline h-3 w-3 mr-1" />
                                {project.name}
                              </p>
                              {organization && (
                                <p className="text-sm text-gray-400">
                                  <Building2 className="inline h-3 w-3 mr-1" />
                                  {organization.name}
                                </p>
                              )}
                            </div>
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
            const organization = project && project.organizationId ? getOrganization(project.organizationId) : null;
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
                        <StatusBadge status={assignment.status} />
                      </div>
                      {organization && (
                        <p className="text-sm text-gray-500 mb-1">
                          <Building2 className="inline h-3 w-3 mr-1" />
                          {organization.name}
                        </p>
                      )}
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

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                placeholder="Task title"
                data-testid="input-task-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editFormData.description}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                placeholder="Task description"
                data-testid="input-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={editFormData.priority}
                  onChange={(e) => setEditFormData({...editFormData, priority: e.target.value})}
                  className="w-full px-2 py-1 border rounded text-sm"
                  data-testid="select-priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Estimated Hours</label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editFormData.estimatedHours}
                  onChange={(e) => setEditFormData({...editFormData, estimatedHours: e.target.value})}
                  placeholder="Hours"
                  data-testid="input-estimated-hours"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={editFormData.dueDate}
                onChange={(e) => setEditFormData({...editFormData, dueDate: e.target.value})}
                data-testid="input-due-date"
              />
            </div>
            {currentUser?.userType === "organization" && (
              <div>
                <label className="text-sm font-medium">Assign to Volunteer</label>
                <select
                  value={editFormData.assigneeId}
                  onChange={(e) => setEditFormData({...editFormData, assigneeId: e.target.value})}
                  className="w-full px-2 py-1 border rounded text-sm"
                  data-testid="select-assignee"
                >
                  <option value="">Unassigned</option>
                  {orgVolunteers.map((vol) => (
                    <option key={vol.id} value={vol.id}>
                      {vol.displayName || vol.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (editingTask?.id) {
                    deleteTaskMutation.mutate(editingTask.id);
                    setEditDialogOpen(false);
                  }
                }}
                disabled={deleteTaskMutation.isPending || !editingTask?.id}
                data-testid="button-delete-task"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button
                onClick={handleSaveTask}
                disabled={updateTaskDetailsMutation.isPending}
                data-testid="button-save-task"
              >
                {updateTaskDetailsMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
