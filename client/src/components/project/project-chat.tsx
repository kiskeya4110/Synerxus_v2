import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, X, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ProjectChatProps {
  projectId: number;
  projectName: string;
  organizationId: number;
  organizationName?: string;
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

interface Thread {
  id: number;
  organizationId: number;
  volunteerId: number;
  topic: string;
  projectId: number | null;
  status: string;
  lastMessageAt: string;
}

export default function ProjectChat({ projectId, projectName, organizationId, organizationName }: ProjectChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const userId = localStorage.getItem('currentUserId');
  const volunteerId = userId ? parseInt(userId) : 0;

  // Find or create thread for this project
  const { data: threads = [], isLoading: loadingThreads } = useQuery<Thread[]>({
    queryKey: ['/api/conversation-threads/volunteer', volunteerId],
    queryFn: async () => {
      if (!volunteerId) return [];
      const response = await fetch(`/api/conversation-threads/volunteer/${volunteerId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isOpen && !!volunteerId
  });

  // Find existing thread for this project
  const projectThread = threads.find(t => t.projectId === projectId);

  // Get messages if thread exists
  const { data: threadData, isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/conversation-threads', projectThread?.id, 'messages', volunteerId],
    queryFn: async () => {
      if (!projectThread || !volunteerId) return { thread: null, messages: [] };
      const response = await fetch(`/api/conversation-threads/${projectThread.id}/messages?userId=${volunteerId}`);
      if (!response.ok) return { thread: null, messages: [] };
      return response.json();
    },
    enabled: isOpen && !!projectThread && !!volunteerId,
    refetchInterval: isOpen ? 5000 : false // Poll every 5 seconds when open
  });

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async (initialMessage: string) => {
      return apiRequest('POST', '/api/conversation-threads', {
        organizationId,
        volunteerId,
        topic: `Project: ${projectName}`,
        projectId,
        initialMessage
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversation-threads/volunteer', volunteerId] });
      setMessageContent("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive"
      });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: number; content: string }) => {
      return apiRequest('POST', `/api/conversation-threads/${threadId}/messages`, {
        senderId: volunteerId,
        content,
        messageType: 'text'
      });
    },
    onSuccess: () => {
      setMessageContent("");
      refetchMessages();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadData?.messages]);

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;

    if (projectThread) {
      // Existing thread - send message
      sendMessageMutation.mutate({ threadId: projectThread.id, content: messageContent });
    } else {
      // No thread yet - create one with initial message
      createThreadMutation.mutate(messageContent);
    }
  };

  const messages: Message[] = threadData?.messages || [];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 bg-gradient-to-r from-blue-500 to-teal-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        data-testid="chat-fab"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-24 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transition-all ${
        isMinimized ? 'h-12' : 'h-96'
      }`}
    >
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm truncate max-w-[140px]">{projectName}</p>
            <p className="text-[10px] text-white/80">{organizationName || 'Organization'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="hover:bg-white/20 rounded p-1">
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="hover:bg-white/20 rounded p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <ScrollArea className="h-[calc(100%-112px)] p-3">
            {loadingThreads || loadingMessages ? (
              <div className="text-center text-gray-500 py-4 text-sm">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">Start a conversation</p>
                <p className="text-xs mt-1">Ask questions about this project</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwnMessage = msg.senderId === volunteerId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        {!isOwnMessage && (
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarImage src={msg.senderAvatar} />
                            <AvatarFallback className="text-[10px] bg-slate-100">
                              {(msg.senderName || 'O')[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`rounded-xl px-3 py-2 ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-slate-500'}`}>
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
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <Input
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-sm h-9"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                data-testid="chat-input"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendMessageMutation.isPending || createThreadMutation.isPending}
                size="sm"
                className="h-9 px-3 bg-blue-500 hover:bg-blue-600"
                data-testid="chat-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
