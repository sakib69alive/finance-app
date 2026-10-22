'use strict';

/* =========================================================
   রিয়েল এস্টেট: হিসাবের স্তর (শুধু পুরো টাকা, কোনো UI নেই, টেস্ট করা যায়)
   Finance_App_Spec.pdf-এর §4 নিয়ম (১–১৭) এখানেই, এক জায়গায়। স্ক্রিন শুধু এগুলো ডাকে।
   সোনালি নিয়ম: যোগফল, বাকি, স্ট্যাটাস কখনো সেভ হয় না, সোর্স লেনদেন থেকে প্রতিবার হিসাব হয়।
   ========================================================= */

const reInt = n => (Number.isFinite(+n) ? Math.round(+n) : 0);
const reSum = a => a.reduce((x, y) => x + reInt(y), 0);
const RE_STATUSES = ['draft', 'pending', 'submitted', 'verified', 'completed', 'cancelled', 'rejected'];

// নিয়ম ১: শুধু verified, completed বা স্ট্যাটাস-হীন লেনদেন আসল হিসাবে ধরা হয়
const reCounts = st => !st || st === 'verified' || st === 'completed';
// অপেক্ষায় (এখনও ধরা হয়নি, কিন্তু বাতিলও না)
const reAwaiting = st => st === 'draft' || st === 'pending' || st === 'submitted';
const reCostCounts = c => reCounts(c.status);
const reCostPaid = reCostCounts;

// তারিখ (YYYY-MM-DD) হিসাব: মাস যোগ, দিন যোগ
function reAddMonths(s, k) {
  const [y, m, d] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + k, 1)), last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}
const reDays = (a, b) => Math.round((Date.UTC(...b.split('-').map((n, i) => (i === 1 ? n - 1 : +n))) - Date.UTC(...a.split('-').map((n, i) => (i === 1 ? n - 1 : +n)))) / 864e5);
const reTodayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// বিক্রি দাম = মূল দাম + পার্কিং + ফ্লোর প্রিমিয়াম + অতিরিক্ত চার্জ − ছাড়
function reSalePrice(s) {
  return Math.max(0, reInt(s.base) + reInt(s.parking) + reInt(s.premium) + reInt(s.extra) - reInt(s.discount));
}

// মোট টাকাকে ওজন (যেমন স্কয়ার ফুট) অনুযায়ী ভাগ করে; অংশগুলোর যোগফল সবসময় ঠিক মোটের সমান (বড় ভগ্নাংশ আগে)
function reSplit(total, weights) {
  const w = weights.map(x => Math.max(0, +x || 0)), W = w.reduce((a, b) => a + b, 0);
  total = reInt(total);
  if (!w.length) return [];
  if (!(W > 0)) { const q = Math.floor(total / w.length); return w.map((_, i) => q + (i < total - q * w.length ? 1 : 0)); }
  const raw = w.map(x => total * x / W), out = raw.map(Math.floor);
  let left = total - reSum(out);
  raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return out;
}

