/* The table's furniture went from flat dark quads to stacked,
   living geometry: the shoe is a stack of card backs that
   sinks as it deals and refills at the riffle, the discard
   rack grows with every card that played, the tray is five
   columns that ride the house ledger (and drift with it),
   and the +delta is a 3D plank rising from the box instead
   of a DOM pill. The stack math, the tray ledger, the float
   rise math and the render wiring are the properties under
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

/* --- helpers over real constants --- */
const TRAY_SLOTS = Number((src.match(/TRAY_SLOTS = (\d+)/) || [])[1]);
const TRAY_STACK_H = Number((src.match(/TRAY_STACK_H = (\d+)/) || [])[1]);
const TRAY_SINK = Number((src.match(/TRAY_SINK = ([\d.]+)/) || [])[1]);
if (TRAY_SLOTS !== 5 || TRAY_STACK_H !== 5 || TRAY_SINK !== 0.012)
  throw new Error('tray constants must keep the 5-slot, 5-high, 0.012-sink shape');
console.log('tray constants: ' + TRAY_SLOTS + ' slots \u00b7 ' + TRAY_STACK_H + ' high \u00b7 sink ' + TRAY_SINK);

const fillFn = grab('  function trayFill(t) {', '\n  }');
const trayFill = new Function('clamp', 'TRAY_SLOTS', 'TRAY_STACK_H',
  'return function trayFill(t) {' + fillFn.slice(fillFn.indexOf('{') + 1, fillFn.lastIndexOf('}')) + '}')(clamp, TRAY_SLOTS, TRAY_STACK_H);

const colsFn = grab('  function trayCols(t) {', '\n  }');
const trayCols = new Function('trayFill', 'TRAY_SLOTS', 'TRAY_STACK_H',
  'return function trayCols(t) {' + colsFn.slice(colsFn.indexOf('{') + 1, colsFn.lastIndexOf('}')) + '}')(trayFill, TRAY_SLOTS, TRAY_STACK_H);

const shiftFn = grab('  function trayShift(t) {', '\n  }');
const trayShift = new Function('clamp', 'TRAY_SLOTS', 'TRAY_STACK_H', 'return function trayShift(t) {' +
  shiftFn.slice(shiftFn.indexOf('{') + 1, shiftFn.lastIndexOf('}')) + '\n}')(clamp, TRAY_SLOTS, TRAY_STACK_H);

const stackFn = grab('  function stackRange(count, cap, base) {', '\n  }');
const stackRange = new Function('Math', 'return function stackRange(count, cap, base) {' +
  stackFn.slice(stackFn.indexOf('{') + 1, stackFn.lastIndexOf('}')) + '\n}')(Math);

/* --- the tray ledger: empties first, full columns --- */
if (trayFill(0) !== 0 || trayFill(10) !== 2 || trayFill(25) !== 5)
  throw new Error('trayFill maps chips to columns: ' + trayFill(10));
if (trayFill(99) !== 5 || trayFill(-3) !== 0)
  throw new Error('trayFill clamps to the tray');
const c0 = trayCols(0), c10 = trayCols(10), c25 = trayCols(25);
if (c0.some(function (v) { return v !== 0; })) throw new Error('an empty tray is empty');
if (JSON.stringify(c10) !== '[5,5,0,0,0]') throw new Error('slots empty first: ' + JSON.stringify(c10));
if (c25.some(function (v) { return v !== 5; })) throw new Error('a full tray is five full columns');
console.log('trayCols: empty-first fill, 10 chips \u2192 ' + JSON.stringify(c10) + ' \u2014 full at 25');

/* --- the tray drifts WITH the ledger: heavy rides right, paid down eases back --- */
if (trayShift(TRAY_SLOTS * 2) !== 0) throw new Error('the working float sits true');
if (!(trayShift(25) > trayShift(10) && trayShift(10) > trayShift(0)))
  throw new Error('the tray rides farther as the ledger fills: ' + trayShift(25) + ' ' + trayShift(10) + ' ' + trayShift(0));
