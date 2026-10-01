/* The adaptive speed drill: nextPace extracted exactly as shipped
   and driven across its whole range — exact steps at the working
   pace, the 20ms/40ms minimums, the hot-streak press and the
   gently-eased breaking miss, both clamps (0.18s floor, 0.75s
   ceiling), rounding, convergence from every path, and a closed
   loop of runs checking the cadence story a player would live.  */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* extract the shipped formula */
const a = src.indexOf('function nextPace(pace, ok, heat) {');
if (a < 0) throw new Error('nextPace(pace, ok, heat) not found');
const b = src.indexOf('\n  }', a) + 4;
const block = src.slice(a, b);
if (block.split('{').length !== block.split('}').length) throw new Error('extraction unbalanced');
const body = block.slice(block.indexOf('{') + 1, block.lastIndexOf('}'));
const nextPace = new Function('pace', 'ok', 'heat', body + '\nreturn nextPace;');

const close = (x, y, eps) => Math.abs(x - y) <= (eps || 1e-9);

/* --- base curve (no heat): exact steps at the working pace --- */
if (!close(nextPace(0.45, true), 0.45 - 0.027)) throw new Error('hit step: ' + nextPace(0.45, true));
if (!close(nextPace(0.45, false), 0.45 + 0.054)) throw new Error('miss step: ' + nextPace(0.45, false));
/* the minimums bind below: 0.06·0.30 = 18ms -> 20ms, 0.12·0.25 = 30ms -> 40ms */
if (!close(nextPace(0.30, true), 0.28)) throw new Error('hit minimum: ' + nextPace(0.30, true));
if (!close(nextPace(0.25, false), 0.29)) throw new Error('miss minimum: ' + nextPace(0.25, false));
console.log('base steps exact: −6% on a hit, +12% on a miss; 20ms/40ms minimums bind');

/* --- the heat curve: a hot streak presses harder, and the miss
       that breaks a long streak eases gently --- */
if (!close(nextPace(0.45, true, 0), 0.45 - 0.027)) throw new Error('cold hit: ' + nextPace(0.45, true, 0));
if (!close(nextPace(0.45, true, 2), 0.45 - 0.027)) throw new Error('warm hit: ' + nextPace(0.45, true, 2));
if (!close(nextPace(0.45, true, 3), 0.414)) throw new Error('hot hit must press 8%/min 25ms: ' + nextPace(0.45, true, 3));
if (!close(nextPace(0.45, true, 10), 0.414)) throw new Error('blazing hit: ' + nextPace(0.45, true, 10));
if (!close(nextPace(0.30, true, 3), 0.275)) throw new Error('hot hit 25ms minimum binds: ' + nextPace(0.30, true, 3));
if (!close(nextPace(0.45, false, 0), 0.504)) throw new Error('cold miss: ' + nextPace(0.45, false, 0));
if (!close(nextPace(0.45, false, 2), 0.504)) throw new Error('warm miss: ' + nextPace(0.45, false, 2));
if (!close(nextPace(0.45, false, 3), 0.486)) throw new Error('soft miss must ease 8%/min 20ms: ' + nextPace(0.45, false, 3));
if (!close(nextPace(0.45, false, 10), 0.486)) throw new Error('long-streak miss: ' + nextPace(0.45, false, 10));
if (!close(nextPace(0.25, false, 3), 0.27)) throw new Error('soft miss 20ms minimum binds: ' + nextPace(0.25, false, 3));
if (!(nextPace(0.45, true, 3) < nextPace(0.45, true, 0))) throw new Error('hot must press harder than cold');
if (!(nextPace(0.45, false, 3) < nextPace(0.45, false, 0))) throw new Error('breaking miss must ease less than cold');
console.log('heat curve: streak ≥3 presses 8%/min-25ms on hits, eases 8%/min-20ms on the breaking miss');

/* --- the clamps: every path respects the band --- */
if (nextPace(0.18, true, 9) !== 0.18) throw new Error('floor: ' + nextPace(0.18, true, 9));
if (nextPace(0.75, false, 9) !== 0.75) throw new Error('ceiling: ' + nextPace(0.75, false, 9));
if (nextPace(0.2, true, 9) !== 0.18) throw new Error('floor approach: ' + nextPace(0.2, true, 9));
if (nextPace(0.74, false, 9) !== 0.75) throw new Error('ceiling approach: ' + nextPace(0.74, false, 9));
console.log('clamps: the cadence never leaves 0.18s–0.75s, however the runs go');

/* --- rounding: every outcome lands on the millisecond grid --- */
for (let i = 0; i < 400; i++) {
  const p = 0.18 + Math.random() * 0.57;
  for (const ok of [true, false]) {
    for (const heat of [0, 2, 9]) {
      const q = nextPace(p, ok, heat);
      if (Math.round(q * 1000) !== q * 1000) throw new Error('grid: ' + p + ' -> ' + q);
      if (q < 0.18 || q > 0.75) throw new Error('range: ' + p + ' -> ' + q);
      if (ok && q > p + 1e-12) throw new Error('hit sped up: ' + p + ' -> ' + q);
      if (!ok && q < p - 1e-12) throw new Error('miss slowed: ' + p + ' -> ' + q);
    }
  }
}
console.log('400 random paces × both outcomes × three heats: grid, monotone, in range');

/* --- convergence: every path reaches its bound --- */
let p = 0.45;
for (let i = 0; i < 200; i++) p = nextPace(p, true);
if (p !== 0.18) throw new Error('perfect player should sit at the floor: ' + p);
p = 0.45;
for (let i = 0; i < 200; i++) p = nextPace(p, false);
if (p !== 0.75) throw new Error('struggling player should rest at the ceiling: ' + p);
p = 0.45;
for (let i = 0; i < 200; i++) p = nextPace(p, true, 9);
if (p !== 0.18) throw new Error('hot player must also reach the floor: ' + p);
console.log('convergence: 200 hits end at the floor, 200 misses at the ceiling, hot or cold');

/* --- a life: hot streak, the breaking miss, recovery — with the
       exact heat semantics speedLock uses (the press rides the
       streak the run lands ON) --- */
let pace = 0.45, heat = 0;
const sim = (ok) => { const into = heat; heat = ok ? heat + 1 : 0; pace = nextPace(pace, ok, into); };
sim(true); sim(true); sim(true);                 /* streak 0→1→2: 0.423, 0.398, 0.374 */
if (!close(pace, 0.374, 0.0005)) throw new Error('streak shape: ' + pace);
const broke = pace;                               /* riding a streak of 3 into the miss */
const afterMiss = nextPace(broke, false, 3);      /* the breaking miss eases GENTLY */
if (!(afterMiss > broke && afterMiss < nextPace(broke, false, 0)))
  throw new Error('breaking miss must ease, but gently: ' + afterMiss);
pace = afterMiss; heat = 0;
sim(true);                                       /* the next hit tightens again */
if (!(pace < afterMiss)) throw new Error('recovery must tighten again');
console.log('a life: three hits tighten at 6%, the breaking miss eases gently at 8%, recovery tightens again');

console.log('\nadaptive cadence verified');