const rePaidFor = (pays, kind, ref) => reSum((pays || []).filter(p => !p.void && p.kind === kind && p.ref === ref).map(p => p.amt));
const reStatusOf = (total, paid) => (total > 0 && paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid');

/* ---------- বিক্রি, কিস্তি, পাওনা (নিয়ম ১০, ১৪, ১৫) ---------- */
// নিয়ম ১৪: বাতিল ও চূড়ান্ত-নয় বিক্রি বাদ
const reSaleCounts = s => reCounts(s.status);
function reSaleRow(re, s) {
  const paid = rePaidFor(re.pays, 'sale', s.id), price = reInt(s.price);
  return { price, paid, due: Math.max(0, price - paid), state: reStatusOf(price, paid) };
}
// কিস্তির স্ট্যাটাস (নিয়ম ১০)
function reInstStatus(amt, paid, due, today) {
  if (amt - paid <= 0) return 'paid';
  if (due && due < today) return 'overdue';
  if (paid > 0) return 'partially-paid';
  if (due && reDays(today, due) <= 7) return 'due';
  return 'upcoming';
}
// বিক্রির সব পেমেন্ট তারিখ অনুযায়ী পুরোনো কিস্তি থেকে মেটানো হয়
function reInstRows(re, sale, today) {
  let pool = rePaidFor(re.pays, 'sale', sale.id);
  return (re.installments || []).filter(i => i.saleId === sale.id).sort((a, b) => (a.due || '').localeCompare(b.due || '')).map(i => {
    const paid = Math.min(reInt(i.amt), pool); pool -= paid;
    return { inst: i, paid, out: reInt(i.amt) - paid, status: reInstStatus(reInt(i.amt), paid, i.due, today || reTodayStr()) };
  });
}
// ডাউন পেমেন্ট + সমান মাসিক কিস্তির পরিকল্পনা
function reMakePlan(total, down, n, start) {
  total = reInt(total); down = Math.min(total, Math.max(0, reInt(down))); n = Math.max(0, reInt(n));
  const out = [];
  if (down > 0) out.push({ due: start, amt: down });
  if (n > 0 && total - down > 0) reSplit(total - down, Array(n).fill(1)).forEach((a, i) => out.push({ due: reAddMonths(start, i + 1), amt: a }));
  else if (!out.length && total > 0) out.push({ due: start, amt: total });
  return out;
}
// নিয়ম ১৫: ক্রেতাভিত্তিক পাওনা (ছাড়ের পরের মূল্য − বৈধ পেমেন্ট; সময়-পার কিস্তি আলাদা)
function reReceivables(re, today) {
  today = today || reTodayStr();
  return re.customers.map(c => {
    const sales = re.sales.filter(s => s.customerId === c.id && reSaleCounts(s)), rows = sales.map(s => reSaleRow(re, s));
    const overdue = reSum(sales.flatMap(s => reInstRows(re, s, today).filter(r => r.status === 'overdue').map(r => r.out)));
    return { customer: c, contract: reSum(rows.map(r => r.price)), paid: reSum(rows.map(r => r.paid)), out: reSum(rows.map(r => r.due)), overdue };
  }).filter(r => r.contract > 0);
}

/* ---------- মালিকের অবদান / খরচ ভাগ (নিয়ম ৪–১৩) ---------- */
const reAdjOf = (re, partId) => reSum((re.adjustments || []).filter(a => a.partId === partId).map(a => a.amt));
// নিয়ম ৯
function reContribStatus(out, paid, overdue) { return out <= 0 ? 'paid' : overdue ? 'overdue' : paid > 0 ? 'partially-paid' : 'pending'; }
function reShareRows(re, sh, today) {
  today = today || reTodayStr();
  return sh.parts.map(p => {
    const eff = reInt(p.payable) + reAdjOf(re, p.id), paid = rePaidFor(re.pays, 'share', p.id);
    const out = Math.max(0, eff - paid), overdue = out > 0 && !!sh.due && sh.due < today;                      // নিয়ম ৫, ৬
    const fine = overdue ? (sh.fineType === 'percentage' ? Math.round(out * (+sh.fineValue || 0) / 100) : reInt(sh.fineValue)) : 0; // নিয়ম ৭
    return { part: p, eff, paid, due: out, over: Math.max(0, paid - eff), overdue, fine, totalDue: out + fine, state: reStatusOf(eff, paid), status: reContribStatus(out, paid, overdue) };
  });
}
// নিয়ম ১২, ১৩
function reGoalStatus(sh, rows, today) {
  if (sh.status === 'cancelled' || sh.status === 'archived' || sh.status === 'draft') return sh.status;
  const eff = reSum(rows.map(r => r.eff)), paid = reSum(rows.map(r => r.paid)), pct = eff > 0 ? paid / eff * 100 : 0;
  if (pct >= 100 && sh.completed) return 'completed';
  if (pct >= 100) return 'fully-funded';
  if (pct > 0) return 'partially-funded';
  if (sh.date && sh.date > (today || reTodayStr())) return 'upcoming';
  return 'active';
}
const reGoalPct = rows => { const e = reSum(rows.map(r => r.eff)); return e > 0 ? reSum(rows.map(r => r.paid)) / e * 100 : 0; };

/* ---------- বাজেট, খরচ, স্টক, নির্মাণ (নিয়ম ২, ৩, ১৬) ---------- */
const reBuyCounts = p => reCounts(p.status);
const reBuyTotal = p => Math.round((+p.qty || 0) * (+p.rate || 0));
// নিয়ম ২: ক্রয় + প্রজেক্ট খরচ + ঠিকাদার পেমেন্ট (সবই নিয়ম ১ ফিল্টারে)
function reActualCost(re, o) {
  o = o || {};
  const m = x => (!o.projectId || !x.projectId || x.projectId === o.projectId) && (!o.phaseId || x.phaseId === o.phaseId);
  const costs = re.costs.filter(c => reCostCounts(c) && m(c) && (!o.category || c.category === o.category));
  const buys = (re.purchases || []).filter(p => reBuyCounts(p) && m(p) && (!o.category || o.category === 'material'));
  return reSum(costs.map(c => c.amount)) + reSum(buys.map(reBuyTotal));
}
// নিয়ম ৩: ৮০% সতর্ক, ১০০% জরুরি (প্রতি সারির নিজস্ব সীমা চলে)
function reBudgetRow(re, b) {
  const actual = reActualCost(re, { projectId: b.projectId, category: b.category, phaseId: b.phaseId }), amount = reInt(b.amount), pct = amount > 0 ? actual / amount * 100 : 0, warn = +b.warn || 80;
  return { budget: b, actual, variance: amount - actual, pct, level: pct >= 100 ? 'critical' : pct >= warn ? 'warn' : 'ok' };
}
// নিয়ম ১৬: স্টক = মোট ঢোকা − মোট বেরোনো
function reStock(re) {
  return (re.materials || []).map(m => {
    const inn = (re.purchases || []).filter(p => p.materialId === m.id && p.status !== 'cancelled' && p.status !== 'rejected').reduce((s, p) => s + (+p.qty || 0), 0);
    const out = (re.usage || []).filter(u => u.materialId === m.id).reduce((s, u) => s + (+u.qty || 0), 0);
    const have = Math.round((inn - out) * 1000) / 1000;
    return { material: m, inn, out, have, low: m.threshold > 0 && have < m.threshold };
  });
}
const rePhaseProgress = (re, ph) => { const t = (re.tasks || []).filter(x => x.phaseId === ph.id); return t.length ? Math.round(reSum(t.map(x => x.progress)) / t.length) : 0; };

/* ---------- ক্যাশ ফ্লো, অ্যাকাউন্ট (নিয়ম ১৭) ---------- */
const reMonthOf = d => (d || '').slice(0, 7);
function reCashFlow(re) {
  const m = {}, add = (d, k, v) => { const y = reMonthOf(d) || '—'; (m[y] = m[y] || { ym: y, inn: 0, out: 0 })[k] += v; };
  re.pays.filter(p => !p.void).forEach(p => add(p.date, 'inn', reInt(p.amt)));
  (re.incomes || []).filter(i => reCounts(i.status)).forEach(i => add(i.date, 'inn', reInt(i.amount)));
  re.costs.filter(reCostCounts).forEach(c => add(c.date, 'out', reInt(c.amount)));
  (re.purchases || []).filter(reBuyCounts).forEach(p => add(p.date, 'out', reBuyTotal(p)));
  return Object.values(m).sort((a, b) => a.ym.localeCompare(b.ym)).map(x => Object.assign(x, { net: x.inn - x.out }));
}
function reAccountBalances(re) {
  return (re.accounts || []).map(a => {
    const inn = reSum(re.pays.filter(p => !p.void && p.accountId === a.id).map(p => p.amt)) + reSum((re.incomes || []).filter(i => reCounts(i.status) && i.accountId === a.id).map(i => i.amount));
    const out = reSum(re.costs.filter(c => reCostCounts(c) && c.accountId === a.id).map(c => c.amount)) + reSum((re.purchases || []).filter(p => reBuyCounts(p) && p.accountId === a.id).map(reBuyTotal));
    return { account: a, inn, out, balance: reInt(a.opening) + inn - out };
  });
}
function reCategorySpend(re) {
  const m = {};
  re.costs.filter(reCostCounts).forEach(c => { m[c.category || 'other'] = (m[c.category || 'other'] || 0) + reInt(c.amount); });
  const mat = reSum((re.purchases || []).filter(reBuyCounts).map(reBuyTotal));
  if (mat) m.material = (m.material || 0) + mat;
  return Object.entries(m).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
}
function reContractorRows(re) {
  return re.contractors.map(c => {
    const own = re.costs.filter(x => x.contractorId === c.id);
    return { contractor: c, paid: reSum(own.filter(reCostCounts).map(x => x.amount)), awaiting: reSum(own.filter(x => reAwaiting(x.status)).map(x => x.amount)), contract: reInt(c.contract) };
  });
}
function reCollectionByMethod(re) {
  const m = {};
  re.pays.filter(p => !p.void).forEach(p => { m[p.method || 'cash'] = (m[p.method || 'cash'] || 0) + reInt(p.amt); });
  return Object.entries(m).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
}

/* ---------- সতর্কতা: বাজেট ছাড়ানো, সময়-পার পাওনা, কম স্টক ---------- */
function reAlerts(re, today) {
  today = today || reTodayStr();
  const out = [];
  (re.budgets || []).map(b => reBudgetRow(re, b)).filter(r => r.level !== 'ok').forEach(r => out.push({ kind: 'budget', level: r.level, ref: r.budget.id, amt: r.actual, pct: r.pct }));
  re.sales.filter(reSaleCounts).forEach(s => { const o = reSum(reInstRows(re, s, today).filter(r => r.status === 'overdue').map(r => r.out)); if (o > 0) out.push({ kind: 'inst', level: 'critical', ref: s.id, amt: o }); });
  re.shares.forEach(sh => reShareRows(re, sh, today).filter(r => r.overdue).forEach(r => out.push({ kind: 'share', level: 'critical', ref: sh.id, part: r.part.id, amt: r.totalDue })));
  reStock(re).filter(r => r.low).forEach(r => out.push({ kind: 'stock', level: 'warn', ref: r.material.id, amt: r.have }));
  return out;
}

function reSummary(re, today) {
  today = today || reTodayStr();
  const sales = re.sales.filter(reSaleCounts), sr = sales.map(s => reSaleRow(re, s));
  const books = re.bookings.filter(b => b.status !== 'cancelled' && b.status !== 'draft'), bPaid = books.map(b => rePaidFor(re.pays, 'booking', b.id));
  const costs = re.costs.filter(reCostCounts), cPaid = reSum(costs.map(c => c.amount)) + reSum((re.purchases || []).filter(reBuyCounts).map(reBuyTotal));
  const cPend = reSum(re.costs.filter(c => reAwaiting(c.status)).map(c => c.amount));
  const rows = re.shares.filter(x => x.status !== 'cancelled' && x.status !== 'draft' && x.status !== 'archived').flatMap(x => reShareRows(re, x, today));
  const sh = { total: reSum(rows.map(r => r.eff)), paid: reSum(rows.map(r => r.paid)), due: reSum(rows.map(r => r.due)), fine: reSum(rows.map(r => r.fine)) };
  const salesIn = reSum(sr.map(r => r.paid)), bookIn = reSum(bPaid), other = reSum((re.incomes || []).filter(i => reCounts(i.status)).map(i => i.amount));
  const cashIn = salesIn + bookIn + sh.paid + other;
  const byStatus = {};
  re.units.forEach(u => { byStatus[u.status] = (byStatus[u.status] || 0) + 1; });
  return {
    sales: { n: sales.length, total: reSum(sr.map(r => r.price)), paid: salesIn, due: reSum(sr.map(r => r.due)) },
    bookings: { n: books.length, agreed: reSum(books.map(b => b.agreed)), deposit: reSum(books.map(b => b.deposit)), paid: bookIn },
    costs: { n: costs.length, paid: cPaid, pending: cPend },
    shares: sh,
    cashIn, cashOut: cPaid, net: cashIn - cPaid,
    units: { n: re.units.length, by: byStatus, stock: reSum(re.units.filter(u => u.status === 'available').map(u => u.price)) },
  };
}

/* ---------- ডেটা মেশানো ও নমুনা সরানো ---------- */
const RE_LISTS = ['projects', 'units', 'customers', 'contractors', 'sales', 'bookings', 'costs', 'shares', 'pays'];
// ওয়েবসাইটের ডেটা মেশানো: আইডি ধরে, তাই বারবার চাপলেও কিছু দ্বিগুণ হয় না; ইউজারের বদলানো রেকর্ড বদলায় না
function reMergeSeed(re, seed) {
  const added = {};
  RE_LISTS.forEach(k => {
    const have = new Set(re[k].map(x => x.id));
    (seed[k] || []).forEach(x => { if (!have.has(x.id)) { re[k].push(JSON.parse(JSON.stringify(x))); added[k] = (added[k] || 0) + 1; } });
  });
  if (!re.company.name) re.company = Object.assign({}, seed.company);
  re.web = JSON.parse(JSON.stringify(seed.web));
  re.seeded = seed.exportedAt;
  return added;
}

// নমুনা (sample: true) রেকর্ড আর তাদের পেমেন্ট সরায়। যে নমুনা ক্রেতা/ইউনিট/ঠিকাদার/প্রজেক্ট ইউজারের নিজের রেকর্ডে ব্যবহার হচ্ছে সেটা থেকে যায় (নমুনা চিহ্ন উঠে যায়), যাতে ইউজারের রেকর্ড ভেঙে না যায়
function reRemoveSample(re) {
  const gone = new Set();
  ['sales', 'bookings', 'costs', 'shares'].forEach(k => {
    re[k] = re[k].filter(x => { if (x.sample) { gone.add(x.id); (x.parts || []).forEach(p => gone.add(p.id)); return false; } return true; });
  });
  const used = new Set();
  re.sales.concat(re.bookings, re.costs, re.shares).forEach(x => [x.customerId, x.unitId, x.contractorId, x.projectId].forEach(v => v && used.add(v)));
  re.shares.forEach(x => x.parts.forEach(p => [p.customerId, p.unitId].forEach(v => v && used.add(v))));
  re.units.forEach(u => { if (!u.sample || used.has(u.id)) { if (u.projectId) used.add(u.projectId); } });
  ['projects', 'units', 'customers', 'contractors'].forEach(k => {
    re[k] = re[k].filter(x => { if (!x.sample) return true; if (used.has(x.id)) { x.sample = false; return true; } gone.add(x.id); return false; });
  });
  re.pays = re.pays.filter(p => !p.sample && !gone.has(p.ref));
  re.installments = (re.installments || []).filter(i => !gone.has(i.saleId));
  re.adjustments = (re.adjustments || []).filter(a => !gone.has(a.partId));
  return gone.size;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { reInt, reSum, RE_STATUSES, reCounts, reAwaiting, reAddMonths, reDays, reSalePrice, reSplit, rePaidFor, reStatusOf, reCostPaid, reSaleRow, reInstStatus, reInstRows, reMakePlan, reReceivables, reAdjOf, reContribStatus, reShareRows, reGoalStatus, reGoalPct, reBuyTotal, reActualCost, reBudgetRow, reStock, rePhaseProgress, reCashFlow, reAccountBalances, reCategorySpend, reContractorRows, reCollectionByMethod, reAlerts, reSummary, reMergeSeed, reRemoveSample };
}
