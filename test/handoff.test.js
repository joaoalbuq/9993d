/* The hand-off: the live table's misses ride to the practice
   shoe's leak ledger at settle — cell for cell, the same key,
   the same names — so the drills there aim at what the felt
   cost you here. The merge is the property under test: the
   practice floor's own entries preserved, counts and costs
   accumulating across rounds, malformed junk ignored, and
   the cell vocabulary identical on both pages. The merge also
   stamps each cell with the misses that came off the felt —
   the floor's own entries never wear one — and a master's
   honours survive a felt miss. The settle also hands the reel
   the felt's whole hands — cards, plays, price — so the
   practice review replays the live table's misses on the
   felt with the fork.                                      */
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

/* --- the hand-off badge: the ledger remembers which misses
       came off the felt — the floor's own never wear a stamp --- */
let tlk = {};
tlk = leakMerge(tlk, { cell: 'hard 12 v 2', cost: 2.6 });
tlk = leakMerge(tlk, { cell: 'hard 12 v 2', cost: 2.6 });
if (tlk['hard 12 v 2'].t !== 2)
  throw new Error('every felt miss must stamp its cell: ' + JSON.stringify(tlk['hard 12 v 2']));
if (tlk['hard 12 v 2'].n !== 2)
  throw new Error('the stamp counts misses, it must not double them: ' + JSON.stringify(tlk['hard 12 v 2']));
const floorCell = leakMerge(
  { 'soft 13 v Q': { n: 4, cost: 40, t: 1 } },
  { cell: 'hard 16 v 10', cost: 2 });
if (floorCell['soft 13 v Q'].t !== 1)
  throw new Error('a cell must keep its felt toll through other cells\' misses: ' + JSON.stringify(floorCell['soft 13 v Q']));
const unstamped = leakMerge(
  { 'soft 13 v Q': { n: 4, cost: 40 } },
  { cell: 'hard 16 v 10', cost: 2 });
if (unstamped['soft 13 v Q'].t)
  throw new Error('the merge must not invent a felt toll the floor never wrote: ' + JSON.stringify(unstamped['soft 13 v Q']));
console.log('origin: felt misses stamp their cells, the floor\'s stay unstamped, stamps ride the merge');

/* --- graduation rides the merge: a graduate untouched by other
       cells' misses keeps its honours; a felt miss on the
       graduate itself yanks it back to the drill         --- */
const gradLk = leakMerge(
  { 'soft 13 v Q': { n: 1, cost: 10, s: 2, r: 1, back: 9, g: 2 } },
  { cell: 'hard 16 v 10', cost: 2.6 });
const kept = gradLk['soft 13 v Q'];
if (!kept.r || kept.back !== 9 || kept.g !== 2 || kept.s !== 2)
  throw new Error('a graduate must keep its honours through other misses: ' + JSON.stringify(kept));
const yanked = leakMerge(
  { 'soft 13 v Q': { n: 1, cost: 10, s: 0, r: 1, back: 9, g: 2 } },
  { cell: 'soft 13 v Q', cost: 3 });
if (yanked['soft 13 v Q'].r || yanked['soft 13 v Q'].back)
  throw new Error('a felt miss on a graduate must yank it back: ' + JSON.stringify(yanked['soft 13 v Q']));
console.log('graduation rides the merge: honours kept, felt misses yank graduates back');

/* --- a felt miss on a MASTER must not strip its honours --- */
const mastered = leakMerge(
  { 'hard 16 v 10': { n: 6, cost: 60, g: 3, m: 1, r: 0, s: 0, back: 0 } },
  { cell: 'hard 16 v 10', cost: 4 });
if (!mastered['hard 16 v 10'].m)
  throw new Error('a felt miss must not unmaster a cell: ' + JSON.stringify(mastered['hard 16 v 10']));
if (mastered['hard 16 v 10'].t !== 1)
  throw new Error('even a master\'s felt toll is stamped: ' + JSON.stringify(mastered['hard 16 v 10']));
console.log('origin: a master stays mastered under a felt miss, its toll still stamped');

/* --- freshness: a felt miss dates its cell so the practice
       shoe's queue follows the newest tolls; dates ride other
       cells' misses and a fresh miss re-dates its own cell   --- */
const dated = leakMerge({}, { cell: 'hard 16 v 10', cost: 4, ts: 1700000000000 });
if (dated['hard 16 v 10'].ts !== 1700000000000)
  throw new Error('a felt miss must carry its date: ' + JSON.stringify(dated['hard 16 v 10']));
const stamped = leakMerge({}, { cell: 'hard 12 v 2', cost: 4 });
if (typeof stamped['hard 12 v 2'].ts !== 'number')
  throw new Error('a dateless miss must still be dated now: ' + JSON.stringify(stamped['hard 12 v 2']));
