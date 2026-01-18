import { useState, useEffect } from "react";
import { WifiOff, CloudOff, RefreshCw, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineBannerProps {
  isOnline?: boolean;
  isSyncing?: boolean;
  pendingCount?: number;
  lastSyncAt?: Date | null;
  onSyncNow?: () => void;
}

export default function OfflineBanner({
  isOnline = true,
  isSyncing = false,
  pendingCount = 0,
  lastSyncAt = null,
  onSyncNow = () => {}
}: OfflineBannerProps) {
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [prevPendingCount, setPrevPendingCount] = useState(pendingCount);

  useEffect(() => {
    if (prevPendingCount > 0 && pendingCount === 0 && isOnline) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => setShowSyncSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevPendingCount(pendingCount);
  }, [pendingCount, prevPendingCount, isOnline]);

  if (isOnline && pendingCount === 0 && !showSyncSuccess) {
    return null;
  }

  if (showSyncSuccess) {
    return (
      <div
        style={{
          backgroundColor: '#dcfce7',
          borderBottom: '1px solid #22c55e',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#166534',
        }}
        data-testid="sync-success-banner"
      >
        <Check size={16} />
        <span>All activities synced successfully!</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        style={{
          backgroundColor: '#fef3c7',
          borderBottom: '1px solid #f59e0b',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#92400e',
          flexWrap: 'wrap',
        }}
        data-testid="offline-banner"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <WifiOff size={16} />
          <span>
            <strong>Offline Mode:</strong> Activities will be saved locally.
          </span>
        </div>
        {pendingCount > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            backgroundColor: '#fbbf24',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            <Clock size={12} />
            <span>{pendingCount} pending</span>
          </div>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        style={{
          backgroundColor: '#dbeafe',
          borderBottom: '1px solid #3b82f6',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#1e40af',
          flexWrap: 'wrap',
        }}
        data-testid="pending-sync-banner"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CloudOff size={16} />
          <span>
            <strong>{pendingCount}</strong> {pendingCount === 1 ? 'activity' : 'activities'} pending sync
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onSyncNow}
          disabled={isSyncing}
          style={{
            height: '28px',
            fontSize: '12px',
            backgroundColor: 'white',
            borderColor: '#3b82f6',
            color: '#1e40af',
          }}
        >
          {isSyncing ? (
            <>
              <RefreshCw size={14} className="mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw size={14} className="mr-1" />
              Sync Now
            </>
          )}
        </Button>
        {lastSyncAt && (
          <span style={{ fontSize: '11px', opacity: 0.8 }}>
            Last sync: {lastSyncAt.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  }

  return null;
}
