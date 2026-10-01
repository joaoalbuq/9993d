/* The hand-off: the live table's misses ride to the practice
   shoe's leak ledger at settle — cell for cell, the same key,
   the same names — so the drills there aim at what the felt
   cost you here. The merge is the property under test: the
   practice floor's own entries preserved, counts and costs
   accumulating across rounds, malformed junk ignored, and
   the cell vocabulary identical on both pages.             */
'use strict';
const fs = require('fs');
const path = require('path');
const tableSrc = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const floorSrc = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- leakMerge, exactly as shipped on the table --- */
function grab(src, a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
const fnFull = grab(tableSrc, '  function leakMerge(lk, miss) {', '\n  }');
const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
const leakMerge = new Function('return function leakMerge(lk, miss) {' + fnBody + '}')();

/* --- one miss onto an empty ledger --- */
const one = leakMerge({}, { cell: 'hard 16 v 10', cost: 7.5 });
if (one['hard 16 v 10'].n !== 1 || one['hard 16 v 10'].cost !== 7.5)
  throw new Error('first miss must open its cell: ' + JSON.stringify(one));
console.log('first miss: hard 16 v 10 opens at ×1, −7.5');

/* --- the practice floor's own entries ride through untouched --- */
const seeded = leakMerge({ 'soft 13 v Q': { n: 3, cost: 30.15 }, 'junk': { cost: 5 }, 'dead': null },
  { cell: 'hard 16 v 10', cost: 2.5 });
if (seeded['soft 13 v Q'].n !== 3 || seeded['soft 13 v Q'].cost !== 30.15)
  throw new Error('the floor\u2019s entries must be preserved: ' + JSON.stringify(seeded));
if (seeded['junk'] || seeded['dead']) throw new Error('malformed entries must be dropped');
console.log('merge: the floor\u2019s cells preserved, junk ignored');

/* --- two rounds, same cell: counts and costs accumulate --- */
let lk = {};
lk = leakMerge(lk, { cell: 'hard 12 v 2', cost: 2.6 });
lk = leakMerge(lk, { cell: 'hard 12 v 2', cost: 2.6 });
lk = leakMerge(lk, { cell: 'hard 16 v 10', cost: 0 });   /* a costless miss still counts */
if (lk['hard 12 v 2'].n !== 2 || lk['hard 12 v 2'].cost !== 5.2)
  throw new Error('accumulation across rounds: ' + JSON.stringify(lk));
if (lk['hard 16 v 10'].n !== 1 || lk['hard 16 v 10'].cost !== 0)
  throw new Error('a costless miss still lands: ' + JSON.stringify(lk['hard 16 v 10']));
console.log('accumulation: ×2 −5.2 across two rounds; a costless miss still counts once');

/* --- the cell vocabulary is byte-identical on both pages --- */
const floorKey = floorSrc.match(/function leakKey\(soft, t, up\) \{\s*return \(soft \? 'soft ' : 'hard '\) \+ t \+ ' v ' \+ up;/);
if (!floorKey) throw new Error('the floor\u2019s leakKey template drifted');
const tableCell = tableSrc.match(/\(vM\.soft \? 'soft ' : 'hard '\) \+ vM\.total \+ ' v ' \+/);
if (!tableCell) throw new Error('the table\u2019s cell template drifted');
console.log('vocabulary: soft/hard + total + " v " + rank — the same names on both pages');

/* --- the wiring: miss captured at the click, flushed at settle --- */
const verdict = grab(tableSrc, '  function verdictT(choice) {', 'saveT();');
if (!verdict.includes('else {') || !verdict.includes('tLedger.push('))
  throw new Error('verdictT must buffer the miss with its cell');
if (!grab(tableSrc, '  function settle() {', 'tHanded = flushT();').includes('game.phase = \'settle\';'))
  throw new Error('settle must flush the hand-off');
if (!/flushT\(\);/.test(tableSrc)) throw new Error('flushT must be called');
const flush = grab(tableSrc, '  function flushT() {', '\n  }');
if (!flush.includes("'999.practice.leaks'")) throw new Error('the hand-off must write the practice shoe\u2019s key');
if (!/tHanded \? ' \u00b7 ' \+ tHanded/.test(tableSrc))
  throw new Error('the settle line must name the hand-off');
console.log('wiring: miss at the click, ledger at the settle, the felt says what it handed over');

console.log('\nhand-off verified');
