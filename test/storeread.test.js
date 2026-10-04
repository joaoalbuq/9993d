/* the storage audit, made permanent.
   -------------------------------------------------------------------
   Every `localStorage.getItem` in both pages, and how it reads what it
   finds. The fault this file exists to prevent is the all-or-nothing
   restore:

       if (raw && typeof raw.a === 'number' && typeof raw.b === 'number')
         use(raw);

   one field saved as a string throws the whole record away, so months
   of discipline, the far ends of the luck range, or the count record
   vanish over a single unreadable counter. `LUCK999.evRestore` (the
   reconciliation book) and `LUCK999.numInto` (every plain record) are
   the two readers that repair field by field, and both pages bind their
   storage into those rather than re-implementing a guard.

   The audit found, and the fix removed, ten such guards on the floor:
   coachstats, ixstats, luckrange, lucklast, forks, quizscore, counts,
   spread, speedstats, speedtrue. The table had none — its books were
   already read through `plainNum`/`evRestore` and its arrays through
   per-entry filters. The remaining reads are single scalars, filtered
   arrays, or the wholesale maps (`leaks`, `weekbase`, `replay`) whose
   entries are validated where they are used.                */
'use strict';
const fs = require('fs');
const path = require('path');
const LUCK = require('../luck999.js');

const PAGES = ['offline.html', 'table-16x9.html'];
const src = {};
for (const p of PAGES) src[p] = fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

/* ---- the shared readers ------------------------------------------------ */
if (typeof LUCK.numInto !== 'function')
  throw new Error('luck999.js must carry numInto \u2014 the lenient field read');
const SEED = { a: 0, b: 0, nul: null, deep: {} };
/* a sound record rides through untouched, key for key */
const clean = LUCK.numInto({ a: 3, b: 4, nul: null, deep: { x: 1 } }, SEED);
if (clean.a !== 3 || clean.b !== 4 || clean.nul !== null || clean.deep.x !== 1)
  throw new Error('a sound record must ride through whole: ' + JSON.stringify(clean));
/* one unreadable field costs THAT field and nothing else \u2014 the fault */
const mixed = LUCK.numInto({ a: '3', b: 4, nul: null, deep: { x: 1 } }, SEED);
if (mixed.a !== 0 || mixed.b !== 4 || mixed.deep.x !== 1)
  throw new Error('one bad field must not take the record with it: ' + JSON.stringify(mixed));
/* and the readings a saved record can be in that are not numbers */
for (const [name, bad] of [['a string', '3'], ['true', true], ['a function', function () {}],
                           ['an array', [1]], ['an object', {}], ['NaN', NaN],
                           ['Infinity', Infinity], ['undefined', undefined]]) {
  const r = LUCK.numInto({ a: bad, b: 7 }, { a: 0, b: 0 });
  if (!(r.a === 0 && r.b === 7))
    throw new Error('a field saved as ' + name + ' must read as the seed, and the rest must ride on');
}
/* the seed declares the shape: a number may not land in a field that
   holds an object, an array may not stand in for a count, and a field
   this build does not know is dropped rather than carried */
const shaped = LUCK.numInto({ byCell: 5, cost: [1], extra: 9 }, { byCell: {}, cost: 0 });
if (typeof shaped.byCell !== 'object' || shaped.cost !== 0 || 'extra' in shaped)
  throw new Error('the seed must decide the shape: ' + JSON.stringify(shaped));
/* nothing stored at all, and something stored that is not a record */
if (JSON.stringify(LUCK.numInto(null, { a: 1 })) !== '{"a":1}' ||
    JSON.stringify(LUCK.numInto('{not json', { a: 1 })) !== '{"a":1}' ||
    JSON.stringify(LUCK.numInto([1, 2], { a: 1 })) !== '{"a":1}')
  throw new Error('nothing readable must read as the seed, never as a crash');
console.log('numInto: one unreadable field costs that field \u2014 the rest of the record rides on');
/* the seed is never mutated, and the record is copied, not adopted */
const seedObj = { a: 0, b: 0 };
LUCK.numInto({ a: 9 }, seedObj);
if (seedObj.a !== 0) throw new Error('numInto must not write through the seed it was handed');

/* ---- the sweep: no all-or-nothing guard may come back ----------------- */
/* A guard that requires TWO OR MORE fields to be numbers before adopting
   the whole record is the bug, whatever it is called. The two exceptions
   are deliberate and are named here rather than hidden: the closing's
   existence test (one field, on purpose) and the table's own
   decisions/book pair, which gates entry and then reads every field
   inside it on its own. */
