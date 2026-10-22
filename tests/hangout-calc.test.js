'use strict';
// চালান: node tests/hangout-calc.test.js
const assert = require('assert');
const C = require('../js/hangout-calc.js');
const { hgDist, hgSplit, hgBill, hgEventCalc, hgSuggest, hgValidate, hgMerge, toMinor } = C;
const T = x => x * 100; // টাকা -> পয়সা
let passed = 0;
const t = (name, fn) => { try { fn(); passed++; console.log('ok  -', name); } catch (e) { console.error('FAIL -', name, '\n   ', e.message); process.exitCode = 1; } };
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

const mkEv = (names, extra = {}) => Object.assign({
  id: 'ev1', name: 'T', participants: names.map(n => ({ id: n, name: n, active: true })),
  expenses: [], transfers: [], refunds: [], decisions: [],
}, extra);
const exp = (id, total, payers, method = 'equal', spec = {}, category = 'food') => ({ id, title: id, category, total, payers, method, spec, mode: 'split' });

t('rounding: 100 taka by 3 keeps every poisha', () => {
  const r = hgDist(T(100), { a: 1, b: 1, c: 1 }, ['a', 'b', 'c']);
  assert.strictEqual(sum(r), T(100)); assert.deepStrictEqual(Object.values(r).sort(), [3333, 3333, 3334]);
});
t('toMinor handles decimals without float error', () => {
  assert.strictEqual(toMinor('0.1') + toMinor('0.2'), 30); assert.strictEqual(toMinor('1999.99'), 199999);
});
t('equal / selected split', () => {
  const r = hgSplit(T(900), 'selected', ['a', 'b', 'c'], { incl: ['a', 'c'] });
  assert.ok(r.ok); assert.deepStrictEqual(r.alloc, { a: T(450), b: 0, c: T(450) });
  assert.strictEqual(hgSplit(T(10), 'equal', ['a'], { incl: [] }).error.code, 'no_participants');
});
t('exact split validates sum and negatives', () => {
  assert.ok(hgSplit(T(100), 'exact', ['a', 'b'], { values: { a: T(60), b: T(40) } }).ok);
  assert.strictEqual(hgSplit(T(100), 'exact', ['a', 'b'], { values: { a: T(60), b: T(30) } }).error.code, 'sum_mismatch');
  assert.strictEqual(hgSplit(T(100), 'exact', ['a', 'b'], { values: { a: T(-10), b: T(110) } }).error.code, 'negative');
});
t('percent split: 50/30/20 and invalid sum', () => {
  const r = hgSplit(T(1000), 'percent', ['a', 'b', 'c'], { values: { a: 50, b: 30, c: 20 } });
  assert.deepStrictEqual(r.alloc, { a: T(500), b: T(300), c: T(200) });
  assert.strictEqual(hgSplit(T(1000), 'percent', ['a', 'b'], { values: { a: 50, b: 30 } }).error.code, 'percent_sum');
  assert.strictEqual(hgSplit(T(1000), 'percent', ['a', 'b'], { values: { a: -5, b: 105 } }).error.code, 'invalid_percent');
});
t('ratio split 2:1:1 and empty ratio', () => {
  const r = hgSplit(T(400), 'ratio', ['a', 'b', 'c'], { values: { a: 2, b: 1, c: 1 } });
  assert.deepStrictEqual(r.alloc, { a: T(200), b: T(100), c: T(100) });
  assert.strictEqual(hgSplit(T(400), 'ratio', ['a'], { values: {} }).error.code, 'ratio_empty');
});

