import { useState, useEffect, useRef } from "react";
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
  MessageSquare, Send, Search, Building2,
  ChevronLeft, FolderOpen, Home, Briefcase, BarChart3, User, Plus, X
} from "lucide-react";
import PWAHeader from "@/components/pwa/pwa-header";
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
  const userType = localStorage.getItem('userType');
  const userId = localStorage.getItem('currentUserId');

  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationType, setNewConversationType] = useState<'organization' | 'project' | null>(null);
  const [newConversationTopic, setNewConversationTopic] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userType !== 'volunteer') {
      navigate('/organization-dashboard');
    }
  }, [userType, navigate]);

  // Fetch conversation threads
  const { data: threads = [], isLoading: loadingThreads, refetch: refetchThreads } = useQuery<ConversationThread[]>({
    queryKey: ['/api/conversation-threads/volunteer', userId],
    queryFn: async () => {
      const response = await fetch(`/api/conversation-threads/volunteer/${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch user's project assignments to get connected projects
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ['/api/project-assignments', userId],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userId
  });

  // Fetch user's applications to get connected organizations
  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ['/api/applications', userId],
    queryFn: async () => {
      const response = await fetch(`/api/applications?volunteerId=${userId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!userId
  });

  // Fetch all organizations for new conversation
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    queryFn: async () => {
      const response = await fetch('/api/organizations');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch all projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Get messages for selected thread
  const { data: threadMessages, isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/conversation-threads', selectedThread?.id, 'messages', userId],
    queryFn: async () => {
      if (!selectedThread || !userId) return { thread: null, messages: [] };
      const response = await fetch(`/api/conversation-threads/${selectedThread.id}/messages?userId=${userId}`);
      if (!response.ok) return { thread: null, messages: [] };
      return response.json();
    },
    enabled: !!selectedThread && !!userId,
    refetchInterval: selectedThread ? 5000 : false
  });

  // Create new conversation thread
  const createThreadMutation = useMutation({
    mutationFn: async ({ organizationId, topic, projectId, initialMessage }: { organizationId: number; topic: string; projectId?: number; initialMessage: string }) => {
      return apiRequest('POST', '/api/conversation-threads', {
        organizationId,
        volunteerId: parseInt(userId || '0'),
        topic,
        projectId: projectId || null,
        initialMessage
      });
    },
    onSuccess: (data) => {
      setShowNewConversation(false);
      setNewConversationType(null);
      setNewConversationTopic("");
      setSelectedOrg(null);
      setSelectedProject(null);
      refetchThreads();
      toast({ title: "Conversation started", description: "Your message has been sent." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive"
      });
    }
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: number; content: string }) => {
      return apiRequest('POST', `/api/conversation-threads/${threadId}/messages`, {
        senderId: parseInt(userId || '0'),
        content,
        messageType: 'text'
      });
    },
    onSuccess: () => {
      setMessageContent("");
      refetchMessages();
      refetchThreads();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages?.messages]);

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedThread) return;
    sendMessageMutation.mutate({ threadId: selectedThread.id, content: messageContent });
  };

  const handleStartNewConversation = () => {
    if (!newConversationTopic.trim()) {
      toast({ title: "Error", description: "Please enter a message", variant: "destructive" });
      return;
    }

    if (newConversationType === 'organization' && selectedOrg) {
      createThreadMutation.mutate({
        organizationId: selectedOrg.id,
        topic: `General Inquiry`,
        initialMessage: newConversationTopic
      });
    } else if (newConversationType === 'project' && selectedProject) {
      createThreadMutation.mutate({
        organizationId: selectedProject.organizationId,
        topic: `Project: ${selectedProject.name}`,
        projectId: selectedProject.id,
        initialMessage: newConversationTopic
      });
    }
  };

  const filteredThreads = threads.filter(thread =>
    thread.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    thread.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get connected organizations (from applications and assignments)
  const connectedOrgIds = new Set([
    ...applications.map((a: any) => a.project?.organizationId).filter(Boolean),
    ...projectAssignments.map((pa: any) => pa.project?.organizationId).filter(Boolean)
  ]);
  const connectedOrganizations = organizations.filter(org => connectedOrgIds.has(org.id));

  // Get connected projects (from assignments)
  const connectedProjectIds = new Set(projectAssignments.map((pa: any) => pa.projectId));
  const connectedProjects = projects.filter(p => connectedProjectIds.has(p.id));

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
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center">
              <p className="font-semibold text-sm truncate">{selectedThread.organizationName}</p>
              <p className="text-xs text-slate-600 truncate">{selectedThread.topic}</p>
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
              <div className="text-center text-slate-500 py-4">Loading messages...</div>
            ) : (threadMessages?.messages || []).length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(threadMessages?.messages || []).map((msg: Message) => {
                  const isOwnMessage = msg.senderId === parseInt(userId || '0');
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={msg.senderAvatar} />
                            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-slate-800 border border-slate-200'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-slate-400'}`}>
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
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
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendMessageMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Send className="h-4 w-4" />
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

          {/* Quick Connect Section */}
          {(connectedOrganizations.length > 0 || connectedProjects.length > 0) && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Connect</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {connectedOrganizations.slice(0, 3).map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrg(org);
                      setNewConversationType('organization');
                      setShowNewConversation(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-slate-200 hover:border-blue-300 transition-colors"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={org.logo} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        <Building2 className="w-3 h-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">{org.name}</span>
                  </button>
                ))}
                {connectedProjects.slice(0, 2).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setNewConversationType('project');
                      setShowNewConversation(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-full border border-slate-200 hover:border-emerald-300 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <FolderOpen className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">{project.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Conversations</h3>
          {loadingThreads ? (
            <div className="text-center text-slate-500 py-8">Loading...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">No conversations yet</p>
              <p className="text-sm text-slate-500 mt-1 mb-4">Start a conversation with an organization or project</p>
              <Button
                onClick={() => setShowNewConversation(true)}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className="w-full bg-white rounded-xl p-3 border border-slate-200 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={thread.organizationLogo} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-800 truncate">{thread.organizationName}</p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{thread.topic}</p>
                      {thread.projectName && (
                        <Badge variant="outline" className="mt-1.5 text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">
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
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-[428px] mx-auto max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">New Conversation</h2>
              <button
                onClick={() => {
                  setShowNewConversation(false);
                  setNewConversationType(null);
                  setSelectedOrg(null);
                  setSelectedProject(null);
                  setNewConversationTopic("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {!newConversationType ? (
                /* Step 1: Choose type */
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-4">Who would you like to message?</p>

                  <button
                    onClick={() => setNewConversationType('organization')}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-slate-800">Organization</p>
                      <p className="text-sm text-slate-500">Message an organization directly</p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-400 rotate-180" />
                  </button>

                  <button
                    onClick={() => setNewConversationType('project')}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-slate-800">Project</p>
                      <p className="text-sm text-slate-500">Message about a specific project</p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-400 rotate-180" />
                  </button>
                </div>
              ) : newConversationType === 'organization' && !selectedOrg ? (
                /* Step 2a: Choose organization */
                <div className="space-y-3">
                  <button
                    onClick={() => setNewConversationType(null)}
                    className="flex items-center gap-1 text-sm text-blue-600 mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <p className="text-sm text-slate-600 mb-3">Select an organization</p>

                  {connectedOrganizations.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Your Organizations</p>
                      {connectedOrganizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => setSelectedOrg(org)}
                          className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-100 mb-2 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={org.logo} />
                            <AvatarFallback className="bg-blue-200 text-blue-700">
                              <Building2 className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-800">{org.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">All Organizations</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {organizations.filter(org => !connectedOrgIds.has(org.id)).map((org) => (
                      <button
                        key={org.id}
                        onClick={() => setSelectedOrg(org)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={org.logo} />
                          <AvatarFallback className="bg-slate-200 text-slate-600">
                            <Building2 className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-700">{org.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : newConversationType === 'project' && !selectedProject ? (
                /* Step 2b: Choose project */
                <div className="space-y-3">
                  <button
                    onClick={() => setNewConversationType(null)}
                    className="flex items-center gap-1 text-sm text-blue-600 mb-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <p className="text-sm text-slate-600 mb-3">Select a project</p>

                  {connectedProjects.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Your Projects</p>
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
                            <p className="font-medium text-slate-800">{project.name}</p>
                            <p className="text-xs text-slate-500">{project.organizationName}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">All Projects</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {projects.filter(p => !connectedProjectIds.has(p.id)).slice(0, 10).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                          <FolderOpen className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-slate-700">{project.name}</p>
                          <p className="text-xs text-slate-500">{project.organizationName}</p>
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
                      if (newConversationType === 'organization') setSelectedOrg(null);
                      else setSelectedProject(null);
                    }}
                    className="flex items-center gap-1 text-sm text-blue-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  {/* Selected recipient */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    {newConversationType === 'organization' && selectedOrg && (
                      <>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedOrg.logo} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            <Building2 className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-800">{selectedOrg.name}</p>
                          <p className="text-xs text-slate-500">Organization</p>
                        </div>
                      </>
                    )}
                    {newConversationType === 'project' && selectedProject && (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <FolderOpen className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{selectedProject.name}</p>
                          <p className="text-xs text-slate-500">Project</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Your message</label>
                    <textarea
                      value={newConversationTopic}
                      onChange={(e) => setNewConversationTopic(e.target.value)}
                      placeholder="Hi! I'd like to connect about..."
                      className="w-full min-h-[120px] p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <Button
                    onClick={handleStartNewConversation}
                    disabled={!newConversationTopic.trim() || createThreadMutation.isPending}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    {createThreadMutation.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#16213e] border-t border-gray-700 px-2 py-2 max-w-[428px] mx-auto z-40">
        <div className="flex justify-around items-center">
          <button
            onClick={() => navigate('/volunteer-dashboard')}
            className="flex flex-col items-center py-1 px-3 rounded-lg text-gray-400 hover:text-gray-200"
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button
            onClick={() => navigate('/discover-opportunities/pwa')}
            className="flex flex-col items-center py-1 px-3 rounded-lg text-gray-400 hover:text-gray-200"
          >
            <Briefcase className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Projects</span>
          </button>
          <button
            className="flex flex-col items-center py-1 px-3 rounded-lg text-emerald-400"
          >
            <MessageSquare className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Messages</span>
          </button>
          <button
            onClick={() => navigate('/volunteer-dashboard')}
            className="flex flex-col items-center py-1 px-3 rounded-lg text-gray-400 hover:text-gray-200"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Impacts</span>
          </button>
          <button
            onClick={() => navigate('/volunteer-profile-settings')}
            className="flex flex-col items-center py-1 px-3 rounded-lg text-gray-400 hover:text-gray-200"
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
