/* A CELL FAMILY is every total that flips at the SAME upcard. The
   chart's corrections come in columns — every hard total that turns
   at a 10 turns because tens left make the draw bust too often, and
   that reason belongs to the deck, not the total. Under test: the
   family is read from INDICES itself (never a hand-written list), it
   never crosses an upcard or a hardness, the tapped cell always
   leads and is always present, and a cell the chart does not carry
   widens to nothing.                                         */
'use strict';
const path = require('path');
const IX = require(path.join(__dirname, '..', 'index999.js'));

/* --- the tap leads, and the column follows by total --- */
const ten = IX.cellFamily('hard 16 v 10');
if (ten[0] !== 'hard 16 v 10') throw new Error('the tapped cell must lead: ' + ten);
if (ten.length !== 3) throw new Error('the 10-column must take all three of its cells: ' + ten);
for (const c of ten) if (!/v 10$/.test(c)) throw new Error('no member may cross the upcard: ' + ten);
const after = ten.slice(1).map((c) => parseInt(c.match(/\d+/)[0], 10));
if (after.join(',') !== '10,15') throw new Error('the rest walk up the column: ' + after);

const two = IX.cellFamily('hard 12 v 2');
if (two.join('|') !== 'hard 12 v 2|hard 9 v 2|hard 13 v 2')
  throw new Error('the 2-column is tapped-first then by total: ' + two);
console.log('the columns: 16 v 10 → [16, 10, 15] · 12 v 2 → [12, 9, 13], tapped first');

/* --- every family member really is in the chart at that upcard --- */
for (const c of Object.keys(IX.INDICES)) {
  const fam = IX.cellFamily(c);
  if (fam.indexOf(c) < 0) throw new Error(c + ' must be in its own family: ' + fam);
  for (const m of fam) {
    if (!IX.INDICES[m]) throw new Error('a family member must be a chart cell: ' + m);
    const p = IX.parseCell(m), q = IX.parseCell(c);
    if (p.up !== q.up || p.soft !== q.soft)
      throw new Error('a family may not cross upcard or hardness: ' + m + ' in ' + fam);
  }
}
console.log('every chart cell: in its own family, every member a real cell at the same upcard');

/* --- a tap never drills LESS than it used to --- */
for (const c of Object.keys(IX.INDICES)) {
  const fam = IX.cellFamily(c);
  if (fam.length < 1) throw new Error('a chart cell must widen to at least itself: ' + c);
}
console.log('never narrower: every tap still drills at least the cell it was given');

/* --- a lone column is that column --- */
const ace = IX.cellFamily('hard 11 v A');
if (ace.length !== 1 || ace[0] !== 'hard 11 v A')
  throw new Error('a column of one is that member: ' + ace);
console.log('a lone column: hard 11 v A is its own family — nothing to widen to');

/* --- cells the chart does not carry widen to nothing --- */
for (const c of ['soft 18 v A', 'hard 8 v 9', 'insurance v ace', 'nonsense', '', null, undefined]) {
  const fam = IX.cellFamily(c);
  if (fam.length !== 1 || fam[0] !== c)
    throw new Error('an unlisted cell must widen to itself alone, not be invented into a family: ' +
      JSON.stringify(c) + ' → ' + JSON.stringify(fam));
}
console.log('outside the chart: soft totals, plain classes and insurance drill alone — never widened');

/* --- the parse agrees with the chart's own cell() builder --- */
if (IX.cell(16, false, 10) !== 'hard 16 v 10') throw new Error('cell() moved');
const pp = IX.parseCell('hard 11 v A');
if (!pp || pp.t !== 11 || pp.up !== 11 || pp.soft !== false)
  throw new Error('an ace upcard must parse to 11: ' + JSON.stringify(pp));
if (IX.parseCell('hard 16 v 10').up !== 10) throw new Error('a ten upcard must parse to the NUMBER 10');
if (IX.parseCell('hard 12 v Q').up !== 12) throw new Error('a face upcard must parse to 12');
if (IX.parseCell('not a cell') !== null) throw new Error('rubbish must parse to null, never to a cell');
console.log('the parse: A is 11, 10 is the number 10, Q is 12, and rubbish is null');

console.log('\ncell family verified');