t('restaurant: spec example Burger 350 + Pasta 450 + shared Pizza 600', () => {
  const ids = ['s', 'a', 'b'];
  const b = hgBill({ items: [
    { id: 'i1', unit: T(350), qty: 1, type: 'individual', orderedBy: 's' },
    { id: 'i2', unit: T(450), qty: 1, type: 'individual', orderedBy: 'a' },
    { id: 'i3', unit: T(600), qty: 1, type: 'shared', sharers: ['s', 'a', 'b'] },
  ] }, ids);
  assert.ok(b.ok); assert.deepStrictEqual(b.perPerson, { s: T(550), a: T(650), b: T(200) }); assert.strictEqual(b.total, T(1400));
});
t('restaurant: quantity, cancelled item excluded', () => {
  const b = hgBill({ items: [
    { id: 'i1', unit: T(100), qty: 3, type: 'individual', orderedBy: 'a' },
    { id: 'i2', unit: T(999), qty: 1, type: 'individual', orderedBy: 'b', status: 'cancelled' },
  ] }, ['a', 'b']);
  assert.strictEqual(b.total, T(300)); assert.strictEqual(b.perPerson.b, 0);
});
t('restaurant: discount then VAT + service (proportional, per-charge kept, sums match)', () => {
  const ids = ['a', 'b', 'c'];
  const b = hgBill({
    items: [
      { id: 'i1', unit: T(1000), qty: 1, type: 'individual', orderedBy: 'a' },
      { id: 'i2', unit: T(500), qty: 1, type: 'individual', orderedBy: 'b' },
      { id: 'i3', unit: T(500), qty: 1, type: 'shared', sharers: ['b', 'c'] },
    ],
    charges: [
      { id: 'd', kind: 'discount', name: 'Disc', amt: T(200), method: 'proportional' },
      { id: 'v', kind: 'charge', name: 'VAT', amt: T(150), method: 'proportional' },
      { id: 's', kind: 'charge', name: 'Service', amt: T(100), method: 'equal' },
    ],
  }, ids);
  assert.ok(b.ok, JSON.stringify(b.errors));
  assert.strictEqual(b.total, T(2000) - T(200) + T(250));
  assert.strictEqual(sum(b.perPerson), b.total);
  assert.strictEqual(sum(b.chargeAlloc.v), T(150)); assert.strictEqual(sum(b.chargeAlloc.s), T(100));
  // ডিসকাউন্ট দ্বিতীয়বার প্রয়োগ হয়নি
  assert.strictEqual(b.subtotal - b.discountTotal + b.chargeTotal, b.total);
});
t('restaurant: shared item without sharers and discount larger than base are errors', () => {
  assert.ok(!hgBill({ items: [{ id: 'i', unit: T(10), qty: 1, type: 'shared', sharers: [] }] }, ['a']).ok);
  const b = hgBill({ items: [{ id: 'i', unit: T(100), qty: 1, type: 'individual', orderedBy: 'a' }], charges: [{ id: 'd', kind: 'discount', amt: T(150), method: 'equal' }] }, ['a', 'b']);
  assert.ok(!b.ok);
});

