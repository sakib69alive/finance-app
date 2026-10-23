'use strict';

/* =========================================================
   রিয়েল এস্টেট (বাকি অংশ, Finance_App_Spec.pdf অনুযায়ী): অ্যাকাউন্ট, বাজেট, স্টক, নির্মাণ, লিড, মালিক, ভেন্ডর,
   কিস্তি, অ্যাডজাস্টমেন্ট, খরচ ভাগের পেমেন্ট/জরিমানা, রিপোর্ট, সতর্কতা, অডিট লগ, CSV।
   হিসাব সব js/realestate-calc.js-এ; এখানে শুধু স্ক্রিন ও ফর্ম। realestate.js-এর পরে লোড হয়।
   ========================================================= */

Object.assign(ICONS, {
  alert: '<path d="M12 4 2.8 20h18.4L12 4Z"/><path d="M12 10v4.5M12 17.6h.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
});

const reProjId = () => (re().projects[0] || {}).id || '';
const reAcctOpts = () => [['', L('— অ্যাকাউন্ট নেই —', '— no account —')]].concat(re().accounts.map(a => [a.id, esc(a.name)]));
const reNone = [['', L('— নেই —', '— none —')]];
const reBar = (p, level) => `<div class="bbar"><span class="${level === 'critical' ? 'over' : ''}" style="--c:${level === 'warn' ? 'var(--warn)' : 'var(--accent)'};width:${clamp(p, 0, 100).toFixed(1)}%"></span></div>`;
const reLvlTxt = l => (l === 'critical' ? L('সীমা ছাড়িয়েছে', 'Over limit') : l === 'warn' ? L('সীমার কাছে', 'Near limit') : '');
const reFormShell = (title, form, body, del) => `${sheetHead(title)}<form data-form="${form}" autocomplete="off">${body}</form>${del || ''}`;
const reDelBtn = (action, id) => `<button type="button" class="btn danger block mt8" data-action="${action}" data-id="${id}">${icon('trash', 16)} ${L('ডিলিট', 'Delete')}</button>`;
const reHid = (n, v) => `<input type="hidden" name="${n}" value="${esc(v || '')}">`;
const reDateOnly = (name, val) => `<input class="input" type="date" name="${name}" value="${esc(val || '')}">`;
const reById2 = (k, id) => (re()[k] || []).find(x => x.id === id);
const reRm = (k, id) => { re()[k] = re()[k].filter(x => x.id !== id); };

/* ---------- সতর্কতা (হোম) ---------- */
function reAlertsCard() {
  const al = reAlerts(re());
  if (!al.length) return '';
  const row = a => {
    let t, act, ref = a.ref;
    if (a.kind === 'budget') { const b = reById2('budgets', a.ref); t = `${b.category ? reN(RE_CATS, b.category) : L('মোট বাজেট', 'Total budget')}: ${Math.round(a.pct)}% (${reLvlTxt(a.level)})`; act = 're-goto-money'; ref = 'budget'; }
    else if (a.kind === 'inst') { const s = reById2('sales', a.ref); t = `${L('কিস্তি সময়-পার', 'Instalment overdue')} · ${reSaleLabel(s)}`; act = 're-sale'; }
    else if (a.kind === 'share') { const sh = reById2('shares', a.ref), p = sh.parts.find(x => x.id === a.part); t = `${L('অবদান সময়-পার', 'Contribution overdue')} · ${sh.title} · ${reCustName(p.customerId)}`; act = 're-share'; }
    else { const m = reById2('materials', a.ref); t = `${L('স্টক কম', 'Low stock')} · ${m.name} (${a.amt} ${esc(m.unit || '')})`; act = 're-goto-money'; ref = 'stock'; }
    return `<button type="button" class="brow-top" data-action="${act}" data-id="${esc(ref)}" data-v="${esc(ref)}" style="width:100%;padding:6px 0"><span class="grow" style="text-align:left">${a.level === 'critical' ? '🔴' : '🟠'} ${esc(t)}</span>${a.kind === 'stock' ? '' : `<span class="amt ${a.level === 'critical' ? 'neg' : ''}">${a.kind === 'budget' ? '' : reM(a.amt)}</span>`}</button>`;
  };
  return `<section class="card attn"><div class="card-head"><h2>${icon('alert', 18)} ${L('সতর্কতা', 'Alerts')} (${al.length})</h2></div>${al.slice(0, 8).map(row).join('')}</section>`;
}

/* ---------- অ্যাকাউন্ট ও অন্য আয় ---------- */
const RE_ACCT_T = { cash: ['নগদ', 'Cash', '💵'], bank: ['ব্যাংক', 'Bank', '🏦'], wallet: ['মোবাইল ওয়ালেট', 'Wallet', '📱'] };
function reAcctBody() {
  const d = re(), rows = reAccountBalances(d), total = reSum(rows.map(r => r.balance));
  const un = reSum(d.pays.filter(p => !p.void && !p.accountId).map(p => p.amt)) + reSum(d.costs.filter(c => reCostPaid(c) && !c.accountId).map(c => c.amount));
  return `${rows.length ? `<section class="card"><div class="card-head"><h2>${L('মোট ব্যালেন্স', 'Total balance')}</h2><b class="${total < 0 ? 'neg' : ''}">${reM(total)}</b></div>
      <div class="list" style="box-shadow:none;border:0">${rows.map(r => `<div class="lwrap"><button type="button" class="lrow" data-action="re-acct" data-id="${r.account.id}"><span class="lic">${(RE_ACCT_T[r.account.type] || RE_ACCT_T.cash)[2]}</span><span class="lmain"><b>${esc(r.account.name)}</b><small>${L('শুরুতে', 'Opening')} ${reM(r.account.opening)} · +${reM(r.inn)} · −${reM(r.out)}</small></span><span class="lend"><b class="${r.balance < 0 ? 'neg' : ''}">${reM(r.balance)}</b></span></button>${rowTools('re-acct', 're-acct-del', r.account.id)}</div>`).join('')}</div></section>`
    : empty('🏦', L('কোনো অ্যাকাউন্ট নেই', 'No accounts'), `<p class="hint">${L('নগদ, ব্যাংক বা বিকাশ/নগদ অ্যাকাউন্ট যোগ করুন। পেমেন্ট ও খরচে অ্যাকাউন্ট বাছলে ব্যালেন্স নিজে থেকে বদলাবে।', 'Add cash, bank or wallet accounts. Pick one on payments and costs and the balance updates itself.')}</p>`)}
    ${un ? `<p class="hint">${L('কোনো অ্যাকাউন্টে যুক্ত না করা লেনদেন', 'Moves not linked to an account')}: ${reM(un)}</p>` : ''}
    <div class="section-title">${L('অন্য আয় (বিক্রির বাইরে)', 'Other income')}<button type="button" class="link" style="float:right" data-action="re-inc-add">＋ ${L('আয়', 'Income')}</button></div>
    ${d.incomes.length ? `<div class="list">${d.incomes.slice().sort(byDateDesc).map(i => `<div class="lwrap"><button type="button" class="lrow" data-action="re-inc" data-id="${i.id}"><span class="lic">➕</span><span class="lmain"><b>${esc(i.title || L('আয়', 'Income'))}</b><small>${fmtDate(i.date)} · ${reN(RE_COST_ST, i.status || 'completed')}</small></span><span class="lend"><b class="pos">${reM(i.amount)}</b></span></button>${rowTools('re-inc', 're-inc-del', i.id)}</div>`).join('')}</div>` : `<p class="hint">${L('কোনো অন্য আয় নেই।', 'No other income.')}</p>`}`;
}
const reAcctForm = a => { a = a || {}; return reFormShell(a.id ? L('অ্যাকাউন্ট বদলান', 'Edit account') : L('নতুন অ্যাকাউন্ট', 'New account'), 're-acct', `${reHid('id', a.id)}
  ${reF(L('নাম', 'Name'), reTxt('name', a.name, L('যেমন ক্যাশ বক্স, ডাচ-বাংলা', 'e.g. Cash box, DBBL')))}${reF(L('ধরন', 'Type'), reSel('type', reOpts(RE_ACCT_T), a.type || 'cash'))}
  ${reF(L('শুরুর ব্যালেন্স', 'Opening balance'), moneyInput('opening', a.opening || ''))}${reSubmit()}`, a.id ? reDelBtn('re-acct-del', a.id) : ''); };
