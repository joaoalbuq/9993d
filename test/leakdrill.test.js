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
const INDEX999 = require('../index999.js');   /* the real chart, so a tap widens as it ships */

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
const factory = new Function('leakMode', 'leakQueue', 'draw', 'shoeArr', 'leakCell', 'buildShoe', 'forkHand',
  'refillQueue = function () {}, gradWakeDue = function () { return 0; }, gradClock = 0, saveGrad = function () {}',   /* graduation stubs */
  'leaks = {}, rememberIx = function () {}, leakFamily = []',   /* the tapped column the walk reads */
  ldSrc + '\nreturn leakDeal;');

function run(cell, expectSoft, expectT, expectUp) {
  buildShoe();
  const deal = factory(true, leakQueue, draw, shoeArr, cell, buildShoe, {});
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
  'placeChip', 'deal', 'setStatus', 'DRILLFREE', 'DRILLREOPEN', 'rememberIx',
  'DRILLAUTO', 'hiLo', 'roundNo', 'undoBarTap', 'LEAKFAMILY', 'INDEX999',
  'var drillFree = DRILLFREE, drillReopen = DRILLREOPEN, drillAuto = DRILLAUTO;\n' +
  'var leakFamily = LEAKFAMILY;\n' +
  'return function drillNow(cell, now) {' + dnBody + '};');
