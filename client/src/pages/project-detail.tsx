import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Calendar, Edit, MapPin, Target, Users, TrendingUp, CheckCircle2, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { CompletionProgress } from "@/components/ui/completion-progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";

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

interface Project {
  id: number;
  name: string;
  description?: string;
  organizationId?: number;
  status: string;
  completionPercentage?: number;
  [key: string]: any;
}

interface Task {
  id: number;
  projectId: number;
  status: string;
  [key: string]: any;
}

interface VolunteerActivity {
  id: number;
  projectId: number;
  userId: number;
  hours: number;
  [key: string]: any;
}

interface ProjectImpact {
  id: number;
  projectId: number;
  value: number;
  [key: string]: any;
}

interface DBUser {
  id: number;
  userType?: string;
  organizationId?: number;
  [key: string]: any;
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : null;
  const userId = localStorage.getItem('currentUserId');

  // Fetch current user from database
  const { data: currentUser } = useQuery<DBUser>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId
  });

  const { data: project, isLoading: loadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
    enabled: !!projectId,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: volunteerActivities = [], isLoading: loadingActivities } = useQuery<VolunteerActivity[]>({
    queryKey: ["/api/volunteer-activities"],
  });

  const { data: projectImpacts = [], isLoading: loadingImpacts } = useQuery<ProjectImpact[]>({
    queryKey: ["/api/project-impacts"],
  });

  const { data: users = [] } = useQuery<DBUser[]>({
    queryKey: ["/api/users"],
  });
  
  // Check if current user can edit this project
  const canEditProject = currentUser?.userType === 'organization' && 
                        project?.organizationId === currentUser?.organizationId;

  if (!projectId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Invalid project ID</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Project not found</p>
            <Link href="/projects">
              <Button variant="outline" className="mt-4" data-testid="button-back-projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter data for this project
  const projectTasks = tasks.filter((t: any) => t.projectId === projectId);
  const projectActivities = volunteerActivities.filter((a: any) => a.projectId === projectId);
  const projectImpact = projectImpacts.filter((i: any) => i.projectId === projectId);

  // Calculate statistics
  const completedTasks = projectTasks.filter((t: any) => t.status === "Completed").length;
  const totalHours = projectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
  const uniqueVolunteers = new Set(projectActivities.map((a: any) => a.userId)).size;
  const totalImpact = projectImpact.reduce((sum: number, i: any) => sum + (i.value || 0), 0);

  // Calculate completion percentage
  const completionPercentage = project.completionPercentage ?? 
    (projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Planning":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      case "In Progress":
      case "Active":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Completed":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
      case "On Hold":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Professional Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/30" data-testid="button-back-to-projects">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white" data-testid="text-project-title">{project.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Project Details & Progress</p>
            </div>
          </div>
          {canEditProject && (
            <Link href={`/projects/${projectId}/edit`}>
              <Button className="gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-lg" data-testid="button-edit-project-detail">
                <Edit className="h-4 w-4" />
                Edit Project
              </Button>
            </Link>
          )}
        </div>

        {/* Main Content Card */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
          <CardContent className="p-6 sm:p-8 space-y-8">
            {/* Header Section */}
            <div className="border-b pb-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                {/* Left: Project Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={project.status} />
                    {project.aiTrackingEnabled && (
                      <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        AI Tracking
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{project.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {project.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{project.location}</span>
                      </div>
                    )}
                    {project.startDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{format(new Date(project.startDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Completion Progress */}
                <div className="lg:w-72 space-y-4 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Completion</span>
                      <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{completionPercentage}%</span>
                    </div>
                    <CompletionProgress value={completionPercentage} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center pt-3 border-t border-emerald-200 dark:border-emerald-700">
                    <div>
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedTasks}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{projectTasks.length}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Tasks</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards - 4 Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Users, label: "Volunteers", value: uniqueVolunteers, color: "blue" },
                { icon: Clock, label: "Total Hours", value: totalHours, color: "green" },
                { icon: CheckCircle2, label: "Tasks Done", value: completedTasks, color: "purple" },
                { icon: Target, label: "Impact Score", value: totalImpact, color: "orange" },
              ].map((stat, idx) => (
                <div key={idx} className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all hover:border-gray-300 dark:hover:border-gray-600">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-${stat.color}-50 dark:bg-${stat.color}-900/30`}>
                      <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Requirements & Details */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-xl font-semibold">Project Requirements & Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-8">
            {/* Skills Section */}
            {(project.requiredSkills?.length > 0 || project.optionalSkills?.length > 0) && (
              <div className="space-y-6">
                {project.requiredSkills && project.requiredSkills.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                      Required Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {project.requiredSkills.map((skill: string, index: number) => (
                        <Badge key={index} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 text-white">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {project.optionalSkills && project.optionalSkills.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                      Optional Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {project.optionalSkills.map((skill: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-gray-700 dark:text-gray-300">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {project.experienceLevel && (
                <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Experience Level</h4>
                  <p className="text-base font-medium text-gray-900 dark:text-white capitalize">{project.experienceLevel}</p>
                </div>
              )}
              {project.engagementType && (
                <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Engagement Type</h4>
                  <p className="text-base font-medium text-gray-900 dark:text-white capitalize">{project.engagementType}</p>
                </div>
              )}
              {project.commitmentType && (
                <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Commitment Type</h4>
                  <p className="text-base font-medium text-gray-900 dark:text-white capitalize">{project.commitmentType}</p>
                </div>
              )}
            </div>

            {/* Time Commitment */}
            {(project.ongoingHoursPerWeek || project.projectTotalHours) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {project.ongoingHoursPerWeek && (
                  <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Hours Per Week</h4>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{project.ongoingHoursPerWeek} hours/week</p>
                  </div>
                )}
                {project.projectTotalHours && (
                  <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Project Hours</h4>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{project.projectTotalHours} hours</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SDG Goals Section */}
        {project.sdgGoals && project.sdgGoals.length > 0 && (
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                All Sustainable Development Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-3">
                {[...project.sdgGoals].sort((a, b) => a - b).map((sdg: number) => (
                  <div
                    key={sdg}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: SDG_COLORS[sdg] }}
                  >
                    <span className="font-bold text-lg">#{sdg}</span>
                    <span className="text-sm">{SDG_NAMES[sdg]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs Section */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-800">
          <Tabs defaultValue="tasks" className="w-full">
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
                <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 text-gray-600 dark:text-gray-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">Tasks</TabsTrigger>
                <TabsTrigger value="volunteers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 text-gray-600 dark:text-gray-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">Team</TabsTrigger>
                <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 text-gray-600 dark:text-gray-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">Activity</TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-6 sm:p-8">
              <TabsContent value="tasks" className="mt-0">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Project Tasks</h3>
                  {projectTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No tasks yet</p>
                  ) : (
                    <div className="space-y-3">
                      {projectTasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                          data-testid={`task-item-${task.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">
                              {task.status === "Completed" ? "Done" : task.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="volunteers" className="mt-0">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Team Members ({uniqueVolunteers})</h3>
                  {uniqueVolunteers === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No volunteers yet</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from(new Set(projectActivities.map((a: any) => a.userId))).map((userId: any) => {
                        const user = users.find((u: any) => u.id === userId);
                        const userActivities = projectActivities.filter((a: any) => a.userId === userId);
                        const userHours = userActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
                        
                        return (
                          <div key={userId} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage src={user?.avatar} />
                              <AvatarFallback className="bg-blue-600 text-white">{user?.displayName?.[0] || "V"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{user?.displayName || `Volunteer #${userId}`}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{userHours} hours logged</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                  {projectActivities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No activity yet</p>
                  ) : (
                    <div className="space-y-4">
                      {projectActivities.slice(0, 10).map((activity: any) => (
                        <div key={activity.id} className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{activity.description || "Activity logged"}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {activity.hours} hours</span>
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(activity.date), "MMM d, yyyy")}</span>
                            </div>
                            {activity.skillsApplied && activity.skillsApplied.length > 0 && (
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {activity.skillsApplied.map((skill: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
