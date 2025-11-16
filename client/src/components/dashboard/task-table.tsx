import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlusIcon } from "lucide-react";
import { Link, useLocation } from "wouter";

export interface Task {
  id: string;
  name: string;
  project: string; // Kept for backwards compatibility
  projectId?: number; // New: Project ID for linking
  projectName?: string; // New: Project name from backend
  projectStatus?: string; // New: Project status
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
  const [, setLocation] = useLocation();

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
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow 
                    key={task.id} 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setLocation('/tasks')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLocation('/tasks');
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    data-testid={`task-row-${task.id}`}
                  >
                    <TableCell className="font-medium text-xs py-2">{task.name}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 text-xs py-2">
                      {task.projectName || task.project || 'No Project'}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 text-xs py-2">{task.dueDate}</TableCell>
                    <TableCell className="py-2">
                      <StatusBadge status={task.status} className="text-xs" />
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
