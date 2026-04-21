import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Building2, Users, FolderOpen, MessageSquare, MapPin, Zap, Globe, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getSDGColor } from "@shared/sdg-goals";
import { useViewportDetection } from "@/hooks/use-mobile";
import PWAHeader from "@/components/pwa/pwa-header";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";

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

export default function OrganizationsPWA() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithStats | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactOrg, setContactOrg] = useState<OrganizationWithStats | null>(null);
  const [messageTopic, setMessageTopic] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isMobile, isLoading: viewportLoading } = useViewportDetection();

  const userId = localStorage.getItem('currentUserId');
  const userType = localStorage.getItem('userType');

  // Redirect to desktop version when not mobile
  useEffect(() => {
    if (!viewportLoading && !isMobile) {
      navigate('/organizations');
    }
  }, [viewportLoading, isMobile, navigate]);

  // Fetch organizations with real stats
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
        description: "Your message has been sent to the organization."
      });
      if (userType === 'volunteer') {
        navigate('/volunteer-messages/pwa');
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

  // Show loading while detecting viewport
  if (viewportLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-sky-100 to-amber-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // Render appropriate header based on user type
  const renderHeader = () => {
    if (userType === 'organization') {
      return <OrganizationPWAHeader />;
    }
    return <PWAHeader />;
  };

  // Render appropriate navigation based on user type
  const renderNav = () => {
    if (userType === 'organization') {
      return <OrganizationPWANav activeTab="home" />;
    }
    return <VolunteerPWANav userId={userId || undefined} activeTab="potentials" />;
  };

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] flex flex-col bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      {/* PWA Header */}
      {renderHeader()}

      {/* Spacer for fixed header - accounts for safe-area-inset-top */}
      <div className="flex-shrink-0" style={{ height: 'calc(env(safe-area-inset-top, 0px) + 64px)' }} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        {/* Page Title */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-600">Partner organizations and their initiatives</p>
        </div>

        {/* Search */}
        <div className="px-4 py-2 sticky top-0 bg-gradient-to-b from-slate-50 to-transparent z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="px-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <Building2 className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-primary">{organizationsWithStats.length}</p>
              <p className="text-xs text-gray-600">Orgs</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <FolderOpen className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-lg font-bold text-green-600">
                {organizationsWithStats.reduce((sum, org) => sum + org.stats.projectCount, 0)}
              </p>
              <p className="text-xs text-gray-600">Projects</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-lg font-bold text-blue-600">
                {organizationsWithStats.reduce((sum, org) => sum + org.stats.volunteerCount, 0)}
              </p>
              <p className="text-xs text-gray-600">Volunteers</p>
            </div>
          </div>
        </div>

        {/* Organizations List */}
        <div className="px-4 py-2 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading organizations...</div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No organizations found</p>
            </div>
          ) : (
            filteredOrganizations.map((org) => (
              <Card key={org.id} className="overflow-hidden" onClick={() => setSelectedOrg(org)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 rounded-lg flex-shrink-0">
                      <AvatarImage src={org.logo} className="object-cover" />
                      <AvatarFallback className="rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{org.name}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Zap className="h-3 w-3 text-purple-600" />
                          <span className="text-xs font-bold text-purple-600">{org.stats.impactScore}</span>
                        </div>
                      </div>
                      {(org.country || org.profile?.location) && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{org.country || org.profile?.location}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {org.description || org.profile?.mission}
                      </p>

                      {/* SDG badges */}
                      {org.profile?.sdgFocus && org.profile.sdgFocus.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {org.profile.sdgFocus.slice(0, 3).map((sdg: number) => (
                            <Badge
                              key={sdg}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              style={{ borderColor: getSDGColor(sdg), color: getSDGColor(sdg) }}
                            >
                              SDG {sdg}
                            </Badge>
                          ))}
                          {org.profile.sdgFocus.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{org.profile.sdgFocus.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{org.stats.projectCount} projects</span>
                        <span>{org.stats.volunteerCount} volunteers</span>
                        <span>{org.stats.activeOpportunities} open</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/discover-opportunities?org=${org.id}`);
                      }}
                    >
                      View Opportunities
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactClick(org);
                      }}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* PWA Bottom Navigation */}
      {renderNav()}

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-[90vw] rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Contact {contactOrg?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm font-medium">Topic</label>
              <Input
                value={messageTopic}
                onChange={(e) => setMessageTopic(e.target.value)}
                placeholder="e.g., Volunteer Inquiry"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Write your message..."
                rows={3}
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
                {createConversationMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Organization Detail Dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-lg">
          {selectedOrg && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 rounded-lg">
                    <AvatarImage src={selectedOrg.logo} className="object-cover" />
                    <AvatarFallback className="rounded-lg bg-primary/10">
                      <Building2 className="h-7 w-7 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg">{selectedOrg.name}</DialogTitle>
                    {(selectedOrg.country || selectedOrg.profile?.location) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {selectedOrg.country || selectedOrg.profile?.location}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-full">
                    <Zap className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-bold text-purple-600">{selectedOrg.stats.impactScore}</span>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Mission */}
                <div>
                  <h4 className="font-medium text-sm mb-1">Mission</h4>
                  <p className="text-xs text-gray-600">
                    {selectedOrg.profile?.mission || selectedOrg.description || "No mission statement available."}
                  </p>
                </div>

                {/* SDG Focus */}
                {selectedOrg.profile?.sdgFocus && selectedOrg.profile.sdgFocus.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">SDG Focus</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedOrg.profile.sdgFocus.map((sdg: number) => (
                        <Badge
                          key={sdg}
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: getSDGColor(sdg), color: getSDGColor(sdg) }}
                        >
                          SDG {sdg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <FolderOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold text-primary">{selectedOrg.stats.projectCount}</p>
                    <p className="text-xs text-gray-500">Projects</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-lg font-bold text-blue-600">{selectedOrg.stats.volunteerCount}</p>
                    <p className="text-xs text-gray-500">Volunteers</p>
                  </div>
                </div>

                {/* Links */}
                <div className="flex gap-2">
                  {selectedOrg.website && (
                    <a
                      href={selectedOrg.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-50 rounded-lg text-xs hover:bg-gray-100"
                    >
                      <Globe className="h-4 w-4 text-primary" />
                      Website
                    </a>
                  )}
                  {selectedOrg.contactEmail && (
                    <a
                      href={`mailto:${selectedOrg.contactEmail}`}
                      className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-50 rounded-lg text-xs hover:bg-gray-100"
                    >
                      <Mail className="h-4 w-4 text-primary" />
                      Email
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedOrg(null);
                      navigate(`/discover-opportunities?org=${selectedOrg.id}`);
                    }}
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
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
