'use strict';

/* =========================================================
   শিক্ষক ব্যবস্থাপনা: বিস্তারিত শিট (পাওনা/বিল, শিক্ষার্থী, চাকরি, ব্যাচ, ক্লাস, মাস তৈরি) ও শিট-সহায়ক
   ========================================================= */

/* ---------- শিটের সহায়ক: বিস্তারিত থেকে ফর্ম, সেভ করে আবার বিস্তারিতে ফেরা ---------- */
let tcSheetFn = null, tcBack = null;
function tcSheet(fn) { tcSheetFn = fn; tcBack = null; openSheet(fn(), fn); }
function tcOpenForm(html) { tcBack = sheetOpen ? (tcSheetFn || tcBack) : null; tcSheetFn = null; openSheet(html); }
// শিট বন্ধ হলে "ফিরে যাওয়ার" পুরোনো স্মৃতি মুছে যায়, নইলে পরের ফর্ম ভুল শিটে ফিরত
document.addEventListener('sheetclose', () => { tcBack = null; tcSheetFn = null; });
function tcAfter(msg) {
  save(); render();
  const b = tcBack; tcBack = null;
  if (b && sheetOpen) { tcSheetFn = b; openSheet(b(), b); } else { tcSheetFn = null; closeSheet(); }
  if (msg) toast(msg);
}
function tcRefresh(msg) {
  save(); render();
  if (sheetOpen && tcSheetFn) { const sb = $('.sheet-body'); if (sb) sb.innerHTML = tcSheetFn(); }
  if (msg) toast(msg);
}
const tcMenu = (action, ic, title, sub, id, extra = '') => `<button type="button" class="mitem" data-action="${action}" data-id="${esc(id || '')}" ${extra}><span class="mi">${icon(ic, 20)}</span><span class="mt"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${icon('chev', 18)}</button>`;
const tcDanger = (action, title, sub, id) => `<button type="button" class="mitem danger" data-action="${action}" data-id="${esc(id)}"><span class="mi">${icon('trash', 20)}</span><span class="mt"><b>${title}</b><small>${sub}</small></span></button>`;
const tcMinis = a => `<div class="minis">${a.map(([l, v, c]) => `<div class="mini"><small>${l}</small><b class="${c || ''}">${v}</b></div>`).join('')}</div>`;

/* ---------- ছবি/ডকুমেন্ট (বিদ্যমান IndexedDB ছবির ব্যবস্থায়, 'tcp:<id>') ---------- */
function tcPhotoIds(kind, owner) {
  const t = tcd(), o = kind === 'exp' ? t.expenses.find(e => e.id === owner) : t.students.find(s => s.id === owner);
  return o ? (kind === 'exp' ? o.photos : o.docs) : [];
}
function tcPhotoStrip(kind, owner) {
  const ids = tcPhotoIds(kind, owner);
  return `<div class="bzrc">${ids.map(id => `<span class="bzrcw"><button type="button" class="bzth" data-action="tc-ph-view" data-id="${id}">${imgURL.get('tcp:' + id) ? `<img src="${imgURL.get('tcp:' + id)}" alt="">` : '🧾'}</button><button type="button" class="bzrx" data-action="tc-ph-del" data-id="${id}" data-kind="${kind}" data-owner="${owner}" aria-label="${L('ছবি মুছুন', 'Remove photo')}">✕</button></span>`).join('')}
    <button type="button" class="bzth add" data-action="tc-ph-add">＋<small>${L('ছবি', 'Photo')}</small></button></div>
    <input type="file" accept="image/*" multiple hidden data-tc-ph="${kind}:${owner}">`;
}
async function tcSavePhotos(files) {
  const ids = []; let bad = 0;
  for (const file of files) { try { const blob = await compressImage(file), id = uid(); await putImage('tcp:' + id, blob); ids.push(id); } catch (err) { bad++; } }
  return { ids, bad };
}
document.addEventListener('change', async e => {
  const inp = e.target.matches && e.target.matches('[data-tc-ph]') ? e.target : null; if (!inp) return;
  const [kind, owner] = inp.dataset.tcPh.split(':'), files = [...(inp.files || [])]; inp.value = '';
  const list = tcPhotoIds(kind, owner); if (!files.length || !Array.isArray(list)) return;
  const r = await tcSavePhotos(files); r.ids.forEach(id => list.push(id));
  tcRefresh(r.bad ? L(`${r.bad}টা ছবি সেভ হয়নি`, `${r.bad} photo(s) could not be saved`) : SAVED());
});

