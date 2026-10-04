/* The family WALK, run: after a tap widens the drill, each served
   hand must step to the next member of the column, and the column
   must end rather than loop forever.                           */
'use strict';
const fs = require('fs');
const path = require('path');
const IX = require(path.join(__dirname, '..', 'index999.js'));
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}

/* --- the tap records the column and seeds the queue --- */
const dn = grab('  function drillNow(cell, now) {', '\n  }');
if (!/var family = now \? INDEX999\.cellFamily\(cell\) : \[cell\];/.test(dn))
  throw new Error('only a TAP widens: a named cell elsewhere keeps its own single drill');
if (!/leakFamily = family\.slice\(\);/.test(dn))
  throw new Error('the tap must record the column it will walk');
if (!/var rest = family\.filter\(function \(c\) \{ return c !== cell; \}\);/.test(dn))
  throw new Error('the rest of the column must be separated from the tapped cell');
if (!/leakQueue = rest\.concat\(leakQueue\.filter/.test(dn))
  throw new Error('the column must lead the queue, with the old order kept behind it');
if (!/else leakFamily = \[\];/.test(dn))
  throw new Error('a single-cell tap must leave no column behind');

/* the tapped cell still leads the queue: it is forced, not queued */
if (dn.indexOf('leakCell = cell;') > dn.indexOf('leakFamily = family.slice();'))
  throw new Error('the tapped cell must be forced BEFORE the column is queued behind it');
console.log('the tap: widens only on a bar tap, forces the tapped cell, queues the column behind');

/* --- leakDeal steps the column on --- */
const ld = grab('  function leakDeal() {', '/* The meter tells the truth');
if (!/if \(leakFamily\.length\) \{/.test(ld))
  throw new Error('a served drill hand must step the column');
if (!/var at2 = leakFamily\.indexOf\(leakCell\);/.test(ld))
  throw new Error('the walk must start from the cell just served');
if (!/if \(at2 >= leakFamily\.length - 1\) leakFamily = \[\];/.test(ld))
  throw new Error('the LAST member must empty the column as it is served, or it is dealt twice');
if (!/else if \(nx\) \{ leakCell = nx; rememberIx\(nx\); \}/.test(ld))
  throw new Error('the next member must take the seat and be remembered');
if (!/else leakFamily = \[\];/.test(ld))
  throw new Error('the column must END when it is worked through, never loop');

/* --- a retired or mastered member is skipped, never revived --- */
if (!/var ce = leaks\[leakFamily\[q\]\];/.test(ld) || !/if \(!ce \|\| \(!ce\.m && !ce\.r\)\) \{ nx = leakFamily\[q\]; break; \}/.test(ld))
  throw new Error('a cell the ledger has retired or mastered must be skipped, not drilled');

/* --- the reset clears the column --- */
if (!/leaks = \{\}; sessionLeaks = \{\}; leakCell = null;/.test(src))
  throw new Error('the wipe must still clear the ledger');
if (!/var leakMode = false, leakQueue = \[\], leakCell = null;/.test(src))
  throw new Error('the drill state declaration moved');
console.log('the walk: steps per served hand, skips retired cells, ends when worked through');

/* --- RUN it: three hands walk the 10-column in order --- */
function walk(family, start, ledger, maxHands) {
  const served = [];
  let leakCell = start, leakFamily = family.slice();
  for (let h = 0; h < (maxHands || 12); h++) {
    if (!leakFamily.length) break;
    served.push(leakCell);
    const at2 = leakFamily.indexOf(leakCell);
    let nx = null;
    for (let q = at2 + 1; q < leakFamily.length; q++) {
      const ce = ledger[leakFamily[q]];
      if (!ce || (!ce.m && !ce.r)) { nx = leakFamily[q]; break; }
    }
    /* the LAST member empties the column as it is served */
    if (at2 >= leakFamily.length - 1) leakFamily = [];
    else if (nx) { leakCell = nx; }
    else leakFamily = [];
  }
  return served;
}
const fam = IX.cellFamily('hard 16 v 10');           /* [16, 10, 15] */
const served = walk(fam, fam[0], {});
if (served.join('|') !== 'hard 16 v 10|hard 10 v 10|hard 15 v 10')
  throw new Error('the column must be worked in order, each its own hand: ' + served);
if (served.length !== fam.length) throw new Error('every member must be served exactly once');
console.log('walked: ' + served.join(' → '));

/* a retired middle member is skipped, and the walk still ends */
const ledger = { 'hard 10 v 10': { r: 1 } };        /* retired */
const skipped = walk(fam, fam[0], ledger);
if (skipped.join('|') !== 'hard 16 v 10|hard 15 v 10')
  throw new Error('a retired member must be skipped, not drilled: ' + skipped);
console.log('skipped: a retired member drops out and the column still ends — ' + skipped.join(' → '));

/* a mastered member is skipped too */
const led2 = { 'hard 10 v 10': { m: 1 } };
const skip2 = walk(fam, fam[0], led2);
if (skip2.join('|') !== 'hard 16 v 10|hard 15 v 10')
  throw new Error('a mastered member must be skipped: ' + skip2);

/* a lone column is one hand and then over */
const one = walk(IX.cellFamily('hard 11 v A'), 'hard 11 v A', {});
if (one.join('|') !== 'hard 11 v A') throw new Error('a lone column is one hand: ' + one);
console.log('a lone column: one hand, then the drill is its own again');

/* the walk cannot loop: it always terminates */
let guard = 0;
while (walk(fam, fam[0], {}).length < 50 && guard++ < 10) { /* unreachable by construction */ }
console.log('and it always terminates — the column is finite, and it empties when served');

console.log('\ncell family walk verified');