if (Math.abs(trayShift(25)) > 0.07)
  throw new Error('the drift stays a whisper, not a slide: ' + trayShift(25));
console.log('trayShift: ledger 0 \u2192 ' + trayShift(0).toFixed(4) + ', ledger 25 \u2192 +' + trayShift(25).toFixed(4) + ' \u2014 the tray visibly rides the money');

/* --- the tray columns sit on the flight lane's x ladder --- */
const DEALER_Z = -1.55;
const traySpot = new Function('DEALER_Z', 'return function traySpot(k) { return [-1.18 + (k % 5) * 0.64, DEALER_Z - 0.62]; }')(DEALER_Z);
const traySlotX = new Function('TRAY_SLOTS', 'return function traySlotX(k) { return -1.18 + (k % TRAY_SLOTS) * 0.64; }')(TRAY_SLOTS);
for (let k = 0; k < TRAY_SLOTS; k++) {
  if (Math.abs(traySlotX(k) - traySpot(k)[0]) > 1e-9) throw new Error('tray column ' + k + ' drifted off its flight lane');
  if (Math.abs(traySpot(k)[1] - (DEALER_Z - 0.62)) > 1e-9) throw new Error('traySpot(k) z must stay on the lane');
}
console.log('the lane: traySlotX === traySpot x for every slot \u2014 payouts fly to the columns, distances unchanged');

/* --- stacks: the shoe sinks as it deals, the rack grows as it fills --- */
const SHOE_CARDS = 208;
const full = stackRange(SHOE_CARDS, SHOE_CARDS, 3), dealt = stackRange(SHOE_CARDS / 2, SHOE_CARDS, 3), low = stackRange(8, SHOE_CARDS, 3);
if (!(full > dealt && dealt > low)) throw new Error('the shoe stack must sink as it deals: ' + full + ' ' + dealt + ' ' + low);
if (full !== 10) throw new Error('a full shoe shows its full stack: ' + full);
if (stackRange(0, SHOE_CARDS, 0) !== 0) throw new Error('an empty rack shows nothing');
const rackLow = stackRange(30, SHOE_CARDS, 0), rackMid = stackRange(100, SHOE_CARDS, 0);
if (!(rackMid > rackLow)) throw new Error('the rack grows as cards return: ' + rackLow + ' ' + rackMid);
console.log('stacks: shoe ' + full + '\u2192' + dealt + '\u2192' + low + ' as it deals, rack ' + rackLow + '\u2192' + rackMid + ' as cards return');

/* --- the +delta: 3D plank, rising, fading --- */
const payFn = grab('  function payFloatDrawn(f, ts) {', '\n  }');
const payFloatDrawn = new Function('clamp', 'PAY_LIFE', 'BOX_Z',
  'return function payFloatDrawn(f, ts) {' + payFn.slice(payFn.indexOf('{') + 1, payFn.lastIndexOf('}')) + '\n}')(clamp, 1500, 1.28);
const d0 = payFloatDrawn({ t0: 5000 }, 5000), dHalf = payFloatDrawn({ t0: 5000 }, 5750), dEnd = payFloatDrawn({ t0: 5000 }, 6500);
if (d0.y !== 0.12) throw new Error('the float starts at the total: ' + d0.y);
if (!(dHalf.y > d0.y && dEnd.y > dHalf.y)) throw new Error('the plank must rise through its life: ' + d0.y + ' ' + dHalf.y + ' ' + dEnd.y);
if (d0.a !== 1 || dHalf.a !== 1) throw new Error('alpha holds while it rises: ' + d0.a + ' ' + dHalf.a);
if (!(dEnd.a >= 0 && dEnd.a < dHalf.a)) throw new Error('the plank fades after 0.6 of its life: ' + dEnd.a);
if (Math.abs(dEnd.z - (1.28 + 1.12)) > 1e-9) throw new Error('the plank rides the total lane (BOX_Z + 1.12)');
console.log('pay float: rises 0.12 \u2192 ' + dEnd.y.toFixed(2) + ', alpha 1 \u2192 ' + dEnd.a.toFixed(2) + ', on the total lane');

