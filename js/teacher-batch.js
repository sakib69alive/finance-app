'use strict';

/* =========================================================
   শিক্ষক ব্যবস্থাপনা: ব্যাচ ও শিক্ষার্থী ব্যবস্থাপনা
   দ্রুত অ্যাকশন, ফি আদায়, ব্যাচের উপস্থিতি, পরীক্ষার ফল, নিরাপদ আর্কাইভ/মোছা
   হিসাব: js/teacher-calc.js (পেমেন্ট থেকে প্রতিবার নতুন করে), অর্থ দেখাতে শুধু tcM()
   ========================================================= */

const tcMk = n => (n == null ? '—' : String(Math.round(n * 100) / 100));
const tcAttLine = a => (a && a.total ? `${L('উপস্থিতি', 'Attendance')} ${a.pct}% (${a.present}/${a.total})` : L('উপস্থিতি নেই', 'No attendance yet'));
const tcStBadge = st => (st === 'none' ? `<span class="tcb">${tcN(TC_PAYN, 'none')}</span>` : tcBadge(st));
const tcByName = (a, b) => (a.name || '').localeCompare(b.name || '');
const tcHist = (t, key, id) => (key === 'stu' ? t.charges.some(c => c.studentId === id) || t.expenses.some(e => !e.del && e.studentId === id) : t.charges.some(c => c.batchId === id) || t.expenses.some(e => !e.del && e.batchId === id) || t.exams.some(e => !e.del && e.batchId === id));

/* ---------- দ্রুত অ্যাকশন (নিচের কালো বারের ওপরের ভাসমান বাটন) ---------- */
const tcFab = () => `<button type="button" class="tc-fab" data-action="tc-quick" aria-label="${L('দ্রুত অ্যাকশন', 'Quick actions')}">${icon('plus', 20)} ${L('দ্রুত', 'Quick')}</button>`;
function tcQuickHtml() {
  const t = tcd(), td = today(), m = tcMonth(t, tcYm(td), td);
  const tile = (action, em, label, attrs = '', sub = '') => `<button type="button" class="qa-tile" data-action="${action}" ${attrs}><span class="qi">${em}</span>${label}${sub ? `<small class="${m.due > 0 ? 'neg' : ''}">${sub}</small>` : ''}</button>`;
  return `${sheetHead(L('দ্রুত অ্যাকশন', 'Quick actions'), L('যা করতে চান এক ট্যাপে', 'Everything you do often, one tap away'))}
    <div class="qa-grid">
      ${tile('tc-stu-add', '🎓', L('শিক্ষার্থী যোগ', 'Add Student'))}
      ${tile('tc-bat-add', '🏫', L('ব্যাচ তৈরি', 'Create Batch'))}
      ${tile('tc-att-pick', '✅', L('উপস্থিতি', 'Attendance'))}
      ${tile('tc-collect', '💵', L('ফি নিন', 'Collect Fee'))}
      ${tile('tc-open', '👥', L('সব শিক্ষার্থী', 'All Students'), 'data-tab="work" data-ws="stu"')}
      ${tile('tc-open', '⏳', L('বকেয়া ফি', 'Due Fees'), 'data-tab="money" data-ms="dues" data-ds="open"', m.due > 0 ? tcM(m.due) : '')}
      ${tile('tc-open', '📝', L('পরীক্ষা', 'Exams'), 'data-tab="money" data-ms="exam"')}
      ${tile('tc-open', '🏆', L('ফল', 'Results'), 'data-tab="money" data-ms="res"')}
      ${tile('tc-open', '📊', L('রিপোর্ট', 'Reports'), 'data-tab="money" data-ms="report"')}
    </div>`;
}
Object.assign(ACTIONS, {
  'tc-quick': () => { tcSheetFn = null; tcBack = null; openSheet(tcQuickHtml()); },
  'tc-open': el => {
    if (sheetOpen) closeSheet();
    if (el.dataset.ws) tcUi.wsub = el.dataset.ws;
    if (el.dataset.ms) tcUi.msub = el.dataset.ms;
    if (el.dataset.ds) tcUi.dscope = el.dataset.ds;
    tcGo(el.dataset.tab); window.scrollTo(0, 0);
  },
});

