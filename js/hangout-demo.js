'use strict';

/* =========================================================
   Hangout: ডেমো ডেটা (শুধু দেখে পরীক্ষা করার জন্য, সাময়িক)
   - প্রথমবার চালালে একবার যোগ হয়। "আরও" ট্যাব থেকে এক ট্যাপে মোছা বা আবার আনা যায়।
   - সব সংখ্যা আসল হিসাব-ইঞ্জিন (hgEventCalc) দিয়েই মেলে, হাতে বসানো ফলাফল নেই।
   - মুছতে চাইলে এই ফাইল আর boot.js-এর একটা লাইন সরালেই হয়।
   ========================================================= */

const HG_DEMO_NAMES = ['সাকিব', 'রাফি', 'মিম', 'তানভীর'];
function hgDemoBuild() {
  const T = n => Math.round(n * 100);
  const dAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return dateOf(d.getTime()); };
  const now = Date.now();
  const friends = HG_DEMO_NAMES.map((n, i) => ({ id: 'demo-f' + i, name: n, phone: i === 0 ? '' : '01700-00000' + i, note: '', createdAt: now, demo: true }));
  const mkPeople = names => names.map((n, i) => ({ id: 'demo-p' + i, friendId: 'demo-f' + i, name: n, phone: '', note: '', active: true, org: i === 0 }));
  const exp = (ev, o) => {
    const x = Object.assign({ id: 'demo-e' + (ev.expenses.length + 1), desc: '', mode: 'split', meta: {}, createdAt: now, updatedAt: now, payers: [] }, o);
    ev.expenses.push(x);
    const r = hgExpenseAlloc(ev, x); x.alloc = r.alloc || {};
    return x;
  };
  const log = (ev, bn, en) => ev.history.push({ id: uid(), at: now, bn, en });

  /* ---- ইভেন্ট ১: ভ্রমণ (চলমান, সব ফিচারের নমুনা) ---- */
  const trip = { id: 'demo-ev1', demo: true, name: "[Demo] Cox's Bazar Trip", type: 'tour', start: dAgo(4), end: dAgo(2), location: "Cox's Bazar", notes: 'ডেমো ডেটা: শুধু দেখার জন্য / Demo data for inspection',
    status: 'active', createdAt: now, updatedAt: now, cats: hgCatsFor('tour'), participants: mkPeople(HG_DEMO_NAMES), expenses: [], transfers: [], refunds: [], decisions: [], history: [] };
  const [S, R, M, N] = trip.participants.map(p => p.id);
  const all = [S, R, M, N];
  exp(trip, { title: 'বাসভাড়া / Bus tickets', category: 'transport', date: dAgo(4), total: T(6400), payers: [{ pid: S, amt: T(6400) }], method: 'equal', spec: { incl: all, values: {} } });
  exp(trip, { title: 'হোটেল রুম / Hotel rooms', category: 'hotel', date: dAgo(4), total: T(10000), payers: [{ pid: R, amt: T(6000) }, { pid: M, amt: T(4000) }], method: 'ratio', spec: { incl: all, values: { [S]: 2, [R]: 2, [M]: 2, [N]: 1 } },
    desc: '২ রুম × ২ রাত × ২,৫০০; তানভীর ১ রাত ছিল', meta: { rooms: '2', nights: '2', rate: '2500' } });
  exp(trip, { title: 'সৈকতে দুপুরের খাবার / Beach lunch', category: 'food', date: dAgo(3), total: T(3300), payers: [{ pid: M, amt: T(3300) }], method: 'selected', spec: { incl: [S, R, M], values: {} }, desc: 'তানভীর খায়নি' });
  exp(trip, { title: 'ঘোরাঘুরির টিকেট / Tickets', category: 'tickets', date: dAgo(3), total: T(1200), payers: [{ pid: N, amt: T(1200) }], method: 'custom', spec: { incl: all, values: { [S]: T(400), [R]: T(300), [M]: T(300), [N]: T(200) } } });
  const bill = { items: [
    { id: 'i1', name: 'Grilled fish', unit: T(1200), qty: 1, type: 'individual', orderedBy: R, status: 'ok' },
    { id: 'i2', name: 'Chicken biryani', unit: T(450), qty: 2, type: 'shared', multi: true, sharers: [S, M], weights: { [S]: 1, [M]: 1 }, status: 'ok' },
    { id: 'i3', name: 'Seafood platter', unit: T(1800), qty: 1, type: 'shared', sharers: all, weights: {}, status: 'ok' },
    { id: 'i4', name: 'Soft drink', unit: T(60), qty: 4, type: 'shared', multi: true, sharers: all, weights: { [S]: 1, [R]: 1, [M]: 1, [N]: 1 }, status: 'ok' },
    { id: 'i5', name: 'Dessert (cancelled)', unit: T(300), qty: 1, type: 'individual', orderedBy: N, status: 'cancelled' },
  ], charges: [
    { id: 'c1', kind: 'discount', name: 'Promo discount', amt: T(200), scope: null, method: 'proportional', values: {} },
    { id: 'c2', kind: 'charge', name: 'VAT 15%', amt: T(591), scope: null, method: 'proportional', values: {} },
  ] };
  const b = hgBill(bill, all);
  exp(trip, { title: 'Sea Pearl ডিনার / Dinner', category: 'food', date: dAgo(3), total: b.total, payers: [{ pid: S, amt: b.total }], method: 'bill', mode: 'bill', spec: {}, bill, billActual: b.total, desc: 'আইটেম অনুযায়ী বিল' });
  trip.refunds.push({ id: 'demo-r1', expenseId: 'demo-e2', amt: T(500), by: R, date: dAgo(2), note: 'এক রাতের আংশিক ফেরত', createdAt: now });
  trip.transfers.push({ id: 'demo-t1', kind: 'advance', from: N, to: S, amt: T(2000), date: dAgo(5), note: '', purpose: 'বাস বুকিংয়ের অ্যাডভান্স', createdAt: now, status: 'confirmed' });
  trip.transfers.push({ id: 'demo-t2', kind: 'settlement', from: N, to: R, amt: T(1000), date: dAgo(1), note: 'আংশিক পরিশোধ', purpose: '', createdAt: now, status: 'confirmed' });
  const c1 = hgEventCalc(trip);
  const debtor = all.filter(id => c1.final[id] < 0).sort((a, z) => c1.final[a] - c1.final[z])[0];
  const creditor = all.filter(id => c1.final[id] > 0).sort((a, z) => c1.final[z] - c1.final[a])[0];
  if (debtor) trip.decisions.push({ id: 'demo-d1', pid: debtor, side: 'payable', type: 'waive_partial', amt: T(300), others: [], reason: 'বন্ধুরা সম্মত: ৳৩০০ মাফ', orgNote: 'ট্রিপের শেষে সবাই একমত', status: 'finalized', date: dAgo(1), createdAt: now, finalizedAt: now + 1,
    opinions: Object.fromEntries(all.filter(id => id !== debtor).map(id => [id, { s: 'agreed', note: '' }])) });
  if (creditor) trip.decisions.push({ id: 'demo-d2', pid: creditor, side: 'receivable', type: 'gift', amt: null, others: [], reason: 'বেশি দেওয়া টাকা ফেরত না নেওয়ার প্রস্তাব', orgNote: '', status: 'awaiting', date: dAgo(1), createdAt: now + 2, finalizedAt: null,
    opinions: { [all.find(id => id !== creditor)]: { s: 'no_response', note: '' } } });
  const second = all.filter(id => id !== debtor && id !== creditor)[0];
  trip.decisions.push({ id: 'demo-d3', pid: second, side: debtor === second ? 'payable' : (c1.final[second] < 0 ? 'payable' : 'receivable'), type: 'disputed', amt: null, others: [], reason: 'অঙ্ক নিয়ে আলোচনা চলছে', orgNote: '', status: 'disputed', date: dAgo(1), createdAt: now + 3, finalizedAt: null, opinions: {} });
  log(trip, 'ডেমো ইভেন্ট তৈরি হয়েছে', 'Demo event created');

  /* ---- ইভেন্ট ২: ডিনার (মিটে যাওয়া) ---- */
  const dinner = { id: 'demo-ev2', demo: true, name: '[Demo] Friday Dinner', type: 'restaurant', start: dAgo(11), end: '', location: 'Dhanmondi', notes: 'ডেমো ডেটা',
    status: 'settled', createdAt: now - 5, updatedAt: now - 5, cats: hgCatsFor('restaurant'), participants: mkPeople(HG_DEMO_NAMES.slice(0, 3)), expenses: [], transfers: [], refunds: [], decisions: [], history: [] };
  const D = dinner.participants.map(p => p.id);
  exp(dinner, { title: 'ডিনার বিল / Dinner bill', category: 'food', date: dAgo(11), total: T(2200), payers: [{ pid: D[1], amt: T(1500) }, { pid: D[0], amt: T(700) }], method: 'equal', spec: { incl: D, values: {} } });
  hgEventCalc(dinner).suggestions.forEach((s, i) => dinner.transfers.push({ id: 'demo-dt' + i, kind: 'settlement', from: s.from, to: s.to, amt: s.amt, date: dAgo(10), note: '', purpose: '', createdAt: now, status: 'confirmed' }));
  dinner.settledAt = now - 5;
  log(dinner, 'ডেমো ইভেন্ট মিটে গেছে', 'Demo event settled');
  return { friends, events: [trip, dinner] };
}
function hgDemoInstall() {
  const d = hgDemoBuild();
  const have = new Set(hg().events.map(e => e.id)), fr = new Set(hg().friends.map(f => f.id));
  d.events.forEach(e => { if (!have.has(e.id)) hg().events.push(e); });
  d.friends.forEach(f => { if (!fr.has(f.id)) hg().friends.push(f); });
}
function hgDemoClear() {
  hg().events = hg().events.filter(e => !e.demo);
  hg().friends = hg().friends.filter(f => !f.demo);
}
// প্রথমবার চালুর সময় একবার: ডেমো ডেটা ঢোকে (যার নিজের কোনো Hangout ইভেন্ট নেই)
function hgSeedDemoOnce() {
  const h = hg();
  if (h.demoSeeded) return;
  h.demoSeeded = true;
  if (!h.events.length) hgDemoInstall();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* সেভ না হলে পরেরবার আবার চেষ্টা */ h.demoSeeded = false; }
}
Object.assign(ACTIONS, {
  'hg-demo-clear': () => {
    if (!confirm(L('ডেমো ইভেন্ট আর ডেমো বন্ধুদের মুছবেন? আপনার নিজের ইভেন্ট ঠিক থাকবে।', 'Remove the demo events and demo friends? Your own events stay.'))) return;
    hgRoute.ev = null; undoable(DELETED(), () => hgDemoClear());
  },
  'hg-demo-load': () => { hgDemoInstall(); commit(L('ডেমো ডেটা যোগ হয়েছে', 'Demo data added')); },
});
