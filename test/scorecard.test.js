/* The session review's scorecard: the reel folds into the few
   cells behind most of the loss — Pareto's cut. The fold is the
   property under test: cells named exactly like the ledger,
   costs summed, the cut stopping once most of the money is
   accounted for, and the panel ending on the scorecard.     */
'use strict';
const fs = require('fs');
const path = require('path');
const LUCK = require(path.join(__dirname, '..', 'luck999.js'));   /* the shared module both pages load */
const LUCK_SRC = fs.readFileSync(path.join(__dirname, '..', 'luck999.js'), 'utf8');
const luckSrc = fs.readFileSync(path.join(__dirname, '..', 'luck999.js'), 'utf8');
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
if (!/The house refunds each hand\.' \+\s*\n\s*\(feltN \? ' \\uD83C\\uDFB0 ' \+ feltN \+ ' crossed over from the live table\.' : ''\) \+ '<\/p>' \+\s*\n\s*scHtml \+ luckHtml \+ ixHtml \+ evHtml;/.test(src))
  throw new Error('the scorecard must ride the panel, with the closing luck and the sitting\u2019s discipline beside it');
console.log('panel order: list, fork row, refund note with the crossings — scorecard, closing luck, discipline, chart');

/* --- the session's CLOSING luck: the strip reads it live, and this
       grades it and KEEPS it, so a run that finished good (or cold)
       can be read back and set beside the closing before it ---- */
if (!/'999\.practice\.lucklast'/.test(src) || !/function saveLuckClose\(\)/.test(src))
  throw new Error('the closing reading must persist beside the far ends');
if (!/localStorage\.setItem\('999\.practice\.lucklast', JSON\.stringify\(luckClose\)\)/.test(src))
  throw new Error('the closing must be stored under its own key, whole');
/* the existence test is the rounds field ALONE \u2014 a closing exists or it
   does not, and no other figure decides that \u2014 while every field it does
   carry is repaired one at a time, so one unreadable number inside a
   closing cannot cost the player its extremes and its companion. This
   pin used to ask for the opposite (rounds AND ev AND felt, or the whole
   record is dropped), which is the all-or-nothing fault the audit fixed. */
if (!/typeof lcRaw === 'object' && typeof lcRaw\.rounds === 'number' && lcRaw\.rounds > 0/.test(src) ||
    !/luckClose = LUCK999\.numInto\(lcRaw, \{/.test(src) ||
    !/sd2: 0,\n        hi: null, lo: null, hiAt: null, loAt: null,\n        hiEv: null, hiFelt: null, hiSd2: null, loEv: null, loFelt: null, loSd2: null,\n        at: 0, was: null \}\)/.test(src))
  throw new Error('a stored closing must be one this page can grade, field by field');
{
  /* the commit itself: an unpriced session closes on nothing, the same
     book read twice is one closing, and a changed book keeps the one
     before it beside it                                          */
  const full = grab('  function closeLuck() {', '\n  }');
  const inner = full.slice(full.indexOf('{') + 1, full.lastIndexOf('}'));
  const run = (evS, range, cur) => {
    let saved = false;
    const f = new Function('evSession', 'luckRange', 'luckClose', 'saveLuckClose',
      'return function closeLuck() {' + inner + '}')(evS, range, cur, () => { saved = true; });
    return [f(), () => saved];
  };
  const range = { hi: 2.1, lo: -1.4, hiAt: 9, loAt: 3 };
  const priced = { rounds: 12, ev: -40, felt: 60, sd2: 900 };
  const first = run(priced, range, null)[0];
  if (!first || first.rounds !== 12 || first.ev !== -40 || first.felt !== 60 || first.sd2 !== 900)
    throw new Error('the closing must keep the raw book it grades: ' + JSON.stringify(first));
  if (first.hi !== 2.1 || first.lo !== -1.4 || first.hiAt !== 9 || first.loAt !== 3)
    throw new Error('the closing must carry the session’s far ends beside it');
  if (first.was !== null) throw new Error('a first closing has nothing before it');
  if (!run(priced, range, null)[1]()) throw new Error('a closing must persist');
  const same = run(priced, range, first);
  if (same[0] !== first) throw new Error('the same book read twice is one closing, not two');
  if (same[1]()) throw new Error('re-reading the same book must not rewrite the store');
  const moved = run({ rounds: 14, ev: -70, felt: 10, sd2: 900 }, range, first);
  if (moved[0].was == null || moved[0].was.rounds !== 12 || moved[0].was.felt !== 60)
    throw new Error('a new closing must keep the one before it: ' + JSON.stringify(moved[0].was));
  if (moved[0].was.was !== undefined) throw new Error('the chain must not nest forever');
  const bare = run({ rounds: 0, ev: 0, felt: 0, sd2: 0 }, range, first);
  if (bare[0] !== first || bare[1]())
    throw new Error('an unpriced session has no gap to close, and must not overwrite one');
}
/* the grade: the same band and sigma the pill reads, plus a sentence,
   and a scorecard that says nothing is graded rather than blank */
if (!/function luckVerdict\(s\) \{/.test(src) || !/z >= 1 \? 'the book ran with you' : z <= -1 \? 'the book ran against you' : 'the book broke even with you'/.test(src))
  throw new Error('the closing must be graded in words, from the same z the bands come from');
if (!/Closing luck: <b class="luck' \+/.test(src) ||
    !/lc\.was \? ' The closing before it read ' \+ LUCK999\.word\(lc\.was\)/.test(src))
  throw new Error('the scorecard must show the gap, and the closing it followed');
if (!/No closing luck yet \\u2014 nothing priced this session, so there /.test(src))
  throw new Error('an ungraded session must say so rather than sit blank');
if (!/var lc = closeLuck\(\);/.test(src) || !/scHtml \+ luckHtml \+ ixHtml \+ evHtml;/.test(src))
  throw new Error('the review must fold the closing in beside the scorecard');
if (!/\.drillnow\.luckclose b \{ color: #d8b56a; \}/.test(src))
  throw new Error('the kept closing reads as a kept figure');
if (!/if \(!replay\.length\) \{\s*\n\s*\/\* no misses to replay[\s\S]*?var lcBare = closeLuck\(\);/.test(src) ||
    src.indexOf("box.innerHTML = '<h3>Session review</h3>' + reelNoteHtml() + (lcBare ? luckCloseHtml(lcBare) :") < 0)
  throw new Error('an empty reel must still read the stored closing \u2014 a fresh shoe empties the hands, not the report');
console.log('closing luck: the gap graded and stored beside the scorecard, with the closing before it');

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
const STAGGER = Number(/var EV_BAR_STAGGER = (\d+);/.exec(src)[1]);
const evLeft = new Function('EV_BAR_STAGGER', 'return function evLeft(sc) {' +
  evFull.slice(evFull.indexOf('{') + 1, evFull.lastIndexOf('}')) + '}')(STAGGER);
if (evLeft(null) !== null) throw new Error('no scorecard, no chart');
if (evLeft({ total: 0, rows: [] }) !== null) throw new Error('no rows, no chart');
const chart = evLeft({ total: 100, rows: [
  { cell: 'hard 16 v 10', cost: 60, n: 3 }, { cell: 'hard 12 v 2', cost: 25, n: 1 }] });
if (chart.rows.length !== 2) throw new Error('every named cell draws a bar');
if (chart.rows[0].w !== 1) throw new Error('the worst leak is the widest bar');
if (Math.abs(chart.rows[1].w - 25 / 60) > 1e-9) throw new Error('the next bar scales to it: ' + chart.rows[1].w);
if (chart.rows[1].cum !== 85 || chart.cum !== 85) throw new Error('the recovery runs cumulative: ' + chart.cum);
if (chart.total !== 100) throw new Error('the total rides along for the tail');
if (chart.rows[0].n !== 3 || chart.rows[1].n !== 1)
  throw new Error('each bar must carry its miss count for the title to name it: ' + JSON.stringify(chart.rows));
console.log('evLeft: 16 v 10 (60) full bar, 12 v 2 (25) scaled to 42% \u2014 +85 back cumulative');

/* --- each bar names itself on hover: the chips behind it, the
       misses the cell carries, and the running recovery --- */
const atFull = grab('  function attrT(s) {', '\n  }');
const attrT = new Function('return function attrT(s) {' +
  atFull.slice(atFull.indexOf('{') + 1, atFull.lastIndexOf('}')) + '}')();
const btFull = grab('  function evBarTitle(r) {', '\n  }');
const evBarTitle = new Function('attrT',
  'return function evBarTitle(r) {' + btFull.slice(btFull.indexOf('{') + 1, btFull.lastIndexOf('}')) + '}')(attrT);
if (evBarTitle(chart.rows[0]) !== 'hard 16 v 10 \u00b7 \u221260 chips behind this bar \u00b7 3 misses in this cell \u00b7 60 back if you fix every bar down to here')
  throw new Error('the first bar must name its chips, its misses and the recovery: ' + evBarTitle(chart.rows[0]));
if (evBarTitle(chart.rows[1]) !== 'hard 12 v 2 \u00b7 \u221225 chips behind this bar \u00b7 1 miss in this cell \u00b7 85 back if you fix every bar down to here')
  throw new Error('the second bar must read singular and cumulative: ' + evBarTitle(chart.rows[1]));
/* a cell name is ledger data, and the title is an attribute */
if (evBarTitle({ cell: 'a"b<c>&d', cost: 1, n: 2, cum: 1 }).indexOf('a&quot;b&lt;c&gt;&amp;d') !== 0)
  throw new Error('a cell name must be escaped for the attribute: ' + evBarTitle({ cell: 'a"b<c>&d', cost: 1, n: 2, cum: 1 }));
if (!/<div class="evrow' \+ \(mast \? '' : ' evtap'\) \+ '"' \+\n\s*\(mast \? '' : ' data-cell="' \+ r4\.cell \+ '"'\) \+\n\s*' title="' \+ evBarTitle\(r4\) \+ '">/.test(src))
  throw new Error('every drawn bar must carry its title, mastered or not');
console.log('the bar title: chips behind it \u00b7 misses in the cell \u00b7 the running recovery \u2014 escaped for the attribute');

/* --- the chart drill's own scoreboard: what one hand of the cell
       actually kept, now that the free hand books nothing at all --- */
const drFull = grab('  function drillRecall(cell) {', '\n  }');
const dr = new Function('leaks', 'return function drillRecall(cell) {' +
  drFull.slice(drFull.indexOf('{') + 1, drFull.lastIndexOf('}')) + '}')(
  { 'hard 16 v 10': { n: 7, cost: 120.0139 }, 'soft 15 v 4': { n: 2, cost: 40 } });
if (dr('hard 16 v 10').n !== 7 || Math.abs(dr('hard 16 v 10').standing - 120.0139) > 1e-9)
  throw new Error('the recall must be the cell\u2019s own standing: ' + JSON.stringify(dr('hard 16 v 10')));
if (dr('hard 13 v Q').n !== 0 || dr('hard 13 v Q').standing !== 0)
  throw new Error('a cell with no ledger entry reads as nothing lost');
const capWord = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const drlFull = grab('  function drillReportLine(r) {', '\n  }');
const ledger = { 'hard 16 v 10': { n: 7, cost: 120.0139 } };
const drillReportLine = new Function('leaks', 'capWord', 'return function drillReportLine(r) {' +
  drlFull.slice(drlFull.indexOf('{') + 1, drlFull.lastIndexOf('}')) + '}')(ledger, capWord);
if (drillReportLine(null) !== '') throw new Error('no report, no line');
const kept = drillReportLine({ cell: 'hard 16 v 10', ok: true, book: 'hit', choice: 'hit',
  cost: 0, gave: 120.0139 / 7, standing: 120.0139, n: 7 });
if (!/class="drillscore ok"/.test(kept)) throw new Error('a correct drill must read green: ' + kept);
if (!/\+17\.1 kept<\/span> \u2014 one miss\u2019 share of its \u2212120, nothing added/.test(kept))
  throw new Error('the kept line must name the share and the standing: ' + kept);
if (!/it now stands at \u2212120 across 7 misses\./.test(kept))
  throw new Error('the line must end on where the cell stands now: ' + kept);
const added = drillReportLine({ cell: 'hard 16 v 10', ok: false, book: 'stand', choice: 'hit',
  cost: 8.24, gave: 0, standing: 120.0139, n: 7 });
if (!/class="drillscore out"/.test(added)) throw new Error('a deviation must read red: ' + added);
if (!/\u2717 Hit against the book\u2019s Stand \u00b7 <span class="sc">\u22128\.2 added, nothing kept<\/span>/.test(added))
  throw new Error('the deviation line must name what it added: ' + added);
const nopriced = drillReportLine({ cell: 'hard 16 v 10', ok: false, book: 'hit', choice: 'stand',
  cost: 0.0001, gave: 0, standing: 120.0139, n: 7 });
if (/\u22120\.0/.test(nopriced) || !/nothing added, nothing kept<\/span> \u2014 the book could not price the difference/.test(nopriced))
  throw new Error('an unpriceable difference must say so, not print zero: ' + nopriced);
ledger['hard 16 v 10'] = { n: 8, cost: 128.2539 };
if (!/it now stands at \u2212128 across 8 misses\./.test(drillReportLine({ cell: 'hard 16 v 10', ok: false,
  book: 'stand', choice: 'hit', cost: 8.24, gave: 0, standing: 120.0139, n: 7 })))
  throw new Error('the closing standing must be the ledger AFTER this hand');
ledger['hard 16 v 10'] = { n: 7, cost: 120.0139 };
console.log('the drill scoreboard: a book play keeps 17.1 and adds nothing; a deviation adds its cost and keeps none');

/* the wiring: the baseline is read BEFORE the ledger takes the miss,
   the report is set, and the panel is redrawn at once \u2014 a correct
   play books nothing, so nothing else would redraw it           */
const cv = grab('  function coachVerdict(choice) {', '\n  }');
const snapAt = cv.indexOf('var drillBefore =');
const missAt = cv.indexOf('leakMiss(lastCell, cost)');
if (snapAt < 0) throw new Error('the verdict must snapshot the cell');
if (snapAt > missAt) throw new Error('the baseline must be read BEFORE the ledger takes the miss');
if (!/drillChart && lastCell === drillChart\.cell/.test(cv))
  throw new Error('only the cell the BAR named is scored, not any hand');
if (!/gave: ok && drillBefore\.n > 0 \? drillBefore\.standing \/ drillBefore\.n : 0/.test(cv))
  throw new Error('what a correct play keeps is one miss\u2019 share of the cell');
if (!/drillChart = null;/.test(cv)) throw new Error('the chart drill is scored once');
if (!/renderLeaks\(\);/.test(cv.slice(cv.indexOf('if (drillBefore)'), cv.indexOf('saveCoach();'))))
  throw new Error('the readout must redraw the panel NOW, not on the next hand');
if (!/drillChart = \{ cell: cell \};/.test(src) || !/drillReport = null;/.test(src))
  throw new Error('the tap must name the cell and clear the last readout');
if (!/drillChart = null;/.test(grab('  function newRound() {', '\n  }')))
  throw new Error('an abandoned chart drill must not score a later hand');
if (!/<h3>Session review<\/h3>' \+ reelNoteHtml\(\) \+ drillReportLine\(drillReport\)/.test(src) ||
    !/<h3>Where the chips leak<\/h3>' \+ drillReportLine\(drillReport\)/.test(src))
  throw new Error('the readout must ride both panel views');
if (!/\.leaks \.drillscore\.ok \{ border-left: 2px solid #43c98a; \}/.test(src) ||
    !/\.leaks \.drillscore\.out \{ border-left: 2px solid #e2705f; \}/.test(src))
  throw new Error('the readout must wear the house sign colours');
console.log('wiring: the baseline is read before the miss, the readout lands at once, on both views');

/* --- the bar wears its cell's own eight weeks: the bar says HOW
       MUCH, the line says whether it is getting worse           --- */
const barFull = grab("var bars = ev.rows.map(function (r4) {", "}).join('');");
if (!/var spark = sparkHtml\(r4\.cell\);/.test(barFull))
  throw new Error('each bar must draw its own cell\u2019s line, and pass the cell so the line can open');
if (barFull.indexOf('sparkHtml(r4.cell)') > barFull.indexOf("return '<div class=\"evrow"))
  throw new Error('the line must be drawn before the row that wears it');
if (!/\+ spark \+/.test(barFull)) throw new Error('the line must be drawn into the row');
/* the window and the walk now live in the SHARED module, so both
   felts draw one series; the bar's line still reads the SAME weekly
   snapshots the chip does, because LUCK999.leakedIn is that reading */
if (LUCK.SPARK_WEEKS !== 8)
  throw new Error('the sparkline window must be eight weeks everywhere it is drawn');
if (!/var l = leakedIn\(lk, wb, cell, keys\[i\], now\);/.test(LUCK_SRC))
  throw new Error('the bar\u2019s line must read the SAME weekly snapshots the chip does');
if (!/return LUCK999\.sparkValues\(leaks, weekBase, cell, now, back\);/.test(src))
  throw new Error('the floor must take its series from the shared walk, not its own');
/* one series, one window: the bar and the leak row cannot disagree.
   Both now name only the cell — the renderer reads the window itself,
   so the line and the figures beside it cannot be drawn from two. */
const sparkWiring = src.match(/sparkHtml\((\w+\.cell)\)/g) || [];
if (sparkWiring.length !== 2 || !sparkWiring.every((w) => /^sparkHtml\(\w+\.cell\)$/.test(w)))
  throw new Error('the bar and the leak row must read one shared series: ' + JSON.stringify(sparkWiring));
/* the window is a PAGE of the whole walk now, not a slice off its end:
   eight shown, everything behind it still reachable */
const sparkFull = LUCK_SRC.slice(LUCK_SRC.indexOf('function sparkAll(lk, wb, cell, now) {'));
if (/keys\.slice\(keys\.length - SPARK_WEEKS\)/.test(sparkFull))
  throw new Error('the window must page the whole walk, never slice the old weeks away');
if (!/var end = a\.length - back \* SPARK_WEEKS;/.test(sparkFull) ||
    !/return a\.slice\(start, end\);/.test(sparkFull))
  throw new Error('one window must be SPARK_WEEKS off the front of the whole walk');
if (!/return LUCK999\.sparkWeeks\(leaks, weekBase, cell, now, back\);/.test(src))
  throw new Error('the floor must walk the shared series, not its own');
if (!/LUCK999\.sparkValues\(lk, wb, cell, now, pg\)/.test(fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8')))
  throw new Error('the table must walk the same shared series as the floor');
console.log('the bar line: eight weeks beside the chips \u2014 the same series the leak row draws, never a second answer');

/* --- the chips count themselves up on the bars' own beat --- */
if (!/var COUNT_MS = 550;/.test(src)) throw new Error('the count-up must ride the bars\u2019 550ms');
if (!/@keyframes evgrow \{ from \{ width: 0%; \} \}/.test(src) ||
    !/animation: evgrow 0\.55s ease-out both;/.test(src))
  throw new Error('the bars\u2019 grow-in is the beat being matched');
if (!/countUp\(box\);[\s\S]{0,140}return;/.test(src))
  throw new Error('the review must start the count as it draws');
/* every counting number carries its own target, and starts at zero */
for (const [pat, what] of [
  [/Math\.round\(r3\.cost\) \+ '">0<\/span>'/, 'the scorecard\u2019s chips'],
  [/Math\.round\(100 \* r3\.cost \/ sc\.total\) \+ '">0<\/span>%\)/, 'the scorecard\u2019s share'],
  [/Math\.round\(r4\.cost\) \+[\s\S]{0,80}'">0<\/span><\/b>'/, 'the bars\u2019 chips']
]) if (!pat.test(src)) throw new Error(what + ' must carry its own target and start at zero');
const cntMarks = src.match(/class="cnt" data-count="/g) || [];
if (cntMarks.length !== 3) throw new Error('exactly three counting figures carry a target: ' + cntMarks.length);
/* the landing is armed on a timer: a tab that is not painting gets no
   frames, and a frozen 0 where a chip count belongs is worse than no
   animation at all                                                   */
const cu = grab('  function countUp(box) {', '\n  }');
if (!/setTimeout\(land, last \+ COUNT_MS \+ 80\);/.test(cu))
  throw new Error('the number must land even when the browser throttles its frames');
if (!/var mine = \+\+countT;/.test(cu) || cu.indexOf('++countT') > cu.indexOf('if (!spans.length) return;'))
  throw new Error('a redraw must cancel the tween even when the new panel counts nothing');
if (!/1 - Math\.pow\(1 - Math\.min\(1, \(el - delays\[j\]\) \/ COUNT_MS\), 3\)/.test(cu))
  throw new Error('the curve must be the bars\u2019 own ease-out, not a straight ramp');
if (!/requestAnimationFrame\(frame\)/.test(cu)) throw new Error('the smooth path is frames');
if (!/Math\.round\(targets\[j\] \* e\)/.test(cu))
  throw new Error('the running value must round, so it lands on the figure the markup holds');
/* reduced motion holds both still together */
if (!/prefers-reduced-motion: reduce\) \{[\s\S]{0,300}\.leaks \.evleft \.evbar i \{ animation: none; \}/.test(src))
  throw new Error('the bars must hold still under reduced motion, beside the numbers');
if (!/matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/.test(cu))
  throw new Error('the count must honour reduced motion too');
if (!/\.leaks \.cnt \{ font-variant-numeric: tabular-nums; \}/.test(src))
  throw new Error('the digits must not twitch the line as they swap');
console.log('the count-up: 550ms ease-out, the bars\u2019 own curve, lands on the markup\u2019s figure even with no frames');

/* --- the bars SWEEP: worst leak first, left to right, instead of
       arriving together and leaving the reader to rank them ----- */
if (!(STAGGER > 0)) throw new Error('the stagger must be a real gap between bars');
if (!/delay: i \* EV_BAR_STAGGER/.test(evFull))
  throw new Error('each row\u2019s delay is its own index, times the one step');
/* the sweep is only left-to-right-worst-first if the cut is already
   ordered that way, so that ordering is pinned, not assumed */
const scOrder = grab('  function reviewScorecard(reel) {', '\n  }');
if (!/cells\.sort\(function \(a, b\) \{ return b\.cost - a\.cost; \}\);/.test(scOrder))
  throw new Error('the cut must stay sorted worst-first, or the sweep reads backwards');
const ch3 = evLeft({ total: 100, rows: [
  { cell: 'hard 16 v 10', cost: 60, n: 3 }, { cell: 'hard 12 v 2', cost: 25, n: 1 },
  { cell: 'hard 13 v Q', cost: 15, n: 1 }] });
if (ch3.rows.map((r) => r.delay).join(',') !== '0,' + STAGGER + ',' + (2 * STAGGER))
  throw new Error('the delays must run 0, one step, two steps: ' + ch3.rows.map((r) => r.delay));
if (ch3.rows[0].i !== 0 || ch3.rows[2].i !== 2) throw new Error('each row must carry its own index');
/* the bar and its own figure ride the same delay */
const barFull2 = grab("var bars = ev.rows.map(function (r4) {", "}).join('');");
if (!/'%;animation-delay:' \+ r4\.delay \+ 'ms"><\/i><\/span>'/.test(barFull2))
  throw new Error('the bar must carry its own stagger');
if (!/'" data-delay="' \+ r4\.delay \+ '">0<\/span><\/b>'/.test(barFull2))
  throw new Error('a bar\u2019s chips must wait out the stagger that bar waits out');
if (!/if \(el < delays\[j\]\) \{ spans\[j\]\.textContent = '0'; continue; \}/.test(cu))
  throw new Error('a figure must hold at zero until its own bar starts');
if (!/if \(el < last \+ COUNT_MS\) requestAnimationFrame\(frame\);/.test(cu))
  throw new Error('the loop must run to the end of the sweep, not just the first bar');
console.log('the sweep: delays 0/' + STAGGER + '/' + (2 * STAGGER) + 'ms on a worst-first cut, each figure riding its own bar');

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
  /* the weighing is shared now: the page binds its own ledger and snapshots
     into luck999.js, so this harness binds the same way instead of copying a
     page-local implementation that no longer exists */
  return {
    weekStart: LUCK.weekStart,
    prevWeek: LUCK.prevWeek,
    weekSplit: (cell, n) => LUCK.weekSplit(leaksBox, base, cell, n),
    weekDir: (cell, n) => LUCK.weekDir(leaksBox, base, cell, n),
  };
}
const now = Date.now();
/* ONE source for the week reading. Both pages load luck999.js, so a second
   implementation is not a copy that can be kept in step — it is the drift
   this file exists to prevent. The module owns the arithmetic; each page
   keeps only its own storage binding. */
for (const fn of ['weekStart', 'prevWeek', 'nextWeek', 'leakedIn', 'weekSplit', 'weekDir']) {
  if (typeof LUCK[fn] !== 'function')
    throw new Error('the shared module must carry ' + fn);
  for (const p2 of ['offline.html', 'table-16x9.html']) {
    const body2 = fs.readFileSync(path.join(__dirname, '..', p2), 'utf8');
    const m = body2.match(new RegExp('^  function ' + fn + '\\([\\s\\S]*?\\n  \\}', 'm'));
    if (!m) continue;
    /* a page may keep a BINDING — a wrapper that hands its own ledger and
       snapshots to the shared reading — but never the arithmetic. So the
       whole body must be one delegation, with nothing else in it. */
    const inner = m[0].replace(/^  function [^{]*\{/, '').replace(/\n  \}$/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');        /* the binding may explain itself */
    if (!/^\s*return LUCK999\.[A-Za-z]+\([^;]*\);\s*$/.test(inner))
      throw new Error('the ' + fn + ' math is copied into ' + p2 +
        ' \u2014 a page may only bind it, never re-implement it');
  }
}
for (const gone of ['weekStart', 'prevWeek', 'nextWeek']) {
  if (new RegExp('^  function ' + gone + '\\(', 'm').test(src))
    throw new Error('the floor kept its own ' + gone + ': it is the module\u2019s');
}
const weekTableSrc = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
for (const fn of ['weekStartT', 'prevWeekT', 'nextWeekT', 'leakedInT', 'weekDirT']) {
  if (new RegExp('^  function ' + fn + '\\(', 'm').test(weekTableSrc))
    throw new Error('the table kept its own ' + fn + ': the reading is shared, not copied');
}
/* the table reads the week through the module \u2014 and reads the FIGURES,
   not only the direction: its bar prints this week against last */
if (!/LUCK999\.weekSplit\(lk, wb, cell, now\)/.test(weekTableSrc))
  throw new Error('the table must read the week through the shared module');
if (!/LUCK999\.weekPillHtml\(LUCK999\.weekSplit\(lk, wb, cell, now\)\)/.test(weekTableSrc))
  throw new Error('the table\u2019s marker must be the shared pill over that shared reading');
if (!/return LUCK999\.leakedIn\(leaks, weekBase, cell, ws, now\);/.test(src) ||
    !/return LUCK999\.weekSplit\(leaks, weekBase, cell, now\);/.test(src))
  throw new Error('the floor must bind its own ledger and snapshots into the shared reading');
console.log('the week reading: one implementation in luck999.js, bound by each page to its own storage');
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
/* the chart's marker now carries the week's CHIPS, not only its arrow, and
   it is drawn by the one renderer the leak row also uses \u2014 the old pin
   asked the bar to read a bare direction, which is what this change replaced */
if (!/var wk = weekSplit\(r4\.cell\);/.test(src) || !/spark \+ weekPillHtml\(wk\)/.test(src))
  throw new Error('each bar must carry its week-over-week figures, from the same split the row reads');
if (!/var wkHtml = weekPillHtml\(wk\);/.test(src))
  throw new Error('the leak row and the bar must share one renderer, so they cannot disagree');
const weekPillHtml = new Function('LUCK999', 'return function weekPillHtml(wk) {' +
  body('  function weekPillHtml(wk) {') + '}')(LUCK);
/* the figures themselves: an arrow says which way, never how fast */
const pillDown = weekPillHtml({ now: 8, was: 400, dir: -1 });
if (!/\u25BC 8 v 400/.test(pillDown))
  throw new Error('an improving week must name both weeks\u2019 chips: ' + pillDown);
if (!/class="wk evdir down"/.test(pillDown))
  throw new Error('the marker must be tinted by direction: ' + pillDown);
if (!/\u22128 this week against \u2212400 last week/.test(pillDown))
  throw new Error('the hover must say which figure is which week: ' + pillDown);
const pillUp = weekPillHtml({ now: 400, was: 8, dir: 1 });
if (!/\u25B2 400 v 8/.test(pillUp) || !/class="wk evdir up"/.test(pillUp))
  throw new Error('a worsening week must read red and name both: ' + pillUp);
if (!/\u00b7 12 v 12/.test(weekPillHtml({ now: 12, was: 12, dir: 0 })))
  throw new Error('a flat week must say so in figures');
if (weekPillHtml(null) !== '')
  throw new Error('no basis on either end means no marker, not an empty span');
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
const attrTT = new Function('return function attrTT(s) {' + tbody('  function attrTT(s) {') + '}')();
const evBarTitleT = new Function('attrTT',
  'return function evBarTitleT(cell, cost, n, cum, note) {' + tbody('  function evBarTitleT(cell, cost, n, cum, note) {') + '}')(attrTT);
const tLedgerRead = new Function('return function tLedgerRead() {' + tbody('  function tLedgerRead() {') + '}')();
const drillFeedFelt = new Function('return function drillFeedFelt() {' + tbody('  function drillFeedFelt() {') + '}')();
/* the table keeps only the snapshot READ — the arithmetic is the shared
   module's, so `weekDirT` here IS LUCK.weekDir and cannot drift from the
   floor's copy, because there is no second copy left */
const weekBaseT = new Function('return function weekBaseT() {' + tbody('  function weekBaseT() {') + '}')();
const weekDirT = LUCK.weekDir;
/* the table's own trend renderer, lifted as shipped — so the line the
   chart wears here is the one it draws in the page, not a stand-in */
const evSparkT = new Function('LUCK999', 'attrTT', 'tSparkPage', 'tSparkOpen', 'tSparkWeek',
  'return function evSparkT(lk, wb, cell, now) {'
  + tbody('  function evSparkT(lk, wb, cell, now) {')
  + 'function evSparkPageT(cell, pages) {' + tbody('  function evSparkPageT(cell, pages) {') + '}'
  + 'function weekLabelT(ts) {' + tbody('  function weekLabelT(ts) {') + '}'
  + '}')(LUCK, attrTT, {}, null, null);
const evLeftT = new Function('scoreT', 'tSession', 'evBarTitleT', 'tLedgerRead', 'drillFeedFelt', 'tSeeded', 'tSeedNote', 'attrTT', 'weekBaseT', 'weekDirT', 'LUCK999', 'evSparkT', 'evSparkDetailT', 'tSparkPage',
  'return function evLeftT(sfx) {' + tbody('  function evLeftT(sfx) {') + '}')(scoreT, {},evBarTitleT, tLedgerRead, drillFeedFelt, {}, '', attrTT, weekBaseT, weekDirT, LUCK, evSparkT, () => '', {});
const tFold = scoreT({ 'hard 16 v 10': { n: 2, cost: 60 }, 'hard 12 v 2': { n: 1, cost: 25 } });
if (!tFold || tFold.total !== 85 || tFold.cells !== 2) throw new Error('the felt fold must total the sitting');
if (tFold.rows.length !== 1 || tFold.rows[0].cell !== 'hard 16 v 10')
  throw new Error('the cut must stop once 60% of the loss is named: ' + JSON.stringify(tFold.rows));
if (tFold.rows[0].n !== 2) throw new Error('the felt fold must carry the miss count for the bar to name');
if (scoreT({}) !== null) throw new Error('a clean sitting draws no chart');
const tChart = new Function('scoreT', 'tSession', 'evBarTitleT', 'tLedgerRead', 'drillFeedFelt', 'tSeeded', 'tSeedNote', 'attrTT', 'weekBaseT', 'weekDirT', 'LUCK999', 'evSparkT', 'evSparkDetailT', 'tSparkPage',
  'return function evLeftT(sfx) {' + tbody('  function evLeftT(sfx) {') + '}')(scoreT,
  { 'hard 16 v 10': { n: 2, cost: 60 }, 'hard 12 v 2': { n: 1, cost: 25 } },evBarTitleT, tLedgerRead, drillFeedFelt, {}, '', attrTT, weekBaseT, weekDirT, LUCK, evSparkT, () => '', {})();
if (!/class="evleft"/.test(tChart) || !/EV left on the table/.test(tChart)) throw new Error('the table chart must title itself');
/* the cost is a COUNT SPAN, not a literal: the table's bars grow
   from zero, so the figure beside them counts up on the same beat
   rather than snapping to its value while the bar is still climbing */
if (!/<span class="evbar"><i style="width:100%;animation-delay:0ms"><\/i><\/span>/.test(tChart) ||
    !/<b>\u2212<span class="cnt" data-count="60" data-delay="0">0<\/span><\/b>/.test(tChart))
  throw new Error('the fewest-bar must scale to the worst and count up to its cost: ' + tChart);
/* the trend line rides INSIDE the row, after the cost. This fixture
   carries no weekly snapshots, so it honestly draws neither the line
   nor the week-over-week mark — what is pinned here is that the row
   still closes on its own markup and the cost is still the last
   thing before it, so the line can never break the row's structure */
if (!/<b>\u2212<span class="cnt" data-count="60" data-delay="0">0<\/span><\/b><\/div>/.test(tChart))
  throw new Error('the row must close on its own markup after the cost: ' + tChart);
if (!/Fix it: \+60 back \u00b7 25 still behind the rest\./.test(tChart))
  throw new Error('the table tail must name the recovery: ' + tChart);
/* the felt bar names itself on hover, like the floor's, and says the way in */
if (!/<div class="evrow evtap" data-cell="hard 16 v 10" title="hard 16 v 10 \u00b7 \u221260 chips behind this bar \u00b7 2 misses in this cell \u00b7 60 back if you fix every bar down to here \u00b7 tap to drill this cell at the practice floor">/.test(tChart))
  throw new Error('the table bar must name its chips, its misses, the running recovery and the tap: ' + tChart);
console.log('table evLeft: the felt sitting folds to its worst cell and names the recovery');
console.log('the felt bar names itself on hover: 60 chips behind it, 2 misses, 60 back down to here');

/* --- the felt chart is a way in: a tapped bar seeds the floor's drill --- */
/* the two refusals a row offers before the tap is taken, so the chart never
   shows a button the tap itself would turn down */
const chartWith = (ledger, fed, cell) => new Function('scoreT', 'tSession', 'evBarTitleT', 'tLedgerRead', 'drillFeedFelt', 'tSeeded', 'tSeedNote', 'attrTT', 'weekBaseT', 'weekDirT', 'LUCK999', 'evSparkT', 'evSparkDetailT', 'tSparkPage',
  'return function evLeftT(sfx) {' + tbody('  function evLeftT(sfx) {') + '}')(scoreT,
  { [cell || 'hard 16 v 10']: { n: 2, cost: 60 } }, evBarTitleT, () => ledger, () => fed, {}, '', attrTT, weekBaseT, weekDirT, LUCK, evSparkT, () => '', {})();
const masterChart = chartWith({ 'hard 16 v 10': { n: 2, cost: 60, m: 1 } }, true);
if (!/class="evrow evno"/.test(masterChart) || /data-cell/.test(masterChart) || /tap to drill/.test(masterChart))
  throw new Error('a mastered cell has left the drill for good: its bar must stay a name: ' + masterChart);
const quizChart = chartWith({}, false);
if (!/class="evrow evno"/.test(quizChart) || /tap to drill/.test(quizChart))
  throw new Error('a floor drilled quiz-only must not be offered felt cells: ' + quizChart);
/* the cell name rides into the attribute escaped, as ledger data must */
const escChart = chartWith({}, true, 'hard 16 v <b>');
if (!/data-cell="hard 16 v &lt;b&gt;"/.test(escChart)) throw new Error('the tap must carry its cell, escaped: ' + escChart);
if (!/data-cell="hard 16 v 10"/.test(chartWith({}, true))) throw new Error('the tap must carry its cell');
/* the note says what the tap did, under the chart */
const noteChart = new Function('scoreT', 'tSession', 'evBarTitleT', 'tLedgerRead', 'drillFeedFelt', 'tSeeded', 'tSeedNote', 'attrTT', 'weekBaseT', 'weekDirT', 'LUCK999', 'evSparkT', 'evSparkDetailT', 'tSparkPage',
  'return function evLeftT(sfx) {' + tbody('  function evLeftT(sfx) {') + '}')(scoreT,
  { 'hard 16 v 10': { n: 2, cost: 60 } }, evBarTitleT, () => ({}), () => true, {},
  'hard 16 v 10 \u00b7 named to the practice floor \u2014 its next leak hand deals this cell.', attrTT, weekBaseT, weekDirT, LUCK, evSparkT, () => '', {})();
if (!/<p class="evnote">hard 16 v 10 \u00b7 named to the practice floor \u2014 its next leak hand deals this cell\.<\/p>/.test(noteChart))
  throw new Error('a tap must say what it did: ' + noteChart);
console.log('the felt chart holds back: a mastered cell, and a floor drilled quiz-only, keep no tap');

/* the tap itself: a request stamp, and nothing else. The settle already
   flushed this cell's chips, so a tap must add no money and no miss. */
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
const ledOf = () => JSON.parse(store['999.practice.leaks'] || '{}');
const seedDrillFromBar = new Function('tLedgerRead', 'drillFeedFelt', 'renderTrain', 'tSeeded', 'tSeedNote',
  'return function seedDrillFromBar(cell) {' + tbody('  function seedDrillFromBar(cell) {') + '}')(
  tLedgerRead, drillFeedFelt, () => {}, {}, '');

store['999.practice.leaks'] = JSON.stringify({ 'hard 16 v 10': { n: 4, cost: 300, t: 4, g: 2 } });
seedDrillFromBar('hard 16 v 10');
const seeded = ledOf()['hard 16 v 10'];
if (typeof seeded.qs !== 'number' || seeded.qs <= 0) throw new Error('a tap must stamp a drill request: ' + JSON.stringify(seeded));
if (seeded.n !== 4 || seeded.cost !== 300 || seeded.t !== 4 || seeded.g !== 2)
  throw new Error('a tap must add no miss and no chips, and must keep the row it rides: ' + JSON.stringify(seeded));
console.log('a tapped bar stamps a drill request and invents no loss: 4 misses and 300 chips ride through untouched');

/* a mastered cell and a quiz-only floor are both refused at the tap */
store['999.practice.leaks'] = JSON.stringify({ 'hard 16 v 10': { n: 4, cost: 300, m: 1 } });
seedDrillFromBar('hard 16 v 10');
if (ledOf()['hard 16 v 10'].qs !== undefined) throw new Error('a master must not be stamped back into the drill');
store['999.practice.drillfeed'] = JSON.stringify({ src: 'quiz' });
store['999.practice.leaks'] = JSON.stringify({ 'hard 16 v 10': { n: 4, cost: 300 } });
seedDrillFromBar('hard 16 v 10');
if (ledOf()['hard 16 v 10'].qs !== undefined) throw new Error('a quiz-only floor must not be handed a felt cell');
if (drillFeedFelt() !== false) throw new Error('the floor\'s own switch must be read where the tap happens');
store['999.practice.drillfeed'] = JSON.stringify({ src: 'felt' });
if (drillFeedFelt() !== true) throw new Error('a felt-only floor must take the tap');
store['999.practice.drillfeed'] = JSON.stringify({ src: 'both' });
if (drillFeedFelt() !== true) throw new Error('both feeds must take the tap');
delete store['999.practice.drillfeed'];
if (drillFeedFelt() !== true) throw new Error('a floor from before the switch took everything, and still does');
/* the chart reads the ledger and the switch on every render, so neither read
   may be the thing that breaks the drawing */
store['999.practice.drillfeed'] = 'not json at all';
store['999.practice.leaks'] = 'not json at all';
if (drillFeedFelt() !== true) throw new Error('a corrupt feed switch must leave the chart drawing');
if (Object.keys(tLedgerRead()).length !== 0) throw new Error('a corrupt ledger must read as empty, not throw');
delete store['999.practice.drillfeed']; delete store['999.practice.leaks'];
console.log('the tap refuses what the drill would refuse: a mastered cell, and a quiz-only floor');
console.log('a corrupt ledger or feed switch reads leniently and the chart still draws');

/* the stamp must survive the very next settle, or the tap is a lie */
const leakMerge = new Function('return function leakMerge(lk, miss) {' + tbody('  function leakMerge(lk, miss) {') + '}')();
const merged = leakMerge({ 'hard 16 v 10': { n: 4, cost: 300, t: 4, qs: 12345 } }, { cell: 'hard 16 v 10', cost: 25 });
if (merged['hard 16 v 10'].qs !== 12345) throw new Error('a settle must not eat a tap that is still waiting: ' + JSON.stringify(merged));
if (merged['hard 16 v 10'].n !== 5 || merged['hard 16 v 10'].cost !== 325)
  throw new Error('the settle must still land its own miss: ' + JSON.stringify(merged));
console.log('the next settle merges over the tapped cell and leaves the request standing');

/* --- the floor spends the stamp: one tap, one drill --- */
const osrc = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
function ograb(a, b) {
  const i = osrc.indexOf(a), j = osrc.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('floor anchor miss: ' + a);
  return osrc.slice(i, j + b.length);
}
function obody(anchor) { const f = ograb(anchor, '\n  }'); return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}')); }
const seedTake = new Function('leaks', 'saveLeaks', 'forkQueue',
  'return function seedTake() {' + obody('  function seedTake() {') + '}')(
  { 'hard 16 v 10': { n: 4, cost: 300, qs: 200 }, 'hard 12 v 2': { n: 1, cost: 25, qs: 100 } },
  () => {}, (c) => forced.push(c));
const forced = [];
if (seedTake() !== 2) throw new Error('every stamp on the ledger is a drill waiting');
if (forced.join(',') !== 'hard 12 v 2,hard 16 v 10') throw new Error('the newest tap is the hand dealt at once: ' + forced.join(','));
const spent = { 'hard 16 v 10': { n: 4, cost: 300, qs: 200 }, 'hard 12 v 2': { n: 1, cost: 25, qs: 100 } };
const seedTake2 = new Function('leaks', 'saveLeaks', 'forkQueue',
  'return function seedTake() {' + obody('  function seedTake() {') + '}')(spent, () => {}, () => {});
seedTake2();
if (spent['hard 16 v 10'].qs !== undefined || spent['hard 12 v 2'].qs !== undefined)
  throw new Error('a spent request must not stand: a reload would force the same cell twice');
if (seedTake2() !== 0) throw new Error('a floor with no stamp must take nothing');
if (!/seedTake\(\);/.test(osrc)) throw new Error('the floor must take the stamp as it loads');
console.log('the floor spends the stamp on the way in: newest tap dealt at once, the rest behind it');

/* the wiring: the bar is a button, and the CSS says so */
if (!/\.training \.evleft \.evrow\.evtap \{ cursor: pointer; \}/.test(tsrc) ||
    !/\.training \.evleft \.evrow\.evtap:hover \.evcell \{ color: #d8b56a;/.test(tsrc))
  throw new Error('the felt bars must read as taps');
if (!/closest\('\.training \.evrow\.evtap'\)/.test(tsrc) || !/seedDrillFromBar\(bar\.getAttribute\('data-cell'\)\)/.test(tsrc))
  throw new Error('the overlay must catch a tapped bar and name its cell');
if (!/typeof lk\[k\]\.qs === 'number'\) out\[k\]\.qs = lk\[k\]\.qs;/.test(tsrc))
  throw new Error('the settle merge must carry a waiting request');
console.log('wiring: the felt bar is a button, the overlay catches it, the merge carries it');

/* --- the felt's own session review ------------------------------- */
/* the report repeats the chart, so its ids must not collide with the
   overlay's \u2014 two elements sharing an id is a bug the DOM will not report */
const rvChart = chartWith({}, true, 'hard 16 v 10');
if (!/evLeftT\('R'\);/.test(tsrc)) throw new Error('the report must draw the chart');
if ((tsrc.match(/evLeftT\('R'\)/g) || []).length !== 1) throw new Error('the report draws the chart once');
if (!/id="evFreshSitT' \+ \(sfx \|\| ''\)/.test(tsrc))
  throw new Error('the report chart must carry its own ids, not the overlay\u2019s');
if (!/id\.indexOf\('evFreshSitT'\) === 0/.test(tsrc))
  throw new Error('the report\u2019s own way back must be caught: its id is suffixed');
if (!/id="reviewBox"/.test(tsrc) || !/id="reviewBtn"/.test(tsrc))
  throw new Error('the report needs its own panel and its own way in');
if (!/reviewBtnEl\.addEventListener\('click', function \(\) \{\s*\n\s*tReviewOpen = !tReviewOpen;\s*\n\s*renderReview\(\);/.test(tsrc))
  throw new Error('the review button must open and close the report');
if (!/tReviewOpen\) renderReview\(\);/.test(tsrc))
  throw new Error('the report must ride the overlay redraw, so the two cannot disagree');
/* the report is drawn by the shipped renderReview, against a box we can read */
function reportFor(session, hands, ledger, fed, seeded) {
  const box = { hidden: false, innerHTML: '', style: {}, classList: { toggle() { return true; } },
    getBoundingClientRect: () => ({ bottom: 300 }) };
  const dom = { getElementById: id => (id === 'trainBox' ? null : box) };
  const ses = session || {};
  /* the chart stub answers to the sitting the way the shipped one does: an
     empty session draws nothing at all */
  const chartStub = () => (Object.keys(ses).length ? rvChart : '');
  new Function('tSession', 'feltHandsT', 'evLeftT', 'document', 'tLedgerRead', 'drillFeedFelt',
    'attrTT', 'tSeeded', 'countUp',
    'var tReviewOpen = true;\n' +
    'function renderReview() {' + tbody('  function renderReview() {') + '}\n' +
    'renderReview();')(ses, hands || function () { return []; }, chartStub, dom,
    () => (ledger || {}), () => (fed === undefined ? true : fed), attrTT, seeded || {},
    /* the report arms the count-up on its own chart; stubbed here so
       the suite reads the markup, not the tween */
    () => {});
  return box.innerHTML;
}
/* the empty sitting must say so rather than draw an empty chart */
const rvEmpty = reportFor({});
if (!/No miss yet this sitting/.test(rvEmpty))
  throw new Error('a sitting with no miss must say so: ' + rvEmpty);
if (/class="evrow/.test(rvEmpty)) throw new Error('an empty sitting must not draw bars');
console.log('the report opens empty and says so \u2014 no chart, no invented numbers');

/* a real sitting: the scorecard folds the loss by cell, and the chart rides */
const rvHtml = reportFor({ 'hard 16 v 10': { n: 3, cost: 60 }, 'hard 12 v 2': { n: 1, cost: 40 } });
if (!/max-height: calc\(100vh - 7\.5em\); overflow-y: auto;/.test(tsrc))
  throw new Error('a report taller than the felt must scroll, not run off it');
if (!/Session review/.test(rvHtml)) throw new Error('the report must title itself');
if (!/\u2212100 sits in 2 cells/.test(rvHtml))
  throw new Error('the scorecard must total the sitting\u2019s loss: ' + rvHtml);
/* the scorecard lists the cells costliest first, with each share of the loss */
if (rvHtml.indexOf('hard 16 v 10') > rvHtml.indexOf('hard 12 v 2'))
  throw new Error('the scorecard must list the costliest cell first');
if (!/\u00d73<\/span>/.test(rvHtml) || !/60%<\/span>/.test(rvHtml))
  throw new Error('each scorecard row must carry its miss count and its share: ' + rvHtml);
if (!/\u221260/.test(rvHtml) || !/\u221240/.test(rvHtml))
  throw new Error('each scorecard row must carry its cost: ' + rvHtml);
/* and the chart itself is in there, not just described */
if (!/class="evrow evtap"/.test(rvHtml)) throw new Error('the report must carry the chart: ' + rvHtml);
if (!/Fix it: \+60 back\./.test(rvHtml)) throw new Error('the report must carry the recovery tail');
console.log('the report folds a sitting by cell and carries the same chart');

/* --- the scorecard rows drill too -------------------------------- */
/* the chart under the scorecard already drills. The rows above it name
   the same cells for the same money, so a tap must land in the same
   drill \u2014 otherwise the top of the report is a dead end the player
   can see the bottom of is not */
if (!/class="rvscrow evtap"[^>]*data-cell="hard 16 v 10"/.test(rvHtml))
  throw new Error('a scorecard row must be a tap naming its cell: ' + rvHtml);
if (!/class="rvscrow evtap"[^>]*data-cell="hard 12 v 2"/.test(rvHtml))
  throw new Error('every scorecard row must drill, not just the top one: ' + rvHtml);
if ((rvHtml.match(/rvscrow evtap/g) || []).length !== 2)
  throw new Error('exactly the scorecard rows, once each: ' + rvHtml);
/* the same two refusals the chart makes, in the same place \u2014 a row must
   never offer what the tap beneath it would refuse */
const rvMastered = reportFor({ 'hard 16 v 10': { n: 3, cost: 60 } }, null,
  { 'hard 16 v 10': { m: 1 } });
if (/class="rvscrow evtap"/.test(rvMastered))
  throw new Error('a mastered cell has left the drill; its row keeps no tap: ' + rvMastered);
if (!/class="rvscrow evno"/.test(rvMastered))
  throw new Error('a refused row must say so in its markup, not look dead: ' + rvMastered);
const rvQuiz = reportFor({ 'hard 16 v 10': { n: 3, cost: 60 } }, null, {}, false);
if (/class="rvscrow evtap"/.test(rvQuiz))
  throw new Error('a quiz-only floor keeps no tap on the rows either: ' + rvQuiz);
/* the row says what it is, and says how to get in, on hover */
if (!/title="hard 16 v 10 \u00b7 \u221260 chips behind this cell \u00b7 3 misses \u00b7 60% of the sitting \u00b7 tap to drill this cell at the practice floor"/.test(rvHtml))
  throw new Error('the row must name its own chips, misses, share and way in: ' + rvHtml);
if (!/Tap a row, or a bar below/.test(rvHtml))
  throw new Error('the report must offer both ways in: ' + rvHtml);
/* a cell already named to the floor wears the same mark the chart does */
const rvSeeded = reportFor({ 'hard 16 v 10': { n: 3, cost: 60 } }, null, {}, true,
  { 'hard 16 v 10': 1 });
if (!/class="rvscrow evtap evseeded"/.test(rvSeeded))
  throw new Error('a named cell must stay marked on the row as well as the bar: ' + rvSeeded);
if (!/\.training \.rvscrow\.evtap \{ cursor: pointer;/.test(tsrc) ||
    !/\.training \.rvscrow\.evtap:hover \.rvcell \{ color: #d8b56a;/.test(tsrc))
  throw new Error('the scorecard rows must read as taps');
if (!/closest\('\.training\.review \.rvscrow\.evtap'\)/.test(tsrc) ||
    !/seedDrillFromBar\(srow\.getAttribute\('data-cell'\)\)/.test(tsrc))
  throw new Error('the report must catch a tapped row and name its cell');
console.log('the scorecard rows drill like the bars: same cell, same drill, same refusals');


/* the felt's own hands off the book's line, newest first */
const feltHands = new Function('localStorage',
  'return function feltHandsT() {' + tbody('  function feltHandsT() {') + '}')({
  getItem: k => k === '999.practice.replay' ? JSON.stringify([
    { felt: 1, cell: 'hard 16 v 10', choice: 'hit', book: 'stand', cost: 18 },
    { felt: 1, cell: 'hard 12 v 2', choice: 'hit', book: 'hit' },
    { felt: 1, cell: 'hard 9 v 3', choice: 'stand', book: 'hit', cost: 9 },
    { cell: 'soft 18 v 9', choice: 'hit', book: 'stand' },        /* not the felt's */
    { felt: 1, choice: 'double', book: 'stand', cost: 30 }       /* no cell, still the felt's */
  ]) : null
});
const fh = feltHands();
/* walking the reel backwards: the uncelled double, then 9 v 3, then 16 v 10.
   The floor\u2019s own hand and the felt\u2019s same-play hand are both left out. */
if (fh.length !== 3) throw new Error('only the felt\u2019s own divergences count: ' + JSON.stringify(fh.map(e => e.cell)));
if (fh[0].choice !== 'double' || fh[1].cell !== 'hard 9 v 3' || fh[2].cell !== 'hard 16 v 10')
  throw new Error('the hands must come newest first: ' + JSON.stringify(fh.map(e => e.choice)));
if (!/\.training \.rvhand b \{ color: #d8b56a/.test(tsrc)) throw new Error('the hands must read as the felt\u2019s own');
console.log('the report lists only the felt\u2019s own divergences off the book\u2019s line, newest first');

if (!/id="evCloseReviewT"/.test(tsrc)) throw new Error('the report must be closeable');
console.log('the report is wired: its own panel, its own ids, its own close');

/* --- the sweep and the marker ------------------------------------ */
/* the bars arrive worst-first, a beat apart, so the chart settles as one
   sweep rather than popping row by row */
const sweep = chartWith({}, true, 'hard 16 v 10');
if (!/animation-delay:0ms/.test(sweep)) throw new Error('the first bar must start at once: ' + sweep);
/* four equal cells, so the Pareto cut actually yields three rows to stagger */
const threeRows = new Function('scoreT', 'tSession', 'evBarTitleT', 'tLedgerRead', 'drillFeedFelt', 'tSeeded', 'tSeedNote',
  'attrTT', 'weekBaseT', 'weekDirT', 'LUCK999', 'evSparkT', 'evSparkDetailT', 'tSparkPage',
  'return function evLeftT(sfx) {' + tbody('  function evLeftT(sfx) {') + '}')(scoreT,
  { 'hard 16 v 10': { n: 2, cost: 25 }, 'hard 12 v 2': { n: 1, cost: 25 },
    'hard 9 v 3': { n: 1, cost: 25 }, 'hard 20 v 6': { n: 1, cost: 25 } },
  evBarTitleT, () => ({}), () => true, {}, '', attrTT, weekBaseT, weekDirT, LUCK, evSparkT, () => '', {})();
if ((threeRows.match(/class="evrow/g) || []).length !== 3)
  throw new Error('the fixture must produce a three-row cut: ' + threeRows);
const delays = (threeRows.match(/animation-delay:(\d+)ms/g) || []).join(',');
if (!/animation-delay:0ms/.test(delays) || !/animation-delay:70ms/.test(delays) || !/animation-delay:140ms/.test(delays))
  throw new Error('each bar must wait its own beat: ' + delays);
console.log('the bars sweep in: worst first, 70ms apart, settling as one read');

/* the marker: a cell leaking less than last week wears a green down, more
   wears a red up, level wears a dot \u2014 and an unmeasurable pair wears none */
if (/evdir/.test(sweep)) throw new Error('with no week recorded, no bar may claim a direction: ' + sweep);
const wkNow = Date.now();
const d0 = new Date(wkNow); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));
const cur = d0.getTime(), prev = new Date(cur); prev.setDate(prev.getDate() - 7);
const nx = new Date(cur); nx.setDate(nx.getDate() + 7);
/* this week runs 10 -> 40; last week closed 90 -> 40. The cell is bleeding
   harder now than it was, so the marker must read worse, not better. */
const wb = {};
wb[cur] = { 'hard 16 v 10': 10 };
wb[prev.getTime()] = { 'hard 16 v 10': 40 };
wb[nx.getTime()] = { 'hard 16 v 10': 40 };
const lkNow = { 'hard 16 v 10': { n: 3, cost: 40 } };
if (weekDirT(lkNow, wb, 'hard 16 v 10', wkNow) !== 1)
  throw new Error('a cell leaking 30 this week against 0 last week is worsening');
/* last week ran 10 -> 40 (a 30 bleed), this week has added nothing: better */
wb[prev.getTime()] = { 'hard 16 v 10': 10 };
wb[cur] = { 'hard 16 v 10': 40 };
if (weekDirT(lkNow, wb, 'hard 16 v 10', wkNow) !== -1)
  throw new Error('a cell bleeding nothing this week against 30 last week is improving');
/* both weeks bled nothing: level, and a dot rather than a direction */
wb[prev.getTime()] = { 'hard 16 v 10': 40 };
if (weekDirT(lkNow, wb, 'hard 16 v 10', wkNow) !== 0)
  throw new Error('a cell bleeding nothing in either week is level');
delete wb[prev.getTime()];
if (weekDirT(lkNow, wb, 'hard 16 v 10', wkNow) !== null)
  throw new Error('with no last week to weigh it, the cell must claim nothing');
if (weekDirT(lkNow, {}, 'hard 16 v 10', wkNow) !== null)
  throw new Error('with no weeks at all, the cell must claim nothing');
wb[cur] = { 'hard 16 v 10': 10 };                       /* back to the worsening pair */
wb[prev.getTime()] = { 'hard 16 v 10': 40 };
const marked = new Function('scoreT', 'tSession', 'evBarTitleT', 'tLedgerRead', 'drillFeedFelt', 'tSeeded', 'tSeedNote',
  'attrTT', 'weekBaseT', 'weekDirT', 'LUCK999', 'evSparkT', 'evSparkDetailT', 'tSparkPage',
  'return function evLeftT(sfx) {' + tbody('  function evLeftT(sfx) {') + '}')(scoreT,
  { 'hard 16 v 10': { n: 3, cost: 40 } }, evBarTitleT, () => lkNow, () => true, {}, '', attrTT, () => wb, weekDirT, LUCK, evSparkT, () => '', {})();
/* the marker is now the shared pill: it carries the class AND the figures,
   so it names this week against last week rather than pointing at nothing */
if (!/class="wk evdir up"[^>]*>\u25B2 30 v -30/.test(marked))
  throw new Error('the worsening cell must wear a red up, with its figures: ' + marked);
/* a recovering cell reads NEGATIVE (the leak was smaller than the base), so
   the minus the floor prefixes must not land on a figure carrying its own */
if (/\u2212-/.test(marked)) throw new Error('a negative leak must not be given a second minus: ' + marked);
if (!/30 this week against -30 last week/.test(marked))
  throw new Error('the hover must name both weeks, each with its own sign: ' + marked);
/* the wording is the shared pill's, so both felts say it the same way */
if (!/bleeding more than last week/.test(marked)) throw new Error('the marker must say what it means');
if (!/\.training \.evleft \.evrow \.evdir\.down \{ color: #43c98a; \}/.test(tsrc) ||
    !/\.training \.evleft \.evrow \.evdir\.up \{ color: #e2705f; \}/.test(tsrc))
  throw new Error('the markers must wear the house tones');
console.log('the direction marker: green down, red up, and silence where nothing can be weighed');

/* --- one tap starts the chart over --- */
/* the reset and the chart share one scope, so what is asserted is the thing a
   player sees: a chart drawn, the tap, and no chart. */
const resetBody = tbody('  function resetSittingT() {');
if (/trainStats|localStorage|tLedger|saveT|flushT/.test(resetBody))
  throw new Error('a view reset must reach neither the book nor the floor: ' + resetBody);
const sitState = new Function('attrTT', 'scoreT', 'evBarTitleT', 'tLedgerRead', 'drillFeedFelt', 'renderTrain', 'weekBaseT', 'weekDirT', 'LUCK999', 'evSparkT', 'evSparkDetailT', 'tSparkPage',
  'var tSession = { "hard 16 v 10": { n: 2, cost: 60 } }, tSeeded = { "hard 16 v 10": 123 }, tSeedNote = "named";\n' +
  'function evLeftT(sfx) {' + tbody('  function evLeftT(sfx) {') + '}\n' +
  'function resetSittingT() {' + resetBody + '}\n' +
  'return { chart: function () { return evLeftT(); }, reset: resetSittingT,' +
  ' session: function () { return tSession; }, seeded: function () { return tSeeded; },' +
  ' note: function () { return tSeedNote; } };')(attrTT, scoreT, evBarTitleT, tLedgerRead, drillFeedFelt, () => {}, weekBaseT, weekDirT, LUCK, evSparkT, () => '', {});
if (!/EV left on the table/.test(sitState.chart()) || !/data-cell="hard 16 v 10"/.test(sitState.chart()))
  throw new Error('the chart must be drawn before it can be started over');
const keptLedger = JSON.stringify({ 'hard 16 v 10': { n: 4, cost: 300, t: 4 } });
store['999.practice.leaks'] = keptLedger;
let writes = 0;
const realSet = global.localStorage.setItem;
global.localStorage.setItem = function (k, v) { writes++; return realSet.call(this, k, v); };
sitState.reset();
global.localStorage.setItem = realSet;
if (writes !== 0) throw new Error('starting the chart over must write nothing: ' + writes);
if (store['999.practice.leaks'] !== keptLedger)
  throw new Error('the floor\'s ledger must survive a view reset: ' + store['999.practice.leaks']);
if (Object.keys(sitState.session()).length !== 0) throw new Error('the sitting must be empty after the tap');
if (Object.keys(sitState.seeded()).length !== 0) throw new Error('the taps this sitting made go with it');
if (sitState.note() !== '') throw new Error('the note belongs to the sitting it described');
if (sitState.chart() !== '') throw new Error('a cleared sitting draws no chart: ' + sitState.chart());
console.log('one tap starts the sitting over: the bars go, and the floor keeps every chip');

/* the control lives under the chart it resets, and is its own tap */
if (!/<p class="sitreset"><span class="sitreset-tap" id="evFreshSitT' \+ \(sfx \|\| ''\) \+ '"'/.test(tsrc))
  throw new Error('the chart must carry its own way back');
if (!tsrc.includes('title="start this sitting over \\u2014 the bars and the chips behind them \\u2014 and keep everything else">'))
  throw new Error('the tap must say what it keeps and what it drops');
if (!/\.training \.evleft \.sitreset-tap \{ cursor: pointer;/.test(tsrc))
  throw new Error('the reset must read as a tap');
if (!/if \(e\.target && e\.target\.id === 'evFreshSitT'\) resetSittingT\(\);/.test(tsrc))
  throw new Error('the overlay must catch the sitting reset');
console.log('wiring: the reset sits under its own chart, clear of the book wipe beside it');

/* --- the whole sitting: coach accuracy, the leak ledger and the
   reconciliation, together. Two taps, because this one destroys a
   training record rather than a view. ------------------------------- */
const wholeBody = tbody('  function resetWholeT() {');
if (/999\.practice\.(replay|forks|evsession)/.test(wholeBody))
  throw new Error('the whole sitting must not reach the reel, the forks or the reconciliation book: ' + wholeBody);
if (!/localStorage\.setItem\('999\.practice\.leaks', '\{\}'\)/.test(wholeBody))
  throw new Error('the whole sitting must take the practice floor\'s leak ledger with it: ' + wholeBody);
if (!/trainStats\.decisions = 0; trainStats\.book = 0;/.test(wholeBody))
  throw new Error('coach accuracy must start over with it');
const armBody = tbody('  function armWholeT() {');
const archBody = tbody('  function archiveLuck(why) {');
const box = { wiped: 0, renders: 0, saves: 0, archSaves: 0, writes: [] };
function buildArm(timerSink) {
  const stats = { decisions: 9, book: 4, loss: 120, lossBase: 30, ev: 3, felt: -2, rounds: 3, sd2: 8 };
  const hist = [];
  const fn = new Function('trainStats', 'tOut', 'tSession', 'tSeeded', 'tSeedNote', 'clearT', 'trainMsg',
    'saveT', 'localStorage', 'renderTrain', 'setTimeout', 'luckHist', 'saveLuckHist',
    'var tSitArm = 0, LUCK_HIST_MAX = 6;\n' +
    'function archiveLuck(why) {' + archBody + '}\n' +
    'function resetWholeT() {' + wholeBody + '}\n' +
    'function armWholeT() {' + armBody + '}\n' +
    'return { tap: function () { armWholeT(); }, armed: function () { return tSitArm; },' +
    ' hist: function () { return luckHist; } };')(
    stats, null, { a: 1 }, { a: 1 }, 'note', () => {}, 'msg',
    () => { box.saves++; },
    { setItem: (k, v) => box.writes.push(k + '=' + v) },
    () => { box.renders++; },
    timerSink || ((fn2, ms) => { box.timer = { fn: fn2, ms: ms }; }),
    hist, () => { box.archSaves++; });
  return { fn: fn, stats: stats, hist: hist };
}
const a1 = buildArm();
a1.fn.tap();
if (!a1.fn.armed()) throw new Error('the first tap must arm, not wipe');
if (box.wiped !== 0 && box.writes.length) throw new Error('one tap must never end a sitting');
a1.fn.tap();
if (a1.fn.armed()) throw new Error('the second tap must leave it disarmed');
if (a1.stats.decisions !== 0 || a1.stats.book !== 0 || a1.stats.loss !== 0 ||
    a1.stats.ev !== 0 || a1.stats.felt !== 0 || a1.stats.rounds !== 0 || a1.stats.sd2 !== 0)
  throw new Error('the second tap must take the coach accuracy and the reconciliation: ' + JSON.stringify(a1.stats));
if (!box.writes.some(w => w === '999.practice.leaks={}'))
  throw new Error('the second tap must take the practice floor\'s leak ledger: ' + JSON.stringify(box.writes));
if (box.saves !== 1) throw new Error('the wiped book must be persisted: ' + box.saves);
if (box.archSaves !== 1) throw new Error('the archived history must be persisted: ' + box.archSaves);
/* the wipe must bank the reconciliation it throws away \u2014 felt minus engine,
   with the rounds it took, before a single field is zeroed */
if (a1.fn.hist().length !== 1) throw new Error('the reset must archive the reconciliation: ' + JSON.stringify(a1.fn.hist()));
const rec = a1.fn.hist()[0];
if (rec.luck !== -5 || rec.ev !== 3 || rec.felt !== -2 || rec.rounds !== 3)
  throw new Error('the archived session must keep the gap and what it cost: ' + JSON.stringify(rec));
if (rec.why !== 'whole sitting') throw new Error('the archive must say which reset ended it');
console.log('the whole sitting takes two taps: coach accuracy, the ledger and the reconciliation together');

/* --- the rolling history: newest first, capped, and only for a book
       that actually priced rounds ------------------------------------ */
{
  box.writes = [];
  const h = [];
  const save = () => { box.writes.push('saved'); };
  const stats = { ev: 0, felt: 0, rounds: 0, sd2: 0 };
  const arch = new Function('trainStats', 'luckHist', 'saveLuckHist',
    'var LUCK_HIST_MAX = 6;\nfunction archiveLuck(why) {' + archBody + '}\nreturn archiveLuck;')(
    stats, h, save);
  if (arch('empty') !== null) throw new Error('an unpriced book must archive nothing');
  if (h.length !== 0) throw new Error('nothing priced, nothing kept');
  stats.rounds = 5;
  for (let i = 1; i <= 9; i++) { stats.ev = i; stats.felt = -i * 2; arch('s' + i); }
  if (h.length !== 6) throw new Error('the history must stay capped at six: ' + h.length);
  /* nine resets at luck -3,-6,...,-27: the six kept are the newest, 4..9 */
  if (h[0].luck !== -27 || h[5].luck !== -12) throw new Error('newest must come first: ' + JSON.stringify(h.map(r => r.luck)));
  if (h[0].why !== 's9' || h[5].why !== 's4') throw new Error('the kept six must be sessions 4..9: ' + JSON.stringify(h.map(r => r.why)));
  for (const r of h) {
    if (typeof r.ev !== 'number' || typeof r.felt !== 'number' || typeof r.rounds !== 'number' || typeof r.at !== 'number')
      throw new Error('every archived session must be complete: ' + JSON.stringify(r));
  }
  console.log('the history rolls: nine resets kept the last six, newest first, each one complete');

/* the sessions, side by side: one row each, bars to a common scale */
const fmtT = new Function('return function fmtT(n) {' + tbody('  function fmtT(n) {') + '}')();
/* the archived rows now speak the SHARED scale: each session's gap measured
   against its own spread, not against the other rows' chips. sd2 is the
   accumulated per-round variance, so z = gap / sqrt(sd2) is exactly what
   LUCK999.band reads on the live strip.                                    */
const LH = [
  /* −40 chips over a wide book: sqrt(400)=20, z = −2.0 → cold, bar two thirds */
  { ev: 1, felt: -41, rounds: 4, luck: -40, sd2: 400, why: 'new book', at: 4 },
  /* +20 chips, tight book: sqrt(40)≈6.32, z ≈ +3.16 → freak hot, bar full   */
  { ev: 10, felt: 30, rounds: 7, luck: 20, sd2: 40, why: 'clear the book', at: 3 },
  /* dead level: z = 0 → even, no bar                                          */
  { ev: 2, felt: 2, rounds: 2, luck: 0, sd2: 100, why: 'whole sitting', at: 2 },
  /* a book from before the spread was banked: no scale of its own            */
  { ev: 5, felt: 15, rounds: 3, luck: 10, why: 'new book', at: 1 }
];
const lhEmpty = new Function('attrTT', 'fmtT', 'luckHist', 'LUCK999',
  'return function luckHistHtml() {' + tbody('  function luckHistHtml() {') + '}')(attrTT, fmtT, [], LUCK);
if (lhEmpty() !== '') throw new Error('an empty history must draw nothing at all');
const lhHtml = new Function('attrTT', 'fmtT', 'luckHist', 'LUCK999',
  'return function luckHistHtml() {' + tbody('  function luckHistHtml() {') + '}')(attrTT, fmtT, LH, LUCK);
const shown = lhHtml();
if (!/Sessions \u00b7 luck vs the engine/.test(shown)) throw new Error('the history must title itself');
if (!/class="luckrow bad over"/.test(shown) || !/class="luckrow good over"/.test(shown))
  throw new Error('a session behind the engine and one ahead must read differently: ' + shown);
if (!/class="luckrow even"/.test(shown)) throw new Error('a session that finished level must say so: ' + shown);
/* the SHARED scale: each row banded by its own z, which is what the strip
   reads on the live book. -40 chips over a wide book is cold at -2.1σ, NOT a
   freak; +20 chips over a tight one IS a freak at +3.2σ. Raw chips called
   both the same run of luck, which is the whole drift being fixed.        */
if (!/<span class="sd">\u22122\.1\u03c3<\/span> cold/.test(shown))
  throw new Error('the wide book must band cold, not freak: ' + shown);
if (!/<span class="sd">\+3\.2\u03c3<\/span> freak hot/.test(shown))
  throw new Error('the tight book must band freak hot: ' + shown);
if (!/<span class="sd">\+0\.0\u03c3<\/span> even/.test(shown))
  throw new Error('a level session must band even with its own measured sigma: ' + shown);
/* the bar rides the sigma, three spreads filling the row, so a freak fills it
   and a merely-cold session does not — the length now means the same thing
   it means on the strip */
if (!/width:100%/.test(shown) || !/width:70%/.test(shown) || !/width:0%/.test(shown))
  throw new Error('every bar must be drawn on the shared sigma scale: ' + shown);
if (!/\u22122\.1\u03c3/.test(LUCK.zSig(LUCK.z({ felt: -41, ev: 1, sd2: 400 }))))
  throw new Error('the pin must read the same z the page reads');
/* a book written before the spread was banked has no scale of its own, and
   says so rather than borrowing another session's */
if (!/class="sd na">no spread/.test(shown))
  throw new Error('an unspread book must admit it has no scale: ' + shown);
if (!/class="luckrow good" title=/.test(shown))
  throw new Error('a session with no spread still keeps its own sign tone: ' + shown);
/* the glow rides the same test as the live strip: past a spread, archived */
if (!/luckrow good over/.test(shown) || !/luckrow bad over/.test(shown))
  throw new Error('an archived freak must still wear the outlier mark: ' + shown);
if (!/class="luck good over"/.test(shown) || !/class="luck bad over"/.test(shown))
  throw new Error('the number itself must carry the mark, not only the row: ' + shown);
if (!/b class="luck good"/.test(shown))
  throw new Error('a level session must wear no luck class at all, as the strip does: ' + shown);
if (!/class="luck good over">\+20<\/b>/.test(shown) || !/class="luck bad over">-40<\/b>/.test(shown) ||
    !/<b>0<\/b>/.test(shown))
  throw new Error('each row must print its own signed gap: ' + shown);
if (!/ended by new book/.test(shown) || !/engine \+1 \u00b7 felt -41 \u00b7 4 rounds/.test(shown))
  throw new Error('the row must say what ended it and what it cost: ' + shown);
if (!/html \+= luckHistHtml\(\);/.test(tsrc)) throw new Error('the overlay must draw the history');
if (!/\.training \.luckhist \.luckrow\.good \.luckbar i \{ background: #43c98a; \}/.test(tsrc) ||
    !/\.training \.luckhist \.luckrow\.bad \.luckbar i \{ background: #e2705f; \}/.test(tsrc))
  throw new Error('the sessions must wear the house tones');
/* the rows are banded by the SHARED module, never by a second copy of the
   arithmetic — the drift this file exists to prevent, in the one place that
   still had a private scale */
if (!/zz = LUCK999\.z\(r\);/.test(tsrc)) throw new Error('each row must measure itself in its own spreads');
if (!/LUCK999\.bandOf\(zz\)/.test(tsrc)) throw new Error('the row must take its band word from the shared module');
if (!/LUCK999\.zSig\(zz\)/.test(tsrc)) throw new Error('the row must take its sigma from the shared module');
if (!/LUCK999\.out\(r\)/.test(tsrc)) throw new Error('the outlier mark must come from the shared test');
if (/luckHist\[i\]\.luck\)\) mx|var mx = 0, i;/.test(tbody('  function luckHistHtml() {')))
  throw new Error('the raw-chip axis must be gone: one chip scale cannot band a run of sessions');
if (!/\.training \.luckhist \.luckrow\.over b \{ text-shadow/.test(tsrc))
  throw new Error('an archived freak must glow like the live one');
console.log('and they draw side by side on the shared scale: banded per session, signed, in the house green and red');
}

/* the arm disarms itself: a stale intent must not fire a minute later */
box.writes = [];
const a2 = buildArm((fn2, ms) => { box.timer = { fn: fn2, ms: ms }; });
a2.fn.tap();
if (!box.timer || box.timer.ms !== 6000) throw new Error('the arm must self-disarm after six seconds');
box.timer.fn();
if (a2.fn.armed()) throw new Error('a lapsed arm must leave itself disarmed');
a2.fn.tap();                                   /* a later, unrelated tap */
if (box.writes.length) throw new Error('a lapsed arm must not fire on a later tap: ' + JSON.stringify(box.writes));
console.log('and it disarms itself in six seconds, so a stale intent can never fire');

/* the control is reachable always, beside the book wipe, not only under
   the strip \u2014 which is hidden until something has crossed it */
if (!/<span class="bookreset-tap' \+ \(tSitArm \? ' armed' : ''\) \+ '" id="evWholeSitT"/.test(tsrc))
  throw new Error('the whole-sitting tap must sit in the always-present wipe group');
if (!/evWholeSitT'\) armWholeT\(\)/.test(tsrc))
  throw new Error('the overlay must catch the whole-sitting tap');
if (!/\.training \.bookreset-tap\.armed \{ color: #e2705f;/.test(tsrc))
  throw new Error('an armed wipe must read as armed, in the house red');
/* either other wipe kills a pending whole-sitting intent: the player who
   already cleared the book must not find the next tap firing it again */
for (const fn of ['  function resetT() {', '  function clearBookT() {']) {
  const i = tsrc.indexOf(fn), j = tsrc.indexOf('\n  }', i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + fn);
  if (!/tSitArm = 0;/.test(tsrc.slice(i, j)))
    throw new Error(fn.trim() + ' must disarm a pending whole-sitting intent');
}
console.log('and either other wipe kills a pending whole-sitting intent');
console.log('wiring: the whole-sitting tap sits beside the book wipe, armed in red');

/* --- wiring: the sitting's cells, the overlay, the grow-in --- */
if (!/var tSession = \{\};/.test(tsrc)) throw new Error('the table must keep its own sitting');
if (!/tSession\[cellT\]\.cost \+= cost;/.test(tsrc) || !/tSession\[cellT\]\.n\+\+;/.test(tsrc))
  throw new Error('a felt miss must land in the sitting fold, not only the ledger');
if (!/html \+= evLeftT\(''\);/.test(tsrc) ||! /var strip = LUCK999\.stripLine\(trainStats, crossT\.fire\);/.test(tsrc))
  throw new Error('the overlay must draw the recoverable chart under the strip');
if (!/\.training \.evleft \.evrow \.evbar i \{ display: block; height: 100%; background: #e2705f;/.test(tsrc) ||
    !/@keyframes evgrow \{ from \{ width: 0%; \} \}/.test(tsrc))
  throw new Error('the table bars must wear the house red and grow in');
if (!/\.training \.evleft \{/.test(tsrc) || !/\.training \.evleft \.evtotal \{/.test(tsrc))
  throw new Error('the table chart must be styled');
console.log('wiring: the felt sitting folds, the overlay draws it, the bars grow in red');

console.log('\ntable ev-left verified');

/* --- the review scorecard wears the lifetime drift, as the leak rows do --
   A cell's last CLOSED week weighed against the average week its whole
   record has run. It was on the leak panel's all-time rows and nowhere
   else, so the review — which is where a sitting is actually read back
   — could not say whether the cell it names is climbing.          */
const srcF = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const scMap = srcF.slice(srcF.indexOf('var scRows = sc.rows.map(function (r3)'),
  srcF.indexOf("scHtml = '<p class=\"drillnow\">Scorecard: '"));
if (!/driftFlag\(r3\.cell, 'all'\)/.test(scMap))
  throw new Error('the review scorecard rows must wear the lifetime drift');
if (!/ixSitTag\(r3\.cell\)/.test(scMap))
  throw new Error('the drift flag must not push the ix record off the row');
/* 'all' and not the sitting: the sitting\u2019s own flag needs a hand played
   today, and a scorecard is read once the sitting is over        */
if (/driftFlag\(r3\.cell, leakView\)/.test(scMap))
  throw new Error('the scorecard reads the ledger, not the tab it happens to be on');
/* one reading, not a second: the row asks the SAME helper the leak rows
   ask, so the two can never disagree about a cell                  */
const flagCall = srcF.match(/driftFlag\([^)]*\)/g) || [];
if (flagCall.length < 3 || !flagCall.some(c => /driftFlag\(c\.cell, leakView\)/.test(c)) ||
    !flagCall.some(c => /driftFlag\(r3\.cell, 'all'\)/.test(c)))
  throw new Error('the leak rows and the scorecard must read the drift through one helper');
console.log('the review scorecard wears the same lifetime drift as the leak rows — one reading, two places');

/* --- the scorecard names the WEEK over week too ----------------------
   The leak rows and the bars have worn the direction since the week
   snapshots existed, and the scorecard — the one a sitting is actually
   read back on, often a day later — named the same cells with no word
   about whether they are healing. So the row asks the same two helpers
   the other two ask.                                             */
if (!/weekPillHtml\(weekSplit\(r3\.cell\)\)/.test(scMap))
  throw new Error('the scorecard rows must name their week over week, as the leak rows do');
/* one reading, three places: no surface may weigh a week on its own,
   or two of them will one day print different numbers for one cell  */
const splits = srcF.match(/weekSplit\([^)]*\)/g) || [];
if (splits.length < 3 || !splits.some(c => /weekSplit\(c\.cell\)/.test(c)) ||
    !splits.some(c => /weekSplit\(r4\.cell\)/.test(c)) || !splits.some(c => /weekSplit\(r3\.cell\)/.test(c)))
  throw new Error('the leak row, the bar and the scorecard must read the week through one helper');
/* and the renderer with it: the scorecard's mark is drawn by the same
   function that draws the other two, so a tint or a figure cannot drift */
const pills = srcF.match(/weekPillHtml\(/g) || [];
if (pills.length < 3 || !/weekPillHtml\(wk\)/.test(srcF) ||
    !/weekPillHtml\(weekSplit\(r3\.cell\)\)/.test(srcF))
  throw new Error('the scorecard must wear the one renderer the leak row and the bar wear');
/* the figures themselves, read through the page's own bindings: a
   scorecard cell that healed this week reads green and down, one that
   is still bleeding reads red and up, a steady one reads flat, and a
   cell with no week to compare wears nothing at all — the same marks,
   in the same words, the leak row would have shown.                */
const rowMark = (base, cost, cell) =>
  weekPillHtml(weekHarness({ [cell]: { n: 2, cost: cost } }, base).weekSplit(cell, now));
const CELL = 'hard 16 v 10';
if (rowMark({ [prevW]: { [CELL]: 0 }, [curW]: { [CELL]: 40 } }, 45, CELL) !== weekPillHtml({ now: 5, was: 40, dir: -1 }))
  throw new Error('a scorecard cell that bled less this week must wear the leak row\'s improving mark');
if (rowMark({ [prevW]: { [CELL]: 0 }, [curW]: { [CELL]: 0 } }, 400, CELL) !== weekPillHtml({ now: 400, was: 0, dir: 1 }))
  throw new Error('a scorecard cell still bleeding must wear the leak row\'s worsening mark');
if (rowMark({ [prevW]: { [CELL]: 0 }, [curW]: { [CELL]: 10 } }, 20, CELL) !== weekPillHtml({ now: 10, was: 10, dir: 0 }))
  throw new Error('a steady week reads flat, not improving and not worsening');
if (rowMark({}, 45, CELL) !== '' || rowMark({ [curW]: { [CELL]: 40 } }, 45, CELL) !== '')
  throw new Error('a cell with no week to compare wears no mark, rather than a bare arrow');
/* a fresh cell — one whose whole record is this week — is the common
   case on a scorecard, and names the truth of it: 30 against a zero
   last week, which is worse, not silence                              */
if (rowMark({ [prevW]: {}, [curW]: {} }, 30, CELL) !== weekPillHtml({ now: 30, was: 0, dir: 1 }))
  throw new Error('a cell born this week reads against a zero last week \u2014 30 v 0 is true, and silence would not be');
console.log('the scorecard names the week over week too — the leak row\'s own figures and tints, one reading in three places');
