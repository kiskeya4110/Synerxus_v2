import { useState } from "react";
import { CalendarIcon, Edit, Eye, Building2 } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  organizationId
}: ProjectCardProps) {
  const [showDialog, setShowDialog] = useState(false);
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

  const CardContent = () => (
    <>
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-lg">{title}</h3>
          </div>
          {organizationName && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Building2 className="w-3 h-3" />
              <span>{organizationName}</span>
            </div>
          )}
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{description}</p>
        </div>
        <Badge variant="outline" className={getStatusBadgeClasses()}>
          {normalizedStatus}
        </Badge>
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          {/* Completed portion - Green */}
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
          {/* Remaining portion overlay - Lighter color to show remaining work */}
          <div 
            className="absolute top-0 right-0 h-full bg-amber-100 dark:bg-amber-900/30 transition-all duration-500"
            style={{ width: `${100 - progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1 text-gray-500 dark:text-gray-400">
          <span>Completed: {progress}%</span>
          <span>Remaining: {100 - progress}%</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-4 text-sm">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <CalendarIcon className="h-4 w-4 mr-1" />
          <span>{timeRemaining}</span>
        </div>
        
        <div className="flex -space-x-2">
          {volunteers.slice(0, 3).map((volunteer) => (
            <Avatar key={volunteer.id} className="w-7 h-7 border-2 border-white dark:border-gray-800">
              <AvatarImage src={volunteer.avatar} alt={`${volunteer.name} avatar`} />
              <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ))}
          {volunteers.length > 3 && (
            <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
              +{volunteers.length - 3}
            </div>
          )}
        </div>
      </div>
    </>
  );
  
  return (
    <>
      <div 
        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-500 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => setShowDialog(true)}
        data-testid={`card-project-${actualProjectId || 'default'}`}
      >
        <CardContent />
      </div>

      {/* Project Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{title}</DialogTitle>
            <DialogDescription>
              Project details and management options
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Status and Progress */}
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

            {/* Description */}
            <div>
              <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">Description</h3>
              <p className="text-base">{description}</p>
            </div>

            {/* Progress */}
            <div>
              <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-2">Progress Tracking</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Completion</span>
                  <span className="font-semibold text-lg">{progress}%</span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  {/* Completed portion - Green */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Remaining portion - Amber */}
                  <div 
                    className="absolute top-0 right-0 h-full bg-gradient-to-r from-amber-300 to-amber-400 dark:from-amber-600 dark:to-amber-700 transition-all duration-500"
                    style={{ width: `${100 - progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
                    <div className="text-xs">
                      <div className="text-gray-500 dark:text-gray-400">Completed</div>
                      <div className="font-semibold">{progress}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 dark:from-amber-600 dark:to-amber-700"></div>
                    <div className="text-xs">
                      <div className="text-gray-500 dark:text-gray-400">Remaining</div>
                      <div className="font-semibold">{100 - progress}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Volunteers */}
            <div>
              <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 mb-3">
                Team Members ({volunteers.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {volunteers.map((volunteer) => (
                  <div key={volunteer.id} className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={volunteer.avatar} alt={`${volunteer.name} avatar`} />
                      <AvatarFallback>{volunteer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{volunteer.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
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
                    <Button className="w-full gap-2" data-testid="button-edit-project" onClick={() => setShowDialog(false)}>
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