t('event: multiple payers (2000 = 1200 + 800) equal split, balances sum to zero', () => {
  const ev = mkEv(['s', 'a']);
  ev.expenses.push(exp('e1', T(2000), [{ pid: 's', amt: T(1200) }, { pid: 'a', amt: T(800) }], 'equal', { incl: ['s', 'a'] }));
  const c = hgEventCalc(ev);
  assert.deepStrictEqual(c.base, { s: T(200), a: T(-200) });
  assert.strictEqual(sum(c.base), 0); assert.ok(c.balanced); assert.deepStrictEqual(c.issues, []);
  assert.deepStrictEqual(c.suggestions, [{ from: 'a', to: 's', amt: T(200) }]);
});
t('event: payers total mismatch is reported (not silently accepted)', () => {
  const ev = mkEv(['s', 'a']);
  ev.expenses.push(exp('e1', T(2000), [{ pid: 's', amt: T(1200) }], 'equal', { incl: ['s', 'a'] }));
  assert.ok(hgEventCalc(ev).issues.some(i => i.code === 'payers_mismatch'));
});
t('event: non-participants carry none of an expense', () => {
  const ev = mkEv(['s', 'a', 'b']);
  ev.expenses.push(exp('e1', T(300), [{ pid: 's', amt: T(300) }], 'selected', { incl: ['s', 'a'] }));
  const c = hgEventCalc(ev);
  assert.strictEqual(c.share.b, 0); assert.strictEqual(c.share.s, T(150));
});
t('event: refund lowers expense, shares reduce proportionally, receiver credited, never counted as income', () => {
  const ev = mkEv(['s', 'a']);
  ev.expenses.push(exp('e1', T(1000), [{ pid: 's', amt: T(1000) }], 'equal', { incl: ['s', 'a'] }));
  ev.refunds.push({ id: 'r1', expenseId: 'e1', amt: T(200), by: 's' });
  const c = hgEventCalc(ev);
  assert.strictEqual(c.gross, T(1000)); assert.strictEqual(c.refundTotal, T(200)); assert.strictEqual(c.net, T(800));
  assert.deepStrictEqual(c.share, { s: T(400), a: T(400) });
  assert.deepStrictEqual(c.base, { s: T(1000) - T(200) - T(400), a: T(-400) });
  assert.ok(c.balanced);
});
t('event: advance, contribution and settlement are transfers, not expenses', () => {
  const ev = mkEv(['s', 'a']);
  ev.expenses.push(exp('e1', T(1000), [{ pid: 's', amt: T(1000) }], 'equal', { incl: ['s', 'a'] }));
  ev.transfers.push({ id: 't1', kind: 'advance', from: 'a', to: 's', amt: T(200) });
  ev.transfers.push({ id: 't2', kind: 'settlement', from: 'a', to: 's', amt: T(100) });
  const c = hgEventCalc(ev);
  assert.strictEqual(c.gross, T(1000)); assert.strictEqual(c.net, T(1000));
  assert.deepStrictEqual(c.pre, { s: T(500) - T(300), a: T(-500) + T(300) });
  assert.ok(c.balanced);
});
t('event: partial payment leaves the right amount and full payment settles', () => {
  const ev = mkEv(['s', 'a']);
  ev.expenses.push(exp('e1', T(1000), [{ pid: 's', amt: T(1000) }], 'equal', { incl: ['s', 'a'] }));
  ev.transfers.push({ id: 't1', kind: 'settlement', from: 'a', to: 's', amt: T(200) });
  let c = hgEventCalc(ev);
  assert.strictEqual(c.final.a, T(-300)); assert.strictEqual(hgSuggest(c.final)[0].amt, T(300));
  ev.transfers.push({ id: 't2', kind: 'settlement', from: 'a', to: 's', amt: T(300) });
  c = hgEventCalc(ev); assert.strictEqual(c.final.a, 0); assert.strictEqual(c.final.s, 0);
});
t('event: soft-deleted expense/transfer are ignored', () => {
  const ev = mkEv(['s', 'a']);
  ev.expenses.push(Object.assign(exp('e1', T(1000), [{ pid: 's', amt: T(1000) }], 'equal', { incl: ['s', 'a'] }), { del: 1 }));
  assert.strictEqual(hgEventCalc(ev).gross, 0);
});
t('event: edited participant set makes an exact split "needs review" instead of silently wrong', () => {
  const ev = mkEv(['s', 'a']);
  const e = exp('e1', T(100), [{ pid: 's', amt: T(100) }], 'exact', { values: { s: T(60), a: T(40) } });
  e.alloc = { s: T(60), a: T(40) }; ev.expenses.push(e);
  assert.deepStrictEqual(hgEventCalc(ev).issues, []);
  e.total = T(120);
  const c = hgEventCalc(ev);
  assert.ok(c.issues.some(i => i.code === 'needs_review'));
});
t('integrity: 3 people, uneven split with rounding stays zero-sum', () => {
  const ev = mkEv(['a', 'b', 'c']);
  ev.expenses.push(exp('e1', 10001, [{ pid: 'a', amt: 10001 }], 'equal', { incl: ['a', 'b', 'c'] }));
  const c = hgEventCalc(ev);
  assert.strictEqual(sum(c.share), 10001); assert.ok(c.balanced);
});
t('suggestions never create a wrong balance and use at most n-1 transfers', () => {
  const f = { a: 700, b: 300, c: -400, d: -350, e: -250 };
  const s = hgSuggest(f); const net = Object.assign({}, f);
  s.forEach(x => { net[x.from] += x.amt; net[x.to] -= x.amt; });
  assert.ok(Object.values(net).every(v => v === 0)); assert.ok(s.length <= 4);
});