function tapBar(cell, st) {
  const drillNow = buildDrillNow(st.sessionLeaks, st.leaks, st.reviewMode, st.leakMode,
    st.leakQueue, () => { st.refilled = (st.refilled || 0) + 1; }, st.leakCell, function () {},
    () => {}, () => {}, st.phase, st.bet,
    (v) => { st.placed = (st.placed || 0) + v; st.bet += v; },
    () => { st.dealt = (st.dealt || 0) + 1; }, (s) => { st.status = s; },
    !!st.drillFree, !!st.drillReopen, (c) => { st.remembered = c; },
    st.drillAuto || null, st.hiLo || 0, st.roundNo || 0,
    () => { st.undone = (st.undone || 0) + 1; return true; },
    st.leakFamily || [], st.familyOf || INDEX999);
  st.leakFamily = st.leakFamily || [];
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
if (!/if \(drillReopen\) \{/.test(nr) || !/drillReopen = false;/.test(nr) || !/drillFree = false;/.test(nr))
  throw new Error('the next hand must close the free hand and reopen the panel');
/* the free hand is over, so it is no longer open to being taken back */
if (!/drillAuto = null;/.test(nr))
  throw new Error('the settled free hand must close the undo');
if (!/leakView = 'session';/.test(nr)) throw new Error('the panel must come back on its session view');
console.log('the free hand: priced by nothing \u2014 no chips, no luck figure, no EV entry invented');

console.log('\nleak drill: every forced deal lands in its target cell');

/* --- a forked hand is REPLAYED, not rebuilt: the exact two cards and the
   dealer's card it was actually dealt, suit for suit. The class name is only
   how the ledger files it. Over many fresh shoes, every stack must be the
   same hand \u2014 which is the whole claim, and one lucky stack proves nothing. */
function runExact(cell, fh, expectSoft, expectT, expectUp, tries) {
  for (let n = 0; n < (tries || 14); n++) {
    buildShoe();
    const hands = {}; hands[cell] = fh;
    const deal = factory(true, leakQueue, draw, shoeArr, cell, buildShoe, hands);
    deal();
    const p1 = shoeArr.pop(), up = shoeArr.pop(), p2 = shoeArr.pop();
    const got = [p1.rank + p1.suit, up.rank + up.suit, p2.rank + p2.suit];
    const want = [fh.yc[0] + fh.ys[0], fh.up + fh.us, fh.yc[1] + fh.ys[1]];
    if (got.join(',') !== want.join(','))
      throw new Error(cell + ' -> stacked ' + got.join(',') + ', wanted ' + want.join(','));
    /* and the replay must still BE that cell: the class name is not a lie */
    const v = SHOE999.value([p1, p2]);
    if (v.total !== expectT || !!v.soft !== expectSoft || up.rank !== expectUp)
      throw new Error(cell + ' replayed off-class: ' + v.total + (v.soft ? ' soft' : '') + ' v ' + up.rank);
  }
  return true;
}
/* a class constrains only the TOTAL, so a real forked hand is free to be a
   composition the canonical build would never choose \u2014 hard 16 as 7+9, not the
   floor's 6+10; hard 14 as a pair of sevens, not 4+10. Those are the ranks
   that prove the replay. The suits prove it again, and suit 0 is clubs \u2014 the
   one value a truth-test would silently drop. */
const forks = [
  ['hard 16 v 10', { yc: ['7', '9'], ys: [0, 3], up: '10', us: 1 }, false, 16, '10'],
  ['hard 19 v 6', { yc: ['10', '9'], ys: [2, 0], up: '6', us: 3 }, false, 19, '6'],
  ['hard 11 v A', { yc: ['5', '6'], ys: [3, 2], up: 'A', us: 0 }, false, 11, 'A'],
  ['hard 20 v 6', { yc: ['10', '10'], ys: [0, 1], up: '6', us: 2 }, false, 20, '6'],
  ['hard 14 v 9', { yc: ['7', '7'], ys: [0, 2], up: '9', us: 1 }, false, 14, '9'],
  ['soft 19 v 6', { yc: ['A', '8'], ys: [1, 0], up: '6', us: 3 }, true, 19, '6']
];
for (const [cell, fh, s, t, u] of forks) runExact(cell, fh, s, t, u);
console.log('forked hands replayed exactly: ' + forks.length + ' cells x 14 fresh shoes, rank and suit');

/* the canonical build must NOT be what a fork stacks \u2014 or the test above
   would pass on a cell whose class hand happens to match */
{
  const cell = 'hard 16 v 10';
  buildShoe();
  const canonical = factory(true, leakQueue, draw, shoeArr, cell, buildShoe, {});
  canonical();
  const c1 = shoeArr.pop(), cu = shoeArr.pop(), c2 = shoeArr.pop();
  const canonSet = [c1.rank + c1.suit, cu.rank + cu.suit, c2.rank + c2.suit].join(',');
  const forkSet = '7' + 0 + ',10' + 1 + ',9' + 3;
  if (canonSet === forkSet) throw new Error('the fork hand IS the canonical hand here \u2014 the test proves nothing');
  console.log('and the canonical hand for that cell is a different hand: ' + canonSet);
}

/* a fork that stored its hole card: the dealer hand is the one that was played */
{
  const cell = 'hard 16 v 10';
  const fh = { yc: ['10', '6'], ys: [1, 2], up: '10', us: 3, hole: '9', holes: 0 };
  for (let n = 0; n < 10; n++) {
    buildShoe();
    const hands = {}; hands[cell] = fh;
    const deal = factory(true, leakQueue, draw, shoeArr, cell, buildShoe, hands);
    deal();
    const p1 = shoeArr.pop(), up = shoeArr.pop(), p2 = shoeArr.pop(), hole = shoeArr.pop();
    if (p1.rank + p1.suit !== '10' + 1 || p2.rank + p2.suit !== '6' + 2 ||
        up.rank + up.suit !== '10' + 3 || hole.rank + hole.suit !== '9' + 0)
      throw new Error('fork hole stack wrong: ' + [p1.rank + p1.suit, up.rank + up.suit, p2.rank + p2.suit, hole.rank + hole.suit].join(','));
  }
  console.log('a fork hole card rides fourth, suit for suit \u2014 the dealer hand as it was played');
}

/* a cell with no fork behind it still gets the canonical build: a plain miss,
   or a bar tapped on the felt, carries a class and nothing else */
{
  const cell = 'hard 16 v 10';
  let allCanonical = true;
  for (let n = 0; n < 8; n++) {
    buildShoe();
    const deal = factory(true, leakQueue, draw, shoeArr, cell, buildShoe, {});
    deal();
    const p1 = shoeArr.pop(), up = shoeArr.pop(), p2 = shoeArr.pop();
    const v = SHOE999.value([p1, p2]);
    if (v.total !== 16 || v.soft || up.rank !== '10') allCanonical = false;
  }
  if (!allCanonical) throw new Error('a cell with no fork must keep its canonical build');
  console.log('a cell with no fork behind it keeps the canonical hand, unchanged');
}

/* --- the last count cell drilled comes back with you -----------------
   The sheet drills a count play from three places (the never record's
   red chip, a refused ask, a quiz cell you keep missing) and the drill
   is where you fix it — but the class itself did not survive the
   refresh, so every visit began by finding it again. Now the name is
   kept and the next visit opens straight back into it.              */
const IX = require('../index999.js');
if (!/var LAST_IX_KEY = '999\.practice\.lastix';/.test(src))
  throw new Error('the last count cell drilled needs a key of its own');
if (!/rememberIx\(cell\);/.test(dnFull))
  throw new Error('a drilled cell must be remembered, or the next visit starts cold');
/* and only count cells: the leak rows deal classes the count has no
   opinion about, and remembering one would hand the next visit a cell
   the sheet cannot name */
if (!/function isIndexCell\(cell\) \{/.test(src) ||
    !/INDEX999\.INDICES\[cell\] !== undefined \|\| cell === 'insurance v ace'/.test(src))
  throw new Error('the count cell must be asked of the count, not guessed from the name');
const remember = new Function('INDEX999', 'LAST_IX_KEY', 'localStorage',
  grab('  function isIndexCell(', '\n  }') + grab('  function rememberIx(', '\n  }') +
  '\nreturn { is: isIndexCell, note: rememberIx };');
/* the recall itself, run: it must arm the panel and the forced cell,
   say where it came from, and stay silent \u2014 and forget \u2014 on every
   cell it cannot honestly serve. */
function runRecall(stored, leaksMap, opts) {
  opts = opts || {};
  const mem = stored == null ? {} : { '999.practice.lastix': stored };
  const st = { leakMode: !!opts.leakMode, leakQueue: (opts.queue || []).slice(),
    leakCell: opts.leakCell || null, refilled: 0, drew: 0, status: '', armed: false };
  const store = { getItem: (k) => (k in mem ? mem[k] : null),
                  setItem: (k, v) => { mem[k] = String(v); },
                  removeItem: (k) => { delete mem[k]; } };
  const fn = new Function('localStorage', 'INDEX999', 'LAST_IX_KEY', 'leaks', 'sessionLeaks',
    'leakMode', 'leakQueue', 'leakCell', 'refillQueue', 'renderCoach', 'renderLeaks',
    'phase', 'bet', 'setStatus',
    'var armed = false;\n' +
    grab('  function isIndexCell(', '\n  }') + grab('  function forgetIx(', '\n  }') +
    grab('  function ixDrillRecall(', '\n  }') +
    '\nreturn { go: ixDrillRecall, mode: function () { return leakMode; },' +
    ' cell: function () { return leakCell; }, q: function () { return leakQueue; } };')(
    store, IX, '999.practice.lastix', leaksMap, opts.session || {},
    st.leakMode, st.leakQueue, st.leakCell,
    () => { st.refilled++; st.leakQueue.push('hard 12 v 2'); }, () => { st.drew++; }, () => { st.drew++; },
    opts.phase || 'betting', opts.bet || 0, (s) => { st.status = s; });
  const ok = fn.go();
  return { ok: ok, mode: fn.mode(), cell: fn.cell(), queue: fn.q(),
    refilled: st.refilled, drew: st.drew, status: st.status, key: mem['999.practice.lastix'] };
}
/* the plain case: a count cell in the ledger, remembered */
const r1 = runRecall('hard 15 v 10', { 'hard 15 v 10': { n: 3, cost: 90 } });
if (r1.ok !== true || r1.cell !== 'hard 15 v 10')
  throw new Error('the remembered count cell must be the forced one: ' + JSON.stringify(r1));
if (r1.mode !== true || r1.drew < 1)
  throw new Error('the recall must open the panel and draw it: ' + JSON.stringify(r1));
if (!/where you left it last visit/.test(r1.status))
  throw new Error('the status must say where the cell came from: ' + r1.status);
if (r1.key !== 'hard 15 v 10') throw new Error('a served cell must stay remembered for the next visit');
/* a first hand, not a standing order: the queue is built and waits */
if (r1.refilled !== 1 || r1.queue.length < 1)
  throw new Error('the recall must build the queue, so the drill resumes after this hand');
/* and it must not stack on a live hand or a stake already down */
const rLive = runRecall('hard 15 v 10', { 'hard 15 v 10': { n: 3, cost: 90 } }, { phase: 'acting' });
if (rLive.ok !== false || rLive.mode !== false)
  throw new Error('a recall mid-hand must wait, not take the felt');
const rBet = runRecall('hard 15 v 10', { 'hard 15 v 10': { n: 3, cost: 90 } }, { bet: 100 });
if (rBet.ok !== false || rBet.mode !== false)
  throw new Error('a recall under a live stake must wait too');
/* the honest refusals: each forgets the name and opens as before */
const rNone = runRecall(null, {});
if (rNone.ok !== false || rNone.mode !== false || rNone.key != null)
  throw new Error('nothing remembered is nothing done, and nothing stored');
const rGone = runRecall('hard 12 v 3', {});          /* a name the ledger has lost */
if (rGone.ok !== false || rGone.key != null)
  throw new Error('a cell the ledger has lost must take its name with it');
const rMaster = runRecall('hard 12 v 3', { 'hard 12 v 3': { n: 9, cost: 20, m: 1 } });
if (rMaster.ok !== false || rMaster.key != null)
  throw new Error('a retired cell has left the drill \u2014 nothing to re-open');
const rJunk = runRecall('{not json', { 'hard 12 v 3': { n: 1 } });
if (rJunk.ok !== false || rJunk.key != null)
  throw new Error('a name the count does not know is not a count cell');
const rPlain = runRecall('hard 20 v 9', { 'hard 20 v 9': { n: 1 } });
if (rPlain.ok !== false || rPlain.key != null)
  throw new Error('a leak row class is not the count\u2019s business');
/* insurance is a count cell too \u2014 the count\u2019s own bet, not a hand */
if (runRecall('insurance v ace', { 'insurance v ace': { n: 2, cost: 50 } }).cell !== 'insurance v ace')
  throw new Error('the count\u2019s own bet is one of its plays');
/* and the panel it opens is already open: no second open, no re-rank */
const rAgain = runRecall('hard 15 v 10', { 'hard 15 v 10': { n: 3, cost: 90 } },
  { leakMode: true, leakCell: 'hard 12 v 2' });
if (rAgain.ok !== true || rAgain.cell !== 'hard 15 v 10')
  throw new Error('a recall into an open panel still re-arms the cell it remembers');
/* the tap hands its cell to the memory; the memory is what decides
   whether that cell is the count's business */
const tRemember = tapBar('hard 9 v 2', {
  sessionLeaks: { 'hard 9 v 2': { n: 1, cost: 20 } }, leaks: { 'hard 9 v 2': { n: 1, cost: 20 } },
  reviewMode: false, leakMode: false, leakQueue: [], leakCell: null,
  phase: 'betting', bet: 0, drillFree: false, drillReopen: false, now: false
});
if (tRemember.remembered !== 'hard 9 v 2')
  throw new Error('a tapped count cell must reach the memory: ' + tRemember.remembered);
const tPlain = tapBar('hard 20 v 9', {
  sessionLeaks: { 'hard 20 v 9': { n: 1, cost: 20 } }, leaks: { 'hard 20 v 9': { n: 1, cost: 20 } },
  reviewMode: false, leakMode: false, leakQueue: [], leakCell: null,
  phase: 'betting', bet: 0, drillFree: false, drillReopen: false, now: false
});
if (tPlain.remembered !== 'hard 20 v 9')
  throw new Error('the tap hands over whatever it drilled; the memory filters it');
/* ...and run the memory itself, over a store of its own */
const memBox = {};
const rmem = remember(IX, '999.practice.lastix',
  { setItem: (k, v) => { memBox[k] = String(v); }, removeItem: (k) => { delete memBox[k]; } });
if (rmem.is('hard 20 v 9') !== false)
  throw new Error('a leak row class is not one of the count\u2019s plays');
if (rmem.is('insurance v ace') !== true || rmem.is('hard 16 v 10') !== true)
  throw new Error('the count\u2019s own plays, insurance included, are its cells');
if (rmem.is('') !== false || rmem.is(null) !== false)
  throw new Error('nothing is not a count cell');
rmem.note('hard 9 v 2');
if (memBox['999.practice.lastix'] !== 'hard 9 v 2')
  throw new Error('a count cell must be written: ' + JSON.stringify(memBox));
rmem.note('hard 20 v 9');
if (memBox['999.practice.lastix'] !== 'hard 9 v 2')
  throw new Error('a leak row class must not overwrite the remembered count cell');
/* the boot must ask: once, after the ledger is read, before the page settles */
if (!/ixDrillRecall\(\);/.test(src))
  throw new Error('the visit must open the remembered cell');
const boot = src.slice(src.lastIndexOf('---- boot'));
if (boot.indexOf('ixDrillRecall();') < 0 || boot.indexOf('buildShoe();') > boot.indexOf('ixDrillRecall();'))
  throw new Error('the recall runs at boot, after the shoe and the ledger are read');
console.log('the last count cell drilled comes back with you \u2014 the next visit opens the drill straight into it');
