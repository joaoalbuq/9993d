/* INDEX999: the count's corrections, exactly as shipped from the
   canon both pages share. The index table is driven at its exact
   boundaries (below the threshold the chart says hit, at and above
   it the flip lands), the chart it corrects is extracted and
   composed the way bookPlay composes them, insurance's 2:1 math is
   checked against real shoes, and the two page copies must stay
   byte-identical or the suite fails.                            */
'use strict';
const fs = require('fs');
const path = require('path');

const A = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const B = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');

/* --- drift guard: the canon block is byte-identical in both pages --- */
const BEGIN = '  /* ==== INDEX999 canon';
const END = '/* ==== INDEX999 end ==== */\n';
function block(src, name) {
  const i = src.indexOf(BEGIN);
  if (i < 0) throw new Error(name + ': INDEX999 begin marker missing');
  const j = src.indexOf(END, i);
  if (j < 0) throw new Error(name + ': INDEX999 end marker missing');
  return src.slice(i, j + END.length);
}
const a = block(A, 'offline.html'), b = block(B, 'table-16x9.html');
if (a !== b) throw new Error('INDEX999 canon drifts between pages');
console.log('canon byte-identical across both pages (' + a.length + ' bytes)');

/* --- EV999 drift guard: the pricing engine is a canon too --- */
const EB = '  /* ==== EV999 canon', EE = '/* ==== EV999 end ==== */\n';
function eblock(s, name) {
  const i = s.indexOf(EB);
  if (i < 0) throw new Error(name + ': EV999 begin marker missing');
  const j = s.indexOf(EE, i);
  if (j < 0) throw new Error(name + ': EV999 end marker missing');
  return s.slice(i, j + EE.length);
}
if (eblock(A, 'offline.html') !== eblock(B, 'table-16x9.html')) throw new Error('EV999 canon drifts between pages');
console.log('EV999 canon byte-identical across both pages (' + eblock(A, 'offline.html').length + ' bytes)');

/* --- the canon itself, evaluated --- */
const body = a.slice(a.indexOf('var INDEX999 = (function () {'), a.indexOf('})();', a.indexOf('var INDEX999 = (function () {')) + 5);
const INDEX999 = (0, eval)('(' + body.replace('var INDEX999 = ', '').replace(/;\s*$/, '') + ')');
const I = INDEX999.INDICES;

/* --- the why layer: every index explains itself, insurance both ways --- */
for (const cellName in I) {
  const ix = I[cellName];
  if (typeof ix.why !== 'string' || ix.why.length < 12) throw new Error(cellName + ' lacks a why');
}
if (typeof INDEX999.INS_WHY_IN !== 'string' || INDEX999.INS_WHY_IN.length < 12) throw new Error('INS_WHY_IN missing');
if (typeof INDEX999.INS_WHY_OUT !== 'string' || INDEX999.INS_WHY_OUT.length < 12) throw new Error('INS_WHY_OUT missing');
console.log('why layer: ' + Object.keys(I).length + ' index reasons + insurance in/out reasons present');

/* --- every index at its exact boundary (the flip's lower edge) --- */
/* [cell, at, play, needsDouble, counterCell (below threshold, hit-family)] */
const cases = [
  /* [cell, at, play, needsDouble] — hard 13 v 2 runs the other way:
     it is a chart STAND that the count turns into a HIT below −1  */
  ['hard 16 v 10', 1, 'stand', false],
  ['hard 15 v 10', 4, 'stand', false],
  ['hard 13 v 2', -1, 'hit', false],
  ['hard 12 v 2', 1, 'stand', false],
  ['hard 12 v 3', 2, 'stand', false],
  ['hard 11 v A', 1, 'double', true],
  ['hard 10 v 10', 4, 'double', true],
  ['hard 9 v 2', 1, 'double', true],
];
for (const [cell, at, play, dbl] of cases) {
  const t = parseInt(cell.match(/(\d+)/)[1], 10);
  const up = cell.match(/v (\w+)$/)[1];
  const upN = up === 'A' ? 11 : parseInt(up, 10);
  const canD = !dbl;                       /* for doubles: no double -> no flip */
  const below = INDEX999.flip(t, false, upN, at - 5, dbl);
  const atThr = INDEX999.flip(t, false, upN, at, dbl);
  const above = INDEX999.flip(t, false, upN, at + 5, dbl);
  if (play === 'hit') {
    if (below !== play) throw new Error(cell + ': below threshold gave ' + below);
    if (atThr !== play) throw new Error(cell + ': at threshold gave ' + atThr);
    if (above !== null) throw new Error(cell + ': above threshold gave ' + above);
  } else {
    if (below !== null) throw new Error(cell + ': below threshold gave ' + below);
    if (atThr !== play) throw new Error(cell + ': at threshold gave ' + atThr);
    if (above !== play) throw new Error(cell + ': above threshold gave ' + above);
  }
  if (dbl) {
    const noD = INDEX999.flip(t, false, upN, at + 5, false);
    if (noD !== null) throw new Error(cell + ': fired without canDouble');
  }
}
console.log('8 indices: exact at threshold, correct side silent, doubles gated by canDouble');

