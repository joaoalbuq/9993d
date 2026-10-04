/* The practice floor's sounds found their seat: the single hand
   sits at the felt's center, so the deal's whoosh pans from the
   shoe's screen side to the hand's, the snap lands at the hand,
   and the shoe's own ceremony sits at the shoe, the seat every
   card then leaves from. The seat math, the guard
   rails and the wiring are the properties under test: center is
   center, a narrow phone never invents width, off-screen and
   layout-less fall back to center, the rails stop at 0.85, and
   a missing panner API leaves every voice centered, not broken. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOM = require(path.join(__dirname, '..', 'room999.js'));   /* the shared registry the pages read */
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}

/* --- panForSeat, exactly as shipped, over stubbed rects --- */
const pfFull = grab('  function panForSeat(el) {', '\n  }');
const pfBody = pfFull.slice(pfFull.indexOf('{') + 1, pfFull.lastIndexOf('}'));
const clampMatch = src.match(/function panSeatClamp\(v, a, b\) \{ return[^\n]*\}/);
if (!clampMatch) throw new Error('panSeatClamp one-liner not found');
const clamp = new Function('v', 'a', 'b', clampMatch[0].slice(clampMatch[0].indexOf('{') + 1, -1) + '\nreturn clamp;');
function makePanForSeat(rect, innerWidth) {
  const el = rect ? { getClientRects: () => [1], getBoundingClientRect: () => rect } : { getClientRects: () => [] };
  return new Function('panSeatClamp', 'window', 'el', 'return function panForSeat() {' + pfBody + '}')(
    clamp, { innerWidth: innerWidth }, el);
}
if (makePanForSeat({ left: 250, width: 0 }, 500)() !== 0)
  throw new Error('center must be dead center');
if (Math.abs(makePanForSeat({ left: 500, width: 0 }, 500)() - 0.85) > 1e-9)
  throw new Error('the right rail must land at +0.85');
if (Math.abs(makePanForSeat({ left: 0, width: 0 }, 500)() + 0.85) > 1e-9)
  throw new Error('the left rail must land at \u22120.85');
if (makePanForSeat({ left: 900, width: 0 }, 500)() !== 0.85)
  throw new Error('beyond the rail must clamp');
if (makePanForSeat(null, 500)() !== 0)
  throw new Error('a layout-less element must fall back to center');
console.log('panForSeat: center 0, rails \u00b10.85, wide clamps, layout-less falls to center');

/* --- the whoosh fans shoe to hand, gated on the API --- */
const cwFull = grab('  function cardWhoosh(delay, panFrom, panTo) {', '\n  }');
const cwBody = cwFull.slice(cwFull.indexOf('{') + 1, cwFull.lastIndexOf('}'));
function mockCtx(withPanner) {
  const rec = { panSets: [], panRamps: [], outs: [] };
  function param(tag) {
    return {
      value: 0,
      setValueAtTime(v, t) { if (tag === 'pan') rec.panSets.push([v, t]); },
      linearRampToValueAtTime(v, t) { if (tag === 'pan') rec.panRamps.push([v, t]); },
      exponentialRampToValueAtTime() {}
    };
  }
  function node(tag) { return { connect(dst) { rec.outs.push(tag === 'pan' ? 'panner' : 'master'); }, gain: param('gain'), frequency: param('freq'), Q: { value: 0 }, pan: param(tag) }; }
  const c = {
    currentTime: 10, sampleRate: 48000,
    createBuffer: () => ({ getChannelData: () => new Float32Array(64) }),
    createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
    createBiquadFilter: () => node('filter'),
    createGain: () => node('gain')
  };
  if (withPanner) c.createStereoPanner = () => node('pan');
  return { c, rec };
}
const w1 = mockCtx(true);
new Function('ready', 'noise', 'master', 'clamp', 'panSeatClamp', 'toRoom', 'WHOOSH_ROOM',
  'return function cardWhoosh(' + cwFull.slice(cwFull.indexOf('(') + 1, cwFull.indexOf(')')) + ') {' + cwBody + '}')(
  () => w1.c, () => ({ getChannelData: () => new Float32Array(64) }), {}, clamp, clamp,
  (node, room) => { if (room == null) throw new Error('the whoosh must name its own send'); }, () => ROOM.send('whoosh'), ROOM)(0, 0.4, 0.0);
