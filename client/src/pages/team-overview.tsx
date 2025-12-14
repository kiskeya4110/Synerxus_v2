import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, Users, Target, Award, Brain, Zap, AlertCircle } from "lucide-react";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import Footer from "@/components/layout/footer";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import Logo from "@/components/ui/logo";

interface MLInsight {
  type: "success" | "warning" | "prediction" | "recommendation";
  title: string;
  message: string;
  confidence: number;
  actionable?: string;
}

interface TeamOverviewData {
  // Real-time KPIs
  matchSuccessRate: number;
  projectCompletionScore: number;
  impactPrediction: number;

  // ML Analytics
  skillGapAnalysis: {
    skill: string;
    demand: number;
    supply: number;
    gap: number;
  }[];

  volunteerRetentionPrediction: {
    cohort: string;
    predicted: number;
    actual: number;
  }[];

  impactAmplificationScores: {
    sdg: number;
    score: number;
    trend: "increasing" | "stable" | "decreasing";
  }[];

  // Insights
  mlInsights: MLInsight[];

  // SDG-specific data
  sdgMetrics: {
    sdg: number;
    volunteers: number;
    hours: number;
    projects: number;
    impactScore: number;
  }[];

  // Team metrics
  totalVolunteers: number;
  activeProjects: number;
  totalHours: number;
  beneficiaries: number;
}

