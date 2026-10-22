'use strict';

/* =========================================================
   শিক্ষক ব্যবস্থাপনা: হিসাবের কেন্দ্রীয় স্তর (শুধু হিসাব, কোনো UI নেই)
   - টাকা পূর্ণসংখ্যায় (পয়সা, ১ টাকা = ১০০)। সব হিসাব প্রকৃত অর্থে, সেভও প্রকৃত অর্থে।
   - স্ক্রিনে দেখানোর সময়ই শুধু tcShow() একবার ১ টাকা যোগ করে; আর কোথাও এই ১ টাকা যোগ হয় না।
   - Node-এ টেস্ট করা যায়: tests/teacher-calc.test.js
   ========================================================= */

const TC_SCHEMA = 1;
const TC_PLUS = 100; // শুধু প্রদর্শনের জন্য ১ টাকা (পয়সায়)
const tcNum = v => (typeof toNum === 'function' ? toNum(v) : (parseFloat(String(v == null ? '' : v).replace(/,/g, '')) || 0));
const tcMinor = v => { const n = tcNum(v); return Math.round(n * 100 + (n < 0 ? -1e-9 : 1e-9)); };
const tcSum = a => a.reduce((x, y) => x + y, 0);
const tcFormat = m => {
  const neg = m < 0, a = Math.abs(Math.round(m || 0)), t = Math.floor(a / 100), p = a % 100;
  return (neg ? '−' : '') + '৳' + t.toLocaleString('en-IN') + (p ? '.' + String(p).padStart(2, '0') : '');
};
// প্রকৃত মান (কেবল "প্রকৃত হিসাব" নামে স্পষ্ট চিহ্নিত জায়গায়)
const tcRaw = tcFormat;
// স্ক্রিনে দেখানো মান = প্রকৃত + ১ টাকা (একমাত্র জায়গা)
const tcShow = m => tcFormat((m || 0) + TC_PLUS);

/* ---------- মাস ও তারিখ ---------- */
const TC_JSDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TC_DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
const tcYm = d => String(d || '').slice(0, 7);
const tcYmIdx = ym => { const [y, m] = ym.split('-').map(Number); return y * 12 + m - 1; };
const tcYmAdd = (ym, n) => { const t = tcYmIdx(ym) + n; return Math.floor(t / 12) + '-' + String(t % 12 + 1).padStart(2, '0'); };
const tcLastDay = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
const tcDate = (ym, day) => { const d = Math.floor(Number(day)); return ym + '-' + String(Math.min(Math.max(d >= 1 ? d : 1, 1), tcLastDay(ym))).padStart(2, '0'); };
const tcDayKey = date => { const [y, m, d] = date.split('-').map(Number); return TC_JSDAYS[new Date(y, m - 1, d).getDay()]; };
const tcShift = (date, n) => { const [y, m, d] = date.split('-').map(Number), x = new Date(y, m - 1, d + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const tcMin = hm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] : null; };
const tcLive = a => (Array.isArray(a) ? a : []).filter(x => !x.del);

/* ---------- তারিখ-ভিত্তিক হার (বেতন/ফি বদল নির্দিষ্ট মাস থেকে কার্যকর, আগেরটা অপরিবর্তিত) ---------- */
function tcRateAt(h, ym) {
  let r = 0, best = '';
  (h || []).forEach(x => { if (x.from <= ym && x.from >= best) { best = x.from; r = x.amt || 0; } });
  return r;
}
function tcRateSet(h, from, amt) {
  const out = (h || []).filter(x => x.from !== from).concat([{ from, amt }]);
  return out.sort((a, b) => a.from.localeCompare(b.from));
}

