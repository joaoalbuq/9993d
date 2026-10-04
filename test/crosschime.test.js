/* The crossing chime. When a felt's gap first tops its OWN accumulated
   spread, the pulse blooms on that exact draw — this is that same
   event said out loud, not an approximation of it. A crossing is an
   outlier rather than a win, so it is quiet and low: a fifth on
   triangles, in the room and nowhere else, and never panned, because
   a crossing is a property of a book and not of a seat. Both felts
   sound it from the one shared voice, and it rings once per redraw
   however many sides crossed at once.                          */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require(path.join(__dirname, '..', 'room999.js'));
const LUCK = require(path.join(__dirname, '..', 'luck999.js'));
const floor = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const table = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
function grabIn(s, a, b) {
  const i = s.indexOf(a), j = s.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return s.slice(i, j + b.length);
}


/* --- one voice, both felts, tunable like any other --- */
const chimed = R.VOICES.filter(v => v.id === 'chime');
if (chimed.length !== 1) throw new Error('the registry must hold exactly one crossing chime');
if (chimed[0].where !== 'both') throw new Error('both felts can top their own spread, so both hear it');
if (!(chimed[0].gain > 0 && chimed[0].gain < 0.06)) throw new Error('a crossing is said, not celebrated: ' + chimed[0].gain);
if (!(chimed[0].send > 1.5)) throw new Error('it must arrive from the room rather than at the ear: ' + chimed[0].send);
if (R.list('floor').indexOf(chimed[0]) < 0 || R.list('table').indexOf(chimed[0]) < 0)
  throw new Error('each panel must offer the chime to hear without a round');
console.log('the voice: one crossing chime, on both felts, quiet and deep in the room');

/* --- both pages bind it, gate it, and can sound it on demand --- */
for (const [name, page] of [['floor', floor], ['table', table]]) {
  if (!/var CHIME_ROOM = function \(\) \{ return ROOM999\.send\('chime'\); \};/.test(page))
    throw new Error(name + ' must bind the crossing chime’s own send');
  const body = grabIn(page, '  function crossChime() {', '\n  }');
  if (!/var c = ready\(\); if \(!c\) return;/.test(body))
    throw new Error(name + ' must ask ready() first: muted, gated or silent means no chime');
  if (!/ROOM999\.gain\('chime'\)/.test(body))
    throw new Error(name + ' must take its level from the shared registry');
  if ((body.match(/CHIME_ROOM\(\)/g) || []).length !== 2)
    throw new Error(name + ' must send both of the chime’s notes to the room');
  if (/panFor|panForSeat/.test(body))
    throw new Error(name + ' must not pan the chime: a crossing belongs to a book, not a seat');
  if (!/else if \(id === 'chime'\) crossChime\(\);/.test(page))
    throw new Error(name + '’s Levels panel must be able to sound it before a round earns one');
}
console.log('both pages: bound to the registry, gated on ready(), and hearable from the Levels panel');

/* --- the sound itself: a low fifth, on triangles, quiet --- */
function chimeOn(page, ctx) {
  const whole = grabIn(page, '  function crossChime() {', '\n  }');
  const body = whole.slice(whole.indexOf('{') + 1, whole.lastIndexOf('}'));
  const notes = [];
  const run = new Function('ready', 'tone', 'ROOM999', 'CHIME_ROOM',
    'return function crossChime() {' + body + '};')(
    () => ctx, function () { notes.push(Array.prototype.slice.call(arguments)); }, R, () => 2.0);
  return { run: run, notes: notes };
}
for (const [name, page] of [['floor', floor], ['table', table]]) {
  const c = chimeOn(page, { currentTime: 4 });
  c.run();
  if (c.notes.length !== 2) throw new Error(name + ' must sound two notes, not one: ' + c.notes.length);
  const low = c.notes[0], high = c.notes[1];
  if (Math.abs(low[1] - 392.00) > 0.01 || Math.abs(high[1] - 587.33) > 0.01)
    throw new Error(name + ' must sound G4 then D5: ' + low[1] + ' / ' + high[1]);
  const ratio = high[1] / low[1];
  if (!(ratio > 1.49 && ratio < 1.51))
    throw new Error(name + ' must be a fifth, not an interval of convenience: ' + ratio);
  if (low[4] !== 'triangle' || high[4] !== 'triangle')
    throw new Error(name + ' must stay on triangles: a bell is a different instrument');
  if (high[0] !== low[0] || low[2] <= c.notes[0][0].currentTime)
    throw new Error(name + ' must ring on the context it was handed');
  if (!(high[2] > low[2])) throw new Error(name + ' must stagger the two notes, or they clang as one');
  for (const n of [low, high]) {
    if (n[6] !== null) throw new Error(name + ' must not slide: the pitch is the whole point');
    if (n[7]) throw new Error(name + ' must carry no panner: ' + n[7]);
    if (n[8] !== 2.0) throw new Error(name + ' must send to the chime’s own room: ' + n[8]);
    if (!(n[5] > 0 && n[5] < 0.05)) throw new Error(name + ' must stay under a whisper: ' + n[5]);
  }
  if (!(high[5] < low[5])) throw new Error(name + ' must lean on the low note, not the high one');
  /* muted, gated, or no context at all: silence, and no throw */
  const quiet = chimeOn(page, null);
  quiet.run();
  if (quiet.notes.length !== 0) throw new Error(name + ' must stay silent when ready() gives nothing');
}
console.log('the sound: G4 → D5 on triangles, quiet, staggered, in the room and nowhere else');

/* --- the wiring: keyed to the VERY draw the pulse marks --- */
/* The shipped fire block, verbatim, wrapped in a harness that supplies
   the names around it. Nothing here re-implements the rule: the code
   under test is the page's own.                                     */
