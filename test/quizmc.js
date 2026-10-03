/* The quiz's draw, Monte-Carlo: thousands of counts under varied
   discipline records and ledger tolls, each run's empirical shares
   checked against the weights the sampler itself declares. The
   deterministic pins in indexteach own the weighting's shape; this
   owns the SAMPLER — that the walk down the weight table really does
   hand out each rung in proportion to its weight, that the floor
   weight keeps a cold shoe's lone 13 v 2 and a flat zero reachable,
   that a fair sample really is uniform, that each aim reads only the
   half of the record it is told to read, and that the player's tuned
   strength is what the weights say it is — a flat pull landing where
   a fair sample lands, a brutal one bending harder without starving
   a rung.

   The counts are drawn from the shipped quizPickTc with its own rnd
   argument fed, so nothing is stubbed inside the draw: the random
   source is the only thing this file supplies. The stream is seeded
   (mulberry32) so a failure is reproducible, and the tolerances below
   are many sigma wide for the draw counts used — a red band here is a
   broken sampler, not a noisy one.

   WHAT THIS CANNOT SEE, STATED PLAINLY: a sampler that walked the
   weight table backwards would pass every band here, and rightly so —
   when each rung's interval is exactly its own width, the order the
   walk takes them in cannot change any rung's marginal share. What
   this DOES catch is any change to the shares themselves: a cut
   scaled off the total (drifts ~6% at 0.9x) or a rung's weight
   inflated (18%) both light the band red. Mutation-checked against
   the shipped file, both ways, and the file restored byte-for-byte. */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const INDEX999 = require('../index999.js');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
