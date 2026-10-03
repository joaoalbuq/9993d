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
if (!/    evRound = !reviewMode && !drillFree; evPriced = false; evRoundExp = 0; evInsExp = 0;/.test(src))
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
if (!/var luck = evSession\.rounds \? ' \\u00b7 ' \+ LUCK999\.word\(evSession\) \+ ' luck'/.test(src))
  throw new Error('the pill shows the gap only once a round has been priced');
/* the score line is built in three parts — score, gap, tail — and the
   gap must be a real node of its own, not text: that is what makes it
   a control. Run the shipped setScore over a stub element.       */
{
  const clause = (t) => ({ clause: t });
  const fakeDoc = { createTextNode: (t) => ({ text: t }) };
  const setScore = new Function('luckClause', 'document',
    grab('  function setScore(', '\n  }').replace(/^  function setScore/, 'return function setScore'))(clause, fakeDoc);
  const el = { textContent: '', kids: [], appendChild(n) { this.kids.push(n); } };
  setScore(el, 'Coach 25% · 3/12', ' · −21.9 luck · cold · −2.4σ', ' · best freak hot +5.5σ (round 9)');
  if (el.textContent !== 'Coach 25% · 3/12') throw new Error('the score must lead the line');
  if (el.kids.length !== 2 || el.kids[0].clause.indexOf('luck') === -1)
    throw new Error('the gap must ride as its own node, not as text');
  if (el.kids[1].text.indexOf('best freak hot') === -1)
    throw new Error('the rest of the line must follow the gap: ' + JSON.stringify(el.kids));
  const bare = { textContent: '', kids: [], appendChild(n) { this.kids.push(n); } };
  setScore(bare, 'Coach off', '', ' · 🩹 hard 13 v 2');
  if (bare.kids.length !== 1 || bare.kids[0].text === undefined)
    throw new Error('with nothing priced there must be no clause at all');
}
const commit2 = grab('    if (evRound && evPriced) {', 'renderCoach();');
if (!/renderEvStrip\(\);/.test(commit2))
  throw new Error('the settle commit must refresh both the strip and the pill');
