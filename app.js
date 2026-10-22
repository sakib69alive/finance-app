'use strict';

/* =========================================================
   হিসাবী / Hisabi — অফলাইন ব্যবসার হিসাব
   সব ডেটা ফোনের localStorage-এ থাকে, কোনো সার্ভার নেই।
   ========================================================= */

/* ---------- হেল্পার ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const sum = a => a.reduce((x, y) => x + y, 0);
const BN = '০১২৩৪৫৬৭৮৯';

// ভাষা: L('বাংলা', 'English')
const isEN = () => state.settings.lang === 'en';
const L = (bn, en) => (isEN() ? en : bn);

// বাংলা বা ইংরেজি যেকোনো সংখ্যা পড়ে
function toNum(v) {
  if (v == null || v === '') return 0;
  const s = String(v).replace(/[০-৯]/g, d => BN.indexOf(d)).replace(/[,\s৳]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function fmt(n) {
  const r = Math.round(n || 0);
  return (r < 0 ? '−' : '') + '৳' + Math.abs(r).toLocaleString('en-IN');
}
const pct = n => (Number.isFinite(n) ? Math.round(n * 10) / 10 : 0) + '%';
const ceil10 = n => Math.ceil((n - 1e-9) / 10) * 10;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cnt = n => L(`${n}টা`, `${n}`);

function dateOf(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const today = () => dateOf(Date.now());
// দুই তারিখের (YYYY-MM-DD) মাঝে কত দিন
const daysBetween = (a, b) => Math.round((Date.UTC(...b.split('-').map((n, i) => i === 1 ? n - 1 : +n)) - Date.UTC(...a.split('-').map((n, i) => i === 1 ? n - 1 : +n))) / 864e5);
const dayShift = (s, n) => { const [y, m, d] = s.split('-').map(Number); return dateOf(new Date(y, m - 1, d + n).getTime()); };
const MONTHS = {
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${MONTHS[isEN() ? 'en' : 'bn'][m - 1] || ''}${y !== new Date().getFullYear() ? ' ' + y : ''}`;
}
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);

/* ---------- আইকন ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  pie: '<path d="M12 3a9 9 0 1 0 9 9h-9V3Z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
};
const icon = (n, s = 22) => `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const LOGO = '<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1D1D1B"/><stop offset="1" stop-color="#34332F"/></linearGradient></defs><rect width="512" height="512" fill="url(#lg)"/><rect x="102" y="271" width="68" height="138" rx="18" fill="#A9A4F5" opacity=".7"/><rect x="222" y="195" width="68" height="215" rx="18" fill="#A9A4F5" opacity=".92"/><rect x="342" y="102" width="68" height="307" rx="18" fill="#F6D98B"/></svg>';

/* ---------- ক্যাটাগরি ও বাজেট ---------- */
const CATS = {
  product: { bn: 'প্রোডাক্ট কেনা', en: 'Product cost', icon: '📦' },
  shipping: { bn: 'শিপিং ও কাস্টমস', en: 'Shipping & customs', icon: '🚢' },
  ads: { bn: 'বিজ্ঞাপন', en: 'Ads', icon: '📣' },
  packaging: { bn: 'প্যাকেজিং', en: 'Packaging', icon: '🎁' },
  courier: { bn: 'কুরিয়ার', en: 'Courier', icon: '🛵' },
  returns: { bn: 'রিটার্ন খরচ', en: 'Return cost', icon: '↩️' },
  other: { bn: 'অন্যান্য', en: 'Other', icon: '🧾' },
};
const cl = k => { const c = CATS[k] || CATS.other; return isEN() ? c.en : c.bn; };
const cicon = k => (CATS[k] || CATS.other).icon;
const EXPENSE_CATS = ['ads', 'shipping', 'packaging', 'courier', 'other'];
const DEFAULT_BUDGET = { product: 50, shipping: 15, ads: 20, packaging: 4, courier: 3, other: 3, reserve: 5 };
const BUDGET_KEYS = Object.keys(DEFAULT_BUDGET);
const BUDGET_TEXT = {
  product: ['প্রোডাক্ট কেনা', 'Product cost', 'মূলধনের অর্ধেকের মতো প্রোডাক্টে', 'About half of capital'],
  shipping: ['শিপিং ও কাস্টমস', 'Shipping & customs', 'কার্গো, কাস্টমস, লোকাল ট্রান্সপোর্ট', 'Cargo, customs, local transport'],
  ads: ['বিজ্ঞাপন', 'Ads', 'ভাইরাল প্রোডাক্টে অ্যাড-ই বিক্রি আনে', 'Ads drive viral product sales'],
  packaging: ['প্যাকেজিং', 'Packaging', 'বক্স, পলি, টেপ, স্টিকার', 'Box, poly, tape, stickers'],
  courier: ['কুরিয়ার', 'Courier', 'যে ডেলিভারি চার্জ নিজে বহন করবেন', 'Delivery fees you pay yourself'],
  other: ['অন্যান্য ও রিটার্ন', 'Other & returns', 'ফটো/ভিডিও, যাতায়াত, রিটার্ন চার্জ', 'Photos, travel, return fees'],
  reserve: ['জরুরি রিজার্ভ', 'Emergency reserve', 'হঠাৎ খরচের জন্য হাতে রাখুন', 'Keep for surprise costs'],
};
const bl = k => BUDGET_TEXT[k][isEN() ? 1 : 0];
const bh = k => BUDGET_TEXT[k][isEN() ? 3 : 2];
const EMOJIS = ['📦', '🧸', '💡', '🎧', '⌚', '👜', '🧴', '🪞', '🔦', '🧼', '🎮', '📱', '🪴', '🧦', '🕶️', '🍳', '🧲', '✨'];
const CUR = { BDT: '৳', CNY: '¥', USD: '$' };
const curName = c => ({ CNY: L('ইউয়ান', 'yuan'), USD: L('ডলার', 'dollar') }[c] || '');
const statusLabel = s => ({ delivered: L('ডেলিভারড', 'Delivered'), pending: L('পেন্ডিং', 'Pending'), returned: L('রিটার্ন', 'Returned') }[s] || '');

/* ---------- স্টেট (localStorage) ---------- */
const STORE_KEY = 'hisabi:v1';
const APP_VERSION = 'v23'; // sw.js-এর VERSION-এর সাথে মিলিয়ে বাড়ান

function newBatch(o = {}) {
  return {
    id: uid(), name: o.name || 'My business', createdAt: Date.now(),
    capital: toNum(o.capital), target: toNum(o.target),
    days: Math.max(0, Math.floor(toNum(o.days))), startDate: o.startDate || today(),
    returnRate: o.returnRate ?? 5, codRate: o.codRate ?? 1, allocBy: o.allocBy || 'value',
    budget: { ...DEFAULT_BUDGET }, limits: {}, warnAt: 80, products: [], expenses: [], sales: [],
  };
}
function migrate(s) {
  s.version = 1;
  s.settings = Object.assign({ lang: 'bn', rates: { CNY: '', USD: '' }, lastBackup: 0 }, s.settings || {});
  s.batches = (s.batches || []).map(b => Object.assign(newBatch(), b, {
    budget: Object.assign({ ...DEFAULT_BUDGET }, b.budget || {}),
    products: b.products || [], expenses: b.expenses || [], sales: b.sales || [],
    startDate: b.startDate || dateOf(b.createdAt || Date.now()),
  }));
  if (!s.batches.some(b => b.id === s.activeBatchId)) s.activeBatchId = s.batches[0] ? s.batches[0].id : null;
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.batches)) return migrate(s);
    }
  } catch (e) { /* নষ্ট ডেটা হলে নতুন করে শুরু */ }
  return migrate({ batches: [] });
}
let state = load();
let persistAsked = false;
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    toast(L('সেভ করা যায়নি! এখনই ব্যাকআপ নিন', 'Could not save! Take a backup now'), 'danger');
  }
  if (!persistAsked && navigator.storage && navigator.storage.persist) {
    persistAsked = true;
    navigator.storage.persist().catch(() => {});
  }
}
const activeBatch = () => state.batches.find(b => b.id === state.activeBatchId) || null;

/* ---------- প্রোডাক্টের ছবি: IndexedDB-তে (localStorage-এ বড় ছবি ধরে না) ---------- */
const IMG_MAX_BYTES = 25 * 1024 * 1024, IMG_SIDE = 1280;
const imgURL = new Map(); // productId → দেখানোর URL
let imgDB = null;
function idb() {
  if (!imgDB) {
    imgDB = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no-idb'));
      const r = indexedDB.open('hisabi-images', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    imgDB.catch(() => { imgDB = null; });
  }
  return imgDB;
}
async function imgTx(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('img', mode);
    const req = fn(tx.objectStore('img'));
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = tx.onabort = () => rej(tx.error || new Error('tx'));
  });
}
// লিস্টে ছোট থাম্বনেইল (বড় ছবি ডিকোড করলে সস্তা ফোন ল্যাগ করে)
const thumbURL = new Map();
async function makeThumb(id, blob) {
  try {
    const bmp = await createImageBitmap(blob, { resizeWidth: 160, resizeQuality: 'medium' });
    const cv = document.createElement('canvas');
    cv.width = bmp.width; cv.height = bmp.height;
    cv.getContext('2d').drawImage(bmp, 0, 0);
    if (bmp.close) bmp.close();
    const t = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.8));
    if (!t) return;
    if (thumbURL.has(id)) URL.revokeObjectURL(thumbURL.get(id));
    thumbURL.set(id, URL.createObjectURL(t));
  } catch (e) { thumbURL.delete(id); }
}
function setImgURL(id, blob) {
  if (imgURL.has(id)) URL.revokeObjectURL(imgURL.get(id));
  if (blob) imgURL.set(id, URL.createObjectURL(blob)); else { imgURL.delete(id); thumbURL.delete(id); }
}
async function putImage(id, blob) { await imgTx('readwrite', s => s.put(blob, id)); setImgURL(id, blob); await makeThumb(id, blob); }
async function deleteImage(id) { await imgTx('readwrite', s => s.delete(id)); setImgURL(id, null); }
async function allImages() {
  const keys = await imgTx('readonly', s => s.getAllKeys());
  const out = [];
  for (const k of keys) out.push([k, await imgTx('readonly', s => s.get(k))]);
  return out;
}
// চালুর সময় ছবি লোড; মুছে ফেলা প্রোডাক্টের ছবি পরিষ্কার
async function loadImages() {
  try {
    const ids = new Set(state.batches.flatMap(b => b.products.map(p => p.id)));
    const all = await allImages();
    all.forEach(([k, blob]) => { if (ids.has(k) && blob) setImgURL(k, blob); });
    await Promise.all(all.filter(([k, blob]) => ids.has(k) && blob).map(([k, blob]) => makeThumb(k, blob)));
    const stale = all.map(([k]) => k).filter(k => !ids.has(k));
    if (stale.length) imgTx('readwrite', s => { stale.forEach(k => s.delete(k)); }).catch(() => {});
    if (imgURL.size && !sheetOpen) render();
  } catch (e) { /* ছবি ছাড়াই অ্যাপ চলবে */ }
}
// ছবি ছোট করে JPEG বানায়, যাতে জায়গা কম লাগে
function compressImage(file) {
  return new Promise((res, rej) => {
    if (file.type && !file.type.startsWith('image/')) return rej(new Error('type'));
    if (file.size > IMG_MAX_BYTES) return rej(new Error('size'));
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, IMG_SIDE / Math.max(im.naturalWidth, im.naturalHeight, 1));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(im.naturalWidth * k));
      cv.height = Math.max(1, Math.round(im.naturalHeight * k));
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(im, 0, 0, cv.width, cv.height);
      cv.toBlob(b => (b ? res(b) : rej(new Error('read'))), 'image/jpeg', 0.85);
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error(file.type ? 'read' : 'type')); };
    im.src = url;
  });
}
const blobToDataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
const avatar = (p, cls = 'avatar') => (imgURL.has(p.id)
  ? `<span class="${cls} has-img"><img src="${thumbURL.get(p.id) || imgURL.get(p.id)}" alt="" decoding="async" loading="lazy"></span>`
  : `<span class="${cls}">${p.emoji || '📦'}</span>`);
let pendingImg; // ফর্মে বাছাই করা ছবি: undefined = বদলায়নি, null = মুছতে হবে
let pendingPrev = '';

/* =========================================================
   হিসাবের ইঞ্জিন
   - সব খরচ প্রোডাক্টে ভাগ হয় → প্রতি ইউনিটের আসল খরচ (landed cost)
   - টার্গেট পূরণে বাকি স্টক কত দামে বেচতে হবে তা বের করে
   ========================================================= */
function compute(b) {
  const r = clamp(toNum(b.returnRate), 0, 90) / 100;
  const cod = clamp(toNum(b.codRate), 0, 50) / 100;
  const factor = (1 - r) * (1 - cod);

  const items = b.products.map(p => {
    const units = Math.max(0, Math.floor(toNum(p.units)));
    const purchase = units * toNum(p.unitCost);
    return {
      p, units, purchase, byCat: { product: purchase },
      delivered: 0, pending: 0, returned: 0, orders: 0, gross: 0, revenue: 0, pendingNet: 0,
    };
  });
  const byId = new Map(items.map(x => [x.p.id, x]));
  const cat = { product: 0, shipping: 0, ads: 0, packaging: 0, courier: 0, returns: 0, other: 0 };
  items.forEach(x => { cat.product += x.purchase; });

  const add = (x, k, v) => { x.byCat[k] = (x.byCat[k] || 0) + v; };
  const allWeighted = items.length > 0 && items.every(x => toNum(x.p.weight) > 0);
  // কোন খরচ কোন প্রোডাক্টে কতটুকু যাবে: শিপিং ওজন অনুযায়ী (ওজন দেওয়া থাকলে), বাকিগুলো দাম বা ইউনিট অনুযায়ী
  const weightsFor = k => items.map(x => (k === 'shipping' && allWeighted)
    ? toNum(x.p.weight) * x.units
    : (b.allocBy === 'units' ? x.units : x.purchase));
  let unallocated = 0;
  const spread = (k, v) => {
    const w = weightsFor(k);
    const W = sum(w);
    if (W > 0) items.forEach((x, i) => add(x, k, v * w[i] / W));
    else unallocated += v;
  };

  for (const e of b.expenses) {
    const v = toNum(e.amount);
    const k = Object.prototype.hasOwnProperty.call(cat, e.category) ? e.category : 'other';
    cat[k] += v;
    const x = e.productId && byId.get(e.productId);
    if (x) add(x, k, v); else spread(k, v);
  }

  let revenue = 0, pendingNet = 0, deliveredOrders = 0, pendingOrders = 0, returnedOrders = 0;
  for (const s of b.sales) {
    const x = byId.get(s.productId);
    const qty = Math.max(0, toNum(s.qty));
    const sCod = s.cod != null ? clamp(toNum(s.cod), 0, 50) / 100 : cod;
    const gross = Math.max(0, qty * toNum(s.price) - toNum(s.discount));
    const net = gross * (1 - sCod);
    if (s.status === 'returned') {
      const rc = toNum(s.returnCost);
      cat.returns += rc;
      returnedOrders++;
      if (x) { add(x, 'returns', rc); x.returned += qty; } else unallocated += rc;
    } else if (s.status === 'pending') {
      pendingNet += net; pendingOrders++;
      if (x) { x.pending += qty; x.pendingNet += net; }
    } else {
      revenue += net; deliveredOrders++;
      if (x) { x.delivered += qty; x.revenue += net; x.gross += gross; x.orders++; }
    }
  }

  let stockValue = 0, transitValue = 0, cogs = 0, remainingUnits = 0;
  for (const x of items) {
    x.total = sum(Object.values(x.byCat));
    x.unit = x.units ? x.total / x.units : 0;
    x.remaining = Math.max(0, x.units - x.delivered - x.pending);
    x.cogs = x.delivered * x.unit;
    x.profit = x.revenue - x.cogs;
    stockValue += x.remaining * x.unit;
    transitValue += x.pending * x.unit;
    cogs += x.cogs;
    remainingUnits += x.remaining;
  }

  const capital = toNum(b.capital), target = toNum(b.target);
  const spent = sum(Object.values(cat));
  const unspent = capital - spent;
  const cash = unspent + revenue;
  const profit = revenue - cogs - unallocated;
  // টার্গেটে পৌঁছাতে বাকি স্টক থেকে কত টাকা আসতে হবে
  const need = target - cash - pendingNet;
  const k = stockValue > 0 ? need / stockValue : null;

  for (const x of items) {
    x.breakeven = x.unit / (1 - cod);
    x.goalRaw = (k != null && x.remaining > 0) ? Math.max(x.unit * k / factor, x.breakeven) : x.breakeven;
    x.goalPrice = ceil10(x.goalRaw);
    x.profitPart = k != null && k > 1 ? x.unit * (k - 1) : 0;
    x.myPrice = toNum(x.p.myPrice);
    x.planned = x.myPrice > 0 ? x.myPrice : x.goalPrice;
    x.unitProfit = x.planned * (1 - cod) - x.unit;
  }
  const projected = cash + pendingNet + sum(items.map(x => x.remaining * x.planned * factor));

  return {
    items, cat, capital, target, spent, unspent, cash, revenue, pendingNet, stockValue, transitValue,
    cogs, profit, unallocated, need, k, r, cod, factor, projected, gap: target - projected,
    remainingUnits, deliveredOrders, pendingOrders, returnedOrders,
    targetProfit: target - capital, netWorth: cash + stockValue + transitValue,
  };
}

/* ---------- বাজেট সীমা: ৳ দেওয়া থাকলে সেটাই, নইলে মূলধনের % ---------- */
const limitOf = (b, k) => (toNum((b.limits || {})[k]) > 0 ? toNum(b.limits[k]) : toNum(b.capital) * toNum(b.budget[k]) / 100);
const warnRatio = b => clamp(toNum(b.warnAt) || 80, 10, 100) / 100;
// রিজার্ভ খরচ না, হাতে রাখা অব্যবহৃত মূলধন
const budgetActual = c => ({
  product: c.cat.product, shipping: c.cat.shipping, ads: c.cat.ads, packaging: c.cat.packaging,
  courier: c.cat.courier, other: c.cat.other + c.cat.returns, reserve: Math.max(0, c.unspent),
});

