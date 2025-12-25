import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationWelcomeBanner from "@/components/layout/organization-welcome-banner";
import Footer from "@/components/layout/footer";
import {
  UsersRound, UserPlus, Shield, ShieldCheck, Settings, Trash2,
  Mail, Check, X, ChevronDown, Edit2, Building2, Briefcase, MessageSquare,
  Phone, MoreVertical, Clock, Calendar, Eye, Send, Copy, RefreshCw
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

  // Get current user's organization
  const userId = localStorage.getItem("currentUserId");
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
    mutationFn: async (data: { email: string; role: string; title?: string; department?: string }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organizationId, "members"] });
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
      setInviteTitle("");
      setInviteDepartment("");
      toast({ title: "Invitation sent", description: "Team member has been invited." });
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

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <OrganizationHeader activeTab="team" />
      <OrganizationWelcomeBanner />

      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-8 w-full">
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
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
                      <Send className="h-4 w-4" />
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
      </main>

      <Footer />
    </div>
  );
}
