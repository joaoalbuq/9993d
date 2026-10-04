/* Each memory's own retention, on its own chip, and the two shares
   that made it. A leak cools by AGE (the window the player sets) and
   by DRILLING (hands served since the stamp), and those are two
   separate settings — so a single retention a player cannot split is
   a number they cannot act on. The chip therefore wears the
   retention every time, and beside a cooled one names how much is
   age and how much is the drill. The shares must be the ranking's
   OWN factors: leakWeight multiplies two powers, and if the chip
   computed its own the row could print two answers at once.       */
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
const HALF = 7 * 864e5, DRILL_HALF = 250, CAP = 100;
/* the drill's share is read through drillCool, the one place that
   knows about the off switch \u2014 so a chip can never divide by a
   half-life nobody set                                         */
const drillCoolAt = (half) => extract('drillCool', 'LEAK_DRILL_HALF')(half);
const drillCool = drillCoolAt(DRILL_HALF);
const leakWeight = extract('leakWeight', 'LEAK_HALF, LEAK_DRILL_HALF, LEAK_CAP, drillCool')(HALF, DRILL_HALF, CAP, drillCool);
const coolKeep = extract('coolKeep', '')();
const coolParts = extract('coolParts', 'LEAK_HALF, LEAK_DRILL_HALF, drillCool, coolKeep')(HALF, DRILL_HALF, drillCool, coolKeep);

/* --- the parts are the ranking's own factors, not a second opinion --- */
const NOW = 1e12;
const shaped = [
  ['fresh', { n: 4, cost: 200, ts: NOW }],
  ['aged one half-life', { n: 4, cost: 200, ts: NOW - HALF }],
  ['drilled one half-life', { n: 4, cost: 200, ts: NOW, d: 0 }],
  ['drilled hard, under the cap', { n: 6, cost: 600, ts: NOW, d: 0 }],
  ['both, unevenly', { n: 4, cost: 200, ts: NOW - 3 * HALF, d: 0 }]
];
for (const [label, e] of shaped) {
  const served = e.d == null ? 0 : Math.max(0, 4 * DRILL_HALF - e.d);
  const row = Object.assign({}, e, { w: leakWeight(e, NOW, 4 * DRILL_HALF) });
  const p = coolParts(row, NOW, 4 * DRILL_HALF);
  if (p.keep !== coolKeep(row)) throw new Error(label + ': the retention must be the ranking’s own: ' + p.keep);
  if (Math.abs(p.age - Math.pow(0.5, Math.max(0, (NOW - e.ts) / HALF))) > 1e-12)
    throw new Error(label + ': the age share must be the ranking’s own factor: ' + p.age);
  if (Math.abs(p.drill - Math.pow(0.5, served / DRILL_HALF)) > 1e-12)
    throw new Error(label + ': the drill share must be the ranking’s own factor: ' + p.drill);
  if (p.served !== served) throw new Error(label + ': the hands served must be named: ' + p.served);
  if (Math.abs(p.halves - Math.max(0, (NOW - e.ts) / HALF)) > 1e-12)
    throw new Error(label + ': the half-lives must be named: ' + p.halves);
  /* uncapped, the two shares are the retention, exactly: a player who
     multiplies the chip’s own figures must land on its own figure */
  if (!p.capped && Math.abs(p.age * p.drill - p.keep) > 1e-9)
    throw new Error(label + ': age × drill must be the retention it is beside: ' +
      p.age + ' × ' + p.drill + ' ≠ ' + p.keep);
}
/* and the cap, when it bites, says so rather than letting the two
   shares read as if they accounted for the whole loss */
/* a heavy fresh row is the cap's own case: the queue weighs no row
   past 100, so a toll of 600 can only ever weigh a sixth of itself —
   and that is the cap, not age and not the drill          */
const capped = coolParts(row({ n: 6, cost: 600, ts: NOW }, 0), NOW, 0);
if (!capped.capped) throw new Error('a row held at the cap must say it is held');
if (capped.keep !== CAP / 600) throw new Error('the cap still weighs its own 100: ' + capped.keep);
if (capped.age !== 1 || capped.drill !== 1)
  throw new Error('and neither memory may be blamed for it: ' + capped.age + '/' + capped.drill);
const uncapped = coolParts(row({ n: 1, cost: 60, ts: NOW }, 0), NOW, 0);
if (uncapped.capped) throw new Error('a row under the cap is not a capped row');
/* the shares survive a junk clock: a stamp in the future, or a drill
   clock that has gone backwards, is no reason to invent retention */
