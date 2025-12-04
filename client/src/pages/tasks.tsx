import { useState } from "react";
import { Plus, Search, Filter, CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import OrganizationHeader from "@/components/layout/organization-header";
import Footer from "@/components/layout/footer";

interface ITask {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: number;
  assignee?: string;
  project?: string;
  [key: string]: any;
}

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  
  const userType = localStorage.getItem('userType');
  const isOrganizationUser = userType === 'organization';

  const { data: tasks = [], isLoading } = useQuery<ITask[]>({ 
    queryKey: ["/api/tasks"] 
  });

  const { data: projects = [] } = useQuery({ 
    queryKey: ["/api/projects"] 
  });

  const filteredTasks = (tasks as ITask[]).filter((task: ITask) => {
    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status?.toLowerCase() === statusFilter;
    const matchesTab = activeTab === "all" || 
                      (activeTab === "my-tasks" && task.assignedTo) ||
                      (activeTab === "unassigned" && !task.assignedTo);
    return matchesSearch && matchesStatus && matchesTab;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in-progress": return <Clock className="h-5 w-5 text-blue-600" />;
      default: return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className={isOrganizationUser ? "min-h-screen overflow-y-auto" : ""} style={{ paddingBottom: isOrganizationUser ? '180px' : '0' }}>
      {isOrganizationUser && <OrganizationHeader activeTab="projects" />}
      <div className={isOrganizationUser ? "p-6" : ""}>
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Tasks</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage and track volunteer tasks across all projects
          </p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 min-h-[44px]">
          <TabsTrigger value="all" className="min-h-[44px]">All Tasks</TabsTrigger>
          <TabsTrigger value="my-tasks" className="min-h-[44px]">My Tasks</TabsTrigger>
          <TabsTrigger value="unassigned" className="min-h-[44px]">Unassigned</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 min-h-[44px]"
                data-testid="input-search-tasks"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button className="min-h-[44px]" data-testid="button-add-task">
              <Plus className="h-5 w-5 mr-2" />
              Add Task
            </Button>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.map((task: ITask) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <button className="mt-1" data-testid={`task-status-${task.id}`}>
                        {getStatusIcon(task.status)}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base">{task.title}</h3>
                          <div className="flex gap-2">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Link href={`/projects`}>
                              <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                                {task.project}
                              </Badge>
                            </Link>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {task.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Due: {new Date(task.dueDate || '').toLocaleDateString()}</span>
                          <span>Est. {task.estimatedHours}h</span>
                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">
                                  {task.assignee.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <Link href="/volunteers" className="hover:text-primary">
                                {task.assignee}
                              </Link>
                            </div>
                          )}
                          {!task.assignee && (
                            <span className="text-orange-600 dark:text-orange-400">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
