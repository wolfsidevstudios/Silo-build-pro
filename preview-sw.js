
let files = {};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'UPDATE_FILES') {
    files = event.data.files;
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;
  let filePath = path.startsWith('/') ? path.substring(1) : path;
  
  // For HTML projects, the iframe src is set to a unique path to avoid collisions.
  // The service worker maps this unique path back to the user's 'index.html'.
  if (filePath === 'preview-entrypoint.html' && files['index.html']) {
    filePath = 'index.html';
  }
  
  const getContentType = (filePath) => {
    if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
    if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
    if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
    // Default for React modules
    return 'application/javascript; charset=utf-8';
  };

  if (files[filePath]) {
    event.respondWith(
      new Response(files[filePath], {
        headers: { 'Content-Type': getContentType(filePath) },
      })
    );
    return;
  }

  // Handle extensionless imports used by the browser's module loader
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  for (const ext of extensions) {
    if (files[filePath + ext]) {
      event.respondWith(
        new Response(files[filePath + ext], {
          headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
        })
      );
      return;
    }
     // Handle index file imports (e.g., './components/')
    const indexPath = `${filePath}/index${ext}`;
    if (files[indexPath]) {
       event.respondWith(
        new Response(files[indexPath], {
          headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
        })
      );
      return;
    }
  }

  // For other requests (like CDNs), let the browser handle it.
});