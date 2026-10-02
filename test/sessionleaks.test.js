/* The leaks panel's two ledgers: "this session" ranks the
   sitting's own misses by expected chips lost — reloaded away
   each visit — beside "all time", the ledger the drills serve.
   The ranker and the session capture are the properties under
   test: costliest first, junk dropped, counts and costs
   accumulating per cell, and the wiring that lands every miss
   (hand and insurance) in both ledgers and re-renders on the
   tab clicks. The session tab also reads its ranking against
   the all-time one — \u25B2 marks a class bleeding more per
   miss than its own history — and every session row carries a
   one-tap drill-now hand-off that forces the cell past the
   all-time queue. A class's FIRST miss of the sitting opens
   the panel on the session tab by itself.                     */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
function extract(name, args) {
  const fnFull = grab('  function ' + name + '(', '\n  }');
  const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
  const sig = fnFull.slice(fnFull.indexOf('('), fnFull.indexOf(')') + 1);
  return new Function(args, 'return function ' + name + sig + ' {' + fnBody + '}');
}

/* --- rankCells: costliest first, junk ignored --- */
const rankCells = extract('rankCells', '')();
if (rankCells({}).length !== 0) throw new Error('an empty map ranks empty');
if (rankCells(null).length !== 0) throw new Error('a null map ranks empty');
const junk = rankCells({ 'hard 16 v 10': { n: 1, cost: 25 }, 'bad': { cost: 5 }, 'dead': null });
if (junk.length !== 1 || junk[0].cell !== 'hard 16 v 10') throw new Error('malformed entries must be dropped');
const ranked = rankCells({
  'hard 12 v 2': { n: 1, cost: 10 },
  'soft 13 v Q': { n: 3, cost: 30.15 },
  'hard 16 v 10': { n: 2, cost: 50 }
});
if (ranked.map(c => c.cell).join('|') !== 'hard 16 v 10|soft 13 v Q|hard 12 v 2')
  throw new Error('costliest first: ' + JSON.stringify(ranked));
console.log('rankCells: costliest first, junk dropped \u2014 16 v 10 (\u221250) over 13 v Q (\u221230) over 12 v 2 (\u221210)');

/* --- sessionMiss: the sitting's own accumulator, and it says
       when a class is NEW (the panel auto-opens on that) --- */
const sessionLeaks = {};
const sessionMiss = extract('sessionMiss', 'sessionLeaks')(sessionLeaks);
if (sessionMiss('hard 16 v 10', 25) !== true) throw new Error('a first miss must read as a new class');
if (sessionMiss('hard 16 v 10', 25.5) !== false) throw new Error('a repeat miss is not new');
if (sessionMiss('hard 12 v 2', 2.6) !== true) throw new Error('a different cell is new again');
if (sessionLeaks['hard 16 v 10'].n !== 2 || Math.abs(sessionLeaks['hard 16 v 10'].cost - 50.5) > 1e-9)
  throw new Error('per-cell accumulation: ' + JSON.stringify(sessionLeaks));
if (sessionLeaks['hard 12 v 2'].n !== 1) throw new Error('cells stay isolated');
const r2 = rankCells(sessionLeaks);
if (r2[0].cell !== 'hard 16 v 10' || r2[0].n !== 2) throw new Error('the session map ranks');
console.log('sessionMiss: \u00d72 \u221250.5 in one cell, \u00d71 \u22122.6 in another \u2014 reloaded away each visit');
console.log('sessionMiss: a class\u2019s first miss reads as new \u2014 the panel opens on it');

/* --- leakAutoOpen: a first-of-its-class miss opens the panel --- */
const aGrab = grab('  function leakAutoOpen(', '\n  }');
function autoRun(o) {
  const said = [];
  const marks = { renders: 0, coach: 0, refills: 0 };
  const leakQueue = o.queue || [];
  const peek = new Function('reviewMode', 'leakMode', 'leakView', 'leakQueue', 'phase', 'bet',
    'renderCoach', 'renderLeaks', 'refillQueue', 'setStatus',
    aGrab + '\nreturn function () { leakAutoOpen();' +
      ' return { mode: leakMode, view: leakView, review: reviewMode }; };')(
    !!o.review, !!o.leakMode, o.view || 'session', leakQueue,
    o.phase || 'acting', o.bet == null ? 1 : o.bet,
    function () { marks.coach++; },
    function () { marks.renders++; },
    function () { marks.refills++; leakQueue.push('refilled-from-all-time'); },
    function (s) { said.push(s); });
  const out = peek();
  return { out: out, said: said, marks: marks, queue: leakQueue };
}

