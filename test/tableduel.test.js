/* The live table's strip SPLITS ITS FELT, the way the practice strip does.
   The overlay priced only its own book, so it drew one felt and every
   round learned on the practice floor sat outside its luck entirely \u2014
   while the floor's strip has always drawn the duel: this table's book
   beside the shoe's own, each banded against its OWN spread.
   Under test: the shared split is one function, the table reads the
   floor's book leniently, the two are laid together before being told
   apart, each side carries its own gap, band and sigma, each side blooms
   on its own crossing, and a wipe returns both marks to nothing.  */
'use strict';
const fs = require('fs');
const path = require('path');
const table = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const floor = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const LUCK = require(path.join(__dirname, '..', 'luck999.js'));

/* --- one split, one tag: the floor cannot own them --- */
for (const [name, s] of [['floor', floor], ['table', table]]) {
  if (/function splitFelt\(combined, table\) \{[\s\S]{0,80}?\n  \}/.test(s)
    && !/return LUCK999\.splitFelt\(combined, table\);/.test(s))
    throw new Error(name + ' must delegate the split to the shared module, not keep its own');
  if (/var tn = LUCK999\.tone\(s\)/.test(s))
    throw new Error(name + ' must delegate the felt tag to the shared module, not keep its own');
}
if (typeof LUCK.splitFelt !== 'function' || typeof LUCK.feltTag !== 'function')
  throw new Error('the split and the tag must be the module own, so both felts get them');

/* the split only reads as two when BOTH sides hold rounds \u2014 a shoe with
   none of its own has no luck to set beside the other, and a reset on
   either side (the counts disagreeing) reads as one               */
const NAMED = { rounds: 4, ev: 0, felt: 400, sd2: 4000 };          /* the table */
const REST = { rounds: 6, ev: -20, felt: -300, sd2: 6000 };        /* the floor */
const COMBINED = { rounds: 10, ev: -20, felt: 100, sd2: 10000 };
const duel = LUCK.splitFelt(COMBINED, NAMED);
if (!duel) throw new Error('two books with rounds each must read as a duel');
if (duel.named.rounds !== 4 || duel.rest.rounds !== 6)
  throw new Error('the split must differ the counts: ' + JSON.stringify(duel));
if (duel.rest.ev !== -20 || duel.rest.felt !== -300 || duel.rest.sd2 !== 6000)
  throw new Error('the rest is the combined less the named felt: ' + JSON.stringify(duel.rest));
if (LUCK.splitFelt(COMBINED, null) !== null) throw new Error('no other book: no duel');
if (LUCK.splitFelt(COMBINED, { rounds: 0, ev: 0, felt: 0, sd2: 0 }) !== null)
  throw new Error('a named felt with no rounds is no side-by-side');
if (LUCK.splitFelt(NAMED, COMBINED) !== null)
  throw new Error('the counts disagreeing (a wipe on one side) reads as one felt');
console.log('one split: the table\u2019s rounds beside the floor\u2019s, and one felt until both hold rounds');

/* --- the table reads the floor\u2019s book, leniently, and lays them together --- */
/* bounded to the duel's OWN read: this page also WRITES that key when a
   round settles, so a loose search cannot tell the two apart       */
{
  const at = table.indexOf('  function practiceBookT() {');
  if (at < 0) throw new Error('cannot find the practice book read');
  const end = table.indexOf('\n  }', at);
  const read = table.slice(at, end);
  if (!/'999\.practice\.evsession'/.test(read))
    throw new Error('the duel read must take the practice floor own book');
  if (!/LUCK999\.evRestore\(p\)/.test(read))
    throw new Error('the read must go through the shared restore, or a half-written book reaches the strip');
}
if (!/function practiceBookT\(\)/.test(table))
  throw new Error('the read must be named, so it can be lenient like the shoe own');
if (!/if \(b\.rounds > 0\) return b;/.test(table))
  throw new Error('a book with no rounds is no book, and reads as one');
if (!/LUCK999\.splitFelt\(combinedT\(\), trainStats\)/.test(table))
  throw new Error('the duel must split THIS table out of the whole reconciliation');
/* the practice book IS the whole reconciliation: this page writes every
   settled round into that same key, so a night at the felt and a sitting
   at the shoe read as one running book already. Adding this table's own
   book to it would count those rounds TWICE, and the split is a
   subtraction \u2014 so the combined must be the practice book ALONE. */
