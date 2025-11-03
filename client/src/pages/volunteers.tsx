import { useState, useMemo } from "react";
import { Plus, Search, Filter, Mail, Phone, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Volunteers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");

  const { data: users = [], isLoading } = useQuery({ 
    queryKey: ["/api/users"] 
  });

  const { data: volunteerActivities = [] } = useQuery({ 
    queryKey: ["/api/volunteer-activities"] 
  });

  const volunteers = users.filter((user: any) => user.userType === 'volunteer');

  const volunteersWithStats = useMemo(() => {
    return volunteers.map((volunteer: any) => {
      const activities = volunteerActivities.filter((a: any) => a.userId === volunteer.id);
      const totalHours = activities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      
      return {
        ...volunteer,
        hours: totalHours,
        tasksCompleted: activities.length,
        skills: volunteer.skills || [],
      };
    });
  }, [volunteers, volunteerActivities]);

  const filteredVolunteers = volunteersWithStats.filter((volunteer: any) => {
    const matchesSearch = volunteer.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = skillFilter === "all" || (volunteer.skills && volunteer.skills.includes(skillFilter));
    return matchesSearch && matchesSkill;
  });

  const allSkills = Array.from(new Set(volunteersWithStats.flatMap((v: any) => v.skills || [])));

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
              <p className="text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Volunteers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.reduce((sum: number, v: any) => sum + (v.hours || 0), 0)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Hours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{isLoading ? "..." : volunteersWithStats.reduce((sum: number, v: any) => sum + (v.tasksCompleted || 0), 0)}</p>
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
        {filteredVolunteers.map((volunteer: any) => (
          <Card key={volunteer.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-white">
                    {volunteer.displayName?.split(' ').map((n: string) => n[0]).join('') || volunteer.email?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{volunteer.displayName || 'Unnamed Volunteer'}</CardTitle>
                  <CardDescription className="text-xs truncate">{volunteer.email || 'No email'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {volunteer.skills && volunteer.skills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.skills.map((skill: string) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{volunteer.hours || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{volunteer.tasksCompleted || 0}</p>
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
