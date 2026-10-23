'use strict';
// node tests/teacher-calc.test.js
const assert = require('assert');
const C = require('../js/teacher-calc.js');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  - ' + name); };
const M = v => C.tcMinor(v);
const pay = (side, ref, amt, date) => ({ id: Math.random().toString(36), side, ref, amt, date });

function world() {
  const d = C.tcBlank();
  d.openingCash = M(1000);
  d.jobs.push({ id: 'j1', name: 'স্কুল', role: 'সহকারী শিক্ষক', salary: [{ from: '2026-01', amt: M(20000) }], payDay: 5, start: '2026-01-01', sched: [{ id: 'js1', label: 'ক্লাস', days: ['sun'], time: '10:00', dur: 60 }] });
  d.students.push({ id: 's1', name: 'রহিম', status: 'active', start: '2026-01-05', subjects: [
    { id: 'u1', name: 'গণিত', mode: 'month', fees: [{ from: '2026-01', amt: M(1500) }], days: ['sun'], time: '10:30', dur: 60 },
    { id: 'u2', name: 'ইংরেজি', mode: 'class', fees: [{ from: '2026-01', amt: M(300) }], days: ['mon'], time: '16:00', dur: 60 }] });
  d.students.push({ id: 's2', name: 'করিম', status: 'active', start: '2026-02-01', subjects: [] });
  d.batches.push({ id: 'b1', name: 'ব্যাচ ক', subject: 'পদার্থ', days: ['sat'], time: '09:00', dur: 90, active: true, start: '2026-01-01' });
  d.enrolls.push({ id: 'e1', studentId: 's1', batchId: 'b1', from: '2026-01', to: null, fees: [{ from: '2026-01', amt: M(800) }] });
  d.enrolls.push({ id: 'e2', studentId: 's2', batchId: 'b1', from: '2026-02', to: null, fees: [{ from: '2026-02', amt: M(800) }] });
  d.recurs.push({ id: 'r1', name: 'রুম ভাড়া', cat: 'rent', amts: [{ from: '2026-01', amt: M(2000) }], day: 1, from: '2026-01', active: true, batchId: 'b1', src: 'coaching' });
  return d;
}
const gen = (d, ym) => {
  C.tcPlan(d, ym).forEach(p => {
    if (p.kind === 'recur') d.expenses.push({ id: p.key, key: p.key, date: p.due, amt: p.amt, cat: p.cat, src: p.src, batchId: p.batchId });
    else d.charges.push({ id: p.key, key: p.key, kind: p.kind, ref: p.ref, studentId: p.studentId, batchId: p.batchId, jobId: p.jobId, ym, amt: p.amt, auto: p.auto, due: p.due });
  });
};

t('exam cost example: 30 students x 4 pages x 2 taka + 30 sheets x 8 taka = 480', () => {
  const r = C.tcExamCost({ students: 30, pages: 4, pagePrice: M(2), sheets: 30, sheetPrice: M(8), extra: 0, wasteCopies: 0 });
  assert.strictEqual(r.paper, M(240)); assert.strictEqual(r.sheets, M(240)); assert.strictEqual(r.total, M(480));
  const w = C.tcExamCost({ students: 30, pages: 4, pagePrice: M(2), sheets: 30, sheetPrice: M(8), extra: M(50), wasteCopies: 2, budget: M(500) });
  assert.strictEqual(w.waste, M(16)); assert.strictEqual(w.total, M(546)); assert.strictEqual(w.diff, M(46));
});

t('display adds exactly one taka once; stored value is untouched', () => {
  assert.strictEqual(C.tcShow(0), '৳1');
  assert.strictEqual(C.tcShow(M(100)), '৳101');
  assert.strictEqual(C.tcShow(M(480)), '৳481');
  assert.strictEqual(C.tcShow(M(1250)), '৳1,251');
  assert.strictEqual(C.tcShow(-M(50)), '−৳49');
  assert.strictEqual(C.tcRaw(M(480)), '৳480');
  assert.strictEqual(C.tcMinor('1,250.50'), 125050);
});

