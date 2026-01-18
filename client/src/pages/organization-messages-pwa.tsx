import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useViewportDetection } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  Send,
  Search,
  User,
  ChevronLeft,
  FolderOpen,
  Plus,
  X,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import { PWALoadingSkeleton } from "@/components/layout/pwa-page-guard";
import { formatDistanceToNow } from "date-fns";

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
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  isOptimistic?: boolean;
}

interface Volunteer {
  id: number;
  displayName?: string;
  username?: string;
  avatar?: string;
}

export default function OrganizationMessagesPWA() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();

  const userType = localStorage.getItem("userType") || "";
  const userId = localStorage.getItem("currentUserId") || "";
  const parsedUserId = userId ? parseInt(userId, 10) : 0;

  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [newConversationTopic, setNewConversationTopic] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect to desktop view when not on mobile (after viewport detection completes)
  useEffect(() => {
    if (!isViewportLoading && !isMobile) {
      navigate("/organization-dashboard");
    }
  }, [isViewportLoading, isMobile, navigate]);

  // Redirect non-organization users
  useEffect(() => {
    if (userType && userType !== "organization") {
      navigate("/volunteer-dashboard");
    }
  }, [userType, navigate]);

  // Fetch current user to get organization ID
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

  // Fetch conversation threads
  const {
    data: threads = [],
    isLoading: loadingThreads,
    refetch: refetchThreads,
    isError: threadsError,
  } = useQuery<ConversationThread[]>({
    queryKey: ["/api/conversation-threads/organization", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await fetch(`/api/conversation-threads/organization/${organizationId}`);
      if (!response.ok) {
        console.error("Failed to fetch threads:", response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!organizationId,
    staleTime: 30000,
    refetchInterval: 5000,
  });

  // Fetch volunteers for new conversation
  const { data: volunteers = [] } = useQuery<Volunteer[]>({
    queryKey: ["/api/organizations", organizationId, "volunteers", userId],
    queryFn: async () => {
      if (!organizationId || !userId) return [];
      const response = await fetch(`/api/organizations/${organizationId}/volunteers?userId=${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: showNewConversation && !!organizationId && !!userId,
  });

  // Fetch thread messages
  const {
    data: threadMessages,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["/api/conversation-threads", selectedThread?.id, "messages", userId],
    queryFn: async () => {
      if (!selectedThread?.id || !userId) return { thread: null, messages: [] };
      try {
        const response = await fetch(
          `/api/conversation-threads/${selectedThread.id}/messages?userId=${userId}`
        );
        if (!response.ok) return { thread: null, messages: [] };
        const data = await response.json();
        return {
          thread: data.thread || null,
          messages: Array.isArray(data.messages) ? data.messages : [],
        };
      } catch (error) {
        console.error("Error fetching messages:", error);
        return { thread: null, messages: [] };
      }
    },
    enabled: !!selectedThread?.id && !!userId,
    refetchInterval: selectedThread ? 2000 : false, // Reduced for live chat feel
    staleTime: 1000, // Keep data fresh
  });

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async ({
      volunteerId,
      topic,
      initialMessage,
    }: {
      volunteerId: number;
      topic: string;
      initialMessage: string;
    }) => {
      if (!organizationId) throw new Error("Organization not found");
      return apiRequest("POST", "/api/conversation-threads", {
        organizationId,
        volunteerId,
        topic,
        initialMessage,
        senderId: parsedUserId,
      });
    },
    onSuccess: async (data) => {
      setShowNewConversation(false);
      setSelectedVolunteer(null);
      setNewConversationTopic("");
      await refetchThreads();
      if (data && typeof data === "object" && "id" in data) {
        setSelectedThread(data as unknown as ConversationThread);
      }
      toast({ title: "Conversation started", description: "Your message has been sent." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  // Send message mutation with optimistic update for instant display
  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: number; content: string }) => {
      if (!parsedUserId) throw new Error("User not authenticated");
      return apiRequest("POST", `/api/conversation-threads/${threadId}/messages`, {
        senderId: parsedUserId,
        content: content.trim(),
        messageType: "text",
      });
    },
    onMutate: async ({ threadId, content }) => {
      // Use the same query key format as the messages query
      const queryKey = ["/api/conversation-threads", threadId, "messages", userId];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(queryKey);

      // Optimistically update - add the new message immediately with 'sending' status
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return { thread: null, messages: [] };
        const optimisticMessage = {
          id: Date.now(), // Temporary ID
          threadId,
          senderId: parsedUserId,
          receiverId: 0, // Will be filled by server
          content: content.trim(),
          messageType: "text",
          read: false,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sending',
          isOptimistic: true, // Flag to identify optimistic messages
        };
        return {
          ...old,
          messages: [...(old.messages || []), optimisticMessage],
        };
      });

      // Clear input immediately for better UX
      setMessageContent("");

      return { previousMessages, queryKey };
    },
    onSuccess: async () => {
      // Refetch to get the real message with correct ID
      await Promise.all([refetchMessages(), refetchThreads()]);
    },
    onError: (error: any, _variables, context) => {
      // Roll back to previous messages on error
      if (context?.previousMessages && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousMessages);
      }
      toast({
        title: "Error",
        description: error?.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Mark messages as delivered when viewed by the receiver
  const markAsDeliveredMutation = useMutation({
    mutationFn: async (messageIds: number[]) => {
      const response = await fetch('/api/messages/mark-delivered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });
      if (!response.ok) throw new Error('Failed to mark messages as delivered');
      return response.json();
    },
  });

  // Effect to mark messages as delivered when viewing a thread
  useEffect(() => {
    if (!threadMessages?.messages || !parsedUserId) return;

    // Find messages where current user is receiver and not yet delivered
    const undeliveredMessages = threadMessages.messages.filter(
      (msg: Message) =>
        msg.receiverId === parsedUserId &&
        msg.deliveryStatus !== 'delivered' &&
        msg.deliveryStatus !== 'read' &&
        !msg.isOptimistic
    );

    if (undeliveredMessages.length > 0) {
      const messageIds = undeliveredMessages.map((msg: Message) => msg.id);
      markAsDeliveredMutation.mutate(messageIds);
    }
  }, [threadMessages?.messages, parsedUserId]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages?.messages, scrollToBottom]);

  // Handle send message
  const handleSendMessage = useCallback(() => {
    const trimmedContent = messageContent.trim();
    if (!trimmedContent || !selectedThread?.id || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({ threadId: selectedThread.id, content: trimmedContent });
  }, [messageContent, selectedThread, sendMessageMutation]);

  // Handle start new conversation
  const handleStartNewConversation = useCallback(() => {
    const trimmedMessage = newConversationTopic.trim();
    if (!trimmedMessage || !selectedVolunteer) {
      toast({ title: "Error", description: "Please select a volunteer and enter a message", variant: "destructive" });
      return;
    }
    createThreadMutation.mutate({
      volunteerId: selectedVolunteer.id,
      topic: "General Inquiry",
      initialMessage: trimmedMessage,
    });
  }, [newConversationTopic, selectedVolunteer, createThreadMutation, toast]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Reset modal state
  const resetNewConversationState = useCallback(() => {
    setShowNewConversation(false);
    setSelectedVolunteer(null);
    setNewConversationTopic("");
  }, []);

  // Filter threads
  const filteredThreads = threads.filter((thread) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      thread.volunteerName?.toLowerCase().includes(searchLower) ||
      thread.topic?.toLowerCase().includes(searchLower) ||
      thread.projectName?.toLowerCase().includes(searchLower)
    );
  });

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchThreads(), refetchMessages()]);
      toast({ title: "Refreshed", description: "Messages updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to refresh", variant: "destructive" });
    }
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetchThreads, refetchMessages, toast]);

  // Show loading skeleton while viewport is being detected or redirecting to desktop
  if (isViewportLoading || !isMobile) {
    return <PWALoadingSkeleton />;
  }

  // Loading state
  if (!userId) {
    return <PWALoadingSkeleton />;
  }

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-[#faf9f7] text-slate-800 flex flex-col overflow-x-hidden overflow-y-auto">
      {/* Centered App Container */}
      <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col">
        {/* Shared Header with Refresh Button */}
        <OrganizationPWAHeader
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Spacer for fixed header - accounts for safe-area-inset-top */}
        <div className="flex-shrink-0" style={{ height: 'calc(env(safe-area-inset-top, 0px) + 64px)' }} />

        {/* Thread Header - shows when viewing a conversation */}
        {selectedThread && (
          <div className="bg-white/95 backdrop-blur-sm text-slate-800 px-4 py-2 shadow-sm border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-800 hover:bg-slate-100 -ml-2"
                onClick={() => setSelectedThread(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 text-center min-w-0">
                <p className="font-semibold text-sm truncate">{selectedThread.volunteerName || "Volunteer"}</p>
                <p className="text-xs text-slate-600 truncate">{selectedThread.topic || "Conversation"}</p>
              </div>
              <div className="w-8" />
            </div>
          </div>
        )}

        {/* Page Banner - shows in list view */}
        {!selectedThread && (
          <div className="p-4">
            <div className="bg-gradient-to-br from-emerald-200 via-teal-200 to-cyan-200 rounded-2xl p-4 text-slate-800 shadow-lg relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-emerald-400/30" />
                <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-teal-400/20" />
              </div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/40 backdrop-blur rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-emerald-700 text-[11px] font-medium uppercase tracking-wide mb-0.5">Team Communication</p>
                    <h2 className="text-xl font-bold text-slate-800">Messages</h2>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/40 hover:bg-white/60 text-emerald-700 rounded-xl"
                  onClick={() => setShowNewConversation(true)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/40 backdrop-blur rounded-xl p-2.5 text-center">
                  <p className="text-xl font-bold text-slate-800">{threads.length}</p>
                  <p className="text-[9px] text-emerald-700 font-medium">Conversations</p>
                </div>
                <div className="bg-white/40 backdrop-blur rounded-xl p-2.5 text-center">
                  <p className="text-xl font-bold text-slate-800">{threads.filter(t => t.status === 'active').length}</p>
                  <p className="text-[9px] text-emerald-700 font-medium">Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24">
          {selectedThread ? (
            /* Chat View */
            <div className="flex flex-col h-full pb-16">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            {loadingMessages ? (
              <div className="text-center text-slate-500 py-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading messages...</p>
              </div>
            ) : (threadMessages?.messages || []).length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(threadMessages?.messages || []).map((msg: Message) => {
                  const isOwnMessage = msg.senderId === parsedUserId;
                  // Determine delivery status for display
                  const status = msg.isOptimistic ? 'sending' : (msg.deliveryStatus || (msg.read ? 'read' : 'sent'));
                  return (
                    <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                      <div className={`flex gap-2 max-w-[80%] ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={msg.senderAvatar} alt={msg.senderName || "Sender"} />
                            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-emerald-500 text-white"
                              : "bg-white text-slate-800 border border-slate-200"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? "justify-end" : ""}`}>
                            <span className={`text-[10px] ${isOwnMessage ? "text-emerald-100" : "text-slate-400"}`}>
                              {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                            </span>
                            {/* Delivery status indicators for own messages */}
                            {isOwnMessage && (
                              <span className="flex items-center">
                                {status === 'sending' && (
                                  <Loader2 className="w-3 h-3 text-emerald-200 animate-spin" />
                                )}
                                {status === 'sent' && (
                                  <Check className="w-3 h-3 text-emerald-200" />
                                )}
                                {status === 'delivered' && (
                                  <CheckCheck className="w-3 h-3 text-emerald-200" />
                                )}
                                {status === 'read' && (
                                  <CheckCheck className="w-3 h-3 text-emerald-100" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area - Fixed above bottom nav */}
          <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-3 bg-white border-t border-slate-200 z-40">
            <div className="max-w-[428px] mx-auto">
              <div className="flex gap-2">
                <Input
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-100 border-0"
                  onKeyDown={handleKeyDown}
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || sendMessageMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Thread List View */
        <div className="p-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-slate-200"
            />
          </div>

          {/* Conversation List */}
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Conversations</h3>

          {loadingThreads ? (
            <div className="text-center text-slate-500 py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading conversations...</p>
            </div>
          ) : threadsError ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-red-300" />
              <p className="text-slate-600 font-medium">Failed to load conversations</p>
              <Button onClick={() => refetchThreads()} variant="outline" size="sm" className="mt-3">
                Try Again
              </Button>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">
                {searchTerm ? "No matching conversations" : "No conversations yet"}
              </p>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                {searchTerm ? "Try a different search term" : "Start a conversation with a volunteer"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowNewConversation(true)} className="bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className="w-full bg-white rounded-xl p-3 border border-slate-200 hover:border-emerald-300 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={thread.volunteerAvatar} alt={thread.volunteerName} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-600">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-800 truncate">{thread.volunteerName || "Volunteer"}</p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                          {thread.lastMessageAt
                            ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{thread.topic || "Conversation"}</p>
                      {thread.projectName && (
                        <Badge
                          variant="outline"
                          className="mt-1.5 text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50"
                        >
                          <FolderOpen className="h-2.5 w-2.5 mr-1" />
                          {thread.projectName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          </div>
          )}
        </main>

        {/* New Conversation Modal */}
        {showNewConversation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-[70]"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetNewConversationState();
          }}
        >
          <div className="bg-white rounded-t-2xl w-full max-w-[428px] mx-auto max-h-[70vh] overflow-hidden mb-[calc(4rem+env(safe-area-inset-bottom))]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">New Conversation</h2>
              <button onClick={resetNewConversationState} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {!selectedVolunteer ? (
                /* Step 1: Choose volunteer */
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-4">Select a volunteer to message</p>

                  {volunteers.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-600 font-medium">No volunteers assigned</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Volunteers need to be assigned to your projects first
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {volunteers.map((volunteer) => (
                        <button
                          key={volunteer.id}
                          onClick={() => setSelectedVolunteer(volunteer)}
                          className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={volunteer.avatar} alt={volunteer.displayName || volunteer.username} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-600">
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-800">
                            {volunteer.displayName || volunteer.username || `Volunteer ${volunteer.id}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Write message */
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedVolunteer(null)}
                    className="flex items-center gap-1 text-sm text-emerald-600 mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={selectedVolunteer.avatar}
                        alt={selectedVolunteer.displayName || selectedVolunteer.username}
                      />
                      <AvatarFallback className="bg-emerald-200 text-emerald-700">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-slate-800">
                      {selectedVolunteer.displayName || selectedVolunteer.username}
                    </span>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Your Message</label>
                    <Input
                      value={newConversationTopic}
                      onChange={(e) => setNewConversationTopic(e.target.value)}
                      placeholder="Type your message..."
                      className="bg-white"
                    />
                  </div>

                  <Button
                    onClick={handleStartNewConversation}
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                    disabled={!newConversationTopic.trim() || createThreadMutation.isPending}
                  >
                    {createThreadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Bottom Navigation */}
        <OrganizationPWANav activeTab="messages" />
      </div>
    </div>
  );
}
