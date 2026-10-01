/* Splice the INDEX999 canon from offline.html into table-16x9.html,
   byte-identical — the same ceremony shoe999.canon.js performs for
   the SHOE999 canon. Idempotent: an existing INDEX999 block in the
   target page is replaced in place. Run: node test/splice-index999.js */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const A = fs.readFileSync(path.join(root, 'offline.html'), 'utf8');
const BPath = path.join(root, 'table-16x9.html');
const B = fs.readFileSync(BPath, 'utf8');

const BEGIN = '  /* ==== INDEX999 canon';
const END = '/* ==== INDEX999 end ==== */\n';

const i = A.indexOf(BEGIN);
if (i < 0) throw new Error('offline.html: INDEX999 begin marker not found');
const j = A.indexOf(END, i);
if (j < 0) throw new Error('offline.html: INDEX999 end marker not found');
const canon = A.slice(i, j + END.length);
if (!canon.includes('var INDEX999 = (function () {')) throw new Error('canon body incomplete');
if (canon.split('INDEX999').length < 4) throw new Error('canon looks truncated');

const k = B.indexOf(BEGIN);
if (k >= 0) {
  const l = B.indexOf(END, k);
  if (l < 0) throw new Error('table-16x9.html: end marker missing under existing begin');
  const out = B.slice(0, k) + canon + B.slice(l + END.length);
  fs.writeFileSync(BPath, out);
  console.log('table-16x9.html: INDEX999 block replaced in place (' + canon.length + ' bytes)');
} else {
  const anchor = '  /* ---- the training overlay (optional, 🎓) -----------------';
  const a = B.indexOf(anchor);
  if (a < 0) throw new Error('table-16x9.html: coach anchor not found');
  const out = B.slice(0, a) + canon + '\n' + B.slice(a);
  fs.writeFileSync(BPath, out);
  console.log('table-16x9.html: INDEX999 spliced before the coach block (' + canon.length + ' bytes)');
}
