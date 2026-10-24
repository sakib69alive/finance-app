'use strict';

/* =========================================================
   মডিউল: বাজার সদাই (বাজারের তালিকা, বাজেট, আসল দাম, পেমেন্ট, মজুত, দামের ইতিহাস, রিপোর্ট)
   ডেটা: state.bazar (অন্য মডিউল থেকে আলাদা)। হিসাব: js/bazar-calc.js
   ছবি: IndexedDB-তে 'bzr:<id>' নামে (বিদ্যমান ছবির ব্যবস্থা), ব্যাকআপে নিজে থেকে যায়
   ========================================================= */

Object.assign(ICONS, {
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M3 4h2.5l2.2 11h10.6l2-8H6.4"/>',
  box: '<path d="M4 8l8-4 8 4v9l-8 4-8-4Z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
});

const BZ_CATS = [
  { k: 'grain', bn: 'চাল, ডাল ও শস্য', en: 'Rice, lentils & grains', e: '🌾' }, { k: 'fish', bn: 'মাছ, মাংস ও ডিম', en: 'Fish, meat & eggs', e: '🐟' }, { k: 'veg', bn: 'শাকসবজি', en: 'Vegetables', e: '🥬' },
  { k: 'fruit', bn: 'ফলমূল', en: 'Fruits', e: '🍎' }, { k: 'dairy', bn: 'দুধ ও দুগ্ধজাত খাবার', en: 'Milk & dairy', e: '🥛' }, { k: 'oil', bn: 'তেল, মসলা ও রান্নার উপকরণ', en: 'Oil, spices & cooking items', e: '🫒' },
  { k: 'snack', bn: 'নাশতা ও পানীয়', en: 'Snacks & drinks', e: '☕' }, { k: 'clean', bn: 'সাবান, ডিটারজেন্ট ও পরিষ্কার-পরিচ্ছন্নতার পণ্য', en: 'Soap, detergent & cleaning', e: '🧼' },
  { k: 'tissue', bn: 'টিস্যু ও দৈনন্দিন ব্যবহার্য জিনিস', en: 'Tissue & daily-use items', e: '🧻' }, { k: 'other', bn: 'অন্যান্য', en: 'Other', e: '🛒' },
];
// আগের সংস্করণের খাত: নতুন তালিকায় দেখানো হয় না, কিন্তু পুরোনো পণ্যের নাম ঠিক থাকে
const BZ_CATS_OLD = [{ k: 'pulses', bn: 'ডাল ও ডালজাতীয়', en: 'Pulses & lentils', e: '🫘' }, { k: 'meat', bn: 'মাংস ও মুরগি', en: 'Meat & chicken', e: '🍗' }, { k: 'eggmilk', bn: 'ডিম ও দুধ', en: 'Eggs & milk', e: '🥚' },
  { k: 'spice', bn: 'মসলা', en: 'Spices', e: '🌶️' }, { k: 'tea', bn: 'চা, কফি ও অন্যান্য খাবার', en: 'Tea, coffee & other food', e: '☕' }, { k: 'care', bn: 'ব্যক্তিগত পরিচর্যা', en: 'Personal care', e: '🧴' }];
const BZ_UNITS = () => (isEN() ? ['kg', 'g', 'litre', 'ml', 'pcs', 'dozen', 'hali', 'packet', 'bottle', 'bag', 'bunch'] : ['কেজি', 'গ্রাম', 'লিটার', 'মিলি', 'পিস', 'ডজন', 'হালি', 'প্যাকেট', 'বোতল', 'বস্তা', 'আঁটি']);
const BZ_PAY = { cash: ['নগদ', 'Cash'], digital: ['কার্ড / ডিজিটাল', 'Card / digital'], advance: ['অগ্রিম', 'Advance'], later: ['পরে বাকি শোধ', 'Paid later'] };
const BZ_ST = { todo: ['কেনা হয়নি', 'Not bought'], partial: ['আংশিক কেনা', 'Partly bought'], done: ['কেনা হয়েছে', 'Bought'], na: ['পাওয়া যায়নি', 'Not found'] };
const BZ_MST = { active: ['চলমান', 'Active'], done: ['সম্পন্ন', 'Done'], cancelled: ['বাতিল', 'Cancelled'] };
const bzSt = k => BZ_ST[k][isEN() ? 1 : 0], bzMst = k => BZ_MST[k][isEN() ? 1 : 0];

