import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, Clock, CheckSquare, Globe, Building2, Award, TrendingUp, Target } from "lucide-react";
import StatsCard from "@/components/dashboard/stats-card";
import ImpactChart from "@/components/dashboard/impact-chart";
import SDGChart from "@/components/dashboard/sdg-chart";
import ProjectCard from "@/components/dashboard/project-card";
import TaskTable, { Task } from "@/components/dashboard/task-table";
import ActivityFeed, { Activity } from "@/components/dashboard/activity-feed";
import UpcomingEvents, { Event } from "@/components/dashboard/upcoming-events";
import QuickActions from "@/components/dashboard/quick-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedKPI, setSelectedKPI] = useState<{ title: string; data: any } | null>(null);

  // Fetch current user from database
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
  });

  // Determine dashboard type from user data
  const dashboardType = currentUser?.userType || "volunteer";

  // Fetch real data from API
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ["/api/dashboard/summary"],
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: volunteerActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["/api/volunteer-activities"],
  });

  const { data: calendarEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["/api/calendar-events"],
  });

  const { data: impactMetrics = [] } = useQuery({
    queryKey: ["/api/impact-metrics"],
  });

  const { data: projectImpacts = [] } = useQuery({
    queryKey: ["/api/project-impacts"],
  });

  // Filter data based on selected project
  const filteredData = useMemo(() => {
    const projectId = selectedProject === "all" ? null : parseInt(selectedProject);

    const filteredProjects = projectId 
      ? projects.filter((p: any) => p.id === projectId)
      : projects;

    const filteredTasks = projectId
      ? tasks.filter((t: any) => t.projectId === projectId)
      : tasks;

    const filteredActivities = projectId
      ? volunteerActivities.filter((a: any) => a.projectId === projectId)
      : volunteerActivities;

    const filteredImpacts = projectId
      ? projectImpacts.filter((i: any) => {
          const project = projects.find((p: any) => p.id === i.projectId);
          return project && project.id === projectId;
        })
      : projectImpacts;

    return {
      projects: filteredProjects,
      tasks: filteredTasks,
      activities: filteredActivities,
      impacts: filteredImpacts,
    };
  }, [selectedProject, projects, tasks, volunteerActivities, projectImpacts]);

  // Calculate KPIs from real data
  const kpis = useMemo(() => {
    const filteredHours = filteredData.activities.reduce((sum: number, activity: any) => sum + (activity.hours || 0), 0);
    const filteredTotalTasks = filteredData.tasks.length;
    const filteredCompletedTasks = filteredData.tasks.filter((t: any) => t.status === "Completed").length;
    const filteredActiveProjects = filteredData.projects.filter((p: any) => 
      p.status === "In Progress" || p.status === "Active"
    ).length;

    // Calculate unique SDGs from filtered projects
    const uniqueSDGs = new Set();
    filteredData.projects.forEach((project: any) => {
      if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
        project.sdgGoals.forEach((goal: number) => uniqueSDGs.add(goal));
      }
    });

    // Calculate impact score (simplified version)
    const impactScore = filteredData.impacts.reduce((sum: number, impact: any) => sum + (impact.value || 0), 0);

    if (dashboardType === "volunteer") {
      return {
        hours: filteredHours.toString(),
        tasks: filteredCompletedTasks.toString(),
        projects: filteredActiveProjects.toString(),
        impact: impactScore.toString(),
      };
    } else {
      // Organization KPIs
      const activeVolunteers = new Set(filteredData.activities.map((a: any) => a.userId)).size;
      return {
        volunteers: activeVolunteers.toString(),
        projects: filteredActiveProjects.toString(),
        hours: filteredHours.toString(),
        sdgs: uniqueSDGs.size.toString(),
      };
    }
  }, [filteredData, dashboardType]);

  // Transform activities for the activity feed
  const formattedActivities: Activity[] = useMemo(() => {
    return (filteredData.activities || []).slice(0, 10).map((activity: any) => {
      const relativeTime = getRelativeTime(new Date(activity.createdAt));
      const project = projects.find((p: any) => p.id === activity.projectId);
      
      return {
        id: activity.id.toString(),
        user: {
          id: activity.userId?.toString() || "1",
          name: "Volunteer",
          avatar: undefined,
        },
        action: "logged " + activity.hours + " hours on",
        target: project?.name || "Unknown Project",
        time: relativeTime,
      };
    });
  }, [filteredData.activities, projects]);

  // Transform events for upcoming events
  const formattedEvents: Event[] = useMemo(() => {
    return (calendarEvents || [])
      .filter((event: any) => new Date(event.startTime) > new Date())
      .slice(0, 3)
      .map((event: any) => ({
        id: event.id.toString(),
        title: event.title,
        dateTime: formatDateTime(new Date(event.startTime)),
        type: getEventType(event.eventType),
      }));
  }, [calendarEvents]);

  // Handle KPI card click to show details
  const handleKPIClick = (title: string, value: string) => {
    let detailData: any = {};
    
    switch (title) {
      case "Hours Contributed":
        detailData = {
          title: "Volunteer Hours Breakdown",
          items: filteredData.activities.map((a: any) => ({
            label: formatDate(new Date(a.date)),
            value: `${a.hours} hours`,
            project: projects.find((p: any) => p.id === a.projectId)?.name,
          })),
        };
        break;
      case "Tasks Completed":
        detailData = {
          title: "Completed Tasks",
          items: filteredData.tasks.filter((t: any) => t.status === "Completed").map((t: any) => ({
            label: t.title,
            project: projects.find((p: any) => p.id === t.projectId)?.name,
          })),
        };
        break;
      case "Active Projects":
        detailData = {
          title: "Active Projects Details",
          items: filteredData.projects.filter((p: any) => 
            p.status === "In Progress" || p.status === "Active"
          ).map((p: any) => ({
            label: p.name,
            value: p.status,
            location: p.location,
          })),
        };
        break;
      default:
        detailData = { title, items: [] };
    }
    
    setSelectedKPI(detailData);
  };

  if (loadingDashboard || loadingProjects || loadingTasks || loadingActivities) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {dashboardType === "volunteer" ? "Volunteer" : "Organization"} Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your impact and manage your {dashboardType === "volunteer" ? "volunteer activities" : "organization projects"}
          </p>
        </div>
        
        {/* Project Filter */}
        <div className="flex items-center gap-2">
          <Label htmlFor="project-filter" className="text-sm whitespace-nowrap">Filter by Project:</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger id="project-filter" className="w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project: any) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardType === "volunteer" ? (
          <>
            <StatsCard
              title="Hours Contributed"
              value={kpis.hours}
              icon={<Clock className="h-6 w-6" />}
              trend="+12%"
              onClick={() => handleKPIClick("Hours Contributed", kpis.hours)}
              data-testid="kpi-hours"
            />
            <StatsCard
              title="Tasks Completed"
              value={kpis.tasks}
              icon={<CheckSquare className="h-6 w-6" />}
              trend="+8%"
              onClick={() => handleKPIClick("Tasks Completed", kpis.tasks)}
              data-testid="kpi-tasks"
            />
            <StatsCard
              title="Active Projects"
              value={kpis.projects}
              icon={<Target className="h-6 w-6" />}
              onClick={() => handleKPIClick("Active Projects", kpis.projects)}
              data-testid="kpi-projects"
            />
            <StatsCard
              title="Impact Score"
              value={kpis.impact}
              icon={<Award className="h-6 w-6" />}
              trend="+25%"
              data-testid="kpi-impact"
            />
          </>
        ) : (
          <>
            <StatsCard
              title="Active Volunteers"
              value={kpis.volunteers}
              icon={<Users className="h-6 w-6" />}
              trend="+15%"
              data-testid="kpi-volunteers"
            />
            <StatsCard
              title="Active Projects"
              value={kpis.projects}
              icon={<Building2 className="h-6 w-6" />}
              onClick={() => handleKPIClick("Active Projects", kpis.projects)}
              data-testid="kpi-projects"
            />
            <StatsCard
              title="Total Hours"
              value={kpis.hours}
              icon={<Clock className="h-6 w-6" />}
              trend="+20%"
              onClick={() => handleKPIClick("Total Hours", kpis.hours)}
              data-testid="kpi-hours"
            />
            <StatsCard
              title="SDGs Addressed"
              value={kpis.sdgs}
              icon={<Globe className="h-6 w-6" />}
              data-testid="kpi-sdgs"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImpactChart 
          activities={filteredData.activities}
          projectImpacts={filteredData.impacts}
        />
        <SDGChart 
          projects={filteredData.projects}
        />
      </div>

      {/* Projects Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Active Projects</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredData.projects.slice(0, 6).map((project: any) => (
            <ProjectCard
              key={project.id}
              id={project.id.toString()}
              title={project.name}
              description={project.description || "No description available"}
              status={project.status as any}
              progress={calculateProgress(project.id, tasks)}
              timeRemaining={getTimeRemaining(project.endDate)}
              volunteers={[]}
            />
          ))}
          {filteredData.projects.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No projects found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4">
              <TaskTable tasks={formatTasksForTable(filteredData.tasks, projects)} />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <ActivityFeed activities={formattedActivities} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <UpcomingEvents events={formattedEvents} />
          <QuickActions userType={dashboardType} />
        </div>
      </div>

      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKPI} onOpenChange={(open) => !open && setSelectedKPI(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedKPI?.title}</DialogTitle>
            <DialogDescription>
              Detailed breakdown of {selectedKPI?.title.toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedKPI?.items.map((item: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{item.label}</h4>
                    {item.project && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Project: {item.project}
                      </p>
                    )}
                    {item.location && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Location: {item.location}
                      </p>
                    )}
                  </div>
                  {item.value && (
                    <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {selectedKPI?.items.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No data available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions
function formatTasksForTable(tasks: any[], projects: any[]): Task[] {
  return tasks.map((task: any) => {
    const project = projects.find((p: any) => p.id === task.projectId);
    return {
      id: task.id.toString(),
      name: task.title,
      project: project?.name || "Unknown Project",
      dueDate: task.dueDate ? formatDate(new Date(task.dueDate)) : "No due date",
      status: task.status,
      assignee: task.assigneeId ? {
        id: task.assigneeId.toString(),
        name: "Volunteer",
      } : undefined,
    };
  });
}

function calculateProgress(projectId: number, tasks: any[]): number {
  const projectTasks = tasks.filter((t: any) => t.projectId === projectId);
  if (projectTasks.length === 0) return 0;
  
  const completedTasks = projectTasks.filter((t: any) => t.status === "Completed").length;
  return Math.round((completedTasks / projectTasks.length) * 100);
}

function getTimeRemaining(endDate: string | null): string {
  if (!endDate) return "No end date";
  
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return "Overdue";
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function getEventType(eventType: string): "primary" | "success" | "info" | "warning" | "destructive" {
  const typeMap: Record<string, "primary" | "success" | "info" | "warning" | "destructive"> = {
    volunteer_shift: "primary",
    meeting: "info",
    deadline: "warning",
    training: "success",
  };
  return typeMap[eventType] || "info";
}