const reIncForm = i => { i = i || {}; return reFormShell(i.id ? L('আয় বদলান', 'Edit income') : L('নতুন অন্য আয়', 'New other income'), 're-inc', `${reHid('id', i.id)}
  ${reF(L('বিবরণ', 'Description'), reTxt('title', i.title))}${reF(L('টাকা', 'Amount'), moneyInput('amount', i.amount || ''))}${reF(L('তারিখ', 'Date'), reDate('date', i.date))}
  ${reF(L('অ্যাকাউন্ট', 'Account'), reSel('accountId', reAcctOpts(), i.accountId || ''))}${reF(L('অবস্থা', 'Status'), reSel('status', reOpts(RE_COST_ST), i.status || 'completed'))}${reSubmit()}`, i.id ? reDelBtn('re-inc-del', i.id) : ''); };

/* ---------- বাজেট ---------- */
function reBudgetBody() {
  const d = re(), rows = d.budgets.map(b => reBudgetRow(d, b));
  if (!rows.length) return empty('🎯', L('কোনো বাজেট নেই', 'No budgets'), `<p class="hint">${L('মোট বা খাত অনুযায়ী বাজেট ঠিক করুন। আসল খরচ (শুধু যাচাই/সম্পন্ন) এর সাথে নিজে মিলবে; ৮০%-এ সতর্ক, ১০০%-এ জরুরি।', 'Set a total or per-category budget. It is compared with the live actual (verified/completed only); warns at 80%, critical at 100%.')}</p>`);
  return rows.map(r => `<section class="card"><div class="card-head"><h2>${r.budget.category ? (RE_CATS[r.budget.category] || RE_CATS.other)[2] + ' ' + esc(reN(RE_CATS, r.budget.category)) : '🎯 ' + L('মোট বাজেট', 'Total budget')}</h2><button type="button" class="link" data-action="re-bud" data-id="${r.budget.id}">${L('বদলান', 'Edit')}</button></div>
    ${reBar(r.pct, r.level)}<div class="brow-meta"><span>${L('আসল (লাইভ)', 'Actual (live)')} ${reM(r.actual)} / ${reM(r.budget.amount)}</span><span class="${r.level === 'ok' ? 'ok' : 'bad'}">${r.variance >= 0 ? reM(r.variance) + ' ' + L('বাকি', 'left') : reM(-r.variance) + ' ' + L('বেশি', 'over')}</span></div>
    ${r.level !== 'ok' ? `<div class="hint">${r.level === 'critical' ? '🔴' : '🟠'} ${reLvlTxt(r.level)} · ${Math.round(r.pct)}%</div>` : ''}</section>`).join('');
}
const reBudForm = b => { b = b || {}; return reFormShell(b.id ? L('বাজেট বদলান', 'Edit budget') : L('নতুন বাজেট', 'New budget'), 're-bud', `${reHid('id', b.id)}
  ${reF(L('খাত', 'Category'), reSel('category', [['', L('সব খাত মিলিয়ে (মোট)', 'All categories (total)')]].concat(reOpts(RE_CATS)), b.category || ''))}
  ${reF(L('বাজেটের টাকা', 'Budget amount'), moneyInput('amount', b.amount || ''))}${reF(L('সতর্কতার সীমা (%)', 'Warning at (%)'), reNum('warn', b.warn || 80, '80'))}${reSubmit()}`, b.id ? reDelBtn('re-bud-del', b.id) : ''); };

/* ---------- স্টক ও ক্রয় ---------- */
function reStockBody() {
  const rows = reStock(re());
  if (!rows.length) return empty('📦', L('কোনো মালামাল নেই', 'No materials'), `<p class="hint">${L('মালামাল (সিমেন্ট, রড…) যোগ করে ক্রয় আর ব্যবহার লিখুন। স্টক = মোট ক্রয় − মোট ব্যবহার; সীমার নিচে নামলে সতর্ক করবে।', 'Add materials (cement, rods…) then log purchases and usage. Stock = purchases − usage; you get an alert below the threshold.')}</p>`);
  return `<div class="list">${rows.map(r => `<div class="lwrap"><button type="button" class="lrow" data-action="re-mat" data-id="${r.material.id}"><span class="lic">📦</span><span class="lmain"><b>${esc(r.material.name)}</b><small>${L('ঢুকেছে', 'In')} ${r.inn} · ${L('ব্যবহার', 'Used')} ${r.out}${r.material.threshold ? ' · ' + L('সীমা ', 'min ') + r.material.threshold : ''}</small></span><span class="lend"><b class="${r.low ? 'neg' : ''}">${r.have} ${esc(r.material.unit || '')}</b>${r.low ? `<small class="neg">${L('কম', 'low')}</small>` : ''}</span></button>${rowTools('re-mat-edit', 're-mat-del', r.material.id)}</div>`).join('')}</div>`;
}
function reMatSheet(m) {
  const d = re(), buys = d.purchases.filter(p => p.materialId === m.id).sort(byDateDesc), uses = d.usage.filter(u => u.materialId === m.id).sort(byDateDesc), r = reStock(d).find(x => x.material.id === m.id);
  return `${sheetHead(m.name, `${L('স্টকে', 'On hand')} ${r.have} ${esc(m.unit || '')}${r.low ? ' · ' + L('কম', 'low') : ''}`)}
    <div class="btn-row"><button type="button" class="btn primary" data-action="re-buy-add" data-id="${m.id}">${icon('plus', 16)} ${L('ক্রয়', 'Purchase')}</button><button type="button" class="btn" data-action="re-use-add" data-id="${m.id}">${icon('plus', 16)} ${L('ব্যবহার', 'Usage')}</button></div>
    <div class="section-title">${L('ক্রয় (ঢোকা)', 'Purchases (IN)')}</div>${buys.length ? buys.map(p => `<div class="hg-day"><span><b>${p.qty} × ${reM(p.rate)} = ${reM(reBuyTotal(p))}</b><small>${fmtDate(p.date)}${p.vendorId ? ' · ' + esc((reById2('vendors', p.vendorId) || {}).name || '') : ''} · ${reN(RE_COST_ST, p.status || 'completed')}</small></span><button type="button" class="link" data-action="re-buy-del" data-id="${p.id}">${L('মুছুন', 'Delete')}</button></div>`).join('') : `<p class="hint">—</p>`}
    <div class="section-title">${L('ব্যবহার (বেরোনো)', 'Usage (OUT)')}</div>${uses.length ? uses.map(u => `<div class="hg-day"><span><b>${u.qty} ${esc(m.unit || '')}</b><small>${fmtDate(u.date)}${u.note ? ' · ' + esc(u.note) : ''}</small></span><button type="button" class="link" data-action="re-use-del" data-id="${u.id}">${L('মুছুন', 'Delete')}</button></div>`).join('') : `<p class="hint">—</p>`}
    <div class="btn-row mt12"><button type="button" class="btn" data-action="re-mat-edit" data-id="${m.id}">${icon('edit', 16)} ${L('বদলান', 'Edit')}</button><button type="button" class="btn danger" data-action="re-mat-del" data-id="${m.id}">${icon('trash', 16)} ${L('ডিলিট', 'Delete')}</button></div>`;
}
const reMatForm = m => { m = m || {}; return reFormShell(m.id ? L('মালামাল বদলান', 'Edit material') : L('নতুন মালামাল', 'New material'), 're-mat', `${reHid('id', m.id)}
  ${reF(L('নাম', 'Name'), reTxt('name', m.name))}${reF(L('একক (বস্তা, কেজি…)', 'Unit (bag, kg…)'), reTxt('unit', m.unit))}${reF(L('কম-স্টকের সীমা', 'Low-stock threshold'), reNum('threshold', m.threshold))}${reSubmit()}`); };
