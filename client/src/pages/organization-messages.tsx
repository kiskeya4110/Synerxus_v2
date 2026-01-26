import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MessageCircle, Send, Search, User, Clock, ChevronRight, Bell, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import OrganizationHeader from "@/components/layout/organization-header";
import Footer from "@/components/layout/footer";
import { useIsMobile } from "@/hooks/use-mobile";

export default function OrganizationMessages() {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");
  const isOrganization = userType === "organization";

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch notifications as messages placeholder
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      return response.ok ? response.json() : [];
    },
    enabled: !!userId,
  });

  // Fetch volunteers for the organization
  const { data: volunteers = [] } = useQuery<any[]>({
    queryKey: ["/api/organizations", userId, "volunteers"],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${userId}/volunteers`, {
        headers: { "x-user-id": userId || "" },
      });
      return response.ok ? response.json() : [];
    },
    enabled: !!userId && isOrganization,
  });

  // Filter volunteers by search
  const filteredVolunteers = volunteers.filter((v: any) =>
    (v.displayName || v.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format time ago
  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // Mobile PWA View
  if (isOrganization && isMobile) {
    return (
      <OrganizationPWALayout activeTab="messages">
        <div className="px-4 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Messages</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {volunteers.length} team member{volunteers.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => navigate("/volunteers")}
            >
              <Users className="h-4 w-4 mr-1" />
              Team
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center bg-blue-50 border-blue-200">
              <MessageCircle className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-700">{notifications.filter((n: any) => !n.read).length}</p>
              <p className="text-[10px] text-blue-600">Unread</p>
            </Card>
            <Card className="p-3 text-center bg-emerald-50 border-emerald-200">
              <Users className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-emerald-700">{volunteers.length}</p>
              <p className="text-[10px] text-emerald-600">Contacts</p>
            </Card>
            <Card className="p-3 text-center bg-purple-50 border-purple-200">
              <Bell className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-700">{notifications.length}</p>
              <p className="text-[10px] text-purple-600">Total</p>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 text-sm bg-white border-slate-200 rounded-xl"
            />
          </div>

          {/* Recent Notifications Section */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Recent Activity</h2>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notif: any) => (
                <Card
                  key={notif.id}
                  className={`p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] ${
                    !notif.read ? "bg-blue-50 border-blue-200" : ""
                  }`}
                  onClick={() => navigate("/organization-dashboard/pwa")}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      !notif.read ? "bg-blue-500" : "bg-slate-200"
                    }`}>
                      <Bell className={`h-5 w-5 ${!notif.read ? "text-white" : "text-slate-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{notif.title}</p>
                      <p className="text-xs text-slate-500 truncate">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(notif.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                  </div>
                </Card>
              ))}

              {notifications.length === 0 && (
                <Card className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-1">Activity will appear here</p>
                </Card>
              )}
            </div>
          </div>

          {/* Team Contacts Section */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Team Contacts</h2>
            <div className="space-y-2">
              {filteredVolunteers.slice(0, 10).map((volunteer: any) => (
                <Card
                  key={volunteer.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                  onClick={() => navigate("/volunteers")}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={volunteer.profilePhotoUrl || volunteer.avatar} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700">
                        {(volunteer.displayName || volunteer.name || "V").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {volunteer.displayName || volunteer.name || "Volunteer"}
                      </p>
                      <p className="text-xs text-slate-500">{volunteer.hours || 0}h logged</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Send className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                </Card>
              ))}

              {filteredVolunteers.length === 0 && (
                <Card className="p-6 text-center">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {searchTerm ? "No contacts match your search" : "No team members yet"}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </OrganizationPWALayout>
    );
  }

  // Desktop View
  return (
    <div className="min-h-screen bg-gray-50">
      <OrganizationHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>

        <Card className="p-8 text-center">
          <MessageCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Messaging Coming Soon</h2>
          <p className="text-slate-500 mb-4">
            Direct messaging with volunteers will be available in a future update.
          </p>
          <Button onClick={() => navigate("/volunteers")}>
            <Users className="h-4 w-4 mr-2" />
            View Team
          </Button>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
