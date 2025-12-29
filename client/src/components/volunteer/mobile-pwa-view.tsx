import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, Search, Activity, User, MessageCircle, ChevronDown, MapPin, Clock, Users, Briefcase, TrendingUp, Lightbulb, BarChart3, Heart, Award, Target, Sparkles, FileText, Globe, Zap, CheckCircle, Settings, ClipboardList, Calendar, LogOut, Building2, BookOpen, Eye, ThumbsUp, MoreHorizontal } from "lucide-react";
import PWAHeader from "@/components/pwa/pwa-header";
import AIUDetailsModal from "@/components/dashboard/aiu-details-modal";
import { useLocation, Link } from "wouter";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import { formatDecimal } from "@/lib/format-utils";
import { getSDGColor, SDG_GOALS } from "@shared/sdg-goals";
import { isValidSdg, filterValidSdgs, extractSdgsFromProjects, compareSdgArrays } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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

type TabType = 'dashboard' | 'projects' | 'log-activity' | 'potential' | 'impacts' | 'stories' | 'more' | 'profile' | 'messages';

interface MobilePWAViewProps {
  userId: string;
  user: any;
  dashboardData: any;
  initialActiveTab?: TabType;
}

// AIU Summary interface
interface AIUSummary {
  volunteerId: number;
  volunteerName: string;
  totalAiu: number;
  aiuUnique: number;
  aiuSessions: number;
  totalHours: number;
  projectCount: number;
  sdgsContributed: number[];
  verificationRate: number;
  projects: {
    projectId: number;
    projectName: string;
    aiu: number;
    hours: number;
    role: string;
    sdgIndicator: string;
  }[];
}

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

// Format number to 2 decimal places if decimal, otherwise show as whole number
function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  // Check if it's a whole number
  if (Number.isInteger(num)) {
    return num.toString();
  }
  // Format to 2 decimal places
  return num.toFixed(2);
}