/* ---------- পরামর্শ (অফলাইন, নিয়মভিত্তিক বিজনেস গাইড) ---------- */
function insights(b, c) {
  const out = [];
  const cap = c.capital;
  const push = (lvl, bn, en) => out.push({ lvl, t: L(bn, en) });
  if (c.target <= cap) push('warn', `টার্গেট (${fmt(c.target)}) মূলধনের চেয়ে বেশি দিন, নইলে লাভের হিসাব হবে না।`, `Set the target (${fmt(c.target)}) above your capital, otherwise there's no profit to plan for.`);
  if (!b.products.length) {
    push('info', 'প্রথমে প্রোডাক্ট যোগ করুন: কয়টা ইউনিট, কত দামে কিনেছেন। তারপর অ্যাড, শিপিং, প্যাকেজিং খরচ দিন। প্রতি ইউনিটের খরচ আর বিক্রি দাম আমি বের করে দেব।',
      'Start by adding a product: how many units and what you paid. Then add ads, shipping and packaging costs. The app works out the cost per unit and the selling price.');
    return out;
  }
  if (c.target > 0 && c.cash >= c.target) push('good', `অভিনন্দন! টার্গেট ${fmt(c.target)} পূরণ হয়েছে 🎉 হাতে আছে ${fmt(c.cash)}।`, `Congrats! Target ${fmt(c.target)} reached 🎉 Cash in hand: ${fmt(c.cash)}.`);
  if (c.unspent < 0) push('danger', `মূলধনের চেয়ে ${fmt(-c.unspent)} বেশি খরচ হয়েছে। এই টাকাও বিক্রি থেকে তুলতে হবে, তাই বিক্রি দাম সেভাবে বাড়ানো হয়েছে।`,
    `You've spent ${fmt(-c.unspent)} more than your capital. Sales have to cover it, so selling prices were raised to match.`);
  if (!b.expenses.length) push('info', 'এখনও কোনো খরচ (অ্যাড, শিপিং, প্যাকেজিং) দেননি। এগুলো না দিলে প্রতি ইউনিটের খরচ আসলের চেয়ে কম দেখাবে।',
    'No costs (ads, shipping, packaging) added yet. Without them, the cost per unit will look lower than it really is.');

  if (cap > 0) {
    const act = budgetActual(c), wr = warnRatio(b);
    for (const key of ['product', 'shipping', 'ads', 'packaging', 'courier', 'other']) {
      const actual = act[key], lim = limitOf(b, key);
      if (lim <= 0 || actual <= 0) continue;
      const used = pct(actual / lim * 100);
      const nextBn = key === 'ads' ? 'নতুন অ্যাড চালানোর আগে আগের অ্যাডে কত বিক্রি এসেছে দেখুন।' : 'এই খাতে আর খরচের আগে দেখুন সত্যিই দরকার কিনা।';
      const nextEn = key === 'ads' ? 'Review sales results before spending more on ads.' : 'Check it is really needed before spending more here.';
      if (actual > lim) {
        push('danger', `${bl(key)} সীমা ছাড়িয়েছে: খরচ ${fmt(actual)}, সীমা ${fmt(lim)} (${fmt(actual - lim)} বেশি)। বাড়তি প্রতিটা টাকা প্রতি ইউনিটের খরচ বাড়ায়, লাভ কমায়। ${nextBn} পরিকল্পিত হলে বাজেট পরিকল্পনায় সীমা বাড়ান।`,
          `${bl(key)} is over its limit: ${fmt(actual)} spent vs ${fmt(lim)} (${fmt(actual - lim)} over). Every extra taka raises cost per unit and cuts profit. ${nextEn} If it was planned, raise the limit in Budget plan.`);
      } else if (key !== 'product' && actual >= lim * wr) {
        push('warn', `${bl(key)} সীমার ${used} খরচ হয়ে গেছে (${fmt(actual)} / ${fmt(lim)}), বাকি মাত্র ${fmt(lim - actual)}। ${nextBn}`,
          `${bl(key)} has used ${used} of its limit (${fmt(actual)} of ${fmt(lim)}), only ${fmt(lim - actual)} left. ${nextEn}`);
      }
    }
    const resRec = limitOf(b, 'reserve');
    if (c.unspent >= 0 && c.unspent < resRec && c.spent > 0) {
      push('warn', `জরুরি রিজার্ভ কম: অব্যবহৃত মূলধন ${fmt(c.unspent)}, ঠিক করা ন্যূনতম ${fmt(resRec)}। হঠাৎ রিটার্ন বা বাড়তি চার্জ এলে টাকা কম পড়তে পারে। নতুন খরচ থামিয়ে আগে বিক্রি থেকে টাকা তুলুন।`,
        `Low reserve: ${fmt(c.unspent)} of capital unspent, your minimum is ${fmt(resRec)}. A surprise return or fee could leave you short. Hold new spending until sales bring cash in.`);
    }
  }

  for (const x of c.items) {
    if (x.remaining <= 0 || x.myPrice <= 0) continue;
    const n = x.p.name;
    if (x.myPrice < x.breakeven) {
      push('danger', `${n}: আপনার দাম ${fmt(x.myPrice)} খরচের চেয়েও কম। প্রতিটায় লস হবে। সর্বনিম্ন ${fmt(ceil10(x.breakeven))} রাখুন।`,
        `${n}: your price ${fmt(x.myPrice)} is below cost. You lose money on each one. Charge at least ${fmt(ceil10(x.breakeven))}.`);
    } else if (x.myPrice < x.goalPrice) {
      push('warn', `${n}: ${fmt(x.myPrice)} দামে বেচলে লাভ হবে, কিন্তু টার্গেট পূরণ হবে না। টার্গেটের জন্য ${fmt(x.goalPrice)} লাগবে।`,
        `${n}: ${fmt(x.myPrice)} makes a profit but won't reach the target. You need ${fmt(x.goalPrice)}.`);
    }
  }
  if (c.gap > 1 && c.remainingUnits > 0 && c.cash < c.target) {
    const extra = fmt(c.gap / (c.remainingUnits * c.factor));
    push('info', `এখনকার দামে সব বেচলে শেষে হবে প্রায় ${fmt(c.projected)}। টার্গেটে যেতে আরও ${fmt(c.gap)} দরকার, মানে প্রতি ইউনিটে গড়ে ${extra} বেশি নিতে হবে।`,
      `At current prices you'll end with about ${fmt(c.projected)}. You need ${fmt(c.gap)} more, about ${extra} extra per unit.`);
  }
  // টার্গেটে পৌঁছাতে আরও কয়টা সফল ডেলিভারি লাগবে (এখনকার দামে)
  const left = c.items.filter(x => x.remaining > 0);
  if (c.need > 0 && left.length) {
    const perSale = sum(left.map(x => x.remaining * x.planned * (1 - c.cod))) / sum(left.map(x => x.remaining));
    if (perSale > 0) {
      const n = Math.ceil(c.need / perSale), canSell = Math.round(c.remainingUnits * (1 - c.r));
      if (c.gap > 1) push('warn', `টার্গেটে যেতে এখনকার দামে আরও প্রায় ${cnt(n)} সফল ডেলিভারি লাগবে, কিন্তু স্টক ${c.remainingUnits} থেকে ${pct(c.r * 100)} রিটার্ন ধরে পাওয়া যাবে প্রায় ${cnt(canSell)}। এই হিসাবে টার্গেট কঠিন: খরচ কমান, দাম বাড়ান, বা টার্গেট আবার দেখুন।`,
        `At current prices you need about ${n} more successful deliveries, but your ${c.remainingUnits} units give about ${canSell} after ${pct(c.r * 100)} returns. The target looks difficult under these assumptions: cut costs, raise prices, or review the target.`);
      else push('info', `টার্গেটে যেতে এখনকার দামে আরও প্রায় ${cnt(n)} সফল ডেলিভারি দরকার (হাতে ${c.remainingUnits} ইউনিট আছে)।`,
        `You need about ${n} more successful deliveries at current prices to reach the target (${c.remainingUnits} units in stock).`);
    }
  }
  if (c.pendingOrders) push('info', `কুরিয়ারে ${cnt(c.pendingOrders)} অর্ডারের ${fmt(c.pendingNet)} আসা বাকি।`, `${fmt(c.pendingNet)} from ${c.pendingOrders} order(s) is still with the courier.`);
  if (c.cat.ads > 0 && c.deliveredOrders > 0) {
    push('info', `প্রতি ডেলিভারড অর্ডারে অ্যাড খরচ পড়ছে ${fmt(c.cat.ads / c.deliveredOrders)}।`, `Ad cost per delivered order: ${fmt(c.cat.ads / c.deliveredOrders)}.`);
  }
  const closed = c.deliveredOrders + c.returnedOrders;
  if (closed >= 4) {
    const rr = c.returnedOrders / closed;
    if (rr > c.r + 0.02) push('warn', `রিটার্ন রেট ${pct(rr * 100)}, কিন্তু বাফার ধরা আছে ${pct(c.r * 100)}। ব্যাচ সেটিংসে বাফার বাড়ান, তাহলে দাম ঠিকমতো আসবে।`,
      `Return rate is ${pct(rr * 100)} but the buffer is ${pct(c.r * 100)}. Raise the buffer in batch settings so prices come out right.`);
  }
  if (c.unallocated > 0) push('warn', `${fmt(c.unallocated)} খরচ কোনো প্রোডাক্টে ভাগ করা যায়নি।`, `${fmt(c.unallocated)} of costs couldn't be assigned to any product.`);
  const last = state.settings.lastBackup;
  if ((!last || Date.now() - last > 7 * 864e5) && (b.sales.length + b.expenses.length) >= 3) {
    push('warn', `${last ? 'এক সপ্তাহের বেশি' : 'এখনও'} ব্যাকআপ নেওয়া হয়নি। ফোন হারালে বা অ্যাপ মুছলে ডেটা যাবে। "আরও" থেকে ব্যাকআপ নিন।`,
      `${last ? 'No backup in over a week' : 'No backup yet'}. Losing the phone or deleting the app loses your data. Back up from "More".`);
  }
  if (!out.length) push('good', 'সব ঠিকঠাক চলছে 👍 বাজেটের মধ্যে আছেন, দামও টার্গেট অনুযায়ী।', 'All good 👍 You are within budget and prices match the target.');
  const rank = { danger: 0, good: 1, warn: 2, info: 3 };
  return out.sort((a, b2) => rank[a.lvl] - rank[b2.lvl]);
}

/* =========================================================
   UI
   ========================================================= */
let tab = 'home';
let expFilter = 'all';
const TAB_ORDER = ['home', 'products', 'expenses', 'sales', 'more'];
const TAB_LABEL = id => ({ home: L('হোম', 'Home'), products: L('প্রোডাক্ট', 'Products'), expenses: L('খরচ', 'Costs'), sales: L('বিক্রি', 'Sales'), more: L('আরও', 'More') }[id]);
let trail = ['home']; // কোন কোন ট্যাবে গেছেন, ক্রমানুসারে (সর্বোচ্চ ৫টা)
function setTab(id, dir = 0) {
  if (!TAB_ORDER.includes(id) || id === tab) return;
  const i = trail.indexOf(id);
  if (i >= 0) trail = trail.slice(0, i + 1); else trail.push(id);
  if (trail.length > 5) trail.shift();
  tab = id;
  render();
  window.scrollTo(0, 0);
  const v = $('#view');
  if (dir) { v.classList.remove('slide-l', 'slide-r'); void v.offsetWidth; v.classList.add(dir > 0 ? 'slide-l' : 'slide-r'); }
}

const langBtn = () => `<button type="button" class="icon-btn txt" data-action="toggle-lang" aria-label="${L('Switch to English', 'বাংলায় দেখুন')}">${L('EN', 'বাং')}</button>`;

function render() {
  document.documentElement.lang = isEN() ? 'en' : 'bn';
  document.title = L('হিসাবী', 'Hisabi');
  const b = activeBatch();
  if (!b) {
    $('#topbar').innerHTML = '';
    $('#tabbar').innerHTML = '';
    $('#view').innerHTML = viewWelcome();
    return;
  }
  const c = compute(b);
  $('#topbar').innerHTML = `
    <div class="batch-btn">
      <button type="button" class="home-btn" data-action="go-home" aria-label="${L('হোমে ফিরুন', 'Back to Home')}"><span class="logo-sm">${LOGO}</span></button>
      <span class="bb-text"><button type="button" class="home-link" data-action="go-home">${L('হিসাবী', 'Hisabi')}</button>
        <button type="button" class="batch-name" data-action="batches" aria-label="${L('ব্যাচ বদলান', 'Switch batch')}"><b>${esc(b.name)}</b>${icon('chev', 16)}</button></span>
    </div>
    <div class="top-actions">${langBtn()}</div>
    ${trail.length > 1 ? `<nav class="crumbs" aria-label="${L('আপনি কোথায় ছিলেন', 'Where you have been')}">${trail.map((id, i) =>
      `${i ? '<i>›</i>' : ''}<button type="button" class="${id === tab ? 'cur' : ''}" data-action="tab" data-tab="${id}">${TAB_LABEL(id)}</button>`).join('')}</nav>` : ''}`;
  const views = { home: viewHome, products: viewProducts, expenses: viewExpenses, sales: viewSales, more: viewMore };
  $('#view').innerHTML = (views[tab] || viewHome)(b, c);
  const tabs = [
    ['home', 'home', L('হোম', 'Home')], ['products', 'box', L('প্রোডাক্ট', 'Products')],
    ['expenses', 'receipt', L('খরচ', 'Costs')], ['sales', 'trend', L('বিক্রি', 'Sales')], ['more', 'grid', L('আরও', 'More')],
  ];
  $('#tabbar').innerHTML = `<div class="tabbar-inner">${tabs.map(([id, ic, label]) =>
    `<button type="button" class="tab ${tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}"><span class="tw">${icon(ic)}</span>${label}</button>`).join('')}</div>`;
}

/* ---------- ছোট কম্পোনেন্ট ---------- */
function ring(p) {
  const R = 34, C = 2 * Math.PI * R;
  return `<svg class="ring" viewBox="0 0 84 84" width="84" height="84" aria-hidden="true">
    <circle cx="42" cy="42" r="${R}" class="ring-bg"/>
    <circle cx="42" cy="42" r="${R}" class="ring-fg" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - p)).toFixed(2)}" transform="rotate(-90 42 42)"/>
    <text x="42" y="48" text-anchor="middle">${Math.round(p * 100)}%</text></svg>`;
}
const stat = (label, value, sub, cls = '') => `<div class="stat"><small>${label}</small><b class="${cls}">${value}</b><em>${sub}</em></div>`;
const seg = (name, opts, val, disabled = []) => `<div class="seg">${opts.map(([v, l]) =>
  `<label class="${disabled.includes(v) ? 'off' : ''}"><input type="radio" name="${name}" value="${v}" ${v === val ? 'checked' : ''} ${disabled.includes(v) ? 'disabled' : ''}><span>${l}</span></label>`).join('')}</div>`;
const delBtn = (action, id) => `<button type="button" class="rowdel" data-action="${action}" data-id="${id}" aria-label="${L('ডিলিট', 'Delete')}">${icon('trash', 18)}</button>`;
const hintLine = t => `<div class="hint">${t}</div>`;
const sheetHead = (title, sub = '') => `<div class="sheet-head"><h3>${title}${sub ? `<small>${sub}</small>` : ''}</h3>
  <button type="button" class="icon-btn" data-action="close-sheet" aria-label="${L('বন্ধ করুন', 'Close')}">${icon('x', 20)}</button></div>`;
const moneyInput = (name, value, ph = '0', extra = '') => `<div class="input-wrap has-prefix"><span class="prefix">৳</span>
  <input class="input" name="${name}" inputmode="decimal" value="${esc(value ?? '')}" placeholder="${ph}" ${extra}></div>`;
const empty = (em, title, text, btn = '') => `<div class="empty"><div class="em">${em}</div><b>${title}</b>${text}${btn}</div>`;

/* ---------- ওয়েলকাম ---------- */
function viewWelcome() {
  return `<section class="welcome">
    <div class="welcome-top"><div class="logo">${LOGO}</div>${langBtn()}</div>
    <h1>${L('হিসাবী', 'Hisabi')}</h1>
    <p class="lead">${L('মূলধন থেকে লাভ পর্যন্ত প্রতিটা টাকার হিসাব। প্রতি ইউনিটের খরচ আর বিক্রি দাম অটো বের হবে।',
      'Every taka from capital to profit. Cost per unit and selling price, worked out for you.')}</p>
    <div class="feat">
      <div><span>🧮</span>${L('প্রতি ইউনিটের আসল খরচ', 'True cost per unit')}</div>
      <div><span>🎯</span>${L('টার্গেট অনুযায়ী বিক্রি দাম', 'Price to hit your target')}</div>
      <div><span>📊</span>${L('কোথায় কত % গেল', 'Where every % went')}</div>
      <div><span>📴</span>${L('পুরো অফলাইন', 'Fully offline')}</div>
    </div>
    <div class="card">${batchForm(null)}</div>
    <p class="tiny">${L('সব ডেটা শুধু আপনার ফোনে থাকে। কোনো সার্ভার নেই।', 'All data stays on your phone. No server.')}</p>
  </section>`;
}

function batchForm(b) {
  const isNew = !b;
  const v = b || { name: '', capital: '', target: '', returnRate: 5, codRate: 1, allocBy: 'value' };
  return `<form data-form="batch" data-live="batch" data-id="${b ? b.id : ''}" autocomplete="off">
    <label class="field"><span>${L('ব্যবসা / ব্যাচের নাম', 'Business / batch name')}</span>
      <input class="input" name="name" maxlength="40" value="${esc(v.name)}" placeholder="${L('যেমন: অক্টোবর ব্যাচ', 'e.g. October batch')}"></label>
    <label class="field"><span>${L('মূলধন (কত টাকা ইনভেস্ট করছেন)', 'Capital (how much you invest)')}</span>${moneyInput('capital', v.capital, L('যেমন: 10000', 'e.g. 10000'), 'required')}</label>
    <label class="field"><span>${L('টার্গেট (মূলধন থেকে মোট কত টাকা বানাতে চান)', 'Target (total you want to turn it into)')}</span>${moneyInput('target', v.target, L('যেমন: 12000', 'e.g. 12000'), 'required')}
      <div class="qchips">${[10, 20, 30, 50].map(p => `<button type="button" data-action="target-pct" data-pct="${p}">+${p}% ${L('লাভ', 'profit')}</button>`).join('')}</div>
      <div class="hint" data-target-hint></div></label>
    <label class="field"><span>${L('কত দিনে টার্গেট বেচতে চান? (ঐচ্ছিক)', 'In how many days? (optional)')}</span>
      <div class="input-wrap"><input class="input" name="days" inputmode="numeric" value="${esc(v.days || '')}" placeholder="${L('যেমন: 30', 'e.g. 30')}"><span class="suffix">${L('দিন', 'days')}</span></div>
      <div class="hint">${L('দিলে হোমে প্রতিদিনের টার্গেট আর আজ কতটা এগোলেন দেখাবে। পরে যেকোনো সময় বদলানো যায়।', 'Home will show your daily target and today\'s progress. You can change it anytime.')}</div></label>
    ${isNew ? `<div class="field"><span class="flabel">${L('আদর্শ বাজেট ভাগ (ঐচ্ছিক)', 'Ideal budget split (optional)')}</span>
      ${seg('plan', Object.entries(PRESETS).map(([id, p]) => [id, isEN() ? p.en : p.bn]), 'balanced')}
      <div class="hint" data-plan-preview></div></div>` : ''}
    <details class="more" ${isNew ? '' : 'open'}><summary>${L('অ্যাডভান্সড সেটিংস', 'Advanced settings')}</summary>
      <div class="row2">
        <label class="field"><span>${L('রিটার্ন/ড্যামেজ বাফার', 'Return/damage buffer')}</span><div class="input-wrap"><input class="input" name="returnRate" inputmode="decimal" value="${esc(v.returnRate)}"><span class="suffix">%</span></div></label>
        <label class="field"><span>${L('COD চার্জ', 'COD charge')}</span><div class="input-wrap"><input class="input" name="codRate" inputmode="decimal" value="${esc(v.codRate)}"><span class="suffix">%</span></div></label>
      </div>
      <div class="field"><span class="flabel">${L('শেয়ারড খরচ (অ্যাড, প্যাকেজিং…) প্রোডাক্টে ভাগ হবে', 'Split shared costs (ads, packaging…) by')}</span>
        ${seg('allocBy', [['value', L('কেনা দাম অনুযায়ী', 'Purchase value')], ['units', L('ইউনিট সংখ্যা অনুযায়ী', 'Unit count')]], v.allocBy || 'value')}
        <div class="hint">${L('সব প্রোডাক্টে ওজন দিলে শিপিং খরচ ওজন অনুযায়ী ভাগ হবে।', 'If every product has a weight, shipping is split by weight.')}</div></div>
    </details>
    <button class="btn primary block" type="submit">${isNew ? L('শুরু করি →', 'Get started →') : L('সেভ করুন', 'Save')}</button>
    ${!isNew ? `<button type="button" class="btn danger block mt8" data-action="delete-batch" data-id="${b.id}">${icon('trash', 18)} ${L('এই ব্যাচ ডিলিট', 'Delete this batch')}</button>` : ''}
  </form>`;
}

/* ---------- হোম ---------- */
/* ---------- দিনের হিসাব: টার্গেট কত দিনে, আজ কতটা বেচলে ঠিক থাকবে ---------- */
function pace(b, c) {
  const days = Math.floor(toNum(b.days));
  if (days <= 0 || !c.items.length) return null;
  const t = today();
  const dayNo = Math.max(1, daysBetween(b.startDate || t, t) + 1);
  const daysLeft = days - dayNo + 1; // আজকের দিনসহ, ০ বা কম হলে সময় শেষ
  const left = c.remainingUnits;
  const avgNet = left > 0 ? sum(c.items.map(x => x.remaining * x.planned * c.factor)) / left : 0;
  const avgCost = left > 0 ? sum(c.items.map(x => x.remaining * x.unit)) / left : 0;
  const margin = avgNet - avgCost;
  const soldOn = d => sum(b.sales.filter(s => s.status !== 'returned' && s.date === d).map(s => toNum(s.qty)));
  const soldToday = soldOn(t), soldYest = soldOn(dayShift(t, -1));
  const totalSold = sum(b.sales.filter(s => s.status !== 'returned').map(s => toNum(s.qty)));
  const reached = c.need <= 0;
  const needUnits = reached ? 0 : (avgNet > 0 ? Math.ceil(c.need / avgNet) : Infinity);
  const enough = needUnits <= left;
  // দিনের শুরুতে কত ইউনিট বাকি ছিল, সেটা দিয়ে ওই দিনের টার্গেট
  const targetOn = (sold, daysFromNow) => reached && sold === 0 ? 0 : Math.max(1, Math.ceil((needUnits + sold) / Math.max(1, daysLeft + daysFromNow)));
  const targetToday = daysLeft > 0 ? targetOn(soldToday, 0) : 0;
  const targetYest = dayNo > 1 ? targetOn(soldYest, 1) : null;
  const perDay = totalSold / dayNo;
  const needDays = perDay > 0 ? Math.ceil(needUnits / perDay) : null;
  const extra = needDays != null && isFinite(needUnits) ? Math.max(0, needDays - Math.max(0, daysLeft)) : null;
  const projCash = c.cash + c.pendingNet + Math.min(left, perDay * Math.max(0, daysLeft)) * avgNet;
  return { days, dayNo, daysLeft, needUnits, enough, reached, margin, soldToday, soldYest, targetToday, targetYest, perDay, needDays, extra, projCash };
}

function paceCard(b, c) {
  const p = pace(b, c);
  if (!p) {
    return c.items.length ? `<button type="button" class="paceset" data-action="edit-batch">${L('কত দিনে টার্গেট বেচবেন? ডেডলাইন সেট করুন (ঐচ্ছিক)', 'Set a deadline for your target (optional)')}</button>` : '';
  }
  const over = p.daysLeft <= 0;
  const timePct = clamp(p.dayNo / p.days * 100, 0, 100);
  const tile = (label, target, sold) => {
    const d = sold - target;
    const ok = d >= 0;
    const pill = ok ? (d > 0 ? L(`${d} বেশি`, `${d} extra`) : L('পূরণ', 'Done')) : L(`${-d} বাকি`, `${-d} to go`);
    return `<div class="ptile"><small>${label}</small>
      <div class="pbig"><b>${sold}</b><span>/ ${target}</span></div>
      <span class="ppill ${ok ? 'ok' : 'no'}">${pill}</span></div>`;
  };
  const rate = Math.round(p.perDay * 10) / 10;
  let note, tone = '';
  if (p.reached) note = L('টার্গেট পূরণ হয়েছে। এখন থেকে প্রতিটা বিক্রিই বাড়তি লাভ।', 'Target reached. Every sale from here is extra profit.');
  else if (!p.enough) { tone = 'warn'; note = L(`স্টকে টার্গেট ধরা যাবে না। আরও প্রায় ${p.needUnits}টা বিক্রি লাগবে, স্টকে আছে ${c.remainingUnits}টা। মাল আনুন, দাম বাড়ান বা টার্গেট কমান।`, `Stock won't reach the target: about ${p.needUnits} more sales needed, ${c.remainingUnits} in stock. Restock, raise prices or lower the target.`); }
  else if (over) { tone = 'warn'; note = p.needDays != null ? L(`সময় শেষ। আরও প্রায় ${p.needUnits}টা বিক্রি লাগবে, এই গতিতে ${p.needDays} দিন।`, `Time is up. About ${p.needUnits} more sales needed, around ${p.needDays} days at this pace.`) : L('সময় শেষ। ডেডলাইন বাড়িয়ে নিন।', 'Time is up. Extend the deadline.'); }
  else if (p.perDay <= 0) note = L(`এখনও বিক্রি শুরু হয়নি। ${p.daysLeft} দিনে টার্গেট ধরতে দিনে প্রায় ${p.targetToday}টা বেচতে হবে।`, `No sales yet. To hit the target in ${p.daysLeft} days, aim for about ${p.targetToday} a day.`);
  else if (p.extra > 0) { tone = 'warn'; note = L(`এই গতিতে ডেডলাইনে পৌঁছানো কঠিন। ${p.extra} দিন বাড়ালে টার্গেট ধরা যাবে।`, `Hard to make the deadline at this pace. Adding ${p.extra} days gets you there.`); }
  else note = L('ঠিক পথে আছেন। এই গতি ধরে রাখলে ডেডলাইনের আগেই টার্গেট ধরবেন।', 'You are on track. Keep this pace and you reach the target before the deadline.');
  const rows = p.reached ? '' : `<div class="prows">
      <div><span>${L('বর্তমান গতি', 'Current pace')}</span><b>${rate} ${L('টা/দিন', '/day')}</b></div>
      <div><span>${L('টার্গেটে লাগবে', 'Needed to finish')}</span><b>${p.needDays != null ? `${p.needDays} ${L('দিন', 'days')}` : '—'}</b></div>
      <div><span>${L('শেষ দিনে হাতে থাকবে', 'Cash at deadline')}</span><b>${fmt(p.projCash)}</b></div>
      <div><span>${L('প্রতি বিক্রিতে লাভ', 'Profit per sale')}</span><b>${fmt(p.margin)}</b></div>
    </div>`;
  const add = p.extra > 0 ? p.extra : 7;
  return `<section class="card pace">
    <div class="card-head"><h2>${L('টার্গেট টাইমলাইন', 'Target timeline')}</h2>
      <span class="daychip ${over ? 'late' : ''}">${over ? L('সময় শেষ', 'Time up') : L(`${p.daysLeft} দিন বাকি`, `${p.daysLeft} days left`)}</span></div>
    <div class="ptime"><span>${L(`দিন ${Math.min(p.dayNo, p.days)} / ${p.days}`, `Day ${Math.min(p.dayNo, p.days)} of ${p.days}`)}</span><span>${Math.round(timePct)}%</span></div>
    <div class="bar sm"><i style="width:${timePct.toFixed(1)}%"></i></div>
    <div class="ptiles">${over ? '' : tile(L('আজ', 'Today'), p.targetToday, p.soldToday)}${p.targetYest != null ? tile(L('গতকাল', 'Yesterday'), p.targetYest, p.soldYest) : ''}</div>
    ${rows}
    <p class="advice ${tone}">${note}</p>
    <div class="dsell">
      <button type="button" class="btn primary sm" data-action="add-days" data-n="${add}">${L(`+${add} দিন বাড়ান`, `Add ${add} days`)}</button>
      <button type="button" class="btn sm" data-action="edit-batch">${L('দিন বদলান', 'Change days')}</button>
    </div>
  </section>`;
}

