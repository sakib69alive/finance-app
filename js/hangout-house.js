'use strict';

/* =========================================================
   Hangout: "মাসিক সংসার খরচ" ইভেন্টের কেন্দ্র
   - কেন্দ্রীয় মাসিক হিসাব: শুরুতে কত ছিল, কত এল, কত গেল, কত বাকি, কোন খাতে কত, কোন বিল বাকি (হিসাব: hgCentralMonth, hangout-calc.js)
   - দেনা-পাওনার রেকর্ড: খরচ একবারই ধরা হয়, পেমেন্ট আলাদা জমা হয় (Unpaid / Partial / Paid / Overdue)
   - প্রতিটা রেকর্ডের পাতা: পেমেন্টের ইতিহাস, একাধিক ছবি (প্রেসক্রিপশন, রিপোর্ট, বিল), এডিট, মোছা
   - মাসের রিপোর্ট ও শেয়ার, ফিল্টার
   খাতের নিজস্ব পাতাগুলো: js/hangout-house-cats.js
   ========================================================= */

const HG_HH_TILES = ['groceries', 'electricity', 'gas', 'water', 'internet', 'medical', 'education', 'househelp', 'cleaning', 'personalcare', 'smallexp', 'emergency', 'savings', 'family', 'other'];
const HG_HH_SPECIAL = ['groceries', 'electricity', 'gas', 'water', 'internet', 'medical', 'education', 'househelp'];
const HG_EMO = { groceries: '🛒', electricity: '💡', gas: '🔥', water: '🚰', internet: '📶', medical: '🩺', education: '🎓', househelp: '🧹', savings: '🏦', family: '👨‍👩‍👧', cleaning: '🧽', personalcare: '🧴', smallexp: '🧾', emergency: '🚨', other: '📦' };
const hgHHEmoji = k => HG_EMO[k] || '🧾';
let hgHUi = { ym: today().slice(0, 7), med: 'sum', cat: null, f: { cat: 'all', who: 'all', st: 'all', scope: 'month' } };
const hgHH = ev => { const h = ev.hh || (ev.hh = {}); h.income = h.income || {}; h.months = h.months || {}; h.profiles = h.profiles || []; h.people = h.people || []; return h; };
const hgMonth = (ev, ym) => { const h = hgHH(ev); return h.months[ym] || (h.months[ym] = { inc: [], cats: {} }); };
const hgIsHouse = ev => !!ev && ev.type === 'household';
const hgMShift = (ym, n) => { const [y, m] = ym.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + n, 1)); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0'); };
const hgMLabel = ym => { const [y, m] = ym.split('-'); return `${MONTHS[isEN() ? 'en' : 'bn'][+m - 1]} ${y}`; };
const hgDayNames = () => (isEN() ? ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র']);
const hgLive = ev => ev.expenses.filter(e => !e.del);
const hgByDate = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);
const hgMonthExps = (ev, ym) => hgLive(ev).filter(e => hgExpYm(e) === ym);
const hgPeopleNames = ev => [...new Set(hgHH(ev).people.filter(p => !p.del).map(p => p.name).concat(ev.participants.map(p => p.name)))];
const hgWhoField = (ev, name, label, v) => `<label class="field"><span>${label}</span><input class="input" name="${name}" maxlength="40" list="hg-ppl" value="${esc(v || '')}"><datalist id="hg-ppl">${hgPeopleNames(ev).map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>`;
const hgMNav = () => `<div class="mnav"><button type="button" data-action="hg-mnav" data-n="-1" aria-label="${L('আগের মাস', 'Previous month')}">${icon('prev', 20)}</button><b>${hgMLabel(hgHUi.ym)}</b><button type="button" data-action="hg-mnav" data-n="1" aria-label="${L('পরের মাস', 'Next month')}">${icon('next', 20)}</button></div>`;
const HG_ST = { paid: ['পরিশোধিত', 'Paid', 'pos'], partial: ['আংশিক দেওয়া', 'Partly paid', 'warn'], unpaid: ['বাকি', 'Unpaid', 'neg'], overdue: ['তারিখ পার, বাকি', 'Overdue', 'neg'] };
const hgStBadge = st => `<span class="hgb ${HG_ST[st][2]}">${HG_ST[st][isEN() ? 1 : 0]}</span>`;
const hgToday = () => today();
const hgShiftDay = (s, n) => { const [y, m, d] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); };

/* ---------- খরচ তৈরির সহজ পথ: সদস্য একজন হোক বা বেশি, একটাই খরচ ---------- */
function hgSimpleExpense(ev, r) {
  const ids = ev.participants.map(p => p.id), act = ev.participants.filter(p => p.active).map(p => p.id);
  const payer = (ev.participants.find(p => p.org && p.active) || ev.participants.find(p => p.active) || {}).id;
  if (!payer) return null;
  const sp = hgSplit(r.total, 'equal', ids, { incl: act });
  const alloc = sp.ok ? sp.alloc : { [payer]: r.total };
  return { id: uid(), createdAt: Date.now(), updatedAt: Date.now(), mode: 'split', method: 'equal', spec: { incl: act, values: {} }, alloc: Object.fromEntries(ids.map(id => [id, alloc[id] || 0])), personal: null, meta: {},
    payers: [{ pid: payer, amt: r.total }], title: r.title, category: r.category, date: r.date || today(), desc: r.desc || '', total: r.total, info: r.info || {}, pays: r.pays || [], photos: [] };
}
// মোট বদলালে ভাগ নতুন মোট অনুযায়ী মিলিয়ে দেওয়া
function hgResync(ev, x) {
  const fresh = hgSimpleExpense(ev, { title: x.title, category: x.category, total: x.total });
  if (fresh) Object.assign(x, { payers: fresh.payers, alloc: fresh.alloc, spec: fresh.spec });
}

