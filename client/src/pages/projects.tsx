import { useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock data - will be replaced with actual API calls
  const projects = [
    {
      id: 1,
      name: "Clean Water Initiative",
      description: "Providing access to clean water in rural communities",
      status: "active",
      organization: "Water for All",
      startDate: "2024-01-15",
      endDate: "2024-12-31",
      volunteers: 45,
      tasks: 28,
      sdgGoals: [6, 3],
      progress: 65,
      location: "Rural Kenya"
    },
    {
      id: 2,
      name: "Education Access Program",
      description: "Building schools and providing educational resources",
      status: "active",
      organization: "Global Education Fund",
      startDate: "2024-03-01",
      endDate: "2025-02-28",
      volunteers: 32,
      tasks: 45,
      sdgGoals: [4, 5, 10],
      progress: 40,
      location: "South Asia"
    },
    {
      id: 3,
      name: "Medical Outreach",
      description: "Mobile health clinics serving underserved populations",
      status: "active",
      organization: "Healthcare for All",
      startDate: "2024-02-10",
      endDate: "2024-11-30",
      volunteers: 28,
      tasks: 35,
      sdgGoals: [3, 10],
      progress: 55,
      location: "Sub-Saharan Africa"
    },
    {
      id: 4,
      name: "Urban Reforestation",
      description: "Planting trees and creating green spaces in cities",
      status: "planning",
      organization: "Green Cities Alliance",
      startDate: "2024-06-01",
      endDate: "2025-05-31",
      volunteers: 15,
      tasks: 18,
      sdgGoals: [13, 15, 11],
      progress: 15,
      location: "Metropolitan Areas"
    }
  ];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "planning": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "completed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSDGColor = (goal: number) => {
    const colors: Record<number, string> = {
      3: "#4C9F38",
      4: "#C5192D",
      5: "#FF3A21",
      6: "#26BDE2",
      10: "#DD1367",
      11: "#FD9D24",
      13: "#3F7E44",
      15: "#56C02B"
    };
    return colors[goal] || "#FCC30B";
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Projects</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage volunteer projects and track their impact
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            data-testid="input-search-projects"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px]" data-testid="button-add-project">
              <Plus className="h-5 w-5 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new volunteer project to track its impact
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input id="project-name" placeholder="Enter project name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea id="project-description" placeholder="Describe the project goals and activities" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input id="start-date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input id="end-date" type="date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="Project location" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow min-h-[200px]">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
              <CardDescription className="text-sm line-clamp-2">
                {project.description}
              </CardDescription>
              <div className="flex gap-1 mt-2">
                {project.sdgGoals.map(goal => (
                  <div
                    key={goal}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getSDGColor(goal) }}
                  >
                    {goal}
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Link href="/volunteers" className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                    <Users className="h-4 w-4 mr-1" />
                    {project.volunteers}
                  </Link>
                  <Link href="/tasks" className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
                    <Calendar className="h-4 w-4 mr-1" />
                    {project.tasks} tasks
                  </Link>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 min-h-[44px]">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[44px]">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No projects found</p>
        </Card>
      )}
    </>
  );
}