// হিরো ট্যাপ করলে: সব হিসাব এক সিরিয়ালে
function heroDetail(b, c) {
  const row = (label, val, cls = '') => `<div class="${cls}"><span>${label}</span><span>${val}</span></div>`;
  const nw = c.netWorth - c.capital;
  const p = pace(b, c);
  const cats = ['product', ...EXPENSE_CATS, 'returns'].filter(k => c.cat[k] > 0)
    .map(k => row(`− ${cicon(k)} ${cl(k)}`, fmt(c.cat[k]))).join('');
  const prodBlocks = c.items.length ? c.items.map(x => {
    const buy = x.units ? x.purchase / x.units : 0;
    const other = x.total - x.purchase;
    return `<div class="fbp">
      <div class="fbp-head">${avatar(x.p)}<b>${esc(x.p.name)}</b></div>
      <div class="ledger fb">
        ${row(`${L('কেনা', 'Bought')}: ${x.units} × ${fmt(buy)}`, fmt(x.purchase))}
        ${row(L('অন্য খরচ (ভাগ হয়ে এসেছে)', 'Other costs (allocated)'), fmt(other))}
        ${row(`= ${L('মোট খরচ', 'Total cost')}`, fmt(x.total), 'sub')}
        ${row(L('প্রতি ইউনিটে সব খরচসহ', 'All-in cost per unit'), fmt(x.unit))}
        ${row(L('বেচার দাম (প্রতিটা)', 'Selling price (each)'), fmt(x.planned))}
        ${row(`${L('বিক্রি হয়েছে', 'Sold')}: ${x.delivered}${x.pending ? ` (+${x.pending} ${L('পথে', 'in transit')})` : ''}`, fmt(x.revenue))}
        ${row(x.profit >= 0 ? L('লাভ', 'Profit') : L('ক্ষতি', 'Loss'), fmt(x.profit), x.profit >= 0 ? 'pos' : 'neg')}
        ${row(`${L('স্টকে বাকি', 'In stock')}: ${x.remaining} × ${fmt(x.unit)}`, fmt(x.remaining * x.unit))}
      </div></div>`;
  }).join('') : `<p class="hint">${L('এখনও কোনো প্রোডাক্ট নেই।', 'No products yet.')}</p>`;
  const pn = id => { const q = b.products.find(p => p.id === id); return q ? q.name : L('সব প্রোডাক্টে ভাগ', 'Split across all'); };
  const expRows = b.expenses.length
    ? [...b.expenses].sort(byDateDesc).map(e => row(`${cicon(e.category)} ${esc(e.note || cl(e.category))}<small>${fmtDate(e.date)} · ${esc(pn(e.productId))}</small>`, fmt(toNum(e.amount)), 'two')).join('')
      + row(`= ${L('এই তালিকার মোট', 'Listed total')}`, fmt(sum(b.expenses.map(e => toNum(e.amount)))), 'total')
    : row(L('এখনও কোনো খরচ যোগ করা হয়নি', 'No costs added yet'), '—');
  const prog = c.target > 0 ? Math.round(clamp(c.cash / c.target, 0, 9.99) * 100) : 0;
  return `${sheetHead(L('পুরো হিসাব', 'Full breakdown'), esc(b.name))}
  <div class="fb-top"><small>${L('এখন হাতে ক্যাশ', 'Cash in hand now')}</small><b>${fmt(c.cash)}</b>
    <span>${L('টার্গেট', 'Target')} ${fmt(c.target)} · ${prog}% ${L('পূরণ', 'done')}</span></div>

  <h4 class="fb-h"><i>1</i>${L('টাকার হিসাব', 'Money flow')}</h4>
  <div class="ledger fb">
    ${row(L('মূলধন', 'Capital'), fmt(c.capital))}
    ${cats}
    ${row(`= ${L('মোট খরচ', 'Total spent')}`, fmt(c.spent), 'sub')}
    ${row(`+ ${L('বিক্রি থেকে এসেছে (নেট)', 'Sales received (net)')}`, fmt(c.revenue))}
    ${row(`= ${L('হাতে ক্যাশ', 'Cash in hand')}`, fmt(c.cash), 'total')}
  </div>

  <h4 class="fb-h"><i>2</i>${L('প্রতিটা প্রোডাক্টের হিসাব', 'Each product')}</h4>
  ${prodBlocks}

  <h4 class="fb-h"><i>3</i>${L('খরচ কোথায় গেল (তালিকা)', 'Where the costs went')}</h4>
  <div class="ledger fb">
    ${expRows}
  </div>

  <h4 class="fb-h"><i>4</i>${L('সম্পদ', 'Assets')}</h4>
  <div class="ledger fb">
    ${row(L('হাতে ক্যাশ', 'Cash in hand'), fmt(c.cash))}
    ${row(`+ ${L('স্টকে আছে (খরচ মূল্যে)', 'Stock (at cost)')}`, fmt(c.stockValue))}
    ${row(`+ ${L('কুরিয়ারে আছে (খরচ মূল্যে)', 'With courier (at cost)')}`, fmt(c.transitValue))}
    ${row(`= ${L('মোট সম্পদ', 'Total worth')}`, fmt(c.netWorth), 'total')}
    ${row(`${L('মোট সম্পদ − মূলধন', 'Worth − capital')} = ${nw >= 0 ? L('লাভ', 'profit') : L('ক্ষতি', 'loss')}`, fmt(nw), nw >= 0 ? 'pos' : 'neg')}
  </div>

  <h4 class="fb-h"><i>5</i>${L('বিক্রি', 'Sales')}</h4>
  <div class="ledger fb">
    ${row(L('ডেলিভারড অর্ডার', 'Delivered orders'), c.deliveredOrders)}
    ${row(L('কুরিয়ারে (পেন্ডিং)', 'Pending with courier'), `${c.pendingOrders} · ${fmt(c.pendingNet)}`)}
    ${row(L('রিটার্ন', 'Returns'), c.returnedOrders)}
    ${row(L('বিক্রি হওয়া ইউনিটে লাভ', 'Profit on units sold'), fmt(c.profit), c.profit >= 0 ? 'pos' : 'neg')}
    ${row(L('স্টকে বাকি', 'Units left'), c.remainingUnits)}
  </div>

  <h4 class="fb-h"><i>6</i>${L('টার্গেট', 'Target')}</h4>
  <div class="ledger fb">
    ${row(L('লক্ষ্য লাভ', 'Goal profit'), `${fmt(c.targetProfit)}${c.capital > 0 ? ` (${pct(c.targetProfit / c.capital * 100)})` : ''}`)}
    ${row(L('আরও তুলতে হবে', 'Still to bring in'), fmt(Math.max(0, c.target - c.cash)))}
    ${row(L('সব স্টক বেচলে শেষে হাতে হবে (আনুমানিক)', 'Expected final cash if all sold'), fmt(c.projected))}
    ${p ? row(L('ডেডলাইন', 'Deadline'), L(`${p.days} দিনের ${Math.min(p.dayNo, p.days)} নম্বর দিন`, `Day ${Math.min(p.dayNo, p.days)} of ${p.days}`)) : ''}
  </div>
  <p class="hint">${L('বিক্রির অংশ COD চার্জ কেটে নেট ধরা হয়েছে। স্টক ও কুরিয়ারের মান খরচ মূল্যে, বিক্রি দামে নয়।', 'Sales are net of COD charges. Stock and courier are valued at cost, not selling price.')}</p>`;
}

function viewHome(b, c) {
  const progress = c.target > 0 ? clamp(c.cash / c.target, 0, 1) : 0;
  const ins = insights(b, c);
  const nw = c.netWorth - c.capital;
  const next = ins[0] && ins[0].lvl !== 'good' ? ins[0] : null;
  return `
  <section class="hero tappable" data-action="hero-detail" role="button" tabindex="0" aria-label="${L('পুরো হিসাব দেখুন', 'See full breakdown')}">
    <div class="hero-top">
      <div>
        <div class="hero-label">${L('এখন হাতে ক্যাশ', 'Cash in hand now')}</div>
        <div class="hero-target">${fmt(c.cash)}</div>
        <div class="hero-sub">${L('টার্গেট', 'Target')} ${fmt(c.target)} · ${L('মূলধন', 'Capital')} ${fmt(c.capital)}</div>
      </div>
      ${ring(progress)}
    </div>
    <div class="hero-chips">
      <div><small>${L('খরচ', 'Spent')}</small><b>${fmt(c.spent)}</b></div>
      <div><small>${L('বিক্রি', 'Sales')}</small><b>${fmt(c.revenue)}</b></div>
      <div><small>${c.profit >= 0 ? L('লাভ', 'Profit') : L('লস', 'Loss')}</small><b>${fmt(c.profit)}</b></div>
    </div>
    <div class="hero-more">${L('ট্যাপ করে পুরো হিসাব দেখুন', 'Tap for the full breakdown')} ${icon('chev', 16)}</div>
  </section>

  ${stepsCard(b, c)}

  <div class="quick">
    <button type="button" class="qbtn" data-action="add-sale"><span class="qi">${icon('trend')}</span>${L('বিক্রি', 'Sale')}</button>
    <button type="button" class="qbtn" data-action="add-expense"><span class="qi">${icon('receipt')}</span>${L('খরচ', 'Cost')}</button>
    <button type="button" class="qbtn" data-action="add-product"><span class="qi">${icon('box')}</span>${L('প্রোডাক্ট', 'Product')}</button>
  </div>

  ${paceCard(b, c)}

  ${productDash(c)}

  ${c.capital > 0 ? `<section class="card">
    <div class="card-head"><h2>${L('আদর্শ বাজেট ভাগ', 'Ideal budget split')}</h2><button type="button" class="link" data-action="edit-budget">${L('বদলান', 'Edit')}</button></div>
    ${budgetBlock(b, c)}
  </section>` : ''}
  ${installCard()}

  ${next ? `<section class="card next-card"><small>${L('এখন যা করবেন', 'Do this next')}</small><p>${esc(next.t)}</p></section>` : ''}

  <details class="card more-card">
    <summary>${L('আরও হিসাব দেখুন', 'More details')} ${icon('chev', 20)}</summary>
    <section class="stat-grid">
      ${stat(L('মোট খরচ', 'Total spent'), fmt(c.spent), c.capital > 0 ? L(`মূলধনের ${pct(c.spent / c.capital * 100)}`, `${pct(c.spent / c.capital * 100)} of capital`) : '&nbsp;')}
      ${stat(L('বিক্রি (নেট)', 'Sales (net)'), fmt(c.revenue), L(`${cnt(c.deliveredOrders)} অর্ডার ডেলিভারড`, `${c.deliveredOrders} order${c.deliveredOrders === 1 ? '' : 's'} delivered`))}
      ${stat(L('স্টকে আছে', 'In stock'), fmt(c.stockValue), L(`${c.remainingUnits} ইউনিট (খরচ মূল্যে)`, `${c.remainingUnits} units (at cost)`))}
      ${stat(c.profit >= 0 ? L('লাভ', 'Profit') : L('ক্ষতি', 'Loss'), fmt(c.profit), L('বিক্রি হওয়া ইউনিটে', 'On units sold'), c.profit >= 0 ? 'pos' : 'neg')}
      ${stat(L('পাওনা (কুরিয়ারে)', 'Receivable (courier)'), fmt(c.pendingNet), L('এখনও ক্যাশ না', 'Not cash yet'))}
      ${stat(L('রিজার্ভ', 'Reserve'), fmt(Math.max(0, c.unspent)), L(`ন্যূনতম ${fmt(limitOf(b, 'reserve'))} · খরচ না`, `Min ${fmt(limitOf(b, 'reserve'))} · not an expense`), c.unspent < limitOf(b, 'reserve') ? 'neg' : '')}
    </section>

    <h3 class="sub-title">${icon('spark', 18)} ${L('বিজনেস গাইড', 'Business guide')}</h3>
    <ul class="insights">${ins.slice(next ? 1 : 0).map(i => `<li class="insight ${i.lvl}">${esc(i.t)}</li>`).join('')}</ul>
    <p class="hint">${L('এই পরামর্শ আপনার দেওয়া হিসাব থেকে, ফোনেই তৈরি (ইন্টারনেট লাগে না)। লাভের নিশ্চয়তা নয়।', 'Built on this device from your own numbers (no internet). Not a guarantee of profit.')}</p>

    <h3 class="sub-title">${L('টাকার মিলান (১ টাকারও হিসাব)', 'Money check (to the last taka)')}</h3>
    <div class="ledger">
      <div><span>${L('মূলধন', 'Capital')}</span><span>${fmt(c.capital)}</span></div>
      <div><span>− ${L('মোট খরচ', 'Total spent')}</span><span>${fmt(c.spent)}</span></div>
      <div><span>+ ${L('বিক্রি থেকে এসেছে (নেট)', 'From sales (net)')}</span><span>${fmt(c.revenue)}</span></div>
      <div class="total"><span>= ${L('হাতে ক্যাশ', 'Cash in hand')}</span><span>${fmt(c.cash)}</span></div>
      <div><span>+ ${L('স্টকে আছে (খরচ মূল্যে)', 'Stock (at cost)')}</span><span>${fmt(c.stockValue)}</span></div>
      <div><span>+ ${L('কুরিয়ারে আছে (খরচ মূল্যে)', 'With courier (at cost)')}</span><span>${fmt(c.transitValue)}</span></div>
      <div class="total"><span>= ${L('মোট সম্পদ', 'Total worth')}</span><span>${fmt(c.netWorth)}</span></div>
      <div><span>${L('মোট সম্পদ − মূলধন', 'Worth − capital')} = ${nw >= 0 ? L('লাভ', 'profit') : L('ক্ষতি', 'loss')}</span><span class="${nw >= 0 ? 'pos' : 'neg'}">${fmt(nw)}</span></div>
    </div>
  </details>`;
}

// হোমের প্রোডাক্ট তালিকা: প্রতিটার স্টক, দাম আর এক প্রেসে বিক্রি
function productDash(c) {
  if (!c.items.length) return '';
  const toTarget = sum(c.items.filter(x => x.remaining > 0).map(x => x.remaining * x.goalPrice));
  const cards = c.items.map(x => {
    const soldPct = x.units ? clamp((x.delivered + x.pending) / x.units * 100, 0, 100) : 0;
    const out = x.remaining < 1;
    return `<div class="dcard">
      <button type="button" class="prow" data-action="open-product" data-id="${x.p.id}">
        ${avatar(x.p)}
        <span class="pmain"><b>${esc(x.p.name)}</b>
          <small>${L('স্টক', 'Stock')} ${x.remaining}/${x.units} · ${L('খরচ', 'Cost')} ${fmt(x.unit)}${x.pending ? ` · ${L('পথে', 'Transit')} ${x.pending}` : ''}</small></span>
        <span class="pend"><b>${fmt(x.planned)}</b><small>${x.myPrice > 0 ? L('আপনার দাম', 'Your price') : L('বেচবেন', 'Sell at')}</small></span>
      </button>
      <div class="bar sm"><i style="width:${soldPct.toFixed(1)}%"></i></div>
      <div class="dsell">
        <button type="button" class="btn primary sm" data-action="quick-sell" data-id="${x.p.id}" data-qty="1" ${out ? 'disabled' : ''}>${L('+১ বিক্রি', '+1 sold')}</button>
        <button type="button" class="btn sm" data-action="quick-sell" data-id="${x.p.id}" data-qty="2" ${x.remaining < 2 ? 'disabled' : ''}>${L('+২', '+2')}</button>
        <button type="button" class="btn sm" data-action="add-sale" data-product="${x.p.id}" ${out ? 'disabled' : ''}>${L('ডিসকাউন্ট', 'Discount')}</button>
      </div>
    </div>`;
  }).join('');
  return `<section class="card">
    <div class="card-head"><h2>${L('আমার প্রোডাক্ট', 'My products')}</h2><span class="muted">${c.remainingUnits} ${L('টা বাকি', 'left')}</span></div>
    <div class="goalline"><span>${L('টার্গেটে যেতে বাকি স্টক বেচে তুলতে হবে', 'To hit target, sell remaining stock for')}</span><b>${fmt(toTarget)}</b></div>
    ${cards}
  </section>`;
}

// ধাপে ধাপে গাইড: কোনটা শেষ, এখন কোনটা করতে হবে
function stepsCard(b, c) {
  const steps = [
    { done: true, t: L('মূলধন ও টার্গেট ঠিক করা', 'Set capital and target'), d: L(`মূলধন ${fmt(c.capital)}, টার্গেট ${fmt(c.target)}`, `Capital ${fmt(c.capital)}, target ${fmt(c.target)}`) },
    { done: b.products.length > 0, t: L('প্রোডাক্ট যোগ করা', 'Add your product'), d: L('কী এনেছেন, কয়টা ইউনিট, কত দামে', 'What you bought, how many units, at what price'), a: 'add-product', btn: L('প্রোডাক্ট যোগ করুন', 'Add product') },
    { done: b.expenses.length > 0, t: L('খরচ যোগ করা', 'Add your costs'), d: L('অ্যাড, শিপিং, প্যাকেজিং, কুরিয়ার, যা লেগেছে', 'Ads, shipping, packaging, courier, anything you paid'), a: 'add-expense', btn: L('খরচ যোগ করুন', 'Add cost'), need: b.products.length > 0 },
    { done: b.sales.length > 0, t: L('বিক্রি লিখে রাখা', 'Record your sales'), d: L('প্রতিটা অর্ডার বিক্রি হলে এখানে লিখুন, লাভ নিজে হিসাব হবে', 'Log each order, the profit is worked out for you'), a: 'add-sale', btn: L('বিক্রি যোগ করুন', 'Add sale'), need: b.products.length > 0 },
  ];
  if (steps.every(s => s.done)) return '';
  const cur = steps.findIndex(s => !s.done && s.need !== false);
  const done = steps.filter(s => s.done).length;
  return `<section class="card steps">
    <div class="card-head"><h2>${L('শুরু করুন: ধাপে ধাপে', 'Get going, step by step')}</h2><span class="muted" style="font-size:13px;font-weight:700">${L(`${done}/4 শেষ`, `${done}/4 done`)}</span></div>
    <ol class="steplist">${steps.map((s, i) => `<li class="${s.done ? 'done' : i === cur ? 'now' : 'later'}">
      <span class="sn">${s.done ? icon('check', 16) : i + 1}</span>
      <div class="sb"><b>${L('ধাপ', 'Step')} ${i + 1}: ${s.t}</b><small>${s.d}</small>
        ${i === cur && s.a ? `<button type="button" class="btn primary sm" data-action="${s.a}">${icon('plus', 16)} ${s.btn}</button>` : ''}</div></li>`).join('')}</ol>
  </section>`;
}