/* ---------- পেমেন্ট ঘর (সব ফর্মে একই): পুরো / কিছুটা / এখনও দিইনি ---------- */
const HG_METHODS_PAY = () => [['cash', L('নগদ', 'Cash')], ['mobile', L('মোবাইল ব্যাংকিং', 'Mobile banking')], ['card', L('কার্ড / ব্যাংক', 'Card / bank')], ['other', L('অন্য', 'Other')]];
const hgMethodName = k => (HG_METHODS_PAY().find(m => m[0] === k) || [0, k || ''])[1];
function hgPayFields() {
  return `<div class="field credit"><span class="flabel">${L('টাকা দেওয়ার অবস্থা', 'Payment status')}</span>${seg('paystat', [['paid', L('পুরো দিয়েছি', 'Paid in full')], ['partial', L('কিছুটা', 'Part')], ['unpaid', L('এখনও দিইনি', 'Not yet')]], 'paid')}
    <div class="hidden" data-partial><label class="field"><span>${L('এখন কত দিলেন', 'Paid now')}</span>${moneyInput('partialAmt', '', '0')}</label></div>
    <div class="row2" data-paymeta><label class="field"><span>${L('পদ্ধতি', 'Method')}</span><select class="input" name="paymethod">${HG_METHODS_PAY().map(m => `<option value="${m[0]}">${m[1]}</option>`).join('')}</select></label>
      <label class="field"><span>${L('দেওয়ার তারিখ', 'Paid on')}</span><input class="input" type="date" name="paydate" value="${today()}"></label></div></div>`;
}
function hgPayRead(f, total) {
  if (!f.elements.paystat) return { pays: [] };
  const st = f.elements.paystat.value, date = f.elements.paydate.value || today(), method = f.elements.paymethod.value;
  if (st === 'unpaid') return { pays: [] };
  let amt = total;
  if (st === 'partial') { amt = toMinor(f.elements.partialAmt.value); if (!(amt > 0 && amt < total)) return { err: L('কিছুটা দিলে মোটের চেয়ে কম একটা অঙ্ক লিখুন', 'For a part payment enter an amount below the total'), field: 'partialAmt' }; }
  return { pays: [{ id: uid(), amt, date, method, note: '', createdAt: Date.now() }] };
}
// নতুন রেকর্ড বা এডিট সেভ: সাধারণ খরচ হিসেবে ঢোকে (মোট, বাজেট, রিপোর্ট নিজে মেলে)
async function hgFinish(ev, f, rec) {
  const id = f.dataset.id, x0 = id && ev.expenses.find(e => e.id === id);
  const pr = x0 ? { pays: [] } : hgPayRead(f, rec.total); if (pr.err) return fail(f, pr.err, pr.field);
  let x = x0;
  if (rec.category && HG_CAT[rec.category] && !ev.cats.some(k => k.k === rec.category)) ev.cats.push({ k: rec.category, bn: HG_CAT[rec.category][0], en: HG_CAT[rec.category][1] });
  if (x0) { Object.assign(x0, { title: rec.title, category: rec.category || x0.category, total: rec.total, desc: rec.desc != null ? rec.desc : x0.desc, info: Object.assign({}, x0.info, rec.info), updatedAt: Date.now() }); if (rec.date) x0.date = rec.date; hgResync(ev, x0); }
  else { x = hgSimpleExpense(ev, Object.assign({}, rec, { pays: pr.pays })); if (!x) return fail(f, L('আগে অন্তত একজন সদস্য যোগ করুন', 'Add at least one member first')); ev.expenses.push(x); }
  const okImg = f.querySelector('[data-hg-rcpt]') ? await hgSaveReceipt(x, f) : true;
  closeSheet();
  hgLog(ev, `${x0 ? 'খরচ বদলানো' : 'খরচ যোগ'}: ${x.title} ${hgM(x.total)}`, `${x0 ? 'Expense edited' : 'Expense added'}: ${x.title} ${hgM(x.total)}`);
  commit(okImg ? SAVED() : L('সেভ হয়েছে, কিন্তু ছবি সেভ করা যায়নি', 'Saved, but the photo could not be saved'));
  setTimeout(() => { const c = hgCur(); if (c && hgHUi.cat) openSheet(hgCatScreen(c, hgHUi.cat)); }, 400);
}
const HG_LIVE_X = {};
LIVE['hg-hh'] = (f, t) => {
  if (f.elements.paystat) { const st = f.elements.paystat.value; $('[data-partial]', f).classList.toggle('hidden', st !== 'partial'); $('[data-paymeta]', f).classList.toggle('hidden', st === 'unpaid'); }
  const fn = HG_LIVE_X[f.dataset.kind]; if (fn) fn(f, t);
};

