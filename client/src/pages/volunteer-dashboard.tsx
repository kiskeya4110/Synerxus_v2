import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Users, Clock, CheckSquare, Globe, Building2, Award, TrendingUp, Target, Briefcase, AlertCircle, Zap, FileText } from "lucide-react";
import StatsCard from "@/components/dashboard/stats-card";
import ImpactChart from "@/components/dashboard/impact-chart";
import SDGChart from "@/components/dashboard/sdg-chart";
import ImpactStreak from "@/components/dashboard/impact-streak";
import ProjectCard from "@/components/dashboard/project-card";
import TaskTable, { Task } from "@/components/dashboard/task-table";
import ActivityFeed, { Activity } from "@/components/dashboard/activity-feed";
import UpcomingEvents, { Event } from "@/components/dashboard/upcoming-events";
import QuickActions from "@/components/dashboard/quick-actions";
import OpportunitiesTab from "@/components/dashboard/opportunities-tab";
import ProfileOverview from "@/components/dashboard/profile-overview";
import ContactVolunteerModal from "@/components/dashboard/contact-volunteer-modal";
import { VolunteerInsightsSection } from "@/components/dashboard/volunteer-insights";
import ImpactStorytelling from "@/components/impact/impact-storytelling";
import OrganizationNav from "@/components/layout/organization-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/layout/footer";
interface Html2PdfInstance {
  set(options: Record<string, any>): { from(element: HTMLElement): { save(): void } };
}
declare const html2pdf: { (): Html2PdfInstance };

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const userType = localStorage.getItem('userType');

  // Redirect corporate partners to CSR Dashboard
  if (userType === 'corporate-partner') {
    navigate('/csr-dashboard');
    return null;
  }

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  interface KPIState {
    title: string;
    items: Record<string, any>[];
    totalScore?: number;
  }
  const [selectedKPI, setSelectedKPI] = useState<KPIState | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Fetch current user from database
  const userId = localStorage.getItem('currentUserId');
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) {
        throw new Error("No user ID found");
      }
      const url = `/api/users/me?userId=${id}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("User not found");
      }
      return response.json();
    },
    enabled: !!userId,
    retry: false
  });

  // Fetch real data from API - MUST be called before any early returns
  interface DashboardData {
    activeVolunteers?: number;
    totalHours?: number;
    projects?: any[];
    tasks?: Task[];
    [key: string]: any;
  }
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/summary", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/dashboard/summary?userId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard summary");
      return response.json();
    },
    enabled: !!currentUser && !!currentUser.userType && !!userId
  });

  // Use projects from dashboardData which are already properly scoped to the user
  // (volunteers see only assigned projects, organizations see only their projects)
  const projects = dashboardData?.projects || [];
  const loadingProjects = loadingDashboard;

  // Log volunteer profile data for debugging
  if (currentUser?.userType === 'volunteer' && dashboardData?.volunteerProfile) {
    console.log('[Dashboard] volunteerProfile received:', {
      id: dashboardData.volunteerProfile.id,
      userId: dashboardData.volunteerProfile.userId,
      weeklyAvailability: dashboardData.volunteerProfile.weeklyAvailability,
      _debug: dashboardData.volunteerProfile._debug_weeklyAvailability,
    });
  }

  // Use scoped data from dashboard service instead of global endpoints
  const tasks = dashboardData?.tasks || [];
  const volunteerActivities = dashboardData?.activities || [];
  const projectImpacts = dashboardData?.impacts || [];
  const projectsWithVolunteers = dashboardData?.projectsWithVolunteers || [];
  const volunteerSummaries = dashboardData?.volunteerSummaries || [];
  
  // These endpoints don't have scoped versions yet - fetch globally for now
  const { data: calendarEvents = [], isLoading: loadingEvents } = useQuery<any[]>({
    queryKey: ["/api/calendar-events"],
    enabled: !!currentUser && !!currentUser.userType
  });

  const { data: impactMetrics = [] } = useQuery<any[]>({
    queryKey: ["/api/impact-metrics"],
    enabled: !!currentUser && !!currentUser.userType
  });

  // Determine dashboard type early (needed for data filtering) - must be before useMemo
  const dashboardType = currentUser?.userType;

  // Fetch organization profile for organization users to get their selected SDGs
  const { data: orgProfile } = useQuery({
    queryKey: ["/api/profile/organization", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const url = `/api/profile/organization?userId=${id}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId && currentUser?.userType === 'organization'
  });

  // Filter data based on selected project
  // Use dashboardData for both volunteers and organizations (it contains everything scoped to user)
  const filteredData = useMemo(() => {
    const projectId = selectedProject === "all" ? null : parseInt(selectedProject);

    // Use dashboardData for all users - it contains properly scoped data from backend
    const sourceProjects = dashboardData?.projects || [];
    const sourceTasks = dashboardData?.tasks || [];
    const sourceActivities = dashboardData?.activities || [];
    const sourceImpacts = dashboardData?.impacts || [];

    const filteredProjects = projectId 
      ? sourceProjects.filter((p: any) => p.id === projectId)
      : sourceProjects;

    const filteredTasks = projectId
      ? sourceTasks.filter((t: any) => t.projectId === projectId)
      : sourceTasks;

    const filteredActivities = projectId
      ? sourceActivities.filter((a: any) => a.projectId === projectId)
      : sourceActivities;

    const filteredImpacts = projectId
      ? sourceImpacts.filter((i: any) => {
          const project = sourceProjects.find((p: any) => p.id === i.projectId);
          return project && project.id === projectId;
        })
      : sourceImpacts;

    return {
      projects: filteredProjects,
      tasks: filteredTasks,
      activities: filteredActivities,
      impacts: filteredImpacts,
      applications: dashboardData?.applications || [], // Add applications to filteredData
    };
  }, [selectedProject, dashboardData]);

  // Filter monthly impact data by time period AND project
  const filteredMonthlyImpactData = useMemo(() => {
    let monthlyData = dashboardData?.monthlyImpactData || [];
    
    // Filter by project if specific project is selected
    if (selectedProject !== 'all' && filteredData.activities.length > 0) {
      // Calculate monthly data from filtered activities for this project
      const projectMonthlyMap = new Map<string, { hours: number; peopleImpacted: number }>();
      
      filteredData.activities.forEach((activity: any) => {
        const date = new Date(activity.date || activity.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!projectMonthlyMap.has(monthKey)) {
          projectMonthlyMap.set(monthKey, { hours: 0, peopleImpacted: 0 });
        }
        
        const month = projectMonthlyMap.get(monthKey)!;
        month.hours += activity.hours || 0;
        month.peopleImpacted += activity.peopleImpacted || 0;
      });
      
      monthlyData = Array.from(projectMonthlyMap.entries()).map(([month, data]) => ({
        month,
        hours: data.hours,
        peopleImpacted: data.peopleImpacted
      }));
    }
    
    if (timeFilter === 'all') return monthlyData;
    
    const now = new Date();
    let startDate = new Date(0);
    
    switch(timeFilter) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    return monthlyData.filter((data: any) => {
      if (!data.month) return true;
      const [year, month] = data.month.split('-');
      const dataDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      return dataDate >= startDate;
    });
  }, [dashboardData?.monthlyImpactData, timeFilter, selectedProject, filteredData.activities]);

  // Filter monthly impact trend by time period AND project to match the impact data
  const filteredMonthlyImpactTrend = useMemo(() => {
    let trendData = dashboardData?.monthlyImpactTrend || [];
    
    // Filter by project if specific project is selected
    if (selectedProject !== 'all' && filteredData.activities.length > 0) {
      // Calculate trend data from filtered activities for this project
      const projectTrendMap = new Map<string, number>();
      
      filteredData.impacts.forEach((impact: any) => {
        const date = new Date(impact.date || impact.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!projectTrendMap.has(monthKey)) {
          projectTrendMap.set(monthKey, 0);
        }
        
        const current = projectTrendMap.get(monthKey) || 0;
        projectTrendMap.set(monthKey, current + (impact.algorithmScore || 0));
      });
      
      trendData = Array.from(projectTrendMap.entries()).map(([month, score]) => ({
        month,
        score: Math.round(score / (filteredData.impacts.filter((i: any) => {
          const date = new Date(i.date || i.createdAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          return monthKey === month;
        }).length || 1))
      }));
    }
    
    if (timeFilter === 'all') return trendData;
    
    const now = new Date();
    let startDate = new Date(0);
    
    switch(timeFilter) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    return trendData.filter((data: any) => {
      if (!data.month) return true;
      const [year, month] = data.month.split('-');
      const dataDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      return dataDate >= startDate;
    });
  }, [dashboardData?.monthlyImpactTrend, timeFilter, selectedProject, filteredData.impacts, filteredData.activities]);

  // Generate narrative for impact chart - LIVE and INTERACTIVE with time filter AND project filter
  const impactNarrative = useMemo(() => {
    // When a specific project is selected, calculate narrative from filtered activities instead of monthly data
    if (selectedProject !== "all" && filteredData.activities.length > 0) {
      // Calculate monthly data from filtered activities
      const projectMonthlyMap = new Map<string, { hours: number; peopleImpacted: number }>();
      
      filteredData.activities.forEach((activity: any) => {
        const date = new Date(activity.date || activity.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!projectMonthlyMap.has(monthKey)) {
          projectMonthlyMap.set(monthKey, { hours: 0, peopleImpacted: 0 });
        }
        
        const month = projectMonthlyMap.get(monthKey)!;
        month.hours += activity.hours || 0;
        month.peopleImpacted += activity.peopleImpacted || 0;
      });
      
      const projectData = Array.from(projectMonthlyMap.values());
      if (projectData.length === 0) return "";
      
      const totalHours = projectData.reduce((sum: number, d: any) => sum + (d.hours || 0), 0);
      // Use backend-calculated totalPeopleImpacted for consistency
      const totalPeopleImpacted = dashboardData?.totalPeopleImpacted || 0;
      
      if (totalHours === 0 && totalPeopleImpacted === 0) return "";
      
      const avgHours = Math.round(totalHours / projectData.length);
      let peakMonth = projectData[0];
      let lowestMonth = projectData[0];
      
      for (const d of projectData) {
        if ((d.hours || 0) > (peakMonth.hours || 0)) peakMonth = d;
        if ((d.hours || 0) < (lowestMonth.hours || 0)) lowestMonth = d;
      }
      
      const variance = projectData.reduce((sum: number, d: any) => sum + Math.pow((d.hours || 0) - avgHours, 2), 0) / projectData.length;
      const stdDev = Math.round(Math.sqrt(variance));
      const consistency = stdDev <= avgHours * 0.3 ? "highly consistent" : stdDev <= avgHours * 0.6 ? "moderately consistent" : "variable";
      
      const avgPeoplePerHour = totalHours > 0 ? Math.round((totalPeopleImpacted / totalHours) * 10) / 10 : 0;
      
      const selectedProjectName = projects.find((p: any) => p.id.toString() === selectedProject)?.name || "this project";
      
      let narrative = "";
      if (dashboardType === "volunteer") {
        narrative = `Project Impact for ${selectedProjectName}: You've logged ${totalHours} total hours with an average of ${avgHours} hours per month. `;
        narrative += `Your contribution is ${consistency}, ranging from ${lowestMonth.hours}h to ${peakMonth.hours}h. `;
        narrative += `You've impacted ${totalPeopleImpacted} people total (avg ${avgPeoplePerHour} people/hour).`;
      } else {
        narrative = `Project Impact for ${selectedProjectName}: Your team has logged ${totalHours} hours with an average of ${avgHours} hours per month. `;
        narrative += `Peak activity was ${peakMonth.hours}h, showing ${consistency} engagement. `;
        narrative += `Total people impacted: ${totalPeopleImpacted} (avg ${avgPeoplePerHour} per hour).`;
      }
      return narrative;
    }
    
    // Default: use time-filtered data for "all projects"
    if (!filteredMonthlyImpactData || filteredMonthlyImpactData.length === 0) return "";
    
    const data = filteredMonthlyImpactData;
    const totalHours = data.reduce((sum: number, d: any) => sum + (d.hours || 0), 0);
    // Use backend-calculated totalPeopleImpacted for consistency (single source of truth)
    const totalPeopleImpacted = dashboardData?.totalPeopleImpacted || 0;
    
    if (totalHours === 0 && totalPeopleImpacted === 0) return "";
    
    const avgHours = Math.round(totalHours / data.length);
    const avgPeople = Math.round(totalPeopleImpacted / data.length);
    
    // Find peak and lowest months
    let peakMonth = data[0];
    let lowestMonth = data[0];
    for (const d of data) {
      if ((d.hours || 0) > (peakMonth.hours || 0)) peakMonth = d;
      if ((d.hours || 0) < (lowestMonth.hours || 0)) lowestMonth = d;
    }
    
    // Calculate consistency (standard deviation concept)
    const variance = data.reduce((sum: number, d: any) => sum + Math.pow((d.hours || 0) - avgHours, 2), 0) / data.length;
    const stdDev = Math.round(Math.sqrt(variance));
    const consistency = stdDev <= avgHours * 0.3 ? "highly consistent" : stdDev <= avgHours * 0.6 ? "moderately consistent" : "variable";
    
    // Determine trend - only if enough data points
    let trend = "stable";
    if (data.length >= 2) {
      const midPoint = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, midPoint);
      const secondHalf = data.slice(midPoint);
      const avgFirstHalf = firstHalf.reduce((sum: number, d: any) => sum + (d.hours || 0), 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((sum: number, d: any) => sum + (d.hours || 0), 0) / secondHalf.length;
      trend = avgSecondHalf > avgFirstHalf * 1.1 ? "increasing" : avgSecondHalf < avgFirstHalf * 0.9 ? "decreasing" : "stable";
    }
    
    // Calculate efficiency (people per hour impact)
    const avgPeoplePerHour = totalHours > 0 ? Math.round((totalPeopleImpacted / totalHours) * 10) / 10 : 0;
    
    // Generate time period label
    let timePeriod = "the selected period";
    if (timeFilter === "month") timePeriod = "this month";
    else if (timeFilter === "quarter") timePeriod = "this quarter";
    else if (timeFilter === "year") timePeriod = "this year";
    else if (timeFilter === "all") timePeriod = "all time";
    
    // Generate narrative based on user type
    let narrative = "";
    if (dashboardType === "volunteer") {
      narrative = `Impact Summary for ${timePeriod}: You've logged ${totalHours} total hours across ${data.length} month${data.length !== 1 ? 's' : ''} with an average of ${avgHours} hours per month. `;
      narrative += `Your contribution is ${consistency}, ranging from ${lowestMonth.hours}h to ${peakMonth.hours}h. `;
      narrative += `You've impacted ${totalPeopleImpacted} people total (avg ${avgPeoplePerHour} people/hour). `;
      narrative += `${trend === 'increasing' ? '📈 Your engagement is accelerating!' : trend === 'decreasing' ? '📉 Consider renewing your commitment' : '➡️ Your participation is steady and reliable'}.`;
    } else {
      narrative = `Impact Summary for ${timePeriod}: Your organization has logged ${totalHours} volunteer hours across ${data.length} month${data.length !== 1 ? 's' : ''} with an average of ${avgHours} hours per month. `;
      narrative += `Peak activity reached ${peakMonth.hours}h, demonstrating ${consistency} volunteer engagement. `;
      narrative += `Total people impacted: ${totalPeopleImpacted} (avg ${avgPeoplePerHour} per hour). `;
      narrative += `${trend === 'increasing' ? '📈 Momentum is strong - volunteer base growing!' : trend === 'decreasing' ? '📉 Consider recruitment initiatives' : '➡️ Steady and stable impact generation'}.`;
    }
    
    return narrative;
  }, [filteredMonthlyImpactData, timeFilter, dashboardType, selectedProject, filteredData, projects]);

  // Use KPIs from backend - API returns summary data at top level
  const kpis = useMemo(() => {
    // When "all" is selected or no filter, use backend KPIs directly
    if (selectedProject === "all") {
      return {
        volunteers: dashboardData?.activeVolunteers || 0,
        hours: Math.round(dashboardData?.totalHours || 0),
        tasks: dashboardData?.totalTasks || 0,
        completedTasks: dashboardData?.completedTasks || 0,
        activeProjects: dashboardData?.activeProjects || 0,
        sdgs: dashboardData?.sdgsAddressed || 0,
        impactScore: dashboardData?.impactScore || 0,
        skills: dashboardData?.volunteerProfile?.skills?.length || 0,
        livesTouched: dashboardData?.totalPeopleImpacted || 0,
      };
    }
    
    // When a specific project is filtered, calculate filtered KPIs
    const filteredHours = filteredData.activities.reduce((sum: number, activity: any) => sum + (activity.hours || 0), 0);
    const filteredTotalTasks = filteredData.tasks.length;
    const filteredCompletedTasks = filteredData.tasks.filter((t: any) => t.status === "Completed").length;
    const filteredActiveProjects = filteredData.projects.filter((p: any) => 
      p.status === "In Progress" || p.status === "Active"
    ).length;
    
    // Calculate unique SDGs from filtered projects
    const uniqueSDGs = new Set();
    filteredData.projects.forEach((p: any) => {
      if (p.sdgGoals && Array.isArray(p.sdgGoals)) {
        p.sdgGoals.forEach((sdg: number) => uniqueSDGs.add(sdg));
      }
    });

    return {
      volunteers: dashboardData?.activeVolunteers || 0,
      hours: Math.round(filteredHours),
      tasks: filteredTotalTasks,
      completedTasks: filteredCompletedTasks,
      activeProjects: filteredActiveProjects,
      sdgs: uniqueSDGs.size,
      impactScore: dashboardData?.impactScore || 0,
      skills: dashboardData?.volunteerProfile?.skills?.length || 0,
      livesTouched: dashboardData?.totalPeopleImpacted || 0,
    };
  }, [dashboardData, filteredData, selectedProject]);

  // Transform activities for the activity feed - MUST BE BEFORE EARLY RETURNS
  const formattedActivities: Activity[] = useMemo(() => {
    return (filteredData.activities || []).map((activity: any) => {
      const relativeTime = getRelativeTime(new Date(activity.createdAt || activity.timestamp));
      
      // Check if this is a unified activity or legacy format
      if (activity.type) {
        // New unified activity format from backend
        return {
          id: activity.id.toString(),
          user: {
            id: activity.userId?.toString() || "1",
            name: activity.userName || "Unknown",
            avatar: activity.userAvatar,
          },
          action: activity.action,
          target: activity.target,
          time: relativeTime,
        };
      } else {
        // Legacy format (volunteer hours)
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
      }
    });
  }, [filteredData.activities, projects]);

  // Transform events for upcoming events - MUST BE BEFORE EARLY RETURNS
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

  // Transform project impact data for ImpactStorytelling component
  const projectImpactData = useMemo(() => {
    return filteredData.projects.map((project: any) => {
      const impacts = filteredData.impacts.filter((impact: any) => impact.projectId === project.id);
      
      const metrics = impacts.map((impact: any) => {
        const metric = impactMetrics.find((m: any) => m.id === impact.metricId);
        const afterValue = Number(impact.value ?? 0);
        const beforeValue = Number(impact.baselineValue ?? Math.floor(afterValue * 0.3));
        
        return {
          label: metric?.name || "Impact Metric",
          before: beforeValue,
          after: afterValue,
          unit: metric?.unit || "units"
        };
      });

      return {
        id: project.id.toString(),
        name: project.name,
        description: project.description || "",
        metrics,
        location: project.location || "Unknown Location",
        date: project.startDate || project.createdAt
      };
    }).filter((p: any) => p.metrics.length > 0);
  }, [filteredData.projects, filteredData.impacts, impactMetrics]);

  // Show loading state while fetching user
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if user not found
  if (userError || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please log in to access your dashboard.
            </p>
            <Link href="/login">
              <button className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                Go to Login
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard type already determined above
  if (!dashboardType) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 max-w-md">
          <CardHeader>
            <CardTitle>Account Setup Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Your account type hasn't been set. Please choose whether you're registering as a volunteer or organization.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/volunteer-intake">
                <button className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90">
                  I'm a Volunteer
                </button>
              </Link>
              <Link href="/organization-intake">
                <button className="w-full px-4 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90">
                  I'm an Organization
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle KPI card click to show details
  const handleKPIClick = (title: string, value: number | string) => {
    let detailData: any = {};
    
    switch (title) {
      case "Hours Contributed":
      case "Total Hours":
        // For organization dashboards, use backend-computed projectHours
        if (dashboardType === "organization" && dashboardData?.projectHours) {
          detailData = {
            title: "Total Volunteer Hours by Project",
            items: dashboardData.projectHours.map((ph: any) => ({
              id: ph.projectId,
              label: ph.projectName,
              value: `${parseFloat(ph.hours.toFixed(2))} hours`,
              organizationName: ph.organizationName,
              isProjectItem: true,
            })),
            totalHours: dashboardData.projectHours.reduce((sum: number, ph: any) => sum + ph.hours, 0),
          };
        } else {
          // For volunteers, group hours by project with individual activities
          const hoursByProject = new Map<string, { projectName: string; totalHours: number; activities: any[] }>();
          
          filteredData.activities.forEach((a: any) => {
            // Use a string key to handle both valid IDs and undefined
            const projectKey = a.projectId !== undefined && a.projectId !== null 
              ? `project_${a.projectId}` 
              : 'no_project';
            
            // Look up project name from filteredData.projects first, then fall back to global projects
            let projectName = "Unknown Project";
            if (a.projectId !== undefined && a.projectId !== null) {
              const project = filteredData.projects.find((p: any) => p.id === a.projectId) ||
                             projects.find((p: any) => p.id === a.projectId);
              projectName = project?.name || "Unknown Project";
            } else {
              projectName = "Unassigned Activities";
            }
            
            if (!hoursByProject.has(projectKey)) {
              hoursByProject.set(projectKey, {
                projectName,
                totalHours: 0,
                activities: []
              });
            }
            
            const projectData = hoursByProject.get(projectKey)!;
            projectData.totalHours += Number(a.hours) || 0;
            projectData.activities.push({
              date: a.date,
              hours: Number(a.hours) || 0,
              description: a.description || a.activityType || 'Activity'
            });
          });
          
          detailData = {
            title: "Volunteer Hours Breakdown",
            items: Array.from(hoursByProject.values()).map((data) => ({
              label: data.projectName,
              value: `${parseFloat(data.totalHours.toFixed(2))} hours total`,
              isProjectGroup: true,
              activities: data.activities.map((act: any) => ({
                date: formatDate(new Date(act.date)),
                hours: `${parseFloat(act.hours.toFixed(2))} hours`,
                description: act.description
              }))
            })),
          };
        }
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
            p.status?.toLowerCase() === "in progress" || p.status?.toLowerCase() === "active"
          ).map((p: any) => ({
            id: p.id,
            label: p.name,
            value: p.status,
            location: p.location,
            completion: `${p.completionPercentage || 0}% complete`,
            isProjectItem: true,
          })),
        };
        break;
      case "Active Volunteers":
        // Use volunteer summaries with real user data
        detailData = {
          title: "Active Volunteers",
          items: volunteerSummaries.map((volunteer: any) => ({
            id: volunteer.id,
            name: volunteer.name,
            avatar: volunteer.avatar,
            label: volunteer.name,
            value: `${volunteer.totalHours.toLocaleString()} hours`,
            project: `${volunteer.activityCount} activities`,
            projectCount: volunteer.projectCount,
            projects: volunteer.projects,
          })),
        };
        break;
      case "SDGs Addressed":
        const sdgDetails = new Map();
        filteredData.projects.forEach((project: any) => {
          if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
            project.sdgGoals.forEach((goal: number) => {
              if (!sdgDetails.has(goal)) {
                sdgDetails.set(goal, []);
              }
              sdgDetails.get(goal).push({
                name: project.name,
                id: project.id,
                completion: project.completionPercentage || 0,
              });
            });
          }
        });
        detailData = {
          title: "SDG Goals Addressed",
          items: Array.from(sdgDetails.entries()).map(([goal, projects]) => ({
            sdgNumber: goal,
            label: `SDG ${goal}`,
            value: `${projects.length} projects`,
            projectsList: projects,
            isSDG: true, // Flag to identify SDG items
          })),
        };
        break;
      case "Skills":
        detailData = {
          title: "Your Skills",
          items: (dashboardData?.volunteerProfile?.skills || []).map((skill: string) => ({
            label: skill,
            value: "Proficiency: Advanced",
            icon: "⭐",
          })),
        };
        break;
      case "Impact Score":
        // Calculate component scores for the breakdown
        const totalHours = filteredData.activities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
        const totalTasks = filteredData.tasks.length;
        const completedTasks = filteredData.tasks.filter((t: any) => t.status === "Completed").length;
        const uniqueSDGs = new Set<number>();
        filteredData.projects.forEach((p: any) => {
          if (p.sdgGoals && Array.isArray(p.sdgGoals)) {
            p.sdgGoals.forEach((goal: number) => uniqueSDGs.add(goal));
          }
        });
        const applications = filteredData.applications || [];
        const acceptedApplications = applications.filter((app: any) => app.status === 'accepted').length;
        
        const hoursScore = Math.min((totalHours / 100) * 100, 100);
        const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const sdgScore = (uniqueSDGs.size / 17) * 100;
        const matchScore = applications.length > 0 ? (acceptedApplications / applications.length) * 100 : 0;
        
        detailData = {
          title: "Impact Score Breakdown",
          items: [
            {
              label: "Hours Contribution",
              value: `${Math.round(hoursScore)} / 100`,
              weight: "40%",
              contribution: Math.round(hoursScore * 0.40),
              description: `${totalHours.toLocaleString()} hours logged`,
            },
            {
              label: "Task Completion",
              value: `${Math.round(tasksScore)} / 100`,
              weight: "30%",
              contribution: Math.round(tasksScore * 0.30),
              description: `${completedTasks} of ${totalTasks} tasks completed`,
            },
            {
              label: "SDG Coverage",
              value: `${Math.round(sdgScore)} / 100`,
              weight: "20%",
              contribution: Math.round(sdgScore * 0.20),
              description: `${uniqueSDGs.size} of 17 SDGs addressed`,
            },
            {
              label: "Application Success",
              value: `${Math.round(matchScore)} / 100`,
              weight: "10%",
              contribution: Math.round(matchScore * 0.10),
              description: `${acceptedApplications} of ${applications.length} applications accepted`,
            },
          ],
          totalScore: value,
        };
        break;
      case "Lives Touched":
        // Use projectImpacts data (real beneficiary data) instead of activities
        const beneficiariesByProject = new Map<string, { projectName: string; beneficiaries: number; volunteerCount: number; volunteers: Set<number> }>();
        const peopleMetricIdsSet = new Set((dashboardData?.peopleMetricIds || []) as number[]);
        
        // Group impacts by project, only counting people-related metrics
        (filteredData.impacts || []).forEach((impact: any) => {
          // Only count people-related metric impacts
          if (!peopleMetricIdsSet.has(impact.metricId)) return;
          
          if (impact.projectId !== undefined && impact.projectId !== null) {
            const projectKey = `project_${impact.projectId}`;
            let projectName = "Unknown Project";
            const project = filteredData.projects.find((p: any) => p.id === impact.projectId) ||
                           projects.find((p: any) => p.id === impact.projectId);
            projectName = project?.name || "Unknown Project";
            
            if (!beneficiariesByProject.has(projectKey)) {
              beneficiariesByProject.set(projectKey, {
                projectName,
                beneficiaries: 0,
                volunteerCount: 0,
                volunteers: new Set<number>()
              });
            }
            const projectData = beneficiariesByProject.get(projectKey)!;
            projectData.beneficiaries += impact.value || 0;
            if (impact.userId) {
              projectData.volunteers.add(impact.userId);
            }
          }
        });
        
        // Recalculate volunteer counts after aggregating
        beneficiariesByProject.forEach((data) => {
          data.volunteerCount = data.volunteers.size;
        });
        
        const totalBeneficiaries = kpis.livesTouched;
        const totalActivities = filteredData.activities.length;
        const totalHoursForImpact = filteredData.activities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
        const beneficiariesPerHour = totalHoursForImpact > 0 ? Math.ceil(totalBeneficiaries / totalHoursForImpact) : "0";
        
        const items: any[] = [
          {
            label: "Total Beneficiaries Reached",
            value: totalBeneficiaries.toLocaleString(),
            icon: "🌍",
            isHighlight: true,
            description: `Across ${totalActivities} activities`
          },
          {
            label: "Impact Efficiency",
            value: `${beneficiariesPerHour.toLocaleString()} people/hour`,
            icon: "⚡",
            isHighlight: true,
            description: `Based on ${totalHoursForImpact.toFixed(1)} total hours`
          }
        ];
        
        // Add Projects section
        if (beneficiariesByProject.size > 0) {
          const totalProjectVolunteers = Array.from(beneficiariesByProject.values()).reduce((total, p) => total + p.volunteerCount, 0);
          const totalProjectBeneficiaries = Array.from(beneficiariesByProject.values()).reduce((sum, p) => sum + p.beneficiaries, 0);
          items.push({
            label: "📋 Projects Impact",
            value: `${totalProjectBeneficiaries.toLocaleString()} beneficiaries`,
            isCategory: true,
            description: `${totalProjectVolunteers} volunteer${totalProjectVolunteers !== 1 ? 's' : ''} across ${beneficiariesByProject.size} project${beneficiariesByProject.size !== 1 ? 's' : ''}`
          });
          Array.from(beneficiariesByProject.values()).forEach((data) => {
            items.push({
              label: data.projectName,
              value: `${data.beneficiaries.toLocaleString()} beneficiaries`,
              description: `${data.volunteerCount} volunteer${data.volunteerCount !== 1 ? 's' : ''}`,
              isProjectGroup: true,
            });
          });
        }
        
        
        detailData = {
          title: "Lives Touched - Impact Breakdown",
          items: items,
          totalScore: totalBeneficiaries,
        };
        break;
      default:
        detailData = { title, items: [] };
    }
    
    setSelectedKPI(detailData);
  };


  if (loadingDashboard || loadingProjects) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto space-y-4 md:space-y-6 px-4 md:px-6">
      {/* Header - Mobile optimized */}
      <div className="space-y-3 md:space-y-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
              Welcome, {dashboardType === "volunteer" 
                ? (currentUser?.displayName || currentUser?.name || "Volunteer")?.split(' ')[0]
                : (orgProfile?.organization?.name || orgProfile?.user?.name || "Manager")}!
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 md:mt-2 hidden md:block">
              {dashboardType === "volunteer" 
                ? "Let's maximize your ripple effect today" 
                : "Manage your impact and volunteers"}
            </p>
          </div>
        </div>
        
        {/* Controls Grid - hidden on mobile for cleaner look */}
        <div className={`hidden md:grid gap-3 md:gap-4 w-full ${dashboardType === "organization" ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"}`}>
          {/* Project Filter */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="project-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="project-filter" className="w-full">
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
          
          {/* Time Filter */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="time-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period</Label>
            <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
              <SelectTrigger id="time-filter" className="w-full">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>


        </div>
      </div>

      {/* Dashboard Content Wrapper for PDF Export */}
      <div id="dashboard-content" className="space-y-6">

      {/* Mobile Quick Actions - Grid 4 columns on mobile */}
      <div className="md:hidden">
        <div className="grid grid-cols-4 gap-1">
          <Link href="/log-activity" className="w-full aspect-square">
            <Button variant="outline" size="sm" className="w-full h-full px-1.5 text-xs rounded-lg bg-blue-50 border-blue-200 text-blue-700 active:scale-95 transition-transform flex flex-col items-center justify-center gap-0.5">
              <Clock className="h-4 w-4" />
              <span>Log</span>
            </Button>
          </Link>
          {dashboardType === "volunteer" ? (
            <Link href="/discover-opportunities" className="w-full aspect-square">
              <Button variant="outline" size="sm" className="w-full h-full px-1.5 text-xs rounded-lg bg-amber-50 border-amber-200 text-amber-700 active:scale-95 transition-transform flex flex-col items-center justify-center gap-0.5">
                <Target className="h-4 w-4" />
                <span>Find</span>
              </Button>
            </Link>
          ) : (
            <Link href="/projects" className="w-full aspect-square">
              <Button variant="outline" size="sm" className="w-full h-full px-1.5 text-xs rounded-lg bg-green-50 border-green-200 text-green-700 active:scale-95 transition-transform flex flex-col items-center justify-center gap-0.5">
                <Building2 className="h-4 w-4" />
                <span>Projects</span>
              </Button>
            </Link>
          )}
          <Link href="/my-work" className="w-full aspect-square">
            <Button variant="outline" size="sm" className="w-full h-full px-1.5 text-xs rounded-lg bg-purple-50 border-purple-200 text-purple-700 active:scale-95 transition-transform flex flex-col items-center justify-center gap-0.5">
              <CheckSquare className="h-4 w-4" />
              <span>Work</span>
            </Button>
          </Link>
          <Link href="/calendar" className="w-full aspect-square">
            <Button variant="outline" size="sm" className="w-full h-full px-1.5 text-xs rounded-lg bg-slate-50 border-slate-200 text-slate-700 active:scale-95 transition-transform flex flex-col items-center justify-center gap-0.5">
              <Zap className="h-4 w-4" />
              <span>Cal</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards - Gradient backgrounds for PWA look */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
        {dashboardType === "volunteer" ? (
          <>
            <StatsCard
              title="Hours Logged"
              value={kpis.hours}
              icon={<Clock className="h-6 w-6" />}
              onClick={() => handleKPIClick("Hours Contributed", kpis.hours)}
              compact={true}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700"
              data-testid="kpi-hours"
            />
            <StatsCard
              title="Tasks"
              value={kpis.tasks}
              icon={<CheckSquare className="h-6 w-6" />}
              onClick={() => handleKPIClick("Tasks Completed", kpis.tasks)}
              compact={true}
              gradient="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700"
              data-testid="kpi-tasks"
            />
            <StatsCard
              title="Projects"
              value={kpis.activeProjects}
              icon={<Target className="h-6 w-6" />}
              onClick={() => handleKPIClick("Active Projects", kpis.activeProjects)}
              compact={true}
              gradient="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700"
              data-testid="kpi-projects"
            />
            <StatsCard
              title="Skills"
              value={kpis.skills}
              icon={<Briefcase className="h-6 w-6" />}
              onClick={() => handleKPIClick("Skills", kpis.skills)}
              compact={true}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700"
              data-testid="kpi-skills"
            />
            <StatsCard
              title="Lives Touched"
              value={kpis.livesTouched}
              icon={<Globe className="h-6 w-6" />}
              onClick={() => handleKPIClick("Lives Touched", kpis.livesTouched)}
              compact={true}
              gradient="bg-gradient-to-br from-red-500 to-pink-500 dark:from-red-600 dark:to-pink-600"
              data-testid="kpi-lives-touched"
            />
          </>
        ) : (
          <>
            <StatsCard
              title="Active Volunteers"
              value={kpis.volunteers}
              icon={<Users className="h-6 w-6" />}
              onClick={() => handleKPIClick("Active Volunteers", kpis.volunteers)}
              compact={true}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700"
              data-testid="kpi-volunteers"
            />
            <StatsCard
              title="Active Projects"
              value={kpis.activeProjects}
              icon={<Building2 className="h-6 w-6" />}
              onClick={() => handleKPIClick("Active Projects", kpis.activeProjects)}
              compact={true}
              gradient="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700"
              data-testid="kpi-projects"
            />
            <StatsCard
              title="Total Hours"
              value={kpis.hours}
              icon={<Clock className="h-6 w-6" />}
              onClick={() => handleKPIClick("Total Hours", kpis.hours)}
              compact={true}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700"
              data-testid="kpi-hours"
            />
            <StatsCard
              title="SDGs Addressed"
              value={kpis.sdgs}
              icon={<Globe className="h-6 w-6" />}
              onClick={() => handleKPIClick("SDGs Addressed", kpis.sdgs)}
              compact={true}
              gradient="bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700"
              data-testid="kpi-sdgs"
            />
            <StatsCard
              title="Lives Touched"
              value={kpis.livesTouched}
              icon={<Globe className="h-6 w-6" />}
              onClick={() => handleKPIClick("Lives Touched", kpis.livesTouched)}
              compact={true}
              gradient="bg-gradient-to-br from-red-500 to-pink-500 dark:from-red-600 dark:to-pink-600"
              data-testid="kpi-lives-touched"
            />
          </>
        )}
      </div>

      {/* Lives Touched Project Breakdown - Shows beneficiaries per project */}
      {(dashboardType === "volunteer" || dashboardType === "organization") && (() => {
        const beneficiariesByProjectId = new Map<number, { projectName: string; beneficiaries: number }>();
        const peopleMetricIdsSet = new Set((dashboardData?.peopleMetricIds || []) as number[]);
        
        // For each activity with a projectId, sum its associated impacts
        (filteredData.activities || []).forEach((activity: any) => {
          if (!activity.projectId) return;
          
          // Initialize project entry if not exists
          if (!beneficiariesByProjectId.has(activity.projectId)) {
            const project = filteredData.projects.find((p: any) => p.id === activity.projectId) ||
                           projects.find((p: any) => p.id === activity.projectId);
            beneficiariesByProjectId.set(activity.projectId, {
              projectName: project?.name || "Unknown Project",
              beneficiaries: 0
            });
          }
          
          // Sum impacts for this activity that are people-related metrics
          const activityImpacts = (filteredData.impacts || []).filter((i: any) => 
            i.activityId === activity.id && peopleMetricIdsSet.has(i.metricId)
          );
          
          const projectData = beneficiariesByProjectId.get(activity.projectId)!;
          activityImpacts.forEach((impact: any) => {
            projectData.beneficiaries += impact.value || 0;
          });
        });
        
        const projectsArray = Array.from(beneficiariesByProjectId.values())
          .filter(p => p.beneficiaries > 0)
          .sort((a, b) => b.beneficiaries - a.beneficiaries);
        
        // Calculate efficiency metric
        const totalHoursForEfficiency = (filteredData.activities || []).reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
        const totalBeneficiariesEfficiency = Array.from(beneficiariesByProjectId.values()).reduce((sum, p) => sum + p.beneficiaries, 0);
        const efficiencyPerHour = totalHoursForEfficiency > 0 ? Math.ceil(totalBeneficiariesEfficiency / totalHoursForEfficiency) : 0;
        
        return projectsArray.length > 0 ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Lives Touched - By Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Efficiency metric */}
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Impact Efficiency</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{efficiencyPerHour} people/hour</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Based on {totalHoursForEfficiency.toFixed(1)} total hours</p>
                </div>
                
                {/* Project breakdown */}
                <div className="space-y-2">
                  {projectsArray.map((project, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{project.projectName}</span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 ml-2">{project.beneficiaries.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImpactChart 
          monthlyImpactData={filteredMonthlyImpactData}
          monthlyImpactTrend={filteredMonthlyImpactTrend}
          userType={currentUser?.userType}
          narrative={impactNarrative}
        />
        <SDGChart 
          projects={filteredData.projects}
          organizationSdgs={
            currentUser?.userType === 'organization' 
              ? dashboardData?.organizationPrimarySdgs 
              : undefined
          }
        />
      </div>

      {/* Projects Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Active Projects</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {(projectsWithVolunteers.length > 0 ? projectsWithVolunteers : filteredData.projects).slice(0, 6).map((project: any) => (
            <ProjectCard
              key={project.id}
              id={project.id.toString()}
              title={project.name}
              description={project.description || "No description available"}
              status={project.status as any}
              progress={project.completionPercentage || 0}
              timeRemaining={getTimeRemaining(project.endDate)}
              volunteers={project.volunteers || []}
              organizationName={project.organizationName}
              organizationId={project.organizationId}
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

      {/* Tasks and Activity Section */}
      <div className="w-full">
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className={`w-full grid ${dashboardType === 'volunteer' ? 'grid-cols-3' : 'grid-cols-2'}`} style={{overflow: 'auto'}}>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            {dashboardType === 'volunteer' && (
              <TabsTrigger value="opportunities">Find Opportunities</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="tasks" className="mt-4">
            {/* Task KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Tasks</div>
                  <div className="text-xl font-bold">{filteredData.tasks.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {filteredData.tasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">In Progress</div>
                  <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {filteredData.tasks.filter((t: any) => t.status?.toLowerCase() === 'in progress').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Completion Rate</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {filteredData.tasks.length > 0 
                      ? Math.round((filteredData.tasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length / filteredData.tasks.length) * 100)
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>
            <TaskTable tasks={formatTasksForTable(filteredData.tasks, projects)} />
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <ActivityFeed activities={formattedActivities} />
          </TabsContent>
          {dashboardType === 'volunteer' && (
            <TabsContent value="opportunities" className="mt-4">
              <OpportunitiesTab userId={userId} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Bottom Section - Profile, Events, and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileOverview userId={userId} userType={dashboardType} />
        <div className="space-y-6">
          <QuickActions 
            userType={dashboardType} 
            onContactVolunteers={() => setShowContactModal(true)}
          />
          <UpcomingEvents events={formattedEvents} />
        </div>
      </div>

      {/* Volunteer Insights Section - Only for volunteers */}
      {dashboardType === 'volunteer' && dashboardData && (
        <VolunteerInsightsSection
          volunteerProfile={dashboardData.volunteerProfile || null}
          applicationStats={dashboardData.applicationStats || { total: 0, pending: 0, accepted: 0, rejected: 0 }}
          hoursByProject={dashboardData.hoursByProject || []}
        />
      )}

      {/* Impact Reports & Stories - Only for organizations */}
      {dashboardType === 'organization' && projectImpactData.length > 0 && (
        <div className="mt-6" data-testid="section-impact-stories">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Impact Reports & Stories
          </h2>
          <ImpactStorytelling 
            projectImpacts={projectImpactData}
            savedStories={[]}
          />
        </div>
      )}

      {/* Contact Volunteer Modal */}
      {currentUser && (
        <ContactVolunteerModal
          open={showContactModal}
          onOpenChange={setShowContactModal}
          organizationUserId={currentUser.id}
        />
      )}

      {/* KPI Detail Dialog */}
      <Dialog open={!!selectedKPI} onOpenChange={(open) => !open && setSelectedKPI(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedKPI?.title}</DialogTitle>
            <DialogDescription>
              {selectedKPI?.title.includes("Impact Score") 
                ? "Your impact score breakdown across multiple dimensions"
                : selectedKPI?.title.includes("Lives Touched")
                ? "Total beneficiaries reached and impact efficiency metrics"
                : `Detailed breakdown of ${selectedKPI?.title.toLowerCase()}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Impact Score Breakdown - Only show for actual Impact Score, not Lives Touched */}
            {selectedKPI?.totalScore !== undefined && selectedKPI?.title.includes("Impact Score") && (
              <div className="mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total Impact Score</span>
                  <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {selectedKPI.totalScore} / 100
                  </span>
                </div>
              </div>
            )}

            {selectedKPI?.items.map((item: any, index: number) => {
              // Check if this is an Impact Score component item
              const isImpactScoreItem = item.weight !== undefined;
              // Check if this is a volunteer item (has avatar and id)
              const isVolunteerItem = item.avatar !== undefined && item.id;
              // Check if this is an SDG item (has isSDG flag)
              const isSDGItem = item.isSDG === true;
              // Check if this is a project item (has isProjectItem flag)
              const isProjectItem = item.isProjectItem === true;
              // Check if this is a highlight item
              const isHighlight = item.isHighlight === true;
              // Check if this is a category header
              const isCategory = item.isCategory === true;
              
              // Impact Score Component Breakdown
              if (isImpactScoreItem) {
                return (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50" data-testid={`kpi-item-${index}`}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{item.label}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Weight: {item.weight}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Score</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"
                              style={{ width: `${parseInt(item.value)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Contribution</div>
                          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            +{item.contribution}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Category Header (for Lives Touched sections)
              if (isCategory) {
                return (
                  <div key={index} className="p-4 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700 mt-4" data-testid={`kpi-item-${index}`}>
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{item.label}</h4>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.value}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
                    )}
                  </div>
                );
              }
              
              // Highlight Item (for Lives Touched key metrics)
              if (isHighlight) {
                return (
                  <div key={index} className="p-4 border-2 border-primary-300 dark:border-primary-700 rounded-lg bg-primary-50 dark:bg-primary-900/20" data-testid={`kpi-item-${index}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{item.icon}</span>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{item.label}</h4>
                    </div>
                    <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                      {item.value}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {item.description}
                      </p>
                    )}
                  </div>
                );
              }
              
              // Project Group Item (for Lives Touched projects)
              if (item.isProjectGroup && item.description) {
                return (
                  <div key={index} className="p-4 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:shadow-md transition-shadow" data-testid={`kpi-item-${index}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-2">{item.label}</h4>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">👥 Volunteers:</span>
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{item.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">🌍 Beneficiaries:</span>
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{item.value}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Project Group Item with Activity Breakdown (for Total Hours)
              if (item.isProjectGroup && item.activities) {
                return (
                  <Collapsible key={index}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" data-testid={`kpi-item-${index}`}>
                        <div className="flex justify-between items-center gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <h4 className="font-medium">{item.label}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {item.activities.length} activities • Click to view details
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                              {item.value}
                            </span>
                            <ChevronDown className="h-4 w-4 text-gray-500 transition-transform ui-open:rotate-180" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-2 bg-gray-50 dark:bg-gray-900/50">
                          {item.activities.map((activity: any, aIndex: number) => (
                            <div key={aIndex} className="p-3 bg-white dark:bg-gray-800 rounded-md border" data-testid={`activity-${index}-${aIndex}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{activity.description}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {activity.date}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 ml-2">
                                  {activity.hours}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              }

              // SDG Item with Collapsible Projects List
              if (isSDGItem) {
                return (
                  <Collapsible key={index}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" data-testid={`kpi-item-${index}`}>
                        <div className="flex justify-between items-center gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <Target className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <h4 className="font-medium">{item.label}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Click to view projects
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                              {item.value}
                            </span>
                            <ChevronDown className="h-4 w-4 text-gray-500 transition-transform ui-open:rotate-180" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-2 bg-gray-50 dark:bg-gray-900/50">
                          {item.projectsList && item.projectsList.map((project: any, pIndex: number) => (
                            <Link key={pIndex} href={`/projects/${project.id}`}>
                              <div className="p-3 bg-white dark:bg-gray-800 rounded-md hover:border-primary-500 hover:shadow-md transition-all border cursor-pointer" data-testid={`sdg-project-${project.id}`}>
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{project.name}</span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {project.completion}% complete
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              }
              
              // Regular, Volunteer, or Project Item
              const content = (
                <div className={`p-4 border rounded-lg ${isVolunteerItem || isProjectItem ? 'hover:border-primary-500 hover:shadow-md transition-all cursor-pointer' : ''}`} data-testid={`kpi-item-${index}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      {isVolunteerItem && (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={item.avatar} alt={`${item.name} avatar`} />
                          <AvatarFallback>{item.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.label}</h4>
                        {item.project && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.project}
                          </p>
                        )}
                        {item.projects && item.projects.length > 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Projects: {item.projects.slice(0, 2).join(", ")}
                            {item.projects.length > 2 && ` +${item.projects.length - 2} more`}
                          </p>
                        )}
                        {item.location && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Location: {item.location}
                          </p>
                        )}
                        {item.completion && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Progress: {item.completion}
                          </p>
                        )}
                      </div>
                    </div>
                    {item.value && (
                      <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                        {item.value}
                      </span>
                    )}
                  </div>
                </div>
              );

              // Wrap in Link if it's a volunteer or project item
              if (isVolunteerItem) {
                return (
                  <Link key={index} href={`/volunteers/${item.id}`}>
                    {content}
                  </Link>
                );
              } else if (isProjectItem) {
                return (
                  <Link key={index} href={`/projects/${item.id}`}>
                    {content}
                  </Link>
                );
              } else {
                return <div key={index}>{content}</div>;
              }
            })}
            {selectedKPI?.items.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No data available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

// Helper functions
function formatTasksForTable(tasks: any[], projects: any[]): Task[] {
  return tasks.map((task: any) => {
    // Use projectName from backend if available (already enriched), otherwise look it up
    const projectName = task.projectName || 
                       projects.find((p: any) => p.id === task.projectId)?.name || 
                       "Unknown Project";
    
    return {
      id: task.id.toString(),
      name: task.title,
      project: projectName,
      projectName: projectName, // Add projectName field for TaskTable compatibility
      dueDate: task.dueDate ? formatDate(new Date(task.dueDate)) : "No due date",
      status: task.status,
      // Use enriched assignee data from backend if available
      assignee: task.assignee ? {
        id: task.assignee.id.toString(),
        name: task.assignee.name,
        avatar: task.assignee.avatar,
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

function getEventType(eventType: string): "primary" | "success" | "info" | "warning" {
  const typeMap: Record<string, "primary" | "success" | "info" | "warning"> = {
    volunteer_shift: "primary",
    meeting: "info",
    deadline: "warning",
    training: "success",
  };
  return typeMap[eventType] || "info";
}