// আদর্শ বাজেট: ডোনাট চার্ট + প্রতিটা খাতে আদর্শ বনাম আসল খরচ
function budgetBlock(b, c) {
  const cap = c.capital;
  const actual = budgetActual(c), wr = warnRatio(b);
  const colorOf = k => `var(--c-${k})`;
  const ideal = Object.fromEntries(BUDGET_KEYS.map(k => [k, limitOf(b, k)]));
  const idealSum = sum(Object.values(ideal)) || 1;
  let acc = 0;
  const segs = BUDGET_KEYS.filter(k => ideal[k] > 0).map(k => {
    const p = ideal[k] / idealSum * 100;
    const s = `<circle class="dseg" cx="21" cy="21" r="15.9155" stroke="${colorOf(k)}" stroke-dasharray="${Math.max(0, p - 0.6).toFixed(2)} ${(100 - Math.max(0, p - 0.6)).toFixed(2)}" stroke-dashoffset="${(25 - acc).toFixed(2)}"/>`;
    acc += p;
    return s;
  }).join('');
  const overKeys = BUDGET_KEYS.filter(k => k !== 'reserve' && actual[k] > ideal[k] + 0.5);
  const overTotal = sum(overKeys.map(k => actual[k] - ideal[k]));
  const reserveShort = Math.max(0, ideal.reserve - actual.reserve);
  const spentPct = cap > 0 ? c.spent / cap * 100 : 0;
  const summary = overKeys.length
    ? `<div class="bsum bad"><b>${fmt(overTotal)} ${L('বাজেটের বেশি খরচ', 'over budget')}</b><span>${overKeys.map(k => `${bl(k)} +${fmt(actual[k] - ideal[k])}`).join(' · ')}</span></div>`
    : (reserveShort > 0.5
      ? `<div class="bsum warn"><b>${L('রিজার্ভ কমে গেছে', 'Reserve is low')}</b><span>${L(`আদর্শ রিজার্ভের চেয়ে ${fmt(reserveShort)} কম`, `${fmt(reserveShort)} below the ideal reserve`)}</span></div>`
      : `<div class="bsum ok"><b>${L('সব খাত আদর্শ বাজেটের ভেতরে', 'All categories within budget')}</b><span>${L('এভাবেই চালিয়ে যান', 'Keep it up')}</span></div>`);
  const rowsHtml = BUDGET_KEYS.map(k => {
    const rec = ideal[k];
    const a = actual[k];
    const ratio = rec > 0 ? a / rec : (a > 0 ? 2 : 0);
    const over = k !== 'reserve' && a > rec + 0.5;
    const near = k !== 'reserve' && !over && a > 0 && ratio >= wr;
    let status;
    if (k === 'reserve') status = a >= rec - 0.5 ? `<span class="ok">${L('ঠিক আছে', 'OK')}</span>` : `<span class="bad">${fmt(rec - a)} ${L('কম', 'short')}</span>`;
    else if (over) status = `<span class="bad">${fmt(a - rec)} ${L('বেশি', 'over')}</span>`;
    else status = near ? `<span class="nearc">${fmt(rec - a)} ${L('বাকি', 'left')} · ${pct(ratio * 100)}</span>` : `<span>${fmt(rec - a)} ${L('বাকি', 'left')}</span>`;
    const idealPct = cap > 0 ? rec / cap * 100 : 0;
    return `<div class="brow">
      <div class="brow-top"><i class="dot" style="--c:${colorOf(k)}"></i><span class="grow">${bl(k)}</span>
        <span class="amt">${fmt(a)} <small>/ ${fmt(rec)}</small></span></div>
      <div class="bbar"><span class="${over ? 'over' : near ? 'near' : ''}" style="--c:${colorOf(k)};width:${(clamp(ratio, 0, 1) * 100).toFixed(1)}%"></span></div>
      <div class="brow-meta"><span>${L('আদর্শ', 'Ideal')} ${pct(idealPct)} · ${L('খরচ', 'used')} ${cap > 0 ? pct(a / cap * 100) : '0%'}</span>${status}</div>
    </div>`;
  }).join('');
  return `<div class="donut-wrap">
      <div class="donut"><svg viewBox="0 0 42 42" role="img" aria-label="${L('আদর্শ বাজেট ভাগ', 'Ideal budget split')}"><circle cx="21" cy="21" r="15.9155" class="dbg"/>${segs}</svg>
        <div class="dcenter"><small>${L('মূলধন', 'Capital')}</small><b>${fmt(cap)}</b><em>${L('খরচ', 'spent')} ${pct(spentPct)}</em></div></div>
      <div class="dlegend">${BUDGET_KEYS.map(k => `<div><i style="--c:${colorOf(k)}"></i><span>${bl(k)}</span><b>${pct(cap > 0 ? ideal[k] / cap * 100 : 0)}</b></div>`).join('')}</div>
    </div>
    ${summary}
    <div class="brows">${rowsHtml}</div>`;
}

/* ---------- প্রোডাক্ট ---------- */
function viewProducts(b, c) {
  const cards = c.items.map(x => {
    const soldW = x.units ? x.delivered / x.units * 100 : 0;
    const pendW = x.units ? x.pending / x.units * 100 : 0;
    return `<div class="pcard" role="button" tabindex="0" data-action="open-product" data-id="${x.p.id}">
      <div class="pc-head">
        ${avatar(x.p)}
        <span class="pmain"><b>${esc(x.p.name)}</b><small>${L('স্টক', 'Stock')} ${x.remaining}/${x.units} · ${L('বিক্রি', 'Sold')} ${x.delivered}${x.pending ? ` · ${L('পথে', 'In transit')} ${x.pending}` : ''}</small></span>
        <span class="price-pill">${fmt(x.planned)}</span>
      </div>
      <div class="pc-grid">
        <div><small>${L('খরচ/ইউনিট', 'Cost/unit')}</small><b>${fmt(x.unit)}</b></div>
        <div><small>${L('সর্বনিম্ন দাম', 'Min price')}</small><b>${fmt(ceil10(x.breakeven))}</b></div>
        <div><small>${L('ইউনিটে লাভ', 'Profit/unit')}</small><b class="${x.unitProfit >= 0 ? 'pos' : 'neg'}">${fmt(x.unitProfit)}</b></div>
      </div>
      <div class="stockbar"><span class="s-sold" style="width:${soldW}%"></span><span class="s-pend" style="width:${pendW}%"></span></div>
      <div class="pc-actions"><span class="muted">${L('ট্যাপ করে বিস্তারিত দেখুন', 'Tap for details')}</span>${delBtn('delete-product', x.p.id).replace('class="rowdel"', 'class="rowdel inline"')}</div>
    </div>`;
  }).join('');
  return `<div class="page-head"><h1>${L('প্রোডাক্ট', 'Products')}</h1>
      <button type="button" class="btn primary sm" data-action="add-product">${icon('plus', 18)} ${L('নতুন', 'New')}</button></div>
    ${c.items.length ? `<div>${cards}</div>
      <p class="hint" style="padding:0 4px">${L('ট্যাপ করুন: খরচের ভাগ, টার্গেট দাম আর দাম বদলালে কী হয় দেখতে।', 'Tap a product to see its cost breakdown, target price, and what-if pricing.')}</p>`
    : empty('📦', L('কোনো প্রোডাক্ট নেই', 'No products yet'), L('যে প্রোডাক্ট এনেছেন সেটা যোগ করুন। কয়টা ইউনিট, কত দামে কিনেছেন।', 'Add the product you brought in: how many units and what you paid.'),
      `<button type="button" class="btn primary" data-action="add-product">${icon('plus', 18)} ${L('প্রোডাক্ট যোগ করুন', 'Add product')}</button>`)}`;
}

function productDetail(id) {
  const b = activeBatch(), c = compute(b);
  const x = c.items.find(i => i.p.id === id);
  if (!x) return closeSheet();
  const p = x.p;
  const order = ['product', 'shipping', 'ads', 'packaging', 'courier', 'returns', 'other'];
  const brk = order.filter(k => x.byCat[k] > 0.004).map(k => `<div><i class="dot" style="--c:var(--c-${k})"></i>
      <span>${cl(k)}</span><b>${fmt(x.units ? x.byCat[k] / x.units : 0)}</b><em>${L('মোট', 'total')} ${fmt(x.byCat[k])}</em></div>`).join('');
  const top = order.filter(k => x.byCat[k] > 0).sort((a, z) => x.byCat[z] - x.byCat[a])[0];
  const min = Math.max(0, Math.floor(x.breakeven * 0.7 / 10) * 10);
  const max = ceil10(Math.max(x.goalPrice * 2, x.breakeven * 2, 100));
  const startPrice = x.planned;
  const perU = L('/ইউনিট', '/unit');
  const buyLine = p.currency && p.currency !== 'BDT'
    ? `${L('কেনা', 'Bought')} ${CUR[p.currency]}${esc(p.priceInput)}${p.priceMode === 'total' ? L(' মোট', ' total') : perU} × ${L('রেট', 'rate')} ${esc(p.rate)}`
    : `${L('কেনা', 'Bought')} ${fmt(toNum(p.unitCost))}${perU}`;
  openSheet(`
    <div class="sheet-head">${avatar(p, 'avatar lg')}
      <h3>${esc(p.name)}<small>${x.units} ${L('ইউনিট', 'units')} · ${buyLine}</small></h3>
      <button type="button" class="icon-btn" data-action="edit-product" data-id="${p.id}" aria-label="${L('এডিট', 'Edit')}">${icon('edit', 19)}</button>
      <button type="button" class="icon-btn" data-action="close-sheet" aria-label="${L('বন্ধ করুন', 'Close')}">${icon('x', 20)}</button></div>
    ${imgURL.has(p.id) ? `<img class="pd-photo" src="${imgURL.get(p.id)}" alt="${esc(p.name)}">` : ''}

    <div class="bignum"><small>${L('সব খরচ মিলিয়ে প্রতি ইউনিট পড়ছে', 'All-in cost per unit')}</small><b>${fmt(x.unit)}</b>
      <div class="brk">${brk || `<div><span></span><span>${L('এখনও কোনো খরচ নেই', 'No costs yet')}</span></div>`}</div></div>

    <div class="trio">
      <div><small>${L('সর্বনিম্ন দাম<br>(লাভও নেই, লসও নেই)', 'Break-even<br>(no profit, no loss)')}</small><b>${fmt(ceil10(x.breakeven))}</b></div>
      <div class="hl"><small>${L('টার্গেট পূরণের দাম', 'Price to hit target')}</small><b>${fmt(x.goalPrice)}</b></div>
      <div><small>${L('আপনার ঠিক করা দাম', 'Your set price')}</small><b>${x.myPrice > 0 ? fmt(x.myPrice) : '—'}</b></div>
    </div>
    ${x.remaining > 0
      ? `<p class="explain">${L(
        `টার্গেট দাম = খরচ ${fmt(x.unit)} + লাভ ${fmt(x.profitPart)} + রিটার্ন/COD বাফার ${fmt(x.goalPrice - x.unit - x.profitPart)} (রাউন্ড করে)। বাকি ${cnt(x.remaining)} এই দামে বেচলে টার্গেট পূরণ হবে।`,
        `Target price = cost ${fmt(x.unit)} + profit ${fmt(x.profitPart)} + return/COD buffer ${fmt(x.goalPrice - x.unit - x.profitPart)} (rounded). Sell the remaining ${x.remaining} at this price to hit the target.`)}</p>`
      : `<p class="explain">${L('এই প্রোডাক্টের সব ইউনিট বিক্রি/পথে আছে।', 'All units of this product are sold or in transit.')}</p>`}
    ${top ? `<p class="explain">${L(
      `জানা খরচ: কেনা দাম আর আপনার লেখা খরচ মিলিয়ে প্রতি ইউনিট ${fmt(x.unit)}। সবচেয়ে বড় খরচ ${cl(top)} (${pct(x.byCat[top] / x.total * 100)})। আনুমানিক: রিটার্ন/ড্যামেজ ${pct(c.r * 100)} আর COD ${pct(c.cod * 100)} (ব্যাচ সেটিংসে বদলানো যায়)। লাভের নিশ্চয়তা নয়।`,
      `Known costs: purchase price plus the costs you recorded, ${fmt(x.unit)} per unit. Biggest cost: ${cl(top)} (${pct(x.byCat[top] / x.total * 100)}). Estimates: returns/damage ${pct(c.r * 100)} and COD ${pct(c.cod * 100)} (change in batch settings). Not a guarantee of profit.`)}</p>` : ''}

    ${x.remaining > 0 ? `<form class="sim" data-live="sim" data-id="${p.id}" onsubmit="return false">
      <h4>${L('দাম বদলিয়ে দেখুন', 'Try a different price')}</h4>
      <input type="range" name="range" min="${min}" max="${max}" step="10" value="${clamp(startPrice, min, max)}" aria-label="${L('দাম', 'Price')}">
      ${moneyInput('price', startPrice)}
      <div data-sim-out>${simOut(c, x, startPrice)}</div>
      <div class="btn-row">
        ${x.myPrice > 0 ? `<button type="button" class="btn" data-action="clear-price" data-id="${p.id}">${L('টার্গেট দামে ফিরুন', 'Use target price')}</button>` : ''}
        <button type="button" class="btn primary" data-action="save-price" data-id="${p.id}">${icon('check', 18)} ${L('এই দাম সেট করুন', 'Set this price')}</button>
      </div>
    </form>` : ''}

    <div class="kv">
      <div><small>${L('ডেলিভারড', 'Delivered')}</small><b>${x.delivered} ${L('ইউনিট', 'units')}</b></div>
      <div><small>${L('পেন্ডিং / রিটার্ন', 'Pending / returned')}</small><b>${x.pending} / ${x.returned}</b></div>
      <div><small>${L('বিক্রি থেকে এসেছে', 'Earned from sales')}</small><b>${fmt(x.revenue)}</b></div>
      <div><small>${L('লাভ (বিক্রিত ইউনিটে)', 'Profit (units sold)')}</small><b class="${x.profit >= 0 ? 'pos' : 'neg'}">${fmt(x.profit)}</b></div>
    </div>
    <div class="btn-row mt12">
      <button type="button" class="btn good" data-action="add-sale" data-product="${p.id}" ${x.remaining > 0 ? '' : 'disabled'}>${icon('trend', 18)} ${L('বিক্রি', 'Sale')}</button>
      <button type="button" class="btn" data-action="add-expense" data-product="${p.id}">${icon('receipt', 18)} ${L('খরচ', 'Cost')}</button>
    </div>
    <button type="button" class="btn danger block mt8" data-action="delete-product" data-id="${p.id}">${icon('trash', 18)} ${L('প্রোডাক্ট ডিলিট', 'Delete product')}</button>
  `);
}

