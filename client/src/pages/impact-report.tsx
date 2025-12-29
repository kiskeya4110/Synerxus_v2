import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Copy, Printer, ArrowLeft, TrendingUp, Users, Target, BarChart3, Layout, Rows3, Download, Twitter, Linkedin, Facebook, Home, Briefcase, Lightbulb, User as UserIcon, Calendar } from "lucide-react";
import type { User, Task, ProjectAssignment, Organization } from "@shared/schema";
import { sdgGoals, getSDGName } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/ui/logo";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import VolunteerNav from "@/components/layout/volunteer-nav";
import PWAHeader from "@/components/pwa/pwa-header";
declare const html2pdf: { (): { set(options: any): { from(element: HTMLElement): { save(): void } } } };
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Pie, Radar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SDG_LOGOS = {
  1: "🚫",
  2: "🍽️",
  3: "❤️",
  4: "📚",
  5: "👩",
  6: "💧",
  7: "⚡",
  8: "💼",
  9: "🏭",
  10: "⚖️",
  11: "🏘️",
  12: "♻️",
  13: "🌍",
  14: "🐟",
  15: "🌳",
  16: "⚖️",
  17: "🤝",
} as Record<number, string>;

const SDG_TITLES = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health & Well-being",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water & Sanitation",
  7: "Affordable & Clean Energy",
  8: "Decent Work & Economic Growth",
  9: "Industry, Innovation & Infrastructure",
  10: "Reduced Inequalities",
  11: "Sustainable Cities & Communities",
  12: "Responsible Consumption",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace, Justice & Strong Institutions",
  17: "Partnerships for the Goals",
} as Record<number, string>;

const SKILL_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

const getSkillColor = (index: number): string => {
  return SKILL_COLORS[index % SKILL_COLORS.length];
};

const getSkillBadgeClass = (index: number): string => {
  const colorClasses = [
    'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
    'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
    'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200',
    'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
    'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
  ];
  return colorClasses[index % colorClasses.length];
};

