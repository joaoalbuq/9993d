/* The payout walk's chip flights carry the cards' distance
   model: a clack with a flight distance lands deeper and
   quieter the farther its chips travel, while a clack without
   one keeps the plain voice the rest of the felt has always
   had. The mapping, the plain fallback, the real tray-to-box
   distances, and the walkCue wiring are the properties under
   test. The seats are part of it too: every chip that lands on
   the felt is panned by the same camera as the deal's whooshes,
   so the wager cascade and the payout walk sweep one arc.   */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOM = require(path.join(__dirname, '..', 'room999.js'));   /* the shared registry the pages read */
const src = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
const clampMatch = src.match(/function clamp\(v, a, b\) \{ return[^\n]*\}/);
if (!clampMatch) throw new Error('clamp one-liner not found');
const clamp = new Function('v', 'a', 'b', clampMatch[0].slice(clampMatch[0].indexOf('{') + 1, -1) + '\nreturn clamp;');
const lerpMatch = src.match(/function lerp\(a, b, t\) \{ return[^\n]*\}/);
if (!lerpMatch) throw new Error('lerp one-liner not found');
const lerp = new Function('a', 'b', 't', lerpMatch[0].slice(lerpMatch[0].indexOf('{') + 1, -1) + '\nreturn lerp;');

/* --- chipClack over a recording context --- */
const ccFull = grab('  function chipClack(delay, gain, dist, pan) {', '\n  }');
const ccBody = ccFull.slice(ccFull.indexOf('{') + 1, ccFull.lastIndexOf('}'));
function makeClack(withPanner) {
  const rec = { bursts: [], tones: [], panSets: [], outs: [] };
  const panner = {
    pan: { setValueAtTime: (v, t) => rec.panSets.push([v, t]) },
    connect: (dst) => rec.outs.push(dst)
  };
  const master = { tag: 'master' };
  const ctx = { currentTime: 5 };
  if (withPanner) ctx.createStereoPanner = () => panner;
  const burst = (c, t, dur, type, freq, q, gain, out) => rec.bursts.push({ freq, gain, out });
  const tone = (c, freq, t, dur, type, gain, slideTo, out) => rec.tones.push({ freq, gain, out });
  const clack = new Function('ready', 'burst', 'tone', 'clamp', 'lerp', 'master', 'toRoom', 'CLACK_ROOM', 'ROOM999',
    'return function chipClack(' + ccFull.slice(ccFull.indexOf('(') + 1, ccFull.indexOf(')')) + ') {' + ccBody + '}')(
    () => ctx, burst, tone, clamp, lerp, master, () => {}, () => ROOM.send('clack'), ROOM);
  return { clack, rec, panner, master };
}

/* --- the plain voice, untouched when no distance is given --- */
const plain = makeClack();
plain.clack(0.3, 0.8);
if (plain.rec.bursts[0].freq !== 2600 || Math.abs(plain.rec.bursts[0].gain - 0.24) > 1e-9)
  throw new Error('the plain tick must keep its voice: ' + JSON.stringify(plain.rec.bursts[0]));
if (plain.rec.tones[0].freq !== 300 || Math.abs(plain.rec.tones[0].gain - 0.16) > 1e-9)
  throw new Error('the plain thock must keep its voice: ' + JSON.stringify(plain.rec.tones[0]));
console.log('plain voice: 2600 tick / 300 thock, full level \u2014 the felt\u2019s default clack unchanged');

/* --- the model: farther flights land deeper and quieter --- */
const nearChip = makeClack();
nearChip.clack(0, 1, 4.33);          /* a center box's payout flight */
const farChip = makeClack();
farChip.clack(0, 1, 5.9);            /* the far-right box, past the tray */
if (!(nearChip.rec.bursts[0].freq > farChip.rec.bursts[0].freq))
  throw new Error('the far tick must sit deeper: ' + nearChip.rec.bursts[0].freq + ' vs ' + farChip.rec.bursts[0].freq);
if (!(nearChip.rec.bursts[0].gain > farChip.rec.bursts[0].gain))
  throw new Error('the far clack must sit quieter');
if (!(nearChip.rec.tones[0].freq > farChip.rec.tones[0].freq))
  throw new Error('the far thock must sit deeper too');
