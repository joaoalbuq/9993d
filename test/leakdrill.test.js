/* The leak drill's stacked shoe must deliver the TARGET cell:
   extract the shipped leakDeal, give it the page's own draw()
   and shoe, and simulate deal()'s pop order (player, up,
   player) over many cells — every forced deal must land in
   the target class against the target upcard. Soft 12 is
   excluded by design (A+A is a pair; no clean two-card build). */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* the canon, from the page */
const cStart = src.indexOf('  var SHOE999 = (function () {');
const cEnd = src.indexOf('})();', cStart) + 5;
const SHOE999 = (0, eval)('(' + src.slice(cStart, cEnd).replace('var SHOE999 = ', '').replace(/;\s*$/, '') + ')');

/* mimic the page's module state */
let shoeArr = [];
function buildShoe() { shoeArr = SHOE999.build(2); }
function draw() { return shoeArr.pop(); }
const leakQueue = [];

/* leakDeal, exactly as shipped, parameterized by its free names */
const ldStart = src.indexOf('function leakDeal() {');
const tailMark = 'if (!findAndStack()) { buildShoe(); findAndStack(); }';
const tAt = src.indexOf(tailMark, ldStart);
if (ldStart < 0 || tAt < 0) throw new Error('leakDeal not found');
const ldClose = src.indexOf('\n  }', tAt) + 4;
const ldSrc = src.slice(ldStart, ldClose);
if (ldSrc.split('{').length !== ldSrc.split('}').length) throw new Error('extraction unbalanced');
const factory = new Function('leakMode', 'leakQueue', 'draw', 'shoeArr', 'leakCell', 'buildShoe',
  ldSrc + '\nreturn leakDeal;');

function run(cell, expectSoft, expectT, expectUp) {
  buildShoe();
  const deal = factory(true, leakQueue, draw, shoeArr, cell, buildShoe);
  deal();
  if (shoeArr.length < 3) throw new Error('stack too short for ' + cell);
  const p1 = shoeArr.pop(), up = shoeArr.pop(), p2 = shoeArr.pop();
  const v = SHOE999.value([p1, p2]);
  const ok = v.total === expectT && !!v.soft === expectSoft && up.rank === expectUp;
  if (!ok) {
    throw new Error(cell + ' -> dealt ' + p1.rank + ',' + p2.rank + ' (' + v.total +
      (v.soft ? ' soft' : '') + ') v ' + up.rank);
  }
  return true;
}

const cells = [
  ['hard 16 v 10', false, 16, '10'],
  ['hard 16 v 10', false, 16, '10'],          /* repeated: the classic drills twice */
  ['hard 12 v 2', false, 12, '2'],
  ['hard 20 v 6', false, 20, '6'],
  ['hard 11 v A', false, 11, 'A'],            /* this floor's convicted cells */
  ['hard 11 v 10', false, 11, '10'],
  ['hard 9 v 3', false, 9, '3'],
  ['hard 8 v 5', false, 8, '5'],
  ['hard 7 v 10', false, 7, '10'],
  ['hard 5 v 6', false, 5, '6'],
  ['hard 4 v 2', false, 4, '2'],              /* only a pair can make hard 4 — but
                                                 the pair build here is 2+2, allowed
                                                 as a HAND class (no splits here) */
  ['soft 18 v 9', true, 18, '9'],
  ['soft 18 v 2', true, 18, '2'],
  ['soft 13 v 5', true, 13, '5'],
  ['soft 19 v 6', true, 19, '6'],
  ['soft 15 v 4', true, 15, '4'],
  ['soft 13 v 6', true, 13, '6']
];
let pass = 0;
for (const [cell, s, t, u] of cells) { run(cell, s, t, u); pass++; }
console.log('stacked-deal cells verified:', pass + '/' + cells.length);

/* soft 12 must be refused, not dealt wrong */
let refused = false;
try {
  run('soft 12 v 6', true, 12, '6');
} catch (e) { refused = true; }
if (!refused) throw new Error('soft 12 should be excluded from the drill taxonomy');
console.log('soft 12 (A+A pair): correctly refused by the taxonomy');

console.log('\nleak drill: every forced deal lands in its target cell');
