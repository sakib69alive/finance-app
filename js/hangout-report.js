'use strict';

/* =========================================================
   Hangout: রিপোর্ট (মেমো / সামারি স্লিপ / টেক্সট), ব্যাকআপ-রিস্টোর, বন্ধু ও আরও ট্যাব, মডিউল রেজিস্টার
   রিপোর্টের সব সংখ্যা hgEventCalc থেকেই আসে, তাই ড্যাশবোর্ড আর রিপোর্ট কখনো আলাদা হবে না।
   ========================================================= */

const hgEsc = esc;
/* ---------- রিপোর্টের ডেটা ---------- */
function hgReportRows(ev, c) {
  return ev.participants.map(p => {
    const st = hgPersonStatus(ev, c, p.id);
    return { p, st, share: c.share[p.id], paid: c.paid[p.id], orig: c.base[p.id], alreadyPaid: c.out[p.id] - c.inn[p.id], adj: c.adj[p.id],
      waivedFor: c.waivedFor[p.id], waivedBy: c.waivedBy[p.id], fin: c.final[p.id], adv: c.byKind.advance[p.id] - c.inKind.advance[p.id], contrib: c.byKind.contribution[p.id] - c.inKind.contribution[p.id] };
  });
}
const hgSigned = n => (n === 0 ? hgM(0) : (n > 0 ? '+' : '−') + hgM(Math.abs(n)));
const hgFinalText = n => (n > 0 ? `${L('পাবে', 'Gets')} ${hgM(n)}` : n < 0 ? `${L('দেবে', 'Owes')} ${hgM(-n)}` : L('বাকি নেই', 'Even'));
function hgEvPeriod(ev) { return ev.start ? fmtDate(ev.start) + (ev.end && ev.end !== ev.start ? ' – ' + fmtDate(ev.end) : '') : ''; }

