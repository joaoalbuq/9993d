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

/* --- the panel ends on the scorecard (the felt's crossings ride the footer) --- */
if (!/The house refunds each hand\.' \+\s*\n\s*\(feltN \? ' \\uD83C\\uDFB0 ' \+ feltN \+ ' crossed over from the live table\.' : ''\) \+ '<\/p>' \+\s*\n\s*scHtml \+ ixHtml \+ evHtml;/.test(src))
  throw new Error('the scorecard must ride the panel, with the sitting\u2019s discipline beside it');
console.log('panel order: list, fork row, refund note with the crossings — scorecard, discipline, chart');

/* --- each named cell jumps straight into the drill --- */
if (!/class="drilltap" data-cell="' \+ r3\.cell \+ '">' \+ r3\.cell/.test(src))
  throw new Error('the scorecard must name each cell as a drill tap');
if (!/var name = e && e\.m[\s\S]{0,40}?'<b>' \+ r3\.cell/.test(src))
  throw new Error('a mastered cell must keep its name and lose the tap');
if (!/Tap a cell to drill it first\./.test(src) || !/Tap a cell to drill it\./.test(src))
  throw new Error('the scorecard must invite the tap');
console.log('the tap: each named cell is a drill hand-off \u2014 mastered cells stay names, not buttons');

/* --- the EV-left chart: each named cell's recoverable chips --- */
const evFull = grab('  function evLeft(sc) {', '\n  }');
const evLeft = new Function('return function evLeft(sc) {' +
  evFull.slice(evFull.indexOf('{') + 1, evFull.lastIndexOf('}')) + '}')();
if (evLeft(null) !== null) throw new Error('no scorecard, no chart');
if (evLeft({ total: 0, rows: [] }) !== null) throw new Error('no rows, no chart');
const chart = evLeft({ total: 100, rows: [
  { cell: 'hard 16 v 10', cost: 60 }, { cell: 'hard 12 v 2', cost: 25 }] });
if (chart.rows.length !== 2) throw new Error('every named cell draws a bar');
if (chart.rows[0].w !== 1) throw new Error('the worst leak is the widest bar');
if (Math.abs(chart.rows[1].w - 25 / 60) > 1e-9) throw new Error('the next bar scales to it: ' + chart.rows[1].w);
if (chart.rows[1].cum !== 85 || chart.cum !== 85) throw new Error('the recovery runs cumulative: ' + chart.cum);
if (chart.total !== 100) throw new Error('the total rides along for the tail');
console.log('evLeft: 16 v 10 (60) full bar, 12 v 2 (25) scaled to 42% \u2014 +85 back cumulative');

/* --- the chart rides under the scorecard --- */
if (!/<div class="evleft"><p class="evtitle">EV left on the table<\/p>' \+ bars \+/.test(src))
  throw new Error('the EV-left chart must ride under the scorecard');
if (!/evbar"><i style="width:' \+ Math\.round\(100 \* r4\.w\)/.test(src))
  throw new Error('each bar must scale to the worst leak');
if (!/Fix ' \+ \(ev\.rows\.length === 1 \? 'it' : 'all ' \+ ev\.rows\.length\)/.test(src))
  throw new Error('the tail must name what fixing the cut recovers');
if (!/behind > 0\.5 \? ' \\u00b7 ' \+ Math\.round\(behind\) \+ ' still behind the rest\.' : '\.'/.test(src))
  throw new Error('the tail must name what hides behind the cut');
if (!/\.leaks \.evrow \.evbar i \{ display: block; height: 100%; background: #e2705f; \}/.test(src))
  throw new Error('the bars must wear the house red');
console.log('wiring: the bars scale, the tail totals, the money that waits behind the cut is named');

/* --- and the bars drill: tapping one drops into the cell --- */
if (!/var mast = leaks\[r4\.cell\] && leaks\[r4\.cell\]\.m;/.test(src) || !/mast \? '' : ' evtap'/.test(src))
  throw new Error('an EV bar must be a tap, and a mastered cell must keep no tap');
if (!/e\.target\.closest\('\.evtap'\)\)/.test(src) ||
    !/e\.target\.closest\('\.evtap'\)\.getAttribute\('data-cell'\)/.test(src))
  throw new Error('a tapped EV bar must route to drillNow');
if (!/Tap a bar to drill it\./.test(src)) throw new Error('the chart must say its bars drill');
if (!/\.leaks \.evrow\.evtap \{ cursor: pointer; \}/.test(src))
  throw new Error('an EV bar that drills must read as a control');
console.log('the bars drill: a tapped bar drops straight into that cell, mastered bars keep no tap');

/* --- the bars grow in, and each carries its week over week --- */
if (!/@keyframes evgrow \{ from \{ width: 0%; \} \}/.test(src) ||
    !/\.leaks \.evleft \.evbar i \{ animation: evgrow 0\.55s ease-out both; \}/.test(src))
  throw new Error('the EV bars must grow in as the review opens');
const body = (anchor) => { const f = grab(anchor, '\n  }'); return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')); };
function weekHarness(leaksBox, base) {
  const weekStart = new Function('return function weekStart(ms) {' + body('  function weekStart(ms) {') + '}')();
  const prevWeek = new Function('return function prevWeek(ws) {' + body('  function prevWeek(ws) {') + '}')();
  const nextWeek = new Function('return function nextWeek(ws) {' + body('  function nextWeek(ws) {') + '}')();
  const leakedIn = new Function('leaks', 'weekBase', 'weekStart', 'nextWeek',
    'return function leakedIn(cell, ws, now) {' + body('  function leakedIn(cell, ws, now) {') + '}')(
    leaksBox, base, weekStart, nextWeek);
  const weekSplit = new Function('leaks', 'weekBase', 'weekStart', 'prevWeek', 'leakedIn',
    'return function weekSplit(cell, now) {' + body('  function weekSplit(cell, now) {') + '}')(
    leaksBox, base, weekStart, prevWeek, leakedIn);
  const weekDir = new Function('leaks', 'weekBase', 'weekSplit',
    'return function weekDir(cell, now) {' + body('  function weekDir(cell, now) {') + '}')(
    leaksBox, base, weekSplit);
  return { weekStart: weekStart, prevWeek: prevWeek, weekSplit: weekSplit, weekDir: weekDir };
}
const now = Date.now();
const probe = weekHarness({}, {});
const curW = probe.weekStart(now), prevW = probe.prevWeek(curW);
function dirWith(base, cost) {
  const h = weekHarness({ 'hard 16 v 10': { n: 2, cost: cost } }, base);
  return h.weekDir('hard 16 v 10', now);
}
if (dirWith({}, 0) !== null) throw new Error('no baseline, no marker');
if (dirWith({ [prevW]: {}, [curW]: { 'hard 16 v 10': 40 } }, 45) !== -1)
  throw new Error('leaking less than last week reads improving');
const chips = weekHarness({ 'hard 16 v 10': { n: 2, cost: 45 } },
  { [prevW]: {}, [curW]: { 'hard 16 v 10': 40 } }).weekSplit('hard 16 v 10', now);
if (!chips || Math.round(chips.now) !== 5 || Math.round(chips.was) !== 40 || chips.dir !== -1)
  throw new Error('the split must name the chips: ' + JSON.stringify(chips));
if (dirWith({ [prevW]: { 'hard 16 v 10': 0 }, [curW]: { 'hard 16 v 10': 0 } }, 30) !== 1)
  throw new Error('leaking more than last week reads worsening');
if (dirWith({ [prevW]: { 'hard 16 v 10': 0 }, [curW]: { 'hard 16 v 10': 10 } }, 20) !== 0)
  throw new Error('matching last week reads flat');
if (!/var d = weekDir\(r4\.cell\);/.test(src) ||
    !/'<span class="evdir ' \+ \(d < 0 \? 'down' : d > 0 \? 'up' : 'flat'\)/.test(src))
  throw new Error('each bar must carry its week-over-week direction');
if (!/\.leaks \.evrow \.evdir\.down \{ color: #43c98a; \}/.test(src) ||
    !/\.leaks \.evrow \.evdir\.up \{ color: #e2705f; \}/.test(src))
  throw new Error('the marker must read green improving, red worsening');
console.log('the bars grow in, and each weighs this week against last: \u25BC improving, \u25B2 worsening, \u00b7 flat');

console.log('\nreview scorecard verified');

/* --- the live table carries the same chart, off its own sitting --- */
const tsrc = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
function tgrab(a, b) {
  const i = tsrc.indexOf(a), j = tsrc.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('table anchor miss: ' + a);
  return tsrc.slice(i, j + b.length);
}
function tbody(anchor) { const f = tgrab(anchor, '\n  }'); return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')); }
const scoreT = new Function('return function scoreT(map) {' + tbody('  function scoreT(map) {') + '}')();
const evLeftT = new Function('scoreT', 'tSession',
  'return function evLeftT() {' + tbody('  function evLeftT() {') + '}')(scoreT, {});
const tFold = scoreT({ 'hard 16 v 10': { n: 2, cost: 60 }, 'hard 12 v 2': { n: 1, cost: 25 } });
if (!tFold || tFold.total !== 85 || tFold.cells !== 2) throw new Error('the felt fold must total the sitting');
if (tFold.rows.length !== 1 || tFold.rows[0].cell !== 'hard 16 v 10')
  throw new Error('the cut must stop once 60% of the loss is named: ' + JSON.stringify(tFold.rows));
if (scoreT({}) !== null) throw new Error('a clean sitting draws no chart');
const tChart = new Function('scoreT', 'tSession',
  'return function evLeftT() {' + tbody('  function evLeftT() {') + '}')(scoreT,
  { 'hard 16 v 10': { n: 2, cost: 60 }, 'hard 12 v 2': { n: 1, cost: 25 } })();
if (!/class="evleft"/.test(tChart) || !/EV left on the table/.test(tChart)) throw new Error('the table chart must title itself');
if (!/<span class="evbar"><i style="width:100%"><\/i><\/span>/.test(tChart) || !/<b>\u221260<\/b>/.test(tChart))
  throw new Error('the fewest-bar must scale to the worst and name its cost: ' + tChart);
if (!/Fix it: \+60 back \u00b7 25 still behind the rest\./.test(tChart))
  throw new Error('the table tail must name the recovery: ' + tChart);
console.log('table evLeft: the felt sitting folds to its worst cell and names the recovery');

/* --- wiring: the sitting's cells, the overlay, the grow-in --- */
if (!/var tSession = \{\};/.test(tsrc)) throw new Error('the table must keep its own sitting');
if (!/tSession\[cellT\]\.cost \+= cost;/.test(tsrc) || !/tSession\[cellT\]\.n\+\+;/.test(tsrc))
  throw new Error('a felt miss must land in the sitting fold, not only the ledger');
if (!/html \+= evLeftT\(\);/.test(tsrc) ||! /var strip = LUCK999\.stripLine\(trainStats, crossT\.fire\);/.test(tsrc))
  throw new Error('the overlay must draw the recoverable chart under the strip');
if (!/\.training \.evleft \.evrow \.evbar i \{ display: block; height: 100%; background: #e2705f;/.test(tsrc) ||
    !/@keyframes evgrow \{ from \{ width: 0%; \} \}/.test(tsrc))
  throw new Error('the table bars must wear the house red and grow in');
if (!/\.training \.evleft \{/.test(tsrc) || !/\.training \.evleft \.evtotal \{/.test(tsrc))
  throw new Error('the table chart must be styled');
console.log('wiring: the felt sitting folds, the overlay draws it, the bars grow in red');

console.log('\ntable ev-left verified');
