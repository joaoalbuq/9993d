/* The table's EV bars COUNT UP, the way the practice floor's do.
   The table animated every bar's WIDTH from zero while the figure
   beside it snapped to its final value on the first frame — the bar
   climbed and the number stood still, and a number that does not
   move while the thing it counts does reads as pasted on. Under
   test: the floor's own motion (550ms, cubic ease-out, one stagger
   per bar riding that bar's own grow), the two guards it earns —
   reduced motion hands over the numbers, and the landing is armed on
   a timer so a tab with no frames still gets a number — and that a
   redraw cancels a tween in flight rather than fighting it.       */
'use strict';
const fs = require('fs');
const path = require('path');
const table = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const floor = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

/* --- the cost is a count span, carrying its figure and its beat --- */
/* the minus as the FILE spells it: a backslash-u escape inside a JS
   string literal. Built from char codes so this line cannot interpret
   it as a character of its own, and regex-escaped so the matcher
   treats the backslash as a backslash.                        */
const MINUS_LIT = String.fromCharCode(92, 117, 50, 50, 49, 50);   /* \u2212 */
const MINUS_RE = MINUS_LIT.replace(/\\/g, String.fromCharCode(92, 92));
if (!/<span class="cnt" data-count="'\s*\+ Math\.round\(c\)/.test(table))
  throw new Error('the bar cost must be a count span, not a literal');
if (!new RegExp('<b>' + MINUS_RE + '<span class="cnt"').test(table))
  throw new Error('the count span must sit inside the cost\u2019s own bold figure');
if (!/'" data-delay="' \+ \(i \* 70\) \+ '">0<\/span><\/b>'/.test(table))
  throw new Error('each figure must carry its own bar\u2019s stagger as its delay');
/* the cost must NOT be printed outright beside a growing bar */
if (new RegExp("<b>" + MINUS_RE + "' \\+ Math\\.round\\(c\\) \\+ '</b>").test(table))
  throw new Error('the cost must no longer be printed outright beside a growing bar');
/* the figure must not jitter sideways as it climbs */
if (!/\.training \.evleft \.cnt \{[^}]*tabular-nums/.test(table))
  throw new Error('the counting figure must be tabular-nums, or it reads as two numbers');
console.log('the markup: a count span per bar, its own stagger, tabular figures');

/* --- the tween is the floor\u2019s, in every particular that matters --- */
const cu = table.slice(table.indexOf('function countUp(box) {'));
const cuBody = cu.slice(0, cu.indexOf('\n  }'));
if (!/var COUNT_MS = 550;/.test(table)) throw new Error('the beat must be 550ms, the floor\u2019s');
if (!/Math\.pow\(1 - Math\.min\(1, \(el - delays\[j\]\) \/ COUNT_MS\), 3\)/.test(cuBody))
  throw new Error('the ease must be the floor\u2019s cubic ease-out');
if (!/if \(el < delays\[j\]\) \{ spans\[j\]\.textContent = '0'; continue; \}/.test(cuBody))
  throw new Error('each figure must wait out its own bar\u2019s stagger');
if (!/if \(mine !== countT\) return;/.test(cuBody))
  throw new Error('a redraw must cancel the tween in flight, not fight it');
console.log('the motion: 550ms, cubic, one stagger per bar, cancellable by a redraw');

/* --- the two guards, both earned --- */
if (!/var reduced = window\.matchMedia && window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches;/.test(cuBody))
  throw new Error('reduced motion must be honoured');
if (!/if \(reduced\) \{ land\(\); return; \}/.test(cuBody))
  throw new Error('a reduced-motion player must be handed the numbers outright');
if (!/setTimeout\(land, last \+ COUNT_MS \+ 80\);/.test(cuBody))
  throw new Error('the landing must also be armed on a timer: a tab that is not painting has its frames throttled to nothing');
/* the floor has both, so a table that lost one would be a regression against it */
for (const g of ["var reduced = window.matchMedia", "if (reduced) { land(); return; }",
  "setTimeout(land, last + COUNT_MS + 80)"]) {
  if (!cuBody.includes(g)) throw new Error('the table must keep the floor\u2019s guard: ' + g);
  if (!floor.includes(g)) throw new Error('the floor\u2019s own copy moved: ' + g);
}
console.log('the guards: reduced motion lands at once, and a timer lands it even with no frames');

/* --- it is armed wherever the table draws the chart --- */
const arms = (table.match(/countUp\(b\)/g) || []).length;
if (arms < 2) throw new Error('every draw of the chart must arm its count-up: ' + arms);
if (!/if \(tReviewOpen\) renderReview\(\);[\s\S]{0,200}else countUp\(b\);/.test(table))
  throw new Error('the review draws its own bars, so the plain redraw must not count them twice');
console.log('armed: the panel and the report each count their own bars, never twice over');

/* --- RUN it: the numbers climb, land exactly, and never overshoot --- */
function runCountUp(opts) {
  opts = opts || {};
  const spans = opts.targets.map((t, i) => ({
    getAttribute: (a) => (a === 'data-count' ? String(t) : String((opts.delays || [])[i] || 0)),
    textContent: '0'
  }));
  const box = { querySelectorAll: () => spans };
  let now = 0;
  const frames = [];
  const timers = [];
  const src = cu.slice(cu.indexOf('function countUp(box) {'), cu.indexOf('\n  }') + 4);
  const countUp = new Function('window', 'setTimeout', 'requestAnimationFrame',
    'var COUNT_MS = 550, countT = 0;\n' + src + '\nreturn countUp;')(
    {
      matchMedia: opts.reduced ? function () { return { matches: true }; } : function () { return { matches: false }; },
      performance: { now: function () { return now; } }
    },
    (f2, ms) => { timers.push(f2); return 1; },
    (f3) => { frames.push(f3); return 1; });
  const setNow = (v) => { now = v; };
  /* step the clock, then run whatever frames that step queued */
  const pump = () => { let g = 0; while (frames.length && g++ < 500) frames.shift()(); };
  return { countUp, box, spans, setNow, pump, timers };
}
const r = runCountUp({ targets: [60, 25], delays: [0, 70] });
r.countUp(r.box);
r.setNow(0); r.pump();
if (r.spans[0].textContent !== '0')
  throw new Error('a figure must start at zero, not already be its own value: ' + r.spans[0].textContent);
/* at 50ms the first bar has left zero; the second is still inside its 70ms stagger */
r.setNow(50); r.pump();
if (Number(r.spans[0].textContent) <= 0)
  throw new Error('the first bar must be climbing off the start: ' + r.spans[0].textContent);
if (r.spans[1].textContent !== '0')
  throw new Error('the second bar must still read zero inside its own stagger: ' + r.spans[1].textContent);
/* mid-flight both are climbing, and the second trails the first \u2014 its own ride */
r.setNow(275); r.pump();
const first = Number(r.spans[0].textContent), second = Number(r.spans[1].textContent);
if (!(second > 0 && first > second))
  throw new Error('the staggered bar must trail the first, not run level with it: ' + first + ',' + second);
/* landed: both exactly their figures */
r.setNow(700); r.pump();
if (r.spans[0].textContent !== '60' || r.spans[1].textContent !== '25')
  throw new Error('both figures must land exactly: ' + r.spans.map((s) => s.textContent).join(','));
/* and never overshoot at any sample */
const r2 = runCountUp({ targets: [60], delays: [0] });
r2.countUp(r2.box);
for (let t = 0; t <= 800; t += 20) {
  r2.setNow(t); r2.pump();
  const v = Number(r2.spans[0].textContent);
  if (!(v >= 0 && v <= 60)) throw new Error('a count must never overshoot or go negative: ' + v + ' at ' + t);
}
console.log('run: 0 \u2192 climbing \u2192 exactly 60 and 25, the second bar waiting its stagger, never overshooting');

/* --- the timer guard: no frames at all, and the number still arrives --- */
const r4 = runCountUp({ targets: [60], delays: [0] });
r4.countUp(r4.box);
r4.timers.forEach((t2) => t2());          /* the browser throttles frames to nothing:
                                              the timer is what saves the number */
if (r4.spans[0].textContent !== '60')
  throw new Error('with no frames the timer must still land the figure: ' + r4.spans[0].textContent);
console.log('no frames: the timer lands the number anyway — a frozen 0 is worse than no animation');

/* --- a redraw cancels the tween in flight, both ways --- */
const r5 = runCountUp({ targets: [60], delays: [0] });
r5.countUp(r5.box);
r5.setNow(100); r5.pump();
if (r5.spans[0].textContent === '0')
  throw new Error('the first tween must be under way before the redraw, or nothing is being cancelled');
r5.countUp(r5.box);                          /* a redraw bumps the token and restarts at zero */
if (r5.spans[0].textContent !== '0')
  throw new Error('the fresh tween must start from zero, not carry the old count: ' + r5.spans[0].textContent);
r5.timers[0]();                              /* the OLD tween\u2019s landing timer fires late */
if (r5.spans[0].textContent !== '0')
  throw new Error('a stale tween must not land its figure over the live one: ' + r5.spans[0].textContent);
r5.setNow(500); r5.pump();
/* 400ms into the SECOND tween reads 59; 500ms into the first reads 60, so
   only a live tween's arithmetic can produce the answer */
if (r5.spans[0].textContent !== '59')
  throw new Error('only the live tween may write: ' + r5.spans[0].textContent);
console.log('a redraw cancels: the old tween writes nothing more, by frame or by timer');

/* --- reduced motion hands the numbers over at once --- */
const r3 = runCountUp({ targets: [60], delays: [0], reduced: true });
r3.countUp(r3.box);
if (r3.spans[0].textContent !== '60')
  throw new Error('a reduced-motion player must be handed the number outright: ' + r3.spans[0].textContent);
r3.setNow(100); r3.pump();
if (r3.spans[0].textContent !== '60')
  throw new Error('reduced motion must hold the number, not animate it');
if (r3.timers.length) throw new Error('reduced motion must not even arm the landing timer');
console.log('reduced motion: 60 outright, nothing armed to move it');

console.log('\nthe bars count up, verified');