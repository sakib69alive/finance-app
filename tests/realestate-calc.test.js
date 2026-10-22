'use strict';
// node tests/realestate-calc.test.js
const assert = require('assert');
const C = require('../js/realestate-calc.js');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  - ' + name); };
const blank = () => ({ company: {}, projects: [], units: [], customers: [], contractors: [], sales: [], bookings: [], costs: [], shares: [], pays: [], web: {} });
const seed = () => { global.window = {}; return eval(require('fs').readFileSync(__dirname + '/../js/realestate-data.js', 'utf8') + ';RE_WEB_SEED'); };

t('sale price = base + parking + premium + extra − discount (matches website sales)', () => {
  assert.strictEqual(C.reSalePrice({ base: 19500000, parking: 300000, premium: 0, extra: 200000, discount: 300000 }), 19700000);
  assert.strictEqual(C.reSalePrice({ base: 42000000, parking: 400000, premium: 800000, extra: 300000, discount: 0 }), 43500000);
  assert.strictEqual(C.reSalePrice({ base: 100, discount: 500 }), 0);
});
t('split by sqft always adds up to the total (website share: 3,000,000 over 2100 + 3600 sqft)', () => {
  assert.deepStrictEqual(C.reSplit(3000000, [2100, 3600]), [1105263, 1894737]);
  assert.strictEqual(C.reSum(C.reSplit(100, [1, 1, 1])), 100);
  assert.deepStrictEqual(C.reSplit(10, [0, 0]), [5, 5]);
  assert.deepStrictEqual(C.reSplit(10, []), []);
});
t('sale state and due come from payments only; voided payments are ignored', () => {
  const re = blank(); re.sales.push({ id: 's1', price: 1000, status: 'completed' });
  assert.strictEqual(C.reSaleRow(re, re.sales[0]).state, 'unpaid');
  re.pays.push({ kind: 'sale', ref: 's1', amt: 400 }, { kind: 'sale', ref: 's1', amt: 999, void: true }, { kind: 'sale', ref: 'other', amt: 50 });
  assert.deepStrictEqual(C.reSaleRow(re, re.sales[0]), { price: 1000, paid: 400, due: 600, state: 'partial' });
  re.pays.push({ kind: 'sale', ref: 's1', amt: 600 });
  assert.strictEqual(C.reSaleRow(re, re.sales[0]).state, 'paid');
});
t('summary: cancelled and pending are not counted as paid; cash = in − out', () => {
  const re = blank();
  re.sales.push({ id: 's1', price: 1000, status: 'completed' }, { id: 's2', price: 500, status: 'cancelled' });
  re.pays.push({ kind: 'sale', ref: 's1', amt: 300 });
  re.costs.push({ amount: 200, status: 'completed' }, { amount: 100, status: 'pending' }, { amount: 900, status: 'cancelled' });
  const s = C.reSummary(re);
  assert.deepStrictEqual([s.sales.n, s.sales.total, s.sales.paid, s.sales.due], [1, 1000, 300, 700]);
  assert.deepStrictEqual([s.costs.paid, s.costs.pending], [200, 100]);
  assert.deepStrictEqual([s.cashIn, s.cashOut, s.net], [300, 200, 100]);
});
t('importing the website seed twice adds nothing the second time and keeps user edits', () => {
  const re = blank(), sd = seed();
  const a = C.reMergeSeed(re, sd);
  assert.strictEqual(a.sales, 2); assert.strictEqual(a.pays, 2);
  re.customers[0].name = 'Rahim';
  assert.deepStrictEqual(C.reMergeSeed(re, sd), {});
  assert.strictEqual(re.customers[0].name, 'Rahim');
  assert.strictEqual(re.sales.length, 2);
});
t('website seed totals: sales 63.2M, contractor 60M, share 3M with 2,494,737 collected', () => {
  const re = blank(); C.reMergeSeed(re, seed());
  const s = C.reSummary(re);
  assert.strictEqual(s.sales.total, 63200000);
  assert.strictEqual(s.costs.paid, 60000000);
  assert.deepStrictEqual([s.shares.total, s.shares.paid, s.shares.due], [3000000, 2494737, 505263]);
  assert.strictEqual(s.units.n, 4);
});
t('removing sample records clears them and their payments only', () => {
  const re = blank(); C.reMergeSeed(re, seed());
  re.customers.push({ id: 'mine', name: 'Real', sample: false });
  re.pays.push({ id: 'p9', kind: 'sale', ref: 'mine-sale', amt: 5 });
  C.reRemoveSample(re);
  assert.deepStrictEqual([re.sales.length, re.shares.length, re.units.length], [0, 0, 0]);
  assert.deepStrictEqual(re.customers.map(c => c.id), ['mine']);
  assert.deepStrictEqual(re.pays.map(p => p.id), ['p9']);
});
t('removing sample keeps a sample buyer/unit that a real sale still uses', () => {
  const re = blank(); C.reMergeSeed(re, seed());
  re.sales.push({ id: 'mine', customerId: re.customers[0].id, unitId: re.units[0].id, price: 100, status: 'completed' });
  const keepC = re.customers[0].id, keepU = re.units[0].id;
  C.reRemoveSample(re);
  assert.deepStrictEqual(re.sales.map(s => s.id), ['mine']);
  assert.deepStrictEqual(re.customers.map(c => c.id), [keepC]);
  assert.deepStrictEqual(re.units.map(u => u.id), [keepU]);
  assert.strictEqual(re.customers[0].sample, false);
  assert.strictEqual(re.projects.length, 1); // the kept unit's project stays
});

