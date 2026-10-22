'use strict';

/* =========================================================
   চালু করা: সব মডিউল রেজিস্টার হওয়ার পরে ডেটা লোড, প্রথম রেন্ডার, সার্ভিস ওয়ার্কার
   ========================================================= */
state = load();
if (typeof hgSeedDemoOnce === 'function') hgSeedDemoOnce(); // সাময়িক ডেমো ডেটা (js/hangout-demo.js)
render();
loadImages();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  const hadSW = !!navigator.serviceWorker.controller;
  let reloaded = false;
  // নতুন ভার্সন চালু হলে একবার রিলোড করে নতুন কোড দেখায়
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {}));
}
