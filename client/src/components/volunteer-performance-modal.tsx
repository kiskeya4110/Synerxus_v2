import { useState } from "react";
import { X, TrendingUp, Clock, Target, Award, Calendar, Activity, BarChart3, PieChart, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";
import { formatNumber, formatPercentage, calculatePercentage } from "@/lib/format-utils";

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white px-8 py-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-2xl font-bold">
                    Performance Analytics
                  </DialogTitle>
                  {data.isDemoData && (
                    <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-500">
                      Demo Data
                    </Badge>
                  )}
                </div>
                <p className="text-white/90 text-sm mt-2">{volunteerName}</p>
                {data.isDemoData && (
                  <p className="text-xs text-yellow-200 mt-1">
                    📊 Showing sample data. Real data will appear once volunteer completes activities.
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${performanceColor} bg-white px-6 py-3 rounded-lg`}>
                  {data.performanceScore}
                  <span className="text-lg">/100</span>
                </div>
                <p className="text-xs text-white/80 mt-1">{performanceGrade}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-8">
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
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="sdg">SDG Impact</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <Badge variant="secondary">{data.rank}</Badge>
                      </div>
                      <p className="text-2xl font-bold">{formatNumber(data.totalHours)}</p>
                      <p className="text-xs text-muted-foreground">Total Hours</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold">{data.tasksCompleted}</p>
                      <p className="text-xs text-muted-foreground">Tasks Completed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <Target className="h-5 w-5 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold">{data.projectsActive}</p>
                      <p className="text-xs text-muted-foreground">Active Projects</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                      </div>
                      <p className="text-2xl font-bold">{completionPercentage.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Completion Rate</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Performance Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">Productivity</span>
                          <span className="text-muted-foreground">
                            {Math.min(100, Math.round((data.tasksCompleted / Math.max(1, data.totalHours)) * 50))}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${Math.min(100, Math.round((data.tasksCompleted / Math.max(1, data.totalHours)) * 50))}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">Task Completion</span>
                          <span className="text-muted-foreground">{completionPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">Consistency</span>
                          <span className="text-muted-foreground">
                            {Math.min(100, data.hoursOverTime?.length * 15 || 60)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                            style={{ width: `${Math.min(100, data.hoursOverTime?.length * 15 || 60)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">Impact</span>
                          <span className="text-muted-foreground">
                            {Math.min(100, (data.sdgContributions?.length || 0) * 20)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${Math.min(100, (data.sdgContributions?.length || 0) * 20)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ranking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Ranking & Recognition
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Rank</p>
                        <p className="text-2xl font-bold text-orange-600">#{data.rank || "N/A"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          out of {data.totalVolunteers} volunteers
                        </p>
                      </div>
                      <Award className="h-16 w-16 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
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