const reBuyForm = mid => reFormShell(L('নতুন ক্রয়', 'New purchase'), 're-buy', `${reHid('materialId', mid)}
  ${reF(L('ভেন্ডর', 'Vendor'), reSel('vendorId', reNone.concat(re().vendors.map(v => [v.id, esc(v.name)])), ''))}${reF(L('পরিমাণ', 'Quantity'), reNum('qty', ''))}${reF(L('দর (প্রতি একক)', 'Rate per unit'), moneyInput('rate', ''))}
  ${reF(L('তারিখ', 'Date'), reDate('date', ''))}${reF(L('অ্যাকাউন্ট', 'Account'), reSel('accountId', reAcctOpts(), ''))}${reF(L('অবস্থা', 'Status'), reSel('status', reOpts(RE_COST_ST), 'completed'))}
  <p class="hint">${L('শুধু যাচাই/সম্পন্ন ক্রয় আসল খরচে ধরা হয়। স্টকে বাতিল/প্রত্যাখ্যাত বাদে সব ঢোকে।', 'Only verified/completed purchases count as cost. Stock counts everything except cancelled/rejected.')}</p>${reSubmit()}`);
const reUseForm = mid => reFormShell(L('ব্যবহার লিখুন', 'Log usage'), 're-use', `${reHid('materialId', mid)}
  ${reF(L('পরিমাণ', 'Quantity'), reNum('qty', ''))}${reF(L('তারিখ', 'Date'), reDate('date', ''))}${reF(L('নোট (কোথায় লাগল)', 'Note (where used)'), reTxt('note', ''))}${reSubmit()}`);

/* ---------- নির্মাণ: ফেজ ও টাস্ক ---------- */
function reBuildBody() {
  const d = re();
  if (!d.phases.length) return empty('🏗️', L('কোনো ফেজ নেই', 'No phases'), `<p class="hint">${L('ফাউন্ডেশন, স্ট্রাকচার, ফিনিশিং… ফেজ বানিয়ে টাস্কে অগ্রগতি % দিন। ফেজের আসল খরচ খরচের লেনদেন থেকে নিজে আসে।', 'Create phases (foundation, structure, finishing…) and set % progress on tasks. A phase\'s actual cost comes from real transactions.')}</p>`);
  const all = d.phases.map(p => rePhaseProgress(d, p)), overall = all.length ? Math.round(reSum(all) / all.length) : 0;
  return `<section class="card"><div class="card-head"><h2>${L('মোট অগ্রগতি', 'Overall progress')}</h2><b>${overall}%</b></div>${reBar(overall)}</section>` + d.phases.map(p => {
    const tasks = d.tasks.filter(t => t.phaseId === p.id), pr = rePhaseProgress(d, p), cost = reActualCost(d, { phaseId: p.id });
    return `<section class="card"><div class="card-head"><h2>${esc(p.name)}</h2><button type="button" class="link" data-action="re-phase" data-id="${p.id}">${L('বদলান', 'Edit')}</button></div>
      ${reBar(pr)}<div class="brow-meta"><span>${pr}%</span><span>${L('আসল খরচ', 'Actual cost')} ${reM(cost)}</span></div>
      ${tasks.map(t => `<div class="hg-day"><button type="button" class="link" style="text-align:left" data-action="re-task" data-id="${t.id}">${esc(t.name)}</button><b>${t.progress}%</b></div>`).join('')}
      <button type="button" class="btn sm mt8" data-action="re-task-add" data-id="${p.id}">${icon('plus', 16)} ${L('টাস্ক', 'Task')}</button></section>`;
  }).join('');
}
const rePhaseForm = p => { p = p || {}; return reFormShell(p.id ? L('ফেজ বদলান', 'Edit phase') : L('নতুন ফেজ', 'New phase'), 're-phase', `${reHid('id', p.id)}${reF(L('নাম', 'Name'), reTxt('name', p.name, L('যেমন ফাউন্ডেশন', 'e.g. Foundation')))}${reSubmit()}`, p.id ? reDelBtn('re-phase-del', p.id) : ''); };
const reTaskForm = (t, phaseId) => { t = t || {}; return reFormShell(t.id ? L('টাস্ক বদলান', 'Edit task') : L('নতুন টাস্ক', 'New task'), 're-task', `${reHid('id', t.id)}${reHid('phaseId', t.phaseId || phaseId)}
  ${reF(L('নাম', 'Name'), reTxt('name', t.name))}${reF(L('অগ্রগতি (০–১০০%)', 'Progress (0–100%)'), reNum('progress', t.progress || '', '0'))}${reSubmit()}`, t.id ? reDelBtn('re-task-del', t.id) : ''); };

/* ---------- লিড, মালিক, ভেন্ডর ---------- */
const RE_LEAD_ST = { new: ['নতুন', 'New'], contacted: ['যোগাযোগ হয়েছে', 'Contacted'], visit: ['সাইট ভিজিট', 'Site visit'], negotiating: ['দরদাম', 'Negotiating'], won: ['কনভার্টেড', 'Won'], lost: ['হারানো', 'Lost'] };
const RE_OWNER_K = { shareholder: ['শেয়ারহোল্ডার', 'Shareholder', '💼'], landowner: ['জমিমালিক', 'Landowner', '🌱'] };
function reLeadsBody() {
  const l = re().leads.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!l.length) return empty('📞', L('কোনো লিড নেই', 'No leads'), `<p class="hint">${L('সম্ভাব্য ক্রেতার নাম, আগ্রহ আর ফলো-আপ লিখুন। রাজি হলে এক ট্যাপে ক্রেতা বানান।', 'Track prospects, their interest and follow-ups. Convert to a buyer in one tap.')}</p>`);
  return `<div class="list">${l.map(x => `<div class="lwrap"><button type="button" class="lrow" data-action="re-lead" data-id="${x.id}"><span class="lic">📞</span><span class="lmain"><b>${esc(x.name)}</b><small>${esc([x.phone, x.source, reUnitName(x.unitId)].filter(Boolean).join(' · '))}</small></span><span class="lend"><small>${reN(RE_LEAD_ST, x.status)}</small>${x.followUp ? `<small class="${x.followUp < today() && x.status !== 'won' && x.status !== 'lost' ? 'neg' : ''}">${fmtDate(x.followUp)}</small>` : ''}</span></button>${rowTools('re-lead-edit', 're-lead-del', x.id)}</div>`).join('')}</div>`;
}
function reLeadSheet(x) {
  return `${sheetHead(x.name, `${reN(RE_LEAD_ST, x.status)}${x.phone ? ' · ' + esc(x.phone) : ''}`)}
    ${x.note ? `<p class="hint">${esc(x.note)}</p>` : ''}${x.followUp ? reRow(L('পরের ফলো-আপ', 'Next follow-up'), fmtDate(x.followUp)) : ''}
    <div class="section-title">${L('কার্যক্রম (কল, ভিজিট, নোট)', 'Activity (calls, visits, notes)')}</div>
    ${(x.activities || []).slice().reverse().map(a => `<div class="hg-day"><span><b>${esc(a.text)}</b><small>${fmtDate(a.date)} · ${esc(a.kind)}</small></span></div>`).join('') || `<p class="hint">—</p>`}
    <form data-form="re-lead-act" autocomplete="off" class="mt8">${reHid('id', x.id)}${reF(L('ধরন', 'Kind'), reSel('kind', [['call', L('কল', 'Call')], ['visit', L('ভিজিট', 'Visit')], ['note', L('নোট', 'Note')]], 'call'))}${reF(L('বিবরণ', 'Details'), reTxt('text', ''))}${reF(L('পরের ফলো-আপ (ঐচ্ছিক)', 'Next follow-up (optional)'), reDateOnly('followUp', ''))}<button class="btn block" type="submit">${L('কার্যক্রম যোগ', 'Add activity')}</button></form>
    ${x.customerId ? '' : `<button type="button" class="btn primary block mt8" data-action="re-lead-convert" data-id="${x.id}">${L('ক্রেতা বানান (কনভার্ট)', 'Convert to buyer')}</button>`}
    <div class="btn-row mt12"><button type="button" class="btn" data-action="re-lead-edit" data-id="${x.id}">${icon('edit', 16)} ${L('বদলান', 'Edit')}</button><button type="button" class="btn danger" data-action="re-lead-del" data-id="${x.id}">${icon('trash', 16)} ${L('ডিলিট', 'Delete')}</button></div>`;
}
const reLeadForm = x => { x = x || {}; return reFormShell(x.id ? L('লিড বদলান', 'Edit lead') : L('নতুন লিড', 'New lead'), 're-lead', `${reHid('id', x.id)}
  ${reF(L('নাম', 'Name'), reTxt('name', x.name))}${reF(L('ফোন', 'Phone'), reTxt('phone', x.phone))}${reF(L('উৎস (ফেসবুক, রেফারেল…)', 'Source (Facebook, referral…)'), reTxt('source', x.source))}
  ${reF(L('আগ্রহের ইউনিট', 'Interested unit'), reSel('unitId', reUnitOpts(), x.unitId || ''))}${reF(L('অবস্থা', 'Status'), reSel('status', reOpts(RE_LEAD_ST), x.status || 'new'))}${reF(L('নোট', 'Note'), reTxt('note', x.note))}${reSubmit()}`); };

