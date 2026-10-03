/* The side-by-side review: the book's leg is priced on the SAME
   dealer hand the player faced — a hit/double book pops the very
   card the player's play consumed, a stand book draws nothing,
   the double stakes twice, and both outcomes ride the reel
   entry. The canon settles both legs; the parity of the dealer
   hand is the property under test.                              */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- the canon: the shipped module itself, not a page copy --- */
const SHOE999 = require('../shoe999.js');

/* --- forkWord, exactly as shipped --- */
function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
const fwFull = grab('  function forkWord(net, stake) {', '\n  }');
const fwBody = fwFull.slice(fwFull.indexOf('{') + 1, fwFull.lastIndexOf('}'));
const fmtMatch = src.match(/function fmt\(n\) \{ return[^\n]*\}/);   /* fmt is a one-liner on the page */
if (!fmtMatch) throw new Error('fmt one-liner not found');
const fmt = new Function('n', fmtMatch[0].slice(fmtMatch[0].indexOf('{') + 1, -1) + '\nreturn fmt;');
const forkWord = new Function('fmt', 'return function forkWord(net, stake) {' + fwBody + '}')(fmt);

const C = (r, s) => ({ rank: r, suit: s });

/* --- the dealer hand is FIXED and shared by both legs --- */
const dealer = [C('10', 0), C('9', 1)];       /* a made 19 the player must beat */

/* --- leg A: the player stood on 16 (the misplay) --- */
const stoodCards = [C('6', 0), C('10', 1)];
const a = SHOE999.settle(stoodCards, dealer, 25);
if (a.kind !== 'lose' || a.net !== -25) throw new Error('16 v 19 must lose the stake');

/* --- leg B: the book HITS — and the card it draws is the very
       card the player's draw would have consumed. Whatever it
       is, the dealer hand is untouched by the drawing.        --- */
for (const draw of [C('5', 2), C('10', 3), C('A', 2)]) {
  const hitCards = stoodCards.concat([draw]);
  const b = SHOE999.settle(hitCards, dealer, 25);
  if (JSON.stringify(dealer) !== JSON.stringify([C('10', 0), C('9', 1)])) throw new Error('dealer hand mutated');
  if (draw.rank === 'A' && b.kind !== 'lose') throw new Error('16+1 = hard 17 v 19 must lose');
  if (draw.rank === '5' && b.kind !== 'win') throw new Error('16+5 = 21 v 19 must win');
  if (draw.rank === '10' && b.kind !== 'bust') throw new Error('16+10 must bust the stake away');
}
console.log('hit leg: draws priced against the SAME dealer hand — parity holds across the deck');

/* --- the double: same draw, twice the stake --- */
const dblCards = [C('6', 0), C('5', 1)];      /* 11 doubling */
const dblDraw = C('10', 2);                   /* 21 */
const d1 = SHOE999.settle(dblCards.concat([dblDraw]), dealer, 50);
if (d1.net !== 50) throw new Error('21 v 19 at 50 staked must win +50: ' + d1.net);
console.log('double leg: the book\'s price is two units — the fork prices it so');

/* --- forkWord, exactly as the status line and panel render it --- */
if (forkWord(50, 50) !== 'won +50') throw new Error('win word: ' + forkWord(50, 50));
if (forkWord(0, 25) !== 'pushed') throw new Error('push word: ' + forkWord(0, 25));
if (forkWord(-25, 25) !== 'lost \u221225') throw new Error('lose word: ' + forkWord(-25, 25));
console.log('fork words: "won +N / pushed / lost −N" — the divergence reads at a glance');

/* --- the reel entry shape: both outcomes ride one entry --- */
const entry = { yc: ['6', '10'], up: '10', choice: 'stand', book: 'hit', cost: 2.6, forkYou: 'lost −25', forkBook: 'pushed' };
if (!entry.forkYou || !entry.forkBook) throw new Error('fork outcomes must persist on the entry');
console.log('reel entry: forkYou + forkBook persisted — the panel shows the divergence forever');

/* --- the fork's own score: how often the book beat your replay --- */
const frFull = grab('  function forkRate() {', '\n  }');
const frBody = frFull.slice(frFull.indexOf('{') + 1, frFull.lastIndexOf('}'));
function rateOf(stats) {
  return new Function('forkStats', 'return function forkRate() {' + frBody + '}')(stats)();
}
if (rateOf({ forks: 0, book: 0 }) !== null) throw new Error('no forks, no rate');
if (rateOf({ forks: 4, book: 3 }) !== 75) throw new Error('the book took 3 of 4 \u2192 75%');
if (rateOf({ forks: 8, book: 0 }) !== 0) throw new Error('the book never won \u2192 0%');
console.log('forkRate: the book\u2019s replay win-rate \u2014 3 of 4 reads 75%, none reads 0%');

/* --- wiring: every fork scores, persists, and rides the \u2660 pill --- */
if (!/var forkStats = \{ forks: 0, book: 0 \};/.test(src))
  throw new Error('the fork score must start at zero');
if (!/'999\.practice\.forks'/.test(src) || !/function saveForks\(\)/.test(src))
  throw new Error('the fork score must persist across sessions');
