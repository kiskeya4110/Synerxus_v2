import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TrendingUp, Users, Award, Target, Home, BarChart3, Settings, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { sdgGoals } from "@shared/sdg-goals";

interface CSRDashboardData {
  totalPartners: number;
  activeEmployees: number;
  totalHours: number;
  totalImpact: number;
  projectsCompleted: number;
  sdgScoreDelta: number;
  sdgProgress: Record<number, { goal: number; name: string; color: string; progress: number; status?: string }>;
  partners: Array<{ id: number; companyName: string; employees: number; hours: number; roi: number }>;
  challenges: Array<{ id: number; title: string; sdgGoal: number; progress: number; target: number; status: string }>;
  leaderboard: Array<{ rank: number; employeeName: string; hours: number; points: number }>;
  sidebarProjects: Array<{ id: number; projectName: string; status: string }>;
  sidebarEmployees: Array<{ id: string; name: string; hours: number }>;
}

export default function CSRDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const userId = localStorage.getItem('currentUserId');

  const { data: csrData, isLoading } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch CSR dashboard");
      return response.json();
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const sdgChartData = Object.values(csrData?.sdgProgress || {})
    .filter(sdg => sdg.status === 'committed' || sdg.status === 'active')
    .slice(0, 8)
    .map(sdg => ({
      name: `SDG ${sdg.goal}`,
      value: sdg.progress,
      color: sdg.color
    }));

  const engagementFunnelData = [
    { stage: "Eligible", count: 1500 },
    { stage: "Registered", count: 890 },
    { stage: "1+ Project", count: 650 },
    { stage: "Retained", count: 590 }
  ];

  const regionData = [
    { region: "North America", percentage: 45 },
    { region: "Europe", percentage: 25 },
    { region: "Asia-Pacific", percentage: 20 },
    { region: "Rest of World", percentage: 10 }
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded flex items-center justify-center text-white font-bold text-lg">S</div>
          <span className="font-bold text-lg">Synerxus</span>
          {csrData?.partners[0] && <span className="text-gray-600">| {csrData.partners[0].companyName}</span>}
        </div>
        <div className="flex items-center gap-8">
          <span className="text-sm text-gray-600">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.displayName?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="text-sm">{user?.displayName || 'Admin'}</span>
            <button onClick={handleLogout} className="p-1 hover:bg-gray-100 rounded">
              <LogOut className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        {/* Left Sidebar - Corporation Tracking Menu */}
        <div className="w-64 bg-slate-900 text-white p-6 border-r border-slate-800 overflow-y-auto">
          {/* Projects Section */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Projects Supporting
            </h3>
            <div className="space-y-2">
              {csrData?.sidebarProjects.map((proj) => (
                <div key={proj.id} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer">
                  <p className="text-sm font-semibold text-white truncate">{proj.projectName}</p>
                  <p className="text-xs text-slate-400">{proj.status}</p>
                </div>
              ))}
              {!csrData?.sidebarProjects?.length && (
                <p className="text-xs text-slate-500 italic">No projects yet</p>
              )}
            </div>
          </div>

          {/* Employees Section */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Volunteers ({csrData?.activeEmployees || 0})
            </h3>
            <div className="space-y-2">
              {csrData?.sidebarEmployees.map((emp) => (
                <div key={emp.id} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer">
                  <p className="text-sm font-semibold text-white truncate">{emp.name}</p>
                  <p className="text-xs text-green-400">{emp.hours} hours</p>
                </div>
              ))}
              {!csrData?.sidebarEmployees?.length && (
                <p className="text-xs text-slate-500 italic">No employees yet</p>
              )}
            </div>
          </div>

          {/* Stats Section */}
          <div className="border-t border-slate-700 pt-6">
            <div className="space-y-3">
              <div className="px-3 py-2">
                <p className="text-xs text-slate-400 mb-1">Total Impact</p>
                <p className="text-lg font-bold text-white">{csrData?.totalImpact?.toLocaleString() || '0'}</p>
              </div>
              <div className="px-3 py-2">
                <p className="text-xs text-slate-400 mb-1">Team Hours</p>
                <p className="text-lg font-bold text-blue-400">{csrData?.totalHours?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-700 pt-6 mt-6 space-y-2">
            <button onClick={() => navigate('/corporate-partner-profile-settings')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-0 text-white">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-slate-300 mb-2">Total Hours Logged</p>
                  <p className="text-4xl font-bold">{csrData?.totalHours?.toLocaleString() || '0'}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-0 text-white">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-slate-300 mb-2">Employees Engaged</p>
                  <p className="text-4xl font-bold">{csrData?.activeEmployees || '0'}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-0 text-white">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-slate-300 mb-2">Projects Completed</p>
                  <p className="text-4xl font-bold">{csrData?.projectsCompleted || '0'}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-0 text-white">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-slate-300 mb-2">SDG Score Delta</p>
                  <p className="text-4xl font-bold">+{csrData?.sdgScoreDelta || '0'}% <span className="text-lg">Q3</span></p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* SDG Alignment Dashboard */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">SDG Alignment Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center h-80">
                  {sdgChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
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
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center text-gray-400">No SDG data available</div>
                  )}
                </CardContent>
              </Card>

              {/* Geographic Impact by Region */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Geographic Impact by Region</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 h-80 flex flex-col justify-center">
                  <div className="space-y-3">
                    {regionData.map((region) => (
                      <div key={region.region} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{region.region}</span>
                        <div className="flex items-center gap-2 flex-1 ml-4">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${region.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-12 text-right">{region.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Employee Engagement Funnel */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Employee Engagement Funnel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 h-80 flex flex-col justify-center">
                  <div className="space-y-3">
                    {engagementFunnelData.map((stage, idx) => (
                      <div key={stage.stage} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-24">{stage.stage}</span>
                        <div className="flex-1 bg-gray-200 rounded h-8 flex items-center justify-center overflow-hidden">
                          <div
                            className="bg-green-500 h-full transition-all flex items-center justify-end pr-2"
                            style={{ width: `${(stage.count / 1500) * 100}%` }}
                          >
                            <span className="text-xs font-bold text-white">{stage.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Admin Actions */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Pending Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 h-80 overflow-auto">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">▶</span>
                    <div>
                      <p className="font-medium text-sm">Review NGO: Green Earth</p>
                      <p className="text-xs text-gray-500">Pending approval</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">▶</span>
                    <div>
                      <p className="font-medium text-sm">Approve Impact: Solarize Africa</p>
                      <p className="text-xs text-gray-500">Awaiting review</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-xl">▶</span>
                    <div>
                      <p className="font-medium text-sm">AI Flag: Project Alpha</p>
                      <p className="text-xs text-gray-500">Flagged for review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
