/* The index sheet: the count's plays taught in the open — every
   flip the coach can make, where it flips and why, the spread,
   and which of them are LIVE at this very count. The live line
   is the property under test: liveness matches the canon's own
   flip rule at the threshold and a step past it in both
   directions, the spread's unit rides the same spreadUnits the
   settle judges by, and the pre-cross hint teaches the cell's
   own index while the chart still holds.                  */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- the canon: the shipped module itself, not a page copy --- */
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
const fmtCountM = src.match(/function fmtCount\(n\) \{ return[^\n]*\}/);
if (!fmtCountM) throw new Error('fmtCount one-liner not found');
const fmtCount = new Function('n', fmtCountM[0].slice(fmtCountM[0].indexOf('{') + 1, -1) + '\nreturn fmtCount;');
const spreadUnits = extract('spreadUnits', '')();
const indexLiveLine = extract('indexLiveLine', 'INDEX999, fmtCount, spreadUnits')(INDEX999, fmtCount, spreadUnits);

/* --- liveness at the thresholds: cold, flat, warm, rich --- */
const cold = indexLiveLine(-2);
if (!/True -2 now \u2014 bet 1 unit/.test(cold)) throw new Error('cold bet: ' + cold);   /* fmtCount signs negatives ASCII */
if (!/live: hard 13 v 2 \u2192 hit/.test(cold)) throw new Error('the below-index must be live in the cold: ' + cold);
if (/insurance on/.test(cold)) throw new Error('insurance is off in the cold');
const flat = indexLiveLine(0);
if (!/no index is live \u2014 the chart rules/.test(flat)) throw new Error('at flat nothing may be live: ' + flat);
const warm = indexLiveLine(2);
if (!/bet 1 unit/.test(warm)) throw new Error('the spread holds 1 until past +1: ' + warm);
for (const cell of ['hard 16 v 10', 'hard 12 v 2', 'hard 12 v 3', 'hard 11 v A', 'hard 9 v 2'])
  if (!warm.includes(cell + ' \u2192 ' + (cell === 'hard 11 v A' || cell === 'hard 9 v 2' ? 'double' : 'stand')))
    throw new Error('the +1 and +2 indices must be live at true +2: ' + warm);
if (warm.includes('hard 15 v 10')) throw new Error('15 v 10 waits for +4');
const rich = indexLiveLine(5);
if (!/bet 4 units/.test(rich)) throw new Error('the spread is the count minus one, capped: ' + rich);
if (!/hard 15 v 10 \u2192 stand/.test(rich) || !/hard 10 v 10 \u2192 double/.test(rich))
  throw new Error('the +4 indices must be live at true +5: ' + rich);
if (!/insurance on/.test(rich)) throw new Error('insurance is on past +3');
console.log('live line: liveness matches the canon at both edges \u2014 cold, flat, warm, rich');

/* --- the sheet: every index, the why, the spread, the explainer --- */
for (const cell of Object.keys(INDEX999.INDICES))
  if (!src.includes("'<b>' + c + '</b>")) throw new Error('the sheet must render the canon');
