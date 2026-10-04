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
const ROOM = require(path.join(__dirname, '..', 'room999.js'));   /* the shared voice registry */
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
if (!/toRoom\(out, CLACK_ROOM\(\)\);/.test(src)) throw new Error('the panned clack must send after its pan, dry');
if (!/toRoom\(p, WHOOSH_ROOM\(\)\);/.test(src)) throw new Error('the whoosh must send after its pan, swimming');
const riffle = grab('  function riffleShuffle(delay0) {', '\n  }');
const sting = grab('  function stinger(result) {', '\n  }');
const rSends = (riffle.match(/RIFFLE_ROOM/g) || []).length, sSends = (sting.match(/STINGER_ROOM/g) || []).length;
if (rSends < 7) throw new Error('every riffle voice must lean into the room: ' + rSends);
if (sSends < 6) throw new Error('every stinger voice must lean into the room: ' + sSends);
/* the table's sends are reads of the shared registry, not literals */
const lvl = /var RIFFLE_ROOM = function \(\) \{ return ROOM999\.send\('riffle'\); \};/.test(src) &&
  /var WHOOSH_ROOM = function \(\) \{ return ROOM999\.send\('whoosh'\); \};/.test(src) &&
  /var STINGER_ROOM = function \(\) \{ return ROOM999\.send\('stinger'\); \};/.test(src) &&
  /var CLACK_ROOM = function \(\) \{ return ROOM999\.send\('clack'\); \};/.test(src) &&
  /var CUT_ROOM = function \(\) \{ return ROOM999\.send\('cut'\); \};/.test(src) &&
  /var BETS_ROOM = function \(\) \{ return ROOM999\.send\('bets'\); \};/.test(src) &&
  /var TAP_ROOM = function \(\) \{ return ROOM999\.send\('tap'\); \};/.test(src) &&
  /var BONUS_ROOM = function \(\) \{ return ROOM999\.send\('bonus'\); \};/.test(src);
if (!lvl) throw new Error('every table send must be a one-line read of the shared registry');
/* the ranking itself is the registry's business now — one answer, two felts */
const tRiffle = ROOM.send('riffle'), tWhoosh = ROOM.send('whoosh'),
      tSting = ROOM.send('stinger'), tClack = ROOM.send('clack');
if (!(tRiffle > tWhoosh && tWhoosh > tSting && tSting > 1 && tClack < 1))
  throw new Error('the ceremony swims biggest, the whoosh next, the verdict next, the felt plain, the clacks dry: ' +
    JSON.stringify([tRiffle, tWhoosh, tSting, tClack]));
console.log('the swell: riffle ' + tRiffle + '\u00d7, whoosh ' + tWhoosh + '\u00d7, stinger ' + tSting +
  '\u00d7, the felt at its plain 1\u00d7, the clacks dry at ' + tClack + '\u00d7 — the room answers where it belongs');

/* --- the families: clacks stay dry-ish, whooshes swim --- */
const clackSrc = grab('  function chipClack(delay, gain, dist, pan) {', '\n  }');
if ((clackSrc.match(/CLACK_ROOM/g) || []).length !== 3)
  throw new Error('a clack must send dry on every path: the pan, the tick and the thock');
const whooshSrc = grab('  function cardWhoosh(', '\n  }');
if (!/toRoom\(p, WHOOSH_ROOM\(\)\);/.test(whooshSrc) || !/toRoom\(g, WHOOSH_ROOM\(\)\);/.test(whooshSrc))
  throw new Error('the whoosh must swim on both of its paths');

/* --- the three small voices: a send each, sized to its moment.
       The betting chime calls a round into the room, so it is the
       biggest of the three; the whisper leans in because paper is
       nearly all air; the shoe's tap fires on EVERY card, so it is
       the driest and must never be allowed to stack. Each gives
       back the dry level its tail borrows. --- */
/* the small voices' sends are the registry's too — one answer, two felts */
const cutR = ROOM.send('cut'), betsR = ROOM.send('bets'),
      tapR = ROOM.send('tap'), bonusR = ROOM.send('bonus');
if (!(betsR > cutR && cutR > 1 && tapR < 0.6 && tapR < cutR))
  throw new Error('the chime calls the room hardest, the whisper next, the tap driest of all: ' +
    JSON.stringify([betsR, cutR, tapR, bonusR]));
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
if (!/burst\(c, t, 0\.32, 'bandpass', 900, 0\.8, cg2 \* (0\.\d+), null, CUT_ROOM\(\)\);/.test(cutSrc) ||
    !/tone\(c, 233\.08, t \+ 0\.14, 0\.12, 'triangle', cg2 \* (0\.\d+), 155, null, CUT_ROOM\(\)\);/.test(cutSrc))
  throw new Error('the whisper must stay quiet and lean on the room: ' + cutSrc);