export default function TeamOverview() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const userId = localStorage.getItem("currentUserId");

  // SDG Filter State - support multiple selection
  const [selectedSDGs, setSelectedSDGs] = useState<number[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch team overview data with auto-refresh
  const { data: teamData, isLoading, refetch } = useQuery<TeamOverviewData>({
    queryKey: ["/api/team-overview", userId, selectedSDGs],
    queryFn: async () => {
      const sdgParam = selectedSDGs.length > 0 ? `&sdgs=${selectedSDGs.join(',')}` : '';
      const response = await fetch(`/api/team-overview?userId=${userId}${sdgParam}`);
      if (!response.ok) throw new Error("Failed to fetch team overview");
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: autoRefresh ? 60000 : false, // Refresh every 60 seconds
    staleTime: 30000,
  });

  // Update last refresh time
  useEffect(() => {
    if (teamData) {
      setLastUpdate(new Date());
    }
  }, [teamData]);

  // Toggle SDG filter
  const toggleSDG = (sdg: number) => {
    setSelectedSDGs(prev =>
      prev.includes(sdg)
        ? prev.filter(s => s !== sdg)
        : [...prev, sdg]
    );
  };

  // Clear all filters
  const clearFilters = () => setSelectedSDGs([]);

  if (isLoading) {
    return (
      <div className="h-screen bg-[#faf9f7] flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading ML-Powered Team Overview...</p>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const adminName = user?.displayName || user?.email?.split('@')[0] || "Admin";

  return (
    <div className="h-screen bg-[#faf9f7] flex flex-col overflow-hidden">
      {/* Header */}
      <div style={{ borderTop: "8px solid #92400e", width: "100%" }} />
      <header className="bg-gradient-to-r from-amber-50 via-amber-100 to-amber-400 text-amber-900 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" showIcon={true} />
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-amber-900">ML-Powered Team Overview</h1>
              <p className="text-sm text-amber-700">Real-time Analytics & Predictions</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-amber-700">{currentDate}</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-amber-900">{adminName}</span>
                <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                  👤
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Auto-refresh indicator */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                autoRefresh
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-gray-100 text-gray-600 border border-gray-300"
              }`}
            >
              {autoRefresh ? "🔄 Auto-refresh ON" : "⏸️ Auto-refresh OFF"}
            </button>
            <span className="text-slate-600">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* SDG Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900">Filter by SDG Goals</h3>
            {selectedSDGs.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters ({selectedSDGs.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((sdg) => {
              const isSelected = selectedSDGs.includes(sdg);
              const sdgIcon = getSDGIcon(sdg);
              return (
                <button
                  key={sdg}
                  onClick={() => toggleSDG(sdg)}
                  className={`group relative h-12 w-12 rounded-lg transition-all duration-200 ${
                    isSelected
                      ? "ring-4 ring-blue-500 scale-110 shadow-lg"
                      : "hover:scale-105 hover:shadow-md opacity-70 hover:opacity-100"
                  }`}
                  title={getSDGName(sdg)}
                >
                  {sdgIcon ? (
                    <img
                      src={sdgIcon}
                      alt={`SDG ${sdg}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div
                      className="w-full h-full rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: getSDGColor(sdg) }}
                    >
                      {sdg}
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full">
        {/* Real-time KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            icon={<Target className="w-8 h-8" />}
            title="Match Success Rate"
            value={`${teamData?.matchSuccessRate || 0}%`}
            trend="+12% vs last month"
            color="bg-gradient-to-br from-green-500 to-emerald-600"
            detail="AI-powered volunteer-project matching"
          />
          <KPICard
            icon={<Award className="w-8 h-8" />}
            title="Project Completion"
            value={`${teamData?.projectCompletionScore || 0}%`}
            trend="+8% vs last month"
            color="bg-gradient-to-br from-blue-500 to-indigo-600"
            detail="ML-predicted completion rate"
          />
          <KPICard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Impact Prediction"
            value={`${teamData?.impactPrediction || 0}%`}
            trend="High confidence"
            color="bg-gradient-to-br from-purple-500 to-pink-600"
            detail="Forecasted impact for next quarter"
          />
          <KPICard
            icon={<Users className="w-8 h-8" />}
            title="Active Volunteers"
            value={teamData?.totalVolunteers || 0}
            trend={`${teamData?.activeProjects || 0} projects`}
            color="bg-gradient-to-br from-amber-500 to-orange-600"
            detail="Real-time engagement metrics"
          />
        </div>

        {/* ML Insights Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-slate-900">ML Insights & Recommendations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(teamData?.mlInsights || []).map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Skill Gap Analysis */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Skill Gap Analysis
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamData?.skillGapAnalysis || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="skill" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="demand" fill="#ef4444" name="Demand" />
                <Bar dataKey="supply" fill="#10b981" name="Supply" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Volunteer Retention Prediction */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Retention Predictions
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={teamData?.volunteerRetentionPrediction || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cohort" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="ML Predicted"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Actual"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Impact Amplification Radar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Impact Amplification by SDG</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={teamData?.impactAmplificationScores || []}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey={(item: any) => `SDG ${item.sdg}`}
              />
              <PolarRadiusAxis />
              <Radar
                name="Impact Score"
                dataKey="score"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* SDG Metrics Table */}
        {selectedSDGs.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Filtered SDG Metrics</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4">SDG</th>
                    <th className="text-right py-3 px-4">Volunteers</th>
                    <th className="text-right py-3 px-4">Hours</th>
                    <th className="text-right py-3 px-4">Projects</th>
                    <th className="text-right py-3 px-4">Impact Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(teamData?.sdgMetrics || [])
                    .filter((m) => selectedSDGs.includes(m.sdg))
                    .map((metric) => (
                      <tr key={metric.sdg} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 flex items-center gap-2">
                          <img
                            src={getSDGIcon(metric.sdg)}
                            alt={`SDG ${metric.sdg}`}
                            className="w-8 h-8 rounded"
                          />
                          <span className="font-medium">SDG {metric.sdg}</span>
                        </td>
                        <td className="text-right py-3 px-4">{metric.volunteers}</td>
                        <td className="text-right py-3 px-4">{metric.hours.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">{metric.projects}</td>
                        <td className="text-right py-3 px-4">
                          <span className="font-bold text-purple-600">{metric.impactScore}%</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Footer />
      </main>

      <MobileBottomNav />
    </div>
  );
}

// KPI Card Component
function KPICard({
  icon,
  title,
  value,
  trend,
  color,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  trend: string;
  color: string;
  detail: string;
}) {
  return (
    <div className={`${color} text-white rounded-xl shadow-lg p-6 hover:scale-105 transition-transform duration-200 cursor-pointer`}>
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
        <div className="text-xs bg-white/20 px-2 py-1 rounded-full">{trend}</div>
      </div>
      <h3 className="text-sm font-medium mb-1 opacity-90">{title}</h3>
      <p className="text-3xl font-bold mb-2">{value}</p>
      <p className="text-xs opacity-80">{detail}</p>
    </div>
  );
}

// Insight Card Component
function InsightCard({ insight }: { insight: MLInsight }) {
  const icons = {
    success: "✅",
    warning: "⚠️",
    prediction: "🔮",
    recommendation: "💡",
  };

  const colors = {
    success: "bg-green-50 border-green-300",
    warning: "bg-yellow-50 border-yellow-300",
    prediction: "bg-purple-50 border-purple-300",
    recommendation: "bg-blue-50 border-blue-300",
  };

  return (
    <div className={`${colors[insight.type]} border-2 rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icons[insight.type]}</span>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 mb-1">{insight.title}</h4>
          <p className="text-sm text-slate-700 mb-2">{insight.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">
              Confidence: {insight.confidence}%
            </span>
            {insight.actionable && (
              <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                {insight.actionable}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
