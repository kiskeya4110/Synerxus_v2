import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Briefcase, ListTodo, FolderKanban, CheckSquare, TrendingUp, Clock } from "lucide-react";
import type { User, Task, ProjectAssignment } from "@shared/schema";
import MyApplicationsPage from "./my-applications";
import AssignmentsPage from "./assignments";
import MyTasksPage from "./my-tasks";

export default function MyWork() {
  const [, setLocation] = useLocation();
  
  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    }
  });

  const volunteerId = currentUser?.id;

  // Fetch volunteer's tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { volunteerId }],
    queryFn: async () => {
      const response = await fetch("/api/tasks");
      const allTasks = await response.json();
      return allTasks.filter((task: Task) => task.assigneeId === volunteerId);
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's project assignments
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", { volunteerId }],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's activities for real-time hours tracking
  const { data: volunteerActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities", { volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Calculate KPIs
  const tasksByStatus = {
    todo: tasks.filter(t => t.status?.toLowerCase() === "todo" || t.status?.toLowerCase() === "pending"),
    inProgress: tasks.filter(t => t.status?.toLowerCase() === "in progress"),
    completed: tasks.filter(t => t.status?.toLowerCase() === "completed")
  };

  const totalHoursLogged = volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const totalHoursCommitted = projectAssignments.reduce((sum, a) => sum + (a.hoursCommitted || 0), 0);
  const hoursProgressPercentage = totalHoursCommitted > 0 
    ? Math.round((totalHoursLogged / totalHoursCommitted) * 100)
    : 0;

  const completedTaskCount = tasksByStatus.completed.length;
  const totalTaskCount = tasks.length;
  const taskCompletionPercentage = totalTaskCount > 0 
    ? Math.round((completedTaskCount / totalTaskCount) * 100)
    : 0;

  const activeProjectCount = projectAssignments.filter(a => a.status === 'active').length;
  
  // Get initial tab from URL hash or default to applications
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'applications' || hash === 'assignments' || hash === 'tasks') {
        return hash;
      }
    }
    return 'applications';
  };

  const handleTabChange = (value: string) => {
    window.history.replaceState(null, '', `#${value}`);
  };

  return (
    <div className="min-h-screen">
      <div className="p-6 pb-4">
        <h1 className="text-3xl font-bold">My Work</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your applications, assignments, and tasks in one place
        </p>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6 pb-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasks Progress</p>
                <p className="text-2xl font-bold">{completedTaskCount}/{totalTaskCount}</p>
                <p className="text-xs text-gray-500 mt-1">{taskCompletionPercentage}% complete</p>
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
                <p className="text-sm text-gray-600">Active Work</p>
                <p className="text-2xl font-bold">{tasksByStatus.inProgress.length}</p>
                <p className="text-xs text-gray-500 mt-1">in progress now</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Projects</p>
                <p className="text-2xl font-bold">{activeProjectCount}</p>
                <p className="text-xs text-gray-500 mt-1">active assignments</p>
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
                <p className="text-2xl font-bold">{totalHoursLogged.toFixed(1)}/{totalHoursCommitted}</p>
                <p className="text-xs text-gray-500 mt-1">{hoursProgressPercentage}% of target</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={Math.min(hoursProgressPercentage, 100)} className="mt-3 h-1" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={getInitialTab()} onValueChange={handleTabChange} className="w-full px-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
          <TabsTrigger value="applications" className="flex items-center gap-2" data-testid="tab-applications">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Applications</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2" data-testid="tab-assignments">
            <FolderKanban className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2" data-testid="tab-tasks">
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="-mx-6">
          <MyApplicationsPage />
        </TabsContent>

        <TabsContent value="assignments" className="-mx-6">
          <AssignmentsPage />
        </TabsContent>

        <TabsContent value="tasks" className="-mx-6">
          <MyTasksPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
