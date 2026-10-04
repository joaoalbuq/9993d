/* The extremes, and what they were made of. A band's far ends — the
   best and worst z the gap has ever read — are stamped with the round
   they happened on, and a round number alone says nothing about the
   book it landed on: the same round is worth a different thing on a
   different ledger. So the engine's leg and the felt's are banked WITH
   the stamp, and hovering an extreme names them, in the strip's own
   spelling and through the strip's own gap word — one figure, one
   source, so the hover cannot describe a different gap from the one
   the σ was measured on.                                        */
'use strict';
const fs = require('fs');
const path = require('path');
const LUCK = require(path.join(__dirname, '..', 'luck999.js'));
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
function extract(name, args) {
  const fnFull = grab('  function ' + name + '(', '\n  }');
  const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
  const sig = fnFull.slice(fnFull.indexOf('('), fnFull.indexOf(')') + 1);
  return new Function(args, 'return function ' + name + sig + ' {' + fnBody + '}');
}

/* --- signed: the strip's spelling, lifted out so a title can use it --- */
const signed = LUCK.signed;
if (typeof signed !== 'function') throw new Error('the shared module must hand the signed figure out');
if (signed(12.44, true) !== '+12.4') throw new Error('the engine is quoted to one decimal: ' + signed(12.44, true));
if (signed(-227.63, true) !== '\u2212227.6') throw new Error('with the typographic minus: ' + signed(-227.63, true));
if (signed(240, false) !== '+240') throw new Error('the felt is quoted in whole chips: ' + signed(240, false));
if (signed(-37.5, false) !== '\u221237.5') throw new Error('and keeps its half-chip: ' + signed(-37.5, false));
/* the strip must now speak through the same helper, so the two can
   never drift: one line, one spelling                          */
const line = LUCK.stripLine({ rounds: 9, ev: -12.44, felt: -240, sd2: 13225 });
if (!/EV <b>\u221212\.4<\/b> engine/.test(line)) throw new Error('the engine leg: ' + line);
if (!/<b>\u2212240<\/b> felt/.test(line)) throw new Error('the felt leg: ' + line);
if (!/\u2212227\.6<\/b> luck/.test(line)) throw new Error('and the gap between them: ' + line);
if (/\u22120\.0<\/b> engine/.test(line)) throw new Error('rounding must not break the sign');
console.log('the spelling: engine one decimal, felt in chips, gap by the shared word');

/* --- the legs are banked with the stamp --- */
const noteSrc = grab('  function noteLuck() {', '\n  }');
/* the ledger's own count rides beside the book's: the stamp comes
   from the ledger, so the same round number in two books is two
   different moments, and an old extreme must keep its own         */
function noteRun(book, range, ledger) {
  return new Function('LUCK999', 'evSession', 'evLedgerRounds', 'luckRange', 'saveRange',
    noteSrc + '\nreturn function () { noteLuck(); return luckRange; };')(
    LUCK, book, ledger == null ? book.rounds : ledger, range, function () {})();
}
const first = noteRun({ rounds: 9, ev: -12.44, felt: -240, sd2: 13225 },
  { hi: null, lo: null, hiAt: null, loAt: null });
if (first.hiEv !== -12.44 || first.hiFelt !== -240 || first.hiSd2 !== 13225)
  throw new Error('the stamp must carry the book it landed on: ' + JSON.stringify(first));
if (first.loEv !== -12.44 || first.loFelt !== -240)
  throw new Error('both ends of a first read come from the same book');
/* an end that does not move keeps ITS OWN figures, not the new book's */
const hotter = noteRun({ rounds: 21, ev: 5, felt: 900, sd2: 40000 },
  { hi: 2.5, hiAt: 9, hiEv: -12.44, hiFelt: -240, hiSd2: 13225, lo: -1, loAt: 3, loEv: -4, loFelt: -30, loSd2: 13225 });
if (hotter.hiEv !== 5 || hotter.hiFelt !== 900 || hotter.hiSd2 !== 40000)
  throw new Error('a moved end re-stamps its own figures: ' + JSON.stringify(hotter));
if (hotter.loEv !== -4 || hotter.loFelt !== -30)
  throw new Error('an untouched end keeps the figures of the round it was: ' + JSON.stringify(hotter));
if (noteRun({ rounds: 0, ev: 0, felt: 0, sd2: 0 }, { hi: null, lo: null }).hi !== null)
  throw new Error('a book with no spread sets no extreme');
console.log('the bank: the engine, the felt and the spread travel with the round they happened on');

