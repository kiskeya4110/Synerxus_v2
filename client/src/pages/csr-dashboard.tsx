import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TrendingUp, Users, Award, Target, BarChart3, Globe, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface CSRDashboardData {
  totalPartners: number;
  activeEmployees: number;
  totalHours: number;
  totalImpact: number;
  sdgProgress: Record<number, { goal: number; name: string; color: string; progress: number }>;
  partners: Array<{
    id: number;
    companyName: string;
    employees: number;
    hours: number;
    roi: number;
  }>;
  challenges: Array<{
    id: number;
    title: string;
    sdgGoal: number;
    progress: number;
    target: number;
    status: string;
  }>;
  leaderboard: Array<{
    rank: number;
    employeeName: string;
    hours: number;
    points: number;
  }>;
}

export default function CSRDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const userId = localStorage.getItem('currentUserId');

  const { data: csrData, isLoading } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch CSR dashboard");
      return response.json();
    },
    enabled: !!userId,
  });

  // Mock data for engagement funnel
  const engagementFunnel = [
    { stage: "Eligible", count: 1500, percentage: 100 },
    { stage: "Registered", count: 890, percentage: 59 },
    { stage: "1+ Project", count: 650, percentage: 43 },
    { stage: "Retained", count: 590, percentage: 39 }
  ];

  // SDG chart data
  const sdgChartData = csrData?.sdgProgress 
    ? Object.values(csrData.sdgProgress).map(sdg => ({
        name: `SDG ${sdg.goal}`,
        value: sdg.progress,
        color: sdg.color
      }))
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white px-8 py-6 flex items-center justify-between border-b border-slate-700">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Corporate CSR Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your global volunteer impact program</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right">
            <p className="text-slate-400">Current Date</p>
            <p className="font-semibold">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3 pl-6 border-l border-slate-700">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center font-bold">
              {user?.displayName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="text-slate-400">Admin</p>
              <p className="font-semibold">{user?.displayName || 'User'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 dark:bg-slate-800 border-slate-700 text-white">
            <CardContent className="p-6">
              <p className="text-sm text-slate-400 mb-2">Total Hours Logged</p>
              <p className="text-4xl font-bold">{csrData?.totalHours.toLocaleString() || '0'}</p>
              <p className="text-xs text-green-400 mt-2">↑ 12% from last quarter</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 dark:bg-slate-800 border-slate-700 text-white">
            <CardContent className="p-6">
              <p className="text-sm text-slate-400 mb-2">Employees Engaged</p>
              <p className="text-4xl font-bold">{csrData?.activeEmployees || '0'}</p>
              <p className="text-xs text-green-400 mt-2">↑ 8% from last quarter</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 dark:bg-slate-800 border-slate-700 text-white">
            <CardContent className="p-6">
              <p className="text-sm text-slate-400 mb-2">Projects Completed</p>
              <p className="text-4xl font-bold">{csrData?.partners.length || '0'}</p>
              <p className="text-xs text-green-400 mt-2">↑ 5% from last quarter</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 dark:bg-slate-800 border-slate-700 text-white">
            <CardContent className="p-6">
              <p className="text-sm text-slate-400 mb-2">SDG Score Delta</p>
              <p className="text-4xl font-bold">+15%</p>
              <p className="text-xs text-slate-400 mt-2">Q3 Performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid: 2x2 */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* SDG Alignment Dashboard */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">SDG Alignment Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {sdgChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sdgChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sdgChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-400">No SDG data available</div>
              )}
            </CardContent>
          </Card>

          {/* Geographic Impact by Region */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Geographic Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-sm">Major Impact Regions</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">North America, Europe, Asia</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>North America</span>
                      <span className="font-semibold">45%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Europe</span>
                      <span className="font-semibold">35%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '35%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Asia Pacific</span>
                      <span className="font-semibold">20%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Engagement Funnel */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Employee Engagement Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {engagementFunnel.map((stage, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stage.stage}</span>
                      <span className="text-gray-500 dark:text-gray-400">({stage.count.toLocaleString()})</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          idx === 0 ? 'bg-blue-600' :
                          idx === 1 ? 'bg-blue-500' :
                          idx === 2 ? 'bg-blue-400' :
                          'bg-blue-300'
                        }`}
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Admin Actions */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Pending Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-amber-900 dark:text-amber-100">Review NGO: Green Earth</p>
                    <p className="text-xs text-amber-700 dark:text-amber-200">Pending approval</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-blue-900 dark:text-blue-100">Approve Impact: Solarize Africa</p>
                    <p className="text-xs text-blue-700 dark:text-blue-200">Due in 2 days</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-green-900 dark:text-green-100">AI Flag: Project Alpha</p>
                    <p className="text-xs text-green-700 dark:text-green-200">Auto-review complete</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Employee Leaderboard */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Engaged Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {csrData?.leaderboard && csrData.leaderboard.slice(0, 5).map((emp, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {emp.rank}
                    </div>
                    <div>
                      <p className="font-semibold">{emp.employeeName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{emp.hours} hours • {emp.points} points</p>
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