const EXEMPT = [
  { page: 'offline.html', line: /typeof lcRaw === 'object' && typeof lcRaw\.rounds === 'number'/ },
  { page: 'table-16x9.html', line: /typeof tsRaw\.decisions === 'number' && typeof tsRaw\.book === 'number'/ }
];
let reads = 0;
for (const p of PAGES) {
  const lines = src[p].split('\n');
  lines.forEach((l, i) => {
    if (!/localStorage\.getItem/.test(l)) return;
    reads++;
    /* the guard is the adoption line or the two after the read */
    const near = lines.slice(i, i + 6).join('\n');
    /* An ARRAY of entries is a different animal from one record: there
       each entry stands alone, so filtering an unreadable one out is the
       repair, and the rest of the list rides on. It must still be a
       filter, though \u2014 a whole array dropped for one bad entry is the
       same fault one level up. Written as `.filter` or as a walk with a
       `continue`; both keep the good entries. */
    if (/Array\.isArray\(/.test(near)) {
      if (!/(\.filter\(|continue;)/.test(near))
        throw new Error(p + ':' + (i + 1) + ' adopts a stored list whole \u2014 filter its entries instead');
      return;
    }
    const fields = near.match(/typeof [\w.]+\.(\w+) === 'number'/g) || [];
    const distinct = new Set(fields.map((s) => s.split('.')[1].replace(/ ===.*/, '')));
    if (distinct.size < 2) return;                      /* not an all-or-nothing gate */
    if (/numInto\(|evRestore\(|plainNum\(/.test(near)) return;   /* repaired field by field */
    if (EXEMPT.some((e) => e.page === p && e.line.test(near))) return;
    throw new Error(p + ':' + (i + 1) + ' restores a record all-or-nothing \u2014 ' +
      'one bad field must not discard ' + Array.from(distinct).join(' and ') +
      '\n        ' + lines[i].trim());
  });
}
if (reads < 40)
  throw new Error('the sweep must see every read in both pages \u2014 it saw ' + reads);
console.log('the sweep: ' + reads + ' reads across both pages, no all-or-nothing restore among them');

/* ---- and the ten that were fixed stay fixed ---------------------------- */
const FIXED = [
  ['coachstats', 'coachStats = LUCK999.numInto(cs, { decisions: 0, book: 0, streak: 0, best: 0, loss: 0, lossBase: 0 });'],
  ['ixstats', 'ixStats = LUCK999.numInto(ixRaw, { asked: 0, followed: 0, byCell: {} });'],
  ['luckrange', 'luckRange = LUCK999.numInto(lrRaw, { hi: null, lo: null, hiAt: null, loAt: null,\n      hiEv: null, hiFelt: null, hiSd2: null, loEv: null, loFelt: null, loSd2: null });'],
  ['lucklast', 'luckClose = LUCK999.numInto(lcRaw, { rounds: 0, ev: 0, felt: 0, sd2: 0,'],
  ['forks', 'forkStats = LUCK999.numInto(fsRaw, { forks: 0, book: 0 });'],
  ['quizscore', 'quizStats = LUCK999.numInto(qs, { asked: 0, clean: 0, chips: 0 });'],
  ['counts', 'countStats = LUCK999.numInto(cts, { guesses: 0, right: 0, offBy: 0,'],
  ['spread', 'spreadStats = LUCK999.numInto(ssRaw, { judged: 0, onCount: 0, cost: 0 });'],
  ['speedstats', 'speedScore = LUCK999.numInto(sst, { runs: 0, right: 0, bestMs: 0, streak: 0, bestStreak: 0 });'],
  ['speedtrue', 'speedTrue = LUCK999.numInto(sstt, { runs: 0, right: 0, bestMs: 0, streak: 0, bestStreak: 0 });']
];
for (const [key, pin] of FIXED)
  if (src['offline.html'].indexOf(pin) < 0)
    throw new Error('the ' + key + ' restore must read through the shared field reader: ' + pin);
console.log('the ten all-or-nothing restores now read field by field, one record at a time');

/* ---- the clamps that outlived the guards ------------------------------ */
/* clean can never exceed asked, and neither count can go negative: the
   rules were the reason those guards existed, so they must still hold
   where the junk would otherwise be adopted. */
if (!/if \(quizStats\.clean > quizStats\.asked\) quizStats\.clean = quizStats\.asked;/.test(src['offline.html']) ||
    !/if \(quizStats\.asked < 0\) quizStats\.asked = 0;/.test(src['offline.html']))
  throw new Error('a clean count must never exceed the cards answered');
if (!/coachStats = LUCK999\.numInto\(cs,[\s\S]*?coachStats\.lossBase = Math\.max\(0, \(coachStats\.decisions - coachStats\.book\) \|\| 0\);/.test(src['offline.html']))
  throw new Error('a score from before the price must still derive its own base');
/* and the closing must still be able to say it does not exist */
if (!/luckClose = null;/.test(src['offline.html']) ||
    !/typeof lcRaw\.rounds === 'number' && lcRaw\.rounds > 0/.test(src['offline.html']))
  throw new Error('no closing stored must read as no closing, never as a zeroed one');
/* the book itself keeps its own reader, and both pages use it */
if (typeof LUCK.evRestore !== 'function' ||
    src['offline.html'].indexOf('LUCK999.evRestore(JSON.parse(localStorage.getItem') < 0 ||
    src['table-16x9.html'].indexOf('LUCK999.evRestore(JSON.parse(localStorage.getItem') < 0)
  throw new Error('the reconciliation book reads through evRestore on both surfaces');
console.log('the clamps that outlived the guards: clean \u2264 asked, a derived base, and no closing stays no closing');

console.log('\nstore read verified');