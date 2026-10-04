/* THE QUIZ SCORE CARD CARRIES THE PRICED STAKE.
   The quiz already priced a wrong spread in chips — the same flat figure a
   wrong class costs — but it priced the card and dropped it on the floor. So a
   player who over-staked on nine cards saw nine separate verdicts and no sum:
   the score card reported clean cards and never mentioned money spent. This
   suite holds the toll to the score card, and holds the one rule that makes it
   honest — a card re-locked REPLACES its grade, so the running total must move
   by the difference rather than double-counting a fixed answer.
*/
const fs = require('fs');
const SRC = fs.readFileSync(__dirname + '/../offline.html', 'utf8');

/* ---- the remembered score carries the figure at all ---- */
if (!/var quizStats = \{ asked: 0, clean: 0, chips: 0 \};/.test(SRC))
  throw new Error('the quiz score must carry a chips figure from the start, not grow one later');
if (!/quizStats = \{ asked: 0, clean: 0, chips: 0 \}; indexQuiz = null; saveQuizStats\(\);/.test(SRC))
  throw new Error('a fresh sitting must zero the chips with the rest of the quiz score');
if (!/LUCK999\.numInto\(qs, \{ asked: 0, clean: 0, chips: 0 \}\)/.test(SRC))
  throw new Error('the stored record is read through the one lenient read, chips included');
if (!/if \(!\(quizStats\.chips >= 0\)\) quizStats\.chips = 0;/.test(SRC))
  throw new Error('a stored figure that is not a usable number must read as no toll, never as a credit');

/* ---- the card's priced spread lands on the running total ---- */
const grade = SRC.slice(SRC.indexOf('function indexQuizGrade'), SRC.indexOf('function indexLiveLine'));
if (!/var wasCost = indexQuiz\.graded \? \(indexQuiz\.graded\.stakeCost \|\| 0\) : 0;/.test(grade))
  throw new Error('the total must read what this card last cost, so a re-lock can replace it');
if (!/indexQuiz\.score\.chips = Math\.max\(0, \(indexQuiz\.score\.chips \|\| 0\) \+ graded\.stakeCost - wasCost\);/.test(grade))
  throw new Error('the running total is the previous total plus this grade less what this card already paid');
/* the re-lock rule must sit WITH the clean count's own re-lock rule: the same
   "a card scores once" moment, not a second, separately-timed one */
if (!/if \(!indexQuiz\.counted\) \{[\s\S]*?indexQuiz\.score\.asked\+\+;/.test(grade))
  throw new Error('the clean count must still score once, however often a card is locked');
const costAt = grade.indexOf('graded.stakeCost - wasCost');
const askedAt = grade.indexOf('indexQuiz.score.asked++');
if (costAt < 0 || askedAt < 0 || askedAt > costAt)
  throw new Error('the chips must be committed inside the same grading step that counts the card');

/* ---- the score card actually says it ---- */
if (!/function quizChipsLine\(chips\) \{/.test(SRC))
  throw new Error('the figure needs one renderer, so the two readings cannot disagree');
if (!/return ' \\u00b7 ' \+ chips \+ ' chips over-staked';/.test(SRC))
  throw new Error('the total must be reported in chips, in words a player can read');
if (!/if \(!chips\) return '';/.test(SRC))
  throw new Error('a sitting with no wrong spread must read as no chips, not as a flat zero');
if (!/Math\.max\(0, chips \|\| 0\)/.test(SRC))
  throw new Error('a negative or missing figure must never render as a toll');

/* BOTH readings of the quiz score carry it: the remembered line on the sheet
   and the live one on the card. One number, two places — a player who reads
   only the card must not be told a different sitting from the sheet. */
if (!/return ' \\u00b7 quiz ' \+ quizStats\.clean \+ '\/' \+ quizStats\.asked \+ ' clean \(' \+ pct \+ '%\)' \+\s*\n\s*quizChipsLine\(quizStats\.chips\);/.test(SRC))
  throw new Error('the sheet\'s remembered score line must carry the running chips');
if (!/'<p class="drillnow">Score: ' \+ indexQuiz\.score\.clean \+ '\/' \+ indexQuiz\.score\.asked \+\s*\n\s*quizChipsLine\(indexQuiz\.score\.chips\) \+/.test(SRC))
  throw new Error('the live card score must carry the running chips too');

/* ---- it must not leak into the ledgers it does not belong to ---- */
if (/quizStats\.chips\s*\+=\s*graded\.stakeCost;/.test(SRC))
  throw new Error('a plain += would double-count a re-locked card; the total must move by the difference');
if (/leaks\[[^\]]*\]\.chips/.test(SRC) || /sessionLeaks\[[^\]]*\]\.chips/.test(SRC))
  throw new Error('a wrong spread is not a class: it has no cell to sit on and must not be given one');

/* ---- the arithmetic itself, on the real numbers ---- */
/* QUIZ_MISS_COST is 25 and the card prices the gap between the units said and
   the units the count lays. Three over-stakes of 3, 2 and 1 units are 75, 50
   and 25 — a sitting of 150 — and a re-lock that fixes the last one removes
   exactly its own 25. */
const QUIZ_MISS_COST = 25;
const cost = units => Math.abs(units) * QUIZ_MISS_COST;
let total = 0;
const cards = [3, 2, 1];
cards.forEach(u => { total += cost(u); });
if (total !== 150) throw new Error('three over-stakes must sum to the sitting: ' + total);
/* the re-lock rule, on the same numbers */
const wasCost = cost(1);
total = Math.max(0, total + 0 - wasCost);
if (total !== 125) throw new Error('re-locking a fixed card must remove exactly its own toll: ' + total);
/* a wrong spread replaced by a DIFFERENT wrong one moves by the difference,
   never by the whole of either */
let t2 = cost(2);
t2 = Math.max(0, t2 + cost(4) - cost(2));
if (t2 !== cost(4)) throw new Error('one card one toll: ' + t2);
/* and a card answered correctly costs nothing, so it never moves the total */
let t3 = cost(3);
t3 = Math.max(0, t3 + 0 - 0);
if (t3 !== cost(3)) throw new Error('a clean card must not touch the running chips: ' + t3);

console.log('7 the quiz score card carries the priced stake as a running chips total, ' +
  'one card one toll, and a re-lock replaces its grade instead of adding to it');