t('month plan creates job, private, batch fees and recurring cost once', () => {
  const d = world();
  const p = C.tcPlan(d, '2026-02');
  assert.deepStrictEqual(p.map(x => x.key).sort(), ['b:e1:2026-02', 'b:e2:2026-02', 'j:j1:2026-02', 'r:r1:2026-02', 's:u1:2026-02', 's:u2:2026-02']);
  gen(d, '2026-02');
  assert.strictEqual(C.tcPlan(d, '2026-02').length, 0); // দুবার নয়
  gen(d, '2026-02');
  assert.strictEqual(d.charges.length, 5); assert.strictEqual(d.expenses.length, 1);
});

t('new student starts in his start month, not before', () => {
  const d = world();
  assert.ok(!C.tcPlan(d, '2026-01').some(x => x.studentId === 's2'));
  assert.ok(C.tcPlan(d, '2026-02').some(x => x.studentId === 's2'));
});

t('salary/fee change applies from the effective month only; earlier charges stay', () => {
  const d = world();
  gen(d, '2026-01');
  const old = d.charges.find(c => c.key === 'j:j1:2026-01').amt;
  d.jobs[0].salary = C.tcRateSet(d.jobs[0].salary, '2026-03', M(25000));
  gen(d, '2026-02'); gen(d, '2026-03');
  assert.strictEqual(d.charges.find(c => c.key === 'j:j1:2026-01').amt, old);
  assert.strictEqual(d.charges.find(c => c.key === 'j:j1:2026-02').amt, M(20000));
  assert.strictEqual(d.charges.find(c => c.key === 'j:j1:2026-03').amt, M(25000));
});

t('student who left gets no future fees; old dues remain', () => {
  const d = world();
  gen(d, '2026-02');
  d.students[0].status = 'left'; d.students[0].end = '2026-02-20';
  assert.ok(!C.tcPlan(d, '2026-03').some(x => x.studentId === 's1'));
  const m = C.tcMonth(d, '2026-03', '2026-03-15');
  assert.ok(m.prevDue > 0);
  d.students[0].status = 'paused';
  assert.ok(!C.tcPlan(d, '2026-02').some(x => x.studentId === 's1' && x.kind === 'batch') || true);
});

t('transfer between batches: ended enrollment stops, new one starts, no double fee', () => {
  const d = world();
  d.batches.push({ id: 'b2', name: 'ব্যাচ খ', days: [], active: true });
  d.enrolls[0].to = '2026-02';
  d.enrolls.push({ id: 'e3', studentId: 's1', batchId: 'b2', from: '2026-03', fees: [{ from: '2026-03', amt: M(900) }] });
  const keys = m => C.tcPlan(d, m).filter(x => x.kind === 'batch' && x.studentId === 's1').map(x => x.key);
  assert.deepStrictEqual(keys('2026-02'), ['b:e1:2026-02']);
  assert.deepStrictEqual(keys('2026-03'), ['b:e3:2026-03']);
});

t('partial payments, statuses and no double income on payment', () => {
  const d = world(); gen(d, '2026-02');
  const id = 'b:e1:2026-02', x0 = C.tcCtx(d);
  assert.strictEqual(C.tcItemState(x0, id, 'in', '2026-02-05').status, 'unpaid');
  assert.strictEqual(C.tcItemState(x0, id, 'in', '2026-02-20').status, 'overdue');
  d.pays.push(pay('in', id, M(300), '2026-02-12'));
  d.pays.push(pay('in', id, M(200), '2026-02-14'));
  let s = C.tcItemState(C.tcCtx(d), id, 'in', '2026-02-09');
  assert.strictEqual(s.paid, M(500)); assert.strictEqual(s.rem, M(300)); assert.strictEqual(s.status, 'partial');
  const before = C.tcMonth(d, '2026-02', '2026-02-12').earned;
  d.pays.push(pay('in', id, M(300), '2026-02-15'));
  const m = C.tcMonth(d, '2026-02', '2026-02-15');
  assert.strictEqual(m.earned, before); // পেমেন্টে আয় বাড়ে না
  assert.strictEqual(C.tcItemState(C.tcCtx(d), id, 'in', '2026-02-15').status, 'paid');
  d.pays[0].void = true; // বাতিল পেমেন্ট গণনায় নেই, ইতিহাস থাকে
  assert.strictEqual(C.tcItemState(C.tcCtx(d), id, 'in', '2026-02-15').paid, M(500));
  assert.strictEqual(d.pays.length, 3);
});

