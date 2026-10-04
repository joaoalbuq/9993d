/* The live table's ladder is TAPPABLE, like the floor's.
   It used to be a picture: the line and its arrows, read-only. On
   the floor every week has always been its own control — a tap opens
   that cell's figures on that week — so a player there could ask
   "which week was that?" and the table could not.
   Under test: each week is its own button, the glyph and its own
   figure are zipped from one walk, the line opens every figure, the
   strip is the floor's shape, and a week's tap NEVER seeds a drill —
   the bar row is that gesture here.                          */
'use strict';
const fs = require('fs');
const path = require('path');
const table = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const floor = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const LUCK = require(path.join(__dirname, '..', 'luck999.js'));

const grab = (sig) => {
  const i = table.indexOf(sig);
  if (i < 0) throw new Error('cannot find ' + sig + ' in the table');
  return table.slice(i, table.indexOf('\n  }', i) + 4);
};
const body = (sig) => {
  const f = grab(sig);
  return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}'));
};

/* --- a record long enough that the ladder has real weeks on it --- */
const now = Date.now(), cur = LUCK.weekStart(now);
const CELL = 'hard 16 v 10';
const N = 10;
const wb = {};
for (let n = 1; n < N; n++) {
  const s = new Date(cur);
  s.setDate(s.getDate() - 7 * n);
  wb[s.getTime()] = {};
  wb[s.getTime()][CELL] = (N - 1 - n) * (N - 1 - n);
}
wb[cur] = {}; wb[cur][CELL] = (N - 1) * (N - 1);
const lk = {}; lk[CELL] = { n: 3, cost: (N - 1) * (N - 1) + 7 };

const state = { tSparkPage: {}, tSparkOpen: null, tSparkWeek: null };
/* the renderers are rebuilt from the CURRENT state on every call: a
   `new Function` parameter captures a value, so a closure over the
   page would not see a state change after it was built \u2014 which is
   exactly what tapping a week does                               */
function build() {
  const sparkT = new Function('LUCK999', 'attrTT', 'tSparkPage', 'tSparkOpen', 'tSparkWeek',
    'return function evSparkT(lk, wb, cell, now) {'
    + body('  function evSparkT(lk, wb, cell, now) {')
    + 'function evSparkPageT(cell, pages) {' + body('  function evSparkPageT(cell, pages) {') + '}'
    + 'function weekLabelT(ts) {' + body('  function weekLabelT(ts) {') + '}'
    + '}')(LUCK, (s) => String(s), state.tSparkPage, state.tSparkOpen, state.tSparkWeek);
  const detailT = new Function('LUCK999', 'tSparkPage', 'tSparkOpen', 'tSparkWeek',
    'function evSparkPageT(cell, pages) {' + body('  function evSparkPageT(cell, pages) {') + '}'
    + 'function weekLabelT(ts) {' + body('  function weekLabelT(ts) {') + '}'
    + 'return function evSparkDetailT(lk, wb, cell, now) {'
    + body('  function evSparkDetailT(lk, wb, cell, now) {') + '}')(
    LUCK, state.tSparkPage, state.tSparkOpen, state.tSparkWeek);
  return { sparkT, detailT };
}
const sparkT = (a, b, c, d) => build().sparkT(a, b, c, d);
const detailT = (a, b, c, d) => build().detailT(a, b, c, d);

const w = LUCK.sparkWeeks(lk, wb, CELL, now, 0);
const html = sparkT(lk, wb, CELL, now);

/* --- every week is its own control, and there are as many as steps --- */
const glyphs = html.match(/class="sparkwk"/g) || [];
if (glyphs.length !== w.length)
  throw new Error('each week on the ladder must be its own control: ' + glyphs.length + ' of ' + w.length);