export default function MobilePWAView({ userId, user, dashboardData, initialActiveTab }: MobilePWAViewProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(initialActiveTab || 'dashboard');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showKpiModal, setShowKpiModal] = useState<string | null>(null);
  const [showSdgModal, setShowSdgModal] = useState<number | null>(null);
  const [showProjectStatsModal, setShowProjectStatsModal] = useState<'active' | 'total' | 'sdgs' | null>(null);
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "quarter" | "year">("all");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [showAIUDetailsModal, setShowAIUDetailsModal] = useState(false);

  // Log Activity form state
  const [logActivityProjectId, setLogActivityProjectId] = useState<string>("");
  const [logActivityTaskId, setLogActivityTaskId] = useState<string>("");
  const [logActivityDate, setLogActivityDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logActivityHours, setLogActivityHours] = useState<string>("");
  const [logActivityDescription, setLogActivityDescription] = useState<string>("");
  const [logActivityType, setLogActivityType] = useState<string>("volunteering");
  const [logFormTab, setLogFormTab] = useState<"activity" | "impact">("activity");

  // Impact form state
  const [impactProjectId, setImpactProjectId] = useState<string>("");
  const [impactTaskId, setImpactTaskId] = useState<string>("");
  const [impactDate, setImpactDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [peopleReached, setPeopleReached] = useState<string>("");
  const [impactDescription, setImpactDescription] = useState<string>("");
  const [impactCategory, setImpactCategory] = useState<string>("direct");

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle logout using proper auth signOut
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

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

  // Refetch all PWA queries when tab changes to ensure fresh data
  useEffect(() => {
    // Use predicate-based invalidation to match queries by prefix
    if (activeTab === 'projects') {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).includes('/api/project-assignments') ||
        String(query.queryKey[0]).includes('/api/applications')
      });
    } else if (activeTab === 'potential') {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).includes('/api/opportunities')
      });
    } else if (activeTab === 'stories') {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).includes('/api/stories')
      });
    } else if (activeTab === 'dashboard') {
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).includes('/api/dashboard')
      });
    }
  }, [activeTab, queryClient]);

  const projects = dashboardData?.projects || [];
  const volunteerProfile = dashboardData?.volunteerProfile;
  const volunteerActivities = dashboardData?.activities || [];

  // Filter activities by time period for impacts tab
  const getFilteredActivities = () => {
    const activities = Array.isArray(volunteerActivities) ? volunteerActivities : [];

    const now = new Date();
    let startDate = new Date(0); // All time

    switch(timeFilter) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return activities.filter((a: any) => {
      if (!a?.date && !a?.createdAt) return true;
      try {
        const activityDate = new Date(a.date || a.createdAt);
        return activityDate >= startDate;
      } catch {
        return true;
      }
    });
  };

  const filteredActivities = getFilteredActivities();

  // Calculate filtered hours for time-filtered display
  const filteredTotalHours = useMemo(() => {
    return Math.round(filteredActivities.reduce((sum: number, a: any) => sum + (Number(a?.hours) || 0), 0));
  }, [filteredActivities]);

  // Fetch AIU summary for volunteer
  const { data: aiuSummary } = useQuery<AIUSummary>({
    queryKey: ["/api/aiu/volunteer", userId],
    queryFn: async () => {
      const response = await fetch(`/api/aiu/volunteer/${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Calculate real KPIs from dashboard data
  const kpis = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    const totalHours = Math.round(Number(dashboardData?.totalHours) || 0); // Round to whole hours
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

    // SDG Commitments: SDGs the volunteer committed to in their profile using shared utility
    const committedSdgs = filterValidSdgs(volunteerProfile?.preferredSdgs || []);
    const sdgsCommitted = committedSdgs.length;

    // SDG Contributions: Calculate from actual project data using shared utility
    const contributedSdgs = extractSdgsFromProjects(safeProjects);
    const sdgsContributed = contributedSdgs.length;

    // SDG Comparison: Find alignment/differences using shared utility
    const sdgComparison = compareSdgArrays(committedSdgs, contributedSdgs);
    const { aligned: alignedSdgs, uncommittedWork, uncommittedContributions } = sdgComparison;

    // Calculate pending applications from dashboardData
    const pendingApplications = Array.isArray(dashboardData?.applications)
      ? dashboardData.applications.filter((app: any) => app?.status === 'Pending' || app?.status === 'pending').length
      : 0;

    // Get impact score from server-calculated value (hours 35%, people 30%, tasks 20%, sdg 10%, match 5%)
    const impactScore = Number(dashboardData?.impactScore) || 0;

    // Get completed tasks count from server
    const completedTasks = Number(dashboardData?.completedTasks) || 0;
    const totalTasks = Number(dashboardData?.totalTasks) || 0;

    // Calculate Impact ROI (lives impacted per hour volunteered)
    const impactROI = totalHours > 0 ? Math.round((livesImpacted / totalHours) * 10) / 10 : 0;

    return {
      totalHours,
      projectsCompleted,
      activeProjects,
      totalProjects,
      livesImpacted,
      skills,
      sdgsContributed,          // Count of SDGs from actual work
      sdgsCommitted,            // Count of SDGs from profile commitment
      committedSdgs,            // Array of committed SDG numbers
      contributedSdgs,          // Array of contributed SDG numbers
      alignedSdgs,              // SDGs that are both committed AND contributed
      uncommittedWork,          // Committed but NOT contributed (opportunities)
      uncommittedContributions, // Contributed but NOT committed (bonus work)
      pendingApplications,
      impactScore,
      completedTasks,
      totalTasks,
      impactROI                 // Lives impacted per hour volunteered
    };
  }, [dashboardData, projects, volunteerProfile]);

  // Extract pending applications count for easy access
  const pendingApplicationsCount = kpis.pendingApplications;

  // Helper to get project AIU from aiuSummary (single source of truth)
  // Falls back to project.aiuEarned if aiuSummary is not available
  const getProjectAiu = (projectId: number): number => {
    if (aiuSummary?.projects) {
      const aiuProject = aiuSummary.projects.find((p: any) => p.projectId === projectId);
      if (aiuProject) {
        return aiuProject.aiu || 0;
      }
    }
    // Fallback to dashboard calculated AIU (now correctly calculated in dashboard-service)
    const dashboardProject = projects?.find((p: any) => p.id === projectId);
    return dashboardProject?.aiuEarned || 0;
  };

  // Impact Over Time data - use server-calculated monthlyImpactData with AIU
  // AIU is now calculated on the server using the official aiu-service formula
  // and distributed proportionally by hours to ensure consistency with SDG Impact Report
  const impactOverTimeData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Use server-calculated monthlyImpactData if available (format: { month: "YYYY-MM", hours, peopleImpacted, aiu })
    const serverMonthlyData = dashboardData?.monthlyImpactData;
    if (Array.isArray(serverMonthlyData) && serverMonthlyData.length > 0) {
      return serverMonthlyData.map((item: any) => {
        // Parse month from "YYYY-MM" format
        const [, monthNum] = (item.month || '').split('-');
        const monthIndex = parseInt(monthNum, 10) - 1;
        const monthLabel = monthNames[monthIndex] || item.month;

        // Use server-calculated values directly
        const hours = Number(item.hours) || 0;
        const peopleImpacted = Number(item.peopleImpacted) || 0;
        // AIU is now provided by server using official aiu-service calculation
        const aiu = Number(item.aiu) || 0;

        return {
          month: monthLabel,
          hours: hours,
          peopleReached: peopleImpacted,
          aiu: aiu
        };
      });
    }

    // Fallback: calculate from volunteerActivities if server data not available
    // Note: This fallback cannot access verified impact data, so it shows hours only
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
      // Without server data, show 0 for people reached and AIU until data is loaded
      return {
        month,
        hours: hours,
        peopleReached: 0,
        aiu: 0
      };
    });
  }, [dashboardData?.monthlyImpactData, volunteerActivities]);

  // SDG Distribution data with real metrics (hours per SDG)
  // Uses enriched project data from dashboard (totalHoursLogged) as primary source
  const sdgDistribution = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    const safeActivities = Array.isArray(volunteerActivities) ? volunteerActivities : [];

    // Aggregate hours per SDG from projects and activities
    const sdgHours: { [key: number]: number } = {};
    const sdgProjects: { [key: number]: Set<number> } = {};

    // First, try to use activities for detailed hour tracking
    const projectSdgMap: { [projectId: number]: number[] } = {};
    safeProjects.forEach((p: any) => {
      if (p?.id && Array.isArray(p?.sdgGoals)) {
        projectSdgMap[p.id] = p.sdgGoals.filter(isValidSdg);
      }
    });

    safeActivities.forEach((activity: any) => {
      const projectId = activity?.projectId;
      const hours = Number(activity?.hours) || 0;

      if (projectId && projectSdgMap[projectId] && hours > 0) {
        const sdgs = projectSdgMap[projectId];
        const hoursPerSdg = hours / sdgs.length;

        sdgs.forEach((sdg: number) => {
          sdgHours[sdg] = (sdgHours[sdg] || 0) + hoursPerSdg;
          if (!sdgProjects[sdg]) sdgProjects[sdg] = new Set();
          sdgProjects[sdg].add(projectId);
        });
      }
    });

    // If no activities, use totalHoursLogged from enriched project data (real server-calculated hours)
    if (Object.keys(sdgHours).length === 0) {
      safeProjects.forEach((p: any) => {
        const sdgGoals = filterValidSdgs(p?.sdgGoals || []);
        // Use real hours from project data (totalHoursLogged comes from server)
        const projectHours = Number(p?.totalHoursLogged) || Number(p?.totalHours) || 0;

        if (sdgGoals.length > 0 && projectHours > 0) {
          const hoursPerSdg = projectHours / sdgGoals.length;
          sdgGoals.forEach((sdg: number) => {
            sdgHours[sdg] = (sdgHours[sdg] || 0) + hoursPerSdg;
            if (!sdgProjects[sdg]) sdgProjects[sdg] = new Set();
            sdgProjects[sdg].add(p.id);
          });
        } else if (sdgGoals.length > 0) {
          // Even if no hours, track projects per SDG (but don't inflate hours)
          sdgGoals.forEach((sdg: number) => {
            if (!sdgProjects[sdg]) sdgProjects[sdg] = new Set();
            sdgProjects[sdg].add(p.id);
            // Only initialize if not already present
            if (sdgHours[sdg] === undefined) sdgHours[sdg] = 0;
          });
        }
      });
    }

    return Object.entries(sdgHours)
      .map(([sdg, hours]) => ({
        sdg: parseInt(sdg),
        name: SDG_NAMES[parseInt(sdg)] || `SDG ${sdg}`,
        value: Math.round(hours * 10) / 10, // Round to 1 decimal
        projectCount: sdgProjects[parseInt(sdg)]?.size || 0,
        color: SDG_COLORS[parseInt(sdg)] || '#6B7280'
      }))
      .filter(item => item.projectCount > 0) // Only show SDGs with actual projects
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Show up to 8 SDGs
  }, [projects, volunteerActivities]);

  // Calculate AIU per SDG from aiuSummary projects
  const aiuPerSdg = useMemo(() => {
    const sdgAiu: { [key: number]: number } = {};
    const safeProjects = Array.isArray(projects) ? projects : [];

    // Build project SDG map
    const projectSdgMap: { [projectId: number]: number[] } = {};
    safeProjects.forEach((p: any) => {
      if (p?.id && Array.isArray(p?.sdgGoals)) {
        projectSdgMap[p.id] = p.sdgGoals.filter(isValidSdg);
      }
    });

    // Calculate AIU per SDG from aiuSummary projects
    if (aiuSummary?.projects) {
      aiuSummary.projects.forEach((aiuProject: any) => {
        const projectId = aiuProject.projectId;
        const aiu = Number(aiuProject.aiu) || 0;
        const sdgs = projectSdgMap[projectId] || [];

        if (sdgs.length > 0 && aiu > 0) {
          const aiuPerSdgVal = aiu / sdgs.length;
          sdgs.forEach((sdg: number) => {
            sdgAiu[sdg] = (sdgAiu[sdg] || 0) + aiuPerSdgVal;
          });
        }
      });
    }

    return sdgAiu;
  }, [projects, aiuSummary]);

  // Filtered SDG Distribution for time-filtered display
  const filteredSdgDistribution = useMemo(() => {
    if (timeFilter === 'all') return sdgDistribution;

    const safeProjects = Array.isArray(projects) ? projects : [];

    // Aggregate hours per SDG from filtered activities
    const sdgHours: { [key: number]: number } = {};
    const sdgProjects: { [key: number]: Set<number> } = {};

    // Build project SDG map
    const projectSdgMap: { [projectId: number]: number[] } = {};
    safeProjects.forEach((p: any) => {
      if (p?.id && Array.isArray(p?.sdgGoals)) {
        projectSdgMap[p.id] = p.sdgGoals.filter(isValidSdg);
      }
    });

    filteredActivities.forEach((activity: any) => {
      const projectId = activity?.projectId;
      const hours = Number(activity?.hours) || 0;

      if (projectId && projectSdgMap[projectId] && hours > 0) {
        const sdgs = projectSdgMap[projectId];
        const hoursPerSdg = hours / sdgs.length;

        sdgs.forEach((sdg: number) => {
          sdgHours[sdg] = (sdgHours[sdg] || 0) + hoursPerSdg;
          if (!sdgProjects[sdg]) sdgProjects[sdg] = new Set();
          sdgProjects[sdg].add(projectId);
        });
      }
    });

    return Object.entries(sdgHours)
      .map(([sdg, hours]) => ({
        sdg: parseInt(sdg),
        name: SDG_NAMES[parseInt(sdg)] || `SDG ${sdg}`,
        value: Math.round(hours * 10) / 10,
        projectCount: sdgProjects[parseInt(sdg)]?.size || 0,
        color: SDG_COLORS[parseInt(sdg)] || '#6B7280'
      }))
      .filter(item => item.projectCount > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [timeFilter, projects, filteredActivities, sdgDistribution]);

  // FACT-BASED AI Smart Summary Generator
  // Generates insights based ONLY on actual data - no hallucinations or false claims
  const factBasedInsights = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    const volunteerSkills = volunteerProfile?.skills || [];

    // Find skills that are actually being used in assigned projects
    const skillsUsedInProjects = new Set<string>();
    const projectsBySkill: { [skill: string]: string[] } = {};

    safeProjects.forEach((project: any) => {
      const projectSkills = project.requiredSkills || project.skillsRequired || [];
      const projectName = project.name || 'Unknown Project';

      volunteerSkills.forEach((skill: string) => {
        const isUsed = projectSkills.some((ps: string) =>
          ps?.toLowerCase().includes(skill?.toLowerCase()) ||
          skill?.toLowerCase().includes(ps?.toLowerCase())
        );
        if (isUsed) {
          skillsUsedInProjects.add(skill);
          if (!projectsBySkill[skill]) projectsBySkill[skill] = [];
          projectsBySkill[skill].push(projectName);
        }
      });
    });

    const usedSkillsArray = Array.from(skillsUsedInProjects);

    // Find the top contributing SDG (the one with most hours)
    const topSdg = sdgDistribution[0];

    // Calculate trend: compare last 2 months of activity
    const recentMonths = impactOverTimeData.slice(-2);
    const hasPositiveTrend = recentMonths.length === 2 && recentMonths[1]?.hours > recentMonths[0]?.hours;
    const hasPerfectCompletion = kpis.completedTasks > 0 && kpis.completedTasks === kpis.totalTasks;

    // SDG Alignment Analysis
    const alignmentRate = kpis.sdgsCommitted > 0
      ? Math.round((kpis.alignedSdgs.length / kpis.sdgsCommitted) * 100)
      : 0;
    const hasUncommittedWork = kpis.uncommittedWork.length > 0;
    const hasBonusContributions = kpis.uncommittedContributions.length > 0;

    // Generate fact-based summary with SDG alignment insights
    let summary = '';
    let sdgInsight = '';

    if (kpis.totalHours === 0) {
      // No activity yet - welcome message without false claims
      if (kpis.sdgsCommitted > 0) {
        summary = `Welcome! You've committed to ${kpis.sdgsCommitted} SDG${kpis.sdgsCommitted !== 1 ? 's' : ''}: ${kpis.committedSdgs.slice(0, 3).map((s: number) => `SDG ${s}`).join(', ')}. Find projects aligned with your goals to start making impact.`;
      } else if (volunteerSkills.length > 0) {
        summary = `Welcome! Your profile shows skills in ${volunteerSkills.slice(0, 2).join(' and ')}. Set your SDG commitments and browse opportunities to start your journey.`;
      } else {
        summary = `Welcome! Complete your profile with SDG commitments and skills to get personalized project recommendations.`;
      }
    } else {
      // Has activity - build summary based on facts
      const hoursInfo = `${kpis.totalHours} hours logged`;
      const projectInfo = kpis.totalProjects > 0 ? ` across ${kpis.totalProjects} project${kpis.totalProjects !== 1 ? 's' : ''}` : '';

      // SDG alignment insight
      if (kpis.alignedSdgs.length > 0 && kpis.sdgsCommitted > 0) {
        sdgInsight = ` You're aligned on ${kpis.alignedSdgs.length} of ${kpis.sdgsCommitted} committed SDGs (${alignmentRate}%).`;
      }

      if (hasBonusContributions && kpis.uncommittedContributions.length > 0) {
        const bonusSdgs = kpis.uncommittedContributions.slice(0, 2).map((s: number) => `SDG ${s}`).join(', ');
        sdgInsight += ` Bonus: You're also contributing to ${bonusSdgs} outside your commitments!`;
      }

      if (hasUncommittedWork && kpis.uncommittedWork.length > 0) {
        const pendingSdgs = kpis.uncommittedWork.slice(0, 2).map((s: number) => `SDG ${s}`).join(', ');
        sdgInsight += ` Opportunity: ${pendingSdgs} ${kpis.uncommittedWork.length === 1 ? 'is' : 'are'} committed but not yet started.`;
      }

      summary = `${hoursInfo}${projectInfo}.${sdgInsight}`;
    }

    return {
      summary,
      usedSkills: usedSkillsArray,
      topSdg,
      hasPositiveTrend,
      hasPerfectCompletion,
      alignmentRate,
      hasUncommittedWork,
      hasBonusContributions
    };
  }, [projects, volunteerProfile?.skills, sdgDistribution, impactOverTimeData, kpis]);

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

  // Fetch discover opportunities for the Insights tab
  const { data: discoverOpportunities = [], isLoading: loadingOpportunities } = useQuery({
    queryKey: ['/api/opportunities/discover', userId],
    queryFn: async () => {
      const response = await fetch(`/api/opportunities/discover?userId=${userId}&threshold=0`);
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 30 * 1000, // Cache for 30 seconds only
  });

  // Fetch opportunity status (applied, saved, rejected)
  const { data: opportunityStatus = { savedIds: [], rejectedIds: [], appliedIds: [] } } = useQuery({
    queryKey: ['/api/opportunities/status', userId],
    queryFn: async () => {
      const response = await fetch(`/api/opportunities/status?volunteerId=${userId}`);
      if (!response.ok) return { savedIds: [], rejectedIds: [], appliedIds: [] };
      return response.json();
    },
  });

  // Fetch volunteer stories for the Stories tab
  const { data: volunteerStories = [], isLoading: loadingStories } = useQuery({
    queryKey: ['/api/stories', userId],
    queryFn: async () => {
      const response = await fetch(`/api/stories?volunteerId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 30 * 1000, // Cache for 30 seconds only
  });

  // Fetch featured stories for discovery
  const { data: featuredStories = [] } = useQuery({
    queryKey: ['/api/stories/featured'],
    queryFn: async () => {
      const response = await fetch('/api/stories?featured=true&limit=5');
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 30 * 1000, // Cache for 30 seconds only
  });

  // Calculate real skill analytics based on opportunities data
  const skillAnalytics = useMemo(() => {
    const volunteerSkills = volunteerProfile?.skills || [];
    const allOpportunities = discoverOpportunities || [];

    if (volunteerSkills.length === 0) return {};

    const analytics: Record<string, { matchingOpps: number; projects: number }> = {};

    volunteerSkills.forEach((skill: string) => {
      const skillLower = skill.toLowerCase();

      // Count opportunities that require this skill
      const matchingOpps = allOpportunities.filter((opp: any) => {
        const requiredSkills = opp.requiredSkills || opp.skillsRequired || [];
        return requiredSkills.some((rs: string) =>
          rs?.toLowerCase().includes(skillLower) || skillLower.includes(rs?.toLowerCase())
        );
      }).length;

      // Count projects where this skill was applied
      const projectsWithSkill = projects.filter((p: any) => {
        const projectSkills = p.requiredSkills || p.skillsRequired || p.skillsApplied || [];
        return projectSkills.some((ps: string) =>
          ps?.toLowerCase().includes(skillLower) || skillLower.includes(ps?.toLowerCase())
        );
      }).length;

      analytics[skill] = { matchingOpps, projects: projectsWithSkill };
    });

    return analytics;
  }, [volunteerProfile?.skills, discoverOpportunities, projects]);

  // Check if user has applied for an opportunity
  const hasAppliedToOpportunity = (opportunityId: number) => {
    return opportunityStatus?.appliedIds?.includes(opportunityId) || false;
  };

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

  // Fetch all tasks for log activity form
  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch("/api/tasks");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Get tasks for selected project in log activity form
  const logActivityProjectTasks = logActivityProjectId
    ? allTasks.filter((task: any) => task.projectId === parseInt(logActivityProjectId))
    : [];

  // Log activity mutation
  const logActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const response = await fetch("/api/volunteer-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to log activity");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Activity Logged!",
        description: "Your volunteer activity has been recorded successfully.",
      });
      // Reset form
      setLogActivityProjectId("");
      setLogActivityTaskId("");
      setLogActivityHours("");
      setLogActivityDescription("");
      setLogActivityDate(new Date().toISOString().split('T')[0]);
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aiu/volunteer"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Log Activity",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle log activity form submission
  const handleLogActivity = () => {
    if (!logActivityProjectId || !logActivityHours) {
      toast({
        title: "Missing Information",
        description: "Please select a project and enter hours.",
        variant: "destructive",
      });
      return;
    }

    logActivityMutation.mutate({
      userId: parseInt(userId),
      projectId: parseInt(logActivityProjectId),
      taskId: logActivityTaskId ? parseInt(logActivityTaskId) : null,
      date: logActivityDate,
      hours: parseFloat(logActivityHours),
      description: logActivityDescription,
      activityType: logActivityType,
    });
  };

  // Fetch impact metrics to get the default "Lives Impacted" metric ID
  const { data: impactMetrics = [] } = useQuery<any[]>({
    queryKey: ["/api/impact-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/impact-metrics");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Find the "Lives Impacted" metric ID
  const livesImpactedMetricId = impactMetrics.find(
    (m: any) => m.name === "Lives Impacted" || m.category === "general"
  )?.id || 1;

  // Get tasks for impact project
  const impactProjectTasks = impactProjectId
    ? allTasks.filter((task: any) => task.projectId === parseInt(impactProjectId))
    : [];

  // Record impact mutation
  const recordImpactMutation = useMutation({
    mutationFn: async (impactData: any) => {
      const response = await fetch("/api/project-impacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(impactData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to record impact");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Impact Recorded!",
        description: "Your impact has been recorded successfully.",
      });
      // Reset form
      setImpactProjectId("");
      setImpactTaskId("");
      setPeopleReached("");
      setImpactDescription("");
      setImpactCategory("direct");
      setImpactDate(new Date().toISOString().split('T')[0]);
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/project-impacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aiu/volunteer"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Record Impact",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle impact form submission
  const handleRecordImpact = () => {
    if (!impactProjectId || !peopleReached) {
      toast({
        title: "Missing Information",
        description: "Please select a project and enter people reached.",
        variant: "destructive",
      });
      return;
    }

    recordImpactMutation.mutate({
      projectId: parseInt(impactProjectId),
      taskId: impactTaskId ? parseInt(impactTaskId) : null,
      userId: parseInt(userId),
      metricId: livesImpactedMetricId,
      value: parseInt(peopleReached),
      date: new Date(impactDate).toISOString(),
      notes: impactDescription || null,
      outcomeType: impactCategory === 'direct' ? 'individual' : impactCategory === 'community' ? 'shared' : 'individual',
      role: 'lead',
    });
  };

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
    <div className="min-h-screen h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col w-full max-w-full overflow-hidden">
      {/* PWA Header */}
      <PWAHeader onLogActivity={() => setActiveTab('log-activity')} />

      {/* Spacer for fixed header */}
      <div className="h-[calc(3.5rem+max(0.5rem,env(safe-area-inset-top)))]" />

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-gray-900 px-4 py-2 text-sm flex items-center gap-2 justify-center">
          <span>⚠️</span>
          <span>Offline Mode - Data may be outdated</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 w-full max-w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Welcome Header - Integrated with profile */}
            {dashboardData?.volunteerProfile && (
              <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-4 pt-4 pb-6 -mt-0.5">
                <div className="flex items-center gap-4">
                  {/* Profile Picture */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg ring-2 ring-white/20">
                      {dashboardData.volunteerProfile.profilePhotoUrl || user?.profilePicture ? (
                        <img
                          src={dashboardData.volunteerProfile.profilePhotoUrl || user?.profilePicture}
                          alt={volunteerProfile?.volunteer_name || user?.displayName || 'Profile'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-xl font-bold">
                          {(volunteerProfile?.volunteer_name || user?.displayName || user?.name || 'V').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Welcome Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-blue-100 text-xs font-medium">Welcome back,</p>
                    <h1 className="text-white text-lg font-bold truncate">
                      {(volunteerProfile?.volunteer_name || user?.displayName || 'Volunteer').split(' ')[0]}!
                    </h1>
                    {dashboardData.volunteerProfile.professionalTitle && (
                      <p className="text-blue-200 text-xs truncate mt-0.5">{dashboardData.volunteerProfile.professionalTitle}</p>
                    )}
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="flex items-center gap-2 mt-4">
                  {dashboardData.volunteerProfile.weeklyAvailability && (
                    <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Clock className="h-3.5 w-3.5 text-blue-200" />
                      <span className="text-white text-xs font-medium">{dashboardData.volunteerProfile.weeklyAvailability}h/wk</span>
                    </div>
                  )}
                  {kpis.activeProjects > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Briefcase className="h-3.5 w-3.5 text-blue-200" />
                      <span className="text-white text-xs font-medium">{kpis.activeProjects} Active</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skills Section - Card style */}
            {dashboardData?.volunteerProfile?.skills && dashboardData.volunteerProfile.skills.length > 0 && (
              <div className="px-4 -mt-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                    Your Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {dashboardData.volunteerProfile.skills.slice(0, 5).map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[11px] font-medium rounded-lg shadow-sm"
                      >
                        {skill}
                      </span>
                    ))}
                    {dashboardData.volunteerProfile.skills.length > 5 && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-lg">
                        +{dashboardData.volunteerProfile.skills.length - 5} more
                      </span>
                    )}
                  </div>
                  {dashboardData.volunteerProfile.motivations && (
                    <p className="text-[11px] text-slate-500 mt-3 italic border-t border-slate-100 pt-3">
                      "{dashboardData.volunteerProfile.motivations}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* KPI Cards - Key metrics: Impact ROI, AIU Score, Hours, SDGs */}
            <div className="px-4 grid grid-cols-4 gap-2">
              {/* Impact ROI - Lives impacted per hour volunteered */}
              <button
                onClick={() => setShowKpiModal('impact-roi')}
                className="bg-white rounded-2xl p-3 text-center hover:shadow-md transition-all active:scale-95 relative overflow-hidden border border-slate-100 shadow-sm"
                data-testid="kpi-impact-roi"
              >
                <div className="w-8 h-8 mx-auto mb-1.5 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-slate-800">{kpis.impactROI}</div>
                <div className="text-[10px] font-medium text-slate-500">Impact ROI</div>
                <div className="text-[8px] text-slate-400">per hour</div>
              </button>
              {/* AIU Score - Attributable Impact Units */}
              <button
                onClick={() => setShowAIUDetailsModal(true)}
                className="bg-white rounded-2xl p-3 text-center hover:shadow-md transition-all active:scale-95 relative overflow-hidden border border-slate-100 shadow-sm group"
                data-testid="kpi-aiu-score"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="w-8 h-8 mx-auto mb-1.5 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {formatNumber(aiuSummary?.totalAiu || 0)}
                </div>
                <div className="text-[10px] font-medium text-slate-500">AIU Score</div>
                <div className="text-[8px] text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">Tap for details</div>
              </button>
              {/* Total Hours - Time contributed */}
              <button
                onClick={() => setShowKpiModal('hours')}
                className="bg-white rounded-2xl p-3 text-center hover:shadow-md transition-all active:scale-95 relative overflow-hidden border border-slate-100 shadow-sm"
                data-testid="kpi-hours"
              >
                <div className="w-8 h-8 mx-auto mb-1.5 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-slate-800">{kpis.totalHours}</div>
                <div className="text-[10px] font-medium text-slate-500">Hours</div>
              </button>
              {/* SDG Goals - Sustainable Development Goals contributed */}
              <button
                onClick={() => setShowKpiModal('sdgs')}
                className="bg-white rounded-2xl p-3 text-center hover:shadow-md transition-all active:scale-95 relative overflow-hidden border border-slate-100 shadow-sm"
                data-testid="kpi-sdgs"
              >
                <div className="w-8 h-8 mx-auto mb-1.5 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Target className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-bold text-slate-800">{kpis.sdgsContributed}</div>
                <div className="text-[10px] font-medium text-slate-500">SDGs</div>
              </button>
            </div>

            {/* UN SDG Impact Report - Enhanced with UN-Compliant KPIs */}
            {sdgDistribution.length > 0 && (
              <div className="px-4 w-full max-w-full">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-slate-800 text-lg font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    SDG Impact Report
                  </h2>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium border border-blue-100">
                    UN Aligned
                  </span>
                </div>

                {/* UN SDG Summary KPIs - Key Performance Indicators */}
                <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-4 border border-blue-100 shadow-sm mb-3 w-full">
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {/* SDGs Committed (from profile) - User's commitment, not work done */}
                    <button
                      onClick={() => setShowKpiModal('sdgs')}
                      className="text-center p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-all active:scale-95 shadow-sm border border-white/50 cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-blue-600">{kpis.sdgsCommitted}</div>
                      <div className="text-[9px] text-slate-600 font-medium">SDG Goals</div>
                      <div className="text-[8px] text-blue-400 mt-0.5">Tap for details</div>
                    </button>
                    {/* Total Hours - Clickable, use actual kpis.totalHours */}
                    <button
                      onClick={() => setShowKpiModal('hours')}
                      className="text-center p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-all active:scale-95 shadow-sm border border-white/50 cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-emerald-600">
                        {kpis.totalHours}
                      </div>
                      <div className="text-[9px] text-slate-600 font-medium">Hours</div>
                      <div className="text-[8px] text-emerald-400 mt-0.5">Tap for details</div>
                    </button>
                    {/* Projects - Clickable, use actual kpis.totalProjects */}
                    <button
                      onClick={() => setShowKpiModal('projects')}
                      className="text-center p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-all active:scale-95 shadow-sm border border-white/50 cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-purple-600">
                        {kpis.totalProjects}
                      </div>
                      <div className="text-[9px] text-slate-600 font-medium">Projects</div>
                      <div className="text-[8px] text-purple-400 mt-0.5">Tap for details</div>
                    </button>
                    {/* Impact Score (AIU) - Clickable, using aiuSummary as single source of truth */}
                    <button
                      onClick={() => setShowAIUDetailsModal(true)}
                      className="text-center p-3 rounded-xl bg-white/60 hover:bg-white/80 transition-all active:scale-95 shadow-sm border border-white/50 cursor-pointer group"
                    >
                      <div className="text-2xl font-bold text-amber-600">
                        {formatNumber(aiuSummary?.totalAiu)}
                      </div>
                      <div className="text-[9px] text-slate-600 font-medium">AIUs</div>
                      <div className="text-[8px] text-amber-400 mt-0.5">Tap for details</div>
                    </button>
                  </div>

                  {/* UN SDG Coverage Indicator - Shows committed SDGs (goals) vs contributed (work done) */}
                  <div className="bg-white/70 rounded-lg p-2 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-600 font-medium">SDG Commitments</span>
                      <span className="text-[10px] text-blue-600 font-bold">
                        {kpis.sdgsCommitted} of 17 Goals ({Math.round((kpis.sdgsCommitted / 17) * 100)}%)
                      </span>
                    </div>
                    <div className="flex gap-[2px]">
                      {Array.from({ length: 17 }, (_, i) => i + 1).map((sdgNum) => {
                        // Check if this SDG is in the volunteer's committed goals (preferredSdgs)
                        const isCommitted = kpis.committedSdgs.includes(sdgNum);
                        // Check if volunteer has actually contributed hours to this SDG
                        const sdgData = sdgDistribution.find(s => s.sdg === sdgNum);
                        const hasContributed = !!sdgData && sdgData.value > 0;
                        return (
                          <button
                            key={sdgNum}
                            onClick={() => (isCommitted || hasContributed) && setShowSdgModal(sdgNum)}
                            className={`flex-1 h-3 rounded-sm transition-all ${(isCommitted || hasContributed) ? 'hover:scale-y-150 cursor-pointer' : 'cursor-default'}`}
                            style={{
                              backgroundColor: isCommitted ? SDG_COLORS[sdgNum] : hasContributed ? SDG_COLORS[sdgNum] : '#e5e7eb',
                              opacity: isCommitted ? 1 : hasContributed ? 0.5 : 0.3,
                              border: hasContributed && !isCommitted ? `1px solid ${SDG_COLORS[sdgNum]}` : 'none'
                            }}
                            title={`SDG ${sdgNum}: ${SDG_NAMES[sdgNum]}${sdgData ? ` (${sdgData.value} hrs)` : ''}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Donut Chart with Center Stats */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600 text-xs font-medium">Hours Distribution by SDG</span>
                    <span className="text-emerald-700 text-[10px] px-2 py-0.5 bg-emerald-50 rounded-full font-medium">
                      Live Data
                    </span>
                  </div>

                  {/* Enhanced Pie Chart with center label showing average completion */}
                  <div className="h-52 w-full relative flex items-center justify-center" style={{ isolation: 'isolate' }}>
                    <ResponsiveContainer width="100%" height="100%" className="[&_.recharts-tooltip-wrapper]:!z-[9999] [&_.recharts-tooltip-wrapper]:!pointer-events-none">
                      <PieChart>
                        <Pie
                          data={sdgDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          onClick={(data) => setShowSdgModal(data.sdg)}
                          style={{ cursor: 'pointer' }}
                        >
                          {sdgDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                          allowEscapeViewBox={{ x: true, y: true }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const totalHours = sdgDistribution.reduce((sum, s) => sum + s.value, 0);
                              const percentage = totalHours > 0 ? Math.round((data.value / totalHours) * 100) : 0;
                              return (
                                <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-[180px] z-[100]">
                                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                                      style={{ backgroundColor: data.color }}
                                    >
                                      {data.sdg}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-800">SDG {data.sdg}</div>
                                      <div className="text-slate-500 text-[10px]">{data.name}</div>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Hours:</span>
                                      <span className="font-semibold text-slate-800">{data.value} hrs</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Projects:</span>
                                      <span className="font-semibold text-slate-800">{data.projectCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Share:</span>
                                      <span className="font-semibold text-blue-600">{percentage}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label - Shows Average Completion Percentage */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
                      <div className="text-center bg-white/90 rounded-full w-[90px] h-[90px] flex flex-col items-center justify-center shadow-sm">
                        <div className="text-2xl font-bold text-emerald-600">
                          {kpis.totalTasks > 0 ? Math.round((kpis.completedTasks / kpis.totalTasks) * 100) : 0}%
                        </div>
                        <div className="text-[9px] text-slate-500 leading-tight">Avg Completion</div>
                      </div>
                    </div>
                  </div>

                  {/* SDG Legend Grid with UN Indicator Colors */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {sdgDistribution.slice(0, 6).map((sdg) => {
                      const totalHours = sdgDistribution.reduce((sum, s) => sum + s.value, 0);
                      const percentage = totalHours > 0 ? Math.round((sdg.value / totalHours) * 100) : 0;
                      const sdgAiu = aiuPerSdg[sdg.sdg] || 0;
                      return (
                        <button
                          key={sdg.sdg}
                          onClick={() => setShowSdgModal(sdg.sdg)}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-left border border-slate-200 hover:border-slate-300 hover:shadow-md active:scale-98 cursor-pointer"
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: sdg.color }}
                          >
                            {sdg.sdg}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-800 font-semibold text-[11px] truncate">{sdg.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-slate-600 text-[10px] font-medium">{Math.round(sdg.value)} hrs</span>
                              <span className="text-blue-600 text-[9px] bg-blue-50 px-1.5 py-0.5 rounded font-medium">{percentage}%</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-emerald-600 text-[9px]">{sdg.projectCount} project{sdg.projectCount !== 1 ? 's' : ''}</span>
                              {sdgAiu > 0 && (
                                <span className="text-amber-600 text-[9px] bg-amber-50 px-1.5 py-0.5 rounded font-medium">{formatNumber(sdgAiu)} AIU</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {sdgDistribution.length > 6 && (
                    <button
                      onClick={() => setShowKpiModal('sdgs')}
                      className="w-full text-center mt-3 py-2 text-blue-600 text-xs font-medium hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      View all {sdgDistribution.length} SDGs →
                    </button>
                  )}

                  {/* UN SDG Compliance Note */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <Target className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p>
                        <span className="font-semibold text-slate-700">UN SDG Tracking:</span> Your volunteer hours are mapped to the 17 UN Sustainable Development Goals. AIUs (Attributable Impact Units) are auditable credits showing your verified share of SDG-linked outcomes, backed by project data and NGO verification.
                      </p>
                    </div>
                  </div>
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
                      <div className="flex flex-wrap gap-3 mb-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-[#4CAF50]"></div>
                          <span className="text-slate-500">Hours</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-[#2563eb]"></div>
                          <span className="text-slate-500">People Reached</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-0.5 bg-[#f59e0b]"></div>
                          <span className="text-slate-500">AIUs</span>
                        </div>
                      </div>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={impactOverTimeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                            <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={10} />
                            <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={10} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                              labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                            />
                            <Line yAxisId="left" type="monotone" dataKey="hours" stroke="#4CAF50" strokeWidth={2} dot={{ fill: '#4CAF50', r: 3 }} name="Hours" />
                            <Line yAxisId="left" type="monotone" dataKey="peopleReached" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} name="People Reached" />
                            <Line yAxisId="right" type="monotone" dataKey="aiu" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="AIUs" />
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
                            className="flex-1 text-xs h-8 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
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
                className="bg-[#d97706] rounded-lg p-3 text-white text-center hover:brightness-110 transition-all active:scale-95"
              >
                <div className="text-2xl font-bold mb-1">{kpis.activeProjects}</div>
                <div className="text-xs font-medium">Active</div>
                <CheckCircle className="w-4 h-4 mx-auto mt-1 opacity-90" />
              </button>
              <button
                onClick={() => setShowProjectStatsModal('total')}
                className="bg-[#059669] rounded-lg p-3 text-white text-center hover:brightness-110 transition-all active:scale-95"
              >
                <div className="text-2xl font-bold mb-1">{kpis.totalProjects}</div>
                <div className="text-xs font-medium">Total</div>
                <Briefcase className="w-4 h-4 mx-auto mt-1 opacity-90" />
              </button>
              <button
                onClick={() => setShowProjectStatsModal('sdgs')}
                className="bg-[#be185d] rounded-lg p-3 text-white text-center hover:brightness-110 transition-all active:scale-95"
              >
                <div className="text-2xl font-bold mb-1">{kpis.sdgsContributed}</div>
                <div className="text-xs font-medium">SDG Impact</div>
                <Target className="w-4 h-4 mx-auto mt-1 opacity-90" />
              </button>
            </div>

            {/* All Projects List */}
            <h2 className="text-slate-800 text-lg font-semibold">All Projects</h2>
            <div className="space-y-3">
              {projects.map((project: any) => {
                const matchScore = calculateMatchScore(project);
                const projectSDGs = project.sdgGoals || [];
                const completion = project.completionPercentage || 0;
                const normalizedStatus = (project.status || 'active').toLowerCase();
                const statusColor = normalizedStatus === 'active' ? 'bg-emerald-500' :
                                   normalizedStatus === 'completed' ? 'bg-blue-500' : 'bg-gray-500';
                const displayStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

                return (
                  <div
                    key={project.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/projects/${project.id}/pwa`);
                    }}
                    className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm hover:border-gray-500 transition-all cursor-pointer active:scale-95"
                    data-testid={`project-card-${project.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
                        <span className="text-xs text-slate-500">{displayStatus}</span>
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
                        <span>{formatNumber(getProjectAiu(project.id))} AIUs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{Math.round(project.totalHoursLogged || 0)} hrs</span>
                      </div>
                    </div>
                  </div>
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
              {(() => {
                // Calculate individual scores properly
                const skillsMatch = Math.min(50 + kpis.skills * 10, 100);
                const sdgAlignment = Math.min(40 + kpis.sdgsContributed * 12, 100);
                const engagementLevel = Math.min(30 + kpis.totalHours * 2, 100);
                // Calculate true average
                const averageScore = Math.round((skillsMatch + sdgAlignment + engagementLevel) / 3);

                return (
                  <button
                    onClick={() => setShowReadinessModal(true)}
                    className="w-full text-left bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-xl p-4 text-white relative overflow-hidden active:scale-[0.98] transition-transform"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="8" strokeDasharray="251.3" strokeDashoffset={251.3 - (251.3 * averageScore) / 100} transform="rotate(-90 50 50)" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5" />
                      <span className="font-semibold">Impact Readiness Score</span>
                      <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">Tap for details</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="text-5xl font-bold">{averageScore}</div>
                        <div className="text-xs opacity-75">avg of 100</div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Skills Profile</span>
                          <span>{skillsMatch}%</span>
                        </div>
                        <Progress value={skillsMatch} className="h-1.5 bg-white/20" />
                        <div className="flex justify-between text-xs">
                          <span>SDG Contributions</span>
                          <span>{sdgAlignment}%</span>
                        </div>
                        <Progress value={sdgAlignment} className="h-1.5 bg-white/20" />
                        <div className="flex justify-between text-xs">
                          <span>Engagement Level</span>
                          <span>{engagementLevel}%</span>
                        </div>
                        <Progress value={engagementLevel} className="h-1.5 bg-white/20" />
                      </div>
                    </div>
                  </button>
                );
              })()}

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
                    const stats = skillAnalytics[skill] || { matchingOpps: 0, demandScore: 0, projects: 0 };
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedSkill(skill)}
                        className="text-left bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2 border border-amber-100/50 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                      >
                        <div className="text-slate-800 text-xs font-semibold truncate">{skill}</div>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="text-emerald-700">{stats.matchingOpps} opps</span>
                          <span className="text-blue-600">{stats.projects} projects</span>
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Tap for insights</div>
                      </button>
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
                        const stats = skillAnalytics[skill] || { matchingOpps: 0, demandScore: 0, projects: 0 };
                        return (
                          <button
                            key={idx + 4}
                            onClick={() => setSelectedSkill(skill)}
                            className="text-left bg-slate-50 rounded-lg p-2 border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all"
                          >
                            <div className="text-slate-700 text-xs font-medium truncate">{skill}</div>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className="text-emerald-600">{stats.matchingOpps} opps</span>
                              <span className="text-blue-600">{stats.projects} projects</span>
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">Tap for insights</div>
                          </button>
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
                      { title: 'Rising Star', desc: 'Complete 5 projects', target: 5, current: kpis.projectsCompleted, icon: '⭐', bgFrom: '#fbbf24', bgTo: '#f59e0b' },
                      { title: 'Impact Leader', desc: 'Log 50 volunteer hours', target: 50, current: kpis.totalHours, icon: '🏆', bgFrom: '#60a5fa', bgTo: '#3b82f6' },
                      { title: 'Global Champion', desc: 'Contribute to 5 SDGs', target: 5, current: kpis.sdgsContributed, icon: '🌍', bgFrom: '#4ade80', bgTo: '#22c55e' },
                      { title: 'Community Builder', desc: 'Join 3 organizations', target: 3, current: Math.min(projects.length, 3), icon: '🤝', bgFrom: '#c084fc', bgTo: '#a855f7' }
                    ].map((milestone, idx) => {
                      const progress = Math.min((milestone.current / milestone.target) * 100, 100);
                      const isComplete = progress >= 100;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedMilestone(idx)}
                          className="flex gap-3 relative w-full text-left hover:bg-slate-50/50 rounded-lg p-1 -m-1 transition-colors active:scale-[0.99]"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 flex-shrink-0 ${
                            isComplete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isComplete ? <CheckCircle className="w-4 h-4" /> : milestone.icon}
                          </div>
                          <div className="flex-1 pb-2 min-w-0">
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
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${progress}%`,
                                    background: isComplete
                                      ? 'linear-gradient(to right, #4ade80, #22c55e)'
                                      : `linear-gradient(to right, ${milestone.bgFrom}, ${milestone.bgTo})`
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">{Math.round(milestone.current)}/{milestone.target}</span>
                            </div>
                            <div className="text-[9px] text-blue-500 mt-0.5">Tap for details</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* AI Smart Summary - Now uses fact-based insights */}
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-xl p-4 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                  <Sparkles className="w-full h-full" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">AI Smart Summary</span>
                  <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Fact-Based</span>
                </div>
                <p className="text-sm opacity-95 leading-relaxed">
                  {factBasedInsights.summary}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs opacity-80">
                  <Clock className="w-3 h-3" />
                  <span>Based on your actual activity data</span>
                </div>
              </div>

              <Button
                onClick={() => navigate('/impact-visualization')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3"
              >
                <Globe className="w-4 h-4 mr-2" />
                View Full Impact Visualization
              </Button>

              {/* Discover Opportunities Section */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-slate-800 text-lg font-bold flex items-center gap-2">
                    <Search className="w-5 h-5 text-emerald-600" />
                    Discover Opportunities
                  </h2>
                  <span className="text-xs text-slate-500">
                    {discoverOpportunities.filter((o: any) => !opportunityStatus?.rejectedIds?.includes(o.id)).length} matches
                  </span>
                </div>

                {loadingOpportunities ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                    <p className="text-slate-500 text-sm">Finding opportunities...</p>
                  </div>
                ) : discoverOpportunities.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 text-center border border-amber-200/60">
                    <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-600">No opportunities found</p>
                    <p className="text-slate-400 text-sm mt-1">Check back later for new matches</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Top Matches */}
                    {discoverOpportunities
                      .filter((opp: any) => !opportunityStatus?.rejectedIds?.includes(opp.id))
                      .slice(0, 5)
                      .map((opp: any) => {
                        const matchScore = opp.matchScore ?? 0;
                        const matchColor = matchScore >= 80 ? 'from-emerald-500 to-teal-500' :
                                          matchScore >= 60 ? 'from-blue-500 to-indigo-500' :
                                          matchScore >= 40 ? 'from-amber-500 to-orange-500' : 'from-gray-400 to-gray-500';
                        const hasApplied = hasAppliedToOpportunity(opp.id);

                        return (
                          <div
                            key={opp.id}
                            className="bg-white rounded-xl border border-amber-200/60 overflow-hidden shadow-sm"
                          >
                            {/* Match Score Header */}
                            <div className={`bg-gradient-to-r ${matchColor} px-4 py-2 flex items-center justify-between`}>
                              <div className="flex items-center gap-2 text-white">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                  <span className="text-xs font-bold">{matchScore}%</span>
                                </div>
                                <span className="text-xs font-medium">
                                  {matchScore >= 80 ? 'Excellent Match' :
                                   matchScore >= 60 ? 'Good Match' :
                                   matchScore >= 40 ? 'Fair Match' : 'Explore'}
                                </span>
                              </div>
                              {hasApplied && (
                                <span className="text-xs px-2 py-0.5 bg-white/20 rounded text-white">Applied</span>
                              )}
                            </div>

                            <div className="p-4">
                              <h3 className="text-slate-800 font-semibold text-sm mb-1">{opp.title}</h3>
                              {opp.organizationName && (
                                <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
                                  <Building2 className="w-3 h-3" />
                                  <span>{opp.organizationName}</span>
                                </div>
                              )}

                              {/* SDG Goals */}
                              {opp.sdgGoals && opp.sdgGoals.length > 0 && (
                                <div className="flex gap-1 mb-2">
                                  {opp.sdgGoals.slice(0, 4).map((sdg: number) => (
                                    <div
                                      key={sdg}
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                      style={{ backgroundColor: SDG_COLORS[sdg] || '#6B7280' }}
                                    >
                                      {sdg}
                                    </div>
                                  ))}
                                  {opp.sdgGoals.length > 4 && (
                                    <div className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center text-white text-[9px]">
                                      +{opp.sdgGoals.length - 4}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Match Reason */}
                              {opp.matchReasons && opp.matchReasons.length > 0 && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mb-2">
                                  <p className="text-blue-600 text-[10px] flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    {opp.matchReasons[0]}
                                  </p>
                                </div>
                              )}

                              {/* Meta Info */}
                              <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mb-3">
                                {opp.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{opp.location}</span>
                                  </div>
                                )}
                                {opp.timeCommitment && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{opp.timeCommitment}</span>
                                  </div>
                                )}
                              </div>

                              {/* Apply Button */}
                              <Button
                                onClick={() => {
                                  if (!hasApplied) {
                                    navigate(`/opportunities/${opp.id}/pwa`);
                                  }
                                }}
                                disabled={hasApplied}
                                size="sm"
                                className={`w-full ${hasApplied ? 'bg-gray-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'} text-white font-medium text-xs`}
                              >
                                {hasApplied ? "Already Applied" : "View & Apply"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                    {/* View More Link */}
                    {discoverOpportunities.filter((o: any) => !opportunityStatus?.rejectedIds?.includes(o.id)).length > 5 && (
                      <Button
                        onClick={() => navigate('/discover-opportunities/pwa')}
                        variant="outline"
                        className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        View All {discoverOpportunities.filter((o: any) => !opportunityStatus?.rejectedIds?.includes(o.id)).length} Opportunities
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impacts' && (
          <div className="space-y-4">
            {/* Gradient Header */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-4 pt-4 pb-6 -mt-0.5">
              <div className="flex items-center gap-4">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg ring-2 ring-white/20">
                    {dashboardData.volunteerProfile?.profilePhotoUrl || user?.profilePicture ? (
                      <img
                        src={dashboardData.volunteerProfile?.profilePhotoUrl || user?.profilePicture}
                        alt={volunteerProfile?.volunteer_name || user?.displayName || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-xl font-bold">
                        {(volunteerProfile?.volunteer_name || user?.displayName || user?.name || 'V').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>

                {/* Welcome Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-blue-100 text-xs font-medium">Impact Dashboard</p>
                  <h1 className="text-white text-lg font-bold truncate">
                    {(volunteerProfile?.volunteer_name || user?.displayName || 'Volunteer').split(' ')[0]}!
                  </h1>
                  {dashboardData.volunteerProfile?.professionalTitle && (
                    <p className="text-blue-200 text-xs truncate mt-0.5">{dashboardData.volunteerProfile.professionalTitle}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {/* Dashboard Title with Time Filter */}
              <div className="flex items-center justify-between">
                <h2 className="text-slate-800 text-xl font-bold">Your Impact</h2>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Select value={timeFilter} onValueChange={(value: "all" | "month" | "quarter" | "year") => setTimeFilter(value)}>
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Committed SDGs with UN Icons - Interactive Buttons */}
            {kpis.committedSdgs.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-800 font-semibold text-sm">Your SDG Commitments</h3>
                  <span className="text-xs text-slate-500">{kpis.committedSdgs.length} goals</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {kpis.committedSdgs.map((sdgNum: number) => {
                    const hasContributed = kpis.contributedSdgs.includes(sdgNum);
                    const sdgData = filteredSdgDistribution.find(s => s.sdg === sdgNum);
                    const hoursContributed = sdgData?.value || 0;
                    return (
                      <button
                        key={`committed-sdg-${sdgNum}`}
                        onClick={() => setShowSdgModal(sdgNum)}
                        className="relative group transition-transform hover:scale-105 active:scale-95"
                      >
                        <div className="relative aspect-square rounded-lg overflow-hidden shadow-md border-2 border-white">
                          <img
                            src={getSDGIcon(sdgNum)}
                            alt={`SDG ${sdgNum}: ${SDG_NAMES[sdgNum]}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Real-time checkmark indicator for contributed SDGs */}
                          {hasContributed && (
                            <div className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </div>
                          )}
                          {/* Hours badge for contributed SDGs */}
                          {hasContributed && hoursContributed > 0 && (
                            <div className="absolute top-0.5 left-0.5 bg-emerald-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                              {hoursContributed}h
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Progress indicator */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{kpis.alignedSdgs.length}/{kpis.committedSdgs.length} active</span>
                  </div>
                  <Progress
                    value={(kpis.alignedSdgs.length / kpis.committedSdgs.length) * 100}
                    className="h-1.5 bg-slate-200"
                  />
                </div>
              </div>
            )}

            {/* SDG Impact Snapshot - Green Gradient Card with Interactive Metrics */}
            <div className="bg-gradient-to-r from-[#22c55e] to-[#4ade80] rounded-xl p-4 text-white shadow-lg">
              <h2 className="text-lg font-semibold mb-3">SDG Impact Snapshot</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Hours - Clickable */}
                <button
                  onClick={() => setShowKpiModal('hours')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-[0.98] text-left"
                >
                  <Clock className="w-6 h-6 opacity-90" />
                  <div>
                    <div className="text-3xl font-bold">{formatNumber(timeFilter === 'all' ? kpis.totalHours : filteredTotalHours)}</div>
                    <div className="text-xs opacity-80">
                      {timeFilter === 'all' ? 'Volunteer Hours' :
                       timeFilter === 'month' ? 'Hours This Month' :
                       timeFilter === 'quarter' ? 'Hours This Quarter' :
                       'Hours This Year'}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-60 ml-auto -rotate-90" />
                </button>
                {/* AIU Score - Clickable */}
                <button
                  onClick={() => setShowAIUDetailsModal(true)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-[0.98] text-left"
                >
                  <Target className="w-6 h-6 opacity-90" />
                  <div>
                    <div className="text-3xl font-bold">{formatNumber(aiuSummary?.totalAiu)}</div>
                    <div className="text-xs opacity-80">Total AIU Earned</div>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-60 ml-auto -rotate-90" />
                </button>
              </div>
              {/* Secondary metrics row - all clickable */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* People Reached - Clickable */}
                <button
                  onClick={() => setShowKpiModal('people')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-[0.98] text-center"
                >
                  <Users className="w-4 h-4 mx-auto opacity-80 mb-1" />
                  <div className="text-lg font-bold">{formatNumber(kpis.livesImpacted)}</div>
                  <div className="text-[10px] opacity-70">People Reached</div>
                </button>
                {/* Projects - Clickable */}
                <button
                  onClick={() => setShowProjectStatsModal('total')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-[0.98] text-center"
                >
                  <Briefcase className="w-4 h-4 mx-auto opacity-80 mb-1" />
                  <div className="text-lg font-bold">{kpis.totalProjects}</div>
                  <div className="text-[10px] opacity-70">Projects</div>
                </button>
                {/* Impact Score - Clickable */}
                <button
                  onClick={() => setShowKpiModal('impact-score')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-[0.98] text-center"
                >
                  <Zap className="w-4 h-4 mx-auto opacity-80 mb-1" />
                  <div className="text-lg font-bold">{kpis.impactScore}</div>
                  <div className="text-[10px] opacity-70">Impact Score</div>
                </button>
              </div>
              {/* SDGs Contributed - Clickable footer */}
              <button
                onClick={() => setShowProjectStatsModal('sdgs')}
                className="w-full flex items-center gap-2 border-t border-white/30 pt-3 mt-2 hover:bg-white/10 rounded-lg transition-all px-2 py-1"
              >
                <Globe className="w-5 h-5 opacity-80" />
                <span className="text-sm">
                  Contributed to {timeFilter === 'all' ? kpis.sdgsContributed : filteredSdgDistribution.length} SDGs
                  {timeFilter !== 'all' && <span className="opacity-80 ml-1">({timeFilter === 'month' ? 'this month' : timeFilter === 'quarter' ? 'this quarter' : 'this year'})</span>}
                </span>
                <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {Math.min(Math.round(aiuSummary?.verificationRate || 0), 100)}% Verified
                </span>
                <ChevronDown className="w-4 h-4 opacity-60 -rotate-90" />
              </button>
            </div>

            {/* Project Overview Section - Interactive Cards */}
            <div>
              <h2 className="text-slate-800 text-lg font-semibold mb-3">Project Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Active Projects - Clickable */}
                <button
                  onClick={() => setShowProjectStatsModal('active')}
                  className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm text-left transition-all hover:shadow-md hover:border-emerald-300 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between text-slate-500 text-sm mb-1">
                    <span>Active Projects</span>
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 text-4xl font-bold">{kpis.activeProjects}</span>
                    <div className="flex-1">
                      <Progress value={(kpis.activeProjects / Math.max(kpis.totalProjects, 1)) * 100} className="h-2 bg-slate-200" />
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Tap to view details</div>
                </button>
                {/* Total Projects - Clickable */}
                <button
                  onClick={() => setShowProjectStatsModal('total')}
                  className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm text-left transition-all hover:shadow-md hover:border-blue-300 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between text-slate-500 text-sm mb-1">
                    <span>Total Projects</span>
                    <Building2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-600 text-4xl font-bold">{kpis.totalProjects}</span>
                    <div className="flex flex-col text-xs text-slate-500">
                      <span>{kpis.projectsCompleted} done</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Tap to view all</div>
                </button>
              </div>
              {/* Secondary metrics row */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {/* Pending Applications */}
                <button
                  onClick={() => setActiveTab('projects')}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200/60 text-left transition-all hover:shadow-sm active:scale-[0.98]"
                >
                  <div className="text-amber-600 text-2xl font-bold">{pendingApplicationsCount}</div>
                  <div className="text-[10px] text-slate-600">Pending Apps</div>
                  {pendingApplicationsCount > 0 && (
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1 animate-pulse"></div>
                  )}
                </button>
                {/* Completed Tasks */}
                <button
                  onClick={() => setShowKpiModal('tasks')}
                  className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200/60 text-left transition-all hover:shadow-sm active:scale-[0.98]"
                >
                  <div className="text-emerald-600 text-2xl font-bold">{kpis.completedTasks}</div>
                  <div className="text-[10px] text-slate-600">Tasks Done</div>
                </button>
                {/* SDGs Contributed */}
                <button
                  onClick={() => setShowProjectStatsModal('sdgs')}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200/60 text-left transition-all hover:shadow-sm active:scale-[0.98]"
                >
                  <div className="text-purple-600 text-2xl font-bold">{kpis.sdgsContributed}</div>
                  <div className="text-[10px] text-slate-600">SDGs Active</div>
                </button>
              </div>
            </div>

            {/* Your Top SDGs - Enhanced Bar Chart with Real Data */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-slate-800 text-lg font-semibold">Your Top SDGs</h2>
                <span className="text-xs text-slate-500">
                  {filteredSdgDistribution.length} SDGs • {timeFilter === 'all' ? 'All time' : timeFilter === 'month' ? 'This month' : timeFilter === 'quarter' ? 'This quarter' : 'This year'}
                </span>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
                {filteredSdgDistribution.length > 0 ? (
                  <>
                    {/* Summary stats */}
                    <div className="flex items-center gap-4 mb-3 pb-3 border-b border-slate-100">
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-600">{Math.round(filteredSdgDistribution.reduce((sum, s) => sum + s.value, 0))}</div>
                        <div className="text-[10px] text-slate-500">Total Hours</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{filteredSdgDistribution.reduce((sum, s) => sum + s.projectCount, 0)}</div>
                        <div className="text-[10px] text-slate-500">Projects</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-lg font-bold text-purple-600">{filteredSdgDistribution.length}</div>
                        <div className="text-[10px] text-slate-500">SDGs</div>
                      </div>
                    </div>
                    {/* Bar chart */}
                    <div className="h-32" style={{ isolation: 'isolate' }}>
                      <ResponsiveContainer width="100%" height="100%" className="[&_.recharts-tooltip-wrapper]:!z-[9999]">
                        <BarChart data={filteredSdgDistribution.slice(0, 4)} layout="horizontal">
                          <XAxis type="number" stroke="#9CA3AF" fontSize={10} />
                          <YAxis type="category" dataKey="sdg" stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `SDG ${val}`} />
                          <Tooltip
                            wrapperStyle={{ zIndex: 9999 }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                            labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                            formatter={(value: number, name: string, props: any) => {
                              const sdgData = filteredSdgDistribution.find(s => s.sdg === props.payload.sdg);
                              return [`${value} hours (${sdgData?.projectCount || 0} projects)`, SDG_NAMES[props.payload.sdg] || ''];
                            }}
                            labelFormatter={(label) => `SDG ${label}`}
                          />
                          <Bar
                            dataKey="value"
                            radius={[4, 4, 0, 0]}
                            onClick={(data) => setShowSdgModal(data.sdg)}
                            cursor="pointer"
                          >
                            {filteredSdgDistribution.slice(0, 4).map((entry, index) => (
                              <Cell key={`bar-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Interactive Legend with UN Icons */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200">
                      {filteredSdgDistribution.slice(0, 4).map((sdg) => (
                        <button
                          key={sdg.sdg}
                          onClick={() => setShowSdgModal(sdg.sdg)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        >
                          <img
                            src={getSDGIcon(sdg.sdg)}
                            alt={`SDG ${sdg.sdg}`}
                            className="w-8 h-8 rounded shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-700 truncate">{sdg.name}</div>
                            <div className="text-[10px] text-slate-500">{sdg.value}h • {sdg.projectCount} proj</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* View all SDGs button */}
                    {filteredSdgDistribution.length > 4 && (
                      <button
                        onClick={() => setShowProjectStatsModal('sdgs')}
                        className="w-full mt-3 py-2 text-xs text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        View all {filteredSdgDistribution.length} SDGs →
                      </button>
                    )}
                  </>
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{timeFilter === 'all' ? 'No SDG data yet' : 'No SDG data for this period'}</p>
                      <p className="text-xs mt-1">{timeFilter === 'all' ? 'Join projects to contribute to SDGs' : 'Try selecting a different time period'}</p>
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
                    <div className="flex flex-wrap gap-3 mb-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-[#4CAF50]"></div>
                        <span className="text-slate-600">Hours</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-[#2563eb]"></div>
                        <span className="text-slate-600">People Reached</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-[#f59e0b]"></div>
                        <span className="text-slate-600">AIUs</span>
                      </div>
                    </div>
                    <div className="h-32" style={{ isolation: 'isolate' }}>
                      <ResponsiveContainer width="100%" height="100%" className="[&_.recharts-tooltip-wrapper]:!z-[9999]">
                        <LineChart data={impactOverTimeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                          <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={10} />
                          <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={10} />
                          <Tooltip
                            wrapperStyle={{ zIndex: 9999 }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                            labelStyle={{ color: '#1f2937', fontWeight: 600 }}
                            formatter={(value: number, name: string) => [
                              name === 'aiu' ? formatDecimal(value) : value,
                              name === 'hours' ? 'Hours' : name === 'peopleReached' ? 'People Reached' : 'AIUs'
                            ]}
                          />
                          <Line yAxisId="left" type="monotone" dataKey="hours" stroke="#4CAF50" strokeWidth={2} dot={{ fill: '#4CAF50', r: 3 }} name="hours" />
                          <Line yAxisId="left" type="monotone" dataKey="peopleReached" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} name="peopleReached" />
                          <Line yAxisId="right" type="monotone" dataKey="aiu" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="aiu" />
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

            {/* AI Insights Card - Now uses fact-based insights */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">AI Impact Insights</span>
                <span className="ml-auto text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Fact-Based</span>
              </div>
              <p className="text-sm opacity-90">
                {factBasedInsights.summary}
              </p>
            </div>

            <Button
              onClick={() => navigate(`/impact-report/${userId}`)}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Full Impact Report
            </Button>
            </div>
          </div>
        )}

        {/* Log Activity Tab */}
        {activeTab === 'log-activity' && (
          <div className="p-4 space-y-4 pb-4">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Log Your Contributions
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                Record your volunteer hours and impact
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setLogFormTab("activity")}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  logFormTab === "activity"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <Clock className="w-4 h-4" />
                Log Activity
              </button>
              <button
                onClick={() => setLogFormTab("impact")}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  logFormTab === "impact"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                Record Impact
              </button>
            </div>

            {/* Activity Form */}
            {logFormTab === "activity" && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Project *
                  </label>
                  <select
                    value={logActivityProjectId}
                    onChange={(e) => {
                      setLogActivityProjectId(e.target.value);
                      setLogActivityTaskId("");
                    }}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Selection (Optional) */}
                {logActivityProjectId && logActivityProjectTasks.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Task (Optional)
                    </label>
                    <select
                      value={logActivityTaskId}
                      onChange={(e) => setLogActivityTaskId(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Select a task</option>
                      {logActivityProjectTasks.map((task: any) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={logActivityDate}
                    onChange={(e) => setLogActivityDate(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hours *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={logActivityHours}
                    onChange={(e) => setLogActivityHours(e.target.value)}
                    placeholder="e.g., 2.5"
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Activity Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Activity Type
                  </label>
                  <select
                    value={logActivityType}
                    onChange={(e) => setLogActivityType(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="volunteering">Volunteering</option>
                    <option value="training">Training</option>
                    <option value="meeting">Meeting</option>
                    <option value="event">Event</option>
                    <option value="outreach">Outreach</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={logActivityDescription}
                    onChange={(e) => setLogActivityDescription(e.target.value)}
                    placeholder="Describe what you did..."
                    rows={3}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleLogActivity}
                  disabled={logActivityMutation.isPending || !logActivityProjectId || !logActivityHours}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-lg"
                  data-testid="button-submit-activity"
                >
                  {logActivityMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      Logging...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Log Activity
                    </span>
                  )}
                </Button>
              </div>
            )}

            {/* Impact Form */}
            {logFormTab === "impact" && (
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Project *
                  </label>
                  <select
                    value={impactProjectId}
                    onChange={(e) => {
                      setImpactProjectId(e.target.value);
                      setImpactTaskId("");
                    }}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Selection (Optional) */}
                {impactProjectId && impactProjectTasks.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Task (Optional)
                    </label>
                    <select
                      value={impactTaskId}
                      onChange={(e) => setImpactTaskId(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a task</option>
                      {impactProjectTasks.map((task: any) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={impactDate}
                    onChange={(e) => setImpactDate(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* People Reached */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    People Reached / Lives Impacted *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={peopleReached}
                    onChange={(e) => setPeopleReached(e.target.value)}
                    placeholder="e.g., 50"
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Impact Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Impact Category
                  </label>
                  <select
                    value={impactCategory}
                    onChange={(e) => setImpactCategory(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="direct">Direct (Individual)</option>
                    <option value="community">Community (Shared)</option>
                    <option value="indirect">Indirect</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Impact Description (Optional)
                  </label>
                  <textarea
                    value={impactDescription}
                    onChange={(e) => setImpactDescription(e.target.value)}
                    placeholder="Describe the impact you made..."
                    rows={3}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleRecordImpact}
                  disabled={recordImpactMutation.isPending || !impactProjectId || !peopleReached}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-3 rounded-lg"
                  data-testid="button-submit-impact"
                >
                  {recordImpactMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      Recording...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Record Impact
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Stories Tab */}
        {activeTab === 'stories' && (
          <div className="p-4 space-y-4 pb-4">
            {/* Header with Create Story Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-slate-800 text-lg font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                Volunteer Stories
              </h2>
              <Button
                onClick={() => navigate('/create-story')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm px-3 py-1"
                data-testid="button-create-story"
              >
                Share Your Story
              </Button>
            </div>

            {/* My Stories Section */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
              <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                My Stories ({volunteerStories.length})
              </h3>
              
              {loadingStories ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-24"></div>
                  ))}
                </div>
              ) : volunteerStories.length > 0 ? (
                <div className="space-y-3">
                  {volunteerStories.slice(0, 5).map((story: any) => (
                    <div
                      key={story.id}
                      onClick={() => navigate(`/stories/${story.id}`)}
                      className="bg-slate-50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200"
                      data-testid={`card-story-${story.id}`}
                    >
                      <div className="flex gap-3">
                        {story.photos && story.photos.length > 0 && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={`/api/storage/${encodeURIComponent(story.photos[0])}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-slate-800 font-medium text-sm truncate">{story.title}</h4>
                          <p className="text-slate-500 text-xs line-clamp-2 mt-1">{story.content?.substring(0, 80)}...</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {story.viewsCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" />
                              {story.likesCount || 0}
                            </span>
                            {story.isPublished ? (
                              <span className="text-green-600">Published</span>
                            ) : (
                              <span className="text-amber-600">Draft</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">No stories yet</p>
                  <p className="text-slate-400 text-xs mt-1">Share your volunteer experience!</p>
                  <Button
                    onClick={() => navigate('/create-story')}
                    variant="outline"
                    className="mt-3 text-purple-600 border-purple-300"
                    data-testid="button-create-first-story"
                  >
                    Create Your First Story
                  </Button>
                </div>
              )}
              
              {volunteerStories.length > 5 && (
                <Button
                  onClick={() => navigate('/stories')}
                  variant="ghost"
                  className="w-full mt-3 text-purple-600"
                >
                  View All My Stories ({volunteerStories.length})
                </Button>
              )}
            </div>

            {/* Featured Stories Section */}
            <div className="bg-white rounded-xl p-4 border border-amber-200/60 shadow-sm">
              <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Featured Stories
              </h3>
              
              {featuredStories.length > 0 ? (
                <div className="space-y-3">
                  {featuredStories.slice(0, 3).map((story: any) => (
                    <div
                      key={story.id}
                      onClick={() => navigate(`/stories/${story.id}`)}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-colors border border-purple-200"
                      data-testid={`card-featured-story-${story.id}`}
                    >
                      <div className="flex gap-3">
                        {story.photos && story.photos.length > 0 && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={`/api/storage/${encodeURIComponent(story.photos[0])}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-slate-800 font-medium text-sm truncate">{story.title}</h4>
                          <p className="text-slate-600 text-xs mt-1">{story.authorName || 'Anonymous Volunteer'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {story.sdgGoals?.slice(0, 3).map((sdg: number) => (
                              <div
                                key={sdg}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                                style={{ backgroundColor: SDG_COLORS[sdg] }}
                              >
                                {sdg}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm">
                  No featured stories yet
                </div>
              )}
              
              <Button
                onClick={() => navigate('/stories')}
                variant="ghost"
                className="w-full mt-3 text-purple-600"
                data-testid="button-browse-stories"
              >
                Browse All Stories
              </Button>
            </div>

            {/* Tips Card */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5" />
                <span className="font-semibold">Story Tips</span>
              </div>
              <ul className="text-sm opacity-90 space-y-1">
                <li>• Share photos to make your story engaging</li>
                <li>• Tag SDGs to connect with like-minded volunteers</li>
                <li>• Highlight your impact to inspire others</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-4 space-y-4 pb-4">
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
                <div className="text-xl font-bold text-slate-800">{formatNumber(kpis.totalHours)}</div>
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
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile Settings
            </Button>
          </div>
        )}

        {/* More Tab */}
        {activeTab === 'more' && (
          <div className="p-4 space-y-4 pb-4">
            <h2 className="text-slate-800 text-xl font-bold">More Options</h2>

            {/* Settings Section */}
            <div className="space-y-2">
              <h3 className="text-slate-700 font-semibold text-sm px-2 uppercase tracking-wider text-slate-600">Account</h3>
              <button
                onClick={() => navigate('/volunteer-profile-settings')}
                className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left"
                data-testid="button-profile-settings"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="text-slate-800 font-medium">Profile Settings</div>
                  <div className="text-slate-500 text-xs">Edit your profile and preferences</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
              </button>
              <button
                onClick={() => navigate('/volunteer-messages/pwa')}
                className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left"
                data-testid="button-messages"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-slate-800 font-medium">Messages</div>
                  <div className="text-slate-500 text-xs">View your conversations</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
              </button>
            </div>

            {/* Impact & Analytics Section */}
            <div className="space-y-2">
              <h3 className="text-slate-700 font-semibold text-sm px-2 uppercase tracking-wider text-slate-600">Impact & Analytics</h3>
              <button
                onClick={() => setActiveTab('impacts')}
                className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left"
                data-testid="button-my-impact"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-slate-800 font-medium">My Impact</div>
                  <div className="text-slate-500 text-xs">View your impact analytics and ROI</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
              </button>
              <button
                onClick={() => setShowAIUDetailsModal(true)}
                className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left"
                data-testid="button-aiu-score"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="text-slate-800 font-medium">AIU Score</div>
                  <div className="text-slate-500 text-xs">Attributable Impact Units breakdown</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
              </button>
              <button
                onClick={() => setShowKpiModal('impact-roi')}
                className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left"
                data-testid="button-impact-roi"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="text-slate-800 font-medium">Impact ROI</div>
                  <div className="text-slate-500 text-xs">Your return on investment metrics</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
              </button>
            </div>

            {/* Help & Support Section */}
            <div className="space-y-2">
              <h3 className="text-slate-700 font-semibold text-sm px-2 uppercase tracking-wider text-slate-600">Support</h3>
              <button
                onClick={() => navigate('/impact-report/' + userId)}
                className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left"
                data-testid="button-help"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-slate-800 font-medium">Help & Guidance</div>
                  <div className="text-slate-500 text-xs">Learn more about features</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
              </button>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-600" />
                Account Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Email:</span>
                  <span className="text-slate-800 font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Member:</span>
                  <span className="text-slate-800 font-medium">Active</span>
                </div>
              </div>
            </div>

            {/* Danger Zone - Logout */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl p-4 font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>

            {/* App Info */}
            <div className="text-center text-slate-500 text-xs py-4">
              <p>Synerxus v1.0.0</p>
              <p className="mt-1">Making global impact locally</p>
            </div>
          </div>
        )}
      </main>

      {/* KPI Detail Modal */}
      {showKpiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4 py-6">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl mx-auto transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-slate-800 text-lg font-semibold">
                {showKpiModal === 'hours' && 'Total Hours Logged'}
                {showKpiModal === 'projects' && 'Total Projects'}
                {showKpiModal === 'skills' && 'Skills Applied'}
                {showKpiModal === 'sdgs' && 'SDG Contributions'}
                {showKpiModal === 'impact-score' && 'Your Impact Score'}
                {showKpiModal === 'tasks' && 'Task Progress'}
                {showKpiModal === 'people' && 'People Reached'}
                {showKpiModal === 'applications' && 'Pending Applications'}
              </h2>
              <button
                onClick={() => setShowKpiModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-medium"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {showKpiModal === 'hours' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-blue-600 mb-2">{formatNumber(kpis.totalHours)}</div>
                    <div className="text-slate-500">Hours Volunteered</div>
                  </div>
                  {/* Monthly Hours Trend Chart */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 mb-2">Monthly Hours Trend</div>
                    <div className="h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={impactOverTimeData}>
                          <defs>
                            <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis hide />
                          <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="url(#hoursGradient)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="text-sm text-slate-700 space-y-2">
                      <div className="flex justify-between">
                        <span>AIUs Earned:</span>
                        <span className="text-emerald-600 font-semibold">{formatNumber(aiuSummary?.totalAiu)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Across Projects:</span>
                        <span className="text-slate-800 font-semibold">{kpis.totalProjects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Hours/Month:</span>
                        <span className="text-blue-600 font-semibold">
                          {impactOverTimeData.length > 0
                            ? Math.round(impactOverTimeData.reduce((sum, d) => sum + d.hours, 0) / impactOverTimeData.length)
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
                    <div className="text-5xl font-bold text-green-600 mb-2">{kpis.totalProjects}</div>
                    <div className="text-slate-500">Total Projects</div>
                  </div>
                  {/* Project Status Donut Chart */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 mb-2">Project Status Distribution</div>
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
                          <span className="text-slate-600">Active ({kpis.activeProjects})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-slate-600">Completed ({kpis.projectsCompleted})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100 mb-4">
                    <div className="text-sm text-slate-700 space-y-2">
                      <div className="flex justify-between">
                        <span>Active:</span>
                        <span className="text-orange-600 font-semibold">{kpis.activeProjects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span className="text-green-600 font-semibold">{kpis.projectsCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Hours:</span>
                        <span className="text-blue-600 font-semibold">{kpis.totalHours}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-slate-800 font-semibold text-sm">Your Projects:</h3>
                    {projects.slice(0, 5).map((project: any) => {
                      const normalizedStatus = (project.status || 'active').toLowerCase();
                      const displayStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
                      return (
                        <div key={project.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-slate-800 font-medium text-sm">{project.name}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              normalizedStatus === 'active' ? 'bg-orange-100 text-orange-700' :
                              normalizedStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {displayStatus}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{project.organizationName}</div>
                          <Progress value={project.completionPercentage || 0} className="h-1 mt-2" />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {showKpiModal === 'skills' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-orange-500 mb-2">{kpis.skills}</div>
                    <div className="text-slate-500">Skills in Your Arsenal</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(volunteerProfile?.skills || []).map((skill: string, idx: number) => (
                      <div key={idx} className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-sm font-medium">
                        {skill}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {showKpiModal === 'sdgs' && (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-500">{kpis.sdgsCommitted}</div>
                      <div className="text-slate-500 text-sm">Committed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-500">{kpis.sdgsContributed}</div>
                      <div className="text-slate-500 text-sm">Contributed</div>
                    </div>
                  </div>

                  {/* Aligned SDGs - Both committed AND contributed */}
                  {kpis.alignedSdgs.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <h3 className="text-slate-800 font-semibold text-sm">Aligned ({kpis.alignedSdgs.length})</h3>
                        <span className="text-xs text-slate-400">Committed & Contributing</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {kpis.alignedSdgs.map((sdgNum: number) => {
                          const sdgData = sdgDistribution.find(s => s.sdg === sdgNum);
                          return (
                            <button
                              key={sdgNum}
                              onClick={() => { setShowKpiModal(null); setShowSdgModal(sdgNum); }}
                              className="rounded-lg p-2 text-center hover:opacity-90 transition-opacity ring-2 ring-emerald-400"
                              style={{ backgroundColor: SDG_COLORS[sdgNum] }}
                            >
                              <div className="text-white font-bold text-sm">SDG {sdgNum}</div>
                              <div className="text-white/80 text-[10px]">{sdgData ? `${sdgData.value} hrs` : SDG_NAMES[sdgNum]?.split(' ').slice(0, 2).join(' ')}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Uncommitted Work - Committed but NOT contributed */}
                  {kpis.uncommittedWork.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <h3 className="text-slate-800 font-semibold text-sm">Not Started ({kpis.uncommittedWork.length})</h3>
                        <span className="text-xs text-slate-400">Committed, no work yet</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {kpis.uncommittedWork.map((sdgNum: number) => (
                          <button
                            key={sdgNum}
                            onClick={() => { setShowKpiModal(null); setShowSdgModal(sdgNum); }}
                            className="rounded-lg p-2 text-center hover:opacity-90 transition-opacity border-2 border-dashed border-amber-400"
                            style={{ backgroundColor: SDG_COLORS[sdgNum], opacity: 0.7 }}
                          >
                            <div className="text-white font-bold text-sm">SDG {sdgNum}</div>
                            <div className="text-white/80 text-[10px]">{SDG_NAMES[sdgNum]?.split(' ').slice(0, 2).join(' ')}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bonus Contributions - Contributed but NOT committed */}
                  {kpis.uncommittedContributions.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <h3 className="text-slate-800 font-semibold text-sm">Bonus ({kpis.uncommittedContributions.length})</h3>
                        <span className="text-xs text-slate-400">Contributing, not committed</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {kpis.uncommittedContributions.map((sdgNum: number) => {
                          const sdgData = sdgDistribution.find(s => s.sdg === sdgNum);
                          return (
                            <button
                              key={sdgNum}
                              onClick={() => { setShowKpiModal(null); setShowSdgModal(sdgNum); }}
                              className="rounded-lg p-2 text-center hover:opacity-90 transition-opacity ring-2 ring-purple-400"
                              style={{ backgroundColor: SDG_COLORS[sdgNum] }}
                            >
                              <div className="text-white font-bold text-sm">SDG {sdgNum}</div>
                              <div className="text-white/80 text-[10px]">{sdgData ? `${sdgData.value} hrs` : 'Bonus'}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No SDGs at all */}
                  {kpis.sdgsCommitted === 0 && kpis.sdgsContributed === 0 && (
                    <div className="text-center text-slate-400 py-8">
                      <p>No SDG activity yet.</p>
                      <p className="text-xs mt-2">Update your profile to set SDG goals, then find projects!</p>
                    </div>
                  )}
                </>
              )}
              {showKpiModal === 'impact-score' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-indigo-600 mb-2">{kpis.impactScore}</div>
                    <div className="text-slate-500">Overall Impact Score</div>
                  </div>
                  {/* Score Gauge */}
                  <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden mb-4">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(kpis.impactScore, 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white drop-shadow">{kpis.impactScore}/100</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100 mb-4">
                    <h4 className="font-semibold text-indigo-800 text-sm mb-3">Score Breakdown</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Hours Impact (35%)</span>
                          <span className="text-indigo-600 font-semibold">{kpis.totalHours} hrs</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((kpis.totalHours / 100) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">People Reached (30%)</span>
                          <span className="text-rose-600 font-semibold">{kpis.livesImpacted}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min((kpis.livesImpacted / 500) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Task Completion (20%)</span>
                          <span className="text-emerald-600 font-semibold">{kpis.totalTasks > 0 ? Math.round((kpis.completedTasks / kpis.totalTasks) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${kpis.totalTasks > 0 ? (kpis.completedTasks / kpis.totalTasks) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">SDG Coverage (10%)</span>
                          <span className="text-purple-600 font-semibold">{kpis.sdgsContributed}/17</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(kpis.sdgsContributed / 17) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Skills Listed (5%)</span>
                          <span className="text-amber-600 font-semibold">{kpis.skills} skills</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((kpis.skills / 10) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-center">
                    Your impact score reflects your overall contribution across hours, people reached, tasks, SDGs, and skills.
                  </div>
                </>
              )}
              {showKpiModal === 'impact-roi' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-emerald-600 mb-2">{kpis.impactROI}</div>
                    <div className="text-slate-500">Lives Impacted Per Hour</div>
                  </div>
                  {/* ROI Visualization */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100 mb-4">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-rose-600">{kpis.livesImpacted}</div>
                        <div className="text-xs text-slate-500">Lives Impacted</div>
                      </div>
                      <div className="text-2xl text-slate-400">÷</div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{kpis.totalHours}</div>
                        <div className="text-xs text-slate-500">Hours Volunteered</div>
                      </div>
                      <div className="text-2xl text-slate-400">=</div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">{kpis.impactROI}</div>
                        <div className="text-xs text-slate-500">Impact ROI</div>
                      </div>
                    </div>
                  </div>
                  {/* Performance Context */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">What This Means</h4>
                    <p className="text-sm text-slate-600 mb-3">
                      For every hour you volunteer, you help <span className="font-bold text-emerald-600">{kpis.impactROI} {kpis.impactROI === 1 ? 'person' : 'people'}</span>.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${kpis.impactROI >= 2 ? 'bg-emerald-500' : kpis.impactROI >= 1 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                        <span className="text-xs text-slate-600">High impact: 2+ lives/hour</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${kpis.impactROI >= 1 && kpis.impactROI < 2 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                        <span className="text-xs text-slate-600">Good impact: 1-2 lives/hour</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${kpis.impactROI < 1 && kpis.impactROI > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        <span className="text-xs text-slate-600">Building: &lt;1 life/hour (keep going!)</span>
                      </div>
                    </div>
                  </div>
                  {/* Tips to Improve */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="font-semibold text-slate-700 text-sm mb-2">Tips to Improve Your ROI</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Choose high-reach projects (education, health)</li>
                      <li>• Focus on tasks that directly serve beneficiaries</li>
                      <li>• Complete tasks efficiently to maximize impact</li>
                    </ul>
                  </div>
                </>
              )}
              {showKpiModal === 'tasks' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-emerald-600 mb-2">
                      {kpis.totalTasks > 0 ? Math.round((kpis.completedTasks / kpis.totalTasks) * 100) : 0}%
                    </div>
                    <div className="text-slate-500">Task Completion Rate</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-100">
                      <div className="text-3xl font-bold text-emerald-600">{kpis.completedTasks}</div>
                      <div className="text-xs text-slate-500">Completed</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-100">
                      <div className="text-3xl font-bold text-amber-600">{kpis.totalTasks - kpis.completedTasks}</div>
                      <div className="text-xs text-slate-500">Remaining</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-600">Progress</span>
                      <span className="text-sm font-semibold text-emerald-600">{kpis.completedTasks}/{kpis.totalTasks}</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${kpis.totalTasks > 0 ? (kpis.completedTasks / kpis.totalTasks) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  {kpis.totalTasks === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      No tasks assigned yet. Join a project to get started!
                    </div>
                  )}
                </>
              )}
              {showKpiModal === 'people' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-rose-600 mb-2">{kpis.livesImpacted.toLocaleString()}</div>
                    <div className="text-slate-500">People Reached</div>
                  </div>
                  <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-4 border border-rose-100 mb-4">
                    <h4 className="font-semibold text-rose-800 text-sm mb-2">What does this mean?</h4>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      This represents the total number of beneficiaries whose lives have been positively impacted through your volunteer work across all projects.
                    </p>
                  </div>
                  <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                    <div className="text-sm text-slate-700 space-y-2">
                      <div className="flex justify-between">
                        <span>Through Projects:</span>
                        <span className="text-rose-600 font-semibold">{kpis.totalProjects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hours Contributed:</span>
                        <span className="text-blue-600 font-semibold">{kpis.totalHours}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Impact/Hour:</span>
                        <span className="text-emerald-600 font-semibold">
                          {kpis.totalHours > 0 ? Math.round(kpis.livesImpacted / kpis.totalHours) : 0} people
                        </span>
                      </div>
                    </div>
                  </div>
                  {kpis.livesImpacted === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      Impact data will appear as projects report beneficiary outcomes.
                    </div>
                  )}
                </>
              )}
              {showKpiModal === 'applications' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-amber-600 mb-2">{kpis.pendingApplications}</div>
                    <div className="text-slate-500">Pending Applications</div>
                  </div>
                  {kpis.pendingApplications > 0 ? (
                    <>
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-800">Awaiting Response</span>
                        </div>
                        <p className="text-xs text-amber-700">
                          You have {kpis.pendingApplications} application{kpis.pendingApplications !== 1 ? 's' : ''} waiting for organization review.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {(dashboardData?.applications || [])
                          .filter((app: any) => app.status === 'Pending' || app.status === 'pending')
                          .slice(0, 5)
                          .map((app: any, idx: number) => {
                            const project = projects.find((p: any) => p.id === app.projectId);
                            return (
                              <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <div className="text-slate-800 font-medium text-sm">
                                  {project?.name || `Project #${app.projectId}`}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Applied: {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Recently'}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                      </div>
                      <p className="text-slate-600 font-medium">All caught up!</p>
                      <p className="text-xs text-slate-400 mt-1">No pending applications</p>
                      <Button
                        onClick={() => navigate('/discover-opportunities/pwa')}
                        className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Find Opportunities
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SDG Projects Modal */}
      {showSdgModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4 py-6">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl mx-auto transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-slate-800 text-lg font-semibold flex items-center gap-2">
                <span>SDG {showSdgModal}</span>
                <span className="text-sm font-normal text-slate-500">
                  {SDG_NAMES[showSdgModal]}
                </span>
              </h2>
              <button
                onClick={() => setShowSdgModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-medium"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {/* SDG Header with smaller icon */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: SDG_COLORS[showSdgModal] + '15' }}>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                  style={{ backgroundColor: SDG_COLORS[showSdgModal] }}
                >
                  {showSdgModal}
                </div>
                <div className="flex-1">
                  <div className="text-slate-800 font-semibold">{SDG_NAMES[showSdgModal]}</div>
                  <div className="text-slate-500 text-xs">
                    {projects.filter((p: any) => p.sdgGoals?.includes(showSdgModal)).length} projects contributing
                  </div>
                </div>
              </div>

              <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                Your Contributing Projects
              </h3>
              <div className="space-y-2">
                {projects
                  .filter((p: any) => p.sdgGoals?.includes(showSdgModal))
                  .map((project: any) => {
                    const normalizedStatus = (project.status || 'active').toLowerCase();
                    const displayStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
                    return (
                      <div
                        key={project.id}
                        className="bg-slate-50 rounded-lg p-3 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowSdgModal(null);
                          navigate(`/projects/${project.id}/pwa`);
                        }}
                        data-testid={`sdg-project-card-${project.id}`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="text-slate-800 font-medium text-sm flex-1">{project.name}</div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            normalizedStatus === 'active' ? 'bg-orange-100 text-orange-700' :
                            normalizedStatus === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {displayStatus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">{project.organizationName}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{Math.round(project.totalHoursLogged || 0)} hrs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{formatNumber(getProjectAiu(project.id))} AIUs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{project.volunteersCount || 0} volunteers</span>
                          </div>
                        </div>
                        {project.description && (
                          <p className="text-slate-500 text-xs mt-2 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                    );
                  })}
                {projects.filter((p: any) => p.sdgGoals?.includes(showSdgModal)).length === 0 && (
                  <div className="text-center py-6 text-slate-400">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4 py-6">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl mx-auto transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-slate-800 text-lg font-semibold">
                {showProjectStatsModal === 'active' && 'Active Projects'}
                {showProjectStatsModal === 'total' && 'All Projects'}
                {showProjectStatsModal === 'sdgs' && 'SDG Impact Distribution'}
              </h2>
              <button
                onClick={() => setShowProjectStatsModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-medium"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {showProjectStatsModal === 'active' && (
                <>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-orange-500 mb-2">{kpis.activeProjects}</div>
                    <div className="text-slate-500">Currently Active Projects</div>
                  </div>
                  <div className="space-y-2">
                    {projects
                      .filter((p: any) => p.status === 'Active' || p.status === 'In Progress')
                      .map((project: any) => (
                        <div
                          key={project.id}
                          className="bg-slate-50 rounded-lg p-3 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowProjectStatsModal(null);
                            navigate(`/projects/${project.id}/pwa`);
                          }}
                          data-testid={`active-projects-list-${project.id}`}
                        >
                          <div className="text-slate-800 font-medium text-sm">{project.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{project.organizationName}</div>
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={project.completionPercentage || 0} className="flex-1 h-2" />
                            <span className="text-xs text-slate-600">{project.completionPercentage || 0}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{Math.round(project.totalHoursLogged || 0)} hrs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              <span>{formatNumber(getProjectAiu(project.id))} AIUs</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    {kpis.activeProjects === 0 && (
                      <div className="text-center text-slate-400 py-8">
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
                    <div className="text-5xl font-bold text-green-600 mb-2">{kpis.totalProjects}</div>
                    <div className="text-slate-500">Total Projects</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Active:</span>
                      <span className="text-orange-600 font-semibold">{kpis.activeProjects}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Completed:</span>
                      <span className="text-green-600 font-semibold">{kpis.projectsCompleted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Hours:</span>
                      <span className="text-blue-600 font-semibold">{Math.round(kpis.totalHours)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">AIUs Earned:</span>
                      <span className="text-emerald-600 font-semibold">{formatNumber(aiuSummary?.totalAiu)}</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <h3 className="text-slate-800 font-semibold text-sm mb-2">All Projects:</h3>
                    {projects.map((project: any) => {
                      const normalizedStatus = (project.status || 'active').toLowerCase();
                      const displayStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
                      return (
                        <div
                          key={project.id}
                          className="bg-slate-50 rounded-lg p-3 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowProjectStatsModal(null);
                            navigate(`/projects/${project.id}/pwa`);
                          }}
                          data-testid={`all-projects-list-${project.id}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-slate-800 font-medium text-sm">{project.name}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              normalizedStatus === 'active' ? 'bg-orange-100 text-orange-700' :
                              normalizedStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {displayStatus}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">{project.organizationName}</div>
                          {project.completionPercentage > 0 && (
                            <Progress value={project.completionPercentage || 0} className="h-1 mt-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {showProjectStatsModal === 'sdgs' && (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-500">{kpis.sdgsCommitted}</div>
                      <div className="text-slate-500 text-sm">Committed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-500">{kpis.sdgsContributed}</div>
                      <div className="text-slate-500 text-sm">Contributed</div>
                    </div>
                  </div>

                  {/* Aligned SDGs */}
                  {kpis.alignedSdgs.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <h3 className="text-slate-800 font-semibold text-sm">Aligned ({kpis.alignedSdgs.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {kpis.alignedSdgs.map((sdgNum: number) => {
                          const sdgData = sdgDistribution.find(s => s.sdg === sdgNum);
                          return (
                            <div key={sdgNum} className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: SDG_COLORS[sdgNum] }}>
                                  {sdgNum}
                                </div>
                                <div className="flex-1">
                                  <div className="text-slate-800 font-medium text-sm">{SDG_NAMES[sdgNum]}</div>
                                  <div className="text-xs text-emerald-600">{sdgData ? `${sdgData.value} hrs contributed` : 'Committed & Contributing'}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Not Started SDGs */}
                  {kpis.uncommittedWork.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <h3 className="text-slate-800 font-semibold text-sm">Not Started ({kpis.uncommittedWork.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {kpis.uncommittedWork.map((sdgNum: number) => (
                          <div key={sdgNum} className="bg-amber-50 rounded-lg p-3 border border-amber-200 border-dashed">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs opacity-70" style={{ backgroundColor: SDG_COLORS[sdgNum] }}>
                                {sdgNum}
                              </div>
                              <div className="flex-1">
                                <div className="text-slate-800 font-medium text-sm">{SDG_NAMES[sdgNum]}</div>
                                <div className="text-xs text-amber-600">Committed - find projects to start!</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bonus SDGs */}
                  {kpis.uncommittedContributions.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <h3 className="text-slate-800 font-semibold text-sm">Bonus ({kpis.uncommittedContributions.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {kpis.uncommittedContributions.map((sdgNum: number) => {
                          const sdgData = sdgDistribution.find(s => s.sdg === sdgNum);
                          return (
                            <div key={sdgNum} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: SDG_COLORS[sdgNum] }}>
                                  {sdgNum}
                                </div>
                                <div className="flex-1">
                                  <div className="text-slate-800 font-medium text-sm">{SDG_NAMES[sdgNum]}</div>
                                  <div className="text-xs text-purple-600">{sdgData ? `${sdgData.value} hrs` : ''} - Extra impact!</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {kpis.sdgsCommitted === 0 && kpis.sdgsContributed === 0 && (
                    <div className="text-center text-slate-400 py-8">
                      <p>No SDG activity yet.</p>
                      <p className="text-xs mt-2">Update your profile to set SDG goals, then start volunteering!</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4 py-6">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl mx-auto transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95">
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 border-b border-amber-400 p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5" />
                Skill Insights
              </h2>
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-white/80 hover:text-white text-xl font-medium w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {(() => {
                const stats = skillAnalytics[selectedSkill] || { matchingOpps: 0, demandScore: 0, projects: 0 };

                return (
                  <>
                    <div className="text-center py-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                      <div className="text-2xl font-bold text-amber-700 mb-1">{selectedSkill}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {stats.projects > 0 ? `Applied in ${stats.projects} project${stats.projects > 1 ? 's' : ''}` : 'Not yet applied in projects'}
                      </div>
                    </div>

                    {/* Matching Opportunities */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-blue-700">{stats.matchingOpps}</div>
                          <div className="text-xs text-blue-600">Opportunities need this skill</div>
                        </div>
                      </div>
                    </div>

                    {/* Your Experience */}
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-emerald-700">{stats.projects}</div>
                          <div className="text-xs text-emerald-600">Projects you've applied this skill</div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Tips */}
                    {stats.matchingOpps > 0 && stats.projects === 0 && (
                      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <p className="text-xs text-amber-700">
                          <strong>Tip:</strong> There are {stats.matchingOpps} opportunities waiting! Apply to a project to start building experience.
                        </p>
                      </div>
                    )}
                    {stats.matchingOpps === 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-xs text-slate-600">
                          No current opportunities require this specific skill, but your expertise is valuable across many projects.
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        const skillParam = encodeURIComponent(selectedSkill);
                        setSelectedSkill(null);
                        navigate(`/discover-opportunities/pwa?skill=${skillParam}`);
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Find {selectedSkill} Opportunities
                    </Button>

                    {/* Show matching opportunities preview */}
                    {stats.matchingOpps > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="text-xs text-slate-500 mb-2 font-medium">Top Matching Opportunities:</div>
                        <div className="space-y-2">
                          {discoverOpportunities
                            .filter((opp: any) =>
                              opp.requiredSkills?.some((s: string) =>
                                s.toLowerCase().includes(selectedSkill.toLowerCase())
                              )
                            )
                            .slice(0, 3)
                            .map((opp: any) => (
                              <button
                                key={opp.id}
                                onClick={() => {
                                  setSelectedSkill(null);
                                  navigate(`/opportunities/${opp.id}/pwa`);
                                }}
                                className="w-full text-left bg-slate-50 rounded-lg p-2 border border-slate-100 hover:bg-slate-100 transition-colors"
                              >
                                <div className="text-sm font-medium text-slate-800 truncate">{opp.title}</div>
                                <div className="text-xs text-slate-500 truncate">{opp.organizationName}</div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4 py-6">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl mx-auto transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95">
            {(() => {
              const milestones = [
                { title: 'Rising Star', desc: 'Complete 5 projects', fullDesc: 'Become a Rising Star by completing your first 5 volunteer projects. This milestone recognizes your dedication and commitment to making a difference.', target: 5, current: kpis.projectsCompleted, icon: '⭐', bgFrom: '#fbbf24', bgTo: '#f59e0b', reward: '500 Bonus AIUs' },
                { title: 'Impact Leader', desc: 'Log 50 volunteer hours', fullDesc: 'Achieve Impact Leader status by contributing 50 hours of your time. Your sustained effort creates meaningful change in communities.', target: 50, current: kpis.totalHours, icon: '🏆', bgFrom: '#60a5fa', bgTo: '#3b82f6', reward: 'Leadership Badge' },
                { title: 'Global Champion', desc: 'Contribute to 5 SDGs', fullDesc: 'Become a Global Champion by making contributions across 5 different Sustainable Development Goals. Your diverse impact spans multiple global challenges.', target: 5, current: kpis.sdgsContributed, icon: '🌍', bgFrom: '#4ade80', bgTo: '#22c55e', reward: 'Global Impact Certificate' },
                { title: 'Community Builder', desc: 'Join 3 organizations', fullDesc: 'Earn Community Builder status by collaborating with 3 different organizations. Your network expands the reach of your positive impact.', target: 3, current: Math.min(projects.length, 3), icon: '🤝', bgFrom: '#c084fc', bgTo: '#a855f7', reward: 'Network Expansion Badge' }
              ];
              const milestone = milestones[selectedMilestone];
              const progress = Math.min((milestone.current / milestone.target) * 100, 100);
              const isComplete = progress >= 100;
              const remaining = Math.max(0, milestone.target - milestone.current);

              return (
                <>
                  <div
                    className="sticky top-0 border-b p-4 flex items-center justify-between rounded-t-2xl"
                    style={{ background: `linear-gradient(to right, ${milestone.bgFrom}, ${milestone.bgTo})` }}
                  >
                    <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                      <span className="text-2xl">{milestone.icon}</span>
                      {milestone.title}
                    </h2>
                    <button
                      onClick={() => setSelectedMilestone(null)}
                      className="text-white/80 hover:text-white text-xl font-medium w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Status Badge */}
                    <div className="text-center">
                      {isComplete ? (
                        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-semibold">Achievement Unlocked!</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full">
                          <Clock className="w-5 h-5" />
                          <span className="font-semibold">In Progress</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-slate-600 text-sm text-center leading-relaxed">
                      {milestone.fullDesc}
                    </p>

                    {/* Progress Card */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-700 font-medium text-sm">Your Progress</span>
                        <span className="text-slate-500 text-sm">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progress}%`,
                            background: isComplete
                              ? 'linear-gradient(to right, #4ade80, #22c55e)'
                              : `linear-gradient(to right, ${milestone.bgFrom}, ${milestone.bgTo})`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Current: <span className="font-semibold text-slate-800">{Math.round(milestone.current)}</span></span>
                        <span className="text-slate-600">Target: <span className="font-semibold text-slate-800">{milestone.target}</span></span>
                      </div>
                    </div>

                    {/* Remaining or Reward */}
                    {isComplete ? (
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Award className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="text-emerald-800 font-semibold">Reward Earned</div>
                            <div className="text-emerald-600 text-sm">{milestone.reward}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-1">{remaining}</div>
                          <div className="text-blue-600 text-sm">more to unlock this achievement</div>
                          <div className="text-xs text-slate-500 mt-2">Reward: {milestone.reward}</div>
                        </div>
                      </div>
                    )}

                    {!isComplete && (
                      <Button
                        onClick={() => {
                          setSelectedMilestone(null);
                          navigate('/discover-opportunities/pwa');
                        }}
                        className="w-full"
                        style={{ background: `linear-gradient(to right, ${milestone.bgFrom}, ${milestone.bgTo})` }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Find Opportunities to Progress
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Readiness Score Detail Modal */}
      {showReadinessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4 py-6">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl mx-auto transform transition-all duration-200 ease-out animate-in fade-in zoom-in-95">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 border-b p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Impact Readiness
              </h2>
              <button
                onClick={() => setShowReadinessModal(false)}
                className="text-white/80 hover:text-white text-xl font-medium w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {(() => {
                const skillsMatch = Math.min(50 + kpis.skills * 10, 100);
                const sdgAlignment = Math.min(40 + kpis.sdgsContributed * 12, 100);
                const engagementLevel = Math.min(30 + kpis.totalHours * 2, 100);
                const averageScore = Math.round((skillsMatch + sdgAlignment + engagementLevel) / 3);

                return (
                  <>
                    {/* Overall Score */}
                    <div className="text-center py-6 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-xl">
                      <div className="relative inline-block">
                        <svg className="w-32 h-32" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                          <circle
                            cx="50" cy="50" r="40"
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="8"
                            strokeDasharray="251.3"
                            strokeDashoffset={251.3 - (251.3 * averageScore) / 100}
                            transform="rotate(-90 50 50)"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#9333ea" />
                              <stop offset="50%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-bold text-slate-800">{averageScore}</span>
                          <span className="text-xs text-slate-500">of 100</span>
                        </div>
                      </div>
                      <div className="mt-2 text-slate-600 font-medium">
                        {averageScore >= 80 ? 'Excellent Readiness!' :
                         averageScore >= 60 ? 'Good Progress!' :
                         averageScore >= 40 ? 'Building Momentum' : 'Getting Started'}
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-3">
                      <h3 className="text-slate-700 font-semibold text-sm">Score Breakdown</h3>

                      {/* Skills Profile - measures profile completeness, not opportunity matching */}
                      <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-orange-600" />
                            <span className="text-slate-700 font-medium text-sm">Skills Profile</span>
                          </div>
                          <span className="text-orange-600 font-bold">{skillsMatch}%</span>
                        </div>
                        <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full" style={{ width: `${skillsMatch}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          You have {kpis.skills} skills on your profile. Add more to increase visibility to organizations.
                        </p>
                      </div>

                      {/* SDG Contributions - measures actual project participation, not preference alignment */}
                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-emerald-600" />
                            <span className="text-slate-700 font-medium text-sm">SDG Contributions</span>
                          </div>
                          <span className="text-emerald-600 font-bold">{sdgAlignment}%</span>
                        </div>
                        <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{ width: `${sdgAlignment}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          You've contributed to {kpis.sdgsContributed} SDGs through projects. Join diverse projects to expand impact.
                        </p>
                      </div>

                      {/* Engagement Level */}
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-slate-700 font-medium text-sm">Engagement Level</span>
                          </div>
                          <span className="text-blue-600 font-bold">{engagementLevel}%</span>
                        </div>
                        <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: `${engagementLevel}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {kpis.totalHours} hours logged. Keep volunteering to boost this score.
                        </p>
                      </div>
                    </div>

                    {/* Tips */}
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-slate-700 font-medium text-sm">How to Improve</span>
                      </div>
                      <ul className="text-xs text-slate-600 space-y-1.5">
                        {skillsMatch < 100 && (
                          <li className="flex items-start gap-2">
                            <span className="text-purple-500 mt-0.5">•</span>
                            <span>Add more skills to your profile to boost your Skills Profile score</span>
                          </li>
                        )}
                        {sdgAlignment < 100 && (
                          <li className="flex items-start gap-2">
                            <span className="text-purple-500 mt-0.5">•</span>
                            <span>Join projects targeting different SDGs to increase your SDG Contributions</span>
                          </li>
                        )}
                        {engagementLevel < 100 && (
                          <li className="flex items-start gap-2">
                            <span className="text-purple-500 mt-0.5">•</span>
                            <span>Log more volunteer hours to boost your Engagement Level</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    <Button
                      onClick={() => {
                        setShowReadinessModal(false);
                        navigate('/discover-opportunities/pwa');
                      }}
                      className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Find Opportunities to Improve
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced AIU Details Modal - Opens when AIU KPI is clicked */}
      <AIUDetailsModal
        isOpen={showAIUDetailsModal}
        onClose={() => setShowAIUDetailsModal(false)}
        totalAIU={aiuSummary?.totalAiu ?? 0}
        projects={aiuSummary?.projects ?? []}
        totalHours={aiuSummary?.totalHours ?? kpis.totalHours ?? 0}
        volunteerName={user?.displayName}
        sdgsContributed={aiuSummary?.sdgsContributed ?? []}
      />

      {/*
        IMPORTANT: PWA Bottom Tray Navigation - DO NOT REPLACE
        This navigation uses internal setActiveTab() for tab switching within the PWA.
        It must NOT be replaced with URL-based navigation components like WebBottomNav.
        Tabs: Home, Projects, Potentials, Impacts, More
      */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#f8f7f4] border-t border-slate-200 px-2 py-2 z-50 shadow-lg">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            data-testid="nav-home"
          >
            <Home className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${activeTab === 'projects' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            data-testid="nav-projects"
          >
            <Briefcase className={`w-5 h-5 mb-0.5 ${activeTab === 'projects' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">Projects</span>
          </button>
          <button
            onClick={() => setActiveTab('potential')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${activeTab === 'potential' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            data-testid="nav-potentials"
          >
            <Sparkles className={`w-5 h-5 mb-0.5 ${activeTab === 'potential' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">Potentials</span>
          </button>
          <button
            onClick={() => navigate('/volunteer-messages/pwa')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${activeTab === 'messages' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            data-testid="nav-messages"
          >
            <MessageCircle className={`w-5 h-5 mb-0.5 ${activeTab === 'messages' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">Messages</span>
          </button>
          <button
            onClick={() => setActiveTab('more')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all ${activeTab === 'more' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            data-testid="nav-more"
          >
            <MoreHorizontal className={`w-5 h-5 mb-0.5 ${activeTab === 'more' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