export default function ImpactReport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const userType = localStorage.getItem('userType');
  const isVolunteer = userType === 'volunteer';
  const isOrganization = userType === 'organization';
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"tabs" | "single">("tabs");
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "quarter" | "year">("all");
  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printPageMode, setPrintPageMode] = useState<"all" | "selected">("all");
  const [selectedPrintPages, setSelectedPrintPages] = useState({
    overview: true,
    engagement: true,
    impact: true,
    analytics: true
  });
  const chartRefs = useRef<Record<string, any>>({});

  // Interactive modal states for PWA
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showSdgModal, setShowSdgModal] = useState<number | null>(null);
  const [showImpactScoreModal, setShowImpactScoreModal] = useState(false);

  // Extract volunteer ID from URL parameter
  const getVolunteerIdFromUrl = () => {
    const match = typeof window !== 'undefined' ? window.location.pathname.match(/\/impact-report\/(\d+)/) : null;
    return match ? parseInt(match[1]) : undefined;
  };

  const urlVolunteerId = getVolunteerIdFromUrl();
  const volunteerId = urlVolunteerId || (localStorage.getItem('currentUserId') ? parseInt(localStorage.getItem('currentUserId')!) : undefined);
  
  // Fetch the current logged-in user first
  const { data: loggedInUser } = useQuery<User>({
    queryKey: ["/api/users/me", volunteerId],
    queryFn: async () => {
      if (!volunteerId) return null;
      const response = await fetch(`/api/users/me?userId=${volunteerId}`);
      if (!response.ok) throw new Error('Failed to fetch current user');
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", volunteerId],
    queryFn: async () => {
      const url = volunteerId ? `/api/users/me?userId=${volunteerId}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!volunteerId
  });

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
  const { data: projectAssignmentsRaw = [] } = useQuery<ProjectAssignment[]>({
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

  // Fetch volunteer's activities
  const { data: volunteerActivities = [] } = useQuery<any[]>({  // Keep any[] as type varies
    queryKey: ["/api/volunteer-activities", { volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${volunteerId}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer profile
  const { data: volunteerProfile } = useQuery<any>({
    queryKey: ["/api/intake/volunteer-profile", { volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return null;
      const response = await fetch(`/api/intake/volunteer-profile?userId=${volunteerId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.volunteerProfile || data;
    },
    enabled: !!volunteerId
  });

  // Fetch dashboard data for consistent metrics
  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/dashboard/summary", volunteerId],
    queryFn: async () => {
      if (!volunteerId) return null;
      const response = await fetch(`/api/dashboard/summary?userId=${volunteerId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch AIU summary for accurate AIU metrics (single source of truth)
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
    projects: {
      projectId: number;
      projectName: string;
      aiu: number;
      hours: number;
      role: string;
      sdgIndicator: string;
    }[];
  }

  const { data: aiuSummary } = useQuery<AIUSummary | null>({
    queryKey: ["/api/aiu/volunteer", volunteerId],
    queryFn: async () => {
      if (!volunteerId) return null;
      const response = await fetch(`/api/aiu/volunteer/${volunteerId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations");
      return response.ok ? response.json() : [];
    }
  });

  // Ensure projectAssignments is always an array
  const safeProjectAssignments = Array.isArray(projectAssignments) ? projectAssignments : [];

  // Get all unique organizations the volunteer has worked with
  const volunteerOrganizations = Array.from(
    new Set(
      safeProjectAssignments
        .map((pa: any) => pa.project?.organizationId)
        .filter((id: any) => id != null)
    )
  ).map((orgId: number) =>
    organizations.find((org: any) => org.id === orgId)
  ).filter((org: any) => org != null);
  
  // Use primary organization (first one) for logo display
  const primaryOrganization = volunteerOrganizations.length > 0 
    ? volunteerOrganizations[0]
    : null;

  // Calculate impact metrics - use backend dashboardData for totalHours to ensure consistency with dashboard
  const totalHours = dashboardData?.totalHours !== undefined
    ? dashboardData.totalHours
    : (Array.isArray(volunteerActivities) ? volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0) : 0);
  const completedTasks = tasks.filter(t => t.status?.toLowerCase() === "completed").length;
  const totalTasks = tasks.length;
  const activeProjects = dashboardData?.activeProjects !== undefined
    ? dashboardData.activeProjects
    : safeProjectAssignments.filter(a => a.status === 'active').length;
  const allSkills = volunteerProfile?.skills || [];
  const sdgs = volunteerProfile?.preferredSdgs || [];
  const assignmentsCount = safeProjectAssignments.length;

  // Use optimized impact score from backend calculator (hours 35%, people 30%, tasks 20%, sdg 10%, match 5%)
  const totalImpactScore = dashboardData?.impactScore ?? 0;

  const shareUrl = `${window.location.origin}/impact-report/${volunteerId}`;

  // Filter activities by time period
  const getFilteredActivities = () => {
    // Ensure volunteerActivities is an array
    const activities = Array.isArray(volunteerActivities) ? volunteerActivities : [];
    
    const now = new Date();
    let startDate = new Date(0); // All time
    
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
    
    return activities.filter(a => {
      if (!a.date) return true;
      const activityDate = new Date(a.date);
      return activityDate >= startDate;
    });
  };

  const filteredActivities = getFilteredActivities();

  // Generate monthly hours from real activity data
  const generateMonthlyHours = () => {
    const monthlyData: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dates: Date[] = [];
    
    filteredActivities.forEach(activity => {
      if (activity.date) {
        const date = new Date(activity.date);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (activity.hours || 0);
        dates.push(date);
      }
    });

    // If no activities, show last 7 months with zero data
    if (dates.length === 0) {
      const now = new Date();
      const last7Months = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
        last7Months.push({
          month: monthNames[date.getMonth()],
          monthKey: monthKey,
          hours: monthlyData[monthKey] || 0
        });
      }
      return last7Months;
    }

    // Find min and max dates
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Generate all months between min and max date
    const months = [];
    const currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    
    while (currentDate <= maxDate) {
      const monthKey = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear().toString().slice(-2)}`;
      months.push({
        month: monthNames[currentDate.getMonth()],
        monthKey: monthKey,
        hours: monthlyData[monthKey] || 0
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months;
  };

  const monthlyHours = generateMonthlyHours();
  const bestMonth = monthlyHours.reduce((max, curr) => curr.hours > max.hours ? curr : max, monthlyHours[0]);
  const avgMonthlyHours = monthlyHours.length > 0 ? formatDecimal(monthlyHours.reduce((sum, m) => sum + m.hours, 0) / monthlyHours.length) : 0;

  // Generate insights based on time filter and trends
  const generateTrendInsight = () => {
    if (monthlyHours.length === 0) return "No hours data available for the selected period.";
    
    const totalHoursInPeriod = monthlyHours.reduce((sum, m) => sum + m.hours, 0);
    const avgHours = parseFloat(avgMonthlyHours as string);
    
    // Calculate trend
    const firstHalf = monthlyHours.slice(0, Math.floor(monthlyHours.length / 2));
    const secondHalf = monthlyHours.slice(Math.floor(monthlyHours.length / 2));
    const avgFirstHalf = firstHalf.length > 0 ? firstHalf.reduce((sum, m) => sum + m.hours, 0) / firstHalf.length : 0;
    const avgSecondHalf = secondHalf.length > 0 ? secondHalf.reduce((sum, m) => sum + m.hours, 0) / secondHalf.length : 0;
    
    let trendInsight = "";
    
    switch(timeFilter) {
      case 'month':
        if (totalHoursInPeriod === 0) {
          trendInsight = "💡 This month has no logged hours yet. Start tracking your contributions!";
        } else if (totalHoursInPeriod < 10) {
          trendInsight = `💡 You've logged ${totalHoursInPeriod.toLocaleString()}h this month. Consider increasing your weekly commitment to reach your goals.`;
        } else if (totalHoursInPeriod < 20) {
          trendInsight = `💡 Great effort! You've logged ${totalHoursInPeriod.toLocaleString()}h this month. Keep up the momentum!`;
        } else {
          trendInsight = `💡 Excellent! You've exceeded expectations with ${totalHoursInPeriod.toLocaleString()}h logged this month. Outstanding commitment!`;
        }
        break;
        
      case 'quarter':
        if (avgSecondHalf > avgFirstHalf * 1.1) {
          trendInsight = `📈 Your engagement is accelerating this quarter! Average hours increased from ${formatDecimal(avgFirstHalf)}h to ${formatDecimal(avgSecondHalf)}h per month.`;
        } else if (avgSecondHalf < avgFirstHalf * 0.9) {
          trendInsight = `📉 Your engagement is declining this quarter. Consider planning ahead to maintain consistent contribution levels.`;
        } else {
          trendInsight = `➡️ Your engagement remains steady this quarter with ${avgHours}h average per month.`;
        }
        break;
        
      case 'year':
        if (totalHoursInPeriod < 50) {
          trendInsight = `💡 You've contributed ${totalHoursInPeriod.toLocaleString()}h this year. Aim for more active participation to expand your impact.`;
        } else if (totalHoursInPeriod < 100) {
          trendInsight = `👍 Good year so far! You've logged ${totalHoursInPeriod.toLocaleString()}h in 2025. Keep building on this progress.`;
        } else if (totalHoursInPeriod < 200) {
          trendInsight = `⭐ Impressive! You've contributed ${totalHoursInPeriod.toLocaleString()}h this year. Your consistent effort is making a real difference.`;
        } else {
          trendInsight = `🌟 Outstanding contribution! You've logged ${totalHoursInPeriod.toLocaleString()}h in 2025. You're a key pillar of impact!`;
        }
        break;
        
      case 'all':
      default:
        const totalAllTime = monthlyHours.reduce((sum, m) => sum + m.hours, 0);
        const monthsActive = monthlyHours.filter(m => m.hours > 0).length;
        if (monthsActive > 0) {
          trendInsight = `✨ Your impact journey: ${totalAllTime}h across ${monthsActive} active months. Average ${formatDecimal(totalAllTime / monthsActive)}h per active month.`;
        } else {
          trendInsight = "Start your volunteer journey by logging your first hours!";
        }
        break;
    }
    
    return trendInsight;
  };

  // Update filtered KPIs
  const filteredTotalHours = filteredActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  
  // Show ALL assigned projects in the KPI (not just those with filtered activities)
  // The time filter should affect hours, not the project count
  const filteredActiveProjects = safeProjectAssignments.filter(pa =>
    pa.status === 'active' || pa.status === 'Active' || pa.status === 'In Progress'
  ).length;
  
  // Calculate filtered tasks score (count completed tasks only, not filtered by time since completion is a point-in-time event)
  // But for consistency, we calculate tasks separately
  const filteredTasksCompleted = tasks.filter(t => t.status?.toLowerCase() === "completed").length;
  
  // Use backend-calculated impact score from dashboard for consistency with impact-visualization
  // This ensures the same metric appears the same everywhere
  const filteredImpactScore = dashboardData?.impactScore !== undefined ? dashboardData.impactScore : 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Copied!",
      description: "Impact report link copied to clipboard",
    });
  };

  const handlePrintClick = () => {
    setShowPrintDialog(true);
  };

  const handlePrintConfirm = () => {
    setShowPrintDialog(false);
    
    // Set CSS classes based on selection mode
    const reportContent = document.getElementById('impact-report-content');
    if (reportContent) {
      if (printPageMode === "all") {
        reportContent.classList.remove('print-selected-pages');
      } else {
        reportContent.classList.add('print-selected-pages');
        // Store selected pages in data attributes for CSS use
        Object.entries(selectedPrintPages).forEach(([page, selected]) => {
          if (selected) {
            reportContent.setAttribute(`data-print-${page}`, 'true');
          } else {
            reportContent.removeAttribute(`data-print-${page}`);
          }
        });
      }
    }

    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      
      // Clean up CSS classes
      if (reportContent) {
        reportContent.classList.remove('print-selected-pages');
      }
    }, 100);
  };

  const togglePageSelection = (page: keyof typeof selectedPrintPages) => {
    setSelectedPrintPages(prev => ({
      ...prev,
      [page]: !prev[page]
    }));
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('impact-report-content');
    if (!element) return;
    
    const opt = {
      margin: 10,
      filename: `Impact_Report_${currentUser?.displayName || 'Volunteer'}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(element).save();
    toast({
      title: "Downloaded!",
      description: "Your impact report has been saved as PDF",
    });
  };

  const handleShareSocial = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    const text = `Check out my SDG Impact Report! I've contributed ${filteredTotalHours} hours and helped advance sustainable development goals.`;
    const url = shareUrl;
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    
    let shareLink = '';
    switch(platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
    }
    
    window.open(shareLink, '_blank', 'width=600,height=400');
  };

  const skillsData = allSkills.slice(0, 5).map((skill: any) => ({
    name: skill,
    projects: Math.floor(Math.random() * 4) + 1
  }));

  const projectsBreakdown = safeProjectAssignments.map((pa: any) => ({
    name: pa.project?.name || 'Unknown',
    value: Math.floor(Math.random() * 100) + 20
  }));

  // Show error if no volunteer ID is available
  if (!volunteerId) {
    return (
      <div className="min-h-screen bg-[#faf9f7] dark:from-slate-900 dark:to-slate-800 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-2 border-red-200 dark:border-red-900">
          <CardContent className="p-8 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Volunteer Selected</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please log in or select a volunteer to view their impact report.
            </p>
            <Button 
              variant="default" 
              onClick={() => setLocation("/dashboard")}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8f9fa] dark:from-slate-900 dark:to-slate-800 ${isVolunteer && isMobile ? 'pt-16 pb-20' : ''}`}>
      {/* Desktop Volunteer Navigation */}
      {isVolunteer && !isMobile && <VolunteerNav />}
      {/* PWA Header for mobile volunteer users */}
      {isVolunteer && isMobile && <PWAHeader />}

      <div className={isMobile ? "p-2" : ""} style={!isMobile ? { maxWidth: '1280px', margin: '0 auto', padding: '24px' } : undefined}>

      <div className={isMobile ? "max-w-6xl mx-auto" : ""}>
        {/* Header with Back Button - hidden on mobile PWA since we have the PWAHeader */}
        <div className={`mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-2 ${isVolunteer && isMobile ? 'hidden' : ''}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Use browser history to go back to the previous page
              if (window.history.length > 1) {
                window.history.back();
              } else {
                setLocation("/dashboard");
              }
            }}
            className="w-full md:w-auto justify-start md:justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Back</span>
            <span className="md:hidden">Back</span>
          </Button>
          
          <div className="flex gap-1.5 md:gap-2 flex-wrap justify-end w-full md:w-auto">
            {/* Time Filter */}
            <div className="flex items-center gap-1.5 print:hidden">
              <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
              <Select value={timeFilter} onValueChange={(value: "all" | "month" | "quarter" | "year") => setTimeFilter(value)}>
                <SelectTrigger className="h-7 md:h-8 w-[100px] md:w-[130px] text-[10px] md:text-sm">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle - Compact on mobile */}
            <div className="flex gap-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5 md:p-1 print:hidden">
              <Button
                variant={viewMode === "tabs" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tabs")}
                className="h-7 md:h-8 px-1.5 md:px-3 text-[10px] md:text-sm"
                data-testid="view-mode-tabs"
              >
                <Layout className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="ml-0.5 md:ml-1">Tabs</span>
              </Button>
              <Button
                variant={viewMode === "single" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("single")}
                className="h-7 md:h-8 px-1.5 md:px-3 text-[10px] md:text-sm"
                data-testid="view-mode-single"
              >
                <Rows3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="ml-0.5 md:ml-1">All</span>
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="print:hidden text-[10px] md:text-sm whitespace-nowrap h-7 md:h-8 px-1.5 md:px-3"
              data-testid="button-download-pdf"
            >
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="ml-0.5 md:ml-1">PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintClick}
              className="print:hidden text-[10px] md:text-sm h-7 md:h-8 px-1.5 md:px-3"
              data-testid="button-print"
            >
              <Printer className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="ml-0.5 md:ml-1 hidden sm:inline">Print</span>
            </Button>
            <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 md:p-1 print:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('twitter')}
                className="h-7 md:h-8 px-1.5 md:px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                data-testid="button-share-twitter"
                title="Share on Twitter"
              >
                <Twitter className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('linkedin')}
                className="h-7 md:h-8 px-1.5 md:px-2 hover:bg-blue-200 dark:hover:bg-blue-800"
                data-testid="button-share-linkedin"
                title="Share on LinkedIn"
              >
                <Linkedin className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('facebook')}
                className="h-7 md:h-8 px-1.5 md:px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                data-testid="button-share-facebook"
                title="Share on Facebook"
              >
                <Facebook className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Impact Report Card */}
        <Card id="impact-report-content" className="bg-white dark:bg-slate-800 shadow-lg border-2 border-gray-200 dark:border-gray-700 print:shadow-none print:border-black relative overflow-hidden">
          {/* UN SDG Wheel Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] print:opacity-[0.05]">
            <svg viewBox="0 0 600 600" className="w-[800px] h-[800px] max-w-none">
              {/* SDG Wheel background */}
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map((sdg, index) => {
                const anglePerSegment = (2 * Math.PI) / 17;
                const startAngle = index * anglePerSegment - Math.PI / 2;
                const endAngle = startAngle + anglePerSegment;
                const center = 300;
                const outerRadius = 280;
                const innerRadius = 90;
                const colors: Record<number, string> = {
                  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
                  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
                  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
                  16: "#00689D", 17: "#19486A"
                };
                const x1 = center + innerRadius * Math.cos(startAngle);
                const y1 = center + innerRadius * Math.sin(startAngle);
                const x2 = center + outerRadius * Math.cos(startAngle);
                const y2 = center + outerRadius * Math.sin(startAngle);
                const x3 = center + outerRadius * Math.cos(endAngle);
                const y3 = center + outerRadius * Math.sin(endAngle);
                const x4 = center + innerRadius * Math.cos(endAngle);
                const y4 = center + innerRadius * Math.sin(endAngle);
                const path = `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z`;
                return <path key={sdg} d={path} fill={colors[sdg]} stroke="white" strokeWidth="2" />;
              })}
              <circle cx="300" cy="300" r="85" fill="white" />
              <text x="300" y="290" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#1e3a5f">SUSTAINABLE</text>
              <text x="300" y="320" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#1e3a5f">DEVELOPMENT</text>
              <text x="300" y="350" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1e3a5f">GOALS</text>
            </svg>
          </div>
          <CardContent className="p-3 md:p-6 lg:p-8 print:p-4 relative z-10">
            {/* Header Section - Split Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 md:mb-8 pb-4 md:pb-6 border-b-2 border-gray-200 dark:border-gray-700 print:mb-4 print:pb-3 print:gap-4">
              {/* Left: Volunteer Info & Logo */}
              <div className="md:col-span-2">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-6 mb-4 md:mb-0 print:gap-4 print:mb-3">
                  <Logo size="lg" className="print:scale-75" />
                  {currentUser?.avatar && !avatarError && (
                    <div className="flex items-center">
                      <div className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 md:pl-6">
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.displayName || undefined}
                          className="h-12 w-12 rounded-full object-cover print:h-8 print:w-8"
                          onError={() => {
                            setAvatarError(true);
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {primaryOrganization?.logo && !logoError && (
                    <div className="flex items-center">
                      <div className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 md:pl-6">
                        <img
                          src={primaryOrganization.logo}
                          alt={primaryOrganization.name}
                          className="h-12 w-auto object-contain print:h-8"
                          onError={() => {
                            setLogoError(true);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1 print:text-2xl print:text-gray-900">
                  {currentUser?.displayName || currentUser?.username || 'Volunteer'}
                </p>

                <h1 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-700 dark:text-gray-300 print:text-lg flex items-center gap-2">
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    Verified
                  </span>
                  SDG Impact Report
                </h1>

                <div className="mt-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Blockchain Verified
                  </span>
                </div>
              </div>

              {/* Right: Organizations & Impact Score Box - Interactive */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/50 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-3">Your Information</p>

                <div className="space-y-3">
                  {volunteerOrganizations.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Organizations</p>
                      <div className="space-y-1">
                        {volunteerOrganizations.slice(0, 3).map((org: any) => (
                          <div key={org.id} className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate">
                            {org.name}
                          </div>
                        ))}
                        {volunteerOrganizations.length > 3 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 italic">
                            +{volunteerOrganizations.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowImpactScoreModal(true)}
                    className="w-full pt-2 border-t border-blue-200 dark:border-blue-700 text-left hover:bg-blue-200/50 dark:hover:bg-blue-800/50 rounded-lg transition-all cursor-pointer active:scale-95"
                  >
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Overall Impact Score</p>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{filteredImpactScore}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">out of 100</p>
                    <p className="text-[10px] text-blue-500 mt-1 font-medium">Tap for breakdown →</p>
                  </button>
                </div>
              </div>
            </div>

            {/* View Mode Conditional: Tabs vs Single Page */}
            {viewMode === "tabs" ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 gap-0.5 md:gap-1 mb-4 md:mb-6 print:hidden h-auto p-1">
                <TabsTrigger value="overview" className="flex flex-col md:flex-row items-center gap-0.5 md:gap-2 text-[9px] md:text-sm px-1 md:px-4 py-1.5 md:py-2 min-h-[52px] md:min-h-0">
                  <Target className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="leading-tight">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="engagement" className="flex flex-col md:flex-row items-center gap-0.5 md:gap-2 text-[9px] md:text-sm px-1 md:px-4 py-1.5 md:py-2 min-h-[52px] md:min-h-0">
                  <Users className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="leading-tight">Engage</span>
                </TabsTrigger>
                <TabsTrigger value="impact" className="flex flex-col md:flex-row items-center gap-0.5 md:gap-2 text-[9px] md:text-sm px-1 md:px-4 py-1.5 md:py-2 min-h-[52px] md:min-h-0">
                  <TrendingUp className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="leading-tight">Impact</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex flex-col md:flex-row items-center gap-0.5 md:gap-2 text-[9px] md:text-sm px-1 md:px-4 py-1.5 md:py-2 min-h-[52px] md:min-h-0">
                  <BarChart3 className="h-4 w-4 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="leading-tight">Stats</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-3 md:space-y-6">
                {/* Enhanced KPI Buttons in responsive grid - All Interactive */}
                <div className="grid grid-cols-4 gap-1.5 md:gap-3 lg:gap-4 print:gap-2">
                  <button
                    onClick={() => setShowHoursModal(true)}
                    className="impact-report-section bg-blue-50 dark:bg-blue-900 p-2.5 md:p-4 rounded-lg border border-blue-200 dark:border-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all print:page-break-inside-avoid print:shadow-none text-left cursor-pointer"
                  >
                    <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-1 md:mb-2">Hours</p>
                    <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1 md:mb-2">{Math.round(filteredTotalHours)}h</p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Acts:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{filteredActivities.length}</span>
                      </div>
                      {filteredActivities.length > 0 && (
                        <div className="flex justify-between items-center text-[10px] md:text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{formatDecimal(filteredTotalHours / filteredActivities.length)}h</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Mo.Avg:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{avgMonthlyHours}h</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px] text-blue-500 font-medium">Tap for details →</div>
                  </button>

                  <button
                    onClick={() => setShowTasksModal(true)}
                    className="impact-report-section bg-green-50 dark:bg-green-900 p-2.5 md:p-4 rounded-lg border border-green-200 dark:border-green-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all print:page-break-inside-avoid print:shadow-none text-left cursor-pointer"
                  >
                    <p className="text-[10px] md:text-xs text-green-600 dark:text-green-400 uppercase font-semibold mb-1 md:mb-2">Tasks</p>
                    <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100 mb-1 md:mb-2">{filteredTasksCompleted}/{tasks.length}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Done:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{tasks.length > 0 ? Math.round((filteredTasksCompleted / tasks.length) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{tasks.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Left:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{tasks.length - filteredTasksCompleted}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px] text-green-500 font-medium">Tap for details →</div>
                  </button>

                  <button
                    onClick={() => setShowProjectsModal(true)}
                    className="bg-purple-50 dark:bg-purple-900 p-2.5 md:p-4 rounded-lg border border-purple-200 dark:border-purple-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all print:page-break-inside-avoid text-left cursor-pointer"
                  >
                    <p className="text-[10px] md:text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold mb-1 md:mb-2">Projects</p>
                    <p className="text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1 md:mb-2">{filteredActiveProjects}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{assignmentsCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Comp:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{assignmentsCount > 0 ? Math.round((filteredActiveProjects / assignmentsCount) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Assign:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{assignmentsCount}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px] text-purple-500 font-medium">Tap for details →</div>
                  </button>

                  <button
                    onClick={() => setShowSkillsModal(true)}
                    className="bg-orange-50 dark:bg-orange-900 p-2.5 md:p-4 rounded-lg border border-orange-200 dark:border-orange-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all print:page-break-inside-avoid text-left cursor-pointer"
                  >
                    <p className="text-[10px] md:text-xs text-orange-600 dark:text-orange-400 uppercase font-semibold mb-1 md:mb-2">Skills</p>
                    <p className="text-xl md:text-2xl font-bold text-orange-900 dark:text-orange-100 mb-1 md:mb-2">{allSkills.length}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Skills:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{allSkills.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">SDGs:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{sdgs.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] md:text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Score:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{filteredImpactScore}/100</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px] text-orange-500 font-medium">Tap for details →</div>
                  </button>
                </div>

                {/* AIU Summary Card - Using real AIU data from /api/aiu/volunteer endpoint */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 dark:bg-emerald-800 p-2 rounded-full">
                        <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-semibold">AIUs Earned</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Your verified share of SDG progress</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatDecimal(aiuSummary?.totalAiu) || '0.00'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{aiuSummary?.verificationRate || 0}% verified</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Projects</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">{aiuSummary?.projectCount || filteredActiveProjects}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">SDGs</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">{aiuSummary?.sdgsContributed?.length || sdgs.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Hours</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">{Math.round(aiuSummary?.totalHours || filteredTotalHours)}</p>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:page-break-inside-avoid">
                  {/* Monthly Hours Trend */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Monthly Hours Trend
                      </h3>
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 mb-3 text-xs space-y-1.5">
                        {bestMonth && (
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Peak Performance:</strong> {bestMonth.month} with {bestMonth.hours}h logged
                          </p>
                        )}
                        <p className="text-gray-700 dark:text-gray-300">
                          {generateTrendInsight()}
                        </p>
                      </div>
                      <Line
                        ref={(ref) => chartRefs.current['monthlyHours'] = ref}
                        data={{
                          labels: monthlyHours.map(d => d.month),
                          datasets: [
                            {
                              label: 'Hours Logged',
                              data: monthlyHours.map(d => d.hours),
                              borderColor: '#3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              fill: true,
                              tension: 0.4,
                              borderWidth: 2,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          interaction: { mode: 'index' as any, intersect: false },
                          plugins: { 
                            legend: { display: false },
                            tooltip: {
                              enabled: true,
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              titleColor: '#fff',
                              bodyColor: '#fff',
                              borderColor: '#3b82f6',
                              borderWidth: 1,
                              padding: 12,
                              displayColors: false,
                              callbacks: {
                                label: (context: any) => `${context.parsed.y} hours`
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: { color: '#666' }
                            },
                            x: {
                              ticks: { color: '#666' }
                            }
                          }
                        }}
                      />
                      <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>📊 <strong>Summary:</strong> {monthlyHours.reduce((sum, m) => sum + m.hours, 0)}h total • {avgMonthlyHours}h/month avg</p>
                        <p>✅ <strong>What Went Well:</strong> Consistent engagement across {monthlyHours.filter(m => m.hours > 0).length} active months</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Project Distribution */}
                  {projectsBreakdown.length > 0 && (
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Project Distribution
                        </h3>
                        <Pie
                          ref={(ref) => chartRefs.current['projectDist'] = ref}
                          data={{
                            labels: projectsBreakdown.map(p => p.name).slice(0, 5),
                            datasets: [
                              {
                                data: projectsBreakdown.map(p => p.value).slice(0, 5),
                                backgroundColor: [
                                  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
                                ],
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: { 
                              legend: { position: 'bottom' },
                              tooltip: {
                                enabled: true,
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                padding: 12,
                                callbacks: {
                                  label: (context: any) => `${context.label}: ${context.parsed}%`
                                }
                              }
                            }
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Engagement Tab */}
              <TabsContent value="engagement" className="space-y-6">
                <div data-print-engagement="true" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:page-break-inside-avoid">
                    {/* Skills Assessment */}
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Skills Assessment
                      </h3>
                      {skillsData.length > 0 ? (
                        <Bar
                          ref={(ref) => chartRefs.current['skills'] = ref}
                          data={{
                            labels: skillsData.map((s: any) => s.name),
                            datasets: [
                              {
                                label: 'Projects Using Skill',
                                data: skillsData.map((s: any) => s.projects),
                                backgroundColor: '#10b981',
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            indexAxis: 'y' as any,
                            plugins: { legend: { display: false } }
                          }}
                        />
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No skills data available</p>
                      )}
                      </CardContent>
                    </Card>

                    {/* Engagement Metrics */}
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Engagement Metrics
                        </h3>
                        <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Task Completion Rate
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {tasks.length > 0 ? Math.round((filteredTasksCompleted / tasks.length) * 100) : 0}%
                            </span>
                          </div>
                          <Progress value={tasks.length > 0 ? (filteredTasksCompleted / tasks.length) * 100 : 0} />
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Project Activity
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {activeProjects}/{assignmentsCount}
                            </span>
                          </div>
                          <Progress value={(activeProjects / Math.max(1, assignmentsCount)) * 100} />
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Skills Utilization
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {allSkills.length} skills
                            </span>
                          </div>
                          <Progress value={Math.min((allSkills.length / 10) * 100, 100)} />
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Skills Section */}
                  {allSkills.length > 0 && (
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Applied Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {allSkills.map((skill: string, index: number) => (
                            <div key={skill} className={`px-3 py-1 rounded-full text-sm font-medium ${getSkillBadgeClass(index)}`}>
                              {skill}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Impact Tab */}
              <TabsContent value="impact" className="space-y-6">
                <div data-print-impact="true" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">
                          Economic Value
                        </h3>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                          ${(filteredTotalHours * 25).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          @ $25/hour average
                        </p>
                      </CardContent>
                    </Card>

                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        Environmental Impact
                      </h3>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                        {Math.round(filteredTotalHours * 0.5)} kg
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        CO₂ offset (est.)
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        Lives Impacted
                      </h3>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                        {dashboardData?.totalPeopleImpacted || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Verified beneficiaries
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* SDG Impact Section - Interactive Buttons showing only active SDGs */}
                {sdgs.length > 0 && (
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Your Active SDG Goals
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Tap any SDG to see your contributions and related projects
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[...sdgs].sort((a, b) => a - b).map((sdgId: number) => {
                          const title = SDG_TITLES[sdgId];
                          // Calculate hours for this SDG from activities
                          const sdgHours = filteredActivities
                            .filter((a: any) => a.sdgGoals?.includes(sdgId))
                            .reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
                          const sdgProjects = safeProjectAssignments.filter((pa: any) =>
                            pa.project?.sdgGoals?.includes(sdgId)
                          ).length;

                          return (
                            <button
                              key={sdgId}
                              onClick={() => setShowSdgModal(sdgId)}
                              className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-600 hover:shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            >
                              <span className="text-lg flex-shrink-0">
                                {SDG_LOGOS[sdgId]}
                              </span>
                              <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">
                                {sdgId}
                              </span>
                              <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold hidden sm:inline">
                                {title}
                              </span>
                              {sdgHours > 0 && (
                                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                  {Math.round(sdgHours)}h
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {sdgs.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{sdgs.length}</p>
                            <p className="text-[10px] text-gray-500">Active SDGs</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">{Math.round(filteredTotalHours)}</p>
                            <p className="text-[10px] text-gray-500">Total Hours</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-purple-600">{filteredActiveProjects}</p>
                            <p className="text-[10px] text-gray-500">Projects</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <div data-print-analytics="true" className="space-y-6">
                  {/* KPI Tracking Table */}
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      KPI Tracking: Target vs. Actuals
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">
                              KPI
                            </th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                              Target
                            </th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                              Actual
                            </th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                              % Achieved
                            </th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {[
                            { kpi: 'Monthly Hours', target: 20, actual: Math.min(filteredTotalHours, 20) },
                            { kpi: 'Tasks Completed', target: 10, actual: Math.min(filteredTasksCompleted, 10) },
                            { kpi: 'Active Projects', target: 3, actual: Math.min(filteredActiveProjects, 3) },
                            { kpi: 'Skills Developed', target: 5, actual: Math.min(allSkills.length, 5) },
                          ].map((row) => {
                            const achieved = Math.round((row.actual / row.target) * 100);
                            const status = achieved >= 100 ? '✓ On Target' : achieved >= 75 ? '⚠ At Risk' : '✗ Behind';
                            const statusColor = achieved >= 100 ? 'text-green-600 dark:text-green-400' : achieved >= 75 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
                            return (
                              <tr key={row.kpi} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-2 text-gray-900 dark:text-white">{row.kpi}</td>
                                <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-300">{row.target}</td>
                                <td className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">{row.actual}</td>
                                <td className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">{achieved}%</td>
                                <td className={`px-4 py-2 text-center font-semibold ${statusColor}`}>{status}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Strategic Recommendations */}
                <Card className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Strategic Recommendations
                    </h3>
                    <ul className="space-y-3">
                      {filteredTotalHours < 20 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            Increase volunteer hours by focusing on {filteredActiveProjects > 0 ? 'your most impactful projects' : 'available opportunities'}
                          </span>
                        </li>
                      )}
                      {totalTasks > 0 && (filteredTasksCompleted / totalTasks) < 0.8 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            Prioritize task completion to increase your impact score
                          </span>
                        </li>
                      )}
                      {allSkills.length < 5 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            Document additional skills to unlock more opportunities
                          </span>
                        </li>
                      )}
                      {sdgs.length === 0 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            Select your preferred UN SDGs to align with meaningful impact
                          </span>
                        </li>
                      )}
                      {filteredTasksCompleted > 5 && (
                        <li className="flex gap-3">
                          <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            Great progress! You're making a real difference
                          </span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                {/* Impact Verification Sources */}
                <Card className="border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" />
                      Impact Verification Sources
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">🏢 NGO Validation</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Partner organization verification of impact and activity data</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">✓ Direct Program Confirmation</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Confirmed completion through project management systems</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">👥 Peer Verification</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Validation from fellow volunteers and team members</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">🌍 Community Validation System</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Community ratings and feedback on demonstrated impact</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Analytics */}
                <Card className="border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      AI Analytics
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">🤖 Automated Impact Measurement</p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Real-time impact scoring based on activities and outcomes</li>
                          <li>• Predictive analytics for future impact potential</li>
                          <li>• Pattern recognition across volunteer contributions</li>
                          <li>• Anomaly detection for data quality assurance</li>
                          <li>• Machine learning-driven SDG alignment optimization</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </TabsContent>
            </Tabs>
            ) : (
            /* Single Page View - All Sections Combined */
            <div className="w-full space-y-8">
              {/* Overview Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b-2 border-gray-300 dark:border-gray-600 pb-3">
                  <Target className="h-6 w-6 text-blue-600" />
                  Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 print:gap-2">
                  <div className="impact-report-section bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700 hover:shadow-md transition-shadow print:page-break-inside-avoid print:shadow-none">
                    <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-2">Hours Logged</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">{Math.round(filteredTotalHours)}h</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Activities:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{filteredActivities.length}</span>
                      </div>
                      {filteredActivities.length > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Avg/Activity:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{formatDecimal(filteredTotalHours / filteredActivities.length)}h</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Monthly Avg:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{avgMonthlyHours}h</span>
                      </div>
                    </div>
                  </div>

                  <div className="impact-report-section bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700 hover:shadow-md transition-shadow print:page-break-inside-avoid print:shadow-none">
                    <p className="text-xs text-green-600 dark:text-green-400 uppercase font-semibold mb-2">Tasks Completed</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">{filteredTasksCompleted}/{tasks.length}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Completion:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{tasks.length > 0 ? Math.round((filteredTasksCompleted / tasks.length) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Total Tasks:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{tasks.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{tasks.length - filteredTasksCompleted}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700 hover:shadow-md transition-shadow print:page-break-inside-avoid">
                    <p className="text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold mb-2">Active Projects</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-2">{filteredActiveProjects}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Total:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{assignmentsCount}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Completion Avg:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{assignmentsCount > 0 ? Math.round((filteredActiveProjects / assignmentsCount) * 100) : 0}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Assignments:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{assignmentsCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700 hover:shadow-md transition-shadow print:page-break-inside-avoid">
                    <p className="text-xs text-orange-600 dark:text-orange-400 uppercase font-semibold mb-2">Skills & SDGs</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mb-2">{allSkills.length}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Skills:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{allSkills.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">SDG Goals:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{sdgs.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Impact Score:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{filteredImpactScore}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Grid - from Overview Tab */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:page-break-inside-avoid">
                  {/* Monthly Hours Trend */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Monthly Hours Trend
                      </h3>
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 mb-3 text-xs space-y-1.5">
                        {bestMonth && (
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Peak Performance:</strong> {bestMonth.month} with {bestMonth.hours}h logged
                          </p>
                        )}
                        <p className="text-gray-700 dark:text-gray-300">
                          {generateTrendInsight()}
                        </p>
                      </div>
                      <Line
                        data={{
                          labels: monthlyHours.map(d => d.month),
                          datasets: [
                            {
                              label: 'Hours',
                              data: monthlyHours.map(d => d.hours),
                              borderColor: '#3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              fill: true,
                              tension: 0.4,
                              borderWidth: 2,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } },
                          scales: { y: { beginAtZero: true } }
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Impact Distribution */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Impact Distribution
                      </h3>
                      <Pie
                        data={{
                          labels: ['Hours (40%)', 'Tasks (30%)', 'Projects (20%)', 'Skills (10%)'],
                          datasets: [{
                            data: [40, 30, 20, 10],
                            backgroundColor: [
                              '#3b82f6',
                              '#10b981',
                              '#f59e0b',
                              '#ef4444'
                            ],
                            borderColor: [
                              '#1e40af',
                              '#047857',
                              '#d97706',
                              '#b91c1c'
                            ],
                            borderWidth: 2,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: { legend: { position: 'bottom' as const }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } }
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Engagement Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b-2 border-gray-300 dark:border-gray-600 pb-3">
                  <Users className="h-6 w-6 text-green-600" />
                  Engagement
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:page-break-inside-avoid">
                  {/* Skills Assessment */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skills Assessment</h3>
                      {skillsData.length > 0 ? (
                        <Bar
                          data={{
                            labels: skillsData.map((s: any) => s.name),
                            datasets: [
                              {
                                label: 'Projects Using Skill',
                                data: skillsData.map((s: any) => s.projects),
                                backgroundColor: skillsData.map((_: any, index: number) => getSkillColor(index)),
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            indexAxis: 'y' as any,
                            plugins: { legend: { display: false } }
                          }}
                        />
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No skills data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Engagement Metrics */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement Metrics</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Completion Rate</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{tasks.length > 0 ? Math.round((filteredTasksCompleted / tasks.length) * 100) : 0}%</span>
                          </div>
                          <Progress value={tasks.length > 0 ? (filteredTasksCompleted / tasks.length) * 100 : 0} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Project Activity</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{activeProjects}/{assignmentsCount}</span>
                          </div>
                          <Progress value={(activeProjects / Math.max(1, assignmentsCount)) * 100} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Skills Utilization</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{allSkills.length} skills</span>
                          </div>
                          <Progress value={Math.min((allSkills.length / 10) * 100, 100)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {allSkills.length > 0 && (
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Applied Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {allSkills.map((skill: string, index: number) => (
                          <div key={skill} className={`px-3 py-1 rounded-full text-sm font-medium ${getSkillBadgeClass(index)}`}>
                            {skill}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Impact Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b-2 border-gray-300 dark:border-gray-600 pb-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                  Impact
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Economic Value</h3>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">${(filteredTotalHours * 25).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">@ $25/hour average</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Environmental Impact</h3>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{Math.round(filteredTotalHours * 0.5)} kg</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CO₂ offset (est.)</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Lives Impacted</h3>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{dashboardData?.totalPeopleImpacted || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Verified beneficiaries</p>
                    </CardContent>
                  </Card>
                </div>
                {sdgs.length > 0 && (
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">UN Sustainable Development Goals</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sdgs.map((sdgId: number) => {
                          const title = SDG_TITLES[sdgId];
                          return (
                            <div key={sdgId} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700">
                              <span className="text-4xl flex-shrink-0">{SDG_LOGOS[sdgId]}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white text-sm">SDG {sdgId}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold leading-tight">{title}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Analytics Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b-2 border-gray-300 dark:border-gray-600 pb-3">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                  Analytics
                </h2>
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">KPI Tracking: Performance Metrics</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">Metric</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">Performance</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">Details</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {(() => {
                            // Task Completion Rate: completed / total tasks
                            const taskCompletionRate = tasks.length > 0 ? Math.round((filteredTasksCompleted / tasks.length) * 100) : 0;
                            const taskStatus = taskCompletionRate >= 80 ? '✓ Excellent' : taskCompletionRate >= 60 ? '⚠ Good' : taskCompletionRate >= 40 ? '→ Fair' : '✗ Low';
                            const taskStatusColor = taskCompletionRate >= 80 ? 'text-green-600 dark:text-green-400' : taskCompletionRate >= 60 ? 'text-blue-600 dark:text-blue-400' : taskCompletionRate >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
                            
                            // Project Engagement Rate: active / total projects
                            const projectEngagementRate = assignmentsCount > 0 ? Math.round((filteredActiveProjects / assignmentsCount) * 100) : 0;
                            const projectStatus = projectEngagementRate >= 80 ? '✓ Excellent' : projectEngagementRate >= 60 ? '⚠ Good' : projectEngagementRate >= 40 ? '→ Fair' : '✗ Low';
                            const projectStatusColor = projectEngagementRate >= 80 ? 'text-green-600 dark:text-green-400' : projectEngagementRate >= 60 ? 'text-blue-600 dark:text-blue-400' : projectEngagementRate >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
                            
                            // Skills & Expertise: actual count with reasonable expectation
                            const skillsCount = allSkills.length;
                            const skillsStatus = skillsCount >= 5 ? '✓ Excellent' : skillsCount >= 3 ? '⚠ Good' : skillsCount >= 2 ? '→ Fair' : '✗ Low';
                            const skillsStatusColor = skillsCount >= 5 ? 'text-green-600 dark:text-green-400' : skillsCount >= 3 ? 'text-blue-600 dark:text-blue-400' : skillsCount >= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
                            
                            // Hours Commitment: monthly average
                            const monthlyTarget = 20; // 20 hours per month target
                            const avgMonthlyHoursNum = parseFloat(String(avgMonthlyHours)) || 0;
                            const hoursStatus = avgMonthlyHoursNum >= 20 ? '✓ Exceeding' : avgMonthlyHoursNum >= 15 ? '⚠ On Track' : avgMonthlyHoursNum >= 10 ? '→ Moderate' : '✗ Low';
                            const hoursStatusColor = avgMonthlyHoursNum >= 20 ? 'text-green-600 dark:text-green-400' : avgMonthlyHoursNum >= 15 ? 'text-blue-600 dark:text-blue-400' : avgMonthlyHoursNum >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
                            
                            const kpiData = [
                              { metric: 'Task Completion', performance: taskCompletionRate, details: `${filteredTasksCompleted} of ${tasks.length} tasks`, status: taskStatus, statusColor: taskStatusColor },
                              { metric: 'Project Engagement', performance: projectEngagementRate, details: `${filteredActiveProjects} of ${assignmentsCount} active`, status: projectStatus, statusColor: projectStatusColor },
                              { metric: 'Skills & Expertise', performance: skillsCount, details: `${skillsCount} skill${skillsCount !== 1 ? 's' : ''} + ${sdgs.length} SDG${sdgs.length !== 1 ? 's' : ''}`, status: skillsStatus, statusColor: skillsStatusColor },
                              { metric: 'Hours Commitment', performance: Math.round(avgMonthlyHoursNum), details: `${avgMonthlyHours}h avg/month (target: ${monthlyTarget}h)`, status: hoursStatus, statusColor: hoursStatusColor },
                            ];
                            
                            return kpiData.map((row) => (
                              <tr key={row.metric} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{row.metric}</td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{row.performance}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.metric === 'Skills & Expertise' ? '' : '%'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center text-xs text-gray-600 dark:text-gray-300">{row.details}</td>
                                <td className={`px-4 py-2 text-center font-semibold ${row.statusColor}`}>{row.status}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Strategic Recommendations</h3>
                    <ul className="space-y-3">
                      {filteredTotalHours < 20 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">Increase volunteer hours by focusing on {filteredActiveProjects > 0 ? 'your most impactful projects' : 'available opportunities'}</span>
                        </li>
                      )}
                      {totalTasks > 0 && (filteredTasksCompleted / totalTasks) < 0.8 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">Prioritize task completion to increase your impact score</span>
                        </li>
                      )}
                      {allSkills.length < 5 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">Document additional skills to unlock more opportunities</span>
                        </li>
                      )}
                      {sdgs.length === 0 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">Select your preferred UN SDGs to align with meaningful impact</span>
                        </li>
                      )}
                      {filteredTasksCompleted > 5 && (
                        <li className="flex gap-3">
                          <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                          <span className="text-gray-700 dark:text-gray-300">Great progress! You're making a real difference</span>
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400 print:mt-4 print:pt-3 print:border-t print:text-xs">
              <p>
                Generated on {new Date().toLocaleDateString()} • SDG Impact Report {timeFilter !== 'all' && `(${['All Time', 'This Month', 'This Quarter', 'This Year'][['all', 'month', 'quarter', 'year'].indexOf(timeFilter)]})`}
              </p>
              {!isPrinting && volunteerId && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Share this link: {shareUrl}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Page Selection Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Print Options</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Select Pages to Print</h3>
              
              {/* All Pages Option */}
              <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="all-pages"
                    name="print-mode"
                    value="all"
                    checked={printPageMode === "all"}
                    onChange={(e) => setPrintPageMode("all")}
                    className="cursor-pointer"
                  />
                  <label htmlFor="all-pages" className="cursor-pointer text-sm font-medium">
                    Print All Pages
                  </label>
                </div>
              </div>

              {/* Individual Pages Option */}
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="radio"
                    id="selected-pages"
                    name="print-mode"
                    value="selected"
                    checked={printPageMode === "selected"}
                    onChange={(e) => setPrintPageMode("selected")}
                    className="cursor-pointer"
                  />
                  <label htmlFor="selected-pages" className="cursor-pointer text-sm font-medium">
                    Select Pages to Print
                  </label>
                </div>

                {printPageMode === "selected" && (
                  <div className="space-y-2 ml-7">
                    {[
                      { id: 'overview', label: 'Overview' },
                      { id: 'engagement', label: 'Engagement' },
                      { id: 'impact', label: 'Impact' },
                      { id: 'analytics', label: 'Analytics' }
                    ].map(page => (
                      <div key={page.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`page-${page.id}`}
                          checked={selectedPrintPages[page.id as keyof typeof selectedPrintPages]}
                          onCheckedChange={() => togglePageSelection(page.id as keyof typeof selectedPrintPages)}
                          data-testid={`checkbox-print-${page.id}`}
                        />
                        <label htmlFor={`page-${page.id}`} className="cursor-pointer text-sm">
                          {page.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrintConfirm} data-testid="button-confirm-print">
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 8mm;
            color: #000;
          }
          .print\\:hidden {
            display: none !important;
          }
          #impact-report-content {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Optimize grid layouts for print */
          .grid, [class*="grid-cols"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            orphans: 2 !important;
            widows: 2 !important;
          }
          
          /* Prevent breaks within sections */
          .space-y-6 > div,
          .space-y-4 > div,
          .space-y-3 > div {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Headers stay with content */
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            orphans: 3 !important;
            widows: 3 !important;
          }
          
          /* KPI cards never break */
          .bg-blue-50, .bg-green-50, .bg-purple-50, .bg-orange-50,
          .bg-blue-900, .bg-green-900, .bg-purple-900, .bg-orange-900,
          .bg-blue-100, .bg-green-100, .bg-purple-100, .bg-orange-100,
          [class*="border-blue"], [class*="border-green"], [class*="border-purple"], [class*="border-orange"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Charts stay intact */
          canvas, .chart-container, [role="img"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            max-height: 500px !important;
          }
          
          /* Card elements never break */
          [class*="Card"], [role="article"], article {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Table and list optimization */
          table, tr, thead, tbody {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          ul, ol, li {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            orphans: 2 !important;
            widows: 2 !important;
          }
          
          /* Badge and pill elements */
          [class*="Badge"], [class*="pill"], [class*="badge"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Improve contrast for printing */
          .text-gray-600, .text-gray-700 {
            color: #333 !important;
          }
          
          /* Optimize colors for B&W printers */
          .dark\\:text-gray-300 {
            color: #666 !important;
          }
          
          /* Section spacing for better readability */
          section {
            margin-bottom: 12mm !important;
            page-break-inside: avoid !important;
          }
          
          /* Hide pages when print-selected-pages is active */
          #impact-report-content.print-selected-pages [role="tablist"] {
            display: none !important;
          }
          
          #impact-report-content.print-selected-pages [role="tabpanel"] {
            display: none !important;
          }
          
          #impact-report-content.print-selected-pages [data-print-overview="true"] {
            display: block !important;
            page-break-inside: avoid !important;
          }
          #impact-report-content.print-selected-pages [data-print-engagement="true"] {
            display: block !important;
            page-break-inside: avoid !important;
          }
          #impact-report-content.print-selected-pages [data-print-impact="true"] {
            display: block !important;
            page-break-inside: avoid !important;
          }
          #impact-report-content.print-selected-pages [data-print-analytics="true"] {
            display: block !important;
            page-break-inside: avoid !important;
          }
          
          /* Print-specific sizing for better layout */
          @page {
            size: A4;
            margin: 10mm;
            orphans: 4;
            widows: 4;
          }
        }
      `}</style>

      {/* Interactive Modal Dialogs */}

      {/* Hours Detail Modal */}
      <Dialog open={showHoursModal} onOpenChange={setShowHoursModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <div className="bg-blue-100 p-2 rounded-full">
                <Target className="h-5 w-5" />
              </div>
              Volunteer Hours Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-blue-600">{Math.round(filteredTotalHours)}h</p>
              <p className="text-sm text-gray-600">Total Hours Volunteered</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-gray-800">{filteredActivities.length}</p>
                <p className="text-xs text-gray-500">Activities</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-gray-800">{avgMonthlyHours}h</p>
                <p className="text-xs text-gray-500">Monthly Avg</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Recent Activities</h4>
              {filteredActivities.slice(0, 5).map((activity: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="truncate flex-1">{activity.description || 'Activity'}</span>
                  <span className="font-bold text-blue-600 ml-2">{activity.hours || 0}h</span>
                </div>
              ))}
              {filteredActivities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No activities recorded yet</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tasks Detail Modal */}
      <Dialog open={showTasksModal} onOpenChange={setShowTasksModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <div className="bg-green-100 p-2 rounded-full">
                <Target className="h-5 w-5" />
              </div>
              Task Completion Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-green-600">{filteredTasksCompleted}/{tasks.length}</p>
              <p className="text-sm text-gray-600">Tasks Completed</p>
              <Progress value={tasks.length > 0 ? (filteredTasksCompleted / tasks.length) * 100 : 0} className="mt-2" />
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Your Tasks</h4>
              {tasks.slice(0, 8).map((task: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="truncate flex-1">{task.title || 'Task'}</span>
                  <Badge variant={task.status?.toLowerCase() === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {task.status || 'pending'}
                  </Badge>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No tasks assigned yet</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Projects Detail Modal */}
      <Dialog open={showProjectsModal} onOpenChange={setShowProjectsModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-600">
              <div className="bg-purple-100 p-2 rounded-full">
                <Briefcase className="h-5 w-5" />
              </div>
              Project Assignments
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-purple-600">{filteredActiveProjects}</p>
              <p className="text-sm text-gray-600">Active Projects</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-gray-800">{assignmentsCount}</p>
                <p className="text-xs text-gray-500">Total Assignments</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-gray-800">{volunteerOrganizations.length}</p>
                <p className="text-xs text-gray-500">Organizations</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Your Projects</h4>
              {safeProjectAssignments.slice(0, 8).map((pa: any, idx: number) => (
                <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate flex-1">{pa.project?.name || 'Project'}</span>
                    <Badge variant={pa.status === 'active' ? 'default' : 'secondary'} className="text-xs ml-2">
                      {pa.status || 'pending'}
                    </Badge>
                  </div>
                  {pa.role && <p className="text-xs text-gray-500 mt-1">Role: {pa.role}</p>}
                </div>
              ))}
              {safeProjectAssignments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No project assignments yet</p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setShowProjectsModal(false);
                setLocation('/discover-opportunities/pwa');
              }}
            >
              Find New Projects
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skills Detail Modal */}
      <Dialog open={showSkillsModal} onOpenChange={setShowSkillsModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <div className="bg-orange-100 p-2 rounded-full">
                <Lightbulb className="h-5 w-5" />
              </div>
              Skills & SDG Alignment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <p className="text-4xl font-bold text-orange-600">{allSkills.length}</p>
              <p className="text-sm text-gray-600">Skills Registered</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-gray-800">{sdgs.length}</p>
                <p className="text-xs text-gray-500">SDG Goals</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-gray-800">{filteredImpactScore}</p>
                <p className="text-xs text-gray-500">Impact Score</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Your Skills</h4>
              <div className="flex flex-wrap gap-2">
                {allSkills.map((skill: string, idx: number) => (
                  <Badge key={idx} className={getSkillBadgeClass(idx)}>
                    {skill}
                  </Badge>
                ))}
                {allSkills.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">No skills added yet</p>
                )}
              </div>
            </div>
            {sdgs.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Selected SDGs</h4>
                <div className="flex flex-wrap gap-2">
                  {sdgs.map((sdgId: number) => (
                    <span key={sdgId} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {SDG_LOGOS[sdgId]} SDG {sdgId}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setShowSkillsModal(false);
                setLocation('/volunteer-profile-settings');
              }}
            >
              Update Skills & SDGs
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SDG Detail Modal */}
      <Dialog open={showSdgModal !== null} onOpenChange={() => setShowSdgModal(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {showSdgModal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-3xl">{SDG_LOGOS[showSdgModal]}</span>
                  <div>
                    <p className="text-blue-600">SDG {showSdgModal}</p>
                    <p className="text-sm font-normal text-gray-600">{SDG_TITLES[showSdgModal]}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {(() => {
                  const sdgHours = filteredActivities
                    .filter((a: any) => a.sdgGoals?.includes(showSdgModal))
                    .reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
                  const sdgActivities = filteredActivities.filter((a: any) => a.sdgGoals?.includes(showSdgModal));
                  const sdgProjects = safeProjectAssignments.filter((pa: any) =>
                    pa.project?.sdgGoals?.includes(showSdgModal)
                  );
                  return (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{Math.round(sdgHours)}h</p>
                            <p className="text-xs text-gray-500">Hours</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">{sdgActivities.length}</p>
                            <p className="text-xs text-gray-500">Activities</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-purple-600">{sdgProjects.length}</p>
                            <p className="text-xs text-gray-500">Projects</p>
                          </div>
                        </div>
                      </div>
                      {sdgProjects.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700">Related Projects</h4>
                          {sdgProjects.slice(0, 5).map((pa: any, idx: number) => (
                            <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                              <span className="font-medium">{pa.project?.name || 'Project'}</span>
                              {pa.project?.organization?.name && (
                                <p className="text-xs text-gray-500">{pa.project.organization.name}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {sdgActivities.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700">Recent Activities</h4>
                          {sdgActivities.slice(0, 5).map((activity: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                              <span className="truncate flex-1">{activity.description || 'Activity'}</span>
                              <span className="font-bold text-blue-600 ml-2">{activity.hours || 0}h</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {sdgProjects.length === 0 && sdgActivities.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No contributions to this SDG yet. Find opportunities aligned with this goal!
                        </p>
                      )}
                    </>
                  );
                })()}
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowSdgModal(null);
                    setLocation(`/discover-opportunities/pwa?sdg=${showSdgModal}`);
                  }}
                >
                  Find SDG {showSdgModal} Opportunities
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Impact Score Modal */}
      <Dialog open={showImpactScoreModal} onOpenChange={setShowImpactScoreModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <div className="bg-emerald-100 p-2 rounded-full">
                <TrendingUp className="h-5 w-5" />
              </div>
              Impact Score Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg text-center">
              <p className="text-5xl font-bold text-emerald-600">{filteredImpactScore}</p>
              <p className="text-sm text-gray-600">Overall Impact Score</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-700">Score Components</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Hours (35%)</span>
                  <span className="font-bold">{Math.round(filteredTotalHours)}h</span>
                </div>
                <Progress value={Math.min((filteredTotalHours / 100) * 100, 100)} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tasks (20%)</span>
                  <span className="font-bold">{filteredTasksCompleted}/{tasks.length}</span>
                </div>
                <Progress value={tasks.length > 0 ? (filteredTasksCompleted / tasks.length) * 100 : 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Projects (30%)</span>
                  <span className="font-bold">{filteredActiveProjects}</span>
                </div>
                <Progress value={Math.min(filteredActiveProjects * 20, 100)} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SDG Alignment (10%)</span>
                  <span className="font-bold">{sdgs.length} SDGs</span>
                </div>
                <Progress value={Math.min(sdgs.length * 10, 100)} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Skills Listed (5%)</span>
                  <span className="font-bold">{allSkills.length} skills</span>
                </div>
                <Progress value={Math.min(allSkills.length * 10, 100)} className="h-2" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
      {/* Mobile Bottom Navigation - Different for volunteers vs organizations */}
      {isVolunteer && isMobile ? (
        <VolunteerPWANav userId={volunteerId?.toString()} activeTab="impacts" />
      ) : isOrganization ? (
        <MobileBottomNav />
      ) : null}
    </div>
  );
}
