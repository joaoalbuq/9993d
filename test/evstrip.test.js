/* The EV strip: the engine prices every decided round at the
   first click and the felt reports what actually moved — the
   gap is luck, per session. The line is the property under
   test: exact arithmetic (luck = felt − engine), one-decimal
   engine and luck against a fmt'd felt, singular rounds, and
   the wiring that prices the first decision, carries the
   insurance leg, and commits once per round at settle. The
   gap is also BANDED by the engine's accumulated standard
   deviation — even, cool, warm, cold, hot, freak — so hot
   and cold know how unusual they are.                     */
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
const luckFull = grab('  function luckWord(s) {', '\n  }');
const luckBody = luckFull.slice(luckFull.indexOf('{') + 1, luckFull.lastIndexOf('}'));
const luckWord = new Function('return function luckWord(s) {' + luckBody + '}')();
const bandFull = grab('  function luckBand(s) {', '\n  }');
const bandBody = bandFull.slice(bandFull.indexOf('{') + 1, bandFull.lastIndexOf('}'));
const luckBand = new Function('return function luckBand(s) {' + bandBody + '}')();
const evStripLine = new Function('fmt', 'luckWord', 'luckBand', 'return function evStripLine(s) {' + fnBody + '}')(fmt, luckWord, luckBand);

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

/* --- the gap's own word, and the pill that carries it --- */
if (luckWord({ ev: -3.1, felt: -25 }) !== '\u221221.9') throw new Error('cold luck word');
if (luckWord({ ev: -2, felt: 10 }) !== '+12.0') throw new Error('hot luck word');
if (luckWord({ ev: 0, felt: 0 }) !== '+0.0') throw new Error('a perfect reconciliation reads signed');
if (!/\\u00b7 ' \+ luckWord\(evSession\) \+ ' luck/.test(src))
  throw new Error('the coach pill must carry the gap');
if (!/if \(evSession\.rounds\) el\.textContent \+=/.test(src))
  throw new Error('the pill shows the gap only once a round has been priced');
const commit2 = grab('    if (evRound && evPriced) {', 'renderCoach();');
if (!/renderEvStrip\(\);/.test(commit2))
  throw new Error('the settle commit must refresh both the strip and the pill');
if (!/luckWord\(s\)/.test(src))
  throw new Error('the strip must read the same word as the pill \u2014 one source for the gap');
console.log('the pill: "\u221248.0 luck" rides the coach score \u2014 one source for the gap, refreshed at the commit');

/* --- the band: the gap read as a distance in the engine's spreads --- */
const card = { rounds: 1, ev: 0, felt: 0, sd2: 13225 };   /* one round at 100: spread 115 */
if (luckBand({ rounds: 1, ev: -3.1, felt: -25 }) !== '')
  throw new Error('a session without a spread cannot claim a band');
if (luckBand(Object.assign({}, card, { felt: 50 })) !== 'even')
  throw new Error('inside one spread is even');
if (luckBand(Object.assign({}, card, { felt: -150 })) !== 'cool')
  throw new Error('past one spread cold-side reads cool');
if (luckBand(Object.assign({}, card, { felt: 180 })) !== 'warm')
  throw new Error('past one spread hot-side reads warm');
if (luckBand(Object.assign({}, card, { felt: -250 })) !== 'cold')
  throw new Error('past two spreads reads cold');
if (luckBand(Object.assign({}, card, { felt: 250 })) !== 'hot')
  throw new Error('past two spreads reads hot');
if (luckBand(Object.assign({}, card, { felt: -400 })) !== 'freak cold')
  throw new Error('past three spreads cold-side is a freak');
if (luckBand(Object.assign({}, card, { felt: 400 })) !== 'freak hot')
  throw new Error('past three spreads hot-side is a freak');
const grown = { rounds: 12, ev: -3.1, felt: -25, sd2: 12 * 13225 };   /* more rounds, wider spread */
if (luckBand(grown) !== 'even')
  throw new Error('\u221221.9 over twelve rounds is ordinary: ' + luckBand(grown));
console.log('the band: even < 1 spread, cool/warm < 2, cold/hot < 3, freak past \u2014 sizes, not moods');

/* --- the strip carries the band; old sessions read unchanged --- */
const banded = evStripLine({ rounds: 2, ev: -2, felt: 234, sd2: 13225 });
if (!/2 rounds \u00b7 hot$/.test(banded)) throw new Error('the strip must end in the band: ' + banded);
if (!/<b>\+236\.0<\/b> luck/.test(banded)) throw new Error('the gap rides beside its band: ' + banded);
const evenStrip = evStripLine({ rounds: 1, ev: 0, felt: 50, sd2: 13225 });
if (!/1 round \u00b7 even$/.test(evenStrip)) throw new Error('an ordinary session says so: ' + evenStrip);
console.log('the strip: the band rides the round count \u2014 and sessions without a spread read exactly as before');

/* --- the wiring: variance accumulates where the legs do --- */
if (!/var evSession = \{ rounds: 0, ev: 0, felt: 0, sd2: 0 \};/.test(src))
  throw new Error('the session must carry its accumulated spread');
if (!/'999\.practice\.evsession'/.test(src) || !/function saveEv\(\)/.test(src))
  throw new Error('the reconciliation must persist, like the reel');
if (!/typeof evRaw\.rounds === 'number' && typeof evRaw\.ev === 'number' &&\n        typeof evRaw\.felt === 'number' && typeof evRaw\.sd2 === 'number'/.test(src))
  throw new Error('a restored book must be all numbers or not restored at all');
if (!grab('evSession.sd2 += Math.pow(HAND_SD * (doubled ? 2 * bet : bet), 2);', 'renderEvStrip();').includes('saveEv();'))
  throw new Error('the settle commit must save the book it just banked');
if (!/  renderCoach\(\);\n  renderCount\(\);\n  renderEvStrip\(\);/.test(src))
  throw new Error('the restored book must draw at boot, not only at the next settle');
if (!/var HAND_SD = 1\.15;/.test(src))
  throw new Error('the hand spread must be named, not magic');
if (!/evSession\.sd2 \+= Math\.pow\(HAND_SD \* \(doubled \? 2 \* bet : bet\), 2\);/.test(src))
  throw new Error('settle must bank the round\u2019s width \u2014 a double rides twice');
if (!/evSession\.sd2 \+= insBet \* insBet \* \(1 \+ 3 \* td - Math\.pow\(3 \* td - 1, 2\)\);/.test(src))
  throw new Error('the insurance leg must bank its own spread');
if (!/\\u00b7 ' \+ luckWord\(evSession\) \+ ' luck \\u00b7 ' \+ luckBand\(evSession\);/.test(src))
  throw new Error('the pill must name the gap AND its band');
console.log('wiring: the spread banks with the legs at settle \u2014 pill and strip read the same band');

console.log('\nev strip verified');
