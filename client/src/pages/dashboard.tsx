import { Users, Clock, CheckSquare, Globe } from "lucide-react";
import StatsCard from "@/components/dashboard/stats-card";
import ImpactChart from "@/components/dashboard/impact-chart";
import SDGChart from "@/components/dashboard/sdg-chart";
import ProjectCard from "@/components/dashboard/project-card";
import TaskTable, { Task } from "@/components/dashboard/task-table";
import ActivityFeed, { Activity } from "@/components/dashboard/activity-feed";
import UpcomingEvents, { Event } from "@/components/dashboard/upcoming-events";
import QuickActions from "@/components/dashboard/quick-actions";

export default function Dashboard() {
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

  return (
    <>
      {/* Dashboard Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Impact Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Track and visualize your volunteer impact across projects</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Active Volunteers"
          value="245"
          icon={<Users className="h-5 w-5" />}
          iconBgClass="bg-primary-100 dark:bg-primary-900/30"
          iconColor="text-primary-500"
          change={{ value: "12%", isPositive: true, label: "vs last month" }}
        />
        
        <StatsCard
          title="Hours Contributed"
          value="1,876"
          icon={<Clock className="h-5 w-5" />}
          iconBgClass="bg-success-100 dark:bg-success-900/30"
          iconColor="text-success-500"
          change={{ value: "8%", isPositive: true, label: "vs last month" }}
        />
        
        <StatsCard
          title="Active Projects"
          value="12"
          icon={<CheckSquare className="h-5 w-5" />}
          iconBgClass="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-500"
          change={{ value: "Across 8 organizations", label: "" }}
        />
        
        <StatsCard
          title="SDGs Addressed"
          value="7"
          icon={<Globe className="h-5 w-5" />}
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-500"
          change={{ value: "2 new", isPositive: true, label: "this quarter" }}
        />
      </div>

      {/* Impact Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ImpactChart />
        <SDGChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Active Projects</h2>
              <a href="#" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View All</a>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {projects.map(project => (
                  <ProjectCard
                    key={project.id}
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
          
          <TaskTable tasks={tasks} />
        </div>
        
        {/* Sidebar Components */}
        <div className="space-y-6">
          <ActivityFeed activities={activities} />
          <UpcomingEvents events={events} />
          <QuickActions />
        </div>
      </div>
    </>
  );
}
