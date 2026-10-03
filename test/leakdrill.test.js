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

/* the canon: the shipped module itself, not a page copy */
const SHOE999 = require('../shoe999.js');

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
  'refillQueue = function () {}, gradWakeDue = function () { return 0; }, gradClock = 0, saveGrad = function () {}',   /* graduation stubs */
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

/* --- the review reel's stacker: a stored hole card must come off
   the top at the dealer's turn, after the player's two and the
   upcard — the replay plays the EXACT dealer hand. Entries
   without a stored hole (pre-hole-card saves) keep the old
   3-card behavior. Extracted from reviewDeal's findAndStack.  */
const rdStart = src.indexOf('function reviewDeal() {');
const rdEnd = src.indexOf('\n  }', src.indexOf('if (!findAndStack()) { buildShoe(); findAndStack(); }', rdStart)) + 4;
if (rdStart < 0 || rdEnd < 0) throw new Error('reviewDeal not found');
const rdSrc = src.slice(rdStart, rdEnd);
if (rdSrc.split('{').length !== rdSrc.split('}').length) throw new Error('reviewDeal extraction unbalanced');

function reviewFactory(entry) {
  buildShoe();
  const deal = new Function('reviewMode', 'replay', 'reviewIdx', 'shoeArr', 'r', 'buildShoe',
    rdSrc.replace('function reviewDeal() {', 'function reviewDeal() {') +
    '\nreturn reviewDeal;');
  return deal(true, [entry], 0, shoeArr, entry, buildShoe);
}

/* an entry WITH a stored hole: pop order must be first, up, second, hole */
const withHole = { yc: ['6', '10'], ys: [0, 1], up: '10', us: 2, hole: '9', holes: 3 };
{
  buildShoe();
  const d = reviewFactory(withHole);
  d();
  const p1 = shoeArr.pop(), up = shoeArr.pop(), p2 = shoeArr.pop(), hole = shoeArr.pop();
  if (p1.rank !== '6' || p2.rank !== '10' || up.rank !== '10' || up.suit !== 2) throw new Error('review stack (hole): ' + [p1.rank, up.rank, p2.rank].join(','));
  if (hole.rank !== '9') throw new Error('hole card must be next off the shoe: got ' + hole.rank);
  console.log('review stacker: stored hole card rides fourth — first, up, second, hole');
}

/* an entry WITHOUT a stored hole: the classic 3-card stack, no fourth pop owed */
const noHole = { yc: ['8', '8'], ys: [0, 1], up: '6', us: 2 };
{
  buildShoe();
  const d = reviewFactory(noHole);
  d();
  const p1 = shoeArr.pop(), up = shoeArr.pop(), p2 = shoeArr.pop();
  if (p1.rank !== '8' || p2.rank !== '8' || up.rank !== '6' || up.suit !== 2) throw new Error('review stack (no hole): ' + [p1.rank, up.rank, p2.rank].join(','));
  console.log('review stacker: hole-less entries replay as before — nothing extra owed');
}

/* --- a tapped EV bar stacks its cell at once, and the panel comes
       back on the next hand \u2014 no bet in between, and the hand is
       never booked, so nothing is invented for it ------------- */
function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
/* the whole tap, over stub state: does it deal, does it book?
   the two tap flags are function locals, so the built function
   hands them back rather than the harness guessing */
const dnFull = grab('  function drillNow(cell, now) {', '\n  }');
const dnFlags = ' { drillFree: drillFree, drillReopen: drillReopen, leakCell: leakCell }';
const dnBody = dnFull.slice(dnFull.indexOf('{') + 1, dnFull.lastIndexOf('}'))
  /* every early exit hands the two flags back, so the harness can read them */
  .replace(/return;/g, 'return' + dnFlags + ';')
  + '\nreturn' + dnFlags + ';';
const dnSrc = dnFull;
const buildDrillNow = new Function('sessionLeaks', 'leaks', 'reviewMode', 'leakMode', 'leakQueue',
  'refillQueue', 'leakCell', 'saveLeaks', 'renderCoach', 'renderLeaks', 'phase', 'bet',
  'placeChip', 'deal', 'setStatus', 'DRILLFREE', 'DRILLREOPEN',
  'var drillFree = DRILLFREE, drillReopen = DRILLREOPEN;\n' +
  'return function drillNow(cell, now) {' + dnBody + '};');