let a = autoRun({ phase: 'betting', bet: 0 });
if (!a.out.mode || a.out.view !== 'session' || a.out.review)
  throw new Error('a brand-new class must open the panel on the session tab: ' + JSON.stringify(a.out));
if (a.marks.refills !== 1) throw new Error('the auto-open must arm the all-time queue');
if (a.said.length !== 1 || !/Leak drilling/.test(a.said[0]))
  throw new Error('the auto-open must announce itself between hands: ' + JSON.stringify(a.said));
console.log('leakAutoOpen: a new class opens the panel \u2014 session tab, drill armed, announced');

a = autoRun({ phase: 'acting' });
if (!a.out.mode || a.out.view !== 'session') throw new Error('a mid-hand first must still open the panel');
if (a.said.length) throw new Error('mid-hand the status is the hand\u2019s \u2014 no clobbering');
console.log('leakAutoOpen: mid-hand it opens silently, the hand\u2019s status stands');

a = autoRun({ leakMode: true, view: 'all' });
if (a.out.view !== 'session' || !a.out.mode) throw new Error('an open panel must swing to the session tab');
if (a.marks.renders !== 1) throw new Error('the swing must re-rank');
if (a.marks.refills) throw new Error('an open panel needs no re-arming');
console.log('leakAutoOpen: an open panel swings to the session ranking and re-ranks');

a = autoRun({ leakMode: true, view: 'session' });
if (a.marks.renders !== 1 || a.said.length)
  throw new Error('already on the session tab: just re-rank, quietly');
console.log('leakAutoOpen: already on the session tab \u2014 a fresh rank, no fuss');

a = autoRun({ review: true });
if (!a.out.review || a.out.mode) throw new Error('a replay owns the box \u2014 the reel must not be yanked');
if (a.marks.renders || a.said.length) throw new Error('review mode: the auto-open stands down entirely');
console.log('leakAutoOpen: review mode keeps its reel');

/* --- wiring: every miss lands twice, the tabs re-render --- */
const verdict = grab('  function coachVerdict(choice) {', 'var entry = {');
if (!verdict.includes('sessionMiss(lastCell, cost)')) throw new Error('a hand miss must land in the session ledger');
const ins = grab("gradClean('insurance v ace')", 'replay.push({');
if (!ins.includes("sessionMiss('insurance v ace', cost)"))
  throw new Error('an insurance miss must land in the session ledger too');
if (!/var cells = leakView === 'session' \? rankCells\(sessionLeaks\) : allCells;/.test(src))
  throw new Error('the panel must switch its rows by tab');
if (!/var leakView = 'session';/.test(src)) throw new Error('this session is the default tab');
if (!/id="leakViewSession"/.test(src) || !/id="leakViewAll"/.test(src))
  throw new Error('the panel must show both tabs');
if (!/leakView = 'session'; renderLeaks\(\)/.test(src) || !/leakView = 'all'; renderLeaks\(\)/.test(src))
  throw new Error('the tab clicks must set the view and re-render');
