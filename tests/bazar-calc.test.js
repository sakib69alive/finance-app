'use strict';
// node tests/bazar-calc.test.js
const assert = require('assert');
const C = require('../js/bazar-calc.js');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  - ' + name); };
const it = (o) => Object.assign({ id: Math.random().toString(36), name: 'চাল', cat: 'grain', qty: 5000, unit: 'কেজি', est: 7000, status: 'todo', aQty: 0, aPrice: null }, o);

t('estimated and actual item totals (5 kg, est 70, actual 75)', () => {
  const r = C.bzItemCalc(it({ status: 'done', aQty: 5000, aPrice: 7500 }));
  assert.strictEqual(r.est, 35000); assert.strictEqual(r.actual, 37500); assert.strictEqual(r.diff, 2500);
});
t('not bought and not found cost nothing; estimate is never an actual', () => {
  assert.strictEqual(C.bzItemCalc(it({ status: 'todo' })).actual, 0);
  assert.strictEqual(C.bzItemCalc(it({ status: 'na', aQty: 5000, aPrice: 7500 })).actual, 0);
  assert.strictEqual(C.bzItemCalc(it({ status: 'na' })).est, 0);
});
t('partial purchase counts only the bought quantity and compares like with like', () => {
  const r = C.bzItemCalc(it({ status: 'partial', aQty: 2000, aPrice: 7500 }));
  assert.strictEqual(r.actual, 15000); assert.strictEqual(r.diff, 1000); assert.strictEqual(r.planned, 35000);
});
t('no float drift: 0.1 kg x 0.3 and money parsing', () => {
  assert.strictEqual(C.bzMilli('0.1'), 100); assert.strictEqual(C.bzMinor('19.99'), 1999);
  assert.strictEqual(C.bzLine(C.bzMilli(3), C.bzMinor('33.33')), 9999);
});
t('market totals, budget and remaining', () => {
  const m = { budget: 200000, items: [it({ status: 'done', aQty: 5000, aPrice: 7500 }), it({ name: 'তেল', qty: 2000, unit: 'লিটার', est: 18000, status: 'todo' })], payments: [{ amt: 20000 }], catBudgets: {} };
  const c = C.bzMarketCalc(m);
  assert.strictEqual(c.estTotal, 35000 + 36000); assert.strictEqual(c.actualTotal, 37500);
  assert.strictEqual(c.remaining, 200000 - 37500); assert.strictEqual(c.done, 1); assert.strictEqual(c.todo, 1);
  assert.strictEqual(c.payable, 17500); assert.strictEqual(c.overpaid, 0);
});
t('no budget means no remaining amount', () => {
  const c = C.bzMarketCalc({ items: [], payments: [], catBudgets: {} });
  assert.strictEqual(c.budget, null); assert.strictEqual(c.remaining, null); assert.strictEqual(c.usedPct, null);
});
t('overpayment is extra, never a negative due', () => {
  const c = C.bzMarketCalc({ items: [it({ status: 'done', aQty: 1000, aPrice: 10000 })], payments: [{ amt: 15000 }], catBudgets: {} });
  assert.strictEqual(c.payable, 0); assert.strictEqual(c.overpaid, 5000);
});
t('deleted items and payments are ignored', () => {
  const c = C.bzMarketCalc({ items: [it({ status: 'done', aQty: 1000, aPrice: 10000, del: 1 })], payments: [{ amt: 5000, del: 1 }], catBudgets: {} });
  assert.strictEqual(c.actualTotal, 0); assert.strictEqual(c.paid, 0); assert.strictEqual(c.total, 0);
});
t('budget warnings: near, over, and per-category over', () => {
  const base = { payments: [], catBudgets: { grain: 10000 } };
  let c = C.bzMarketCalc(Object.assign({ budget: 40000, items: [it({ status: 'done', aQty: 5000, aPrice: 7500 })] }, base));
  assert(c.flags.some(f => f.code === 'budget_near')); assert(c.flags.some(f => f.code === 'cat_over'));
  c = C.bzMarketCalc(Object.assign({ budget: 30000, items: [it({ status: 'done', aQty: 5000, aPrice: 7500 })] }, base));
  assert(c.flags.some(f => f.code === 'budget_over' && f.amt === 7500));
});
t('stock: applying the same purchase twice adds it once; edits adjust by the difference', () => {
  const bz = { stock: [] }, m = { date: '2026-01-01', items: [it({ status: 'done', aQty: 5000, aPrice: 7500 })] };
  assert.strictEqual(C.bzApplyStock(bz, m), 1); assert.strictEqual(C.bzApplyStock(bz, m), 0);
  assert.strictEqual(bz.stock[0].qty, 5000); assert.strictEqual(bz.stock[0].lastPrice, 7500);
  m.items[0].aQty = 4000; C.bzApplyStock(bz, m); assert.strictEqual(bz.stock[0].qty, 4000);
  m.items[0].status = 'todo'; C.bzApplyStock(bz, m); assert.strictEqual(bz.stock[0].qty, 0);
});
t('stock: only already-linked items follow edits when auto-stock is off', () => {
  const bz = { stock: [] }, m = { date: '2026-01-01', items: [it({ status: 'done', aQty: 1000, aPrice: 5000 })] };
  C.bzApplyStock(bz, m, true); assert.strictEqual(bz.stock.length, 0);
});
t('stock: reversing a deleted market removes only what it added and never goes below zero', () => {
  const bz = { stock: [] }, m = { date: '2026-01-01', items: [it({ status: 'done', aQty: 3000, aPrice: 5000 })] };
  C.bzApplyStock(bz, m); bz.stock[0].qty = 1000; C.bzReverseStock(bz, m);
  assert.strictEqual(bz.stock[0].qty, 0); assert.strictEqual(m.items[0].stockedQty, 0);
});
t('low stock at or below the minimum', () => {
  const bz = { stock: [{ name: 'a', unit: 'kg', qty: 500, min: 1000 }, { name: 'b', unit: 'kg', qty: 5000, min: 1000 }, { name: 'c', unit: 'kg', qty: 0, min: 0 }, { name: 'd', unit: 'kg', qty: 1000, min: 1000, del: 1 }] };
  assert.deepStrictEqual(C.bzLowStock(bz).map(s => s.name), ['a']);
});
t('price history compares only the same name and unit, in date order', () => {
  const mk = (id, date, p, unit) => ({ id, name: id, date, createdAt: Date.parse(date), status: 'done', items: [it({ name: 'তেল', unit, status: 'done', aQty: 1000, aPrice: p })] });
  const bz = { markets: [mk('m1', '2026-01-01', 17000, 'লিটার'), mk('m2', '2026-02-01', 18000, 'lit'.replace('lit', 'লিটার')), mk('m3', '2026-03-01', 9000, 'বোতল')] };
  const ent = C.bzPriceEntries(bz), cur = bz.markets[1], item = cur.items[0];
  const p = C.bzItemPrices(ent, cur, item);
  assert.strictEqual(p.cur, 18000); assert.strictEqual(p.prev.price, 17000); assert.strictEqual(p.diff, 1000);
  assert.strictEqual(C.bzItemPrices(ent, bz.markets[2], bz.markets[2].items[0]).prev, null);
  assert.strictEqual(C.bzUnitKey('কেজি'), C.bzUnitKey('kg'));
});
t('cancelled and deleted markets are left out of price history and reports', () => {
  const m = { id: 'x', name: 'x', date: '2026-02-02', createdAt: 1, status: 'cancelled', items: [it({ status: 'done', aQty: 1000, aPrice: 9000 })], payments: [], catBudgets: {} };
  assert.strictEqual(C.bzPriceEntries({ markets: [m] }).length, 0);
  assert.strictEqual(C.bzReport({ markets: [m] }, '2026-02-10').hasData, false);
});
t('report: month vs last month, category insight, week starts on Saturday', () => {
  const mk = (id, date, grain, veg) => ({ id, name: id, date, createdAt: Date.parse(date), status: 'done', catBudgets: {}, payments: [], items: [it({ cat: 'grain', status: 'done', aQty: 1000, aPrice: grain }), it({ name: 'আলু', cat: 'veg', unit: 'কেজি', status: 'done', aQty: 1000, aPrice: veg })] });
  const r = C.bzReport({ markets: [mk('a', '2026-01-10', 10000, 5000), mk('b', '2026-02-05', 10000, 7000)] }, '2026-02-10');
  assert.strictEqual(r.thisMonth, 17000); assert.strictEqual(r.lastMonth, 15000); assert(r.hasPrev);
  assert.deepStrictEqual(r.insights.map(i => [i.code, i.k, i.amt]), [['cat_up', 'veg', 2000]]);
  assert.strictEqual(C.bzWeekStart('2026-02-10'), '2026-02-07'); assert.strictEqual(C.bzWeekStart('2026-02-07'), '2026-02-07');
});
t('report: no data means no claims', () => {
  const r = C.bzReport({ markets: [] }, '2026-02-10');
  assert.strictEqual(r.hasData, false); assert.strictEqual(r.insights.length, 0); assert.strictEqual(r.hasPrev, false);
});
t('template text parses name | qty | unit | price', () => {
  const x = C.bzParseTemplate('চাল | 5 | কেজি | 70\n\nতেল | 2 | লিটার\nডিম');
  assert.deepStrictEqual(x.map(i => [i.name, i.qty, i.unit, i.est]), [['চাল', 5000, 'কেজি', 7000], ['তেল', 2000, 'লিটার', 0], ['ডিম', 1000, '', 0]]);
});
t('discount is shared in proportion to the real cost, to the last paisa, and never exceeds the bill', () => {
  assert.deepStrictEqual(C.bzAllocDiscount([10000, 20000, 0], 1000), [333, 667, 0]); assert.strictEqual(C.bzAllocDiscount([5000, 5000], 99999).reduce((a, b) => a + b, 0), 10000);
  assert.deepStrictEqual(C.bzAllocDiscount([100], 0), [0]);
  const m = { discount: 3000, payments: [], catBudgets: {}, items: [it({ status: 'done', aQty: 5000, aPrice: 7500 }), it({ name: 'তেল', cat: 'oil', status: 'done', aQty: 1000, aPrice: 18000 })] };
  const c = C.bzMarketCalc(m); assert.strictEqual(c.gross, 55500); assert.strictEqual(c.actualTotal, 52500); assert.strictEqual(c.discount, 3000); assert.strictEqual(c.rows.reduce((a, r) => a + r.net, 0), 52500);
});
t('prices remember the shop (item shop first, then the market shop) for shop-to-shop comparison', () => {
  const m = { id: 'a', name: 'a', date: '2026-02-01', createdAt: 1, status: 'done', shop: 'Big Store', items: [it({ name: 'ডিম', unit: 'ডজন', status: 'done', aQty: 1000, aPrice: 14000, shop: 'Corner' }), it({ name: 'চিনি', status: 'done', aQty: 1000, aPrice: 12000 })] };
  assert.deepStrictEqual(C.bzPriceEntries({ markets: [m] }).map(e => [e.name, e.shop]), [['ডিম', 'Corner'], ['চিনি', 'Big Store']]);
});
console.log(n + ' tests passed');