function tapBar(cell, st) {
  const drillNow = buildDrillNow(st.sessionLeaks, st.leaks, st.reviewMode, st.leakMode,
    st.leakQueue, () => { st.refilled = (st.refilled || 0) + 1; }, st.leakCell, function () {},
    () => {}, () => {}, st.phase, st.bet,
    (v) => { st.placed = (st.placed || 0) + v; st.bet += v; },
    () => { st.dealt = (st.dealt || 0) + 1; }, (s) => { st.status = s; },
    !!st.drillFree, !!st.drillReopen);
  st.flags = drillNow(cell, st.now !== false);
  return st;
}
/* the free hand: dealt, house-staked, and NOT booked */
const t1 = tapBar('hard 16 v 10', {
  sessionLeaks: { 'hard 16 v 10': { n: 3, cost: 60 } }, leaks: { 'hard 16 v 10': { n: 3, cost: 60 } },
  reviewMode: true, leakMode: false, leakQueue: [], leakCell: null,
  phase: 'betting', bet: 0, drillFree: false, drillReopen: false
});
if (t1.dealt !== 1) throw new Error('a tapped bar must deal its cell at once');
if (t1.placed !== 25) throw new Error('the house must stake the hand itself: ' + t1.placed);
if (!t1.flags.drillFree) throw new Error('the hand must be marked free');
if (!t1.flags.drillReopen) throw new Error('the panel must be asked to come back');
if (t1.flags.leakCell !== 'hard 16 v 10') throw new Error('the tapped cell must be the forced one');
if (t1.refilled !== 1) throw new Error('arming the drill must build its queue');
if (!/house staked this one/.test(t1.status)) throw new Error('the status must say who staked it: ' + t1.status);
/* with the player's own bet already down, the house adds nothing */
const t2 = tapBar('hard 16 v 10', {
  sessionLeaks: { 'hard 16 v 10': {} }, leaks: { 'hard 16 v 10': {} },
  reviewMode: true, leakMode: false, leakQueue: [], leakCell: null,
  phase: 'betting', bet: 100, drillFree: false, drillReopen: false
});
if (t2.placed !== undefined) throw new Error('a bet already down must not be topped up: ' + t2.placed);
if (t2.dealt !== 1 || !t2.flags.drillFree) throw new Error('the hand still deals, still free');
/* mid-round: the tap arms the cell and the panel, and waits its turn */
const t3 = tapBar('hard 16 v 10', {
  sessionLeaks: { 'hard 16 v 10': {} }, leaks: { 'hard 16 v 10': {} },
  reviewMode: false, leakMode: true, leakQueue: [], leakCell: null,
  phase: 'acting', bet: 0, drillFree: false, drillReopen: false
});
if (t3.dealt) throw new Error('a mid-round tap must not deal over a live hand');
if (!t3.flags.drillReopen || t3.flags.leakCell !== 'hard 16 v 10') throw new Error('a mid-round tap still arms both');
if (!/next hand stacks it/.test(t3.status)) throw new Error('a mid-round tap waits its turn: ' + t3.status);
/* a name tap (the scorecard, the row link) keeps the old, bet-gated path */
const t4 = tapBar('hard 16 v 10', {
  sessionLeaks: { 'hard 16 v 10': {} }, leaks: { 'hard 16 v 10': {} },
  reviewMode: false, leakMode: true, leakQueue: [], leakCell: null,
  phase: 'betting', bet: 0, drillFree: false, drillReopen: false, now: false
});
if (t4.dealt || t4.flags.drillReopen) throw new Error('a named cell still waits for a bet, as before');
if (!/place any bet/.test(t4.status)) throw new Error('a named cell keeps the bet prompt: ' + t4.status);
/* a mastered cell is still refused, and still never dealt */
const t5 = tapBar('hard 16 v 10', {
  sessionLeaks: { 'hard 16 v 10': {} }, leaks: { 'hard 16 v 10': { m: 1 } },
  reviewMode: true, leakMode: false, leakQueue: [], leakCell: null,
  phase: 'betting', bet: 0, drillFree: false, drillReopen: false
});
if (t5.dealt || t5.flags.drillReopen) throw new Error('a master has left the drill for good');
console.log('the bar tap: stacks its cell at once, the house stakes it, the panel comes back \u2014 no bet in between');

/* the free hand never books: the round is closed to the EV strip
   and the luck figures, exactly as a replay is */
if (!/var drillFree = false;/.test(src) || !/var drillReopen = false;/.test(src))
  throw new Error('the two tap flags must exist');
if (dnSrc.indexOf('drillFree = true;') > dnSrc.indexOf('deal();'))
  throw new Error('the hand must be marked free BEFORE it is dealt');
if (!/drillReopen = true;/.test(dnSrc) || !/drillFree = true;/.test(dnSrc))
  throw new Error('the tap must ask for its panel back');
if (!/if \(phase !== 'betting' \|\| \(!bet && !drillFree\)\) return;/.test(src))
  throw new Error('deal must admit the house-staked hand');
if (!/evRound = !reviewMode && !drillFree;/.test(src))
  throw new Error('the free hand must never be priced \u2014 no luck figure, no EV-left entry');
if (!/drillNow\(e\.target\.closest\('\.evtap'\)\.getAttribute\('data-cell'\), true\);/.test(src))
  throw new Error('the EV bar tap is the immediate one; a named cell is not');
const nr = grab('  function newRound() {', '\n  }');
if (!/if \(drillReopen\) \{/.test(nr) || !/drillReopen = false;\s*drillFree = false;/.test(nr))
  throw new Error('the next hand must close the free hand and reopen the panel');
if (!/leakView = 'session';/.test(nr)) throw new Error('the panel must come back on its session view');
console.log('the free hand: priced by nothing \u2014 no chips, no luck figure, no EV entry invented');

console.log('\nleak drill: every forced deal lands in its target cell');
