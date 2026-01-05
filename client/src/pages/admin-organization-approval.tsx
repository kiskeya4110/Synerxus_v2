import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Mail,
  Phone,
  MapPin,
  Target,
  Users,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

interface Organization {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  primarySdgs: number[] | null;
  needs: string[] | null;
  goals: string | null;
  approvalStatus: string;
  approvalNotes: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
}

const SDG_NAMES: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water",
  7: "Clean Energy",
  8: "Decent Work",
  9: "Industry & Innovation",
  10: "Reduced Inequalities",
  11: "Sustainable Cities",
  12: "Responsible Consumption",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace & Justice",
  17: "Partnerships",
};

export default function AdminOrganizationApprovalPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userId = localStorage.getItem("currentUserId");

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");

  // Check if user is admin
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch all organizations
  const { data: organizations = [], isLoading: orgsLoading, refetch } = useQuery<Organization[]>({
    queryKey: ["/api/admin/organizations"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/organizations?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    },
    enabled: !!userId && currentUser?.isAdmin,
  });

  // Approve/Reject mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ orgId, status, notes }: { orgId: number; status: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/admin/organizations/${orgId}/approval`, {
        userId: parseInt(userId || "0"),
        status,
        notes,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update organization status");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Refetch to ensure immediate update
      refetch();
      setApprovalDialogOpen(false);
      setSelectedOrg(null);
      setApprovalNotes("");
      toast({
        title: variables.status === "approved" ? "Organization Approved" : "Organization Rejected",
        description: variables.status === "approved"
          ? "The organization can now create projects and opportunities."
          : "The organization has been notified of the rejection.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization status",
        variant: "destructive",
      });
    },
  });

  const openApprovalDialog = (org: Organization, action: "approve" | "reject") => {
    setSelectedOrg(org);
    setApprovalAction(action);
    setApprovalNotes("");
    setApprovalDialogOpen(true);
  };

  const handleApproval = () => {
    if (!selectedOrg) return;
    approvalMutation.mutate({
      orgId: selectedOrg.id,
      status: approvalAction === "approve" ? "approved" : "rejected",
      notes: approvalNotes || undefined,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingOrgs = organizations.filter((o) => o.approvalStatus === "pending");
  const approvedOrgs = organizations.filter((o) => o.approvalStatus === "approved");
  const rejectedOrgs = organizations.filter((o) => o.approvalStatus === "rejected");

  // Access denied for non-admins
  if (!userLoading && currentUser && !currentUser.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access this page. Only platform administrators can manage organization approvals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/volunteer-dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <img src={logoUrl} alt="Synerxus" className="h-8" />
                <span className="text-lg font-semibold text-gray-900">Admin Panel</span>
              </div>
            </div>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Shield className="h-3 w-3 mr-1" />
              Administrator
            </Badge>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            Organization Approvals
          </h1>
          <p className="text-gray-600 mt-2">
            Review and approve organizations that want to join the platform.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-700">{pendingOrgs.length}</p>
                  <p className="text-sm text-amber-600">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-700">{approvedOrgs.length}</p>
                  <p className="text-sm text-green-600">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-700">{rejectedOrgs.length}</p>
                  <p className="text-sm text-red-600">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={orgsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${orgsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingOrgs.length > 0 && (
                <Badge className="ml-2 bg-amber-500">{pendingOrgs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending">
            {pendingOrgs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                  <p className="text-gray-500 mt-1">No pending organizations to review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingOrgs.map((org) => (
                  <OrganizationCard
                    key={org.id}
                    organization={org}
                    onApprove={() => openApprovalDialog(org, "approve")}
                    onReject={() => openApprovalDialog(org, "reject")}
                    showActions
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Approved Tab */}
          <TabsContent value="approved">
            {approvedOrgs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No approved organizations</h3>
                  <p className="text-gray-500 mt-1">Organizations you approve will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedOrgs.map((org) => (
                  <OrganizationCard key={org.id} organization={org} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Rejected Tab */}
          <TabsContent value="rejected">
            {rejectedOrgs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <XCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No rejected organizations</h3>
                  <p className="text-gray-500 mt-1">Rejected organizations will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rejectedOrgs.map((org) => (
                  <OrganizationCard key={org.id} organization={org} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Approval Dialog */}
        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${approvalAction === "approve" ? "text-green-600" : "text-red-600"}`}>
                {approvalAction === "approve" ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Approve Organization
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Reject Organization
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {approvalAction === "approve"
                  ? `Approving "${selectedOrg?.name}" will allow them to create projects and opportunities on the platform.`
                  : `Rejecting "${selectedOrg?.name}" will prevent them from using the platform. Please provide a reason.`}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="notes">
                {approvalAction === "approve" ? "Notes (Optional)" : "Rejection Reason"}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  approvalAction === "approve"
                    ? "Add any notes about this approval..."
                    : "Please explain why this organization is being rejected..."
                }
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="mt-2"
                rows={3}
              />
              {approvalAction === "reject" && !approvalNotes && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  A rejection reason helps the organization understand the decision.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApproval}
                disabled={approvalMutation.isPending}
                className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {approvalMutation.isPending
                  ? "Processing..."
                  : approvalAction === "approve"
                  ? "Approve"
                  : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// Organization Card Component
function OrganizationCard({
  organization,
  onApprove,
  onReject,
  showActions = false,
}: {
  organization: Organization;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <Avatar className="h-16 w-16 rounded-lg">
            <AvatarImage src={organization.logo || undefined} />
            <AvatarFallback className="rounded-lg bg-blue-100 text-blue-700 text-xl">
              {organization.name?.[0] || "O"}
            </AvatarFallback>
          </Avatar>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{organization.name}</h3>
                <p className="text-sm text-gray-500">Applied {formatDate(organization.createdAt)}</p>
              </div>
              <Badge
                variant={
                  organization.approvalStatus === "approved"
                    ? "default"
                    : organization.approvalStatus === "rejected"
                    ? "destructive"
                    : "secondary"
                }
                className={
                  organization.approvalStatus === "approved"
                    ? "bg-green-100 text-green-700"
                    : organization.approvalStatus === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : ""
                }
              >
                {organization.approvalStatus === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                {organization.approvalStatus === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                {organization.approvalStatus === "pending" && <Clock className="h-3 w-3 mr-1" />}
                {organization.approvalStatus.charAt(0).toUpperCase() + organization.approvalStatus.slice(1)}
              </Badge>
            </div>

            {organization.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{organization.description}</p>
            )}

            {/* Contact Info */}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              {organization.contactEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {organization.contactEmail}
                </span>
              )}
              {organization.website && (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {organization.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {organization.address}
                </span>
              )}
            </div>

            {/* SDGs */}
            {organization.primarySdgs && organization.primarySdgs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-1">SDG Focus Areas:</p>
                <div className="flex flex-wrap gap-1">
                  {organization.primarySdgs.slice(0, 5).map((sdg) => (
                    <Badge key={sdg} variant="outline" className="text-xs">
                      <Target className="h-3 w-3 mr-1" />
                      SDG {sdg}
                    </Badge>
                  ))}
                  {organization.primarySdgs.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{organization.primarySdgs.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Approval Notes (for approved/rejected) */}
            {organization.approvalNotes && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <p className="text-xs font-medium text-gray-700">Admin Notes:</p>
                <p className="text-gray-600">{organization.approvalNotes}</p>
              </div>
            )}

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={onApprove}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={onReject}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
