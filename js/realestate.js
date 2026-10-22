'use strict';

/* =========================================================
   রিয়েল এস্টেট (Shopno Bilash Properties): প্রজেক্ট, ইউনিট, বিক্রি, বুকিং, কিস্তি/আদায়, খরচ, খরচ ভাগাভাগি
   হিসাব js/realestate-calc.js-এ। ডেটা শুধু state.realestate-এ। ওয়েবসাইটের ডেটা js/realestate-data.js থেকে আসে।
   ========================================================= */

Object.assign(ICONS, {
  building: '<path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h8A1.5 1.5 0 0 1 16 4.5V21"/><path d="M16 9h2.5A1.5 1.5 0 0 1 20 10.5V21M3 21h18M9 7h2M9 11h2M9 15h2"/>',
});

const RE_UNIT_ST = { available: ['খালি', 'Available', '🟢'], booked: ['বুকড', 'Booked', '🟡'], sold: ['বিক্রি', 'Sold', '🔴'], 'owner-allocated': ['মালিক-বরাদ্দ', 'Owner-allocated', '🔵'], 'landowner-share': ['জমিমালিকের অংশ', 'Landowner share', '🟤'] };
const RE_SALE_ST = { completed: ['সম্পন্ন', 'Completed'], pending: ['চলমান', 'Pending'], cancelled: ['বাতিল', 'Cancelled'] };
const RE_BOOK_ST = { booked: ['বুকড', 'Booked'], converted: ['বিক্রিতে রূপান্তর', 'Converted'], cancelled: ['বাতিল', 'Cancelled'] };
const RE_COST_ST = { draft: ['খসড়া', 'Draft'], pending: ['অপেক্ষমাণ', 'Pending'], submitted: ['জমা দেওয়া', 'Submitted'], verified: ['যাচাই করা', 'Verified'], completed: ['সম্পন্ন', 'Completed'], cancelled: ['বাতিল', 'Cancelled'], rejected: ['প্রত্যাখ্যাত', 'Rejected'] };
const RE_CATS = { construction: ['নির্মাণ', 'Construction', '🏗️'], labour: ['শ্রমিক', 'Labour', '🛠️'], contractor: ['ঠিকাদার', 'Contractor', '👷'], material: ['মালামাল', 'Material', '🧱'], equipment: ['যন্ত্রপাতি', 'Equipment', '🔧'], machinery: ['মেশিনারি', 'Machinery', '🚜'], transport: ['পরিবহন', 'Transport', '🚚'], sitework: ['সাইটের কাজ', 'Site work', '⛏️'], utility: ['বিদ্যুৎ/পানি/গ্যাস', 'Utilities', '💡'], office: ['অফিস', 'Office', '🏢'], staff: ['স্টাফ', 'Staff', '💼'], travel: ['ভ্রমণ', 'Travel', '✈️'], professional: ['পেশাদার ফি', 'Professional', '🎓'], legal: ['আইনি ও সরকারি', 'Legal/Government', '📜'], piling: ['পাইলিং', 'Piling', '🏗️'], marketing: ['মার্কেটিং', 'Marketing', '📣'], land: ['জমি', 'Land', '🌱'], other: ['অন্যান্য', 'Miscellaneous', '🧾'] };
const RE_METHOD = { cash: ['নগদ', 'Cash'], 'bank-transfer': ['ব্যাংক ট্রান্সফার', 'Bank transfer'], cheque: ['চেক', 'Cheque'], bkash: ['বিকাশ', 'bKash'], nagad: ['নগদ (অ্যাপ)', 'Nagad'], rocket: ['রকেট', 'Rocket'], card: ['কার্ড', 'Card'], other: ['অন্যান্য', 'Other'] };
const RE_PAYN = { unpaid: ['বাকি', 'Unpaid'], partial: ['আংশিক', 'Partial'], paid: ['পরিশোধ', 'Paid'], pending: ['অপেক্ষমাণ', 'Pending'], overdue: ['সময় পার', 'Overdue'], 'partially-paid': ['আংশিক', 'Partially paid'], due: ['শিগগির দেয়', 'Due soon'], upcoming: ['আসছে', 'Upcoming'] };
const reN = (o, k) => (o[k] ? o[k][isEN() ? 1 : 0] : k || '');

/* ---------- ডেটা ---------- */
const re = () => state.realestate;
function reBlank() {
  return { schema: 1, started: false, seeded: '', company: {}, projects: [], units: [], customers: [], contractors: [], sales: [], bookings: [], costs: [], shares: [], pays: [], accounts: [], installments: [], adjustments: [], budgets: [], incomes: [], materials: [], vendors: [], purchases: [], usage: [], phases: [], tasks: [], leads: [], owners: [], audit: [], web: { policies: [], team: [], milestones: [], founder: null, audit: null } };
}
function reMigrate(s) {
  const d = Object.assign(reBlank(), s.realestate || {});
  const B = reBlank();
  Object.keys(B).forEach(k => { if (Array.isArray(B[k]) && !Array.isArray(d[k])) d[k] = []; });
  d.units.forEach(u => { if (u.status === 'reserved') u.status = 'booked'; });
  d.web = Object.assign(reBlank().web, d.web || {});
  s.realestate = d;
}
const reById = (k, id) => re()[k].find(x => x.id === id);
const reM = fmt;
function reShort(n) {
  const a = Math.abs(n);
  const v = a >= 1e7 ? [a / 1e7, 'কোটি', 'Cr'] : a >= 1e5 ? [a / 1e5, 'লাখ', 'Lakh'] : null;
  return v ? `${n < 0 ? '−' : ''}৳${Math.round(v[0] * 100) / 100} ${isEN() ? v[2] : v[1]}` : fmt(n);
}
const reCustName = id => { const c = reById('customers', id); return c ? (c.name || L(`নামহীন ক্রেতা ${c.no || ''}`.trim(), `Unnamed buyer ${c.no || ''}`.trim())) : L('(মুছে ফেলা ক্রেতা)', '(removed buyer)'); };
const reContrName = id => { const c = reById('contractors', id); return c ? (c.name || L('নামহীন ঠিকাদার', 'Unnamed contractor')) : ''; };
const reUnitName = id => { const u = reById('units', id); return u ? (u.number || u.name) : ''; };
const reSaleLabel = s => `${s.unitId && reUnitName(s.unitId) ? reUnitName(s.unitId) : (s.sqft ? `${s.sqft} sqft ${L('ইউনিট', 'unit')}` : L('ইউনিট', 'Unit'))} · ${reCustName(s.customerId)}`;
const reUi = { msub: 'sales', psub: 'buyers', uf: 'all' };

