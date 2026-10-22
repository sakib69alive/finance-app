'use strict';

/* =========================================================
   বাজার সদাই: হিসাবের কেন্দ্রীয় স্তর (শুধু হিসাব, কোনো UI নেই)
   - টাকা পূর্ণসংখ্যায় (পয়সা, ১ টাকা = ১০০), পরিমাণ পূর্ণসংখ্যায় (১ একক = ১০০০), তাই দশমিকের ভুল হয় না
   - Node-এ টেস্ট করা যায়: tests/bazar-calc.test.js
   ========================================================= */

const BZ_SCHEMA = 1;
const bzNum = v => (typeof toNum === 'function' ? toNum(v) : (parseFloat(String(v).replace(/,/g, '')) || 0));
const bzMinor = v => Math.round(bzNum(v) * 100 + (bzNum(v) < 0 ? -1e-9 : 1e-9));
const bzMilli = v => Math.round(bzNum(v) * 1000 + (bzNum(v) < 0 ? -1e-9 : 1e-9));
const bzFromMinor = m => m / 100;
const bzFromMilli = q => q / 1000;
const bzMoney = m => {
  const neg = m < 0, a = Math.abs(Math.round(m)), t = Math.floor(a / 100), p = a % 100;
  return (neg ? '−' : '') + '৳' + t.toLocaleString('en-IN') + (p ? '.' + String(p).padStart(2, '0') : '');
};
const bzQtyStr = q => String(Math.round(q) / 1000);
// পরিমাণ (×১০০০) আর একক-দাম (পয়সা) থেকে মোট (পয়সা)
const bzLine = (qty, unitMinor) => Math.round((qty || 0) * (unitMinor || 0) / 1000);
const bzSum = a => a.reduce((x, y) => x + y, 0);

/* ---------- নাম ও এককের মিল (ভুল তুলনা এড়াতে) ---------- */
const BZ_UNIT_ALIAS = {
  kg: 'kg', 'কেজি': 'kg', g: 'g', gm: 'g', 'গ্রাম': 'g', l: 'l', ltr: 'l', liter: 'l', litre: 'l', 'লিটার': 'l', 'লি': 'l', ml: 'ml', 'মিলি': 'ml', 'মিলিলিটার': 'ml',
  pcs: 'pcs', pc: 'pcs', piece: 'pcs', 'পিস': 'pcs', 'টি': 'pcs', dozen: 'dozen', 'ডজন': 'dozen', pack: 'pack', packet: 'pack', 'প্যাকেট': 'pack', bottle: 'bottle', 'বোতল': 'bottle', bag: 'bag', sack: 'bag', 'বস্তা': 'bag',
};
const bzUnitKey = u => { const s = String(u || '').trim().toLowerCase(); return BZ_UNIT_ALIAS[s] || s; };
const bzNameKey = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');

/* ---------- একটা পণ্যের হিসাব ---------- */
// status: todo | partial | done | na
function bzItemCalc(i) {
  const est = bzLine(i.qty, i.est);
  const bought = i.status === 'done' || i.status === 'partial';
  const aQty = bought ? (i.aQty || 0) : 0;
  const actual = bought ? bzLine(i.aQty, i.aPrice) : 0;
  // দামের পার্থক্য: যত পরিমাণ কেনা হয়েছে সেই পরিমাণের আনুমানিক দামের সাথে (আংশিক কেনায় ভুল সাশ্রয় দেখায় না)
  const diff = bought && i.est > 0 ? actual - bzLine(i.aQty, i.est) : null;
  return { est: i.status === 'na' ? 0 : est, planned: est, actual, aQty, bought, diff, missingPrice: bought && !(i.aPrice >= 0 && i.aPrice !== undefined && i.aPrice !== null) };
}