/* ---------- ডেটা ---------- */
function bazarMigrate(s) {
  const b = s.bazar = Object.assign({ schema: BZ_SCHEMA, markets: [], cats: [], stock: [], templates: [], activeId: null, autoStock: false, sec: 'market', houseEv: null }, s.bazar || {});
  ['markets', 'cats', 'stock', 'templates'].forEach(k => { if (!Array.isArray(b[k])) b[k] = []; });
  b.markets.forEach(m => {
    ['items', 'payments', 'receipts'].forEach(k => { if (!Array.isArray(m[k])) m[k] = []; });
    if (!m.catBudgets || typeof m.catBudgets !== 'object') m.catBudgets = {};
  });
}
const bz = () => state.bazar;
const bzMarkets = () => bz().markets.filter(m => !m.del);
const bzMkt = id => bz().markets.find(m => m.id === id && !m.del) || null;
const bzByDate = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);
function bzCur() {
  let m = bzMkt(bz().activeId);
  if (!m) { const all = bzMarkets().sort(bzByDate); m = all.find(x => x.status === 'active') || all[0] || null; bz().activeId = m ? m.id : null; }
  return m;
}
const bzCats = () => BZ_CATS.concat(bz().cats.filter(c => !c.del).map(c => ({ k: c.k, bn: c.name, en: c.name, e: '🏷️', custom: true })));
const bzCatsAll = () => BZ_CATS.concat(BZ_CATS_OLD, bz().cats.filter(c => !c.del).map(c => ({ k: c.k, bn: c.name, en: c.name, e: '🏷️', custom: true })));
const bzCat = k => bzCatsAll().find(c => c.k === k) || BZ_CATS[BZ_CATS.length - 1];
const bzCatName = k => { const c = bzCat(k); return isEN() ? c.en : c.bn; };
const bzM = bzMoney;
const bzShopNames = () => [...new Set(bz().markets.flatMap(m => [m.shop].concat(m.items.map(i => i.shop))).map(s => (s || '').trim()).filter(Boolean))];
const bzUnitOpts = () => `<datalist id="bz-units">${BZ_UNITS().map(u => `<option value="${u}">`).join('')}</datalist>`;
const bzItem = (m, id) => m.items.find(i => i.id === id && !i.del) || null;
const bzSelect = (name, opts, val) => `<select class="input" name="${name}">${opts.map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const bzCatSelect = (name, val) => bzSelect(name, bzCats().map(c => [c.k, `${c.e} ${esc(isEN() ? c.en : c.bn)}`]), val || 'other');
const bzBar = (p, cls = '', col = 'var(--good)') => `<div class="bbar"><span class="${cls}" style="--c:${col};width:${clamp(p, 0, 100).toFixed(1)}%"></span></div>`;
const bzDateOk = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
// নামে তারিখ আগেই থাকলে ("বাজার 24 অক্টো") আলাদা করে আবার তারিখ দেখানো হয় না
const bzDateInName = m => !!m.date && String(m.name || '').includes(fmtDate(m.date));
const bzDS = m => (bzDateInName(m) ? '' : ' · ' + fmtDate(m.date));
const bzDP = m => (bzDateInName(m) ? '' : fmtDate(m.date) + ' · ');

// সব বদলের পর: সময় বসানো, মূল খরচে যুক্ত থাকলে সেটাও মিলিয়ে দেওয়া, তারপর সেভ
function bzSave(m, msg) { if (m) { m.updatedAt = Date.now(); bzAutoLink(m); bzSyncMain(m); } commit(msg); }
// "সংসারের হিসাবে নিজে যোগ" চালু থাকলে প্রতিটা বাজারের আসল খরচ নিজে ওই ইভেন্টে একটাই খরচ হিসেবে যায়
function bzAutoLink(m) { const id = bz().linkEv; if (id && !m.sync && m.status !== 'cancelled' && !m.del && bzTargets().some(e => e.id === id) && bzMarketCalc(m).actualTotal > 0) m.sync = { evId: id }; }
// যে পণ্যগুলো আগে মজুতে গেছে (বা অটো-মজুত চালু) সেগুলোর মজুত পরিবর্তনের সাথে মিলে যায়
const bzRestock = m => { if (bz().autoStock) bzApplyStock(bz(), m); else if (m.items.some(i => i.stockedQty > 0)) bzApplyStock(bz(), m, true); };
function bzNewItem(o) { return Object.assign({ id: uid(), name: '', cat: 'other', qty: 1000, unit: '', est: 0, status: 'todo', aQty: 0, aPrice: null, aTotal: null, note: '', createdAt: Date.now() }, o); }

/* ---------- মূল খরচের সাথে সংযোগ (Hangout-এর দৈনন্দিন ইভেন্টে একটাই খরচ, ref = bz:<বাজারের id>) ---------- */
function bzTargets() { return []; } // সাময়িকভাবে বন্ধ: বাজার সদাই এখন আলাদা মডিউল, আড্ডা ও যৌথ খরচের সাথে যুক্ত নয়
function bzTargetsLinked() {
  if (typeof HG_TYPES === 'undefined' || !state.hangout || !Array.isArray(state.hangout.events)) return [];
  return state.hangout.events.filter(e => !e.del && e.status === 'active' && (HG_TYPES[e.type] || {}).g === 'daily');
}
function bzSyncMain(m) {
  const s = m.sync; if (!s) return;
  const ev = bzTargets().find(e => e.id === s.evId);
  if (!ev) { m.sync = null; return; }
  const ref = 'bz:' + m.id, ex = ev.expenses.find(e => e.ref === ref);
  const total = bzMarketCalc(m).actualTotal;
  const drop = () => { ev.expenses = ev.expenses.filter(e => e.ref !== ref); };
  if (m.del || m.status === 'cancelled') { drop(); m.sync = null; return; }
  if (ex && ex.del) { m.sync = null; return; } // মূল দিকে নিজে মুছে ফেলেছেন
  if (!(total > 0)) { drop(); return; }
  const ids = ev.participants.map(p => p.id), act = ev.participants.filter(p => p.active).map(p => p.id);
  const payer = (ev.participants.find(p => p.org && p.active) || ev.participants.find(p => p.active) || {}).id;
  if (!payer) return;
  const split = typeof hgSplit === 'function' ? hgSplit(total, 'equal', ids, { incl: act }) : null;
  const alloc = split && split.ok ? split.alloc : Object.fromEntries(ids.map(id => [id, id === payer ? total : 0]));
  const cat = (ev.cats.find(c => c.k === 'groceries') || ev.cats.find(c => c.k === 'staples') || ev.cats.find(c => c.k === 'other') || ev.cats[0] || { k: 'other' }).k;
  const rec = { title: L('বাজার: ', 'Market: ') + m.name, category: cat, date: m.date, info: { kind: 'market', shop: m.shop || '', ym: (m.date || '').slice(0, 7), fromBazar: true }, desc: L('বাজার সদাই থেকে', 'From Bazar Sadai'), total, payers: [{ pid: payer, amt: total }], method: 'equal', spec: { incl: act, values: {} }, alloc, personal: null, mode: 'split', ref, updatedAt: Date.now(), meta: {} };
  if (ex) Object.assign(ex, rec); else ev.expenses.push(Object.assign({ id: uid(), createdAt: Date.now() }, rec));
  ev.updatedAt = Date.now();
}

/* ---------- টপবার ---------- */
// এই মডিউলে দুটো অংশ: বাজার সদাই আর মাসিক সংসার হিসাব। উপরের সুইচে এক ট্যাপে বদল
const bzSec = () => (bz().sec === 'house' ? 'house' : 'market');
const bzSecNav = () => `<nav class="secsw" aria-label="${L('কোন অংশ', 'Which part')}">${[['market', '🛒', L('বাজার সদাই', 'Groceries')], ['house', '🏡', L('মাসিক সংসার হিসাব', 'Monthly household')]].map(([k, e, l]) =>
  `<button type="button" class="${bzSec() === k ? 'on' : ''}" data-action="bz-sec" data-s="${k}"><span>${e}</span>${l}</button>`).join('')}</nav>`;
function bzTopbar() {
  const house = bzSec() === 'house', m = house ? null : bzCur(), ev = house ? bzHouseCur() : null;
  const title = house ? (ev ? ev.name : L('মাসিক সংসার', 'Monthly household')) : (m ? m.name : L('বাজার সদাই', 'Groceries'));
  return `<div class="batch-btn">
      <button type="button" class="home-btn" data-action="go-home" aria-label="${L('হোমে ফিরুন', 'Back to Home')}"><span class="logo-sm">${LOGO}</span></button>
      <span class="bb-text"><button type="button" class="home-link" data-action="go-home">${L('হিসাবী', 'Hisabi')}</button>
        <button type="button" class="batch-name" data-action="${house ? 'bz-house-list' : 'bz-markets'}" aria-label="${house ? L('হিসাব বদলান', 'Switch') : L('বাজার বদলান', 'Switch market')}"><b>${esc(title)}</b>${icon('chev', 16)}</button></span>
    </div>
    <div class="top-actions">${moduleSwitcher()}${helpBtn()}${langBtn()}</div>
    ${bzSecNav()}`;
}

/* ---------- হোম ---------- */
function bzFlagMsg(f) {
  const c = f.k ? bzCatName(f.k) : '';
  return {
    budget_over: L(`বাজেটের ${bzM(f.amt)} বেশি খরচ হয়ে গেছে।`, `You are ${bzM(f.amt)} over budget.`), budget_near: L(`বাজেটের প্রায় সবটা শেষ, বাকি ${bzM(f.amt)}।`, `Budget almost used, ${bzM(f.amt)} left.`),
    plan_over: L(`তালিকার আনুমানিক দামই বাজেটের ${bzM(f.amt)} বেশি। কিছু পণ্য কমাতে পারেন।`, `The estimated list already exceeds the budget by ${bzM(f.amt)}. Consider trimming items.`), cat_over: L(`${c} খাতে বরাদ্দের ${bzM(f.amt)} বেশি গেছে।`, `${c} is ${bzM(f.amt)} over its share.`),
  }[f.code];
}
function bzEmptyHome() {
  const low = bzLowStock(bz()).length;
  return `${bzHowCard(true)}<section class="card">${empty('🛒', L('এখনও কোনো বাজার নেই', 'No market yet'), `<p class="hint">${L('নতুন বাজার খুলে তালিকা বানান, বাজেট ঠিক করুন, কেনার সাথে সাথে আসল দাম লিখুন।', 'Open a market, build the list, set a budget and enter real prices as you buy.')}</p>`,
    `<button type="button" class="btn primary block mt8" data-action="bz-new">${icon('plus', 18)} ${L('নতুন বাজার', 'New market')}</button>${bz().templates.length ? `<button type="button" class="btn block mt8" data-action="bz-tpls">📋 ${L('টেমপ্লেট থেকে শুরু করুন', 'Start from a template')}</button>` : ''}`)}</section>
    ${low ? bzLowCard() : ''}`;
}
function bzLowCard(m) {
  const low = bzLowStock(bz());
  if (!low.length) return '';
  return `<section class="card attn"><div class="card-head"><h2>📦 ${L('মজুত কমে গেছে', 'Running low at home')}</h2><span class="achips">${low.length}</span></div>
    <p class="hint" style="margin:0 0 8px">${low.slice(0, 4).map(s => `<b>${esc(s.name)}</b> ${bzQtyStr(s.qty)} ${esc(s.unit)}`).join(' · ')}${low.length > 4 ? ' …' : ''}</p>
    ${m && m.status !== 'cancelled' ? `<button type="button" class="btn sm primary" data-action="bz-low-add">${L('এই বাজারের তালিকায় যোগ করুন', 'Add to this list')}</button>` : `<button type="button" class="btn sm" data-action="tab" data-tab="stock">${L('মজুত দেখুন', 'See stock')}</button>`}</section>`;
}
// নতুনদের জন্য ৩ ধাপের ছোট গাইড (খুলে/বন্ধ করা যায়)
function bzHowCard(open) {
  const steps = [
    ['📝', L('তালিকা বানান', 'Make a list'), L('"তালিকা" ট্যাবে "বাছুন" চেপে পণ্য ট্যাপ করুন, অথবা নাম লিখুন। কতটা লাগবে আর আনুমানিক দাম দিলে মোট নিজে হিসাব হবে।', 'In the "List" tab tap "Pick" and select items, or type a name. Add the quantity and an estimated price and the total works itself out.')],
    ['✅', L('কেনার সময় টিক দিন', 'Tick as you buy'), L('পণ্যের বামের গোল বাটনে চাপ দিয়ে লিখুন কত কিনলেন আর আসল দাম কত পড়ল। চাইলে মোট কত দিলেন সেটাও লেখা যায়।', 'Tap the round button on an item and enter what you bought and the real price, or just the total you paid.')],
    ['📊', L('বাজেটের সাথে মিলিয়ে দেখুন', 'Compare with your budget'), L('উপরের হলুদ কার্ডে আনুমানিক বনাম আসল খরচ আর বাজেটের কত বাকি দেখা যায়। পুরোটা দেখতে কার্ডে চাপুন।', 'The yellow card shows estimated vs actual and what is left of the budget. Tap it for everything.')],
  ];
  return `<details class="card bzhow" ${open ? 'open' : ''}><summary><b>💡 ${L('কিভাবে চালাবেন? ৩ ধাপ', 'How does it work? 3 steps')}</b>${icon('chev', 18)}</summary>
    <ol class="bzsteps">${steps.map(([e, t, d], i) => `<li><span class="bzn">${i + 1}</span><div><b>${e} ${t}</b><p>${d}</p></div></li>`).join('')}</ol>
    <div class="bztip"><span>✏️ 🗑️</span><p>${L('ভুল হলে প্রতিটা পণ্য, পেমেন্ট ও বাজারের পাশে এডিট আর ডিলিট বাটন আছে। ডিলিটের পর "ফিরিয়ে আনুন" চাপলে ফেরত আসে।', 'Made a mistake? Every item, payment and market has edit and delete buttons, and "Undo" brings a deleted one back.')}</p></div></details>`;
}
/* ---------- টাকা কোথায় গেল: আসল কেনা থেকে নিজে আঁকা চার্ট (কোনো আগে-ঠিক-করা ভাগ নেই) ---------- */
const BZ_COLORS = ['#D9BE6A', '#6FC3B2', '#F6C453', '#F29BB5', '#A8D58F', '#8FB5F5', '#E8A87C', '#C9B6E4', '#B5B5A0', '#7FE3A0'];
function bzSpendCard(m, c) {
  const rows = c.catRows.filter(r => r.actual > 0).sort((a, b) => b.actual - a.actual), tot = bzSum(rows.map(r => r.actual));
  if (!rows.length) return `<section class="card"><div class="card-head"><h2>${L('টাকা কোথায় গেল', 'Where the money went')}</h2></div><p class="hint" style="margin:0">${L('পণ্য কিনে আসল দাম লিখলে খাত অনুযায়ী ভাগ এখানে নিজে আঁকা হবে।', 'Enter real prices as you buy and the split by category is drawn here.')}</p></section>`;
  let acc = 0;
  const segs = rows.map((r, i) => { const p = r.actual / tot * 100, d = Math.max(0, p - 0.6), s = `<circle class="dseg" cx="21" cy="21" r="15.9155" stroke="${BZ_COLORS[i % BZ_COLORS.length]}" stroke-dasharray="${d.toFixed(2)} ${(100 - d).toFixed(2)}" stroke-dashoffset="${(25 - acc).toFixed(2)}"/>`; acc += p; return s; }).join('');
  return `<section class="card"><div class="card-head"><h2>${L('টাকা কোথায় গেল', 'Where the money went')}</h2></div>
    <div class="donut-wrap"><div class="donut"><svg viewBox="0 0 42 42" role="img" aria-label="${L('খরচের ভাগ', 'Spending split')}"><circle cx="21" cy="21" r="15.9155" class="dbg"/>${segs}</svg>
      <div class="dcenter"><small>${L('মোট খরচ', 'Spent')}</small><b>${bzM(tot)}</b>${c.budget != null ? `<em>${L('বাজেটের', 'of')} ${pct(c.usedPct)}</em>` : ''}</div></div>
      <div class="dlegend"><div><span>${L('সবচেয়ে বেশি', 'Biggest')}</span><b>${esc(bzCatName(rows[0].k))}</b></div><div><span>${L('তার ভাগ', 'Its share')}</span><b>${pct(rows[0].actual / tot * 100)}</b></div>${c.budget != null ? `<div><span>${c.remaining >= 0 ? L('বাজেটের বাকি', 'Budget left') : L('বাজেটের বেশি', 'Over budget')}</span><b class="${c.remaining < 0 ? 'neg' : ''}">${bzM(Math.abs(c.remaining))}</b></div>` : ''}</div></div>
    <div class="brows">${rows.map((r, i) => `<div class="brow"><div class="brow-top"><i class="dot" style="--c:${BZ_COLORS[i % BZ_COLORS.length]}"></i><span class="grow">${bzCat(r.k).e} ${esc(bzCatName(r.k))}</span><span class="amt">${bzM(r.actual)} <small>${pct(r.actual / tot * 100)}</small></span></div>
      <div class="bbar"><span style="--c:${BZ_COLORS[i % BZ_COLORS.length]};width:${clamp(r.actual / tot * 100, 0, 100).toFixed(1)}%"></span></div></div>`).join('')}</div></section>`;
}
function bzHome() {
  const m = bzCur();
  if (!m) return bzEmptyHome();
  const c = bzMarketCalc(m), act = m.status === 'active';
  const msgs = c.flags.map(bzFlagMsg).filter(Boolean);
  const last = bzMarkets().filter(x => x.id !== m.id && x.status === 'done').sort(bzByDate)[0];
  const lc = last && bzMarketCalc(last);
  return `${m.status === 'cancelled' ? `<div class="hg-lock cancelled"><span>${L('এই বাজার বাতিল করা আছে। হিসাবে ধরা হচ্ছে না।', 'This market is cancelled and not counted.')}</span><button type="button" class="btn sm" data-action="bz-reopen">${L('আবার চালু', 'Reopen')}</button></div>` : ''}
  <section class="hero tappable" data-action="bz-hero-detail" role="button" tabindex="0" aria-label="${L('পুরো হিসাব দেখুন', 'See the full breakdown')}"><div class="hero-top"><div>
      <div class="hero-label">${esc(m.name)}${bzDS(m)}${m.shopper ? ' · ' + esc(m.shopper) : ''}${c.discount ? ' · ' + L('ছাড়', 'off') + ' ' + bzM(c.discount) : ''} <span class="hgb ${m.status === 'done' ? 'pos' : ''}">${bzMst(m.status)}</span></div>
      <div class="hero-target">${bzM(c.actualTotal)}</div>
      <div class="hero-sub">${c.budget != null ? `${L('বাজেট', 'Budget')} ${bzM(c.budget)} · ${c.remaining >= 0 ? `${L('বাকি', 'left')} ${bzM(c.remaining)}` : `${bzM(-c.remaining)} ${L('বেশি', 'over')}`}` : L('বাজেট নির্ধারণ করা হয়নি', 'No budget set')}</div></div>
      <div class="ringcap">${ring(c.progress)}<small>${L('কেনা', 'bought')}</small></div></div>
    <div class="hero-chips"><div><small>${L('আনুমানিক', 'Estimated')}</small><b>${bzM(c.estTotal)}</b></div><div><small>${c.discount ? L('আসল (ছাড়ের পর)', 'Actual (net)') : L('আসল', 'Actual')}</small><b>${bzM(c.actualTotal)}</b></div><div><small>${L('দামের পার্থক্য', 'Price gap')}</small><b>${c.diffTotal === 0 ? '—' : (c.diffTotal > 0 ? '+' : '−') + bzM(Math.abs(c.diffTotal))}</b></div>
      <div><small>${L('বাজেট', 'Budget')}</small><b>${c.budget != null ? bzM(c.budget) : '—'}</b></div><div><small>${c.budget != null && c.remaining < 0 ? L('বেশি খরচ', 'Over') : L('বাজেটের বাকি', 'Left')}</small><b>${c.budget != null ? bzM(Math.abs(c.remaining)) : '—'}</b></div><div><small>${c.overpaid > 0 ? L('অগ্রিম', 'Advance') : L('দেনা বাকি', 'Due')}</small><b>${bzM(c.payable || c.overpaid)}</b></div></div>
    <div class="hero-foot"><span>${L('পরিশোধ', 'Paid')} <b>${bzM(c.paid)}</b></span>${c.discount ? `<span>${L('ছাড়', 'Discount')} <b>${bzM(c.discount)}</b></span>` : ''}</div>
    <div class="hero-foot"><span>✅ ${c.done}</span><span>◐ ${c.partial}</span><span>⏳ ${c.todo}</span><span>✕ ${c.na}</span><span>${L('মোট', 'Total')} ${c.total}</span></div>
    <div class="hero-more">${L('ট্যাপ করে পুরো হিসাব দেখুন', 'Tap for the full breakdown')} ${icon('chev', 16)}</div>
    ${c.total ? '' : `<p class="hint" style="margin:8px 0 0;color:inherit;opacity:.85">${L('তালিকায় এখনও কোনো পণ্য নেই। নিচের "দ্রুত পণ্য যোগ" থেকে পণ্য দিলে আনুমানিক, আসল, বাজেট আর বাকির পুরো হিসাব এখানে আসবে।', 'No items yet. Add items below and the full estimated, actual, budget and dues show here.')}</p>`}</section>
  ${bzHowCard(!c.total)}
  ${msgs.length ? `<div class="bsum ${c.flags.some(f => f.code === 'budget_over' || f.code === 'cat_over') ? 'bad' : 'warn'}"><b>${c.flags.some(f => f.code === 'budget_over') ? L('বাজেট পার হয়েছে', 'Over budget') : L('খেয়াল রাখুন', 'Keep an eye')}</b><span>${msgs.map(esc).join(' ')}</span></div>` : ''}
  <section class="card"><div class="card-head"><h2>${L('বাজেট ও খরচ', 'Budget & spending')}</h2>${act ? `<button type="button" class="link" data-action="bz-budget">${c.budget != null ? L('বদলান', 'Edit') : L('ঠিক করুন', 'Set')}</button>` : ''}</div>
    ${c.budget != null ? `${bzBar(c.usedPct, c.usedPct > 100 ? 'over' : c.usedPct >= 85 ? 'near' : '')}<div class="brow-meta"><span>${pct(c.usedPct)} ${L('ব্যবহার', 'used')}</span><span>${L('আসল', 'Actual')} ${bzM(c.actualTotal)} / ${bzM(c.budget)}</span></div>` : `<p class="hint" style="margin:0">${L('বাজেট নির্ধারণ করা হয়নি। ঠিক করলে কতটা খরচ হলো আর কতটা বাকি তা দেখা যাবে।', 'No budget set. Set one to see what is spent and what is left.')}</p>`}
    <div class="minis mt8"><div class="mini"><small>${L('আনুমানিক', 'Estimated')}</small><b>${bzM(c.estTotal)}</b></div><div class="mini"><small>${c.discount ? L('আসল (ছাড়ের পর)', 'Actual (after discount)') : L('আসল', 'Actual')}</small><b>${bzM(c.actualTotal)}</b></div><div class="mini"><small>${L('দামের পার্থক্য', 'Price gap')}</small><b class="${c.diffTotal > 0 ? 'neg' : c.diffTotal < 0 ? 'pos' : ''}">${c.diffTotal === 0 ? '—' : (c.diffTotal > 0 ? '+' : '−') + bzM(Math.abs(c.diffTotal))}</b></div></div></section>
  ${bzSpendCard(m, c)}
  ${m.status !== 'cancelled' ? `<section class="card"><div class="card-head"><h2>${L('দ্রুত পণ্য যোগ', 'Quick add')}</h2><button type="button" class="link" data-action="bz-catalog">📋 ${L('তৈরি তালিকা থেকে বাছুন', 'Pick from ready list')}</button></div>
    <form data-form="bz-quick" data-live="bz-quick" autocomplete="off"><div class="qa"><input class="input qa-n" name="name" maxlength="50" list="bz-names" placeholder="${L('পণ্যের নাম লিখুন বা বাছুন', 'Type or pick an item')}"></div>
      <div class="qa"><input class="input" name="qty" inputmode="decimal" placeholder="${L('পরিমাণ', 'Qty')}"><input class="input" name="unit" list="bz-units" placeholder="${L('একক', 'Unit')}"><div class="qa-p">${moneyInput('est', '', L('দাম/একক', 'Price'))}</div></div>
      <div class="qa"><div class="qa-c">${bzCatSelect('cat', 'other')}</div><button class="btn primary" type="submit">${icon('plus', 18)} ${L('যোগ', 'Add')}</button></div>${bzUnitOpts()}${bzNameOpts()}</form></section>` : ''}
  <div class="quick four">
    <button type="button" class="qbtn" data-action="tab" data-tab="list"><span class="qi">${icon('receipt')}</span>${L('তালিকা খুলুন', 'Open list')}</button>
    <button type="button" class="qbtn" data-action="bz-pay-add"><span class="qi">${icon('wallet')}</span>${L('পেমেন্ট', 'Payment')}</button>
    ${m.status === 'active' ? `<button type="button" class="qbtn" data-action="bz-complete"><span class="qi">${icon('check')}</span>${L('সম্পন্ন করুন', 'Complete')}</button>` : `<button type="button" class="qbtn" data-action="bz-reopen"><span class="qi">${icon('undo')}</span>${L('আবার খুলুন', 'Reopen')}</button>`}
    <button type="button" class="qbtn" data-action="bz-new"><span class="qi">${icon('plus')}</span>${L('নতুন বাজার', 'New market')}</button></div>
  ${c.payable > 0 || c.overpaid > 0 ? `<section class="card"><div class="card-head"><h2>${L('পেমেন্ট ও বাকি', 'Payment & dues')}</h2><button type="button" class="link" data-action="bz-pay-add">+ ${L('পেমেন্ট', 'Payment')}</button></div>
    <div class="minis"><div class="mini"><small>${L('মোট বিল', 'Total bill')}</small><b>${bzM(c.actualTotal)}</b></div><div class="mini"><small>${L('পরিশোধ', 'Paid')}</small><b>${bzM(c.paid)}</b></div><div class="mini"><small>${c.overpaid > 0 ? L('অতিরিক্ত/অগ্রিম', 'Extra / advance') : L('বাকি', 'Due')}</small><b class="${c.payable > 0 ? 'neg' : 'pos'}">${bzM(c.payable || c.overpaid)}</b></div></div></section>` : ''}
  ${bzLowCard(m)}
  <section class="card"><div class="card-head"><h2>${L('আগের বাজার', 'Previous market')}</h2><button type="button" class="link" data-action="bz-history">${L('সব দেখুন', 'See all')}</button></div>
    ${last ? `<button type="button" class="lrow" data-action="bz-open" data-id="${last.id}"><span class="lic">🧺</span><span class="lmain"><b>${esc(last.name)}</b><small>${bzDP(last)}${lc.total} ${L('পণ্য', 'items')}</small></span><span class="lend"><b>${bzM(lc.actualTotal)}</b><small>${lc.budget != null ? `${L('বাজেট', 'Budget')} ${bzM(lc.budget)}` : bzMst(last.status)}</small></span></button>` : `<p class="hint" style="margin:0">${L('সম্পন্ন করা কোনো বাজার এখনও নেই।', 'No completed market yet.')}</p>`}</section>`;
}

/* ---------- তালিকা ---------- */
function bzPriceLine(m, it, ents) {
  const p = bzItemPrices(ents, m, it), u = esc(it.unit || '');
  if (p.cur != null && p.prev) return `<span class="${p.diff > 0 ? 'neg' : p.diff < 0 ? 'pos' : ''}">${L('গতবার', 'Last')} ${bzM(p.prev.price)} → ${bzM(p.cur)}${p.diff ? ` (${p.diff > 0 ? '+' : '−'}${bzM(Math.abs(p.diff))})` : ''}</span>`;
  if (p.cur == null && p.last) return `<span>${L('গতবার', 'Last time')} ${bzM(p.last.price)}/${u} · ${fmtDate(p.last.date)}</span>`;
  return '';
}
function bzItemRow(m, r, ents) {
  const it = r.item, st = it.status;
  const pl = bzPriceLine(m, it, ents);
  return `<div class="bzi ${st}"><button type="button" class="bzchk" data-action="bz-buy" data-id="${it.id}" aria-label="${L('কেনার হিসাব', 'Purchase')}">${st === 'done' ? icon('check', 16) : st === 'partial' ? '½' : st === 'na' ? '✕' : ''}</button>
    <button type="button" class="bzmain" data-action="bz-edit-item" data-id="${it.id}"><b>${esc(it.name)}</b>
      <small>${bzQtyStr(it.qty)} ${esc(it.unit)}${it.est ? ` · ${L('আনু.', 'est.')} ${bzM(r.planned)}` : ''}${it.shop ? ' · 🏪 ' + esc(it.shop) : ''}${it.note ? ' · 📝' : ''}</small>
      ${r.bought ? `<small class="bzact">${L('কেনা', 'Bought')} ${bzQtyStr(it.aQty)} ${esc(it.unit)} ${it.aTotal != null ? '· ' + L('মোট', 'total') + ' ' + bzM(it.aTotal) : '× ' + bzM(it.aPrice || 0)}${r.diff ? ` <i class="${r.diff > 0 ? 'neg' : 'pos'}">${r.diff > 0 ? '+' : '−'}${bzM(Math.abs(r.diff))}</i>` : ''}</small>` : ''}
      ${pl ? `<small class="bzpl">${pl}</small>` : ''}</button>
    <span class="bzend"><b>${r.bought ? bzM(r.net) : st === 'na' ? '—' : bzM(r.planned)}</b><small class="bzs ${st}">${bzSt(st)}</small></span>${rowTools('bz-edit-item', 'bz-item-del', it.id)}</div>`;
}
function bzListBody(m) {
  const c = bzMarketCalc(m), ents = bzPriceEntries(bz());
  const q = bzUi.q.trim().toLowerCase();
  const rows = c.rows.filter(r => (bzUi.f === 'all' || r.item.status === bzUi.f) && (!q || r.item.name.toLowerCase().includes(q)));
  if (!c.rows.length) return empty('📝', L('তালিকা খালি', 'The list is empty'), `<p class="hint">${L('চাল, ডাল, তেল, সবজি, মাছ, ডিম... সবকিছুর নাম আগেই ভরা আছে। ট্যাপ করে বাছুন, আর লিখতে হবে না।', 'Rice, lentils, oil, vegetables, fish, eggs... every name is already filled in. Tap to pick, no typing.')}</p><button type="button" class="btn primary block mt8" data-action="bz-catalog">📋 ${L('তৈরি তালিকা থেকে বাছুন', 'Pick from the ready list')}</button><button type="button" class="btn block mt8" data-action="bz-add-item">${icon('plus', 18)} ${L('নিজে লিখে যোগ করুন', 'Type one yourself')}</button>`);
  if (!rows.length) return empty('🔍', L('কিছু পাওয়া যায়নি', 'Nothing found'), `<p class="hint">${L('খোঁজা বা ফিল্টার বদলে দেখুন।', 'Try a different search or filter.')}</p>`);
  const known = r => (bzCatsAll().some(x => x.k === r.item.cat) ? r.item.cat : 'other');
  const keys = bzCatsAll().map(x => x.k).filter(k => rows.some(r => known(r) === k));
  return keys.map(k => { const g = rows.filter(r => known(r) === k); if (!g.length) return '';
    return `<div class="section-title">${bzCat(k).e} ${esc(bzCatName(k))} · ${g.length}<span class="stot">${bzM(bzSum(g.map(r => r.bought ? r.net : r.est)))}</span></div><div class="bzlist">${g.map(r => bzItemRow(m, r, ents)).join('')}</div>`; }).join('');
}
function bzListTab() {
  const m = bzCur();
  if (!m) return `<div class="page-head"><h1>${L('তালিকা', 'List')}</h1></div>${bzEmptyHome()}`;
  const c = bzMarketCalc(m);
  const filters = [['all', L('সব', 'All')], ['todo', bzSt('todo')], ['partial', bzSt('partial')], ['done', bzSt('done')], ['na', bzSt('na')]];
  return `<div class="bzpage"><header class="bz-head"><div class="bz-ht"><h1>${L('তালিকা', 'Shopping list')}</h1><p>${esc(m.name)}${bzDS(m)}</p></div>
      <div class="bz-hb"><button type="button" class="btn sm" data-action="bz-catalog">📋 ${L('বাছুন', 'Pick')}</button><button type="button" class="btn primary sm" data-action="bz-add-item">${icon('plus', 18)} ${L('পণ্য', 'Item')}</button></div></header>
    <div class="bzstats"><div><small>${L('আনুমানিক', 'Estimated')}</small><b>${bzM(c.estTotal)}</b></div><div><small>${L('আসল', 'Actual')}</small><b>${bzM(c.actualTotal)}</b></div><div><small>${L('কেনা', 'Bought')}</small><b>${c.done}/${c.total}</b></div></div>
    <div class="bzfind"><div class="bzsearch">${icon('spark', 18)}<input class="input" type="search" data-bz-q value="${esc(bzUi.q)}" placeholder="${L('পণ্য খুঁজুন', 'Search items')}"></div>
      <div class="chiprow wrap">${filters.map(([k, l]) => `<button type="button" class="fchip ${bzUi.f === k ? 'active' : ''}" data-action="bz-f" data-v="${k}">${l}${k !== 'all' ? ` <small>${c[k]}</small>` : ''}</button>`).join('')}</div></div>
    <div data-bz-list>${bzListBody(m)}</div>
    ${bzUnitOpts()}
    <section class="card mt12"><div class="card-head"><h2>${L('পেমেন্ট', 'Payments')}</h2><button type="button" class="link" data-action="bz-pay-add">+ ${L('যোগ', 'Add')}</button></div>
      <div class="minis"><div class="mini"><small>${L('মোট বিল', 'Bill')}</small><b>${bzM(c.actualTotal)}</b></div><div class="mini"><small>${L('পরিশোধ', 'Paid')}</small><b>${bzM(c.paid)}</b></div><div class="mini"><small>${c.overpaid > 0 ? L('অতিরিক্ত', 'Extra') : L('বাকি', 'Due')}</small><b class="${c.payable > 0 ? 'neg' : ''}">${bzM(c.payable || c.overpaid)}</b></div></div>
      ${m.payments.filter(p => !p.del).length ? `<div class="list mt8">${m.payments.filter(p => !p.del).map(p => `<div class="lwrap"><div class="lrow"><span class="lic">💳</span><span class="lmain"><b>${bzM(p.amt)} · ${BZ_PAY[p.method] ? BZ_PAY[p.method][isEN() ? 1 : 0] : esc(p.method)}</b><small>${fmtDate(p.date)}${p.shop ? ' · ' + esc(p.shop) : ''}${p.note ? ' · ' + esc(p.note) : ''}</small></span></div>${rowTools('bz-pay-edit', 'bz-pay-del', p.id)}</div>`).join('')}</div>` : `<p class="hint">${L('এখনও কোনো পেমেন্ট নেই। পরিশোধ না হওয়া অংশ "বাকি" হিসেবে দেখাবে।', 'No payments yet. Whatever is unpaid shows as "Due".')}</p>`}</section>
    <section class="card"><div class="card-head"><h2>🧾 ${L('রসিদের ছবি', 'Receipt photos')}</h2></div>
      <div class="bzrc">${m.receipts.map(id => `<span class="bzrcw"><button type="button" class="bzth" data-action="bz-rcpt-view" data-id="${id}">${imgURL.get('bzr:' + id) ? `<img src="${imgURL.get('bzr:' + id)}" alt="">` : '🧾'}</button><button type="button" class="bzrx" data-action="bz-rcpt-del" data-id="${id}" aria-label="${L('ছবি মুছুন', 'Remove photo')}">✕</button></span>`).join('')}
        <button type="button" class="bzth add" data-action="bz-rcpt-add">＋<small>${L('ছবি', 'Photo')}</small></button></div>
      <input type="file" accept="image/*" multiple hidden data-bz-rcpt>
      ${m.receipts.length ? '' : `<p class="hint">${L('ঐচ্ছিক। রসিদ ফোন থেকে তুলে বা বেছে যোগ করুন।', 'Optional. Take or pick a receipt photo.')}</p>`}</section>
    <section class="card"><div class="card-head"><h2>${L('এই বাজার', 'This market')}</h2></div>
      <div class="menu">${menuItem('bz-edit-market', 'edit', L('নাম, তারিখ, দোকান, নোট', 'Name, date, shop, note'), L('বাজারের তথ্য বদলান', 'Edit market details'))}
        ${menuItem('bz-save-tpl', 'doc', L('তালিকাটা টেমপ্লেট করে রাখুন', 'Save list as template'), L('পরেরবার এক ট্যাপে একই তালিকা', 'Reuse this list next time'))}
        ${menuItem('bz-copy', 'share', L('সারাংশ কপি / শেয়ার', 'Copy / share summary'), L('টেক্সট হিসেবে', 'As text'))}
        ${menuItem('bz-csv', 'download', L('CSV ফাইল নামান', 'Download CSV'), L('Excel বা Sheets-এ খোলার জন্য', 'Open in Excel or Sheets'))}
        ${m.status === 'cancelled' ? '' : menuItem('bz-cancel', 'x', L('বাজার বাতিল করুন', 'Cancel this market'), L('হিসাবে ধরা হবে না', 'Not counted anywhere'))}
        <button type="button" class="mitem danger" data-action="bz-del-market" data-id="${m.id}"><span class="mi">${icon('trash', 20)}</span><span class="mt"><b>${L('বাজার ডিলিট', 'Delete market')}</b><small>${L('ফিরিয়ে আনার সুযোগ থাকবে', 'You can undo right after')}</small></span></button></div></section></div>`;
}
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-bz-q]');
  if (!el) return;
  bzUi.q = el.value;
  const m = bzCur(), box = $('[data-bz-list]'); if (m && box) box.innerHTML = bzListBody(m);
});

/* ---------- মজুত ---------- */
function bzStockTab() {
  const rows = bz().stock.filter(s => !s.del && (!bzUi.sq || s.name.toLowerCase().includes(bzUi.sq.toLowerCase()))).sort((a, b) => ((b.min > 0 && b.qty <= b.min) - (a.min > 0 && a.qty <= a.min)) || a.name.localeCompare(b.name));
  const m = bzCur();
  return `<div class="page-head"><h1>${L('বাসার মজুত', 'Home stock')}</h1><button type="button" class="btn primary sm" data-action="bz-stock-add">${icon('plus', 18)} ${L('মজুত', 'Stock')}</button></div>
    ${bzLowCard(m)}
    ${bz().stock.some(s => !s.del) ? `<input class="input" type="search" data-bz-sq value="${esc(bzUi.sq)}" placeholder="${L('মজুত খুঁজুন', 'Search stock')}"><div class="list mt12" data-bz-stocklist>${bzStockRows(rows)}</div>` : empty('📦', L('মজুত খালি', 'No stock yet'), `<p class="hint">${L('বাসায় যা আছে তা নিজে লিখুন, অথবা বাজারের কেনা পণ্য মজুতে যোগ করুন। কম হলে অ্যাপ মনে করাবে।', 'Add what you have at home, or add bought items from a market. The app warns when it runs low.')}</p>`)}
    <p class="hint">${L('মজুতের পরিমাণ অনুমান করা হয় না: আপনি যা লেখেন বা যা কেনা হয়েছে বলে লেখেন, ঠিক সেটাই।', 'Stock is never guessed: it is exactly what you enter or what you mark as bought.')}</p>
    <label class="check mt8"><input type="checkbox" data-action="bz-auto" ${bz().autoStock ? 'checked' : ''}><span>${L('কেনা হিসেবে চিহ্নিত করলেই নিজে মজুতে যোগ হোক', 'Add to stock automatically when marked bought')}</span></label>`;
}
function bzStockRows(rows) {
  if (!rows.length) return `<p class="hint" style="padding:12px">${L('কিছু পাওয়া যায়নি।', 'Nothing found.')}</p>`;
  return rows.map(s => { const low = s.min > 0 && s.qty <= s.min;
    return `<div class="lwrap"><button type="button" class="lrow" data-action="bz-stock-edit" data-id="${s.id}"><span class="lic">${low ? '⚠️' : '📦'}</span>
      <span class="lmain"><b>${esc(s.name)}</b><small>${s.min > 0 ? `${L('ন্যূনতম', 'Min')} ${bzQtyStr(s.min)} ${esc(s.unit)}` : L('ন্যূনতম সীমা নেই', 'No minimum')}${s.lastDate ? ` · ${L('শেষ কেনা', 'Last bought')} ${fmtDate(s.lastDate)}${s.lastPrice ? ' ' + bzM(s.lastPrice) : ''}` : ''}</small></span>
      <span class="lend"><b class="${low ? 'neg' : ''}">${bzQtyStr(s.qty)} ${esc(s.unit)}</b>${low ? `<small class="neg">${L('কম', 'Low')}</small>` : ''}</span></button>
      <button type="button" class="btn sm" data-action="bz-stock-use" data-id="${s.id}">${L('ব্যবহার', 'Use')}</button>${rowTools('bz-stock-edit', 'bz-stock-del', s.id)}</div>`; }).join('');
}
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-bz-sq]');
  if (!el) return;
  bzUi.sq = el.value;
  const box = $('[data-bz-stocklist]'); if (box) box.innerHTML = bzStockRows(bz().stock.filter(s => !s.del && s.name.toLowerCase().includes(bzUi.sq.toLowerCase())));
});
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-action="bz-auto"]')) { bz().autoStock = e.target.checked; save(); toast(bz().autoStock ? L('এখন থেকে কেনা পণ্য নিজে মজুতে যাবে', 'Bought items now go to stock automatically') : L('নিজে যোগ বন্ধ', 'Automatic stock off')); } });

/* ---------- ইতিহাস, রিপোর্ট, দাম ---------- */
let bzUi = { q: '', f: 'all', sq: '', sub: 'markets', hq: '', hs: 'all', hp: 'all', hd: '' };
function bzInPeriod(date, p) {
  if (p === 'all') return true;
  const t = today();
  if (p === 'week') return date >= bzWeekStart(t) && date <= t;
  if (p === 'month') return date.slice(0, 7) === t.slice(0, 7);
  if (p === 'year') return date.slice(0, 4) === t.slice(0, 4);
  return true;
}
function bzMarketRows() {
  const q = bzUi.hq.trim().toLowerCase();
  return bzMarkets().filter(m => (bzUi.hs === 'all' || m.status === bzUi.hs) && bzInPeriod(m.date || '', bzUi.hp) && (!bzUi.hd || m.date === bzUi.hd)
    && (!q || m.name.toLowerCase().includes(q) || m.items.some(i => !i.del && i.name.toLowerCase().includes(q)))).sort(bzByDate);
}
function bzMarketListHtml() {
  const list = bzMarketRows();
  if (!list.length) return empty('🧺', L('কোনো বাজার নেই', 'No markets'), `<p class="hint">${L('ফিল্টার বদলে দেখুন বা নতুন বাজার খুলুন।', 'Change the filters or open a new market.')}</p>`);
  return `<div class="list">${list.map(m => { const c = bzMarketCalc(m);
    return `<div class="lwrap"><button type="button" class="lrow" data-action="bz-open" data-id="${m.id}"><span class="lic">${m.status === 'done' ? '✅' : m.status === 'cancelled' ? '🚫' : '🧺'}</span>
      <span class="lmain"><b>${esc(m.name)}</b><small>${bzDP(m)}${c.total} ${L('পণ্য', 'items')} · ${bzMst(m.status)}${c.budget != null ? ` · ${L('বাজেট', 'budget')} ${bzM(c.budget)}` : ''}${c.payable > 0 ? ` · ${L('বাকি', 'due')} ${bzM(c.payable)}` : ''}</small></span>
      <span class="lend"><b>${bzM(c.actualTotal)}</b>${c.budget != null ? `<small class="${c.actualTotal > c.budget ? 'neg' : 'pos'}">${c.actualTotal > c.budget ? bzM(c.actualTotal - c.budget) + ' ' + L('বেশি', 'over') : bzM(c.budget - c.actualTotal) + ' ' + L('বাকি', 'left')}</small>` : ''}</span></button>${rowTools('bz-edit-market-id', 'bz-del-market', m.id)}</div>`; }).join('')}</div>`;
}
function bzHistoryTab() {
  const subs = [['markets', L('বাজারগুলো', 'Markets')], ['report', L('রিপোর্ট', 'Reports')], ['prices', L('দাম', 'Prices')]];
  let body = '';
  if (bzUi.sub === 'markets') {
    const ch = (key, opts) => `<div class="chiprow wrap">${opts.map(([k, l]) => `<button type="button" class="fchip ${bzUi[key] === k ? 'active' : ''}" data-action="bz-hf" data-key="${key}" data-v="${k}">${l}</button>`).join('')}</div>`;
    body = `<div class="hg-filters"><input class="input" type="search" data-bz-hq value="${esc(bzUi.hq)}" placeholder="${L('বাজার বা পণ্যের নাম খুঁজুন', 'Search market or item')}">
      ${ch('hs', [['all', L('সব', 'All')], ['active', bzMst('active')], ['done', bzMst('done')], ['cancelled', bzMst('cancelled')]])}
      ${ch('hp', [['all', L('সব সময়', 'All time')], ['week', L('এই সপ্তাহ', 'This week')], ['month', L('এই মাস', 'This month')], ['year', L('এই বছর', 'This year')]])}
      <label class="field" style="margin:0"><span>${L('নির্দিষ্ট তারিখ', 'Exact date')}</span><input class="input" type="date" name="hd" data-bz-hd value="${esc(bzUi.hd)}"></label></div>
      <div data-bz-mlist>${bzMarketListHtml()}</div>`;
  } else if (bzUi.sub === 'report') body = bzReportHtml();
  else body = bzPricesHtml();
  return `<div class="page-head"><h1>${L('ইতিহাস', 'History')}</h1><button type="button" class="btn primary sm" data-action="bz-new">${icon('plus', 18)} ${L('বাজার', 'Market')}</button></div>
    <div class="seg mb12">${subs.map(([k, l]) => `<button type="button" class="${bzUi.sub === k ? 'active' : ''}" data-action="bz-sub" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
}
document.addEventListener('input', e => { const el = e.target.closest && e.target.closest('[data-bz-hq]'); if (!el) return; bzUi.hq = el.value; const b = $('[data-bz-mlist]'); if (b) b.innerHTML = bzMarketListHtml(); });
document.addEventListener('change', e => { const el = e.target.closest && e.target.closest('[data-bz-hd]'); if (!el) return; bzUi.hd = el.value; const b = $('[data-bz-mlist]'); if (b) b.innerHTML = bzMarketListHtml(); });

function bzBars(entries, label) {
  const max = Math.max(1, ...entries.map(e => e[1]));
  return entries.map(([k, v]) => `<div class="rb"><span class="rb-l">${label(k)}</span><span class="rb-t"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><b>${v ? bzM(v) : '—'}</b></div>`).join('');
}
function bzReportHtml() {
  const r = bzReport(bz(), today());
  if (!r.hasData) return empty('📊', L('রিপোর্টের জন্য ডেটা নেই', 'No data for reports yet'), `<p class="hint">${L('বাজার করে পণ্যের আসল দাম লিখলেই রিপোর্ট তৈরি হবে। অনুমান করে কিছু দেখানো হয় না।', 'Reports appear once you enter real prices. Nothing is guessed.')}</p>`);
  const mn = ym => { const [y, m] = ym.split('-'); return `${MONTHS[isEN() ? 'en' : 'bn'][+m - 1]} ${y.slice(2)}`; };
  const msg = i => i.code === 'cat_up' ? L(`এই মাসে ${bzCatName(i.k)}-এ গত মাসের তুলনায় ${bzM(i.amt)} বেশি খরচ হয়েছে।`, `This month ${bzCatName(i.k)} cost ${bzM(i.amt)} more than last month.`) : L(`এই মাসে ${bzCatName(i.k)}-এ গত মাসের চেয়ে ${bzM(i.amt)} কম খরচ হয়েছে।`, `This month ${bzCatName(i.k)} cost ${bzM(i.amt)} less than last month.`);
  const cats = Object.entries(r.catNow).sort((a, b) => b[1] - a[1]);
  return `<section class="card"><div class="card-head"><h2>${L('এই মাস', 'This month')}</h2></div>
      <div class="minis"><div class="mini"><small>${L('এই মাস', 'This month')}</small><b>${bzM(r.thisMonth)}</b></div><div class="mini"><small>${L('গত মাস', 'Last month')}</small><b>${r.hasPrev ? bzM(r.lastMonth) : '—'}</b></div>
        <div class="mini"><small>${L('পার্থক্য', 'Change')}</small><b class="${r.hasPrev ? (r.thisMonth > r.lastMonth ? 'neg' : 'pos') : ''}">${r.hasPrev ? (r.thisMonth >= r.lastMonth ? '+' : '−') + bzM(Math.abs(r.thisMonth - r.lastMonth)) : '—'}</b></div></div>
      ${r.insights.length ? r.insights.slice(0, 3).map(i => `<p class="hint planhint ${i.code === 'cat_up' ? 'warn' : ''}">${esc(msg(i))}</p>`).join('') : `<p class="hint">${r.hasPrev ? L('গত মাসের সাথে বড় কোনো পার্থক্য নেই।', 'No big difference from last month.') : L('গত মাসের ডেটা না থাকায় তুলনা দেখানো হচ্ছে না।', 'No last-month data, so no comparison is shown.')}</p>`}</section>
    <section class="card"><div class="card-head"><h2>${L('দৈনিক (শেষ ৭ দিন)', 'Daily (last 7 days)')}</h2></div><div class="rbars">${bzBars(r.days, d => fmtDate(d).slice(0, 6))}</div></section>
    <section class="card"><div class="card-head"><h2>${L('সাপ্তাহিক', 'Weekly')}</h2></div><div class="rbars">${bzBars(r.weeks, d => fmtDate(d).slice(0, 6))}</div></section>
    <section class="card"><div class="card-head"><h2>${L('মাসিক', 'Monthly')}</h2></div><div class="rbars">${bzBars(r.months, mn)}</div></section>
    ${cats.length ? `<section class="card"><div class="card-head"><h2>${L('খাত অনুযায়ী (এই মাস)', 'By category (this month)')}</h2></div>${cats.map(([k, v]) => `<div class="brow"><div class="brow-top"><span class="grow">${bzCat(k).e} ${esc(bzCatName(k))}</span><span class="amt">${bzM(v)} <small>${pct(v / (r.thisMonth || 1) * 100)}</small></span></div>${bzBar(v / (r.thisMonth || 1) * 100, '', 'var(--accent)')}${r.catPrev[k] ? `<div class="brow-meta"><span>${L('গত মাস', 'Last month')} ${bzM(r.catPrev[k])}</span><span class="${v > r.catPrev[k] ? 'bad' : 'ok'}">${v >= r.catPrev[k] ? '+' : '−'}${bzM(Math.abs(v - r.catPrev[k]))}</span></div>` : ''}</div>`).join('')}</section>` : ''}
    ${r.shops.length > 1 || (r.shops.length === 1 && r.shops[0][0] !== '—') ? `<section class="card"><div class="card-head"><h2>${L('দোকান অনুযায়ী (এই মাস)', 'By shop (this month)')}</h2></div>${r.shops.map(([s, v]) => `<div class="hg-day"><span><b>${esc(s === '—' ? L('দোকান লেখা নেই', 'No shop') : s)}</b></span><b>${bzM(v)}</b></div>`).join('')}</section>` : ''}
    ${r.top.length ? `<section class="card"><div class="card-head"><h2>${L('সবচেয়ে বেশি খরচের পণ্য (এই মাস)', 'Top items (this month)')}</h2></div>${r.top.map((t, i) => `<div class="hg-day"><span><b>${i + 1}. ${esc(t.name)}</b><small>${esc(t.unit || '')}</small></span><b>${bzM(t.total)}</b></div>`).join('')}</section>` : ''}
    ${r.movers.length ? `<section class="card"><div class="card-head"><h2>${L('দাম বাড়া-কমা', 'Price changes')}</h2></div>${r.movers.slice(0, 8).map(x => `<div class="hg-day"><span><b>${esc(x.name)}</b><small>${bzM(x.prev)} → ${bzM(x.last)} / ${esc(x.unit || '')} · ${fmtDate(x.date)}</small></span><b class="${x.diff > 0 ? 'neg' : 'pos'}">${x.diff > 0 ? '+' : '−'}${bzM(Math.abs(x.diff))}</b></div>`).join('')}<p class="hint">${L('শুধু আপনার নিজের কেনা দামের তুলনা, বাজারের চলতি দর নয়।', 'Only a comparison of your own purchases, not live market rates.')}</p></section>` : ''}
    ${r.budgetRows.length ? `<section class="card"><div class="card-head"><h2>${L('বাজেট বনাম আসল', 'Budget vs actual')}</h2></div>${r.budgetRows.map(x => `<div class="brow"><div class="brow-top"><span class="grow">${esc(x.name)}</span><span class="amt">${bzM(x.actual)} <small>/ ${bzM(x.budget)}</small></span></div>${bzBar(x.actual / x.budget * 100, x.actual > x.budget ? 'over' : x.actual >= x.budget * 0.85 ? 'near' : '')}</div>`).join('')}</section>` : ''}
    ${r.dues.length ? `<section class="card"><div class="card-head"><h2>${L('বাকি আছে এমন বাজার', 'Markets with dues')}</h2></div>${r.dues.map(x => `<button type="button" class="lrow" data-action="bz-open" data-id="${x.id}"><span class="lic">⏳</span><span class="lmain"><b>${esc(x.name)}</b><small>${fmtDate(x.date)}</small></span><span class="lend"><b class="neg">${bzM(x.amt)}</b></span></button>`).join('')}</section>` : ''}`;
}
function bzPricesHtml() {
  const ent = bzPriceEntries(bz()), by = {};
  ent.forEach(e => { (by[e.nk + '|' + e.uk] = by[e.nk + '|' + e.uk] || []).push(e); });
  const q = bzUi.hq.trim().toLowerCase();
  const rows = Object.values(by).filter(a => !q || a[0].name.toLowerCase().includes(q)).sort((a, b) => b[b.length - 1].date.localeCompare(a[a.length - 1].date));
  if (!ent.length) return empty('🏷️', L('দামের ইতিহাস নেই', 'No price history'), `<p class="hint">${L('পণ্য কিনে আসল দাম লিখলেই এখানে জমা হবে।', 'It builds up as you enter real prices.')}</p>`);
  return `<input class="input" type="search" data-bz-hq-p value="${esc(bzUi.hq)}" placeholder="${L('পণ্য খুঁজুন', 'Search item')}">
    <div class="list mt12">${rows.map(a => { const l = a[a.length - 1], p = a[a.length - 2], d = p ? l.price - p.price : null; const byShop = {}; a.forEach(e => { if (e.shop) byShop[e.shop] = e; }); const sh = Object.values(byShop), cheap = sh.length > 1 ? Math.min(...sh.map(e => e.price)) : null;
      return `<div class="lrow"><span class="lic">🏷️</span><span class="lmain"><b>${esc(l.name)}</b><small>${L('শেষ কেনা', 'Last')} ${fmtDate(l.date)}${p ? ` · ${L('আগে', 'before')} ${bzM(p.price)} (${fmtDate(p.date)})` : ''} · ${a.length}x</small></span>
        <span class="lend"><b>${bzM(l.price)}/${esc(l.unit || '')}</b>${d ? `<small class="${d > 0 ? 'neg' : 'pos'}">${d > 0 ? '+' : '−'}${bzM(Math.abs(d))}</small>` : ''}</span></div>${sh.length > 1 ? `<div class="shopcmp">${sh.sort((x, y) => x.price - y.price).map(e => `<span class="${e.price === cheap ? 'cheap' : ''}">🏪 ${esc(e.shop)} ${bzM(e.price)}${e.price === cheap ? ' ✓' : ''}</span>`).join('')}</div>` : ''}`; }).join('') || `<p class="hint" style="padding:12px">${L('কিছু পাওয়া যায়নি।', 'Nothing found.')}</p>`}</div>
    <p class="hint">${L('একই নাম ও একই এককের কেনাকাটা মিলিয়ে দেখানো হয়, তাই ভিন্ন এককে ভুল তুলনা হয় না। এটা আপনার নিজের ইতিহাস, বাজারের চলতি দর নয়।', 'Only purchases with the same name and unit are compared. This is your own history, not live market rates.')}</p>`;
}
document.addEventListener('input', e => { const el = e.target.closest && e.target.closest('[data-bz-hq-p]'); if (!el) return; bzUi.hq = el.value; render(); const n = $('[data-bz-hq-p]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } });

/* ---------- হোমের হলুদ কার্ডে ট্যাপ: বাজারের A থেকে Z ---------- */
function bzHeroDetail(m) {
  const c = bzMarketCalc(m), row = (label, val, cls = '') => `<div class="${cls}"><span>${label}</span><span>${val}</span></div>`;
  const items = c.rows.slice().sort((a, b) => (a.item.status === 'done' ? 0 : 1) - (b.item.status === 'done' ? 0 : 1));
  const shops = {}; c.rows.forEach(r => { if (r.net > 0) { const s = r.item.shop || m.shop || L('দোকান লেখা নেই', 'No shop'); shops[s] = (shops[s] || 0) + r.net; } });
  const pays = (m.payments || []).filter(p => !p.del).sort(bzByDate), todo = c.rows.filter(r => r.item.status === 'todo' || r.item.status === 'partial'), na = c.rows.filter(r => r.item.status === 'na');
  let n = 0; const h = t => `<h4 class="fb-h"><i>${++n}</i>${t}</h4>`;
  const line = r => { const it = r.item; return `<div class="two"><span>${(bzCat(it.cat) || {}).e || ''} ${esc(it.name)}<small>${bzCatName(it.cat)} · ${bzQtyStr(it.qty)} ${esc(it.unit || '')}${it.shop ? ' · ' + esc(it.shop) : ''} · ${bzSt(it.status)}${r.diff ? ' · ' + L('পার্থক্য ', 'gap ') + (r.diff > 0 ? '+' : '−') + bzM(Math.abs(r.diff)) : ''}</small></span><span>${it.status === 'done' || it.status === 'partial' ? bzM(r.actual) : '~' + bzM(r.est)}</span></div>`; };
  return `${sheetHead(L('পুরো হিসাব', 'Full breakdown'), `${esc(m.name)}${bzDS(m)}`)}
  <div class="fb-top"><small>${L('আসল খরচ', 'Actual spent')}</small><b>${bzM(c.actualTotal)}</b><span>${c.done}/${c.total} ${L('কেনা', 'bought')}${m.shopper ? ' · ' + esc(m.shopper) : ''}</span></div>
  ${h(L('বাজেট ও বাকি', 'Budget & what is left'))}
  <div class="ledger fb">${row(L('বাজেট', 'Budget'), c.budget != null ? bzM(c.budget) : L('ঠিক করা নেই', 'not set'))}${row(L('আনুমানিক (তালিকা)', 'Estimated (list)'), bzM(c.estTotal))}${row(c.discount ? L('আসল (ছাড়ের পর)', 'Actual (after discount)') : L('আসল', 'Actual'), bzM(c.actualTotal))}${c.discount ? row(L('ছাড়', 'Discount'), '−' + bzM(c.discount)) : ''}
    ${row(L('দামের পার্থক্য', 'Price gap'), c.diffTotal ? (c.diffTotal > 0 ? '+' : '−') + bzM(Math.abs(c.diffTotal)) : '—')}${c.budget != null ? row(c.remaining >= 0 ? L('বাজেটের বাকি', 'Budget left') : L('বাজেটের বেশি', 'Over budget'), `<b class="${c.remaining < 0 ? 'neg' : 'pos'}">${bzM(Math.abs(c.remaining))}</b>`, 'total') : ''}</div>
  ${h(L('কী কিনেছি আর কী বাকি (পণ্য ধরে)', 'What was bought and what is left'))}
  <div class="ledger fb">${items.length ? items.map(line).join('') : row(L('তালিকায় পণ্য নেই', 'No items'), '—')}
    ${todo.length ? row(L('এখনও কেনা বাকি', 'Still to buy'), `${todo.length} ${L('পণ্য', 'items')} · ~${bzM(sum(todo.map(r => r.est - (r.item.status === 'partial' ? r.actual : 0))))}`, 'total') : (items.length ? row('🎉 ' + L('সব কেনা হয়ে গেছে', 'Everything is bought'), '', 'total') : '')}${na.length ? row(L('পাওয়া যায়নি', 'Not found'), `${na.length}`) : ''}</div>
  ${c.catRows.length ? h(L('বিভাগ অনুযায়ী', 'By category')) + `<div class="ledger fb">${c.catRows.map(r => row(`${(bzCat(r.k) || {}).e || ''} ${bzCatName(r.k)} <small class="muted">${r.bought}/${r.count}</small>`, `${bzM(r.actual)}${r.budget != null ? ' / ' + bzM(r.budget) : ''} <small class="${r.over ? 'neg' : 'muted'}">${r.over ? bzM(r.actual - r.budget) + ' ' + L('বেশি', 'over') : r.budget != null ? bzM(r.left) + ' ' + L('বাকি', 'left') : ''}</small>`)).join('')}</div>` : ''}
  ${Object.keys(shops).length ? h(L('দোকান অনুযায়ী', 'By shop')) + `<div class="ledger fb">${Object.entries(shops).sort((a, b) => b[1] - a[1]).map(([s, v]) => row(esc(s), bzM(v))).join('')}</div>` : ''}
  ${h(L('পেমেন্ট ও বাকি', 'Payments & dues'))}
  <div class="ledger fb">${pays.map(p => row(`${fmtDate(p.date)}<small class="muted"> ${esc(p.method || '')}</small>`, bzM(p.amt))).join('')}${row(L('মোট বিল', 'Total bill'), bzM(c.actualTotal))}${row(L('পরিশোধ', 'Paid'), bzM(c.paid))}${row(c.overpaid > 0 ? L('অতিরিক্ত/অগ্রিম', 'Extra / advance') : L('দেনা বাকি', 'Due'), `<b class="${c.payable > 0 ? 'neg' : 'pos'}">${bzM(c.payable || c.overpaid)}</b>`, 'total')}</div>`;
}
ACTIONS['bz-hero-detail'] = () => { const m = bzCur(); if (m) openSheet(bzHeroDetail(m), () => { const n = bzCur(); return n ? bzHeroDetail(n) : ''; }); };

/* ---------- মাসিক সংসার হিসাব: Hangout-এর household ইভেন্ট, এই মডিউলের ভেতরেই খোলে ---------- */
const bzHouseEvents = () => hg().events.filter(e => !e.del && e.type === 'household' && e.status !== 'archived').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
function bzHouseCur() {
  const evs = bzHouseEvents(), e = evs.find(x => x.id === bz().houseEv) || evs[0] || null;
  bz().houseEv = e ? e.id : null;
  return e;
}
function bzHouseStart() {
  return `<section class="card bzstart"><div class="bzs-ic">🏡</div><h2>${L('মাসিক সংসার হিসাব', 'Monthly household accounts')}</h2>
    <p class="hint">${L('ঘরের সব খরচ এক জায়গায়: বিদ্যুৎ, গ্যাস, পানি, ইন্টারনেটের বিল। বাচ্চাদের পড়াশোনা ও টিউশন ফি (কোন শিক্ষককে কত বাকি)। ডাক্তার ও ওষুধ ছবিসহ। বাজার, সঞ্চয়, আর মাসের বাজেট।', 'Every home cost in one place: electricity, gas, water and internet bills; school and tuition fees (which teacher is owed what); doctor visits and medicines with photos; groceries, savings and the monthly budget.')}</p>
    <button type="button" class="btn primary block mt8" data-action="bz-house-new">${icon('plus', 18)} ${L('শুরু করুন', 'Start')}</button></section>`;
}
function bzHouseMore(ev) {
  const mi = menuItem;
  return `<div class="page-head"><h1>${L('আরও', 'More')}</h1></div>
    ${menuGroup('🏡 ' + L('এই সংসার হিসাব', 'This household'), esc(ev.name),
      `${mi('hg-edit-event', 'edit', L('নাম ও খাত বদলান', 'Rename and edit categories'), L('নাম, মাস, খরচের খাতের তালিকা', 'Name, month, category list'))}
      ${mi('bz-house-list', 'layers', L('সব মাস ও হিসাব', 'All months and books'), L('বদলান বা নতুন মাসের হিসাব খুলুন', 'Switch or open a new one'))}
      ${mi('hg-history', 'clock', L('ইতিহাস ও সম্প্রতি মোছা', 'History & recently deleted'), L('কী বদলেছে, মোছা জিনিস ফেরান', 'What changed; restore deleted items'))}`)}
    ${menuGroup('📄 ' + L('রিপোর্ট ও শেয়ার', 'Report & share'), L('পুরো মাসের হিসাব কাগজে বা মেসেজে', 'The whole month on paper or as a message'),
      `${mi('hg-rep-memo', 'doc', L('পূর্ণ হিসাবের মেমো (PDF)', 'Full memo (PDF)'), L('সব খরচ, বিল আর পেমেন্ট', 'All expenses, bills and payments'))}
      ${mi('hg-rep-slip', 'receipt', L('সামারি স্লিপ', 'Summary slip'), L('এক পাতার সংক্ষিপ্ত ফল', 'One-page result'))}
      ${mi('hg-rep-text', 'share', L('WhatsApp-এর জন্য টেক্সট', 'Text for WhatsApp'), L('কপি করে পাঠান', 'Copy and send'))}`)}
    ${menuGroup('🛒 ' + L('বাজার সদাই', 'Groceries'), L('বাজারের তালিকা, দাম ও মজুত', 'Shopping lists, prices and stock'), mi('bz-sec-market', 'cart', L('বাজার সদাই-তে যান', 'Go to groceries'), L('তালিকা বানান, কেনার সময় টিক দিন', 'Make a list and tick as you buy')))}
    <button type="button" class="btn danger block mt12" data-action="hg-del-event">${icon('trash', 18)} ${L(`"${esc(ev.name)}" ডিলিট`, `Delete "${esc(ev.name)}"`)}</button>
    ${appSections()}`;
}
function bzHouseListSheet() {
  const evs = bzHouseEvents(), cur = bzHouseCur();
  return `${sheetHead(L('মাসিক সংসার হিসাব', 'Monthly household'), L('ট্যাপ করে বদলান', 'Tap to switch'))}
    <button type="button" class="btn primary block" data-action="bz-house-new">${icon('plus', 18)} ${L('নতুন মাসের হিসাব', 'New month')}</button>
    <div class="list mt12">${evs.map(e => `<div class="lwrap ${cur && cur.id === e.id ? 'cur' : ''}"><button type="button" class="lrow" data-action="bz-house-open" data-id="${e.id}"><span class="lic">🏡</span><span class="lmain"><b>${esc(e.name)}</b><small>${e.expenses.filter(x => !x.del).length} ${L('খরচ', 'entries')}${cur && cur.id === e.id ? ' · ' + L('চলতি', 'current') : ''}</small></span><span class="lend"><b>${hgM(hgEventCalc(e).net)}</b></span></button>${rowTools('hg-edit-event-id', 'hg-del-event-id', e.id)}</div>`).join('') || `<p class="hint">${L('এখনও কিছু নেই।', 'Nothing yet.')}</p>`}</div>`;
}
function bzOpenHouse(id) {
  bz().sec = 'house'; bz().houseEv = id; hgRoute.ev = id; tab = 'home'; trail = ['home'];
  if (sheetOpen) closeSheet();
  commit(); window.scrollTo(0, 0);
}
function bzSetSec(s) {
  bz().sec = s; tab = 'home'; trail = ['home'];
  if (sheetOpen) closeSheet();
  commit(); window.scrollTo(0, 0);
}
Object.assign(ACTIONS, {
  'bz-sec': el => { if (el.dataset.s !== bzSec()) bzSetSec(el.dataset.s); },
  'bz-sec-market': () => bzSetSec('market'),
  'bz-house-list': () => openSheet(bzHouseListSheet(), bzHouseListSheet),
  'bz-house-open': el => bzOpenHouse(el.dataset.id),
  'bz-house-new': () => {
    const ev = { id: uid(), name: L('মাসিক সংসার হিসাব', 'Monthly household') + ' · ' + today().slice(0, 7), type: 'household', start: '', end: '', location: '', notes: '', status: 'active', createdAt: Date.now(), updatedAt: Date.now(), cats: hgCatsFor('household'), participants: [], expenses: [], transfers: [], refunds: [], decisions: [], history: [] };
    hgEnsureMe(ev); hgLog(ev, 'ইভেন্ট তৈরি হয়েছে', 'Event created'); hg().events.push(ev);
    bzOpenHouse(ev.id);
  },
});

/* ---------- আরও ---------- */
function bzMoreTab() {
  const mi = menuItem, tpl = bz().templates.filter(t => !t.del).length;
  return `<div class="page-head"><h1>${L('আরও', 'More')}</h1></div>
    ${menuGroup('🛒 ' + L('বাজার', 'Markets'), L('বাজারের তালিকা খুলুন, খুঁজুন, নিয়মিত তালিকা রাখুন', 'Open, find and reuse your shopping lists'),
      `${mi('bz-new', 'plus', L('নতুন বাজার', 'New market'), L('খালি বা টেমপ্লেট থেকে', 'Blank or from a template'))}
      ${mi('bz-history', 'clock', L('আগের সব বাজার', 'All previous markets'), L('খুঁজুন, এডিট করুন, মুছুন', 'Search, edit or delete'))}
      ${mi('bz-tpls', 'doc', L('নিয়মিত তালিকা (টেমপ্লেট)', 'Recurring lists (templates)'), tpl + ' ' + L('টা আছে', 'saved'))}`)}
    ${menuGroup('🏷️ ' + L('পণ্য ও মজুত', 'Items & stock'), L('বিভাগ ঠিক করুন, কেনা পণ্য মজুতে তুলুন', 'Set categories and move bought items to stock'),
      `${mi('bz-cats', 'grid', L('পণ্যের বিভাগ', 'Product categories'), L('নিজের বিভাগ যোগ, এডিট, মোছা', 'Add, edit or remove your own'))}
      ${mi('bz-auto-toggle', 'check', L('কেনা পণ্য নিজে মজুতে যোগ', 'Auto-add bought items to stock'), bz().autoStock ? L('এখন চালু', 'Currently on') : L('এখন বন্ধ', 'Currently off'))}`)}
    ${appSections()}`;
}

/* ---------- শিট ও ফর্ম ---------- */
function bzMarketForm(m) {
  const isNew = !m, tpls = bz().templates.filter(t => !t.del);
  return `${sheetHead(isNew ? L('নতুন বাজার', 'New market') : L('বাজারের তথ্য', 'Market details'))}
  <form data-form="bz-market" data-id="${m ? m.id : ''}" autocomplete="off">
    <label class="field"><span>${L('বাজারের নাম', 'Market name')}</span><input class="input" name="name" maxlength="50" value="${esc(m ? m.name : L('বাজার ' + fmtDate(today()), 'Market ' + fmtDate(today())))}"></label>
    <div class="row2"><label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(m ? m.date : today())}"></label>
      <label class="field"><span>${L('বাজেট (ঐচ্ছিক)', 'Budget (optional)')}</span>${moneyInput('budget', m && m.budget ? String(m.budget / 100) : '', '0')}</label></div>
    <label class="field"><span>${L('দোকান (ঐচ্ছিক)', 'Shop (optional)')}</span><input class="input" name="shop" maxlength="50" list="bz-shops" value="${esc(m ? m.shop || '' : '')}"><datalist id="bz-shops">${bzShopNames().map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
    <div class="row2"><label class="field"><span>${L('কে বাজার করেছে', 'Who shopped')}</span><input class="input" name="shopper" maxlength="40" value="${esc(m ? m.shopper || '' : '')}"></label>
      <label class="field"><span>${L('মোট ডিসকাউন্ট (ঐচ্ছিক)', 'Total discount (optional)')}</span>${moneyInput('discount', m && m.discount ? String(m.discount / 100) : '', '0')}</label></div>
    ${isNew ? `<label class="field"><span>${L('তালিকা কোথা থেকে?', 'Start the list from')}</span>${bzSelect('tpl', [['', L('খালি (পরে তৈরি তালিকা থেকে বাছব)', 'Blank (I will pick from the ready list)')]].concat(BZ_BUILTIN_TPLS.map(t => [t.id, `📋 ${esc(isEN() ? t.en : t.bn)} (${t.items.length})`]), tpls.map(t => [t.id, `⭐ ${esc(t.name)} (${t.items.length})`])), '')}
      <div class="hint">${L('শুধু নাম, পরিমাণ আর একক আসবে। দাম আপনি কেনার সময় লিখবেন।', 'Only names, quantities and units come over. You enter prices as you buy.')}</div></label>` : ''}
    <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="160" value="${esc(m ? m.note || '' : '')}"></label>
    <button class="btn primary block" type="submit">${isNew ? L('বাজার খুলুন', 'Create market') : L('সেভ করুন', 'Save')}</button></form>`;
}
function bzItemForm(m, it) {
  const v = it || { name: '', cat: 'other', qty: 1000, unit: '', est: 0, note: '' };
  return `${sheetHead(it ? L('পণ্য এডিট', 'Edit item') : L('পণ্য যোগ', 'Add item'), esc(m.name))}
  <form data-form="bz-item" data-live="bz-item" data-id="${it ? it.id : ''}" autocomplete="off">
    <label class="field"><span>${L('পণ্যের নাম', 'Item name')}</span><input class="input" name="name" maxlength="50" list="bz-names" value="${esc(v.name)}" placeholder="${L('যেমন: মিনিকেট চাল', 'e.g. Rice')}"></label>
    <label class="field"><span>${L('বিভাগ', 'Category')}</span>${bzCatSelect('cat', v.cat)}</label>
    <div class="row2"><label class="field"><span>${L('প্রয়োজনীয় পরিমাণ', 'Quantity needed')}</span><input class="input" name="qty" inputmode="decimal" value="${esc(bzQtyStr(v.qty))}"></label>
      <label class="field"><span>${L('একক', 'Unit')}</span><input class="input" name="unit" list="bz-units" value="${esc(v.unit)}" placeholder="${L('কেজি, লিটার, পিস…', 'kg, litre, pcs…')}"></label></div>
    <label class="field"><span>${L('আনুমানিক দাম (প্রতি একক)', 'Estimated price (per unit)')}</span>${moneyInput('est', v.est ? String(v.est / 100) : '', '0')}</label>
    <div class="preview" data-tot></div>
    <label class="field"><span>${L('কোন দোকান থেকে (ঐচ্ছিক)', 'Which shop (optional)')}</span><input class="input" name="shop" maxlength="40" list="bz-shops" value="${esc(v.shop || '')}"><datalist id="bz-shops">${bzShopNames().map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
    <label class="field"><span>${L('নোট (ঐচ্ছিক)', 'Note (optional)')}</span><input class="input" name="note" maxlength="120" value="${esc(v.note || '')}"></label>
    ${bzUnitOpts()}${bzNameOpts()}
    <button class="btn primary block" type="submit">${it ? L('সেভ করুন', 'Save') : L('যোগ করুন', 'Add')}</button>
    ${it ? `<div class="btn-row mt8"><button type="button" class="btn" data-action="bz-buy" data-id="${it.id}">🛍️ ${L('কেনার হিসাব', 'Purchase')}</button><button type="button" class="btn" data-action="bz-item-dup" data-id="${it.id}">📑 ${L('কপি', 'Duplicate')}</button><button type="button" class="btn danger" data-action="bz-item-del" data-id="${it.id}">${icon('trash', 18)}</button></div>` : ''}</form>`;
}
LIVE['bz-item'] = (f, ch) => { bzAutoFill(f, ch); const t = bzLine(bzMilli(f.elements.qty.value), bzMinor(f.elements.est.value)); $('[data-tot]', f).innerHTML = t ? `${L('আনুমানিক মোট', 'Estimated total')}: <b>${bzM(t)}</b>` : ''; };
// কেনার একক বদলানো যায় (পিস / হালি / ডজন, গ্রাম / কেজি, মিলি / লিটার), আর দাম প্রতি একক বা মোট, যেকোনোভাবে লেখা যায়
const BZ_FAM = { pcs: ['pcs', 1], hali: ['pcs', 4], dozen: ['pcs', 12], g: ['mass', 1], kg: ['mass', 1000], ml: ['vol', 1], l: ['vol', 1000] };
const BZ_FAM_NAME = { pcs: ['পিস', 'pcs'], hali: ['হালি (৪টা)', 'hali (4)'], dozen: ['ডজন (১২টা)', 'dozen (12)'], g: ['গ্রাম', 'g'], kg: ['কেজি', 'kg'], ml: ['মিলি', 'ml'], l: ['লিটার', 'litre'] };
const bzFamUnits = unit => { const f = BZ_FAM[bzUnitKey(unit)]; return f ? Object.keys(BZ_FAM).filter(k => BZ_FAM[k][0] === f[0]) : null; };
const bzConv = (qtyMilli, fromK, toK) => Math.round(qtyMilli * BZ_FAM[fromK][1] / BZ_FAM[toK][1]);
// ফর্ম থেকে কেনার হিসাব: q = তালিকার এককে পরিমাণ, price = তালিকার এককে দাম, total = সরাসরি মোট (এককের রূপান্তর বা মোট লিখলে)
function bzReadBuy(f, it) {
  const pk = bzUnitKey(it.unit), bk = f.elements.bUnit ? f.elements.bUnit.value : pk;
  const qBuy = bzMilli(f.elements.aQty.value), conv = !!(BZ_FAM[bk] && BZ_FAM[pk] && bk !== pk);
  const q = conv ? bzConv(qBuy, bk, pk) : qBuy;
  const totRaw = String(f.elements.aTotal.value).trim(), prRaw = String(f.elements.aPrice.value).trim();
  let total = null, price = null;
  if (totRaw !== '') { total = bzMinor(totRaw); price = q > 0 ? Math.round(total * 1000 / q) : 0; }
  else if (prRaw !== '') {
    const pBuy = bzMinor(prRaw);
    if (conv) { total = bzLine(qBuy, pBuy); price = q > 0 ? Math.round(total * 1000 / q) : 0; } else price = pBuy;
  }
  return { q, qBuy, bk, pk, conv, total, price, has: totRaw !== '' || prRaw !== '' };
}
function bzBuyForm(m, it) {
  const bought = it.status === 'done' || it.status === 'partial', fam = bzFamUnits(it.unit), pk = bzUnitKey(it.unit);
  const unitName = k => (BZ_FAM_NAME[k] || [k, k])[isEN() ? 1 : 0];
  return `${sheetHead(esc(it.name), `${L('পরিকল্পনা', 'Planned')}: ${bzQtyStr(it.qty)} ${esc(it.unit)}${it.est ? ` × ${bzM(it.est)}` : ''}`)}
  <form data-form="bz-buy" data-live="bz-buy" data-id="${it.id}" autocomplete="off">
    <div class="field"><span class="flabel">${L('কী হলো?', 'What happened?')}</span>${seg('status', [['done', '✅ ' + bzSt('done')], ['partial', '½ ' + bzSt('partial')], ['na', '✕ ' + bzSt('na')], ['todo', '○ ' + bzSt('todo')]], it.status === 'todo' ? 'done' : it.status)}</div>
    <div data-grp="amt">
      <div class="row2"><label class="field"><span>${L('কত কিনলেন', 'Quantity bought')}</span><input class="input" name="aQty" inputmode="decimal" value="${esc(bought && it.aQty ? bzQtyStr(it.aQty) : bzQtyStr(it.qty))}"></label>
        <label class="field"><span>${L('কোন এককে', 'In which unit')}</span>${fam ? `<select class="input" name="bUnit">${fam.map(k => `<option value="${k}" ${k === pk ? 'selected' : ''}>${unitName(k)}</option>`).join('')}</select>` : `<input class="input" value="${esc(it.unit || L('একক', 'unit'))}" disabled>`}</label></div>
      <label class="field"><span data-plabel>${L('আসল দাম (প্রতি একক)', 'Actual price (per unit)')}</span>${moneyInput('aPrice', bought && it.aPrice != null && it.aTotal == null ? String(it.aPrice / 100) : '', it.est ? String(it.est / 100) : '0')}</label>
      <label class="field"><span>${L('অথবা মোট কত দিলেন', 'Or the total you paid')}</span>${moneyInput('aTotal', bought && it.aTotal != null ? String(it.aTotal / 100) : '', '0')}</label>
      <div class="preview" data-buytot></div>
      <div class="hint">${fam ? L('যেমন ডিম ১২টা কিনলে এককে "পিস" বা "ডজন" যেটা খুশি বাছুন। দাম প্রতি একক হিসেবে বা মোট কত দিলেন, যেকোনো একটা লিখুন। মোট লিখলে সেটাই চূড়ান্ত।', 'For 12 eggs pick "pcs" or "dozen". Enter either the price per unit or the total you paid. If you enter the total it wins.') : L('দাম প্রতি একক, অথবা মোট কত দিলেন, যেকোনো একটা লিখুন। আনুমানিক দাম আসল দাম হিসেবে ধরা হয় না।', 'Enter the price per unit or the total you paid. The estimate is never counted as the real price.')}</div></div>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
LIVE['bz-buy'] = (f) => {
  const m = bzCur(), it = m && bzItem(m, f.dataset.id); if (!it) return;
  const st = f.elements.status.value, show = st === 'done' || st === 'partial';
  $('[data-grp="amt"]', f).classList.toggle('hidden', !show);
  const r = bzReadBuy(f, it), pl = $('[data-plabel]', f);
  if (pl) pl.textContent = L('আসল দাম (প্রতি ', 'Actual price (per ') + ((BZ_FAM_NAME[r.bk] || [it.unit || 'একক', it.unit || 'unit'])[isEN() ? 1 : 0]).replace(/ \(.*\)$/, '') + ')';
  const tot = r.total != null ? r.total : bzLine(r.q, r.price), est = bzLine(r.q, it.est), pv = $('[data-buytot]', f);
  pv.innerHTML = show && r.has ? `${L('মোট', 'Total')} <b>${bzM(tot)}</b>${r.conv ? ` · ${bzQtyStr(r.q)} ${esc(it.unit)}` : ''}${it.est ? ` · ${tot === est ? L('আনুমানিকের সমান', 'same as estimate') : `<b class="${tot > est ? 'neg' : 'pos'}">${tot > est ? '+' : '−'}${bzM(Math.abs(tot - est))}</b> ${L('আনুমানিকের চেয়ে', 'vs estimate')}`}` : ''}` : '';
};
function bzBudgetForm(m) {
  const cats = bzCats();
  return `${sheetHead(L('বাজেট', 'Budget'), esc(m.name))}
  <form data-form="bz-budget" data-live="bz-budget" autocomplete="off">
    <label class="field"><span>${L('এই বাজারের মোট বাজেট', 'Total budget for this market')}</span>${moneyInput('budget', m.budget ? String(m.budget / 100) : '', '0')}<div class="hint">${L('ফাঁকা রাখলে বাজেট নির্ধারণ করা হয়নি ধরা হবে। বাজেট বদলালে আগের কেনাকাটা বদলায় না।', 'Leave blank for no budget. Changing it never changes past purchases.')}</div></label>
    <details class="more" ${Object.keys(m.catBudgets).length ? 'open' : ''}><summary><span class="ds-t">${L('খাতভিত্তিক বাজেট (ঐচ্ছিক)', 'Per-category budget (optional)')}</span></summary>
      ${cats.map(c => `<label class="hg-vrow"><span>${c.e} ${esc(isEN() ? c.en : c.bn)}</span>${moneyInput('cb_' + c.k, m.catBudgets[c.k] ? String(m.catBudgets[c.k] / 100) : '', '0')}</label>`).join('')}</details>
    <div class="preview" data-bsum></div>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
LIVE['bz-budget'] = f => {
  const m = bzCur(), tot = bzMinor(f.elements.budget.value), cs = bzSum(bzCats().map(c => bzMinor(f.elements['cb_' + c.k].value))), pv = $('[data-bsum]', f);
  pv.className = 'preview' + (tot > 0 && cs > tot ? ' warn' : '');
  pv.innerHTML = cs ? `${L('খাতগুলোর যোগফল', 'Categories add up to')} <b>${bzM(cs)}</b>${tot > 0 ? (cs > tot ? ` · ${L('মোট বাজেটের চেয়ে বেশি', 'more than the total')}` : ` · ${L('বাকি', 'left')} ${bzM(tot - cs)}`) : ''}` : '';
};
function bzPayForm(m, pay) {
  const c = bzMarketCalc(m);
  return `${sheetHead(pay ? L('পেমেন্ট এডিট', 'Edit payment') : L('পেমেন্ট', 'Payment'), `${esc(m.name)} · ${L('বাকি', 'due')} ${bzM(c.payable)}`)}
  <form data-form="bz-pay" data-id="${pay ? pay.id : ''}" autocomplete="off">
    <label class="field"><span>${L('কত টাকা দিলেন', 'Amount paid')}</span>${moneyInput('amt', pay ? String(pay.amt / 100) : (c.payable ? String(c.payable / 100) : ''), '0')}</label>
    <div class="field"><span class="flabel">${L('কীভাবে', 'How')}</span>${seg('method', Object.keys(BZ_PAY).map(k => [k, BZ_PAY[k][isEN() ? 1 : 0]]), pay ? pay.method : 'cash')}</div>
    <div class="row2"><label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(pay ? pay.date : today())}"></label>
      <label class="field"><span>${L('দোকান', 'Shop')}</span><input class="input" name="shop" maxlength="50" value="${esc(pay ? pay.shop || '' : m.shop || '')}"></label></div>
    <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="120" value="${esc(pay ? pay.note || '' : '')}"></label>
    <p class="hint">${L('আসল বিলের চেয়ে বেশি দিলে বাকি নেতিবাচক দেখাবে না, বাড়তিটা "অতিরিক্ত / অগ্রিম" হিসেবে আলাদা দেখাবে।', 'Paying more than the bill never shows a negative due; the extra shows separately as "Extra / advance".')}</p>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
function bzCompleteSheet(m) {
  const c = bzMarketCalc(m), tg = bzTargets();
  return `${sheetHead(L('বাজার সম্পন্ন করুন', 'Complete the market'), esc(m.name))}
  <form data-form="bz-complete" autocomplete="off">
    <div class="minis"><div class="mini"><small>${L('আসল খরচ', 'Actual')}</small><b>${bzM(c.actualTotal)}</b></div><div class="mini"><small>${L('কেনা', 'Bought')}</small><b>${c.done + c.partial}/${c.total}</b></div><div class="mini"><small>${c.budget != null ? L('বাজেট', 'Budget') : L('বাজেট', 'Budget')}</small><b>${c.budget != null ? bzM(c.budget) : '—'}</b></div></div>
    ${c.todo ? `<div class="bsum warn"><b>${L(`${c.todo}টা পণ্য কেনা হয়নি`, `${c.todo} item(s) not bought`)}</b><span>${L('সম্পন্ন করলেও হিসাব ঠিক থাকবে, কেনা হয়নি এমন পণ্য খরচে ধরা হয় না।', 'Totals stay correct; unbought items are not counted as spending.')}</span></div>` : ''}
    ${c.payable > 0 ? `<div class="bsum warn"><b>${L(`${bzM(c.payable)} বাকি আছে`, `${bzM(c.payable)} still due`)}</b><span>${L('পরে পেমেন্ট যোগ করা যাবে।', 'You can add payments later.')}</span></div>` : ''}
    ${hgCheckRow('stock', L('কেনা পণ্য বাসার মজুতে যোগ করুন (একবারই যোগ হবে)', 'Add bought items to home stock (applied once)'), bz().autoStock)}
    ${tg.length ? `${hgCheckRow('sync', L('মূল খরচে যোগ করুন (একটাই খরচ, দুবার হবে না)', 'Add to main expenses (one expense, never twice)'), !!m.sync)}
      <label class="field"><span>${L('কোন ইভেন্টে', 'Which event')}</span>${bzSelect('ev', tg.map(e => [e.id, esc(e.name)]), (m.sync && m.sync.evId) || tg[0].id)}</label>` : `<p class="hint">${L('মূল খরচে যোগ করতে "আড্ডা ও যৌথ খরচ"-এ একটা দৈনিক/মাসিক সংসারের ইভেন্ট খুলুন।', 'To add this to main expenses, open a daily or household event in Hangout first.')}</p>`}
    <button class="btn primary block" type="submit">${icon('check', 18)} ${L('সম্পন্ন করুন', 'Complete')}</button></form>`;
}
function bzSyncSheet(m) {
  const tg = bzTargets(), c = bzMarketCalc(m);
  return `${sheetHead(L('মূল খরচে যোগ করুন', 'Add to main expenses'), esc(m.name))}
  ${m.sync ? `<div class="bsum ok"><b>${L('যোগ করা আছে', 'Already linked')}</b><span>${L('এই বাজার বদলালে মূল খরচও নিজে মিলে যায়। দুবার যোগ হয় না।', 'Edits here keep the main expense in sync. It is never added twice.')}</span></div>
    <button type="button" class="btn danger block mt8" data-action="bz-unsync">${L('মূল খরচ থেকে সরান', 'Remove from main expenses')}</button>`
    : tg.length ? `<form data-form="bz-sync" autocomplete="off"><div class="bsum"><b>${bzM(c.actualTotal)}</b><span>${L('শুধু আসল কেনাকাটার খরচ যাবে। আনুমানিক দাম বা বাজেট কখনো খরচ হিসেবে যায় না।', 'Only real purchases go over. Estimates and budgets never count as spending.')}</span></div>
      <label class="field mt8"><span>${L('কোন ইভেন্টে', 'Which event')}</span>${bzSelect('ev', tg.map(e => [e.id, esc(e.name)]), tg[0].id)}</label>
      <button class="btn primary block" type="submit" ${c.actualTotal > 0 ? '' : 'disabled'}>${L('যোগ করুন', 'Add')}</button>${c.actualTotal > 0 ? '' : `<p class="hint">${L('আগে কিছু কেনা পণ্যের আসল দাম লিখুন।', 'Enter real prices for bought items first.')}</p>`}</form>`
    : `<p class="hint">${L('"আড্ডা ও যৌথ খরচ"-এ একটা দৈনিক বাজার বা মাসিক সংসারের ইভেন্ট খুললে এখানে বাছা যাবে।', 'Open a daily-market or household event in Hangout and it will be selectable here.')}</p>`}`;
}
function bzMarketsSheet() {
  const list = bzMarkets().sort(bzByDate), cur = bzCur();
  return `${sheetHead(L('সব বাজার', 'All markets'), L('ট্যাপ করে বদলান', 'Tap to switch'))}
    <button type="button" class="btn primary block" data-action="bz-new">${icon('plus', 18)} ${L('নতুন বাজার', 'New market')}</button>
    <div class="list mt12">${list.map(m => { const c = bzMarketCalc(m); return `<div class="lwrap ${cur && cur.id === m.id ? 'cur' : ''}"><button type="button" class="lrow" data-action="bz-open" data-id="${m.id}"><span class="lic">${m.status === 'done' ? '✅' : m.status === 'cancelled' ? '🚫' : '🧺'}</span><span class="lmain"><b>${esc(m.name)}</b><small>${cur && cur.id === m.id ? L('চলতি', 'Current') + ' · ' : ''}${bzDP(m)}${bzMst(m.status)}</small></span><span class="lend"><b>${bzM(c.actualTotal)}</b></span></button>${rowTools('bz-edit-market-id', 'bz-del-market', m.id)}</div>`; }).join('') || `<p class="hint">${L('এখনও কিছু নেই।', 'Nothing yet.')}</p>`}</div>`;
}
function bzStockForm(s) {
  const v = s || { name: '', unit: '', qty: 0, min: 0, note: '' };
  return `${sheetHead(s ? L('মজুত এডিট', 'Edit stock') : L('মজুত যোগ', 'Add stock'))}
  <form data-form="bz-stock" data-id="${s ? s.id : ''}" autocomplete="off">
    <label class="field"><span>${L('পণ্যের নাম', 'Item name')}</span><input class="input" name="name" maxlength="50" value="${esc(v.name)}"></label>
    <div class="row2"><label class="field"><span>${L('বর্তমান মজুত', 'In stock now')}</span><input class="input" name="qty" inputmode="decimal" value="${esc(bzQtyStr(v.qty))}"></label>
      <label class="field"><span>${L('একক', 'Unit')}</span><input class="input" name="unit" list="bz-units" value="${esc(v.unit)}"></label></div>
    <label class="field"><span>${L('ন্যূনতম সীমা (এর নিচে নামলে সতর্ক)', 'Minimum (warn at or below)')}</span><input class="input" name="min" inputmode="decimal" value="${v.min ? esc(bzQtyStr(v.min)) : ''}" placeholder="0"></label>
    <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="120" value="${esc(v.note || '')}"></label>
    ${bzUnitOpts()}
    <button class="btn primary block" type="submit">${s ? L('সেভ করুন', 'Save') : L('যোগ করুন', 'Add')}</button>
    ${s ? `<button type="button" class="btn danger block mt8" data-action="bz-stock-del" data-id="${s.id}">${icon('trash', 18)} ${L('ডিলিট', 'Delete')}</button>` : ''}</form>`;
}
function bzTplsSheet() {
  const list = bz().templates.filter(t => !t.del), m = bzCur();
  return `${sheetHead(L('নিয়মিত তালিকা', 'Recurring lists'), L('দৈনিক, সাপ্তাহিক, মাসিক, রান্নাঘর…', 'Daily, weekly, monthly, kitchen…'))}
    <button type="button" class="btn primary block" data-action="bz-tpl-new">${icon('plus', 18)} ${L('নতুন টেমপ্লেট', 'New template')}</button>
    ${m && m.items.some(i => !i.del) ? `<button type="button" class="btn block mt8" data-action="bz-save-tpl">📋 ${L('এই বাজারের তালিকা টেমপ্লেট করুন', 'Save this market\'s list')}</button>` : ''}
    <div class="list mt12">${list.map(t => `<div class="lwrap"><button type="button" class="lrow" data-action="bz-tpl-use" data-id="${t.id}"><span class="lic">📋</span><span class="lmain"><b>${esc(t.name)}</b><small>${t.items.length} ${L('পণ্য · ট্যাপ করে নতুন বাজার', 'items · tap to start a market')}</small></span></button>
      <button type="button" class="btn sm" data-action="bz-tpl-edit" data-id="${t.id}">${icon('edit', 16)}</button><button type="button" class="btn sm" data-action="bz-tpl-copy" data-id="${t.id}">📑</button>${delBtn('bz-tpl-del', t.id)}</div>`).join('') || `<p class="hint">${L('এখনও কোনো টেমপ্লেট নেই।', 'No templates yet.')}</p>`}</div>`;
}
function bzTplForm(t) {
  const lines = t ? t.items.map(i => [i.name, bzQtyStr(i.qty), i.unit || '', i.est ? bzQtyStr(i.est * 10) : ''].join(' | ')).join('\n') : '';
  return `${sheetHead(t ? L('টেমপ্লেট এডিট', 'Edit template') : L('নতুন টেমপ্লেট', 'New template'))}
  <form data-form="bz-tpl" data-id="${t ? t.id : ''}" autocomplete="off">
    <label class="field"><span>${L('টেমপ্লেটের নাম', 'Template name')}</span><input class="input" name="name" maxlength="40" value="${esc(t ? t.name : '')}" placeholder="${L('যেমন: মাসিক বাজার', 'e.g. Monthly bazaar')}"></label>
    <label class="field"><span>${L('পণ্যের তালিকা (প্রতি লাইনে একটা)', 'Items (one per line)')}</span><textarea class="input hg-ta" name="lines" rows="8" placeholder="${L('চাল | 5 | কেজি | 70\nতেল | 2 | লিটার | 180', 'Rice | 5 | kg | 70\nOil | 2 | litre | 180')}">${esc(lines)}</textarea>
      <div class="hint">${L('ফরম্যাট: নাম | পরিমাণ | একক | আনুমানিক দাম (শেষ দুটো ঐচ্ছিক)', 'Format: name | quantity | unit | estimated price (last two optional)')}</div></label>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
function bzCatsSheet() {
  const cu = bz().cats.filter(c => !c.del);
  return `${sheetHead(L('পণ্যের বিভাগ', 'Product categories'), L('নিজের বিভাগ বদলানো বা মোছা যায়', 'Your own can be edited or removed'))}
    <form data-form="bz-cat" autocomplete="off"><div class="catnew"><input class="input" name="name" maxlength="30" placeholder="${L('নতুন বিভাগের নাম', 'New category name')}"><button class="btn sm primary" type="submit">${L('যোগ', 'Add')}</button></div></form>
    ${cu.length ? `<div class="section-title">${L('আপনার বিভাগ', 'Your categories')}</div><div class="list">${cu.map(c => `<div class="lwrap"><button type="button" class="lrow" data-action="bz-cat-edit" data-id="${c.k}"><span class="lic">🏷️</span><span class="lmain"><b>${esc(c.name)}</b></span></button>${delBtn('bz-cat-del', c.k)}</div>`).join('')}</div>
      <p class="hint">${L('বিভাগ মুছলেও আগের পণ্য ও ইতিহাস থাকে, সেগুলো "অন্যান্য" হিসেবে দেখায়।', 'Deleting a category keeps old items and history; they show under "Other".')}</p>` : ''}
    <div class="section-title">${L('প্রাথমিক বিভাগ', 'Built-in')}</div><div class="chips">${BZ_CATS.map(c => `<span class="cchip">${c.e} ${esc(isEN() ? c.en : c.bn)}</span>`).join('')}</div>`;
}

/* ---------- ফর্ম সেভ ---------- */
const bzDupKey = o => [o.amt, o.date, o.method, o.shop, o.note].join('|');
Object.assign(FORMS, {
  'bz-market': f => {
    const name = f.elements.name.value.trim(), date = f.elements.date.value;
    if (!name) return fail(f, L('বাজারের নাম লিখুন', 'Enter a market name'), 'name');
    if (!bzDateOk(date)) return fail(f, L('তারিখ বাছুন', 'Pick a date'), 'date');
    const budget = bzMinor(f.elements.budget.value), shop = f.elements.shop.value.trim(), note = f.elements.note.value.trim(), shopper = f.elements.shopper.value.trim(), discount = Math.max(0, bzMinor(f.elements.discount.value));
    const id = f.dataset.id, m = id && bzMkt(id);
    if (m) { Object.assign(m, { name, date, shop, note, shopper, discount, budget: budget > 0 ? budget : null }); closeSheet(); return bzSave(m, SAVED()); }
    const o = { id: uid(), name, date, status: 'active', budget: budget > 0 ? budget : null, catBudgets: {}, shop, note, shopper, discount, items: [], payments: [], receipts: [], sync: null, createdAt: Date.now(), updatedAt: Date.now() };
    const bt = f.elements.tpl && BZ_BUILTIN_TPLS.find(x => x.id === f.elements.tpl.value);
    const t = bt || (f.elements.tpl && bz().templates.find(x => x.id === f.elements.tpl.value));
    if (bt) o.items = bt.items.map(([name, qty]) => { const c = BZ_CATALOG.find(x => x[0] === name) || [name, name, 'other', 'pcs']; return bzNewItem({ name: bzCatItemName(c), cat: c[2], qty: Math.round(qty * 1000), unit: bzUnitName(c[3]) }); });
    else if (t) o.items = t.items.map(i => bzNewItem({ name: i.name, cat: i.cat || 'other', qty: i.qty, unit: i.unit, est: i.est }));
    bz().markets.push(o); bz().activeId = o.id; tab = t ? 'list' : 'home'; trail = [tab];
    if (sheetOpen) closeSheet(); commit(L('বাজার তৈরি হয়েছে', 'Market created'));
    if (!t) setTimeout(() => { if (bzCur() === o) ACTIONS['bz-catalog'](); }, 380);
  },
  'bz-quick': f => {
    const m = bzCur(); if (!m) return;
    const name = f.elements.name.value.trim();
    if (!name) return fail(f, L('পণ্যের নাম লিখুন', 'Enter the item name'), 'name');
    const qty = bzMilli(f.elements.qty.value || 1);
    if (qty <= 0) return fail(f, L('পরিমাণ শূন্যের বেশি হতে হবে', 'Quantity must be more than zero'), 'qty');
    m.items.push(bzNewItem({ name, cat: f.elements.cat.value, qty, unit: f.elements.unit.value.trim(), est: bzMinor(f.elements.est.value) }));
    bzSave(m, L(`"${name}" যোগ হয়েছে`, `"${name}" added`));
  },
  'bz-item': f => {
    const m = bzCur(); if (!m) return;
    const name = f.elements.name.value.trim(), qty = bzMilli(f.elements.qty.value || 1), unit = f.elements.unit.value.trim();
    if (!name) return fail(f, L('পণ্যের নাম লিখুন', 'Enter the item name'), 'name');
    if (qty <= 0) return fail(f, L('পরিমাণ শূন্যের বেশি হতে হবে', 'Quantity must be more than zero'), 'qty');
    const id = f.dataset.id, it = id && bzItem(m, id);
    if (!it && f.dataset.dupok !== '1' && m.items.some(i => !i.del && bzNameKey(i.name) === bzNameKey(name) && bzUnitKey(i.unit) === bzUnitKey(unit))) {
      f.dataset.dupok = '1';
      return fail(f, L('এই পণ্য তালিকায় আগেই আছে। তবুও আবার যোগ করতে চাইলে আবার "যোগ করুন" চাপুন।', 'This item is already on the list. Tap Add again if you want it twice.'), 'name');
    }
    const o = { name, cat: f.elements.cat.value, qty, unit, est: bzMinor(f.elements.est.value), shop: f.elements.shop.value.trim(), note: f.elements.note.value.trim() };
    if (it) { Object.assign(it, o); bzRestock(m); } else m.items.push(bzNewItem(o));
    closeSheet(); bzSave(m, SAVED());
  },
  'bz-buy': f => {
    const m = bzCur(), it = m && bzItem(m, f.dataset.id); if (!it) return;
    const st = f.elements.status.value;
    if (st === 'done' || st === 'partial') {
      const rd = bzReadBuy(f, it), q = rd.q;
      if (q <= 0) return fail(f, L('কত কিনলেন তা লিখুন', 'Enter the quantity bought'), 'aQty');
      if (!rd.has) return fail(f, L('আসল দাম বা মোট কত দিলেন তা লিখুন (আনুমানিক দাম আসল হিসেবে ধরা হয় না)', 'Enter the real price or the total paid (the estimate is not used as the real one)'), 'aPrice');
      it.aQty = q; it.aPrice = rd.price; it.aTotal = rd.total;
      it.status = st === 'partial' && q >= it.qty ? 'done' : st;
    } else { it.status = st; it.aQty = 0; it.aPrice = null; it.aTotal = null; }
    bzRestock(m);
    closeSheet(); bzSave(m, SAVED());
  },
  'bz-budget': f => {
    const m = bzCur(); if (!m) return;
    const b = bzMinor(f.elements.budget.value);
    m.budget = b > 0 ? b : null; m.catBudgets = {};
    bzCats().forEach(c => { const v = bzMinor(f.elements['cb_' + c.k].value); if (v > 0) m.catBudgets[c.k] = v; });
    closeSheet(); bzSave(m, SAVED());
  },
  'bz-pay': f => {
    const m = bzCur(); if (!m) return;
    const o = { amt: bzMinor(f.elements.amt.value), date: f.elements.date.value, method: f.elements.method.value, shop: f.elements.shop.value.trim(), note: f.elements.note.value.trim() };
    if (!(o.amt > 0)) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    if (!bzDateOk(o.date)) o.date = today();
    const eid = f.dataset.id, old = eid && m.payments.find(x => x.id === eid && !x.del);
    if (old) { Object.assign(old, o); closeSheet(); return bzSave(m, SAVED()); }
    // একই পেমেন্ট দুবার চাপ পড়লে ডুপ্লিকেট হয় না
    const dup = m.payments.some(p => !p.del && Date.now() - p.createdAt < 5000 && bzDupKey(p) === bzDupKey(o));
    if (dup) { closeSheet(); return toast(L('এই পেমেন্ট এইমাত্র যোগ হয়েছে', 'This payment was just added')); }
    m.payments.push(Object.assign({ id: uid(), createdAt: Date.now() }, o));
    closeSheet(); bzSave(m, SAVED());
  },
  'bz-complete': f => {
    const m = bzCur(); if (!m) return;
    m.status = 'done';
    if (f.elements.stock && f.elements.stock.checked) bzApplyStock(bz(), m);
    if (f.elements.sync && f.elements.sync.checked && f.elements.ev) {
      if (m.sync && m.sync.evId !== f.elements.ev.value) { const old = bzTargets().find(e => e.id === m.sync.evId); if (old) old.expenses = old.expenses.filter(e => e.ref !== 'bz:' + m.id); }
      m.sync = { evId: f.elements.ev.value };
    } else if (f.elements.sync && !f.elements.sync.checked && m.sync) bzUnsyncMain(m);
    closeSheet(); bzSave(m, L('বাজার সম্পন্ন হয়েছে', 'Market completed'));
  },
  'bz-sync': f => {
    const m = bzCur(); if (!m) return;
    m.sync = { evId: f.elements.ev.value }; closeSheet(); bzSave(m, L('মূল খরচে যোগ হয়েছে', 'Added to main expenses'));
  },
  'bz-stock': f => {
    const name = f.elements.name.value.trim(), unit = f.elements.unit.value.trim();
    if (!name) return fail(f, L('পণ্যের নাম লিখুন', 'Enter the item name'), 'name');
    const qty = bzMilli(f.elements.qty.value), min = bzMilli(f.elements.min.value);
    if (qty < 0 || min < 0) return fail(f, L('ঋণাত্মক পরিমাণ দেওয়া যায় না', 'Negative amounts are not allowed'));
    const id = f.dataset.id, s = id && bz().stock.find(x => x.id === id);
    const other = bzStockFind(bz(), name, unit);
    if (other && (!s || other.id !== s.id)) return fail(f, L('এই নাম ও এককে মজুত আগেই আছে। সেটা এডিট করুন।', 'This item and unit already exist in stock. Edit that one.'), 'name');
    if (s) Object.assign(s, { name, unit, qty, min, note: f.elements.note.value.trim() });
    else bz().stock.push({ id: uid(), name, unit, qty, min, lastDate: '', lastPrice: 0, note: f.elements.note.value.trim(), createdAt: Date.now() });
    closeSheet(); commit(SAVED());
  },
  'bz-use': f => {
    const s = bz().stock.find(x => x.id === f.dataset.id); if (!s) return;
    const a = bzMilli(f.elements.amt.value);
    if (a <= 0) return fail(f, L('কত ব্যবহার করলেন তা লিখুন', 'Enter how much was used'), 'amt');
    if (a > s.qty) return fail(f, L(`মজুতে আছে মাত্র ${bzQtyStr(s.qty)} ${s.unit}`, `Only ${bzQtyStr(s.qty)} ${s.unit} in stock`), 'amt');
    s.qty -= a; closeSheet(); commit(SAVED());
  },
  'bz-tpl': f => {
    const name = f.elements.name.value.trim(); if (!name) return fail(f, L('টেমপ্লেটের নাম লিখুন', 'Enter a template name'), 'name');
    const items = bzParseTemplate(f.elements.lines.value);
    if (!items.length) return fail(f, L('অন্তত একটা পণ্য লিখুন', 'Add at least one item'), 'lines');
    const id = f.dataset.id, t = id && bz().templates.find(x => x.id === id);
    if (t) { const cats = Object.fromEntries(t.items.map(i => [bzNameKey(i.name), i.cat])); items.forEach(i => { i.cat = cats[bzNameKey(i.name)] || 'other'; }); Object.assign(t, { name, items }); }
    else bz().templates.push({ id: uid(), name, items, createdAt: Date.now() });
    closeSheet(); commit(SAVED());
  },
  'bz-cat': f => {
    const name = f.elements.name.value.trim(); if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    const id = f.dataset.id;
    if (bzCats().some(c => c.k !== id && (c.bn.toLowerCase() === name.toLowerCase() || c.en.toLowerCase() === name.toLowerCase()))) return fail(f, L('এই নামে বিভাগ আছে', 'That category exists'), 'name');
    if (id) { const c = bz().cats.find(x => x.k === id); if (c) c.name = name; } else bz().cats.push({ k: 'c_' + uid(), name });
    save(); render(); openSheet(bzCatsSheet());
  },
});

/* ---------- আগে থেকে ভরা পণ্যের তালিকা: ট্যাপ করে একসাথে অনেক পণ্য যোগ ---------- */
let bzPick = new Map(); // বাছা পণ্য: key -> পরিমাণ (থাউজ্যান্ডথ)
let bzRecentCache = [];
// অন্য বাজারে আগে কেনা পণ্য (এই তালিকায় নেই), বেশিবার কেনা আগে
function bzRecentItems(m) {
  const have = new Set(m.items.filter(i => !i.del).map(i => bzNameKey(i.name))), seen = {};
  bz().markets.filter(x => !x.del && x.status !== 'cancelled' && x.id !== m.id).sort(bzByDate).forEach(x => x.items.filter(i => !i.del && i.name).forEach(i => {
    const k = bzNameKey(i.name); if (have.has(k)) return;
    const s = seen[k] || (seen[k] = { n: 0, name: i.name, cat: i.cat || 'other', unit: i.unit || '', qty: i.qty || 1000, est: i.aPrice > 0 ? i.aPrice : (i.est || 0) });
    s.n++;
  }));
  return Object.values(seen).sort((a, b) => b.n - a.n).slice(0, 30);
}
const bzNameOpts = () => `<datalist id="bz-names">${BZ_CATALOG.map(c => `<option value="${esc(bzCatItemName(c))}">`).join('')}${[...new Set(bz().markets.flatMap(m => m.items.map(i => (i.name || '').trim())).filter(Boolean))].map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;
function bzCatalogSheet() {
  const m = bzCur(); if (!m) return '';
  bzPick = new Map(); bzRecentCache = bzRecentItems(m);
  const have = new Set(m.items.filter(i => !i.del).map(i => bzNameKey(i.name)));
  const chip = (key, label, sub, done, search) => `<button type="button" class="pk ${done ? 'done' : ''}" data-action="bz-pick" data-k="${key}" data-s="${esc(search)}" ${done ? 'disabled' : ''}><span>${done ? '✓ ' : ''}${esc(label)}</span><small>${esc(sub)}</small></button>`;
  const cats = BZ_CATS.map(cat => {
    const xs = BZ_CATALOG.map((c, i) => [c, i]).filter(([c]) => c[2] === cat.k);
    return xs.length ? `<div class="pk-sec" data-pk-sec><h4>${cat.e} ${esc(isEN() ? cat.en : cat.bn)}</h4><div class="pk-grid">${xs.map(([c, i]) => chip('c:' + i, bzCatItemName(c), bzUnitName(c[3]), have.has(bzNameKey(c[0])) || have.has(bzNameKey(c[1])), c[0] + ' ' + c[1])).join('')}</div></div>` : '';
  }).join('');
  const recent = bzRecentCache.length ? `<div class="pk-sec" data-pk-sec><h4>🕘 ${L('আগের বাজারে কেনা', 'Bought before')}</h4><div class="pk-grid">${bzRecentCache.map((r, j) => chip('r:' + j, r.name, r.unit, false, r.name)).join('')}</div></div>` : '';
  const tpls = `<div class="pk-tpls"><span>${L('তৈরি তালিকা', 'Ready lists')}</span>${BZ_BUILTIN_TPLS.map(t => `<button type="button" class="qchip" data-action="bz-pick-tpl" data-id="${t.id}">${esc(isEN() ? t.en : t.bn)}</button>`).join('')}</div>`;
  return `${sheetHead(L('পণ্য বাছুন', 'Pick items'), L('ট্যাপ করুন, একসাথে অনেকগুলো যোগ হবে', 'Tap to select, add many at once'))}
    <input class="input" type="search" data-bz-pkq placeholder="${L('পণ্য খুঁজুন (যেমন: ডিম, চাল)', 'Search (e.g. eggs, rice)')}">
    ${tpls}${recent}${cats}
    <div class="pk-bar"><button type="button" class="btn primary block" data-action="bz-pick-add" disabled>${L('যোগ করুন', 'Add')}</button></div>`;
}
function bzPickSync() {
  const n = bzPick.size, b = $('[data-action="bz-pick-add"]');
  if (b) { b.disabled = !n; b.textContent = n ? L(`${n}টা পণ্য যোগ করুন`, `Add ${n} item(s)`) : L('যোগ করুন', 'Add'); }
  $$('.pk[data-k]').forEach(c => c.classList.toggle('on', bzPick.has(c.dataset.k)));
}
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-bz-pkq]'); if (!el) return;
  const q = el.value.trim().toLowerCase();
  $$('.pk[data-k]').forEach(c => c.classList.toggle('hidden', !!q && !c.dataset.s.toLowerCase().includes(q)));
  $$('[data-pk-sec]').forEach(s => s.classList.toggle('hidden', !$('.pk:not(.hidden)', s)));
});
Object.assign(ACTIONS, {
  'bz-catalog': () => { const m = bzCur(); if (!m) return ACTIONS['bz-new'](); openSheet(bzCatalogSheet()); },
  'bz-pick': el => { const k = el.dataset.k; if (bzPick.has(k)) bzPick.delete(k); else bzPick.set(k, 1000); bzPickSync(); },
  'bz-pick-tpl': el => {
    const t = BZ_BUILTIN_TPLS.find(x => x.id === el.dataset.id); if (!t) return;
    t.items.forEach(([name, qty]) => {
      const i = BZ_CATALOG.findIndex(c => c[0] === name), chip = i >= 0 && $(`.pk[data-k="c:${i}"]`);
      if (chip && !chip.disabled) bzPick.set('c:' + i, Math.round(qty * 1000));
    });
    bzPickSync();
  },
  'bz-pick-add': () => {
    const m = bzCur(); if (!m || !bzPick.size) return;
    let n = 0;
    bzPick.forEach((qty, k) => {
      const [kind, idx] = [k.slice(0, 1), Number(k.slice(2))];
      if (kind === 'c' && BZ_CATALOG[idx]) { const c = BZ_CATALOG[idx]; m.items.push(bzNewItem({ name: bzCatItemName(c), cat: c[2], qty, unit: bzUnitName(c[3]) })); n++; }
      else if (kind === 'r' && bzRecentCache[idx]) { const r = bzRecentCache[idx]; m.items.push(bzNewItem({ name: r.name, cat: r.cat, qty: r.qty, unit: r.unit, est: r.est })); n++; }
    });
    bzPick = new Map(); closeSheet(); bzSave(m, L(`${n}টা পণ্য যোগ হয়েছে`, `${n} item(s) added`));
  },
});
// নাম লিখলে চেনা পণ্য হলে এককও বিভাগ নিজে বসে যায় (শুধু নতুন পণ্যে, যা নিজে বদলাননি তা বদলায় না)
function bzAutoFill(f, t) {
  if (!t || t.name !== 'name' || f.dataset.id) return;
  const c = bzCatalogFind(f.elements.name.value); if (!c) return;
  if (f.elements.unit && !f.elements.unit.dataset.touched) f.elements.unit.value = bzUnitName(c[3]);
  if (f.elements.cat && !f.elements.cat.dataset.touched) f.elements.cat.value = c[2];
}
document.addEventListener('input', e => { const t = e.target; if (t && (t.name === 'unit' || t.name === 'cat') && t.closest && t.closest('form[data-live="bz-item"], form[data-live="bz-quick"]')) t.dataset.touched = '1'; });
document.addEventListener('change', e => { const t = e.target; if (t && t.name === 'cat' && t.closest && t.closest('form[data-live="bz-item"], form[data-live="bz-quick"]')) t.dataset.touched = '1'; });
LIVE['bz-quick'] = (f, t) => bzAutoFill(f, t);

/* ---------- অ্যাকশন ---------- */
function bzUnsyncMain(m) {
  const ev = m.sync && bzTargets().find(e => e.id === m.sync.evId);
  if (ev) ev.expenses = ev.expenses.filter(e => e.ref !== 'bz:' + m.id);
  m.sync = null;
}
function bzSummaryText(m) {
  const c = bzMarketCalc(m), lines = [`🛒 ${m.name} · ${fmtDate(m.date)}`, ''];
  c.rows.forEach(r => lines.push(`${r.item.status === 'done' ? '✅' : r.item.status === 'partial' ? '½' : r.item.status === 'na' ? '✕' : '○'} ${r.item.name} ${bzQtyStr(r.item.qty)} ${r.item.unit}${r.bought ? ' = ' + bzM(r.net) : r.planned ? ' ~ ' + bzM(r.planned) : ''}`));
  lines.push('', `${L('আনুমানিক', 'Estimated')}: ${bzM(c.estTotal)}`); if (c.discount) lines.push(`${L('ডিসকাউন্ট', 'Discount')}: −${bzM(c.discount)}`); lines.push(`${L('আসল খরচ', 'Actual')}: ${bzM(c.actualTotal)}`);
  if (c.budget != null) lines.push(`${L('বাজেট', 'Budget')}: ${bzM(c.budget)} (${c.remaining >= 0 ? L('বাকি', 'left') + ' ' + bzM(c.remaining) : bzM(-c.remaining) + ' ' + L('বেশি', 'over')})`);
  if (c.paid) lines.push(`${L('পরিশোধ', 'Paid')}: ${bzM(c.paid)}${c.payable ? ` · ${L('বাকি', 'due')} ${bzM(c.payable)}` : ''}`);
  return lines.join('\n');
}
async function bzShare(txt, title) {
  try { if (navigator.share) { await navigator.share({ title, text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(txt); toast(L('কপি হয়েছে', 'Copied')); } catch (e) { toast(L('কপি করা যায়নি', 'Could not copy'), 'danger'); }
}
const bzOpenMarket = id => { bz().activeId = id; tab = 'list'; trail = ['home', 'list']; if (sheetOpen) closeSheet(); save(); render(); window.scrollTo(0, 0); };
Object.assign(ACTIONS, {
  'bz-new': () => openSheet(bzMarketForm(null)),
  'bz-edit-market': () => { const m = bzCur(); if (m) openSheet(bzMarketForm(m)); },
  'bz-markets': () => openSheet(bzMarketsSheet()),
  'bz-open': el => bzOpenMarket(el.dataset.id),
  'bz-history': () => { if (sheetOpen) closeSheet(); bzUi.sub = 'markets'; tab = 'history'; trail = ['home', 'history']; render(); window.scrollTo(0, 0); },
  'bz-sub': el => { bzUi.sub = el.dataset.v; bzUi.hq = ''; render(); },
  'bz-hf': el => { bzUi[el.dataset.key] = el.dataset.v; render(); },
  'bz-f': el => { bzUi.f = el.dataset.v; render(); },
  'bz-add-item': () => { const m = bzCur(); if (m) openSheet(bzItemForm(m, null)); },
  'bz-edit-item': el => { const m = bzCur(), it = m && bzItem(m, el.dataset.id); if (it) openSheet(bzItemForm(m, it)); },
  'bz-buy': el => { const m = bzCur(), it = m && bzItem(m, el.dataset.id); if (it) openSheet(bzBuyForm(m, it)); },
  'bz-item-dup': el => { const m = bzCur(), it = m && bzItem(m, el.dataset.id); if (!it) return; m.items.push(bzNewItem({ name: it.name, cat: it.cat, qty: it.qty, unit: it.unit, est: it.est, note: it.note })); if (sheetOpen) closeSheet(); bzSave(m, L('কপি হয়েছে', 'Duplicated')); },
  'bz-item-del': el => {
    const m = bzCur(), it = m && bzItem(m, el.dataset.id); if (!it) return;
    if (!confirm(L(`"${it.name}" মুছবেন?`, `Delete "${it.name}"?`))) return;
    if (sheetOpen) closeSheet();
    undoable(DELETED(), () => { it.del = Date.now(); if (it.stockedQty > 0) { const r = bzStockFind(bz(), it.name, it.unit); if (r) r.qty = Math.max(0, r.qty - it.stockedQty); it.stockedQty = 0; } m.updatedAt = Date.now(); bzSyncMain(m); });
  },
  'bz-budget': () => { const m = bzCur(); if (m) openSheet(bzBudgetForm(m)); },
  'bz-pay-add': () => { const m = bzCur(); if (m) openSheet(bzPayForm(m)); },
  'bz-pay-edit': el => { const m = bzCur(), p = m && m.payments.find(x => x.id === el.dataset.id && !x.del); if (p) openSheet(bzPayForm(m, p)); },
  'bz-edit-market-id': el => { const m = bzMkt(el.dataset.id); if (m) { bz().activeId = m.id; openSheet(bzMarketForm(m)); } },
  'bz-pay-del': el => { const m = bzCur(); if (!m) return; const p = m.payments.find(x => x.id === el.dataset.id); if (!p || !confirm(L('এই পেমেন্ট মুছবেন?', 'Delete this payment?'))) return; undoable(DELETED(), () => { p.del = Date.now(); m.updatedAt = Date.now(); }); },
  'bz-complete': () => { const m = bzCur(); if (m) openSheet(bzCompleteSheet(m)); },
  'bz-reopen': () => { const m = bzCur(); if (!m) return; m.status = 'active'; bzSave(m, L('আবার চালু হয়েছে', 'Reopened')); },
  'bz-cancel': () => { const m = bzCur(); if (!m || !confirm(L('বাজার বাতিল করবেন? এর খরচ কোথাও ধরা হবে না।', 'Cancel this market? Its spending is not counted anywhere.'))) return; m.status = 'cancelled'; bzSave(m, L('বাতিল হয়েছে', 'Cancelled')); },
  'bz-del-market': el => {
    const m = bzMkt(el.dataset.id); if (!m || !confirm(L(`"${m.name}" ডিলিট করবেন? এর খরচ ও মজুতে যোগ হওয়া অংশ ফিরে যাবে, ফিরিয়ে আনার সুযোগ থাকবে।`, `Delete "${m.name}"? Its linked expense and stock additions are reversed; you can undo right away.`))) return;
    if (sheetOpen) closeSheet();
    undoable(DELETED(), () => { bzReverseStock(bz(), m); m.del = Date.now(); bzSyncMain(m); if (bz().activeId === m.id) bz().activeId = null; });
  },
  'bz-sync': () => { const m = bzCur(); if (m) openSheet(bzSyncSheet(m)); },
  'bz-unsync': () => { const m = bzCur(); if (!m) return; bzUnsyncMain(m); closeSheet(); bzSave(m, L('মূল খরচ থেকে সরানো হয়েছে', 'Removed from main expenses')); },
  'bz-copy': () => { const m = bzCur(); if (m) bzShare(bzSummaryText(m), m.name); },
  'bz-csv': () => {
    const m = bzCur(); if (!m) return;
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', c = bzMarketCalc(m);
    const rows = [['Item', 'Category', 'Unit', 'Planned qty', 'Est. unit price', 'Est. total', 'Status', 'Bought qty', 'Actual unit price', 'Actual total', 'Note']]
      .concat(c.rows.map(r => [r.item.name, bzCatName(r.item.cat), r.item.unit, bzQtyStr(r.item.qty), r.item.est / 100, r.planned / 100, bzSt(r.item.status), r.item.aQty ? bzQtyStr(r.item.aQty) : '', r.item.aPrice != null ? r.item.aPrice / 100 : '', r.net / 100, r.item.note || '']));
    const url = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `bazar-${m.date}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  },
  'bz-save-tpl': () => {
    const m = bzCur(); if (!m) return;
    const items = m.items.filter(i => !i.del).map(i => ({ name: i.name, cat: i.cat, qty: i.qty, unit: i.unit, est: i.est }));
    if (!items.length) return toast(L('তালিকা খালি', 'The list is empty'), 'danger');
    bz().templates.push({ id: uid(), name: m.name, items, createdAt: Date.now() });
    if (sheetOpen) closeSheet(); commit(L('টেমপ্লেট হয়েছে। "আরও → নিয়মিত তালিকা" দেখুন', 'Template saved. See More → Recurring lists'));
  },
  'bz-tpls': () => openSheet(bzTplsSheet()),
  'bz-tpl-new': () => openSheet(bzTplForm(null)),
  'bz-tpl-edit': el => { const t = bz().templates.find(x => x.id === el.dataset.id); if (t) openSheet(bzTplForm(t)); },
  'bz-tpl-copy': el => { const t = bz().templates.find(x => x.id === el.dataset.id); if (!t) return; bz().templates.push({ id: uid(), name: t.name + L(' (কপি)', ' (copy)'), items: JSON.parse(JSON.stringify(t.items)), createdAt: Date.now() }); save(); openSheet(bzTplsSheet()); },
  'bz-tpl-del': el => { const t = bz().templates.find(x => x.id === el.dataset.id); if (!t || !confirm(L(`"${t.name}" টেমপ্লেট মুছবেন?`, `Delete template "${t.name}"?`))) return; if (sheetOpen) closeSheet(); undoable(DELETED(), () => { t.del = Date.now(); }); },
  'bz-tpl-use': el => {
    const t = bz().templates.find(x => x.id === el.dataset.id); if (!t) return;
    const o = { id: uid(), name: t.name, date: today(), status: 'active', budget: null, catBudgets: {}, shop: '', note: '', items: t.items.map(i => bzNewItem({ name: i.name, cat: i.cat || 'other', qty: i.qty, unit: i.unit, est: i.est })), payments: [], receipts: [], sync: null, createdAt: Date.now(), updatedAt: Date.now() };
    bz().markets.push(o); bz().activeId = o.id; tab = 'list'; trail = ['home', 'list']; if (sheetOpen) closeSheet(); commit(L('টেমপ্লেট থেকে নতুন বাজার হয়েছে', 'New market from template'));
  },
  'bz-cats': () => openSheet(bzCatsSheet()),
  'bz-cat-edit': el => { const c = bz().cats.find(x => x.k === el.dataset.id); if (!c) return; openSheet(`${sheetHead(L('বিভাগ এডিট', 'Edit category'))}<form data-form="bz-cat" data-id="${c.k}" autocomplete="off"><label class="field"><span>${L('নাম', 'Name')}</span><input class="input" name="name" maxlength="30" value="${esc(c.name)}"></label><button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`); },
  'bz-cat-del': el => { const c = bz().cats.find(x => x.k === el.dataset.id); if (!c || !confirm(L(`"${c.name}" বিভাগ মুছবেন? পণ্য ও ইতিহাস থাকবে, "অন্যান্য" হিসেবে দেখাবে।`, `Delete "${c.name}"? Items and history stay under "Other".`))) return; c.del = Date.now(); save(); openSheet(bzCatsSheet()); render(); },
  'bz-stock-add': () => openSheet(bzStockForm(null)),
  'bz-stock-edit': el => { const s = bz().stock.find(x => x.id === el.dataset.id); if (s) openSheet(bzStockForm(s)); },
  'bz-stock-del': el => { const s = bz().stock.find(x => x.id === el.dataset.id); if (!s || !confirm(L(`"${s.name}" মজুত থেকে মুছবেন?`, `Remove "${s.name}" from stock?`))) return; if (sheetOpen) closeSheet(); undoable(DELETED(), () => { s.del = Date.now(); }); },
  'bz-stock-use': el => {
    const s = bz().stock.find(x => x.id === el.dataset.id); if (!s) return;
    openSheet(`${sheetHead(L('ব্যবহার', 'Use'), `${esc(s.name)} · ${bzQtyStr(s.qty)} ${esc(s.unit)}`)}<form data-form="bz-use" data-id="${s.id}" autocomplete="off"><label class="field"><span>${L('কত ব্যবহার করলেন', 'How much did you use')} (${esc(s.unit)})</span><input class="input" name="amt" inputmode="decimal" placeholder="0"></label><button class="btn primary block" type="submit">${L('মজুত কমান', 'Reduce stock')}</button></form>`);
  },
  'bz-low-add': () => {
    const m = bzCur(); if (!m) return; let n = 0;
    bzLowStock(bz()).forEach(s => {
      if (m.items.some(i => !i.del && bzNameKey(i.name) === bzNameKey(s.name) && bzUnitKey(i.unit) === bzUnitKey(s.unit) && i.status !== 'done')) return;
      m.items.push(bzNewItem({ name: s.name, unit: s.unit, qty: Math.max(s.min - s.qty, s.min > s.qty ? 1 : s.min) || 1000, est: s.lastPrice || 0 })); n++;
    });
    bzSave(m, n ? L(`${n}টা পণ্য তালিকায় যোগ হয়েছে`, `${n} item(s) added to the list`) : L('সবই তালিকায় আছে', 'Already on the list'));
  },
  'bz-link': () => {
    const tg = bzTargets(), cur = bz().linkEv;
    openSheet(`${sheetHead(L('সংসারের হিসাবে নিজে যোগ', 'Auto-add to household'), L('বাজারের খরচ মাসের বাজেট থেকে নিজে কাটা যায়', 'Market costs come off the monthly budget'))}
      ${tg.length ? `<div class="list">${tg.map(e => `<button type="button" class="lrow ${cur === e.id ? 'cur' : ''}" data-action="bz-link-set" data-id="${e.id}"><span class="lic">${(HG_TYPES[e.type] || {}).icon || '🏡'}</span><span class="lmain"><b>${esc(e.name)}</b><small>${cur === e.id ? L('এখন চালু', 'On now') : L('এটাকে বাছুন', 'Pick this one')}</small></span></button>`).join('')}</div>
        ${cur ? `<button type="button" class="btn danger block mt12" data-action="bz-link-set" data-id="">${L('বন্ধ করুন', 'Turn off')}</button>` : ''}
        <p class="hint">${L('বাছলে এখনকার ও পরের সব বাজারের আসল খরচ (আনুমানিক নয়) ওই ইভেন্টে একটাই খরচ হিসেবে যায়, দুবার নয়। বাজার বদলালে খরচও মিলে যায়। বন্ধ করলে আগে যোগ হওয়া খরচ থাকে।', 'Once picked, the real cost of every market (never the estimate) goes to that event as one expense, never twice, and follows later edits. Turning it off keeps what was already added.')}</p>` : `<p class="hint">${L('"আড্ডা ও যৌথ খরচ"-এ একটা "মাসিক সংসার খরচ" বা "দৈনিক বাজার" ইভেন্ট খুললে এখানে বাছা যাবে।', 'Open a "Monthly household" or "Daily market" event in Hangout and it will be selectable here.')}</p>`}`);
  },
  'bz-link-set': el => {
    const id = el.dataset.id; bz().linkEv = id || null; let n = 0;
    if (id) bzMarkets().forEach(m => { if (!m.sync) { bzAutoLink(m); if (m.sync) { bzSyncMain(m); n++; } } });
    if (sheetOpen) closeSheet(); commit(id ? L(`চালু হয়েছে${n ? `, ${n}টা বাজার যোগ হয়েছে` : ''}`, `Turned on${n ? `, ${n} market(s) added` : ''}`) : L('বন্ধ হয়েছে', 'Turned off'));
  },
  'bz-auto-toggle': () => { bz().autoStock = !bz().autoStock; commit(bz().autoStock ? L('অটো-মজুত চালু', 'Auto stock on') : L('অটো-মজুত বন্ধ', 'Auto stock off')); },
  'bz-rcpt-add': el => { const i = el.closest('section').querySelector('[data-bz-rcpt]'); if (i) i.click(); },
  'bz-rcpt-view': el => { const u = imgURL.get('bzr:' + el.dataset.id); openSheet(`${sheetHead(L('রসিদ', 'Receipt'))}${u ? `<img class="bzbig" src="${u}" alt="">` : `<p class="hint">${L('ছবি পাওয়া যায়নি', 'Photo not found')}</p>`}`); },
  'bz-rcpt-del': el => {
    const m = bzCur(); if (!m || !confirm(L('এই রসিদের ছবি মুছবেন?', 'Remove this receipt photo?'))) return;
    const id = el.dataset.id; m.receipts = m.receipts.filter(x => x !== id); deleteImage('bzr:' + id).catch(() => {}); bzSave(m, DELETED());
  },
});
document.addEventListener('change', async e => {
  const inp = e.target.matches && e.target.matches('[data-bz-rcpt]') ? e.target : null; if (!inp) return;
  const m = bzCur(), files = [...(inp.files || [])]; inp.value = ''; if (!m || !files.length) return;
  let bad = 0;
  for (const file of files) {
    try { const blob = await compressImage(file), id = uid(); await putImage('bzr:' + id, blob); m.receipts.push(id); } catch (err) { bad++; }
  }
  bzSave(m, bad ? L(`${bad}টা ছবি সেভ হয়নি`, `${bad} photo(s) could not be saved`) : SAVED());
});

/* ---------- গাইড ---------- */
function bzGuide() {
  const ul = a => `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const S = [
    [L('দুটো অংশ: বাজার আর মাসিক সংসার', 'Two parts: groceries and monthly household'), ul([L('উপরের সুইচে <b>🛒 বাজার সদাই</b> আর <b>🏡 মাসিক সংসার হিসাব</b> এক ট্যাপে বদলান।', 'Switch between <b>🛒 Groceries</b> and <b>🏡 Monthly household</b> with the bar at the top.'), L('<b>মাসিক সংসার হিসাবে</b> আছে: বিদ্যুৎ-গ্যাস-পানি-ইন্টারনেটের বিল, পড়াশোনা ও টিউশন ফি (কোন শিক্ষককে কত বাকি), চিকিৎসা ও ওষুধ (ছবিসহ), কাজের সহায়তা, সঞ্চয়, মাসের বাজেট আর বাকির খাতা।', '<b>Monthly household</b> has: electricity, gas, water and internet bills; school and tuition fees (which teacher is owed what); medical visits and medicines with photos; house help, savings, the month budget and the credit book.'), L('প্রতিটা খাতের পাতায় কে কত দিল, কত বাকি, কবে দিতে হবে সব দেখা যায়।', 'Each category page shows what was paid, what is due and when.')])],
    [L('শুরু: ৩ ধাপে', 'Start in 3 steps'), ul([L('<b>নতুন বাজার</b> খুলুন, দরকারে বাজেট দিন।', '<b>New market</b>, set a budget if you want.'), L('<b>তালিকা</b>: পণ্য, পরিমাণ, একক আর আনুমানিক দাম লিখুন (বা টেমপ্লেট থেকে আনুন)।', '<b>List</b>: items, quantity, unit and estimated price (or start from a template).'), L('বাজারে গিয়ে প্রতিটা পণ্যের পাশের গোল বাটনে চাপুন, কত কিনলেন আর আসল দাম লিখুন।', 'In the shop tap the circle next to each item and enter the quantity and real price.')])],
    [L('পণ্য বাছা আর ডজন-হালির হিসাব', 'Picking items, dozens and halis'), ul([L('<b>তালিকা → বাছুন</b>: চাল, ডাল, তেল, সবজি, মাছ, ডিম, সাবান সহ ১৪০+ পণ্যের নাম আগেই ভরা আছে। ট্যাপ করে একসাথে অনেকগুলো যোগ হয়। "তৈরি তালিকা" (মাসের মুদি, সাপ্তাহিক বাজার) এক ট্যাপে সব বসায়।', '<b>List → Pick</b>: 140+ names (rice, lentils, oil, vegetables, fish, eggs, soap...) are already filled in. Tap many at once. "Ready lists" add a whole month or week.'), L('<b>কেনার সময়</b> এককে পিস, হালি, ডজন (বা গ্রাম, কেজি, মিলি, লিটার) বাছা যায়। ১২টা ডিম ৳১৫০ হলে "১২ পিস" লিখে মোট ১৫০ দিলেই হয়, ডজন-পিসের গোলমাল হয় না।', 'When buying you can pick the unit: pcs, hali, dozen (or g, kg, ml, litre). 12 eggs for ৳150: enter "12 pcs" and a total of 150. No dozen/piece mix-up.')])],
    [L('আনুমানিক আর আসল দাম', 'Estimated vs actual'), `<p>${L('<b>আনুমানিক মোট</b> = পরিমাণ × আনুমানিক দাম। <b>আসল মোট</b> = কেনা পরিমাণ × আসল দাম। তফাত পণ্যের পাশে দেখায়। আনুমানিক দাম কখনো খরচ হিসেবে ধরা হয় না।', '<b>Estimated total</b> = quantity × estimated price. <b>Actual total</b> = bought quantity × real price. The gap shows beside each item. Estimates are never counted as spending.')}</p>`],
    [L('কেনার অবস্থা', 'Item status'), ul([L('<b>কেনা হয়েছে:</b> আসল পরিমাণ ও দাম খরচে যোগ।', '<b>Bought:</b> real quantity and price count.'), L('<b>আংশিক:</b> শুধু যত কিনেছেন তত পরিমাণের দাম যোগ।', '<b>Partly:</b> only what you actually bought counts.'), L('<b>পাওয়া যায়নি / কেনা হয়নি:</b> খরচে ধরা হয় না।', '<b>Not found / not bought:</b> not counted.')])],
    [L('বাজেট', 'Budget'), `<p>${L('মোট বাজেট দিলে বাকি টাকা, ব্যবহারের % আর ৮৫%-এ পৌঁছালে সতর্কবার্তা আসে। খাতভিত্তিক বাজেটও দেওয়া যায়। বাজেট না দিলে কোনো বাকি টাকা দেখায় না।', 'With a budget you see what is left, % used and a warning at 85%. Per-category budgets are optional. With no budget no remaining amount is shown.')}</p>`],
    [L('পেমেন্ট, অগ্রিম ও বাকি', 'Payments, advance and dues'), `<p>${L('<b>বাকি</b> = আসল বিল − মোট পেমেন্ট। বেশি দিলে বাড়তিটা "অতিরিক্ত / অগ্রিম" হিসেবে আলাদা দেখায়। একই পেমেন্টে দুবার চাপ পড়লে ডুপ্লিকেট হয় না।', '<b>Due</b> = actual bill − total payments. Paying more shows the extra as "Extra / advance". A double tap never adds the same payment twice.')}</p>`],
    [L('মজুত', 'Home stock'), `<p>${L('বাসায় কী আছে লিখে রাখুন, ন্যূনতম সীমা দিন। কম হলে হোমে মনে করায় আর এক ট্যাপে তালিকায় যোগ হয়। কেনা পণ্য মজুতে যোগ করা যায়, প্রতিবার ঠিক একবারই যোগ হয়। মজুতের পরিমাণ অনুমান করা হয় না।', 'Record what you have and set a minimum. Low items are flagged on Home and added to the list in one tap. Bought items can be added to stock, exactly once each time. Stock is never guessed.')}</p>`],
    [L('দামের ইতিহাস', 'Price history'), `<p>${L('আপনার আসল কেনাকাটা থেকে "গতবার ৳১৭০ → এবার ৳১৮০" দেখায়। শুধু একই নাম ও একই এককের কেনা তুলনা হয়। এটা আপনার নিজের ইতিহাস, বাজারের চলতি দর নয়।', 'From your real purchases: "last ৳170 → now ৳180". Only the same name and unit are compared. It is your own history, not live market rates.')}</p>`],
    [L('টেমপ্লেট', 'Templates'), `<p>${L('"আরও → নিয়মিত তালিকা"। টেমপ্লেট থেকে নতুন বাজার করলে শুধু নাম, পরিমাণ, একক আর আনুমানিক দাম আসে। আগের আসল খরচ বা পেমেন্ট আসে না।', 'More → Recurring lists. A market from a template copies only names, quantities, units and estimates, never past actuals or payments.')}</p>`],
    [L('মূল খরচের সাথে যোগ', 'Linking to main expenses'), `<p>${L('বাজার সম্পন্ন করার সময় বা "আরও"-তে "মূল খরচে যোগ করুন"। "আড্ডা ও যৌথ খরচ"-এর একটা দৈনিক/সংসারের ইভেন্টে বাজারের আসল মোট একটাই খরচ হিসেবে যায়। পরে বাজার বদলালে ওই খরচও মিলে যায়, দুবার যোগ হয় না। বাজার বাতিল বা ডিলিট করলে খরচটাও সরে যায়।', 'When completing a market, or More → "Add to main expenses". The real total goes into a daily or household event in Hangout as one expense. Later edits keep it in sync; it is never added twice. Cancelling or deleting the market removes it.')}</p>`],
    [L('ব্যাকআপ ও অফলাইন', 'Backup & offline'), `<p>${L('সব ডেটা ফোনেই থাকে, ইন্টারনেট লাগে না। "আরও → ব্যাকআপ নিন"-এ বাজারের তালিকা, দাম, মজুত, টেমপ্লেট ও রসিদের ছবিসহ সব যায়।', 'Everything stays on the phone and works offline. More → Back up includes lists, prices, stock, templates and receipt photos.')}</p>`],
  ];
  return `${sheetHead(L('ঘর-সংসার: গাইড', 'Home & Bazar: guide'), L('বাজার সদাই আর মাসিক সংসার হিসাব', 'Groceries and monthly household'))}
    <div class="guide">${S.map(([t, b], i) => `<details class="gd" ${i === 0 ? 'open' : ''}><summary><span class="sn">${i + 1}</span><b>${t}</b>${icon('chev', 18)}</summary><div class="gbody">${b}</div></details>`).join('')}</div>`;
}

const BZ_TABS = [
  { id: 'home', icon: 'home', label: () => L('হোম', 'Home'), view: () => bzHome() },
  { id: 'list', icon: 'receipt', label: () => L('তালিকা', 'List'), view: () => bzListTab() },
  { id: 'stock', icon: 'box', label: () => L('মজুত', 'Stock'), view: () => bzStockTab() },
  { id: 'history', icon: 'chart', label: () => L('ইতিহাস', 'History'), view: () => bzHistoryTab() },
  { id: 'more', icon: 'grid', label: () => L('আরও', 'More'), view: () => bzMoreTab() },
];
registerModule({
  id: 'bazar',
  icon: 'home',
  emoji: '🏡',
  short: () => L('সংসার', 'Home'),
  name: () => L('ঘর-সংসার', 'Home & Bazar'),
  tagline: () => L('বাজার সদাই, মাসিক বিল, পড়াশোনা-টিউশন, চিকিৎসা ও বাকি-বকেয়া: ঘরের সব হিসাব এক জায়গায়', 'Groceries, monthly bills, school and tuition, medical and dues: all home accounts in one place'),
  migrate: bazarMigrate,
  hasData: s => !!(s.bazar && Array.isArray(s.bazar.markets) && s.bazar.markets.some(m => !m.del)),
  imageIds: () => bz().markets.flatMap(m => m.receipts.map(id => 'bzr:' + id)),
  backupSummary: s => (s.bazar && Array.isArray(s.bazar.markets) && s.bazar.markets.length ? L(`${cnt(s.bazar.markets.length)} বাজার`, `${s.bazar.markets.length} market(s)`) : ''),
  ready: () => true,
  welcome: () => '',
  context: () => {
    if (bzSec() !== 'house') return {};
    const ev = bzHouseCur();
    if (ev) hgRoute.ev = ev.id;
    return { ev, c: ev ? hgEventCalc(ev) : null };
  },
  topbar: bzTopbar,
  guide: bzGuide,
  // মাসিক সংসার অংশে Hangout-এর পরিচিত ট্যাবগুলোই চলে (হোম, পরিবার, খরচ, আরও), শুধু "আরও" এখানকার
  get tabs() {
    if (bzSec() !== 'house') return BZ_TABS;
    const ev = bzHouseCur();
    if (!ev) return [{ id: 'home', icon: 'home', label: () => L('হোম', 'Home'), view: () => bzHouseStart() }, BZ_TABS[4]];
    hgRoute.ev = ev.id;
    const t = HG_ALL_TABS.map(x => (x.id === 'more' ? Object.assign({}, x, { view: ({ ev: e }) => bzHouseMore(e) }) : x));
    return hgSolo(ev) ? t.filter(x => x.id !== 'settle' || hgActive(ev).length > 1) : t;
  },
});
