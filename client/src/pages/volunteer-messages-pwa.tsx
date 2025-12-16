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
  ChevronLeft,
  FolderOpen,
  Home,
  Briefcase,
  BarChart3,
  User,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import PWAHeader from "@/components/pwa/pwa-header";
import VolunteerPWANav from "@/components/layout/volunteer-pwa-nav";
import { formatDistanceToNow } from "date-fns";

interface ConversationThread {
  id: number;
  organizationId: number;
  volunteerId: number;
  topic: string;
  projectId: number | null;
  status: string;
  lastMessageAt: string;
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
}

interface Project {
  id: number;
  name: string;
  organizationId: number;
  organizationName?: string;
}

interface Organization {
  id: number;
  name: string;
  logo?: string;
}

export default function VolunteerMessagesPWA() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // FIX 1: Safely parse userType and userId with fallbacks
  const userType = localStorage.getItem("userType") || "";
  const userId = localStorage.getItem("currentUserId") || "";
  const parsedUserId = userId ? parseInt(userId, 10) : 0;

  const [selectedThread, setSelectedThread] =
    useState<ConversationThread | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationType, setNewConversationType] = useState<
    "organization" | "project" | null
  >(null);
  const [newConversationTopic, setNewConversationTopic] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // FIX 2: Only redirect if userType is set AND not volunteer (avoid redirect loop on fresh load)
  useEffect(() => {
    if (userType && userType !== "volunteer") {
      navigate("/organization-dashboard");
    }
  }, [userType, navigate]);

  // FIX 3: Add error handling and better typing for threads query
  const {
    data: threads = [],
    isLoading: loadingThreads,
    refetch: refetchThreads,
    isError: threadsError,
  } = useQuery<ConversationThread[]>({
    queryKey: ["/api/conversation-threads/volunteer", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(
        `/api/conversation-threads/volunteer/${userId}`,
      );
      if (!response.ok) {
        console.error("Failed to fetch threads:", response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userId && !!parsedUserId,
    staleTime: 30000, // Cache for 30 seconds
    retry: 2,
  });

  // FIX 4: Add proper error handling for project assignments
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(
        `/api/project-assignments?volunteerId=${userId}`,
      );
      if (!response.ok) {
        console.error("Failed to fetch project assignments:", response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userId,
    staleTime: 60000, // Cache for 1 minute
  });

  // FIX 5: Add proper error handling for applications
  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/applications", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/applications?volunteerId=${userId}`);
      if (!response.ok) {
        console.error("Failed to fetch applications:", response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  // FIX 6: Add error handling for organizations query
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/organizations");
      if (!response.ok) {
        console.error("Failed to fetch organizations:", response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 120000, // Cache for 2 minutes
  });

  // FIX 7: Add error handling for projects query
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        console.error("Failed to fetch projects:", response.status);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 120000,
  });

  // FIX 8: Improved messages query with better error handling
  const {
    data: threadMessages,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: [
      "/api/conversation-threads",
      selectedThread?.id,
      "messages",
      userId,
    ],
    queryFn: async () => {
      if (!selectedThread?.id || !userId) {
        return { thread: null, messages: [] };
      }
      try {
        const response = await fetch(
          `/api/conversation-threads/${selectedThread.id}/messages?userId=${userId}`,
        );
        if (!response.ok) {
          console.error("Failed to fetch messages:", response.status);
          return { thread: null, messages: [] };
        }
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
    refetchInterval: selectedThread ? 5000 : false,
    staleTime: 5000,
  });

  // FIX 9: Improved thread creation with better error handling
  const createThreadMutation = useMutation({
    mutationFn: async ({
      organizationId,
      topic,
      projectId,
      initialMessage,
    }: {
      organizationId: number;
      topic: string;
      projectId?: number;
      initialMessage: string;
    }) => {
      if (!parsedUserId) {
        throw new Error("User not authenticated");
      }
      return apiRequest("POST", "/api/conversation-threads", {
        organizationId,
        volunteerId: parsedUserId,
        topic,
        projectId: projectId || null,
        initialMessage,
      });
    },
    onSuccess: async (data) => {
      // Reset form state
      setShowNewConversation(false);
      setNewConversationType(null);
      setNewConversationTopic("");
      setSelectedOrg(null);
      setSelectedProject(null);

      // Refresh threads list
      await refetchThreads();

      // FIX 10: Auto-select the new thread if data is returned
      if (data && typeof data === "object" && "id" in data) {
        setSelectedThread(data as unknown as ConversationThread);
      }

      toast({
        title: "Conversation started",
        description: "Your message has been sent.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to create thread:", error);
      toast({
        title: "Error",
        description:
          error?.message || "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // FIX 11: Improved message sending with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      threadId,
      content,
    }: {
      threadId: number;
      content: string;
    }) => {
      if (!parsedUserId) {
        throw new Error("User not authenticated");
      }
      return apiRequest(
        "POST",
        `/api/conversation-threads/${threadId}/messages`,
        {
          senderId: parsedUserId,
          content: content.trim(),
          messageType: "text",
        },
      );
    },
    onSuccess: async () => {
      setMessageContent("");
      // Refetch both messages and threads to update last message time
      await Promise.all([refetchMessages(), refetchThreads()]);
    },
    onError: (error: any) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description:
          error?.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // FIX 12: Use useCallback for scroll to prevent unnecessary re-renders
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages?.messages, scrollToBottom]);

  // FIX 13: Prevent sending empty messages and handle edge cases
  const handleSendMessage = useCallback(() => {
    const trimmedContent = messageContent.trim();
    if (
      !trimmedContent ||
      !selectedThread?.id ||
      sendMessageMutation.isPending
    ) {
      return;
    }
    sendMessageMutation.mutate({
      threadId: selectedThread.id,
      content: trimmedContent,
    });
  }, [messageContent, selectedThread, sendMessageMutation]);

  // FIX 14: Improved validation for starting new conversation
  const handleStartNewConversation = useCallback(() => {
    const trimmedMessage = newConversationTopic.trim();

    if (!trimmedMessage) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    if (newConversationType === "organization" && selectedOrg) {
      createThreadMutation.mutate({
        organizationId: selectedOrg.id,
        topic: `General Inquiry`,
        initialMessage: trimmedMessage,
      });
    } else if (newConversationType === "project" && selectedProject) {
      createThreadMutation.mutate({
        organizationId: selectedProject.organizationId,
        topic: `Project: ${selectedProject.name}`,
        projectId: selectedProject.id,
        initialMessage: trimmedMessage,
      });
    } else {
      toast({
        title: "Error",
        description: "Please select an organization or project",
        variant: "destructive",
      });
    }
  }, [
    newConversationTopic,
    newConversationType,
    selectedOrg,
    selectedProject,
    createThreadMutation,
    toast,
  ]);

  // FIX 15: Memoize filtered threads to prevent recalculation on every render
  const filteredThreads = threads.filter((thread) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      thread.organizationName?.toLowerCase().includes(searchLower) ||
      thread.topic?.toLowerCase().includes(searchLower) ||
      thread.projectName?.toLowerCase().includes(searchLower)
    );
  });

  // FIX 16: Safely extract connected organization IDs with null checks
  const connectedOrgIds = new Set<number>([
    ...applications
      .map((a: any) => a?.project?.organizationId)
      .filter((id): id is number => typeof id === "number"),
    ...projectAssignments
      .map((pa: any) => pa?.project?.organizationId)
      .filter((id): id is number => typeof id === "number"),
  ]);

  const connectedOrganizations = organizations.filter(
    (org) => org?.id && connectedOrgIds.has(org.id),
  );

  // FIX 17: Safely extract connected project IDs
  const connectedProjectIds = new Set<number>(
    projectAssignments
      .map((pa: any) => pa?.projectId)
      .filter((id): id is number => typeof id === "number"),
  );

  const connectedProjects = projects.filter(
    (p) => p?.id && connectedProjectIds.has(p.id),
  );

  // FIX 18: Reset modal state helper
  const resetNewConversationState = useCallback(() => {
    setShowNewConversation(false);
    setNewConversationType(null);
    setSelectedOrg(null);
    setSelectedProject(null);
    setNewConversationTopic("");
  }, []);

  // FIX 19: Handle keyboard events for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  // FIX 20: Show loading state while checking authentication
  if (!userId) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 pb-20 max-w-[428px] mx-auto">
      {/* PWA Header */}
      <PWAHeader />

      {/* Thread Header - shows when viewing a conversation */}
      {selectedThread && (
        <div className="sticky top-16 z-10 bg-white/95 backdrop-blur-sm text-slate-800 px-4 py-2 shadow-sm border-b border-slate-200">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-800 hover:bg-slate-100 -ml-2"
              onClick={() => setSelectedThread(null)}
              aria-label="Back to conversations"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedThread.organizationName || "Organization"}
              </p>
              <p className="text-xs text-slate-600 truncate">
                {selectedThread.topic || "Conversation"}
              </p>
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
            aria-label="Start new conversation"
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
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-2 max-w-[80%] ${isOwnMessage ? "flex-row-reverse" : ""}`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage
                              src={msg.senderAvatar}
                              alt={msg.senderName || "Sender"}
                            />
                            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-blue-500 text-white"
                              : "bg-white text-slate-800 border border-slate-200"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <p
                            className={`text-[10px] mt-1 ${isOwnMessage ? "text-blue-100" : "text-slate-400"}`}
                          >
                            {msg.createdAt
                              ? formatDistanceToNow(new Date(msg.createdAt), {
                                  addSuffix: true,
                                })
                              : ""}
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
                aria-label="Message input"
              />
              <Button
                onClick={handleSendMessage}
                disabled={
                  !messageContent.trim() || sendMessageMutation.isPending
                }
                className="bg-blue-500 hover:bg-blue-600"
                aria-label="Send message"
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
              aria-label="Search conversations"
            />
          </div>

          {/* Quick Connect Section */}
          {(connectedOrganizations.length > 0 ||
            connectedProjects.length > 0) && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Quick Connect
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {connectedOrganizations.slice(0, 3).map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrg(org);
                      setNewConversationType("organization");
                      setShowNewConversation(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-slate-200 hover:border-blue-300 transition-colors"
                    aria-label={`Start conversation with ${org.name}`}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={org.logo} alt={org.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        <Building2 className="w-3 h-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                      {org.name}
                    </span>
                  </button>
                ))}
                {connectedProjects.slice(0, 2).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setNewConversationType("project");
                      setShowNewConversation(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-slate-200 hover:border-emerald-300 transition-colors"
                    aria-label={`Start conversation about ${project.name}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <FolderOpen className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                      {project.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Conversations
          </h3>

          {loadingThreads ? (
            <div className="text-center text-slate-500 py-8">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading conversations...</p>
            </div>
          ) : threadsError ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-red-300" />
              <p className="text-slate-600 font-medium">
                Failed to load conversations
              </p>
              <Button
                onClick={() => refetchThreads()}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">
                {searchTerm
                  ? "No matching conversations"
                  : "No conversations yet"}
              </p>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                {searchTerm
                  ? "Try a different search term"
                  : "Start a conversation with an organization or project"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowNewConversation(true)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
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
                  className="w-full bg-white rounded-xl p-3 border border-slate-200 hover:border-blue-300 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Open conversation with ${thread.organizationName}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage
                        src={thread.organizationLogo}
                        alt={thread.organizationName}
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-800 truncate">
                          {thread.organizationName || "Organization"}
                        </p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                          {thread.lastMessageAt
                            ? formatDistanceToNow(
                                new Date(thread.lastMessageAt),
                                { addSuffix: true },
                              )
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">
                        {thread.topic || "Conversation"}
                      </p>
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

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetNewConversationState();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-conversation-title"
        >
          <div className="bg-white rounded-t-2xl w-full max-w-[428px] mx-auto max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2
                id="new-conversation-title"
                className="text-lg font-semibold text-slate-800"
              >
                New Conversation
              </h2>
              <button
                onClick={resetNewConversationState}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {!newConversationType ? (
                /* Step 1: Choose type */
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-4">
                    Who would you like to message?
                  </p>

                  <button
                    onClick={() => setNewConversationType("organization")}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-slate-800">
                        Organization
                      </p>
                      <p className="text-sm text-slate-500">
                        Message an organization directly
                      </p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-400 rotate-180" />
                  </button>

                  <button
                    onClick={() => setNewConversationType("project")}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-slate-800">Project</p>
                      <p className="text-sm text-slate-500">
                        Message about a specific project
                      </p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-400 rotate-180" />
                  </button>
                </div>
              ) : newConversationType === "organization" && !selectedOrg ? (
                /* Step 2a: Choose organization */
                <div className="space-y-3">
                  <button
                    onClick={() => setNewConversationType(null)}
                    className="flex items-center gap-1 text-sm text-blue-600 mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <p className="text-sm text-slate-600 mb-3">
                    Select an organization
                  </p>

                  {connectedOrganizations.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                        Your Organizations
                      </p>
                      {connectedOrganizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => setSelectedOrg(org)}
                          className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-100 mb-2 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={org.logo} alt={org.name} />
                            <AvatarFallback className="bg-blue-200 text-blue-700">
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-800">
                            {org.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    All Organizations
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {organizations
                      .filter((org) => !connectedOrgIds.has(org.id))
                      .map((org) => (
                        <button
                          key={org.id}
                          onClick={() => setSelectedOrg(org)}
                          className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={org.logo} alt={org.name} />
                            <AvatarFallback className="bg-slate-200 text-slate-600">
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-700">
                            {org.name}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ) : newConversationType === "project" && !selectedProject ? (
                /* Step 2b: Choose project */
                <div className="space-y-3">
                  <button
                    onClick={() => setNewConversationType(null)}
                    className="flex items-center gap-1 text-sm text-blue-600 mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <p className="text-sm text-slate-600 mb-3">
                    Select a project
                  </p>

                  {connectedProjects.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                        Your Projects
                      </p>
                      {connectedProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProject(project)}
                          className="w-full flex items-center gap-3 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 border border-emerald-100 mb-2 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center">
                            <FolderOpen className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-slate-800">
                              {project.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {project.organizationName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    All Projects
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {projects
                      .filter((p) => !connectedProjectIds.has(p.id))
                      .slice(0, 10)
                      .map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProject(project)}
                          className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                            <FolderOpen className="w-4 h-4 text-slate-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-slate-700">
                              {project.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {project.organizationName}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                /* Step 3: Write message */
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      if (newConversationType === "organization")
                        setSelectedOrg(null);
                      else setSelectedProject(null);
                    }}
                    className="flex items-center gap-1 text-sm text-blue-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  {/* Selected recipient */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    {newConversationType === "organization" && selectedOrg && (
                      <>
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={selectedOrg.logo}
                            alt={selectedOrg.name}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            <Building2 className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {selectedOrg.name}
                          </p>
                          <p className="text-xs text-slate-500">Organization</p>
                        </div>
                      </>
                    )}
                    {newConversationType === "project" && selectedProject && (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <FolderOpen className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {selectedProject.name}
                          </p>
                          <p className="text-xs text-slate-500">Project</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="new-message-input"
                      className="text-sm font-medium text-slate-700 mb-2 block"
                    >
                      Your message
                    </label>
                    <textarea
                      id="new-message-input"
                      value={newConversationTopic}
                      onChange={(e) => setNewConversationTopic(e.target.value)}
                      placeholder="Hi! I'd like to connect about..."
                      className="w-full min-h-[120px] p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={createThreadMutation.isPending}
                    />
                  </div>

                  <Button
                    onClick={handleStartNewConversation}
                    disabled={
                      !newConversationTopic.trim() ||
                      createThreadMutation.isPending
                    }
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    {createThreadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <VolunteerPWANav userId={userId} activeTab="home" />
    </div>
  );
}
