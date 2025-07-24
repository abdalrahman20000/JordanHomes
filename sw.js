// Service Worker for Jordan Homes PWA
const CACHE_NAME = "jordan-homes-v1";
const urlsToCache = [
  "/JordanHomes/",
  "/JordanHomes/index.html",
  "/JordanHomes/catalog.html",
  "/JordanHomes/dashboard.html",
  "/JordanHomes/details.html",
  "/JordanHomes/manifest.json",
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  console.log("Service Worker installing");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(
          urlsToCache.map(
            (url) => new Request(url, { credentials: "same-origin" })
          )
        );
      })
      .catch((error) => {
        console.log("Cache addAll failed:", error);
        // Don't fail installation if caching fails
        return Promise.resolve();
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip Firebase and external API requests
  if (
    event.request.url.includes("firebase") ||
    event.request.url.includes("googleapis") ||
    event.request.url.includes("unsplash")
  ) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache if not successful
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache for future use
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Return offline page or fallback
        return new Response("التطبيق يعمل في وضع عدم الاتصال", {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })
  );
});

// Background sync for offline functionality
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("Background sync triggered");
    // Handle background sync logic here
  }
});

// Push notifications (for future use)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/JordanHomes/icons/icon-192x192.png",
      badge: "/JordanHomes/icons/icon-72x72.png",
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        {
          action: "open",
          title: "فتح التطبيق",
        },
        {
          action: "close",
          title: "إغلاق",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open" || !event.action) {
    event.waitUntil(clients.openWindow("/JordanHomes/"));
  }
});

console.log("Service Worker loaded successfully");
