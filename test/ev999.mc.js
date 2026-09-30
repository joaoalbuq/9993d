/* EV999 ground truth, take two: Monte-Carlo the floor's exact
   rules (infinite deck, S17, European no-peek) with REAL
   two-card hands. For each (total, soft) class the trial
   samples an actual rank pair of that class; stand plays no
   cards, hit draws once then continues by the engine's own
   hit/stand policy, double draws once and settles at double
   stake — no further draws, as a real double works.          */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

const evStart = src.indexOf('var EV999 = (function () {');
const evEnd = src.indexOf('})();', evStart) + 5;
const EV999 = eval(src.slice(evStart, evEnd) + '\nEV999;');

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const val = (r) => r === 'A' ? 11 : (r === '10' || r === 'J' || r === 'Q' || r === 'K') ? 10 : parseInt(r, 10);
const draw = () => RANKS[(Math.random() * 13) | 0];
const card = (r) => ({ rank: r, suit: 0 });

function best(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { if (c.rank === 'A') { aces++; t += 11; } else t += val(c.rank); }
  while (t > 21 && aces) { t -= 10; aces--; }
  return { total: t, soft: aces > 0 };
}

/* all rank PAIRS (as a class) whose best total is t with the given softness */
const pairCache = {};
function pairsFor(t, soft) {
  const key = t + '|' + (soft ? 1 : 0);
  if (pairCache[key]) return pairCache[key];
  const out = [];
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      const b = best([card(RANKS[i]), card(RANKS[j])]);
      if (b.total === t && b.soft === soft) out.push([RANKS[i], RANKS[j]]);
    }
  }
  pairCache[key] = out;
  return out;
}

/* dealer: S17, European natural check on the hole card —
   the hole card stays in the hand when it is not a natural   */
function dealerPlay(up) {
  const cards = [card(up)];
  if (up === 'A' || val(up) === 10) {
    const h = draw();
    if (best(cards.concat([card(h)])).total === 21) return 'natural';
    cards.push(card(h));
  }
  for (;;) {
    const b = best(cards);
    if (b.total >= 17) return b;
    cards.push(card(draw()));
  }
}

function settle(pCards, stake, dealer) {
  const p = best(pCards);
  if (p.total > 21) return 0;
  if (dealer === 'natural') return 0;
  if (p.total === 21 && pCards.length === 2) return stake * 2.5;   /* the player natural */
  const d = dealer.total;
  if (d > 21 || p.total > d) return stake * 2;
  if (p.total === d) return stake;
  return 0;
}

function continueByEngine(cards, up) {
  for (;;) {
    const b = best(cards);
    if (b.total >= 21) return cards;
    const p = EV999.prices(b.total, b.soft, up, false);
    if (p.hit > p.stand) cards.push(card(draw())); else return cards;
  }
}

function scenario(t, soft, up, action, n) {
  const pairs = pairsFor(t, soft);
  if (!pairs.length) return null;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const pr = pairs[(Math.random() * pairs.length) | 0];
    const start = [card(pr[0]), card(pr[1])];
    if (best(start).total === 21) { i--; continue; }   /* a natural is no decision —
                                                          the coach never prices one;    */
    let stake = 1, pCards;
    if (action === 'double') {
      stake = 2;
      pCards = start.concat([card(draw())]);
      if (best(pCards).total > 21) continue;      /* bust: nothing back */
      sum += settle(pCards, stake, dealerPlay(up));
    } else if (action === 'hit') {
      pCards = start.concat([card(draw())]);
      if (best(pCards).total > 21) continue;
      dealer = dealerPlay(up);
      pCards = continueByEngine(pCards, up);
      sum += settle(pCards, stake, dealer);
    } else {                                      /* stand */
      sum += settle(start, stake, dealerPlay(up));
    }
  }
  return sum / n;
}
let dealer = null;

/* exact recursive dealer distribution for comparison — an
   INDEPENDENT implementation (written fresh, ace-count model) */
function exactDealerDist(up) {
  const d = {};
  function step(t, aces, nc, p) {
    if (t >= 17) { const k = nc === 2 && t === 21 ? 'natural' : String(t); d[k] = (d[k] || 0) + p; return; }
    for (const r of RANKS) {
      let t2 = t + val(r), a2 = aces;
      if (r === 'A') a2++;
      while (t2 > 21 && a2) { t2 -= 10; a2--; }
      if (t2 > 21) d['bust'] = (d['bust'] || 0) + p / 13;
      else step(t2, a2, nc + 1, p / 13);
    }
  }
  step(val(up), up === 'A' ? 1 : 0, 1, 1);
  return d;
}