const future = coolParts(row({ n: 1, cost: 50, ts: NOW + 4 * HALF }, 0), NOW, 0);
if (future.age !== 1 || future.halves !== 0) throw new Error('a clock that ran backwards cools nothing');
const ahead = coolParts(row({ n: 1, cost: 50, ts: NOW, d: 4 * DRILL_HALF + 99 }, 4 * DRILL_HALF), NOW, 4 * DRILL_HALF);
if (ahead.drill !== 1 || ahead.served !== 0) throw new Error('hands not yet served cool nothing');
/* nothing to weigh is nothing, not a pair of ones */
if (coolParts(null, NOW, 0) !== null) throw new Error('no row, nothing to weigh');
if (coolParts({ n: 1, cost: 0, w: 0 }, NOW, 0) !== null) throw new Error('a costless row reads as nothing');
if (coolParts({ n: 1, cost: 60, w: null }, NOW, 0) !== null) throw new Error('an unweighted row has no retention');
console.log('the parts: the ranking’s own two factors, and the cap named when it holds them');

/* --- the chip's own words: age against drill, in the player's own
       currency, with the raw halves on the title --- */
const drillHalfPhrase = extract('drillHalfPhrase', 'LEAK_DRILL_HALF')(DRILL_HALF);
const coolSplit = extract('coolSplit', 'leakWindowLabel, drillHalfPhrase, LEAK_CAP')(
  () => '1w', drillHalfPhrase, CAP);
/* the chip reads RANKED rows: the weight the ranking itself computed,
   at the same instant and the same drill clock the panel weighs at  */
function row(e, drills) {
  return Object.assign({}, e, { w: leakWeight(e, NOW, drills || 0) });
}
function chip(e, drills) { return coolSplit(coolParts(row(e, drills), NOW, drills)); }
const agedOnly = chip({ n: 2, cost: 100, ts: NOW - HALF }, 0);
if (!/age 50%/.test(agedOnly)) throw new Error('one half-life of age is half the memory: ' + agedOnly);
if (!/drill 100%/.test(agedOnly)) throw new Error('and the drill kept all of it: ' + agedOnly);
if (!/1\.0 half-lives old \(one per 1w\)/.test(agedOnly))
  throw new Error('the title must carry the raw age: ' + agedOnly);
if (/class="ccap"/.test(agedOnly)) throw new Error('nothing capped here: ' + agedOnly);
const drilledOnly = chip({ n: 2, cost: 100, ts: NOW, d: 0 }, 2 * DRILL_HALF);
if (!/age 100%/.test(drilledOnly) || !/drill 25%/.test(drilledOnly))
  throw new Error('two drill half-lives keep a quarter: ' + drilledOnly);
if (!/500 hands served since the drill \(one per 250\)/.test(drilledOnly))
  throw new Error('the title must carry the raw drill: ' + drilledOnly);
const both = chip({ n: 2, cost: 100, ts: NOW - HALF, d: 0 }, DRILL_HALF);
if (!/age 50% · drill 50%/.test(both)) throw new Error('the two shares must sit side by side: ' + both);
if (/class="ccap"/.test(both)) throw new Error('a half and a half is not the cap: ' + both);
const cappedChip = chip({ n: 6, cost: 600, ts: NOW }, 0);
if (!/class="ccap"/.test(cappedChip)) throw new Error('a capped row must name the cap: ' + cappedChip);
if (!/no row past 100/.test(cappedChip)) throw new Error('and say what the cap is: ' + cappedChip);
console.log('the chip: age 50% · drill 50%, with the raw halves on the title, and the cap named');

/* --- every memory wears it: a fresh row is a memory too --- */
if (!/var parts = leakView === 'session' \? null : coolParts\(c, leakNow, gradClock\);/.test(src))
  throw new Error('the chip must read the parts at the ranking’s own instant');
if (!/var leakNow = Date\.now\(\);/.test(src))
  throw new Error('the parts and the ranking must be weighed at one instant');
if (!/gradClock\);/.test(src))
  throw new Error('the drill share must read the live drill clock');
if (!/' <span class="cool" title="the share of its toll the queue still weighs/.test(src))
  throw new Error('the chip must ride the pull, beside the honest cost');
/* the session tab prices this sitting’s misses and has no decay to
   divide, so it wears no chip at all — a share of nothing is nothing */
if (!/var keep = parts == null \? null : parts\.keep;/.test(src))
  throw new Error('the fade must read the same retention the chip does');
/* the split is the whole point, so where it sits is pinned here too:
   beside every retention, and on the cooled ones only           */
if (!/'\\u2744 ' \+ Math\.round\(keep \* 100\) \+ '%' \+\s*\n\s*\(keep > 0\.995 \? '' : coolSplit\(parts\)\) \+ '<\/span>'/.test(src))
  throw new Error('every memory wears its retention, and a cooled one carries the split');
if (!/var cool = keep == null \? '' :/.test(src))
  throw new Error('the split belongs to the all-time ranking, like the retention');
if (!/\.leaks \.cool \.coff \{ color: rgba\(255,255,255,0\.35\); \}/.test(src))
  throw new Error('a drill that has been switched off must read as quiet as the cap does');
console.log('the placement: every memory wears its retention, on the all-time ranking only');

console.log('\nretention chips verified');