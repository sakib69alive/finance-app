'use strict';

/* =========================================================
   হিসাবী / Hisabi — CORE (সব মডিউলের জন্য এক)
   এখানে শুধু শেয়ারড জিনিস: হেল্পার, স্টোর, শিট, ব্যাকআপ, নেভিগেশন।
   ব্যবসার নির্দিষ্ট কোড js/trade.js-এ। নতুন মডিউল যোগ করতে MODULES.md দেখুন।
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
  prev: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
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
const LOGO = '<svg viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1D1D1B"/><stop offset="1" stop-color="#34332F"/></linearGradient></defs><rect width="512" height="512" fill="url(#lg)"/><rect x="102" y="271" width="68" height="138" rx="18" fill="#CDB985" opacity=".7"/><rect x="222" y="195" width="68" height="215" rx="18" fill="#CDB985" opacity=".92"/><rect x="342" y="102" width="68" height="307" rx="18" fill="#F6D98B"/></svg>';

/* ---------- স্টেট (localStorage) ---------- */
const STORE_KEY = 'hisabi:v1';
const APP_VERSION = 'v66'; // sw.js-এর VERSION-এর সাথে মিলিয়ে বাড়ান

// boot.js লোডের আগে খালি শেল; আসল ডেটা boot.js-এ মডিউল রেজিস্টার হওয়ার পরে আসে
let state = { settings: { lang: 'bn' }, batches: [] };
let persistAsked = false;

// সাধারণ ডিফল্ট + প্রতিটা মডিউলের নিজস্ব migrate (পুরোনো ডেটা কখনো ভাঙবে না)
function migrate(s) {
  s.version = 1;
  s.settings = Object.assign({ lang: 'bn', rates: { CNY: '', USD: '' }, lastBackup: 0, module: 'trade' }, s.settings || {});
  moduleList().forEach(m => { if (m.migrate) m.migrate(s); });
  if (!MODULES[s.settings.module]) s.settings.module = moduleList()[0].id;
  if (s.settings.onboarded === undefined) s.settings.onboarded = moduleList().some(m => m.hasData && m.hasData(s));
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') return migrate(s);
    }
  } catch (e) { /* নষ্ট ডেটা হলে নতুন করে শুরু */ }
  return migrate({});
}
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
    const ids = new Set(moduleList().flatMap(m => (m.imageIds ? m.imageIds() : [])));
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

/* =========================================================
   মডিউল সিস্টেম: প্রতিটা "ফিচার-গ্রুপ" (ব্যবসা, দোকান, ব্যক্তিগত হিসাব, আড্ডার খরচ…) একটা মডিউল
   registerModule({ id, icon, name(), migrate(state), ready(), welcome(), context(), topbar(ctx), tabs, guide() })
   ========================================================= */
const MODULES = {};
const registerModule = def => { MODULES[def.id] = def; };
// পিন-লক করা মডিউল (def.pin): এই সেশনে একবার পিন দিলে খোলে, অ্যাপ বন্ধ করলে আবার লক
const unlockedMods = new Set();
const modLocked = m => !!m.pin && !unlockedMods.has(m.id);
function unlockSheet(id) {
  return `${sheetHead(L('পিন দিন', 'Enter PIN'), MODULES[id].name())}<form data-form="unlock" autocomplete="off"><input type="hidden" name="id" value="${id}">
    <label class="field"><span>${L('৪ সংখ্যার পিন', '4-digit PIN')}</span><input class="input" name="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></label>
    <button class="btn primary block mt12" type="submit">${L('খুলুন', 'Unlock')}</button></form>`;
}
const moduleList = () => Object.values(MODULES);
const currentModule = () => MODULES[state.settings.module] || moduleList()[0];
const tabIds = () => currentModule().tabs.map(t => t.id);
const tabLabel = id => { const t = currentModule().tabs.find(x => x.id === id); return t ? t.label() : id; };