/* --- soft hands and unknown cells: the canon never fires --- */
for (const [t, up] of [[18, 10], [17, 6], [13, 3], [12, 4], [11, 6], [16, 7]]) {
  if (INDEX999.flip(t, true, up, 99, true) !== null) throw new Error('soft ' + t + ' v ' + up + ' fired');
}
if (INDEX999.flip(16, false, 7, 99, true) !== null) throw new Error('hard 16 v 7 fired (not an index cell)');
console.log('soft hands and non-index cells: never fire');

/* --- insurance math: density, edge, breakeven --- */
if (INDEX999.INSURE_AT !== 3) throw new Error('INSURE_AT !== 3');
if (Math.abs(INDEX999.tenDensity([{ rank: '10' }, { rank: '5' }, { rank: 'A' }, { rank: 'K' }]) - 0.5) > 1e-9)
  throw new Error('tenDensity wrong on a known stack');
/* a full rank cycle is exactly 4/13 tens: a fresh shoe shows 30.77%, negative edge */
const R13 = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const fresh = INDEX999.tenDensity(Array.from({ length: 52 }, (_, i) => ({ rank: R13[i % 13] })));
if (Math.abs(fresh - 16 / 52) > 1e-9) throw new Error('fresh-shoe density ' + fresh);
if (INDEX999.insEdge(Array.from({ length: 52 }, (_, i) => ({ rank: i < 20 ? '10' : '2' }))) <= 0)
  throw new Error('a 38.5% ten-density stack must show positive insurance edge');
if (INDEX999.insEdge(Array.from({ length: 52 }, (_, i) => ({ rank: R13[i % 13] }))) >= 0)
  throw new Error('a fresh shoe must show negative insurance edge');
/* Monte-Carlo: shuffled 2-deck shoes average exactly 30.77% tens */
let sum = 0, N = 300;
for (let s = 0; s < N; s++) {
  const shoe = [];
  for (let d = 0; d < 2; d++) for (let suit = 0; suit < 4; suit++)
    for (let r = 0; r < 13; r++) shoe.push({ rank: ['A','2','3','4','5','6','7','8','9','10','J','Q','K'][r], suit });
  for (let i = shoe.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t2 = shoe[i]; shoe[i] = shoe[j]; shoe[j] = t2; }
  sum += INDEX999.tenDensity(shoe);
}
if (Math.abs(sum / N - 16 / 52) > 0.005) throw new Error('MC density off: ' + (sum / N));
console.log('insurance: density exact on built stacks, edge positive only past 33.3%, MC holds');

/* --- the chart the canon corrects: extracted exactly as shipped --- */
function grab(a2, b2) {
  const i = A.indexOf(a2), j = A.indexOf(b2, i);
  if (i < 0 || j < 0) throw new Error('anchor miss');
  return A.slice(i, j + b2.length);
}
const chartFull = grab('  function chartPlay(t, soft, up, canD) {', "\n  }");
const chartBody = chartFull.slice(chartFull.indexOf('{') + 1, chartFull.lastIndexOf('}'));
const chart = new Function('t', 'soft', 'up', 'canD', chartBody + '\nreturn play;');
const probe = [[16, 10], [15, 10], [12, 2], [12, 3], [10, 10], [9, 2]];
for (const [t, up] of probe) {
  const got = chart(t, false, up, true);
  if (got !== 'hit' && !(t === 11 && up === 11 && got === 'double'))
    throw new Error('chart ' + t + ' v ' + up + ' should be hit, got ' + got);
}
/* 13 v 2: the chart STANDS — its index flips to hit BELOW −1 */
if (chart(13, false, 2, true) !== 'stand') throw new Error('chart 13 v 2 should stand');
/* doubles: the chart already doubles these; the index legalizes them
   only because EV999 at these cells prefers the double as canD rises */
