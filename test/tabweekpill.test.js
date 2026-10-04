/* The live table's week marker PARITY with the practice floor's.
   The table drew the direction glyph alone \u2014 a bare arrow saying which
   way a cell bleeds and nothing about by how much, so a player there
   could not read this week against last week without leaving for the
   floor. The floor prints the figures beside the arrow ("\u25bc 35 v 55").
   The pill now lives in LUCK999 and both felts call it, so the two
   cannot drift into saying different things about one cell.
   Under test: the markup exists in exactly ONE place, both pages reach
   for it, the table styles the figures so they cannot wrap away from
   the arrow, and a real week reading renders the floor's own pill.  */
'use strict';
const fs = require('fs');
const path = require('path');
const table = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const floor = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const LUCK = require(path.join(__dirname, '..', 'luck999.js'));

/* --- the pill is built once, in the shared module --- */
if (typeof LUCK.weekPillHtml !== 'function')
  throw new Error('the week marker must be built by the shared module, so both felts get it');
const PILL = 'title="chips leaked this week v last week';
if (!LUCKsrc().includes(PILL)) throw new Error('the module must carry the pill\u2019s own markup');
/* neither page may keep a copy: a second builder is how two answers start */
if (floor.includes(PILL)) throw new Error('the floor must delegate, not keep its own pill');
if (table.includes(PILL)) throw new Error('the table must draw the shared pill, not build a second one');
/* the floor reaches it through a wrapper so its call sites read as they always have */
const fw = floor.slice(floor.indexOf('function weekPillHtml(wk) {'));
const fwBody = fw.slice(0, fw.indexOf('\n  }'));
if (!/return LUCK999\.weekPillHtml\(wk\);/.test(fwBody))
  throw new Error('the floor\u2019s weekPillHtml must forward to the module');
/* the table builds its mark from the same reading the floor reads */
if (!/var mark = LUCK999\.weekPillHtml\(LUCK999\.weekSplit\(lk, wb, cell, now\)\);/.test(table))
  throw new Error('the table\u2019s mark must be the shared pill over the shared week reading');
console.log('one builder: the module owns the pill, and neither page keeps a copy');

/* --- the figures must not wrap away from the arrow they belong to --- */
if (!/\.training \.evleft \.wk \{[^}]*tabular-nums[^}]*white-space: nowrap/.test(table))
  throw new Error('the table must hold the figures on one line beside the arrow');
if (!/white-space: nowrap/.test(table.slice(table.indexOf('.training .evleft .wk {'))))
  throw new Error('the pill rule must not let the figures wrap');
console.log('styled: tabular figures, held on one line beside the arrow');

/* --- the reading itself, over a real week --- */
const now = Date.now();
const cur = LUCK.weekStart(now), prev = LUCK.prevWeek(cur);
const CELL = 'hard 16 v 10';
/* current week = live cost - base; last week = this week's base - last's */
const lk = {}; lk[CELL] = { n: 2, cost: 90 };
const wb = {}; wb[cur] = {}; wb[cur][CELL] = 55; wb[prev] = {}; wb[prev][CELL] = 0;
const wk = LUCK.weekSplit(lk, wb, CELL, now);
if (!wk || wk.now !== 35 || wk.was !== 55 || wk.dir !== -1)
  throw new Error('the fixture must read 35 this week against 55 last: ' + JSON.stringify(wk));
const pill = LUCK.weekPillHtml(wk);
/* the arrow, and the BOTH figures \u2014 the whole point of the change */
if (!pill.includes('\u25bc')) throw new Error('a recovering cell reads the falling arrow: ' + pill);
if (!pill.includes('35 v 55')) throw new Error('the figures must ride beside the arrow: ' + pill);
if (!pill.includes('evdir down')) throw new Error('a falling week is toned down: ' + pill);
if (!pill.includes('this week against \u221255 last week'))
  throw new Error('the hover must name both ends in chips: ' + pill);
/* and the three states, so a rising or level cell is not left untested */
const up = LUCK.weekPillHtml({ now: 70, was: 20, dir: 1 });
if (!up.includes('\u25b2') || !up.includes('70 v 20') || !up.includes('evdir up'))
  throw new Error('a bleeding cell reads the rising arrow with its figures: ' + up);
const flat = LUCK.weekPillHtml({ now: 40, was: 40, dir: 0 });
if (!flat.includes('\u00b7') || !flat.includes('40 v 40') || !flat.includes('evdir flat'))
  throw new Error('a level cell reads the middot with its figures: ' + flat);
/* no basis on either end: no marker at all, not a hollow arrow */
if (LUCK.weekPillHtml(null) !== '') throw new Error('a cell with no week basis draws no marker');
if (LUCK.weekPillHtml(LUCK.weekSplit(lk, {}, CELL, now)) !== '')
  throw new Error('a missing snapshot is not a zero leak');
console.log('the reading: \u25bc 35 v 55, \u25b2 70 v 20, \u00b7 40 v 40, and nothing at all with no basis');

/* --- RUN it: the table's rendered row must carry the floor's own pill --- */
const grab = (src, sig) => {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error('cannot find ' + sig);
  return src.slice(i, src.indexOf('\n  }', i) + 4);
};
const tsrc = grab(table, '  function evLeftT(sfx) {');
const evLeftT = new Function('scoreT', 'tSession', 'evBarTitleT', 'tLedgerRead', 'drillFeedFelt',
  'tSeeded', 'tSeedNote', 'attrTT', 'weekBaseT', 'LUCK999', 'evSparkT', 'evSparkDetailT',
  'return ' + tsrc)(
  () => ({ rows: [{ cell: CELL, cost: 90, n: 2 }], total: 90, cells: 1 }),
  {},
  () => 'the bar',
  () => lk,
  () => false,
  {},
  '',
  (s) => s,
  () => wb,
  LUCK,
  () => '',                          /* the sparkline is pinned by its own suite */
  () => '');                        /* and so is the detail strip */
const row = evLeftT();
if (row.indexOf(pill) < 0)
  throw new Error('the table row must carry the shared pill verbatim:\n  built: ' + pill + '\n  in row: ' + row);
/* and it rides where it always did: after the counting cost, beside the line */
const afterCost = row.indexOf('</b>');
if (afterCost < 0 || row.indexOf(pill) < afterCost)
  throw new Error('the week mark must ride after the cost, not before it: ' + row);
/* inside the row itself: after the bar it belongs to, before the row closes */
const rowOpen = row.indexOf('class="evrow');
const rowClose = row.indexOf('</div>', row.indexOf('class="evbar"'));
if (!(rowOpen >= 0 && row.indexOf(pill) > row.indexOf('class="evbar"') && row.indexOf(pill) < rowClose))
  throw new Error('the week mark must ride inside its own row, after the bar: ' + row);
console.log('the table row carries the floor\u2019s own pill, byte for byte');

console.log('\nthe week marker reads the same on both felts, with its figures');

function LUCKsrc() {
  return fs.readFileSync(path.join(__dirname, '..', 'luck999.js'), 'utf8');
}