/* ---------- সম্পূর্ণ মেমো ---------- */
function hgMemoHtml(ev) {
  const c = hgEventCalc(ev), rows = hgReportRows(ev, c);
  const plan = hgPlanCalc(ev, c, null);
  const t = (head, body) => `<table class="rt"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  const exps = ev.expenses.filter(e => !e.del).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const per = Object.fromEntries(c.per.map(x => [x.id, x]));
  const bills = exps.filter(e => e.mode === 'bill').map(e => {
    const b = hgBill(e.bill, ev.participants.map(p => p.id));
    return `<h4>🧾 ${hgEsc(e.title)} · ${fmtDate(e.date)}</h4>` + t([L('আইটেম', 'Item'), L('কার', 'For'), L('দাম × সংখ্যা', 'Price × qty'), L('মোট', 'Total')],
      e.bill.items.map(it => `<tr class="${it.status === 'cancelled' ? 'x' : ''}"><td>${hgEsc(it.name)}${it.status === 'cancelled' ? ' (' + L('বাতিল', 'cancelled') + ')' : ''}</td><td>${it.type === 'shared' ? (it.sharers || []).map(id => hgEsc(pName(ev, id))).join(', ') : hgEsc(pName(ev, it.orderedBy))}</td><td>${hgM(it.unit)} × ${it.qty}</td><td class="n">${hgM(Math.round(it.unit) * it.qty)}</td></tr>`).join('')
      + (e.bill.charges || []).map(ch => `<tr><td colspan="3">${hgEsc(ch.name)} (${ch.kind === 'discount' ? L('ডিসকাউন্ট', 'discount') : L('চার্জ', 'charge')})</td><td class="n">${ch.kind === 'discount' ? '−' : ''}${hgM(ch.amt)}</td></tr>`).join('')
      + `<tr class="tt"><td colspan="3">${L('বিল মোট', 'Bill total')}</td><td class="n">${hgM(e.total)}</td></tr>`)
      + `<p class="sm">${ev.participants.filter(p => b.perPerson[p.id] > 0).map(p => `${hgEsc(p.name)}: <b>${hgM(b.perPerson[p.id])}</b>`).join(' · ')}</p>`;
  }).join('');
  const decs = ev.decisions.filter(d => !d.del && d.status !== 'cancelled');
  const refunds = ev.refunds.filter(r => !r.del), transfers = ev.transfers.filter(x => !x.del);
  const open = rows.filter(r => r.fin !== 0);
  const settledAll = !open.length && c.gross > 0 && !c.issues.length;
  return `<div class="memo">
    <h1>${hgEsc(ev.name)}</h1>
    <p class="sm">${hgTypeLabel(ev.type)}${ev.location ? ' · ' + hgEsc(ev.location) : ''}${hgEvPeriod(ev) ? ' · ' + hgEvPeriod(ev) : ''} · ${L('অবস্থা', 'Status')}: <b>${hgStatusLabel(ev.status)}</b></p>
    ${ev.notes ? `<p class="sm">${hgEsc(ev.notes)}</p>` : ''}
    <div class="kpis"><div><small>${L('মোট খরচ', 'Gross')}</small><b>${hgM(c.gross)}</b></div><div><small>${L('রিফান্ড', 'Refunds')}</small><b>${hgM(c.refundTotal)}</b></div><div><small>${L('নেট খরচ', 'Net')}</small><b>${hgM(c.net)}</b></div><div><small>${L('অংশগ্রহণকারী', 'People')}</small><b>${ev.participants.length}</b></div></div>
    <h3>${L('১. অংশগ্রহণকারী', '1. Participants')}</h3><p>${ev.participants.map(p => hgEsc(p.name) + (p.active ? '' : ' (' + L('নিষ্ক্রিয়', 'inactive') + ')')).join(', ')}</p>
    <h3>${L('২. খরচের তালিকা', '2. Expenses')}</h3>
    ${exps.length ? t([L('তারিখ', 'Date'), L('বিবরণ', 'Description'), L('খাত', 'Category'), L('কে দিয়েছে', 'Paid by'), L('মোট', 'Total')],
      exps.map(e => `<tr><td>${fmtDate(e.date)}</td><td>${hgEsc(e.title)}${per[e.id] && per[e.id].refund ? `<br><span class="sm">${L('রিফান্ড', 'refund')} −${hgM(per[e.id].refund)}</span>` : ''}</td><td>${hgEsc(hgCatLabel(ev, e.category))}</td><td>${e.payers.map(p => `${hgEsc(pName(ev, p.pid))} ${hgM(p.amt)}`).join('<br>')}</td><td class="n">${hgM(e.total)}</td></tr>`).join('')
      + `<tr class="tt"><td colspan="4">${L('মোট (গ্রস)', 'Gross total')}</td><td class="n">${hgM(c.gross)}</td></tr>`) : `<p class="sm">${L('কোনো খরচ নেই', 'No expenses')}</p>`}
    ${bills ? `<h3>${L('৩. রেস্টুরেন্ট বিল (আইটেম অনুযায়ী)', '3. Restaurant bills (item-wise)')}</h3>${bills}` : ''}
    ${hgWhereMemo(ev, c)}
    <h3>${L('৪. কার কত অংশ ও কে কত দিয়েছে', '4. Shares and payments')}</h3>
    ${t([L('নাম', 'Name'), L('তার অংশ', 'Share'), L('দিয়েছে', 'Paid'), L('অ্যাডভান্স', 'Advance'), L('কন্ট্রিবিউশন', 'Contribution')],
      rows.map(r => `<tr><td>${hgEsc(r.p.name)}</td><td class="n">${hgM(r.share)}</td><td class="n">${hgM(r.paid)}</td><td class="n">${hgSigned(r.adv)}</td><td class="n">${hgSigned(r.contrib)}</td></tr>`).join(''))}
    ${refunds.length ? `<h3>${L('৫. রিফান্ড', '5. Refunds')}</h3>${t([L('খরচ', 'Expense'), L('কে পেয়েছে', 'Received by'), L('টাকা', 'Amount')], refunds.map(r => `<tr><td>${hgEsc((ev.expenses.find(e => e.id === r.expenseId) || {}).title || '—')}</td><td>${hgEsc(pName(ev, r.by))}</td><td class="n">${hgM(r.amt)}</td></tr>`).join(''))}` : ''}
    ${transfers.length ? `<h3>${L('৬. লেনদেন (অ্যাডভান্স / কন্ট্রিবিউশন / পরিশোধ)', '6. Transfers (advance / contribution / payments)')}</h3>${t([L('তারিখ', 'Date'), L('ধরন', 'Type'), L('কে → কাকে', 'From → To'), L('টাকা', 'Amount')],
      transfers.map(x => `<tr><td>${fmtDate(x.date)}</td><td>${HG_TKIND[x.kind][isEN() ? 1 : 0]}${x.purpose ? ' · ' + hgEsc(x.purpose) : ''}</td><td>${hgEsc(pName(ev, x.from))} → ${hgEsc(pName(ev, x.to))}</td><td class="n">${hgM(x.amt)}</td></tr>`).join(''))}` : ''}
    <h3>${L('৭. মূল হিসাব থেকে চূড়ান্ত বাকি', '7. Original balance to final amount')}</h3>
    ${t([L('নাম', 'Name'), L('মূল পাওনা/দেনা', 'Original'), L('ইতিমধ্যে পরিশোধ', 'Paid'), L('সমঝোতার সমন্বয়', 'Adjustment'), L('মওকুফ', 'Waived'), L('এখন বাকি', 'Final')],
      rows.map(r => `<tr><td>${hgEsc(r.p.name)}<br><span class="sm">${hgPStatusLabel(r.st)}</span></td><td class="n">${hgSigned(r.orig)}</td><td class="n">${hgM(r.alreadyPaid)}</td><td class="n">${hgSigned(r.adj)}</td><td class="n">${r.waivedFor || r.waivedBy ? hgM(r.waivedFor) + ' / ' + hgM(r.waivedBy) : '—'}</td><td class="n"><b>${hgFinalText(r.fin)}</b></td></tr>`).join(''))}
    <p class="sm">${L('মওকুফ: দেনা মাফ পাওয়া / পাওনা ছেড়ে দেওয়া। মওকুফ কোনো পরিশোধ বা নতুন খরচ নয়।', 'Waived: due forgiven / receivable given up. A waiver is not a payment or a new expense.')}</p>
    ${decs.length ? `<h3>${L('৮. মতামত, সমঝোতা ও মওকুফের ইতিহাস', '8. Opinions, agreements and waivers')}</h3>${t([L('ব্যক্তি', 'Person'), L('সিদ্ধান্ত', 'Decision'), L('টাকা', 'Amount'), L('অবস্থা', 'Status'), L('মতামত', 'Opinions')],
      decs.map(d => { const ap = c.applied.find(x => x.id === d.id); const ops = Object.entries(d.opinions || {}).map(([pid, o]) => `${hgEsc(pName(ev, pid))}: ${hgOpLabel(o.s)}`).join('; ');
        return `<tr><td>${hgEsc(pName(ev, d.pid))}</td><td>${hgEsc(hgDecLabel(d.side, d.type))}${d.reason ? `<br><span class="sm">${hgEsc(d.reason)}</span>` : ''}</td><td class="n">${d.status === 'finalized' ? (ap && ap.amt ? hgM(ap.amt) : L('শুধু রেকর্ড', 'record only')) : (d.amt != null ? hgM(d.amt) + ' (' + L('প্রস্তাব', 'proposed') + ')' : '—')}</td><td>${hgDStatusLabel(d.status)}</td><td class="sm">${ops || '—'}</td></tr>`; }).join(''))}
      <p class="sm">${L('শুধু "চূড়ান্ত" সিদ্ধান্ত হিসাব বদলেছে। প্রস্তাবিত বা বিতর্কিত সিদ্ধান্ত পরিশোধ বলে গণ্য নয়।', 'Only Finalized decisions changed the numbers. Proposed or disputed decisions are never counted as paid.')}</p>` : ''}
    ${plan ? `<h3>${L('৮ক. বাজেট বনাম আসল খরচ', '8a. Budget vs actual')}</h3><p class="sm">${L(`মোট বাজেট ${hgM(plan.total)} (${plan.people} জন, জনপ্রতি ${hgM(plan.each)}), খরচ ${hgM(plan.spent)}, ${plan.remaining >= 0 ? 'বাকি ' + hgM(plan.remaining) : 'বেশি ' + hgM(-plan.remaining)}`, `Budget ${hgM(plan.total)} (${plan.people} people, ${hgM(plan.each)} each), spent ${hgM(plan.spent)}, ${plan.remaining >= 0 ? hgM(plan.remaining) + ' left' : hgM(-plan.remaining) + ' over'}`)}</p>
      ${t([L('খাত', 'Category'), L('আদর্শ', 'Ideal'), L('আসল', 'Actual'), L('পার্থক্য', 'Difference')], plan.rows.map(r => `<tr><td>${hgEsc(hgPlanCatLabel(ev, r.k))}</td><td class="n">${hgM(r.ideal)}</td><td class="n">${hgM(r.spent)}</td><td class="n">${r.over ? '+' + hgM(r.spent - r.ideal) : '−' + hgM(r.left)}</td></tr>`).join(''))}` : ''}
    <h3>${L('৯. মেটানোর অবস্থা', '9. Settlement status')}</h3>
    <p><b>${settledAll ? L('✓ সবার হিসাব মিটেছে', '✓ Everyone is settled') : L('বাকি আছে', 'Still open')}</b> · ${L('মিটেছে', 'settled')} ${rows.length - open.length}/${rows.length}</p>
    ${c.suggestions.length ? `<p>${L('কে কাকে কত দিলে মিটবে (প্রস্তাব)', 'Suggested payments to finish')}:</p><ul>${c.suggestions.map(s => `<li>${hgEsc(pName(ev, s.from))} → ${hgEsc(pName(ev, s.to))}: <b>${hgM(s.amt)}</b></li>`).join('')}</ul>` : ''}
    ${c.issues.length ? `<p class="warnp">⚠ ${L('হিসাবে অমিল আছে, ইভেন্টের সারসংক্ষেপ দেখুন।', 'The books have unresolved issues; see the event overview.')}</p>` : ''}
    <p class="sm foot">${L('তৈরি', 'Generated')}: ${hgFmtTime(Date.now())} · Hisabi · @sakib69alive</p></div>`;
}
/* ---------- সামারি স্লিপ ---------- */
function hgSlipHtml(ev) {
  const c = hgEventCalc(ev), rows = hgReportRows(ev, c);
  const waived = sum(rows.map(r => r.waivedFor));
  const unpaid = sum(rows.map(r => Math.max(0, -r.fin)));
  return `<div class="memo slip"><h1>${hgEsc(ev.name)}</h1><p class="sm">${hgTypeLabel(ev.type)}${hgEvPeriod(ev) ? ' · ' + hgEvPeriod(ev) : ''}</p>
    <div class="kpis"><div><small>${L('মোট খরচ (নেট)', 'Net total')}</small><b>${hgM(c.net)}</b></div><div><small>${L('জন', 'People')}</small><b>${ev.participants.length}</b></div><div><small>${L('বাকি', 'Open')}</small><b>${hgM(unpaid)}</b></div><div><small>${L('মওকুফ', 'Waived')}</small><b>${hgM(waived)}</b></div></div>
    <table class="rt"><thead><tr><th>${L('নাম', 'Name')}</th><th>${L('অংশ', 'Share')}</th><th>${L('দিয়েছে', 'Paid')}</th><th>${L('এখন', 'Final')}</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${hgEsc(r.p.name)}<br><span class="sm">${hgPStatusLabel(r.st)}</span></td><td class="n">${hgM(r.share)}</td><td class="n">${hgM(r.paid)}</td><td class="n"><b>${hgFinalText(r.fin)}</b></td></tr>`).join('')}</tbody></table>
    ${c.suggestions.length ? `<p class="sm">${c.suggestions.map(s => `${hgEsc(pName(ev, s.from))} → ${hgEsc(pName(ev, s.to))} <b>${hgM(s.amt)}</b>`).join(' · ')}</p>` : ''}
    <p><b>${rows.every(r => r.fin === 0) && c.gross > 0 ? L('✓ সব হিসাব মিটেছে', '✓ All settled') : L('হিসাব এখনও বাকি', 'Not fully settled')}</b></p></div>`;
}
/* ---------- শেয়ার করার টেক্সট (WhatsApp ইত্যাদি) ---------- */
function hgShareText(ev, full) {
  const c = hgEventCalc(ev), rows = hgReportRows(ev, c), lines = [];
  lines.push(`*${ev.name}*`);
  lines.push(`${hgTypeLabel(ev.type)}${hgEvPeriod(ev) ? ' | ' + hgEvPeriod(ev) : ''}${ev.location ? ' | ' + ev.location : ''}`);
  lines.push('');
  lines.push(`${L('মোট খরচ', 'Gross')}: ${hgM(c.gross)}${c.refundTotal ? ` | ${L('রিফান্ড', 'Refund')}: ${hgM(c.refundTotal)} | ${L('নেট', 'Net')}: ${hgM(c.net)}` : ''}`);
  lines.push(`${L('অংশগ্রহণকারী', 'People')}: ${ev.participants.length}`);
  lines.push('');
  if (full) {
    const exps = ev.expenses.filter(e => !e.del);
    if (exps.length) { lines.push(`*${L('খরচ', 'Expenses')}*`); exps.forEach(e => lines.push(`- ${e.title}: ${hgM(e.total)} (${e.payers.map(p => pName(ev, p.pid) + ' ' + hgM(p.amt)).join(', ')})`)); lines.push(''); }
  }
  if (full) {
    const cats = hgCatsSorted(c.catTotals);
    if (cats.length) { lines.push(`*${L('টাকা কোথায় গেল', 'Where the money went')}*`); cats.forEach(([k, v]) => lines.push(`- ${hgCatLabel(ev, k)}: ${hgM(v)}`)); lines.push(''); }
    if (c.days.length > 1) { lines.push(`*${L('দিন অনুযায়ী', 'Day by day')}*`); c.days.forEach(d => lines.push(`- ${hgDayLabel(ev, d)}: ${hgM(c.byDay[d].total)}`)); lines.push(''); }
  }
  const pool = hgPoolCalc(ev, c);
  if (pool && pool.hasPool) lines.push(`*${L('জমা টাকা', 'Money held')}*: ${L('জমা', 'collected')} ${hgM(pool.collected)} · ${L('খরচ', 'spent')} ${hgM(pool.spent)} · ${L('হাতে', 'in hand')} ${hgM(pool.held)} · ${L('ফেরত দিতে হবে', 'to return')} ${hgM(pool.toReturn)}`, '');
  lines.push(`*${L('কার কী অবস্থা', 'Who stands where')}*`);
  rows.forEach(r => lines.push(`- ${r.p.name}: ${L('অংশ', 'share')} ${hgM(r.share)}, ${L('দিয়েছে', 'paid')} ${hgM(r.paid)} => ${hgFinalText(r.fin)} [${hgPStatusLabel(r.st)}]${r.waivedFor ? ` (${L('মওকুফ', 'waived')} ${hgM(r.waivedFor)})` : ''}${r.waivedBy ? ` (${L('ছেড়েছে', 'forgave')} ${hgM(r.waivedBy)})` : ''}`));
  if (c.suggestions.length) { lines.push(''); lines.push(`*${L('কে কাকে দেবে', 'Who pays whom')}*`); c.suggestions.forEach(s => lines.push(`- ${pName(ev, s.from)} -> ${pName(ev, s.to)}: ${hgM(s.amt)}`)); }
  lines.push('');
  lines.push(rows.every(r => r.fin === 0) && c.gross > 0 ? L('✅ সব হিসাব মিটেছে', '✅ All settled') : L('⏳ হিসাব এখনও বাকি', '⏳ Not fully settled'));
  return lines.join('\n');
}
const HG_PRINT_CSS = `*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Hind Siliguri","Noto Sans Bengali","Kohinoor Bangla",sans-serif;color:#1a1a17;margin:0;padding:18px;font-size:13px;line-height:1.5}
.memo h1{font-size:22px;margin:0 0 2px}.memo h3{font-size:15px;margin:18px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px;break-after:avoid}.memo h4{margin:12px 0 4px;font-size:13px}
.sm{color:#666;font-size:11.5px;margin:2px 0}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.kpis div{border:1px solid #ddd;border-radius:10px;padding:8px}.kpis small{display:block;color:#666;font-size:11px}.kpis b{font-size:15px}
table.rt{width:100%;border-collapse:collapse;margin:6px 0;font-size:12px}.rt th,.rt td{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}.rt th{background:#f3f3ee}.rt .n{text-align:right;white-space:nowrap}.rt tr{break-inside:avoid}.rt tr.tt td{font-weight:700;background:#faf9f2}.rt tr.x td{text-decoration:line-through;color:#999}
.warnp{color:#b4452e}.foot{margin-top:16px}ul{margin:4px 0 4px 18px;padding:0}@media print{body{padding:0}.memo h3{break-after:avoid}}`;
function hgOpenPrint(html, title) {
  const doc = `<!doctype html><html lang="${isEN() ? 'en' : 'bn'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${hgEsc(title)}</title><style>${HG_PRINT_CSS}</style></head><body>${html}<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},350)})<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.open(); w.document.write(doc); w.document.close(); return true; }
  // পপআপ আটকালে ফাইল হিসেবে নামানো, খুলে প্রিন্ট করলেই PDF হয়
  const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
  const a = document.createElement('a'); a.href = url; a.download = `${title.replace(/[^\wঀ-৿-]+/g, '_')}.html`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(L('ফাইলটা খুলে প্রিন্ট → "PDF হিসেবে সেভ" করুন', 'Open the file, then Print → "Save as PDF"'));
  return false;
}
let hgRepKind = 'memo';
function hgReportSheet(kind) {
  const ev = hgCur(); hgRepKind = kind;
  const html = kind === 'slip' ? hgSlipHtml(ev) : hgMemoHtml(ev);
  openSheet(`${sheetHead(kind === 'slip' ? L('সামারি স্লিপ', 'Summary slip') : L('পূর্ণ মেমো', 'Full memo'), L('এক্সপোর্টের আগে দেখে নিন', 'Preview before exporting'))}
    <div class="hg-actions three"><button type="button" class="btn primary" data-action="hg-rep-print">${icon('doc', 18)} PDF</button>
      <button type="button" class="btn" data-action="hg-rep-copy">${icon('share', 18)} ${L('টেক্সট কপি', 'Copy text')}</button><button type="button" class="btn" data-action="hg-rep-share">${icon('share', 18)} ${L('শেয়ার', 'Share')}</button></div>
    <p class="hint">${L('PDF বাটনে চাপলে ফাইল নিজে নেমে যাবে। ফোনে শেয়ার সুবিধা থাকলে নিচে "PDF পাঠান" দিয়ে সরাসরি পাঠানো যায়।', 'Tap PDF and the file downloads. On phones with file sharing you can send it with "Send PDF" below.')}</p>
    ${navigator.canShare ? `<button type="button" class="btn block" data-action="hg-pdf-send">📤 ${L('PDF পাঠান', 'Send PDF')}</button>` : ''}
    <div class="hg-preview">${html}</div>`);
}
async function hgCopy(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* নিচে বিকল্প */ }
  const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove(); return ok;
}
Object.assign(ACTIONS, {
  'hg-export': () => { if (hgCur()) hgReportSheet('memo'); },
  'hg-rep-memo': () => hgReportSheet('memo'),
  'hg-rep-slip': () => hgReportSheet('slip'),
  'hg-rep-text': () => {
    const ev = hgCur(); if (!ev) return; const txt = hgShareText(ev, true);
    openSheet(`${sheetHead(L('শেয়ার করার টেক্সট', 'Shareable text'), L('কপি করে পাঠান', 'Copy and send'))}<textarea class="input hg-text" readonly rows="14">${hgEsc(txt)}</textarea>
      <div class="btn-row mt8"><button type="button" class="btn primary" data-action="hg-text-copy">${L('কপি করুন', 'Copy')}</button><button type="button" class="btn" data-action="hg-text-share">${L('শেয়ার', 'Share')}</button></div>`);
  },
  'hg-text-copy': async () => { const ta = $('.hg-text'); toast((await hgCopy(ta.value)) ? L('কপি হয়েছে', 'Copied') : L('কপি করা যায়নি, টেক্সট চেপে ধরে কপি করুন', 'Could not copy, long-press the text to copy it'), ''); },
  'hg-text-share': async () => { const ta = $('.hg-text'); try { if (navigator.share) { await navigator.share({ text: ta.value }); return; } } catch (e) { if (e && e.name === 'AbortError') return; } toast((await hgCopy(ta.value)) ? L('শেয়ার সাপোর্ট নেই, কপি করা হয়েছে', 'Sharing is not supported; copied instead') : L('কপি করা যায়নি', 'Could not copy'), ''); },
  'hg-rep-copy': async () => { const ev = hgCur(); if (!ev) return; toast((await hgCopy(hgShareText(ev, hgRepKind !== 'slip'))) ? L('কপি হয়েছে', 'Copied') : L('কপি করা যায়নি', 'Could not copy')); },
  'hg-rep-share': async () => {
    const ev = hgCur(); if (!ev) return; const txt = hgShareText(ev, hgRepKind !== 'slip');
    try { if (navigator.share) { await navigator.share({ title: ev.name, text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    toast((await hgCopy(txt)) ? L('শেয়ার সাপোর্ট নেই, টেক্সট কপি হয়েছে', 'Sharing is not supported; text copied') : L('কপি করা যায়নি', 'Could not copy'));
  },
});

/* ---------- ব্যাকআপ ও রিস্টোর (শুধু Hangout ডেটা, ব্যবসার ডেটা অক্ষত) ---------- */
const HG_PREV_KEY = 'hisabi:hg-prev';
async function hgExportBackup() {
  const images = {};
  let missing = 0;
  const keys = hgReceiptKeys();
  for (const k of keys) {
    try { const blob = (await allImages()).find(([id]) => id === k); if (blob && blob[1]) images[k] = await blobToDataURL(blob[1]); else missing++; } catch (e) { missing++; }
  }
  const data = JSON.stringify({ app: 'hisabi-hangout', schema: HG_SCHEMA, exportedAt: new Date().toISOString(), hangout: hg(), images });
  const name = `hisabi-hangout-${today()}.json`;
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  state.settings.lastBackup = Date.now(); save();
  // রসিদ বাদ গেলে সফল বলে ভুল বার্তা দেখাই না
  toast(missing ? L(`ব্যাকআপ নামানো হয়েছে, কিন্তু ${missing}টা রসিদের ছবি যায়নি`, `Backup saved, but ${missing} receipt photo(s) could not be included`) : L('Hangout ব্যাকআপ তৈরি হয়েছে', 'Hangout backup created'), missing ? 'danger' : '');
}
function hgReceiptKeys() {
  const out = [];
  hg().events.forEach(ev => ev.expenses.forEach(e => { if (e.receipt) out.push('hgr:' + e.receipt); (e.photos || []).forEach(p => out.push('hgp:' + p.id)); }));
  return out;
}
let hgPendingImport = null;
function hgImportSheet() {
  const p = hgPendingImport, h = p.hangout;
  const have = new Set(hg().events.map(e => e.id));
  const dup = h.events.filter(e => have.has(e.id)).length;
  return `${sheetHead(L('Hangout ব্যাকআপ রিস্টোর', 'Restore Hangout backup'), L('ব্যবসার ডেটা ছোঁয়া হবে না', 'Your Product Sales data is not touched'))}
    <div class="bsum"><b>${L(`ব্যাকআপে ${h.events.length}টা ইভেন্ট, ${h.friends.length} জন বন্ধু`, `${h.events.length} event(s), ${h.friends.length} friend(s) in the file`)}</b><span>${dup ? L(`${dup}টা ইভেন্ট আগে থেকেই আছে`, `${dup} event(s) already exist`) : L('সবই নতুন', 'All are new')}</span></div>
    <button type="button" class="btn primary block mt12" data-action="hg-import-merge">${L('মিলিয়ে নিন (যা আছে তা থাকবে, ডুপ্লিকেট বাদ)', 'Merge (keep current, skip duplicates)')}</button>
    <button type="button" class="btn danger block mt8" data-action="hg-import-replace">${L('বদলে দিন (এখনকার সব Hangout ডেটা মুছে ব্যাকআপ বসবে)', 'Replace (current Hangout data is swapped for the backup)')}</button>
    <p class="hint">${L('বদলানোর আগে এখনকার Hangout ডেটার একটা নিরাপদ কপি ফোনে রাখা হয়। কিছু ব্যর্থ হলে আগের অবস্থায় ফিরবে।', 'Before replacing, a safety copy of your current Hangout data is kept. If anything fails, nothing changes.')}</p>`;
}
async function hgApplyImport(mode) {
  const p = hgPendingImport; if (!p) return;
  const cur = JSON.parse(JSON.stringify(hg()));
  const safe = JSON.stringify(cur);
  try { localStorage.setItem(HG_PREV_KEY, safe); } catch (e) { if (mode === 'replace') return toast(L('নিরাপদ কপি রাখা যায়নি (জায়গা কম)। আগে নিজের একটা ব্যাকআপ নিন।', 'Could not keep a safety copy (storage full). Take a backup first.'), 'danger'); }
  let next;
  if (mode === 'merge') { const m = hgMerge(cur, p.hangout); next = { schema: HG_SCHEMA, friends: m.friends, events: m.events }; p.msg = L(`${m.added}টা ইভেন্ট যোগ হয়েছে, ${m.skipped}টা আগে থেকেই ছিল`, `${m.added} event(s) added, ${m.skipped} already existed`); }
  else { next = { schema: HG_SCHEMA, friends: p.hangout.friends, events: p.hangout.events }; p.msg = L('Hangout ডেটা ফেরত আনা হয়েছে', 'Hangout data restored'); }
  if (!hgValidate(next).ok) return toast(L('ব্যাকআপ যাচাইয়ে আটকেছে, কিছু বদলায়নি', 'The backup failed validation; nothing was changed'), 'danger');
  const before = state.hangout;
  state.hangout = next; hangoutMigrate(state);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { state.hangout = before; return toast(L('সেভ করা যায়নি (জায়গা শেষ?), আগের অবস্থায় আছে', 'Could not save (storage full?). Nothing was changed.'), 'danger'); }
  const imgs = Object.entries(p.images || {}).filter(([k]) => k.startsWith('hgr:'));
  let failed = 0;
  await Promise.all(imgs.map(([k, d]) => (typeof d === 'string' && d.startsWith('data:image/') ? fetch(d).then(r => r.blob()).then(b => putImage(k, b)).catch(() => { failed++; }) : (failed++, 0))));
  hgPendingImport = null; hgRoute.ev = null;
  if (sheetOpen) closeSheet();
  commit(failed ? L(`ফেরত এসেছে, কিন্তু ${failed}টা রসিদের ছবি আনা যায়নি`, `Restored, but ${failed} receipt photo(s) could not be restored`) : p.msg);
}
document.addEventListener('change', e => {
  if (!e.target.matches || !e.target.matches('#hg-import-file')) return;
  const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!obj || obj.app !== 'hisabi-hangout') throw new Error('app');
      const v = hgValidate(obj.hangout);
      if (!v.ok) throw new Error(v.error);
      hgPendingImport = { hangout: obj.hangout, images: obj.images && typeof obj.images === 'object' ? obj.images : {} };
      openSheet(hgImportSheet());
    } catch (err) { toast(L('এটা সঠিক Hangout ব্যাকআপ ফাইল না বা ফাইল নষ্ট', 'That is not a valid Hangout backup, or the file is corrupted'), 'danger'); }
  };
  reader.onerror = () => toast(L('ফাইল পড়া যায়নি', 'Could not read the file'), 'danger');
  reader.readAsText(file);
});
Object.assign(ACTIONS, {
  'hg-backup': () => hgExportBackup(),
  'hg-import': () => { let i = $('#hg-import-file'); if (!i) { i = document.createElement('input'); i.type = 'file'; i.id = 'hg-import-file'; i.accept = 'application/json,.json'; i.hidden = true; document.body.appendChild(i); } i.click(); },
  'hg-import-merge': () => hgApplyImport('merge'),
  'hg-import-replace': () => { if (confirm(L('এখনকার সব Hangout ইভেন্ট বদলে যাবে। চালিয়ে যাবেন?', 'All current Hangout events will be replaced. Continue?'))) hgApplyImport('replace'); },
  'hg-undo-import': () => {
    let prev; try { prev = JSON.parse(localStorage.getItem(HG_PREV_KEY)); } catch (e) { prev = null; }
    if (!prev || !hgValidate(prev).ok) return toast(L('ফেরানোর মতো কপি নেই', 'No safety copy to go back to'), 'danger');
    if (!confirm(L('রিস্টোরের আগের Hangout ডেটায় ফিরবেন?', 'Go back to the Hangout data from before the restore?'))) return;
    state.hangout = prev; hangoutMigrate(state); hgRoute.ev = null; commit(L('আগের অবস্থায় ফেরানো হয়েছে', 'Reverted'));
  },
  'hg-restore-event': el => { const ev = hg().events.find(e => e.id === el.dataset.id); if (!ev) return; delete ev.del; hgLog(ev, 'ইভেন্ট ফেরানো হয়েছে', 'Event restored'); commit(L('ইভেন্ট ফিরেছে', 'Event restored')); },
  'hg-purge-event': el => {
    const ev = hg().events.find(e => e.id === el.dataset.id); if (!ev) return;
    if (!confirm(L(`"${ev.name}" চিরতরে মুছে যাবে (সব খরচ, লেনদেন, রসিদ, সিদ্ধান্ত)। ফেরানো যাবে না। নিশ্চিত?`, `"${ev.name}" will be deleted forever (all expenses, payments, receipts and decisions). This cannot be undone. Sure?`))) return;
    ev.expenses.forEach(x => { if (x.receipt) deleteImage('hgr:' + x.receipt).catch(() => {}); });
    hg().events = hg().events.filter(e => e.id !== ev.id); commit(L('চিরতরে মোছা হয়েছে', 'Permanently deleted'));
  },
});

/* ---------- বন্ধুদের ট্যাব ও আরও ট্যাব ---------- */
function hgFriendsSheet() {
  const list = hg().friends.slice().sort((a, b) => a.name.localeCompare(b.name));
  const cntEv = f => hgEvents().filter(ev => ev.participants.some(p => p.friendId === f.id)).length;
  return `${sheetHead(L('সেভ করা বন্ধুরা', 'Saved friends'), L('নতুন ইভেন্টে আবার বাছতে পারবেন', 'Reuse them in new events'))}
    <button type="button" class="btn primary block" data-action="hg-add-friend">${icon('plus', 18)} ${L('বন্ধু যোগ করুন', 'Add friend')}</button>
    ${list.length ? `<div class="list mt12">${list.map(f => `<button type="button" class="lrow" data-action="hg-edit-friend" data-id="${f.id}"><span class="lic">${esc(f.name.charAt(0).toUpperCase())}</span>
      <span class="lmain"><b>${esc(f.name)}</b><small>${f.phone ? '📞 ' + esc(f.phone) + ' · ' : ''}${cntEv(f)} ${L('ইভেন্ট', 'events')}</small></span>${icon('chev', 18)}</button>`).join('')}</div>`
      : `<p class="hint">${L('এখনও কেউ সেভ নেই। ইভেন্টে বন্ধু যোগ করলে এখানে জমা হয়।', 'No one saved yet. Friends you add to events are saved here.')}</p>`}
    <p class="hint">${L('এখানে নাম বদলালে পুরোনো ইভেন্টের নাম বদলায় না।', 'Renaming here never changes past events.')}</p>`;
}
function hgGuideSheet() {
  const ul = a => `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const ex = (bn, en) => `<div class="gex">${L(bn, en)}</div>`;
  const sections = [
    [L('শুরু করুন: ৩ ধাপে', 'Start in 3 steps'), ul([
      L('<b>ইভেন্ট খুলুন:</b> নাম আর কারা কারা ছিল লিখুন।', '<b>Open an event:</b> a name and who was there.'),
      L('<b>খরচ লিখুন:</b> কত টাকা, কে দিল, কাদের মধ্যে ভাগ। শুধু এই ৩টা প্রশ্ন।', '<b>Add expenses:</b> how much, who paid, who shares. Just three questions.'),
      L('<b>মেটান:</b> "মেটানো" ট্যাবে দেখুন কে কাকে কত দেবে, টাকা দিলে "দিয়েছে ✓" চাপুন।', '<b>Settle:</b> the Settle tab shows who pays whom; tap "Paid ✓" when money moves.'),
    ])],
    [L('একটা খরচ কীভাবে ভাগ হয়', 'How one expense is split'), `<p>${L('অ্যাপ মোট টাকা সবার মধ্যে ভাগ করে, যে টাকা দিয়েছে তার পাওনা আর বাকিদের দেনা বের করে।', 'The app divides the total, then works out what the payer is owed and what the others owe.')}</p>
      ${ex('<b>উদাহরণ:</b> বাসভাড়া ৳৬,৪০০, ৪ জন, সাকিব সবটা দিয়েছে। প্রত্যেকের ভাগ ৳১,৬০০। সাকিবের ভাগ বাদ দিলে বাকি ৩ জন সাকিবকে ৳১,৬০০ করে দেবে। সাকিব পাবে ৳৪,৮০০।', '<b>Example:</b> bus ৳6,400, 4 people, Sakib paid it all. Each share is ৳1,600. The other 3 each owe Sakib ৳1,600, so he gets ৳4,800.')}
      ${ul([L('কাউকে বাদ দিতে নিচে নামের টিক তুলে দিন, সে ওই খরচে থাকবে না।', 'Untick someone and they are left out of that expense.'), L('"অন্যভাবে ভাগ করুন" এ শতাংশ, নির্দিষ্ট টাকা বা অনুপাত দেওয়া যায়।', '"Split differently" lets you use percent, exact amounts or a ratio.'), L('এক পয়সাও হারায় না: ভাগ করতে গিয়ে যা বাড়তি পড়ে তা নিয়ম মেনে বণ্টন হয়।', 'Not a single paisa is lost: any leftover is allocated by a fixed rule.')])}`],
    [L('একাধিক জন টাকা দিলে', 'When several people paid'), `<p>${L('"একজনের বেশি দিয়েছে" টিক দিন, প্রত্যেকে কত দিয়েছে লিখুন। "বাকিটা" বাটনে একজনের ঘরে বাকি টাকা বসে, "সমান ভাগে" বাটনে সবার সমান।', 'Tick "More than one person paid" and enter each amount. "Rest" fills the remaining amount; "Equal" splits it evenly.')}</p>
      ${ex('<b>উদাহরণ:</b> বিল ৳২,০০০। সাকিব ৳১,২০০ আর রাফি ৳৮০০ দিয়েছে। দুজনেই ভাগ করলে প্রত্যেকের ভাগ ৳১,০০০। সাকিব ৳২০০ বেশি দিয়েছে, রাফি ৳২০০ কম। রাফি সাকিবকে ৳২০০ দেবে।', '<b>Example:</b> bill ৳2,000. Sakib paid ৳1,200 and Rafi ৳800. Each share is ৳1,000. Sakib paid ৳200 extra, Rafi ৳200 short, so Rafi pays Sakib ৳200.')}
      <p class="muted">${L('যোগফল খরচের সমান না হলে সেভ হয় না, ফর্মেই দেখায় কত বাকি বা বেশি।', 'It will not save unless the amounts equal the expense; the form shows how much is left or extra.')}</p>`],
    [L('খাত: বাছুন বা নিজের খাত বানান', 'Categories: pick one or make your own'), `<p>${L('খরচ লেখার সময় সব খাত একসাথে দেখা যায়, ট্যাপ করলেই বাছা হয় (মোবাইলেও)। পাশের <b>＋ নিজের খাত</b> চেপে নিজের নাম দিয়ে যোগ করুন, যেমন "ফুল" বা "বখশিশ"। এটা ওই ইভেন্টে থেকে যায়।', 'All categories show together when you add an expense; tap to choose (on phones too). Tap <b>＋ My own</b> to add a category with your own name, like "flowers" or "tips". It stays in that event.')}</p>
      ${ul([L('ইভেন্টের ধরন বাছলেই ওই অনুষ্ঠানের খাতগুলো নিজে সেট হয়: জন্মদিন, বিয়ে, ঈদ, পার্টি, মাসিক সংসার, দৈনিক বাজার ইত্যাদি।', 'Choosing an event type sets that occasion\'s categories: birthday, wedding, Eid, party, monthly household, daily market and more.')])}`],
    [L('ভ্যাট, সার্ভিস চার্জ, টিপস: শতাংশে', 'VAT, service charge, tips: as a percent'), `<p>${L('<b>সাধারণ খরচে:</b> মোটের নিচে "ভ্যাট, সার্ভিস চার্জ, টিপস বা ছাড় যোগ করুন" খুলে % দিন, মোট নিজে বদলে যায়। <b>রেস্টুরেন্ট বিলে:</b> "＋ VAT 15%" বা "＋ সার্ভিস চার্জ 10%" ট্যাপ করুন। টাকা নিজে বের হয়, আইটেম বদলালে আবার মিলে যায়।', '<b>On a normal expense:</b> open "Add VAT, service charge, tip or discount" under the total and enter a %; the total updates. <b>On a restaurant bill:</b> tap "＋ VAT 15%" or "＋ Service charge 10%". The money is worked out for you and follows the items.')}</p>
      ${ex('<b>উদাহরণ:</b> খাবার ৳৪০০, সার্ভিস চার্জ ১০% = ৳৪০। ভ্যাট ১৫% সার্ভিস চার্জসহ ৳৪৪০-এর ওপর = ৳৬৬। মোট ৳৫০৬। যে বেশি খেয়েছে সে বেশি ভ্যাট দেয়।', '<b>Example:</b> food ৳400, 10% service charge = ৳40. 15% VAT on ৳440 (food plus service) = ৳66. Total ৳506. Whoever ate more pays more VAT.')}`],
    [L('"বাকিটা": পুরো না কিছুটা', '"Rest": all of it or part'), `<p>${L('একাধিক জন টাকা দিলে কারও পাশে <b>বাকিটা</b> চাপলে দুটো বিকল্প আসে: <b>পুরোটা</b> (বাকি সবটা সে দেবে) অথবা <b>কিছু পরিমাণ</b> (যত দেবে লিখুন, বাকি অংশ অন্য কেউ দেবে)।', 'When several people paid, tap <b>Rest</b> next to someone for two choices: <b>All of it</b> (they pay everything left) or <b>Part of it</b> (type how much; someone else covers the rest).')}</p>`],
    [L('মাসিক সংসার খরচ', 'Monthly household'), `<p>${L('মাস বদলে (‹ ›) প্রতি মাসের হিসাব দেখুন। <b>মাসের টাকা</b>-য় মোট বাজেট, হাতে থাকা প্রাথমিক টাকা, আগের মাসের অবশিষ্ট, অতিরিক্ত আয় ও ধার লিখুন। হোমে দেখাবে: মাসের শুরুতে কত ছিল, কত এল, কত খরচ, কত বাকি, কোন খাতে কত, কোন বিল বাকি আর মাস শেষে আনুমানিক কত লাগতে পারে।', 'Switch months with ‹ ›. In <b>Month money</b> enter the total budget, money in hand, last month\'s leftover, extra income and borrowed money. Home shows what you had at the start, what came in, what was spent, what is left, which category took what, which bills are unpaid and a month-end estimate.')}</p>
      ${ex('<b>উদাহরণ:</b> মাসের টাকা ৳৩০,০০০। বাজার ৮,০০০ + চিকিৎসা ২,০০০ + পড়াশোনা ৩,০০০ + বিদ্যুৎ ১,০০০ = খরচ ১৪,০০০, বাকি ১৬,০০০। (শুধু বোঝানোর উদাহরণ, আপনার হিসাব নয়।)', '<b>Example:</b> month money ৳30,000. Groceries 8,000 + medical 2,000 + education 3,000 + electricity 1,000 = 14,000 spent, 16,000 left. (Just an illustration, not your data.)')}
      ${ul([L('<b>বিদ্যুৎ, গ্যাস, পানি, ইন্টারনেট:</b> প্রতি মাসের বিল আলাদা: মূল পরিমাণ, অতিরিক্ত চার্জ, ডিসকাউন্ট, নির্ধারিত তারিখ, কত দিলেন, কত বাকি, বিলের ছবি। মিটার রিডিং দিলে ব্যবহারের পরিবর্তন দেখায়, না দিলে অনুমান করে কিছু দেখায় না।', '<b>Power, gas, water, internet:</b> each month separate: base, extra charge, discount, due date, paid, due, bill photo. With meter readings usage change is shown; without them nothing is guessed.'), L('<b>পড়াশোনা:</b> শিক্ষক ও শিক্ষার্থী, কোন দিন পড়ান, মাসিক বা প্রতি ক্লাসের ফি, অনুপস্থিত/অতিরিক্ত ক্লাস, বকেয়া। স্কুল, কোচিং, ভর্তি, পরীক্ষা, বই, স্টেশনারি, অনলাইন কোর্স আলাদা খরচ।', '<b>Education:</b> teachers and students, days, monthly or per-class fee, absent/extra classes, dues. School, coaching, admission, exam, books, stationery and online courses as separate costs.'), L('<b>চিকিৎসা:</b> প্রতিটা সদস্যের প্রোফাইল, ডাক্তার-হাসপাতাল-পরীক্ষার খরচ, ওষুধ (প্রতিবার নতুন দাম ও পরিমাণ), ব্যক্তি ও মাস অনুযায়ী সারাংশ। ওষুধের কোনো পরামর্শ অ্যাপ দেয় না।', '<b>Medical:</b> a profile per member, doctor, hospital and test costs, medicines (new price and quantity each time), summary by person and month. The app gives no medicine advice.')])}`],
    [L('বিল, ফি আর পেমেন্ট', 'Bills, fees and payments'), `<p>${L('বিল বা ফি লিখলে খরচ <b>একবারই</b> ধরা হয়। পেমেন্ট আলাদা জমা হয়: <b>বাকি, আংশিক, পরিশোধিত, তারিখ পার</b>। আংশিক দিলে বাকিটা ঠিক থাকে, পরে "পেমেন্ট যোগ করুন" দিলে শুধু বাকি কমে, নতুন খরচ হয় না। এক মাসের বকেয়া পরের মাসের বিলের সাথে মেশে না, "পুরোনো বকেয়া" আলাদা দেখায়।', 'A bill or fee is counted <b>once</b> as spending. Payments are kept apart: <b>unpaid, partly paid, paid, overdue</b>. A part payment leaves the rest due; "Add a payment" later only lowers the due and never adds spending. An old month\'s due never mixes with the next month\'s bill; it shows as "Older dues".')}</p>`],
    [L('একজনের ব্যক্তিগত খরচ (যেমন কোক)', 'One person\'s own cost (like a coke)'), `<p>${L('"ব্যক্তিগত খরচ" বাটনে চাপুন, কার খরচ বাছুন। শুধু তার হিসাবে যাবে, অন্য কারও ভাগে নয়।', 'Tap "Personal cost" and pick whose it is. It goes only to that person.')}</p>
      ${ex('<b>উদাহরণ:</b> রাফি একা কোক খেল ৳৬০ আর নিজেই দিল। রাফির খরচ ৳৬০, বাকিদের কিছু না, কাউকে কিছু দিতেও হবে না। সাকিব দিলে রাফি সাকিবকে ৳৬০ দেবে।', '<b>Example:</b> Rafi had a ৳60 coke and paid for it. It is only Rafi\'s cost; nobody owes anything. If Sakib paid, Rafi owes Sakib ৳60.')}`],
    [L('রেস্টুরেন্টের বিল (আইটেম ধরে)', 'Restaurant bill (item by item)'), `<p>${L('প্রতিটা খাবারে "কে কে খেয়েছে" ট্যাপ করুন। একজন হলে তার, কয়েকজন হলে সমান ভাগ। ভ্যাট, সার্ভিস চার্জ, ডিসকাউন্ট আলাদা যোগ হয় আর আনুপাতিক হারে ভাগ হয়।', 'Tap who had each dish: one person means theirs, several means an equal split. VAT, service charge and discount are added separately and shared proportionally.')}</p>
      ${ex('<b>উদাহরণ:</b> বার্গার ৳৩৫০ (সাকিব), পাস্তা ৳৪৫০ (রাফি), পিজা ৳৬০০ (৩ জন)। সাকিব ৳৫৫০, রাফি ৳৬৫০, মিম ৳২০০, মোট ৳১,৪০০। ১০% ভ্যাট ৳১৪০ যোগ হলে সবাই ১০% বেশি: ৳৬০৫, ৳৭১৫, ৳২২০।', '<b>Example:</b> burger ৳350 (Sakib), pasta ৳450 (Rafi), pizza ৳600 (3 people). Sakib ৳550, Rafi ৳650, Mim ৳200, total ৳1,400. Add ৳140 VAT and everyone pays 10% more: ৳605, ৳715, ৳220.')}
      <p class="muted">${L('রেস্টুরেন্টের আসল বিল লিখলে মিল দেখে। না মিললে "অ্যাডজাস্টমেন্ট" যোগ করে মেলাতে হয়, গোপনে কারও ঘাড়ে চাপে না।', 'Enter the restaurant\'s real bill to check it. If it differs, add an "adjustment"; it is never silently charged to anyone.')}</p>`],
    [L('টাকা মেটানো: পুরো, কিছুটা, অন্যের হয়ে, পরে', 'Paying back: full, part, for someone, later'), `<p>${L('"কে কাকে দেবে"-র প্রতিটা সারিতে <b>দিয়েছে ✓</b> চাপলে পুরোটা মিটে যায়। পাশের <b>⋯</b> বাটনে আরও বিকল্প:', 'On each "Who pays whom" row, <b>Paid ✓</b> settles it in full. The <b>⋯</b> button gives more options:')}</p>
      ${ul([L('<b>কিছুটা দিয়েছে:</b> যত দিয়েছে লিখুন, বাকিটা বাকি থাকে।', '<b>Paid part:</b> enter what was paid; the rest stays due.'), L('<b>অন্য কেউ ওর হয়ে দিয়েছে:</b> যে দিল তার পাওনা হয়ে যায়।', '<b>Someone else paid for them:</b> that person is now owed it.'), L('<b>পরের বিলে দেবে:</b> বাকি থাকে, পরের খরচে আগের বাকিসহ দেখায়।', '<b>Pays next bill:</b> stays due, and the next expense shows it with the new share.')])}
      ${ex('<b>উদাহরণ:</b> টিকেট ৳১০ করে ৪ জন, মোট ৳৪০ সাকিব দিয়েছে। রাফি ১০, মিম ১০, তানভীর ৭ দিল। তানভীর ৳৩ বাকি রেখে "পরের বিলে দেবে" বলল। পরের বিল সিনেমা ৳১০০ (ভাগ ৳২৫), মিম দিল। নতুন খরচ লেখার সময় অ্যাপ দেখাবে: <b>তানভীর আগে −৳৩ → এখন −৳২৮</b> (২৫ + ৩)।', '<b>Example:</b> tickets ৳10 each for 4, ৳40 paid by Sakib. Rafi gave 10, Mim 10, Tanvir 7 and said he will pay the ৳3 with the next bill. Next bill: movie ৳100 (৳25 each), paid by Mim. While adding it the app shows: <b>Tanvir before −৳3 → now −৳28</b> (25 + 3).')}
      ${ex('<b>আর যদি মিম আগেই তানভীরের ৳৩ সাকিবকে দিয়ে দেয়</b> ("অন্য কেউ ওর হয়ে দিয়েছে"), তাহলে তানভীর মিমকে দেবে। সিনেমার পর তানভীরের মোট দেনা ৳২৮, সবটাই মিমকে।', '<b>If Mim had already paid Sakib the ৳3 for Tanvir</b> ("Someone else paid for them"), Tanvir now owes Mim. After the movie Tanvir owes ৳28 in total, all of it to Mim.')}`],
    [L('নতুন খরচ লেখার সময় আগের বাকি', 'Earlier dues when adding an expense'), `<p>${L('খরচ ফর্মের নিচে "এই খরচের পর কার কত বাকি" দেখায়: প্রত্যেকের <b>আগের</b> বাকি আর <b>এই খরচের পর</b> বাকি। এটাই বলে দেয় এবার কার কাছ থেকে কত নিতে হবে।', 'At the bottom of the expense form, "After this expense" shows each person\'s <b>previous</b> and <b>new</b> balance. It tells you how much to collect from whom this time.')}</p>`],
    [L('জমা টাকা: সবাই আপনার কাছে দিলে', 'Money held: when everyone hands it to you'), `<p>${L('বন্ধুরা অগ্রিম টাকা আপনার (আপনার) কাছে জমা দিতে পারে। "টাকা জমা/শোধ" → "সে আমার কাছে টাকা জমা দিল"। পরে "জমা টাকার হিসাব" কার্ডে দেখুন কার কত জমা, কত খরচ, কাকে কত ফেরত।', 'Friends can hand advance money to you (you). Use "Money in/out" → "He/she handed me money". The "Money held" card then shows deposits, costs and returns per person.')}</p>
      ${ex('<b>উদাহরণ:</b> ৩ বন্ধু ৳৫,০০০ করে দিল, মোট ৳১৫,০০০। ট্রিপের খরচ ৳১২,০০০, ৪ জনে ভাগ, প্রত্যেকের ৳৩,০০০। বন্ধু প্রতি ফেরত ৳২,০০০, মোট ৳৬,০০০। হাতে আছে ৳৩,০০০। ঘাটতি ৳৩,০০০ আপনার নিজের ভাগ, ওটা আপনার পকেট থেকে। প্রতিজনকে ফেরত দিলে <b>ফেরত দিলাম ✓</b> চাপুন।', '<b>Example:</b> 3 friends gave ৳5,000 each, ৳15,000 in all. The trip cost ৳12,000 split 4 ways, ৳3,000 each. Each friend gets ৳2,000 back, ৳6,000 in total. You hold ৳3,000. The ৳3,000 gap is your own share, from your pocket. Tap <b>Returned ✓</b> as you pay each one.')}`],
    [L('মাঝপথে কেউ যোগ দিলে', 'When someone joins midway'), `<p>${L('বন্ধু যোগ করার সময় "কবে থেকে ছিল" তারিখ দিন। এর আগের খরচে তাকে ধরা হয় না, তাই পুরোনো হিসাব বদলায় না। নতুন খরচে নিজে থেকে ধরা হয়, আগের তারিখ দিলে নিজে বাদ পড়ে।', 'Set "Since when" when adding the person. Earlier expenses leave them out, so old numbers do not change. New expenses include them automatically; choose an earlier date and they drop out.')}</p>`],
    [L('আদর্শ বাজেট: অনুষ্ঠান বেছে নিন', 'Ideal budget: pick the occasion'), `<p>${L('হোমে "বাজেট ঠিক করুন" চাপুন। <b>১.</b> কিসের বাজেট তা বাছুন (জন্মদিন বাসায়/হলে, পার্টি, বিয়ে, ঈদ, ভ্রমণ, মাসিক সংসার, দৈনিক বাজার...)। অ্যাপ সেই অনুষ্ঠানে সাধারণত যেভাবে টাকা ভাগ হয় সেভাবে সাজিয়ে দেয় (অনলাইনের পরিকল্পনা-নির্দেশিকা ধরে)। <b>২.</b> কয়জন আর কত টাকা লিখুন। <b>৩.</b> % বা ৳ যেকোনো খাত বদলান, ✕ দিয়ে বাদ দিন, "আরও খাত" থেকে যত খুশি যোগ করুন বা নিজের খাত বানান। সবকিছু আপনার হাতে।', 'On Home tap "Set a budget". <b>1.</b> Pick the occasion (birthday at home or a venue, party, wedding, Eid, trip, monthly household, daily market...). The app lays out the usual split for it, based on common online planning guides. <b>2.</b> Enter people and money. <b>3.</b> Change any % or ৳, drop a row with ✕, add any from "More categories" or make your own. Everything is yours to change.')}</p>
      ${ex('<b>উদাহরণ:</b> ৫ জন, জনপ্রতি ৳৫,০০০, মোট ৳২৫,০০০। ভ্রমণে হোটেল প্রায় ২৮%, যাতায়াত ২৩%, খাবার ১৮%, জরুরি রিজার্ভ ৮%। কোনো খাত বেশি হলে লাল দেখায় আর কী করা যায় বলে দেয়।', '<b>Example:</b> 5 people, ৳5,000 each, ৳25,000 total. For a trip hotel is about 28%, transport 23%, food 18%, emergency reserve 8%. Any category over its share turns red with a suggestion.')}`],
    [L('মাফ ও সমঝোতা', 'Forgiving and agreements'), `<p>${L('"মেটানো" ট্যাবের নিচে। কেউ দিতে না পারলে বা বেশি দিয়ে ফেরত না নিতে চাইলে বন্ধুরা যা ঠিক করেছে তা লিখে "চূড়ান্ত" করুন। চূড়ান্ত না করা পর্যন্ত হিসাব বদলায় না।', 'At the bottom of the Settle tab. Record what the group agreed and Finalize it; nothing changes until then.')}</p>
      ${ex('<b>উদাহরণ:</b> রাফির পাওনা ৳৮০০, সে ৳৩০০ নিতে চায় না। মূল ৳৮০০, মাফ ৳৩০০, বাকি পাওনা ৳৫০০। মাফ কোনো পরিশোধ নয়, নতুন খরচও নয়।', '<b>Example:</b> Rafi is owed ৳800 and gives up ৳300. Original ৳800, forgiven ৳300, still owed ৳500. A waiver is not a payment and not a new expense.')}`],
    [L('প্রতিজনের পুরো হিসাব', 'Each person\'s full statement'), `<p>${L('হোমে বন্ধুর নামে ট্যাপ করলে তার প্রতিটা খরচ, টাকা দেওয়া-নেওয়া আর চলতি ব্যালেন্স ১ টাকা পর্যন্ত দেখায়। কপি বা WhatsApp-এ তাকে পাঠানো যায়।', 'Tap a friend on Home to see every expense, payment and the running balance to the last taka. Copy it or send it on WhatsApp.')}</p>`],
    [L('রিপোর্ট, PDF আর ব্যাকআপ', 'Reports, PDF and backup'), ul([
      L('<b>হলুদ কার্ডে ট্যাপ:</b> পুরো হিসাব এক সিরিয়ালে।', '<b>Tap the yellow card:</b> everything in order.'),
      L('<b>📄 PDF:</b> ফাইল নিজে নেমে যায়, পরে বন্ধুকে পাঠানো যায়।', '<b>📄 PDF:</b> downloads a file you can send later.'),
      L('<b>📋 ছোট কপি:</b> শুধু "কে কাকে কত", টাকা দেওয়ার সময় কাজে লাগে।', '<b>📋 Short copy:</b> just "who pays whom", handy when paying.'),
      L('<b>আরও → ব্যাকআপ:</b> রসিদের ছবিসহ আলাদা ফাইলে। ফোন বদলালে ফেরত আনা যায়, ডুপ্লিকেট হয় না।', '<b>More → Back up:</b> a separate file with receipt photos. Restore on a new phone, no duplicates.'),
    ])],
    [L('অ্যাপ নিজে কী মনে করিয়ে দেয়', 'What the app reminds you about'), `<p>${L('হোমে "🔔 আপনার নজরে" কার্ডে: কে এখনও কিছু দেয়নি, কে পরের বিলে দেবে বলেছে, বাজেট বেশি হলে, জমা টাকায় ঘাটতি, হিসাবে সমস্যা। প্রতিটার পাশে সরাসরি করার বাটন আছে।', 'The "🔔 Needs your attention" card on Home lists who has not paid, who said they will pay next time, budget overruns, a pool shortfall and any problem in the books, each with a button to act on it.')}</p>`],
  ];
  return `${sheetHead(L('পূর্ণ গাইড', 'Full guide'), L('প্রতিটা হিসাব উদাহরণসহ', 'Every calculation with an example'))}
    <div class="guide">${sections.map(([t, body], i) => `<details class="gd" ${i === 0 ? 'open' : ''}><summary><span class="sn">${i + 1}</span><b>${t}</b>${icon('chev', 18)}</summary><div class="gbody">${body}</div></details>`).join('')}</div>
    <p class="hint">${L('সব ডেটা শুধু আপনার ফোনে থাকে। ভুল হলে নিচে "ফিরিয়ে আনুন" আসে।', 'All data stays on your phone. If you slip, an Undo appears at the bottom.')}</p>`;
}

