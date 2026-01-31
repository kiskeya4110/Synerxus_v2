import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, UserPlus, LineChart, Calendar, Briefcase, MessageSquare } from "lucide-react";
import { Link } from "wouter";

interface QuickAction {
  id: string;
  label: string;
  icon: JSX.Element;
  color: string;
  href?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  userType?: "volunteer" | "organization";
  onContactVolunteers?: () => void;
}

export default function QuickActions({ userType = "volunteer", onContactVolunteers }: QuickActionsProps) {
  const volunteerActions: QuickAction[] = [
    {
      id: "log-hours",
      label: "Log Hours",
      icon: <Clock className="h-5 w-5 mb-1" />,
      color: "text-success-500",
      href: "/mobile-data-collection"
    },
    {
      id: "my-work",
      label: "My Work",
      icon: <CheckSquare className="h-5 w-5 mb-1" />,
      color: "text-primary-500",
      href: "/my-work"
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
    ...(onContactVolunteers ? [{
      id: "contact-volunteers",
      label: "Contact Volunteers",
      icon: <MessageSquare className="h-5 w-5 mb-1" />,
      color: "text-blue-500",
      onClick: onContactVolunteers
    }] : []),
    {
      id: "add-project",
      label: "Add Project",
      icon: <Briefcase className="h-5 w-5 mb-1" />,
      color: "text-primary-500",
      href: "/projects"
    },
    {
      id: "invite-volunteers",
      label: "Invite Volunteers",
      icon: <UserPlus className="h-5 w-5 mb-1" />,
      color: "text-purple-500",
      href: "/matched-volunteers"
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
      <CardHeader className="pb-2 border-b border-stone-200">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {actions.map((action) => {
            const baseClasses = "flex flex-col items-center justify-center p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors duration-150 cursor-pointer min-h-[80px] w-full";

            if (action.href) {
              return (
                <Link key={action.id} href={action.href}>
                  <div
                    className={baseClasses}
                    data-testid={`button-${action.id}`}
                  >
                    <div className={action.color}>
                      {action.icon}
                    </div>
                    <span className="text-sm text-center font-medium mt-1">{action.label}</span>
                  </div>
                </Link>
              );
            }

            return (
              <button
                key={action.id}
                type="button"
                className={baseClasses}
                data-testid={`button-${action.id}`}
                onClick={action.onClick}
              >
                <div className={action.color}>
                  {action.icon}
                </div>
                <span className="text-sm text-center font-medium mt-1">{action.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