console.log('the model: near flight ' + nearChip.rec.bursts[0].freq.toFixed(0) + 'Hz vs far flight ' +
  farChip.rec.bursts[0].freq.toFixed(0) + 'Hz \u2014 deeper and quieter across the cloth');

/* --- extremes clamp: nothing shouts, nothing vanishes --- */
const hot = makeClack();
hot.clack(0, 1, 2);
if (hot.rec.bursts[0].freq !== 2900) throw new Error('a close flight clamps bright at 2900');
const cold = makeClack();
cold.clack(0, 1, 9);
if (cold.rec.bursts[0].freq !== 1750 || cold.rec.bursts[0].gain < 0.1)
  throw new Error('a very far flight clamps deep, never silent');
console.log('clamps: the rails hold \u2014 1750Hz floor, 2900Hz ceiling, always audible');

/* --- the real tray-to-box distances vary by seat --- */
const BOX_N = 6, BOX_Z = 1.28, DEALER_Z = -1.55;
const boxX = new Function('BOX_N', 'return function boxX(i) { return (i - (BOX_N - 1) / 2) * 1.14; }')(BOX_N);
const chipSpot = new Function('boxX', 'BOX_Z', 'return function chipSpot(b, slot) { return [boxX(b) + (slot % 2 ? 0.022 : -0.022), BOX_Z + 0.86 + ((slot % 3) - 1) * 0.018]; }')(boxX, BOX_Z);
const traySpot = new Function('DEALER_Z', 'return function traySpot(k) { return [-1.18 + (k % 5) * 0.64, DEALER_Z - 0.62]; }')(DEALER_Z);
const dist = (b) => Math.hypot(traySpot(0)[0] - chipSpot(b, 0)[0], traySpot(0)[1] - chipSpot(b, 0)[1]);
const d0 = dist(0), d2 = dist(2), d5 = dist(5);
for (const d of [d0, d2, d5]) if (d < 4.2 || d > 6.0) throw new Error('payout flights live near 4.3\u20135.9: ' + d);
if (!(d0 > d2 && d5 > d2 && d5 > d0)) throw new Error('flights lengthen away from the tray: ' + d0 + ' ' + d2 + ' ' + d5);
console.log('the felt: tray\u2192box flights \u2014 center ' + d2.toFixed(2) + ', left edge ' + d0.toFixed(2) + ', right edge ' + d5.toFixed(2) + ' (the tray sits left) \u2014 the ladder has room to speak');

/* --- the wiring: walkCue measures the flight, chipFan carries it --- */
const cue = grab('  function walkCue(b, h) {', 'stinger(h.result);');
if (!/var dist = Math\.hypot\(to\[0\] - from\[0\], to\[1\] - from\[1\]\);/.test(cue))
  throw new Error('walkCue must measure the tray-to-box flight');