// ডিসকাউন্ট আসল খরচের অনুপাতে পণ্যগুলোতে ভাগ (পূর্ণসংখ্যায়, মোট ঠিক মেলে)
function bzAllocDiscount(actuals, discount) {
  const gross = bzSum(actuals), d = Math.max(0, Math.min(discount || 0, gross)), out = actuals.map(() => 0);
  if (!(d > 0) || !(gross > 0)) return out;
  const raw = actuals.map(a => d * a / gross), base = raw.map(Math.floor);
  let left = d - bzSum(base);
  raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0 && actuals[i] > 0) { base[i]++; left--; } });
  return base;
}
/* ---------- একটা বাজারের হিসাব ---------- */
function bzMarketCalc(m) {
  const items = (m.items || []).filter(i => !i.del);
  const rows = items.map(i => Object.assign({ item: i }, bzItemCalc(i)));
  const gross = bzSum(rows.map(r => r.actual)), cut = bzAllocDiscount(rows.map(r => r.actual), m.discount);
  rows.forEach((r, i) => { r.net = r.actual - cut[i]; });
  const estTotal = bzSum(rows.map(r => r.est));
  const actualTotal = gross - bzSum(cut), discount = bzSum(cut);
  const count = s => items.filter(i => i.status === s).length;
  const budget = m.budget > 0 ? m.budget : null;
  const remaining = budget == null ? null : budget - actualTotal;
  const paid = bzSum((m.payments || []).filter(p => !p.del).map(p => p.amt));
  const cats = {};
  rows.forEach(r => {
    const k = r.item.cat || 'other';
    const c = cats[k] || (cats[k] = { k, est: 0, actual: 0, budget: null, count: 0, bought: 0 });
    c.est += r.est; c.actual += r.net; c.count++; if (r.item.status === 'done') c.bought++;
  });
  Object.keys(m.catBudgets || {}).forEach(k => {
    if (!(m.catBudgets[k] > 0)) return;
    const c = cats[k] || (cats[k] = { k, est: 0, actual: 0, budget: null, count: 0, bought: 0 });
    c.budget = m.catBudgets[k];
  });
  const catRows = Object.values(cats).map(c => Object.assign(c, { over: c.budget != null && c.actual > c.budget, left: c.budget == null ? null : c.budget - c.actual }));
  const flags = [];
  if (budget != null) {
    if (actualTotal > budget) flags.push({ code: 'budget_over', amt: actualTotal - budget });
    else if (actualTotal >= budget * 0.85 && actualTotal > 0) flags.push({ code: 'budget_near', amt: budget - actualTotal });
    if (estTotal > budget) flags.push({ code: 'plan_over', amt: estTotal - budget });
  }
  catRows.forEach(c => { if (c.over) flags.push({ code: 'cat_over', k: c.k, amt: c.actual - c.budget }); });
  return {
    rows, estTotal, actualTotal, gross, discount, total: items.length, done: count('done'), partial: count('partial'), todo: count('todo'), na: count('na'),
    budget, remaining, usedPct: budget ? actualTotal / budget * 100 : null, paid, payable: Math.max(0, actualTotal - paid), overpaid: Math.max(0, paid - actualTotal),
    diffTotal: bzSum(rows.filter(r => r.diff != null).map(r => r.diff)), catRows, flags,
    progress: items.length ? (count('done') + count('na') + count('partial') * 0.5) / items.length : 0,
  };
}

