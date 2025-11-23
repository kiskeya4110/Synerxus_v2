import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Share2, Copy, Printer, ArrowLeft, TrendingUp, Users, Target, BarChart3, Layout, Rows3, Download, Twitter, Linkedin, Facebook } from "lucide-react";
import type { User, Task, ProjectAssignment } from "@shared/schema";
import { sdgGoals, getSDGName } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/ui/logo";
declare const html2pdf: any;
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

export default function ImpactReport(props: any) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"tabs" | "single">("tabs");
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "quarter" | "year">("all");
  const [logoError, setLogoError] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printPageMode, setPrintPageMode] = useState<"all" | "selected">("all");
  const [selectedPrintPages, setSelectedPrintPages] = useState({
    overview: true,
    engagement: true,
    impact: true,
    analytics: true
  });
  const chartRefs = useRef<Record<string, any>>({});

  // Fetch the current logged-in user first
  const { data: loggedInUser } = useQuery<User>({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Failed to fetch current user');
      return response.json();
    }
  });

  // Get volunteer ID from URL params or current user
  const paramVolunteerId = props.volunteerId;
  const currentUserIdStr = localStorage.getItem('currentUserId');
  const volunteerId = paramVolunteerId 
    ? parseInt(paramVolunteerId) 
    : (currentUserIdStr ? parseInt(currentUserIdStr) : (loggedInUser?.id || undefined));

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
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", { volunteerId }],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's activities
  const { data: volunteerActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities", { volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${volunteerId}`);
      return response.json();
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

  // Fetch organizations
  const { data: organizations = [] } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations");
      return response.ok ? response.json() : [];
    }
  });

  // Get all unique organizations the volunteer has worked with
  const volunteerOrganizations = Array.from(
    new Set(
      projectAssignments
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
    : volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const completedTasks = tasks.filter(t => t.status?.toLowerCase() === "completed").length;
  const totalTasks = tasks.length;
  const activeProjects = dashboardData?.activeProjects !== undefined 
    ? dashboardData.activeProjects 
    : projectAssignments.filter(a => a.status === 'active').length;
  const allSkills = volunteerProfile?.skills || [];
  const sdgs = volunteerProfile?.preferredSdgs || [];
  const assignmentsCount = projectAssignments.length;

  // Calculate Total Impact Score (composite metric)
  const hoursScore = Math.min((totalHours / 100) * 100, 100);
  const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const projectsScore = Math.min((activeProjects / 5) * 100, 100);
  const skillsScore = Math.min((allSkills.length / 10) * 100, 100);
  const sdgScore = Math.min((sdgs.length / 5) * 100, 100);
  const totalImpactScore = Math.round((hoursScore + tasksScore + projectsScore + skillsScore + sdgScore) / 5);

  const shareUrl = `${window.location.origin}/impact-report/${volunteerId}`;

  // Filter activities by time period
  const getFilteredActivities = () => {
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
    
    return volunteerActivities.filter(a => {
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
  const avgMonthlyHours = monthlyHours.length > 0 ? (monthlyHours.reduce((sum, m) => sum + m.hours, 0) / monthlyHours.length).toFixed(1) : 0;

  // Update filtered KPIs
  const filteredTotalHours = filteredActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  
  // Show ALL assigned projects in the KPI (not just those with filtered activities)
  // The time filter should affect hours, not the project count
  const filteredActiveProjects = projectAssignments.filter(pa => 
    pa.status === 'active' || pa.status === 'Active' || pa.status === 'In Progress'
  ).length;
  
  // Calculate filtered tasks score (count completed tasks only, not filtered by time since completion is a point-in-time event)
  // But for consistency, we calculate tasks separately
  const filteredTasksCompleted = tasks.filter(t => t.status?.toLowerCase() === "completed").length;
  
  // Calculate filtered impact score
  const filteredHoursScore = Math.min((filteredTotalHours / 100) * 100, 100);
  const filteredTasksScore = totalTasks > 0 ? (filteredTasksCompleted / totalTasks) * 100 : 0;
  const filteredProjectsScore = Math.min((filteredActiveProjects / 5) * 100, 100);
  const filteredSkillsScore = Math.min((allSkills.length / 10) * 100, 100);
  const filteredSdgScore = Math.min((sdgs.length / 5) * 100, 100);
  const filteredImpactScore = Math.round((filteredHoursScore + filteredTasksScore + filteredProjectsScore + filteredSkillsScore + filteredSdgScore) / 5);

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
    const text = `Check out my Global Impact Report! I've contributed ${filteredTotalHours} hours and helped advance sustainable development goals.`;
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

  const projectsBreakdown = projectAssignments.map((pa: any) => ({
    name: pa.project?.name || 'Unknown',
    value: Math.floor(Math.random() * 100) + 20
  }));

  // Show error if no volunteer ID is available
  if (!volunteerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/my-work")}
            className="w-full md:w-auto justify-start md:justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Back to My Work</span>
            <span className="md:hidden">Back</span>
          </Button>
          
          <div className="flex gap-2 flex-wrap justify-between md:justify-end w-full md:w-auto">
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 print:hidden">
              <Button
                variant={viewMode === "tabs" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tabs")}
                className="h-8 px-2 md:px-3 text-xs md:text-sm"
                data-testid="view-mode-tabs"
              >
                <Layout className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tabs</span>
              </Button>
              <Button
                variant={viewMode === "single" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("single")}
                className="h-8 px-2 md:px-3 text-xs md:text-sm"
                data-testid="view-mode-single"
              >
                <Rows3 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Single</span>
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="print:hidden text-xs md:text-sm whitespace-nowrap"
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">Download PDF</span>
              <span className="md:hidden">PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintClick}
              className="print:hidden text-xs md:text-sm"
              data-testid="button-print"
            >
              <Printer className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">Print</span>
              <span className="md:hidden">Print</span>
            </Button>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 print:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('twitter')}
                className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                data-testid="button-share-twitter"
                title="Share on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('linkedin')}
                className="h-8 px-2 hover:bg-blue-200 dark:hover:bg-blue-800"
                data-testid="button-share-linkedin"
                title="Share on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('facebook')}
                className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
                data-testid="button-share-facebook"
                title="Share on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Impact Report Card */}
        <Card id="impact-report-content" className="bg-white dark:bg-slate-800 shadow-lg border-2 border-gray-200 dark:border-gray-700 print:shadow-none print:border-black">
          <CardContent className="p-4 md:p-6 lg:p-8 print:p-4">
            {/* Header Section - Split Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 md:mb-8 pb-4 md:pb-6 border-b-2 border-gray-200 dark:border-gray-700 print:mb-4 print:pb-3 print:gap-4">
              {/* Left: Volunteer Info & Logo */}
              <div className="md:col-span-2">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-6 mb-4 md:mb-0 print:gap-4 print:mb-3">
                  <Logo size="sm" className="print:scale-75" />
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

                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 print:text-2xl">
                  {currentUser?.displayName || currentUser?.username || 'Volunteer'}
                </p>
                
                <h1 className="text-lg md:text-xl lg:text-2xl font-semibold italic text-gray-700 dark:text-gray-300 print:text-lg">
                  Global Impact Report
                </h1>

                <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  <span>•</span>
                  <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              {/* Right: Organizations & Impact Score Box */}
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

                  <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">Overall Impact Score</p>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{filteredImpactScore}</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">out of 100</p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode Conditional: Tabs vs Single Page */}
            {viewMode === "tabs" ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 mb-4 md:mb-6 print:hidden">
                <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="engagement" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Engagement</span>
                </TabsTrigger>
                <TabsTrigger value="impact" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Impact</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 md:space-y-6">
                {/* Enhanced KPI Buttons in responsive grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4 print:gap-2">
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
                          <span className="font-bold text-blue-600 dark:text-blue-400">{(filteredTotalHours / filteredActivities.length).toFixed(1)}h</span>
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

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:page-break-inside-avoid">
                  {/* Monthly Hours Trend */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Monthly Hours Trend
                      </h3>
                      {bestMonth && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 mb-3 text-xs">
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Peak Performance:</strong> {bestMonth.month} with {bestMonth.hours}h logged
                          </p>
                        </div>
                      )}
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
                          {allSkills.map((skill: string) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
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
                        Beneficiaries
                      </h3>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                        {activeProjects * 10}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Estimated reached
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* SDG Impact Section - Compact with Emojis */}
                {sdgs.length > 0 && (
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        UN Sustainable Development Goals
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sdgs.map((sdgId: number) => {
                          const goal = sdgGoals[sdgId];
                          const title = SDG_TITLES[sdgId];
                          return (
                            <div
                              key={sdgId}
                              className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 hover:shadow-md transition-all"
                            >
                              <span className="text-4xl flex-shrink-0">
                                {SDG_LOGOS[sdgId]}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white text-sm">
                                  SDG {sdgId}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold leading-tight">
                                  {title}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                          <span className="font-bold text-blue-600 dark:text-blue-400">{(filteredTotalHours / filteredActivities.length).toFixed(1)}h</span>
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
                      {bestMonth && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 mb-3 text-xs">
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Peak Performance:</strong> {bestMonth.month} with {bestMonth.hours}h logged
                          </p>
                        </div>
                      )}
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
                        {allSkills.map((skill: string) => (
                          <Badge key={skill} variant="secondary">{skill}</Badge>
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
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Beneficiaries</h3>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{activeProjects * 10}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Estimated reached</p>
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
                Generated on {new Date().toLocaleDateString()} • Global Impact Report {timeFilter !== 'all' && `(${['All Time', 'This Month', 'This Quarter', 'This Year'][['all', 'month', 'quarter', 'year'].indexOf(timeFilter)]})`}
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
    </div>
  );
}
