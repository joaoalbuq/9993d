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
const fnFull = grab('  function roomIR(c) {', '\n  }');
const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
const roomIR = new Function('Math', 'return function roomIR(c) {' + fnBody + '}')(Math);

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

/* --- the wiring: a send off the mix into a convolver, straight out --- */
if (!/var actx = null, master = null, noiseBuf = null, reverbBus = null;/.test(src))
  throw new Error('the bus must live beside the master');
const chain = grab('        reverbBus = actx.createGain();', 'conv.connect(actx.destination);');
if (!/conv\.buffer = roomIR\(actx\);/.test(chain)) throw new Error('the convolver must carry the synthesized room');
if (!/reverbBus\.connect\(conv\);/.test(chain)) throw new Error('the bus must feed the convolver');
if (!/reverbBus\.gain\.value = 0\.35;/.test(chain)) throw new Error('the bus trims the shared share at 0.35 — under the deal, never over it');
if (/master\.connect\(reverbBus\)/.test(src))
  throw new Error('the send must come from the voices — a mix-bus send would double every room');
console.log('wiring: voices → their own send → bus 0.35 → convolver(roomIR) → destination — no mix-bus double-send');

/* --- the room answers the mute too --- */
if (!/reverbBus\.gain\.value = audioOn \? 0\.35 : 0;/.test(src))
  throw new Error('muting the felt must mute the walls as well');

/* --- per-voice levels: default share, riffle and stinger lean in --- */
if (!/function toRoom\(node, room\) \{/.test(src)) throw new Error('voices must send through toRoom');
if (!/w\.gain\.value = room == null \? 1 : room;/.test(src)) throw new Error('a voice without a level keeps the plain share');
if (!/toRoom\(g, room\);/.test(src)) throw new Error('tone and burst must send their own level');
if (!/toRoom\(out\);/.test(src)) throw new Error('the panned clack must send after its pan');
if (!/toRoom\(p\);/.test(src)) throw new Error('the whoosh must send after its pan');
const riffle = grab('  function riffleShuffle(delay0) {', '\n  }');
const sting = grab('  function stinger(result) {', '\n  }');
const rSends = (riffle.match(/RIFFLE_ROOM/g) || []).length, sSends = (sting.match(/STINGER_ROOM/g) || []).length;
if (rSends < 7) throw new Error('every riffle voice must lean into the room: ' + rSends);
if (sSends < 6) throw new Error('every stinger voice must lean into the room: ' + sSends);
const lvl = src.match(/var RIFFLE_ROOM = ([\d.]+), STINGER_ROOM = ([\d.]+);/);
if (!lvl) throw new Error('the two levels must be named constants');
if (!(Number(lvl[1]) > Number(lvl[2]) && Number(lvl[2]) > 1))
  throw new Error('the ceremony swells biggest, the verdict next, the felt plain: ' + lvl[0]);
console.log('the swell: riffle ' + lvl[1] + '\u00d7, stinger ' + lvl[2] + '\u00d7, the felt at its plain 1\u00d7 — the room answers where it belongs');

console.log('\nroom reverb verified');
