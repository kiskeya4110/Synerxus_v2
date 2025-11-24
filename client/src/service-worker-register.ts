// Service Worker registration with update handling
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
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
          console.log('Service Worker registration failed:', error);
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
  }
}

function notifyUserOfUpdate() {
  // This can trigger a toast notification if desired
  const event = new CustomEvent('swupdate');
  window.dispatchEvent(event);
}

// Call registration when module loads
registerServiceWorker();
