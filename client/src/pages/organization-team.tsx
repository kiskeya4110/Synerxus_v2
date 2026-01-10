import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationWelcomeBanner from "@/components/layout/organization-welcome-banner";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import OfflineBanner from "@/components/layout/offline-banner";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UsersRound, UserPlus, Shield, ShieldCheck, Settings, Trash2,
  Mail, Check, X, ChevronDown, Edit2, Building2, Briefcase, MessageSquare,
  Phone, MoreVertical, Clock, Calendar, Eye, Send, Copy, RefreshCw, ArrowLeft
} from "lucide-react";

interface OrganizationMember {
  id: number;
  organizationId: number;
  userId: number;
  role: string;
  title: string | null;
  department: string | null;
  canApproveHours: boolean;
  canApproveApplications: boolean;
  canManageProjects: boolean;
  canManageMembers: boolean;
  canViewReports: boolean;
  canEditOrganization: boolean;
  status: string;
  invitedAt: string | null;
  acceptedAt: string | null;
  user: {
    id: number;
    email: string;
    displayName: string;
    username: string;
    avatar: string | null;
  } | null;
}

const ROLE_BADGES: Record<string, { color: string; icon: typeof Shield }> = {
  admin: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: ShieldCheck },
  hr: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Shield },
  manager: { color: "bg-green-100 text-green-700 border-green-200", icon: Settings },
  member: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: UsersRound },
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["Full access", "Can manage all settings", "Can invite/remove members"],
  hr: ["Approve volunteer hours", "Approve applications", "View reports"],
  manager: ["Manage projects", "Approve hours/applications", "View reports"],
  member: ["View dashboard", "View reports"],
};

const DEPARTMENTS = [
  "Human Resources",
  "CSR & Sustainability",
  "Marketing",
  "Operations",
  "Finance",
  "Legal",
  "IT & Technology",
  "Sales",
  "Customer Service",
  "Executive Leadership",
  "Product",
  "Engineering",
  "Communications",
  "Administration",
  "Other",
];

const JOB_TITLES = [
  "HR Manager",
  "HR Director",
  "CSR Manager",
  "CSR Director",
  "Sustainability Manager",
  "Volunteer Coordinator",
  "Project Manager",
  "Department Head",
  "Team Lead",
  "Coordinator",
  "Analyst",
  "Specialist",
  "Administrator",
  "Assistant",
  "Other",
];