for (const m of cutSrc.match(/(?:burst|tone)\([^;]*?\);/g) || []) {
  if (!/CUT_ROOM\(\)/.test(m)) throw new Error('the whisper has a note on the default share: ' + m);
}
if (!/tone\(c, 783\.99, t, 0\.34, 'triangle', bg2 \* (0\.\d+), 659\.25, null, BETS_ROOM\(\)\);/.test(betsSrc))
  throw new Error('the chime must pay for its send out of its own dry level: ' + betsSrc);
for (const m of betsSrc.match(/(?:burst|tone)\([^;]*?\);/g) || []) {
  if (!/BETS_ROOM\(\)/.test(m)) throw new Error('the chime has a note on the default share: ' + m);
}
/* the tap carries the shoe's seat and sends AFTER the pan, so the
   reflection keeps the direction — the clack's own discipline */
if (!/toRoom\(out, TAP_ROOM\(\)\);/.test(tapSrc) || !/out\.connect\(master\);/.test(tapSrc))
  throw new Error('the tap must pan before it sends: ' + tapSrc);
if (!/panFor\(\{ x: SHOE\[0\], y: SHOE\[1\], z: SHOE\[2\] \}\)/.test(tapSrc))
  throw new Error('the tap must come from where the shoe stands');
/* the tap is the smallest voice on the table, and it now RIDES the
   shoe's penetration: a fresh stack's first card is exactly the old
   fixed tick, and the last one off a bare stack is emptier — higher,
   sharper, with far less body under it */
if (!/var v = tapVoice\(shoeCut \? shoeDealt \/ shoeCut : 0\);/.test(tapSrc))
  throw new Error('the tap must read how deep the shoe is: ' + tapSrc);
if (!/burst\(c, t, 0\.028, 'bandpass', v\.tick, v\.q, v\.tickG, out, TAP_ROOM\(\)\);/.test(tapSrc) ||
    !/tone\(c, v\.body, t, 0\.05, 'triangle', v\.bodyG, v\.slide, out, TAP_ROOM\(\)\);/.test(tapSrc))
  throw new Error('both of the tap\'s voices must ride the shoe: ' + tapSrc);
if (!/var v = tapVoice\(shoeCut \? shoeDealt \/ shoeCut : 0\);/.test(tapSrc))
  throw new Error('the tap must still read how deep the shoe is: ' + tapSrc);
if (!/var tg = ROOM999\.gain\('tap'\);/.test(tapSrc))
  throw new Error('the tap must take its level from the shared registry, or tuning it moves nothing');
const tvSrc = grab('  function tapVoice(pen) {', '\n  }');
if ((tapSrc.match(/TAP_ROOM/g) || []).length !== 3)
  throw new Error('the tap must still send on the panner AND both its voices: ' + tapSrc);
const tapVoice = new Function('return function tapVoice(pen) {' +
  tvSrc.slice(tvSrc.indexOf('{') + 1, tvSrc.lastIndexOf('}')) + '}')();
const top = tapVoice(0), deep = tapVoice(1);
if (!(top.tick === 2100 && top.q === 2.2 && top.body === 196 && top.slide === 150 &&
      Math.abs(top.tickG - 0.055) < 1e-9 && Math.abs(top.bodyG - 0.028) < 1e-9))
  throw new Error('the first card off a full stack keeps the tap the table always had: ' + JSON.stringify(top));
if (!(deep.tick > top.tick && deep.q > top.q && deep.body > top.body))
  throw new Error('a late-shoe card must sound emptier — higher and sharper: ' + JSON.stringify(deep));
if (!(deep.bodyG < top.bodyG * 0.6))
  throw new Error('the body must empty away by the cut, which is what emptier means: ' + JSON.stringify(deep));
if (!(deep.tickG <= top.tickG))
  throw new Error('the tap must never get louder as the shoe empties: ' + JSON.stringify(deep));
/* the mapping must be monotone between the ends, or a run of cards would
   wander up and down a scale the player is meant to hear as one rise */
