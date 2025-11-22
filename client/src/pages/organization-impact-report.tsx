import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CompletionProgress } from "@/components/ui/completion-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Copy, Printer, ArrowLeft, TrendingUp, Users, Target, BarChart3, Layout, Rows3, Download, Twitter, Linkedin, Facebook, Building2, DollarSign, Zap, Crown, Clock, Award } from "lucide-react";
import type { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/ui/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
declare const html2pdf: any;
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadarController,
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
  RadarController,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function OrganizationImpactReport(props: any) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"tabs" | "single">("tabs");
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all');
  const chartRefs = useRef<Record<string, any>>({});

  // Call ALL hooks unconditionally at the top - this is required by React
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
  });

  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/organizations/${currentUser.organizationId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!currentUser?.organizationId,
  });

  const { data: volunteers = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteers"],
    queryFn: async () => {
      const response = await fetch("/api/volunteers");
      return response.ok ? response.json() : [];
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      return response.ok ? response.json() : [];
    },
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(`/api/projects?organizationId=${currentUser.organizationId}`);
      return response.ok ? response.json() : [];
    },
    enabled: !!currentUser?.organizationId,
  });

  const { data: volunteerActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities"],
    queryFn: async () => {
      const response = await fetch("/api/volunteer-activities");
      return response.ok ? response.json() : [];
    },
  });

  // Access control: Only organization managers can view this report
  const isOrganizationManager = currentUser && currentUser.organizationId && currentUser.userType === 'organization';

  // Filter activities by organization's projects
  const orgProjectIds = new Set(projects.map(p => p.id));
  const filteredActivities = volunteerActivities.filter(a => orgProjectIds.has(a.projectId));

  // Filter by time period
  const getFilteredActivitiesByTime = () => {
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
    
    return filteredActivities.filter(a => {
      if (!a.date) return true;
      const activityDate = new Date(a.date);
      return activityDate >= startDate;
    });
  };

  const timeFilteredActivities = getFilteredActivitiesByTime();

  // Calculate organizational metrics
  // Count volunteers with assignments/activities in this organization
  const activeVolunteerIds = new Set<number>();
  projects.forEach(project => {
    if (project.volunteers) {
      const vols = Array.isArray(project.volunteers) ? project.volunteers : [];
      vols.forEach((v: any) => activeVolunteerIds.add(typeof v === 'number' ? v : v.id));
    }
  });
  filteredActivities.forEach(activity => {
    if (activity.userId) activeVolunteerIds.add(activity.userId);
  });

  // Count project managers (users with userType === 'organization' in this org)
  const projectManagers = users.filter(u => 
    u.organizationId === currentUser?.organizationId && u.userType === 'organization'
  ).length;

  const activeVolunteers = activeVolunteerIds.size > 0 ? activeVolunteerIds.size : volunteers.filter(v => v.organizationId === currentUser?.organizationId).length;
  const totalTeam = activeVolunteers + projectManagers;
  const totalProjects = projects.length;
  const beneficiariesServed = Math.floor(Math.random() * 5000) + 2000;
  const fundingSecured = Math.floor(Math.random() * 500000) + 100000;
  const totalHours = timeFilteredActivities.reduce((sum, a) => sum + (a.hours || 0), 0);

  // Calculate Impact Leader (most impactful volunteer for selected time period)
  const volunteerHoursMap = new Map<number, { hours: number; name: string; activities: number }>();
  timeFilteredActivities.forEach(activity => {
    if (activity.userId) {
      const user = users.find(u => u.id === activity.userId);
      const current = volunteerHoursMap.get(activity.userId) || { hours: 0, name: user?.displayName || 'Unknown', activities: 0 };
      current.hours += activity.hours || 0;
      current.activities += 1;
      volunteerHoursMap.set(activity.userId, current);
    }
  });

  const impactLeader = Array.from(volunteerHoursMap.entries())
    .sort((a, b) => b[1].hours - a[1].hours)[0];
  
  const leaderData = impactLeader ? {
    userId: impactLeader[0],
    name: impactLeader[1].name,
    hours: impactLeader[1].hours,
    activities: impactLeader[1].activities,
    avatar: users.find(u => u.id === impactLeader[0])?.avatar || undefined
  } : null;

  // Financial metrics (sample data)
  const totalRevenue = fundingSecured;
  const totalExpenses = Math.floor(totalRevenue * 0.75);
  const operatingMargin = Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100);
  const costPerBeneficiary = Math.round(totalExpenses / Math.max(1, beneficiariesServed));
  const programEfficiencyRate = 81.7;

  const shareUrl = `${window.location.origin}/organization-impact-report/${organization?.id || ''}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Copied!",
      description: "Organization report link copied to clipboard",
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('org-impact-report-content');
    if (!element) return;
    
    const opt = {
      margin: 10,
      filename: `Organization_Impact_Report_${organization?.name || 'Report'}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(element).save();
    toast({
      title: "Downloaded!",
      description: "Organization impact report has been saved as PDF",
    });
  };

  const handleShareSocial = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    const text = `Check out ${organization?.name || 'our'} Impact Report! We've served ${beneficiariesServed.toLocaleString()} beneficiaries and mobilized ${activeVolunteers} volunteers.`;
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

  // Generate data for charts
  const quarterlyGrowth = [
    { quarter: 'Q1', volunteers: 45, hours: 1200, beneficiaries: 500 },
    { quarter: 'Q2', volunteers: 58, hours: 1680, beneficiaries: 720 },
    { quarter: 'Q3', volunteers: 72, hours: 2160, beneficiaries: 920 },
    { quarter: 'Q4', volunteers: activeVolunteers, hours: totalHours, beneficiaries: beneficiariesServed }
  ];

  const programDistribution = [
    { name: 'Education', value: 35, color: '#3b82f6' },
    { name: 'Healthcare', value: 28, color: '#10b981' },
    { name: 'Environment', value: 20, color: '#f59e0b' },
    { name: 'Community', value: 17, color: '#ef4444' }
  ];

  const budgetAllocation = [
    { category: 'Programs', value: 65 },
    { category: 'Operations', value: 20 },
    { category: 'Admin', value: 10 },
    { category: 'Reserve', value: 5 }
  ];

  const revenueSource = [
    { source: 'Grants', value: 40 },
    { source: 'Donations', value: 35 },
    { source: 'Corporate', value: 20 },
    { source: 'Other', value: 5 }
  ];

  const topPrograms = [
    { name: 'Youth Education', completion: 92, impact: 95, beneficiaries: 450 },
    { name: 'Health Camps', completion: 88, impact: 90, beneficiaries: 320 },
    { name: 'Clean Water', completion: 85, impact: 88, beneficiaries: 280 },
    { name: 'Community Garden', completion: 78, impact: 82, beneficiaries: 150 }
  ];

  const organizationalPerformance = {
    labels: ['Volunteer\nEngagement', 'Financial\nHealth', 'Program\nQuality', 'Community\nImpact'],
    datasets: [{
      label: 'Performance Score',
      data: [85, 78, 88, 91],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 2,
    }]
  };

  const monthlyEngagement = [
    { month: 'Jan', volunteers: 45, hours: 980 },
    { month: 'Feb', volunteers: 50, hours: 1100 },
    { month: 'Mar', volunteers: 55, hours: 1250 },
    { month: 'Apr', volunteers: 62, hours: 1450 },
    { month: 'May', volunteers: 68, hours: 1600 },
    { month: 'Jun', volunteers: 72, hours: 1800 },
  ];

  // Render access denied UI if not authorized
  if (!currentUser || !isOrganizationManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-2 border-red-200 dark:border-red-900">
          <CardContent className="p-8 text-center">
            <div className="mb-4 text-4xl">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Organization Impact Reports can only be accessed by organization managers.
            </p>
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Actions */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex gap-2 flex-wrap items-center">
            {/* Time Filter */}
            <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
              <SelectTrigger className="w-32 print:hidden">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 print:hidden">
              <Button
                variant={viewMode === "tabs" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tabs")}
                className="h-8 px-3"
              >
                <Layout className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tabs</span>
              </Button>
              <Button
                variant={viewMode === "single" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("single")}
                className="h-8 px-3"
              >
                <Rows3 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Single</span>
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="print:hidden"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 print:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('twitter')}
                className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('linkedin')}
                className="h-8 px-2 hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShareSocial('facebook')}
                className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                <Facebook className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Report Card */}
        <Card id="org-impact-report-content" className="bg-white dark:bg-slate-800 shadow-lg border-2 border-gray-200 dark:border-gray-700 print:shadow-none print:border-black">
          <CardContent className="p-8 print:p-4">
            {/* Header Section - Simplified, no green bar */}
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-200 dark:border-gray-700 print:mb-4 print:pb-3">
              <div className="flex items-center justify-center gap-6 mb-4 print:gap-4 print:mb-3">
                <Logo size="sm" className="print:scale-75" />
              </div>

              <p className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 print:text-2xl">
                {organization?.name || 'Your Organization'}
              </p>
              
              <h1 className="text-xl md:text-2xl font-semibold text-gray-700 dark:text-gray-300 print:text-lg mb-4">
                Organization Impact Report
              </h1>

              <div className="inline-block">
                <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 text-base print:text-sm">
                  Impact Score: {Math.round((activeVolunteers / 100) * 85 + operatingMargin / 2)}/100
                </Badge>
              </div>

              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                <span>•</span>
                <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            {/* View Mode Content */}
            {viewMode === "tabs" ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6 print:hidden">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="programs" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Programs</span>
                </TabsTrigger>
                <TabsTrigger value="operations" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Operations</span>
                </TabsTrigger>
                <TabsTrigger value="financial" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Financial</span>
                </TabsTrigger>
                <TabsTrigger value="impact" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Impact</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Overview buttons in 2 rows x 4 columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Team Members</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalTeam}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeVolunteers} volunteers + {projectManagers} managers</p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Total Hours Logged</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalHours}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Real data from {filteredActivities.length} activities</p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Projects Managed</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalProjects}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active projects</p>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Avg Hours per Vol</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{activeVolunteers > 0 ? (totalHours / activeVolunteers).toFixed(1) : 0}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per volunteer average</p>
                  </div>
                </div>

                {/* Impact Leader Section - with time period label */}
                {leaderData && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-6 rounded-lg border-2 border-yellow-200 dark:border-yellow-700 hover:shadow-lg transition-shadow"
                    data-testid="impact-leader-card"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                        <div>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 uppercase font-semibold">Impact Leader ({timeFilter === 'all' ? 'All Time' : timeFilter === 'month' ? 'This Month' : timeFilter === 'quarter' ? 'This Quarter' : 'This Year'})</p>
                          <h3 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{leaderData.name}</h3>
                        </div>
                      </div>
                      <Badge className="bg-yellow-600 text-white text-lg px-4 py-2">⭐ Top Volunteer</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Hours Contributed</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{Math.round(leaderData.hours)}h</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Activities</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{leaderData.activities}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Avg per Activity</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{(leaderData.hours / leaderData.activities).toFixed(1)}h</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 text-center">
                      This volunteer has made the most significant impact during the selected period.
                    </p>
                  </div>
                )}

                {/* KPIs in 1 row: Quarterly Growth, Performance Radar, Monthly Engagement */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Quarterly Growth */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quarterly Growth</h3>
                      <Line
                        data={{
                          labels: quarterlyGrowth.map(q => q.quarter),
                          datasets: [{
                            label: 'Beneficiaries',
                            data: quarterlyGrowth.map(q => q.beneficiaries),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                          }]
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

                  {/* Organizational Performance Radar */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Radar</h3>
                      <Radar
                        data={organizationalPerformance}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: { 
                            legend: { position: 'bottom', labels: { font: { size: 12 } } },
                            tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 }
                          },
                          scales: { 
                            r: { 
                              beginAtZero: true, 
                              max: 100,
                              ticks: { font: { size: 12, weight: 'bold' } },
                              pointLabels: {
                                font: { size: 11, weight: 'bold', lineHeight: 1.3 },
                                padding: 15
                              }
                            } 
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Monthly Engagement */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Engagement</h3>
                      <Line
                        data={{
                          labels: monthlyEngagement.map(m => m.month),
                          datasets: [{
                            label: 'Volunteer Hours',
                            data: monthlyEngagement.map(m => m.hours),
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                          }]
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
                </div>
              </TabsContent>

              {/* Programs Tab - KPIs in 1 row and 4 columns */}
              <TabsContent value="programs" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {topPrograms.map((prog, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">{prog.name}</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Completion</span>
                            <span className="font-bold">{prog.completion}%</span>
                          </div>
                          <CompletionProgress value={prog.completion} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Impact</span>
                            <span className="font-bold">{prog.impact}%</span>
                          </div>
                          <Progress value={prog.impact} className="h-2" />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 pt-1 border-t">
                          {prog.beneficiaries} beneficiaries
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Operations Tab - in 1 row and 4 columns */}
              <TabsContent value="operations" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resource Allocation & Operational Metrics</h3>
                      <Bar
                        data={{
                          labels: ['Staff', 'Volunteers', 'Equipment', 'Facilities'],
                          datasets: [{
                            label: 'Resource Units',
                            data: [25, 72, 40, 15],
                            backgroundColor: '#f59e0b',
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          indexAxis: 'y' as any,
                          plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } },
                          scales: { x: { beginAtZero: true } }
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Partnership Network</h3>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">12</div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Corporate</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900 rounded">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">8</div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Government</p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">15</div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Educational</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900 rounded">
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">10</div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Non-Profit</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Financial Tab - Health indicators compact on left, Impact 2x2 on right */}
              <TabsContent value="financial" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Health Indicators Compact */}
                  <Card className="border border-gray-200 dark:border-gray-700 lg:col-span-1">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Health</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                          <span>Liquidity Ratio</span>
                          <Badge className="bg-green-100 text-green-800 text-xs">2.5x</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                          <span>Reserve Fund</span>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">6 mo</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                          <span>Growth Rate</span>
                          <Badge className="bg-green-100 text-green-800 text-xs">+18%</Badge>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                          <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Total Revenue</p>
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">${(totalRevenue / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg border border-green-200 dark:border-green-700">
                          <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Total Expenses</p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">${(totalExpenses / 1000).toFixed(0)}K</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right: Impact 2x2 Grid */}
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Sources</h3>
                        <Pie
                          data={{
                            labels: revenueSource.map(r => r.source),
                            datasets: [{
                              data: revenueSource.map(r => r.value),
                              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } }
                          }}
                        />
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget Allocation</h3>
                        <Pie
                          data={{
                            labels: budgetAllocation.map(b => b.category),
                            datasets: [{
                              data: budgetAllocation.map(b => b.value),
                              backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } }
                          }}
                        />
                      </CardContent>
                    </Card>

                    <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Operating Margin</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{operatingMargin}%</p>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                      <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Program Efficiency</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{programEfficiencyRate}%</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Impact Tab */}
              <TabsContent value="impact" className="space-y-6">
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Community Impact By Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {programDistribution.map((prog, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prog.color }}></div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{prog.name}</h4>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{prog.value}%</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Community impact reach</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Success Stories & Testimonials</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"This program changed the lives of 500+ children, providing access to quality education they never had before."</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">- Community Leader</p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-l-4 border-green-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"The health camps reached 320 families and provided preventive care that saved lives."</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">- Health Volunteer</p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border-l-4 border-purple-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"The environmental initiatives created sustainable livelihoods for 150+ families."</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">- Project Coordinator</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Long-term Impact Indicators</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Lives Transformed</span>
                          <span className="text-sm font-bold">{(beneficiariesServed * 1.2).toLocaleString()}</span>
                        </div>
                        <Progress value={85} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Sustainability Index</span>
                          <span className="text-sm font-bold">8.2/10</span>
                        </div>
                        <Progress value={82} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Community Satisfaction</span>
                          <span className="text-sm font-bold">94%</span>
                        </div>
                        <Progress value={94} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">SDG Alignment</span>
                          <span className="text-sm font-bold">6/17 Goals</span>
                        </div>
                        <Progress value={35} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            ) : (
            // Single Page View - Comprehensive Report with ALL Tabs Content
            <div className="space-y-8">
              {/* OVERVIEW SECTION */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-blue-200 dark:border-blue-700 text-center">Overview</h2>
                
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Team Members</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalTeam}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeVolunteers} volunteers + {projectManagers} managers</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Total Hours Logged</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalHours}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Real data from {filteredActivities.length} activities</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Projects Managed</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalProjects}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active projects</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Avg Hours per Vol</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{activeVolunteers > 0 ? (totalHours / activeVolunteers).toFixed(1) : 0}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per volunteer average</p>
                  </div>
                </div>

                {/* Impact Leader */}
                {leaderData && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-6 rounded-lg border-2 border-yellow-200 dark:border-yellow-700 mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                        <div>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 uppercase font-semibold">Impact Leader</p>
                          <h3 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{leaderData.name}</h3>
                        </div>
                      </div>
                      <Badge className="bg-yellow-600 text-white text-lg px-4 py-2">⭐ Top Volunteer</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Hours Contributed</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{Math.round(leaderData.hours)}h</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Activities</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{leaderData.activities}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Avg per Activity</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{(leaderData.hours / leaderData.activities).toFixed(1)}h</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quarterly Growth</h3>
                      <Line data={{ labels: quarterlyGrowth.map(q => q.quarter), datasets: [{ label: 'Beneficiaries', data: quarterlyGrowth.map(q => q.beneficiaries), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4, borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } }, scales: { y: { beginAtZero: true } } }} />
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Radar</h3>
                      <Radar data={{ labels: ['Volunteer\nEngagement', 'Quality\nMetrics', 'Community\nReach', 'Resource\nEfficiency', 'Impact\nDelivery'], datasets: [{ label: 'Performance Score', data: [85, 92, 78, 88, 90], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', fill: true, tension: 0.4, pointRadius: 5, pointHoverRadius: 7 }] }} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } }, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } } }} />
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Engagement */}
                <Card className="border border-gray-200 dark:border-gray-700 mt-6">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Volunteer Engagement</h3>
                    <Line data={{ labels: monthlyEngagement.map(m => m.month), datasets: [{ label: 'Volunteer Hours', data: monthlyEngagement.map(m => m.hours), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } }, scales: { y: { beginAtZero: true } } }} />
                  </CardContent>
                </Card>
              </div>

              {/* PROGRAMS SECTION */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-green-200 dark:border-green-700 text-center">Programs</h2>
                <Card className="border border-gray-200 dark:border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Programs Performance</h3>
                    <div className="space-y-4">
                      {topPrograms.map((prog, idx) => (
                        <div key={idx} className="border-b pb-4 last:border-0">
                          <div className="flex justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{prog.name}</h4>
                            <span className="text-sm text-gray-500">{prog.beneficiaries} beneficiaries</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Completion Rate</span>
                                <span>{prog.completion}%</span>
                              </div>
                              <CompletionProgress value={prog.completion} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Impact Score</span>
                                <span>{prog.impact}%</span>
                              </div>
                              <Progress value={prog.impact} className="h-2" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* OPERATIONS SECTION */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-orange-200 dark:border-orange-700 text-center">Operations</h2>
                
                {/* Resource & Metrics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resource Allocation</h3>
                      <Bar data={{ labels: ['Staff', 'Volunteers', 'Equipment', 'Facilities'], datasets: [{ label: 'Resource Units', data: [25, 72, 40, 15], backgroundColor: '#f59e0b' }] }} options={{ responsive: true, maintainAspectRatio: true, indexAxis: 'y' as any, plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } }, scales: { x: { beginAtZero: true } } }} />
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Operational Metrics</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Volunteer Capacity</span>
                            <span className="text-sm font-bold">85%</span>
                          </div>
                          <Progress value={85} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Resource Efficiency</span>
                            <span className="text-sm font-bold">78%</span>
                          </div>
                          <Progress value={78} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Quality Scores</span>
                            <span className="text-sm font-bold">92%</span>
                          </div>
                          <Progress value={92} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Partnership Network */}
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Partnership Network</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">12</div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Corporate</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900 rounded">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">8</div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Government</p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900 rounded">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">15</div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Educational</p>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-900 rounded">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">10</div>
                        <p className="text-xs text-gray-600 dark:text-gray-300">Non-Profit</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* FINANCIAL SECTION */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-purple-200 dark:border-purple-700 text-center">Financial</h2>
                
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${(totalRevenue / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">${(totalExpenses / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Operating Margin</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{operatingMargin}%</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Program Efficiency</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{programEfficiencyRate}%</p>
                  </div>
                </div>

                {/* Financial Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Sources</h3>
                      <Pie data={{ labels: revenueSource.map(r => r.source), datasets: [{ data: revenueSource.map(r => r.value), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] }] }} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } } }} />
                    </CardContent>
                  </Card>
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget Allocation</h3>
                      <Pie data={{ labels: budgetAllocation.map(b => b.category), datasets: [{ data: budgetAllocation.map(b => b.value), backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] }} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' }, tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 } } }} />
                    </CardContent>
                  </Card>
                </div>

                {/* Financial Health */}
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Health Indicators</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                        <span className="text-sm">Liquidity Ratio</span>
                        <Badge className="bg-green-100 text-green-800">2.5x Healthy</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                        <span className="text-sm">Reserve Fund</span>
                        <Badge className="bg-blue-100 text-blue-800">6 months</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                        <span className="text-sm">Growth Rate</span>
                        <Badge className="bg-green-100 text-green-800">+18% YoY</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* IMPACT SECTION */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-red-200 dark:border-red-700 text-center">Impact</h2>
                
                {/* Community Impact Categories */}
                <Card className="border border-gray-200 dark:border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Community Impact By Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {programDistribution.map((prog, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prog.color }}></div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{prog.name}</h4>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{prog.value}%</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Community impact reach</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Success Stories */}
                <Card className="border border-gray-200 dark:border-gray-700 mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Success Stories & Testimonials</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"This program changed the lives of 500+ children, providing access to quality education they never had before."</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">- Community Leader</p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-l-4 border-green-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"The health camps reached 320 families and provided preventive care that saved lives."</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">- Health Volunteer</p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border-l-4 border-purple-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"The environmental initiatives created sustainable livelihoods for 150+ families."</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">- Project Coordinator</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Long-term Impact Indicators */}
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Long-term Impact Indicators</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Lives Transformed</span>
                          <span className="text-sm font-bold">{(beneficiariesServed * 1.2).toLocaleString()}</span>
                        </div>
                        <Progress value={85} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Sustainability Index</span>
                          <span className="text-sm font-bold">8.2/10</span>
                        </div>
                        <Progress value={82} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Community Satisfaction</span>
                          <span className="text-sm font-bold">94%</span>
                        </div>
                        <Progress value={94} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">SDG Alignment</span>
                          <span className="text-sm font-bold">6/17 Goals</span>
                        </div>
                        <Progress value={35} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:p-4 { padding: 1rem !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:pb-3 { padding-bottom: 0.75rem !important; }
          .print\\:gap-4 { gap: 1rem !important; }
          .print\\:mb-3 { margin-bottom: 0.75rem !important; }
          .print\\:text-2xl { font-size: 1.5rem !important; }
          .print\\:text-xs { font-size: 0.75rem !important; }
          .print\\:text-sm { font-size: 0.875rem !important; }
          .print\\:scale-75 { transform: scale(0.75) !important; }
        }
      `}</style>
    </div>
  );
}