const WIRES = {
  floor: {
    from: 'var duel = splitFelt(evSession, tableBook());',
    params: ['LUCK999', 'cross', 'evSession', 'line', 'splitFelt', 'tableBook',
      'duelOut', 'feltTag', 'crossChime', 'evOut'],
    ret: '{ fired: fired, line: line, evOut: evOut, named: duelOut.named, rest: duelOut.rest }'
  },
  table: {
    from: 'var duelT = LUCK999.splitFelt(combinedT(), trainStats);',
    params: ['LUCK999', 'crossT', 'trainStats', 'strip', 'duelOutT', 'combinedT', 'tOut', 'crossChime'],
    ret: '{ fired: fired, line: strip, tOut: tOut, named: duelOutT.named, rest: duelOutT.rest }'
  }
};
function wireOn(which, books) {
  const spec = WIRES[which];
  const page = which === 'floor' ? floor : table;
  const body = grabIn(page, spec.from, 'if (fired) crossChime();');
  let chimes = 0;
  const stub = () => { chimes++; };
  /* the marks the page banks beside the books: false is a draw that has
     not crossed yet and so is ARMED, null is a mark not yet set     */
  const marks = books.marks || [false, false];
  const args = which === 'floor'
    ? [LUCK, LUCK.cross(books.prev, books.combined), books.combined, 'strip',
      LUCK.splitFelt, () => books.named, { named: marks[0], rest: marks[1] },
      LUCK.feltTag, stub, null]
    : [LUCK, LUCK.cross(books.prev, books.combined), books.named, 'strip',
      { named: marks[0], rest: marks[1] }, () => books.combined, null, stub];
  const block = new Function(spec.params.join(','),
    'return function block() {' + body + '\nreturn ' + spec.ret + '; };').apply(null, args);
  const res = block();
  res.chimes = chimes;
  return res;
}
/* books, each with its own accumulated spread: one round measured at
   115, two at 163. CALM sits inside one spread, HOT tops it.        */
const CALM = { rounds: 1, ev: 0, felt: 50, sd2: 13225 };
const COLD = { rounds: 1, ev: 0, felt: -40, sd2: 13225 };      /* cold, but inside its spread */
const HOT = { rounds: 1, ev: 0, felt: 180, sd2: 13225 };
const add = (a, b) => ({
  rounds: a.rounds + b.rounds, ev: a.ev + b.ev, felt: a.felt + b.felt, sd2: a.sd2 + b.sd2
});
const ZERO = { rounds: 0, ev: 0, felt: 0, sd2: 0 };
/* the duel cases keep the COMBINED book inside its own spread (a hot
   side balanced by a cold one), so the chime they owe is owed to a
   side's crossing and to nothing else                      */
if (LUCK.out(add(HOT, COLD))) throw new Error('the balanced pair must leave the strip even, or the case proves nothing');
if (!LUCK.out(HOT)) throw new Error('the hot side must be past its own spread');
if (LUCK.out(COLD) || LUCK.out(CALM)) throw new Error('a side inside its spread is not a crossing');
/* [label, the strip's book, the duel side's own book, is the chime owed] */
const CASES = [
  ['the strip tops its own spread, and there is no duel yet', HOT, ZERO, true],
  ['nothing tops anything', CALM, ZERO, false],
  ['the strip is even but the duel’s own side tops its spread', add(HOT, COLD), HOT, true],
  ['the strip is even but the OTHER side tops its spread', add(HOT, COLD), COLD, true],
  ['three felts cross on the same draw', add(HOT, HOT), HOT, true],
  ['the duel is even and so is the strip', add(CALM, CALM), CALM, false]
];
for (const which of ['floor', 'table']) {
  for (const [label, stripBook, namedBook, want] of CASES) {
    const res = wireOn(which, { prev: false, combined: stripBook, named: namedBook });
    if (res.fired !== want)
      throw new Error(which + ': ' + label + ' must fire ' + want + ', it fired ' + res.fired);
    if (res.chimes !== (want ? 1 : 0))
      throw new Error(which + ': ' + label + ' must ring once when it fires and not at all otherwise — it rang ' + res.chimes);
    /* the ear and the eye are keyed to one draw: a side that crossed
       is bloomed in the very line the chime answers               */
    if (namedBook.rounds > 0 && want !== (res.line.indexOf('crossed') >= 0))
      throw new Error(which + ': the bloom and the chime must be keyed to the same draw: ' + res.line);
  }
  /* the mark banks: the same books again ring nothing, exactly as the
     pulse does not bloom twice, and a book RESTORED past its spread
     sets its mark without a sound                                  */
  const steady = wireOn(which, { prev: true, combined: add(HOT, HOT), named: HOT, marks: [true, true] });
  /* (the marks are set on all three books, so nothing rings)         */
  if (steady.fired !== false || steady.chimes !== 0)
    throw new Error(which + ': a steady outlier must not ring again');
  const restored = wireOn(which, { prev: null, combined: add(HOT, HOT), named: HOT, marks: [null, null] });
  if (restored.fired !== false || restored.chimes !== 0)
    throw new Error(which + ': a book restored already past its spread must set its mark quietly');
  if (restored.named !== true || restored.rest !== true)
    throw new Error(which + ': but the mark it sets is still banked: ' + restored.named + '/' + restored.rest);
}
console.log('the wiring: the chime answers the very draw the pulse blooms — once, and never twice');

/* --- the Levels panel reaches the same sound --- */
if (!/else if \(id === 'chime'\) crossChime\(\);/.test(table))
  throw new Error('the table Levels panel must sound the chime');
console.log('the panel: one tap on the row, the same chime, before any round earns one');

console.log('\ncrossing chime verified');