/* ---------- ডেটার কাঠামো ---------- */
function tcBlank() {
  return { schema: TC_SCHEMA, openingCash: 0, feeDay: 10, centers: [], jobs: [], students: [], batches: [], enrolls: [], sessions: [], charges: [], expenses: [], pays: [], recurs: [], exams: [], cats: [], budget: { total: 0, cats: {} } };
}
function tcNormalize(t) {
  const b = Object.assign(tcBlank(), t || {});
  ['centers', 'jobs', 'students', 'batches', 'enrolls', 'sessions', 'charges', 'expenses', 'pays', 'recurs', 'exams', 'cats'].forEach(k => { if (!Array.isArray(b[k])) b[k] = []; });
  if (!b.budget || typeof b.budget !== 'object') b.budget = { total: 0, cats: {} };
  if (!b.budget.cats || typeof b.budget.cats !== 'object') b.budget.cats = {};
  b.students.forEach(s => { if (!Array.isArray(s.subjects)) s.subjects = []; if (!Array.isArray(s.docs)) s.docs = []; });
  b.jobs.forEach(j => { if (!Array.isArray(j.salary)) j.salary = []; if (!Array.isArray(j.sched)) j.sched = []; });
  b.expenses.forEach(e => { if (!Array.isArray(e.photos)) e.photos = []; });
  return b;
}

/* ---------- কে কোন মাসে ফি দেবে ---------- */
function tcStudentOk(s, ym) {
  if (!s || s.del || s.status === 'paused') return false;
  if (s.status === 'left' && !s.end) return false;
  return !(s.end && ym > tcYm(s.end));
}
const tcSubjectOk = (s, u, ym) => tcStudentOk(s, ym) && u.active !== false && ym >= (tcYm(u.start || s.start) || '0000-00');
const tcEnrollOk = (x, e, ym) => {
  const s = x.stu[e.studentId], b = x.bat[e.batchId];
  return !!(s && b && s.status !== 'paused' && !(s.status === 'left' && !s.end) && !(s.end && ym > tcYm(s.end)) && b.active !== false
    && ym >= e.from && (!e.to || ym <= e.to) && !(b.end && ym > tcYm(b.end)));
};
const tcJobOk = (j, ym) => j.active !== false && ym >= (tcYm(j.start) || '0000-00') && !(j.end && ym > tcYm(j.end));

/* ---------- হিসাবের প্রসঙ্গ (এক জায়গায় সব ম্যাপ) ---------- */
function tcOccur(t) { // যে ক্লাসগুলো সত্যিই হয়েছে: [{slotId, date}]
  const out = [];
  tcLive(t.sessions).forEach(r => {
    if (r.extra) { if (r.status === 'done') out.push({ slotId: r.slotId, date: r.date }); return; }
    if (r.status === 'done') out.push({ slotId: r.slotId, date: r.date });
    else if (r.status === 'postponed' && r.movedTo && r.mst === 'done') out.push({ slotId: r.slotId, date: r.movedTo.date });
  });
  return out;
}
function tcCtx(t) {
  const x = { t, stu: {}, sub: {}, bat: {}, job: {}, enr: {}, occ: {}, byRef: {}, ex: {} };
  tcLive(t.students).forEach(s => { x.stu[s.id] = s; tcLive(s.subjects).forEach(u => { x.sub[u.id] = { u, s }; }); });
  tcLive(t.batches).forEach(b => { x.bat[b.id] = b; });
  tcLive(t.jobs).forEach(j => { x.job[j.id] = j; });
  tcLive(t.enrolls).forEach(e => { x.enr[e.id] = e; });
  tcOccur(t).forEach(o => { const k = o.slotId + '|' + tcYm(o.date); x.occ[k] = (x.occ[k] || 0) + 1; });
  tcLive(t.expenses).forEach(e => { x.ex[e.id] = e; });
  (t.pays || []).forEach(p => { if (!p.void) (x.byRef[p.ref] = x.byRef[p.ref] || []).push(p); });
  x.paid = (ref, asOf) => tcSum((x.byRef[ref] || []).filter(p => !asOf || p.date <= asOf).map(p => p.amt));
  x.amt = c => {
    if (!c.auto) return c.amt || 0;
    const su = x.sub[c.ref];
    return su ? (x.occ[c.ref + '|' + c.ym] || 0) * tcRateAt(su.u.fees, c.ym) : 0;
  };
  x.incomes = tcLive(t.charges).filter(c => !c.cancelled).map(c => ({ c, id: c.id, kind: c.kind, ym: c.ym, amt: x.amt(c), due: c.due, src: tcSrcOf(c) }));
  x.inc = {}; x.incomes.forEach(i => { x.inc[i.id] = i; });
  return x;
}
function tcSrcOf(r) {
  if (r.kind === 'job') return 'job';
  if (r.kind === 'private') return 'private';
  if (r.kind === 'batch') return 'coaching';
  return r.src && r.src !== 'general' ? r.src : r.jobId ? 'job' : r.batchId ? 'coaching' : r.studentId ? 'private' : 'other';
}
function tcStatus(amt, paid, due, today) {
  if (!(amt > 0) || paid >= amt) return 'paid';
  if (due && today && due < today) return 'overdue';
  return paid > 0 ? 'partial' : 'unpaid';
}
// একটা পাওনা বা বিলের পরিস্থিতি
function tcItemState(x, id, side, today, asOf) {
  const it = side === 'in' ? x.inc[id] : x.ex[id] && { amt: x.ex[id].amt, due: x.ex[id].due || x.ex[id].date };
  if (!it) return null;
  const paid = x.paid(id, asOf), rem = Math.max(0, it.amt - paid);
  return { amt: it.amt, paid, rem, over: Math.max(0, paid - it.amt), status: tcStatus(it.amt, paid, it.due, today), due: it.due };
}

