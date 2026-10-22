'use strict';

/* =========================================================
   Hangout & Group Expenses: হিসাবের কেন্দ্রীয় স্তর (শুধু হিসাব, কোনো UI নেই)
   - সব টাকা পূর্ণসংখ্যায় (পয়সা, ১ টাকা = ১০০), তাই দশমিকের ভুল হয় না
   - Dashboard, Overview, PDF, Slip, Text সব এই ফাইলের ফলাফলই দেখায়
   - Node-এ টেস্ট করা যায়: tests/hangout-calc.test.js
   ========================================================= */

const HG_SCHEMA = 1;
const hgNum = v => (typeof toNum === 'function' ? toNum(v) : (parseFloat(String(v).replace(/,/g, '')) || 0));
const toMinor = v => Math.round(hgNum(v) * 100 + (hgNum(v) < 0 ? -1e-9 : 1e-9));
const fromMinor = m => m / 100;
const hgMoney = m => {
  const neg = m < 0, a = Math.abs(Math.round(m)), t = Math.floor(a / 100), p = a % 100;
  return (neg ? '−' : '') + '৳' + t.toLocaleString('en-IN') + (p ? '.' + String(p).padStart(2, '0') : '');
};
const hgSum = a => a.reduce((x, y) => x + y, 0);

/* ---------- ভাগের মূল যন্ত্র: Largest Remainder, মোট কখনো এক পয়সাও বাড়ে-কমে না ---------- */
function hgDist(total, weights, ids) {
  const out = {};
  ids.forEach(id => { out[id] = 0; });
  const use = ids.filter(id => weights[id] > 0);
  const W = hgSum(use.map(id => weights[id]));
  if (!(W > 0) || !total) return out;
  let given = 0;
  const rem = [];
  use.forEach((id, i) => {
    const exact = total * weights[id] / W;
    const f = Math.floor(exact + 1e-9);
    out[id] = f; given += f; rem.push({ id, r: exact - f, i });
  });
  let left = total - given;
  rem.sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0 && rem.length; k++, left--) out[rem[k % rem.length].id]++;
  return out;
}

/* ---------- খরচ ভাগ: equal / selected / exact / percent / ratio / custom ---------- */
// spec = { incl: [pid], values: { pid: number } }  (exact/custom = পয়সা, percent = %, ratio = ওজন)
function hgSplit(total, method, allIds, spec) {
  const ids = allIds.slice();
  const incl = (spec.incl || []).filter(id => ids.includes(id));
  const vals = spec.values || {};
  const fail = (code, extra) => ({ ok: false, alloc: null, error: Object.assign({ code }, extra || {}) });
  if (!(total >= 0) || !Number.isInteger(total)) return fail('bad_total');
  if (method === 'equal' || method === 'selected') {
    if (!incl.length) return fail('no_participants');
    const w = {}; incl.forEach(id => { w[id] = 1; });
    return { ok: true, alloc: hgDist(total, w, ids), error: null };
  }
  if (method === 'percent') {
    const w = {}; let s = 0;
    for (const id of ids) {
      const v = Number(vals[id] || 0);
      if (v < 0 || !isFinite(v)) return fail('invalid_percent', { id });
      w[id] = v; s += v;
    }
    if (Math.abs(s - 100) > 0.001) return fail('percent_sum', { sum: s });
    return { ok: true, alloc: hgDist(total, w, ids), error: null };
  }
  if (method === 'ratio') {
    const w = {}; let s = 0;
    for (const id of ids) {
      const v = Number(vals[id] || 0);
      if (v < 0 || !isFinite(v)) return fail('invalid_ratio', { id });
      w[id] = v; s += v;
    }
    if (!(s > 0)) return fail('ratio_empty');
    return { ok: true, alloc: hgDist(total, w, ids), error: null };
  }
  if (method === 'exact' || method === 'custom') {
    const a = {}; let s = 0;
    for (const id of ids) {
      const v = Math.round(Number(vals[id] || 0));
      if (v < 0) return fail('negative', { id });
      a[id] = v; s += v;
    }
    if (s !== total) return fail('sum_mismatch', { diff: total - s });
    return { ok: true, alloc: a, error: null };
  }
  return fail('unknown_method');
}

