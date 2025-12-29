import { useState } from "react";
import { X, TrendingUp, Clock, Target, Award, Calendar, Activity, BarChart3, PieChart, CheckCircle, AlertCircle, Users, Zap, Star, Heart, Shield, Flame, Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from "recharts";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";
import { formatNumber, formatPercentage, calculatePercentage } from "@/lib/format-utils";
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
              <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-5'} mb-6`}>
                <TabsTrigger value="overview" className={isMobile ? 'text-xs' : ''}>Overview</TabsTrigger>
                <TabsTrigger value="insights" className={isMobile ? 'text-xs' : ''}>Insights</TabsTrigger>
                {!isMobile && <TabsTrigger value="activity">Activity</TabsTrigger>}
                {!isMobile && <TabsTrigger value="sdg">SDG Impact</TabsTrigger>}
                {!isMobile && <TabsTrigger value="trends">Trends</TabsTrigger>}
              </TabsList>

              {/* Overview Tab - Industry Standard KPIs */}
              <TabsContent value="overview" className="space-y-6">
                {/* Core Industry KPI Cards */}
                <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-4 gap-4'}`}>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className={`${isMobile ? 'p-3' : 'pt-6'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Clock className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
                        {data.rank && <Badge variant="secondary" className="text-[10px]">#{data.rank}</Badge>}
                      </div>
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{formatNumber(data.totalHours)}</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Total Hours</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className={`${isMobile ? 'p-3' : 'pt-6'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-600`} />
                      </div>
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{data.tasksCompleted}</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Tasks Done</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className={`${isMobile ? 'p-3' : 'pt-6'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Target className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-purple-600`} />
                      </div>
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{data.projectsActive}</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Projects</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className={`${isMobile ? 'p-3' : 'pt-6'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Flame className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-600`} />
                      </div>
                      <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{completionPercentage.toFixed(0)}%</p>
                      <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Completion</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Industry-Standard Volunteer KPIs */}
                <Card>
                  <CardHeader className={isMobile ? 'pb-2' : ''}>
                    <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                      <BarChart3 className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                      Volunteer Performance Metrics
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Industry-standard volunteer management KPIs</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Engagement Score */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500" /> Engagement Score
                        </span>
                        <span className="font-bold text-amber-600">{engagementScore}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${engagementScore}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Frequency and recency of volunteer activities</p>
                    </div>

                    {/* Reliability Score */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" /> Reliability Score
                        </span>
                        <span className="font-bold text-green-600">{reliabilityScore}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-green-600" style={{ width: `${reliabilityScore}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Task completion and commitment fulfillment</p>
                    </div>

                    {/* Impact Score */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <Heart className="h-4 w-4 text-pink-500" /> Impact Score
                        </span>
                        <span className="font-bold text-pink-600">{impactScore}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-pink-400 to-pink-600" style={{ width: `${impactScore}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">SDG contributions and social value created</p>
                    </div>

                    {/* Skills Utilization */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium flex items-center gap-2">
                          <Star className="h-4 w-4 text-purple-500" /> Skills Utilization
                        </span>
                        <span className="font-bold text-purple-600">{skillsUtilization}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600" style={{ width: `${skillsUtilization}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Diversity of projects and skill application</p>
                    </div>
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

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.recentActivity && data.recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {data.recentActivity.map((activity: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border"
                          >
                            <div className="mt-1">
                              <Activity className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{activity.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {activity.project} • {activity.date}
                              </p>
                            </div>
                            <Badge variant={activity.status === "completed" ? "default" : "secondary"}>
                              {activity.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No recent activity</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SDG Impact Tab */}
              <TabsContent value="sdg" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>SDG Contributions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.sdgContributions && data.sdgContributions.length > 0 ? (
                      <div className="space-y-3">
                        {data.sdgContributions.map((sdg: any) => (
                          <div
                            key={sdg.goal}
                            className="flex items-center justify-between p-4 rounded-lg border"
                            style={{ borderLeftWidth: "4px", borderLeftColor: getSDGColor(sdg.goal) }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: getSDGColor(sdg.goal) }}
                              >
                                {sdg.goal}
                              </div>
                              <div>
                                <p className="font-medium">{getSDGName(sdg.goal)}</p>
                                <p className="text-sm text-muted-foreground">{sdg.hours} hours contributed</p>
                              </div>
                            </div>
                            <Badge>{sdg.tasks} tasks</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-muted-foreground">No SDG contributions yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Hours Worked Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.hoursOverTime && data.hoursOverTime.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.hoursOverTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="hours"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ fill: "#8b5cf6" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-muted-foreground">No trend data available</p>
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
