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
if (!/typeof lcRaw\.rounds === 'number' && typeof lcRaw\.ev === 'number' &&/.test(src) ||
    !/typeof lcRaw\.felt === 'number'/.test(src))
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
if (!/Closing luck: <b>' \+ LUCK999\.word\(s\) \+ '<\/b>'/.test(src) ||
    !/lc\.was \? ' The closing before it read ' \+ LUCK999\.word\(lc\.was\)/.test(src))
  throw new Error('the scorecard must show the gap, and the closing it followed');
if (!/No closing luck yet \\u2014 nothing priced this session, so there /.test(src))
  throw new Error('an ungraded session must say so rather than sit blank');
if (!/var lc = closeLuck\(\);/.test(src) || !/scHtml \+ luckHtml \+ ixHtml \+ evHtml;/.test(src))
  throw new Error('the review must fold the closing in beside the scorecard');
if (!/\.drillnow\.luckclose b \{ color: #d8b56a; \}/.test(src))
  throw new Error('the kept closing reads as a kept figure');
if (!/if \(!replay\.length\) \{\s*\n\s*\/\* no misses to replay[\s\S]*?var lcBare = closeLuck\(\);/.test(src) ||
    !/box\.innerHTML = '<h3>Session review<\/h3>' \+ \(lcBare \? luckCloseHtml\(lcBare\) :/.test(src))
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
if (!/<h3>Session review<\/h3>' \+ drillReportLine\(drillReport\)/.test(src) ||
    !/<h3>Where the chips leak<\/h3>' \+ drillReportLine\(drillReport\)/.test(src))
  throw new Error('the readout must ride both panel views');
if (!/\.leaks \.drillscore\.ok \{ border-left: 2px solid #43c98a; \}/.test(src) ||
    !/\.leaks \.drillscore\.out \{ border-left: 2px solid #e2705f; \}/.test(src))
  throw new Error('the readout must wear the house sign colours');
console.log('wiring: the baseline is read before the miss, the readout lands at once, on both views');

/* --- the bar wears its cell's own eight weeks: the bar says HOW
       MUCH, the line says whether it is getting worse           --- */
const barFull = grab("var bars = ev.rows.map(function (r4) {", "}).join('');");
if (!/var spark = sparkHtml\(sparkValues\(r4\.cell\), r4\.cell\);/.test(barFull))
  throw new Error('each bar must draw its own cell\u2019s line, and pass the cell so the line can open');
if (barFull.indexOf('sparkHtml(sparkValues(r4.cell), r4.cell)') > barFull.indexOf("return '<div class=\"evrow"))
  throw new Error('the line must be drawn before the row that wears it');
if (!/\+ spark \+/.test(barFull)) throw new Error('the line must be drawn into the row');
if (!/var SPARK_WEEKS = 8;/.test(src))
  throw new Error('the sparkline window must be eight weeks everywhere it is drawn');
if (!/leakedIn\(cell, keys\[i\], now\)/.test(src))
  throw new Error('the bar\u2019s line must read the SAME weekly snapshots the chip does');
/* one series, one window: the bar and the leak row cannot disagree */
const sparkWiring = src.match(/sparkHtml\(sparkValues\((\w+)\.cell\), \w+\.cell\)/g) || [];
if (sparkWiring.length !== 2 || !sparkWiring.every((w) => /sparkValues\(\w+\.cell\), \w+\.cell\)/.test(w)))
  throw new Error('the bar and the leak row must read one shared series: ' + JSON.stringify(sparkWiring));
const sparkFull = grab('  function sparkWeeks(cell, now) {', '\n  }');
if (!/if \(keys\.length > SPARK_WEEKS\) keys = keys\.slice\(keys\.length - SPARK_WEEKS\);/.test(sparkFull))
  throw new Error('the window must TRUNCATE the kept weeks, never pad');
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
const attrTT = new Function('return function attrTT(s) {' + tbody('  function attrTT(s) {') + '}')();
const evBarTitleT = new Function('attrTT',
  'return function evBarTitleT(cell, cost, n, cum) {' + tbody('  function evBarTitleT(cell, cost, n, cum) {') + '}')(attrTT);
const evLeftT = new Function('scoreT', 'tSession', 'evBarTitleT',
  'return function evLeftT() {' + tbody('  function evLeftT() {') + '}')(scoreT, {}, evBarTitleT);
const tFold = scoreT({ 'hard 16 v 10': { n: 2, cost: 60 }, 'hard 12 v 2': { n: 1, cost: 25 } });
if (!tFold || tFold.total !== 85 || tFold.cells !== 2) throw new Error('the felt fold must total the sitting');
if (tFold.rows.length !== 1 || tFold.rows[0].cell !== 'hard 16 v 10')
  throw new Error('the cut must stop once 60% of the loss is named: ' + JSON.stringify(tFold.rows));
if (tFold.rows[0].n !== 2) throw new Error('the felt fold must carry the miss count for the bar to name');
if (scoreT({}) !== null) throw new Error('a clean sitting draws no chart');
const tChart = new Function('scoreT', 'tSession', 'evBarTitleT',
  'return function evLeftT() {' + tbody('  function evLeftT() {') + '}')(scoreT,
  { 'hard 16 v 10': { n: 2, cost: 60 }, 'hard 12 v 2': { n: 1, cost: 25 } }, evBarTitleT)();
if (!/class="evleft"/.test(tChart) || !/EV left on the table/.test(tChart)) throw new Error('the table chart must title itself');
if (!/<span class="evbar"><i style="width:100%"><\/i><\/span>/.test(tChart) || !/<b>\u221260<\/b>/.test(tChart))
  throw new Error('the fewest-bar must scale to the worst and name its cost: ' + tChart);
if (!/Fix it: \+60 back \u00b7 25 still behind the rest\./.test(tChart))
  throw new Error('the table tail must name the recovery: ' + tChart);
/* the felt bar names itself on hover, like the floor's */
if (!/<div class="evrow" title="hard 16 v 10 \u00b7 \u221260 chips behind this bar \u00b7 2 misses in this cell \u00b7 60 back if you fix every bar down to here">/.test(tChart))
  throw new Error('the table bar must name its chips, its misses and the running recovery: ' + tChart);
console.log('table evLeft: the felt sitting folds to its worst cell and names the recovery');
console.log('the felt bar names itself on hover: 60 chips behind it, 2 misses, 60 back down to here');

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