if (!/LUCK999\.word\(evSession\)/.test(src) || !/LUCK999\.stripLine\(/.test(src))
  throw new Error('the strip and the pill must read the one shared word');
console.log('the pill: "\u221248.0 luck" rides the coach score \u2014 one source for the gap, refreshed at the commit');

/* --- the gap as a WAY IN: on both score lines the clause is its own
       control, and opening it brings up the reconciliation strip --- */
if (!/function luckClause\(text\)/.test(src) || !/s\.className = 'luckclause';/.test(src))
  throw new Error('the clause must be its own control, not text');
if (!/s\.setAttribute\('role', 'button'\);/.test(src) || !/s\.tabIndex = 0;/.test(src))
  throw new Error('the clause must be reachable and announced as a button');
if (!/e\.stopPropagation\(\); e\.preventDefault\(\); openLuck\(\);/.test(src))
  throw new Error('the clause must stop the pill\u2019s own toggle firing behind it');
if (!/if \(e\.key !== 'Enter' && e\.key !== ' '\) return;/.test(src))
  throw new Error('the clause must answer the keyboard as well as the finger');
if (!/function openLuck\(\) \{/.test(src) || !/el\.hidden = false;/.test(src))
  throw new Error('opening the clause must reveal the strip even when it is hidden');
if (!/renderEvStrip\(\);                       \/\* the line must be there before it is opened \*\//.test(src))
  throw new Error('the strip must be drawn before it is opened, not after');
if (!/el\.classList\.add\('flash'\);/.test(src) || !/@keyframes luckopen/.test(src) || !/\.evstrip\.flash \{ animation: luckopen 1\.4s ease-out; \}/.test(src))
  throw new Error('the opened strip must bloom, so the eye lands on it');
if (!/The reconciliation opens with the first priced decision/.test(src))
  throw new Error('an empty reconciliation must say so rather than stay blank');
if (!/function setStatus\(s, luck\) \{ setScore\(statusTxt, s, luck \|\| '', ''\); \}/.test(src))
  throw new Error('the settle line must take its clause apart, or the note is flattened into the sentence');
if (!/setStatus\(kind \+ \(insWin \? ' \\u2014 insurance pays ' \+ fmt\(insWin\) : ''\) \+ spNote \+ bookNote, luckNote\);/.test(src))
  throw new Error('the settle line must hand its clause over as the clause');
if (!/\.luckclause \{ cursor: pointer; color: #d8b56a;/.test(src))
  throw new Error('the clause must read as a control');
console.log('the gap as a way in: the pill\u2019s clause and the settle note both open the reconciliation, by tap or Enter');

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
if (!/evSession = LUCK999\.evRestore\(JSON\.parse\(localStorage\.getItem\('999\.practice\.evsession'\)/.test(src))
  throw new Error('the shoe must restore its book through the shared lenient read');
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
    !/var luck = evSession\.rounds \? ' \\u00b7 ' \+ LUCK999\.word\(evSession\) \+ ' luck'/.test(src) ||
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
if (!/var evHalf = LUCK999\.evRestore\(tsRaw\);/.test(tsrc) ||
    !/trainStats\.ev = evHalf\.ev; trainStats\.felt = evHalf\.felt;/.test(tsrc) ||
    !/trainStats\.rounds = evHalf\.rounds; trainStats\.sd2 = evHalf\.sd2;/.test(tsrc))
  throw new Error('an old stored score must migrate field by field, not NaN');
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

/* --- the practice floor's OWN settle line narrates the same luck gap,
       so both surfaces tell the reconciliation in the same sentence --- */
if (!/var luckNote = '';/.test(src))
  throw new Error('the floor\u2019s settle line must carry a luck note');
if (!/setStatus\(kind \+ \(insWin \? '[\\\s\S]*?luckNote\)/.test(src))
  throw new Error('the settle line must end on the luck note, the table\u2019s own tail');
/* built ONLY inside the priced commit: an unpriced round (a review
   replay, a free drill) narrates nothing it cannot stand behind  */
const priced = src.slice(src.indexOf('if (evRound && evPriced) {'),
  src.indexOf("luckNote = ' \\u00b7 ' + LUCK999.word"));
if (priced.length > 900)
  throw new Error('the luck note must be built inside the priced commit, not beside it');
if (!/LUCK999\.word\(\{ felt: myNet \+ insWin \- insStake, ev: evRoundExp \+ evInsExp \}\)/.test(src))
  throw new Error('the floor\u2019s gap is its OWN round\u2019s legs \u2014 insurance riding both');
/* and the sentence is the SAME one the table settles with */
const FLOOR_PHRASE = "' luck, both felts reconcile'";
if (src.indexOf(FLOOR_PHRASE) < 0 || tsrc.indexOf(FLOOR_PHRASE) < 0)
  throw new Error('both surfaces must settle on the same words: ' + FLOOR_PHRASE);
if (!/both felts reconcile/.test(src)) throw new Error('the floor must name the reconciliation');
console.log('the floor settle line: the round\u2019s own luck gap in the table\u2019s own words \u2014 one sentence, two surfaces');

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
function drawStrip(session, prev, table, marks) {
  const el = { hidden: false, innerHTML: 'stale' };
  if (!marks) marks = { table: null, shoe: null };
  new Function('document', 'LUCK999', 'evSession', 'evOut', 'splitFelt', 'tableBook', 'feltTag',
    'duelOut',
    'return function renderEvStrip() {' + renderBody + '}')(
    /* the table book is read the way tableBook() reads it: leniently,
       through evRestore, so a book from before the spread arrives
       complete (sd2 0) and the duel never sees an unfinished field. */
    { getElementById: () => el }, LUCK, session, prev, splitFelt,
    function () { if (!table) return null; const b = LUCK.evRestore(table); return b.rounds > 0 ? b : null; },
    feltTag,
    marks)();
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
/* --- the duel: each side crosses on its OWN spread, and says so --- */
/* the table's own book; the shoe is what is left of the combined */
const TABLE_BOOK = { rounds: 4, ev: -40, felt: 180, sd2: 4000 };
const COMBINED = { rounds: 8, ev: -60, felt: 240, sd2: 8000 };
/* both sides already past a spread: their first draw banks the
   mark quietly and must NOT bloom, same rule as the strip's   */
const quiet = drawStrip(COMBINED, true, TABLE_BOOK);
if (!/the table/.test(quiet.innerHTML) || !/the shoe/.test(quiet.innerHTML))
  throw new Error('the duel must name both felts: ' + quiet.innerHTML);
if (/(the table|the shoe) <b class="luck [^"]*crossed/.test(quiet.innerHTML))
  throw new Error('a restored book already past a spread must not bloom: ' + quiet.innerHTML);
/* a NEW crossing on the felt blooms THAT side, and only that one.
   drawStrip's third argument is the TABLE'S OWN BOOK — the shoe is
   what splitFelt has left of the combined book.               */
const hotFelt = drawStrip({ rounds: 9, ev: -60, felt: 240, sd2: 8000 }, true,
  { rounds: 5, ev: -40, felt: 400, sd2: 4000 },
  /* the table's felt was inside its spread last draw; the shoe's already was not */
  { table: false, shoe: true });
function sideClass(html, label) {
  const m = html.match(new RegExp(label + ' <b class="([^"]*)"'));
  return m ? m[1] : '';
}
const tableCls = sideClass(hotFelt.innerHTML, 'the table');
const shoeCls = sideClass(hotFelt.innerHTML, 'the shoe');
if (!/crossed/.test(tableCls))
  throw new Error('the felt that first tops its OWN spread must bloom: ' + hotFelt.innerHTML);
if (/crossed/.test(shoeCls))
  throw new Error('the other side of the duel must not bloom with it: ' + hotFelt.innerHTML);
/* and the side that stays inside its own spread never blooms, even
   on the very draw the OTHER side crosses                     */
const calmFelt = drawStrip(COMBINED, true,
  { rounds: 4, ev: 0, felt: 0, sd2: 4000 },        /* the table: dead even  */
  { table: false, shoe: false });
if (/crossed/.test(sideClass(calmFelt.innerHTML, 'the table')))
  throw new Error('a side inside its own spread never blooms: ' + calmFelt.innerHTML);
/* the marks are banked apart, so the strip's own crossing and a
   felt's never stand in for one another                    */
if (!/LUCK999\.cross\(duelOut\.table, duel\.table\)/.test(src) ||
    !/LUCK999\.cross\(duelOut\.shoe, duel\.shoe\)/.test(src))
  throw new Error('each side must read its OWN mark, not the strip\u2019s');
if (!/var duelOut = \{ table: null, shoe: null \};/.test(src))
  throw new Error('the duel banks a mark per side');
if (!/duelOut = \{ table: null, shoe: null \};/.test(src.split('function resetEv')[1] || ''))
  throw new Error('a fresh book must return both duel marks to null');
console.log('the duel: each felt blooms on the draw it first tops its OWN spread, once, independently');

/* --- each side names HOW MANY spreads it has run, not just the sign:
       a book from before the spread says so rather than standing
       there as a bare number the player could misread         --- */
if (!/sg \|\| 'no spread yet'/.test(src))
  throw new Error('a felt with no width banked must say so, not go silent');
if (!/class="sd' \+ \(sg \? '' : ' na'\)/.test(src))
  throw new Error('the absence must read quieter than a measurement');
if (!/\.evstrip \.sd\.na \{ opacity: 0\.6;/.test(src))
  throw new Error('the no-spread marker must wear its own quiet weight');
/* a book WITH a spread keeps its real sigma, never the marker */
const withSpread = drawStrip(COMBINED, true, { rounds: 4, ev: -40, felt: 400, sd2: 4000 });
if (!/the table [^<]*<b[^>]*>\+440\.0<\/b> freak hot <span class="sd">\+7\.0σ<\/span>/.test(withSpread.innerHTML))
  throw new Error('a spread-backed felt names its own sigma: ' + withSpread.innerHTML);
if (/no spread yet/.test(withSpread.innerHTML))
  throw new Error('the marker must never replace a real sigma: ' + withSpread.innerHTML);
/* a migrated book (rounds, no sd2) names the absence on ITS side only */
const migDuel = drawStrip({ rounds: 9, ev: -60, felt: 460, sd2: 9000 }, true,
  { rounds: 4, ev: -40, felt: 400 });
const migTable = migDuel.innerHTML.match(/the table ([^·]*)/) || ['',''];
if (!/no spread yet/.test(migTable[1]))
  throw new Error('a felt with no banked width must say so: ' + migDuel.innerHTML);
if (/the shoe [^·]*no spread yet/.test(migDuel.innerHTML))
  throw new Error('the other side keeps its own sigma: ' + migDuel.innerHTML);
console.log('the duel names its spreads: sigma per felt, and a pre-spread book says so instead of standing mute');

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
if (!/splitFelt\(evSession, tableBook\(\)\)/.test(src) || !/feltTag\('the shoe', duel\.shoe, cs\.fire\)/.test(src))
  throw new Error('the strip must draw the duel through splitFelt and feltTag, each side carrying its own crossing');
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
const r0 = noteRun({ rounds: 7, ev: 0, felt: 115, sd2: 13225 }, { hi: null, lo: null, hiAt: null, loAt: null });
if (Math.abs(r0.hi - 1) > 1e-9 || Math.abs(r0.lo - 1) > 1e-9)
  throw new Error('a first read sets both ends: ' + JSON.stringify(r0));
if (r0.hiAt !== 7 || r0.loAt !== 7)
  throw new Error('each remembered extreme is stamped with the round it happened on: ' + JSON.stringify(r0));
const r1 = noteRun({ rounds: 12, ev: 0, felt: -230, sd2: 13225 }, { hi: 2.5, hiAt: 9, lo: 0.2, loAt: 4 });
if (r1.hi !== 2.5 || Math.abs(r1.lo + 2) > 1e-9)
  throw new Error('a colder read moves only the floor: ' + JSON.stringify(r1));
if (r1.hiAt !== 9 || r1.loAt !== 12)
  throw new Error('an untouched end keeps its own round; a moved one takes the new round: ' + JSON.stringify(r1));
const r2 = noteRun({ rounds: 21, ev: 0, felt: 345, sd2: 13225 }, { hi: 2.5, hiAt: 9, lo: -1, loAt: 3 });
if (Math.abs(r2.hi - 3) > 1e-9 || r2.lo !== -1)
  throw new Error('a hotter read moves only the ceiling: ' + JSON.stringify(r2));
if (r2.hiAt !== 21 || r2.loAt !== 3)
  throw new Error('the ceiling re-stamps, the floor keeps its own round: ' + JSON.stringify(r2));
if (noteRun({ rounds: 0, ev: 0, felt: 0, sd2: 0 }, { hi: null, lo: null }).hi !== null)
  throw new Error('a book with no spread sets no extreme');
if (!/evSession\.sd2 \+= Math\.pow\(HAND_SD[\s\S]{0,400}noteLuck\(\);[\s\S]{0,300}renderCoach\(\);/.test(src))
  throw new Error('the extremes must ride the settle commit ahead of the pill');
if (!/' \\u00b7 best ' \+ LUCK999\.bandOf\(luckRange\.hi\) \+ ' ' \+ LUCK999\.zSig\(luckRange\.hi\)/.test(src) ||
    !/' \\u00b7 worst ' \+ LUCK999\.bandOf\(luckRange\.lo\) \+ ' ' \+ LUCK999\.zSig\(luckRange\.lo\)/.test(src))
  throw new Error('the pill must name the best and worst bands beside the current one');
if (!/evSession\.rounds && luckRange\.hi != null && luckRange\.lo != null/.test(src))
  throw new Error('the extremes wait for a priced round');
/* the pill says WHEN, not just how big */
const roundTxt = makeFn(grab('  function luckRoundTxt(', '\n  }'));
if (roundTxt(42) !== ' (round 42)') throw new Error('a stamped extreme names its round: ' + JSON.stringify(roundTxt(42)));
if (roundTxt(0) !== ' (round 0)') throw new Error('round zero is a real round: ' + JSON.stringify(roundTxt(0)));
if (roundTxt(null) !== '' || roundTxt(undefined) !== '')
  throw new Error('an unstamped extreme keeps its silence \u2014 a legacy save names no round');
if (roundTxt(NaN) !== '' || roundTxt(Infinity) !== '')
  throw new Error('a stamp that is not a number is no stamp');
if (!/luckRoundTxt\(luckRange\.hiAt\)/.test(src) || !/luckRoundTxt\(luckRange\.loAt\)/.test(src))
  throw new Error('the pill must read each end\u2019s own stamp');
if (!/luckRange\.hiAt = evSession\.rounds/.test(src) || !/luckRange\.loAt = evSession\.rounds/.test(src))
  throw new Error('the stamp must be the book\u2019s own round count');
console.log('the far ends: the best and worst z ever read \u2014 kept across sessions, named beside the current band, stamped with the round');
if (!/\.evstrip \.newbook \{ cursor: pointer;/.test(src))
  throw new Error('the practice new-book tap must read as a control');
console.log('practice new book: \u21ba one tap zeroes rounds, engine, felt and spread \u2014 the band falls back to gold');

/* --- the fresh shoe: the whole training session over, beside the
       new book but never inside it \u2014 the strip hides itself when
       nothing has crossed, and a reset a player cannot reach on a
       fresh page is no reset at all                          --- */
if (!/<p class="evstrip" id="shoeReset"><\/p>/.test(src))
  throw new Error('the fresh shoe must have a home of its own');
if (!/<p class="evstrip" id="evStrip" hidden><\/p>/.test(src))
  throw new Error('the strip must still hide itself when nothing has crossed');
if (!/shoeReset'\);[\s\S]*?id === 'evFreshShoe'\) freshShoe\(\);/.test(src))
  throw new Error('the chip must route its tap to the fresh shoe');
const shoeChip = grab('  function renderShoeReset() {', '\n  }');
if (!/shoeArmed \? '\\u21ba tap again to wipe it all' : '\\u21ba fresh shoe'/.test(shoeChip))
  throw new Error('the chip must say what it takes and what the next tap does: ' + shoeChip);
if (!/id="evFreshShoe"/.test(shoeChip) || !/class="newbook"/.test(shoeChip))
  throw new Error('the fresh shoe must read as the same control the new book is');
const shoeTap = grab('  function freshShoe() {', '\n  }');
if (!/if \(armShoe\(\)\) return;/.test(shoeTap))
  throw new Error('the first tap must only arm \u2014 nothing may be wiped on one click');
if (!/shuffleCeremony\(function \(\) \{ resetTraining\(\); \}\)/.test(shoeTap))
  throw new Error('the second tap must reshuffle and wipe');
const armShoe = grab('  function armShoe() {', '\n  }');
if (!/if \(shoeArmed && Date\.now\(\) - shoeArmed < 6000\) return false;/.test(armShoe) ||
    !/later\(6000, function \(\) \{ if \(shoeArmed\) \{ shoeArmed = 0; renderShoeReset\(\); \} \}\)/.test(armShoe))
  throw new Error('the arming must expire on its own, so a stale tap cannot fire a wipe');

/* the wipe itself, run on the shipped body: every ledger the session
   built must be gone, and nothing else                             */
const shoeBody = grab('  function resetTraining() {', '\n  }');
const shoeFields = ['bank', 'bet', 'doubled', 'leaks', 'sessionLeaks', 'leakCell', 'leakUnseen',
  'weekBase', 'gradClock', 'drillReport', 'drillChart', 'drillFree', 'drillReopen',
  'replay', 'reviewIdx', 'fork', 'forkStats', 'coachStats', 'countStats', 'ixStats', 'ixLog',
  'lastFlip', 'quizStats', 'indexQuiz', 'leakMode', 'indexMode', 'reviewMode',
  'token', 'you', 'dealerArr', 'hands', 'splitActive', 'drillOpen', 'phase'];
const shoeHooks = ['buildShoe', 'saveBank', 'saveLeaks', 'saveGrad', 'saveWeek', 'saveReplay', 'saveForks',
  'saveCoach', 'saveCount', 'saveIx', 'saveIxLog', 'saveQuizStats', 'resetEv', 'refillQueue',
  'closeDrill', 'renderShoe', 'renderCount', 'renderLeaks', 'renderCoach', 'syncUI', 'setStatus'];
for (const n of shoeHooks) if (shoeBody.indexOf(n) === -1)
  throw new Error('the fresh shoe must call ' + n);
if (!/^ {4}buildShoe\(\);/m.test(shoeBody))
  throw new Error('the fresh shoe must reshuffle and zero the count, standing alone');
let built = 0, evReset = 0, refilled = 0, synced = 0, drewShoe = 0, counted = 0, closed = 0,
  drewLeaks = 0, drewCoach = 0, said = '';
const saved = [];
const live = {
  bank: 425, bet: 100, doubled: true,
  leaks: { 'hard 16 v 10': { n: 2, cost: 40, ts: 1 } }, sessionLeaks: { 'hard 12 v 3': { n: 1, cost: 25, ts: 1 } },
  leakCell: 'hard 16 v 10', leakUnseen: 3, weekBase: { 1700000000000: { 'hard 16 v 10': 40 } },
  gradClock: 412, drillReport: { recovered: 20 }, drillChart: { cell: 'hard 16 v 10' },
  drillFree: true, drillReopen: true, replay: [{ card: 'A' }], reviewIdx: 3, fork: { kind: 'hit' },
  forkStats: { forks: 4, book: 3 },
  coachStats: { decisions: 30, book: 20, streak: 2, best: 5, loss: 9, lossBase: 1 },
  countStats: { guesses: 9, right: 6, offBy: 3, tGuesses: 4, tRight: 3, tOffBy: 1, pGuesses: 2, pRight: 1, pOffBy: 1 },
  ixStats: { asked: 8, followed: 3, byCell: { 'hard 15 v 10': { asked: 4, followed: 0 } } },
  ixLog: [{ cell: 'hard 15 v 10', tc: 4, taken: 0 }], lastFlip: { cell: 'hard 15 v 10', tc: 4 },
  quizStats: { asked: 5, clean: 3 }, indexQuiz: { tc: 4 },
  leakMode: true, indexMode: true, reviewMode: true,
  token: 7, you: [{ rank: 'K' }], dealerArr: [{ rank: 'Q' }],
  hands: [{ cards: [{ rank: 'K' }], stake: 100 }], splitActive: 1, drillOpen: true, phase: 'acting'
};
const args = shoeFields.concat(shoeHooks);
const vals = shoeFields.map(n => live[n]).concat([
  () => { built++; }, () => saved.push('bank'), () => saved.push('leaks'), () => saved.push('grad'),
  () => saved.push('week'), () => saved.push('replay'), () => saved.push('forks'), () => saved.push('coach'),
  () => saved.push('count'), () => saved.push('ix'), () => saved.push('ixlog'), () => saved.push('quiz'),
  () => { evReset++; }, () => { refilled++; }, () => { closed++; }, () => { drewShoe++; },
  () => { counted++; }, () => { drewLeaks++; }, () => { drewCoach++; }, () => { synced++; },
  (s) => { said = s; }
]);
const snap = 'return { ' + shoeFields.map(n => n + ': ' + n).join(', ') + ' };';
const runShoe = new Function(...args, 'return function resetTraining() {' + shoeBody.slice(shoeBody.indexOf('{') + 1, shoeBody.lastIndexOf('}')) + snap + ' };')(...vals);
const after = runShoe();
if (built !== 1) throw new Error('the fresh shoe must build exactly one fresh stack: ' + built);
if (evReset !== 1 || refilled !== 1 || synced !== 1 || drewShoe !== 1 || counted !== 1 ||
    closed !== 1 || drewLeaks !== 1 || drewCoach !== 1)
  throw new Error('the wipe must clear, redraw and refill its own queues');
/* the FELT, not just the books: shuffleCeremony leaves the phase at
   'shuffling' for its caller to finish, so a wipe that forgets it
   leaves every control dead on a page that looks reset */
if (after.phase !== 'betting') throw new Error('the felt must reopen for betting: ' + after.phase);
if (after.token <= 7) throw new Error('the old round\u2019s token must be spent, so nothing of it still fires');
if (after.you.length || after.dealerArr.length || after.hands.length || after.splitActive)
  throw new Error('the hand in flight must go with the session');
if (after.drillOpen) throw new Error('the count drill must close with the session');
if (!/^ {4}phase = 'betting';$/m.test(shoeBody) || !/^ {4}token\+\+;/m.test(shoeBody))
  throw new Error('the wipe must reopen the felt and cancel the old round itself');
if (!said || !/session starts over/.test(said)) throw new Error('the wipe must say what it did: ' + said);
if (after.bank !== 1000 || after.bet !== 0 || after.doubled) throw new Error('the tray must refill to the boot bank');
if (Object.keys(after.leaks).length || Object.keys(after.sessionLeaks).length || after.leakCell)
  throw new Error('both leak ledgers must go');
if (Object.keys(after.weekBase).length || after.gradClock !== 0) throw new Error('the week baselines and the drill clock must go');
if (after.leakUnseen !== 0 || after.drillReport || after.drillChart || after.drillFree || after.drillReopen)
  throw new Error('the sitting\u2019s drill state must go');
if (after.replay.length || after.reviewIdx !== 0 || after.fork || after.forkStats.forks || after.forkStats.book)
  throw new Error('the replay and its fork tally must go');
if (after.coachStats.decisions || after.coachStats.book || after.coachStats.loss || after.coachStats.lossBase ||
    after.coachStats.streak || after.coachStats.best)
  throw new Error('the coach\u2019s record must go');
if (after.countStats.guesses || after.countStats.right || after.countStats.offBy ||
    after.countStats.tGuesses || after.countStats.tRight || after.countStats.tOffBy ||
    after.countStats.pGuesses || after.countStats.pRight || after.countStats.pOffBy)
  throw new Error('the count\u2019s own guesses must go');
if (after.ixStats.asked || after.ixStats.followed || Object.keys(after.ixStats.byCell).length ||
    after.ixLog.length || after.lastFlip)
  throw new Error('the index discipline and its recent asks must go');
if (after.quizStats.asked || after.quizStats.clean || after.indexQuiz)
  throw new Error('the quiz score and any open card must go');
if (after.leakMode || after.indexMode || after.reviewMode)
  throw new Error('every panel must close, or the next draw reads a cleared sheet');
if (saved.length !== 11) throw new Error('every wiped ledger must be persisted, not just dropped: ' + saved.length);
/* and the SETTINGS are not the session: nothing above may touch them */
for (const keep of ['quizLean', 'quizBiasId', 'drillFeed', 'LEAK_HALF', 'countingOn', 'coachOn', 'leakView', 'speedMode'])
  if (shoeBody.indexOf(keep) !== -1)
    throw new Error('a setting must survive the fresh shoe: ' + keep);
console.log('practice fresh shoe: \u21ba reshuffles, zeroes the count, and wipes every session ledger \u2014 the settings stay');

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

/* --- the lenient restore: field by field, in the reel's spirit. A
       stored field that cannot be used is repaired ALONE; the rest
       of the book rides on. A book written before the spread is
       migBook, never discarded.                              --- */
const evRestore = LUCK.evRestore, evMigrated = LUCK.evMigrated;
const ZERO = { rounds: 0, ev: 0, felt: 0, sd2: 0 };
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
if (!same(evRestore(null), ZERO) || !same(evRestore(undefined), ZERO) ||
    !same(evRestore('nonsense'), ZERO) || !same(evRestore(7), ZERO) || !same(evRestore({}), ZERO))
  throw new Error('nothing stored is a fresh book, whole — but only because there was nothing to keep');
/* the migration: a book saved before sd2 existed keeps every total
   it had, and only the spread starts at nothing                */
const oldBook = { rounds: 12, ev: -3.1, felt: -25 };
const migBook = evRestore(oldBook);
if (!same(migBook, { rounds: 12, ev: -3.1, felt: -25, sd2: 0 }))
  throw new Error('a book from before the spread must keep its rounds, engine and felt: ' + JSON.stringify(migBook));
if (evMigrated(oldBook) !== true) throw new Error('a missing sd2 must report as a migration');
if (evMigrated(ZERO) !== false) throw new Error('a whole book needs no migration');
/* the repaired field is the ONLY thing that changes: a broken sd2
   costs the band, never the round count, price or felt          */
const halfBroken = evRestore({ rounds: 5, ev: 10, felt: -80, sd2: null });
if (!same(halfBroken, { rounds: 5, ev: 10, felt: -80, sd2: 0 }))
  throw new Error('one stale field must be repaired alone: ' + JSON.stringify(halfBroken));
if (evMigrated({ rounds: 5, ev: 10, felt: -80, sd2: null }) !== true)
  throw new Error('a stale sd2 must report as a migration');
const evBroken = evRestore({ rounds: 5, ev: 'x', felt: -80, sd2: 2000 });
if (!same(evBroken, { rounds: 5, ev: 0, felt: -80, sd2: 2000 }))
  throw new Error('a stale engine leg must be repaired alone: ' + JSON.stringify(evBroken));
/* nonsense and impossible numbers are repaired, not inherited    */
if (evRestore({ rounds: NaN, ev: Infinity, felt: -80, sd2: 2000 }).rounds !== 0 ||
    evRestore({ rounds: 5, ev: 10, felt: -80, sd2: NaN }).sd2 !== 0)
  throw new Error('a number that is not finite is not a number to keep');
if (evRestore({ rounds: -4, ev: 10, felt: -80, sd2: -9 }).rounds !== 0 ||
    evRestore({ rounds: -4, ev: 10, felt: -80, sd2: -9 }).sd2 !== 0)
  throw new Error('a count and a sum of squares are never negative');
if (evRestore({ rounds: -4, ev: 10, felt: -80, sd2: -9 }).ev !== 10)
  throw new Error('repairing a count must not touch the legs beside it');
if (evMigrated({ rounds: -4, ev: 10, felt: -80, sd2: -9 }) !== true)
  throw new Error('an impossible count must report as a migration');
/* the signed legs ride through untouched — the gap is still the
   gap, and a book with no spread simply claims no band          */
if (luckWord(migBook) !== '\u221221.9' || luckBand(migBook) !== '' || luckSigma(migBook) !== '' ||
    luckTone(migBook) !== '')
  throw new Error('a migBook book keeps its gap and claims no band: ' + luckWord(migBook));
if (!/12 rounds$/.test(evStripLine(migBook)))
  throw new Error('a migBook book still draws its strip: ' + evStripLine(migBook));
/* the very next round's spread lands on the migBook book whole  */
const regrown = Object.assign({}, migBook, { rounds: 13, felt: -225, sd2: 13225 });
if (luckBand(regrown) !== 'cool')
  throw new Error('one measured round gives the migBook book a band: ' + luckBand(regrown));
if (Math.abs(LUCK.z(regrown) + 1.93) > 0.01)
  throw new Error('the band reads against the spread actually measured: ' + LUCK.z(regrown));
/* every restore on both surfaces goes through the one read        */
if (!/evSession = LUCK999\.evRestore\(/.test(src)) throw new Error('the shoe must restore through evRestore');
if (!/LUCK999\.evRestore\(JSON\.parse\(localStorage\.getItem\('999\.practice\.evsession'\)/.test(src))
  throw new Error('the shoe must read its own key through evRestore');
if (!/book = LUCK999\.evRestore\(JSON\.parse\(localStorage\.getItem\('999\.practice\.evsession'\)/.test(tsrc))
  throw new Error('the hand-off must merge into the shoe book through evRestore');
if (!/var b = LUCK999\.evRestore\(t\);/.test(src) || !/if \(b\.rounds > 0\) return b;/.test(src))
  throw new Error('the table book must be read leniently too, so a duel from before the spread still reads');
/* the hand-off's merge: an old book gains a round, it does not
   restart — the whole point of the migration                  */
const flushSrc = tgrab('  function flushRecon(ev, felt, sd2) {', '\n  }');
function flushOn(stored) {
  const mem = { '999.practice.evsession': stored };
  const fakeLS = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = v; }
  };
  new Function('localStorage', 'LUCK999', flushSrc + '\nflushRecon(10, 40, 200);')(
    fakeLS, LUCK);
  return JSON.parse(mem['999.practice.evsession']);
}
const merged = flushOn(JSON.stringify(oldBook));
if (!same(merged, { rounds: 13, ev: 6.9, felt: 15, sd2: 200 }))
  throw new Error('the hand-off must add a round to a migBook book, not restart it: ' + JSON.stringify(merged));
const mergedFull = flushOn(JSON.stringify({ rounds: 5, ev: 10, felt: 90, sd2: 5000 }));
if (!same(mergedFull, { rounds: 6, ev: 20, felt: 130, sd2: 5200 }))
  throw new Error('a whole book must merge exactly as before: ' + JSON.stringify(mergedFull));
const mergedBroken = flushOn(JSON.stringify({ rounds: 5, ev: 10, felt: 90, sd2: 'x' }));
if (!same(mergedBroken, { rounds: 6, ev: 20, felt: 130, sd2: 200 }))
  throw new Error('a stale spread must not cost the shoe its running book: ' + JSON.stringify(mergedBroken));
/* nothing on either page may gate a book on all four fields at
   once — that is the whole bug this replaced                 */
if (/typeof \w+\.sd2 === 'number'/.test(src) || /typeof \w+\.sd2 === 'number'/.test(tsrc))
  throw new Error('no page may demand all four fields at once: one stale field must not cost the whole book');
console.log('the restore: field by field, like the reel \u2014 a book from before the spread is migBook, not thrown away');
console.log('the hand-off: an old book gains a round and keeps everything it had \u2014 12 rounds stay 12, and 13 next');

console.log('\nev strip verified');
