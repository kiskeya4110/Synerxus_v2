import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Search, Activity, User, MessageCircle, ChevronDown, MapPin, Clock, Users, Briefcase, Compass, TrendingUp, MoreHorizontal, MoreVertical, Settings, Lightbulb, BarChart3, Heart, Award, Target, Sparkles, FileText, Globe, Zap, CheckCircle, LogOut, Bell, HelpCircle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { getSDGColor, SDG_GOALS } from "@shared/sdg-goals";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
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
  Cell,
  BarChart,
  Bar
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
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

    // SDG Impact: Only count unique SDGs from actual projects (not profile commitments)
    const projectSdgs = safeProjects
      .filter((p: any) => p?.sdgGoals && Array.isArray(p.sdgGoals) && p.sdgGoals.length > 0)
      .flatMap((p: any) => p.sdgGoals)
      .filter((sdg: any) => sdg !== null && sdg !== undefined && typeof sdg === 'number' && Number.isInteger(sdg) && sdg >= 1 && sdg <= 17);
    const sdgsContributed = Array.from(new Set(projectSdgs)).length;

    // Calculate pending applications from dashboardData
    const pendingApplications = Array.isArray(dashboardData?.applications)
      ? dashboardData.applications.filter((app: any) => app?.status === 'Pending' || app?.status === 'pending').length
      : 0;

    return {
      totalHours,
      projectsCompleted,
      activeProjects,
      totalProjects,
      livesImpacted,
      skills,
      sdgsContributed,
      pendingApplications
    };
  }, [dashboardData, projects, volunteerProfile]);

  // Extract pending applications count for easy access
  const pendingApplicationsCount = kpis.pendingApplications;

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

    // Count SDGs from actual projects only
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
      .slice(0, 8); // Show up to 8 SDGs
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

  // Fetch AI insights - always fetch but use staleTime to prevent refetching
  const { data: aiInsights } = useQuery({
    queryKey: ['/api/ai/volunteer-tips', userId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/volunteer-tips?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Fetch project assignments
  const { data: projectAssignments = [] } = useQuery({
    queryKey: ['/api/project-assignments', userId],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Check if user has applied for a project (check both applications and assignments)
  const hasApplied = (projectId: number) => {
    const hasApplication = applications.some((app: any) => app.projectId === projectId && app.userId === parseInt(userId));
    const hasAssignment = projectAssignments.some((assignment: any) => assignment.projectId === projectId && assignment.volunteerId === parseInt(userId));
    return hasApplication || hasAssignment;
  };

  // Apply for project mutation
  const applyMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch('/api/project-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          volunteerId: parseInt(userId),
          role: 'Volunteer',
          status: 'pending',
          hoursCommitted: 0
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply for project');
      }

      return response.json();
    },
    onSuccess: (data, projectId) => {
      toast({
        title: "Application Submitted!",
        description: "Your application has been successfully submitted. The organization will review it soon.",
      });
      // Refetch applications to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/project-assignments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Application Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Get personalized recommended projects
  const recommendedProjects = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];

    // Filter out projects already applied to
    const availableProjects = safeProjects.filter((project: any) => !hasApplied(project.id));

    // Calculate match scores and sort by score
    const projectsWithScores = availableProjects.map((project: any) => ({
      ...project,
      matchData: calculateMatchScore(project)
    }));

    // Sort by match score (highest first), then by creation date (newest first)
    return projectsWithScores
      .sort((a, b) => {
        if (b.matchData.score !== a.matchData.score) {
          return b.matchData.score - a.matchData.score;
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      })
      .slice(0, 5); // Show top 5 matches
  }, [projects, projectAssignments, applications, volunteerProfile]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col max-w-[428px] mx-auto">
      {/* Top App Bar */}
      <header className="bg-[#16213e] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <button
          onClick={() => navigate("/landing")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src={logoUrl} alt="Synerxus Logo" className="h-7 w-auto" />
          <span className="font-bold text-base bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            SYNERXUS
          </span>
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
                  <button
                    onClick={() => {
                      navigate('/log-activity');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Log Activity</span>
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
              <h1 className="text-white text-xl font-bold">{volunteerProfile?.volunteer_name || user?.displayName || 'Volunteer'} Synergy Dashboard</h1>
            </div>

            {/* Personal Profile Section */}
            {dashboardData?.volunteerProfile && (
              <div className="px-4">
                <div className="bg-gradient-to-r from-amber-500/20 via-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-white/10 shadow-lg">
                  <div className="flex gap-4">
                    {/* Profile Picture (1/4) */}
                    <div className="w-20 h-20 flex-shrink-0">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-amber-400 shadow-lg">
                        {dashboardData.volunteerProfile.profilePhotoUrl || user?.profilePicture ? (
                          <img
                            src={dashboardData.volunteerProfile.profilePhotoUrl || user?.profilePicture}
                            alt={volunteerProfile?.volunteer_name || user?.displayName || 'Profile'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
                            {(volunteerProfile?.volunteer_name || user?.displayName || user?.name || 'V').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details (3/4) */}
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Skills */}
                      {dashboardData.volunteerProfile.skills && dashboardData.volunteerProfile.skills.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-white/90 mb-1 flex items-center gap-1">
                            <Award className="h-3 w-3 text-amber-400" />
                            Skills
                          </h3>
                          <div className="flex flex-wrap gap-1">
                            {dashboardData.volunteerProfile.skills.slice(0, 4).map((skill: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-medium rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {dashboardData.volunteerProfile.skills.length > 4 && (
                              <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-medium rounded-full">
                                +{dashboardData.volunteerProfile.skills.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Availability & Role */}
                      <div className="flex items-center gap-3 text-[10px]">
                        {dashboardData.volunteerProfile.weeklyAvailability && (
                          <div className="flex items-center gap-1 text-white/80">
                            <Clock className="h-3 w-3 text-green-400" />
                            <span>{dashboardData.volunteerProfile.weeklyAvailability}h/wk</span>
                          </div>
                        )}
                        {dashboardData.volunteerProfile.professionalTitle && (
                          <div className="flex items-center gap-1 text-white/80 truncate">
                            <Briefcase className="h-3 w-3 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{dashboardData.volunteerProfile.professionalTitle}</span>
                          </div>
                        )}
                      </div>

                      {/* Motivations */}
                      {dashboardData.volunteerProfile.motivations && (
                        <div>
                          <p className="text-[10px] text-white/70 line-clamp-1 italic">
                            "{dashboardData.volunteerProfile.motivations}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                <div className="grid grid-cols-2 gap-3">
                  {sdgDistribution.map((sdg) => (
                    <button
                      key={sdg.sdg}
                      onClick={() => setShowSdgModal(sdg.sdg)}
                      className="bg-[#16213e] rounded-xl p-3 border border-gray-700 hover:border-emerald-500/50 transition-all active:scale-95 text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: sdg.color }}
                        >
                          {sdg.sdg}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-xs truncate">{sdg.name}</div>
                          <div className="text-gray-400 text-[10px]">{sdg.value} {sdg.value === 1 ? 'project' : 'projects'}</div>
                        </div>
                      </div>
                      <div className="bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            backgroundColor: sdg.color,
                            width: `${Math.min((sdg.value / Math.max(...sdgDistribution.map(s => s.value))) * 100, 100)}%`
                          }}
                        />
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
                {recommendedProjects.map((project: any) => {
                  const matchData = project.matchData;
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
                              applyMutation.mutate(project.id);
                            }}
                            disabled={applyMutation.isPending}
                            size="sm"
                            className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {applyMutation.isPending ? "Applying..." : "Apply Now"}
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
            {/* Dashboard Title */}
            <h1 className="text-white text-2xl font-bold">Dashboard</h1>

            {/* SDG Impact Snapshot - Green Gradient Card */}
            <div className="bg-gradient-to-r from-[#22c55e] to-[#4ade80] rounded-xl p-4 text-white shadow-lg">
              <h2 className="text-lg font-semibold mb-3">SDG Impact Snapshot</h2>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl font-bold">{kpis.totalHours}</span>
                <div className="flex-1">
                  <span className="text-sm">Volunteer Hours Logged</span>
                </div>
                <Globe className="w-8 h-8 opacity-80" />
              </div>
              <div className="flex items-center gap-2 border-t border-white/30 pt-2 mt-2">
                <Clock className="w-5 h-5 opacity-80" />
                <span className="text-sm">Contributed to {kpis.sdgsContributed} SDGS</span>
                <Globe className="w-5 h-5 opacity-80 ml-auto" />
              </div>
            </div>

            {/* SDG Grid with Checkmarks */}
            <div className="grid grid-cols-4 gap-2">
              {sdgDistribution.slice(0, 8).map((sdg, idx) => (
                <div
                  key={`${sdg.sdg}-${idx}`}
                  className="relative rounded-lg p-3 flex items-center justify-center aspect-square"
                  style={{ backgroundColor: sdg.color }}
                >
                  <div className="text-white text-center">
                    <div className="text-xs opacity-80 mb-1">SDG</div>
                    <div className="text-2xl font-bold">{sdg.sdg}</div>
                  </div>
                  {/* Checkmark indicator */}
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
              ))}
              {/* Fill empty slots if less than 8 SDGs */}
              {Array.from({ length: Math.max(0, 8 - sdgDistribution.length) }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="rounded-lg p-3 flex items-center justify-center aspect-square bg-gray-700/50 border border-gray-600"
                >
                  <div className="text-gray-500 text-center">
                    <div className="text-xs mb-1">SDG</div>
                    <div className="text-xl font-bold">?</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Project Overview Section */}
            <div>
              <h2 className="text-white text-lg font-semibold mb-3">Project Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                  <div className="text-gray-400 text-sm mb-1">Active Projects</div>
                  <div className="flex items-center gap-3">
                    <span className="text-white text-4xl font-bold">{kpis.activeProjects}</span>
                    <div className="flex-1">
                      <Progress value={(kpis.activeProjects / Math.max(kpis.totalProjects, 1)) * 100} className="h-2 bg-gray-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center gap-1 text-gray-400 text-sm mb-1">
                    <span>Pending Applications</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 ml-auto"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white text-4xl font-bold">{pendingApplicationsCount}</span>
                    <Clock className="w-6 h-6 text-gray-500 ml-auto" />
                  </div>
                </div>
              </div>
            </div>

            {/* Your Top SDGs - Bar Chart */}
            <div>
              <h2 className="text-white text-lg font-semibold mb-3">Your Top SDGS</h2>
              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                {sdgDistribution.length > 0 ? (
                  <>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sdgDistribution.slice(0, 4)} layout="horizontal">
                          <XAxis type="category" dataKey="sdg" stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `SDG ${val}`} />
                          <YAxis type="number" stroke="#9CA3AF" fontSize={10} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#fff' }}
                            formatter={(value: number, name: string) => [value, 'Projects']}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {sdgDistribution.slice(0, 4).map((entry, index) => (
                              <Cell key={`bar-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-700">
                      {sdgDistribution.slice(0, 4).map((sdg) => (
                        <div key={sdg.sdg} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: sdg.color }}></div>
                          <span className="text-gray-400">SDG {sdg.sdg} {sdg.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No SDG data yet</p>
                      <p className="text-xs mt-1">Join projects to contribute to SDGs</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Impact Timeline */}
            <div>
              <h2 className="text-white text-lg font-semibold mb-3">Impact Over Time</h2>
              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
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
                    <div className="h-32">
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
                  <div className="h-32 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No impact timeline yet</p>
                      <p className="text-xs mt-1">Track activities to see trends</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">AI Impact Insights</span>
              </div>
              <p className="text-sm opacity-90">
                {kpis.totalHours > 50 
                  ? `Outstanding! You're in the top 10% of volunteers with ${kpis.totalHours} hours. Your focus on ${sdgDistribution[0]?.name || 'sustainable development'} is making real change.`
                  : kpis.totalHours > 20
                  ? `Great progress! With ${kpis.totalHours} hours logged across ${kpis.sdgsContributed} SDGs, you're building momentum.`
                  : `Welcome! Start your impact journey by joining projects aligned with your skills and interests.`
                }
              </p>
            </div>

            <Button
              onClick={() => navigate(`/impact-report/${userId}`)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Full Impact Report
            </Button>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-4 space-y-4 pb-24">
            {/* Profile Header */}
            <div className="text-center py-4">
              <Avatar className="w-20 h-20 mx-auto border-4 border-amber-400">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback className="bg-[#16213e] text-white text-2xl">
                  {(volunteerProfile?.volunteer_name || user?.displayName || 'V').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-white text-xl font-bold mt-3">{volunteerProfile?.volunteer_name || user?.displayName || 'Volunteer'}</h2>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              {volunteerProfile?.professional_title && (
                <p className="text-emerald-400 text-sm mt-1">{volunteerProfile.professional_title}</p>
              )}
            </div>

            {/* Quick Stats */}
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

            {/* Location & Availability */}
            <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Location & Availability
              </h3>
              <div className="space-y-2 text-sm">
                {(volunteerProfile?.location || user?.location) && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{volunteerProfile?.location || user?.location}</span>
                  </div>
                )}
                {volunteerProfile?.weekly_availability && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{volunteerProfile.weekly_availability} hours/week available</span>
                  </div>
                )}
                {volunteerProfile?.preferred_work_style && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <span>{volunteerProfile.preferred_work_style === 'remote' ? 'Remote' : volunteerProfile.preferred_work_style === 'onsite' ? 'On-site' : 'Hybrid'}</span>
                  </div>
                )}
                {volunteerProfile?.timezone && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span>{volunteerProfile.timezone}</span>
                  </div>
                )}
                {!volunteerProfile?.location && !user?.location && !volunteerProfile?.weekly_availability && (
                  <p className="text-gray-500 text-xs">Add your location and availability in settings</p>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Skills
              </h3>
              {volunteerProfile?.skills && volunteerProfile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {volunteerProfile.skills.map((skill: string, idx: number) => (
                    <span key={idx} className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs">Add skills to your profile</p>
              )}
            </div>

            {/* SDG Commitments */}
            <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-pink-400" />
                SDG Commitments
              </h3>
              {volunteerProfile?.preferred_sdgs && volunteerProfile.preferred_sdgs.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {volunteerProfile.preferred_sdgs.slice(0, 8).map((sdgNum: number) => (
                    <div
                      key={sdgNum}
                      className="rounded-lg p-2 text-center"
                      style={{ backgroundColor: SDG_COLORS[sdgNum] || '#6B7280' }}
                    >
                      <div className="text-white font-bold text-sm">SDG {sdgNum}</div>
                      <div className="text-white/80 text-[10px] leading-tight">{SDG_NAMES[sdgNum]?.split(' ').slice(0, 2).join(' ')}</div>
                    </div>
                  ))}
                </div>
              ) : sdgDistribution.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {sdgDistribution.slice(0, 4).map((sdg) => (
                    <div
                      key={sdg.sdg}
                      className="rounded-lg p-2 text-center"
                      style={{ backgroundColor: sdg.color }}
                    >
                      <div className="text-white font-bold text-sm">SDG {sdg.sdg}</div>
                      <div className="text-white/80 text-[10px] leading-tight">{sdg.name?.split(' ').slice(0, 2).join(' ')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs">Select SDGs you care about in settings</p>
              )}
            </div>

            {/* Interests */}
            {volunteerProfile?.interests && volunteerProfile.interests.length > 0 && (
              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {volunteerProfile.interests.map((interest: string, idx: number) => (
                    <span key={idx} className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {volunteerProfile?.bio && (
              <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  About Me
                </h3>
                <p className="text-gray-300 text-sm">{volunteerProfile.bio}</p>
              </div>
            )}

            <Button
              onClick={() => navigate('/volunteer-profile-settings')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3"
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
              {/* SDG Header with smaller icon */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: SDG_COLORS[showSdgModal] + '20' }}>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                  style={{ backgroundColor: SDG_COLORS[showSdgModal] }}
                >
                  {showSdgModal}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">{SDG_NAMES[showSdgModal]}</div>
                  <div className="text-gray-400 text-xs">
                    {projects.filter((p: any) => p.sdgGoals?.includes(showSdgModal)).length} projects contributing
                  </div>
                </div>
              </div>

              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                Your Contributing Projects
              </h3>
              <div className="space-y-2">
                {projects
                  .filter((p: any) => p.sdgGoals?.includes(showSdgModal))
                  .map((project: any) => (
                    <div
                      key={project.id}
                      className="bg-[#1a1a2e] rounded-lg p-3 cursor-pointer hover:bg-[#1a1a2e]/70 border border-gray-700"
                      onClick={() => {
                        setShowSdgModal(null);
                        navigate(`/projects/${project.id}/pwa`);
                      }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-white font-medium text-sm flex-1">{project.name}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          project.status === 'Active' ? 'bg-orange-500/20 text-orange-300' :
                          project.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {project.status || 'Active'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">{project.organizationName}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{project.totalHoursLogged || 0} hrs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{project.livesTouched || 0} lives</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{project.volunteersCount || 0} volunteers</span>
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-gray-500 text-xs mt-2 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                  ))}
                {projects.filter((p: any) => p.sdgGoals?.includes(showSdgModal)).length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No projects yet for this SDG</p>
                    <p className="text-xs mt-1">Join projects to contribute to SDG {showSdgModal}</p>
                  </div>
                )}
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

      {/* Bottom Navigation - Internal Tab Switching */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#16213e] border-t border-gray-700 px-2 py-2 max-w-[428px] mx-auto z-50">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'dashboard' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            data-testid="nav-home"
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'projects' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            data-testid="nav-projects"
          >
            <Briefcase className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Projects</span>
          </button>

          <button
            onClick={() => setActiveTab('potential')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'potential' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            data-testid="nav-insights"
          >
            <Lightbulb className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('impacts')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'impacts' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            data-testid="nav-impact"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Impact</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'profile' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            data-testid="nav-profile"
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
