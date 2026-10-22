# Hisabi: how the app is organised, and how to add a new module

Hisabi is one offline app made of **modules**. Each module is a self-contained
feature group with its own tabs, screens and data (today: `trade`, the
product buy-and-sell business). Planned next: shop (cloth, grocery), rent as
an owner, personal money, and friends hang-out cost splitting.

## Files

| File | What lives there |
| --- | --- |
| `js/core.js` | Shared by every module: helpers (`L`, `fmt`, `toNum`…), icons, storage (`state`, `save`, `load`, `migrate`), product photos (IndexedDB), UI kit (`seg`, `moneyInput`, `sheetHead`…), bottom sheets, toast/undo, backup and restore, install help, navigation (`tab`, `setTab`, `render`), the module registry and the action/form/live registries. |
| `js/trade.js` | Everything for the trading module: cost engine, budget, pace, attention list, all its screens, forms, actions, guide. Registers itself at the bottom. |
| `js/boot.js` | Loads data, first render, service worker. Always loaded last. |
| `styles.css` | One shared stylesheet. |
| `sw.js` | Offline cache. Add every new file to `ASSETS` and bump `VERSION`. |

Scripts are plain classic scripts (no bundler). They share one global scope and
are loaded in this order in `index.html`: `core.js`, then modules, then `boot.js`.

## Data model

All data is one JSON object in `localStorage` (`hisabi:v1`) and goes into the backup as is.

```
state = {
  settings: { lang, module, lastBackup, rates },   // shared
  batches, activeBatchId,                          // trade module (old format, kept as is)
  <yourModuleId>: { ... }                          // new modules keep their data under their own key
}
```

Rules for a new module:

- Keep **all** of its data under `state.<moduleId>`. Never touch other keys.
- Fill defaults in the module's `migrate(state)`. It runs on every load and on restore,
  so old backups never break. Only ever add fields, never rename or drop.
- Use `save()` / `commit(msg)` / `undoable(msg, fn)` from core. Do not touch `localStorage` directly.

## Adding a module in 6 steps

1. Create `js/<id>.js` (copy `docs/module-template.js`).
2. Add `<script src="js/<id>.js" defer></script>` to `index.html`, after `trade.js` and before `boot.js`.
3. Add `./js/<id>.js` to `ASSETS` in `sw.js` and bump `VERSION` there and `APP_VERSION` in `js/core.js`.
4. Put its screens, forms and handlers in the file and register them:
   `Object.assign(ACTIONS, {...})`, `Object.assign(FORMS, {...})`, `Object.assign(LIVE, {...})`.
   - `ACTIONS` keys are `data-action` values on buttons.
   - `FORMS` keys are `data-form` values; the handler runs on submit.
   - `LIVE` keys are `data-live` values; the handler runs on every input (live preview).
5. Call `registerModule({...})` at the bottom (see the template).
6. Done. A module switcher appears in the top bar automatically once two modules exist.
   Backup and restore already cover the new data.

## The `registerModule` contract

```js
registerModule({
  id: 'personal',                  // also the state key
  icon: 'wallet',                  // a key of ICONS in core.js
  name: () => L('ব্যক্তিগত হিসাব', 'Personal money'),
  tagline: () => L('...', '...'),  // optional, shown in the module picker
  migrate(state) {},               // defaults for state.personal
  imageIds: () => [],              // optional: ids of IndexedDB photos this module owns
  backupSummary: s => '',          // optional: shown in the restore confirmation
  ready: () => true,               // false shows welcome() with no tab bar (first run)
  welcome: () => '<html>',
  context: () => ({}),             // passed to topbar() and every tab view
  topbar: ctx => '<html>',         // use moduleSwitcher() and langBtn() from core
  guide: () => '<html>',           // opened by More > How to use
  tabs: [{ id, icon, label: () => '', view: ctx => '<html>' }],
});
```

Tab ids may repeat across modules (every module can have `home` and `more`).
Put `appSections()` at the end of a module's `more` screen to get install, backup,
language and version for free.

## Planned modules and their data (sketches)

- **shop**: items, stock, daily sales, expenses, profit per day or month.
- **rent** (as owner): properties and tenants, rent due and received, repair costs.
- **personal**: accounts, income, expenses by category, monthly summary, "where did my money go".
- **hangout** (split costs): people, trips or outings, who paid what, equal or custom
  shares, and a settle-up list (who pays whom, the fewest transfers).

## Checklist before shipping a change

- `node --check js/*.js` passes.
- Open the app, switch through every tab and open each sheet. Console must be clean.
- Old data still loads (do not rename stored fields).
- Backup, then restore, and compare.

