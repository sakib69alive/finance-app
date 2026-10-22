'use strict';

/* =========================================================
   Hangout: সিদ্ধান্ত/ইতিহাস স্ক্রিন + সব ফর্ম ও অ্যাকশন
   ========================================================= */

const hgTaka = m => (m ? String(fromMinor(m)) : '');
const hgGuard = () => { const ev = hgCur(); if (!ev) return null; if (hgLocked(ev)) { hgLockMsg(ev); return null; } return ev; };
function hgCommit(ev, bn, en, msg) { hgLog(ev, bn, en); commit(msg || SAVED()); }
const hgCheckRow = (name, label, checked, extra = '') => `<label class="chk"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''} ${extra}><span>${label}</span></label>`;
const hgSelect = (name, opts, val) => `<select class="input" name="${name}">${opts.map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const hgPeopleOpts = (ev, ids) => hgPickable(ev, ids).map(p => [p.id, esc(p.name)]);

/* ---------- মতামত ও সমঝোতা ---------- */
function hgSecDecisions(ev, c) {
  const act = ev.status === 'active';
  const ds = ev.decisions.filter(d => !d.del).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const row = p => {
    const st = hgPersonStatus(ev, c, p.id);
    const orig = c.base[p.id];
    return `<div class="hgp"><div class="hgp-top"><span class="hgp-av">${esc((p.name || '?').charAt(0).toUpperCase())}</span>
      <div class="hgp-n"><b>${esc(p.name)}</b><small class="hgs ${HG_PSTATUS[st][2]}">${hgPStatusLabel(st)}</small></div>
      ${act && c.pre[p.id] !== 0 ? `<button type="button" class="btn sm" data-action="hg-new-decision" data-id="${p.id}">${L('সিদ্ধান্ত', 'Decide')}</button>` : ''}</div>
      <div class="ledger fb">
        <div><span>${L('মূল হিসাব (পাওনা / দেনা)', 'Original balance')}</span><span class="${hgSign(orig)}">${orig >= 0 ? '+' : '−'}${hgM(Math.abs(orig))}</span></div>
        <div><span>${L('ইতিমধ্যে পরিশোধ (নেট)', 'Already paid (net)')}</span><span>${hgM(c.out[p.id] - c.inn[p.id])}</span></div>
        <div><span>${L('সমঝোতার সমন্বয়', 'Agreed adjustment')}</span><span class="${hgSign(c.adj[p.id])}">${c.adj[p.id] >= 0 ? '+' : '−'}${hgM(Math.abs(c.adj[p.id]))}</span></div>
        <div><span>${L('মওকুফ (দেনা / পাওনা)', 'Waived (due / receivable)')}</span><span>${hgM(c.waivedFor[p.id])} / ${hgM(c.waivedBy[p.id])}</span></div>
        <div class="total"><span>${L('এখন বাকি', 'Final amount')}</span><span class="${hgSign(c.final[p.id])}">${c.final[p.id] > 0 ? L('পাবে ', 'Gets ') : c.final[p.id] < 0 ? L('দেবে ', 'Owes ') : ''}${hgM(Math.abs(c.final[p.id]))}</span></div></div></div>`;
  };
  const opSummary = d => {
    const others = ev.participants.filter(p => p.id !== d.pid);
    const cnt = k => others.filter(p => ((d.opinions || {})[p.id] || { s: 'not_asked' }).s === k).length;
    return ['agreed', 'disagreed', 'no_response', 'not_asked'].map(k => `${hgOpLabel(k)}: <b>${cnt(k)}</b>`).join(' · ');
  };
  const card = d => {
    const ap = c.applied.find(x => x.id === d.id);
    const eff = hgDecisionEffect(d);
    return `<section class="card hg-dec ${d.status}"><div class="card-head"><h2>${esc(pName(ev, d.pid))}</h2>${hgBadge('d-' + d.status, hgDStatusLabel(d.status))}</div>
      <p><b>${hgDecLabel(d.side, d.type)}</b>${d.amt != null ? ` · ${hgM(d.amt)}` : (eff !== 'none' ? ` · ${L('পুরোটা', 'full amount')}` : '')}</p>
      ${(d.others || []).length ? `<p class="hint">${L('সংশ্লিষ্ট', 'Involving')}: ${d.others.map(id => esc(pName(ev, id))).join(', ')}</p>` : ''}
      ${d.reason ? `<p class="hint">${esc(d.reason)}</p>` : ''}${d.orgNote ? `<p class="hint">${L('অর্গানাইজারের নোট', 'Organizer note')}: ${esc(d.orgNote)}</p>` : ''}
      <p class="hint">${opSummary(d)}</p>
      ${d.status === 'finalized' ? `<div class="bsum ok"><b>${ap && ap.amt ? L(`প্রয়োগ হয়েছে: ${hgM(ap.amt)}`, `Applied: ${hgM(ap.amt)}`) : L('শুধু রেকর্ড (হিসাব বদলায়নি)', 'Record only (no change to balances)')}</b></div>`
        : `<p class="hint">${L('এটা এখনও হিসাব বদলায়নি। চূড়ান্ত করলে তবেই প্রযোজ্য হবে।', 'This has not changed any balance yet. It applies only once finalized.')}</p>`}
      <small class="muted">${fmtDate(d.date || dateOf(d.createdAt))}</small>
      ${act ? `<div class="btn-row mt8"><button type="button" class="btn sm" data-action="hg-opinions" data-id="${d.id}">${L('মতামত', 'Opinions')}</button>
        <button type="button" class="btn sm" data-action="hg-edit-decision" data-id="${d.id}">${icon('edit', 16)}</button>
        ${['finalized', 'cancelled'].includes(d.status) ? '' : `<button type="button" class="btn sm primary" data-action="hg-dec-final" data-id="${d.id}">${L('চূড়ান্ত', 'Finalize')}</button>`}
        ${d.status === 'cancelled' ? '' : `<button type="button" class="btn sm" data-action="hg-dec-cancel" data-id="${d.id}">${L('বাতিল', 'Cancel')}</button>`}
        <button type="button" class="btn sm danger" data-action="hg-del-decision" data-id="${d.id}">${icon('trash', 16)}</button></div>` : ''}</section>`;
  };
  return `${hgIssuesHtml(ev, c)}
    <div class="bsum"><b>${L('নিয়ম', 'How this works')}</b><span>${L('মতামত লিখলেই হিসাব বদলায় না। অর্গানাইজার সমঝোতা নিশ্চিত করে "চূড়ান্ত" করলে তবেই প্রযোজ্য। মওকুফ কখনো পরিশোধ বা নতুন খরচ নয়, মূল খরচের ইতিহাস অক্ষত থাকে।', 'Writing an opinion changes nothing. Only a Finalized decision applies. A waiver is never a payment or a new expense, and the original expenses stay intact.')}</span></div>
    <div class="section-title">${L('ব্যক্তি অনুযায়ী হিসাব', 'Per-person balance')}</div>
    ${ev.participants.map(row).join('') || empty('🤝', L('কেউ নেই', 'No one'), '')}
    <div class="section-title">${L('সিদ্ধান্তসমূহ', 'Decisions')} · ${ds.length}</div>
    ${ds.length ? ds.map(card).join('') : `<p class="hint">${L('এখনও কোনো সিদ্ধান্ত নেই। কারও টাকা বাকি থাকলে বা কেউ বেশি দিলে "সিদ্ধান্ত" চাপুন।', 'No decisions yet. Tap "Decide" on a person with an open balance.')}</p>`}`;
}

/* ---------- ইতিহাস ও Recently deleted ---------- */
function hgTrashItems(ev) {
  const out = [];
  ev.expenses.filter(x => x.del).forEach(x => out.push({ kind: 'expense', id: x.id, t: x.title, a: x.total, del: x.del }));
  ev.transfers.filter(x => x.del).forEach(x => out.push({ kind: 'transfer', id: x.id, t: `${pName(ev, x.from)} → ${pName(ev, x.to)}`, a: x.amt, del: x.del }));
  ev.refunds.filter(x => x.del).forEach(x => out.push({ kind: 'refund', id: x.id, t: L('রিফান্ড', 'Refund'), a: x.amt, del: x.del }));
  ev.decisions.filter(x => x.del).forEach(x => out.push({ kind: 'decision', id: x.id, t: `${pName(ev, x.pid)}: ${hgDecLabel(x.side, x.type)}`, a: x.amt || 0, del: x.del }));
  return out.sort((a, b) => b.del - a.del);
}
function hgSecHistory(ev) {
  const trash = hgTrashItems(ev);
  return `<div class="section-title">${L('সম্প্রতি মোছা', 'Recently deleted')} · ${trash.length}</div>
    ${trash.length ? `<div class="list">${trash.map(x => `<div class="lrow"><span class="lic">🗑️</span><span class="lmain"><b>${esc(x.t)}</b><small>${hgM(x.a)} · ${hgFmtTime(x.del)}</small></span>
      ${hgLocked(ev) ? '' : `<button type="button" class="btn sm" data-action="hg-restore-item" data-kind="${x.kind}" data-id="${x.id}">${L('ফেরত', 'Restore')}</button>
      <button type="button" class="btn sm danger" data-action="hg-purge-item" data-kind="${x.kind}" data-id="${x.id}">${icon('trash', 16)}</button>`}</div>`).join('')}</div>` : `<p class="hint">${L('কিছু মোছা হয়নি।', 'Nothing deleted.')}</p>`}
    <div class="section-title">${L('পরিবর্তনের ইতিহাস', 'Change history')} · ${ev.history.length}</div>
    ${ev.history.length ? `<div class="list">${[...ev.history].reverse().slice(0, 150).map(h => `<div class="lrow"><span class="lic">🕘</span><span class="lmain"><b>${esc(hgLogT(h))}</b><small>${hgFmtTime(h.at)}</small></span></div>`).join('')}</div>` : `<p class="hint">${L('এখনও কিছু নেই।', 'Nothing yet.')}</p>`}`;
}

/* ---------- ইভেন্ট ফর্ম ---------- */
function hgEventForm(ev, inline) {
  const v = ev || { name: '', type: 'hangout', start: today(), end: '', location: '', notes: '' };
  const cats = ev ? ev.cats : hgCatsFor(v.type);
  const head = inline ? `<h3 class="inline-h">${L('প্রথম ইভেন্ট খুলুন', 'Start your first event')}</h3>` : sheetHead(ev ? L('ইভেন্ট এডিট', 'Edit event') : L('নতুন ইভেন্ট', 'New event'), ev ? '' : L('শুধু নাম আর বন্ধুদের নাম হলেই শুরু করা যায়', 'A name and your friends are enough to start'));
  return `${head}
  <form data-form="hg-event" data-live="hg-event" data-id="${ev ? ev.id : ''}" autocomplete="off">
    <label class="field"><span>${L('ইভেন্টের নাম', 'Event name')}</span><input class="input" name="name" maxlength="60" value="${esc(v.name)}" placeholder="${L('যেমন: কক্সবাজার ট্রিপ', "e.g. Cox's Bazar trip")}"></label>
    ${ev ? '' : `<label class="field"><span>${L('কারা কারা ছিল? (প্রতি লাইনে একজন, আপনিও)', 'Who was there? (one name per line, include yourself)')}</span><textarea class="input hg-ta" name="people" rows="3" placeholder="${L('সাকিব\nরাফি\nমিম', 'Sakib\nRafi\nMim')}"></textarea></label>
      ${hg().friends.length ? `<div class="field"><span class="flabel">${L('অথবা সেভ করা বন্ধুদের থেকে বাছুন', 'Or pick from saved friends')}</span><div class="chips">${hg().friends.map(f => `<label class="chip"><input type="checkbox" name="fr_${f.id}"><span>${esc(f.name)}</span></label>`).join('')}</div></div>` : ''}`}
    <label class="field"><span>${L('কী ধরনের ইভেন্ট?', 'What kind of event?')}</span>${hgSelect('type', Object.keys(HG_TYPES).map(k => [k, `${HG_TYPES[k].icon} ${hgTypeLabel(k)}`]), v.type)}</label>
    <details class="more" ${ev ? 'open' : ''}><summary>${L('আরও তথ্য (তারিখ, জায়গা, খাত) — ঐচ্ছিক', 'More details (dates, place, categories) — optional')}</summary>
      <div class="row2"><label class="field"><span>${L('শুরু', 'Start')}</span><input class="input" type="date" name="start" value="${esc(v.start || '')}"></label>
        <label class="field"><span>${L('শেষ', 'End')}</span><input class="input" type="date" name="end" value="${esc(v.end || '')}"></label></div>
      <label class="field"><span>${L('জায়গা', 'Location')}</span><input class="input" name="location" maxlength="80" value="${esc(v.location || '')}"></label>
      <label class="field"><span>${L('খরচের খাত (কমা দিয়ে আলাদা, বদলানো যায়)', 'Expense categories (comma separated, editable)')}</span><textarea class="input hg-ta" name="cats" rows="2">${esc(cats.map(k => (isEN() ? k.en : k.bn)).join(', '))}</textarea></label>
      <label class="field"><span>${L('নোট', 'Notes')}</span><input class="input" name="notes" maxlength="200" value="${esc(v.notes || '')}"></label></details>
    <button class="btn primary block" type="submit">${ev ? L('সেভ করুন', 'Save') : L('ইভেন্ট খুলুন →', 'Create event →')}</button>
  </form>`;
}
function hgMapCats(names, existing) {
  const all = (existing || []).slice();
  return names.map(n => {
    const low = n.toLowerCase();
    let hit = all.find(c => c.bn.toLowerCase() === low || c.en.toLowerCase() === low);
    if (!hit) { const k = Object.keys(HG_CAT).find(k => HG_CAT[k][0].toLowerCase() === low || HG_CAT[k][1].toLowerCase() === low); if (k) hit = { k, bn: HG_CAT[k][0], en: HG_CAT[k][1] }; }
    return hit || { k: 'c_' + uid(), bn: n, en: n };
  }).filter((c, i, a) => a.findIndex(x => x.k === c.k) === i);
}
function hgNewParticipant(name, extra) { return Object.assign({ id: uid(), friendId: null, name, phone: '', note: '', joinedOn: '', active: true }, extra || {}); }
function hgEnsureFriend(name, phone) {
  let f = hg().friends.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!f) { f = { id: uid(), name, phone: phone || '', note: '', createdAt: Date.now() }; hg().friends.push(f); }
  return f;
}

/* ---------- ব্যক্তি ফর্ম ---------- */
function hgPersonForm(ev, p) {
  const have = new Set(ev.participants.map(x => x.friendId));
  const avail = hg().friends.filter(f => !have.has(f.id));
  return `${sheetHead(p ? L('বন্ধু এডিট', 'Edit person') : L('বন্ধু যোগ করুন', 'Add person'), p ? L('এই ইভেন্টে নামের কপি বদলাবে', 'Changes this event only') : '')}
  <form data-form="hg-person" data-id="${p ? p.id : ''}" autocomplete="off">
    ${!p && avail.length ? `<div class="field"><span class="flabel">${L('সেভ করা বন্ধু থেকে', 'From saved friends')}</span><div class="chips">${avail.map(f => `<button type="button" class="qchip" data-action="hg-pick-friend" data-id="${f.id}">${esc(f.name)}</button>`).join('')}</div></div>` : ''}
    <label class="field"><span>${L('নাম', 'Name')}</span><input class="input" name="name" maxlength="40" value="${esc(p ? p.name : '')}"></label>
    <label class="field"><span>${L('ফোন (ঐচ্ছিক)', 'Phone (optional)')}</span><input class="input" name="phone" inputmode="tel" maxlength="20" value="${esc(p ? p.phone : '')}"></label>
    <label class="field"><span>${L('নোট', 'Notes')}</span><input class="input" name="note" maxlength="120" value="${esc(p ? p.note : '')}"></label>
    <label class="field"><span>${L('কবে থেকে ছিল? (ফাঁকা = শুরু থেকে)', 'Since when? (blank = from the start)')}</span><input class="input" type="date" name="joined" value="${esc(p ? (p.joinedOn || '') : (ev.expenses.some(e => !e.del) ? today() : ''))}">
      <div class="hint">${L('মাঝপথে যোগ দিলে তারিখ দিন। এর আগের খরচে তাকে ধরা হবে না, তাই পুরোনো হিসাব বদলাবে না।', 'If someone joins midway, set the date. Earlier expenses will not include them, so old numbers stay the same.')}</div></label>
    ${p ? '' : `<input type="hidden" name="friendId" value="">`}
    <button class="btn primary block" type="submit">${p ? L('সেভ করুন', 'Save') : L('যোগ করুন', 'Add')}</button></form>`;
}
function hgFriendForm(f) {
  return `${sheetHead(f ? L('বন্ধু এডিট', 'Edit friend') : L('নতুন বন্ধু', 'New friend'), L('পরের ইভেন্টে আবার ব্যবহার করা যাবে', 'Reusable in future events'))}
  <form data-form="hg-friend" data-id="${f ? f.id : ''}" autocomplete="off">
    <label class="field"><span>${L('নাম', 'Name')}</span><input class="input" name="name" maxlength="40" value="${esc(f ? f.name : '')}"></label>
    <label class="field"><span>${L('ফোন (ঐচ্ছিক)', 'Phone (optional)')}</span><input class="input" name="phone" inputmode="tel" maxlength="20" value="${esc(f ? f.phone : '')}"></label>
    <label class="field"><span>${L('নোট', 'Notes')}</span><input class="input" name="note" maxlength="120" value="${esc(f ? f.note : '')}"></label>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button>
    ${f ? `<button type="button" class="btn danger block mt8" data-action="hg-del-friend" data-id="${f.id}">${icon('trash', 18)} ${L('তালিকা থেকে মুছুন', 'Remove from saved')}</button>
      <p class="hint">${L('পুরোনো ইভেন্টের নাম বদলাবে না।', 'Past events keep their own copy of the name.')}</p>` : ''}</form>`;
}

/* ---------- সাধারণ খরচ ফর্ম ---------- */
let hgPendingReceipt; // undefined = বদলায়নি, null = মুছতে হবে, Blob = নতুন
let hgPendingPreview = '';
function hgReceiptBlock(rid) {
  const url = hgPendingReceipt === undefined ? (rid ? imgURL.get('hgr:' + rid) : '') : (hgPendingReceipt ? hgPendingPreview : '');
  return `<div class="field"><span class="flabel">${L('রসিদ / বিলের ছবি (ঐচ্ছিক)', 'Receipt photo (optional)')}</span>
    <div class="hg-rcpt" data-hg-rcpt>${url ? `<img src="${url}" alt="">` : `<span class="muted">${L('কোনো ছবি নেই', 'No photo')}</span>`}</div>
    <div class="btn-row mt8"><button type="button" class="btn sm" data-action="hg-rcpt-pick">${icon('upload', 16)} ${L('ছবি বাছুন', 'Upload')}</button>
      <button type="button" class="btn sm" data-action="hg-rcpt-cam">📷 ${L('ক্যামেরা', 'Camera')}</button>
      <button type="button" class="btn sm danger" data-action="hg-rcpt-remove">${icon('trash', 16)}</button></div>
    <input type="file" accept="image/*" data-hg-rcpt-input hidden><input type="file" accept="image/*" capture="environment" data-hg-rcpt-input hidden></div>`;
}
function hgRefreshReceipt() {
  const box = $('[data-hg-rcpt]'); if (!box) return;
  const f = box.closest('form'); const id = f && f.dataset.rid;
  const url = hgPendingReceipt === undefined ? (id ? imgURL.get('hgr:' + id) : '') : (hgPendingReceipt ? hgPendingPreview : '');
  box.innerHTML = url ? `<img src="${url}" alt="">` : `<span class="muted">${L('কোনো ছবি নেই', 'No photo')}</span>`;
}
document.addEventListener('change', async e => {
  if (!e.target.matches || !e.target.matches('[data-hg-rcpt-input]')) return;
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const f = e.target.closest('form');
  try {
    hgPendingReceipt = await compressImage(file);
    if (hgPendingPreview) URL.revokeObjectURL(hgPendingPreview);
    hgPendingPreview = URL.createObjectURL(hgPendingReceipt);
    hgRefreshReceipt();
  } catch (err) {
    fail(f, err.message === 'size' ? L('ছবিটা অনেক বড়।', 'That photo is too large.') : err.message === 'type' ? L('এটা ছবি না।', 'That is not an image.') : L('ছবিটা খোলা যায়নি।', 'Could not open that photo.'));
  }
});
async function hgSaveReceipt(expense, f) {
  // ছবি সেভ ব্যর্থ হলে সেটা স্পষ্ট জানায়, খরচটা ঠিকই থাকে
  const rid = expense.receipt;
  if (hgPendingReceipt === undefined) return true;
  const blob = hgPendingReceipt; hgPendingReceipt = undefined;
  try {
    if (blob) { const id = rid || uid(); await putImage('hgr:' + id, blob); expense.receipt = id; }
    else if (rid) { await deleteImage('hgr:' + rid); expense.receipt = null; }
    return true;
  } catch (err) { return false; }
}
function hgExpenseForm(e, preset, scope0) {
  const ev = hgCur();
  const isNew = !e;
  const usedIds = e ? e.payers.map(p => p.pid).concat((e.spec && e.spec.incl) || [], Object.keys((e.spec && e.spec.values) || {})) : [];
  const people = hgPickable(ev, usedIds);
  const v = e || { title: '', category: preset || ev.cats[0].k, date: today(), desc: '', total: 0, payers: [], method: 'selected', spec: { incl: people.filter(p => p.active && (!p.joinedOn || p.joinedOn <= today())).map(p => p.id), values: {} }, note: '', meta: {} };
  hgPendingReceipt = undefined;
  const method = v.method === 'equal' ? 'selected' : v.method;
  const inclNow = v.method === 'equal' ? people.filter(p => p.active || ((v.spec && v.spec.incl) || []).includes(p.id)).map(p => p.id) : (v.spec.incl || []);
  const payOf = pid => (v.payers.find(p => p.pid === pid) || {}).amt;
  const multi = v.payers.length > 1;
  const scope = (e && e.personal) || scope0 === 'personal' ? 'personal' : 'group';
  const lastPay = isNew ? ([...ev.expenses].filter(x => !x.del && x.payers.length).sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0))[0] || { payers: [] }).payers[0] : null;
  const lastPid = lastPay && people.some(p => p.id === lastPay.pid && p.active) ? lastPay.pid : null;
  const onePayer = (v.payers[0] || {}).pid || lastPid || (ev.participants.find(p => p.org && p.active) || people[0] || {}).id;
  const forWho = (e && e.personal) || onePayer;
  const val = (pid, m) => { const x = (v.spec.values || {})[pid]; if (x == null) return ''; return (m === 'exact' || m === 'custom') ? hgTaka(x) : x; };
  const meta = v.meta || {};
  const mset = (m, pre, ph, suffix) => `<div class="hg-vals ${method === m ? '' : 'hidden'}" data-vals="${m}">${people.map(p => `<label class="hg-vrow"><span>${esc(p.name)}</span>
      <div class="input-wrap ${suffix === '৳' ? 'has-prefix' : ''}">${suffix === '৳' ? '<span class="prefix">৳</span>' : ''}<input class="input" name="${pre}${p.id}" inputmode="decimal" value="${esc(val(p.id, m) === 0 ? '' : val(p.id, m))}" placeholder="${ph}">${suffix !== '৳' ? `<span class="suffix">${suffix}</span>` : ''}</div></label>`).join('')}</div>`;
  const advOpen = method !== 'selected';
  return `${sheetHead(isNew ? L('নতুন খরচ', 'New expense') : L('খরচ এডিট', 'Edit expense'), esc(ev.name))}
  <form data-form="hg-expense" data-live="hg-expense" data-id="${e ? e.id : ''}" data-rid="${e && e.receipt ? e.receipt : ''}" autocomplete="off">
    <label class="field"><span>1. ${L('কিসের খরচ?', 'What was it for?')}</span><input class="input" name="title" maxlength="60" value="${esc(v.title)}" placeholder="${L('লিখুন বা নিচ থেকে বাছুন', 'Type, or tap one below')}"></label>
    ${isNew ? `<div class="qtitles ${scope === 'personal' ? 'hidden' : ''}" data-qcat>${ev.cats.filter(k => !['discount', 'vat', 'service', 'other_charges'].includes(k.k)).slice(0, 6).map(k => `<button type="button" class="qchip" data-action="hg-title-chip" data-k="${k.k}" data-t="${esc(isEN() ? k.en : k.bn)}">${esc(isEN() ? k.en : k.bn)}</button>`).join('')}</div>` : ''}
    <label class="field"><span>2. ${L('মোট কত টাকা?', 'How much in total?')}</span>${moneyInput('total', hgTaka(v.total), '0')}</label>
    <div class="eachstrip hidden" data-each></div>
    <div class="field"><span class="flabel">3. ${L('টাকা কে দিয়েছে?', 'Who paid?')}</span>
      <div data-one>${hgSelect('payOne', people.map(p => [p.id, esc(p.name)]), onePayer)}</div>
      ${hgCheckRow('multi', L('একজনের বেশি দিয়েছে', 'More than one person paid'), multi)}
      <div class="hg-multi ${multi ? '' : 'hidden'}" data-multi><span class="hint">${L('১) যারা টাকা দিয়েছে তাদের ট্যাপ করুন, সমান ভাগ নিজে বসে যাবে। ২) আলাদা হলে নিচের ঘরে নিজে লিখুন।', '1) Tap everyone who paid and the amount is split equally for you. 2) If it differs, type it below.')}</span>
        <div class="chips payerchips">${people.map(p => `<label class="chip"><input type="checkbox" name="pp_${p.id}" ${payOf(p.id) ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}<button type="button" class="qchip" data-action="hg-pay-allchips">${L('সবাই', 'Everyone')}</button></div>
        <div class="payrow eachrow"><span class="pn">${L('প্রত্যেকে', 'Each paid')}</span><div class="pi">${moneyInput('each', '', L('যেমন 4444.40', 'e.g. 4444.40'))}</div></div>
        <span class="hint" data-eachhint>${L('উপরে টিক দেওয়া সবাই যদি একই অঙ্ক দিয়ে থাকে, এখানে সেই অঙ্ক লিখুন, সবার ঘরে বসে যাবে।', 'If everyone ticked paid the same amount, type it here and it fills for all of them.')}</span>
        ${people.map(p => `<div class="payrow"><span class="pn">${esc(p.name)}</span><div class="pi">${moneyInput('pay_' + p.id, hgTaka(payOf(p.id)), '0')}</div><button type="button" class="qchip" data-action="hg-pay-rest" data-p="${p.id}">${L('বাকিটা', 'Rest')}</button></div>`).join('')}
        <div class="preview" data-paysum></div></div></div>
    ${isNew ? `<div class="qtitles ${scope === 'personal' ? '' : 'hidden'}" data-qpers>${[['কোক', 'Coke'], ['চা', 'Tea'], ['নাস্তা', 'Snack'], ['রিকশা', 'Rickshaw']].map(([bn, en]) => `<button type="button" class="qchip" data-action="hg-title-chip" data-k="" data-t="${L(bn, en)}">${L(bn, en)}</button>`).join('')}</div>` : ''}
    <div class="field"><span class="flabel">4. ${L('খরচটা কার?', 'Whose cost is it?')}</span>
      <div class="hg-methods"><label class="chip"><input type="radio" name="scope" value="group" ${scope === 'group' ? 'checked' : ''}><span>👥 ${L('সবার মধ্যে ভাগ', 'Shared by the group')}</span></label>
        <label class="chip"><input type="radio" name="scope" value="personal" ${scope === 'personal' ? 'checked' : ''}><span>👤 ${L('শুধু একজনের (ব্যক্তিগত)', 'Only one person (personal)')}</span></label></div>
      <div class="hg-multi ${scope === 'personal' ? '' : 'hidden'}" data-personal><span class="hint">${L('কার খরচ? (যেমন কেউ একা কোক খেল, শুধু তার হিসাবে যাবে, অন্য কারও ভাগে নয়)', 'Whose cost? (e.g. someone had a coke alone: it goes only to them)')}</span>${hgSelect('forWho', people.map(p => [p.id, esc(p.name)]), forWho)}</div></div>
    <div class="field ${scope === 'personal' ? 'hidden' : ''}" data-groupbox><span class="flabel">5. ${L('কাদের মধ্যে ভাগ হবে? (সমান ভাগ)', 'Who shares it? (split equally)')}</span>
      <div class="hg-incl ${advOpen ? 'hidden' : ''}" data-incl><div class="chips">${people.map(p => `<label class="chip"><input type="checkbox" name="inc_${p.id}" ${inclNow.includes(p.id) ? 'checked' : ''}><span>${esc(p.name)}${p.joinedOn ? ` <small>(${L('থেকে', 'from')} ${fmtDate(p.joinedOn)})</small>` : ''}</span></label>`).join('')}</div>
        <div class="hint">${L('যারা এই খরচে ছিল না তাদের টিক তুলে দিন।', 'Untick anyone who was not part of this.')}</div></div>
      <div class="preview" data-split></div>
      <div class="preview" data-budget></div></div>
    <details class="more" data-carrybox open><summary><span class="ds-t">👥 ${L('এই খরচের পর কার কত বাকি', 'After this expense')}</span><small>${L('আগের বাকিসহ', 'Including earlier dues')}</small></summary><div class="carry" data-carry></div></details>
    <details class="more ${scope === 'personal' ? 'hidden' : ''}" data-groupbox ${advOpen ? 'open' : ''}><summary><span class="ds-t">⚖️ ${L('অন্যভাবে ভাগ করুন', 'Split differently')}</span><small>${L('শতাংশ, নির্দিষ্ট টাকা বা অনুপাত', 'Percent, exact amounts or ratio')}</small></summary>
      <div class="hg-methods">${['selected', 'exact', 'percent', 'ratio', 'custom'].map(m => `<label class="chip"><input type="radio" name="method" value="${m}" ${method === m ? 'checked' : ''}><span>${m === 'selected' ? L('সমান ভাগ', 'Equal') : HG_METHODS[m][isEN() ? 1 : 0]}</span></label>`).join('')}</div>
      ${mset('exact', 'ex_', '0', '৳')}${mset('percent', 'pc_', '0', '%')}${mset('ratio', 'rt_', '1', '×')}${mset('custom', 'cu_', L('বাকিটা অটো', 'rest auto'), '৳')}</details>
    <details class="more" ${(!isNew && (v.category !== ev.cats[0].k || v.desc || e.receipt)) ? 'open' : ''}><summary><span class="ds-t">🗂️ ${L('আরও তথ্য', 'More details')}</span><small>${L('খাত, তারিখ, রসিদের ছবি, নোট', 'Category, date, receipt photo, note')}</small></summary>
      <div class="row2"><label class="field"><span>${L('খাত', 'Category')}</span>${hgSelect('cat', ev.cats.map(k => [k.k, esc(isEN() ? k.en : k.bn)]), v.category)}</label>
        <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc(v.date)}"></label></div>
      <div class="hg-room ${v.category === 'room' ? '' : 'hidden'}" data-room><div class="row2" style="grid-template-columns:1fr 1fr 1fr">
        <label class="field"><span>${L('রুম', 'Rooms')}</span><input class="input" name="rooms" inputmode="numeric" value="${esc(meta.rooms || '')}"></label>
        <label class="field"><span>${L('রাত', 'Nights')}</span><input class="input" name="nights" inputmode="numeric" value="${esc(meta.nights || '')}"></label>
        <label class="field"><span>${L('রাতপ্রতি ভাড়া', 'Rate/night')}</span><input class="input" name="rate" inputmode="decimal" value="${esc(meta.rate || '')}"></label></div>
        <div class="hint">${L('রুম × রাত × ভাড়া থেকে মোট নিজে বসে। গেস্ট ভাগের জন্য উপরে "অনুপাত" বেছে প্রত্যেকের রাত দিন।', 'The total fills from rooms × nights × rate. For guests, pick "Share ratio" above and enter each guest\'s nights.')}</div></div>
      <label class="field"><span>${L('বিবরণ / নোট', 'Description / note')}</span><input class="input" name="desc" maxlength="160" value="${esc(v.desc || '')}"></label>
      ${hgReceiptBlock(e && e.receipt)}</details>
    <button class="btn primary block" type="submit">${isNew ? L('যোগ করুন', 'Add') : L('সেভ করুন', 'Save')}</button>
    ${isNew ? `<button type="button" class="btn block mt8" data-action="hg-add-bill">${icon('receipt', 18)} ${L('রেস্টুরেন্টের বিল (আইটেম ধরে)', 'Restaurant bill (item by item)')}</button>` : `<button type="button" class="btn danger block mt8" data-action="hg-del-expense" data-id="${e.id}">${icon('trash', 18)} ${L('ডিলিট', 'Delete')}</button>`}
  </form>`;
}
function hgReadExpense(f, ev) {
  const people = ev.participants.filter(p => f.elements['pay_' + p.id]);
  const total = toMinor(f.elements.total.value);
  const multi = f.elements.multi && f.elements.multi.checked;
  const payers = multi
    ? people.map(p => ({ pid: p.id, amt: toMinor(f.elements['pay_' + p.id].value) })).filter(x => x.amt > 0)
    : (total > 0 && f.elements.payOne.value ? [{ pid: f.elements.payOne.value, amt: total }] : []);
  let method = f.elements.method.value;
  const personal = f.elements.scope && f.elements.scope.value === 'personal' ? f.elements.forWho.value : null;
  let incl = method === 'selected' ? people.filter(p => f.elements['inc_' + p.id].checked).map(p => p.id) : people.filter(p => f.elements['inc_' + p.id].checked).map(p => p.id);
  if (personal) { method = 'selected'; incl = [personal]; }
  const pre = { exact: 'ex_', percent: 'pc_', ratio: 'rt_', custom: 'cu_' }[method];
  const values = {};
  const blanks = [];
  if (pre) people.forEach(p => {
    const raw = String(f.elements[pre + p.id].value).trim();
    if (raw === '') blanks.push(p.id);
    values[p.id] = (method === 'exact' || method === 'custom') ? toMinor(raw) : hgNum(raw);
  });
  if (method === 'custom' && blanks.length === 1) values[blanks[0]] = total - sum(Object.entries(values).filter(([id]) => id !== blanks[0]).map(([, v]) => v));
  const split = hgSplit(total, method === 'selected' ? 'selected' : method, people.map(p => p.id), { incl, values });
  // সবাই থাকলে "সমান" হিসেবে সংরক্ষণ
  if (method === 'selected' && people.filter(p => p.active).every(p => incl.includes(p.id)) && incl.length === people.filter(p => p.active).length) method = 'equal';
  return { total, payers, method, spec: { incl, values }, split, people, multi, personal };
}
LIVE['hg-expense'] = (f, t) => {
  const ev = hgCur(); if (!ev) return;
  const personalOn = f.elements.scope.value === 'personal';
  $$('[data-groupbox]', f).forEach(d => d.classList.toggle('hidden', personalOn));
  $('[data-personal]', f).classList.toggle('hidden', !personalOn);
  const qp = $('[data-qpers]', f), qc = $('[data-qcat]', f); if (qp) qp.classList.toggle('hidden', !personalOn); if (qc) qc.classList.toggle('hidden', personalOn);
  if (t && t.name === 'payOne' && !f.elements.forWho.dataset.touched) f.elements.forWho.value = f.elements.payOne.value;
  if (t && t.name === 'forWho') f.elements.forWho.dataset.touched = '1';
  // যারা টাকা দিয়েছে তাদের চিপ থেকে সমান ভাগ (নিজে ঘরে লিখলে অটো বন্ধ)
  if (t && t.name && t.name.startsWith('pay_')) f.dataset.ppAuto = '';
  if (t && t.name === 'each') f.dataset.eachAuto = '';
  const eachV = f.elements.each && f.dataset.eachAuto !== '1' ? toMinor(f.elements.each.value) : 0;
  if (t && t.name && (t.name === 'each' || (t.name.startsWith('pp_') && eachV))) {
    ev.participants.forEach(p => {
      const c = f.elements['pp_' + p.id], i = f.elements['pay_' + p.id];
      if (c && i) i.value = c.checked && eachV ? fromMinor(eachV) : '';
    });
    f.dataset.ppAuto = '';
  }
  if (t && t.name && ((t.name.startsWith('pp_') && !eachV) || (t.name === 'total' && f.dataset.ppAuto === '1'))) {
    const ticked = ev.participants.filter(p => f.elements['pp_' + p.id] && f.elements['pp_' + p.id].checked).map(p => p.id);
    const tot = toMinor(f.elements.total.value);
    const dist = hgDist(tot, Object.fromEntries(ticked.map(id => [id, 1])), ev.participants.map(p => p.id));
    ev.participants.forEach(p => { const i = f.elements['pay_' + p.id]; if (i) i.value = dist[p.id] ? fromMinor(dist[p.id]) : ''; });
    f.dataset.ppAuto = '1';
    if (f.elements.each) { f.elements.each.value = ticked.length && tot ? fromMinor(Math.floor(tot / ticked.length)) : ''; f.dataset.eachAuto = '1'; }
  }
  const method = personalOn ? 'selected' : f.elements.method.value;
  $$('[data-vals]', f).forEach(d => d.classList.toggle('hidden', d.dataset.vals !== method));
  $('[data-incl]', f).classList.toggle('hidden', method !== 'selected');
  $('[data-multi]', f).classList.toggle('hidden', !f.elements.multi.checked);
  $('[data-one]', f).classList.toggle('hidden', f.elements.multi.checked);
  if (t && t.name === 'date' && f.elements.date.value) {
    const day = f.elements.date.value;
    ev.participants.forEach(p => { const i = f.elements['inc_' + p.id]; if (i) i.checked = p.active && (!p.joinedOn || p.joinedOn <= day); });
  }
  const room = f.elements.cat.value === 'room';
  $('[data-room]', f).classList.toggle('hidden', !room);
  if (room && t && ['rooms', 'nights', 'rate'].includes(t.name)) {
    const m = Math.floor(hgNum(f.elements.rooms.value)) * Math.floor(hgNum(f.elements.nights.value)) * toMinor(f.elements.rate.value);
    if (m > 0) f.elements.total.value = fromMinor(m);
  }
  const r = hgReadExpense(f, ev);
  const ps = hgSum(r.payers.map(p => p.amt));
  const pv = $('[data-paysum]', f);
  pv.className = 'preview' + (r.total > 0 && ps !== r.total ? ' warn' : '');
  pv.innerHTML = r.total > 0 ? (ps === r.total ? `${L('মোট দেওয়া', 'Paid total')} <b class="pos">${hgM(ps)}</b> ✓` : (ps < r.total ? L(`দেওয়া হয়েছে <b>${hgM(ps)}</b> / ${hgM(r.total)}। আরও <b>${hgM(r.total - ps)}</b> কেউ দিয়েছে লিখুন`, `Paid <b>${hgM(ps)}</b> of ${hgM(r.total)}. <b>${hgM(r.total - ps)}</b> still to assign`) : L(`দেওয়া হয়েছে <b>${hgM(ps)}</b>, খরচের চেয়ে <b>${hgM(ps - r.total)}</b> বেশি`, `Paid <b>${hgM(ps)}</b>, that is <b>${hgM(ps - r.total)}</b> more than the expense`))) : '';
  const sp = $('[data-split]', f);
  const bud = $('[data-budget]', f); bud.className = 'preview'; bud.innerHTML = '';
  const eachEl = $('[data-each]', f), carry = $('[data-carry]', f);
  eachEl.classList.add('hidden'); carry.innerHTML = `<p class="hint">${L('টাকা আর কে দিয়েছে লিখলে এখানে দেখাবে।', 'Enter the amount and who paid to see this.')}</p>`;
  if (r.total <= 0) { sp.className = 'preview'; sp.innerHTML = ''; return; }
  if (r.split.ok) {
    sp.className = 'preview';
    sp.innerHTML = L('প্রত্যেকের ভাগ: ', 'Each pays: ') + r.people.filter(p => r.split.alloc[p.id] > 0).map(p => `${esc(p.name)} <b>${hgM(r.split.alloc[p.id])}</b>`).join(' · ');
  } else { sp.className = 'preview warn'; sp.innerHTML = esc(hgErr(r.split.error)); }
  // প্রত্যেকের ভাগ এক নজরে (অ্যামাউন্টের নিচেই)
  if (r.split.ok) {
    const parts = r.people.filter(p => r.split.alloc[p.id] > 0), vals = parts.map(p => r.split.alloc[p.id]);
    const same = vals.length > 0 && Math.max(...vals) - Math.min(...vals) <= 1;
    eachEl.classList.remove('hidden');
    eachEl.innerHTML = parts.length === 1 ? L(`শুধু <b>${esc(parts[0].name)}</b>: <b>${hgM(vals[0])}</b>`, `Only <b>${esc(parts[0].name)}</b>: <b>${hgM(vals[0])}</b>`)
      : same ? L(`<b>${parts.length} জনে</b> ভাগ → প্রতিজন <b>${hgM(Math.round(r.total / parts.length))}</b>`, `Split <b>${parts.length} ways</b> → <b>${hgM(Math.round(r.total / parts.length))}</b> each`)
        : L(`<b>${parts.length} জনে</b> ভাগ, কার কত নিচে দেখুন`, `Split <b>${parts.length} ways</b>, see each share below`);
  }
  // এই খরচের পর কার কত বাকি (আগের বাকিসহ): ইঞ্জিনে সাময়িক খরচ বসিয়ে হিসাব
  if (r.split.ok && ps === r.total && r.payers.length) {
    const eid = f.dataset.id || '';
    const base = ev.expenses.filter(x => x.id !== eid);
    const before = hgEventCalc(Object.assign({}, ev, { expenses: base }));
    const tmp = { id: '__tmp', title: '', category: f.elements.cat.value, date: f.elements.date.value || today(), total: r.total, payers: r.payers, method: r.method, spec: r.spec, mode: 'split', personal: r.personal || null };
    const after = hgEventCalc(Object.assign({}, ev, { expenses: base.concat(tmp) }));
    const side = n => n > 0 ? `<b class="pos">${L('পাবে', 'gets')} ${hgM(n)}</b>` : n < 0 ? `<b class="neg">${L('দেবে', 'owes')} ${hgM(-n)}</b>` : `<b>${L('মিটেছে ✓', 'even ✓')}</b>`;
    const delta = n => n === 0 ? '<span class="mut">—</span>' : `<span class="${n > 0 ? 'pos' : 'neg'}">${n > 0 ? '+' : '−'}${hgM(Math.abs(n))}</span>`;
    const paidNow = Object.fromEntries(ev.participants.map(p => [p.id, r.payers.filter(x => x.pid === p.id).reduce((q, x) => q + x.amt, 0)]));
    const who = ev.participants.filter(p => before.final[p.id] !== 0 || after.final[p.id] !== 0 || r.split.alloc[p.id] || paidNow[p.id]);
    const hadDues = ev.participants.some(p => before.final[p.id] !== 0);
    const rowsHtml = who.map(p => {
      const sh = r.split.alloc[p.id] || 0, pd = paidNow[p.id] || 0;
      return `<div class="crow"><div class="cn"><b>${esc(p.name)}${hgIsLater(p, before) ? ' ⏳' : ''}</b><small>${sh ? L(`ভাগ ${hgM(sh)}`, `share ${hgM(sh)}`) : L('এই খরচে নেই', 'not in this one')}${pd ? L(` · দিয়েছে ${hgM(pd)}`, ` · paid ${hgM(pd)}`) : ''}</small></div>
        <div class="cc"><small>${L('আগে', 'Before')}</small>${before.final[p.id] === 0 ? '<span class="mut">—</span>' : side(before.final[p.id])}</div>
        <div class="cc"><small>${L('এবার', 'This')}</small>${delta(after.final[p.id] - before.final[p.id])}</div>
        <div class="cc cn2"><small>${L('এখন', 'After')}</small>${side(after.final[p.id])}</div></div>`;
    }).join('');
    const nPay = who.filter(p => after.final[p.id] < 0).length, nGet = who.filter(p => after.final[p.id] > 0).length;
    carry.innerHTML = rowsHtml
      ? `<p class="hint" style="margin-top:0">${L('এই খরচ সেভ করলে প্রত্যেকের হিসাব কেমন দাঁড়াবে। <b>এখন = আগে + এবার</b>। সবুজ = টাকা পাবে, লাল = টাকা দেবে।', 'What each balance becomes when you save. <b>After = Before + This</b>. Green = gets money, red = owes money.')}${hadDues ? L(' আগের বাকি এবারের ভাগের সাথে যোগ হয়েছে। ⏳ = পরের বিলে দেবে বলেছিল।', ' Earlier dues are included. ⏳ = said they would pay with the next bill.') : ''}</p>${rowsHtml}
        <div class="csum">${L(`<b>${nPay} জন</b> দেবে, <b>${nGet} জন</b> পাবে`, `<b>${nPay}</b> will owe, <b>${nGet}</b> will get`)}</div>`
      : `<p class="hint">${L('সবার হিসাব মিটে থাকবে ✓', 'Everyone will be even ✓')}</p>`;
  }
  // বাজেট থাকলে: এই খরচের পর ওই খাত আর মোট বাজেটের কী অবস্থা হবে
  const plan = ev.plan && hgPlanCalc(ev, hgEventCalc(ev), today());
  if (plan) {
    const id = f.dataset.id, old = id && ev.expenses.find(x => x.id === id);
    const cat = f.elements.cat.value, back = old ? old.total : 0;
    const row = plan.rows.find(x => x.k === cat);
    const after = plan.spent + r.total - back;
    const catAfter = row ? row.spent + r.total - (old && old.category === cat ? back : 0) : 0;
    const catOver = row && catAfter > row.ideal;
    const totalOver = after > plan.total;
    bud.className = 'preview' + (totalOver ? ' danger' : (catOver ? ' warn' : ''));
    bud.innerHTML = (row ? L(`${hgPlanCatLabel(ev, cat)} বাজেট: ${hgM(catAfter)} / ${hgM(row.ideal)}${catOver ? ` (<b class="neg">${hgM(catAfter - row.ideal)} বেশি</b>)` : ''}`, `${hgPlanCatLabel(ev, cat)} budget: ${hgM(catAfter)} / ${hgM(row.ideal)}${catOver ? ` (<b class="neg">${hgM(catAfter - row.ideal)} over</b>)` : ''}`) + '<br>' : '')
      + (after <= plan.total ? L(`মোট বাজেটের ${hgM(plan.total - after)} বাকি থাকবে`, `${hgM(plan.total - after)} of the total budget left`) : L(`মোট বাজেটের ${hgM(after - plan.total)} বেশি হয়ে যাবে`, `${hgM(after - plan.total)} over the total budget`));
  }
};
Object.assign(FORMS, {
  'hg-expense': async f => {
    const ev = hgGuard(); if (!ev) return;
    const id = f.dataset.id, existing = id && ev.expenses.find(x => x.id === id);
    const title = f.elements.title.value.trim();
    if (!title) return fail(f, L('খরচের নাম লিখুন', 'Enter what the expense is for'), 'title');
    const r = hgReadExpense(f, ev);
    if (r.total <= 0) return fail(f, L('মোট টাকা লিখুন', 'Enter the total amount'), 'total');
    if (!r.payers.length) return fail(f, L('কে টাকা দিয়েছে তা বাছুন', 'Pick who paid'));
    const ps = hgSum(r.payers.map(p => p.amt));
    if (ps !== r.total) return fail(f, L(`কে কত দিয়েছে তার যোগফল ${hgM(ps)}, কিন্তু খরচ ${hgM(r.total)}। দুটো সমান হতে হবে।`, `Payments add up to ${hgM(ps)} but the expense is ${hgM(r.total)}. They must match.`));
    if (!r.split.ok) return fail(f, hgErr(r.split.error));
    const alloc = Object.fromEntries(ev.participants.map(p => [p.id, r.split.alloc[p.id] || 0]));
    const x = existing || { id: uid(), createdAt: Date.now(), mode: 'split' };
    const before = existing ? `${x.title} ${hgM(x.total)}` : '';
    Object.assign(x, { title, category: f.elements.cat.value, date: f.elements.date.value || today(), desc: f.elements.desc.value.trim(), total: r.total, payers: r.payers,
      method: r.method, spec: r.spec, alloc, personal: r.personal || null, mode: 'split', updatedAt: Date.now(),
      meta: { rooms: f.elements.rooms.value.trim(), nights: f.elements.nights.value.trim(), rate: f.elements.rate.value.trim() } });
    if (!existing) ev.expenses.push(x);
    const okImg = await hgSaveReceipt(x, f);
    closeSheet();
    hgLog(ev, existing ? `খরচ বদলানো হয়েছে: ${before} → ${x.title} ${hgM(x.total)}` : `খরচ যোগ: ${x.title} ${hgM(x.total)}`, existing ? `Expense edited: ${before} → ${x.title} ${hgM(x.total)}` : `Expense added: ${x.title} ${hgM(x.total)}`);
    commit(okImg ? SAVED() : L('খরচ সেভ হয়েছে, কিন্তু রসিদের ছবি সেভ করা যায়নি', 'Expense saved, but the receipt photo could not be saved'));
    if (!okImg) toast(L('রসিদের ছবি সেভ হয়নি। আবার চেষ্টা করুন বা ছোট ছবি দিন।', 'The receipt photo was not saved. Try again or use a smaller photo.'), 'danger');
  },
  'hg-event': f => {
    const id = f.dataset.id, ev0 = id && hgEv(id);
    const name = f.elements.name.value.trim();
    if (!name) return fail(f, L('ইভেন্টের নাম লিখুন', 'Enter an event name'), 'name');
    const start = f.elements.start.value, end = f.elements.end.value;
    if (start && end && end < start) return fail(f, L('শেষের তারিখ শুরুর আগে হতে পারে না', 'The end date cannot be before the start'), 'end');
    const type = f.elements.type.value;
    const names = f.elements.cats.value.split(/[,\n،]/).map(s => s.trim()).filter(Boolean);
    const cats = hgMapCats(names.length ? names : hgCatsFor(type).map(k => (isEN() ? k.en : k.bn)), ev0 ? ev0.cats : null);
    const base = { name, type, start, end, location: f.elements.location.value.trim(), notes: f.elements.notes.value.trim() };
    if (ev0) {
      // ব্যবহার হওয়া খাত কখনো মুছে যায় না
      ev0.expenses.forEach(x => { if (!cats.some(c => c.k === x.category)) { const old = ev0.cats.find(c => c.k === x.category); if (old) cats.push(old); } });
      Object.assign(ev0, base, { cats });
      closeSheet(); return hgCommit(ev0, 'ইভেন্টের তথ্য বদলানো হয়েছে', 'Event details edited');
    }
    const ev = Object.assign({ id: uid(), status: 'active', createdAt: Date.now(), updatedAt: Date.now(), cats, participants: [], expenses: [], transfers: [], refunds: [], decisions: [], history: [] }, base);
    const names2 = f.elements.people.value.split(/\n/).map(s => s.trim()).filter(Boolean);
    const seen = new Set();
    names2.forEach(n => { if (seen.has(n.toLowerCase())) return; seen.add(n.toLowerCase()); const fr = hgEnsureFriend(n); ev.participants.push(hgNewParticipant(fr.name, { friendId: fr.id })); });
    hg().friends.forEach(fr => { const el = f.elements['fr_' + fr.id]; if (el && el.checked && !seen.has(fr.name.toLowerCase())) { seen.add(fr.name.toLowerCase()); ev.participants.push(hgNewParticipant(fr.name, { friendId: fr.id, phone: fr.phone || '' })); } });
    if (ev.participants[0]) ev.participants[0].org = true;
    hgLog(ev, 'ইভেন্ট তৈরি হয়েছে', 'Event created');
    hg().events.push(ev);
    hgRoute.ev = ev.id; tab = 'home'; trail = ['home'];
    if (sheetOpen) closeSheet(); commit(L('ইভেন্ট তৈরি হয়েছে', 'Event created'));
  },
  'hg-person': f => {
    const ev = hgGuard(); if (!ev) return;
    const name = f.elements.name.value.trim();
    if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    const id = f.dataset.id, p = id && ev.participants.find(x => x.id === id);
    if (ev.participants.some(x => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) return fail(f, L('এই নামে আরেকজন আছে। আলাদা করে লিখুন।', 'Someone with this name already exists. Make it distinct.'), 'name');
    if (p) { Object.assign(p, { name, phone: f.elements.phone.value.trim(), note: f.elements.note.value.trim(), joinedOn: f.elements.joined.value || '' }); closeSheet(); return hgCommit(ev, `বন্ধু বদলানো: ${name}`, `Person edited: ${name}`); }
    const fid = f.elements.friendId.value;
    const fr = fid ? hg().friends.find(x => x.id === fid) : hgEnsureFriend(name, f.elements.phone.value.trim());
    ev.participants.push(hgNewParticipant(name, { friendId: fr ? fr.id : null, phone: f.elements.phone.value.trim(), note: f.elements.note.value.trim(), joinedOn: f.elements.joined.value || '', org: !ev.participants.length }));
    closeSheet(); hgCommit(ev, `বন্ধু যোগ: ${name}`, `Person added: ${name}`);
  },
  'hg-friend': f => {
    const name = f.elements.name.value.trim();
    if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    const id = f.dataset.id, fr = id && hg().friends.find(x => x.id === id);
    if (hg().friends.some(x => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) return fail(f, L('এই নামে বন্ধু আগে থেকেই আছে', 'A friend with this name already exists'), 'name');
    if (fr) Object.assign(fr, { name, phone: f.elements.phone.value.trim(), note: f.elements.note.value.trim() });
    else hg().friends.push({ id: uid(), name, phone: f.elements.phone.value.trim(), note: f.elements.note.value.trim(), createdAt: Date.now() });
    closeSheet(); commit(SAVED());
  },
});
LIVE['hg-event'] = (f, t) => {
  if (t && t.name === 'type' && !f.dataset.id) f.elements.cats.value = hgCatsFor(f.elements.type.value).map(k => (isEN() ? k.en : k.bn)).join(', ');
};