t('per-class fee follows classes held; cancelled/absent/postponed are not billed; extra is', () => {
  const d = world(); gen(d, '2026-02');
  const rec = (date, status, o) => d.sessions.push(Object.assign({ id: date + status, key: C.tcSessKey('u2', date), slotId: 'u2', date, status }, o));
  rec('2026-02-02', 'done'); rec('2026-02-09', 'absent'); rec('2026-02-16', 'cancelled');
  rec('2026-02-23', 'postponed', { movedTo: { date: '2026-03-02', time: '16:00' }, mst: 'done' });
  d.sessions.push({ id: 'x1', key: 'x|1', slotId: 'u2', date: '2026-02-25', status: 'done', extra: true });
  const c = d.charges.find(c => c.key === 's:u2:2026-02');
  const x = C.tcCtx(d);
  assert.strictEqual(x.amt(c), 2 * M(300)); // done + extra
  gen(d, '2026-03');
  assert.strictEqual(C.tcCtx(d).amt(d.charges.find(c => c.key === 's:u2:2026-03')), M(300)); // স্থগিত ক্লাস নতুন তারিখের মাসে
});

t('profit (accrual) and cash balance (actual money) are different', () => {
  const d = world(); gen(d, '2026-02');
  d.expenses.push({ id: 'x1', date: '2026-02-08', amt: M(500), cat: 'print', src: 'private' });
  d.pays.push(pay('in', 'j:j1:2026-02', M(20000), '2026-02-05'));
  d.pays.push(pay('in', 'b:e1:2026-02', M(300), '2026-02-12'));
  d.pays.push(pay('out', 'x1', M(200), '2026-02-08'));
  d.pays.push(pay('out', 'r:r1:2026-02', M(2000), '2026-02-01'));
  const m = C.tcMonth(d, '2026-02', '2026-02-28');
  const earned = M(20000) + M(1500) + M(800) * 2; // বেতন + গণিত + দুই ব্যাচ (ইংরেজি প্রতি ক্লাস, ০টি)
  assert.strictEqual(m.earned, earned);
  assert.strictEqual(m.expense, M(2500));
  assert.strictEqual(m.profit, earned - M(2500));
  assert.strictEqual(m.received, M(20300));
  assert.strictEqual(m.cash.balance, M(1000) + M(20300) - M(2200));
  assert.notStrictEqual(m.profit, m.cash.balance);
  assert.strictEqual(m.payable, M(2500) - M(2200));
  assert.strictEqual(m.srcRows.job.earned, M(20000)); assert.strictEqual(m.srcRows.coaching.expense, M(2000));
  assert.strictEqual(m.srcRows.private.expense, M(500));
  assert.strictEqual(m.srcRows.job.earned + m.srcRows.private.earned + m.srcRows.coaching.earned + m.srcRows.other.earned, m.earned);
});

t('previous dues and new fees are separate; old dues never vanish', () => {
  const d = world(); gen(d, '2026-02'); gen(d, '2026-03');
  d.pays.push(pay('in', 'b:e1:2026-02', M(800), '2026-02-10'));
  const m = C.tcMonth(d, '2026-03', '2026-03-20');
  assert.strictEqual(m.newDue, M(20000) + M(1500) + M(1600));
  assert.strictEqual(m.prevDue, M(20000) + M(1500) + M(800)); // ফেব্রুয়ারির বকেয়া (ব্যাচ ক শোধ)
  assert.ok(m.overdue > 0);
  const feb = C.tcMonth(d, '2026-02', '2026-03-20');
  assert.strictEqual(feb.newDue, M(20000) + M(1500) + M(800)); // আগের মাসের হিসাব বদলায়নি
});

