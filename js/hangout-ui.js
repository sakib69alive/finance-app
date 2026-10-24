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
const hgNow = () => hgCur();
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
    { done: people >= hgTerm(ev).min, t: hgTerm(ev).step, a: 'hg-add-person', btn: hgTerm(ev).add },
    { done: exps > 0, t: L('প্রথম খরচটা লিখুন', 'Add the first expense'), a: 'hg-add-expense', btn: L('খরচ লিখুন', 'Add expense'), need: people >= hgTerm(ev).min },
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
  const owe = sum(ev.participants.map(p => Math.max(0, -c.final[p.id])));
  const moved = sum(Object.values(c.byKind.settlement));
  const prog = owe + moved > 0 ? moved / (owe + moved) * 100 : 0;
  const share = c.gross > 0 ? `<div class="hg-share3 mt8"><button type="button" class="btn sm" data-action="hg-copy-short">📋 ${L('ছোট কপি', 'Short copy')}</button><button type="button" class="btn sm" data-action="hg-rep-pdf">📄 PDF</button><button type="button" class="btn sm" data-action="hg-wa-share">📤 WhatsApp</button></div>` : '';
  const head = c.suggestions.length ? `<div class="sg-hero"><div><small>${L('এখনও মেটানো বাকি', 'Still to settle')}</small><b>${hgM(owe)}</b></div><div><small>${L('লেনদেন লাগবে', 'Payments needed')}</small><b>${c.suggestions.length}</b></div></div>
      <div class="sg-prog"><div class="bbar"><span style="--c:var(--good);width:${prog.toFixed(1)}%"></span></div><small>${L(`এ পর্যন্ত মিটেছে ${hgM(moved)}`, `${hgM(moved)} settled so far`)}</small></div>` : '';
  const card = (s, i) => {
    const from = hgPerson(ev, s.from), later = hgIsLater(from, c);
    return `<div class="sg"><div class="sg-top"><div class="sg-who">${hgAv(from)}<i>→</i>${hgAv(hgPerson(ev, s.to))}</div>
        <div class="sg-t"><b>${hgNm(ev, s.from)}</b> <span>${L('দেবে', 'pays')}</span> <b>${hgNm(ev, s.to)}</b>${later ? `<small class="warnc">⏳ ${L('পরের বিলে দেবে বলেছে', 'will pay with the next bill')}</small>` : ''}</div>
        <div class="sg-a">${hgM(s.amt)}</div></div>
      ${act ? `<div class="sg-btns"><button type="button" class="btn sm primary" data-action="hg-pay-full" data-i="${i}">${L('দিয়েছে ✓', 'Paid ✓')}</button><button type="button" class="btn sm" data-action="hg-pay-opts" data-i="${i}">${L('অন্যভাবে', 'Other way')}</button></div>` : ''}</div>`;
  };
  return `<section class="card"><div class="card-head"><h2>${L('কে কাকে দেবে', 'Who pays whom')}</h2></div>
    ${c.suggestions.length ? head + c.suggestions.map(card).join('') + `<p class="hint">${L('টাকা দিলে "দিয়েছে ✓"। কিছুটা দিলে বা অন্য কেউ দিলে "কিছুটা / অন্যভাবে"।', 'Tap "Paid ✓" once paid. For part payment or someone else paying use "Part / other".')}</p>${share}`
      : (allEven ? `<div class="bsum ok"><b>🎉 ${L('সবার হিসাব মিটে গেছে!', 'Everyone is even!')}</b><span>${L('কাউকে কিছু দিতে হবে না।', 'Nobody owes anything.')}</span></div>${withClose && act ? `<button type="button" class="btn primary block mt8" data-action="hg-settle">${icon('check', 18)} ${L('ইভেন্ট বন্ধ করুন', 'Close the event')}</button>` : ''}${share}`
        : `<p class="hint">${ev.participants.length >= 2 ? L('খরচ যোগ করলে এখানে দেখাবে কে কাকে কত দেবে।', 'Add expenses and this shows who pays whom.') : L('আগে বন্ধুদের নাম যোগ করুন।', 'Add your friends first.')}</p>`)}</section>`;
}
// প্রত্যেকের অবস্থা এক নজরে: বাঁয়ে লাল = দেবে, ডানে সবুজ = পাবে
function hgBalanceBoard(ev, c) {
  const rows = ev.participants.filter(p => p.active || c.final[p.id] !== 0).map(p => ({ p, f: c.final[p.id] })).sort((x, y) => y.f - x.f);
  const max = Math.max(1, ...rows.map(r => Math.abs(r.f)));
  if (!c.gross) return '';
  return `<section class="card"><div class="card-head"><h2>${L('সবার অবস্থা', 'Where everyone stands')}</h2></div>
    <div class="bb-legend"><span class="neg">◀ ${L('দেবে', 'Owes')}</span><span class="pos">${L('পাবে', 'Gets')} ▶</span></div>
    ${rows.map(({ p, f }) => `<button type="button" class="bb2" data-action="hg-person-stmt" data-p="${p.id}">${hgAv(p)}
      <span class="bb2-m"><span class="bb2-n"><b>${esc(p.name)}</b><b class="${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}">${f === 0 ? L('মিটেছে ✓', 'Even ✓') : (f > 0 ? '+' : '−') + hgM(Math.abs(f))}</b></span>
        <span class="bb2-bar"><i class="neg" style="width:${f < 0 ? (Math.abs(f) / max * 50).toFixed(1) : 0}%"></i><u></u><i class="pos" style="width:${f > 0 ? (f / max * 50).toFixed(1) : 0}%"></i></span></span></button>`).join('')}</section>`;
}

