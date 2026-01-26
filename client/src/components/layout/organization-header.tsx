import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  FolderOpen, Users, Plus, MessageSquare,
  Target, BarChart3, FileText, Bell, Settings, LogOut, User, Menu, X, UsersRound, MoreVertical, Home, ClipboardList, Trophy,
  CheckCircle, XCircle, ChevronLeft, ExternalLink, MapPin, Clock, Star, Briefcase, Key
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

// Helper function for relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/organization-dashboard' },
  { id: 'verify', label: 'Verify', icon: CheckCircle, path: '/ngo-verification' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/projects' },
  { id: 'team', label: 'Team', icon: Users, path: '/volunteers' },
  { id: 'impact', label: 'Impact', icon: BarChart3, path: '/organization-impact-report' },
];

interface OrganizationHeaderProps {
  activeTab?: string;
  onCreateClick?: () => void;
}

export default function OrganizationHeader({ activeTab = 'dashboard', onCreateClick }: OrganizationHeaderProps) {
  const { user, signOut } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const userId = localStorage.getItem('currentUserId');

  // Don't render web header on PWA routes or mobile devices
  const isPwaRoute = location.endsWith('/pwa');
  const isMobile = window.innerWidth <= 768;
  if (isPwaRoute || isMobile) {
    return null;
  }

  // Fetch notifications for organization user
  const { data: notifications = [], refetch: refetchNotifications } = useQuery<any[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/notifications?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data after invalidation
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 60000, // Refetch every minute as backup
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  // Fetch application details when a notification is selected
  const { data: applicationDetails } = useQuery({
    queryKey: ["/api/applications", selectedNotification?.relatedEntityId],
    queryFn: async () => {
      if (!selectedNotification?.relatedEntityId || selectedNotification?.relatedEntityType !== 'application') return null;
      const response = await fetch(`/api/applications/${selectedNotification.relatedEntityId}`);
      if (!response.ok) return null;
      const app = await response.json();

      // Fetch opportunity and volunteer details
      const [oppRes, volRes] = await Promise.all([
        fetch(`/api/opportunities/${app.opportunityId}`),
        fetch(`/api/users/${app.volunteerId}`)
      ]);

      return {
        ...app,
        opportunity: oppRes.ok ? await oppRes.json() : null,
        volunteer: volRes.ok ? await volRes.json() : null
      };
    },
    enabled: !!selectedNotification?.relatedEntityId && selectedNotification?.relatedEntityType === 'application'
  });

  // Fetch volunteer profile for detailed view
  const { data: volunteerProfile } = useQuery({
    queryKey: ["/api/intake/volunteer-profile", applicationDetails?.volunteerId],
    queryFn: async () => {
      if (!applicationDetails?.volunteerId) return null;
      const response = await fetch(`/api/intake/volunteer-profile?userId=${applicationDetails.volunteerId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!applicationDetails?.volunteerId
  });

  // Review application mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ applicationId, status, notes }: { applicationId: number; status: string; notes?: string }) => {
      return await apiRequest("POST", `/api/applications/${applicationId}/review`, {
        status,
        notes,
        reviewerId: parseInt(userId || "0")
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === "accepted" ? "Application Accepted" : "Application Rejected",
        description: variables.status === "accepted"
          ? "The volunteer has been assigned to the project and notified."
          : "The volunteer has been notified of your decision.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
      setSelectedNotification(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to process application",
        variant: "destructive",
      });
    }
  });

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark notification as read on backend
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Invalidate cache to refresh notification list
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });

      // For application notifications, show details in panel instead of navigating
      const notificationType = notification.type || '';
      if (notificationType === 'new_application' && notification.relatedEntityType === 'application') {
        setSelectedNotification(notification);
        return; // Don't navigate, show in panel
      }

      // For other notifications, navigate to the relevant page
      if (notificationType.includes('application')) {
        navigate('/applications');
        setNotificationPanelOpen(false);
      } else if (notificationType.includes('project') || notificationType.includes('assignment')) {
        navigate('/my-work');
        setNotificationPanelOpen(false);
      } else if (notificationType.includes('message')) {
        navigate('/organization-messages');
        setNotificationPanelOpen(false);
      } else if (notificationType.includes('volunteer')) {
        navigate('/volunteers');
        setNotificationPanelOpen(false);
      } else {
        navigate('/organization-dashboard');
        setNotificationPanelOpen(false);
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const handleAcceptApplication = () => {
    if (applicationDetails?.id) {
      reviewMutation.mutate({ applicationId: applicationDetails.id, status: "accepted" });
    }
  };

  const handleRejectApplication = () => {
    if (applicationDetails?.id) {
      reviewMutation.mutate({ applicationId: applicationDetails.id, status: "rejected" });
    }
  };

  const handleViewFullApplication = () => {
    setNotificationPanelOpen(false);
    navigate('/applications');
  };

  const handleTabClick = (tab: typeof NAV_TABS[0]) => {
    if (tab.id === 'create') {
      onCreateClick?.();
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  const handleLogoClick = () => {
    navigate('/organization-dashboard');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      setIsProfileOpen(false);
      navigate('/landing');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentTab = NAV_TABS.find(tab => tab.path === location)?.id || activeTab;

  return (
    <div style={{
      background: '#f9fafb',
      padding: '16px 24px 0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Constrained container matching body width */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'linear-gradient(to right, #fef9c3 0%, #fef3c7 25%, #dbeafe 50%, #bfdbfe 75%, #93c5fd 100%)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.25)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
        {/* Left: Logo + Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingRight: '16px',
              borderRight: '1px solid rgba(30, 58, 138, 0.3)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
            title="Go to Dashboard"
          >
            <img
              src={logoUrl}
              alt="Synerxus Logo"
              style={{ height: '36px', width: 'auto', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
            />
          </button>

          {/* Navigation Tabs - Always visible, responsive sizing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              data-testid={`nav-tab-${tab.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: currentTab === tab.id ? 'rgba(30, 58, 138, 0.15)' : 'rgba(255,255,255,0.5)',
                border: currentTab === tab.id ? '1px solid rgba(30, 58, 138, 0.4)' : '1px solid rgba(30, 58, 138, 0.2)',
                borderRadius: '8px',
                color: currentTab === tab.id ? '#1e3a8a' : '#1e40af',
                fontSize: '14px',
                fontWeight: currentTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                textShadow: 'none',
                boxShadow: currentTab === tab.id ? '0 2px 8px rgba(30, 58, 138, 0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(30, 58, 138, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <tab.icon size={16} style={{ color: currentTab === tab.id ? '#1e3a8a' : '#1e40af' }} />
              {tab.label}
            </button>
          ))}
          </div>
        </div>

        {/* Right: Notifications, Settings, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Notifications Popover - Interactive Panel */}
          <Popover open={notificationPanelOpen} onOpenChange={(open) => {
            setNotificationPanelOpen(open);
            if (!open) setSelectedNotification(null);
          }}>
            <PopoverTrigger asChild>
              <button
                data-testid="notifications-button"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: notificationPanelOpen ? 'rgba(30, 58, 138, 0.15)' : 'rgba(255,255,255,0.6)',
                  border: `1px solid ${notificationPanelOpen ? 'rgba(30, 58, 138, 0.5)' : 'rgba(30, 58, 138, 0.3)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e40af',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(30, 58, 138, 0.1)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!notificationPanelOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(30, 58, 138, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.4)';
                  }
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  if (!notificationPanelOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)';
                    e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.3)';
                  }
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Bell size={18} style={{ color: '#1e40af' }} />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 min-h-5 min-w-5 h-5 w-5 flex items-center justify-center px-0 text-xs font-bold leading-none rounded-full"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
              {selectedNotification ? (
                /* Application Detail View */
                <div className="flex flex-col">
                  {/* Header with back button */}
                  <div className="flex items-center gap-2 p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedNotification(null)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="font-semibold text-sm">Application Details</h3>
                  </div>

                  <ScrollArea className="max-h-[400px]">
                    {applicationDetails ? (
                      <div className="p-4 space-y-4">
                        {/* Volunteer Info */}
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={applicationDetails.volunteer?.avatar} />
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {applicationDetails.volunteer?.displayName?.[0] || 'V'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">
                              {applicationDetails.volunteer?.displayName || 'Unknown'}
                            </h4>
                            <p className="text-xs text-gray-500 truncate">
                              {applicationDetails.volunteer?.email}
                            </p>
                            {applicationDetails.matchScore && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs font-medium text-yellow-700">
                                  {applicationDetails.matchScore}% Match
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Opportunity Info */}
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">
                              {applicationDetails.opportunity?.title || 'Unknown Opportunity'}
                            </span>
                          </div>
                          {applicationDetails.opportunity?.location && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              <span>{applicationDetails.opportunity.location}</span>
                            </div>
                          )}
                          {applicationDetails.opportunity?.timeCommitment && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{applicationDetails.opportunity.timeCommitment}</span>
                            </div>
                          )}
                        </div>

                        {/* Volunteer Profile Summary */}
                        {volunteerProfile?.volunteerProfile && (
                          <div className="space-y-2">
                            {volunteerProfile.volunteerProfile.skills?.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-1">Skills</p>
                                <div className="flex flex-wrap gap-1">
                                  {volunteerProfile.volunteerProfile.skills.slice(0, 5).map((skill: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs px-2 py-0">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {volunteerProfile.volunteerProfile.skills.length > 5 && (
                                    <Badge variant="outline" className="text-xs px-2 py-0">
                                      +{volunteerProfile.volunteerProfile.skills.length - 5}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {volunteerProfile.volunteerProfile.sdgGoals?.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-1">SDG Commitments</p>
                                <div className="flex flex-wrap gap-1">
                                  {volunteerProfile.volunteerProfile.sdgGoals.slice(0, 4).map((sdg: number, i: number) => (
                                    <Badge key={i} className="text-xs px-2 py-0 bg-green-100 text-green-700">
                                      SDG {sdg}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {volunteerProfile.volunteerProfile.weeklyAvailability && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Clock className="h-3 w-3" />
                                <span>{volunteerProfile.volunteerProfile.weeklyAvailability} hrs/week available</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Cover Letter Preview */}
                        {applicationDetails.coverLetter && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Cover Letter</p>
                            <p className="text-xs text-gray-600 line-clamp-3 bg-white border rounded p-2">
                              {applicationDetails.coverLetter}
                            </p>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Applied {applicationDetails.appliedAt ? getRelativeTime(new Date(applicationDetails.appliedAt)) : ''}
                          </span>
                          <Badge variant={applicationDetails.status === 'pending' ? 'outline' : applicationDetails.status === 'accepted' ? 'default' : 'destructive'}>
                            {applicationDetails.status?.charAt(0).toUpperCase() + applicationDetails.status?.slice(1)}
                          </Badge>
                        </div>

                        {/* Action Buttons - Only show for pending applications */}
                        {applicationDetails.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={handleRejectApplication}
                              disabled={reviewMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={handleAcceptApplication}
                              disabled={reviewMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                          </div>
                        )}

                        {/* View Full Details Link */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-blue-600"
                          onClick={handleViewFullApplication}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Full Application
                        </Button>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Loading...</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              ) : (
                /* Notification List View */
                <div className="flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="font-semibold">Notifications</h3>
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} unread
                    </Badge>
                  </div>

                  <ScrollArea className="max-h-[350px]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">No notifications yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          You'll receive notifications about applications and project updates
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.slice(0, 10).map((notification: any) => {
                          const timeAgo = notification.createdAt ?
                            getRelativeTime(new Date(notification.createdAt)) : '';
                          const isApplicationNotification = notification.type === 'new_application';

                          return (
                            <div
                              key={notification.id}
                              className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isApplicationNotification ? 'bg-green-100' : 'bg-blue-100'
                                }`}>
                                  {isApplicationNotification ? (
                                    <User className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Bell className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <span className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                                      {notification.title}
                                    </span>
                                    {!notification.read && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-gray-400">{timeAgo}</span>
                                    {isApplicationNotification && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0 text-green-600 border-green-200">
                                        Review
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {notifications.length > 0 && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-blue-600"
                        onClick={handleViewFullApplication}
                      >
                        View all applications
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Profile Avatar */}
          <button
            data-testid="profile-avatar"
            onClick={() => navigate('/profile')}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.7)',
              border: '2px solid rgba(30, 58, 138, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e40af',
              overflow: 'hidden',
              transition: 'all 0.2s',
              boxShadow: '0 2px 10px rgba(30, 58, 138, 0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(30, 58, 138, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.5)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)';
              e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.4)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {(user as any)?.avatar ? (
              <img src={(user as any).avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <Users size={18} style={{ color: '#1e40af' }} />
            )}
          </button>

          {/* 3-dot Menu Dropdown */}
          <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="more-menu-button"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(30, 58, 138, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e40af',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(30, 58, 138, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(30, 58, 138, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.4)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 0.3)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <MoreVertical size={18} style={{ color: '#1e40af' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* User Info Header */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-blue-50 border-b">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(30, 58, 138, 0.1)',
                    border: '2px solid rgba(30, 58, 138, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {(user as any)?.avatar ? (
                    <img src={(user as any).avatar} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <Users size={18} style={{ color: '#1e40af' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate" data-testid="text-user-display-name">
                    {user?.displayName || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate" data-testid="text-user-email">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="py-1">
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/organization-dashboard'); setIsProfileOpen(false); }} data-testid="menu-dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/my-work'); setIsProfileOpen(false); }} data-testid="menu-projects">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  <span>Projects</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/volunteers'); setIsProfileOpen(false); }} data-testid="menu-volunteers">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Volunteers</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/organization-team'); setIsProfileOpen(false); }} data-testid="menu-team">
                  <UsersRound className="mr-2 h-4 w-4" />
                  <span>Team</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/applications'); setIsProfileOpen(false); }} data-testid="menu-applications">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Applications</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/organization-messages'); setIsProfileOpen(false); }} data-testid="menu-messages">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Messages</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/log-volunteer-hours'); setIsProfileOpen(false); }} data-testid="menu-log-hours">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  <span>Log Hours</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/sdg-mapping'); setIsProfileOpen(false); }} data-testid="menu-sdgs">
                  <Target className="mr-2 h-4 w-4" />
                  <span>SDG Mapping</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/impact-visualization'); setIsProfileOpen(false); }} data-testid="menu-impact">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Impact Reports</span>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />

              {/* Settings & Account */}
              <div className="py-1">
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/profile'); setIsProfileOpen(false); }} data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/organization-profile-settings'); setIsProfileOpen(false); }} data-testid="menu-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/organization-team'); setIsProfileOpen(false); }} data-testid="menu-team-management">
                  <UsersRound className="mr-2 h-4 w-4" />
                  <span>Team Management</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => { navigate('/invitation-codes'); setIsProfileOpen(false); }} data-testid="menu-invitation-codes">
                  <Key className="mr-2 h-4 w-4" />
                  <span>Invitation Codes</span>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={handleSignOut} data-testid="menu-logout">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </nav>
      </div>
    </div>
  );
}