if (!/This sitting: \\u2212' \+ Math\.round\(sessCost\)/.test(src))
  throw new Error('the session tab must total the sitting');
if (!/A clean sitting so far \\u2014 nothing leaked this session\./.test(src))
  throw new Error('a clean sitting must say so');
if (!/\.viewtabs span\.on \{ color: #d8b56a;/.test(src)) throw new Error('the live tab reads gold');
if (!/if \(!leakMode \|\| !allCells\.length\)/.test(src))
  throw new Error('the drill\u2019s gate stays on the all-time ledger');
console.log('wiring: both ledgers fed at every miss, the tabs re-render, the drill keeps its all-time queue');

/* --- worseThanHistory: louder is not worse — the average is --- */
const worseThanHistory = extract('worseThanHistory', '')();
if (worseThanHistory('hard 16 v 10', null, { n: 4, cost: 40 }) !== null)
  throw new Error('no session record: nothing to compare');
if (worseThanHistory('hard 16 v 10', { n: 2, cost: 51 }, null) !== null)
  throw new Error('no history: a first sitting cannot be worse than it');
if (worseThanHistory('hard 16 v 10', { n: 0, cost: 5 }, { n: 4, cost: 40 }) !== null)
  throw new Error('a clean streak on the cell compares as nothing');
const worse = worseThanHistory('hard 16 v 10', { n: 2, cost: 51 }, { n: 4, cost: 40 });
if (!worse || Math.abs(worse.sAvg - 25.5) > 1e-9 || Math.abs(worse.hAvg - 10) > 1e-9 || Math.abs(worse.x - 2.55) > 1e-9)
  throw new Error('the verdict must carry both averages and the ratio: ' + JSON.stringify(worse));
if (worseThanHistory('hard 12 v 2', { n: 2, cost: 8 }, { n: 4, cost: 40 }) !== null)
  throw new Error('a better sitting is not flagged');
if (worseThanHistory('hard 12 v 2', { n: 4, cost: 40 }, { n: 2, cost: 20 }) !== null)
  throw new Error('equal averages are not worse');
console.log('worseThanHistory: \u221225.5 a miss v \u221210 all time flags; matching or better stays quiet');

/* --- worseFlag: the \u25B2 line, read from the two ledgers --- */
const worseFlag = new Function('sessionLeaks', 'leaks', 'worseThanHistory',
  grab('  function worseFlag(', '\n  }') + '\nreturn worseFlag;')(
  { 'hard 16 v 10': { n: 2, cost: 51 }, 'hard 12 v 2': { n: 1, cost: 3 } },
  { 'hard 16 v 10': { n: 4, cost: 40 }, 'hard 12 v 2': { n: 6, cost: 36 } },
  worseThanHistory);
const flagged = worseFlag('hard 16 v 10');
if (!flagged || flagged.indexOf('\u25B2') < 0 || !/26 a miss v 10 all time/.test(flagged))
  throw new Error('a drifting class must wear \u25B2 with both averages: ' + flagged);
if (worseFlag('hard 12 v 2') !== '') throw new Error('an honest class stays unflagged');
if (worseFlag('soft 13 v Q') !== '') throw new Error('an unmissed cell is unflagged');
console.log('worseFlag: \u25B226 a miss v 10 all time rides the drifter, quiet cells stay clean');

/* --- drillNow: the tap hands the cell to the shoe --- */
const dGrab = grab('  function drillNow(', '\n  }');
function drillRun(o) {
  const said = [];
  const leakQueue = o.queue ? o.queue.slice() : [];
  const leaksMap = o.leaks ? JSON.parse(JSON.stringify(o.leaks)) : {};
  const sessionMap = o.session || { 'hard 16 v 10': { n: 2, cost: 51 } };
  const saved = { v: false };
  const peek = new Function('reviewMode', 'reviewIdx', 'leakMode', 'leakQueue', 'leaks', 'leakCell',
    'renderCoach', 'renderLeaks', 'phase', 'bet', 'setStatus', 'sessionLeaks', 'saveLeaks', 'refillQueue',
    dGrab + '\nreturn function (cell) { drillNow(cell);' +
      ' return { mode: leakMode, cell: leakCell, review: reviewMode }; };')(
    !!o.review, 0, !!o.leakMode, leakQueue, leaksMap, o.leakCell || null,
    function () {}, function () {}, o.phase || 'betting', o.bet || 0,
    function (s) { said.push(s); }, sessionMap,
    function () { saved.v = true; },
    function () { leakQueue.push('refilled-from-all-time'); });
  const out = peek(o.cell);
  return { out: out, said: said, queue: leakQueue, leaks: leaksMap, saved: saved.v };
}

let d = drillRun({ cell: 'hard 16 v 10' });
if (!d.out.mode) throw new Error('the tap must switch leak mode on');
if (d.out.cell !== 'hard 16 v 10') throw new Error('the tap must force the tapped cell');
if (d.said.length !== 1 || !/hard 16 v 10/.test(d.said[0]) || !/place any bet, the shoe stacks it/.test(d.said[0]))
  throw new Error('the hand-off must be announced: ' + JSON.stringify(d.said));
if (d.queue.join('|') !== 'refilled-from-all-time')
  throw new Error('a cold start must refill the queue before the tap takes over');
console.log('drillNow: the tap turns the drill on, names the cell, stacks it on the next bet');

d = drillRun({ cell: 'hard 16 v 10', leakMode: true, queue: ['soft 13 v Q'], phase: 'acting' });
if (d.out.cell !== 'hard 16 v 10') throw new Error('the forced cell wins even mid-drill');
if (d.queue.join('|') !== 'soft 13 v Q')
  throw new Error('the all-time queue must wait untouched \u2014 bypass, not clobber');
if (!/the next hand stacks it/.test(d.said[0]))
  throw new Error('mid-hand the drill waits for the next deal: ' + JSON.stringify(d.said));
console.log('drillNow: the all-time queue keeps its order \u2014 the forced cell just cuts in line');

d = drillRun({ cell: 'hard 16 v 10', leakMode: true, review: true,
  leaks: { 'hard 16 v 10': { n: 2, cost: 50, r: 1, back: 26, g: 1, s: 0 } },
  session: { 'hard 16 v 10': { n: 1, cost: 25 } } });
if (d.out.review) throw new Error('one mode at a time \u2014 review stands down');
if (d.leaks['hard 16 v 10'].r || d.leaks['hard 16 v 10'].back)
  throw new Error('a graduate tapped by name must wake at once');
if (!d.saved) throw new Error('the wake must persist');
console.log('drillNow: a retired cell tapped by name wakes and persists');

d = drillRun({ cell: 'soft 13 v Q' });
if (d.out.mode || d.out.cell !== null)
  throw new Error('a cell the sitting never missed must be refused');
console.log('drillNow: unknown cells are refused \u2014 only this sitting\u2019s misses are drillable');

/* --- wiring: rows carry the flag, session rows carry the tap --- */
if (!/worseFlag\(c\.cell\)/.test(src))
  throw new Error('both tabs must read each row against the cell\u2019s history');
if (!/leakView === 'session' && !c\.m \? ' <span class="drilltap"/.test(src))
  throw new Error('the tap must ride the session tab\u2019s rows only, and never a mastered row');
if (!/e\.target\.classList\.contains\('drilltap'\)/.test(src) ||
    !/drillNow\(e\.target\.getAttribute\('data-cell'\)\)/.test(src))
  throw new Error('the panel clicks must route the tap to drillNow');
if (!/leakCell = cell;[^\n]*the queue keeps its order/.test(src))
  throw new Error('the tap must force leakCell, leaving the all-time queue\u2019s order alone');
if (!/if \(e && e\.r\) \{ e\.r = 0; e\.back = 0; e\.s = 0; saveLeaks\(\); \}/.test(src))
  throw new Error('a graduate tapped by name must be woken and persisted');
if (!/\\u25B2 = bleeding more per miss than its own history/.test(src))
  throw new Error('the session tab must explain the \u25B2');
if (!/tap a row to drill it now \\u2014 the all-time queue waits\./.test(src))
  throw new Error('the footer must name the hand-off');
console.log('wiring: rows flag drift, session rows tap to drill, the footer explains both');

/* --- the pill's graduation roster: honours beside the drill --- */
if (!/var roster = weakestCells\(\), gradN = 0, drillN = 0, masterN = 0, ri;/.test(src))
  throw new Error('renderCoach must read the roster once, for the pill and the pill visibility');
if (!/\(roster\[ri\]\.m \? masterN\+\+ : roster\[ri\]\.r \? gradN\+\+ : drillN\+\+\);/.test(src))
  throw new Error('the crowds must be counted by their retirement flag');
if (!/\(masterN \? '\\uD83C\\uDFC5' \+ masterN \+ ' \\u00b7 ' : ''\) \+/.test(src) ||
    !/\(gradN \? '\\uD83C\\uDF93' \+ gradN \+ ' \\u00b7 ' : ''\) \+ drillN \+ ' drilling';/.test(src))
  throw new Error('the pill must carry the crowds \u2014 gold first, honours beside, drills last');
if (!/lb\.hidden = coachOn && !roster\.length;/.test(src))
  throw new Error('the pill visibility must read the same roster, not a second walk');
console.log('the pill roster: \u{1F393}N honours beside N still drilling \u2014 one walk, both crowds');

/* --- wiring: a class's first miss opens the panel by itself --- */
if (!/var fresh = !sessionLeaks\[cell\];/.test(src) || !/return fresh;/.test(src))
  throw new Error('sessionMiss must report a class\u2019s first appearance');
if (!/if \(sessionMiss\(lastCell, cost\)\) leakAutoOpen\(\);/.test(src))
  throw new Error('a first-of-its-class hand miss must open the panel');
if (!/if \(sessionMiss\('insurance v ace', cost\)\) leakAutoOpen\(\);/.test(src))
  throw new Error('a first insurance miss must open the panel too');
if (!/if \(reviewMode\) return;/.test(grab('  function leakAutoOpen(', '\n  }')))
  throw new Error('the auto-open must stand down while the replay reel owns the box');
console.log('wiring: a class\u2019s first miss \u2014 hand or insurance \u2014 opens the panel on its own');

console.log('\nsession leaks verified');