/* ---------- রেস্টুরেন্ট বিল: আইটেম → ডিসকাউন্ট → চার্জ → প্রত্যেকের অংশ ---------- */
// item: { id, name, unit, qty, type:'individual'|'shared', orderedBy, sharers:[], weights:{}, status:'ok'|'cancelled' }
// charge: { id, name, kind:'charge'|'discount', amt, scope:null|[itemId], method:'proportional'|'equal'|'custom', values:{pid:minor} }
function hgBill(bill, ids) {
  const errors = [];
  const items = (bill.items || []).filter(i => i.status !== 'cancelled');
  const cells = {}; // itemId -> pid -> minor
  let subtotal = 0;
  for (const it of items) {
    const tot = Math.round(it.unit) * Math.max(1, Math.floor(it.qty || 1));
    subtotal += tot;
    const row = {}; ids.forEach(id => { row[id] = 0; });
    if (it.type === 'shared') {
      const sh = (it.sharers || []).filter(id => ids.includes(id));
      if (!sh.length) { errors.push({ code: 'item_no_sharers', item: it.id }); }
      else {
        const w = {}; sh.forEach(id => { w[id] = (it.weights && it.weights[id] > 0) ? Number(it.weights[id]) : 1; });
        Object.assign(row, hgDist(tot, w, ids));
      }
    } else if (ids.includes(it.orderedBy)) row[it.orderedBy] = tot;
    else errors.push({ code: 'item_no_owner', item: it.id });
    cells[it.id] = row;
  }
  const itemIds = items.map(i => i.id);
  const personIn = (scope) => {
    const t = {}; ids.forEach(id => { t[id] = 0; });
    (scope || itemIds).forEach(iid => { if (cells[iid]) ids.forEach(id => { t[id] += cells[iid][id]; }); });
    return t;
  };
  const byMethod = (amt, charge, base) => {
    if (charge.method === 'equal') {
      const w = {}; const inv = ids.filter(id => base[id] > 0); inv.forEach(id => { w[id] = 1; });
      return hgDist(amt, w, ids);
    }
    if (charge.method === 'custom') {
      const out = {}; let s = 0;
      ids.forEach(id => { out[id] = Math.round((charge.values || {})[id] || 0); s += out[id]; });
      if (s !== amt) errors.push({ code: 'charge_custom_sum', charge: charge.id, diff: amt - s });
      return out;
    }
    return hgDist(amt, base, ids);
  };
  let discountTotal = 0;
  for (const c of (bill.charges || []).filter(c => c.kind === 'discount')) {
    const amt = Math.round(c.amt || 0); if (amt <= 0) continue;
    const base = personIn(c.scope);
    const perPerson = byMethod(amt, c, base);
    for (const id of ids) {
      if (perPerson[id] > base[id]) { errors.push({ code: 'discount_exceeds', charge: c.id }); continue; }
      if (!perPerson[id]) continue;
      // সেই ব্যক্তির স্কোপের ঘরগুলোতে আনুপাতিক হারে কমাও
      const sc = (c.scope || itemIds).filter(iid => cells[iid] && cells[iid][id] > 0);
      const w = {}; sc.forEach(iid => { w[iid] = cells[iid][id]; });
      const cut = hgDist(perPerson[id], w, sc);
      sc.forEach(iid => { cells[iid][id] -= cut[iid]; });
    }
    discountTotal += amt;
  }
  const chargeAlloc = {};
  let chargeTotal = 0;
  for (const c of (bill.charges || []).filter(c => c.kind !== 'discount')) {
    const amt = Math.round(c.amt || 0); if (amt <= 0) continue;
    const base = personIn(c.scope);
    chargeAlloc[c.id] = byMethod(amt, c, base);
    chargeTotal += amt;
  }
  const perPerson = {}; ids.forEach(id => { perPerson[id] = 0; });
  Object.values(cells).forEach(row => ids.forEach(id => { perPerson[id] += row[id]; }));
  Object.values(chargeAlloc).forEach(row => ids.forEach(id => { perPerson[id] += row[id]; }));
  const total = subtotal - discountTotal + chargeTotal;
  if (hgSum(Object.values(perPerson)) !== total) errors.push({ code: 'bill_sum', diff: total - hgSum(Object.values(perPerson)) });
  return { ok: !errors.length, errors, subtotal, discountTotal, chargeTotal, total, perPerson, cells, chargeAlloc };
}

/* ---------- একটা খরচের চূড়ান্ত বণ্টন (সেভ করা তথ্য থেকে আবার হিসাব) ---------- */
function hgExpenseAlloc(ev, e) {
  const ids = ev.participants.map(p => p.id);
  if (e.mode === 'bill') {
    const b = hgBill(e.bill || {}, ids);
    const total = b.total;
    return { ok: b.ok && total === e.total, alloc: b.perPerson, error: b.ok ? (total === e.total ? null : { code: 'bill_total', diff: e.total - total }) : b.errors[0], bill: b };
  }
  const r = hgSplit(e.total, e.method, ids, e.spec || {});
  return { ok: r.ok, alloc: r.alloc, error: r.error };
}