const rode = leakMerge(
  { 'soft 13 v Q': { n: 4, cost: 40, ts: 1690000000000 } },
  { cell: 'hard 16 v 10', cost: 2, ts: 1700000000000 });
if (rode['soft 13 v Q'].ts !== 1690000000000)
  throw new Error('freshness must ride other cells\u2019 misses: ' + JSON.stringify(rode['soft 13 v Q']));
const reDated = leakMerge(
  { 'hard 16 v 10': { n: 1, cost: 5, ts: 1690000000000 } },
  { cell: 'hard 16 v 10', cost: 2, ts: 1700000000000 });
if (reDated['hard 16 v 10'].ts !== 1700000000000)
  throw new Error('a fresh miss must re-date its own cell: ' + JSON.stringify(reDated['hard 16 v 10']));
console.log('freshness: the felt dates its misses, dates ride the merge, a fresh miss re-dates its cell');

/* --- the reel rides the same settle: the felt's whole hands land
       in the practice shoe's reel and replay with the fork     --- */
const flushReelFull = grab(tableSrc, '  function flushReelT() {', '\n  }');
function reelRun(storage, pending, dealerCards) {
  const calls = [];
  const ls = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { calls.push(k); storage[k] = v; }
  };
  const game = { dealer: { cards: dealerCards } };
  new Function('tReel', 'game', 'localStorage',
    flushReelFull + '\nreturn flushReelT;')(pending.slice(), game, ls)();
  return { storage: storage, calls: calls };
}
const feltHand = { yc: ['6', '10'], ys: [0, 1], up: '10', us: 2, t: 16, soft: false,
  choice: 'hit', book: 'stand', cost: 8.91, felt: 1 };
const rr = reelRun(
  { '999.practice.replay': JSON.stringify([
      { yc: ['9', '9'], up: '5', t: 18, soft: false, choice: 'stand', book: 'stand', cost: 0 },
      null, 42]) },
  [feltHand],
  [{ rank: '9', suit: 3 }, { rank: '9', suit: 4 }]);
const rrOut = JSON.parse(rr.storage['999.practice.replay']);
if (rrOut.length !== 2) throw new Error('junk must drop, the floor\u2019s entries must stay: ' + rrOut.length);
if (!rrOut[0] || !rrOut[0].yc) throw new Error('the floor\u2019s own reel entry rides through');
if (!rrOut[1] || !rrOut[1].felt || rrOut[1].hole !== '9' || rrOut[1].holes !== 4)
  throw new Error('the felt\u2019s hand must land whole, the hole dealt in: ' + JSON.stringify(rrOut[1]));
console.log('reel hand-off: the felt\u2019s whole hands land with the hole, the floor\u2019s entries ride, junk drops');

const full = [];
for (let f = 0; f < 12; f++) full.push({ yc: ['2', '2'], up: '6', t: 4, soft: false, choice: 'hit', book: 'stand', cost: 1 });
const rc = reelRun({ '999.practice.replay': JSON.stringify(full) }, [feltHand], []);
const capped = JSON.parse(rc.storage['999.practice.replay']);
if (capped.length !== 12 || !capped[capped.length - 1].felt)
  throw new Error('the reel holds the last twelve \u2014 the felt\u2019s miss rides in as the oldest walks: ' + capped.length);
console.log('reel hand-off: twelve deep \u2014 the felt\u2019s miss rides in, the oldest floor miss walks');

const quiet = reelRun({ '999.practice.replay': JSON.stringify([{ yc: ['9', '9'] }]) }, [], []);
if (quiet.calls.length) throw new Error('a clean settle writes nothing to the reel');
console.log('reel hand-off: nothing to hand, nothing written');

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
const vtGrab = grab(tableSrc, '  function verdictT(choice) {', 'saveT();');
if (!vtGrab.includes('tReel.push(') || !vtGrab.includes('felt: 1') ||
    !vtGrab.includes('yc: [hc[0].rank, hc[1].rank]'))
  throw new Error('verdictT must hand the whole hand \u2014 cards, up, plays, price \u2014 to the reel');
if (!/var tHanded = flushT\(\);[\s\S]{0,200}?flushReelT\(\);/.test(tableSrc))
  throw new Error('settle must flush the reel beside the ledger');
if (!/r2\.felt \? ' \\u00b7 \\uD83C\\uDFB0 the felt' : ''/.test(floorSrc))
  throw new Error('the review rows must badge the felt\u2019s misses');
if (!/crossed over from the live table/.test(floorSrc))
  throw new Error('the review footer must count the felt\u2019s crossings');
console.log('wiring: miss at the click, ledger and reel at the settle, the felt says what it handed over');

console.log('\nhand-off verified');
