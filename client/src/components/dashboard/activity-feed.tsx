import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BellIcon, Clock, User, Target, FolderKanban, Building2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { StaggerContainer, StaggerItem } from "@/components/ui/animated-container";

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
  verificationStatus?: 'pending' | 'approved' | 'rejected' | 'self_reported';
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
      <CardHeader className="pb-2 border-b border-stone-200 p-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <>
            <StaggerContainer className="space-y-2">
              {activities.map((activity) => (
                <StaggerItem key={activity.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedActivity(activity)}
                    className="flex w-full text-left hover:bg-stone-50 -mx-1 px-1 py-1 rounded transition-all duration-200 cursor-pointer hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
                    data-testid={`activity-item-${activity.id}`}
                  >
                  <div className="flex-shrink-0 mr-2">
                    {activity.isSystem ? (
                      <div className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center">
                        <BellIcon className="h-3 w-3 text-primary-600" />
                      </div>
                    ) : (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={activity.user?.avatar} alt={`${activity.user?.name} avatar`} />
                        <AvatarFallback className="text-xs">{activity.user?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs leading-tight">
                        <span className="font-medium">
                          {activity.isSystem ? "System" : activity.user?.name}
                        </span>
                        <span className="text-muted-foreground"> {activity.action} </span>
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      {activity.verificationStatus && (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          activity.verificationStatus === 'approved' ? 'bg-green-100 text-green-700' :
                          activity.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {activity.verificationStatus === 'approved' ? <CheckCircle2 className="h-2.5 w-2.5" /> :
                           activity.verificationStatus === 'rejected' ? <XCircle className="h-2.5 w-2.5" /> :
                           <AlertCircle className="h-2.5 w-2.5" />}
                          {activity.verificationStatus === 'approved' ? 'Verified' :
                           activity.verificationStatus === 'rejected' ? 'Rejected' :
                           activity.verificationStatus === 'self_reported' ? 'Self-Reported' : 'Pending'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </button>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <div className="mt-3 pt-2 border-t border-stone-100 text-center">
              <span className="text-xs text-muted-foreground">
                Showing {activities.length} recent {activities.length === 1 ? 'activity' : 'activities'}
              </span>
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
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <BellIcon className="h-6 w-6 text-primary-600" />
                  </div>
                ) : (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedActivity.user?.avatar} alt={`${selectedActivity.user?.name} avatar`} />
                    <AvatarFallback className="text-lg">{selectedActivity.user?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
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
                  <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Action</p>
                    <p className="text-base">{selectedActivity.action}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Target</p>
                    <p className="text-base font-semibold">{selectedActivity.target}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time</p>
                    <p className="text-base">{selectedActivity.time}</p>
                  </div>
                </div>

                {selectedActivity.projectName && (
                  <div className="flex items-start gap-2">
                    <FolderKanban className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Project</p>
                      <p className="text-base font-semibold">{selectedActivity.projectName}</p>
                    </div>
                  </div>
                )}

                {selectedActivity.organizationName && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Organization</p>
                      <p className="text-base font-semibold">{selectedActivity.organizationName}</p>
                    </div>
                  </div>
                )}

                {selectedActivity.verificationStatus && (
                  <div className="flex items-start gap-2">
                    {selectedActivity.verificationStatus === 'approved' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    ) : selectedActivity.verificationStatus === 'rejected' ? (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                        selectedActivity.verificationStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        selectedActivity.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedActivity.verificationStatus === 'approved' ? 'Approved' :
                         selectedActivity.verificationStatus === 'rejected' ? 'Rejected' :
                         selectedActivity.verificationStatus === 'self_reported' ? 'Self-Reported' : 'Pending'}
                      </span>
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