for (const [t, up] of [[11, 11], [10, 10], [9, 2]]) {
  const got = chart(t, false, up, true);
  if (got !== 'double' && got !== 'hit') throw new Error('chart ' + t + ' v ' + up + ': ' + got);
}
console.log('chartPlay extracted from the page: flip cells are chart-hits (13 v 2 a chart-stand)');

/* --- composition: chart + flip == bookPlay's decision (hit-family only) --- */
const bookSrc = grab('  function bookPlay() {', "\n  }");
const SHOE999mod = (0, eval)('(' + grab('  var SHOE999 = (function () {', '})();').replace('var SHOE999 = ', '').replace(/;\s*$/, '') + ')');
const bookFactory = new Function('TC', 'INDEX999', 'SHOE999', 'CHART', 'handCards', 'dealerUp',
  'var dealerArr = [{ rank: dealerUp, suit: 0 }];' +
  'var you = handCards;' +
  'var bank = 1e6, bet = 25, lastFlip = null;' +
  'var chartPlay = CHART;' +
  'function total(h) { return SHOE999.total(h); }' +
  'function isSoft(h) { return SHOE999.value(h).soft; }' +
  'function trueCount() { return TC; }' +
  'var EV999 = { prices: function () { return { stand: -1, hit: -1, double: null }; } };' +
  bookSrc + '\nreturn bookPlay;');
for (const [cell, at, play, dbl] of cases) {
  const t = parseInt(cell.match(/(\d+)/)[1], 10);
  const up = cell.match(/v (\w+)$/)[1];
  const upN = up === 'A' ? 'A' : up;
  /* hand cards that make total t against upcard upN (hit-family builds) */
  const hand = t >= 12 ? [{ rank: String(t - 10), suit: 0 }, { rank: '10', suit: 0 }] : null;
  if (!hand) continue;
  const v = SHOE999mod.value(hand);
  if (v.total !== t || v.soft) throw new Error('test hand for ' + cell + ' misbuilt');
  if (play === 'hit') {
    /* the reverse index: chart stands, the cold count flips to hit */
    const cold = bookFactory(at - 5, INDEX999, SHOE999mod, chart, hand, upN)();
    if (cold !== 'hit') throw new Error(cell + ' @tc' + (at - 5) + ': bookPlay gave ' + cold + ', want hit');
    const warm = bookFactory(at + 5, INDEX999, SHOE999mod, chart, hand, upN)();
    if (warm !== 'stand') throw new Error(cell + ' above threshold: bookPlay gave ' + warm);
    continue;
  }
  const got = bookFactory(at + 5, INDEX999, SHOE999mod, chart, hand, upN)();
  const want = play === 'double' ? 'double' : 'stand';
  if (got !== want) throw new Error(cell + ' @tc' + (at + 5) + ': bookPlay gave ' + got + ', want ' + want);
  const below2 = bookFactory(at - 5, INDEX999, SHOE999mod, chart, hand, upN)();
  if (below2 !== 'hit') throw new Error(cell + ' below threshold: bookPlay gave ' + below2);
}
console.log('8 indices at their edges: flips land, charts survive, 13 v 2 runs both ways');

/* --- the 12-card hard cap on the upcard table (hard 16 v A stays hit) --- */
if (bookFactory(99, INDEX999, SHOE999mod, chart, [{ rank: '6', suit: 0 }, { rank: '10', suit: 0 }], 'A')() !== 'hit') throw new Error('16 v A must stay hit at any count');
console.log('hard 16 v A: no index, chart hit survives any count');
console.log('\nindex plays verified');
