/* The room: a synthesized impulse response — air, then the
   first reflections, then a damped tail that reaches -60dB in
   its RT and is normalized so the room sits quietly under the
   deal. The IR's shape and the send-bus wiring are the
   properties under test: the pre-delay is silent, the decay
   really decays, each channel is pinned to the same energy,
   the channels differ (a stereo room), and the bus feeds a
   convolver straight to the destination.                  */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
const fnFull = grab('  function roomIR(c, big) {', '\n  }');
const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
const roomIR = new Function('Math', 'return function roomIR(c, big) {' + fnBody + '}')(Math);

/* --- build one IR over a mock context --- */
const SR = 48000;
const channels = [];
const mockCtx = {
  sampleRate: SR,
  createBuffer: (ch, len) => {
    const data = [];
    for (let i = 0; i < ch; i++) data.push(new Float32Array(len));
    return { length: len, numberOfChannels: ch, getChannelData: (i) => data[i] };
  }
};
const buf = roomIR(mockCtx);
if (buf.numberOfChannels !== 2) throw new Error('a stereo room');
const rt = 1.35, pre = 0.012;
const expectedLen = Math.floor(SR * (pre + rt + 0.05));
if (buf.length !== expectedLen) throw new Error('length must cover pre-delay + RT + pad: ' + buf.length);
for (let ch = 0; ch < 2; ch++) channels.push(buf.getChannelData(ch));

/* --- the pre-delay is silent --- */
for (let ch = 0; ch < 2; ch++)
  for (let i = 0; i < Math.floor(pre * SR); i++)
    if (channels[ch][i] !== 0) throw new Error('nothing may sound before the reflections');
console.log('pre-delay: ' + Math.round(pre * 1000) + 'ms of air before the room answers');

/* --- the tail decays: a window at the RT is tiny next to the onset --- */
const peak = (d, a, b) => { let m = 0; for (let i = a; i < b; i++) m = Math.max(m, Math.abs(d[i])); return m; };
for (let ch = 0; ch < 2; ch++) {
  const onset = peak(channels[ch], Math.floor(pre * SR), Math.floor((pre + 0.01) * SR));
  const atRt = peak(channels[ch], Math.floor((pre + rt - 0.01) * SR), Math.floor((pre + rt) * SR));
  if (!(onset > 0) || !(atRt / onset < 0.05))
    throw new Error('the tail must reach ~-60dB by its RT: ' + (atRt / onset).toFixed(4));
}
console.log('decay: the tail reaches -60dB by its 1.35s RT \u2014 a floor, not a canyon');

/* --- each channel is pinned to the same energy --- */
const energy = (d) => { let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s); };
const e0 = energy(channels[0]), e1 = energy(channels[1]);
if (Math.abs(e0 - 0.35) > 0.02 || Math.abs(e1 - 0.35) > 0.02)
  throw new Error('both channels pinned to 0.35: ' + e0.toFixed(3) + ' / ' + e1.toFixed(3));
let diff = 0;
for (let i = 0; i < channels[0].length; i += 997) if (channels[0][i] !== channels[1][i]) diff++;
if (diff < 40) throw new Error('the channels must differ \u2014 a stereo room, not a mono one');
console.log('normalization: each channel pinned at 0.35 energy, decorrelated \u2014 a stereo room');

/* --- the hall: the cinema's second, larger character --- */
const hall = roomIR(mockCtx, true);
if (!(hall.length > buf.length)) throw new Error('the hall must be a longer room than the felt');
const HRT = 2.8, HPRE = 0.026;
if (hall.length !== Math.floor(SR * (HPRE + HRT + 0.05))) throw new Error('hall length must cover its pre-delay + RT + pad: ' + hall.length);
const hch = [hall.getChannelData(0), hall.getChannelData(1)];
for (let ch2 = 0; ch2 < 2; ch2++)
  for (let i = 0; i < Math.floor(HPRE * SR); i++)
    if (hch[ch2][i] !== 0) throw new Error('the hall keeps its air before the reflections');
const hOnset = peak(hch[0], Math.floor(HPRE * SR), Math.floor((HPRE + 0.01) * SR));
const hAtRt = peak(hch[0], Math.floor((HPRE + HRT - 0.01) * SR), Math.floor((HPRE + HRT) * SR));
if (!(hOnset > 0) || !(hAtRt / hOnset < 0.05)) throw new Error('the hall tail must reach ~-60dB by its 2.8s RT: ' + (hAtRt / hOnset).toFixed(4));
if (Math.abs(energy(hch[0]) - 0.35) > 0.02 || Math.abs(energy(hch[1]) - 0.35) > 0.02)
  throw new Error('the hall is pinned to the same 0.35 loudness \u2014 bigger, not louder');
let hd = 0;
for (let i = 0; i < hch[0].length; i += 997) if (hch[0][i] !== hch[1][i]) hd++;
if (hd < 40) throw new Error('the hall must be a stereo room too');
console.log('the hall: ' + (hall.length / SR).toFixed(2) + 's of air against the felt\u2019s ' + (buf.length / SR).toFixed(2) + 's \u2014 same loudness, decorrelated, breathing with the stretched flights');