function simOut(c, x, price) {
  const perUnit = price * (1 - c.cod) - x.unit;
  const margin = price > 0 ? perUnit / price * 100 : 0;
  const projected = c.projected - x.remaining * x.planned * c.factor + x.remaining * price * c.factor;
  const ok = projected >= c.target - 1;
  return `<div class="sim-grid">
      <div><small>${L('প্রতি ইউনিটে লাভ', 'Profit per unit')}</small><b class="${perUnit >= 0 ? 'pos' : 'neg'}">${fmt(perUnit)}</b></div>
      <div><small>${L('মার্জিন', 'Margin')}</small><b>${pct(margin)}</b></div>
      <div><small>${L(`বাকি ${cnt(x.remaining)}য় লাভ`, `Profit on ${x.remaining} left`)}</small><b class="${perUnit >= 0 ? 'pos' : 'neg'}">${fmt(perUnit * x.remaining)}</b></div>
    </div>
    <div class="sim-goal ${ok ? 'ok' : 'no'}">${ok
      ? L(`✓ এই দামে শেষে প্রায় ${fmt(projected)} হবে। টার্গেট পূরণ হবে।`, `✓ At this price you'll end with about ${fmt(projected)}. Target reached.`)
      : L(`✗ এই দামে শেষে প্রায় ${fmt(projected)} হবে। টার্গেট থেকে ${fmt(c.target - projected)} কম।`, `✗ At this price you'll end with about ${fmt(projected)}, ${fmt(c.target - projected)} short of target.`)}</div>`;
}

function productForm(p) {
  const isNew = !p;
  const v = p || { emoji: '📦', priceMode: 'unit', currency: 'BDT' };
  const cur = v.currency || 'BDT';
  const rate = v.rate || state.settings.rates[cur] || '';
  pendingImg = undefined;
  return `${sheetHead(isNew ? L('নতুন প্রোডাক্ট', 'New product') : L('প্রোডাক্ট এডিট', 'Edit product'), isNew && !activeBatch().products.length ? L('ধাপ ২: কী এনেছেন, কয়টা, কত দামে', 'Step 2: what you bought, how many, at what price') : '')}
  <form data-form="product" data-live="product" data-id="${p ? p.id : ''}" autocomplete="off">
    <label class="field"><span>${L('প্রোডাক্টের নাম', 'Product name')}</span>
      <input class="input" name="name" maxlength="60" value="${esc(v.name || '')}" placeholder="${L('যেমন: মিনি পোর্টেবল ফ্যান', 'e.g. Mini portable fan')}"></label>
    <div class="field"><span class="flabel">${L('আইকন', 'Icon')}</span><div class="emoji-row">${EMOJIS.map(em =>
      `<label class="emo"><input type="radio" name="emoji" value="${em}" ${em === v.emoji ? 'checked' : ''}><span>${em}</span></label>`).join('')}</div></div>
    <div class="field"><span class="flabel">${L('ছবি (ঐচ্ছিক)', 'Photo (optional)')}</span>
      <div class="img-pick" data-img-pick data-pid="${p ? p.id : ''}">${imgPickInner(p ? imgURL.get(p.id) : '', v.emoji)}</div>
      <input type="file" accept="image/*" data-img-input hidden>
      <div class="hint">${L('ফোনের গ্যালারি/ক্যামেরা বা কম্পিউটারের ফোল্ডার থেকে বাছুন। ছবি শুধু এই ডিভাইসে থাকে।', 'Pick from your phone gallery/camera or a folder on your computer. Photos stay on this device only.')}</div></div>
    <label class="field"><span>${L('১. কয়টা ইউনিট (পিস) কিনেছেন?', '1. How many units (pieces) did you buy?')}</span>
      <input class="input" name="units" inputmode="numeric" value="${esc(v.units ?? '')}" placeholder="${L('যেমন: 5', 'e.g. 5')}">${hintLine(L('শুধু সংখ্যা লিখুন। এই সংখ্যা দিয়েই প্রতি ইউনিটের খরচ বের হবে।', 'Just a number. The cost per unit is worked out from this.'))}</label>
    <div class="field"><span class="flabel" data-price-label>${L('২. কেনা দাম', '2. Purchase price')}</span>
      ${seg('priceMode', [['unit', L('প্রতি ইউনিট', 'Per unit')], ['total', L('সব মিলিয়ে মোট', 'Total for all')]], v.priceMode || 'unit')}
      <div class="mt8">${seg('currency', [['BDT', L('৳ টাকা', '৳ Taka')], ['CNY', L('¥ ইউয়ান', '¥ Yuan')], ['USD', L('$ ডলার', '$ Dollar')]], cur)}</div>
      <div class="input-wrap has-prefix mt8"><span class="prefix" data-cur>${CUR[cur]}</span>
        <input class="input" name="priceInput" inputmode="decimal" value="${esc(v.priceInput ?? '')}" placeholder="0"></div>
      <div class="input-wrap has-prefix mt8 ${cur === 'BDT' ? 'hidden' : ''}" data-rate-wrap><span class="prefix">৳</span>
        <input class="input" name="rate" inputmode="decimal" value="${esc(rate)}" placeholder=""></div>
    </div>
    <div class="preview" data-preview></div>
    <details class="more" ${v.weight || v.note ? 'open' : ''}><summary>${L('আরও (ঐচ্ছিক)', 'More (optional)')}</summary>
      <label class="field"><span>${L('প্রতি ইউনিটের ওজন (গ্রাম)', 'Weight per unit (grams)')}</span>
        <input class="input" name="weight" inputmode="decimal" value="${esc(v.weight || '')}" placeholder="${L('যেমন: 250', 'e.g. 250')}">
        <div class="hint">${L('সব প্রোডাক্টের ওজন দিলে কার্গো খরচ ওজন অনুযায়ী ভাগ হবে।', 'If every product has a weight, cargo cost is split by weight.')}</div></label>
      <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="120" value="${esc(v.note || '')}" placeholder="${L('সাপ্লায়ার, লিংক ইত্যাদি', 'Supplier, link, etc.')}"></label>
    </details>
    <button class="btn primary block" type="submit">${isNew ? L('যোগ করুন', 'Add') : L('সেভ করুন', 'Save')}</button>
  </form>`;
}
function imgPickInner(url, emoji) {
  return `${url ? `<span class="avatar lg has-img"><img src="${url}" alt=""></span>` : `<span class="avatar lg">${emoji || '📦'}</span>`}
    <div class="img-btns"><button type="button" class="btn sm" data-action="pick-img">${icon('upload', 16)} ${url ? L('ছবি বদলান', 'Change photo') : L('ছবি বাছুন', 'Choose photo')}</button>
    ${url ? `<button type="button" class="btn sm" data-action="remove-img">${icon('trash', 16)} ${L('সরান', 'Remove')}</button>` : ''}</div>`;
}
function showImgPreview() {
  const box = $('[data-img-pick]');
  if (!box) return;
  if (pendingPrev) { URL.revokeObjectURL(pendingPrev); pendingPrev = ''; }
  if (pendingImg) pendingPrev = URL.createObjectURL(pendingImg);
  const url = pendingImg === undefined ? imgURL.get(box.dataset.pid) : pendingPrev;
  const f = box.closest('form');
  box.innerHTML = imgPickInner(url, f && f.elements.emoji.value);
}
document.addEventListener('change', async e => {
  if (!e.target.matches || !e.target.matches('[data-img-input]')) return;
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const f = e.target.closest('form');
  try {
    pendingImg = await compressImage(file);
    showImgPreview();
    $$('.form-error', f).forEach(n => n.remove());
  } catch (err) {
    const why = err.message === 'size' ? L(`ছবিটা অনেক বড় (${Math.round(file.size / 1048576)}MB)। ${IMG_MAX_BYTES / 1048576}MB-এর ছোট ছবি দিন।`, `That image is too large (${Math.round(file.size / 1048576)}MB). Pick one under ${IMG_MAX_BYTES / 1048576}MB.`)
      : err.message === 'type' ? L('এটা ছবি না। JPG, PNG বা WebP ছবি বাছুন।', 'That is not an image. Pick a JPG, PNG or WebP photo.')
      : L('ছবিটা খোলা যায়নি (ফরম্যাট সাপোর্ট নেই বা ফাইল নষ্ট)। অন্য ছবি বা JPG চেষ্টা করুন।', 'Could not read that image (unsupported format or damaged file). Try another photo or a JPG.');
    fail(f, why);
  }
});
function productCalc(f) {
  const units = Math.floor(toNum(f.elements.units.value));
  const cur = f.elements.currency.value || 'BDT';
  const mode = f.elements.priceMode.value || 'unit';
  const input = toNum(f.elements.priceInput.value);
  const rate = cur === 'BDT' ? 1 : toNum(f.elements.rate.value);
  const totalBDT = mode === 'unit' ? input * rate * units : input * rate;
  const unitBDT = mode === 'unit' ? input * rate : (units ? input * rate / units : 0);
  return { units, cur, mode, input, rate, unitBDT, totalBDT };
}

/* ---------- খরচ ---------- */
function viewExpenses(b, c) {
  const pname = id => { const p = b.products.find(q => q.id === id); return p ? `${p.emoji} ${p.name}` : L('সব প্রোডাক্টে ভাগ', 'Split across all'); };
  const list = [...b.expenses].sort(byDateDesc).filter(e => expFilter === 'all' || e.category === expFilter);
  const used = EXPENSE_CATS.filter(k => b.expenses.some(e => e.category === k));
  const rows = list.map(e => `
    <div class="lwrap"><button type="button" class="lrow" data-action="edit-expense" data-id="${e.id}">
      <span class="lic dotted" style="--c:var(--c-${e.category})">${cicon(e.category)}</span>
      <span class="lmain"><b>${esc(e.note || cl(e.category))}</b>
        <small>${cl(e.category)} · ${esc(pname(e.productId))}</small></span>
      <span class="lend"><b>${fmt(toNum(e.amount))}</b><small>${fmtDate(e.date)}</small></span>
    </button>${delBtn('delete-expense', e.id)}</div>`).join('');
  const catRows = ['product', ...EXPENSE_CATS, 'returns'].filter(k => c.cat[k] > 0)
    .map(k => `<div><span>− ${cicon(k)} ${cl(k)}</span><span>${fmt(c.cat[k])}</span></div>`).join('');
  const usedPct = c.capital > 0 ? clamp(c.spent / c.capital * 100, 0, 100) : 0;
  const live = `<section class="card">
      <div class="bignum"><small>${L('এখন হাতে আছে (লাইভ)', 'Cash in hand now (live)')}</small>
        <b class="${c.cash < 0 ? 'neg' : ''}">${fmt(c.cash)}</b></div>
      <div class="bar"><i style="width:${usedPct}%"></i></div>
      <div class="ledger">
        <div><span>${L('মূলধন', 'Capital')}</span><span>${fmt(c.capital)}</span></div>
        ${catRows}
        ${c.revenue > 0 ? `<div><span>+ ${L('বিক্রি থেকে এসেছে', 'From sales')}</span><span>${fmt(c.revenue)}</span></div>` : ''}
        <div class="total"><span>= ${L('হাতে ক্যাশ', 'Cash in hand')}</span><span>${fmt(c.cash)}</span></div>
      </div>
      ${c.cash < 0 ? `<p class="hint neg">${L('মূলধনের চেয়ে বেশি খরচ হয়ে গেছে।', 'You have spent more than your capital.')}</p>` : ''}
    </section>`;
  return `<div class="page-head"><h1>${L('খরচ', 'Costs')}</h1>
      <button type="button" class="btn primary sm" data-action="add-expense">${icon('plus', 18)} ${L('খরচ', 'Cost')}</button></div>
    ${live}
    <div class="minis">
      <div class="mini"><small>${L('মোট খরচ', 'Total spent')}</small><b>${fmt(c.spent)}</b></div>
      <div class="mini"><small>${L('প্রোডাক্ট কেনা', 'Products')}</small><b>${fmt(c.cat.product)}</b></div>
      <div class="mini"><small>${L('অন্য সব খরচ', 'Everything else')}</small><b>${fmt(c.spent - c.cat.product)}</b></div>
    </div>
    ${used.length > 1 ? `<div class="chiprow">
      <button type="button" class="fchip ${expFilter === 'all' ? 'active' : ''}" data-action="exp-filter" data-cat="all">${L('সব', 'All')}</button>
      ${used.map(k => `<button type="button" class="fchip ${expFilter === k ? 'active' : ''}" data-action="exp-filter" data-cat="${k}">${cicon(k)} ${cl(k)} · ${fmt(c.cat[k])}</button>`).join('')}
    </div>` : ''}
    ${list.length ? `<div class="list">${rows}</div>`
    : empty('🧾', L('কোনো খরচ নেই', 'No costs yet'),
      L('অ্যাড, শিপিং, প্যাকেজিং, কুরিয়ার, যা খরচ হয় সব এখানে দিন। প্রোডাক্ট কেনার দাম প্রোডাক্ট ট্যাবে দেওয়া হয়।', 'Add ads, shipping, packaging, courier, every cost goes here. Product purchase price goes in the Products tab.'),
      `<button type="button" class="btn primary" data-action="add-expense">${icon('plus', 18)} ${L('খরচ যোগ করুন', 'Add cost')}</button>`)}`;
}

function expenseForm(e, presetProduct) {
  const b = activeBatch();
  const isNew = !e;
  const v = e || { category: 'ads', productId: presetProduct || '', date: today() };
  const hasUnits = expenseUnits(b, '') > 0;
  return `${sheetHead(isNew ? L('নতুন খরচ', 'New cost') : L('খরচ এডিট', 'Edit cost'), isNew && !b.expenses.length ? L('ধাপ ৩: অ্যাড, শিপিং, প্যাকেজিং, যা খরচ হয়েছে', 'Step 3: ads, shipping, packaging, whatever you spent') : '')}
  <form data-form="expense" data-live="expense" data-id="${e ? e.id : ''}" autocomplete="off">
    <div class="field"><span class="flabel">${L('কিসের খরচ?', 'What for?')}</span><div class="chips">${EXPENSE_CATS.map(k =>
      `<label class="chip"><input type="radio" name="category" value="${k}" ${k === v.category ? 'checked' : ''}><span>${cicon(k)} ${cl(k)}</span></label>`).join('')}</div></div>
    <label class="field"><span>${L('কোন প্রোডাক্টের জন্য?', 'For which product?')}</span>
      <select class="input" name="productId"><option value="">${L('সব প্রোডাক্টে ভাগ হবে (অটো)', 'Split across all products (auto)')}</option>
      ${b.products.map(p => `<option value="${p.id}" ${p.id === v.productId ? 'selected' : ''}>${p.emoji || ''} ${esc(p.name)}</option>`).join('')}</select></label>
    <div class="field"><span class="flabel">${L('কিভাবে টাকা লিখবেন?', 'How do you want to enter it?')}</span>
      ${seg('mode', [['total', L('মোট টাকা', 'Total amount')], ['unit', L('প্রতি ইউনিটে', 'Per unit')]], v.perUnit && hasUnits ? 'unit' : 'total', hasUnits ? [] : ['unit'])}
      <div class="hint">${hasUnits ? L('যেমন প্যাকেজিং প্রতিটায় ৳20 হলে "প্রতি ইউনিটে" বেছে ২০ লিখুন, app নিজে সব ইউনিটে গুণ করবে।', 'E.g. packaging ৳20 each: pick "Per unit", type 20, the app multiplies for you.') : L('"প্রতি ইউনিটে" চালু হবে প্রোডাক্ট যোগ করলে (ইউনিট কয়টা জানা দরকার)।', '"Per unit" unlocks once you add a product (the app needs the unit count).')}</div></div>
    <label class="field"><span data-amt-label></span>${moneyInput('amount', v.perUnit && hasUnits ? v.perUnitAmount : v.amount)}</label>
    <div class="preview" data-preview></div>
    <div class="row2">
      <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(v.date || today())}"></label>
      <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="80" value="${esc(v.note || '')}" placeholder="${L('ঐচ্ছিক', 'Optional')}"></label>
    </div>
    <button class="btn primary block" type="submit">${isNew ? L('যোগ করুন', 'Add') : L('সেভ করুন', 'Save')}</button>
    ${!isNew ? `<button type="button" class="btn danger block mt8" data-action="delete-expense" data-id="${e.id}">${icon('trash', 18)} ${L('ডিলিট', 'Delete')}</button>` : ''}
  </form>`;
}
function expenseUnits(b, productId) {
  if (productId) { const p = b.products.find(q => q.id === productId); return p ? Math.floor(toNum(p.units)) : 0; }
  return sum(b.products.map(p => Math.floor(toNum(p.units))));
}

/* ---------- বিক্রি ---------- */
function viewSales(b, c) {
  const pmap = new Map(b.products.map(p => [p.id, p]));
  const list = [...b.sales].sort(byDateDesc);
  const rows = list.map(s => {
    const p = pmap.get(s.productId);
    const gross = Math.max(0, toNum(s.qty) * toNum(s.price) - toNum(s.discount));
    return `<div class="lwrap"><button type="button" class="lrow" data-action="edit-sale" data-id="${s.id}">
      ${p ? avatar(p, 'lic') : '<span class="lic">❔</span>'}
      <span class="lmain"><b>${esc(p ? p.name : L('মুছে ফেলা প্রোডাক্ট', 'Deleted product'))} × ${toNum(s.qty)}</b>
        <small><span class="badge ${s.status}">${statusLabel(s.status)}</span> ${esc(s.note || '')}</small></span>
      <span class="lend"><b class="${s.status === 'returned' ? 'neg' : ''}">${s.status === 'returned' ? fmt(-toNum(s.returnCost)) : fmt(gross)}</b><small>${fmtDate(s.date)}</small></span>
    </button>${delBtn('delete-sale', s.id)}</div>`;
  }).join('');
  return `<div class="page-head"><h1>${L('বিক্রি', 'Sales')}</h1>
      <button type="button" class="btn primary sm" data-action="add-sale" ${b.products.length ? '' : 'disabled'}>${icon('plus', 18)} ${L('বিক্রি', 'Sale')}</button></div>
    <div class="minis">
      <div class="mini"><small>${L('ডেলিভারড (নেট)', 'Delivered (net)')}</small><b class="pos">${fmt(c.revenue)}</b></div>
      <div class="mini"><small>${L('পেন্ডিং', 'Pending')}</small><b>${fmt(c.pendingNet)}</b></div>
      <div class="mini"><small>${L('রিটার্ন', 'Returns')}</small><b>${cnt(c.returnedOrders)}</b></div>
    </div>
    ${list.length ? `<div class="list">${rows}</div>`
    : empty('🛍️', L('এখনও বিক্রি নেই', 'No sales yet'),
      b.products.length
        ? L('প্রতিটা অর্ডার এখানে দিন। ডেলিভারি হলে ডেলিভারড, কুরিয়ারে থাকলে পেন্ডিং।', 'Add each order here: Delivered once paid, Pending while with the courier.')
        : L('আগে প্রোডাক্ট যোগ করুন, তারপর বিক্রি দিতে পারবেন।', 'Add a product first, then you can record sales.'),
      b.products.length
        ? `<button type="button" class="btn primary" data-action="add-sale">${icon('plus', 18)} ${L('বিক্রি যোগ করুন', 'Add sale')}</button>`
        : `<button type="button" class="btn primary" data-action="add-product">${icon('plus', 18)} ${L('প্রোডাক্ট যোগ করুন', 'Add product')}</button>`)}`;
}

// ডিসকাউন্ট ৳ বা % যেটাই হোক, মোট দাম থেকে কত টাকা কাটা যাবে
function saleDiscount(f, qty, price) {
  const v = Math.max(0, toNum(f.elements.discount.value));
  return f.elements.dmode.value === 'pct' ? qty * price * Math.min(v, 100) / 100 : v;
}
function availableFor(c, productId, editing) {
  const x = c.items.find(i => i.p.id === productId);
  if (!x) return 0;
  let a = x.remaining;
  if (editing && editing.productId === productId && editing.status !== 'returned') a += toNum(editing.qty);
  return a;
}
function saleForm(s, presetProduct) {
  const b = activeBatch(), c = compute(b);
  const isNew = !s;
  const firstAvail = (c.items.find(x => x.remaining > 0) || c.items[0] || {}).p;
  const v = s || { productId: presetProduct || (firstAvail && firstAvail.id), qty: 1, status: 'delivered', date: today() };
  const x = c.items.find(i => i.p.id === v.productId);
  const price = v.price ?? (x ? x.planned : '');
  return `${sheetHead(isNew ? L('নতুন বিক্রি', 'New sale') : L('বিক্রি এডিট', 'Edit sale'))}
  <form data-form="sale" data-live="sale" data-id="${s ? s.id : ''}" autocomplete="off">
    <label class="field"><span>${L('প্রোডাক্ট', 'Product')}</span><select class="input" name="productId">
      ${c.items.map(i => `<option value="${i.p.id}" ${i.p.id === v.productId ? 'selected' : ''}>${i.p.emoji || ''} ${esc(i.p.name)} · ${L('স্টক', 'stock')} ${availableFor(c, i.p.id, s)}</option>`).join('')}
    </select></label>
    <div class="field"><span class="flabel">${L('অবস্থা', 'Status')}</span>${seg('status', [['delivered', L('ডেলিভারড ✓', 'Delivered ✓')], ['pending', L('পেন্ডিং', 'Pending')], ['returned', L('রিটার্ন', 'Returned')]], v.status)}</div>
    <div class="row2">
      <div class="field"><span class="flabel">${L('কয়টা', 'Qty')}</span><div class="stepper">
        <button type="button" data-action="qty-step" data-d="-1" aria-label="−">−</button>
        <input class="input" name="qty" inputmode="numeric" value="${esc(v.qty)}">
        <button type="button" data-action="qty-step" data-d="1" aria-label="+">+</button></div></div>
      <label class="field"><span>${L('প্রতিটার দাম', 'Price each')}</span>${moneyInput('price', price)}</label>
    </div>
    <div class="field"><span class="flabel">${L('ডিসকাউন্ট (ঐচ্ছিক)', 'Discount (optional)')}</span>
      ${seg('dmode', [['amt', L('৳ টাকা অফ', '৳ off')], ['pct', L('% ছাড়', '% off')]], v.discountMode || 'amt')}
      <input class="input mt8" name="discount" inputmode="decimal" value="${esc(v.discountValue ?? (v.discount || ''))}" placeholder="0">
      <div class="hint">${L('মোট দাম থেকে কাটা হবে। যেমন ১০% বা ৳৫০।', 'Taken off the total, e.g. 10% or ৳50.')}</div></div>
    <label class="field ${v.status === 'returned' ? '' : 'hidden'}" data-return><span>${L('রিটার্নে কত টাকা খরচ গেল (কুরিয়ার চার্জ ইত্যাদি)', 'Cost of the return (courier fee etc.)')}</span>${moneyInput('returnCost', v.returnCost || '', L('যেমন: 120', 'e.g. 120'))}</label>
    <div class="preview" data-preview></div>
    <div class="row2">
      <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(v.date || today())}"></label>
      <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="80" value="${esc(v.note || '')}" placeholder="${L('কাস্টমার/এলাকা', 'Customer/area')}"></label>
    </div>
    <button class="btn primary block" type="submit">${isNew ? L('যোগ করুন', 'Add') : L('সেভ করুন', 'Save')}</button>
    ${!isNew ? `<button type="button" class="btn danger block mt8" data-action="delete-sale" data-id="${s.id}">${icon('trash', 18)} ${L('ডিলিট', 'Delete')}</button>` : ''}
  </form>`;
}

/* ---------- আরও ---------- */
function viewMore(b, c) {
  const lang = state.settings.lang;
  const last = state.settings.lastBackup ? new Date(state.settings.lastBackup) : null;
  const mi = (action, ic, title, sub) => `<button type="button" class="mitem" data-action="${action}">
    <span class="mi">${icon(ic, 20)}</span><span class="mt"><b>${title}</b><small>${sub}</small></span>${icon('chev', 18)}</button>`;
  return `<div class="page-head"><h1>${L('আরও', 'More')}</h1></div>
    <div class="section-title">${L('ব্যবসা', 'Business')}</div>
    <div class="menu">
      ${mi('edit-batch', 'sliders', L('ব্যাচ সেটিংস', 'Batch settings'), `${L('মূলধন', 'Capital')} ${fmt(c.capital)} · ${L('টার্গেট', 'Target')} ${fmt(c.target)} · ${L('বাফার', 'Buffer')} ${toNum(b.returnRate)}%`)}
      ${mi('batches', 'layers', L('সব ব্যাচ', 'All batches'), L(`${cnt(state.batches.length)} ব্যাচ · নতুন ব্যাচ শুরু করুন`, `${state.batches.length} batch(es) · start a new one`))}
      ${mi('edit-budget', 'pie', L('বাজেট পরিকল্পনা', 'Budget plan'), L('খাতভিত্তিক % বা ৳ সীমা ও সতর্কতা', 'Limits per category in % or ৳, with warnings'))}
      ${mi('calculator', 'calc', L('ব্যবসার পরিকল্পনা', 'Business planner'), L('মূলধনের ভাগ, দাম, টার্গেটে কয়টা বিক্রি লাগবে', 'Capital split, price, sales needed for your target'))}
    </div>
    <button type="button" class="btn danger block mt12" data-action="delete-batch" data-id="${b.id}">${icon('trash', 18)} ${L(`"${esc(b.name)}" ব্যাচ ডিলিট করুন`, `Delete batch "${esc(b.name)}"`)}</button>
    <div class="section-title">${L('অ্যাপ', 'App')}</div>
    <div class="menu">
      ${isStandalone() ? '' : mi('install-app', 'download', L('ফোনে ইনস্টল করুন', 'Install on phone'), L('একবার ইনস্টল করলে অফলাইনে চলবে', 'Works offline once installed'))}
      ${mi('guide', 'spark', L('কিভাবে ব্যবহার করবেন', 'How to use'), L('সব ফিচার আর দাম বের করার হিসাব', 'Every feature and how prices are worked out'))}
    </div>
    <div class="section-title">${L('ডেটা', 'Data')}</div>
    <div class="menu">
      ${mi('export', 'download', L('ব্যাকআপ নিন', 'Back up'), last ? `${L('শেষ ব্যাকআপ', 'Last backup')}: ${fmtDate(last.toISOString().slice(0, 10))}` : L('এখনও নেওয়া হয়নি', 'Not yet'))}
      ${mi('import', 'upload', L('ব্যাকআপ থেকে ফেরত আনুন', 'Restore backup'), L('আগের ব্যাকআপ ফাইল দিন', 'Pick a backup file'))}
    </div>
    <div class="section-title">${L('ভাষা', 'Language')}</div>
    <div class="seg">${[['bn', 'বাংলা'], ['en', 'English']].map(([v, l]) =>
      `<button type="button" class="${lang === v ? 'active' : ''}" data-action="lang" data-v="${v}">${l}</button>`).join('')}</div>
    <p class="about">${L('ভার্সন', 'Version')} ${APP_VERSION}<br>${L('হিসাবী · সব ডেটা শুধু এই ফোনে থাকে, কোনো সার্ভারে যায় না।<br>ফোন বদলালে বা অ্যাপ মুছলে ডেটা হারাবে, তাই মাঝে মাঝে ব্যাকআপ নিন।',
      'Hisabi · All data stays on this phone and never goes to a server.<br>Changing phones or deleting the app loses data, so back up now and then.')}<br><br>${L('বানিয়েছেন', 'Made by')} <a href="https://github.com/sakib69alive" target="_blank" rel="noopener">@sakib69alive</a></p>`;
}

const PRESETS = {
  balanced: { bn: 'ভারসাম্য', en: 'Balanced', note: ['প্রস্তাবিত, বেশিরভাগ ব্যবসার জন্য', 'Suggested for most shops'], v: DEFAULT_BUDGET },
  lean: { bn: 'কম ঝুঁকি', en: 'Low risk', note: ['বেশি রিজার্ভ, কম অ্যাড', 'More reserve, lighter ads'], v: { product: 55, shipping: 12, ads: 12, packaging: 5, courier: 3, other: 3, reserve: 10 } },
  ads: { bn: 'অ্যাড-নির্ভর', en: 'Ad-driven', note: ['ভাইরাল প্রোডাক্টে বেশি অ্যাড', 'Heavier ads for viral items'], v: { product: 42, shipping: 12, ads: 30, packaging: 4, courier: 3, other: 3, reserve: 6 } },
};
const round2 = n => Math.round(n * 100) / 100;
// ফর্মে দেখানোর % : ৳ সীমা আগে দেওয়া থাকলে সেটা % এ বদলে
function budgetPcts(b) {
  const cap = toNum(b.capital);
  const out = {};
  BUDGET_KEYS.forEach(k => {
    const lim = toNum((b.limits || {})[k]);
    out[k] = lim > 0 && cap > 0 ? round2(lim / cap * 100) : toNum(b.budget[k]);
  });
  const used = sum(BUDGET_KEYS.filter(k => k !== 'reserve').map(k => out[k]));
  out.reserve = round2(Math.max(0, 100 - used));
  return out;
}
function budgetForm(b) {
  const cap = toNum(b.capital);
  const pc = budgetPcts(b);
  return `${sheetHead(L('বাজেট পরিকল্পনা', 'Budget plan'), L(`মূলধন ${fmt(cap)} কোথায় কত খরচ করবেন`, `How to spend your ${fmt(cap)} capital`))}
  <form data-form="budget" data-live="budget" autocomplete="off">
    <div class="field"><span class="flabel">${L('তৈরি প্ল্যান বেছে নিন (পরে বদলাতে পারবেন)', 'Pick a ready plan (you can still edit)')}</span>
      <div class="plans">${Object.entries(PRESETS).map(([id, p]) => `<button type="button" class="plan" data-action="budget-preset" data-p="${id}"><b>${isEN() ? p.en : p.bn}</b><small>${p.note[isEN() ? 1 : 0]}</small></button>`).join('')}</div></div>
    <div class="bf-head"><span>${L('খাত', 'Category')}</span><span>%</span><span>৳</span></div>
    ${BUDGET_KEYS.map(k => {
      const ro = k === 'reserve';
      return `<div class="bfrow ${ro ? 'auto' : ''}">
      <div class="bf-name"><i class="dot" style="--c:var(--c-${k})"></i><span><b>${bl(k)}</b><small>${ro ? L('বাকিটা অটো এখানে আসে', 'The remainder, filled automatically') : bh(k)}</small></span></div>
      <div class="input-wrap"><input class="input" name="${k}" inputmode="decimal" value="${esc(pc[k])}" ${ro ? 'readonly tabindex="-1"' : ''} aria-label="${bl(k)} %"><span class="suffix">%</span></div>
      <div class="input-wrap has-prefix"><span class="prefix">৳</span><input class="input" name="lim_${k}" inputmode="numeric" value="${Math.round(cap * pc[k] / 100)}" ${ro ? 'readonly tabindex="-1"' : ''} aria-label="${bl(k)} ৳"></div></div>`;
    }).join('')}
    <div class="hint" style="margin:6px 0 14px">${L('% লিখলে ৳ নিজে বদলাবে, ৳ লিখলে % বদলাবে। রিজার্ভ বাকিটা নিজে নেয়, তাই মোট সবসময় ১০০%।', 'Type a % and the ৳ follows, type ৳ and the % follows. Reserve takes whatever is left, so the total is always 100%.')}</div>
    <label class="field"><span>${L('কত % খরচ হলে আগাম সতর্ক করবে', 'Warn me when a category reaches')}</span>
      <div class="input-wrap"><input class="input" name="warnAt" inputmode="decimal" value="${esc(b.warnAt ?? 80)}"><span class="suffix">%</span></div></label>
    <div class="preview" data-preview></div>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button>
  </form>`;
}

function calcForm(b) {
  const r = toNum(b.returnRate), cod = toNum(b.codRate);
  const f = (name, label, ph, val = '') => `<label class="field"><span>${label}</span>${moneyInput(name, val, ph)}</label>`;
  return `${sheetHead(L('ব্যবসার পরিকল্পনা', 'Business planner'), L('কিছু সেভ হবে না, শুধু দেখার জন্য', 'Nothing is saved, just for planning'))}
  <form data-live="calc" onsubmit="return false" autocomplete="off">
    <div class="row2">${f('capital', L('মূলধন', 'Capital'), '10000', toNum(b.capital) || '')}
      ${f('target', L('শেষে হাতে ক্যাশ চান (মূলধনসহ)', 'Final cash wanted (incl. capital)'), '12000', toNum(b.target) || '')}</div>
    <div class="row2">${f('buy', L('প্রতি ইউনিট কেনা দাম', 'Buy price per unit'), '1000')}
      <label class="field"><span>${L('কয়টা ইউনিট', 'Units')}</span><input class="input" name="units" inputmode="numeric" placeholder="5"></label></div>
    <div class="row2">${f('ship', L('শিপিং/কার্গো (মোট)', 'Shipping/cargo (total)'), '1000')}${f('ads', L('অ্যাড বাজেট (মোট)', 'Ad budget (total)'), '2000')}</div>
    <div class="row2">${f('pack', L('প্যাকেজিং (প্রতি ইউনিট)', 'Packaging (per unit)'), '50')}${f('courier', L('কুরিয়ার, নিজে দিলে (প্রতি অর্ডার)', 'Courier you pay (per order)'), '0')}</div>
    <div class="row2">${f('other', L('অন্যান্য (মোট)', 'Other (total)'), '500')}${f('sell', L('যে দামে বেচতে চান (ঐচ্ছিক)', 'Your selling price (optional)'), '')}</div>
    <div class="row2">
      <label class="field"><span>${L('লক্ষ্য লাভ', 'Goal profit')}</span><div class="input-wrap"><input class="input" name="margin" inputmode="decimal" value="20"><span class="suffix">%</span></div></label>
      <label class="field"><span>${L('রিটার্ন + COD', 'Return + COD')}</span><div class="row2" style="gap:6px">
        <div class="input-wrap"><input class="input" name="ret" inputmode="decimal" value="${r}"><span class="suffix">%</span></div>
        <div class="input-wrap"><input class="input" name="cod" inputmode="decimal" value="${cod}"><span class="suffix">%</span></div></div></label>
    </div>
    <div class="preview" data-preview></div>
  </form>`;
}

// প্ল্যানার থেকে মূলধনের ভাগ (৳); রিজার্ভ = বাকি মূলধন
function plannerSplit(f) {
  const g = n => toNum(f.elements[n].value);
  const units = Math.floor(g('units')), cap = g('capital');
  const v = { product: units * g('buy'), shipping: g('ship'), ads: g('ads'), packaging: units * g('pack'), courier: units * g('courier'), other: g('other') };
  v.reserve = cap - sum(Object.values(v));
  return { cap, v, rows: BUDGET_KEYS.map(k => [k, v[k]]), ok: cap > 0 && units > 0 && v.reserve >= 0 };
}

function batchesSheet() {
  return `${sheetHead(L('সব ব্যাচ', 'All batches'), L('প্রতিটা ইনভেস্টমেন্ট রাউন্ড আলাদা ব্যাচ', 'Each investment round is its own batch'))}
    <div class="blist">${state.batches.map(b => {
      const c = compute(b);
      return `<div class="lwrap"><button type="button" class="lrow" data-action="switch-batch" data-id="${b.id}">
        <span class="lic">${b.id === state.activeBatchId ? `<span class="check-mark">${icon('check', 20)}</span>` : '📒'}</span>
        <span class="lmain"><b>${esc(b.name)}</b><small>${L('মূলধন', 'Capital')} ${fmt(c.capital)} → ${L('টার্গেট', 'target')} ${fmt(c.target)}</small></span>
        <span class="lend"><b>${c.target > 0 ? Math.round(clamp(c.cash / c.target, 0, 9.99) * 100) : 0}%</b><small>${L('পূরণ', 'done')}</small></span>
      </button>${delBtn('delete-batch', b.id)}</div>`;
    }).join('')}</div>
    <button type="button" class="btn primary block mt12" data-action="new-batch">${icon('plus', 18)} ${L('নতুন ব্যাচ', 'New batch')}</button>`;
}

/* ---------- শিট (নিচ থেকে ওঠা প্যানেল) ---------- */
let sheetOpen = false;
function openSheet(html) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop" data-action="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-body">${html}</div></div>`;
  // মোবাইল ব্রাউজারের ঠিকানা-বারের কারণে vh ভুল হয়, তাই আসল উচ্চতা দিয়ে সীমা
  $('.sheet', root).style.maxHeight = Math.floor(window.innerHeight * 0.92) + 'px';
  root.classList.add('open');
  document.body.classList.add('lock');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('show')));
  if (!sheetOpen) {
    sheetOpen = true;
    history.pushState({ sheet: 1 }, '');
  }
  const f = root.querySelector('form[data-live]');
  if (f) runLive(f, null);
}
function hideSheet() {
  const root = $('#sheet-root');
  root.classList.remove('show');
  document.body.classList.remove('lock');
  setTimeout(() => { if (!sheetOpen) { root.classList.remove('open'); root.innerHTML = ''; } }, 300);
}
function closeSheet() {
  if (sheetOpen) history.back();
}
// অ্যান্ড্রয়েডের ব্যাক বাটনে শিট বন্ধ হবে
window.addEventListener('popstate', () => {
  if (sheetOpen) { sheetOpen = false; hideSheet(); }
});