export default function OrganizationTeamPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [viewingMember, setViewingMember] = useState<OrganizationMember | null>(null);
  const [memberActionsOpen, setMemberActionsOpen] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [invitationMethod, setInvitationMethod] = useState<"email" | "direct_message" | "both">("email");
  const [customMessage, setCustomMessage] = useState("");
  const [inviteLinkResult, setInviteLinkResult] = useState<{ link: string; email: string } | null>(null);

  // Get current user's organization
  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!userId,
  });

  const organizationId = currentUser?.organizationId;

  // Fetch organization members
  const { data: members = [], isLoading } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organizations", organizationId, "members"],
    queryFn: async () => {
      if (!organizationId) return [];
      const res = await fetch(`/api/organizations/${organizationId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!organizationId,
  });

  // Fetch current user's permissions
  const { data: myPermissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ["/api/organizations", organizationId, "my-permissions", userId],
    queryFn: async () => {
      if (!organizationId || !userId) return null;
      const res = await fetch(`/api/organizations/${organizationId}/my-permissions?userId=${userId}`, {
        headers: { 'x-user-id': userId }
      });
      if (!res.ok) {
        // If 404, check if user is organization type - they are the owner
        if (res.status === 404 && currentUser?.userType === 'organization') {
          return { role: 'admin', isOwner: true, permissions: { canManageMembers: true } };
        }
        return null;
      }
      return res.json();
    },
    enabled: !!organizationId && !!userId,
  });

  // Organization owners (userType = organization) always have full permissions
  const isOrganizationOwner = currentUser?.userType === 'organization';
  const canManageMembers = isOrganizationOwner || myPermissions?.permissions?.canManageMembers || myPermissions?.role === "admin" || myPermissions?.isOwner;

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      role: string;
      title?: string;
      department?: string;
      invitationMethod?: "email" | "direct_message" | "both";
      customMessage?: string;
    }) => {
      const res = await fetch(`/api/organizations/${organizationId}/members/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, invitedBy: parseInt(userId || "0") }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to invite member");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organizationId, "members"] });
      setShowInviteModal(false);

      // Show the invite link modal with the generated link
      if (data.inviteLink) {
        const fullLink = `${window.location.origin}${data.inviteLink}`;
        setInviteLinkResult({ link: fullLink, email: inviteEmail });
      }

      setInviteEmail("");
      setInviteRole("member");
      setInviteTitle("");
      setInviteDepartment("");
      setInvitationMethod("email");
      setCustomMessage("");
      setCustomTitle("");
      setCustomDepartment("");

      toast({ title: "Invitation created", description: "Share the invite link with the team member." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to invite", description: error.message, variant: "destructive" });
    },
  });

  // Update member mutation
  const updateMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: number; data: any }) => {
      const res = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organizationId, "members"] });
      setEditingMember(null);
      toast({ title: "Member updated", description: "Team member has been updated." });
    },
    onError: () => {
      toast({ title: "Failed to update", description: "Could not update team member.", variant: "destructive" });
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organizationId, "members"] });
      toast({ title: "Member removed", description: "Team member has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail) return;
    inviteMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
      title: inviteTitle || undefined,
      department: inviteDepartment || undefined,
    });
  };

  const activeMembers = members.filter(m => m.status === "active");
  const pendingMembers = members.filter(m => m.status === "invited");

  // Use localStorage as fallback for PWA layout detection during initial load
  const isOrganizationForLayout = currentUser?.userType === 'organization' || userType === 'organization';

  // Mobile PWA View for Organizations
  if (isMobile && isOrganizationForLayout) {
    return (
      <OrganizationPWALayout activeTab="home">
        <div className="p-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/organization-dashboard/pwa')}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {/* Header */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-indigo-600" />
              Team Management
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage team members and permissions
            </p>
          </div>

          {/* Invite Button */}
          {canManageMembers && (
            <Button
              onClick={() => setShowInviteModal(true)}
              className="w-full mb-4 bg-indigo-600 hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Team Member
            </Button>
          )}

          {/* Active Members */}
          <Card className="mb-4">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UsersRound className="w-4 h-4 text-indigo-500" />
                Active Members ({activeMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-3">
              {isLoading ? (
                <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
              ) : activeMembers.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  <UsersRound className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p>No team members yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeMembers.map((member) => {
                    const badge = ROLE_BADGES[member.role] || ROLE_BADGES.member;
                    const Icon = badge.icon;
                    return (
                      <div
                        key={member.id}
                        className="px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50"
                        onClick={() => setViewingMember(member)}
                      >
                        <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                          {member.user?.avatar ? (
                            <img src={member.user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            member.user?.displayName?.charAt(0) || "?"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{member.user?.displayName || "Unknown"}</p>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${badge.color}`}>
                              <Icon className="h-2.5 w-2.5" />
                              {member.role}
                            </span>
                            {member.title && <span className="text-[10px] text-slate-500 truncate">{member.title}</span>}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400 rotate-[-90deg]" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {pendingMembers.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Invitations ({pendingMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-3">
                <div className="divide-y divide-slate-100">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="px-3 py-2.5 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{member.user?.email || "Pending"}</p>
                        <p className="text-[10px] text-slate-500">
                          Invited {member.invitedAt ? new Date(member.invitedAt).toLocaleDateString() : "recently"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Viewing Member Modal - Reuse existing logic */}
          {viewingMember && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => setViewingMember(null)}>
              <div className="bg-white rounded-2xl w-full max-w-[400px] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-lg">
                    {viewingMember.user?.avatar ? (
                      <img src={viewingMember.user.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      viewingMember.user?.displayName?.charAt(0) || "?"
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{viewingMember.user?.displayName}</p>
                    <p className="text-sm text-slate-500">{viewingMember.user?.email}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {viewingMember.title && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase className="h-4 w-4" />
                      {viewingMember.title}
                    </div>
                  )}
                  {viewingMember.department && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building2 className="h-4 w-4" />
                      {viewingMember.department}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      navigate(`/organization-messages-pwa?member=${viewingMember.userId}`);
                      setViewingMember(null);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (viewingMember.user?.email) {
                        window.location.href = `mailto:${viewingMember.user.email}`;
                      }
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Invite Modal - Simplified for mobile */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => setShowInviteModal(false)}>
              <div className="bg-white rounded-2xl w-full max-w-[400px] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Invite Team Member</h3>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      inviteMutation.mutate({
                        email: inviteEmail,
                        role: inviteRole,
                      });
                    }}
                    disabled={!inviteEmail || inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Invite Link Success Modal - Mobile */}
          {inviteLinkResult && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => setInviteLinkResult(null)}>
              <div className="bg-white rounded-2xl w-full max-w-[400px] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Invitation Created</h3>
                </div>

                <p className="text-sm text-slate-600 mb-3">
                  Share this link with <span className="font-medium">{inviteLinkResult.email}</span>
                </p>

                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <input
                    type="text"
                    value={inviteLinkResult.link}
                    readOnly
                    className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 mb-2"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLinkResult.link);
                      toast({ title: "Link Copied!", description: "Invite link copied to clipboard" });
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setInviteLinkResult(null)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </OrganizationPWALayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <OfflineBanner />
      <OrganizationHeader activeTab="team" />
      <OrganizationWelcomeBanner pageTitle="Team Management" />

      <main className="flex-1 max-w-[1400px] mx-auto px-6 pt-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <UsersRound className="h-7 w-7 text-indigo-600" />
              Team Management
            </h1>
            <p className="text-slate-600 mt-1">
              Manage your organization's team members and their permissions
            </p>
          </div>
          {canManageMembers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Invite Member
            </button>
          )}
        </div>

        {/* Role Legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Role Permissions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => {
              const badge = ROLE_BADGES[role];
              const Icon = badge?.icon || UsersRound;
              return (
                <div key={role} className="text-sm">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${badge?.color || ""} mb-2`}>
                    <Icon className="h-3 w-3" />
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </div>
                  <ul className="text-xs text-slate-500 space-y-0.5">
                    {permissions.map((p, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900">Active Members ({activeMembers.length})</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading team members...</div>
          ) : activeMembers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <UsersRound className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No team members yet. Invite your first team member to get started.</p>
              {canManageMembers && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite First Member
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeMembers.map((member) => {
                const badge = ROLE_BADGES[member.role] || ROLE_BADGES.member;
                const Icon = badge.icon;
                const isCurrentUser = member.userId === parseInt(userId || "0");
                return (
                  <div
                    key={member.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setViewingMember(member)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-lg relative">
                        {member.user?.avatar ? (
                          <img src={member.user.avatar} alt={member.user.displayName || ''} className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          member.user?.displayName?.charAt(0)?.toUpperCase() || member.user?.email?.charAt(0)?.toUpperCase() || "?"
                        )}
                        {isCurrentUser && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">You</div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {member.user?.displayName || member.user?.email || "Unknown User"}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                            <Icon className="h-3 w-3" />
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.user?.email}
                          </span>
                          {member.title && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {member.title}
                            </span>
                          )}
                          {member.department && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {member.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Quick action buttons */}
                      <button
                        onClick={() => setViewingMember(member)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          navigate(`/organization-messages?member=${member.userId}`);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Send message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (member.user?.email) {
                            window.location.href = `mailto:${member.user.email}`;
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Send email"
                      >
                        <Mail className="h-4 w-4" />
                      </button>

                      {/* Actions dropdown */}
                      {canManageMembers && !isCurrentUser && (
                        <div className="relative">
                          <button
                            onClick={() => setMemberActionsOpen(memberActionsOpen === member.id ? null : member.id)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {memberActionsOpen === member.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMemberActionsOpen(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                                <button
                                  onClick={() => { setEditingMember(member); setMemberActionsOpen(null); }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  Edit Member
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(member.user?.email || '');
                                    toast({ title: "Email copied", description: "Email address copied to clipboard" });
                                    setMemberActionsOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy Email
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to remove ${member.user?.displayName || member.user?.email} from the team?`)) {
                                      removeMutation.mutate(member.id);
                                    }
                                    setMemberActionsOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove from Team
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        {pendingMembers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-amber-50">
              <h2 className="font-semibold text-slate-900">Pending Invitations ({pendingMembers.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingMembers.map((member) => {
                const badge = ROLE_BADGES[member.role] || ROLE_BADGES.member;
                const Icon = badge.icon;
                return (
                  <div key={member.id} className="px-6 py-4 flex items-center justify-between bg-amber-50/30 hover:bg-amber-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-medium">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{member.user?.email}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                            <Icon className="h-3 w-3" />
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Invited {member.invitedAt ? new Date(member.invitedAt).toLocaleDateString() : "recently"}
                          </span>
                          {member.title && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {member.title}
                            </span>
                          )}
                          {member.department && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {member.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManageMembers && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            inviteMutation.mutate({
                              email: member.user?.email || '',
                              role: member.role,
                              title: member.title || undefined,
                              department: member.department || undefined,
                            });
                            toast({ title: "Invitation resent", description: `Invitation resent to ${member.user?.email}` });
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Resend invitation"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(member.user?.email || '');
                            toast({ title: "Email copied", description: "Email address copied to clipboard" });
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Copy email"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Cancel this invitation?")) {
                              removeMutation.mutate(member.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel invitation"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Member Modal */}
        {viewingMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Team Member Details</h3>
                <button
                  onClick={() => setViewingMember(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Member Profile */}
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                  {viewingMember.user?.avatar ? (
                    <img src={viewingMember.user.avatar} alt={viewingMember.user.displayName || ''} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    viewingMember.user?.displayName?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-900">
                    {viewingMember.user?.displayName || viewingMember.user?.email}
                  </h4>
                  <p className="text-slate-500">{viewingMember.user?.email}</p>
                </div>
              </div>

              {/* Member Info */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Role</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGES[viewingMember.role]?.color || ''}`}>
                    {viewingMember.role.charAt(0).toUpperCase() + viewingMember.role.slice(1)}
                  </span>
                </div>
                {viewingMember.title && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Title</span>
                    <span className="font-medium text-slate-900">{viewingMember.title}</span>
                  </div>
                )}
                {viewingMember.department && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Department</span>
                    <span className="font-medium text-slate-900">{viewingMember.department}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${viewingMember.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {viewingMember.status === 'active' ? 'Active' : 'Pending'}
                  </span>
                </div>
                {viewingMember.acceptedAt && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Joined</span>
                    <span className="text-slate-900">{new Date(viewingMember.acceptedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Permissions */}
                <div className="pt-2">
                  <h5 className="text-sm font-medium text-slate-700 mb-2">Permissions</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center gap-2 text-sm ${viewingMember.canApproveHours ? 'text-green-600' : 'text-slate-400'}`}>
                      {viewingMember.canApproveHours ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      Approve Hours
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${viewingMember.canApproveApplications ? 'text-green-600' : 'text-slate-400'}`}>
                      {viewingMember.canApproveApplications ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      Approve Applications
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${viewingMember.canManageProjects ? 'text-green-600' : 'text-slate-400'}`}>
                      {viewingMember.canManageProjects ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      Manage Projects
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${viewingMember.canManageMembers ? 'text-green-600' : 'text-slate-400'}`}>
                      {viewingMember.canManageMembers ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      Manage Members
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${viewingMember.canViewReports ? 'text-green-600' : 'text-slate-400'}`}>
                      {viewingMember.canViewReports ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      View Reports
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${viewingMember.canEditOrganization ? 'text-green-600' : 'text-slate-400'}`}>
                      {viewingMember.canEditOrganization ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      Edit Organization
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigate(`/organization-messages?member=${viewingMember.userId}`);
                    setViewingMember(null);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </button>
                <button
                  onClick={() => {
                    if (viewingMember.user?.email) {
                      window.location.href = `mailto:${viewingMember.user.email}`;
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </button>
                {canManageMembers && viewingMember.userId !== parseInt(userId || "0") && (
                  <button
                    onClick={() => {
                      setEditingMember(viewingMember);
                      setViewingMember(null);
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Invite Team Member</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                  <select
                    value={inviteTitle}
                    onChange={(e) => {
                      setInviteTitle(e.target.value);
                      if (e.target.value === "Other") setCustomTitle("");
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a title...</option>
                    {JOB_TITLES.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                  {inviteTitle === "Other" && (
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Enter custom title"
                      className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={inviteDepartment}
                    onChange={(e) => {
                      setInviteDepartment(e.target.value);
                      if (e.target.value === "Other") setCustomDepartment("");
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a department...</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {inviteDepartment === "Other" && (
                    <input
                      type="text"
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder="Enter custom department"
                      className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                {/* Invitation Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Invitation Method</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInvitationMethod("email")}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        invitationMethod === "email"
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvitationMethod("direct_message")}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        invitationMethod === "direct_message"
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvitationMethod("both")}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        invitationMethod === "both"
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Send className="h-4 w-4" />
                      Both
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {invitationMethod === "email" && "Send invitation via email only"}
                    {invitationMethod === "direct_message" && "Send invitation via platform direct message"}
                    {invitationMethod === "both" && "Send invitation via both email and direct message"}
                  </p>
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Personal Message <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal note to your invitation..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Role-based permissions preview */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-slate-600 mb-2">Permissions for {inviteRole.charAt(0).toUpperCase() + inviteRole.slice(1)}:</p>
                  <ul className="space-y-1">
                    {ROLE_PERMISSIONS[inviteRole]?.map((perm, i) => (
                      <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail("");
                    setInviteRole("member");
                    setInviteTitle("");
                    setInviteDepartment("");
                    setCustomTitle("");
                    setCustomDepartment("");
                    setInvitationMethod("email");
                    setCustomMessage("");
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const finalTitle = inviteTitle === "Other" ? customTitle : inviteTitle;
                    const finalDepartment = inviteDepartment === "Other" ? customDepartment : inviteDepartment;
                    inviteMutation.mutate({
                      email: inviteEmail,
                      role: inviteRole,
                      title: finalTitle || undefined,
                      department: finalDepartment || undefined,
                      invitationMethod,
                      customMessage: customMessage || undefined,
                    });
                  }}
                  disabled={!inviteEmail || inviteMutation.isPending}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {inviteMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      {invitationMethod === "email" && <Mail className="h-4 w-4" />}
                      {invitationMethod === "direct_message" && <MessageSquare className="h-4 w-4" />}
                      {invitationMethod === "both" && <Send className="h-4 w-4" />}
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Member Modal */}
        {editingMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Edit Team Member</h3>
                <button
                  onClick={() => setEditingMember(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                    {editingMember.user?.displayName?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{editingMember.user?.displayName}</p>
                    <p className="text-sm text-slate-500">{editingMember.user?.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={editingMember.role}
                    onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editingMember.title || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, title: e.target.value })}
                    placeholder="e.g., HR Manager"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editingMember.department || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, department: e.target.value })}
                    placeholder="e.g., Human Resources"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingMember(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateMutation.mutate({
                      memberId: editingMember.id,
                      data: {
                        role: editingMember.role,
                        title: editingMember.title,
                        department: editingMember.department,
                      },
                    });
                  }}
                  disabled={updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invite Link Success Modal */}
        {inviteLinkResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Invitation Created
                </h3>
                <button
                  onClick={() => setInviteLinkResult(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Share this invite link with <span className="font-medium">{inviteLinkResult.email}</span> to let them join your team.
                </p>

                <div className="bg-slate-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Invite Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteLinkResult.link}
                      readOnly
                      className="flex-1 bg-white px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLinkResult.link);
                        toast({ title: "Link Copied!", description: "Invite link copied to clipboard" });
                      }}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Note:</strong> The invitee will need to create an account or log in to accept this invitation.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setInviteLinkResult(null)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
