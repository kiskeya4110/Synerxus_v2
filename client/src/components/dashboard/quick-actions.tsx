import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, UserPlus, LineChart, Calendar, Briefcase } from "lucide-react";
import { Link } from "wouter";

interface QuickAction {
  id: string;
  label: string;
  icon: JSX.Element;
  color: string;
  href: string;
}

interface QuickActionsProps {
  userType?: "volunteer" | "organization";
}

export default function QuickActions({ userType = "volunteer" }: QuickActionsProps) {
  const volunteerActions: QuickAction[] = [
    {
      id: "log-hours",
      label: "Log Hours",
      icon: <Clock className="h-5 w-5 mb-1" />,
      color: "text-success-500",
      href: "/mobile-data-collection"
    },
    {
      id: "my-tasks",
      label: "My Tasks",
      icon: <CheckSquare className="h-5 w-5 mb-1" />,
      color: "text-primary-500",
      href: "/my-tasks"
    },
    {
      id: "find-opportunities",
      label: "Find Opportunities",
      icon: <Briefcase className="h-5 w-5 mb-1" />,
      color: "text-purple-500",
      href: "/discover-opportunities"
    },
    {
      id: "view-calendar",
      label: "View Calendar",
      icon: <Calendar className="h-5 w-5 mb-1" />,
      color: "text-amber-500",
      href: "/calendar"
    }
  ];

  const organizationActions: QuickAction[] = [
    {
      id: "add-project",
      label: "Add Project",
      icon: <Briefcase className="h-5 w-5 mb-1" />,
      color: "text-primary-500",
      href: "/projects"
    },
    {
      id: "add-task",
      label: "Add Task",
      icon: <CheckSquare className="h-5 w-5 mb-1" />,
      color: "text-success-500",
      href: "/tasks"
    },
    {
      id: "recruit-volunteers",
      label: "Find Volunteers",
      icon: <UserPlus className="h-5 w-5 mb-1" />,
      color: "text-purple-500",
      href: "/volunteers"
    },
    {
      id: "create-report",
      label: "Create Report",
      icon: <LineChart className="h-5 w-5 mb-1" />,
      color: "text-amber-500",
      href: "/impact-storytelling"
    }
  ];

  const actions = userType === "volunteer" ? volunteerActions : organizationActions;

  return (
    <Card>
      <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Link 
              key={action.id}
              href={action.href}
            >
              <div 
                className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150 cursor-pointer min-h-[44px]"
                data-testid={`button-${action.id}`}
              >
                <div className={action.color}>
                  {action.icon}
                </div>
                <span className="text-sm text-center">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