if (!/function combinedT\(\) \{\s*return practiceBookT\(\);/.test(table))
  throw new Error('the whole reconciliation is the practice book itself: it already holds both felts');
if (/rounds: trainStats\.rounds \+ p\.rounds/.test(table) ||
    /felt: trainStats\.felt \+ p\.felt/.test(table))
  throw new Error('the two books must NOT be added: this table already writes its rounds into the practice book, so adding it again would count them twice');
/* and the writer is what makes that true \u2014 no writer, no whole */
if (!/localStorage\.setItem\('999\.practice\.evsession'/.test(table))
  throw new Error('this page must be writing its settled rounds into the practice book, or the split has no whole to divide');
console.log('the whole reconciliation: the practice book alone \u2014 it already holds both felts, so the split subtracts');

/* --- each side reads its OWN gap, band and sigma --- */
const tTag = LUCK.feltTag('the table', duel.named, false);
const fTag = LUCK.feltTag('the floor', duel.rest, false);
if (!/the table <b class="luck[^"]*">/.test(tTag)) throw new Error('the table side must carry its gap: ' + tTag);
if (!/the floor <b class="luck[^"]*">/.test(fTag)) throw new Error('the floor side must carry its gap: ' + fTag);
/* each against its OWN spread: 400 over a 4000 width is not the same
   reading as -300 over a 6000 width, and one sigma cannot serve both */
const tsig = tTag.match(/([+\u2212][\d.]+)\u03c3/), fsig = fTag.match(/([+\u2212][\d.]+)\u03c3/);
if (!tsig || !fsig) throw new Error('each side must carry the sigma that measures it: ' + tTag + ' / ' + fTag);
if (tsig[0] === fsig[0])
  throw new Error('two books of different width must not share one sigma: ' + tsig[0] + ' / ' + fsig[0]);
/* a book from before the spread banked no width: it says so, rather
   than standing there as a bare sign the player would misread      */
const noWidth = LUCK.feltTag('the table', { rounds: 2, ev: 0, felt: 300, sd2: 0 }, false);
if (!/no spread yet/.test(noWidth) || !/class="sd na"/.test(noWidth))
  throw new Error('a side with no width banked must say so: ' + noWidth);
console.log('each side its own size: gap, band and the sigma that measures that side alone');

/* --- each side blooms on its OWN crossing, banked apart --- */
if (!/LUCK999\.cross\(duelOutT\.named, duelT\.named\)/.test(table) ||
    !/LUCK999\.cross\(duelOutT\.rest, duelT\.rest\)/.test(table))
  throw new Error('each side must read its OWN mark, not the strip own');
if (!/var duelOutT = \{ named: null, rest: null \};/.test(table))
  throw new Error('the table must bank a mark per side');
/* and a wiped book returns both to nothing, at every wipe there is */
const wipes = table.split(/duelOutT = \{ named: null, rest: null \};/).length - 1;
if (wipes < 4)
  throw new Error('every wipe on this page must clear the duel marks: ' + wipes);
/* the floor\u2019s wipes still clear its own */
if ((floor.match(/duelOut = \{ named: null, rest: null \};/g) || []).length < 2)
  throw new Error('the floor must clear both duel marks on a fresh book too');
console.log('each side blooms alone, and a wipe returns both marks to nothing');

/* --- both strips draw the duel the same way --- */
/* the casino escape is spelled as a backslash-u in the file, so match
   the text rather than the character a regex would interpret        */
const DICE = String.fromCharCode(92, 117, 68, 56, 51, 67, 92, 117, 68, 70, 66, 48);
if (table.indexOf(DICE) < 0 || !/feltTag\('the table', duelT\.named/.test(table) ||
    !/feltTag\('the floor', duelT\.rest/.test(table))
  throw new Error('the table strip must draw the duel beside its own strip line');
if (!/feltTag\('the shoe', duel\.rest, cs\.fire\)/.test(floor))
  throw new Error('the floor strip must keep drawing its duel');
/* and the duel rides on the strip only when there IS a strip to ride on */
if (!/if \(duelT && strip\)/.test(table))
  throw new Error('the duel needs a strip to ride on');
console.log('both strips: the duel rides the reconciliation line, and only when there is one');

console.log('\nthe table\u2019s strip splits its felt the way the practice strip does');