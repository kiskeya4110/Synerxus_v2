import { useState } from "react";
import { CalendarIcon, Edit, Eye, Building2, Clock, CheckSquare, TrendingUp, Users, Play, Target, BarChart3, MessageSquare, Share2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProjectCardProps {
  id?: string;
  projectId?: string;
  title: string;
  description: string;
  status: "Planning" | "In Progress" | "Completed" | "On Hold" | string;
  progress: number;
  timeRemaining: string;
  volunteers: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  organizationName?: string;
  organizationId?: number;
  // Additional metrics for enhanced display
  hoursLogged?: number;
  tasksCompleted?: number;
  totalTasks?: number;
  aiuEarned?: number;
  sdgGoals?: number[];
  showQuickActions?: boolean;
}

// Helper function to normalize and capitalize project status
function normalizeStatus(status: string): string {
  if (!status) return "Planning";
  
  const normalized = status.toLowerCase().trim();
  
  if (normalized === "in progress" || normalized === "active" || normalized === "inprogress") {
    return "In Progress";
  } else if (normalized === "completed" || normalized === "done") {
    return "Completed";
  } else if (normalized === "planning" || normalized === "planned") {
    return "Planning";
  } else if (normalized === "on hold" || normalized === "onhold" || normalized === "paused") {
    return "On Hold";
  }
  
  // Capitalize first letter of each word as fallback
  return status.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

export default function ProjectCard({
  id,
  projectId,
  title,
  description,
  status,
  progress,
  timeRemaining,
  volunteers,
  organizationName,
  organizationId,
  hoursLogged = 0,
  tasksCompleted = 0,
  totalTasks = 0,
  aiuEarned = 0,
  sdgGoals = [],
  showQuickActions = true
}: ProjectCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const actualProjectId = projectId || id;
  const normalizedStatus = normalizeStatus(status);
  
  const getStatusBadgeClasses = () => {
    switch (normalizedStatus) {
      case "Planning":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      case "In Progress":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Completed":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400";
      case "On Hold":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  // Quick action handlers
  const handleLogHours = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/log-activity?projectId=${actualProjectId}`);
  };

  const handleViewTasks = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/projects/${actualProjectId}?tab=tasks`);
  };

  const handleViewImpact = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/projects/${actualProjectId}?tab=impact`);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/projects/${actualProjectId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Project link has been copied to clipboard",
    });
  };

  const CardContent = () => (
    <>
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{title}</h3>
          </div>
          {organizationName && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Building2 className="w-3 h-3" />
              <span>{organizationName}</span>
            </div>
          )}
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">{description}</p>
        </div>
        <Badge variant="outline" className={getStatusBadgeClasses()}>
          {normalizedStatus}
        </Badge>
      </div>

      {/* Mini KPI Stats Row */}
      <div className="grid grid-cols-4 gap-2 mt-3 py-2 px-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3 text-blue-500" />
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{hoursLogged}</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Hours</span>
        </div>
        <div className="text-center border-l border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-1">
            <CheckSquare className="h-3 w-3 text-green-500" />
            <span className="text-sm font-bold text-green-600 dark:text-green-400">{tasksCompleted}/{totalTasks}</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Tasks</span>
        </div>
        <div className="text-center border-l border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{aiuEarned.toFixed(2)}</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">AIU</span>
        </div>
        <div className="text-center border-l border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-1">
            <Users className="h-3 w-3 text-purple-500" />
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{volunteers.length}</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Team</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600 dark:text-gray-400">Progress</span>
          <span className="font-semibold text-gray-900 dark:text-white">{progress}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time and Team Row */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">{timeRemaining}</span>
        </div>

        <div className="flex -space-x-2">
          {volunteers.slice(0, 3).map((volunteer) => (
            <Avatar key={volunteer.id} className="w-6 h-6 border-2 border-white dark:border-gray-800">
              <AvatarImage src={volunteer.avatar} alt={`${volunteer.name} avatar`} />
              <AvatarFallback className="text-[10px]">{volunteer.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
          {volunteers.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium">
              +{volunteers.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      {showQuickActions && (
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex flex-col items-center gap-0.5 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
            onClick={handleLogHours}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Log</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex flex-col items-center gap-0.5 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20"
            onClick={handleViewTasks}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Tasks</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex flex-col items-center gap-0.5 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
            onClick={handleViewImpact}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Impact</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex flex-col items-center gap-0.5 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20"
            onClick={handleShare}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>
        </div>
      )}
    </>
  );
  
  return (
    <>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-900/20 transition-all duration-300 cursor-pointer group"
        onClick={() => setShowDialog(true)}
        data-testid={`card-project-${actualProjectId || 'default'}`}
      >
        <CardContent />
      </div>

      {/* Project Details Dialog - Enhanced */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
            <DialogDescription>
              Project details and quick actions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Status Row */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                <Badge variant="outline" className={getStatusBadgeClasses()}>
                  {normalizedStatus}
                </Badge>
                {organizationName && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {organizationName}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CalendarIcon className="h-4 w-4" />
                <span>{timeRemaining}</span>
              </div>
            </div>

            {/* KPI Stats Grid - Enhanced */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{hoursLogged}</div>
                <div className="text-xs text-blue-600/80">Hours Logged</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-center border border-green-100 dark:border-green-800">
                <CheckSquare className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-green-700 dark:text-green-300">{tasksCompleted}/{totalTasks}</div>
                <div className="text-xs text-green-600/80">Tasks Done</div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center border border-emerald-100 dark:border-emerald-800">
                <TrendingUp className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{aiuEarned.toFixed(2)}</div>
                <div className="text-xs text-emerald-600/80">AIU Earned</div>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center border border-purple-100 dark:border-purple-800">
                <Users className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{volunteers.length}</div>
                <div className="text-xs text-purple-600/80">Team Size</div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20"
                onClick={(e) => { handleLogHours(e); setShowDialog(false); }}
              >
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-xs">Log Hours</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20"
                onClick={(e) => { handleViewTasks(e); setShowDialog(false); }}
              >
                <CheckSquare className="h-5 w-5 text-green-600" />
                <span className="text-xs">View Tasks</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-900/20"
                onClick={(e) => { handleViewImpact(e); setShowDialog(false); }}
              >
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <span className="text-xs">Impact</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5 text-purple-600" />
                <span className="text-xs">Share</span>
              </Button>
            </div>

            {/* Description */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">About This Project</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>

            {/* Progress */}
            <div>
              <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">Progress Tracking</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span className="font-semibold text-lg">{progress}%</span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* SDG Goals if available */}
            {sdgGoals && sdgGoals.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <Target className="h-4 w-4 inline mr-1" />
                  SDG Alignment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sdgGoals.map((sdg) => (
                    <Badge key={sdg} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      SDG {sdg}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Volunteers */}
            <div>
              <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-3">
                Team Members ({volunteers.length})
              </h3>
              {volunteers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {volunteers.map((volunteer) => (
                    <div key={volunteer.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Avatar className="w-8 h-8 ring-2 ring-blue-200 dark:ring-blue-700">
                        <AvatarImage src={volunteer.avatar} alt={`${volunteer.name} avatar`} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-sm">
                          {volunteer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{volunteer.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No team members assigned yet</p>
              )}
            </div>

            {/* Main Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              {actualProjectId && (
                <>
                  <Link href={`/projects/${actualProjectId}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2" data-testid="button-view-project" onClick={() => setShowDialog(false)}>
                      <Eye className="h-4 w-4" />
                      View Full Project
                    </Button>
                  </Link>
                  <Link href={`/projects/${actualProjectId}/edit`} className="flex-1">
                    <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700" data-testid="button-edit-project" onClick={() => setShowDialog(false)}>
                      <Edit className="h-4 w-4" />
                      Edit Project
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
