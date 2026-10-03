/* Graduation: a cell that answers with the book three times
   running retires from the drill and returns with spacing —
   six served hands, doubling each re-graduation, capped —
   for a refresher; any miss yanks a graduate straight back,
   and the yank's PRICE trims the next rest: a cheap yank is a
   lesson nearly held, so soft cells come back sooner than
   expensive ones. The ladder, the trim and the state machine
   are the properties under test, plus the wiring that counts
   only clean answers on ledgered cells, skips retired cells in
   the queue, ticks the clock per served hand, and shows
   retired-vs-active.                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
function extract(name, args) {
  const fnFull = grab('  function ' + name + '(', '\n  }');
  const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
  const sig = fnFull.slice(fnFull.indexOf('('), fnFull.indexOf(')') + 1);   /* the original params */
  return new Function(args, 'return function ' + name + sig + ' {' + fnBody + '}');
}

/* --- the spacing ladder: 6, 12, 24, capped --- */
const gradGap = extract('gradGap', 'GRAD_GAP, GRAD_GAP_MAX')(6, 24);
if (gradGap(1) !== 6) throw new Error('first graduation: six drill hands of rest');
if (gradGap(2) !== 12) throw new Error('second: doubled');
if (gradGap(3) !== 24) throw new Error('third: doubled again');
if (gradGap(5) !== 24) throw new Error('capped at twenty-four');
console.log('spacing ladder: 6 \u2192 12 \u2192 24, capped \u2014 refreshers drift further apart');

/* --- the refresher's price: a cheap yank shortens the next rest --- */
const refresherTrim = extract('refresherTrim', '')();
if (refresherTrim(0) !== 1) throw new Error('an unpriced yank keeps the full ladder');
if (refresherTrim(60) !== 1) throw new Error('an expensive yank keeps the full ladder');
if (Math.abs(refresherTrim(12.5) - 0.5) > 1e-9) throw new Error('half a unit of chips halves the rest');
if (refresherTrim(2) !== 0.4) throw new Error('a whisper of a yank still owes two-fifths of the ladder');

/* --- the state machine: clean streak retires, miss yanks back --- */
function harness(clock) {
  const leaks = {};
  return {
    leaks,
    gradClean: extract('gradClean', 'GRAD_AT, gradClock, gradGap, saveLeaks, leaks, refresherTrim, GRAD_MASTER, YANK_KEEP')(3, clock, gradGap, function () {}, leaks, refresherTrim, 2, 6),
    gradMiss: extract('gradMiss', 'saveLeaks, leaks')(function () {}, leaks),
    gradWakeDue: extract('gradWakeDue', 'gradClock, saveLeaks, leaks')(clock, function () {}, leaks)
  };
}

let h = harness(10);
h.leaks['hard 16 v 10'] = { n: 2, cost: 50 };
h.gradClean('hard 16 v 10');
h.gradClean('hard 16 v 10');
if (h.leaks['hard 16 v 10'].s !== 2 || h.leaks['hard 16 v 10'].r)
  throw new Error('two clean answers: still drilling, streak two');
h.gradClean('hard 16 v 10');
const g = h.leaks['hard 16 v 10'];
if (!g.r || g.g !== 1 || g.s !== 0) throw new Error('three clean: must retire ' + JSON.stringify(g));
if (g.back !== 16) throw new Error('retired at clock 10, back at 16: ' + g.back);
console.log('retirement: three clean answers retire hard 16 v 10 \u2014 back at clock 16');

/* --- a retired cell ignores clean answers and wakes on its clock --- */
h.gradClean('hard 16 v 10');
if (h.leaks['hard 16 v 10'].g !== 1) throw new Error('a retired cell must ignore clean answers');
const h2 = harness(16);
h2.leaks['hard 16 v 10'] = { n: 2, cost: 50, r: 1, back: 16, g: 1, s: 0 };
if (h2.gradWakeDue() !== 1 || h2.leaks['hard 16 v 10'].r)
  throw new Error('a cell due at the clock must wake into the queue');
const h3 = harness(15);
h3.leaks['hard 16 v 10'] = { n: 2, cost: 50, r: 1, back: 16, g: 1, s: 0 };
if (h3.gradWakeDue() !== 0 || !h3.leaks['hard 16 v 10'].r)
  throw new Error('a cell not yet due stays retired');
console.log('wake: due graduates rejoin the drill, the rest stay retired');

