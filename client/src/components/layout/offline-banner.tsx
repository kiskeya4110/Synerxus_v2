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
        className="bg-green-100 border-b border-green-500 px-4 py-2 flex items-center justify-center gap-2 text-[13px] text-green-800"
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
        className="bg-amber-100 border-b border-amber-500 px-4 py-2.5 flex items-center justify-center gap-3 text-[13px] text-amber-800 flex-wrap"
        data-testid="offline-banner"
      >
        <div className="flex items-center gap-2">
          <WifiOff size={16} />
          <span>
            <strong>Offline Mode:</strong> Activities will be saved locally.
          </span>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
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
        className="bg-blue-100 border-b border-blue-500 px-4 py-2.5 flex items-center justify-center gap-3 text-[13px] text-blue-800 flex-wrap"
        data-testid="pending-sync-banner"
      >
        <div className="flex items-center gap-2">
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
          className="h-7 text-xs bg-white border-blue-500 text-blue-800 hover:bg-blue-50"
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
          <span className="text-[11px] opacity-80">
            Last sync: {lastSyncAt.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  }

  return null;
}