function hgDueCard(ev) {
  const gs = hgDueGroups(ev), open = gs.filter(g => g.rem > 0), act = ev.status === 'active';
  const owe = sum(open.filter(g => g.dir === 'owe').map(g => g.rem)), get = sum(open.filter(g => g.dir === 'get').map(g => g.rem));
  return `<section class="card"><div class="card-head"><h2>${L('বাকির খাতা', 'Credit book')}</h2>${act ? `<button type="button" class="link" data-action="hg-due-add">+ ${L('বাকি লিখুন', 'Add')}</button>` : ''}</div>
    <div class="minis"><div class="mini"><small>${L('আমি দেব', 'I owe')}</small><b class="${owe ? 'neg' : ''}">${hgM(owe)}</b></div><div class="mini"><small>${L('আমি পাব', 'I am owed')}</small><b class="${get ? 'pos' : ''}">${hgM(get)}</b></div></div>
    ${open.length ? `<div class="list mt8">${open.map(g => `<button type="button" class="lrow" data-action="hg-due-open" data-k="${esc(g.key)}"><span class="lic">${g.dir === 'owe' ? '📤' : '📥'}</span><span class="lmain"><b>${esc(g.who)}</b><small>${g.dir === 'owe' ? L('আমি দেব', 'I owe') : L('আমি পাব', 'I am owed')} · ${g.dues.filter(d => hgDueRem(d) > 0).map(d => esc(d.title || L('বাকি', 'credit'))).slice(0, 2).join(', ')}</small></span><span class="lend"><b class="${g.dir === 'owe' ? 'neg' : 'pos'}">${hgM(g.rem)}</b></span></button>`).join('')}</div>`
      : `<p class="hint" style="margin:8px 0 0">${gs.length ? L('সব বাকি মিটে গেছে 🎉', 'All settled 🎉') : L('বাকিতে কিছু কিনলে খরচ লেখার সময় "বাকিতে কিনেছি" টিক দিন। কে কত পাবে বা কার কাছে কত দেবেন এখানে জমা থাকবে।', 'When you buy on credit tick "Bought on credit" while adding the expense. Who is owed what is kept here.')}</p>`}
    ${gs.filter(g => g.rem === 0).length ? `<details class="more mt8"><summary>${L('মিটে যাওয়া', 'Settled')} · ${gs.filter(g => g.rem === 0).length}</summary><div class="list">${gs.filter(g => g.rem === 0).map(g => `<button type="button" class="lrow" data-action="hg-due-open" data-k="${esc(g.key)}"><span class="lic">✅</span><span class="lmain"><b>${esc(g.who)}</b><small>${hgM(g.total)}</small></span></button>`).join('')}</div></details>` : ''}</section>`;
}
function hgSoloHome(ev, c) {
  if (typeof hgIsHouse === 'function' && hgIsHouse(ev)) return hgHouseHome(ev, c);
  const act = ev.status === 'active';
  const exps = ev.expenses.filter(e => !e.del);
  const todayT = c.byDay[today()] ? c.byDay[today()].total : 0;
  const first = c.days.filter(Boolean)[0];
  const span = first ? Math.max(1, daysBetween(first, today()) + 1) : 1;
  const cats = ev.cats.filter(k => !['discount', 'vat', 'service', 'other_charges'].includes(k.k));
  const lock = act ? '' : `<div class="hg-lock ${ev.status}"><span>${ev.status === 'settled' ? L('এই হিসাব বন্ধ করা আছে। বদলাতে আবার খুলুন।', 'This is closed. Reopen it to change anything.') : L('এটা আর্কাইভে আছে।', 'This is archived.')}</span><button type="button" class="btn sm" data-action="${ev.status === 'settled' ? 'hg-reopen' : 'hg-restore'}">${ev.status === 'settled' ? L('আবার খুলুন', 'Reopen') : L('রিস্টোর', 'Restore')}</button></div>`;
  const recent = exps.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  return `${lock}${hgIssuesHtml(ev, c)}
  <section class="hero tappable" data-action="hg-hero-detail" role="button" tabindex="0" aria-label="${L('পুরো হিসাব দেখুন', 'See the full breakdown')}">
    <div class="hero-top"><div><div class="hero-label">${L('মোট খরচ', 'Total spent')}</div><div class="hero-target">${hgM(c.net)}</div>
      <div class="hero-sub">${(HG_TYPES[ev.type] || HG_TYPES.custom).icon} ${hgTypeLabel(ev.type)}</div></div></div>
    <div class="hero-chips"><div><small>${L('আজ', 'Today')}</small><b>${hgM(todayT)}</b></div><div><small>${L('গড় প্রতিদিন', 'Daily average')}</small><b>${hgM(Math.round(c.net / span))}</b></div><div><small>${L('খরচ', 'Entries')}</small><b>${exps.length}</b></div></div>
    ${(() => { const pl = hgPlanCalc(ev, c, today()); return pl ? `<div class="hero-foot"><span>${L('বাজেট', 'Budget')} <b>${hgM(pl.total)}</b></span><span>${pl.remaining >= 0 ? L('বাকি', 'Left') : L('বেশি', 'Over')} <b>${hgM(Math.abs(pl.remaining))}</b></span></div>` : ''; })()}
    <div class="hero-more">${L('ট্যাপ করে পুরো হিসাব দেখুন', 'Tap for the full breakdown')} ${icon('chev', 16)}</div></section>
  ${act ? `<div class="quick four"><button type="button" class="qbtn" data-action="hg-add-expense"><span class="qi">${icon('receipt')}</span>${L('খরচ লিখুন', 'Add expense')}</button>
    <button type="button" class="qbtn" data-action="hg-due-add"><span class="qi">${icon('clock')}</span>${L('বাকি', 'Credit')}</button>
    <button type="button" class="qbtn" data-action="hg-plan"><span class="qi">${icon('wallet')}</span>${L('বাজেট', 'Budget')}</button>
    <button type="button" class="qbtn" data-action="hg-rep-slip"><span class="qi">${icon('doc')}</span>${L('রিপোর্ট', 'Report')}</button></div>` : ''}
  ${act ? `<section class="card"><div class="card-head"><h2>${L('কোন খাতে খরচ?', 'Which category?')}</h2></div><p class="hint" style="margin:0 0 10px">${L('খাতে ট্যাপ করলেই সেই খাতের খরচ লেখার ফর্ম খুলবে।', 'Tap a category to add an expense in it.')}</p>
    <div class="ctiles">${cats.map(k => `<button type="button" class="ctile" data-action="hg-add-cat" data-k="${k.k}"><b>${esc(isEN() ? k.en : k.bn)}</b><small>${c.catTotals[k.k] > 0 ? hgM(c.catTotals[k.k]) : L('যোগ করুন', 'Add')}</small></button>`).join('')}</div></section>` : ''}
  ${hgPlanCard(ev, c)}
  ${recent.length ? `<section class="card"><div class="card-head"><h2>${L('সাম্প্রতিক খরচ', 'Recent expenses')}</h2><button type="button" class="link" data-action="tab" data-tab="expenses">${L('সব দেখুন', 'See all')}</button></div>
    <div class="list">${recent.map(e => `<button type="button" class="lrow" data-action="hg-edit-expense" data-id="${e.id}"><span class="lic">${e.mode === 'bill' ? '🧾' : '💸'}</span><span class="lmain"><b>${esc(e.title)}</b><small>${esc(hgCatLabel(ev, e.category))} · ${fmtDate(e.date)}</small></span><span class="lend"><b>${hgM(e.total)}</b></span></button>`).join('')}</div></section>` : ''}
  ${hgWhereCard(ev, c)}
  ${ev.participants.length > 1 ? `<section class="card"><div class="card-head"><h2>${hgTerm(ev).each}</h2></div><div class="plist">${hgOweRows(ev, c).map(({ p, f }) => `<button type="button" class="prow" data-action="hg-person-stmt" data-p="${p.id}">${hgAv(p)}<span class="pmain"><b>${esc(p.name)}</b><small>${L('দিয়েছে', 'Paid')} ${hgM(c.paid[p.id])} · ${L('তার ভাগ', 'Share')} ${hgM(c.share[p.id])}</small></span><span class="pend"><b class="${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}">${hgM(Math.abs(f))}</b><small>${f > 0 ? L('পাবে', 'gets') : f < 0 ? L('দেবে', 'owes') : L('মিটেছে', 'even')}</small></span></button>`).join('')}</div></section>` : ''}
  ${hgDueCard(ev)}`;
}

