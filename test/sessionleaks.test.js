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
   the panel on the session tab by itself. The all-time rows
   also badge each cell's felt share — how many of its misses
   crossed over from the live table.                         */
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
  const state = { roundNo: o.round == null ? 100 : o.round,
                  leakOpenRound: o.opened == null ? -6 : o.opened, leakHeld: 0 };
  const peek = new Function('reviewMode', 'leakMode', 'leakView', 'leakQueue', 'phase', 'bet',
    'roundNo', 'leakOpenRound', 'leakUnseen', 'LEAK_OPEN_EVERY',
    'renderCoach', 'renderLeaks', 'refillQueue', 'setStatus',
    'function leakOpenReady() { return roundNo - leakOpenRound >= LEAK_OPEN_EVERY; }' +
    aGrab + '\nreturn function () { leakAutoOpen();' +
      ' return { mode: leakMode, view: leakView, review: reviewMode, held: leakUnseen }; };')(
    !!o.review, !!o.leakMode, o.view || 'session', leakQueue,
    o.phase || 'acting', o.bet == null ? 1 : o.bet,
    state.roundNo, state.leakOpenRound, state.leakHeld, 6,
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

/* --- the ration: a streak of new classes must not nag --- */if (!/var LEAK_OPEN_EVERY = 6;/.test(src) || !/function leakOpenReady\(\)/.test(src))
  throw new Error('the auto-open must be rationed by a named interval');
if (!/roundNo - leakOpenRound >= LEAK_OPEN_EVERY/.test(src))
  throw new Error('the ration must run on the round clock, which ticks whatever the panel does');
if (!/if \(!leakMode\) leakUnseen\+\+;/.test(src))
  throw new Error('a class found with the panel shut is unseen, ration or not');
if (!/if \(!leakOpenReady\(\)\) \{ renderCoach\(\); return; \}/.test(src))
  throw new Error('a rationed open must be held and badged, not dropped');
if (!/if \(!leakQueue\.length\) refillQueue\(\);  \/\* the drill arms whatever the panel does \*\//.test(src))
  throw new Error('the cap must never suppress the work \u2014 only the telling');
if (!/function leakBadge\(\)/.test(src) ||
    !/' \\u00b7 ' \+ leakUnseen \+ ' new'/.test(src))
  throw new Error('the pill must badge the classes it has not shown');
if (!/'\\uD83E\\uDE79 Leaks' \+ leakBadge\(\)/.test(src))
  throw new Error('the shut pill must carry the badge');
if (!/lb\.hidden = coachOn && !roster\.length && !leakUnseen;/.test(src))
  throw new Error('a badge must keep the button reachable over an empty ledger');
if (!/lb\.classList\.toggle\('new', !leakMode && leakUnseen > 0\)/.test(src))
  throw new Error('the button must read gold while something waits');
if (!/#btnLeaks\.new \{ color: #d8b56a;/.test(src))
  throw new Error('the badge must wear the house gold');
{
  /* the first opening is always free */
  let f = autoRun({ round: 0, opened: -6, phase: 'betting', bet: 0 });
  if (!f.out.mode) throw new Error('the first new class must still open the panel');
  /* six hands later it may open again */
  f = autoRun({ round: 6, opened: 0, phase: 'betting', bet: 0 });
  if (!f.out.mode) throw new Error('the ration must expire on its own: ' + JSON.stringify(f.out));
  /* inside it, a fresh class is silent \u2014 but badged, and the drill still arms */
  f = autoRun({ round: 3, opened: 0, phase: 'betting', bet: 0 });
  if (f.out.mode) throw new Error('three hands into a cooldown must not open the panel');
  if (f.said.length) throw new Error('a held open must say nothing at all: ' + JSON.stringify(f.said));
  if (f.out.held !== 1) throw new Error('a held open must be counted: ' + JSON.stringify(f.out));
  if (f.marks.refills !== 1) throw new Error('the drill must arm even while the panel is held shut');
  if (f.marks.renders) throw new Error('a held open must not redraw the panel');
  if (!f.marks.coach) throw new Error('but it must refresh the pill so the badge shows');
  /* the review reel owns the box but cannot swallow the badge */
  f = autoRun({ review: true, round: 3, opened: 0 });
  if (f.out.mode) throw new Error('a replay still must not open the panel');
  if (f.out.held !== 1) throw new Error('but the class it found is still unseen: ' + JSON.stringify(f.out));
  /* a streak accumulates rather than repeating */
  f = autoRun({ round: 4, opened: 0, phase: 'betting', bet: 0 });
  if (f.out.held !== 1) throw new Error('each held class counts once: ' + JSON.stringify(f.out));
  /* the badge's own strings */
  if (extract('leakBadge', 'leakUnseen')(1)() !== ' \u00b7 1 new')
    throw new Error('the badge counts in plain: ' + JSON.stringify(extract('leakBadge', 'leakUnseen')(1)()));
  if (extract('leakBadge', 'leakUnseen')(4)() !== ' \u00b7 4 new')
    throw new Error('a streak reads as a streak: ' + JSON.stringify(extract('leakBadge', 'leakUnseen')(4)()));
  if (extract('leakBadge', 'leakUnseen')(0)() !== '')
    throw new Error('nothing unseen, nothing badged');
  /* and the count is named, not lost */
  const held1 = extract('leakUnseenLine', 'leakUnseen')(1);
  if (held1() !== ' \u00b7 1 more class found while this was shut \u2014 the drill has them all')
    throw new Error('the held clause names itself: ' + JSON.stringify(held1()));
  const held3 = extract('leakUnseenLine', 'leakUnseen')(3);
  if (!/3 more classes found while this was shut/.test(held3()))
    throw new Error('a streak reads as a streak: ' + JSON.stringify(held3()));
  if (extract('leakUnseenLine', 'leakUnseen')(0)() !== '')
    throw new Error('nothing held, nothing said');
  if (!/var heldHtml = leakUnseenLine\(\);/.test(src) ||
      !/if \(leakUnseen\) \{ leakUnseen = 0; renderCoach\(\); \}/.test(src))
    throw new Error('the panel must spend the badge once it has said it');
  if (!/heldHtml \+\n      \(leakView === 'session'/.test(src))
    throw new Error('the panel footer must name what it held back');
  if (/if \(leakMode\) leakHeld = 0;/.test(src))
    throw new Error('the count must not be spent before the footer can read it');
}
console.log('the ration: a new class opens it, then one class every six hands \u2014 silent, badged, never lost');

/* --- wiring: every miss lands twice, the tabs re-render --- */
const verdict = grab('  function coachVerdict(choice) {', 'var entry = {');
if (!verdict.includes('leakMiss(lastCell, cost)')) throw new Error('a hand miss must land in the session ledger');
if (!/function leakMiss\(cell, cost\) \{[\s\S]{0,700}return sessionMiss\(cell, cost\);/.test(src))
  throw new Error('the ledger write must be one shared path the quiz can reach too');
const ins = grab("gradClean('insurance v ace')", 'replay.push({');
if (!ins.includes("leakMiss('insurance v ace', cost)"))
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
  throw new Error('a cell in neither ledger must be refused');
console.log('drillNow: a cell in neither ledger is refused \u2014 this sitting\u2019s misses are drillable');

d = drillRun({ cell: 'hard 16 v 10', session: {}, leaks: { 'hard 16 v 10': { n: 3, cost: 30 } } });
if (!d.out.mode || d.out.cell !== 'hard 16 v 10')
  throw new Error('a ledger cell the scorecard names \u2014 a felt hand-off \u2014 must be drillable');
console.log('drillNow: the scorecard\u2019s cells drill \u2014 the ledger\u2019s own, not only this sitting\u2019s');

/* --- wiring: rows carry the flag, session rows carry the tap --- */
if (!/worseFlag\(c\.cell\)/.test(src))
  throw new Error('both tabs must read each row against the cell\u2019s history');
if (!/var from = c\.t \? ' \\u00b7 \\uD83C\\uDFB0 '/.test(src) || !/st \+ from \+ worseFlag\(c\.cell\)/.test(src))
  throw new Error('the all-time rows must badge the felt\u2019s share of a cell\u2019s toll');
if (!/leakView === 'session' && !c\.m \? ' <span class="drilltap"/.test(src))
  throw new Error('the tap must ride the session tab\u2019s rows only, and never a mastered row');
if (!/e\.target\.classList\.contains\('drilltap'\)/.test(src) ||
    !/drillNow\(e\.target\.getAttribute\('data-cell'\)\)/.test(src))
  throw new Error('the panel clicks must route the tap to drillNow');
if (!/leakCell = cell;[^\n]*the queue keeps its order/.test(src))
  throw new Error('the tap must force leakCell, leaving the all-time queue\u2019s order alone');
if (!/if \(!cell \|\| !\(sessionLeaks\[cell\] \|\| leaks\[cell\]\)\) return;/.test(src))
  throw new Error('drill-now must accept the ledger\u2019s own cells as well as this sitting\u2019s');
if (!/if \(e && e\.r\) \{ e\.r = 0; e\.back = 0; e\.s = 0; saveLeaks\(\); \}/.test(src))
  throw new Error('a graduate tapped by name must be woken and persisted');
if (!/\\u25B2 = bleeding more per miss than its own history/.test(src))
  throw new Error('the session tab must explain the \u25B2');
if (!/tap a row to drill it now \\u2014 the all-time queue waits\./.test(src))
  throw new Error('the footer must name the hand-off');
console.log('wiring: rows flag drift and badge the felt\u2019s share, session rows tap to drill, the footer explains both');

/* --- the rows carry the week over week, in chips, tinted --- */
if (!/function weekSplit\(cell, now\) \{/.test(src) ||
    !/return \{ now: l, was: was, dir: l < was \? -1 : l > was \? 1 : 0 \};/.test(src))
  throw new Error('the panel must weigh each cell\u2019s this week against last');
if (!/var wk = weekSplit\(c\.cell\);/.test(src) ||
    !/class="wk ' \+ \(wk\.dir < 0 \? 'down' : wk\.dir > 0 \? 'up' : 'flat'\)/.test(src))
  throw new Error('a row must carry its weekly chips, tinted');
if (!/Math\.round\(wk\.now\) \+ ' v ' \+ Math\.round\(wk\.was\)/.test(src))
  throw new Error('the row must name the chips this week versus last');
if (!/\.leaks \.wk\.down \{ color: #43c98a; \}/.test(src) ||
    !/\.leaks \.wk\.up \{ color: #e2705f; \}/.test(src))
  throw new Error('the weekly row must tint green improving, red worsening');
console.log('the panel rows carry the week over week in chips \u2014 \u25BC green, \u25B2 red, \u00b7 flat');

/* --- the pill's graduation roster: honours beside the drill --- */
if (!/var roster = weakestCells\(\), gradN = 0, drillN = 0, masterN = 0, ri;/.test(src))
  throw new Error('renderCoach must read the roster once, for the pill and the pill visibility');
if (!/\(roster\[ri\]\.m \? masterN\+\+ : roster\[ri\]\.r \? gradN\+\+ : drillN\+\+\);/.test(src))
  throw new Error('the crowds must be counted by their retirement flag');
if (!/\(masterN \? '\\uD83C\\uDFC5' \+ masterN \+ ' \\u00b7 ' : ''\) \+/.test(src) ||
    !/\(gradN \? '\\uD83C\\uDF93' \+ gradN \+ ' \\u00b7 ' : ''\) \+ drillN \+ ' drilling';/.test(src))
  throw new Error('the pill must carry the crowds \u2014 gold first, honours beside, drills last');
if (!/lb\.hidden = coachOn && !roster\.length && !leakUnseen;/.test(src))
  throw new Error('the pill visibility must read the same roster, not a second walk');
console.log('the pill roster: \u{1F393}N honours beside N still drilling \u2014 one walk, both crowds');

/* --- wiring: a class's first miss opens the panel by itself --- */
if (!/var fresh = !sessionLeaks\[cell\];/.test(src) || !/return fresh;/.test(src))
  throw new Error('sessionMiss must report a class\u2019s first appearance');
if (!/if \(leakMiss\(lastCell, cost\)\) leakAutoOpen\(\);/.test(src))
  throw new Error('a first-of-its-class hand miss must open the panel');
if (!/if \(leakMiss\('insurance v ace', cost\)\) leakAutoOpen\(\);/.test(src))
  throw new Error('a first insurance miss must open the panel too');
if (!/leaks\[cell\]\.d = gradClock;/.test(src))
  throw new Error('the drill clock must stamp every cell that lands in the ledger');
if (!/if \(reviewMode\) \{ renderCoach\(\); return; \}/.test(grab('  function leakAutoOpen(', '\n  }')))
  throw new Error('the auto-open must stand down while the replay reel owns the box');
console.log('wiring: a class\u2019s first miss \u2014 hand or insurance \u2014 opens the panel on its own');

/* --- the queue follows THIS week's leaks: a cell's pull is
       its toll decayed by age AND by the drill hands served
       since its last stamp, and capped, so a month-old blow \u2014
       or a heavily drilled one \u2014 cannot hog the drill forever --- */
if (!/var LEAK_CAP = 100, LEAK_DRILL_HALF = 250;/.test(src) ||
    !/var LEAK_HALF_DEFAULT = 7 \* 24 \* 60 \* 60 \* 1000;/.test(src))
  throw new Error('the cap, the drill decay and the default age window must be named constants');
const HALF = 7 * 24 * 60 * 60 * 1000, CAP = 100, DRILL_HALF = 250;
const leakWeight = extract('leakWeight', 'LEAK_HALF, LEAK_CAP, LEAK_DRILL_HALF')(HALF, CAP, DRILL_HALF);
const now = 1700000000000, DRILLS = 5000;
if (leakWeight(null, now, DRILLS) !== 0 || leakWeight({ n: 0, cost: 50 }, now, DRILLS) !== 0)
  throw new Error('a cell with no misses pulls nothing');
if (leakWeight({ n: 1, cost: 40, ts: now }, now, DRILLS) !== 40)
  throw new Error('a fresh, undrilled miss weighs its face value');
if (Math.abs(leakWeight({ n: 1, cost: 40, ts: now - HALF }, now, DRILLS) - 20) > 1e-9)
  throw new Error('a week old halves the pull');
if (Math.abs(leakWeight({ n: 1, cost: 64, ts: now - 4 * HALF }, now, DRILLS) - 4) > 1e-9)
  throw new Error('a month old is a sixteenth: ' + leakWeight({ n: 1, cost: 64, ts: now - 4 * HALF }, now, DRILLS));
if (Math.abs(leakWeight({ n: 1, cost: 40, ts: now, d: DRILLS - DRILL_HALF }, now, DRILLS) - 20) > 1e-9)
  throw new Error('a full LEAK_DRILL_HALF hands served halves the pull too');
if (Math.abs(leakWeight({ n: 1, cost: 40, ts: now, d: DRILLS - 2 * DRILL_HALF }, now, DRILLS) - 10) > 1e-9)
  throw new Error('two drill half-lives quarter it: ' + leakWeight({ n: 1, cost: 40, ts: now, d: DRILLS - 2 * DRILL_HALF }, now, DRILLS));
if (Math.abs(leakWeight({ n: 1, cost: 64, ts: now - HALF, d: DRILLS - DRILL_HALF }, now, DRILLS) - 16) > 1e-9)
  throw new Error('the age and the drill decays bite together: 64 halves twice');
if (leakWeight({ n: 1, cost: 5000, ts: now, d: DRILLS }, now, DRILLS) !== CAP)
  throw new Error('one distant disaster is capped');
if (leakWeight({ n: 1, cost: 40 }, now, DRILLS) !== 40)
  throw new Error('an undated cell reads fresh \u2014 the decay starts at its next miss');
if (leakWeight({ n: 1, cost: 40, ts: now, d: DRILLS + 50 }, now, DRILLS) !== 40)
  throw new Error('a stamp ahead of the clock \u2014 the felt\u2019s hand-off \u2014 must not inflate the pull');
console.log('leakWeight: a week halves, a month is a sixteenth, 250 drill hands halve again \u2014 and the pull is capped');

const leakMap = {
  'hard 16 v 10': { n: 3, cost: 60, ts: now - 3 * HALF },   /* heavy but stale: 7.5 */
  'hard 12 v 2': { n: 1, cost: 20, ts: now },               /* modest but fresh: 20 */
  'soft 13 v Q': { n: 2, cost: 5, ts: now, m: 1 }           /* mastered: still ranked, still skipped */
};
function weakestOf(map, drills) {
  return extract('weakestCells', 'leaks, leakWeight, gradClock')(map, leakWeight, drills)(now);
}
const wc = weakestOf(leakMap, DRILLS);
if (wc.length !== 3) throw new Error('every ledgered cell ranks');
if (wc[0].cell !== 'hard 12 v 2') throw new Error('the freshest leak leads: ' + JSON.stringify(wc.map(c => c.cell)));
if (wc[1].cell !== 'hard 16 v 10' || wc[1].w !== 7.5)
  throw new Error('the stale heavy one cools below it, its weight on the row: ' + JSON.stringify(wc[1]));
if (!wc[2].m) throw new Error('the master flag still rides the ranking');
const drilled = weakestOf({
  'hard 16 v 10': { n: 1, cost: 40, ts: now, d: DRILLS - 2 * DRILL_HALF },   /* fresh, but drilled: 10 */
  'hard 12 v 2': { n: 1, cost: 20, ts: now, d: DRILLS }                        /* fresh: 20 */
}, DRILLS);
if (drilled[0].cell !== 'hard 12 v 2' || Math.abs(drilled[1].w - 10) > 1e-9)
  throw new Error('heavy drilling retires a fresh leak: ' + JSON.stringify(drilled));
if (!/w: leakWeight\(leaks\[k\], now, gradClock\)/.test(src))
  throw new Error('the ranker must weigh the row against the drill clock as well as the age');
if (!/arr\.sort\(function \(a, b\) \{ return b\.w - a\.w; \}\);/.test(src))
  throw new Error('the ranking must order by the decayed weight');
if (!/Ranks by the freshest tolls \\u2014 age and the drill both cool a leak\./.test(src))
  throw new Error('the all-time panel must say the queue leans on the freshest tolls');
console.log('weakestCells: a fresh \u221220 leaps a stale \u221260 \u2014 and 500 drill hands sink a fresh \u221240 below it');

/* --- the drill clock stamps every miss, and cells stamped
       before it existed are backfilled fresh, so the new decay
       never retires a cell for drilling it never saw       --- */
if (!/function leakWeight\(e, now, drills\)/.test(src))
  throw new Error('leakWeight must take the drill clock');
if (!/var served = e\.d == null \? 0 : \(drills \|\| 0\) - e\.d;/.test(src))
  throw new Error('the served hands are the clock less the cell\u2019s stamp');
if (!/leaks\[cell\]\.d = gradClock;/.test(src))
  throw new Error('every cell that lands in the ledger must stamp the drill clock');
if (!/e\.d = gradClock;/.test(src))
  throw new Error('a fork-queued cell must stamp the drill clock too');
if (!/typeof leaks\[k\]\.d !== 'number'\).*leaks\[k\]\.d = gradClock; back = true;/.test(src))
  throw new Error('a cell stamped before the clock existed must be backfilled, not retired for free');
console.log('wiring: every miss stamps the drill clock, old cells are backfilled fresh');

/* --- the cooling read: a cooled row shows the share of its toll
       the queue still weighs, and past COOL_AT the whole row
       fades \u2014 so a stale heavy cell reads as fading, not merely
       ranking lower                                          --- */
if (!/var COOL_AT = 0\.5;/.test(src))
  throw new Error('the fade threshold must be a named constant');
const coolKeep = extract('coolKeep', '')();
if (coolKeep(null) !== null) throw new Error('no row, nothing to weigh');
if (coolKeep({ cost: 0, w: 0 }) !== null) throw new Error('a costless row reads as nothing');
if (coolKeep({ cost: 60, w: null }) !== null) throw new Error('an unweighted row has no retention');
if (coolKeep({ cost: 20, w: 20 }) !== 1) throw new Error('a fresh row keeps its whole toll');
if (Math.abs(coolKeep({ cost: 60, w: 15 }) - 0.25) > 1e-9)
  throw new Error('a drilled stale row keeps a quarter');
if (coolKeep({ cost: 100, w: 150 }) !== 1) throw new Error('retention is clamped at one');
if (coolKeep({ cost: 60, w: -3 }) !== 0) throw new Error('a negative weight floors at zero');
if (!/[\s\S]*leakView === 'session' \? null : coolKeep\(c\)/.test(src))
  throw new Error('only the all-time ranking weighs a row');
if (!/\\u2744 ' \+ Math\.round\(keep \* 100\) \+ '%<\/span>'/.test(src))
  throw new Error('a cooled row must wear the snowflake with its retention');
if (!/keep < COOL_AT\) \{ cls = \(cls \? cls \+ ' ' : ''\) \+ 'cooling'; coolN\+\+; \}/.test(src))
  throw new Error('a row past COOL_AT must fade and be counted');
if (!/keep == null \|\| keep > 0\.995 \? ''/.test(src))
  throw new Error('a fresh row must stay bare \u2014 only cooling shows');
if (!/\.leaks li\.cooling \{ opacity: 0\.5; \}/.test(src) ||
    !/\.leaks \.cool \{ margin-left: 0\.35em; color: #7fa7c4;/.test(src))
  throw new Error('the fade and the cool chip need their styles');
if (!/coolN \? ' \\u2744 marks a row cooled below half its toll\.' : ''/.test(src))
  throw new Error('the all-time footer must explain the snowflake when a row cools');
console.log('the cooling read: a drilled row shows its retention and fades past half \u2014 fresh rows stay bare');

/* --- the fade window is the player's: a short memory for a
       grind, a long one for a ledger, kept across reloads and
       named on the panel                                    --- */
if (!/'999\.practice\.leakhalf'/.test(src) || !/function saveHalf\(\)/.test(src))
  throw new Error('the chosen window must persist');
if (!/if \(lhRaw && typeof lhRaw\.ms === 'number' && lhRaw\.ms > 0\) LEAK_HALF = lhRaw\.ms;/.test(src))
  throw new Error('the stored window must load back');
if (!/var LEAK_WINDOWS = \[/.test(src) || !/\{ ms: 3 \* 24 \* 60 \* 60 \* 1000, label: '3d' \}/.test(src))
  throw new Error('the presets must be a named menu');
function halfRun(start, saved) {
  return new Function('LEAK_HALF', 'saveHalf',
    grab('  function setLeakHalf(', '\n  }') +
    '\nreturn function (ms) { var r = setLeakHalf(ms); return { r: r, half: LEAK_HALF }; };')(
    start, function () { saved.v = true; });
}
let hs = { v: false };
const sw = halfRun(1000, hs);
if (sw(0).r !== false || sw(0).half !== 1000) throw new Error('a zero window is refused');
if (sw(-5).r !== false) throw new Error('a negative window is refused');
if (hs.v) throw new Error('a refused window must not persist');
const ok = sw(14 * 24 * 60 * 60 * 1000);
if (!ok.r || ok.half !== 14 * 24 * 60 * 60 * 1000) throw new Error('a preset window takes');
if (!hs.v) throw new Error('a chosen window must persist');
const WINDOWS = [
  { ms: 3 * 864e5, label: '3d' }, { ms: 7 * 864e5, label: '1w' },
  { ms: 14 * 864e5, label: '2w' }, { ms: 30 * 864e5, label: '1m' }
];
function windowLabel(half) {
  return new Function('LEAK_WINDOWS', 'LEAK_HALF',
    grab('  function leakWindowLabel(', '\n  }') + '\nreturn leakWindowLabel;')(WINDOWS, half)();
}
if (windowLabel(7 * 864e5) !== '1w') throw new Error('a preset window names itself');
if (windowLabel(5 * 864e5) !== '5d') throw new Error('an off-menu window falls back to days: ' + windowLabel(5 * 864e5));
if (!/LEAK_WINDOWS\.map\(function \(w\)/.test(src))
  throw new Error('the selector must come from the preset menu');
if (!/class="lw' \+ \(w\.ms === LEAK_HALF \? ' on' : ''\)/.test(src))
  throw new Error('the panel must mark the live window');
if (!/Fade window: '/.test(src)) throw new Error('the panel must label the selector');
if (!/classList\.contains\('lw'\)\) \{\s*if \(setLeakHalf\(Number\(e\.target\.getAttribute\('data-ms'\)\)\)\) renderLeaks\(\);/.test(src))
  throw new Error('a window pick must retune and re-rank');
if (!/\.leaks \.leakwin \.lw\.on \{ color: #d8b56a;/.test(src))
  throw new Error('the live window chip must read gold');
console.log('the fade window: presets kept across reloads, the live one named gold on the panel');

/* --- week over week: the pill follows the worst cell --- */
const weekStart = extract('weekStart', '')();
function oneLiner(name) {
  const m = src.match(new RegExp('function ' + name + '\\(ws\\) \\{[^\\n]*\\}'));
  if (!m) throw new Error('the week one-liner not found: ' + name);
  return new Function('ws', m[0].slice(m[0].indexOf('{') + 1, -1) + '\nreturn ' + name + ';');
}
const prevWeek = oneLiner('prevWeek');
const nextWeek = oneLiner('nextWeek');
const mon = new Date(2026, 9, 5).getTime();          /* Mon 5 Oct 2026 */
const wed = new Date(2026, 9, 7, 15, 0, 0).getTime(); /* Wed, inside that week */
if (weekStart(wed) !== mon) throw new Error('the week must start on Monday 00:00: ' + new Date(weekStart(wed)));
if (prevWeek(mon) !== new Date(2026, 8, 28).getTime()) throw new Error('the week before 5 Oct is 28 Sep');
if (nextWeek(mon) !== new Date(2026, 9, 12).getTime()) throw new Error('the week after 5 Oct is 12 Oct');
console.log('the week: Monday to Monday \u2014 7 Oct sits in the week starting 5 Oct');

const LAST = new Date(2026, 8, 28).getTime(), CURR = mon, NOW = wed;
const base = {};
base[LAST] = { 'hard 16 v 10': 100, 'hard 12 v 2': 20 };
base[CURR] = { 'hard 16 v 10': 130, 'hard 12 v 2': 25 };
const live = { 'hard 16 v 10': { n: 4, cost: 160 }, 'hard 12 v 2': { n: 3, cost: 45 } };
const leakedIn = new Function('weekBase', 'leaks', 'weekStart', 'nextWeek',
  grab('  function leakedIn(', '\n  }') + '\nreturn leakedIn;')(base, live, weekStart, nextWeek);
if (leakedIn('hard 16 v 10', CURR, NOW) !== 30) throw new Error('this week 16 v 10 leaked 160\u2212130 = 30');
if (leakedIn('hard 16 v 10', LAST, NOW) !== 30) throw new Error('last week 16 v 10 leaked 130\u2212100 = 30');
if (leakedIn('hard 12 v 2', CURR, NOW) !== 20) throw new Error('this week 12 v 2 leaked 45\u221225 = 20');
if (leakedIn('hard 16 v 10', new Date(2026, 8, 21).getTime(), NOW) !== null)
  throw new Error('a week never seen leaks nothing known');
console.log('leakedIn: a week\u2019s leak is two snapshots apart \u2014 30 this week, 30 last, 20 beside');

/* --- the sparkline: a cell's weekly leak drawn as a shape, so a
       cell bleeding more each week climbs and a drilled-away one
       fades \u2014 read from the same weekly snapshots the chip uses --- */
if (!/var SPARK_WEEKS = 6;/.test(src)) throw new Error('the sparkline window must be named');
const sparkLine = extract('sparkLine', '')();
if (sparkLine(null) !== '' || sparkLine([]) !== '' || sparkLine([5]) !== '')
  throw new Error('fewer than two points is no line');
const GLYPH = '\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';
const rising = sparkLine([0, 50, 100]);
if (rising.length !== 3 || rising.charAt(0) !== GLYPH.charAt(0) || rising.charAt(2) !== GLYPH.charAt(7))
  throw new Error('a rising series spans low to high: ' + JSON.stringify(rising));
const falling = sparkLine([100, 50, 0]);
if (falling.charAt(0) !== GLYPH.charAt(7) || falling.charAt(2) !== GLYPH.charAt(0))
  throw new Error('a falling series spans high to low: ' + JSON.stringify(falling));
if (sparkLine([7, 7, 7]) !== GLYPH.charAt(4).repeat(3))
  throw new Error('a flat series sits on the mid glyph: ' + JSON.stringify(sparkLine([7, 7, 7])));
const sparkDir = extract('sparkDir', '')();
if (sparkDir([100, 50, 0]) !== -1) throw new Error('a falling line reads improving');
if (sparkDir([0, 50, 100]) !== 1) throw new Error('a climbing line reads worsening');
if (sparkDir([5, 5]) !== 0 || sparkDir([9]) !== 0) throw new Error('a flat or lone line reads steady');

/* sparkValues walks the kept weeks, newest last, so the shape is
   the cell's actual weekly leak by subtraction */
function sparkOf(cell, wb, live, nowv) {
  const li = new Function('weekBase', 'leaks', 'weekStart', 'nextWeek',
    grab('  function leakedIn(', '\n  }') + '\nreturn leakedIn;')(wb, live, weekStart, nextWeek);
  return new Function('weekBase', 'leakedIn', 'SPARK_WEEKS',
    grab('  function sparkValues(', '\n  }') + '\nreturn sparkValues;')(wb, li, 6)(cell, nowv);
}
const w1 = new Date(2026, 8, 7).getTime();   /* Mon 7 Sep 2026 */
const w2 = new Date(2026, 8, 14).getTime();
const w3 = new Date(2026, 8, 21).getTime();
const w4 = new Date(2026, 8, 28).getTime();
const nowv = new Date(2026, 9, 1, 12).getTime();   /* Wed, inside w4 */
const wb = {};
wb[w1] = { 'hard 16 v 10': 0 };
wb[w2] = { 'hard 16 v 10': 10 };
wb[w3] = { 'hard 16 v 10': 30 };
wb[w4] = { 'hard 16 v 10': 40 };
const vals = sparkOf('hard 16 v 10', wb, { 'hard 16 v 10': { n: 1, cost: 45 } }, nowv);
if (vals.join('|') !== '10|20|10|5')
  throw new Error('the weekly leaks by subtraction, newest last: ' + JSON.stringify(vals));
if (sparkLine(vals) !== '\u2583\u2588\u2583\u2581')
  throw new Error('the shape scales to the cell\u2019s own range: ' + JSON.stringify(sparkLine(vals)));
if (sparkLine([0, 0, 0, 0]) !== '') throw new Error('a cell that never leaked draws no line');
if (sparkLine(sparkOf('soft 20 v 6', wb, {}, nowv)) !== '')
  throw new Error('a cell with no weekly leak draws no line');
if (!/var spark = sparkHtml\(sparkValues\(c\.cell\)\);/.test(src))
  throw new Error('each row must draw its own cell\u2019s line');
if (!/class="spark ' \+ \(dir < 0 \? 'down' : dir > 0 \? 'up' : 'flat'\)/.test(src))
  throw new Error('the line must tint by its direction');
if (!/\.leaks \.spark\.down \{ color: #43c98a; \}/.test(src) ||
    !/\.leaks \.spark\.up \{ color: #e2705f; \}/.test(src))
  throw new Error('the line must read green falling, red climbing');
console.log('the sparkline: a falling line reads improving in green, a climbing one red \u2014 from the same weekly snapshots');

function trendOf(weekBaseMap, liveMap) {
  const li = new Function('weekBase', 'leaks', 'weekStart', 'nextWeek',
    grab('  function leakedIn(', '\n  }') + '\nreturn leakedIn;')(weekBaseMap, liveMap, weekStart, nextWeek);
  return new Function('weekBase', 'leaks', 'weekMark', 'leakedIn', 'prevWeek', 'weekStart',
    grab('  function weekTrend(', '\n  }') + '\nreturn weekTrend;')(weekBaseMap, liveMap,
    function () { return CURR; }, li, prevWeek, weekStart);
}
let t = trendOf(base, live)(NOW);
if (!t || t.cell !== 'hard 16 v 10' || t.dir !== 0) throw new Error('a flat week reads steady: ' + JSON.stringify(t));
const improving = trendOf(base, { 'hard 16 v 10': { n: 4, cost: 135 }, 'hard 12 v 2': { n: 3, cost: 27 } })(NOW);
if (!improving || improving.cell !== 'hard 16 v 10' || improving.dir !== -1)
  throw new Error('a shrinking leak reads improving: ' + JSON.stringify(improving));
const worseWeek = trendOf(base, { 'hard 16 v 10': { n: 6, cost: 200 }, 'hard 12 v 2': { n: 3, cost: 45 } })(NOW);
if (!worseWeek || worseWeek.cell !== 'hard 16 v 10' || worseWeek.dir !== 1)
  throw new Error('a growing leak reads worse: ' + JSON.stringify(worseWeek));
const noPrev = {}; noPrev[CURR] = base[CURR];
if (trendOf(noPrev, live)(NOW) !== null) throw new Error('no last week: the pill stays quiet');
const flat = {}; flat[LAST] = base[LAST]; flat[CURR] = base[CURR];
if (trendOf(flat, { 'hard 16 v 10': { n: 4, cost: 130 }, 'hard 12 v 2': { n: 3, cost: 25 } })(NOW) !== null)
  throw new Error('no leak this week: the pill stays quiet');
console.log('weekTrend: 16 v 10 off 30 twice is steady, down to 5 improving, up to 70 worse \u2014 and it hides when it cannot tell');

/* --- wiring: the week persists, a miss baselines it, the pill shows it --- */
if (!/'999\.practice\.weekbase'/.test(src) || !/function saveWeek\(\)/.test(src))
  throw new Error('the weekly baselines must persist');
if (!/if \(!weekBase\[ws\]\) \{ weekBase\[ws\] = weekSnap\(\); saveWeek\(\); \}/.test(src))
  throw new Error('a week must be baselined once, at its first sighting');
if (!/weekMark\(\);[^\n]*baselines before the miss lands/.test(src))
  throw new Error('a miss must baseline its week before it lands');
if (!/var wt = weekTrend\(\);/.test(src))
  throw new Error('the pill must read the weekly trend');
if (!/' \\u00b7 \\uD83E\\uDE79 ' \+ wt\.cell \+/.test(src))
  throw new Error('the pill must name the week\u2019s worst cell');
if (!/wt\.dir < 0 \? ' \\u25BC' : wt\.dir > 0 \? ' \\u25B2' : ' \\u00b7'/.test(src))
  throw new Error('the pill must point the trend down, up, or steady');
console.log('wiring: the week persists, a miss baselines it, the pill wears the direction');

console.log('\nsession leaks verified');