let tab = 'home';
let trail = ['home']; // কোন কোন ট্যাবে গেছেন, ক্রমানুসারে (সর্বোচ্চ ৫টা)
function setTab(id, dir = 0) {
  if (!tabIds().includes(id) || id === tab) return;
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

// একাধিক মডিউল থাকলে টপবারে মডিউল বদলের বাটন, একটা থাকলে কিছুই দেখায় না
const moduleSwitcher = () => {
  if (moduleList().length < 2) return '';
  const m = currentModule();
  return `<button type="button" class="icon-btn txt modbtn" data-action="modules" aria-label="${L('কী নিয়ে কাজ করবেন বদলান', 'Switch what you are working on')}">${icon(m.icon, 18)}<span>${m.short ? m.short() : m.name()}</span></button>`;
};
const helpBtn = () => `<button type="button" class="icon-btn txt" data-action="guide" aria-label="${L('সাহায্য', 'Help')}">?</button>`;
function moduleCards(cur) {
  return `<div class="pickcards">${moduleList().map(m => `<button type="button" class="pickcard ${m.id === cur ? 'on' : ''}" data-action="switch-module" data-id="${m.id}">
      <span class="pk-ic">${m.emoji || ''}</span><span class="pk-t"><b>${m.pin ? '🔒 ' : ''}${m.name()}</b><small>${m.tagline ? m.tagline() : ''}</small></span>
      ${m.id === cur ? `<span class="pk-ok">${icon('check', 20)}</span>` : '<span class="pk-go">›</span>'}</button>`).join('')}</div>`;
}
function modulesSheet() {
  return `${sheetHead(L('কী নিয়ে কাজ করবেন?', 'What do you want to do?'), L('যেকোনো সময় বদলাতে পারবেন, দুটোর হিসাব আলাদা থাকে', 'Switch anytime; each keeps its own books'))}${moduleCards(currentModule().id)}`;
}
function onboardHtml() {
  return `<div class="welcome"><div class="welcome-top"><div class="logo">${LOGO}</div>${langBtn()}</div>
    <h1>${L('হিসাবী-তে স্বাগতম 👋', 'Welcome to Hisabi 👋')}</h1>
    <p class="lead">${L('আপনি কী নিয়ে হিসাব রাখতে চান? একটা বেছে নিন। পরে উপরের বাটন থেকে অন্যটাও চালাতে পারবেন।', 'What do you want to keep track of? Pick one. You can use the other one later from the top bar.')}</p>
    ${moduleCards('')}
    <p class="tiny">${L('সব ডেটা শুধু আপনার ফোনে থাকে। কোনো লগইন লাগে না।', 'All data stays on your phone. No login needed.')}</p></div>`;
}

function render() {
  document.documentElement.lang = isEN() ? 'en' : 'bn';
  document.title = L('হিসাবী', 'Hisabi');
  if (!state.settings.onboarded) {
    $('#topbar').innerHTML = '';
    $('#tabbar').innerHTML = '';
    $('#view').innerHTML = onboardHtml();
    return;
  }
  let m = currentModule();
  if (modLocked(m)) { state.settings.module = moduleList().find(x => !modLocked(x)).id; m = currentModule(); tab = m.tabs[0].id; trail = [tab]; }
  if (!m.ready()) {
    $('#topbar').innerHTML = '';
    $('#tabbar').innerHTML = '';
    $('#view').innerHTML = m.welcome();
    return;
  }
  const ctx = m.context();
  if (!tabIds().includes(tab)) { tab = m.tabs[0].id; trail = [tab]; }
  const cur = m.tabs.find(t => t.id === tab);
  $('#topbar').innerHTML = m.topbar(ctx);
  $('#view').innerHTML = cur.view(ctx);
  $('#tabbar').innerHTML = `${m.fab ? m.fab() : ''}<div class="tabbar-inner">${m.tabs.map(t =>
    `<button type="button" class="tab ${tab === t.id ? 'active' : ''}" data-action="tab" data-tab="${t.id}"><span class="tw">${icon(t.icon)}</span>${t.label()}</button>`).join('')}</div>`;
  refreshSheet();
}

// "আরও" ট্যাবের সাধারণ অংশ: অ্যাপ, ডেটা, ভাষা, ভার্সন (সব মডিউলে একই)
const menuItem = (action, ic, title, sub) => `<button type="button" class="mitem" data-action="${action}">
    <span class="mi">${icon(ic, 20)}</span><span class="mt"><b>${title}</b><small>${sub}</small></span>${icon('chev', 18)}</button>`;
function appSections() {
  const mi = menuItem;
  const lang = state.settings.lang;
  const last = state.settings.lastBackup ? new Date(state.settings.lastBackup) : null;
  return `${menuGroup('🧭 ' + L('সাহায্য ও অ্যাপ', 'Help & app'), L('কিভাবে চালাবেন, ফোনে রাখবেন', 'How to use it, keep it on your phone'),
      `${isStandalone() ? '' : mi('install-app', 'download', L('ফোনে ইনস্টল করুন', 'Install on phone'), L('একবার ইনস্টল করলে অফলাইনে চলবে', 'Works offline once installed'))}
      ${mi('guide', 'spark', L('কিভাবে ব্যবহার করবেন', 'How to use'), L('সব ফিচার আর হিসাব সহজ ভাষায়', 'Every feature and every figure, in plain words'))}`)}
    ${menuGroup('💾 ' + L('ডেটা ও ব্যাকআপ', 'Data & backup'), L('ফোন বদলালে ডেটা হারাবে, তাই মাঝে মাঝে ব্যাকআপ নিন', 'Changing phones loses data, so back up now and then'),
      `${mi('export', 'download', L('ব্যাকআপ নিন', 'Back up'), last ? `${L('শেষ ব্যাকআপ', 'Last backup')}: ${fmtDate(last.toISOString().slice(0, 10))}` : L('এখনও নেওয়া হয়নি', 'Not yet'))}
      ${mi('import', 'upload', L('ব্যাকআপ থেকে ফেরত আনুন', 'Restore backup'), L('আগের ব্যাকআপ ফাইল দিন', 'Pick a backup file'))}
      ${typeof demoBuild === 'function' ? mi('demo-load', 'spark', L('ডেমো ডেটা দিয়ে ভরুন', 'Fill with demo data'), L('সব ফিচার দেখতে (এখনকার সব ডেটা মুছে যায়)', 'To see every feature (replaces all current data)')) : ''}`)}
    <div class="mgroup"><div class="mg-head"><b>🌐 ${L('ভাষা', 'Language')}</b></div></div>
    <div class="seg">${[['bn', 'বাংলা'], ['en', 'English']].map(([v, l]) =>
      `<button type="button" class="${lang === v ? 'active' : ''}" data-action="lang" data-v="${v}">${l}</button>`).join('')}</div>
    <p class="about">${L('ভার্সন', 'Version')} ${APP_VERSION}<br>${L('হিসাবী · সব ডেটা শুধু এই ফোনে থাকে, কোনো সার্ভারে যায় না।<br>ফোন বদলালে বা অ্যাপ মুছলে ডেটা হারাবে, তাই মাঝে মাঝে ব্যাকআপ নিন।',
      'Hisabi · All data stays on this phone and never goes to a server.<br>Changing phones or deleting the app loses data, so back up now and then.')}<br><br>${L('বানিয়েছেন', 'Made by')} <a href="https://github.com/sakib69alive" target="_blank" rel="noopener">@sakib69alive</a></p>`;
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
// প্রতিটা রেকর্ডে একই রকম এডিট (কলম) ও ডিলিট (বিন) বাটন; extra = অতিরিক্ত data-অ্যাট্রিবিউট
const rowTools = (editAct, delAct, id, extra = '') => `<span class="rowtools">${editAct ? `<button type="button" class="rowedit" data-action="${editAct}" data-id="${esc(id)}" ${extra} aria-label="${L('এডিট', 'Edit')}">${icon('edit', 17)}</button>` : ''}${delAct ? `<button type="button" class="rowdel" data-action="${delAct}" data-id="${esc(id)}" ${extra} aria-label="${L('ডিলিট', 'Delete')}">${icon('trash', 17)}</button>` : ''}</span>`;
// "আরও" মেনুর গ্রুপ: শিরোনাম + এক লাইনের ব্যাখ্যা + আইটেম
const menuGroup = (title, sub, items) => `<div class="mgroup"><div class="mg-head"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div><div class="menu">${items}</div></div>`;
const hintLine = t => `<div class="hint">${t}</div>`;
const sheetHead = (title, sub = '') => `<div class="sheet-head"><h3>${title}${sub ? `<small>${sub}</small>` : ''}</h3>
  <button type="button" class="icon-btn" data-action="close-sheet" aria-label="${L('বন্ধ করুন', 'Close')}">${icon('x', 20)}</button></div>`;
const moneyInput = (name, value, ph = '0', extra = '') => `<div class="input-wrap has-prefix"><span class="prefix">৳</span>
  <input class="input" name="${name}" inputmode="decimal" value="${esc(value ?? '')}" placeholder="${ph}" ${extra}></div>`;
const empty = (em, title, text, btn = '') => `<div class="empty"><div class="em">${em}</div><b>${title}</b>${text}${btn}</div>`;


/* ---------- শিট (নিচ থেকে ওঠা প্যানেল) ---------- */
let sheetOpen = false;
let sheetRebuild = null; // খোলা বিস্তারিত শিট নিজে নতুন করে আঁকার ফাংশন: কিছু বদলালে শিটের অঙ্কও সাথে সাথে বদলায়
function openSheet(html, rebuild) {
  sheetRebuild = typeof rebuild === 'function' ? rebuild : null;
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
function refreshSheet() {
  if (!sheetOpen || !sheetRebuild) return;
  const sb = $('#sheet-root .sheet-body'), ae = document.activeElement;
  if (!sb || (ae && sb.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) return;
  try { const top = sb.scrollTop, html = sheetRebuild(); if (html) { sb.innerHTML = html; sb.scrollTop = top; } } catch (e) { /* পুরোনো শিটই থাকুক */ }
}
function hideSheet() {
  sheetRebuild = null;
  document.dispatchEvent(new Event('sheetclose'));
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
   অ্যাকশন / ফর্ম / লাইভ রেজিস্ট্রি — প্রতিটা মডিউল Object.assign দিয়ে নিজেরটা যোগ করে
   ========================================================= */
const ACTIONS = {
  'close-sheet': () => closeSheet(),
  tab: el => setTab(el.dataset.tab),
  'go-home': () => { if (sheetOpen) closeSheet(); setTab('home'); window.scrollTo(0, 0); },
  'toggle-lang': () => { state.settings.lang = isEN() ? 'bn' : 'en'; if (sheetOpen) closeSheet(); commit(); },
  lang: el => { state.settings.lang = el.dataset.v; commit(); },
  'install-app': async () => {
    if (deferredInstall) {
      deferredInstall.prompt();
      try { await deferredInstall.userChoice; } catch (e) { /* ignore */ }
      deferredInstall = null;
      render();
    } else openSheet(installHelp());
  },
  export: () => exportBackup(),
  import: () => $('#import-file').click(),
  guide: () => { const m = currentModule(); if (m.guide) openSheet(m.guide()); },
  modules: () => openSheet(modulesSheet()),
  'switch-module': el => {
    if (modLocked(MODULES[el.dataset.id])) { openSheet(unlockSheet(el.dataset.id)); return; }
    state.settings.module = el.dataset.id;
    state.settings.onboarded = true;
    tab = currentModule().tabs[0].id; trail = [tab];
    if (sheetOpen) closeSheet();
    commit();
    window.scrollTo(0, 0);
  },
};
const FORMS = {
  unlock: f => {
    const id = f.elements.id.value;
    if (f.elements.pin.value.trim() !== MODULES[id].pin) return fail(f, L('পিন ভুল', 'Wrong PIN'), 'pin');
    unlockedMods.add(id);
    closeSheet();
    ACTIONS['switch-module']({ dataset: { id } });
  },
};
const LIVE = {};
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
      if (!s || typeof s !== 'object' || (!s.settings && !Array.isArray(s.batches))) throw new Error('bad');
      const what = moduleList().map(m => (m.backupSummary ? m.backupSummary(s) : '')).filter(Boolean).join(', ');
      if (!confirm(L(`ব্যাকআপে আছে: ${what || 'ডেটা'}। এখনকার সব ডেটা বদলে ব্যাকআপের ডেটা বসবে। চালিয়ে যাবেন?`,
        `The backup contains: ${what || 'data'}. It will replace all current data. Continue?`))) return;
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
  if (!sw0 || !currentModule().ready()) return;
  const t = e.changedTouches[0], dx = t.clientX - sw0.x, dy = t.clientY - sw0.y, dt = Date.now() - sw0.t;
  sw0 = null;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.7 || dt > 700) return;
  const ids = tabIds(), i = ids.indexOf(tab) + (dx < 0 ? 1 : -1);
  if (i >= 0 && i < ids.length) setTab(ids[i], dx < 0 ? 1 : -1);
}, { passive: true });
document.addEventListener('input', onLive);
document.addEventListener('change', onLive);
