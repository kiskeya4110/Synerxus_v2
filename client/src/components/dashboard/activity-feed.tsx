import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BellIcon } from "lucide-react";
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
}

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
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
      <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {activities.map((activity) => (
            <Link key={activity.id} href={getActivityLink(activity)}>
              <div className="flex hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-2 px-2 py-1 rounded transition-colors cursor-pointer" data-testid={`activity-${activity.id}`}>
                <div className="flex-shrink-0 mr-3">
                  {activity.isSystem ? (
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <BellIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                  ) : (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user?.avatar} alt={`${activity.user?.name} avatar`} />
                      <AvatarFallback>{activity.user?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">
                      {activity.isSystem ? "System" : activity.user?.name}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400"> {activity.action} </span>
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link href="/dashboard">
            <span className="text-sm text-primary-600 dark:text-primary-400 hover:underline cursor-pointer" data-testid="link-view-all-activity">View all activity</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
