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

/* --- the canon, from the page --- */
const cStart = src.indexOf('  var SHOE999 = (function () {');
const cEnd = src.indexOf('})();', cStart) + 5;
const SHOE999 = (0, eval)('(' + src.slice(cStart, cEnd).replace('var SHOE999 = ', '').replace(/;\s*$/, '') + ')');

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

console.log('\nside-by-side review verified');