const R = (o) => Object.assign(blank(), o);
t('rule 1/2: only verified/completed/no-status counts; purchases + expenses + contractor payments', () => {
  const re = R({ costs: [{ amount: 100, status: 'verified' }, { amount: 50 }, { amount: 70, status: 'submitted' }, { amount: 9, status: 'draft' }, { amount: 8, status: 'rejected' }, { amount: 7, status: 'cancelled' }], purchases: [{ qty: 10, rate: 5, status: 'completed' }, { qty: 1, rate: 999, status: 'pending' }] });
  assert.strictEqual(C.reActualCost(re), 100 + 50 + 50);
  assert.strictEqual(C.reSummary(re).costs.pending, 79);
});
t('rule 3: budget variance, 80% warn, 100% critical, per-row threshold', () => {
  const re = R({ costs: [{ amount: 800, status: 'completed', category: 'labour' }, { amount: 500, status: 'pending', category: 'labour' }] });
  const r = C.reBudgetRow(re, { amount: 1000, category: 'labour' });
  assert.deepStrictEqual([r.actual, r.variance, r.level], [800, 200, 'warn']);
  assert.strictEqual(C.reBudgetRow(re, { amount: 1000, category: 'labour', warn: 90 }).level, 'ok');
  assert.strictEqual(C.reBudgetRow(re, { amount: 800, category: 'labour' }).level, 'critical');
});
t('rules 4-9: effective payable, outstanding, overdue, fines (flat and percent), status', () => {
  const sh = { id: 'g', due: '2026-01-10', fineType: 'percentage', fineValue: 5, parts: [{ id: 'p1', payable: 1000 }, { id: 'p2', payable: 1000 }] };
  const re = R({ shares: [sh], adjustments: [{ partId: 'p1', amt: -200 }], pays: [{ kind: 'share', ref: 'p1', amt: 300 }, { kind: 'share', ref: 'p2', amt: 1000 }] });
  const [a, b] = C.reShareRows(re, sh, '2026-02-01');
  assert.deepStrictEqual([a.eff, a.due, a.overdue, a.fine, a.totalDue, a.status], [800, 500, true, 25, 525, 'overdue']);
  assert.deepStrictEqual([b.due, b.fine, b.status], [0, 0, 'paid']);
  assert.strictEqual(C.reShareRows(re, sh, '2026-01-05')[0].status, 'partially-paid');
  assert.strictEqual(C.reShareRows(R({ pays: [] }), Object.assign({}, sh, { fineType: 'flat', fineValue: 100 }), '2026-02-01')[1].fine, 100);
  assert.strictEqual(C.reShareRows(re, Object.assign({}, sh, { due: '' }), '2026-02-01')[0].fine, 0);
  assert.strictEqual(C.reSummary(re, '2026-02-01').shares.total, 1800); // effective, not raw 2000
});
t('rule 13: goal status order', () => {
  const rows = (eff, paid) => [{ eff, paid }];
  assert.strictEqual(C.reGoalStatus({ status: 'draft' }, rows(10, 10)), 'draft');
  assert.strictEqual(C.reGoalStatus({ completed: true }, rows(10, 10)), 'completed');
  assert.strictEqual(C.reGoalStatus({}, rows(10, 10)), 'fully-funded');
  assert.strictEqual(C.reGoalStatus({}, rows(10, 3)), 'partially-funded');
  assert.strictEqual(C.reGoalStatus({ date: '2999-01-01' }, rows(10, 0), '2026-01-01'), 'upcoming');
  assert.strictEqual(C.reGoalStatus({ date: '2020-01-01' }, rows(10, 0), '2026-01-01'), 'active');
});
t('rule 10: installment plan sums to total; status paid/overdue/partial/due/upcoming', () => {
  const plan = C.reMakePlan(1000, 200, 3, '2026-01-31');
  assert.strictEqual(C.reSum(plan.map(p => p.amt)), 1000);
  assert.deepStrictEqual(plan.map(p => p.due), ['2026-01-31', '2026-02-28', '2026-03-28', '2026-04-28'].map((d, i) => (i === 2 ? '2026-03-31' : i === 3 ? '2026-04-30' : d)));
  const re = R({ sales: [{ id: 's' }], installments: [{ saleId: 's', due: '2026-01-01', amt: 100 }, { saleId: 's', due: '2026-02-01', amt: 100 }, { saleId: 's', due: '2026-02-05', amt: 100 }, { saleId: 's', due: '2026-03-01', amt: 100 }], pays: [{ kind: 'sale', ref: 's', amt: 150 }] });
  assert.deepStrictEqual(C.reInstRows(re, re.sales[0], '2026-02-03').map(r => r.status), ['paid', 'overdue', 'due', 'upcoming']);
  assert.deepStrictEqual(C.reInstRows(re, re.sales[0], '2026-01-10').map(r => r.status), ['paid', 'partially-paid', 'upcoming', 'upcoming']);
  assert.deepStrictEqual(C.reInstRows(re, re.sales[0], '2026-02-20').map(r => r.status), ['paid', 'overdue', 'overdue', 'upcoming']);
});
t('rule 14/15: non-final sales excluded; receivable = contract - valid payments', () => {
  const re = R({ customers: [{ id: 'c' }], sales: [{ id: 'a', customerId: 'c', price: 1000, status: 'completed' }, { id: 'b', customerId: 'c', price: 500, status: 'pending' }], pays: [{ kind: 'sale', ref: 'a', amt: 300 }, { kind: 'sale', ref: 'a', amt: 50, void: true }] });
  const [r] = C.reReceivables(re, '2026-01-01');
  assert.deepStrictEqual([r.contract, r.paid, r.out], [1000, 300, 700]);
  assert.strictEqual(C.reSummary(re).sales.total, 1000);
});
t('rule 16: stock = IN - OUT, low-stock alert', () => {
  const re = R({ materials: [{ id: 'm', threshold: 20 }], purchases: [{ materialId: 'm', qty: 100, rate: 1 }, { materialId: 'm', qty: 50, status: 'cancelled' }], usage: [{ materialId: 'm', qty: 85 }] });
  const [s] = C.reStock(re);
  assert.deepStrictEqual([s.have, s.low], [15, true]);
  assert.ok(C.reAlerts(re).some(a => a.kind === 'stock'));
});
t('rule 17: cash flow by month and account balance', () => {
  const re = R({ accounts: [{ id: 'a', opening: 1000 }], pays: [{ kind: 'sale', ref: 'x', amt: 500, date: '2026-01-05', accountId: 'a' }, { kind: 'sale', ref: 'x', amt: 99, date: '2026-01-06', void: true }], incomes: [{ amount: 50, date: '2026-02-01', accountId: 'a' }], costs: [{ amount: 200, date: '2026-01-09', status: 'completed', accountId: 'a' }, { amount: 77, date: '2026-01-09', status: 'draft', accountId: 'a' }] });
  assert.deepStrictEqual(C.reCashFlow(re), [{ ym: '2026-01', inn: 500, out: 200, net: 300 }, { ym: '2026-02', inn: 50, out: 0, net: 50 }]);
  assert.strictEqual(C.reAccountBalances(re)[0].balance, 1000 + 500 + 50 - 200);
});
console.log(`\n${n} tests passed`);
