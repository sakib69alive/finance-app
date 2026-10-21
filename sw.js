// অফলাইনে চালানোর জন্য সার্ভিস ওয়ার্কার।
// অ্যাপ আপডেট করলে VERSION বাড়ান, তাহলে ফোনে নতুন ফাইল যাবে।
const VERSION = 'hisabi-v11';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(ASSETS.map(u => fetch(u, { cache: 'reload' }).then(r => {
        if (!r.ok) throw new Error(u);
        return c.put(u, r);
      }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// নেট থাকলে সবসময় নতুন কপি, না থাকলে ক্যাশ থেকে (অফলাইন)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const key = req.mode === 'navigate' ? './index.html' : req;
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) cache.put(key, res.clone());
        return res;
      } catch (err) {
        const cached = await cache.match(key, { ignoreSearch: true });
        if (cached) return cached;
        throw err;
      }
    })
  );
});
