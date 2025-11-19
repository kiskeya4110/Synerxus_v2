import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, ListTodo, FolderKanban } from "lucide-react";
import MyApplicationsPage from "./my-applications";
import AssignmentsPage from "./assignments";
import MyTasksPage from "./my-tasks";

export default function MyWork() {
  const [, setLocation] = useLocation();
  
  // Get initial tab from URL hash or default to applications
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'applications' || hash === 'assignments' || hash === 'tasks') {
        return hash;
      }
    }
    return 'applications';
  };

  const handleTabChange = (value: string) => {
    window.history.replaceState(null, '', `#${value}`);
  };

  return (
    <div className="min-h-screen">
      <div className="p-6 pb-4">
        <h1 className="text-3xl font-bold">My Work</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your applications, assignments, and tasks in one place
        </p>
      </div>

      <Tabs defaultValue={getInitialTab()} onValueChange={handleTabChange} className="w-full px-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
          <TabsTrigger value="applications" className="flex items-center gap-2" data-testid="tab-applications">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Applications</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2" data-testid="tab-assignments">
            <FolderKanban className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2" data-testid="tab-tasks">
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="-mx-6">
          <MyApplicationsPage />
        </TabsContent>

        <TabsContent value="assignments" className="-mx-6">
          <AssignmentsPage />
        </TabsContent>

        <TabsContent value="tasks" className="-mx-6">
          <MyTasksPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
