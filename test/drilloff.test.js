/* The drill's off switch. A leak cools two ways — by age and by hands
   served since the stamp — and a player may want only one of them: a
   long ledger where a class must not be forgotten merely for having
   been drilled. So `off` is a real pick beside 100/250/500/1k, a
   number the record keeps across reloads, and the single place that
   turns hands served into a factor (drillCool) returns 1 when it is
   off — so the ranking, the chip and every other reader agree, and
   none of them divides by a half-life nobody set.               */
'use strict';
const fs = require('fs');
const path = require('path');
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
const HALF = 7 * 864e5, CAP = 100;
const NOW = 1e12;

/* --- drillCool: the switch, and only the switch --- */
const drillCoolAt = (half) => extract('drillCool', 'LEAK_DRILL_HALF')(half);
const on = drillCoolAt(250), off = drillCoolAt(0);
if (on(0) !== 1) throw new Error('hands not yet served cool nothing');
if (Math.abs(on(250) - 0.5) > 1e-12) throw new Error('250 hands halve the pull: ' + on(250));
if (Math.abs(on(500) - 0.25) > 1e-12) throw new Error('500 hands quarter it: ' + on(500));
if (on(-99) !== 1) throw new Error('a clock that ran backwards cools nothing');
if (on(NaN) !== 1) throw new Error('hands that are not a number serve nothing');
/* off is not a short half-life and not a long one: it is none at all,
   so EVERY count is 1 — including a thousand hands served */
for (const served of [0, 1, 250, 1000, 1e6]) {
  if (off(served) !== 1) throw new Error('off must cool nothing at ' + served + ' hands, not ' + off(served));
}
if (off(250) === on(250)) throw new Error('off and 250 must not be the same setting');
console.log('drillCool: off is not a half-life, it is the absence of one \u2014 1000 hands serve nothing');

/* --- and the ranking obeys it: age alone, from the shipped weight --- */
const weightAt = (half) => extract('leakWeight', 'LEAK_HALF, LEAK_DRILL_HALF, LEAK_CAP, drillCool')(HALF, half, CAP, drillCoolAt(half));
const wOn = weightAt(250), wOff = weightAt(0);
/* a cell stamped fresh and drilled hard: 1000 hands is four half-lives */
const hammered = { n: 4, cost: 40, ts: NOW, d: 0 };
if (Math.abs(wOn(hammered, NOW, 1000) - 2.5) > 1e-9)
  throw new Error('four drill half-lives leave a sixteenth: ' + wOn(hammered, NOW, 1000));
if (wOff(hammered, NOW, 1000) !== 40)
  throw new Error('with the drill off the same cell keeps its whole toll: ' + wOff(hammered, NOW, 1000));
/* age still does its work when the drill is off — that is the point */
const aged = { n: 4, cost: 40, ts: NOW - 4 * HALF, d: 0 };
if (Math.abs(wOff(aged, NOW, 1000) - 2.5) > 1e-9)
  throw new Error('age alone must still cool a leak: ' + wOff(aged, NOW, 1000));
/* a cell the felt never stamped: no hands served, so the switch is
   not even reached — and it must not be reached by dividing by 0   */
const unstamped = { n: 1, cost: 30, ts: NOW };
if (wOff(unstamped, NOW, 99999) !== 30) throw new Error('an unstamped cell keeps its toll');
if (wOn(unstamped, NOW, 99999) !== 30) throw new Error('and does so with the drill on too');
/* the cap still caps: off does not hand a heavy row more than 100 */
const heavy = { n: 6, cost: 600, ts: NOW, d: 0 };
if (wOff(heavy, NOW, 1000) !== CAP) throw new Error('the cap is not the drill’s to lift: ' + wOff(heavy, NOW, 1000));
console.log('the ranking with the drill off: age alone cools a leak, and the cap still caps');

/* --- the pick, the record and the words --- */
/* off is a pick on the row, not a hole in it, and it is written as
   data-n="0" so the row's own handler routes it like any other   */