/* ---------- নতুন মাসের পরিকল্পনা (একই কী দুবার হয় না) ---------- */
function tcPlan(t, ym) {
  const x = tcCtx(t), haveC = new Set((t.charges || []).map(c => c.key)), haveE = new Set((t.expenses || []).map(e => e.key).filter(Boolean));
  const out = [], fd = t.feeDay || 10;
  tcLive(t.jobs).forEach(j => {
    const key = 'j:' + j.id + ':' + ym, amt = tcRateAt(j.salary, ym);
    if (!haveC.has(key) && tcJobOk(j, ym) && amt > 0) out.push({ key, kind: 'job', ref: j.id, jobId: j.id, who: j.name, what: j.role || '', amt, due: tcDate(ym, j.payDay || 1) });
  });
  tcLive(t.students).forEach(s => tcLive(s.subjects).forEach(u => {
    const key = 's:' + u.id + ':' + ym;
    if (haveC.has(key) || !tcSubjectOk(s, u, ym)) return;
    const auto = u.mode === 'class', amt = auto ? 0 : tcRateAt(u.fees, ym);
    if (auto || amt > 0) out.push({ key, kind: 'private', ref: u.id, studentId: s.id, who: s.name, what: u.name, amt, auto, due: auto ? tcDate(ym, 31) : tcDate(ym, fd) });
  }));
  tcLive(t.enrolls).forEach(e => {
    const key = 'b:' + e.id + ':' + ym, amt = tcRateAt(e.fees, ym), b = x.bat[e.batchId], s = x.stu[e.studentId];
    if (!haveC.has(key) && amt > 0 && tcEnrollOk(x, e, ym)) out.push({ key, kind: 'batch', ref: e.id, studentId: e.studentId, batchId: e.batchId, who: s.name, what: b.name, amt, due: tcDate(ym, fd) });
  });
  tcLive(t.recurs).forEach(r => {
    const key = 'r:' + r.id + ':' + ym, amt = tcRateAt(r.amts, ym);
    if (!haveE.has(key) && r.active !== false && ym >= (r.from || '0000-00') && !(r.to && ym > r.to) && amt > 0) out.push({ key, kind: 'recur', ref: r.id, who: r.name, what: '', amt, due: tcDate(ym, r.day || 1), cat: r.cat, src: r.src, jobId: r.jobId, batchId: r.batchId });
  });
  return out;
}