/* ---------- ফি নেওয়া: সবচেয়ে পুরোনো বকেয়া থেকে ভরাট, একই ফি দুবার নয় ---------- */
function tcCollectPickHtml() {
  const t = tcd(), td = today(), rows = tcAllStudents(t, td).filter(r => r.fin.due > 0).sort((a, b) => b.fin.due - a.fin.due);
  return `${sheetHead(L('ফি নিন', 'Collect fee'), L('কার কাছ থেকে নিচ্ছেন?', 'Who is paying?'))}
    ${rows.length ? `<div class="list">${rows.map(r => `<button type="button" class="lrow" data-action="tc-collect" data-id="${r.s.id}"><span class="lic">🎓</span><span class="lmain"><b>${esc(r.s.name)}</b><small>${[r.s.cls].filter(Boolean).map(esc).join('')}${r.s.cls ? ' · ' : ''}${tcStBadge(r.fin.status)}</small></span><span class="lend"><b class="neg">${tcM(r.fin.due)}</b><small>${L('বাকি', 'due')}</small></span></button>`).join('')}</div>`
      : empty('🎉', L('কারো বকেয়া নেই', 'Nobody owes anything'), `<p class="hint">${L('ফি তৈরি না হয়ে থাকলে "আরও → নতুন মাসের হিসাব" থেকে তৈরি করুন।', 'If fees are not created yet, use More → Create a month\'s books.')}</p>`)}`;
}
function tcCollectForm(sid, bid) {
  const t = tcd(), s = tcStu(sid); if (!s) return;
  const fin = tcStuFin(t, sid, today()), plan = tcCollectPlan(t, sid, 1e12, today(), bid || '');
  if (plan.total <= 0) return toast(L('এই শিক্ষার্থীর কোনো বকেয়া নেই', 'This student has nothing due'));
  tcOpenForm(`${sheetHead(L('ফি নিন', 'Collect fee'), esc(s.name))}
    ${tcMinis([[L('মোট ঠিক করা', 'Agreed'), tcM(fin.agreed)], [L('পেয়েছি', 'Paid'), tcM(fin.paid), 'pos'], [L('বাকি', 'Due'), tcM(fin.due), fin.due > 0 ? 'neg' : '']])}
    <form class="mt12" data-form="tc-collect" data-live="tc-collect" data-sid="${sid}" data-bid="${bid || ''}" autocomplete="off">
      ${tcField(L('কত টাকা পেলেন', 'Amount received'), moneyInput('amt', String(plan.total / 100), '0'))}
      <div class="row2">${tcField(L('তারিখ', 'Date'), tcDateIn('date', today()))}${tcField(L('মাধ্যম', 'Method'), tcMethodSel())}</div>
      ${tcField(L('নোট (ঐচ্ছিক)', 'Note (optional)'), tcTxt('note', '', '', 'maxlength="80"'))}
      <div class="bsum ok" data-prev></div>${tcSubmit(L('ফি নিন', 'Record payment'))}</form>
    <p class="hint">${L('টাকা সবচেয়ে পুরোনো মাসের বকেয়া থেকে আগে মিটবে। কম দিলে আংশিক (Partially Paid) থাকবে।', 'Money goes to the oldest unpaid month first. Paying less leaves it Partially Paid.')}</p>`);
}
LIVE['tc-collect'] = f => {
  const p = f.querySelector('[data-prev]'); if (!p) return;
  const pl = tcCollectPlan(tcd(), f.dataset.sid, tcIn(f, 'amt'), today(), f.dataset.bid || '');
  p.className = 'bsum ' + (pl.left > 0 ? 'bad' : 'ok');
  p.innerHTML = pl.left > 0 ? `<b>${L('বকেয়ার চেয়ে বেশি', 'More than what is due')}</b><span>${L('সর্বোচ্চ', 'At most')} ${tcM(pl.total)}</span>`
    : `<b>${pl.total - pl.used > 0 ? L('বাকি থাকবে', 'Will remain due') + ' ' + tcM(pl.total - pl.used) : '✓ ' + L('পুরো বকেয়া মিটে যাবে', 'Fully paid')}</b>${pl.lines.map(l => `<span>${tcYmLabel(l.ym)} · ${tcN(TC_KIND, l.kind)}: ${tcM(l.amt)}${l.rem > 0 ? ` (${L('বাকি', 'left')} ${tcM(l.rem)})` : ' ✓'}</span>`).join('')}`;
};
FORMS['tc-collect'] = f => {
  const t = tcd(), sid = f.dataset.sid, amt = tcIn(f, 'amt'), date = tcV(f, 'date');
  if (!(amt > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter an amount'), 'amt');
  if (!tcDateOk(date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  const pl = tcCollectPlan(t, sid, amt, today(), f.dataset.bid || '');
  if (pl.left > 0) return fail(f, L(`বকেয়ার (${tcM(pl.total)}) বেশি নেওয়া যাবে না`, `Cannot exceed what is due (${tcM(pl.total)})`), 'amt');
  const now = Date.now(), method = tcV(f, 'method') || 'cash', note = tcV(f, 'note');
  pl.lines.forEach(l => t.pays.push({ id: uid(), side: 'in', ref: l.id, amt: l.amt, date, method, note, createdAt: now }));
  tcAfter(L(`${tcM(amt)} জমা হয়েছে`, `${tcM(amt)} recorded`));
};
ACTIONS['tc-collect'] = el => { const sid = el && el.dataset && el.dataset.id; if (sid) { if (!el.closest('.sheet') ) { tcSheetFn = null; tcBack = null; } tcCollectForm(sid, el.dataset.bid); } else { tcSheetFn = null; tcBack = null; openSheet(tcCollectPickHtml()); } };

/* ---------- ব্যাচের দৈনিক উপস্থিতি (উপস্থিত / অনুপস্থিত) ---------- */
function tcRoster(t, bid, date) {
  const ym = tcYm(date), seen = new Set(), out = [];
  tcLive(t.enrolls).filter(e => e.batchId === bid && ym >= e.from && (!e.to || ym <= e.to)).forEach(e => {
    const s = tcStu(e.studentId);
    if (s && !seen.has(s.id) && s.status !== 'paused' && !(s.end && ym > tcYm(s.end))) { seen.add(s.id); out.push(s); }
  });
  return out.sort(tcByName);
}
function tcFindBatRec(t, bid, date) {
  const l = t.sessions.filter(r => !r.del && r.slotId === bid && r.date === date);
  return l.find(r => !r.extra) || l.find(r => r.extra) || null;
}
function tcBatAttSave(t, bid, date, map) {
  let r = tcFindBatRec(t, bid, date);
  if (r) { r.status = 'done'; delete r.movedTo; delete r.mst; }
  else {
    const sched = tcDay(t, date).find(e => e.slotId === bid && !e.extra && !e.moved);
    r = sched ? tcSetSess(sched, 'done') : null;
    if (!r) { r = { id: uid(), key: 'x:' + uid(), slotId: bid, date, time: '', status: 'done', extra: true, att: {}, createdAt: Date.now() }; t.sessions.push(r); }
  }
  r.att = map; return r;
}
function tcBatAttHtml(bid, date) {
  const t = tcd(), b = tcBat(bid); if (!b) return sheetHead(L('ব্যাচ পাওয়া যায়নি', 'Batch not found'));
  tcUi.battDate = date; tcUi.battBat = bid;
  const roster = tcRoster(t, bid, date), rec = tcFindBatRec(t, bid, date), att = (rec && rec.att) || {}, taken = !!(rec && rec.status === 'done');
  const sm = tcBatchAttSummary(t, bid, tcYm(date)), pc = Object.fromEntries(sm.rows.map(r => [r.sid, r.pct]));
  return `${sheetHead(L('উপস্থিতি', 'Attendance'), esc(b.name))}
    <form data-form="tc-batt" data-live="tc-batt" data-bid="${bid}" data-date="${date}" autocomplete="off">
      <div class="tcmn"><button type="button" class="icon-btn" data-action="tc-batt-day" data-d="-1" aria-label="${L('আগের দিন', 'Previous day')}">${icon('prev', 20)}</button><input class="input" type="date" name="date" value="${date}" style="max-width:190px;text-align:center"><button type="button" class="icon-btn" data-action="tc-batt-day" data-d="1" aria-label="${L('পরের দিন', 'Next day')}">${icon('next', 20)}</button></div>
      <p class="hint" style="margin:0 0 8px">${tcN(TC_DAYN, tcDayKey(date))} · ${taken ? `✅ ${L('এই দিনের উপস্থিতি নেওয়া আছে, বদলাতে পারেন', 'Already taken for this day; you can change it')}` : L('এই দিনের উপস্থিতি এখনও নেওয়া হয়নি', 'Not taken for this day yet')}</p>
      ${roster.length ? `<div class="list">${roster.map(s => { const ab = att[s.id] === 'a';
        return `<div class="attrow"><span class="am"><b>${esc(s.name)}</b><small>${L('এই মাসে', 'This month')} ${pc[s.id] != null ? pc[s.id] + '%' : '—'}</small></span><div class="attseg"><label><input type="radio" name="s_${s.id}" value="p" ${ab ? '' : 'checked'}><span class="p">${L('উপস্থিত', 'Present')}</span></label><label><input type="radio" name="s_${s.id}" value="a" ${ab ? 'checked' : ''}><span class="a">${L('অনুপস্থিত', 'Absent')}</span></label></div></div>`; }).join('')}</div>
        <div class="btn-row mt8"><button type="button" class="btn sm" data-action="tc-batt-all" data-v="p">${L('সবাই উপস্থিত', 'All present')}</button><button type="button" class="btn sm" data-action="tc-batt-all" data-v="a">${L('সবাই অনুপস্থিত', 'All absent')}</button></div>
        <div class="bsum ok mt8" data-prev></div>${tcSubmit(L('উপস্থিতি সেভ', 'Save attendance'))}`
        : `<p class="hint">${L('এই দিনে ব্যাচে কোনো শিক্ষার্থী নেই। আগে "ব্যাচে যোগ" করুন।', 'No students in this batch on this day. Add students to the batch first.')}</p>`}
    </form>
    ${taken ? `<button type="button" class="btn danger block mt8" data-action="tc-batt-del" data-id="${bid}" data-date="${date}">${icon('trash', 18)} ${L('এই দিনের উপস্থিতি মুছুন', 'Remove this day\'s attendance')}</button>` : ''}`;
}
LIVE['tc-batt'] = (f, el) => {
  if (el && el.name === 'date') { if (tcDateOk(el.value) && el.value !== tcUi.battDate) openSheet(tcBatAttHtml(f.dataset.bid, el.value)); return; }
  const p = f.querySelector('[data-prev]'); if (!p) return;
  const a = $$('input[type=radio][value=a]:checked', f).length, all = $$('input[type=radio][value=p]', f).length;
  p.innerHTML = `<b>${L('উপস্থিত', 'Present')} ${all - a}</b><span>${L('অনুপস্থিত', 'Absent')} ${a} · ${all ? Math.round((all - a) * 100 / all) : 0}%</span>`;
};
FORMS['tc-batt'] = f => {
  const t = tcd(), bid = f.dataset.bid, date = tcV(f, 'date');
  if (!tcDateOk(date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  if (date > tcShift(today(), 31)) return fail(f, L('ভবিষ্যতের তারিখে উপস্থিতি নেওয়া যায় না', 'Cannot take attendance far in the future'), 'date');
  const map = {};
  tcRoster(t, bid, date).forEach(s => { const v = $$('input[name="s_' + s.id + '"]:checked', f)[0]; map[s.id] = v && v.value === 'a' ? 'a' : 'p'; });
  tcBatAttSave(t, bid, date, map);
  tcUi.sdate = date; tcUi.cm = tcYm(date);
  tcAfter(L('উপস্থিতি সেভ হয়েছে', 'Attendance saved'));
};
Object.assign(ACTIONS, {
  'tc-att-pick': () => {
    const bats = tcLive(tcd().batches).filter(b => b.active !== false && !b.archived);
    if (!bats.length) return toast(L('আগে একটা ব্যাচ তৈরি করুন', 'Create a batch first'), 'danger');
    tcSheetFn = null; tcBack = null;
    if (bats.length === 1) return openSheet(tcBatAttHtml(bats[0].id, today()));
    openSheet(`${sheetHead(L('উপস্থিতি', 'Attendance'), L('কোন ব্যাচের?', 'Which batch?'))}<div class="list">${bats.map(b => `<button type="button" class="lrow" data-action="tc-batt" data-id="${b.id}"><span class="lic">🏫</span><span class="lmain"><b>${esc(b.name)}</b><small>${[b.cls, b.subject].filter(Boolean).map(esc).join(' · ')}</small></span></button>`).join('')}</div>`);
  },
  'tc-batt': el => tcOpenForm(tcBatAttHtml(el.dataset.id, el.dataset.date || today())),
  'tc-batt-day': el => openSheet(tcBatAttHtml(tcUi.battBat, tcShift(tcUi.battDate, +el.dataset.d))),
  'tc-batt-all': el => { const f = el.closest('form'); $$('input[type=radio][value="' + el.dataset.v + '"]', f).forEach(i => { i.checked = true; }); runLive(f, null); },
  'tc-batt-edit': el => tcOpenForm(tcBatAttHtml(el.dataset.id, el.dataset.date)),
  'tc-batt-del': el => {
    const t = tcd(), bid = el.dataset.id, date = el.dataset.date, r = tcFindBatRec(t, bid, date); if (!r) return;
    if (!confirm(L('এই দিনের উপস্থিতি মুছবেন? ক্লাসটা "হয়নি" ধরা হবে।', 'Remove this day\'s attendance? The class will count as not held.'))) return;
    const back = tcBack; tcBack = null;
    undoable(DELETED(), () => { t.sessions = t.sessions.filter(x => x !== r); });
    if (back) { tcSheetFn = back; openSheet(back(), back); } else if (!tcSheetFn) closeSheet();
  },
  'tc-batt-hist': el => tcSheet(() => tcBattHistHtml(el.dataset.id)),
});
function tcBattHistHtml(bid) {
  const t = tcd(), b = tcBat(bid); if (!b) return sheetHead(L('ব্যাচ পাওয়া যায়নি', 'Batch not found'));
  const all = tcBatchAttSummary(t, bid), days = tcBatchDays(t, bid), stu = Object.fromEntries(tcLive(t.students).map(s => [s.id, s]));
  return `${sheetHead(L('উপস্থিতির ইতিহাস', 'Attendance history'), esc(b.name))}
    <button type="button" class="btn primary block" data-action="tc-batt" data-id="${bid}" data-date="${today()}">${icon('check', 18)} ${L('আজকের উপস্থিতি নিন', 'Take today\'s attendance')}</button>
    ${tcMinis([[L('ক্লাস হয়েছে', 'Classes held'), String(all.classes)], [L('গড় উপস্থিতি', 'Average'), all.avgPct == null ? '—' : all.avgPct + '%', all.avgPct != null && all.avgPct < 60 ? 'neg' : 'pos'], [L('শিক্ষার্থী', 'Students'), String(all.rows.length)]])}
    ${all.rows.length ? `<div class="section-title">${L('শিক্ষার্থী অনুযায়ী (এ পর্যন্ত)', 'By student (so far)')}</div><div class="card">${all.rows.sort((p, q) => p.pct - q.pct).map(r => `<div class="brow"><div class="brow-top"><span class="grow">${esc((stu[r.sid] || {}).name || '—')}</span><span class="amt ${r.pct < 60 ? 'neg' : ''}">${r.pct}%</span></div>${tcBar(r.pct, r.pct < 60 ? 'over' : '')}<div class="brow-meta"><span>${L('উপস্থিত', 'Present')} ${r.present}</span><span>${L('অনুপস্থিত', 'Absent')} ${r.absent}</span></div></div>`).join('')}</div>` : ''}
    <div class="section-title">${L('দিন অনুযায়ী', 'By day')} · ${days.length}</div>
    ${days.length ? `<div class="list">${days.map(d => `<div class="lwrap"><button type="button" class="lrow" data-action="tc-batt-edit" data-id="${bid}" data-date="${d.date}"><span class="lic">${d.pct != null && d.pct < 60 ? '⚠️' : '✅'}</span><span class="lmain"><b>${fmtDate(d.date)} · ${tcN(TC_DAYN, tcDayKey(d.date))}</b><small>${L('উপস্থিত', 'Present')} ${d.present.length} · ${L('অনুপস্থিত', 'Absent')} ${d.absent.length}${d.absent.length ? ': ' + d.absent.map(id => esc((stu[id] || {}).name || '')).join(', ') : ''}</small></span><span class="lend"><b>${d.pct == null ? '—' : d.pct + '%'}</b></span></button>${rowTools('tc-batt-edit', 'tc-batt-del', bid, `data-date="${d.date}"`)}</div>`).join('')}</div>`
      : empty('📋', L('এখনও উপস্থিতি নেওয়া হয়নি', 'No attendance yet'), `<p class="hint">${L('ওপরের বাটনে চেপে আজকের উপস্থিতি নিন।', 'Tap the button above to take today\'s attendance.')}</p>`)}`;
}

/* ---------- ব্যাচে একসাথে শিক্ষার্থী যোগ: আগে থেকে থাকা শিক্ষার্থী বেছে নেওয়া, নকল তৈরি হয় না ---------- */
function tcEnrMultiHtml(bid) {
  const t = tcd(), b = tcBat(bid); if (!b) return sheetHead(L('ব্যাচ পাওয়া যায়নি', 'Batch not found'));
  const curYm = tcYm(today()), inB = new Set(tcLive(t.enrolls).filter(e => e.batchId === bid && (!e.to || e.to >= curYm)).map(e => e.studentId));
  const list = tcLive(t.students).filter(s => s.status === 'active' && !s.archived && !inB.has(s.id)).sort(tcByName);
  return `${sheetHead(L('ব্যাচে শিক্ষার্থী যোগ', 'Add students to batch'), esc(b.name))}
    <form data-form="tc-enr-multi" data-bid="${bid}" autocomplete="off">
      <input class="input" type="search" data-tc-pick placeholder="${L('নাম খুঁজুন', 'Search name')}">
      <div class="list mt8" style="max-height:38vh;overflow:auto">${list.length ? list.map(s => `<label class="check tcpick" data-n="${esc(s.name.toLowerCase())}"><input type="checkbox" name="sid" value="${s.id}"><span><b>${esc(s.name)}</b><small class="faint"> ${[s.cls, s.school].filter(Boolean).map(esc).join(' · ')}</small></span></label>`).join('') : `<p class="hint" style="padding:12px">${L('সব সক্রিয় শিক্ষার্থী আগেই এই ব্যাচে আছে, বা কোনো শিক্ষার্থী নেই।', 'Every active student is already here, or there are no students yet.')}</p>`}</div>
      <div class="row2 mt8">${tcField(L('মাসিক ফি (প্রতিজন)', 'Monthly fee (each)'), moneyInput('fee', b.fee ? String(b.fee / 100) : '', '0'))}${tcField(L('শুরুর মাস', 'Start month'), tcMonthIn('from', tcUi.ym))}</div>
      ${list.length ? tcSubmit(L('বাছাইকৃতদের যোগ করুন', 'Add selected')) : ''}</form>
    <button type="button" class="btn block mt8" data-action="tc-stu-add" data-bid="${bid}">＋ ${L('একদম নতুন শিক্ষার্থী', 'A brand-new student')}</button>
    <p class="hint">${L('আগে থেকে থাকা শিক্ষার্থীকে এখান থেকে বাছুন: একই নামে দ্বিতীয় রেকর্ড তৈরি হবে না, ফি-পেমেন্ট-উপস্থিতি এক জায়গায় থাকবে।', 'Pick existing students here so no duplicate record is created and fees, payments and attendance stay in one place.')}</p>`;
}
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-tc-pick]'); if (!el) return;
  const q = el.value.trim().toLowerCase(); $$('.tcpick', el.closest('form')).forEach(l => l.classList.toggle('hidden', !!q && !l.dataset.n.includes(q)));
});
FORMS['tc-enr-multi'] = f => {
  const t = tcd(), bid = f.dataset.bid, ids = $$('input[name="sid"]:checked', f).map(i => i.value), fee = tcIn(f, 'fee'), from = tcV(f, 'from');
  if (!ids.length) return fail(f, L('অন্তত একজনকে বাছুন', 'Pick at least one student'));
  if (!(fee > 0)) return fail(f, L('ফি লিখুন', 'Enter the fee'), 'fee');
  if (!tcYmOk(from)) return fail(f, L('মাস ঠিক নেই (যেমন 2026-10)', 'Check the month (e.g. 2026-10)'), 'from');
  let n = 0;
  ids.forEach(sid => { if (!tcStu(sid) || t.enrolls.some(e => !e.del && e.studentId === sid && e.batchId === bid && (!e.to || e.to >= from))) return; t.enrolls.push({ id: uid(), studentId: sid, batchId: bid, from, to: '', fees: [{ from, amt: fee }], createdAt: Date.now() }); n++; });
  tcAfter(L(`${cnt(n)} জন যোগ হয়েছে`, `${n} added`));
};

/* ---------- নিরাপদে সরানো: বকেয়ার সতর্কতা, আর্কাইভ, পূর্ণ মোছা শুধু ইতিহাস না থাকলে ---------- */
function tcRemoveStuHtml(id) {
  const t = tcd(), s = tcStu(id); if (!s) return sheetHead(L('শিক্ষার্থী পাওয়া যায়নি', 'Student not found'));
  const fin = tcStuFin(t, id, today()), open = fin.items.filter(i => i.rem > 0), hist = tcHist(t, 'stu', id);
  return `${sheetHead(s.archived ? L('আর্কাইভ করা শিক্ষার্থী', 'Archived student') : L('শিক্ষার্থী সরান', 'Remove student'), esc(s.name))}
    ${fin.due > 0 ? `<div class="bsum bad"><b>⚠️ ${L(`${tcM(fin.due)} বাকি আছে`, `${tcM(fin.due)} is still unpaid`)}</b><span>${L(`${open.length}টা ফি অপরিশোধিত`, `${open.length} unpaid fee(s)`)}${fin.overdue > 0 ? ' · ' + L('সময় পার', 'overdue') + ' ' + tcM(fin.overdue) : ''}. ${L('আর্কাইভ করলেও এই বকেয়া আপনার পাওনায় থেকে যাবে, কখনো মুছে যাবে না।', 'Archiving keeps this balance in your receivables; it is never erased.')}</span></div>
      <button type="button" class="btn primary block mt8" data-action="tc-collect" data-id="${id}">💵 ${L('আগে বকেয়া নিন', 'Collect the dues first')}</button>`
      : `<div class="bsum ok"><b>✓ ${L('কোনো বকেয়া নেই', 'No dues')}</b><span>${L('সব ফি পরিশোধিত।', 'All fees are paid.')}</span></div>`}
    <div class="menu mt12">${s.archived
      ? tcMenu('tc-stu-unarchive', 'undo', L('আবার সক্রিয় করুন', 'Restore student'), L('আবার সক্রিয় তালিকায় আসবে, নতুন মাস থেকে ফি তৈরি হবে', 'Back in the active list; fees are created again'), id)
      : tcMenu('tc-stu-archive', 'clock', L('আর্কাইভ করুন (প্রস্তাবিত)', 'Archive (recommended)'), L('সক্রিয় তালিকা থেকে সরে যাবে, নতুন ফি তৈরি হবে না। পেমেন্ট, ফি, উপস্থিতি ও ফলের ইতিহাস থাকবে।', 'Leaves the active list, no new fees. Payments, fees, attendance and results are kept.'), id)}
      ${hist ? '' : tcDanger('tc-stu-purge', L('পুরোপুরি ডিলিট', 'Delete permanently'), L('এর কোনো ফি বা খরচ নেই, তাই মোছা যায়। ফিরিয়ে আনার সুযোগ থাকবে।', 'It has no fees or costs, so it can be deleted. You can undo right after.'), id)}</div>
    ${hist ? `<p class="hint">${L('এর ফি/পেমেন্টের ইতিহাস আছে, তাই পুরোপুরি ডিলিট করা যায় না। হিসাব ঠিক রাখতে আর্কাইভ করুন।', 'It has fee/payment history, so it cannot be deleted outright. Archive it to keep your books correct.')}</p>` : ''}`;
}
function tcRemoveBatHtml(id) {
  const t = tcd(), b = tcBat(id); if (!b) return sheetHead(L('ব্যাচ পাওয়া যায়নি', 'Batch not found'));
  const bf = tcBatchFin(t, id, today()), hist = tcHist(t, 'bat', id), n = tcLive(t.enrolls).filter(e => e.batchId === id && !e.to).length;
  return `${sheetHead(b.archived ? L('আর্কাইভ করা ব্যাচ', 'Archived batch') : L('ব্যাচ সরান', 'Remove batch'), esc(b.name))}
    ${tcMinis([[L('এখন শিক্ষার্থী', 'Students now'), String(n)], [L('আদায় হয়েছে', 'Collected'), tcM(bf.collected), 'pos'], [L('বাকি', 'Due'), tcM(bf.due), bf.due > 0 ? 'neg' : '']])}
    ${bf.due > 0 ? `<div class="bsum bad mt8"><b>⚠️ ${L(`${tcM(bf.due)} ফি বাকি আছে`, `${tcM(bf.due)} of fees are unpaid`)}</b><span>${L('আর্কাইভ করলেও এই বকেয়া পাওনায় থেকে যাবে এবং শিক্ষার্থীদের কাছ থেকে নেওয়া যাবে।', 'Archiving keeps this in your receivables and you can still collect it from the students.')}</span></div>` : ''}
    <div class="menu mt12">${b.archived
      ? tcMenu('tc-bat-unarchive', 'undo', L('আবার সক্রিয় করুন', 'Restore batch'), L('আবার ক্লাস ও ফি তৈরি হবে', 'Classes and fees are created again'), id)
      : tcMenu('tc-bat-archive', 'clock', L('আর্কাইভ করুন (প্রস্তাবিত)', 'Archive (recommended)'), L('ক্লাস ও নতুন ফি বন্ধ, কিন্তু সব ইতিহাস আর বকেয়া থাকবে।', 'Stops classes and new fees; all history and dues stay.'), id)}
      ${hist ? '' : tcDanger('tc-bat-purge', L('পুরোপুরি ডিলিট', 'Delete permanently'), L('এর কোনো ফি বা খরচ নেই, তাই মোছা যায়। ফিরিয়ে আনার সুযোগ থাকবে।', 'It has no fees or costs, so it can be deleted. You can undo right after.'), id)}</div>
    ${hist ? `<p class="hint">${L('এর ফি/খরচের ইতিহাস আছে, তাই পুরোপুরি ডিলিট করা যায় না। আর্কাইভ করুন।', 'It has fee/cost history, so it cannot be deleted outright. Archive it.')}</p>` : ''}`;
}
function tcEnrRmHtml(eid) {
  const t = tcd(), e = t.enrolls.find(z => z.id === eid && !z.del); if (!e) return sheetHead(L('পাওয়া যায়নি', 'Not found'));
  const s = tcStu(e.studentId), b = tcBat(e.batchId), fin = tcStuFin(t, e.studentId, today()), due = tcSum(fin.items.filter(i => i.batchId === e.batchId).map(i => i.rem));
  return `${sheetHead(L('ব্যাচ থেকে বাদ দিন', 'Remove from batch'), `${s ? esc(s.name) : ''} · ${b ? esc(b.name) : ''}`)}
    ${due > 0 ? `<div class="bsum bad"><b>⚠️ ${L(`এই ব্যাচে ${tcM(due)} বাকি আছে`, `${tcM(due)} is unpaid for this batch`)}</b><span>${L('বাদ দিলেও এই বকেয়া থেকে যাবে, মুছে যাবে না।', 'Removing keeps this balance; it is not erased.')}</span></div><button type="button" class="btn primary block mt8" data-action="tc-collect" data-id="${e.studentId}" data-bid="${e.batchId}">💵 ${L('আগে বকেয়া নিন', 'Collect it first')}</button>` : `<div class="bsum ok"><b>✓ ${L('এই ব্যাচে কোনো বকেয়া নেই', 'Nothing unpaid in this batch')}</b></div>`}
    <form class="mt12" data-form="tc-enr-rm" data-id="${e.id}" autocomplete="off">${tcField(L('কোন মাস থেকে ফি বন্ধ', 'Stop fees from month'), tcMonthIn('from', tcUi.ym))}<button class="btn danger block" type="submit">${L('ব্যাচ থেকে বাদ দিন', 'Remove from batch')}</button></form>
    <p class="hint">${L('পুরোনো উপস্থিতি, পেমেন্ট ও ফি ইতিহাসে থাকবে। শিক্ষার্থীর রেকর্ড মুছবে না।', 'Past attendance, payments and fees stay in history. The student record is not deleted.')}</p>`;
}
Object.assign(ACTIONS, {
  'tc-stu-archive': el => {
    const t = tcd(), s = tcStu(el.dataset.id); if (!s) return;
    const due = tcStuFin(t, s.id, today()).due;
    if (!confirm(due > 0 ? L(`${tcM(due)} এখনও বাকি। আর্কাইভ করলেও বকেয়া পাওনায় থাকবে। চালিয়ে যাবেন?`, `${tcM(due)} is still unpaid. It stays in your receivables. Archive anyway?`) : L('আর্কাইভ করবেন? পরে আবার সক্রিয় করা যাবে।', 'Archive this student? You can restore later.'))) return;
    tcSheetFn = null; tcBack = null; closeSheet();
    undoable(L('আর্কাইভ হয়েছে', 'Archived'), () => { s.status = 'left'; s.end = s.end || today(); s.archived = true; });
  },
  'tc-stu-unarchive': el => { const s = tcStu(el.dataset.id); if (!s) return; s.archived = false; s.status = 'active'; s.end = ''; tcSheetFn = null; tcBack = null; closeSheet(); commit(L('আবার সক্রিয়', 'Restored')); },
  'tc-stu-purge': el => {
    const t = tcd(), s = tcStu(el.dataset.id); if (!s) return;
    if (tcHist(t, 'stu', s.id)) return toast(L('ইতিহাস আছে, তাই ডিলিট নয়। আর্কাইভ করুন।', 'It has history; archive it instead.'), 'danger');
    if (!confirm(L('এই শিক্ষার্থী পুরোপুরি ডিলিট করবেন?', 'Delete this student permanently?'))) return;
    tcSheetFn = null; tcBack = null; closeSheet();
    undoable(DELETED(), () => { s.del = true; t.enrolls.forEach(e => { if (e.studentId === s.id) e.del = true; }); });
  },
  'tc-bat-archive': el => {
    const t = tcd(), b = tcBat(el.dataset.id); if (!b) return;
    const due = tcBatchFin(t, b.id, today()).due;
    if (!confirm(due > 0 ? L(`${tcM(due)} ফি বাকি। আর্কাইভ করলেও বকেয়া পাওনায় থাকবে। চালিয়ে যাবেন?`, `${tcM(due)} of fees are unpaid and stay receivable. Archive anyway?`) : L('ব্যাচ আর্কাইভ করবেন? পরে আবার সক্রিয় করা যাবে।', 'Archive this batch? You can restore it later.'))) return;
    tcSheetFn = null; tcBack = null; closeSheet();
    undoable(L('আর্কাইভ হয়েছে', 'Archived'), () => { b.archived = true; b.active = false; });
  },
  'tc-bat-unarchive': el => { const b = tcBat(el.dataset.id); if (!b) return; b.archived = false; b.active = true; tcSheetFn = null; tcBack = null; closeSheet(); commit(L('আবার সক্রিয়', 'Restored')); },
  'tc-bat-purge': el => {
    const t = tcd(), b = tcBat(el.dataset.id); if (!b) return;
    if (tcHist(t, 'bat', b.id)) return toast(L('ইতিহাস আছে, তাই ডিলিট নয়। আর্কাইভ করুন।', 'It has history; archive it instead.'), 'danger');
    if (!confirm(L('এই ব্যাচ পুরোপুরি ডিলিট করবেন?', 'Delete this batch permanently?'))) return;
    tcSheetFn = null; tcBack = null; closeSheet();
    undoable(DELETED(), () => { b.del = true; t.enrolls.forEach(e => { if (e.batchId === b.id) e.del = true; }); });
  },
  'tc-enr-rm-ask': el => tcOpenForm(tcEnrRmHtml(el.dataset.id)),
  'tc-show-arch': () => { tcUi.showArch = !tcUi.showArch; render(); },
});

/* ---------- পরীক্ষা: ফল ও সারাংশ ---------- */
function tcExamOpenHtml(id) {
  const t = tcd(), ex = t.exams.find(z => z.id === id && !z.del); if (!ex) return sheetHead(L('পরীক্ষা পাওয়া যায়নি', 'Exam not found'));
  const sm = tcExamSummary(t, ex), b = tcBat(ex.batchId), graded = sm.rows.filter(r => r.marks != null).sort((p, q) => q.marks - p.marks), miss = sm.rows.filter(r => r.marks == null);
  return `${sheetHead(esc(ex.name), [fmtDate(ex.date), ex.subject, b && b.name].filter(Boolean).map(esc).join(' · '))}
    ${tcMinis([[L('গড় নম্বর', 'Average'), tcMk(sm.avg)], [L('সর্বোচ্চ', 'Highest'), tcMk(sm.high), 'pos'], [L('পাস', 'Passed'), sm.graded ? `${sm.passed}/${sm.graded}` : '—']])}
    <p class="hint" style="margin:8px 0">${L('পূর্ণমান', 'Total marks')} <b>${sm.total || '—'}</b> · ${L('পাস নম্বর', 'Pass mark')} ${sm.pass}% · ${L('শিক্ষার্থী', 'Students')} ${sm.rows.length}${sm.missing ? ` · ${L('নম্বর বাকি', 'not entered')} ${sm.missing}` : ''}</p>
    <button type="button" class="btn primary block" data-action="tc-exam-res" data-id="${id}">${icon('edit', 18)} ${graded.length ? L('নম্বর বদলান', 'Edit marks') : L('নম্বর লিখুন', 'Enter marks')}</button>
    ${graded.length ? `<div class="section-title">${L('ফলাফল (ক্রমানুসারে)', 'Results (ranked)')}</div><div class="list">${graded.map(r => `<button type="button" class="lrow" data-action="tc-stu" data-id="${r.sid}"><span class="lic">${r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}</span><span class="lmain"><b>${esc(r.name)}</b><small>${r.pct != null ? r.pct + '%' : ''}${sm.total && r.marks / sm.total * 100 < sm.pass ? ' · ' + L('অকৃতকার্য', 'below pass mark') : ''}</small></span><span class="lend"><b>${tcMk(r.marks)}</b>${sm.total ? `<small>/ ${sm.total}</small>` : ''}</span></button>`).join('')}</div>` : ''}
    ${miss.length ? `<div class="section-title">${L('নম্বর লেখা হয়নি', 'Marks not entered')}</div><p class="hint">${miss.map(r => esc(r.name)).join(', ')}</p>` : ''}
    <div class="menu mt12">${tcMenu('tc-exam-edit', 'edit', L('পরীক্ষার তথ্য সম্পাদনা', 'Edit exam details'), L('নাম, তারিখ, বিষয়, পূর্ণমান, কোন শিক্ষার্থী, খরচ', 'Name, date, subject, total marks, students, cost'), id)}
      ${tcDanger('tc-exam-del', L('পরীক্ষা ডিলিট', 'Delete exam'), L('ফল ও পরীক্ষার খরচ দুটোই সরে যাবে, ফিরিয়ে আনা যাবে', 'Removes results and the exam cost; you can undo'), id)}</div>`;
}
function tcExamResForm(id) {
  const t = tcd(), ex = t.exams.find(z => z.id === id && !z.del); if (!ex) return;
  const roster = tcExamRoster(t, ex), res = ex.results || {};
  tcOpenForm(`${sheetHead(L('পরীক্ষার নম্বর', 'Exam marks'), `${esc(ex.name)}${ex.marks ? ' · ' + L('পূর্ণমান', 'out of') + ' ' + ex.marks : ''}`)}
    <form data-form="tc-exam-res" data-live="tc-exam-res" data-id="${id}" autocomplete="off">
      ${roster.length ? `<div class="list">${roster.map(s => `<div class="attrow"><span class="am"><b>${esc(s.name)}</b><small>${[s.cls].filter(Boolean).map(esc).join('')}</small></span><input class="input" style="width:96px;text-align:right" name="m_${s.id}" inputmode="decimal" value="${res[s.id] != null && res[s.id] !== '' ? esc(String(res[s.id])) : ''}" placeholder="—"></div>`).join('')}</div>
        <p class="hint">${L('অনুপস্থিত বা এখনও নম্বর পাননি এমন হলে ঘর ফাঁকা রাখুন।', 'Leave a box empty if the student was absent or not graded yet.')}</p>
        <div class="bsum ok" data-prev></div>${tcSubmit(L('নম্বর সেভ', 'Save marks'))}`
        : `<p class="hint">${L('এই পরীক্ষায় কোনো শিক্ষার্থী নেই। পরীক্ষা সম্পাদনা করে ব্যাচ বা শিক্ষার্থী বাছুন।', 'No students in this exam. Edit the exam to pick a batch or students.')}</p>`}
    </form>`);
}
LIVE['tc-exam-res'] = f => {
  const ex = tcd().exams.find(z => z.id === f.dataset.id), p = f.querySelector('[data-prev]'); if (!ex || !p) return;
  const vals = $$('input[name^="m_"]', f).map(i => i.value.trim()).filter(v => v !== '').map(tcNum), tot = tcNum(ex.marks);
  p.innerHTML = vals.length ? `<b>${L('গড়', 'Average')} ${tcMk(Math.round(tcSum(vals) / vals.length * 10) / 10)}</b><span>${L('সর্বোচ্চ', 'Highest')} ${tcMk(Math.max(...vals))} · ${L('লেখা হয়েছে', 'entered')} ${vals.length}${tot ? ` · ${L('পূর্ণমান', 'out of')} ${tot}` : ''}</span>` : `<span>${L('এখনও কোনো নম্বর লেখা হয়নি', 'No marks entered yet')}</span>`;
};
FORMS['tc-exam-res'] = f => {
  const t = tcd(), ex = t.exams.find(z => z.id === f.dataset.id && !z.del); if (!ex) return closeSheet();
  const tot = tcNum(ex.marks), res = {};
  for (const inp of $$('input[name^="m_"]', f)) {
    const v = inp.value.trim(); if (v === '') continue;
    const n = tcNum(v);
    if (!(n >= 0) || (tot > 0 && n > tot)) return fail(f, L(`নম্বর ০ থেকে ${tot || 'পূর্ণমান'}-এর মধ্যে হতে হবে`, `Marks must be between 0 and ${tot || 'the total'}`), inp.name);
    res[inp.name.slice(2)] = n;
  }
  ex.results = res; tcAfter(SAVED());
};
// টাকা-ট্যাবের "ফল": ব্যাচ অনুযায়ী পরীক্ষা ও শিক্ষার্থী অনুযায়ী গড়
function tcResultsTab() {
  const t = tcd(), bats = tcLive(t.batches), flt = tcUi.rbat || 'all';
  const exams = tcLive(t.exams).filter(e => flt === 'all' || e.batchId === flt).filter(e => tcNum(e.marks) > 0 || Object.keys(e.results || {}).length).sort(byDateDesc);
  const per = {};
  exams.forEach(ex => { const sm = tcExamSummary(t, ex); sm.rows.forEach(r => { if (r.pct == null) return; const p = per[r.sid] || (per[r.sid] = { name: r.name, sum: 0, n: 0 }); p.sum += r.pct; p.n++; }); });
  const stu = Object.entries(per).map(([sid, p]) => ({ sid, name: p.name, avg: Math.round(p.sum / p.n * 10) / 10, n: p.n })).sort((a, b) => b.avg - a.avg);
  return `<div class="page-head"><h1>${L('পরীক্ষার ফল', 'Results')}</h1><button type="button" class="btn primary sm" data-action="tc-exam-add">${icon('plus', 18)} ${L('পরীক্ষা', 'Exam')}</button></div>
    <div class="mt8">${tcSel('rbat', [['all', L('সব ব্যাচ', 'All batches')]].concat(bats.map(b => [b.id, esc(b.name)])), flt).replace('<select', '<select data-tc-rbat')}</div>
    <div class="section-title">${L('পরীক্ষা অনুযায়ী (ব্যাচ-ভিত্তিক সারাংশ)', 'By exam (batch summary)')}</div>
    ${exams.length ? `<div class="list">${exams.map(ex => { const sm = tcExamSummary(t, ex), b = tcBat(ex.batchId);
      return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-exam-open" data-id="${ex.id}"><span class="lic">🏆</span><span class="lmain"><b>${esc(ex.name)}</b><small>${fmtDate(ex.date)}${ex.subject ? ' · ' + esc(ex.subject) : ''}${b ? ' · ' + esc(b.name) : ''} · ${sm.graded}/${sm.rows.length} ${L('নম্বর লেখা', 'graded')}</small></span><span class="lend"><b>${sm.avg == null ? '—' : tcMk(sm.avg)}</b><small>${sm.total ? L('গড় / ', 'avg / ') + sm.total : L('গড়', 'avg')}</small></span></button>${rowTools('tc-exam-res', 'tc-exam-del', ex.id)}</div>`; }).join('')}</div>`
      : empty('🏆', L('কোনো ফল নেই', 'No results yet'), `<p class="hint">${L('পরীক্ষা তৈরি করে পূর্ণমান দিন, তারপর শিক্ষার্থীদের নম্বর লিখুন।', 'Create an exam with total marks, then enter each student\'s marks.')}</p>`)}
    ${stu.length ? `<div class="section-title">${L('শিক্ষার্থী অনুযায়ী (গড় %)', 'By student (average %)')}</div><div class="card">${stu.map(r => `<button type="button" class="brow" style="width:100%;text-align:left" data-action="tc-stu" data-id="${r.sid}"><div class="brow-top"><span class="grow">${esc(r.name)}</span><span class="amt">${r.avg}%</span></div>${tcBar(r.avg)}<div class="brow-meta"><span>${r.n} ${L('টা পরীক্ষা', 'exam(s)')}</span></div></button>`).join('')}</div>` : ''}`;
}
document.addEventListener('change', e => { const el = e.target.closest && e.target.closest('[data-tc-rbat]'); if (!el) return; tcUi.rbat = el.value; render(); });
Object.assign(ACTIONS, {
  'tc-exam-open': el => tcSheet(() => tcExamOpenHtml(el.dataset.id)),
  'tc-exam-res': el => { const had = sheetOpen; if (!had) { tcSheetFn = null; tcBack = null; } tcExamResForm(el.dataset.id); },
});
// শিক্ষার্থীর প্রোফাইলে ও ব্যাচে ফলের তালিকা
function tcStuResultsHtml(sid) {
  const rs = tcStuResults(tcd(), sid); if (!rs.length) return `<p class="hint">${L('এখনও কোনো পরীক্ষার ফল নেই।', 'No exam results yet.')}</p>`;
  return `<div class="list">${rs.map(r => `<button type="button" class="lrow" data-action="tc-exam-open" data-id="${r.ex.id}"><span class="lic">${r.rank === 1 ? '🥇' : '📝'}</span><span class="lmain"><b>${esc(r.ex.name)}</b><small>${fmtDate(r.ex.date)}${r.ex.subject ? ' · ' + esc(r.ex.subject) : ''}${r.rank ? ` · ${L('অবস্থান', 'rank')} ${r.rank}/${r.of}` : ''}</small></span><span class="lend"><b>${tcMk(r.marks)}</b><small>${r.total ? '/ ' + r.total + (r.pct != null ? ' · ' + r.pct + '%' : '') : ''}</small></span></button>`).join('')}</div>`;
}
function tcBatResultsHtml(bid) {
  const t = tcd(), ex = tcLive(t.exams).filter(e => e.batchId === bid).sort(byDateDesc); if (!ex.length) return `<p class="hint">${L('এই ব্যাচের কোনো পরীক্ষা নেই।', 'No exams for this batch.')}</p>`;
  return `<div class="list">${ex.map(e => { const sm = tcExamSummary(t, e); return `<button type="button" class="lrow" data-action="tc-exam-open" data-id="${e.id}"><span class="lic">📝</span><span class="lmain"><b>${esc(e.name)}</b><small>${fmtDate(e.date)} · ${sm.graded}/${sm.rows.length} ${L('নম্বর লেখা', 'graded')}</small></span><span class="lend"><b>${sm.avg == null ? '—' : tcMk(sm.avg)}</b><small>${L('গড়', 'avg')}${sm.total ? ' / ' + sm.total : ''}</small></span></button>`; }).join('')}</div>`;
}
