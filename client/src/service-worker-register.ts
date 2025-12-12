// Service Worker registration with update handling
export function registerServiceWorker() {
  // Only register in production and if service workers are supported
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then(registration => {
          console.log('Service Worker registered successfully:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update().catch(err => {
              console.log('Service Worker update check failed:', err);
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
        })
        .catch(error => {
          console.warn('Service Worker registration failed (this is normal in development):', error.message);
        });

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
  } else {
    console.log('Service Worker not registered (development mode or not supported)');
  }
}

function notifyUserOfUpdate() {
  // This can trigger a toast notification if desired
  const event = new CustomEvent('swupdate');
  window.dispatchEvent(event);
}

// Call registration when module loads
registerServiceWorker();