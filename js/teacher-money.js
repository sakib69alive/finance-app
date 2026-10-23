'use strict';

/* =========================================================
   শিক্ষক ব্যবস্থাপনা: টাকা-ট্যাব (পাওনা, খরচ, পরীক্ষা, সামগ্রী), বিস্তারিত শিট, রিপোর্ট, "আরও"
   অর্থ দেখাতে শুধু tcM() (প্রকৃত + ১ টাকা)। "প্রকৃত হিসাব" নামে চিহ্নিত টেবিলেই কেবল tcRaw()।
   ========================================================= */

/* ---------- পাওনা ---------- */
function tcDuesTab() {
  const t = tcd(), x = tcCtx(t), td = today(), ym = tcUi.ym;
  let rows = x.incomes.map(i => ({ i, st: tcItemState(x, i.id, 'in', td) }));
  rows = rows.filter(({ i, st }) => (tcUi.dscope === 'month' ? i.ym === ym : st.rem > 0) && (tcUi.dst === 'all' || st.status === tcUi.dst));
  rows.sort((a, b) => (b.st.status === 'overdue') - (a.st.status === 'overdue') || (a.i.due || '').localeCompare(b.i.due || '') || a.i.id.localeCompare(b.i.id));
  const tot = tcSum(rows.map(r => r.i.amt)), got = tcSum(rows.map(r => Math.min(r.i.amt, r.st.paid))), rem = tcSum(rows.map(r => r.st.rem));
  const sc = [['month', L('এই মাস', 'This month')], ['open', L('সব বকেয়া', 'All unpaid')]];
  const fl = [['all', L('সব', 'All')], ['unpaid', 'Due'], ['partial', 'Partially Paid'], ['overdue', 'Overdue'], ['paid', 'Paid']];
  const sec = (title, list) => (list.length ? `<div class="section-title">${title} · ${list.length}</div><div class="list">${list.map(r => tcIncRow(x, r.i, td)).join('')}</div>` : '');
  const body = rows.length ? (tcUi.dscope === 'open'
    ? sec(L('আগের মাসের বকেয়া', 'Dues from earlier months'), rows.filter(r => r.i.ym < ym)) + sec(L('এই মাসের নতুন ফি', 'New fees this month'), rows.filter(r => r.i.ym === ym)) + sec(L('পরের মাসের', 'Later months'), rows.filter(r => r.i.ym > ym))
    : `<div class="list">${rows.map(r => tcIncRow(x, r.i, td)).join('')}</div>`)
    : empty('💰', L('কিছু নেই', 'Nothing here'), `<p class="hint">${tcPlan(t, ym).length ? L('এই মাসের ফি এখনও তৈরি হয়নি। "আরও → মাস তৈরি" থেকে তৈরি করুন।', 'This month\'s fees are not created yet. Create them from More → New month.') : L('ফিল্টার বদলে দেখুন বা আয় যোগ করুন।', 'Change the filters or add income.')}</p>`);
  return `<div class="page-head"><h1>${L('পাওনা ও আয়', 'Dues & income')}</h1><button type="button" class="btn primary sm" data-action="tc-inc-add">${icon('plus', 18)} ${L('আয়', 'Income')}</button></div>
    ${tcMonthNav()}
    <div class="minis"><div class="mini"><small>${L('নির্ধারিত', 'Scheduled')}</small><b>${tcM(tot)}</b></div><div class="mini"><small>${L('প্রাপ্ত', 'Received')}</small><b class="pos">${tcM(got)}</b></div><div class="mini"><small>${L('বাকি', 'Due')}</small><b class="${rem > 0 ? 'neg' : ''}">${tcM(rem)}</b></div></div>
    <div class="seg mt12">${sc.map(([k, l]) => `<button type="button" class="${tcUi.dscope === k ? 'active' : ''}" data-action="tc-dscope" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="chiprow mt8">${fl.map(([k, l]) => `<button type="button" class="fchip ${tcUi.dst === k ? 'active' : ''}" data-action="tc-dst" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="mt12">${body}</div>`;
}

/* ---------- খরচ ---------- */
function tcExpTab() {
  const t = tcd(), x = tcCtx(t), td = today(), ym = tcUi.ym, m = tcMonth(t, ym, td);
  const srcs = [['all', L('সব', 'All')], ['job', tcSrcName('job')], ['private', tcSrcName('private')], ['coaching', tcSrcName('coaching')], ['other', L('সাধারণ', 'General')]];
  let list = m.exps.filter(e => (tcUi.esrc === 'all' || tcSrcOf(e) === tcUi.esrc) && (tcUi.ecat === 'all' || e.cat === tcUi.ecat)).sort(byDateDesc);
  const recs = tcLive(t.recurs);
  return `<div class="page-head"><h1>${L('খরচ', 'Expenses')}</h1><button type="button" class="btn primary sm" data-action="tc-exp-add">${icon('plus', 18)} ${L('খরচ', 'Expense')}</button></div>
    ${tcMonthNav()}
    <div class="minis"><div class="mini"><small>${L('মোট খরচ', 'Total')}</small><b>${tcM(m.expense)}</b></div><div class="mini"><small>${L('পরিশোধ', 'Paid out')}</small><b>${tcM(m.paidOut)}</b></div><div class="mini"><small>${L('অপরিশোধিত', 'Unpaid')}</small><b class="${m.payable > 0 ? 'neg' : ''}">${tcM(m.payable)}</b></div></div>
    <div class="chiprow mt12">${srcs.map(([k, l]) => `<button type="button" class="fchip ${tcUi.esrc === k ? 'active' : ''}" data-action="tc-esrc" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="mt8">${tcSel('ecat', [['all', L('সব খাত', 'All categories')]].concat(tcCatsAll().map(c => [c.k, `${c.e} ${esc(isEN() ? c.en : c.bn)}`])), tcUi.ecat).replace('<select', '<select data-tc-ecat')}</div>
    <div class="mt12">${list.length ? `<div class="list">${list.map(e => tcExpRow(x, e, td)).join('')}</div>` : empty('🧾', L('এই মাসে খরচ নেই', 'No expenses this month'), `<p class="hint">${L('"＋ খরচ" চেপে যোগ করুন, অথবা নিয়মিত খরচ "মাস তৈরি" থেকে আসবে।', 'Tap "＋ Expense", or regular costs arrive from "New month".')}</p>`)}</div>
    <section class="card mt12"><div class="card-head"><h2>🔁 ${L('নিয়মিত (পুনরাবৃত্ত) খরচ', 'Regular (recurring) costs')}</h2><button type="button" class="link" data-action="tc-rec-add">+ ${L('যোগ', 'Add')}</button></div>
      ${recs.length ? recs.map(r => `<div class="lwrap"><button type="button" class="lrow" data-action="tc-rec-edit" data-id="${r.id}"><span class="lic">${tcCat(r.cat).e}</span><span class="lmain"><b>${esc(r.name)}</b><small>${esc(tcCatName(r.cat))} · ${L('প্রতি মাসে', 'monthly')} ${r.day || 1} ${L('তারিখ', '')}${r.active === false ? ' · ' + L('বন্ধ', 'stopped') : ''}</small></span><span class="lend"><b>${tcM(tcRateAt(r.amts, ym))}</b></span></button>${rowTools('tc-rec-edit', 'tc-rec-del', r.id)}</div>`).join('')
        : `<p class="hint" style="margin:0">${L('ভাড়া, বিদ্যুৎ, ইন্টারনেট বা সহকারীর বেতনের মতো যা প্রতি মাসে লাগে তা একবার এখানে দিন। প্রতি মাসে নিজে থেকে আসবে (আপনি দেখে নিয়ে তৈরি করবেন)।', 'Add rent, electricity, internet or assistant pay once. They come every month (you review before creating).')}</p>`}</section>`;
}
document.addEventListener('change', e => { const el = e.target.closest && e.target.closest('[data-tc-ecat]'); if (!el) return; tcUi.ecat = el.value; render(); });

/* ---------- পরীক্ষা ---------- */
function tcExamTab() {
  const t = tcd(), exams = tcLive(t.exams).sort(byDateDesc);
  const tot = tcSum(exams.map(e => tcExamCost(e).total));
  return `<div class="page-head"><h1>${L('পরীক্ষা', 'Exams')}</h1><button type="button" class="btn primary sm" data-action="tc-exam-add">${icon('plus', 18)} ${L('পরীক্ষা', 'Exam')}</button></div>
    ${exams.length ? `<div class="minis"><div class="mini"><small>${L('মোট পরীক্ষা', 'Exams')}</small><b>${exams.length}</b></div><div class="mini"><small>${L('মোট খরচ', 'Total cost')}</small><b>${tcM(tot)}</b></div><div class="mini"><small>${L('এই মাস', 'This month')}</small><b>${tcM(tcSum(exams.filter(e => tcYm(e.date) === tcUi.ym).map(e => tcExamCost(e).total)))}</b></div></div>
    <div class="list mt12">${exams.map(e => { const c = tcExamCost(e), b = tcBat(e.batchId), sm = tcExamSummary(t, e);
      return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-exam-open" data-id="${e.id}"><span class="lic">📝</span><span class="lmain"><b>${esc(e.name)}</b><small>${fmtDate(e.date)}${e.subject ? ' · ' + esc(e.subject) : ''}${b ? ' · ' + esc(b.name) : ''} · ${sm.rows.length} ${L('জন', 'students')}${sm.total ? ` · ${L('পূর্ণমান', 'marks')} ${sm.total}` : ''}</small>
        <small>${sm.graded ? `${L('গড়', 'Avg')} ${tcMk(sm.avg)} · ${L('সর্বোচ্চ', 'High')} ${tcMk(sm.high)}` : L('নম্বর লেখা হয়নি', 'no marks yet')}${c.total > 0 ? ` · ${L('খরচ', 'cost')} ${tcM(c.total)}` : ''}</small></span>
        <span class="lend">${c.diff != null ? `<small class="${c.diff > 0 ? 'neg' : 'pos'}">${c.diff > 0 ? tcM(c.diff) + ' ' + L('বেশি', 'over') : L('বাজেটের মধ্যে', 'within budget')}</small>` : ''}</span></button>${rowTools('tc-exam-edit', 'tc-exam-del', e.id)}</div>`; }).join('')}</div>`
    : empty('📝', L('কোনো পরীক্ষা নেই', 'No exams yet'), `<p class="hint">${L('পরীক্ষার নাম, তারিখ, বিষয়, পূর্ণমান আর কোন ব্যাচ বা শিক্ষার্থী সেটা দিন। পরে নম্বর লিখলে ফল নিজে হিসাব হবে। খরচ দিলে মাসের খরচে একবারই যুক্ত হবে।', 'Give the exam a name, date, subject, total marks and who sits it. Enter marks later and results are worked out. If you add a cost it is counted once in that month.')}</p>`)}
    <p class="hint">${L('পরীক্ষার খরচ আলাদাভাবে যোগ হয় না: প্রতিটা পরীক্ষা একটাই খরচ হিসেবে মাসের খরচে যায় (দুবার গণনা হয় না)।', 'Exam costs are not added twice: each exam becomes one expense in that month.')}</p>`;
}

