/* Split on the practice floor: a pair separates into two hands
   (DAS on, resplit to four, split aces one card), each hand settles
   by the canon against the same dealer hand, and a divergent fork
   prices the book's split leg on that same dealer hand. The chart
   gains the standard pair lines; the floor's own pairing rules are
   the property under test.                                   */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}

/* --- the canon, from the page --- */
const SHOE999 = (0, eval)('(' + grab('  var SHOE999 = (function () {', '})();')
  .replace('var SHOE999 = ', '').replace(/;\s*$/, '') + ')');
const total = (h) => SHOE999.total(h);
const isSoft = (h) => SHOE999.value(h).soft;

/* --- the pair helpers, exactly as shipped --- */
const hrBody = (() => { const f = grab('  function handRank(card) {', '\n  }');
  return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')); })();
const handRank = new Function('card', hrBody);
const prBody = (() => { const f = grab('  function pairRank(cards) {', '\n  }');
  return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')); })();
const pairRank = new Function('handRank', 'return function pairRank(cards) {' + prBody + '}')(handRank);
const csBody = (() => { const f = grab('  function canSplitHand(h) {', '\n  }');
  return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')); })();

const C = (r, s) => ({ rank: r, suit: s });
if (pairRank([C('8', 0), C('8', 1)]) !== '8') throw new Error('a pair of eights pairs');
if (pairRank([C('10', 0), C('K', 1)]) !== '10') throw new Error('ten-value cards pair at 10');
if (pairRank([C('A', 0), C('A', 1)]) !== 'A') throw new Error('aces pair at A');
if (pairRank([C('8', 0), C('9', 1)]) !== null) throw new Error('different ranks never pair');
if (pairRank([C('8', 0)]) !== null) throw new Error('one card is not a pair');
console.log('pairRank: same rank pairs; 10/J/Q/K pair at 10; aces at A; a mix never pairs');

/* --- canSplitHand: legal only on a fresh pair, under four hands, staked --- */
function canSplit(hands, bank, bet, h) {
  return new Function('pairRank', 'hands', 'bank', 'bet',
    'return function canSplitHand(h) {' + csBody + '}')(pairRank, hands, bank, bet)(h);
}
const pair = { cards: [C('8', 0), C('8', 1)], aces: false, done: false };
if (!canSplit([pair], 100, 25, pair)) throw new Error('a fresh pair, staked, is splittable');
if (canSplit([pair], 10, 25, pair)) throw new Error('a short bank cannot split');
if (canSplit([pair, {}, {}, {}], 100, 25, pair)) throw new Error('four hands is the cap — no fifth');
if (canSplit([{ cards: [C('A', 0), C('A', 1)], aces: true, done: false }], 100, 25,
    { cards: [C('A', 0), C('A', 1)], aces: true, done: false }))
  throw new Error('split aces cannot be re-split');
if (canSplit([{ cards: [C('8', 0), C('8', 1), C('2', 2)], aces: false, done: false }], 100, 25,
    { cards: [C('8', 0), C('8', 1), C('2', 2)], aces: false, done: false }))
  throw new Error('a three-card hand is no pair');
console.log('canSplitHand: fresh pair under four hands, staked, never split aces, never a re-pair on three cards');

/* --- the chart's pair lines, exactly as shipped --- */
const chartBody = (() => { const f = grab('  function chartPlay(t, soft, up, canD, pair) {', '\n  }');
  return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')); })();
const chart = new Function('t', 'soft', 'up', 'canD', 'pair', chartBody + '\nreturn play;');
if (chart(12, true, 6, true, 'A') !== 'split') throw new Error('aces always split');
if (chart(16, false, 10, true, '8') !== 'split') throw new Error('eights always split');
if (chart(18, false, 7, true, '9') !== 'stand') throw new Error('9,9 stands to a 7');
if (chart(18, false, 6, true, '9') !== 'split') throw new Error('9,9 splits to a 6');
if (chart(18, false, 11, true, '9') !== 'stand') throw new Error('9,9 stands to an ace');
if (chart(14, false, 7, true, '7') !== 'split') throw new Error('7,7 splits to a 7');
if (chart(14, false, 8, true, '7') !== 'hit') throw new Error('7,7 hits an 8');
if (chart(12, false, 6, true, '6') !== 'split') throw new Error('6,6 splits to a 6');
if (chart(12, false, 7, true, '6') !== 'hit') throw new Error('6,6 hits a 7');
if (chart(10, false, 6, true, '5') !== 'double') throw new Error('5,5 is a hard 10 — double');
if (chart(20, false, 6, true, '10') !== 'stand') throw new Error('10,10 is a hard 20 — stand');
if (chart(8, false, 5, true, '4') !== 'split') throw new Error('4,4 splits to a 5 (DAS)');
if (chart(8, false, 4, true, '4') !== 'hit') throw new Error('4,4 hits a 4');
for (const [pv, t] of [['2', 4], ['3', 6]]) {
  if (chart(t, false, 7, true, pv) !== 'split') throw new Error(pv + ',' + pv + ' splits to a 7');
  if (chart(t, false, 8, true, pv) !== 'hit') throw new Error(pv + ',' + pv + ' hits an 8');
}
console.log('chartPlay: aces/eights always split, 9s stand only to 7/10/A, 7s and 6s split low, 5s and tens fall through');

/* --- the book's split leg, priced on the same dealer hand --- */
const bsBody = (() => { const f = grab('  function bookSplitLeg(cur, dealer, stakeEach) {', '\n  }');
  return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')); })();
function bookSplit(cur, dealer, stakeEach, shoe) {
  return new Function('cur', 'dealer', 'stakeEach', 'shoeArr', 'SHOE999', 'pairRank', 'chartPlay', 'total', 'isSoft',
    'return function bookSplitLeg(cur, dealer, stakeEach) {' + bsBody + '}')(
    cur, dealer, stakeEach, shoe, SHOE999, pairRank, chart, total, isSoft)(cur, dealer, stakeEach);
}
/* 8,8 v 19: each eight draws a ten → 18,18 → both lose 25 */
let out = bookSplit({ yc: ['8', '8'], ys: [0, 1] }, [C('10', 0), C('9', 1)], 25, [C('10', 2), C('10', 3)]);
if (out.stake !== 50) throw new Error('a split stakes twice: ' + out.stake);
if (out.net !== -50) throw new Error('18,18 v 19 loses both: ' + out.net);
/* A,A v 18: each ace draws a nine → 20,20 → both win, one card each */
out = bookSplit({ yc: ['A', 'A'], ys: [0, 1] }, [C('10', 0), C('8', 1)], 25, [C('9', 2), C('9', 3)]);
if (out.net !== 50) throw new Error('split aces taking a nine each beat 18: ' + out.net);
/* split aces draw only ONE card: the shoe must show exactly two pops */
const shoeProbe = [C('9', 2), C('9', 3)];
bookSplit({ yc: ['A', 'A'], ys: [0, 1] }, [C('10', 0), C('8', 1)], 25, shoeProbe);
if (shoeProbe.length !== 0) throw new Error('split aces draw exactly one card each: ' + shoeProbe.length);
console.log('bookSplitLeg: the pair separates, each hand draws and plays out, both settle against the one dealer hand');

/* --- wiring: the button, the deal, the settle, the fork --- */
if (!/<button class="btn ghost" id="btnSplit" type="button">Split<\/button>/.test(src))
  throw new Error('the felt must carry a Split control');
if (!/getElementById\('btnSplit'\)\.addEventListener\('click', splitHand\)/.test(src))
  throw new Error('the Split control must fire splitHand');
const splitSrc = grab('  function splitHand() {', '\n  }');
if (!/hands\.splice\(splitActive, 1, left, right\)/.test(splitSrc))
  throw new Error('splitHand must separate the pair in place');
if (!/left\.cards\.push\(draw\(\)\)[\s\S]{0,90}right\.cards\.push\(draw\(\)\)/.test(splitSrc))
  throw new Error('each split hand must draw one card');
if (!/if \(left\.aces\) left\.done = true;/.test(splitSrc) || !/if \(right\.aces\) right\.done = true;/.test(splitSrc))
  throw new Error('split aces take one card and stand');
/* the settle loops every hand by the canon */
const settleSrc = grab('    var results = [], st = null, totalPrize = 0, myNet = 0, i;', 'var myStake = handStakeTotal();');
if (!/SHOE999\.settle\(hands\[i\]\.cards, dealerArr, hands\[i\]\.stake\)/.test(settleSrc))
  throw new Error('settle must settle every hand by the canon, each on its own stake');
/* the fork prices the book's split leg on the same dealer hand */
const forkSrc = grab('    if (fork) {', 'fork = null;');
if (!/if \(fork\.kind === 'split'\) \{/.test(forkSrc) || !/bookSplitLeg\(cur, dealerArr, bet\)/.test(forkSrc))
  throw new Error('a forked split must price the book\'s split leg on the same dealer hand');
if (!/if \(fk\.net > myNet\) forkStats\.book\+\+;/.test(forkSrc))
  throw new Error('the forked split must score against the whole round');
/* the coach marks and flashes the Split control */
if (!/p === 'split' \? 'btnSplit'/.test(src)) throw new Error('the coach must mark the Split control');
if (!/\[.btnHit., .btnStand., .btnDouble., .btnSplit.\]/.test(src))
  throw new Error('the Split control must clear and flash with the others');
/* a split carries no placed price: the round leaves the strip */
if (!/if \(choice === 'split'\) \{ evRound = false; return; \}/.test(src))
  throw new Error('a split has no placed price — the round leaves the reconciliation');
/* DAS: a split hand doubles on its own stake */
if (!/bank -= h\.stake; h\.stake \*= 2; h\.doubled = true;/.test(src))
  throw new Error('double after split rides the hand\'s own stake');
console.log('wiring: Split control, per-hand settle, DAS, and a forked split priced on the same dealer hand');
console.log('the coach book: a pair answers \"split\" before any total is considered');

console.log('\nsplit verified');
