import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { TrendingUp, Users, Award, Target, Home, BarChart3, Settings, Menu, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { sdgGoals } from "@shared/sdg-goals";

interface CSRDashboardData {
  totalPartners: number;
  activeEmployees: number;
  totalHours: number;
  totalImpact: number;
  sdgProgress: Record<number, { goal: number; name: string; color: string; progress: number; status?: string; currentHours?: number; targetHours?: number }>;
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
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const userId = localStorage.getItem('currentUserId');

  const { data: csrData, isLoading, refetch } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch CSR dashboard");
      return response.json();
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const engagementFunnel = [
    { stage: "Eligible", count: 1500, percentage: 100 },
    { stage: "Registered", count: 890, percentage: 59 },
    { stage: "1+ Project", count: 650, percentage: 43 },
    { stage: "Retained", count: 590, percentage: 39 }
  ];

  const sdgChartData = csrData?.sdgProgress 
    ? Object.values(csrData.sdgProgress).map(sdg => ({
        name: `SDG ${sdg.goal}`,
        value: sdg.progress,
        color: sdg.color
      }))
    : [];

  const mainChallenge = csrData?.challenges?.[0];
  const challengeProgress = mainChallenge ? Math.round((mainChallenge.progress / mainChallenge.target) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 text-white flex flex-col">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-blue-950 border-b border-blue-800 px-4 py-4 flex items-center justify-between md:hidden">
        <h1 className="text-lg font-bold">Unlock Your Team's Potential</h1>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-blue-900 rounded-lg">
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-slate-900 text-white px-8 py-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Corporate CSR Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your global volunteer impact program</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center font-bold">
              {user?.displayName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="font-semibold">{user?.displayName || 'User'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-blue-900 border-b border-blue-800 px-4 py-3 space-y-2">
          <button onClick={() => navigate('/csr-dashboard')} className="w-full text-left px-4 py-2 hover:bg-blue-800 rounded">Home</button>
          <button onClick={() => navigate('/csr-dashboard')} className="w-full text-left px-4 py-2 hover:bg-blue-800 rounded">Reporting</button>
          <button onClick={() => navigate('/corporate-partner-profile-settings')} className="w-full text-left px-4 py-2 hover:bg-blue-800 rounded">Settings</button>
        </div>
      )}

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="p-4 md:p-8 space-y-6">
          {/* Mobile: Challenge Card + Leaderboard Preview */}
          <div className="grid grid-cols-1 md:hidden gap-4">
            {/* Challenge Card */}
            {mainChallenge && (
              <Card className="bg-green-500 text-white border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">Monthly SDG Challenge</h3>
                    <span className="text-lg">🏆</span>
                  </div>
                  <p className="text-xs font-semibold mb-3 opacity-90">{mainChallenge.title}</p>
                  
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                        <circle 
                          cx="48" 
                          cy="48" 
                          r="40" 
                          fill="none" 
                          stroke="white" 
                          strokeWidth="6"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - challengeProgress / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-bold">{challengeProgress}%</p>
                        <p className="text-xs">Complete</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-center text-sm font-semibold mb-4">{mainChallenge.progress} Volunteer Hours</p>
                  <Button className="w-full bg-white text-green-600 hover:bg-gray-100 text-sm font-semibold">
                    View Challenge
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard Preview */}
            <Card className="bg-blue-800 text-white border-blue-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold">Q3 Impact Leaderboard</h3>
                  <span className="text-lg">🏅</span>
                </div>
                <p className="text-xs font-semibold mb-3 opacity-90">Soar to the Top!</p>
                
                <div className="space-y-2 mb-4">
                  {csrData?.leaderboard?.slice(0, 2).map((emp, idx) => (
                    <p key={idx} className="text-xs">• Top Teams: {emp.employeeName}</p>
                  ))}
                </div>

                <Button className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold">
                  View Leaderboard
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards - Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {/* Total Hours */}
            <Card className="bg-green-500 text-white border-0 md:bg-slate-800 md:border-slate-700 md:text-gray-100">
              <CardContent className="p-4 md:p-6">
                <p className="text-xs md:text-sm opacity-90 mb-2">Total Volunteer Hours Logged</p>
                <p className="text-3xl md:text-4xl font-bold">{csrData?.totalHours.toLocaleString() || '0'}</p>
                <p className="text-xs mt-2 opacity-75">Employees Engaged: {csrData?.activeEmployees || '0'}</p>
              </CardContent>
            </Card>

            {/* Employees Engaged - Hidden on mobile, shown on desktop */}
            <Card className="hidden md:block bg-slate-800 border-slate-700 text-white">
              <CardContent className="p-6">
                <p className="text-sm text-slate-400 mb-2">Employees Engaged</p>
                <p className="text-4xl font-bold">{csrData?.activeEmployees || '0'}</p>
                <p className="text-xs text-green-400 mt-2">↑ 8% from last quarter</p>
              </CardContent>
            </Card>

            {/* Projects - shown differently on mobile */}
            <Card className="bg-gray-400 text-gray-900 border-0 md:bg-slate-800 md:border-slate-700 md:text-white">
              <CardContent className="p-4 md:p-6">
                <p className="text-xs md:text-sm font-semibold md:text-slate-400 mb-2">Projects</p>
                <p className="text-3xl md:text-4xl font-bold">{csrData?.partners.length || '0'}</p>
                <p className="text-xs mt-2 md:text-green-400">Completed</p>
              </CardContent>
            </Card>

            {/* SDG Score - Hidden on mobile, shown on desktop */}
            <Card className="hidden md:block bg-slate-800 border-slate-700 text-white">
              <CardContent className="p-6">
                <p className="text-sm text-slate-400 mb-2">SDG Score Delta</p>
                <p className="text-4xl font-bold">+15%</p>
                <p className="text-xs text-slate-400 mt-2">Q3 Performance</p>
              </CardContent>
            </Card>
          </div>

          {/* SDG Contributions - Optimized UI */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">SDG Commitments</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Your company's strategic focus areas</p>
              </div>
              <button 
                onClick={() => refetch()}
                className="text-xs px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                Refresh
              </button>
            </div>
            
            {/* Committed SDGs - Featured Section */}
            {Object.values(csrData?.sdgProgress || {}).filter(s => s.status === 'committed' || s.status === 'active').length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Your Focus Areas</p>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                  {Object.values(csrData?.sdgProgress || {})
                    .filter(s => s.status === 'committed' || s.status === 'active')
                    .map((sdgData) => {
                      const progressPercent = sdgData.progress || 0;
                      const hasProgress = progressPercent > 0;
                      
                      return (
                        <div key={sdgData.goal} className="flex flex-col items-center group cursor-pointer">
                          <div className="relative">
                            <div 
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                              style={{ backgroundColor: sdgData.color }}
                            >
                              {sdgData.goal}
                            </div>
                            
                            {/* Progress ring */}
                            {hasProgress && (
                              <svg className="absolute inset-0 w-16 h-16 md:w-20 md:h-20 -rotate-90" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}>
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r="32"
                                  fill="none"
                                  stroke="rgba(255,255,255,0.2)"
                                  strokeWidth="2"
                                />
                                <circle
                                  cx="50%"
                                  cy="50%"
                                  r="32"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="2.5"
                                  strokeDasharray={`${2 * Math.PI * 32}`}
                                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - progressPercent / 100)}`}
                                  strokeLinecap="round"
                                  style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                                />
                              </svg>
                            )}
                            
                            {/* Status indicator */}
                            <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-md ${
                              hasProgress ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                            }`}>
                              {hasProgress ? '✓' : '◆'}
                            </div>
                          </div>
                          
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-3">Goal {sdgData.goal}</p>
                          
                          {/* Tooltip */}
                          <div className="hidden group-hover:block absolute top-full mt-2 z-50 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                            <p className="font-semibold">{hasProgress ? `${Math.round(progressPercent)}% Complete` : 'Committed'}</p>
                            {sdgData.targetHours && <p className="text-gray-300">{sdgData.currentHours || 0} / {sdgData.targetHours} hours</p>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No SDG commitments selected yet</p>
                <button 
                  onClick={() => navigate('/corporate-partner-profile-settings')}
                  className="text-xs mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add SDG focus areas
                </button>
              </div>
            )}
            
            {/* All SDGs Reference */}
            {Object.values(csrData?.sdgProgress || {}).filter(s => s.status === 'committed' || s.status === 'active').length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">All SDG Reference</p>
                <div className="grid grid-cols-6 md:grid-cols-9 gap-2">
                  {Object.values(sdgGoals).map((sdg) => {
                    const sdgData = csrData?.sdgProgress?.[sdg.id];
                    const isCommitted = sdgData?.status === 'committed' || sdgData?.status === 'active';
                    
                    return (
                      <div key={sdg.id} className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all ${
                        isCommitted ? 'shadow-md hover:scale-105' : 'opacity-30'
                      }`}
                      style={{ backgroundColor: sdgData?.color || '#d1d5db' }}>
                        {sdg.id}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Only: 2x2 Grid */}
          <div className="hidden md:grid md:grid-cols-2 md:gap-6">
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
                <div className="space-y-3">
                  {[
                    { region: 'North America', percentage: 45 },
                    { region: 'Europe', percentage: 35 },
                    { region: 'Asia Pacific', percentage: 20 }
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.region}</span>
                        <span className="font-semibold">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
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
                <CardTitle className="text-lg">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="font-semibold text-sm text-green-900 dark:text-green-100">Active Programs</p>
                    <p className="text-xs text-green-700 dark:text-green-200">3 programs running</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">Total ROI</p>
                    <p className="text-xs text-blue-700 dark:text-blue-200">${csrData?.totalImpact || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Only: Employee Leaderboard */}
          <Card className="hidden md:block bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex items-center justify-around">
        <button onClick={() => navigate('/csr-dashboard')} className="flex-1 flex flex-col items-center justify-center py-4 text-blue-600 hover:bg-gray-50 dark:hover:bg-slate-800">
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">Home</span>
        </button>
        <button onClick={() => navigate('/csr-dashboard')} className="flex-1 flex flex-col items-center justify-center py-4 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800">
          <BarChart3 className="h-6 w-6" />
          <span className="text-xs mt-1">Reporting</span>
        </button>
        <button onClick={() => navigate('/corporate-partner-profile-settings')} className="flex-1 flex flex-col items-center justify-center py-4 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800">
          <Settings className="h-6 w-6" />
          <span className="text-xs mt-1">Settings</span>
        </button>
      </div>
    </div>
  );
}
