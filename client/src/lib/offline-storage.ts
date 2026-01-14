const DB_NAME = 'synerxus-offline';
const DB_VERSION = 1;
const STORES = {
  activities: 'pendingActivities',
  impacts: 'pendingImpacts',
  syncQueue: 'syncQueue',
  cachedData: 'cachedData'
};

interface PendingActivity {
  id: string;
  userId: number;
  projectId: number;
  taskId?: number;
  hours: number;
  date: string;
  description: string;
  skillsApplied?: string[];
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
}

interface PendingImpact {
  id: string;
  userId: number;
  projectId: number;
  taskId?: number;
  metricId: number;
  value: number;
  date: string;
  notes?: string;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
}

interface SyncQueueItem {
  id: string;
  type: 'activity' | 'impact';
  data: PendingActivity | PendingImpact;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open offline database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.activities)) {
        const activityStore = db.createObjectStore(STORES.activities, { keyPath: 'id' });
        activityStore.createIndex('userId', 'userId', { unique: false });
        activityStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        activityStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.impacts)) {
        const impactStore = db.createObjectStore(STORES.impacts, { keyPath: 'id' });
        impactStore.createIndex('userId', 'userId', { unique: false });
        impactStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        impactStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const syncStore = db.createObjectStore(STORES.syncQueue, { keyPath: 'id' });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.cachedData)) {
        db.createObjectStore(STORES.cachedData, { keyPath: 'key' });
      }
    };
  });
}

function generateId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function saveActivityOffline(activity: Omit<PendingActivity, 'id' | 'createdAt' | 'syncStatus' | 'retryCount'>): Promise<PendingActivity> {
  const db = await openDatabase();
  const pendingActivity: PendingActivity = {
    ...activity,
    id: generateId(),
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    retryCount: 0
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.activities, STORES.syncQueue], 'readwrite');
    const activityStore = transaction.objectStore(STORES.activities);
    const syncStore = transaction.objectStore(STORES.syncQueue);

    const activityRequest = activityStore.add(pendingActivity);
    
    activityRequest.onsuccess = () => {
      const syncItem: SyncQueueItem = {
        id: pendingActivity.id,
        type: 'activity',
        data: pendingActivity,
        createdAt: pendingActivity.createdAt,
        syncStatus: 'pending',
        retryCount: 0
      };
      syncStore.add(syncItem);
    };

    transaction.oncomplete = () => {
      console.log('[OfflineStorage] Activity saved offline:', pendingActivity.id);
      resolve(pendingActivity);
    };

    transaction.onerror = () => {
      console.error('[OfflineStorage] Failed to save activity:', transaction.error);
      reject(transaction.error);
    };
  });
}

export async function saveImpactOffline(impact: Omit<PendingImpact, 'id' | 'createdAt' | 'syncStatus' | 'retryCount'>): Promise<PendingImpact> {
  const db = await openDatabase();
  const pendingImpact: PendingImpact = {
    ...impact,
    id: generateId(),
    createdAt: new Date().toISOString(),
    syncStatus: 'pending',
    retryCount: 0
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.impacts, STORES.syncQueue], 'readwrite');
    const impactStore = transaction.objectStore(STORES.impacts);
    const syncStore = transaction.objectStore(STORES.syncQueue);

    const impactRequest = impactStore.add(pendingImpact);
    
    impactRequest.onsuccess = () => {
      const syncItem: SyncQueueItem = {
        id: pendingImpact.id,
        type: 'impact',
        data: pendingImpact,
        createdAt: pendingImpact.createdAt,
        syncStatus: 'pending',
        retryCount: 0
      };
      syncStore.add(syncItem);
    };

    transaction.oncomplete = () => {
      console.log('[OfflineStorage] Impact saved offline:', pendingImpact.id);
      resolve(pendingImpact);
    };

    transaction.onerror = () => {
      console.error('[OfflineStorage] Failed to save impact:', transaction.error);
      reject(transaction.error);
    };
  });
}

export async function getPendingActivities(userId?: number): Promise<PendingActivity[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.activities], 'readonly');
    const store = transaction.objectStore(STORES.activities);
    
    let request: IDBRequest;
    if (userId) {
      const index = store.index('userId');
      request = index.getAll(userId);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const activities = request.result as PendingActivity[];
      resolve(activities.filter(a => a.syncStatus === 'pending' || a.syncStatus === 'failed'));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getPendingImpacts(userId?: number): Promise<PendingImpact[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.impacts], 'readonly');
    const store = transaction.objectStore(STORES.impacts);
    
    let request: IDBRequest;
    if (userId) {
      const index = store.index('userId');
      request = index.getAll(userId);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const impacts = request.result as PendingImpact[];
      resolve(impacts.filter(i => i.syncStatus === 'pending' || i.syncStatus === 'failed'));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getPendingSyncCount(): Promise<number> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.syncQueue], 'readonly');
    const store = transaction.objectStore(STORES.syncQueue);
    const index = store.index('syncStatus');
    const request = index.count('pending');

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.syncQueue], 'readonly');
    const store = transaction.objectStore(STORES.syncQueue);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');

    request.onsuccess = () => {
      resolve(request.result as SyncQueueItem[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function updateSyncStatus(id: string, type: 'activity' | 'impact', status: 'pending' | 'syncing' | 'failed', error?: string): Promise<void> {
  const db = await openDatabase();
  const storeName = type === 'activity' ? STORES.activities : STORES.impacts;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName, STORES.syncQueue], 'readwrite');
    const store = transaction.objectStore(storeName);
    const syncStore = transaction.objectStore(STORES.syncQueue);

    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.syncStatus = status;
        if (error) {
          item.lastError = error;
          item.retryCount = (item.retryCount || 0) + 1;
        }
        store.put(item);
      }

      const getSyncRequest = syncStore.get(id);
      getSyncRequest.onsuccess = () => {
        const syncItem = getSyncRequest.result;
        if (syncItem) {
          syncItem.syncStatus = status;
          if (error) {
            syncItem.retryCount = (syncItem.retryCount || 0) + 1;
          }
          syncStore.put(syncItem);
        }
      };
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function removeSyncedItem(id: string, type: 'activity' | 'impact'): Promise<void> {
  const db = await openDatabase();
  const storeName = type === 'activity' ? STORES.activities : STORES.impacts;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName, STORES.syncQueue], 'readwrite');
    const store = transaction.objectStore(storeName);
    const syncStore = transaction.objectStore(STORES.syncQueue);

    store.delete(id);
    syncStore.delete(id);

    transaction.oncomplete = () => {
      console.log('[OfflineStorage] Removed synced item:', id);
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function cacheData(key: string, data: any): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.cachedData], 'readwrite');
    const store = transaction.objectStore(STORES.cachedData);
    
    store.put({ key, data, cachedAt: new Date().toISOString() });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.cachedData], 'readonly');
    const store = transaction.objectStore(STORES.cachedData);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result?.data || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function clearAllPendingData(): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.activities, STORES.impacts, STORES.syncQueue], 'readwrite');
    
    transaction.objectStore(STORES.activities).clear();
    transaction.objectStore(STORES.impacts).clear();
    transaction.objectStore(STORES.syncQueue).clear();

    transaction.oncomplete = () => {
      console.log('[OfflineStorage] Cleared all pending data');
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export type { PendingActivity, PendingImpact, SyncQueueItem };