/* ---------- মতামত/সমঝোতার প্রকার ---------- */
// effect: none = শুধু রেকর্ড, waive_due = দেনাদারের দেনা মাফ, waive_recv = পাওনাদার পাওনা ছাড়লেন,
//         cover = অন্য একজন দায় নিল, share = বাড়তি খরচ অন্যদের মধ্যে ভাগ
const HG_DECISION_TYPES = {
  payable: {
    full_required: { effect: 'none' }, partial_agreement: { effect: 'none' }, pending: { effect: 'none' },
    waive_all: { effect: 'waive_due', full: true }, waive_partial: { effect: 'waive_due' }, disputed: { effect: 'none' },
    cover: { effect: 'cover' }, custom: { effect: 'custom' },
  },
  receivable: {
    reimb_full: { effect: 'none' }, reimb_partial: { effect: 'none' }, reimb_pending: { effect: 'none' },
    waive_full: { effect: 'waive_recv', full: true }, waive_partial: { effect: 'waive_recv' }, gift: { effect: 'waive_recv', full: true },
    share: { effect: 'share' }, disputed: { effect: 'none' }, custom: { effect: 'custom' },
  },
};
const hgDecisionEffect = d => {
  const t = (HG_DECISION_TYPES[d.side] || {})[d.type] || { effect: 'none' };
  if (t.effect === 'custom') return d.side === 'payable' ? 'waive_due' : 'waive_recv';
  return t.effect;
};

// চূড়ান্ত (Finalized) সিদ্ধান্তগুলো ক্রমানুসারে প্রয়োগ। প্রতিটা শুধু একবার, এবং বাকি পাওনা/দেনার বেশি নয়।
function hgApplyDecisions(ev, pre) {
  const ids = ev.participants.map(p => p.id);
  const run = Object.assign({}, pre);
  const adj = {}, waivedFor = {}, waivedBy = {}, applied = [];
  ids.forEach(id => { adj[id] = 0; waivedFor[id] = 0; waivedBy[id] = 0; });
  const list = (ev.decisions || []).filter(d => !d.del && d.status === 'finalized')
    .sort((a, b) => (a.finalizedAt || 0) - (b.finalizedAt || 0) || (a.createdAt || 0) - (b.createdAt || 0));
  const move = (pid, delta) => { run[pid] += delta; adj[pid] += delta; };
  for (const d of list) {
    const eff = hgDecisionEffect(d);
    if (eff === 'none' || !ids.includes(d.pid)) { applied.push({ id: d.id, amt: 0, effect: 'none' }); continue; }
    let w = 0;
    if (eff === 'waive_due') {
      const due = Math.max(0, -run[d.pid]);
      w = d.amt == null ? due : Math.min(d.amt, due);
      if (w > 0) {
        let cred = ids.filter(id => id !== d.pid && run[id] > 0 && (!(d.others && d.others.length) || d.others.includes(id)));
        if (!cred.length) cred = ids.filter(id => id !== d.pid && run[id] > 0);
        const wt = {}; cred.forEach(id => { wt[id] = run[id]; });
        const part = hgDist(w, wt, ids);
        move(d.pid, w); ids.forEach(id => { if (part[id]) { move(id, -part[id]); waivedBy[id] += part[id]; } });
        waivedFor[d.pid] += w;
      }
    } else if (eff === 'waive_recv') {
      const recv = Math.max(0, run[d.pid]);
      w = d.amt == null ? recv : Math.min(d.amt, recv);
      if (w > 0) {
        const debt = ids.filter(id => id !== d.pid && run[id] < 0);
        const wt = {}; debt.forEach(id => { wt[id] = -run[id]; });
        const part = hgDist(w, wt, ids);
        move(d.pid, -w); ids.forEach(id => { if (part[id]) { move(id, part[id]); waivedFor[id] += part[id]; } });
        waivedBy[d.pid] += w;
      }
    } else if (eff === 'cover') {
      const who = (d.others || []).filter(id => id !== d.pid && ids.includes(id));
      const due = Math.max(0, -run[d.pid]);
      w = d.amt == null ? due : Math.min(d.amt, due);
      if (w > 0 && who.length) {
        const part = hgDist(w, Object.fromEntries(who.map(id => [id, 1])), ids);
        move(d.pid, w); ids.forEach(id => { if (part[id]) move(id, -part[id]); });
      } else w = 0;
    } else if (eff === 'share') {
      const who = (d.others || []).filter(id => id !== d.pid && ids.includes(id));
      w = Math.max(0, d.amt || 0);
      if (w > 0 && who.length) {
        const part = hgDist(w, Object.fromEntries(who.map(id => [id, 1])), ids);
        move(d.pid, w); ids.forEach(id => { if (part[id]) move(id, -part[id]); });
      } else w = 0;
    }
    applied.push({ id: d.id, amt: w, effect: eff });
  }
  return { adj, waivedFor, waivedBy, applied, final: run };
}

