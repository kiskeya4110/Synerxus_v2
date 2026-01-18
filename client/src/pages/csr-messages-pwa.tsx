import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  Send,
  Search,
  Building2,
  User,
  ChevronLeft,
  FolderOpen,
  Plus,
  X,
  Loader2,
  Home,
  Settings,
  LogOut,
  MoreVertical,
  Bell,
  Target,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import CSRPWANav from "@/components/layout/csr-pwa-nav";
import CSRPWAHeader from "@/components/layout/csr-pwa-header";
import { formatDistanceToNow } from "date-fns";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

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
  organizationName?: string;
  organizationLogo?: string;
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

interface Organization {
  id: number;
  name: string;
  logo?: string;
}

export default function CSRMessagesPWA() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { signOut } = useAuth();

  const userType = localStorage.getItem("userType") || "";
  const userId = localStorage.getItem("currentUserId") || "";
  const parsedUserId = userId ? parseInt(userId, 10) : 0;

  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [newConversationTopic, setNewConversationTopic] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect non-CSR users
  useEffect(() => {
    if (userType && userType !== "corporate-partner") {
      if (userType === "volunteer") {
        navigate("/volunteer-dashboard");
      } else {
        navigate("/organization-dashboard");
      }
    }
  }, [userType, navigate]);

  // Fetch current user
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

  // Fetch organizations for messaging
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations");
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 120000,
  });

  // Fetch corporate partner sponsored projects
  const { data: sponsoredProjects = [] } = useQuery({
    queryKey: ["/api/projects/sponsored", userId],
    queryFn: async () => {
      const response = await fetch(`/api/projects?sponsorId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
  });

  // For CSR, we need to fetch threads where they might be the volunteer or connected to projects
  // CSR users communicate with organizations about sponsored projects
  const {
    data: threads = [],
    isLoading: loadingThreads,
    refetch: refetchThreads,
    isError: threadsError,
  } = useQuery<ConversationThread[]>({
    queryKey: ["/api/conversation-threads/volunteer", userId],
    queryFn: async () => {
      if (!userId) return [];
      // CSR users use the volunteer endpoint as they initiate conversations with orgs
      const response = await fetch(`/api/conversation-threads/volunteer/${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchInterval: 5000,
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
    refetchInterval: selectedThread ? 3000 : false,
    staleTime: 3000,
  });

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async ({
      organizationId,
      topic,
      initialMessage,
    }: {
      organizationId: number;
      topic: string;
      initialMessage: string;
    }) => {
      if (!parsedUserId) throw new Error("User not authenticated");
      return apiRequest("POST", "/api/conversation-threads", {
        organizationId,
        volunteerId: parsedUserId,
        topic,
        initialMessage,
        senderId: parsedUserId,
      });
    },
    onSuccess: async (data) => {
      setShowNewConversation(false);
      setSelectedOrganization(null);
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
      await queryClient.cancelQueries({ queryKey: [`/api/conversation-threads/${threadId}/messages`] });
      const previousMessages = queryClient.getQueryData([`/api/conversation-threads/${threadId}/messages`]);
      queryClient.setQueryData([`/api/conversation-threads/${threadId}/messages`], (old: any) => {
        if (!old) return old;
        const optimisticMessage = {
          id: Date.now(),
          threadId,
          senderId: parsedUserId,
          content: content.trim(),
          messageType: "text",
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        };
        return { ...old, messages: [...(old.messages || []), optimisticMessage] };
      });
      setMessageContent("");
      return { previousMessages };
    },
    onSuccess: async () => {
      await Promise.all([refetchMessages(), refetchThreads()]);
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousMessages && selectedThread) {
        queryClient.setQueryData([`/api/conversation-threads/${selectedThread.id}/messages`], context.previousMessages);
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
      const response = await fetch('/api/mark-delivered', {
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
    if (!trimmedMessage || !selectedOrganization) {
      toast({ title: "Error", description: "Please select an organization and enter a message", variant: "destructive" });
      return;
    }
    createThreadMutation.mutate({
      organizationId: selectedOrganization.id,
      topic: "CSR Partnership Inquiry",
      initialMessage: trimmedMessage,
    });
  }, [newConversationTopic, selectedOrganization, createThreadMutation, toast]);

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
    setSelectedOrganization(null);
    setNewConversationTopic("");
  }, []);

  // Filter threads
  const filteredThreads = threads.filter((thread) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      thread.organizationName?.toLowerCase().includes(searchLower) ||
      thread.topic?.toLowerCase().includes(searchLower) ||
      thread.projectName?.toLowerCase().includes(searchLower)
    );
  });

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Loading state
  if (!userId) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-amber-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: "Dashboard", action: () => navigate('/csr-dashboard') },
    { icon: Target, label: "SDGs", action: () => navigate('/csr-dashboard') },
    { icon: Briefcase, label: "Projects", action: () => navigate('/projects') },
    { icon: Settings, label: "Settings", action: () => navigate('/corporate-partner-profile-settings') },
    { icon: LogOut, label: "Logout", action: handleLogout, danger: true },
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-amber-50 to-slate-100 pb-4 max-w-[428px] mx-auto">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between max-w-[428px] mx-auto">
        <div className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="Synerxus"
            className="h-10 object-contain cursor-pointer touch-manipulation"
            onClick={() => navigate('/csr-dashboard')}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />
        </div>

        <button
          onClick={() => setMenuOpen(true)}
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all touch-manipulation cursor-pointer active:scale-95"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          data-testid="button-pwa-menu"
        >
          <MoreVertical className="w-5 h-5 text-slate-700 pointer-events-none" />
        </button>
      </header>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative mt-16 mr-4 bg-white rounded-xl shadow-2xl overflow-hidden min-w-[200px] animate-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => { setMenuOpen(false); item.action(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed header - accounts for safe-area-inset-top */}
      <div style={{ height: 'calc(env(safe-area-inset-top, 0px) + 72px)' }} />

      {/* Thread Header - shows when viewing a conversation */}
      {selectedThread && (
        <div className="sticky top-16 z-10 bg-white/95 backdrop-blur-sm text-slate-800 px-4 py-2 shadow-sm border-b border-slate-200">
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
              <p className="font-semibold text-sm truncate">{selectedThread.organizationName || "Organization"}</p>
              <p className="text-xs text-slate-600 truncate">{selectedThread.topic || "Conversation"}</p>
            </div>
            <div className="w-8" />
          </div>
        </div>
      )}

      {/* New Conversation Button - shows in list view */}
      {!selectedThread && (
        <div className="px-4 py-2 bg-white/80 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Messages</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-800 hover:bg-slate-100"
            onClick={() => setShowNewConversation(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main Content */}
      {selectedThread ? (
        /* Chat View */
        <div className="flex flex-col h-[calc(100vh-140px)]">
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
                  return (
                    <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                      <div className={`flex gap-2 max-w-[80%] ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={msg.senderAvatar} alt={msg.senderName || "Sender"} />
                            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-amber-500 text-white"
                              : "bg-white text-slate-800 border border-slate-200"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isOwnMessage ? "text-amber-100" : "text-slate-400"}`}>
                            {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200">
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
                className="bg-amber-500 hover:bg-amber-600"
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

          {/* Quick Connect to Sponsored Project Orgs */}
          {sponsoredProjects.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Partner Organizations</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {organizations.slice(0, 4).map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrganization(org);
                      setShowNewConversation(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-slate-200 hover:border-amber-300 transition-colors"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={org.logo} alt={org.name} />
                      <AvatarFallback className="bg-amber-100 text-amber-600 text-xs">
                        <Building2 className="w-3 h-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">{org.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                {searchTerm ? "Try a different search term" : "Connect with organizations to discuss partnerships"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowNewConversation(true)} className="bg-amber-500 hover:bg-amber-600">
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
                  className="w-full bg-white rounded-xl p-3 border border-slate-200 hover:border-amber-300 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={thread.organizationLogo} alt={thread.organizationName} />
                      <AvatarFallback className="bg-amber-100 text-amber-600">
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-800 truncate">{thread.organizationName || "Organization"}</p>
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
                          className="mt-1.5 text-[10px] border-amber-200 text-amber-700 bg-amber-50"
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

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetNewConversationState();
          }}
        >
          <div className="bg-white rounded-t-2xl w-full max-w-[428px] mx-auto max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">New Conversation</h2>
              <button onClick={resetNewConversationState} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {!selectedOrganization ? (
                /* Step 1: Choose organization */
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-4">Select an organization to contact</p>

                  {organizations.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-600 font-medium">No organizations available</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => setSelectedOrganization(org)}
                          className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={org.logo} alt={org.name} />
                            <AvatarFallback className="bg-amber-100 text-amber-600">
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-800">{org.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Write message */
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedOrganization(null)}
                    className="flex items-center gap-1 text-sm text-amber-600 mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedOrganization.logo} alt={selectedOrganization.name} />
                      <AvatarFallback className="bg-amber-200 text-amber-700">
                        <Building2 className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-slate-800">{selectedOrganization.name}</span>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Your Message</label>
                    <Input
                      value={newConversationTopic}
                      onChange={(e) => setNewConversationTopic(e.target.value)}
                      placeholder="Discuss partnership opportunities..."
                      className="bg-white"
                    />
                  </div>

                  <Button
                    onClick={handleStartNewConversation}
                    className="w-full bg-amber-500 hover:bg-amber-600"
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
      <CSRPWANav activeTab="home" />
    </div>
  );
}
