import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  canRetryInPlace: boolean;
}

const CHUNK_RECOVERY_KEY = 'synerxus-chunk-recovery-attempted';

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('An unexpected application error occurred.');
}

function isIgnorableBrowserNoise(error: Error): boolean {
  return /ResizeObserver loop completed|ResizeObserver loop limit exceeded/i.test(error.message);
}

function isChunkLoadError(error: Error): boolean {
  return /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    `${error.name} ${error.message}`,
  );
}

async function clearRuntimeCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, canRetryInPlace: true };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isIgnorableBrowserNoise(error)) {
      return {};
    }

    return { hasError: true, error, canRetryInPlace: !isChunkLoadError(error) };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.recoverFromChunkError(error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, canRetryInPlace: true });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, canRetryInPlace: true });
    window.location.href = '/';
  };

  handleWindowError = (event: ErrorEvent) => {
    const error = normalizeError(event.error || event.message);
    if (isIgnorableBrowserNoise(error)) return;

    console.error('Window error caught by ErrorBoundary:', error);
    this.setState({ hasError: true, error, errorInfo: null, canRetryInPlace: !isChunkLoadError(error) });
    this.recoverFromChunkError(error);
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = normalizeError(event.reason);
    if (isIgnorableBrowserNoise(error)) return;

    console.error('Unhandled promise rejection caught by ErrorBoundary:', error);
    this.setState({ hasError: true, error, errorInfo: null, canRetryInPlace: !isChunkLoadError(error) });
    this.recoverFromChunkError(error);
  };

  recoverFromChunkError(error: Error) {
    if (!isChunkLoadError(error)) return;
    if (sessionStorage.getItem(CHUNK_RECOVERY_KEY) === 'true') return;

    sessionStorage.setItem(CHUNK_RECOVERY_KEY, 'true');
    clearRuntimeCaches()
      .catch((cacheError) => {
        console.warn('Failed to clear runtime caches after chunk load error:', cacheError);
      })
      .finally(() => {
        window.location.reload();
      });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-stone-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-stone-600 mb-6">
              We encountered an unexpected error. You can retry this view without reloading the whole app, or return to the home page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-3 bg-red-50 rounded-lg text-left">
                <p className="text-sm font-mono text-red-800 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              {this.state.canRetryInPlace && (
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              )}
              <Button
                onClick={this.handleGoHome}
                variant="outline"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