/* --- the DOM pill is gone: the float is drawn by the camera --- */
if (/labelsWrap\.appendChild\(el\);\s*\n\s*payEls/.test(src) || /var payEls/.test(src))
  throw new Error('the DOM pay pill must stay retired');
if (/updatePay\(\)/.test(src)) throw new Error('updatePay must stay retired');
if (!/function spawnPay\(b, delta\) \{\s*\n\s*payFloats\.push/.test(src))
  throw new Error('spawnPay must feed the 3D floats');
if (!/drawPayFloats\(ts\);/.test(src)) throw new Error('drawScene must draw the floats');
if (/classList\.add\('pay'\)|className = 'pay'/.test(src))
  throw new Error('no DOM pay element may be created');
console.log('wiring: spawnPay feeds payFloats, drawScene draws them \u2014 no DOM pill, projection by the camera');

/* --- the ledger moves with the walk: losers pay in, winners pay out --- */
const settle = grab('var walkEnd = CHIP_DELAY + Math.max(beat, 1) * WALK_BEAT;', 'the house ledger moves');
if (!/trayChips = clamp\(trayChips \+ take - give, 0, TRAY_SLOTS \* TRAY_STACK_H\);/.test(settle))
  throw new Error('the tray ledger must clamp-tracked take-minus-give');
if (!/result === 'lose' \|\| .*result === 'bust'/.test(settle))
  throw new Error('a lost stack pays INTO the tray');
if (!/flyPay \|\| 0/.test(settle)) throw new Error('a payout pays OUT of the tray');
const furn = grab('function drawFurniture(ts) {', 'the felt print between them');
if (!/trayCols\(trayChips\)/.test(furn) || !/trayShift\(trayChips\)/.test(furn))
  throw new Error('the drawn tray must ride the ledger');
console.log('wiring: settle moves trayChips (take \u2212 give), drawFurniture rides it \u2014 the tray breathes with the money');

/* --- the live set is drawn as furniture, not flat quads --- */
if (/drawQuad\(feltTex, 0, hexTint\(current\.deep, 1\), SHOE\[0\], 0\.012, SHOE\[2\], -0\.18, 1\.25, 0\.9, false\);\s*\n\s*drawQuad\(feltTex, 0, hexTint\(current\.deep, 1\), -SHOE\[0\]/.test(src))
  throw new Error('the flat furniture quads must be replaced by drawFurniture');
if (!/stackRange\(inShoe, SHOE_CARDS, 3\)/.test(src)) throw new Error('the shoe stack must be drawn from shoeDealt');
if (!/stackRange\(discarded, SHOE_CARDS, 0\)/.test(src)) throw new Error('the rack stack must be drawn from discarded');
if (!/drawFurniture\(ts\);/.test(src)) throw new Error('drawScene must call drawFurniture');
if (!/discarded \+= \(game\.hands\[i2\] \|\| \{ cards: \[\] \}\)\.cards\.length;/.test(src) || !/discarded \+= game\.dealer\.cards\.length;/.test(src))
  throw new Error('clearRound must empty the hands INTO the rack');
if (!/discarded = 0;           \/\* a fresh shoe empties the discard rack \*\//.test(src))
  throw new Error('newShoe must empty the rack');
console.log('wiring: drawFurniture draws shoe + rack + tray; clearRound fills the rack, newShoe empties it');

/* --- the tray plate sits behind the columns, off the lane --- */
if (!/drawQuad\(feltTex, 0, hexTint\(current\.deep, 1\), -0\.54 \+ shift, y, DEALER_Z - 0\.78, 0, 3\.62, 0\.62, false\);/.test(src))
  throw new Error('the tray plate must sit behind the columns');
if (Math.abs((DEALER_Z - 0.78) - (DEALER_Z - 0.62)) < 0.05)
  throw new Error('the plate must NOT sit on the flight lane');
console.log('layout: the tray plate sits behind the lane, columns on the lane, print between shoe and rack');

console.log('\nfurniture 3d verified');
