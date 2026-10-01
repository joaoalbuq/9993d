/* Graduation: a cell that answers with the book three times
   running retires from the drill and returns with spacing —
   six served hands, doubling each re-graduation, capped —
   for a refresher; any miss yanks a graduate straight back.
   The ladder and the state machine are the property under
   test, plus the wiring that counts only clean answers on
   ledgered cells, skips retired cells in the queue, ticks
   the clock per served hand, and shows retired-vs-active.  */
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

/* --- the state machine: clean streak retires, miss yanks back --- */
function harness(clock) {
  const leaks = {};
  return {
    leaks,
    gradClean: extract('gradClean', 'GRAD_AT, gradClock, gradGap, saveLeaks, leaks')(3, clock, gradGap, function () {}, leaks),
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
if (!verdict.includes('gradClean(lastCell)') || !verdict.includes('gradMiss(lastCell)'))
  throw new Error('the hand verdict must feed graduation both ways');
const ins = grab("      gradClean('insurance v ace')", "gradMiss('insurance v ace')");
if (!ins) throw new Error('the insurance verdict must graduate its cell too');
if (!/refillQueue\(\);/.test(src) || !/function refillQueue\(\) \{[\s\S]*?return !c\.r;/.test(src))
  throw new Error('the drill queue must wake the due and skip the retired');
if (!/if \(gradWakeDue\(\)\) leakQueue = \[\];/.test(src))
  throw new Error('every served hand must check the clock — the classic loop must not starve a wake');
if (!/gradClock\+\+;[\s\S]{0,160}saveGrad\(\);/.test(src))
  throw new Error('the drill must tick its clock per served hand');
if (!/class="grad"/.test(src) || !/li\.grad \{ opacity/.test(src))
  throw new Error('the panel must mute retired cells');
if (!/back in ' \+ Math\.max\(0, c\.back - gradClock\)/.test(src))
  throw new Error('the panel must count down a graduate\u2019s return');
if (!/clean ' \+ c\.s \+ '\/' \+ GRAD_AT/.test(src))
  throw new Error('the panel must show the clean streak');
if (!/All graduated \\u2014 the classic 16 v 10 keeps the drill honest\./.test(src))
  throw new Error('an all-graduated ledger must fall back to the classic');
if (!/'999\.practice\.grad'/.test(src)) throw new Error('the clock must persist');
console.log('wiring: verdicts feed the machine, the queue skips the retired, the panel shows retired-vs-active');

console.log('\ngraduation verified');
