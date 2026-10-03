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

/* --- the canon, from the page --- */
const cStart = src.indexOf('  var INDEX999 = (function () {');
const cEnd = src.indexOf('})();', cStart) + 5;
const INDEX999 = (0, eval)('(' + src.slice(cStart, cEnd).replace('var INDEX999 = ', '').replace(/;\s*$/, '') + ')');

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
const indexQuizScore = extract('indexQuizScore', 'INDEX999, spreadUnits')(INDEX999, spreadUnits);
{
  const live2 = indexLiveSet(2);
  const g = indexQuizScore({ 'hard 16 v 10': 1, 'hard 12 v 2': 1, 'hard 12 v 3': 1,
    'hard 11 v A': 1, 'hard 9 v 2': 1 }, live2, 2, 5, 5, 1);
  if (!g.all) throw new Error('a perfect card must grade clean \u2014 ' + JSON.stringify(g));
  if (!/a clean card/.test(g.split)) throw new Error('a clean card must say so');
  const part = indexQuizScore({ 'hard 16 v 10': 1, 'hard 12 v 2': 1 }, live2, 2, 2, 2, 1);
  if (part.all) throw new Error('naming 2 of 5 live plays is not clean');
  if (/\+ /.test(part.split)) throw new Error('a partial card over-named nothing: ' + part.split);
  if (!/hard 12 v 3 \u00b7 hard 11 v A \u00b7 hard 9 v 2/.test(part.split))
    throw new Error('the split must name what was missed: ' + part.split);
  const b = indexQuizScore({ 'hard 16 v 10': 1, 'hard 15 v 10': 1, 'hard 12 v 3': 1 }, live2, 2, 3, 2, 1);
  if (b.all) throw new Error('a miss must not grade clean');
  if (!/\+ hard 15 v 10/.test(b.split) || !/hard 12 v 2/.test(b.split) || !/hard 11 v A/.test(b.split))
    throw new Error('the split must name the misses both ways: ' + b.split);
  const i = indexQuizScore({ 'insurance v ace': 1 }, live2, 2, 1, 0, 1);
  if (!/insurance v ace/.test(i.split) || /\+ insurance v ace/.test(i.split))
    throw new Error('a premature insurance must be named as missed: ' + i.split);
}
console.log('indexQuizScore: missed + over-named + premature insurance \u2014 all named, both ways');

