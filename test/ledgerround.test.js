/* The ledger's own round counter. The extremes outlive a new book by
   design — a new book zeroes the reconciliation, and what luck has
   already shown is not thrown away with it. But the BOOK's round
   count starts again at one on every new book, so it cannot say where
   an extreme happened: "round 9" would name two different books, and
   the old one's banked figures would be read against the new one's.
   So the stamps come from a count that never restarts: every round
   this player has ever priced, kept beside the books, read leniently,
   lifted to the book's own count when a hand-off has moved ahead of
   it, and touched by no wipe.                                      */
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

/* --- the boot: one read, leniently, and never below the book --- */
const boot = src.slice(src.indexOf('  var evLedgerRounds = 0;'), src.indexOf('  function saveRounds()'));
if (!/'999\.practice\.evrounds'/.test(boot)) throw new Error('the counter must persist');
if (!/LUCK999\.numInto\(JSON\.parse\(localStorage\.getItem\('999\.practice\.evrounds'\) \|\| 'null'\), \{ n: 0 \}\)/.test(boot))
  throw new Error('it must be read through the shared field reader, like every other record');
if (!/if \(!\(evLedgerRounds >= evSession\.rounds\)\) evLedgerRounds = evSession\.rounds;/.test(boot))
  throw new Error('a book ahead of the counter must lift it — a hand-off adds a round while away');
if (!/function saveRounds\(\)/.test(src)) throw new Error('it must be written back');
if (!/JSON\.stringify\(\{ n: evLedgerRounds \}\)/.test(src))
  throw new Error('and stored as one plain field');

/* a store read: sound, junk, or missing — each lands somewhere sane */
function bootWith(stored, rounds) {
  const mem = stored === undefined ? {} : { '999.practice.evrounds': stored };
  const ls = { getItem: k => (k in mem ? mem[k] : null), setItem: () => {} };
  const body = boot + '\nreturn evLedgerRounds;';
  return new Function('localStorage', 'LUCK999', 'evSession', body)(ls, LUCK, { rounds: rounds });
}
if (bootWith(JSON.stringify({ n: 412 }), 12) !== 412)
  throw new Error('a stored count comes back as itself');
if (bootWith(undefined, 12) !== 12)
  throw new Error('nothing stored: the book is the only truth there is');
if (bootWith('null', 12) !== 12) throw new Error('an empty record is nothing stored');
if (bootWith(JSON.stringify({ n: 'junk' }), 12) !== 12)
  throw new Error('a junk count falls back to the book, it does not become NaN');
if (bootWith(JSON.stringify({ n: -4 }), 12) !== 12) throw new Error('a negative count is no count');
if (bootWith(JSON.stringify({ n: NaN }), 12) !== 12) throw new Error('NaN is no count');
if (bootWith(JSON.stringify({ n: Infinity }), 12) !== 12) throw new Error('Infinity is no count');
if (bootWith('{ broken json', 12) !== 12) throw new Error('broken JSON is nothing stored');
/* the counter may lead the book (older rounds already folded away) but
   must never trail it — that is the whole promise                */
if (bootWith(JSON.stringify({ n: 400 }), 12) !== 400)
  throw new Error('a counter ahead of the book is kept: the books were wiped, the count was not');
console.log('the boot: read leniently, and never below the book it counts into');

/* --- the commit: one round, both counts --- */
if (!/evSession\.rounds\+\+;\n      evLedgerRounds\+\+;/.test(src))
  throw new Error('a priced round must count into both');
if (!/evSession\.rounds\+\+;\n      evLedgerRounds\+\+;[^;]*saveRounds\(\);/.test(src))
  throw new Error('and the ledger count must be written at that same commit');
/* an unpriced round must move neither: the strip pins that the commit
   is inside `if (evRound && evPriced)`                         */
const commit = grab('    if (evRound && evPriced) {', 'renderEvStrip();');
if (!/evLedgerRounds\+\+;/.test(commit)) throw new Error('the ledger rides the commit');
if (!/noteLuck\(\);/.test(commit)) throw new Error('and the extremes ride it beside');

/* --- no wipe restarts it: that is what makes the stamps unique --- */
const resetEv = grab('  function resetEv() {', '\n  }');
if (/evLedgerRounds/.test(resetEv))
  throw new Error('a new book must NOT restart the ledger count — that is the fault this fixes');
if (!/evSession = \{ rounds: 0, ev: 0, felt: 0, sd2: 0 \};/.test(resetEv))
  throw new Error('but it must still zero the book it is counting into');
const shoe = grab('  function resetTraining() {', '\n  }');
if (/evLedgerRounds/.test(shoe))
  throw new Error('the fresh shoe must not restart it either: the extremes ride that wipe untouched');
if (!/resetEv\(\);/.test(shoe)) throw new Error('and it still wipes the book');
console.log('the wipes: a new book zeroes the book and leaves the count alone');

/* --- the stamp is the ledger's, and two books cannot collide --- */
const noteSrc = grab('  function noteLuck() {', '\n  }');
function noteAt(book, ledger, range) {
  return new Function('LUCK999', 'evSession', 'evLedgerRounds', 'luckRange', 'saveRange',
    noteSrc + '\nreturn function () { noteLuck(); return luckRange; };')(
    LUCK, book, ledger, range, function () {})();
}
const empty = { hi: null, lo: null, hiAt: null, loAt: null, hiEv: null, hiFelt: null, hiSd2: null,
                loEv: null, loFelt: null, loSd2: null };