const HG_ALL_TABS = [
    { id: 'home', icon: 'home', label: () => L('হোম', 'Home'), view: ({ ev, c }) => hgHomeTab(ev, c) },
    { id: 'people', icon: 'users', label: () => hgTerm(hgCur()).tab, view: ({ ev, c }) => hgPeopleTab(ev, c) },
    { id: 'expenses', icon: 'receipt', label: () => L('খরচ', 'Expenses'), view: ({ ev, c }) => hgExpensesTab(ev, c) },
    { id: 'settle', icon: 'check', label: () => L('মেটানো', 'Settle'), view: ({ ev, c }) => hgSettleTab(ev, c) },
    { id: 'more', icon: 'grid', label: () => L('আরও', 'More'), view: ({ ev, c }) => hgMoreTab(ev, c) },
];
registerModule({
  id: 'hangout',
  icon: 'users',
  emoji: '🧑‍🤝‍🧑',
  short: () => L('আড্ডা', 'Hangout'),
  name: () => L('আড্ডা ও যৌথ খরচ', 'Hangout & Group Expenses'),
  tagline: () => L('বন্ধুদের সাথে খাওয়া, ভ্রমণ, পিকনিক: কে কত দিল, কে কাকে দেবে', 'Meals, trips, picnics: who paid, who owes whom'),
  migrate: hangoutMigrate,
  hasData: s => !!(s.hangout && Array.isArray(s.hangout.events) && s.hangout.events.some(e => !e.del && !e.demo)),
  imageIds: () => hgReceiptKeys(),
  backupSummary: s => (s.hangout && Array.isArray(s.hangout.events) ? L(`${cnt(s.hangout.events.length)} Hangout ইভেন্ট`, `${s.hangout.events.length} hangout event(s)`) : ''),
  ready: () => hgEvents().length > 0,
  welcome: hgWelcome,
  context: () => { const ev = hgCur(); return { ev, c: hgEventCalc(ev) }; },
  topbar: hgTopbar,
  guide: hgGuideSheet,
  get tabs() {
    const ev = hgCur(), t = HG_ALL_TABS;
    if (!hgSolo(ev)) return t;
    return t.filter(x => x.id !== 'settle' || hgActive(ev).length > 1);
  },
});

