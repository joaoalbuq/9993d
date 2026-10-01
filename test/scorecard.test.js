/* The session review's scorecard: the reel folds into the few
   cells behind most of the loss — Pareto's cut. The fold is the
   property under test: cells named exactly like the ledger,
   costs summed, the cut stopping once most of the money is
   accounted for, and the panel ending on the scorecard.     */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- reviewScorecard, exactly as shipped --- */
function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
const fnFull = grab('  function reviewScorecard(reel) {', '\n  }');
const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
const reviewScorecard = new Function('return function reviewScorecard(reel) {' + fnBody + '}')();

/* --- an empty reel scores nothing --- */
if (reviewScorecard([]) !== null) throw new Error('empty reel must score null');
if (reviewScorecard(null) !== null) throw new Error('null reel must score null');
console.log('empty reel: no scorecard — an unstained session names no cells');

/* --- one cell, repeated: the whole loss sits in one name --- */
const one = reviewScorecard([
  { soft: false, t: 16, up: '10', cost: 25 },
  { soft: false, t: 16, up: '10', cost: 50 }
]);
if (!one || one.rows.length !== 1 || one.cells !== 1) throw new Error('one cell must fold to one row');
if (one.rows[0].cell !== 'hard 16 v 10' || one.rows[0].n !== 2) throw new Error('cell named like the ledger, count kept: ' + JSON.stringify(one.rows[0]));
if (Math.abs(one.total - 75) > 1e-9) throw new Error('costs summed: ' + one.total);
if (one.covered !== 1) throw new Error('one cell covers everything');
console.log('single cell: hard 16 v 10 ×2 — the whole −75 in one name, fully covered');

/* --- Pareto's cut: the costliest cell alone can end the walk --- */
const pareto = reviewScorecard([
  { soft: false, t: 16, up: '10', cost: 60 },
  { soft: false, t: 12, up: '2', cost: 25 },
  { soft: true, t: 13, up: 'Q', cost: 10 },
  { soft: false, t: 15, up: '9', cost: 5 }
]);
if (pareto.rows.length !== 1) throw new Error('60% of 100 ends the walk at one row: ' + JSON.stringify(pareto.rows));
if (pareto.rows[0].cell !== 'hard 16 v 10') throw new Error('costliest first: ' + pareto.rows[0].cell);
if (pareto.cells !== 4) throw new Error('distinct cells counted: ' + pareto.cells);
if (Math.abs(pareto.covered - 0.6) > 1e-9) throw new Error('covered share: ' + pareto.covered);
console.log('pareto cut: one row at 60% of the −100 — the review names the hand, not the list');

/* --- soft cells named like the ledger --- */
const soft = reviewScorecard([{ soft: true, t: 13, up: 'Q', cost: 10.05 }]);
if (soft.rows[0].cell !== 'soft 13 v Q') throw new Error('soft naming: ' + soft.rows[0].cell);
if (soft.rows[0].cost !== 10.05) throw new Error('fractional cost kept: ' + soft.rows[0].cost);
console.log('soft naming: soft 13 v Q — ledger spelling, so the drills can aim at it');

/* --- the cap: many small cells still stop at three rows --- */
const many = [];
for (let t = 12; t <= 21; t++) many.push({ soft: false, t, up: '6', cost: 10 });
const capped = reviewScorecard(many);
if (capped.rows.length !== 3) throw new Error('at most three rows: ' + capped.rows.length);
if (capped.cells !== 10) throw new Error('ten distinct cells: ' + capped.cells);
if (Math.abs(capped.covered - 0.3) > 1e-9) throw new Error('honest share when the cut caps: ' + capped.covered);
console.log('cap: three rows max — 30% of a spread-out loss reported honestly');

/* --- the panel ends on the scorecard --- */
if (!/house refunds each hand\.<\/p>' \+\s*\n\s*scHtml;/.test(src))
  throw new Error('the scorecard must be the last word of the session review panel');
console.log('panel order: list, fork row, refund note — and the scorecard last');

console.log('\nreview scorecard verified');
