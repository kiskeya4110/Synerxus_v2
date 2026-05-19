import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/queryClient";
import { useViewportDetection } from "@/hooks/use-mobile";
import OrganizationNav from "@/components/layout/organization-nav";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import Footer from "@/components/layout/footer";
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  User,
  Calendar,
  Image as ImageIcon,
  AlertCircle,
  Inbox,
  RefreshCw,
  Pencil,
  MapPin,
  X,
  Download,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import type { User as UserType } from "@shared/schema";
import { getSDGName, getSDGColor, SDG_GOALS } from "@shared/sdg-goals";

interface PendingLog {
  id: number;
  userId: number;
  projectId: number;
  hours: number | null;
  date: string;
  description: string | null;
  outcomeText: string | null;
  outcomeQuantity: number | null;
  outcomes: string | null;
  outcomeType: string | null;
  sdgTags: number[] | null;
  geolocation: any | null;
  deviceId: string | null;
  evidenceUrls: string[] | null;
  verificationStatus: string;
  createdAt: string;
  project: {
    id: number;
    name: string;
    sdgGoals: number[] | null;
    outcomeTemplates: any[] | null;
  } | null;
  volunteer: {
    id: number;
    displayName: string | null;
    email: string;
    avatar: string | null;
  } | null;
}

export default function NgoVerification() {
  const [, setLocation] = useLocation();
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isVerifying, setIsVerifying] = useState<number | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit modal state
  const [editOutcomeText, setEditOutcomeText] = useState("");
  const [editOutcomeQuantity, setEditOutcomeQuantity] = useState("");
  const [editSdgTags, setEditSdgTags] = useState<number[]>([]);
  const [suggestedSdgs, setSuggestedSdgs] = useState<number[]>([]);

  // Fetch current user
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/users/me', { headers, credentials: "include" });
      return response.json();
    },
  });

  // Fetch pending logs for this organization
  const { data: pendingLogs = [], isLoading, refetch } = useQuery<PendingLog[]>({
    queryKey: ["/api/logs", { ngo_id: currentUser?.organizationId, status: "pending" }],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/logs?ngo_id=${currentUser.organizationId}&status=pending`, {
        headers, credentials: "include"
      });
      if (!response.ok) {
        // Fallback to old endpoint
        const fallbackResponse = await fetch(`/api/pending-approvals?organizationId=${currentUser.organizationId}`, {
          headers, credentials: "include"
        });
        if (!fallbackResponse.ok) return [];
        const data = await fallbackResponse.json();
        return data.activities || [];
      }
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
    refetchInterval: 30000,
  });

  // Fetch past reviewed logs
  const { data: approvedLogs = [] } = useQuery<PendingLog[]>({
    queryKey: ["/api/logs", { ngo_id: currentUser?.organizationId, status: "approved" }],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/logs?ngo_id=${currentUser.organizationId}&status=approved`, { headers, credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  // Fetch past rejected logs
  const { data: rejectedLogs = [] } = useQuery<PendingLog[]>({
    queryKey: ["/api/logs", { ngo_id: currentUser?.organizationId, status: "rejected" }],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/logs?ngo_id=${currentUser.organizationId}&status=rejected`, { headers, credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  const historyLogs = [...approvedLogs, ...rejectedLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ logId, editedData }: { logId: number; editedData?: any }) => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/logs/${logId}/verify`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editedData || {}),
      });
      if (!response.ok) {
        const fallbackResponse = await fetch(`/api/volunteer-activities/${logId}/approve`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!fallbackResponse.ok) throw new Error("Failed to verify log");
        return fallbackResponse.json();
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Record Confirmed",
        description: "The activity log has been confirmed successfully.",
      });
      setIsVerifying(null);
      setEditModalOpen(false);
      setIsSavingEdit(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to verify log. Please try again.",
        variant: "destructive",
      });
      setIsVerifying(null);
      setIsSavingEdit(false);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ logId, reason }: { logId: number; reason: string }) => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/logs/${logId}/reject`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const fallbackResponse = await fetch(`/api/volunteer-activities/${logId}/reject`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!fallbackResponse.ok) throw new Error("Failed to reject log");
        return fallbackResponse.json();
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Log Rejected",
        description: "The activity log has been rejected with your feedback.",
      });
      setRejectModalOpen(false);
      setSelectedLogId(null);
      setRejectReason("");
      setIsRejecting(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject log. Please try again.",
        variant: "destructive",
      });
      setIsRejecting(false);
    },
  });

  const handleVerify = (logId: number) => {
    setIsVerifying(logId);
    verifyMutation.mutate({ logId });
  };

  const handleRejectClick = (logId: number) => {
    setSelectedLogId(logId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = () => {
    if (!selectedLogId || !rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    setIsRejecting(true);
    rejectMutation.mutate({ logId: selectedLogId, reason: rejectReason.trim() });
  };

  // Edit & Verify flow
  const handleEditClick = async (log: PendingLog) => {
    setSelectedLogId(log.id);
    setEditOutcomeText(log.outcomeText || log.description || "");
    setEditOutcomeQuantity(String(log.outcomeQuantity || ""));
    setEditSdgTags(log.sdgTags || log.project?.sdgGoals || []);

    // Fetch suggested SDGs from server
    try {
      const authH = await getAuthHeaders();
      const res = await fetch(`/api/logs/${log.id}/suggested-sdgs`, { headers: authH, credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSuggestedSdgs(data.merged || []);
      }
    } catch {
      setSuggestedSdgs(log.sdgTags || []);
    }

    setEditModalOpen(true);
  };

  const handleSaveAndVerify = () => {
    if (!selectedLogId) return;
    setIsSavingEdit(true);
    verifyMutation.mutate({
      logId: selectedLogId,
      editedData: {
        editedOutcomeText: editOutcomeText.trim() || undefined,
        editedOutcomeQuantity: editOutcomeQuantity ? parseInt(editOutcomeQuantity) : undefined,
        editedSdgTags: editSdgTags.length > 0 ? editSdgTags : undefined,
      },
    });
  };

  const toggleSdgTag = (sdgId: number) => {
    setEditSdgTags((prev) =>
      prev.includes(sdgId)
        ? prev.filter((s) => s !== sdgId)
        : [...prev, sdgId]
    );
  };

  const userType = localStorage.getItem('userType');
  const isOrganization = currentUser?.userType === 'organization' || userType === 'organization';

  if (isViewportLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#faf9f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (currentUser && !isOrganization) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-slate-900">Access Restricted</h2>
            <p className="text-slate-600 mb-4">
              This page is only accessible to NGO/organization staff members.
            </p>
            <Button onClick={() => setLocation('/volunteer-dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Shared log card renderer -- outcome-first display
  const renderLogCard = (log: PendingLog, compact: boolean) => (
    <Card key={log.id} className={compact ? "bg-white" : "overflow-hidden hover:shadow-md transition-shadow"}>
      <CardContent className={compact ? "p-4" : "p-4 md:p-6"}>
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar className={compact ? "w-8 h-8" : "h-10 w-10"}>
              <AvatarImage src={log.volunteer?.avatar || ''} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                {log.volunteer?.displayName?.charAt(0) || 'V'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className={`font-medium ${compact ? 'text-sm' : ''}`}>
                {log.volunteer?.displayName || 'Volunteer'}
              </p>
              <p className="text-xs text-slate-500">{log.project?.name || 'Unknown Project'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {log.geolocation && (
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          </div>
        </div>

        {/* OUTCOME TEXT -- prominently displayed */}
        {(log.outcomeText || log.description) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-emerald-800">
              {log.outcomeText || log.description}
            </p>
          </div>
        )}

        {/* Details Grid -- outcome-first, hours de-emphasized */}
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-2 mb-3`}>
          {log.outcomeQuantity && (
            <div className="bg-slate-50 rounded p-2">
              <span className="text-xs text-slate-500">Outcome</span>
              <p className="font-semibold text-sm text-slate-800">
                {log.outcomeQuantity} {log.outcomes || 'units'}
              </p>
            </div>
          )}
          <div className="bg-slate-50 rounded p-2">
            <span className="text-xs text-slate-500">Date</span>
            <p className="font-medium text-sm">{format(new Date(log.date), compact ? 'MMM d' : 'MMM d, yyyy')}</p>
          </div>
          {log.hours != null && log.hours > 0 && (
            <div className="bg-slate-50 rounded p-2">
              <span className="text-xs text-slate-500">Hours</span>
              <p className="font-medium text-sm text-slate-600">{log.hours}h</p>
            </div>
          )}
          {log.evidenceUrls && log.evidenceUrls.length > 0 && (
            <div className="bg-slate-50 rounded p-2">
              <span className="text-xs text-slate-500">Evidence</span>
              <div className="flex items-center gap-1 text-blue-600">
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="text-sm">{log.evidenceUrls.length} photo(s)</span>
              </div>
            </div>
          )}
        </div>

        {/* SDG Tags */}
        {(log.sdgTags && log.sdgTags.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {log.sdgTags.map((sdg) => (
              <Badge
                key={sdg}
                variant="secondary"
                className="text-[10px] text-white px-1.5 py-0.5"
                style={{ backgroundColor: getSDGColor(sdg) }}
              >
                SDG {sdg}
              </Badge>
            ))}
          </div>
        )}

        {/* Photo Evidence Preview */}
        {log.evidenceUrls && log.evidenceUrls.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {log.evidenceUrls.slice(0, 3).map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Evidence ${index + 1}`}
                className="h-16 w-16 object-cover rounded-lg border border-slate-200"
              />
            ))}
            {log.evidenceUrls.length > 3 && (
              <div className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                <span className="text-sm text-slate-500">+{log.evidenceUrls.length - 3}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Row: Primary one-click Verify + secondary Edit/Reject */}
        <div className="flex gap-2">
          <Button
            size={compact ? "sm" : "default"}
            className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => handleVerify(log.id)}
            disabled={isVerifying === log.id}
          >
            {isVerifying === log.id ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Verify
              </>
            )}
          </Button>
          <Button
            size={compact ? "sm" : "default"}
            variant="outline"
            className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => handleEditClick(log)}
            disabled={isVerifying === log.id}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            size={compact ? "sm" : "default"}
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => handleRejectClick(log.id)}
            disabled={isVerifying === log.id}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // History card renderer — read-only display of past confirmed/rejected logs
  const renderHistoryCard = (log: PendingLog, compact: boolean) => {
    const isApproved = log.verificationStatus === 'approved';
    return (
      <Card key={log.id} className={compact ? "bg-white" : "overflow-hidden"}>
        <CardContent className={compact ? "p-4" : "p-4 md:p-6"}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className={compact ? "w-8 h-8" : "h-10 w-10"}>
                <AvatarImage src={log.volunteer?.avatar || ''} />
                <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                  {log.volunteer?.displayName?.charAt(0) || 'V'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className={`font-medium ${compact ? 'text-sm' : ''}`}>{log.volunteer?.displayName || 'Volunteer'}</p>
                <p className="text-xs text-slate-500">{log.project?.name || 'Unknown Project'}</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-xs ${isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {isApproved ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
              {isApproved ? 'Confirmed' : 'Rejected'}
            </Badge>
          </div>
          {(log.outcomeText || log.description) && (
            <div className={`rounded-lg p-3 mb-3 ${isApproved ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium ${isApproved ? 'text-emerald-800' : 'text-red-800'}`}>
                {log.outcomeText || log.description}
              </p>
            </div>
          )}
          <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-2 mb-3`}>
            <div className="bg-slate-50 rounded p-2">
              <span className="text-xs text-slate-500">Date</span>
              <p className="font-medium text-sm">{format(new Date(log.date), compact ? 'MMM d' : 'MMM d, yyyy')}</p>
            </div>
            {log.outcomeQuantity && (
              <div className="bg-slate-50 rounded p-2">
                <span className="text-xs text-slate-500">Outcome</span>
                <p className="font-semibold text-sm">{log.outcomeQuantity} {log.outcomes || 'units'}</p>
              </div>
            )}
            {log.hours != null && log.hours > 0 && (
              <div className="bg-slate-50 rounded p-2">
                <span className="text-xs text-slate-500">Hours</span>
                <p className="font-medium text-sm text-slate-600">{log.hours}h</p>
              </div>
            )}
          </div>
          {log.sdgTags && log.sdgTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {log.sdgTags.map((sdg) => (
                <Badge key={sdg} variant="secondary" className="text-[10px] text-white px-1.5 py-0.5" style={{ backgroundColor: getSDGColor(sdg) }}>
                  SDG {sdg}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const downloadReport = async () => {
    try {
      const response = await fetch("/api/reports/reviewed-evidence-summary", {
        headers: await getAuthHeaders()
      });
      if (!response.ok) throw new Error("Failed to generate report");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reviewed-evidence-summary.html";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", description: "Could not generate the Evidence Summary.", variant: "destructive" });
    }
  };

  // Mobile Organization PWA View
  if (isMobile && isOrganization) {
    return (
      <OrganizationPWALayout activeTab="verify">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">Partner Review</h1>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {approvedLogs.length} Confirmed by Synerxus
            </div>
            <Button variant="outline" size="sm" onClick={downloadReport} className="text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Evidence Summary
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('pending')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${viewMode === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Pending {pendingLogs.length > 0 && <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingLogs.length}</span>}
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${viewMode === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              History {historyLogs.length > 0 && <span className="ml-1 text-xs text-slate-400">{historyLogs.length}</span>}
            </button>
          </div>

          {viewMode === 'pending' ? (
            isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Loading pending logs...</p>
              </div>
            ) : pendingLogs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">All Caught Up!</h3>
                  <p className="text-slate-500">No pending logs to verify.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingLogs.map((log) => renderLogCard(log, true))}
              </div>
            )
          ) : (
            historyLogs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">No History Yet</h3>
                  <p className="text-slate-500">Confirmed and rejected records will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {historyLogs.map((log) => renderHistoryCard(log, true))}
              </div>
            )
          )}
        </div>

        {/* Reject Modal */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Log Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason for rejection</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={isRejecting || !rejectReason.trim()}
              >
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit & Verify Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-500" />
                Edit & Verify
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Outcome Text</Label>
                <Textarea
                  value={editOutcomeText}
                  onChange={(e) => setEditOutcomeText(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Outcome Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={editOutcomeQuantity}
                  onChange={(e) => setEditOutcomeQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">SDG Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {editSdgTags.map((sdg) => (
                    <Badge
                      key={sdg}
                      className="text-xs text-white cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: getSDGColor(sdg) }}
                      onClick={() => toggleSdgTag(sdg)}
                    >
                      SDG {sdg}: {getSDGName(sdg)}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                {suggestedSdgs.filter((s) => !editSdgTags.includes(s)).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1">Suggested:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedSdgs
                        .filter((s) => !editSdgTags.includes(s))
                        .map((sdg) => (
                          <Badge
                            key={sdg}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-slate-100"
                            style={{ borderColor: getSDGColor(sdg), color: getSDGColor(sdg) }}
                            onClick={() => toggleSdgTag(sdg)}
                          >
                            + SDG {sdg}: {getSDGName(sdg)}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSaveAndVerify}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Save & Verify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </OrganizationPWALayout>
    );
  }

  // Desktop view with OrganizationNav
  return (
    <div className="min-h-screen bg-slate-50">
      <OrganizationNav />

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Partner Review</h1>
              <p className="text-sm text-slate-500">
                {viewMode === 'pending'
                  ? `${pendingLogs.length} pending ${pendingLogs.length === 1 ? 'log' : 'logs'}`
                  : `${historyLogs.length} past ${historyLogs.length === 1 ? 'record' : 'records'}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {approvedLogs.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {approvedLogs.length} Confirmed by Synerxus
                </div>
              )}
              {/* Tab switcher */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('pending')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pending
                  {pendingLogs.length > 0 && (
                    <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingLogs.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setViewMode('history')}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  History
                  {historyLogs.length > 0 && (
                    <span className="ml-2 text-xs text-slate-400">{historyLogs.length}</span>
                  )}
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={downloadReport}>
                <Download className="w-4 h-4 mr-2" />
                Evidence Summary
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {viewMode === 'pending' ? (
          isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading pending logs...</p>
            </div>
          ) : pendingLogs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">All Caught Up!</h3>
                <p className="text-slate-500">There are no pending logs to verify at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingLogs.map((log) => renderLogCard(log, false))}
            </div>
          )
        ) : (
          historyLogs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">No History Yet</h3>
                <p className="text-slate-500">Confirmed and rejected records will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {historyLogs.map((log) => renderHistoryCard(log, false))}
            </div>
          )
        )}
      </div>

      <Footer />

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Reject Impact Log
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason" className="text-slate-700">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please explain why this log is being rejected..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-slate-500">
                This feedback will be sent to the volunteer.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRejectSubmit}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Verify Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" />
              Edit & Verify
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-700">Outcome Text</Label>
              <Textarea
                value={editOutcomeText}
                onChange={(e) => setEditOutcomeText(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Outcome Quantity</Label>
              <Input
                type="number"
                min="1"
                value={editOutcomeQuantity}
                onChange={(e) => setEditOutcomeQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">SDG Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {editSdgTags.map((sdg) => (
                  <Badge
                    key={sdg}
                    className="text-xs text-white cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: getSDGColor(sdg) }}
                    onClick={() => toggleSdgTag(sdg)}
                  >
                    SDG {sdg}: {getSDGName(sdg)}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
              {/* Suggested SDGs from auto-tagging (Phase 5) */}
              {suggestedSdgs.filter((s) => !editSdgTags.includes(s)).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Suggested SDGs:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedSdgs
                      .filter((s) => !editSdgTags.includes(s))
                      .map((sdg) => (
                        <Badge
                          key={sdg}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-slate-100"
                          style={{ borderColor: getSDGColor(sdg), color: getSDGColor(sdg) }}
                          onClick={() => toggleSdgTag(sdg)}
                        >
                          + SDG {sdg}: {getSDGName(sdg)}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSaveAndVerify}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Save & Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
