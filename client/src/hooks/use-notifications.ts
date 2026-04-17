import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders, apiRequest } from "@/lib/queryClient";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedEntityId?: number | null;
  relatedEntityType?: string | null;
}

export function useNotifications(userId: number | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["/api/notifications", userId];

  const { data: notifications = [], refetch } = useQuery<Notification[]>({
    queryKey,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/notifications", { headers, credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const markAsReadMut = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest("POST", `/api/notifications/${notificationId}/read`).then(r => r.json()),
    onSuccess: invalidate,
  });

  const clearAllMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/notifications/clear-all?userId=${userId}`).then(r => r.json()),
    onSuccess: invalidate,
  });

  const deleteOneMut = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest("DELETE", `/api/notifications/${notificationId}`).then(r => r.json()),
    onSuccess: invalidate,
  });

  const deleteAllMut = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/notifications/delete-all?userId=${userId}`).then(r => r.json()),
    onSuccess: invalidate,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    refetch,
    markAsRead: markAsReadMut.mutate,
    markAsReadPending: markAsReadMut.isPending,
    clearAll: clearAllMut.mutate,
    clearAllPending: clearAllMut.isPending,
    deleteOne: deleteOneMut.mutate,
    deleteOnePending: deleteOneMut.isPending,
    deleteAll: deleteAllMut.mutate,
    deleteAllPending: deleteAllMut.isPending,
  };
}