let toastTimer;
function toast(msg, kind = '', act = null) {
  const t = $('#toast');
  t.textContent = msg;
  if (act) {
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'toast-act';
    bt.textContent = act.label;
    bt.onclick = () => { t.className = 'toast'; act.fn(); };
    t.appendChild(bt);
  }
  t.className = 'toast show ' + kind + (act ? ' has-act' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, act ? 7000 : 2400);
}
// মুছলে সাথে সাথে "ফিরিয়ে আনুন" বাটন আসে, তাই ভুল করে ডিলিট হলেও ভয় নেই
function undoable(msg, mutate) {
  const snap = JSON.stringify(state);
  mutate();
  save();
  render();
  toast(msg, '', { label: L('↶ ফিরিয়ে আনুন', '↶ Undo'), fn: () => { state = migrate(JSON.parse(snap)); commit(L('ফিরিয়ে আনা হয়েছে', 'Restored')); } });
}
// ভুল হলে ফর্মের ওপরেই লাল বক্স + ঘর হাইলাইট (কীবোর্ডের নিচে টোস্ট লুকিয়ে যেত)
function fail(f, msg, field) {
  $$('.form-error', f).forEach(n => n.remove());
  $$('.invalid', f).forEach(n => n.classList.remove('invalid'));
  const box = document.createElement('div');
  box.className = 'form-error';
  box.setAttribute('role', 'alert');
  box.textContent = msg;
  f.insertBefore(box, f.firstChild);
  const input = field && f.elements[field];
  if (input) {
    const wrap = input.closest ? input.closest('.field') : null;
    if (wrap) wrap.classList.add('invalid');
    try { input.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  box.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function commit(msg) {
  save();
  render();
  if (msg) toast(msg);
}
const SAVED = () => L('সেভ হয়েছে', 'Saved');
const DELETED = () => L('ডিলিট হয়েছে', 'Deleted');

/* =========================================================
   অ্যাকশন (বাটন ক্লিক)
   ========================================================= */
const ACTIONS = {
  'close-sheet': () => closeSheet(),
  tab: el => setTab(el.dataset.tab),
  'go-home': () => { if (sheetOpen) closeSheet(); setTab('home'); window.scrollTo(0, 0); },
  'toggle-lang': () => { state.settings.lang = isEN() ? 'bn' : 'en'; if (sheetOpen) closeSheet(); commit(); },
  lang: el => { state.settings.lang = el.dataset.v; commit(); },

  'add-product': () => openSheet(productForm(null)),
  'open-product': el => productDetail(el.dataset.id),
  'edit-product': el => openSheet(productForm(activeBatch().products.find(p => p.id === el.dataset.id))),
  'delete-product': el => {
    const b = activeBatch();
    const p = b.products.find(q => q.id === el.dataset.id);
    if (!p) return;
    const ns = b.sales.filter(s => s.productId === p.id).length;
    const ne = b.expenses.filter(e => e.productId === p.id).length;
    const extra = ns || ne ? L(`\nএর সাথে ${cnt(ns)} বিক্রি আর ${cnt(ne)} খরচও মুছে যাবে।`, `\nThis also deletes ${ns} sale(s) and ${ne} cost(s).`) : '';
    if (!confirm(L(`"${p.name}" ডিলিট করবেন?`, `Delete "${p.name}"?`) + extra)) return;
    if (sheetOpen) closeSheet();
    undoable(DELETED(), () => {
      b.products = b.products.filter(q => q.id !== p.id);
      b.sales = b.sales.filter(s => s.productId !== p.id);
      b.expenses = b.expenses.filter(e => e.productId !== p.id);
    });
  },
  'save-price': el => {
    const f = el.closest('form');
    const price = toNum(f.elements.price.value);
    if (price <= 0) return toast(L('সঠিক দাম দিন', 'Enter a valid price'), 'danger');
    const p = activeBatch().products.find(q => q.id === el.dataset.id);
    p.myPrice = price;
    commit(L('দাম সেট হয়েছে', 'Price set'));
    productDetail(p.id);
  },
  'clear-price': el => {
    const p = activeBatch().products.find(q => q.id === el.dataset.id);
    delete p.myPrice;
    commit(L('টার্গেট দামে ফেরানো হয়েছে', 'Back to target price'));
    productDetail(p.id);
  },

  'add-expense': el => openSheet(expenseForm(null, el.dataset.product)),
  'edit-expense': el => openSheet(expenseForm(activeBatch().expenses.find(e => e.id === el.dataset.id))),
  'delete-expense': el => {
    const b = activeBatch();
    if (sheetOpen) closeSheet();
    undoable(DELETED(), () => { b.expenses = b.expenses.filter(e => e.id !== el.dataset.id); });
  },
  'exp-filter': el => { expFilter = el.dataset.cat; render(); },

  'add-sale': el => {
    if (!activeBatch().products.length) return toast(L('আগে প্রোডাক্ট যোগ করুন', 'Add a product first'));
    openSheet(saleForm(null, el.dataset.product));
  },
  // হোমের বাটন: একটা প্রেসেই ডেলিভারড বিক্রি লিখে ফেলে (পরিকল্পিত দামে)
  'quick-sell': el => {
    const b = activeBatch(), x = compute(b).items.find(i => i.p.id === el.dataset.id);
    const qty = Math.min(Math.floor(toNum(el.dataset.qty)) || 1, x ? x.remaining : 0);
    if (!x || qty < 1) return toast(L('স্টকে নেই', 'Out of stock'));
    undoable(L(`${cnt(qty)}টা বিক্রি যোগ হয়েছে`, `${qty} sold`), () => {
      b.sales.push({ id: uid(), createdAt: Date.now(), cod: toNum(b.codRate), productId: x.p.id, qty, price: x.planned,
        status: 'delivered', discount: 0, returnCost: 0, date: today(), note: '' });
    });
  },
  'edit-sale': el => openSheet(saleForm(activeBatch().sales.find(s => s.id === el.dataset.id))),
  'delete-sale': el => {
    const b = activeBatch();
    if (sheetOpen) closeSheet();
    undoable(DELETED(), () => { b.sales = b.sales.filter(s => s.id !== el.dataset.id); });
  },
  'qty-step': el => {
    const f = el.closest('form');
    f.elements.qty.value = Math.max(1, Math.floor(toNum(f.elements.qty.value)) + Number(el.dataset.d));
    runLive(f, f.elements.qty);
  },

  batches: () => openSheet(batchesSheet()),
  'switch-batch': el => { state.activeBatchId = el.dataset.id; closeSheet(); commit(L('ব্যাচ বদলানো হয়েছে', 'Batch switched')); },
  'new-batch': () => openSheet(`${sheetHead(L('নতুন ব্যাচ', 'New batch'), L('নতুন ইনভেস্টমেন্ট রাউন্ড', 'A new investment round'))}${batchForm(null)}`),
  'hero-detail': () => { const b = activeBatch(); openSheet(heroDetail(b, compute(b))); },
  'add-days': el => {
    const b = activeBatch();
    b.days = Math.max(0, Math.floor(toNum(b.days))) + Math.floor(toNum(el.dataset.n));
    commit(L(`ডেডলাইন ${el.dataset.n} দিন বাড়ল`, `Deadline extended by ${el.dataset.n} days`));
  },
  'edit-batch': () => openSheet(`${sheetHead(L('ব্যাচ সেটিংস', 'Batch settings'))}${batchForm(activeBatch())}`),
  'delete-batch': el => {
    const b = state.batches.find(x => x.id === el.dataset.id);
    if (!b || !confirm(L(`"${b.name}" ব্যাচের সব হিসাব মুছে যাবে। ডিলিট করবেন?`, `All records in "${b.name}" will be deleted. Continue?`))) return;
    if (sheetOpen) closeSheet();
    undoable(L('ব্যাচ ডিলিট হয়েছে', 'Batch deleted'), () => {
      state.batches = state.batches.filter(x => x.id !== b.id);
      if (state.activeBatchId === b.id) state.activeBatchId = state.batches[0] ? state.batches[0].id : null;
      tab = 'home'; trail = ['home'];
    });
  },
  'target-pct': el => {
    const f = el.closest('form');
    const cap = toNum(f.elements.capital.value);
    if (cap <= 0) { toast(L('আগে মূলধন দিন', 'Enter capital first')); f.elements.capital.focus(); return; }
    f.elements.target.value = Math.round(cap * (1 + Number(el.dataset.pct) / 100));
    runLive(f, f.elements.target);
  },

  'edit-budget': () => openSheet(budgetForm(activeBatch())),
  'budget-preset': el => {
    const f = el.closest('form'), cap = toNum(activeBatch().capital), v = PRESETS[el.dataset.p].v;
    BUDGET_KEYS.forEach(k => { f.elements[k].value = v[k]; f.elements['lim_' + k].value = Math.round(cap * v[k] / 100); });
    runLive(f, null);
  },
  calculator: () => openSheet(calcForm(activeBatch())),
  'planner-apply': el => {
    const { cap, v, ok } = plannerSplit(el.closest('form'));
    if (!ok || !confirm(L('বাজেট পরিকল্পনার % এই ভাগে বদলাবে। মূলধন, টার্গেট আর ৳ সীমা একই থাকবে। চালিয়ে যাবেন?',
      'This replaces your budget plan % with this split. Capital, target and ৳ limits stay the same. Continue?'))) return;
    const vals = {};
    BUDGET_KEYS.forEach(k => { if (k !== 'reserve') vals[k] = Math.round(v[k] / cap * 1000) / 10; });
    vals.reserve = Math.max(0, Math.round((100 - sum(Object.values(vals))) * 10) / 10);
    activeBatch().budget = vals;
    closeSheet();
    commit(L('বাজেট সেভ হয়েছে', 'Budget saved'));
  },
  'pick-img': () => { const i = $('[data-img-input]'); if (i) i.click(); },
  'remove-img': () => { pendingImg = null; showImgPreview(); },
  'install-app': async () => {
    if (deferredInstall) {
      deferredInstall.prompt();
      try { await deferredInstall.userChoice; } catch (e) { /* ignore */ }
      deferredInstall = null;
      render();
    } else openSheet(installHelp());
  },
  guide: () => openSheet(guideSheet()),
  export: () => exportBackup(),
  import: () => $('#import-file').click(),
};

/* =========================================================
   ফর্ম সেভ
   ========================================================= */
const FORMS = {
  batch: f => {
    const name = f.elements.name.value.trim() || L('আমার ব্যবসা', 'My business');
    const capital = toNum(f.elements.capital.value);
    const target = toNum(f.elements.target.value);
    if (capital <= 0) return fail(f, L('মূলধন লিখুন। যেমন: 10000', 'Enter your capital, e.g. 10000'), 'capital');
    if (target <= 0) return fail(f, L('টার্গেট লিখুন। যেমন: 12000', 'Enter a target, e.g. 12000'), 'target');
    if (target <= capital) return fail(f, L(`টার্গেট (${fmt(target)}) মূলধনের (${fmt(capital)}) চেয়ে বেশি হতে হবে, নইলে লাভ হিসাব হবে না। নিচের "+20% লাভ" বাটনে ট্যাপ করতে পারেন।`, `Target (${fmt(target)}) must be higher than capital (${fmt(capital)}). Try a "+20% profit" button.`), 'target');
    const data = {
      name, capital, target,
      returnRate: clamp(toNum(f.elements.returnRate.value), 0, 90),
      codRate: clamp(toNum(f.elements.codRate.value), 0, 50),
      allocBy: f.elements.allocBy.value || 'value',
      days: clamp(Math.floor(toNum(f.elements.days.value)), 0, 3650),
    };
    const id = f.dataset.id;
    if (id) {
      Object.assign(state.batches.find(b => b.id === id), data);
      closeSheet();
      commit(SAVED());
    } else {
      const b = newBatch(data);
      const plan = f.elements.plan && PRESETS[f.elements.plan.value];
      if (plan) b.budget = { ...plan.v };
      state.batches.push(b);
      state.activeBatchId = b.id;
      tab = 'home'; trail = ['home'];
      const first = !sheetOpen;
      closeSheet();
      commit(L('ব্যাচ তৈরি হয়েছে 🎉 এবার ধাপ ২', 'Batch created 🎉 Now step 2'));
      if (first) openSheet(productForm(null)); // প্রথমবার হলে সরাসরি প্রোডাক্ট যোগের ধাপে
    }
  },
  product: async f => {
    const b = activeBatch();
    const name = f.elements.name.value.trim();
    const pc = productCalc(f);
    if (!name) return fail(f, L('প্রোডাক্টের নাম লিখুন। যেমন: মিনি ফ্যান', 'Enter a product name, e.g. Mini fan'), 'name');
    if (pc.units <= 0) return fail(f, L('কয়টা ইউনিট কিনেছেন সেটা লিখুন। যেমন: 5', 'Enter how many units you bought, e.g. 5'), 'units');
    if (pc.input <= 0) return fail(f, L('কেনা দাম লিখুন', 'Enter the purchase price'), 'priceInput');
    if (pc.cur !== 'BDT' && pc.rate <= 0) return fail(f, L(`১ ${curName(pc.cur)} কত টাকা সেটা লিখুন`, `Enter how many taka 1 ${curName(pc.cur)} is`), 'rate');
    const id = f.dataset.id;
    const existing = id && b.products.find(p => p.id === id);
    if (existing) {
      const sold = b.sales.filter(s => s.productId === id && s.status !== 'returned').reduce((a, s) => a + toNum(s.qty), 0);
      if (pc.units < sold) return fail(f, L(`${cnt(sold)} আগেই বিক্রি/পেন্ডিং আছে, এর কম দেওয়া যাবে না`, `${sold} already sold or pending, can't go below that`), 'units');
    }
    const p = existing || { id: uid(), createdAt: Date.now() };
    Object.assign(p, {
      name, emoji: (f.elements.emoji.value || '📦'), units: pc.units, priceMode: pc.mode, currency: pc.cur,
      priceInput: pc.input, rate: pc.cur === 'BDT' ? '' : pc.rate, unitCost: pc.unitBDT,
      weight: toNum(f.elements.weight.value) || '', note: f.elements.note.value.trim(),
    });
    if (pc.cur !== 'BDT') state.settings.rates[pc.cur] = pc.rate;
    if (!existing) b.products.push(p);
    let imgErr = false;
    if (pendingImg !== undefined) {
      const blob = pendingImg;
      pendingImg = undefined;
      try { await (blob ? putImage(p.id, blob) : deleteImage(p.id)); } catch (e) { imgErr = true; }
    }
    const msg = imgErr ? L('প্রোডাক্ট সেভ হয়েছে, কিন্তু ছবি সেভ করা যায়নি (জায়গা কম হতে পারে)', 'Product saved, but the photo could not be stored (storage may be full)') : null;
    if (existing) { commit(msg || SAVED()); productDetail(p.id); }
    else { closeSheet(); commit(msg || L('প্রোডাক্ট যোগ হয়েছে', 'Product added')); }
  },
  expense: f => {
    const b = activeBatch();
    const perUnit = f.elements.mode.value === 'unit';
    const productId = f.elements.productId.value;
    const input = toNum(f.elements.amount.value);
    if (input <= 0) return fail(f, L('কত টাকা খরচ হয়েছে লিখুন', 'Enter how much it cost'), 'amount');
    const units = expenseUnits(b, productId);
    if (perUnit && units <= 0) return fail(f, L('"প্রতি ইউনিটে" দিতে হলে আগে প্রোডাক্ট যোগ করতে হবে, নইলে ইউনিট কয়টা app জানে না। "মোট টাকা" বেছে নিন, অথবা আগে প্রোডাক্ট যোগ করুন।', 'Per-unit needs a product first so the app knows the unit count. Pick "Total" or add a product first.'), 'amount');
    const id = f.dataset.id;
    const e = (id && b.expenses.find(x => x.id === id)) || { id: uid(), createdAt: Date.now() };
    Object.assign(e, {
      category: f.elements.category.value || 'other', productId,
      amount: perUnit ? input * units : input, perUnit, perUnitAmount: perUnit ? input : '',
      date: f.elements.date.value || today(), note: f.elements.note.value.trim(),
    });
    if (!id) b.expenses.push(e);
    closeSheet();
    commit(id ? SAVED() : L('খরচ যোগ হয়েছে', 'Cost added'));
  },
  sale: f => {
    const b = activeBatch(), c = compute(b);
    const id = f.dataset.id;
    const existing = id && b.sales.find(s => s.id === id);
    const productId = f.elements.productId.value;
    const qty = Math.floor(toNum(f.elements.qty.value));
    const price = toNum(f.elements.price.value);
    const status = f.elements.status.value || 'delivered';
    if (!productId) return fail(f, L('কোন প্রোডাক্ট বিক্রি হলো বাছুন', 'Pick the product that was sold'), 'productId');
    if (qty <= 0) return fail(f, L('কয়টা বিক্রি হলো লিখুন (কমপক্ষে ১)', 'Enter how many were sold (at least 1)'), 'qty');
    if (status !== 'returned') {
      if (price <= 0) return fail(f, L('প্রতিটা কত টাকায় বেচলেন লিখুন', 'Enter the price per unit'), 'price');
      const avail = availableFor(c, productId, existing);
      if (qty > avail) return fail(f, L(`স্টকে আছে মাত্র ${cnt(avail)}, এর বেশি বিক্রি দেওয়া যাবে না`, `Only ${avail} in stock`), 'qty');
    }
    const s = existing || { id: uid(), createdAt: Date.now(), cod: toNum(b.codRate) };
    const dmode = f.elements.dmode.value === 'pct' ? 'pct' : 'amt';
    Object.assign(s, {
      productId, qty, price, status, discount: saleDiscount(f, qty, price),
      discountMode: dmode, discountValue: toNum(f.elements.discount.value),
      returnCost: status === 'returned' ? toNum(f.elements.returnCost.value) : 0,
      date: f.elements.date.value || today(), note: f.elements.note.value.trim(),
    });
    if (!existing) b.sales.push(s);
    closeSheet();
    commit(existing ? SAVED() : L('বিক্রি যোগ হয়েছে', 'Sale added'));
  },
  budget: f => {
    const keys = BUDGET_KEYS.filter(k => k !== 'reserve');
    const vals = Object.fromEntries(keys.map(k => [k, clamp(toNum(f.elements[k].value), 0, 100)]));
    const used = sum(Object.values(vals));
    if (used > 100.001) return fail(f, L(`খাতগুলোর মোট ${pct(used)} হয়ে গেছে, ১০০% এর বেশি হতে পারে না। কোনো খাত কমান।`, `The categories add up to ${pct(used)}, which is over 100%. Lower one of them.`));
    vals.reserve = round2(100 - used);
    const b = activeBatch();
    b.budget = vals;
    b.limits = {};
    b.warnAt = clamp(toNum(f.elements.warnAt.value) || 80, 10, 100);
    closeSheet();
    commit(L('বাজেট সেভ হয়েছে', 'Budget saved'));
  },
};

/* =========================================================
   লাইভ প্রিভিউ (টাইপ করার সাথে সাথে হিসাব)
   ========================================================= */
const LIVE = {
  batch: f => {
    const cap = toNum(f.elements.capital.value), t = toNum(f.elements.target.value);
    const ph = $('[data-plan-preview]', f);
    if (ph && f.elements.plan) {
      const p = PRESETS[f.elements.plan.value] || PRESETS.balanced;
      ph.innerHTML = p.note[isEN() ? 1 : 0] + (cap > 0 ? '<br>' + ['product', 'ads', 'shipping', 'reserve'].map(k => `${bl(k)} <b>${p.v[k]}%</b> (${fmt(cap * p.v[k] / 100)})`).join(' · ') : '');
    }
    const h = $('[data-target-hint]', f);
    if (!h) return;
    if (cap > 0 && t > 0) {
      const p = t - cap;
      h.innerHTML = p > 0
        ? `${L('লক্ষ্য লাভ', 'Goal profit')}: <b class="pos">${fmt(p)}</b> (${pct(p / cap * 100)})`
        : `<span class="neg">${L('টার্গেট মূলধনের চেয়ে বেশি হতে হবে', 'Target must be above capital')}</span>`;
    } else h.textContent = '';
  },
  product: f => {
    const pc = productCalc(f);
    $('[data-cur]', f).textContent = CUR[pc.cur];
    $('[data-price-label]', f).textContent = pc.mode === 'unit'
      ? L('২. একটা ইউনিটের কেনা দাম কত?', '2. What did ONE unit cost?')
      : L('২. সব ইউনিট মিলিয়ে মোট কত দিয়েছেন?', '2. What did ALL units cost in total?');
    f.elements.priceInput.placeholder = pc.mode === 'unit' ? L('যেমন: 1000 (একটার দাম)', 'e.g. 1000 (price of one)') : L('যেমন: 5000 (সবগুলোর মোট)', 'e.g. 5000 (for all)');
    $('[data-rate-wrap]', f).classList.toggle('hidden', pc.cur === 'BDT');
    f.elements.rate.placeholder = L(`১ ${curName(pc.cur)} = কত টাকা?`, `1 ${curName(pc.cur)} = how many taka?`);
    if (pc.cur !== 'BDT' && !f.elements.rate.value && state.settings.rates[pc.cur]) f.elements.rate.value = state.settings.rates[pc.cur];
    $('[data-preview]', f).innerHTML = pc.units > 0 && pc.unitBDT > 0
      ? `${L('কেনা দাম: প্রতি ইউনিট', 'Purchase: per unit')} <b>${fmt(pc.unitBDT)}</b> · ${L('মোট', 'total')} <b>${fmt(pc.totalBDT)}</b><br>
         <span class="muted">${L('অ্যাড, শিপিং, প্যাকেজিং যোগ হলে প্রতি ইউনিটের আসল খরচ বাড়বে।', 'Ads, shipping and packaging will raise the true cost per unit.')}</span>`
      : '';
  },
  expense: f => {
    const b = activeBatch();
    const perUnit = f.elements.mode.value === 'unit';
    const pid = f.elements.productId.value;
    const amt = toNum(f.elements.amount.value);
    const units = expenseUnits(b, pid);
    const cat = f.elements.category.value;
    $('[data-amt-label]', f).textContent = perUnit ? L(`প্রতিটা ইউনিটে কত টাকা? (${cnt(units)} ইউনিট আছে)`, `Cost per unit (you have ${units} units)`) : L('মোট কত টাকা খরচ হয়েছে?', 'Total cost');
    f.elements.amount.placeholder = perUnit ? L('যেমন: 20', 'e.g. 20') : L('যেমন: 1500', 'e.g. 1500');
    let html = '';
    if (perUnit && amt > 0) html += `${fmt(amt)} × ${units} ${L('ইউনিট', 'units')} = <b>${fmt(amt * units)}</b> ${L('মোট খরচ', 'total')}<br>`;
    if (!pid) {
      const allW = b.products.length && b.products.every(p => toNum(p.weight) > 0);
      const by = cat === 'shipping' && allW ? L('ওজন', 'weight') : (b.allocBy === 'units' ? L('ইউনিট সংখ্যা', 'unit count') : L('কেনা দাম', 'purchase value'));
      html += b.products.length > 1
        ? `<span class="muted">${L(`সব প্রোডাক্টে ভাগ হবে: ${by} অনুযায়ী।`, `Split across all products by ${by}.`)}</span>`
        : (b.products.length ? '' : `<span class="muted">${L('এখনও প্রোডাক্ট নেই। প্রোডাক্ট যোগ করলে এই খরচ তাতে ভাগ হবে।', 'No products yet. This cost will be split once you add some.')}</span>`);
    }
    const tot = perUnit ? amt * units : amt;
    if (tot > 0 && toNum(b.capital) > 0) {
      const c = compute(b), editing = f.dataset.id && b.expenses.find(e => e.id === f.dataset.id);
      const back = editing ? toNum(editing.amount) : 0;
      const before = budgetActual(c)[cat] - (editing && editing.category === cat ? back : 0);
      const lim = limitOf(b, cat), after = before + tot, diff = after - lim;
      html += `<div class="bimpact ${diff > 0 ? 'bad' : ''}"><b>${bl(cat)} ${L('বাজেট', 'budget')}</b>: ${fmt(after)} / ${fmt(lim)}<br>
        ${diff > 0 ? `<b class="neg">${fmt(diff)} ${L('বেশি হয়ে যাবে', 'over budget')}</b>` : `${fmt(-diff)} ${L('বাকি থাকবে', 'will be left')}`}
        · ${L('হাতে থাকবে', 'Cash left')} <b>${fmt(c.cash + back - tot)}</b></div>`;
    }
    $('[data-preview]', f).innerHTML = html;
  },
  sale: (f, t) => {
    const b = activeBatch(), c = compute(b);
    const existing = f.dataset.id && b.sales.find(s => s.id === f.dataset.id);
    const pid = f.elements.productId.value;
    const x = c.items.find(i => i.p.id === pid);
    if (t && t.name === 'productId' && x) f.elements.price.value = x.planned;
    const status = f.elements.status.value;
    $('[data-return]', f).classList.toggle('hidden', status !== 'returned');
    const qty = Math.floor(toNum(f.elements.qty.value));
    const price = toNum(f.elements.price.value);
    const disc = saleDiscount(f, qty, price);
    const pv = $('[data-preview]', f);
    pv.className = 'preview';
    if (!x) { pv.innerHTML = ''; return; }
    if (status === 'returned') {
      pv.innerHTML = L(`রিটার্ন: ${cnt(qty)} স্টকে ফেরত আসবে। রিটার্নের খরচ <b>${fmt(toNum(f.elements.returnCost.value))}</b> এই প্রোডাক্টের খরচে যোগ হবে।`,
        `Return: ${qty} go back to stock. The return cost <b>${fmt(toNum(f.elements.returnCost.value))}</b> is added to this product's cost.`);
      return;
    }
    const avail = availableFor(c, pid, existing);
    const codRate = existing && existing.cod != null ? toNum(existing.cod) / 100 : c.cod;
    const gross = Math.max(0, qty * price - disc);
    const net = gross * (1 - codRate);
    const profit = net - qty * x.unit;
    let html = `${L('কাস্টমার দেবে', 'Customer pays')} <b>${fmt(gross)}</b>${codRate > 0 ? ` · ${L('COD কেটে পাবেন', 'after COD you get')} <b>${fmt(net)}</b>` : ''}<br>
      ${profit >= 0 ? L('এই বিক্রিতে লাভ', 'Profit on this sale') : L('এই বিক্রিতে লস', 'Loss on this sale')}: <b class="${profit >= 0 ? 'pos' : 'neg'}">${fmt(profit)}</b> <span class="muted">(${L('খরচ', 'cost')} ${fmt(x.unit)}/${L('ইউনিট', 'unit')})</span>`;
    if (qty > avail) { html += `<br><b class="neg">${L(`স্টকে আছে মাত্র ${cnt(avail)}`, `Only ${avail} in stock`)}</b>`; pv.className = 'preview danger'; }
    else if (qty > 0 && gross / qty < x.breakeven) { html += `<br><b class="neg">${L('এই দাম খরচের চেয়ে কম!', 'This price is below cost!')}</b>`; pv.className = 'preview danger'; }
    else if (qty > 0 && gross / qty < x.goalPrice) {
      html += `<br><span class="muted">${L(`টার্গেট দাম ${fmt(x.goalPrice)}, এর কমে বেচলে বাকিগুলোর দাম একটু বাড়বে।`, `Target price is ${fmt(x.goalPrice)}. Selling lower raises the price needed for the rest.`)}</span>`;
      pv.className = 'preview warn';
    }
    pv.innerHTML = html;
  },
  sim: (f, t) => {
    const b = activeBatch(), c = compute(b);
    const x = c.items.find(i => i.p.id === f.dataset.id);
    if (!x || !t) return;
    if (t.name === 'range') f.elements.price.value = t.value;
    else if (t.name === 'price') f.elements.range.value = toNum(t.value);
    $('[data-sim-out]', f).innerHTML = simOut(c, x, toNum(f.elements.price.value));
  },
  budget: (f, t) => {
    const cap = toNum(activeBatch().capital);
    const keys = BUDGET_KEYS.filter(k => k !== 'reserve');
    if (t && t.name && cap > 0) {
      if (t.name.startsWith('lim_')) f.elements[t.name.slice(4)].value = round2(toNum(t.value) / cap * 100);
      else if (keys.includes(t.name)) f.elements['lim_' + t.name].value = Math.round(cap * toNum(t.value) / 100);
    }
    const used = sum(keys.map(k => toNum(f.elements[k].value)));
    const res = round2(Math.max(0, 100 - used));
    f.elements.reserve.value = res;
    f.elements.lim_reserve.value = Math.round(cap * res / 100);
    const pv = $('[data-preview]', f);
    const over = used > 100.001;
    pv.className = 'preview' + (over ? ' danger' : '');
    pv.innerHTML = over
      ? L(`খাতগুলো মিলিয়ে <b>${pct(used)}</b> হয়ে গেছে, ${pct(used - 100)} বেশি। কোনো খাত কমান।`, `Categories add up to <b>${pct(used)}</b>, ${pct(used - 100)} over. Lower one of them.`)
      : L(`খরচের জন্য <b>${pct(used)}</b> (${fmt(cap * used / 100)}) · রিজার্ভ <b>${pct(res)}</b> (${fmt(cap * res / 100)}) · মোট <b class="pos">100%</b> ✓`,
        `Spending <b>${pct(used)}</b> (${fmt(cap * used / 100)}) · reserve <b>${pct(res)}</b> (${fmt(cap * res / 100)}) · total <b class="pos">100%</b> ✓`);
  },
  calc: f => {
    const g = n => toNum(f.elements[n].value);
    const units = Math.floor(g('units')), buy = g('buy'), cap = g('capital');
    const ship = g('ship'), ads = g('ads'), pack = g('pack'), other = g('other'), courier = g('courier');
    const target = g('target'), mySell = g('sell');
    const m = g('margin') / 100, r = clamp(g('ret'), 0, 90) / 100, cod = clamp(g('cod'), 0, 50) / 100;
    const pv = $('[data-preview]', f);
    if (units <= 0 || buy <= 0) { pv.innerHTML = `<span class="muted">${L('কেনা দাম আর ইউনিট সংখ্যা দিলে হিসাব দেখাবে।', 'Enter buy price and units to see the numbers.')}</span>`; return; }
    const total = units * buy + ship + ads + units * pack + units * courier + other;
    const plan = plannerSplit(f);
    const allocRows = plan.rows.map(([k, v]) => `<div><span>${bl(k)}</span><span>${fmt(v)} <small class="muted">${cap > 0 ? pct(v / cap * 100) : ''}</small></span></div>`).join('');
    const okSales = units * (1 - r);
    let goalHtml = '';
    if (target > 0 && cap > 0) {
      const inc = target - cap;
      const needCash = target - cap + total; // বিক্রি থেকে নেট যত টাকা আসতে হবে
      const sellT = okSales > 0 ? ceil10(needCash / (okSales * (1 - cod))) : 0;
      goalHtml = `<hr class="sep">${L('টার্গেট', 'Target')}: <b>${fmt(target)}</b> · ${L('বাড়াতে হবে', 'increase needed')} <b>${fmt(inc)}</b> (${pct(inc / cap * 100)})<br>
        ${L(`টার্গেটের জন্য বিক্রি দাম (${pct(r * 100)} রিটার্ন ধরে)`, `Price to hit target (with ${pct(r * 100)} returns)`)}: <b class="pos">${fmt(sellT)}</b>`;
      if (mySell > 0) {
        const perOrder = mySell * (1 - cod);
        const n = Math.ceil(needCash / perOrder);
        const end = cap - total + okSales * perOrder;
        const ok = end >= target - 1;
        goalHtml += `<br>${L(`${fmt(mySell)} দামে সব বেচলে শেষে আনুমানিক`, `At ${fmt(mySell)}, estimated final cash`)}: <b class="${end >= target ? 'pos' : 'neg'}">${fmt(end)}</b><br>
          ${L(`টার্গেটে লাগবে প্রায় ${cnt(n)} সফল ডেলিভারি, রিটার্ন বাদে পাওয়া যাবে প্রায় ${cnt(Math.round(okSales))}।`, `Needs about ${n} successful deliveries; after returns you'd have about ${Math.round(okSales)}.`)}
          <div class="sim-goal ${ok ? 'ok' : 'no'} mt8">${ok
            ? L('✓ এই হিসাবে টার্গেট সম্ভব মনে হচ্ছে (নিশ্চয়তা নয়)।', '✓ The target looks achievable under these assumptions (not guaranteed).')
            : L('✗ এই হিসাবে টার্গেট কঠিন। খরচ কমান, দাম বাড়ান, বেশি ইউনিট আনুন, বা টার্গেট আবার দেখুন।', '✗ The target looks difficult under these assumptions. Cut costs, raise the price, buy more units, or review the target.')}</div>`;
      }
    } else goalHtml = `<hr class="sep"><span class="muted">${L('মূলধন ও "শেষে হাতে ক্যাশ" দিলে টার্গেটের দাম আর কয়টা বিক্রি লাগবে দেখাবে।', 'Add capital and final cash wanted to see the target price and sales needed.')}</span>`;
    const perUnit = total / units;
    const breakeven = perUnit / (1 - cod);
    const sell = ceil10(perUnit * (1 + m) / ((1 - r) * (1 - cod)));
    const profit = units * sell * (1 - r) * (1 - cod) - total;
    const left = cap - total;
    const maxUnits = buy + pack > 0 ? Math.floor((cap - ship - ads - other) / (buy + pack)) : 0;
    pv.innerHTML = `
      ${L('মোট খরচ', 'Total cost')}: <b>${fmt(total)}</b><br>
      ${L('সব মিলিয়ে প্রতি ইউনিট', 'All-in per unit')}: <b>${fmt(perUnit)}</b><br>
      ${L('সর্বনিম্ন বিক্রি দাম', 'Break-even price')}: <b>${fmt(ceil10(breakeven))}</b><br>
      ${L(`${pct(m * 100)} লাভের জন্য বিক্রি দাম`, `Price for ${pct(m * 100)} profit`)}: <b class="pos">${fmt(sell)}</b><br>
      ${L('সব বেচলে আনুমানিক লাভ', 'Est. profit if all sell')}: <b class="${profit >= 0 ? 'pos' : 'neg'}">${fmt(profit)}</b>
      ${total > 0 ? `(${pct(profit / total * 100)})` : ''}<br>
      ${cap > 0 ? (left >= 0
        ? L(`মূলধনে কুলাবে, <b>${fmt(left)}</b> বাকি থাকবে।`, `Fits your capital, <b>${fmt(left)}</b> left over.`)
        : `<b class="neg">${L(`মূলধনে ${fmt(-left)} কম পড়বে।`, `Capital falls ${fmt(-left)} short.`)}</b>`) : ''}
      ${cap > 0 && maxUnits > 0 ? `<br><span class="muted">${L(`এই মূলধনে সর্বোচ্চ প্রায় ${cnt(maxUnits)} আনা যাবে (শিপিং/অ্যাড একই থাকলে)।`, `This capital buys up to about ${maxUnits} units (same shipping/ads).`)}</span>` : ''}
      ${goalHtml}
      ${cap > 0 ? `<hr class="sep"><b>${L('মূলধন কোথায় কত যাবে', 'How the capital splits')}</b>
        <div class="ledger">${allocRows}</div>
        <span class="muted">${L('রিজার্ভ = বাকি মূলধন, এটা খরচ না। রিটার্ন/COD % আনুমানিক, বাকিগুলো আপনার দেওয়া।', 'Reserve = capital left over; it is not an expense. Return/COD % are estimates; the rest are your inputs.')}</span>
        ${plan.ok ? `<button type="button" class="btn block mt8" data-action="planner-apply">${icon('pie', 18)} ${L('এই ভাগ বাজেট পরিকল্পনায় বসান', 'Use this split as my budget plan')}</button>` : ''}` : ''}`;
  },
};
function runLive(f, t) {
  const fn = LIVE[f.dataset.live];
  if (fn) fn(f, t);
}

/* ---------- ফোনে ইনস্টল (অফলাইন অ্যাপ) ---------- */
let deferredInstall = null;
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (!sheetOpen) render(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; render(); toast(L('ইনস্টল হয়ে গেছে! এখন ইন্টারনেট ছাড়াই চলবে 🎉', 'Installed! Works offline now 🎉')); });
function installCard() {
  if (isStandalone()) return '';
  return `<section class="card install">
    <div class="inst-row"><span class="inst-ic">📲</span><div class="sb"><b>${L('ফোনে অ্যাপ হিসেবে রাখুন', 'Keep it as a phone app')}</b>
      <small>${L('একবার ইনস্টল করলে ইন্টারনেট ছাড়াই চলবে, হোম স্ক্রিন থেকে খুলবেন।', 'Install once, then it works offline from your home screen.')}</small></div></div>
    <button type="button" class="btn primary block mt8" data-action="install-app">${icon('download', 18)} ${L('ইনস্টল করুন (অফলাইনে চলবে)', 'Install (works offline)')}</button>
  </section>`;
}
function installHelp() {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost';
  const steps = isIOS()
    ? [L('Safari দিয়ে এই পেজ খুলুন (অন্য ব্রাউজারে হবে না)', 'Open this page in Safari (other browsers will not work)'), L('নিচের মাঝের <b>Share</b> বাটনে (⬆️) ট্যাপ করুন', 'Tap the <b>Share</b> button (⬆️) at the bottom'), L('নিচে স্ক্রল করে <b>Add to Home Screen</b> চাপুন', 'Scroll and tap <b>Add to Home Screen</b>'), L('<b>Add</b> চাপুন। হোম স্ক্রিনে হিসাবী আইকন চলে আসবে', 'Tap <b>Add</b>. The Hisabi icon appears on your home screen')]
    : [L('Chrome দিয়ে এই পেজ খুলুন', 'Open this page in Chrome'), L('ওপরের ডানের <b>⋮</b> মেনুতে ট্যাপ করুন', 'Tap the <b>⋮</b> menu at the top right'), L('<b>Install app</b> বা <b>Add to Home screen</b> চাপুন', 'Tap <b>Install app</b> or <b>Add to Home screen</b>'), L('<b>Install</b> চাপুন। হোম স্ক্রিনে হিসাবী আইকন চলে আসবে', 'Tap <b>Install</b>. The Hisabi icon appears on your home screen')];
  return `${sheetHead(L('ফোনে ইনস্টল করুন', 'Install on your phone'), L('একবার করলেই অফলাইনে চলবে', 'Do it once, then it works offline'))}
    ${secure ? '' : `<div class="form-error">${L('এই পেজ ইন্টারনেটের লিংকে (https) খুলুন। ফাইল থেকে সরাসরি খুললে ইনস্টল হয় না। README দেখুন।', 'Open this from the https web link. Installing does not work from a local file. See the README.')}</div>`}
    <ol class="howlist">${steps.map((t, i) => `<li><span class="sn">${i + 1}</span><div>${t}</div></li>`).join('')}</ol>
    <p class="hint">${L('ইনস্টলের পর ডেটা শুধু এই ফোনেই থাকে। মাঝে মাঝে "আরও" থেকে ব্যাকআপ নিন।', 'After installing, data stays on this phone only. Back up now and then from "More".')}</p>`;
}
function guideSheet() {
  const ul = arr => `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const ex = (bn, en) => `<div class="gex">${L(bn, en)}</div>`;
  const sections = [
    [L('শুরু করুন: ৫ ধাপে', 'Quick start: 5 steps'),
      ul([
        L('<b>ব্যাচ খুলুন:</b> মূলধন আর টার্গেট দিন (চাইলে কত দিনে বেচবেন তাও)।', '<b>Create a batch:</b> enter capital and target (optionally the number of days).'),
        L('<b>প্রোডাক্ট যোগ করুন:</b> কী কিনেছেন, কয়টা, কত দামে।', '<b>Add products:</b> what you bought, how many, at what price.'),
        L('<b>খরচ যোগ করুন:</b> অ্যাড, শিপিং, প্যাকেজিং, কুরিয়ার।', '<b>Add costs:</b> ads, shipping, packaging, courier.'),
        L('<b>দাম দেখুন:</b> প্রোডাক্টে ট্যাপ করলে টার্গেটে পৌঁছানোর দাম দেখাবে।', '<b>Check the price:</b> tap a product to see the price that reaches your target.'),
        L('<b>বিক্রি লিখুন:</b> হোমের <b>+১ বিক্রি</b> বাটনে এক ট্যাপে, বাকি হিসাব নিজে হবে।', '<b>Log sales:</b> one tap on <b>+1 sold</b> on Home, the rest is automatic.'),
      ])],
    [L('মূলধন, টার্গেট ও ডেডলাইন', 'Capital, target and deadline'),
      ul([
        L('<b>মূলধন:</b> ব্যবসায় মোট যত টাকা লাগাচ্ছেন।', '<b>Capital:</b> the total money you put in.'),
        L('<b>টার্গেট:</b> শেষে হাতে মোট কত টাকা চান (মূলধনসহ)। যেমন ১০,০০০ লাগিয়ে ১৪,০০০ চাইলে লক্ষ্য লাভ ৪,০০০। "+২০% লাভ" বাটনে দ্রুত বসানো যায়।', '<b>Target:</b> the total cash you want at the end, capital included. Put in 10,000 and want 14,000 means a goal profit of 4,000. The "+20% profit" buttons fill it quickly.'),
        L('<b>ডেডলাইন (ঐচ্ছিক):</b> কত দিনে টার্গেট বেচতে চান। দিলে হোমে প্রতিদিনের টার্গেট দেখাবে। পরে যেকোনো সময় "দিন বদলান" বা "+দিন বাড়ান" দিয়ে বদলানো যায়।', '<b>Deadline (optional):</b> days to reach the target. Home then shows a daily target. Change it anytime with "Change days" or "Add days".'),
        L('<b>অ্যাডভান্সড:</b> রিটার্ন/ড্যামেজ বাফার (ডিফল্ট ৫%) আর COD চার্জ (ডিফল্ট ১%) দামের হিসাবে ধরা হয়।', '<b>Advanced:</b> the return/damage buffer (5% by default) and COD charge (1% by default) are built into the price.'),
      ])],
    [L('প্রোডাক্ট যোগ করা', 'Adding products'),
      ul([
        L('নাম, ছবি (ঐচ্ছিক), কয়টা ইউনিট, কেনা দাম দিন। দাম <b>প্রতি ইউনিট</b> বা <b>সব মিলিয়ে মোট</b>, যেটা সহজ সেটা বেছে নিন।', 'Name, optional photo, units and purchase price. Enter the price <b>per unit</b> or <b>for all together</b>, whichever is easier.'),
        L('চীন/ডলারে কিনলে মুদ্রা বেছে এক্সচেঞ্জ রেট দিন, app নিজে টাকায় বদলাবে।', 'If you bought in yuan or dollars, pick the currency and the rate; the app converts to taka.'),
        L('ওজন দিলে (সব প্রোডাক্টে) শিপিং খরচ ওজন অনুযায়ী ভাগ হয়, নইলে দাম অনুযায়ী।', 'With weights on every product, shipping is split by weight, otherwise by value.'),
      ])],
    [L('খরচ যোগ করা', 'Adding costs'),
      ul([
        L('খাত বাছুন: অ্যাড, শিপিং, প্যাকেজিং, কুরিয়ার, অন্যান্য।', 'Pick a category: ads, shipping, packaging, courier, other.'),
        L('<b>কোন প্রোডাক্টের জন্য?</b> নির্দিষ্ট প্রোডাক্ট বাছলে পুরোটা সেটারই খরচ। "সব প্রোডাক্টে ভাগ" রাখলে app নিজে ভাগ করে দেয়।', '<b>For which product?</b> Pick one and the whole cost goes to it. Leave "split across all" and the app divides it.'),
        L('<b>মোট টাকা</b> বা <b>প্রতি ইউনিটে</b>: প্যাকেজিং প্রতিটায় ৳২০ হলে "প্রতি ইউনিটে" বেছে ২০ লিখুন, app গুণ করে নেবে।', '<b>Total</b> or <b>per unit</b>: for packaging of ৳20 each, pick "per unit" and type 20; the app multiplies.'),
        L('লেখার সময়ই নিচে দেখাবে এই খাতের বাজেটের কত বেশি/বাকি আর খরচের পর হাতে কত থাকবে।', 'While typing, the form shows how far over or under budget this category will be and the cash left afterwards.'),
      ])],
    [L('টাকা কীভাবে ভাগ হয়ে দাম বের হয়', 'How costs are split and the price is worked out'),
      `<p>${L('এটাই অ্যাপের মূল হিসাব। ধাপে ধাপে:', 'This is the core of the app, step by step:')}</p>
      <ol>
        <li>${L('<b>প্রতি ইউনিটের আসল খরচ</b> = (কেনা দাম + ওই প্রোডাক্টের ভাগের সব খরচ + রিটার্নের খরচ) ÷ ইউনিট সংখ্যা।', '<b>True cost per unit</b> = (purchase + this product\'s share of all costs + return costs) ÷ units.')}</li>
        <li>${L('<b>ভাগের নিয়ম:</b> নির্দিষ্ট প্রোডাক্টের খরচ শুধু সেটাতেই। "সব প্রোডাক্টে ভাগ" খরচ কেনা দাম অনুযায়ী (বা ইউনিট অনুযায়ী, ব্যাচ সেটিংসে বদলানো যায়) ভাগ হয়। শিপিং ওজন থাকলে ওজন অনুযায়ী।', '<b>Split rule:</b> a product-specific cost goes only to that product. Shared costs split by purchase value (or by units, set in batch settings). Shipping splits by weight when every product has one.')}</li>
        <li>${L('<b>ব্রেক-ইভেন দাম</b> = আসল খরচ ÷ (১ − COD%)। এর নিচে বেচলে লস।', '<b>Break-even price</b> = true cost ÷ (1 − COD%). Selling below it loses money.')}</li>
        <li>${L('<b>টার্গেটের দাম:</b> টার্গেটে পৌঁছাতে এখনও যত টাকা তুলতে হবে, সেটা বাকি স্টকের খরচের কত গুণ তা হিসাব হয়। তারপর রিটার্ন ও COD ধরে প্রতিটার দাম বের হয় এবং ৳১০ এ রাউন্ড হয়।', '<b>Target price:</b> the app finds how many times the remaining stock\'s cost you must earn back to reach the target, then adds the return and COD allowance and rounds up to ৳10.')}</li>
      </ol>
      ${ex(`<b>উদাহরণ:</b> মূলধন ১০,০০০, টার্গেট ১৪,০০০। ২০টা পণ্য × ৳২৫০ = ৳৫,০০০। অ্যাড ১,৫০০ + শিপিং ৮০০ + প্যাকেজিং ২০০ = ২,৫০০ খরচ। মোট খরচ ৭,৫০০, তাই প্রতি ইউনিট <b>৳৩৭৫</b>। হাতে নগদ ২,৫০০, টার্গেটে আরও ১১,৫০০ তুলতে হবে। ১১,৫০০ ÷ ৭,৫০০ = ১.৫৩ গুণ। ৩৭৫ × ১.৫৩ = ৫৭৫, রিটার্ন ৫% আর COD ১% ধরলে ÷ ০.৯৪ = ৬১১, রাউন্ড করে <b>৳৬২০</b> দামে বেচলে টার্গেট পূরণ।`,
        `<b>Example:</b> capital 10,000, target 14,000. 20 units × ৳250 = ৳5,000. Ads 1,500 + shipping 800 + packaging 200 = 2,500. Total cost 7,500, so <b>৳375</b> per unit. Cash in hand is 2,500, so 11,500 must still come in. 11,500 ÷ 7,500 = 1.53 times. 375 × 1.53 = 575, divided by 0.94 for 5% returns and 1% COD = 611, rounded up to <b>৳620</b> to reach the target.`)}
      <p class="muted">${L('খরচ বা বিক্রি যোগ হলেই এই দাম নিজে নতুন করে হিসাব হয়। প্রোডাক্টের পাতায় স্লাইডার টেনে অন্য দামে কী হয় দেখা যায়।', 'The price is recalculated whenever costs or sales change. On a product page, drag the slider to see what other prices would do.')}</p>`],
    [L('বিক্রি লেখা', 'Recording sales'),
      ul([
        L('<b>এক ট্যাপে:</b> হোমে প্রোডাক্টের <b>+১ বিক্রি</b> বা <b>+২</b> বাটন। পরিকল্পিত দামে ডেলিভারড বিক্রি লেখা হয়। ভুল হলে নিচে "ফিরিয়ে আনুন"।', '<b>One tap:</b> use <b>+1 sold</b> or <b>+2</b> on a product on Home. It logs a delivered sale at the planned price. Tap Undo if it was a mistake.'),
        L('<b>ডিসকাউন্ট/অন্য দাম:</b> "ডিসকাউন্ট" বাটনে ফর্ম খোলে। সেখানে ৳ টাকা অফ বা % ছাড় দিতে পারবেন।', '<b>Discount/other price:</b> the "Discount" button opens the form where you can give ৳ off or % off.'),
        L('<b>অবস্থা:</b> ডেলিভারড = টাকা হাতে। পেন্ডিং = কুরিয়ারে, টাকা আসেনি। রিটার্ন = ফেরত এসেছে, মাল স্টকে ফিরবে আর রিটার্নের খরচ ওই প্রোডাক্টের খরচে যোগ হবে।', '<b>Status:</b> Delivered = money received. Pending = with the courier. Returned = came back; goods return to stock and the return cost is added to the product.'),
        L('COD চার্জ কেটে নেট টাকা ধরা হয়।', 'Net money is counted after the COD charge.'),
      ])],
    [L('হোম ড্যাশবোর্ড', 'The Home dashboard'),
      ul([
        L('<b>হলুদ কার্ড:</b> এখন হাতে কত ক্যাশ, টার্গেট কতটা পূরণ, খরচ, বিক্রি আর লাভ। <b>কার্ডে ট্যাপ করলে</b> পুরো হিসাব খোলে: টাকার প্রবাহ, প্রতিটা প্রোডাক্টের খরচ-বিক্রি-লাভ, খরচের তালিকা, সম্পদ, বিক্রি আর টার্গেট।', '<b>Yellow card:</b> cash in hand now, target progress, spent, sales and profit. <b>Tap it</b> for the full breakdown: money flow, per-product cost, sales and profit, the cost list, assets, sales and target.'),
        L('<b>টার্গেট টাইমলাইন:</b> ডেডলাইন দিলে আজ আর গতকালের টার্গেট বনাম আসল বিক্রি, বর্তমান গতি, আর দিন বাড়ানোর পরামর্শ।', '<b>Target timeline:</b> with a deadline, shows today and yesterday against target, your current pace, and advice on extra days.'),
        L('<b>আমার প্রোডাক্ট:</b> প্রতিটার স্টক, দাম আর এক ট্যাপে বিক্রির বাটন।', '<b>My products:</b> stock, price and one-tap sell buttons for each.'),
        L('<b>আদর্শ বাজেট ভাগ:</b> ডোনাট চার্টে খাতভিত্তিক ভাগ, আর কোথায় কত বেশি বা বাকি।', '<b>Ideal budget split:</b> a donut of the split per category, and how far over or under each one is.'),
        L('<b>আরও হিসাব দেখুন:</b> বিজনেস গাইডের পরামর্শ, টাকার মিলান, বাড়তি তথ্য।', '<b>More details:</b> business guide tips, the money check and extra figures.'),
      ])],
    [L('টার্গেট টাইমলাইন কীভাবে চলে', 'How the target timeline works'),
      ul([
        L('<b>আজকের টার্গেট</b> = টার্গেটে যেতে এখনও যতটা বেচতে হবে ÷ বাকি দিন। কম বিক্রি হলে পরদিন টার্গেট একটু বাড়ে, বেশি হলে কমে।', '<b>Today\'s target</b> = units still needed ÷ days left. Sell less and tomorrow\'s target rises, sell more and it falls.'),
        L('<b>বর্তমান গতি</b> = এ পর্যন্ত মোট বিক্রি ÷ কত দিন পার হয়েছে।', '<b>Current pace</b> = total sold ÷ days elapsed.'),
        L('গতি ধরে রাখলে টার্গেটে কত দিন লাগবে আর ডেডলাইনে হাতে কত থাকবে সেটা দেখায়। দিন কম পড়লে "+দিন বাড়ান" বাটন প্রস্তাবিত দিন সহ আসে।', 'It shows how many days you need at this pace and the cash you will have by the deadline. If days run short, the "Add days" button suggests how many.'),
        L('স্টকে কুলাবে না হলে সতর্ক করে: মাল আনুন, দাম বাড়ান বা টার্গেট কমান।', 'If your stock cannot reach the target it warns you: restock, raise prices or lower the target.'),
      ])],
    [L('বাজেট: আদর্শ ভাগ আর বদলানো', 'Budget: the ideal split and how to edit it'),
      ul([
        L('ব্যাচ খোলার সময় বা <b>আরও → বাজেট পরিকল্পনা</b>-য় তিনটা তৈরি প্ল্যান: <b>ভারসাম্য</b> (প্রোডাক্ট ৫০%, অ্যাড ২০%, শিপিং ১৫%…), <b>কম ঝুঁকি</b> (বেশি রিজার্ভ), <b>অ্যাড-নির্ভর</b> (বেশি অ্যাড)।', 'When creating a batch, or in <b>More → Budget plan</b>, pick a ready plan: <b>Balanced</b> (product 50%, ads 20%, shipping 15%…), <b>Low risk</b> (more reserve) or <b>Ad-driven</b> (heavier ads).'),
        L('প্রতিটা খাতে <b>%</b> আর <b>৳</b> দুটো ঘর। একটা লিখলে অন্যটা নিজে বদলায়।', 'Each category has a <b>%</b> box and a <b>৳</b> box. Edit one and the other follows.'),
        L('<b>জরুরি রিজার্ভ</b> বাকিটা নিজে নেয়, তাই মোট সবসময় ১০০%।', '<b>Emergency reserve</b> takes whatever is left, so the total is always 100%.'),
        L('কোনো খাত সীমার কাছাকাছি গেলে (ডিফল্ট ৮০%) আগাম সতর্কতা আসে।', 'A warning appears when a category nears its limit (80% by default).'),
      ])],
    [L('ব্যবসার পরিকল্পনা (প্ল্যানার)', 'Business planner'),
      ul([
        L('<b>আরও → ব্যবসার পরিকল্পনা</b>-য় সংখ্যা বসিয়ে আগেই দেখা যায়: মূলধন কোথায় যাবে, কত দামে বেচলে কয়টা বিক্রি লাগবে।', 'In <b>More → Business planner</b> you can try numbers first: where capital goes and how many sales you need at a price.'),
        L('এখানে কিছু সেভ হয় না। ভালো লাগলে "বাজেটে বসান" দিয়ে ভাগটা বাজেটে নেওয়া যায়।', 'Nothing is saved there. If you like a split, apply it to your budget.'),
      ])],
    [L('ব্যাচ, ব্যাকআপ ও অফলাইন', 'Batches, backup and offline'),
      ul([
        L('<b>ব্যাচ:</b> প্রতিটা ইনভেস্টমেন্ট রাউন্ড আলাদা ব্যাচ। উপরের নামে ট্যাপ করে বদলান, আরও পেজে ডিলিট বাটন আছে।', '<b>Batches:</b> each investment round is its own batch. Tap the name at the top to switch; delete is in More.'),
        L('<b>ডেটা শুধু আপনার ফোনে</b> থাকে, কোনো সার্ভারে যায় না। তাই <b>আরও → ব্যাকআপ নিন</b> মাঝে মাঝে করুন। ফোন বদলালে ব্যাকআপ ফাইল থেকে ফিরিয়ে আনতে পারবেন।', '<b>Your data stays on your phone</b> and never goes to a server, so use <b>More → Back up</b> regularly. On a new phone, restore from the backup file.'),
        L('<b>ইনস্টল:</b> ব্রাউজারের মেনু থেকে "হোম স্ক্রিনে যোগ করুন"। একবার ইনস্টল করলে ইন্টারনেট ছাড়াই চলে।', '<b>Install:</b> use "Add to Home screen" in the browser menu. Once installed it works without internet.'),
        L('<b>আপডেট:</b> নতুন সংস্করণ এলে অ্যাপ নিজে একবার রিলোড হয়। ডেটা মোছে না।', '<b>Updates:</b> when a new version arrives, the app reloads once by itself. Your data is kept.'),
      ])],
    [L('ভুল হলে আর কাজের টিপস', 'Fixing mistakes and tips'),
      ul([
        L('ডিলিটের পর নিচে <b>"ফিরিয়ে আনুন"</b> আসে, চাপলেই আগের অবস্থা ফেরে। এক ট্যাপের বিক্রিতেও আসে।', 'After a delete, <b>"Undo"</b> appears at the bottom. It also appears after a one-tap sale.'),
        L('ট্যাবে বাম/ডানে সোয়াইপ করে পাশের ট্যাবে যাওয়া যায়।', 'Swipe left or right to move between tabs.'),
        L('সব খরচ (বিশেষ করে অ্যাড আর রিটার্ন) ঠিকমতো লিখুন, নইলে দাম আসলের চেয়ে কম দেখাবে।', 'Record every cost (especially ads and returns), otherwise the price will look lower than reality.'),
        L('দাম বাড়িয়ে বা অ্যাড কমিয়ে দেখুন কী হয়: প্রোডাক্টের স্লাইডার আর প্ল্যানার এর জন্য।', 'Try raising prices or cutting ads and see the effect: use the product slider and the planner.'),
        L('এই অ্যাপের পরামর্শ আপনার দেওয়া সংখ্যা থেকে হিসাব করা, লাভের নিশ্চয়তা নয়।', 'The advice is calculated from your own numbers and is not a guarantee of profit.'),
      ])],
  ];
  return `${sheetHead(L('কিভাবে ব্যবহার করবেন', 'How to use'), L('সম্পূর্ণ গাইড: প্রতিটা ফিচার আর দাম বের করার হিসাব', 'Complete guide: every feature and how the price is worked out'))}
    <div class="guide">${sections.map(([t, body], i) => `<details class="gd" ${i === 0 ? 'open' : ''}><summary><span class="sn">${i + 1}</span><b>${t}</b>${icon('chev', 18)}</summary><div class="gbody">${body}</div></details>`).join('')}</div>`;
}

/* ---------- ব্যাকআপ ---------- */
async function exportBackup() {
  // ছবিগুলোও ব্যাকআপে যায় (state-এর বাইরে, তাই পুরোনো ব্যাকআপও চলে)
  const images = {};
  try { for (const [k, blob] of await allImages()) if (blob && imgURL.has(k)) images[k] = await blobToDataURL(blob); } catch (e) { /* ছবি ছাড়াই */ }
  const data = JSON.stringify({ app: 'hisabi', exportedAt: new Date().toISOString(), state, images });
  const name = `hisabi-backup-${today()}.json`;
  const done = () => { state.settings.lastBackup = Date.now(); commit(L('ব্যাকআপ তৈরি হয়েছে', 'Backup created')); };
  let file = null;
  try { file = new File([data], name, { type: 'application/json' }); } catch (e) { /* পুরোনো ব্রাউজার */ }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: L('হিসাবী ব্যাকআপ', 'Hisabi backup') });
      return done();
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  done();
}
$('#import-file').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      const s = obj && obj.state;
      if (!s || !Array.isArray(s.batches)) throw new Error('bad');
      if (!confirm(L(`ব্যাকআপে ${cnt(s.batches.length)} ব্যাচ আছে। এখনকার সব ডেটা বদলে ব্যাকআপের ডেটা বসবে। চালিয়ে যাবেন?`,
        `The backup has ${s.batches.length} batch(es). It will replace all current data. Continue?`))) return;
      const lang = state.settings.lang;
      state = migrate(s);
      state.settings.lang = lang;
      tab = 'home'; trail = ['home'];
      commit(L('ব্যাকআপ থেকে ফেরত আনা হয়েছে', 'Backup restored'));
      const imgs = obj.images && typeof obj.images === 'object' ? Object.entries(obj.images) : [];
      if (imgs.length) {
        Promise.all(imgs.map(([id, d]) => (typeof d === 'string' && d.startsWith('data:image/')
          ? fetch(d).then(r => r.blob()).then(bl => putImage(id, bl)).catch(() => false) : false)))
          .then(r => { render(); if (r.includes(false)) toast(L('কিছু ছবি ফেরত আনা যায়নি', 'Some photos could not be restored'), 'danger'); });
      }
    } catch (err) {
      toast(L('ফাইলটা সঠিক ব্যাকআপ না', 'That file is not a valid backup'), 'danger');
    }
  };
  reader.readAsText(file);
});

