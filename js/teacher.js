'use strict';

/* =========================================================
   মডিউল: শিক্ষক ব্যবস্থাপনা (চাকরি, প্রাইভেট, কোচিং, ক্লাস, আয়-ব্যয়, পরীক্ষা, রিপোর্ট)
   ডেটা: state.teacher (অন্য মডিউল থেকে আলাদা)। হিসাব: js/teacher-calc.js
   এই ফাইলে: ডেটার সহায়ক, হোম, ক্লাস, কাজ ট্যাব। টাকা-ট্যাব, রিপোর্ট ও "আরও": teacher-money.js; ফর্ম, শিট, অ্যাকশন, registerModule: teacher-forms.js
   নিয়ম: স্ক্রিনে অর্থ দেখাতে শুধু tcM() (= প্রকৃত + ১ টাকা)। সেভ ও হিসাব সবসময় প্রকৃত অর্থে।
   ========================================================= */

Object.assign(ICONS, {
  cap: '<path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5M22 9v6"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
});

const TC_CATS = [
  { k: 'job_travel', bn: 'চাকরিতে যাতায়াত', en: 'Job travel', e: '🚌', src: 'job' }, { k: 'job_food', bn: 'চাকরিতে খাবার', en: 'Job meals', e: '🍱', src: 'job' },
  { k: 'tuition_travel', bn: 'প্রাইভেট পড়াতে যাতায়াত', en: 'Tuition travel', e: '🛵', src: 'private' }, { k: 'book', bn: 'বই', en: 'Books', e: '📚' },
  { k: 'stationery', bn: 'খাতা, কলম, মার্কার ও স্টেশনারি', en: 'Notebooks, pens & stationery', e: '✏️' }, { k: 'print', bn: 'প্রশ্নপত্র ও নোট প্রিন্ট', en: 'Question & note printing', e: '🖨️' },
  { k: 'exam', bn: 'পরীক্ষা (খাতা, কাগজ, প্রিন্ট)', en: 'Exam (sheets, paper, print)', e: '📝', src: 'coaching' }, { k: 'rent', bn: 'কোচিং রুম/ভবন ভাড়া', en: 'Coaching room rent', e: '🏢', src: 'coaching' },
  { k: 'utility', bn: 'বিদ্যুৎ ও ইন্টারনেট বিল', en: 'Electricity & internet', e: '💡', src: 'coaching' }, { k: 'equip', bn: 'ফ্যান, লাইট, বোর্ড ও সরঞ্জাম', en: 'Fan, light, board & equipment', e: '🪑', src: 'coaching' },
  { k: 'staff', bn: 'সহকারী/অন্য শিক্ষকের বেতন', en: 'Assistant / other teacher pay', e: '👩‍🏫', src: 'coaching' }, { k: 'repair', bn: 'পরিষ্কার, মেরামত ও অন্যান্য', en: 'Cleaning, repair & other', e: '🧹' },
  { k: 'other', bn: 'অন্যান্য', en: 'Other', e: '🧾' },
];
const TC_SUPPLY = ['book', 'stationery', 'print', 'equip'];
const TC_SRCN = { job: ['চাকরি', 'Job', '💼'], private: ['প্রাইভেট', 'Private', '🏠'], coaching: ['কোচিং', 'Coaching', '🏫'], other: ['অন্যান্য', 'Other', '➕'] };
const TC_KIND = { job: ['বেতন', 'Salary'], private: ['প্রাইভেটের ফি', 'Private fee'], batch: ['কোচিংয়ের ফি', 'Coaching fee'], bonus: ['বোনাস', 'Bonus'], extra: ['অতিরিক্ত ক্লাস / আয়', 'Extra class / income'], other: ['অন্যান্য আয়', 'Other income'] };
const TC_METHOD = { cash: ['নগদ', 'Cash'], mobile: ['মোবাইল ব্যাংকিং', 'Mobile banking'], bank: ['ব্যাংক', 'Bank'], other: ['অন্য', 'Other'] };
const TC_STN = { pending: ['অপেক্ষমাণ', 'Pending'], done: ['সম্পন্ন', 'Done'], absent: ['অনুপস্থিত', 'Absent'], cancelled: ['বাতিল', 'Cancelled'], postponed: ['স্থগিত', 'Postponed'] };
const TC_PAYN = { unpaid: ['Unpaid', 'Unpaid'], partial: ['Partially Paid', 'Partially Paid'], paid: ['Paid', 'Paid'], overdue: ['Overdue', 'Overdue'] };
const TC_DAYN = { sat: ['শনি', 'Sat'], sun: ['রবি', 'Sun'], mon: ['সোম', 'Mon'], tue: ['মঙ্গল', 'Tue'], wed: ['বুধ', 'Wed'], thu: ['বৃহঃ', 'Thu'], fri: ['শুক্র', 'Fri'] };
const tcN = (o, k) => o[k][isEN() ? 1 : 0];