// ---- সমঝোতা / Waiver ----
const base800 = () => { // a কে ৮০০ পাওনা, b কে ৪০০ দিতে হবে, c কে ৪০০
  const ev = mkEv(['a', 'b', 'c']);
  ev.expenses.push(exp('e1', T(1200), [{ pid: 'a', amt: T(1200) }], 'exact', { values: { a: T(400), b: T(400), c: T(400) } }));
  return ev;
};
const dec = (o) => Object.assign({ id: 'd' + Math.random(), status: 'finalized', createdAt: 1, finalizedAt: 1 }, o);
t('decision: only Finalized changes balances (Proposed/Disputed do not)', () => {
  const ev = base800();
  ev.decisions.push(dec({ pid: 'a', side: 'receivable', type: 'waive_partial', amt: T(300), status: 'proposed' }));
  ev.decisions.push(dec({ pid: 'b', side: 'payable', type: 'waive_all', amt: null, status: 'disputed' }));
  const c = hgEventCalc(ev);
  assert.strictEqual(c.final.a, T(800)); assert.strictEqual(c.final.b, T(-400));
});
t('decision: spec example — receivable 800, waive 300, remaining 500, original kept', () => {
  const ev = base800();
  ev.decisions.push(dec({ pid: 'a', side: 'receivable', type: 'waive_partial', amt: T(300) }));
  const c = hgEventCalc(ev);
  assert.strictEqual(c.base.a, T(800)); assert.strictEqual(c.waivedBy.a, T(300)); assert.strictEqual(c.final.a, T(500));
  assert.strictEqual(sum(c.final), 0);
  assert.strictEqual(sum(c.waivedFor), T(300)); // মওকুফ পেয়েছে দেনাদাররা, পেমেন্ট হিসেবে গণ্য হয়নি
  assert.strictEqual(sum(c.out), 0); assert.strictEqual(sum(c.inn), 0);
  assert.strictEqual(c.gross, T(1200)); // নতুন খরচ হয়নি
});
t('decision: spec example — b owes 400, waived entirely, remaining 0, marked waived not paid', () => {
  const ev = base800();
  ev.decisions.push(dec({ pid: 'b', side: 'payable', type: 'waive_all', amt: null }));
  const c = hgEventCalc(ev);
  assert.strictEqual(c.base.b, T(-400)); assert.strictEqual(c.waivedFor.b, T(400)); assert.strictEqual(c.final.b, 0);
  assert.strictEqual(c.out.b, 0); assert.strictEqual(c.final.a, T(400)); assert.strictEqual(sum(c.final), 0);
  assert.strictEqual(C.hgPersonStatus(ev, c, 'b'), 'waived');
});
t('decision: a finalized waiver is applied exactly once and capped at what is left', () => {
  const ev = base800();
  const d = dec({ pid: 'b', side: 'payable', type: 'waive_partial', amt: T(900) }); // দেনার চেয়ে বেশি লেখা
  ev.decisions.push(d);
  let c = hgEventCalc(ev);
  assert.strictEqual(c.waivedFor.b, T(400)); assert.strictEqual(c.final.b, 0);
  c = hgEventCalc(ev); assert.strictEqual(c.waivedFor.b, T(400)); // আবার হিসাব করলেও দ্বিগুণ নয়
  assert.strictEqual(c.applied.filter(x => x.id === d.id).length, 1);
});
t('decision: cancelling a decision restores the original balance and history can be re-read', () => {
  const ev = base800();
  const d = dec({ pid: 'a', side: 'receivable', type: 'waive_partial', amt: T(300) });
  ev.decisions.push(d); d.status = 'cancelled';
  assert.strictEqual(hgEventCalc(ev).final.a, T(800));
});
t('decision: Another person covers (X pays part of D debt)', () => {
  const ev = base800();
  ev.decisions.push(dec({ pid: 'b', side: 'payable', type: 'cover', amt: T(150), others: ['c'] }));
  const c = hgEventCalc(ev);
  assert.strictEqual(c.final.b, T(-250)); assert.strictEqual(c.final.c, T(-550)); assert.strictEqual(sum(c.final), 0);
});
t('decision: gift/no need to return keeps history (original, waived, remaining)', () => {
  const ev = base800();
  ev.decisions.push(dec({ pid: 'a', side: 'receivable', type: 'gift', amt: null }));
  const c = hgEventCalc(ev);
  assert.strictEqual(c.base.a, T(800)); assert.strictEqual(c.waivedBy.a, T(800)); assert.strictEqual(c.final.a, 0); assert.strictEqual(sum(c.final), 0);
});
t('decision: others share an extra cost the creditor carried', () => {
  const ev = base800();
  ev.decisions.push(dec({ pid: 'a', side: 'receivable', type: 'share', amt: T(100), others: ['b', 'c'] }));
  const c = hgEventCalc(ev);
  assert.strictEqual(c.final.a, T(900)); assert.strictEqual(c.final.b, T(-450)); assert.strictEqual(sum(c.final), 0);
});
t('decision: record-only types never move money (full payment required / pending / disputed)', () => {
  const ev = base800();
  ['full_required', 'pending', 'partial_agreement'].forEach(type => ev.decisions.push(dec({ pid: 'b', side: 'payable', type, amt: T(100) })));
  assert.strictEqual(hgEventCalc(ev).final.b, T(-400));
});
t('decision: waiver after a partial payment only waives the remaining due', () => {
  const ev = base800();
  ev.transfers.push({ id: 't', kind: 'settlement', from: 'b', to: 'a', amt: T(150) });
  ev.decisions.push(dec({ pid: 'b', side: 'payable', type: 'waive_all', amt: null }));
  const c = hgEventCalc(ev);
  assert.strictEqual(c.waivedFor.b, T(250)); assert.strictEqual(c.final.b, 0); assert.strictEqual(sum(c.final), 0);
});
t('status labels', () => {
  const ev = base800();
  let c = hgEventCalc(ev);
  assert.strictEqual(C.hgPersonStatus(ev, c, 'b'), 'pending'); assert.strictEqual(C.hgPersonStatus(ev, c, 'a'), 'overpaid');
  ev.transfers.push({ id: 't', kind: 'settlement', from: 'b', to: 'a', amt: T(100) });
  c = hgEventCalc(ev); assert.strictEqual(C.hgPersonStatus(ev, c, 'b'), 'partial');
  ev.decisions.push(dec({ pid: 'b', side: 'payable', type: 'disputed', status: 'disputed' }));
  assert.strictEqual(C.hgPersonStatus(ev, hgEventCalc(ev), 'b'), 'disputed');
});