if (w1.rec.panSets.length !== 1 || w1.rec.panSets[0][0] !== 0.4)
  throw new Error('the whoosh must open at the shoe\u2019s seat: ' + JSON.stringify(w1.rec.panSets));
if (w1.rec.panRamps.length !== 1 || w1.rec.panRamps[0][0] !== 0.0 || w1.rec.panRamps[0][1] !== 10.4)
  throw new Error('the whoosh must land at the hand across the flight: ' + JSON.stringify(w1.rec.panRamps));
const w2 = mockCtx(false);
new Function('ready', 'noise', 'master', 'clamp', 'panSeatClamp', 'toRoom', 'WHOOSH_ROOM',
  'return function cardWhoosh(' + cwFull.slice(cwFull.indexOf('(') + 1, cwFull.indexOf(')')) + ') {' + cwBody + '}')(
  () => w2.c, () => ({ getChannelData: () => new Float32Array(64) }), {}, clamp, clamp,
  () => {}, () => ROOM.send('whoosh'), ROOM)(0, 0.4, 0.0);
if (w2.rec.panSets.length || w2.rec.outs.filter((o) => o === 'panner').length)
  throw new Error('without a panner API the whoosh stays centered');
console.log('the whoosh: shoe \u2192 hand across the 400ms slide, no panner API stays centered');

/* --- the snap lands at the seat --- */
const csFull = grab('  function cardSnap(delay, pan) {', '\n  }');
const csBody = csFull.slice(csFull.indexOf('{') + 1, csFull.lastIndexOf('}'));
const s1 = mockCtx(true);
const burstSeen = [];
new Function('ready', 'burst', 'panSeatClamp', 'master',
  'return function cardSnap(' + csFull.slice(csFull.indexOf('(') + 1, csFull.indexOf(')')) + ') {' + csBody + '}')(
  () => s1.c, (c, t, dur, type, freq, q, gain, out) => burstSeen.push(out), clamp, {})(0.42, -0.3);
if (burstSeen.length !== 2 || burstSeen.some((o) => o == null))
  throw new Error('both snap bursts must land through the hand\u2019s panner: ' + JSON.stringify(burstSeen));
const s2 = mockCtx(false);
new Function('ready', 'burst', 'panSeatClamp', 'master',
  'return function cardSnap(' + csFull.slice(csFull.indexOf('(') + 1, csFull.indexOf(')')) + ') {' + csBody + '}')(
  () => s2.c, () => {}, clamp, {})(0.42, -0.3);
console.log('the snap: both bursts ride the hand\u2019s seat, no API stays centered');

/* --- the wiring: the deal reads the live rects, and the deal's own
       two card voices are the only ones that follow a seat ------ */
const deal = grab('  function dealCard(to) {', 'cardSnap(0.42');
if (!/var seat = panForSeat\(to === 'you' \? elYou : elDealer\);/.test(deal))
  throw new Error('dealCard must read the landing hand\u2019s live rect');
if (!/cardWhoosh\(0, panForSeat\(document\.getElementById\('shoeBox'\)\), seat\);/.test(deal))
  throw new Error('the whoosh must open at the shoe\u2019s live screen seat');
for (const fn of ['chipClack(delay)', 'coachCue(ok)', 'stinger(kind)']) {
  const body = grab('  function ' + fn + ' {', '\n  }');
  if (/createStereoPanner/.test(body)) throw new Error(fn + ' must stay centered \u2014 the felt has one seat');
}
console.log('wiring: the deal reads live rects (shoe \u2192 hand); clacks, coach and stinger keep the center');

