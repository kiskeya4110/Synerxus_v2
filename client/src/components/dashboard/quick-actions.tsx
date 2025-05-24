import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, UserPlus, LineChart } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: JSX.Element;
  color: string;
  href: string;
}

export default function QuickActions() {
  const actions: QuickAction[] = [
    {
      id: "add-task",
      label: "Add Task",
      icon: <CheckSquare className="h-5 w-5 mb-1" />,
      color: "text-primary-500",
      href: "#"
    },
    {
      id: "log-hours",
      label: "Log Hours",
      icon: <Clock className="h-5 w-5 mb-1" />,
      color: "text-success-500",
      href: "#"
    },
    {
      id: "add-volunteer",
      label: "Add Volunteer",
      icon: <UserPlus className="h-5 w-5 mb-1" />,
      color: "text-purple-500",
      href: "#"
    },
    {
      id: "create-report",
      label: "Create Report",
      icon: <LineChart className="h-5 w-5 mb-1" />,
      color: "text-amber-500",
      href: "#"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-2 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <a 
              key={action.id}
              href={action.href} 
              className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150"
            >
              <div className={action.color}>
                {action.icon}
              </div>
              <span className="text-sm">{action.label}</span>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
