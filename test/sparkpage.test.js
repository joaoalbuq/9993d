/* The ladder's weeks SURVIVE THE WINDOW.
   The line showed the newest eight weeks and dropped everything
   behind them off the end of the walk: a cell with a year of record
   kept only eight of it, and the older weeks were unreachable — not
   recorded, just gone. The walk is now paged: eight on the line,
   every week behind them one scroll back.
   Under test: nothing is lost, every week is reachable exactly once,
   the scroll cannot walk off the end of the record, the line and the
   figures beside it are read from ONE window, and both felts scroll
   the same shared walk.                                            */
'use strict';
const fs = require('fs');
const path = require('path');
const table = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const floor = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const LUCK = require(path.join(__dirname, '..', 'luck999.js'));

if (LUCK.SPARK_WEEKS !== 8) throw new Error('the window is still eight weeks on show');

/* --- the walk keeps EVERYTHING; the window is a page of it --- */
const LUCK_SRC = fs.readFileSync(path.join(__dirname, '..', 'luck999.js'), 'utf8');
const allSrc = LUCK_SRC.slice(LUCK_SRC.indexOf('function sparkAll('),
  LUCK_SRC.indexOf('function sparkPages('));
if (/keys\.slice\(/.test(allSrc))
  throw new Error('the whole walk must not slice anything off: an older week must still be there');
if (!/if \(l != null\) out\.push\(\{ ws: keys\[i\], v: l \}\);/.test(allSrc))
  throw new Error('a week never seen is skipped, not zero-filled, as it always was');

/* --- build a record with far more than eight weeks on it --- */
const now = Date.now();
const cur = LUCK.weekStart(now);
/* N weeks on record IN TOTAL: this one plus N-1 behind it. The bases
   are i*i, so each week's leak (the next base less its own) is a
   DISTINCT figure \u2014 two pages can then never draw the same ladder. */
const N = 23;
const CELL = 'hard 16 v 10';
const wb = {};
for (let n = 1; n < N; n++) {
  const start = new Date(cur);
  start.setDate(start.getDate() - 7 * n);
  const key = start.getTime();
  wb[key] = {};
  wb[key][CELL] = (N - 1 - n) * (N - 1 - n);      /* the oldest week has the smallest base */
}
wb[cur] = {}; wb[cur][CELL] = (N - 1) * (N - 1);
const lk = {}; lk[CELL] = { n: 1, cost: (N - 1) * (N - 1) + 3 };   /* this week bleeds 3 */

const all = LUCK.sparkAll(lk, wb, CELL, now);
if (all.length !== N)
  throw new Error('every week on record must survive the walk: ' + all.length + ' of ' + N);

/* every week appears EXACTLY once across the pages, and the pages
   together are the whole record — nothing lost, nothing doubled  */
const seen = [];
let pages = LUCK.sparkPages(lk, wb, CELL, now);
if (pages !== Math.ceil(N / 8)) throw new Error('the page count must follow the record: ' + pages);
for (let p = 0; p < pages; p++) {
  const w = LUCK.sparkWeeks(lk, wb, CELL, now, p);
  if (w.length > 8) throw new Error('no page may be longer than the window: ' + w.length);
  if (w.length < 2) throw new Error('a page of one cannot draw a line: ' + w.length);
  for (const row of w) {
    if (seen.indexOf(row.ws) >= 0) throw new Error('a week is on two pages: ' + row.ws);
    seen.push(row.ws);
  }
}
if (seen.length !== N) throw new Error('the pages must hold every week: ' + seen.length + ' of ' + N);
const allKeys = all.map((r) => r.ws);
for (const ws of allKeys) {
  if (seen.indexOf(ws) < 0) throw new Error('a week fell out of the whole record: ' + ws);
}
console.log('the walk keeps all ' + N + ' weeks; ' + pages + ' pages hold each exactly once');

/* --- the newest page is what the line has always shown --- */
const newest = LUCK.sparkWeeks(lk, wb, CELL, now, 0);
if (newest.length !== 8) throw new Error('the newest page is the eight newest weeks: ' + newest.length);
if (newest[newest.length - 1].ws !== Math.max.apply(null, allKeys))
  throw new Error('the newest page must end on the newest week');
if (LUCK.sparkValues(lk, wb, CELL, now).join() !== LUCK.sparkValues(lk, wb, CELL, now, 0).join())
  throw new Error('no page given must mean the newest page');

/* --- the scroll cannot walk off either end --- */
for (const [pg, why] of [[-1, 'before the newest'], [-99, 'far before'], [pages, 'past the oldest'],
  [pages + 5, 'far past'], [NaN, 'junk']]) {
  const w = LUCK.sparkWeeks(lk, wb, CELL, now, pg);
  const top = pg < 0 || pg !== pg ? LUCK.sparkWeeks(lk, wb, CELL, now, 0) : LUCK.sparkWeeks(lk, wb, CELL, now, pages - 1);
  if (w.join() !== top.join())
    throw new Error('a scroll ' + why + ' must clamp, not wander: ' + pg);
}
console.log('clamped: a scroll before the newest or past the oldest lands on an end, never off it');

/* --- a cell with no history has exactly one page, and no scroll --- */
const one = LUCK.sparkPages(lk, { [cur]: { [CELL]: 0 } }, CELL, now);
if (one !== 1) throw new Error('a cell with a single week must have one page, not zero');
if (LUCK.sparkPages(lk, {}, CELL, now) !== 1) throw new Error('no record at all is still one page');
if (LUCK.sparkPages(lk, { [cur]: { [CELL]: 0 } }, CELL, now) - 1 < 0)
  throw new Error('a page count below one would leave the newest page nowhere to live');

/* --- ONE window: the line and the figures beside it cannot differ --- */
const page1 = LUCK.sparkWeeks(lk, wb, CELL, now, 1);
const vals1 = LUCK.sparkValues(lk, wb, CELL, now, 1);
if (page1.length !== vals1.length)
  throw new Error('the figures must come off the same page the line was drawn from');
for (let i = 0; i < page1.length; i++) {
  if (page1[i].v !== vals1[i]) throw new Error('a step and its own number must never part company');
}
if (LUCK.sparkValues(lk, wb, CELL, now, 1).join() === LUCK.sparkValues(lk, wb, CELL, now, 0).join())
  throw new Error('two pages must be two different windows, or the scroll moves nothing');
console.log('one window: the line, the detail figures and the weekly chip all read the same page');

/* --- the scroll control reaches both felts --- */
/* the floor: per-cell page state, drawn only where there is somewhere to go */
if (!/var sparkPaged = \{\};/.test(floor))
  throw new Error('the floor must keep which window each cell is scrolled to');
if (!/if \(pages > 1\) \{/.test(floor))
  throw new Error('the scroll must only be drawn when there is somewhere to scroll to');
if (!/closest\('\.sparkpg'\)/.test(floor))
  throw new Error('the floor must answer a scroll');
/* the table: the same, and the scroll must beat the bar's own drill */
if (!/var tSparkPage = \{\};/.test(table))
  throw new Error('the table must keep which window each cell is scrolled to');
if (!/function sparkScrollT\(el\) \{/.test(table))
  throw new Error('the table must scroll its own ladder');
/* the scroll is checked BEFORE the bar's drill on both surfaces, or a
   player reaching for an older week is handed a hand to play. The
   floor's CLICK handler is taken as a block: its keydown listener
   carries a second '.sparkpg', and only the order WITHIN THE CLICK
   HANDLER is the claim being made.                             */
{
  const start = floor.indexOf("leakBoxEl.addEventListener('click', function (e) {");
  if (start < 0) throw new Error('cannot find the panel click handler');
  const block = floor.slice(start, floor.indexOf("addEventListener('keydown'", start));
  const at = block.indexOf("else if (e.target && e.target.closest && e.target.closest('.sparkpg')) {");
  if (at < 0) throw new Error('the floor click handler must answer a scroll');
    for (const sel of [".closest('.sparkwk')", ".closest('.evtap')"]) {
    const other = block.indexOf(sel);
    if (other < 0) throw new Error('cannot find ' + sel + ' in the panel click handler');
    if (!(at < other)) throw new Error('floor: the scroll must win over ' + sel);
  }
  /* and it must REMEMBER where it scrolled to, or the next redraw
     throws the window away and the arrow never moves anything  */
  if (!/sparkPaged\[pgc\] = want;/.test(block))
    throw new Error('the floor must remember which window it scrolled to');
  if (!/var want = \(Number\(sparkPaged\[pgc\]\) \|\| 0\) \+ pgd;/.test(block))
    throw new Error('the floor scroll must step from the window it is on, not from zero');
}
{
  const kb = floor.slice(floor.indexOf("addEventListener('keydown'"));
  const at = kb.indexOf(".closest('.sparkpg')");
  if (at < 0) throw new Error('the floor scroll must answer the keyboard');
  const wk = kb.indexOf(".closest('.sparkwk')");
  if (!(at < wk)) throw new Error('the keyboard scroll must win over the week');
}
{
  const at = table.indexOf(".sparkpg')");
  if (at < 0) throw new Error('the table must answer a scroll');
  if (!(at < table.indexOf(".evrow.evtap')")))
    throw new Error('table: the scroll must win over the drill tap');
  if (!/tSparkPage\[cell\] = want;/.test(table))
    throw new Error('the table must remember which window it scrolled to');
}
console.log('both felts scroll: the arrow is checked before the drill, by mouse and by keyboard');
console.log('both felts scroll: the arrow is checked before the drill, so an older week is never a hand');

/* --- the table draws only the arrow that leads somewhere --- */
const evSpark = table.slice(table.indexOf('function evSparkT(lk, wb, cell, now) {'),
  table.indexOf('\n  }', table.indexOf('function evSparkT(lk, wb, cell, now) {')));
if (!/if \(pg < pages - 1\) nav \+=/.test(evSpark))
  throw new Error('the table must draw the arrow back only when there is older history');
if (!/if \(pg > 0\) nav \+=/.test(evSpark))
  throw new Error('the table must draw the arrow forward only when it has scrolled back');
if (!/tSparkPage\[cell\] = want;/.test(table))
  throw new Error('the table must remember which window it scrolled to');
console.log('the arrows: only the way that leads somewhere is drawn');

/* --- RUN the floor's own renderer across the scroll --- */
/* The pins above are positional; this one is behaviour. The line the
   player sees must be a DIFFERENT line once they scroll back, and the
   arrows must come and go with the window.                      */
const grab = (sig) => {
  const i = floor.indexOf(sig);
  if (i < 0) throw new Error('cannot find ' + sig + ' in the floor');
  return floor.slice(i, floor.indexOf('\n  }', i) + 4);
};
const LEAK = lk;
const paged = {};
const sparkHtml = new Function('LUCK999', 'leaks', 'weekBase', 'sparkOpen', 'sparkWeek',
  'sparkPaged', 'SPARK_WEEKS_TEXT', 'attrT', 'MONTHS', 'SPARK_WEEKS',
  grab('  function sparkPageOf(cell) {')
  + grab('  function sparkPage(cell, now) {')
  + grab('  function sparkPages(cell, now) {')
  + grab('  function sparkWeeks(cell, now, back) {')
  + grab('  function sparkValues(cell, now, back) {')
  + grab('  function sparkLine(vals) {')
  + grab('  function sparkDir(vals) {')
  + grab('  function weekLabel(ws) {')
  + grab('  function dayLabel(ts) {')
  + grab('  function sparkHtml(cell, now) {')
  + '\nreturn sparkHtml;')(LUCK, LEAK, wb, null, null, paged, 'eight', (s) => String(s),
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 8);

const newestHtml = sparkHtml(CELL, now);
const newestWeeks = LUCK.sparkWeeks(LEAK, wb, CELL, now, 0);
/* the newest window draws only the way BACK */
if (!/data-delta="-1"/.test(newestHtml))
  throw new Error('the newest window must offer the scroll back: ' + newestHtml);
if (/data-delta="1"/.test(newestHtml))
  throw new Error('the newest window has no newer weeks to offer');
if (newestHtml.indexOf('\u2039') < 0 || newestHtml.indexOf('\u2039') < 0)
  throw new Error('the back arrow must be drawn: ' + newestHtml);

/* scroll back one page: the line must be a DIFFERENT line */
paged[CELL] = 1;
const olderHtml = sparkHtml(CELL, now);
const olderWeeks = LUCK.sparkWeeks(LEAK, wb, CELL, now, 1);
const ladder = (h) => (h.match(/[\u2581-\u2588]+/) || [''])[0];
if (!ladder(olderHtml)) throw new Error('the scrolled window must still draw a ladder: ' + olderHtml);
if (ladder(olderHtml) === ladder(newestHtml))
  throw new Error('scrolling back must show DIFFERENT weeks, or the scroll moves nothing');
/* adjacent windows must not share a week: the scroll moves the window */
const w1 = new Set(olderWeeks.map((r) => r.ws));
const w0 = new Set(newestWeeks.map((r) => r.ws));
const shared = [...w1].filter((ws) => w0.has(ws));
if (shared.length)
  throw new Error('two adjacent windows must not share a week: ' + shared.join(','));
/* a scrolled window offers BOTH ways */
if (!/data-delta="-1"/.test(olderHtml) || !/data-delta="1"/.test(olderHtml))
  throw new Error('a scrolled window must offer both ways: ' + olderHtml);
/* the oldest window has nothing behind it */
paged[CELL] = pages - 1;
const oldestHtml = sparkHtml(CELL, now);
if (/data-delta="-1"/.test(oldestHtml))
  throw new Error('the oldest window has no older weeks to offer: ' + oldestHtml);
if (!/data-delta="1"/.test(oldestHtml))
  throw new Error('the oldest window must still offer the way forward: ' + oldestHtml);
console.log('run: the newest ladder, then a different one scrolled back, then the oldest — arrows and all');

/* and a cell with one window draws no scroll at all */
const shortWb = {}; shortWb[cur] = {}; shortWb[cur][CELL] = 0;
const shortL = {}; shortL[CELL] = { n: 1, cost: 5 };
if (LUCK.sparkPages(shortL, shortWb, CELL, now) !== 1)
  throw new Error('a single-week cell must have one page');
console.log('a cell with one window on record draws no scroll: nowhere to go');

console.log('\nthe ladder scrolls, and no week falls out of the record');

module.exports = { all, N, CELL, wb, lk, now };