/* --- the spread half: the card must now earn what it used to be told --- */
{
  const live2 = indexLiveSet(2);
  const perfect = { 'hard 16 v 10': 1, 'hard 12 v 2': 1, 'hard 12 v 3': 1,
    'hard 11 v A': 1, 'hard 9 v 2': 1 };
  /* true +2 is worth 1 unit \u2014 right plays, right stake: clean */
  const right = indexQuizScore(perfect, live2, 2, 6, 6, 1);
  if (!right.all) throw new Error('right plays at the right units is a clean card: ' + right.split);
  if (!/the spread right/.test(right.split))
    throw new Error('a clean card must name the spread as read: ' + right.split);
  /* under-staked: +2 is worth 1, betting 4 is the over-named shape */
  const over = indexQuizScore(perfect, live2, 2, 6, 6, 4);
  if (over.all) throw new Error('over-staking must break a clean card');
  if (!/\+ 4 units staked/.test(over.split))
    throw new Error('an over-stake must be named as over-named: ' + over.split);
  /* under-staked at a rich count: +5 is worth 4, betting 1 is short */
  const rich = indexLiveSet(5);
  const richPicks = { 'hard 16 v 10': 1, 'hard 15 v 10': 1, 'hard 12 v 2': 1,
    'hard 12 v 3': 1, 'hard 11 v A': 1, 'hard 10 v 10': 1, 'hard 9 v 2': 1, 'insurance v ace': 1 };
  const short = indexQuizScore(richPicks, rich, 5, 8, 8, 1);
  if (short.all) throw new Error('staked a unit at true +5 must not grade clean');
  if (!/1 unit staked/.test(short.split) || /\+ 1 unit/.test(short.split))
    throw new Error('a short stake reads as missed, never over-named: ' + short.split);
  /* saying nothing is not a wrong stake, it is an unanswered one \u2014 and
     an unanswered half cannot grade clean */
  const silent = indexQuizScore(perfect, live2, 2, 5, 5, null);
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
if (!/var lo = -6, hi = 10/.test(src))
  throw new Error('the weighted pick must cover the whole ladder, \u22126 to +10');
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
  if (!/ixHtml = ixSitLine\(\);/.test(src) || !/scHtml \+ ixHtml \+ evHtml;/.test(src))
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
const ixTag = extract('ixTag', 'ixStats, ixRec')(IX, ixRec);
const ixTally = extract('ixTally', 'ixStats, ixRec')(IX, ixRec);
const ixSpread = extract('ixSpread', 'ixStats, ixTally')(IX, ixTally);
if (!ixRec('hard 16 v 10') || ixRec('hard 16 v 10').followed !== 3)
  throw new Error('a cell\u2019s record reads off the split');
if (ixRec('soft 18 v 6') !== null || ixRec('nope') !== null)
  throw new Error('a cell never offered (or unknown) has no record');
if (!/class="ixrec all"/.test(ixTag('hard 16 v 10')) || !/>3\/3</.test(ixTag('hard 16 v 10')))
  throw new Error('a cell you always take reads all, 3/3: ' + ixTag('hard 16 v 10'));
if (!/class="ixrec never"/.test(ixTag('hard 15 v 10')) || !/>0\/2</.test(ixTag('hard 15 v 10')))
  throw new Error('a cell you always miss reads never, 0/2: ' + ixTag('hard 15 v 10'));
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
console.log('follow rate by cell: you take 16 v 10 3/3, never 15 v 10 0/2 \u2014 the total\u2019s blind spots named');

/* --- the weighted draw: the quiz leans to the cells you refuse --- */
const WEAK = { asked: 9, followed: 3, byCell: {
  'hard 15 v 10': { asked: 3, followed: 0 },   /* never taken: live only at +4 and up */
  'hard 12 v 3':  { asked: 3, followed: 0 },   /* never taken: live at +2 and up */
  'hard 16 v 10': { asked: 3, followed: 3 }    /* always taken: live at +1 and up */
} };
const wRec = extract('ixRec', 'ixStats')(WEAK);
const wLive = extract('indexLiveSet', 'INDEX999')(INDEX999);
const quizWeak = extract('quizWeak', 'ixRec')(wRec);
const quizWeight = extract('quizWeight', 'indexLiveSet, ixRec, QUIZ_BIAS, quizWeak')(wLive, wRec, 1.5, quizWeak);
const quizAim = extract('quizAim', 'indexLiveSet, ixRec, quizWeak')(wLive, wRec, quizWeak);
if (quizWeak('hard 15 v 10') !== 1 || quizWeak('hard 16 v 10') !== 0 || quizWeak('nope') !== 0)
  throw new Error('weakness reads 1 \u2212 followed/asked, and 0 for a cell with no record');
const emptyRec = extract('ixRec', 'ixStats')({ byCell: {} });
const emptyWeak = extract('quizWeak', 'ixRec')(emptyRec);
const emptyWeight = extract('quizWeight', 'indexLiveSet, ixRec, QUIZ_BIAS, quizWeak')(wLive, emptyRec, 1.5, emptyWeak);
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
if (!/var aim = quizAim\(tc, leakRatios\(\)\);/.test(src) || !/' \\u00b7 drills ' \+ aim/.test(src))
  throw new Error('the quiz must name the cell it is drilling');
console.log('weighted draw: \u22126 and +10 still in reach, but a refused cell pulls +4 to 70% \u2014 the quiz aims itself');

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
  const leakWeight = extract('leakWeight', 'LEAK_HALF, LEAK_DRILL_HALF, LEAK_CAP')(7 * 864e5, 250, 100);
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
  const both = extract('quizWeak', 'ixRec')(wRec);
  if (both('hard 16 v 10', { 'hard 16 v 10': 1 }) !== 1)
    throw new Error('a cell perfect on discipline but bleeding must still pull: ' + both('hard 16 v 10', { 'hard 16 v 10': 1 }));
  if (both('hard 15 v 10', { 'hard 15 v 10': 0.4 }) !== 1)
    throw new Error('discipline must not be summed with the leak: ' + both('hard 15 v 10', { 'hard 15 v 10': 0.4 }));
  if (both('hard 16 v 10', { 'hard 16 v 10': 0.25 }) !== 0.25)
    throw new Error('a clean record with a small leak reads the leak: ' + both('hard 16 v 10', { 'hard 16 v 10': 0.25 }));
  /* and the ledger alone must bend the draw, discipline set aside */
  const calRec = extract('ixRec', 'ixStats')({ byCell: {} });
  const calWeak = extract('quizWeak', 'ixRec')(calRec);
  const calWeight = extract('quizWeight', 'indexLiveSet, ixRec, QUIZ_BIAS, quizWeak')(wLive, calRec, 1.5, calWeak);
  const warm = { 'hard 15 v 10': 1 };        /* live only at +4 and up */
  if (!(calWeight(4, warm) > calWeight(1, warm)))
    throw new Error('a bleeding cell must pull its rung with no discipline record at all');
  if (calWeight(1, warm) !== 1) throw new Error('a rung with no weak cell keeps the floor');
  /* and the draw reads the ledger itself when it runs for real */
  const pick = extract('quizPickTc', 'quizWeight, leakRatios')(
    extract('quizWeight', 'indexLiveSet, ixRec, QUIZ_BIAS, quizWeak')(wLive, calRec, 1.5, calWeak),
    function () { return warm; });
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
const ixRecentLine = extract('ixRecentLine', 'ixLog, fmtCount')(logBox, fmtCount);
if (extract('ixRecentLine', 'ixLog, fmtCount')([], fmtCount)() !== '')
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
console.log('recent asks: hard 15 v 10 at true +4 refused \u2014 the last few asks named, taken or refused');

/* --- the quiz score remembered: what you KNOW, not what is open --- */
if (!/'999\.practice\.quizscore'/.test(src) || !/function saveQuizStats\(\)/.test(src))
  throw new Error('the quiz score must persist beside the coach\u2019s and the count\u2019s');
if (!/saveQuizStats\(\);[^\n]*\n\s*if \(indexMode\) renderIndexSheet\(\);/.test(src))
  throw new Error('a graded card must persist before the sheet redraws');
{
  /* the loader must refuse a score it cannot trust */
  const loader = grab("  var quizStats = { asked: 0, clean: 0 };", "  function saveQuizStats()");
  if (!/typeof qs\.asked === 'number' && typeof qs\.clean === 'number'/.test(loader) ||
      !/qs\.clean >= 0 && qs\.clean <= qs\.asked/.test(loader))
    throw new Error('a stored score must be both numbers, and clean never past asked');
  const quizScoreLine = extract('quizScoreLine', 'quizStats')({ asked: 0, clean: 0 });
  if (quizScoreLine() !== '') throw new Error('no cards graded, no score to name');
  const line = extract('quizScoreLine', 'quizStats')({ asked: 5, clean: 3 })();
  if (line !== ' \u00b7 quiz 3/5 clean (60%)')
    throw new Error('the footer clause names the score and its rate: ' + JSON.stringify(line));
  const perfect = extract('quizScoreLine', 'quizStats')({ asked: 4, clean: 4 })();
  if (!/4\/4 clean \(100%\)/.test(perfect)) throw new Error('a perfect record reads 100%: ' + perfect);
  /* a card must hold the SAME object, so grading writes the memory */
  const st = { asked: 2, clean: 1 };
  if (!/indexQuiz = \{[\s\S]{0,300}?score: quizStats \};/.test(src))
    throw new Error('a fresh card must inherit the score object itself');
  const indexQuiz = { tc: 4, picks: {}, graded: null, counted: false, fed: {}, score: st };
  const quiz = extract('indexQuizGrade', 'indexQuiz, INDEX999, indexLiveSet, indexQuizScore, quizFeed, saveQuizStats, indexMode, renderIndexSheet');
  /* count the writes: the same score object must move */
  let saves = 0, feeds = 0;
  const grade = quiz(indexQuiz, INDEX999, indexLiveSet, indexQuizScore,
    function () { feeds++; }, function () { saves++; }, false, function () {});
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
if (!/if \(changed\) refillQueue\(\);         \/\* the drill serves exactly what is owed \*\//.test(src))
  throw new Error('the drill queue must be rebuilt whenever a toll lands or comes back');
if (!/if \(fresh\) leakAutoOpen\(\);/.test(src))
  throw new Error('a class new to the sitting must open the panel');
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
  let refills = 0, opens = 0, queue = [];
  const quizFeed = extract('quizFeed',
    'indexQuiz, INDEX999, QUIZ_MISS_COST, quizCellOf, leakMiss, leakRelief, leakQueue, refillQueue, leakAutoOpen')
    ({ fed: {} }, INDEX999, 25, quizCellOf,
      (c, v) => { ledger[c] = (ledger[c] || 0) + v; return true; },
      (c, v) => { ledger[c] = Math.max(0, (ledger[c] || 0) - v); if (!ledger[c]) delete ledger[c]; return false; },
      queue, function () { refills++; }, function () { opens++; });
  quizFeed({ wrong: ['hard 12 v 3', 'hard 16 v 10', '4 units staked'] });
  if (ledger['hard 12 v 3'] !== 25 || ledger['hard 16 v 10'] !== 25)
    throw new Error('both wrong classes must land in the ledger: ' + JSON.stringify(ledger));
  if (ledger['4 units staked'] !== undefined) throw new Error('a stake is not a class');
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
  if (refills !== before) throw new Error('an empty feed must not rebuild the queue');
}
console.log('blown cards drill: 12 v 3 and 16 v 10 land at 25 chips each, a re-lock takes them back');

console.log('\nindex teach verified');