function hgHomeTab(ev, c) {
  if (hgSolo(ev)) return hgSoloHome(ev, c);
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
      <div><small>${hgTerm(ev).one}</small><b>${ev.participants.length}</b></div>
      <div><small>${L('খরচ', 'Expenses')}</small><b>${exps.length}</b></div>
      <div><small>${L('বাকি আছে', 'To settle')}</small><b>${hgM(open)}</b></div></div>
    <div class="hero-more">${L('ট্যাপ করে পুরো হিসাব দেখুন', 'Tap for the full breakdown')} ${icon('chev', 16)}</div>
  </section>
  ${hgStepsCard(ev, c)}
  ${ev.status === 'active' ? `<div class="quick four">
    <button type="button" class="qbtn" data-action="hg-add-expense"><span class="qi">${icon('receipt')}</span>${L('খরচ', 'Expense')}</button>
    <button type="button" class="qbtn" data-action="hg-add-personal"><span class="qi">${icon('person')}</span>${L('ব্যক্তিগত খরচ', 'Personal cost')}</button>
    <button type="button" class="qbtn" data-action="hg-add-bill"><span class="qi">${icon('doc')}</span>${L('রেস্টুরেন্ট বিল', 'Restaurant bill')}</button>
    <button type="button" class="qbtn" data-action="hg-money"><span class="qi">${icon('wallet')}</span>${L('টাকা জমা/শোধ', 'Money in/out')}</button></div>` : ''}
  ${hgAttnCard(ev, c)}
  ${hgWhoPays(ev, c, true)}
  ${hgPoolCard(ev, c)}
  ${hgPlanCard(ev, c)}
  ${hgWhereCard(ev, c)}
  <section class="card"><div class="card-head"><h2>${hgTerm(ev).each}</h2><button type="button" class="link" data-action="tab" data-tab="people">${L('বিস্তারিত', 'Details')}</button></div>
    <div class="plist">${hgOweRows(ev, c).map(({ p, f }) => `<button type="button" class="prow" data-action="hg-person-stmt" data-p="${p.id}">${hgAv(p)}
      <span class="pmain"><b>${esc(p.name)}</b><small>${L('দিয়েছে', 'Paid')} ${hgM(c.paid[p.id])} · ${L('তার ভাগ', 'Share')} ${hgM(c.share[p.id])}</small></span>
      <span class="pend"><b class="${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}">${hgM(Math.abs(f))}</b><small>${f > 0 ? L('পাবে', 'gets') : f < 0 ? L('দেবে', 'owes') : L('মিটেছে', 'even')}</small></span></button>`).join('') || `<p class="hint">${L('এখনও কেউ নেই।', 'No one yet.')}</p>`}</div></section>
  <details class="card more-card"><summary>${L('আরও হিসাব দেখুন', 'More details')} ${icon('chev', 20)}</summary>
    <section class="stat-grid">
      ${stat(L('মোট খরচ (গ্রস)', 'Gross total'), hgM(c.gross), '&nbsp;')}${stat(L('রিফান্ড', 'Refunds'), hgM(c.refundTotal), '&nbsp;')}
      ${stat(L('নেট খরচ', 'Net total'), hgM(c.net), '&nbsp;')}${stat(L('মিটেছে / বাকি', 'Even / open'), `${evenCount} / ${ev.participants.length - evenCount}`, '&nbsp;')}</section>
    ${openDecisions ? `<div class="bsum warn"><b>${L(`${openDecisions}টা সমঝোতা এখনও চূড়ান্ত হয়নি`, `${openDecisions} agreement(s) not finalized`)}</b><span>${L('"মেটানো" ট্যাবের নিচে দেখুন।', 'See the bottom of the Settle tab.')}</span></div>` : ''}
  </details>`;
}

/* ---------- বন্ধুরা, খরচ ---------- */
function hgPeopleTab(ev, c) {
  return `<div class="page-head"><h1>${hgTerm(ev).tab}</h1>${ev.status === 'active' ? `<button type="button" class="btn primary sm" data-action="hg-add-person">${icon('plus', 18)} ${hgTerm(ev).one}</button>` : ''}</div>
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
    ${hgBalanceBoard(ev, c)}
    ${hgPoolCard(ev, c)}
    ${ev.status === 'active' ? `<button type="button" class="btn block" data-action="hg-money">💰 ${L('টাকা জমা নিলাম / শোধ পেলাম / ফেরত দিলাম', 'Money received / paid / returned')}</button>` : ''}
    <section class="card mt12"><div class="card-head"><h2>${L('টাকা দেওয়া-নেওয়া', 'Payments')}</h2></div>
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
      </div>
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
  'hg-add-cat': el => { const ev = hgCur(); if (!ev) return; hgEnsureMe(ev); const g = hgGuard(); if (g) openSheet(hgExpenseForm(null, el.dataset.k)); },
  'hg-remind': async el => {
    const ev = hgCur(); if (!ev) return; const s = hgEventCalc(ev).suggestions[Number(el.dataset.i)]; if (!s) return;
    const txt = L(`${pName(ev, s.from)}, "${ev.name}"-এ তোমার ${hgM(s.amt)} বাকি আছে। ${pName(ev, s.to)}-কে সুবিধামতো দিয়ে দিও। ধন্যবাদ 🙏`, `Hi ${pName(ev, s.from)}, you still owe ${hgM(s.amt)} for "${ev.name}". Please pay ${pName(ev, s.to)} when you can. Thanks 🙏`);
    try { if (navigator.share) { await navigator.share({ title: ev.name, text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    toast((await hgCopy(txt)) ? L('বার্তা কপি হয়েছে, বন্ধুকে পাঠান', 'Message copied, send it to your friend') : L('কপি করা যায়নি', 'Could not copy'));
  },
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
  // খাত অনুযায়ী ভাগ এখন "বাজেট ও খরচ" কার্ডের চার্টে (hgPlanCard), এখানে শুধু দিন অনুযায়ী
  if (days.length < 2) return '';
  return `<section class="card"><div class="card-head"><h2>${L('দিন অনুযায়ী খরচ', 'Spending by day')}</h2><button type="button" class="link" data-action="hg-hero-detail">${L('বিস্তারিত', 'Details')}</button></div>
    ${days.length > 1 ? `${days.map(d => `<div class="hg-day"><span><b>${esc(hgDayLabel(ev, d))}</b><small>${d ? fmtDate(d) + ' · ' : ''}${c.byDay[d].count} ${L('খরচ', 'expenses')} · ${hgCatsSorted(c.byDay[d].byCat).slice(0, 2).map(([k]) => esc(hgCatLabel(ev, k))).join(', ')}</small></span><b>${hgM(c.byDay[d].total)}</b></div>`).join('')}` : ''}
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
const HG_PLAN_COLORS = ['#D9BE6A', '#6FC3B2', '#F6C453', '#F29BB5', '#A8D58F', '#8FB5F5', '#E8A87C', '#C9B6E4', '#B5B5A0'];
const hgPlanColor = (ev, k) => { if (k === 'reserve') return '#7FE3A0'; const i = ev.cats.findIndex(c => c.k === k); return HG_PLAN_COLORS[(i >= 0 ? i : [...k].reduce((q, ch) => q + ch.charCodeAt(0), 0)) % HG_PLAN_COLORS.length]; };
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
function hgDonut(ev, rows, centerHtml) {
  const tot = sum(rows.map(r => r.spent)) || 1;
  let acc = 0;
  const segs = rows.map(r => { const pc = r.spent / tot * 100; const d = Math.max(0, pc - 0.6); const s = `<circle class="dseg" cx="21" cy="21" r="15.9155" stroke="${hgPlanColor(ev, r.k)}" stroke-dasharray="${d.toFixed(2)} ${(100 - d).toFixed(2)}" stroke-dashoffset="${(25 - acc).toFixed(2)}"/>`; acc += pc; return s; }).join('');
  return `<div class="donut"><svg viewBox="0 0 42 42" role="img" aria-label="${L('খরচের ভাগ', 'Spending split')}"><circle cx="21" cy="21" r="15.9155" class="dbg"/>${segs}</svg><div class="dcenter">${centerHtml}</div></div>`;
}
// বাজেট ও খরচ: খাতের ভাগ ও চার্ট শুধু আসল লেনদেন থেকে (আগে থেকে ঠিক করা কোনো আদর্শ ভাগ নেই)
function hgPlanCard(ev, c) {
  const act = ev.status === 'active';
  const p = hgPlanCalc(ev, c, today());
  const rows = hgCatsSorted(c.catTotals).map(([k, spent]) => ({ k, spent }));
  const spentAll = sum(rows.map(r => r.spent));
  if (!p && !rows.length) {
    return act ? `<section class="card plancta"><div class="pc-i">💡</div><div class="pc-t"><b>${L('বাজেট ঠিক করুন (ঐচ্ছিক)', 'Set a budget (optional)')}</b>
      <small>${L('কয়জন আর মোট কত টাকা, বললেই খরচের সাথে সাথে বাকি টাকা আর খাতের ভাগ চার্টে দেখাবে।', 'Say how many people and how much money, and the chart shows what is left and where it goes as you spend.')}</small></div>
      <button type="button" class="btn primary sm" data-action="hg-plan">${L('ঠিক করুন', 'Set up')}</button></section>` : '';
  }
  const msgs = p ? p.flags.map(f => hgPlanMsg(ev, f)).filter(m => m.t) : [];
  const worst = msgs.find(m => m.lvl === 'bad') || msgs[0];
  const summary = p ? (worst ? `<div class="bsum ${worst.lvl}"><b>${worst.lvl === 'bad' ? L('সতর্ক হোন', 'Heads up') : L('খেয়াল রাখুন', 'Keep an eye')}</b><span>${esc(worst.t)}</span></div>`
    : `<div class="bsum ok"><b>${p.spent ? L('ঠিক পথে আছেন', 'On track') : L('বাজেট তৈরি', 'Budget ready')}</b><span>${p.spent ? L('বাজেটের ভেতরে আছে।', 'Within the budget.') : L('খরচ যোগ করলে এখানে মিলিয়ে দেখাবে।', 'Add expenses and they are tracked here.')}</span></div>`) : '';
  const center = p ? `<small>${L('খরচ', 'Spent')}</small><b>${hgM(p.spent)}</b><em>${L('বাজেটের', 'of')} ${pct(p.total ? p.spent / p.total * 100 : 0)}</em>` : `<small>${L('মোট খরচ', 'Total spent')}</small><b>${hgM(spentAll)}</b><em>${rows.length} ${L('খাত', 'categories')}</em>`;
  const legend = p ? `<div><span>${L('মোট বাজেট', 'Budget')}</span><b>${hgM(p.total)}</b></div><div><span>${L('বাকি আছে', 'Left')}</span><b class="${p.remaining < 0 ? 'neg' : ''}">${hgM(p.remaining)}</b></div><div><span>${L('জন', 'People')}</span><b>${p.people}</b></div><div><span>${L('জনপ্রতি খরচ', 'Per person')}</span><b>${hgM(p.spentPerPerson)}</b></div>`
    : `<div><span>${L('সবচেয়ে বেশি', 'Biggest')}</span><b>${esc(hgPlanCatLabel(ev, rows[0].k))}</b></div><div><span>${L('তার ভাগ', 'Its share')}</span><b>${pct(rows[0].spent / (spentAll || 1) * 100)}</b></div>`;
  const rowHtml = r => `<div class="brow"><div class="brow-top"><i class="dot" style="--c:${hgPlanColor(ev, r.k)}"></i><span class="grow">${esc(hgPlanCatLabel(ev, r.k))}</span><span class="amt">${hgM(r.spent)} <small>${pct(r.spent / (spentAll || 1) * 100)}</small></span></div>
      <div class="bbar"><span style="--c:${hgPlanColor(ev, r.k)};width:${clamp(r.spent / (spentAll || 1) * 100, 0, 100).toFixed(1)}%"></span></div></div>`;
  return `<section class="card"><div class="card-head"><h2>${L('বাজেট ও খরচ', 'Budget & spending')}</h2>${act ? `<button type="button" class="link" data-action="hg-plan">${p ? L('বদলান', 'Edit') : L('বাজেট ঠিক করুন', 'Set budget')}</button>` : ''}</div>
    ${rows.length ? `<div class="donut-wrap">${hgDonut(ev, rows, center)}<div class="dlegend">${legend}</div></div>` : (p ? `<div class="dlegend flat">${legend}</div>` : '')}
    ${p ? `<div class="bbar thick"><span class="${p.remaining < 0 ? 'over' : p.spent > p.total * 0.85 ? 'near' : ''}" style="--c:var(--good);width:${clamp(p.total ? p.spent / p.total * 100 : 0, 0, 100).toFixed(1)}%"></span></div>` : ''}
    ${summary}
    ${p && p.collected > 0 ? `<div class="plancol"><div class="brow-top"><span class="grow">${L('জমা হয়েছে (কন্ট্রিবিউশন)', 'Collected (contributions)')}</span><span class="amt">${hgM(p.collected)} <small>/ ${hgM(p.total)}</small></span></div><div class="bbar"><span style="--c:var(--good);width:${clamp(p.collected / p.total * 100, 0, 100).toFixed(1)}%"></span></div></div>` : ''}
    ${rows.length ? `<div class="brows">${rows.map(rowHtml).join('')}</div>` : `<p class="hint">${L('খরচ যোগ করলে খাত অনুযায়ী ভাগ এখানে নিজে আঁকা হবে।', 'Add expenses and the split by category is drawn here.')}</p>`}</section>`;
}

/* ---------- বাজেট ঠিক করার ফর্ম: কয়জন আর মোট (বা জনপ্রতি) কত টাকা ---------- */
function hgPlanSheet(ev) {
  const plan = ev.plan || { people: ev.participants.filter(p => p.active).length || ev.participants.length || 2, mode: 'total', total: 0, each: 0 };
  const amtVal = plan.mode === 'each' ? plan.each : plan.total;
  return `${sheetHead(L('বাজেট', 'Budget'), esc(ev.name))}
  <form data-form="hg-plan" data-live="hg-plan" autocomplete="off">
    <p class="hint" style="margin-top:0">${L('শুধু মোট টাকাটা বলুন। কোন খাতে কত যাচ্ছে তা আপনার আসল লেনদেন থেকে নিজে চার্টে আসবে।', 'Just say the total. Where it goes comes straight from your real expenses.')}</p>
    <label class="field"><span>${L('কয়জন যাবে / ছিল?', 'How many people?')}</span><input class="input" name="people" inputmode="numeric" value="${esc(plan.people)}"></label>
    <div class="field"><span class="flabel">${L('কীভাবে বাজেট ধরবেন?', 'How do you want to set it?')}</span>${seg('mode', [['total', L('মোট কত টাকা', 'Total money')], ['each', L('জনপ্রতি কত টাকা', 'Per person')]], plan.mode)}</div>
    <label class="field"><span data-amtlabel>${plan.mode === 'each' ? L('প্রত্যেকে কত টাকা দেবে?', 'How much per person?') : L('মোট কত টাকার বাজেট?', 'Total budget?')}</span>${moneyInput('amt', hgTaka(amtVal), plan.mode === 'each' ? L('যেমন: 5000', 'e.g. 5000') : L('যেমন: 25000', 'e.g. 25000'))}</label>
    <div class="preview" data-plantotal></div>
    <button class="btn primary block mt12" type="submit">${L('সেভ করুন', 'Save budget')}</button>
    ${ev.plan ? `<button type="button" class="btn danger block mt8" data-action="hg-plan-del">${icon('trash', 18)} ${L('বাজেট মুছুন', 'Remove budget')}</button>` : ''}</form>`;
}
function hgPlanForm(f) {
  const people = Math.max(0, Math.floor(hgNum(f.elements.people.value)));
  const mode = f.elements.mode.value;
  const amt = toMinor(f.elements.amt.value);
  return { people, mode, amt, tot: hgPlanTotals({ people, mode, total: mode === 'total' ? amt : 0, each: mode === 'each' ? amt : 0 }, people) };
}
LIVE['hg-plan'] = f => {
  const r = hgPlanForm(f);
  $('[data-amtlabel]', f).textContent = r.mode === 'each' ? L('প্রত্যেকে কত টাকা দেবে?', 'How much per person?') : L('মোট কত টাকার বাজেট?', 'Total budget?');
  const pt = $('[data-plantotal]', f);
  pt.className = 'preview';
  pt.innerHTML = r.tot.total > 0 ? L(`মোট বাজেট <b>${hgM(r.tot.total)}</b> · জনপ্রতি <b>${hgM(r.tot.each)}</b> (${r.tot.people} জন)`, `Total budget <b>${hgM(r.tot.total)}</b> · <b>${hgM(r.tot.each)}</b> per person (${r.tot.people} people)`) : '';
};
Object.assign(FORMS, {
  'hg-plan': f => {
    const ev = hgGuard(); if (!ev) return;
    const r = hgPlanForm(f);
    if (r.people < 1) return fail(f, L('কয়জন তা লিখুন (কমপক্ষে ১)', 'Enter how many people (at least 1)'), 'people');
    if (r.amt <= 0) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    ev.plan = { people: r.people, mode: r.mode, total: r.tot.total, each: r.tot.each, split: {}, updatedAt: Date.now() };
    closeSheet(); hgCommit(ev, `বাজেট ঠিক করা হয়েছে: ${hgM(r.tot.total)} (${r.people} জন)`, `Budget set: ${hgM(r.tot.total)} (${r.people} people)`);
  },
});
Object.assign(ACTIONS, {
  'hg-plan': () => { const ev = hgGuard(); if (ev) { openSheet(hgPlanSheet(ev)); const f = $('form[data-form="hg-plan"]'); if (f) runLive(f, null); } },
  'hg-plan-del': () => { const ev = hgGuard(); if (!ev) return; if (!confirm(L('বাজেট মুছবেন? খরচের হিসাব ঠিক থাকবে।', 'Remove the budget? Your expenses stay.'))) return; delete ev.plan; closeSheet(); hgCommit(ev, 'বাজেট মোছা হয়েছে', 'Budget removed'); },
});

/* =========================================================
   টাকার লেনদেন (জমা নেওয়া, দেনা শোধ, ফেরত দেওয়া) এক ট্যাপের সুবিধা + জমা টাকার (পুলের) হিসাব
   হোস্টের কাছে বন্ধুরা টাকা জমা দিতে পারে; কার কত জমা, কত খরচ, কাকে কত ফেরত দিতে হবে সব দেখায়।
   ========================================================= */
function hgPoolCard(ev, c) {
  const p = hgPoolCalc(ev, c);
  if (!p || !p.hasPool) return '';
  const act = ev.status === 'active';
  const orgName = pName(ev, p.org);
  const rowHtml = r => {
    const f = r.final;
    const btn = !act ? '' : f > 0 ? `<button type="button" class="btn sm" data-action="hg-money" data-kind="ret" data-p="${r.id}">${L('ফেরত দিলাম ✓', 'Returned ✓')}</button>`
      : f < 0 ? `<button type="button" class="btn sm" data-action="hg-money" data-kind="pay" data-p="${r.id}">${L('পেলাম ✓', 'Got it ✓')}</button>` : '';
    return `<div class="poolrow"><div class="pr-n"><b>${esc(pName(ev, r.id))}</b>
        <small>${L('জমা', 'Deposited')} ${hgM(r.deposited)} · ${L('তার খরচ', 'His/her cost')} ${hgM(r.share)}${r.personal ? ` (${L('নিজের', 'own')} ${hgM(r.personal)})` : ''}${r.returned ? ` · ${L('ফেরত দিয়েছেন', 'Returned')} ${hgM(r.returned)}` : ''}</small></div>
      <div class="pr-r ${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}"><b>${f === 0 ? L('মিটেছে ✓', 'Even ✓') : hgM(Math.abs(f))}</b>${f ? `<small>${f > 0 ? L('ফেরত দিতে হবে', 'to return') : L('আরও দেবে', 'still owes')}</small>` : ''}</div>${btn}</div>`;
  };
  return `<section class="card pool"><div class="card-head"><h2>💼 ${L('জমা টাকার হিসাব', 'Money held for the group')}</h2>${act ? `<button type="button" class="link" data-action="hg-money">+ ${L('লেনদেন', 'Add')}</button>` : ''}</div>
    <p class="hint" style="margin:0 0 8px">${L(`${esc(orgName)}-এর কাছে বন্ধুদের জমা দেওয়া টাকা।`, `Money friends handed to ${esc(orgName)}.`)}</p>
    <div class="pool-sum"><div><small>${L('জমা হয়েছে', 'Collected')}</small><b>${hgM(p.collected)}</b></div><div><small>${L('খরচ হয়েছে', 'Spent')}</small><b>${hgM(p.spent)}</b></div>
      <div><small>${L('হাতে আছে', 'In hand')}</small><b class="${p.held < 0 ? 'neg' : ''}">${hgM(p.held)}</b></div><div><small>${L('ফেরত দিতে হবে', 'To return')}</small><b>${hgM(p.toReturn)}</b></div></div>
    ${p.shortfall > 0 ? `<div class="bsum warn"><b>${L(`ফেরত দিতে আরও ${hgM(p.shortfall)} লাগবে`, `${hgM(p.shortfall)} more is needed to return everything`)}</b><span>${L('জমা টাকা থেকে আপনার নিজের ভাগও খরচ হয়েছে, বাকিটা নিজের পকেট থেকে দিতে হবে।', 'Your own share also came out of the pool, so the rest comes from your pocket.')}</span></div>` : ''}
    ${p.rows.map(rowHtml).join('')}</section>`;
}
function hgMoneySheet(pre) {
  const ev = hgCur(), c = hgEventCalc(ev), pool = hgPoolCalc(ev, c);
  const people = ev.participants.filter(p => p.id !== pool.org && p.active);
  if (!people.length) return `${sheetHead(L('টাকার লেনদেন', 'Money in or out'))}<p class="hint">${L('আগে বন্ধুদের যোগ করুন।', 'Add your friends first.')}</p>`;
  const kind = (pre && pre.kind) || 'deposit', who = (pre && pre.p) || people[0].id;
  const orgName = esc(pName(ev, pool.org));
  return `${sheetHead(L('টাকার লেনদেন', 'Money in or out'), L(`আপনি = ${orgName}`, `You = ${orgName}`))}
  <form data-form="hg-money" data-live="hg-money" autocomplete="off">
    <div class="field"><span class="flabel">1. ${L('কী হলো?', 'What happened?')}</span>
      <div class="hg-methods vert">${[['deposit', '💰', L('সে আমার কাছে টাকা জমা দিল', 'He/she handed me money to hold')], ['pay', '✅', L('সে তার দেনা শোধ করল', 'He/she paid what they owed')], ['ret', '↩️', L('আমি তাকে টাকা ফেরত দিলাম', 'I gave money back to him/her')]].map(([k, e, l]) =>
        `<label class="chip wide"><input type="radio" name="kind" value="${k}" ${kind === k ? 'checked' : ''}><span>${e} ${l}</span></label>`).join('')}</div></div>
    <div class="field"><span class="flabel">2. ${L('কার সাথে?', 'With whom?')}</span>
      <div class="chips">${people.map(p => `<label class="chip"><input type="radio" name="who" value="${p.id}" ${who === p.id ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}</div></div>
    <label class="field"><span>3. ${L('কত টাকা?', 'How much?')}</span>${moneyInput('amt', '', '0')}</label>
    <div class="preview" data-mnote></div>
    <div class="row2"><label class="field"><span>${L('তারিখ', 'Date')}</span><input class="input" type="date" name="date" value="${today()}"></label>
      <label class="field"><span>${L('নোট', 'Note')}</span><input class="input" name="note" maxlength="80" placeholder="${L('ঐচ্ছিক', 'Optional')}"></label></div>
    <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button></form>`;
}
LIVE['hg-money'] = (f, t) => {
  const ev = hgCur(); if (!ev) return;
  const c = hgEventCalc(ev), kind = f.elements.kind.value, who = f.elements.who.value;
  const fin = c.final[who] || 0, a = f.elements.amt;
  const sug = kind === 'pay' ? Math.max(0, -fin) : kind === 'ret' ? Math.max(0, fin) : 0;
  // কিসের লেনদেন বা কার সাথে বদলালে পরিমাণ নিজে বসে (যতক্ষণ না নিজে লিখেছেন)
  if ((!t || ['kind', 'who'].includes(t.name)) && a.dataset.edited !== '1') a.value = sug > 0 ? fromMinor(sug) : '';
  if (t && t.name === 'amt') a.dataset.edited = '1';
  const amt = toMinor(a.value), org = pName(ev, hgPoolCalc(ev, c).org), nm = pName(ev, who);
  const n = $('[data-mnote]', f); n.className = 'preview';
  const hint = kind === 'deposit' ? L(`${nm} → ${org}: জমা ${hgM(amt)}। এটা খরচ নয়, জমা টাকা, খরচ হলে নিজে কাটা যাবে।`, `${nm} → ${org}: deposit of ${hgM(amt)}. Not an expense; it is deducted as costs come in.`)
    : kind === 'pay' ? L(`${nm} → ${org}: ${hgM(amt)} শোধ। এখন বাকি: ${hgM(Math.max(0, -fin))}`, `${nm} → ${org}: ${hgM(amt)} paid. Owes now: ${hgM(Math.max(0, -fin))}`)
      : L(`${org} → ${nm}: ${hgM(amt)} ফেরত। এখন ফেরত পাওনা: ${hgM(Math.max(0, fin))}`, `${org} → ${nm}: ${hgM(amt)} back. To get back now: ${hgM(Math.max(0, fin))}`);
  n.innerHTML = amt > 0 ? hint : '';
};
Object.assign(FORMS, {
  'hg-money': f => {
    const ev = hgGuard(); if (!ev) return;
    const c = hgEventCalc(ev), pool = hgPoolCalc(ev, c), kind = f.elements.kind.value, who = f.elements.who.value, amt = toMinor(f.elements.amt.value);
    if (!who) return fail(f, L('কার সাথে লেনদেন তা বাছুন', 'Pick the person'));
    if (amt <= 0) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    const o = { id: uid(), amt, createdAt: Date.now(), status: 'confirmed', date: f.elements.date.value || today(), note: f.elements.note.value.trim(), purpose: '' };
    if (kind === 'deposit') Object.assign(o, { kind: 'contribution', from: who, to: pool.org, purpose: L('জমা', 'Deposit') });
    else if (kind === 'pay') Object.assign(o, { kind: 'settlement', from: who, to: pool.org });
    else Object.assign(o, { kind: 'settlement', from: pool.org, to: who });
    ev.transfers.push(o);
    closeSheet(); hgCommit(ev, `${kind === 'deposit' ? 'জমা' : kind === 'pay' ? 'শোধ' : 'ফেরত'}: ${pName(ev, o.from)} → ${pName(ev, o.to)} ${hgM(amt)}`, `${kind === 'deposit' ? 'Deposit' : kind === 'pay' ? 'Payment' : 'Return'}: ${pName(ev, o.from)} → ${pName(ev, o.to)} ${hgM(amt)}`);
  },
});
Object.assign(ACTIONS, {
  'hg-money': el => { const ev = hgGuard(); if (!ev) return; if (!hgActive(ev).length) return toast(L('আগে বন্ধুদের যোগ করুন', 'Add your friends first')); openSheet(hgMoneySheet({ kind: el.dataset.kind, p: el.dataset.p })); },
  'hg-add-personal': () => {
    const ev = hgGuard(); if (!ev) return;
    if (!hgActive(ev).length) { toast(L('আগে বন্ধুদের যোগ করুন', 'Add the people first')); return hgGo('people'); }
    openSheet(hgExpenseForm(null, null, 'personal'));
  },
});

/* =========================================================
   টাকা মেটানোর সহজ বিকল্প, প্রতিজনের পুরো স্টেটমেন্ট, নজরে রাখার তালিকা
   ========================================================= */
const hgPerson = (ev, id) => ev.participants.find(p => p.id === id);
const hgIsLater = (p, c) => !!(p && p.later && c.final[p.id] < 0);

/* ---------- "কে কাকে দেবে" এর প্রতিটা সারির বিকল্প ---------- */
function hgPaySheet(i) {
  const ev = hgCur(), c = hgEventCalc(ev), s = c.suggestions[i];
  if (!s) return `${sheetHead(L('মেটানো', 'Settle'))}<p class="hint">${L('এই লেনদেন আর নেই।', 'This payment no longer exists.')}</p>`;
  const from = esc(pName(ev, s.from)), to = esc(pName(ev, s.to));
  return `${sheetHead(`${from} → ${to}`, hgM(s.amt))}
    <div class="payopts">
      <button type="button" class="po" data-action="hg-pay-full" data-i="${i}"><span class="po-e">✅</span><span><b>${L('পুরোটা দিয়েছে', 'Paid in full')}</b><small>${L(`${from} ${to}-কে ${hgM(s.amt)} দিয়ে দিয়েছে`, `${from} paid ${to} ${hgM(s.amt)}`)}</small></span></button>
      <button type="button" class="po" data-action="hg-pay-part" data-i="${i}"><span class="po-e">➗</span><span><b>${L('কিছুটা দিয়েছে', 'Paid part of it')}</b><small>${L('যত দিয়েছে লিখুন, বাকিটা বাকি থাকবে', 'Enter what was paid; the rest stays due')}</small></span></button>
      <button type="button" class="po" data-action="hg-pay-other" data-i="${i}"><span class="po-e">🤝</span><span><b>${L(`অন্য কেউ ${from}-এর হয়ে দিয়েছে`, `Someone else paid for ${from}`)}</b><small>${L('যে দিয়েছে তার পাওনা হবে, পরের লেনদেনে নিজে মিলে যাবে', 'They get it back later; the next settlement adjusts itself')}</small></span></button>
      <button type="button" class="po" data-action="hg-pay-later" data-i="${i}"><span class="po-e">⏳</span><span><b>${L('পরের বিলে দেবে', 'Will pay with the next bill')}</b><small>${L('বাকি থাকবে, নতুন খরচ লেখার সময় আগের বাকিসহ দেখাবে', 'Stays due; the next expense shows it together with the new share')}</small></span></button>
    </div>`;
}
function hgPayOtherSheet(i) {
  const ev = hgCur(), c = hgEventCalc(ev), s = c.suggestions[i]; if (!s) return '';
  const others = ev.participants.filter(p => p.active && p.id !== s.from && p.id !== s.to);
  return `${sheetHead(L('অন্য কেউ দিয়েছে', 'Someone else paid'), `${esc(pName(ev, s.from))} → ${esc(pName(ev, s.to))}`)}
  <form data-form="hg-payother" data-from="${s.from}" data-to="${s.to}" autocomplete="off">
    <div class="field"><span class="flabel">1. ${L('কে দিয়েছে?', 'Who paid?')}</span>${others.length ? `<div class="chips">${others.map((p, k) => `<label class="chip"><input type="radio" name="who" value="${p.id}" ${k === 0 ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}</div>` : `<p class="hint">${L('অন্য কেউ নেই', 'No one else')}</p>`}</div>
    <label class="field"><span>2. ${L('কত টাকা?', 'How much?')}</span>${moneyInput('amt', hgTaka(s.amt), '0')}</label>
    <p class="hint">${L(`${esc(pName(ev, s.to))} টাকাটা পেয়ে যাবে। যে দিল সে ${esc(pName(ev, s.from))}-এর কাছে ওটা পাবে, তাই পরের হিসাবে ${esc(pName(ev, s.from))} তাকে দেবে।`, `${esc(pName(ev, s.to))} gets the money. The one who paid is owed it by ${esc(pName(ev, s.from))}, so the next settlement routes it.`)}</p>
    <button class="btn primary block" type="submit" ${others.length ? '' : 'disabled'}>${L('সেভ করুন', 'Save')}</button></form>`;
}
Object.assign(FORMS, {
  'hg-payother': f => {
    const ev = hgGuard(); if (!ev) return;
    const who = f.elements.who && f.elements.who.value, amt = toMinor(f.elements.amt.value);
    if (!who) return fail(f, L('কে দিয়েছে বাছুন', 'Pick who paid'));
    if (amt <= 0) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    ev.transfers.push({ id: uid(), kind: 'settlement', from: who, to: f.dataset.to, amt, date: today(), note: L(`${pName(ev, f.dataset.from)}-এর হয়ে`, `on behalf of ${pName(ev, f.dataset.from)}`), purpose: '', onBehalf: f.dataset.from, createdAt: Date.now(), status: 'confirmed' });
    closeSheet(); hgCommit(ev, `${pName(ev, who)} দিয়েছে ${pName(ev, f.dataset.from)}-এর হয়ে: ${hgM(amt)}`, `${pName(ev, who)} paid for ${pName(ev, f.dataset.from)}: ${hgM(amt)}`);
  },
});
Object.assign(ACTIONS, {
  'hg-pay-opts': el => { const ev = hgGuard(); if (ev) openSheet(hgPaySheet(Number(el.dataset.i))); },
  'hg-pay-full': el => {
    const ev = hgGuard(); if (!ev) return; const s = hgEventCalc(ev).suggestions[Number(el.dataset.i)]; if (!s) return;
    if (sheetOpen) closeSheet();
    undoable(L(`${pName(ev, s.from)} দিয়েছে ${hgM(s.amt)}`, `${pName(ev, s.from)} paid ${hgM(s.amt)}`), () => {
      ev.transfers.push({ id: uid(), kind: 'settlement', from: s.from, to: s.to, amt: s.amt, date: today(), note: '', purpose: '', createdAt: Date.now(), status: 'confirmed' });
      const p = hgPerson(ev, s.from); if (p) delete p.later;
      hgLog(ev, `পরিশোধ: ${pName(ev, s.from)} → ${pName(ev, s.to)} ${hgM(s.amt)}`, `Payment: ${pName(ev, s.from)} → ${pName(ev, s.to)} ${hgM(s.amt)}`);
    });
  },
  'hg-pay-part': el => { const ev = hgGuard(); if (!ev) return; const s = hgEventCalc(ev).suggestions[Number(el.dataset.i)]; if (s) openSheet(hgTransferForm('settlement', null, { from: s.from, to: s.to, amt: 0 })); },
  'hg-pay-other': el => { const ev = hgGuard(); if (ev) openSheet(hgPayOtherSheet(Number(el.dataset.i))); },
  'hg-pay-later': el => {
    const ev = hgGuard(); if (!ev) return; const s = hgEventCalc(ev).suggestions[Number(el.dataset.i)]; if (!s) return;
    const p = hgPerson(ev, s.from); if (!p) return;
    p.later = { to: s.to, amt: s.amt, at: Date.now() };
    if (sheetOpen) closeSheet();
    hgCommit(ev, `${p.name}: ${hgM(s.amt)} পরের বিলে দেবে`, `${p.name} will pay ${hgM(s.amt)} with the next bill`, L(`${p.name}-এর ${hgM(s.amt)} পরের বিলে ধরা থাকল`, `${p.name}'s ${hgM(s.amt)} is kept for the next bill`));
  },
  'hg-pay-spread': el => {
    const f = el.closest('form'), ev = hgCur(); if (!f || !ev) return;
    const on = f.dataset.pmode !== 'spread';
    f.dataset.pmode = on ? 'spread' : '';
    el.classList.toggle('on', on);
    f.dataset.ppAuto = '1'; f.dataset.eachAuto = '1';
    runLive(f, { name: 'pmode' });
  },
  'hg-pay-allchips': el => {
    const f = el.closest('form'), ev = hgCur(); if (!f || !ev) return;
    ev.participants.forEach(p => { const c = f.elements['pp_' + p.id]; if (c) c.checked = p.active; });
    runLive(f, f.elements['pp_' + ev.participants[0].id]);
  },
  'hg-person-stmt': el => { const ev = hgCur(); if (ev) openSheet(hgPersonSheet(ev, el.dataset.p)); },
  'hg-stmt-copy': async el => { const ev = hgCur(); if (ev) toast((await hgCopy(hgStatementText(ev, hgEventCalc(ev), el.dataset.p))) ? L('কপি হয়েছে', 'Copied') : L('কপি করা যায়নি', 'Could not copy')); },
  'hg-stmt-share': async el => {
    const ev = hgCur(); if (!ev) return; const txt = hgStatementText(ev, hgEventCalc(ev), el.dataset.p);
    try { if (navigator.share) { await navigator.share({ title: ev.name, text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const w = window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
    if (!w) toast((await hgCopy(txt)) ? L('টেক্সট কপি হয়েছে, WhatsApp-এ পেস্ট করুন', 'Text copied, paste it into WhatsApp') : L('শেয়ার করা যায়নি', 'Could not share'));
  },
});

/* ---------- প্রতিজনের পুরো স্টেটমেন্ট ---------- */
function hgStmtLine(ev, l) {
  const nm = id => esc(pName(ev, id));
  const desc = {
    paid: `💸 ${L('খরচ দিয়েছে', 'Paid for the group')}: ${esc(l.title)}`,
    share: `${l.personal ? '👤' : '🧾'} ${L('তার ভাগ', 'Their share')}: ${esc(l.title)}`,
    refund: `↩️ ${L('রিফান্ড পেয়েছে', 'Refund received')}${l.title ? ': ' + esc(l.title) : ''}`,
    sent: `➡️ ${nm(l.with)}-${L('কে দিয়েছে', 'was paid')}${l.onBehalf ? ` (${nm(l.onBehalf)}${L('-এর হয়ে', ' on behalf')})` : ''} · ${HG_TKIND[l.sub] ? HG_TKIND[l.sub][isEN() ? 1 : 0] : ''}`,
    received: `⬅️ ${nm(l.with)} ${L('থেকে পেয়েছে', 'paid them')}${l.onBehalf ? ` (${nm(l.onBehalf)}${L('-এর হয়ে', ' on behalf')})` : ''} · ${HG_TKIND[l.sub] ? HG_TKIND[l.sub][isEN() ? 1 : 0] : ''}`,
    adjust: `🤝 ${L('মাফ / সমঝোতার সমন্বয়', 'Forgiveness / agreement adjustment')}`,
  }[l.kind];
  return `<div class="stl"><div class="stl-d"><b>${desc}</b><small>${l.at ? fmtDate(l.at) : ''}${l.note ? ' · ' + esc(l.note) : ''}</small></div>
    <div class="stl-a ${l.effect > 0 ? 'pos' : l.effect < 0 ? 'neg' : ''}"><b>${l.effect >= 0 ? '+' : '−'}${hgM(Math.abs(l.effect))}</b><small>${L('চলতি', 'Running')} ${l.running >= 0 ? '+' : '−'}${hgM(Math.abs(l.running))}</small></div></div>`;
}
function hgPersonSheet(ev, pid) {
  const c = hgEventCalc(ev), p = hgPerson(ev, pid); if (!p) return '';
  const st = hgPersonStatement(ev, c, pid), f = c.final[pid], status = hgPersonStatus(ev, c, pid);
  return `${sheetHead(esc(p.name), `${esc(ev.name)} · ${hgPStatusLabel(status)}`)}
  <div class="fb-top"><small>${f > 0 ? L('তার পাওনা', 'He/she gets') : f < 0 ? L('তাকে দিতে হবে', 'He/she owes') : L('হিসাব মিটেছে', 'All even')}</small><b>${hgM(Math.abs(f))}</b>
    <span>${L('দিয়েছে', 'Paid')} ${hgM(c.paid[pid])} · ${L('তার ভাগ', 'Share')} ${hgM(c.share[pid])}${c.personal[pid] ? ` (${L('নিজের', 'own')} ${hgM(c.personal[pid])})` : ''}</span></div>
  <div class="hg-share3 mt12"><button type="button" class="btn sm" data-action="hg-stmt-copy" data-p="${pid}">📋 ${L('কপি', 'Copy')}</button><button type="button" class="btn sm" data-action="hg-stmt-share" data-p="${pid}">📤 WhatsApp</button>${ev.status === 'active' ? `<button type="button" class="btn sm" data-action="hg-money" data-p="${pid}">💰 ${L('লেনদেন', 'Money')}</button>` : '<span></span>'}</div>
  ${hgIsLater(p, c) ? `<div class="bsum warn"><b>⏳ ${L('পরের বিলে দেবে বলেছে', 'Said they will pay with the next bill')}</b><span>${hgM(p.later.amt)}</span></div>` : ''}
  <h4 class="fb-h"><i>1</i>${L('প্রতিটা হিসাব, ১ টাকা পর্যন্ত', 'Every entry, to the last taka')}</h4>
  <div class="stmt">${st.lines.length ? st.lines.map(l => hgStmtLine(ev, l)).join('') : `<p class="hint">${L('এখনও কোনো হিসাব নেই', 'No entries yet')}</p>`}
    <div class="stl total"><div class="stl-d"><b>= ${L('এখন বাকি', 'Left now')}</b></div><div class="stl-a ${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}"><b>${f > 0 ? L('পাবে ', 'Gets ') : f < 0 ? L('দেবে ', 'Owes ') : ''}${hgM(Math.abs(f))}</b></div></div></div>
  ${!st.ok ? `<p class="hint neg">${L('সতর্কতা: স্টেটমেন্টের যোগফল মিলছে না।', 'Warning: the statement does not add up.')}</p>` : ''}
  <h4 class="fb-h"><i>2</i>${L('খাত অনুযায়ী তার ভাগ', 'Their share by category')}</h4>
  <div class="ledger fb">${hgCatsSorted(c.byPersonCat[pid]).map(([k, v]) => `<div><span>${esc(hgCatLabel(ev, k))}</span><span>${hgM(v)}</span></div>`).join('') || `<div><span>—</span><span></span></div>`}</div>
  ${c.suggestions.filter(s => s.from === pid || s.to === pid).length ? `<h4 class="fb-h"><i>3</i>${L('এখন কী করতে হবে', 'What happens next')}</h4><div class="ledger fb">${c.suggestions.filter(s => s.from === pid || s.to === pid).map(s => `<div><span>${esc(pName(ev, s.from))} → ${esc(pName(ev, s.to))}</span><span>${hgM(s.amt)}</span></div>`).join('')}</div>` : ''}`;
}
function hgStatementText(ev, c, pid) {
  const st = hgPersonStatement(ev, c, pid), p = hgPerson(ev, pid), f = c.final[pid], lines = [`*${p.name}* · ${ev.name}`, ''];
  st.lines.forEach(l => {
    const d = { paid: L('খরচ দিয়েছে', 'Paid'), share: L('ভাগ', 'Share'), refund: L('রিফান্ড', 'Refund'), sent: L('দিয়েছে', 'Sent'), received: L('পেয়েছে', 'Received'), adjust: L('সমন্বয়', 'Adjustment') }[l.kind];
    lines.push(`${l.at ? fmtDate(l.at) + ' ' : ''}${d}${l.title ? ' ' + l.title : ''}${l.with ? ' ' + pName(ev, l.with) : ''}: ${l.effect >= 0 ? '+' : '-'}${hgM(Math.abs(l.effect))}`);
  });
  lines.push('', `${f > 0 ? L('পাবে', 'Gets') : f < 0 ? L('দেবে', 'Owes') : L('বাকি নেই', 'Even')}: ${hgM(Math.abs(f))}`);
  return lines.join('\n');
}

/* ---------- নজরে রাখার তালিকা: অ্যাপ নিজে মনে করিয়ে দেয় ---------- */
function hgAttention(ev, c) {
  const items = [], add = (sev, t, d, act) => items.push({ sev, t, d, act });
  const go = (a, l, data) => ({ a, l, data: data || {} });
  if (ev.status !== 'active') return items;
  c.issues.slice(0, 2).forEach(i => { const ex = ev.expenses.find(e => e.id === i.expense); add('danger', L('হিসাবে সমস্যা', 'Problem in the books'), `${ex ? ex.title + ': ' : ''}${i.code === 'payers_mismatch' ? L('কে কত দিয়েছে তা খরচের সমান নয়', 'what was paid does not equal the expense') : i.code === 'needs_review' ? L('ভাগ আবার দেখুন', 'recheck the split') : L('দেখুন', 'please review')}`, go('tab', L('খরচ দেখুন', 'See expenses'), { tab: 'expenses' })); });
  const pool = hgPoolCalc(ev, c);
  if (pool && pool.hasPool && pool.shortfall > 0) add('warn', L(`ফেরত দিতে আরও ${hgM(pool.shortfall)} লাগবে`, `${hgM(pool.shortfall)} more is needed to return everything`), L('জমা টাকা থেকে আপনার নিজের ভাগও গেছে।', 'Your own share also came out of the pool.'), go('tab', L('মেটানো', 'Settle'), { tab: 'settle' }));
  ev.participants.filter(p => hgIsLater(p, c)).forEach(p => add('info', L(`${p.name} পরের বিলে ${hgM(-c.final[p.id])} দেবে বলেছে`, `${p.name} will pay ${hgM(-c.final[p.id])} with the next bill`), L('নতুন খরচ লেখার সময় আগের বাকিসহ দেখাবে।', 'The next expense shows it together with the new share.'), go('hg-money', L('এখন নিলাম', 'Got it now'), { kind: 'pay', p: p.id })));
  const nothing = ev.participants.filter(p => !hgIsLater(p, c) && c.final[p.id] < 0 && !c.out[p.id] && !c.inn[p.id]).slice(0, 2);
  nothing.forEach(p => add('warn', L(`${p.name} এখনও কিছু দেয়নি`, `${p.name} has not paid anything yet`), L(`বাকি ${hgM(-c.final[p.id])}`, `Owes ${hgM(-c.final[p.id])}`), go('hg-person-stmt', L('হিসাব দেখুন', 'See account'), { p: p.id })));
  const plan = hgPlanCalc(ev, c, today());
  if (plan) { const m = plan.flags.map(f => hgPlanMsg(ev, f)).find(x => x.t); if (m) add(m.lvl === 'bad' ? 'danger' : 'warn', L('বাজেট', 'Budget'), m.t, go('tab', L('বাজেট দেখুন', 'See budget'), { tab: 'home' })); }
  const open = ev.decisions.filter(d => !d.del && ['proposed', 'awaiting', 'disputed'].includes(d.status)).length;
  if (open) add('info', L(`${open}টা সমঝোতা এখনও চূড়ান্ত হয়নি`, `${open} agreement(s) not finalized`), L('"মেটানো" ট্যাবের নিচে।', 'See the bottom of the Settle tab.'), go('tab', L('মেটানো', 'Settle'), { tab: 'settle' }));
  const rank = { danger: 0, warn: 1, info: 2 };
  return items.sort((a, b) => rank[a.sev] - rank[b.sev]);
}
function hgAttnCard(ev, c) {
  const items = hgAttention(ev, c);
  if (!items.length) return '';
  const btn = a => a ? `<button type="button" class="btn sm" data-action="${a.a}" ${Object.entries(a.data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${a.l}</button>` : '';
  const row = it => `<div class="arow ${it.sev}"><i></i><div class="atx"><b>${esc(it.t)}</b><span>${esc(it.d)}</span></div>${btn(it.act)}</div>`;
  return `<section class="card attn"><div class="card-head"><h2>🔔 ${L('আপনার নজরে', 'Needs your attention')}</h2><span class="achips">${items.length}</span></div>
    <div class="alist" style="margin-top:0">${items.slice(0, 3).map(row).join('')}</div>
    ${items.length > 3 ? `<details class="more"><summary><span class="ds-t">${L(`আরও ${items.length - 3}টা`, `${items.length - 3} more`)}</span></summary><div class="alist">${items.slice(3).map(row).join('')}</div></details>` : ''}</section>`;
}
