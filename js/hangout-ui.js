'use strict';

/* =========================================================
   Hangout: স্ক্রিনের কাঠামো (ব্যবসা মোডের মতোই: হোম · বন্ধুরা · খরচ · মেটানো · আরও)
   একটা "চলতি ইভেন্ট" থাকে, উপরের নামে ট্যাপ করে বদলানো যায়, ঠিক যেমন ব্যবসায় ব্যাচ বদলানো।
   ========================================================= */

// চলতি ইভেন্ট: বাছা না থাকলে সবচেয়ে সাম্প্রতিক চলমান ইভেন্ট
function hgAutoEvent() {
  const evs = hgEvents().filter(e => e.status !== 'archived');
  const pick = (evs.length ? evs : hgEvents()).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  hgRoute.ev = pick ? pick.id : null;
  return pick || null;
}
const hgNow = () => hgEv(hgRoute.ev) || hgAutoEvent();
function hgGo(t) { if (tab === t) render(); else setTab(t); }

function hgTopbar() {
  const ev = hgCur();
  return `
    <div class="batch-btn">
      <button type="button" class="home-btn" data-action="go-home" aria-label="${L('হোমে ফিরুন', 'Back to Home')}"><span class="logo-sm">${LOGO}</span></button>
      <span class="bb-text"><button type="button" class="home-link" data-action="go-home">${L('হিসাবী', 'Hisabi')}</button>
        <button type="button" class="batch-name" data-action="hg-events" aria-label="${L('ইভেন্ট বদলান', 'Switch event')}"><b>${esc(ev ? ev.name : L('ইভেন্ট', 'Event'))}</b>${icon('chev', 16)}</button></span>
    </div>
    <div class="top-actions">${moduleSwitcher()}${helpBtn()}${langBtn()}</div>
    ${trail.length > 1 ? `<nav class="crumbs" aria-label="${L('আপনি কোথায় ছিলেন', 'Where you have been')}">${trail.map((id, i) =>
      `${i ? '<i>›</i>' : ''}<button type="button" class="${id === tab ? 'cur' : ''}" data-action="tab" data-tab="${id}">${tabLabel(id)}</button>`).join('')}</nav>` : ''}`;
}

/* ---------- প্রথম ইভেন্ট (ওয়েলকাম) ---------- */
function hgWelcome() {
  return `<section class="welcome">
    <div class="welcome-top"><div class="logo">${LOGO}</div>${langBtn()}</div>
    <h1>${L('আড্ডা ও যৌথ খরচ', 'Hangout & group expenses')}</h1>
    <p class="lead">${L('বন্ধুদের সাথে খাওয়া, ঘোরা বা যেকোনো খরচ: কে কত দিল, কার কত ভাগ আর কে কাকে কত দেবে, নিজে হিসাব হবে।', 'Meals, trips or any shared cost: who paid, each share and who owes whom, worked out for you.')}</p>
    <div class="feat">
      <div><span>🍽️</span>${L('রেস্টুরেন্টের বিল ভাগ', 'Split a restaurant bill')}</div>
      <div><span>🤝</span>${L('কে কাকে কত দেবে', 'Who pays whom')}</div>
      <div><span>🧾</span>${L('রসিদের ছবি রাখা', 'Keep receipt photos')}</div>
      <div><span>📴</span>${L('পুরো অফলাইন', 'Fully offline')}</div>
    </div>
    <div class="card">${hgEventForm(null, true)}</div>
    <p class="tiny">${L('সব ডেটা শুধু আপনার ফোনে থাকে। কোনো সার্ভার নেই।', 'All data stays on your phone. No server.')}</p>
  </section>`;
}

/* ---------- হোম ---------- */
const hgOweRows = (ev, c) => ev.participants.map(p => ({ p, f: c.final[p.id] }));
// একসাথে একটাই কাজ দেখায়: কম পড়তে হয়, কী করতে হবে সাথে সাথে বোঝা যায়
function hgStepsCard(ev, c) {
  const people = ev.participants.length, exps = ev.expenses.filter(e => !e.del).length;
  const allEven = c.gross > 0 && ev.participants.every(p => c.final[p.id] === 0);
  const steps = [
    { done: people >= 2, t: L('বন্ধুদের নাম যোগ করুন', 'Add your friends'), a: 'hg-add-person', btn: L('বন্ধু যোগ করুন', 'Add friend') },
    { done: exps > 0, t: L('প্রথম খরচটা লিখুন', 'Add the first expense'), a: 'hg-add-expense', btn: L('খরচ লিখুন', 'Add expense'), need: people >= 2 },
    { done: allEven, t: L('কে কাকে দেবে দেখে মিটিয়ে নিন', 'See who pays whom'), a: 'tab', data: 'data-tab="settle"', btn: L('মেটানো দেখুন', 'Open Settle'), need: exps > 0 },
  ];
  if (steps.every(s => s.done) || ev.status !== 'active') return '';
  const cur = steps.findIndex(s => !s.done && s.need !== false);
  if (cur < 0) return '';
  const s = steps[cur];
  return `<section class="card nextstep"><div class="ns-dots">${steps.map((x, i) => `<i class="${x.done ? 'd' : i === cur ? 'n' : ''}"></i>`).join('')}</div>
    <div class="ns-t"><small>${L('এখন এটা করুন', 'Do this next')} · ${cur + 1}/3</small><b>${s.t}</b></div>
    <button type="button" class="btn primary block" data-action="${s.a}" ${s.data || ''}>${icon('plus', 18)} ${s.btn}</button></section>`;
}
function hgWhoPays(ev, c, withClose) {
  const act = ev.status === 'active';
  const allEven = c.gross > 0 && ev.participants.every(p => c.final[p.id] === 0);
  const share = c.gross > 0 ? `<div class="hg-share3 mt8"><button type="button" class="btn sm" data-action="hg-copy-short">📋 ${L('ছোট কপি', 'Short copy')}</button><button type="button" class="btn sm" data-action="hg-rep-pdf">📄 PDF</button><button type="button" class="btn sm" data-action="hg-wa-share">📤 WhatsApp</button></div>` : '';
  return `<section class="card"><div class="card-head"><h2>${L('কে কাকে দেবে', 'Who pays whom')}</h2></div>
    ${c.suggestions.length ? c.suggestions.map((s, i) => `<div class="hg-sugg"><span><b>${esc(pName(ev, s.from))}</b> ${L('দেবে', 'pays')} <b>${esc(pName(ev, s.to))}</b></span><b>${hgM(s.amt)}</b>
        ${act ? `<button type="button" class="btn sm" data-action="hg-pay-sugg" data-i="${i}">${L('দিয়েছে ✓', 'Paid ✓')}</button>` : ''}</div>`).join('') +
      `<p class="hint">${L('টাকা দেওয়ার পর "দিয়েছে ✓" চাপুন।', 'After the money is paid, tap "Paid ✓".')}</p>${share}`
      : (allEven ? `<div class="bsum ok"><b>🎉 ${L('সবার হিসাব মিটে গেছে!', 'Everyone is even!')}</b><span>${L('কাউকে কিছু দিতে হবে না।', 'Nobody owes anything.')}</span></div>${withClose && act ? `<button type="button" class="btn primary block mt8" data-action="hg-settle">${icon('check', 18)} ${L('ইভেন্ট বন্ধ করুন', 'Close the event')}</button>` : ''}${share}`
        : `<p class="hint">${ev.participants.length >= 2 ? L('খরচ যোগ করলে এখানে দেখাবে কে কাকে কত দেবে।', 'Add expenses and this shows who pays whom.') : L('আগে বন্ধুদের নাম যোগ করুন।', 'Add your friends first.')}</p>`)}</section>`;
}