/* ---------- ডেটা ---------- */
const tcd = () => state.teacher;
function tcMigrate(s) { s.teacher = tcNormalize(s.teacher); }
const tcM = tcShow; // স্ক্রিনে অর্থ দেখানোর একমাত্র ফাংশন (প্রকৃত + ১ টাকা)
let tcUi = { ym: tcYm(today()), msub: 'dues', wsub: 'job', ssub: 'day', sdate: today(), cm: tcYm(today()), sf: 'all', q: '', stf: 'active', dscope: 'month', dst: 'all', esrc: 'all', ecat: 'all', rmode: 'month', rollYm: '' };
const tcYmLabel = ym => { const [y, m] = ym.split('-'); return `${MONTHS[isEN() ? 'en' : 'bn'][+m - 1]} ${y}`; };
const tcTime = hm => { const v = tcMin(hm); if (v == null) return ''; const h = Math.floor(v / 60); return `${h % 12 || 12}:${String(v % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const tcDateOk = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
const tcYmOk = v => /^\d{4}-\d{2}$/.test(v || '');
const tcCatsAll = () => TC_CATS.concat(tcLive(tcd().cats).map(c => ({ k: c.k, bn: c.name, en: c.name, e: '🏷️', custom: true })));
const tcCat = k => tcCatsAll().find(c => c.k === k) || TC_CATS[TC_CATS.length - 1];
const tcCatName = k => { const c = tcCat(k); return isEN() ? c.en : c.bn; };
const tcSrcName = k => tcN(TC_SRCN, k);
const tcSel = (name, opts, val) => `<select class="input" name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const tcBar = (p, cls = '', col = 'var(--accent)') => `<div class="bbar"><span class="${cls}" style="--c:${col};width:${clamp(p, 0, 100).toFixed(1)}%"></span></div>`;
const tcBadge = st => `<span class="tcb ${st}">${tcN(TC_PAYN, st)}</span>`;
const tcNote = () => `<p class="tcnote">${L('দ্রষ্টব্য: প্রদর্শিত অর্থের পরিমাণে হিসাবের সুবিধার্থে ১ টাকা যোগ করা হয়েছে। প্রকৃত লেনদেনের হিসাব অপরিবর্তিত।', 'Note: Displayed amounts have ৳1 added for convenience. The actual transaction records are unchanged.')}</p>`;
const tcPage = html => html + tcNote();

// একটা পাওনার নাম ও উপশিরোনাম
function tcIncLabel(x, i) {
  const c = i.c, k = tcN(TC_KIND, c.kind);
  if (c.kind === 'job') return { t: (x.job[c.jobId] || {}).name || '—', s: k };
  if (c.kind === 'private') return { t: (x.stu[c.studentId] || {}).name || '—', s: (x.sub[c.ref] ? x.sub[c.ref].u.name : '') };
  if (c.kind === 'batch') return { t: (x.stu[c.studentId] || {}).name || '—', s: (x.bat[c.batchId] || {}).name || '' };
  const who = c.studentId ? (x.stu[c.studentId] || {}).name : c.jobId ? (x.job[c.jobId] || {}).name : c.batchId ? (x.bat[c.batchId] || {}).name : '';
  return { t: c.desc || k, s: [k, who].filter(Boolean).join(' · ') };
}
function tcIncRow(x, i, td) {
  const st = tcItemState(x, i.id, 'in', td), lb = tcIncLabel(x, i);
  return `<button type="button" class="lrow" data-action="tc-item" data-id="${esc(i.id)}" data-side="in"><span class="lic">${TC_SRCN[i.src][2]}</span>
    <span class="lmain"><b>${esc(lb.t)}</b><small>${esc(lb.s)}${lb.s ? ' · ' : ''}${tcYmLabel(i.ym)} ${tcBadge(st.status)}${i.c.auto ? ' · ' + L('ক্লাস অনুযায়ী', 'per class') : ''}</small></span>
    <span class="lend"><b>${tcM(i.amt)}</b>${st.rem > 0 && st.paid > 0 ? `<small class="neg">${L('বাকি', 'due')} ${tcM(st.rem)}</small>` : ''}</span></button>`;
}
function tcExpLabel(x, e) {
  const who = e.studentId ? (x.stu[e.studentId] || {}).name : e.jobId ? (x.job[e.jobId] || {}).name : e.batchId ? (x.bat[e.batchId] || {}).name : '';
  return { t: e.desc || tcCatName(e.cat), s: [tcCatName(e.cat), who, fmtDate(e.date)].filter(Boolean).join(' · ') };
}
function tcExpRow(x, e, td) {
  const st = tcItemState(x, e.id, 'out', td), lb = tcExpLabel(x, e);
  return `<button type="button" class="lrow" data-action="tc-item" data-id="${esc(e.id)}" data-side="out"><span class="lic">${tcCat(e.cat).e}</span>
    <span class="lmain"><b>${esc(lb.t)}</b><small>${esc(lb.s)} ${tcBadge(st.status)}${e.recurId ? ' · 🔁' : ''}${e.reusable ? ' · ' + L('পুনর্ব্যবহারযোগ্য', 'reusable') : ''}</small></span>
    <span class="lend"><b>${tcM(e.amt)}</b>${st.rem > 0 && st.paid > 0 ? `<small class="neg">${L('বাকি', 'due')} ${tcM(st.rem)}</small>` : ''}</span></button>`;
}
const tcMonthNav = (act = 'tc-ym') => `<div class="tcmn"><button type="button" class="icon-btn" data-action="${act}" data-d="-1" aria-label="${L('আগের মাস', 'Previous month')}">${icon('prev', 20)}</button><b>${tcYmLabel(tcUi.ym)}</b><button type="button" class="icon-btn" data-action="${act}" data-d="1" aria-label="${L('পরের মাস', 'Next month')}">${icon('next', 20)}</button></div>`;

/* ---------- টপবার ---------- */
function tcTopbar() {
  return `<div class="batch-btn">
      <button type="button" class="home-btn" data-action="go-home" aria-label="${L('হোমে ফিরুন', 'Back to Home')}"><span class="logo-sm">${LOGO}</span></button>
      <span class="bb-text"><button type="button" class="home-link" data-action="go-home">${L('হিসাবী', 'Hisabi')}</button>
        <span class="batch-name"><b>${L('শিক্ষক', 'Teacher')}</b></span></span>
    </div>
    <div class="top-actions">${moduleSwitcher()}${helpBtn()}${langBtn()}</div>`;
}

/* ---------- হোম ---------- */
const tcStat = (k, label, value, sub, cls = '') => `<button type="button" class="stat tcstat" data-action="tc-detail" data-k="${k}"><small>${label}</small><b class="${cls}">${value}</b><em>${sub}</em></button>`;
function tcMiniRow(e) {
  return `<div class="hg-day"><span><b>${e.time ? tcTime(e.time) + ' · ' : ''}${esc(e.who)}</b><small>${esc(e.what)}${e.place ? ' · ' + esc(e.place) : ''}${e.conflict ? ' ⚠️' : ''}</small></span><span class="tcb ${e.st}">${tcN(TC_STN, e.st)}</span></div>`;
}
function tcHome() {
  const t = tcd(), ym = tcUi.ym, td = today(), m = tcMonth(t, ym, td);
  const empty0 = !t.jobs.some(j => !j.del) && !t.students.some(s => !s.del) && !t.batches.some(b => !b.del);
  const plan = tcPlan(t, ym).length, curYm = tcYm(td);
  const slots = tcSlots(t), todayL = tcDay(t, td, slots), nextL = tcUpcoming(t, tcShift(td, 1), 5, 14);
  const bud = tcBudget(t, ym), srcs = TC_SRC.filter(k => k !== 'other' || m.srcRows.other.earned || m.srcRows.other.expense);
  if (empty0) return tcPage(`<div class="page-head"><h1>${L('শিক্ষক ব্যবস্থাপনা', 'Teacher Manager')}</h1></div>
    <section class="card">${empty('🎓', L('শুরু করুন', 'Get started'), `<p class="hint">${L('চাকরি, প্রাইভেট শিক্ষার্থী বা কোচিংয়ের ব্যাচ যোগ করুন। প্রতি মাসে নতুন করে লিখতে হবে না: মাস বদলালে এক ট্যাপে ফি, বেতন আর নিয়মিত খরচ তৈরি হয়।', 'Add a job, private students or a coaching batch. You never retype each month: one tap creates the new month\'s fees, salary and regular costs.')}</p>`,
      `<button type="button" class="btn primary block mt8" data-action="tc-stu-add">${icon('plus', 18)} ${L('শিক্ষার্থী যোগ', 'Add student')}</button><button type="button" class="btn block mt8" data-action="tc-job-add">💼 ${L('চাকরি যোগ', 'Add job')}</button><button type="button" class="btn block mt8" data-action="tc-bat-add">🏫 ${L('কোচিং ব্যাচ যোগ', 'Add coaching batch')}</button>`)}</section>`);
  return tcPage(`${tcMonthNav()}
  <section class="hero tappable" data-action="tc-detail" data-k="profit" role="button" tabindex="0" aria-label="${L('পুরো হিসাব দেখুন', 'See the full breakdown')}"><div class="hero-top"><div><div class="hero-label">${L('প্রকৃত লাভ', 'Net profit')} · ${tcYmLabel(ym)}</div>
      <div class="hero-target">${tcM(m.profit)}</div><div class="hero-sub">${L('অর্জিত আয় − খরচ', 'Earned income − expenses')}</div></div></div>
    <div class="hero-chips"><div><small>${L('অর্জিত আয়', 'Earned')}</small><b>${tcM(m.earned)}</b></div><div><small>${L('প্রাপ্ত', 'Received')}</small><b>${tcM(m.received)}</b></div><div><small>${L('খরচ', 'Expenses')}</small><b>${tcM(m.expense)}</b></div></div><div class="hero-more">${L('ট্যাপ করে পুরো হিসাব দেখুন', 'Tap for the full breakdown')} ${icon('chev', 16)}</div></section>
  ${plan && ym <= tcYmAdd(curYm, 1) ? `<section class="card attn"><div class="card-head"><h2>🗓️ ${L('নতুন মাসের হিসাব', 'New month\'s books')}</h2><span class="achips"><em class="i">${plan}</em></span></div>
    <p class="hint" style="margin:0 0 8px">${L(`${tcYmLabel(ym)}-এর ${plan}টা ফি/বেতন/খরচ তৈরি হয়নি। দেখে নিয়ে এক ট্যাপে তৈরি করুন; আগের মাসের হিসাব বদলাবে না।`, `${plan} fee/salary/cost item(s) for ${tcYmLabel(ym)} are not created yet. Review and create them in one tap; earlier months stay unchanged.`)}</p>
    <button type="button" class="btn sm primary" data-action="tc-roll" data-ym="${ym}">${L('দেখুন ও তৈরি করুন', 'Review & create')}</button></section>` : ''}
  <div class="quick four">
    <button type="button" class="qbtn" data-action="tc-stu-add"><span class="qi">${icon('cap')}</span>${L('শিক্ষার্থী', 'Student')}</button>
    <button type="button" class="qbtn" data-action="tc-goto" data-tab="money" data-sub="dues"><span class="qi">${icon('wallet')}</span>${L('পাওনা', 'Dues')}</button>
    <button type="button" class="qbtn" data-action="tc-exp-add"><span class="qi">${icon('receipt')}</span>${L('খরচ', 'Expense')}</button>
    <button type="button" class="qbtn" data-action="tc-roll" data-ym="${ym}"><span class="qi">${icon('cal')}</span>${L('মাস তৈরি', 'New month')}</button></div>
  <div class="stat-grid mt12">
    ${tcStat('earned', L('মোট মাসিক আয়', 'Monthly income'), tcM(m.earned), L('অর্জিত (নির্ধারিত)', 'earned (scheduled)'))}
    ${tcStat('received', L('বাস্তবে প্রাপ্ত', 'Actually received'), tcM(m.received), L('এই মাসে হাতে এসেছে', 'came in this month'))}
    ${tcStat('expense', L('মোট খরচ', 'Total expenses'), tcM(m.expense), m.payable > 0 ? L('অপরিশোধিত ', 'unpaid ') + tcM(m.payable) : L('সব পরিশোধিত', 'all paid'))}
    ${tcStat('profit', L('প্রকৃত লাভ', 'Net profit'), tcM(m.profit), L('আয় − খরচ', 'income − cost'), m.profit < 0 ? 'neg' : 'pos')}
    ${tcStat('cash', L('হাতে থাকা নগদ', 'Cash in hand'), tcM(m.cash.balance), L('প্রারম্ভিক + প্রাপ্ত − পরিশোধ', 'opening + in − out'))}
    ${tcStat('due', L('মোট পাওনা', 'Total receivable'), tcM(m.due), L('আগের ', 'old ') + tcM(m.prevDue) + L(' · নতুন ', ' · new ') + tcM(m.newDue), m.due > 0 ? 'neg' : '')}
    ${tcStat('overdue', L('বকেয়া (সময় পার)', 'Overdue'), tcM(m.overdue), L('নির্ধারিত দিন পেরিয়ে গেছে', 'past the due date'), m.overdue > 0 ? 'neg' : '')}
    ${tcStat('who', L('কার কাছে পাওনা', 'Owed by'), tcM(m.srcRows.private.due + m.srcRows.coaching.due), L('শিক্ষার্থী · প্রতিষ্ঠান ', 'students · institutions ') + tcM(m.srcRows.job.due))}
  </div>
  <section class="card mt12"><div class="card-head"><h2>${L('আজকের ক্লাস', 'Today\'s classes')}</h2><button type="button" class="link" data-action="tc-goto" data-tab="sched">${L('সব দেখুন', 'See all')}</button></div>
    ${todayL.length ? todayL.slice(0, 5).map(tcMiniRow).join('') : `<p class="hint" style="margin:0">${L('আজ কোনো ক্লাস নেই।', 'No classes today.')}</p>`}</section>
  <section class="card"><div class="card-head"><h2>${L('পরবর্তী ক্লাস', 'Next classes')}</h2></div>
    ${nextL.length ? nextL.map(e => `<div class="hg-day"><span><b>${fmtDate(e.date)} · ${e.time ? tcTime(e.time) : '—'}</b><small>${esc(e.who)} · ${esc(e.what)}</small></span></div>`).join('') : `<p class="hint" style="margin:0">${L('আগামী দিনে নির্ধারিত ক্লাস নেই।', 'Nothing scheduled ahead.')}</p>`}</section>
  <section class="card"><div class="card-head"><h2>${L('উৎস অনুযায়ী আয়-ব্যয়', 'Income & cost by source')}</h2></div>
    ${srcs.map(k => { const r = m.srcRows[k];
      return `<div class="brow"><div class="brow-top"><span class="grow">${TC_SRCN[k][2]} ${tcSrcName(k)}</span><span class="amt ${r.profit < 0 ? 'neg' : ''}">${tcM(r.profit)}</span></div><div class="brow-meta"><span>${L('আয়', 'Income')} ${tcM(r.earned)}</span><span>${L('খরচ', 'Cost')} ${tcM(r.expense)}</span></div></div>`; }).join('')}
    <p class="hint">${L('সাধারণ (কোনো চাকরি/শিক্ষার্থী/ব্যাচের সাথে যুক্ত নয়) খরচ "অন্যান্য"-তে। প্রতিটা টাকা ঠিক একবারই গণনা হয়।', 'General costs not tied to a job, student or batch are under "Other". Every amount is counted exactly once.')}</p></section>
  <section class="card"><div class="card-head"><h2>${L('বাজেট ও খরচের খাত', 'Budget & spending by category')}</h2><button type="button" class="link" data-action="tc-budget">${bud.total != null ? L('বদলান', 'Edit') : L('ঠিক করুন', 'Set')}</button></div>
    ${bud.total != null ? `${tcBar(bud.spent / bud.total * 100, bud.spent > bud.total ? 'over' : bud.spent >= bud.total * 0.85 ? 'near' : '')}<div class="brow-meta"><span>${tcM(bud.spent)} / ${tcM(bud.total)}</span><span class="${bud.left < 0 ? 'bad' : 'ok'}">${bud.left < 0 ? tcM(-bud.left) + ' ' + L('বেশি', 'over') : tcM(bud.left) + ' ' + L('বাকি', 'left')}</span></div>` : `<p class="hint" style="margin:0 0 6px">${L('মাসের বাজেট ঠিক করলে কতটা খরচ হলো আর কতটা বাকি তা দেখা যাবে।', 'Set a monthly budget to see what is spent and what is left.')}</p>`}
    ${bud.cats.slice(0, 6).map(c => `<div class="brow"><div class="brow-top"><span class="grow">${tcCat(c.k).e} ${esc(tcCatName(c.k))}</span><span class="amt">${tcM(c.spent)}${c.budget != null ? ` <small>/ ${tcM(c.budget)}</small>` : ''}</span></div>${tcBar(c.budget != null ? c.spent / c.budget * 100 : (bud.spent ? c.spent / bud.spent * 100 : 0), c.budget != null && c.spent > c.budget ? 'over' : '')}</div>`).join('') || `<p class="hint">${L('এই মাসে কোনো খরচ নেই।', 'No expenses this month.')}</p>`}</section>`);
}

/* ---------- ক্লাস ও উপস্থিতি ---------- */
function tcSessRow(e) {
  const id = e.key + (e.moved ? '#m' : '');
  return `<div class="tcs ${e.st}"><div class="tct"><b>${e.time ? tcTime(e.time) : '—'}</b><small>${e.time && e.dur ? e.dur + L(' মি.', ' min') : ''}</small></div>
    <button type="button" class="tcm" data-action="tc-sess" data-id="${esc(id)}" data-date="${e.date}"><b>${TC_SRCN[e.kind === 'batch' ? 'coaching' : e.kind][2]} ${esc(e.who)}</b>
      <small>${esc(e.what)}${e.place ? ' · 📍' + esc(e.place) : ''}</small>
      <span class="tcfl">${e.conflict ? `<i class="w">⚠️ ${L('একই সময়ে আরেকটা ক্লাস', 'Overlaps another class')}</i>` : ''}${e.moved ? `<i>${L('পুনর্নির্ধারিত', 'Rescheduled')}</i>` : ''}${e.extra ? `<i>${L('অতিরিক্ত', 'Extra')}</i>` : ''}${e.st === 'postponed' && e.movedTo ? `<i>→ ${fmtDate(e.movedTo.date)}</i>` : ''}</span></button>
    <div class="tcsa">${e.st === 'pending' ? `<button type="button" class="btn sm primary" data-action="tc-mark" data-id="${esc(id)}" data-date="${e.date}" aria-label="${L('সম্পন্ন', 'Done')}">${icon('check', 18)}</button>` : `<span class="tcb ${e.st}">${tcN(TC_STN, e.st)}</span>`}</div></div>`;
}
function tcCalHtml() {
  const ym = tcUi.cm, cal = tcMonthCal(tcd(), ym, tcUi.sf), td = today(), off = TC_DAYS.indexOf(tcDayKey(tcDate(ym, 1)));
  const cells = Array(off).fill('<span></span>');
  for (let d = 1; d <= tcLastDay(ym); d++) {
    const date = tcDate(ym, d), c = cal[date];
    cells.push(`<button type="button" class="tcc ${date === tcUi.sdate ? 'sel' : ''} ${date === td ? 'td' : ''}" data-action="tc-pick" data-date="${date}"><span>${d}</span>${c ? `<i class="${c.conflict ? 'w' : ''}">${c.n}</i>` : ''}</button>`);
  }
  return `<div class="tcmn"><button type="button" class="icon-btn" data-action="tc-cm" data-d="-1" aria-label="${L('আগের মাস', 'Previous month')}">${icon('prev', 20)}</button><b>${tcYmLabel(ym)}</b><button type="button" class="icon-btn" data-action="tc-cm" data-d="1" aria-label="${L('পরের মাস', 'Next month')}">${icon('next', 20)}</button></div>
    <div class="tcal"><div class="tcw">${TC_DAYS.map(d => `<span>${tcN(TC_DAYN, d)}</span>`).join('')}</div><div class="tcg">${cells.join('')}</div></div>`;
}
function tcSched() {
  const t = tcd(), td = today(), flt = e => tcUi.sf === 'all' || e.kind === tcUi.sf;
  const subs = [['day', L('দিন', 'Day')], ['list', L('আসছে', 'Upcoming')], ['cal', L('ক্যালেন্ডার', 'Calendar')]];
  const fl = [['all', L('সব', 'All')], ['private', L('প্রাইভেট', 'Private')], ['batch', L('ব্যাচ', 'Batch')], ['job', L('চাকরি', 'Job')]];
  let body = '';
  const dayBlock = () => {
    const all = tcDay(t, tcUi.sdate), es = all.filter(flt), conf = all.filter(e => e.conflict).length;
    return `<div class="tcmn"><button type="button" class="icon-btn" data-action="tc-sd" data-d="-1" aria-label="${L('আগের দিন', 'Previous day')}">${icon('prev', 20)}</button><b>${tcUi.sdate === td ? L('আজ', 'Today') + ' · ' : ''}${fmtDate(tcUi.sdate)} · ${tcN(TC_DAYN, tcDayKey(tcUi.sdate))}</b><button type="button" class="icon-btn" data-action="tc-sd" data-d="1" aria-label="${L('পরের দিন', 'Next day')}">${icon('next', 20)}</button></div>
      ${tcUi.sdate !== td ? `<button type="button" class="link" data-action="tc-today">${L('আজকে ফিরুন', 'Back to today')}</button>` : ''}
      ${conf ? `<div class="bsum warn"><b>⚠️ ${L('সময়ের সংঘাত', 'Time clash')}</b><span>${L(`${conf}টা ক্লাস একই সময়ে পড়ছে। একটা স্থগিত বা সময় বদলে নিন।`, `${conf} class(es) overlap. Postpone or move one.`)}</span></div>` : ''}
      <div class="mt12">${es.length ? es.map(tcSessRow).join('') : empty('📅', L('এই দিনে ক্লাস নেই', 'No classes this day'), `<p class="hint">${L('শিক্ষার্থী বা ব্যাচে ক্লাসের দিন ও সময় দিলে এখানে আসবে।', 'Classes appear here once you give days and times to students or batches.')}</p>`)}</div>`;
  };
  if (tcUi.ssub === 'day') body = dayBlock();
  else if (tcUi.ssub === 'cal') body = tcCalHtml() + `<div class="section-title">${fmtDate(tcUi.sdate)}</div>` + (tcDay(t, tcUi.sdate).filter(flt).map(tcSessRow).join('') || `<p class="hint">${L('এই দিনে ক্লাস নেই।', 'No classes this day.')}</p>`);
  else {
    const list = tcUpcoming(t, td, 60, 30).filter(flt);
    let last = '';
    body = list.length ? list.map(e => { const h = e.date !== last ? `<div class="section-title">${e.date === td ? L('আজ', 'Today') : fmtDate(e.date)} · ${tcN(TC_DAYN, tcDayKey(e.date))}</div>` : ''; last = e.date; return h + tcSessRow(e); }).join('')
      : empty('📅', L('আগামী ক্লাস নেই', 'Nothing upcoming'), `<p class="hint">${L('পরের ৩০ দিনে অপেক্ষমাণ কোনো ক্লাস নেই।', 'No pending classes in the next 30 days.')}</p>`);
  }
  return tcPage(`<div class="page-head"><h1>${L('ক্লাস', 'Classes')}</h1><button type="button" class="btn primary sm" data-action="tc-extra">${icon('plus', 18)} ${L('অতিরিক্ত', 'Extra')}</button></div>
    <div class="seg mb12">${subs.map(([k, l]) => `<button type="button" class="${tcUi.ssub === k ? 'active' : ''}" data-action="tc-sv" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="chiprow">${fl.map(([k, l]) => `<button type="button" class="fchip ${tcUi.sf === k ? 'active' : ''}" data-action="tc-sf" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="mt12">${body}</div>`);
}

/* ---------- কাজ: চাকরি, শিক্ষার্থী, কোচিং ---------- */
function tcStuDue(x, id) { return tcSum(x.incomes.filter(i => i.c.studentId === id).map(i => Math.max(0, i.amt - x.paid(i.id)))); }
function tcStuRows(x) {
  const t = tcd(), q = tcUi.q.trim().toLowerCase();
  const list = tcLive(t.students).filter(s => (tcUi.stf === 'all' || s.status === tcUi.stf) && (!q || `${s.name} ${s.cls || ''} ${s.school || ''}`.toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name));
  if (!list.length) return empty('🎓', L('কোনো শিক্ষার্থী নেই', 'No students'), `<p class="hint">${L('উপরের "＋ শিক্ষার্থী" চেপে যোগ করুন।', 'Tap "＋ Student" to add one.')}</p>`);
  const stn = { active: ['পড়ছে', 'Active'], paused: ['বিরতিতে', 'Paused'], left: ['ছেড়েছে', 'Left'] };
  return `<div class="list">${list.map(s => { const due = tcStuDue(x, s.id), nb = tcLive(t.enrolls).filter(e => e.studentId === s.id && !e.to).length, subs = tcLive(s.subjects).filter(u => u.active !== false);
    return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-stu" data-id="${s.id}"><span class="lic">${s.status === 'active' ? '🎓' : s.status === 'paused' ? '⏸️' : '👋'}</span>
      <span class="lmain"><b>${esc(s.name)}</b><small>${[s.cls, s.school].filter(Boolean).map(esc).join(' · ')}${[s.cls, s.school].some(Boolean) ? ' · ' : ''}${subs.map(u => esc(u.name)).join(', ') || L('বিষয় নেই', 'no subject')}${nb ? ` · ${nb} ${L('ব্যাচ', 'batch')}` : ''}${s.status !== 'active' ? ' · ' + stn[s.status][isEN() ? 1 : 0] : ''}</small></span>
      <span class="lend">${due > 0 ? `<b class="neg">${tcM(due)}</b><small>${L('বাকি', 'due')}</small>` : `<small class="pos">${L('বাকি নেই', 'no dues')}</small>`}</span></button></div>`; }).join('')}</div>`;
}
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-tc-q]');
  if (!el) return;
  tcUi.q = el.value;
  const b = $('[data-tc-stulist]'); if (b) b.innerHTML = tcStuRows(tcCtx(tcd()));
});
function tcJobsList(x) {
  const t = tcd(), ym = tcUi.ym, td = today(), jobs = tcLive(t.jobs);
  if (!jobs.length) return empty('💼', L('কোনো চাকরি নেই', 'No jobs yet'), `<p class="hint">${L('স্কুল/কলেজের চাকরি যোগ করলে বেতন, বোনাস, যাতায়াত খরচ আর কোন মাসের বেতন বাকি তা দেখা যাবে।', 'Add a school or college job to track salary, bonuses, travel costs and which month is unpaid.')}</p>`);
  return `<div class="list">${jobs.map(j => { const i = x.incomes.find(z => z.c.kind === 'job' && z.c.jobId === j.id && z.ym === ym), st = i && tcItemState(x, i.id, 'in', td);
    return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-job" data-id="${j.id}"><span class="lic">💼</span>
      <span class="lmain"><b>${esc(j.name)}</b><small>${esc(j.role || '')}${j.role ? ' · ' : ''}${L('বেতন', 'Salary')} ${tcM(tcRateAt(j.salary, ym))}${j.active === false ? ' · ' + L('নিষ্ক্রিয়', 'inactive') : ''}</small></span>
      <span class="lend">${st ? tcBadge(st.status) : `<small>${L('এই মাসের বেতন তৈরি হয়নি', 'not created')}</small>`}</span></button></div>`; }).join('')}</div>`;
}
function tcCoachList() {
  const t = tcd(), ym = tcUi.ym, bats = tcLive(t.batches), cs = tcLive(t.centers);
  if (!bats.length && !cs.length) return empty('🏫', L('কোনো কোচিং নেই', 'No coaching yet'), `<p class="hint">${L('কোচিংয়ের নাম আর ব্যাচ যোগ করুন। প্রতিটা ব্যাচের ফি, খরচ আর লাভ আলাদা থাকবে।', 'Add the coaching and its batches. Each batch keeps its own fees, costs and profit.')}</p>`);
  const x = tcCtx(t);
  const bRow = b => { const n = tcLive(t.enrolls).filter(e => e.batchId === b.id && tcEnrollOk(x, e, ym)).length, r = tcEntityMonths(t, { batchId: b.id }).find(z => z.ym === ym) || { earned: 0, exp: 0, net: 0 };
    return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-bat" data-id="${b.id}"><span class="lic">🏫</span><span class="lmain"><b>${esc(b.name)}${b.code ? ` <small>(${esc(b.code)})</small>` : ''}</b><small>${[b.cls, b.subject].filter(Boolean).map(esc).join(' · ')}${[b.cls, b.subject].some(Boolean) ? ' · ' : ''}${n} ${L('জন', 'students')}${b.active === false ? ' · ' + L('নিষ্ক্রিয়', 'inactive') : ''}</small></span>
      <span class="lend"><b class="${r.net < 0 ? 'neg' : ''}">${tcM(r.net)}</b><small>${L('লাভ', 'profit')}</small></span></button></div>`; };
  const groups = cs.map(c => `<div class="section-title">${esc(c.name)}<button type="button" class="link" style="float:right" data-action="tc-center-edit" data-id="${c.id}">${L('বদলান', 'Edit')}</button></div>${(bats.filter(b => b.centerId === c.id).map(bRow).join('') && `<div class="list">${bats.filter(b => b.centerId === c.id).map(bRow).join('')}</div>`) || `<p class="hint">${L('এই কোচিংয়ে এখনও ব্যাচ নেই।', 'No batches here yet.')}</p>`}`);
  const loose = bats.filter(b => !cs.some(c => c.id === b.centerId));
  return groups.join('') + (loose.length ? `<div class="section-title">${L('কোচিং ছাড়া ব্যাচ', 'Batches without a coaching')}</div><div class="list">${loose.map(bRow).join('')}</div>` : '');
}
function tcWork() {
  const x = tcCtx(tcd());
  const subs = [['job', L('চাকরি', 'Jobs')], ['stu', L('শিক্ষার্থী', 'Students')], ['coach', L('কোচিং', 'Coaching')]];
  const add = { job: ['tc-job-add', L('চাকরি', 'Job')], stu: ['tc-stu-add', L('শিক্ষার্থী', 'Student')], coach: ['tc-bat-add', L('ব্যাচ', 'Batch')] }[tcUi.wsub];
  let body;
  if (tcUi.wsub === 'job') body = tcMonthNav() + tcJobsList(x);
  else if (tcUi.wsub === 'stu') {
    const fl = [['active', L('পড়ছে', 'Active')], ['paused', L('বিরতিতে', 'Paused')], ['left', L('ছেড়েছে', 'Left')], ['all', L('সব', 'All')]];
    body = `<input class="input" type="search" data-tc-q value="${esc(tcUi.q)}" placeholder="${L('নাম, শ্রেণি বা স্কুল খুঁজুন', 'Search name, class or school')}">
      <div class="chiprow mt8">${fl.map(([k, l]) => `<button type="button" class="fchip ${tcUi.stf === k ? 'active' : ''}" data-action="tc-stf" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="mt12" data-tc-stulist>${tcStuRows(x)}</div>`;
  } else body = tcMonthNav() + `<div class="chiprow"><button type="button" class="fchip" data-action="tc-center-add">＋ ${L('কোচিং', 'Coaching')}</button></div><div class="mt8">${tcCoachList()}</div>`;
  return tcPage(`<div class="page-head"><h1>${L('কাজ ও শিক্ষার্থী', 'Work & students')}</h1><button type="button" class="btn primary sm" data-action="${add[0]}">${icon('plus', 18)} ${add[1]}</button></div>
    <div class="seg mb12">${subs.map(([k, l]) => `<button type="button" class="${tcUi.wsub === k ? 'active' : ''}" data-action="tc-wsub" data-v="${k}">${l}</button>`).join('')}</div>${body}`);
}