function reOwnersBody() {
  const d = re();
  if (!d.owners.length) return empty('🌱', L('কোনো মালিক নেই', 'No owners'), `<p class="hint">${L('শেয়ারহোল্ডার বা জমিমালিক যোগ করুন (যেমন চুক্তি ৪০:৬০)। ইউনিটে "মালিক-বরাদ্দ" বা "জমিমালিকের অংশ" বেছে তাদের নাম দিন। একটা ইউনিট একসাথে দুজনের হয় না।', 'Add shareholders or landowners (e.g. a 40:60 deal). Mark units as owner-allocated or landowner share and pick the owner. A unit never belongs to two parties.')}</p>`);
  return `<div class="list">${d.owners.map(o => { const us = d.units.filter(u => u.ownerId === o.id);
    return `<div class="lwrap"><button type="button" class="lrow" data-action="re-owner" data-id="${o.id}"><span class="lic">${RE_OWNER_K[o.kind][2]}</span><span class="lmain"><b>${esc(o.name)}</b><small>${reN(RE_OWNER_K, o.kind)}${o.share ? ' · ' + esc(o.share) : ''}${us.length ? ' · ' + us.map(u => esc(u.number || u.name)).join(', ') : ''}</small></span></button>${rowTools('re-owner', 're-owner-del', o.id)}</div>`; }).join('')}</div>`;
}
const reOwnerForm = o => { o = o || {}; return reFormShell(o.id ? L('মালিক বদলান', 'Edit owner') : L('নতুন মালিক', 'New owner'), 're-owner', `${reHid('id', o.id)}
  ${reF(L('নাম', 'Name'), reTxt('name', o.name))}${reF(L('ধরন', 'Kind'), reSel('kind', reOpts(RE_OWNER_K), o.kind || 'landowner'))}${reF(L('ফোন', 'Phone'), reTxt('phone', o.phone))}
  ${reF(L('অংশ / চুক্তি (যেমন ৪০:৬০ বা ১৫%)', 'Share / deal (e.g. 40:60 or 15%)'), reTxt('share', o.share))}${reF(L('নোট (নগদ/অগ্রিম শর্ত)', 'Note (cash/advance terms)'), reTxt('note', o.note))}${reSubmit()}`, o.id ? reDelBtn('re-owner-del', o.id) : ''); };
function reVendorsBody() {
  const d = re();
  if (!d.vendors.length) return empty('🏪', L('কোনো ভেন্ডর নেই', 'No vendors'), '');
  return `<div class="list">${d.vendors.map(v => { const t = reSum(d.purchases.filter(p => p.vendorId === v.id && reCounts(p.status)).map(reBuyTotal));
    return `<div class="lwrap"><button type="button" class="lrow" data-action="re-vendor" data-id="${v.id}"><span class="lic">🏪</span><span class="lmain"><b>${esc(v.name)}</b><small>${esc(v.phone || '')}</small></span><span class="lend"><b>${reShort(t)}</b><small>${L('ক্রয়', 'bought')}</small></span></button>${rowTools('re-vendor', 're-vendor-del', v.id)}</div>`; }).join('')}</div>`;
}
const reVendorForm = v => { v = v || {}; return reFormShell(v.id ? L('ভেন্ডর বদলান', 'Edit vendor') : L('নতুন ভেন্ডর', 'New vendor'), 're-vendor', `${reHid('id', v.id)}${reF(L('নাম', 'Name'), reTxt('name', v.name))}${reF(L('ফোন', 'Phone'), reTxt('phone', v.phone))}${reSubmit()}`, v.id ? reDelBtn('re-vendor-del', v.id) : ''); };

/* ---------- কিস্তি (বিক্রির শিটে) ---------- */
function reInstSection(x) {
  const rows = reInstRows(re(), x, today());
  return `<div class="section-title">${L('কিস্তির সূচি', 'Instalment schedule')}</div>
    ${rows.length ? rows.map(r => `<div class="hg-day"><span><b>${reM(r.inst.amt)} · ${fmtDate(r.inst.due)}</b><small>${L('পেয়েছি', 'Paid')} ${reM(r.paid)}${r.out ? ' · ' + L('বাকি ', 'due ') + reM(r.out) : ''}</small></span>${reBadge(r.status)}</div>`).join('') + `<p class="hint">${L('পেমেন্ট পুরোনো কিস্তি থেকে আগে মেটে।', 'Payments settle the oldest instalment first.')}</p>` : `<p class="hint">${L('কিস্তির সূচি নেই।', 'No schedule yet.')}</p>`}
    <button type="button" class="btn sm" data-action="re-plan" data-id="${x.id}">${icon('plus', 16)} ${rows.length ? L('সূচি নতুন করে বানান', 'Rebuild schedule') : L('কিস্তির সূচি বানান', 'Make schedule')}</button>`;
}
const rePlanForm = x => reFormShell(L('কিস্তির সূচি', 'Instalment schedule'), 're-plan', `${reHid('id', x.id)}
  <p class="hint">${L('মোট বিক্রি দাম', 'Sale price')}: <b>${reM(x.price)}</b></p>
  ${reF(L('ডাউন পেমেন্ট', 'Down payment'), moneyInput('down', ''))}${reF(L('বাকি কয় মাসে (সমান কিস্তি)', 'Then how many monthly instalments'), reNum('n', '', '12'))}${reF(L('শুরুর তারিখ (ডাউন পেমেন্টের দিন)', 'Start date (down payment day)'), reDate('start', x.date))}
  <p class="hint">${L('আগের সূচি থাকলে বদলে যাবে।', 'Replaces any existing schedule.')}</p>${reSubmit()}`);