/* ---- dealer distribution audit: engine vs exact ---- */
let distWorst = 0;
for (const up of ['A', '10', '6', '2']) {
  const eng = EV999.dealerDist(up);
  const ex = exactDealerDist(up);
  const engBust = eng.bust || 0, exBust = ex.bust || 0;
  const engNat = eng['21|2'] || 0, exNat = ex.natural || 0;
  console.log(`up ${up}: bust eng ${(engBust).toFixed(4)} / exact ${(exBust).toFixed(4)} | natural eng ${engNat.toFixed(4)} / exact ${exNat.toFixed(4)}`);
  distWorst = Math.max(distWorst, Math.abs(engBust - exBust), Math.abs(engNat - exNat));
  /* final-total masses must line up too — the engine keys
     finals as 'total|cardcount', so aggregate by total first   */
  const engByTotal = {};
  for (const k in eng) {
    if (k === 'bust' || k === '21|2') continue;
    const t = k.split('|')[0];
    engByTotal[t] = (engByTotal[t] || 0) + eng[k];
  }
  const finals = new Set([...Object.keys(engByTotal), ...Object.keys(ex).filter(k => k !== 'bust' && k !== 'natural')]);
  for (const k of finals) {
    const e2 = engByTotal[k] || 0, x2 = ex[k] || 0;
    distWorst = Math.max(distWorst, Math.abs(e2 - x2));
  }
}
console.log('dealer distribution worst gap:', distWorst.toFixed(5));
if (distWorst > 1e-9) throw new Error('engine dealer distribution differs from exact recursion');

/* ---- pricing audit: engine vs simulation ---- */
const N = 120000;
const cases = [
  { t: 16, soft: false, up: '10' },
  { t: 16, soft: false, up: 'A' },
  { t: 12, soft: false, up: '2' },
  { t: 12, soft: false, up: '4' },
  { t: 11, soft: false, up: '6' },
  { t: 11, soft: false, up: 'A' },
  { t: 10, soft: false, up: 'A' },
  { t: 18, soft: true, up: '9' },
  { t: 18, soft: true, up: '2' },
  { t: 18, soft: true, up: '6' },
  { t: 20, soft: false, up: '6' },
  { t: 13, soft: false, up: '5' }
  /* soft 21 in two cards IS the natural class — the round is
     over, no decision exists, the coach never prices it        */
];
let worst = 0;
for (const c of cases) {
  const p = EV999.prices(c.t, c.soft, c.up, true);
  const simS = scenario(c.t, c.soft, c.up, 'stand', N);
  const simH = scenario(c.t, c.soft, c.up, 'hit', N);
  const simD = scenario(c.t, c.soft, c.up, 'double', N);
  /* the sim measures stake-INCLUSIVE returns; the engine prices
     PROFIT — net the staked unit(s) out before comparing         */
  const prS = simS - 1, prH = simH - 1, prD = simD - 2;
  const eS = Math.abs(prS - p.stand), eH = Math.abs(prH - p.hit);
  const eD = p.double == null ? 0 : Math.abs(prD - p.double);
  worst = Math.max(worst, eS, eH, eD);
  console.log(
    `${c.soft ? 'soft' : 'hard'} ${String(c.t).padStart(2)} v ${c.up.padEnd(2)}: ` +
    `stand ${p.stand.toFixed(3)}/${prS.toFixed(3)}  hit ${p.hit.toFixed(3)}/${prH.toFixed(3)}  ` +
    `dbl ${p.double == null ? '  -  ' : p.double.toFixed(3) + '/' + prD.toFixed(3)}  ` +
    `err ${Math.max(eS, eH, eD).toFixed(4)}`
  );
}
console.log('worst |sim - engine|:', worst.toFixed(4), `(${N} trials/action, noise ~0.005)`);
if (worst > 0.015) throw new Error('engine pricing deviates from simulation beyond noise');
console.log('\nEV999 Monte-Carlo ground truth: pricing matches the floor rules');
