'use strict';

/* =========================================================
   শিক্ষক ব্যবস্থাপনা: ফর্ম, অ্যাকশন, গাইড ও registerModule
   সব টাকার ঘরে প্রকৃত অঙ্ক; সেভও প্রকৃত অঙ্কে (tcMinor)। ১ টাকা যোগ শুধু প্রদর্শনে।
   ========================================================= */

/* ---------- ফর্মের ছোট সহায়ক ---------- */
const tcIn = (f, n) => (f.elements[n] ? tcMinor(f.elements[n].value) : 0);
const tcV = (f, n) => (f.elements[n] ? String(f.elements[n].value).trim() : '');
const tcField = (label, html) => `<label class="field"><span>${label}</span>${html}</label>`;
const tcTxt = (name, val, ph = '', extra = '') => `<input class="input" name="${name}" value="${esc(val || '')}" placeholder="${ph}" ${extra}>`;
const tcDateIn = (name, val) => `<input class="input" type="date" name="${name}" value="${esc(val || '')}">`;
const tcMonthIn = (name, val) => `<input class="input" type="month" name="${name}" value="${esc(val || '')}" placeholder="YYYY-MM">`;
const tcSubmit = (label = '') => `<button class="btn primary block mt12" type="submit">${label || L('সেভ করুন', 'Save')}</button>`;
const tcDaysPick = vals => `<div class="field"><span class="flabel">${L('ক্লাসের দিন', 'Class days')}</span><div class="seg tcdays">${TC_DAYS.map(d => `<label><input type="checkbox" name="days" value="${d}" ${(vals || []).includes(d) ? 'checked' : ''}><span>${tcN(TC_DAYN, d)}</span></label>`).join('')}</div></div>`;
const tcDaysOf = f => $$('input[name="days"]:checked', f).map(i => i.value);
const tcMore = html => `<details class="tcmore"><summary>${L('আরও তথ্য (ঐচ্ছিক)', 'More details (optional)')}</summary>${html}</details>`;
const tcStu = id => tcd().students.find(s => s.id === id && !s.del);
const tcJob = id => tcd().jobs.find(j => j.id === id && !j.del);
const tcBat = id => tcd().batches.find(b => b.id === id && !b.del);
function tcLinkSel(name, val, only) {
  const t = tcd(), o = [['', L('কোনোটির সাথে নয় (সাধারণ)', 'None (general)')]];
  if (!only || only.includes('job')) tcLive(t.jobs).forEach(j => o.push(['job:' + j.id, '💼 ' + esc(j.name)]));
  if (!only || only.includes('stu')) tcLive(t.students).forEach(s => o.push(['stu:' + s.id, '🎓 ' + esc(s.name)]));
  if (!only || only.includes('bat')) tcLive(t.batches).forEach(b => o.push(['bat:' + b.id, '🏫 ' + esc(b.name)]));
  return tcSel(name, o, val || '');
}
function tcLinkParse(v) {
  const [k, id] = String(v || '').split(':'), o = {};
  if (id && k === 'job' && tcJob(id)) o.jobId = id;
  if (id && k === 'stu' && tcStu(id)) o.studentId = id;
  if (id && k === 'bat' && tcBat(id)) o.batchId = id;
  return o;
}
const tcLinkOf = r => (r ? (r.jobId ? 'job:' + r.jobId : r.studentId ? 'stu:' + r.studentId : r.batchId ? 'bat:' + r.batchId : '') : '');
const tcMethodSel = (v = 'cash') => tcSel('method', Object.keys(TC_METHOD).map(k => [k, tcN(TC_METHOD, k)]), v);
const tcCatOpts = only => tcCatsAll().filter(c => !only || only.includes(c.k)).map(c => [c.k, `${c.e} ${esc(isEN() ? c.en : c.bn)}`]);
const tcGetSess = (t, e) => e.rec || t.sessions.find(s => s.key === e.key);

