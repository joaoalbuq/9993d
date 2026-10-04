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
const LUCK = require(path.join(__dirname, '..', 'luck999.js'));
const luckSrc = fs.readFileSync(path.join(__dirname, '..', 'luck999.js'), 'utf8');   /* the week arithmetic both pages share — the tests bind to it, not to a copy */
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
  const marks = { renders: 0, coach: 0, refills: 0, reel: 0, saved: 0 };
  const leakQueue = o.queue || [];
  const state = { roundNo: o.round == null ? 100 : o.round,
                  leakOpenRound: o.opened == null ? -6 : o.opened, leakHeld: 0 };
  const peek = new Function('reviewMode', 'leakMode', 'leakView', 'leakQueue', 'phase', 'bet',
    'roundNo', 'leakOpenRound', 'leakUnseen', 'LEAK_OPEN_EVERY',
    'renderCoach', 'renderLeaks', 'refillQueue', 'setStatus', 'reelNewClass', 'saveUnseen', 'unseenNote',
    'function leakOpenReady() { return roundNo - leakOpenRound >= LEAK_OPEN_EVERY; }' +
    aGrab + '\nreturn function () { leakAutoOpen();' +
      ' return { mode: leakMode, view: leakView, review: reviewMode, held: leakUnseen }; };')(
    !!o.review, !!o.leakMode, o.view || 'session', leakQueue,
    o.phase || 'acting', o.bet == null ? 1 : o.bet,
    state.roundNo, state.leakOpenRound, state.leakHeld, 6,
    function () { marks.coach++; },
    function () { marks.renders++; },
    function () { marks.refills++; leakQueue.push('refilled-from-all-time'); },
    function (s) { said.push(s); },
    function () { marks.reel++; },
    function (nm) { if (nm) marks.named = (marks.named || 0) + 1; },
    function () { marks.saved++; });
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
if (a.marks.renders || a.said.length) throw new Error('review mode: the panel must not open over the reel');
if (a.marks.reel !== 1) throw new Error('review mode: the reel must be handed the news, not left out of it');
console.log('leakAutoOpen: review mode keeps its reel, and hands the reel the news');

/* --- the reel's own ration and badge: a new class met mid-replay must
   be noticed, and noticed ONCE per ration — the same treatment the panel
   gets, not a second, louder one                                     */
if (src.indexOf('if (reviewMode) { reelNewClass(toll); return; }') < 0)
  throw new Error('a new class in review must reach the reel, not vanish into the branch');
const reelBody = src.slice(src.indexOf('function reelNewClass('), src.indexOf('function reelNoteHtml('));
if (reelBody.indexOf('reelUnseen += (toll > 0 ? toll : 1)') < 0)
  throw new Error('the reel must weigh the class it was handed, in chips');
if (reelBody.indexOf('leakOpenReady()') < reelBody.indexOf('reelUnseen +='))
  throw new Error('the reel must ask the SAME ration, and only after it has counted');
if (reelBody.indexOf('leakOpenRound = roundNo;') < 0)
  throw new Error('the ration must be SHARED: telling on the reel spends it, or the two nag together');
if (src.indexOf("rb.classList.toggle('new', reviewMode && reelUnseen > 0)") < 0)
  throw new Error('the reel button must be badged while it holds something new');
if (src.indexOf("chipsOf(reelUnseen) + ' new'") < 0)
  throw new Error('the badge must say how MUCH, not merely that there is something');
const reelNote = new Function('reelUnseen', 'reelSaidOn', 'LEAK_OPEN_EVERY',
  grab('  function chipsOf(', '\n  }') + grab('  function reelNoteHtml(', '\n  }') + '\nreturn reelNoteHtml();');
const rn = reelNote(180, 0, 6);
if (rn.indexOf('180 found mid-replay') < 0 || rn.indexOf('6-hand ration') < 0)
  throw new Error('a held class must be counted and named as held: ' + rn);
if (rn.indexOf('<') !== 0)
  throw new Error('the held line must be readable, not raw markup');
/* the weight is CHIPS, and chips are lost: the badge wears the same minus
   the rest of the ledger uses, never a bare number that reads as a gain */
const MINUS = String.fromCharCode(0x2212);
const chipsFn = new Function(grab('  function chipsOf(', '\n  }') + '\nreturn chipsOf;')();
if (chipsFn(180) !== MINUS + '180')
  throw new Error('the badge must read chips as a loss: ' + chipsFn(180));
if (chipsFn(0) !== MINUS + '0')
  throw new Error('even nothing owed wears the sign it is written with');
if (reelNote(0, 0, 6) !== '') throw new Error('nothing found, nothing said');
if (reelNote(0, 42, 6).indexOf('new class named at round 42') < 0)
  throw new Error('a said class must still be readable on the reel');
const bodies = src.split("box.innerHTML = '<h3>Session review</h3>' + reelNoteHtml()");
if (bodies.length !== 3)
  throw new Error('the reel must print the note in both of its bodies, empty reel and full: ' + (bodies.length - 1));
console.log('the reel: a new class met mid-replay is badged at once and said on the ration, never nagged');

/* --- the unseen count outlives the page -----------------------------
   A class found before a refresh is still a class nobody has read. If
   the badge forgets its count on reload, the same class is announced
   as new a second time, which is the nag the ration exists to stop.
   One record, both counts, written on every change.               */
if (src.indexOf("var UNSEEN_KEY = '999.practice.unseen';") < 0)
  throw new Error('the unseen counts need one record of their own');
if (src.indexOf('var leakUnseen = unseenRec.leak > 0 ? unseenRec.leak : 0;') < 0 ||
    src.indexOf('var reelUnseen = unseenRec.reel > 0 ? unseenRec.reel : 0;') < 0)
  throw new Error('BOTH counts must start from the stored record, not from zero');
if (src.indexOf('JSON.stringify({ leak: leakUnseen, reel: reelUnseen, cells: unseenCells })') < 0)
  throw new Error('the record must carry both counts, so neither surface is lost');
/* and it must be real: a store we control, a record that survives, and
   a junk record that cannot poison the counts                */
const mem2 = {};
const fakeStore = { getItem: (k) => (k in mem2 ? mem2[k] : null),
                    setItem: (k, v) => { mem2[k] = String(v); } };
const unseenFull = new Function('localStorage', 'UNSEEN_KEY',
  grab('  function unseenLoad(', '\n  }') + grab('  function saveUnseen(', '\n  }') +
  '\nreturn { load: unseenLoad, save: saveUnseen };')(fakeStore, '999.practice.unseen');
mem2['999.practice.unseen'] = JSON.stringify({ leak: 2, reel: 1 });
const rSeen = unseenFull.load();
if (!(rSeen.leak === 2 && rSeen.reel === 1))
  throw new Error('a stored record must load as it was written: ' + JSON.stringify(rSeen));
mem2['999.practice.unseen'] = '{not json';
if (Object.keys(unseenFull.load()).length !== 0)
  throw new Error('a junk record must fall back to nothing, not to NaN counts');
mem2['999.practice.unseen'] = JSON.stringify({ leak: -4, reel: 'x' });
const rJunk = unseenFull.load();
if (!(!(rJunk.leak > 0) && !(rJunk.reel > 0)))
  throw new Error('a negative or non-number count must read as none: ' + JSON.stringify(rJunk));
/* the two places the counts change must both write, or a reload loses
   exactly the news the badge is for                            */
for (const where of ['if (!leakMode) { leakUnseen += (toll > 0 ? toll : 1); unseenNote(cell); saveUnseen(); }',
                     'leakUnseen = 0; unseenForget(); saveUnseen(); renderCoach();',
                     'reelUnseen = 0;                    /* ...including the reel']) {
  if (src.indexOf(where) < 0) throw new Error('a change to the counts must be written: ' + where);
}
/* and the reel's own count must be SPENT when the reel names it, or a
   badge that outlasts its own news is the nag again                */
if (reelBody.indexOf('reelUnseen = 0;') < 0 ||
    reelBody.indexOf('reelUnseen = 0;') > reelBody.indexOf('reelSaidOn = roundNo;'))
  throw new Error('the reel must clear its count when it names the class');
if (src.indexOf('leakCell = null; leakUnseen = 0; reelUnseen = 0; unseenForget(); saveUnseen();') < 0)
  throw new Error('a wiped book must take the badge with it, or it badges a ledger that is gone');
/* and the panel that found a class must have written on the way out */
if (autoRun({ phase: 'betting', bet: 0 }).marks.saved < 1)
  throw new Error('a class found with the panel shut must be written, or the badge dies on reload');