## Module: hangout (Hangout & Group Expenses)

Files: `js/hangout-calc.js` (pure integer-paisa calculation layer, unit tested), `js/hangout.js` (data, templates, dashboard, event sections),
`js/hangout-forms.js` (decisions, history, event/person/expense forms), `js/hangout-flows.js` (restaurant bill, transfers, refunds, decision forms, all actions),
`js/hangout-report.js` (memo, slip, text, Hangout-only backup/restore, friends/more tabs, `registerModule`).

Data lives only in `state.hangout` (`schema`, `friends`, `events`). Balances are never stored: they are recomputed from expenses,
transfers, refunds and finalized decisions by `hgEventCalc`. Run the calculation tests with `node tests/hangout-calc.test.js`.

## Module: bazar (Bazar Sadai: grocery shopping)

Files: `js/bazar-calc.js` (pure integer calculation layer: paisa for money, thousandths for quantity; unit tested), `js/bazar.js` (screens, forms, actions, `registerModule`).
Run the tests with `node tests/bazar-calc.test.js`.

Data lives only in `state.bazar` (`markets`, `cats`, `stock`, `templates`, `activeId`, `autoStock`). Totals, budget remaining, dues and price history are never stored, they are recomputed from items and payments.
Receipt photos use the existing image store under `bzr:<id>` and travel with the normal backup. Linking a market to main expenses adds exactly one expense (`ref: 'bz:<marketId>'`) to a daily/household Hangout event and keeps it in sync; Hangout refuses to edit such an expense directly.

### Hangout: monthly household (`type: 'household'`)

Files: `js/hangout-house.js` (central monthly budget, payments, record page, month list, month report) and `js/hangout-house-cats.js` (pages for electricity, gas, water, internet, house help, education, medical, groceries).
Pure logic lives in `js/hangout-calc.js` (`hgCentralMonth`, `hgOblRem`, `hgOblStatus`, `hgExpYm`) and is covered by `tests/hangout-calc.test.js`.

- A bill, fee, visit or medicine is one normal expense (`e.pays = [{amt, date, method}]` holds its payments, `e.info` its details, `e.photos` extra photos stored as `hgp:<id>`). Paying later only adds a payment, never a new expense.
- Bills belong to the month in `info.ym`; everything else to the month of `e.date`.
- Monthly money lives in `ev.hh.months['YYYY-MM'] = { budget, opening, carry, inc: [...], cats }`; family profiles and teacher/connection profiles in `ev.hh.people` and `ev.hh.profiles`.

## Module: teacher (Teacher Manager: jobs, private tuition, coaching, classes, costs, exams)

Files: `js/teacher-calc.js` (pure integer-paisa calculation layer, unit tested), `js/teacher.js` (data helpers, home, classes, work tab), `js/teacher-money.js` (dues, expenses, exams, supplies, reports, More),
`js/teacher-sheets.js` (detail sheets and photo strip), `js/teacher-forms.js` (forms, actions, guide, `registerModule`). Run the tests with `node tests/teacher-calc.test.js`.

Data lives only in `state.teacher` (`jobs`, `students` with `subjects`, `centers`, `batches`, `enrolls`, `sessions`, `charges`, `expenses`, `pays`, `recurs`, `exams`, `cats`, `budget`).
Money is stored as integer paisa and **always as the actual amount**. The module shows every amount through `tcM()` (= actual + ৳1, display only); never add the ৳1 anywhere else and never save it.

- A fee, salary or recurring cost is created once per month with a deterministic id (`j:<job>:<ym>`, `s:<subject>:<ym>`, `b:<enrollment>:<ym>`, `r:<recur>:<ym>`) after the user reviews the month (More > New month), so it can never be created twice. Pay and fee changes are effective-dated histories (`[{from:'YYYY-MM', amt}]`), so earlier months never change.
- Income = `charges`, bills = `expenses`, both settled by `pays` (`side: in|out`). Payments are never deleted, only voided. Paid / partial / unpaid / overdue is always derived.
- Profit (earned − cost) and cash (opening + received − paid) are separate numbers. Exams and supplies are single expenses (exam: `ref: 'ex:<id>'`), so nothing is counted twice.
- Receipt and document photos use the existing image store as `tcp:<id>` and travel with the normal backup.

## Demo data (js/demo.js)

One-time button (bottom of screen) that replaces all data with demo data for every module (records tagged `demo: true`). It disappears after use or after the close button. To remove the feature: delete `js/demo.js` and its entries in `index.html` and `sw.js`; to remove the data: filter out records with `demo: true`.