if (!/chipFan\(n, CHIP_FLY \* pace \+ \(toDealer \? 0 : PAY_LAG \* pace\), CHIP_STAG \* pace, dist,\s*panFor\(/.test(cue))
  throw new Error('the payout fan must carry the distance, the seats, and the pace');
const fan = grab('  function chipFan(count, delay0, step, dist, panFrom, panTo) {', '\n  }');
if (!fan.includes('dist') || !/chipClack\(delay0 \+ k \* step, Math\.max\(1 - k \* 0\.06, 0\.5\), dist, pk\)/.test(fan))
  throw new Error('every clack in the fan must carry the distance and its seat');
console.log('wiring: walkCue measures tray\u2192box, the fan carries it, every clack speaks the model');

/* --- a panned clack rides one panner, gated on the API --- */
const panned = makeClack(true);
panned.clack(0, 1, 4.33, -0.4);
if (panned.rec.bursts[0].out !== panned.panner || panned.rec.tones[0].out !== panned.panner)
  throw new Error('the tick and the thock must share the chip\u2019s panner');
if (panned.rec.panSets.length !== 1 || panned.rec.panSets[0][0] !== -0.4 || panned.rec.panSets[0][1] !== 5)
  throw new Error('the pan must be set at the clack\u2019s own time: ' + JSON.stringify(panned.rec.panSets));
if (panned.rec.outs[0] !== panned.master) throw new Error('the panner must feed the master mix');
panned.clack(0, 1, null, 3);
if (panned.rec.panSets[1][0] !== 1) throw new Error('a wild seat clamps to the rail');
const noApi = makeClack(false);
noApi.clack(0, 1, 4.33, -0.4);
if (noApi.rec.bursts[0].out !== null) throw new Error('without createStereoPanner the clack stays centered');
console.log('the seat: a panned clack rides its own panner to the master, wild seats clamp, no API stays centered');

/* --- the cinematic stretches the flight AND its clack together ---
   The deal's one-knob rule, applied to the walk: the same pace
   multiplier sits on the render flight (chipFly) and on the clack
   schedule (chipFan via walkCue), so impact stays on the landing. */
const flyFull = grab('  function chipFly(b, slot, k, t0, ts, toDealer) {', '\n  }');
const flyBody = flyFull.slice(flyFull.indexOf('{') + 1, flyFull.lastIndexOf('}'));
function makeFly(p) {
  const rec = { drawn: [] };
  const fly = new Function('clamp', 'lerp', 'CHIP_STAG', 'pace', 'PAY_LAG', 'CHIP_FLY',
    'chipSpot', 'traySpot', 'CHIP_H', 'CHIP_D', 'drawQuad', 'chipTex', 'hexTint', 'CHIP_TINTS',
    'return function chipFly(' + flyFull.slice(flyFull.indexOf('(') + 1, flyFull.indexOf(')')) + ') {' + flyBody + '\n}') (
    clamp, (a, b, t) => a + (b - a) * t, 90, p, 90, 560,
    () => [-2.85, 1.28], () => [-1.18, -2.17], 0.024, 0.56,
    (tex, useTex, tint, x, y, z, ry, sx, sz, add) => rec.drawn.push({ x, y, z }),
    {}, () => [1, 1, 1, 1], ['#fff']);
  return { fly, rec };
}
const fN = makeFly(1), fC = makeFly(2.5), fS = makeFly(2.5);
fN.fly(2, 0, 0, 1000, 1180, false);                       /* pace 1: airborne just after its launch  */
if (!fN.rec.drawn.length) throw new Error('at pace 1 the payout chip must be airborne by 180ms');
fC.fly(2, 0, 0, 1000, 1180, false);                       /* the same instant at pace 2.5: launch itself waits */
if (fC.rec.drawn.length) throw new Error('under the cinematic the same instant must still be on the tray');
fN.fly(2, 0, 0, 1000, 1370, false);                       /* pace 1: mid-flight at half a flight     */
fC.fly(2, 0, 0, 1000, 1370, false);                       /* the same instant at pace 2.5: barely off */
const yN = fN.rec.drawn[fN.rec.drawn.length - 1].y, yC = fC.rec.drawn[fC.rec.drawn.length - 1].y;
if (!(yC < yN - 0.3))
  throw new Error('at the same instant the cinematic chip must sit far lower on the arc: ' + yC + ' vs ' + yN);
fS.fly(2, 0, 0, 1000, 1000 + (90 + 280) * 2.5, false);    /* the same progress, 2.5x later           */
if (!fS.rec.drawn.length) throw new Error('the stretched flight must fly, just later');
if (Math.abs(yN - fS.rec.drawn[0].y) > 1e-9)
  throw new Error('the same flight progress must sit at the same height, whatever the pace: ' +
    yN + ' vs ' + fS.rec.drawn[0].y);
console.log('the cinematic: pace 2.5 holds the launch, stretches the arc, and lands the identical curve 2.5x later');

/* --- the wiring: every walk timing carries the same pace --- */
if (!/at = \(CHIP_DELAY \+ beat \* WALK_BEAT\) \* pace;/.test(src))
  throw new Error('the walk beats must stretch with the flights');
if (!/var walkEnd = \(CHIP_DELAY \+ Math\.max\(beat, 1\) \* WALK_BEAT\) \* pace;/.test(src))
  throw new Error('the walk end must stretch with the flights');
if (!/later\(CHIP_DELAY \* pace, function \(\) \{ stinger\(youHand\.result\); \}\);/.test(src))
  throw new Error('the unstaked verdict must wait the stretched beat too');
if (!/\(CHIP_POP \* pace\)/.test(src))
  throw new Error('the bet drop must stretch with its clack');
if (!/chipClack\(0\.42 \* pace, 1, null, panFor\(/.test(src))
  throw new Error('the drop clack must stretch with its fall, and carry its seat');
if (!/\(PAY_LIFE \* pace\)/.test(src))
  throw new Error('the +delta plank must ride the stretched beat');
console.log('wiring: beats, walk end, flights, drops, clacks and the plank all read the same pace');

/* --- the seats: every chip that LANDS on the felt is seated by the
   same camera the deal's whooshes use, so the wager cascade at the
   deal and the payout walk at the settle sweep the same arc across
   the channels. Only the bet bar's own click stays centred \u2014 that
   one is an interface sound, not a chip on the cloth.          --- */
const pfFull = grab('  function panFor(spot) {', '\n  }');
const pfBody = pfFull.slice(pfFull.indexOf('{') + 1, pfFull.lastIndexOf('}'));
const boxXF = grab('  function boxX(i) {', '\n  }');
const chipSpotF = grab('  function chipSpot(b, slot) {', '\n  }');
function seatPan(b) {
  const panFor = new Function('project', 'VW', 'clamp', 'BOX_N', 'BOX_Z',
    boxXF + '\n' + chipSpotF + '\nreturn function panFor(spot) {' + pfBody + '};')(
    /* a camera that frames the near arc edge to edge, standing in for
       the live one: the boxes then spread across the stereo field in
       the same order, and the same 0.85 rails catch the outside   */
    (p) => ({ x: (p[0] / 3.2) * 800 + 800, y: 0 }), 1600, clamp, 6, 1.28);
  const s = chipSpot(b, 0);
  return panFor({ x: s[0], y: 0.12, z: s[1] });
}
const seatPans = [0, 1, 2, 3, 4, 5].map(seatPan);
for (let i = 1; i < seatPans.length; i++)
  if (!(seatPans[i] > seatPans[i - 1]))
    throw new Error('the six boxes must sweep left to right: ' + JSON.stringify(seatPans));
if (new Set(seatPans).size !== 6)
  throw new Error('every box needs its own seat, none shared: ' + JSON.stringify(seatPans));
if (seatPans[0] > -0.6 || seatPans[5] < 0.6)
  throw new Error('the outside boxes must sit out in the wings: ' + JSON.stringify(seatPans));
if (seatPans.some(p => Math.abs(p) > 0.85 + 1e-9))
  throw new Error('no box may pan past the rail: ' + JSON.stringify(seatPans));
if (seatPans[5] - seatPans[0] < 1.2)
  throw new Error('the arc must genuinely cross the channels: ' + JSON.stringify(seatPans));
console.log('the six seats: [' + seatPans.map(p => p.toFixed(2)).join(' ') +
  '] \u2014 each box its own place, the arc spanning ' +
  (seatPans[5] - seatPans[0]).toFixed(2) + ' of stereo');

/* the wiring: the wager cascade, the player's own chip and the double
   all seat themselves; the bet bar's click never does              */
if (!/function placeBet\(h, extra, seat\)/.test(src))
  throw new Error('a placed bet must know WHICH box it landed on');
const pb = grab('  function placeBet(h, extra, seat) {', '\n  }');
if (!/var sp = chipSpot\(seat == null \? YOUR : seat, 0\);/.test(pb) ||
    !/chipClack\(0\.42 \* pace, 1, null, panFor/.test(pb))
  throw new Error('the placed chip must clack at its own seat');
if (!/var bs = chipSpot\(i, 0\);/.test(src) ||
    !/chipClack\(0\.42 \+ i \* 0\.06, 0\.7, null, panFor\(\{ x: bs\[0\], y: 0\.12, z: bs\[1\] \}\)\)/.test(src))
  throw new Error('the bots\u2019 cascade must seat each chip at its own box');
const bets = src.match(/placeBet\([^)]*\);/g) || [];   /* calls only, not the declaration */
if (bets.length !== 3 || bets.some(b => !/YOUR\)/.test(b)))
  throw new Error('every placed stake names the seat it belongs to: ' + JSON.stringify(bets));
if (!/chipClack\(0\.02, 0\.8\);/.test(src))
  throw new Error('the bet bar\u2019s own click stays centred \u2014 an interface sound, not a chip');
console.log('the wager cascade: six boxes clack across six places, your own stake lands where the camera holds it');
console.log('the bet bar stays centred \u2014 selecting a denomination is not a chip on the cloth');

console.log('\nchip distance verified');