/* ---------- রেকর্ডের পাতা: বিস্তারিত, পেমেন্ট, ছবি ---------- */
const HG_DOC_LABELS = () => [['rx', L('প্রেসক্রিপশন', 'Prescription')], ['report', L('রিপোর্ট', 'Report')], ['bill', L('বিল / রসিদ', 'Bill / receipt')], ['other', L('অন্য', 'Other')]];
const hgDocLabel = k => (HG_DOC_LABELS().find(x => x[0] === k) || [0, k])[1];
function hgRecDetails(e) {
  const i = e.info || {}, r = [];
  const add = (l, v) => { if (v !== undefined && v !== null && v !== '' && v !== 0) r.push([l, v]); };
  if (i.kind === 'bill') {
    add(L('সংযোগ', 'Connection'), i.label); add(L('মাসের বিল', 'Month'), i.ym ? hgMLabel(i.ym) : ''); add(L('মূল বিল', 'Base'), i.base ? hgM(i.base) : ''); add(L('অতিরিক্ত চার্জ', 'Extra charge'), i.extra ? hgM(i.extra) : ''); add(L('ডিসকাউন্ট / সমন্বয়', 'Discount'), i.discount ? '−' + hgM(i.discount) : '');
    if (i.curr > 0 && i.curr >= (i.prev || 0)) add(L('রিডিং', 'Reading'), `${i.prev || 0} → ${i.curr} (${i.curr - (i.prev || 0)} ${L('ইউনিট', 'units')})`);
    add(L('নির্ধারিত তারিখ', 'Due date'), i.dueDate ? fmtDate(i.dueDate) : '');
  } else if (i.kind === 'edu') {
    add(L('শিক্ষার্থী', 'Student'), i.student); add(L('শিক্ষক', 'Teacher'), i.teacher); add(L('বিষয়', 'Subject'), i.subject); add(L('মাস', 'Month'), i.ym ? hgMLabel(i.ym) : '');
    add(L('মূল ফি', 'Base fee'), i.base ? hgM(i.base) : ''); add(L('ক্লাস হয়েছে', 'Classes held'), i.classes); if (i.absent) add(L('অনুপস্থিত ক্লাস', 'Absent classes'), `${i.absent}${i.dedPer ? ' × −' + hgM(i.dedPer) : ''}`);
    if (i.extraN) add(L('অতিরিক্ত ক্লাস', 'Extra classes'), `${i.extraN}${i.extraPer ? ' × ' + hgM(i.extraPer) : ''}`); add(L('অতিরিক্ত ফি', 'Extra fee'), i.extraFee ? hgM(i.extraFee) : ''); add(L('নির্ধারিত তারিখ', 'Due date'), i.dueDate ? fmtDate(i.dueDate) : '');
  } else if (i.kind === 'edu-misc') { add(L('শিক্ষার্থী', 'Student'), i.student); add(L('ধরন', 'Type'), i.type); add(L('কাকে / কোথায়', 'Paid to'), i.payee); }
  else if (i.kind === 'visit') {
    add(L('কার চিকিৎসা', 'Patient'), i.patient); add(L('ডাক্তার', 'Doctor'), i.doctor); add(L('বিশেষত্ব', 'Specialty'), i.specialty); add(L('হাসপাতাল / ক্লিনিক', 'Hospital'), i.hospital);
    add(L('ডাক্তারের ফি', 'Doctor fee'), i.fee ? hgM(i.fee) : ''); add(L('পরীক্ষা-নিরীক্ষা', 'Tests'), i.tests ? hgM(i.tests) : ''); add(L('অন্যান্য চার্জ', 'Other charges'), i.other ? hgM(i.other) : ''); add(L('পরবর্তী অ্যাপয়েন্টমেন্ট', 'Next appointment'), i.next ? fmtDate(i.next) : '');
  } else if (i.kind === 'med') {
    add(L('কার ওষুধ', 'For'), i.patient); add(L('ওষুধ', 'Medicine'), i.med); add(L('ডাক্তার', 'Doctor'), i.doctor); add(L('শক্তি / ধরন', 'Strength / type'), i.strength); add(L('কীভাবে খেতে বলা হয়েছে', 'Dose as prescribed'), i.dose);
    add(L('শুরু', 'Start'), i.start ? fmtDate(i.start) : ''); add(L('শেষ', 'End'), i.end ? fmtDate(i.end) : ''); add(L('দাম × পরিমাণ', 'Unit price × qty'), i.unit ? `${hgM(i.unit)} × ${i.packs}` : ''); add(L('ফার্মেসি', 'Pharmacy'), i.pharmacy);
    add(L('অবশিষ্ট', 'Remaining'), i.remaining); if (i.remaining && i.perDay > 0) add(L('এভাবে চললে ওষুধ থাকবে', 'At this rate it lasts'), L(`প্রায় ${Math.floor(i.remaining / i.perDay)} দিন`, `about ${Math.floor(i.remaining / i.perDay)} days`));
  } else if (i.kind === 'market') { add(L('দোকান', 'Shop'), i.shop); if (i.items && i.items.length) add(L('পণ্য', 'Items'), i.items.map(x => `${x.name}${x.price ? ' ' + hgM(x.price) : ''}`).join(', ')); }
  return r;
}
function hgRecSheet(ev, id) {
  const e = hgLive(ev).find(x => x.id === id); if (!e) return `${sheetHead(L('রেকর্ড', 'Record'))}<p class="hint">${L('পাওয়া যায়নি।', 'Not found.')}</p>`;
  const act = ev.status === 'active', obl = hgIsObl(e), paid = obl ? hgPaid(e) : e.total, rem = hgOblRem(ev, e), st = obl ? hgOblStatus(ev, e, hgToday()) : 'paid';
  const imgs = (e.receipt ? [{ id: e.receipt, label: 'bill', k: 'hgr:' }] : []).concat((e.photos || []).map(p => ({ id: p.id, label: p.label, k: 'hgp:' })));
  const pays = (e.pays || []).filter(p => !p.del);
  return `${sheetHead(esc(e.title), `${esc(hgCatLabel(ev, e.category))} · ${fmtDate(e.date)}`)}
    <div class="minis"><div class="mini"><small>${L('মোট', 'Total')}</small><b>${hgM(e.total)}</b></div><div class="mini"><small>${L('দেওয়া', 'Paid')}</small><b>${hgM(paid)}</b></div><div class="mini"><small>${L('বাকি', 'Due')}</small><b class="${rem ? 'neg' : 'pos'}">${rem ? hgM(rem) : '✓'}</b></div></div>
    ${obl ? `<div class="mt8">${hgStBadge(st)}${e.info && e.info.dueDate ? ` <small class="muted">${L('নির্ধারিত', 'Due')} ${fmtDate(e.info.dueDate)}</small>` : ''}</div>` : ''}
    ${hgRecDetails(e).length ? `<div class="ledger fb mt8">${hgRecDetails(e).map(([l, v]) => `<div><span>${l}</span><span>${esc(String(v))}</span></div>`).join('')}</div>` : ''}
    ${e.desc ? `<p class="hint">${esc(e.desc)}</p>` : ''}
    ${obl ? `<div class="section-title">${L('পেমেন্টের ইতিহাস', 'Payments')} · ${pays.length}</div>
      ${pays.length ? `<div class="list">${pays.map(p => `<div class="lwrap"><div class="lrow"><span class="lic">💳</span><span class="lmain"><b>${hgM(p.amt)}</b><small>${fmtDate(p.date)} · ${esc(hgMethodName(p.method))}${p.note ? ' · ' + esc(p.note) : ''}</small></span></div>${act ? delBtn('hg-pay-del', e.id + '|' + p.id) : ''}</div>`).join('')}</div>` : `<p class="hint">${L('এখনও কোনো পেমেন্ট নেই।', 'No payment yet.')}</p>`}
      ${act && rem > 0 ? `<button type="button" class="btn primary block mt8" data-action="hg-pay-add" data-id="${e.id}">${icon('plus', 18)} ${L('পেমেন্ট যোগ করুন', 'Add a payment')}</button>` : ''}` : ''}
    <div class="section-title">${L('ছবি ও ডকুমেন্ট', 'Photos & documents')} · ${imgs.length}</div>
    <div class="bzrc">${imgs.map(m => `<span class="bzrcw"><button type="button" class="bzth" data-action="hg-photo-view" data-k="${m.k}${m.id}">${imgURL.get(m.k + m.id) ? `<img src="${imgURL.get(m.k + m.id)}" alt="">` : '🧾'}</button>${act ? `<button type="button" class="bzrx" data-action="hg-photo-del" data-id="${e.id}" data-p="${m.k}${m.id}" aria-label="${L('ছবি মুছুন', 'Remove')}">✕</button>` : ''}<small class="phl">${esc(m.k === 'hgr:' ? hgDocLabel('bill') : hgDocLabel(m.label))}</small></span>`).join('')}
      ${act ? `<button type="button" class="bzth add" data-action="hg-photo-add" data-id="${e.id}">＋<small>${L('ছবি', 'Photo')}</small></button>` : ''}</div>
    <div class="btn-row mt12">${act && e.info && e.info.kind ? `<button type="button" class="btn" data-action="hg-rec-edit" data-id="${e.id}">${icon('edit', 18)} ${L('এডিট', 'Edit')}</button>` : ''}${act ? `<button type="button" class="btn danger" data-action="hg-del-expense" data-id="${e.id}">${icon('trash', 18)} ${L('মুছুন', 'Delete')}</button>` : ''}</div>`;
}
Object.assign(ACTIONS, {
  'hg-rec-open': el => { const ev = hgCur(); if (ev) openSheet(hgRecSheet(ev, el.dataset.id)); },
  'hg-pay-add': el => {
    const ev = hgGuard(); if (!ev) return; const e = hgLive(ev).find(x => x.id === el.dataset.id); if (!e) return; const rem = hgOblRem(ev, e);
    openSheet(`${sheetHead(L('পেমেন্ট', 'Payment'), `${esc(e.title)} · ${L('বাকি', 'due')} ${hgM(rem)}`)}
    <form data-form="hg-pay" data-id="${e.id}" autocomplete="off"><label class="field"><span>${L('কত দিলেন', 'Amount')}</span>${moneyInput('amt', String(rem / 100), '0')}</label>
      <div class="row2"><label class="field"><span>${L('পদ্ধতি', 'Method')}</span><select class="input" name="method">${HG_METHODS_PAY().map(m => `<option value="${m[0]}">${m[1]}</option>`).join('')}</select></label><label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${today()}"></label></div>
      <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="80"></label>
      <p class="hint">${L('এটা নতুন খরচ নয়। খরচ আগেই ধরা হয়েছে, এখন শুধু বাকি কমবে।', 'This is not a new expense. The cost was already counted; only the due drops.')}</p>
      <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`);
  },
  'hg-pay-del': el => {
    const ev = hgGuard(); if (!ev) return; const [eid, pid] = el.dataset.id.split('|'), e = hgLive(ev).find(x => x.id === eid), p = e && e.pays.find(x => x.id === pid); if (!p) return;
    if (!confirm(L('এই পেমেন্ট মুছবেন? বাকি আবার বাড়বে।', 'Delete this payment? The due goes up again.'))) return;
    undoable(DELETED(), () => { p.del = Date.now(); hgLog(ev, 'পেমেন্ট মোছা', 'Payment deleted'); }); setTimeout(() => openSheet(hgRecSheet(hgCur(), eid)), 50);
  },
  'hg-photo-add': el => {
    const ev = hgGuard(); if (!ev) return;
    openSheet(`${sheetHead(L('ছবি যোগ', 'Add photo'))}<form data-form="hg-photo" data-id="${el.dataset.id}" autocomplete="off"><div class="field"><span class="flabel">${L('এটা কীসের ছবি?', 'What is it?')}</span>${seg('label', HG_DOC_LABELS(), 'bill')}</div>
      <div class="btn-row"><button type="button" class="btn" data-action="hg-photo-pick">${icon('upload', 18)} ${L('গ্যালারি / ফাইল', 'Gallery / file')}</button><button type="button" class="btn" data-action="hg-photo-cam">📷 ${L('ক্যামেরা', 'Camera')}</button></div>
      <input type="file" accept="image/*" multiple hidden data-hg-ph><input type="file" accept="image/*" capture="environment" hidden data-hg-ph></form>`);
  },
  'hg-photo-pick': el => { const i = el.closest('form').querySelectorAll('[data-hg-ph]')[0]; if (i) i.click(); },
  'hg-photo-cam': el => { const i = el.closest('form').querySelectorAll('[data-hg-ph]')[1]; if (i) i.click(); },
  'hg-photo-view': el => { const u = imgURL.get(el.dataset.k); openSheet(`${sheetHead(L('ছবি', 'Photo'))}${u ? `<img class="bzbig" src="${u}" alt="">` : `<p class="hint">${L('ছবি পাওয়া যায়নি', 'Photo not found')}</p>`}`); },
  'hg-photo-del': el => {
    const ev = hgGuard(); if (!ev) return; const e = hgLive(ev).find(x => x.id === el.dataset.id); if (!e || !confirm(L('এই ছবি মুছবেন?', 'Remove this photo?'))) return; const key = el.dataset.p;
    if (key.startsWith('hgr:')) e.receipt = null; else e.photos = (e.photos || []).filter(p => p.id !== key.slice(4));
    deleteImage(key).catch(() => {}); hgLog(ev, 'ছবি মোছা', 'Photo removed'); save(); render(); openSheet(hgRecSheet(ev, e.id));
  },
  'hg-rec-edit': el => { const ev = hgGuard(); if (!ev) return; const e = hgLive(ev).find(x => x.id === el.dataset.id); if (e) hgOpenEditForm(ev, e); },
});
document.addEventListener('change', async e => {
  if (!e.target.matches || !e.target.matches('[data-hg-ph]')) return;
  const f = e.target.closest('form'), files = [...(e.target.files || [])]; e.target.value = ''; if (!f || !files.length) return;
  const ev = hgGuard(); if (!ev) return; const x = hgLive(ev).find(y => y.id === f.dataset.id); if (!x) return; let bad = 0;
  for (const file of files) { try { const b = await compressImage(file), id = uid(); await putImage('hgp:' + id, b); (x.photos = x.photos || []).push({ id, label: f.elements.label.value, at: Date.now() }); } catch (err) { bad++; } }
  hgLog(ev, 'ছবি যোগ', 'Photo added'); save(); render(); openSheet(hgRecSheet(ev, x.id)); if (bad) toast(L(`${bad}টা ছবি সেভ হয়নি`, `${bad} photo(s) not saved`), 'danger');
});
Object.assign(FORMS, {
  'hg-pay': f => {
    const ev = hgGuard(); if (!ev) return; const e = hgLive(ev).find(x => x.id === f.dataset.id); if (!e) return;
    const rem = hgOblRem(ev, e), amt = toMinor(f.elements.amt.value);
    if (!(amt > 0)) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    if (amt > rem) return fail(f, L(`বাকি আছে মাত্র ${hgM(rem)}`, `Only ${hgM(rem)} is due`), 'amt');
    const o = { amt, date: f.elements.date.value || today(), method: f.elements.method.value, note: f.elements.note.value.trim() };
    if (!e.pays) e.pays = [];
    if (e.pays.some(p => !p.del && Date.now() - p.createdAt < 5000 && p.amt === o.amt && p.date === o.date && p.method === o.method)) { closeSheet(); return toast(L('এই পেমেন্ট এইমাত্র যোগ হয়েছে', 'This payment was just added')); }
    e.pays.push(Object.assign({ id: uid(), createdAt: Date.now() }, o)); e.updatedAt = Date.now();
    closeSheet(); hgLog(ev, `পেমেন্ট: ${e.title} ${hgM(amt)}`, `Payment: ${e.title} ${hgM(amt)}`); commit(SAVED());
    setTimeout(() => openSheet(hgRecSheet(hgCur(), e.id)), 400);
  },
});
// তালিকা বা হোম থেকে রেকর্ডে ট্যাপ: গঠনমূলক রেকর্ড হলে রেকর্ডের পাতা, সাধারণ খরচ হলে আগের ফর্ম
(function () {
  const old = ACTIONS['hg-edit-expense'];
  ACTIONS['hg-edit-expense'] = el => {
    const ev = hgCur(); const e = ev && hgLive(ev).find(x => x.id === el.dataset.id);
    if (e && !e.ref && e.info && e.info.kind) return openSheet(hgRecSheet(ev, e.id));
    return old(el);
  };
})();

