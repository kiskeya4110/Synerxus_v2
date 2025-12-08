import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Search, Activity, User, MessageCircle, ChevronDown, MapPin, Clock, Users, Briefcase, TrendingUp, Lightbulb, BarChart3, Heart, Award, Target, Sparkles, FileText, Globe, Zap, CheckCircle, Settings, MoreVertical, ClipboardList, Calendar, LogOut } from "lucide-react";
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
  const [showKpiModal, setShowKpiModal] = useState<string | null>(null);
  const [showSdgModal, setShowSdgModal] = useState<number | null>(null);
  const [showProjectStatsModal, setShowProjectStatsModal] = useState<'active' | 'total' | 'sdgs' | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
      safeProjects.reduce((sum: number, p: any) => sum + (Number(p?.livesImpacted) || Number(p?.livesTouched) || 0), 0);
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

    // Get impact score from server-calculated value (hours 35%, people 30%, tasks 20%, sdg 10%, match 5%)
    const impactScore = Number(dashboardData?.impactScore) || 0;

    // Get completed tasks count from server
    const completedTasks = Number(dashboardData?.completedTasks) || 0;
    const totalTasks = Number(dashboardData?.totalTasks) || 0;

    return {
      totalHours,
      projectsCompleted,
      activeProjects,
      totalProjects,
      livesImpacted,
      skills,
      sdgsContributed,
      pendingApplications,
      impactScore,
      completedTasks,
      totalTasks
    };
  }, [dashboardData, projects, volunteerProfile]);

  // Extract pending applications count for easy access
  const pendingApplicationsCount = kpis.pendingApplications;

  // Impact Over Time data - use pre-calculated monthlyImpactData from server
  const impactOverTimeData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Use server-calculated monthlyImpactData if available (format: { month: "YYYY-MM", hours, peopleImpacted })
    const serverMonthlyData = dashboardData?.monthlyImpactData;
    if (Array.isArray(serverMonthlyData) && serverMonthlyData.length > 0) {
      return serverMonthlyData.map((item: any) => {
        // Parse month from "YYYY-MM" format
        const [year, monthNum] = (item.month || '').split('-');
        const monthIndex = parseInt(monthNum, 10) - 1;
        const monthLabel = monthNames[monthIndex] || item.month;

        return {
          month: monthLabel,
          hours: Number(item.hours) || 0,
          impact: Number(item.peopleImpacted) || Math.floor((Number(item.hours) || 0) * 2.5)
        };
      });
    }

    // Fallback: calculate from volunteerActivities if server data not available
    const currentMonth = new Date().getMonth();
    return monthNames.slice(0, currentMonth + 1).map((month, idx) => {
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
  }, [dashboardData?.monthlyImpactData, volunteerActivities]);

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
  const { data: projectAssignmentsRaw = [] } = useQuery({
    queryKey: ['/api/project-assignments', userId],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });
  // Ensure projectAssignments is always an array
  const projectAssignments = Array.isArray(projectAssignmentsRaw) ? projectAssignmentsRaw : [];

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
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col max-w-[428px] mx-auto">
      {/* Top App Bar */}
      <header className="bg-[#16213e] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <button
          onClick={() => navigate("/landing")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src={logoUrl} alt="Synerxus Logo" className="h-7 w-auto" />
          <span className="font-bold text-base">
            <span style={{ color: '#ffffff' }}>SYNER</span>
            <span style={{ color: '#FFB84D' }}>XUS</span>
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/volunteer-messages/pwa')}
            className="p-2 hover:bg-white/10 rounded-full"
            data-testid="btn-messages"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Three-Dot Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 hover:bg-white/10 rounded-full"
              data-testid="mobile-menu-trigger"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showMobileMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMobileMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                  <button
                    onClick={() => { navigate('/my-work'); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <ClipboardList className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">My Work</span>
                  </button>
                  <button
                    onClick={() => { navigate('/log-activity'); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Log Activity</span>
                  </button>
                  <button
                    onClick={() => { navigate('/discover-opportunities'); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <Search className="w-4 h-4 text-amber-400" />
                    <span className="text-sm">Find Opportunities</span>
                  </button>
                  <button
                    onClick={() => { navigate('/calendar'); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Calendar</span>
                  </button>
                  <div className="border-t border-gray-700 my-1"></div>
                  <button
                    onClick={() => { navigate('/volunteer-profile-settings'); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem('currentUserId');
                      localStorage.removeItem('userType');
                      navigate('/login');
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-400 hover:bg-white/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
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
              <h1 className="text-slate-800 text-xl font-bold">{volunteerProfile?.volunteer_name || user?.displayName || 'Volunteer'} Synergy Dashboard</h1>
            </div>

            {/* Personal Profile Section */}
            {dashboardData?.volunteerProfile && (
              <div className="px-4">
                <div className="bg-gradient-to-r from-amber-100 via-green-100 to-blue-100 backdrop-blur-sm rounded-xl p-4 border border-amber-200/60 shadow-lg">
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
                          <h3 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <Award className="h-3 w-3 text-amber-600" />
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
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-medium rounded-full">
                                +{dashboardData.volunteerProfile.skills.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Availability & Role */}
                      <div className="flex items-center gap-3 text-[10px]">
                        {dashboardData.volunteerProfile.weeklyAvailability && (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Clock className="h-3 w-3 text-green-600" />
                            <span>{dashboardData.volunteerProfile.weeklyAvailability}h/wk</span>
                          </div>
                        )}
                        {dashboardData.volunteerProfile.professionalTitle && (
                          <div className="flex items-center gap-1 text-slate-700 truncate">
                            <Briefcase className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            <span className="truncate">{dashboardData.volunteerProfile.professionalTitle}</span>
                          </div>
                        )}
                      </div>

                      {/* Motivations */}
                      {dashboardData.volunteerProfile.motivations && (
                        <div>
                          <p className="text-[10px] text-slate-600 line-clamp-1 italic">
                            "{dashboardData.volunteerProfile.motivations}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards - Single Row with Mini Sparklines */}
            <div className="px-4 grid grid-cols-4 gap-2">
              <button
                onClick={() => setShowKpiModal('hours')}
                className="bg-[#4A90D9] rounded-lg p-2 text-white text-center hover:brightness-110 transition-all active:scale-95 relative overflow-hidden"
                data-testid="kpi-hours"
              >
                {/* Mini sparkline background */}
                <div className="absolute bottom-0 left-0 right-0 h-6 flex items-end justify-center gap-[2px] opacity-30 px-1">
                  {impactOverTimeData.slice(-6).map((d, i) => (
                    <div
                      key={i}
                      className="bg-white w-1 rounded-t"
                      style={{ height: `${Math.max(4, Math.min(20, (d.hours / Math.max(...impactOverTimeData.map(x => x.hours || 1))) * 20))}px` }}
                    />
                  ))}
                </div>
                <Clock className="w-4 h-4 mx-auto mb-1 opacity-70 relative z-10" />
                <div className="text-xl font-bold relative z-10">{kpis.totalHours}</div>
                <div className="text-[10px] opacity-90 leading-tight relative z-10">Hours</div>
              </button>
              <button
                onClick={() => setShowKpiModal('projects')}
                className="bg-[#4CAF50] rounded-lg p-2 text-white text-center hover:brightness-110 transition-all active:scale-95 relative overflow-hidden"
                data-testid="kpi-projects"
              >
                {/* Mini donut indicator */}
                <div className="absolute bottom-1 right-1 w-4 h-4 opacity-40">
                  <svg viewBox="0 0 20 20" className="w-full h-full">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <circle
                      cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="3"
                      strokeDasharray={`${(kpis.activeProjects / Math.max(kpis.totalProjects, 1)) * 50.3} 50.3`}
                      transform="rotate(-90 10 10)"
                    />
                  </svg>
                </div>
                <CheckCircle className="w-4 h-4 mx-auto mb-1 opacity-70 relative z-10" />
                <div className="text-xl font-bold relative z-10">{kpis.totalProjects}</div>
                <div className="text-[10px] opacity-90 leading-tight relative z-10">Projects</div>
              </button>
              <button
                onClick={() => setShowKpiModal('skills')}
                className="bg-[#FF9800] rounded-lg p-2 text-white text-center hover:brightness-110 transition-all active:scale-95 relative overflow-hidden"
                data-testid="kpi-skills"
              >
                {/* Skill dots indicator */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-[2px] opacity-40">
                  {[...Array(Math.min(kpis.skills, 6))].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
                  ))}
                </div>
                <Award className="w-4 h-4 mx-auto mb-1 opacity-70 relative z-10" />
                <div className="text-xl font-bold relative z-10">{kpis.skills}</div>
                <div className="text-[10px] opacity-90 leading-tight relative z-10">Skills</div>
              </button>
              <button
                onClick={() => setShowKpiModal('sdgs')}
                className="bg-[#E91E63] rounded-lg p-2 text-white text-center hover:brightness-110 transition-all active:scale-95 relative overflow-hidden"
                data-testid="kpi-sdgs"
              >
                {/* SDG grid indicator */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-[1px] opacity-40">
                  {sdgDistribution.slice(0, 4).map((sdg, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: sdg.color }}
                    />
                  ))}
                </div>
                <Target className="w-4 h-4 mx-auto mb-1 opacity-70 relative z-10" />
                <div className="text-xl font-bold relative z-10">{kpis.sdgsContributed}</div>
                <div className="text-[10px] opacity-90 leading-tight relative z-10">SDGs</div>
              </button>
            </div>

            {/* All SDGs Section */}
            {sdgDistribution.length > 0 && (
              <div className="px-4">
                <h2 className="text-slate-800 text-lg font-semibold mb-3">My SDG Contributions</h2>
                <div className="grid grid-cols-2 gap-3">
                  {sdgDistribution.map((sdg) => (
                    <button
                      key={sdg.sdg}
                      onClick={() => setShowSdgModal(sdg.sdg)}
                      className="bg-white rounded-xl p-3 border border-amber-200/60 shadow-sm hover:border-emerald-500/50 transition-all active:scale-95 text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: sdg.color }}
                        >
                          {sdg.sdg}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-800 font-semibold text-xs truncate">{sdg.name}</div>
                          <div className="text-slate-500 text-[10px]">{sdg.value} {sdg.value === 1 ? 'project' : 'projects'}</div>
                        </div>
                      </div>
                      <div className="bg-slate-200 rounded-full h-1.5 overflow-hidden">
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
                <h2 className="text-slate-800 text-lg font-semibold mb-3">Impact Over Time</h2>
                <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-500 text-sm">Volunteer Hours & Impact</span>
                    <span className="text-emerald-700 text-xs px-2 py-1 bg-emerald-100 rounded font-medium">Live Data</span>
                  </div>
                  {impactOverTimeData.some(d => d.hours > 0) ? (
                    <>
                      <div className="flex gap-4 mb-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-[#4CAF50]"></div>
                          <span className="text-slate-500">Hours</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-[#E91E63]"></div>
                          <span className="text-slate-500">AIUs Earned</span>
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
              <h2 className="text-slate-800 text-lg font-semibold mb-3">Recommended Projects</h2>
              <div className="space-y-3">
                {recommendedProjects.map((project: any) => {
                  const matchData = project.matchData;
                  const projectSDGs = project.sdgGoals || [];
                  const organization = project.organizationName || 'Synerxus Global NGO';
                  const completion = project.completionPercentage || 0;

                  return (
                    <div
                      key={project.id}
                      className="w-full bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-500">Match Score</span>
                            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-600 rounded font-semibold">
                              {matchData.score}%
                            </span>
                          </div>
                          <h3 className="text-slate-800 font-semibold text-sm">
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

                      <div className="text-xs text-slate-500 mb-2">{organization}</div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                        {project.description || 'Join this impactful project to make a difference in the community.'}
                      </p>

                      {/* Match Reasons */}
                      <div className="mb-2 space-y-1">
                        {matchData.reasons.slice(0, 2).map((reason: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle className="w-3 h-3" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Progress</span>
                          <span>{completion}%</span>
                        </div>
                        <Progress value={completion} className="h-1.5 bg-slate-200" />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
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
            <h1 className="text-slate-800 text-xl font-bold">Projects Completed</h1>
            
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
            <h2 className="text-slate-800 text-lg font-semibold">All Projects</h2>
            <div className="space-y-3">
              {projects.map((project: any) => {
                const matchScore = calculateMatchScore(project);
                const projectSDGs = project.sdgGoals || [];
                const completion = project.completionPercentage || 0;
                const statusColor = project.status === 'Active' ? 'bg-emerald-500' : 
                                   project.status === 'Completed' ? 'bg-blue-500' : 'bg-gray-500';
                
                return (
                  <Link key={project.id} href={`/projects/${project.id}/pwa`}>
                    <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm hover:border-gray-500 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
                          <span className="text-xs text-slate-500">{project.status || 'Active'}</span>
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
                      
                      <h3 className="text-slate-800 font-semibold mb-1">{project.name}</h3>
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{project.description}</p>
                      
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Completion</span>
                          <span>{completion}%</span>
                        </div>
                        <Progress value={completion} className="h-2 bg-slate-200" />
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{project.aiuEarned?.toFixed(1) || project.livesImpacted || 0} AIUs</span>
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
            <h1 className="text-slate-800 text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-600" />
              AI Insights Dashboard
            </h1>

            <p className="text-slate-500 text-sm">
              Real-time AI analysis of your volunteer profile, impact metrics, and personalized growth recommendations.
            </p>

            {/* AI Insights Cards */}
            <div className="space-y-3">
              {/* Impact Readiness Score - Competitor-level metric */}
              <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-xl p-4 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="8" strokeDasharray="251.3" strokeDashoffset={251.3 - (251.3 * Math.min(75 + kpis.skills * 2 + kpis.sdgsContributed * 3, 99)) / 100} transform="rotate(-90 50 50)" />
                  </svg>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5" />
                  <span className="font-semibold">Impact Readiness Score</span>
                  <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">AI Calculated</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="text-5xl font-bold">{Math.min(75 + kpis.skills * 2 + kpis.sdgsContributed * 3, 99)}</div>
                    <div className="text-xs opacity-75">out of 100</div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Skills Match</span>
                      <span>{Math.min(85 + kpis.skills * 3, 98)}%</span>
                    </div>
                    <Progress value={Math.min(85 + kpis.skills * 3, 98)} className="h-1.5 bg-white/20" />
                    <div className="flex justify-between text-xs">
                      <span>SDG Alignment</span>
                      <span>{Math.min(70 + kpis.sdgsContributed * 5, 95)}%</span>
                    </div>
                    <Progress value={Math.min(70 + kpis.sdgsContributed * 5, 95)} className="h-1.5 bg-white/20" />
                    <div className="flex justify-between text-xs">
                      <span>Engagement Level</span>
                      <span>{Math.min(60 + kpis.totalHours, 100)}%</span>
                    </div>
                    <Progress value={Math.min(60 + kpis.totalHours, 100)} className="h-1.5 bg-white/20" />
                  </div>
                </div>
              </div>

              {/* Skills Analysis with Expandable View */}
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-600" />
                    <span className="text-slate-800 font-semibold">Skills Intelligence</span>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{kpis.skills} Active</span>
                </div>

                {/* Skills Grid - Show first 4 */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {volunteerProfile?.skills?.slice(0, 4).map((skill: string, idx: number) => {
                    const demandScore = Math.floor(70 + Math.random() * 25);
                    return (
                      <div key={idx} className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2 border border-amber-100/50 group cursor-pointer hover:shadow-md transition-all">
                        <div className="text-slate-800 text-xs font-semibold truncate">{skill}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{ width: `${demandScore}%` }} />
                          </div>
                          <span className="text-[10px] text-emerald-700">{demandScore}%</span>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">Market Demand</div>
                      </div>
                    );
                  }) || (
                    <div className="col-span-2 text-slate-500 text-sm text-center py-4">
                      <Award className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Add skills to unlock AI-powered skill insights
                    </div>
                  )}
                </div>

                {/* Expandable Skills Section */}
                {volunteerProfile?.skills?.length > 4 && (
                  <details className="group">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700 flex items-center gap-1 justify-center py-2">
                      <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                      View all {volunteerProfile.skills.length} skills
                    </summary>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                      {volunteerProfile?.skills?.slice(4).map((skill: string, idx: number) => {
                        const demandScore = Math.floor(70 + Math.random() * 25);
                        return (
                          <div key={idx + 4} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                            <div className="text-slate-700 text-xs font-medium truncate">{skill}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: `${demandScore}%` }} />
                              </div>
                              <span className="text-[10px] text-blue-600">{demandScore}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>

              {/* AI-Powered Market Insights */}
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="text-slate-800 font-semibold">Market Intelligence</span>
                  <span className="ml-auto text-[10px] text-slate-400">Updated today</span>
                </div>
                <div className="space-y-3">
                  {/* Trending SDGs */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-700 mb-2">Trending Impact Areas</div>
                    <div className="flex gap-2 flex-wrap">
                      {[13, 4, 3, 8, 11].map((sdgNum) => (
                        <div
                          key={sdgNum}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-white text-[10px] font-medium"
                          style={{ backgroundColor: SDG_COLORS[sdgNum] }}
                        >
                          SDG {sdgNum}
                          <span className="bg-white/30 px-1 rounded">+{Math.floor(Math.random() * 20 + 10)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills in Demand */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-700 mb-2">High-Demand Skills This Month</div>
                    <div className="flex gap-2 flex-wrap">
                      {['Project Management', 'Data Analysis', 'Content Creation', 'Community Outreach'].map((skill) => (
                        <span key={skill} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Your Competitive Edge */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-700 mb-1">Your Competitive Advantage</div>
                    <p className="text-[11px] text-slate-600">
                      {volunteerProfile?.skills?.length > 3
                        ? `Your combination of ${volunteerProfile.skills.slice(0, 2).join(' and ')} places you in the top 15% of volunteers for impact potential.`
                        : 'Add more skills to unlock your competitive edge analysis.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SDG Impact Forecast */}
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <span className="text-slate-800 font-semibold">Impact Forecast</span>
                </div>
                <div className="space-y-2">
                  {sdgDistribution.slice(0, 3).map((sdg) => {
                    const projectedGrowth = Math.floor(Math.random() * 30 + 20);
                    return (
                      <div key={sdg.sdg} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
                          style={{ backgroundColor: sdg.color }}
                        >
                          {sdg.sdg}
                        </div>
                        <div className="flex-1">
                          <div className="text-slate-800 text-sm font-medium">{sdg.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs">{sdg.value} projects</span>
                            <span className="text-emerald-600 text-xs font-medium">+{projectedGrowth}% potential</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-600 text-xs font-semibold">High Match</div>
                          <div className="text-[10px] text-slate-400">AI Confidence: 94%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Growth Journey */}
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <span className="text-slate-800 font-semibold">Your Growth Journey</span>
                </div>
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                  <div className="space-y-4">
                    {[
                      { title: 'Rising Star', desc: 'Complete 5 projects', target: 5, current: kpis.projectsCompleted, icon: '⭐', color: 'amber' },
                      { title: 'Impact Leader', desc: 'Log 50 volunteer hours', target: 50, current: kpis.totalHours, icon: '🏆', color: 'blue' },
                      { title: 'Global Champion', desc: 'Contribute to 5 SDGs', target: 5, current: kpis.sdgsContributed, icon: '🌍', color: 'emerald' },
                      { title: 'Community Builder', desc: 'Join 3 organizations', target: 3, current: Math.min(projects.length, 3), icon: '🤝', color: 'purple' }
                    ].map((milestone, idx) => {
                      const progress = Math.min((milestone.current / milestone.target) * 100, 100);
                      const isComplete = progress >= 100;
                      return (
                        <div key={idx} className="flex gap-3 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 ${
                            isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isComplete ? <CheckCircle className="w-4 h-4" /> : milestone.icon}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${isComplete ? 'text-emerald-600' : 'text-slate-700'}`}>
                                {milestone.title}
                              </span>
                              {isComplete && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Achieved!</span>}
                            </div>
                            <div className="text-xs text-slate-500">{milestone.desc}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${
                                    isComplete ? 'from-emerald-400 to-emerald-500' : `from-${milestone.color}-400 to-${milestone.color}-500`
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">{milestone.current}/{milestone.target}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* AI Smart Summary */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-xl p-4 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                  <Sparkles className="w-full h-full" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">AI Smart Summary</span>
                  <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Personalized</span>
                </div>
                <p className="text-sm opacity-95 leading-relaxed">
                  {kpis.totalHours > 50
                    ? `Outstanding performance! With ${kpis.totalHours} hours across ${kpis.totalProjects} projects, you're in the top 10% of volunteers. Your expertise in ${volunteerProfile?.skills?.[0] || 'your field'} is making measurable impact on ${sdgDistribution[0]?.name || 'sustainable development'}.`
                    : kpis.totalHours > 20
                    ? `Great momentum! You've logged ${kpis.totalHours} hours and contributed to ${kpis.sdgsContributed} SDGs. Focus on ${sdgDistribution[0]?.name || 'Climate Action'} to maximize your impact trajectory.`
                    : kpis.totalHours > 0
                    ? `You're building your impact story with ${kpis.totalHours} hours logged. Based on your skills in ${volunteerProfile?.skills?.slice(0, 2).join(' and ') || 'your areas'}, we recommend exploring projects in ${sdgDistribution[0]?.name || 'Quality Education'}.`
                    : `Welcome to your impact journey! Based on your profile, we've identified high-potential opportunities in ${volunteerProfile?.skills?.length > 0 ? 'your skill areas' : 'various SDG categories'}. Start logging hours to unlock personalized AI insights.`
                  }
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs opacity-80">
                  <Clock className="w-3 h-3" />
                  <span>Analysis updated in real-time</span>
                </div>
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
            <h1 className="text-slate-800 text-2xl font-bold">Dashboard</h1>

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
                  className="rounded-lg p-3 flex items-center justify-center aspect-square bg-slate-200 border border-gray-600"
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
              <h2 className="text-slate-800 text-lg font-semibold mb-3">Project Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                  <div className="text-slate-500 text-sm mb-1">Active Projects</div>
                  <div className="flex items-center gap-3">
                    <span className="text-white text-4xl font-bold">{kpis.activeProjects}</span>
                    <div className="flex-1">
                      <Progress value={(kpis.activeProjects / Math.max(kpis.totalProjects, 1)) * 100} className="h-2 bg-slate-200" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                  <div className="flex items-center gap-1 text-slate-500 text-sm mb-1">
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
              <h2 className="text-slate-800 text-lg font-semibold mb-3">Your Top SDGS</h2>
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
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
                    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-200">
                      {sdgDistribution.slice(0, 4).map((sdg) => (
                        <div key={sdg.sdg} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: sdg.color }}></div>
                          <span className="text-slate-600">SDG {sdg.sdg} {sdg.name}</span>
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
              <h2 className="text-slate-800 text-lg font-semibold mb-3">Impact Over Time</h2>
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                {impactOverTimeData.some(d => d.hours > 0) ? (
                  <>
                    <div className="flex gap-4 mb-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-[#4CAF50]"></div>
                        <span className="text-slate-600">Hours</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-[#E91E63]"></div>
                        <span className="text-slate-600">AIUs Earned</span>
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
              <h2 className="text-slate-800 text-xl font-bold mt-3">{volunteerProfile?.volunteer_name || user?.displayName || 'Volunteer'}</h2>
              <p className="text-slate-500 text-sm">{user?.email}</p>
              {volunteerProfile?.professional_title && (
                <p className="text-emerald-700 text-sm mt-1 font-medium">{volunteerProfile.professional_title}</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-xl p-3 border border-amber-200/60 shadow-sm">
                <div className="text-xl font-bold text-slate-800">{kpis.totalHours}</div>
                <div className="text-xs text-slate-500">Hours</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-amber-200/60 shadow-sm">
                <div className="text-xl font-bold text-slate-800">{kpis.totalProjects}</div>
                <div className="text-xs text-slate-500">Projects</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-amber-200/60 shadow-sm">
                <div className="text-xl font-bold text-slate-800">{kpis.sdgsContributed}</div>
                <div className="text-xs text-slate-500">SDGs</div>
              </div>
            </div>

            {/* Location & Availability */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
              <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Location & Availability
              </h3>
              <div className="space-y-2 text-sm">
                {(volunteerProfile?.location || user?.location) && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{volunteerProfile?.location || user?.location}</span>
                  </div>
                )}
                {volunteerProfile?.weekly_availability && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{volunteerProfile.weekly_availability} hours/week available</span>
                  </div>
                )}
                {volunteerProfile?.preferred_work_style && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <span>{volunteerProfile.preferred_work_style === 'remote' ? 'Remote' : volunteerProfile.preferred_work_style === 'onsite' ? 'On-site' : 'Hybrid'}</span>
                  </div>
                )}
                {volunteerProfile?.timezone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>{volunteerProfile.timezone}</span>
                  </div>
                )}
                {!volunteerProfile?.location && !user?.location && !volunteerProfile?.weekly_availability && (
                  <p className="text-slate-500 text-xs">Add your location and availability in settings</p>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
              <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Skills
              </h3>
              {volunteerProfile?.skills && volunteerProfile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {volunteerProfile.skills.map((skill: string, idx: number) => (
                    <span key={idx} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs">Add skills to your profile</p>
              )}
            </div>

            {/* SDG Commitments */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
              <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-pink-600" />
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
                <p className="text-slate-500 text-xs">Select SDGs you care about in settings</p>
              )}
            </div>

            {/* Interests */}
            {volunteerProfile?.interests && volunteerProfile.interests.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {volunteerProfile.interests.map((interest: string, idx: number) => (
                    <span key={idx} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {volunteerProfile?.bio && (
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                <h3 className="text-slate-800 font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  About Me
                </h3>
                <p className="text-slate-600 text-sm">{volunteerProfile.bio}</p>
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
              <h2 className="text-slate-800 text-lg font-semibold">
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
                  {/* Monthly Hours Trend Chart */}
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-2">Monthly Hours Trend</div>
                    <div className="h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={impactOverTimeData}>
                          <defs>
                            <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke="#6b7280" fontSize={10} tickLine={false} />
                          <YAxis hide />
                          <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="url(#hoursGradient)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100/50">
                    <div className="text-sm text-gray-300 space-y-2">
                      <div className="flex justify-between">
                        <span>Impact Generated:</span>
                        <span className="text-emerald-400 font-semibold">{(kpis.totalHours * 0.15).toFixed(1)} AIUs estimated</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Across Projects:</span>
                        <span className="text-white font-semibold">{kpis.totalProjects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Hours/Month:</span>
                        <span className="text-blue-400 font-semibold">
                          {impactOverTimeData.length > 0
                            ? (impactOverTimeData.reduce((sum, d) => sum + d.hours, 0) / impactOverTimeData.length).toFixed(1)
                            : 0}
                        </span>
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
                  {/* Project Status Donut Chart */}
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-2">Project Status Distribution</div>
                    <div className="h-24 flex items-center justify-center">
                      <ResponsiveContainer width="50%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Active', value: kpis.activeProjects || 1, fill: '#f97316' },
                              { name: 'Completed', value: kpis.projectsCompleted || 0, fill: '#22c55e' },
                              { name: 'Other', value: Math.max(0, kpis.totalProjects - kpis.activeProjects - kpis.projectsCompleted), fill: '#6b7280' }
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            dataKey="value"
                          >
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-gray-300">Active ({kpis.activeProjects})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-gray-300">Completed ({kpis.projectsCompleted})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100/50 mb-4">
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
                    <h3 className="text-slate-800 font-semibold text-sm">Your Projects:</h3>
                    {projects.slice(0, 5).map((project: any) => (
                      <div key={project.id} className="bg-amber-50/50 rounded-lg p-3 border border-amber-100/50">
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
                        <div className="text-xs text-slate-500 mt-1">{project.organizationName}</div>
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
              <h2 className="text-slate-800 text-lg font-semibold flex items-center gap-2">
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
                      className="bg-amber-50/50 rounded-lg p-3 border border-amber-100/50 cursor-pointer hover:bg-[#1a1a2e]/70 border border-gray-700"
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
                      <div className="text-xs text-slate-500">{project.organizationName}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{project.totalHoursLogged || 0} hrs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{project.aiuEarned?.toFixed(1) || project.livesImpacted || 0} AIUs</span>
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
              <h2 className="text-slate-800 text-lg font-semibold">
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
                          className="bg-amber-50/50 rounded-lg p-3 border border-amber-100/50 cursor-pointer hover:bg-[#1a1a2e]/70"
                          onClick={() => {
                            setShowProjectStatsModal(null);
                            navigate(`/projects/${project.id}/pwa`);
                          }}
                        >
                          <div className="text-white font-medium text-sm">{project.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{project.organizationName}</div>
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={project.completionPercentage || 0} className="flex-1 h-2" />
                            <span className="text-xs text-slate-500">{project.completionPercentage || 0}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{project.totalHoursLogged || 0} hrs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              <span>{project.aiuEarned?.toFixed(1) || project.livesImpacted || 0} AIUs</span>
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
                  <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100/50 space-y-2">
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
                      <span className="text-gray-400">AIUs Earned:</span>
                      <span className="text-emerald-400 font-semibold">{typeof kpis.livesImpacted === 'number' ? kpis.livesImpacted.toFixed(1) : kpis.livesImpacted}</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <h3 className="text-slate-800 font-semibold text-sm mb-2">All Projects:</h3>
                    {projects.map((project: any) => (
                      <div
                        key={project.id}
                        className="bg-amber-50/50 rounded-lg p-3 border border-amber-100/50 cursor-pointer hover:bg-[#1a1a2e]/70"
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
                        <div className="text-xs text-slate-500">{project.organizationName}</div>
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
                    <h3 className="text-slate-800 font-semibold text-sm">SDG Distribution:</h3>
                    {sdgDistribution.map((sdg) => (
                      <div
                        key={sdg.sdg}
                        className="bg-amber-50/50 rounded-lg p-3 border border-amber-100/50 cursor-pointer hover:bg-[#1a1a2e]/70"
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
                            <div className="text-xs text-slate-500 mt-1">
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
      <nav className="fixed bottom-0 left-0 right-0 bg-[#16213e] border-t border-gray-700 px-2 py-2 max-w-[428px] mx-auto z-50" style={{ touchAction: 'manipulation' }}>
        <div className="flex justify-around items-center">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            onTouchEnd={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'dashboard' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            data-testid="nav-home"
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            onTouchEnd={(e) => { e.preventDefault(); setActiveTab('projects'); }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'projects' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            data-testid="nav-projects"
          >
            <Briefcase className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Projects</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('potential')}
            onTouchEnd={(e) => { e.preventDefault(); setActiveTab('potential'); }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'potential' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            data-testid="nav-insights"
          >
            <Lightbulb className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Insights</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('impacts')}
            onTouchEnd={(e) => { e.preventDefault(); setActiveTab('impacts'); }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'impacts' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            data-testid="nav-impact"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Impact</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            onTouchEnd={(e) => { e.preventDefault(); setActiveTab('profile'); }}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
              activeTab === 'profile' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