/* ---------- ইভেন্টের সম্পূর্ণ হিসাব ---------- */
function hgEventCalc(ev) {
  const ids = ev.participants.map(p => p.id);
  const zero = () => Object.fromEntries(ids.map(id => [id, 0]));
  const live = x => !x.del;
  const exps = (ev.expenses || []).filter(live);
  const refunds = (ev.refunds || []).filter(live);
  const transfers = (ev.transfers || []).filter(live);
  const paid = zero(), share = zero(), refundGot = zero(), out = zero(), inn = zero();
  const per = [], issues = [];
  const catTotals = {};
  let gross = 0, refundTotal = 0;
  for (const e of exps) {
    const r = hgExpenseAlloc(ev, e);
    const alloc = r.ok ? r.alloc : (e.alloc || zero()); // সমস্যা থাকলে সেভ করা বণ্টন ব্যবহার, কিন্তু "পুনর্বিবেচনা দরকার" চিহ্ন
    if (!r.ok) issues.push({ code: 'needs_review', expense: e.id, error: r.error });
    const payers = e.payers || [];
    const payTotal = hgSum(payers.map(p => p.amt));
    if (payTotal !== e.total) issues.push({ code: 'payers_mismatch', expense: e.id, diff: e.total - payTotal });
    payers.forEach(p => { if (p.pid in paid) paid[p.pid] += p.amt; });
    gross += e.total;
    const ref = refunds.filter(x => x.expenseId === e.id);
    const refSum = hgSum(ref.map(x => x.amt));
    if (refSum > e.total) issues.push({ code: 'refund_exceeds', expense: e.id });
    let net = alloc;
    ids.forEach(id => { share[id] += alloc[id] || 0; });
    if (refSum > 0) {
      const part = hgDist(Math.min(refSum, e.total), alloc, ids);
      ids.forEach(id => { share[id] -= part[id]; });
      net = Object.fromEntries(ids.map(id => [id, (alloc[id] || 0) - part[id]]));
    }
    refundTotal += Math.min(refSum, e.total);
    ref.forEach(x => { if (x.by in refundGot) refundGot[x.by] += x.amt; });
    const cat = e.category || 'other';
    catTotals[cat] = (catTotals[cat] || 0) + e.total - Math.min(refSum, e.total);
    per.push({ id: e.id, total: e.total, refund: Math.min(refSum, e.total), net: e.total - Math.min(refSum, e.total), alloc, netAlloc: net, ok: r.ok, error: r.error });
  }
  // টাকা লেনদেন: advance, contribution, settlement একই প্রভাব ফেলে, শুধু শ্রেণি আলাদা
  const byKind = { advance: zero(), contribution: zero(), settlement: zero() };
  const inKind = { advance: zero(), contribution: zero(), settlement: zero() };
  transfers.forEach(t => {
    if (t.from in out) { out[t.from] += t.amt; (byKind[t.kind] || byKind.settlement)[t.from] += t.amt; }
    if (t.to in inn) { inn[t.to] += t.amt; (inKind[t.kind] || inKind.settlement)[t.to] += t.amt; }
  });
  const base = {}, pre = {};
  ids.forEach(id => {
    base[id] = paid[id] - refundGot[id] - share[id];
    pre[id] = base[id] + out[id] - inn[id];
  });
  const dec = hgApplyDecisions(ev, pre);
  const final = dec.final;
  const baseSum = hgSum(Object.values(base)), finalSum = hgSum(Object.values(final));
  if (baseSum !== 0) issues.push({ code: 'base_not_zero', diff: baseSum });
  if (finalSum !== 0) issues.push({ code: 'final_not_zero', diff: finalSum });
  const netExp = gross - refundTotal;
  return {
    ids, per, paid, share, refundGot, out, inn, byKind, inKind, base, pre, adj: dec.adj, waivedFor: dec.waivedFor, waivedBy: dec.waivedBy,
    applied: dec.applied, final, gross, refundTotal, net: netExp, catTotals, issues, balanced: finalSum === 0 && baseSum === 0,
    suggestions: hgSuggest(final),
  };
}