/* --- a miss resets the streak and yanks a graduate back --- */
const h4 = harness(20);
h4.leaks['hard 12 v 2'] = { n: 1, cost: 25, s: 2 };
h4.gradMiss('hard 12 v 2');
if (h4.leaks['hard 12 v 2'].s !== 0) throw new Error('a miss resets the streak');
h4.leaks['soft 13 v Q'] = { n: 1, cost: 10, r: 1, back: 26, g: 1, s: 0 };
h4.gradMiss('soft 13 v Q');
if (h4.leaks['soft 13 v Q'].r || h4.leaks['soft 13 v Q'].back)
  throw Error('a miss must yank a graduate straight back: ' + JSON.stringify(h4.leaks['soft 13 v Q']));
console.log('the yank: one miss undoes the streak \u2014 a graduate returns to the drill at once');

/* --- wiring: hooks, the queue skips retired, the panel shows both --- */
const verdict = grab('  function coachVerdict(choice) {', 'var entry = {');
if (!verdict.includes('gradClean(lastCell)') || !verdict.includes('leakMiss(lastCell, cost)'))
  throw new Error('the hand verdict must feed graduation both ways, the yank priced');
if (!/gradMiss\(cell, cost\);\s+\/\* the miss undoes any graduation, priced \*\//.test(src))
  throw new Error('gradMiss must ride the shared ledger write, yank still priced');
const ins = grab("      gradClean('insurance v ace')", "leakMiss('insurance v ace', cost)");
if (!ins) throw new Error('the insurance verdict must graduate its cell too');
if (!/refillQueue\(\);/.test(src) || !/function refillQueue\(\) \{[\s\S]*?return !c\.r && !c\.m;/.test(src))
  throw new Error('the drill queue must wake the due and skip the retired and mastered');
if (!/if \(gradWakeDue\(\)\) leakQueue = \[\];/.test(src))
  throw new Error('every served hand must check the clock — the classic loop must not starve a wake');
if (!/gradClock\+\+;[\s\S]{0,160}saveGrad\(\);/.test(src))
  throw new Error('the drill must tick its clock per served hand');
if (!/var cls = c\.r \? 'grad' : c\.m \? 'master' : '';/.test(src) || !/li\.grad \{ opacity/.test(src))
  throw new Error('the panel must mute retired cells');
if (!/back in ' \+ Math\.max\(0, c\.back - gradClock\)/.test(src))
  throw new Error('the panel must count down a graduate\u2019s return');
if (!/trim: leaks\[k\]\.trim \|\| 0/.test(src))
  throw new Error('the ranking must carry the trimmed-rest flag to the row');
if (!/\(c\.trim \? ' \\u00b7 ' \+ trimText\(c\.trim\) \+ '\\u00d7 rest' : ''\)/.test(src))
  throw new Error('a trimmed rest must name its FACTOR on the row, not just that it was trimmed');
const trimText = extract('trimText', '')();
if (trimText(0.5) !== '0.5') throw new Error('a half rest reads 0.5×: ' + trimText(0.5));
if (trimText(0.4) !== '0.4') throw new Error('the floor trim reads 0.4×: ' + trimText(0.4));
if (trimText(0.6288) !== '0.6') throw new Error('the tenth carries the meaning, the hundredth is bookkeeping: ' + trimText(0.6288));
if (trimText('0.75') !== '0.8') throw new Error('a factor arriving as text still reads: ' + trimText('0.75'));
if (Math.abs(trimText(refresherTrim(12.5)) - 0.5) > 1e-9)
  throw new Error('the row\u2019s factor is the one retirement stamped \u2014 12.5 chips halves it');
if (Math.abs(trimText(refresherTrim(6)) - 0.4) > 1e-9)
  throw new Error('a cheap yank sits on the 0.4 floor');
if (!/e\.trim = trim < 1 \? trim : 0;/.test(src))
  throw new Error('retirement must stamp the trim factor');

/* --- the queue weighs the refresher price: a soft cell serves
       ahead of full-ladder ones, the softer the sooner --- */
const queueOrder = extract('queueOrder', '')();
const LADDER = { cell: 'hard 16 v 10', w: 80 };
const SOFT = { cell: 'soft 16 v 10', w: 5, trim: 0.5 };
const SOFTER = { cell: 'soft 15 v 10', w: 1, trim: 0.4 };
if (queueOrder(LADDER, SOFT) !== 1 || queueOrder(SOFT, LADDER) !== -1)
  throw new Error('a trimmed cell must serve before a full-ladder one, however big its leak');
if (queueOrder(SOFTER, SOFT) >= 0 || queueOrder(SOFT, SOFTER) <= 0)
  throw new Error('the softer cell (cheaper yank) serves first');
if (queueOrder({ w: 5 }, { w: 9 }) !== 4) throw new Error('untouched cells still rank by the bigger leak');
if (queueOrder(SOFT, { w: 90, trim: 0.5 }) !== 85)
  throw new Error('among equal trims the bigger leak leads: ' + queueOrder(SOFT, { w: 90, trim: 0.5 }));
if (!/\.sort\(queueOrder\)/.test(src) ||
    !/leakQueue = weakestCells\(\)\.filter\(function \(c\) \{ return !c\.r && !c\.m; \}\)[\s\S]{0,40}\.sort\(queueOrder\)/.test(src))
  throw new Error('the drill queue must sort by the refresher price, not the raw leak weight');
if (!/var at = a\.trim \|\| 0, bt = b\.trim \|\| 0;/.test(src))
  throw new Error('the queue order must read the trim factor off the row');
console.log('queue order: a soft cell serves first, softer sooner \u2014 the drill schedule bends, the ranking does not');

/* --- how the re-yanks come: a yanked generation logs its softness,
       and the roster reads how many came cheap and which way the
       latest on each cell moved --- */
if (!/var YANK_KEEP = 6;/.test(src)) throw new Error('the yank log must be capped by a named constant');
if (!/if \(e\.rc > 0\) \{/.test(src) || !/e\.yk = \(e\.yk \|\| \[\]\)\.concat\(trim\);/.test(src))
  throw new Error('a yanked generation must append its trim to the log');
const yk = harness(40);
yk.leaks['soft 16 v 10'] = { n: 4, cost: 37, r: 1, back: 999, g: 1, s: 0 };
yk.gradMiss('soft 16 v 10', 12.5);          /* cheap yank: trim 0.5 */
yk.leaks['soft 16 v 10'].s = 2;
yk.gradClean('soft 16 v 10');                /* re-retires: logs 0.5 */
const yk2 = harness(40);
yk2.leaks['hard 16 v 10'] = { n: 4, cost: 100, g: 1, s: 2 };   /* passed the refresher clean */
yk2.gradClean('hard 16 v 10');
if (yk2.leaks['hard 16 v 10'].yk) throw new Error('a clean refresher is no yank \u2014 nothing logged');
const log = yk.leaks['soft 16 v 10'].yk;
if (!log || log.length !== 1 || Math.abs(log[0] - 0.5) > 1e-9)
  throw new Error('a cheap yank must log its factor: ' + JSON.stringify(log));
const yankTrend = extract('yankTrend', 'leaks')(yk.leaks);
let yd = yankTrend();
if (yd.n !== 1 || yd.cheap !== 1 || yd.dir !== 0)
  throw new Error('one cheap yank: 1/1 cheap, no direction yet: ' + JSON.stringify(yd));
yk.leaks['hard 16 v 10'] = { n: 4, cost: 100, g: 1, yk: [1, 1, 0.5] };
yd = yankTrend();
if (yd.n !== 4 || yd.cheap !== 2) throw new Error('the roster counts cheap yanks across cells: ' + JSON.stringify(yd));
if (yd.dir !== -1) throw new Error('a latest yank softer than the run reads softening: ' + JSON.stringify(yd));
yk.leaks['hard 12 v 2'] = { n: 2, cost: 10, g: 1, yk: [0.5, 0.6, 1] };
if (yankTrend().dir !== 0) throw new Error('one softening cell and one hardening cell read steady: ' + JSON.stringify(yankTrend()));
if (!/var yt = yankTrend\(\);/.test(src) || !/yt\.cheap \+ '\/' \+ yt\.n \+ ' cheap'/.test(src))
  throw new Error('the pill roster must show the cheap re-yank rate');
if (!/yt\.dir < 0 \? ' \\u2198' : yt\.dir > 0 \? ' \\u2197' : ''/.test(src))
  throw new Error('the pill roster must point the yank trend down or up');
console.log('re-yank log: cheap generations counted across cells \u2014 the roster reads softening \u2198 or hardening \u2197');
if (!/clean ' \+ c\.s \+ '\/' \+ GRAD_AT/.test(src))
  throw new Error('the panel must show the clean streak');
if (!/All graduated \\u2014 the classic 16 v 10 keeps the drill honest\./.test(src))
  throw new Error('an all-graduated ledger must fall back to the classic');
if (!/'999\.practice\.grad'/.test(src)) throw new Error('the clock must persist');
console.log('wiring: verdicts feed the machine, the queue skips the retired, the panel shows retired-vs-active');

const h5 = harness(40);
h5.leaks['soft 16 v 10'] = { n: 4, cost: 37, r: 1, back: 999, g: 1, s: 0 };
h5.gradMiss('soft 16 v 10', 12.5);           /* the cheap yank, priced */
if (h5.leaks['soft 16 v 10'].rc !== 12.5)
  throw new Error('the yank must record its price: ' + JSON.stringify(h5.leaks['soft 16 v 10']));
h5.leaks['soft 16 v 10'].s = 2;              /* two cleans already banked this sitting */
h5.gradClean('soft 16 v 10');                /* the third: re-retires */
const g5 = h5.leaks['soft 16 v 10'];
if (g5.back !== 46) throw new Error('a cheap yank trims the second-gen ladder twelve to six: back at ' + g5.back);
if (Math.abs(g5.trim - 0.5) > 1e-9) throw new Error('a trimmed rest must record its factor \u2014 12.5 chips halves it: ' + JSON.stringify(g5));
if (g5.rc !== 0) throw new Error('this generation priced its own refresher \u2014 the record resets');
const h6 = harness(40);
h6.leaks['hard 16 v 10'] = { n: 4, cost: 100, r: 1, back: 999, g: 1, s: 0 };
h6.gradMiss('hard 16 v 10', 200);            /* an expensive yank */
h6.leaks['hard 16 v 10'].s = 2;
h6.gradClean('hard 16 v 10');
if (h6.leaks['hard 16 v 10'].back !== 52)
  throw new Error('a full-price yank keeps the second-gen ladder at twelve: back at ' + h6.leaks['hard 16 v 10'].back);
if (h6.leaks['hard 16 v 10'].trim) throw new Error('a full rest carries no trim factor');
const h7 = harness(40);
h7.leaks['hard 15 v 10'] = { n: 4, cost: 100, r: 1, back: 999, g: 1, s: 0 };
h7.gradMiss('hard 15 v 10', 5000);           /* a monstrous yank is capped at the record */
if (h7.leaks['hard 15 v 10'].rc !== 200) throw new Error('the recorded price is capped');
console.log('the trim: a 12.5-chip yank rests 6 not 12, a full-price yank keeps 12 \u2014 soft cells return sooner');

/* --- the masters: two spaced refreshers survived, the drill lets go --- */
const hm = harness(60);
hm.leaks['hard 12 v 3'] = { n: 3, cost: 20, g: 2, s: 2 };   /* twice graduated, once survived */
hm.gradClean('hard 12 v 3');                                 /* the second refresher passed */
const gm = hm.leaks['hard 12 v 3'];
if (!gm.m || gm.r) throw new Error('the third graduation must master, not re-retire: ' + JSON.stringify(gm));
if (gm.back !== 0) throw new Error('a master owes no rest');
hm.gradClean('hard 12 v 3');                                 /* clean answers must not un-master it */
hm.gradMiss('hard 12 v 3', 50);                              /* nor must a felt miss */
if (!hm.leaks['hard 12 v 3'].m || hm.leaks['hard 12 v 3'].r)
  throw new Error('a master stays mastered \u2014 nothing drags it back');
const hw = harness(60);
hw.leaks['hard 16 v 10'] = { n: 2, cost: 50, g: 1, s: 2, r: 1, back: 66 };  /* one refresher survived only */
hw.leaks['hard 16 v 10'].r = 0; hw.leaks['hard 16 v 10'].s = 2;
hw.gradClean('hard 16 v 10');                                /* the second graduation is not a master yet */
if (!hw.leaks['hard 16 v 10'].r || hw.leaks['hard 16 v 10'].m)
  throw new Error('two graduations = one refresher survived \u2014 still on the ladder');
if (!/if \(e\.g > GRAD_MASTER\) \{/.test(src))
  throw new Error('the master must be the third graduation, named');
if (!/var GRAD_AT = 3, GRAD_GAP = 6, GRAD_GAP_MAX = 24, GRAD_MASTER = 2;/.test(src))
  throw new Error('the master tier must be named, not magic');
if (!/return !c\.r && !c\.m;/.test(src))
  throw new Error('the queue must skip the mastered as well as the retired');
if (!/m: leaks\[k\]\.m \? 1 : 0/.test(src))
  throw new Error('the ranking must carry the master flag');
if (!/mastered \\u2014 out of the drill for good/.test(src))
  throw new Error('the panel footer must count the mastered');
if (!/masterN \? '\\uD83C\\uDFC5' \+ masterN/.test(src))
  throw new Error('the pill roster must carry the gold count first');
if (!/if \(e && e\.m\) return;/.test(src))
  throw new Error('drill-now must refuse a master \u2014 the drill let go for good');
if (!/leakView === 'session' && !c\.m/.test(src))
  throw new Error('a mastered row carries no drill-now tap');
if (!/\.leaks li\.master \{ color: #d8b56a; \}/.test(src))
  throw new Error('a mastered row wears gold');
console.log('masters: two refreshers survived = gone for good \u2014 no miss drags them back, no tap, gold on the panel');

console.log('\ngraduation verified');
