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
    <p class="hint">${L('PDF: খোলা পেজ থেকে প্রিন্ট ডায়ালগে "PDF হিসেবে সেভ" বাছুন। মোবাইল ও ডেস্কটপ দুটোতেই চলে।', 'PDF: in the print dialog choose "Save as PDF". Works on mobile and desktop.')}</p>
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
  'hg-rep-print': () => { const ev = hgCur(); if (!ev) return; hgOpenPrint(hgRepKind === 'slip' ? hgSlipHtml(ev) : hgMemoHtml(ev), `${ev.name} ${hgRepKind === 'slip' ? 'summary' : 'memo'}`); },
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
  hg().events.forEach(ev => ev.expenses.forEach(e => { if (e.receipt) out.push('hgr:' + e.receipt); }));
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
  const s = [
    ['👥', L('বন্ধুদের নাম দিন', 'Add your friends'), L('ইভেন্ট খুলে কারা ছিল লিখুন।', 'Open an event and type who was there.')],
    ['🧾', L('খরচ লিখুন', 'Add expenses'), L('কত টাকা, কে দিল, কাদের মধ্যে ভাগ: ৩টা প্রশ্ন, ব্যস।', 'How much, who paid, who shares: three questions.')],
    ['🍽️', L('রেস্টুরেন্ট বিল', 'Restaurant bill'), L('প্রতিটা খাবারে ট্যাপ করে বলুন কে খেয়েছে। ভ্যাট, ডিসকাউন্ট নিজে ভাগ হয়।', 'Tap who had each dish. VAT and discount are split for you.')],
    ['🤝', L('মেটানো', 'Settle up'), L('"কে কাকে দেবে" দেখুন। টাকা দিলে "দিয়েছে ✓" চাপুন।', 'See who pays whom. Tap "Paid ✓" once it is done.')],
    ['📤', L('শেয়ার', 'Share'), L('হলুদ কার্ডে ট্যাপ করলে পুরো হিসাব, আর এক ট্যাপে WhatsApp-এ পাঠানো যায়।', 'Tap the yellow card for the full breakdown; send it on WhatsApp in one tap.')],
  ];
  return `${sheetHead(L('৫টা ধাপে সব', 'Everything in 5 steps'), L('পড়তে এক মিনিট', 'One minute to read'))}
    <div class="quickguide">${s.map(([e, t, d]) => `<div class="qg"><span class="qg-e">${e}</span><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>
    <p class="hint">${L('ভুল হলে নিচে "ফিরিয়ে আনুন" আসে। সব ডেটা শুধু আপনার ফোনে থাকে।', 'If you slip, an Undo appears at the bottom. All data stays on your phone.')}</p>`;
}

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
  tabs: [
    { id: 'home', icon: 'home', label: () => L('হোম', 'Home'), view: ({ ev, c }) => hgHomeTab(ev, c) },
    { id: 'people', icon: 'users', label: () => L('বন্ধুরা', 'Friends'), view: ({ ev, c }) => hgPeopleTab(ev, c) },
    { id: 'expenses', icon: 'receipt', label: () => L('খরচ', 'Expenses'), view: ({ ev, c }) => hgExpensesTab(ev, c) },
    { id: 'settle', icon: 'check', label: () => L('মেটানো', 'Settle'), view: ({ ev, c }) => hgSettleTab(ev, c) },
    { id: 'more', icon: 'grid', label: () => L('আরও', 'More'), view: ({ ev, c }) => hgMoreTab(ev, c) },
  ],
});
