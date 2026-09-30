/* True-count training math: decksLeft, trueCount and the
   bet spread, extracted exactly as shipped and driven through
   real shoes — composition, floors and the spread table.      */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

const grab = (a, b) => {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
};
const S9 = (0, eval)('(' + grab('  var SHOE999 = (function () {', '})();').replace('var SHOE999 = ', '').replace(/;\s*$/, '') + ')');

const countBlock =
  grab('  function decksLeft()', 'return tc <= 1 ? 1 : Math.min(6, tc - 1);\n  }');
const M = new Function('shoeArr', 'hiLo', 'phase', countBlock +
  '; return { decksLeft, trueCount, spreadUnits };');

const HILO = { '2':1,'3':1,'4':1,'5':1,'6':1,'7':0,'8':0,'9':0,'10':-1,'J':-1,'Q':-1,'K':-1,'A':-1 };

/* --- mid-shoe: 52 of 104 cards dealt --- */
let shoe = S9.build(2), rc = 0, dealt = 0;
while (dealt < 52) { rc += (HILO[shoe.pop().rank] || 0); dealt++; }
let m = M(shoe, rc, 'betting');
console.log('after 52 of 104: decks', m.decksLeft().toFixed(2), '| rc', rc, '| tc', m.trueCount());
if (Math.abs(m.decksLeft() - 1) > 1e-9) throw new Error('decksLeft wrong');
if (m.trueCount() !== Math.round(rc / 1)) throw new Error('tc wrong');

/* --- the near-empty floor: 0.25 dk = 13 cards --- */
let s2 = S9.build(2); while (s2.length > 14) s2.pop();      /* 14 cards = 0.269 dk */
let m2 = M(s2, 5, 'betting');
if (Math.abs(m2.decksLeft() - 14 / 52) > 1e-9) throw new Error('floor fired early: ' + m2.decksLeft());
let s3 = S9.build(2); while (s3.length > 12) s3.pop();      /* 12 cards = 0.231 dk */
let m3 = M(s3, 5, 'betting');
if (m3.decksLeft() !== 0.25) throw new Error('floor: ' + m3.decksLeft());
if (m3.trueCount() !== 20) throw new Error('tc floor: ' + m3.trueCount());
console.log('rack floor: decks never divide below 0.25 (rc 5 -> tc 20 at the empty rack)');

/* --- the bet-spread table --- */
const su = m3.spreadUnits;
const expect = { '-2': 1, '0': 1, '1': 1, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 6, '12': 6 };
for (const k in expect) {
  if (su(Number(k)) !== expect[k]) throw new Error('spread ' + k + ' -> ' + su(Number(k)) + ', want ' + expect[k]);
}
console.log('spreadUnits: 1 unit below tc 2, tc−1 above, capped at 6 — table exact');

/* --- end-to-end: rc of the whole shoe, tc at the floor, 200 shoes --- */
for (let s = 0; s < 200; s++) {
  const sh = S9.build(2); let r = 0;
  for (let i = 0; i < 104; i++) r += (HILO[sh.pop().rank] || 0);
  const mm = M([], r, 'betting');
  if (mm.trueCount() !== Math.round(r / 0.25)) throw new Error('end-of-shoe tc');
}
console.log('200 shoes: running-count sums and floor true counts hold');
console.log('\ntrue-count training math verified');