let prev = -1;
for (let p = 0; p <= 1.0001; p += 0.05) {
  const v = tapVoice(p);
  if (!(v.tick > prev)) throw new Error('the tick must rise monotonically with penetration');
  prev = v.tick;
}
/* and clamped: a shoe that reports nonsense must still sound like a shoe */
if (JSON.stringify(tapVoice(-1)) !== JSON.stringify(top) ||
    JSON.stringify(tapVoice(99)) !== JSON.stringify(deep) ||
    JSON.stringify(tapVoice(NaN)) !== JSON.stringify(top))
  throw new Error('the penetration mapping must clamp nonsense to a fresh or a bare shoe');
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
if (!/tone\(c, 659\.25, t, 0\.3, 'triangle', bg \* (0\.\d+), null, null, BONUS_ROOM\(\)\);/.test(bonusSrc) ||
    !/tone\(c, 1318\.5, t \+ 0\.12, 0\.3, 'triangle', bg \* (0\.\d+), null, null, BONUS_ROOM\(\)\);/.test(bonusSrc))
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

/* ===================================================================
   THE PRACTICE FLOOR's ROOM. The floor had voices but no room at
   all: every sound went straight to the destination, which is why
   they read flat next to the table's. It now carries the SAME
   system - a synthesized IR, a trimmed bus, and a send per voice -
   at the size of one practice table.                          */
const fsrc = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
function fgrab(a, b) {
  const i = fsrc.indexOf(a), j = fsrc.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('floor anchor miss: ' + a);
  return fsrc.slice(i, j + b.length);
}
/* the floor's IR: the table's own arithmetic at a smaller size, so the
   two rooms are recognisably the same room - a shorter tail and closer
   first answers, everything else identical */
const fIRFull = fgrab('  function roomIR(c) {', '\n  }');
if (/function roomIR\(c, big\)/.test(fIRFull))
  throw new Error('the floor has one room, not a crossfaded pair: it has no cinema to slide toward');
if (!/var rt = 1\.15, pre = 0\.010;/.test(fIRFull))
  throw new Error('the floor\u2019s room must be the smaller one: ' + fIRFull);
if (!/var taps = \[0\.018, 0\.029, 0\.041\];/.test(fIRFull))
  throw new Error('the floor\u2019s first answers must land closer: ' + fIRFull);
if (!/last = last \* 0\.78 \+ n \* 0\.22;/.test(fIRFull))
  throw new Error('the floor must damp its tail exactly as the table does');
if (!/0\.35 \/ Math\.sqrt\(sum\)/.test(fIRFull))
  throw new Error('the floor\u2019s room must be pinned to the same loudness as the table\u2019s');
const fIR = new Function('Math', 'return function roomIR(c) {' +
  fIRFull.slice(fIRFull.indexOf('{') + 1, fIRFull.lastIndexOf('}')) + '}')(Math);
const fchans = [];
const fmock = {
  sampleRate: 48000,
  createBuffer: (ch, len) => {
    const arr = [];
    for (let i = 0; i < ch; i++) arr.push(new Float32Array(len));
    return { length: len, numberOfChannels: ch, getChannelData: (k) => arr[k] };
  }
};
const fbuf = fIR(fmock);
for (let k = 0; k < fbuf.numberOfChannels; k++) fchans.push(fbuf.getChannelData(k));
if (fbuf.numberOfChannels !== 2) throw new Error('the floor\u2019s room must be stereo, like the table\u2019s');
const preN = Math.floor(0.010 * 48000);
for (const d of fchans) {
  for (let i = 0; i < preN; i++) if (d[i] !== 0) throw new Error('the pre-delay must be silent');
  /* the tail starts exactly AT the pre-delay boundary (the table's own
     `t < pre ? 0 : ...`), and the first reflection lands past it */
  let first = 0;
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 0.001) { first = i; break; }
  if (first < preN) throw new Error('the room must not answer before its pre-delay is up');
  const tapAt = Math.floor((0.010 + 0.018) * 48000);
  if (!(Math.abs(d[tapAt]) > 0.001)) throw new Error('the floor\\u2019s first reflection must land past the pre-delay');
}
/* the tail must actually decay: the late end quieter than the early */
{
  const d = fchans[0];
  const q = (a, b) => { let s2 = 0; for (let i = a; i < b; i++) s2 += d[i] * d[i]; return s2; };
  const head = q(preN, preN + 4800), tail = q(d.length - 4800, d.length);
  if (!(tail < head)) throw new Error('the room\u2019s tail must decay, or it is not a room');
}
/* the bus: trimmed like the table\u2019s, one convolver, and the return leans */
const fready = fgrab('  function ready() {', 'wakeAudio');
if (!/reverbBus\.gain\.value = 0\.35;/.test(fready))
  throw new Error('the floor\u2019s bus must trim 0.35, exactly as the table\u2019s does');
