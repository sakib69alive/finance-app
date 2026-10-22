'use strict';

/* =========================================================
   Hangout: রেস্টুরেন্ট বিল, লেনদেন, রিফান্ড, সিদ্ধান্ত ফর্ম + সব অ্যাকশন
   ========================================================= */

/* ---------- রেস্টুরেন্ট বিল (আইটেম অনুযায়ী) ---------- */
let hgDraft = null; // { id, title, category, date, desc, actual, payers:{pid:minor}, items, charges, note, receipt }
function hgBillOpen(e) {
  const ev = hgGuard(); if (!ev) return;
  hgPendingReceipt = undefined;
  hgDraft = e ? {
    id: e.id, title: e.title, category: e.category, date: e.date, desc: e.desc || '', actual: e.billActual || 0,
    payers: Object.fromEntries(e.payers.map(p => [p.pid, p.amt])), items: JSON.parse(JSON.stringify(e.bill.items)), charges: JSON.parse(JSON.stringify(e.bill.charges || [])), note: e.desc || '', receipt: e.receipt || null,
  } : { id: '', title: ev.type === 'restaurant' ? ev.name : '', category: (ev.cats.find(c => c.k === 'food') || ev.cats[0]).k, date: today(), desc: '', actual: 0, payers: {}, items: [], charges: [], note: '', receipt: null };
  openSheet(hgBillSheet());
}
function hgBillSync() {
  const f = $('form[data-form="hg-bill"]'); if (!f || !hgDraft) return;
  const ev = hgCur();
  hgDraft.title = f.elements.title.value.trim(); hgDraft.category = f.elements.cat.value; hgDraft.date = f.elements.date.value || today();
  hgDraft.actual = toMinor(f.elements.actual.value); hgDraft.desc = f.elements.desc.value.trim();
  hgDraft.payers = {};
  ev.participants.forEach(p => { if (f.elements['pay_' + p.id]) { const m = toMinor(f.elements['pay_' + p.id].value); if (m > 0) hgDraft.payers[p.id] = m; } });
}
const hgDraftBill = () => ({ items: hgDraft.items, charges: hgDraft.charges });
function hgBillSheet() {
  const ev = hgCur(), d = hgDraft;
  const ids = ev.participants.map(p => p.id);
  const b = hgBill(hgDraftBill(), ids);
  const computed = b.total, actual = d.actual || 0;
  const diff = actual > 0 ? actual - computed : 0;
  const total = actual > 0 ? actual : computed;
  const paid = sum(Object.values(d.payers));
  const people = hgPickable(ev, Object.keys(d.payers));
  const itemRow = it => {
    const tot = Math.round(it.unit) * Math.max(1, Math.floor(it.qty || 1));
    const who = it.type === 'shared' ? (it.sharers || []).map(id => esc(pName(ev, id))).join(', ') : esc(pName(ev, it.orderedBy));
    return `<div class="lwrap"><button type="button" class="lrow ${it.status === 'cancelled' ? 'strike' : ''}" data-action="hg-item-edit" data-id="${it.id}">
      <span class="lic">🍴</span><span class="lmain"><b>${esc(it.name)} ${it.qty > 1 ? `× ${it.qty}` : ''}</b><small>${it.type === 'shared' ? L('শেয়ার্ড', 'shared') : L('একজনের', 'individual')}: ${who}${it.status === 'cancelled' ? ' · ' + L('বাতিল', 'cancelled') : ''}</small></span>
      <span class="lend"><b>${hgM(tot)}</b><small>${hgM(it.unit)} ${L('প্রতিটা', 'each')}</small></span></button>${delBtn('hg-item-del', it.id)}</div>`;
  };
  const chRow = c => `<div class="lwrap"><button type="button" class="lrow" data-action="hg-charge-edit" data-id="${c.id}"><span class="lic">${c.kind === 'discount' ? '🏷️' : '➕'}</span>
      <span class="lmain"><b>${esc(c.name)}</b><small>${c.kind === 'discount' ? L('ডিসকাউন্ট', 'discount') : L('চার্জ', 'charge')} · ${({ proportional: L('আনুপাতিক', 'proportional'), equal: L('সমান', 'equal'), custom: L('কাস্টম', 'custom') })[c.method]}</small></span>
      <span class="lend"><b class="${c.kind === 'discount' ? 'pos' : ''}">${c.kind === 'discount' ? '−' : ''}${hgM(c.amt)}</b></span></button>${delBtn('hg-charge-del', c.id)}</div>`;
  return `${sheetHead(d.id ? L('বিল এডিট', 'Edit bill') : L('রেস্টুরেন্ট বিল', 'Restaurant bill'), esc(ev.name))}
  <form data-form="hg-bill" data-live="hg-bill" data-rid="${d.receipt || ''}" autocomplete="off">
    <label class="field"><span>${L('রেস্টুরেন্টের নাম / বিবরণ', 'Restaurant / title')}</span><input class="input" name="title" maxlength="60" value="${esc(d.title)}"></label>
    <div class="row2"><label class="field"><span>${L('খাত', 'Category')}</span>${hgSelect('cat', ev.cats.map(k => [k.k, esc(isEN() ? k.en : k.bn)]), d.category)}</label>
      <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(d.date)}"></label></div>
    <div class="section-title">${L('আইটেম', 'Items')} · ${d.items.length}</div>
    ${d.items.length ? `<div class="list">${d.items.map(itemRow).join('')}</div>` : `<p class="hint">${L('খাবারের আইটেম যোগ করুন। যার অর্ডার তার হিসাবে, শেয়ার করলে ভাগ হবে।', 'Add the dishes. Individual items go to the orderer, shared ones are split.')}</p>`}
    <button type="button" class="btn block mt8" data-action="hg-item-add">${icon('plus', 18)} ${L('আইটেম যোগ', 'Add item')}</button>
    <div class="section-title">${L('ভ্যাট, সার্ভিস চার্জ, ডিসকাউন্ট', 'VAT, service charge, discount')} · ${d.charges.length}</div>
    ${d.charges.length ? `<div class="list">${d.charges.map(chRow).join('')}</div>` : ''}
    <div class="btn-row mt8"><button type="button" class="btn sm" data-action="hg-charge-add" data-kind="charge">${icon('plus', 16)} ${L('চার্জ', 'Charge')}</button><button type="button" class="btn sm" data-action="hg-charge-add" data-kind="discount">${icon('plus', 16)} ${L('ডিসকাউন্ট', 'Discount')}</button></div>
    <section class="hg-totals">
      <div><span>${L('আইটেম মোট', 'Items subtotal')}</span><b>${hgM(b.subtotal)}</b></div>
      ${b.discountTotal ? `<div><span>${L('ডিসকাউন্ট', 'Discount')}</span><b class="pos">−${hgM(b.discountTotal)}</b></div>` : ''}
      ${b.chargeTotal ? `<div><span>${L('চার্জ (ভ্যাট/সার্ভিস)', 'Charges')}</span><b>${hgM(b.chargeTotal)}</b></div>` : ''}
      <div class="total"><span>${L('হিসাব করা বিল', 'Calculated bill')}</span><b>${hgM(computed)}</b></div></section>
    <label class="field"><span>${L('রেস্টুরেন্টের আসল বিল (মিলিয়ে দেখতে, ঐচ্ছিক)', 'Actual bill from restaurant (to reconcile, optional)')}</span>${moneyInput('actual', hgTaka(actual), hgTaka(computed))}</label>
    <div class="preview ${diff ? 'warn' : ''}" data-recon>${diff ? hgReconHtml(diff) : (actual ? `${L('আইটেমের হিসাব আসল বিলের সাথে মিলেছে', 'Items match the actual bill')} ✓` : '')}</div>
    <button type="button" class="btn block ${diff ? '' : 'hidden'}" data-action="hg-bill-adjust" data-adjbtn>${L('পার্থক্যটা "অ্যাডজাস্টমেন্ট" চার্জ হিসেবে যোগ করুন', 'Add the difference as an adjustment charge')}</button>
    ${b.errors.length ? `<div class="form-error">${b.errors.map(e => `<div>• ${esc(hgErr(e))}</div>`).join('')}</div>` : ''}
    <div class="field mt8"><span class="flabel">${L('কে কত দিয়েছে?', 'Who paid how much?')} <small class="muted">(${L('মোট', 'total')} ${hgM(total)})</small></span>
      ${people.map(p => `<label class="hg-vrow"><span>${esc(p.name)}</span>${moneyInput('pay_' + p.id, hgTaka(d.payers[p.id]), '0')}</label>`).join('')}
      <div class="btn-row mt8">${hgSelect('payAll', people.map(p => [p.id, esc(p.name)]), (ev.participants.find(p => p.org) || people[0] || {}).id)}<button type="button" class="btn sm" data-action="hg-bill-payall">${L('পুরোটা সে দিয়েছে', 'Paid it all')}</button></div>
      <div class="preview ${paid === total ? '' : 'warn'}" data-paysum>${paid === total ? `${L('মোট দেওয়া', 'Paid total')} <b class="pos">${hgM(paid)}</b> ✓` : L(`মোট দেওয়া ${hgM(paid)}, বিল ${hgM(total)}`, `Paid ${hgM(paid)} vs bill ${hgM(total)}`)}</div></div>
    ${b.ok && total > 0 ? `<section class="card"><div class="card-head"><h2>${L('কার কত পড়ল', 'Each person pays')}</h2></div>${ev.participants.filter(p => b.perPerson[p.id] > 0).map(p => `<div class="prows"><div><span>${esc(p.name)}</span><b>${hgM(b.perPerson[p.id])}</b></div></div>`).join('')}</section>` : ''}
    <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="desc" maxlength="160" value="${esc(d.desc)}"></label>
    ${hgReceiptBlock(d.receipt)}
    <button class="btn primary block" type="submit">${d.id ? L('সেভ করুন', 'Save') : L('বিল যোগ করুন', 'Add bill')}</button>
    ${d.id ? `<button type="button" class="btn danger block mt8" data-action="hg-del-expense" data-id="${d.id}">${icon('trash', 18)} ${L('ডিলিট', 'Delete')}</button>` : ''}
  </form>`;
}
const hgReconHtml = diff => (diff > 0
  ? L(`আসল বিল হিসাবের চেয়ে <b>${hgM(diff)}</b> বেশি। কোনো চার্জ বাদ পড়েছে? না হলে অ্যাডজাস্টমেন্ট যোগ করুন, নইলে এটা কারও হিসাবে গোপনে যাবে না আর সেভও হবে না।`, `The actual bill is <b>${hgM(diff)}</b> higher than the items. Missing a charge? Otherwise add an adjustment; it will not be silently charged to anyone and the bill cannot be saved until resolved.`)
  : L(`আসল বিল হিসাবের চেয়ে <b>${hgM(-diff)}</b> কম। কোনো ডিসকাউন্ট বাদ পড়েছে? অ্যাডজাস্টমেন্ট (ডিসকাউন্ট) যোগ করুন।`, `The actual bill is <b>${hgM(-diff)}</b> lower than the items. Missing a discount? Add an adjustment discount.`));