/* ---------- কেন্দ্রীয় মাসিক হিসাব: আয়, ধার, বাজেট ---------- */
function hgMonthSheet(ev) {
  const ym = hgHUi.ym, m = hgMonth(ev, ym), c = hgCentralMonth(ev, ym, hgToday()), prevC = hgCentralMonth(ev, hgMShift(ym, -1), hgToday());
  const inc = (m.inc || []).filter(x => !x.del), cats = ev.cats.filter(k => k.k !== 'savings');
  return `${sheetHead(L('এই মাসের টাকা ও বাজেট', 'This month\'s money & budget'), hgMLabel(ym))}
  <form data-form="hg-month" autocomplete="off">
    <label class="field"><span>${L('মোট মাসিক বাজেট (খরচের সীমা)', 'Total monthly budget (spending limit)')}</span>${moneyInput('budget', m.budget ? String(m.budget / 100) : '', '0')}</label>
    <label class="field"><span>${L('হাতে থাকা প্রাথমিক টাকা (বেতন, জমানো, সব)', 'Money in hand at the start')}</span>${moneyInput('opening', c.opening ? String(c.opening / 100) : '', '0')}</label>
    <label class="field"><span>${L('আগের মাস থেকে অবশিষ্ট টাকা', 'Left over from last month')}</span>${moneyInput('carry', m.carry ? String(m.carry / 100) : '', '0')}
      ${prevC.remaining != null && prevC.remaining > 0 ? `<button type="button" class="qchip mt8" data-action="hg-carry-fill" data-v="${prevC.remaining}">↺ ${hgMLabel(hgMShift(ym, -1))}: ${hgM(prevC.remaining)} ${L('বাকি ছিল', 'was left')}</button>` : ''}</label>
    <details class="more" ${Object.keys(m.cats || {}).length ? 'open' : ''}><summary><span class="ds-t">${L('খাতভিত্তিক বাজেট (ঐচ্ছিক)', 'Per-category budget (optional)')}</span></summary>
      ${cats.map(k => `<label class="hg-vrow"><span>${hgHHEmoji(k.k)} ${esc(isEN() ? k.en : k.bn)}</span>${moneyInput('cb_' + k.k, (m.cats || {})[k.k] ? String(m.cats[k.k] / 100) : '', '0')}</label>`).join('')}</details>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>
  <div class="section-title">${L('এই মাসে পাওয়া অতিরিক্ত টাকা', 'Extra money received this month')} · ${inc.length}</div>
  ${inc.length ? `<div class="list">${inc.map(x => `<div class="lwrap"><div class="lrow"><span class="lic">${x.kind === 'borrow' ? '📥' : '💵'}</span><span class="lmain"><b>${hgM(x.amt)} · ${x.kind === 'borrow' ? L('ধার নিয়েছি', 'Borrowed') : L('অতিরিক্ত আয়', 'Extra income')}</b><small>${fmtDate(x.date)}${x.note ? ' · ' + esc(x.note) : ''}</small></span></div>${delBtn('hg-inc-del', x.id)}</div>`).join('')}</div>` : `<p class="hint">${L('এখনও কিছু নেই।', 'Nothing yet.')}</p>`}
  <button type="button" class="btn block mt8" data-action="hg-inc-add">${icon('plus', 18)} ${L('টাকা পেলাম / ধার নিলাম', 'Add money received / borrowed')}</button>`;
}
Object.assign(ACTIONS, {
  'hg-mnav': el => { hgHUi.ym = hgMShift(hgHUi.ym, Number(el.dataset.n)); const ev = hgCur(); if (sheetOpen && hgHUi.cat && ev) openSheet(hgCatScreen(ev, hgHUi.cat)); else render(); },
  'hg-income': () => { const ev = hgGuard(); if (ev) openSheet(hgMonthSheet(ev)); },
  'hg-carry-fill': el => { const f = el.closest('form'); f.elements.carry.value = Number(el.dataset.v) / 100; },
  'hg-inc-add': () => {
    const ev = hgGuard(); if (!ev) return;
    openSheet(`${sheetHead(L('টাকা এল', 'Money received'), hgMLabel(hgHUi.ym))}<form data-form="hg-inc" data-live="hg-hh" data-kind="inc" autocomplete="off">
      <div class="field"><span class="flabel">${L('কী ধরনের', 'What kind')}</span>${seg('kind', [['extra', '💵 ' + L('অতিরিক্ত আয় / টাকা পাওয়া', 'Extra income')], ['borrow', '📥 ' + L('ধার নিয়েছি', 'Borrowed')]], 'extra')}</div>
      <label class="field"><span>${L('কত টাকা', 'Amount')}</span>${moneyInput('amt', '', '0')}</label>
      <label class="field"><span>${L('কার কাছ থেকে / কীসের', 'From whom / what for')}</span><input class="input" name="note" maxlength="60"></label>
      <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${today()}"></label>
      <div class="hidden" data-borrow><label class="chk"><input type="checkbox" name="alsoDue" checked><span>${L('ফেরত দিতে হবে বলে বাকির খাতাতেও লিখুন (আমি দেব)', 'Also record it in the credit book (I owe)')}</span></label></div>
      <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`);
  },
  'hg-inc-del': el => { const ev = hgGuard(); if (!ev) return; const m = hgMonth(ev, hgHUi.ym), x = (m.inc || []).find(i => i.id === el.dataset.id); if (!x || !confirm(L('এটা মুছবেন?', 'Delete this?'))) return; undoable(DELETED(), () => { x.del = Date.now(); }); openSheet(hgMonthSheet(hgCur())); },
});
HG_LIVE_X.inc = f => { $('[data-borrow]', f).classList.toggle('hidden', f.elements.kind.value !== 'borrow'); };
Object.assign(FORMS, {
  'hg-month': f => {
    const ev = hgGuard(); if (!ev) return; const ym = hgHUi.ym, m = hgMonth(ev, ym);
    const g = n => toMinor(f.elements[n].value);
    m.budget = g('budget') > 0 ? g('budget') : null; m.opening = g('opening'); m.carry = g('carry'); m.cats = {};
    ev.cats.forEach(k => { if (f.elements['cb_' + k.k] && g('cb_' + k.k) > 0) m.cats[k.k] = g('cb_' + k.k); });
    delete hgHH(ev).income[ym];
    closeSheet(); hgCommit(ev, `মাসের বাজেট: ${hgMLabel(ym)}`, `Monthly budget: ${hgMLabel(ym)}`);
  },
  'hg-inc': f => {
    const ev = hgGuard(); if (!ev) return; const amt = toMinor(f.elements.amt.value), kind = f.elements.kind.value;
    if (!(amt > 0)) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    const m = hgMonth(ev, hgHUi.ym), note = f.elements.note.value.trim(), date = f.elements.date.value || today();
    if ((m.inc || []).some(x => !x.del && Date.now() - x.createdAt < 4000 && x.amt === amt && x.kind === kind)) { closeSheet(); return; }
    (m.inc = m.inc || []).push({ id: uid(), kind, amt, note, date, createdAt: Date.now() });
    if (kind === 'borrow' && f.elements.alsoDue && f.elements.alsoDue.checked) (ev.dues = ev.dues || []).push({ id: uid(), dir: 'owe', who: note || L('ধার', 'Loan'), title: L('ধার নেওয়া টাকা', 'Borrowed money'), amt, date, payments: [], expenseId: null, createdAt: Date.now() });
    closeSheet(); hgCommit(ev, `${kind === 'borrow' ? 'ধার' : 'আয়'}: ${hgM(amt)}`, `${kind === 'borrow' ? 'Borrowed' : 'Income'}: ${hgM(amt)}`);
  },
});