const winRow = src.slice(src.indexOf('class="leakwin"'), src.indexOf('class="leakwin"') + 900);
if (!/Drill hands: /.test(winRow)) throw new Error('the row must still label the drill menu');
if (!/var LEAK_DRILLS = \[\s*\n\s*\{ n: 0, label: 'off' \},/.test(src))
  throw new Error('off must lead the drill menu, where the eye lands first');
if (!/class="dh' \+ \(w\.n === LEAK_DRILL_HALF \? ' on' : ''\)/.test(src))
  throw new Error('the panel must mark the live pick \u2014 off reads as live like any other');
if (!/classList\.contains\('dh'\)\) \{[\s\S]{0,180}setDrillHalf\(Number\(e\.target\.getAttribute\('data-n'\)\)\)\) renderLeaks\(\);/.test(src))
  throw new Error('the off pick must retune and re-rank like any other');
/* the record keeps a zero: the one thing a setting may never do is
   forget itself on the next load                              */
if (!/'999\.practice\.drillhalf'/.test(src) || !/function saveDrillHalf\(\)/.test(src))
  throw new Error('the switch must persist');
if (!/isFinite\(dhRaw\.n\) && dhRaw\.n >= 0/.test(src))
  throw new Error('a stored 0 is an answer, not junk');
if (!/typeof n !== 'number' \|\| !isFinite\(n\) \|\| n < 0/.test(src))
  throw new Error('the setter must take 0 and refuse only what is not a number');
/* nothing that reads the half-life divides by it any more */
/* exactly ONE divide by the half-life in the whole page, and it is
   inside drillCool, behind the guard that off trips first \u2014 so no
   reader can divide by a half-life nobody set                 */
const divides = src.match(/Math\.pow\(0\.5, served \/ LEAK_DRILL_HALF\)/g) || [];
if (divides.length !== 1) throw new Error('only drillCool may divide by the half-life, found ' + divides.length);
if (src.indexOf('Math.pow(0.5, served / LEAK_DRILL_HALF)') < src.indexOf('function drillCool(') ||
    src.indexOf('Math.pow(0.5, served / LEAK_DRILL_HALF)') > src.indexOf('function drillCool(') + 400)
  throw new Error('and that one divide must live inside drillCool itself');
if (!/if \(!\(LEAK_DRILL_HALF > 0\)\) return 1;/.test(grab('  function drillCool(', '\n  }')))
  throw new Error('off must be answered before the divide, not after it');
if (!/drillCool\(served\)/.test(src))
  throw new Error('the ranking and the chip must both read the one factor');
/* and it is named, so a row cannot claim the drill kept everything
   by accident rather than by a switch the player threw          */
const phraseAt = (half) => extract('drillHalfPhrase', 'LEAK_DRILL_HALF')(half)();
if (phraseAt(250) !== 'one per 250') throw new Error('a live half-life names itself: ' + phraseAt(250));
if (!/^off/.test(phraseAt(0))) throw new Error('off names itself in words: ' + phraseAt(0));
if (/one per /.test(phraseAt(0))) throw new Error('nothing may read "one per 0": ' + phraseAt(0));
console.log('the pick: off leads the row, keeps across reloads, and is named in words');

/* --- the chip says OFF, not "100%" --- */
const drillHalfPhrase = () => phraseAt(0);
const coolKeep = extract('coolKeep', '')();
const coolPartsAt = (half) => extract('coolParts', 'LEAK_HALF, LEAK_DRILL_HALF, drillCool, coolKeep')(
  HALF, half, drillCoolAt(half), coolKeep);
const coolSplit = extract('coolSplit', 'leakWindowLabel, drillHalfPhrase, LEAK_CAP')(
  () => '1w', drillHalfPhrase, CAP);
const partsOn = coolPartsAt(250), partsOff = coolPartsAt(0);
const row = Object.assign({}, hammered, { w: 40 });   /* fresh, cap-free */
const offRow = coolPartsAt(0)(Object.assign({}, { n: 2, cost: 100, ts: NOW - HALF }, { w: 50 }), NOW, 1000);
if (partsOff(Object.assign({}, row, { w: 40 }), NOW, 1000).off !== true)
  throw new Error('the parts must carry the switch');
if (partsOn(Object.assign({}, row, { w: 2.5 }), NOW, 1000).off !== false)
  throw new Error('and say it is not off when it is not');
/* aged by one half-life, drilled 1000 hands, drill switched off:
   the retention is the age alone, and the chip must not read as if
   the drill had kept it                                       */
const chipOff = coolSplit(offRow);
if (!/age 50% · drill <span class="coff">off<\/span>/.test(chipOff))
  throw new Error('an off drill must read as off: ' + chipOff);
if (/drill 100%/.test(chipOff))
  throw new Error('100% beside a thrown switch is a claim the switch never made: ' + chipOff);
if (Math.abs(offRow.keep - 0.5) > 1e-9) throw new Error('the retention is age alone: ' + offRow.keep);
if (!/off \u2014 the drill cools nothing/.test(chipOff))
  throw new Error('the title must say the switch, not just print off: ' + chipOff);
const chipOn = extract('coolSplit', 'leakWindowLabel, drillHalfPhrase, LEAK_CAP')(
  () => '1w', () => phraseAt(250), CAP)(
    partsOn(Object.assign({}, { n: 2, cost: 100, ts: NOW - HALF, d: 0 }, { w: 3.125 }), NOW, 1000));
if (!/age 50% · drill 6%/.test(chipOn))
  throw new Error('the same row with the drill on is the same age and a sixth of the rest: ' + chipOn);
console.log('the chip: with the drill off it reads off, not 100%');

console.log('\ndrill off switch verified');