/* --- the title: the figures, and the gap the σ was measured on --- */
const luckRoundTxt = extract('luckRoundTxt', '')();
const luckEndTitle = extract('luckEndTitle', 'LUCK999')(LUCK);
const luckEndTxt = extract('luckEndTxt', 'LUCK999, luckRoundTxt')(LUCK, luckRoundTxt);
const luckEndHtml = extract('luckEndHtml', 'LUCK999, luckRoundTxt, luckEndTxt, luckEndTitle')(
  LUCK, luckRoundTxt, luckEndTxt, luckEndTitle);
const title = luckEndTitle(9, -12.44, -240, 13225);
/* exact, not a prefix: the engine is a fraction and the felt is chips,
   and the two are never interchangeable                      */
if (title.indexOf('engine \u221212.4 \u00b7') < 0) throw new Error('the engine, one decimal: ' + title);
if (title.indexOf('felt \u2212240 \u00b7') < 0) throw new Error('the felt, in chips: ' + title);
if (/12\.44|240\.0/.test(title)) throw new Error('neither leg may borrow the other\u2019s spelling: ' + title);
if (!/the gap that read \u2212227\.6/.test(title)) throw new Error('and the gap between: ' + title);
if (!/in 115 of spread/.test(title)) throw new Error('and the width it was measured against: ' + title);
/* the title's gap must be the SHARED word of the banked book — the
   very gap the z was computed from, not a second subtraction */
const banked = { rounds: 9, ev: -12.44, felt: -240, sd2: 13225 };
if (title.indexOf(LUCK.word(banked)) < 0)
  throw new Error('the title gap must be the shared word: ' + LUCK.word(banked));
if (Math.abs(LUCK.z(banked) - first.hi) > 1e-12)
  throw new Error('and that banked gap must be the z the extreme was stamped at');
/* no spread banked (a legacy field), and still a readable title */
if (/of spread/.test(luckEndTitle(9, 0, -240, null))) throw new Error('no spread banked, no spread claimed');
console.log('the title: engine \u221212.4 \u00b7 felt \u2212240 \u00b7 the gap that read \u2212227.6');

/* --- the text is unchanged, and the hover is a span around it --- */
const txt = luckEndTxt('best', 5.5, 9);
if (txt !== 'best freak hot +5.5\u03c3 (round 9)') throw new Error('the visible words must not move: ' + txt);
if (luckEndTxt('best', 5.5, null) !== 'best freak hot +5.5\u03c3')
  throw new Error('an unstamped extreme keeps its silence: ' + luckEndTxt('best', 5.5, null));
