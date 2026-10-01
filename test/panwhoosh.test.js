/* The whoosh's stereo seat: a card pans from the shoe to the
   box it lands in, and the box's pan is where the SCREEN puts
   it — the camera holds boxes close when it holds them, so the
   pan tracks what the player sees. The mapping and the panner
   wiring are the properties under test: screen center is dead
   center, the rails land at ±0.85 (never clipping a channel),
   off-frame falls back to the felt, the ramp runs shoe to box
   across the flight, and a missing panner API leaves the
   whoosh centered rather than broken.                      */
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

/* --- panFor, exactly as shipped, over a stubbed projector --- */
const pfFull = grab('  function panFor(spot) {', '\n  }');
const pfBody = pfFull.slice(pfFull.indexOf('{') + 1, pfFull.lastIndexOf('}'));
function makePanFor(project, VW) {
  return new Function('project', 'VW', 'clamp', 'return function panFor(spot) {' + pfBody + '}')(project, VW, clamp);
}
const panFor = makePanFor((p) => ({ x: (p[0] / 4) * 800 + 800, y: 0 }), 1600);
if (panFor({ x: 0, y: 0, z: 0 }) !== 0) throw new Error('screen center must be dead center');
if (Math.abs(panFor({ x: 4, y: 0, z: 0 }) - 0.85) > 1e-9) throw new Error('the right rail must land at +0.85');
if (Math.abs(panFor({ x: -4, y: 0, z: 0 }) + 0.85) > 1e-9) throw new Error('the left rail must land at \u22120.85');
if (panFor({ x: 9, y: 0, z: 0 }) !== 0.85) throw new Error('beyond the rail must clamp');
if (panFor({ x: -9, y: 0, z: 0 }) !== -0.85) throw new Error('beyond the left rail must clamp');
console.log('panFor: center 0, rails \u00b10.85 \u2014 wide of the frame clamps, a channel never clips');

const panFor2 = makePanFor(() => null, 1600);   /* off-frame / pre-frame camera */
if (Math.abs(panFor2({ x: 2.85, y: 0, z: 0 }) - 0.85 * 2.85 / 3) > 1e-9)
  throw new Error('off-frame falls back to the felt\u2019s own left/right');
if (panFor2({ x: -9, y: 0, z: 0 }) !== -0.85) throw new Error('the felt fallback clamps too');
console.log('off-frame: the felt\u2019s own geometry carries the pan until the camera sees the spot');

/* --- cardWhoosh, exactly as shipped, over a mock context --- */
const cwFull = grab('  function cardWhoosh(', '\n  }');
const cwBody = cwFull.slice(cwFull.indexOf('{') + 1, cwFull.lastIndexOf('}'));
function mockCtx(withPanner) {
  const rec = { panSets: [], panRamps: [] };
  function param(tag) {
    return {
      value: 0,
      setValueAtTime(v, t) { if (tag === 'pan') rec.panSets.push([v, t]); },
      linearRampToValueAtTime(v, t) { if (tag === 'pan') rec.panRamps.push([v, t]); },
      exponentialRampToValueAtTime() {}
    };
  }
  function node(tag) { return { connect() {}, gain: param('gain'), frequency: param('freq'), Q: { value: 0 }, pan: param(tag) }; }
  const c = {
    currentTime: 10,
    sampleRate: 48000,
    createBuffer: () => ({ getChannelData: () => new Float32Array(64) }),
    createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
    createBiquadFilter: () => node('filter'),
    createGain: () => node('gain')
  };
  if (withPanner) c.createStereoPanner = () => node('pan');
  return { c, rec };
}
function makeWhoosh(withPanner) {
  const m = mockCtx(withPanner);
  const whoosh = new Function('ready', 'noise', 'master', 'clamp', 'lerp',
    'return function cardWhoosh(' + cwFull.slice(cwFull.indexOf('(') + 1, cwFull.indexOf(')')) + ') {' + cwBody + '}')(
    () => m.c, () => ({ getChannelData: () => new Float32Array(64) }), {}, clamp, (a, b, t) => a + (b - a) * t);
  return { whoosh, rec: m.rec };
}

/* --- the ramp runs shoe to box across the flight --- */
const w1 = makeWhoosh(true);
w1.whoosh(0, 0.43, 3.1, 0.6, -0.5);
if (w1.rec.panSets.length !== 1 || w1.rec.panSets[0][0] !== -0.5 || w1.rec.panSets[0][1] !== 10)
  throw new Error('the pan opens at the shoe: ' + JSON.stringify(w1.rec.panSets));
if (w1.rec.panRamps.length !== 1 || w1.rec.panRamps[0][0] !== 0.6 || w1.rec.panRamps[0][1] !== 10.43)
  throw new Error('the pan lands at the box when the flight ends: ' + JSON.stringify(w1.rec.panRamps));