/* ---------- মাসের পূর্ণ হিসাব ---------- */
const TC_SRC = ['job', 'private', 'coaching', 'other'];
const tcZeroSrc = () => ({ job: 0, private: 0, coaching: 0, other: 0 });
function tcMonth(t, ym, today) {
  const x = tcCtx(t), end = tcDate(ym, 31), ref = today && today < end ? today : end;
  const inMonth = d => tcYm(d) === ym;
  const earnedBy = tcZeroSrc(), recvBy = tcZeroSrc(), expBy = tcZeroSrc(), dueBy = tcZeroSrc();
  const cur = x.incomes.filter(i => i.ym === ym);
  cur.forEach(i => { earnedBy[i.src] += i.amt; });
  const recvPays = (t.pays || []).filter(p => !p.void && p.side === 'in' && x.inc[p.ref] && inMonth(p.date));
  recvPays.forEach(p => { recvBy[x.inc[p.ref].src] += p.amt; });
  const exps = tcLive(t.expenses).filter(e => inMonth(e.date));
  const byCat = {};
  exps.forEach(e => { expBy[tcSrcOf(e)] += e.amt; byCat[e.cat] = (byCat[e.cat] || 0) + e.amt; });
  const outPays = (t.pays || []).filter(p => !p.void && p.side === 'out' && x.ex[p.ref] && inMonth(p.date));
  let prevDue = 0, newDue = 0, overdue = 0;
  const dues = [];
  x.incomes.filter(i => i.ym <= ym).forEach(i => {
    const rem = i.amt - x.paid(i.id, end);
    if (rem <= 0) return;
    const isNew = i.ym === ym, od = !!(i.due && i.due < ref);
    if (isNew) newDue += rem; else prevDue += rem;
    if (od) overdue += rem;
    dueBy[i.src] += rem;
    dues.push({ id: i.id, rem, isNew, overdue: od, due: i.due });
  });
  const earned = tcSum(Object.values(earnedBy)), received = tcSum(recvPays.map(p => p.amt)), expense = tcSum(exps.map(e => e.amt));
  const allIn = (t.pays || []).filter(p => !p.void && p.side === 'in' && x.inc[p.ref] && p.date <= end), allOut = (t.pays || []).filter(p => !p.void && p.side === 'out' && x.ex[p.ref] && p.date <= end);
  const cashIn = tcSum(allIn.map(p => p.amt)), cashOut = tcSum(allOut.map(p => p.amt));
  const payable = tcSum(exps.map(e => Math.max(0, e.amt - x.paid(e.id, end))));
  const srcRows = {};
  TC_SRC.forEach(k => { srcRows[k] = { earned: earnedBy[k], received: recvBy[k], expense: expBy[k], profit: earnedBy[k] - expBy[k], due: dueBy[k] }; });
  return {
    ym, earned, earnedBy, received, recvBy, expense, expBy, byCat, paidOut: tcSum(outPays.map(p => p.amt)), payable,
    profit: earned - expense, prevDue, newDue, due: prevDue + newDue, overdue, dues, srcRows,
    cash: { opening: t.openingCash || 0, in: cashIn, out: cashOut, balance: (t.openingCash || 0) + cashIn - cashOut },
    items: cur, exps, recvPays, outPays,
  };
}
function tcYear(t, year, today) {
  const months = [];
  for (let m = 1; m <= 12; m++) { const r = tcMonth(t, year + '-' + String(m).padStart(2, '0'), today); months.push(r); }
  const sum = k => tcSum(months.map(m => m[k]));
  return { year, months, earned: sum('earned'), received: sum('received'), expense: sum('expense'), profit: sum('profit'), dueEnd: months[11].due, cashEnd: months[11].cash.balance };
}
// মাসের বাজেট বনাম আসল খরচ
function tcBudget(t, ym) {
  const spent = {};
  let total = 0;
  tcLive(t.expenses).filter(e => tcYm(e.date) === ym).forEach(e => { spent[e.cat] = (spent[e.cat] || 0) + e.amt; total += e.amt; });
  const b = t.budget || { total: 0, cats: {} };
  const keys = [...new Set(Object.keys(spent).concat(Object.keys(b.cats || {}).filter(k => b.cats[k] > 0)))];
  const cats = keys.map(k => ({ k, spent: spent[k] || 0, budget: b.cats[k] > 0 ? b.cats[k] : null })).sort((p, q) => q.spent - p.spent);
  return { total: b.total > 0 ? b.total : null, spent: total, left: b.total > 0 ? b.total - total : null, cats };
}

