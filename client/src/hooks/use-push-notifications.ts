import { useEffect, useCallback, useState } from "react";
import { useWebSocket, type WebSocketMessage } from "./use-websocket";
import { useToast } from "./use-toast";
import { queryClient } from "@/lib/queryClient";

export type NotificationType = 
  | "task_assignment"
  | "project_update"
  | "project_assignment"
  | "application_status"
  | "message"
  | "badge_earned"
  | "critical_update";

export interface PushNotification {
  id?: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  sdgGoals?: number[];
  timestamp?: string;
}

interface UsePushNotificationsOptions {
  userId?: number | null;
  enabled?: boolean;
  showToasts?: boolean;
}

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const { userId, enabled = true, showToasts = true } = options;
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNotification = useCallback((notification: PushNotification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);

    if (showToasts) {
      const variant = notification.type === "critical_update" ? "destructive" : "default";
      toast({
        title: notification.title,
        description: notification.message,
        variant,
      });
    }

    // Invalidate with userId to properly target the correct cache entry
    // Use both with and without userId to ensure all related queries are refreshed
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", String(userId)] });
    }
    // Also invalidate the base key for any queries that might not include userId
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"], exact: false });

    if (notification.type === "task_assignment") {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    }
    if (notification.type === "project_update" || notification.type === "project_assignment") {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
    if (notification.type === "application_status") {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    }
  }, [showToasts, toast, userId]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === "notification" && message.data) {
      const notification = message.data as PushNotification & { userId?: number; targetUserId?: number };
      
      const isForCurrentUser = !userId || 
        notification.userId === userId || 
        notification.targetUserId === userId ||
        (!notification.userId && !notification.targetUserId);
      
      if (isForCurrentUser) {
        handleNotification(notification);
      }
    }

    if (message.type === "task_assigned" && message.data) {
      const taskData = message.data;
      if (userId && taskData.assigneeId === userId) {
        handleNotification({
          type: "task_assignment",
          title: "New Task Assigned",
          message: `You have been assigned: "${taskData.title}"`,
          relatedEntityType: "task",
          relatedEntityId: taskData.id,
        });
      }
    }

    if (message.type === "critical_update" && message.data) {
      handleNotification({
        type: "critical_update",
        title: "Critical Update",
        message: message.data.message || "Important system update",
      });
    }
  }, [userId, handleNotification]);

  const { isConnected, addMessageHandler } = useWebSocket({
    onMessage: enabled ? handleWebSocketMessage : undefined,
  });

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = addMessageHandler(handleWebSocketMessage);
    return () => {
      unsubscribe();
    };
  }, [enabled, addMessageHandler, handleWebSocketMessage]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    isConnected,
    notifications,
    unreadCount,
    clearNotifications,
    markAsRead,
  };
}