// ---- ব্যাকআপ ----
const sample = () => ({ schema: 1, friends: [{ id: 'f1', name: 'A' }], events: [Object.assign(mkEv(['a', 'b']), { expenses: [exp('e1', T(10), [{ pid: 'a', amt: T(10) }])] })] });
t('backup validation accepts good data and rejects corrupted data', () => {
  assert.ok(hgValidate(sample()).ok);
  assert.ok(!hgValidate(null).ok); assert.ok(!hgValidate({ schema: 99, events: [], friends: [] }).ok);
  const bad = sample(); bad.events[0].expenses[0].total = 'abc'; assert.ok(!hgValidate(bad).ok);
  const bad2 = sample(); bad2.events[0].transfers = [{ id: 't', from: 'zzz', to: 'a', amt: 5 }]; assert.ok(!hgValidate(bad2).ok);
  const bad3 = sample(); bad3.events.push(bad3.events[0]); assert.ok(!hgValidate(bad3).ok);
});
t('importing the same backup twice does not duplicate events', () => {
  const cur = sample(); const inc = sample();
  const m = hgMerge(cur, inc); assert.strictEqual(m.events.length, 1); assert.strictEqual(m.skipped, 1);
  inc.events[0].id = 'ev2'; const m2 = hgMerge(cur, inc); assert.strictEqual(m2.events.length, 2); assert.strictEqual(m2.added, 1);
});

console.log(`\n${passed} tests passed`);
