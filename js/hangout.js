'use strict';

/* =========================================================
   মডিউল: Hangout & Group Expenses (বন্ধুদের সাথে আড্ডা, ভ্রমণ, রেস্টুরেন্ট, যৌথ খরচ)
   ডেটা: state.hangout (ব্যবসার ডেটা থেকে সম্পূর্ণ আলাদা)। হিসাব: js/hangout-calc.js
   রিপোর্ট/ব্যাকআপ: js/hangout-report.js
   ========================================================= */

Object.assign(ICONS, {
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.6.3 4.5 2.4 4.5 5.1"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M15 13.5h3"/>',
  doc: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1.5"/><path d="M5 8v11h14V8M10 12h4"/>',
  share: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="m8.2 11 7.6-3.8M8.2 13l7.6 3.8"/>',
  person: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
});

/* ---------- টেমপ্লেট ও ক্যাটাগরি ---------- */
const HG_CAT = {
  food: ['খাবার', 'Food'], drinks: ['পানীয়', 'Drinks'], vat: ['ভ্যাট/ট্যাক্স', 'VAT/Tax'], service: ['সার্ভিস চার্জ', 'Service charge'],
  discount: ['ডিসকাউন্ট', 'Discount'], other_charges: ['অন্যান্য চার্জ', 'Other charges'], groceries: ['খাবার ও বাজার', 'Food & groceries'],
  transport: ['যাতায়াত', 'Transportation'], location: ['জায়গা ভাড়া', 'Location rent'], equipment: ['সরঞ্জাম', 'Equipment'],
  games: ['গেম ও বিনোদন', 'Games & entertainment'], other: ['অন্যান্য', 'Other expenses'], tickets: ['টিকেট', 'Tickets'], shopping: ['শপিং', 'Shopping'],
  misc: ['বিবিধ', 'Miscellaneous'], fuel: ['জ্বালানি', 'Fuel'], toll: ['টোল ও পার্কিং', 'Toll & parking'], hotel: ['হোটেল', 'Hotel'],
  room: ['রুম ভাড়া', 'Room charges'], decoration: ['সাজসজ্জা', 'Decoration'], venue: ['ভেন্যু', 'Venue'], gifts: ['উপহার', 'Gifts'],
};
const HG_TYPES = {
  hangout: { bn: 'বন্ধুদের আড্ডা', en: 'Friends hangout', icon: '🧑‍🤝‍🧑', cats: ['food', 'transport', 'tickets', 'shopping', 'misc'] },
  restaurant: { bn: 'রেস্টুরেন্ট', en: 'Restaurant', icon: '🍽️', cats: ['food', 'drinks', 'vat', 'service', 'discount', 'other_charges'] },
  picnic: { bn: 'পিকনিক', en: 'Picnic', icon: '🧺', cats: ['groceries', 'transport', 'location', 'equipment', 'games', 'other'] },
  dayout: { bn: 'ডে আউট', en: 'Day out', icon: '🌤️', cats: ['food', 'transport', 'tickets', 'shopping', 'misc'] },
  tour: { bn: 'ভ্রমণ / রোড ট্রিপ', en: 'Tour / road trip', icon: '🚐', cats: ['transport', 'fuel', 'toll', 'hotel', 'food', 'tickets', 'other'] },
  hotel: { bn: 'হোটেল থাকা', en: 'Hotel stay', icon: '🏨', cats: ['room', 'food', 'other_charges'] },
  birthday: { bn: 'জন্মদিন / অনুষ্ঠান', en: 'Birthday / event', icon: '🎂', cats: ['food', 'decoration', 'venue', 'gifts', 'equipment', 'other'] },
  transport: { bn: 'যাতায়াত', en: 'Transportation', icon: '🚌', cats: ['transport', 'fuel', 'toll', 'other'] },
  shopping: { bn: 'শপিং ও অন্যান্য', en: 'Shopping & other', icon: '🛍️', cats: ['shopping', 'other'] },
  custom: { bn: 'কাস্টম', en: 'Custom', icon: '✨', cats: ['other'] },
};
const hgTypeLabel = k => { const t = HG_TYPES[k] || HG_TYPES.custom; return isEN() ? t.en : t.bn; };
const hgCatsFor = type => (HG_TYPES[type] || HG_TYPES.custom).cats.map(k => ({ k, bn: HG_CAT[k][0], en: HG_CAT[k][1] }));
const hgCatLabel = (ev, k) => { const c = (ev.cats || []).find(x => x.k === k) || (HG_CAT[k] ? { bn: HG_CAT[k][0], en: HG_CAT[k][1] } : null); return c ? (isEN() ? c.en : c.bn) : k; };
const HG_STATUS_LABEL = { active: ['চলমান', 'Active'], settled: ['মিটে গেছে', 'Settled'], archived: ['আর্কাইভ', 'Archived'] };
const hgStatusLabel = s => HG_STATUS_LABEL[s][isEN() ? 1 : 0];
const HG_PSTATUS = {
  must_pay: ['টাকা দিতে হবে', 'Must pay', 'neg'], pending: ['টাকা বাকি', 'Payment pending', 'neg'], partial: ['আংশিক পরিশোধিত', 'Partially paid', 'warn'],
  overpaid: ['বেশি দিয়েছে', 'Overpaid', 'pos'], refund_due: ['টাকা ফেরত পাবে', 'Refund due', 'pos'], partial_recv: ['আংশিক ফেরত পেয়েছে', 'Partly reimbursed', 'warn'],
  waived: ['মওকুফ', 'Waived', 'mute'], disputed: ['মতবিরোধ', 'Disputed', 'neg'], settled: ['হিসাব মিটেছে', 'Settled', 'pos'],
};
const hgPStatusLabel = k => HG_PSTATUS[k][isEN() ? 1 : 0];
const HG_DEC_LABELS = {
  payable: {
    full_required: ['পুরো টাকা দিতে হবে', 'Full payment required'], partial_agreement: ['আংশিক পরিশোধের সমঝোতা', 'Partial payment agreement'], pending: ['এখনও দেয়নি (পাওনা অপরিবর্তিত)', 'Payment pending'],
    waive_all: ['পুরো টাকা মওকুফ', 'Waive entire amount'], waive_partial: ['আংশিক মওকুফ', 'Waive partial amount'], disputed: ['মতবিরোধ / আলোচনা চলছে', 'Disputed / discussing'],
    cover: ['অন্য কেউ দায় নেবে', 'Another person will cover'], custom: ['কাস্টম সমঝোতা', 'Custom agreement'],
  },
  receivable: {
    reimb_full: ['পুরো টাকা ফেরত দিতে হবে', 'Full reimbursement required'], reimb_partial: ['আংশিক ফেরত', 'Partial reimbursement'], reimb_pending: ['ফেরত দেওয়া বাকি', 'Reimbursement pending'],
    waive_full: ['ফেরত নিতে হবে না (পুরো মওকুফ)', 'Full waiver / no need to return'], waive_partial: ['আংশিক মওকুফ', 'Partial waiver'], gift: ['উপহার / স্বেচ্ছা Contribution', 'Treat as gift / contribution'],
    share: ['বাড়তি খরচ অন্যরা ভাগ করবে', 'Others will share'], disputed: ['মতবিরোধ', 'Disputed'], custom: ['কাস্টম সিদ্ধান্ত', 'Custom decision'],
  },
};
const hgDecLabel = (side, type) => ((HG_DEC_LABELS[side] || {})[type] || ['', ''])[isEN() ? 1 : 0];
const HG_DSTATUS = { proposed: ['প্রস্তাবিত', 'Proposed'], awaiting: ['মতামতের অপেক্ষা', 'Awaiting opinions'], disputed: ['মতবিরোধ', 'Disputed'], agreed: ['সম্মত', 'Agreed'], finalized: ['চূড়ান্ত', 'Finalized'], cancelled: ['বাতিল', 'Cancelled'] };
const hgDStatusLabel = k => HG_DSTATUS[k][isEN() ? 1 : 0];
const HG_OPINION = { agreed: ['সম্মত', 'Agreed'], disagreed: ['অসম্মত', 'Disagreed'], no_response: ['উত্তর নেই', 'No response'], not_asked: ['জিজ্ঞাসা করা হয়নি', 'Not asked'] };
const hgOpLabel = k => HG_OPINION[k][isEN() ? 1 : 0];