/* --- the badge weighs CHIPS, not classes ------------------------------
   One class met for the first time is one piece of news either way, but
   a -180 miss and a -2 miss are not the same size of surprise, and a
   pill that says "1 new" over both has thrown away the one fact it could
   have said. So each new class adds what it actually cost.            */
const autoBody = grab('  function leakAutoOpen(', '\n  }');
if (autoBody.indexOf('var toll = Math.round(cost);') < 0)
  throw new Error('the badge must weigh the miss, not count the class');
if (autoBody.indexOf('leakUnseen += (toll > 0 ? toll : 1)') < 0)
  throw new Error('an expensive miss must read louder than a cheap one');
/* and it must never drop the news for want of a number */
if (autoBody.indexOf('toll > 0 ? toll : 1') < 0)
  throw new Error('a caller with no figure must still badge the class');
/* both surfaces weigh it the same way, through the one helper */
if (src.indexOf('function chipsOf(n)') < 0 ||
    src.indexOf('function leakBadge()') < 0)
  throw new Error('the pill and the reel must read chips through one formatter');
const badgeBody = src.slice(src.indexOf('  function leakBadge('), src.indexOf('  function leakUnseenLine('));
if (badgeBody.indexOf('chipsOf(leakUnseen)') < 0)
  throw new Error('the pill must wear the weight, not a raw count');
if (src.indexOf(' + chipsOf(reelUnseen) + ') < 0)
  throw new Error('the reel must wear the same weight as the pill');
/* the reel adds its own toll, not a unit */
if (reelBody.indexOf('reelUnseen += (toll > 0 ? toll : 1)') < 0)
  throw new Error('the reel must weigh the class it was handed');
/* and the three callers hand it the miss's own figure */
for (const c of ['leakAutoOpen(cost, lastCell);', "leakAutoOpen(cost, 'insurance v ace');", 'leakAutoOpen(freshChips);']) {
  if (src.indexOf(c) < 0) throw new Error('a caller must hand over what the miss cost: ' + c);
}
console.log('the badge counts chips: a -180 miss and a -2 miss do not read the same on the pill');
/* --- the interval is the player's, exactly as the fade window is ---
   The ration exists because every player nagged by it stops reading it,
   and how much nagging is too much is not a judgement this page can
   make for them. Six hands ships; never is a rung like any other.  */
if (src.indexOf("localStorage.getItem('999.practice.openinterval')") < 0)
  throw new Error('the interval must persist, or it is set again every visit');
if (src.indexOf('var LEAK_OPENS = [') < 0 || src.indexOf("label: 'never'") < 0)
  throw new Error('the menu must offer never, or the cap is not the player\u2019s to lift');
if (src.indexOf('function setLeakOpenEvery(n)') < 0)
  throw new Error('the pick needs one setter, as the fade window has');
/* never really means never: the ration refuses, the work does not \u2014 the
   drill still arms, the button still appears, the badge still counts   */
if (src.indexOf('if (LEAK_OPEN_EVERY === 0) return false;') < 0)
  throw new Error('never must actually stop the panel opening itself');
const ready = new Function('roundNo', 'leakOpenRound', 'LEAK_OPEN_EVERY',
  grab('  function leakOpenReady(', '\n  }') + '\nreturn leakOpenReady();');
if (ready(0, 1000, 0) !== false) throw new Error('never means never, whatever the round clock says');
if (ready(100, 90, 6) !== true) throw new Error('a normal interval still opens once its hands are up');
if (ready(95, 90, 6) !== false) throw new Error('and still waits until they are');
/* a pick that changes nothing must not redraw, and nonsense must not be
   stored \u2014 the fade window's setter refuses both, and so must this one */
const mem3 = {};
const store3 = { getItem: (k) => (k in mem3 ? mem3[k] : null),
                 setItem: (k, v) => { mem3[k] = String(v); } };
const setter = new Function('localStorage', 'LEAK_OPEN_EVERY',
  grab('  function saveOpenInterval(', '\n  }') +
  grab('  function setLeakOpenEvery(', '\n  }') +
  '\nreturn function (n) { return setLeakOpenEvery(n); };')(store3, 6);
if (setter(6) !== false) throw new Error('a pick of the live value must change nothing');
if (mem3['999.practice.openinterval'] !== undefined)
  throw new Error('a pick of the live value must not even be written');
if (setter(0) !== true) throw new Error('never is a real rung, not a dead option');
if (JSON.parse(mem3['999.practice.openinterval']).every !== 0)
  throw new Error('the pick must persist what was chosen');
if (setter(-3) !== false || setter('soon') !== false)
  throw new Error('a nonsense pick must be refused, not stored');
/* and it is a control on the same row as the window, which starts its
   own clock \u2014 otherwise the next tell waits out a whole old window   */
if (src.indexOf('data-every=') < 0 || src.indexOf("classList.contains('ow')") < 0)
  throw new Error('the interval must be a control in the panel row, beside the fade window');
if (src.indexOf('leakOpenRound = roundNo - LEAK_OPEN_EVERY;') < 0)
  throw new Error('a new interval must start its own clock');
console.log('the auto-open interval is the player\u2019s: 2 \u00b7 4 \u00b7 6 \u00b7 12 \u00b7 never, set beside the fade window and kept');
console.log('the unseen count is written on every change: a class found before a refresh is still badged after it');

/* --- the ration: a streak of new classes must not nag --- */
if (src.indexOf('var LEAK_OPEN_DEFAULT = 6;') < 0 || src.indexOf('function leakOpenReady()') < 0)
  throw new Error('the auto-open must be rationed by a named interval, six hands by default');
if (!/roundNo - leakOpenRound >= LEAK_OPEN_EVERY/.test(src))
  throw new Error('the ration must run on the round clock, which ticks whatever the panel does');
if (src.indexOf('leakUnseen += (toll > 0 ? toll : 1); unseenNote(cell); saveUnseen();') < 0)
  throw new Error('a class found with the panel shut is unseen, ration or not \u2014 weighed, and written either way');
if (!/if \(!leakOpenReady\(\)\) \{ renderCoach\(\); return; \}/.test(src))
  throw new Error('a rationed open must be held and badged, not dropped');
