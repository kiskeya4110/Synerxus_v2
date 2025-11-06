import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusIcon } from "lucide-react";

export interface Task {
  id: string;
  name: string;
  project: string;
  dueDate: string;
  status: "To Do" | "In Progress" | "Completed" | "Overdue";
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface TaskTableProps {
  tasks: Task[];
}

export default function TaskTable({ tasks }: TaskTableProps) {
  const getStatusBadgeClasses = (status: Task["status"]) => {
    switch (status) {
      case "To Do":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      case "In Progress":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400";
      case "Completed":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Overdue":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-200 dark:border-gray-700 p-3">
        <CardTitle className="text-base font-semibold">Recent Tasks</CardTitle>
        <a href="#" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View All</a>
      </CardHeader>
      <CardContent className="p-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] text-xs py-2">Task</TableHead>
                <TableHead className="text-xs py-2">Project</TableHead>
                <TableHead className="text-xs py-2">Due Date</TableHead>
                <TableHead className="text-xs py-2">Status</TableHead>
                <TableHead className="text-xs py-2">Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium text-xs py-2">{task.name}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400 text-xs py-2">{task.project}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400 text-xs py-2">{task.dueDate}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={`${getStatusBadgeClasses(task.status)} text-xs px-2 py-0`}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    {task.assignee ? (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={task.assignee.avatar} alt={`${task.assignee.name} avatar`} />
                        <AvatarFallback className="text-xs">{task.assignee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <PlusIcon className="h-2.5 w-2.5 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