/* ---------- ডেটা ও হেল্পার ---------- */
function hangoutMigrate(s) {
  const h = s.hangout = Object.assign({ schema: HG_SCHEMA, friends: [], events: [] }, s.hangout || {});
  if (!Array.isArray(h.friends)) h.friends = [];
  if (!Array.isArray(h.events)) h.events = [];
  h.events.forEach(ev => {
    ['participants', 'expenses', 'transfers', 'refunds', 'decisions', 'history'].forEach(k => { if (!Array.isArray(ev[k])) ev[k] = []; });
    if (!ev.cats || !ev.cats.length) ev.cats = hgCatsFor(ev.type);
  });
}
const hg = () => state.hangout;
const hgEvents = () => hg().events.filter(e => !e.del);
const hgEv = id => hg().events.find(e => e.id === id && !e.del) || null;
let hgRoute = { ev: null, sub: 'overview' };
const hgCur = () => hgEv(hgRoute.ev) || hgAutoEvent();
let hgF = { q: '', status: 'all', type: 'all', from: '', to: '' };
const pName = (ev, id) => { const p = ev.participants.find(x => x.id === id); return p ? p.name : '—'; };
const hgM = hgMoney;
const hgLocked = ev => ev.status !== 'active';
const hgLockMsg = ev => toast(ev.status === 'settled'
  ? L('এই ইভেন্টের হিসাব মিটে গেছে। বদলাতে আগে "আবার খুলুন" চাপুন।', 'This event is settled. Tap "Reopen" before changing it.')
  : L('এটা আর্কাইভে আছে। আগে "রিস্টোর" করুন।', 'This event is archived. Restore it first.'), 'danger');