LIVE['hg-bill'] = f => {
  const ev = hgCur(); if (!ev || !hgDraft) return;
  hgBillSync();
  const b = hgBill(hgDraftBill(), ev.participants.map(p => p.id));
  const actual = hgDraft.actual, diff = actual > 0 ? actual - b.total : 0, total = actual > 0 ? actual : b.total;
  const rc = $('[data-recon]', f); rc.className = 'preview' + (diff ? ' warn' : ''); rc.innerHTML = diff ? hgReconHtml(diff) : (actual ? `${L('আইটেমের হিসাব আসল বিলের সাথে মিলেছে', 'Items match the actual bill')} ✓` : '');
  $('[data-adjbtn]', f).classList.toggle('hidden', !diff);
  const paid = sum(Object.values(hgDraft.payers)), ps = $('[data-paysum]', f);
  ps.className = 'preview' + (paid === total ? '' : ' warn');
  ps.innerHTML = paid === total ? `${L('মোট দেওয়া', 'Paid total')} <b class="pos">${hgM(paid)}</b> ✓` : L(`মোট দেওয়া ${hgM(paid)}, বিল ${hgM(total)}`, `Paid ${hgM(paid)} vs bill ${hgM(total)}`);
};
function hgItemForm(it) {
  const ev = hgCur(), d = hgDraft;
  const people = hgPickable(ev, it ? [it.orderedBy].concat(it.sharers || []) : []);
  const v = it || { name: '', unit: 0, qty: 1, type: 'individual', orderedBy: (people[0] || {}).id, sharers: people.map(p => p.id), weights: {}, status: 'ok' };
  const multi = it && it.multi;
  const type = multi ? 'multi' : v.type;
  return `${sheetHead(it ? L('আইটেম এডিট', 'Edit item') : L('আইটেম যোগ', 'Add item'), esc(d.title || ev.name))}
  <form data-form="hg-item" data-live="hg-item" data-id="${it ? it.id : ''}" autocomplete="off">
    <label class="field"><span>${L('খাবারের নাম', 'Dish name')}</span><input class="input" name="name" maxlength="50" value="${esc(v.name)}" placeholder="${L('যেমন: বার্গার', 'e.g. Burger')}"></label>
    <div class="row2"><label class="field"><span>${L('প্রতিটার দাম', 'Unit price')}</span>${moneyInput('unit', hgTaka(v.unit), '0')}</label>
      <label class="field" data-qtybox><span>${L('কয়টা', 'Quantity')}</span><input class="input" name="qty" inputmode="numeric" value="${esc(v.qty)}"></label></div>
    <div class="field"><span class="flabel">${L('কার হিসাবে যাবে?', 'Who is it for?')}</span>
      <div class="hg-methods">${[['individual', L('একজনের', 'One person')], ['shared', L('শেয়ার্ড (ভাগ)', 'Shared')], ['multi', L('একই খাবার কয়েকজন', 'Same dish, several people')]].map(([k, l]) => `<label class="chip"><input type="radio" name="type" value="${k}" ${type === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
    <label class="field" data-grp="individual"><span>${L('অর্ডার করেছে', 'Ordered by')}</span>${hgSelect('orderedBy', people.map(p => [p.id, esc(p.name)]), v.orderedBy)}</label>
    <div class="field hidden" data-grp="shared"><span class="flabel">${L('কারা শেয়ার করছে (ফাঁকা = সমান ভাগ)', 'Who shares it (blank weight = equal)')}</span>
      ${people.map(p => `<div class="hg-vrow">${hgCheckRow('sh_' + p.id, esc(p.name), (v.sharers || []).includes(p.id))}<div class="input-wrap"><input class="input" name="w_${p.id}" inputmode="decimal" placeholder="1" value="${esc((v.weights || {})[p.id] && !multi ? v.weights[p.id] : '')}"><span class="suffix">×</span></div></div>`).join('')}</div>
    <div class="field hidden" data-grp="multi"><span class="flabel">${L('কে কয়টা নিয়েছে (মোট কয়টা নিজে হিসাব হবে)', 'How many each (the total quantity is worked out)')}</span>
      ${people.map(p => `<label class="hg-vrow"><span>${esc(p.name)}</span><input class="input" name="q_${p.id}" inputmode="numeric" placeholder="0" value="${esc(multi && (v.weights || {})[p.id] ? v.weights[p.id] : '')}"></label>`).join('')}</div>
    <div class="field"><span class="flabel">${L('অবস্থা', 'Status')}</span>${seg('status', [['ok', L('ঠিক আছে', 'Normal')], ['cancelled', L('বাতিল / ফেরত', 'Cancelled / refunded')]], v.status || 'ok')}
      <div class="hint">${L('বাতিল করা আইটেম বিলে ধরা হয় না, তাই ফেরত আর ডিসকাউন্ট দুইবার প্রয়োগ হয় না।', 'Cancelled items are left out of the bill, so a refund and a discount are never applied twice.')}</div></div>
    <div class="preview" data-linetotal></div>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button>
    <button type="button" class="btn block mt8" data-action="hg-bill-back">${L('বিলে ফিরুন', 'Back to bill')}</button></form>`;
}
LIVE['hg-item'] = f => {
  const t = f.elements.type.value;
  $$('[data-grp]', f).forEach(g => g.classList.toggle('hidden', g.dataset.grp !== t));
  $('[data-qtybox]', f).classList.toggle('hidden', t === 'multi');
  const ev = hgCur();
  let qty = Math.max(1, Math.floor(hgNum(f.elements.qty.value)) || 1);
  if (t === 'multi') qty = sum(ev.participants.map(p => (f.elements['q_' + p.id] ? Math.floor(hgNum(f.elements['q_' + p.id].value)) : 0)));
  const tot = toMinor(f.elements.unit.value) * qty;
  $('[data-linetotal]', f).innerHTML = tot ? `${L('লাইন মোট', 'Line total')}: <b>${hgM(tot)}</b> (${hgM(toMinor(f.elements.unit.value))} × ${qty})` : '';
};
function hgChargeForm(c, kind) {
  const ev = hgCur(), d = hgDraft;
  const people = hgPickable(ev, []);
  const v = c || { kind: kind || 'charge', name: '', amt: 0, scope: null, method: 'proportional', values: {} };
  const scoped = !!v.scope;
  return `${sheetHead(v.kind === 'discount' ? L('ডিসকাউন্ট', 'Discount') : L('চার্জ (ভ্যাট / সার্ভিস / অন্য)', 'Charge (VAT / service / other)'), esc(d.title || ev.name))}
  <form data-form="hg-charge" data-live="hg-charge" data-id="${c ? c.id : ''}" autocomplete="off">
    <div class="field"><span class="flabel">${L('ধরন', 'Type')}</span>${seg('kind', [['charge', L('চার্জ', 'Charge')], ['discount', L('ডিসকাউন্ট', 'Discount')]], v.kind)}</div>
    <label class="field"><span>${L('নাম', 'Name')}</span><input class="input" name="name" maxlength="40" value="${esc(v.name)}" placeholder="${L('যেমন: VAT ১৫%, সার্ভিস চার্জ', 'e.g. VAT, Service charge')}"></label>
    <label class="field"><span>${L('টাকা', 'Amount')}</span>${moneyInput('amt', hgTaka(v.amt), '0')}</label>
    <div class="field"><span class="flabel">${L('কীভাবে ভাগ হবে?', 'How is it split?')}</span>${seg('method', [['proportional', L('আনুপাতিক (ডিসকাউন্টের পরের দামে)', 'Proportional (after discount)')], ['equal', L('সমান', 'Equal')], ['custom', L('কাস্টম', 'Custom')]], v.method)}</div>
    <div class="field hidden" data-grp="custom"><span class="flabel">${L('কার কত (যোগফল = টাকা)', 'Who pays how much (must equal the amount)')}</span>
      ${people.map(p => `<label class="hg-vrow"><span>${esc(p.name)}</span>${moneyInput('cv_' + p.id, hgTaka((v.values || {})[p.id]), '0')}</label>`).join('')}</div>
    <div class="field"><span class="flabel">${L('কোন আইটেমে প্রযোজ্য?', 'Applies to')}</span>${seg('scope', [['all', L('সব আইটেম', 'All items')], ['items', L('বাছাই করা', 'Selected items')]], scoped ? 'items' : 'all')}
      <div class="hidden" data-grp="items">${d.items.map(it => hgCheckRow('sc_' + it.id, esc(it.name), !scoped || v.scope.includes(it.id))).join('')}</div></div>
    <div class="preview" data-chsum></div>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button>
    <button type="button" class="btn block mt8" data-action="hg-bill-back">${L('বিলে ফিরুন', 'Back to bill')}</button></form>`;
}
LIVE['hg-charge'] = f => {
  $('[data-grp="custom"]', f).classList.toggle('hidden', f.elements.method.value !== 'custom');
  $('[data-grp="items"]', f).classList.toggle('hidden', f.elements.scope.value !== 'items');
  const ev = hgCur(); if (f.elements.method.value !== 'custom') { $('[data-chsum]', f).innerHTML = ''; return; }
  const amt = toMinor(f.elements.amt.value), s = sum(ev.participants.map(p => (f.elements['cv_' + p.id] ? toMinor(f.elements['cv_' + p.id].value) : 0)));
  const pv = $('[data-chsum]', f); pv.className = 'preview' + (s === amt ? '' : ' warn');
  pv.innerHTML = s === amt ? `✓ ${hgM(s)}` : L(`যোগফল ${hgM(s)}, লাগবে ${hgM(amt)}`, `Adds up to ${hgM(s)}, needs ${hgM(amt)}`);
};

/* ---------- লেনদেন ও রিফান্ড ---------- */
function hgTransferForm(kind, t, pre) {
  const ev = hgCur();
  const ids = t ? [t.from, t.to] : [];
  const people = hgPeopleOpts(ev, ids);
  const v = t || Object.assign({ kind, from: (people[1] || people[0] || [])[0], to: (people[0] || [])[0], amt: 0, date: today(), note: '', purpose: '' }, pre || {});
  const k = v.kind || kind;
  return `${sheetHead(`${HG_TKIND[k][2]} ${HG_TKIND[k][isEN() ? 1 : 0]}`, esc(ev.name))}
  <form data-form="hg-transfer" data-id="${t ? t.id : ''}" data-kind="${k}" autocomplete="off">
    <div class="row2"><label class="field"><span>${k === 'settlement' ? L('কে দিয়েছে', 'Paid by') : L('কে দিয়েছে', 'From')}</span>${hgSelect('from', people, v.from)}</label>
      <label class="field"><span>${L('কে পেয়েছে', 'Received by')}</span>${hgSelect('to', people, v.to)}</label></div>
    <label class="field"><span>${L('টাকা', 'Amount')}</span>${moneyInput('amt', hgTaka(v.amt), '0')}</label>
    <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(v.date)}"></label>
    ${k !== 'settlement' ? `<label class="field"><span>${L('কী উদ্দেশ্যে', 'Purpose')}</span><input class="input" name="purpose" maxlength="60" value="${esc(v.purpose || '')}" placeholder="${k === 'advance' ? L('যেমন: হোটেল বুকিং', 'e.g. hotel booking') : L('যেমন: অতিরিক্ত খরচের জন্য', 'e.g. towards extra costs')}"></label>` : ''}
    <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="120" value="${esc(v.note || '')}"></label>
    <div class="hint">${k === 'settlement' ? L('এটা কারও পাওনা মেটানোর টাকা। খরচ হিসেবে গণ্য হবে না।', 'This settles what someone owes. It is not an expense.') : L('এটা খরচ নয়। যে নিল তার কাছে এই টাকা জমা আছে ধরা হয়, ফলে মোট খরচ দ্বিগুণ হয় না।', 'This is not an expense. The receiver holds the money, so the total expense is not counted twice.')}</div>
    <button class="btn primary block" type="submit">${t ? L('সেভ করুন', 'Save') : L('যোগ করুন', 'Add')}</button></form>`;
}
function hgRefundForm(r) {
  const ev = hgCur();
  const exps = ev.expenses.filter(e => !e.del);
  if (!exps.length) return `${sheetHead(L('রিফান্ড', 'Refund'))}<p class="hint">${L('আগে একটা খরচ যোগ করুন।', 'Add an expense first.')}</p>`;
  const v = r || { expenseId: exps[0].id, amt: 0, by: (ev.participants.find(p => p.org) || ev.participants[0] || {}).id, date: today(), note: '' };
  return `${sheetHead(L('রিফান্ড', 'Refund'), L('দোকান/হোটেল থেকে টাকা ফেরত এলে', 'Money returned by a shop or hotel'))}
  <form data-form="hg-refund" data-id="${r ? r.id : ''}" autocomplete="off">
    <label class="field"><span>${L('কোন খরচের', 'Which expense')}</span>${hgSelect('expenseId', exps.map(e => [e.id, `${esc(e.title)} · ${hgM(e.total)}`]), v.expenseId)}</label>
    <label class="field"><span>${L('ফেরত আসা টাকা', 'Refunded amount')}</span>${moneyInput('amt', hgTaka(v.amt), '0')}</label>
    <label class="field"><span>${L('কে টাকা পেয়েছে', 'Who received it')}</span>${hgSelect('by', hgPeopleOpts(ev, [v.by]), v.by)}</label>
    <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(v.date)}"></label>
    <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="120" value="${esc(v.note || '')}"></label>
    <div class="hint">${L('শুধু ফেরত পাওয়া অংশ খরচ কমায় এবং সবার অংশ আনুপাতিক হারে কমে। এটা আয় নয়।', 'Only the refunded part lowers the expense, and everyone\'s share drops proportionally. It is not income.')}</div>
    <button class="btn primary block" type="submit">${r ? L('সেভ করুন', 'Save') : L('যোগ করুন', 'Add')}</button></form>`;
}
Object.assign(FORMS, {
  'hg-transfer': f => {
    const ev = hgGuard(); if (!ev) return;
    const from = f.elements.from.value, to = f.elements.to.value, amt = toMinor(f.elements.amt.value), kind = f.dataset.kind;
    if (from === to) return fail(f, L('যে দিয়েছে আর যে পেয়েছে একজন হতে পারে না', 'The payer and the receiver cannot be the same person'), 'to');
    if (amt <= 0) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    const id = f.dataset.id, t = id && ev.transfers.find(x => x.id === id);
    const o = t || { id: uid(), createdAt: Date.now(), status: 'confirmed' };
    Object.assign(o, { kind, from, to, amt, date: f.elements.date.value || today(), note: f.elements.note.value.trim(), purpose: f.elements.purpose ? f.elements.purpose.value.trim() : '' });
    if (!t) ev.transfers.push(o);
    closeSheet(); hgCommit(ev, `${HG_TKIND[kind][0]}: ${pName(ev, from)} → ${pName(ev, to)} ${hgM(amt)}`, `${HG_TKIND[kind][1]}: ${pName(ev, from)} → ${pName(ev, to)} ${hgM(amt)}`);
  },
  'hg-refund': f => {
    const ev = hgGuard(); if (!ev) return;
    const eid = f.elements.expenseId.value, amt = toMinor(f.elements.amt.value);
    const ex = ev.expenses.find(e => e.id === eid && !e.del);
    if (!ex) return fail(f, L('খরচ পাওয়া যায়নি', 'Expense not found'));
    if (amt <= 0) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    const id = f.dataset.id;
    const other = sum(ev.refunds.filter(r => !r.del && r.expenseId === eid && r.id !== id).map(r => r.amt));
    if (amt + other > ex.total) return fail(f, L(`এই খরচে সর্বোচ্চ ${hgM(ex.total - other)} রিফান্ড দেওয়া যায়`, `At most ${hgM(ex.total - other)} can be refunded on this expense`), 'amt');
    const r0 = id && ev.refunds.find(x => x.id === id);
    const o = r0 || { id: uid(), createdAt: Date.now() };
    Object.assign(o, { expenseId: eid, amt, by: f.elements.by.value, date: f.elements.date.value || today(), note: f.elements.note.value.trim() });
    if (!r0) ev.refunds.push(o);
    closeSheet(); hgCommit(ev, `রিফান্ড: ${ex.title} ${hgM(amt)}`, `Refund: ${ex.title} ${hgM(amt)}`);
  },
  'hg-item': f => {
    if (!hgDraft) return;
    const ev = hgCur();
    const name = f.elements.name.value.trim(), type = f.elements.type.value;
    if (!name) return fail(f, L('খাবারের নাম লিখুন', 'Enter the dish name'), 'name');
    const unit = toMinor(f.elements.unit.value);
    if (unit <= 0) return fail(f, L('দাম লিখুন', 'Enter the price'), 'unit');
    const it = { id: f.dataset.id || uid(), name, unit, status: f.elements.status.value, qty: Math.max(1, Math.floor(hgNum(f.elements.qty.value)) || 1) };
    if (type === 'individual') { it.type = 'individual'; it.orderedBy = f.elements.orderedBy.value; }
    else if (type === 'shared') {
      it.type = 'shared'; it.sharers = ev.participants.filter(p => f.elements['sh_' + p.id] && f.elements['sh_' + p.id].checked).map(p => p.id);
      if (!it.sharers.length) return fail(f, L('কারা শেয়ার করছে বাছুন', 'Pick who shares it'));
      it.weights = {}; it.sharers.forEach(id => { const w = hgNum(f.elements['w_' + id].value); if (w > 0) it.weights[id] = w; });
    } else {
      it.type = 'shared'; it.multi = true; it.weights = {}; it.sharers = [];
      ev.participants.forEach(p => { const q = f.elements['q_' + p.id] ? Math.floor(hgNum(f.elements['q_' + p.id].value)) : 0; if (q > 0) { it.weights[p.id] = q; it.sharers.push(p.id); } });
      if (!it.sharers.length) return fail(f, L('কে কয়টা নিয়েছে লিখুন', 'Enter how many each person had'));
      it.qty = sum(Object.values(it.weights));
    }
    const i = hgDraft.items.findIndex(x => x.id === it.id);
    if (i >= 0) hgDraft.items[i] = it; else hgDraft.items.push(it);
    openSheet(hgBillSheet());
  },
  'hg-charge': f => {
    if (!hgDraft) return;
    const ev = hgCur();
    const name = f.elements.name.value.trim(), amt = toMinor(f.elements.amt.value), method = f.elements.method.value;
    if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    if (amt <= 0) return fail(f, L('টাকা লিখুন', 'Enter the amount'), 'amt');
    const c = { id: f.dataset.id || uid(), kind: f.elements.kind.value, name, amt, method, values: {}, scope: null };
    if (f.elements.scope.value === 'items') {
      c.scope = hgDraft.items.filter(it => f.elements['sc_' + it.id] && f.elements['sc_' + it.id].checked).map(it => it.id);
      if (!c.scope.length) return fail(f, L('অন্তত একটা আইটেম বাছুন', 'Pick at least one item'));
    }
    if (method === 'custom') {
      ev.participants.forEach(p => { if (f.elements['cv_' + p.id]) c.values[p.id] = toMinor(f.elements['cv_' + p.id].value); });
      if (sum(Object.values(c.values)) !== amt) return fail(f, L('কাস্টম ভাগের যোগফল টাকার সমান হতে হবে', 'Custom shares must add up to the amount'));
    }
    const i = hgDraft.charges.findIndex(x => x.id === c.id);
    if (i >= 0) hgDraft.charges[i] = c; else hgDraft.charges.push(c);
    openSheet(hgBillSheet());
  },
  'hg-bill': async f => {
    const ev = hgGuard(); if (!ev || !hgDraft) return;
    hgBillSync();
    const d = hgDraft;
    if (!d.title) return fail(f, L('রেস্টুরেন্ট বা বিলের নাম লিখুন', 'Enter the restaurant / bill title'), 'title');
    if (!d.items.some(i => i.status !== 'cancelled')) return fail(f, L('অন্তত একটা আইটেম যোগ করুন', 'Add at least one item'));
    const ids = ev.participants.map(p => p.id);
    const b = hgBill(hgDraftBill(), ids);
    if (!b.ok) return fail(f, hgErr(b.errors[0]));
    if (d.actual > 0 && d.actual !== b.total) return fail(f, L(`আসল বিল ${hgM(d.actual)} কিন্তু আইটেমের হিসাব ${hgM(b.total)}। পার্থক্য মেটান (অ্যাডজাস্টমেন্ট যোগ করুন বা আইটেম ঠিক করুন)।`, `Actual bill ${hgM(d.actual)} differs from the items ${hgM(b.total)}. Resolve it with an adjustment or fix the items.`));
    const total = d.actual > 0 ? d.actual : b.total;
    if (total <= 0) return fail(f, L('বিলের মোট শূন্য', 'The bill total is zero'));
    const payers = Object.entries(d.payers).map(([pid, amt]) => ({ pid, amt })).filter(x => x.amt > 0);
    const ps = sum(payers.map(p => p.amt));
    if (!payers.length) return fail(f, L('কে টাকা দিয়েছে তা দিন', 'Enter who paid'));
    if (ps !== total) return fail(f, L(`কে কত দিয়েছে তার যোগফল ${hgM(ps)}, বিল ${hgM(total)}। সমান হতে হবে।`, `Payments add up to ${hgM(ps)} but the bill is ${hgM(total)}. They must match.`));
    const x = d.id ? ev.expenses.find(e => e.id === d.id) : { id: uid(), createdAt: Date.now() };
    if (!x) return;
    const before = d.id ? `${x.title} ${hgM(x.total)}` : '';
    Object.assign(x, { title: d.title, category: d.category, date: d.date, desc: d.desc, total, payers, mode: 'bill', method: 'bill', spec: {}, bill: { items: d.items, charges: d.charges }, billActual: d.actual || 0, alloc: b.perPerson, updatedAt: Date.now(), receipt: x.receipt || d.receipt || null });
    if (!d.id) ev.expenses.push(x);
    const okImg = await hgSaveReceipt(x, f);
    hgDraft = null; closeSheet();
    hgLog(ev, d.id ? `বিল বদলানো হয়েছে: ${before} → ${x.title} ${hgM(total)}` : `রেস্টুরেন্ট বিল যোগ: ${x.title} ${hgM(total)}`, d.id ? `Bill edited: ${before} → ${x.title} ${hgM(total)}` : `Restaurant bill added: ${x.title} ${hgM(total)}`);
    commit(okImg ? SAVED() : L('বিল সেভ হয়েছে, কিন্তু রসিদের ছবি সেভ করা যায়নি', 'Bill saved, but the receipt photo could not be saved'));
    if (!okImg) toast(L('রসিদের ছবি সেভ হয়নি।', 'The receipt photo was not saved.'), 'danger');
  },
});

/* ---------- সিদ্ধান্ত ফর্ম ---------- */
function hgDecisionForm(pid, d) {
  const ev = hgCur(), c = hgEventCalc(ev);
  const pre = c.pre[pid];
  const v = d || { pid, side: pre < 0 ? 'payable' : 'receivable', type: pre < 0 ? 'full_required' : 'reimb_full', amt: null, others: [], reason: '', orgNote: '', status: 'proposed', date: today() };
  const typeOpts = side => Object.keys(HG_DEC_LABELS[side]).map(k => [k, esc(HG_DEC_LABELS[side][k][isEN() ? 1 : 0])]);
  return `${sheetHead(d ? L('সিদ্ধান্ত এডিট', 'Edit decision') : L('নতুন সিদ্ধান্ত', 'New decision'), esc(pName(ev, pid)))}
  <form data-form="hg-decision" data-live="hg-decision" data-id="${d ? d.id : ''}" data-pid="${pid}" autocomplete="off">
    <div class="bsum"><b>${L('এখন', 'Now')}: ${pre < 0 ? L('দিতে হবে ', 'Owes ') : pre > 0 ? L('পাবে ', 'Gets ') : ''}${hgM(Math.abs(pre))}</b><span>${L('মূল হিসাব (সমঝোতার আগে)', 'Before any agreement')}</span></div>
    <div class="field"><span class="flabel">${L('কী নিয়ে সিদ্ধান্ত?', 'What is it about?')}</span>${seg('side', [['payable', L('তার টাকা বাকি (দেনা)', 'He/she owes')], ['receivable', L('সে বেশি দিয়েছে (পাওনা)', 'Is owed money')]], v.side)}</div>
    <label class="field"><span>${L('সিদ্ধান্ত', 'Decision')}</span><select class="input" name="type">${typeOpts(v.side).map(([k, l]) => `<option value="${k}" ${k === v.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field" data-grp="amt"><span>${L('টাকার পরিমাণ (ফাঁকা = পুরোটা)', 'Amount (blank = the full amount)')}</span>${moneyInput('amt', hgTaka(v.amt), L('পুরোটা', 'full'))}</label>
    <div class="field" data-grp="others"><span class="flabel">${L('কারা জড়িত (দায় নেবে / ভাগ করবে / মাফ করবে)', 'Who is involved (covers / shares / waives)')}</span>
      ${hgPickable(ev, v.others || []).filter(p => p.id !== pid).map(p => hgCheckRow('ot_' + p.id, esc(p.name), (v.others || []).includes(p.id))).join('')}</div>
    <label class="field"><span>${L('কারণ / মন্তব্য', 'Reason / comment')}</span><input class="input" name="reason" maxlength="200" value="${esc(v.reason || '')}"></label>
    <label class="field"><span>${L('অর্গানাইজারের নোট', 'Organizer note')}</span><input class="input" name="orgNote" maxlength="200" value="${esc(v.orgNote || '')}"></label>
    <div class="row2"><label class="field"><span>${L('অবস্থা', 'Status')}</span>${hgSelect('status', Object.keys(HG_DSTATUS).map(k => [k, HG_DSTATUS[k][isEN() ? 1 : 0]]), v.status)}</label>
      <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(v.date || today())}"></label></div>
    <div class="preview" data-decnote></div>
    <button class="btn primary block" type="submit">${d ? L('সেভ করুন', 'Save') : L('যোগ করুন', 'Add')}</button></form>`;
}
LIVE['hg-decision'] = (f, t) => {
  const side = f.elements.side.value;
  const sel = f.elements.type;
  if (t && t.name === 'side') { sel.innerHTML = Object.keys(HG_DEC_LABELS[side]).map(k => `<option value="${k}">${esc(HG_DEC_LABELS[side][k][isEN() ? 1 : 0])}</option>`).join(''); }
  const eff = hgDecisionEffect({ side, type: sel.value });
  const spec = (HG_DECISION_TYPES[side] || {})[sel.value] || {};
  const needAmt = eff !== 'none' && !spec.full || ['partial_agreement', 'reimb_partial'].includes(sel.value);
  $('[data-grp="amt"]', f).classList.toggle('hidden', !(eff !== 'none' || ['partial_agreement', 'reimb_partial'].includes(sel.value)) || (spec.full && sel.value !== 'custom'));
  $('[data-grp="others"]', f).classList.toggle('hidden', !['cover', 'share', 'waive_all', 'waive_partial', 'waive_full', 'gift', 'custom'].includes(sel.value));
  const notes = {
    none: L('এই সিদ্ধান্ত শুধু রেকর্ড। চূড়ান্ত করলেও কারও টাকা বদলাবে না।', 'This is a record only. Even when finalized no balance changes.'),
    waive_due: L('চূড়ান্ত হলে ওই ব্যক্তির দেনা কমবে আর পাওনাদারদের পাওনা সমানুপাতে কমবে। এটা পরিশোধ নয়, মওকুফ।', 'Once finalized, his/her due drops and creditors\' receivables drop proportionally. This is a waiver, not a payment.'),
    waive_recv: L('চূড়ান্ত হলে তার পাওনা কমবে আর দেনাদারদের দেনা সমানুপাতে কমবে। মূল খরচ মুছবে না।', 'Once finalized, his/her receivable drops and debtors\' dues drop proportionally. The original expenses stay.'),
    cover: L('চূড়ান্ত হলে বাছাই করা ব্যক্তিরা ওই টাকার দায় নেবে।', 'Once finalized, the selected people take over that amount.'),
    share: L('চূড়ান্ত হলে বাড়তি টাকা বাছাই করা ব্যক্তিদের মধ্যে ভাগ হবে।', 'Once finalized, the extra amount is shared among the selected people.'),
  };
  $('[data-decnote]', f).innerHTML = notes[eff] || '';
};
Object.assign(FORMS, {
  'hg-decision': f => {
    const ev = hgGuard(); if (!ev) return;
    const side = f.elements.side.value, type = f.elements.type.value, status = f.elements.status.value;
    const eff = hgDecisionEffect({ side, type });
    const spec = HG_DECISION_TYPES[side][type] || {};
    const amtRaw = String(f.elements.amt.value).trim();
    const amt = amtRaw === '' ? null : toMinor(amtRaw);
    const others = ev.participants.filter(p => f.elements['ot_' + p.id] && f.elements['ot_' + p.id].checked).map(p => p.id);
    if (amt != null && amt <= 0) return fail(f, L('টাকার পরিমাণ শূন্যের বেশি হতে হবে', 'The amount must be more than zero'), 'amt');
    if (['waive_partial', 'share'].includes(type) && amt == null) return fail(f, L('কত টাকা মওকুফ/ভাগ হবে তা লিখুন', 'Enter how much is waived / shared'), 'amt');
    if (['cover', 'share'].includes(eff) && !others.length) return fail(f, L('কারা দায় নেবে বা ভাগ করবে বাছুন', 'Pick who covers or shares'));
    const id = f.dataset.id, o0 = id && ev.decisions.find(x => x.id === id);
    const o = o0 || { id: uid(), createdAt: Date.now(), opinions: {} };
    const wasFinal = o.status === 'finalized';
    Object.assign(o, { pid: f.dataset.pid, side, type, amt: spec.full && type !== 'custom' ? null : amt, others, reason: f.elements.reason.value.trim(), orgNote: f.elements.orgNote.value.trim(), status, date: f.elements.date.value || today() });
    if (status === 'finalized' && !wasFinal) o.finalizedAt = Date.now();
    if (status !== 'finalized') o.finalizedAt = null;
    if (!o0) ev.decisions.push(o);
    closeSheet(); hgCommit(ev, `সিদ্ধান্ত ${o0 ? 'বদলানো' : 'যোগ'}: ${pName(ev, o.pid)} - ${hgDecLabel(side, type)} (${HG_DSTATUS[status][0]})`, `Decision ${o0 ? 'edited' : 'added'}: ${pName(ev, o.pid)} - ${hgDecLabel(side, type)} (${HG_DSTATUS[status][1]})`);
  },
  'hg-opinions': f => {
    const ev = hgGuard(); if (!ev) return;
    const d = ev.decisions.find(x => x.id === f.dataset.id); if (!d) return;
    d.opinions = {};
    ev.participants.filter(p => p.id !== d.pid).forEach(p => { d.opinions[p.id] = { s: f.elements['op_' + p.id].value, note: f.elements['on_' + p.id].value.trim() }; });
    if (['proposed'].includes(d.status) && Object.values(d.opinions).some(x => x.s !== 'not_asked')) d.status = 'awaiting';
    closeSheet(); hgCommit(ev, `মতামত রেকর্ড: ${pName(ev, d.pid)}`, `Opinions recorded: ${pName(ev, d.pid)}`);
  },
});
function hgOpinionSheet(d) {
  const ev = hgCur();
  return `${sheetHead(L('মতামত', 'Opinions'), `${esc(pName(ev, d.pid))}: ${esc(hgDecLabel(d.side, d.type))}`)}
  <form data-form="hg-opinions" data-id="${d.id}" autocomplete="off">
    <p class="hint">${L('বন্ধুদের কাছ থেকে যা শুনেছেন তা এখানে লিখে রাখুন। শুধু মতামত লিখলে হিসাব বদলায় না।', 'Record what each friend told you. Opinions alone never change the numbers.')}</p>
    ${ev.participants.filter(p => p.id !== d.pid).map(p => { const o = (d.opinions || {})[p.id] || { s: 'not_asked', note: '' }; return `<div class="field"><span class="flabel">${esc(p.name)}</span>
      ${hgSelect('op_' + p.id, Object.keys(HG_OPINION).map(k => [k, HG_OPINION[k][isEN() ? 1 : 0]]), o.s)}<input class="input mt8" name="on_${p.id}" maxlength="120" placeholder="${L('মন্তব্য', 'Comment')}" value="${esc(o.note || '')}"></div>`; }).join('')}
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}

/* ---------- সব অ্যাকশন ---------- */
const hgIdEl = (arr, id) => arr.find(x => x.id === id);
function hgSoftDelete(ev, list, id, bn, en) {
  const x = hgIdEl(list, id); if (!x) return;
  if (!confirm(L(`"${bn}" মুছবেন? এটা "সম্প্রতি মোছা"-তে যাবে, ফেরত আনা যাবে।`, `Delete "${en}"? It goes to "Recently deleted" and can be restored.`))) return;
  if (sheetOpen) closeSheet();
  undoable(DELETED(), () => { x.del = Date.now(); hgLog(ev, `মোছা হয়েছে: ${bn}`, `Deleted: ${en}`); });
}
Object.assign(ACTIONS, {
  'hg-home': () => { hgRoute = { ev: null, sub: 'overview' }; if (sheetOpen) closeSheet(); if (tab !== 'events') setTab('events'); else render(); window.scrollTo(0, 0); },
  'hg-open': el => { hgRoute = { ev: el.dataset.id, sub: 'overview' }; render(); window.scrollTo(0, 0); },
  'hg-sub': el => { hgRoute.sub = el.dataset.v; render(); window.scrollTo(0, 0); },
  'hg-filter-status': el => { hgF.status = el.dataset.v; render(); },
  'hg-exp-cat': el => { hgExpCat = el.dataset.v; render(); },
  'hg-new-event': () => openSheet(hgEventForm(null)),
  'hg-event-menu': () => {
    const ev = hgCur(); if (!ev) return;
    openSheet(`${sheetHead(esc(ev.name), hgStatusLabel(ev.status))}<div class="menu">
      ${ev.status !== 'archived' ? menuItem('hg-edit-event', 'edit', L('ইভেন্ট এডিট', 'Edit event'), L('নাম, তারিখ, জায়গা, খাত', 'Name, dates, place, categories')) : ''}
      ${ev.status === 'settled' ? menuItem('hg-reopen', 'undo', L('আবার খুলুন', 'Reopen'), L('হিসাব সংশোধন বা নতুন বাকি এলে', 'To correct the books or when something is owed again')) : ''}
      ${ev.status === 'active' ? menuItem('hg-settle', 'check', L('মিটে গেছে হিসেবে বন্ধ করুন', 'Close as settled'), L('সবার হিসাব শূন্য হলে', 'When everyone is even')) : ''}
      ${ev.status !== 'archived' ? menuItem('hg-archive', 'archive', L('আর্কাইভ', 'Archive'), L('তালিকা থেকে সরে যাবে, ফেরানো যাবে', 'Hidden from the main list, restorable')) : menuItem('hg-restore', 'undo', L('রিস্টোর', 'Restore'), L('আবার সক্রিয় করুন', 'Make it active again'))}
      ${menuItem('hg-export', 'doc', L('রিপোর্ট ও শেয়ার', 'Report & share'), L('PDF মেমো, সামারি স্লিপ, টেক্সট', 'PDF memo, summary slip, text'))}</div>
      <button type="button" class="btn danger block mt12" data-action="hg-del-event">${icon('trash', 18)} ${L('ইভেন্ট ডিলিট', 'Delete event')}</button>`);
  },
  'hg-edit-event': () => { const ev = hgCur(); if (!ev) return; if (ev.status === 'archived') return hgLockMsg(ev); openSheet(hgEventForm(ev)); },
  'hg-settle': () => {
    const ev = hgCur(); if (!ev) return;
    if (ev.status !== 'active') return hgLockMsg(ev);
    const c = hgEventCalc(ev);
    if (!ev.participants.length || !c.gross) return toast(L('কোনো খরচ নেই, মিটানোর কিছু নেই', 'There is nothing to settle yet'), 'danger');
    if (c.issues.length) { if (sheetOpen) closeSheet(); hgRoute.sub = 'overview'; render(); return toast(L('আগে হিসাবের সমস্যাগুলো ঠিক করুন', 'Fix the issues in the books first'), 'danger'); }
    if (ev.participants.some(p => c.final[p.id] !== 0)) { if (sheetOpen) closeSheet(); return toast(L('এখনও কারও টাকা বাকি আছে, পুরো মিটলে তবেই বন্ধ করা যায়', 'Someone still owes or is owed money. Close only when everyone is even.'), 'danger'); }
    const open = ev.decisions.filter(d => !d.del && ['proposed', 'awaiting', 'disputed', 'agreed'].includes(d.status)).length;
    if (open && !confirm(L(`${open}টা সিদ্ধান্ত চূড়ান্ত হয়নি। তবুও বন্ধ করবেন?`, `${open} decision(s) are not finalized. Close anyway?`))) return;
    if (sheetOpen) closeSheet();
    ev.status = 'settled'; ev.settledAt = Date.now(); hgCommit(ev, 'ইভেন্ট মিটে গেছে হিসেবে বন্ধ', 'Event closed as settled', L('ইভেন্টের হিসাব মিটে গেছে', 'Event settled'));
  },
  'hg-reopen': () => { const ev = hgCur(); if (!ev || ev.status !== 'settled') return; if (!confirm(L('ইভেন্ট আবার খুলবেন? তখন সব কিছু বদলানো যাবে।', 'Reopen this event? Everything becomes editable again.'))) return; if (sheetOpen) closeSheet(); ev.status = 'active'; hgCommit(ev, 'ইভেন্ট আবার খোলা হয়েছে', 'Event reopened', L('ইভেন্ট খোলা হয়েছে', 'Event reopened')); },
  'hg-archive': () => { const ev = hgCur(); if (!ev) return; if (sheetOpen) closeSheet(); ev.prev = ev.status; ev.status = 'archived'; hgCommit(ev, 'আর্কাইভ করা হয়েছে', 'Archived', L('আর্কাইভে গেছে', 'Archived')); },
  'hg-restore': () => { const ev = hgCur(); if (!ev || ev.status !== 'archived') return; if (sheetOpen) closeSheet(); ev.status = ev.prev && ev.prev !== 'archived' ? ev.prev : 'active'; hgCommit(ev, 'আর্কাইভ থেকে ফেরানো হয়েছে', 'Restored from archive', L('রিস্টোর হয়েছে', 'Restored')); },
  'hg-del-event': () => {
    const ev = hgCur(); if (!ev) return;
    if (!confirm(L(`"${ev.name}" ইভেন্ট ডিলিট করবেন? এর সব খরচ, লেনদেন আর সিদ্ধান্ত এর সাথে যাবে। "আরও" ট্যাবের "সম্প্রতি মোছা" থেকে ফেরানো যাবে।`, `Delete "${ev.name}"? All its expenses, payments and decisions go with it. You can restore it from "Recently deleted" in More.`))) return;
    if (sheetOpen) closeSheet();
    undoable(DELETED(), () => { ev.del = Date.now(); hgRoute = { ev: null, sub: 'overview' }; });
  },
  'hg-add-person': () => { const ev = hgGuard(); if (ev) openSheet(hgPersonForm(ev, null)); },
  'hg-edit-person': el => { const ev = hgGuard(); if (ev) openSheet(hgPersonForm(ev, hgIdEl(ev.participants, el.dataset.id))); },
  'hg-pick-friend': el => {
    const fr = hg().friends.find(x => x.id === el.dataset.id), f = el.closest('form'); if (!fr || !f) return;
    f.elements.name.value = fr.name; f.elements.phone.value = fr.phone || ''; f.elements.friendId.value = fr.id;
  },
  'hg-toggle-person': el => { const ev = hgGuard(); if (!ev) return; const p = hgIdEl(ev.participants, el.dataset.id); if (!p) return; p.active = !p.active; hgCommit(ev, `${p.name}: ${p.active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}`, `${p.name}: ${p.active ? 'activated' : 'deactivated'}`); },
  'hg-del-person': el => {
    const ev = hgGuard(); if (!ev) return; const p = hgIdEl(ev.participants, el.dataset.id); if (!p) return;
    if (hgPidUsed(ev, p.id)) return toast(L('এর সাথে হিসাব জড়িত, তাই মোছা যাবে না। নিষ্ক্রিয় করুন।', 'Their data is tied to the books, so they cannot be deleted. Deactivate instead.'), 'danger');
    if (!confirm(L(`${p.name}-কে এই ইভেন্ট থেকে সরাবেন?`, `Remove ${p.name} from this event?`))) return;
    undoable(DELETED(), () => { ev.participants = ev.participants.filter(x => x.id !== p.id); hgLog(ev, `বন্ধু সরানো: ${p.name}`, `Person removed: ${p.name}`); });
  },
  'hg-add-expense': () => { const ev = hgGuard(); if (!ev) return; if (!hgActive(ev).length) { toast(L('আগে বন্ধুদের যোগ করুন', 'Add the people first')); hgRoute.sub = 'people'; if (sheetOpen) closeSheet(); return render(); } openSheet(hgExpenseForm(null)); },
  'hg-edit-expense': el => { const ev = hgCur(); if (!ev) return; const e = hgIdEl(ev.expenses, el.dataset.id); if (!e) return; if (hgLocked(ev)) return hgLockMsg(ev); if (e.mode === 'bill') hgBillOpen(e); else openSheet(hgExpenseForm(e)); },
  'hg-del-expense': el => { const ev = hgGuard(); if (!ev) return; const e = hgIdEl(ev.expenses, el.dataset.id); if (e) hgSoftDelete(ev, ev.expenses, e.id, e.title, e.title); },
  'hg-pay-all': el => {
    const f = el.closest('form'), ev = hgCur(); const total = f.elements.total.value; const who = f.elements.payAll.value;
    ev.participants.forEach(p => { const i = f.elements['pay_' + p.id]; if (i) i.value = p.id === who ? total : ''; });
    runLive(f, null);
  },
  'hg-add-bill': () => { const ev = hgGuard(); if (!ev) return; if (!hgActive(ev).length) { toast(L('আগে বন্ধুদের যোগ করুন', 'Add the people first')); hgRoute.sub = 'people'; if (sheetOpen) closeSheet(); return render(); } hgBillOpen(null); },
  'hg-item-add': () => { hgBillSync(); openSheet(hgItemForm(null)); },
  'hg-item-edit': el => { hgBillSync(); openSheet(hgItemForm(hgIdEl(hgDraft.items, el.dataset.id))); },
  'hg-item-del': el => { hgBillSync(); hgDraft.items = hgDraft.items.filter(x => x.id !== el.dataset.id); hgDraft.charges.forEach(c => { if (c.scope) c.scope = c.scope.filter(id => id !== el.dataset.id); }); openSheet(hgBillSheet()); },
  'hg-charge-add': el => { hgBillSync(); openSheet(hgChargeForm(null, el.dataset.kind)); },
  'hg-charge-edit': el => { hgBillSync(); openSheet(hgChargeForm(hgIdEl(hgDraft.charges, el.dataset.id))); },
  'hg-charge-del': el => { hgBillSync(); hgDraft.charges = hgDraft.charges.filter(x => x.id !== el.dataset.id); openSheet(hgBillSheet()); },
  'hg-bill-back': () => openSheet(hgBillSheet()),
  'hg-bill-payall': el => {
    const f = el.closest('form'), ev = hgCur(); hgBillSync();
    const b = hgBill(hgDraftBill(), ev.participants.map(p => p.id)); const total = hgDraft.actual > 0 ? hgDraft.actual : b.total; const who = f.elements.payAll.value;
    ev.participants.forEach(p => { const i = f.elements['pay_' + p.id]; if (i) i.value = p.id === who ? fromMinor(total) : ''; });
    LIVE['hg-bill'](f);
  },
  'hg-bill-adjust': () => {
    hgBillSync(); const ev = hgCur();
    const b = hgBill(hgDraftBill(), ev.participants.map(p => p.id)); const diff = hgDraft.actual - b.total; if (!diff) return;
    openSheet(hgChargeForm({ id: '', kind: diff > 0 ? 'charge' : 'discount', name: L('অ্যাডজাস্টমেন্ট', 'Adjustment'), amt: Math.abs(diff), scope: null, method: 'proportional', values: {} }));
  },
  'hg-rcpt-pick': el => { const i = el.closest('form').querySelectorAll('[data-hg-rcpt-input]')[0]; if (i) i.click(); },
  'hg-rcpt-cam': el => { const i = el.closest('form').querySelectorAll('[data-hg-rcpt-input]')[1]; if (i) i.click(); },
  'hg-rcpt-remove': () => { hgPendingReceipt = null; hgRefreshReceipt(); },
  'hg-add-transfer': el => { const ev = hgGuard(); if (ev) openSheet(hgTransferForm(el.dataset.kind, null)); },
  'hg-edit-transfer': el => { const ev = hgGuard(); if (ev) openSheet(hgTransferForm(null, hgIdEl(ev.transfers, el.dataset.id))); },
  'hg-del-transfer': el => { const ev = hgGuard(); if (!ev) return; const t = hgIdEl(ev.transfers, el.dataset.id); if (t) hgSoftDelete(ev, ev.transfers, t.id, `${pName(ev, t.from)} → ${pName(ev, t.to)} ${hgM(t.amt)}`, `${pName(ev, t.from)} → ${pName(ev, t.to)} ${hgM(t.amt)}`); },
  'hg-pay-sugg': el => {
    const ev = hgGuard(); if (!ev) return; const s = hgEventCalc(ev).suggestions[Number(el.dataset.i)]; if (!s) return;
    openSheet(hgTransferForm('settlement', null, { from: s.from, to: s.to, amt: s.amt }));
  },
  'hg-add-refund': () => { const ev = hgGuard(); if (ev) openSheet(hgRefundForm(null)); },
  'hg-edit-refund': el => { const ev = hgGuard(); if (ev) openSheet(hgRefundForm(hgIdEl(ev.refunds, el.dataset.id))); },
  'hg-del-refund': el => { const ev = hgGuard(); if (ev) hgSoftDelete(ev, ev.refunds, el.dataset.id, L('রিফান্ড', 'Refund'), 'Refund'); },
  'hg-new-decision': el => { const ev = hgGuard(); if (ev) openSheet(hgDecisionForm(el.dataset.id, null)); },
  'hg-edit-decision': el => { const ev = hgGuard(); if (!ev) return; const d = hgIdEl(ev.decisions, el.dataset.id); if (d) openSheet(hgDecisionForm(d.pid, d)); },
  'hg-opinions': el => { const ev = hgGuard(); if (!ev) return; const d = hgIdEl(ev.decisions, el.dataset.id); if (d) openSheet(hgOpinionSheet(d)); },
  'hg-dec-final': el => {
    const ev = hgGuard(); if (!ev) return; const d = hgIdEl(ev.decisions, el.dataset.id); if (!d) return;
    const eff = hgDecisionEffect(d), spec = HG_DECISION_TYPES[d.side][d.type] || {};
    if (['waive_due', 'waive_recv'].includes(eff) && d.amt == null && !spec.full) return toast(L('আগে টাকার পরিমাণ লিখুন (এডিট করে)', 'Enter the amount first (edit the decision)'), 'danger');
    if (['cover', 'share'].includes(eff) && !(d.others || []).length) return toast(L('কারা দায় নেবে তা বাছুন (এডিট করে)', 'Pick who is involved (edit the decision)'), 'danger');
    const ops = Object.values(d.opinions || {});
    if (ops.some(o => o.s === 'disagreed' || o.s === 'no_response') && !confirm(L('কেউ অসম্মত বা উত্তর দেয়নি। তবুও চূড়ান্ত করবেন?', 'Someone disagreed or has not answered. Finalize anyway?'))) return;
    d.status = 'finalized'; d.finalizedAt = Date.now();
    const ap = hgEventCalc(ev).applied.find(x => x.id === d.id);
    hgCommit(ev, `সিদ্ধান্ত চূড়ান্ত: ${pName(ev, d.pid)} - ${hgDecLabel(d.side, d.type)}${ap && ap.amt ? ' (' + hgM(ap.amt) + ')' : ''}`, `Decision finalized: ${pName(ev, d.pid)} - ${hgDecLabel(d.side, d.type)}${ap && ap.amt ? ' (' + hgM(ap.amt) + ')' : ''}`, L('সিদ্ধান্ত চূড়ান্ত হয়েছে', 'Decision finalized'));
  },
  'hg-dec-cancel': el => { const ev = hgGuard(); if (!ev) return; const d = hgIdEl(ev.decisions, el.dataset.id); if (!d) return; if (!confirm(L('সিদ্ধান্ত বাতিল করলে এর সমন্বয় ফিরে যাবে, ইতিহাস থাকবে।', 'Cancelling reverses its adjustment; the history stays.'))) return; d.status = 'cancelled'; d.finalizedAt = null; hgCommit(ev, `সিদ্ধান্ত বাতিল: ${pName(ev, d.pid)}`, `Decision cancelled: ${pName(ev, d.pid)}`); },
  'hg-del-decision': el => { const ev = hgGuard(); if (ev) hgSoftDelete(ev, ev.decisions, el.dataset.id, L('সিদ্ধান্ত', 'Decision'), 'Decision'); },
  'hg-restore-item': el => {
    const ev = hgGuard(); if (!ev) return;
    const list = { expense: ev.expenses, transfer: ev.transfers, refund: ev.refunds, decision: ev.decisions }[el.dataset.kind]; const x = list && hgIdEl(list, el.dataset.id); if (!x) return;
    delete x.del; hgCommit(ev, 'মোছা জিনিস ফেরানো হয়েছে', 'Deleted item restored', L('ফেরানো হয়েছে', 'Restored'));
  },
  'hg-purge-item': el => {
    const ev = hgGuard(); if (!ev) return;
    const key = { expense: 'expenses', transfer: 'transfers', refund: 'refunds', decision: 'decisions' }[el.dataset.kind]; const x = key && hgIdEl(ev[key], el.dataset.id); if (!x) return;
    if (!confirm(L('চিরতরে মুছে যাবে, আর ফেরানো যাবে না। রিফান্ড/রসিদও এর সাথে মুছবে। নিশ্চিত?', 'This deletes it forever, including its receipt photo. This cannot be undone. Sure?'))) return;
    if (key === 'expenses') {
      if (x.receipt) deleteImage('hgr:' + x.receipt).catch(() => {});
      ev.refunds = ev.refunds.filter(r => r.expenseId !== x.id);
    }
    ev[key] = ev[key].filter(y => y.id !== x.id);
    hgCommit(ev, 'চিরতরে মোছা হয়েছে', 'Permanently deleted', L('চিরতরে মোছা হয়েছে', 'Permanently deleted'));
  },
  'hg-add-friend': () => openSheet(hgFriendForm(null)),
  'hg-edit-friend': el => openSheet(hgFriendForm(hg().friends.find(x => x.id === el.dataset.id))),
  'hg-del-friend': el => { if (!confirm(L('সেভ করা তালিকা থেকে সরাবেন? পুরোনো ইভেন্টে নাম থাকবে।', 'Remove from saved friends? Past events keep the name.'))) return; if (sheetOpen) closeSheet(); undoable(DELETED(), () => { hg().friends = hg().friends.filter(x => x.id !== el.dataset.id); }); },
});
