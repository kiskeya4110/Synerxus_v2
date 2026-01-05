import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import OrganizationHeader from "@/components/layout/organization-header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Shield,
  Users,
  Clock,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from "lucide-react";

interface InvitationCode {
  id: number;
  code: string;
  email: string | null;
  userType: string | null;
  organizationId: number | null;
  maxUses: number;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: number;
  notes: string | null;
  createdAt: string;
}

export default function InvitationCodesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userId = localStorage.getItem("currentUserId");

  // Form state for creating new codes
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState({
    email: "",
    userType: "volunteer",
    maxUses: 1,
    expiresAt: "",
    customCode: "",
    notes: "",
  });
  const [showCode, setShowCode] = useState<string | null>(null);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch invite-only setting
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/invitation-codes/settings"],
    queryFn: async () => {
      const response = await fetch("/api/invitation-codes/settings");
      if (!response.ok) return { inviteOnlyMode: false };
      return response.json();
    },
  });

  // Fetch invitation codes
  const { data: codes = [], isLoading: codesLoading, refetch: refetchCodes } = useQuery<InvitationCode[]>({
    queryKey: ["/api/invitation-codes", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/invitation-codes?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId && currentUser?.userType === "organization",
  });

  // Toggle invite-only mode
  const toggleInviteOnlyMutation = useMutation({
    mutationFn: async (inviteOnlyMode: boolean) => {
      return apiRequest("PUT", "/api/invitation-codes/settings", {
        userId: parseInt(userId || "0"),
        inviteOnlyMode,
      });
    },
    onSuccess: (_, inviteOnlyMode) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-codes/settings"] });
      toast({
        title: inviteOnlyMode ? "Invite-Only Mode Enabled" : "Invite-Only Mode Disabled",
        description: inviteOnlyMode
          ? "New users will now require an invitation code to register."
          : "Registration is now open to everyone.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Create invitation code
  const createCodeMutation = useMutation({
    mutationFn: async (data: typeof newCode) => {
      return apiRequest("POST", "/api/invitation-codes", {
        userId: parseInt(userId || "0"),
        email: data.email || null,
        userType: data.userType || null,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt || null,
        customCode: data.customCode || null,
        notes: data.notes || null,
      });
    },
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-codes"] });
      setCreateDialogOpen(false);
      setShowCode(result.code);
      setNewCode({
        email: "",
        userType: "volunteer",
        maxUses: 1,
        expiresAt: "",
        customCode: "",
        notes: "",
      });
      toast({
        title: "Invitation Code Created",
        description: `Code: ${result.code}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation code",
        variant: "destructive",
      });
    },
  });

  // Delete invitation code
  const deleteCodeMutation = useMutation({
    mutationFn: async (codeId: number) => {
      const response = await fetch(`/api/invitation-codes/${codeId}?userId=${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-codes"] });
      toast({
        title: "Code Deactivated",
        description: "The invitation code has been deactivated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate code",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Code "${code}" copied to clipboard.`,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // Check access
  if (currentUser && currentUser.userType !== "organization") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Only organization administrators can manage invitation codes.
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
      <OrganizationHeader activeTab="settings" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Key className="h-8 w-8 text-blue-600" />
            Invitation Codes
          </h1>
          <p className="text-gray-600 mt-2">
            Control who can register on the platform by managing invitation codes.
          </p>
        </div>

        {/* Invite-Only Mode Toggle */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings?.inviteOnlyMode ? (
                <Lock className="h-5 w-5 text-amber-600" />
              ) : (
                <Unlock className="h-5 w-5 text-green-600" />
              )}
              Access Control Mode
            </CardTitle>
            <CardDescription>
              When enabled, new users must have a valid invitation code to register.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-full ${
                    settings?.inviteOnlyMode
                      ? "bg-amber-100 text-amber-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {settings?.inviteOnlyMode ? (
                    <Lock className="h-6 w-6" />
                  ) : (
                    <Unlock className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {settings?.inviteOnlyMode ? "Invite-Only Mode" : "Open Registration"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {settings?.inviteOnlyMode
                      ? "Only users with valid invitation codes can register"
                      : "Anyone can create an account"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings?.inviteOnlyMode || false}
                onCheckedChange={(checked) => toggleInviteOnlyMutation.mutate(checked)}
                disabled={settingsLoading || toggleInviteOnlyMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{codes.length}</p>
                  <p className="text-sm text-gray-500">Total Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {codes.filter((c) => c.isActive && !isExpired(c.expiresAt)).length}
                  </p>
                  <p className="text-sm text-gray-500">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {codes.reduce((sum, c) => sum + (c.currentUses || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500">Total Uses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {codes.filter((c) => isExpired(c.expiresAt)).length}
                  </p>
                  <p className="text-sm text-gray-500">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Code Button & Dialog */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Invitation Codes</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchCodes()}
              disabled={codesLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${codesLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Invitation Code</DialogTitle>
                  <DialogDescription>
                    Generate a new invitation code for volunteers to register.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="customCode">Custom Code (Optional)</Label>
                    <Input
                      id="customCode"
                      placeholder="e.g., WELCOME2026"
                      value={newCode.customCode}
                      onChange={(e) =>
                        setNewCode({ ...newCode, customCode: e.target.value.toUpperCase() })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Leave blank to auto-generate a random code.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Restrict to Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="volunteer@example.com"
                      value={newCode.email}
                      onChange={(e) => setNewCode({ ...newCode, email: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">
                      Only this email will be able to use the code.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userType">User Type</Label>
                    <Select
                      value={newCode.userType}
                      onValueChange={(value) => setNewCode({ ...newCode, userType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="organization">Organization</SelectItem>
                        <SelectItem value="corporate-partner">Corporate Partner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxUses">Maximum Uses</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min={1}
                      value={newCode.maxUses}
                      onChange={(e) =>
                        setNewCode({ ...newCode, maxUses: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={newCode.expiresAt}
                      onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="e.g., Batch invite for January volunteers"
                      value={newCode.notes}
                      onChange={(e) => setNewCode({ ...newCode, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createCodeMutation.mutate(newCode)}
                    disabled={createCodeMutation.isPending}
                  >
                    {createCodeMutation.isPending ? "Creating..." : "Create Code"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Show Created Code Dialog */}
        <Dialog open={!!showCode} onOpenChange={() => setShowCode(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Code Created Successfully!
              </DialogTitle>
              <DialogDescription>
                Share this code with the volunteer to allow them to register.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex items-center justify-center gap-4 p-4 bg-slate-100 rounded-lg">
                <code className="text-2xl font-mono font-bold tracking-wider text-blue-600">
                  {showCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => showCode && copyToClipboard(showCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowCode(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Codes Table */}
        <Card>
          <CardContent className="p-0">
            {codesLoading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">Loading codes...</p>
              </div>
            ) : codes.length === 0 ? (
              <div className="p-12 text-center">
                <Key className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No invitation codes yet</h3>
                <p className="text-gray-500 mt-1">
                  Create your first invitation code to start inviting volunteers.
                </p>
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Code
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Restrictions</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => {
                    const expired = isExpired(code.expiresAt);
                    const exhausted = code.currentUses >= code.maxUses;
                    const inactive = !code.isActive || expired || exhausted;

                    return (
                      <TableRow key={code.id} className={inactive ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-semibold bg-slate-100 px-2 py-1 rounded">
                              {code.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {code.email && (
                              <Badge variant="outline" className="text-xs w-fit">
                                <Mail className="h-3 w-3 mr-1" />
                                {code.email}
                              </Badge>
                            )}
                            {code.userType && (
                              <Badge variant="secondary" className="text-xs w-fit capitalize">
                                <Users className="h-3 w-3 mr-1" />
                                {code.userType}
                              </Badge>
                            )}
                            {!code.email && !code.userType && (
                              <span className="text-xs text-gray-400">No restrictions</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{code.currentUses || 0}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-600">{code.maxUses}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={expired ? "text-red-500" : ""}>
                            {formatDate(code.expiresAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {!code.isActive ? (
                            <Badge variant="destructive">Deactivated</Badge>
                          ) : expired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : exhausted ? (
                            <Badge variant="secondary">Exhausted</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500 truncate max-w-[150px] block">
                            {code.notes || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {code.isActive && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deactivate Code?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will prevent the code "{code.code}" from being used. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCodeMutation.mutate(code.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Deactivate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              How Invitation Codes Work
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-3">
            <p>
              <strong>1. Enable Invite-Only Mode</strong> - Toggle the switch above to require invitation codes for registration.
            </p>
            <p>
              <strong>2. Create Codes</strong> - Generate codes with optional restrictions (specific email, user type, expiration).
            </p>
            <p>
              <strong>3. Share Codes</strong> - Send the code to volunteers via email, message, or any other channel.
            </p>
            <p>
              <strong>4. Volunteers Register</strong> - During registration, they'll enter the code to create their account.
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