const html = luckEndHtml('best', 5.5, 9, -12.44, -240, 13225);
if (!/^<span class="luckext" title="/.test(html) || !/<\/span>$/.test(html))
  throw new Error('the hover must wrap the words, not replace them: ' + html);
if (html.indexOf(txt) < 0) throw new Error('the same words must ride inside: ' + html);
if (/<script|onerror=|javascript:/i.test(html)) throw new Error('the title must not print live markup');
console.log('the words: unchanged, and the figures ride the title around them');

/* --- a record from before the legs were banked stays plain --- */
for (const [label, args] of [
  ['no legs at all', ['worst', -1, 3, null, null, null]],
  ['a half-stamped end', ['worst', -1, 3, -4, null, 13225]],
  ['a round that is not a number', ['worst', -1, NaN, -4, -30, 13225]]
]) {
  const bare = luckEndHtml.apply(null, args);
  if (bare.indexOf('<span') >= 0) throw new Error(label + ' must print plain, not invent figures: ' + bare);
  if (bare.indexOf('title') >= 0) throw new Error(label + ' must claim nothing it never saw');
}
/* --- the pill's own node: two spans, two titles, the same words --- */
function nodeFor() {
  return { className: '', title: '', textContent: '', kids: [], appendChild(n) { this.kids.push(n); } };
}
function pillExts(range, rounds) {
  const doc = { createElement: () => nodeFor() };
  const i = src.indexOf('    var ends = evSession.rounds &&');
  const j = src.indexOf('    /* the drill\'s roster rides the pill', i);
  if (i < 0 || j < 0) throw new Error('the pill’s extremes block is not where it was');
  const body = src.slice(i, j);        /* up to the next clause, comment and all */
  const fn = new Function('document', 'LUCK999', 'evSession', 'luckRange',
    'luckEndTitle', 'luckEndTxt',
    'return (function () {' + body + '\nreturn extBox; })();');
  return fn(doc, LUCK, { rounds: rounds }, range, luckEndTitle, luckEndTxt);
}
const ranged = { hi: 5.5, hiAt: 9, hiEv: -12.44, hiFelt: -240, hiSd2: 13225,
                 lo: -2.1, loAt: 3, loEv: 8, loFelt: -180, loSd2: 39600 };
const box = pillExts(ranged, 12);
if (!box || box.kids.length !== 2) throw new Error('the pill must build one node per end');
for (const [i, want] of [[0, 'engine \u221212.4'], [1, 'engine +8.0']]) {
  const k = box.kids[i];
  if (k.className !== 'luckext') throw new Error('each end must be hoverable: ' + k.className);
  if (k.title.indexOf(want) < 0) throw new Error('end ' + i + ' must carry its OWN figures: ' + k.title);
  if (k.title.indexOf(i ? 'felt \u2212180' : 'felt \u2212240') < 0)
    throw new Error('and its own felt: ' + k.title);
  if (k.textContent.indexOf(' \u00b7 ') !== 0) throw new Error('each end rides the separator: ' + k.textContent);
}
if (box.kids[0].textContent.indexOf('best freak hot +5.5\u03c3 (round 9)') < 0)
  throw new Error('the visible words must not move: ' + box.kids[0].textContent);
if (box.kids[1].textContent.indexOf('worst cold \u22122.1\u03c3 (round 3)') < 0)
  throw new Error('nor the other end: ' + box.kids[1].textContent);
/* no priced round, or an unremembered end: no box at all, and the pill
   is never left holding an empty one                          */
if (pillExts(ranged, 0) !== null) throw new Error('an unpriced book names no extreme');
if (pillExts({ hi: null, lo: null }, 12) !== null) throw new Error('a range with no ends names none');
/* and a legacy range still rides the pill \u2014 as plain text, no hover */
const legacy = pillExts({ hi: 5.5, hiAt: 9, lo: -2.1, loAt: 3 }, 12);
for (const k of legacy.kids) {
  if (k.className) throw new Error('a legacy end must not claim a hover: ' + k.className);
  if (k.title) throw new Error('nor a title it never had');
}
if (legacy.kids[0].textContent.indexOf('best freak hot +5.5\u03c3 (round 9)') < 0)
  throw new Error('but it must still say what it always said');
/* the closing record must CARRY the legs: a review read a day later
   hovers figures the live pill remembers, and those figures have to
   have been banked with the closing itself                  */
const closeLuck = extract('closeLuck', 'evSession, luckRange, luckClose, saveLuckClose');
const closing = closeLuck({ rounds: 12, ev: -3.1, felt: -25, sd2: 158700 }, Object.assign({}, ranged), null, function () {})();
for (const f of ['hiEv', 'hiFelt', 'hiSd2', 'loEv', 'loFelt', 'loSd2'])
  if (closing[f] == null) throw new Error('the closing must bank ' + f + ': ' + JSON.stringify(closing));
if (closing.hiEv !== -12.44 || closing.loFelt !== -180)
  throw new Error('with the figures the ends were stamped at: ' + JSON.stringify(closing));
/* the session review prints the same pair, through the same helpers */
const closeHtml = extract('luckCloseHtml', 'LUCK999, luckEndHtml, luckVerdict')(
  LUCK, luckEndHtml, extract('luckVerdict', 'LUCK999')(LUCK));
const review = closeHtml({ rounds: 12, ev: -3.1, felt: -25, sd2: 158700,
  hi: 5.5, hiAt: 9, hiEv: -12.44, hiFelt: -240, hiSd2: 13225,
  lo: -2.1, loAt: 3, loEv: 8, loFelt: -180, loSd2: 39600, at: 1, was: null });
if ((review.match(/class="luckext"/g) || []).length !== 2)
  throw new Error('the closing line must hover both ends too: ' + review);
if (review.indexOf('the gap that read \u2212227.6') < 0 || review.indexOf('the gap that read \u2212188.0') < 0)
  throw new Error('with their own figures: ' + review);
if (!/>Best freak hot \+5\.5σ \(round 9\)<\/span>/.test(review))
  throw new Error('and the same visible words inside the hover: ' + review);
if (!/\.luckext \{ cursor: help;/.test(src)) throw new Error('a hover must read as a hover');
/* the restore reads the new fields one at a time, like every record */
if (!/hiEv: null, hiFelt: null, hiSd2: null, loEv: null, loFelt: null, loSd2: null/.test(src))
  throw new Error('the six leg fields must be restored through numInto');
if (!/if \(ext\) el\.appendChild\(ext\);/.test(src))
  throw new Error('the pill must append the extremes as a node');
if (!/setStatus\(s, luck\) \{ setScore\(statusTxt, s, luck \|\| '', ''\); \}/.test(src))
  throw new Error('the settle line still says what it always said');
console.log('a legacy record: printed exactly as before, inventing nothing');

console.log('\nextreme hover verified');