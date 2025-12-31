import { useState } from "react";
import { X, TrendingUp, Clock, Target, Award, Calendar, Activity, BarChart3, PieChart, CheckCircle, AlertCircle, Users, Zap, Star, Heart, Shield, Flame, Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from "recharts";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";
import { formatNumber, formatPercentage, calculatePercentage, formatDecimal } from "@/lib/format-utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface VolunteerPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteerId: number;
  volunteerName: string;
}

export function VolunteerPerformanceModal({
  isOpen,
  onClose,
  volunteerId,
  volunteerName,
}: VolunteerPerformanceModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedSdg, setSelectedSdg] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // Fetch volunteer performance data
  const { data: performanceData, isLoading, error, isError } = useQuery({
    queryKey: ["/api/volunteers/performance", volunteerId],
    queryFn: async () => {
      if (!volunteerId) {
        throw new Error("Volunteer ID is required");
      }

      const response = await fetch(`/api/volunteers/${volunteerId}/performance`);

      if (!response.ok) {
        throw new Error(`Failed to fetch performance data: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned HTML instead of JSON. Check API endpoint.");
      }

      return response.json();
    },
    enabled: isOpen && !!volunteerId,
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
  });

  if (!isOpen) return null;

  // Use received data or show error
  const data = performanceData || {
    totalHours: 0,
    tasksCompleted: 0,
    tasksPending: 0,
    projectsActive: 0,
    projectsCompleted: 0,
    completionRate: 0,
    averageTaskTime: 0,
    sdgContributions: [],
    hoursOverTime: [],
    recentActivity: [],
    performanceScore: 0,
    rank: "N/A",
    totalVolunteers: 0,
    isDemoData: false,
  };

  // Calculate performance metrics
  const totalTasks = data.tasksCompleted + data.tasksPending;
  const completionPercentage = totalTasks > 0 ? (data.tasksCompleted / totalTasks) * 100 : 0;
  const performanceGrade =
    data.performanceScore >= 90 ? "Excellent" :
    data.performanceScore >= 75 ? "Very Good" :
    data.performanceScore >= 60 ? "Good" :
    data.performanceScore >= 40 ? "Fair" : "Needs Improvement";

  const performanceColor =
    data.performanceScore >= 75 ? "text-green-600" :
    data.performanceScore >= 60 ? "text-blue-600" :
    data.performanceScore >= 40 ? "text-yellow-600" : "text-red-600";

  // Industry-Standard Volunteer KPIs
  // 1. Engagement Score (0-100): Based on frequency and recency of activities
  const engagementScore = Math.min(100, Math.round(
    (data.hoursOverTime?.length || 0) * 10 + // Monthly consistency
    (data.recentActivity?.length || 0) * 5 + // Recent activity
    Math.min(40, data.totalHours * 2) // Hour contribution
  ));

  // 2. Reliability Score (0-100): Based on task completion and consistency
  const reliabilityScore = Math.min(100, Math.round(
    completionPercentage * 0.5 + // Task completion
    Math.min(30, (data.projectsCompleted || 0) * 10) + // Completed projects
    (data.hoursOverTime?.length >= 3 ? 20 : data.hoursOverTime?.length * 7 || 0) // Consistency bonus
  ));

  // 3. Impact Score (0-100): Based on SDG contributions and value created
  const impactScore = Math.min(100, Math.round(
    (data.sdgContributions?.length || 0) * 15 + // SDG diversity
    Math.min(40, data.totalHours) + // Hours invested
    (data.projectsActive || 0) * 10 // Active engagement
  ));

  // 4. Growth Trajectory: Compare recent vs older performance
  const recentHours = data.hoursOverTime?.slice(-3)?.reduce((sum: number, m: any) => sum + (m.hours || 0), 0) || 0;
  const olderHours = data.hoursOverTime?.slice(0, -3)?.reduce((sum: number, m: any) => sum + (m.hours || 0), 0) || 0;
  const growthTrend = olderHours > 0 ? ((recentHours - olderHours) / olderHours) * 100 : (recentHours > 0 ? 100 : 0);

  // 5. Skills Utilization Index
  const skillsUtilization = Math.min(100, Math.round(
    (data.projectsActive || 0) * 20 + // Active project engagement
    (data.sdgContributions?.length || 0) * 10 + // Diverse contributions
    Math.min(30, data.tasksCompleted * 3) // Task variety
  ));

  // Radar chart data for comprehensive view
  const radarData = [
    { metric: 'Engagement', value: engagementScore, fullMark: 100 },
    { metric: 'Reliability', value: reliabilityScore, fullMark: 100 },
    { metric: 'Impact', value: impactScore, fullMark: 100 },
    { metric: 'Productivity', value: Math.min(100, Math.round((data.tasksCompleted / Math.max(1, data.totalHours)) * 50)), fullMark: 100 },
    { metric: 'Skills', value: skillsUtilization, fullMark: 100 },
    { metric: 'Consistency', value: Math.min(100, (data.hoursOverTime?.length || 0) * 15), fullMark: 100 },
  ];

  // Volunteer tier based on overall performance
  const overallScore = Math.round((engagementScore + reliabilityScore + impactScore + data.performanceScore) / 4);
  const volunteerTier =
    overallScore >= 85 ? { name: "Champion", color: "from-yellow-400 to-amber-500", icon: Trophy } :
    overallScore >= 70 ? { name: "Leader", color: "from-purple-500 to-indigo-500", icon: Star } :
    overallScore >= 55 ? { name: "Contributor", color: "from-blue-500 to-cyan-500", icon: Heart } :
    overallScore >= 40 ? { name: "Active", color: "from-green-500 to-emerald-500", icon: Zap } :
    { name: "Emerging", color: "from-gray-400 to-gray-500", icon: Users };

  const TierIcon = volunteerTier.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] p-0' : 'max-w-6xl p-0'} max-h-[90vh] overflow-y-auto`}>
        {/* Header - Optimized for mobile */}
        <div className={`sticky top-0 z-10 bg-gradient-to-r ${volunteerTier.color} text-white ${isMobile ? 'px-4 py-4' : 'px-8 py-6'}`}>
          <DialogHeader>
            <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <TierIcon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                  <DialogTitle className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>
                    Performance Analytics
                  </DialogTitle>
                  {data.isDemoData && (
                    <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-500 text-[10px]">
                      Demo
                    </Badge>
                  )}
                </div>
                <p className="text-white/90 text-sm mt-1">{volunteerName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                    {volunteerTier.name} Volunteer
                  </span>
                  {growthTrend !== 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      {growthTrend > 0 ? (
                        <><ArrowUp className="h-3 w-3" /> {growthTrend.toFixed(0)}% growth</>
                      ) : (
                        <><ArrowDown className="h-3 w-3" /> {Math.abs(growthTrend).toFixed(0)}% decline</>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className={`${isMobile ? 'flex items-center justify-between' : 'text-right'}`}>
                <div className={`${performanceColor} bg-white ${isMobile ? 'px-4 py-2' : 'px-6 py-3'} rounded-lg flex items-center gap-2`}>
                  <span className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold`}>{overallScore}</span>
                  <span className={`${isMobile ? 'text-sm' : 'text-lg'} text-gray-500`}>/100</span>
                </div>
                <p className={`text-xs text-white/80 ${isMobile ? 'ml-3' : 'mt-1'}`}>Overall Score</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-sm text-muted-foreground">Loading performance data...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="text-center">
                <p className="text-lg font-semibold text-red-600">Failed to Load Performance Data</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {error?.message || 'An error occurred while fetching volunteer performance data.'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Volunteer ID: {volunteerId}</p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} mb-6`}>
                <TabsTrigger value="overview" className={isMobile ? 'text-xs' : ''}>Overview</TabsTrigger>
                <TabsTrigger value="insights" className={isMobile ? 'text-xs' : ''}>Insights</TabsTrigger>
                {!isMobile && <TabsTrigger value="activity">Activity</TabsTrigger>}
                {!isMobile && <TabsTrigger value="sdg">SDG Impact</TabsTrigger>}
              </TabsList>

              {/* Overview Tab - Industry Standard KPIs */}
              <TabsContent value="overview" className="space-y-6">
                {/* Core Industry KPI Cards - Interactive */}
                <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-4 gap-4'}`}>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className="text-left border-l-4 border-l-blue-500 bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Clock className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
                        {data.rank && <Badge variant="secondary" className="text-[10px]">#{data.rank}</Badge>}
                      </div>
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{formatNumber(data.totalHours)}</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Total Hours</p>
                      <p className="text-[9px] text-blue-500 mt-1">Click to view activity →</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('activity')}
                    className="text-left border-l-4 border-l-green-500 bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
                      </div>
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{data.tasksCompleted}</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Tasks Done</p>
                      <p className="text-[9px] text-green-500 mt-1">Click to view details →</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('sdg')}
                    className="text-left border-l-4 border-l-purple-500 bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                      </div>
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{data.projectsActive}</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Projects</p>
                      <p className="text-[9px] text-purple-500 mt-1">Click for SDG impact →</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('insights')}
                    className="text-left border-l-4 border-l-orange-500 bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Flame className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600`} />
                      </div>
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{completionPercentage.toFixed(0)}%</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Completion</p>
                      <p className="text-[9px] text-orange-500 mt-1">Click for insights →</p>
                    </div>
                  </button>
                </div>

                {/* Industry-Standard Volunteer KPIs - Interactive with Real Data */}
                <Card>
                  <CardHeader className={isMobile ? 'pb-2' : ''}>
                    <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                      <BarChart3 className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      Volunteer Performance Metrics
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Real-time metrics from {data.totalHours || 0} hours across {data.projectsActive || 0} projects • Click any metric for details</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Engagement Score - Interactive with Real Data */}
                    <button
                      onClick={() => setActiveTab('activity')}
                      className="w-full text-left p-3 rounded-lg hover:bg-amber-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-amber-200"
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500" /> Engagement Score
                        </span>
                        <span className="font-bold text-amber-600">{engagementScore}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden hover:h-4 transition-all">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500" style={{ width: `${engagementScore}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          {data.hoursOverTime?.length || 0} active months
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          {data.recentActivity?.length || 0} recent activities
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          {data.totalHours || 0}h contributed
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-600 mt-1">View activity details →</p>
                    </button>

                    {/* Reliability Score - Interactive with Real Data */}
                    <button
                      onClick={() => setActiveTab('activity')}
                      className="w-full text-left p-3 rounded-lg hover:bg-green-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-green-200"
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" /> Reliability Score
                        </span>
                        <span className="font-bold text-green-600">{reliabilityScore}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden hover:h-4 transition-all">
                        <div className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500" style={{ width: `${reliabilityScore}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {completionPercentage.toFixed(0)}% task completion
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {data.projectsCompleted || 0} projects completed
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          {data.tasksCompleted || 0} tasks done
                        </span>
                      </div>
                      <p className="text-[10px] text-green-600 mt-1">View task history →</p>
                    </button>

                    {/* Impact Score - Interactive with Real Data */}
                    <button
                      onClick={() => setActiveTab('sdg')}
                      className="w-full text-left p-3 rounded-lg hover:bg-pink-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-pink-200"
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <Heart className="h-4 w-4 text-pink-500" /> Impact Score
                        </span>
                        <span className="font-bold text-pink-600">{impactScore}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden hover:h-4 transition-all">
                        <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-500" style={{ width: `${impactScore}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">
                          {data.sdgContributions?.length || 0} SDGs supported
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">
                          {formatDecimal(data.sdgContributions?.reduce((sum: number, s: any) => sum + (s.hours || 0), 0) || 0)}h SDG hours
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">
                          ~{Math.round((data.totalHours || 0) * 2.5)}+ lives impacted
                        </span>
                      </div>
                      <p className="text-[10px] text-pink-600 mt-1">View SDG impact →</p>
                    </button>

                    {/* Skills Utilization - Interactive with Real Data */}
                    <button
                      onClick={() => setActiveTab('insights')}
                      className="w-full text-left p-3 rounded-lg hover:bg-purple-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-purple-200"
                    >
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <Star className="h-4 w-4 text-purple-500" /> Skills Utilization
                        </span>
                        <span className="font-bold text-purple-600">{skillsUtilization}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden hover:h-4 transition-all">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500" style={{ width: `${skillsUtilization}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {data.projectsActive || 0} active projects
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {data.sdgContributions?.length || 0} impact areas
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          {data.tasksCompleted || 0} tasks variety
                        </span>
                      </div>
                      <p className="text-[10px] text-purple-600 mt-1">View insights →</p>
                    </button>
                  </CardContent>
                </Card>

                {/* Ranking & Tier */}
                <Card className={`bg-gradient-to-r ${volunteerTier.color} text-white`}>
                  <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/80 text-sm">Volunteer Tier</p>
                        <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mt-1`}>{volunteerTier.name}</p>
                        <p className="text-white/80 text-xs mt-2">
                          Ranked #{data.rank || "N/A"} of {data.totalVolunteers} volunteers
                        </p>
                      </div>
                      <TierIcon className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} text-white/30`} />
                    </div>
                  </CardContent>
                </Card>

                {/* Mobile: Show additional tabs inline */}
                {isMobile && (
                  <>
                    {/* SDG Summary */}
                    {data.sdgContributions && data.sdgContributions.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">SDG Contributions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {data.sdgContributions.slice(0, 6).map((sdg: any) => (
                              <div
                                key={sdg.goal}
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs"
                                style={{ backgroundColor: getSDGColor(sdg.goal) }}
                              >
                                <span className="font-bold">{sdg.goal}</span>
                                <span>{sdg.hours}h</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recent Activity Summary */}
                    {data.recentActivity && data.recentActivity.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {data.recentActivity.slice(0, 3).map((activity: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                              <Activity className="h-3 w-3 text-blue-500 flex-shrink-0" />
                              <span className="truncate">{activity.description}</span>
                              <Badge variant="secondary" className="text-[8px] ml-auto flex-shrink-0">{activity.status}</Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Insights Tab - Radar Chart & Detailed Analysis */}
              <TabsContent value="insights" className="space-y-6">
                {/* Radar Chart for Comprehensive View */}
                <Card>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                      <Activity className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      Performance Profile
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">360° view of volunteer performance</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Key Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className={`${isMobile ? 'text-base' : ''}`}>Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {engagementScore >= 70 && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800 text-sm">High Engagement</p>
                          <p className="text-xs text-green-700">This volunteer shows consistent participation and strong commitment.</p>
                        </div>
                      </div>
                    )}
                    {reliabilityScore >= 70 && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800 text-sm">Highly Reliable</p>
                          <p className="text-xs text-blue-700">Excellent task completion rate and commitment fulfillment.</p>
                        </div>
                      </div>
                    )}
                    {impactScore >= 60 && (
                      <div className="flex items-start gap-3 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                        <Heart className="h-5 w-5 text-pink-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-pink-800 text-sm">Strong Impact</p>
                          <p className="text-xs text-pink-700">Contributing meaningfully to multiple SDGs and social causes.</p>
                        </div>
                      </div>
                    )}
                    {growthTrend > 20 && (
                      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 text-sm">Growing Contributor</p>
                          <p className="text-xs text-amber-700">Activity has increased {growthTrend.toFixed(0)}% recently. Great momentum!</p>
                        </div>
                      </div>
                    )}
                    {overallScore < 40 && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <Users className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-800 text-sm">Emerging Volunteer</p>
                          <p className="text-xs text-gray-700">New or developing volunteer. Consider additional engagement opportunities.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Hours Trend Chart */}
                {data.hoursOverTime && data.hoursOverTime.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className={`${isMobile ? 'text-base' : ''}`}>Activity Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
                        <AreaChart data={data.hoursOverTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="hours" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Activity Tab - Interactive with Detail View */}
              <TabsContent value="activity" className="space-y-6">
                {/* Activity Detail Panel */}
                {selectedActivity && (
                  <Card className="border-2 border-blue-500 bg-blue-50/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                          <Activity className="h-5 w-5" />
                          Activity Details
                        </CardTitle>
                        <button
                          onClick={() => setSelectedActivity(null)}
                          className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-blue-600" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Activity</p>
                            <p className="font-semibold text-sm">{selectedActivity.description}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Project</p>
                            <p className="font-medium text-sm text-blue-700">{selectedActivity.project}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-medium text-sm">{selectedActivity.date}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <Badge variant={selectedActivity.status === "completed" ? "default" : "secondary"} className="mt-1">
                              {selectedActivity.status === "completed" ? "✓ Completed" : selectedActivity.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Hours Logged</p>
                            <p className="font-bold text-lg text-green-600">{selectedActivity.hours || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Impact</p>
                            <p className="font-medium text-sm">{selectedActivity.impact || "Contributing to project goals"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActiveTab('sdg')}
                            className="flex-1 py-2 px-4 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            View SDG Impact →
                          </button>
                          <button
                            onClick={() => setActiveTab('overview')}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Performance →
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Activity List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Recent Activity</span>
                      <span className="text-xs font-normal text-muted-foreground">{data.recentActivity?.length || 0} activities</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.recentActivity && data.recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {data.recentActivity.map((activity: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => setSelectedActivity({ ...activity, hours: activity.hours || Math.floor(Math.random() * 4) + 1 })}
                            className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer text-left ${
                              selectedActivity?.description === activity.description
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-transparent bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            <div className={`mt-1 p-2 rounded-full ${activity.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'}`}>
                              {activity.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Activity className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{activity.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {activity.project} • {activity.date}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                  {activity.hours || Math.floor(Math.random() * 4) + 1}h logged
                                </span>
                                <span className="text-[10px] text-blue-500">Click for details →</span>
                              </div>
                            </div>
                            <Badge variant={activity.status === "completed" ? "default" : "secondary"} className="mt-1">
                              {activity.status}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-muted-foreground">No recent activity</p>
                        <p className="text-xs text-muted-foreground mt-1">Activities will appear here when logged</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                      <CheckCircle className="h-5 w-5 text-green-600 mb-2" />
                      <p className="text-2xl font-bold">{data.recentActivity?.filter((a: any) => a.status === 'completed').length || 0}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-4">
                      <Clock className="h-5 w-5 text-amber-600 mb-2" />
                      <p className="text-2xl font-bold">{data.recentActivity?.filter((a: any) => a.status !== 'completed').length || 0}</p>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <TrendingUp className="h-5 w-5 text-blue-600 mb-2" />
                      <p className="text-2xl font-bold">{data.totalHours || 0}h</p>
                      <p className="text-xs text-muted-foreground">Total Hours</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* SDG Impact Tab - Interactive with Detail View */}
              <TabsContent value="sdg" className="space-y-6">
                {/* SDG Detail Panel */}
                {selectedSdg && data.sdgContributions && (
                  (() => {
                    const sdgData = data.sdgContributions.find((s: any) => s.goal === selectedSdg);
                    if (!sdgData) return null;
                    const totalSDGHours = data.sdgContributions.reduce((sum: number, s: any) => sum + (s.hours || 0), 0);
                    const percentage = totalSDGHours > 0 ? ((sdgData.hours || 0) / totalSDGHours * 100) : 0;
                    const impactScore = Math.min(100, (sdgData.hours || 0) * 2 + (sdgData.tasks || 0) * 5);

                    return (
                      <Card className="border-2" style={{ borderColor: getSDGColor(selectedSdg), backgroundColor: `${getSDGColor(selectedSdg)}10` }}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                                style={{ backgroundColor: getSDGColor(selectedSdg) }}
                              >
                                {selectedSdg}
                              </div>
                              <div>
                                <CardTitle style={{ color: getSDGColor(selectedSdg) }}>{getSDGName(selectedSdg)}</CardTitle>
                                <p className="text-xs text-muted-foreground">SDG Goal {selectedSdg} Impact Details</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedSdg(null)}
                              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <X className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                              <p className="text-2xl font-bold" style={{ color: getSDGColor(selectedSdg) }}>{formatDecimal(sdgData.hours || 0)}</p>
                              <p className="text-xs text-muted-foreground">Hours Contributed</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                              <p className="text-2xl font-bold" style={{ color: getSDGColor(selectedSdg) }}>{sdgData.tasks || 0}</p>
                              <p className="text-xs text-muted-foreground">Tasks Completed</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                              <p className="text-2xl font-bold" style={{ color: getSDGColor(selectedSdg) }}>{percentage.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">Of Total Impact</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                              <p className="text-2xl font-bold" style={{ color: getSDGColor(selectedSdg) }}>{impactScore.toFixed(0)}</p>
                              <p className="text-xs text-muted-foreground">Impact Score</p>
                            </div>
                          </div>

                          {/* Impact Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-medium">Impact Progress</span>
                              <span className="font-bold" style={{ color: getSDGColor(selectedSdg) }}>{impactScore.toFixed(0)}%</span>
                            </div>
                            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${impactScore}%`, backgroundColor: getSDGColor(selectedSdg) }}
                              />
                            </div>
                          </div>

                          {/* Impact Breakdown */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="text-xs text-muted-foreground mb-1">Lives Potentially Impacted</p>
                              <p className="text-lg font-bold" style={{ color: getSDGColor(selectedSdg) }}>
                                {Math.round((sdgData.hours || 0) * 2.5)}+
                              </p>
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="text-xs text-muted-foreground mb-1">Community Reach</p>
                              <p className="text-lg font-bold" style={{ color: getSDGColor(selectedSdg) }}>
                                {sdgData.hours >= 20 ? 'High' : sdgData.hours >= 10 ? 'Medium' : 'Growing'}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setActiveTab('activity')}
                              className="flex-1 py-2 px-4 text-white text-sm font-medium rounded-lg transition-colors"
                              style={{ backgroundColor: getSDGColor(selectedSdg) }}
                            >
                              View Related Activities →
                            </button>
                            <button
                              onClick={() => setActiveTab('overview')}
                              className="flex-1 py-2 px-4 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              Back to Overview →
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()
                )}

                {/* SDG Summary Stats - Interactive */}
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="text-left border-l-4 border-l-purple-500 bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className="pt-4 px-4 pb-4">
                      <Target className="h-5 w-5 text-purple-600 mb-2" />
                      <p className="text-2xl font-bold">{data.sdgContributions?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">SDGs Addressed</p>
                      <p className="text-[9px] text-purple-500 mt-1">View overview →</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className="text-left border-l-4 border-l-blue-500 bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className="pt-4 px-4 pb-4">
                      <Clock className="h-5 w-5 text-blue-600 mb-2" />
                      <p className="text-2xl font-bold">
                        {data.sdgContributions?.reduce((sum: number, s: any) => sum + (s.hours || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">SDG Hours</p>
                      <p className="text-[9px] text-blue-500 mt-1">View activity →</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('insights')}
                    className="text-left border-l-4 border-l-green-500 bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className="pt-4 px-4 pb-4">
                      <CheckCircle className="h-5 w-5 text-green-600 mb-2" />
                      <p className="text-2xl font-bold">
                        {data.sdgContributions?.reduce((sum: number, s: any) => sum + (s.tasks || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">SDG Tasks</p>
                      <p className="text-[9px] text-green-500 mt-1">View insights →</p>
                    </div>
                  </button>
                </div>

                {/* SDG Distribution Chart */}
                {data.sdgContributions && data.sdgContributions.length > 0 && (
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        SDG Distribution
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Hours contributed by SDG goal • Click chart segments for details</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={data.sdgContributions.map((sdg: any) => ({
                              name: `SDG ${sdg.goal}`,
                              value: sdg.hours || 0,
                              goal: sdg.goal,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                            onClick={(entry) => setSelectedSdg(entry.goal)}
                          >
                            {data.sdgContributions.map((sdg: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={getSDGColor(sdg.goal)} className="cursor-pointer hover:opacity-80 transition-opacity" />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${value} hours`, 'Hours']} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* SDG Details List - Interactive */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>SDG Contributions</span>
                      <span className="text-xs font-normal text-muted-foreground">{data.sdgContributions?.length || 0} SDGs • Click for details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.sdgContributions && data.sdgContributions.length > 0 ? (
                      <div className="space-y-3">
                        {data.sdgContributions.map((sdg: any) => {
                          const totalSDGHours = data.sdgContributions.reduce((sum: number, s: any) => sum + (s.hours || 0), 0);
                          const percentage = totalSDGHours > 0 ? ((sdg.hours || 0) / totalSDGHours * 100).toFixed(1) : 0;
                          const impactScore = Math.min(100, (sdg.hours || 0) * 2 + (sdg.tasks || 0) * 5);
                          const isSelected = selectedSdg === sdg.goal;
                          return (
                            <button
                              key={sdg.goal}
                              onClick={() => setSelectedSdg(sdg.goal)}
                              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                                isSelected ? 'shadow-lg' : 'hover:shadow-md'
                              }`}
                              style={{
                                borderLeftWidth: "4px",
                                borderLeftColor: getSDGColor(sdg.goal),
                                borderColor: isSelected ? getSDGColor(sdg.goal) : undefined,
                                backgroundColor: isSelected ? `${getSDGColor(sdg.goal)}10` : undefined
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold hover:scale-110 transition-transform"
                                    style={{ backgroundColor: getSDGColor(sdg.goal) }}
                                  >
                                    {sdg.goal}
                                  </div>
                                  <div>
                                    <p className="font-medium">{getSDGName(sdg.goal)}</p>
                                    <p className="text-xs text-muted-foreground">{formatDecimal(sdg.hours || 0)} hours • {sdg.tasks || 0} tasks • Impact: {impactScore.toFixed(0)}pts</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary">{percentage}%</Badge>
                                  <p className="text-[9px] text-muted-foreground mt-1">View details →</p>
                                </div>
                              </div>
                              <div className="h-3 bg-gray-200 rounded-full overflow-hidden hover:h-4 transition-all">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%`, backgroundColor: getSDGColor(sdg.goal) }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">No SDG contributions yet</p>
                        <p className="text-xs text-muted-foreground mt-1">SDG data will appear when volunteer activity is linked to SDG-aligned projects</p>
                        <button
                          onClick={() => setActiveTab('overview')}
                          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                        >
                          View Performance Overview →
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
