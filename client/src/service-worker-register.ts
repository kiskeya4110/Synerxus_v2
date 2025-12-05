// Service Worker registration with update handling
export function registerServiceWorker() {
  // Only register in production - skip in development
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      // Add a small delay to ensure page is fully loaded
      setTimeout(() => {
        navigator.serviceWorker
          .register('/service-worker.js', { scope: '/' })
          .then(registration => {
            console.log('Service Worker registered:', registration);

            // Check for updates periodically
            const updateInterval = setInterval(() => {
              registration.update().catch(err => {
                console.warn('Failed to check for SW updates:', err);
              });
            }, 60000); // Check every minute

            // Listen for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    // New service worker is ready
                    console.log('New service worker available, update ready');
                    // Optionally notify the user
                    notifyUserOfUpdate();
                  }
                });
              }
            });

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
              clearInterval(updateInterval);
            });
          })
          .catch(error => {
            console.warn('Service Worker registration failed:', error?.message || error);
            // Silently fail - service worker is optional
          });
      }, 1000);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          console.log('Updating to new service worker');
        }
      });
    });

    // Handle service worker controller change
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

function notifyUserOfUpdate() {
  // This can trigger a toast notification if desired
  const event = new CustomEvent('swupdate');
  window.dispatchEvent(event);
}

// Call registration when module loads
registerServiceWorker();