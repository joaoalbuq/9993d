/* SHOE999 drift guard + canon behavior.
   The canon block must stay byte-identical in table-16x9.html
   and offline.html — this test fails if either copy drifts.   */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const canon = fs.readFileSync(path.join(__dirname, 'shoe999.canon.js'), 'utf8');
const BEGIN = '  /* ==== SHOE999 canon';          /* with its indent */
const END = '/* ==== SHOE999 end ==== */\n';   /* with its newline */

function canonFrom(file) {
  const s = fs.readFileSync(path.join(root, file), 'utf8');
  const i = s.indexOf(BEGIN), j = s.indexOf(END);
  assert.ok(i >= 0 && j > i, file + ': canon block present');
  return s.slice(i, j + END.length);
}

/* ---- the copies are the canon, byte for byte ---- */
assert.strictEqual(canonFrom('table-16x9.html'), canon, 'table copy drifted');
assert.strictEqual(canonFrom('offline.html'), canon, 'practice copy drifted');
console.log('drift guard: canon byte-identical in both pages');

/* ---- evaluate the canon exactly as shipped ---- */
const SHOE999 = eval(canon + '\nSHOE999;');
assert.ok(SHOE999 && SHOE999.build && SHOE999.settle, 'canon evaluates');

/* build: composition exact for any deck count */
for (const decks of [1, 2, 4, 6]) {
  const a = SHOE999.build(decks);
  assert.strictEqual(a.length, decks * 52, 'shoe size');
  const seen = {};
  for (const c of a) {
    const k = c.rank + ':' + c.suit;
    seen[k] = (seen[k] || 0) + 1;
    assert.ok(typeof c.suit === 'number' && c.suit >= 0 && c.suit <= 3, 'suit is a real index');
  }
  assert.strictEqual(Object.keys(seen).length, 52, 'all 52 (rank,suit) pairs');
  for (const k in seen) assert.strictEqual(seen[k], decks, 'each pair exactly ' + decks + 'x: ' + k);
}
console.log('build: composition exact at 1/2/4/6 decks');

/* value: totals and softs, both field name conventions */
const V = (r, i) => ({ rank: r, suit: i == null ? 0 : i });
assert.strictEqual(SHOE999.total([V('A'), V('K')]), 21);
assert.strictEqual(SHOE999.value([V('A'), V('K')]).soft, true);
assert.strictEqual(SHOE999.total([V('A'), V('A'), V('9')]), 21);
assert.strictEqual(SHOE999.value([V('A'), V('5')]).soft, true);
assert.strictEqual(SHOE999.value([V('A'), V('5'), V('9')]).soft, false);  /* the ace has turned */
assert.strictEqual(SHOE999.total([V('10'), V('9'), V('6')]), 25);
assert.strictEqual(SHOE999.total([V('A'), V('A'), V('A'), V('8')]), 21);
assert.strictEqual(SHOE999.total([V('J'), V('Q'), V('K')]), 30);
assert.strictEqual(SHOE999.total([V('2'), V('3'), V('4')], 'rank'), 9);
console.log('value: totals and soft flags exact');

/* settle: the floor's one rule */
const D = (r) => ({ rank: r, suit: 0 });
const S = (you, dealer, stake) => SHOE999.settle(you, dealer, stake);

/* bust takes it */
assert.deepStrictEqual(pick(S([V('10'), V('9'), V('5')], [D('10'), D('7')], 25)),
  { kind: 'bust', mult: 0, prize: 0, net: -25 });
/* plain win 2:1 */
assert.deepStrictEqual(pick(S([V('10'), V('9')], [D('10'), D('7')], 25)),
  { kind: 'win', mult: 2, prize: 50, net: 25 });
/* push returns */
assert.deepStrictEqual(pick(S([V('10'), V('9')], [D('10'), D('9')], 25)),
  { kind: 'push', mult: 1, prize: 25, net: 0 });
/* player natural 3:2 */
assert.deepStrictEqual(pick(S([V('A'), V('K')], [D('10'), D('9')], 25)),
  { kind: 'blackjack', mult: 2.5, prize: 62.5, net: 37.5 });
/* dealer natural takes it (European: no peek, the hand is lost) */
assert.deepStrictEqual(pick(S([V('10'), V('9')], [D('A'), D('K')], 25)),
  { kind: 'lose', mult: 0, prize: 0, net: -25 });
/* naturals cancel */
assert.deepStrictEqual(pick(S([V('A'), V('K')], [D('A'), D('Q')], 25)),
  { kind: 'push', mult: 1, prize: 25, net: 0 });
/* dealer bust, player stands */
assert.deepStrictEqual(pick(S([V('10'), V('8')], [D('10'), D('6'), D('10')], 25)),
  { kind: 'win', mult: 2, prize: 50, net: 25 });
/* a natural beats a dealer 21 made from 3+ cards */
assert.deepStrictEqual(pick(S([V('A'), V('J')], [D('7'), D('7'), D('7')], 25)),
  { kind: 'blackjack', mult: 2.5, prize: 62.5, net: 37.5 });
console.log('settle: bust/win/push/natural/dealer-natural exact');

/* chips: the money edge — integer chips, house rounds up */
assert.strictEqual(SHOE999.chips(50), 50);
assert.strictEqual(SHOE999.chips(62.5), 63);
assert.strictEqual(SHOE999.chips(37.5), 38);
assert.strictEqual(SHOE999.chips(0), 0);
console.log('chips: naturals round up to whole chips (62.5 -> 63)');

/* cutBetween: bounds hold */
for (let i = 0; i < 5000; i++) {
  const c = SHOE999.cutBetween(208, 0.75, 0.85);
  assert.ok(c >= 156 && c <= 177, 'cut ' + c + ' inside 156..177');
}
console.log('cutBetween: 5000 draws inside 75-85% bounds');

function pick(st) { return { kind: st.kind, mult: st.mult, prize: st.prize, net: st.net }; }

console.log('\nSHOE999 canon: all checks green');
