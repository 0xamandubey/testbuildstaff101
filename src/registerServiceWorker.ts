export function register() {
  // Only register service worker in production to avoid development caching interference
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('ServiceWorker registered successfully on scope: ', reg.scope);
        })
        .catch((err) => {
          console.error('ServiceWorker registration failed: ', err);
        });
    });

    // Automatically reload the page when a new service worker takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}
