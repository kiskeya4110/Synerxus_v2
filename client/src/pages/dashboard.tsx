import { useState } from "react";
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

export default function Dashboard() {
  const [dashboardType, setDashboardType] = useState<"volunteer" | "organization">("volunteer");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Sample data for projects
  const projects = [
    {
      id: "1",
      title: "Clean Water Initiative",
      description: "Installing water filters in rural communities",
      status: "In Progress" as const,
      progress: 75,
      timeRemaining: "Ends in 14 days",
      volunteers: [
        { id: "1", name: "Sarah Johnson", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100" },
        { id: "2", name: "Emily Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100" },
        { id: "3", name: "David Kim", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100" },
        { id: "4", name: "Michael Brown" },
        { id: "5", name: "Jessica Lee" }
      ]
    },
    {
      id: "2",
      title: "Education Access Program",
      description: "Digital literacy training for underserved communities",
      status: "In Progress" as const,
      progress: 45,
      timeRemaining: "Ends in 45 days",
      volunteers: [
        { id: "6", name: "Lisa Wong", avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100" },
        { id: "7", name: "John Smith", avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100" },
        { id: "8", name: "Robert Taylor" }
      ]
    },
    {
      id: "3",
      title: "Medical Outreach",
      description: "Providing basic healthcare services to remote villages",
      status: "Planning" as const,
      progress: 15,
      timeRemaining: "Starts in 7 days",
      volunteers: [
        { id: "9", name: "Thomas Wilson", avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100" },
        { id: "10", name: "Anna Garcia" }
      ]
    }
  ];

  // Sample data for tasks
  const tasks: Task[] = [
    {
      id: "1",
      name: "Water quality testing",
      project: "Clean Water Initiative",
      dueDate: "Jul 28, 2023",
      status: "In Progress",
      assignee: {
        id: "1",
        name: "Sarah Johnson",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
      }
    },
    {
      id: "2",
      name: "Curriculum development",
      project: "Education Access Program",
      dueDate: "Jul 30, 2023",
      status: "Completed",
      assignee: {
        id: "2",
        name: "Emily Chen",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
      }
    },
    {
      id: "3",
      name: "Volunteer training",
      project: "Medical Outreach",
      dueDate: "Aug 5, 2023",
      status: "Overdue",
      assignee: {
        id: "3",
        name: "David Kim",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
      }
    },
    {
      id: "4",
      name: "Impact assessment",
      project: "Clean Water Initiative",
      dueDate: "Aug 10, 2023",
      status: "To Do"
    }
  ];

  // Sample data for activities
  const activities: Activity[] = [
    {
      id: "1",
      user: {
        id: "1",
        name: "Sarah Johnson",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
      },
      action: "completed task",
      target: "Water filter installation",
      time: "30 minutes ago"
    },
    {
      id: "2",
      user: {
        id: "2",
        name: "Emily Chen",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
      },
      action: "logged 8 hours on",
      target: "Education Access Program",
      time: "2 hours ago"
    },
    {
      id: "3",
      user: {
        id: "3",
        name: "David Kim",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
      },
      action: "created new project",
      target: "Medical Outreach",
      time: "Yesterday"
    },
    {
      id: "4",
      isSystem: true,
      action: "generated impact report for",
      target: "Q2 2023",
      time: "2 days ago"
    }
  ];

  // Sample data for events
  const events: Event[] = [
    {
      id: "1",
      title: "Volunteer Training Session",
      dateTime: "Jul 27, 2023 • 2:00 PM",
      type: "primary"
    },
    {
      id: "2",
      title: "Project Kickoff: Medical Outreach",
      dateTime: "Aug 2, 2023 • 10:00 AM",
      type: "success"
    },
    {
      id: "3",
      title: "Impact Assessment Workshop",
      dateTime: "Aug 8, 2023 • 1:00 PM",
      type: "info"
    }
  ];

  // Filter data based on selected project
  const filteredProjects = selectedProject === "all" 
    ? projects 
    : projects.filter(p => p.id === selectedProject);
  
  const filteredTasks = selectedProject === "all"
    ? tasks
    : tasks.filter(t => {
        const project = projects.find(p => p.title === t.project);
        return project?.id === selectedProject;
      });
  
  const filteredActivities = selectedProject === "all"
    ? activities
    : activities.filter(a => {
        const activityProject = projects.find(p => p.title === a.target);
        return activityProject?.id === selectedProject;
      });

  // Calculate filtered KPIs
  const getFilteredKPIs = (): Record<string, string> => {
    if (dashboardType === "volunteer") {
      if (selectedProject === "all") {
        return {
          hours: "32",
          tasks: "12",
          projects: "3",
          impact: "94"
        };
      }
      // Project-specific volunteer KPIs
      const projectHours: Record<string, string> = {
        "1": "18",
        "2": "10",
        "3": "4"
      };
      const projectTasks: Record<string, string> = {
        "1": "7",
        "2": "3",
        "3": "2"
      };
      const projectImpact: Record<string, string> = {
        "1": "88",
        "2": "76",
        "3": "45"
      };
      return {
        hours: projectHours[selectedProject] ?? "0",
        tasks: projectTasks[selectedProject] ?? "0",
        projects: "1",
        impact: projectImpact[selectedProject] ?? "0"
      };
    } else {
      if (selectedProject === "all") {
        return {
          volunteers: "245",
          hours: "1,876",
          projects: "12",
          impacted: "15.2K"
        };
      }
      // Project-specific organization KPIs
      const projectVolunteers: Record<string, string> = {
        "1": "42",
        "2": "28",
        "3": "18"
      };
      const projectHours: Record<string, string> = {
        "1": "856",
        "2": "524",
        "3": "142"
      };
      const projectImpacted: Record<string, string> = {
        "1": "8.5K",
        "2": "4.2K",
        "3": "2.1K"
      };
      return {
        volunteers: projectVolunteers[selectedProject] ?? "0",
        hours: projectHours[selectedProject] ?? "0",
        projects: "1",
        impacted: projectImpacted[selectedProject] ?? "0"
      };
    }
  };

  const kpis = getFilteredKPIs();

  return (
    <>
      {/* Dashboard Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Impact Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Bridging global volunteers with meaningful impact worldwide</p>
      </div>

      {/* Dashboard Type Selector */}
      <Tabs value={dashboardType} onValueChange={(value) => setDashboardType(value as "volunteer" | "organization")} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 min-h-[44px]">
          <TabsTrigger value="volunteer" className="min-h-[44px]" data-testid="tab-volunteer-dashboard">
            <Users className="h-4 w-4 mr-2" />
            Volunteer View
          </TabsTrigger>
          <TabsTrigger value="organization" className="min-h-[44px]" data-testid="tab-organization-dashboard">
            <Building2 className="h-4 w-4 mr-2" />
            Organization View
          </TabsTrigger>
        </TabsList>

        {/* Project Filter */}
        <div className="mt-4 mb-2">
          <Label htmlFor="project-filter" className="text-sm font-medium mb-2 block">Filter by Project</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger id="project-filter" className="w-full max-w-md min-h-[44px]" data-testid="select-project-filter">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Volunteer Dashboard */}
        <TabsContent value="volunteer" className="space-y-6 mt-6">
          {/* Volunteer Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="My Hours This Month"
              value={kpis.hours}
              icon={<Clock className="h-5 w-5" />}
              iconBgClass="bg-blue-100 dark:bg-blue-900/30"
              iconColor="text-blue-600 dark:text-blue-400"
              change={{ value: "8 hrs", isPositive: true, label: "vs last month" }}
            />
            
            <StatsCard
              title="Tasks Completed"
              value={kpis.tasks}
              icon={<CheckSquare className="h-5 w-5" />}
              iconBgClass="bg-green-100 dark:bg-green-900/30"
              iconColor="text-green-600 dark:text-green-400"
              change={{ value: "5 tasks", isPositive: true, label: "this week" }}
            />
            
            <StatsCard
              title="Active Projects"
              value={kpis.projects}
              icon={<Target className="h-5 w-5" />}
              iconBgClass="bg-purple-100 dark:bg-purple-900/30"
              iconColor="text-purple-600 dark:text-purple-400"
              change={{ value: selectedProject === "all" ? "1 new" : "selected", isPositive: true, label: selectedProject === "all" ? "this month" : "filter active" }}
            />
            
            <StatsCard
              title="Impact Score"
              value={kpis.impact}
              icon={<Award className="h-5 w-5" />}
              iconBgClass="bg-amber-100 dark:bg-amber-900/30"
              iconColor="text-amber-600 dark:text-amber-400"
              change={{ value: "+6 pts", isPositive: true, label: "this month" }}
            />
          </div>

          {/* Volunteer Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ImpactChart userType="volunteer" selectedProject={selectedProject} />
            <SDGChart userType="volunteer" selectedProject={selectedProject} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">My Active Projects</h2>
                  <a href="/projects" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View All</a>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {filteredProjects.slice(0, 2).map(project => (
                      <ProjectCard
                        key={project.id}
                        projectId={project.id}
                        title={project.title}
                        description={project.description}
                        status={project.status}
                        progress={project.progress}
                        timeRemaining={project.timeRemaining}
                        volunteers={project.volunteers}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <TaskTable tasks={filteredTasks.filter(t => t.assignee?.name === "Sarah Johnson")} />
            </div>
            
            <div className="space-y-6">
              <ActivityFeed activities={filteredActivities.filter(a => a.user?.name === "Sarah Johnson")} />
              <UpcomingEvents events={events} />
              <QuickActions />
            </div>
          </div>
        </TabsContent>

        {/* Organization Dashboard */}
        <TabsContent value="organization" className="space-y-6 mt-6">
          {/* Organization Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Volunteers"
              value={kpis.volunteers ?? "0"}
              icon={<Users className="h-5 w-5" />}
              iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
              iconColor="text-indigo-600 dark:text-indigo-400"
              change={{ value: "12%", isPositive: true, label: "vs last month" }}
            />
            
            <StatsCard
              title="Total Hours"
              value={kpis.hours ?? "0"}
              icon={<Clock className="h-5 w-5" />}
              iconBgClass="bg-cyan-100 dark:bg-cyan-900/30"
              iconColor="text-cyan-600 dark:text-cyan-400"
              change={{ value: "18%", isPositive: true, label: "vs last month" }}
            />
            
            <StatsCard
              title="Active Projects"
              value={kpis.projects ?? "0"}
              icon={<CheckSquare className="h-5 w-5" />}
              iconBgClass="bg-teal-100 dark:bg-teal-900/30"
              iconColor="text-teal-600 dark:text-teal-400"
              change={{ value: selectedProject === "all" ? "3 new" : "selected", isPositive: true, label: selectedProject === "all" ? "this quarter" : "filter active" }}
            />
            
            <StatsCard
              title="People Impacted"
              value={kpis.impacted ?? "0"}
              icon={<TrendingUp className="h-5 w-5" />}
              iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
              iconColor="text-emerald-600 dark:text-emerald-400"
              change={{ value: "24%", isPositive: true, label: "vs last quarter" }}
            />
          </div>

          {/* Organization Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ImpactChart userType="organization" selectedProject={selectedProject} />
            <SDGChart userType="organization" selectedProject={selectedProject} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-lg font-semibold">All Active Projects</h2>
                  <a href="/projects" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View All</a>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {filteredProjects.map(project => (
                      <ProjectCard
                        key={project.id}
                        projectId={project.id}
                        title={project.title}
                        description={project.description}
                        status={project.status}
                        progress={project.progress}
                        timeRemaining={project.timeRemaining}
                        volunteers={project.volunteers}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <TaskTable tasks={filteredTasks} />
            </div>
            
            <div className="space-y-6">
              <ActivityFeed activities={filteredActivities} />
              <UpcomingEvents events={events} />
              <QuickActions />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
