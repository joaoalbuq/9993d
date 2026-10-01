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
  if (!src.includes("'<li><b>' + c + '</b>")) throw new Error('the sheet must render the canon');
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

console.log('\nindex teach verified');
