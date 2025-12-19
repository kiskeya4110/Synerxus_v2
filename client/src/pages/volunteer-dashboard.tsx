import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { extractSdgsFromProjects } from "@/lib/utils";
import { Users, Clock, CheckSquare, Globe, Building2, Award, TrendingUp, Target, Briefcase, AlertCircle, Zap, FileText, BarChart3, ArrowUp, PieChart, Flame, Calendar } from "lucide-react";
import StatsCard from "@/components/dashboard/stats-card";
import { PageTransition } from "@/components/ui/page-transition";
import { StaggerContainer, StaggerItem } from "@/components/ui/animated-container";
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
import MobilePWAView from "@/components/volunteer/mobile-pwa-view";
import { useIsMobile } from "@/hooks/use-mobile";
import VolunteerNav from "@/components/layout/volunteer-nav";
interface Html2PdfInstance {
  set(options: Record<string, any>): { from(element: HTMLElement): { save(): void } };
}
declare const html2pdf: { (): Html2PdfInstance };

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const userType = localStorage.getItem('userType');
  const userId = localStorage.getItem('currentUserId');

  // All useState hooks must be called before any conditional returns
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  interface KPIState {
    title: string;
    items: Record<string, any>[];
    totalScore?: number;
  }
  const [selectedKPI, setSelectedKPI] = useState<KPIState | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Detect if on mobile device for PWA vs desktop navigation
  const isMobile = useIsMobile();

  // Read tab parameter from URL for PWA navigation
  const initialTab = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'projects', 'log-activity', 'potential', 'impacts', 'stories', 'more', 'profile', 'messages'].includes(tab)) {
      return tab as 'dashboard' | 'projects' | 'log-activity' | 'potential' | 'impacts' | 'stories' | 'more' | 'profile' | 'messages';
    }
    return undefined;
  }, []);

  // Redirect corporate partners to CSR Dashboard using useEffect
  useEffect(() => {
    if (userType === 'corporate-partner') {
      navigate('/csr-dashboard');
    }
  }, [userType, navigate]);

  // Fetch current user from database
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

  // Fetch AIU summary for volunteer users
  interface AIUSummary {
    volunteerId: number;
    volunteerName: string;
    totalAiu: number;
    aiuUnique: number;
    aiuSessions: number;
    totalHours: number;
    projectCount: number;
    sdgsContributed: number[];
    verificationRate: number;
    projects: Array<{
      projectId: number;
      projectName: string;
      aiu: number;
      hours: number;
      role: string;
      sdgIndicator: string;
    }>;
  }
  const { data: aiuSummary } = useQuery<AIUSummary | null>({
    queryKey: ["/api/aiu/volunteer", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/aiu/volunteer/${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId && currentUser?.userType === 'volunteer',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
  // Use aiuSummary from dedicated AIU endpoint for accurate metrics
  const kpis = useMemo(() => {
    // Get skills count - use skillsCount from summary, fallback to volunteerProfile.skills.length
    const skillsCount = dashboardData?.skillsCount ?? dashboardData?.volunteerProfile?.skills?.length ?? 0;

    // When "all" is selected or no filter, use backend KPIs directly
    if (selectedProject === "all") {
      // Use totalProjects (all assigned) for volunteer dashboard, not just activeProjects
      // This gives volunteers visibility into all their project involvement
      const projectCount = dashboardData?.totalProjects ?? dashboardData?.activeProjects ?? 0;

      return {
        volunteers: dashboardData?.activeVolunteers || 0,
        hours: Math.round(dashboardData?.totalHours || 0),
        tasks: dashboardData?.totalTasks || 0,
        completedTasks: dashboardData?.completedTasks || 0,
        activeProjects: projectCount,
        sdgs: dashboardData?.sdgsAddressed || 0,
        impactScore: dashboardData?.impactScore || 0,
        skills: skillsCount,
        // Use accurate AIU data from dedicated endpoint, fallback to dashboard data
        aiuEarned: aiuSummary?.totalAiu ?? dashboardData?.totalAiuEarned ?? 0,
        aiuVerificationRate: aiuSummary?.verificationRate ?? 0,
        aiuProjects: aiuSummary?.projects ?? [],
      };
    }

    // When a specific project is filtered, calculate filtered KPIs
    const filteredHours = filteredData.activities.reduce((sum: number, activity: any) => sum + (activity.hours || 0), 0);
    const filteredTotalTasks = filteredData.tasks.length;
    const filteredCompletedTasks = filteredData.tasks.filter((t: any) => t.status?.toLowerCase() === "completed").length;
    // Show all filtered projects (not just active) for consistency
    const filteredProjectsCount = filteredData.projects.length;

    // Calculate unique SDGs from filtered projects using shared utility
    const uniqueSDGsArray = extractSdgsFromProjects(filteredData.projects);
    const uniqueSDGs = new Set(uniqueSDGsArray);

    // Filter AIU projects by selected project
    const selectedProjectId = parseInt(selectedProject);
    const filteredAiuProjects = (aiuSummary?.projects ?? []).filter(
      (p: any) => p.projectId === selectedProjectId
    );
    const filteredAiu = filteredAiuProjects.reduce((sum: number, p: any) => sum + (p.aiu || 0), 0);

    return {
      volunteers: dashboardData?.activeVolunteers || 0,
      hours: Math.round(filteredHours),
      tasks: filteredTotalTasks,
      completedTasks: filteredCompletedTasks,
      activeProjects: filteredProjectsCount,
      sdgs: uniqueSDGs.size,
      impactScore: dashboardData?.impactScore || 0,
      skills: skillsCount,
      livesTouched: dashboardData?.totalPeopleImpacted || 0,
      // For organizations, use server-calculated totalAiuEarned; for volunteers, use filtered AIU
      aiuEarned: dashboardData?.totalAiuEarned ?? filteredAiu ?? 0,
      aiuVerificationRate: aiuSummary?.verificationRate ?? 0,
      aiuProjects: filteredAiuProjects,
    };
  }, [dashboardData, filteredData, selectedProject, aiuSummary]);

  // Calculate Impact Streak data
  const impactStreakData = useMemo(() => {
    const activities = filteredData.activities || [];
    if (!activities || activities.length === 0) {
      return { currentStreak: 0, bestStreak: 0, lastActivityDate: null, streakMessage: "Start your streak today!" };
    }

    // Parse dates and sort in descending order, filtering out invalid dates
    const dateStrings: string[] = Array.from(
      new Set(
        activities
          .filter((a: any) => a.date && !isNaN(new Date(a.date).getTime()))
          .map((a: any) => {
            const date = new Date(a.date);
            return date.toISOString().split("T")[0];
          })
      )
    ) as string[];
    const uniqueDates = dateStrings
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    if (uniqueDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0, lastActivityDate: null, streakMessage: "Start your streak today!" };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 1;
    const lastActivityDate = uniqueDates[0];

    // Check if the most recent date is today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mostRecentDate = new Date(uniqueDates[0]);
    mostRecentDate.setHours(0, 0, 0, 0);

    // Only count if activity was recent (today or yesterday)
    if (
      mostRecentDate.getTime() === today.getTime() ||
      mostRecentDate.getTime() === yesterday.getTime()
    ) {
      currentStreak = 1;

      // Calculate consecutive days
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        prevDate.setHours(0, 0, 0, 0);
        currDate.setHours(0, 0, 0, 0);

        const diffTime = prevDate.getTime() - currDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          tempStreak++;
          currentStreak = tempStreak;
        } else {
          break;
        }
      }
    }

    // Calculate best streak
    tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);

      const diffTime = prevDate.getTime() - currDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    const streakMessage =
      currentStreak === 0
        ? "Start your streak today!"
        : currentStreak === 1
          ? "You're on fire! 🔥"
          : currentStreak < 7
            ? "Keep it up! 💪"
            : currentStreak < 30
              ? "Amazing streak! 🚀"
              : "Unstoppable! ⚡";

    return { currentStreak, bestStreak, lastActivityDate, streakMessage };
  }, [filteredData.activities]);

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
          items: filteredData.tasks.filter((t: any) => t.status?.toLowerCase() === "completed").map((t: any) => ({
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
        // Use shared utility for consistent SDG counting
        const uniqueSDGsArray = extractSdgsFromProjects(filteredData.projects);
        const uniqueSDGs = new Set(uniqueSDGsArray);
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
      case "AIUs Earned":
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
        
        const totalBeneficiaries = kpis.aiuEarned;
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
          title: "AIU Breakdown - Impact Details",
          items: items,
          totalScore: totalBeneficiaries,
        };
        break;
      case "Impact Streak":
        // Get recent activity dates for display
        const recentActivityDates = (filteredData.activities || [])
          .filter((a: any) => a.date && !isNaN(new Date(a.date).getTime()))
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 7)
          .map((a: any) => ({
            date: formatDate(new Date(a.date)),
            hours: a.hours || 0,
            project: projects.find((p: any) => p.id === a.projectId)?.name || "Unknown Project"
          }));

        detailData = {
          title: "Impact Streak Details",
          items: [
            {
              label: "Current Streak",
              value: `${impactStreakData.currentStreak} days`,
              icon: "🔥",
              isHighlight: true,
              description: impactStreakData.streakMessage
            },
            {
              label: "Best Streak",
              value: `${impactStreakData.bestStreak} days`,
              icon: "🏆",
              isHighlight: true,
              description: "Your longest consecutive activity streak"
            },
            {
              label: "30-Day Goal Progress",
              value: `${Math.min(impactStreakData.currentStreak, 30)} / 30 days`,
              icon: "🎯",
              isHighlight: true,
              description: impactStreakData.currentStreak >= 30
                ? "Goal reached! Amazing dedication! 🎉"
                : `${30 - impactStreakData.currentStreak} more days to reach your 30-day milestone`
            },
            ...(recentActivityDates.length > 0 ? [{
              label: "📅 Recent Activity History",
              value: `${recentActivityDates.length} recent activities`,
              isCategory: true,
              description: "Your latest volunteer activities"
            }] : []),
            ...recentActivityDates.map((activity: any) => ({
              label: activity.project,
              value: `${formatNumber(activity.hours)} hours`,
              description: activity.date,
              isProjectGroup: false,
            }))
          ],
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

  // Return null while redirecting corporate partners
  if (userType === 'corporate-partner') {
    return null;
  }

  // Mobile PWA View for Volunteers - Only show on mobile devices
  const isVolunteer = dashboardType === 'volunteer';

  // Mobile volunteers get the PWA view with bottom navigation
  if (isVolunteer && isMobile && userId && currentUser) {
    return <MobilePWAView userId={userId} user={currentUser} dashboardData={dashboardData} initialActiveTab={initialTab} />;
  }

  // Desktop volunteers get the web view with top navigation
  if (isVolunteer && userId && currentUser) {
    // Calculate goal progress for visual rings
    const hoursGoal = dashboardData?.volunteerProfile?.weeklyAvailability ? dashboardData.volunteerProfile.weeklyAvailability * 52 : 100;
    const hoursProgress = Math.min(((dashboardData?.totalHours || 0) / hoursGoal) * 100, 100);
    const tasksProgress = kpis.tasks > 0 ? Math.min((kpis.completedTasks / kpis.tasks) * 100, 100) : 0;
    const projectsGoal = 5; // Target projects
    const projectsProgress = Math.min((kpis.activeProjects / projectsGoal) * 100, 100);

    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 overflow-y-auto pb-8">

          {/* Hero Section - Benevity-inspired Impact Summary */}
          <div className="relative overflow-hidden">
            {/* Background gradient with subtle pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 opacity-95" />
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 2px, transparent 2px)',
                backgroundSize: '60px 60px'
              }} />
            </div>

            <div className="relative container mx-auto px-4 sm:px-6 py-8 md:py-12">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
                {/* Left: Welcome & Profile */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-white/30 shadow-2xl ring-4 ring-white/20">
                      <AvatarImage
                        src={dashboardData?.volunteerProfile?.profilePhotoUrl || currentUser?.profilePicture}
                        alt={currentUser?.displayName || 'Volunteer'}
                      />
                      <AvatarFallback className="bg-white/20 text-white text-xl md:text-2xl font-bold backdrop-blur-sm">
                        {(currentUser?.displayName || currentUser?.username || 'V').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white/70 text-sm font-medium">Welcome back,</p>
                      <h1 className="text-2xl md:text-3xl font-bold text-white">
                        {(currentUser?.displayName || currentUser?.name || "Volunteer")?.split(' ')[0]}!
                      </h1>
                    </div>
                  </div>
                  <p className="text-white/80 text-base md:text-lg max-w-lg">
                    You're making a difference. Here's your impact journey at a glance.
                  </p>

                  {/* Quick Stats Pills */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {dashboardData?.volunteerProfile?.skills?.slice(0, 3).map((skill: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-white/15 backdrop-blur-sm text-white rounded-full text-sm font-medium border border-white/20">
                        {skill}
                      </span>
                    ))}
                    {(dashboardData?.volunteerProfile?.skills?.length ?? 0) > 3 && (
                      <span className="px-3 py-1.5 bg-white/10 text-white/70 rounded-full text-sm">
                        +{(dashboardData?.volunteerProfile?.skills?.length ?? 0) - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Impact Rings */}
                <div className="flex gap-6 md:gap-8">
                  {/* Hours Ring */}
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-24 h-24 md:w-28 md:h-28">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          stroke="white"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${hoursProgress * 2.83} 283`}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl md:text-2xl font-bold text-white">{formatNumber(dashboardData?.totalHours)}</span>
                        <span className="text-xs text-white/70">hours</span>
                      </div>
                    </div>
                    <p className="text-white/80 text-xs mt-2 font-medium">Contributed</p>
                  </div>

                  {/* People Impacted Ring */}
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-24 h-24 md:w-28 md:h-28">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          stroke="#34d399"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.min((dashboardData?.totalPeopleImpacted || 0) / 10, 100) * 2.83} 283`}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl md:text-2xl font-bold text-white">{dashboardData?.totalPeopleImpacted || 0}</span>
                        <span className="text-xs text-white/70">people</span>
                      </div>
                    </div>
                    <p className="text-white/80 text-xs mt-2 font-medium">Impacted</p>
                  </div>

                  {/* Impact Score Ring */}
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-24 h-24 md:w-28 md:h-28">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          stroke="#fbbf24"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.min(dashboardData?.impactScore || 0, 100) * 2.83} 283`}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl md:text-2xl font-bold text-white">{dashboardData?.impactScore || 0}</span>
                        <span className="text-xs text-white/70">score</span>
                      </div>
                    </div>
                    <p className="text-white/80 text-xs mt-2 font-medium">Impact Score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <div className="container mx-auto px-4 sm:px-6 mt-6 space-y-6">

            {/* Filters Bar - Compact */}
            <div className="flex items-center justify-end gap-3">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[160px] border-gray-200 bg-white dark:bg-gray-800">
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
              <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
                <SelectTrigger className="w-[130px] border-gray-200 bg-white dark:bg-gray-800">
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

            {/* Stats Cards - Enhanced Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 cursor-pointer group" onClick={() => handleKPIClick("Hours Contributed", kpis.hours)}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs md:text-sm font-medium">Hours Logged</p>
                      <p className="text-white text-2xl md:text-3xl font-bold mt-1">{formatNumber(kpis.hours)}</p>
                      {dashboardData?.hoursTrend && (
                        <p className="text-blue-200 text-xs mt-1 flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" /> {dashboardData.hoursTrend}
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 cursor-pointer group" onClick={() => handleKPIClick("Active Projects", kpis.activeProjects)}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-xs md:text-sm font-medium">Active Projects</p>
                      <p className="text-white text-2xl md:text-3xl font-bold mt-1">{kpis.activeProjects}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-violet-600 border-0 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 cursor-pointer group" onClick={() => handleKPIClick("Tasks Completed", kpis.tasks)}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs md:text-sm font-medium">Tasks</p>
                      <p className="text-white text-2xl md:text-3xl font-bold mt-1">{kpis.completedTasks}/{kpis.tasks}</p>
                      <p className="text-purple-200 text-xs mt-1">{formatNumber(tasksProgress)}% complete</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <CheckSquare className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 cursor-pointer group" onClick={() => handleKPIClick("Skills", kpis.skills)}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-xs md:text-sm font-medium">Skills</p>
                      <p className="text-white text-2xl md:text-3xl font-bold mt-1">{kpis.skills}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 border-0 shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 cursor-pointer group" onClick={() => handleKPIClick("AIUs Earned", kpis.aiuEarned)}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-xs md:text-sm font-medium">AIUs Earned</p>
                      <p className="text-white text-2xl md:text-3xl font-bold mt-1">{formatNumber(kpis.aiuEarned)}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300 cursor-pointer group" onClick={() => handleKPIClick("Impact Streak", impactStreakData.currentStreak)}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-xs md:text-sm font-medium">Impact Streak</p>
                      <p className="text-white text-2xl md:text-3xl font-bold mt-1">{impactStreakData.currentStreak} days</p>
                      <p className="text-orange-200 text-xs mt-1">{impactStreakData.streakMessage}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Flame className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SDG Contributions (1/3) + Impact Over Time (2/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* SDG Contributions - 1/3 width */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg border-0 lg:col-span-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Globe className="h-5 w-5 text-emerald-600" />
                      SDG Contributions
                    </CardTitle>
                    <Link href="/sdg-mapping">
                      <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <SDGChart projects={filteredData.projects || []} />
                </CardContent>
              </Card>

              {/* Impact Over Time - 2/3 width */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg border-0 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Your Impact Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ImpactChart monthlyImpactData={filteredMonthlyImpactData} narrative={impactNarrative} userType="volunteer" />
                </CardContent>
              </Card>
            </div>

            {/* My Projects, Recent Tasks, Recent Activity - 3 Column Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* My Projects */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      My Projects
                    </CardTitle>
                    <Link href="/projects">
                      <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredData.projects?.slice(0, 4).map((project: any) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors text-sm">
                              {project.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {project.status || 'Active'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {project.completionPercentage || 0}%
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {(!filteredData.projects || filteredData.projects.length === 0) && (
                      <div className="text-center py-6">
                        <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No projects yet</p>
                        <Link href="/discover-opportunities">
                          <Button variant="link" size="sm" className="text-purple-600 mt-1">
                            Find Opportunities
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Tasks */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-amber-600" />
                      Recent Tasks
                    </CardTitle>
                    <Link href="/my-work">
                      <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredData.tasks?.slice(0, 4).map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status?.toLowerCase() === 'completed' ? 'bg-green-500' :
                          task.status?.toLowerCase() === 'in progress' || task.status?.toLowerCase() === 'in_progress' ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                            {task.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {task.status || 'Pending'} {task.dueDate && `• Due ${new Date(task.dueDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!filteredData.tasks || filteredData.tasks.length === 0) && (
                      <div className="text-center py-6">
                        <CheckSquare className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      Recent Activity
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredData.activities?.slice(0, 4).map((activity: any) => {
                      const project = filteredData.projects?.find((p: any) => p.id === activity.projectId);
                      return (
                        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Clock className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {activity.hours} hours logged
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {project?.name || 'Project'} • {activity.date ? new Date(activity.date).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {(!filteredData.activities || filteredData.activities.length === 0) && (
                      <div className="text-center py-6">
                        <Zap className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No activity yet</p>
                        <Link href="/log-activity">
                          <Button variant="link" size="sm" className="text-blue-600 mt-1">
                            Log Hours
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events */}
            {formattedEvents.length > 0 && (
              <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-indigo-600" />
                      Upcoming Events
                    </CardTitle>
                    <Link href="/calendar">
                      <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                        View Calendar
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <UpcomingEvents events={formattedEvents} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* KPI Detail Dialog for Volunteer Web View */}
        <Dialog open={!!selectedKPI} onOpenChange={(open) => !open && setSelectedKPI(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedKPI?.title}</DialogTitle>
              <DialogDescription>
                {selectedKPI?.title?.includes("Impact Score")
                  ? "Your impact score breakdown across multiple dimensions"
                  : selectedKPI?.title?.includes("AIU")
                  ? "Total beneficiaries reached and impact efficiency metrics"
                  : `Detailed breakdown of ${selectedKPI?.title?.toLowerCase() || 'metric'}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Impact Score Breakdown */}
              {selectedKPI?.totalScore !== undefined && selectedKPI?.title?.includes("Impact Score") && (
                <div className="mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Total Impact Score</span>
                    <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {selectedKPI.totalScore} / 100
                    </span>
                  </div>
                </div>
              )}

              {selectedKPI?.items?.map((item: any, index: number) => {
                const isImpactScoreItem = item.weight !== undefined;
                const isHighlight = item.isHighlight === true;
                const isCategory = item.isCategory === true;

                if (isImpactScoreItem) {
                  return (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
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
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"
                                style={{ width: `${parseInt(item.value)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            +{item.contribution}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isCategory) {
                  return (
                    <div key={index} className="p-4 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700 mt-4">
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

                if (isHighlight) {
                  return (
                    <div key={index} className="p-4 border-2 border-primary-300 dark:border-primary-700 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{item.icon}</span>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.label}</h4>
                      </div>
                      <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                        {item.value}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                      )}
                    </div>
                  );
                }

                if (item.isProjectGroup && item.activities) {
                  return (
                    <Collapsible key={index}>
                      <div className="border rounded-lg">
                        <CollapsibleTrigger className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div className="flex-1 text-left">
                                <h4 className="font-medium">{item.label}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.activities.length} activities
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                                {item.value}
                              </span>
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t p-4 space-y-2 bg-gray-50 dark:bg-gray-900/50">
                            {item.activities.map((activity: any, aIndex: number) => (
                              <div key={aIndex} className="p-3 bg-white dark:bg-gray-800 rounded-md border">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{activity.description}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.date}</p>
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

                return (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.label}</h4>
                        {item.project && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.project}</p>
                        )}
                        {item.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                        )}
                      </div>
                      {item.value && (
                        <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                          {item.value}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!selectedKPI?.items || selectedKPI?.items.length === 0) && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No data available
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 overflow-y-auto overflow-x-hidden space-y-5 md:space-y-6 px-4 md:px-24 pb-8 w-full max-w-full">
      {/* Header - Enhanced PWA-style */}
      <div className="space-y-4 md:space-y-6 pt-4 md:pt-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="hidden md:block p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Welcome back, {dashboardType === "volunteer"
                    ? (currentUser?.displayName || currentUser?.name || "Volunteer")?.split(' ')[0]
                    : (orgProfile?.organization?.name || orgProfile?.user?.name || "Manager")}!
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardType === "volunteer"
                    ? "Your dashboard to track impact and grow your contribution"
                    : "Manage your impact and volunteers"}
                </p>
              </div>
            </div>
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

      {/* Personal Profile Section - Only for Volunteers - Enhanced PWA-style */}
      {dashboardType === "volunteer" && dashboardData?.volunteerProfile && (
        <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl">
          <div className="relative">
            {/* Gradient banner behind profile */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-500 opacity-90" />
            <CardContent className="relative p-4 md:p-6" style={{ minHeight: '12.5vh' }}>
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full">
                {/* Left: Profile Picture (1/4) */}
                <div className="w-full md:w-1/4 flex items-center justify-center md:justify-start -mt-2 md:mt-6">
                  <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-white dark:border-gray-800 shadow-2xl ring-4 ring-amber-400/30">
                    <AvatarImage
                      src={dashboardData.volunteerProfile.profilePhotoUrl || currentUser?.profilePicture}
                      alt={currentUser?.displayName || 'Volunteer'}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white text-4xl md:text-5xl font-bold">
                      {(currentUser?.displayName || currentUser?.name || 'V').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

              {/* Right: Details (3/4) */}
              <div className="w-full md:w-3/4 flex flex-col justify-center space-y-3">
                {/* Skills */}
                {dashboardData.volunteerProfile.skills && dashboardData.volunteerProfile.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-600" />
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {dashboardData.volunteerProfile.skills.slice(0, 6).map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full shadow-sm hover:shadow-md transition-shadow"
                        >
                          {skill}
                        </span>
                      ))}
                      {dashboardData.volunteerProfile.skills.length > 6 && (
                        <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                          +{dashboardData.volunteerProfile.skills.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Availability */}
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      Availability
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dashboardData.volunteerProfile.weeklyAvailability
                        ? `${dashboardData.volunteerProfile.weeklyAvailability} hours/week`
                        : 'Not specified'}
                    </p>
                  </div>

                  {/* Professional Title */}
                  {dashboardData.volunteerProfile.professionalTitle && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-blue-600" />
                        Role
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {dashboardData.volunteerProfile.professionalTitle}
                      </p>
                    </div>
                  )}
                </div>

                {/* SDGs You Support */}
                {(aiuSummary?.sdgsContributed && aiuSummary.sdgsContributed.length > 0) ||
                 (dashboardData.volunteerProfile.sdgs && dashboardData.volunteerProfile.sdgs.length > 0) ? (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-600" />
                      SDGs I Champion
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(aiuSummary?.sdgsContributed || dashboardData.volunteerProfile.sdgs || []).slice(0, 8).map((sdg: number) => (
                        <span
                          key={sdg}
                          className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded-full shadow-sm hover:shadow-md transition-shadow"
                          title={`Sustainable Development Goal ${sdg}`}
                        >
                          SDG {sdg}
                        </span>
                      ))}
                      {((aiuSummary?.sdgsContributed || dashboardData.volunteerProfile.sdgs)?.length || 0) > 8 && (
                        <span className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                          +{((aiuSummary?.sdgsContributed || dashboardData.volunteerProfile.sdgs)?.length || 0) - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Personal Statement / Motivations */}
                {dashboardData.volunteerProfile.motivations && (
                  <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Why I Volunteer
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                      "{dashboardData.volunteerProfile.motivations}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          </div>
        </Card>
      )}

      {/* Dashboard Content Wrapper for PDF Export */}
      <div id="dashboard-content" className="space-y-6">

      {/* Mobile Quick Actions - Grid 4 columns on mobile */}
      <div className="md:hidden mt-4">
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
      <StaggerContainer className="grid grid-cols-3 md:grid-cols-5 gap-1">
        {dashboardType === "volunteer" ? (
          <>
            <StaggerItem>
              <StatsCard
              title="Hours Logged"
              value={kpis.hours}
              icon={<Clock className="h-6 w-6" />}
              onClick={() => handleKPIClick("Hours Contributed", kpis.hours)}
              compact={true}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700"
              data-testid="kpi-hours"
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
              title="Tasks"
              value={kpis.tasks}
              icon={<CheckSquare className="h-6 w-6" />}
              onClick={() => handleKPIClick("Tasks Completed", kpis.tasks)}
              compact={true}
              gradient="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700"
              data-testid="kpi-tasks"
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
              title="Projects"
              value={kpis.activeProjects}
              icon={<Target className="h-6 w-6" />}
              onClick={() => handleKPIClick("Active Projects", kpis.activeProjects)}
              compact={true}
              gradient="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700"
              data-testid="kpi-projects"
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
              title="Skills"
              value={kpis.skills}
              icon={<Briefcase className="h-6 w-6" />}
              onClick={() => handleKPIClick("Skills", kpis.skills)}
              compact={true}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700"
              data-testid="kpi-skills"
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
              title="AIUs Earned"
              value={typeof kpis.aiuEarned === 'number' ? kpis.aiuEarned.toFixed(2) : kpis.aiuEarned || 0}
              icon={<TrendingUp className="h-6 w-6" />}
              onClick={() => handleKPIClick("AIUs Earned", kpis.aiuEarned)}
              compact={true}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600"
              data-testid="kpi-aiu-earned"
              />
            </StaggerItem>
          </>
        ) : (
          <>
            <StaggerItem>
              <StatsCard
              title="Active Volunteers"
              value={kpis.volunteers}
              icon={<Users className="h-6 w-6" />}
              onClick={() => handleKPIClick("Active Volunteers", kpis.volunteers)}
              compact={true}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700"
              data-testid="kpi-volunteers"
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
              title="Active Projects"
              value={kpis.activeProjects}
              icon={<Building2 className="h-6 w-6" />}
              onClick={() => handleKPIClick("Active Projects", kpis.activeProjects)}
              compact={true}
              gradient="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700"
              data-testid="kpi-projects"
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
              title="Total Hours"
              value={kpis.hours}
              icon={<Clock className="h-6 w-6" />}
              onClick={() => handleKPIClick("Total Hours", kpis.hours)}
              compact={true}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700"
              data-testid="kpi-hours"
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
              title="SDGs Addressed"
              value={kpis.sdgs}
              icon={<Globe className="h-6 w-6" />}
              onClick={() => handleKPIClick("SDGs Addressed", kpis.sdgs)}
              compact={true}
              gradient="bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700"
              data-testid="kpi-sdgs"
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
              title="AIUs Earned"
              value={typeof kpis.aiuEarned === 'number' ? kpis.aiuEarned.toFixed(2) : kpis.aiuEarned || 0}
              icon={<TrendingUp className="h-6 w-6" />}
              onClick={() => handleKPIClick("AIUs Earned", kpis.aiuEarned)}
              compact={true}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600"
              data-testid="kpi-aiu-earned"
              />
            </StaggerItem>
          </>
        )}
      </StaggerContainer>

      {/* AIU Project Breakdown - Shows impact per project using AIU endpoint data */}
      {dashboardType === "volunteer" && aiuSummary && aiuSummary.projects && aiuSummary.projects.length > 0 && (
        <Card className="mb-6 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-emerald-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <span className="block">Your Impact Portfolio</span>
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">AIU measures your real-world contribution</span>
                </div>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Verbal Impact Summary */}
              <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {aiuSummary.totalAiu >= 10
                    ? `🌟 Outstanding! You've earned ${aiuSummary.totalAiu?.toFixed(2)} Attributable Impact Units across ${aiuSummary.projectCount} project${aiuSummary.projectCount !== 1 ? 's' : ''}. Your ${aiuSummary.totalHours?.toFixed(0) || 0} hours are creating measurable change.`
                    : aiuSummary.totalAiu >= 5
                    ? `✨ Great progress! You've accumulated ${aiuSummary.totalAiu?.toFixed(2)} AIUs. With ${aiuSummary.totalHours?.toFixed(0) || 0} hours invested, your impact is growing steadily.`
                    : `🚀 You're building momentum with ${aiuSummary.totalAiu?.toFixed(2)} AIUs earned. Every hour you contribute amplifies your positive influence!`}
                </p>
              </div>

              {/* Summary stats - Enhanced visual hierarchy */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                      <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{aiuSummary.totalAiu?.toFixed(2) || '0.00'}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total AIUs Earned</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                    {aiuSummary.projectCount === 1 ? "Your dedication to this project is paying off!" : `Distributed across ${aiuSummary.projectCount} impactful projects`}
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{aiuSummary.verificationRate || 0}%</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Verified Impact</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                    {aiuSummary.verificationRate >= 80 ? "Excellent verification rate!" : "Your contributions are being tracked"}
                  </p>
                </div>
              </div>

              {/* SDGs contributed - Enhanced */}
              {aiuSummary.sdgsContributed && aiuSummary.sdgsContributed.length > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Contributing to {aiuSummary.sdgsContributed.length} Sustainable Development Goal{aiuSummary.sdgsContributed.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiuSummary.sdgsContributed.map((sdg: number) => (
                      <span key={sdg} className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded-full shadow-sm">
                        SDG {sdg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Project breakdown - Enhanced with progress bars */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  Project-by-Project Breakdown
                </h4>
                {aiuSummary.projects.map((project: any, idx: number) => {
                  const projectShare = aiuSummary.totalAiu > 0 ? ((project.aiu || 0) / aiuSummary.totalAiu) * 100 : 0;
                  const hoursPerAiu = project.aiu > 0 ? (project.hours / project.aiu).toFixed(1) : '0';
                  return (
                    <Link key={idx} href={`/projects/${project.projectId}`}>
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-sm hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white block">{project.projectName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">{project.role}</span>
                              {project.sdgIndicator && (
                                <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">{project.sdgIndicator}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{project.aiu?.toFixed(2) || '0.00'}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">AIU</span>
                          </div>
                        </div>
                        {/* Progress bar showing project's share of total AIU */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>{project.hours?.toFixed(1) || 0}h invested</span>
                            <span>{projectShare.toFixed(0)}% of your impact</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(projectShare, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">
                            {project.aiu >= 3
                              ? `🎯 High-impact contributor • ${hoursPerAiu}h per AIU`
                              : project.aiu >= 1
                              ? `📈 Building momentum • ${hoursPerAiu}h per AIU`
                              : `🌱 Growing your impact here`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          {(projectsWithVolunteers.length > 0 ? projectsWithVolunteers : filteredData.projects).slice(0, 6).map((project: any) => {
            // Calculate project-specific metrics
            const projectTasks = filteredData.tasks.filter((t: any) => t.projectId === project.id);
            const projectActivities = filteredData.activities.filter((a: any) => a.projectId === project.id);
            const projectHours = projectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
            const completedTasks = projectTasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length;
            const projectAiu = aiuSummary?.projects?.find((p: any) => p.projectId === project.id)?.aiu || project.aiuEarned || 0;

            return (
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
                hoursLogged={Math.round(projectHours)}
                tasksCompleted={completedTasks}
                totalTasks={projectTasks.length}
                aiuEarned={projectAiu}
                sdgGoals={project.sdgGoals || []}
                showQuickActions={true}
              />
            );
          })}
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
                : selectedKPI?.title.includes("AIU")
                ? "Total beneficiaries reached and impact efficiency metrics"
                : `Detailed breakdown of ${selectedKPI?.title.toLowerCase()}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Impact Score Breakdown - Only show for actual Impact Score, not AIU */}
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
              
              // Category Header (for AIU sections)
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
              
              // Highlight Item (for AIU key metrics)
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
              
              // Project Group Item (for AIU projects)
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
      </div>
    </PageTransition>
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

  const completedTasks = projectTasks.filter((t: any) => t.status?.toLowerCase() === "completed").length;
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

// Format number to 2 decimal places if decimal, otherwise show as whole number
function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  // Check if it's a whole number
  if (Number.isInteger(num)) {
    return num.toString();
  }
  // Format to 2 decimal places
  return num.toFixed(2);
}