function hgWhereMemo(ev, c) {
  const cats = hgCatsSorted(c.catTotals).slice(0, 8);
  if (!cats.length) return '';
  const t = (head, body) => `<table class="rt"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  const rows = ev.participants.map(p => `<tr><td>${hgEsc(p.name)}${p.joinedOn ? `<br><span class="sm">${hgEsc(hgDayLabel(ev, p.joinedOn))} ${L('থেকে', 'onward')}</span>` : ''}</td>${cats.map(([k]) => `<td class="n">${c.byPersonCat[p.id][k] ? hgM(c.byPersonCat[p.id][k]) : '—'}</td>`).join('')}<td class="n"><b>${hgM(c.share[p.id])}</b></td></tr>`).join('');
  const days = c.days.length > 1 ? `<h4>${L('দিন অনুযায়ী খরচ', 'Day by day')}</h4>` + t([L('দিন', 'Day'), L('তারিখ', 'Date'), L('খরচ', 'Items'), L('বড় খাত', 'Main categories'), L('মোট', 'Total')],
    c.days.map(d => `<tr><td>${hgEsc(hgDayLabel(ev, d))}</td><td>${d ? fmtDate(d) : ''}</td><td class="n">${c.byDay[d].count}</td><td>${hgCatsSorted(c.byDay[d].byCat).slice(0, 3).map(([k, v]) => hgEsc(hgCatLabel(ev, k)) + ' ' + hgM(v)).join(', ')}</td><td class="n">${hgM(c.byDay[d].total)}</td></tr>`).join('')) : '';
  return `<h3>${L('টাকা কোথায় গেল', 'Where the money went')}</h3>${t([L('খাত', 'Category'), L('মোট', 'Total'), '%'], hgCatsSorted(c.catTotals).map(([k, v]) => `<tr><td>${hgEsc(hgCatLabel(ev, k))}</td><td class="n">${hgM(v)}</td><td class="n">${pct(v / (c.net || 1) * 100)}</td></tr>`).join(''))}
    <h4>${L('কে কোন খাতে কত বহন করেছে', 'What each person carried, by category')}</h4>${t([L('নাম', 'Name')].concat(cats.map(([k]) => hgEsc(hgCatLabel(ev, k)))).concat(L('মোট ভাগ', 'Share')), rows)}${days}`;
}
// সবচেয়ে ছোট কপি: কাকে কাকে কত দিতে হবে, টাকা দেওয়ার সময় সরাসরি কাজে লাগে
function hgShortText(ev) {
  const c = hgEventCalc(ev), lines = [`${ev.name}: ${hgM(c.net)}`];
  if (c.suggestions.length) c.suggestions.forEach(s => lines.push(`${pName(ev, s.from)} -> ${pName(ev, s.to)}: ${hgM(s.amt)}`));
  else lines.push(c.gross ? L('সবার হিসাব মিটে গেছে', 'Everyone is even') : L('এখনও কোনো খরচ নেই', 'No expenses yet'));
  return lines.join('\n');
}
Object.assign(ACTIONS, {
  'hg-copy-short': async () => { const ev = hgCur(); if (ev) toast((await hgCopy(hgShortText(ev))) ? L('কপি হয়েছে, পেস্ট করে পাঠান', 'Copied, paste and send') : L('কপি করা যায়নি', 'Could not copy')); },
});
