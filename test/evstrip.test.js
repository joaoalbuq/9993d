/* The EV strip: the engine prices every decided round at the
   first click and the felt reports what actually moved — the
   gap is luck, per session. The line is the property under
   test: exact arithmetic (luck = felt − engine), one-decimal
   engine and luck against a fmt'd felt, singular rounds, and
   the wiring that prices the first decision, carries the
   insurance leg, and commits once per round at settle.     */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- evStripLine, exactly as shipped, over the page's own fmt --- */
function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
const fmtMatch = src.match(/function fmt\(n\) \{ return[^\n]*\}/);   /* fmt is a one-liner on the page */
if (!fmtMatch) throw new Error('fmt one-liner not found');
const fmt = new Function('n', fmtMatch[0].slice(fmtMatch[0].indexOf('{') + 1, -1) + '\nreturn fmt;');

const fnFull = grab('  function evStripLine(s) {', '\n  }');
const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
const evStripLine = new Function('fmt', 'return function evStripLine(s) {' + fnBody + '}')(fmt);

/* --- an empty session draws no line --- */
if (evStripLine({ rounds: 0, ev: 0, felt: 0 }) !== '') throw new Error('empty session must draw nothing');
if (evStripLine(null) !== '') throw new Error('null session must draw nothing');
console.log('empty session: no strip — nothing priced, nothing claimed');

/* --- the arithmetic: luck is exactly felt − engine --- */
const cold = evStripLine({ rounds: 12, ev: -3.1, felt: -25 });
if (!/EV <b>\u22123\.1<\/b> engine/.test(cold)) throw new Error('engine word: ' + cold);
if (!/<b>\u221225<\/b> felt/.test(cold)) throw new Error('felt word: ' + cold);
if (!/<b>\u221221\.9<\/b> luck/.test(cold)) throw new Error('luck word (felt \u2212 engine = \u221221.9): ' + cold);
if (!/12 rounds/.test(cold)) throw new Error('round count: ' + cold);
console.log('cold session: EV \u22123.1 engine \u00b7 \u221225 felt \u00b7 \u221221.9 luck \u2014 the gap is named, not hidden');

/* --- a hot session: the felt outran the engine --- */
const hot = evStripLine({ rounds: 3, ev: -2, felt: 10 });
if (!/<b>\+10<\/b> felt/.test(hot)) throw new Error('positive felt: ' + hot);
if (!/<b>\+12\.0<\/b> luck/.test(hot)) throw new Error('positive luck (felt \u2212 engine = +12.0): ' + hot);
console.log('hot session: EV \u22122.0 engine \u00b7 +10 felt \u00b7 +12.0 luck \u2014 running good reads the same way');

/* --- halves and singulars --- */
const half = evStripLine({ rounds: 1, ev: -13.25, felt: 37.5 });
if (!/<b>\u221213\.3<\/b> engine/.test(half)) throw new Error('engine one decimal: ' + half);
if (!/<b>\+37\.5<\/b> felt/.test(half)) throw new Error('half-chip felt (3:2 payout): ' + half);
if (!/1 round\b/.test(half)) throw new Error('singular round: ' + half);
console.log('halves and singulars: 3:2 payouts keep their half-chip, one round reads singular');

/* --- the wiring: price the first decision, carry insurance, commit once --- */
if (!/    evRound = !reviewMode; evPriced = false; evRoundExp = 0; evInsExp = 0;/.test(src))
  throw new Error('deal() must reset the per-round ledger');
for (const [fn, play] of [['hit', 'hit'], ['stand', 'stand'], ['doubleDown', 'double']]) {
  const body = grab('  function ' + fn + '() {', 'coachVerdict(\'' + play + '\');');
  if (!body.includes("evPrice('" + play + "')")) throw new Error(fn + ' must price its play before it acts');
}
if (!grab('  function takeInsurance(yes) {', 'bank -= insBet;').includes('evInsPrice();'))
  throw new Error('takeInsurance must price the side bet');
const commit = grab('    var st = SHOE999.settle(you, dealerArr, bet);', 'renderEvStrip();');
if (!/if \(evRound && evPriced\) \{/.test(commit)) throw new Error('settle must commit only decided rounds');
if (!/evSession\.felt \+= st\.net \+ insWin - insStake;/.test(commit))
  throw new Error('the felt leg must carry the main bet AND the insurance movement');
if (!/evSession\.ev \+= evRoundExp \+ evInsExp;/.test(commit))
  throw new Error('the engine leg must carry the decision price AND the insurance edge');
if (!/<p class="evstrip" id="evStrip" hidden><\/p>/.test(src)) throw new Error('the strip element must exist on the felt');
console.log('wiring: first click prices, insurance rides along, settle commits once \u2014 both legs, one line');

console.log('\nev strip verified');