/* ---------- একটা পাওনা বা বিল ---------- */
function tcItemHtml(id, side) {
  const t = tcd(), x = tcCtx(t), td = today(), isIn = side === 'in';
  const rec = isIn ? t.charges.find(c => c.id === id) : t.expenses.find(e => e.id === id && !e.del);
  if (!rec) return sheetHead(L('পাওয়া যায়নি', 'Not found'));
  const cancelled = isIn && !!rec.cancelled, amt = isIn ? x.amt(rec) : rec.amt, paid = x.paid(id), rem = Math.max(0, amt - paid);
  const due = isIn ? rec.due : (rec.due || rec.date), st = tcStatus(amt, paid, due, td);
  const lb = isIn ? tcIncLabel(x, { c: rec }) : tcExpLabel(x, rec);
  const pays = t.pays.filter(p => p.ref === id).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
  const rate = rec.auto && x.sub[rec.ref] ? tcRateAt(x.sub[rec.ref].u.fees, rec.ym) : 0;
  return `${sheetHead(esc(lb.t), esc(lb.s))}
    ${cancelled ? `<div class="hg-lock cancelled"><span>${L('এই পাওনা বাতিল, হিসাবে ধরা হচ্ছে না।', 'This item is cancelled and not counted.')}</span><button type="button" class="btn sm" data-action="tc-chg-restore" data-id="${esc(id)}">${L('আবার চালু', 'Restore')}</button></div>` : ''}
    <div class="hint" style="margin:0 0 8px">${tcBadge(st)} ${isIn ? tcYmLabel(rec.ym) : fmtDate(rec.date)}${due ? ` · ${L('নির্ধারিত দিন', 'due')} ${fmtDate(due)}` : ''}${rec.note ? ' · ' + esc(rec.note) : ''}</div>
    ${tcMinis([[isIn ? L('নির্ধারিত', 'Scheduled') : L('মোট খরচ', 'Total'), tcM(amt)], [isIn ? L('প্রাপ্ত', 'Received') : L('পরিশোধ', 'Paid'), tcM(paid), 'pos'], [paid > amt ? L('অতিরিক্ত', 'Extra') : L('বাকি', 'Due'), tcM(paid > amt ? paid - amt : rem), rem > 0 ? 'neg' : '']])}
    ${rec.auto ? `<p class="hint">${L('প্রতি ক্লাসের ফি: যত ক্লাস হয়েছে', 'Per-class fee: classes held')} (${x.occ[rec.ref + '|' + rec.ym] || 0}) × ${tcM(rate)}. ${L('উপস্থিতি বদলালে এই অঙ্কও বদলায়।', 'Changes with attendance.')}</p>` : ''}
    ${!cancelled && rem > 0 ? `<button type="button" class="btn primary block mt12" data-action="tc-pay-add" data-id="${esc(id)}" data-side="${side}">${icon('plus', 18)} ${isIn ? L('পেমেন্ট গ্রহণ', 'Record payment') : L('পরিশোধ করুন', 'Record payment')}</button>` : ''}
    <div class="section-title">${L('পেমেন্টের ইতিহাস', 'Payment history')}</div>
    ${pays.length ? `<div class="list">${pays.map(p => `<div class="lwrap"><div class="lrow"><span class="lic">${p.void ? '🚫' : '💵'}</span><span class="lmain"><b style="${p.void ? 'text-decoration:line-through;opacity:.6' : ''}">${tcM(p.amt)} · ${tcN(TC_METHOD, p.method || 'cash')}</b><small>${fmtDate(p.date)}${p.note ? ' · ' + esc(p.note) : ''}${p.void ? ' · ' + L('বাতিল', 'voided') : ''}</small></span></div>
        ${p.void ? '' : `<button type="button" class="rowdel" data-action="tc-pay-void" data-id="${p.id}" aria-label="${L('পেমেন্ট বাতিল', 'Void payment')}">${icon('x', 18)}</button>`}</div>`).join('')}</div>
      <p class="hint">${L('ভুল হলে পেমেন্ট বাতিল করে নতুন করে লিখুন। ইতিহাস মুছে যায় না, আয় দুবার গণনা হয় না।', 'To correct a mistake, void the payment and enter a new one. History is kept and income is never counted twice.')}</p>` : `<p class="hint">${L('এখনও কোনো পেমেন্ট নেই।', 'No payments yet.')}</p>`}
    ${isIn ? '' : `<div class="section-title">🧾 ${L('রসিদ / ছবি', 'Receipt / photos')}</div>${tcPhotoStrip('exp', id)}`}
    <div class="menu mt12">${cancelled ? '' : tcMenu(isIn ? 'tc-chg-edit' : 'tc-exp-edit', 'edit', L('সম্পাদনা', 'Edit'), isIn ? L('পরিমাণ, নির্ধারিত দিন, নোট', 'Amount, due date, note') : L('পরিমাণ, তারিখ, খাত, বিবরণ', 'Amount, date, category, description'), id)}
      ${isIn ? (cancelled ? '' : tcMenu('tc-chg-cancel', 'x', L('এই পাওনা বাতিল', 'Cancel this item'), L('হিসাবে ধরা হবে না, পরে আবার চালু করা যায়', 'Not counted; can be restored'), id)) : tcDanger('tc-exp-del', L('খরচ ডিলিট', 'Delete expense'), L('ফিরিয়ে আনার সুযোগ থাকবে', 'You can undo right after'), id)}</div>`;
}

