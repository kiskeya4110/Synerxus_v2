import { useState } from "react";
import { CalendarIcon, Edit, Eye, Building2, Clock, CheckSquare, TrendingUp, Users, Play, Target, BarChart3, MessageSquare, Share2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import { useAIUDisplay } from "@/hooks/use-feature-flags";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import { Skeleton } from "@/components/ui/skeleton";

// Skeleton loader that mirrors the actual card layout
export function ProjectCardSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/3 mb-2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3 mt-1" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 py-2 px-1 bg-stone-50 rounded-lg">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-4 w-10 mx-auto mb-1" />
            <Skeleton className="h-2 w-8 mx-auto" />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="flex justify-between mb-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="flex justify-between items-center mt-3">
        <Skeleton className="h-3 w-24" />
        <div className="flex -space-x-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="w-6 h-6 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

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
  // Navigation mode - when true, clicking card navigates directly instead of showing dialog
  navigateOnClick?: boolean;
  // PWA mode - determines which route to use for navigation
  isPWA?: boolean;
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
  showQuickActions = true,
  navigateOnClick = true,
  isPWA = false
}: ProjectCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isAIUEnabled = useAIUDisplay();
  const actualProjectId = projectId || id;
  const normalizedStatus = normalizeStatus(status);

  // Determine the project URL based on PWA mode
  const projectUrl = isPWA ? `/projects/${actualProjectId}/pwa` : `/projects/${actualProjectId}`;

  // Handle card click - navigate directly or show dialog
  const handleCardClick = () => {
    if (navigateOnClick && actualProjectId) {
      navigate(projectUrl);
    } else {
      setShowDialog(true);
    }
  };
  
  const getStatusBadgeClasses = () => {
    switch (normalizedStatus) {
      case "Planning":
        return "bg-blue-100 text-blue-800";
      case "In Progress":
        return "bg-green-100 text-green-800";
      case "Completed":
        return "bg-purple-100 text-purple-800";
      case "On Hold":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-stone-100 text-stone-800";
    }
  };

  // Quick action handlers
  const handleLogHours = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/log-activity?projectId=${actualProjectId}`);
  };

  const handleViewTasks = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${projectUrl}?tab=tasks`);
  };

  const handleViewImpact = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${projectUrl}?tab=impact`);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${projectUrl}`;
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
            <h3 className="font-semibold text-lg text-stone-900">{title}</h3>
          </div>
          {organizationName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Building2 className="w-3 h-3" />
              <span>{organizationName}</span>
            </div>
          )}
          <p className="text-stone-600 text-sm mt-1 line-clamp-2">{description}</p>
        </div>
        <Badge variant="outline" className={getStatusBadgeClasses()}>
          {normalizedStatus}
        </Badge>
      </div>

      {/* Mini KPI Stats Row */}
      <div className="grid grid-cols-4 gap-2 mt-3 py-2 px-1 bg-stone-50 rounded-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3 text-blue-500" />
            <span className="text-sm font-bold text-blue-600">{hoursLogged}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Hours Logged</span>
        </div>
        <div className="text-center border-l border-stone-200">
          <div className="flex items-center justify-center gap-1">
            <CheckSquare className="h-3 w-3 text-green-500" />
            <span className="text-sm font-bold text-green-600">{tasksCompleted}/{totalTasks}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Tasks</span>
        </div>
        <div className="text-center border-l border-stone-200">
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-600">{formatDecimal(aiuEarned)}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{isAIUEnabled ? "AIU" : "Score"}</span>
        </div>
        <div className="text-center border-l border-stone-200">
          <div className="flex items-center justify-center gap-1">
            <Users className="h-3 w-3 text-purple-500" />
            <span className="text-sm font-bold text-purple-600">{volunteers.length}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Team</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-stone-600">Progress</span>
          <span className="font-semibold text-stone-900">{progress}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time and Team Row */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="flex items-center text-stone-600">
          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs">{timeRemaining}</span>
        </div>

        <div className="flex -space-x-2">
          {volunteers.slice(0, 3).map((volunteer) => (
            <Avatar key={volunteer.id} className="w-6 h-6 border-2 border-white">
              <AvatarImage src={volunteer.avatar} alt={`${volunteer.name} avatar`} />
              <AvatarFallback className="text-[10px]">{volunteer.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
          {volunteers.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-stone-200 flex items-center justify-center text-[10px] font-medium">
              +{volunteers.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      {showQuickActions && (
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-stone-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex flex-col items-center gap-0.5 hover:bg-blue-50 hover:text-blue-600"
            onClick={handleLogHours}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Log</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex flex-col items-center gap-0.5 hover:bg-green-50 hover:text-green-600"
            onClick={handleViewTasks}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Tasks</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex flex-col items-center gap-0.5 hover:bg-emerald-50 hover:text-emerald-600"
            onClick={handleViewImpact}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Impact</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex flex-col items-center gap-0.5 hover:bg-purple-50 hover:text-purple-600"
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
        className="bg-white border border-stone-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 cursor-pointer group"
        onClick={handleCardClick}
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
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <CalendarIcon className="h-4 w-4" />
                <span>{timeRemaining}</span>
              </div>
            </div>

            {/* KPI Stats Grid - Enhanced */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded-xl text-center border border-blue-100">
                <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-blue-700">{hoursLogged}</div>
                <div className="text-xs text-blue-600/80">Hours Logged</div>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-center border border-green-100">
                <CheckSquare className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-green-700">{tasksCompleted}/{totalTasks}</div>
                <div className="text-xs text-green-600/80">Tasks Done</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-emerald-700">{formatDecimal(aiuEarned)}</div>
                <div className="text-xs text-emerald-600/80">{isAIUEnabled ? "AIU Earned" : "Impact Score"}</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-center border border-purple-100">
                <Users className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-purple-700">{volunteers.length}</div>
                <div className="text-xs text-purple-600/80">Team Size</div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
                onClick={(e) => { handleLogHours(e); setShowDialog(false); }}
              >
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-xs">Log Hours</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-green-50 hover:border-green-300"
                onClick={(e) => { handleViewTasks(e); setShowDialog(false); }}
              >
                <CheckSquare className="h-5 w-5 text-green-600" />
                <span className="text-xs">View Tasks</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-emerald-50 hover:border-emerald-300"
                onClick={(e) => { handleViewImpact(e); setShowDialog(false); }}
              >
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <span className="text-xs">Impact</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-purple-50 hover:border-purple-300"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5 text-purple-600" />
                <span className="text-xs">Share</span>
              </Button>
            </div>

            {/* Description */}
            <div className="p-4 bg-stone-50 rounded-xl">
              <h3 className="font-semibold text-sm text-stone-700 mb-2">About This Project</h3>
              <p className="text-sm text-stone-600">{description}</p>
            </div>

            {/* Progress */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Progress Tracking</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span className="font-semibold text-lg">{progress}%</span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-stone-200">
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
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                  <Target className="h-4 w-4 inline mr-1" />
                  SDG Alignment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sdgGoals.map((sdg) => (
                    <Badge
                      key={sdg}
                      className="text-white text-xs font-semibold border-0"
                      style={{ backgroundColor: getSDGColor(sdg) }}
                      title={getSDGName(sdg)}
                    >
                      SDG {sdg}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Volunteers */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                Team Members ({volunteers.length})
              </h3>
              {volunteers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {volunteers.map((volunteer) => (
                    <div key={volunteer.id} className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors">
                      <Avatar className="w-8 h-8 ring-2 ring-blue-200">
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
                <p className="text-sm text-muted-foreground">No team members assigned yet</p>
              )}
            </div>

            {/* Main Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              {actualProjectId && (
                <>
                  <Link href={projectUrl} className="flex-1">
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
