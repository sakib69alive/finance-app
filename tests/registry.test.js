'use strict';
// node tests/registry.test.js
// Two files registering the same FORMS / ACTIONS / LIVE key silently overwrite each other (this once broke "add person" in Hangout).
// Only deliberate wrappers listed in ALLOWED may repeat a key.
const fs = require('fs'), path = require('path');
const ALLOWED = new Set(['ACTIONS hg-hero-detail', 'ACTIONS hg-add-cat', 'ACTIONS hg-edit-expense']); // later file wraps/extends the earlier one
const dir = path.join(__dirname, '..', 'js'), reg = {};
fs.readdirSync(dir).filter(f => f.endsWith('.js') && !/calc|data/.test(f)).forEach(f => {
  let cur = null;
  fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((ln, i) => {
    let m = /Object\.assign\((ACTIONS|FORMS|LIVE),\s*\{/.exec(ln);
    if (m) { cur = m[1]; return; }
    if (cur && /^\}\);?\s*$/.test(ln)) { cur = null; return; }
    m = /^\s*(ACTIONS|FORMS|LIVE)\[['"]([^'"]+)['"]\]\s*=/.exec(ln);
    if (m) { (reg[m[1] + ' ' + m[2]] = reg[m[1] + ' ' + m[2]] || []).push(f + ':' + (i + 1)); return; }
    if (cur && (m = /^  ['"]?([\w:-]+)['"]?\s*:\s*(\(|\w+\s*=>|async|el|f|function|\w+,)/.exec(ln))) (reg[cur + ' ' + m[1]] = reg[cur + ' ' + m[1]] || []).push(f + ':' + (i + 1));
  });
});
const dup = Object.entries(reg).filter(([k, v]) => v.length > 1 && !ALLOWED.has(k));
if (dup.length) { dup.forEach(([k, v]) => console.error('DUPLICATE ' + k + ' in ' + v.join(', '))); process.exit(1); }
console.log('ok  - no accidental duplicate FORMS/ACTIONS/LIVE keys (' + Object.keys(reg).length + ' keys)');
