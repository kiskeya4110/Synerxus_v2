import { useState } from "react";
import { Plus, Search, Filter, Mail, Phone, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";

export default function Volunteers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");

  // Mock data
  const volunteers = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "+1 (555) 123-4567",
      skills: ["Water Management", "Community Outreach", "Project Management"],
      availability: "Weekends",
      projects: ["Clean Water Initiative"],
      hours: 120,
      tasksCompleted: 15,
      bio: "Passionate about water conservation and community development"
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "m.chen@email.com",
      phone: "+1 (555) 234-5678",
      skills: ["Lab Testing", "Data Analysis", "Research"],
      availability: "Evenings",
      projects: ["Clean Water Initiative", "Medical Outreach"],
      hours: 95,
      tasksCompleted: 12,
      bio: "Environmental scientist with expertise in water quality"
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      email: "emily.r@email.com",
      phone: "+1 (555) 345-6789",
      skills: ["Teaching", "Curriculum Development", "Mentoring"],
      availability: "Flexible",
      projects: ["Education Access Program"],
      hours: 156,
      tasksCompleted: 22,
      bio: "Former teacher dedicated to educational equity"
    },
    {
      id: 4,
      name: "David Kim",
      email: "david.k@email.com",
      phone: "+1 (555) 456-7890",
      skills: ["Healthcare", "First Aid", "Patient Care"],
      availability: "Full-time",
      projects: ["Medical Outreach"],
      hours: 240,
      tasksCompleted: 31,
      bio: "Registered nurse with field experience in mobile clinics"
    },
    {
      id: 5,
      name: "Lisa Anderson",
      email: "lisa.a@email.com",
      phone: "+1 (555) 567-8901",
      skills: ["Environmental Science", "Urban Planning", "GIS"],
      availability: "Weekends",
      projects: ["Urban Reforestation"],
      hours: 64,
      tasksCompleted: 8,
      bio: "Urban planner focused on sustainable city development"
    }
  ];

  const filteredVolunteers = volunteers.filter(volunteer => {
    const matchesSearch = volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = skillFilter === "all" || volunteer.skills.includes(skillFilter);
    return matchesSearch && matchesSkill;
  });

  const allSkills = Array.from(new Set(volunteers.flatMap(v => v.skills)));

  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Volunteers</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Manage volunteer profiles and track their contributions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{volunteers.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Volunteers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{volunteers.reduce((sum, v) => sum + v.hours, 0)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Hours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{volunteers.reduce((sum, v) => sum + v.tasksCompleted, 0)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tasks Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search volunteers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            data-testid="input-search-volunteers"
          />
        </div>
        
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            {allSkills.map(skill => (
              <SelectItem key={skill} value={skill}>{skill}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button className="min-h-[44px]" data-testid="button-add-volunteer">
          <Plus className="h-5 w-5 mr-2" />
          Add Volunteer
        </Button>
      </div>

      {/* Volunteers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredVolunteers.map((volunteer) => (
          <Card key={volunteer.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-white">
                    {volunteer.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{volunteer.name}</CardTitle>
                  <CardDescription className="text-xs truncate">{volunteer.email}</CardDescription>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {volunteer.bio}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4" />
                  <span className="truncate">{volunteer.phone}</span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {volunteer.skills.map(skill => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Projects</p>
                  {volunteer.projects.map(project => (
                    <Link key={project} href="/projects">
                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
                        {project}
                      </Badge>
                    </Link>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{volunteer.hours}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{volunteer.tasksCompleted}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Tasks</p>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full min-h-[44px]">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVolunteers.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No volunteers found</p>
        </Card>
      )}
    </>
  );
}