if (!src.includes('INS_WHY_IN +')) throw new Error('the insurance row must carry its why');
if (!src.includes('The count\\u2019s plays')) throw new Error('the sheet\u2019s title');
if (!/running count \\u00f7 decks left/.test(src)) throw new Error('the sheet must teach the conversion');
if (!/the count minus one, six at the top/.test(src)) throw new Error('the sheet must teach the spread ladder');
if (!/class="leaks idx" id="indexBox"/.test(src) || !/\.idx b \{ color: #d8b56a; \}/.test(src))
  throw new Error('the sheet element and its gold styling');
if (!/renderIndexSheet\(\);              \/\* the teach sheet follows the live count \*\//.test(src))
  throw new Error('the sheet must follow the live count');
if (!/btnIndex.{0,40}addEventListener\('click', toggleIndex\)/.test(src))
  throw new Error('the Index pill must toggle the sheet');
console.log('the sheet: all nine rows, the whys, the ladder and the conversion \u2014 gold-inked, live-updating');

/* --- the pre-cross hint: the cell's own index taught while the chart holds --- */
const near = grab('    if (!lastFlip) {', 'lastNear = { cell: INDEX999.cell(t, soft, up), tc: trueCount(),');
if (!near.includes("INDEX999.INDICES[INDEX999.cell(t, soft, up)]")) throw new Error('lastNear must read the canon');
if (!/ixn.play === 'double' && !canD/.test(near)) throw new Error('an illegal double\u2019s index is not taught as the play');
const hint = grab("      : 'Book: ' + capWord(lastBook)", "fmtCount(lastNear.tc) + ')'");
if (!/its index ' \+ lastNear\.play \+ 's at true '/.test(hint))
  throw new Error('the hint must name the cell\u2019s index');
if (!/lastNear\.below \? fmtCount\(lastNear\.at\) \+ ' or lower'/.test(hint))
  throw new Error('below-indices must read as a floor');
if ((src.match(/    lastNear = null;/g) || []).length < 2)
  throw new Error('lastNear must reset with the mark');
console.log('the hint: "Book: Hit \u2014 its index stands at true +1 (now \u22122)" \u2014 taught before it fires');

/* --- the quiz's live set: the same rule as the line, as data --- */
const indexLiveSet = extract('indexLiveSet', 'INDEX999')(INDEX999);
for (const [tc, want, not] of [
  [-2, ['hard 13 v 2'], ['hard 16 v 10', 'hard 15 v 10', 'hard 11 v A']],
  [0, [], ['hard 13 v 2', 'hard 16 v 10']],
  [2, ['hard 16 v 10', 'hard 12 v 2', 'hard 12 v 3', 'hard 11 v A', 'hard 9 v 2'], ['hard 15 v 10', 'hard 10 v 10']],
  [5, ['hard 16 v 10', 'hard 15 v 10', 'hard 10 v 10', 'hard 12 v 3'], ['hard 13 v 2']]
]) {
  const live = indexLiveSet(tc);
  for (const c of want) if (!live[c]) throw new Error(c + ' must be live at true ' + tc);
  for (const c of not) if (live[c]) throw new Error(c + ' must NOT be live at true ' + tc);
}
console.log('quiz live set: the canon\u2019s flip rule as data \u2014 cold, flat, warm, rich');

/* --- indexQuizScore: the grade, per card and across cards --- */
const indexQuizScore = extract('indexQuizScore', 'INDEX999, spreadUnits, QUIZ_MISS_COST')(INDEX999, spreadUnits, 25);
{
  const live2 = indexLiveSet(2);
  const g = indexQuizScore({ 'hard 16 v 10': 1, 'hard 12 v 2': 1, 'hard 12 v 3': 1,
    'hard 11 v A': 1, 'hard 9 v 2': 1 }, live2, 2, 5, 5, 1, 2);
  if (!g.all) throw new Error('a perfect card must grade clean \u2014 ' + JSON.stringify(g));
  if (!/a clean card/.test(g.split)) throw new Error('a clean card must say so');
  const part = indexQuizScore({ 'hard 16 v 10': 1, 'hard 12 v 2': 1 }, live2, 2, 2, 2, 1, 2);
  if (part.all) throw new Error('naming 2 of 5 live plays is not clean');
  if (/\+ /.test(part.split)) throw new Error('a partial card over-named nothing: ' + part.split);
  if (!/hard 12 v 3 \u00b7 hard 11 v A \u00b7 hard 9 v 2/.test(part.split))
    throw new Error('the split must name what was missed: ' + part.split);
  const b = indexQuizScore({ 'hard 16 v 10': 1, 'hard 15 v 10': 1, 'hard 12 v 3': 1 }, live2, 2, 3, 2, 1, 2);
  if (b.all) throw new Error('a miss must not grade clean');
  if (!/\+ hard 15 v 10/.test(b.split) || !/hard 12 v 2/.test(b.split) || !/hard 11 v A/.test(b.split))
    throw new Error('the split must name the misses both ways: ' + b.split);
  const i = indexQuizScore({ 'insurance v ace': 1 }, live2, 2, 1, 0, 1, 2);
  if (!/insurance v ace/.test(i.split) || /\+ insurance v ace/.test(i.split))
    throw new Error('a premature insurance must be named as missed: ' + i.split);
}
console.log('indexQuizScore: missed + over-named + premature insurance \u2014 all named, both ways');

/* --- the conversion is asked at a depth: running count ÷ decks left
       is the other half of the skill, and the card now tests it --- */
if (!/var TC_DECKS = \[3, 4, 5, 6\];/.test(src) || !/function quizTcQ\(\)/.test(src))
  throw new Error('the card must state a running count and a deck depth');
if (!/q: quizTcQ\(\),/.test(src) || !/tcSay: null,/.test(src))
  throw new Error('the card must carry the question and the player\u2019s answer');
{
  /* the floor's own rule is Math.round(rc / dk) — the ask must land
     on its OWN truth under that rule, and that truth is drawn apart
     from the count the card plays at, which the card prints in full */
  const quizTcQ = extract('quizTcQ', 'TC_DECKS')([3, 4, 5, 6]);
  let sawRich = false, sawCold = false, sawApart = false;
  for (let n = 0; n < 400; n++) {
    const q = quizTcQ();
    const cardTc = 10 - (n % 17);
    if (q.rc % q.dk === 0) throw new Error('the division must carry a remainder: ' + JSON.stringify(q));
    if (Math.round(q.rc / q.dk) !== q.cq)
      throw new Error('the ask must round to its own truth: ' + JSON.stringify(q));
    if (q.dk < 3 || q.dk > 6) throw new Error('a depth outside the menu: ' + q.dk);
    if (q.cq < -6 || q.cq > 10) throw new Error('a quotient outside the ladder: ' + q.cq);
    if (q.cq !== cardTc) sawApart = true;
    if (q.rc > 0) sawRich = true; else sawCold = true;
  }
  if (!sawRich || !sawCold) throw new Error('both signs must be exercised');
  if (!sawApart) throw new Error('the division must not be the card\u2019s own printed count');
}
if (!/Running count ' \+ fmtCount\(indexQuiz\.q\.rc\) \+ ' with ' \+ indexQuiz\.q\.dk/.test(src))
  throw new Error('the sheet must ask the division in running count and depth');
if (!/data-tc="\' \+ tv/.test(src) || !/indexQuiz\.tcSay === tv/.test(src))
  throw new Error('the conversion must be tappable, and its pick marked');
if (!/indexQuizTc\(Number\(e\.target\.getAttribute\('data-tc'\)\)\)/.test(src))
  throw new Error('the tap must route to the conversion\u2019s own pick');
if (!/function indexQuizTc\(n\) \{[\s\S]{0,160}indexQuiz\.tcSay === n \? null : n/.test(src))
  throw new Error('a second tap on the same number must take it back');
{
  const live2 = indexLiveSet(2);
  const perfect = { 'hard 16 v 10': 1, 'hard 12 v 2': 1, 'hard 12 v 3': 1,
    'hard 11 v A': 1, 'hard 9 v 2': 1 };
  const rightTc = indexQuizScore(perfect, live2, 2, 6, 6, 1, 2);
  const wrongTc = indexQuizScore(perfect, live2, 2, 7, 6, 1, 4);
  if (wrongTc.all) throw new Error('a wrong conversion must break a clean card');
  if (!/4 named as the true count/.test(wrongTc.split) || /\+ 4 named/.test(wrongTc.split))
    throw new Error('a wrong quotient must be named as one, with no signed sum: ' + wrongTc.split);
  const coldTc = indexQuizScore(perfect, live2, -4, 6, 5, 1, -2);
  if (!/-2 named as the true count/.test(coldTc.split))
    throw new Error('a cold card must name its wrong quotient plainly: ' + coldTc.split);
  const blankTc = indexQuizScore(perfect, live2, 2, 6, 6, 1, null);
  if (blankTc.all) throw new Error('an unanswered conversion cannot grade clean');
  if (!/the true count left unanswered/.test(blankTc.split))
    throw new Error('saying nothing about the conversion must be said: ' + blankTc.split);
  if (!/the conversion right/.test(rightTc.split))
    throw new Error('a clean card must say the conversion was read: ' + rightTc.split);
  const cellOfTc = extract('quizCellOf', '')();
  if (cellOfTc('+ 4 named as the true count') !== null)
    throw new Error('a conversion is not a class: ' + cellOfTc('+ 4 named as the true count'));
  if (cellOfTc('the true count left unanswered') !== null)
    throw new Error('a blank conversion is not a class either');
}
console.log('the conversion: +7 over 2 decks asked at a depth, graded right or named wrong');

/* --- the spread half: the card must now earn what it used to be told --- */
{
  const live2 = indexLiveSet(2);
  const perfect = { 'hard 16 v 10': 1, 'hard 12 v 2': 1, 'hard 12 v 3': 1,
    'hard 11 v A': 1, 'hard 9 v 2': 1 };
  /* true +2 is worth 1 unit \u2014 right plays, right stake: clean */
  const right = indexQuizScore(perfect, live2, 2, 6, 6, 1, 2);
  if (!right.all) throw new Error('right plays at the right units is a clean card: ' + right.split);
  if (!/the spread right/.test(right.split))
    throw new Error('a clean card must name the spread as read: ' + right.split);
  if (right.stakeCost !== 0) throw new Error('the right spread costs nothing: ' + right.stakeCost);
  /* under-staked: +2 is worth 1, betting 4 is the over-named shape */
  const over = indexQuizScore(perfect, live2, 2, 6, 6, 4, 2);
  if (over.all) throw new Error('over-staking must break a clean card');
  /* the wrong spread is priced: +2 is worth 1 unit, staking 4 put up 3
     units the count never called for — three boxes of chips, named */
  if (over.stakeCost !== 75) throw new Error('an over-stake must be priced in chips: ' + over.stakeCost);
  if (!/\+ 4 units staked \u221275/.test(over.split))
    throw new Error('the price must ride the split: ' + over.split);
  if (!/\+ 4 units staked/.test(over.split))
    throw new Error('an over-stake must be named as over-named: ' + over.split);
  /* under-staked at a rich count: +5 is worth 4, betting 1 is short */
  const rich = indexLiveSet(5);
  const richPicks = { 'hard 16 v 10': 1, 'hard 15 v 10': 1, 'hard 12 v 2': 1,
    'hard 12 v 3': 1, 'hard 11 v A': 1, 'hard 10 v 10': 1, 'hard 9 v 2': 1, 'insurance v ace': 1 };
  const short = indexQuizScore(richPicks, rich, 5, 8, 8, 1, 5);
  if (short.all) throw new Error('staked a unit at true +5 must not grade clean');
  if (!/1 unit staked/.test(short.split) || /\+ 1 unit/.test(short.split))
    throw new Error('a short stake reads as missed, never over-named: ' + short.split);
  /* chips left down are chips too: true +5 is worth 4 units, so 1
     leaves 3 unbet — priced, not named alone */
  if (short.stakeCost !== 75) throw new Error('a short stake must be priced too: ' + short.stakeCost);
  if (!/1 unit staked \u221275/.test(short.split))
    throw new Error('the short stake must carry its price: ' + short.split);
  /* saying nothing is not a wrong stake, it is an unanswered one \u2014 and
     an unanswered half cannot grade clean */
  const silent = indexQuizScore(perfect, live2, 2, 5, 5, null, 2);
  if (silent.stakeCost !== 0) throw new Error('an unanswered spread is not a priced wrong one: ' + silent.stakeCost);
  if (/staked/.test(silent.split)) throw new Error('an unanswered stake is not a wrong one: ' + silent.split);
  if (!/the spread left unanswered/.test(silent.split))
    throw new Error('the split must name the half left unanswered: ' + silent.split);
  if (silent.all) throw new Error('but a card with no units named is not clean either');
  /* the cap: the ladder stops at six however rich the count runs */
  if (spreadUnits(99) !== 6) throw new Error('the ladder still caps at six: ' + spreadUnits(99));
}
if (!/var SPREAD_TOP = spreadUnits\(99\);/.test(src))
  throw new Error('the units row must offer the ladder\u2019s own rungs, read off the ladder');
if (!/for \(u = 1; u <= SPREAD_TOP; u\+\+\)/.test(src) || !/data-units="\' \+ u/.test(src))
  throw new Error('the card must render one tappable rung per unit');
if (!/Units the spread lays here: /.test(src) || !/which plays are LIVE, and what is the count worth\?/.test(src))
  throw new Error('the card must ask for the units, not print the stake');
if (/riding on it/.test(src)) throw new Error('the card must no longer give the stake away');
if (!/the spread lays \' \+ indexQuiz\.stake/.test(src))
  throw new Error('the grade must reveal what the spread would have laid');
if (!/if \(indexQuiz\.units != null\) \{/.test(src) ||
    !/if \(indexQuiz\.units === spreadUnits\(indexQuiz\.tc\)\) correct\+\+;/.test(src))
  throw new Error('the stake must count as one answer, right or wrong');
if (!/if \(stake != null && stake !== su\)/.test(src))
  throw new Error('an unanswered stake must not be graded as a wrong one');
if (!/var noUnits = stake == null;/.test(src) || !/&& !wrong\.length && !noUnits/.test(src))
  throw new Error('a card with the spread unanswered can never grade clean');
if (!/indexQuiz\.units = indexQuiz\.units === n \? null : n;/.test(src) ||
    !/indexQuizStake\(Number\(e\.target\.getAttribute\('data-units'\)\)\)/.test(src))
  throw new Error('a tap must set the stake, a second on it take it back');
if (!/\.idx \.quizstake \.pick\.on \{ color: #43c98a;/.test(src) ||
    !/\.idx \.quizpicks span\.on \{ color: #d8b56a;/.test(src))
  throw new Error('a named stake must read green, the plays gold');
console.log('the spread half: +2 is worth 1 unit \u2014 over- and under-stakes both named, and the card no longer tells');

/* --- the wiring: taps, grades, the fresh deal, the score line --- */
if (!/var indexQuiz = null;/.test(src)) throw new Error('the quiz must start asleep');
if (!/stake: spreadUnits\(tc\)/.test(src))
  throw new Error('the card must ride the spread\u2019s stake');
if (!/score: quizStats \};\s+\/\* the remembered score itself, not a copy \*\//.test(src))
  throw new Error('a card must score against the remembered score, not a fresh pair');
if (!/var tc = quizPickTc\(\);/.test(src))
  throw new Error('the card must draw the ladder through the weighted pick');
if (!/var QUIZ_LADDER_LO = -6, QUIZ_LADDER_HI = 10;/.test(src))
  throw new Error('the ladder is named once, \u22126 to +10, for the draw and for the sheet');
if (!/var lo = QUIZ_LADDER_LO, hi = QUIZ_LADDER_HI, tc, weights = \[\], total = 0, cut;/.test(src))
  throw new Error('the weighted pick must walk that same whole ladder');
if (!/<span class="pick' \+ \(on \? ' on" data-on="1' : ''\) \+ '" data-cell="' \+ k2 \+ '">/.test(src))
  throw new Error('the quiz must render a tappable span per class');
if (!/data-cell="insurance v ace"/.test(src)) throw new Error('insurance must be pickable by name');
if (!/indexQuizPick\(e\.target\.getAttribute\('data-cell'\), !e\.target\.getAttribute\('data-on'\)\)/.test(src))
  throw new Error('a tap must toggle the pick');
if (!/e\.target\.getAttribute\('data-act'\) === 'new' \) indexQuizNew\(\)/.test(src) &&
    !/data-act.*'new'/.test(src)) throw new Error('the fresh tap must deal a new count');
if (!/indexQuizGrade\(\)/.test(src)) throw new Error('the lock must grade');
if (!/if \(!indexQuiz\.counted\)/.test(src) || !/a re-lock replaces its earlier grade/.test(src))
  throw new Error('a card scores once; a re-lock replaces its earlier grade');
if (!/Score: ' \+ indexQuiz\.score\.clean \+ '\/' \+ indexQuiz\.score\.asked/.test(src))
  throw new Error('the score must ride the sheet \u2014 clean cards out of cards graded');
if (!/data-act="new">quiz me/.test(src))
  throw new Error('the teach sheet must offer the quiz');
console.log('quiz wiring: picks toggle, the lock grades, a fresh count deals, the score rides the sheet');

/* --- the gold rows: live rows wear the flip as the count moves --- */
if (!/var liveNow = countingOn \? indexLiveSet\(trueCount\(\)\) : \{\};/.test(src))
  throw new Error('the teach rows must read liveness from the live count, gated on counting');
if (!/\'<li\' \+ \(liveNow\[c\] \? \' class="live"\' : \'\'\)/.test(src))
  throw new Error('each hand row must wear class=live when its threshold is crossed');
if (!/countingOn && trueCount\(\) >= INDEX999\.INSURE_AT \? \' class="live"\'/.test(src))
  throw new Error('the insurance row must gold out past +3');
if (!/\(liveNow\[c\] \? \'\\u25B8 \' : \'\'\)/.test(src))
  throw new Error('a live row must carry the flip marker');
if (!/\.idx li\.live \{ color: #d8b56a; \}/.test(src))
  throw new Error('the live row must read gold');
if (!/renderIndexSheet\(\);              \/\* the teach sheet follows the live count \*\//.test(src))
  throw new Error('the gold must refresh with the count, not only on toggle');
console.log('gold rows: a row goes gold with the \u25B8 the count it crosses, refreshed every count');

/* --- index discipline: following the count play, judged apart --- */
if (!/var ixStats = \{ asked: 0, followed: 0, byCell: \{\} \};/.test(src))
  throw new Error('index discipline must start at zero, split by cell');
if (!/'999\.practice\.ixstats'/.test(src) || !/function saveIx\(\)/.test(src))
  throw new Error('index discipline must persist apart from the coach score');
if (!/if \(ix && ix !== play\) \{/.test(src))
  throw new Error('a flip only counts when it truly contradicts the chart');
if (!/if \(lastFlip\) \{[\s\S]{0,220}ixStats\.asked\+\+;[\s\S]{0,60}if \(ok\) ixStats\.followed\+\+;[\s\S]{0,260}saveIx\(\);/.test(src))
  throw new Error('a hand decision over a live flip must feed the discipline, followed or not');
if (!/insBook\.play === 'insure'\) \{[\s\S]{0,200}ixStats\.asked\+\+;[\s\S]{0,60}if \(ok\) ixStats\.followed\+\+;/.test(src))
  throw new Error('the count\u2019s insurance bet is an index ask like any other');
if (!/ixStats\.asked \? ixStats\.followed \+ '\/' \+ ixStats\.asked/.test(src) ||
    !/\\u00b7 ix ' \+ ixF/.test(src))
  throw new Error('the count pill must carry the follow rate as asked/followed');
if (!/count plays followed ' \+ ixStats\.followed \+ '\/' \+ ixStats\.asked/.test(src))
  throw new Error('the sheet must spell the discipline out beside the live line');
console.log('index discipline: flips judged apart \u2014 asked when the count speaks, followed or not, on pill and sheet');

/* --- the sitting's own fold: the same rate, scoped to the shoe --- */
if (!/noteIxSit\(lastFlip\.cell, ok\);/.test(src) ||
    !/noteIxSit\('insurance v ace', ok\);/.test(src))
  throw new Error('both ask sites must also feed the sitting tally');
if (!/var ixSit = \{ asked: 0, followed: 0, byCell: \{\} \};/.test(src) ||
    !/if \(!ixSit\.asked\) return '';/.test(src) || !/if \(!cell\) return;/.test(src))
  throw new Error('the sitting tally starts empty, ignores an unnamed ask, and stays quiet until the count speaks');
if (!/ixSitTag\(r3\.cell\)/.test(src) || !/ixSit\.followed \+ '\/' \+ ixSit\.asked/.test(src))
  throw new Error('the scorecard must carry the sitting follow rate, per cell and in total');
{
  const sit = { asked: 0, followed: 0, byCell: {} };
  const noteIxSit = extract('noteIxSit', 'ixSit')(sit);
  const ixSitTag = extract('ixSitTag', 'ixSit')(sit);
  const ixSitWeak = extract('ixSitWeak', 'ixSit')(sit);
  const ixSitLine = extract('ixSitLine', 'ixSit, ixSitWeak')(sit, ixSitWeak);
  if (ixSitTag('hard 16 v 10') !== '') throw new Error('an unasked cell wears no chip');
  if (ixSitWeak() !== null) throw new Error('no asks, no weakest cell');
  if (ixSitLine() !== '') throw new Error('a sitting where the count never spoke says nothing about discipline');
  noteIxSit('hard 16 v 10', true);
  noteIxSit('hard 16 v 10', true);
  noteIxSit('hard 15 v 10', false);
  noteIxSit('hard 12 v 3', true);
  noteIxSit('hard 12 v 3', false);
  noteIxSit('', false);
  if (sit.asked !== 5 || sit.followed !== 3)
    throw new Error('the sitting tally counts asked and followed: ' + JSON.stringify(sit));
  if (ixSitTag('hard 16 v 10') !== ' \u00b7 ix 2/2')
    throw new Error('a taken cell reads its own record: ' + ixSitTag('hard 16 v 10'));
  if (ixSitTag('hard 12 v 3') !== ' \u00b7 ix 1/2')
    throw new Error('a refused cell reads its own record: ' + ixSitTag('hard 12 v 3'));
  const w = ixSitWeak();
  if (!w || w.cell !== 'hard 15 v 10' || w.asked !== 1 || w.followed !== 0 || w.rate !== 0)
    throw new Error('the weakest cell is the one refused most: ' + JSON.stringify(w));
  const line = ixSitLine();
  if (!/^<p class="drillnow">Index discipline: 3\/5 followed/.test(line))
    throw new Error('the panel line opens with the sitting\u2019s own rate: ' + line);
  if (!/weakest hard 15 v 10 0\/1/.test(line))
    throw new Error('the panel names the sitting\u2019s weakest cell: ' + line);
  /* a cell taken every time is no blind spot, and once 15 v 10 is
     followed the weakest reads live again \u2014 12 v 3 at half */
  noteIxSit('hard 15 v 10', true);
  noteIxSit('hard 15 v 10', true);
  const w2 = ixSitWeak();
  if (!w2 || w2.cell !== 'hard 12 v 3' || Math.abs(w2.rate - 0.5) > 1e-9)
    throw new Error('the weakest re-reads live, and a recovered cell steps aside: ' + JSON.stringify(w2));
  const allTaken = { asked: 2, followed: 2, byCell: { 'hard 16 v 10': { asked: 2, followed: 2 } } };
  const takenLine = extract('ixSitLine', 'ixSit, ixSitWeak')(
    allTaken, extract('ixSitWeak', 'ixSit')(allTaken))();
  if (!/every play taken/.test(takenLine))
    throw new Error('a sitting that took every play says so: ' + takenLine);
  if (!/ixHtml = ixSitLine\(\);/.test(src) || !/scHtml \+ luckHtml \+ ixHtml \+ evHtml;/.test(src))
    throw new Error('the panel must ride the scorecard with the discipline line beside it');
}
console.log('sitting discipline: 3/5 folded into the review \u2014 a per-cell ix chip and a total, weakest named');

/* --- the follow rate split by cell: the aggregate hides a cell you
       always take beside one you always miss \u2014 the per-cell
       record names both, tinted green taken, red never --- */
const IX = { asked: 6, followed: 4, byCell: {
  'hard 16 v 10': { asked: 3, followed: 3 },
  'hard 15 v 10': { asked: 2, followed: 0 },
  'hard 9 v 2': { asked: 1, followed: 1 },
  'hard 12 v 2': { asked: 2, followed: 0 },
  'soft 18 v 6': { asked: 0, followed: 0 }
} };
const ixRec = extract('ixRec', 'ixStats')(IX);
const ixTag = extract('ixTag', 'ixStats, ixRec, leaks')(IX, ixRec, {});
const ixTally = extract('ixTally', 'ixStats, ixRec')(IX, ixRec);
const ixSpread = extract('ixSpread', 'ixStats, ixTally')(IX, ixTally);
if (!ixRec('hard 16 v 10') || ixRec('hard 16 v 10').followed !== 3)
  throw new Error('a cell\u2019s record reads off the split');
if (ixRec('soft 18 v 6') !== null || ixRec('nope') !== null)
  throw new Error('a cell never offered (or unknown) has no record');
if (!/class="ixrec all"/.test(ixTag('hard 16 v 10')) || !/>3\/3</.test(ixTag('hard 16 v 10')))
  throw new Error('a cell you always take reads all, 3/3: ' + ixTag('hard 16 v 10'));
if (!/class="ixrec never ixtap" data-cell="hard 15 v 10"/.test(ixTag('hard 15 v 10')) || !/>0\/2</.test(ixTag('hard 15 v 10')))
  throw new Error('a cell you always miss reads never, 0/2, one-tap: ' + ixTag('hard 15 v 10'));
if (ixTag('soft 18 v 6') !== '' || ixTag('nope') !== '')
  throw new Error('a cell with no record carries no tag');
const tally = ixTally();
if (tally.take !== 2 || tally.never !== 2 || tally.part !== 0)
  throw new Error('the tally counts cells by their record: ' + JSON.stringify(tally));
if (ixSpread() !== ' \u00b7 you take 2 \u00b7 never 2')
  throw new Error('the footer clause names the split: ' + JSON.stringify(ixSpread()));
if (!/ixStats\.byCell\[lastFlip\.cell\]/.test(src) ||
    !/ixStats\.byCell\['insurance v ace'\]/.test(src))
  throw new Error('both a hand flip and the insurance ask must log their cell');
if (!/' \\u00b7 ' \+ ix\.why \+ ixTag\(c\) \+ '<\/li>'/.test(src))
  throw new Error('each index row must carry its own record');
if (!/ixSpread\(\) \+ quizScoreLine\(\) \+ '<\/p>'/.test(src))
  throw new Error('the sheet footer must name the split, and the quiz score beside it');
if (!/\.idx \.ixrec\.all \{ color: #43c98a; \}/.test(src) ||
    !/\.idx \.ixrec\.never \{ color: #e2705f; \}/.test(src))
  throw new Error('taken reads green, never red');
console.log('follow rate by cell: you take 16 v 10 3/3, never 15 v 10 0/2 — the total’s blind spots named');

/* --- the never record is the one-tap: the sheet drills its own cell ---
       the count play you always miss hands itself to the drill, the same
       forced hand the leak rows serve; a master’s record reads, never taps */
if (!/class="ixrec never ixtap" data-cell="' \+ cell \+ '" role="button" tabindex="0"/.test(src))
  throw new Error('a never record must carry the tap control and its cell');
if (!/never followed \\u2014 tap to drill it: the shoe stacks this cell on the next hand/.test(src))
  throw new Error('the tap must say what it does');
if (!/cls !== 'never' \|\| \(leaks\[cell\] && leaks\[cell\]\.m\)/.test(src))
  throw new Error('only a never record that still stands may be a tap target');
const ixTagM = extract('ixTag', 'ixStats, ixRec, leaks')(IX, ixRec, { 'hard 15 v 10': { m: 1 } });
if (!/class="ixrec never"/.test(ixTagM('hard 15 v 10')) || /ixtap/.test(ixTagM('hard 15 v 10')))
  throw new Error('a master left the drill: its record must not tap: ' + ixTagM('hard 15 v 10'));
const ixClick = grab("document.getElementById('indexBox').addEventListener('click'", "  });");
if (!/contains\('ixtap'\)[\s\S]*?var dc = e\.target\.getAttribute\('data-cell'\);[\s\S]*?drillNow\(dc\)/.test(ixClick))
  throw new Error('the sheet must hand the tapped cell to the drill');
if (!/the ledger holds nothing to stack/.test(ixClick))
  throw new Error('a ledger-less tap must say so, not vanish');
const ixKeys = grab("document.getElementById('indexBox').addEventListener('keydown'", "  });");
if (!/Enter/.test(ixKeys) || !/Spacebar/.test(ixKeys) ||
    !/drillNow\(t\.getAttribute\('data-cell'\), t\.classList && t\.classList\.contains\('ixdrill'\)\)/.test(ixKeys))
  throw new Error('the tap must answer the keyboard too');
if (!/\.idx \.ixrec\.ixtap \{ cursor: pointer; text-decoration: underline dotted; \}/.test(src))
  throw new Error('the tappable record must look tappable');
console.log('never record one-tap: 15 v 10 0/2 drills from the sheet, master and empty ledger refuse');

/* --- the weighted draw: the quiz leans to the cells you refuse --- */
/* the shipped strength ladder, read out of the page itself so these
   pins cannot drift from the rungs the player actually walks */
const QUIZ_BIASES = JSON.parse(src.match(/var QUIZ_BIASES = (\[[\s\S]*?\n  \]);/)[1]
  .replace(/'/g, '"').replace(/([{,]\s*)([a-z]+):/g, '$1"$2":'));
const biasAt = function (id) {
  const s = QUIZ_BIASES.find(function (b) { return b.id === id; });
  if (!s) throw new Error('no such pull: ' + id);
  return function () { return s.bias; };
};
const WEAK = { asked: 9, followed: 3, byCell: {
  'hard 15 v 10': { asked: 3, followed: 0 },   /* never taken: live only at +4 and up */
  'hard 12 v 3':  { asked: 3, followed: 0 },   /* never taken: live at +2 and up */
  'hard 16 v 10': { asked: 3, followed: 3 }    /* always taken: live at +1 and up */
} };
const wRec = extract('ixRec', 'ixStats')(WEAK);
const wLive = extract('indexLiveSet', 'INDEX999')(INDEX999);
const quizWeak = extract('quizWeak', 'ixRec, quizLean')(wRec, 'both');
const quizWeight = extract('quizWeight', 'indexLiveSet, ixRec, quizBias, quizWeak')(wLive, wRec, biasAt('even'), quizWeak);
const quizAim = extract('quizAim', 'indexLiveSet, ixRec, quizWeak')(wLive, wRec, quizWeak);
if (quizWeak('hard 15 v 10') !== 1 || quizWeak('hard 16 v 10') !== 0 || quizWeak('nope') !== 0)
  throw new Error('weakness reads 1 \u2212 followed/asked, and 0 for a cell with no record');
const emptyRec = extract('ixRec', 'ixStats')({ byCell: {} });
const emptyWeak = extract('quizWeak', 'ixRec, quizLean')(emptyRec, 'both');
const emptyWeight = extract('quizWeight', 'indexLiveSet, ixRec, quizBias, quizWeak')(wLive, emptyRec, biasAt('even'), emptyWeak);
if (emptyWeight(4) !== 1 || emptyWeight(0) !== 1 || emptyWeight(-6) !== 1)
  throw new Error('no record at all leaves every rung at the flat floor: ' + emptyWeight(4));
if (quizWeight(0) !== 1 || quizWeight(-2) !== 1)
  throw new Error('a rung that lights up no weak cell keeps the floor');
if (!(quizWeight(4) > quizWeight(1)))
  throw new Error('a rung that lights up a refused cell must outweigh a flat one');
let wSum = 0, wHigh = 0;
for (let tc = -6; tc <= 10; tc++) { const w = quizWeight(tc); wSum += w; if (tc >= 4) wHigh += w; }
if (!(wHigh / wSum > 0.5))
  throw new Error('the refused cell must pull more than half the draw to its rung: ' + wHigh / wSum);
if (quizAim(4) !== 'hard 15 v 10') throw new Error('the aim names the weakest live cell: ' + quizAim(4));
if (quizAim(1) !== null || quizAim(-2) !== null)
  throw new Error('a rung with no refused cell names no aim');
if (!/var aim = quizLeanOn\(\) \? quizAim\(tc, leakRatios\(\)\) : null;/.test(src) || !/' \\u00b7 drills ' \+ aim/.test(src))
  throw new Error('the quiz must name the cell it is drilling \u2014 when the leaning is on');
console.log('weighted draw: \u22126 and +10 still in reach, but a refused cell pulls +4 to 70% \u2014 the quiz aims itself');

/* --- the card says WHY it was dealt that count ------------------------
   The draw is built from the player's own weak cells, and the card
   used to print the number with the motive hidden \u2014 which is the one
   thing that makes a drawn card worth trusting. So the rung actually
   dealt names the plays live at it, how hard each pulls, and which
   record is pulling.                                                  */
if (!/function quizWhyLine\(\) \{/.test(src))
  throw new Error('the quiz card must be able to say why it drew this count');
if (!/quizWhyLine\(\) \+/.test(src))
  throw new Error('the reading must ride the card, above the picks it explains');
if (!/function quizWhyLine\(\)[\s\S]*?quizWeak\(k, ratios\)/.test(src))
  throw new Error('the reading must use the sampler\u2019s own weakness, or the card can flatter its own draw');
if (!/function quizWhyLine\(\)[\s\S]*?indexLiveSet\(tc\)/.test(src))
  throw new Error('the plays it lists must be the ones live at THAT count, not the whole ladder');
if (!/function quizWhyLine\(\)[\s\S]*?tc >= INDEX999\.INSURE_AT/.test(src))
  throw new Error('insurance is a play at this count too, and belongs in the reading');
/* ...run it, rather than match its markup */
function whyRun(o) {
  const rec = extract('ixRec', 'ixStats')({ byCell: (o.rec || {}) });
  const live = extract('indexLiveSet', 'INDEX999')(INDEX999);
  const weak = extract('quizWeak', 'ixRec, quizLean')(rec, o.lean || 'both');
  const line = extract('quizWhyLine',
    'indexQuiz, quizLeanOn, quizLean, leakRatios, indexLiveSet, ixRec, quizWeak, leaks, INDEX999')(
    { tc: o.tc }, () => o.leanOn !== false, o.lean || 'both', () => (o.ratios || {}), live, rec, weak,
    o.leaks || {}, INDEX999);
  return line();
}
/* a refused cell live at the dealt rung: named, with the share and the record behind it */
const why1 = whyRun({ tc: 4, rec: { 'hard 15 v 10': { asked: 3, followed: 0 },
  'hard 16 v 10': { asked: 3, followed: 3 } } });
if (!/Why this count: /.test(why1))
  throw new Error('the card must open by saying why: ' + why1);
if (!/<b>hard 15 v 10<\/b> <span class="ixweak">100%<\/span> \u2014 you took it 0 of 3 times it offered/.test(why1))
  throw new Error('a never-taken cell must be named with its share and its record: ' + why1);
if (/hard 16 v 10/.test(why1))
  throw new Error('a cell always taken is not a reason for this count: ' + why1);
/* a bleeding cell instead: named with what it has cost, not a bare number */
const why2 = whyRun({ tc: 1, ratios: { 'hard 12 v 2': 1 }, leaks: { 'hard 12 v 2': { n: 2, cost: 90 } } });
if (!/<b>hard 12 v 2<\/b> <span class="ixweak">100%<\/span> \u2014 it has cost you \u221290 chips/.test(why2))
  throw new Error('a bleeding cell must name its own chips: ' + why2);
/* the refusals \u2192 ledger switch decides which of the two speaks */
const whyRefuseOnly = whyRun({ tc: 1, lean: 'refuse', ratios: { 'hard 12 v 2': 1 },
  leaks: { 'hard 12 v 2': { n: 2, cost: 90 } } });
if (/hard 12 v 2/.test(whyRefuseOnly))
  throw new Error('aimed at the refusals, the ledger must not speak: ' + whyRefuseOnly);
const whyLedgerOnly = whyRun({ tc: 1, lean: 'ledger', rec: { 'hard 12 v 2': { asked: 3, followed: 0 } },
  ratios: {}, leaks: { 'hard 12 v 2': { n: 2, cost: 90 } } });
if (/hard 12 v 2/.test(whyLedgerOnly))
  throw new Error('aimed at the losses, the discipline record must not speak: ' + whyLedgerOnly);
/* and the quieter bleeding case reads calm, not alarmed */
const whyCalm = whyRun({ tc: 4, ratios: { 'hard 16 v 10': 0.2 }, leaks: { 'hard 16 v 10': { n: 1, cost: 20 } } });
if (!/class="ixweak calm">20%<\/span>/.test(whyCalm))
  throw new Error('a light pull must not be dressed as a red one: ' + whyCalm);
/* insurance is listed when the count turns it on, and only then */
if (!/insurance v ace/.test(whyRun({ tc: 3, rec: { 'insurance v ace': { asked: 2, followed: 0 } } })))
  throw new Error('at +3 the count\u2019s own bet is live, and must be listed');
if (/insurance v ace/.test(whyRun({ tc: 2, rec: { 'insurance v ace': { asked: 2, followed: 0 } } })))
  throw new Error('below +3 insurance is not live, and must not be listed');
/* the rung, not the ladder: a play that turns the OTHER way (13 v 2 is
   live at \u22121 or lower, and nowhere above +1) belongs to the reading
   only when the card landed on its side of the line.              */
const whyBelow = whyRun({ tc: -1, rec: { 'hard 13 v 2': { asked: 3, followed: 0 } } });
if (!/hard 13 v 2/.test(whyBelow))
  throw new Error('a play live at the dealt count must be listed: ' + whyBelow);
if (/hard 13 v 2/.test(whyRun({ tc: 10, rec: { 'hard 13 v 2': { asked: 3, followed: 0 } } })))
  throw new Error('a play the dealt count does not light up must not be listed');
if (/hard 13 v 2/.test(whyRun({ tc: 2, rec: { 'hard 13 v 2': { asked: 3, followed: 0 } } })))
  throw new Error('13 v 2 turns back above \u22121 \u2014 the card must not borrow it from another rung');
/* weakest first, and the tail says how many it kept back */
const many = whyRun({ tc: 4, rec: { 'hard 15 v 10': { asked: 4, followed: 0 },
  'hard 12 v 3': { asked: 4, followed: 1 }, 'hard 16 v 10': { asked: 4, followed: 2 },
  'hard 10 v 10': { asked: 4, followed: 3 }, 'hard 11 v A': { asked: 4, followed: 3 } } });
const order = many.indexOf('hard 15 v 10') < many.indexOf('hard 12 v 3') &&
  many.indexOf('hard 12 v 3') < many.indexOf('hard 16 v 10');
if (!order) throw new Error('the weakest cell must lead the reading: ' + many);
if (!/and 1 more leaning on you/.test(many))
  throw new Error('the tail must say what it left out, not quietly hide it: ' + many);
/* the two honest silences */
const whyFlat = whyRun({ tc: 4 });
if (!/Why this count: nothing leans it \u2014 no refusals, no tolls\. An honest rung\./.test(whyFlat))
  throw new Error('a rung nothing leans must say so outright: ' + whyFlat);
const whyFair = whyRun({ tc: 4, leanOn: false });
if (!/Why this count: a fair sample \u2014 nothing leans it, every rung equally\./.test(whyFair))
  throw new Error('a fair draw must say it is one, rather than invent a motive: ' + whyFair);
/* the tint is the sheet\u2019s own */
if (!/\.idx \.ixwhy \.ixweak \{ font-variant-numeric: tabular-nums; color: #e2705f; \}/.test(src) ||
    !/\.idx \.ixwhy \.ixweak\.calm \{ color: rgba\(255,255,255,0\.72\);/.test(src))
  throw new Error('the share must wear the sheet\u2019s own tints');
console.log('why this count: the live plays, each share named, and the record doing the pulling');

/* --- the aim is the player's, and the two signals come apart: the
       quiz can lean on what you REFUSE, on what you LOSE, on the worse
       of the two, or on nothing at all — a fair sample --- */
if (!/'999\.practice\.quizlean'/.test(src) || !/function setQuizLean\(on\)/.test(src))
  throw new Error('the leaning switch must persist under its own key');
if (!/var quizLean = 'both';/.test(src))
  throw new Error('the quiz leans on the worse of the two by default');
if (!/qlRaw\.on === 'boolean'\) quizLean = qlRaw\.on \? 'both' : 'off';/.test(src))
  throw new Error('the old on/off save must still read back whole');
if (!/QUIZ_AIMS\.every\(function \(a\) \{ return a\.id !== on; \}\) \|\| on === quizLean/.test(src))
  throw new Error('the switch must refuse an unknown aim and a no-op pick');
if (!/if \(!quizLeanOn\(\)\) w = 1;/.test(src))
  throw new Error('leaning off must read every rung at the flat one, in the pick itself');
if (!/var aim = quizLeanOn\(\) \? quizAim\(tc, leakRatios\(\)\) : null;/.test(src))
  throw new Error('a fair sample aims at nothing \u2014 no drills cell named');
{
  const AIMS = [{ id: 'both' }, { id: 'refuse' }, { id: 'ledger' }, { id: 'off' }];
  const setQuizLean = extract('setQuizLean', 'quizLean, saveQuizLean, QUIZ_AIMS')('both', function () {}, AIMS);
  if (setQuizLean(false) !== true || setQuizLean(false) !== false)
    throw new Error('the old boolean still switches, and refuses its no-op');
  const setQuizLean2 = extract('setQuizLean', 'quizLean, saveQuizLean, QUIZ_AIMS')('off', function () {}, AIMS);
  if (setQuizLean2('refuse') !== true || setQuizLean2('refuse') !== false)
    throw new Error('the aim fires once and refuses the no-op');
  if (setQuizLean2(true) !== true)
    throw new Error('the old true reads whole, from any aim');
  if (setQuizLean2('nope') !== false || setQuizLean2(3) !== false)
    throw new Error('an unknown aim must not move the switch');
}
const maker = function () {
  return extract('quizWeight', 'indexLiveSet, ixRec, quizBias, quizWeak')(wLive, wRec, biasAt('even'), quizWeak);
};
const flatPick = extract('quizPickTc', 'quizWeight, leakRatios, quizLeanOn, QUIZ_LADDER_LO, QUIZ_LADDER_HI')(
  maker(), function () { return {}; }, function () { return false; }, -6, 10);   /* leaning off: a fair sample */
const mid = flatPick(0.5);
if (mid < 0 || mid > 3)
  throw new Error('a uniform ladder must leave the middle rungs near half the draw: ' + mid);
if (flatPick(0.001) !== -6 || flatPick(0.999999) !== 10)
  throw new Error('a fair sample still spans the whole ladder, both ends in reach');
const leanPick = extract('quizPickTc', 'quizWeight, leakRatios, quizLeanOn, QUIZ_LADDER_LO, QUIZ_LADDER_HI')(
  maker(), function () { return {}; }, function () { return true; }, -6, 10);
if (!(leanPick(0.35) > flatPick(0.35)))
  throw new Error('the leaning draw must sit right of the fair one at the same cut: ' + leanPick(0.35) + ' vs ' + flatPick(0.35));
/* --- the signals pulled apart: refuse aims at the discipline half
       only, ledger at the bleeding half only, each blind to the other --- */
/* the ledger signal arrives as ratios, not as the ix record */
const RATIOS = { 'hard 16 v 10': 0.25 };   /* 16 v 10 bleeds a little; 15 v 10 never has */
const mkWeak = function (aim) {
  const w = extract('quizWeak', 'ixRec, quizLean')(wRec, aim);
  return function (cell, ratios) { return w(cell, ratios == null ? RATIOS : ratios); };
};
const refOnly = mkWeak('refuse');
const ledOnly = mkWeak('ledger');
const bothW = mkWeak('both');
if (bothW('hard 15 v 10') !== 1 || bothW('hard 16 v 10', {}) !== 0)
  throw new Error('sanity: the worse-of-two still reads both');
if (refOnly('hard 15 v 10') !== 1 || refOnly('hard 16 v 10', {}) !== 0)
  throw new Error('refuse aims at the discipline half: ' + refOnly('hard 15 v 10'));
if (ledOnly('hard 16 v 10') !== 0.25)
  throw new Error('ledger aims at the bleeding half, blind to discipline: ' + ledOnly('hard 16 v 10'));
if (ledOnly('hard 15 v 10') !== 0)
  throw new Error('a refused cell with no leak is no loss: ' + ledOnly('hard 15 v 10'));
if (!/var disc = quizLean !== 'ledger' && r \? 1 - r\.followed \/ r\.asked : 0;/.test(src) ||
    !/var leak = quizLean !== 'refuse' && ratios && ratios\[cell\] \? ratios\[cell\] : 0;/.test(src))
  throw new Error('each signal must be gated by the aim inside quizWeak itself');
const loseWeight = extract('quizWeight', 'indexLiveSet, ixRec, quizBias, quizWeak')(wLive, wRec, biasAt('even'), mkWeak('ledger'));
if (!(loseWeight(1) > loseWeight(0)))
  throw new Error('the losses must pull their own rich rung with discipline set aside: ' + loseWeight(1) + ' vs ' + loseWeight(0));
if (!/var QUIZ_AIMS = \[/.test(src) ||
    !/\{ id: 'both', label: 'leans to your weak cells' \}/.test(src) ||
    !/\{ id: 'refuse', label: 'leans to your refusals' \}/.test(src) ||
    !/\{ id: 'ledger', label: 'leans to your losses' \}/.test(src) ||
    !/\{ id: 'off', label: 'is a fair sample' \}/.test(src))
  throw new Error('the aim menu must name all four');
if (!/function quizLeanOn\(\) \{ return quizLean !== 'off' && quizBias\(\) > 0; \}/.test(src))
  throw new Error('the fair sample must stay a level of the aim, and a flat pull must read as one too');
if (!/data-act=\"lean\"/.test(src) || !/fair sample/.test(src) || !/leans to your weak cells/.test(src) ||
    !/leans to your refusals/.test(src) || !/leans to your losses/.test(src))
  throw new Error('the sheet must offer the switch, all four ways named');
const leanClick = grab("document.getElementById('indexBox').addEventListener('click'", "  });");
if (!/getAttribute\('data-act'\) === 'lean'[\s\S]*?setQuizLean\(aims\[\(aims\.indexOf\(quizLean\) \+ 1\) % aims\.length\]\)[\s\S]*?indexQuizNew\(\)/.test(leanClick))
  throw new Error('the tap must walk the aim and deal the fresh card at once');
console.log('aim switch: refuse, ledger, both, or a fair sample \u2014 the two lessons taught apart');

/* --- the STRENGTH of the pull: the player's, from a flat uniform draw
       up to a brutal lean, walked by tap beside the aim --- */
if (QUIZ_BIASES.length !== 5) throw new Error('the pull must run the whole way, five rungs: ' + QUIZ_BIASES.length);
if (QUIZ_BIASES[0].bias !== 0) throw new Error('the first rung must be a flat uniform draw');
if (QUIZ_BIASES.some(function (b, i) { return i && b.bias <= QUIZ_BIASES[i - 1].bias; }))
  throw new Error('every rung must pull harder than the one below it');
for (const b of QUIZ_BIASES)
  if (!b.label) throw new Error('each rung must name itself, or the chip cannot report it: ' + b.id);
if (QUIZ_BIASES[2].bias !== 1.5 || !/var quizBiasId = 'even';/.test(src))
  throw new Error('the default pull must stay the shipped 1.5, so an untouched save is unchanged');
/* the ladder is monotone in the weights themselves, and the floor
   never moves: a rung lighting up no weak cell weighs 1 at every step */
const wAt = (id) => extract('quizWeight', 'indexLiveSet, ixRec, quizBias, quizWeak')(wLive, wRec, biasAt(id), quizWeak);
let prev = null;
for (const b of QUIZ_BIASES) {
  const w = wAt(b.id);
  if (w(0) !== 1) throw new Error('the flat floor must survive every strength, rung ' + b.id + ' at ' + w(0));
  if (prev !== null && !(w(4) > prev)) throw new Error('a harder pull must weigh the rich rung more: ' + b.id);
  prev = w(4);
}
if (!(wAt('brutal')(4) > 3 * wAt('soft')(4)))
  throw new Error('the top rung must be a hard bend, not a nudge: ' + wAt('brutal')(4) + ' v ' + wAt('soft')(4));
/* the sampler must read the tuned strength, and a flat pull must read
   the whole table as one, exactly as leaning off does */
if (!/for \(k in live\) w \+= quizBias\(\) \* quizWeak\(k, ratios\);/.test(src))
  throw new Error('the weights must be built from the tuned strength');
if (!/function quizBias\(\) \{ return quizBiasStep\(\)\.bias; \}/.test(src) ||
    !/return QUIZ_BIASES\.find\(function \(b\) \{ return b\.id === quizBiasId; \}\) \|\| QUIZ_BIASES\[2\];/.test(src))
  throw new Error('the strength must read the rung the player chose');
if (!/if \(!quizLeanOn\(\)\) w = 1;/.test(src))
  throw new Error('a flat pull must come out even, like a fair sample');
/* the switch itself: walks the five, refuses its no-op and any rung
   that does not exist, and persists only a real move */
{
  const saved = [];
  const setQ = extract('setQuizBias', 'quizBiasId, saveQuizLean, QUIZ_BIASES')('even',
    function () { saved.push(1); }, QUIZ_BIASES);
  if (setQ('hard') !== true) throw new Error('a rung must take');
  if (setQ('hard') !== false) throw new Error('the rung already in force is a no-op');
  if (setQ('nope') !== false || setQ(3) !== false) throw new Error('an unknown rung must not move the pull');
  if (saved.length !== 1) throw new Error('only a real move persists');
}
/* persisted beside the aim, and an older save still reads whole */
if (!/JSON\.stringify\(\{ aim: quizLean, bias: quizBiasId \}\)/.test(src))
  throw new Error('the strength must persist beside the aim');
if (!/QUIZ_BIASES\.some\(function \(b\) \{ return b\.id === qlRaw\.bias; \}\)/.test(src) ||
    !/if \(qlRaw && typeof qlRaw\.on === 'boolean'\) quizLean = qlRaw\.on \? 'both' : 'off';/.test(src))
  throw new Error('an older save, with no strength of its own, must read back whole');
/* the tap: the chip names the rung in force and the one after it in
   words that hold in either direction (the walk wraps), and walking it
   deals at once so the pull is heard on the next draw */
if (!/<span class="quiznew" data-act="bias">\\u00b7 the pull ' \+ quizBiasStep\(\)\.label \+\s*\n\s*' \\u2014 tap for one that ' \+/.test(src))
  throw new Error('the sheet must offer the strength beside the aim, naming the rung after it');
if (!/\+ 1\) % QUIZ_BIASES\.length\] \|\| QUIZ_BIASES\[0\]\)\.label/.test(src))
  throw new Error('the chip must name the next rung by its own label, so the wrap cannot lie');
const biasClick = grab("document.getElementById('indexBox').addEventListener('click'", "  });");
if (!/getAttribute\('data-act'\) === 'bias'[\s\S]*?setQuizBias\(pulls\[\(pulls\.indexOf\(quizBiasId\) \+ 1\) % pulls\.length\]\)[\s\S]*?indexQuizNew\(\)/.test(biasClick))
  throw new Error('the tap must walk the strength and deal the fresh card at once');
console.log('pull strength: five rungs from a flat draw to a brutal lean, walked and persisted beside the aim');

/* --- the ledger's half: the counts you have been losing, not only
       the count plays you have been refusing. A cell can be taken
       every time and still bleed, and that is the cell to drill. */
if (!/function leakRatios\(now, drills\)/.test(src))
  throw new Error('the quiz must be able to read the ledger\u2019s own ranking');
if (!/if \(!e \|\| !e\.n \|\| e\.m\) continue;/.test(src))
  throw new Error('a mastered cell must be out of the quiz\u2019s aim as well as the drill\u2019s');
if (!/if \(mx > 0\) for \(k in out\) out\[k\] \/= mx;/.test(src))
  throw new Error('the ratios must be scaled to the worst leak, so one is a full 1');
if (!/var ratios = leakRatios\(\);               \/\* read once: the ladder is 17 rungs \*\//.test(src))
  throw new Error('the draw must read the ledger once for the whole ladder');
{
  const now = Date.now();
  const LEKY = { 'hard 15 v 10': { n: 2, cost: 60, ts: now, d: 0 },
                 'hard 12 v 3':  { n: 1, cost: 20, ts: now, d: 0 },
                 'hard 16 v 10': { n: 1, cost: 10, ts: now, d: 0 },
                 'hard 11 v A':  { n: 1, cost: 40, ts: now, d: 0, m: 1 },
                 'hard 10 v 10': { n: 0, cost: 0 } };
  const drillCool250 = extract('drillCool', 'LEAK_DRILL_HALF')(250);
  const leakWeight = extract('leakWeight', 'LEAK_HALF, LEAK_DRILL_HALF, LEAK_CAP, drillCool')(7 * 864e5, 250, 100, drillCool250);
  const leakRatios = extract('leakRatios', 'leaks, leakWeight')(LEKY, leakWeight);
  const fresh = leakRatios(now, 0);
  if (Math.abs(fresh['hard 15 v 10'] - 1) > 1e-9)
    throw new Error('the worst leak reads a full 1: ' + JSON.stringify(fresh));
  if (Math.abs(fresh['hard 12 v 3'] - 20 / 60) > 1e-9)
    throw new Error('the rest scale against it: ' + JSON.stringify(fresh));
  if (fresh['hard 11 v A'] !== undefined)
    throw new Error('a mastered cell has left the drill and the aim: ' + JSON.stringify(fresh));
  if (fresh['hard 10 v 10'] !== undefined)
    throw new Error('a cell with no miss yet reads nothing: ' + JSON.stringify(fresh));
  /* a cooled leak cedes the aim to a fresher, lighter one \u2014 the
     ratios read against whatever is bleeding hardest right now */
  const aging = { 'hard 15 v 10': { n: 2, cost: 60, ts: now - 21 * 864e5, d: 0 },
                  'hard 12 v 3':  { n: 1, cost: 20, ts: now, d: 0 } };
  const cooled = extract('leakRatios', 'leaks, leakWeight')(aging, leakWeight)(now, 0);
  if (Math.abs(cooled['hard 12 v 3'] - 1) > 1e-9)
    throw new Error('the fresher leak must take the aim once the old one cools: ' + JSON.stringify(cooled));
  if (!(cooled['hard 15 v 10'] < 0.5))
    throw new Error('a three-week-old toll must read well under half: ' + JSON.stringify(cooled));
  /* and the weaker of the two signals is the worse, never their sum */
  const both = extract('quizWeak', 'ixRec, quizLean')(wRec, 'both');
  if (both('hard 16 v 10', { 'hard 16 v 10': 1 }) !== 1)
    throw new Error('a cell perfect on discipline but bleeding must still pull: ' + both('hard 16 v 10', { 'hard 16 v 10': 1 }));
  if (both('hard 15 v 10', { 'hard 15 v 10': 0.4 }) !== 1)
    throw new Error('discipline must not be summed with the leak: ' + both('hard 15 v 10', { 'hard 15 v 10': 0.4 }));
  if (both('hard 16 v 10', { 'hard 16 v 10': 0.25 }) !== 0.25)
    throw new Error('a clean record with a small leak reads the leak: ' + both('hard 16 v 10', { 'hard 16 v 10': 0.25 }));
  /* and the ledger alone must bend the draw, discipline set aside */
  const calRec = extract('ixRec', 'ixStats')({ byCell: {} });
  const calWeak = extract('quizWeak', 'ixRec, quizLean')(calRec, 'both');
  const calWeight = extract('quizWeight', 'indexLiveSet, ixRec, quizBias, quizWeak')(wLive, calRec, biasAt('even'), calWeak);
  const warm = { 'hard 15 v 10': 1 };        /* live only at +4 and up */
  if (!(calWeight(4, warm) > calWeight(1, warm)))
    throw new Error('a bleeding cell must pull its rung with no discipline record at all');
  if (calWeight(1, warm) !== 1) throw new Error('a rung with no weak cell keeps the floor');
  /* and the draw reads the ledger itself when it runs for real */
  const pick = extract('quizPickTc', 'quizWeight, leakRatios, quizLeanOn, QUIZ_LADDER_LO, QUIZ_LADDER_HI')(
    extract('quizWeight', 'indexLiveSet, ixRec, quizBias, quizWeak')(wLive, calRec, biasAt('even'), calWeak),
    function () { return warm; }, function () { return true; }, -6, 10);
  let hi = 0;
  for (let r = 0; r < 1; r += 0.01) if (pick(r) >= 4) hi++;
  if (hi < 0.5) throw new Error('the bleeding cell must pull the draw to its rung: ' + hi);
  if (pick(0) !== -6 || pick(0.999999) !== 10) throw new Error('both ends stay in reach');
}
console.log('ledger aim: a cell you take every time but keep losing still bends the draw, and cools with age');

/* --- the last few asks, named: cell, count, taken or refused --- */
if (!/'999\.practice\.ixlog'/.test(src) || !/var IX_LOG_KEEP = 5;/.test(src))
  throw new Error('the recent asks must persist, capped by a named constant');
const logBox = [];
let ixSaved = 0;
const pushIxAsk = extract('pushIxAsk', 'ixLog, IX_LOG_KEEP, saveIxLog')(
  logBox, 5, function () { ixSaved++; });
pushIxAsk('hard 16 v 10', 2, true);
pushIxAsk('hard 15 v 10', 4, false);
if (logBox.length !== 2 || logBox[0].cell !== 'hard 15 v 10' || logBox[0].taken !== 0 || logBox[1].taken !== 1)
  throw new Error('an ask must be logged newest-first with taken/refused: ' + JSON.stringify(logBox));
if (ixSaved !== 2) throw new Error('every ask must persist');
pushIxAsk('', 1, true);
if (logBox.length !== 2) throw new Error('an unnamed ask is not a log entry');
pushIxAsk('x v y', 1.7, true);
if (logBox[0].tc !== 2) throw new Error('the count is kept rounded: ' + logBox[0].tc);
for (let k = 0; k < 8; k++) pushIxAsk('cell ' + k, k, true);
if (logBox.length !== 5) throw new Error('the log keeps only the last few: ' + logBox.length);
const ixRecentLine = extract('ixRecentLine', 'ixLog, fmtCount, leaks')(logBox, fmtCount, {});
if (extract('ixRecentLine', 'ixLog, fmtCount, leaks')([], fmtCount, {})() !== '')
  throw new Error('no asks, no recent list');
const recent = ixRecentLine();
if (!/^<p class="drillnow ixrecent">Recent asks: /.test(recent))
  throw new Error('the recent line must open named: ' + recent);
if (!/cell 4<\/b> at true \+4 <span class="ixbadge taken">taken<\/span>/.test(recent))
  throw new Error('each ask names its cell, count and outcome: ' + recent);
if (!/pushIxAsk\(lastFlip\.cell, lastFlip\.tc, ok\);/.test(src) ||
    !/pushIxAsk\('insurance v ace', insBook\.tc, ok\);/.test(src))
  throw new Error('both ask sites must log the ask');
if (!/ixRecentLine\(\) \+/.test(src))
  throw new Error('the sheet must name the recent asks');
if (!/\.idx \.ixbadge\.taken \{ color: #43c98a; \}/.test(src) ||
    !/\.idx \.ixbadge\.refused \{ color: #e2705f; \}/.test(src))
  throw new Error('taken reads green, refused red');

/* --- a refused ask is the one-tap: the play just let pass comes straight
       back as the forced hand; a taken ask and a master's ask only read --- */
pushIxAsk('hard 15 v 10', 4, false);   /* the cap loop evicted the early refusals: refuse again */
const recentTap = ixRecentLine();
if (!/<span class="ixasktap" data-cell="hard 15 v 10" role="button" tabindex="0"[^>]*><b>hard 15 v 10<\/b> at true \+4/.test(recentTap))
  throw new Error('a refused ask must be the tap control with its cell: ' + recentTap);
if (!/just refused \u2014 tap to drill it: the shoe stacks this cell on the next hand/.test(recentTap))
  throw new Error('the ask tap must say what it does');
if (!/<span class="ixbadge refused">refused<\/span><\/span>/.test(recentTap))
  throw new Error('the refused badge still names itself inside the tap');
const refusals = logBox.filter(function (e) { return !e.taken; });
if (!refusals.length) throw new Error('need a refusal for the master check');
const ixRecentM = extract('ixRecentLine', 'ixLog, fmtCount, leaks')(logBox, fmtCount,
  refusals.reduce(function (m, e) { m[e.cell] = { m: 1 }; return m; }, {}));
if (/ixasktap/.test(ixRecentM()))
  throw new Error('a master left the drill: its refused ask must not tap');
if (!/!e\.taken && !\(leaks\[e\.cell\] && leaks\[e\.cell\]\.m\)/.test(src))
  throw new Error('only a refused ask that still stands may be a tap target');
if (!/\.idx \.ixasktap \{ cursor: pointer; text-decoration: underline dotted; \}/.test(src))
  throw new Error('the tappable ask must look tappable');
const askClick = grab("document.getElementById('indexBox').addEventListener('click'", "  });");
if (!/closest\('\.ixasktap'\)[\s\S]*?drillNow\(ac\)/.test(askClick))
  throw new Error('the sheet must hand the refused ask back to the drill');
if (!/the ledger holds nothing to stack/.test(askClick))
  throw new Error('a ledger-less ask tap must say so, not vanish');
const askKeys = grab("document.getElementById('indexBox').addEventListener('keydown'", "  });");
if (!/\.ixtap, \.ixasktap/.test(askKeys))
  throw new Error('the ask tap must answer the keyboard beside the record tap');
/* --- the weighting, read out on the sheet: which cells pull the draw,
       how hard, and over what band of the ladder --- */
const quizPullLine = extract('quizPullLine', 'quizLeanOn, quizWeak, leakRatios, INDEX999, indexLiveSet, fmtCount, QUIZ_LADDER_LO, QUIZ_LADDER_HI, quizBiasStep');
const pullArgs = (lean, rec, ratios, step) => {
  const s = step || { id: 'even', bias: 1.5, label: 'leans' };
  return [function () { return lean !== 'off' && s.bias > 0; },   /* the shipped gate: a flat pull is a fair sample */
    extract('quizWeak', 'ixRec, quizLean')(function (c) { return rec[c] || null; }, lean),
    function () { return ratios; },
    INDEX999, extract('indexLiveSet', 'INDEX999')(INDEX999), fmtCount, -6, 10,
    function () { return s; }];
};
const pullLine = (lean, rec, ratios, step) => quizPullLine.apply(null, pullArgs(lean, rec, ratios, step))();

/* leaning off: a fair sample says so outright instead of listing a pull
   that is not happening — even with plenty to pull on */
const off = pullLine('off', { 'hard 12 v 2': { asked: 2, followed: 0 } }, { 'hard 15 v 10': 1 });
if (!/^<p class="drillnow ixpull">The draw: a fair sample \u2014 nothing pulls it, every rung equally\.<\/p>$/.test(off))
  throw new Error('a fair sample must read as one: ' + off);
/* leaning on, nothing on the ledger and nothing refused: no pull yet */
const none = pullLine('both', {}, {});
if (!/^<p class="drillnow ixpull">The draw: nothing pulls it yet \u2014 no refusals, no tolls\.<\/p>$/.test(none))
  throw new Error('an untouched ledger must say the draw is flat: ' + none);
/* leaning on, something to pull on: the worst four, by the sampler's own weakness */
const pulled = pullLine('both',
  { 'hard 16 v 10': { asked: 4, followed: 1 }, 'hard 12 v 2': { asked: 2, followed: 0 },
    'hard 11 v A': { asked: 4, followed: 3 } },
  { 'hard 15 v 10': 0.5, 'hard 12 v 3': 1 });
if (!/^<p class="drillnow ixpull">The draw is pulled by: /.test(pulled))
  throw new Error('the line must name itself as the weighting: ' + pulled);
if (!/hard 12 v 2 100% \(\+1\u2026\) \u00b7 hard 12 v 3 100% \(\+2\u2026\) \u00b7 hard 16 v 10 75% \(\+1\u2026\) \u00b7 hard 15 v 10 50% \(\+4\u2026\)/.test(pulled))
  throw new Error('the four strongest pulls, each with its weight and its band: ' + pulled);
if (!/ \u00b7 and 1 weaker \u2014 leans\.<\/p>$/.test(pulled))
  throw new Error('a fifth pull must be counted, not listed, and the strength named: ' + pulled);
if (pulled.includes('hard 11 v A')) throw new Error('only the four strongest are named');
/* the readout names the strength it is reporting under, so the tuning
   is visible on the same line the pull is */
if (!/\\u2014 ' \+ quizBiasStep\(\)\.label \+ '\.<\/p>'/.test(src))
  throw new Error('the pull line must name the strength in force');
const hard = pullLine('both', { 'hard 12 v 2': { asked: 2, followed: 0 } }, {},
  { id: 'hard', bias: 3, label: 'leans hard' });
if (!/100% \(\+1\u2026\) \u2014 leans hard\.<\/p>$/.test(hard))
  throw new Error('the same cells must read under the tuned strength: ' + hard);
const flatPull = pullLine('both', { 'hard 12 v 2': { asked: 2, followed: 0 } }, {},
  { id: 'flat', bias: 0, label: 'draws flat' });
if (!/^<p class="drillnow ixpull">The draw: a fair sample \u2014/.test(flatPull))
  throw new Error('a flat pull must not list a pull that is not happening: ' + flatPull);
/* the band is the ladder the cell is live over, both ends when it can
   reach the bottom rung (a below-index cell turns on at its own at) */
const below = pullLine('both', { 'hard 13 v 2': { asked: 1, followed: 0 } }, {});
if (!/hard 13 v 2 100% \(-6\u2026-1\)/.test(below))
  throw new Error('a below-index band must name both of its edges: ' + below);
/* the weights must read the SAME weakness the draw is built from, not a
   re-derivation: the aim decides the half that shows */
if (!/var ratios = leakRatios\(\);/.test(src) || !/w = quizWeak\(k, ratios\);/.test(src))
  throw new Error('the readout must read the sampler\u2019s own signals');
if (!/var QUIZ_LADDER_LO = -6, QUIZ_LADDER_HI = 10;/.test(src) ||
    !/var lo = QUIZ_LADDER_LO, hi = QUIZ_LADDER_HI, tc, weights = \[\], total = 0, cut;/.test(src))
  throw new Error('the band and the draw must walk the same ladder');
if (!/ixRecentLine\(\) \+\s*\n\s*quizPullLine\(\) \+/.test(src))
  throw new Error('the sheet must show the weighting beside the recent asks');
if (!/\.idx \.ixpull \{ color: rgba\(255,255,255,0\.72\); \}/.test(src))
  throw new Error('the weighting reads beside the sheet, not shouted');
console.log('quiz weighting readout: the four strongest pulls, their weight and their band, live on the sheet');
console.log('refused ask one-tap: hard 15 v 10 refused comes straight back, taken and master read only');
console.log('recent asks: hard 15 v 10 at true +4 refused \u2014 the last few asks named, taken or refused');

/* --- the quiz score remembered: what you KNOW, not what is open --- */
if (!/'999\.practice\.quizscore'/.test(src) || !/function saveQuizStats\(\)/.test(src))
  throw new Error('the quiz score must persist beside the coach2019s and the count2019s');
if (!/saveQuizStats\(\);[^\n]*\n\s*if \(indexMode\) renderIndexSheet\(\);/.test(src))
  throw new Error('a graded card must persist before the sheet redraws');
{
  /* the loader must refuse a score it cannot trust \u2014 but one field at a
     time. This pin used to ask for `asked` AND `clean` or the whole
     record is dropped, which is the all-or-nothing fault the storage
     audit fixed: a clean count saved as a string must not cost the
     player the cards they actually answered. The RULE it was guarding
     survives \u2014 clean can never exceed asked \u2014 as a clamp. */
  const loader = grab("  var quizStats = { asked: 0, clean: 0 };", "  function saveQuizStats()");
  if (!/quizStats = LUCK999\.numInto\(qs, \{ asked: 0, clean: 0 \}\);/.test(loader) ||
      !/quizStats\.clean > quizStats\.asked\) quizStats\.clean = quizStats\.asked;/.test(loader) ||
      !/quizStats\.clean < 0\) quizStats\.clean = 0;/.test(loader))
    throw new Error('a stored score must be read field by field, and clean never past asked');
  const quizScoreLine = extract('quizScoreLine', 'quizStats')({ asked: 0, clean: 0 });
  if (quizScoreLine() !== '') throw new Error('no cards graded, no score to name');
  const line = extract('quizScoreLine', 'quizStats')({ asked: 5, clean: 3 })();
  if (line !== ' \u00b7 quiz 3/5 clean (60%)')
    throw new Error('the footer clause names the score and its rate: ' + JSON.stringify(line));
  const perfect = extract('quizScoreLine', 'quizStats')({ asked: 4, clean: 4 })();
  if (!/4\/4 clean \(100%\)/.test(perfect)) throw new Error('a perfect record reads 100%: ' + perfect);
  /* a card must hold the SAME object, so grading writes the memory */
  const st = { asked: 2, clean: 1 };
  if (!/indexQuiz = \{[\s\S]{0,460}?score: quizStats \};/.test(src))
    throw new Error('a fresh card must inherit the score object itself');
  const indexQuiz = { tc: 4, picks: {}, graded: null, counted: false, fed: {}, tcSay: 3, q: { rc: 10, dk: 3, cq: 3 }, score: st };
  const quiz = extract('indexQuizGrade', 'indexQuiz, INDEX999, indexLiveSet, indexQuizScore, quizFeed, quizAutoDrill, saveQuizStats, indexMode, renderIndexSheet');
  /* count the writes: the same score object must move */
  let saves = 0, feeds = 0;
  const grade = quiz(indexQuiz, INDEX999, indexLiveSet, indexQuizScore,
    function () { feeds++; }, function () { }, function () { saves++; }, false, function () {});
  grade();
  if (st.asked !== 3) throw new Error('a graded card must land on the remembered score: ' + JSON.stringify(st));
  if (saves !== 1) throw new Error('one lock, one persist: ' + saves);
  if (feeds !== 1) throw new Error('every lock must feed the ledgers: ' + feeds);
  grade();
  if (st.asked !== 3) throw new Error('a re-lock must not score the card twice: ' + JSON.stringify(st));
  if (saves !== 2) throw new Error('every lock persists its grade: ' + saves);
  if (feeds !== 2) throw new Error('a re-lock must re-read the ledgers too: ' + feeds);
}
console.log('quiz score: 3/5 clean (60%) survives the reload \u2014 the sheet names what you know');

/* --- a blown card drills the class it blew: the ledgers, then the
       queue, and a re-lock that fixes the picks takes the toll back */
if (!/var QUIZ_MISS_COST = 25;/.test(src) || !/function quizCellOf\(entry\)/.test(src))
  throw new Error('a wrong answer needs its own price and its own cell reader');
if (!/function quizFeed\(graded\)/.test(src) ||
    !/quizFeed\(graded\);                \/\* a blown card drills the class it blew \*\//.test(src))
  throw new Error('every grade must feed the ledgers');
if (!/indexQuiz\.fed = \{\};/.test(src))
  throw new Error('a fresh card must start with nothing fed');
if (!/indexQuiz = \{ tc: tc, picks: \{\}, graded: null, fed: \{\},/.test(src))
  throw new Error('a fresh card must remember its own tolls');
if (!/function indexQuizTc\(n\)/.test(src)) throw new Error('the conversion needs its own pick');
if (!/if \(changed\) refillQueue\(\);         \/\* the drill serves exactly what is owed \*\//.test(src))
  throw new Error('the drill queue must be rebuilt whenever a toll lands or comes back');
if (!/if \(fresh\) leakAutoOpen\(freshChips\);/.test(src))
  throw new Error('a class new to the sitting must open the panel, at its own weight');
if (!/INDEX999\.INDICES\[cell\] !== undefined \|\| cell === 'insurance v ace'/.test(src))
  throw new Error('only real drillable classes may cross over — not a stake amount');
{
  const quizCellOf = extract('quizCellOf', '')();
  if (quizCellOf('hard 12 v 3') !== 'hard 12 v 3') throw new Error('a missed cell names itself');
  if (quizCellOf('+ hard 12 v 3') !== 'hard 12 v 3') throw new Error('an over-named cell reads the same');
  if (quizCellOf('4 units staked') !== null || quizCellOf('1 unit staked') !== null)
    throw new Error('a wrong stake is not a hand the drill can deal: ' + quizCellOf('4 units staked'));
  if (quizCellOf('') !== null) throw new Error('nothing in, nothing out');
  /* the fed set is a delta: grading twice must not double-charge,
     and fixing the picks must take the old toll back out */
  const ledger = {};
  let refills = 0, opens = 0, queue = [], namedCells = [];
  const quizFeed = extract('quizFeed',
    'indexQuiz, INDEX999, QUIZ_MISS_COST, quizCellOf, leakMiss, leakRelief, leakQueue, refillQueue, leakAutoOpen, drillFeeds, leakMode, unseenNote')
    ({ fed: {} }, INDEX999, 25, quizCellOf,
      (c, v) => { ledger[c] = (ledger[c] || 0) + v; return true; },
      (c, v) => { ledger[c] = Math.max(0, (ledger[c] || 0) - v); if (!ledger[c]) delete ledger[c]; return false; },
      queue, function () { refills++; }, function () { opens++; }, function () { return true; },
      false, function (c) { namedCells.push(c); });
  quizFeed({ wrong: ['hard 12 v 3', 'hard 16 v 10', '4 units staked'] });
  if (ledger['hard 12 v 3'] !== 25 || ledger['hard 16 v 10'] !== 25)
    throw new Error('both wrong classes must land in the ledger: ' + JSON.stringify(ledger));
  if (ledger['4 units staked'] !== undefined) throw new Error('a stake is not a class');
  if (namedCells.join('|') !== 'hard 12 v 3|hard 16 v 10')
    throw new Error('every class the quiz finds must be named for the badge: ' + namedCells.join('|'));
  if (refills !== 1 || opens !== 1) throw new Error('the drill must arm and the panel open: ' + refills + '/' + opens);
  quizFeed({ wrong: ['hard 12 v 3', 'hard 16 v 10', '4 units staked'] });
  if (ledger['hard 12 v 3'] !== 25) throw new Error('grading twice must not double-charge: ' + JSON.stringify(ledger));
  if (refills !== 1) throw new Error('an unchanged card must not churn the queue: ' + refills);
  /* the player fixes both picks: the tolls must come back out */
  quizFeed({ wrong: ['4 units staked'] });
  if (ledger['hard 12 v 3'] !== undefined || ledger['hard 16 v 10'] !== undefined)
    throw new Error('a fixed pick must take its toll back: ' + JSON.stringify(ledger));
  if (refills !== 2) throw new Error('a relieved cell must leave the drill queue too: ' + refills);
  /* a wrong stake alone still feeds nothing, and leaves the queue alone */
  const before = refills;
  quizFeed({ wrong: ['2 units staked'] });
  if (Object.keys(ledger).length) throw new Error('a stake-only card must feed nothing: ' + JSON.stringify(ledger));
  /* priced, yes — fed, never: the chip price rides the grade, the ledger
     still has no class to hang a wrong spread on */
  const cellOfPriced = extract('quizCellOf', '')();
  if (cellOfPriced('+ 4 units staked \u221275') !== null)
    throw new Error('a priced stake is still not a class: ' + cellOfPriced('+ 4 units staked \u221275'));
  quizFeed({ wrong: ['+ 4 units staked \u221275'] });
  if (Object.keys(ledger).length) throw new Error('a priced stake must still feed nothing');
  if (refills !== before) throw new Error('an empty feed must not rebuild the queue');
}
console.log('blown cards drill: 12 v 3 and 16 v 10 land at 25 chips each, a re-lock takes them back');

/* --- a blown card is dealt at once: the cell it just marked wrong is
       the forced hand, not a lesson that waits for the next felt hand --- */
if (!/quizFeed\(graded\);                \/\* a blown card drills the class it blew \*\/\n    quizAutoDrill\(graded\);/.test(src))
  throw new Error('the grade must feed the ledger, then deal the cell it fed');
if (!/function quizAutoDrill\(graded\)/.test(src) || !/if \(reviewMode \|\| !drillFeeds\('quiz'\)\) return;/.test(src))
  throw new Error('the auto-deal must stand down for the reel and a felt-only ledger');
{
  const quizCellOf = extract('quizCellOf', '')();   /* the cell reader, its own copy here */
  const runs = [];
  const mk = function (opts) {
    runs.length = 0;
    return extract('quizAutoDrill',
      'quizCellOf, INDEX999, drillFeeds, reviewMode, drillNow')(
      quizCellOf, INDEX999,
      function (s) { return !opts.off || s !== 'quiz'; },
      !!opts.review,
      function (cell, now) { runs.push([cell, now]); });
  };
  let ad = mk({});
  const call = function (fn, g) { runs.length = 0; fn(g); return runs.slice(); };
  const blew = call(ad, { wrong: ['+ hard 12 v 3', '4 units staked'] });
  if (blew.length !== 1 || blew[0][0] !== 'hard 12 v 3' || blew[0][1] !== true)
    throw new Error('the first class a card blew is dealt at once, forced: ' + JSON.stringify(blew));
  if (call(ad, { wrong: ['4 units staked'] }).length)      /* a stake is not a hand */
    throw new Error('a wrong stake must not deal a hand');
  call(ad, { wrong: [] });
  call(ad, null);
  if (call(ad, { wrong: [] }).length) throw new Error('a clean card deals nothing');
  const ins = call(ad, { wrong: ['+ insurance v ace'] });
  if (ins.length !== 1 || ins[0][0] !== 'insurance v ace')
    throw new Error('the count\u2019s own bet is a class too: ' + JSON.stringify(ins));
  if (call(mk({ off: true }), { wrong: ['+ hard 12 v 3'] }).length)
    throw new Error('a felt-only ledger deals no card cells');
  if (call(mk({ review: true }), { wrong: ['+ hard 12 v 3'] }).length)
    throw new Error('the replay reel must not be hijacked by a card');
}
console.log('a blown card deals: 12 v 3 comes straight off the shoe, stakes and reels stand down');

/* --- every class the grade names is its own tap, so the miss leads
       straight into the drill queue instead of being re-found later --- */
if (!/function quizDrillLine\(graded\)/.test(src) || !/quizDrillLine\(indexQuiz\.graded\)/.test(src))
  throw new Error('the graded card must carry its own drill line');
{
  const cellOf = extract('quizCellOf', '')();
  const line = extract('quizDrillLine', 'quizCellOf, INDEX999')(cellOf, INDEX999);
  if (line(null) !== '' || line({ wrong: [] }) !== '') throw new Error('no grade, no line');
  if (line({ wrong: ['4 units staked'] }) !== '') throw new Error('a wrong stake is not a class');
  const one = line({ wrong: ['hard 12 v 3', '4 units staked'] });
  if (!/<span class="ixdrill" data-cell="hard 12 v 3" role="button" tabindex="0"/.test(one) ||
      !/drill this class \u2014 the shoe deals it/.test(one))
    throw new Error('the miss must be the tap control and say what it does: ' + one);
  if ((one.match(/class="ixdrill"/g) || []).length !== 1) throw new Error('one class, one tap: ' + one);
  const two = line({ wrong: ['+ hard 12 v 3', 'hard 16 v 10', 'insurance v ace'] });
  if ((two.match(/class="ixdrill"/g) || []).length !== 3) throw new Error('every class named, once: ' + two);
  if (!/data-cell="insurance v ace"/.test(two)) throw new Error('the count\u2019s own bet drills too');
  if (line({ wrong: ['+ hard 12 v 3', 'hard 12 v 3'] }).match(/ixdrill/g).length !== 1)
    throw new Error('the same class twice is one tap');
  if (!/<p class="drillnow">Drill it now: /.test(one)) throw new Error('the line names itself');
}
const gradeClick = grab("document.getElementById('indexBox').addEventListener('click'", "  });");
if (!/closest\('\.ixdrill'\)[\s\S]*?drillNow\(qc, true\)/.test(gradeClick))
  throw new Error('a tapped miss must deal at once, like its auto-deal');
if (!/the ledger holds nothing to stack/.test(gradeClick))
  throw new Error('a ledger-less miss must say so, not vanish');
if (!/\.idx \.ixdrill \{ cursor: pointer; color: #d8b56a;/.test(src))
  throw new Error('the tap must look tappable');
console.log('the grade drills: every miss it names is one tap from the queue');

console.log('\nindex teach verified');
