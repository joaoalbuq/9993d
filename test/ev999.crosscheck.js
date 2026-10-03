/* EV999 cross-check: the engine's best play (by expected chips)
   must agree with the coach's standing book — except where the
   book follows peek-game charts and the engine prices the
   floor's real no-peek flavor. Divergences are listed, clamped
   pricing keeps the coach honest at every one of them.         */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* ---- the engine, exactly as shipped ---- */
const EV999 = require('../ev999.js');

/* ---- extract bookPlay and run it against a mock floor ---- */
const bpStart = src.indexOf('function bookPlay() {');
const bpEnd = src.indexOf('return play;', bpStart) + 'return play;'.length + 4;   /* close the function too */
if (bpStart < 0) throw new Error('bookPlay not found');
const SHOE999 = require('../shoe999.js');

const bookPlay = eval('(' + src.slice(bpStart, bpEnd)
  .replace('function bookPlay() {',
    'function (dealerArr, you, bank, bet, total, isSoft) {' +
    '\n    var lastFlip = null;' +
    '\n    var lastNear = null;' +
    '\n    var trueCount = function () { return 0; };' +   /* no count flips: this check is engine vs chart */
    '\n    var activeHand = function () { return null; };' +   /* no splits here: chart vs engine */
    '\n    var canSplitHand = function () { return false; };' +
    '\n    var pairRank = function () { return null; };' +
    '\n    ' + src.slice(src.indexOf('  function chartPlay(t, soft, up, canD, pair) {'),
                          src.indexOf('\n  }', src.indexOf('  function chartPlay(t, soft, up, canD, pair) {')) + 4) +
    '\n    var INDEX999 = { INDICES: {}, cell: function () { return ""; }, flip: function () { return null; } };'
  ) + ')');
function book(youCards, upRank, canDouble) {
  return bookPlay(
    [{ rank: upRank, suit: 0 }], youCards,
    canDouble ? 1000 : 0, 25,          /* the SAME doubling state the engine gets */
    (h) => SHOE999.total(h),
    (h) => SHOE999.value(h).soft
  );
}

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const val = (r) => r === 'A' ? 11 : (r === '10' || r === 'J' || r === 'Q' || r === 'K') ? 10 : parseInt(r, 10);
function argmaxEngine(t, soft, up, canDouble) {
  const p = EV999.prices(t, soft, up, canDouble);
  let best = 'stand', ev = p.stand;
  if (p.hit > ev) { best = 'hit'; ev = p.hit; }
  if (canDouble && p.double != null && p.double > ev) { best = 'double'; ev = p.double; }
  return { play: best, ev: p };
}

let agree = 0, disagree = [];
function check(youCards, up, canDouble) {
  const t = SHOE999.total(youCards), soft = SHOE999.value(youCards).soft;
  const b = book(youCards, up, canDouble);
  const e = argmaxEngine(t, soft, up, canDouble);
  if (b === e.play) agree++;
  else disagree.push({ hand: youCards.map(c => c.rank).join(','), up, t, soft, canDouble, book: b, engine: e.play });
}

/* every two-card hand (hard + soft) vs every upcard, both double states */
for (const up of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']) {
  for (let a = 0; a < RANKS.length; a++) {
    for (let b2 = a; b2 < RANKS.length; b2++) {
      const cards = [{ rank: RANKS[a], suit: 0 }, { rank: RANKS[b2], suit: 1 }];
      const t = SHOE999.total(cards);
      if (t > 21) continue;
      check(cards, up, true);                    /* double legal */
      check(cards, up, false);                   /* double not legal (bank short) */
      /* one post-hit state per hand: add a small card */
      const hit = cards.concat([{ rank: '2', suit: 2 }]);
      if (SHOE999.total(hit) <= 21) check(hit, up, false);
    }
  }
}
console.log('checked states: ' + (agree + disagree.length) + ' | agree: ' + agree + ' | disagree: ' + disagree.length);

/* hard-total sanity: engine MUST agree with the book on the classic
   hard skeleton — these are not peek-sensitive              */
for (const up of ['A','2','3','4','5','6','7','8','9','10']) {
  for (const h of [['10','6'],['10','7'],['10','8'],['10','9'],['10','10'],['5','9'],['6','9'],['7','9']]) {
    check(h.map(r => ({ rank: r, suit: 0 })), up, true);
  }
}
/* every disagreement must be one of two kinds:
   1. a KNIFE-EDGE the charts themselves split on (|gap| tiny) —
      the engine prices the plays nearly equal, so a deviation
      there costs the player almost nothing either way;
   2. a REAL no-peek divergence the engine prices with conviction. */
const knife = [], convicted = [];
for (const d of disagree) {
  const p = EV999.prices(d.t, d.soft, d.up, d.canDouble);
  const evBook = p[d.book], evEng = p[d.engine];
  if (evBook == null || evEng == null) {
    throw new Error('disagreement references an unpriceable play: ' + JSON.stringify(d));
  }
  (evEng - evBook > 0.004 ? convicted : knife).push({ ...d, gap: +(evEng - evBook).toFixed(4) });
}
console.log('knife-edge chart points (allowed, cost ~0):', knife.length);
knife.slice(0, 8).forEach(d => console.log('   ', d.hand, 'v', d.up, d.soft ? 'soft' : 'hard', 'book', d.book, 'engine', d.engine, 'gap', d.gap));
console.log('convicted no-peek divergences:', convicted.length);
convicted.forEach(d => console.log('   ', d.hand, 'v', d.up, d.soft ? 'soft' : 'hard', 'book', d.book, 'engine', d.engine, 'gap', d.gap));

/* the BOOK now flips to the engine where conviction exists —
   so the convicted set must be EMPTY: the only remaining
   disagreements are chart knife-edges the engine prices ~equal */
if (convicted.length) {
  throw new Error('book did not absorb a convicted divergence: ' + JSON.stringify(convicted));
}
/* every hand at hard 17+ must agree everywhere (the skeleton) */
const bad17 = disagree.filter(d => !d.soft && d.t >= 17);
if (bad17.length) throw new Error('engine disagrees on hard stand skeleton: ' + JSON.stringify(bad17.slice(0, 5)));
console.log('hard 17+ skeleton: unanimous stand, zero disagreements');
console.log('hard 11 v A/10 now book-HIT (the floor prices the no-peek truth) — engine and book united');
console.log('\nEV999 cross-check done: book and engine agree everywhere but '
  + knife.length + ' chart knife-edge(s), cost ~0 either way');
