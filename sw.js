// অফলাইনে চালানোর জন্য সার্ভিস ওয়ার্কার।
// অ্যাপ আপডেট করলে VERSION বাড়ান, তাহলে ফোনে নতুন ফাইল যাবে।
const VERSION = 'hisabi-v45';
const ASSETS = [
  './', './index.html', './styles.css', './js/core.js', './js/trade.js', './js/hangout-calc.js', './js/hangout.js', './js/hangout-forms.js', './js/hangout-flows.js', './js/hangout-report.js', './js/hangout-ui.js', './js/hangout-demo.js', './js/boot.js', './manifest.webmanifest',
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

// ক্যাশ থেকে সাথে সাথে খোলে (দ্রুত), পেছনে নতুন কপি এনে রাখে; নতুন VERSION এলে অ্যাপ নিজে রিলোড হয়
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const key = req.mode === 'navigate' ? './index.html' : req;
      const cached = await cache.match(key, { ignoreSearch: true });
      const fresh = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => cached);
      return cached || fresh;
    })
  );
});
