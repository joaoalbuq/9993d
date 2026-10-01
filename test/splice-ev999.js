/* Splice the EV999 canon from offline.html into table-16x9.html,
   byte-identical — the same ceremony shoe999.canon.js performs for
   the SHOE999 canon (and splice-index999.js for INDEX999). An
   existing EV999 block in the target page is replaced in place.
   Run: node test/splice-ev999.js */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const A = fs.readFileSync(path.join(root, 'offline.html'), 'utf8');
const BPath = path.join(root, 'table-16x9.html');
const B = fs.readFileSync(BPath, 'utf8');

const BEGIN = '  /* ==== EV999 canon';
const END = '/* ==== EV999 end ==== */\n';

const i = A.indexOf(BEGIN);
if (i < 0) throw new Error('offline.html: EV999 begin marker not found');
const j = A.indexOf(END, i);
if (j < 0) throw new Error('offline.html: EV999 end marker not found');
const canon = A.slice(i, j + END.length);
if (!canon.includes('var EV999 = (function () {')) throw new Error('canon body incomplete');

const k = B.indexOf(BEGIN);
if (k >= 0) {
  const l = B.indexOf(END, k);
  if (l < 0) throw new Error('table-16x9.html: end marker missing under existing begin');
  const out = B.slice(0, k) + canon + B.slice(l + END.length);
  fs.writeFileSync(BPath, out);
  console.log('table-16x9.html: EV999 block replaced in place (' + canon.length + ' bytes)');
} else {
  const anchor = '  /* ==== INDEX999 canon';
  const a = B.indexOf(anchor);
  if (a < 0) throw new Error('table-16x9.html: INDEX999 anchor not found');
  const out = B.slice(0, a) + canon + B.slice(a);
  fs.writeFileSync(BPath, out);
  console.log('table-16x9.html: EV999 spliced before INDEX999 (' + canon.length + ' bytes)');
}