/* --- the shuffle sits at the shoe: the ceremony that made this deck
       happens over the shoe box, the same seat every card then
       leaves from \u2014 all paper standing still, so a held seat --- */
const rsFull = grab('  function riffleSound(pan) {', '\n  }');
const rsBody = rsFull.slice(rsFull.indexOf('{') + 1, rsFull.lastIndexOf('}'));
if (!/if \(pan != null && c\.createStereoPanner\)/.test(rsFull) ||
    !/out\.pan\.setValueAtTime\(panSeatClamp\(pan, -1, 1\), t\);/.test(rsFull))
  throw new Error('the shuffle must be seated at the shoe');
if (/linearRampToValueAtTime/.test(rsFull))
  throw new Error('the shuffle is paper standing still \u2014 its seat is held, never slid');
const rsSeen = [];
const rsCtx = mockCtx(true);
const rsTones = [];
new Function('ready', 'burst', 'tone', 'panSeatClamp', 'master', 'toRoom', 'RIFFLE_ROOM',
  'return function riffleSound(' + rsFull.slice(rsFull.indexOf('(') + 1, rsFull.indexOf(')')) + ') {' + rsBody + '}')(
  () => rsCtx.c,
  (c, t, dur, type, freq, q, gain, out) => rsSeen.push(out),
  (c, freq, t, dur, type, gain, slide, out) => rsTones.push(out),
  clamp, {}, (node, room) => { if (room == null) throw new Error('the shuffle must name its own send'); }, () => ROOM.send('riffle'), ROOM)(0.35);
if (rsSeen.length !== 17 || rsSeen.some((o) => o == null))
  throw new Error('every burst of the shuffle must come from the shoe: ' + rsSeen.length + ' bursts');
if (rsTones.length !== 7 || rsTones.some((o) => o == null))
  throw new Error('every tone of the shuffle must come from the shoe too: ' + rsTones.length + ' tones');
if (rsCtx.rec.panSets.length !== 1 || rsCtx.rec.panSets[0][0] !== 0.35 || rsCtx.rec.panSets[0][1] !== 10.02)
  throw new Error('the shoe\u2019s seat must be set once, at the ceremony\u2019s own start: ' + JSON.stringify(rsCtx.rec.panSets));
const rsNoApi = mockCtx(false);
const rsPlain = [];
new Function('ready', 'burst', 'tone', 'panSeatClamp', 'master', 'toRoom', 'RIFFLE_ROOM',
  'return function riffleSound(' + rsFull.slice(rsFull.indexOf('(') + 1, rsFull.indexOf(')')) + ') {' + rsBody + '}')(
  () => rsNoApi.c, (c, t, dur, type, freq, q, gain, out) => rsPlain.push(out), () => {}, clamp, {}, () => {}, () => ROOM.send('riffle'), ROOM)(0.35);
if (rsPlain.some((o) => o != null) || rsNoApi.rec.outs.filter((o) => o === 'panner').length)
  throw new Error('without a panner API the shuffle stays centered');
const shuf = grab('  function shuffleCeremony(then) {', 'riffleSound(panForSeat(box));');
if (!/riffleSound\(panForSeat\(box\)\);/.test(shuf))
  throw new Error('the ceremony must read the shoe box\u2019s own live rect');
console.log('the shuffle: 17 bursts and 7 tones held at the shoe\u2019s seat, set once, no API stays centered');

/* --- the guard rails exist in the source, once --- */
if (!/0\.85;/.test(pfBody)) throw new Error('the pan must stop short of the rail');
if (!/getClientRects\(\)\.length/.test(pfBody)) throw new Error('display:none must fall back to center');
if (!/catch \(e\) \{ return 0; \}/.test(pfBody)) throw new Error('the seat read must never throw');

console.log('\npractice seat pan verified');
