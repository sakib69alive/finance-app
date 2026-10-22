'use strict';

/* =========================================================
   মাসিক সংসার: প্রতিটা খাতের নিজস্ব পাতা
   বিদ্যুৎ · গ্যাস · পানি · ইন্টারনেট · কাজের সহায়তা (মাসের বিল, ছবি, বকেয়া) · পড়াশোনা (শিক্ষক, ফি, বকেয়া)
   চিকিৎসা (সদস্য, ডাক্তার, ওষুধ) · খাবার ও বাজার
   সব রেকর্ড সাধারণ খরচ হিসেবেই ঢোকে; কেন্দ্র: js/hangout-house.js
   ========================================================= */

const HG_CFG = {
  electricity: { read: true, conn: ['মিটার নম্বর / সংযোগের নাম', 'Meter no. / connection name'], idl: ['মিটার নম্বর (ঐচ্ছিক)', 'Meter number (optional)'], feeL: ['নির্ধারিত মাসিক চার্জ (ঐচ্ছিক)', 'Fixed monthly charge (optional)'], def: ['বিদ্যুৎ বিল', 'Electricity bill'], extraL: ['সারচার্জ / অন্যান্য ফি', 'Surcharge / other fees'] },
  gas: { conn: ['সংযোগের নাম বা ধরন (যেমন চুলা, সিলিন্ডার)', 'Connection name or type'], idl: ['গ্রাহক নম্বর (ঐচ্ছিক)', 'Customer no. (optional)'], feeL: ['নির্ধারিত মাসিক চার্জ (ঐচ্ছিক)', 'Fixed monthly charge (optional)'], def: ['গ্যাস বিল', 'Gas bill'], extraL: ['অতিরিক্ত ফি / সমন্বয়', 'Extra fee / adjustment'] },
  water: { read: true, conn: ['সংযোগ বা বিলের নাম', 'Connection / bill name'], idl: ['গ্রাহক নম্বর (ঐচ্ছিক)', 'Customer no. (optional)'], feeL: ['নির্ধারিত মাসিক চার্জ (ঐচ্ছিক)', 'Fixed monthly charge (optional)'], def: ['পানির বিল', 'Water bill'], extraL: ['অতিরিক্ত চার্জ', 'Extra charge'] },
  internet: { conn: ['ISP / কোম্পানির নাম', 'ISP / company'], idl: ['সংযোগের ঠিকানা বা শনাক্তকরণ নাম', 'Connection address or ID'], feeL: ['মাসিক প্যাকেজ মূল্য', 'Monthly package price'], def: ['ইন্টারনেট', 'Internet'], extraL: ['অতিরিক্ত চার্জ', 'Extra charge'] },
  househelp: { days: true, conn: ['নাম', 'Name'], idl: ['কাজ (বুয়া, ড্রাইভার, গার্ড…)', 'Role (maid, driver, guard…)'], feeL: ['মাসিক বেতন', 'Monthly pay'], def: ['বেতন', 'Pay'], extraL: ['বোনাস / অতিরিক্ত', 'Bonus / extra'] },
};
const hgProfs = (ev, k) => hgHH(ev).profiles.filter(p => p.cat === k && !p.del);
const hgFind = (ev, pred) => hgLive(ev).filter(pred);
const hgStWorst = list => ['overdue', 'unpaid', 'partial', 'paid'].find(s => list.includes(s));
const hgDueIn = (ym, day) => { const d = Math.min(Number(day), hgDaysIn(ym)); return `${ym}-${String(d).padStart(2, '0')}`; };
const hgCatHead = (ev, k, sub) => `${sheetHead(`${hgHHEmoji(k)} ${esc(hgCatLabel(ev, k))}`, sub || '')}${hgMNav()}`;
const hgMinis = a => `<div class="minis">${a.map(([l, v, cls]) => `<div class="mini"><small>${l}</small><b class="${cls || ''}">${v}</b></div>`).join('')}</div>`;
function hgCatScreen(ev, k) {
  hgHUi.cat = k;
  if (HG_CFG[k]) return hgConnScreen(ev, k);
  if (k === 'education') return hgEduScreen(ev);
  if (k === 'medical') return hgMedScreen(ev);
  if (k === 'groceries') return hgGroceryScreen(ev);
  return hgCatHead(ev, k);
}
function hgOpenEditForm(ev, e) {
  const i = e.info || {};
  if (i.kind === 'bill') return openSheet(hgBillForm(ev, e.category, { e }));
  if (i.kind === 'edu') return openSheet(hgEduPayForm(ev, hgHH(ev).profiles.find(p => p.id === i.profileId) || { id: '', name: i.teacher, who: i.student, sub: i.subject, rateType: 'month', rate: i.base || 0 }, { e }));
  if (i.kind === 'edu-misc') return openSheet(hgEduMiscForm(ev, e));
  if (i.kind === 'visit') return openSheet(hgVisitForm(ev, e));
  if (i.kind === 'med') return openSheet(hgMedForm(ev, e));
  if (i.kind === 'market') return openSheet(hgGroceryForm(ev, e));
  openSheet(hgExpenseForm(e));
}