/* ---------- শিক্ষার্থী ---------- */
function tcStuHtml(id) {
  const t = tcd(), x = tcCtx(t), td = today(), ym = tcYm(td), s = x.stu[id];
  if (!s) return sheetHead(L('পাওয়া যায়নি', 'Not found'));
  const stn = { active: ['পড়ছে', 'Active'], paused: ['বিরতিতে', 'Paused'], left: ['ছেড়েছে', 'Left'] };
  const subs = tcLive(s.subjects), ens = tcLive(t.enrolls).filter(e => e.studentId === id), fin = tcStuFin(t, id, td, x), inc = x.incomes.filter(i => i.c.studentId === id).sort((a, b) => b.ym.localeCompare(a.ym) || b.id.localeCompare(a.id));
  const att = u => { const a = tcAttendance(t, u.id, ym); return `${L('সম্পন্ন', 'done')} ${a.done} · ${L('অনুপস্থিত', 'absent')} ${a.absent} · ${L('বাতিল', 'cancelled')} ${a.cancelled} · ${L('স্থগিত', 'postponed')} ${a.postponed} · ${L('অতিরিক্ত', 'extra')} ${a.extra}`; };
  const sa = tcStuAtt(t, id), allAtt = sa.total ? sa : null;
  return `${sheetHead(esc(s.name), [s.cls, s.school].filter(Boolean).map(esc).join(' · ') || tcN(stn, s.status))}
    <div class="hint" style="margin:0 0 8px"><span class="tcb ${s.status === 'active' ? 'paid' : s.status === 'paused' ? 'partial' : 'unpaid'}">${s.archived ? L('আর্কাইভ', 'Archived') : tcN(stn, s.status)}</span> ${tcStBadge(fin.status)} ${s.start ? L('শুরু', 'since') + ' ' + fmtDate(s.start) : ''}${s.end ? ' · ' + L('শেষ', 'until') + ' ' + fmtDate(s.end) : ''}${s.phone ? ` · 📞 <a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : ''}${s.guardian ? ' · ' + esc(s.guardian) : ''}</div>
    ${tcMinis([[L('মোট ঠিক করা ফি', 'Agreed fees'), tcM(fin.agreed)], [L('পেয়েছি', 'Paid'), tcM(fin.paid), 'pos'], [L('বাকি', 'Due'), tcM(fin.due), fin.due > 0 ? 'neg' : '']])}
    ${fin.overdue > 0 ? `<p class="hint neg" style="margin:6px 0 0">⚠️ ${L('সময় পার হওয়া বকেয়া', 'Overdue')} ${tcM(fin.overdue)}</p>` : ''}
    <div class="quick four mt12"><button type="button" class="qbtn" data-action="tc-collect" data-id="${id}" ${fin.due > 0 ? '' : 'disabled'}><span class="qi">💵</span>${L('ফি নিন', 'Collect fee')}</button>
      <button type="button" class="qbtn" data-action="tc-stu-edit" data-id="${id}"><span class="qi">${icon('edit')}</span>${L('এডিট', 'Edit')}</button></div>
    <div class="card-head mt12"><h2>${L('বিষয়', 'Subjects')}</h2><button type="button" class="link" data-action="tc-sub-add" data-id="${id}">+ ${L('বিষয়', 'Subject')}</button></div>
    ${subs.length ? `<div class="list">${subs.map(u => `<div class="lwrap"><button type="button" class="lrow" data-action="tc-sub-edit" data-id="${u.id}" data-sid="${id}"><span class="lic">📖</span><span class="lmain"><b>${esc(u.name)}${u.active === false ? ' · ' + L('বন্ধ', 'stopped') : ''}</b><small>${(u.days || []).map(d => tcN(TC_DAYN, d)).join(', ') || L('দিন ঠিক নেই', 'no days set')}${u.time ? ' · ' + tcTime(u.time) : ''}${u.place ? ' · 📍' + esc(u.place) : ''}</small><small>${att(u)}</small></span><span class="lend"><b>${tcM(tcRateAt(u.fees, ym))}</b><small>${u.mode === 'class' ? L('প্রতি ক্লাস', 'per class') : L('মাসিক', 'monthly')}</small></span></button>${rowTools('tc-sub-edit', 'tc-sub-del', u.id, `data-sid="${id}"`)}</div>`).join('')}</div>` : `<p class="hint">${L('এখনও কোনো বিষয় নেই।', 'No subject yet.')}</p>`}
    <div class="card-head mt12"><h2>${L('কোচিং ব্যাচ', 'Coaching batches')}</h2><button type="button" class="link" data-action="tc-enr-add" data-sid="${id}">+ ${L('ব্যাচে যোগ', 'Add to batch')}</button></div>
    ${ens.length ? `<div class="list">${ens.map(e => { const b = x.bat[e.batchId], a = sa.byBatch[e.batchId] || { present: 0, absent: 0 }, bd = tcSum(fin.items.filter(i => i.batchId === e.batchId).map(i => i.rem));
      return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-bat" data-id="${e.batchId}"><span class="lic">🏫</span><span class="lmain"><b>${esc(b ? b.name : '—')}</b><small>${e.from}${e.to ? ' → ' + e.to : ' →'} · ${L('উপস্থিত', 'present')} ${a.present} · ${L('অনুপস্থিত', 'absent')} ${a.absent}</small></span><span class="lend"><b>${tcM(tcRateAt(e.fees, ym < e.from ? e.from : ym))}</b><small>${bd > 0 ? `<span class="neg">${L('বাকি', 'due')} ${tcM(bd)}</span>` : e.to && e.to < ym ? L('শেষ', 'ended') : L('মাসিক', 'monthly')}</small></span></button>${rowTools('tc-enr-fee', 'tc-enr-rm-ask', e.id)}</div>`; }).join('')}</div>` : `<p class="hint">${L('কোনো ব্যাচে নেই। একজন একাধিক ব্যাচে থাকতে পারে।', 'Not in any batch. A student can be in several.')}</p>`}
    <div class="card-head mt12"><h2>${L('উপস্থিতি', 'Attendance')}</h2></div>
    ${allAtt ? `${tcBar(allAtt.pct, allAtt.pct < 60 ? 'over' : '')}<div class="brow-meta"><span>${L('উপস্থিত', 'Present')} ${allAtt.present}</span><span>${L('অনুপস্থিত', 'Absent')} ${allAtt.absent}</span><span><b>${allAtt.pct}%</b></span></div>` : `<p class="hint">${L('এখনও কোনো উপস্থিতি লেখা হয়নি।', 'No attendance recorded yet.')}</p>`}
    <div class="card-head mt12"><h2>${L('ফি ও পেমেন্টের ইতিহাস', 'Fee & payment history')}</h2><button type="button" class="link" data-action="tc-inc-add" data-link="stu:${id}">+ ${L('আয়', 'Income')}</button></div>
    ${inc.length ? `<div class="list">${inc.map(i => tcIncRow(x, i, td)).join('')}</div>` : `<p class="hint">${L('ফি তৈরি হলে এখানে মাসভিত্তিক দেখাবে।', 'Monthly fees show here once created.')}</p>`}
    ${fin.pays.length ? `<div class="section-title">${L('পেমেন্ট হয়েছে', 'Payments received')} · ${fin.pays.filter(p => !p.void).length}</div><div class="list">${fin.pays.slice(0, 12).map(p => { const i = x.inc[p.ref], lb = i ? tcIncLabel(x, i) : { s: '' };
      return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-item" data-id="${esc(p.ref)}" data-side="in"><span class="lic">${p.void ? '🚫' : '💵'}</span><span class="lmain"><b style="${p.void ? 'text-decoration:line-through;opacity:.6' : ''}">${tcM(p.amt)} · ${tcN(TC_METHOD, p.method || 'cash')}</b><small>${fmtDate(p.date)}${i ? ' · ' + tcYmLabel(i.ym) + ' ' + esc(lb.s) : ''}${p.void ? ' · ' + L('বাতিল', 'voided') : ''}</small></span></button>${p.void ? '' : `<button type="button" class="rowdel" data-action="tc-pay-void" data-id="${p.id}" aria-label="${L('পেমেন্ট বাতিল', 'Void payment')}">${icon('x', 18)}</button>`}</div>`; }).join('')}</div>` : ''}
    <div class="card-head mt12"><h2>🏆 ${L('পরীক্ষার ফল', 'Exam results')}</h2></div>${tcStuResultsHtml(id)}
    <div class="card-head mt12"><h2>📎 ${L('নোট ও ডকুমেন্ট', 'Notes & documents')}</h2></div>
    ${s.notes ? `<p class="hint" style="white-space:pre-wrap">${esc(s.notes)}</p>` : ''}${tcPhotoStrip('stu', id)}
    <div class="menu mt12">${tcMenu('tc-stu-edit', 'edit', L('তথ্য সম্পাদনা', 'Edit details'), L('নাম, শ্রেণি, ফোন, নোট, তারিখ', 'Name, class, phone, notes, dates'), id)}
      ${s.archived ? '' : s.status === 'active' ? tcMenu('tc-stu-st', 'clock', L('বিরতিতে রাখুন', 'Pause'), L('বিরতির সময় নতুন ফি তৈরি হবে না', 'No new fees while paused'), id, 'data-v="paused"') + tcMenu('tc-stu-st', 'undo', L('পড়া ছেড়েছে', 'Mark as left'), L('পরের মাস থেকে ফি তৈরি হবে না, পুরোনো বকেয়া থাকবে', 'No fees from next month; old dues stay'), id, 'data-v="left"') : tcMenu('tc-stu-st', 'check', L('আবার চালু করুন', 'Resume'), L('আবার ফি তৈরি হবে', 'Fees are created again'), id, 'data-v="active"')}
      ${tcDanger('tc-stu-del', s.archived ? L('আর্কাইভ / ডিলিট বিকল্প', 'Archive / delete options') : L('শিক্ষার্থী সরান', 'Remove student'), L('বকেয়া থাকলে সতর্ক করবে; আর্কাইভ করলে ইতিহাস থাকে', 'Warns about dues; archiving keeps the history'), id)}</div>`;
}

/* ---------- চাকরি ---------- */
function tcJobHtml(id) {
  const t = tcd(), x = tcCtx(t), td = today(), ym = tcYm(td), j = x.job[id];
  if (!j) return sheetHead(L('পাওয়া যায়নি', 'Not found'));
  const months = tcEntityMonths(t, { jobId: id }), inc = x.incomes.filter(i => i.c.jobId === id).sort((a, b) => b.ym.localeCompare(a.ym) || b.id.localeCompare(a.id)).slice(0, 18);
  const exps = tcLive(t.expenses).filter(e => e.jobId === id).sort(byDateDesc).slice(0, 8);
  const tot = months.reduce((a, r) => ({ e: a.e + r.earned, p: a.p + r.received, d: a.d + r.due, x: a.x + r.exp }), { e: 0, p: 0, d: 0, x: 0 });
  return `${sheetHead(esc(j.name), esc(j.role || ''))}
    <div class="hint" style="margin:0 0 8px">${L('বেতন', 'Salary')} <b>${tcM(tcRateAt(j.salary, ym))}</b> · ${L('প্রতি মাসের', 'every month on')} ${j.payDay || 1} ${L('তারিখে', '')}${j.active === false ? ' · ' + L('নিষ্ক্রিয়', 'inactive') : ''}${j.info ? '<br>' + esc(j.info) : ''}</div>
    ${tcMinis([[L('মোট আয়', 'Earned'), tcM(tot.e)], [L('পেয়েছি', 'Received'), tcM(tot.p), 'pos'], [L('বাকি', 'Due'), tcM(tot.d), tot.d > 0 ? 'neg' : '']])}
    <div class="quick four mt12"><button type="button" class="qbtn" data-action="tc-jsal" data-id="${id}"><span class="qi">${icon('trend')}</span>${L('বেতন বদল', 'Change pay')}</button>
      <button type="button" class="qbtn" data-action="tc-inc-add" data-link="job:${id}"><span class="qi">${icon('plus')}</span>${L('বোনাস/আয়', 'Bonus')}</button>
      <button type="button" class="qbtn" data-action="tc-exp-add" data-link="job:${id}"><span class="qi">${icon('receipt')}</span>${L('খরচ', 'Cost')}</button>
      <button type="button" class="qbtn" data-action="tc-jsl-add" data-id="${id}"><span class="qi">${icon('cal')}</span>${L('ক্লাস সময়', 'Class time')}</button></div>
    ${(j.sched || []).length ? `<div class="section-title">${L('ক্লাসের সময়সূচি', 'Class schedule')}</div><div class="list">${j.sched.map(sc => `<button type="button" class="lrow" data-action="tc-jsl-edit" data-id="${id}" data-sid="${sc.id}"><span class="lic">🕒</span><span class="lmain"><b>${esc(sc.label || j.name)}</b><small>${(sc.days || []).map(d => tcN(TC_DAYN, d)).join(', ')}${sc.time ? ' · ' + tcTime(sc.time) : ''}${sc.place ? ' · 📍' + esc(sc.place) : ''}</small></span></button>`).join('')}</div>` : ''}
    <div class="section-title">${L('মাসভিত্তিক রিপোর্ট', 'Month-wise report')}</div>
    ${months.length ? months.slice(0, 12).map(r => `<div class="hg-day"><span><b>${tcYmLabel(r.ym)}</b><small>${L('আয়', 'Income')} ${tcM(r.earned)} · ${L('পেয়েছি', 'received')} ${tcM(r.received)} · ${L('খরচ', 'cost')} ${tcM(r.exp)}</small></span><b class="${r.net < 0 ? 'neg' : ''}">${tcM(r.net)}</b></div>`).join('') : `<p class="hint">${L('মাস তৈরি করলে বেতনের হিসাব এখানে আসবে।', 'Salary rows appear once months are created.')}</p>`}
    <div class="section-title">${L('বেতন ও আয়ের ইতিহাস', 'Salary & income history')}</div>
    ${inc.length ? `<div class="list">${inc.map(i => tcIncRow(x, i, td)).join('')}</div>` : `<p class="hint">${L('এখনও কোনো মাসের বেতন তৈরি হয়নি। "আরও → নতুন মাসের হিসাব" থেকে তৈরি করুন।', 'No month created yet. Use More → Create a month\'s books.')}</p>`}
    ${exps.length ? `<div class="section-title">${L('চাকরিসংক্রান্ত খরচ', 'Job costs')}</div><div class="list">${exps.map(e => tcExpRow(x, e, td)).join('')}</div>` : ''}
    <div class="menu mt12">${tcMenu('tc-job-edit', 'edit', L('তথ্য সম্পাদনা', 'Edit details'), L('নাম, পদবি, বেতনের দিন, তারিখ', 'Name, role, pay day, dates'), id)}
      ${tcMenu('tc-job-act', j.active === false ? 'check' : 'clock', j.active === false ? L('আবার সক্রিয়', 'Activate') : L('নিষ্ক্রিয় করুন', 'Deactivate'), L('নিষ্ক্রিয় হলে নতুন মাসে বেতন তৈরি হবে না', 'No salary is created for new months'), id)}
      ${tcDanger('tc-job-del', L('চাকরি ডিলিট', 'Delete job'), L('শুধু যার কোনো বেতন/পেমেন্ট নেই', 'Only if it has no salary/payments'), id)}</div>`;
}

/* ---------- ব্যাচ ---------- */
function tcBatHtml(id) {
  const t = tcd(), x = tcCtx(t), td = today(), ym = tcUi.ym, b = x.bat[id];
  if (!b) return sheetHead(L('পাওয়া যায়নি', 'Not found'));
  const months = tcEntityMonths(t, { batchId: id }), cur = months.find(r => r.ym === ym) || { earned: 0, received: 0, due: 0, exp: 0, net: 0 };
  const ens = tcLive(t.enrolls).filter(e => e.batchId === id && (!e.to || e.to >= ym)).sort((p, q) => ((x.stu[p.studentId] || {}).name || '').localeCompare((x.stu[q.studentId] || {}).name || ''));
  const recs = tcLive(t.recurs).filter(r => r.batchId === id), exps = tcLive(t.expenses).filter(e => e.batchId === id && !e.recurId && !e.ref).sort(byDateDesc).slice(0, 6);
  const center = tcLive(t.centers).find(c => c.id === b.centerId), bf = tcBatchFin(t, id, td, x), bfs = Object.fromEntries(bf.rows.map(r => [r.sid, r]));
  const asum = tcBatchAttSummary(t, id, ym), adays = tcBatchDays(t, id).slice(0, 4);
  return `${sheetHead(esc(b.name) + (b.code ? ` (${esc(b.code)})` : ''), [center && center.name, b.cls, b.subject].filter(Boolean).map(esc).join(' · '))}
    <div class="hint" style="margin:0 0 8px">${(b.days || []).map(d => tcN(TC_DAYN, d)).join(', ') || L('দিন ঠিক নেই', 'no days')}${b.time ? ' · ' + tcTime(b.time) : ''}${b.place ? ' · 📍' + esc(b.place) : ''}${b.fee ? ' · ' + L('ফি', 'fee') + ' ' + tcM(b.fee) : ''}${b.archived ? ' · ' + L('আর্কাইভ', 'archived') : b.active === false ? ' · ' + L('নিষ্ক্রিয়', 'inactive') : ''}</div>
    <div class="quick four"><button type="button" class="qbtn" data-action="tc-batt" data-id="${id}" data-date="${td}"><span class="qi">✅</span>${L('উপস্থিতি', 'Attendance')}</button>
      <button type="button" class="qbtn" data-action="tc-enr-add" data-bid="${id}"><span class="qi">＋</span>${L('শিক্ষার্থী যোগ', 'Add students')}</button>
      <button type="button" class="qbtn" data-action="tc-exam-add" data-bid="${id}"><span class="qi">📝</span>${L('পরীক্ষা', 'Exam')}</button>
      <button type="button" class="qbtn" data-action="tc-bat-edit" data-id="${id}"><span class="qi">${icon('edit')}</span>${L('ব্যাচ এডিট', 'Edit batch')}</button></div>
    <div class="section-title">${L('ব্যাচের ফি (সব সময়)', 'Batch fees (all time)')}</div>
    ${tcMinis([[L('ঠিক করা', 'Agreed'), tcM(bf.agreed)], [L('আদায়', 'Collected'), tcM(bf.collected), 'pos'], [L('বাকি', 'Due'), tcM(bf.due), bf.due > 0 ? 'neg' : '']])}
    ${bf.overdue > 0 ? `<p class="hint neg" style="margin:6px 0 0">⚠️ ${L('সময় পার হওয়া', 'Overdue')} ${tcM(bf.overdue)}</p>` : ''}
    <div class="section-title" style="margin-top:12px">${tcYmLabel(ym)} · ${L('আয়-খরচ', 'income & cost')}</div>
    ${tcMinis([[L('আয়', 'Income'), tcM(cur.earned)], [L('খরচ', 'Cost'), tcM(cur.exp)], [L('লাভ', 'Profit'), tcM(cur.net), cur.net < 0 ? 'neg' : 'pos']])}
    <div class="card-head mt12"><h2>${L('শিক্ষার্থী', 'Students')} · ${ens.length}</h2><button type="button" class="link" data-action="tc-enr-add" data-bid="${id}">+ ${L('যোগ', 'Add')}</button></div>
    ${ens.length ? `<div class="list">${ens.map(e => { const s = x.stu[e.studentId]; if (!s) return ''; const r = bfs[e.studentId], i = x.incomes.find(z => z.c.key === 'b:' + e.id + ':' + ym), stt = i && tcItemState(x, i.id, 'in', td), ar = asum.rows.find(z => z.sid === e.studentId);
      return `<div class="lwrap"><button type="button" class="lrow" data-action="tc-stu" data-id="${s.id}"><span class="lic">🎓</span><span class="lmain"><b>${esc(s.name)}</b><small>${tcM(tcRateAt(e.fees, ym < e.from ? e.from : ym))}${L('/মাস', '/mo')} · ${ar ? L('উপস্থিতি', 'att.') + ' ' + ar.pct + '%' : L('উপস্থিতি —', 'att. —')}${stt ? ' ' + tcBadge(stt.status) : r ? ' ' + tcStBadge(r.status) : ''}</small></span><span class="lend">${r && r.due > 0 ? `<b class="neg">${tcM(r.due)}</b><small>${L('বাকি', 'due')}</small>` : `<small class="pos">${L('বাকি নেই', 'no dues')}</small>`}</span></button>${r && r.due > 0 ? `<button type="button" class="rowedit" data-action="tc-collect" data-id="${s.id}" data-bid="${id}" aria-label="${L('ফি নিন', 'Collect fee')}">💵</button>` : ''}${rowTools('tc-enr-fee', 'tc-enr-rm-ask', e.id)}</div>`; }).join('')}</div>` : `<p class="hint">${L('এই ব্যাচে এখনও কোনো শিক্ষার্থী নেই।', 'No students in this batch yet.')}</p>`}
    <div class="card-head mt12"><h2>${L('উপস্থিতি', 'Attendance')}</h2><button type="button" class="link" data-action="tc-batt-hist" data-id="${id}">${L('পুরো ইতিহাস', 'Full history')}</button></div>
    ${tcMinis([[L('এই মাসে ক্লাস', 'Classes this month'), String(asum.classes)], [L('গড় উপস্থিতি', 'Average'), asum.avgPct == null ? '—' : asum.avgPct + '%', asum.avgPct != null && asum.avgPct < 60 ? 'neg' : 'pos']])}
    ${adays.length ? `<div class="list mt8">${adays.map(d => `<button type="button" class="lrow" data-action="tc-batt-edit" data-id="${id}" data-date="${d.date}"><span class="lic">✅</span><span class="lmain"><b>${fmtDate(d.date)}</b><small>${L('উপস্থিত', 'Present')} ${d.present.length} · ${L('অনুপস্থিত', 'Absent')} ${d.absent.length}</small></span><span class="lend"><b>${d.pct == null ? '—' : d.pct + '%'}</b></span></button>`).join('')}</div>` : `<p class="hint">${L('এখনও উপস্থিতি নেওয়া হয়নি। ওপরের "উপস্থিতি" বাটনে চাপুন।', 'No attendance yet. Tap "Attendance" above.')}</p>`}
    <div class="card-head mt12"><h2>🏆 ${L('পরীক্ষা ও ফল', 'Exams & results')}</h2><button type="button" class="link" data-action="tc-exam-add" data-bid="${id}">+ ${L('পরীক্ষা', 'Exam')}</button></div>${tcBatResultsHtml(id)}
    <div class="card-head mt12"><h2>🔁 ${L('নিয়মিত খরচ ও সহকারীর বেতন', 'Regular costs & assistant pay')}</h2><button type="button" class="link" data-action="tc-rec-add" data-link="bat:${id}">+ ${L('যোগ', 'Add')}</button></div>
    ${recs.length ? `<div class="list">${recs.map(r => `<div class="lwrap"><button type="button" class="lrow" data-action="tc-rec-edit" data-id="${r.id}"><span class="lic">${tcCat(r.cat).e}</span><span class="lmain"><b>${esc(r.name)}</b><small>${esc(tcCatName(r.cat))}${r.active === false ? ' · ' + L('বন্ধ', 'stopped') : ''}</small></span><span class="lend"><b>${tcM(tcRateAt(r.amts, ym))}</b></span></button>${rowTools('tc-rec-edit', 'tc-rec-del', r.id)}</div>`).join('')}</div>` : `<p class="hint">${L('রুম ভাড়া, বিদ্যুৎ, ইন্টারনেট বা সহকারী শিক্ষকের বেতন এখানে দিন।', 'Add room rent, electricity, internet or assistant teacher pay.')}</p>`}
    ${exps.length ? `<div class="section-title">${L('অন্যান্য খরচ', 'Other costs')}</div><div class="list">${exps.map(e => tcExpRow(x, e, td)).join('')}</div>` : ''}
    <div class="quick mt12"><button type="button" class="qbtn" data-action="tc-exp-add" data-link="bat:${id}"><span class="qi">${icon('receipt')}</span>${L('খরচ', 'Cost')}</button><button type="button" class="qbtn" data-action="tc-inc-add" data-link="bat:${id}"><span class="qi">${icon('plus')}</span>${L('আয়', 'Income')}</button></div>
    ${months.length ? `<div class="section-title">${L('মাসভিত্তিক আয়-ব্যয়-লাভ', 'Month-wise income, cost, profit')}</div>${months.slice(0, 12).map(r => `<div class="hg-day"><span><b>${tcYmLabel(r.ym)}</b><small>${L('আয়', 'Income')} ${tcM(r.earned)} · ${L('খরচ', 'cost')} ${tcM(r.exp)}</small></span><b class="${r.net < 0 ? 'neg' : ''}">${tcM(r.net)}</b></div>`).join('')}` : ''}
    <div class="menu mt12">${tcMenu('tc-bat-edit', 'edit', L('ব্যাচের তথ্য সম্পাদনা', 'Edit batch'), L('নাম, সময়সূচি, ফি, কোচিং', 'Name, schedule, fee, coaching'), id)}
      ${b.archived ? '' : tcMenu('tc-bat-act', b.active === false ? 'check' : 'clock', b.active === false ? L('আবার সক্রিয়', 'Activate') : L('নিষ্ক্রিয় করুন', 'Deactivate'), L('নিষ্ক্রিয় ব্যাচে নতুন মাসে ফি তৈরি হবে না', 'No fees for new months'), id)}
      ${tcDanger('tc-bat-del', b.archived ? L('আর্কাইভ / ডিলিট বিকল্প', 'Archive / delete options') : L('ব্যাচ সরান', 'Remove batch'), L('বকেয়া থাকলে সতর্ক করবে; আর্কাইভ করলে ইতিহাস থাকে', 'Warns about dues; archiving keeps the history'), id)}</div>`;
}

/* ---------- ক্লাসের স্ট্যাটাস শিট ---------- */
function tcFindEntry(id, date) { return tcDay(tcd(), date).find(e => e.key + (e.moved ? '#m' : '') === id); }
function tcSessHtml(id, date) {
  const e = tcFindEntry(id, date);
  if (!e) return sheetHead(L('ক্লাস পাওয়া যায়নি', 'Class not found'));
  const b = (st, ic, label) => `<button type="button" class="btn block ${e.st === st ? 'primary' : ''}" data-action="tc-sess-set" data-id="${esc(id)}" data-date="${date}" data-st="${st}">${ic} ${label}</button>`;
  return `${sheetHead(esc(e.who), `${fmtDate(date)}${e.time ? ' · ' + tcTime(e.time) : ''} · ${esc(e.what)}`)}
    <p class="hint" style="margin:0 0 10px"><span class="tcb ${e.st}">${tcN(TC_STN, e.st)}</span>${e.conflict ? ` ⚠️ ${L('অন্য ক্লাসের সাথে সময় মিলছে', 'overlaps another class')}` : ''}${e.movedTo ? ` → ${fmtDate(e.movedTo.date)}${e.movedTo.time ? ' ' + tcTime(e.movedTo.time) : ''}` : ''}</p>
    <div class="tcstack">${e.kind === 'batch' ? `<button type="button" class="btn block primary" data-action="tc-att" data-id="${esc(id)}" data-date="${date}">${icon('users', 18)} ${L('উপস্থিতি নিন (সম্পন্ন)', 'Take attendance (done)')}</button>` : b('done', '✅', L('সম্পন্ন / উপস্থিত', 'Done / present'))}
      ${e.kind === 'private' ? b('absent', '🙅', L('শিক্ষার্থী অনুপস্থিত', 'Student absent')) : ''}
      ${b('cancelled', '🚫', L('ক্লাস বাতিল', 'Class cancelled'))}
      ${e.extra ? '' : `<button type="button" class="btn block" data-action="tc-post" data-id="${esc(id)}" data-date="${date}">📆 ${L('স্থগিত / অন্য সময়ে', 'Postpone / reschedule')}</button>`}
      ${e.st !== 'pending' ? b('pending', '↩️', L('আবার অপেক্ষমাণ করুন', 'Set back to pending')) : ''}
      ${e.extra ? `<button type="button" class="btn danger block" data-action="tc-extra-del" data-id="${esc(id)}" data-date="${date}">${icon('trash', 18)} ${L('এই অতিরিক্ত ক্লাস মুছুন', 'Remove this extra class')}</button>` : ''}</div>
    ${e.kind === 'private' ? `<p class="hint">${L('প্রতি-ক্লাসের ফিতে শুধু "সম্পন্ন" ক্লাস ধরা হয়। অনুপস্থিত, বাতিল বা স্থগিত ক্লাসের ফি লাগে না।', 'For per-class fees only "done" classes are billed. Absent, cancelled or postponed classes are not.')}</p>` : ''}`;
}

/* ---------- নতুন মাসের হিসাব তৈরি (দেখে নিয়ে) ---------- */
function tcRollHtml() {
  const t = tcd(), ym = tcUi.rollYm || tcUi.ym, plan = tcPlan(t, ym), x = tcCtx(t);
  const have = t.charges.filter(c => c.ym === ym).length + t.expenses.filter(e => e.key && e.key.endsWith(':' + ym)).length;
  const grp = [['job', L('চাকরির বেতন', 'Salary')], ['private', L('প্রাইভেট ফি', 'Private fees')], ['batch', L('কোচিং ফি', 'Coaching fees')], ['recur', L('নিয়মিত খরচ', 'Regular costs')]];
  return `${sheetHead(L('নতুন মাসের হিসাব', 'New month\'s books'), L('দেখে নিয়ে তৈরি করুন, আগের মাস অপরিবর্তিত থাকবে', 'Review, then create; earlier months stay unchanged'))}
    <div class="tcmn"><button type="button" class="icon-btn" data-action="tc-roll-ym" data-d="-1">${icon('prev', 20)}</button><b>${tcYmLabel(ym)}</b><button type="button" class="icon-btn" data-action="tc-roll-ym" data-d="1">${icon('next', 20)}</button></div>
    <p class="hint" style="margin:0 0 8px">${have ? L(`ইতিমধ্যে তৈরি আছে: ${have}টা (দ্বিতীয়বার তৈরি হবে না)`, `Already created: ${have} (never created twice)`) : L('এই মাসের কিছু এখনও তৈরি হয়নি।', 'Nothing created for this month yet.')}</p>
    ${plan.length ? `<form data-form="tc-roll" data-ym="${ym}" autocomplete="off">
      ${grp.map(([k, title]) => { const items = plan.map((p, i) => [p, i]).filter(([p]) => p.kind === k); if (!items.length) return '';
        return `<div class="section-title">${title} · ${items.length}</div>${items.map(([p, i]) => `<div class="tcroll"><label class="check"><input type="checkbox" name="k" value="${i}" checked><span><b>${esc(p.who)}</b>${p.what ? ' · ' + esc(p.what) : ''}<small class="faint">${fmtDate(p.due)}</small></span></label>
          ${p.auto ? `<span class="hint">${L('ক্লাস অনুযায়ী', 'per class')}</span>` : moneyInput('a' + i, String(p.amt / 100), '0')}</div>`).join('')}`; }).join('')}
      <button class="btn primary block mt12" type="submit">${icon('check', 18)} ${L('তৈরি করুন', 'Create')}</button>
      <p class="hint">${L('টাকার ঘরে প্রকৃত অঙ্ক। বদলাতে চাইলে এখানেই বদলান, শুধু এই মাসের জন্য। বেতন বা ফি স্থায়ীভাবে বদলাতে সংশ্লিষ্ট পাতা থেকে "কার্যকর মাস" দিন।', 'The amount boxes hold the real figures. Edit here for this month only. To change pay or fees for good, set an "effective month" on the job or student.')}</p></form>`
      : `<p class="hint">${L('তৈরি করার মতো কিছু বাকি নেই। নতুন শিক্ষার্থী, ব্যাচ, চাকরি বা নিয়মিত খরচ যোগ করলে এখানে আসবে।', 'Nothing left to create. New students, batches, jobs or regular costs will show up here.')}</p>`}`;
}