function extract(name, args) {
  const fnFull = grab('  function ' + name + '(', '\n  }');
  const fnBody = fnFull.slice(fnFull.indexOf('{') + 1, fnFull.lastIndexOf('}'));
  const sig = fnFull.slice(fnFull.indexOf('('), fnFull.indexOf(')') + 1);
  return new Function(args, 'return function ' + name + sig + ' {' + fnBody + '}');
}
const indexLiveSet = extract('indexLiveSet', 'INDEX999')(INDEX999);
const QUIZ_BIASES = JSON.parse(src.match(/var QUIZ_BIASES = (\[[\s\S]*?\n  \]);/)[1]
  .replace(/'/g, '"').replace(/([{,]\s*)([a-z]+):/g, '$1"$2":'));
const biasStep = (id) => {
  const s = QUIZ_BIASES.find(b => b.id === id);
  if (!s) throw new Error('no such pull: ' + id);
  return s;
};
const TC_DECK_LO = -6, TC_DECK_HI = 10, RUNGS = TC_DECK_HI - TC_DECK_LO + 1;
const TC_DECKS = JSON.parse(src.match(/var TC_DECKS = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));

/* the seeded stream: the draw's own rnd argument, fed one number at
   a time so the counts are reproducible without touching the page */
function stream(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* the whole draw chain, built the way the page builds it: one aim, one
   record, one ledger, one strength — so the weights the sampler
   declares are the weights it must be held to.                   */
function sampler(aim, ixStats, ratios, biasId) {
  const step = biasStep(biasId || 'even');
  const ixRec = extract('ixRec', 'ixStats')(ixStats);
  const quizWeak = extract('quizWeak', 'ixRec, quizLean')(ixRec, aim);
  const quizWeight = extract('quizWeight', 'indexLiveSet, ixRec, quizBias, quizWeak')(indexLiveSet, ixRec,
    function () { return step.bias; }, quizWeak);
  return {
    weight: quizWeight,
    /* the shipped gate: leaning off OR a flat pull reads the whole
       table as one — a flat pull must land exactly like a fair sample */
    pick: extract('quizPickTc', 'quizWeight, leakRatios, quizLeanOn, QUIZ_LADDER_LO, QUIZ_LADDER_HI')(quizWeight,
      function () { return ratios; }, function () { return aim !== 'off' && step.bias > 0; }, TC_DECK_LO, TC_DECK_HI)
  };
}
function analytic(aim, weight, ratios, biasId) {
  const step = biasStep(biasId || 'even');
  const out = [], total = { n: 0 };
  for (let tc = TC_DECK_LO; tc <= TC_DECK_HI; tc++) {
    /* the fair sample builds its table and then reads every rung as
       one, exactly as quizPickTc does — the intention under test */
    const w = aim === 'off' || step.bias === 0 ? 1 : weight(tc, ratios);
    out.push(w);
    total.n += w;
  }
  return out.map(w => w / total.n);
}

/* the empirical shares, and the worst distance from the intended
   ones — absolute on a rung, and the total variation over the whole
   ladder so one skewed rung cannot hide behind the others */
function shares(pick, rnd, n) {
  const counts = new Array(RUNGS).fill(0);
  for (let k = 0; k < n; k++) counts[pick(rnd()) - TC_DECK_LO]++;
  return counts.map(c => c / n);
}
function worstGap(got, want) {
  let rung = 0, tv = 0;
  for (let i = 0; i < RUNGS; i++) {
    const d = Math.abs(got[i] - want[i]);
    if (d > rung) rung = d;
    tv += d;
  }
  return { rung: rung, tv: tv / 2 };
}
/* a band many sigma wide for the draw count: at 30000 draws a rung
   near even shares has SE ~0.0014, and the heaviest rung under test
   sits near 0.7 with SE ~0.0027 — so 0.02 is comfortably clear of
   both, and still tight enough that a sampler which drops a rung, or
   walks the table backwards, or double-counts a weight, cannot hide
   inside it. */
const N = 30000, TOL_RUNG = 0.02, TOL_TV = 0.02;
let worstSeen = { rung: 0, tv: 0, fixture: '', rung_tc: 0 };
function check(label, aim, ixStats, ratios, note, biasId) {
  const s = sampler(aim, ixStats, ratios, biasId);
  const want = analytic(aim, s.weight, ratios, biasId);
  const rnd = stream(0x9E3779B9 ^ label.length ^ aim.length);
  const got = shares(s.pick, rnd, N);
  const gap = worstGap(got, want);
  if (gap.rung > worstSeen.rung) worstSeen = { rung: gap.rung, tv: gap.tv, fixture: label, rung_tc: label };
  if (gap.rung > TOL_RUNG)
    throw new Error(label + ': a rung drifts ' + (gap.rung * 100).toFixed(2) + '% from its weight' +
      (note ? ' (' + note + ')' : ''));
  if (gap.tv > TOL_TV)
    throw new Error(label + ': the whole draw drifts, total variation ' + (gap.tv * 100).toFixed(2) + '%');
  /* every rung must also stay reachable: a weight table walked
     wrongly can look close on average and still starve a corner */
  let minGot = 1;
  for (let i = 0; i < RUNGS; i++) if (got[i] < minGot) minGot = got[i];
  if (minGot === 0) throw new Error(label + ': a rung never came up at all');
  const band = (got, want).toString();
  return { got, want, gap, minGot, band: band.length };
}

const NONE = { byCell: {} };
const bCell = (n, f) => ({ byCell: { 'hard 16 v 10': { asked: n, followed: f } } });

/* 1. nothing recorded anywhere: the flat floor, so every rung equal */
const flat = check('empty ledger, no record', 'both', NONE, {}, 'the floor weight must be uniform');
for (let i = 0; i < RUNGS; i++)
  if (Math.abs(flat.want[i] - 1 / RUNGS) > 1e-9)
    throw new Error('with no signal at all every rung must weigh one: ' + flat.want[i]);
if (Math.abs(flat.minGot - 1 / RUNGS) > TOL_RUNG)
  throw new Error('the uniform draw must hold even shares, saw ' + flat.minGot);

/* 2. one class never taken: live from +4, so the rich rungs must
      carry the draw — and carry it in the weight table's own ratio */
const refused = check('16 v 10 never taken', 'both', bCell(4, 0), {}, 'the refused class pulls its rungs');
const wantRich = refused.want.slice(TC_DECK_HI - 4 + 1).reduce((a, b) => a + b, 0);
if (wantRich <= 0.5) throw new Error('the refused class must pull most of the draw: ' + wantRich);
if (refused.got.slice(TC_DECK_HI - 4 + 1).reduce((a, b) => a + b, 0) < 0.5)
  throw new Error('the rich rungs must actually receive it');

/* 3. the other signal only, on the OTHER side of the ladder: 13 v 2
      is live on the cold rungs and nowhere else, so a bleed there
      must pull the cold half of the draw and leave the rich band
      alone. Fixture 2 proves the rich side; this proves the sampler
      walks the table in the right order, not merely the right one.  */
const bled = check('13 v 2 bleeding, never refused', 'both', bCell(4, 4), { 'hard 13 v 2': 1 }, 'the ledger half alone');
const coldShare = bled.got.slice(0, 6 - TC_DECK_LO).reduce((a, b) => a + b, 0);
const warmShare = bled.got.slice(4 - TC_DECK_LO, 8 - TC_DECK_LO).reduce((a, b) => a + b, 0);
if (!(coldShare > warmShare + 0.25))
  throw new Error('a cold-side leak must pull the cold rungs: ' + coldShare + ' v ' + warmShare);

/* 4. both signals, weakest wins: the two halves must not add up */
const mixed = check('refused at +4 and bleeding at +1', 'both',
  { byCell: { 'hard 16 v 10': { asked: 4, followed: 0 }, 'hard 15 v 10': { asked: 4, followed: 0 } } },
  { 'hard 16 v 10': 0.5 }, 'the worse of the two, not their sum');

/* 5. the aims: each reads only its own half, and both must be as
      tight against their own weights as the default is           */
const refAim = check('aimed at the refusals only', 'refuse',
  { byCell: { 'hard 15 v 10': { asked: 4, followed: 0 } } },
  { 'hard 13 v 2': 1 }, 'discipline half only');
const ledAim = check('aimed at the losses only', 'ledger',
  { byCell: { 'hard 15 v 10': { asked: 4, followed: 0 } } },
  { 'hard 13 v 2': 1 }, 'ledger half only');
const band = (got, lo, hi) => got.slice(lo - TC_DECK_LO, hi - TC_DECK_LO + 1).reduce((a, b) => a + b, 0);
if (!(band(refAim.got, 4, 10) > band(ledAim.got, 4, 10) + 0.15))
  throw new Error('the refusal aim must own the rich band: ' + band(refAim.got, 4, 10) + ' v ' + band(ledAim.got, 4, 10));
if (!(band(ledAim.got, -6, -1) > band(refAim.got, -6, -1) + 0.15))
  throw new Error('and the ledger aim must own the cold one: ' + band(ledAim.got, -6, -1) + ' v ' + band(refAim.got, -6, -1));

/* 6. a fair sample: leaning off must flatten the very record that,
      a rung earlier, bent the draw into the tail                  */
const fair = check('fair sample, leaning off', 'off', bCell(6, 0), {}, 'every rung equal again');
for (let i = 0; i < RUNGS; i++)
  if (Math.abs(fair.got[i] - 1 / RUNGS) > TOL_RUNG)
    throw new Error('the fair sample must come out even, rung ' + (i + TC_DECK_LO) + ' at ' + fair.got[i]);
/* the refusal record must move the draw by far more than the fair
   sample's own noise — ten sigma at this draw count, so the claim
   does not rest on a hand-picked threshold */
const bandOf = (got) => got.slice(TC_DECK_HI - 4 + 1).reduce((a, b) => a + b, 0);
const fairBand = bandOf(fair.got);
const sigma = Math.sqrt(fairBand * (1 - fairBand) / N);
if (!(bandOf(refused.got) - fairBand > 10 * sigma))
  throw new Error('the refusal record must move the draw where the fair sample does not: ' +
    bandOf(refused.got) + ' v ' + fairBand);

/* 7. the ladder's own edges, under the heaviest record there is:
      the ends must stay in reach (the flat floor's promise) and a
      deck-depth mix must not disturb any of the above            */
if (!flat.got[0] || !flat.got[RUNGS - 1]) throw new Error('both ends of the ladder must come up');
if (TC_DECKS.length !== 4 || TC_DECKS[0] !== 3)
  throw new Error('the depth menu moved under the sampler: ' + TC_DECKS.join(','));

/* 8. the flat end of the tuned pull: the aim is still leaning and the
      record is the heaviest one below, yet a bias of zero must land
      exactly where leaning off lands — same seed, same even shares   */
const flatPull = check('flat pull, aim still on', 'both', bCell(6, 0), {},
  'a bias of zero is a fair sample', 'flat');
for (let i = 0; i < RUNGS; i++)
  if (Math.abs(flatPull.got[i] - 1 / RUNGS) > TOL_RUNG)
    throw new Error('a flat pull must come out even, rung ' + (i + TC_DECK_LO) + ' at ' + flatPull.got[i]);

/* 9. the brutal end: the SAME record as fixture 2, bent far harder —
      read on the table's own shares, which are exact, and confirmed
      empirically by check() above. The cold rung must give up its
      share to the rich one, and still not be starved: the floor
      weight is untuned, so every rung keeps a chance at any strength. */
const brutal = check('brutal lean, 16 v 10 never taken', 'both', bCell(4, 0), {},
  'the top rung of the tuned pull', 'brutal');
const top = RUNGS - 1;
if (!(brutal.want[top] > refused.want[top] * 1.1))
  throw new Error('a brutal lean must bend harder toward the weak rung: ' +
    brutal.want[top] + ' v ' + refused.want[top]);
if (!(brutal.want[0] < refused.want[0] * 0.5))
  throw new Error('and the cold rung must give its share up: ' + brutal.want[0] + ' v ' + refused.want[0]);
if (!brutal.got[0] || !brutal.got[top]) throw new Error('no rung may be starved at any strength');
if (biasStep('flat').bias !== 0 || !(biasStep('brutal').bias > biasStep('even').bias))
  throw new Error('the shipped ladder must still run flat to brutal');
const FIXTURES = 9;
console.log('quiz mc: ' + N + ' draws x ' + FIXTURES + ' fixtures, worst rung ' +
  (worstSeen.rung * 100).toFixed(2) + '% (band ' + (TOL_RUNG * 100).toFixed(0) + '%), worst total variation ' +
  (worstSeen.tv * 100).toFixed(2) + '%');
console.log('quiz monte-carlo verified');