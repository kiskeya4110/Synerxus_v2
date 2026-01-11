import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  relatedEntityType?: string;
  relatedEntityId?: number;
  createdAt: string;
}

/**
 * Hook to show a celebratory toast when a user earns a new badge.
 * Watches for badge_earned notifications and displays a celebration.
 */
export function useBadgeCelebration(userId: number | null | undefined) {
  const { toast } = useToast();
  const seenBadgeNotifications = useRef<Set<number>>(new Set());
  const initialLoadComplete = useRef(false);

  // Fetch notifications frequently to catch new badges
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/notifications?userId=${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 10000, // Check every 10 seconds for new badge notifications
  });

  useEffect(() => {
    if (!userId || notifications.length === 0) return;

    // Filter for badge_earned notifications
    const badgeNotifications = notifications.filter(
      (n) => n.type === "badge_earned"
    );

    // On initial load, just mark existing notifications as seen (don't toast)
    if (!initialLoadComplete.current) {
      badgeNotifications.forEach((n) => {
        seenBadgeNotifications.current.add(n.id);
      });
      initialLoadComplete.current = true;
      return;
    }

    // Check for new badge notifications we haven't seen yet
    badgeNotifications.forEach((notification) => {
      if (!seenBadgeNotifications.current.has(notification.id)) {
        seenBadgeNotifications.current.add(notification.id);

        // Show celebration toast for newly earned badge
        toast({
          title: notification.title,
          description: notification.message,
          variant: "default",
          duration: 8000, // Show for 8 seconds
        });
      }
    });
  }, [notifications, userId, toast]);

  return null;
}
