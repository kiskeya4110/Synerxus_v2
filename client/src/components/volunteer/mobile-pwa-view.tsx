import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, Activity, User, MessageCircle, ChevronDown, MapPin, Clock, Users, Briefcase, Compass, TrendingUp, MoreHorizontal, MoreVertical, Settings, Lightbulb, BarChart3, Heart, Award, Target, Sparkles, FileText, Globe, Zap, CheckCircle, LogOut, Bell, HelpCircle } from "lucide-react";
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
  const [showMenu, setShowMenu] = useState(false);
  const [showKpiModal, setShowKpiModal] = useState<string | null>(null);
  const [showSdgModal, setShowSdgModal] = useState<number | null>(null);
  const [showProjectStatsModal, setShowProjectStatsModal] = useState<'active' | 'total' | 'sdgs' | null>(null);

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
    const safeProjects = Array.isArray(projects) ? projects : [];
    const totalHours = Number(dashboardData?.totalHours) || 0;
    const projectsCompleted = safeProjects.filter((p: any) =>
      (Number(p?.completionPercentage) >= 100) || p?.status === 'Completed'
    ).length;
    const activeProjects = safeProjects.filter((p: any) =>
      p?.status === 'Active' || p?.status === 'In Progress'
    ).length;
    const totalProjects = safeProjects.length;
    const livesImpacted = Number(dashboardData?.totalPeopleImpacted) ||
      safeProjects.reduce((sum: number, p: any) => sum + (Number(p?.livesTouched) || 0), 0);
    const skills = Array.isArray(volunteerProfile?.skills) ? volunteerProfile.skills.length : 0;
    // Only count unique, valid SDG numbers (1-17) from projects with actual SDG goals
    const allSdgs = safeProjects
      .filter((p: any) => p?.sdgGoals && Array.isArray(p.sdgGoals) && p.sdgGoals.length > 0)
      .flatMap((p: any) => p.sdgGoals)
      .filter((sdg: any) => sdg !== null && sdg !== undefined && typeof sdg === 'number' && Number.isInteger(sdg) && sdg >= 1 && sdg <= 17);
    const sdgsContributed = Array.from(new Set(allSdgs)).length;

    return {
      totalHours,
      projectsCompleted,
      activeProjects,
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
      const monthActivities = (volunteerActivities || []).filter((a: any) => {
        if (!a?.date && !a?.createdAt) return false;
        try {
          const actDate = new Date(a.date || a.createdAt);
          return actDate.getMonth() === idx && actDate.getFullYear() === new Date().getFullYear();
        } catch {
          return false;
        }
      });
      const hours = monthActivities.reduce((sum: number, a: any) => sum + (Number(a?.hours) || 0), 0);
      return {
        month,
        hours: hours,
        impact: Math.floor(hours * 2.5)
      };
    });
  }, [volunteerActivities]);

  // SDG Distribution data
  const sdgDistribution = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    const sdgCounts: { [key: number]: number } = {};
    safeProjects.forEach((p: any) => {
      const sdgGoals = Array.isArray(p?.sdgGoals) ? p.sdgGoals : [];
      sdgGoals.forEach((sdg: number) => {
        if (typeof sdg === 'number' && sdg >= 1 && sdg <= 17) {
          sdgCounts[sdg] = (sdgCounts[sdg] || 0) + 1;
        }
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

  // Calculate match score with reasons
  const calculateMatchScore = (project: any) => {
    if (!volunteerProfile) return { score: 75, reasons: ['Based on project popularity'] };
    let score = 60;
    const reasons: string[] = [];

    const volunteerSkills = volunteerProfile.skills || [];
    const projectSkills = project.requiredSkills || project.skillsRequired || [];
    const matchedSkills = volunteerSkills.filter((skill: string) =>
      projectSkills.some((ps: string) => ps?.toLowerCase().includes(skill?.toLowerCase()))
    );
    const skillMatches = matchedSkills.length;
    score += skillMatches * 10;
    if (skillMatches > 0) {
      reasons.push(`${skillMatches} skill${skillMatches > 1 ? 's' : ''} match: ${matchedSkills.slice(0, 2).join(', ')}`);
    }

    const volunteerSDGs = volunteerProfile.preferredSdgs || volunteerProfile.sdgGoals || [];
    const projectSDGs = project.sdgGoals || [];
    const matchedSDGs = volunteerSDGs.filter((sdg: number) => projectSDGs.includes(sdg));
    const sdgMatches = matchedSDGs.length;
    score += sdgMatches * 5;
    if (sdgMatches > 0) {
      reasons.push(`${sdgMatches} SDG${sdgMatches > 1 ? 's' : ''} aligned`);
    }

    if (project.location === volunteerProfile.location || project.isRemote) {
      score += 5;
      reasons.push(project.isRemote ? 'Remote work available' : 'Location match');
    }

    if (reasons.length === 0) {
      reasons.push('Great opportunity to expand your skills');
    }

    return { score: Math.min(score, 99), reasons };
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

  // Fetch applications to track which opportunities user has applied for
  const { data: applications = [] } = useQuery({
    queryKey: ['/api/applications'],
    queryFn: async () => {
      const response = await fetch('/api/applications');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Check if user has applied for a project
  const hasApplied = (projectId: number) => {
    return applications.some((app: any) => app.projectId === projectId && app.userId === parseInt(userId));
  };

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
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Floating Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute top-12 right-0 bg-[#16213e] border border-gray-700 rounded-lg shadow-xl w-56 z-50">
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/my-work');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>My Work</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/discover-opportunities');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Discover Opportunities</span>
                  </button>
                  <div className="border-t border-gray-700 my-1"></div>
                  <button
                    onClick={() => {
                      navigate('/volunteer-profile-settings');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/volunteer-messages');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Messages</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/achievements');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                  >
                    <Award className="w-4 h-4" />
                    <span>Achievements</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Help & Support</span>
                  </button>
                  <div className="border-t border-gray-700 my-1"></div>
                  <button
                    onClick={() => {
                      localStorage.clear();
                      navigate('/login');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
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
              <h1 className="text-white text-xl font-bold">{user?.displayName || 'Volunteer'} Synergy Dashboard</h1>
            </div>

            {/* KPI Cards - Single Row */}
            <div className="px-4 grid grid-cols-4 gap-2">
              <button
                onClick={() => setShowKpiModal('hours')}
                className="bg-[#4A90D9] rounded-lg p-2 text-white text-center hover:brightness-110 transition-all active:scale-95"
                data-testid="kpi-hours"
              >
                <Clock className="w-4 h-4 mx-auto mb-1 opacity-70" />
                <div className="text-xl font-bold">{kpis.totalHours}</div>
                <div className="text-[10px] opacity-90 leading-tight">Hours</div>
              </button>
              <button
                onClick={() => setShowKpiModal('projects')}
                className="bg-[#4CAF50] rounded-lg p-2 text-white text-center hover:brightness-110 transition-all active:scale-95"
                data-testid="kpi-projects"
              >
                <CheckCircle className="w-4 h-4 mx-auto mb-1 opacity-70" />
                <div className="text-xl font-bold">{kpis.totalProjects}</div>
                <div className="text-[10px] opacity-90 leading-tight">Total Projects</div>
              </button>
              <button
                onClick={() => setShowKpiModal('skills')}
                className="bg-[#FF9800] rounded-lg p-2 text-white text-center hover:brightness-110 transition-all active:scale-95"
                data-testid="kpi-skills"
              >
                <Award className="w-4 h-4 mx-auto mb-1 opacity-70" />
                <div className="text-xl font-bold">{kpis.skills}</div>
                <div className="text-[10px] opacity-90 leading-tight">Skills</div>
              </button>
              <button
                onClick={() => setShowKpiModal('sdgs')}
                className="bg-[#E91E63] rounded-lg p-2 text-white text-center hover:brightness-110 transition-all active:scale-95"
                data-testid="kpi-sdgs"
              >
                <Target className="w-4 h-4 mx-auto mb-1 opacity-70" />
                <div className="text-xl font-bold">{kpis.sdgsContributed}</div>
                <div className="text-[10px] opacity-90 leading-tight">SDG Impact</div>
              </button>
            </div>

            {/* All SDGs Section */}
            {sdgDistribution.length > 0 && (
              <div className="px-4">
                <h2 className="text-white text-lg font-semibold mb-3">My SDG Contributions</h2>
                <div className="flex flex-wrap gap-2 justify-center">
                  {sdgDistribution.map((sdg) => (
                    <button
                      key={sdg.sdg}
                      onClick={() => setShowSdgModal(sdg.sdg)}
                      className="relative group hover:scale-110 transition-transform active:scale-95"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                        <img
                          src={getSDGIcon(sdg.sdg)}
                          alt={`SDG ${sdg.sdg}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#1a1a2e]">
                        {sdg.value}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Impact Over Time Chart */}
            {impactOverTimeData.length > 0 && (
              <div className="px-4">
                <h2 className="text-white text-lg font-semibold mb-3">Impact Over Time</h2>
                <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-400 text-sm">Volunteer Hours & Impact</span>
                    <span className="text-emerald-400 text-xs px-2 py-1 bg-emerald-500/20 rounded">Live Data</span>
                  </div>
                  {impactOverTimeData.some(d => d.hours > 0) ? (
                    <>
                      <div className="flex gap-4 mb-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-[#4CAF50]"></div>
                          <span className="text-gray-400">Hours</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-[#E91E63]"></div>
                          <span className="text-gray-400">Lives Impacted</span>
                        </div>
                      </div>
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
                            <Line type="monotone" dataKey="hours" stroke="#4CAF50" strokeWidth={2} dot={{ fill: '#4CAF50', r: 3 }} />
                            <Line type="monotone" dataKey="impact" stroke="#E91E63" strokeWidth={2} dot={{ fill: '#E91E63', r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No activity data yet</p>
                        <p className="text-xs mt-1">Start logging hours to see your impact</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommended Projects */}
            <div className="px-4">
              <h2 className="text-white text-lg font-semibold mb-3">Recommended Projects</h2>
              <div className="space-y-3">
                {projects.slice(0, 5).map((project: any) => {
                  const matchData = calculateMatchScore(project);
                  const projectSDGs = project.sdgGoals || [];
                  const organization = project.organizationName || 'Synerxus Global NGO';
                  const completion = project.completionPercentage || 0;

                  return (
                    <div
                      key={project.id}
                      className="w-full bg-[#16213e] rounded-xl p-4 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400">Match Score</span>
                            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-semibold">
                              {matchData.score}%
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-sm">
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

                      {/* Description */}
                      <p className="text-xs text-gray-300 mb-2 line-clamp-2">
                        {project.description || 'Join this impactful project to make a difference in the community.'}
                      </p>

                      {/* Match Reasons */}
                      <div className="mb-2 space-y-1">
                        {matchData.reasons.slice(0, 2).map((reason: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{completion}%</span>
                        </div>
                        <Progress value={completion} className="h-1.5 bg-gray-700" />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{project.ongoingHoursPerWeek || 5} hrs/week</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{project.location || 'Remote'}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/projects/${project.id}/pwa`)}
                          variant="outline"
                          size="sm"
                          className={hasApplied(project.id) ? "w-full text-xs h-8" : "flex-1 text-xs h-8"}
                        >
                          View Details
                        </Button>
                        {!hasApplied(project.id) && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/opportunities?projectId=${project.id}`);
                            }}
                            size="sm"
                            className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Apply Now
                          </Button>
                        )}
                        {hasApplied(project.id) && (
                          <div className="flex-1 text-xs h-8 bg-emerald-600/30 text-emerald-300 rounded-md flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Applied</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Discover More Button */}
              <Button
                onClick={() => navigate('/discover-opportunities/pwa')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Discover More Opportunities
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-4 p-4">
            <h1 className="text-white text-xl font-bold">Projects Completed</h1>
            
            {/* Stats Cards - Single Row - Now Interactive */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowProjectStatsModal('active')}
                className="bg-[#FF9800] rounded-lg p-3 text-white text-center hover:brightness-110 transition-all active:scale-95"
              >
                <div className="text-2xl font-bold mb-1">{kpis.activeProjects}</div>
                <div className="text-xs opacity-90">Active</div>
                <CheckCircle className="w-4 h-4 mx-auto mt-1 opacity-70" />
              </button>
              <button
                onClick={() => setShowProjectStatsModal('total')}
                className="bg-[#4CAF50] rounded-lg p-3 text-white text-center hover:brightness-110 transition-all active:scale-95"
              >
                <div className="text-2xl font-bold mb-1">{kpis.totalProjects}</div>
                <div className="text-xs opacity-90">Total</div>
                <Briefcase className="w-4 h-4 mx-auto mt-1 opacity-70" />
              </button>
              <button
                onClick={() => setShowProjectStatsModal('sdgs')}
                className="bg-[#E91E63] rounded-lg p-3 text-white text-center hover:brightness-110 transition-all active:scale-95"
              >
                <div className="text-2xl font-bold mb-1">{kpis.sdgsContributed}</div>
                <div className="text-xs opacity-90">SDG Impact</div>
                <Target className="w-4 h-4 mx-auto mt-1 opacity-70" />
              </button>
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
              Personalized recommendations powered by AI to maximize your volunteer impact.
            </p>

            {/* AI Insights Cards */}
            <div className="space-y-3">
              {/* Impact Potential Score */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5" />
                  <span className="font-semibold">Your Impact Potential Score</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold">{Math.min(75 + kpis.skills * 2 + kpis.sdgsContributed * 3, 99)}</div>
                  <div className="flex-1">
                    <Progress value={Math.min(75 + kpis.skills * 2 + kpis.sdgsContributed * 3, 99)} className="h-2 bg-white/20" />
                    <p className="text-xs mt-1 opacity-90">
                      Based on {kpis.skills} skills and {kpis.sdgsContributed} SDG contributions
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills Analysis */}
              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span className="text-white font-semibold">Your Skills Profile</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {volunteerProfile?.skills?.slice(0, 4).map((skill: string, idx: number) => (
                    <div key={idx} className="bg-[#1a1a2e] rounded-lg p-2 text-center">
                      <div className="text-emerald-400 text-xs font-semibold">{skill}</div>
                    </div>
                  )) || (
                    <div className="col-span-2 text-gray-400 text-sm text-center py-2">
                      Add skills to your profile to see personalized recommendations
                    </div>
                  )}
                </div>
                {volunteerProfile?.skills?.length > 4 && (
                  <div className="text-gray-400 text-xs text-center mt-2">
                    +{volunteerProfile.skills.length - 4} more skills
                  </div>
                )}
              </div>

              {/* Recommended Focus Areas */}
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
                        <div className="text-gray-400 text-xs">{sdg.value} {sdg.value === 1 ? 'project' : 'projects'} aligned</div>
                      </div>
                      <div className="text-emerald-400 text-xs font-semibold">High Match</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth Opportunities */}
              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-semibold">Growth Milestones</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  {kpis.projectsCompleted < 5 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Complete {5 - kpis.projectsCompleted} more {5 - kpis.projectsCompleted === 1 ? 'project' : 'projects'} to unlock <strong>Rising Star</strong> badge</span>
                    </li>
                  )}
                  {kpis.totalHours < 50 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Log {50 - kpis.totalHours} more hours for <strong>Impact Leader</strong> status</span>
                    </li>
                  )}
                  {kpis.sdgsContributed < 5 && (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Contribute to {5 - kpis.sdgsContributed} more SDGs for <strong>Global Champion</strong></span>
                    </li>
                  )}
                  {kpis.projectsCompleted >= 5 && kpis.totalHours >= 50 && kpis.sdgsContributed >= 5 && (
                    <li className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400">You've achieved all milestones! Keep up the amazing work!</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* AI Recommendations */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Smart Recommendations</span>
                </div>
                <p className="text-sm opacity-90">
                  Our AI suggests focusing on {sdgDistribution.length > 0 ? sdgDistribution[0].name : 'new SDG areas'} where your skills can create maximum impact.
                  {kpis.totalHours > 20 && ' Your consistent engagement shows strong commitment!'}
                </p>
              </div>

              <Button
                onClick={() => navigate('/impact-visualization')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3"
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
              Synergy Impact Report
            </h1>

            {/* Real Impact Summary */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Your Real Impact</span>
              </div>
              <p className="text-sm opacity-90 mb-3">
                Through {kpis.projectsCompleted} completed projects, you've made a tangible difference in {kpis.livesImpacted} lives across {kpis.sdgsContributed} UN Sustainable Development Goals.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{kpis.totalHours}</div>
                  <div className="text-xs opacity-90">Hours</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{kpis.projectsCompleted}</div>
                  <div className="text-xs opacity-90">Projects</div>
                </div>
                <div className="bg-white/20 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{kpis.livesImpacted}+</div>
                  <div className="text-xs opacity-90">Lives</div>
                </div>
              </div>
            </div>

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
              {sdgDistribution.length > 0 ? (
                <>
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
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No SDG data yet</p>
                    <p className="text-xs mt-1">Join projects to contribute to SDG goals</p>
                  </div>
                </div>
              )}
            </div>

            {/* Impact Timeline */}
            {impactOverTimeData.length > 0 && (
              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3">Impact Over Time</h3>
                {impactOverTimeData.some(d => d.hours > 0) ? (
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
                ) : (
                  <div className="h-40 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No impact timeline yet</p>
                      <p className="text-xs mt-1">Track your volunteer activities to see trends</p>
                    </div>
                  </div>
                )}
              </div>
            )}

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

      {/* KPI Detail Modal */}
      {showKpiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4">
          <div className="bg-[#16213e] rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#16213e] border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-semibold">
                {showKpiModal === 'hours' && 'Total Hours Logged'}
                {showKpiModal === 'projects' && 'Total Projects'}
                {showKpiModal === 'skills' && 'Skills Applied'}
                {showKpiModal === 'sdgs' && 'SDG Contributions'}
              </h2>
              <button
                onClick={() => setShowKpiModal(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {showKpiModal === 'hours' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-blue-400 mb-2">{kpis.totalHours}</div>
                    <div className="text-gray-400">Hours Volunteered</div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg p-4">
                    <div className="text-sm text-gray-300 space-y-2">
                      <div className="flex justify-between">
                        <span>Impact Generated:</span>
                        <span className="text-emerald-400 font-semibold">{Math.floor(kpis.totalHours * 2.5)} lives touched</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Across Projects:</span>
                        <span className="text-white font-semibold">{kpis.totalProjects}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {showKpiModal === 'projects' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-green-400 mb-2">{kpis.totalProjects}</div>
                    <div className="text-gray-400">Total Projects</div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-300 space-y-2">
                      <div className="flex justify-between">
                        <span>Active:</span>
                        <span className="text-orange-400 font-semibold">{kpis.activeProjects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span className="text-green-400 font-semibold">{kpis.projectsCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Hours:</span>
                        <span className="text-blue-400 font-semibold">{kpis.totalHours}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-semibold text-sm">Your Projects:</h3>
                    {projects.slice(0, 5).map((project: any) => (
                      <div key={project.id} className="bg-[#1a1a2e] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-white font-medium text-sm">{project.name}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            project.status === 'Active' ? 'bg-orange-500/20 text-orange-300' :
                            project.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {project.status || 'Active'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{project.organizationName}</div>
                        <Progress value={project.completionPercentage || 0} className="h-1 mt-2" />
                      </div>
                    ))}
                  </div>
                </>
              )}
              {showKpiModal === 'skills' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-orange-400 mb-2">{kpis.skills}</div>
                    <div className="text-gray-400">Skills in Your Arsenal</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(volunteerProfile?.skills || []).map((skill: string, idx: number) => (
                      <div key={idx} className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm">
                        {skill}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {showKpiModal === 'sdgs' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-pink-400 mb-2">{kpis.sdgsContributed}</div>
                    <div className="text-gray-400">UN Sustainable Development Goals</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {sdgDistribution.map((sdg) => (
                      <div
                        key={sdg.sdg}
                        className="rounded-lg p-2 text-center"
                        style={{ backgroundColor: sdg.color }}
                      >
                        <div className="text-white font-bold text-lg">SDG {sdg.sdg}</div>
                        <div className="text-white/80 text-xs">{sdg.value} projects</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SDG Projects Modal */}
      {showSdgModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4">
          <div className="bg-[#16213e] rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#16213e] border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                <span>SDG {showSdgModal}</span>
                <span className="text-sm font-normal text-gray-400">
                  {SDG_NAMES[showSdgModal]}
                </span>
              </h2>
              <button
                onClick={() => setShowSdgModal(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <img
                  src={getSDGIcon(showSdgModal)}
                  alt={`SDG ${showSdgModal}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
              <h3 className="text-white font-semibold mb-3">Projects Contributing to this SDG:</h3>
              <div className="space-y-2">
                {projects
                  .filter((p: any) => p.sdgGoals?.includes(showSdgModal))
                  .map((project: any) => (
                    <div
                      key={project.id}
                      className="bg-[#1a1a2e] rounded-lg p-3 cursor-pointer hover:bg-[#1a1a2e]/70"
                      onClick={() => {
                        setShowSdgModal(null);
                        navigate(`/projects/${project.id}/pwa`);
                      }}
                    >
                      <div className="text-white font-medium text-sm">{project.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{project.organizationName}</div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{project.totalHoursLogged || 0} hrs logged</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{project.livesTouched || 0} lives</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Stats Modal */}
      {showProjectStatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4">
          <div className="bg-[#16213e] rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#16213e] border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-semibold">
                {showProjectStatsModal === 'active' && 'Active Projects'}
                {showProjectStatsModal === 'total' && 'All Projects'}
                {showProjectStatsModal === 'sdgs' && 'SDG Impact Distribution'}
              </h2>
              <button
                onClick={() => setShowProjectStatsModal(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {showProjectStatsModal === 'active' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-orange-400 mb-2">{kpis.activeProjects}</div>
                    <div className="text-gray-400">Currently Active Projects</div>
                  </div>
                  <div className="space-y-2">
                    {projects
                      .filter((p: any) => p.status === 'Active' || p.status === 'In Progress')
                      .map((project: any) => (
                        <div
                          key={project.id}
                          className="bg-[#1a1a2e] rounded-lg p-3 cursor-pointer hover:bg-[#1a1a2e]/70"
                          onClick={() => {
                            setShowProjectStatsModal(null);
                            navigate(`/projects/${project.id}/pwa`);
                          }}
                        >
                          <div className="text-white font-medium text-sm">{project.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{project.organizationName}</div>
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={project.completionPercentage || 0} className="flex-1 h-2" />
                            <span className="text-xs text-gray-400">{project.completionPercentage || 0}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{project.totalHoursLogged || 0} hrs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              <span>{project.livesTouched || 0} lives</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    {kpis.activeProjects === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        <p>No active projects at the moment.</p>
                        <Button
                          onClick={() => {
                            setShowProjectStatsModal(null);
                            navigate('/discover-opportunities/pwa');
                          }}
                          className="mt-4 bg-emerald-500 hover:bg-emerald-600"
                        >
                          Discover Opportunities
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {showProjectStatsModal === 'total' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-green-400 mb-2">{kpis.totalProjects}</div>
                    <div className="text-gray-400">Total Projects</div>
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active:</span>
                      <span className="text-orange-400 font-semibold">{kpis.activeProjects}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Completed:</span>
                      <span className="text-green-400 font-semibold">{kpis.projectsCompleted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Hours:</span>
                      <span className="text-blue-400 font-semibold">{kpis.totalHours}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Lives Touched:</span>
                      <span className="text-pink-400 font-semibold">{kpis.livesImpacted}</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <h3 className="text-white font-semibold text-sm mb-2">All Projects:</h3>
                    {projects.map((project: any) => (
                      <div
                        key={project.id}
                        className="bg-[#1a1a2e] rounded-lg p-3 cursor-pointer hover:bg-[#1a1a2e]/70"
                        onClick={() => {
                          setShowProjectStatsModal(null);
                          navigate(`/projects/${project.id}/pwa`);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-white font-medium text-sm">{project.name}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            project.status === 'Active' ? 'bg-orange-500/20 text-orange-300' :
                            project.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {project.status || 'Active'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">{project.organizationName}</div>
                        {project.completionPercentage > 0 && (
                          <Progress value={project.completionPercentage || 0} className="h-1 mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {showProjectStatsModal === 'sdgs' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-pink-400 mb-2">{kpis.sdgsContributed}</div>
                    <div className="text-gray-400">Sustainable Development Goals</div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-semibold text-sm">SDG Distribution:</h3>
                    {sdgDistribution.map((sdg) => (
                      <div
                        key={sdg.sdg}
                        className="bg-[#1a1a2e] rounded-lg p-3 cursor-pointer hover:bg-[#1a1a2e]/70"
                        onClick={() => {
                          setShowProjectStatsModal(null);
                          setShowSdgModal(sdg.sdg);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ backgroundColor: sdg.color }}
                          >
                            SDG {sdg.sdg}
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-medium text-sm">{sdg.name}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {sdg.value} project{sdg.value !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="text-gray-400">→</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {kpis.sdgsContributed === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <p>No SDG contributions yet.</p>
                      <p className="text-xs mt-2">Start volunteering to make an impact!</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