// কে কাকে কত দিলে মিটবে: লেনদেনের সংখ্যা কম রাখার চেষ্টা, ভুল Balance তৈরি করে না
function hgSuggest(final) {
  const debt = [], cred = [];
  Object.keys(final).forEach(id => { if (final[id] < 0) debt.push({ id, a: -final[id] }); else if (final[id] > 0) cred.push({ id, a: final[id] }); });
  debt.sort((x, y) => y.a - x.a); cred.sort((x, y) => y.a - x.a);
  const out = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const m = Math.min(debt[i].a, cred[j].a);
    if (m > 0) out.push({ from: debt[i].id, to: cred[j].id, amt: m });
    debt[i].a -= m; cred[j].a -= m;
    if (debt[i].a === 0) i++;
    if (cred[j].a === 0) j++;
  }
  return out;
}

/* ---------- ব্যক্তির অবস্থা (Status) ---------- */
function hgPersonStatus(ev, calc, pid) {
  const ds = (ev.decisions || []).filter(d => !d.del && d.pid === pid);
  const open = ds.some(d => d.status === 'disputed');
  const fin = calc.final[pid];
  const hasPay = calc.out[pid] > 0 || calc.inn[pid] > 0;
  const waived = calc.waivedFor[pid] > 0 || calc.waivedBy[pid] > 0;
  const mustPay = ds.some(d => d.status === 'finalized' && (d.type === 'full_required'));
  const refundDue = ds.some(d => d.status === 'finalized' && (d.type === 'reimb_full' || d.type === 'reimb_partial'));
  if (open) return 'disputed';
  if (fin === 0) return waived ? 'waived' : (calc.base[pid] === 0 && !hasPay ? 'settled' : 'settled');
  if (fin < 0) return hasPay ? 'partial' : (mustPay ? 'must_pay' : 'pending');
  return refundDue ? 'refund_due' : (hasPay ? 'partial_recv' : 'overpaid');
}

/* ---------- ব্যাকআপ যাচাই ও মার্জ ---------- */
function hgValidate(h) {
  const bad = m => ({ ok: false, error: m });
  if (!h || typeof h !== 'object') return bad('not_object');
  if (typeof h.schema !== 'number' || h.schema > HG_SCHEMA) return bad('schema');
  if (!Array.isArray(h.events) || !Array.isArray(h.friends)) return bad('shape');
  const seen = new Set();
  for (const ev of h.events) {
    if (!ev || typeof ev.id !== 'string' || !ev.id || seen.has(ev.id)) return bad('event_id');
    seen.add(ev.id);
    if (typeof ev.name !== 'string' || !Array.isArray(ev.participants)) return bad('event_shape');
    const pids = new Set(ev.participants.map(p => p && p.id));
    if (pids.size !== ev.participants.length || pids.has(undefined)) return bad('participants');
    const ints = (arr, f) => (arr || []).every(x => x && Number.isSafeInteger(f(x)) && f(x) >= 0);
    if (!ints(ev.expenses, x => x.total) || !ints(ev.transfers, x => x.amt) || !ints(ev.refunds, x => x.amt)) return bad('amounts');
    for (const e of ev.expenses || []) { if (!Array.isArray(e.payers) || !e.payers.every(p => Number.isSafeInteger(p.amt))) return bad('payers'); }
    for (const t of ev.transfers || []) { if (!pids.has(t.from) || !pids.has(t.to)) return bad('transfer_ref'); }
    for (const r of ev.refunds || []) { if (!(ev.expenses || []).some(e => e.id === r.expenseId)) return bad('refund_ref'); }
    for (const d of ev.decisions || []) { if (!pids.has(d.pid)) return bad('decision_ref'); }
  }
  return { ok: true };
}
// একই ব্যাকআপ আবার ঢোকালে ডুপ্লিকেট হয় না: আইডি মিললে বাদ
function hgMerge(cur, inc) {
  const have = new Set(cur.events.map(e => e.id));
  const evs = inc.events.filter(e => !have.has(e.id));
  const fr = new Set(cur.friends.map(f => f.id));
  const friends = inc.friends.filter(f => !fr.has(f.id));
  return { events: cur.events.concat(evs), friends: cur.friends.concat(friends), added: evs.length, skipped: inc.events.length - evs.length };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hgDist, hgSplit, hgBill, hgExpenseAlloc, hgEventCalc, hgSuggest, hgApplyDecisions, hgPersonStatus, hgValidate, hgMerge, toMinor, hgMoney, HG_DECISION_TYPES, hgDecisionEffect };
}