/* ---------- পেমেন্ট ও খরচের ফর্ম (অ্যাকাউন্ট সহ) ---------- */
function rePayForm(kind, ref) {
  let left = 0;
  if (kind === 'sale') left = reSaleRow(re(), reById('sales', ref)).due;
  if (kind === 'share') { const sh = re().shares.find(s => s.parts.some(p => p.id === ref)); left = sh ? (reShareRows(re(), sh).find(r => r.part.id === ref) || {}).totalDue : 0; }
  return reFormShell(L('টাকা পেলাম', 'Receive payment'), 're-pay', `${reHid('kind', kind)}${reHid('ref', ref)}
    ${reF(L('টাকা', 'Amount'), moneyInput('amt', left || ''))}${reF(L('তারিখ', 'Date'), reDate('date', ''))}${reF(L('মাধ্যম', 'Method'), reSel('method', reOpts(RE_METHOD), 'cash'))}
    ${reF(L('অ্যাকাউন্ট', 'Account'), reSel('accountId', reAcctOpts(), (re().accounts[0] || {}).id || ''))}${reF(L('নোট / রিসিট নম্বর', 'Note / receipt no.'), reTxt('note', ''))}${reSubmit()}`);
}
function reCostForm(c) {
  c = c || {};
  return reFormShell(c.id ? L('খরচ বদলান', 'Edit cost') : L('নতুন খরচ', 'New cost'), 're-cost', `${reHid('id', c.id)}
    ${reF(L('বিবরণ', 'Description'), reTxt('title', c.title, L('যেমন ৭ম তলা পর্যন্ত বিল', 'e.g. running bill to 7th floor')))}
    ${reF(L('খাত', 'Category'), reSel('category', reOpts(RE_CATS), c.category || 'contractor'))}${reF(L('টাকা', 'Amount'), moneyInput('amount', c.amount || ''))}${reF(L('তারিখ', 'Date'), reDate('date', c.date))}
    ${reF(L('ঠিকাদার (ঠিকাদার পেমেন্ট হলে)', 'Contractor (for contractor payments)'), reSel('contractorId', reNone.concat(re().contractors.map(k => [k.id, esc(reContrName(k.id))])), c.contractorId || ''))}
    ${reF(L('নির্মাণ ফেজ (ঐচ্ছিক)', 'Construction phase (optional)'), reSel('phaseId', reNone.concat(re().phases.map(p => [p.id, esc(p.name)])), c.phaseId || ''))}
    ${reF(L('মাধ্যম', 'Method'), reSel('method', reOpts(RE_METHOD), c.method || 'cash'))}${reF(L('অ্যাকাউন্ট', 'Account'), reSel('accountId', reAcctOpts(), c.accountId || (re().accounts[0] || {}).id || ''))}
    ${reF(L('অবস্থা', 'Status'), reSel('status', reOpts(RE_COST_ST), c.status || 'completed'))}
    <p class="hint">${L('শুধু "যাচাই করা" বা "সম্পন্ন" খরচ আসল হিসাব ও বাজেটে ধরা হয়। খসড়া/অপেক্ষমাণ/জমা দেওয়া ধরা হয় না।', 'Only "Verified" or "Completed" costs count in actuals and budgets. Draft/pending/submitted do not.')}</p>${reSubmit()}`, c.id ? reDelBtn('re-cost-del', c.id) : '');
}
const reShareForm = () => reFormShell(L('খরচ ভাগাভাগি (গোল)', 'Cost allocation (goal)'), 're-share', `
  ${reF(L('বিবরণ', 'Description'), reTxt('title', '', L('যেমন পাইলিং ও ফাউন্ডেশন', 'e.g. Piling & foundation')))}${reF(L('খাত', 'Category'), reSel('category', reOpts(RE_CATS), 'piling'))}${reF(L('মোট খরচ', 'Total cost'), moneyInput('total', ''))}
  ${reF(L('তারিখ', 'Date'), reDate('date', ''))}${reF(L('দেওয়ার শেষ তারিখ', 'Due date'), reDateOnly('due', ''))}
  ${reF(L('দেরির জরিমানা', 'Late fine'), reSel('fineType', [['', L('নেই', 'None')], ['flat', L('নির্দিষ্ট টাকা', 'Flat amount')], ['percentage', L('বাকির %', '% of outstanding')]], ''))}${reF(L('জরিমানার মান', 'Fine value'), reNum('fineValue', ''))}
  ${reF(L('অবস্থা', 'Status'), reSel('status', [['active', L('চালু', 'Active')], ['draft', L('খসড়া', 'Draft')]], 'active'))}
  <p class="hint">${L('এখনকার সব বিক্রি (যেগুলোর Sqft দেওয়া আছে) থেকে ক্রেতা ধরে Sqft অনুযায়ী ভাগ হবে।', 'Buyers come from all current sales that have square feet; the cost is split by sqft.')}</p>${reSubmit()}`);
const reAdjForm = partId => reFormShell(L('অ্যাডজাস্টমেন্ট', 'Adjustment'), 're-adj', `${reHid('partId', partId)}
  ${reF(L('টাকা (মাফ/ছাড় হলে মাইনাস, যেমন -5000)', 'Amount (negative for waiver/discount, e.g. -5000)'), `<input class="input" name="amt" inputmode="decimal" placeholder="-5000">`)}${reF(L('কারণ', 'Reason'), reTxt('note', ''))}
  <p class="hint">${L('মূল ভাগ বদলায় না; শুধু কার্যকর পাওনা (ভাগ + অ্যাডজাস্টমেন্ট) বদলায়।', 'The original share never changes; only the effective payable (share + adjustments) does.')}</p>${reSubmit()}`);
function reShareSheet(sh) {
  const d = re(), rows = reShareRows(d, sh, today()), gs = reGoalStatus(sh, rows, today()), pct = reGoalPct(rows);
  const GS = { draft: ['খসড়া', 'Draft'], cancelled: ['বাতিল', 'Cancelled'], archived: ['আর্কাইভ', 'Archived'], completed: ['সম্পন্ন', 'Completed'], 'fully-funded': ['পুরো তহবিল', 'Fully funded'], 'partially-funded': ['আংশিক তহবিল', 'Partially funded'], upcoming: ['আসছে', 'Upcoming'], active: ['চালু', 'Active'] };
  return `${sheetHead(sh.title, `${fmtDate(sh.date)}${sh.due ? ' · ' + L('শেষ তারিখ ', 'due ') + fmtDate(sh.due) : ''} · ${reN(GS, gs)}`)}
    ${reRow(L('মোট খরচ', 'Total cost'), reM(sh.total))}${reRow(L('কার্যকর পাওনা', 'Effective payable'), reM(reSum(rows.map(r => r.eff))))}${reRow(L('আদায়', 'Collected'), reM(reSum(rows.map(r => r.paid))) + ` (${Math.round(pct)}%)`)}${reRow(L('বাকি', 'Outstanding'), `<span class="neg">${reM(reSum(rows.map(r => r.due)))}</span>`)}${reSum(rows.map(r => r.fine)) ? reRow(L('জরিমানা', 'Fines'), `<span class="neg">${reM(reSum(rows.map(r => r.fine)))}</span>`) : ''}
    ${reBar(pct)}${sh.fineType ? `<p class="hint">${L('দেরির জরিমানা', 'Late fine')}: ${sh.fineValue}${sh.fineType === 'percentage' ? '%' : '৳'}</p>` : ''}
    <div class="section-title">${L('ক্রেতাভিত্তিক ভাগ (স্কয়ার ফুট অনুযায়ী)', 'Per buyer (by square feet)')}</div>
    ${rows.map(r => { const adjs = d.adjustments.filter(a => a.partId === r.part.id);
      return `<div class="brow"><div class="brow-top"><span class="grow">${esc(reCustName(r.part.customerId))} <small>${r.part.sqft} sqft</small></span>${reBadge(r.status)}</div>
      <div class="brow-meta"><span>${L('ভাগ', 'Share')} ${reM(r.part.payable)}${adjs.length ? ` → ${reM(r.eff)}` : ''}</span><span>${L('দিয়েছে', 'Paid')} ${reM(r.paid)}</span><span class="${r.due > 0 ? 'bad' : 'ok'}">${L('বাকি', 'Due')} ${reM(r.due)}</span></div>
      ${r.fine ? `<div class="brow-meta"><span class="bad">${L('জরিমানা', 'Fine')} ${reM(r.fine)}</span><span><b>${L('মোট দেয়', 'Total due')} ${reM(r.totalDue)}</b></span></div>` : ''}
      ${adjs.map(a => `<div class="hg-day"><span><b>${a.amt < 0 ? '−' : '+'}${reM(Math.abs(a.amt))}</b><small>${esc(a.note || L('অ্যাডজাস্টমেন্ট', 'Adjustment'))}</small></span><button type="button" class="link" data-action="re-adj-del" data-id="${a.id}">${L('মুছুন', 'Delete')}</button></div>`).join('')}
      ${rePayList('share', r.part.id)}
      <div class="btn-row mt8">${r.totalDue > 0 ? `<button type="button" class="btn sm" data-action="re-pay-add" data-kind="share" data-ref="${r.part.id}">${icon('plus', 16)} ${L('টাকা পেলাম', 'Receive')}</button>` : ''}<button type="button" class="btn sm" data-action="re-adj-add" data-id="${r.part.id}">± ${L('অ্যাডজাস্ট', 'Adjust')}</button></div></div>`; }).join('')}
    <div class="btn-row mt12"><button type="button" class="btn" data-action="re-share-complete" data-id="${sh.id}">${sh.completed ? L('আবার চালু করুন', 'Reopen') : L('সম্পন্ন চিহ্নিত করুন', 'Mark complete')}</button><button type="button" class="btn danger" data-action="re-share-del" data-id="${sh.id}">${icon('trash', 16)} ${L('ডিলিট', 'Delete')}</button></div>`;
}

