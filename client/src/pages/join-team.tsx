import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, CheckCircle, XCircle, Clock, Briefcase, AlertTriangle } from "lucide-react";
import Logo from "@/components/ui/logo";

export default function JoinTeamPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();

  // Get token from URL
  const urlParams = new URLSearchParams(searchString);
  const token = urlParams.get("token");

  const userId = localStorage.getItem("currentUserId");
  const isLoggedIn = !!userId;

  // Fetch invitation details
  const { data: invitationData, isLoading, error } = useQuery({
    queryKey: ["/api/organizations/team-invitations/by-token", token],
    queryFn: async () => {
      if (!token) throw new Error("No invitation token");
      const response = await fetch(`/api/organizations/team-invitations/by-token/${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid invitation");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/organizations/team-invitations/by-token/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: parseInt(userId || "0") }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome to the team!",
        description: `You've joined ${data.organization?.name || "the organization"}.`,
      });
      // Navigate to organization dashboard
      navigate("/organization-dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Decline invitation mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/organizations/team-invitations/by-token/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId ? parseInt(userId) : undefined }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to decline invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation Declined",
        description: `You've declined the invitation from ${data.organization?.name || "the organization"}.`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const invitation = invitationData?.invitation;
  const organization = invitationData?.organization;

  // If not logged in, redirect to login with return URL
  const handleLoginRedirect = () => {
    const returnUrl = encodeURIComponent(`/join-team?token=${token}`);
    navigate(`/login?tab=register&returnUrl=${returnUrl}`);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Invalid Link
            </CardTitle>
            <CardDescription>
              This invitation link is missing the required token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              {(error as Error).message || "This invitation link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Please contact the organization administrator for a new invitation link.
            </p>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Logo />
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <Card className="overflow-hidden">
          {/* Organization Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-8 text-white text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-white/20">
              <AvatarImage src={organization?.logo || undefined} />
              <AvatarFallback className="bg-white/20 text-white text-2xl">
                {organization?.name?.[0] || "O"}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold mb-2">
              You're invited to join
            </h1>
            <p className="text-3xl font-bold">
              {organization?.name || "an organization"}
            </p>
          </div>

          <CardContent className="p-6">
            {/* Invitation Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Briefcase className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Role</p>
                  <p className="text-sm text-gray-600 capitalize">{invitation?.role || "Member"}</p>
                </div>
              </div>

              {invitation?.title && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Job Title</p>
                    <p className="text-sm text-gray-600">{invitation.title}</p>
                  </div>
                </div>
              )}

              {invitation?.department && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Department</p>
                    <p className="text-sm text-gray-600">{invitation.department}</p>
                  </div>
                </div>
              )}

              {invitation?.tokenExpiresAt && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expires {new Date(invitation.tokenExpiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Organization Description */}
            {organization?.description && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">About the Organization</h3>
                <p className="text-sm text-gray-600">{organization.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {isLoggedIn ? (
                <>
                  <Button
                    onClick={() => acceptMutation.mutate()}
                    disabled={acceptMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    size="lg"
                  >
                    {acceptMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Joining...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => declineMutation.mutate()}
                    disabled={declineMutation.isPending}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    {declineMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Declining...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 mr-2" />
                        Decline Invitation
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-gray-600 mb-4">
                    Please log in or create an account to accept this invitation.
                  </p>
                  <Button
                    onClick={handleLoginRedirect}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    size="lg"
                  >
                    Log In / Sign Up to Accept
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
