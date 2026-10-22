'use strict';

/* =========================================================
   ডেমো ডেটা: সব মডিউলের সব ধরনের লেনদেন একবারে (পরীক্ষা ও বাগ খোঁজার জন্য)
   - উপরে একটা বাটন আসে। একবার চাপলে (বা ✕ দিলে) বাটন চিরতরে চলে যায়।
   - চাপলে এই ফোনের এখনকার সব ডেটা মুছে শুধু ডেমো ডেটা থাকে।
   - ডেমো রেকর্ডে demo: true আছে। পুরোটা সরাতে: index.html ও sw.js থেকে এই ফাইল বাদ দিন।
   ========================================================= */

function demoBuild() {
  const td = today(), d = n => dayShift(td, n), ym0 = td.slice(0, 7), ymN = n => tcYmAdd(ym0, n);
  const tag = o => Object.assign(o, { demo: true });
  const S = { settings: { lang: state.settings.lang || 'bn', rates: { CNY: 17, USD: 122 }, lastBackup: 0, module: 'trade', onboarded: true, demoUsed: true } };

  /* ---------- ব্যবসা ---------- */
  const b = tag(newBatch({ name: 'ডেমো: চীন থেকে গ্যাজেট', capital: 50000, target: 65000, days: 60, startDate: d(-30), returnRate: 5, codRate: 1 }));
  const P = (name, emoji, units, input, cur, rate, weight) => ({ id: uid(), createdAt: Date.now(), name, emoji, units, priceMode: 'unit', currency: cur, priceInput: input, rate: cur === 'BDT' ? '' : rate, unitCost: input * (cur === 'BDT' ? 1 : rate), weight, note: '' });
  const fan = P('মিনি ফ্যান', '🧸', 40, 22, 'CNY', 17, 0.2), ear = P('ইয়ারবাড', '🎧', 30, 6, 'USD', 122, 0.1), lamp = P('LED ল্যাম্প', '💡', 25, 350, 'BDT', '', 0.3);
  b.products.push(fan, ear, lamp);
  const E = (category, amount, date, productId, note) => ({ id: uid(), createdAt: Date.now(), category, productId: productId || '', amount, perUnit: false, perUnitAmount: '', date, note: note || '' });
  b.expenses.push(E('shipping', 6500, d(-25), '', 'কার্গো'), E('shipping', 1800, d(-22), '', 'কাস্টমস'), E('ads', 4000, d(-18), fan.id, 'ফেসবুক অ্যাড'), E('ads', 2500, d(-10), '', 'রিলস বুস্ট'), E('packaging', 900, d(-15)), E('courier', 600, d(-8)), E('other', 400, d(-5), '', 'ছবি তোলা'));
  const Sa = (p, qty, price, status, date, o) => Object.assign({ id: uid(), createdAt: Date.now(), productId: p.id, qty, price, status, discount: 0, discountMode: 'amt', discountValue: 0, returnCost: 0, cod: 1, date, note: '' }, o || {});
  b.sales.push(Sa(fan, 10, 1000, 'delivered', d(-14)), Sa(fan, 6, 950, 'delivered', d(-9), { discount: 300, discountMode: 'amt', discountValue: 300 }), Sa(fan, 4, 1000, 'pending', d(-2)), Sa(fan, 2, 1000, 'returned', d(-7), { returnCost: 120 }),
    Sa(ear, 12, 750, 'delivered', d(-12)), Sa(ear, 5, 700, 'pending', d(-1)), Sa(lamp, 8, 600, 'delivered', d(-6)));
  S.batches = [b]; S.activeBatchId = b.id;
  const b2 = tag(newBatch({ name: 'ডেমো: ঈদ কালেকশন (পুরোনো)', capital: 20000, target: 26000, days: 20, startDate: d(-90) })); S.batches.push(b2);

  /* ---------- বাজার সদাই ---------- */
  const mk = (name, date, status, items, pays, o) => tag(Object.assign({ id: uid(), name, date, status, shop: 'কাঁচাবাজার', shopper: 'আমি', budget: 300000, discount: 0, catBudgets: {}, items, payments: pays || [], receipts: [], createdAt: Date.now(), updatedAt: Date.now() }, o || {}));
  const It = (name, cat, qty, unit, est, status, aQty, aPrice, shop) => bzNewItem({ name, cat, qty, unit, est, status, aQty: aQty || 0, aPrice: aPrice == null ? null : aPrice, shop: shop || '' });
  const m1 = mk('ডেমো: সাপ্তাহিক বাজার', d(-3), 'done', [It('চাল', 'grain', 5000, 'কেজি', 7000, 'done', 5000, 7500), It('ডাল', 'grain', 2000, 'কেজি', 13000, 'done', 2000, 12500), It('রুই মাছ', 'fish', 1500, 'কেজি', 28000, 'partial', 1000, 29000), It('সবজি', 'veg', 3000, 'কেজি', 6000, 'done', 3000, 5500), It('সয়াবিন তেল', 'oil', 2000, 'লিটার', 18000, 'na'), It('ডিম', 'fish', 12000, 'পিস', 1300, 'done', 12000, 1400)], [{ id: uid(), amt: 50000, method: 'cash', date: d(-3), createdAt: Date.now() }], { discount: 2000, catBudgets: { fish: 50000 } });
  const m2 = mk('ডেমো: আজকের বাজার', td, 'active', [It('চিনি', 'oil', 1000, 'কেজি', 12500, 'todo'), It('দুধ', 'dairy', 2000, 'লিটার', 9000, 'todo'), It('কলা', 'fruit', 12000, 'পিস', 1000, 'todo'), It('সাবান', 'clean', 3000, 'পিস', 4500, 'todo')]);
  const m3 = mk('ডেমো: বাতিল বাজার', d(-10), 'cancelled', [It('আটা', 'grain', 2000, 'কেজি', 5500, 'todo')]);
  S.bazar = { schema: BZ_SCHEMA, markets: [m1, m2, m3], cats: [], stock: [{ id: uid(), name: 'ডিটারজেন্ট', unit: 'প্যাকেট', qty: 1000, min: 2000, lastDate: d(-20), lastPrice: 14000, note: '', createdAt: Date.now(), demo: true }], templates: [{ id: uid(), name: 'নিয়মিত তালিকা', items: [{ name: 'চাল', qty: 5000, unit: 'কেজি', est: 7000, cat: 'grain' }, { name: 'ডিম', qty: 12000, unit: 'পিস', est: 1300, cat: 'fish' }], createdAt: Date.now(), demo: true }], activeId: m2.id, autoStock: false };
  bzApplyStock(S.bazar, m1);

  /* ---------- আড্ডা ও যৌথ খরচ ---------- */
  const names = ['রাফি', 'তানভীর', 'সুমি', 'নাদিম', 'মিতা'];
  const friends = names.map(n => tag({ id: uid(), name: n, phone: '', note: '', createdAt: Date.now() }));
  const mkEv = (name, type, start, status, ppl) => {
    const ev = tag({ id: uid(), name, type, start, end: '', location: '', notes: '', status, createdAt: Date.now(), updatedAt: Date.now(), cats: hgCatsFor(type), participants: [], expenses: [], transfers: [], refunds: [], decisions: [], history: [], dues: [] });
    (ppl || []).forEach((n, i) => { const f = friends.find(x => x.name === n); ev.participants.push(hgNewParticipant(n, { friendId: f ? f.id : null, org: i === 0 })); });
    hgEnsureMe(ev); return ev;
  };
  const pid = (ev, n) => ev.participants.find(p => p.name === n).id;
  const X = (ev, title, category, date, total, payers, method, spec, o) => {
    const ids = ev.participants.map(p => p.id), sp = hgSplit(total, method, ids, spec), alloc = Object.fromEntries(ids.map(i => [i, (sp.alloc || {})[i] || 0]));
    const x = Object.assign({ id: uid(), createdAt: Date.now(), updatedAt: Date.now(), mode: 'split', title, category, date, desc: '', total, payers, method, spec, alloc, personal: null, meta: {} }, o || {});
    ev.expenses.push(x); return x;
  };
  const M = v => Math.round(v * 100);
  const trip = mkEv('ডেমো: কক্সবাজার ট্রিপ', 'tour', d(-12), 'active', names);
  const all = trip.participants.map(p => p.id), T = n => pid(trip, n);
  X(trip, 'হোটেল ভাড়া', 'hotel', d(-12), M(12000), [{ pid: T('রাফি'), amt: M(8000) }, { pid: T('তানভীর'), amt: M(4000) }], 'equal', { incl: all, values: {} });
  X(trip, 'মাইক্রোবাস', 'transport', d(-12), M(9000), [{ pid: T('নাদিম'), amt: M(9000) }], 'exact', { incl: all, values: Object.fromEntries(all.map((i, k) => [i, M([2000, 2000, 1500, 2000, 1500][k])])) });
  X(trip, 'জ্বালানি', 'fuel', d(-11), M(3000), [{ pid: T('রাফি'), amt: M(3000) }], 'percent', { incl: all, values: Object.fromEntries(all.map((i, k) => [i, [30, 20, 20, 15, 15][k]])) });
  X(trip, 'সী-ফুড ডিনার', 'food', d(-11), M(4500), [{ pid: T('সুমি'), amt: M(4500) }], 'ratio', { incl: all, values: Object.fromEntries(all.map((i, k) => [i, [2, 1, 1, 2, 1][k]])) });
  X(trip, 'বোটিং টিকেট', 'tickets', d(-10), M(1500), [{ pid: T('মিতা'), amt: M(1500) }], 'selected', { incl: [T('মিতা'), T('সুমি'), T('রাফি')], values: {} });
  const sh = X(trip, 'সুভেনির (নিজের)', 'other', d(-10), M(800), [{ pid: T('তানভীর'), amt: M(800) }], 'selected', { incl: [T('তানভীর')], values: {} }); sh.personal = T('তানভীর');
  trip.transfers.push({ id: uid(), createdAt: Date.now(), status: 'confirmed', kind: 'advance', from: T('সুমি'), to: T('রাফি'), amt: M(2000), date: d(-13), note: 'বুকিং', purpose: '' }, { id: uid(), createdAt: Date.now(), status: 'confirmed', kind: 'settlement', from: T('নাদিম'), to: T('রাফি'), amt: M(1000), date: d(-5), note: '', purpose: '' });
  trip.refunds.push({ id: uid(), createdAt: Date.now(), expenseId: trip.expenses[0].id, amt: M(1000), by: T('রাফি'), date: d(-9), note: 'হোটেল ফেরত' });
  trip.decisions.push({ id: uid(), createdAt: Date.now(), opinions: {}, pid: T('মিতা'), side: 'payable', type: 'partial_agreement', amt: M(500), others: [], reason: 'বাকিটা পরে', orgNote: '', status: 'agreed', date: d(-4) });
  trip.dues.push({ id: uid(), dir: 'owe', who: 'গাড়ির ড্রাইভার', title: 'বাকি ভাড়া', amt: M(1500), date: d(-11), payments: [{ id: uid(), amt: M(500), date: d(-8), createdAt: Date.now() }], expenseId: null, createdAt: Date.now() });

  const adda = mkEv('ডেমো: শুক্রবারের আড্ডা', 'hangout', d(-20), 'settled', ['রাফি', 'তানভীর', 'সুমি']);
  const A = adda.participants.map(p => p.id);
  X(adda, 'চা-নাস্তা', 'food', d(-20), M(900), [{ pid: A[0], amt: M(900) }], 'equal', { incl: A, values: {} });
  X(adda, 'রিকশা', 'transport', d(-20), M(300), [{ pid: A[1], amt: M(300) }], 'equal', { incl: A, values: {} });
  adda.transfers.push({ id: uid(), createdAt: Date.now(), status: 'confirmed', kind: 'settlement', from: A[1], to: A[0], amt: M(100), date: d(-19), note: '', purpose: '' });

  const rest = mkEv('ডেমো: রেস্টুরেন্ট ডিনার', 'restaurant', d(-6), 'active', ['তানভীর', 'নাদিম', 'মিতা']);
  const R = rest.participants.map(p => p.id);
  X(rest, 'বিরিয়ানি ও পানীয়', 'food', d(-6), M(2400), [{ pid: R[0], amt: M(2400) }], 'equal', { incl: R, values: {} });
  X(rest, 'ভ্যাট ও সার্ভিস চার্জ', 'vat', d(-6), M(360), [{ pid: R[0], amt: M(360) }], 'equal', { incl: R, values: {} });
  X(rest, 'ডিসকাউন্ট', 'discount', d(-6), M(200), [{ pid: R[0], amt: M(200) }], 'equal', { incl: R, values: {} });

  const bday = mkEv('ডেমো: জন্মদিন (আর্কাইভ)', 'birthday_home', d(-60), 'archived', ['রাফি', 'সুমি']);
  X(bday, 'কেক', 'cake', d(-60), M(1800), [{ pid: bday.participants[0].id, amt: M(1800) }], 'equal', { incl: bday.participants.map(p => p.id), values: {} });

  const shop = mkEv('ডেমো: ঈদের শপিং', 'shopping', d(-8), 'active', ['রিমি', 'তানভীর']);
  const SH = shop.participants.map(p => p.id), SP = n => shop.participants.find(p => p.name === n).id;
  X(shop, 'রিমির শাড়ি', 'shopping', d(-7), M(3200), [{ pid: SH[0], amt: M(3200) }], 'selected', { incl: [SP('রিমি')], values: {} }, { desc: 'লাল জামদানি, নিউমার্কেট' });
  X(shop, 'তানভীরের পাঞ্জাবি', 'shopping', d(-6), M(2400), [{ pid: SP('তানভীর'), amt: M(2400) }], 'selected', { incl: [SP('তানভীর')], values: {} });
  X(shop, 'সবার জন্য মিষ্টি ও উপহার', 'shopping', d(-4), M(1800), [{ pid: SH[0], amt: M(1800) }], 'equal', { incl: SH, values: {} });
  X(shop, 'অটো ভাড়া', 'other', d(-6), M(300), [{ pid: SH[0], amt: M(300) }], 'equal', { incl: SH, values: {} });
  shop.plan = { mode: 'total', total: M(15000), each: 0, people: 3, split: { shopping: 85, other: 5 }, tpl: 'shopping' };
  shop.dues.push({ id: uid(), dir: 'owe', who: 'নিউমার্কেটের দোকানদার', title: 'জুতা বাকিতে', amt: M(900), date: d(-5), payments: [], expenseId: null, createdAt: Date.now(), demo: true });
  const trv = mkEv('ডেমো: অফিসে যাতায়াত (মাস)', 'transport', d(-12), 'active', []);
  const ts = (title, cat, date, total) => { const x = hgSimpleExpense(trv, { title, category: cat, date, total: M(total) }); trv.expenses.push(x); };
  ts('বাস ভাড়া', 'transport', d(-10), 220); ts('সিএনজি', 'transport', d(-7), 380); ts('বাইকের তেল', 'fuel', d(-5), 600); ts('পার্কিং', 'toll', d(-2), 100);

  const house = mkEv('ডেমো: মাসিক সংসার খরচ', 'household', d(-70), 'active', []);
  const hs = (title, cat, date, total, info, pays) => { const x = hgSimpleExpense(house, { title, category: cat, date, total: M(total), info, pays: pays || [] }); house.expenses.push(x); return x; };
  const hhm = (ym) => hgMonth(house, ym);
  [-2, -1, 0].forEach(k => {
    const ym = ymN(k), m = hhm(ym);
    Object.assign(m, { budget: M(40000), opening: k === -2 ? M(45000) : M(38000), carry: 0, cats: { groceries: M(12000), electricity: M(2500), internet: M(1200), education: M(5000), medical: M(3000) } });
    if (k === -1) m.inc.push({ id: uid(), kind: 'extra', amt: M(5000), note: 'বোনাস', date: tcDate(ym, 10), createdAt: Date.now() });
    if (k === 0) m.inc.push({ id: uid(), kind: 'borrow', amt: M(3000), note: 'ভাইয়ের কাছ থেকে', date: tcDate(ym, 5), createdAt: Date.now() });
    const pay = (a, dt) => [{ id: uid(), amt: M(a), date: dt, method: 'mobile', note: '', createdAt: Date.now() }];
    hs('বাজার (মাস)', 'groceries', tcDate(ym, 8), 11500, { kind: 'market', shop: 'কাঁচাবাজার' }, pay(11500, tcDate(ym, 8)));
    hs('বিদ্যুৎ বিল', 'electricity', tcDate(ym, 12), 2300 + k * 150, { kind: 'bill', label: 'প্রিপেইড মিটার', ym, base: M(2200), extra: M(100), prev: 1200, curr: 1320, dueDate: tcDate(ym, 20) }, k === 0 ? [] : pay(2300, tcDate(ym, 15)));
    hs('ইন্টারনেট বিল', 'internet', tcDate(ym, 5), 1200, { kind: 'bill', label: 'ওয়াইফাই', ym, base: M(1200), dueDate: tcDate(ym, 10) }, k === 0 ? pay(600, tcDate(ym, 6)) : pay(1200, tcDate(ym, 7)));
    hs('স্কুল ফি', 'education', tcDate(ym, 10), 3500, { kind: 'edu', student: 'আরিফ', teacher: 'রহিম স্যার', subject: 'গণিত', ym, base: M(3500), dueDate: tcDate(ym, 15) }, k === -2 ? pay(3500, tcDate(ym, 11)) : []);
    if (k === -1) { hs('ডাক্তার ভিজিট', 'medical', tcDate(ym, 18), 1800, { kind: 'visit', patient: 'মা', doctor: 'ডা. করিম', specialty: 'মেডিসিন', hospital: 'সিটি ক্লিনিক', fee: M(800), tests: M(1000) }, pay(1800, tcDate(ym, 18))); hs('ওষুধ', 'medical', tcDate(ym, 19), 650, { kind: 'med', patient: 'মা', med: 'প্যারাসিটামল', unit: M(65), packs: 10 }, pay(650, tcDate(ym, 19))); }
    if (k === 0) hs('কাজের বুয়ার বেতন', 'househelp', tcDate(ym, 1), 3000, {}, pay(3000, tcDate(ym, 1)));
  });
  house.dues.push({ id: uid(), dir: 'owe', who: 'ভাই', title: 'ধার নেওয়া টাকা', amt: M(3000), date: tcDate(ymN(0), 5), payments: [], expenseId: null, createdAt: Date.now() });
  house.hh.people = [{ id: uid(), name: 'মা' }, { id: uid(), name: 'আরিফ' }];

  S.hangout = { schema: HG_SCHEMA, friends, events: [trip, adda, rest, bday, shop, trv, house] };

  /* ---------- শিক্ষক ---------- */
  const t = tcBlank(); S.teacher = t;
  t.openingCash = M(5000); t.budget = { total: M(15000), cats: { print: M(1500), rent: M(6000) } };
  const stm = (a, o) => Object.assign(a, { demo: true }, o || {});
  const job = stm({ id: uid(), name: 'আদর্শ উচ্চ বিদ্যালয়', role: 'সহকারী শিক্ষক', info: '', salary: [{ from: ymN(-3), amt: M(20000) }, { from: ymN(0), amt: M(22000) }], payDay: 5, start: tcDate(ymN(-3), 1), end: '', active: true, sched: [{ id: uid(), label: '৯ম শ্রেণি', days: ['sun', 'tue'], time: '09:00', dur: 45, place: 'স্কুল' }] });
  t.jobs.push(job);
  const center = stm({ id: uid(), name: 'সফলতা কোচিং সেন্টার', info: 'মিরপুর' }); t.centers.push(center);
  const bt1 = stm({ id: uid(), name: 'ব্যাচ ক (দশম)', code: 'A-10', cls: 'দশম', subject: 'পদার্থ', centerId: center.id, fee: M(800), days: ['sat', 'mon', 'wed'], time: '16:00', dur: 90, place: 'রুম ১', start: tcDate(ymN(-3), 1), end: '', active: true });
  const bt2 = stm({ id: uid(), name: 'ব্যাচ খ (নবম)', code: 'B-9', cls: 'নবম', subject: 'গণিত', centerId: center.id, fee: M(700), days: ['sun', 'tue'], time: '17:30', dur: 60, place: 'রুম ২', start: tcDate(ymN(-3), 1), end: '', active: true });
  t.batches.push(bt1, bt2);
  const sub = (name, mode, fee, days, time) => ({ id: uid(), name, mode, fees: [{ from: ymN(-3), amt: M(fee) }], days, time, dur: 60, place: 'ছাত্রের বাসা', active: true });
  const stu = (name, cls, status, subs, o) => stm({ id: uid(), name, cls, school: 'ঢাকা স্কুল', phone: '', guardian: '', notes: '', status, start: tcDate(ymN(-3), 1), end: '', subjects: subs, docs: [] }, o);
  const s1 = stu('রহিম', 'নবম', 'active', [sub('গণিত', 'month', 1500, ['sat', 'wed'], '10:00'), sub('ইংরেজি', 'class', 300, ['mon'], '15:00')]);
  const s2 = stu('করিম', 'অষ্টম', 'active', [sub('সাধারণ বিজ্ঞান', 'month', 1200, ['sun'], '11:00')]);
  const s3 = stu('সুমি', 'দশম', 'paused', [sub('রসায়ন', 'month', 1800, ['tue'], '18:30')]);
  const s4 = stu('নাফিস', 'সপ্তম', 'left', [sub('গণিত', 'month', 1000, ['thu'], '16:00')], { end: tcDate(ymN(-1), 20), start: tcDate(ymN(-3), 1) });
  t.students.push(s1, s2, s3, s4);
  const en = (s, b, from, to, fee) => stm({ id: uid(), studentId: s.id, batchId: b.id, from, to: to || '', fees: [{ from, amt: M(fee) }] });
  t.enrolls.push(en(s1, bt1, ymN(-3), '', 800), en(s2, bt1, ymN(-3), '', 800), en(s3, bt2, ymN(-3), '', 700), en(s1, bt2, ymN(-2), ymN(-1), 700), en(s4, bt2, ymN(-3), ymN(-1), 700));
  t.recurs.push(stm({ id: uid(), name: 'রুম ভাড়া', cat: 'rent', amts: [{ from: ymN(-3), amt: M(5000) }], day: 1, from: ymN(-3), to: '', active: true, batchId: bt1.id, src: 'coaching' }), stm({ id: uid(), name: 'সহকারী: রিনা ম্যাডাম', cat: 'staff', amts: [{ from: ymN(-3), amt: M(3000) }], day: 7, from: ymN(-3), to: '', active: true, batchId: bt2.id, src: 'coaching' }), stm({ id: uid(), name: 'ইন্টারনেট', cat: 'utility', amts: [{ from: ymN(-3), amt: M(800) }], day: 10, from: ymN(-3), to: '', active: true, src: 'coaching' }));
  const pays = [], payRef = (side, ref, amt, date, method) => t.pays.push({ id: uid(), side, ref, amt, date, method: method || 'cash', note: '', createdAt: Date.now() });
  [-3, -2, -1, 0].forEach(k => {
    const ym = ymN(k);
    tcPlan(t, ym).forEach(p => {
      if (p.kind === 'recur') t.expenses.push({ id: p.key, key: p.key, date: p.due, amt: p.amt, cat: p.cat, desc: p.who, src: p.jobId || p.batchId ? '' : (p.src || 'other'), jobId: p.jobId, batchId: p.batchId, recurId: p.ref, photos: [], createdAt: Date.now(), demo: true });
      else t.charges.push({ id: p.key, key: p.key, kind: p.kind, ref: p.ref, studentId: p.studentId, batchId: p.batchId, jobId: p.jobId, ym, amt: p.amt, auto: !!p.auto, due: p.due, createdAt: Date.now(), demo: true });
    });
  });
  // সেশন (ক্লাস): চলতি মাসে কিছু সম্পন্ন, অনুপস্থিত, বাতিল, স্থগিত, অতিরিক্ত
  const eng = s1.subjects[1];
  [[-26, 'done'], [-19, 'done'], [-12, 'absent'], [-5, 'cancelled']].forEach(([n, st]) => { const dt = d(n); t.sessions.push({ id: uid(), key: tcSessKey(eng.id, dt), slotId: eng.id, date: dt, status: st, att: {}, createdAt: Date.now(), demo: true }); });
  t.sessions.push({ id: uid(), key: 'x:' + uid(), slotId: eng.id, date: d(-3), time: '18:00', status: 'done', extra: true, att: {}, createdAt: Date.now(), demo: true });
  t.sessions.push({ id: uid(), key: tcSessKey(eng.id, d(-14)), slotId: eng.id, date: d(-14), status: 'postponed', movedTo: { date: d(-13), time: '15:00' }, mst: 'done', att: {}, createdAt: Date.now(), demo: true });
  t.sessions.push({ id: uid(), key: tcSessKey(bt1.id, d(-2)), slotId: bt1.id, date: d(-2), status: 'done', att: { [s2.id]: 'a' }, createdAt: Date.now(), demo: true });
  // পেমেন্ট: পুরো, আংশিক, বাকি, ওভারডিউ সব রকম
  t.charges.forEach((c, i) => {
    const amt = tcCtx(t).amt(c);
    if (c.ym < ymN(0)) { if (i % 4 === 3) return; if (i % 4 === 2) return payRef('in', c.id, Math.round(amt / 2), tcDate(c.ym, 14), 'mobile'); payRef('in', c.id, amt, tcDate(c.ym, c.kind === 'job' ? 5 : 9), i % 2 ? 'cash' : 'mobile'); }
    else if (c.kind === 'job') payRef('in', c.id, amt, tcDate(c.ym, 5), 'bank');
    else if (i % 3 === 0 && amt > 0) payRef('in', c.id, Math.round(amt / 2), td, 'cash');
  });
  const inc = (kind, amt, date, o, got) => { const id = 'm:' + uid(); t.charges.push(Object.assign({ id, key: id, kind, ym: tcYm(date), amt: M(amt), due: date, desc: '', createdAt: Date.now(), demo: true }, o)); if (got) payRef('in', id, M(amt), date); };
  inc('bonus', 5000, d(-20), { jobId: job.id, desc: 'ঈদ বোনাস' }, true); inc('extra', 800, d(-6), { studentId: s2.id, desc: 'অতিরিক্ত ক্লাস' }, false); inc('other', 1500, d(-9), { desc: 'প্রশ্নপত্র লেখার সম্মানী' }, true);
  // খরচ
  const ex = (cat, amt, date, o, paid) => { const e = Object.assign({ id: uid(), cat, amt: M(amt), date, desc: '', photos: [], createdAt: Date.now(), demo: true }, o); t.expenses.push(e); if (paid) payRef('out', e.id, paid === true ? e.amt : M(paid), date); return e; };
  ex('job_travel', 1200, d(-15), { jobId: job.id, desc: 'বাস ভাড়া', src: '' }, true); ex('job_food', 600, d(-14), { jobId: job.id, desc: 'দুপুরের খাবার' }, true); ex('tuition_travel', 900, d(-10), { studentId: s1.id, desc: 'রিকশা' }, true);
  ex('book', 420, d(-18), { studentId: s1.id, desc: 'গণিত গাইড', sup: { item: 'গণিত গাইড', qty: 1, unit: M(420), shop: 'বইমেলা', purpose: 'রহিমের জন্য' } }, true);
  ex('stationery', 140, d(-7), { desc: 'মার্কার', batchId: bt1.id, sup: { item: 'হোয়াইটবোর্ড মার্কার', qty: 4, unit: M(35), shop: 'আলো স্টোর', purpose: 'ব্যাচ ক' } }, true);
  ex('print', 700, d(-4), { desc: 'নোট প্রিন্ট', batchId: bt1.id, sup: { item: 'নোট প্রিন্ট', qty: 350, unit: M(2), shop: 'কম্পিউটার কর্নার', purpose: 'মডেল টেস্ট' } }, 300);
  ex('equip', 3200, d(-25), { desc: 'হোয়াইটবোর্ড', batchId: bt1.id, reusable: true, sup: { item: 'হোয়াইটবোর্ড', qty: 1, unit: M(3200), shop: 'অফিস মার্ট', purpose: 'রুম ১' } }, true);
  ex('repair', 450, d(-3), { desc: 'ফ্যান মেরামত' }, false);
  const exam = stm({ id: uid(), name: 'মাসিক পরীক্ষা (পদার্থ)', date: d(-8), batchId: bt1.id, students: 30, pages: 4, pagePrice: M(2), sheets: 30, sheetPrice: M(8), wasteCopies: 2, extra: M(50), budget: M(500) });
  t.exams.push(exam);
  const ee = { id: uid(), createdAt: Date.now(), photos: [], demo: true, date: exam.date, amt: tcExamCost(exam).total, cat: 'exam', desc: exam.name, batchId: bt1.id, src: '', ref: 'ex:' + exam.id }; t.expenses.push(ee); payRef('out', ee.id, ee.amt, exam.date);
  t.cats.push({ k: 'c_demo', name: 'ডেমো: গেস্ট লেকচার', demo: true }); ex('c_demo', 1000, d(-11), { desc: 'গেস্ট লেকচারার' }, 400);
  return S;
}