console.log('the ramp: \u22120.5 at the shoe \u2192 +0.6 at the box, across the whole 430ms flight');

/* --- a static pan and a clamped one --- */
const w2 = makeWhoosh(true);
w2.whoosh(0, 0.4, 3.0, 0.6);
if (w2.rec.panSets[0][0] !== 0.6 || w2.rec.panRamps.length !== 0)
  throw new Error('no origin given: the pan holds still');
w2.whoosh(0, 0.4, 3.0, 2, -3);
if (w2.rec.panSets[1][0] !== -1 || w2.rec.panRamps[0][0] !== 1)
  throw new Error('wild pans must clamp to the rails: ' + JSON.stringify(w2.rec));
console.log('static and clamped: a seatless whoosh holds, a wild one clamps to \u00b11');

/* --- a missing panner API leaves the whoosh centered, not broken --- */
const w3 = makeWhoosh(false);
w3.whoosh(0, 0.4, 3.0, 0.6, -0.5);
if (w3.rec.panSets.length || w3.rec.panRamps.length)
  throw new Error('without createStereoPanner nothing may try to pan');
console.log('no panner API: the whoosh stays centered \u2014 graceful, not broken');

/* --- the wiring: both deal paths seat their cards in stereo --- */
for (const fn of ['dealTo(box)', 'dealToDealer()']) {
  const body = grab('  function ' + fn + ' {', 'cardSnap(');
  if (!body.includes('panFor(cardTarget(c))')) throw new Error(fn + ' must seat its card by the screen');
  if (!body.includes("panFor({ x: SHOE[0], y: SHOE[1], z: SHOE[2] })"))
    throw new Error(fn + ' must open its pan at the shoe');
}
if (!/if \(pan != null && c\.createStereoPanner\) \{/.test(src))
  throw new Error('the panner must be gated on the API and a pan actually given');
console.log('wiring: both deal paths pan shoe \u2192 box, gated on the API');

/* --- the payout walk crosses the channels the way the deal does --- */
const cfFull = grab('  function chipFan(count, delay0, step, dist, panFrom, panTo) {', '\n  }');
const cfBody = cfFull.slice(cfFull.indexOf('{') + 1, cfFull.lastIndexOf('}'));
function makeFan() {
  const rec = [];
  const fan = new Function('chipClack', 'lerp',
    'return function chipFan(' + cfFull.slice(cfFull.indexOf('(') + 1, cfFull.indexOf(')')) + ') {' + cfBody + '}') (
      (delay, gain, dist, pan) => rec.push({ delay, gain, dist, pan }), (a, b, t) => a + (b - a) * t);
  return { fan, rec };
}
const f1 = makeFan();
f1.fan(5, 0.56, 0.09, 4.33, -0.4, 0.2);
const pans1 = f1.rec.map((x) => x.pan);
const want1 = [-0.4, -0.25, -0.1, 0.05, 0.2];
if (pans1.length !== want1.length || pans1.some((p, i) => Math.abs(p - want1[i]) > 1e-9))
  throw new Error('the fan must walk the channels from leave to land: ' + JSON.stringify(pans1));
if (f1.rec[0].dist !== 4.33 || Math.abs(f1.rec[4].delay - (0.56 + 4 * 0.09)) > 1e-9)
  throw new Error('the fan must keep its stagger and its distance');
console.log('the walk: 5 chips pan \u22120.4 \u2192 +0.2, one step across the channels per chip');

const f2 = makeFan();
f2.fan(1, 0.56, 0.09, 4.33, -0.4, 0.2);
if (Math.abs(f2.rec[0].pan - 0.2) > 1e-9) throw new Error('a lone chip lands at the box\u2019s own seat');
const f3 = makeFan();
f3.fan(3, 0.56, 0.09, 4.33);
if (f3.rec.some((x) => x.pan !== null)) throw new Error('a seatless fan stays centered');
console.log('edges: a lone chip takes the landing seat, a seatless fan stays centered');

const walk = grab('  function walkCue(b, h) {', 'stinger(h.result);');
if (!walk.includes('panFor({ x: from[0], y: 0.12, z: from[1] })') ||
    !walk.includes('panFor({ x: to[0], y: 0.12, z: to[1] })'))
  throw new Error('walkCue must seat the fan at the chip lane\u2019s own ends');
if (!/chipFan\(n, CHIP_FLY \+ \(toDealer \? 0 : PAY_LAG\), CHIP_STAG, dist,\s*\n\s*panFor/.test(walk))
  throw new Error('the walk\u2019s fan must carry both seats');
console.log('wiring: walkCue projects both ends of the flight through panFor \u2014 the walk moves with the eye');

console.log('\nstereo whoosh verified');