/* ---------- পরীক্ষার খরচ ---------- */
function tcExamCost(e) {
  const n = Math.max(0, e.students | 0), pages = Math.max(0, e.pages || 0), pp = e.pagePrice || 0;
  const paper = Math.round(n * pages * pp), sheets = Math.round((e.sheets || 0) * (e.sheetPrice || 0));
  const waste = Math.round((e.wasteCopies || 0) * pages * pp), extra = e.extra || 0;
  const total = paper + sheets + waste + extra;
  return { paper, sheets, waste, extra, total, budget: e.budget > 0 ? e.budget : null, diff: e.budget > 0 ? total - e.budget : null };
}

/* ---------- ক্লাসের সময়সূচি ---------- */
function tcSlots(t) {
  const out = [];
  tcLive(t.students).forEach(s => tcLive(s.subjects).forEach(u => {
    out.push({ id: u.id, kind: 'private', ref: u.id, studentId: s.id, who: s.name, what: u.name, days: u.days || [], time: u.time || '', dur: u.dur || 60, place: u.place || '', ok: d => u.active !== false && tcStudentOk(s, tcYm(d)) && d >= (u.start || s.start || '0000-00-00') });
  }));
  tcLive(t.batches).forEach(b => {
    out.push({ id: b.id, kind: 'batch', ref: b.id, batchId: b.id, who: b.name, what: b.subject || '', days: b.days || [], time: b.time || '', dur: b.dur || 60, place: b.place || '', ok: d => b.active !== false && d >= (b.start || '0000-00-00') && !(b.end && d > b.end) });
  });
  tcLive(t.jobs).forEach(j => (j.sched || []).forEach(sc => {
    if (sc.days && sc.days.length) out.push({ id: sc.id, kind: 'job', ref: j.id, jobId: j.id, who: j.name, what: sc.label || j.role || '', days: sc.days, time: sc.time || '', dur: sc.dur || 60, place: sc.place || '', ok: d => j.active !== false && d >= (j.start || '0000-00-00') && !(j.end && d > j.end) });
  }));
  return out;
}
const tcSessKey = (slotId, date) => slotId + '|' + date;
// একটা তারিখের সব ক্লাস (সময় অনুযায়ী) ও সময়ের সংঘাত
function tcDay(t, date, slots) {
  slots = slots || tcSlots(t);
  const recs = {}, byId = {};
  tcLive(t.sessions).forEach(r => { if (!r.extra) recs[r.key] = r; });
  slots.forEach(s => { byId[s.id] = s; });
  const out = [], dk = tcDayKey(date);
  const mk = (s, o) => Object.assign({ slotId: s.id, kind: s.kind, ref: s.ref, studentId: s.studentId, batchId: s.batchId, jobId: s.jobId, who: s.who, what: s.what, place: s.place, time: s.time, dur: s.dur, date }, o);
  slots.forEach(s => {
    if (!s.days.includes(dk) || !s.ok(date)) return;
    const r = recs[tcSessKey(s.id, date)];
    out.push(mk(s, { key: tcSessKey(s.id, date), st: r ? r.status : 'pending', rec: r || null, movedTo: r && r.movedTo ? r.movedTo : null }));
  });
  tcLive(t.sessions).forEach(r => {
    const s = byId[r.slotId];
    if (!s) return;
    if (r.extra && r.date === date) out.push(mk(s, { key: r.key, st: r.status, rec: r, extra: true, time: r.time || s.time }));
    else if (!r.extra && r.status === 'postponed' && r.movedTo && r.movedTo.date === date) out.push(mk(s, { key: r.key, st: r.mst || 'pending', rec: r, moved: true, time: r.movedTo.time || s.time }));
  });
  out.sort((a, b) => (tcMin(a.time) == null ? 9999 : tcMin(a.time)) - (tcMin(b.time) == null ? 9999 : tcMin(b.time)) || a.who.localeCompare(b.who));
  const busy = out.filter(e => tcMin(e.time) != null && !['cancelled', 'absent'].includes(e.st) && !(e.st === 'postponed' && !e.moved));
  busy.forEach((a, i) => busy.forEach((b, j) => { if (i !== j && tcMin(a.time) < tcMin(b.time) + b.dur && tcMin(b.time) < tcMin(a.time) + a.dur) a.conflict = true; }));
  return out;
}
function tcUpcoming(t, from, limit, span) {
  const slots = tcSlots(t), out = [];
  for (let i = 0; i < (span || 21) && out.length < limit; i++) {
    const d = tcShift(from, i);
    tcDay(t, d, slots).forEach(e => { if (e.st === 'pending') out.push(e); });
  }
  return out.slice(0, limit);
}
function tcMonthCal(t, ym, kind) {
  const slots = tcSlots(t), out = {};
  for (let d = 1; d <= tcLastDay(ym); d++) {
    const date = tcDate(ym, d), es = tcDay(t, date, slots).filter(e => !(e.st === 'postponed' && !e.moved) && (!kind || kind === 'all' || e.kind === kind));
    if (es.length) out[date] = { n: es.length, conflict: es.some(e => e.conflict), pend: es.filter(e => e.st === 'pending').length };
  }
  return out;
}
// একটা ক্লাস-ধারার মাসের উপস্থিতির সংখ্যা
function tcAttendance(t, slotId, ym) {
  const r = { done: 0, absent: 0, cancelled: 0, postponed: 0, extra: 0 };
  tcLive(t.sessions).filter(s => s.slotId === slotId && tcYm(s.date) === ym).forEach(s => {
    if (s.extra) { if (s.status === 'done') r.extra++; return; }
    if (r[s.status] != null) r[s.status]++;
  });
  return r;
}
// ব্যাচে একজন শিক্ষার্থীর উপস্থিতি: যে ক্লাস হয়েছে তার মধ্যে কতটায় ছিল
function tcBatchAttendance(t, batchId, studentId, ym) {
  let p = 0, a = 0;
  tcLive(t.sessions).filter(s => s.slotId === batchId && (s.status === 'done' || (s.status === 'postponed' && s.mst === 'done')) && tcYm(s.movedTo && s.status === 'postponed' ? s.movedTo.date : s.date) === ym).forEach(s => { if (s.att && s.att[studentId] === 'a') a++; else p++; });
  return { present: p, absent: a };
}

