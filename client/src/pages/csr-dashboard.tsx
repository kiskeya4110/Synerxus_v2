import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Home, BarChart3, Users, Briefcase, FileText, Settings, ChevronRight  } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { sdgGoals, getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";

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
  pendingActions: Array<{ type: string; orgName: string; description: string }>;
}

export default function CSRDashboard() {
  const { user } = useAuth();
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
      <div className="min-h-screen bg-slate-900">
        <div className="h-16 bg-slate-900 border-b border-slate-700" />
        <div className="flex">
          <div className="w-1/5 bg-slate-900 h-screen" />
          <div className="w-4/5 bg-gray-100 p-6">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  const companyName = csrData?.partners?.[0]?.companyName || "Innovate Corp";
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const adminName = user?.displayName || "Sarah Chen";

  // SDG Chart Data with real SDG colors
  const sdgChartData = Object.values(csrData?.sdgProgress || {})
    .filter(sdg => sdg.status === 'committed' || sdg.status === 'active')
    .slice(0, 8)
    .map(sdg => {
      return {
        name: getSDGName(sdg.goal),
        fullName: getSDGFullName(sdg.goal),
        value: sdg.progress || 20,
        color: getSDGColor(sdg.goal),
        goal: sdg.goal
      };
    });

  // Default SDG data if none exists
  const defaultSdgData = [
    { name: "SDG 4", fullName: "Quality Education", value: 19, color: "#C5192D", goal: 4 },
    { name: "Climate Action", fullName: "Climate Action", value: 29, color: "#3F7E44", goal: 13 },
    { name: "SDG Ecore", fullName: "Life on Land", value: 18, color: "#56C02B", goal: 15 },
    { name: "SDG 13", fullName: "Climate Action", value: 18, color: "#3F7E44", goal: 13 },
    { name: "Climate Action", fullName: "Climate Action", value: 18, color: "#3F7E44", goal: 13 },
    { name: "SDG 4: Quality", fullName: "Quality Education", value: 22, color: "#C5192D", goal: 4 },
    { name: "SDG 13", fullName: "Climate Action", value: 22, color: "#3F7E44", goal: 13 },
  ];

  const chartData = sdgChartData.length > 0 ? sdgChartData : defaultSdgData;

  // Engagement funnel data
  const engagementFunnelData = [
    { stage: "+", count: "(15,900)", next: "Registered", nextCount: "" },
    { stage: "Eligible (1,500)", count: "", next: "(1,100)", nextCount: "Retained", final: "650" },
  ];

  // Pending admin actions
  const pendingActions = csrData?.pendingActions || [
    { type: "Review NGO", orgName: "Green Earth", description: "Pending approval" },
    { type: "Approve Impact", orgName: "Solarize Africa", description: "Awaiting review" },
    { type: "AI Flag", orgName: "Project Alpha", description: "Flagged for review" },
  ];

  // Region connection data for map
  const regionConnections = [
    { name: "Northie focpart", color: "#3B82F6" },
    { name: "Vrorsie neelto/soiken", color: "#3B82F6" },
    { name: "Hue qoysit", color: "#F97316" },
    { name: "Pot.upvsilla", color: "#22C55E" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header Bar - Dark Navy */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl">✦</div>
            <span className="text-xl font-semibold tracking-wide">synerxus</span>
          </div>
        </div>

        {/* Center: Company Name */}
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-gray-400" />
          <span className="text-lg font-medium">{companyName}</span>
        </div>

        {/* Right: Date and User */}
        <div className="flex items-center gap-6">
          <span className="text-sm text-gray-300">{currentDate}</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
              <span className="text-sm">👤</span>
            </div>
            <span className="text-sm">Admin {adminName}</span>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Left Sidebar - 1/5 width, Dark Navy */}
        <aside className="w-1/5 bg-slate-900 text-white p-4">
          <nav className="space-y-1">
            <button 
              onClick={() => navigate('/csr-dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-medium"
              data-testid="nav-dashboard"
            >
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </button>
            <button 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-800 transition-colors"
              data-testid="nav-impact-report"
            >
              <BarChart3 className="h-5 w-5" />
              <span>Impact Reporting</span>
            </button>
            <button 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-800 transition-colors"
              data-testid="nav-engagement"
            >
              <Users className="h-5 w-5" />
              <span>Employee Engagement</span>
            </button>
            <button 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-800 transition-colors"
              data-testid="nav-project-portfolio"
            >
              <Briefcase className="h-5 w-5" />
              <span>Project Portfolio</span>
            </button>
            <button 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-800 transition-colors"
              data-testid="nav-reports"
            >
              <FileText className="h-5 w-5" />
              <span>Reports & Exports</span>
            </button>
            <button 
              onClick={() => navigate('/corporate-partner-profile-settings')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-800 transition-colors"
              data-testid="nav-settings"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content - 4/5 width */}
        <main className="w-4/5 p-6 space-y-6">
          {/* KPI Cards Row - 4 cards in dark navy */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-0 text-white" data-testid="kpi-total-hours">
              <CardContent className="p-5">
                <p className="text-sm text-gray-400 mb-1">Total Hours Logged</p>
                <p className="text-3xl font-bold">{csrData?.totalHours?.toLocaleString() || '12,450'}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-0 text-white" data-testid="kpi-employees">
              <CardContent className="p-5">
                <p className="text-sm text-gray-400 mb-1">Employees Engaged</p>
                <p className="text-3xl font-bold">{csrData?.activeEmployees || '890'}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-0 text-white" data-testid="kpi-projects">
              <CardContent className="p-5">
                <p className="text-sm text-gray-400 mb-1">Projects Completed</p>
                <p className="text-3xl font-bold">{csrData?.projectsCompleted || '112'}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-0 text-white" data-testid="kpi-sdg-delta">
              <CardContent className="p-5">
                <p className="text-sm text-gray-400 mb-1">SDG Score Delta</p>
                <p className="text-3xl font-bold">+{csrData?.sdgScoreDelta || '15'}% <span className="text-lg font-normal text-gray-400">Q3</span></p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Grid - 2x2 layout */}
          <div className="grid grid-cols-2 gap-4" style={{ gridTemplateRows: '2fr 1fr' }}>
            {/* Row 1, Col 1: SDG Alignment Dashboard - Partial Wheel */}
            <Card className="bg-white border border-gray-200 row-span-1" data-testid="chart-sdg-alignment">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">SDG Alignment Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-64">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* SDG Partial Wheel Chart */}
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        startAngle={180}
                        endAngle={-180}
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${value}%`}
                        labelLine={false}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Progress']}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: 'white' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">SDG %</p>
                      <p className="text-lg text-gray-500">18%</p>
                    </div>
                  </div>
                </div>
                {/* SDG Labels around the chart */}
                <div className="absolute top-4 left-4 text-xs text-gray-600">
                  <p>SDG 4: Quality</p>
                  <p>22%</p>
                </div>
                <div className="absolute top-4 right-4 text-xs text-gray-600">
                  <p>SDG 4</p>
                  <p>19%</p>
                </div>
              </CardContent>
            </Card>

            {/* Row 1, Col 2: Geographic Impact by Region - World Map */}
            <Card className="bg-white border border-gray-200 row-span-1" data-testid="chart-geographic-impact">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Geographic Impact by Region</CardTitle>
              </CardHeader>
              <CardContent className="h-64 relative">
                {/* Navy World Map Placeholder */}
                <div className="w-full h-48 bg-slate-800 rounded-lg relative overflow-hidden">
                  {/* Simplified world map silhouette */}
                  <svg viewBox="0 0 400 200" className="w-full h-full opacity-60">
                    {/* North America */}
                    <path d="M50,40 Q70,30 90,35 L110,50 Q130,60 120,80 L100,90 Q80,85 60,70 Z" fill="#4B5563" />
                    {/* South America */}
                    <path d="M100,100 Q110,110 105,140 L95,160 Q85,155 90,130 Z" fill="#4B5563" />
                    {/* Europe */}
                    <path d="M180,35 Q200,30 210,40 L215,60 Q205,65 190,55 Z" fill="#4B5563" />
                    {/* Africa */}
                    <path d="M190,70 Q210,65 220,85 L215,120 Q200,125 185,110 Z" fill="#4B5563" />
                    {/* Asia */}
                    <path d="M230,30 Q280,25 320,40 L330,70 Q310,90 270,80 L240,60 Z" fill="#4B5563" />
                    {/* Australia */}
                    <path d="M300,120 Q320,115 330,130 L325,145 Q310,150 300,140 Z" fill="#4B5563" />
                    
                    {/* Connection lines from HQ */}
                    <circle cx="200" cy="50" r="4" fill="#F97316" /> {/* HQ */}
                    <line x1="200" y1="50" x2="80" y2="60" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4" />
                    <line x1="200" y1="50" x2="280" y2="50" stroke="#F97316" strokeWidth="1" strokeDasharray="4" />
                    <line x1="200" y1="50" x2="200" y2="100" stroke="#22C55E" strokeWidth="1" strokeDasharray="4" />
                    <line x1="200" y1="50" x2="310" y2="130" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4" />
                    
                    {/* Project dots */}
                    <circle cx="80" cy="60" r="3" fill="#3B82F6" />
                    <circle cx="280" cy="50" r="3" fill="#F97316" />
                    <circle cx="200" cy="100" r="3" fill="#22C55E" />
                    <circle cx="310" cy="130" r="3" fill="#3B82F6" />
                  </svg>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-3 justify-center text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Northie focpart</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Vrorsie neelto/soiken</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-gray-600">Hue qoysit</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Pot.upvsilla</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Row 2, Col 1: Employee Engagement Funnel */}
            <Card className="bg-white border border-gray-200" data-testid="chart-employee-funnel">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Employee Engagement Funnel</CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm">
                  {/* Funnel visualization */}
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold">+</span>
                      <span className="text-gray-500">(15,900)</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span>Registered</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span>1+ Project</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold">890</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mt-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span>Eligible (1,500)</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span>(1,100)</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span>Retained</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold">650</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Row 2, Col 2: Pending Admin Actions */}
            <Card className="bg-white border border-gray-200" data-testid="chart-pending-actions">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Pending Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {pendingActions.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                    <span>{action.type}: {action.orgName}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