/* ---------- হোম ---------- */
function hgListRow(ev, e) {
  const st = hgIsObl(e) ? hgOblStatus(ev, e, hgToday()) : null, rem = hgOblRem(ev, e);
  return `<button type="button" class="lrow" data-action="hg-edit-expense" data-id="${e.id}"><span class="lic">${hgHHEmoji(e.category)}</span><span class="lmain"><b>${esc(e.title)}</b><small>${esc(hgCatLabel(ev, e.category))}${e.sub ? ' · ' + esc(e.sub) : ''} · ${fmtDate(e.date)}${st && st !== 'paid' ? ' · ' + hgStBadge(st) : ''}</small></span><span class="lend"><b>${hgM(e.total)}</b>${rem ? `<small class="neg">${L('বাকি', 'due')} ${hgM(rem)}</small>` : ''}</span></button>`;
}
function hgHouseHome(ev, c0) {
  const act = ev.status === 'active', ym = hgHUi.ym, c = hgCentralMonth(ev, ym, hgToday());
  const prevYm = hgMShift(ym, -1), prev = hgCentralMonth(ev, prevYm, hgToday());
  const tiles = ev.cats.filter(k => HG_HH_TILES.includes(k.k)); HG_HH_TILES.forEach(k => { if (!tiles.some(t => t.k === k) && HG_CAT[k]) tiles.push({ k, bn: HG_CAT[k][0], en: HG_CAT[k][1] }); });
  tiles.sort((a, b) => HG_HH_TILES.indexOf(a.k) - HG_HH_TILES.indexOf(b.k));
  const lock = act ? '' : `<div class="hg-lock ${ev.status}"><span>${ev.status === 'settled' ? L('এই হিসাব বন্ধ করা আছে।', 'This is closed.') : L('এটা আর্কাইভে আছে।', 'This is archived.')}</span><button type="button" class="btn sm" data-action="${ev.status === 'settled' ? 'hg-reopen' : 'hg-restore'}">${ev.status === 'settled' ? L('আবার খুলুন', 'Reopen') : L('রিস্টোর', 'Restore')}</button></div>`;
  const base = c.available > 0 ? c.available : (c.budget || 0), denom = Math.max(base, c.spent) || 1, set = c.available > 0 || c.budget != null;
  const monthUnpaid = c.unpaid.filter(u => hgExpYm(u.e) === ym), later = c.unpaid.filter(u => hgExpYm(u.e) !== ym);
  const upcoming = c.unpaid.filter(u => u.dueDate && u.dueDate >= hgToday() && u.dueDate <= hgShiftDay(hgToday(), 7));
  const monthRows = hgMonthExps(ev, ym).sort(hgByDate);
  const urow = u => `<button type="button" class="lrow" data-action="hg-rec-open" data-id="${u.e.id}"><span class="lic">${hgHHEmoji(u.e.category)}</span><span class="lmain"><b>${esc(u.e.title)}</b><small>${hgStBadge(u.status)}${u.dueDate ? ` · ${L('নির্ধারিত', 'due')} ${fmtDate(u.dueDate)}` : ''}</small></span><span class="lend"><b class="neg">${hgM(u.rem)}</b></span></button>`;
  return `${lock}${hgIssuesHtml(ev, c0)}${hgMNav()}
  <section class="hero tappable" data-action="hg-hero-detail" role="button" tabindex="0" aria-label="${L('পুরো হিসাব দেখুন', 'See the full breakdown')}"><div class="hero-top"><div><div class="hero-label">${L('এই মাসে খরচ', 'Spent this month')}</div><div class="hero-target">${hgM(c.spent)}</div>
      <div class="hero-sub">${c.remaining != null ? (c.remaining >= 0 ? L(`বাকি ${hgM(c.remaining)}`, `${hgM(c.remaining)} left`) : L(`${hgM(-c.remaining)} বেশি গেছে`, `${hgM(-c.remaining)} over`)) : L('মাসের টাকা বা বাজেট এখনও লেখা হয়নি', 'Month money or budget not set yet')}</div></div></div>
    <div class="hero-chips"><div><small>${L('মোট ছিল', 'Total had')}</small><b>${set ? hgM(base) : '—'}</b></div><div><small>${L('বাকি', 'Left')}</small><b class="${c.remaining != null && c.remaining < 0 ? 'neg' : ''}">${c.remaining != null ? hgM(c.remaining) : '—'}</b></div><div><small>${L('বিল বাকি', 'Bills due')}</small><b>${hgM(c.unpaidMonth)}</b></div></div><div class="hero-more">${L('ট্যাপ করে পুরো হিসাব দেখুন', 'Tap for the full breakdown')} ${icon('chev', 16)}</div></section>
  ${act ? `<div class="quick four"><button type="button" class="qbtn" data-action="hg-add-expense"><span class="qi">${icon('receipt')}</span>${L('খরচ লিখুন', 'Add expense')}</button>
    <button type="button" class="qbtn" data-action="hg-income"><span class="qi">${icon('wallet')}</span>${L('মাসের টাকা', 'Month money')}</button>
    <button type="button" class="qbtn" data-action="hg-due-add"><span class="qi">${icon('clock')}</span>${L('বাকি', 'Credit')}</button>
    <button type="button" class="qbtn" data-action="hg-month-report"><span class="qi">${icon('doc')}</span>${L('মাসের রিপোর্ট', 'Month report')}</button></div>` : ''}
  <section class="card"><div class="card-head"><h2>${L('মাসের টাকার হিসাব', 'Month at a glance')}</h2>${act ? `<button type="button" class="link" data-action="hg-income">${set ? L('বদলান', 'Edit') : L('লিখুন', 'Set')}</button>` : ''}</div>
    <div class="ledger fb">
      <div><span>${L('মাসের শুরুতে ছিল', 'Had at the start')}</span><span>${hgM(c.start)}</span></div>
      ${c.extra ? `<div><span>${L('অতিরিক্ত পাওয়া', 'Extra received')}</span><span class="pos">+${hgM(c.extra)}</span></div>` : ''}${c.borrowed ? `<div><span>${L('ধার নেওয়া', 'Borrowed')}</span><span>+${hgM(c.borrowed)}</span></div>` : ''}
      <div><span>${L('এ পর্যন্ত মোট এসেছে', 'Total available so far')}</span><span>${hgM(c.available)}</span></div>
      <div><span>${L('মোট খরচ', 'Total spent')}</span><span class="neg">−${hgM(c.spent)}</span></div>
      <div class="total"><span>${L('বাকি আছে', 'Left')}</span><span class="${c.remaining != null && c.remaining < 0 ? 'neg' : 'pos'}">${c.remaining != null ? hgM(c.remaining) : '—'}</span></div></div>
    ${c.budget != null ? `<div class="brow-meta" style="margin-top:10px"><span>${L('মাসিক বাজেট', 'Monthly budget')} ${hgM(c.budget)}</span><span class="${c.budgetOver ? 'bad' : 'ok'}">${c.budgetOver ? hgM(c.spent - c.budget) + ' ' + L('বেশি', 'over') : hgM(c.budget - c.spent) + ' ' + L('বাকি', 'left')}</span></div><div class="bbar"><span class="${c.budgetOver ? 'over' : c.spent >= c.budget * 0.85 ? 'near' : ''}" style="--c:var(--sun);width:${clamp(c.spent / c.budget * 100, 0, 100).toFixed(1)}%"></span></div>` : ''}
    ${c.proj != null ? `<p class="hint" style="margin:10px 0 0">📈 ${L(`এ পর্যন্ত খরচের গতি ধরলে মাস শেষে প্রায় <b>${hgM(c.proj)}</b> লাগতে পারে`, `At your pace so far the month may cost about <b>${hgM(c.proj)}</b>`)}${base > 0 ? (c.proj > base ? L(`, যা হাতের টাকার চেয়ে ${hgM(c.proj - base)} বেশি।`, `, which is ${hgM(c.proj - base)} more than you have.`) : L(`, হাতের টাকার মধ্যেই।`, `, within what you have.`)) : '.'} <small>(${L('আন্দাজ, শুধু এই মাসের খরচ থেকে', 'estimate from this month only')})</small></p>` : ''}
    ${prev.spent > 0 ? `<p class="hint" style="margin:8px 0 0">${hgMLabel(prevYm)}: ${hgM(prev.spent)} · ${c.spent >= prev.spent ? '+' : '−'}${hgM(Math.abs(c.spent - prev.spent))}</p>` : ''}</section>
  <section class="card"><div class="card-head"><h2>${L('কোন খাতে কত গেল', 'Where it went')}</h2></div>
    ${c.catRows.length ? c.catRows.map(r => `<button type="button" class="brow rowbtn" data-action="hg-add-cat" data-k="${r.k}" data-view="1"><div class="brow-top"><span class="grow">${hgHHEmoji(r.k)} ${esc(hgCatLabel(ev, r.k))}${r.over ? ' <span class="hgb neg">' + L('বাজেট পার', 'over') + '</span>' : ''}</span><span class="amt">${hgM(r.spent)} <small>${pct(r.spent / denom * 100)}</small></span></div>
      <div class="bbar"><span class="${r.over ? 'over' : ''}" style="--c:var(--sun);width:${clamp(r.budget ? r.spent / r.budget * 100 : r.spent / denom * 100, 0, 100).toFixed(1)}%"></span></div>${r.budget ? `<div class="brow-meta"><span>${L('বাজেট', 'Budget')} ${hgM(r.budget)}</span><span class="${r.over ? 'bad' : ''}">${r.over ? hgM(r.spent - r.budget) + ' ' + L('বেশি', 'over') : hgM(r.budget - r.spent) + ' ' + L('বাকি', 'left')}</span></div>` : ''}</button>`).join('')
      : `<p class="hint" style="margin:0">${L('এই মাসে এখনও কোনো খরচ নেই। নিচের খাতে ট্যাপ করে শুরু করুন।', 'No spending this month yet. Tap a category below to start.')}</p>`}
    ${c.top ? `<p class="hint" style="margin:8px 0 0">🔝 ${L('সবচেয়ে বেশি গেছে', 'Biggest')}: <b>${esc(hgCatLabel(ev, c.top.k))}</b> ${hgM(c.top.spent)}</p>` : ''}</section>
  ${c.unpaid.length ? `<section class="card attn"><div class="card-head"><h2>🧾 ${L('বাকি বিল ও ফি', 'Unpaid bills & fees')}</h2><span class="achips">${c.unpaid.length}</span></div>
    ${upcoming.length ? `<div class="bsum warn"><b>${L('আগামী ৭ দিনে দিতে হবে', 'Due in the next 7 days')}</b><span>${upcoming.map(u => esc(u.e.title) + ' ' + fmtDate(u.dueDate)).join(' · ')}</span></div>` : ''}
    ${monthUnpaid.length ? `<div class="section-title">${hgMLabel(ym)}</div><div class="list">${monthUnpaid.map(urow).join('')}</div>` : ''}
    ${later.length ? `<div class="section-title">${L('অন্য মাসের পুরোনো বকেয়া', 'Older dues from other months')}</div><div class="list">${later.map(urow).join('')}</div>` : ''}</section>` : ''}
  ${act ? `<section class="card"><div class="card-head"><h2>${L('কোন খাতে খরচ?', 'Which category?')}</h2></div><p class="hint" style="margin:0 0 10px">${L('প্রতিটা খাতের নিজস্ব পাতা: বিল, পড়াশোনা, চিকিৎসা, বাজার… ট্যাপ করে দেখুন।', 'Each category has its own page: bills, education, medical, groceries… tap to open.')}</p>
    <div class="ctiles">${tiles.map(k => `<button type="button" class="ctile" data-action="hg-add-cat" data-k="${k.k}"><b>${hgHHEmoji(k.k)} ${esc(isEN() ? k.en : k.bn)}</b><small>${c.cats[k.k] > 0 ? hgM(c.cats[k.k]) : (HG_HH_SPECIAL.includes(k.k) ? L('খুলুন', 'Open') : L('যোগ করুন', 'Add'))}</small></button>`).join('')}</div></section>` : ''}
  ${hgPlanCard(ev, c0)}
  ${hgDueCard(ev)}
  ${monthRows.length ? `<section class="card"><div class="card-head"><h2>${L('এই মাসের খরচ', 'This month')}</h2><button type="button" class="link" data-action="hg-month-list">${L('ফিল্টারসহ সব', 'All with filters')}</button></div>
    <div class="list">${monthRows.slice(0, 6).map(e => hgListRow(ev, e)).join('')}</div></section>` : ''}`;
}
// ক্যাটাগরির সারি/টাইলে ট্যাপ: বিশেষ খাতের নিজস্ব পাতা, নইলে খাতের তালিকা বা সাধারণ ফর্ম
ACTIONS['hg-add-cat'] = el => {
  const ev = hgCur(); if (!ev) return; hgEnsureMe(ev);
  const k = el.dataset.k;
  if (hgIsHouse(ev) && HG_HH_SPECIAL.includes(k)) return openSheet(hgCatScreen(ev, k));
  hgHUi.cat = null;
  if (el.dataset.view) { hgHUi.f = { cat: k, who: 'all', st: 'all', scope: 'month' }; return openSheet(hgMonthListSheet(ev)); }
  const g = hgGuard(); if (g) openSheet(hgExpenseForm(null, k));
};
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-action="close-sheet"]')) hgHUi.cat = null; });

