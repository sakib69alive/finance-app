'use strict';

/* =========================================================
   মডিউল টেমপ্লেট: কপি করে js/<id>.js বানান, তারপর MODULES.md-এর ধাপ অনুসরণ করুন।
   এই ফাইল অ্যাপে লোড হয় না, শুধু নমুনা।
   নিচে "example" জায়গায় আপনার মডিউলের আইডি বসান (যেমন personal, hangout)।
   ========================================================= */

// ১) ডেটা: state.example-এর ভেতরেই রাখুন, পুরোনো ব্যাকআপ যেন না ভাঙে সেজন্য শুধু ডিফল্ট যোগ করুন
function exampleMigrate(s) {
  s.example = Object.assign({ items: [] }, s.example || {});
}
const exampleData = () => state.example;

// ২) স্ক্রিন: প্রতিটা ট্যাবের জন্য একটা ফাংশন, HTML স্ট্রিং ফেরত দেয়
function exampleHome() {
  const d = exampleData();
  return `<div class="page-head"><h1>${L('উদাহরণ', 'Example')}</h1>
      <button type="button" class="btn primary sm" data-action="example-add">${icon('plus', 18)} ${L('যোগ', 'Add')}</button></div>
    <section class="card">${d.items.length ? d.items.map(i => `<p>${esc(i.name)}</p>`).join('') : empty('🗒️', L('কিছু নেই', 'Nothing yet'), '')}</section>`;
}
function exampleMore() {
  return `<div class="page-head"><h1>${L('আরও', 'More')}</h1></div>${appSections()}`;
}

// ৩) বাটন, ফর্ম সেভ, লাইভ প্রিভিউ: নিজের নামে রেজিস্ট্রিতে যোগ করুন (নামের আগে মডিউলের আইডি দিন যাতে না মেলে)
Object.assign(ACTIONS, {
  'example-add': () => openSheet(`${sheetHead(L('নতুন', 'New'))}
    <form data-form="example-item" autocomplete="off">
      <label class="field"><span>${L('নাম', 'Name')}</span><input class="input" name="name"></label>
      <button class="btn primary block" type="submit">${L('সেভ করুন', 'Save')}</button>
    </form>`),
});
Object.assign(FORMS, {
  'example-item': f => {
    const name = f.elements.name.value.trim();
    if (!name) return fail(f, L('নাম লিখুন', 'Enter a name'), 'name');
    exampleData().items.push({ id: uid(), name, createdAt: Date.now() });
    closeSheet();
    commit(SAVED());
  },
});
Object.assign(LIVE, {});

// ৪) রেজিস্টার: এতেই টপবারে মডিউল বদলের বাটন আর ট্যাববার নিজে থেকে আসবে
registerModule({
  id: 'example',
  icon: 'grid',
  name: () => L('উদাহরণ মডিউল', 'Example module'),
  tagline: () => L('এক লাইনে কী করে', 'What it does in one line'),
  migrate: exampleMigrate,
  ready: () => true,
  welcome: () => '',
  context: () => ({}),
  topbar: () => `<div class="batch-btn"><span class="logo-sm">${LOGO}</span><span class="bb-text"><b>${L('উদাহরণ', 'Example')}</b></span></div>
    <div class="top-actions">${moduleSwitcher()}${langBtn()}</div>`,
  guide: () => `${sheetHead(L('কিভাবে ব্যবহার করবেন', 'How to use'))}<p>${L('এখানে গাইড লিখুন।', 'Write the guide here.')}</p>`,
  tabs: [
    { id: 'home', icon: 'home', label: () => L('হোম', 'Home'), view: () => exampleHome() },
    { id: 'more', icon: 'grid', label: () => L('আরও', 'More'), view: () => exampleMore() },
  ],
});