/* ---------- পেমেন্ট ---------- */
function tcPayForm(id, side) {
  const x = tcCtx(tcd()), st = tcItemState(x, id, side, today());
  if (!st) return;
  tcOpenForm(`${sheetHead(side === 'in' ? L('পেমেন্ট গ্রহণ', 'Record payment') : L('পরিশোধ করুন', 'Record payment'), `${L('বাকি', 'Due')} ${tcM(st.rem)}`)}
    <form data-form="tc-pay" data-id="${esc(id)}" data-side="${side}" autocomplete="off">
      ${tcField(L('কত টাকা', 'Amount'), moneyInput('amt', String(st.rem / 100), '0'))}
      <div class="row2">${tcField(L('তারিখ', 'Date'), tcDateIn('date', today()))}${tcField(L('মাধ্যম', 'Method'), tcMethodSel())}</div>
      ${tcField(L('নোট (ঐচ্ছিক)', 'Note (optional)'), tcTxt('note', '', '', 'maxlength="80"'))}${tcSubmit()}</form>`);
}
FORMS['tc-pay'] = f => {
  const t = tcd(), id = f.dataset.id, side = f.dataset.side, x = tcCtx(t), st = tcItemState(x, id, side, today());
  const amt = tcIn(f, 'amt'), date = tcV(f, 'date');
  if (!st) return closeSheet();
  if (!(amt > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter an amount'), 'amt');
  if (!tcDateOk(date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  if (amt > st.rem) return fail(f, L(`বাকি টাকার (${tcM(st.rem)}) বেশি নেওয়া যাবে না। অগ্রিম নিতে আগে পরের মাসের ফি তৈরি করুন।`, `Cannot exceed the amount due (${tcM(st.rem)}). For an advance, create next month's fee first.`), 'amt');
  const dup = t.pays.some(p => p.ref === id && !p.void && p.amt === amt && p.date === date && Date.now() - (p.createdAt || 0) < 3000);
  if (!dup) t.pays.push({ id: uid(), side, ref: id, amt, date, method: tcV(f, 'method') || 'cash', note: tcV(f, 'note'), createdAt: Date.now() });
  tcAfter(SAVED());
};
ACTIONS['tc-pay-void'] = el => {
  if (!confirm(L('এই পেমেন্ট বাতিল করবেন? ইতিহাসে থাকবে, কিন্তু হিসাব থেকে বাদ যাবে।', 'Void this payment? It stays in history but is removed from the totals.'))) return;
  const p = tcd().pays.find(z => z.id === el.dataset.id); if (!p) return;
  p.void = true; p.voidAt = Date.now(); tcRefresh(L('পেমেন্ট বাতিল হয়েছে', 'Payment voided'));
};

/* ---------- আয়ের পাওনা (বোনাস, অতিরিক্ত, অন্যান্য) ও পাওনা সম্পাদনা ---------- */
function tcIncForm(link) {
  tcOpenForm(`${sheetHead(L('আয় যোগ', 'Add income'), L('বোনাস, অতিরিক্ত ক্লাসের টাকা বা অন্য আয়', 'Bonus, extra-class money or other income'))}
    <form data-form="tc-inc" autocomplete="off">
      ${tcField(L('ধরন', 'Type'), tcSel('kind', ['bonus', 'extra', 'other'].map(k => [k, tcN(TC_KIND, k)]), 'bonus'))}
      ${tcField(L('পরিমাণ', 'Amount'), moneyInput('amt', '', '0'))}
      <div class="row2">${tcField(L('তারিখ', 'Date'), tcDateIn('date', today()))}${tcField(L('কোন মাসের', 'For month'), tcMonthIn('ym', tcYm(today())))}</div>
      ${tcField(L('কার সাথে যুক্ত (ঐচ্ছিক)', 'Linked to (optional)'), tcLinkSel('link', link))}
      ${tcField(L('বিবরণ (ঐচ্ছিক)', 'Description (optional)'), tcTxt('desc', '', '', 'maxlength="80"'))}
      <label class="check"><input type="checkbox" name="got" checked><span>${L('টাকা এখনই পেয়েছি (পেমেন্ট হিসেবে লেখা হবে)', 'Money received now (recorded as a payment)')}</span></label>
      ${tcField(L('মাধ্যম', 'Method'), tcMethodSel())}${tcSubmit()}</form>`);
}
FORMS['tc-inc'] = f => {
  const t = tcd(), amt = tcIn(f, 'amt'), date = tcV(f, 'date'), ym = tcV(f, 'ym') || tcYm(date);
  if (!(amt > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter an amount'), 'amt');
  if (!tcDateOk(date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  if (!tcYmOk(ym)) return fail(f, L('মাস ঠিক নেই (যেমন 2026-10)', 'Check the month (e.g. 2026-10)'), 'ym');
  const link = tcLinkParse(tcV(f, 'link')), id = 'm:' + uid();
  t.charges.push(Object.assign({ id, key: id, kind: tcV(f, 'kind'), ym, amt, due: date, desc: tcV(f, 'desc'), createdAt: Date.now() }, link));
  if (f.elements.got.checked) t.pays.push({ id: uid(), side: 'in', ref: id, amt, date, method: tcV(f, 'method') || 'cash', note: '', createdAt: Date.now() });
  tcAfter(SAVED());
};
function tcChgForm(id) {
  const t = tcd(), c = t.charges.find(z => z.id === id), x = tcCtx(t); if (!c) return;
  tcOpenForm(`${sheetHead(L('পাওনা সম্পাদনা', 'Edit item'), tcYmLabel(c.ym))}
    <form data-form="tc-chg" data-id="${esc(id)}" autocomplete="off">
      ${c.auto ? `<p class="hint">${L('প্রতি-ক্লাসের ফি ক্লাসের সংখ্যা থেকে নিজে হিসাব হয়।', 'A per-class fee is worked out from the classes held.')}</p>` : tcField(L('পরিমাণ', 'Amount'), moneyInput('amt', String(x.amt(c) / 100), '0'))}
      ${tcField(L('নির্ধারিত দিন', 'Due date'), tcDateIn('due', c.due))}
      ${c.kind === 'job' || c.kind === 'private' || c.kind === 'batch' ? '' : tcField(L('বিবরণ', 'Description'), tcTxt('desc', c.desc, '', 'maxlength="80"'))}
      ${tcField(L('নোট (ঐচ্ছিক)', 'Note (optional)'), tcTxt('note', c.note, '', 'maxlength="80"'))}${tcSubmit()}</form>`);
}
FORMS['tc-chg'] = f => {
  const t = tcd(), c = t.charges.find(z => z.id === f.dataset.id); if (!c) return closeSheet();
  const due = tcV(f, 'due'); if (due && !tcDateOk(due)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'due');
  if (!c.auto) {
    const amt = tcIn(f, 'amt'), paid = tcCtx(t).paid(c.id);
    if (!(amt > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter an amount'), 'amt');
    if (amt < paid) return fail(f, L(`পরিশোধিত টাকার (${tcM(paid)}) চেয়ে কম হতে পারে না। আগে পেমেন্ট বাতিল করুন।`, `Cannot be less than what is already paid (${tcM(paid)}). Void a payment first.`), 'amt');
    c.amt = amt;
  }
  c.due = due; c.note = tcV(f, 'note'); if (f.elements.desc) c.desc = tcV(f, 'desc');
  tcAfter(SAVED());
};
Object.assign(ACTIONS, {
  'tc-chg-cancel': el => {
    const t = tcd(), c = t.charges.find(z => z.id === el.dataset.id); if (!c) return;
    if (tcCtx(t).paid(c.id) > 0) return toast(L('আগে এই পাওনার পেমেন্টগুলো বাতিল করুন', 'Void its payments first'), 'danger');
    if (!confirm(L('এই পাওনা বাতিল করবেন? হিসাবে ধরা হবে না, পরে আবার চালু করা যাবে।', 'Cancel this item? It will not be counted, and can be restored.'))) return;
    c.cancelled = true; tcRefresh(L('বাতিল হয়েছে', 'Cancelled'));
  },
  'tc-chg-restore': el => { const c = tcd().charges.find(z => z.id === el.dataset.id); if (c) { c.cancelled = false; tcRefresh(L('আবার চালু হয়েছে', 'Restored')); } },
  'tc-chg-edit': el => tcChgForm(el.dataset.id),
});

/* ---------- খরচ ---------- */
function tcExpForm(e, link) {
  const isNew = !e, v = e || { date: today(), cat: 'other' };
  tcOpenForm(`${sheetHead(isNew ? L('নতুন খরচ', 'New expense') : L('খরচ সম্পাদনা', 'Edit expense'))}
    <form data-form="tc-exp" data-id="${e ? e.id : ''}" autocomplete="off">
      ${tcField(L('পরিমাণ', 'Amount'), moneyInput('amt', e ? String(e.amt / 100) : '', '0'))}
      <div class="row2">${tcField(L('তারিখ', 'Date'), tcDateIn('date', v.date))}${tcField(L('খাত', 'Category'), tcSel('cat', tcCatOpts(), v.cat))}</div>
      ${tcField(L('বিবরণ (ঐচ্ছিক)', 'Description (optional)'), tcTxt('desc', v.desc, '', 'maxlength="80"'))}
      ${tcField(L('কোন চাকরি/শিক্ষার্থী/ব্যাচের জন্য (ঐচ্ছিক)', 'For which job / student / batch (optional)'), tcLinkSel('link', link || tcLinkOf(e)))}
      ${isNew ? `<div class="row2">${tcField(L('পরিশোধ', 'Payment'), tcSel('pstat', [['paid', L('পরিশোধিত', 'Paid')], ['partial', L('আংশিক', 'Partly paid')], ['unpaid', L('বাকি', 'Unpaid')]], 'paid'))}${tcField(L('আংশিক হলে কত দিয়েছেন', 'If partly, paid so far'), moneyInput('pnow', '', '0'))}</div>` : ''}
      ${tcMore(`${tcField(L('পরিশোধের শেষ দিন (বাকি থাকলে)', 'Pay-by date (if unpaid)'), tcDateIn('due', v.due))}
        <label class="check"><input type="checkbox" name="reusable" ${e && e.reusable ? 'checked' : ''}><span>${L('পুনর্ব্যবহারযোগ্য সরঞ্জাম (একবারই খরচ ধরা হয়)', 'Reusable equipment (counted once)')}</span></label>
        ${isNew ? tcField(L('রসিদ / ছবি', 'Receipt / photo'), '<input type="file" name="photo" accept="image/*" multiple>') : ''}`)}
      ${tcSubmit()}</form>`);
}
FORMS['tc-exp'] = async f => {
  const t = tcd(), id = f.dataset.id, old = id ? t.expenses.find(z => z.id === id) : null, amt = tcIn(f, 'amt'), date = tcV(f, 'date'), cat = tcV(f, 'cat'), due = tcV(f, 'due');
  if (!(amt > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter an amount'), 'amt');
  if (!tcDateOk(date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  if (due && !tcDateOk(due)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'due');
  const link = tcLinkParse(tcV(f, 'link')), linked = Object.keys(link).length, catSrc = tcCat(cat).src;
  const fields = { amt, date, cat, desc: tcV(f, 'desc'), due, reusable: !!f.elements.reusable.checked, jobId: link.jobId, studentId: link.studentId, batchId: link.batchId, src: linked ? '' : (catSrc || 'other'), updatedAt: Date.now() };
  if (old) {
    const paid = tcCtx(t).paid(old.id);
    if (amt < paid) return fail(f, L(`পরিশোধিত টাকার (${tcM(paid)}) চেয়ে কম হতে পারে না`, `Cannot be below what is already paid (${tcM(paid)})`), 'amt');
    Object.assign(old, fields);
    return tcAfter(SAVED());
  }
  const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
  const files = f.elements.photo ? [...f.elements.photo.files] : [], ps = tcV(f, 'pstat'), now = tcIn(f, 'pnow');
  const rec = Object.assign({ id: uid(), photos: [], createdAt: Date.now() }, fields);
  if (files.length) rec.photos = (await tcSavePhotos(files)).ids;
  t.expenses.push(rec);
  const pay = ps === 'paid' ? amt : ps === 'partial' ? Math.min(now, amt) : 0;
  if (pay > 0) t.pays.push({ id: uid(), side: 'out', ref: rec.id, amt: pay, date, method: 'cash', note: '', createdAt: Date.now() });
  tcAfter(SAVED());
};
function tcSupForm(e) {
  const s = (e && e.sup) || {}, shops = [...new Set(tcLive(tcd().expenses).map(z => z.sup && z.sup.shop).filter(Boolean))];
  tcOpenForm(`${sheetHead(e ? L('কেনাকাটা সম্পাদনা', 'Edit purchase') : L('বই / সামগ্রী কেনা', 'Buy books / supplies'))}
    <form data-form="tc-sup" data-live="tc-sup" data-id="${e ? e.id : ''}" autocomplete="off">
      ${tcField(L('কী কিনলেন', 'What did you buy'), tcTxt('item', s.item || (e && e.desc), '', 'maxlength="60"'))}
      ${tcField(L('খাত', 'Category'), tcSel('cat', tcCatOpts(TC_SUPPLY), e ? e.cat : 'stationery'))}
      <div class="row2">${tcField(L('পরিমাণ', 'Quantity'), `<input class="input" name="qty" inputmode="decimal" value="${esc(s.qty || '1')}">`)}${tcField(L('একক দাম', 'Unit price'), moneyInput('unit', s.unit ? String(s.unit / 100) : '', '0'))}</div>
      <div class="bsum ok"><b data-prev>${tcM(0)}</b><span>${L('মোট খরচ = পরিমাণ × একক দাম', 'Total = quantity × unit price')}</span></div>
      <div class="row2 mt12">${tcField(L('তারিখ', 'Date'), tcDateIn('date', e ? e.date : today()))}${tcField(L('দোকান (ঐচ্ছিক)', 'Shop (optional)'), tcTxt('shop', s.shop, '', 'maxlength="40" list="tc-shops"'))}</div>
      <datalist id="tc-shops">${shops.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      ${tcField(L('ব্যবহারের উদ্দেশ্য (ঐচ্ছিক)', 'Purpose (optional)'), tcTxt('purpose', s.purpose, '', 'maxlength="60"'))}
      ${tcField(L('কোন শিক্ষার্থী/ব্যাচের জন্য (ঐচ্ছিক)', 'For which student / batch (optional)'), tcLinkSel('link', tcLinkOf(e), ['stu', 'bat']))}
      <label class="check"><input type="checkbox" name="reusable" ${e && e.reusable ? 'checked' : ''}><span>${L('♻️ পুনর্ব্যবহারযোগ্য (বোর্ড, ফ্যান…): একবারই খরচ', '♻️ Reusable (board, fan…): counted once')}</span></label>
      ${e ? '' : `${tcField(L('পরিশোধ', 'Payment'), tcSel('pstat', [['paid', L('পরিশোধিত', 'Paid')], ['unpaid', L('বাকি', 'Unpaid')]], 'paid'))}${tcField(L('রসিদ / ছবি (ঐচ্ছিক)', 'Receipt / photo (optional)'), '<input type="file" name="photo" accept="image/*" multiple>')}`}
      ${tcSubmit()}</form>`);
}
LIVE['tc-sup'] = f => { const q = tcNum(f.elements.qty.value), u = tcIn(f, 'unit'), p = f.querySelector('[data-prev]'); if (p) p.textContent = tcM(Math.round(q * u)); };
FORMS['tc-sup'] = async f => {
  const t = tcd(), id = f.dataset.id, old = id ? t.expenses.find(z => z.id === id) : null, item = tcV(f, 'item'), qty = tcNum(f.elements.qty.value), unit = tcIn(f, 'unit'), date = tcV(f, 'date');
  if (!item) return fail(f, L('কী কিনলেন লিখুন', 'Enter what you bought'), 'item');
  if (!(qty > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter the quantity'), 'qty');
  if (!(unit > 0)) return fail(f, L('একক দাম লিখুন', 'Enter the unit price'), 'unit');
  if (!tcDateOk(date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  const amt = Math.round(qty * unit), link = tcLinkParse(tcV(f, 'link')), linked = Object.keys(link).length, cat = tcV(f, 'cat');
  const fields = { amt, date, cat, desc: item, reusable: !!f.elements.reusable.checked, studentId: link.studentId, batchId: link.batchId, jobId: undefined, src: linked ? '' : 'other', sup: { item, qty, unit, shop: tcV(f, 'shop'), purpose: tcV(f, 'purpose') }, updatedAt: Date.now() };
  if (old) {
    const paid = tcCtx(t).paid(old.id);
    if (amt < paid) return fail(f, L(`পরিশোধিত টাকার (${tcM(paid)}) চেয়ে কম হতে পারে না`, `Cannot be below what is already paid (${tcM(paid)})`), 'unit');
    Object.assign(old, fields); return tcAfter(SAVED());
  }
  const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
  const files = f.elements.photo ? [...f.elements.photo.files] : [], rec = Object.assign({ id: uid(), photos: [], createdAt: Date.now() }, fields);
  if (files.length) rec.photos = (await tcSavePhotos(files)).ids;
  t.expenses.push(rec);
  if (tcV(f, 'pstat') === 'paid') t.pays.push({ id: uid(), side: 'out', ref: rec.id, amt, date, method: 'cash', note: '', createdAt: Date.now() });
  tcAfter(SAVED());
};
Object.assign(ACTIONS, {
  'tc-exp-add': el => tcExpForm(null, el && el.dataset && el.dataset.link),
  'tc-sup-add': () => tcSupForm(null),
  'tc-exp-edit': el => {
    const e = tcd().expenses.find(z => z.id === el.dataset.id); if (!e) return;
    if (e.ref) return toast(L('এটা পরীক্ষা থেকে আসা খরচ, "পরীক্ষা" থেকে বদলান', 'This comes from an exam; edit it under Exams'), 'danger');
    if (e.sup) tcSupForm(e); else tcExpForm(e);
  },
  'tc-exp-del': el => {
    const t = tcd(), e = t.expenses.find(z => z.id === el.dataset.id); if (!e) return;
    if (e.ref) return toast(L('এটা পরীক্ষা থেকে আসা খরচ, পরীক্ষা ডিলিট করলে সরে যাবে', 'This comes from an exam; deleting the exam removes it'), 'danger');
    if (!confirm(L('এই খরচ ডিলিট করবেন? এর পেমেন্টগুলো বাতিল হিসেবে থাকবে।', 'Delete this expense? Its payments are kept as voided.'))) return;
    tcSheetFn = null; closeSheet();
    undoable(DELETED(), () => { e.del = true; t.pays.forEach(p => { if (p.ref === e.id && !p.void) { p.void = true; p.voidAt = Date.now(); } }); });
  },
});

/* ---------- নিয়মিত (পুনরাবৃত্ত) খরচ ---------- */
function tcRecForm(r, link) {
  const v = r || { cat: 'rent', day: 1, from: tcUi.ym, active: true };
  tcOpenForm(`${sheetHead(r ? L('নিয়মিত খরচ সম্পাদনা', 'Edit regular cost') : L('নিয়মিত খরচ', 'Regular cost'), L('প্রতি মাসে নিজে থেকে আসবে (আপনি দেখে নিয়ে তৈরি করবেন)', 'Comes every month (you review before creating)'))}
    <form data-form="tc-rec" data-id="${r ? r.id : ''}" autocomplete="off">
      ${tcField(L('নাম', 'Name'), tcTxt('name', v.name, L('যেমন: রুম ভাড়া, সহকারী রিনা', 'e.g. Room rent, assistant Rina'), 'maxlength="60"'))}
      ${tcField(L('খাত', 'Category'), tcSel('cat', tcCatOpts(), v.cat))}
      <div class="row2">${tcField(L('মাসিক পরিমাণ', 'Monthly amount'), moneyInput('amt', r ? String(tcRateAt(r.amts, tcUi.ym) / 100) : '', '0'))}${tcField(r ? L('বদল কার্যকর মাস', 'Change effective from') : L('শুরুর মাস', 'Start month'), tcMonthIn('from', r ? tcUi.ym : v.from))}</div>
      <div class="row2">${tcField(L('মাসের কত তারিখে', 'Day of month'), `<input class="input" name="day" inputmode="numeric" value="${v.day || 1}">`)}${tcField(L('শেষ মাস (ঐচ্ছিক)', 'End month (optional)'), tcMonthIn('to', v.to))}</div>
      ${tcField(L('কোন চাকরি/ব্যাচের জন্য (ঐচ্ছিক)', 'For which job / batch (optional)'), tcLinkSel('link', link || tcLinkOf(r), ['job', 'bat']))}
      ${r ? `<label class="check"><input type="checkbox" name="active" ${r.active !== false ? 'checked' : ''}><span>${L('চালু আছে (বন্ধ করলে নতুন মাসে আসবে না)', 'Active (stop to skip new months)')}</span></label>` : ''}
      ${tcSubmit()}</form>
    ${r ? `<button type="button" class="btn danger block mt8" data-action="tc-rec-del" data-id="${r.id}">${icon('trash', 18)} ${L('মুছুন', 'Delete')}</button><p class="hint">${L('আগে তৈরি হওয়া খরচ থেকে যাবে।', 'Costs already created stay.')}</p>` : ''}`);
}
FORMS['tc-rec'] = f => {
  const t = tcd(), id = f.dataset.id, old = id ? t.recurs.find(z => z.id === id) : null, name = tcV(f, 'name'), amt = tcIn(f, 'amt'), from = tcV(f, 'from'), to = tcV(f, 'to'), day = Math.floor(tcNum(f.elements.day.value)) || 1;
  if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
  if (!(amt > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter an amount'), 'amt');
  if (!tcYmOk(from)) return fail(f, L('মাস ঠিক নেই (যেমন 2026-10)', 'Check the month (e.g. 2026-10)'), 'from');
  if (to && !tcYmOk(to)) return fail(f, L('মাস ঠিক নেই', 'Check the month'), 'to');
  const link = tcLinkParse(tcV(f, 'link')), cat = tcV(f, 'cat'), src = link.jobId ? 'job' : link.batchId ? 'coaching' : (tcCat(cat).src || 'other');
  if (old) {
    if (tcRateAt(old.amts, from) !== amt) old.amts = tcRateSet(old.amts, from, amt);
    Object.assign(old, { name, cat, day, to, jobId: link.jobId, batchId: link.batchId, src, active: f.elements.active ? f.elements.active.checked : true });
  } else t.recurs.push({ id: uid(), name, cat, amts: [{ from, amt }], day, from, to, active: true, jobId: link.jobId, batchId: link.batchId, src, createdAt: Date.now() });
  tcAfter(SAVED());
};
Object.assign(ACTIONS, {
  'tc-rec-add': el => tcRecForm(null, el && el.dataset && el.dataset.link),
  'tc-rec-edit': el => { const r = tcd().recurs.find(z => z.id === el.dataset.id && !z.del); if (r) tcRecForm(r); },
  'tc-rec-del': el => { const t = tcd(), r = t.recurs.find(z => z.id === el.dataset.id); if (!r || !confirm(L('এই নিয়মিত খরচ মুছবেন?', 'Delete this regular cost?'))) return; tcBack = null; tcSheetFn = null; closeSheet(); undoable(DELETED(), () => { r.del = true; }); },
});

/* ---------- পরীক্ষা ---------- */
function tcExamForm(e, bid) {
  const t = tcd(), v = e || { date: today(), students: 0, pages: 0, sheets: 0, wasteCopies: 0, batchId: bid || '', pass: 33 }, picked = new Set(v.studentIds || []);
  const stuAll = tcLive(t.students).filter(z => !z.archived).sort((a, b) => a.name.localeCompare(b.name)), hasCost = !!(e && tcExamCost(e).total > 0);
  tcOpenForm(`${sheetHead(e ? L('পরীক্ষা সম্পাদনা', 'Edit exam') : L('নতুন পরীক্ষা', 'New exam'), L('নম্বর পরে লিখবেন, খরচ দিলে নিজে হিসাব হবে', 'Enter marks later; any cost is worked out for you'))}
    <form data-form="tc-exam" data-live="tc-exam" data-id="${e ? e.id : ''}" autocomplete="off">
      ${tcField(L('পরীক্ষার নাম', 'Exam name'), tcTxt('name', v.name, L('যেমন: মাসিক পরীক্ষা ১', 'e.g. Monthly test 1'), 'maxlength="60"'))}
      <div class="row2">${tcField(L('তারিখ', 'Date'), tcDateIn('date', v.date))}${tcField(L('বিষয়', 'Subject'), tcTxt('subject', v.subject, '', 'maxlength="40"'))}</div>
      <div class="row2">${tcField(L('পূর্ণমান (মোট নম্বর)', 'Total marks'), `<input class="input" name="marks" inputmode="decimal" value="${v.marks || ''}" placeholder="100">`)}${tcField(L('পাস নম্বর (%)', 'Pass mark (%)'), `<input class="input" name="pass" inputmode="decimal" value="${v.pass || 33}">`)}</div>
      ${tcField(L('কোন ব্যাচের', 'Which batch'), tcSel('batch', [['', L('কোনো ব্যাচ নয় (নিচে শিক্ষার্থী বাছুন)', 'No batch (pick students below)')]].concat(tcLive(t.batches).filter(b => !b.archived || b.id === v.batchId).map(b => [b.id, esc(b.name)])), v.batchId || ''))}
      <details class="tcmore" ${picked.size ? 'open' : ''}><summary>${L('আলাদা শিক্ষার্থী বাছুন (ব্যাচের বাইরে বা প্রাইভেট)', 'Pick individual students (outside the batch, or private)')}</summary>
        <div style="max-height:30vh;overflow:auto">${stuAll.map(z => `<label class="check"><input type="checkbox" name="xs" value="${z.id}" ${picked.has(z.id) ? 'checked' : ''}><span>${esc(z.name)}<small class="faint"> ${esc(z.cls || '')}</small></span></label>`).join('') || `<p class="hint">${L('এখনও শিক্ষার্থী নেই।', 'No students yet.')}</p>`}</div></details>
      <details class="tcmore" ${hasCost ? 'open' : ''}><summary>${L('পরীক্ষার খরচ (ঐচ্ছিক)', 'Exam cost (optional)')}</summary>
      <div class="row2">${tcField(L('মোট শিক্ষার্থী', 'Students'), `<input class="input" name="students" inputmode="numeric" value="${v.students || ''}" placeholder="0">`)}${tcField(L('প্রশ্নপত্রের পৃষ্ঠা (প্রত্যেকের)', 'Question pages (each)'), `<input class="input" name="pages" inputmode="decimal" value="${v.pages || ''}" placeholder="0">`)}</div>
      <div class="row2">${tcField(L('প্রতি পৃষ্ঠার প্রিন্ট খরচ', 'Print cost per page'), moneyInput('pp', v.pagePrice ? String(v.pagePrice / 100) : '', '0'))}${tcField(L('উত্তরপত্র/খাতার সংখ্যা', 'Answer sheets / copies'), `<input class="input" name="sheets" inputmode="numeric" value="${v.sheets || ''}" placeholder="0">`)}</div>
      <div class="row2">${tcField(L('প্রতি খাতার মূল্য', 'Price per sheet'), moneyInput('sp', v.sheetPrice ? String(v.sheetPrice / 100) : '', '0'))}${tcField(L('অতিরিক্ত প্রিন্ট (কপি)', 'Extra / wasted copies'), `<input class="input" name="waste" inputmode="numeric" value="${v.wasteCopies || ''}" placeholder="0">`)}</div>
      <div class="row2">${tcField(L('অন্যান্য খরচ (কাগজ, পরিবহন…)', 'Other costs (paper, transport…)'), moneyInput('extra', v.extra ? String(v.extra / 100) : '', '0'))}${tcField(L('আনুমানিক বাজেট (ঐচ্ছিক)', 'Estimated budget (optional)'), moneyInput('budget', v.budget ? String(v.budget / 100) : '', '0'))}</div>
      <div class="bsum ok" data-prev></div>
      ${e ? '' : tcField(L('পরিশোধ', 'Payment'), tcSel('pstat', [['unpaid', L('বাকি', 'Unpaid')], ['paid', L('পরিশোধিত', 'Paid')]], 'unpaid'))}</details>
      ${tcSubmit()}</form>
    ${e ? `<button type="button" class="btn danger block mt8" data-action="tc-exam-del" data-id="${e.id}">${icon('trash', 18)} ${L('পরীক্ষা ডিলিট', 'Delete exam')}</button>` : ''}`);
}
const tcExamRead = f => ({ name: tcV(f, 'name'), date: tcV(f, 'date'), batchId: tcV(f, 'batch'), subject: tcV(f, 'subject'), marks: Math.max(0, tcNum(f.elements.marks.value)), pass: Math.min(100, Math.max(0, tcNum(f.elements.pass.value)) || 33), studentIds: $$('input[name="xs"]:checked', f).map(i => i.value), students: Math.max(0, Math.floor(tcNum(f.elements.students.value))), pages: Math.max(0, tcNum(f.elements.pages.value)), pagePrice: tcIn(f, 'pp'), sheets: Math.max(0, Math.floor(tcNum(f.elements.sheets.value))), sheetPrice: tcIn(f, 'sp'), wasteCopies: Math.max(0, Math.floor(tcNum(f.elements.waste.value))), extra: tcIn(f, 'extra'), budget: tcIn(f, 'budget') });
LIVE['tc-exam'] = (f, el) => {
  if (el && el.name === 'batch' && el.value && !tcNum(f.elements.students.value)) {
    const n = tcLive(tcd().enrolls).filter(e => e.batchId === el.value && !e.to).length;
    if (n) { f.elements.students.value = n; if (!tcNum(f.elements.sheets.value)) f.elements.sheets.value = n; }
  }
  const c = tcExamCost(tcExamRead(f)), p = f.querySelector('[data-prev]'); if (!p) return;
  p.innerHTML = `<b>${L('মোট পরীক্ষার খরচ', 'Total exam cost')} ${tcM(c.total)}</b><span>${L('প্রশ্নপত্র', 'Question papers')} ${tcM(c.paper)} + ${L('খাতা', 'sheets')} ${tcM(c.sheets)}${c.waste ? ' + ' + L('অপচয়', 'waste') + ' ' + tcM(c.waste) : ''}${c.extra ? ' + ' + L('অন্যান্য', 'other') + ' ' + tcM(c.extra) : ''}</span>${c.diff != null ? `<span>${c.diff > 0 ? L('বাজেটের চেয়ে বেশি: ', 'Over budget by ') + tcM(c.diff) : L('বাজেটের মধ্যে', 'Within budget')}</span>` : ''}`;
  p.className = 'bsum ' + (c.diff > 0 ? 'bad' : 'ok');
};
// পরীক্ষা ঠিক একটাই খরচ হয়ে মাসের হিসাবে যায় (ref = ex:<id>), তাই দুবার গণনা হয় না
function tcExamSync(ex) {
  const t = tcd(), ref = 'ex:' + ex.id, e = t.expenses.find(z => z.ref === ref), c = tcExamCost(ex);
  if (ex.del || c.total <= 0) { if (e && !e.del) { e.del = true; t.pays.forEach(p => { if (p.ref === e.id && !p.void) { p.void = true; p.voidAt = Date.now(); } }); } return null; }
  const fields = { date: ex.date, amt: c.total, cat: 'exam', desc: ex.name, batchId: ex.batchId || undefined, src: ex.batchId ? '' : 'coaching', ref, del: false, updatedAt: Date.now() };
  if (e) return Object.assign(e, fields);
  const n = Object.assign({ id: uid(), photos: [], createdAt: Date.now() }, fields); t.expenses.push(n); return n;
}
FORMS['tc-exam'] = f => {
  const t = tcd(), id = f.dataset.id, old = id ? t.exams.find(z => z.id === id) : null, v = tcExamRead(f), cost = tcExamCost(v).total;
  if (!v.name) return fail(f, L('পরীক্ষার নাম লিখুন', 'Enter the exam name'), 'name');
  if (!tcDateOk(v.date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  if (!(cost > 0) && !(v.marks > 0)) return fail(f, L('পূর্ণমান (মোট নম্বর) দিন, অথবা খরচ লিখুন', 'Enter the total marks, or a cost'), 'marks');
  if (old) {
    const lowered = Object.keys(old.results || {}).filter(sid => v.marks > 0 && tcNum(old.results[sid]) > v.marks);
    if (lowered.length) return fail(f, L(`কিছু শিক্ষার্থীর নম্বর ${v.marks}-এর বেশি লেখা আছে। আগে নম্বর ঠিক করুন।`, `Some saved marks are above ${v.marks}. Fix those marks first.`), 'marks');
    const e0 = t.expenses.find(z => z.ref === 'ex:' + old.id && !z.del);
    if (e0 && tcCtx(t).paid(e0.id) > cost) return fail(f, L('পরিশোধিত টাকার চেয়ে কম হতে পারে না', 'Cannot be below what is already paid'), 'students');
  }
  const ex = old ? Object.assign(old, v) : Object.assign({ id: uid(), createdAt: Date.now(), results: {} }, v);
  if (!old) t.exams.push(ex);
  const e = tcExamSync(ex);
  if (!old && e && tcV(f, 'pstat') === 'paid') t.pays.push({ id: uid(), side: 'out', ref: e.id, amt: e.amt, date: ex.date, method: 'cash', note: '', createdAt: Date.now() });
  tcAfter(SAVED());
};

Object.assign(ACTIONS, {
  'tc-exam-add': el => tcExamForm(null, el && el.dataset && el.dataset.bid),
  'tc-exam-edit': el => { const e = tcd().exams.find(z => z.id === el.dataset.id && !z.del); if (e) tcExamForm(e); },
  'tc-exam-del': el => { const t = tcd(), e = t.exams.find(z => z.id === el.dataset.id); if (!e || !confirm(L('এই পরীক্ষা ও এর খরচ ডিলিট করবেন?', 'Delete this exam and its expense?'))) return; tcBack = null; tcSheetFn = null; closeSheet(); undoable(DELETED(), () => { e.del = true; tcExamSync(e); }); },
});

/* ---------- চাকরি ---------- */
function tcJobForm(j) {
  const v = j || { start: today(), payDay: 1 };
  tcOpenForm(`${sheetHead(j ? L('চাকরির তথ্য', 'Job details') : L('নতুন চাকরি', 'New job'))}
    <form data-form="tc-job" data-id="${j ? j.id : ''}" autocomplete="off">
      ${tcField(L('প্রতিষ্ঠানের নাম', 'Institution'), tcTxt('name', v.name, '', 'maxlength="60"'))}
      ${tcField(L('পদবি (ঐচ্ছিক)', 'Role (optional)'), tcTxt('role', v.role, '', 'maxlength="50"'))}
      ${j ? '' : `<div class="row2">${tcField(L('মাসিক বেতন', 'Monthly salary'), moneyInput('salary', '', '0'))}${tcField(L('বেতনের দিন (মাসের)', 'Pay day of month'), `<input class="input" name="payDay" inputmode="numeric" value="${v.payDay || 1}">`)}</div>`}
      ${j ? tcField(L('বেতনের দিন (মাসের)', 'Pay day of month'), `<input class="input" name="payDay" inputmode="numeric" value="${v.payDay || 1}">`) : ''}
      ${tcField(L('যোগদানের তারিখ', 'Joined on'), tcDateIn('start', v.start))}
      ${tcMore(`${tcField(L('শেষ তারিখ (ছেড়ে দিলে)', 'End date (if you left)'), tcDateIn('end', v.end))}${tcField(L('অন্যান্য তথ্য / ফোন', 'Other info / phone'), tcTxt('info', v.info, '', 'maxlength="120"'))}`)}
      ${tcSubmit()}</form>`);
}
FORMS['tc-job'] = f => {
  const t = tcd(), id = f.dataset.id, old = id ? t.jobs.find(z => z.id === id) : null, name = tcV(f, 'name'), start = tcV(f, 'start'), end = tcV(f, 'end'), payDay = Math.min(31, Math.max(1, Math.floor(tcNum(f.elements.payDay.value)) || 1));
  if (!name) return fail(f, L('প্রতিষ্ঠানের নাম লিখুন', 'Enter the institution'), 'name');
  if (start && !tcDateOk(start)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'start');
  if (end && !tcDateOk(end)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'end');
  const base = { name, role: tcV(f, 'role'), info: tcV(f, 'info'), payDay, start, end };
  if (old) Object.assign(old, base);
  else {
    const sal = tcIn(f, 'salary');
    if (!(sal > 0)) return fail(f, L('মাসিক বেতন লিখুন', 'Enter the monthly salary'), 'salary');
    t.jobs.push(Object.assign({ id: uid(), salary: [{ from: tcYm(start || today()), amt: sal }], sched: [], active: true, createdAt: Date.now() }, base));
  }
  tcAfter(SAVED());
};
FORMS['tc-jsal'] = f => {
  const t = tcd(), j = tcJob(f.dataset.id), amt = tcIn(f, 'amt'), from = tcV(f, 'from');
  if (!j) return closeSheet();
  if (!(amt > 0)) return fail(f, L('বেতন লিখুন', 'Enter the salary'), 'amt');
  if (!tcYmOk(from)) return fail(f, L('মাস ঠিক নেই (যেমন 2026-10)', 'Check the month (e.g. 2026-10)'), 'from');
  j.salary = tcRateSet(j.salary, from, amt); tcAfter(L('বেতন বদলেছে, ' + tcYmLabel(from) + ' থেকে কার্যকর', 'Pay updated from ' + tcYmLabel(from)));
};
function tcSlotForm(j, sc) {
  const v = sc || { days: [], time: '', dur: 60 };
  tcOpenForm(`${sheetHead(sc ? L('ক্লাসের সময়', 'Class time') : L('ক্লাসের সময় যোগ', 'Add class time'), esc(j.name))}
    <form data-form="tc-jsl" data-id="${j.id}" data-sid="${sc ? sc.id : ''}" autocomplete="off">
      ${tcField(L('নাম (ঐচ্ছিক)', 'Label (optional)'), tcTxt('label', v.label, L('যেমন: ৯ম শ্রেণি', 'e.g. Class 9'), 'maxlength="40"'))}${tcDaysPick(v.days)}
      <div class="row2">${tcField(L('সময়', 'Time'), `<input class="input" type="time" name="time" value="${esc(v.time)}">`)}${tcField(L('কত মিনিট', 'Minutes'), `<input class="input" name="dur" inputmode="numeric" value="${v.dur || 60}">`)}</div>
      ${tcField(L('স্থান (ঐচ্ছিক)', 'Place (optional)'), tcTxt('place', v.place, '', 'maxlength="50"'))}${tcSubmit()}</form>
    ${sc ? `<button type="button" class="btn danger block mt8" data-action="tc-jsl-del" data-id="${j.id}" data-sid="${sc.id}">${icon('trash', 18)} ${L('মুছুন', 'Remove')}</button>` : ''}`);
}
FORMS['tc-jsl'] = f => {
  const j = tcJob(f.dataset.id), days = tcDaysOf(f); if (!j) return closeSheet();
  if (!days.length) return fail(f, L('অন্তত একটা দিন বাছুন', 'Pick at least one day'));
  const rec = { label: tcV(f, 'label'), days, time: tcV(f, 'time'), dur: Math.max(5, Math.floor(tcNum(f.elements.dur.value)) || 60), place: tcV(f, 'place') }, sid = f.dataset.sid;
  if (sid) Object.assign(j.sched.find(s => s.id === sid) || {}, rec); else j.sched.push(Object.assign({ id: uid() }, rec));
  tcAfter(SAVED());
};
Object.assign(ACTIONS, {
  'tc-job-add': () => tcJobForm(null),
  'tc-job-edit': el => { const j = tcJob(el.dataset.id); if (j) tcJobForm(j); },
  'tc-jsal': el => { const j = tcJob(el.dataset.id); if (!j) return;
    tcOpenForm(`${sheetHead(L('বেতন পরিবর্তন', 'Change salary'), esc(j.name))}<form data-form="tc-jsal" data-id="${j.id}" autocomplete="off">
      ${tcField(L('নতুন মাসিক বেতন', 'New monthly salary'), moneyInput('amt', String(tcRateAt(j.salary, tcUi.ym) / 100), '0'))}${tcField(L('কোন মাস থেকে কার্যকর', 'Effective from month'), tcMonthIn('from', tcUi.ym))}
      <p class="hint">${L('আগের মাসগুলোর বেতন ও পেমেন্ট অপরিবর্তিত থাকবে।', 'Earlier months\' salary and payments stay unchanged.')}</p>${tcSubmit()}</form>`); },
  'tc-jsl-add': el => { const j = tcJob(el.dataset.id); if (j) tcSlotForm(j, null); },
  'tc-jsl-edit': el => { const j = tcJob(el.dataset.id); if (j) tcSlotForm(j, j.sched.find(s => s.id === el.dataset.sid)); },
  'tc-jsl-del': el => { const j = tcJob(el.dataset.id); if (!j) return; j.sched = j.sched.filter(s => s.id !== el.dataset.sid); tcAfter(DELETED()); },
  'tc-job-act': el => { const j = tcJob(el.dataset.id); if (j) { j.active = j.active === false; tcRefresh(SAVED()); } },
  'tc-job-del': el => {
    const t = tcd(), j = tcJob(el.dataset.id); if (!j) return;
    if (t.charges.some(c => c.jobId === j.id) || t.expenses.some(e => e.jobId === j.id)) return toast(L('এর বেতন/খরচের ইতিহাস আছে, তাই ডিলিট নয়। "নিষ্ক্রিয় করুন" ব্যবহার করুন।', 'It has salary/cost history, so it cannot be deleted. Use Deactivate.'), 'danger');
    if (!confirm(L('এই চাকরি ডিলিট করবেন?', 'Delete this job?'))) return;
    tcSheetFn = null; closeSheet(); undoable(DELETED(), () => { j.del = true; });
  },
});

/* ---------- শিক্ষার্থী ও বিষয় ---------- */
function tcStuForm(s, bid) {
  const v = s || { start: today() }, isNew = !s, bat = bid && tcBat(bid);
  tcOpenForm(`${sheetHead(isNew ? L('নতুন শিক্ষার্থী', 'New student') : L('শিক্ষার্থীর তথ্য', 'Student details'))}
    <form data-form="tc-stu" data-id="${s ? s.id : ''}" data-bid="${bat ? bat.id : ''}" autocomplete="off">
      ${tcField(L('নাম', 'Name'), tcTxt('name', v.name, '', 'maxlength="60"'))}
      <div class="row2">${tcField(L('শ্রেণি', 'Class'), tcTxt('cls', v.cls, '', 'maxlength="30"'))}${tcField(L('শুরুর তারিখ', 'Start date'), tcDateIn('start', v.start))}</div>
      ${bat ? tcField(L(`${esc(bat.name)} ব্যাচের মাসিক ফি`, `Monthly fee for ${esc(bat.name)}`), moneyInput('bfee', bat.fee ? String(bat.fee / 100) : '', '0')) : ''}
      ${isNew ? `<div class="section-title" style="margin-top:6px">${L('প্রথম বিষয় (ঐচ্ছিক, পরেও যোগ করা যায়)', 'First subject (optional, can add later)')}</div>
        <div class="row2">${tcField(L('বিষয়', 'Subject'), tcTxt('sb_name', '', L('যেমন: গণিত', 'e.g. Maths'), 'maxlength="40"'))}${tcField(L('ফির ধরন', 'Fee type'), tcSel('sb_mode', [['month', L('মাসিক', 'Monthly')], ['class', L('প্রতি ক্লাস', 'Per class')]], 'month'))}</div>
        ${tcField(L('ফি (মাসিক বা প্রতি ক্লাস)', 'Fee (monthly or per class)'), moneyInput('sb_fee', '', '0'))}${tcDaysPick([])}
        <div class="row2">${tcField(L('সময়', 'Time'), '<input class="input" type="time" name="sb_time">')}${tcField(L('স্থান', 'Place'), tcTxt('sb_place', '', '', 'maxlength="50"'))}</div>` : ''}
      ${tcMore(`${tcField(L('শিক্ষাপ্রতিষ্ঠান', 'School'), tcTxt('school', v.school, '', 'maxlength="60"'))}<div class="row2">${tcField(L('ফোন (ঐচ্ছিক)', 'Phone (optional)'), `<input class="input" type="tel" name="phone" value="${esc(v.phone || '')}" maxlength="20">`)}${tcField(L('অভিভাবক (ঐচ্ছিক)', 'Guardian (optional)'), tcTxt('guardian', v.guardian, '', 'maxlength="50"'))}</div>
        ${s ? tcField(L('শেষ তারিখ (ছেড়ে দিলে)', 'End date (if left)'), tcDateIn('end', v.end)) : ''}${tcField(L('নোট', 'Notes'), `<textarea class="input" name="notes" rows="3" maxlength="400">${esc(v.notes || '')}</textarea>`)}`)}
      ${tcSubmit()}</form>`);
}
FORMS['tc-stu'] = f => {
  const t = tcd(), id = f.dataset.id, old = id ? t.students.find(z => z.id === id) : null, name = tcV(f, 'name'), start = tcV(f, 'start'), end = tcV(f, 'end');
  if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
  if (!tcDateOk(start)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'start');
  if (end && !tcDateOk(end)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'end');
  const base = { name, cls: tcV(f, 'cls'), school: tcV(f, 'school'), phone: tcV(f, 'phone'), guardian: tcV(f, 'guardian'), notes: tcV(f, 'notes'), start };
  if (!old && f.dataset.dupok !== '1' && t.students.some(z => !z.del && z.name.trim().toLowerCase() === name.toLowerCase())) {
    f.dataset.dupok = '1';
    return fail(f, L('এই নামে একজন শিক্ষার্থী আগেই আছে। একই জন হলে নতুন না বানিয়ে "ব্যাচে যোগ" থেকে তাকে বেছে নিন। অন্য একজন হলে আবার "সেভ করুন" চাপুন।', 'A student with this name already exists. If it is the same person, pick them from "Add to batch" instead of creating a duplicate. If it is someone else, tap Save again.'), 'name');
  }
  if (old) { Object.assign(old, base); if (f.elements.end) old.end = end; return tcAfter(SAVED()); }
  const s = Object.assign({ id: uid(), status: 'active', end: '', subjects: [], docs: [], createdAt: Date.now() }, base);
  const sb = tcV(f, 'sb_name');
  if (sb) {
    const fee = tcIn(f, 'sb_fee'); if (!(fee > 0)) return fail(f, L('বিষয়ের ফি লিখুন', 'Enter the subject fee'), 'sb_fee');
    s.subjects.push({ id: uid(), name: sb, mode: tcV(f, 'sb_mode'), fees: [{ from: tcYm(start), amt: fee }], days: tcDaysOf(f), time: tcV(f, 'sb_time'), dur: 60, place: tcV(f, 'sb_place'), active: true });
  }
  const bat = f.dataset.bid && tcBat(f.dataset.bid);
  if (bat) {
    const bf = tcIn(f, 'bfee'); if (!(bf > 0)) return fail(f, L('ব্যাচের মাসিক ফি লিখুন', 'Enter the batch monthly fee'), 'bfee');
    t.enrolls.push({ id: uid(), studentId: s.id, batchId: bat.id, from: tcYm(start), to: '', fees: [{ from: tcYm(start), amt: bf }], createdAt: Date.now() });
  }
  t.students.push(s); tcAfter(SAVED());
};
function tcSubForm(s, u) {
  const v = u || { mode: 'month', days: [], dur: 60 };
  tcOpenForm(`${sheetHead(u ? L('বিষয় সম্পাদনা', 'Edit subject') : L('নতুন বিষয়', 'New subject'), esc(s.name))}
    <form data-form="tc-sub" data-sid="${s.id}" data-id="${u ? u.id : ''}" autocomplete="off">
      <div class="row2">${tcField(L('বিষয়', 'Subject'), tcTxt('name', v.name, '', 'maxlength="40"'))}${tcField(L('ফির ধরন', 'Fee type'), tcSel('mode', [['month', L('মাসিক', 'Monthly')], ['class', L('প্রতি ক্লাস', 'Per class')]], v.mode))}</div>
      <div class="row2">${tcField(L('ফি', 'Fee'), moneyInput('fee', u ? String(tcRateAt(u.fees, tcUi.ym) / 100) : '', '0'))}${tcField(u ? L('ফি বদল কার্যকর মাস', 'Fee change effective from') : L('শুরুর মাস', 'Start month'), tcMonthIn('from', u ? tcUi.ym : tcYm(s.start || today())))}</div>
      ${tcDaysPick(v.days)}
      <div class="row2">${tcField(L('সময়', 'Time'), `<input class="input" type="time" name="time" value="${esc(v.time || '')}">`)}${tcField(L('কত মিনিট', 'Minutes'), `<input class="input" name="dur" inputmode="numeric" value="${v.dur || 60}">`)}</div>
      ${tcField(L('স্থান', 'Place'), tcTxt('place', v.place, '', 'maxlength="50"'))}
      ${u ? `<label class="check"><input type="checkbox" name="active" ${u.active !== false ? 'checked' : ''}><span>${L('পড়ানো চলছে (বন্ধ হলে নতুন মাসে ফি আসবে না)', 'Still teaching (stop to skip new months)')}</span></label>` : ''}
      ${tcSubmit()}</form>`);
}
FORMS['tc-sub'] = f => {
  const s = tcStu(f.dataset.sid); if (!s) return closeSheet();
  const id = f.dataset.id, old = id ? s.subjects.find(z => z.id === id) : null, name = tcV(f, 'name'), fee = tcIn(f, 'fee'), from = tcV(f, 'from');
  if (!name) return fail(f, L('বিষয়ের নাম লিখুন', 'Enter the subject'), 'name');
  if (!(fee > 0)) return fail(f, L('ফি লিখুন', 'Enter the fee'), 'fee');
  if (!tcYmOk(from)) return fail(f, L('মাস ঠিক নেই (যেমন 2026-10)', 'Check the month (e.g. 2026-10)'), 'from');
  const rec = { name, mode: tcV(f, 'mode'), days: tcDaysOf(f), time: tcV(f, 'time'), dur: Math.max(5, Math.floor(tcNum(f.elements.dur.value)) || 60), place: tcV(f, 'place') };
  if (old) { if (tcRateAt(old.fees, from) !== fee) old.fees = tcRateSet(old.fees, from, fee); Object.assign(old, rec, { active: f.elements.active ? f.elements.active.checked : true }); }
  else s.subjects.push(Object.assign({ id: uid(), fees: [{ from, amt: fee }], active: true }, rec));
  tcAfter(SAVED());
};
Object.assign(ACTIONS, {
  'tc-stu-add': el => tcStuForm(null, el && el.dataset && el.dataset.bid),
  'tc-flt': el => { tcUi[el.dataset.key] = el.dataset.v; render(); },
  'tc-chg-del': el => {
    const t = tcd(), c = t.charges.find(z => z.id === el.dataset.id); if (!c) return;
    if (tcCtx(t).paid(c.id) > 0) { toast(L('এতে পেমেন্ট আছে। খুলে আগে পেমেন্ট বাতিল করুন।', 'It has payments. Open it and void the payments first.'), 'danger'); return tcSheet(() => tcItemHtml(c.id, 'in')); }
    if (!confirm(L('এই ফি/পাওনা হিসাব থেকে বাদ দেবেন? এটা বাতিল হয়ে থাকবে, পরে আবার চালু করা যাবে।', 'Remove this fee from the books? It is cancelled, and can be restored later.'))) return;
    undoable(L('বাতিল হয়েছে', 'Cancelled'), () => { c.cancelled = true; });
  },
  'tc-sub-del': el => {
    const t = tcd(), s = tcStu(el.dataset.sid), u = s && s.subjects.find(z => z.id === el.dataset.id && !z.del); if (!u) return;
    if (t.charges.some(c => c.ref === u.id)) return toast(L('এর ফির ইতিহাস আছে, তাই ডিলিট নয়। এডিটে গিয়ে "পড়ানো চলছে" বন্ধ করুন।', 'It has fee history, so it cannot be deleted. Edit it and stop teaching instead.'), 'danger');
    if (!confirm(L(`"${u.name}" বিষয়টা ডিলিট করবেন?`, `Delete subject "${u.name}"?`))) return;
    undoable(DELETED(), () => { u.del = true; });
  },
  'tc-stu-edit': el => { const s = tcStu(el.dataset.id); if (s) tcStuForm(s); },
  'tc-sub-add': el => { const s = tcStu(el.dataset.id); if (s) tcSubForm(s, null); },
  'tc-sub-edit': el => { const s = tcStu(el.dataset.sid); if (s) tcSubForm(s, s.subjects.find(u => u.id === el.dataset.id)); },
  'tc-stu-st': el => {
    const s = tcStu(el.dataset.id), v = el.dataset.v; if (!s) return;
    if (v === 'left') { if (!confirm(L('শিক্ষার্থী পড়া ছেড়েছে? পরের মাস থেকে ফি তৈরি হবে না। পুরোনো বকেয়া থাকবে।', 'Mark as left? No fees from next month. Old dues stay.'))) return; s.status = 'left'; s.end = s.end || today(); }
    else if (v === 'paused') s.status = 'paused';
    else { s.status = 'active'; s.end = ''; }
    tcRefresh(SAVED());
  },
  'tc-stu-del': el => { if (tcStu(el.dataset.id)) tcSheet(() => tcRemoveStuHtml(el.dataset.id)); },
});

/* ---------- কোচিং ও ব্যাচ, ভর্তি, স্থানান্তর ---------- */
function tcCenterForm(c) {
  tcOpenForm(`${sheetHead(c ? L('কোচিংয়ের তথ্য', 'Coaching details') : L('নতুন কোচিং', 'New coaching'))}<form data-form="tc-center" data-id="${c ? c.id : ''}" autocomplete="off">
    ${tcField(L('কোচিংয়ের নাম', 'Coaching name'), tcTxt('name', c && c.name, '', 'maxlength="60"'))}${tcField(L('ঠিকানা / ফোন (ঐচ্ছিক)', 'Address / phone (optional)'), tcTxt('info', c && c.info, '', 'maxlength="120"'))}${tcSubmit()}</form>`);
}
FORMS['tc-center'] = f => {
  const t = tcd(), id = f.dataset.id, name = tcV(f, 'name'); if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
  const c = id && t.centers.find(z => z.id === id);
  if (c) Object.assign(c, { name, info: tcV(f, 'info') }); else t.centers.push({ id: uid(), name, info: tcV(f, 'info'), createdAt: Date.now() });
  tcAfter(SAVED());
};
function tcBatForm(b) {
  const v = b || { days: [], dur: 60, start: today() };
  tcOpenForm(`${sheetHead(b ? L('ব্যাচের তথ্য', 'Batch details') : L('নতুন ব্যাচ', 'New batch'))}
    <form data-form="tc-bat" data-id="${b ? b.id : ''}" autocomplete="off">
      <div class="row2">${tcField(L('ব্যাচের নাম', 'Batch name'), tcTxt('name', v.name, '', 'maxlength="50"'))}${tcField(L('কোড (ঐচ্ছিক)', 'Code (optional)'), tcTxt('code', v.code, '', 'maxlength="20"'))}</div>
      <div class="row2">${tcField(L('শ্রেণি', 'Class'), tcTxt('cls', v.cls, '', 'maxlength="30"'))}${tcField(L('বিষয়', 'Subject'), tcTxt('subject', v.subject, '', 'maxlength="40"'))}</div>
      ${tcField(L('কোন কোচিং (ঐচ্ছিক)', 'Which coaching (optional)'), tcSel('center', [['', L('কোনোটি নয়', 'None')]].concat(tcLive(tcd().centers).map(c => [c.id, esc(c.name)])), v.centerId || ''))}
      ${tcField(L('মাসিক ফি (প্রতি শিক্ষার্থী, নতুন ভর্তির ডিফল্ট)', 'Monthly fee (per student, default for new admissions)'), moneyInput('fee', v.fee ? String(v.fee / 100) : '', '0'))}
      ${tcDaysPick(v.days)}
      <div class="row2">${tcField(L('সময়', 'Time'), `<input class="input" type="time" name="time" value="${esc(v.time || '')}">`)}${tcField(L('কত মিনিট', 'Minutes'), `<input class="input" name="dur" inputmode="numeric" value="${v.dur || 60}">`)}</div>
      ${tcField(L('স্থান', 'Place'), tcTxt('place', v.place, '', 'maxlength="50"'))}
      ${tcMore(`<div class="row2">${tcField(L('শুরু', 'Start'), tcDateIn('start', v.start))}${tcField(L('শেষ (ঐচ্ছিক)', 'End (optional)'), tcDateIn('end', v.end))}</div>`)}
      ${tcSubmit()}</form>`);
}
FORMS['tc-bat'] = f => {
  const t = tcd(), id = f.dataset.id, old = id ? t.batches.find(z => z.id === id) : null, name = tcV(f, 'name'); if (!name) return fail(f, L('ব্যাচের নাম লিখুন', 'Enter the batch name'), 'name');
  const rec = { name, code: tcV(f, 'code'), cls: tcV(f, 'cls'), subject: tcV(f, 'subject'), centerId: tcV(f, 'center'), fee: tcIn(f, 'fee'), days: tcDaysOf(f), time: tcV(f, 'time'), dur: Math.max(5, Math.floor(tcNum(f.elements.dur.value)) || 60), place: tcV(f, 'place'), start: tcV(f, 'start'), end: tcV(f, 'end') };
  if (old) Object.assign(old, rec); else t.batches.push(Object.assign({ id: uid(), active: true, createdAt: Date.now() }, rec));
  tcAfter(SAVED());
};
function tcEnrForm(sid, bid) {
  const t = tcd(), x = tcCtx(t), b = bid && tcBat(bid), s = sid && tcStu(sid);
  const stuOpts = tcLive(t.students).filter(z => z.status === 'active').map(z => [z.id, esc(z.name)]), batOpts = tcLive(t.batches).filter(z => z.active !== false).map(z => [z.id, esc(z.name)]);
  if (!s && !stuOpts.length) return toast(L('আগে শিক্ষার্থী যোগ করুন', 'Add a student first'), 'danger');
  if (!b && !batOpts.length) return toast(L('আগে ব্যাচ যোগ করুন', 'Add a batch first'), 'danger');
  tcOpenForm(`${sheetHead(L('ব্যাচে ভর্তি', 'Add to batch'), `${s ? esc(s.name) : ''}${s && b ? ' → ' : ''}${b ? esc(b.name) : ''}`)}
    <form data-form="tc-enr" autocomplete="off">
      ${s ? `<input type="hidden" name="student" value="${s.id}">` : tcField(L('শিক্ষার্থী', 'Student'), tcSel('student', stuOpts, ''))}
      ${b ? `<input type="hidden" name="batch" value="${b.id}">` : tcField(L('ব্যাচ', 'Batch'), tcSel('batch', batOpts, ''))}
      <div class="row2">${tcField(L('মাসিক ফি', 'Monthly fee'), moneyInput('fee', b && b.fee ? String(b.fee / 100) : '', '0'))}${tcField(L('শুরুর মাস', 'Start month'), tcMonthIn('from', tcUi.ym))}</div>
      <p class="hint">${L('একজন একাধিক ব্যাচে থাকতে পারে, প্রতিটার ফি আলাদা।', 'A student can be in several batches, each with its own fee.')}</p>${tcSubmit()}</form>`);
}
FORMS['tc-enr'] = f => {
  const t = tcd(), sid = tcV(f, 'student'), bid = tcV(f, 'batch'), fee = tcIn(f, 'fee'), from = tcV(f, 'from');
  if (!tcStu(sid) || !tcBat(bid)) return fail(f, L('শিক্ষার্থী ও ব্যাচ বাছুন', 'Pick a student and batch'));
  if (!(fee > 0)) return fail(f, L('ফি লিখুন', 'Enter the fee'), 'fee');
  if (!tcYmOk(from)) return fail(f, L('মাস ঠিক নেই (যেমন 2026-10)', 'Check the month (e.g. 2026-10)'), 'from');
  if (t.enrolls.some(e => !e.del && e.studentId === sid && e.batchId === bid && (!e.to || e.to >= from))) return fail(f, L('এই শিক্ষার্থী ওই ব্যাচে আগে থেকেই আছে', 'Already in this batch'));
  t.enrolls.push({ id: uid(), studentId: sid, batchId: bid, from, to: '', fees: [{ from, amt: fee }], createdAt: Date.now() });
  tcAfter(SAVED());
};
FORMS['tc-enr-fee'] = f => {
  const e = tcd().enrolls.find(z => z.id === f.dataset.id && !z.del), fee = tcIn(f, 'fee'), from = tcV(f, 'from'); if (!e) return closeSheet();
  if (!(fee > 0)) return fail(f, L('ফি লিখুন', 'Enter the fee'), 'fee');
  if (!tcYmOk(from)) return fail(f, L('মাস ঠিক নেই', 'Check the month'), 'from');
  e.fees = tcRateSet(e.fees, from, fee); tcAfter(SAVED());
};
FORMS['tc-enr-rm'] = f => {
  const e = tcd().enrolls.find(z => z.id === f.dataset.id && !z.del), from = tcV(f, 'from'); if (!e) return closeSheet();
  if (!tcYmOk(from)) return fail(f, L('মাস ঠিক নেই', 'Check the month'), 'from');
  if (!confirm(L(`${tcYmLabel(from)} থেকে এই ব্যাচে ফি আসবে না। আগের বকেয়া থাকবে। চালিয়ে যাবেন?`, `No fees from ${tcYmLabel(from)}. Old dues stay. Continue?`))) return;
  e.to = tcYmAdd(from, -1); tcAfter(SAVED());
};
FORMS['tc-xfer'] = f => {
  const t = tcd(), old = t.enrolls.find(z => z.id === f.dataset.id && !z.del), bid = tcV(f, 'batch'), from = tcV(f, 'from'), fee = tcIn(f, 'fee'); if (!old) return closeSheet();
  if (!tcBat(bid) || bid === old.batchId) return fail(f, L('অন্য একটা ব্যাচ বাছুন', 'Pick a different batch'), 'batch');
  if (!(fee > 0)) return fail(f, L('ফি লিখুন', 'Enter the fee'), 'fee');
  if (!tcYmOk(from)) return fail(f, L('মাস ঠিক নেই', 'Check the month'), 'from');
  old.to = tcYmAdd(from, -1);
  t.enrolls.push({ id: uid(), studentId: old.studentId, batchId: bid, from, to: '', fees: [{ from, amt: fee }], createdAt: Date.now() });
  tcAfter(L('স্থানান্তর হয়েছে, আগের বকেয়া অপরিবর্তিত', 'Moved; old dues unchanged'));
};
Object.assign(ACTIONS, {
  'tc-center-add': () => tcCenterForm(null),
  'tc-center-edit': el => { const c = tcd().centers.find(z => z.id === el.dataset.id); if (c) tcCenterForm(c); },
  'tc-bat-add': () => tcBatForm(null),
  'tc-bat-edit': el => { const b = tcBat(el.dataset.id); if (b) tcBatForm(b); },
  'tc-enr-add': el => (el.dataset.bid && !el.dataset.sid ? tcOpenForm(tcEnrMultiHtml(el.dataset.bid)) : tcEnrForm(el.dataset.sid, el.dataset.bid)),
  'tc-enr-fee': el => {
    const e = tcd().enrolls.find(z => z.id === el.dataset.id && !z.del); if (!e) return;
    const x = tcCtx(tcd()), s = x.stu[e.studentId], b = x.bat[e.batchId];
    tcOpenForm(`${sheetHead(L('ব্যাচের ফি', 'Batch fee'), `${s ? esc(s.name) : ''} · ${b ? esc(b.name) : ''}`)}
      <form data-form="tc-enr-fee" data-id="${e.id}" autocomplete="off"><div class="row2">${tcField(L('নতুন মাসিক ফি', 'New monthly fee'), moneyInput('fee', String(tcRateAt(e.fees, tcUi.ym < e.from ? e.from : tcUi.ym) / 100), '0'))}${tcField(L('কার্যকর মাস', 'Effective from'), tcMonthIn('from', tcUi.ym))}</div>
      <p class="hint">${L('আগের মাসের ফি অপরিবর্তিত থাকবে।', 'Earlier months\' fees stay unchanged.')}</p>${tcSubmit()}</form>
      ${e.to ? '' : `<button type="button" class="btn danger block mt12" data-action="tc-enr-rm-ask" data-id="${e.id}">${L('ব্যাচ থেকে বাদ দিন', 'Remove from batch')}</button>`}`);
  },
  'tc-xfer': el => {
    const t = tcd(), e = t.enrolls.find(z => z.id === el.dataset.id && !z.del); if (!e) return;
    const opts = tcLive(t.batches).filter(b => b.id !== e.batchId && b.active !== false).map(b => [b.id, esc(b.name)]); if (!opts.length) return toast(L('অন্য কোনো ব্যাচ নেই', 'No other batch'), 'danger');
    tcOpenForm(`${sheetHead(L('ব্যাচ স্থানান্তর', 'Move to another batch'), esc((tcStu(e.studentId) || {}).name || ''))}
      <form data-form="tc-xfer" data-id="${e.id}" autocomplete="off">${tcField(L('নতুন ব্যাচ', 'New batch'), tcSel('batch', opts, ''))}
      <div class="row2">${tcField(L('নতুন মাসিক ফি', 'New monthly fee'), moneyInput('fee', String(tcRateAt(e.fees, tcUi.ym < e.from ? e.from : tcUi.ym) / 100), '0'))}${tcField(L('কোন মাস থেকে', 'From month'), tcMonthIn('from', tcUi.ym))}</div>
      <p class="hint">${L('আগের ব্যাচে ওই মাসের আগ পর্যন্ত ফি থাকবে, একই ফি দুবার তৈরি হবে না।', 'The old batch keeps its fees up to the month before; no fee is created twice.')}</p>${tcSubmit()}</form>`);
  },
  'tc-bat-act': el => { const b = tcBat(el.dataset.id); if (b) { b.active = b.active === false; tcRefresh(SAVED()); } },
  'tc-bat-del': el => { if (tcBat(el.dataset.id)) tcSheet(() => tcRemoveBatHtml(el.dataset.id)); },
});

/* ---------- ক্লাসের স্ট্যাটাস, উপস্থিতি, স্থগিত, অতিরিক্ত ক্লাস ---------- */
function tcSetSess(e, st) {
  const t = tcd();
  if (e.extra) { e.rec.status = st === 'pending' ? 'done' : st; return e.rec; }
  if (e.moved) { e.rec.mst = st === 'pending' ? '' : st; return e.rec; }
  let r = tcGetSess(t, e);
  if (st === 'pending') { if (r) t.sessions = t.sessions.filter(s => s !== r); return null; }
  if (!r) { r = { id: uid(), key: e.key, slotId: e.slotId, date: e.date, status: st, att: {}, createdAt: Date.now() }; t.sessions.push(r); }
  r.status = st; if (st !== 'postponed') { delete r.movedTo; delete r.mst; }
  return r;
}
function tcAttHtml(e) {
  const t = tcd(), x = tcCtx(t), ym = tcYm(e.date), ens = tcLive(t.enrolls).filter(en => en.batchId === e.batchId && tcEnrollOk(x, en, ym)), att = (e.rec && e.rec.att) || {};
  return `${sheetHead(L('উপস্থিতি', 'Attendance'), `${esc(e.who)} · ${fmtDate(e.date)}`)}
    <form data-form="tc-att" data-id="${esc(e.key + (e.moved ? '#m' : ''))}" data-date="${e.date}">
      ${ens.length ? ens.map(en => `<label class="check"><input type="checkbox" name="p" value="${en.studentId}" ${att[en.studentId] === 'a' ? '' : 'checked'}><span><b>${esc((x.stu[en.studentId] || {}).name || '')}</b></span></label>`).join('') : `<p class="hint">${L('এই ব্যাচে শিক্ষার্থী নেই। শুধু ক্লাস সম্পন্ন হিসেবে লেখা হবে।', 'No students in this batch. The class is just marked done.')}</p>`}
      <p class="hint">${L('টিক = উপস্থিত। যে আসেনি তার টিক তুলে দিন।', 'Ticked = present. Untick anyone who was absent.')}</p>${tcSubmit(L('সম্পন্ন ও সেভ', 'Done & save'))}</form>`;
}
FORMS['tc-att'] = f => {
  const e = tcFindEntry(f.dataset.id, f.dataset.date); if (!e) return closeSheet();
  const present = new Set($$('input[name="p"]:checked', f).map(i => i.value)), all = $$('input[name="p"]', f).map(i => i.value);
  const r = tcSetSess(e, 'done'); if (r) { r.att = {}; all.forEach(id => { if (!present.has(id)) r.att[id] = 'a'; }); }
  tcBack = null; tcAfter(SAVED());
};
FORMS['tc-post'] = f => {
  const e = tcFindEntry(f.dataset.id, f.dataset.date), date = tcV(f, 'date'); if (!e) return closeSheet();
  if (!tcDateOk(date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  const r = e.moved ? e.rec : tcSetSess(e, 'postponed'); if (!r) return;
  r.status = 'postponed'; r.movedTo = { date, time: tcV(f, 'time') || e.time }; r.mst = '';
  tcBack = null; tcAfter(L('স্থগিত হয়েছে, নতুন সময়ে দেখাবে', 'Postponed; it shows at the new time'));
};
FORMS['tc-extra'] = f => {
  const t = tcd(), slot = tcSlots(t).find(s => s.id === tcV(f, 'slot')), date = tcV(f, 'date');
  if (!slot) return fail(f, L('কোন ক্লাস বাছুন', 'Pick a class'));
  if (!tcDateOk(date)) return fail(f, L('তারিখ ঠিক নেই', 'Check the date'), 'date');
  t.sessions.push({ id: uid(), key: 'x:' + uid(), slotId: slot.id, date, time: tcV(f, 'time'), status: tcV(f, 'st') === 'pending' ? 'done' : tcV(f, 'st'), extra: true, att: {}, createdAt: Date.now() });
  tcUi.sdate = date; tcUi.cm = tcYm(date); tcAfter(SAVED());
};
Object.assign(ACTIONS, {
  'tc-sess': el => { tcSheetFn = null; tcBack = null; tcSheet(() => tcSessHtml(el.dataset.id, el.dataset.date)); },
  'tc-sess-set': el => { const e = tcFindEntry(el.dataset.id, el.dataset.date); if (!e) return; tcSetSess(e, el.dataset.st); tcBack = null; tcAfter(SAVED()); },
  'tc-mark': el => {
    const e = tcFindEntry(el.dataset.id, el.dataset.date); if (!e) return;
    if (e.kind === 'batch') return tcOpenForm(tcAttHtml(e));
    tcSetSess(e, 'done'); commit(L('সম্পন্ন', 'Done'));
  },
  'tc-att': el => { const e = tcFindEntry(el.dataset.id, el.dataset.date); if (e) tcOpenForm(tcAttHtml(e)); },
  'tc-post': el => {
    const e = tcFindEntry(el.dataset.id, el.dataset.date); if (!e) return;
    tcOpenForm(`${sheetHead(L('স্থগিত / পুনর্নির্ধারণ', 'Postpone / reschedule'), `${esc(e.who)} · ${fmtDate(e.date)}`)}<form data-form="tc-post" data-id="${esc(el.dataset.id)}" data-date="${e.date}" autocomplete="off">
      <div class="row2">${tcField(L('নতুন তারিখ', 'New date'), tcDateIn('date', tcShift(e.date, 1)))}${tcField(L('নতুন সময়', 'New time'), `<input class="input" type="time" name="time" value="${esc(e.time || '')}">`)}</div>
      <p class="hint">${L('স্থগিত ক্লাস নতুন তারিখে "অপেক্ষমাণ" হয়ে আসবে। সেখানে সম্পন্ন করলে ফি-তে নতুন তারিখের মাসে ধরা হবে। সময় মিললে সতর্কবার্তা দেখাবে।', 'The class shows up as pending on the new date. Marking it done there bills it in that month. You get a warning if the time clashes.')}</p>${tcSubmit()}</form>`);
  },
  'tc-extra': () => {
    const t = tcd(), slots = tcSlots(t); if (!slots.length) return toast(L('আগে শিক্ষার্থী, ব্যাচ বা চাকরির ক্লাস যোগ করুন', 'Add a student, batch or job class first'), 'danger');
    tcOpenForm(`${sheetHead(L('অতিরিক্ত ক্লাস', 'Extra class'))}<form data-form="tc-extra" autocomplete="off">
      ${tcField(L('কোন ক্লাস', 'Which class'), tcSel('slot', slots.map(s => [s.id, `${esc(s.who)} · ${esc(s.what)}`]), ''))}
      <div class="row2">${tcField(L('তারিখ', 'Date'), tcDateIn('date', tcUi.sdate))}${tcField(L('সময়', 'Time'), '<input class="input" type="time" name="time">')}</div>
      ${tcField(L('অবস্থা', 'Status'), tcSel('st', [['done', L('নেওয়া হয়েছে', 'Held')], ['cancelled', L('বাতিল', 'Cancelled')]], 'done'))}
      <p class="hint">${L('প্রতি-ক্লাসের ফির বিষয়ে এটা নিজে ফিতে যোগ হয়, আলাদা আয় লিখবেন না। মাসিক ফির বিষয়ে বাড়তি টাকা পেলে "আয়" থেকে লিখুন।', 'For per-class subjects this adds to the fee on its own; do not enter separate income. For monthly-fee subjects, record any extra money as "Income".')}</p>${tcSubmit()}</form>`);
  },
  'tc-extra-del': el => {
    const t = tcd(), e = tcFindEntry(el.dataset.id, el.dataset.date); if (!e || !e.rec || !confirm(L('এই অতিরিক্ত ক্লাস মুছবেন?', 'Remove this extra class?'))) return;
    t.sessions = t.sessions.filter(s => s !== e.rec); tcBack = null; tcAfter(DELETED());
  },
});

/* ---------- নতুন মাস তৈরি ---------- */
FORMS['tc-roll'] = f => {
  const t = tcd(), ym = f.dataset.ym, plan = tcPlan(t, ym), picked = $$('input[name="k"]:checked', f).map(i => +i.value);
  let n = 0;
  picked.forEach(i => {
    const p = plan[i]; if (!p) return;
    const el = f.elements['a' + i], amt = p.auto ? 0 : (el ? tcMinor(el.value) : p.amt);
    if (!p.auto && !(amt > 0)) return;
    if (p.kind === 'recur') {
      if (t.expenses.some(e => e.key === p.key)) return;
      t.expenses.push({ id: p.key, key: p.key, date: p.due, amt, cat: p.cat, desc: p.who, src: p.jobId || p.batchId ? '' : (p.src || 'other'), jobId: p.jobId, batchId: p.batchId, recurId: p.ref, photos: [], createdAt: Date.now() });
    } else {
      if (t.charges.some(c => c.key === p.key)) return;
      t.charges.push({ id: p.key, key: p.key, kind: p.kind, ref: p.ref, studentId: p.studentId, batchId: p.batchId, jobId: p.jobId, ym, amt, auto: !!p.auto, due: p.due, createdAt: Date.now() });
    }
    n++;
  });
  tcUi.ym = ym; tcAfter(n ? L(`${n}টা তৈরি হয়েছে`, `${n} created`) : L('কিছু তৈরি হয়নি', 'Nothing created'));
};

/* ---------- বাজেট, ফি ও নগদ, খাত ---------- */
FORMS['tc-budget'] = f => {
  const t = tcd(); t.budget.total = Math.max(0, tcIn(f, 'total'));
  tcCatsAll().forEach(c => { const v = tcIn(f, 'c_' + c.k); if (v > 0) t.budget.cats[c.k] = v; else delete t.budget.cats[c.k]; });
  tcAfter(SAVED());
};
FORMS['tc-settings'] = f => {
  const t = tcd(), fd = Math.floor(tcNum(f.elements.feeDay.value)), oc = tcIn(f, 'open');
  if (!(fd >= 1 && fd <= 28)) return fail(f, L('১ থেকে ২৮-এর মধ্যে দিন লিখুন', 'Enter a day from 1 to 28'), 'feeDay');
  t.feeDay = fd; t.openingCash = oc; tcAfter(SAVED());
};
const tcCatsHtml = () => {
  const t = tcd(), used = k => t.expenses.some(e => e.cat === k) || t.recurs.some(r => r.cat === k);
  return `${sheetHead(L('খরচের খাত', 'Expense categories'), L('নিজের খাত যোগ করুন', 'Add your own'))}
    <form data-form="tc-cat" autocomplete="off"><div class="qa"><input class="input qa-n" name="name" maxlength="40" placeholder="${L('নতুন খাতের নাম', 'New category name')}"><button class="btn primary" type="submit">${icon('plus', 18)}</button></div></form>
    <div class="list mt12">${tcLive(t.cats).map(c => `<div class="lwrap"><div class="lrow"><span class="lic">🏷️</span><span class="lmain"><b>${esc(c.name)}</b><small>${used(c.k) ? L('ব্যবহার হয়েছে', 'in use') : ''}</small></span></div><button type="button" class="btn sm" data-action="tc-cat-edit" data-id="${c.k}">${L('বদল', 'Rename')}</button>${delBtn('tc-cat-del', c.k)}</div>`).join('') || `<p class="hint" style="padding:12px">${L('এখনও নিজের কোনো খাত নেই। বাকি খাতগুলো আগে থেকেই আছে।', 'No custom categories yet. The standard ones are built in.')}</p>`}</div>`;
};
FORMS['tc-cat'] = f => { const n = tcV(f, 'name'); if (!n) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name'); tcd().cats.push({ k: 'c_' + uid(), name: n }); tcSheetFn = tcCatsHtml; tcRefresh(SAVED()); };
Object.assign(ACTIONS, {
  'tc-budget': () => { const t = tcd();
    tcSheet(() => `${sheetHead(L('মাসের বাজেট', 'Monthly budget'), L('খরচ বাজেটের ৮৫% ছুঁলে সতর্ক করবে', 'Warns near 85%'))}
      <form data-form="tc-budget" autocomplete="off">${tcField(L('মাসিক মোট বাজেট (ঐচ্ছিক)', 'Total monthly budget (optional)'), moneyInput('total', t.budget.total ? String(t.budget.total / 100) : '', '0'))}
      ${tcMore(tcCatsAll().map(c => tcField(`${c.e} ${esc(isEN() ? c.en : c.bn)}`, moneyInput('c_' + c.k, t.budget.cats[c.k] ? String(t.budget.cats[c.k] / 100) : '', '0'))).join(''))}${tcSubmit()}</form>`); },
  'tc-settings': () => { const t = tcd();
    tcSheet(() => `${sheetHead(L('ফি ও নগদ', 'Fees & cash'))}<form data-form="tc-settings" autocomplete="off">
      ${tcField(L('প্রারম্ভিক নগদ (শুরুতে হাতে যত ছিল)', 'Opening cash (what you had to begin with)'), moneyInput('open', t.openingCash ? String(t.openingCash / 100) : '', '0'))}
      ${tcField(L('মাসিক ফি দেওয়ার দিন (১–২৮)', 'Monthly fee due day (1–28)'), `<input class="input" name="feeDay" inputmode="numeric" value="${t.feeDay}">`)}
      <p class="hint">${L('নগদ উদ্বৃত্ত = প্রারম্ভিক নগদ + বাস্তবে প্রাপ্ত টাকা − বাস্তবে পরিশোধিত খরচ। ফি এই তারিখের পর বাকি থাকলে "Overdue" হবে।', 'Cash balance = opening cash + money received − expenses paid. A fee unpaid after this day becomes Overdue.')}</p>${tcSubmit()}</form>`); },
  'tc-cats': () => tcSheet(tcCatsHtml),
  'tc-cat-edit': el => { const c = tcd().cats.find(z => z.k === el.dataset.id); if (!c) return; const n = prompt(L('নতুন নাম', 'New name'), c.name); if (n && n.trim()) { c.name = n.trim().slice(0, 40); tcRefresh(SAVED()); } },
  'tc-cat-del': el => {
    const t = tcd(), c = t.cats.find(z => z.k === el.dataset.id); if (!c) return;
    if (t.expenses.some(e => e.cat === c.k) || t.recurs.some(r => r.cat === c.k)) return toast(L('এই খাতে খরচ আছে, তাই মোছা যাবে না। নাম বদলাতে পারেন।', 'This category has expenses, so it cannot be removed. You can rename it.'), 'danger');
    if (!confirm(L('এই খাত মুছবেন?', 'Remove this category?'))) return; c.del = true; tcRefresh(DELETED());
  },
});

/* ---------- ছবি ---------- */
Object.assign(ACTIONS, {
  'tc-ph-add': el => { const i = el.closest('.bzrc').nextElementSibling; if (i) i.click(); },
  'tc-ph-view': el => { const u = imgURL.get('tcp:' + el.dataset.id); tcOpenForm(`${sheetHead(L('ছবি', 'Photo'))}${u ? `<img class="bzbig" src="${u}" alt="">` : `<p class="hint">${L('ছবি পাওয়া যায়নি', 'Photo not found')}</p>`}<button type="button" class="btn block mt12" data-action="tc-back">${L('‹ ফিরুন', '‹ Back')}</button>`); },
  'tc-ph-del': el => {
    if (!confirm(L('এই ছবি মুছবেন?', 'Remove this photo?'))) return;
    const list = tcPhotoIds(el.dataset.kind, el.dataset.owner), i = list.indexOf(el.dataset.id); if (i < 0) return;
    list.splice(i, 1); deleteImage('tcp:' + el.dataset.id).catch(() => {}); tcRefresh(DELETED());
  },
  'tc-back': () => { const b = tcBack; tcBack = null; if (b) { tcSheetFn = b; openSheet(b(), b); } else closeSheet(); },
});

/* ---------- নেভিগেশন, ফিল্টার, শিট খোলা ---------- */
const tcSet = (key, then) => el => { tcUi[key] = el.dataset.v; if (then) then(); render(); };
const tcGo = (tabId, sub) => { if (sub) tcUi.msub = sub; if (tab === tabId) render(); else setTab(tabId); };
Object.assign(ACTIONS, {
  'tc-ym': el => { tcUi.ym = tcYmAdd(tcUi.ym, +el.dataset.d); render(); },
  'tc-yr': el => { tcUi.ym = tcYmAdd(tcUi.ym, 12 * +el.dataset.d); render(); },
  'tc-ym-open': el => { tcUi.ym = el.dataset.ym; tcUi.rmode = 'month'; render(); },
  'tc-goto': el => tcGo(el.dataset.tab, el.dataset.sub),
  'tc-goto-rep': () => { tcUi.msub = 'report'; tcGo('money'); },
  'tc-goto-rec': () => tcGo('money', 'exp'),
  'tc-msub': tcSet('msub'), 'tc-wsub': tcSet('wsub'), 'tc-stf': tcSet('stf'), 'tc-dscope': tcSet('dscope'), 'tc-dst': tcSet('dst'), 'tc-esrc': tcSet('esrc'), 'tc-rmode': tcSet('rmode'), 'tc-sv': tcSet('ssub'), 'tc-sf': tcSet('sf'),
  'tc-sd': el => { tcUi.sdate = tcShift(tcUi.sdate, +el.dataset.d); render(); },
  'tc-today': () => { tcUi.sdate = today(); tcUi.cm = tcYm(today()); render(); },
  'tc-cm': el => { tcUi.cm = tcYmAdd(tcUi.cm, +el.dataset.d); render(); },
  'tc-pick': el => { tcUi.sdate = el.dataset.date; render(); },
  'tc-detail': el => tcSheet(() => tcDetailHtml(el.dataset.k)),
  'tc-item': el => tcSheet(() => tcItemHtml(el.dataset.id, el.dataset.side)),
  'tc-pay-add': el => tcPayForm(el.dataset.id, el.dataset.side),
  'tc-stu': el => tcSheet(() => tcStuHtml(el.dataset.id)),
  'tc-job': el => tcSheet(() => tcJobHtml(el.dataset.id)),
  'tc-bat': el => tcSheet(() => tcBatHtml(el.dataset.id)),
  'tc-inc-add': el => tcIncForm(el && el.dataset && el.dataset.link),
  'tc-roll': el => { tcUi.rollYm = (el && el.dataset && el.dataset.ym) || tcUi.ym; tcSheet(tcRollHtml); },
  'tc-roll-ym': el => { tcUi.rollYm = tcYmAdd(tcUi.rollYm || tcUi.ym, +el.dataset.d); const sb = $('.sheet-body'); if (sb) sb.innerHTML = tcRollHtml(); },
});

/* ---------- গাইড ---------- */
function tcGuide() {
  const ul = a => `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const S = [
    [L('শুরু: ৩ ধাপে', 'Start in 3 steps'), ul([L('<b>কাজ</b> ট্যাবে চাকরি, শিক্ষার্থী (বিষয়, ফি, ক্লাসের দিন) বা কোচিংয়ের ব্যাচ যোগ করুন।', 'In <b>Work</b> add jobs, students (subjects, fee, class days) or coaching batches.'), L('<b>আরও → নতুন মাসের হিসাব</b>: দেখে নিয়ে এক ট্যাপে ফি, বেতন ও নিয়মিত খরচ তৈরি করুন।', '<b>More → Create a month\'s books</b>: review, then create fees, salary and regular costs in one tap.'), L('টাকা পেলে <b>টাকা → পাওনা</b> থেকে পেমেন্ট লিখুন।', 'When money arrives, record it under <b>Money → Dues</b>.')])],
    [L('প্রতি মাসে আবার লিখতে হয় না', 'No retyping each month'), ul([L('সক্রিয় শিক্ষার্থী, ব্যাচ, চাকরি ও নিয়মিত খরচ নতুন মাসে নিজে তৈরির তালিকায় আসে। প্রতিটার একটাই নির্দিষ্ট পরিচয় (মাস সহ), তাই একই ফি দুবার তৈরি হয় না।', 'Active students, batches, jobs and regular costs appear in the new month\'s list. Each has a unique id including the month, so a fee is never created twice.'), L('বেতন/ফি বদল "কার্যকর মাস" থেকে চলে, আগের মাস ও পেমেন্ট বদলায় না।', 'Pay and fee changes apply from an effective month; earlier months and payments are untouched.'), L('শিক্ষার্থী ছেড়ে গেলে বা বিরতিতে থাকলে পরের মাসে ফি আসে না, পুরোনো বকেয়া থেকে যায়।', 'If a student leaves or is paused, no fee is created later; old dues stay.')])],
    [L('আয়, পাওনা ও পেমেন্ট', 'Income, dues & payments'), `<p>${L('<b>অর্জিত আয়</b> = নির্ধারিত ফি/বেতন। <b>প্রাপ্ত</b> = বাস্তবে হাতে আসা টাকা। <b>পাওনা</b> = বাকি অংশ। অবস্থা: Due, Partially Paid, Paid, Overdue (নির্ধারিত দিন পেরোলে)। আংশিক ও কিস্তির পেমেন্ট চলে। পেমেন্ট নিলে আয় আবার গণনা হয় না। ভুল হলে পেমেন্ট বাতিল করে নতুন লিখুন, ইতিহাস থাকে।', '<b>Earned</b> = scheduled fees/salary. <b>Received</b> = money actually in hand. <b>Receivable</b> = the rest. Status: Due, Partially Paid, Paid, Overdue (past the due date). Partial and instalment payments work. A payment never counts income again. To fix a mistake void it and enter a new one; history stays.')}</p>`],
    [L('লাভ আর নগদ আলাদা', 'Profit vs cash'), `<p>${L('<b>প্রকৃত লাভ</b> = অর্জিত আয় − খরচ। <b>নগদ উদ্বৃত্ত</b> = প্রারম্ভিক নগদ + বাস্তবে প্রাপ্ত − বাস্তবে পরিশোধিত খরচ। তাই বকেয়া থাকলে লাভ বেশি আর নগদ কম দেখায়। এক খাত থেকে অন্য খাতে বদলালে নতুন আয়/খরচ হয় না, একই রেকর্ডের খাত বদলায়।', '<b>Net profit</b> = earned − expenses. <b>Cash balance</b> = opening cash + received − expenses paid. So with unpaid fees, profit looks higher than cash. Re-categorising never creates income or cost; the same record just moves.')}</p>`],
    [L('ক্লাস ও উপস্থিতি', 'Classes & attendance'), ul([L('ক্লাস ট্যাবে আজকের, আসন্ন ও ক্যালেন্ডার দেখুন; প্রাইভেট/ব্যাচ/চাকরি ফিল্টার করা যায়।', 'See today, upcoming and the calendar; filter private/batch/job.'), L('সম্পন্ন, অনুপস্থিত, বাতিল বা স্থগিত চিহ্নিত করুন। ব্যাচে কে অনুপস্থিত তাও লেখা যায়।', 'Mark done, absent, cancelled or postponed. In a batch you also mark who was absent.'), L('একই সময়ে দুটি ক্লাস পড়লে ⚠️ সতর্কতা আসে। প্রতি-ক্লাসের ফিতে শুধু সম্পন্ন ও অতিরিক্ত ক্লাস ধরা হয়।', 'Overlapping classes show a ⚠️ warning. Per-class fees count only done and extra classes.')])],
    [L('সব শিক্ষার্থী ও ব্যাচ', 'All Students & batches'), ul([L('<b>কাজ → সব শিক্ষার্থী</b>: প্রাইভেট আর ব্যাচের সবাই এক তালিকায়। খুঁজুন, ফিল্টার করুন (ধরন, ফি-র অবস্থা), 💵 চেপে সরাসরি ফি নিন। নামে চাপলে পুরো প্রোফাইল: ফি, পেমেন্টের ইতিহাস, উপস্থিতি, ফল।', '<b>Work → All Students</b>: private and batch students in one list. Search, filter (type, fee status) and tap 💵 to collect a fee. Tap a name for the full profile: fees, payment history, attendance, results.'), L('<b>ব্যাচ</b>: তৈরি, এডিট, আর্কাইভ বা (ইতিহাস না থাকলে) ডিলিট। ব্যাচের পাতায় শিক্ষার্থী যোগ করুন আগে থেকে থাকা শিক্ষার্থী বেছে (নকল তৈরি হয় না), ফি-আদায়-বকেয়া ও উপস্থিতির সারাংশ দেখুন।', '<b>Batches</b>: create, edit, archive or (with no history) delete. Add students by picking existing ones (no duplicates) and see fees collected, dues and attendance at a glance.'), L('<b>উপস্থিতি</b>: ব্যাচের যেকোনো দিনের উপস্থিত/অনুপস্থিত লিখুন। ইতিহাস ও শিক্ষার্থী-ভিত্তিক শতাংশ দেখা যায়।', '<b>Attendance</b>: mark Present/Absent for any day of a batch. See the history and each student’s percentage.'), L('<b>ফি নিন</b>: টাকা সবচেয়ে পুরোনো মাসের বকেয়া থেকে আগে মেটে। অবস্থা: Paid, Partially Paid, Due, Overdue। পেমেন্ট বাতিল/সংশোধন করলে সব অঙ্ক সাথে সাথে বদলায়।', '<b>Collect fee</b>: money goes to the oldest due month first. Status: Paid, Partially Paid, Due, Overdue. Voiding or fixing a payment updates every figure at once.'), L('<b>সরানো</b>: বকেয়া থাকলে পরিমাণসহ সতর্ক করে। "আর্কাইভ" করলে ইতিহাস ও বকেয়া থাকে, সক্রিয় তালিকা থেকে সরে যায়। বকেয়া কখনো চুপচাপ মুছে যায় না।', '<b>Removing</b>: warns with the amount if anything is unpaid. "Archive" keeps history and dues and hides the student. Unpaid balances are never erased silently.'), L('<b>নিচের ＋ দ্রুত বাটন</b>: শিক্ষার্থী যোগ, ব্যাচ তৈরি, উপস্থিতি, ফি নিন, সব শিক্ষার্থী, বকেয়া ফি, পরীক্ষা, ফল, রিপোর্ট।', '<b>The floating ＋ Quick button</b>: Add Student, Create Batch, Attendance, Collect Fee, All Students, Due Fees, Exams, Results, Reports.')])],
    [L('পরীক্ষা ও ফল', 'Exams & results'), ul([L('পরীক্ষায় নাম, তারিখ, বিষয়, পূর্ণমান আর ব্যাচ বা আলাদা শিক্ষার্থী বাছুন। খরচ ঐচ্ছিক।', 'Give an exam a name, date, subject, total marks and a batch or individual students. Cost is optional.'), L('"নম্বর লিখুন" চেপে প্রত্যেকের নম্বর দিন। গড়, সর্বোচ্চ, পাস সংখ্যা ও অবস্থান নিজে হিসাব হয়; ফাঁকা মানে এখনও নম্বর লেখা হয়নি।', 'Tap "Enter marks" for each student. Average, highest, pass count and rank are worked out; empty means not graded yet.'), L('শিক্ষার্থীর প্রোফাইলে তার সব ফল, ব্যাচের পাতায় ব্যাচের সব পরীক্ষা, আর টাকা → ফল ট্যাবে ব্যাচ ও শিক্ষার্থী ধরে সারাংশ।', 'A student’s profile lists all their results, a batch page lists its exams, and Money → Results gives batch-wise and student-wise summaries.')])],
    [L('পরীক্ষার খরচ', 'Exam costs'), `<p>${L('প্রশ্নপত্র = শিক্ষার্থী × পৃষ্ঠা × প্রতি পৃষ্ঠার দাম। খাতা = সংখ্যা × একক দাম। মোট = প্রশ্নপত্র + খাতা + অপচয় + অন্যান্য। উদাহরণ: ৩০ জন × ৪ পৃষ্ঠা × ২ টাকা = ২৪০, ৩০ খাতা × ৮ টাকা = ২৪০, মোট ৪৮০ টাকা (প্রকৃত)। পরীক্ষা একটাই খরচ হয়ে ব্যাচ ও মাসের হিসাবে যায়।', 'Question paper = students × pages × price per page. Sheets = count × unit price. Total = paper + sheets + waste + other. Example: 30 × 4 pages × ৳2 = 240, 30 sheets × ৳8 = 240, total ৳480 (actual). Each exam becomes one expense in its batch and month.')}</p>`],
    [L('বই ও সামগ্রী', 'Books & supplies'), `<p>${L('কেনা পণ্য, পরিমাণ, একক দাম, দোকান, উদ্দেশ্য ও রসিদের ছবি রাখুন। ♻️ পুনর্ব্যবহারযোগ্য সরঞ্জাম কেনার দিনেই একবার খরচ ধরা হয়। পরীক্ষার কাগজ-প্রিন্ট পরীক্ষা থেকে হিসাব করুন, এখানে আবার দিলে দুবার ধরা হবে।', 'Keep item, quantity, unit price, shop, purpose and receipt photo. ♻️ Reusable equipment is counted once, on purchase day. Work out exam paper and printing under Exams; entering them here as well would count twice.')}</p>`],
    [L('১ টাকা যোগের নিয়ম', 'The ৳1 display rule'), `<p>${L('এই মডিউলের স্ক্রিন, কার্ড, তালিকা, রিপোর্ট, PDF ও শেয়ার করা টেক্সটে প্রতিটি দেখানো টাকায় ঠিক ১ টাকা যোগ করে দেখানো হয়। ডেটা, ইনপুট, হিসাব, ব্যাকআপ ও রপ্তানি সবসময় প্রকৃত অঙ্কে থাকে। রিপোর্টে "প্রকৃত হিসাব" অংশে প্রকৃত মান আলাদা করে দেওয়া আছে। এই নিয়ম অন্য মডিউলে লাগে না।', 'Every amount shown on this module\'s screens, cards, lists, reports, PDFs and shared text has exactly ৳1 added for display. Stored data, inputs, calculations, backups and exports always hold the actual figures. Reports include an "Actual figures" part with the real values. This rule does not apply to other modules.')}</p>`],
    [L('ব্যাকআপ', 'Backup'), `<p>${L('"আরও → ব্যাকআপ নিন"-এ শিক্ষক মডিউলের সব ডেটা, রসিদ ও ডকুমেন্টের ছবিসহ যায় এবং ফেরত আনলে অন্য মডিউলের ডেটা অক্ষত থাকে।', 'More → Back up includes all teacher data with receipt and document photos. Restoring keeps the other modules\' data intact.')}</p>`],
  ];
  return `${sheetHead(L('শিক্ষক ব্যবস্থাপনা: গাইড', 'Teacher Manager: guide'), L('প্রতিটা হিসাব উদাহরণসহ', 'How each number is worked out'))}
    <div class="guide">${S.map(([ti, b], i) => `<details class="gd" ${i === 0 ? 'open' : ''}><summary><span class="sn">${i + 1}</span><b>${ti}</b>${icon('chev', 18)}</summary><div class="gbody">${b}</div></details>`).join('')}</div>`;
}

/* ---------- রিপোর্ট শেয়ার/PDF ---------- */
Object.assign(ACTIONS, {
  'tc-rep-copy': async () => { const txt = tcReportText(tcUi.ym, tcUi.rmode === 'year'); try { await navigator.clipboard.writeText(txt); toast(L('কপি হয়েছে', 'Copied')); } catch (e) { toast(L('কপি করা যায়নি', 'Could not copy'), 'danger'); } },
  'tc-rep-share': async () => {
    const txt = tcReportText(tcUi.ym, tcUi.rmode === 'year');
    try { if (navigator.share) await navigator.share({ title: L('শিক্ষক হিসাব', 'Teacher books'), text: txt }); else { await navigator.clipboard.writeText(txt); toast(L('শেয়ার নেই, কপি হয়েছে', 'Sharing unavailable; copied')); } } catch (e) { if (e && e.name !== 'AbortError') toast(L('শেয়ার করা যায়নি', 'Could not share'), 'danger'); }
  },
  'tc-rep-pdf': async () => {
    const annual = tcUi.rmode === 'year', html = tcReportPrintHtml(tcUi.ym, annual), name = `teacher-${annual ? tcUi.ym.slice(0, 4) : tcUi.ym}`;
    if (typeof hgHtmlToPdf !== 'function') return typeof hgOpenPrint === 'function' ? hgOpenPrint(html, name) : toast(L('PDF এখানে চালু নেই', 'PDF unavailable'), 'danger');
    toast(L('PDF বানানো হচ্ছে…', 'Making the PDF…'));
    try {
      const { blob, pages } = await hgHtmlToPdf(html), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 8000);
      toast(L(`PDF নামানো হয়েছে (${pages} পাতা)`, `PDF saved (${pages} page${pages > 1 ? 's' : ''})`));
    } catch (err) { if (typeof hgOpenPrint === 'function') hgOpenPrint(html, name); }
  },
});

/* ---------- রেজিস্টার ---------- */
registerModule({
  id: 'teacher',
  icon: 'cap',
  emoji: '🎓',
  short: () => L('শিক্ষক', 'Teacher'),
  name: () => L('শিক্ষক ব্যবস্থাপনা', 'Teacher Manager'),
  tagline: () => L('চাকরি, প্রাইভেট টিউশন, কোচিং, ক্লাস, আয়-ব্যয় ও পরীক্ষার হিসাব', 'Jobs, tuition, coaching, classes, income, costs and exams'),
  migrate: tcMigrate,
  hasData: s => !!(s.teacher && ['jobs', 'students', 'batches'].some(k => Array.isArray(s.teacher[k]) && s.teacher[k].some(x => !x.del))),
  imageIds: () => { const t = tcd(); return t.expenses.flatMap(e => (e.photos || []).map(id => 'tcp:' + id)).concat(t.students.flatMap(s => (s.docs || []).map(id => 'tcp:' + id))); },
  backupSummary: s => (s.teacher && Array.isArray(s.teacher.students) && (s.teacher.students.length || (s.teacher.jobs || []).length) ? L(`${cnt((s.teacher.students || []).length)} শিক্ষার্থী, ${cnt((s.teacher.jobs || []).length)} চাকরি`, `${(s.teacher.students || []).length} student(s), ${(s.teacher.jobs || []).length} job(s)`) : ''),
  ready: () => true,
  welcome: () => '',
  context: () => ({}),
  topbar: tcTopbar,
  fab: () => tcFab(),
  guide: tcGuide,
  tabs: [
    { id: 'home', icon: 'home', label: () => L('হোম', 'Home'), view: () => tcHome() },
    { id: 'sched', icon: 'cal', label: () => L('ক্লাস', 'Classes'), view: () => tcSched() },
    { id: 'work', icon: 'cap', label: () => L('কাজ', 'Work'), view: () => tcWork() },
    { id: 'money', icon: 'wallet', label: () => L('টাকা', 'Money'), view: () => tcMoneyTab() },
    { id: 'more', icon: 'grid', label: () => L('আরও', 'More'), view: () => tcMoreTab() },
  ],
});