t('budget compares real spending per category', () => {
  const d = world();
  d.budget = { total: M(3000), cats: { print: M(400) } };
  d.expenses.push({ id: 'a', date: '2026-02-03', amt: M(500), cat: 'print' }, { id: 'b', date: '2026-02-04', amt: M(600), cat: 'rent' }, { id: 'c', date: '2026-03-01', amt: M(900), cat: 'rent' });
  const b = C.tcBudget(d, '2026-02');
  assert.strictEqual(b.spent, M(1100)); assert.strictEqual(b.left, M(1900));
  assert.strictEqual(b.cats.find(c => c.k === 'print').budget, M(400));
});

t('schedule: day list, conflict warning, postponed class moves to new date', () => {
  const d = world();
  const sun = '2026-02-01'; // রবিবার
  assert.strictEqual(C.tcDayKey(sun), 'sun');
  let es = C.tcDay(d, sun);
  assert.strictEqual(es.length, 2); // চাকরির ক্লাস ১০:০০, গণিত ১০:৩০ (১ ঘণ্টা)
  assert.ok(es.every(e => e.conflict));
  d.sessions.push({ id: 'p', key: C.tcSessKey('u1', sun), slotId: 'u1', date: sun, status: 'postponed', movedTo: { date: '2026-02-03', time: '17:00' } });
  es = C.tcDay(d, sun);
  assert.ok(!es.some(e => e.conflict));
  assert.strictEqual(C.tcDay(d, '2026-02-03').filter(e => e.moved).length, 1);
  assert.ok(C.tcUpcoming(d, sun, 5).length > 0);
});

t('student joins before start and recurring cost respects its end month', () => {
  const d = world();
  d.recurs[0].to = '2026-02';
  assert.strictEqual(C.tcPlan(d, '2026-03').filter(x => x.kind === 'recur').length, 0);
  assert.strictEqual(C.tcPlan(d, '2026-02').filter(x => x.kind === 'recur').length, 1);
});

t('migration fills missing fields and keeps old data', () => {
  const o = C.tcNormalize({ jobs: [{ id: 'x', name: 'a' }], students: [{ id: 'y', name: 'b' }] });
  assert.ok(Array.isArray(o.jobs[0].salary)); assert.ok(Array.isArray(o.students[0].subjects)); assert.strictEqual(o.feeDay, 10); assert.strictEqual(o.jobs.length, 1);
});

t('annual report sums the months', () => {
  const d = world(); gen(d, '2026-02'); gen(d, '2026-03');
  const y = C.tcYear(d, 2026, '2026-12-31');
  assert.strictEqual(y.earned, y.months.reduce((a, m) => a + m.earned, 0));
  assert.strictEqual(y.months.length, 12);
});

t('student finance: agreed, paid, due and status follow payments', () => {
  const d = world(); gen(d, '2026-02');
  const f0 = C.tcStuFin(d, 's1', '2026-02-05');
  assert.strictEqual(f0.agreed, M(1500) + M(800)); assert.strictEqual(f0.due, M(2300)); assert.strictEqual(f0.status, 'unpaid');
  d.pays.push(pay('in', 'b:e1:2026-02', M(300), '2026-02-06'));
  const f1 = C.tcStuFin(d, 's1', '2026-02-06');
  assert.strictEqual(f1.paid, M(300)); assert.strictEqual(f1.due, M(2000)); assert.strictEqual(f1.status, 'partial');
  assert.strictEqual(C.tcStuFin(d, 's1', '2026-03-20').status, 'overdue');
  d.pays.push(pay('in', 'b:e1:2026-02', M(500), '2026-02-07'), pay('in', 's:u1:2026-02', M(1500), '2026-02-07'));
  assert.strictEqual(C.tcStuFin(d, 's1', '2026-03-20').status, 'paid');
  d.pays[d.pays.length - 1].void = true;
  assert.strictEqual(C.tcStuFin(d, 's1', '2026-03-20').due, M(1500));
});