if (!/if \(!leakQueue\.length\) refillQueue\(\);  \/\* the drill arms whatever the panel does \*\//.test(src))
  throw new Error('the cap must never suppress the work \u2014 only the telling');
if (src.indexOf('function leakBadge(') < 0 ||
    src.indexOf(" + chipsOf(leakUnseen) + ") < 0)
  throw new Error('the pill must badge the CHIPS it has not shown');
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
  const said = [], remembered = [];
  const leakQueue = o.queue ? o.queue.slice() : [];
  const leaksMap = o.leaks ? JSON.parse(JSON.stringify(o.leaks)) : {};
  const sessionMap = o.session || { 'hard 16 v 10': { n: 2, cost: 51 } };
  const saved = { v: false };
  const peek = new Function('reviewMode', 'reviewIdx', 'leakMode', 'leakQueue', 'leaks', 'leakCell',
    'renderCoach', 'renderLeaks', 'phase', 'bet', 'setStatus', 'sessionLeaks', 'saveLeaks', 'refillQueue',
    'rememberIx',
    dGrab + '\nreturn function (cell) { drillNow(cell);' +
      ' return { mode: leakMode, cell: leakCell, review: reviewMode }; };')(
    !!o.review, 0, !!o.leakMode, leakQueue, leaksMap, o.leakCell || null,
    function () {}, function () {}, o.phase || 'betting', o.bet || 0,
    function (s) { said.push(s); }, sessionMap,
    function () { saved.v = true; },
    function () { leakQueue.push('refilled-from-all-time'); },
    function (c) { remembered.push(c); });
  const out = peek(o.cell);
  return { out: out, said: said, queue: leakQueue, leaks: leaksMap, saved: saved.v, remembered: remembered };
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
if (!/driftFlag\(c\.cell, leakView\)/.test(src))
  throw new Error('both tabs must read each row against the cell\u2019s history');
if (!/var from = c\.t \? ' \\u00b7 \\uD83C\\uDFB0 '/.test(src) || !/st \+ from \+ recall \+ driftFlag\(c\.cell, leakView\)/.test(src))
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

/* --- allTimeDrift: the all-time tab reads the record, not the
       sitting — the last CLOSED week against the cell\u2019s own
       average week, so a class that climbed last month still
       wears \u25B2 today with no hand played at all. --- */
const wS = LUCK.weekStart;
const pW = LUCK.prevWeek;
/* both ledgers travel together: leakedIn must read the very objects
   allTimeDrift divides by, so they share one pair of references */
const wbRef = {}, lkRef = {};
const lI = (cell, wsn, nw) => LUCK.leakedIn(lkRef, wbRef, cell, wsn, nw);
const ATD = new Function('leaks', 'weekBase', 'weekStart', 'prevWeek', 'leakedIn', 'LUCK999',
  grab('  function allTimeDrift(', '\n  }') + '\nreturn allTimeDrift;');

/* a Wednesday, four Mondays of snapshots, so three weeks are measurable */
const DAY = 24 * 60 * 60 * 1000;
const WED = new Date(2024, 2, 20, 12, 0, 0).getTime();   /* 20 Mar 2024, a Wednesday */
const W0 = wS(WED - 21 * DAY), W1 = wS(WED - 14 * DAY),
  W2 = wS(WED - 7 * DAY), W3 = wS(WED);
/* the climber: 60 chips a week for three weeks, then 280 last week.
   leakedIn(ws) is the snapshot AT ws+1 minus the one AT ws, so the
   W3 snapshot is the close of W2 \u2014 and the open week is whatever
   the ledger has run past it.                                */
const atBase = {};
atBase[W0] = {};                              /* first sighting: nothing before */
atBase[W1] = { 'hard 16 v 10': 60 };
atBase[W2] = { 'hard 16 v 10': 120 };
atBase[W3] = { 'hard 16 v 10': 400 };          /* W2 closed hard: 400 \u2212 120 */
const led = { 'hard 16 v 10': { n: 20, cost: 480 } };   /* 80 so far this week */
function driftOf(l, b, cell) {
  for (const k in lkRef) delete lkRef[k];
  Object.assign(lkRef, l);
  for (const k in wbRef) delete wbRef[k];
  Object.assign(wbRef, b);
  return ATD(lkRef, wbRef, wS, pW, lI, LUCK)(cell, WED);
}
const atDrift = driftOf(led, atBase, 'hard 16 v 10');
if (!atDrift || Math.abs(atDrift.was - 280) > 1e-9)
  throw new Error('last week is the W2\u2192W3 move: ' + JSON.stringify(atDrift));
if (!atDrift || Math.abs(atDrift.avg - 480 / 4) > 1e-9 || Math.abs(atDrift.x - 280 / 120) > 1e-9)
  throw new Error('the average week divides the whole toll by the four measurable weeks: ' + JSON.stringify(atDrift));
const atQuiet = driftOf({ 'hard 12 v 2': { n: 20, cost: 480 } }, atBase, 'hard 12 v 2');
if (atQuiet !== null) throw new Error('a cell absent from the snapshots cannot drift');
if (driftOf({}, atBase, 'hard 16 v 10') !== null)
  throw new Error('an unmissed cell cannot drift');
/* a flat cell: every week the same 10 chips, never flagged */
const atFlat = {};
atFlat[W0] = {}; atFlat[W1] = { 'hard 9 v 2': 10 };
atFlat[W2] = { 'hard 9 v 2': 20 }; atFlat[W3] = { 'hard 9 v 2': 30 };
if (driftOf({ 'hard 9 v 2': { n: 4, cost: 40 } }, atFlat, 'hard 9 v 2') !== null)
  throw new Error('a cell running exactly its average week is not drifting');
/* the open week must never be the read. That same flat cell then
   runs up a fortune THIS week, and must stay unflagged \u2014 a
   part-run week read as the trend would wear the glyph on every
   cell by Tuesday.                                          */
const hot = driftOf({ 'hard 9 v 2': { n: 4, cost: 99999 } }, atFlat, 'hard 9 v 2');
if (hot !== null)
  throw new Error('the part-run week is not the recent trend: ' + JSON.stringify(hot));
/* and a loud open week must not silence a real climber either */
if (driftOf({ 'hard 16 v 10': { n: 20, cost: 99999 } }, atBase, 'hard 16 v 10') !== null)
  throw new Error('a loud open week must not silence a real climber');
/* too few weeks to judge: a lone snapshot, no history behind it */
if (driftOf({ 'hard 10 v 10': { n: 4, cost: 40 } }, { [W3]: {} }, 'hard 10 v 10') !== null)
  throw new Error('with no measurable history there is nothing to read');
console.log('allTimeDrift: \u25B2280 last week v 120 a week flags a climber; flat, fresh and open weeks stay quiet');

/* --- driftFlag: one flag per row, strongest read the tab offers --- */
const driftFlag = new Function('allTimeDrift', 'worseFlag',
  grab('  function driftFlag(', '\n  }') + '\nreturn driftFlag;')(
  () => ({ was: 280, avg: 120, x: 2.33 }),
  () => ' \u00b7 \u25B2fallback');
const allRow = driftFlag('hard 16 v 10', 'all');
if (allRow.indexOf('\u25B2280 last week v 120 a week') < 0 || allRow.indexOf('fallback') >= 0)
  throw new Error('the all-time tab must lead with the record\u2019s own read: ' + allRow);
if (!/<span class="wk up"/.test(allRow) || !/title="last full week/.test(allRow))
  throw new Error('the all-time flag tints red and explains itself: ' + allRow);
if (driftFlag('hard 16 v 10', 'session') !== ' \u00b7 \u25B2fallback')
  throw new Error('the session tab keeps the sitting\u2019s own flag');
const thinFlag = new Function('allTimeDrift', 'worseFlag',
  grab('  function driftFlag(', '\n  }') + '\nreturn driftFlag;')(
  () => null, () => ' \u00b7 \u25B226 a miss v 10 all time');
if (thinFlag('hard 16 v 10', 'all') !== ' \u00b7 \u25B226 a miss v 10 all time')
  throw new Error('too few weeks to judge: the sitting\u2019s flag still speaks');
if (!/\(leakView === 'session' \? '' : ' Ranks by the freshest tolls/.test(src) ||
    !/\\u25B2 = last week harder than the cell\\u2019s own average week\./.test(src))
  throw new Error('the all-time footer must explain its own \u25B2');
console.log('driftFlag: all time reads the record, the session reads the sitting, and each footer names its glyph');

/* --- the rows carry the week over week, in chips, tinted --- */
/* the weighing itself lives in luck999.js now — both pages read it there, so
   the panel cannot answer this week's chips one way and the table another.
   This page keeps only the binding to its own ledger and snapshots. */
if (!/function weekSplit\(cell, now\) \{/.test(src) ||
    !/return LUCK999\.weekSplit\(leaks, weekBase, cell, now\);/.test(src))
  throw new Error('the panel must weigh each cell\u2019s this week against last');
if (!/return \{ now: l, was: was, dir: l < was \? -1 : l > was \? 1 : 0 \};/.test(luckSrc))
  throw new Error('the shared weighing must still name both weeks and the direction');
if (!/var wk = weekSplit\(c\.cell\);/.test(src) ||
    !/var wkHtml = weekPillHtml\(wk\);/.test(src))
  throw new Error('a row must carry its weekly chips, tinted');
/* the pill\u2019s own markup lives in luck999.js now \u2014 the floor binds to it
   rather than keeping a copy, which is how the live table came to print the
   same figures instead of a bare arrow */
if (!/Math\.round\(wk\.now\) \+ ' v ' \+ Math\.round\(wk\.was\)/.test(luckSrc))
  throw new Error('the shared pill must name the chips this week versus last');
if (!/function weekPillHtml\(wk\) \{\s*return LUCK999\.weekPillHtml\(wk\);/.test(src))
  throw new Error('the floor must forward to the shared pill, not keep a second builder');
/* the row and the chart's bar share ONE renderer, so run it rather than
   matching its markup: a row drawing chips while the bar drew a bare arrow
   was the fault this one function prevents */
const weekPill = new Function('LUCK999',
  grab('  function weekPillHtml(wk) {', '\n  }') +
  '\nreturn weekPillHtml;')(require(path.join(__dirname, '..', 'luck999.js')));
const rowPill = weekPill({ now: 30, was: 4, dir: 1 });
if (!/\u25B2 30 v 4/.test(rowPill) || !/class="wk evdir up"/.test(rowPill))
  throw new Error('the row must still name the chips and tint them: ' + rowPill);
if (!/this week against \u22124 last week/.test(rowPill))
  throw new Error('the row must say which figure is which week: ' + rowPill);
if (weekPill(null) !== '') throw new Error('a cell with no basis on either end carries no marker');
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
if (!/if \(lastCell && drillFeeds\('felt'\)\) \{[\s\S]{0,220}if \(leakMiss\(lastCell, cost\)\) leakAutoOpen\(cost, lastCell\);/.test(src))
  throw new Error('a first-of-its-class hand miss must open the panel \u2014 when the felt feeds');
if (!/if \(drillFeeds\('felt'\) && leakMiss\('insurance v ace', cost\)\) leakAutoOpen\(cost, 'insurance v ace'\);/.test(src))
  throw new Error('a first insurance miss must open the panel too \u2014 when the felt feeds');
if (!/leaks\[cell\]\.d = gradClock;/.test(src))
  throw new Error('the drill clock must stamp every cell that lands in the ledger');
if (!/if \(reviewMode\) \{ reelNewClass\(toll\); return; \}/.test(grab('  function leakAutoOpen(', '\n  }')))
  throw new Error('the auto-open must stand down while the replay reel owns the box, and hand it the news');
console.log('wiring: a class\u2019s first miss \u2014 hand or insurance \u2014 opens the panel on its own');

/* --- the queue follows THIS week's leaks: a cell's pull is
       its toll decayed by age AND by the drill hands served
       since its last stamp, and capped, so a month-old blow \u2014
       or a heavily drilled one \u2014 cannot hog the drill forever --- */
if (!/var LEAK_CAP = 100, LEAK_DRILL_HALF = 250;/.test(src) ||
    !/var LEAK_HALF_DEFAULT = 7 \* 24 \* 60 \* 60 \* 1000;/.test(src))
  throw new Error('the cap, the drill decay and the default age window must be named constants');
const HALF = 7 * 24 * 60 * 60 * 1000, CAP = 100, DRILL_HALF = 250;
const drillCool250 = extract('drillCool', 'LEAK_DRILL_HALF')(DRILL_HALF);
const leakWeight = extract('leakWeight', 'LEAK_HALF, LEAK_CAP, LEAK_DRILL_HALF, drillCool')(HALF, CAP, DRILL_HALF, drillCool250);
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
/* the footer says what is actually cooling a leak \u2014 and the drill
   can be switched off, so it has two sentences, not one      */
if (!/\(leakView === 'session' \? '' : ' Ranks by the freshest tolls \\u2014 ' \+/.test(src) ||
    !/LEAK_DRILL_HALF > 0 \? 'age and the drill both cool a leak\.' : 'the drill is off, so age alone cools a leak/.test(src))
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
/* the retention is the ranking's own weight over the honest cost,
   and it belongs to the ALL-TIME ranking alone — the session tab
   prices this sitting's misses, which have not cooled yet.       */
if (!/var parts = leakView === 'session' \? null : coolParts\(c, leakNow, gradClock\);/.test(src))
  throw new Error('only the all-time ranking weighs a row');
if (!/var keep = parts == null \? null : parts\.keep;/.test(src))
  throw new Error('the fade and the chip must read the one retention');
if (!/\\u2744 ' \+ Math\.round\(keep \* 100\) \+ '%' \+/.test(src))
  throw new Error('a row must wear the snowflake with its retention');
if (!/keep < COOL_AT\) \{ cls = \(cls \? cls \+ ' ' : ''\) \+ 'cooling'; coolN\+\+; \}/.test(src))
  throw new Error('a row past COOL_AT must fade and be counted');
/* EVERY memory wears its retention now, fresh included: \u2744100% is
   how a player reads the split beside a cooled one as the thing
   that moved. The split itself rides only when something cooled —
   a memory nothing has touched yet has nothing to divide.        */
if (!/var cool = keep == null \? '' :/.test(src))
  throw new Error('the chip belongs to the all-time ranking only, like the pull');
if (!/'\\u2744 ' \+ Math\.round\(keep \* 100\) \+ '%' \+\s*\n\s*\(keep > 0\.995 \? '' : coolSplit\(parts\)\) \+ '<\/span>'/.test(src))
  throw new Error('a fresh memory wears \u2744100%; only a cooled one carries the split');
if (!/\.leaks li\.cooling \{ opacity: 0\.5; \}/.test(src) ||
    !/\.leaks \.cool \{ margin-left: 0\.35em; color: #7fa7c4;/.test(src) ||
    !/\.leaks \.cool \.csplit \{ color: rgba\(255,255,255,0\.45\); \}/.test(src))
  throw new Error('the fade and the cool chip need their styles');
if (!/\\u2744 is each cell\\u2019s own retention, and the two shares beside it say how much is age and how ' \+/.test(src))
  throw new Error('the all-time footer must teach the split');
console.log('the cooling read: every memory wears its retention, and a cooled row fades past half');

/* --- the pull beside the honest cost: the ranking's OWN weight, so a
       heavier cell that has cooled can be SEEN to fall below a
       lighter one instead of only appearing to                    --- */
if (!/var leakNow = Date\.now\(\);   \/\* one instant for the ranking and for the halves the row names \*\//.test(src) ||
    !/var allCells = weakestCells\(leakNow\);/.test(src))
  throw new Error('the row must name its halves from the same instant the ranking weighed');
if (!/ts: leaks\[k\]\.ts \|\| 0, d: leaks\[k\]\.d == null \? null : leaks\[k\]\.d,/.test(src))
  throw new Error('a ranked row must carry both decay terms, the age and the drill stamp');
if (!/var pull = keep == null \? '' :/.test(src))
  throw new Error('the pull belongs to the all-time ranking only, like the snowflake');
if (!/class="pull" title="what the queue weighs this row at, not what it cost: '/.test(src) ||
    !/ages\.toFixed\(1\) \+ ' half-lives old \(one per ' \+ leakWindowLabel\(\)/.test(src) ||
    !/served \+ ' hands served since the drill \(' \+ drillHalfPhrase\(\) \+ '\)">pulls ' \+\s*\n\s*Math\.round\(c\.w\)/.test(src))
  throw new Error('the pull must name what it is, and the two halves that made it');
if (!/Math\.round\(c\.cost\) \+ '<\/b>' \+ pull \+ st \+ from/.test(src))
  throw new Error('the pull must sit beside the honest cost, not at the far end of the row');
if (!/Math\.round\(c\.w\) \+ '<\/span>' \+ cool;/.test(src) || /wkHtml \+ spark \+ cool \+ tap/.test(src))
  throw new Error('the snowflake must ride with the pull, not drift off on its own');
if (!/\.leaks \.pull \{ color: rgba\(255,255,255,0\.6\);/.test(src))
  throw new Error('the pull reads beside the sheet, not shouted');
if (!/The pull beside each cost is what the queue weighs it at/.test(src))
  throw new Error('the all-time footer must teach the pull');
/* the claim itself, on the shipped decay: a heavier cell left long
   enough must weigh less than a lighter one still warm \u2014 and the
   numbers the row prints are those two                       */
{
  const now = 1e12;
  const heavyCold = { n: 4, cost: 200, ts: now - 4 * HALF };
  const lightWarm = { n: 1, cost: 60, ts: now - HALF / 4 };
  const servedCold = { n: 4, cost: 200, ts: now, d: 0 };            /* the clock stands at 4 halves */
  if (!(leakWeight(heavyCold, now, 0) < leakWeight(lightWarm, now, 0)))
    throw new Error('four ages must cool a heavy row below a light warm one');
  if (!(leakWeight(lightWarm, now, 0) < lightWarm.cost) ||
      !(leakWeight(heavyCold, now, 0) < heavyCold.cost))
    throw new Error('the pull must sit under the honest cost once anything has cooled');
  if (leakWeight(servedCold, now, 4 * DRILL_HALF) > servedCold.cost * 0.07)
    throw new Error('drilling retires a row on its own half-life too');
  if (Math.round(coolKeep({ cost: 200, w: leakWeight(heavyCold, now, 0) }) * 100) !== 6)
    throw new Error('the snowflake must report the same number the pull is made of');
}
console.log('the cooled pull: a heavy aged row prints a lower pull than a lighter warm one, beside its honest cost');

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
if (!/\.leaks \.leakwin \.lw\.on, \.leaks \.leakwin \.dh\.on, \.leaks \.leakwin \.df\.on, \.leaks \.leakwin \.ow\.on \{ color: #d8b56a;/.test(src))
  throw new Error('the live half-life chip must read gold \u2014 all four chips share the look');
console.log('the fade window: presets kept across reloads, the live one named gold on the panel');

/* --- the drill-hands half-life is the player's too, set in the SAME
       row: two memories, age and hands served, tuned together     --- */
if (!/'999\.practice\.drillhalf'/.test(src) || !/function saveDrillHalf\(\)/.test(src))
  throw new Error('the chosen drill half-life must persist');
/* OFF is a stored setting, so the loader must take 0 as a real
   answer and only refuse what is not a number \u2014 or the switch
   would reset itself on every reload, which is the one thing a
   setting may never do                                       */
if (!/if \(dhRaw && typeof dhRaw\.n === 'number' && isFinite\(dhRaw\.n\) && dhRaw\.n >= 0\)\s*\n\s*LEAK_DRILL_HALF = dhRaw\.n;/.test(src))
  throw new Error('the stored drill half-life must load back, off included');
if (!/var LEAK_DRILLS = \[/.test(src) || !/\{ n: 250, label: '250' \}/.test(src))
  throw new Error('the drill presets must be a named menu');
if (!/\{ n: 0, label: 'off' \}/.test(src))
  throw new Error('off must be one of the picks, not an absence');
if (!/function drillHalfPhrase\(\) \{\s*\n\s*return LEAK_DRILL_HALF > 0 \? 'one per ' \+ LEAK_DRILL_HALF : 'off/.test(src))
  throw new Error('the half-life must be named in words, and off named plainly');
if (!/if \(typeof n !== 'number' \|\| !isFinite\(n\) \|\| n < 0\) return false;/.test(src))
  throw new Error('the switch must take off, and refuse only what is not a number');
function drillHalfRun(start, saved) {
  return new Function('LEAK_DRILL_HALF', 'saveDrillHalf',
    grab('  function setDrillHalf(', '\n  }') +
    '\nreturn function (n) { var r = setDrillHalf(n); return { r: r, half: LEAK_DRILL_HALF }; };')(
    start, function () { saved.v = true; });
}
let ds = { v: false };
const dw = drillHalfRun(250, ds);
if (dw(-5).r !== false) throw new Error('a negative half-life is refused');
if (dw(NaN).r !== false || dw(Infinity).r !== false)
  throw new Error('a half-life that is not a finite number is refused');
if (dw('250').r !== false) throw new Error('a half-life handed over as text is refused');
if (ds.v) throw new Error('a refused half-life must not persist');
const dok = dw(500);
if (!dok.r || dok.half !== 500) throw new Error('a preset half-life takes');
if (!ds.v) throw new Error('a chosen half-life must persist');
/* the switch itself: OFF takes, and keeps — a player who lets only
   age cool a leak must find it still off after a reload, which is
   the whole reason off is a stored number and not a missing one  */
const dOff = dw(0);
if (!dOff.r || dOff.half !== 0) throw new Error('off is a setting like any other and takes');
if (drillLabel(0) !== 'off') throw new Error('the off pick must name itself on the panel');
function drillLabel(half) {
  return new Function('LEAK_DRILLS', 'LEAK_DRILL_HALF',
    grab('  function drillHalfLabel(', '\n  }') + '\nreturn drillHalfLabel;')(
    [{ n: 0, label: 'off' }, { n: 100, label: '100' }, { n: 250, label: '250' }, { n: 1000, label: '1k' }], half)();
}
if (drillLabel(1000) !== '1k') throw new Error('a preset half-life names itself');
if (drillLabel(375) !== '375') throw new Error('an off-menu half-life falls back to the raw count: ' + drillLabel(375));
/* both selectors live in ONE row, so neither is set and forgotten */
const winRow = src.slice(src.indexOf('class="leakwin"'), src.indexOf('class="leakwin"') + 700);
if (!/Fade window: '/.test(winRow)) throw new Error('the row must label the age menu');
if (!/Drill hands: '/.test(winRow)) throw new Error('the row must label the drill menu');
if (winRow.indexOf('LEAK_WINDOWS.map') > winRow.indexOf('LEAK_DRILLS.map'))
  throw new Error('the age picks must come before the drill picks, one row, one read');
if (!/class="dh' \+ \(w\.n === LEAK_DRILL_HALF \? ' on' : ''\)/.test(src))
  throw new Error('the panel must mark the live drill half-life');
if (!/classList\.contains\('dh'\)\) \{[\s\S]{0,180}setDrillHalf\(Number\(e\.target\.getAttribute\('data-n'\)\)\)\) renderLeaks\(\);/.test(src))
  throw new Error('a drill pick must retune and re-rank');
console.log('the drill half-life: presets kept across reloads, set in the fade window\u2019s own row');

/* --- which mistake source feeds the drill: both, felt only, quiz only ---
       a quiz-only or felt-only ledger is a legitimate want; the switch
       shut the taps, it does not expel the tolls already in the ledger */
if (!/'999\.practice\.drillfeed'/.test(src) || !/function setDrillFeed\(src\)/.test(src))
  throw new Error('the source switch must persist under its own key');
if (!/var drillFeed = 'both';/.test(src))
  throw new Error('both sources feed by default \u2014 the old behavior is the default');
{
  const FEEDS = [{ id: 'both' }, { id: 'felt' }, { id: 'quiz' }];
  let saved = false;
  const setDrillFeed = new Function('drillFeed', 'saveDrillFeed', 'DRILL_FEEDS',
    grab('  function setDrillFeed(', '\n  }') +
    '\nreturn function (src) { var r = setDrillFeed(src); return { r: r, src: drillFeed }; };')(
    'both', function () { saved = true; }, FEEDS);
  if (setDrillFeed('felt').r !== true || setDrillFeed('felt').r !== false)
    throw new Error('the source fires once and refuses its no-op');
  if (!saved) throw new Error('a chosen source must persist');
  if (setDrillFeed('nope').r !== false || setDrillFeed(3).r !== false)
    throw new Error('an unknown source must not move the switch');
}
{
  const feeds = new Function('drillFeed', 'return function (src) { return drillFeed === \'both\' || drillFeed === src; };');
  if (!feeds('both')('felt') || !feeds('both')('quiz')) throw new Error('both feeds everything');
  if (feeds('felt')('felt') !== true || feeds('felt')('quiz') !== false)
    throw new Error('felt only takes the felt\u2019s tolls');
  if (feeds('quiz')('quiz') !== true || feeds('quiz')('felt') !== false)
    throw new Error('quiz only takes the card\u2019s tolls');
}
if (!/if \(lastCell && drillFeeds\('felt'\)\) \{/.test(src))
  throw new Error('the felt\u2019s hand miss must pass the source gate');
if (!/drillFeeds\('felt'\) && leakMiss\('insurance v ace', cost\)/.test(src))
  throw new Error('the felt\u2019s insurance miss must pass the same gate');
if (!/drillFeeds\('quiz'\) && leakMiss\(k, want\[k\], 'quiz'\)/.test(src))
  throw new Error('the quiz\u2019s blown cards must pass the source gate, marked as recall');
const winRow2 = src.slice(src.indexOf('class="leakwin"'), src.indexOf('class="leakwin"') + 2600);   /* the row now carries four menus */
if (!/Drill feeds: '/.test(winRow2)) throw new Error('the row must label the source menu');
if (winRow2.indexOf('LEAK_DRILLS.map') > winRow2.indexOf('DRILL_FEEDS.map'))
  throw new Error('the source menu rides last in the same row');
if (!/class="df' \+ \(f\.id === drillFeed \? ' on' : ''\)/.test(src))
  throw new Error('the panel must mark the live source');
if (!/classList\.contains\('df'\)[\s\S]{0,120}setDrillFeed\(e\.target\.getAttribute\('data-src'\)\)\) renderLeaks\(\);/.test(src))
  throw new Error('a source pick must retune and redraw');
console.log('drill feeds: both, felt only, or quiz only \u2014 the ledger\u2019s taps shut, its tolls kept');

/* --- the recall share: a class drilled by remembering a card is
       marked apart from one the felt itself caught */
if (!/if \(src === 'quiz'\) leaks\[cell\]\.q = \(leaks\[cell\]\.q \|\| 0\) \+ 1;/.test(src))
  throw new Error('a quiz-fed toll must stamp the recall share on the cell');
if (!/if \(src === 'quiz' && e\.q\) e\.q = Math\.max\(0, e\.q - 1\);/.test(src))
  throw new Error('a relieved quiz toll must take its recall share back');
if (!/if \(src === 'quiz'\) sessionLeaks\[cell\]\.q = \(sessionLeaks\[cell\]\.q \|\| 0\) \+ 1;/.test(src))
  throw new Error('the sitting\u2019s own ledger must carry the share too');
if (!/q: leaks\[k\]\.q \|\| 0/.test(src) || !/cost: map\[k\]\.cost, q: map\[k\]\.q \|\| 0/.test(src))
  throw new Error('both rankings must carry the share to the rows');
if (!/var recall = c\.q \? ' \\u00b7 \\uD83D\\uDCDD '/.test(src) || !/\+ ' by recall'\) : '';/.test(src))
  throw new Error('the rows must badge the recall share');
{
  const leaks = {};
  let saved = 0, graded = 0;
  const miss = extract('leakMiss', 'leaks, weekMark, saveLeaks, gradClock, gradMiss, sessionMiss, document')(leaks,
    function () {}, function () { saved++; }, 0, function () { graded++; }, function () { return true; },
    { getElementById: function () { return null; } });
  miss('hard 15 v 10', 25);
  if (leaks['hard 15 v 10'].q !== undefined || leaks['hard 15 v 10'].n !== 1)
    throw new Error('a felt toll stamps no recall share: ' + JSON.stringify(leaks['hard 15 v 10']));
  miss('hard 15 v 10', 25, 'quiz');
  if (leaks['hard 15 v 10'].q !== 1 || leaks['hard 15 v 10'].n !== 2)
    throw new Error('a quiz toll stamps one recall share: ' + JSON.stringify(leaks['hard 15 v 10']));
  miss('hard 12 v 3', 25, 'quiz');
  const row = rankCells(leaks).filter(c => c.cell === 'hard 15 v 10')[0];
  if (!row || row.q !== 1) throw new Error('the ranking carries the share: ' + JSON.stringify(row));
  const relief = extract('leakRelief', 'leaks, saveLeaks, sessionRelief')(leaks, function () {}, function () {});
  relief('hard 15 v 10', 25, 'quiz');
  if (leaks['hard 15 v 10'].q !== 0 || leaks['hard 15 v 10'].n !== 1)
    throw new Error('relief takes the share, not the felt\u2019s: ' + JSON.stringify(leaks['hard 15 v 10']));
  relief('hard 15 v 10', 25);
  if (leaks['hard 15 v 10'] !== undefined)
    throw new Error('the last toll standing takes the cell, share and all: ' + JSON.stringify(leaks['hard 15 v 10']));
  if (saved < 3 || graded !== 3) throw new Error('every toll still persists and prices: ' + saved + '/' + graded);
}
console.log('the recall share: \ud83d\udcdd by recall marks what the cards caught, \ud83c\udfc0 what the felt did');

/* --- week over week: the pill follows the worst cell --- */
const weekStart = LUCK.weekStart;

const prevWeek = LUCK.prevWeek;
const nextWeek = LUCK.nextWeek;
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
const liFrom = (wb, lk) => (cell, wsn, nw) => LUCK.leakedIn(lk, wb, cell, wsn, nw);
const liFn = liFrom(base, live);
if (liFn('hard 16 v 10', CURR, NOW) !== 30) throw new Error('this week 16 v 10 leaked 160\u2212130 = 30');
if (liFn('hard 16 v 10', LAST, NOW) !== 30) throw new Error('last week 16 v 10 leaked 130\u2212100 = 30');
if (liFn('hard 12 v 2', CURR, NOW) !== 20) throw new Error('this week 12 v 2 leaked 45\u221225 = 20');
if (liFn('hard 16 v 10', new Date(2026, 8, 21).getTime(), NOW) !== null)
  throw new Error('a week never seen leaks nothing known');
console.log('leakedIn: a week\u2019s leak is two snapshots apart \u2014 30 this week, 30 last, 20 beside');

/* --- the sparkline: a cell's weekly leak drawn as a shape, so a
       cell bleeding more each week climbs and a drilled-away one
       fades \u2014 read from the same weekly snapshots the chip uses --- */
/* the walk, the glyphs and the direction live in the SHARED module
   now (the floor delegates, and the live table draws the same one),
   so these exercise LUCK999 itself — the function the floor calls */
if (LUCK.SPARK_WEEKS !== 8) throw new Error('the sparkline window must be named');
const sparkLine = LUCK.sparkLine;
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
const sparkDir = LUCK.sparkDir;
if (sparkDir([100, 50, 0]) !== -1) throw new Error('a falling line reads improving');
if (sparkDir([0, 50, 100]) !== 1) throw new Error('a climbing line reads worsening');
if (sparkDir([5, 5]) !== 0 || sparkDir([9]) !== 0) throw new Error('a flat or lone line reads steady');

/* sparkValues walks the kept weeks, newest last, so the shape is
   the cell's actual weekly leak by subtraction */
function sparkOf(cell, wb, live, nowv) {
  /* the shared walk, over this suite's own ledger reading */
  return LUCK.sparkValues(live, wb, cell, nowv);
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
if (!/var spark = sparkHtml\(c\.cell\);/.test(src))
  throw new Error('each row must draw its own cell\u2019s line, and pass the cell so the line can open');
if (!/class="spark ' \+ \(dir < 0 \? 'down' : dir > 0 \? 'up' : 'flat'\)/.test(src))
  throw new Error('the line must tint by its direction');
if (!/\.leaks \.spark\.down \{ color: #43c98a; \}/.test(src) ||
    !/\.leaks \.spark\.up \{ color: #e2705f; \}/.test(src))
  throw new Error('the line must read green falling, red climbing');
console.log('the sparkline: a falling line reads improving in green, a climbing one red \u2014 from the same weekly snapshots');

/* --- the line opens: a tap unrolls the shape into the figures it
       was drawn from. The shape and the numbers must be ONE series,
       so the ladder is built from the same key walk the line is.  */
function weeksOf(cell, wbm, live, nowv) {
  /* the same shared key walk the line is scaled from — so the
     figures it opens into and the shape beside them are one series */
  return LUCK.sparkWeeks(live, wbm, cell, nowv);
}
const wkWeeks = weeksOf('hard 16 v 10', wb, { 'hard 16 v 10': { n: 1, cost: 45 } }, nowv);
if (wkWeeks.map((w) => w.v).join('|') !== vals.join('|'))
  throw new Error('the ladder and the line must be one series: ' + JSON.stringify(wkWeeks.map((w) => w.v)));
if (!wkWeeks.every((w, i) => i === 0 || w.ws > wkWeeks[i - 1].ws))
  throw new Error('the ladder reads oldest to newest, like the line');
if (wkWeeks.length > 8) throw new Error('the ladder never shows more weeks than the line drew');

const realWeeks = new Function('weekBase', 'leakedIn', 'SPARK_WEEKS',
  grab('  function sparkWeeks(', '\n  }') + '\nreturn sparkWeeks;')(
  wb, liFrom(wb, { 'hard 16 v 10': { n: 1, cost: 45 } }), 8);
const labelFull = grab('  function dayLabel(ts) {', '\n  }') + '\n' +
  grab('  function weekLabel(ws) {', '\n  }');   /* the label delegates to the day
     formatter now — the harness binds both, the page's own way round, so a
     broken delegation fails here rather than silently printing a blank week */
const labelFn = new Function('MONTHS', labelFull + '\nreturn weekLabel;')(
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const detail = new Function('sparkWeeks', 'weekLabel', 'sparkLine', 'sparkValues', 'sparkWeek', 'sparkPage', 'LUCK999',
  grab('  function sparkDetail(', '\n  }') + '\nreturn sparkDetail;')(
  /* the floor's sparkWeeks delegates to the shared walk now, so it
     is handed LUCK999 and this suite's own ledger reading */
  new Function('LUCK999', 'leaks', 'weekBase',
    grab('  function sparkWeeks(', '\n  }') + '\nreturn sparkWeeks;')(LUCK,
    { 'hard 16 v 10': { n: 1, cost: 45 } }, wb),
  labelFn, sparkLine,
  (c, n, b) => LUCK.sparkValues(
    { 'hard 16 v 10': { n: 1, cost: 45 } }, wb, c, n, b), null,
  () => 0,                    /* this fixture reads the newest window */
  LUCK);                      /* the figures share the module's own sign */
const det = detail('hard 16 v 10', nowv);
for (const v of [10, 20, 10, 5]) {
  if (!det.includes('\u2212' + v)) throw new Error('the ladder must print each week\u2019s own chips: ' + det);
}
if (!det.includes('\u221245 over 4 weeks')) throw new Error('the ladder totals its own window: ' + det);
if (det.includes('\u2212160')) throw new Error('the ladder must not print a week the line never drew');
/* the ladder is EXACTLY the line: one figure per drawn step, never
   more (no padding out past the window) and never fewer (no week
   quietly dropped that the shape already showed)              */
if (wkWeeks.length !== vals.length) throw new Error('one figure per step on the line');
const detailSteps = (det.match(/class="sw"/g) || []).length;
if (detailSteps !== vals.length) throw new Error('the ladder prints one figure per step, got ' + detailSteps);
/* a cell with no weekly leak opens nothing \u2014 there is no shape */
if (detail('soft 20 v 6', nowv) !== '') throw new Error('no shape, no ladder');

/* the line is a control, and the figures win over the bar's drill */
if (!/class="sparktap/.test(src) || !/data-spark="' \+ attrT\(cell\)/.test(src))
  throw new Error('the line must be tappable, carrying its cell');
if (!/role="button" tabindex="0" aria-expanded="/.test(src))
  throw new Error('the line must be a keyboard-reachable control that says its state');
if (!/var open = sparkOpen === cell;/.test(src)) throw new Error('the open shape must be marked on the control');
/* on an EV row the line sits INSIDE the bar, and the bar is the tap
   that drills. The line's own branch must therefore be tested first,
   or asking "how much did this bleed?" deals a hand instead.   */
const handler = src.slice(src.indexOf("leakBoxEl.addEventListener('click'"),
  src.indexOf("leakBoxEl.addEventListener('keydown'"));
const iWeek = handler.indexOf("closest('.sparkwk')");
const iSpark = handler.indexOf("closest('.sparktap')");
const iEvtap = handler.indexOf("closest('.evtap')");
const iDrillTap = handler.indexOf("'drilltap'");
if (iWeek < 0 || iSpark < 0 || iEvtap < 0 || iDrillTap < 0)
  throw new Error('the panel must bind the week, the line, the drill tap and the EV bar');
/* a tapped WEEK is the strip's own control, so it is tested first: it is
   the one branch that both opens the figures and asks for the drill */
if (!(iWeek < iSpark && iWeek < iEvtap && iWeek < iDrillTap))
  throw new Error('a tapped week must win over the strip, the bar and the drill tap behind it');
const weekBranch = handler.slice(iWeek, iSpark);
if (!/sparkOpen = wc; sparkWeek = ww;/.test(weekBranch))
  throw new Error('a tapped week must open ITS week\u2019s figures, not the cell\u2019s whole ladder');
if (!/drillNow\(wc\)/.test(weekBranch) || !/renderLeaks\(\)/.test(weekBranch))
  throw new Error('a tapped week must drill that cell and redraw, or it is decoration');
/* and the line's own branch still only opens figures \u2014 the figures win
   over the bar's drill, so asking "how much did this bleed?" never deals
   a hand the player did not ask for                          */
if (!(iSpark < iEvtap && iSpark < iDrillTap))
  throw new Error('a tapped line must open the figures, not drill the cell behind it');
const sparkBranch = handler.slice(iSpark, iEvtap > iDrillTap ? iDrillTap : iEvtap);
if (!/renderLeaks\(\)/.test(sparkBranch) || /drillNow\(/.test(sparkBranch))
  throw new Error('the line\u2019s branch redraws and nothing else');
if (!/sparkWeek = null;/.test(sparkBranch))
  throw new Error('the line alone names no week: a chosen one must not outlive its tap');
/* every week of the strip is its own control, carrying its own week-start,
   and it must be reachable by keyboard like any other control      */
if (!/class="sparkwk'/.test(src) || !/data-week="' \+ w\[i\]\.ws \+/.test(src))
  throw new Error('each week of the strip must be its own tap, carrying its week');
if (!/role="button" tabindex="0" aria-label="/.test(src))
  throw new Error('a week must be a keyboard-reachable control that says which week it is');
const keys = src.slice(src.indexOf("leakBoxEl.addEventListener('keydown'"), src.indexOf("addEventListener('click', function (e) {") + src.lastIndexOf('btnLeaks'));

if (!/closest\('\.sparkwk'\)/.test(keys) || !/drillNow\(gc\)/.test(keys))
  throw new Error('a keyboard landing on a week must open that week\u2019s drill too');
if (!/\.sparkwk\[data-spark="/.test(keys) || !/\.focus\(\)/.test(keys.slice(keys.indexOf("closest('.sparkwk')"), keys.indexOf("closest('.sparktap')"))))
  throw new Error('focus must follow the week it opened, or the keyboard is lost the moment the row is redrawn');
if (!/sparkWeek === w\[i\]\.ws/.test(src))
  throw new Error('the opened week must be the one marked on the strip and on its figure');
if (!/sparkOpen = \(sparkOpen === sc\) \? null : sc;/.test(src))
  throw new Error('tapping the open line closes it, and only one may be open');
/* both surfaces wear it, and each opens its own cell */
if (!/sparkOpen === c\.cell \? sparkDetail\(c\.cell\)/.test(src) ||
    !/sparkOpen === r4\.cell \? sparkDetail\(r4\.cell\)/.test(src))
  throw new Error('the leak row and the EV bar must each open their own cell');
console.log('the line opens: the shape unrolls into the same eight weeks\u2019 own chips, its own total');

function trendOf(weekBaseMap, liveMap) {
  const li = liFrom(weekBaseMap, liveMap);
  return new Function('weekBase', 'leaks', 'weekMark', 'leakedIn', 'prevWeek', 'weekStart', 'LUCK999',
    grab('  function weekTrend(', '\n  }') + '\nreturn weekTrend;')(weekBaseMap, liveMap,
    function () { return CURR; }, li, prevWeek, weekStart, LUCK);
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

/* --- the mastery DATE: when a cell leaves the drill for good, and the
       gold block that lists those rows newest first --- */
const gradBody = grab('  function gradClean(cell) {', '\n  }');
const gradAt = 3, gradMaster = 2;
/* the real gradClean over a stub ledger: GRAD_AT cleans retire a cell,
   a retire ignores cleans until it wakes, and the generation past
   GRAD_MASTER masters \u2014 and it must STAMP the day it did        */
function gradRun(map, cell) {
  return new Function('leaks', 'gradClock', 'GRAD_AT', 'GRAD_MASTER', 'refresherTrim',
    'YANK_KEEP', 'gradGap', 'saveLeaks', 'Date', gradBody + '\nreturn gradClean;')(
    map, 0, gradAt, gradMaster, c => 1, 8, () => 6, () => {}, Date)(cell);
}
function gradCleans(map, cell, times) {
  for (let i = 0; i < times; i++) gradRun(map, cell);
}
function gradWake(map, cell) { map[cell].r = 0; map[cell].back = 0; map[cell].s = 0; }
const gmap = { 'hard 16 v 10': { n: 9, cost: 180, g: 1 } };   /* already one retired generation */
gradCleans(gmap, 'hard 16 v 10', gradAt - 1);                /* not a rung yet */
if (gmap['hard 16 v 10'].r || gmap['hard 16 v 10'].m)
  throw new Error('two cleans must not retire a cell: ' + JSON.stringify(gmap['hard 16 v 10']));
gradRun(gmap, 'hard 16 v 10');                                /* the third: the cell retires */
if (!gmap['hard 16 v 10'].r) throw new Error('a full run of cleans must retire the cell');
if (gmap['hard 16 v 10'].m) throw new Error('the first retirement must not master the cell');
if (typeof gmap['hard 16 v 10'].mt === 'number')
  throw new Error('a retirement is not a mastery: it must not date the cell');
gradCleans(gmap, 'hard 16 v 10', gradAt);                     /* a retire ignores every clean */
if (gmap['hard 16 v 10'].m) throw new Error('a retired cell must not master without a wake');
gradWake(gmap, 'hard 16 v 10');                               /* the refresher is served */
gradCleans(gmap, 'hard 16 v 10', gradAt);                     /* and survives: the cell masters */
const gRow = gmap['hard 16 v 10'];
if (!gRow.m) throw new Error('a second surviving retirement must master the cell: ' + JSON.stringify(gRow));
if (!Number.isFinite(gRow.mt) || gRow.mt <= 0)
  throw new Error('a master must carry the day it mastered: ' + JSON.stringify(gRow));
const before = Date.now();
const gmap2 = { 'hard 12 v 2': { n: 6, cost: 60, g: 2 } };    /* straight onto the last rung */
gradCleans(gmap2, 'hard 12 v 2', gradAt);
if (gmap2['hard 12 v 2'].mt < before)
  throw new Error('the mastery day must be the moment it happened, not an earlier one');
const MONTHS_ = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
console.log('gradClean: the third surviving generation masters AND dates the cell \u2014 ' +
  new Date(gRow.mt).getDate() + ' ' + MONTHS_[new Date(gRow.mt).getMonth()]);

/* the stamp rides the ranking, so the panel can read it */
const wcM = extract('weakestCells', 'leaks, leakWeight, gradClock')(
  { 'soft 13 v Q': { n: 2, cost: 5, ts: now, m: 1, mt: 1700000000000 } }, leakWeight, DRILLS)(now);
if (!wcM.length || wcM[0].mt !== 1700000000000)
  throw new Error('the ranker must carry the mastery day onto the row: ' + JSON.stringify(wcM));
const dayFn = new Function('MONTHS', grab('  function dayLabel(ts) {', '\n  }') + '\nreturn dayLabel;')(MONTHS_);
if (dayFn(new Date(2026, 9, 4).getTime()) !== '4 Oct')
  throw new Error('the mastery day must read short: ' + dayFn(new Date(2026, 9, 4).getTime()));
if (dayFn(new Date(2026, 0, 1).getTime()) !== '1 Jan')
  throw new Error('the short label must not slip on a two-digit month');

/* the gold block: its own ordering, newest mastery first, whatever the ranking said */
const goldOf = extract('masteredNewestFirst', '')();
if (goldOf.length !== 1) throw new Error('the gold block needs one shared ordering helper');
const gold = goldOf([
  { cell: 'old gold', m: 1, mt: 1000 }, { cell: 'live', m: 0, mt: 0 },
  { cell: 'newest gold', m: 1, mt: 9000 }, { cell: 'mid gold', m: 1, mt: 5000 },
  { cell: 'undated gold', m: 1 }
]).map(c => c.cell);
if (gold.join('|') !== 'newest gold|mid gold|old gold|undated gold')
  throw new Error('gold reads newest mastery first, undated last: ' + JSON.stringify(gold));
const goldEmpty = goldOf([{ cell: 'live', m: 0 }]);
if (goldEmpty.length !== 0) throw new Error('no mastered cell, no gold block');
console.log('masteredNewestFirst: gold rows by mastery day, newest first \u2014 a live row never enters the block');

/* wiring: the stamp is written once, the block is drawn under the ranking,
   and the row's badge names the day */
if (!/e\.m = 1;\s*\n\s*e\.mt = Date\.now\(\);/.test(src))
  throw new Error('the mastery write must stamp the day beside the flag it sets');
/* exactly ONE stamp in the page: a miss must never re-date a master, or the
   gold block's "newest first" would silently mean "most recently poked" */
if (/e\.mt = Date\.now\(\);/.test(src.replace(/e\.m = 1;\s*\n\s*e\.mt = Date\.now\(\);/, '')))
  throw new Error('only the mastery write may date a cell: a miss must not re-date a master');
if (!/var goldCells = leakView === 'all' \? masteredNewestFirst\(allCells\) : \[\];/.test(src))
  throw new Error('the gold block must come off the all-time ledger, masters only');
if (!/return \(b\.mt \|\| 0\) - \(a\.mt \|\| 0\);/.test(src))
  throw new Error('gold must sort by the mastery day, newest first');
if (!/var liveCells = leakView === 'session' \? cells : cells\.filter\(function \(c\) \{ return !c\.m; \}\);/.test(src))
  throw new Error('the live rows must drop the masters, so a gold row cannot take a leaking one\u2019s place');
if (!/liveCells\.slice\(0, 5\)\.map\(leakRow\)/.test(src))
  throw new Error('the live ranking keeps its own five rows');
if (!/Mastered \\u00b7 newest first<\/p><ol>/.test(src))
  throw new Error('the gold block must say what it is and how it reads');
if (!/st = ' \\u00b7 \\uD83C\\uDFC5 master' \+ \(c\.mt \? ' \\u00b7 ' \+ dayLabel\(c\.mt\) : ''\)/.test(src))
  throw new Error('a gold row must name the day it mastered, and an undated one must not invent one');
if (!/<ol>' \+ rows \+ '<\/ol>' \+ goldRows \+/.test(src))
  throw new Error('the gold block must sit under the ranking, not inside it');
if (!/\.leaks li\.master \{ color: #d8b56a; \}/.test(src))
  throw new Error('mastered rows wear the gold');
console.log('wiring: one stamp at the mastery write, a gold block under the rows, each gold row dated');

/* the felt hand-off must not drop the day: a merge that kept the flag
   but ate the stamp would silently un-date a gold row */
const msrc = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
if (!/if \(typeof lk\[k\]\.mt === 'number'\) out\[k\]\.mt = lk\[k\]\.mt;/.test(msrc))
  throw new Error('leakMerge must carry the mastery day beside the master flag');
console.log('leakMerge: a felt miss keeps the mastery day a gold row reads by');

/* --- the quiet badge: the classes, not the number ------------------
   “−180 new” answers how much and nothing about where to look, while the
   panel that holds the answer is shut. So the record keeps the names as
   well as the weight, the badge leads with the newest of them, and the
   whole list waits in the button's title. Run the helpers rather than
   match their markup: a badge that named the oldest of the six, or that
   counted the same class twice, would read just as plausible in source. */
const noteSrc = src.slice(src.indexOf('  function unseenNote('), src.indexOf('  function saveUnseen('));
const noteRun = new Function('unseenCells', 'UNSEEN_CELLS_KEEP',
  'var leakUnseen = 0, reelUnseen = 0;\n' + noteSrc +
  '\nreturn { note: unseenNote, forget: unseenForget, cells: unseenCells };')([], 6);
noteRun.note('13 v 2');
noteRun.note('12 v 9');
if (noteRun.cells.join('|') !== '12 v 9|13 v 2')
  throw new Error('the badge must lead with the newest class found, not the first: ' + noteRun.cells.join('|'));
noteRun.note('12 v 9');
noteRun.note('');
if (noteRun.cells.length !== 2)
  throw new Error('a class is news once, and no class at all is news never: ' + noteRun.cells.join('|'));
for (const c of ['10 v J', '9 v 7', '8 v 6', '7 v 5', '6 v 4']) noteRun.note(c);
if (noteRun.cells.length !== 6 || noteRun.cells[0] !== '6 v 4')
  throw new Error('the names must be capped, newest first: ' + noteRun.cells.join('|'));
if (noteRun.cells.indexOf('13 v 2') >= 0)
  throw new Error('the oldest names fall off the list, not pile up');
/* and news spent takes the names with it — a badge that leads with a
   class read an hour ago is worse than no badge at all */
noteRun.forget();
if (noteRun.cells.length !== 0)
  throw new Error('a spent badge must not keep offering the classes it already said');
noteRun.note('5 v 3');
if (noteRun.cells.join('|') !== '5 v 3')
  throw new Error('and the next class found must be the newest one offered');
/* every place the count is zeroed must forget too, or the names outlive
   their own news */
for (const w of ['if (leakUnseen) { leakUnseen = 0; unseenForget(); saveUnseen(); renderCoach(); }',
                 'unseenForget();                    /* ...and the names it was keeping */']) {
  if (src.indexOf(w) < 0) throw new Error('spent news must take its names with it: ' + w);
}
if (grab('  function saveUnseen(', '\n  }').indexOf('cells: unseenCells') < 0)
  throw new Error('the names must be written with the counts, or the badge dies on reload');
/* the badge itself: quiet, named, and counting the rest behind it */
const quietRun = new Function('leakUnseen', 'unseenCells', 'chipsOf',
  grab('  function leakBadge(', '\n  }') + grab('  function leakBadgeTitle(', '\n  }') +
  '\nreturn { b: leakBadge(), t: leakBadgeTitle() };');
const chips = (n) => '\u2212' + Math.round(n);
const q0 = quietRun(0, [], chips);
if (q0.b !== '' || q0.t !== '')
  throw new Error('nothing unseen is no badge and no title');
const q2 = quietRun(120, ['12 v 9', '13 v 2', '9 v 7'], chips);
if (q2.b !== ' \u00b7 12 v 9 +2')
  throw new Error('the badge must name the newest class and count the rest: ' + q2.b);
if (!/\u2212120 chips over 3 classes \(12 v 9, 13 v 2, 9 v 7\)/.test(q2.t))
  throw new Error('the whole list waits in the title, weight first: ' + q2.t);
const q1 = quietRun(1, ['13 v 2'], chips);
if (!/1 class \(13 v 2\)/.test(q1.t)) throw new Error('one class reads as one class: ' + q1.t);
/* a caller who weighed nothing still gets a name, not a bare number */
const qb = quietRun(7, [], chips);
if (qb.b !== ' \u00b7 \u22127 new') throw new Error('with no name to give, the weight must still read: ' + qb.b);
/* and it is a NOTE, never the gold shout — gold is the panel's own open
   state, and this thing is not opening anything */
if (!/#btnLeaks\.note \{ color: rgba\(255,255,255,0\.72\); border-color: rgba\(255,255,255,0\.3\); \}/.test(src))
  throw new Error('the quiet badge must be muted, not gold');
if (src.indexOf('#btnLeaks.new') >= 0)
  throw new Error('the shout is gone: a shut panel holding something is not an alarm');
if (src.indexOf("lb.classList.toggle('note', !leakMode && leakUnseen > 0);") < 0)
  throw new Error('the pill must wear the note while it is shut and holding');
if (src.indexOf("lb.title = leakMode ? '' : leakBadgeTitle();") < 0)
  throw new Error('the list must hang off the button, and only while it is shut');
if (src.indexOf("'\\uD83E\\uDE79 Leaks' + leakBadge()") < 0)
  throw new Error('the badge must ride the pill text, so it is visible with the panel shut');
if (src.indexOf('leakAutoOpen(cost);') >= 0 || src.indexOf('leakAutoOpen(freshChips, ') >= 0)
  throw new Error('every caller must hand over the class it found');
console.log('the quiet badge: the newest class by name, +N behind it, the list in the title \u2014 muted, and spent when read');

console.log('\nsession leaks verified');
