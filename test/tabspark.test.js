/* ONE SPARKLINE, TWO FELTS. The trend line lived on the practice
   floor alone, so the live table could show a cell's direction (this
   week against last) but never its line: two answers to "how has this
   cell been bleeding", from the one ledger both surfaces read. The
   walk, the glyphs and the direction now live in LUCK999, and the
   floor calls them there too — so there is one series and one shape.
   Under test: the shared geometry, that both felts draw it, and that
   they agree cell for cell from the same ledger.               */
'use strict';
const fs = require('fs');
const path = require('path');
const LUCK999 = require(path.join(__dirname, '..', 'luck999.js'));
const table = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const floor = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- the shared shape, exactly as shipped --- */
if (LUCK999.SPARK_WEEKS !== 8) throw new Error('the window must be eight weeks everywhere: ' + LUCK999.SPARK_WEEKS);
const rising = LUCK999.sparkLine([1, 2, 3, 4, 5, 6, 7, 8]);
if (rising !== '▁▂▃▄▅▆▇█') throw new Error('a rising series must climb the ladder: ' + rising);
if (LUCK999.sparkLine([8, 7, 6, 5, 4, 3, 2, 1]) !== '█▇▆▅▄▃▂▁')
  throw new Error('a falling series must fall it');
if (LUCK999.sparkLine([5, 5, 5, 5]) !== '▅▅▅▅') throw new Error('a flat series sits on the mid glyph');
if (LUCK999.sparkLine([3]) !== '') throw new Error('one point is no line');
if (LUCK999.sparkLine([]) !== '') throw new Error('no points is no line');
if (LUCK999.sparkLine([0, 0, 0]) !== '') throw new Error('no leak anywhere is no line');
if (LUCK999.sparkLine(null) !== '') throw new Error('null must not throw');
console.log('the shape: eight steps, scaled to its own range, flat on the mid glyph, none for one point');

/* the direction is newest against oldest */
if (LUCK999.sparkDir([1, 9]) !== 1) throw new Error('a rising line climbs');
if (LUCK999.sparkDir([9, 1]) !== -1) throw new Error('a falling line falls');
if (LUCK999.sparkDir([4, 4]) !== 0) throw new Error('a level line is flat');
if (LUCK999.sparkDir([5]) !== 0) throw new Error('one point has no direction');
console.log('the direction: newest against oldest, and one point says nothing');

/* --- the window: eight weeks, and an unreadable week is SKIPPED --- */
const now2 = Date.UTC(2026, 9, 14);
const wk2 = (b) => LUCK999.weekStart(now2) - b * 7 * 86400000;
const c2 = 'hard 12 v 2';
const lk2 = {}; lk2[c2] = { n: 2, cost: 30 };
/* eleven weeks of bases: only eight may ever be drawn */
const wb2 = {};
for (let b = 10; b >= 0; b--) wb2[wk2(b)] = { [c2]: 20 + b };
const w2 = LUCK999.sparkWeeks(lk2, wb2, c2, now2);
if (w2.length > LUCK999.SPARK_WEEKS)
  throw new Error('the window must never exceed eight weeks: ' + w2.length);
if (w2.length !== LUCK999.SPARK_WEEKS)
  throw new Error('eleven readable weeks must draw exactly eight: ' + w2.length);
/* the newest eight, oldest first */
const ages = w2.map((x) => Math.round((wk2(0) - x.ws) / (7 * 86400000)));
if (ages.join(',') !== '7,6,5,4,3,2,1,0')
  throw new Error('the window must keep the NEWEST weeks, oldest first: ' + ages);
console.log('the window: eleven weeks on record, the newest eight drawn, oldest first');

/* a week that cannot be read is SKIPPED, never drawn as a zero */
const wb3 = {};
wb3[wk2(3)] = { [c2]: 10 };            /* readable: its leak is 20-10 */
wb3[wk2(2)] = { [c2]: 12 };
wb3[wk2(1)] = { [c2]: 14 };
/* the newest week has no NEXT week, so it cannot be closed, and this
   one IS the current week so it reads from the live ledger instead */
const v3 = LUCK999.sparkValues(lk2, wb3, c2, now2);
if (v3.indexOf(0) >= 0)
  throw new Error('an unreadable week must be skipped, not drawn as a zero leak: ' + JSON.stringify(v3));
for (const x of v3) if (!(x > 0)) throw new Error('every point on a real line must be a real leak');
console.log('an unreadable week is skipped, not zero-filled — a zero would read as a real week');

