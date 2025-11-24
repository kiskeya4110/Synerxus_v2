import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ListTodo, FolderKanban, CheckSquare, TrendingUp, Clock, Share2, Lightbulb, ArrowRight, Star, BarChart3, Users as UsersIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { User, Task, ProjectAssignment } from "@shared/schema";
import MyApplicationsPage from "./my-applications";
import AssignmentsPage from "./assignments";
import MyTasksPage from "./my-tasks";

export default function MyWork() {
  const [, setLocation] = useLocation();

  // Scroll to top when page loads
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);
  
  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    }
  });

  const userId = localStorage.getItem('currentUserId');
  const volunteerId = currentUser?.id;

  // Fetch dashboard data for consistent metrics
  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/dashboard/summary", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/dashboard/summary?userId=${id}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
    enabled: !!currentUser && !!currentUser.userType && !!userId
  });

  // Fetch volunteer's tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { volunteerId }],
    queryFn: async () => {
      const response = await fetch("/api/tasks");
      const allTasks = await response.json();
      return allTasks.filter((task: Task) => task.assigneeId === volunteerId);
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's project assignments
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", { volunteerId }],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's activities for real-time hours tracking
  const { data: volunteerActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities", { volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer profile for availability info
  const { data: volunteerProfile } = useQuery<any>({
    queryKey: ["/api/intake/volunteer-profile", { volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return null;
      const response = await fetch(`/api/intake/volunteer-profile?userId=${volunteerId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.volunteerProfile || data;
    },
    enabled: !!volunteerId
  });

  // Fetch organization data if user is org manager
  const { data: organization } = useQuery<any>({
    queryKey: ["/api/organizations", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/organizations/${currentUser.organizationId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!currentUser?.organizationId && currentUser?.userType === 'organization'
  });

  // Fetch organization projects
  const { data: orgProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(`/api/projects?organizationId=${currentUser.organizationId}`);
      return response.ok ? response.json() : [];
    },
    enabled: !!currentUser?.organizationId && currentUser?.userType === 'organization'
  });

  // Fetch all volunteers for organization
  const { data: orgVolunteers = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteers", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch("/api/volunteers");
      if (!response.ok) return [];
      const allVolunteers = await response.json();
      return allVolunteers.filter((v: any) => v.organizationId === currentUser.organizationId);
    },
    enabled: !!currentUser?.organizationId && currentUser?.userType === 'organization'
  });

  // Fetch all volunteer activities for organization
  const { data: orgActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch("/api/volunteer-activities");
      if (!response.ok) return [];
      const allActivities = await response.json();
      return allActivities.filter((a: any) => orgProjects.some(p => p.id === a.projectId));
    },
    enabled: !!currentUser?.organizationId && currentUser?.userType === 'organization'
  });

  // Fetch AI-matched opportunities for personalized recommendations
  const { data: matchedOpportunities = [] } = useQuery<any[]>({
    queryKey: ["/api/opportunities/matches", volunteerId],
    queryFn: async () => {
      if (!volunteerId || currentUser?.userType !== 'volunteer') return [];
      try {
        const response = await fetch(`/api/opportunities/matches?userId=${volunteerId}&threshold=50`);
        if (!response.ok) return [];
        const opportunities = await response.json();
        // Return top 4 matched opportunities for display
        return Array.isArray(opportunities) ? opportunities.slice(0, 4) : [];
      } catch (error) {
        console.error("Failed to fetch matched opportunities:", error);
        return [];
      }
    },
    enabled: !!volunteerId && currentUser?.userType === 'volunteer'
  });

  // Calculate KPIs
  const tasksByStatus = {
    todo: tasks.filter(t => t.status?.toLowerCase() === "todo" || t.status?.toLowerCase() === "pending"),
    inProgress: tasks.filter(t => t.status?.toLowerCase() === "in progress"),
    completed: tasks.filter(t => t.status?.toLowerCase() === "completed")
  };

  // Use backend-calculated hours for consistency with dashboard
  const totalHoursLogged = currentUser?.userType === 'volunteer' && dashboardData?.totalHours !== undefined 
    ? dashboardData.totalHours 
    : volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const totalHoursCommitted = projectAssignments.reduce((sum, a) => sum + (a.hoursCommitted || 0), 0);
  const hoursProgressPercentage = totalHoursCommitted > 0 
    ? Math.round((totalHoursLogged / totalHoursCommitted) * 100)
    : 0;

  const completedTaskCount = tasksByStatus.completed.length;
  const totalTaskCount = tasks.length;
  const taskCompletionPercentage = totalTaskCount > 0 
    ? Math.round((completedTaskCount / totalTaskCount) * 100)
    : 0;

  // Use backend-calculated project count for consistency with dashboard
  const activeProjectCount = currentUser?.userType === 'volunteer' && dashboardData?.activeProjects !== undefined
    ? dashboardData.activeProjects
    : projectAssignments.filter(a => a.status === 'active').length;

  // Calculate weekly capacity usage
  const weeklyCapacity = volunteerProfile?.weeklyAvailability || 0;
  const hoursCommitted = totalHoursCommitted;
  const capacityUsedPercentage = weeklyCapacity > 0 
    ? Math.round((hoursCommitted / weeklyCapacity) * 100)
    : 0;
  const hoursRemaining = Math.max(0, weeklyCapacity - hoursCommitted);

  // Calculate weekly hours to date (THIS WEEK only)
  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const weekStart = getWeekStart();
  const weeklyHoursLogged = volunteerActivities.reduce((sum, a) => {
    const activityDate = new Date(a.date);
    return activityDate >= weekStart ? sum + (a.hours || 0) : sum;
  }, 0);

  const weeklyCapacityUsedPercentage = weeklyCapacity > 0 
    ? Math.round((weeklyHoursLogged / weeklyCapacity) * 100)
    : 0;
  const weeklyHoursRemaining = Math.max(0, weeklyCapacity - weeklyHoursLogged);
  
  // Get initial tab from URL hash or default to applications
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'applications' || hash === 'assignments' || hash === 'tasks') {
        return hash;
      }
    }
    return 'applications';
  };

  const handleTabChange = (value: string) => {
    window.history.replaceState(null, '', `#${value}`);
  };

  // Generate personalized recommendations from AI-matched opportunities
  const generateRecommendations = () => {
    // Use real matched opportunities from AI algorithm
    if (!matchedOpportunities || matchedOpportunities.length === 0) {
      return [];
    }

    return matchedOpportunities.map((opportunity: any, index: number) => {
      // Extract match score (handle different API response formats)
      const matchScore = Math.round(opportunity.matchScore || opportunity.match_score || 0);
      
      // Extract key details about why this is a good match
      const reasons = opportunity.reasons || opportunity.matchReasons || [];
      const primaryReason = typeof reasons === 'string' 
        ? reasons 
        : Array.isArray(reasons) && reasons.length > 0
        ? reasons[0]
        : "AI matched for your profile";

      // Extract skills from the opportunity
      const skills = opportunity.requiredSkills 
        ? Array.isArray(opportunity.requiredSkills)
          ? opportunity.requiredSkills.slice(0, 2)
          : opportunity.requiredSkills.split(',').slice(0, 2).map((s: string) => s.trim())
        : opportunity.skills
        ? opportunity.skills.slice(0, 2)
        : [];

      // Select icon based on match score
      let icon = "⭐";
      if (matchScore >= 90) {
        icon = "🌟";
      } else if (matchScore >= 75) {
        icon = "⭐";
      } else if (matchScore >= 60) {
        icon = "✨";
      } else {
        icon = "👍";
      }

      // Generate description that emphasizes why this is a good fit
      const description = opportunity.description 
        ? opportunity.description.substring(0, 100) + (opportunity.description.length > 100 ? "..." : "")
        : `This opportunity aligns well with your profile and current availability`;

      return {
        id: opportunity.id || index,
        title: opportunity.title || opportunity.name || "New Opportunity",
        description: description,
        matchScore: matchScore,
        reason: primaryReason,
        skills: skills,
        icon: icon,
        opportunityId: opportunity.id,
        organizationName: opportunity.organizationName || opportunity.organization?.name || "Organization"
      };
    });
  };

  const personalizedRecommendations = generateRecommendations();

  // Calculate organization KPIs for org managers
  const isOrganizationManager = currentUser?.userType === 'organization';
  
  // Count active volunteers (those with project assignments)
  const activeVolunteerIds = new Set<number>();
  // Count volunteers with any project assignment
  projectAssignments.forEach((assignment: any) => {
    if (assignment.volunteerId) {
      activeVolunteerIds.add(assignment.volunteerId);
    }
  });
  // Also add volunteers with activities from org projects
  orgActivities.forEach(activity => {
    if (activity.userId) activeVolunteerIds.add(activity.userId);
  });
  const orgActiveVolunteers = Math.max(activeVolunteerIds.size, 0);
  
  const orgTotalProjects = orgProjects.length;
  const orgTotalHours = orgActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const orgCompletedProjects = orgProjects.filter(p => p.status?.toLowerCase() === 'completed').length;

  // Calculate Impact Leader (volunteer with most hours)
  const volunteerHoursMap = new Map<number, { hours: number; name: string }>();
  orgActivities.forEach(activity => {
    if (activity.userId) {
      const volunteer = orgVolunteers.find((v: any) => v.id === activity.userId);
      const key = activity.userId;
      if (volunteerHoursMap.has(key)) {
        const current = volunteerHoursMap.get(key)!;
        volunteerHoursMap.set(key, { 
          hours: current.hours + (activity.hours || 0),
          name: current.name 
        });
      } else {
        volunteerHoursMap.set(key, { 
          hours: activity.hours || 0,
          name: volunteer?.displayName || volunteer?.username || 'Unknown'
        });
      }
    }
  });
  
  const impactLeaderEntry = Array.from(volunteerHoursMap.entries())
    .sort((a, b) => b[1].hours - a[1].hours)[0];
  const impactLeaderName = impactLeaderEntry ? impactLeaderEntry[1].name : 'Not set';

  return (
    <div className="min-h-screen">
      <div className="p-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Work</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isOrganizationManager 
              ? "Manage your organization's volunteers and projects" 
              : "Manage your applications, assignments, and tasks in one place"
            }
          </p>
        </div>
        {isOrganizationManager ? (
          <Link href={`/organization-impact-report/${currentUser?.organizationId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Create Impact Report</span>
              <span className="sm:hidden">Report</span>
            </Button>
          </Link>
        ) : (
          <Link href={`/impact-report/${volunteerId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share Impact Report</span>
              <span className="sm:hidden">Impact</span>
            </Button>
          </Link>
        )}
      </div>

      {/* KPI Summary Row */}
      {isOrganizationManager ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Volunteers</p>
                  <p className="text-2xl font-bold">{orgActiveVolunteers}</p>
                  <p className="text-xs text-gray-500 mt-1">of {orgVolunteers.length} total</p>
                </div>
                <UsersIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Projects</p>
                  <p className="text-2xl font-bold">{orgTotalProjects}</p>
                  <p className="text-xs text-gray-500 mt-1">{orgCompletedProjects} completed</p>
                </div>
                <FolderKanban className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Hours Logged</p>
                  <p className="text-2xl font-bold">{orgTotalHours.toFixed(0)}h</p>
                  <p className="text-xs text-gray-500 mt-1">volunteer hours</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Volunteers</p>
                    <p className="text-2xl font-bold">{orgVolunteers.length}</p>
                    <p className="text-xs text-gray-500 mt-1">{orgActiveVolunteers} active</p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-blue-500" />
                </div>
                <Button variant="outline" size="sm" className="w-full justify-center gap-2 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20" data-testid="button-impact-leader">
                  <Star className="h-4 w-4" />
                  <span className="text-xs font-semibold">Leader: {impactLeaderName.substring(0, 10)}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasks Progress</p>
                  <p className="text-2xl font-bold">{completedTaskCount}/{totalTaskCount}</p>
                  <p className="text-xs text-gray-500 mt-1">{taskCompletionPercentage}% complete</p>
                </div>
                <CheckSquare className="h-8 w-8 text-gray-400" />
              </div>
              <Progress value={taskCompletionPercentage} className="mt-3 h-1" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Weekly Capacity</p>
                  <p className="text-2xl font-bold">{weeklyHoursLogged.toFixed(1)}/{weeklyCapacity}h</p>
                  <p className="text-xs text-gray-500 mt-1">this week • {weeklyHoursRemaining.toFixed(1)}h remaining</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
              <Progress value={weeklyCapacityUsedPercentage} className="mt-3 h-1" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Projects</p>
                  <p className="text-2xl font-bold">{activeProjectCount}</p>
                  <p className="text-xs text-gray-500 mt-1">active assignments</p>
                </div>
                <FolderKanban className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hours Logged</p>
                  <p className="text-2xl font-bold">{totalHoursLogged.toFixed(1)}/{totalHoursCommitted}</p>
                  <p className="text-xs text-gray-500 mt-1">{hoursProgressPercentage}% of target</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
              <Progress value={Math.min(hoursProgressPercentage, 100)} className="mt-3 h-1" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personalized Recommendations Section */}
      {personalizedRecommendations.length > 0 && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Personalized Opportunities for You</h2>
            <p className="text-xs text-gray-500 ml-auto">AI-matched based on your profile</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {personalizedRecommendations.map((rec: any) => (
              <Card key={rec.id} className="border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow cursor-pointer group" data-testid={`recommendation-${rec.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{rec.icon}</span>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                      <Star className="h-3 w-3 mr-1" />
                      {rec.matchScore}%
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                    {rec.organizationName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {rec.description}
                  </p>
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {rec.reason}
                    </p>
                    {rec.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {rec.skills.map((skill: string) => (
                          <Badge key={skill} variant="outline" className="text-xs py-0">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link href={`/discover-opportunities?opportunity=${rec.opportunityId}`}>
                    <Button variant="ghost" size="sm" className="w-full text-blue-600 dark:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950">
                      Explore <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isOrganizationManager ? (
        <div className="px-6 py-4 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-8">
            <BarChart3 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Organization Impact Reports
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Create comprehensive impact reports with organization-wide KPIs, volunteer statistics, and project achievements
            </p>
            <Link href={`/organization-impact-report/${currentUser?.organizationId}`}>
              <Button className="gap-2">
                <BarChart3 className="h-4 w-4" />
                View Full Impact Report
              </Button>
            </Link>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-left">Your Organization KPIs</h3>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Volunteers</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{orgVolunteers.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Active Projects</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{orgTotalProjects}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Total Volunteer Hours</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{orgTotalHours.toFixed(0)}h</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-gray-400">Completed Projects</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{orgCompletedProjects}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Tabs defaultValue={getInitialTab()} onValueChange={handleTabChange} className="w-full px-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="applications" className="flex items-center gap-2" data-testid="tab-applications">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Applications</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2" data-testid="tab-assignments">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2" data-testid="tab-tasks">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="-mx-6">
            <MyApplicationsPage />
          </TabsContent>

          <TabsContent value="assignments" className="-mx-6">
            <AssignmentsPage />
          </TabsContent>

          <TabsContent value="tasks" className="-mx-6">
            <MyTasksPage />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