/* ---------- ফর্মের সহায়ক ---------- */
const reF = (label, html) => `<label class="field"><span>${label}</span>${html}</label>`;
const reTxt = (name, val, ph = '') => `<input class="input" name="${name}" value="${esc(val ?? '')}" placeholder="${ph}">`;
const reNum = (name, val, ph = '0') => `<input class="input" name="${name}" inputmode="decimal" value="${val ? esc(val) : ''}" placeholder="${ph}">`;
const reDate = (name, val) => `<input class="input" type="date" name="${name}" value="${esc(val || today())}">`;
const reSel = (name, opts, val) => `<select class="input" name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const reOpts = o => Object.keys(o).map(k => [k, reN(o, k)]);
const reV = (f, n) => (f.elements[n] ? String(f.elements[n].value).trim() : '');
const reAmt = (f, n) => Math.round(toNum(reV(f, n)));
const reSubmit = (l = '') => `<button class="btn primary block mt12" type="submit">${l || L('সেভ করুন', 'Save')}</button>`;
const reBadge = st => `<span class="badge ${st === 'paid' ? 'delivered' : ['partial', 'partially-paid', 'due', 'upcoming', 'pending'].includes(st) ? 'pending' : 'returned'}">${reN(RE_PAYN, st)}</span>`;
const reDel = (_, fn) => { closeSheet(); undoable(L('ডিলিট হয়েছে', 'Deleted'), fn); };
const reCustOpts = (val, allowNew) => [].concat(allowNew ? [['', L('➕ নতুন ক্রেতা (নাম নিচে লিখুন)', '➕ New buyer (type name below)')]] : [], re().customers.map(c => [c.id, esc(reCustName(c.id))]));
const reUnitOpts = () => [['', L('— ইউনিট বেছে নিন (না থাকলে খালি) —', '— pick a unit (or leave blank) —')]].concat(re().units.map(u => [u.id, esc(`${u.number || u.name} · ${u.sqft || ''} sqft`)]));
// ফর্মে "নতুন ক্রেতা" থাকলে সাথে সাথে ক্রেতা বানায়
function reCustFrom(f) {
  const id = reV(f, 'customerId');
  if (id) return id;
  const name = reV(f, 'newName');
  if (!name) return '';
  const no = re().customers.reduce((m, c) => Math.max(m, c.no || 0), 0) + 1, c = { id: uid(), name, no, phone: reV(f, 'newPhone'), note: '', createdAt: Date.now() };
  re().customers.push(c);
  return c.id;
}
const reNewCust = () => `<div>${reF(L('নতুন ক্রেতার নাম (উপরে "নতুন" বাছলে)', 'New buyer name (if "New" is picked above)'), reTxt('newName', ''))}${reF(L('ফোন (ঐচ্ছিক)', 'Phone (optional)'), reTxt('newPhone', ''))}</div>`;

/* ---------- টপবার ---------- */
function reTopbar() {
  return `<div class="batch-btn">
      <button type="button" class="home-btn" data-action="go-home" aria-label="${L('হোমে ফিরুন', 'Back to Home')}"><span class="logo-sm">${LOGO}</span></button>
      <span class="bb-text"><button type="button" class="home-link" data-action="go-home">${L('হিসাবী', 'Hisabi')}</button>
        <span class="batch-name"><b>${esc(re().company.name || L('রিয়েল এস্টেট', 'Real estate'))}</b></span></span>
    </div>
    <div class="top-actions">${moduleSwitcher()}${helpBtn()}${langBtn()}</div>`;
}
function reWelcome() {
  return `<div class="welcome"><div class="welcome-top"><div class="logo">${LOGO}</div><span>${moduleSwitcher()}${langBtn()}</span></div>
    <h1>🏢 ${L('রিয়েল এস্টেট হিসাব', 'Real estate books')}</h1>
    <p class="lead">${L('প্রজেক্ট, ইউনিট, বিক্রি, বুকিং, ক্রেতার কাছ থেকে আদায়, নির্মাণ খরচ আর খরচ ভাগাভাগি এক জায়গায়।', 'Projects, units, sales, bookings, buyer collections, construction costs and cost sharing in one place.')}</p>
    <button type="button" class="btn primary block" data-action="re-import">${icon('download', 18)} ${L('Shopno Bilash ওয়েবসাইটের ডেটা আনুন', 'Import Shopno Bilash website data')}</button>
    <button type="button" class="btn block mt8" data-action="re-start">${L('খালি থেকে শুরু করুন', 'Start empty')}</button>
    <p class="hint mt12">${L('ওয়েবসাইটের ডেটাবেসে এখন মূলত নমুনা রেকর্ড আছে (আসল প্রজেক্ট/ক্রেতা মুছে ফেলা হয়েছে)। ওগুলো "নমুনা" চিহ্নিত থাকবে, পরে এক ট্যাপে সরানো যাবে।', 'The website database now holds mostly sample records (the real projects and buyers were deleted). They are marked "sample" and can be removed in one tap later.')}</p></div>`;
}

/* ---------- হোম ---------- */
function reHome() {
  const d = re(), s = reSummary(d), sample = [].concat(d.projects, d.units, d.customers, d.sales, d.bookings, d.costs, d.shares).filter(x => x.sample).length;
  const dueSales = d.sales.filter(reSaleCounts).map(x => [x, reSaleRow(d, x)]).filter(([, r]) => r.due > 0);
  const dueParts = d.shares.filter(x => x.status !== 'cancelled').flatMap(sh => reShareRows(d, sh).filter(r => r.due > 0).map(r => [sh, r]));
  const st = (label, v, sub, cls = '') => stat(label, v, sub, cls);
  return `<section class="hero"><div class="hero-top"><div><div class="hero-label">${L('নেট নগদ (আদায় − খরচ)', 'Net cash (collected − costs)')}</div>
      <div class="hero-target">${reShort(s.net)}</div><div class="hero-sub">${L('শুধু রেকর্ড করা পেমেন্ট ধরে', 'Based on recorded payments only')}</div></div></div>
    <div class="hero-chips"><div><small>${L('আদায়', 'Collected')}</small><b>${reShort(s.cashIn)}</b></div><div><small>${L('খরচ', 'Spent')}</small><b>${reShort(s.cashOut)}</b></div><div><small>${L('বিক্রির বাকি', 'Sales due')}</small><b>${reShort(s.sales.due)}</b></div></div></section>
  ${reAlertsCard()}
  <div class="quick four">
    <button type="button" class="qbtn" data-action="re-sale-add"><span class="qi">${icon('trend')}</span>${L('বিক্রি', 'Sale')}</button>
    <button type="button" class="qbtn" data-action="re-pay-pick"><span class="qi">${icon('wallet')}</span>${L('আদায়', 'Receive')}</button>
    <button type="button" class="qbtn" data-action="re-cost-add"><span class="qi">${icon('receipt')}</span>${L('খরচ', 'Cost')}</button>
    <button type="button" class="qbtn" data-action="re-unit-add"><span class="qi">${icon('building')}</span>${L('ইউনিট', 'Unit')}</button></div>
  <div class="stat-grid mt12">
    ${st(L('মোট বিক্রি', 'Total sales'), reShort(s.sales.total), `${cnt(s.sales.n)} ${L('বিক্রি', 'sale(s)')}`)}
    ${st(L('ক্রেতার কাছে পাওনা', 'Due from buyers'), reShort(s.sales.due), L('আদায় ', 'collected ') + reShort(s.sales.paid), s.sales.due > 0 ? 'neg' : '')}
    ${st(L('বুকিং', 'Bookings'), reShort(s.bookings.agreed), `${cnt(s.bookings.n)} · ${L('জমা ', 'deposit ')}${reShort(s.bookings.deposit)}`)}
    ${st(L('নির্মাণ ও অন্য খরচ', 'Construction & costs'), reShort(s.costs.paid), s.costs.pending ? L('বাকি ', 'pending ') + reShort(s.costs.pending) : L('সব দেওয়া', 'all paid'))}
    ${st(L('খরচ ভাগাভাগি: বাকি', 'Cost shares due'), reShort(s.shares.due), `${L('মোট', 'of')} ${reShort(s.shares.total)}`, s.shares.due > 0 ? 'neg' : '')}
    ${st(L('খালি ইউনিটের দাম', 'Unsold stock value'), reShort(s.units.stock), `${s.units.by.available || 0} ${L('খালি', 'available')} · ${s.units.by.booked || 0} ${L('বুকড', 'booked')} · ${s.units.by.sold || 0} ${L('বিক্রি', 'sold')}`)}
  </div>
  ${dueSales.length || dueParts.length ? `<section class="card mt12"><div class="card-head"><h2>${L('আদায় বাকি', 'Collections pending')}</h2></div>
    ${dueSales.map(([x, r]) => `<div class="brow"><button type="button" class="brow-top" data-action="re-sale" data-id="${x.id}" style="width:100%"><span class="grow" style="text-align:left">${esc(reSaleLabel(x))}</span><span class="amt neg">${reM(r.due)}</span></button><div class="brow-meta"><span>${L('বিক্রি', 'Sale')} ${reM(r.price)}</span><span>${L('আদায়', 'Paid')} ${reM(r.paid)}</span></div></div>`).join('')}
    ${dueParts.map(([sh, r]) => `<div class="brow"><button type="button" class="brow-top" data-action="re-share" data-id="${sh.id}" style="width:100%"><span class="grow" style="text-align:left">${esc(sh.title)} · ${esc(reCustName(r.part.customerId))}</span><span class="amt neg">${reM(r.due)}</span></button><div class="brow-meta"><span>${L('শেষ তারিখ', 'Due')} ${sh.due ? fmtDate(sh.due) : '—'}</span>${sh.due && sh.due < today() ? `<span class="bad">${L('সময় পার', 'overdue')}</span>` : ''}</div></div>`).join('')}</section>` : ''}
  ${sample ? `<section class="card attn"><div class="card-head"><h2>🧪 ${L('নমুনা রেকর্ড আছে', 'Sample records present')}</h2></div>
    <p class="hint" style="margin:0 0 8px">${L(`${sample}টা রেকর্ড ওয়েবসাইটের নমুনা ডেটা থেকে এসেছে (ক্রেতা/ঠিকাদারের নাম নেই)। আসল ডেটা বসানোর আগে বা পরে সরিয়ে দিন।`, `${sample} records came from the website's sample data (buyer/contractor names missing). Remove them before or after entering real data.`)}</p>
    <button type="button" class="btn sm" data-action="re-clear-sample">${icon('trash', 16)} ${L('নমুনা রেকর্ড সরান', 'Remove sample records')}</button></section>` : ''}`;
}

