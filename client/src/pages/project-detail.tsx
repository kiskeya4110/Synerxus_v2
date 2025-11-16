import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Calendar, Edit, MapPin, Target, Users, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

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
  // Only organization users who own the project can edit it
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

  // Calculate completion percentage (use manual if set, otherwise calculate from tasks)
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
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm" data-testid="button-back-to-projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-project-title">{project.name}</h1>
            <p className="text-muted-foreground mt-1">Project Details & Progress</p>
          </div>
        </div>
        {canEditProject && (
          <Link href={`/projects/${projectId}/edit`}>
            <Button className="gap-2 w-full sm:w-auto" data-testid="button-edit-project-detail">
              <Edit className="h-4 w-4" />
              Edit Project
            </Button>
          </Link>
        )}
      </div>

      {/* Status and Key Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={project.status} />
                {project.aiTrackingEnabled && (
                  <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    AI Tracking
                  </Badge>
                )}
              </div>
              
              <p className="text-base text-muted-foreground">{project.description}</p>

              <div className="grid grid-cols-2 gap-4">
                {project.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{project.location}</span>
                  </div>
                )}
                {project.startDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(project.startDate), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="lg:w-64 space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Completion</span>
                  <span className="text-2xl font-bold text-primary">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-center pt-3 border-t">
                <div>
                  <div className="text-2xl font-bold text-primary">{completedTasks}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{projectTasks.length}</div>
                  <div className="text-xs text-muted-foreground">Total Tasks</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{uniqueVolunteers}</div>
                <div className="text-sm text-muted-foreground">Volunteers</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalHours}</div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <CheckCircle2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedTasks}</div>
                <div className="text-sm text-muted-foreground">Tasks Done</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/30">
                <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalImpact}</div>
                <div className="text-sm text-muted-foreground">Impact Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Requirements & Details from Intake Form */}
      <Card>
        <CardHeader>
          <CardTitle>Project Requirements & Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Skills Required */}
          {project.requiredSkills && project.requiredSkills.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {project.requiredSkills.map((skill: string, index: number) => (
                  <Badge key={index} variant="default">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Optional Skills */}
          {project.optionalSkills && project.optionalSkills.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Optional Skills</h3>
              <div className="flex flex-wrap gap-2">
                {project.optionalSkills.map((skill: string, index: number) => (
                  <Badge key={index} variant="outline">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Experience Level, Engagement Type, Commitment Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {project.experienceLevel && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Experience Level</h3>
                <p className="text-base capitalize">{project.experienceLevel}</p>
              </div>
            )}
            {project.engagementType && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Engagement Type</h3>
                <p className="text-base capitalize">{project.engagementType}</p>
              </div>
            )}
            {project.commitmentType && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Commitment Type</h3>
                <p className="text-base capitalize">{project.commitmentType}</p>
              </div>
            )}
          </div>

          {/* Time Commitment */}
          {(project.ongoingHoursPerWeek || project.projectTotalHours) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.ongoingHoursPerWeek && (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Hours Per Week</h3>
                  <p className="text-base">{project.ongoingHoursPerWeek} hours/week</p>
                </div>
              )}
              {project.projectTotalHours && (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Project Hours</h3>
                  <p className="text-base">{project.projectTotalHours} hours</p>
                </div>
              )}
            </div>
          )}

          {/* Impact Metric */}
          {(project.impactMetricName || project.impactMetricUnit) && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-muted-foreground">Impact Metric</h3>
              <p className="text-base">
                {project.impactMetricName} 
                {project.impactMetricUnit && ` (measured in ${project.impactMetricUnit})`}
              </p>
            </div>
          )}

          {/* Primary SDG */}
          {project.primarySdg && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Primary SDG Goal</h3>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: SDG_COLORS[project.primarySdg] }}
              >
                <span className="font-bold">#{project.primarySdg}</span>
                <span className="text-sm">{SDG_NAMES[project.primarySdg]}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SDG Goals */}
      {project.sdgGoals && project.sdgGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              All Sustainable Development Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[...project.sdgGoals].sort((a, b) => a - b).map((sdg: number) => (
                <div
                  key={sdg}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: SDG_COLORS[sdg] }}
                >
                  <span className="font-bold">#{sdg}</span>
                  <span className="text-sm">{SDG_NAMES[sdg]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed information */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="volunteers">Team</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {projectTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tasks yet</p>
              ) : (
                <div className="space-y-3">
                  {projectTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`task-item-${task.id}`}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volunteers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({uniqueVolunteers})</CardTitle>
            </CardHeader>
            <CardContent>
              {uniqueVolunteers === 0 ? (
                <p className="text-center text-muted-foreground py-8">No volunteers yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(new Set(projectActivities.map((a: any) => a.userId))).map((userId: any) => {
                    const user = users.find((u: any) => u.id === userId);
                    const userActivities = projectActivities.filter((a: any) => a.userId === userId);
                    const userHours = userActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
                    
                    return (
                      <div key={userId} className="flex items-center gap-3 p-4 border rounded-lg">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user?.avatar} />
                          <AvatarFallback>{user?.displayName?.[0] || "V"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user?.displayName || `Volunteer #${userId}`}</p>
                          <p className="text-sm text-muted-foreground">{userHours} hours logged</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {projectActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {projectActivities.slice(0, 10).map((activity: any) => (
                    <div key={activity.id} className="flex gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{activity.description || "Activity logged"}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{activity.hours} hours</span>
                          <span>{format(new Date(activity.date), "MMM d, yyyy")}</span>
                        </div>
                        {activity.skillsApplied && activity.skillsApplied.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {activity.skillsApplied.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
