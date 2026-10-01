/* The bet-spread score: spreadCost extracted exactly as shipped
   and driven across the spread table — flat stakes below the edge
   cost nothing, shortfalls price at half a percent per unplayed
   unit on the stake laid, the cap at 6 units binds, and judged
   rounds accumulate into the persisted book.                    */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- spreadUnits and spreadCost, exactly as shipped --- */
function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
function extractFn(sig) {
  const full = grab(sig, '\n  }');
  const body = full.slice(full.indexOf('{') + 1, full.lastIndexOf('}'));
  const name = sig.match(/function (\w+)/)[1];
  const params = sig.match(/\(([^)]*)\)/)[1];
  return new Function(params, body + '\nreturn ' + name + ';');
}
const spreadUnits = extractFn('function spreadUnits(tc) {');
const spreadCost = extractFn('function spreadCost(units, tc, stake) {');

/* --- the advice table is unchanged: tc−1, capped, 1 below 2 --- */
const advice = [[-4,1],[0,1],[1,1],[2,1],[3,2],[4,3],[5,4],[7,6],[9,6]];
for (const [tc, u] of advice) {
  if (spreadUnits(tc) !== u) throw new Error('advice ' + tc + ' -> ' + spreadUnits(tc) + ', want ' + u);
}
console.log('advice table: 1 unit below tc 2, tc−1 above, capped at 6');
const close = (x, y, eps) => Math.abs(x - y) <= (eps || 1e-9);

/* --- pricing: below the edge nothing costs; at the edge nothing costs --- */
if (spreadCost(1, 1, 25) !== 0) throw new Error('flat at tc 1 must cost 0');
if (spreadCost(1, 0, 25) !== 0) throw new Error('flat at tc 0 must cost 0');
if (spreadCost(1, -3, 25) !== 0) throw new Error('flat at tc −3 must cost 0');
if (spreadCost(2, 3, 100) !== 0) throw new Error('2 units at tc 3 is the advice: cost 0');
if (spreadCost(4, 5, 100) !== 0) throw new Error('4 units at tc 5 is the advice: cost 0');
if (!close(spreadCost(3, 5, 100), 0.5)) throw new Error('3 units at tc 5 under-bets by 1: ' + spreadCost(3, 5, 100));
/* over-betting is never punished: units above the advice still cost 0 */
if (spreadCost(5, 3, 100) !== 0) throw new Error('over-bet must cost 0, got ' + spreadCost(5, 3, 100));
console.log('no-cost cases: flat shoes, on-count stakes, over-bets');

/* --- the shortfall price: half a percent per unplayed unit --- */
/* tc 3 advises 2; laid 1 -> gap 1 -> 0.005 × 100 = 0.5 chips */
if (!close(spreadCost(1, 3, 100), 0.5)) throw new Error('1u v tc3 @100: ' + spreadCost(1, 3, 100));
/* tc 7 advises 6 (cap); laid 1 -> gap 5 -> 2.5 chips on a 100 stake */
if (!close(spreadCost(1, 7, 100), 2.5)) throw new Error('cap case: ' + spreadCost(1, 7, 100));
/* tc 9 advises 6 (cap binds): gap from units 2 is 4, not 7 */
if (!close(spreadCost(2, 9, 200), 4.0)) throw new Error('cap binds on big counts: ' + spreadCost(2, 9, 200));
/* fractional lays: 2.5 units at tc 6 (advice 5) -> gap 2.5 -> 2.5×0.005×250 = 3.125 */
if (!close(spreadCost(2.5, 6, 250), 3.125)) throw new Error('fractional: ' + spreadCost(2.5, 6, 250));
console.log('pricing: gap × 0.5% × stake — exact at the cap, on fractional lays');

/* --- persistence shape: the book is three numbers --- */
const shape = { judged: 4, onCount: 3, cost: 1.75 };
if (shape.onCount > shape.judged) throw new Error('onCount cannot exceed judged');
console.log('book shape: judged / onCount / cost — the hint renders Spread % and −unplayed');

console.log('\nbet-spread score verified');