const ink = (html.match(/[\u2581-\u2588]/g) || []).filter((c) => !/spark/.test(c));
const ladder = html.match(/[\u2581-\u2588]+/g) || [];
const steps = (html.match(/<span class="sparkwk[^]*?<\/span>/g) || []).map((m) => m.match(/[\u2581-\u2588]/)[0]);
if (steps.length !== w.length) throw new Error('a control per week, a step per control');
/* the step and the week it names come from ONE walk, in step: the glyphs
   are zipped against the same weeks the figures are read from, and each
   glyph is the very step the shared line drew at that index        */
const weeks = html.match(/data-week="(\d+)"/g) || [];
const want = LUCK.sparkLine(LUCK.sparkValues(lk, wb, CELL, now, 0));
if (want.length !== w.length)
  throw new Error('a step per readable week: ' + want.length + ' steps for ' + w.length + ' weeks');
for (let i = 0; i < w.length; i++) {
  if (weeks[i] !== 'data-week="' + w[i].ws + '"')
    throw new Error('step ' + i + ' must name its own week: ' + weeks[i] + ' vs ' + w[i].ws);
  if (steps[i] !== want.charAt(i))
    throw new Error('the glyph must be the line own step at that week: ' + steps[i] + ' vs ' + want.charAt(i));
}
/* each control names its week and its own chips, so a tap is never a guess */
for (const m of html.match(/<span class="sparkwk[^]*?<\/span>/g)) {
  if (!/role="button"/.test(m) || !/tabindex="0"/.test(m))
    throw new Error('a week must be a real control, reachable by keyboard: ' + m);
  if (!/aria-label="[^"]*week of hard 16 v 10, [^"]* chips"/.test(m))
    throw new Error('a week must name itself and its chips: ' + m);
  if (!/class="cnt/.test(m) === false) throw new Error('sanity');
}
console.log('each week is its own control: ' + steps.length + ' steps, ' + steps.length + ' buttons, each naming its chips');

/* --- the line itself opens every figure it was drawn from --- */
if (!/class="sparktap[^"]*" data-spark="hard 16 v 10"/.test(html))
  throw new Error('the line must be a control that opens the figures: ' + html);
if (!/aria-expanded="false"/.test(html))
  throw new Error('the line must say whether it is open');
if (!/Tap a week, or the line, for the figures/.test(html))
  throw new Error('the hover must name both ways in: ' + html);
console.log('the line is a control too: it opens every figure it was drawn from');

/* --- open: the strip is the floor's shape, read from the same window --- */
state.tSparkOpen = CELL;
const openHtml = sparkT(lk, wb, CELL, now);
if (!/class="sparktap on"/.test(openHtml) || !/aria-expanded="true"/.test(openHtml))
  throw new Error('the open line must say it is open: ' + openHtml);
const strip = detailT(lk, wb, CELL, now);
if (!strip) throw new Error('an open line must show its figures');
if (!/class="sparkdetail"/.test(strip) || !/class="sw sum"/.test(strip))
  throw new Error('the strip must be the floor\'s shape: a figure per week and the window\'s total');
/* one figure per week, and the chosen one highlighted */
const sws = strip.match(/class="sw[ "]/g) || [];
if (sws.length !== w.length + 1)
  throw new Error('one figure per week plus the total: ' + sws.length + ' for ' + w.length + ' weeks');
const sum = w.reduce((a, r) => a + r.v, 0);
if (!strip.includes(LUCK.leakFig(Math.round(sum))))
  throw new Error('the strip must total its own window: ' + strip);
state.tSparkWeek = w[2].ws;
const stripOn = detailT(lk, wb, CELL, now);
if (!/class="sw on"/.test(stripOn))
  throw new Error('the chosen week must be the one highlighted: ' + stripOn);
const glyphOn = sparkT(lk, wb, CELL, now);
if (!/class="sparkwk on"/.test(glyphOn))
  throw new Error('the chosen week must be marked on the ladder too: ' + glyphOn);
console.log('open: a figure per week, the chosen one marked on BOTH the strip and the ladder');

/* --- closed: nothing, because nothing is open --- */
state.tSparkOpen = null; state.tSparkWeek = null;
if (detailT(lk, wb, CELL, now) !== '') throw new Error('a closed line must show no figures');
console.log('closed: no figures, no leftover strip');

/* --- a week's tap must NOT seed a drill --- */
/* the bar row is that gesture on this surface; reading a week is a
   question, and must not cost a hand at the other felt             */
const handlers = table.slice(table.indexOf("trainBoxEl.addEventListener('click'"));
const wkAt = handlers.indexOf(".closest('.training .sparkwk')");
if (wkAt < 0) throw new Error('the table click handler must answer a week');
/* bounded to the branch itself: the drill call lives further down, in
   the BAR branch, and must not be read as part of the week branch   */
const branchEnd = handlers.indexOf('var sln =', wkAt);
if (branchEnd < 0) throw new Error('cannot find the end of the week branch');
const wkBranch = handlers.slice(wkAt, branchEnd);
if (wkBranch.indexOf('seedDrillFromBar') >= 0)
  throw new Error('a week tap must not seed the drill: the bar row is that gesture');
if (!/tSparkWeek = \(tSparkOpen === wcell && tSparkWeek === wws\) \? null : wws;/.test(wkBranch))
  throw new Error('tapping the chosen week again must clear the choice');
/* the LINE branch alone: bounded, because the review's own copy of the
   same branch would otherwise satisfy a loose search            */
const lnAt = handlers.indexOf('var sln =');
const lnEnd = handlers.indexOf('var bar =', lnAt);
if (lnAt < 0 || lnEnd < 0) throw new Error('cannot find the table line branch');
if (!/tSparkWeek = null;/.test(handlers.slice(lnAt, lnEnd)))
  throw new Error('the line alone names no week: opening it must clear the choice');
if (!/tSparkOpen = \(tSparkOpen === lcell\) \? null : lcell;/.test(handlers.slice(lnAt, lnEnd)))
  throw new Error('tapping the open line must close it');
console.log('a week reads: it opens the figures and never seeds a drill — the bar row is that gesture');

/* --- both felts now answer the same gestures --- */
for (const sel of ['.sparkwk', '.sparktap', '.sparkpg']) {
  if (floor.indexOf("closest('" + sel + "')") < 0)
    throw new Error('the floor must answer ' + sel);
  if (table.indexOf("closest('.training " + sel + "')") < 0)
    throw new Error('the table must answer ' + sel);
}
if (!/class="sparkwk/.test(floor)) throw new Error('the floor weeks must be controls');
if (!/class="sparktap/.test(floor)) throw new Error('the floor line must be a control');
console.log('both surfaces: the week, the line and the scroll all answer on the floor and the table');

/* --- the sign: a recovering week must not be given a second minus --- */
const wb2 = {}; const curKeys = Object.keys(wb).map(Number).sort((a, b) => a - b);
for (const k of curKeys) { wb2[k] = {}; wb2[k][CELL] = wb[k][CELL]; }
wb2[cur][CELL] = (N - 1) * (N - 1) + 200;      /* this week deeply RECOVERED */
const lk2 = {}; lk2[CELL] = { n: 1, cost: 0 };
const html2 = sparkT(lk2, wb2, CELL, now);
if (/\u2212-/.test(html2))
  throw new Error('a negative week must not carry two minuses: ' + html2);
state.tSparkOpen = CELL;
if (/\u2212-/.test(detailT(lk2, wb2, CELL, now)))
  throw new Error('a negative figure must not carry two minuses: ' + detailT(lk2, wb2, CELL, now));
console.log('the sign: a recovering week reads with its own minus, never two');

/* --- and the FLOOR must read the same way --- */
/* its glyph and its strip are the same two places, and the floor has
   carried these figures longest of anywhere \u2014 so a negative week on
   the floor must not read with two minuses either              */
{
  const fg = (sig) => {
    const i = floor.indexOf(sig);
    if (i < 0) throw new Error('cannot find ' + sig + ' in the floor');
    return floor.slice(i, floor.indexOf('\n  }', i) + 4);
  };
  const fbody = (sig) => {
    const f = fg(sig);
    return f.slice(f.indexOf('{') + 1, f.lastIndexOf('}'));
  };
  const fstate = { leaks: lk2, weekBase: wb2, sparkPaged: {}, sparkOpen: null, sparkWeek: null };
  const floorHtml = new Function('LUCK999', 'leaks', 'weekBase', 'sparkOpen', 'sparkWeek',
    'sparkPaged', 'SPARK_WEEKS_TEXT', 'attrT', 'MONTHS', 'SPARK_WEEKS',
    fg('  function sparkPageOf(cell) {') + fg('  function sparkPage(cell, now) {')
    + fg('  function sparkPages(cell, now) {') + fg('  function sparkWeeks(cell, now, back) {')
    + fg('  function sparkValues(cell, now, back) {') + fg('  function sparkLine(vals) {')
    + fg('  function sparkDir(vals) {') + fg('  function weekLabel(ws) {')
    + fg('  function dayLabel(ts) {') + fg('  function sparkHtml(cell, now) {')
    + '\nreturn sparkHtml;')(LUCK, fstate.leaks, fstate.weekBase, fstate.sparkOpen,
    fstate.sparkWeek, fstate.sparkPaged, 'eight', (s) => String(s),
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 8);
  const fHtml = floorHtml(CELL, now);
  if (/\u2212-/.test(fHtml))
    throw new Error('the floor week figure must not carry two minuses: ' + fHtml);
  if (!/\u2212-/.test(fHtml) && !/-281/.test(fHtml))
    throw new Error('the floor must still print the week own figure: ' + fHtml);
  /* and its strip, which is where the running total lives */
  if (!/LUCK999\.leakFig\(total\)/.test(floor))
    throw new Error('the floor strip total must use the shared sign formatter');
  void fbody;
}
console.log('the floor reads the same way: one minus, whichever felt you are on');

console.log('\nthe table\'s ladder is tappable, and reads the same weeks the floor does');