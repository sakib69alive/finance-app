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
