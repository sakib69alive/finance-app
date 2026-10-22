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
  const share = c.gross > 0 ? `<button type="button" class="btn block mt8" data-action="hg-wa-share">📤 ${L('WhatsApp-এ হিসাব পাঠান', 'Send the summary on WhatsApp')}</button>` : '';
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
  <section class="card"><div class="card-head"><h2>${L('বন্ধুদের হিসাব', 'Each friend')}</h2><button type="button" class="link" data-action="tab" data-tab="people">${L('বিস্তারিত', 'Details')}</button></div>
    <div class="plist">${hgOweRows(ev, c).map(({ p, f }) => `<div class="prow"><span class="hgp-av">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>
      <span class="pmain"><b>${esc(p.name)}</b><small>${L('দিয়েছে', 'Paid')} ${hgM(c.paid[p.id])} · ${L('তার ভাগ', 'Share')} ${hgM(c.share[p.id])}</small></span>
      <span class="pend"><b class="${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}">${hgM(Math.abs(f))}</b><small>${f > 0 ? L('পাবে', 'gets') : f < 0 ? L('দেবে', 'owes') : L('মিটেছে', 'even')}</small></span></div>`).join('') || `<p class="hint">${L('এখনও কেউ নেই।', 'No one yet.')}</p>`}</div></section>
  <details class="card more-card"><summary>${L('আরও হিসাব দেখুন', 'More details')} ${icon('chev', 20)}</summary>
    <section class="stat-grid">
      ${stat(L('মোট খরচ (গ্রস)', 'Gross total'), hgM(c.gross), '&nbsp;')}${stat(L('রিফান্ড', 'Refunds'), hgM(c.refundTotal), '&nbsp;')}
      ${stat(L('নেট খরচ', 'Net total'), hgM(c.net), '&nbsp;')}${stat(L('মিটেছে / বাকি', 'Even / open'), `${evenCount} / ${ev.participants.length - evenCount}`, '&nbsp;')}</section>
    ${cats.length ? `<h3 class="sub-title">${L('কোন খাতে কত', 'By category')}</h3>${cats.map(([k, v]) => `<div class="brow"><div class="brow-top"><span class="grow">${esc(hgCatLabel(ev, k))}</span><span class="amt">${hgM(v)}</span></div>
      <div class="bbar"><span style="--c:var(--lav);width:${(v / (c.net || 1) * 100).toFixed(1)}%"></span></div></div>`).join('')}` : ''}
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
function hgHeroDetail(ev, c) {
  const row = (label, val, cls = '') => `<div class="${cls}"><span>${label}</span><span>${val}</span></div>`;
  const exps = ev.expenses.filter(e => !e.del).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const refunds = ev.refunds.filter(r => !r.del), transfers = ev.transfers.filter(t => !t.del);
  const finalDecs = ev.decisions.filter(d => !d.del && d.status === 'finalized');
  const evenCount = ev.participants.filter(p => c.final[p.id] === 0).length;
  const person = p => {
    const f = c.final[p.id];
    return `<div class="hgp"><div class="hgp-top"><span class="hgp-av">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span><div class="hgp-n"><b>${esc(p.name)}</b></div>
      <div class="hgp-bal ${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}"><small>${f > 0 ? L('পাবে', 'gets') : f < 0 ? L('দেবে', 'owes') : L('মিটেছে', 'even')}</small><b>${hgM(Math.abs(f))}</b></div></div>
      <div class="ledger fb">
        ${row(L('টাকা দিয়েছে', 'Paid for the group'), hgM(c.paid[p.id]))}
        ${row(L('তার ভাগ (খরচ)', 'Their share of the costs'), hgM(c.share[p.id]))}
        ${c.refundGot[p.id] ? row(L('ফেরত পাওয়া টাকা (রিফান্ড)', 'Refund received'), hgM(c.refundGot[p.id])) : ''}
        ${c.out[p.id] ? row(L('অন্যদের দিয়েছে', 'Sent to others'), hgM(c.out[p.id])) : ''}
        ${c.inn[p.id] ? row(L('অন্যদের থেকে পেয়েছে', 'Received from others'), hgM(c.inn[p.id])) : ''}
        ${c.waivedFor[p.id] || c.waivedBy[p.id] ? row(L('মাফ হয়েছে / মাফ করেছে', 'Forgiven / forgave'), `${hgM(c.waivedFor[p.id])} / ${hgM(c.waivedBy[p.id])}`) : ''}
        <div class="total"><span>${L('এখন বাকি', 'Left now')}</span><span class="${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}">${f > 0 ? L('পাবে ', 'Gets ') : f < 0 ? L('দেবে ', 'Owes ') : ''}${hgM(Math.abs(f))}</span></div></div></div>`;
  };
  return `${sheetHead(L('পুরো হিসাব', 'Full breakdown'), esc(ev.name))}
  <div class="fb-top"><small>${L('মোট খরচ', 'Total spent')}</small><b>${hgM(c.net)}</b>
    <span>${ev.participants.length} ${L('জন', 'people')} · ${exps.length} ${L('খরচ', 'expenses')} · ${evenCount}/${ev.participants.length} ${L('জনের মিটেছে', 'settled')}</span></div>

  <h4 class="fb-h"><i>1</i>${L('কে কত দিল, কার কত ভাগ', 'Who paid, who owes')}</h4>
  ${ev.participants.map(person).join('') || `<p class="hint">${L('কেউ নেই', 'No one yet')}</p>`}

  <h4 class="fb-h"><i>2</i>${L('সব খরচ', 'All expenses')}</h4>
  <div class="ledger fb">${exps.length ? exps.map(e => `<div class="two"><span>${e.mode === 'bill' ? '🧾' : '💸'} ${esc(e.title)}<small>${fmtDate(e.date)} · ${L('দিয়েছে', 'paid by')} ${e.payers.map(p => esc(pName(ev, p.pid))).join(', ')}</small></span><span>${hgM(e.total)}</span></div>`).join('')
    + row(`= ${L('মোট', 'Total')}`, hgM(c.gross), 'total')
    + (c.refundTotal ? row(`− ${L('রিফান্ড', 'Refunds')}`, hgM(c.refundTotal)) + row(`= ${L('নেট খরচ', 'Net cost')}`, hgM(c.net), 'total') : '') : row(L('এখনও কোনো খরচ নেই', 'No expenses yet'), '—')}</div>

  ${transfers.length || refunds.length ? `<h4 class="fb-h"><i>3</i>${L('টাকা দেওয়া-নেওয়া ও রিফান্ড', 'Payments & refunds')}</h4>
  <div class="ledger fb">${transfers.map(t => `<div class="two"><span>${esc(pName(ev, t.from))} → ${esc(pName(ev, t.to))}<small>${HG_TKIND[t.kind][isEN() ? 1 : 0]} · ${fmtDate(t.date)}</small></span><span>${hgM(t.amt)}</span></div>`).join('')}
    ${refunds.map(r => `<div class="two"><span>↩️ ${esc((ev.expenses.find(e => e.id === r.expenseId) || {}).title || L('রিফান্ড', 'Refund'))}<small>${L('পেয়েছে', 'received by')} ${esc(pName(ev, r.by))}</small></span><span>${hgM(r.amt)}</span></div>`).join('')}</div>` : ''}

  ${finalDecs.length ? `<h4 class="fb-h"><i>4</i>${L('মাফ ও সমঝোতা (চূড়ান্ত)', 'Agreements (final)')}</h4>
  <div class="ledger fb">${finalDecs.map(d => { const ap = c.applied.find(x => x.id === d.id); return `<div class="two"><span>${esc(pName(ev, d.pid))}: ${esc(hgDecLabel(d.side, d.type))}<small>${esc(d.reason || '')}</small></span><span>${ap && ap.amt ? hgM(ap.amt) : '—'}</span></div>`; }).join('')}</div>` : ''}

  <h4 class="fb-h"><i>${finalDecs.length ? 5 : (transfers.length || refunds.length ? 4 : 3)}</i>${L('এখন কে কাকে দেবে', 'Who pays whom now')}</h4>
  <div class="ledger fb">${c.suggestions.length ? c.suggestions.map(s => row(`${esc(pName(ev, s.from))} → ${esc(pName(ev, s.to))}`, hgM(s.amt))).join('') : row(c.gross ? '🎉 ' + L('সবার হিসাব মিটে গেছে', 'Everyone is even') : L('এখনও কোনো খরচ নেই', 'No expenses yet'), '')}</div>
  ${c.gross ? `<div class="btn-row mt12"><button type="button" class="btn primary" data-action="hg-wa-share">📤 ${L('WhatsApp-এ পাঠান', 'Send on WhatsApp')}</button><button type="button" class="btn" data-action="hg-rep-memo">${icon('doc', 18)} ${L('PDF মেমো', 'PDF memo')}</button></div>` : ''}`;
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