if (!/var conv = actx\.createConvolver\(\);/.test(fready) || !/conv\.buffer = roomIR\(actx\);/.test(fready))
  throw new Error('the floor\u2019s room must reach a convolver built from its own IR');
if (!/wetPan\.connect\(actx\.destination\);/.test(fready))
  throw new Error('the floor\u2019s return must lean, as the table\u2019s does');
if (/convHall/.test(fready))
  throw new Error('the floor has no cinema, so it must not build a hall it cannot reach');
/* the send helper, and the rule that sends sit AFTER the panner */
const ftoRoom = fgrab('  function toRoom(node, room) {', '\n  }');
if (!/w\.gain\.value = room == null \? 1 : room;/.test(ftoRoom))
  throw new Error('every voice must answer the room at its own level: ' + ftoRoom);
const ftone = fgrab('  function tone(c, freq, t, dur, type, gain, slideTo, out, room) {', '\n  }');
const fburst = fgrab('  function burst(c, t, dur, type, freq, q, gain, out, room) {', '\n  }');
for (const [n, b] of [['tone', ftone], ['burst', fburst]]) {
  if (!/if \(out\) \{ g\.connect\(out\); \}/.test(b))
    throw new Error(n + ' must let a custom tail send at its own end');
  if (!/else \{ g\.connect\(master\); toRoom\(g, room\); \}/.test(b))
    throw new Error(n + ' must send to the room when it has no tail of its own');
}
/* the panned voices send after the pan, so the room keeps the direction */
const fcw = fgrab('  function cardWhoosh(', '\n  }');
if (!/g\.connect\(p\); p\.connect\(master\);\s*toRoom\(p, WHOOSH_ROOM\(\)\);/.test(fcw))
  throw new Error('the whoosh must send AFTER its pan: the room keeps the deal\u2019s direction');
const frs = fgrab('  function riffleSound(', '\n  }');
if (!/out\.connect\(master\);\s*toRoom\(out, RIFFLE_ROOM\(\)\);/.test(frs))
  throw new Error('the shuffle must send AFTER the shoe\u2019s pan, like every other voice');
/* the floor names its own sends, and the snap deliberately stays dry */
/* The sends are NOT declared on the page any more: each binding is a
   one-line read of ROOM999, so the floor and the table cannot drift on a
   number that now lives in exactly one place. */
const fbind = /var RIFFLE_ROOM = function \(\) \{ return ROOM999\.send\('riffle'\); \};/.test(fsrc) &&
  /var WHOOSH_ROOM = function \(\) \{ return ROOM999\.send\('whoosh'\); \};/.test(fsrc) &&
  /var STINGER_ROOM = function \(\) \{ return ROOM999\.send\('stinger'\); \};/.test(fsrc) &&
  /var CLACK_ROOM = function \(\) \{ return ROOM999\.send\('clack'\); \};/.test(fsrc) &&
  /var CUE_ROOM = function \(\) \{ return ROOM999\.send\('cue'\); \};/.test(fsrc);
if (!fbind) throw new Error('every floor send must be a one-line read of the shared registry');
if (/ROOM = [\d.]+[,;]/.test(fsrc) || /var CUE_ROOM = [\d.]+;/.test(fsrc))
  throw new Error('the floor must not keep a send number of its own \u2014 that is how it drifts');
/* the shipped values live in ROOM999, so the RANKING and the VALUES are
   asserted against the registry rather than against the page */
const rclack = ROOM.send('clack'), rcue = ROOM.send('cue'), rriffle = ROOM.send('riffle');
if (!(rclack <= 0.6 && rclack < rcue))
  throw new Error('the clacks must stay dry-ish by the cloth, and drier than any voice that leans in');
if (!(rcue > 1)) throw new Error('a call across a quiet felt IS the room: the coach must lean in');
if (!(rriffle > ROOM.send('whoosh') && ROOM.send('whoosh') > ROOM.send('stinger') && ROOM.send('stinger') > rclack))
  throw new Error('the sends must rank as the table always ranked them');
for (const [a, b] of [[rriffle, 1.7], [ROOM.send('stinger'), 1.4], [ROOM.send('whoosh'), 1.5], [rclack, 0.6]]) {
  if (a !== b) throw new Error('the registry must carry the table\u2019s own send value, ' + b + ', not ' + a);
}
/* the snap reads ROOM999.send('snap'), which SHIPS at zero — so it stays
   the one plain voice until somebody deliberately turns the room up on it */
