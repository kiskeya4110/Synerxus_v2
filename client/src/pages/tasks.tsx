import { useState } from "react";
import { Plus, Search, Filter, CheckCircle2, Circle, Clock, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreateTaskDialog, EditTaskDialog, DeleteTaskDialog } from "@/components/projects/task-dialogs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import VolunteerNav from "@/components/layout/volunteer-nav";
import WebBottomNav from "@/components/layout/web-bottom-nav";
import Footer from "@/components/layout/footer";
import { useIsMobile, useIsPWAMode } from "@/hooks/use-mobile";

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
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const userType = localStorage.getItem('userType');
  const isOrganizationUser = userType === 'organization';
  const isMobile = useIsMobile();
  const isPWAMode = useIsPWAMode();

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

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const isVolunteer = userType === 'volunteer';

  // Mobile PWA View for Organizations
  if (isMobile && isOrganizationUser) {
    return (
      <OrganizationPWALayout activeTab="projects">
        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-2xl font-bold mb-2">Tasks</h1>
          <p className="text-sm text-gray-600 mb-4">
            Manage and track volunteer tasks
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
              <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Project selector for creating tasks */}
              {(projects as any[]).length > 0 && (
                <div className="flex gap-2 mb-3">
                  <Select
                    value={selectedProjectId?.toString() || ""}
                    onValueChange={(val) => setSelectedProjectId(parseInt(val))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects as any[]).map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProjectId && (
                    <CreateTaskDialog projectId={selectedProjectId} />
                  )}
                </div>
              )}

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <Card className="rounded-xl">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
                    <p className="text-gray-500 text-center text-sm">
                      {searchTerm ? "Try a different search term" : "Create a task to get started"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredTasks.map((task) => (
                  <Card key={task.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{task.title}</p>
                          {task.project && (
                            <p className="text-xs text-gray-500">{task.project}</p>
                          )}
                          {task.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {task.priority && (
                              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </Badge>
                            )}
                            {task.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Edit/Delete for mobile */}
                        <div className="flex flex-col gap-1">
                          <EditTaskDialog task={task as any} />
                          <DeleteTaskDialog task={task as any} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </OrganizationPWALayout>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto pb-24 bg-[#f8f9fa]" style={{ paddingBottom: isOrganizationUser ? '180px' : '96px' }}>
      {/* Volunteer Desktop Navigation */}
      <VolunteerNav />
      {isOrganizationUser && <OrganizationHeader activeTab="projects" />}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
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

            {isOrganizationUser && (projects as any[]).length > 0 && (
              <Select
                value={selectedProjectId?.toString() || ""}
                onValueChange={(val) => setSelectedProjectId(parseInt(val))}
              >
                <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
                  <SelectValue placeholder="Select project for task" />
                </SelectTrigger>
                <SelectContent>
                  {(projects as any[]).map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isOrganizationUser && selectedProjectId && (
              <CreateTaskDialog projectId={selectedProjectId} />
            )}
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
                    {/* Edit/Delete Actions for Organizations */}
                    {isOrganizationUser && (
                      <div className="flex items-center gap-1 ml-auto">
                        <EditTaskDialog task={task as any} />
                        <DeleteTaskDialog task={task as any} />
                      </div>
                    )}
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

      {/* Mobile Bottom Navigation for Volunteers */}
      {isVolunteer && isPWAMode && <WebBottomNav activeTab="projects" />}

      {/* Footer - Hidden on mobile */}
      {!isPWAMode && <Footer />}
    </div>
  );
}