const settleFork = grab('    if (fork) {', 'fork = null;');
if (!/forkStats\.forks\+\+;/.test(settleFork) || !/if \(fk\.net > myNet\) forkStats\.book\+\+;/.test(settleFork) ||
    !/saveForks\(\);/.test(settleFork))
  throw new Error('every replayed fork must score the book against your leg');
if (!/var bookCards = cur && cur\.yc[\s\S]{0,30}cur\.yc\[0\]/.test(settleFork) ||
    !/you\.slice\(\);/.test(settleFork))
  throw new Error('the book leg must price the ORIGINAL two cards, not the replay\u2019s build');
if (!/var fkPct = forkRate\(\);/.test(src) ||
    !/fkPct == null \? '' : ' \\u00b7 fork ' \+ fkPct \+ '%'/.test(src))
  throw new Error('the \u2660 pill must carry the fork win-rate');
if (!/\(ixF \? ' \\u00b7 ix ' \+ ixF : ''\) \+ sp \+ fkS\)/.test(src))
  throw new Error('the fork rate must ride beside the count scores');
if (!/book's play beats your replay/.test(src))
  throw new Error('the \u2660 pill\u2019s title must name the fork rate');
console.log('wiring: a fork scores and persists, the book\u2019s win-rate rides the \u2660 pill');

/* --- the divergence feeds the drill: the misplayed hand is queued
       back so the next leak hand forces the book's line. The cell
       is merged into the ledger, a graduate wakes, a master is
       left alone, and the cell is forced ahead of the queue. --- */
const fqFull = grab('  function forkQueue(cell) {', '\n  }');
const fqBody = fqFull.slice(fqFull.indexOf('{') + 1, fqFull.lastIndexOf('}'));
function runForkQueue(leaksBox, q, clock) {
  const saved = [];
  const fn = new Function('leaks', 'saveLeaks', 'leakQueue', 'leakCell', 'gradClock',
    'return function forkQueue(cell) {' + fqBody + '\nreturn leakCell;}')(
    leaksBox, () => saved.push(1), q, null, clock == null ? 0 : clock);
  return { fn: fn, saved: saved };
}
const lk1 = {}, q1 = [], r1 = runForkQueue(lk1, q1, 42);
const forced = r1.fn('hard 16 v 10');
if (!lk1['hard 16 v 10'] || typeof lk1['hard 16 v 10'].ts !== 'number')
  throw new Error('a fork must merge its cell into the ledger, stamped fresh');
if (lk1['hard 16 v 10'].d !== 42)
  throw new Error('a fork must stamp the drill clock, so its decay restarts here');
if (q1[0] !== 'hard 16 v 10') throw new Error('the forked cell must lead the queue');
if (forced !== 'hard 16 v 10') throw new Error('the forked cell must be forced');
if (!r1.saved.length) throw new Error('the fed ledger must persist');
r1.fn('hard 16 v 10');
if (q1.length !== 1) throw new Error('the same cell must not queue twice: ' + q1);
const lk2 = { 'soft 18 v 6': { n: 2, cost: 9, r: 1, back: 4, s: 3 } }, q2 = [];
runForkQueue(lk2, q2).fn('soft 18 v 6');
if (lk2['soft 18 v 6'].r !== 0 || lk2['soft 18 v 6'].back !== 0 || lk2['soft 18 v 6'].s !== 0)
  throw new Error('a divergent fork wakes a graduated cell');
if (q2[0] !== 'soft 18 v 6') throw new Error('the woken graduate must queue');
const lk3 = { 'hard 9 v 2': { n: 5, cost: 30, m: 1 } }, q3 = [];
const forcedM = runForkQueue(lk3, q3).fn('hard 9 v 2');
if (q3.length !== 0 || forcedM === 'hard 9 v 2')
  throw new Error('a mastered cell has left the drill: a fork cannot pull it back');
console.log('fork queue: the divergent hand is forced ahead of the queue \u2014 a graduate wakes, a master is left alone');

/* --- wiring: entries carry their cell; the settle feeds the queue --- */
if (!/cell: lastCell, round: roundNo/.test(src))
  throw new Error('the reel entry must carry its ledger cell');
if (!/cell: 'insurance v ace', round: roundNo/.test(src))
  throw new Error('the insurance entry must carry its own cell');
if (!/if \(cur\.cell\) \{/.test(settleFork) || !/forkQueue\(cur\.cell\);/.test(settleFork))
  throw new Error('the settle must feed a divergent fork into the drill');
if (!/queued for the drill: ' \+ cur\.cell/.test(settleFork))
  throw new Error('the note must name the hand queued for the drill');
if (!/var forced = leakCell \|\| leakQueue\[0\];/.test(src) ||
    !/if \(forced && !\(leaks\[forced\] && leaks\[forced\]\.m\)\) next = \{ cell: forced \};/.test(src))
  throw new Error('the panel must name the hand the drill will actually serve');
console.log('wiring: a divergence queues the misplayed hand, names it on the settle line, and the panel names the served hand');

console.log('\nside-by-side review verified');
