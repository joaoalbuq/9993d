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
const indexQuizScore = extract('indexQuizScore', 'INDEX999')(INDEX999);
{
  const live2 = indexLiveSet(2);
  const g = indexQuizScore({ 'hard 16 v 10': 1, 'hard 12 v 2': 1, 'hard 12 v 3': 1,
    'hard 11 v A': 1, 'hard 9 v 2': 1 }, live2, 2, 5, 5);
  if (!g.all) throw new Error('a perfect card must grade clean \u2014 ' + JSON.stringify(g));
  if (!/a clean card/.test(g.split)) throw new Error('a clean card must say so');
  const part = indexQuizScore({ 'hard 16 v 10': 1, 'hard 12 v 2': 1 }, live2, 2, 2, 2);
  if (part.all) throw new Error('naming 2 of 5 live plays is not clean');
  if (/\+ /.test(part.split)) throw new Error('a partial card over-named nothing: ' + part.split);
  if (!/hard 12 v 3 \u00b7 hard 11 v A \u00b7 hard 9 v 2/.test(part.split))
    throw new Error('the split must name what was missed: ' + part.split);
  const b = indexQuizScore({ 'hard 16 v 10': 1, 'hard 15 v 10': 1, 'hard 12 v 3': 1 }, live2, 2, 3, 2);
  if (b.all) throw new Error('a miss must not grade clean');
  if (!/\+ hard 15 v 10/.test(b.split) || !/hard 12 v 2/.test(b.split) || !/hard 11 v A/.test(b.split))
    throw new Error('the split must name the misses both ways: ' + b.split);
  const i = indexQuizScore({ 'insurance v ace': 1 }, live2, 2, 1, 0);
  if (!/insurance v ace/.test(i.split) || /\+ insurance v ace/.test(i.split))
    throw new Error('a premature insurance must be named as missed: ' + i.split);
}
console.log('indexQuizScore: missed + over-named + premature insurance \u2014 all named, both ways');

/* --- the wiring: taps, grades, the fresh deal, the score line --- */
if (!/var indexQuiz = null;/.test(src)) throw new Error('the quiz must start asleep');
if (!/stake: spreadUnits\(tc\)/.test(src))
  throw new Error('the card must ride the spread\u2019s stake');
if (!/Math\.floor\(Math\.random\(\) \* 17\) - 6/.test(src))
  throw new Error('the card must cover the whole ladder, \u22126 to +10');
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

console.log('\nindex teach verified');
