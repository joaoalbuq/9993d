/* The payout walk's chip flights carry the cards' distance
   model: a clack with a flight distance lands deeper and
   quieter the farther its chips travel, while a clack without
   one keeps the plain voice the rest of the felt has always
   had. The mapping, the plain fallback, the real tray-to-box
   distances, and the walkCue wiring are the properties under
   test.                                                   */
'use strict';
const fs = require('fs');
const path = require('path');
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
const ccFull = grab('  function chipClack(delay, gain, dist) {', '\n  }');
const ccBody = ccFull.slice(ccFull.indexOf('{') + 1, ccFull.lastIndexOf('}'));
function makeClack() {
  const rec = { bursts: [], tones: [] };
  const burst = (c, t, dur, type, freq, q, gain) => rec.bursts.push({ freq, gain });
  const tone = (c, freq, t, dur, type, gain, slideTo) => rec.tones.push({ freq, gain });
  const clack = new Function('ready', 'burst', 'tone', 'clamp', 'lerp',
    'return function chipClack(' + ccFull.slice(ccFull.indexOf('(') + 1, ccFull.indexOf(')')) + ') {' + ccBody + '}')(
    () => ({ currentTime: 5 }), burst, tone, clamp, lerp);
  return { clack, rec };
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
if (!/chipFan\(n, CHIP_FLY \+ \(toDealer \? 0 : PAY_LAG\), CHIP_STAG, dist\);/.test(cue))
  throw new Error('the payout fan must carry the distance');
const fan = grab('  function chipFan(count, delay0, step, dist) {', '\n  }');
if (!fan.includes('dist') || !/chipClack\(delay0 \+ k \* step, Math\.max\(1 - k \* 0\.06, 0\.5\), dist\)/.test(fan))
  throw new Error('every clack in the fan must carry the distance');
console.log('wiring: walkCue measures tray\u2192box, the fan carries it, every clack speaks the model');

console.log('\nchip distance verified');
