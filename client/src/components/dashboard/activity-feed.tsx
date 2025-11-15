import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BellIcon, Clock, User, Target, FolderKanban, Building2 } from "lucide-react";
import { Link } from "wouter";

export interface Activity {
  id: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  isSystem?: boolean;
  action: string;
  target: string;
  time: string;
  projectName?: string;
  organizationName?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const getActivityLink = (activity: Activity) => {
    // Determine link based on activity type
    if (activity.target.includes("Project") || activity.target.includes("Initiative") || activity.target.includes("Program") || activity.target.includes("Outreach")) {
      return "/projects";
    }
    if (activity.target.includes("task") || activity.target.includes("Task")) {
      return "/tasks";
    }
    if (activity.target.includes("report") || activity.target.includes("Report")) {
      return "/impact-storytelling";
    }
    return "/dashboard";
  };

  return (
    <Card>
      <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-700 p-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No recent activity
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {activities.map((activity) => (
                <div 
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="flex hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-1 px-1 py-1 rounded transition-colors cursor-pointer"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className="flex-shrink-0 mr-2">
                    {activity.isSystem ? (
                      <div className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <BellIcon className="h-3 w-3 text-primary-600 dark:text-primary-400" />
                      </div>
                    ) : (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={activity.user?.avatar} alt={`${activity.user?.name} avatar`} />
                        <AvatarFallback className="text-xs">{activity.user?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div>
                    <p className="text-xs leading-tight">
                      <span className="font-medium">
                        {activity.isSystem ? "System" : activity.user?.name}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400"> {activity.action} </span>
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link href="/dashboard" className="text-xs text-primary-600 dark:text-primary-400 hover:underline cursor-pointer inline-block" data-testid="link-view-all-activity">
                View all activity
              </Link>
            </div>
          </>
        )}
      </CardContent>

      {/* Activity Detail Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Activity Details</DialogTitle>
            <DialogDescription>
              View complete information about this activity
            </DialogDescription>
          </DialogHeader>
          
          {selectedActivity && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                {selectedActivity.isSystem ? (
                  <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <BellIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                ) : (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedActivity.user?.avatar} alt={`${selectedActivity.user?.name} avatar`} />
                    <AvatarFallback className="text-lg">{selectedActivity.user?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold">
                      {selectedActivity.isSystem ? "System" : selectedActivity.user?.name}
                    </span>
                  </div>
                  {selectedActivity.user?.id && (
                    <Badge variant="outline" className="mt-1">ID: {selectedActivity.user.id}</Badge>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Action</p>
                    <p className="text-base">{selectedActivity.action}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Target</p>
                    <p className="text-base font-semibold">{selectedActivity.target}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Time</p>
                    <p className="text-base">{selectedActivity.time}</p>
                  </div>
                </div>

                {selectedActivity.projectName && (
                  <div className="flex items-start gap-2">
                    <FolderKanban className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Project</p>
                      <p className="text-base font-semibold">{selectedActivity.projectName}</p>
                    </div>
                  </div>
                )}

                {selectedActivity.organizationName && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Organization</p>
                      <p className="text-base font-semibold">{selectedActivity.organizationName}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <Link href={getActivityLink(selectedActivity)}>
                  <a 
                    className="w-full inline-block text-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                    data-testid="button-view-related"
                  >
                    View Related Page
                  </a>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
