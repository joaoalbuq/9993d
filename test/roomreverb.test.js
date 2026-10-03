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
if (!/var actx = null, master = null, noiseBuf = null, reverbBus = null, wetA = null, wetB = null, wetPan = null;/.test(src))
  throw new Error('the two rooms and their shared return must live beside the bus');
const chain = grab('        reverbBus = actx.createGain();', 'wetB.connect(actx.destination);');
if (!/convFelt\.buffer = roomIR\(actx\);/.test(chain)) throw new Error('the felt convolver must carry the synthesized room');
if (!/convHall\.buffer = roomIR\(actx, true\);/.test(chain)) throw new Error('the hall convolver must carry the second character');
if (!/reverbBus\.connect\(convFelt\);/.test(chain) || !/reverbBus\.connect\(convHall\);/.test(chain))
  throw new Error('both rooms must hang on the bus');
if (!/reverbBus\.gain\.value = 0\.35;/.test(chain)) throw new Error('the bus trims the shared share at 0.35 — under the deal, never over it');
if (!/wetA\.gain\.value = cineOn \? 0 : 1;/.test(chain) || !/wetB\.gain\.value = cineOn \? 1 : 0;/.test(chain))
  throw new Error('a page born in cinema must wake in the hall');
if (!/convFelt\.connect\(wetA\); convHall\.connect\(wetB\);/.test(chain) ||
    !/wetA\.connect\(wetPan\); wetB\.connect\(wetPan\);/.test(chain))
  throw new Error('the shared return must hang past both rooms\u2019 crossfade gains');
