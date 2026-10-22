'use strict';

/* =========================================================
   Hangout: দৈনন্দিন ধরনের ইভেন্টের (যাতায়াত, শপিং, কাস্টম) "পুরো হিসাব" শিট
   হোমের হলুদ কার্ডে ট্যাপ করলে A থেকে Z: বাজেট, কত খরচ, কী কিনেছি, কার জন্য, কে কে আছে, বাকি আছে কিনা।
   সংখ্যা সব hgEventCalc / hgPlanCalc থেকে (এখানে কোনো আলাদা সূত্র নেই)।
   ========================================================= */

function hgSoloDetail(ev, c) {
  const exps = ev.expenses.filter(e => !e.del).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  const p = hgPlanCalc(ev, c, today()), cats = hgCatsSorted(c.catTotals), many = ev.participants.length > 1;
  const first = c.days.filter(Boolean)[0], span = first ? Math.max(1, daysBetween(first, today()) + 1) : 1;
  const row = (label, val, cls = '') => `<div class="${cls}"><span>${label}</span><span>${val}</span></div>`;
  const dues = hgDueGroups(ev), openDues = dues.filter(g => g.rem > 0);
  const forWho = e => {
    const ids = Object.keys(e.alloc || {}).filter(id => e.alloc[id] > 0);
    if (!many || !ids.length) return '';
    if (e.personal) return L('নিজের জন্য', 'for self') + ': ' + esc(pName(ev, e.personal));
    return L('কার জন্য', 'for') + ': ' + (ids.length === ev.participants.length ? L('সবার', 'everyone') : ids.map(id => `${esc(pName(ev, id))} ${hgM(e.alloc[id])}`).join(', '));
  };
  let n = 0;
  const h = t => `<h4 class="fb-h"><i>${++n}</i>${t}</h4>`;
  const dayBlock = d => {
    const list = exps.filter(e => (e.date || '') === d);
    return `<div class="dayh"><span>${esc(hgDayLabel(ev, d))}${d ? ` <small>${fmtDate(d)}</small>` : ''}</span><b>${hgM(c.byDay[d] ? c.byDay[d].total : 0)}</b></div>`
      + list.map(e => `<div class="two"><span>${e.mode === 'bill' ? '🧾' : '💸'} ${esc(e.title)}<small>${esc(hgCatLabel(ev, e.category))}${e.desc ? ' · ' + esc(e.desc) : ''}<br>${L('দিয়েছে', 'paid by')} ${e.payers.map(x => esc(pName(ev, x.pid))).join(', ') || '—'}${forWho(e) ? ' · ' + forWho(e) : ''}</small></span><span>${hgM(e.total)}</span></div>`).join('');
  };
  return `${sheetHead(L('পুরো হিসাব', 'Full breakdown'), esc(ev.name))}
  <div class="fb-top"><small>${L('মোট খরচ', 'Total spent')}</small><b>${hgM(c.net)}</b>
    <span>${exps.length} ${L('খরচ', 'entries')} · ${c.days.filter(Boolean).length} ${L('দিন', 'days')}${many ? ` · ${ev.participants.length} ${L('জন', 'people')}` : ''}</span></div>

  ${h(L('বাজেট ও বাকি', 'Budget & what is left'))}
  <div class="ledger fb">${p ? row(L('মোট বাজেট', 'Total budget'), hgM(p.total))
      + row(L('এ পর্যন্ত খরচ', 'Spent so far'), `${hgM(p.spent)} <small class="muted">${pct(p.total ? p.spent / p.total * 100 : 0)}</small>`)
      + row(p.remaining >= 0 ? L('বাজেটের বাকি', 'Budget left') : L('বাজেটের চেয়ে বেশি', 'Over budget'), `<b class="${p.remaining < 0 ? 'neg' : 'pos'}">${hgM(Math.abs(p.remaining))}</b>`, 'total')
    : row(L('বাজেট ঠিক করা নেই', 'No budget set'), `<button type="button" class="link" data-action="hg-plan">${L('ঠিক করুন', 'Set')}</button>`)}
    ${row(L('গড় প্রতিদিন', 'Daily average'), hgM(Math.round(c.net / span)))}${c.refundTotal ? row(L('রিফান্ড (বাদ)', 'Refunds (deducted)'), hgM(c.refundTotal)) : ''}</div>
  ${p && p.rows.length ? `<div class="ledger fb">${p.rows.filter(r => r.ideal > 0 || r.spent > 0).map(r => row(esc(hgPlanCatLabel(ev, r.k)), `${hgM(r.spent)} / ${hgM(r.ideal)} <small class="${r.over ? 'neg' : 'muted'}">${r.over ? hgM(r.spent - r.ideal) + ' ' + L('বেশি', 'over') : hgM(r.left) + ' ' + L('বাকি', 'left')}</small>`)).join('')}</div>` : ''}

  ${h(L('কী কিনেছি / কোথায় খরচ (দিন অনুযায়ী)', 'What was bought (day by day)'))}
  <div class="ledger fb">${exps.length ? c.days.map(dayBlock).join('') + row(`= ${L('মোট', 'Total')}`, hgM(c.gross), 'total')
    + (c.refundTotal ? row(`− ${L('রিফান্ড', 'Refunds')}`, hgM(c.refundTotal)) + row(`= ${L('নেট খরচ', 'Net cost')}`, hgM(c.net), 'total') : '') : row(L('এখনও কোনো খরচ নেই', 'No expenses yet'), '—')}</div>

  ${cats.length ? `${h(L('খাত অনুযায়ী মোট', 'Totals by category'))}<div class="ledger fb">${cats.map(([k, v]) => row(esc(hgCatLabel(ev, k)), `${hgM(v)} <small class="muted">${pct(v / (c.net || 1) * 100)}</small>`)).join('')}</div>` : ''}

  ${many ? `${h(L('কে কে আছে, কে কত দিল, কার জন্য কত', 'Who is in, who paid, whose share'))}
  ${ev.participants.map(x => { const f = c.final[x.id], where = hgCatsSorted(c.byPersonCat[x.id]);
    return `<div class="hgp"><div class="hgp-top"><span class="hgp-av">${esc((x.name || '?').trim().charAt(0).toUpperCase())}</span><div class="hgp-n"><b>${esc(x.name)}</b></div>
      <div class="hgp-bal ${f > 0 ? 'pos' : f < 0 ? 'neg' : ''}"><small>${f > 0 ? L('পাবে', 'gets') : f < 0 ? L('দেবে', 'owes') : L('মিটেছে', 'even')}</small><b>${hgM(Math.abs(f))}</b></div></div>
      <div class="ledger fb">${row(L('টাকা দিয়েছে', 'Paid'), hgM(c.paid[x.id]))}${row(L('তার জন্য খরচ (ভাগ)', 'Spent on them (share)'), hgM(c.share[x.id]))}</div>
      ${where.length ? `<div class="pcats"><small>${L('কোথায় কত', 'Where')}</small>${where.map(([k, v]) => `<div><span>${esc(hgCatLabel(ev, k))}</span><b>${hgM(v)}</b></div>`).join('')}</div>` : ''}</div>`; }).join('')}
  <div class="ledger fb">${c.suggestions.length ? c.suggestions.map(s => row(`${esc(pName(ev, s.from))} → ${esc(pName(ev, s.to))}`, hgM(s.amt))).join('') : row(c.gross ? '🎉 ' + L('সবার হিসাব মিটে গেছে', 'Everyone is even') : '', '')}</div>` : ''}

  ${h(L('বাকির খাতা', 'Credit book'))}
  <div class="ledger fb">${dues.length ? dues.map(g => row(`${g.dir === 'owe' ? '📤 ' + L('আমি দেব', 'I owe') : '📥 ' + L('আমি পাব', 'I am owed')}: ${esc(g.who)}<small class="muted"> ${g.dues.map(d => esc(d.title || L('বাকি', 'credit'))).slice(0, 3).join(', ')}</small>`, g.rem > 0 ? `<b class="${g.dir === 'owe' ? 'neg' : 'pos'}">${hgM(g.rem)}</b> <small class="muted">/ ${hgM(g.total)}</small>` : '✅')).join('')
    + row(L('এখনও বাকি আছে', 'Still open'), openDues.length ? `${openDues.length} ${L('জন', 'parties')} · ${hgM(sum(openDues.map(g => g.rem)))}` : L('কিছু না', 'nothing'), 'total') : row(L('কোনো বাকি নেই', 'No credit entries'), '✅')}</div>`;
}
Object.assign(ACTIONS, {
  'hg-hero-detail': () => {
    const ev = hgCur(); if (!ev) return;
    const c = hgEventCalc(ev);
    openSheet(hgSolo(ev) && !hgIsHouse(ev) ? hgSoloDetail(ev, c) : hgHeroDetail(ev, c));
  },
});