/* ---------- ইভেন্ট ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('submit', e => {
  const fn = FORMS[e.target.dataset.form];
  if (fn) { e.preventDefault(); fn(e.target); }
});
const onLive = e => {
  const f = e.target.closest && e.target.closest('form[data-live]');
  if (f && e.type === 'input') {
    const w = e.target.closest('.field');
    if (w) w.classList.remove('invalid');
  }
  if (f) runLive(f, e.target);
};
// বাম/ডানে সোয়াইপ করলে পাশের ট্যাবে যাবে
let sw0 = null;
document.addEventListener('touchstart', e => {
  const t = e.touches[0];
  const skip = sheetOpen || e.touches.length > 1 || !e.target.closest('#view') || e.target.closest('input, select, textarea, .chiprow, .seg, details[open]');
  sw0 = skip ? null : { x: t.clientX, y: t.clientY, t: Date.now() };
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!sw0 || !activeBatch()) return;
  const t = e.changedTouches[0], dx = t.clientX - sw0.x, dy = t.clientY - sw0.y, dt = Date.now() - sw0.t;
  sw0 = null;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.7 || dt > 700) return;
  const i = TAB_ORDER.indexOf(tab) + (dx < 0 ? 1 : -1);
  if (i >= 0 && i < TAB_ORDER.length) setTab(TAB_ORDER[i], dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener('input', onLive);
document.addEventListener('change', onLive);

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