/* ---------- বই ও শিক্ষাসামগ্রী ---------- */
function tcSupTab() {
  const t = tcd(), x = tcCtx(t), td = today();
  const all = tcLive(t.expenses).filter(e => TC_SUPPLY.includes(e.cat) && !e.ref).sort(byDateDesc);
  const month = tcSum(all.filter(e => tcYm(e.date) === tcUi.ym).map(e => e.amt));
  return `<div class="page-head"><h1>${L('বই ও সামগ্রী', 'Books & supplies')}</h1><button type="button" class="btn primary sm" data-action="tc-sup-add">${icon('plus', 18)} ${L('কেনা', 'Buy')}</button></div>
    <div class="minis"><div class="mini"><small>${L('এই মাস', 'This month')}</small><b>${tcM(month)}</b></div><div class="mini"><small>${L('মোট কেনা', 'All time')}</small><b>${tcM(tcSum(all.map(e => e.amt)))}</b></div><div class="mini"><small>${L('কেনাকাটা', 'Purchases')}</small><b>${all.length}</b></div></div>
    <div class="mt12">${all.length ? `<div class="list">${all.slice(0, 60).map(e => { const s = e.sup || {}, st = tcItemState(x, e.id, 'out', td);
      return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-item" data-id="${e.id}" data-side="out"><span class="lic">${tcCat(e.cat).e}</span><span class="lmain"><b>${esc(s.item || e.desc || tcCatName(e.cat))}</b>
        <small>${fmtDate(e.date)}${s.qty ? ` · ${s.qty} × ${tcM(s.unit || 0)}` : ''}${s.shop ? ' · 🏪 ' + esc(s.shop) : ''}${s.purpose ? ' · ' + esc(s.purpose) : ''}${e.reusable ? ' · ♻️ ' + L('পুনর্ব্যবহারযোগ্য', 'reusable') : ''} ${tcBadge(st.status)}</small></span><span class="lend"><b>${tcM(e.amt)}</b></span></button>${rowTools('tc-exp-edit', 'tc-exp-del', e.id)}</div>`; }).join('')}</div>`
      : empty('📚', L('কোনো কেনাকাটা নেই', 'No purchases yet'), `<p class="hint">${L('বই, খাতা, কলম, মার্কার, নোট ও প্রশ্নপত্র প্রিন্ট বা সরঞ্জাম কিনলে এখানে লিখুন। আগের কেনাকাটার ইতিহাস থাকবে।', 'Record books, notebooks, pens, markers, printing or equipment here. Past purchases stay as history.')}</p>`)}</div>
    <p class="hint">${L('♻️ পুনর্ব্যবহারযোগ্য সরঞ্জাম (বোর্ড, ফ্যান ইত্যাদি) কেনার দিনেই একবার খরচ ধরা হয়, ব্যবহারের সময় আবার নয়। পরীক্ষার কাগজ ও প্রিন্ট "পরীক্ষা" থেকে হিসাব করুন, এখানে আবার লিখলে দুবার ধরা হবে।', '♻️ Reusable equipment (board, fan…) is counted once on the purchase day, not again when used. Work out exam paper and printing under "Exams"; entering it here too would count it twice.')}</p>`;
}

/* ---------- টাকা-ট্যাব ---------- */
function tcMoneyTab() {
  const subs = [['dues', L('পাওনা', 'Dues')], ['exp', L('খরচ', 'Expenses')], ['exam', L('পরীক্ষা', 'Exams')], ['res', L('ফল', 'Results')], ['sup', L('সামগ্রী', 'Supplies')], ['report', L('রিপোর্ট', 'Reports')]];
  const body = { dues: tcDuesTab, exp: tcExpTab, exam: tcExamTab, res: tcResultsTab, sup: tcSupTab, report: tcReportTab }[tcUi.msub]();
  return tcPage(`<div class="chiprow mb12">${subs.map(([k, l]) => `<button type="button" class="fchip ${tcUi.msub === k ? 'active' : ''}" data-action="tc-msub" data-v="${k}">${l}</button>`).join('')}</div>${body}`);
}

/* ---------- হোমের কার্ডের বিস্তারিত ---------- */
function tcDetailHtml(k) {
  const t = tcd(), x = tcCtx(t), td = today(), ym = tcUi.ym, m = tcMonth(t, ym, td);
  const titles = { earned: L('মোট মাসিক আয়', 'Monthly income'), received: L('বাস্তবে প্রাপ্ত টাকা', 'Money actually received'), expense: L('মোট খরচ', 'Total expenses'), profit: L('প্রকৃত লাভ', 'Net profit'), cash: L('হাতে থাকা নগদ', 'Cash in hand'), due: L('মোট পাওনা', 'Total receivable'), overdue: L('বকেয়া (সময় পার)', 'Overdue'), who: L('কার কাছে পাওনা', 'Owed by') };
  const row = (l, v, cls = '') => `<div class="hg-day"><span><b>${l}</b></span><b class="${cls}">${tcM(v)}</b></div>`;
  const dueRows = (f, withSplit) => {
    const mk = list => list.map(d => tcIncRow(x, x.inc[d.id], td)).join('');
    const ds = m.dues.filter(f), prev = ds.filter(d => !d.isNew), cur = ds.filter(d => d.isNew);
    if (!ds.length) return `<p class="hint">${L('কোনো বকেয়া নেই। 🎉', 'Nothing outstanding. 🎉')}</p>`;
    return (prev.length ? `<div class="section-title">${L('আগের মাসের বকেয়া', 'Earlier months')} · ${tcM(tcSum(prev.map(d => d.rem)))}</div><div class="list">${mk(prev)}</div>` : '')
      + (cur.length ? `<div class="section-title">${L('এই মাসের নতুন ফি', 'New this month')} · ${tcM(tcSum(cur.map(d => d.rem)))}</div><div class="list">${mk(cur)}</div>` : '');
  };
  let b = '';
  if (k === 'earned') b = TC_SRC.map(s => { const l = m.items.filter(i => i.src === s); return l.length ? `<div class="section-title">${TC_SRCN[s][2]} ${tcSrcName(s)} · ${tcM(m.earnedBy[s])}</div><div class="list">${l.map(i => tcIncRow(x, i, td)).join('')}</div>` : ''; }).join('') || `<p class="hint">${L('এই মাসে আয়ের কোনো রেকর্ড নেই।', 'No income records this month.')}</p>`;
  else if (k === 'received') b = m.recvPays.length ? `<div class="list">${m.recvPays.sort((p, q) => q.date.localeCompare(p.date)).map(p => { const i = x.inc[p.ref], lb = tcIncLabel(x, i);
    return `<button type="button" class="lrow" data-action="tc-item" data-id="${esc(p.ref)}" data-side="in"><span class="lic">💵</span><span class="lmain"><b>${esc(lb.t)}</b><small>${fmtDate(p.date)} · ${tcN(TC_METHOD, p.method || 'cash')} · ${esc(lb.s)}</small></span><span class="lend"><b>${tcM(p.amt)}</b></span></button>`; }).join('')}</div>` : `<p class="hint">${L('এই মাসে কোনো টাকা হাতে আসেনি।', 'No money received this month.')}</p>`;
  else if (k === 'expense') b = m.exps.length ? `<div class="list">${m.exps.slice().sort(byDateDesc).map(e => tcExpRow(x, e, td)).join('')}</div>` : `<p class="hint">${L('এই মাসে খরচ নেই।', 'No expenses this month.')}</p>`;
  else if (k === 'profit') b = `<div class="card">${row(L('অর্জিত আয়', 'Earned income'), m.earned)}${row(L('− মোট খরচ', '− Total expenses'), m.expense)}${row(L('= প্রকৃত লাভ', '= Net profit'), m.profit, m.profit < 0 ? 'neg' : 'pos')}</div>
    <div class="section-title">${L('উৎস অনুযায়ী', 'By source')}</div><div class="card">${TC_SRC.map(s => `<div class="brow"><div class="brow-top"><span class="grow">${TC_SRCN[s][2]} ${tcSrcName(s)}</span><span class="amt ${m.srcRows[s].profit < 0 ? 'neg' : ''}">${tcM(m.srcRows[s].profit)}</span></div><div class="brow-meta"><span>${L('আয়', 'Income')} ${tcM(m.srcRows[s].earned)}</span><span>${L('খরচ', 'Cost')} ${tcM(m.srcRows[s].expense)}</span></div></div>`).join('')}</div>
    <p class="hint">${L('লাভ হিসাব হয় অর্জিত আয় (নির্ধারিত) ধরে, বাস্তবে টাকা এসেছে কি না তা ধরে নয়। হাতে কত টাকা আছে তা "নগদ" কার্ডে।', 'Profit uses earned (scheduled) income, not whether the money has arrived. How much cash you hold is on the "Cash" card.')}</p>`;
  else if (k === 'cash') b = `<div class="card">${row(L('প্রারম্ভিক নগদ', 'Opening cash'), m.cash.opening)}${row(L('+ বাস্তবে প্রাপ্ত (এ পর্যন্ত)', '+ Received so far'), m.cash.in)}${row(L('− বাস্তবে পরিশোধিত খরচ (এ পর্যন্ত)', '− Expenses actually paid'), m.cash.out)}${row(L('= নগদ উদ্বৃত্ত', '= Cash balance'), m.cash.balance, m.cash.balance < 0 ? 'neg' : 'pos')}</div>
    <p class="hint">${L('নগদ উদ্বৃত্ত শুধু বাস্তবে আসা ও দেওয়া টাকা ধরে, তাই প্রকৃত লাভের থেকে আলাদা হতে পারে। প্রারম্ভিক নগদ "আরও → ফি ও নগদ" থেকে বদলান।', 'Cash balance counts only money actually received and paid, so it can differ from net profit. Change opening cash in More → Fees & cash.')}</p>`;
  else if (k === 'due') b = `<div class="minis"><div class="mini"><small>${L('আগের মাসের', 'Earlier')}</small><b class="${m.prevDue > 0 ? 'neg' : ''}">${tcM(m.prevDue)}</b></div><div class="mini"><small>${L('নতুন ফি', 'New fees')}</small><b>${tcM(m.newDue)}</b></div><div class="mini"><small>${L('মোট', 'Total')}</small><b class="neg">${tcM(m.due)}</b></div></div>${dueRows(() => true)}`;
  else if (k === 'overdue') b = dueRows(d => d.overdue);
  else if (k === 'who') b = ['private', 'coaching', 'job', 'other'].map(s => { const l = m.dues.filter(d => x.inc[d.id].src === s); return l.length ? `<div class="section-title">${TC_SRCN[s][2]} ${tcSrcName(s)} · ${tcM(tcSum(l.map(d => d.rem)))}</div><div class="list">${l.map(d => tcIncRow(x, x.inc[d.id], td)).join('')}</div>` : ''; }).join('') || `<p class="hint">${L('কোনো পাওনা নেই।', 'Nothing owed.')}</p>`;
  return `${sheetHead(titles[k], tcYmLabel(ym))}${b}${tcNote()}`;
}

/* ---------- রিপোর্ট ---------- */
const tcChg = (a, b) => (b > 0 ? (a >= b ? '↑ ' : '↓ ') + Math.round(Math.abs(a - b) / b * 100) + '%' : '—');
function tcRepData(ym) {
  const t = tcd(), td = today(), m = tcMonth(t, ym, td), p = tcMonth(t, tcYmAdd(ym, -1), td);
  return { m, p, t };
}
function tcReportTab() {
  const ym = tcUi.ym, annual = tcUi.rmode === 'year';
  const body = annual ? tcAnnualHtml(+ym.slice(0, 4)) : tcMonthReportHtml(ym);
  return `<div class="page-head"><h1>${L('রিপোর্ট', 'Reports')}</h1></div>
    <div class="seg mb12">${[['month', L('মাসিক', 'Monthly')], ['year', L('বার্ষিক', 'Annual')]].map(([k, l]) => `<button type="button" class="${tcUi.rmode === k ? 'active' : ''}" data-action="tc-rmode" data-v="${k}">${l}</button>`).join('')}</div>
    ${annual ? `<div class="tcmn"><button type="button" class="icon-btn" data-action="tc-yr" data-d="-1">${icon('prev', 20)}</button><b>${ym.slice(0, 4)}</b><button type="button" class="icon-btn" data-action="tc-yr" data-d="1">${icon('next', 20)}</button></div>` : tcMonthNav()}
    <div class="hg-actions three"><button type="button" class="btn primary" data-action="tc-rep-pdf">${icon('doc', 18)} PDF</button><button type="button" class="btn" data-action="tc-rep-copy">${icon('share', 18)} ${L('টেক্সট কপি', 'Copy text')}</button><button type="button" class="btn" data-action="tc-rep-share">${icon('share', 18)} ${L('শেয়ার', 'Share')}</button></div>
    <div class="mt12">${body}</div>`;
}
function tcMonthReportHtml(ym) {
  const { m, p } = tcRepData(ym), t = tcd(), cats = Object.entries(m.byCat).sort((a, b) => b[1] - a[1]), hasPrev = p.earned || p.expense || p.received;
  const row = (l, v, pv, cls = '') => `<div class="hg-day"><span><b>${l}</b>${hasPrev ? `<small>${L('আগের মাস', 'Last month')} ${tcM(pv)} · ${tcChg(v, pv)}</small>` : ''}</span><b class="${cls}">${tcM(v)}</b></div>`;
  return `<section class="card">${row(L('অর্জিত আয়', 'Earned income'), m.earned, p.earned)}${row(L('বাস্তবে প্রাপ্ত', 'Received'), m.received, p.received)}${row(L('মোট খরচ', 'Expenses'), m.expense, p.expense)}${row(L('প্রকৃত লাভ', 'Net profit'), m.profit, p.profit, m.profit < 0 ? 'neg' : 'pos')}${row(L('নগদ উদ্বৃত্ত', 'Cash balance'), m.cash.balance, p.cash.balance)}</section>
    <section class="card"><div class="card-head"><h2>${L('পাওনা', 'Receivable')}</h2></div><div class="minis"><div class="mini"><small>${L('আগের মাসের বকেয়া', 'Earlier dues')}</small><b class="${m.prevDue > 0 ? 'neg' : ''}">${tcM(m.prevDue)}</b></div><div class="mini"><small>${L('এই মাসের নতুন', 'New this month')}</small><b>${tcM(m.newDue)}</b></div><div class="mini"><small>${L('মোট', 'Total')}</small><b>${tcM(m.due)}</b></div></div></section>
    <section class="card"><div class="card-head"><h2>${L('উৎস অনুযায়ী', 'By source')}</h2></div>${TC_SRC.map(s => { const r = m.srcRows[s]; return `<div class="brow"><div class="brow-top"><span class="grow">${TC_SRCN[s][2]} ${tcSrcName(s)}</span><span class="amt ${r.profit < 0 ? 'neg' : ''}">${tcM(r.profit)}</span></div><div class="brow-meta"><span>${L('আয়', 'Income')} ${tcM(r.earned)} · ${L('প্রাপ্ত', 'received')} ${tcM(r.received)}</span><span>${L('খরচ', 'Cost')} ${tcM(r.expense)}</span></div></div>`; }).join('')}</section>
    ${cats.length ? `<section class="card"><div class="card-head"><h2>${L('খরচের খাত', 'Expenses by category')}</h2></div>${cats.map(([k, v]) => `<div class="brow"><div class="brow-top"><span class="grow">${tcCat(k).e} ${esc(tcCatName(k))}</span><span class="amt">${tcM(v)} <small>${pct(v / (m.expense || 1) * 100)}</small></span></div>${tcBar(v / (m.expense || 1) * 100)}</div>`).join('')}</section>` : ''}
    <details class="card"><summary><b>${L('প্রকৃত হিসাব (১ টাকা যোগ ছাড়া)', 'Actual figures (without the ৳1)')}</b></summary>${tcRawTable(m, true)}</details>`;
}
// প্রদর্শিত (+১) ও প্রকৃত পাশাপাশি, স্পষ্টভাবে আলাদা
function tcRawTable(m, ui) {
  const rows = [[L('অর্জিত আয়', 'Earned income'), m.earned], [L('বাস্তবে প্রাপ্ত', 'Received'), m.received], [L('মোট খরচ', 'Expenses'), m.expense], [L('প্রকৃত লাভ', 'Net profit'), m.profit], [L('নগদ উদ্বৃত্ত', 'Cash balance'), m.cash.balance], [L('আগের মাসের বকেয়া', 'Earlier dues'), m.prevDue], [L('নতুন ফি বাকি', 'New dues'), m.newDue]];
  if (ui) return `<div class="mt8">${rows.map(([l, v]) => `<div class="hg-day"><span><b>${l}</b><small>${L('প্রদর্শিত', 'Shown')} ${tcM(v)}</small></span><b>${tcRaw(v)}</b></div>`).join('')}</div><p class="hint">${L('ডান পাশে প্রকৃত মান, বাঁয়ে স্ক্রিনে দেখানো মান (প্রকৃত + ১ টাকা)।', 'Right: the actual value. Left: the displayed value (actual + ৳1).')}</p>`;
  return `<table class="rt"><thead><tr><th>${L('বিষয়', 'Item')}</th><th>${L('প্রদর্শিত (+১ টাকা)', 'Shown (+৳1)')}</th><th>${L('প্রকৃত', 'Actual')}</th></tr></thead><tbody>${rows.map(([l, v]) => `<tr><td>${l}</td><td class="n">${tcM(v)}</td><td class="n">${tcRaw(v)}</td></tr>`).join('')}</tbody></table>`;
}
function tcAnnualHtml(year) {
  const y = tcYear(tcd(), year, today());
  return `<section class="card"><div class="minis"><div class="mini"><small>${L('আয়', 'Earned')}</small><b>${tcM(y.earned)}</b></div><div class="mini"><small>${L('খরচ', 'Expenses')}</small><b>${tcM(y.expense)}</b></div><div class="mini"><small>${L('লাভ', 'Profit')}</small><b class="${y.profit < 0 ? 'neg' : 'pos'}">${tcM(y.profit)}</b></div></div>
    <div class="minis mt8"><div class="mini"><small>${L('প্রাপ্ত', 'Received')}</small><b>${tcM(y.received)}</b></div><div class="mini"><small>${L('বছর শেষে বকেয়া', 'Dues at year end')}</small><b>${tcM(y.dueEnd)}</b></div><div class="mini"><small>${L('বছর শেষে নগদ', 'Cash at year end')}</small><b>${tcM(y.cashEnd)}</b></div></div></section>
    <section class="card"><div class="card-head"><h2>${L('মাস অনুযায়ী', 'Month by month')}</h2></div>${y.months.map(m => `<button type="button" class="lrow" data-action="tc-ym-open" data-ym="${m.ym}"><span class="lmain"><b>${tcYmLabel(m.ym)}</b><small>${L('আয়', 'Income')} ${tcM(m.earned)} · ${L('খরচ', 'Cost')} ${tcM(m.expense)} · ${L('প্রাপ্ত', 'recv.')} ${tcM(m.received)}</small></span><span class="lend"><b class="${m.profit < 0 ? 'neg' : ''}">${tcM(m.profit)}</b></span></button>`).join('')}</section>`;
}
// প্রিন্ট/PDF-এর HTML (Hangout-এর প্রিন্ট স্টাইল ব্যবহার করে)
function tcReportPrintHtml(ym, annual) {
  const t = tcd(), td = today(), tb = (head, body) => `<table class="rt"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  const note = `<p class="sm">${esc(L('দ্রষ্টব্য: প্রদর্শিত অর্থের পরিমাণে হিসাবের সুবিধার্থে ১ টাকা যোগ করা হয়েছে। প্রকৃত লেনদেনের হিসাব অপরিবর্তিত।', 'Note: Displayed amounts have ৳1 added for convenience. The actual transaction records are unchanged.'))}</p>`;
  if (annual) {
    const y = tcYear(t, +ym.slice(0, 4), td);
    return `<div class="memo"><h1>${esc(L('শিক্ষক হিসাব: বার্ষিক', 'Teacher books: annual'))} ${y.year}</h1>${tb([L('মাস', 'Month'), L('আয়', 'Income'), L('প্রাপ্ত', 'Received'), L('খরচ', 'Cost'), L('লাভ', 'Profit')], y.months.map(m => `<tr><td>${tcYmLabel(m.ym)}</td><td class="n">${tcM(m.earned)}</td><td class="n">${tcM(m.received)}</td><td class="n">${tcM(m.expense)}</td><td class="n">${tcM(m.profit)}</td></tr>`).join('') + `<tr class="tt"><td>${esc(L('মোট', 'Total'))}</td><td class="n">${tcM(y.earned)}</td><td class="n">${tcM(y.received)}</td><td class="n">${tcM(y.expense)}</td><td class="n">${tcM(y.profit)}</td></tr>`)}${note}</div>`;
  }
  const { m, p } = tcRepData(ym), cats = Object.entries(m.byCat).sort((a, b) => b[1] - a[1]);
  return `<div class="memo"><h1>${esc(L('শিক্ষক হিসাব', 'Teacher books'))}: ${tcYmLabel(ym)}</h1>
    <div class="kpis"><div><small>${esc(L('অর্জিত আয়', 'Earned'))}</small><b>${tcM(m.earned)}</b></div><div><small>${esc(L('প্রাপ্ত', 'Received'))}</small><b>${tcM(m.received)}</b></div><div><small>${esc(L('খরচ', 'Expenses'))}</small><b>${tcM(m.expense)}</b></div><div><small>${esc(L('প্রকৃত লাভ', 'Net profit'))}</small><b>${tcM(m.profit)}</b></div></div>
    <h3>${esc(L('আগের মাসের সাথে', 'Against last month'))}</h3>${tb([L('বিষয়', 'Item'), L('এই মাস', 'This month'), L('আগের মাস', 'Last month'), L('পরিবর্তন', 'Change')], [[L('অর্জিত আয়', 'Earned'), m.earned, p.earned], [L('প্রাপ্ত', 'Received'), m.received, p.received], [L('খরচ', 'Expenses'), m.expense, p.expense], [L('লাভ', 'Profit'), m.profit, p.profit]].map(([l, a, b]) => `<tr><td>${esc(l)}</td><td class="n">${tcM(a)}</td><td class="n">${tcM(b)}</td><td class="n">${tcChg(a, b)}</td></tr>`).join(''))}
    <h3>${esc(L('উৎস অনুযায়ী', 'By source'))}</h3>${tb([L('উৎস', 'Source'), L('আয়', 'Income'), L('খরচ', 'Cost'), L('লাভ', 'Profit'), L('বাকি', 'Due')], TC_SRC.map(s => `<tr><td>${esc(tcSrcName(s))}</td><td class="n">${tcM(m.srcRows[s].earned)}</td><td class="n">${tcM(m.srcRows[s].expense)}</td><td class="n">${tcM(m.srcRows[s].profit)}</td><td class="n">${tcM(m.srcRows[s].due)}</td></tr>`).join(''))}
    ${cats.length ? `<h3>${esc(L('খরচের খাত', 'Expense categories'))}</h3>${tb([L('খাত', 'Category'), L('খরচ', 'Cost')], cats.map(([k, v]) => `<tr><td>${esc(tcCatName(k))}</td><td class="n">${tcM(v)}</td></tr>`).join(''))}` : ''}
    <h3>${esc(L('পাওনা', 'Receivable'))}</h3>${tb([L('আগের মাসের বকেয়া', 'Earlier dues'), L('নতুন ফি বাকি', 'New dues'), L('মোট', 'Total')], `<tr><td class="n">${tcM(m.prevDue)}</td><td class="n">${tcM(m.newDue)}</td><td class="n">${tcM(m.due)}</td></tr>`)}
    <h3>${esc(L('প্রকৃত হিসাব বনাম প্রদর্শিত', 'Actual vs displayed'))}</h3>${tcRawTable(m, false)}${note}</div>`;
}
function tcReportText(ym, annual) {
  const t = tcd(), td = today();
  const note = L('দ্রষ্টব্য: প্রদর্শিত অর্থের পরিমাণে হিসাবের সুবিধার্থে ১ টাকা যোগ করা হয়েছে। প্রকৃত লেনদেনের হিসাব অপরিবর্তিত।', 'Note: Displayed amounts have ৳1 added for convenience. The actual transaction records are unchanged.');
  if (annual) { const y = tcYear(t, +ym.slice(0, 4), td); return [`${L('শিক্ষক হিসাব: বার্ষিক', 'Teacher books: annual')} ${y.year}`, ...y.months.map(m => `${tcYmLabel(m.ym)}: ${L('আয়', 'income')} ${tcM(m.earned)}, ${L('খরচ', 'cost')} ${tcM(m.expense)}, ${L('লাভ', 'profit')} ${tcM(m.profit)}`), `${L('মোট', 'Total')}: ${L('আয়', 'income')} ${tcM(y.earned)}, ${L('খরচ', 'cost')} ${tcM(y.expense)}, ${L('লাভ', 'profit')} ${tcM(y.profit)}`, '', note].join('\n'); }
  const m = tcMonth(t, ym, td);
  return [`${L('শিক্ষক হিসাব', 'Teacher books')}: ${tcYmLabel(ym)}`, `${L('অর্জিত আয়', 'Earned')}: ${tcM(m.earned)}`, `${L('প্রাপ্ত', 'Received')}: ${tcM(m.received)}`, `${L('খরচ', 'Expenses')}: ${tcM(m.expense)}`, `${L('প্রকৃত লাভ', 'Net profit')}: ${tcM(m.profit)}`, `${L('নগদ উদ্বৃত্ত', 'Cash balance')}: ${tcM(m.cash.balance)}`,
    `${L('পাওনা', 'Receivable')}: ${tcM(m.due)} (${L('আগের', 'earlier')} ${tcM(m.prevDue)}, ${L('নতুন', 'new')} ${tcM(m.newDue)})`, '', ...TC_SRC.map(s => `${tcSrcName(s)}: ${L('আয়', 'income')} ${tcM(m.srcRows[s].earned)}, ${L('খরচ', 'cost')} ${tcM(m.srcRows[s].expense)}, ${L('লাভ', 'profit')} ${tcM(m.srcRows[s].profit)}`), '', note].join('\n');
}

/* ---------- আরও ---------- */
function tcMoreTab() {
  const t = tcd(), mi = menuItem, plan = tcPlan(t, tcUi.ym).length, nStu = tcLive(t.students).filter(x => !x.archived).length, nArch = tcLive(t.students).filter(x => x.archived).length, nBat = tcLive(t.batches).filter(x => !x.archived).length;
  const go = (it, attrs) => it.replace('data-action="tc-open"', `data-action="tc-open" ${attrs}`);
  return tcPage(`<div class="page-head"><h1>${L('আরও', 'More')}</h1></div>
    ${menuGroup('👥 ' + L('শিক্ষার্থী ও ব্যাচ', 'Students & batches'), L('সব শিক্ষার্থী, ব্যাচ, উপস্থিতি ও ফি এক জায়গা থেকে', 'Students, batches, attendance and fees from one place'),
      `${go(mi('tc-open', 'cap', L('সব শিক্ষার্থী', 'All Students'), `${nStu} ${L('জন সক্রিয়', 'active')}${nArch ? ' · ' + nArch + ' ' + L('আর্কাইভ', 'archived') : ''}`), 'data-tab="work" data-ws="stu"')}
      ${go(mi('tc-open', 'layers', L('ব্যাচ ব্যবস্থাপনা', 'Batch management'), `${nBat} ${L('টা ব্যাচ · এডিট, আর্কাইভ, ফি', 'batches · edit, archive, fees')}`), 'data-tab="work" data-ws="coach"')}
      ${mi('tc-att-pick', 'check', L('উপস্থিতি নিন', 'Take attendance'), L('ব্যাচের দৈনিক উপস্থিত/অনুপস্থিত', 'Daily present/absent for a batch'))}
      ${mi('tc-collect', 'wallet', L('ফি নিন', 'Collect fee'), L('বকেয়া থেকে সবচেয়ে পুরোনোটা আগে মেটে', 'Pays the oldest dues first'))}`)}
    ${menuGroup('🗓️ ' + L('মাস ও রিপোর্ট', 'Month & reports'), L('মাসের শুরুতে ফি তৈরি করুন, শেষে রিপোর্ট দেখুন', 'Create fees at the start of the month, review at the end'),
      `${mi('tc-roll', 'cal', L('নতুন মাসের হিসাব তৈরি', 'Create a month\'s books'), plan ? L(`${tcYmLabel(tcUi.ym)}: ${plan}টা তৈরি বাকি`, `${tcYmLabel(tcUi.ym)}: ${plan} to create`) : L('ফি, বেতন ও নিয়মিত খরচ, দেখে নিয়ে তৈরি', 'Fees, salary and regular costs, reviewed first'))}
      ${mi('tc-goto-rep', 'chart', L('মাসিক ও বার্ষিক রিপোর্ট', 'Monthly & annual reports'), L('PDF, শেয়ার, আগের মাসের তুলনা', 'PDF, share, last-month comparison'))}
      ${go(mi('tc-open', 'trend', L('পরীক্ষার ফল', 'Exam results'), L('ব্যাচ ও শিক্ষার্থী অনুযায়ী ফল', 'By batch and by student')), 'data-tab="money" data-ms="res"')}`)}
    ${menuGroup('💰 ' + L('হিসাবের সেটিংস', 'Books settings'), L('বাজেট, নগদ, খাত ও নিয়মিত খরচ', 'Budget, cash, categories and regular costs'),
      `${mi('tc-budget', 'pie', L('মাসের বাজেট', 'Monthly budget'), t.budget.total > 0 ? tcM(t.budget.total) : L('ঠিক করা নেই', 'Not set'))}
      ${mi('tc-settings', 'wallet', L('ফি ও নগদ', 'Fees & cash'), `${L('প্রারম্ভিক নগদ', 'Opening cash')} ${tcM(t.openingCash)} · ${L('ফি দেওয়ার দিন', 'fee due day')} ${t.feeDay}`)}
      ${mi('tc-cats', 'grid', L('খরচের খাত', 'Expense categories'), L('নিজের খাত যোগ, এডিট, মোছা', 'Add, edit or remove your own'))}
      ${mi('tc-goto-rec', 'layers', L('নিয়মিত খরচ', 'Regular costs'), L('ভাড়া, বিদ্যুৎ, ইন্টারনেট, সহকারীর বেতন', 'Rent, electricity, internet, assistant pay'))}`)}
    ${appSections()}`);
}
