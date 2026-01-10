import { useState, useEffect } from "react";
import { Plus, Search, Globe, Mail, Phone, Building2, Star, Users, FolderOpen, MessageSquare, MapPin, Target, TrendingUp, CheckCircle, Clock, X, Zap, Home, HelpCircle } from "lucide-react";
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
import { CSRLayout } from "@/components/layout/csr-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

interface OrganizationStats {
  projectCount: number;
  volunteerCount: number;
  completedProjects: number;
  totalHours: number;
  totalPeopleImpacted: number;
  impactScore: number;
  activeOpportunities: number;
}

interface OrganizationWithStats {
  id: number;
  name: string;
  description: string;
  logo: string;
  website: string;
  contactEmail: string;
  city: string | null;
  country: string | null;
  stats: OrganizationStats;
  profile: {
    location: string;
    sdgFocus: number[];
    mission: string;
  } | null;
}

export default function Organizations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithStats | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactOrg, setContactOrg] = useState<OrganizationWithStats | null>(null);
  const [messageTopic, setMessageTopic] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');
  const isCSR = userType === 'corporate-partner' || userType === 'corporate_partner' || userType === 'csr';

  // Redirect to PWA version on mobile (except for CSR users who have their own mobile layout)
  useEffect(() => {
    if (isMobile && !isCSR) {
      navigate('/organizations/pwa');
    }
  }, [isMobile, isCSR, navigate]);

  // Fetch organizations with real stats from the new endpoint
  const { data: organizationsWithStats = [], isLoading } = useQuery<OrganizationWithStats[]>({ 
    queryKey: ["/api/organizations/public-stats"] 
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

  const handleContactClick = (org: OrganizationWithStats) => {
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
    if (!contactOrg) return;
    createConversationMutation.mutate({
      organizationId: contactOrg.id,
      topic: messageTopic,
      message: messageContent
    });
  };

  const filteredOrganizations = organizationsWithStats.filter((org) => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals from the fetched data
  const totalVolunteers = organizationsWithStats.reduce((sum, org) => sum + org.stats.volunteerCount, 0);
  const activeProjectsCount = organizationsWithStats.reduce((sum, org) => sum + org.stats.projectCount, 0);

  // Organization card component for reuse
  const OrganizationCard = ({ org }: { org: OrganizationWithStats }) => (
    <Card className="hover:shadow-lg transition-shadow">
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
                >
                  {org.name}
                </CardTitle>
                {(org.country || org.profile?.location) && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span>{org.country || org.profile?.location}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer hover:bg-purple-100 transition-colors">
                <Zap className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-bold text-purple-600">{org.stats.impactScore}</span>
              </div>
            </div>
            <CardDescription className="text-sm line-clamp-2 mt-2">
              {org.description || org.profile?.mission}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {org.profile?.sdgFocus && org.profile.sdgFocus.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {org.profile.sdgFocus.slice(0, 4).map((sdg: number) => (
                <Badge
                  key={sdg}
                  variant="outline"
                  className="text-xs cursor-pointer hover:opacity-80"
                  style={{ borderColor: getSDGColor(sdg), color: getSDGColor(sdg) }}
                  onClick={() => navigate(`/sdg-mapping?sdg=${sdg}`)}
                >
                  SDG {sdg}
                </Badge>
              ))}
              {org.profile.sdgFocus.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{org.profile.sdgFocus.length - 4} more
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
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
              >
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{org.website.replace('https://', '')}</span>
              </a>
            )}
            {org.contactEmail && (
              <a
                href={`mailto:${org.contactEmail}`}
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{org.contactEmail}</span>
              </a>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={() => navigate(`/projects?org=${org.id}`)}
              className="text-center hover:bg-gray-50 p-2 rounded-md transition-colors"
            >
              <p className="text-lg font-bold text-primary">{org.stats.projectCount}</p>
              <p className="text-xs text-gray-600">Projects</p>
            </button>
            <button
              onClick={() => navigate(`/volunteers?org=${org.id}`)}
              className="text-center hover:bg-gray-50 p-2 rounded-md transition-colors"
            >
              <p className="text-lg font-bold text-blue-600">{org.stats.volunteerCount}</p>
              <p className="text-xs text-gray-600">Volunteers</p>
            </button>
            <button
              onClick={() => navigate(`/discover-opportunities?org=${org.id}`)}
              className="text-center hover:bg-gray-50 p-2 rounded-md transition-colors"
            >
              <p className="text-lg font-bold text-green-600">{org.stats.activeOpportunities}</p>
              <p className="text-xs text-gray-600">Open Roles</p>
            </button>
            <div className="text-center p-2">
              <p className="text-lg font-bold text-purple-600">{org.stats.completedProjects}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-h-[44px]"
              onClick={() => setSelectedOrg(org)}
            >
              View Details
            </Button>
            <Button
              size="sm"
              className="flex-1 min-h-[44px]"
              onClick={() => handleContactClick(org)}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Contact
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // CSR Layout wrapper for corporate partners
  if (isCSR) {
    return (
      <CSRLayout activeNav="dashboard" title="Partner Organizations" subtitle="Explore partner organizations and their volunteer initiatives">
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          animation: "fadeIn 0.3s ease-in-out"
        }}>
          {/* Stats Cards - 3 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-3xl font-bold text-primary">
                    {isLoading ? "..." : organizationsWithStats.length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Organizations</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FolderOpen className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold text-green-600">
                    {isLoading ? "..." : activeProjectsCount}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Active Projects</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-600">
                    {isLoading ? "..." : totalVolunteers}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Total Volunteers</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#9ca3af", zIndex: 1 }} />
            <Input
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "36px", minHeight: "44px" }}
            />
          </div>

          {/* Organizations Grid - 2 columns, same width as stats grid above */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
            {filteredOrganizations.map((org) => (
              <OrganizationCard key={org.id} org={org} />
            ))}
          </div>

          {filteredOrganizations.length === 0 && (
            <Card style={{ padding: "48px", textAlign: "center" }}>
              <Building2 style={{ width: "48px", height: "48px", margin: "0 auto 16px", color: "#d1d5db" }} />
              <p style={{ color: "#6b7280" }}>No organizations found</p>
            </Card>
          )}

          {/* Contact Dialog */}
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
                    placeholder="e.g., Partnership Inquiry, CSR Collaboration"
                    className="mt-1"
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
                  >
                    {createConversationMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Organization Detail Dialog */}
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
                        {(selectedOrg.country || selectedOrg.profile?.location) && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4" />
                            {selectedOrg.country || selectedOrg.profile?.location}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-full">
                        <Zap className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-bold text-purple-600">{selectedOrg.stats.impactScore}</span>
                      </div>
                    </div>
                  </DialogHeader>

                  <Tabs defaultValue="about" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="about">About</TabsTrigger>
                      <TabsTrigger value="stats">Stats</TabsTrigger>
                      <TabsTrigger value="impact">Impact</TabsTrigger>
                    </TabsList>

                    <TabsContent value="about" className="space-y-4 mt-4">
                      <div>
                        <h4 className="font-medium mb-2">Mission</h4>
                        <p className="text-sm text-gray-600">
                          {selectedOrg.profile?.mission || selectedOrg.description || "No mission statement available."}
                        </p>
                      </div>

                      {selectedOrg.profile?.sdgFocus && selectedOrg.profile.sdgFocus.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">SDG Focus Areas</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrg.profile.sdgFocus.map((sdg: number) => (
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
                    </TabsContent>

                    <TabsContent value="stats" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <FolderOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <p className="text-2xl font-bold text-primary">{selectedOrg.stats.projectCount}</p>
                            <p className="text-sm text-gray-500">Total Projects</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                            <p className="text-2xl font-bold text-blue-600">{selectedOrg.stats.volunteerCount}</p>
                            <p className="text-sm text-gray-500">Volunteers</p>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="impact" className="space-y-4 mt-4">
                      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
                        <CardContent className="pt-6 text-center">
                          <Zap className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                          <p className="text-4xl font-bold text-purple-600">{selectedOrg.stats.impactScore}</p>
                          <p className="text-lg font-medium mt-2">SDG Impact Score</p>
                        </CardContent>
                      </Card>
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
      </CSRLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Consistent Site Navigation Header */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-emerald-50 via-green-50 to-amber-50 border-b border-emerald-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          {/* Logo */}
          <Link href="/landing">
            <div className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2">
              <img src={logoUrl} alt="Synerxus" className="h-8 w-auto" />
            </div>
          </Link>

          {/* Center: Navigation Menu */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/landing">
              <Button variant="ghost" size="sm" className="text-emerald-700 font-medium hover:bg-emerald-100 rounded-lg gap-1">
                <Home className="w-4 h-4" />
                Home
              </Button>
            </Link>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-emerald-700 font-medium hover:bg-emerald-100 rounded-lg gap-1">
                <FolderOpen className="w-4 h-4" />
                Projects
              </Button>
            </Link>
            <Link href="/organizations">
              <Button variant="ghost" size="sm" className="text-emerald-800 font-semibold bg-emerald-100/60 hover:bg-emerald-100 rounded-lg gap-1">
                <Building2 className="w-4 h-4" />
                Organizations
              </Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost" size="sm" className="text-emerald-700 font-medium hover:bg-emerald-100 rounded-lg gap-1">
                <HelpCircle className="w-4 h-4" />
                Help
              </Button>
            </Link>
          </div>

          {/* Right: Auth Actions */}
          <div className="flex gap-2">
            {userId ? (
              <Button size="sm" onClick={() => navigate(userType === 'volunteer' ? '/volunteer-dashboard' : userType === 'organization' ? '/organization-dashboard' : '/csr-dashboard')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg">
                My Dashboard
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg">
                    Log In
                  </Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-page-title">Organizations</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Partner organizations and their volunteer initiatives
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 max-w-7xl mx-auto px-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {}}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-primary" data-testid="stat-org-count">
                {isLoading ? "..." : organizationsWithStats.length}
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
        {filteredOrganizations.map((org) => (
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
                        {(org.country || org.profile?.location) && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>{org.country || org.profile?.location}</span>
                          </div>
                        )}
                      </div>
                      <div 
                        className="flex items-center gap-1 px-2 py-1 rounded-full cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                        title="Impact Score - based on projects, volunteers, hours, and people impacted"
                      >
                        <Zap className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-bold text-purple-600">{org.stats.impactScore}</span>
                      </div>
                    </div>
                    <CardDescription className="text-sm line-clamp-2 mt-2">
                      {org.description || org.profile?.mission}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {org.profile?.sdgFocus && org.profile.sdgFocus.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {org.profile.sdgFocus.slice(0, 4).map((sdg: number) => (
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
                      {org.profile.sdgFocus.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{org.profile.sdgFocus.length - 4} more
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
                      <p className="text-lg font-bold text-primary">{org.stats.projectCount}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Projects</p>
                    </button>
                    <button 
                      onClick={() => navigate(`/volunteers?org=${org.id}`)}
                      className="text-center hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
                      data-testid={`stat-volunteers-${org.id}`}
                    >
                      <p className="text-lg font-bold text-blue-600">{org.stats.volunteerCount}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Volunteers</p>
                    </button>
                    <button 
                      onClick={() => navigate(`/discover-opportunities?org=${org.id}`)}
                      className="text-center hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-md transition-colors"
                      data-testid={`stat-opportunities-${org.id}`}
                    >
                      <p className="text-lg font-bold text-green-600">{org.stats.activeOpportunities}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Open Roles</p>
                    </button>
                    <div className="text-center p-2">
                      <p className="text-lg font-bold text-purple-600">{org.stats.completedProjects}</p>
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
        ))}
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
                    {(selectedOrg.country || selectedOrg.profile?.location) && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {selectedOrg.country || selectedOrg.profile?.location}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-full"
                    title="Impact Score"
                  >
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-bold text-purple-600">{selectedOrg.stats.impactScore}</span>
                  </div>
                </div>
              </DialogHeader>
              
              <Tabs defaultValue="about" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="impact">Impact</TabsTrigger>
                </TabsList>
                
                <TabsContent value="about" className="space-y-4 mt-4">
                  <div>
                    <h4 className="font-medium mb-2">Mission</h4>
                    <p className="text-sm text-gray-600">
                      {selectedOrg.profile?.mission || selectedOrg.description || "No mission statement available."}
                    </p>
                  </div>
                  
                  {selectedOrg.profile?.sdgFocus && selectedOrg.profile.sdgFocus.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">SDG Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrg.profile.sdgFocus.map((sdg: number) => (
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
                
                <TabsContent value="stats" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <FolderOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold text-primary">{selectedOrg.stats.projectCount}</p>
                        <p className="text-sm text-gray-500">Total Projects</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-600">{selectedOrg.stats.volunteerCount}</p>
                        <p className="text-sm text-gray-500">Volunteers</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <Target className="h-6 w-6 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold text-green-600">{selectedOrg.stats.activeOpportunities}</p>
                        <p className="text-sm text-gray-500">Open Opportunities</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <CheckCircle className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                        <p className="text-2xl font-bold text-purple-600">{selectedOrg.stats.completedProjects}</p>
                        <p className="text-sm text-gray-500">Completed</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Total Volunteer Hours</span>
                        <span className="text-lg font-bold text-primary">{selectedOrg.stats.totalHours}</span>
                      </div>
                      <Progress value={Math.min(selectedOrg.stats.totalHours / 10, 100)} className="h-2" />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="impact" className="space-y-4 mt-4">
                  <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                    <CardContent className="pt-6 text-center">
                      <Zap className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                      <p className="text-4xl font-bold text-purple-600">{selectedOrg.stats.impactScore}</p>
                      <p className="text-lg font-medium mt-2">SDG Impact Score</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on projects, volunteers, hours contributed, and community impact
                      </p>
                    </CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold">{selectedOrg.stats.projectCount}</p>
                        <p className="text-sm text-gray-500">Total Projects</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold">{selectedOrg.stats.volunteerCount}</p>
                        <p className="text-sm text-gray-500">Volunteers</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold">{selectedOrg.stats.completedProjects}</p>
                        <p className="text-sm text-gray-500">Completed</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <p className="text-2xl font-bold">{selectedOrg.stats.totalHours}</p>
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
