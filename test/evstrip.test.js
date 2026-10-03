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
/* --- the shared module: both pages load it as window.LUCK999, the
       tests require it directly, so the strip / band / sigma / tone /
       cross math has exactly one source                     --- */
const modpath = path.join(__dirname, '..', 'luck999.js');
const modsrc = fs.readFileSync(modpath, 'utf8');
const LUCK = require(modpath);
const luckWord = LUCK.word, luckBand = LUCK.band, luckSigma = LUCK.sigma,
      luckTone = LUCK.tone, evStripLine = LUCK.stripLine;
if (!/<script src="luck999.js"><\/script>/.test(src))
  throw new Error('the practice page must load the shared luck module');

/* --- the crossing: the band leaves "even" the moment the gap tops
       its first spread. That edge is what the pulse fires on.  --- */
const luckOut = LUCK.out, luckCross = LUCK.cross;
if (luckOut({ rounds: 1, ev: 0, felt: 50, sd2: 13225 }) !== false) throw new Error('inside one spread is no crossing');
if (luckOut({ rounds: 1, ev: 0, felt: -150, sd2: 13225 }) !== true) throw new Error('past a spread cold is an outlier');
if (luckOut({ rounds: 1, ev: 0, felt: 180, sd2: 13225 }) !== true) throw new Error('past a spread hot is an outlier');
if (luckOut({ rounds: 1, ev: 0, felt: 0 }) !== false) throw new Error('no spread, no crossing');
const inSpread = { rounds: 1, ev: 0, felt: 50, sd2: 13225 };
const pastSpread = { rounds: 1, ev: 0, felt: -150, sd2: 13225 };
if (luckCross(null, pastSpread).fire !== false) throw new Error('a recalled outlier must set its mark quietly');
if (luckCross(false, pastSpread).fire !== true) throw new Error('the first draw past a spread must fire the pulse');
if (luckCross(true, pastSpread).fire !== false) throw new Error('a steady outlier must not pulse again');
if (luckCross(true, inSpread).fire !== false) throw new Error('falling back inside must fire nothing');
if (luckCross(true, inSpread).out !== false) throw new Error('the mark drops when the gap falls back inside');
console.log('the crossing: the band leaving "even" is the one draw the pulse fires on');

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
const commit = grab('    var myStake = handStakeTotal();', 'renderEvStrip();');
if (!/if \(evRound && evPriced\) \{/.test(commit)) throw new Error('settle must commit only decided rounds');
if (!/evSession\.felt \+= myNet \+ insWin - insStake;/.test(commit))
  throw new Error('the felt leg must carry the main bet AND the insurance movement');
if (!/evSession\.ev \+= evRoundExp \+ evInsExp;/.test(commit))
  throw new Error('the engine leg must carry the decision price AND the insurance edge');
if (!/<p class="evstrip" id="evStrip" hidden><\/p>/.test(src)) throw new Error('the strip element must exist on the felt');
console.log('wiring: first click prices, insurance rides along, settle commits once \u2014 both legs, one line');

/* --- the gap's own word, and the pill that carries it --- */
if (luckWord({ ev: -3.1, felt: -25 }) !== '\u221221.9') throw new Error('cold luck word');
if (luckWord({ ev: -2, felt: 10 }) !== '+12.0') throw new Error('hot luck word');
if (luckWord({ ev: 0, felt: 0 }) !== '+0.0') throw new Error('a perfect reconciliation reads signed');
if (!/\\u00b7 ' \+ LUCK999\.word\(evSession\) \+ ' luck/.test(src))
  throw new Error('the coach pill must carry the gap');
if (!/if \(evSession\.rounds\) el\.textContent \+=/.test(src))
  throw new Error('the pill shows the gap only once a round has been priced');
const commit2 = grab('    if (evRound && evPriced) {', 'renderCoach();');
if (!/renderEvStrip\(\);/.test(commit2))
  throw new Error('the settle commit must refresh both the strip and the pill');
if (!/LUCK999\.word\(evSession\)/.test(src) || !/LUCK999\.stripLine\(/.test(src))
  throw new Error('the strip and the pill must read the one shared word');
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

/* --- the band from a bare z: the same word, so a remembered
       extreme needs no book, only the z it was measured at --- */
const luckZ = LUCK.z, luckBandOf = LUCK.bandOf, luckZSig = LUCK.zSig;
if (luckZ({ ev: 0, felt: 0 }) !== null || luckZ({ rounds: 1, ev: -3.1, felt: -25 }) !== null)
  throw new Error('no spread is no z');
if (Math.abs(luckZ({ ev: 0, felt: 115, sd2: 13225 }) - 1) > 1e-9)
  throw new Error('the z is the gap over the spread: ' + luckZ({ ev: 0, felt: 115, sd2: 13225 }));
if (luckBandOf(0.4) !== 'even' || luckBandOf(-1.5) !== 'cool' || luckBandOf(1.5) !== 'warm' ||
    luckBandOf(-2.5) !== 'cold' || luckBandOf(2.5) !== 'hot' ||
    luckBandOf(-3.5) !== 'freak cold' || luckBandOf(3.5) !== 'freak hot')
  throw new Error('bandOf must name every size from the z alone');
if (luckZSig(2.44) !== '+2.4\u03c3' || luckZSig(-3) !== '\u22123.0\u03c3')
  throw new Error('zSig formats a remembered z: ' + luckZSig(-3));
const zBook = { ev: 0, felt: 250, sd2: 13225 };
if (luckBand(zBook) !== luckBandOf(luckZ(zBook)))
  throw new Error('band and bandOf must agree \u2014 one source, one word');
console.log('the band from a z: the word needs no book \u2014 a remembered extreme names itself');

/* --- the sigma readout: the gap as a distance in the engine's
       own spreads, signed — a hot streak knows how hot     --- */
if (luckSigma({ ev: 0, felt: 0 }) !== '') throw new Error('no spread, no sigma');
if (luckSigma({ ev: -3.1, felt: -25 }) !== '') throw new Error('a session without a spread cannot measure');
if (luckSigma({ ev: 0, felt: 115, sd2: 13225 }) !== '+1.0\u03c3')
  throw new Error('one spread hot reads +1.0\u03c3: ' + luckSigma({ ev: 0, felt: 115, sd2: 13225 }));
if (luckSigma({ ev: 0, felt: -230, sd2: 13225 }) !== '\u22122.0\u03c3')
  throw new Error('two spreads cold reads signed: ' + luckSigma({ ev: 0, felt: -230, sd2: 13225 }));
if (luckSigma({ rounds: 12, ev: -3.1, felt: -25, sd2: 12 * 13225 }) !== '\u22120.1\u03c3')
  throw new Error('a wide session measures small: ' + luckSigma({ rounds: 12, ev: -3.1, felt: -25, sd2: 12 * 13225 }));
if (luckTone({ ev: 0, felt: 50 }) !== '') throw new Error('no spread, no colour');
if (luckTone({ ev: 0, felt: 50, sd2: 13225 }) !== 'ok') throw new Error('run-good reads green');
if (luckTone({ ev: 0, felt: 115, sd2: 13225 }) !== 'ok')
  throw new Error('run-good reads green however far it runs');
if (luckTone({ ev: 0, felt: 0, sd2: 13225 }) !== '') throw new Error('dead even is no call');
if (luckTone({ ev: 0, felt: -20, sd2: 13225 }) !== 'out') throw new Error('even a small cold gap reads red');
if (luckTone({ ev: 0, felt: -120, sd2: 13225 }) !== 'out') throw new Error('a cold gap reads red');
console.log('luckSigma: +1.0\u03c3 hot, \u22122.0\u03c3 cold, \u221221.9 over twelve rounds \u22120.1\u03c3 \u2014 the gap as a distance');
console.log('luckTone: run-good green however far, only a cold gap red, dead even no call, no spread no colour');

/* --- the strip carries the sigma and its band; old sessions read unchanged --- */
const banded = evStripLine({ rounds: 2, ev: -2, felt: 234, sd2: 13225 });
if (!/2 rounds \u00b7 <span class="sd">\+2\.1\u03c3<\/span> hot$/.test(banded)) throw new Error('the strip must end in the signed spread and its band: ' + banded);
if (!/\.evstrip \.sd \{ text-transform: none; \}/.test(src))
  throw new Error('the sigma must keep its case against the strip\u2019s uppercasing');
if (!/<b class="luck ok">\+236\.0<\/b> luck/.test(banded))
  throw new Error('a runaway hot gap still wears green: ' + banded);
if (!/\.evstrip b\.luck\.ok \{ color: #43c98a; \}/.test(src) ||
    !/\.evstrip b\.luck\.out \{ color: #e2705f; \}/.test(src))
  throw new Error('the strip must colour run-good green, cold red');
const quietLuck = evStripLine({ rounds: 1, ev: 0, felt: 50, sd2: 13225 });
if (!/<b class="luck ok">\+50\.0<\/b> luck/.test(quietLuck)) throw new Error('the ordinary gap wears green: ' + quietLuck);
const evenStrip = evStripLine({ rounds: 1, ev: 0, felt: 50, sd2: 13225 });
if (!/1 round \u00b7 <span class="sd">\+0\.4\u03c3<\/span> even$/.test(evenStrip)) throw new Error('an ordinary session says so, with its own width: ' + evenStrip);
console.log('the strip: the sigma and the band ride the round count \u2014 and sessions without a spread read exactly as before');

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
if (!/var HAND_SD = LUCK999\.HAND_SD;/.test(src))
  throw new Error('the hand spread must come from the shared module');
if (!/LUCK999\.sigma\(/.test(src))
  throw new Error('the strip must read the shared sigma');
if (!/var b = band\(s\), sig = sigma\(s\), tn = tone\(s\);/.test(modsrc))
  throw new Error('the shared strip must read the sigma and the tone beside the band');
if (!/evSession\.sd2 \+= Math\.pow\(HAND_SD \* \(doubled \? 2 \* bet : bet\), 2\);/.test(src))
  throw new Error('settle must bank the round\u2019s width \u2014 a double rides twice');
if (!/evSession\.sd2 \+= insBet \* insBet \* \(1 \+ 3 \* td - Math\.pow\(3 \* td - 1, 2\)\);/.test(src))
  throw new Error('the insurance leg must bank its own spread');
if (!/var evBand = evSession\.rounds \? LUCK999\.band\(evSession\) : '', evSig = evSession\.rounds \? LUCK999\.sigma\(evSession\) : '';/.test(src) ||
    !/el\.textContent \+= ' \\u00b7 ' \+ LUCK999\.word\(evSession\) \+ ' luck'/.test(src) ||
    !/\(evBand \? ' \\u00b7 ' \+ evBand : ''\) \+ \(evSig \? ' \\u00b7 ' \+ evSig : ''\)/.test(src))
  throw new Error('the pill must name the gap, its band and its sigma');
console.log('wiring: the spread banks with the legs at settle \u2014 pill and strip read the same band');

/* --- the live table keeps the same books, from the same engine --- */
const tsrc = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
function tgrab(a, b) {
  const i = tsrc.indexOf(a), j = tsrc.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('table anchor miss: ' + a);
  return tsrc.slice(i, j + b.length);
}
if (!/var trainStats = \{ decisions: 0, book: 0, loss: 0, lossBase: 0, ev: 0, felt: 0, rounds: 0, sd2: 0 \};/.test(tsrc))
  throw new Error('the table score must carry the book in its own stats');
if (!/typeof trainStats\.ev !== 'number' \|\| typeof trainStats\.rounds !== 'number'/.test(tsrc))
  throw new Error('an old stored score must migrate, not NaN');
if (!/typeof trainStats\.sd2 !== 'number'\) trainStats\.sd2 = 0;/.test(tsrc))
  throw new Error('a book from before the spread must keep its totals, its band waiting');
if (!/var evRoundT = false, evPricedT = false, evBookT = 0;/.test(tsrc))
  throw new Error('the round book must start closed');
if (!/evRoundT = true; evPricedT = false; evBookT = 0;/.test(tsrc))
  throw new Error('every round must open its own book');
if (!/if \(!\(h\.stake \|\| 0\)\) \{ evRoundT = false; return; \}/.test(tsrc))
  throw new Error('a stakeless round stays out of the book');
if (!/evBookT = p \* \(h\.stake \|\| UNIT_BET\);/.test(tsrc))
  throw new Error('the price rides the box\u2019s own stake');
if (!tgrab('  function verdictT(choice) {', 'trainStats.decisions++;').includes('priceT(choice);'))
  throw new Error('the first decision must price the round\u2019s book');
if (!tgrab('game.walk = [];', 'if (i === YOUR) myNet = st.net;').includes('var myNet = 0;'))
  throw new Error('the settle must capture the player box\u2019s felt movement');
const tCommit = tgrab('if (evRoundT && evPricedT) {', 'renderTrain();\n    }');
if (!/trainStats\.rounds\+\+;/.test(tCommit) || !/trainStats\.ev \+= evBookT;/.test(tCommit) ||
    !/trainStats\.felt \+= myNet;/.test(tCommit) || !/saveT\(\);/.test(tCommit))
  throw new Error('settle must commit both legs and save, like the practice floor');
if (!/var tWidth = Math\.pow\(HAND_SD \* tStake, 2\);/.test(tCommit) || !/trainStats\.sd2 \+= tWidth;/.test(tCommit))
  throw new Error('the table settle must bank the round\u2019s width');
if (!/flushRecon\(evBookT, myNet, tWidth\);/.test(tCommit))
  throw new Error('the settle must hand the round to the practice floor\u2019s book');
/* the hand-off settle line carries the round's own luck gap, so both
   felts reconcile in the same sentence the misses ride over in */
if (!/setStatus\('Round settles \u2014 the payout walk'/.test(tsrc))
  throw new Error('the settle must keep its payout-walk status line');
if (!/evRoundT && evPricedT \? ' · ' \+ LUCK999\.word\(\{ felt: myNet, ev: evBookT \}\)/.test(tsrc))
  throw new Error('the settle line must carry the round\u2019s luck gap, felt against engine');
if (!/both felts reconcile/.test(tsrc))
  throw new Error('the settle line must name the reconciliation of the two books');
if (LUCK.word({ felt: 12.3, ev: 20 }) !== '\u22127.7')
  throw new Error('the settle gap is felt minus engine, signed: ' + LUCK.word({ felt: 12.3, ev: 20 }));
if (!/var tBand = trainStats\.rounds \? LUCK999\.band\(trainStats\) : ''/.test(tsrc) ||
    !/tSig = trainStats\.rounds \? LUCK999\.sigma\(trainStats\) : '';/.test(tsrc) ||
    !/\+ ' luck' \+ \(tBand \? ' \\u00b7 ' \+ tBand : ''\) \+ \(tSig \? ' \\u00b7 ' \+ tSig : ''\)/.test(tsrc))
  throw new Error('the score line must carry the gap, its band and its sigma, once a round is booked');
if (!/LUCK999\.word\(trainStats\)/.test(tsrc))
  throw new Error('the table\u2019s luck is the same shared gap: felt minus engine');
console.log('the live table: the score line carries the luck \u2014 same engine, same gap, persisted in the trainstats');

/* --- the table's own strip: the same reconciliation, measured --- */
/* the overlay reads the SAME module the floor does — one source */
const tBand = LUCK.band, tSig = LUCK.sigma, tTone = LUCK.tone, tStrip = LUCK.stripLine;
if (!/<script src="luck999.js"><\/script>/.test(tsrc))
  throw new Error('the table page must load the shared luck module');
if (tBand({ ev: 0, felt: 0 }) !== '') throw new Error('no spread, no table band');
if (tBand({ ev: 0, felt: 0, sd2: 13225 }) !== 'even') throw new Error('inside one spread is even');
if (tBand({ ev: 0, felt: 230, sd2: 13225 }) !== 'hot') throw new Error('past two spreads reads hot');
if (tSig({ ev: 0, felt: 115, sd2: 13225 }) !== '+1.0\u03c3') throw new Error('one spread reads +1.0\u03c3: ' + tSig({ ev: 0, felt: 115, sd2: 13225 }));
if (tStrip({ rounds: 0, ev: 0, felt: 0 }) !== '') throw new Error('an empty table book draws no strip');
const tLine = tStrip({ rounds: 2, ev: -2, felt: 234, sd2: 13225 });
if (!/2 rounds \u00b7 <span class="sd">\+2\.1\u03c3<\/span> hot$/.test(tLine))
  throw new Error('the table strip must end in the sigma and its band: ' + tLine);
if (!/<b class="luck ok">\+236\.0<\/b> luck/.test(tLine))
  throw new Error('the table runaway gap still wears green: ' + tLine);
if (tTone({ ev: 0, felt: 50, sd2: 13225 }) !== 'ok') throw new Error('the table reads run-good green');
if (tTone({ ev: 0, felt: 115, sd2: 13225 }) !== 'ok') throw new Error('the table reads run-good green however far');
if (tTone({ ev: 0, felt: -50, sd2: 13225 }) !== 'out') throw new Error('the table reads a cold gap red');
/* --- the overlay's own crossing, the floor's rule again --- */
const tOut = LUCK.out, tCross = LUCK.cross;
if (tOut({ ev: 0, felt: 50, sd2: 13225 }) !== false) throw new Error('the table reads inside one spread');
if (tOut({ ev: 0, felt: -150, sd2: 13225 }) !== true) throw new Error('the table reads past a spread as an outlier');
if (tCross(null, { ev: 0, felt: -150, sd2: 13225 }).fire !== false) throw new Error('a recalled table outlier must set its mark quietly');
if (tCross(false, { ev: 0, felt: -150, sd2: 13225 }).fire !== true) throw new Error('the table crossing must fire the pulse');
if (tCross(true, { ev: 0, felt: -150, sd2: 13225 }).fire !== false) throw new Error('a steady table outlier must not pulse again');
if (!/<b class="luck ok crossed">/.test(tStrip({ rounds: 2, ev: -2, felt: 234, sd2: 13225 }, true)))
  throw new Error('the table crossing draw must wear the pulse class');
if (/crossed/.test(tStrip({ rounds: 2, ev: -2, felt: 234, sd2: 13225 })))
  throw new Error('the table redraw after the crossing must wear the plain tone');
if (!/LUCK999\.cross\(tOut, trainStats\)/.test(tsrc) || !/LUCK999\.stripLine\(trainStats, crossT\.fire\)/.test(tsrc))
  throw new Error('the overlay must read the crossing before it draws the strip');
if (!/\.training \.evstrip b\.luck\.crossed \{ animation: luckpulse/.test(tsrc) || !/@keyframes luckpulse/.test(tsrc))
  throw new Error('the table crossing must carry its own pulse');
console.log('the table crossing: its own mark, its own pulse \u2014 the band leaving "even" once');
if (!/\.training \.evstrip b\.luck\.ok \{ color: #43c98a; \}/.test(tsrc) ||
    !/\.training \.evstrip b\.luck\.out \{ color: #e2705f; \}/.test(tsrc))
  throw new Error('the table strip must colour run-good green, cold red');
if (!/var strip = LUCK999\.stripLine\(trainStats, crossT\.fire\);/.test(tsrc))
  throw new Error('the overlay must draw the reconciliation strip under the score');
if (!/var HAND_SD = LUCK999\.HAND_SD;/.test(tsrc))
  throw new Error('the table hand spread must come from the shared module');
if (!/\.training \.evstrip \.sd \{ text-transform: none; \}/.test(tsrc))
  throw new Error('the table sigma must keep its case against the overlay\u2019s uppercasing');
console.log('the table strip: its own measured reconciliation \u2014 +236.0 luck over two rounds reads +2.1\u03c3 hot');

/* --- the new book: a tap on the strip clears the reconciliation
       and the luck band, on demand. The tap rides the rebuilt
       innerHTML (the strip is re-rendered), so it must be drawn
       there and caught by delegation on the felt.          --- */
const renderFull = grab('  function renderEvStrip() {', '\n  }');
const renderBody = renderFull.slice(renderFull.indexOf('{') + 1, renderFull.lastIndexOf('}'));
function makeFn(fnSrc) {
  const body = fnSrc.slice(fnSrc.indexOf('{') + 1, fnSrc.lastIndexOf('}'));
  const sig = fnSrc.slice(fnSrc.indexOf('('), fnSrc.indexOf(')') + 1);
  const name = fnSrc.slice(fnSrc.indexOf('function ') + 9, fnSrc.indexOf('(')).trim();
  return new Function('LUCK999', 'return function ' + name + sig + ' {' + body + '}')(LUCK);
}
const splitFelt = makeFn(grab('  function splitFelt(', '\n  }'));
const feltTag = makeFn(grab('  function feltTag(', '\n  }'));
function drawStrip(session, prev, table) {
  const el = { hidden: false, innerHTML: 'stale' };
  new Function('document', 'LUCK999', 'evSession', 'evOut', 'splitFelt', 'tableBook', 'feltTag',
    'return function renderEvStrip() {' + renderBody + '}')(
    { getElementById: () => el }, LUCK, session, prev, splitFelt, () => table || null, feltTag)();
  return el;
}
const drawn = drawStrip({ rounds: 2, ev: -2, felt: 234, sd2: 13225 });
if (!/id="evNewBook"/.test(drawn.innerHTML)) throw new Error('the drawn strip must carry its new-book tap: ' + drawn.innerHTML);
if (!/<span class="newbook" id="evNewBook">\u21ba new book<\/span>$/.test(drawn.innerHTML))
  throw new Error('the new-book tap must close the line: ' + drawn.innerHTML);
const blank = drawStrip({ rounds: 0, ev: 0, felt: 0, sd2: 0 });
if (blank.innerHTML !== '' || !blank.hidden) throw new Error('an empty book draws no strip and no tap');
/* the crossing rides the drawn line, and fires exactly once */
const pulseStrip = drawStrip({ rounds: 2, ev: -2, felt: 234, sd2: 13225 }, false);
if (!/class="luck ok crossed"/.test(pulseStrip.innerHTML))
  throw new Error('the crossing draw must wear the pulse class: ' + pulseStrip.innerHTML);
const steadyStrip = drawStrip({ rounds: 2, ev: -2, felt: 234, sd2: 13225 }, true);
if (/crossed/.test(steadyStrip.innerHTML))
  throw new Error('a steady outlier must not pulse again: ' + steadyStrip.innerHTML);
if (!/LUCK999\.cross\(evOut, evSession\)/.test(src) || !/LUCK999\.stripLine\(evSession, cross\.fire\)/.test(src))
  throw new Error('the strip must read the crossing before it draws');
if (!/\.evstrip b\.luck\.crossed \{ animation: luckpulse/.test(src) || !/@keyframes luckpulse/.test(src))
  throw new Error('the crossing must carry a pulse animation');
const resetFull = grab('  function resetEv() {', '\n  }');
const resetBody = resetFull.slice(resetFull.indexOf('{') + 1, resetFull.lastIndexOf('}'));
if (!/evSession = \{ rounds: 0, ev: 0, felt: 0, sd2: 0 \};/.test(resetBody))
  throw new Error('a new book must zero all four ledger fields');
if (!/saveEv\(\);/.test(resetBody) || !/renderEvStrip\(\);/.test(resetBody) || !/renderCoach\(\);/.test(resetBody))
  throw new Error('a new book must persist, then redraw the strip and the pill');
if (!/e\.target\.id === 'evNewBook'\) resetEv\(\);/.test(src))
  throw new Error('the practice strip must route its tap to resetEv');

/* --- the two felts side by side: after a hand-off the shoe's own
       book is the combined less the rounds the table handed over,
       each named in its own sign's colour --- */
if (!/'999\.table\.trainstats'/.test(src) || !/function tableBook\(\)/.test(src))
  throw new Error('the shoe must read the live table\u2019s own book');
const combined = { rounds: 5, ev: 10, felt: 90, sd2: 5000 };
const tbl = { rounds: 2, ev: 4, felt: 40, sd2: 2000 };
if (splitFelt(combined, null) !== null || splitFelt(combined, { rounds: 0, ev: 0, felt: 0, sd2: 0 }) !== null)
  throw new Error('no hand-off rounds, nothing to lay side by side');
if (splitFelt({ rounds: 2, ev: 4, felt: 40, sd2: 2000 }, tbl) !== null)
  throw new Error('a shoe with no rounds of its own is no side-by-side');
const sp = splitFelt(combined, tbl);
if (!sp || sp.table.rounds !== 2 || sp.shoe.rounds !== 3)
  throw new Error('the split must differ the counts: ' + JSON.stringify(sp));
if (Math.abs(sp.shoe.ev - 6) > 1e-9 || Math.abs(sp.shoe.felt - 50) > 1e-9 || Math.abs(sp.shoe.sd2 - 3000) > 1e-9)
  throw new Error('the shoe is the combined less the table: ' + JSON.stringify(sp.shoe));
const duelDraw = drawStrip(combined, null, tbl);
if (!/\uD83C\uDFB0 the table <b[^>]*>[+\u2212]/.test(duelDraw.innerHTML) ||
    !/the shoe <b[^>]*>[+\u2212]/.test(duelDraw.innerHTML))
  throw new Error('a hand-off round must draw both felts side by side: ' + duelDraw.innerHTML);
if (!/the table <b class="luck ok">\+36\.0<\/b>/.test(duelDraw.innerHTML) ||
    !/the shoe <b class="luck ok">\+44\.0<\/b>/.test(duelDraw.innerHTML))
  throw new Error('each felt reads its own signed gap: ' + duelDraw.innerHTML);
/* the table's own luck is banded by ITS accumulated spread, the
   pill's read \u2014 word, band and sigma against its own book */
if (!/the table <b class="luck ok">\+36\.0<\/b> even <span class="sd">\+0\.8\u03c3<\/span>/.test(duelDraw.innerHTML))
  throw new Error('the table\u2019s luck must carry its own band and sigma: ' + duelDraw.innerHTML);
if (!/the shoe <b class="luck ok">\+44\.0<\/b> even <span class="sd">\+0\.8\u03c3<\/span>/.test(duelDraw.innerHTML))
  throw new Error('the shoe\u2019s own luck must be banded the same way: ' + duelDraw.innerHTML);
if (!/var bd = LUCK999\.band\(s\), sg = LUCK999\.sigma\(s\);/.test(src))
  throw new Error('each felt must band against its own accumulated spread');
const oneFelt = drawStrip(combined, null, null);
if (/the table/.test(oneFelt.innerHTML))
  throw new Error('with no hand-off, the strip stays one felt: ' + oneFelt.innerHTML);
if (!/splitFelt\(evSession, tableBook\(\)\)/.test(src) || !/feltTag\('the shoe', duel\.shoe\)/.test(src))
  throw new Error('the strip must draw the duel through splitFelt and feltTag');
console.log('two felts: each banded by its OWN spread \u2014 the table\u2019s and the shoe\u2019s luck as sizes, one felt until a hand-off');

/* --- the band's far ends: the best and worst z the gap has EVER
       read, kept across sessions and named beside the current band --- */
if (!/'999\.practice\.luckrange'/.test(src) || !/function noteLuck\(\)/.test(src))
  throw new Error('the extremes must persist and be folded in');
const noteSrc = grab('  function noteLuck() {', '\n  }');
function noteRun(book, range) {
  return new Function('LUCK999', 'evSession', 'luckRange', 'saveRange',
    noteSrc + '\nreturn function () { noteLuck(); return luckRange; };')(
    LUCK, book, range, function () {})();
}
const r0 = noteRun({ rounds: 1, ev: 0, felt: 115, sd2: 13225 }, { hi: null, lo: null });
if (Math.abs(r0.hi - 1) > 1e-9 || Math.abs(r0.lo - 1) > 1e-9)
  throw new Error('a first read sets both ends: ' + JSON.stringify(r0));
const r1 = noteRun({ rounds: 1, ev: 0, felt: -230, sd2: 13225 }, { hi: 2.5, lo: 0.2 });
if (r1.hi !== 2.5 || Math.abs(r1.lo + 2) > 1e-9)
  throw new Error('a colder read moves only the floor: ' + JSON.stringify(r1));
const r2 = noteRun({ rounds: 1, ev: 0, felt: 345, sd2: 13225 }, { hi: 2.5, lo: -1 });
if (Math.abs(r2.hi - 3) > 1e-9 || r2.lo !== -1)
  throw new Error('a hotter read moves only the ceiling: ' + JSON.stringify(r2));
if (noteRun({ rounds: 0, ev: 0, felt: 0, sd2: 0 }, { hi: null, lo: null }).hi !== null)
  throw new Error('a book with no spread sets no extreme');
if (!/evSession\.sd2 \+= Math\.pow\(HAND_SD[\s\S]{0,400}noteLuck\(\);[\s\S]{0,300}renderCoach\(\);/.test(src))
  throw new Error('the extremes must ride the settle commit ahead of the pill');
if (!/' \\u00b7 best ' \+ LUCK999\.bandOf\(luckRange\.hi\) \+ ' ' \+ LUCK999\.zSig\(luckRange\.hi\)/.test(src) ||
    !/' \\u00b7 worst ' \+ LUCK999\.bandOf\(luckRange\.lo\) \+ ' ' \+ LUCK999\.zSig\(luckRange\.lo\)/.test(src))
  throw new Error('the pill must name the best and worst bands beside the current one');
if (!/evSession\.rounds && luckRange\.hi != null && luckRange\.lo != null/.test(src))
  throw new Error('the extremes wait for a priced round');
console.log('the far ends: the best and worst z ever read \u2014 kept across sessions, named beside the current band');
if (!/\.evstrip \.newbook \{ cursor: pointer;/.test(src))
  throw new Error('the practice new-book tap must read as a control');
console.log('practice new book: \u21ba one tap zeroes rounds, engine, felt and spread \u2014 the band falls back to gold');

/* --- the table's own tap: same reset, from its own books --- */
const tResetFull = tgrab('  function resetT() {', '\n  }');
const tResetBody = tResetFull.slice(tResetFull.indexOf('{') + 1, tResetFull.lastIndexOf('}'));
const tStats = { decisions: 9, book: 7, loss: 4, lossBase: 0, ev: -3, felt: 20, rounds: 5, sd2: 100 };
let tSaved = false, tDraw = false;
new Function('trainStats', 'saveT', 'renderTrain', 'return function resetT() {' + tResetBody + '}')(
  tStats, () => { tSaved = true; }, () => { tDraw = true; })();
if (tStats.ev !== 0 || tStats.felt !== 0 || tStats.rounds !== 0 || tStats.sd2 !== 0)
  throw new Error('the table new book must zero the reconciliation');
if (tStats.decisions !== 9 || tStats.book !== 7)
  throw new Error('the table new book must leave the coach decisions alone');
if (!tSaved || !tDraw) throw new Error('the table new book must save and redraw');
if (!/id="evNewBookT">\\u21ba new book<\/span>/.test(tsrc))
  throw new Error('the table strip must carry its own new-book tap');
if (!/e\.target\.id === 'evNewBookT'\) resetT\(\);/.test(tsrc))
  throw new Error('the table strip must route its tap to resetT');
if (!/\.training \.evstrip \.newbook \{ cursor: pointer;/.test(tsrc))
  throw new Error('the table new-book tap must read as a control');
console.log('table new book: \u21ba the same one-tap reset \u2014 its own books, its own strip');

/* --- the fresh book: a tap wipes the WHOLE persisted book, so a
       player can start a session over — the strip's own new book
       keeps the coach's decisions, this clears them too     --- */
const freshFull = tgrab('  function clearBookT() {', '\n  }');
const freshBody = freshFull.slice(freshFull.indexOf('{') + 1, freshFull.lastIndexOf('}'));
const freshStats = { decisions: 9, book: 7, loss: 4, lossBase: 1, ev: -3, felt: 20, rounds: 5, sd2: 100 };
let fSaved = false, fDrawn = false, fCleared = false;
const freshRun = new Function('trainStats', 'clearT', 'saveT', 'renderTrain',
  'var tOut = "x", tSession = { a: 1 }, trainMsg = "stale";\n' +
  'function clearBookT() {' + freshBody + '}\n' +
  'clearBookT();\n' +
  'return { tOut: tOut, tSession: tSession, trainMsg: trainMsg };'
)(freshStats, () => { fCleared = true; }, () => { fSaved = true; }, () => { fDrawn = true; });
if (freshStats.decisions || freshStats.book || freshStats.loss || freshStats.lossBase ||
    freshStats.ev || freshStats.felt || freshStats.rounds || freshStats.sd2)
  throw new Error('the fresh book must zero the whole persisted ledger');
if (freshRun.tOut !== null) throw new Error('the fresh book must drop the crossing mark');
if (freshRun.trainMsg !== '') throw new Error('the fresh book must clear the last label');
if (Object.keys(freshRun.tSession).length) throw new Error('the fresh book must clear the sitting chart');
if (!fCleared || !fSaved || !fDrawn) throw new Error('the fresh book must clear, save and redraw');
if (!/id="clearBookT"/.test(tsrc)) throw new Error('the overlay must carry its fresh-book control');
if (!/e\.target\.id === 'clearBookT'\) clearBookT\(\);/.test(tsrc))
  throw new Error('the overlay must route its tap to clearBookT');
if (!/\.training \.bookreset-tap \{ cursor: pointer;/.test(tsrc))
  throw new Error('the fresh-book control must read as a control');
console.log('table fresh book: \u232b one tap wipes the whole persisted ledger \u2014 decisions, cost and reconciliation');

console.log('\nev strip verified');