/* ---------- রিপোর্ট ---------- */
const RE_REPS = { cash: ['ক্যাশ ফ্লো', 'Cash flow'], cat: ['খাত', 'Categories'], contr: ['ঠিকাদার', 'Contractors'], own: ['মালিকের অবদান', 'Contributions'], recv: ['পাওনা', 'Receivables'], coll: ['আদায়', 'Collections'] };
function reReportBody(k) {
  const d = re(), tb = (head, rows) => `<div class="list" style="padding:4px 12px"><div class="hg-day" style="border-top:0">${head.map(h => `<small>${h}</small>`).join('')}</div>${rows.map(r => `<div class="hg-day">${r.map(c => `<span style="min-width:0">${c}</span>`).join('')}</div>`).join('')}</div>`;
  if (k === 'cash') { const rows = reCashFlow(d); return rows.length ? tb([L('মাস', 'Month'), L('আয়', 'In'), L('ব্যয়', 'Out'), L('নেট', 'Net')], rows.map(r => [r.ym, `<b class="pos">${reShort(r.inn)}</b>`, `<b>${reShort(r.out)}</b>`, `<b class="${r.net < 0 ? 'neg' : ''}">${reShort(r.net)}</b>`])) : `<p class="hint">—</p>`; }
  if (k === 'cat') { const rows = reCategorySpend(d), tot = reSum(rows.map(r => r.v)); return rows.length ? rows.map(r => `<div class="brow"><div class="brow-top"><span class="grow">${(RE_CATS[r.k] || RE_CATS.other)[2]} ${esc(reN(RE_CATS, r.k))}</span><span class="amt">${reM(r.v)}</span></div>${reBar(tot ? r.v / tot * 100 : 0)}</div>`).join('') : `<p class="hint">—</p>`; }
  if (k === 'contr') { const rows = reContractorRows(d); return rows.length ? tb([L('ঠিকাদার', 'Contractor'), L('দেওয়া', 'Paid'), L('অপেক্ষমাণ', 'Awaiting')], rows.map(r => [esc(r.contractor.name || L('নামহীন', 'Unnamed')), `<b>${reShort(r.paid)}</b>`, `<b>${reShort(r.awaiting)}</b>`])) : `<p class="hint">—</p>`; }
  if (k === 'own') { const rows = d.shares.flatMap(sh => reShareRows(d, sh, today()).map(r => [esc(sh.title), esc(reCustName(r.part.customerId)), r])); return rows.length ? tb([L('গোল / ক্রেতা', 'Goal / buyer'), L('পাওনা', 'Payable'), L('পেয়েছি', 'Paid'), L('বাকি+জরিমানা', 'Due+fine')], rows.map(([t, c, r]) => [`${t}<br><small>${c}</small>`, `<b>${reShort(r.eff)}</b>`, `<b>${reShort(r.paid)}</b>`, `<b class="${r.totalDue ? 'neg' : ''}">${reShort(r.totalDue)}</b>`])) : `<p class="hint">—</p>`; }
  if (k === 'recv') { const rows = reReceivables(d, today()); return rows.length ? tb([L('ক্রেতা', 'Buyer'), L('চুক্তি', 'Contract'), L('পেয়েছি', 'Paid'), L('বাকি', 'Due')], rows.map(r => [`${esc(reCustName(r.customer.id))}${r.overdue ? `<br><small class="neg">${L('সময়-পার', 'overdue')} ${reShort(r.overdue)}</small>` : ''}`, `<b>${reShort(r.contract)}</b>`, `<b>${reShort(r.paid)}</b>`, `<b class="${r.out ? 'neg' : ''}">${reShort(r.out)}</b>`])) : `<p class="hint">—</p>`; }
  const rows = reCollectionByMethod(d); return rows.length ? rows.map(r => `<div class="hg-day"><span><b>${esc(reN(RE_METHOD, r.k))}</b></span><b>${reM(r.v)}</b></div>`).join('') : `<p class="hint">—</p>`;
}
function reReportsSheet() {
  const k = reUi.rep || 'cash';
  return `${sheetHead(L('রিপোর্ট', 'Reports'), L('মাস শেষে হিসাবরক্ষকের জন্য', 'For month-end and your accountant'))}
    <div class="chiprow">${Object.keys(RE_REPS).map(x => `<button type="button" class="fchip ${k === x ? 'active' : ''}" data-action="re-rep" data-v="${x}">${reN(RE_REPS, x)}</button>`).join('')}</div>
    <div class="mt12">${reReportBody(k)}</div>`;
}
function reCsv() {
  const d = re(), q = v => `"${String(v ?? '').replace(/"/g, '""')}"`, rows = [['date', 'type', 'description', 'party', 'method', 'account', 'status', 'in', 'out']];
  const acct = id => (reById2('accounts', id) || {}).name || '';
  d.pays.forEach(p => rows.push([p.date, 'receipt-' + p.kind, p.note, '', p.method, acct(p.accountId), p.void ? 'void' : 'counted', p.void ? 0 : p.amt, 0]));
  (d.incomes || []).forEach(i => rows.push([i.date, 'income', i.title, '', '', acct(i.accountId), i.status, i.amount, 0]));
  d.costs.forEach(c => rows.push([c.date, 'cost-' + c.category, c.title, reContrName(c.contractorId), c.method, acct(c.accountId), c.status, 0, c.amount]));
  d.purchases.forEach(p => rows.push([p.date, 'purchase', (reById2('materials', p.materialId) || {}).name, (reById2('vendors', p.vendorId) || {}).name || '', '', acct(p.accountId), p.status, 0, reBuyTotal(p)]));
  const url = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' })), a = document.createElement('a');
  a.href = url; a.download = `realestate-ledger-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function reAuditSheet() {
  const a = re().audit.slice().reverse().slice(0, 150);
  return `${sheetHead(L('অ্যাক্টিভিটি লগ', 'Activity log'), L('কে/কখন: এই ফোনে, শুধু যোগ হয়', 'On this phone, append-only'))}
    ${a.length ? a.map(x => `<div class="hg-day"><span><b>${esc(x.act.replace(/^save:re-|^re-/, '').replace(/-/g, ' '))}</b><small>${new Date(x.t).toLocaleString(isEN() ? 'en-GB' : 'bn-BD')}${x.id ? ' · ' + esc(String(x.id).slice(0, 8)) : ''}</small></span></div>`).join('') : `<p class="hint">${L('এখনও কিছু নেই।', 'Nothing yet.')}</p>`}`;
}
function reMoreExtras() {
  return `<div class="section-title">${L('রিপোর্ট ও লগ', 'Reports & log')}</div><div class="menu">
    ${menuItem('re-reports', 'chart', L('রিপোর্ট', 'Reports'), L('ক্যাশ ফ্লো, খাত, ঠিকাদার, অবদান, পাওনা, আদায়', 'Cash flow, categories, contractors, contributions, receivables, collections'))}
    ${menuItem('re-csv', 'download', L('হিসাবরক্ষকের জন্য CSV', 'CSV for your accountant'), L('সব আয়-ব্যয় এক ফাইলে (Excel-এ খোলে)', 'All money in and out in one file (opens in Excel)'))}
    ${menuItem('re-audit', 'doc', L('অ্যাক্টিভিটি লগ', 'Activity log'), `${re().audit.length} ${L('এন্ট্রি', 'entries')}`)}</div>`;
}

/* ---------- রেজিস্ট্রি ---------- */
Object.assign(RE_MONEY, {
  accts: { label: () => L('অ্যাকাউন্ট', 'Accounts'), add: ['re-acct-add', () => L('অ্যাকাউন্ট', 'Account')], body: reAcctBody },
  budget: { label: () => L('বাজেট', 'Budget'), add: ['re-bud-add', () => L('বাজেট', 'Budget')], body: reBudgetBody },
  stock: { label: () => L('স্টক', 'Stock'), add: ['re-mat-add', () => L('মালামাল', 'Material')], body: reStockBody },
  build: { label: () => L('নির্মাণ', 'Build'), add: ['re-phase-add', () => L('ফেজ', 'Phase')], body: reBuildBody },
});
Object.assign(RE_PEOPLE, {
  leads: { label: () => L('লিড', 'Leads'), add: ['re-lead-add', () => L('লিড', 'Lead')], body: reLeadsBody },
  owners: { label: () => L('মালিক', 'Owners'), add: ['re-owner-add', () => L('মালিক', 'Owner')], body: reOwnersBody },
  vendors: { label: () => L('ভেন্ডর', 'Vendors'), add: ['re-vendor-add', () => L('ভেন্ডর', 'Vendor')], body: reVendorsBody },
});

/* ---------- অ্যাকশন ---------- */
const reGet = (k, el) => reById2(k, el.dataset.id);
Object.assign(ACTIONS, {
  're-goto-money': el => { if (sheetOpen) closeSheet(); reUi.msub = el.dataset.v === 'stock' ? 'stock' : 'budget'; setTab('money'); render(); },
  're-acct-add': () => openSheet(reAcctForm()),
  're-acct': el => openSheet(reAcctForm(reGet('accounts', el))),
  're-acct-del': el => reDel('', () => { reRm('accounts', el.dataset.id); }),
  're-inc-add': () => openSheet(reIncForm()),
  're-inc': el => openSheet(reIncForm(reGet('incomes', el))),
  're-inc-del': el => reDel('', () => { reRm('incomes', el.dataset.id); }),
  're-bud-add': () => openSheet(reBudForm()),
  're-bud': el => openSheet(reBudForm(reGet('budgets', el))),
  're-bud-del': el => reDel('', () => { reRm('budgets', el.dataset.id); }),
  're-mat-add': () => openSheet(reMatForm()),
  're-mat': el => openSheet(reMatSheet(reGet('materials', el))),
  're-mat-edit': el => openSheet(reMatForm(reGet('materials', el))),
  're-mat-del': el => reDel('', () => { const id = el.dataset.id; reRm('materials', id); re().purchases = re().purchases.filter(p => p.materialId !== id); re().usage = re().usage.filter(u => u.materialId !== id); }),
  're-buy-add': el => openSheet(reBuyForm(el.dataset.id)),
  're-buy-del': el => { const p = reGet('purchases', el); closeSheet(); undoable(L('ডিলিট হয়েছে', 'Deleted'), () => reRm('purchases', p.id)); },
  're-use-add': el => openSheet(reUseForm(el.dataset.id)),
  're-use-del': el => { const u = reGet('usage', el); closeSheet(); undoable(L('ডিলিট হয়েছে', 'Deleted'), () => reRm('usage', u.id)); },
  're-phase-add': () => openSheet(rePhaseForm()),
  're-phase': el => openSheet(rePhaseForm(reGet('phases', el))),
  're-phase-del': el => reDel('', () => { const id = el.dataset.id; reRm('phases', id); re().tasks = re().tasks.filter(t => t.phaseId !== id); re().costs.forEach(c => { if (c.phaseId === id) c.phaseId = ''; }); }),
  're-task-add': el => openSheet(reTaskForm(null, el.dataset.id)),
  're-task': el => openSheet(reTaskForm(reGet('tasks', el))),
  're-task-del': el => reDel('', () => reRm('tasks', el.dataset.id)),
  're-lead-add': () => openSheet(reLeadForm()),
  're-lead': el => openSheet(reLeadSheet(reGet('leads', el))),
  're-lead-edit': el => openSheet(reLeadForm(reGet('leads', el))),
  're-lead-del': el => reDel('', () => reRm('leads', el.dataset.id)),
  're-lead-convert': el => {
    const x = reGet('leads', el), no = re().customers.reduce((m, c) => Math.max(m, c.no || 0), 0) + 1, c = { id: uid(), name: x.name, no, phone: x.phone || '', note: '', createdAt: Date.now() };
    re().customers.push(c); x.customerId = c.id; x.status = 'won'; x.activities = (x.activities || []).concat({ date: today(), kind: 'note', text: L('ক্রেতা বানানো হয়েছে', 'Converted to buyer') });
    closeSheet(); commit(L('ক্রেতা বানানো হয়েছে', 'Converted to buyer'));
  },
  're-owner-add': () => openSheet(reOwnerForm()),
  're-owner': el => openSheet(reOwnerForm(reGet('owners', el))),
  're-owner-del': el => reDel('', () => { const id = el.dataset.id; reRm('owners', id); re().units.forEach(u => { if (u.ownerId === id) u.ownerId = ''; }); }),
  're-vendor-add': () => openSheet(reVendorForm()),
  're-vendor': el => openSheet(reVendorForm(reGet('vendors', el))),
  're-vendor-del': el => reDel('', () => { const id = el.dataset.id; reRm('vendors', id); re().purchases.forEach(p => { if (p.vendorId === id) p.vendorId = ''; }); }),
  're-plan': el => openSheet(rePlanForm(reGet('sales', el))),
  're-adj-add': el => openSheet(reAdjForm(el.dataset.id)),
  're-adj-del': el => { const a = reGet('adjustments', el); closeSheet(); undoable(L('ডিলিট হয়েছে', 'Deleted'), () => reRm('adjustments', a.id)); },
  're-share-complete': el => { const sh = reGet('shares', el); sh.completed = !sh.completed; closeSheet(); commit(SAVED()); },
  're-reports': () => openSheet(reReportsSheet()),
  're-rep': el => { reUi.rep = el.dataset.v; openSheet(reReportsSheet()); },
  're-csv': () => { reCsv(); toast(L('CSV তৈরি হয়েছে', 'CSV created')); },
  're-audit': () => openSheet(reAuditSheet()),
});

/* ---------- ফর্ম সেভ ---------- */
const reNeed = (f, field, msgBn, msgEn) => (reV(f, field) ? null : fail(f, L(msgBn, msgEn), field));
// সাধারণ "নাম লাগবে" ধরনের রেকর্ড: কী রেকর্ড, কোন ফিল্ডগুলো, প্রথমবার বানানোর ডিফল্ট
function reRecordForm(key, need, fields, extra) {
  return f => {
    if (need && reNeed(f, need[0], need[1], need[2]) === undefined) return;
    const id = reV(f, 'id'), x = id ? reById2(key, id) : Object.assign({ id: uid(), createdAt: Date.now() }, extra ? extra() : {});
    fields(x, f);
    if (!id) re()[key].push(x);
    reDone();
  };
}
Object.assign(FORMS, {
  're-acct': reRecordForm('accounts', ['name', 'নাম লিখুন', 'Enter a name'], (x, f) => Object.assign(x, { name: reV(f, 'name'), type: reV(f, 'type'), opening: reAmt(f, 'opening') })),
  're-inc': f => {
    if (!(reAmt(f, 'amount') > 0)) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amount');
    reRecordForm('incomes', null, (x, g) => Object.assign(x, { title: reV(g, 'title'), amount: reAmt(g, 'amount'), date: reV(g, 'date') || today(), accountId: reV(g, 'accountId'), status: reV(g, 'status') }))(f);
  },
  're-bud': f => {
    if (!(reAmt(f, 'amount') > 0)) return fail(f, L('বাজেটের টাকা লিখুন', 'Enter the budget amount'), 'amount');
    reRecordForm('budgets', null, (x, g) => Object.assign(x, { category: reV(g, 'category'), amount: reAmt(g, 'amount'), warn: clamp(reAmt(g, 'warn') || 80, 1, 100) }), () => ({ projectId: reProjId() }))(f);
  },
  're-mat': reRecordForm('materials', ['name', 'নাম লিখুন', 'Enter a name'], (x, f) => Object.assign(x, { name: reV(f, 'name'), unit: reV(f, 'unit'), threshold: toNum(reV(f, 'threshold')) })),
  're-buy': f => {
    const qty = toNum(reV(f, 'qty'));
    if (!(qty > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter the quantity'), 'qty');
    re().purchases.push({ id: uid(), createdAt: Date.now(), projectId: reProjId(), materialId: reV(f, 'materialId'), vendorId: reV(f, 'vendorId'), qty, rate: toNum(reV(f, 'rate')), date: reV(f, 'date') || today(), accountId: reV(f, 'accountId'), status: reV(f, 'status') });
    reDone();
  },
  're-use': f => {
    const qty = toNum(reV(f, 'qty'));
    if (!(qty > 0)) return fail(f, L('পরিমাণ লিখুন', 'Enter the quantity'), 'qty');
    re().usage.push({ id: uid(), createdAt: Date.now(), materialId: reV(f, 'materialId'), qty, date: reV(f, 'date') || today(), note: reV(f, 'note') });
    reDone();
  },
  're-phase': reRecordForm('phases', ['name', 'নাম লিখুন', 'Enter a name'], (x, f) => { x.name = reV(f, 'name'); }, () => ({ projectId: reProjId() })),
  're-task': reRecordForm('tasks', ['name', 'নাম লিখুন', 'Enter a name'], (x, f) => Object.assign(x, { name: reV(f, 'name'), phaseId: reV(f, 'phaseId'), progress: clamp(reAmt(f, 'progress'), 0, 100) })),
  're-lead': reRecordForm('leads', ['name', 'নাম লিখুন', 'Enter a name'], (x, f) => Object.assign(x, { name: reV(f, 'name'), phone: reV(f, 'phone'), source: reV(f, 'source'), unitId: reV(f, 'unitId'), status: reV(f, 'status'), note: reV(f, 'note') }, x.activities ? {} : { activities: [] })),
  're-lead-act': f => {
    const x = reById2('leads', reV(f, 'id')), text = reV(f, 'text');
    if (!text) return fail(f, L('বিবরণ লিখুন', 'Enter the details'), 'text');
    x.activities = (x.activities || []).concat({ date: today(), kind: reV(f, 'kind'), text });
    if (reV(f, 'followUp')) x.followUp = reV(f, 'followUp');
    if (x.status === 'new') x.status = 'contacted';
    reDone();
  },
  're-owner': reRecordForm('owners', ['name', 'নাম লিখুন', 'Enter a name'], (x, f) => Object.assign(x, { name: reV(f, 'name'), kind: reV(f, 'kind'), phone: reV(f, 'phone'), share: reV(f, 'share'), note: reV(f, 'note') })),
  're-vendor': reRecordForm('vendors', ['name', 'নাম লিখুন', 'Enter a name'], (x, f) => Object.assign(x, { name: reV(f, 'name'), phone: reV(f, 'phone') })),
  're-plan': f => {
    const x = reById2('sales', reV(f, 'id')), n = reAmt(f, 'n'), down = reAmt(f, 'down');
    if (!(n > 0) && !(down > 0)) return fail(f, L('ডাউন পেমেন্ট বা কিস্তির সংখ্যা লিখুন', 'Enter a down payment or the number of instalments'), 'n');
    re().installments = re().installments.filter(i => i.saleId !== x.id).concat(reMakePlan(x.price, down, n, reV(f, 'start') || today()).map(p => ({ id: uid(), saleId: x.id, due: p.due, amt: p.amt })));
    reDone();
  },
  're-adj': f => {
    const amt = Math.round(toNum(reV(f, 'amt')));
    if (!amt) return fail(f, L('টাকা লিখুন (মাইনাস হলে মাফ/ছাড়)', 'Enter an amount (negative = waiver/discount)'), 'amt');
    re().adjustments.push({ id: uid(), createdAt: Date.now(), partId: reV(f, 'partId'), amt, note: reV(f, 'note'), date: today() });
    reDone();
  },
  're-pay': f => {
    const amt = reAmt(f, 'amt');
    if (!(amt > 0)) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amt');
    re().pays.push({ id: uid(), createdAt: Date.now(), kind: reV(f, 'kind'), ref: reV(f, 'ref'), date: reV(f, 'date') || today(), amt, method: reV(f, 'method'), accountId: reV(f, 'accountId'), note: reV(f, 'note') });
    reDone();
  },
  're-cost': f => {
    const amount = reAmt(f, 'amount');
    if (!(amount > 0)) return fail(f, L('টাকার পরিমাণ লিখুন', 'Enter the amount'), 'amount');
    reRecordForm('costs', null, (x, g) => Object.assign(x, { title: reV(g, 'title'), category: reV(g, 'category'), amount, date: reV(g, 'date') || today(), contractorId: reV(g, 'contractorId'), phaseId: reV(g, 'phaseId'), method: reV(g, 'method'), accountId: reV(g, 'accountId'), status: reV(g, 'status') }), () => ({ projectId: reProjId() }))(f);
  },
  're-share': f => {
    const title = reV(f, 'title'), total = reAmt(f, 'total');
    if (!title) return fail(f, L('বিবরণ লিখুন', 'Enter a description'), 'title');
    if (!(total > 0)) return fail(f, L('মোট খরচ লিখুন', 'Enter the total cost'), 'total');
    const owners = re().sales.filter(s => reSaleCounts(s) && s.sqft > 0);
    if (!owners.length) return fail(f, L('Sqft দেওয়া কোনো বিক্রি নেই। আগে বিক্রিতে Sqft লিখুন।', 'No sale has square feet yet. Add Sqft to your sales first.'), 'total');
    const amounts = reSplit(total, owners.map(s => s.sqft));
    re().shares.push({ id: uid(), createdAt: Date.now(), projectId: reProjId(), title, category: reV(f, 'category'), total, date: reV(f, 'date') || today(), due: reV(f, 'due'), fineType: reV(f, 'fineType'), fineValue: toNum(reV(f, 'fineValue')), status: reV(f, 'status'),
      parts: owners.map((s, i) => ({ id: uid(), customerId: s.customerId, unitId: s.unitId, sqft: s.sqft, payable: amounts[i] })) });
    reDone();
  },
});

/* ---------- অডিট লগ: প্রতিটা সেভ/ডিলিট/বাতিল এখানে জমে (এই ফোনে, শুধু যোগ হয়) ---------- */
function reLog(act, id) { const a = re().audit; a.push({ t: Date.now(), act, id: id || '' }); if (a.length > 400) a.splice(0, a.length - 400); }
Object.keys(FORMS).filter(k => k.startsWith('re-')).forEach(k => {
  const fn = FORMS[k];
  FORMS[k] = f => { const a = re().audit, n = a.length; reLog('save:' + k, f.elements.id ? f.elements.id.value : ''); fn(f); if (f.querySelector('.form-error')) a.length = n; };
});
Object.keys(ACTIONS).filter(k => /^re-.*(-del|-void|-convert|-complete)$/.test(k)).forEach(k => {
  const fn = ACTIONS[k];
  ACTIONS[k] = (el, e) => { const a = re().audit, n = a.length; reDelCancelled = false; reLog(k, el.dataset.id); fn(el, e); if (reDelCancelled) a.length = n; };
});
