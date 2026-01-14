import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getSyncQueue,
  getPendingSyncCount,
  updateSyncStatus,
  removeSyncedItem,
  getPendingActivities,
  getPendingImpacts,
  cacheData,
  getCachedData,
  type SyncQueueItem,
  type PendingActivity,
  type PendingImpact
} from '@/lib/offline-storage';

interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  syncError: string | null;
}

export function useOfflineSync(userId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    syncError: null
  });

  // Track effective online status based on connection quality if available
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const checkConnection = () => {
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      let isEffectivelyOnline = nav.onLine;
      
      // If we have Network Information API, consider "online" but "slow" as offline for logging
      if (isEffectivelyOnline && connection) {
        // downlink < 0.5 Mbps or effectiveType '2g'/'slow-2g' is "weak"
        const isWeak = connection.downlink < 0.5 || ['slow-2g', '2g'].includes(connection.effectiveType);
        if (isWeak) {
          console.log('[OfflineSync] Connection detected as weak, enabling offline mode behavior');
          // We don't force isOnline to false here to allow sync attempts, 
          // but components can use this logic to decide whether to use offline storage
        }
      }
      
      setState(prev => ({ ...prev, isOnline: isEffectivelyOnline }));
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', checkConnection);
    }

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', checkConnection);
      }
    };
  }, []);

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setState(prev => ({ ...prev, pendingCount: count }));
    } catch (err) {
      console.error('[OfflineSync] Failed to get pending count:', err);
    }
  }, []);

  const syncActivity = async (activity: PendingActivity): Promise<boolean> => {
    try {
      const response = await fetch('/api/volunteer-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activity.userId,
          projectId: activity.projectId,
          taskId: activity.taskId || null,
          hours: activity.hours,
          date: activity.date,
          description: activity.description,
          skillsApplied: activity.skillsApplied || [],
          offlineId: activity.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync activity');
      }

      return true;
    } catch (err) {
      console.error('[OfflineSync] Activity sync failed:', err);
      throw err;
    }
  };

  const syncImpact = async (impact: PendingImpact): Promise<boolean> => {
    try {
      const response = await fetch('/api/project-impacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: impact.projectId,
          taskId: impact.taskId || null,
          metricId: impact.metricId,
          userId: impact.userId,
          value: impact.value,
          date: impact.date,
          notes: impact.notes || '',
          offlineId: impact.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync impact');
      }

      return true;
    } catch (err) {
      console.error('[OfflineSync] Impact sync failed:', err);
      throw err;
    }
  };

  const syncAll = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (isSyncingRef.current || !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    isSyncingRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true, syncError: null }));

    let synced = 0;
    let failed = 0;

    try {
      const queue = await getSyncQueue();
      console.log(`[OfflineSync] Starting sync of ${queue.length} items`);

      for (const item of queue) {
        if (item.retryCount >= 5) {
          console.log(`[OfflineSync] Skipping item ${item.id} - too many retries`);
          continue;
        }

        try {
          await updateSyncStatus(item.id, item.type, 'syncing');

          if (item.type === 'activity') {
            await syncActivity(item.data as PendingActivity);
          } else {
            await syncImpact(item.data as PendingImpact);
          }

          await removeSyncedItem(item.id, item.type);
          synced++;
          console.log(`[OfflineSync] Successfully synced ${item.type}:`, item.id);
        } catch (err: any) {
          failed++;
          await updateSyncStatus(item.id, item.type, 'failed', err.message);
          console.error(`[OfflineSync] Failed to sync ${item.type}:`, item.id, err);
        }
      }

      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/volunteer-activities'] });
        queryClient.invalidateQueries({ queryKey: ['/api/project-impacts'] });
        
        toast({
          title: 'Sync Complete',
          description: `${synced} ${synced === 1 ? 'item' : 'items'} synced successfully${failed > 0 ? `, ${failed} failed` : ''}`,
          variant: synced > 0 && failed === 0 ? 'default' : 'destructive'
        });
      }

      setState(prev => ({
        ...prev,
        lastSyncAt: new Date(),
        syncError: failed > 0 ? `${failed} items failed to sync` : null
      }));

    } catch (err: any) {
      console.error('[OfflineSync] Sync failed:', err);
      setState(prev => ({ ...prev, syncError: err.message }));
    } finally {
      isSyncingRef.current = false;
      setState(prev => ({ ...prev, isSyncing: false }));
      await updatePendingCount();
    }

    return { synced, failed };
  }, [queryClient, toast, updatePendingCount]);

  const cacheProjectsAndTasks = useCallback(async () => {
    if (!userId || !navigator.onLine) return;

    try {
      const [projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/projects?userId=${userId}`),
        fetch('/api/tasks')
      ]);

      if (projectsRes.ok) {
        const projects = await projectsRes.json();
        await cacheData(`projects_${userId}`, projects);
      }

      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        await cacheData('tasks', tasks);
      }

      console.log('[OfflineSync] Cached projects and tasks for offline use');
    } catch (err) {
      console.error('[OfflineSync] Failed to cache data:', err);
    }
  }, [userId]);

  const getCachedProjects = useCallback(async () => {
    if (!userId) return null;
    return getCachedData<any[]>(`projects_${userId}`);
  }, [userId]);

  const getCachedTasks = useCallback(async () => {
    return getCachedData<any[]>('tasks');
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Connection restored');
      setState(prev => ({ ...prev, isOnline: true }));
      
      toast({
        title: 'Back Online',
        description: 'Connection restored. Syncing pending data...',
      });
      
      setTimeout(() => syncAll(), 1000);
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Connection lost');
      setState(prev => ({ ...prev, isOnline: false }));
      
      toast({
        title: 'Offline Mode',
        description: 'Your activities will be saved locally and synced when online.',
        variant: 'destructive'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updatePendingCount();

    if (navigator.onLine) {
      cacheProjectsAndTasks();
    }

    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        syncAll();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncAll, updatePendingCount, toast, cacheProjectsAndTasks]);

  useEffect(() => {
    if (state.isOnline && state.pendingCount > 0 && !state.isSyncing) {
      const timer = setTimeout(() => syncAll(), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.isOnline, state.pendingCount, state.isSyncing, syncAll]);

  return {
    ...state,
    syncAll,
    updatePendingCount,
    getCachedProjects,
    getCachedTasks,
    cacheProjectsAndTasks,
    getPendingActivities: () => getPendingActivities(userId),
    getPendingImpacts: () => getPendingImpacts(userId)
  };
}
