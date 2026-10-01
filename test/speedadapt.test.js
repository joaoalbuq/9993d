/* The adaptive speed drill: nextPace extracted exactly as shipped
   and driven across its whole range — exact steps at the working
   pace, the 20ms/40ms minimums, both clamps (0.18s floor, 0.75s
   ceiling), rounding, convergence from both ends, and a closed
   loop of runs checking the cadence story a player would live.  */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* extract the shipped formula */
const a = src.indexOf('function nextPace(pace, ok) {');
if (a < 0) throw new Error('nextPace not found');
const b = src.indexOf('\n  }', a) + 4;
const block = src.slice(a, b);
if (block.split('{').length !== block.split('}').length) throw new Error('extraction unbalanced');
const body = block.slice(block.indexOf('{') + 1, block.lastIndexOf('}'));
const nextPace = new Function('pace', 'ok', body + '\nreturn nextPace;');

const close = (x, y, eps) => Math.abs(x - y) <= (eps || 1e-9);

/* --- exact steps at the working pace --- */
if (!close(nextPace(0.45, true), 0.45 - 0.027)) throw new Error('hit step: ' + nextPace(0.45, true));
if (!close(nextPace(0.45, false), 0.45 + 0.054)) throw new Error('miss step: ' + nextPace(0.45, false));
/* the minimum steps bind below: 0.06·0.30 = 18ms -> 20ms, 0.12·0.25 = 30ms -> 40ms */
if (!close(nextPace(0.30, true), 0.28)) throw new Error('hit minimum: ' + nextPace(0.30, true));
if (!close(nextPace(0.25, false), 0.29)) throw new Error('miss minimum: ' + nextPace(0.25, false));
console.log('steps exact: −6% on a hit, +12% on a miss; 20ms/40ms minimums bind');

/* --- the clamps --- */
if (nextPace(0.18, true) !== 0.18) throw new Error('floor: ' + nextPace(0.18, true));
if (nextPace(0.75, false) !== 0.75) throw new Error('ceiling: ' + nextPace(0.75, false));
if (nextPace(0.2, true) !== 0.18) throw new Error('floor approach: ' + nextPace(0.2, true));
if (nextPace(0.74, false) !== 0.75) throw new Error('ceiling approach: ' + nextPace(0.74, false));
console.log('clamps: the cadence never leaves 0.18s–0.75s, however the runs go');

/* --- rounding: every outcome lands on the millisecond grid --- */
for (let i = 0; i < 400; i++) {
  const p = 0.18 + Math.random() * 0.57;
  for (const ok of [true, false]) {
    const q = nextPace(p, ok);
    if (Math.round(q * 1000) !== q * 1000) throw new Error('grid: ' + p + ' -> ' + q);
    if (q < 0.18 || q > 0.75) throw new Error('range: ' + p + ' -> ' + q);
    if (ok && q > p + 1e-12) throw new Error('hit sped up: ' + p + ' -> ' + q);
    if (!ok && q < p - 1e-12) throw new Error('miss slowed: ' + p + ' -> ' + q);
  }
}
console.log('400 random paces × both outcomes: millisecond grid, monotone direction, in range');

/* --- convergence: a player who never misses reaches the floor;
       a player who never hits rests at the ceiling --- */
let p = 0.45;
for (let i = 0; i < 200; i++) p = nextPace(p, true);
if (p !== 0.18) throw new Error('perfect player should sit at the floor: ' + p);
p = 0.45;
for (let i = 0; i < 200; i++) p = nextPace(p, false);
if (p !== 0.75) throw new Error('struggling player should rest at the ceiling: ' + p);
console.log('convergence: 200 straight hits end at 0.18s, 200 straight misses at 0.75s');

/* --- a life: hot streak, one miss, recovery --- */
let pace = 0.45, run = [];
const sim = (ok) => { pace = nextPace(pace, ok); run.push(pace); };
sim(true); sim(true); sim(true);                 /* 0.423, 0.398, 0.374 */
if (!close(run[2], 0.374, 0.0005)) throw new Error('streak shape: ' + run);
const afterMiss = nextPace(pace, false);         /* the miss eases it back */
if (!(afterMiss > pace)) throw new Error('miss must ease: ' + afterMiss);
pace = afterMiss;
sim(true);                                       /* and the next hit tightens again */
if (!(run[run.length - 1] < afterMiss)) throw new Error('recovery must tighten again');
console.log('a life: three hits tighten, the miss eases, the next hit tightens again');

console.log('\nadaptive cadence verified');