/* ---------- দামের ইতিহাস: শুধু নিজের আসল কেনাকাটার রেকর্ড থেকে ---------- */
function bzPriceEntries(bz) {
  const out = [];
  (bz.markets || []).forEach(m => {
    if (m.del || m.status === 'cancelled') return;
    (m.items || []).forEach(i => {
      if (i.del || !(i.status === 'done' || i.status === 'partial') || !(i.aPrice > 0) || !(i.aQty > 0)) return;
      out.push({ nk: bzNameKey(i.name), uk: bzUnitKey(i.unit), name: i.name, unit: i.unit, shop: (i.shop || m.shop || '').trim(), price: i.aPrice, date: m.date || '', t: m.createdAt || 0, mid: m.id, mname: m.name });
    });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.t - b.t);
}
// এই পণ্যের: এবারের দাম (cur), তার আগের দাম (prev), না কিনে থাকলে শেষ দাম (last)। নাম ও একক মিললে তবেই তুলনা।
function bzItemPrices(entries, m, item) {
  const nk = bzNameKey(item.name), uk = bzUnitKey(item.unit);
  const same = entries.filter(e => e.nk === nk && e.uk === uk);
  const other = same.filter(e => e.mid !== m.id);
  const mk = (m.date || '') + '|' + String(m.createdAt || 0).padStart(15, '0');
  const before = other.filter(e => (e.date + '|' + String(e.t).padStart(15, '0')) < mk);
  const prev = before.length ? before[before.length - 1] : null;
  const last = other.length ? other[other.length - 1] : null;
  const cur = (item.status === 'done' || item.status === 'partial') && item.aPrice > 0 ? item.aPrice : null;
  return { cur, prev, last, diff: cur != null && prev ? cur - prev.price : null };
}

/* ---------- মজুত ---------- */
const bzStockFind = (bz, name, unit) => (bz.stock || []).find(s => !s.del && bzNameKey(s.name) === bzNameKey(name) && bzUnitKey(s.unit) === bzUnitKey(unit));
// কেনা পণ্য মজুতে যোগ। প্রতিটা পণ্যের stockedQty মনে রাখা হয়, তাই বারবার চালালেও একই পরিমাণ দুবার যোগ হয় না
function bzApplyStock(bz, m, onlyLinked) {
  let changed = 0;
  (m.items || []).forEach(i => {
    if (i.del || (onlyLinked && !(i.stockedQty > 0))) return;
    const want = (i.status === 'done' || i.status === 'partial') ? (i.aQty || 0) : 0;
    const delta = want - (i.stockedQty || 0);
    if (!delta) return;
    let row = bzStockFind(bz, i.name, i.unit);
    if (!row) { if (delta < 0) { i.stockedQty = want; return; } row = { id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: i.name, unit: i.unit, qty: 0, min: 0, lastDate: '', lastPrice: 0, note: '', createdAt: Date.now() }; (bz.stock = bz.stock || []).push(row); }
    row.qty = Math.max(0, row.qty + delta);
    if (delta > 0) { row.lastDate = m.date || ''; if (i.aPrice > 0) row.lastPrice = i.aPrice; }
    i.stockedQty = want; changed++;
  });
  return changed;
}
// বাজার মুছলে তার থেকে যোগ হওয়া মজুত ফেরত
function bzReverseStock(bz, m) {
  (m.items || []).forEach(i => {
    if (!(i.stockedQty > 0)) return;
    const row = bzStockFind(bz, i.name, i.unit);
    if (row) row.qty = Math.max(0, row.qty - i.stockedQty);
    i.stockedQty = 0;
  });
}
const bzLowStock = bz => (bz.stock || []).filter(s => !s.del && s.min > 0 && s.qty <= s.min);

/* ---------- রিপোর্ট ---------- */
const bzDayShift = (s, n) => { const [y, mo, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, mo - 1, d + n)); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); };
// সপ্তাহ শনিবার থেকে শুরু
const bzWeekStart = s => { const [y, mo, d] = s.split('-').map(Number); const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); return bzDayShift(s, -((dow + 1) % 7)); };
const bzMonthShift = (ym, n) => { const [y, m] = ym.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + n, 1)); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0'); };
function bzReport(bz, now) {
  const ms = (bz.markets || []).filter(m => !m.del && m.status !== 'cancelled').map(m => ({ m, c: bzMarketCalc(m) })).filter(x => x.c.actualTotal > 0 || x.c.paid > 0);
  const sumBy = (keyFn, keys) => { const o = Object.fromEntries(keys.map(k => [k, 0])); ms.forEach(x => { const k = keyFn(x.m.date || ''); if (k in o) o[k] += x.c.actualTotal; }); return o; };
  const days = Array.from({ length: 7 }, (_, i) => bzDayShift(now, i - 6));
  const w0 = bzWeekStart(now), weeks = Array.from({ length: 6 }, (_, i) => bzDayShift(w0, (i - 5) * 7));
  const m0 = now.slice(0, 7), months = Array.from({ length: 6 }, (_, i) => bzMonthShift(m0, i - 5));
  const lastMonth = bzMonthShift(m0, -1);
  const catIn = ym => { const o = {}; ms.forEach(x => { if ((x.m.date || '').slice(0, 7) === ym) x.c.rows.forEach(r => { if (r.net) { const k = r.item.cat || 'other'; o[k] = (o[k] || 0) + r.net; } }); }); return o; };
  const catNow = catIn(m0), catPrev = catIn(lastMonth);
  const itemsNow = {};
  ms.forEach(x => { if ((x.m.date || '').slice(0, 7) === m0) x.c.rows.forEach(r => { if (r.net) { const k = bzNameKey(r.item.name) + '|' + bzUnitKey(r.item.unit); const e = itemsNow[k] || (itemsNow[k] = { name: r.item.name, unit: r.item.unit, total: 0 }); e.total += r.net; } }); });
  const top = Object.values(itemsNow).sort((a, b) => b.total - a.total).slice(0, 5);
  // দাম বাড়া-কমা: প্রতিটা পণ্যের সর্বশেষ কেনা দাম আর তার আগের দাম (একই নাম ও একক)
  const ent = bzPriceEntries(bz), byKey = {};
  ent.forEach(e => { (byKey[e.nk + '|' + e.uk] = byKey[e.nk + '|' + e.uk] || []).push(e); });
  const movers = Object.values(byKey).filter(a => a.length >= 2).map(a => { const l = a[a.length - 1], p = a[a.length - 2]; return { name: l.name, unit: l.unit, last: l.price, prev: p.price, diff: l.price - p.price, date: l.date }; }).filter(x => x.diff !== 0).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const insights = [];
  Object.keys(catNow).forEach(k => { if (catPrev[k] > 0 && catNow[k] > catPrev[k]) insights.push({ code: 'cat_up', k, amt: catNow[k] - catPrev[k] }); else if (catPrev[k] > 0 && catNow[k] < catPrev[k]) insights.push({ code: 'cat_down', k, amt: catPrev[k] - catNow[k] }); });
  insights.sort((a, b) => b.amt - a.amt);
  const shopsNow = {};
  ms.forEach(x => { if ((x.m.date || '').slice(0, 7) === m0) x.c.rows.forEach(r => { if (r.net) { const s = ((r.item.shop || x.m.shop) || '').trim() || '—'; shopsNow[s] = (shopsNow[s] || 0) + r.net; } }); });
  const shops = Object.entries(shopsNow).sort((a, b) => b[1] - a[1]);
  const budgetRows = ms.filter(x => x.c.budget != null).slice(-5).map(x => ({ id: x.m.id, name: x.m.name, date: x.m.date, budget: x.c.budget, actual: x.c.actualTotal }));
  const dues = ms.filter(x => x.c.payable > 0).map(x => ({ id: x.m.id, name: x.m.name, date: x.m.date, amt: x.c.payable }));
  return {
    days: Object.entries(sumBy(d => d, days)), weeks: Object.entries(sumBy(d => (d ? bzWeekStart(d) : ''), weeks)), months: Object.entries(sumBy(d => d.slice(0, 7), months)),
    shops, thisMonth: bzSum(Object.values(catNow)), lastMonth: bzSum(Object.values(catPrev)), catNow, catPrev, top, movers, insights, budgetRows, dues,
    hasData: ms.length > 0, hasPrev: bzSum(Object.values(catPrev)) > 0,
  };
}

/* ---------- টেমপ্লেট লেখা: প্রতি লাইনে  নাম | পরিমাণ | একক | আনুমানিক দাম ---------- */
function bzParseTemplate(text) {
  const items = [];
  String(text || '').split(/\n/).forEach(line => {
    const p = line.split('|').map(s => s.trim());
    if (!p[0]) return;
    items.push({ name: p[0], qty: bzMilli(p[1] || 1) || 1000, unit: p[2] || '', est: bzMinor(p[3] || 0), cat: 'other' });
  });
  return items;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bzAllocDiscount, bzMinor, bzMilli, bzMoney, bzLine, bzItemCalc, bzMarketCalc, bzPriceEntries, bzItemPrices, bzApplyStock, bzReverseStock, bzLowStock, bzStockFind, bzReport, bzWeekStart, bzParseTemplate, bzUnitKey, bzNameKey };
}
