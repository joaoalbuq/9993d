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
  const rec = { panSets: [], panRamps: [], retSets: [], retRamps: [], retTargets: [], fSets: [], fRamps: [], links: [], lpNode: null };
  function param(tag) {
    return {
      value: 0,
      setValueAtTime(v, t) {
        if (tag === 'pan') rec.panSets.push([v, t]);
        if (tag === 'retpan') rec.retSets.push([v, t]);
        if (tag === 'lp') rec.lpSets.push([v, t]);
      },
      linearRampToValueAtTime(v, t) {
        if (tag === 'pan') rec.panRamps.push([v, t]);
        if (tag === 'retpan') rec.retRamps.push([v, t]);
      },
      setTargetAtTime(v, t, tc) { if (tag === 'retpan') rec.retTargets.push([v, t, tc]); },
      exponentialRampToValueAtTime() {}
    };
  }
  function node(tag) {
    const n = { __tag: tag, type: '', connect(dst) { rec.links.push([n.type || tag, dst && (dst.__type || dst.__tag)]); }, gain: param('gain'), Q: { value: 0 }, pan: param(tag) };
    n.frequency = {
      value: 0,
      setValueAtTime(v, t) { rec.fSets.push({ type: n.type, v, t }); },
      linearRampToValueAtTime(v, t) { rec.fRamps.push({ type: n.type, v, t }); },
      exponentialRampToValueAtTime(v, t) { rec.fRamps.push({ type: n.type, v, t, exp: true }); }
    };
    return n;
  }
  const c = {
    currentTime: 10,
    sampleRate: 48000,
    createBuffer: () => ({ getChannelData: () => new Float32Array(64) }),
    createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }),
    createBiquadFilter: () => node('filter'),
    createGain: () => node('gain')
  };
  if (withPanner) {
    let first = true;
    c.createStereoPanner = () => node(first ? 'pan' : (first = false, 'retpan'));
  }
  let fSeq = 0;
  const baseCreate = c.createBiquadFilter.bind(c);
  c.createBiquadFilter = () => {
    const n = node('f' + (fSeq++));
    let t = '';
    Object.defineProperty(n, 'type', {
      set(v) { t = v; n.__type = v; if (v === 'lowpass') rec.lpNode = n; },
      get() { return t; }
    });
    return n;
  };
  return { c, rec };
}
function makeWhoosh(withPanner) {
  const m = mockCtx(withPanner);
  const whoosh = new Function('ready', 'noise', 'master', 'clamp', 'lerp', 'toRoom', 'WHOOSH_ROOM', 'wetPan', 'wet', 'ROOM999',
    'return function cardWhoosh(' + cwFull.slice(cwFull.indexOf('(') + 1, cwFull.indexOf(')')) + ') {' + cwBody + '}')(
    () => m.c, () => ({ getChannelData: () => new Float32Array(64) }), {}, clamp, (a, b, t) => a + (b - a) * t, () => {}, () => ROOM.send('whoosh'),
    m.c.createStereoPanner ? { pan: param2() } : null, { hold: 0 });
  function param2() {
    return {
      value: 0,
      setValueAtTime(v, t) { m.rec.retSets.push([v, t]); },
      linearRampToValueAtTime(v, t) { m.rec.retRamps.push([v, t]); },
      setTargetAtTime(v, t, tc) { m.rec.retTargets.push([v, t, tc]); }
    };
  }
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
if (!cwFull.includes('toRoom(p, WHOOSH_ROOM());') || !cwFull.includes('toRoom(g, WHOOSH_ROOM());'))
  throw new Error('the whoosh must swim after its pan \u2014 the reflections keep the direction');
console.log('wiring: both deal paths pan shoe \u2192 box, gated on the API, the room seated after the pan');

/* --- the far wall: the return leans opposite the flying card --- */
const w4 = makeWhoosh(true);
w4.whoosh(0, 0.43, 3.1, 0.6, -0.5);
if (w4.rec.retSets.length !== 1 || Math.abs(w4.rec.retSets[0][0] - 0.175) > 1e-9 || w4.rec.retSets[0][1] !== 10)
  throw new Error('the return must open opposite the shoe seat (\u2212\u00d70.35): ' + JSON.stringify(w4.rec.retSets));
if (w4.rec.retRamps.length !== 1 || Math.abs(w4.rec.retRamps[0][0] - (-0.21)) > 1e-9 || w4.rec.retRamps[0][1] !== 10.43)
  throw new Error('the return must land opposite the box seat when the flight ends: ' + JSON.stringify(w4.rec.retRamps));
if (w4.rec.retTargets.length !== 1 || w4.rec.retTargets[0][0] !== 0 || w4.rec.retTargets[0][1] !== 10.43 || w4.rec.retTargets[0][2] !== 0.25)
  throw new Error('the walls must re-center a beat after the landing');
if (w4.rec.retRamps[0][0] > 0) throw new Error('a card flying right must find its room on the left');
console.log('the far wall: return \u22120.5\u00d70.35 \u2192 \u22120.6\u00d70.35 across the flight, re-centered 0.25s after the landing');

/* --- one flyer owns the walls; a straggler doesn't yank them --- */
const w5 = makeWhoosh(true);
w5.whoosh(0, 0.43, 3.1, 0.6, -0.5);            /* the flight claims the walls           */
const mid = w5.rec.retSets.length;
w5.whoosh(0.2, 0.43, 3.1, 0.6, -0.5);          /* a straggler tapped mid-hold: no yank  */
if (w5.rec.retSets.length !== mid || w5.rec.retRamps.length !== 1)
  throw new Error('a straggler mid-hold must not move the walls');
w5.whoosh(2.0, 0.43, 3.1, 0.6, -0.5);          /* after the hold the walls free up again */
if (w5.rec.retSets.length !== mid + 1)
  throw new Error('the next flight after the hold must own the walls again');
console.log('one flyer: the walls hold through the flight + 0.75s, then hand over');

/* --- a missing return panner leaves the reflections centered --- */
const w6 = makeWhoosh(false);
w6.whoosh(0, 0.43, 3.1, 0.6, -0.5);
if (w6.rec.retSets.length || w6.rec.retRamps.length)
  throw new Error('without a return panner nothing may try to lean the walls');
console.log('no return panner: the reflections stay centered \u2014 graceful, not broken');

/* --- the air's veil: far seats are darker, not just quieter --- */
const w7 = makeWhoosh(true);
w7.whoosh(0, 0.43, 2.4, 0.6, -0.5);            /* the nearest flight: full top       */
w7.whoosh(0, 0.43, 6.4, 0.6, -0.5);            /* the farthest: the veil comes down  */
w7.whoosh(0, 0.43, 4.4, 0.6, -0.5);            /* the model's midpoint               */
const lpSets = w7.rec.fSets.filter((f) => f.type === 'lowpass').map((f) => f.v);
if (lpSets.length !== 3) throw new Error('every flight must carry its own veil: ' + JSON.stringify(w7.rec.fSets));
if (lpSets[0] !== 16500) throw new Error('a nearest card must keep its air open: ' + lpSets[0]);
if (lpSets[1] !== 1300) throw new Error('a farthest card must sit behind the veil: ' + lpSets[1]);
if (Math.abs(lpSets[2] - (1300 + 15200 * 0.5)) > 1e-9)
  throw new Error('the veil must ride the same near model as the level: ' + lpSets[2]);
const bpSets = w7.rec.fSets.filter((f) => f.type === 'bandpass').length;
if (!bpSets) throw new Error('the bandpass body must remain');
if (JSON.stringify(w7.rec.links.slice(0, 2)) !== JSON.stringify([['bandpass', 'lowpass'], ['lowpass', 'gain']]))
  throw new Error('the veil must sit in the chain, not beside it: ' + JSON.stringify(w7.rec.links.slice(0, 3)));
console.log('the veil: 16.5kHz near \u2192 1.3kHz far on the same near model, in-chain \u2014 darker, not just quieter');

/* --- the payout walk crosses the channels the way the deal does --- */
/* --- the landing keeps the flight's distance: the whoosh flies in
       dark from the far rail, so the snap that ends it must not
       announce the card as if it had landed at your elbow --- */
const csFull = grab('  function cardSnap(delay, dist, pan) {', '\n  }');
const csBody = csFull.slice(csFull.indexOf('{') + 1, csFull.lastIndexOf('}'));
function makeSnap(withPanner) {
  const m = mockCtx(withPanner !== false);
  const rec = [];
  const master = { __tag: 'master', connect() {} };   /* the felt's mix bus, named so the chain reads */
  const burst = (c, t, dur, type, freq, q, gain, out) => rec.push({ dur, type, freq, q, gain, out: out || null });
  const snap = new Function('ready', 'burst', 'clamp', 'lerp', 'master',
    'return function cardSnap(' + csFull.slice(csFull.indexOf('(') + 1, csFull.indexOf(')')) + ') {' + csBody + '}')(
    () => m.c, burst, clamp, (a, b, t) => a + (b - a) * t, master);
  return { snap, rec, m };
}
const sNear = makeSnap(); sNear.snap(0, 2.4);      /* the closest flight */
const sFar = makeSnap(); sFar.snap(0, 6.4);        /* the farthest          */
const sPlain = makeSnap(); sPlain.snap(0);         /* no distance at all    */
const sLps = (r) => r.m.rec.fSets.filter((f) => f.type === 'lowpass').map((f) => f.v);
if (sLps(sNear).length !== 1 || sLps(sFar).length !== 1)
  throw new Error('a snap that flew must carry its own veil');
if (sLps(sNear)[0] !== 16500) throw new Error('a near card lands with its air open: ' + sLps(sNear)[0]);
if (sLps(sFar)[0] !== 2200) throw new Error('a far card must land behind the veil: ' + sLps(sFar)[0]);
if (sLps(sPlain).length) throw new Error('a seatless snap is the plain voice \u2014 no veil, no filter');
if (sFar.rec[0].freq !== 1750 || sNear.rec[0].freq !== 3000)
  throw new Error('the tick must drop with distance: ' + sFar.rec[0].freq + ' vs ' + sNear.rec[0].freq);
if (sFar.rec[1].freq !== 3400 || sNear.rec[1].freq !== 5200)
  throw new Error('the crack must drop with distance: ' + sFar.rec[1].freq + ' vs ' + sNear.rec[1].freq);
if (Math.abs(sFar.rec[0].gain - 0.22 * 0.68) > 1e-9 || Math.abs(sNear.rec[0].gain - 0.22) > 1e-9)
  throw new Error('the landing\u2019s own ladder, subtler than the flight\u2019s: ' + sFar.rec[0].gain + ' / ' + sNear.rec[0].gain);
if (sPlain.rec[0].freq !== 3000 || sPlain.rec[1].freq !== 5200 ||
    sPlain.rec[0].gain !== 0.22 || sPlain.rec[1].gain !== 0.10)
  throw new Error('with no distance the snap is exactly the felt\u2019s old plain voice: ' + JSON.stringify(sPlain.rec));
if (sPlain.rec.some(r => r.out !== null)) throw new Error('a plain snap sits straight on the master');
if (sFar.rec[0].out !== sFar.rec[1].out || sFar.rec[0].out === null)
  throw new Error('both voices of a veiled snap must share one veil');
if (JSON.stringify(sFar.m.rec.links.slice(0, 2)) !== JSON.stringify([['gain', 'lowpass'], ['lowpass', 'master']]))
  throw new Error('the veil must sit in the snap\u2019s chain: ' + JSON.stringify(sFar.m.rec.links.slice(0, 3)));
if (/_ROOM/.test(csFull)) throw new Error('the snap must never take a room send \u2014 it lands close on the cloth');
console.log('the landing: 16.5kHz \u2192 2.2kHz on the snap\u2019s own subtler ladder \u2014 a far card lands dark, not just quiet');
console.log('and seatless: the plain snap is unchanged, 3000/5200 at full level, still the felt\u2019s one dry voice');

/* --- the landing carries its SEAT, the same box the whoosh arrived on --- */
const sSeat = makeSnap();
sSeat.snap(0, 3.1, 0.6);                       /* a flight that ended at the right rail */
if (sSeat.m.rec.panSets.length !== 1 || sSeat.m.rec.panSets[0][0] !== 0.6 || sSeat.m.rec.panSets[0][1] !== 10)
  throw new Error('the snap must land in the seat it was given: ' + JSON.stringify(sSeat.m.rec.panSets));
if (sSeat.m.rec.panRamps.length)
  throw new Error('the snap is one hit: it takes its seat, it never travels');
const sLeft = makeSnap();
sLeft.snap(0, 5.2, -0.6);                      /* and the far left box sits on the other rail */
if (sLeft.m.rec.panSets[0][0] !== -0.6) throw new Error('a left box must land left: ' + sLeft.m.rec.panSets[0][0]);
console.log('the landing\u2019s seat: +0.6 and \u22120.6 land where the card did \u2014 the eye and the ear finish together');

/* --- the panner is the snap's TAIL: after the veil, and into the master --- */
const sChain = makeSnap();
sChain.snap(0, 6.4, 0.6);                      /* far AND seated: both models at once */
const has = (r, a, b) => r.some(([x, y]) => x === a && y === b);
if (!has(sChain.m.rec.links, 'gain', 'lowpass') || !has(sChain.m.rec.links, 'lowpass', 'pan') ||
    !has(sChain.m.rec.links, 'pan', 'master'))
  throw new Error('the seat must sit after the veil and before the master: ' + JSON.stringify(sChain.m.rec.links));
if (has(sChain.m.rec.links, 'lowpass', 'master'))
  throw new Error('a seated snap must not bypass its seat: ' + JSON.stringify(sChain.m.rec.links));
if (sChain.rec[0].out === null || sChain.rec[0].out !== sChain.rec[1].out)
  throw new Error('a veiled seated snap must feed both voices through the one veil');
if (sChain.m.rec.panSets.length !== 1) throw new Error('a veiled snap must still land once');
console.log('the chain: veil \u2192 seat \u2192 master \u2014 darkening and seating never fight over one node');

/* --- a wild seat clamps, and no seat means the old voice, untouched --- */
const sWild = makeSnap();
sWild.snap(0, 3.1, 9);                         /* a box off the rails */
if (sWild.m.rec.panSets[0][0] !== 1) throw new Error('a wild seat must clamp to the rail: ' + sWild.m.rec.panSets[0][0]);
const sNone = makeSnap();
sNone.snap(0, 3.1);                           /* a flight with a veil but no seat */
if (sNone.m.rec.panSets.length)
  throw new Error('a seatless snap must not invent a seat');
if (!has(sNone.m.rec.links, 'lowpass', 'master') || has(sNone.m.rec.links, 'lowpass', 'pan'))
  throw new Error('a seatless snap must sit straight on the master, as it always did: ' + JSON.stringify(sNone.m.rec.links));
const sPlainPan = makeSnap();
sPlainPan.snap(0, null, 0.6);                 /* no distance, but a seat: the plain voice, seated */
if (sPlainPan.m.rec.panSets.length !== 1 || sPlainPan.rec[0].freq !== 3000)
  throw new Error('a seat must not touch the plain voice\u2019s own tuning: ' + JSON.stringify(sPlainPan.rec));
if (sPlainPan.rec[0].out === null || sPlainPan.rec[0].out !== sPlainPan.rec[1].out)
  throw new Error('an un-veiled seated snap must still feed its voices through the seat: ' + JSON.stringify(sPlainPan.rec));
if (!has(sPlainPan.m.rec.links, 'pan', 'master'))
  throw new Error('the seat of an un-veiled snap must reach the master: ' + JSON.stringify(sPlainPan.m.rec.links));
console.log('edges: a wild seat clamps, a seatless snap is the old voice, and a seat alone changes no tuning');

/* --- no panner API: centered, never broken --- */
const sNoApi = makeSnap(false);
sNoApi.snap(0, 3.1, 0.6);
if (sNoApi.m.rec.panSets.length || sNoApi.m.rec.panRamps.length)
  throw new Error('without createStereoPanner nothing may try to pan the snap');
console.log('no panner API: the snap stays centered \u2014 graceful, not broken');

/* --- the wiring: both deal paths seat the landing with the whoosh's own pan --- */
for (const fn of ['dealTo(box)', 'dealToDealer()']) {
  const body = grab('  function ' + fn + ' {', '\n  }');
  const seated = body.match(/cardSnap\(\(c\.dur - 10\) \/ 1000, fd, panFor\(cardTarget\(c\)\)\);/);
  if (!seated) throw new Error(fn + ' must land its snap in the box\u2019s own seat');
  const whooshPan = body.match(/panFor\(cardTarget\(c\)\)/g) || [];
  if (whooshPan.length !== 2)
    throw new Error(fn + ' must fly and land on ONE seat, read once per voice: ' + whooshPan.length);
}
if (!/if \(pan != null && c\.createStereoPanner\)/.test(csFull))
  throw new Error('the snap\u2019s seat must be gated on the API and a seat actually given');
console.log('wiring: both deal paths fly and land on one seat \u2014 the whoosh and the snap agree on the box');

const cfFull = grab('  function chipFan(count, delay0, step, dist, panFrom, panTo) {', '\n  }');
const cfBody = cfFull.slice(cfFull.indexOf('{') + 1, cfFull.lastIndexOf('}'));
function makeFan() {
  const rec = [];
  const fan = new Function('chipClack', 'lerp',
    'return function chipFan(' + cfFull.slice(cfFull.indexOf('(') + 1, cfFull.indexOf(')')) + ') {' + cfBody + '}') (
      (delay, gain, dist, pan, panFrom, panDur) => rec.push({ delay, gain, dist, pan, panFrom, panDur }), (a, b, t) => a + (b - a) * t);
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

/* --- the walk MOVES: each clack glides into its seat from the one before --- */
const fw = makeFan();
fw.fan(5, 0.56, 0.09, 4.33, -0.4, 0.2);
if (fw.rec.length !== 5) throw new Error('the fan must still fire one clack per chip');
/* the first clack starts where the chips leave, so it is already home */
if (fw.rec[0].panFrom !== -0.4 || Math.abs(fw.rec[0].pan - -0.4) > 1e-9)
  throw new Error('the first clack must not travel: ' + JSON.stringify(fw.rec[0]));
/* every later clack starts at its predecessor's seat and lands on its own */
for (let k = 1; k < 5; k++) {
  const r = fw.rec[k];
  if (Math.abs(r.panFrom - fw.rec[k - 1].pan) > 1e-9)
    throw new Error('chip ' + k + ' must start where chip ' + (k - 1) + ' landed: ' + JSON.stringify(r));
  if (r.panDur !== 0.09)
    throw new Error('each glide must last exactly one stagger: ' + r.panDur);
  if (!(r.pan > r.panFrom)) throw new Error('the walk must keep moving one way: ' + r.panFrom + ' \u2192 ' + r.pan);
}
/* the sweep is continuous: each seat is reached, once, in order */
if (Math.abs(fw.rec[4].pan - 0.2) > 1e-9) throw new Error('the last chip must still land at the box');
console.log('the walk\u2019s motion: 5 clacks, each gliding one stagger from the seat before \u2014 one movement, not five dots');

/* --- a lone chip has no predecessor to glide from --- */
const f2 = makeFan();
f2.fan(1, 0.56, 0.09, 4.33, -0.4, 0.2);
if (Math.abs(f2.rec[0].pan - 0.2) > 1e-9) throw new Error('a lone chip lands at the box\u2019s own seat');
const f2b = makeFan();
f2b.fan(1, 0.56, 0.09, 4.33, -0.4, 0.2);
if (f2b.rec[0].panFrom !== -0.4) throw new Error('a lone chip still starts where the chips leave');
const f3 = makeFan();
f3.fan(3, 0.56, 0.09, 4.33);
if (f3.rec.some((x) => x.pan !== null)) throw new Error('a seatless fan stays centered');
const f3b = makeFan();
f3b.fan(3, 0.56, 0.09, 4.33);
const nullish = (v) => v === null || v === undefined;
if (f3b.rec.some((x) => !nullish(x.panFrom) || !nullish(x.pan)))
  throw new Error('a seatless fan must not invent a walk: ' + JSON.stringify(f3b.rec));
console.log('edges: a lone chip takes the landing seat, a seatless fan stays centered');

/* --- the clack itself: an origin glides, no origin holds, both clamp --- */
const ccFull = grab('  function chipClack(delay, gain, dist, pan, panFrom, panDur) {', '\n  }');
const ccBody = ccFull.slice(ccFull.indexOf('{') + 1, ccFull.lastIndexOf('}'));
function makeClack(withPanner) {
  const m = mockCtx(withPanner !== false);
  const clack = new Function('ready', 'burst', 'tone', 'clamp', 'lerp', 'master', 'toRoom', 'CLACK_ROOM',
    'return function chipClack(' + ccFull.slice(ccFull.indexOf('(') + 1, ccFull.indexOf(')')) + ') {' + ccBody + '}')(
    () => m.c, () => {}, () => {}, clamp, (a, b, t) => a + (b - a) * t,
    { __tag: 'master', connect() {} }, () => {}, () => ROOM.send('clack'));
  return { clack, rec: m.rec };
}
const c1 = makeClack();
c1.clack(0.2, 1, 4.33, 0.6, -0.4, 90);          /* panDur is MILLISECONDS, like every delay */
if (c1.rec.panSets.length !== 1 || Math.abs(c1.rec.panSets[0][0] - -0.4) > 1e-9 || c1.rec.panSets[0][1] !== 10.2)
  throw new Error('a gliding clack must OPEN at its origin: ' + JSON.stringify(c1.rec.panSets));
if (c1.rec.panRamps.length !== 1 || Math.abs(c1.rec.panRamps[0][0] - 0.6) > 1e-9 || Math.abs(c1.rec.panRamps[0][1] - 10.29) > 1e-9)
  throw new Error('a gliding clack must ARRIVE 90ms later at its seat \\u2014 the stagger, in real time: ' + JSON.stringify(c1.rec.panRamps));
const c1b = makeClack();
c1b.clack(0, 1, 4.33, 0.6, -0.4, 90);
if (Math.abs(c1b.rec.panRamps[0][1] - c1b.rec.panSets[0][1] - 0.09) > 1e-9)
  throw new Error('90 milliseconds must be 0.09 seconds on the audio clock, not 90: ' + JSON.stringify(c1b.rec));
const c2 = makeClack();
c2.clack(0.2, 1, 4.33, 0.6);                      /* no origin: the plain seated clack */
if (Math.abs(c2.rec.panSets[0][0] - 0.6) > 1e-9 || c2.rec.panRamps.length)
  throw new Error('with no origin the clack holds still, exactly as before: ' + JSON.stringify(c2.rec));
const c3 = makeClack();
c3.clack(0.2, 1, 4.33, 9, -9, 90);               /* a wild walk */
if (Math.abs(c3.rec.panSets[0][0] - -1) > 1e-9 || Math.abs(c3.rec.panRamps[0][0] - 1) > 1e-9)
  throw new Error('both ends of the glide must clamp to the rails: ' + JSON.stringify(c3.rec));
const c4 = makeClack(false);
c4.clack(0.2, 1, 4.33, 0.6, -0.4, 90);
if (c4.rec.panSets.length || c4.rec.panRamps.length)
  throw new Error('without a panner nothing may try to glide the clack');
console.log('the clack: opens at its origin, ramps to its seat, holds without one, clamps both ends, never panics');

/* --- the wiring: the walk still hands the fan both ends --- */
const walk2 = grab('  function walkCue(b, h) {', 'stinger(h.result);');
if (!/chipFan\(n, CHIP_FLY \* pace \+ \(toDealer \? 0 : PAY_LAG \* pace\), CHIP_STAG \* pace, dist,\s*\n\s*panFor/.test(walk2))
  throw new Error('the walk\u2019s fan must still carry both seats');
console.log('wiring: the walk still projects both ends \u2014 the glide is inside the fan, not the caller');

const walk = grab('  function walkCue(b, h) {', 'stinger(h.result);');
if (!walk.includes('panFor({ x: from[0], y: 0.12, z: from[1] })') ||
    !walk.includes('panFor({ x: to[0], y: 0.12, z: to[1] })'))
  throw new Error('walkCue must seat the fan at the chip lane\u2019s own ends');
if (!/chipFan\(n, CHIP_FLY \* pace \+ \(toDealer \? 0 : PAY_LAG \* pace\), CHIP_STAG \* pace, dist,\s*\n\s*panFor/.test(walk))
  throw new Error('the walk\u2019s fan must carry both seats');
console.log('wiring: walkCue projects both ends of the flight through panFor \u2014 the walk moves with the eye');

console.log('\nstereo whoosh verified');
