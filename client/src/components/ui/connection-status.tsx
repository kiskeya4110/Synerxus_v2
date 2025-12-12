/**
 * Connection Status Component
 *
 * Displays a banner when the backend/database is unavailable.
 * Shows retry countdown and allows manual retry.
 */

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  className?: string;
}

interface ServiceStatus {
  healthy: boolean;
  database?: boolean;
  message?: string;
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const [status, setStatus] = useState<ServiceStatus>({ healthy: true });
  const [checking, setChecking] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch('/health', {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          healthy: data.status === 'healthy',
          database: true,
          message: undefined,
        });
        setDismissed(false);
      } else {
        setStatus({
          healthy: false,
          database: false,
          message: 'Server is not responding correctly',
        });
      }
    } catch (error) {
      setStatus({
        healthy: false,
        database: false,
        message: 'Unable to connect to server',
      });
    } finally {
      setChecking(false);
    }
  }, []);

  // Check connection on mount and periodically when unhealthy
  useEffect(() => {
    checkConnection();

    // If unhealthy, check every 30 seconds
    const interval = setInterval(() => {
      if (!status.healthy) {
        checkConnection();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [status.healthy, checkConnection]);

  // Countdown timer for retry
  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryCountdown === 0 && !status.healthy) {
      // Auto-retry when countdown reaches 0
    }
  }, [retryCountdown, status.healthy]);

  const handleRetry = async () => {
    await checkConnection();
    if (!status.healthy) {
      setRetryCountdown(30);
    }
  };

  // Don't show if healthy or dismissed
  if (status.healthy || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 shadow-lg",
        "animate-in slide-in-from-top duration-300",
        className
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {checking ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-medium">
              Connection Issue
            </p>
            <p className="text-sm text-amber-100">
              {status.message || "The service is temporarily unavailable. Your data is safe."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {retryCountdown > 0 && (
            <span className="text-sm text-amber-100">
              Retry in {retryCountdown}s
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={checking}
            className="bg-white text-amber-600 hover:bg-amber-50"
          >
            {checking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Now
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-white hover:bg-amber-600"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Database Unavailable Alert
 *
 * A more prominent alert specifically for when the database is unavailable.
 * Used in critical flows like login/registration.
 */
interface DatabaseUnavailableAlertProps {
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

export function DatabaseUnavailableAlert({
  onRetry,
  retrying = false,
  className,
}: DatabaseUnavailableAlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 p-4",
        "dark:border-amber-800 dark:bg-amber-950/50",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800 dark:text-amber-200">
            Service Temporarily Unavailable
          </h4>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            We're having trouble connecting to our servers. This is usually temporary.
            Please wait a moment and try again.
          </p>
          <div className="mt-3 flex items-center gap-3">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={retrying}
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
              >
                {retrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            <span className="text-xs text-amber-600 dark:text-amber-400">
              If this persists, please try again later.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline connection error message
 * For use within forms or smaller spaces
 */
interface ConnectionErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ConnectionError({
  message = "Unable to connect. Please check your connection and try again.",
  onRetry,
  className,
}: ConnectionErrorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400",
        className
      )}
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="underline hover:no-underline font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ConnectionStatus;