/* ---------- একবারের বাটন ---------- */
function demoBarSync() {
  let bar = document.getElementById('demo-bar');
  const show = state && state.settings && !state.settings.demoUsed;
  if (!show) { if (bar) bar.remove(); return; }
  if (bar) return;
  bar = document.createElement('div');
  bar.id = 'demo-bar';
  bar.innerHTML = `<span>🧪 ডেমো ডেটা</span><button type="button" data-demo="load">${isEN() ? 'Load demo (once)' : 'ডেমো লোড (একবার)'}</button><button type="button" data-demo="hide" aria-label="${L('বন্ধ', 'Close')}">✕</button>`;
  document.body.appendChild(bar);
}
function demoLoad() {
  if (!confirm(L('এই ফোনের এখনকার সব ডেটা মুছে যাবে, শুধু ডেমো ডেটা থাকবে। এই বাটন আর আসবে না। চালিয়ে যাবেন?', 'All current data on this phone will be erased and only demo data will remain. This button will not come back. Continue?'))) return;
  try {
    const lang = state.settings.lang, S = demoBuild();
    state = migrate(S); state.settings.lang = lang; state.settings.demoUsed = true;
    sheetOpen && closeSheet(); tab = 'home'; trail = ['home'];
    save(); render(); loadImages(); toast(L('ডেমো ডেটা লোড হয়েছে', 'Demo data loaded'));
  } catch (err) { toast(L('ডেমো লোড হয়নি: ', 'Demo failed: ') + err.message, 'danger'); }
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-demo]'); if (!b) return;
  if (b.dataset.demo === 'hide') { state.settings.demoUsed = true; save(); return demoBarSync(); }
  demoLoad();
});
// "আরও"-তে সব সময় থাকা মেনু (বাটন চলে গেলেও ডেমো আবার আনা যায়)
ACTIONS['demo-load'] = () => demoLoad();
{ const _render = render; render = function () { _render(); demoBarSync(); }; }