/* ---------- খরচের তালিকা: ফিল্টার (মাস/বছর, খাত, ব্যক্তি, পেমেন্ট অবস্থা) ---------- */
const hgWhoOf = e => (e.info && (e.info.patient || e.info.student || e.info.who)) || '';
function hgMonthListSheet(ev) {
  const f = hgHUi.f, ym = hgHUi.ym, yr = ym.slice(0, 4);
  const base = hgLive(ev).filter(e => (f.scope === 'year' ? hgExpYm(e).slice(0, 4) === yr : hgExpYm(e) === ym));
  const whos = [...new Set(base.map(hgWhoOf).filter(Boolean))];
  const stOf = e => (hgIsObl(e) || hgOblRem(ev, e) > 0 ? hgOblStatus(ev, e, hgToday()) : 'paid');
  const rows = base.filter(e => (f.cat === 'all' || e.category === f.cat) && (f.who === 'all' || hgWhoOf(e) === f.who) && (f.st === 'all' || stOf(e) === f.st)).sort(hgByDate);
  const chip = (key, v, l) => `<button type="button" class="fchip ${f[key] === v ? 'active' : ''}" data-action="hg-mf" data-key="${key}" data-v="${esc(v)}">${l}</button>`;
  return `${sheetHead(L('খরচের তালিকা', 'Expense list'), f.scope === 'year' ? yr : hgMLabel(ym))}${f.scope === 'month' ? hgMNav() : ''}
    <div class="chiprow wrap">${chip('scope', 'month', L('মাস', 'Month'))}${chip('scope', 'year', L('বছর', 'Year'))}</div>
    <div class="chiprow wrap mt8">${chip('st', 'all', L('সব', 'All'))}${['unpaid', 'partial', 'overdue', 'paid'].map(s => chip('st', s, HG_ST[s][isEN() ? 1 : 0])).join('')}</div>
    <div class="chiprow wrap mt8">${chip('cat', 'all', L('সব খাত', 'All categories'))}${[...new Set(base.map(e => e.category))].map(k => chip('cat', k, `${hgHHEmoji(k)} ${esc(hgCatLabel(ev, k))}`)).join('')}</div>
    ${whos.length ? `<div class="chiprow wrap mt8">${chip('who', 'all', L('সব ব্যক্তি', 'Everyone'))}${whos.map(w => chip('who', w, esc(w))).join('')}</div>` : ''}
    <div class="minis mt12"><div class="mini"><small>${L('মোট', 'Total')}</small><b>${hgM(sum(rows.map(e => e.total)))}</b></div><div class="mini"><small>${L('বাকি', 'Due')}</small><b class="neg">${hgM(sum(rows.map(e => hgOblRem(ev, e))))}</b></div><div class="mini"><small>${L('টা', 'Count')}</small><b>${rows.length}</b></div></div>
    <div class="list mt8">${rows.map(e => hgListRow(ev, e)).join('') || `<p class="hint" style="padding:12px">${L('কিছু পাওয়া যায়নি।', 'Nothing found.')}</p>`}</div>`;
}
Object.assign(ACTIONS, {
  'hg-month-list': () => { const ev = hgCur(); if (ev) { hgHUi.f = { cat: 'all', who: 'all', st: 'all', scope: 'month' }; openSheet(hgMonthListSheet(ev)); } },
  'hg-mf': el => { hgHUi.f[el.dataset.key] = el.dataset.v; const ev = hgCur(); if (ev) openSheet(hgMonthListSheet(ev)); },
});

