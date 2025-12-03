import { memo } from "react";
import { Link } from "wouter";
import { Users, CheckSquare, Clock, TrendingUp, ChevronDown, ChevronRight, MapPin, Target, Calendar, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EditProjectDialog, DeleteProjectDialog } from "./project-dialogs";
import { CreateTaskDialog, EditTaskDialog, DeleteTaskDialog } from "./task-dialogs";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Project, Task } from "@shared/schema";

const SDG_COLORS: { [key: number]: string } = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A"
};

interface ProjectMetrics {
  volunteers: number;
  totalCommitted: number;
  totalCompleted: number;
}

interface ProjectListCardProps {
  project: Project;
  tasks: Task[];
  metrics: ProjectMetrics;
  progress: number;
  isExpanded: boolean;
  onToggle: () => void;
  canManageProjects?: boolean;
}

export const ProjectListCard = memo(function ProjectListCard({
  project,
  tasks,
  metrics,
  progress,
  isExpanded,
  onToggle,
  canManageProjects = false
}: ProjectListCardProps) {
  const primarySdg = (project as any).primarySdg || ((project as any).sdgGoals?.[0]);
  const sdgGoals = (project as any).sdgGoals || [];

  return (
    <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden border-l-4" style={{ borderLeftColor: primarySdg ? SDG_COLORS[primarySdg] : '#6366f1' }}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="pb-3">
          {/* Top Row: Title, Status, Actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <CollapsibleTrigger asChild className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" data-testid={`button-toggle-project-${project.id}`}>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                  <CardTitle className="text-base md:text-lg hover:text-primary cursor-pointer transition-colors line-clamp-2" data-testid={`title-project-${project.id}`}>
                    {project.name}
                  </CardTitle>
                </Link>
              </div>
              
              {/* Status & Tags Row */}
              <div className="flex items-center gap-2 flex-wrap ml-0 md:ml-9">
                <StatusBadge status={project.status} />
                {(project as any).aiTrackingEnabled && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
                {(project as any).engagementType && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {(project as any).engagementType}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/projects/${project.id}`}>
                <Button variant="default" size="sm" className="text-xs h-8" data-testid={`button-view-project-${project.id}`}>
                  View
                </Button>
              </Link>
              {canManageProjects && (
                <div className="hidden md:flex items-center gap-1">
                  <EditProjectDialog project={project} />
                  <DeleteProjectDialog project={project} />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-sm text-muted-foreground mt-2 ml-0 md:ml-9 line-clamp-2">{project.description}</p>
          )}

          {/* Quick Info Row */}
          <div className="flex items-center gap-4 mt-3 ml-0 md:ml-9 text-xs text-muted-foreground flex-wrap">
            {(project as any).location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{(project as any).location}</span>
              </div>
            )}
            {(project as any).startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date((project as any).startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4 ml-0 md:ml-9">
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{metrics.volunteers}</span>
                <span className="text-xs text-blue-600/70 ml-1 hidden sm:inline">volunteers</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckSquare className="h-4 w-4 text-green-600" />
              <div>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">{tasks.length}</span>
                <span className="text-xs text-green-600/70 ml-1 hidden sm:inline">tasks</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Clock className="h-4 w-4 text-purple-600" />
              <div>
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">{metrics.totalCompleted}</span>
                <span className="text-xs text-purple-600/70 ml-1 hidden sm:inline">/{metrics.totalCommitted}h</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">{progress}%</span>
                <span className="text-xs text-orange-600/70 ml-1 hidden sm:inline">done</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 ml-0 md:ml-9">
            <Progress value={progress} className="h-2" />
          </div>

          {/* SDG Goals Preview */}
          {sdgGoals.length > 0 && (
            <div className="flex items-center gap-2 mt-3 ml-0 md:ml-9">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex gap-1 flex-wrap">
                {sdgGoals.slice(0, 5).map((sdg: number) => (
                  <div
                    key={sdg}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: SDG_COLORS[sdg] }}
                    title={`SDG ${sdg}`}
                  >
                    {sdg}
                  </div>
                ))}
                {sdgGoals.length > 5 && (
                  <Badge variant="outline" className="text-xs h-6">+{sdgGoals.length - 5}</Badge>
                )}
              </div>
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 border-t mt-2">
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Tasks ({tasks.length})</h3>
                {canManageProjects && <CreateTaskDialog projectId={project.id} />}
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {canManageProjects ? 'No tasks yet. Click "Add Task" to create one.' : 'No tasks assigned yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm truncate">{task.title}</h4>
                          <StatusBadge status={task.status} />
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {(task as any).estimatedHours && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {(task as any).estimatedHours}h
                            </span>
                          )}
                          {task.assigneeId && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Assigned
                            </span>
                          )}
                        </div>
                      </div>
                      {canManageProjects && (
                        <div className="flex items-center gap-1 ml-2">
                          <EditTaskDialog task={task} />
                          <DeleteTaskDialog task={task} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});