function hgHomeTab(ev, c) {
  const open = sum(ev.participants.map(p => Math.max(0, c.final[p.id])));
  const evenCount = ev.participants.filter(p => c.final[p.id] === 0).length;
  const progress = ev.participants.length && c.gross ? evenCount / ev.participants.length : 0;
  const exps = ev.expenses.filter(e => !e.del);
  const cats = Object.entries(c.catTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const lock = ev.status === 'active' ? '' : `<div class="hg-lock ${ev.status}"><span>${ev.status === 'settled' ? L('এই ইভেন্টের হিসাব মিটে গেছে। বদলাতে আবার খুলুন।', 'This event is settled. Reopen it to change anything.') : L('এই ইভেন্ট আর্কাইভে আছে।', 'This event is archived.')}</span>
      <button type="button" class="btn sm" data-action="${ev.status === 'settled' ? 'hg-reopen' : 'hg-restore'}">${ev.status === 'settled' ? L('আবার খুলুন', 'Reopen') : L('রিস্টোর', 'Restore')}</button></div>`;
  const openDecisions = ev.decisions.filter(d => !d.del && !['finalized', 'cancelled'].includes(d.status)).length;
  return `${lock}${hgIssuesHtml(ev, c)}
  <section class="hero tappable" data-action="hg-hero-detail" role="button" tabindex="0" aria-label="${L('পুরো হিসাব দেখুন', 'See the full breakdown')}">
    <div class="hero-top"><div>
        <div class="hero-label">${L('মোট খরচ', 'Total spent')}</div>
        <div class="hero-target">${hgM(c.net)}</div>
        <div class="hero-sub">${(HG_TYPES[ev.type] || HG_TYPES.custom).icon} ${hgTypeLabel(ev.type)}${ev.start ? ' · ' + fmtDate(ev.start) : ''}${ev.location ? ' · ' + esc(ev.location) : ''}</div></div>
      <div class="ringcap">${ring(progress)}<small>${L('মিটেছে', 'settled')}</small></div></div>
    <div class="hero-chips">
      <div><small>${L('বন্ধু', 'Friends')}</small><b>${ev.participants.length}</b></div>
      <div><small>${L('খরচ', 'Expenses')}</small><b>${exps.length}</b></div>
      <div><small>${L('বাকি আছে', 'To settle')}</small><b>${hgM(open)}</b></div></div>
    <div class="hero-more">${L('ট্যাপ করে পুরো হিসাব দেখুন', 'Tap for the full breakdown')} ${icon('chev', 16)}</div>
  </section>
  ${hgStepsCard(ev, c)}
  ${ev.status === 'active' ? `<div class="quick">
    <button type="button" class="qbtn" data-action="hg-add-expense"><span class="qi">${icon('receipt')}</span>${L('খরচ', 'Expense')}</button>
    <button type="button" class="qbtn" data-action="hg-add-bill"><span class="qi">${icon('doc')}</span>${L('রেস্টুরেন্ট বিল', 'Restaurant bill')}</button>
    <button type="button" class="qbtn" data-action="hg-add-person"><span class="qi">${icon('users')}</span>${L('বন্ধু', 'Friend')}</button></div>` : ''}
  ${hgWhoPays(ev, c, true)}
  ${hgPlanCard(ev, c)}
  ${hgWhereCard(ev, c)}
  <section class="card"><div class="card-head"><h2>${L('বন্ধুদের হিসাব', 'Each friend')}</h2><button type="button" class="link" data-action="tab" data-tab="people">${L('বিস্তারিত', 'Details')}</button></div>
    <div class="plist">${hgOweRows(ev, c).map(({ p, f }) => `<div class="prow"><span class="hgp-av">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>
      <span class="pmain"><b>${esc(p.name)}</b><small>${L('দিয়েছে', 'Paid')} ${hgM(c.paid[p.id])} · ${L('তার ভাগ', 'Share')} ${hgM(c.share[p.id])}</small></span>
      <span class="pend"><b class="${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}">${hgM(Math.abs(f))}</b><small>${f > 0 ? L('পাবে', 'gets') : f < 0 ? L('দেবে', 'owes') : L('মিটেছে', 'even')}</small></span></div>`).join('') || `<p class="hint">${L('এখনও কেউ নেই।', 'No one yet.')}</p>`}</div></section>
  <details class="card more-card"><summary>${L('আরও হিসাব দেখুন', 'More details')} ${icon('chev', 20)}</summary>
    <section class="stat-grid">
      ${stat(L('মোট খরচ (গ্রস)', 'Gross total'), hgM(c.gross), '&nbsp;')}${stat(L('রিফান্ড', 'Refunds'), hgM(c.refundTotal), '&nbsp;')}
      ${stat(L('নেট খরচ', 'Net total'), hgM(c.net), '&nbsp;')}${stat(L('মিটেছে / বাকি', 'Even / open'), `${evenCount} / ${ev.participants.length - evenCount}`, '&nbsp;')}</section>
    ${openDecisions ? `<div class="bsum warn"><b>${L(`${openDecisions}টা সমঝোতা এখনও চূড়ান্ত হয়নি`, `${openDecisions} agreement(s) not finalized`)}</b><span>${L('"মেটানো" ট্যাবের নিচে দেখুন।', 'See the bottom of the Settle tab.')}</span></div>` : ''}
  </details>`;
}

/* ---------- বন্ধুরা, খরচ ---------- */
function hgPeopleTab(ev, c) {
  return `<div class="page-head"><h1>${L('বন্ধুরা', 'Friends')}</h1>${ev.status === 'active' ? `<button type="button" class="btn primary sm" data-action="hg-add-person">${icon('plus', 18)} ${L('বন্ধু', 'Friend')}</button>` : ''}</div>
    <div class="hg-body">${hgSecPeople(ev, c)}</div>`;
}
function hgExpensesTab(ev, c) {
  return `<div class="page-head"><h1>${L('খরচ', 'Expenses')}</h1>${ev.status === 'active' ? `<button type="button" class="btn primary sm" data-action="hg-add-expense">${icon('plus', 18)} ${L('খরচ', 'Expense')}</button>` : ''}</div>
    <div class="minis"><div class="mini"><small>${L('মোট', 'Total')}</small><b>${hgM(c.gross)}</b></div><div class="mini"><small>${L('রিফান্ড', 'Refunds')}</small><b>${hgM(c.refundTotal)}</b></div><div class="mini"><small>${L('নেট', 'Net')}</small><b>${hgM(c.net)}</b></div></div>
    <div class="hg-body">${hgSecExpenses(ev, c)}</div>`;
}

/* ---------- মেটানো ---------- */
function hgSettleTab(ev, c) {
  return `<div class="page-head"><h1>${L('মেটানো', 'Settle up')}</h1></div>
    ${hgIssuesHtml(ev, c)}
    ${hgWhoPays(ev, c, true)}
    <section class="card"><div class="card-head"><h2>${L('টাকা দেওয়া-নেওয়া', 'Payments')}</h2></div>
      <p class="hint" style="margin:0 0 8px">${L('যে টাকা বন্ধুরা একে অপরকে দিয়েছে বা দোকান থেকে ফেরত এসেছে, এখানে লিখে রাখুন।', 'Record money friends gave each other, or refunds from a shop.')}</p>
      <div class="hg-body">${hgSecPayments(ev, c)}</div></section>
    <details class="card more-card"><summary>${L('মাফ ও সমঝোতা (দরকার হলে)', 'Forgive & agreements (if needed)')} ${icon('chev', 20)}</summary>
      <p class="hint">${L('কেউ টাকা দিতে না পারলে, বা কেউ বেশি দিয়ে ফেরত নিতে না চাইলে, বন্ধুরা মিলে যা ঠিক করেছেন তা এখানে লিখে রাখুন। চূড়ান্ত না করা পর্যন্ত হিসাব বদলায় না।', 'If someone cannot pay, or does not want money back, record what the group agreed. Nothing changes until you finalize it.')}</p>
      ${hgSecDecisions(ev, c)}</details>`;
}

/* ---------- আরও ---------- */
function hgMoreTab(ev, c) {
  const mi = menuItem, act = ev.status === 'active';
  const dead = hg().events.filter(e => e.del);
  let hasPrev = false; try { hasPrev = !!localStorage.getItem(HG_PREV_KEY); } catch (e) { hasPrev = false; }
  return `<div class="page-head"><h1>${L('আরও', 'More')}</h1></div>
    <div class="section-title">${L('এই ইভেন্ট', 'This event')}: ${esc(ev.name)}</div>
    <div class="menu">
      ${ev.status !== 'archived' ? mi('hg-edit-event', 'edit', L('ইভেন্টের তথ্য বদলান', 'Edit event'), L('নাম, তারিখ, জায়গা, খাত', 'Name, dates, place, categories')) : ''}
      ${act ? mi('hg-settle', 'check', L('ইভেন্ট বন্ধ করুন', 'Close event'), L('সবার হিসাব মিটলে', 'When everyone is even')) : ''}
      ${ev.status === 'settled' ? mi('hg-reopen', 'undo', L('আবার খুলুন', 'Reopen'), L('কিছু সংশোধন করতে হলে', 'To change something')) : ''}
      ${ev.status === 'archived' ? mi('hg-restore', 'undo', L('রিস্টোর', 'Restore'), L('আবার চালু করুন', 'Make it active again')) : mi('hg-archive', 'archive', L('আর্কাইভ', 'Archive'), L('পুরোনো ইভেন্ট সরিয়ে রাখুন', 'Put an old event away'))}
    </div>
    <div class="section-title">${L('রিপোর্ট ও শেয়ার', 'Report & share')}</div>
    <div class="menu">${mi('hg-rep-memo', 'doc', L('পূর্ণ হিসাবের মেমো (PDF)', 'Full memo (PDF)'), L('সব খরচ, বিল, লেনদেন, সমঝোতা', 'All expenses, bills, payments, agreements'))}
      ${mi('hg-rep-slip', 'receipt', L('সামারি স্লিপ', 'Summary slip'), L('এক পাতার সংক্ষিপ্ত ফল', 'One-page result'))}
      ${mi('hg-rep-text', 'share', L('WhatsApp-এর জন্য টেক্সট', 'Text for WhatsApp'), L('কপি করে পাঠান', 'Copy and send'))}</div>
    <div class="section-title">${L('সব ইভেন্ট ও বন্ধু', 'All events & friends')}</div>
    <div class="menu">${mi('hg-events', 'layers', L('সব ইভেন্ট', 'All events'), L('খুঁজুন, বদলান, নতুন খুলুন', 'Search, switch, create new'))}
      ${mi('hg-friends', 'users', L('সেভ করা বন্ধুদের তালিকা', 'Saved friends'), L('পরের ইভেন্টে আবার বাছতে পারবেন', 'Reuse them in future events'))}
      ${mi('hg-history', 'clock', L('ইতিহাস ও সম্প্রতি মোছা', 'History & recently deleted'), L('কী বদলেছে, মোছা জিনিস ফেরান', 'What changed; restore deleted items'))}</div>
    <div class="section-title">${L('Hangout ডেটা', 'Hangout data')}</div>
    <div class="menu">${mi('hg-backup', 'download', L('Hangout ব্যাকআপ নিন', 'Back up Hangout data'), L('রসিদের ছবিসহ, আলাদা ফাইলে', 'Receipt photos included, separate file'))}
      ${mi('hg-import', 'upload', L('Hangout ব্যাকআপ রিস্টোর', 'Restore Hangout backup'), L('ডুপ্লিকেট ছাড়া মিলিয়ে নিন', 'Merge without duplicates'))}
      ${hasPrev ? mi('hg-undo-import', 'undo', L('শেষ রিস্টোর ফেরান', 'Undo last restore'), L('রিস্টোরের আগের অবস্থায় যান', 'Go back to before the restore')) : ''}
      ${hg().events.some(e => e.demo) ? mi('hg-demo-clear', 'trash', L('ডেমো ডেটা মুছুন', 'Remove demo data'), L('শুধু ডেমো যাবে, আপনার ডেটা থাকবে', 'Only the demo goes; your data stays')) : mi('hg-demo-load', 'plus', L('ডেমো ডেটা আনুন', 'Load demo data'), L('দেখে শেখার জন্য নমুনা ইভেন্ট', 'Sample events to learn from'))}</div>
    ${dead.length ? `<div class="section-title">${L('সম্প্রতি মোছা ইভেন্ট', 'Recently deleted events')} · ${dead.length}</div><div class="list">${dead.map(e => `<div class="lrow"><span class="lic">🗑️</span><span class="lmain"><b>${esc(e.name)}</b><small>${hgFmtTime(e.del)}</small></span>
      <button type="button" class="btn sm" data-action="hg-restore-event" data-id="${e.id}">${L('ফেরত', 'Restore')}</button><button type="button" class="btn sm danger" data-action="hg-purge-event" data-id="${e.id}">${icon('trash', 16)}</button></div>`).join('')}</div>` : ''}
    <button type="button" class="btn danger block mt12" data-action="hg-del-event">${icon('trash', 18)} ${L(`"${esc(ev.name)}" ইভেন্ট ডিলিট`, `Delete event "${esc(ev.name)}"`)}</button>
    ${appSections()}`;
}

/* ---------- সব ইভেন্ট (শিট): খোঁজা, ফিল্টার, বদলানো ---------- */
function hgEventListHtml() {
  const list = hgFilterEvents();
  const sec = (key, title) => { const xs = list.filter(e => e.status === key); return xs.length ? `<div class="section-title">${title} · ${xs.length}</div><div class="list">${xs.map(hgEventRow).join('')}</div>` : ''; };
  return sec('active', L('চলমান', 'Active')) + sec('settled', L('মিটে গেছে', 'Settled')) + sec('archived', L('আর্কাইভ', 'Archived')) || empty('🔍', L('কিছু পাওয়া যায়নি', 'Nothing found'), L('খোঁজা বা ফিল্টার বদলে দেখুন।', 'Try a different search or filter.'));
}
function hgEventsSheet() {
  const evs = hgEvents(), st = hgDashStats(evs);
  return `${sheetHead(L('সব ইভেন্ট', 'All events'), L('ট্যাপ করে বদলান', 'Tap one to switch'))}
    <button type="button" class="btn primary block" data-action="hg-new-event">${icon('plus', 18)} ${L('নতুন ইভেন্ট', 'New event')}</button>
    <section class="hg-stats mt12"><div><small>${L('মোট খরচ (নেট)', 'Total spent')}</small><b>${hgM(st.net)}</b></div><div><small>${L('সব মিলিয়ে বাকি', 'Still to settle')}</small><b class="${st.outstanding ? 'warn' : ''}">${hgM(st.outstanding)}</b></div></section>
    <div class="hg-filters">
      <input class="input" type="search" data-hg-filter="q" value="${esc(hgF.q)}" placeholder="${L('নাম, জায়গা বা বন্ধু খুঁজুন', 'Search name, place or friend')}">
      <div class="chiprow">${[['all', L('সব', 'All')], ['active', hgStatusLabel('active')], ['settled', hgStatusLabel('settled')], ['archived', hgStatusLabel('archived')]].map(([k, l]) =>
        `<button type="button" class="fchip ${hgF.status === k ? 'active' : ''}" data-action="hg-filter-status" data-v="${k}">${l}</button>`).join('')}</div>
      <details class="more"><summary>${L('আরও ফিল্টার (ধরন, তারিখ)', 'More filters (type, date)')}</summary>
        <select class="input" data-hg-filter="type"><option value="all">${L('সব ধরন', 'All types')}</option>${Object.keys(HG_TYPES).map(k => `<option value="${k}" ${hgF.type === k ? 'selected' : ''}>${hgTypeLabel(k)}</option>`).join('')}</select>
        <div class="row2 mt8"><input class="input" type="date" data-hg-filter="from" value="${esc(hgF.from)}" aria-label="${L('শুরু', 'From')}"><input class="input" type="date" data-hg-filter="to" value="${esc(hgF.to)}" aria-label="${L('শেষ', 'To')}"></div></details>
    </div>
    <div data-hg-list>${hgEventListHtml()}</div>`;
}
function hgRefreshEventList() { const box = $('[data-hg-list]'); if (box) box.innerHTML = hgEventListHtml(); }
document.addEventListener('input', e => { const el = e.target.closest && e.target.closest('[data-hg-filter]'); if (el && el.type === 'search') { hgF.q = el.value; hgRefreshEventList(); } });
document.addEventListener('change', e => { const el = e.target.closest && e.target.closest('select[data-hg-filter], input[type=date][data-hg-filter]'); if (el) { hgF[el.dataset.hgFilter] = el.value; hgRefreshEventList(); } });

Object.assign(ACTIONS, {
  'hg-events': () => openSheet(hgEventsSheet()),
  'hg-friends': () => openSheet(hgFriendsSheet()),
  'hg-history': () => { const ev = hgCur(); if (ev) openSheet(`${sheetHead(L('ইতিহাস ও সম্প্রতি মোছা', 'History & recently deleted'), esc(ev.name))}${hgSecHistory(ev)}`); },
  'hg-filter-status': el => { hgF.status = el.dataset.v; openSheet(hgEventsSheet()); },
  'hg-open': el => { hgRoute.ev = el.dataset.id; if (sheetOpen) closeSheet(); tab = 'home'; trail = ['home']; render(); window.scrollTo(0, 0); },
});

/* ---------- হোমের হলুদ কার্ডে ট্যাপ: সব হিসাব এক সিরিয়ালে (ব্যবসা মোডের মতো) ---------- */
const hgCatsSorted = obj => Object.entries(obj || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
function hgWhereCard(ev, c) {
  const cats = hgCatsSorted(c.catTotals);
  if (!cats.length) return '';
  const days = c.days.filter(d => c.byDay[d].total > 0);
  return `<section class="card"><div class="card-head"><h2>${L('টাকা কোথায় গেল', 'Where the money went')}</h2><button type="button" class="link" data-action="hg-hero-detail">${L('বিস্তারিত', 'Details')}</button></div>
    ${cats.map(([k, v]) => `<div class="brow"><div class="brow-top"><span class="grow">${esc(hgCatLabel(ev, k))}</span><span class="amt">${hgM(v)} <small>${pct(v / (c.net || 1) * 100)}</small></span></div>
      <div class="bbar"><span style="--c:var(--lav);width:${(v / (c.net || 1) * 100).toFixed(1)}%"></span></div></div>`).join('')}
    ${days.length > 1 ? `<div class="section-title">${L('দিন অনুযায়ী', 'Day by day')}</div>${days.map(d => `<div class="hg-day"><span><b>${esc(hgDayLabel(ev, d))}</b><small>${d ? fmtDate(d) + ' · ' : ''}${c.byDay[d].count} ${L('খরচ', 'expenses')} · ${hgCatsSorted(c.byDay[d].byCat).slice(0, 2).map(([k]) => esc(hgCatLabel(ev, k))).join(', ')}</small></span><b>${hgM(c.byDay[d].total)}</b></div>`).join('')}` : ''}
  </section>`;
}
function hgHeroDetail(ev, c) {
  const row = (label, val, cls = '') => `<div class="${cls}"><span>${label}</span><span>${val}</span></div>`;
  const refunds = ev.refunds.filter(r => !r.del), transfers = ev.transfers.filter(t => !t.del);
  const finalDecs = ev.decisions.filter(d => !d.del && d.status === 'finalized');
  const evenCount = ev.participants.filter(p => c.final[p.id] === 0).length;
  const exps = ev.expenses.filter(e => !e.del);
  let n = 0;
  const person = p => {
    const f = c.final[p.id];
    const where = hgCatsSorted(c.byPersonCat[p.id]);
    return `<div class="hgp"><div class="hgp-top"><span class="hgp-av">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span><div class="hgp-n"><b>${esc(p.name)}</b>${p.joinedOn ? `<small class="muted">${hgDayLabel(ev, p.joinedOn)} ${L('থেকে', 'onward')}</small>` : ''}</div>
      <div class="hgp-bal ${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}"><small>${f > 0 ? L('পাবে', 'gets') : f < 0 ? L('দেবে', 'owes') : L('মিটেছে', 'even')}</small><b>${hgM(Math.abs(f))}</b></div></div>
      <div class="ledger fb">
        ${row(L('টাকা দিয়েছে', 'Paid for the group'), hgM(c.paid[p.id]))}
        ${row(L('তার ভাগ (খরচ)', 'Their share of the costs'), hgM(c.share[p.id]))}
        ${c.refundGot[p.id] ? row(L('ফেরত পাওয়া টাকা (রিফান্ড)', 'Refund received'), hgM(c.refundGot[p.id])) : ''}
        ${c.out[p.id] ? row(L('অন্যদের দিয়েছে', 'Sent to others'), hgM(c.out[p.id])) : ''}
        ${c.inn[p.id] ? row(L('অন্যদের থেকে পেয়েছে', 'Received from others'), hgM(c.inn[p.id])) : ''}
        ${c.waivedFor[p.id] || c.waivedBy[p.id] ? row(L('মাফ হয়েছে / মাফ করেছে', 'Forgiven / forgave'), `${hgM(c.waivedFor[p.id])} / ${hgM(c.waivedBy[p.id])}`) : ''}
        <div class="total"><span>${L('এখন বাকি', 'Left now')}</span><span class="${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}">${f > 0 ? L('পাবে ', 'Gets ') : f < 0 ? L('দেবে ', 'Owes ') : ''}${hgM(Math.abs(f))}</span></div></div>
      ${where.length ? `<div class="pcats"><small>${L('তার ভাগ কোথায় কত গেছে', 'Where their share went')}</small>${where.map(([k, v]) => `<div><span>${esc(hgCatLabel(ev, k))}</span><b>${hgM(v)}</b></div>`).join('')}</div>` : ''}</div>`;
  };
  const dayBlock = d => {
    const list = exps.filter(e => (e.date || '') === d).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return `<div class="dayh"><span>${esc(hgDayLabel(ev, d))}${d ? ` <small>${fmtDate(d)}</small>` : ''}</span><b>${hgM(c.byDay[d] ? c.byDay[d].total : 0)}</b></div>`
      + list.map(e => `<div class="two"><span>${e.mode === 'bill' ? '🧾' : '💸'} ${esc(e.title)}<small>${esc(hgCatLabel(ev, e.category))} · ${L('দিয়েছে', 'paid by')} ${e.payers.map(p => esc(pName(ev, p.pid))).join(', ')}</small></span><span>${hgM(e.total)}</span></div>`).join('');
  };
  const cats = hgCatsSorted(c.catTotals);
  return `${sheetHead(L('পুরো হিসাব', 'Full breakdown'), esc(ev.name))}
  <div class="fb-top"><small>${L('মোট খরচ', 'Total spent')}</small><b>${hgM(c.net)}</b>
    <span>${ev.participants.length} ${L('জন', 'people')} · ${exps.length} ${L('খরচ', 'expenses')} · ${evenCount}/${ev.participants.length} ${L('জনের মিটেছে', 'settled')}</span></div>
  ${c.gross ? `<div class="hg-share3 mt12"><button type="button" class="btn sm" data-action="hg-copy-short">📋 ${L('ছোট কপি', 'Short copy')}</button><button type="button" class="btn sm" data-action="hg-rep-pdf">📄 PDF</button><button type="button" class="btn sm" data-action="hg-wa-share">📤 WhatsApp</button></div>` : ''}

  <h4 class="fb-h"><i>${++n}</i>${L('কে কত দিল, কার কত ভাগ', 'Who paid, who owes')}</h4>
  ${ev.participants.map(person).join('') || `<p class="hint">${L('কেউ নেই', 'No one yet')}</p>`}

  <h4 class="fb-h"><i>${++n}</i>${L('সব খরচ, দিন অনুযায়ী', 'All expenses, day by day')}</h4>
  <div class="ledger fb">${exps.length ? c.days.map(dayBlock).join('')
    + row(`= ${L('মোট', 'Total')}`, hgM(c.gross), 'total')
    + (c.refundTotal ? row(`− ${L('রিফান্ড', 'Refunds')}`, hgM(c.refundTotal)) + row(`= ${L('নেট খরচ', 'Net cost')}`, hgM(c.net), 'total') : '') : row(L('এখনও কোনো খরচ নেই', 'No expenses yet'), '—')}</div>

  ${cats.length ? `<h4 class="fb-h"><i>${++n}</i>${L('খাত অনুযায়ী মোট', 'Totals by category')}</h4>
  <div class="ledger fb">${cats.map(([k, v]) => row(esc(hgCatLabel(ev, k)), `${hgM(v)} <small class="muted">${pct(v / (c.net || 1) * 100)}</small>`)).join('')}</div>` : ''}

  ${transfers.length || refunds.length ? `<h4 class="fb-h"><i>${++n}</i>${L('টাকা দেওয়া-নেওয়া ও রিফান্ড', 'Payments & refunds')}</h4>
  <div class="ledger fb">${transfers.map(t => `<div class="two"><span>${esc(pName(ev, t.from))} → ${esc(pName(ev, t.to))}<small>${HG_TKIND[t.kind][isEN() ? 1 : 0]} · ${fmtDate(t.date)}</small></span><span>${hgM(t.amt)}</span></div>`).join('')}
    ${refunds.map(r => `<div class="two"><span>↩️ ${esc((ev.expenses.find(e => e.id === r.expenseId) || {}).title || L('রিফান্ড', 'Refund'))}<small>${L('পেয়েছে', 'received by')} ${esc(pName(ev, r.by))}</small></span><span>${hgM(r.amt)}</span></div>`).join('')}</div>` : ''}

  ${finalDecs.length ? `<h4 class="fb-h"><i>${++n}</i>${L('মাফ ও সমঝোতা (চূড়ান্ত)', 'Agreements (final)')}</h4>
  <div class="ledger fb">${finalDecs.map(d => { const ap = c.applied.find(x => x.id === d.id); return `<div class="two"><span>${esc(pName(ev, d.pid))}: ${esc(hgDecLabel(d.side, d.type))}<small>${esc(d.reason || '')}</small></span><span>${ap && ap.amt ? hgM(ap.amt) : '—'}</span></div>`; }).join('')}</div>` : ''}

  <h4 class="fb-h"><i>${++n}</i>${L('এখন কে কাকে দেবে', 'Who pays whom now')}</h4>
  <div class="ledger fb">${c.suggestions.length ? c.suggestions.map(s => row(`${esc(pName(ev, s.from))} → ${esc(pName(ev, s.to))}`, hgM(s.amt))).join('') : row(c.gross ? '🎉 ' + L('সবার হিসাব মিটে গেছে', 'Everyone is even') : L('এখনও কোনো খরচ নেই', 'No expenses yet'), '')}</div>`;
}
Object.assign(ACTIONS, {
  'hg-hero-detail': () => { const ev = hgCur(); if (ev) openSheet(hgHeroDetail(ev, hgEventCalc(ev))); },
  'hg-title-chip': el => {
    const f = el.closest('form'); if (!f) return;
    if (!f.elements.title.value.trim() || f.elements.title.dataset.chip === '1') { f.elements.title.value = el.dataset.t; f.elements.title.dataset.chip = '1'; }
    if (f.elements.cat) f.elements.cat.value = el.dataset.k;
    runLive(f, f.elements.cat);
    const amt = f.elements.total; if (amt && !amt.value) amt.focus();
  },
  'hg-wa-share': async () => {
    const ev = hgCur(); if (!ev) return; const txt = hgShareText(ev, false);
    try { if (navigator.share) { await navigator.share({ title: ev.name, text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const w = window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
    if (!w) toast((await hgCopy(txt)) ? L('টেক্সট কপি হয়েছে, WhatsApp-এ পেস্ট করুন', 'Text copied, paste it into WhatsApp') : L('শেয়ার করা যায়নি', 'Could not share'), '');
  },
});

/* =========================================================
   আদর্শ বাজেট পরিকল্পনা (ঐচ্ছিক): কয়জন, মোট বা জনপ্রতি কত টাকা, কোথায় কত খরচ করা উচিত
   সব সংখ্যা hgPlanCalc (hangout-calc.js) থেকে, কোনো আলাদা সূত্র নেই।
   ========================================================= */
const hgPlanCatLabel = (ev, k) => (k === 'reserve' ? L('জরুরি রিজার্ভ', 'Emergency reserve') : hgCatLabel(ev, k));
const HG_PLAN_COLORS = ['#A9A4F5', '#6FC3B2', '#F6C453', '#F29BB5', '#A8D58F', '#8FB5F5', '#E8A87C', '#C9B6E4', '#B5B5A0'];
const hgPlanColor = (ev, k) => (k === 'reserve' ? '#7FE3A0' : HG_PLAN_COLORS[Math.max(0, ev.cats.findIndex(c => c.k === k)) % HG_PLAN_COLORS.length]);
// কোন খাতে বেশি গেলে কী করা যায়, ঘটনা-ভিত্তিক পরামর্শ
const HG_CAT_TIPS = {
  food: ['খাবারে বেশি গেছে। বাকি বেলায় সস্তা জায়গা বা শেয়ার করে অর্ডার করুন।', 'Food is running high. Pick cheaper places or share dishes for the next meals.'],
  drinks: ['পানীয়তে বেশি গেছে। পানির বোতল বা ফ্লাস্কে কমান।', 'Drinks are running high. Cut back or carry water.'],
  transport: ['যাতায়াতে বেশি গেছে। ভাগাভাগি করে গাড়ি নিন বা কাছাকাছি জায়গা দেখুন।', 'Transport is high. Share rides or choose closer spots.'],
  fuel: ['জ্বালানি বেশি। রুট বা গাড়ির সংখ্যা আবার দেখুন।', 'Fuel is high. Re-check the route or the number of vehicles.'],
  hotel: ['হোটেলে বেশি গেছে। রুম শেয়ার করুন বা রাত কমান।', 'Hotel is high. Share rooms or cut a night.'],
  room: ['রুম ভাড়া বেশি। রুম শেয়ার করুন বা রাত কমান।', 'Room cost is high. Share rooms or cut a night.'],
  tickets: ['টিকেটে বেশি। সব রাইড না নিয়ে বাছাই করুন।', 'Tickets are high. Pick only the rides you really want.'],
  shopping: ['শপিং বেশি। দরকারি জিনিস আগে।', 'Shopping is high. Needs first.'],
};
function hgPlanMsg(ev, f) {
  const lab = f.k ? hgPlanCatLabel(ev, f.k) : '';
  switch (f.code) {
    case 'over_total': return { lvl: 'bad', t: L(`বাজেটের ${hgM(f.amt)} বেশি খরচ হয়ে গেছে। এখন জনপ্রতি আরও ${hgM(f.perPerson)} করে লাগবে, নয়তো বাকি খরচ কমান।`, `You are ${hgM(f.amt)} over budget. That is ${hgM(f.perPerson)} more per person, or cut what is left.`) };
    case 'near_total': return { lvl: 'warn', t: L(`বাজেটের প্রায় সবটা শেষ, বাকি মাত্র ${hgM(f.amt)}। এখন থেকে সাবধানে।`, `Almost the whole budget is used, only ${hgM(f.amt)} left. Be careful from here.`) };
    case 'reserve_low': return { lvl: 'warn', t: L(`জরুরি রিজার্ভের ${hgM(f.amt)} ছুঁয়ে ফেলেছেন। হঠাৎ খরচের জন্য কিছু হাতে রাখুন।`, `You are eating into the emergency reserve by ${hgM(f.amt)}. Keep something for surprises.`) };
    case 'cat_over': return { lvl: 'bad', t: L(`${lab} আদর্শের চেয়ে ${hgM(f.amt)} বেশি। ${(HG_CAT_TIPS[f.k] || ['অন্য খাত থেকে কমিয়ে মেলান।'])[0]}`, `${lab} is ${hgM(f.amt)} over its share. ${(HG_CAT_TIPS[f.k] || ['', 'Balance it from another category.'])[1]}`) };
    case 'cat_near': return { lvl: 'warn', t: L(`${lab}-এর প্রায় সবটা শেষ, বাকি ${hgM(f.amt)}।`, `${lab} is almost used up, ${hgM(f.amt)} left.`) };
    case 'burn_fast': return { lvl: 'warn', t: L(`সময় ${Math.round(f.timePct)}% গেছে কিন্তু বাজেট ${Math.round(f.budgetPct)}% শেষ। এই গতিতে শেষ দিকে টাকা কম পড়বে।`, `${Math.round(f.timePct)}% of the time has passed but ${Math.round(f.budgetPct)}% of the budget is gone. At this pace you will run short.`) };
    default: return { lvl: 'warn', t: '' };
  }
}
function hgPlanCard(ev, c) {
  const act = ev.status === 'active';
  const p = hgPlanCalc(ev, c, today());
  if (!p) {
    return act ? `<section class="card plancta"><div class="pc-i">💡</div><div class="pc-t"><b>${L('বাজেট ঠিক করুন (ঐচ্ছিক)', 'Set a budget (optional)')}</b>
      <small>${L('কয়জন আর মোট কত টাকা, বললেই অ্যাপ দেখাবে কোথায় কত খরচ করা ঠিক।', 'Say how many people and how much money, and the app shows how much to spend where.')}</small></div>
      <button type="button" class="btn primary sm" data-action="hg-plan">${L('বানান', 'Set up')}</button></section>` : '';
  }
  let acc = 0;
  const all = p.rows.map(r => ({ k: r.k, v: r.ideal })).concat([{ k: 'reserve', v: p.reserveIdeal }]).filter(x => x.v > 0);
  const tot = sum(all.map(x => x.v)) || 1;
  const segs = all.map(x => { const pc = x.v / tot * 100; const s = `<circle class="dseg" cx="21" cy="21" r="15.9155" stroke="${hgPlanColor(ev, x.k)}" stroke-dasharray="${Math.max(0, pc - 0.6).toFixed(2)} ${(100 - Math.max(0, pc - 0.6)).toFixed(2)}" stroke-dashoffset="${(25 - acc).toFixed(2)}"/>`; acc += pc; return s; }).join('');
  const msgs = p.flags.map(f => hgPlanMsg(ev, f)).filter(m => m.t);
  const worst = msgs.find(m => m.lvl === 'bad') || msgs[0];
  const summary = worst ? `<div class="bsum ${worst.lvl}"><b>${worst.lvl === 'bad' ? L('সতর্ক হোন', 'Heads up') : L('খেয়াল রাখুন', 'Keep an eye')}</b><span>${esc(worst.t)}</span></div>`
    : `<div class="bsum ok"><b>${p.spent ? L('ঠিক পথে আছেন', 'On track') : L('বাজেট তৈরি', 'Budget ready')}</b><span>${p.spent ? L('সব খাত আদর্শ ভাগের ভেতরে।', 'Every category is within its share.') : L('খরচ যোগ করলে এখানে মিলিয়ে দেখাবে।', 'Add expenses and they are checked here.')}</span></div>`;
  const rest = msgs.filter(m => m !== worst).slice(0, 3);
  const rowHtml = r => {
    const near = !r.over && r.ideal > 0 && r.ratio >= 0.85;
    return `<div class="brow"><div class="brow-top"><i class="dot" style="--c:${hgPlanColor(ev, r.k)}"></i><span class="grow">${esc(hgPlanCatLabel(ev, r.k))}</span><span class="amt">${hgM(r.spent)} <small>/ ${hgM(r.ideal)}</small></span></div>
      <div class="bbar"><span class="${r.over ? 'over' : near ? 'near' : ''}" style="--c:${hgPlanColor(ev, r.k)};width:${(clamp(r.ratio, 0, 1) * 100).toFixed(1)}%"></span></div>
      <div class="brow-meta"><span>${L('আদর্শ', 'Ideal')} ${pct(r.pct)}</span>${r.over ? `<span class="bad">${hgM(r.spent - r.ideal)} ${L('বেশি', 'over')}</span>` : `<span class="${near ? 'nearc' : ''}">${hgM(r.left)} ${L('বাকি', 'left')}</span>`}</div></div>`;
  };
  const used = clamp(p.spent / p.total * 100, 0, 100);
  return `<section class="card"><div class="card-head"><h2>${L('আদর্শ বাজেট', 'Ideal budget')}</h2>${act ? `<button type="button" class="link" data-action="hg-plan">${L('বদলান', 'Edit')}</button>` : ''}</div>
    <div class="donut-wrap"><div class="donut"><svg viewBox="0 0 42 42" role="img" aria-label="${L('আদর্শ বাজেট ভাগ', 'Ideal budget split')}"><circle cx="21" cy="21" r="15.9155" class="dbg"/>${segs}</svg>
        <div class="dcenter"><small>${L('মোট বাজেট', 'Budget')}</small><b>${hgM(p.total)}</b><em>${L('খরচ', 'spent')} ${pct(p.spent / p.total * 100)}</em></div></div>
      <div class="dlegend"><div><span>${L('জন', 'People')}</span><b>${p.people}</b></div><div><span>${L('জনপ্রতি বাজেট', 'Per person')}</span><b>${hgM(p.each)}</b></div><div><span>${L('জনপ্রতি খরচ এখন', 'Spent per person')}</span><b>${hgM(p.spentPerPerson)}</b></div>
        <div><span>${L('বাকি আছে', 'Left')}</span><b class="${p.remaining < 0 ? 'neg' : ''}">${hgM(p.remaining)}</b></div></div></div>
    ${summary}${rest.map(m => `<p class="hint planhint ${m.lvl}">${esc(m.t)}</p>`).join('')}
    ${p.collected > 0 ? `<div class="plancol"><div class="brow-top"><span class="grow">${L('জমা হয়েছে (কন্ট্রিবিউশন)', 'Collected (contributions)')}</span><span class="amt">${hgM(p.collected)} <small>/ ${hgM(p.total)}</small></span></div><div class="bbar"><span style="--c:var(--good);width:${clamp(p.collected / p.total * 100, 0, 100).toFixed(1)}%"></span></div></div>` : ''}
    <div class="brows">${p.rows.map(rowHtml).join('')}
      <div class="brow"><div class="brow-top"><i class="dot" style="--c:${hgPlanColor(ev, 'reserve')}"></i><span class="grow">${L('জরুরি রিজার্ভ', 'Emergency reserve')}</span><span class="amt">${hgM(Math.max(0, p.remaining))} <small>/ ${hgM(p.reserveIdeal)}</small></span></div>
        <div class="bbar"><span style="--c:${hgPlanColor(ev, 'reserve')};width:${(p.reserveIdeal ? clamp(p.remaining / p.reserveIdeal, 0, 1) * 100 : 0).toFixed(1)}%"></span></div>
        <div class="brow-meta"><span>${L('হঠাৎ খরচের জন্য হাতে রাখুন', 'Keep it for surprises')}</span><span class="${p.remaining >= p.reserveIdeal ? 'ok' : 'bad'}">${p.remaining >= p.reserveIdeal ? L('ঠিক আছে', 'OK') : hgM(p.reserveIdeal - Math.max(0, p.remaining)) + ' ' + L('কম', 'short')}</span></div></div></div></section>`;
}

/* ---------- বাজেট ঠিক করার ফর্ম: নিজের খাত যোগ, লাইভ % হিসাব ---------- */
function hgPlanRow(ev, k, label, split, totTaka, isNew, tone) {
  const ro = k === 'reserve';
  return `<div class="bfrow ${ro ? 'auto' : ''}" data-row="${k}" ${isNew ? 'data-newrow="1"' : ''}><div class="bf-name"><i class="dot" style="--c:${hgPlanColor(ev, k)}"></i><span><b>${esc(label)}</b><small>${ro ? L('বাকিটা নিজে আসে', 'Takes whatever is left') : isNew ? `<a href="#" data-action="hg-plan-delcat" data-k="${k}" class="delnew">${L('বাদ দিন', 'remove')}</a>` : ''}</small></span></div>
    <div class="input-wrap"><input class="input" name="pc_${k}" inputmode="decimal" value="${esc(split || 0)}" ${ro ? 'readonly tabindex="-1"' : ''} aria-label="${esc(label)} %"><span class="suffix">%</span></div>
    <div class="input-wrap has-prefix"><span class="prefix">৳</span><input class="input" name="rs_${k}" inputmode="numeric" value="${Math.round(totTaka * (split || 0) / 100) || ''}" ${ro ? 'readonly tabindex="-1"' : ''} aria-label="${esc(label)} ৳"></div></div>`;
}
function hgPlanSheet(ev) {
  const plan = ev.plan || { people: ev.participants.filter(p => p.active).length || ev.participants.length || 2, mode: 'total', total: 0, each: 0, split: hgPlanDefaults(ev.type, ev.cats.map(c => c.k)) };
  const keys = ev.cats.map(c => c.k);
  const split = Object.assign({}, plan.split);
  keys.forEach(k => { if (split[k] == null) split[k] = 0; });
  const tot = hgPlanTotals(plan, plan.people);
  const amtVal = plan.mode === 'each' ? plan.each : plan.total;
  const rows = keys.map(k => hgPlanRow(ev, k, hgPlanCatLabel(ev, k), split[k], fromMinor(tot.total), false)).join('');
  return `${sheetHead(L('আদর্শ বাজেট', 'Ideal budget'), esc(ev.name))}
  <form data-form="hg-plan" data-live="hg-plan" data-newcats="{}" autocomplete="off">
    <label class="field"><span>1. ${L('কয়জন যাবে / ছিল?', 'How many people?')}</span><input class="input" name="people" inputmode="numeric" value="${esc(plan.people)}"></label>
    <div class="field"><span class="flabel">2. ${L('কীভাবে বাজেট ধরবেন?', 'How do you want to set it?')}</span>${seg('mode', [['total', L('মোট কত টাকা', 'Total money')], ['each', L('জনপ্রতি কত টাকা', 'Per person')]], plan.mode)}</div>
    <label class="field"><span data-amtlabel>3. ${plan.mode === 'each' ? L('প্রত্যেকে কত টাকা দেবে?', 'How much per person?') : L('মোট কত টাকার বাজেট?', 'Total budget?')}</span>${moneyInput('amt', hgTaka(amtVal), plan.mode === 'each' ? L('যেমন: 5000', 'e.g. 5000') : L('যেমন: 25000', 'e.g. 25000'))}</label>
    <div class="preview" data-plantotal></div>
    <div class="section-title">${L('কোথায় কত খরচ করা ঠিক', 'Where the money should go')}</div>
    <div class="plansticky" data-plansplit></div>
    <div class="bf-head"><span>${L('খাত', 'Category')}</span><span>%</span><span>৳</span></div>
    <div data-planrows>${rows}</div><div data-newrows></div>${hgPlanRow(ev, 'reserve', L('জরুরি রিজার্ভ', 'Emergency reserve'), split.reserve, fromMinor(tot.total), false)}
    <div class="addcat"><span class="flabel">${L('নিজের খাত যোগ করুন (যেমন: ফুল, গিফট, বখশিশ)', 'Add your own category (e.g. flowers, gifts, tips)')}</span>
      <div class="btn-row"><input class="input" name="newcat" maxlength="30" placeholder="${L('খাতের নাম', 'Category name')}"><button type="button" class="btn sm" data-action="hg-plan-addcat">${icon('plus', 16)} ${L('যোগ', 'Add')}</button></div></div>
    <p class="hint">${L('অ্যাপ ইভেন্টের ধরন দেখে আদর্শ ভাগ ধরে দিয়েছে। % বা ৳ যেকোনোটা বদলান, অন্যটা মিলে যাবে। উপরের বারে দেখুন কত % ব্যবহার হলো আর কত বাকি।', 'The app suggests a split for this event type. Change either % or ৳ and the other follows. The bar above shows what is used and what is left.')}</p>
    <button type="button" class="btn block" data-action="hg-plan-reset">${L('আদর্শ ভাগে ফিরুন', 'Back to the suggested split')}</button>
    <button class="btn primary block mt8" type="submit">${L('সেভ করুন', 'Save budget')}</button>
    ${ev.plan ? `<button type="button" class="btn danger block mt8" data-action="hg-plan-del">${icon('trash', 18)} ${L('বাজেট মুছুন', 'Remove budget')}</button>` : ''}</form>`;
}
function hgPlanForm(f) {
  const people = Math.max(0, Math.floor(hgNum(f.elements.people.value)));
  const mode = f.elements.mode.value;
  const amt = toMinor(f.elements.amt.value);
  return { people, mode, amt, tot: hgPlanTotals({ people, mode, total: mode === 'total' ? amt : 0, each: mode === 'each' ? amt : 0 }, people) };
}
const hgPlanKeys = f => $$('input[name^="pc_"]', f).map(i => i.name.slice(3)).filter(k => k !== 'reserve');
LIVE['hg-plan'] = (f, t) => {
  const ev = hgCur(); if (!ev) return;
  const keys = hgPlanKeys(f);
  const r = hgPlanForm(f);
  $('[data-amtlabel]', f).textContent = '3. ' + (r.mode === 'each' ? L('প্রত্যেকে কত টাকা দেবে?', 'How much per person?') : L('মোট কত টাকার বাজেট?', 'Total budget?'));
  const totTaka = fromMinor(r.tot.total);
  if (t && t.name) {
    if (t.name.startsWith('rs_') && totTaka > 0) f.elements['pc_' + t.name.slice(3)].value = round2(hgNum(t.value) / totTaka * 100);
    else if (t.name.startsWith('pc_')) f.elements['rs_' + t.name.slice(3)].value = Math.round(totTaka * hgNum(t.value) / 100) || '';
    else if (['amt', 'people', 'mode'].includes(t.name)) keys.concat('reserve').forEach(k => { const i = f.elements['pc_' + k]; if (i) f.elements['rs_' + k].value = Math.round(totTaka * hgNum(i.value) / 100) || ''; });
  }
  const used = sum(keys.map(k => hgNum(f.elements['pc_' + k].value)));
  const res = round2(Math.max(0, 100 - used));
  f.elements.pc_reserve.value = res; f.elements.rs_reserve.value = Math.round(totTaka * res / 100) || '';
  const pt = $('[data-plantotal]', f);
  pt.className = 'preview';
  pt.innerHTML = r.tot.total > 0 ? L(`মোট বাজেট <b>${hgM(r.tot.total)}</b> · জনপ্রতি <b>${hgM(r.tot.each)}</b> (${r.tot.people} জন)`, `Total budget <b>${hgM(r.tot.total)}</b> · <b>${hgM(r.tot.each)}</b> per person (${r.tot.people} people)`) : '';
  const sp = $('[data-plansplit]', f), over = used > 100.001;
  sp.className = 'plansticky' + (over ? ' bad' : '');
  sp.innerHTML = `<div class="ps-top"><span>${over ? L(`<b>${pct(used - 100)}</b> বেশি! কোনো খাত কমান`, `<b>${pct(used - 100)}</b> too much! Lower a category`) : L(`ব্যবহার <b>${pct(used)}</b> · বাকি (রিজার্ভ) <b>${pct(res)}</b>`, `Used <b>${pct(used)}</b> · left (reserve) <b>${pct(res)}</b>`)}</span><span>${totTaka > 0 ? hgM(toMinor(totTaka * Math.min(used, 100) / 100)) + ' / ' + hgM(r.tot.total) : ''}</span></div>
    <div class="bbar"><span class="${over ? 'over' : used > 92 ? 'near' : ''}" style="--c:var(--lav);width:${clamp(used, 0, 100).toFixed(1)}%"></span></div>`;
};
Object.assign(FORMS, {
  'hg-plan': f => {
    const ev = hgGuard(); if (!ev) return;
    const r = hgPlanForm(f);
    if (r.people < 1) return fail(f, L('কয়জন তা লিখুন (কমপক্ষে ১)', 'Enter how many people (at least 1)'), 'people');
    if (r.amt <= 0) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    const keys = hgPlanKeys(f);
    const split = {};
    keys.forEach(k => { split[k] = clamp(hgNum(f.elements['pc_' + k].value), 0, 100); });
    const used = sum(Object.values(split));
    if (used > 100.001) return fail(f, L(`খাতগুলোর মোট ${pct(used)} হয়ে গেছে, ১০০% এর বেশি হতে পারে না`, `The categories add up to ${pct(used)}, over 100%`));
    // নিজের যোগ করা খাত ইভেন্টের খাতের তালিকায়ও ঢোকে, তাই খরচ লেখার সময় বাছা যায়
    let nc = {}; try { nc = JSON.parse(f.dataset.newcats || '{}'); } catch (e) { nc = {}; }
    keys.forEach(k => { if (nc[k] && !ev.cats.some(c => c.k === k)) ev.cats.push({ k, bn: nc[k], en: nc[k] }); });
    split.reserve = round2(100 - used);
    ev.plan = { people: r.people, mode: r.mode, total: r.tot.total, each: r.tot.each, split, updatedAt: Date.now() };
    closeSheet(); hgCommit(ev, `বাজেট ঠিক করা হয়েছে: ${hgM(r.tot.total)} (${r.people} জন)`, `Budget set: ${hgM(r.tot.total)} (${r.people} people)`);
  },
});
Object.assign(ACTIONS, {
  'hg-plan': () => { const ev = hgGuard(); if (ev) openSheet(hgPlanSheet(ev)); },
  'hg-plan-reset': el => {
    const ev = hgCur(), f = el.closest('form'); if (!ev || !f) return;
    const base = ev.cats.map(c => c.k), d = hgPlanDefaults(ev.type, base);
    hgPlanKeys(f).forEach(k => { f.elements['pc_' + k].value = base.includes(k) ? (d[k] || 0) : 0; });
    runLive(f, f.elements.amt);
  },
  'hg-plan-addcat': el => {
    const ev = hgCur(), f = el.closest('form'); if (!ev || !f) return;
    const name = f.elements.newcat.value.trim();
    if (!name) return fail(f, L('খাতের নাম লিখুন', 'Type a category name'), 'newcat');
    if (hgPlanKeys(f).some(k => ((ev.cats.find(c => c.k === k) || {}).bn || '').toLowerCase() === name.toLowerCase()) || Object.values(JSON.parse(f.dataset.newcats || '{}')).some(n => n.toLowerCase() === name.toLowerCase())) return fail(f, L('এই নামে খাত আগে থেকেই আছে', 'That category already exists'), 'newcat');
    const k = 'c_' + uid(), nc = JSON.parse(f.dataset.newcats || '{}'); nc[k] = name; f.dataset.newcats = JSON.stringify(nc);
    const tot = hgPlanForm(f).tot;
    const box = $('[data-newrows]', f); box.insertAdjacentHTML('beforeend', hgPlanRow(ev, k, name, 0, fromMinor(tot.total), true));
    f.elements.newcat.value = ''; $$('.form-error', f).forEach(n => n.remove());
    const inp = f.elements['pc_' + k]; if (inp) inp.focus();
    runLive(f, null);
  },
  'hg-plan-delcat': el => {
    const f = el.closest('form'), k = el.dataset.k; if (!f) return;
    const row = $(`[data-row="${k}"]`, f); if (row) row.remove();
    const nc = JSON.parse(f.dataset.newcats || '{}'); delete nc[k]; f.dataset.newcats = JSON.stringify(nc);
    runLive(f, null);
  },
  'hg-plan-del': () => { const ev = hgGuard(); if (!ev) return; if (!confirm(L('বাজেট মুছবেন? খরচের হিসাব ঠিক থাকবে।', 'Remove the budget? Your expenses stay.'))) return; delete ev.plan; closeSheet(); hgCommit(ev, 'বাজেট মোছা হয়েছে', 'Budget removed'); },
});