/* BOOK ONE: a freak hot on its ninth round, ledger round 9. The book's
   own count and the ledger's agree here — nothing has been wiped yet,
   so this is the case the old stamping got right, and it must keep
   getting right.                                                      */
const b1 = noteAt({ rounds: 9, ev: 0, felt: 400, sd2: 13225 }, 9, Object.assign({}, empty));
if (Math.abs(b1.hi - 3.48) > 0.01) throw new Error('book one reads a freak hot: ' + b1.hi);
if (b1.hiAt !== 9) throw new Error('and stamps it on round 9: ' + b1.hiAt);
if (b1.hiFelt !== 400 || b1.hiSd2 !== 13225) throw new Error('with the figures of that book');
/* ...then book one goes cold, so the floor is banked too and a later
   ordinary read has something on BOTH sides of it to fail to beat  */
const b1b = noteAt({ rounds: 10, ev: 0, felt: -350, sd2: 26450 }, 10, Object.assign({}, b1));
if (Math.abs(b1b.lo + 2.15) > 0.01) throw new Error('book one then reads a freak cold: ' + b1b.lo);
if (b1b.loAt !== 10) throw new Error('the floor stamps round 10: ' + b1b.loAt);
if (b1b.hiAt !== 9) throw new Error('and the ceiling keeps round 9: ' + b1b.hiAt);
/* A NEW BOOK. The book counts from one again; the ledger keeps going.
   Its third round is ledger round 12. This read is an ordinary one —
   inside the old ceiling and above the old floor — so NEITHER end
   moves, and the old stamps must read 9 and not 3.                  */
const afterReset = { rounds: 0, ev: 0, felt: 0, sd2: 0 };
if (afterReset.rounds !== 0) throw new Error('the book really does restart at zero');
if (afterReset.rounds === b1.hiAt) throw new Error('and its next rounds would collide with 9');
const b2 = noteAt({ rounds: 3, ev: 0, felt: 50, sd2: 39675 }, 12, Object.assign({}, b1b));
if (b2.hi !== b1b.hi || b2.lo !== b1b.lo) throw new Error('an ordinary read moves neither end: ' + JSON.stringify(b2));
if (b2.hiAt !== 9 || b2.loAt !== 10)
  throw new Error('an end that has not moved keeps its own stamp: ' + JSON.stringify(b2));
if (b2.hiFelt !== 400 || b2.hiSd2 !== 13225)
  throw new Error('with the figures of the book it happened on, not this one: ' + JSON.stringify(b2));
/* The new book then reads past the old floor. That re-stamp MUST carry
   the ledger's 13 — the book's own count would say 4, which is the
   lie this whole change exists to stop.                              */
const b4 = noteAt({ rounds: 4, ev: 0, felt: -700, sd2: 52900 }, 13, Object.assign({}, b2));
if (Math.abs(b4.lo + 3.04) > 0.01) throw new Error('a colder read moves the floor: ' + b4.lo);
if (b4.loAt !== 13) throw new Error('and stamps it with the LEDGER round, not the book round: ' + b4.loAt);
if (b4.loAt === 4) throw new Error('the book round would have been a lie here');
if (b4.loFelt !== -700) throw new Error('with the new book’s own figures: ' + b4.loFelt);
/* and the ceiling, on the ledger’s next number */
const b5 = noteAt({ rounds: 5, ev: 0, felt: 900, sd2: 66125 }, 14, Object.assign({}, b4));
if (b5.hiAt !== 14) throw new Error('the ceiling stamps the ledger round: ' + b5.hiAt);
if (b5.hiAt === b4.loAt) throw new Error('two books must not hand out one stamp');
if (b5.hiAt !== 14 || b4.loAt !== 13) throw new Error('the stamps must be distinct');
console.log('the stamps: book one\u2019s round 9 stays round 9, and the next book\u2019s first is never also 9');

/* --- the hover says whose round it is --- */
if (!/return 'the ledger\\u2019s round ' \+ at \+ ', and the book as it stood then \\u2014 engine '/.test(src))
  throw new Error('the title must name the ledger round, or the number reads as the book\u2019s');
console.log('the hover: \u2018the ledger\u2019s round N\u2019 \u2014 the number is no longer the book\u2019s');

/* --- and the table's hand-off counts into the same ledger --- */
/* the table writes its rounds into the practice key, so on the next
   boot the book is ahead of the counter and the counter must lift */
const flushT = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const flushBody = flushT.slice(flushT.indexOf('  function flushRecon('), flushT.indexOf('  function fmtT('));
if (!/book\.rounds \+= 1;/.test(flushBody))
  throw new Error('the hand-off must still count its rounds into the practice book');
if (!/'999\.practice\.evsession'/.test(flushBody))
  throw new Error('which is the very book the counter is lifted to on the next boot');
console.log('the hand-off: a night at the felt lifts the counter on the next boot, never lowers it');

console.log('\nledger round counter verified');