if (!/else \{\s*\n\s*wetA\.connect\(actx\.destination\); wetB\.connect\(actx\.destination\);/.test(chain))
  throw new Error('a missing panner API must leave the return centered, not broken');
if (/master\.connect\(reverbBus\)/.test(src))
  throw new Error('the send must come from the voices — a mix-bus send would double every room');
console.log('wiring: voices → their own send → bus 0.35 → two rooms crossfaded → destination — no mix-bus double-send');

/* --- the toggle slides the walls, it never clicks --- */
if (!/wetA\.gain\.setTargetAtTime\(on \? 0 : 1, actx\.currentTime, 0\.25\);/.test(src) ||
    !/wetB\.gain\.setTargetAtTime\(on \? 1 : 0, actx\.currentTime, 0\.25\);/.test(src))
  throw new Error('the cinema toggle must crossfade the two rooms');
console.log('the toggle: the wet path slides felt \u2194 hall over ~0.75s while the flights stretch');

/* --- the far wall: the return leans opposite the flying card --- */
if (!/wetPan\.pan\.setValueAtTime\(clamp\(-s0 \* 0\.35, -1, 1\), t\);/.test(src) ||
    !/wetPan\.pan\.linearRampToValueAtTime\(clamp\(-pan \* 0\.35, -1, 1\), t \+ D\);/.test(src))
  throw new Error('the return must lean subtly opposite the flyer\u2019s seat, ramping across the flight');
if (!/wetPan\.pan\.setTargetAtTime\(0, t \+ D, 0\.25\);/.test(src))
  throw new Error('the walls must re-center after the card lands');
if (!/if \(wetPan && wet\.hold <= t\) \{/.test(src) || !/wet\.hold = t \+ D \+ 0\.75;/.test(src))
  throw new Error('one flyer must own the walls \u2014 a straggler mid-flight must not yank them');
console.log('the far wall: the return leans \u22120.35\u00d7 the flyer\u2019s seat across the flight, re-centers a beat after it lands, one flyer at a time');

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

/* --- the three small voices: a send each, sized to its moment.
       The betting chime calls a round into the room, so it is the
       biggest of the three; the whisper leans in because paper is
       nearly all air; the shoe's tap fires on EVERY card, so it is
       the driest and must never be allowed to stack. Each gives
       back the dry level its tail borrows. --- */
const small = src.match(/var CUT_ROOM = ([\d.]+), BETS_ROOM = ([\d.]+), TAP_ROOM = ([\d.]+), BONUS_ROOM = ([\d.]+);/);
if (!small) throw new Error('the small voices must be named constants');
const cutR = Number(small[1]), betsR = Number(small[2]), tapR = Number(small[3]), bonusR = Number(small[4]);
if (!(betsR > cutR && cutR > 1 && tapR < 0.6 && tapR < cutR))
  throw new Error('the chime calls the room hardest, the whisper next, the tap driest of all: ' + small[0]);
if (!(betsR <= 1.7 && tapR < 0.6))
  throw new Error('the chime must stay under the riffle, the tap under the clacks');
const betsSrc = grab('  function betsOpen(', '\n  }');
const cutSrc = grab('  function cutCue(', '\n  }');
const tapSrc = grab('  function shoeTap(', '\n  }');
if ((betsSrc.match(/BETS_ROOM/g) || []).length !== 2)
  throw new Error('both chime notes must send: ' + betsSrc);
if ((cutSrc.match(/CUT_ROOM/g) || []).length !== 2)
  throw new Error('the whisper and its low tick must both send: ' + cutSrc);
if ((tapSrc.match(/TAP_ROOM/g) || []).length !== 3)
  throw new Error('the tap must send on the panner AND on both its voices: ' + tapSrc);
/* the whisper stays a whisper: its send is nearly three times its
   dry share, and the chime's dry share is lower than it was dry
   alone — the tail is what makes these voices read, not the gain */
if (!/burst\(c, t, 0\.32, 'bandpass', 900, 0\.8, 0\.04, null, CUT_ROOM\);/.test(cutSrc) ||
    !/tone\(c, 233\.08, t \+ 0\.14, 0\.12, 'triangle', 0\.044, 155, null, CUT_ROOM\);/.test(cutSrc))
  throw new Error('the whisper must stay quiet and lean on the room: ' + cutSrc);
if (!/tone\(c, 783\.99, t, 0\.34, 'triangle', 0\.038, 659\.25, null, BETS_ROOM\);/.test(betsSrc))
  throw new Error('the chime must pay for its send out of its own dry level: ' + betsSrc);
/* the tap carries the shoe's seat and sends AFTER the pan, so the
   reflection keeps the direction — the clack's own discipline */
if (!/toRoom\(out, TAP_ROOM\);/.test(tapSrc) || !/out\.connect\(master\);/.test(tapSrc))
  throw new Error('the tap must pan before it sends: ' + tapSrc);
if (!/panFor\(\{ x: SHOE\[0\], y: SHOE\[1\], z: SHOE\[2\] \}\)/.test(tapSrc))
  throw new Error('the tap must come from where the shoe stands');
if (!/burst\(c, t, 0\.028, 'bandpass', 2100, 2\.2, 0\.055, out, TAP_ROOM\);/.test(tapSrc) ||
    !/tone\(c, 196, t, 0\.05, 'triangle', 0\.028, 150, out, TAP_ROOM\);/.test(tapSrc))
  throw new Error('the tap is the smallest voice on the table: ' + tapSrc);
/* it must fire once per card, at the shoe, at the moment of release */
const makeCard = grab('  function makeCard(', '\n  }');
if (!/shoeDealt\+\+;[^]*?\n\s*shoeTap\(\);/.test(makeCard))
  throw new Error('every card leaving the shoe must be heard leaving it');
if (makeCard.indexOf('shoeTap') > makeCard.indexOf('cutCue'))
  throw new Error('the tap belongs to the release itself, before any announcement');
/* the wheel's chime was the last voice left on the default share:
   it copies the betting chime's shape, so it must answer the room
   like one — a little under it, since it pays out rather than
   calls a round — and pay for the tail out of its own dry level */
const bonusSrc = grab('  function bonusWin(', '\n  }');
if ((bonusSrc.match(/BONUS_ROOM/g) || []).length !== 2)
  throw new Error('both bonus notes must send: ' + bonusSrc);
if (!(bonusR > 1 && bonusR < betsR))
  throw new Error('the wheel blooms, but under the chime that calls the round: ' + bonusR);
if (!/tone\(c, 659\.25, t, 0\.3, 'triangle', 0\.038, null, null, BONUS_ROOM\);/.test(bonusSrc) ||
    !/tone\(c, 1318\.5, t \+ 0\.12, 0\.3, 'triangle', 0\.026, null, null, BONUS_ROOM\);/.test(bonusSrc))
  throw new Error('the bonus must pay for its send out of its own dry level: ' + bonusSrc);
/* and no voice may be left on the default share by accident: every
   voice that sounds must name one of the declared sends. The two
   primitives are exempt — they carry `room` as a parameter and send
   whatever their caller chose. The card snap is the ONE deliberate
   plain voice: it lands on the cloth directly under the player's
   eyes, so it stays close and dry on purpose — pinned below so the
   choice is stated rather than merely omitted.               */
const declared = ['RIFFLE_ROOM', 'STINGER_ROOM', 'WHOOSH_ROOM', 'CLACK_ROOM',
  'CUT_ROOM', 'BETS_ROOM', 'TAP_ROOM', 'BONUS_ROOM'];
const voiceFns = [...src.matchAll(/^  function ([A-Za-z0-9_]+)\(/gm)];
const stragglers = [];
for (let vi = 0; vi < voiceFns.length; vi++) {
  const name = voiceFns[vi][1];
  if (name === 'tone' || name === 'burst' || name === 'cardSnap') continue;   /* primitives, and the one plain voice */
  const from = voiceFns[vi].index;
  const to = vi + 1 < voiceFns.length ? voiceFns[vi + 1].index : src.length;
  const body = src.slice(from, to);
  if (!/\b(tone|burst)\(/.test(body)) continue;
  if (!declared.some((r) => body.includes(r))) stragglers.push(name);
}
if (stragglers.length)
  throw new Error('these voices sound but name no send: ' + stragglers.join(', '));
const snapSrc = grab('  function cardSnap(', '\n  }');
if (/_ROOM/.test(snapSrc))
  throw new Error('the card snap is the one plain voice — it must stay close and dry on the cloth');
if (!/burst\(c, t, 0\.045, 'bandpass', far \? lerp\(1750, 3000, near\) : 3000, 0\.9, 0\.22 \* lv, out\);/.test(snapSrc) ||
    !/burst\(c, t, 0\.02, 'highpass', far \? lerp\(3400, 5200, near\) : 5200, 0, 0\.10 \* lv, out\);/.test(snapSrc))
  throw new Error('the plain share must be a stated choice, with both of its voices intact: ' + snapSrc);
if (!/var lv = lerp\(0\.68, 1, near\);/.test(snapSrc))
  throw new Error('the snap\u2019s own ladder must top out at the plain voice, so a near flight is unchanged');
if (!/if \(far && c\.createBiquadFilter\)/.test(snapSrc) ||
    !/out\.connect\(lp\); lp\.connect\(master\);/.test(snapSrc))
  throw new Error('the snap may veil its own flight, but it must never take a room send');
console.log('the card snap is the one voice left plain, on purpose \u2014 it lands on the cloth, close and dry');
console.log('the three small voices: chime ' + betsR + '\u00d7 (calls the round), whisper ' + cutR +
  '\u00d7 (paper is all air), tap ' + tapR + '\u00d7 \u2014 driest, one per card, panned to the shoe');
console.log('no voice left on the default share: every one that sounds names its own send (' +
  declared.length + ' declared)');

console.log('\nroom reverb verified');
