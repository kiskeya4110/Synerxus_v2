import { memo } from "react";
import { Link } from "wouter";
import { Users, CheckSquare, Clock, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EditProjectDialog, DeleteProjectDialog } from "./project-dialogs";
import { CreateTaskDialog, EditTaskDialog, DeleteTaskDialog } from "./task-dialogs";
import type { Project, Task } from "@shared/schema";

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
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
    case "in progress":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-gray-100 text-gray-800";
    case "planning":
      return "bg-blue-100 text-blue-800";
    case "on-hold":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTaskStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in progress":
      return "bg-blue-100 text-blue-800";
    case "todo":
    case "pending":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const ProjectListCard = memo(function ProjectListCard({
  project,
  tasks,
  metrics,
  progress,
  isExpanded,
  onToggle
}: ProjectListCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-toggle-project-${project.id}`}>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Link href={`/projects/${project.id}`}>
                  <CardTitle className="text-xl hover:text-primary cursor-pointer transition-colors" data-testid={`title-project-${project.id}`}>
                    {project.name}
                  </CardTitle>
                </Link>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/projects/${project.id}`}>
                <Button variant="outline" size="sm" data-testid={`button-view-project-${project.id}`}>
                  View Details
                </Button>
              </Link>
              <EditProjectDialog project={project} />
              <DeleteProjectDialog project={project} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 ml-11">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {metrics.volunteers} volunteer{metrics.volunteers !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{tasks.length} tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">
                {metrics.totalCompleted}/{metrics.totalCommitted} hrs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{progress}% complete</span>
            </div>
          </div>

          <div className="mt-3 ml-11">
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Tasks</h3>
                <CreateTaskDialog projectId={project.id} />
              </div>

              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tasks yet. Click "Add Task" to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge className={getTaskStatusColor(task.status)} variant="outline">
                            {task.status}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                        )}
                        {task.assigneeId && (
                          <span className="text-xs text-gray-500 mt-1 block">
                            Assigned to volunteer #{task.assigneeId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <EditTaskDialog task={task} />
                        <DeleteTaskDialog task={task} />
                      </div>
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
