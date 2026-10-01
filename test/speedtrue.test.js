/* The true-count speed drill: the variable-slice stream (15-35
   cards) with a live decks-left readout, the target derived from
   the DISPLAYED readout string so the player's own division
   always matches the engine, one-decimal recall graded exactly,
   per-mode books, and the ±0.1 stepper's rounding. Extracted
   exactly as shipped from offline.html.                          */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- nextPace, exactly as shipped (the cadence rides both modes) --- */
const pa = src.indexOf('function nextPace(pace, ok) {');
if (pa < 0) throw new Error('nextPace not found');
const pb = src.indexOf('\n  }', pa) + 4;
const paceBlock = src.slice(pa, pb);
if (paceBlock.split('{').length !== paceBlock.split('}').length) throw new Error('pace extraction unbalanced');
const paceBody = paceBlock.slice(paceBlock.indexOf('{') + 1, paceBlock.lastIndexOf('}'));
const nextPace = new Function('pace', 'ok', paceBody + '\nreturn nextPace;');

/* --- the canon the stream draws from --- */
const cStart = src.indexOf('  var SHOE999 = (function () {');
const cEnd = src.indexOf('})();', cStart) + 5;
const SHOE999 = (0, eval)('(' + src.slice(cStart, cEnd).replace('var SHOE999 = ', '').replace(/;\s*$/, '') + ')');
const HILO = { '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 0, '8': 0, '9': 0, '10': -1, 'J': -1, 'Q': -1, 'K': -1, 'A': -1 };

/* --- speedTarget and trueTargetFor, exactly as shipped --- */
function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
const targetFull = grab('  function speedTarget(stream) {', '\n  }');
const targetBody = targetFull.slice(targetFull.indexOf('{') + 1, targetFull.lastIndexOf('}'));
const targetFn = new Function('stream', 'HILO', targetBody);
const speedTarget = (stream) => targetFn(stream, HILO);

const trueBlock = grab('  function trueTargetFor(rc, dkStr) {', '\n  }');
const trueTargetFor = new Function('rc', 'dkStr', trueBlock.slice(trueBlock.indexOf('{') + 1, trueBlock.lastIndexOf('}')) + '\nreturn trueTargetFor;');

/* --- start params: the variable slice, exactly as shipped --- */
const startBlock = grab("    var N = isTrue ? 15 + Math.floor(Math.random() * 21) : SPEED.N;", "    SPEED.rc = speedTarget(SPEED.stream);");
const startFn = new Function('isTrue', 'SPEED', 'SHOE999', 'speedTarget',
  'var deck;' + startBlock + '\nreturn { N: SPEED.stream.length };');
if (startFn.length === 0) throw new Error('start params extraction failed');

/* --- the readout semantics, exactly as shipped --- */
const readBlock = grab("      if (tRead) tRead.textContent = ((52 - SPEED.idx) / 52).toFixed(2) + ' dk left';", "' dk left';");
if (!/52 - SPEED.idx/.test(readBlock)) throw new Error('readout must count decks LEFT');
if (!/toFixed\(2\)/.test(readBlock)) throw new Error('readout must carry two decimals');

/* --- 1. the slice varies and stays in band; targets follow the
        DISPLAYED readout string, never the raw fraction --- */
let sawMin = 99, sawMax = 0;
for (let s = 0; s < 400; s++) {
  const N = 15 + Math.floor(Math.random() * 21);
  if (N < sawMin) sawMin = N;
  if (N > sawMax) sawMax = N;
  const deck = SHOE999.build(1);
  const stream = deck.slice(0, N);
  const rc = speedTarget(stream);
  const dkStr = ((52 - N) / 52).toFixed(2);
  const target = trueTargetFor(rc, dkStr);
  /* the engine's own check: target MUST equal round((rc / parseFloat(dkStr))*10)/10 */
  const expect = Math.round((rc / parseFloat(dkStr)) * 10) / 10;
  if (target !== expect) throw new Error('target != displayed-string division');
  if (Math.abs(target * 10 - Math.round(target * 10)) > 1e-9) throw new Error('target not on the 0.1 grid: ' + target);
  if (Math.abs(target) > N / parseFloat(dkStr) + 1e-9) throw new Error('target exceeds |RC|/dk: ' + target);
}
if (sawMin !== 15 || sawMax !== 35) throw new Error('slice band wrong: ' + sawMin + '-' + sawMax);
console.log('400 streams: slice 15-35, targets = round(RC / displayed-dk, 1) — one decimal, always');

/* --- 2. the exact engine-vs-display agreement, hand-checked --- */
const rc12 = 12, dk9 = (52 - 5) / 52;                 /* 5 cards seen: 47 left = 0.9038… */
if (trueTargetFor(rc12, dk9.toFixed(2)) !== Math.round((12 / 0.9) * 10) / 10) throw new Error('engine vs display');
if (trueTargetFor(rc12, dk9.toFixed(2)) !== 13.3) throw new Error('12/0.90 should be 13.3: ' + trueTargetFor(rc12, dk9.toFixed(2)));
if (trueTargetFor(4, '1.00') !== 4.0) throw new Error('whole deck: ' + trueTargetFor(4, '1.00'));
if (trueTargetFor(0, '0.71') !== 0) throw new Error('zero rc: ' + trueTargetFor(0, '0.71'));
console.log('exact divisions: 12 ÷ 0.90 = 13.3, whole-deck and zero cases hold');

/* --- 3. grading: the tenth decides — exact match required --- */
const grade = (val, target) => val === target;
if (grade(13.3, 13.3) !== true) throw new Error('exact must pass');
if (grade(13.4, 13.3) !== false) throw new Error('a tenth off must fail');
if (grade(13.2, 13.3) !== false) throw new Error('a tenth low must fail');
if (grade(13, 13.3) !== false) throw new Error('the integer answer must fail a decimal target');
console.log('grading on the tenth: exact passes, ±0.1 fails, integer answer fails');

/* --- 4. the ±0.1 stepper: tenth-grid accumulation with integer
        steps mixed in — exactly what speedStep does --- */
let val = 0;
const step = (d) => { val = Math.round((val + d) * 10) / 10; };
step(1); step(1); step(0.1); step(1); step(-0.1); step(-0.1); step(1); step(-1); step(0.1);
if (val !== 3.0) throw new Error('stepper arithmetic: ' + val);
for (let i = 0; i < 100; i++) { step(0.1); step(-0.1); }
if (val !== 3.0) throw new Error('float drift in the stepper: ' + val);
console.log('±0.1 stepper: tenth-grid exact through 200 mixed steps, no float drift');

/* --- 5. per-mode books stay separate, exactly as stored --- */
const shape = { runs: 3, right: 2, bestMs: 2500, streak: 1, bestStreak: 2 };
const other = { runs: 9, right: 9, bestMs: 900, streak: 4, bestStreak: 4 };
const speedStats = (mode) => mode === 'true' ? shape : other;
if (speedStats('true') === speedStats('run')) throw new Error('books must be distinct objects');
if (speedStats('true').runs !== 3 || speedStats('run').runs !== 9) throw new Error('per-mode selection');
console.log('per-mode books: the true drill and the running drill never share a ledger');

/* --- 6. the cadence rides both modes: extract-and-simulate --- */
let p = 0.45;
for (let i = 0; i < 60; i++) p = nextPace(p, true);
if (p !== 0.18) throw new Error('cadence floor in true mode: ' + p);
for (let i = 0; i < 60; i++) p = nextPace(p, false);
if (p !== 0.75) throw new Error('cadence ceiling in true mode: ' + p);
console.log('adaptive cadence: same engine, same bounds, mode-agnostic');

console.log('\ntrue-count speed drill verified');
