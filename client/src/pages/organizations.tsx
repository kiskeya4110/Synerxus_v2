import { useState } from "react";
import { Plus, Search, Globe, Mail, Phone, Building2, Star, Users, FolderOpen, MessageSquare, MapPin, Target, TrendingUp, CheckCircle, Clock, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";

interface OrganizationStats {
  projectCount: number;
  volunteerCount: number;
  completedProjects: number;
  totalHours: number;
  avgRating: number;
  activeOpportunities: number;
}

export default function Organizations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactOrg, setContactOrg] = useState<any>(null);
  const [messageTopic, setMessageTopic] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');

  const { data: organizations = [], isLoading } = useQuery<any[]>({ 
    queryKey: ["/api/organizations"] 
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"]
  });

  const { data: volunteers = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteers"]
  });

  const { data: opportunities = [] } = useQuery<any[]>({
    queryKey: ["/api/opportunities"]
  });

  const { data: matchableOrgs = [] } = useQuery<any[]>({
    queryKey: ["/api/matchable-organizations"]
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: { organizationId: number; topic: string; message: string }) => {
      return apiRequest('POST', '/api/conversation-threads', {
        organizationId: data.organizationId,
        volunteerId: parseInt(userId || '0'),
        topic: data.topic,
        initialMessage: data.message
      });
    },
    onSuccess: () => {
      setShowContactDialog(false);
      setMessageTopic("");
      setMessageContent("");
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the organization. Check your Messages for their reply."
      });
      if (userType === 'volunteer') {
        navigate('/volunteer-messages');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const getOrgStats = (orgId: number): OrganizationStats => {
    const orgProjects = projects.filter((p: any) => p.organizationId === orgId);
    const orgVolunteers = volunteers.filter((v: any) => v.organizationId === orgId);
    const orgOpportunities = opportunities.filter((o: any) => o.organizationId === orgId);
    
    return {
      projectCount: orgProjects.length,
      volunteerCount: orgVolunteers.length,
      completedProjects: orgProjects.filter((p: any) => p.status === 'completed').length,
      totalHours: orgProjects.reduce((sum: number, p: any) => sum + (p.hoursContributed || 0), 0),
      avgRating: 4.5,
      activeOpportunities: orgOpportunities.filter((o: any) => o.status === 'open').length
    };
  };

  const getOrgProfile = (orgId: number) => {
    return matchableOrgs.find((m: any) => m.organizationId === orgId);
  };

  const handleContactClick = (org: any) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please log in to contact organizations",
        variant: "destructive"
      });
      return;
    }
    setContactOrg(org);
    setShowContactDialog(true);
  };

  const handleSendMessage = () => {
    if (!messageTopic.trim() || !messageContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a topic and message",
        variant: "destructive"
      });
      return;
    }
    createConversationMutation.mutate({
      organizationId: contactOrg.id,
      topic: messageTopic,
      message: messageContent
    });
  };

  const filteredOrganizations = organizations.filter((org: any) => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVolunteers = volunteers.length;
  const activeProjectsCount = projects.filter((p: any) => p.status === 'active').length;

  return (
    <div className="h-screen overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-page-title">Organizations</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Partner organizations and their volunteer initiatives
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 px-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-primary" data-testid="stat-org-count">
                {isLoading ? "..." : organizations.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Organizations</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/projects')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <FolderOpen className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold text-green-600" data-testid="stat-project-count">
                {isLoading ? "..." : activeProjectsCount}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/volunteers')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-3xl font-bold text-blue-600" data-testid="stat-volunteer-count">
                {isLoading ? "..." : totalVolunteers}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Volunteers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 px-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 min-h-[44px]"
            data-testid="input-search-organizations"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 px-6 pb-6">
        {filteredOrganizations.map((org: any) => {
          const stats = getOrgStats(org.id);
          const profile = getOrgProfile(org.id);
          
          return (
            <Card key={org.id} className="hover:shadow-lg transition-shadow" data-testid={`org-card-${org.id}`}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage src={org.logo} className="object-cover" />
                    <AvatarFallback className="rounded-lg bg-primary/10">
                      <Building2 className="h-8 w-8 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle 
                          className="text-xl mb-1 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setSelectedOrg(org)}
                          data-testid={`org-name-${org.id}`}
                        >
                          {org.name}
                        </CardTitle>
                        {profile?.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{stats.avgRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <CardDescription className="text-sm line-clamp-2 mt-2">
                      {org.description || profile?.mission}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile?.sdgFocus && profile.sdgFocus.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profile.sdgFocus.slice(0, 4).map((sdg: number) => (
                        <Badge 
                          key={sdg} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:opacity-80"
                          style={{ borderColor: getSDGColor(sdg), color: getSDGColor(sdg) }}
                          onClick={() => navigate(`/sdg-mapping?sdg=${sdg}`)}
                          data-testid={`sdg-badge-${sdg}`}
                        >
                          SDG {sdg}
                        </Badge>
                      ))}
                      {profile.sdgFocus.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{profile.sdgFocus.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    {org.website && (
                      <a 
                        href={org.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                        data-testid={`org-website-${org.id}`}
                      >
                        <Globe className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{org.website.replace('https://', '')}</span>
                      </a>
                    )}
                    {org.contactEmail && (
                      <a 
                        href={`mailto:${org.contactEmail}`} 
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                        data-testid={`org-email-${org.id}`}
                      >
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{org.contactEmail}</span>
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={() => navigate(`/projects?org=${org.id}`)}
                      className="text-center hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
                      data-testid={`stat-projects-${org.id}`}
                    >
                      <p className="text-lg font-bold text-primary">{stats.projectCount}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Projects</p>
                    </button>
                    <button 
                      onClick={() => navigate(`/volunteers?org=${org.id}`)}
                      className="text-center hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
                      data-testid={`stat-volunteers-${org.id}`}
                    >
                      <p className="text-lg font-bold text-blue-600">{stats.volunteerCount}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volunteers</p>
                    </button>
                    <button 
                      onClick={() => navigate(`/discover-opportunities?org=${org.id}`)}
                      className="text-center hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
                      data-testid={`stat-opportunities-${org.id}`}
                    >
                      <p className="text-lg font-bold text-green-600">{stats.activeOpportunities}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Open Roles</p>
                    </button>
                    <div className="text-center p-2">
                      <p className="text-lg font-bold text-purple-600">{stats.completedProjects}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 min-h-[44px]"
                      onClick={() => setSelectedOrg(org)}
                      data-testid={`button-view-${org.id}`}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 min-h-[44px]"
                      onClick={() => handleContactClick(org)}
                      data-testid={`button-contact-${org.id}`}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Contact
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredOrganizations.length === 0 && (
        <Card className="p-12 text-center mx-6">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 dark:text-gray-400">No organizations found</p>
        </Card>
      )}

      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contact {contactOrg?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Topic</label>
              <Input
                value={messageTopic}
                onChange={(e) => setMessageTopic(e.target.value)}
                placeholder="e.g., Volunteer Inquiry, Project Question"
                className="mt-1"
                data-testid="input-contact-topic"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Write your message to the organization..."
                rows={4}
                className="mt-1"
                data-testid="input-contact-message"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowContactDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendMessage}
                className="flex-1"
                disabled={createConversationMutation.isPending}
                data-testid="button-send-contact"
              >
                {createConversationMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrg && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage src={selectedOrg.logo} className="object-cover" />
                    <AvatarFallback className="rounded-lg bg-primary/10">
                      <Building2 className="h-8 w-8 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedOrg.name}</DialogTitle>
                    {getOrgProfile(selectedOrg.id)?.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {getOrgProfile(selectedOrg.id)?.location}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{getOrgStats(selectedOrg.id).avgRating.toFixed(1)}</span>
                  </div>
                </div>
              </DialogHeader>
              
              <Tabs defaultValue="about" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="impact">Impact</TabsTrigger>
                </TabsList>
                
                <TabsContent value="about" className="space-y-4 mt-4">
                  <div>
                    <h4 className="font-medium mb-2">Mission</h4>
                    <p className="text-sm text-gray-600">
                      {getOrgProfile(selectedOrg.id)?.mission || selectedOrg.description || "No mission statement available."}
                    </p>
                  </div>
                  
                  {getOrgProfile(selectedOrg.id)?.sdgFocus && (
                    <div>
                      <h4 className="font-medium mb-2">SDG Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {getOrgProfile(selectedOrg.id)?.sdgFocus.map((sdg: number) => (
                          <Badge 
                            key={sdg}
                            className="cursor-pointer"
                            style={{ backgroundColor: getSDGColor(sdg) }}
                            onClick={() => navigate(`/sdg-mapping?sdg=${sdg}`)}
                          >
                            SDG {sdg}: {getSDGName(sdg)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {getOrgProfile(selectedOrg.id)?.needs && (
                    <div>
                      <h4 className="font-medium mb-2">Volunteer Needs</h4>
                      <div className="flex flex-wrap gap-2">
                        {getOrgProfile(selectedOrg.id)?.needs.map((need: string, i: number) => (
                          <Badge key={i} variant="outline">{need}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {selectedOrg.website && (
                      <a 
                        href={selectedOrg.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Globe className="h-5 w-5 text-primary" />
                        <span className="text-sm">Visit Website</span>
                      </a>
                    )}
                    {selectedOrg.contactEmail && (
                      <a 
                        href={`mailto:${selectedOrg.contactEmail}`}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Mail className="h-5 w-5 text-primary" />
                        <span className="text-sm">Email</span>
                      </a>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="projects" className="space-y-4 mt-4">
                  {projects.filter((p: any) => p.organizationId === selectedOrg.id).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FolderOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No projects yet</p>
                    </div>
                  ) : (
                    projects.filter((p: any) => p.organizationId === selectedOrg.id).map((project: any) => (
                      <Card 
                        key={project.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{project.name}</h4>
                              <p className="text-sm text-gray-500 line-clamp-1">{project.description}</p>
                            </div>
                            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                              {project.status}
                            </Badge>
                          </div>
                          {project.completionPercentage !== undefined && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{project.completionPercentage}%</span>
                              </div>
                              <Progress value={project.completionPercentage} className="h-2" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="impact" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold">{getOrgStats(selectedOrg.id).projectCount}</p>
                        <p className="text-sm text-gray-500">Total Projects</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold">{getOrgStats(selectedOrg.id).volunteerCount}</p>
                        <p className="text-sm text-gray-500">Volunteers</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold">{getOrgStats(selectedOrg.id).completedProjects}</p>
                        <p className="text-sm text-gray-500">Completed</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <p className="text-2xl font-bold">{getOrgStats(selectedOrg.id).totalHours}</p>
                        <p className="text-sm text-gray-500">Hours Contributed</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(`/discover-opportunities?org=${selectedOrg.id}`)}
                >
                  View Opportunities
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setSelectedOrg(null);
                    handleContactClick(selectedOrg);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
