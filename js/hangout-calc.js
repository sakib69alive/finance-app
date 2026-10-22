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
// unit = ভাগের একক (পয়সা)। 100 দিলে প্রত্যেকের ভাগ পুরো টাকা হয়; যে পয়সা বাকি থাকে তা প্রথম জনের ভাগে যায়
function hgDist(total, weights, ids, unit) {
  if (unit > 1 && total >= unit) {
    const base = hgDist(Math.floor(total / unit), weights, ids);
    const first = ids.find(id => weights[id] > 0);
    const out = {};
    ids.forEach(id => { out[id] = base[id] * unit; });
    out[first] += total - Math.floor(total / unit) * unit;
    return out;
  }
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
    return { ok: true, alloc: hgDist(total, w, ids, 100), error: null };
  }
  if (method === 'percent') {
    const w = {}; let s = 0;
    for (const id of ids) {
      const v = Number(vals[id] || 0);
      if (v < 0 || !isFinite(v)) return fail('invalid_percent', { id });
      w[id] = v; s += v;
    }
    if (Math.abs(s - 100) > 0.001) return fail('percent_sum', { sum: s });
    return { ok: true, alloc: hgDist(total, w, ids, 100), error: null };
  }
  if (method === 'ratio') {
    const w = {}; let s = 0;
    for (const id of ids) {
      const v = Number(vals[id] || 0);
      if (v < 0 || !isFinite(v)) return fail('invalid_ratio', { id });
      w[id] = v; s += v;
    }
    if (!(s > 0)) return fail('ratio_empty');
    return { ok: true, alloc: hgDist(total, w, ids, 100), error: null };
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
  const personal = zero();
  const byPersonCat = Object.fromEntries(ids.map(id => [id, {}])), byPersonDay = Object.fromEntries(ids.map(id => [id, {}])), byDay = {};
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
    if (e.personal && e.personal in personal) personal[e.personal] += net[e.personal] || 0; // শুধু একজনের নিজের খরচ (যেমন কোক)
    // কে কোন খাতে আর কোন দিনে কত বহন করল (রিফান্ড বাদ দিয়ে), এভাবে "টাকা কোথায় গেল" বোঝা যায়
    const day = e.date || '';
    const dd = byDay[day] || (byDay[day] = { total: 0, byCat: {}, count: 0 });
    dd.total += e.total - Math.min(refSum, e.total); dd.count++;
    dd.byCat[cat] = (dd.byCat[cat] || 0) + e.total - Math.min(refSum, e.total);
    ids.forEach(id => {
      const v = net[id] || 0; if (!v) return;
      byPersonCat[id][cat] = (byPersonCat[id][cat] || 0) + v;
      byPersonDay[id][day] = (byPersonDay[id][day] || 0) + v;
    });
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
    applied: dec.applied, final, gross, refundTotal, net: netExp, catTotals, byPersonCat, byPersonDay, byDay, personal, days: Object.keys(byDay).sort(), issues, balanced: finalSum === 0 && baseSum === 0,
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

/* ---------- জমা টাকার (পুলের) হিসাব: অর্গানাইজারের কাছে বন্ধুদের জমা দেওয়া টাকা ---------- */
function hgPoolCalc(ev, calc) {
  const org = ev.participants.find(p => p.org) || ev.participants[0];
  if (!org) return null;
  const live = (ev.transfers || []).filter(t => !t.del);
  const dep = {}, back = {}, pay = {};
  calc.ids.forEach(id => { dep[id] = 0; back[id] = 0; pay[id] = 0; });
  let any = false;
  live.forEach(t => {
    if (t.to === org.id && t.from !== org.id) { if (t.kind === 'settlement') pay[t.from] += t.amt; else { dep[t.from] += t.amt; any = true; } }
    if (t.from === org.id && t.to !== org.id) back[t.to] += t.amt;
  });
  const rows = ev.participants.filter(p => p.id !== org.id).map(p => ({ id: p.id, deposited: dep[p.id], share: calc.share[p.id], paidDirect: calc.paid[p.id], returned: back[p.id], settled: pay[p.id], final: calc.final[p.id], personal: calc.personal[p.id] }));
  const held = calc.inn[org.id] - calc.out[org.id] - calc.paid[org.id] + calc.refundGot[org.id];
  const toReturn = hgSum(rows.map(r => Math.max(0, r.final))), toCollect = hgSum(rows.map(r => Math.max(0, -r.final)));
  return { org: org.id, hasPool: any, collected: hgSum(Object.values(dep)), spent: calc.net, held, toReturn, toCollect, shortfall: Math.max(0, toReturn - held), rows };
}

/* ---------- একজনের পুরো স্টেটমেন্ট: প্রতিটা খরচ, টাকা দেওয়া-নেওয়া, মাফ, চলতি ব্যালেন্স (১ টাকা পর্যন্ত) ---------- */
// effect: ব্যালেন্সের ওপর প্রভাব (+ = সে পাবে বাড়ল, − = সে দেবে বাড়ল)। শেষ running সবসময় calc.final এর সমান।
function hgPersonStatement(ev, calc, pid) {
  const lines = [];
  const pe = Object.fromEntries(calc.per.map(x => [x.id, x]));
  ev.expenses.filter(e => !e.del).forEach(e => {
    const x = pe[e.id]; if (!x) return;
    const share = (x.netAlloc && x.netAlloc[pid]) || 0;
    const paid = (e.payers || []).filter(p => p.pid === pid).reduce((a, p) => a + p.amt, 0);
    if (paid) lines.push({ at: e.date || '', ts: e.createdAt || 0, kind: 'paid', ref: e.id, title: e.title, amt: paid, effect: paid });
    if (share) lines.push({ at: e.date || '', ts: e.createdAt || 0, kind: 'share', ref: e.id, title: e.title, amt: share, effect: -share, personal: e.personal === pid });
  });
  ev.refunds.filter(r => !r.del && r.by === pid).forEach(r => lines.push({ at: r.date || '', ts: r.createdAt || 0, kind: 'refund', ref: r.id, title: (ev.expenses.find(e => e.id === r.expenseId) || {}).title || '', amt: r.amt, effect: -r.amt }));
  ev.transfers.filter(t => !t.del).forEach(t => {
    if (t.from === pid) lines.push({ at: t.date || '', ts: t.createdAt || 0, kind: 'sent', sub: t.kind, ref: t.id, with: t.to, onBehalf: t.onBehalf || null, amt: t.amt, effect: t.amt, note: t.note || t.purpose || '' });
    if (t.to === pid) lines.push({ at: t.date || '', ts: t.createdAt || 0, kind: 'received', sub: t.kind, ref: t.id, with: t.from, onBehalf: t.onBehalf || null, amt: t.amt, effect: -t.amt, note: t.note || t.purpose || '' });
  });
  lines.sort((a, b) => a.at.localeCompare(b.at) || a.ts - b.ts);
  let run = 0;
  lines.forEach(l => { run += l.effect; l.running = run; });
  const adj = calc.adj[pid] || 0;
  if (adj) { run += adj; lines.push({ at: '', ts: Infinity, kind: 'adjust', amt: Math.abs(adj), effect: adj, running: run }); }
  return { lines, final: calc.final[pid], running: run, ok: run === calc.final[pid] };
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

/* ---------- আদর্শ বাজেট পরিকল্পনা: কয়জন, মোট (বা জনপ্রতি) বাজেট, খাতভিত্তিক আদর্শ ভাগ ---------- */
// ইভেন্টের ধরন অনুযায়ী প্রস্তাবিত % (জরুরি রিজার্ভ আলাদা, সবসময় ৮%)
const HG_RESERVE_PCT = 8;
const HG_PLAN_DEFAULTS = {
  tour: { transport: 25, fuel: 10, toll: 4, hotel: 30, food: 20, tickets: 5, other: 6 },
  restaurant: { food: 66, drinks: 18, vat: 7, service: 5, other_charges: 4 },
  picnic: { groceries: 40, transport: 25, location: 15, equipment: 8, games: 7, other: 5 },
  dayout: { food: 35, transport: 25, tickets: 25, shopping: 10, misc: 5 },
  hotel: { room: 68, food: 22, other_charges: 10 },
  birthday: { food: 40, venue: 25, decoration: 15, gifts: 10, equipment: 5, other: 5 },
  hangout: { food: 50, transport: 25, tickets: 10, shopping: 10, misc: 5 },
  transport: { transport: 60, fuel: 25, toll: 10, other: 5 },
  shopping: { shopping: 85, other: 15 },
};
// খাত অনুযায়ী % বানায় (সব মিলিয়ে ঠিক ১০০.০, ০.১ এর হিসাবে)। অজানা খাত থাকলে সমান ভাগ।
function hgPlanDefaults(type, catKeys) {
  const base = HG_PLAN_DEFAULTS[type] || {};
  const w = {};
  catKeys.forEach(k => { w[k] = base[k] || 0; });
  if (!hgSum(Object.values(w))) catKeys.forEach(k => { w[k] = 1; }); // কাস্টম খাত: সমান
  else catKeys.forEach(k => { if (!w[k]) w[k] = Math.max(2, Math.round(hgSum(Object.values(base)) / 20)); }); // নিজের যোগ করা খাতে অল্প একটু
  const tenths = hgDist(1000 - HG_RESERVE_PCT * 10, w, catKeys);
  const out = {};
  catKeys.forEach(k => { out[k] = tenths[k] / 10; });
  out.reserve = HG_RESERVE_PCT;
  return out;
}
// plan = { people, mode:'total'|'each', total, each, split:{k:%, reserve:%} } (টাকা পয়সায়)
function hgPlanTotals(plan, fallbackPeople) {
  const people = Math.max(1, Math.floor(plan.people || fallbackPeople || 1));
  const total = plan.mode === 'each' ? Math.round((plan.each || 0) * people) : Math.round(plan.total || 0);
  return { people, total, each: people ? Math.round(total / people) : 0 };
}
// আসল খরচের সাথে মিলিয়ে: কোন খাতে কত যাওয়া উচিত, কোথায় বেশি, আর সতর্কবার্তার কোড
function hgPlanCalc(ev, calc, now) {
  const plan = ev.plan;
  if (!plan) return null;
  const t = hgPlanTotals(plan, ev.participants.length);
  if (!(t.total > 0)) return null;
  const keys = Object.keys(plan.split || {}).filter(k => k !== 'reserve');
  const catKeys = keys.slice();
  Object.keys(calc.catTotals).forEach(k => { if (calc.catTotals[k] > 0 && !catKeys.includes(k)) catKeys.push(k); });
  const pctOf = k => Number((plan.split || {})[k] || 0);
  const ideals = hgDist(t.total, Object.fromEntries(catKeys.concat('reserve').map(k => [k, Math.max(0, pctOf(k))])), catKeys.concat('reserve'));
  const rows = catKeys.map(k => {
    const spent = calc.catTotals[k] || 0, ideal = ideals[k] || 0;
    return { k, pct: pctOf(k), ideal, spent, left: ideal - spent, over: spent > ideal, ratio: ideal > 0 ? spent / ideal : (spent > 0 ? 2 : 0) };
  });
  const spentAll = calc.net;
  const reserveIdeal = ideals.reserve || 0;
  const remaining = t.total - spentAll;
  const flags = [];
  if (spentAll > t.total) flags.push({ code: 'over_total', amt: spentAll - t.total, perPerson: Math.ceil((spentAll - t.total) / t.people) });
  else if (spentAll > t.total * 0.85) flags.push({ code: 'near_total', amt: remaining });
  else if (remaining < reserveIdeal && spentAll > 0) flags.push({ code: 'reserve_low', amt: reserveIdeal - remaining });
  rows.forEach(r => { if (r.over) flags.push({ code: 'cat_over', k: r.k, amt: r.spent - r.ideal }); else if (r.ideal > 0 && r.ratio >= 0.85) flags.push({ code: 'cat_near', k: r.k, amt: r.left }); });
  // সময়ের সাথে খরচের গতি: অর্ধেক সময়ে অর্ধেকের বেশি বাজেট গেলে সাবধান
  let burn = null;
  if (ev.start && ev.end && ev.end > ev.start && now) {
    const s0 = Date.parse(ev.start), e0 = Date.parse(ev.end), n0 = Date.parse(now);
    if (isFinite(s0) && isFinite(e0) && n0 >= s0 && n0 <= e0) {
      const timePct = (n0 - s0) / (e0 - s0) * 100, budgetPct = spentAll / t.total * 100;
      burn = { timePct, budgetPct };
      if (budgetPct > timePct + 20 && budgetPct < 100) flags.push({ code: 'burn_fast', timePct, budgetPct });
    }
  }
  const collected = calc.inKind.contribution ? hgSum(Object.values(calc.inKind.contribution)) : 0;
  return { people: t.people, total: t.total, each: t.each, spent: spentAll, remaining, spentPerPerson: Math.round(spentAll / t.people), rows, reserveIdeal, reservePct: pctOf('reserve'), flags, burn, collected, short: Math.max(0, t.total - collected) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hgDist, hgSplit, hgBill, hgExpenseAlloc, hgEventCalc, hgSuggest, hgApplyDecisions, hgPersonStatus, hgValidate, hgMerge, toMinor, hgMoney, HG_DECISION_TYPES, hgDecisionEffect, hgPlanDefaults, hgPlanTotals, hgPlanCalc, HG_RESERVE_PCT, hgPoolCalc, hgPersonStatement };
}
