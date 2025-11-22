import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Clock, CheckCircle, Eye } from "lucide-react";

export default function EmailDigests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = localStorage.getItem('currentUserId');

  // Fetch current user data
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) throw new Error("No user ID found");
      const response = await fetch(`/api/users/me?userId=${id}`);
      if (!response.ok) throw new Error("User not found");
      return response.json();
    },
    enabled: !!userId
  });

  // Send weekly digest mutation
  const sendDigestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/email-digest/send", {
        userId: currentUser?.id
      });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your weekly digest has been sent.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send digest",
        variant: "destructive",
      });
    },
  });

  // Send all digests mutation (for org managers)
  const sendAllDigestsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/email-digest/send-all", {
        userId: currentUser?.id
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success!",
        description: `Weekly digests sent to ${data.sent} users (${data.failed} failed)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send digests",
        variant: "destructive",
      });
    },
  });

  // Send organization digest
  const sendOrgDigestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/email-digest/organization/${currentUser?.organizationId}`, {
        userId: currentUser?.id
      });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Organization digest has been sent",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send organization digest",
        variant: "destructive",
      });
    },
  });

  const isOrgManager = currentUser?.userType === 'organization';

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Email Digests</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and preview your personalized weekly impact summaries
        </p>
      </div>

      <Tabs defaultValue="volunteer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="volunteer">Personal Digest</TabsTrigger>
          {isOrgManager && <TabsTrigger value="organization">Organization Digest</TabsTrigger>}
        </TabsList>

        {/* Personal Digest Tab */}
        <TabsContent value="volunteer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Weekly Impact Digest</CardTitle>
              <CardDescription>
                A personalized summary of your volunteer activities, hours contributed, and measured impact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-lg mb-3">📊 What's Included?</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Weekly Metrics:</strong> Total hours, tasks completed, projects contributed to</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Activity Summary:</strong> Your volunteer activities from the past week</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Impact Metrics:</strong> Measured outcomes with role-based attribution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Impact Score:</strong> Your personalized impact score (0-100)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Weekly Streak:</strong> Your consecutive weeks with activity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>SDG Alignment:</strong> UN Sustainable Development Goals you support</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>📅 Timing:</strong> Weekly digests are sent every Sunday with your activities and impact from the past 7 days. You can also send a test digest anytime using the button below.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Send Test Digest</h4>
                <Button
                  onClick={() => sendDigestMutation.mutate()}
                  disabled={sendDigestMutation.isPending}
                  className="w-full"
                  data-testid="button-send-test-digest"
                >
                  {sendDigestMutation.isPending ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send My Weekly Digest Now
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This will send you a preview of your weekly digest to your email
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Digest Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium">Personalized Content</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Only shows your activities and impact data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium">Role-Based Attribution</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Impact credit adjusts based on your role (Lead: 100%, Support: 50%, Observer: 0%)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium">Deduplication Aware</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Only counts verified impacts, excludes flagged duplicates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium">Weekly Streak Tracking</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Earn a 🔥 badge for consecutive weeks of activity</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Digest Tab */}
        {isOrgManager && (
          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Weekly Summary</CardTitle>
                <CardDescription>
                  A comprehensive summary of your organization's volunteer impact and team performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 p-6 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-lg mb-3">📊 What's Included?</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Active Volunteers:</strong> Number of volunteers who contributed this week</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Total Hours:</strong> Aggregate volunteer hours across all projects</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Impact Recorded:</strong> Number of verified impact metrics logged</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Weekly Insights:</strong> AI-generated insights about performance trends</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-900 dark:text-green-200">
                    <strong>📧 Recipients:</strong> This digest will be sent to your organization's contact email and includes insights for funders and stakeholders.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Send Organization Digest</h4>
                  <Button
                    onClick={() => sendOrgDigestMutation.mutate()}
                    disabled={sendOrgDigestMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                    data-testid="button-send-org-digest"
                  >
                    {sendOrgDigestMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Organization Summary Now
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sends a comprehensive summary to your organization's contact email
                  </p>
                </div>

                {currentUser?.userType === 'organization' && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold">Send All Volunteer Digests</h4>
                    <Button
                      onClick={() => sendAllDigestsMutation.mutate()}
                      disabled={sendAllDigestsMutation.isPending}
                      variant="outline"
                      className="w-full"
                      data-testid="button-send-all-digests"
                    >
                      {sendAllDigestsMutation.isPending ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send All Volunteer Digests
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Admin action: Send weekly digests to all registered volunteers
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Email Digest Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 flex-shrink-0">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h5 className="font-medium">Weekly Schedule</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">Digests are automatically sent every Sunday at 9:00 AM in your timezone</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-2 flex-shrink-0">
                <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h5 className="font-medium">Manual Preview</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">Use the "Send Now" button to receive a preview digest anytime</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