/* ---------- প্রজেক্ট ও ইউনিট ---------- */
function reProjectCard(p) {
  const us = re().units.filter(u => u.projectId === p.id);
  return `<section class="card"><div class="card-head"><h2>🏢 ${esc(p.name)}</h2><button type="button" class="link" data-action="re-proj-edit" data-id="${p.id}">${L('বদলান', 'Edit')}</button></div>
    <p class="hint" style="margin:0 0 8px">${esc([p.location, p.type, p.floors ? p.floors + L(' তলা', ' floors') : '', p.completionYear ? L('হ্যান্ডওভার ', 'handover ') + p.completionYear : ''].filter(Boolean).join(' · '))}</p>
    <div class="brow-meta"><span>${L('মোট ইউনিট', 'Total units')} ${p.totalUnits || us.length}</span><span>${L('অবস্থা', 'Status')}: ${esc(p.status || '—')}</span></div>
    ${p.desc ? `<p class="hint">${esc(p.desc)}</p>` : ''}
    ${(p.features || []).length ? `<details class="more"><summary>${L('সুবিধা', 'Features')}</summary><p class="hint">${p.features.map(esc).join(' · ')}</p></details>` : ''}</section>`;
}
function reUnitRows() {
  const list = re().units.filter(u => reUi.uf === 'all' || u.status === reUi.uf).sort((a, b) => (a.floor || 0) - (b.floor || 0));
  if (!list.length) return empty('🏢', L('কোনো ইউনিট নেই', 'No units'), `<p class="hint">${L('"＋ ইউনিট" চেপে যোগ করুন।', 'Tap "＋ Unit" to add one.')}</p>`);
  return `<div class="list">${list.map(u => `<div class="lwrap"><button type="button" class="lrow" data-action="re-unit" data-id="${u.id}"><span class="lic">${RE_UNIT_ST[u.status] ? RE_UNIT_ST[u.status][2] : '🏠'}</span>
    <span class="lmain"><b>${esc(u.number || u.name)}</b><small>${[u.floor ? L('তলা ', 'Floor ') + u.floor : '', u.sqft ? u.sqft + ' sqft' : '', u.type, u.facing].filter(Boolean).map(esc).join(' · ')}</small></span>
    <span class="lend"><b>${u.price ? reShort(u.price) : '—'}</b><small>${reN(RE_UNIT_ST, u.status)}</small></span></button></div>`).join('')}</div>`;
}
function reUnitsTab() {
  const d = re(), fl = [['all', L('সব', 'All')], ['available', L('খালি', 'Available')], ['booked', L('বুকড', 'Booked')], ['sold', L('বিক্রি', 'Sold')]];
  return `<div class="page-head"><h1>${L('প্রজেক্ট ও ইউনিট', 'Projects & units')}</h1><button type="button" class="btn primary sm" data-action="re-unit-add">${icon('plus', 18)} ${L('ইউনিট', 'Unit')}</button></div>
    ${d.projects.map(reProjectCard).join('')}
    <button type="button" class="btn block mb12" data-action="re-proj-add">${icon('plus', 18)} ${L('নতুন প্রজেক্ট', 'New project')}</button>
    <div class="chiprow">${fl.map(([k, l]) => `<button type="button" class="fchip ${reUi.uf === k ? 'active' : ''}" data-action="re-uf" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="mt12">${reUnitRows()}</div>`;
}

/* ---------- টাকা ---------- */
function reSalesList() {
  const d = re(), list = d.sales.slice().sort(byDateDesc);
  if (!list.length) return empty('🤝', L('কোনো বিক্রি নেই', 'No sales yet'), `<p class="hint">${L('ইউনিট বিক্রি হলে এখানে লিখুন। তারপর ক্রেতার কাছ থেকে প্রতিটা টাকা আদায় রেকর্ড করুন।', 'Record each unit sale here, then log every payment received from the buyer.')}</p>`);
  return `<div class="list">${list.map(x => { const r = reSaleRow(d, x);
    return `<div class="lwrap"><button type="button" class="lrow" data-action="re-sale" data-id="${x.id}"><span class="lic">🤝</span>
      <span class="lmain"><b>${esc(reSaleLabel(x))}${x.sample ? ' 🧪' : ''}</b><small>${fmtDate(x.date)} · ${L('মোট', 'Total')} ${reM(r.price)}${x.status === 'cancelled' ? ' · ' + L('বাতিল', 'cancelled') : ''}</small></span>
      <span class="lend"><b class="${r.due > 0 ? 'neg' : 'pos'}">${r.due > 0 ? reM(r.due) : reM(r.paid)}</b>${reBadge(r.state)}</span></button></div>`; }).join('')}</div>`;
}
function reBookList() {
  const d = re(), list = d.bookings.slice().sort(byDateDesc);
  if (!list.length) return empty('📝', L('কোনো বুকিং নেই', 'No bookings'), `<p class="hint">${L('বুকিং মানি নিলে এখানে লিখুন। পরে বিক্রিতে রূপান্তর করা যাবে।', 'Record booking money here; convert to a sale later.')}</p>`);
  return `<div class="list">${list.map(b => { const paid = rePaidFor(d.pays, 'booking', b.id);
    return `<div class="lwrap"><button type="button" class="lrow" data-action="re-book" data-id="${b.id}"><span class="lic">📝</span>
      <span class="lmain"><b>${esc((reUnitName(b.unitId) || b.ref || L('বুকিং', 'Booking')) + ' · ' + reCustName(b.customerId))}${b.sample ? ' 🧪' : ''}</b><small>${fmtDate(b.date)} · ${L('চুক্তি', 'Agreed')} ${reM(b.agreed)} · ${reN(RE_BOOK_ST, b.status)}</small></span>
      <span class="lend"><b>${reM(b.deposit)}</b><small>${L('বুকিং মানি', 'deposit')}${paid ? ' · ' + L('পাওয়া ', 'got ') + reM(paid) : ''}</small></span></button></div>`; }).join('')}</div>`;
}
function reCostList() {
  const list = re().costs.slice().sort(byDateDesc);
  if (!list.length) return empty('🧾', L('কোনো খরচ নেই', 'No costs yet'), `<p class="hint">${L('ঠিকাদার বিল, মালামাল, ফি, বেতন সব এখানে লিখুন।', 'Record contractor bills, materials, fees and salaries here.')}</p>`);
  return `<div class="list">${list.map(c => `<div class="lwrap"><button type="button" class="lrow" data-action="re-cost" data-id="${c.id}"><span class="lic">${(RE_CATS[c.category] || RE_CATS.other)[2]}</span>
    <span class="lmain"><b>${esc(c.title || reN(RE_CATS, c.category))}${c.sample ? ' 🧪' : ''}</b><small>${fmtDate(c.date)} · ${esc(reN(RE_CATS, c.category))}${c.contractorId ? ' · ' + esc(reContrName(c.contractorId)) : ''}</small></span>
    <span class="lend"><b>${reM(c.amount)}</b><small>${reN(RE_COST_ST, c.status)}</small></span></button></div>`).join('')}</div>`;
}
function reShareList() {
  const d = re();
  if (!d.shares.length) return empty('🧮', L('কোনো খরচ ভাগাভাগি নেই', 'No cost shares'), `<p class="hint">${L('যে খরচ (যেমন পাইলিং) সব ক্রেতা স্কয়ার ফুট অনুযায়ী ভাগ করে দেবেন তা এখানে তৈরি করুন।', 'Create a cost (e.g. piling) that all buyers share by square feet.')}</p>`);
  return `<div class="list">${d.shares.slice().sort(byDateDesc).map(sh => { const rows = reShareRows(d, sh), paid = reSum(rows.map(r => r.paid)), due = reSum(rows.map(r => r.due));
    return `<div class="lwrap"><button type="button" class="lrow" data-action="re-share" data-id="${sh.id}"><span class="lic">🧮</span>
      <span class="lmain"><b>${esc(sh.title)}${sh.sample ? ' 🧪' : ''}</b><small>${fmtDate(sh.date)} · ${L('মোট', 'Total')} ${reM(sh.total)} · ${cnt(rows.length)} ${L('ক্রেতা', 'buyer(s)')}</small></span>
      <span class="lend"><b class="${due > 0 ? 'neg' : 'pos'}">${due > 0 ? reM(due) : reM(paid)}</b><small>${due > 0 ? L('বাকি', 'due') : L('সব আদায়', 'all in')}</small></span></button></div>`; }).join('')}</div>`;
}
// টাকা ও মানুষ ট্যাবের উপ-পাতা: এখানে রেজিস্টার হয়, realestate-ext.js আরও যোগ করে
const RE_MONEY = {
  sales: { label: () => L('বিক্রি', 'Sales'), add: ['re-sale-add', () => L('বিক্রি', 'Sale')], body: () => reSalesList() },
  book: { label: () => L('বুকিং', 'Bookings'), add: ['re-book-add', () => L('বুকিং', 'Booking')], body: () => reBookList() },
  costs: { label: () => L('খরচ', 'Costs'), add: ['re-cost-add', () => L('খরচ', 'Cost')], body: () => reCostList() },
  shares: { label: () => L('ভাগাভাগি', 'Shares'), add: ['re-share-add', () => L('ভাগাভাগি', 'Share')], body: () => reShareList() },
};
const RE_PEOPLE = {};
function reSubPage(reg, key, title) {
  if (!reg[reUi[key]]) reUi[key] = Object.keys(reg)[0];
  const m = reg[reUi[key]];
  return `<div class="page-head"><h1>${title}</h1>${m.add ? `<button type="button" class="btn primary sm" data-action="${m.add[0]}">${icon('plus', 18)} ${m.add[1]()}</button>` : ''}</div>
    <div class="chiprow">${Object.keys(reg).map(k => `<button type="button" class="fchip ${reUi[key] === k ? 'active' : ''}" data-action="re-sub" data-key="${key}" data-v="${k}">${reg[k].label()}</button>`).join('')}</div>
    <div class="mt12">${m.body()}</div>`;
}
const reMoneyTab = () => reSubPage(RE_MONEY, 'msub', L('টাকা', 'Money'));
function reBuyersBody() {
  const d = re();
  const cRow = c => {
    const sales = d.sales.filter(s => s.customerId === c.id && reSaleCounts(s)), rows = sales.map(s => reSaleRow(d, s)), buy = reSum(rows.map(r => r.price)), pd = reSum(rows.map(r => r.paid));
    const parts = d.shares.flatMap(sh => reShareRows(d, sh)).filter(r => r.part.customerId === c.id), shDue = reSum(parts.map(r => r.totalDue)), due = Math.max(0, buy - pd) + shDue;
    return `<div class="lwrap"><button type="button" class="lrow" data-action="re-cust" data-id="${c.id}"><span class="lic">🙂</span>
      <span class="lmain"><b>${esc(reCustName(c.id))}${c.sample ? ' 🧪' : ''}</b><small>${esc(c.phone || '')}${c.phone ? ' · ' : ''}${cnt(sales.length)} ${L('ইউনিট', 'unit(s)')} · ${L('কেনা', 'bought')} ${reShort(buy)}</small></span>
      <span class="lend">${due > 0 ? `<b class="neg">${reShort(due)}</b><small>${L('বাকি', 'due')}</small>` : `<small class="pos">${L('বাকি নেই', 'no dues')}</small>`}</span></button></div>`;
  };
  return d.customers.length ? `<div class="list">${d.customers.map(cRow).join('')}</div>` : empty('🙂', L('কোনো ক্রেতা নেই', 'No buyers'), '');
}
function reContrBody() {
  const d = re();
  const kRow = r => {
    const c = r.contractor;
    return `<div class="lwrap"><button type="button" class="lrow" data-action="re-contr" data-id="${c.id}"><span class="lic">👷</span><span class="lmain"><b>${esc(c.name || L('নামহীন ঠিকাদার', 'Unnamed contractor'))}${c.sample ? ' 🧪' : ''}</b><small>${esc(c.phone || '')}${r.contract ? (c.phone ? ' · ' : '') + L('চুক্তি ', 'contract ') + reShort(r.contract) : ''}${r.awaiting ? ' · ' + L('অপেক্ষমাণ ', 'awaiting ') + reShort(r.awaiting) : ''}</small></span><span class="lend"><b>${reShort(r.paid)}</b><small>${L('দেওয়া', 'paid')}</small></span></button></div>`;
  };
  return d.contractors.length ? `<div class="list">${reContractorRows(d).map(kRow).join('')}</div>` : `<p class="hint">${L('কোনো ঠিকাদার নেই।', 'No contractors.')}</p>`;
}
Object.assign(RE_PEOPLE, {
  buyers: { label: () => L('ক্রেতা', 'Buyers'), add: ['re-cust-add', () => L('ক্রেতা', 'Buyer')], body: reBuyersBody },
  contr: { label: () => L('ঠিকাদার', 'Contractors'), add: ['re-contr-add', () => L('ঠিকাদার', 'Contractor')], body: reContrBody },
});
const rePeopleTab = () => reSubPage(RE_PEOPLE, 'psub', L('মানুষ', 'People'));

/* ---------- মানুষ ---------- */

/* ---------- আরও ---------- */
function reMoreTab() {
  const d = re(), c = d.company, w = d.web;
  const sec = (title, inner) => inner ? `<details class="more"><summary>${title}</summary>${inner}</details>` : '';
  return `<div class="page-head"><h1>${L('আরও', 'More')}</h1></div>
    <section class="card"><div class="card-head"><h2>🏢 ${esc(c.legal || c.name || L('কোম্পানি', 'Company'))}</h2></div>
      <p class="hint" style="margin:0">${[c.address, c.phone, c.email].filter(Boolean).map(esc).join('<br>') || L('কোম্পানির তথ্য নেই।', 'No company info.')}</p></section>
    <div class="section-title">${L('ওয়েবসাইটের ডেটা', 'Website data')}</div>
    <div class="menu">
      ${menuItem('re-import', 'download', L('ওয়েবসাইট থেকে ডেটা আনুন', 'Import website data'), d.seeded ? L('শেষবার ', 'last ') + d.seeded + L(' · আবার চাপলে কিছু দ্বিগুণ হয় না', ' · re-importing never duplicates') : L('এখনও আনা হয়নি', 'Not imported yet'))}
      ${menuItem('re-clear-sample', 'trash', L('নমুনা রেকর্ড সরান', 'Remove sample records'), L('শুধু 🧪 চিহ্নিতগুলো যাবে', 'Only 🧪-marked records go'))}
    </div>
    ${reMoreExtras()}
    ${sec(`${L('কোম্পানির নীতিমালা', 'Company policies')} (${(w.policies || []).length})`, (w.policies || []).map(p => `<p class="hint"><b>${esc(p.title)}</b><br>${esc(p.text).replace(/\*\*/g, '').replace(/\n/g, '<br>')}</p>`).join(''))}
    ${sec(`${L('ইতিহাস ও টিম', 'History & team')}`, (w.founder ? `<p class="hint"><b>${esc(w.founder.name)}</b> · ${esc(w.founder.title)}</p>` : '') + (w.team || []).map(t => `<p class="hint"><b>${esc(t.name)}</b> · ${esc(t.title)}</p>`).join('') + (w.milestones || []).map(m => `<p class="hint"><b>${esc(m.year)} · ${esc(m.title)}</b><br>${esc(m.summary)}</p>`).join(''))}
    ${appSections()}`;
}

/* ---------- শিট: বিস্তারিত ---------- */
const reRow = (k, v) => `<div class="brow-meta" style="font-size:14px;margin:6px 0"><span>${k}</span><b>${v}</b></div>`;
const reActs = (edit, del, id) => `<div class="btn-row mt12"><button type="button" class="btn" data-action="${edit}" data-id="${id}">${icon('edit', 16)} ${L('বদলান', 'Edit')}</button><button type="button" class="btn danger" data-action="${del}" data-id="${id}">${icon('trash', 16)} ${L('ডিলিট', 'Delete')}</button></div>`;
function rePayList(kind, ref) {
  const ps = re().pays.filter(p => p.kind === kind && p.ref === ref).sort(byDateDesc);
  return ps.length ? ps.map(p => `<div class="hg-day ${p.void ? 'void' : ''}"><span><b>${p.void ? '<s>' : ''}${reM(p.amt)}${p.void ? '</s>' : ''} · ${fmtDate(p.date)}</b><small>${esc(reN(RE_METHOD, p.method))}${p.note ? ' · ' + esc(p.note) : ''}${p.void ? ' · ' + L('বাতিল', 'voided') : ''}</small></span>
    ${p.void ? '' : `<button type="button" class="link" data-action="re-pay-void" data-id="${p.id}">${L('বাতিল', 'Void')}</button>`}</div>`).join('') : `<p class="hint">${L('এখনও কোনো পেমেন্ট রেকর্ড নেই।', 'No payments recorded yet.')}</p>`;
}
function reSaleSheet(x) {
  const r = reSaleRow(re(), x);
  return `${sheetHead(reSaleLabel(x), `${fmtDate(x.date)} · ${reN(RE_SALE_ST, x.status)}`)}
    ${reRow(L('মূল দাম', 'Base price'), reM(x.base))}${x.parking ? reRow(L('পার্কিং', 'Parking'), reM(x.parking)) : ''}${x.premium ? reRow(L('ফ্লোর প্রিমিয়াম', 'Floor premium'), reM(x.premium)) : ''}${x.extra ? reRow(L('অতিরিক্ত চার্জ', 'Extra charges'), reM(x.extra)) : ''}${x.discount ? reRow(L('ছাড়', 'Discount') + (x.discountReason ? ` (${esc(x.discountReason)})` : ''), '−' + reM(x.discount)) : ''}
    ${reRow(L('মোট বিক্রি দাম', 'Sale price'), reM(r.price))}${reRow(L('আদায়', 'Collected'), reM(r.paid))}${reRow(L('বাকি', 'Due'), `<span class="${r.due > 0 ? 'neg' : 'pos'}">${reM(r.due)}</span> ${reBadge(r.state)}`)}
    ${x.terms ? `<p class="hint">${esc(x.terms)}</p>` : ''}
    ${reInstSection(x)}
    <div class="section-title">${L('পেমেন্ট', 'Payments')}</div>${rePayList('sale', x.id)}
    <button type="button" class="btn primary block mt8" data-action="re-pay-add" data-kind="sale" data-ref="${x.id}">${icon('plus', 18)} ${L('টাকা পেলাম', 'Receive payment')}</button>
    ${reActs('re-sale-edit', 're-sale-del', x.id)}`;
}
function reBookSheet(b) {
  const paid = rePaidFor(re().pays, 'booking', b.id);
  return `${sheetHead((reUnitName(b.unitId) || b.ref || L('বুকিং', 'Booking')) + ' · ' + reCustName(b.customerId), `${fmtDate(b.date)} · ${reN(RE_BOOK_ST, b.status)}`)}
    ${reRow(L('চুক্তির দাম', 'Agreed price'), reM(b.agreed))}${reRow(L('বুকিং মানি (নির্ধারিত)', 'Booking money (agreed)'), reM(b.deposit))}${reRow(L('বুকিং মানি পাওয়া গেছে', 'Booking money received'), reM(paid))}
    ${b.terms ? `<p class="hint">${esc(b.terms)}</p>` : ''}<div class="section-title">${L('পেমেন্ট', 'Payments')}</div>${rePayList('booking', b.id)}
    <button type="button" class="btn primary block mt8" data-action="re-pay-add" data-kind="booking" data-ref="${b.id}">${icon('plus', 18)} ${L('টাকা পেলাম', 'Receive payment')}</button>
    ${b.status === 'booked' ? `<button type="button" class="btn block mt8" data-action="re-book-convert" data-id="${b.id}">${L('বিক্রিতে রূপান্তর করুন', 'Convert to a sale')}</button>` : ''}
    ${reActs('re-book-edit', 're-book-del', b.id)}`;
}

/* ---------- ফর্ম খোলা ---------- */
const reUnitForm = u => { u = u || {}; return `${sheetHead(u.id ? L('ইউনিট বদলান', 'Edit unit') : L('নতুন ইউনিট', 'New unit'))}
  <form data-form="re-unit" autocomplete="off"><input type="hidden" name="id" value="${esc(u.id || '')}">
    ${reF(L('ইউনিট নম্বর (যেমন A-501)', 'Unit number (e.g. A-501)'), reTxt('number', u.number))}
    ${reF(L('প্রজেক্ট', 'Project'), reSel('projectId', re().projects.map(p => [p.id, esc(p.name)]).concat([['', L('— নেই —', '— none —')]]), u.projectId || (re().projects[0] || {}).id))}
    ${reF(L('তলা', 'Floor'), reNum('floor', u.floor))}${reF('Sqft', reNum('sqft', u.sqft))}${reF(L('দাম', 'Price'), moneyInput('price', u.price || ''))}
    ${reF(L('অবস্থা', 'Status'), reSel('status', reOpts(RE_UNIT_ST), u.status || 'available'))}
    ${reF(L('মালিক (শুধু মালিক-বরাদ্দ বা জমিমালিকের অংশ হলে)', 'Owner (only for owner-allocated / landowner share)'), reSel('ownerId', [['', L('— নেই —', '— none —')]].concat(re().owners.map(o => [o.id, esc(o.name)])), u.ownerId || ''))}
    ${reF(L('ধরন (3 Bed ইত্যাদি)', 'Type (e.g. 3 Bed)'), reTxt('type', u.type))}${reF(L('দিক', 'Facing'), reTxt('facing', u.facing))}
    ${reSubmit()}</form>${u.id ? `<button type="button" class="btn danger block mt8" data-action="re-unit-del" data-id="${u.id}">${icon('trash', 16)} ${L('ডিলিট', 'Delete')}</button>` : ''}`; };
const reProjForm = p => { p = p || {}; return `${sheetHead(p.id ? L('প্রজেক্ট বদলান', 'Edit project') : L('নতুন প্রজেক্ট', 'New project'))}
  <form data-form="re-proj" autocomplete="off"><input type="hidden" name="id" value="${esc(p.id || '')}">
    ${reF(L('নাম', 'Name'), reTxt('name', p.name))}${reF(L('এলাকা', 'Location'), reTxt('location', p.location))}
    ${reF(L('মোট তলা', 'Floors'), reNum('floors', p.floors))}${reF(L('মোট ইউনিট', 'Total units'), reNum('totalUnits', p.totalUnits))}${reF(L('হ্যান্ডওভার সাল', 'Handover year'), reNum('completionYear', p.completionYear))}
    ${reF(L('অবস্থা', 'Status'), reSel('status', [['upcoming', L('আসছে', 'Upcoming')], ['ongoing', L('চলমান', 'Ongoing')], ['completed', L('শেষ', 'Completed')]], p.status || 'ongoing'))}
    ${reSubmit()}</form>${p.id ? `<button type="button" class="btn danger block mt8" data-action="re-proj-del" data-id="${p.id}">${icon('trash', 16)} ${L('ডিলিট', 'Delete')}</button>` : ''}`; };
const rePersonForm = (form, c, title) => `${sheetHead(title)}<form data-form="${form}" autocomplete="off"><input type="hidden" name="id" value="${esc(c.id || '')}">
    ${reF(L('নাম', 'Name'), reTxt('name', c.name))}${reF(L('ফোন', 'Phone'), reTxt('phone', c.phone))}${form === 're-cust' ? reF(L('নোট', 'Note'), reTxt('note', c.note)) : ''}${reSubmit()}</form>
    ${c.id ? `<button type="button" class="btn danger block mt8" data-action="${form}-del" data-id="${c.id}">${icon('trash', 16)} ${L('ডিলিট', 'Delete')}</button>` : ''}`;
function reSaleForm(x, pre) {
  x = Object.assign({}, pre || {}, x || {});
  return `${sheetHead(x.id ? L('বিক্রি বদলান', 'Edit sale') : L('নতুন বিক্রি', 'New sale'))}
  <form data-form="re-sale" data-live="re-sale" autocomplete="off"><input type="hidden" name="id" value="${esc(x.id || '')}"><input type="hidden" name="fromBooking" value="${esc(x.fromBooking || '')}">
    ${reF(L('ইউনিট', 'Unit'), reSel('unitId', reUnitOpts(), x.unitId || ''))}${reF('Sqft', reNum('sqft', x.sqft))}
    ${reF(L('ক্রেতা', 'Buyer'), reSel('customerId', reCustOpts(x.customerId, true), x.customerId || (re().customers.length ? re().customers[0].id : '')))}${reNewCust()}
    ${reF(L('তারিখ', 'Date'), reDate('date', x.date))}
    ${reF(L('মূল দাম', 'Base price'), moneyInput('base', x.base || ''))}${reF(L('পার্কিং', 'Parking'), moneyInput('parking', x.parking || ''))}${reF(L('ফ্লোর প্রিমিয়াম', 'Floor premium'), moneyInput('premium', x.premium || ''))}${reF(L('অতিরিক্ত চার্জ', 'Extra charges'), moneyInput('extra', x.extra || ''))}${reF(L('ছাড়', 'Discount'), moneyInput('discount', x.discount || ''))}
    <div class="bsum"><b>${L('মোট বিক্রি দাম', 'Sale price')}</b><span data-re-price>৳0</span></div>
    ${reF(L('পেমেন্টের শর্ত', 'Payment terms'), reTxt('terms', x.terms, L('যেমন ২০% ডাউন, বাকি ১৮ কিস্তি', 'e.g. 20% down, 18 instalments')))}
    ${reF(L('অবস্থা', 'Status'), reSel('status', reOpts(RE_SALE_ST), x.status || 'completed'))}${reSubmit()}</form>`;
}
function reBookForm(b) {
  b = b || {};
  return `${sheetHead(b.id ? L('বুকিং বদলান', 'Edit booking') : L('নতুন বুকিং', 'New booking'))}<form data-form="re-book" autocomplete="off"><input type="hidden" name="id" value="${esc(b.id || '')}">
    ${reF(L('ইউনিট', 'Unit'), reSel('unitId', reUnitOpts(), b.unitId || ''))}
    ${reF(L('ক্রেতা', 'Buyer'), reSel('customerId', reCustOpts(b.customerId, true), b.customerId || (re().customers.length ? re().customers[0].id : '')))}${reNewCust()}
    ${reF(L('তারিখ', 'Date'), reDate('date', b.date))}${reF(L('রেফারেন্স', 'Reference'), reTxt('ref', b.ref))}
    ${reF(L('চুক্তির দাম', 'Agreed price'), moneyInput('agreed', b.agreed || ''))}${reF(L('বুকিং মানি', 'Booking money'), moneyInput('deposit', b.deposit || ''))}
    ${reF(L('শর্ত', 'Terms'), reTxt('terms', b.terms))}${reF(L('অবস্থা', 'Status'), reSel('status', reOpts(RE_BOOK_ST), b.status || 'booked'))}${reSubmit()}</form>`;
}
function rePayPick() {
  const d = re(), opts = d.sales.filter(s => s.status !== 'cancelled' && reSaleRow(d, s).due > 0).map(s => [s, 'sale', s.id, reSaleLabel(s), reSaleRow(d, s).due])
    .concat(d.bookings.filter(b => b.status === 'booked').map(b => [b, 'booking', b.id, (reUnitName(b.unitId) || b.ref || L('বুকিং', 'Booking')) + ' · ' + reCustName(b.customerId) + ' (' + L('বুকিং', 'booking') + ')', 0]))
    .concat(d.shares.flatMap(sh => reShareRows(d, sh).filter(r => r.due > 0).map(r => [sh, 'share', r.part.id, sh.title + ' · ' + reCustName(r.part.customerId), r.due])));
  return `${sheetHead(L('কার কাছ থেকে টাকা পেলেন?', 'Received from whom?'))}${opts.length ? `<div class="list">${opts.map(o => `<div class="lwrap"><button type="button" class="lrow" data-action="re-pay-add" data-kind="${o[1]}" data-ref="${o[2]}"><span class="lic">💰</span><span class="lmain"><b>${esc(o[3])}</b></span>${o[4] ? `<span class="lend"><b class="neg">${reM(o[4])}</b><small>${L('বাকি', 'due')}</small></span>` : ''}</button></div>`).join('')}</div>` : `<p class="hint">${L('আদায় বাকি এমন কোনো বিক্রি, বুকিং বা ভাগ নেই।', 'Nothing is waiting to be collected.')}</p>`}`;
}

/* ---------- অ্যাকশন ---------- */
// শিট খোলা থাকলে openSheet ভেতরের লেখা বদলে দেয় (নতুন হিস্ট্রি ঢোকায় না), তাই এক শিট থেকে আরেক শিটে যাওয়া নিরাপদ
const reSwap = openSheet;
Object.assign(ACTIONS, {
  're-start': () => { re().started = true; commit(); },
  're-import': () => {
    const a = reMergeSeed(re(), RE_WEB_SEED);
    re().started = true;
    commit(Object.keys(a).length ? L('ওয়েবসাইটের ডেটা যোগ হয়েছে', 'Website data added') : L('নতুন কিছু ছিল না, সব আগেই আছে', 'Nothing new, everything was already here'));
  },
  're-clear-sample': () => {
    if (!confirm(L('🧪 চিহ্নিত সব নমুনা রেকর্ড আর তাদের পেমেন্ট সরানো হবে। চালিয়ে যাবেন?', 'All 🧪-marked sample records and their payments will be removed. Continue?'))) return;
    undoable(L('নমুনা রেকর্ড সরানো হয়েছে', 'Sample records removed'), () => { reRemoveSample(re()); });
  },
  're-sub': el => { reUi[el.dataset.key] = el.dataset.v; render(); },
  're-uf': el => { reUi.uf = el.dataset.v; render(); },
  're-unit-add': () => reSwap(reUnitForm()),
  're-unit': el => { const u = reById('units', el.dataset.id); if (u) openSheet(reUnitForm(u)); },
  're-unit-del': el => reDel('', () => { re().units = re().units.filter(u => u.id !== el.dataset.id); }),
  're-proj-add': () => openSheet(reProjForm()),
  're-proj-edit': el => { const p = reById('projects', el.dataset.id); if (p) openSheet(reProjForm(p)); },
  're-proj-del': el => reDel('', () => { re().projects = re().projects.filter(p => p.id !== el.dataset.id); }),
  're-cust-add': () => openSheet(rePersonForm('re-cust', {}, L('নতুন ক্রেতা', 'New buyer'))),
  're-cust': el => { const c = reById('customers', el.dataset.id); if (c) openSheet(rePersonForm('re-cust', c, L('ক্রেতার তথ্য', 'Buyer details'))); },
  're-cust-del': el => {
    const id = el.dataset.id;
    if (re().sales.some(s => s.customerId === id) || re().bookings.some(b => b.customerId === id) || re().shares.some(s => s.parts.some(p => p.customerId === id))) return toast(L('এই ক্রেতার বিক্রি/বুকিং আছে, আগে সেগুলো সরান', 'This buyer has sales/bookings. Remove those first'), 'danger');
    reDel('', () => { re().customers = re().customers.filter(c => c.id !== id); });
  },
  're-contr-add': () => openSheet(rePersonForm('re-contr', {}, L('নতুন ঠিকাদার', 'New contractor'))),
  're-contr': el => { const c = reById('contractors', el.dataset.id); if (c) openSheet(rePersonForm('re-contr', c, L('ঠিকাদার', 'Contractor'))); },
  're-contr-del': el => reDel('', () => { re().contractors = re().contractors.filter(c => c.id !== el.dataset.id); re().costs.forEach(c => { if (c.contractorId === el.dataset.id) c.contractorId = ''; }); }),
  're-sale-add': () => reSwap(reSaleForm()),
  're-sale': el => { const x = reById('sales', el.dataset.id); if (x) openSheet(reSaleSheet(x)); },
  're-sale-edit': el => reSwap(reSaleForm(reById('sales', el.dataset.id))),
  're-sale-del': el => reDel('', () => { const id = el.dataset.id; re().sales = re().sales.filter(s => s.id !== id); re().pays = re().pays.filter(p => !(p.kind === 'sale' && p.ref === id)); re().installments = re().installments.filter(i => i.saleId !== id); }),
  're-book-add': () => reSwap(reBookForm()),
  're-book': el => { const b = reById('bookings', el.dataset.id); if (b) openSheet(reBookSheet(b)); },
  're-book-edit': el => reSwap(reBookForm(reById('bookings', el.dataset.id))),
  're-book-del': el => reDel('', () => { const id = el.dataset.id; re().bookings = re().bookings.filter(b => b.id !== id); re().pays = re().pays.filter(p => !(p.kind === 'booking' && p.ref === id)); }),
  're-book-convert': el => {
    const b = reById('bookings', el.dataset.id), u = reById('units', b.unitId);
    reSwap(reSaleForm(null, { fromBooking: b.id, unitId: b.unitId, customerId: b.customerId, sqft: u ? u.sqft : '', base: b.agreed, terms: b.terms }));
  },
  're-cost-add': () => reSwap(reCostForm()),
  're-cost': el => { const c = reById('costs', el.dataset.id); if (c) openSheet(reCostForm(c)); },
  're-cost-del': el => reDel('', () => { re().costs = re().costs.filter(c => c.id !== el.dataset.id); }),
  're-share-add': () => reSwap(reShareForm()),
  're-share': el => { const s = reById('shares', el.dataset.id); if (s) openSheet(reShareSheet(s)); },
  're-share-del': el => reDel('', () => { const sh = reById('shares', el.dataset.id), ids = new Set(sh.parts.map(p => p.id)); re().shares = re().shares.filter(s => s !== sh); re().pays = re().pays.filter(p => !(p.kind === 'share' && ids.has(p.ref))); re().adjustments = re().adjustments.filter(a => !ids.has(a.partId)); }),
  're-pay-pick': () => reSwap(rePayPick()),
  're-pay-add': el => reSwap(rePayForm(el.dataset.kind, el.dataset.ref)),
  're-pay-void': el => { const p = re().pays.find(x => x.id === el.dataset.id); if (!p) return; closeSheet(); undoable(L('পেমেন্ট বাতিল', 'Payment voided'), () => { p.void = true; }); },
});

/* ---------- ফর্ম সেভ ---------- */
const reDone = () => { closeSheet(); commit(SAVED()); };
Object.assign(FORMS, {
  're-unit': f => {
    const number = reV(f, 'number');
    if (!number) return fail(f, L('ইউনিট নম্বর লিখুন', 'Enter the unit number'), 'number');
    const id = reV(f, 'id'), u = id ? reById('units', id) : { id: uid(), createdAt: Date.now() };
    Object.assign(u, { number, projectId: reV(f, 'projectId'), floor: reAmt(f, 'floor'), sqft: reAmt(f, 'sqft'), price: reAmt(f, 'price'), status: reV(f, 'status'), type: reV(f, 'type'), facing: reV(f, 'facing') });
    u.ownerId = ['owner-allocated', 'landowner-share'].includes(u.status) ? reV(f, 'ownerId') : ''; // একটা ইউনিট একসাথে দুজনের হয় না
    if (!id) re().units.push(u);
    reDone();
  },
  're-proj': f => {
    const name = reV(f, 'name');
    if (!name) return fail(f, L('প্রজেক্টের নাম লিখুন', 'Enter the project name'), 'name');
    const id = reV(f, 'id'), p = id ? reById('projects', id) : { id: uid(), features: [], createdAt: Date.now() };
    Object.assign(p, { name, location: reV(f, 'location'), floors: reAmt(f, 'floors'), totalUnits: reAmt(f, 'totalUnits'), completionYear: reAmt(f, 'completionYear') || '', status: reV(f, 'status') });
    if (!id) re().projects.push(p);
    reDone();
  },
  're-cust': f => {
    const name = reV(f, 'name');
    if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    const id = reV(f, 'id'), c = id ? reById('customers', id) : { id: uid(), no: re().customers.reduce((m, x) => Math.max(m, x.no || 0), 0) + 1, createdAt: Date.now() };
    Object.assign(c, { name, phone: reV(f, 'phone'), note: reV(f, 'note') });
    if (!id) re().customers.push(c);
    reDone();
  },
  're-contr': f => {
    const name = reV(f, 'name');
    if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    const id = reV(f, 'id'), c = id ? reById('contractors', id) : { id: uid(), createdAt: Date.now() };
    Object.assign(c, { name, phone: reV(f, 'phone') });
    if (!id) re().contractors.push(c);
    reDone();
  },
  're-sale': f => {
    const parts = { base: reAmt(f, 'base'), parking: reAmt(f, 'parking'), premium: reAmt(f, 'premium'), extra: reAmt(f, 'extra'), discount: reAmt(f, 'discount') };
    if (!reV(f, 'customerId') && !reV(f, 'newName')) return fail(f, L('ক্রেতা বেছে নিন বা নতুন ক্রেতার নাম লিখুন', 'Pick a buyer or type a new buyer name'), 'newName');
    if (reSalePrice(parts) <= 0) return fail(f, L('মূল দাম লিখুন', 'Enter the base price'), 'base');
    const id = reV(f, 'id'), x = id ? reById('sales', id) : { id: uid(), createdAt: Date.now(), projectId: (re().projects[0] || {}).id || '' };
    Object.assign(x, parts, { unitId: reV(f, 'unitId'), sqft: reAmt(f, 'sqft'), customerId: reCustFrom(f), date: reV(f, 'date') || today(), terms: reV(f, 'terms'), status: reV(f, 'status') });
    x.price = reSalePrice(x);
    if (!id) re().sales.push(x);
    const u = reById('units', x.unitId);
    if (u && x.status !== 'cancelled') u.status = 'sold';
    const fb = reV(f, 'fromBooking'), b = fb && reById('bookings', fb);
    if (b) b.status = 'converted';
    reDone();
  },
  're-book': f => {
    if (!reV(f, 'customerId') && !reV(f, 'newName')) return fail(f, L('ক্রেতা বেছে নিন বা নতুন ক্রেতার নাম লিখুন', 'Pick a buyer or type a new buyer name'), 'newName');
    const id = reV(f, 'id'), b = id ? reById('bookings', id) : { id: uid(), createdAt: Date.now(), projectId: (re().projects[0] || {}).id || '' };
    Object.assign(b, { unitId: reV(f, 'unitId'), customerId: reCustFrom(f), date: reV(f, 'date') || today(), ref: reV(f, 'ref'), agreed: reAmt(f, 'agreed'), deposit: reAmt(f, 'deposit'), terms: reV(f, 'terms'), status: reV(f, 'status') });
    if (!id) re().bookings.push(b);
    const u = reById('units', b.unitId);
    if (u && b.status === 'booked' && u.status === 'available') u.status = 'reserved';
    reDone();
  },
});
Object.assign(LIVE, {
  're-sale': (f, t) => {
    if (t && t.name === 'unitId') {
      const u = reById('units', t.value);
      if (u) { if (!toNum(f.elements.sqft.value)) f.elements.sqft.value = u.sqft || ''; if (!toNum(f.elements.base.value)) f.elements.base.value = u.price || ''; }
    }
    const p = $('[data-re-price]', f);
    if (p) p.textContent = reM(reSalePrice({ base: reAmt(f, 'base'), parking: reAmt(f, 'parking'), premium: reAmt(f, 'premium'), extra: reAmt(f, 'extra'), discount: reAmt(f, 'discount') }));
  },
});

/* ---------- গাইড ও রেজিস্টার ---------- */
function reGuide() {
  return `${sheetHead(L('রিয়েল এস্টেট: কিভাবে ব্যবহার করবেন', 'Real estate: how to use'))}
    <ol class="howlist">${[
      L('<b>ইউনিট</b> ট্যাবে প্রজেক্ট আর ইউনিট (দাম, Sqft, অবস্থা) রাখুন।', 'Keep projects and units (price, sqft, status) in the <b>Units</b> tab.'),
      L('<b>টাকা → বিক্রি</b>: ইউনিট বিক্রি লিখুন। বিক্রি খুলে "টাকা পেলাম" দিয়ে প্রতিটা আদায় রেকর্ড করুন; বাকি নিজে থেকে বের হয়।', '<b>Money → Sales</b>: record a sale, open it and tap "Receive payment" for each collection. The due is worked out for you.'),
      L('<b>বুকিং</b>: বুকিং মানি লিখুন, পরে এক ট্যাপে বিক্রিতে রূপান্তর করুন।', '<b>Bookings</b>: record booking money, convert to a sale in one tap later.'),
      L('<b>খরচ</b>: ঠিকাদার বিল, মালামাল, ফি। <b>ভাগাভাগি</b>: পাইলিংয়ের মতো খরচ সব ক্রেতার মধ্যে Sqft অনুযায়ী ভাগ হয়।', '<b>Costs</b>: contractor bills, materials, fees. <b>Shares</b>: a cost like piling is split across buyers by sqft.'),
      L('নেট নগদ = রেকর্ড করা আদায় − দেওয়া খরচ। কিছু রেকর্ড না করলে হিসাবে আসে না।', 'Net cash = recorded collections − paid costs. Unrecorded money is not counted.'),
      L('🧪 চিহ্নিত রেকর্ড ওয়েবসাইটের নমুনা ডেটা; আসল ডেটা বসিয়ে "আরও" থেকে সরিয়ে দিন।', '🧪-marked records are website sample data; remove them from "More" once you enter real data.'),
    ].map((t, i) => `<li><span class="sn">${i + 1}</span><div>${t}</div></li>`).join('')}</ol>`;
}
registerModule({
  id: 'realestate',
  pin: '1111', // সাময়িক লক; শুধু চোখের আড়াল, আসল নিরাপত্তা না। সবার জন্য খুলতে এই লাইন মুছুন
  icon: 'building',
  emoji: '🏢',
  short: () => L('রিয়েল এস্টেট', 'Real estate'),
  name: () => L('রিয়েল এস্টেট', 'Real estate'),
  tagline: () => L('প্রজেক্ট, ইউনিট বিক্রি, আদায়, নির্মাণ খরচ ও খরচ ভাগাভাগি', 'Projects, unit sales, collections, construction costs and cost sharing'),
  migrate: reMigrate,
  hasData: s => !!(s.realestate && s.realestate.started),
  backupSummary: s => (s.realestate && s.realestate.started ? L(`${cnt((s.realestate.units || []).length)} ইউনিট, ${cnt((s.realestate.sales || []).length)} বিক্রি`, `${(s.realestate.units || []).length} unit(s), ${(s.realestate.sales || []).length} sale(s)`) : ''),
  ready: () => re().started,
  welcome: reWelcome,
  context: () => ({}),
  topbar: reTopbar,
  guide: reGuide,
  tabs: [
    { id: 'home', icon: 'home', label: () => L('হোম', 'Home'), view: () => reHome() },
    { id: 'units', icon: 'building', label: () => L('ইউনিট', 'Units'), view: () => reUnitsTab() },
    { id: 'money', icon: 'wallet', label: () => L('টাকা', 'Money'), view: () => reMoneyTab() },
    { id: 'people', icon: 'users', label: () => L('মানুষ', 'People'), view: () => rePeopleTab() },
    { id: 'more', icon: 'grid', label: () => L('আরও', 'More'), view: () => reMoreTab() },
  ],
});
