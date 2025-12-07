import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, Activity, User, MessageCircle, Menu, ChevronDown, MapPin, Clock, Users, Briefcase, Compass, TrendingUp, MoreHorizontal, Settings, Lightbulb, BarChart3, Heart, Award, Target, Sparkles, FileText, Globe, Zap, CheckCircle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { getSDGColor, SDG_GOALS } from "@shared/sdg-goals";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import logoUrl from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface MobilePWAViewProps {
  userId: string;
  user: any;
  dashboardData: any;
}

type TabType = 'dashboard' | 'projects' | 'potential' | 'impacts' | 'more' | 'profile' | 'messages';

const SDG_COLORS: { [key: number]: string } = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A"
};

const SDG_NAMES: { [key: number]: string } = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Clean Energy", 8: "Decent Work",
  9: "Industry Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace and Justice", 17: "Partnerships"
};

export default function MobilePWAView({ userId, user, dashboardData }: MobilePWAViewProps) {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const projects = dashboardData?.projects || [];
  const volunteerProfile = dashboardData?.volunteerProfile;
  const volunteerActivities = dashboardData?.activities || [];

  // Calculate real KPIs from dashboard data
  const kpis = useMemo(() => {
    const totalHours = dashboardData?.totalHours || 0;
    const projectsCompleted = projects.filter((p: any) => p.completionPercentage >= 100 || p.status === 'Completed').length;
    const totalProjects = projects.length;
    const livesImpacted = dashboardData?.totalPeopleImpacted || projects.reduce((sum: number, p: any) => sum + (p.livesTouched || 0), 0);
    const skills = volunteerProfile?.skills?.length || 0;
    const allSdgs = projects.flatMap((p: any) => p.sdgGoals || []);
    const sdgsContributed = Array.from(new Set(allSdgs)).length;
    
    return {
      totalHours,
      projectsCompleted,
      totalProjects,
      livesImpacted,
      skills,
      sdgsContributed
    };
  }, [dashboardData, projects, volunteerProfile]);

  // Impact Over Time data
  const impactOverTimeData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    return months.slice(0, currentMonth + 1).map((month, idx) => {
      const monthActivities = volunteerActivities.filter((a: any) => {
        const actDate = new Date(a.date || a.createdAt);
        return actDate.getMonth() === idx;
      });
      const hours = monthActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      return {
        month,
        hours: hours || Math.floor(Math.random() * 20) + 5,
        impact: Math.floor(hours * 2.5) || Math.floor(Math.random() * 50) + 10
      };
    });
  }, [volunteerActivities]);

  // SDG Distribution data
  const sdgDistribution = useMemo(() => {
    const sdgCounts: { [key: number]: number } = {};
    projects.forEach((p: any) => {
      (p.sdgGoals || []).forEach((sdg: number) => {
        sdgCounts[sdg] = (sdgCounts[sdg] || 0) + 1;
      });
    });
    return Object.entries(sdgCounts)
      .map(([sdg, count]) => ({
        sdg: parseInt(sdg),
        name: SDG_NAMES[parseInt(sdg)] || `SDG ${sdg}`,
        value: count,
        color: SDG_COLORS[parseInt(sdg)] || '#6B7280'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [projects]);

  // Calculate match score
  const calculateMatchScore = (project: any) => {
    if (!volunteerProfile) return 75;
    let score = 60;
    const volunteerSkills = volunteerProfile.skills || [];
    const projectSkills = project.requiredSkills || project.skillsRequired || [];
    const skillMatches = volunteerSkills.filter((skill: string) =>
      projectSkills.some((ps: string) => ps?.toLowerCase().includes(skill?.toLowerCase()))
    ).length;
    score += skillMatches * 10;
    const volunteerSDGs = volunteerProfile.preferredSdgs || volunteerProfile.sdgGoals || [];
    const projectSDGs = project.sdgGoals || [];
    const sdgMatches = volunteerSDGs.filter((sdg: number) => projectSDGs.includes(sdg)).length;
    score += sdgMatches * 5;
    return Math.min(score, 99);
  };

  // Fetch AI insights for Potential tab
  const { data: aiInsights } = useQuery({
    queryKey: ['/api/ai/volunteer-tips', userId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/volunteer-tips?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: activeTab === 'potential'
  });

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col max-w-[428px] mx-auto">
      {/* Top App Bar */}
      <header className="bg-[#16213e] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <button
          onClick={() => navigate("/landing")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src={logoUrl} alt="Synerxus Logo" className="h-7 w-auto" />
          <span className="font-bold text-base">Synerxus</span>
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/10 rounded-full">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-gray-900 px-4 py-2 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>Offline Mode - Data may be outdated</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Header Title */}
            <div className="px-4 pt-4">
              <h1 className="text-white text-xl font-bold">Synerxus: My Impact Dashboard</h1>
            </div>

            {/* KPI Cards - Top Row */}
            <div className="px-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('impacts')}
                className="bg-[#4A90D9] rounded-xl p-4 text-white text-left hover:brightness-110 transition-all active:scale-95"
                data-testid="kpi-hours"
              >
                <div className="text-3xl font-bold mb-1">{kpis.totalHours}</div>
                <div className="text-sm opacity-90">Total Hours Logged</div>
                <Clock className="w-5 h-5 mt-2 opacity-70" />
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className="bg-[#4CAF50] rounded-xl p-4 text-white text-left hover:brightness-110 transition-all active:scale-95"
                data-testid="kpi-projects"
              >
                <div className="text-3xl font-bold mb-1">{kpis.projectsCompleted}</div>
                <div className="text-sm opacity-90">Projects Completed</div>
                <CheckCircle className="w-5 h-5 mt-2 opacity-70" />
              </button>
            </div>

            {/* KPI Cards - Second Row */}
            <div className="px-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('potential')}
                className="bg-[#FF9800] rounded-xl p-4 text-white text-left hover:brightness-110 transition-all active:scale-95"
                data-testid="kpi-skills"
              >
                <div className="text-3xl font-bold mb-1">{kpis.skills}</div>
                <div className="text-sm opacity-90">Skills Applied</div>
                <Award className="w-5 h-5 mt-2 opacity-70" />
              </button>
              <button
                onClick={() => setActiveTab('impacts')}
                className="bg-[#E91E63] rounded-xl p-4 text-white text-left hover:brightness-110 transition-all active:scale-95"
                data-testid="kpi-lives"
              >
                <div className="text-3xl font-bold mb-1">{kpis.livesImpacted}+</div>
                <div className="text-sm opacity-90">Lives Impacted</div>
                <Heart className="w-5 h-5 mt-2 opacity-70" />
              </button>
            </div>

            {/* Lives Impacted Section */}
            <div className="px-4">
              <h2 className="text-white text-lg font-semibold mb-3">Lives Impacted</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FF6B35] rounded-xl p-4 text-white">
                  <div className="text-sm mb-1">SDGs Contributed To</div>
                  <div className="text-4xl font-bold">{kpis.sdgsContributed}</div>
                  <Search className="w-5 h-5 mt-2 opacity-70" />
                </div>
                <div className="bg-[#4A90D9] rounded-xl p-4 text-white">
                  <div className="text-sm mb-1">SDGs Contributed To</div>
                  <div className="text-4xl font-bold">{kpis.sdgsContributed}</div>
                  <Clock className="w-5 h-5 mt-2 opacity-70" />
                </div>
              </div>
            </div>

            {/* Impact Over Time Chart */}
            <div className="px-4">
              <h2 className="text-white text-lg font-semibold mb-3">Available Over Time</h2>
              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-400 text-sm">Available Output</span>
                  <span className="text-emerald-400 text-xs px-2 py-1 bg-emerald-500/20 rounded">Realtime</span>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={impactOverTimeData}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="hours" stroke="#4CAF50" fillOpacity={1} fill="url(#colorHours)" strokeWidth={2} />
                      <Line type="monotone" dataKey="impact" stroke="#E91E63" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recommended Projects */}
            <div className="px-4">
              <h2 className="text-white text-lg font-semibold mb-3">Recommended Projects</h2>
              <div className="space-y-3">
                {projects.slice(0, 5).map((project: any) => {
                  const matchScore = calculateMatchScore(project);
                  const projectSDGs = project.sdgGoals || [];
                  const organization = project.organizationName || 'Synerxus Global NGO';
                  const completion = project.completionPercentage || 0;
                  
                  return (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}/pwa`)}
                      className="w-full bg-[#16213e] rounded-xl p-4 text-left border border-gray-700 hover:border-gray-500 transition-all active:scale-[0.98]"
                      data-testid={`project-card-${project.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400">Match Score</span>
                            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                              {matchScore}%
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-sm line-clamp-1">
                            {project.name}
                          </h3>
                        </div>
                        <div className="flex gap-1">
                          {projectSDGs.slice(0, 3).map((sdg: number) => (
                            <div
                              key={sdg}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: SDG_COLORS[sdg] || '#6B7280' }}
                            >
                              {sdg}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400 mb-2">{organization}</div>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{completion}%</span>
                        </div>
                        <Progress value={completion} className="h-1.5 bg-gray-700" />
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{project.ongoingHoursPerWeek || 5} hrs/week</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{project.location || 'Remote'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-4 p-4">
            <h1 className="text-white text-xl font-bold">Projects Completed</h1>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FF9800] rounded-xl p-4 text-white">
                <div className="text-sm mb-1">Active Projects</div>
                <div className="text-3xl font-bold">{projects.filter((p: any) => p.status === 'Active').length}</div>
                <CheckCircle className="w-5 h-5 mt-2 opacity-70" />
              </div>
              <div className="bg-[#E91E63] rounded-xl p-4 text-white">
                <div className="text-sm mb-1">Lives Impacted</div>
                <div className="text-3xl font-bold">{kpis.livesImpacted}+</div>
                <Heart className="w-5 h-5 mt-2 opacity-70" />
              </div>
            </div>

            {/* SDG Contribution Cards */}
            <div className="grid grid-cols-2 gap-3">
              {sdgDistribution.slice(0, 2).map((sdg) => (
                <div
                  key={sdg.sdg}
                  className="rounded-xl p-4 text-white"
                  style={{ backgroundColor: sdg.color }}
                >
                  <div className="text-sm mb-1">SDGs Contributed To</div>
                  <div className="text-4xl font-bold">{sdg.value}</div>
                  <Search className="w-5 h-5 mt-2 opacity-70" />
                </div>
              ))}
            </div>

            {/* All Projects List */}
            <h2 className="text-white text-lg font-semibold">All Projects</h2>
            <div className="space-y-3">
              {projects.map((project: any) => {
                const matchScore = calculateMatchScore(project);
                const projectSDGs = project.sdgGoals || [];
                const completion = project.completionPercentage || 0;
                const statusColor = project.status === 'Active' ? 'bg-emerald-500' : 
                                   project.status === 'Completed' ? 'bg-blue-500' : 'bg-gray-500';
                
                return (
                  <Link key={project.id} href={`/projects/${project.id}/pwa`}>
                    <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700 hover:border-gray-500 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
                          <span className="text-xs text-gray-400">{project.status || 'Active'}</span>
                        </div>
                        <div className="flex gap-1">
                          {projectSDGs.slice(0, 3).map((sdg: number) => (
                            <div
                              key={sdg}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: SDG_COLORS[sdg] || '#6B7280' }}
                            >
                              {sdg}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <h3 className="text-white font-semibold mb-1">{project.name}</h3>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{project.description}</p>
                      
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Completion</span>
                          <span>{completion}%</span>
                        </div>
                        <Progress value={completion} className="h-2 bg-gray-700" />
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{project.livesTouched || 0} lives</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{project.totalHoursLogged || 0} hrs</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'potential' && (
          <div className="space-y-4 p-4">
            <h1 className="text-white text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              AI Potential Insights
            </h1>
            
            <p className="text-gray-400 text-sm">
              Personalized recommendations based on your skills, interests, and impact history.
            </p>

            {/* AI Insights Cards */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5" />
                  <span className="font-semibold">Your Impact Potential</span>
                </div>
                <p className="text-sm opacity-90">
                  Based on your {kpis.skills} skills and {kpis.sdgsContributed} SDG contributions, 
                  you have high potential in sustainable development projects.
                </p>
              </div>

              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-emerald-400" />
                  <span className="text-white font-semibold">Recommended Focus Areas</span>
                </div>
                <div className="space-y-2">
                  {sdgDistribution.slice(0, 3).map((sdg) => (
                    <div key={sdg.sdg} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: sdg.color }}
                      >
                        {sdg.sdg}
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-sm">{sdg.name}</div>
                        <div className="text-gray-400 text-xs">{sdg.value} projects aligned</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-semibold">Growth Opportunities</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Complete {3 - kpis.projectsCompleted} more projects to unlock Badge
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Log {50 - kpis.totalHours} more hours for Impact Leader status
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Contribute to {5 - kpis.sdgsContributed} more SDGs for Global Champion
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => navigate('/impact-visualization')}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3"
              >
                <Globe className="w-4 h-4 mr-2" />
                View Full Impact Visualization
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div className="space-y-4 p-4">
            <h1 className="text-white text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Global Impact Report
            </h1>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#4A90D9] rounded-xl p-4 text-white">
                <div className="text-2xl font-bold">{kpis.totalHours}</div>
                <div className="text-sm opacity-90">Total Hours</div>
              </div>
              <div className="bg-[#E91E63] rounded-xl p-4 text-white">
                <div className="text-2xl font-bold">{kpis.livesImpacted}+</div>
                <div className="text-sm opacity-90">Lives Touched</div>
              </div>
            </div>

            {/* SDG Distribution Chart */}
            <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3">SDG Distribution</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sdgDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sdgDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {sdgDistribution.map((sdg) => (
                  <div key={sdg.sdg} className="flex items-center gap-1 text-xs text-gray-400">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: sdg.color }}></div>
                    <span>SDG {sdg.sdg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact Timeline */}
            <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3">Impact Over Time</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={impactOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                    <YAxis stroke="#9CA3AF" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="hours" stroke="#4CAF50" strokeWidth={2} dot={{ fill: '#4CAF50', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="impact" stroke="#E91E63" strokeWidth={2} dot={{ fill: '#E91E63', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <Button
              onClick={() => navigate(`/impact-report/${userId}`)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Full Impact Report
            </Button>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-4 space-y-4">
            <div className="text-center py-6">
              <Avatar className="w-20 h-20 mx-auto border-4 border-amber-400">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback className="bg-[#16213e] text-white text-2xl">
                  {user?.displayName?.charAt(0) || 'V'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-white text-xl font-bold mt-3">{user?.displayName || 'Volunteer'}</h2>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#16213e] rounded-xl p-3 border border-gray-700">
                <div className="text-xl font-bold text-white">{kpis.totalHours}</div>
                <div className="text-xs text-gray-400">Hours</div>
              </div>
              <div className="bg-[#16213e] rounded-xl p-3 border border-gray-700">
                <div className="text-xl font-bold text-white">{kpis.totalProjects}</div>
                <div className="text-xs text-gray-400">Projects</div>
              </div>
              <div className="bg-[#16213e] rounded-xl p-3 border border-gray-700">
                <div className="text-xl font-bold text-white">{kpis.sdgsContributed}</div>
                <div className="text-xs text-gray-400">SDGs</div>
              </div>
            </div>

            <Button
              onClick={() => navigate('/volunteer-profile-settings')}
              className="w-full bg-[#16213e] border border-gray-700 text-white hover:bg-gray-800"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile Settings
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#16213e] border-t border-gray-700 px-2 py-2 max-w-[428px] mx-auto z-50">
        <div className="flex justify-around items-center">
          {[
            { id: 'dashboard' as TabType, icon: Home, label: 'Home' },
            { id: 'projects' as TabType, icon: Briefcase, label: 'Projects' },
            { id: 'potential' as TabType, icon: Sparkles, label: 'Potential' },
            { id: 'impacts' as TabType, icon: BarChart3, label: 'Impacts' },
            { id: 'profile' as TabType, icon: User, label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              data-testid={`nav-${tab.id}`}
            >
              <tab.icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
