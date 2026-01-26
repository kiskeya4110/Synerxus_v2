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
import { useViewportDetection } from "@/hooks/use-mobile";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
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
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import type { User as UserType } from "@shared/schema";

interface PendingLog {
  id: number;
  userId: number;
  projectId: number;
  hours: number;
  date: string;
  description: string | null;
  outcomeQuantity: number | null;
  outcomes: string | null;
  evidenceUrls: string[] | null;
  verificationStatus: string;
  createdAt: string;
  project: {
    id: number;
    name: string;
    sdgGoals: number[] | null;
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

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isVerifying, setIsVerifying] = useState<number | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Fetch current user
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
  });

  // Fetch pending logs for this organization
  const { data: pendingLogs = [], isLoading, refetch } = useQuery<PendingLog[]>({
    queryKey: ["/api/logs", { ngo_id: currentUser?.organizationId, status: "pending" }],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(`/api/logs?ngo_id=${currentUser.organizationId}&status=pending`);
      if (!response.ok) {
        // Fallback to old endpoint
        const fallbackResponse = await fetch(`/api/pending-approvals?organizationId=${currentUser.organizationId}`);
        if (!fallbackResponse.ok) return [];
        const data = await fallbackResponse.json();
        return data.activities || [];
      }
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: async (logId: number) => {
      const response = await fetch(`/api/logs/${logId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        // Fallback to old endpoint
        const fallbackResponse = await fetch(`/api/volunteer-activities/${logId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!fallbackResponse.ok) throw new Error("Failed to verify log");
        return fallbackResponse.json();
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      toast({
        title: "Log Verified",
        description: "The impact log has been verified successfully.",
      });
      setIsVerifying(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to verify log. Please try again.",
        variant: "destructive",
      });
      setIsVerifying(null);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ logId, reason }: { logId: number; reason: string }) => {
      const response = await fetch(`/api/logs/${logId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        // Fallback to old endpoint
        const fallbackResponse = await fetch(`/api/volunteer-activities/${logId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!fallbackResponse.ok) throw new Error("Failed to reject log");
        return fallbackResponse.json();
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      toast({
        title: "Log Rejected",
        description: "The impact log has been rejected with your feedback.",
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
    verifyMutation.mutate(logId);
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

  const userType = localStorage.getItem('userType');
  const isOrganization = currentUser?.userType === 'organization' || userType === 'organization';

  // Wait for viewport detection
  if (isViewportLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#faf9f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Redirect if not an organization user
  if (currentUser && !isOrganization) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
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

  // Mobile Organization PWA View
  if (isMobile && isOrganization) {
    return (
      <OrganizationPWALayout activeTab="home">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Verification Queue</h1>
              <p className="text-sm text-slate-500">
                {pendingLogs.length} pending {pendingLogs.length === 1 ? 'log' : 'logs'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading pending logs...</p>
            </div>
          ) : pendingLogs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">All Caught Up!</h3>
                <p className="text-slate-500">
                  There are no pending logs to verify at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingLogs.map((log) => (
                <Card key={log.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={log.volunteer?.avatar || ''} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                            {log.volunteer?.displayName?.charAt(0) || 'V'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{log.volunteer?.displayName || 'Volunteer'}</p>
                          <p className="text-xs text-slate-500">{log.project?.name || 'Unknown Project'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-500">Hours</span>
                        <p className="font-semibold">{log.hours}h</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <span className="text-slate-500">Date</span>
                        <p className="font-semibold">{format(new Date(log.date), 'MMM d')}</p>
                      </div>
                    </div>
                    {log.description && (
                      <p className="text-xs text-slate-600 mb-3 line-clamp-2">{log.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => handleVerify(log.id)}
                        disabled={isVerifying === log.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleRejectClick(log.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
      </OrganizationPWALayout>
    );
  }

  // Desktop view with OrganizationHeader
  return (
    <div className="min-h-screen bg-slate-50">
      <OrganizationHeader activeTab="verify" />

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Verification Queue</h1>
              <p className="text-sm text-slate-500">
                {pendingLogs.length} pending {pendingLogs.length === 1 ? 'log' : 'logs'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading pending logs...</p>
          </div>
        ) : pendingLogs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">All Caught Up!</h3>
              <p className="text-slate-500">
                There are no pending logs to verify at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingLogs.map((log) => (
              <Card key={log.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="p-4 md:p-6">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={log.volunteer?.avatar || undefined} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-700">
                            {log.volunteer?.displayName?.[0] || log.volunteer?.email?.[0] || 'V'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-800">
                            {log.volunteer?.displayName || log.volunteer?.email || 'Unknown Volunteer'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {log.project?.name || 'Unknown Project'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-slate-50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Hours</p>
                        <p className="font-semibold text-lg text-emerald-600">{log.hours}h</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Date</p>
                        <p className="font-medium text-slate-700">
                          {format(new Date(log.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {log.outcomeQuantity && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Outcome</p>
                          <p className="font-medium text-slate-700">
                            {log.outcomeQuantity} {log.outcomes || 'units'}
                          </p>
                        </div>
                      )}
                      {log.evidenceUrls && log.evidenceUrls.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Evidence</p>
                          <div className="flex items-center gap-1 text-blue-600">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-sm">{log.evidenceUrls.length} photo(s)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {log.description && (
                      <div className="mb-4">
                        <p className="text-sm text-slate-600 line-clamp-2">{log.description}</p>
                      </div>
                    )}

                    {/* Photo Evidence Preview */}
                    {log.evidenceUrls && log.evidenceUrls.length > 0 && (
                      <div className="flex gap-2 mb-4 overflow-x-auto">
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

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                        onClick={() => handleVerify(log.id)}
                        disabled={isVerifying === log.id}
                      >
                        {isVerifying === log.id ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Verify
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-12"
                        onClick={() => handleRejectClick(log.id)}
                        disabled={isVerifying === log.id}
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