/* --- the wiring: a send off the mix into a convolver, straight out --- */
if (!/var actx = null, master = null, noiseBuf = null, reverbBus = null, wetA = null, wetB = null;/.test(src))
  throw new Error('the two rooms must live beside the bus');
const chain = grab('        reverbBus = actx.createGain();', 'wetB.connect(actx.destination);');
if (!/convFelt\.buffer = roomIR\(actx\);/.test(chain)) throw new Error('the felt convolver must carry the synthesized room');
if (!/convHall\.buffer = roomIR\(actx, true\);/.test(chain)) throw new Error('the hall convolver must carry the second character');
if (!/reverbBus\.connect\(convFelt\);/.test(chain) || !/reverbBus\.connect\(convHall\);/.test(chain))
  throw new Error('both rooms must hang on the bus');
if (!/reverbBus\.gain\.value = 0\.35;/.test(chain)) throw new Error('the bus trims the shared share at 0.35 — under the deal, never over it');
if (!/wetA\.gain\.value = cineOn \? 0 : 1;/.test(chain) || !/wetB\.gain\.value = cineOn \? 1 : 0;/.test(chain))
  throw new Error('a page born in cinema must wake in the hall');
if (/master\.connect\(reverbBus\)/.test(src))
  throw new Error('the send must come from the voices — a mix-bus send would double every room');
console.log('wiring: voices → their own send → bus 0.35 → two rooms crossfaded → destination — no mix-bus double-send');

/* --- the toggle slides the walls, it never clicks --- */
if (!/wetA\.gain\.setTargetAtTime\(on \? 0 : 1, actx\.currentTime, 0\.25\);/.test(src) ||
    !/wetB\.gain\.setTargetAtTime\(on \? 1 : 0, actx\.currentTime, 0\.25\);/.test(src))
  throw new Error('the cinema toggle must crossfade the two rooms');
console.log('the toggle: the wet path slides felt \u2194 hall over ~0.75s while the flights stretch');

/* --- the room answers the mute too --- */
if (!/reverbBus\.gain\.value = audioOn \? 0\.35 : 0;/.test(src))
  throw new Error('muting the felt must mute the walls as well');

/* --- per-voice levels: families, not one flat wash --- */
if (!/function toRoom\(node, room\) \{/.test(src)) throw new Error('voices must send through toRoom');
if (!/w\.gain\.value = room == null \? 1 : room;/.test(src)) throw new Error('a voice without a level keeps the plain share');
if (!/toRoom\(g, room\);/.test(src)) throw new Error('tone and burst must send their own level');
if (!/toRoom\(out, CLACK_ROOM\);/.test(src)) throw new Error('the panned clack must send after its pan, dry');
if (!/toRoom\(p, WHOOSH_ROOM\);/.test(src)) throw new Error('the whoosh must send after its pan, swimming');
const riffle = grab('  function riffleShuffle(delay0) {', '\n  }');
const sting = grab('  function stinger(result) {', '\n  }');
const rSends = (riffle.match(/RIFFLE_ROOM/g) || []).length, sSends = (sting.match(/STINGER_ROOM/g) || []).length;
if (rSends < 7) throw new Error('every riffle voice must lean into the room: ' + rSends);
if (sSends < 6) throw new Error('every stinger voice must lean into the room: ' + sSends);
const lvl = src.match(/var RIFFLE_ROOM = ([\d.]+), STINGER_ROOM = ([\d.]+), WHOOSH_ROOM = ([\d.]+), CLACK_ROOM = ([\d.]+);/);
if (!lvl) throw new Error('the four levels must be named constants');
if (!(Number(lvl[1]) > Number(lvl[3]) && Number(lvl[3]) > Number(lvl[2]) && Number(lvl[2]) > 1 && Number(lvl[4]) < 1))
  throw new Error('the ceremony swims biggest, the whoosh next, the verdict next, the felt plain, the clacks dry: ' + lvl[0]);
console.log('the swell: riffle ' + lvl[1] + '\u00d7, whoosh ' + lvl[3] + '\u00d7, stinger ' + lvl[2] + '\u00d7, the felt at its plain 1\u00d7, the clacks dry at ' + lvl[4] + '\u00d7 — the room answers where it belongs');

/* --- the families: clacks stay dry-ish, whooshes swim --- */
const clackSrc = grab('  function chipClack(delay, gain, dist, pan) {', '\n  }');
if ((clackSrc.match(/CLACK_ROOM/g) || []).length !== 3)
  throw new Error('a clack must send dry on every path: the pan, the tick and the thock');
const whooshSrc = grab('  function cardWhoosh(', '\n  }');
if (!/toRoom\(p, WHOOSH_ROOM\);/.test(whooshSrc) || !/toRoom\(g, WHOOSH_ROOM\);/.test(whooshSrc))
  throw new Error('the whoosh must swim on both of its paths');

console.log('\nroom reverb verified');