/* ---------- মাসের রিপোর্ট: দেখা, কপি, শেয়ার, বাকি টাকা পরের মাসে নেওয়া ---------- */
function hgReportText(ev, ym) {
  const c = hgCentralMonth(ev, ym, hgToday()), prev = hgCentralMonth(ev, hgMShift(ym, -1), hgToday());
  const lines = [`🏡 ${ev.name} · ${hgMLabel(ym)}`, '', `${L('মাসের শুরুতে', 'Start')}: ${hgM(c.start)}`];
  if (c.extra) lines.push(`${L('অতিরিক্ত পাওয়া', 'Extra')}: +${hgM(c.extra)}`); if (c.borrowed) lines.push(`${L('ধার নেওয়া', 'Borrowed')}: +${hgM(c.borrowed)}`);
  lines.push(`${L('মোট এসেছে', 'Available')}: ${hgM(c.available)}`, `${L('মোট খরচ', 'Spent')}: ${hgM(c.spent)}`, `${L('বাকি', 'Left')}: ${c.remaining != null ? hgM(c.remaining) : '—'}`);
  if (c.budget != null) lines.push(`${L('মাসিক বাজেট', 'Budget')}: ${hgM(c.budget)}`);
  lines.push('', L('খাত অনুযায়ী', 'By category'));
  c.catRows.filter(r => r.spent > 0).forEach(r => lines.push(`- ${hgCatLabel(ev, r.k)}: ${hgM(r.spent)}${r.budget ? ` / ${hgM(r.budget)}${r.over ? ' ⚠️' : ''}` : ''}`));
  if (c.unpaid.length) { lines.push('', L('বাকি বিল / ফি', 'Unpaid')); c.unpaid.forEach(u => lines.push(`- ${u.e.title}: ${hgM(u.rem)}${u.dueDate ? ' (' + fmtDate(u.dueDate) + ')' : ''}`)); }
  if (prev.spent > 0) lines.push('', `${hgMLabel(hgMShift(ym, -1))}: ${hgM(prev.spent)} → ${hgM(c.spent)} (${c.spent >= prev.spent ? '+' : '−'}${hgM(Math.abs(c.spent - prev.spent))})`);
  return lines.join('\n');
}
Object.assign(ACTIONS, {
  'hg-month-report': () => {
    const ev = hgCur(); if (!ev) return; const ym = hgHUi.ym, c = hgCentralMonth(ev, ym, hgToday()), nextYm = hgMShift(ym, 1);
    openSheet(`${sheetHead(L('মাসের রিপোর্ট', 'Month report'), hgMLabel(ym))}${hgMNav()}
      <pre class="hg-text hgpre">${esc(hgReportText(ev, ym))}</pre>
      <div class="hg-share3 mt8"><button type="button" class="btn sm" data-action="hg-mrep-copy">📋 ${L('কপি', 'Copy')}</button><button type="button" class="btn sm" data-action="hg-mrep-share">📤 ${L('শেয়ার', 'Share')}</button><button type="button" class="btn sm" data-action="hg-month-list">📑 ${L('তালিকা', 'List')}</button></div>
      ${c.remaining != null && c.remaining > 0 && ev.status === 'active' ? `<button type="button" class="btn block mt8" data-action="hg-carry-next" data-v="${c.remaining}">➡️ ${L(`বাকি ${hgM(c.remaining)} ${hgMLabel(nextYm)}-এ নিন`, `Carry ${hgM(c.remaining)} into ${hgMLabel(nextYm)}`)}</button><p class="hint">${L('এটা আপনি চাপলেই হয়, নিজে নিজে হয় না। এই মাসের হিসাব যেমন আছে তেমনই থাকে।', 'Only when you tap it. This month\'s record stays as it is.')}</p>` : ''}`);
  },
  'hg-mrep-copy': async () => { const ev = hgCur(); if (ev) toast((await hgCopy(hgReportText(ev, hgHUi.ym))) ? L('কপি হয়েছে', 'Copied') : L('কপি করা যায়নি', 'Could not copy')); },
  'hg-mrep-share': async () => {
    const ev = hgCur(); if (!ev) return; const txt = hgReportText(ev, hgHUi.ym);
    try { if (navigator.share) { await navigator.share({ title: ev.name, text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    toast((await hgCopy(txt)) ? L('টেক্সট কপি হয়েছে', 'Text copied') : L('শেয়ার করা যায়নি', 'Could not share'));
  },
  'hg-carry-next': el => {
    const ev = hgGuard(); if (!ev) return; const next = hgMShift(hgHUi.ym, 1), m = hgMonth(ev, next);
    if (m.carry && !confirm(L(`${hgMLabel(next)}-এ আগে থেকেই ${hgM(m.carry)} লেখা আছে। বদলে দেবেন?`, `${hgMLabel(next)} already has ${hgM(m.carry)}. Replace it?`))) return;
    m.carry = Number(el.dataset.v); closeSheet(); hgCommit(ev, `বাকি টাকা পরের মাসে: ${hgM(m.carry)}`, `Carried to next month: ${hgM(m.carry)}`, L(`${hgMLabel(next)}-এ ${hgM(m.carry)} যোগ হয়েছে`, `${hgM(m.carry)} added to ${hgMLabel(next)}`));
  },
});
