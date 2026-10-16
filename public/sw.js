// DinnerDrop service worker — minimal and safe.
// Purpose: PWA installability (Add to Home Screen, Google Play TWA) and an
// offline fallback for the app shell. All app data stays network-first; nothing
// user-specific is cached.
const CACHE = 'dinnerdrop-shell-v1'
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return
  // Network first; fall back to the cached shell for navigations when offline.
  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(req)
      if (cached) return cached
      if (req.mode === 'navigate') return caches.match('/')
      return Response.error()
    })
  )
})
