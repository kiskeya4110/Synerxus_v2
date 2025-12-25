import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import OrganizationHeader from "@/components/layout/organization-header";
import Footer from "@/components/layout/footer";
import {
  UsersRound, UserPlus, Shield, ShieldCheck, Settings, Trash2,
  Mail, Check, X, ChevronDown, Edit2, Building2, Briefcase
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

export default function OrganizationTeamPage() {
  const { toast } = useToast();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");

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
  const { data: myPermissions } = useQuery({
    queryKey: ["/api/organizations", organizationId, "my-permissions", userId],
    queryFn: async () => {
      if (!organizationId || !userId) return null;
      const res = await fetch(`/api/organizations/${organizationId}/my-permissions?userId=${userId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!organizationId && !!userId,
  });

  const canManageMembers = myPermissions?.permissions?.canManageMembers || myPermissions?.role === "admin";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <OrganizationHeader activeTab="team" />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
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
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeMembers.map((member) => {
                const badge = ROLE_BADGES[member.role] || ROLE_BADGES.member;
                const Icon = badge.icon;
                return (
                  <div key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                        {member.user?.displayName?.charAt(0)?.toUpperCase() || member.user?.email?.charAt(0)?.toUpperCase() || "?"}
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
                        <div className="flex items-center gap-3 text-sm text-slate-500">
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
                    {canManageMembers && member.userId !== parseInt(userId || "0") && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMember(member)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to remove this team member?")) {
                              removeMutation.mutate(member.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
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
                  <div key={member.id} className="px-6 py-4 flex items-center justify-between bg-amber-50/30">
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
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          Invited {member.invitedAt ? new Date(member.invitedAt).toLocaleDateString() : "recently"}
                        </p>
                      </div>
                    </div>
                    {canManageMembers && (
                      <button
                        onClick={() => removeMutation.mutate(member.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Title (Optional)</label>
                  <input
                    type="text"
                    value={inviteTitle}
                    onChange={(e) => setInviteTitle(e.target.value)}
                    placeholder="e.g., HR Manager, CSR Director"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department (Optional)</label>
                  <input
                    type="text"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    placeholder="e.g., Human Resources, CSR"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviteMutation.isPending}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
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