const fcs = fgrab('  function cardSnap(', '\n  }');
if (!/ROOM999\.send\('snap'\)/.test(fcs))
  throw new Error('the snap must read its send from the shared registry too');
if (ROOM.send('snap') !== 0)
  throw new Error('the snap must ship dry: the room is something you turn up, not something it gets');
if (/CLACK_ROOM|WHOOSH_ROOM|STINGER_ROOM|RIFFLE_ROOM|CUE_ROOM|toRoom/.test(fcs))
  throw new Error('the snap must not borrow another voice\u2019s send');
/* every floor voice that sounds must name its own send: no voice left on
   the default share, exactly as the table demands of itself */
/* Every floor voice that sounds must name its own send — no voice left
   on the default share, exactly as the table demands of itself. The rule
   is per CALL, not per function: a voice that pans sends at its panner's
   end (the table's discipline), and a voice with no panner names the send
   on every single note it plays.                                            */
const fpanned = ['cardWhoosh', 'riffleSound'];
const funpanned = ['chipClack', 'coachCue', 'stinger'];
const fdeclared = fpanned.concat(funpanned);
for (const name of fpanned) {
  const body = fgrab('  function ' + name + '(', '\n  }');
  const sends = (body.match(/toRoom\((?:p|out), [A-Z_]+_ROOM\(\)\);/g) || []);
  if (sends.length !== 1)
    throw new Error(name + ' must send exactly once, at its panner: ' + JSON.stringify(sends));
}
for (const name of funpanned) {
  const body = fgrab('  function ' + name + '(', '\n  }');
  /* every call it makes, and how many of them carry a send */
  const calls = body.match(/(?:burst|tone)\([^;]*?\);/g) || [];
  if (!calls.length) throw new Error(name + ' makes no sound at all: ' + body);
  const unsent = calls.filter((cl) => !/_ROOM\(\)\)|ROOM999\.send\(/.test(cl));
  if (unsent.length)
    throw new Error(name + ' has a note on the default share: ' + unsent[0]);
}
/* and the snap is the one voice that sends nothing, on purpose */
const fcsCalls = (fgrab('  function cardSnap(', '\n  }').match(/(?:burst|tone)\([^;]*?\);/g) || []);
for (const cl of fcsCalls) {
  if (/_ROOM\(\)/.test(cl))
    throw new Error('the snap must not borrow another voice\u2019s send: ' + cl);
}
if (fdeclared.length !== 5)
  throw new Error('every floor voice but the snap must name a send: ' + JSON.stringify(fdeclared));
/* and each pays for the tail it borrows out of its own dry level, so the
   send never buys loudness: every sent gain must be at or under what it
   was dry */
/* Each voice pays for the tail it borrows out of its own dry level: the
   shipped gain is the ceiling and no sent note may sit AT it. The page
   expresses that as a fraction of ROOM999.gain(), so the ceiling is the
   registry's number and both surfaces share it. */
const paidDown = [
  [/burst\(c, t, 0\.05, 'bandpass', 2600, 1\.6, cg \* (0\.\d+), null, CLACK_ROOM\(\)\);/, 'clack tick'],
  [/tone\(c, 300, t, 0\.075, 'triangle', cg \* (0\.\d+), 170, null, CLACK_ROOM\(\)\);/, 'clack body'],
  [/tone\(c, 880, t, 0\.09, 'triangle', ug \* (0\.\d+),/, 'cue high'],
  [/tone\(c, 1318\.51, t \+ 0\.075, 0\.13, 'triangle', ug \* (0\.\d+),/, 'cue shimmer'],
  [/tone\(c, 220, t, 0\.18, 'triangle', ROOM999\.gain\('cue'\) \* (0\.\d+), 165, null, CUE_ROOM\(\)\);/, 'cue sigh']
];
for (const [re, what] of paidDown) {
  const m = re.exec(fsrc);
  if (!m) throw new Error('the floor\u2019s voice must read: ' + what);
  if (!(Number(m[1]) < 1)) throw new Error(what + ' must pay for its tail out of its own dry level, not sit at it');
}
if (ROOM.gain('clack') !== 0.28 || ROOM.gain('cue') !== 0.05 || ROOM.gain('stinger') !== 0.17)
  throw new Error('the registry must carry the shipped gains the page used to hard-code');
console.log('the floor has the room now: its own smaller IR, the 0.35 bus, the leaning return,');
console.log('a send per voice (' + fdeclared.join(', ') + ') \u2014 and the snap still dry on the cloth');
console.log('no floor voice left on the default share: ' + fdeclared.length + ' declared, the snap dry by design');

console.log('\nroom reverb verified');