/* ---------- বিল: বিদ্যুৎ, গ্যাস, পানি, ইন্টারনেট, কাজের সহায়তা ---------- */
function hgConns(ev, k) {
  const m = {};
  hgProfs(ev, k).forEach(p => { m[p.name.toLowerCase()] = { label: p.name, p, recs: [] }; });
  hgLive(ev).filter(e => e.category === k && e.info && e.info.kind === 'bill').forEach(e => {
    const key = (e.info.label || '').toLowerCase(); const c = m[key] || (m[key] = { label: e.info.label || HG_CFG[k].def[isEN() ? 1 : 0], p: null, recs: [] }); c.recs.push(e);
  });
  return Object.values(m);
}
function hgConnScreen(ev, k) {
  const cfg = HG_CFG[k], ym = hgHUi.ym, act = ev.status === 'active', now = hgToday(), yr = ym.slice(0, 4);
  const all = hgLive(ev).filter(e => e.category === k && e.info && e.info.kind === 'bill');
  const inM = all.filter(e => hgExpYm(e) === ym), tot = sum(inM.map(e => e.total)), due = sum(inM.map(e => hgOblRem(ev, e)));
  const yearT = sum(all.filter(e => hgExpYm(e).startsWith(yr)).map(e => e.total));
  const mt = m => sum(all.filter(e => hgExpYm(e) === m).map(e => e.total));
  const months = Array.from({ length: 12 }, (_, i) => `${yr}-${String(i + 1).padStart(2, '0')}`), max = Math.max(1, ...months.map(mt));
  const card = c => {
    const cur = c.recs.filter(e => hgExpYm(e) === ym), st = cur.length ? hgStWorst(cur.map(e => hgOblStatus(ev, e, now))) : null;
    const old = c.recs.filter(e => hgExpYm(e) < ym && hgOblRem(ev, e) > 0), oldDue = sum(old.map(e => hgOblRem(ev, e)));
    const p = c.p, hist = c.recs.slice().sort((a, b) => hgExpYm(b).localeCompare(hgExpYm(a)));
    return `<div class="pcard"><div class="pc-top"><span class="pc-i">${hgHHEmoji(k)}</span><div class="pc-n"><b>${esc(c.label)}</b><small>${esc([p && p.ident, p && p.sub].filter(Boolean).join(' · ') || '')}</small></div><div class="pc-a"><b>${cur.length ? hgM(sum(cur.map(e => e.total))) : (p && p.fee ? hgM(p.fee) : '—')}</b><small>${cur.length ? hgMLabel(ym) : (p && p.fee ? L('নির্ধারিত', 'fixed') : '')}</small></div></div>
      ${cfg.days && p && (p.days || []).length ? `<div class="daychips">${hgDayNames().map((d, i) => `<i class="${p.days.includes(i) ? 'on' : ''}">${d}</i>`).join('')}</div>` : ''}
      <div class="pc-st">${st ? hgStBadge(st) : `<span class="hgb neg">${L('এই মাসের বিল লেখা হয়নি', 'No bill this month')}</span>`}${p && p.dueDay ? `<small class="muted">${L(`প্রতি মাসের ${p.dueDay} তারিখে`, `Due on the ${p.dueDay}th`)}</small>` : ''}</div>
      ${oldDue ? `<div class="bsum warn" style="margin-top:8px"><b>${L('পুরোনো বকেয়া', 'Older dues')} ${hgM(oldDue)}</b><span>${old.map(e => hgMLabel(hgExpYm(e))).join(', ')} · ${L('নতুন মাসের বিল থেকে আলাদা', 'kept apart from the new month')}</span></div>` : ''}
      ${act ? `<div class="btn-row mt8"><button type="button" class="btn sm primary" data-action="hg-bill-new" data-k="${k}" data-l="${esc(c.label)}">${cur.length ? L('আরেকটা বিল', 'Another bill') : L('এই মাসের বিল', 'This month\'s bill')}</button>${p ? `<button type="button" class="btn sm" data-action="hg-hprof-edit" data-id="${p.id}">${icon('edit', 16)}</button><button type="button" class="btn sm danger" data-action="hg-hprof-del" data-id="${p.id}">${icon('trash', 16)}</button>` : ''}</div>` : ''}
      ${hist.length ? `<details class="more"><summary>${L('মাসের ইতিহাস', 'Month history')} · ${hist.length}</summary><div class="list">${hist.slice(0, 12).map(e => hgListRowBill(ev, e)).join('')}</div></details>` : ''}</div>`;
  };
  const conns = hgConns(ev, k);
  // মিটার রিডিং থাকলে ব্যবহার ও খরচের পরিবর্তন
  const usage = cfg.read ? inM.filter(e => e.info.curr > 0 && e.info.curr >= (e.info.prev || 0)).map(e => { const u = e.info.curr - (e.info.prev || 0), pv = all.filter(x => hgExpYm(x) === hgMShift(ym, -1) && x.info.label === e.info.label && x.info.curr > 0)[0], pu = pv ? pv.info.curr - (pv.info.prev || 0) : null; return { e, u, pu }; }) : [];
  return `${hgCatHead(ev, k, esc(ev.name))}
    ${hgMinis([[hgMLabel(ym), hgM(tot)], [L('এ বছর', 'This year') + ' ' + yr, hgM(yearT)], [L('বাকি', 'Due'), hgM(due), due ? 'neg' : '']])}
    ${act ? `<div class="btn-row mt8"><button type="button" class="btn primary" data-action="hg-bill-new" data-k="${k}">${icon('plus', 18)} ${L('বিল যোগ', 'Add bill')}</button><button type="button" class="btn" data-action="hg-hprof-add" data-k="${k}">＋ ${k === 'househelp' ? L('নতুন জন', 'Add person') : L('সংযোগ', 'Connection')}</button></div>` : ''}
    ${usage.length ? `<div class="bsum"><b>${L('ব্যবহার (মিটার রিডিং থেকে)', 'Usage (from meter readings)')}</b><span>${usage.map(x => `${esc(x.e.info.label)}: ${x.u} ${L('ইউনিট', 'units')}${x.pu != null ? ` (${L('গত মাস', 'last month')} ${x.pu}, ${x.u >= x.pu ? '+' : '−'}${Math.abs(x.u - x.pu)})` : ''}${x.u > 0 ? ` · ${hgM(Math.round(x.e.total / x.u))}/${L('ইউনিট', 'unit')}` : ''}`).join(' · ')}</span></div>` : ''}
    ${conns.length ? conns.map(card).join('') : `<p class="hint">${L('বিল যোগ করলে এখানে মাস অনুযায়ী জমা থাকবে। প্রতি মাসের বিল, কত দেওয়া হলো, কত বাকি আর বিলের ছবি আলাদা আলাদা থাকে।', 'Add a bill and it is kept month by month: the amount, what was paid, what is due, and the bill photo, all separate for each month.')}</p>`}
    ${all.length ? `<div class="section-title">${yr} · ${L('মাস অনুযায়ী', 'by month')}</div><div class="rbars">${months.map(m => `<div class="rb"><span class="rb-l">${hgMLabel(m).slice(0, 5)}</span><span class="rb-t"><i style="width:${(mt(m) / max * 100).toFixed(1)}%"></i></span><b>${mt(m) ? hgM(mt(m)) : '—'}</b></div>`).join('')}</div>` : ''}`;
}
function hgListRowBill(ev, e) { const st = hgOblStatus(ev, e, hgToday()), rem = hgOblRem(ev, e); return `<button type="button" class="lrow" data-action="hg-rec-open" data-id="${e.id}"><span class="lic">${e.receipt && imgURL.get('hgr:' + e.receipt) ? '🖼️' : hgHHEmoji(e.category)}</span><span class="lmain"><b>${hgMLabel(hgExpYm(e))}</b><small>${hgStBadge(st)}${e.info.dueDate ? ` · ${L('নির্ধারিত', 'due')} ${fmtDate(e.info.dueDate)}` : ''}</small></span><span class="lend"><b>${hgM(e.total)}</b>${rem ? `<small class="neg">${L('বাকি', 'due')} ${hgM(rem)}</small>` : ''}</span></button>`; }
function hgBillForm(ev, k, o) {
  o = o || {}; const cfg = HG_CFG[k], e = o.e, i = (e && e.info) || {}, ym = i.ym || hgHUi.ym, label = i.label || o.label || '';
  const profs = hgProfs(ev, k), p = profs.find(x => x.name === label) || (profs.length === 1 && !e && !label ? profs[0] : null);
  const lab = label || (p ? p.name : cfg.def[isEN() ? 1 : 0]);
  hgPendingReceipt = undefined;
  return `${sheetHead(`${hgHHEmoji(k)} ${e ? L('বিল এডিট', 'Edit bill') : L('বিল যোগ', 'Add bill')}`, esc(hgCatLabel(ev, k)))}
  <form data-form="hg-hbill" data-live="hg-hh" data-kind="bill" data-cat="${k}" data-id="${e ? e.id : ''}" autocomplete="off">
    <label class="field"><span>${L(cfg.conn[0], cfg.conn[1])}</span><input class="input" name="label" maxlength="40" list="hg-conns" value="${esc(lab)}"><datalist id="hg-conns">${hgConns(ev, k).map(c => `<option value="${esc(c.label)}">`).join('')}</datalist></label>
    <div class="row2"><label class="field"><span>${L('কোন মাসের বিল', 'Bill for month')}</span><input class="input" type="month" name="month" value="${ym}"></label>
      <label class="field"><span>${k === 'househelp' ? L('মাসিক বেতন', 'Monthly pay') : L('বিলের মূল পরিমাণ', 'Base bill')}</span>${moneyInput('base', i.base ? String(i.base / 100) : (p && p.fee ? String(p.fee / 100) : ''), '0')}</label></div>
    <div class="row2"><label class="field"><span>${L(cfg.extraL[0], cfg.extraL[1])}</span>${moneyInput('extra', i.extra ? String(i.extra / 100) : '', '0')}</label>
      <label class="field"><span>${L('ডিসকাউন্ট / সমন্বয় (কমবে)', 'Discount / adjustment')}</span>${moneyInput('discount', i.discount ? String(i.discount / 100) : '', '0')}</label></div>
    ${cfg.read ? `<div class="row2"><label class="field"><span>${L('আগের মিটার রিডিং (ঐচ্ছিক)', 'Previous reading (optional)')}</span><input class="input" name="prev" inputmode="decimal" value="${i.prev || ''}"></label><label class="field"><span>${L('বর্তমান রিডিং (ঐচ্ছিক)', 'Current reading (optional)')}</span><input class="input" name="curr" inputmode="decimal" value="${i.curr || ''}"></label></div>` : ''}
    <div class="preview" data-tot></div><div class="preview" data-cmp></div>
    <label class="field"><span>${L('নির্ধারিত পরিশোধের তারিখ (ঐচ্ছিক)', 'Due date (optional)')}</span><input class="input" type="date" name="dueDate" value="${esc(i.dueDate || (p && p.dueDay ? hgDueIn(ym, p.dueDay) : ''))}"></label>
    ${e ? '' : hgPayFields()}
    ${e ? '' : hgReceiptBlock(null)}
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
HG_LIVE_X.bill = f => {
  const ev = hgCur(), k = f.dataset.cat, base = toMinor(f.elements.base.value), extra = toMinor(f.elements.extra.value), disc = toMinor(f.elements.discount.value), tot = Math.max(0, base + extra - disc);
  $('[data-tot]', f).innerHTML = tot ? `${L('মোট বিল', 'Total bill')}: <b>${hgM(tot)}</b>` : '';
  const ym = f.elements.month.value, lab = f.elements.label.value.trim().toLowerCase();
  const prev = hgLive(ev).filter(x => x.category === k && x.info && x.info.kind === 'bill' && (x.info.label || '').toLowerCase() === lab && hgExpYm(x) < ym && x.id !== f.dataset.id).sort((a, b) => hgExpYm(b).localeCompare(hgExpYm(a)))[0];
  let t = '';
  if (prev && tot) t = L(`${hgMLabel(hgExpYm(prev))}: ${hgM(prev.total)} → এবার ${hgM(tot)} <b class="${tot > prev.total ? 'neg' : 'pos'}">${tot === prev.total ? 'একই' : (tot > prev.total ? '+' : '−') + hgM(Math.abs(tot - prev.total))}</b>`, `${hgMLabel(hgExpYm(prev))}: ${hgM(prev.total)} → now ${hgM(tot)} <b class="${tot > prev.total ? 'neg' : 'pos'}">${tot === prev.total ? 'same' : (tot > prev.total ? '+' : '−') + hgM(Math.abs(tot - prev.total))}</b>`);
  if (f.elements.curr) { const c = hgNum(f.elements.curr.value), p = hgNum(f.elements.prev.value); if (c > 0 && c >= p) t += `${t ? '<br>' : ''}${L('ব্যবহার', 'Usage')}: <b>${c - p}</b> ${L('ইউনিট', 'units')}${tot && c > p ? ` · ${hgM(Math.round(tot / (c - p)))}/${L('ইউনিট', 'unit')}` : ''}`; }
  $('[data-cmp]', f).innerHTML = t;
};
Object.assign(FORMS, {
  'hg-hbill': async f => {
    const ev = hgGuard(); if (!ev) return; const k = f.dataset.cat, cfg = HG_CFG[k];
    const label = f.elements.label.value.trim(), month = f.elements.month.value || hgHUi.ym, base = toMinor(f.elements.base.value), extra = toMinor(f.elements.extra.value), disc = toMinor(f.elements.discount.value), total = base + extra - disc;
    if (!label) return fail(f, L('সংযোগ বা বিলের নাম লিখুন', 'Enter the connection or bill name'), 'label');
    if (!(base > 0)) return fail(f, L('বিলের পরিমাণ লিখুন', 'Enter the bill amount'), 'base');
    if (total <= 0) return fail(f, L('ডিসকাউন্ট মোটের চেয়ে বেশি হতে পারে না', 'The discount cannot exceed the bill'), 'discount');
    const prev = f.elements.prev ? hgNum(f.elements.prev.value) : 0, curr = f.elements.curr ? hgNum(f.elements.curr.value) : 0;
    if (curr > 0 && curr < prev) return fail(f, L('বর্তমান রিডিং আগের রিডিংয়ের চেয়ে কম হতে পারে না', 'The current reading cannot be below the previous one'), 'curr');
    if (!f.dataset.id && f.dataset.dupok !== '1' && hgLive(ev).some(e => e.category === k && e.info && e.info.kind === 'bill' && (e.info.label || '').toLowerCase() === label.toLowerCase() && hgExpYm(e) === month)) { f.dataset.dupok = '1'; return fail(f, L('এই মাসের এই বিল আগেই লেখা আছে। আরেকটা আলাদা বিল হলে আবার সেভ চাপুন।', 'This bill for this month already exists. Save again if it is a separate bill.')); }
    const p = hgProfs(ev, k).find(x => x.name.toLowerCase() === label.toLowerCase());
    await hgFinish(ev, f, { title: `${label} · ${hgMLabel(month)}`, category: k, total, date: today(), info: { kind: 'bill', label, ym: month, base, extra, discount: disc, prev, curr, dueDate: f.elements.dueDate.value || '', profileId: p ? p.id : '' } });
  },
});
Object.assign(ACTIONS, {
  'hg-bill-new': el => { const ev = hgGuard(); if (ev) openSheet(hgBillForm(ev, el.dataset.k, { label: el.dataset.l || '' })); },
});

/* ---------- প্রোফাইল: সংযোগ / কাজের জন / শিক্ষক ---------- */
function hgProfForm(ev, k, p) {
  const v = p || { name: '', ident: '', sub: '', days: [], fee: 0, dueDay: '', note: '', who: '', time: '', rateType: 'month', rate: 0 };
  if (k === 'education') {
    return `${sheetHead(`🎓 ${p ? L('শিক্ষক এডিট', 'Edit teacher') : L('নতুন শিক্ষক / কোচিং', 'New teacher / coaching')}`, esc(ev.name))}
    <form data-form="hg-hprof" data-k="${k}" data-id="${p ? p.id : ''}" autocomplete="off">
      ${hgWhoField(ev, 'who', L('কোন শিক্ষার্থী পড়ে', 'Which student'), v.who)}
      <label class="field"><span>${L('শিক্ষক / কোচিংয়ের নাম', 'Teacher / coaching name')}</span><input class="input" name="name" maxlength="40" value="${esc(v.name)}"></label>
      <label class="field"><span>${L('কোন বিষয় পড়ান', 'Subject')}</span><input class="input" name="sub" maxlength="40" value="${esc(v.sub)}"></label>
      <div class="field"><span class="flabel">${L('কোন কোন দিন পড়ান', 'Which days')}</span><div class="chips">${hgDayNames().map((d, i) => `<label class="chip"><input type="checkbox" name="day_${i}" ${(v.days || []).includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></div>
      <label class="field"><span>${L('কখন (সময়)', 'Time')}</span><input class="input" name="time" maxlength="30" value="${esc(v.time || '')}" placeholder="${L('যেমন বিকেল ৫টা', 'e.g. 5 pm')}"></label>
      <div class="field"><span class="flabel">${L('বেতন কীভাবে', 'How is the fee set')}</span>${seg('rateType', [['month', L('মাসে একটা ফি', 'Fixed per month')], ['class', L('প্রতি ক্লাসে', 'Per class')]], v.rateType || 'month')}</div>
      <div class="row2"><label class="field"><span data-ratel>${L('ফি (টাকা)', 'Fee')}</span>${moneyInput('rate', v.rate ? String(v.rate / 100) : '', '0')}</label>
        <label class="field"><span>${L('মাসের কত তারিখে দিতে হয়', 'Day of month it is due')}</span><input class="input" name="dueDay" inputmode="numeric" maxlength="2" value="${esc(v.dueDay)}" placeholder="5"></label></div>
      <label class="field"><span>${L('যোগাযোগ (ফোন) ও নোট', 'Contact (phone) & note')}</span><input class="input" name="note" maxlength="80" value="${esc(v.note || '')}"></label>
      <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
  }
  const cfg = HG_CFG[k];
  return `${sheetHead(`${hgHHEmoji(k)} ${p ? L('সংযোগ এডিট', 'Edit') : (k === 'househelp' ? L('নতুন জন', 'Add person') : L('নতুন সংযোগ', 'New connection'))}`, esc(hgCatLabel(ev, k)))}
  <form data-form="hg-hprof" data-k="${k}" data-id="${p ? p.id : ''}" autocomplete="off">
    <label class="field"><span>${L(cfg.conn[0], cfg.conn[1])}</span><input class="input" name="name" maxlength="40" value="${esc(v.name)}"></label>
    <label class="field"><span>${L(cfg.idl[0], cfg.idl[1])}</span><input class="input" name="ident" maxlength="60" value="${esc(v.ident || '')}"></label>
    ${cfg.days ? `<div class="field"><span class="flabel">${L('কোন কোন দিন আসে', 'Which days')}</span><div class="chips">${hgDayNames().map((d, i) => `<label class="chip"><input type="checkbox" name="day_${i}" ${(v.days || []).includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></div>` : ''}
    <div class="row2"><label class="field"><span>${L(cfg.feeL[0], cfg.feeL[1])}</span>${moneyInput('fee', v.fee ? String(v.fee / 100) : '', '0')}</label>
      <label class="field"><span>${L('মাসের কত তারিখে দিতে হয়', 'Day of month it is due')}</span><input class="input" name="dueDay" inputmode="numeric" maxlength="2" value="${esc(v.dueDay)}" placeholder="10"></label></div>
    <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="80" value="${esc(v.note || '')}"></label>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
Object.assign(FORMS, {
  'hg-hprof': f => {
    const ev = hgGuard(); if (!ev) return; const k = f.dataset.k, edu = k === 'education';
    const name = f.elements.name.value.trim(); if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    const dd = f.elements.dueDay.value.trim(); if (dd && !(Number(dd) >= 1 && Number(dd) <= 31)) return fail(f, L('তারিখ ১ থেকে ৩১ এর মধ্যে লিখুন', 'Enter a day between 1 and 31'), 'dueDay');
    const days = (edu || HG_CFG[k].days) ? hgDayNames().map((d, i) => i).filter(i => f.elements['day_' + i] && f.elements['day_' + i].checked) : [];
    const o = edu ? { cat: k, who: f.elements.who.value.trim(), name, sub: f.elements.sub.value.trim(), days, time: f.elements.time.value.trim(), rateType: f.elements.rateType.value, rate: toMinor(f.elements.rate.value), dueDay: dd, note: f.elements.note.value.trim() }
      : { cat: k, name, ident: f.elements.ident.value.trim(), days, fee: toMinor(f.elements.fee.value), dueDay: dd, note: f.elements.note.value.trim() };
    const id = f.dataset.id, p = id && hgHH(ev).profiles.find(x => x.id === id);
    if (!p && hgProfs(ev, k).some(x => x.name.toLowerCase() === name.toLowerCase() && (x.who || '') === (o.who || ''))) return fail(f, L('এটা আগেই যোগ করা আছে', 'This already exists'), 'name');
    if (p) Object.assign(p, o); else hgHH(ev).profiles.push(Object.assign({ id: uid(), createdAt: Date.now() }, o));
    closeSheet(); hgCommit(ev, `${edu ? 'শিক্ষক' : 'সংযোগ'}: ${name}`, `${edu ? 'Teacher' : 'Connection'}: ${name}`);
    setTimeout(() => { if (hgHUi.cat) openSheet(hgCatScreen(hgCur(), hgHUi.cat)); }, 350);
  },
});
Object.assign(ACTIONS, {
  'hg-hprof-add': el => { const ev = hgGuard(); if (ev) openSheet(hgProfForm(ev, el.dataset.k, null)); },
  'hg-hprof-edit': el => { const ev = hgGuard(); if (!ev) return; const p = hgHH(ev).profiles.find(x => x.id === el.dataset.id); if (p) openSheet(hgProfForm(ev, p.cat, p)); },
  'hg-hprof-del': el => {
    const ev = hgGuard(); if (!ev) return; const p = hgHH(ev).profiles.find(x => x.id === el.dataset.id); if (!p) return;
    if (!confirm(L(`"${p.name}" মুছবেন? আগের খরচ ও বিলের হিসাব থাকবে।`, `Delete "${p.name}"? Past expenses and bills stay.`))) return;
    undoable(DELETED(), () => { p.del = Date.now(); }); if (hgHUi.cat) setTimeout(() => openSheet(hgCatScreen(hgCur(), hgHUi.cat)), 50);
  },
});

/* ---------- পড়াশোনা ---------- */
const HG_EDU_TYPES = () => [L('স্কুল/কলেজের বেতন', 'School/college fee'), L('কোচিং ফি', 'Coaching fee'), L('ভর্তি ফি', 'Admission fee'), L('পরীক্ষার ফি', 'Exam fee'), L('বই ও খাতা', 'Books & notebooks'), L('স্টেশনারি', 'Stationery'), L('অনলাইন কোর্স', 'Online course'), L('অন্যান্য', 'Other')];
function hgEduScreen(ev) {
  const ym = hgHUi.ym, act = ev.status === 'active', now = hgToday(), ps = hgProfs(ev, 'education');
  const inM = hgLive(ev).filter(e => e.category === 'education' && hgExpYm(e) === ym);
  const recsOf = p => hgLive(ev).filter(e => e.info && e.info.kind === 'edu' && e.info.profileId === p.id);
  const students = [...new Set(ps.map(p => (p.who || '').trim()).concat(inM.map(e => (e.info && e.info.student) || '')).filter(Boolean))];
  const card = p => {
    const rs = recsOf(p), cur = rs.filter(e => hgExpYm(e) === ym), st = cur.length ? hgStWorst(cur.map(e => hgOblStatus(ev, e, now))) : null, old = rs.filter(e => hgExpYm(e) < ym && hgOblRem(ev, e) > 0), oldDue = sum(old.map(e => hgOblRem(ev, e)));
    return `<div class="pcard"><div class="pc-top"><span class="pc-i">👩‍🏫</span><div class="pc-n"><b>${esc(p.name)}</b><small>${esc([p.sub, p.time].filter(Boolean).join(' · '))}${p.note ? ' · ' + esc(p.note) : ''}</small></div><div class="pc-a"><b>${p.rate ? hgM(p.rate) : '—'}</b><small>${p.rateType === 'class' ? L('প্রতি ক্লাস', 'per class') : L('প্রতি মাস', 'per month')}</small></div></div>
      ${(p.days || []).length ? `<div class="daychips">${hgDayNames().map((d, i) => `<i class="${p.days.includes(i) ? 'on' : ''}">${d}</i>`).join('')}</div><small class="muted">${L(`সপ্তাহে ${p.days.length} দিন`, `${p.days.length} day(s) a week`)}</small>` : ''}
      <div class="pc-st">${st ? hgStBadge(st) : `<span class="hgb neg">${L('এই মাসের ফি লেখা হয়নি', 'This month not recorded')}</span>`}${p.dueDay ? `<small class="muted">${L(`প্রতি মাসের ${p.dueDay} তারিখে`, `Due on the ${p.dueDay}th`)}</small>` : ''}</div>
      ${cur.length ? `<div class="list mt8">${cur.map(e => hgListRowBill(ev, e).replace(hgMLabel(hgExpYm(e)), esc(e.title))).join('')}</div>` : ''}
      ${oldDue ? `<div class="bsum warn" style="margin-top:8px"><b>${L('পুরোনো বকেয়া', 'Older dues')} ${hgM(oldDue)}</b><span>${old.map(e => hgMLabel(hgExpYm(e))).join(', ')}</span></div>` : ''}
      ${act ? `<div class="btn-row mt8"><button type="button" class="btn sm primary" data-action="hg-edu-pay" data-id="${p.id}">${L('এই মাসের ফি', 'This month\'s fee')}</button><button type="button" class="btn sm" data-action="hg-hprof-edit" data-id="${p.id}">${icon('edit', 16)}</button><button type="button" class="btn sm danger" data-action="hg-hprof-del" data-id="${p.id}">${icon('trash', 16)}</button></div>` : ''}</div>`;
  };
  const sCard = s => { const es = inM.filter(e => ((e.info && e.info.student) || '') === s), tot = sum(es.map(e => e.total)), due = sum(es.map(e => hgOblRem(ev, e))), mine = ps.filter(p => (p.who || '').trim() === s);
    return `<div class="section-title">🎓 ${esc(s)} · ${L(`${mine.length} জন শিক্ষক`, `${mine.length} teacher(s)`)}<span class="stot">${hgM(tot)}</span></div>
      ${hgMinis([[L('এই মাসে খরচ', 'This month'), hgM(tot)], [L('পরিশোধিত', 'Paid'), hgM(tot - due)], [L('বকেয়া', 'Due'), hgM(due), due ? 'neg' : '']])}${mine.map(card).join('')}`; };
  const misc = inM.filter(e => e.info && e.info.kind === 'edu-misc').sort(hgByDate);
  return `${hgCatHead(ev, 'education', esc(ev.name))}
    ${hgMinis([[hgMLabel(ym), hgM(sum(inM.map(e => e.total)))], [L('পরিশোধিত', 'Paid'), hgM(sum(inM.map(e => e.total - hgOblRem(ev, e))))], [L('বকেয়া', 'Due'), hgM(sum(inM.map(e => hgOblRem(ev, e)))), sum(inM.map(e => hgOblRem(ev, e))) ? 'neg' : '']])}
    ${act ? `<div class="btn-row mt8"><button type="button" class="btn primary" data-action="hg-hprof-add" data-k="education">${icon('plus', 18)} ${L('শিক্ষক / কোচিং', 'Teacher / coaching')}</button><button type="button" class="btn" data-action="hg-edu-misc">＋ ${L('শিক্ষাব্যয়', 'Other cost')}</button></div>` : ''}
    ${ps.length ? students.map(sCard).join('') : `<p class="hint">${L('প্রতিটা শিক্ষার্থীর শিক্ষক, কোন বিষয়, কোন কোন দিন, মাসে কত ফি, কত দেওয়া হলো আর কত বাকি, সব এখানে জমা থাকবে। শুরুতে "শিক্ষক / কোচিং" যোগ করুন।', 'Each student\'s teachers, subject, days, monthly fee, what was paid and what is due are kept here. Start by adding a teacher or coaching.')}</p>`}
    <div class="section-title">${L('অন্যান্য শিক্ষাব্যয়', 'Other education costs')} · ${misc.length}</div>
    ${misc.length ? `<div class="list">${misc.map(e => hgListRow(ev, e).replace('hg-edit-expense', 'hg-rec-open')).join('')}</div>` : `<p class="hint">${L('স্কুলের বেতন, ভর্তি ফি, পরীক্ষার ফি, বই-খাতা, স্টেশনারি, অনলাইন কোর্স এখানে লিখুন।', 'School fees, admission, exam fees, books, stationery, online courses go here.')}</p>`}`;
}
function hgEduPayForm(ev, p, o) {
  o = o || {}; const e = o.e, i = (e && e.info) || {}, ym = i.ym || hgHUi.ym, perClass = (p.rateType || 'month') === 'class';
  hgPendingReceipt = undefined;
  return `${sheetHead(`🎓 ${esc(p.name)}`, esc([p.who, p.sub].filter(Boolean).join(' · ')))}
  <form data-form="hg-edupay" data-live="hg-hh" data-kind="edu" data-id="${e ? e.id : ''}" data-pid="${p.id}" data-pc="${perClass ? 1 : 0}" data-rate="${p.rate || 0}" autocomplete="off">
    <div class="row2"><label class="field"><span>${L('কোন মাসের ফি', 'Fee for month')}</span><input class="input" type="month" name="month" value="${ym}"></label>
      ${perClass ? `<label class="field"><span>${L('কয়টা ক্লাস হলো', 'Classes held')}</span><input class="input" name="classes" inputmode="numeric" value="${i.classes || ''}"></label>` : `<label class="field"><span>${L('মাসিক ফি', 'Monthly fee')}</span>${moneyInput('base', i.base ? String(i.base / 100) : (p.rate ? String(p.rate / 100) : ''), '0')}</label>`}</div>
    ${perClass ? `<p class="hint" style="margin-top:-6px">${L(`প্রতি ক্লাস ${hgM(p.rate || 0)}`, `${hgM(p.rate || 0)} per class`)}</p>` : ''}
    <details class="more" ${i.absent || i.extraN || i.extraFee ? 'open' : ''}><summary><span class="ds-t">${L('অনুপস্থিত, অতিরিক্ত ক্লাস বা অতিরিক্ত ফি', 'Absent / extra classes / extra fee')}</span></summary>
      <div class="row2"><label class="field"><span>${L('অনুপস্থিত ক্লাস (সংখ্যা)', 'Absent classes')}</span><input class="input" name="absent" inputmode="numeric" value="${i.absent || ''}"></label><label class="field"><span>${L('প্রতিটার জন্য কাটা হবে', 'Deduct per class')}</span>${moneyInput('dedPer', i.dedPer ? String(i.dedPer / 100) : '', '0')}</label></div>
      <div class="row2"><label class="field"><span>${L('অতিরিক্ত ক্লাস (সংখ্যা)', 'Extra classes')}</span><input class="input" name="extraN" inputmode="numeric" value="${i.extraN || ''}"></label><label class="field"><span>${L('প্রতিটার টাকা', 'Per extra class')}</span>${moneyInput('extraPer', i.extraPer ? String(i.extraPer / 100) : '', '0')}</label></div>
      <label class="field"><span>${L('অতিরিক্ত ফি (যেমন পরীক্ষা, বই)', 'Extra fee')}</span>${moneyInput('extraFee', i.extraFee ? String(i.extraFee / 100) : '', '0')}</label></details>
    <div class="preview" data-tot></div>
    <label class="field"><span>${L('নির্ধারিত পরিশোধের তারিখ', 'Due date')}</span><input class="input" type="date" name="dueDate" value="${esc(i.dueDate || (p.dueDay ? hgDueIn(ym, p.dueDay) : ''))}"></label>
    ${e ? '' : hgPayFields()}${e ? '' : hgReceiptBlock(null)}
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
function hgEduCalc(f) {
  const pc = f.dataset.pc === '1', rate = Number(f.dataset.rate) || 0, base = pc ? rate * Math.floor(hgNum(f.elements.classes.value)) : toMinor(f.elements.base.value);
  const absent = Math.floor(hgNum(f.elements.absent.value)) * toMinor(f.elements.dedPer.value), extra = Math.floor(hgNum(f.elements.extraN.value)) * toMinor(f.elements.extraPer.value), ef = toMinor(f.elements.extraFee.value);
  return { base, total: Math.max(0, base - absent + extra + ef) };
}
HG_LIVE_X.edu = f => { const c = hgEduCalc(f); $('[data-tot]', f).innerHTML = c.total ? `${L('এই মাসের মোট ফি', 'Total fee this month')}: <b>${hgM(c.total)}</b>` : ''; };
function hgEduMiscForm(ev, e) {
  const i = (e && e.info) || {}; hgPendingReceipt = undefined;
  return `${sheetHead(`🎓 ${L('শিক্ষাব্যয়', 'Education cost')}`, esc(ev.name))}
  <form data-form="hg-edumisc" data-live="hg-hh" data-kind="edumisc" data-id="${e ? e.id : ''}" autocomplete="off">
    ${hgWhoField(ev, 'student', L('কোন শিক্ষার্থীর', 'Which student'), i.student)}
    <div class="field"><span class="flabel">${L('কীসের খরচ', 'What for')}</span><div class="chips">${HG_EDU_TYPES().map((t, n) => `<label class="chip"><input type="radio" name="etype" value="${esc(t)}" ${(i.type ? i.type === t : n === 0) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div></div>
    <label class="field"><span>${L('কাকে / কোথায় দেওয়া (ঐচ্ছিক)', 'Paid to (optional)')}</span><input class="input" name="payee" maxlength="50" value="${esc(i.payee || '')}"></label>
    <div class="row2"><label class="field"><span>${L('টাকা', 'Amount')}</span>${moneyInput('amt', e ? String(e.total / 100) : '', '0')}</label><label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc((e && e.date) || today())}"></label></div>
    ${e ? '' : hgPayFields()}${e ? '' : hgReceiptBlock(null)}
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
Object.assign(FORMS, {
  'hg-edupay': async f => {
    const ev = hgGuard(); if (!ev) return; const p = hgHH(ev).profiles.find(x => x.id === f.dataset.pid) || { id: '', name: '', who: '', sub: '' };
    const c = hgEduCalc(f), month = f.elements.month.value || hgHUi.ym;
    if (!(c.base > 0)) return fail(f, f.dataset.pc === '1' ? L('কয়টা ক্লাস হলো লিখুন', 'Enter the classes held') : L('ফি লিখুন', 'Enter the fee'), f.dataset.pc === '1' ? 'classes' : 'base');
    if (!(c.total > 0)) return fail(f, L('কাটার পর ফি শূন্য হয়ে যাচ্ছে', 'After deductions the fee is zero'));
    if (!f.dataset.id && f.dataset.dupok !== '1' && hgLive(ev).some(e => e.info && e.info.kind === 'edu' && e.info.profileId === p.id && hgExpYm(e) === month)) { f.dataset.dupok = '1'; return fail(f, L('এই মাসের ফি আগেই লেখা আছে। আলাদা হলে আবার সেভ চাপুন।', 'This month is already recorded. Save again if it is separate.')); }
    await hgFinish(ev, f, { title: `${p.name} · ${hgMLabel(month)}`, category: 'education', total: c.total, date: today(), info: { kind: 'edu', profileId: p.id, student: p.who, teacher: p.name, subject: p.sub, ym: month, base: c.base, classes: Math.floor(hgNum((f.elements.classes || {}).value || 0)), absent: Math.floor(hgNum(f.elements.absent.value)), dedPer: toMinor(f.elements.dedPer.value), extraN: Math.floor(hgNum(f.elements.extraN.value)), extraPer: toMinor(f.elements.extraPer.value), extraFee: toMinor(f.elements.extraFee.value), dueDate: f.elements.dueDate.value || '' } });
  },
  'hg-edumisc': async f => {
    const ev = hgGuard(); if (!ev) return; const student = f.elements.student.value.trim(), total = toMinor(f.elements.amt.value), type = f.elements.etype.value;
    if (!student) return fail(f, L('কোন শিক্ষার্থীর তা লিখুন', 'Enter the student'), 'student'); if (!(total > 0)) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    const date = f.elements.date.value || today();
    await hgFinish(ev, f, { title: `${student} · ${type}`, category: 'education', total, date, info: { kind: 'edu-misc', student, type, payee: f.elements.payee.value.trim(), ym: date.slice(0, 7) } });
  },
});
Object.assign(ACTIONS, {
  'hg-edu-pay': el => { const ev = hgGuard(); if (!ev) return; const p = hgHH(ev).profiles.find(x => x.id === el.dataset.id); if (p) openSheet(hgEduPayForm(ev, p)); },
  'hg-edu-misc': () => { const ev = hgGuard(); if (ev) openSheet(hgEduMiscForm(ev, null)); },
});

/* ---------- চিকিৎসা ---------- */
const hgMedRecs = (ev, ym) => hgLive(ev).filter(e => e.category === 'medical' && e.info && (e.info.kind === 'visit' || e.info.kind === 'med') && (!ym || hgExpYm(e) === ym));
function hgMedSummary(ev, ym) {
  const rs = hgMedRecs(ev, ym), per = {}, meds = {};
  rs.forEach(e => { const w = e.info.patient || L('নাম নেই', 'No name'), r = per[w] || (per[w] = { w, fee: 0, other: 0, med: 0, total: 0, due: 0 });
    if (e.info.kind === 'visit') { r.fee += e.info.fee || 0; r.other += e.total - (e.info.fee || 0); } else { r.med += e.total; const k = e.info.med || e.title; meds[k] = (meds[k] || 0) + e.total; }
    r.total += e.total; r.due += hgOblRem(ev, e); });
  return { rows: Object.values(per).sort((a, b) => b.total - a.total), meds: Object.entries(meds).sort((a, b) => b[1] - a[1]), total: sum(rs.map(e => e.total)), due: sum(rs.map(e => hgOblRem(ev, e))), fee: sum(Object.values(per).map(r => r.fee)), other: sum(Object.values(per).map(r => r.other)), med: sum(Object.values(per).map(r => r.med)) };
}
function hgMedScreen(ev) {
  const ym = hgHUi.ym, act = ev.status === 'active', sub = hgHUi.med, now = hgToday();
  const tabs = [['sum', L('সারাংশ', 'Summary')], ['visit', L('ডাক্তার', 'Doctors')], ['med', L('ওষুধ', 'Medicines')], ['people', L('সদস্য', 'People')]];
  const seg4 = `<div class="seg mb12">${tabs.map(([k, l]) => `<button type="button" class="${sub === k ? 'active' : ''}" data-action="hg-medsub" data-v="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (sub === 'sum') {
    const s = hgMedSummary(ev, ym), p = hgMedSummary(ev, hgMShift(ym, -1));
    body = `${hgMinis([[L('মোট চিকিৎসা খরচ', 'Total'), hgM(s.total)], [L('গত মাস', 'Last month'), p.total ? hgM(p.total) : '—'], [L('বকেয়া', 'Due'), hgM(s.due), s.due ? 'neg' : '']])}
      ${s.total && p.total ? `<p class="hint" style="margin:8px 0 0">${s.total >= p.total ? '+' : '−'}${hgM(Math.abs(s.total - p.total))} ${L('গত মাসের তুলনায়', 'vs last month')}</p>` : ''}
      ${hgMinis([[L('ডাক্তারের ফি', 'Doctor fees'), hgM(s.fee)], [L('পরীক্ষা ও হাসপাতাল', 'Tests & hospital'), hgM(s.other)], [L('ওষুধ', 'Medicine'), hgM(s.med)]])}
      <div class="section-title">${L('সদস্য অনুযায়ী', 'By person')}</div>
      ${s.rows.length ? s.rows.map(r => `<div class="pcard"><div class="pc-top"><span class="pc-i">👤</span><div class="pc-n"><b>${esc(r.w)}</b><small>${L('ডাক্তার', 'Doctor')} ${hgM(r.fee)} · ${L('পরীক্ষা/অন্যান্য', 'Tests/other')} ${hgM(r.other)} · ${L('ওষুধ', 'Medicine')} ${hgM(r.med)}</small></div><div class="pc-a"><b>${hgM(r.total)}</b>${r.due ? `<small class="neg">${L('বাকি', 'due')} ${hgM(r.due)}</small>` : ''}</div></div></div>`).join('') : `<p class="hint">${L('এই মাসে কোনো চিকিৎসা খরচ লেখা হয়নি।', 'No medical cost this month.')}</p>`}
      ${s.meds.length ? `<div class="section-title">${L('ওষুধ অনুযায়ী খরচ', 'By medicine')}</div>${s.meds.map(([n, v]) => `<div class="hg-day"><span><b>${esc(n)}</b></span><b>${hgM(v)}</b></div>`).join('')}` : ''}`;
  } else if (sub === 'visit') {
    const visits = hgMedRecs(ev, ym).filter(e => e.info.kind === 'visit').sort(hgByDate), next = hgLive(ev).filter(e => e.info && e.info.kind === 'visit' && e.info.next && e.info.next >= now).sort((a, b) => a.info.next.localeCompare(b.info.next));
    body = `${act ? `<button type="button" class="btn primary block" data-action="hg-visit-add">${icon('plus', 18)} ${L('ডাক্তার দেখানো লিখুন', 'Add a doctor visit')}</button>` : ''}
      ${next.length ? `<div class="bsum"><b>📅 ${L('আসন্ন অ্যাপয়েন্টমেন্ট', 'Upcoming appointments')}</b><span>${next.slice(0, 3).map(e => `${esc(e.info.patient)} → ${esc(e.info.doctor || '')} ${fmtDate(e.info.next)}`).join(' · ')}</span></div>` : ''}
      <div class="section-title">${hgMLabel(ym)} · ${visits.length}</div>
      ${visits.length ? `<div class="list">${visits.map(e => `<button type="button" class="lrow" data-action="hg-rec-open" data-id="${e.id}"><span class="lic">🩺</span><span class="lmain"><b>${esc(e.info.patient)} → ${esc(e.info.doctor || L('ডাক্তার', 'doctor'))}</b><small>${esc([e.info.specialty, e.info.hospital].filter(Boolean).join(' · '))}${e.info.hospital || e.info.specialty ? ' · ' : ''}${fmtDate(e.date)} · ${hgStBadge(hgOblStatus(ev, e, now))}</small></span><span class="lend"><b>${hgM(e.total)}</b></span></button>`).join('')}</div>` : `<p class="hint">${L('এই মাসে ডাক্তার দেখানো লেখা হয়নি। কাকে, কোন ডাক্তার, কোন হাসপাতালে, কত টাকা, সব এখানে জমা থাকবে।', 'No visits this month. Who was seen, by which doctor, at which hospital and the cost are kept here.')}</p>`}`;
  } else if (sub === 'med') {
    const all = hgLive(ev).filter(e => e.category === 'medical' && e.info && e.info.kind === 'med'), g = {};
    all.forEach(e => { const k = (e.info.patient || '').toLowerCase() + '|' + (e.info.med || '').toLowerCase(); (g[k] = g[k] || []).push(e); });
    const groups = Object.values(g).map(a => a.sort(hgByDate)).sort((a, b) => hgByDate(a[0], b[0]));
    body = `${act ? `<button type="button" class="btn primary block" data-action="hg-med-add">${icon('plus', 18)} ${L('ওষুধ কিনলাম / যোগ', 'Add medicine / purchase')}</button>` : ''}
      <p class="hint">${L('ওষুধের নাম আর ডাক্তারের নির্দেশ শুধু রেকর্ড। অ্যাপ নিজে থেকে কোনো ওষুধ, ডোজ বা চিকিৎসার পরামর্শ দেয় না।', 'Medicine names and the doctor\'s instructions are only records. The app never suggests medicines, doses or treatment.')}</p>
      ${groups.map(a => { const l = a[0], pr = a[1], i = l.info, unitD = pr && l.info.unit && pr.info.unit ? l.info.unit - pr.info.unit : null, d = unitD != null ? unitD : (pr ? l.total - pr.total : null);
        return `<div class="pcard"><div class="pc-top"><span class="pc-i">💊</span><div class="pc-n"><b>${esc(i.med)}${i.strength ? ' · ' + esc(i.strength) : ''}</b><small>${esc([i.patient, i.dose].filter(Boolean).join(' · '))}</small></div><div class="pc-a"><b>${i.unit ? hgM(i.unit) : hgM(l.total)}</b><small>${i.unit ? L('একটার দাম', 'unit price') : L('শেষ দাম', 'last price')}</small></div></div>
          ${d ? `<div class="pc-st"><span class="hgb ${d > 0 ? 'neg' : 'pos'}">${L('গত বারের চেয়ে', 'vs last time')} ${d > 0 ? '+' : '−'}${hgM(Math.abs(d))}</span></div>` : ''}
          ${i.remaining && i.perDay > 0 ? `<small class="muted">${L(`অবশিষ্ট ${i.remaining}, দিনে ${i.perDay}টা, প্রায় ${Math.floor(i.remaining / i.perDay)} দিন চলবে`, `${i.remaining} left, ${i.perDay}/day, about ${Math.floor(i.remaining / i.perDay)} days`)}</small>` : ''}
          <details class="more"><summary>${L('কেনার ইতিহাস', 'Purchase history')} · ${a.length}</summary>${a.map(e => `<button type="button" class="hg-day rowbtn" data-action="hg-rec-open" data-id="${e.id}"><span><b>${fmtDate(e.date)}</b><small>${esc(e.info.pharmacy || '')}${e.info.unit ? ` · ${hgM(e.info.unit)} × ${e.info.packs}` : ''}</small></span><b>${hgM(e.total)}</b></button>`).join('')}</details>
          ${act ? `<div class="btn-row mt8"><button type="button" class="btn sm primary" data-action="hg-med-add" data-from="${l.id}">${L('আবার কিনলাম', 'Bought again')}</button></div>` : ''}</div>`; }).join('') || `<p class="hint">${L('এখনও কোনো ওষুধ লেখা হয়নি। প্রতিবার কেনার সময় নতুন দাম ও পরিমাণ লিখলে দাম বাড়া-কমা ধরা পড়বে।', 'No medicine yet. Enter the new price and quantity each time and price changes show up.')}</p>`}`;
  } else {
    const ppl = hgHH(ev).people.filter(p => !p.del);
    body = `${act ? `<button type="button" class="btn primary block" data-action="hg-person-add">${icon('plus', 18)} ${L('সদস্য যোগ', 'Add a person')}</button>` : ''}
      ${ppl.map(p => { const rs = hgLive(ev).filter(e => e.info && (e.info.patient || '') === p.name && e.category === 'medical'); return `<div class="pcard"><div class="pc-top"><span class="pc-i">👤</span><div class="pc-n"><b>${esc(p.name)}</b><small>${esc(p.info || '')}</small></div><div class="pc-a"><b>${hgM(sum(rs.map(e => e.total)))}</b><small>${L('মোট চিকিৎসা খরচ', 'total medical')}</small></div></div>
        ${p.notes ? `<p class="hint" style="margin:8px 0 0">📝 ${esc(p.notes)}</p>` : ''}${p.follow ? `<p class="hint" style="margin:6px 0 0">🔁 ${L('চলমান / ফলো-আপ', 'Ongoing / follow-up')}: ${esc(p.follow)}</p>` : ''}
        ${act ? `<div class="btn-row mt8"><button type="button" class="btn sm" data-action="hg-person-edit" data-id="${p.id}">${icon('edit', 16)}</button><button type="button" class="btn sm danger" data-action="hg-person-del" data-id="${p.id}">${icon('trash', 16)}</button></div>` : ''}</div>`; }).join('') || `<p class="hint">${L('পরিবারের প্রতিটা সদস্যের আলাদা প্রোফাইল রাখুন: নাম, পরিচিতি, চিকিৎসার নোট, চলমান চিকিৎসা। তাহলে প্রত্যেকের চিকিৎসা ও ওষুধের হিসাব আলাদা থাকবে।', 'Keep a profile for each family member: name, details, medical notes and ongoing treatment, so everyone\'s treatment and medicine costs stay separate.')}</p>`}`;
  }
  return `${hgCatHead(ev, 'medical', esc(ev.name))}${seg4}${body}`;
}
function hgVisitForm(ev, e) {
  const i = (e && e.info) || {}; hgPendingReceipt = undefined;
  return `${sheetHead(`🩺 ${e ? L('ডাক্তার দেখানো এডিট', 'Edit visit') : L('ডাক্তার দেখানো', 'Doctor visit')}`, esc(ev.name))}
  <form data-form="hg-visit" data-live="hg-hh" data-kind="visit" data-id="${e ? e.id : ''}" autocomplete="off">
    ${hgWhoField(ev, 'patient', L('কার চিকিৎসা', 'Patient'), i.patient)}
    <div class="row2"><label class="field"><span>${L('ডাক্তারের নাম', 'Doctor')}</span><input class="input" name="doctor" maxlength="40" value="${esc(i.doctor || '')}"></label><label class="field"><span>${L('বিশেষত্ব (জানা থাকলে)', 'Specialty')}</span><input class="input" name="specialty" maxlength="40" value="${esc(i.specialty || '')}"></label></div>
    <label class="field"><span>${L('হাসপাতাল / ক্লিনিক', 'Hospital / clinic')}</span><input class="input" name="hospital" maxlength="50" value="${esc(i.hospital || '')}"></label>
    <div class="row2"><label class="field"><span>${L('ভিজিটের তারিখ', 'Visit date')}</span><input class="input" type="date" name="date" value="${esc((e && e.date) || today())}"></label><label class="field"><span>${L('পরবর্তী অ্যাপয়েন্টমেন্ট', 'Next appointment')}</span><input class="input" type="date" name="next" value="${esc(i.next || '')}"></label></div>
    <div class="row2"><label class="field"><span>${L('ডাক্তারের ফি', 'Doctor fee')}</span>${moneyInput('fee', i.fee ? String(i.fee / 100) : '', '0')}</label><label class="field"><span>${L('পরীক্ষা-নিরীক্ষা', 'Tests')}</span>${moneyInput('tests', i.tests ? String(i.tests / 100) : '', '0')}</label></div>
    <label class="field"><span>${L('হাসপাতালের অন্যান্য চার্জ', 'Other hospital charges')}</span>${moneyInput('other', i.other ? String(i.other / 100) : '', '0')}</label>
    <div class="preview" data-tot></div>
    <label class="field"><span>${L('কী সমস্যা / নোট', 'Problem / note')}</span><input class="input" name="note" maxlength="120" value="${esc((e && e.desc) || '')}"></label>
    ${e ? '' : hgPayFields()}${e ? '' : hgReceiptBlock(null)}
    <p class="hint">${L('প্রেসক্রিপশন, রিপোর্ট ও বিলের ছবি সেভ করার পর রেকর্ডের পাতায় "ছবি" বাটনে যোগ করুন।', 'After saving, add prescription, report and bill photos from the record page with the Photo button.')}</p>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
HG_LIVE_X.visit = f => { const t = toMinor(f.elements.fee.value) + toMinor(f.elements.tests.value) + toMinor(f.elements.other.value); $('[data-tot]', f).innerHTML = t ? `${L('মোট খরচ', 'Total')}: <b>${hgM(t)}</b>` : ''; };
function hgMedForm(ev, e, from) {
  const src = e || from, i = (src && src.info) || {}; hgPendingReceipt = undefined;
  return `${sheetHead(`💊 ${e ? L('ওষুধ এডিট', 'Edit medicine') : L('ওষুধ', 'Medicine')}`, esc(ev.name))}
  <form data-form="hg-med" data-live="hg-hh" data-kind="medform" data-id="${e ? e.id : ''}" autocomplete="off">
    ${hgWhoField(ev, 'patient', L('কার ওষুধ', 'For whom'), i.patient)}
    <div class="row2"><label class="field"><span>${L('ওষুধের নাম', 'Medicine')}</span><input class="input" name="med" maxlength="50" value="${esc(i.med || '')}"></label><label class="field"><span>${L('শক্তি / ধরন (জানা থাকলে)', 'Strength / type')}</span><input class="input" name="strength" maxlength="30" value="${esc(i.strength || '')}"></label></div>
    <label class="field"><span>${L('কোন ডাক্তার দিয়েছেন', 'Prescribed by')}</span><input class="input" name="doctor" maxlength="40" value="${esc(i.doctor || '')}"></label>
    <div class="row2"><label class="field"><span>${L('কীভাবে খেতে বলা হয়েছে', 'Dose as prescribed')}</span><input class="input" name="dose" maxlength="50" value="${esc(i.dose || '')}" placeholder="${L('যেমন সকাল-রাত ১টা', 'e.g. morning & night, 1')}"></label><label class="field"><span>${L('দিনে কয়টা (ঐচ্ছিক)', 'Per day (optional)')}</span><input class="input" name="perDay" inputmode="decimal" value="${i.perDay || ''}"></label></div>
    <div class="row2"><label class="field"><span>${L('শুরুর তারিখ', 'Start')}</span><input class="input" type="date" name="start" value="${esc(i.start || '')}"></label><label class="field"><span>${L('শেষের তারিখ', 'End')}</span><input class="input" type="date" name="end" value="${esc(i.end || '')}"></label></div>
    <div class="row2"><label class="field"><span>${L('একটা পাতা/ইউনিটের দাম', 'Price per strip/unit')}</span>${moneyInput('unit', i.unit ? String(i.unit / 100) : '', '0')}</label><label class="field"><span>${L('কয়টা কিনলেন', 'How many bought')}</span><input class="input" name="packs" inputmode="decimal" value="${i.packs || ''}"></label></div>
    <label class="field"><span>${L('মোট ক্রয়মূল্য', 'Total price')}</span>${moneyInput('amt', e ? String(e.total / 100) : '', '0')}</label>
    <div class="preview" data-tot></div>
    <div class="row2"><label class="field"><span>${L('কেনার তারিখ', 'Bought on')}</span><input class="input" type="date" name="date" value="${esc((e && e.date) || today())}"></label><label class="field"><span>${L('ফার্মেসির নাম', 'Pharmacy')}</span><input class="input" name="pharmacy" maxlength="40" value="${esc(i.pharmacy || '')}"></label></div>
    <label class="field"><span>${L('এখন কতটা অবশিষ্ট আছে (ঐচ্ছিক)', 'Quantity left now (optional)')}</span><input class="input" name="remaining" inputmode="decimal" value="${(e && i.remaining) || ''}"><div class="hint">${L('অবশিষ্ট আর "দিনে কয়টা" দুটোই দিলে কতদিন চলবে দেখাবে। না দিলে অনুমান করে কিছু দেখানো হয় না।', 'Give both left and per-day to see how long it lasts. Without them nothing is guessed.')}</div></label>
    <div class="preview" data-cmp></div>
    ${e ? '' : hgPayFields()}${e ? '' : hgReceiptBlock(null)}
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
HG_LIVE_X.medform = (f, t) => {
  const ev = hgCur(), u = toMinor(f.elements.unit.value), n = hgNum(f.elements.packs.value);
  if (t && (t.name === 'unit' || t.name === 'packs') && u > 0 && n > 0) f.elements.amt.value = fromMinor(Math.round(u * n));
  const amt = toMinor(f.elements.amt.value); $('[data-tot]', f).innerHTML = u > 0 && n > 0 ? `${hgM(u)} × ${n} = <b>${hgM(Math.round(u * n))}</b>` : '';
  const med = f.elements.med.value.trim().toLowerCase(), who = f.elements.patient.value.trim().toLowerCase();
  const prev = hgLive(ev).filter(e => e.info && e.info.kind === 'med' && (e.info.med || '').toLowerCase() === med && (e.info.patient || '').toLowerCase() === who && e.id !== f.dataset.id).sort(hgByDate)[0];
  const cur = u || amt, pv = prev ? (u && prev.info.unit ? prev.info.unit : prev.total) : 0; let t2 = '';
  if (prev && cur && pv) t2 = L(`গতবার (${fmtDate(prev.date)}): ${hgM(pv)} → এবার ${hgM(cur)} <b class="${cur > pv ? 'neg' : 'pos'}">${cur === pv ? 'একই' : (cur > pv ? '+' : '−') + hgM(Math.abs(cur - pv))}</b>`, `Last (${fmtDate(prev.date)}): ${hgM(pv)} → now ${hgM(cur)} <b class="${cur > pv ? 'neg' : 'pos'}">${cur === pv ? 'same' : (cur > pv ? '+' : '−') + hgM(Math.abs(cur - pv))}</b>`);
  const rem = hgNum(f.elements.remaining.value), pd = hgNum(f.elements.perDay.value); if (rem > 0 && pd > 0) t2 += `${t2 ? '<br>' : ''}${L(`প্রায় ${Math.floor(rem / pd)} দিন চলবে`, `Lasts about ${Math.floor(rem / pd)} days`)}`;
  $('[data-cmp]', f).innerHTML = t2;
};
Object.assign(FORMS, {
  'hg-visit': async f => {
    const ev = hgGuard(); if (!ev) return; const patient = f.elements.patient.value.trim(), fee = toMinor(f.elements.fee.value), tests = toMinor(f.elements.tests.value), other = toMinor(f.elements.other.value), total = fee + tests + other;
    if (!patient) return fail(f, L('কার চিকিৎসা তা লিখুন', 'Enter the patient'), 'patient'); if (!(total > 0)) return fail(f, L('খরচের টাকা লিখুন', 'Enter the cost'), 'fee');
    const date = f.elements.date.value || today(), doctor = f.elements.doctor.value.trim();
    await hgFinish(ev, f, { title: `${patient} · ${doctor || L('ডাক্তার', 'doctor')}`, category: 'medical', total, date, desc: f.elements.note.value.trim(), info: { kind: 'visit', patient, doctor, specialty: f.elements.specialty.value.trim(), hospital: f.elements.hospital.value.trim(), fee, tests, other, next: f.elements.next.value || '', ym: date.slice(0, 7) } });
  },
  'hg-med': async f => {
    const ev = hgGuard(); if (!ev) return; const patient = f.elements.patient.value.trim(), med = f.elements.med.value.trim(), total = toMinor(f.elements.amt.value);
    if (!patient) return fail(f, L('কার ওষুধ তা লিখুন', 'Enter whom it is for'), 'patient'); if (!med) return fail(f, L('ওষুধের নাম লিখুন', 'Enter the medicine'), 'med'); if (!(total > 0)) return fail(f, L('মোট দাম লিখুন', 'Enter the total price'), 'amt');
    const date = f.elements.date.value || today(), g = n => f.elements[n].value.trim();
    await hgFinish(ev, f, { title: `${med} · ${patient}`, category: 'medical', total, date, info: { kind: 'med', patient, med, strength: g('strength'), doctor: g('doctor'), dose: g('dose'), perDay: hgNum(g('perDay')), start: g('start'), end: g('end'), unit: toMinor(g('unit')), packs: hgNum(g('packs')), pharmacy: g('pharmacy'), remaining: hgNum(g('remaining')), ym: date.slice(0, 7) } });
  },
  'hg-hperson': f => {
    const ev = hgGuard(); if (!ev) return; const name = f.elements.name.value.trim(); if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    const ppl = hgHH(ev).people, id = f.dataset.id, p = id && ppl.find(x => x.id === id);
    if (ppl.some(x => !x.del && x.id !== id && x.name.toLowerCase() === name.toLowerCase())) return fail(f, L('এই নামে সদস্য আছে', 'Someone with this name exists'), 'name');
    const o = { name, info: f.elements.info.value.trim(), notes: f.elements.notes.value.trim(), follow: f.elements.follow.value.trim() };
    if (p) Object.assign(p, o); else ppl.push(Object.assign({ id: uid(), createdAt: Date.now() }, o));
    closeSheet(); hgCommit(ev, `সদস্য: ${name}`, `Person: ${name}`); setTimeout(() => { if (hgHUi.cat === 'medical') { hgHUi.med = 'people'; openSheet(hgMedScreen(hgCur())); } }, 350);
  },
});
Object.assign(ACTIONS, {
  'hg-medsub': el => { hgHUi.med = el.dataset.v; const ev = hgCur(); if (ev) openSheet(hgMedScreen(ev)); },
  'hg-visit-add': () => { const ev = hgGuard(); if (ev) openSheet(hgVisitForm(ev, null)); },
  'hg-med-add': el => { const ev = hgGuard(); if (!ev) return; const from = el.dataset.from && hgLive(ev).find(x => x.id === el.dataset.from); openSheet(hgMedForm(ev, null, from ? Object.assign({}, from, { info: Object.assign({}, from.info, { remaining: 0 }) }) : null)); },
  'hg-person-add': () => { const ev = hgGuard(); if (ev) openSheet(hgPersonProfForm(null)); },
  'hg-person-edit': el => { const ev = hgGuard(); if (!ev) return; const p = hgHH(ev).people.find(x => x.id === el.dataset.id); if (p) openSheet(hgPersonProfForm(p)); },
  'hg-person-del': el => { const ev = hgGuard(); if (!ev) return; const p = hgHH(ev).people.find(x => x.id === el.dataset.id); if (!p || !confirm(L(`"${p.name}"-এর প্রোফাইল মুছবেন? আগের খরচ থাকবে।`, `Delete ${p.name}'s profile? Past expenses stay.`))) return; undoable(DELETED(), () => { p.del = Date.now(); }); setTimeout(() => openSheet(hgMedScreen(hgCur())), 50); },
});
function hgPersonProfForm(p) {
  return `${sheetHead(`👤 ${p ? L('সদস্য এডিট', 'Edit person') : L('পরিবারের সদস্য', 'Family member')}`)}
  <form data-form="hg-hperson" data-id="${p ? p.id : ''}" autocomplete="off">
    <label class="field"><span>${L('নাম', 'Name')}</span><input class="input" name="name" maxlength="40" value="${esc(p ? p.name : '')}"></label>
    <label class="field"><span>${L('পরিচিতিমূলক তথ্য (বয়স, রক্তের গ্রুপ…)', 'Details (age, blood group…)')}</span><input class="input" name="info" maxlength="80" value="${esc(p ? p.info : '')}"></label>
    <label class="field"><span>${L('চিকিৎসার নোট', 'Medical notes')}</span><input class="input" name="notes" maxlength="160" value="${esc(p ? p.notes : '')}"></label>
    <label class="field"><span>${L('চলমান চিকিৎসা / ফলো-আপ', 'Ongoing treatment / follow-up')}</span><input class="input" name="follow" maxlength="120" value="${esc(p ? p.follow : '')}"></label>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}

/* ---------- খাবার ও বাজার ---------- */
function hgGroceryScreen(ev) {
  const ym = hgHUi.ym, act = ev.status === 'active', list = hgLive(ev).filter(e => e.category === 'groceries' && hgExpYm(e) === ym).sort(hgByDate);
  const prev = sum(hgLive(ev).filter(e => e.category === 'groceries' && hgExpYm(e) === hgMShift(ym, -1)).map(e => e.total)), cur = sum(list.map(e => e.total));
  const shops = {}; list.forEach(e => { const s = (e.info && e.info.shop) || (e.ref ? L('বাজার সদাই', 'Bazar Sadai') : L('দোকান নেই', 'No shop')); shops[s] = (shops[s] || 0) + e.total; });
  return `${hgCatHead(ev, 'groceries', esc(ev.name))}
    ${hgMinis([[hgMLabel(ym), hgM(cur)], [L('গত মাস', 'Last month'), prev ? hgM(prev) : '—'], [L('বাকি', 'Due'), hgM(sum(list.map(e => hgOblRem(ev, e)))), '']])}
    ${false ? `<button type="button" class="btn primary block mt8" data-action="switch-module" data-id="bazar">🛒 ${L('বাজার সদাই খুলুন: তালিকা, বাজেট, দাম, মজুত', 'Open Bazar Sadai: list, budget, prices, stock')}</button><p class="hint">${L('"বাজার সদাই"-এ বাজারের খরচ এই সংসারের হিসাবে নিজে যোগ করে নেওয়া যায় (সেখানকার আরও মেনু থেকে)। তাই একই বাজার দুই জায়গায় লিখবেন না।', 'Bazar Sadai can add its market costs to this household automatically (from its More tab). So do not enter the same trip in both places.')}</p>` : ''}
    ${act ? `<button type="button" class="btn block mt8" data-action="hg-gro-add">${icon('plus', 18)} ${L('দ্রুত বাজার লিখুন (শুধু মোট)', 'Quick trip (just the total)')}</button>` : ''}
    ${Object.keys(shops).length > 1 ? `<div class="section-title">${L('দোকান অনুযায়ী', 'By shop')}</div>${Object.entries(shops).map(([s, v]) => `<div class="hg-day"><span><b>${esc(s)}</b></span><b>${hgM(v)}</b></div>`).join('')}` : ''}
    <div class="section-title">${hgMLabel(ym)} · ${list.length}</div>
    ${list.length ? `<div class="list">${list.map(e => `<button type="button" class="lrow" data-action="hg-edit-expense" data-id="${e.id}"><span class="lic">${e.ref ? '📋' : '🛒'}</span><span class="lmain"><b>${esc((e.info && e.info.shop) || e.title)}</b><small>${fmtDate(e.date)}${e.ref ? ' · ' + L('বাজার সদাই থেকে', 'from Bazar Sadai') : ''}${e.info && e.info.items && e.info.items.length ? ' · ' + e.info.items.slice(0, 3).map(i => esc(i.name)).join(', ') : ''}</small></span><span class="lend"><b>${hgM(e.total)}</b></span></button>`).join('')}</div>` : `<p class="hint">${L('এই মাসে বাজার লেখা হয়নি।', 'No market trip this month.')}</p>`}`;
}
const hgParseItems = txt => String(txt || '').split('\n').map(l => l.split('|').map(s => s.trim())).filter(p => p[0]).map(p => ({ name: p[0], price: toMinor(p[1] || 0) }));
function hgGroceryForm(ev, e) {
  const i = (e && e.info) || {}, shops = [...new Set(hgLive(ev).filter(x => x.info && x.info.shop).map(x => x.info.shop))]; hgPendingReceipt = undefined;
  return `${sheetHead(`🛒 ${L('বাজার', 'Market trip')}`, esc(ev.name))}
  <form data-form="hg-gro" data-live="hg-hh" data-kind="gro" data-id="${e ? e.id : ''}" autocomplete="off">
    <label class="field"><span>${L('কোথা থেকে (দোকান / বাজার)', 'Where (shop / market)')}</span><input class="input" name="shop" maxlength="40" list="hg-shops" value="${esc(i.shop || '')}"><datalist id="hg-shops">${shops.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
    <label class="field"><span>${L('কী কী কিনলেন (ঐচ্ছিক) · প্রতি লাইনে: নাম | দাম', 'What you bought (optional) · one per line: name | price')}</span><textarea class="input hg-ta" name="items" rows="5" placeholder="${L('চাল | 380\nডাল | 160', 'Rice | 380\nLentils | 160')}">${esc((i.items || []).map(x => `${x.name} | ${x.price ? x.price / 100 : ''}`).join('\n'))}</textarea></label>
    <div class="preview" data-isum></div>
    <label class="field"><span>${L('মোট কত', 'Total')}</span>${moneyInput('amt', e ? String(e.total / 100) : '', '0')}</label>
    <label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${esc((e && e.date) || today())}"></label>
    ${e ? '' : hgPayFields()}${e ? '' : hgReceiptBlock(null)}
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
HG_LIVE_X.gro = f => {
  const it = hgParseItems(f.elements.items.value), s = sum(it.map(i => i.price)), pv = $('[data-isum]', f);
  if (it.length && s > 0) { pv.innerHTML = `${it.length} ${L('টা পণ্য', 'items')} · ${L('যোগফল', 'sum')} <b>${hgM(s)}</b>`; if (f.elements.amt !== document.activeElement && !f.elements.amt.dataset.edited) f.elements.amt.value = fromMinor(s); } else pv.innerHTML = '';
  if (f.elements.amt === document.activeElement) f.elements.amt.dataset.edited = '1';
};
Object.assign(FORMS, {
  'hg-gro': async f => {
    const ev = hgGuard(); if (!ev) return; const items = hgParseItems(f.elements.items.value), total = toMinor(f.elements.amt.value) || sum(items.map(i => i.price)), shop = f.elements.shop.value.trim();
    if (total <= 0) return fail(f, L('মোট টাকা লিখুন', 'Enter the total'), 'amt');
    const date = f.elements.date.value || today();
    await hgFinish(ev, f, { title: shop ? `${L('বাজার', 'Market')}: ${shop}` : L('বাজার', 'Market'), category: 'groceries', total, date, info: { kind: 'market', shop, items, ym: date.slice(0, 7) } });
  },
});
Object.assign(ACTIONS, { 'hg-gro-add': () => { const ev = hgGuard(); if (ev) openSheet(hgGroceryForm(ev, null)); } });
