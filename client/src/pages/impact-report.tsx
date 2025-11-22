import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, Copy, Printer, ArrowLeft, TrendingUp, Users, Target, BarChart3, Layout, Rows3 } from "lucide-react";
import type { User, Task, ProjectAssignment } from "@shared/schema";
import { sdgGoals, getSDGName } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/ui/logo";
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

export default function ImpactReport(props: any) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"tabs" | "single">("tabs");
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "quarter" | "year">("all");
  const chartRefs = useRef<Record<string, any>>({});

  // Get volunteer ID from URL params or current user
  const paramVolunteerId = props.volunteerId;
  const currentUserIdStr = localStorage.getItem('currentUserId');
  const volunteerId = paramVolunteerId ? parseInt(paramVolunteerId) : (currentUserIdStr ? parseInt(currentUserIdStr) : undefined);

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

  // Fetch organizations
  const { data: organizations = [] } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations");
      return response.ok ? response.json() : [];
    }
  });

  const primaryOrganization = organizations.length > 0 
    ? organizations.find((org: any) => projectAssignments.some((pa: any) => pa.project?.organizationId === org.id))
    : null;

  // Calculate impact metrics
  const totalHours = volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const completedTasks = tasks.filter(t => t.status?.toLowerCase() === "completed").length;
  const totalTasks = tasks.length;
  const activeProjects = projectAssignments.filter(a => a.status === 'active').length;
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Copied!",
      description: "Impact report link copied to clipboard",
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  // Mock data for charts
  const monthlyHours = [8, 12, 15, 10, 18, 20, 16].map((h, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][i],
    hours: h
  }));

  const skillsData = allSkills.slice(0, 5).map((skill: any) => ({
    name: skill,
    projects: Math.floor(Math.random() * 4) + 1
  }));

  const projectsBreakdown = projectAssignments.map((pa: any) => ({
    name: pa.project?.name || 'Unknown',
    value: Math.floor(Math.random() * 100) + 20
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/my-work")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Work
          </Button>
          
          <div className="flex gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 print:hidden">
              <Button
                variant={viewMode === "tabs" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tabs")}
                className="h-8 px-3"
                data-testid="view-mode-tabs"
              >
                <Layout className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tabs</span>
              </Button>
              <Button
                variant={viewMode === "single" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("single")}
                className="h-8 px-3"
                data-testid="view-mode-single"
              >
                <Rows3 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Single</span>
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="print:hidden"
              data-testid="button-copy-link"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden"
              data-testid="button-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print/PDF
            </Button>
          </div>
        </div>

        {/* Main Impact Report Card */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border-2 border-blue-200 dark:border-blue-900 print:shadow-none print:border-black">
          <CardContent className="p-8 print:p-4">
            {/* Header Section with Logos */}
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-200 dark:border-gray-700 print:mb-4 print:pb-3">
              {/* Logo Section */}
              <div className="flex items-center justify-center gap-6 mb-4 print:gap-4 print:mb-3">
                <Logo size="sm" className="print:scale-75" />
                {primaryOrganization?.logo && (
                  <div className="flex items-center gap-2">
                    <div className="border-l-2 border-gray-300 dark:border-gray-600 pl-6 print:pl-3 print:border-gray-400">
                      <img
                        src={primaryOrganization.logo}
                        alt={primaryOrganization.name}
                        className="h-12 w-auto object-contain print:h-8"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Title with Total Impact Score */}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white print:text-2xl mb-3">
                Global Impact Report
              </h1>
              
              <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 print:text-2xl">
                {currentUser?.displayName || currentUser?.username || 'Volunteer'}
              </p>

              {primaryOrganization && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 print:text-xs">
                  {primaryOrganization.name}
                </p>
              )}

              {/* Total Impact Score Badge */}
              <div className="mt-4 inline-block">
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 text-base print:text-sm">
                  Total Impact Score: {totalImpactScore}/100
                </Badge>
              </div>

              {/* Time Filter */}
              <div className="mt-4 mb-3 flex items-center justify-center gap-2 flex-wrap print:hidden">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Time Period:</span>
                <div className="flex gap-2">
                  {[
                    { value: "all", label: "All Time" },
                    { value: "month", label: "This Month" },
                    { value: "quarter", label: "This Quarter" },
                    { value: "year", label: "This Year" }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={timeFilter === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeFilter(option.value as any)}
                      className="text-xs"
                      data-testid={`time-filter-${option.value}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Report ID and Date */}
              <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400 print:text-xs print:mt-2">
                <span>Report ID: {volunteerId || 'N/A'}</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            {/* View Mode: Tabs or Single Page */}
            {viewMode === "tabs" ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6 print:hidden">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="engagement" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Engagement</span>
                </TabsTrigger>
                <TabsTrigger value="impact" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Impact</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                      Hours Logged
                    </p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {totalHours}h
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Avg: {(totalHours / Math.max(1, projectAssignments.length)).toFixed(1)}h per project
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                      Tasks Completed
                    </p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {completedTasks}/{totalTasks}
                    </p>
                    <Progress value={totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0} className="mt-2 h-1" />
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                      Active Projects
                    </p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {activeProjects}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      of {assignmentsCount} assignments
                    </p>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">
                      Skills Applied
                    </p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {allSkills.length}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {sdgs.length} SDG{sdgs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Hours Trend */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Monthly Hours Trend
                      </h3>
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
                          plugins: { legend: { display: false } }
                        }}
                      />
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
                            plugins: { legend: { position: 'bottom' } }
                          }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Engagement Tab */}
              <TabsContent value="engagement" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                            </span>
                          </div>
                          <Progress value={totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0} />
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
              </TabsContent>

              {/* Impact Tab */}
              <TabsContent value="impact" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">
                        Economic Value
                      </h3>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                        ${(totalHours * 25).toLocaleString()}
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
                        {Math.round(totalHours * 0.5)} kg
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
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2">
                        {sdgs.map((sdgId: number) => {
                          const goal = sdgGoals[sdgId];
                          return (
                            <div
                              key={sdgId}
                              className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
                              title={goal?.name || getSDGName(sdgId)}
                            >
                              <span className="text-2xl mb-1">
                                {SDG_LOGOS[sdgId]}
                              </span>
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                SDG {sdgId}
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-400 text-center line-clamp-1 hidden group-hover:block absolute bottom-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-1 rounded text-xs whitespace-nowrap z-10">
                                {goal?.name || getSDGName(sdgId)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
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
                            { kpi: 'Monthly Hours', target: 20, actual: Math.min(totalHours, 20) },
                            { kpi: 'Tasks Completed', target: 10, actual: Math.min(completedTasks, 10) },
                            { kpi: 'Active Projects', target: 3, actual: Math.min(activeProjects, 3) },
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
                      {totalHours < 20 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            Increase volunteer hours by focusing on {activeProjects > 0 ? 'your most impactful projects' : 'available opportunities'}
                          </span>
                        </li>
                      )}
                      {totalTasks > 0 && (completedTasks / totalTasks) < 0.8 && (
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
                      {completedTasks > 5 && (
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
              </TabsContent>
            </Tabs>
            ) : (
            // Single Page View - All content in sequence
            <div className="space-y-6">
              {/* Overview Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-blue-200 dark:border-blue-700 flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  Overview
                </h2>
                
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Hours Logged</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalHours}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Avg: {(totalHours / Math.max(1, projectAssignments.length)).toFixed(1)}h per project</p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Tasks Completed</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{completedTasks}/{totalTasks}</p>
                    <Progress value={totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0} className="mt-2 h-1" />
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Active Projects</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{activeProjects}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">of {assignmentsCount} assignments</p>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                    <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold mb-1">Skills Applied</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{allSkills.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sdgs.length} SDG{sdgs.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Hours Trend</h3>
                      <Line ref={(ref) => chartRefs.current['monthlyHours'] = ref} data={{ labels: monthlyHours.map(d => d.month), datasets: [{ label: 'Hours Logged', data: monthlyHours.map(d => d.hours), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4, borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }} />
                    </CardContent>
                  </Card>

                  {projectsBreakdown.length > 0 && (
                    <Card className="border border-gray-200 dark:border-gray-700">
                      <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Distribution</h3>
                        <Pie ref={(ref) => chartRefs.current['projectDist'] = ref} data={{ labels: projectsBreakdown.map(p => p.name).slice(0, 5), datasets: [{ data: projectsBreakdown.map(p => p.value).slice(0, 5), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] }} options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }} />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Engagement Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-green-200 dark:border-green-700 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Engagement
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skills Assessment</h3>
                      {skillsData.length > 0 ? (
                        <Bar ref={(ref) => chartRefs.current['skills'] = ref} data={{ labels: skillsData.map((s: any) => s.name), datasets: [{ label: 'Projects Using Skill', data: skillsData.map((s: any) => s.projects), backgroundColor: '#10b981' }] }} options={{ responsive: true, maintainAspectRatio: true, indexAxis: 'y' as any, plugins: { legend: { display: false } } }} />
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No skills data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement Metrics</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Task Completion Rate</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
                          </div>
                          <Progress value={totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0} />
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
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-purple-200 dark:border-purple-700 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  Impact
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Economic Value</h3>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">${(totalHours * 25).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">@ $25/hour average</p>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Environmental Impact</h3>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{Math.round(totalHours * 0.5)} kg</p>
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
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2">
                        {sdgs.map((sdgId: number) => {
                          const goal = sdgGoals[sdgId];
                          return (
                            <div key={sdgId} className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all group" title={goal?.name || getSDGName(sdgId)}>
                              <span className="text-2xl mb-1">{SDG_LOGOS[sdgId]}</span>
                              <span className="text-xs font-bold text-gray-900 dark:text-white">SDG {sdgId}</span>
                              <span className="text-xs text-gray-600 dark:text-gray-400 text-center line-clamp-1 hidden group-hover:block absolute bottom-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-1 rounded text-xs whitespace-nowrap z-10">{goal?.name || getSDGName(sdgId)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Analytics Section */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b-2 border-orange-200 dark:border-orange-700 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Analytics
                </h2>

                <Card className="border border-gray-200 dark:border-gray-700 mb-6">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">KPI Tracking: Target vs. Actuals</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">KPI</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">Target</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">Actual</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">% Achieved</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-900 dark:text-white">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {[
                            { kpi: 'Monthly Hours', target: 20, actual: Math.min(totalHours, 20) },
                            { kpi: 'Tasks Completed', target: 10, actual: Math.min(completedTasks, 10) },
                            { kpi: 'Active Projects', target: 3, actual: Math.min(activeProjects, 3) },
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

                <Card className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Strategic Recommendations</h3>
                    <ul className="space-y-3">
                      {totalHours < 20 && (
                        <li className="flex gap-3">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">→</span>
                          <span className="text-gray-700 dark:text-gray-300">Increase volunteer hours by focusing on {activeProjects > 0 ? 'your most impactful projects' : 'available opportunities'}</span>
                        </li>
                      )}
                      {totalTasks > 0 && (completedTasks / totalTasks) < 0.8 && (
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
                      {completedTasks > 5 && (
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
              {!isPrinting && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Share this link: {shareUrl}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