function hgLog(ev, bn, en) {
  ev.history.push({ id: uid(), at: Date.now(), bn, en });
  if (ev.history.length > 400) ev.history.shift();
  ev.updatedAt = Date.now();
}
const hgLogT = h => (isEN() ? h.en : h.bn);
const hgFmtTime = ts => { const d = new Date(ts); return `${fmtDate(dateOf(ts))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const hgActive = ev => ev.participants.filter(p => p.active);
// এডিটের সময় সেই খরচে আগে থাকা নিষ্ক্রিয় ব্যক্তিকেও দেখানো হয়
function hgPickable(ev, usedIds) { return ev.participants.filter(p => p.active || (usedIds || []).includes(p.id)); }
function hgPidUsed(ev, pid) {
  const j = JSON.stringify([ev.expenses, ev.transfers, ev.refunds, ev.decisions]);
  return j.includes(JSON.stringify(pid));
}
const hgErr = e => {
  if (!e) return '';
  const m = {
    no_participants: ['অন্তত একজন অংশগ্রহণকারী বাছুন', 'Pick at least one participant'],
    percent_sum: [`শতাংশের যোগফল ১০০ হতে হবে (এখন ${pct(e.sum || 0)})`, `Percentages must add up to 100 (now ${pct(e.sum || 0)})`],
    invalid_percent: ['শতাংশ ঋণাত্মক বা ভুল', 'A percentage is negative or invalid'],
    ratio_empty: ['অন্তত একজনের অনুপাত দিন', 'Give at least one share ratio'], invalid_ratio: ['অনুপাত ঋণাত্মক বা ভুল', 'A ratio is negative or invalid'],
    sum_mismatch: [`মোট ${hgM(Math.abs(e.diff || 0))} ${e.diff > 0 ? 'কম' : 'বেশি'} হয়েছে, খরচের সমান হতে হবে`, `Amounts are ${hgM(Math.abs(e.diff || 0))} ${e.diff > 0 ? 'short' : 'over'}, they must equal the expense`],
    negative: ['ঋণাত্মক টাকা দেওয়া যাবে না', 'Negative amounts are not allowed'], bad_total: ['মোট টাকা ঠিক নয়', 'The total is not valid'],
    item_no_sharers: ['একটা শেয়ার্ড আইটেমে কেউ বাছা হয়নি', 'A shared item has no one selected'], item_no_owner: ['একটা আইটেমের অর্ডারকারী বাছা হয়নি', 'An item has no orderer'],
    discount_exceeds: ['ডিসকাউন্ট ওই ব্যক্তির আইটেমের দামের চেয়ে বেশি', 'A discount is larger than the items it applies to'],
    charge_custom_sum: ['কাস্টম চার্জের ভাগের যোগফল চার্জের সমান নয়', 'Custom charge shares do not add up to the charge'],
    bill_total: [`আইটেমের হিসাব আর খরচের মোট মিলছে না (${hgM(Math.abs(e.diff || 0))} পার্থক্য)`, `Items and total differ by ${hgM(Math.abs(e.diff || 0))}`], bill_sum: ['বিলের বণ্টন মিলছে না', 'Bill allocation does not add up'],
  }[e.code];
  return m ? m[isEN() ? 1 : 0] : e.code;
};

/* ---------- ছোট উপাদান ---------- */
const hgBadge = (cls, text) => `<span class="hgb ${cls}">${text}</span>`;
const hgSign = n => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');

/* ---------- ড্যাশবোর্ড ---------- */
function hgDashStats(evs) {
  let net = 0, outstanding = 0, unpaid = 0, waived = 0, disputed = 0, openPeople = 0;
  evs.filter(e => e.status !== 'archived').forEach(ev => {
    const c = hgEventCalc(ev);
    net += c.net;
    ev.participants.forEach(p => {
      const f = c.final[p.id];
      if (f > 0) outstanding += f;
      if (f < 0) { if (!c.out[p.id] && !c.inn[p.id]) unpaid += -f; if (hgPersonStatus(ev, c, p.id) === 'disputed') disputed += Math.abs(f); }
      if (f !== 0) openPeople++;
      waived += c.waivedFor[p.id];
    });
  });
  return { net, outstanding, unpaid, waived, disputed, openPeople };
}
function hgFilterEvents() {
  const q = hgF.q.trim().toLowerCase();
  return hgEvents().filter(e => (hgF.status === 'all' || e.status === hgF.status)
    && (hgF.type === 'all' || e.type === hgF.type)
    && (!q || (e.name + ' ' + (e.location || '') + ' ' + e.participants.map(p => p.name).join(' ')).toLowerCase().includes(q))
    && (!hgF.from || (e.end || e.start || '') >= hgF.from) && (!hgF.to || (e.start || '') <= hgF.to))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
function hgEventRow(ev) {
  const c = hgEventCalc(ev);
  const owe = sum(ev.participants.map(p => Math.max(0, c.final[p.id])));
  return `<button type="button" class="lrow hg-evrow" data-action="hg-open" data-id="${ev.id}">
    <span class="lic hg-ic">${(HG_TYPES[ev.type] || HG_TYPES.custom).icon}</span>
    <span class="lmain"><b>${esc(ev.name)}</b><small>${hgTypeLabel(ev.type)} · ${ev.start ? fmtDate(ev.start) : ''} · ${ev.participants.length} ${L('জন', 'people')}</small></span>
    <span class="lend"><b>${hgM(c.net)}</b><small>${owe > 0 ? `${L('বাকি', 'Open')} ${hgM(owe)}` : hgStatusLabel(ev.status)}</small></span></button>`;
}
function hgIssuesHtml(ev, c) {
  const msgs = [];
  c.issues.forEach(i => {
    const ex = ev.expenses.find(e => e.id === i.expense);
    const t = ex ? `“${esc(ex.title)}”: ` : '';
    if (i.code === 'needs_review') msgs.push(t + L('এই খরচের ভাগ আবার যাচাই করুন। ', 'Recheck this expense split. ') + esc(hgErr(i.error)));
    else if (i.code === 'payers_mismatch') msgs.push(t + L(`কে কত দিয়েছে তার যোগফল মেলে না (${hgM(Math.abs(i.diff))} পার্থক্য)`, `Payments do not add up (${hgM(Math.abs(i.diff))} off)`));
    else if (i.code === 'refund_exceeds') msgs.push(t + L('রিফান্ড খরচের চেয়ে বেশি', 'Refund is more than the expense'));
    else msgs.push(L('হিসাবে অসামঞ্জস্য আছে, খরচ ও লেনদেন দেখুন', 'The books do not balance, review expenses and payments'));
  });
  return msgs.length ? `<div class="form-error">${msgs.map(m => `<div>• ${m}</div>`).join('')}</div>` : '';
}
function hgPersonCard(ev, c, p) {
  const f = c.final[p.id], st = hgPersonStatus(ev, c, p.id);
  return `<div class="hgp ${p.active ? '' : 'off'}">
    <div class="hgp-top"><span class="hgp-av">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span><div class="hgp-n"><b>${esc(p.name)}${p.org ? ` <small class="muted">${L('অর্গানাইজার', 'organizer')}</small>` : ''}${p.active ? '' : ` <small class="muted">(${L('নিষ্ক্রিয়', 'inactive')})</small>`}</b>
      <small class="hgs ${HG_PSTATUS[st][2]}">${hgPStatusLabel(st)}</small></div>
      <div class="hgp-bal ${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}"><small>${f > 0 ? L('পাবে', 'Gets') : f < 0 ? L('দেবে', 'Owes') : L('বাকি নেই', 'Even')}</small><b>${hgM(Math.abs(f))}</b></div></div>
    <div class="hgp-g"><div><small>${L('তার অংশ', 'Share')}</small><b>${hgM(c.share[p.id])}</b></div><div><small>${L('দিয়েছে', 'Paid')}</small><b>${hgM(c.paid[p.id])}</b></div>
      <div><small>${L('পরিশোধ করেছে', 'Sent')}</small><b>${hgM(c.out[p.id])}</b></div><div><small>${L('পেয়েছে', 'Received')}</small><b>${hgM(c.inn[p.id])}</b></div></div></div>`;
}
/* ---------- খরচের তালিকা ---------- */
let hgExpQ = '', hgExpCat = 'all';
function hgSecExpenses(ev, c) {
  const rows = ev.expenses.filter(e => !e.del && (hgExpCat === 'all' || e.category === hgExpCat)
    && (!hgExpQ || (e.title + ' ' + (e.desc || '')).toLowerCase().includes(hgExpQ.toLowerCase())))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
  const per = Object.fromEntries(c.per.map(x => [x.id, x]));
  return `${hgIssuesHtml(ev, c)}
    ${ev.status === 'active' ? `<div class="hg-actions"><button type="button" class="btn primary" data-action="hg-add-expense">${icon('plus', 18)} ${L('খরচ যোগ', 'Add expense')}</button>
      <button type="button" class="btn" data-action="hg-add-bill">${icon('receipt', 18)} ${L('রেস্টুরেন্ট বিল', 'Restaurant bill')}</button></div>` : ''}
    <div class="hg-filters"><input class="input" type="search" data-hg-exp="q" value="${esc(hgExpQ)}" placeholder="${L('খরচ খুঁজুন', 'Search expenses')}">
      <div class="chiprow"><button type="button" class="fchip ${hgExpCat === 'all' ? 'active' : ''}" data-action="hg-exp-cat" data-v="all">${L('সব', 'All')}</button>${ev.cats.map(k => `<button type="button" class="fchip ${hgExpCat === k.k ? 'active' : ''}" data-action="hg-exp-cat" data-v="${k.k}">${esc(isEN() ? k.en : k.bn)}</button>`).join('')}</div></div>
    ${rows.length ? `<div class="list">${rows.map(e => {
      const x = per[e.id] || { refund: 0, ok: true };
      return `<div class="lwrap"><button type="button" class="lrow" data-action="hg-edit-expense" data-id="${e.id}">
        <span class="lic">${e.mode === 'bill' ? '🧾' : '💸'}</span>
        <span class="lmain"><b>${e.personal ? '👤 ' : ''}${esc(e.title)}${x.ok ? '' : ' ⚠️'}</b><small>${esc(hgCatLabel(ev, e.category))}${e.personal ? ` · ${esc(pName(ev, e.personal))}${L('-এর নিজের', "'s own")}` : ''} · ${fmtDate(e.date)} · ${L('দিয়েছে', 'paid by')} ${e.payers.map(p => esc(pName(ev, p.pid))).join(', ')}${e.receipt ? ' 📎' : ''}</small></span>
        <span class="lend"><b>${hgM(e.total)}</b><small>${x.refund ? `${L('রিফান্ড', 'refund')} ${hgM(x.refund)}` : (e.mode === 'bill' ? L('আইটেম বিল', 'itemised') : hgMethodLabel(e.method))}</small></span></button>
        ${ev.status === 'active' ? delBtn('hg-del-expense', e.id) : ''}</div>`;
    }).join('')}</div>` : empty('🧾', L('কোনো খরচ নেই', 'No expenses'), L('খরচ যোগ করলে এখানে দেখা যাবে।', 'Added expenses show up here.'))}`;
}
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('[data-hg-exp]');
  if (!el) return;
  hgExpQ = el.value;
  const ev = hgCur(); if (!ev) return;
  const tmp = document.createElement('div'); tmp.innerHTML = hgSecExpenses(ev, hgEventCalc(ev));
  const nl = $('.list, .empty', tmp), cur = $('.hg-body .list, .hg-body .empty');
  if (nl && cur) cur.replaceWith(nl);
});
const HG_METHODS = { equal: ['সমান ভাগ (সবাই)', 'Equal (everyone)'], selected: ['নির্বাচিতদের মধ্যে', 'Selected people'], exact: ['নির্দিষ্ট টাকা', 'Exact amounts'], percent: ['শতাংশ', 'Percentage'], ratio: ['অনুপাত', 'Share ratio'], custom: ['কাস্টম', 'Custom'] };
const hgMethodLabel = m => (HG_METHODS[m] || ['', ''])[isEN() ? 1 : 0];

/* ---------- বন্ধুরা (ইভেন্টের ভেতর) ---------- */
function hgSecPeople(ev, c) {
  return `${ev.status === 'active' ? `<button type="button" class="btn primary block" data-action="hg-add-person">${icon('plus', 18)} ${L('বন্ধু যোগ করুন', 'Add person')}</button>` : ''}
    ${ev.participants.map(p => `<section class="card hg-pcard">${hgPersonCard(ev, c, p)}
      ${p.phone ? `<p class="hint">📞 ${esc(p.phone)}</p>` : ''}${p.note ? `<p class="hint">${esc(p.note)}</p>` : ''}
      ${p.joinedOn ? `<p class="hint">🗓️ ${L('যোগ দিয়েছে', 'Joined')}: ${fmtDate(p.joinedOn)}${ev.start ? ' (' + hgDayLabel(ev, p.joinedOn) + ')' : ''}</p>` : ''}
      ${ev.status === 'active' && !p.org ? `<button type="button" class="btn sm block mt8" data-action="hg-money" data-p="${p.id}">💰 ${L('টাকা জমা / শোধ / ফেরত', 'Money in / paid / returned')}</button>` : ''}
      ${ev.status === 'active' ? `<div class="btn-row mt8"><button type="button" class="btn sm" data-action="hg-edit-person" data-id="${p.id}">${icon('edit', 16)} ${L('এডিট', 'Edit')}</button>
        <button type="button" class="btn sm" data-action="hg-toggle-person" data-id="${p.id}">${p.active ? L('নিষ্ক্রিয় করুন', 'Deactivate') : L('সক্রিয় করুন', 'Activate')}</button>
        ${hgPidUsed(ev, p.id) ? '' : `<button type="button" class="btn sm danger" data-action="hg-del-person" data-id="${p.id}">${icon('trash', 16)}</button>`}</div>` : ''}</section>`).join('') || empty('🧑‍🤝‍🧑', L('কেউ নেই', 'No one yet'), L('বন্ধুদের নাম যোগ করুন।', 'Add the friends who joined.'))}
    <p class="hint">${L('যার সাথে খরচ, লেনদেন বা সিদ্ধান্ত জড়িত তাকে মোছা যায় না, শুধু নিষ্ক্রিয় করা যায়। এতে পুরোনো হিসাব ঠিক থাকে।', 'Anyone tied to an expense, payment or decision cannot be deleted, only deactivated, so old numbers stay correct.')}</p>`;
}

/* ---------- লেনদেন: Advance, Contribution, Settlement, Refund ---------- */
const HG_TKIND = { advance: ['অ্যাডভান্স', 'Advance', '⏩'], contribution: ['কন্ট্রিবিউশন', 'Contribution', '🤝'], settlement: ['পরিশোধ (সেটেলমেন্ট)', 'Settlement payment', '✅'] };
function hgSecPayments(ev, c) {
  const act = ev.status === 'active';
  const ts = ev.transfers.filter(t => !t.del).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
  const rs = ev.refunds.filter(r => !r.del);
  return `${act ? `<div class="hg-actions three">${['advance', 'contribution', 'settlement'].map(k => `<button type="button" class="btn" data-action="hg-add-transfer" data-kind="${k}">${HG_TKIND[k][2]} ${HG_TKIND[k][isEN() ? 1 : 0]}</button>`).join('')}
      <button type="button" class="btn" data-action="hg-add-refund">↩️ ${L('রিফান্ড', 'Refund')}</button></div>` : ''}
    <div class="section-title">${L('লেনদেন', 'Transfers')} · ${ts.length}</div>
    ${ts.length ? `<div class="list">${ts.map(t => `<div class="lwrap"><button type="button" class="lrow" data-action="hg-edit-transfer" data-id="${t.id}">
      <span class="lic">${HG_TKIND[t.kind][2]}</span><span class="lmain"><b>${esc(pName(ev, t.from))} → ${esc(pName(ev, t.to))}</b><small>${HG_TKIND[t.kind][isEN() ? 1 : 0]} · ${fmtDate(t.date)}${t.purpose ? ' · ' + esc(t.purpose) : ''}${t.note ? ' · ' + esc(t.note) : ''}</small></span>
      <span class="lend"><b>${hgM(t.amt)}</b></span></button>${act ? delBtn('hg-del-transfer', t.id) : ''}</div>`).join('')}</div>` : `<p class="hint">${L('এখনও কোনো লেনদেন নেই।', 'No transfers yet.')}</p>`}
    <div class="section-title">${L('রিফান্ড', 'Refunds')} · ${rs.length}</div>
    ${rs.length ? `<div class="list">${rs.map(r => { const ex = ev.expenses.find(e => e.id === r.expenseId); return `<div class="lwrap"><button type="button" class="lrow" data-action="hg-edit-refund" data-id="${r.id}">
      <span class="lic">↩️</span><span class="lmain"><b>${esc(ex ? ex.title : '—')}</b><small>${L('পেয়েছে', 'received by')} ${esc(pName(ev, r.by))} · ${fmtDate(r.date)}${r.note ? ' · ' + esc(r.note) : ''}</small></span><span class="lend"><b>${hgM(r.amt)}</b></span></button>${act ? delBtn('hg-del-refund', r.id) : ''}</div>`; }).join('')}</div>` : `<p class="hint">${L('কোনো রিফান্ড নেই। রিফান্ড মানে দোকান বা হোটেল থেকে টাকা ফেরত আসা, এটা নতুন আয় নয়, খরচ কমায়।', 'No refunds. A refund is money coming back from a shop or hotel; it reduces the expense and is not income.')}</p>`}
    <section class="card"><div class="card-head"><h2>${L('কে কত পরিশোধ করেছে', 'Payments by person')}</h2></div>
      ${ev.participants.map(p => `<div class="prows"><div><span>${esc(p.name)}</span><b>${L('দিয়েছে', 'sent')} ${hgM(c.out[p.id])} · ${L('পেয়েছে', 'got')} ${hgM(c.inn[p.id])}</b></div></div>`).join('')}</section>`;
}

// "দিন ১", "দিন ২": ইভেন্ট শুরুর তারিখ থেকে গোনা
function hgDayLabel(ev, date) {
  if (!ev.start || !date) return fmtDate(date);
  const n = daysBetween(ev.start, date) + 1;
  return n >= 1 ? L(`দিন ${n}`, `Day ${n}`) : fmtDate(date);
}