// একটা চাকরি / ব্যাচ / শিক্ষার্থীর মাসভিত্তিক আয়-ব্যয় (f = {jobId} | {batchId} | {studentId})
function tcEntityMonths(t, f) {
  const x = tcCtx(t), rows = {};
  const ok = r => (f.jobId ? r.jobId === f.jobId : f.batchId ? r.batchId === f.batchId : f.studentId ? r.studentId === f.studentId : false);
  const row = ym => rows[ym] || (rows[ym] = { ym, earned: 0, received: 0, due: 0, exp: 0 });
  x.incomes.filter(i => ok(i.c)).forEach(i => { const r = row(i.ym), p = Math.min(i.amt, x.paid(i.id)); r.earned += i.amt; r.received += p; r.due += i.amt - p; });
  tcLive(t.expenses).filter(ok).forEach(e => { row(tcYm(e.date)).exp += e.amt; });
  return Object.values(rows).sort((a, b) => b.ym.localeCompare(a.ym)).map(r => Object.assign(r, { net: r.earned - r.exp }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tcMinor, tcFormat, tcShow, tcRaw, tcYm, tcYmAdd, tcYmIdx, tcLastDay, tcDate, tcDayKey, tcShift, tcRateAt, tcRateSet, tcBlank, tcNormalize, tcCtx, tcPlan, tcMonth, tcYear, tcBudget, tcExamCost, tcStatus, tcItemState, tcSlots, tcDay, tcUpcoming, tcMonthCal, tcEntityMonths, tcAttendance, tcBatchAttendance, tcStudentOk, tcOccur, tcSrcOf, tcSessKey };
}