/* --- the floor CALLS the shared one: no second implementation --- */
if (!/function sparkLine\(vals\) \{\s*\n\s*return LUCK999\.sparkLine\(vals\);/.test(floor))
  throw new Error('the floor must draw the line the shared module draws');
if (!/function sparkDir\(vals\) \{\s*\n\s*return LUCK999\.sparkDir\(vals\);/.test(floor))
  throw new Error('the floor must take its direction from the shared module');
if (!/return LUCK999\.sparkValues\(leaks, weekBase, cell, now, back\);/.test(floor))
  throw new Error('the floor must read its values from the shared walk');
/* the glyph ladder must exist exactly once in the product */
const ladders = [];
for (const [name, s] of [['floor', floor], ['table', table]]) {
  const n = (s.match(/2581|▁/g) || []).length;
  if (n) ladders.push(name + ':' + n);
}
const luckLadder = (fs.readFileSync(path.join(__dirname, '..', 'luck999.js'), 'utf8').match(/2581|▁/g) || []).length;
if (luckLadder !== 1) throw new Error('the glyph ladder belongs to LUCK999 alone: ' + luckLadder);
if (ladders.length) throw new Error('no page may keep its own ladder: ' + ladders.join(', '));
console.log('one implementation: the floor delegates, the ladder lives in LUCK999 and nowhere else');

/* --- the table DRAWS it beside each bar --- */
if (!/function evSparkT\(lk, wb, cell, now\) \{/.test(table))
  throw new Error('the table must render the line beside its bars');
if (/function evSparkT\(lk, wb, cell, now\) \{ return '';/.test(table))
  throw new Error('evSparkT must actually draw, not stand in as an empty stub');
if (!/var line = LUCK999\.sparkLine\(vals\);/.test(table) ||
    !/var vals = LUCK999\.sparkValues\(lk, wb, cell, now, pg\);/.test(table))
  throw new Error('the table must draw the line from the shared walk, over the table\u2019s own ledger');
if (!/evSparkT\(lk, wb, cell, now\) \+ '<\/div>'/.test(table))
  throw new Error('the line must stand inside the bar row, beside the cost');
if (!/\.training \.evleft \.evrow \.spark \{/.test(table))
  throw new Error('the line must be styled like the floor\u2019s, not left unstyled');
/* each of the floor's THREE states, checked separately: one missing
   state would otherwise hide behind the other two being present */
const SPARK_STATES = {
  down: '#43c98a',      /* green: the line falls, leaking less */
  up: '#e2705f',        /* red: it climbs, leaking more */
  flat: 'rgba(255,255,255,0.5)'
};
for (const cls of Object.keys(SPARK_STATES)) {
  const re = new RegExp('\\.training \\.evleft \\.evrow \\.spark\\.' + cls +
    ' \\{[^}]*color:\\s*' + SPARK_STATES[cls].replace(/[()]/g, '\\$&') + ';');
  if (!re.test(table))
    throw new Error('the line must carry the floor\u2019s ' + cls + ' state, in its colour: ' +
      SPARK_STATES[cls]);
}
console.log('the table: the line stands in every bar row, in the floor\u2019s three states');

/* --- the line itself is not a control; only its SCROLL is --- */
/* the bar row is still the way into a drill, so the line must not
   answer "drill this" on its own. What it may carry is the scroll:
   the arrows reach the weeks behind the window, which is a different
   question from the one the bar answers.                        */
const sparkSpan = table.match(/<span class="spark '[^]*?<\/span>' \+ nav;/);
if (sparkSpan && /data-cell|class="[^"]*evtap/.test(sparkSpan[0]))
  throw new Error('the line must not be a drill: the bar itself is the way in');
if (sparkSpan && /sparkpg/.test(sparkSpan[0]))
  throw new Error('the scroll arrows must stand OUTSIDE the line: they are not ink');
if (!/class="sparkpg"/.test(table))
  throw new Error('the ladder must be scrollable: the weeks behind the window have to be reachable');
console.log('and it is drawn, not tapped: one row still asks one drill question, and the scroll only pages the weeks');

/* --- the ledger is the SAME one, and the window is the same --- */
if (!/999\.practice\.leaks/.test(table) || !/999\.practice\.weekbase/.test(table))
  throw new Error('the table must read the floor\u2019s own keys');
if (!/999\.practice\.leaks/.test(floor) || !/999\.practice\.weekbase/.test(floor))
  throw new Error('the floor must read its own keys');

/* --- AGREE: both felts, same ledger, same shape --- */
function weekAt(now, back) { return LUCK999.weekStart(now) - back * 7 * 86400000; }
const now = Date.UTC(2026, 9, 14);
const cell = 'hard 16 v 10';
const lk = {}; lk[cell] = { n: 4, cost: 90 };
const wb = {};
wb[weekAt(now, 3)] = {};                              /* three weeks ago: nothing yet */
wb[weekAt(now, 2)] = { [cell]: 20 };                  /* this cell's base 20 then     */
wb[weekAt(now, 1)] = { [cell]: 40 };
wb[weekAt(now, 0)] = { [cell]: 55 };
/* last week's leak = 55-40 = 15; the week before = 40-20 = 20 */
/* the series, read exactly as BOTH felts read it: a CLOSED week is
   next week's base minus this week's, and the CURRENT week is the
   live ledger minus this week's base. So: week-2 → 20, week-1 → 20,
   week-0 → 15, this week → 90−55 = 35. Four points, four weeks.  */
const vals = LUCK999.sparkValues(lk, wb, cell, now);
if (vals.length !== 4) throw new Error('every readable week must appear: ' + JSON.stringify(vals));
if (vals.join(',') !== '20,20,15,35')
  throw new Error('the series must be the same leakedIn reading the floor uses: ' + JSON.stringify(vals));
const line = LUCK999.sparkLine(vals);
if (!line) throw new Error('a four-week series draws a line');
/* both felts call the SAME function, so this is the shape on each */
const floorShape = LUCK999.sparkLine(vals);
const tableShape = LUCK999.sparkLine(vals);           /* evSparkT's only path */
if (floorShape !== tableShape || floorShape !== line)
  throw new Error('the two felts must draw one shape: ' + floorShape + ' vs ' + tableShape);
console.log('they agree: one ledger, one walk, one shape — the floor\u2019s row and the table\u2019s bar');

/* --- a cell with no weeks draws nothing on either felt --- */
if (LUCK999.sparkValues({}, {}, 'hard 16 v 10', now).length !== 0)
  throw new Error('an unwritten cell must have no series');
if (LUCK999.sparkLine(LUCK999.sparkValues({}, {}, 'hard 16 v 10', now)) !== '')
  throw new Error('an unwritten cell must draw no line, not a flat one');
console.log('a cell with no history draws nothing — no zero-filled ladder on either felt');

console.log('\none sparkline, two felts, verified');