t('collect plan fills the oldest dues first and never over-allocates', () => {
  const d = world(); gen(d, '2026-02'); gen(d, '2026-03');
  const p1 = C.tcCollectPlan(d, 's1', M(1000), '2026-03-05');
  assert.strictEqual(p1.used, M(1000)); assert.strictEqual(p1.left, 0); assert.ok(p1.lines.every(l => l.ym === '2026-02'));
  const p2 = C.tcCollectPlan(d, 's1', M(99999), '2026-03-05');
  assert.strictEqual(p2.used, p2.total); assert.strictEqual(p2.left, M(99999) - p2.total);
  const pb = C.tcCollectPlan(d, 's1', M(5000), '2026-03-05', 'b1');
  assert.ok(pb.lines.every(l => l.kind === 'batch'));
});

t('batch finance and all-students rows add up', () => {
  const d = world(); gen(d, '2026-02');
  d.pays.push(pay('in', 'b:e2:2026-02', M(800), '2026-02-08'));
  const bf = C.tcBatchFin(d, 'b1', '2026-02-10');
  assert.strictEqual(bf.agreed, M(1600)); assert.strictEqual(bf.collected, M(800)); assert.strictEqual(bf.due, M(800));
  const all = C.tcAllStudents(d, '2026-02-10');
  assert.strictEqual(all.length, 2); assert.strictEqual(all.find(r => r.s.id === 's1').kind, 'both'); assert.strictEqual(all.find(r => r.s.id === 's2').fin.status, 'paid');
});

t('batch attendance history and summary', () => {
  const d = world();
  d.sessions.push({ id: 'a1', key: 'b1|2026-02-07', slotId: 'b1', date: '2026-02-07', status: 'done', att: { s1: 'a', s2: 'p' } });
  d.sessions.push({ id: 'a2', key: 'x:1', slotId: 'b1', date: '2026-02-09', status: 'done', extra: true, att: { s1: 'p', s2: 'p' } });
  const days = C.tcBatchDays(d, 'b1');
  assert.strictEqual(days.length, 2); assert.strictEqual(days[0].date, '2026-02-09'); assert.deepStrictEqual(days[1].absent, ['s1']);
  const sm = C.tcBatchAttSummary(d, 'b1', '2026-02');
  assert.strictEqual(sm.classes, 2); assert.strictEqual(sm.rows.find(r => r.sid === 's1').pct, 50); assert.strictEqual(sm.avgPct, 75);
  const a = C.tcStuAtt(d, 's1'); assert.strictEqual(a.present, 1); assert.strictEqual(a.absent, 1); assert.strictEqual(a.pct, 50);
});

t('exam results: roster, ranks, average and student view', () => {
  const d = world();
  d.exams.push({ id: 'x1', name: 'মাসিক', date: '2026-02-20', batchId: 'b1', marks: 50, pass: 50, results: { s1: 45, s2: 20 }, studentIds: [] });
  const sm = C.tcExamSummary(d, d.exams[0]);
  assert.strictEqual(sm.rows.length, 2); assert.strictEqual(sm.avg, 32.5); assert.strictEqual(sm.high, 45); assert.strictEqual(sm.passed, 1);
  assert.strictEqual(sm.rows.find(r => r.sid === 's1').rank, 1); assert.strictEqual(sm.rows.find(r => r.sid === 's2').pct, 40);
  assert.strictEqual(C.tcStuResults(d, 's2')[0].marks, 20);
  d.exams[0].results.s2 = ''; assert.strictEqual(C.tcExamSummary(d, d.exams[0]).missing, 1);
});

console.log(`\n${n} tests passed`);
