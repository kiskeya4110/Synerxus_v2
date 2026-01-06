import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationWelcomeBanner from "@/components/layout/organization-welcome-banner";
import OfflineBanner from "@/components/layout/offline-banner";
import Footer from "@/components/layout/footer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  ChevronLeft,
  MoreVertical,
  FolderOpen,
  Users,
  AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ConversationThread {
  id: number;
  organizationId: number;
  volunteerId: number;
  topic: string;
  projectId: number | null;
  status: string;
  lastMessageAt: string;
  volunteerName?: string;
  volunteerAvatar?: string;
  projectName?: string;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  messageType: string;
  read: boolean;
  createdAt: string;
  senderName?: string;
  senderAvatar?: string;
}

export default function OrganizationMessages() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const userType = localStorage.getItem("userType");
  const userId = localStorage.getItem("currentUserId");
  const isMobile = useIsMobile();

  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newVolunteerId, setNewVolunteerId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Redirect to PWA version on mobile
  useEffect(() => {
    if (isMobile) {
      navigate('/organization-messages/pwa');
    }
  }, [isMobile, navigate]);

  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId,
  });

  const organizationId = currentUser?.organizationId || currentUser?.id;

  useEffect(() => {
    if (userType !== "organization") {
      navigate("/volunteer-dashboard");
    }
  }, [userType, navigate]);

  const { data: threads = [], isLoading: loadingThreads, refetch: refetchThreads } = useQuery<ConversationThread[]>({
    queryKey: ["/api/conversation-threads/organization", organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/conversation-threads/organization/${organizationId}`);
      if (!response.ok) throw new Error("Failed to fetch threads");
      return response.json();
    },
    enabled: !!organizationId,
    refetchInterval: 5000 // Poll every 5 seconds to catch new messages and threads
  });

  const { data: threadMessages, isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ["/api/conversation-threads", selectedThread?.id, "messages", userId],
    queryFn: async () => {
      if (!selectedThread || !userId) return { thread: null, messages: [] };
      const response = await fetch(`/api/conversation-threads/${selectedThread.id}/messages?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!selectedThread && !!userId,
    refetchInterval: selectedThread ? 3000 : false // Poll every 3 seconds when a thread is selected
  });

  // Fetch volunteers assigned to organization projects - uses apiRequest for proper auth
  const { data: volunteers = [], isLoading: loadingVolunteers, error: volunteersError, refetch: refetchVolunteers } = useQuery({
    queryKey: ["/api/organizations", organizationId, "volunteers", userId],
    queryFn: async () => {
      if (!organizationId || !userId) return [];
      // Use fetch with userId header for proper authentication
      const response = await fetch(`/api/organizations/${organizationId}/volunteers?userId=${userId}`, {
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        console.error("Failed to fetch volunteers:", response.status, await response.text());
        return [];
      }
      const data = await response.json();
      console.log("Fetched volunteers for messaging:", data);
      return data;
    },
    enabled: !!organizationId && !!userId,
    staleTime: 30000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: number; content: string }) => {
      return apiRequest("POST", `/api/conversation-threads/${threadId}/messages`, {
        senderId: parseInt(userId || "0"),
        content,
        messageType: "text",
      });
    },
    onSuccess: () => {
      setMessageContent("");
      refetchMessages();
      refetchThreads();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: { volunteerId: number; topic: string; initialMessage: string }) => {
      return apiRequest("POST", "/api/conversation-threads", {
        organizationId: parseInt(organizationId || "0"),
        volunteerId: data.volunteerId,
        topic: data.topic,
        initialMessage: data.initialMessage,
      });
    },
    onSuccess: () => {
      setShowNewConversation(false);
      setNewTopic("");
      setNewVolunteerId("");
      setNewMessage("");
      refetchThreads();
      toast({ title: "Success", description: "Conversation started successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to start conversation", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (threadMessages?.messages?.length && messagesContainerRef.current) {
      // Scroll within the container only, not the whole page
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [threadMessages?.messages]);

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedThread) return;
    sendMessageMutation.mutate({ threadId: selectedThread.id, content: messageContent });
  };

  const handleStartConversation = () => {
    if (!newVolunteerId || !newTopic.trim() || !newMessage.trim()) {
      toast({ title: "Missing Information", description: "Please select a volunteer, enter a topic, and write a message", variant: "destructive" });
      return;
    }
    createThreadMutation.mutate({ volunteerId: parseInt(newVolunteerId), topic: newTopic, initialMessage: newMessage });
  };

  const handleSelectThread = (thread: ConversationThread) => {
    setSelectedThread(thread);
  };

  const filteredThreads = threads.filter(
    (thread) =>
      thread.volunteerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      thread.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <OfflineBanner />
      <OrganizationHeader activeTab="messages" />
      <OrganizationWelcomeBanner pageTitle="Messages" />

      <div className="flex-1 max-w-[1400px] mx-auto px-6 pt-6 w-full">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">Messages</h1>
              <p className="text-gray-600">Communicate with volunteers on your projects</p>
            </div>

            <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-conversation">
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Select Volunteer
                    </label>
                    {loadingVolunteers ? (
                      <div className="w-full mt-1 px-3 py-2 border rounded-md bg-gray-50 text-gray-500 text-sm flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        Loading volunteers from your projects...
                      </div>
                    ) : volunteersError ? (
                      <div className="w-full mt-1 px-3 py-2 border rounded-md bg-red-50 text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Error loading volunteers. Please try again.
                      </div>
                    ) : (volunteers as any[]).length === 0 ? (
                      <div className="w-full mt-1 px-3 py-3 border rounded-md bg-amber-50 text-amber-800 text-sm">
                        <div className="flex items-center gap-2 font-medium">
                          <Users className="h-4 w-4" />
                          No volunteers assigned yet
                        </div>
                        <p className="text-xs mt-2 text-amber-700">
                          Volunteers need to apply and be accepted to your projects before you can message them.
                          Create projects and approve volunteer applications to start messaging.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => { setShowNewConversation(false); navigate('/applications'); }}
                        >
                          View Applications
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <select
                          value={newVolunteerId}
                          onChange={(e) => setNewVolunteerId(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                          data-testid="select-volunteer"
                        >
                          <option value="">Choose a volunteer...</option>
                          {(volunteers as any[]).map((v: any) => (
                            <option key={v.id} value={v.id}>
                              {v.displayName || v.volunteerName || v.username || v.email || `Volunteer ${v.id}`}
                              {v.totalHours ? ` (${v.totalHours}h logged)` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {(volunteers as any[]).length} volunteer{(volunteers as any[]).length !== 1 ? 's' : ''} assigned to your projects
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Topic</label>
                    <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="e.g., Project Opportunity" className="mt-1" data-testid="input-topic" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Write your message..." rows={4} className="mt-1" data-testid="input-initial-message" />
                  </div>
                  <Button onClick={handleStartConversation} className="w-full" disabled={createThreadMutation.isPending} data-testid="button-start-conversation">
                    {createThreadMutation.isPending ? "Starting..." : "Start Conversation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Messages Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversation List */}
            <Card className="lg:col-span-1 overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-conversations"
                  />
                </div>
              </CardHeader>
              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {loadingThreads ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : filteredThreads.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a new conversation to connect with volunteers</p>
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => handleSelectThread(thread)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedThread?.id === thread.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                      }`}
                      data-testid={`thread-item-${thread.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={thread.volunteerAvatar} />
                          <AvatarFallback>{thread.volunteerName?.charAt(0) || "V"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 truncate">{thread.volunteerName}</p>
                            <span className="text-xs text-gray-500 ml-2">{formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{thread.topic}</p>
                          {thread.projectName && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              <FolderOpen className="h-3 w-3 mr-1" />
                              {thread.projectName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Message Thread */}
            <Card className="lg:col-span-2 overflow-hidden">
              {selectedThread ? (
                <>
                  {/* Thread Header */}
                  <CardHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedThread(null)}>
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedThread.volunteerAvatar} />
                          <AvatarFallback>{selectedThread.volunteerName?.charAt(0) || "V"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{selectedThread.volunteerName}</p>
                          <p className="text-sm text-gray-500 truncate">{selectedThread.topic}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Messages Area */}
                  <div ref={messagesContainerRef} className="overflow-y-auto p-4" style={{ height: '350px' }}>
                    {loadingMessages ? (
                      <div className="text-center text-gray-500">Loading messages...</div>
                    ) : (
                      <div className="space-y-4">
                        {(threadMessages?.messages || []).map((msg: Message) => {
                          const isOwnMessage = msg.senderId === parseInt(userId || "0");
                          return (
                            <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[70%] rounded-lg p-3 ${isOwnMessage ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                                <p className="text-sm break-words">{msg.content}</p>
                                <p className={`text-xs mt-1 ${isOwnMessage ? "text-blue-200" : "text-gray-500"}`}>
                                  {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t bg-white">
                    <div className="flex gap-2">
                      <Input
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Type your message..."
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                        data-testid="input-message"
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!messageContent.trim() || sendMessageMutation.isPending} data-testid="button-send">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-gray-500" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div>
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm">Choose from your existing conversations or start a new one</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
      </div>
      <Footer />
    </div>
  );
}
