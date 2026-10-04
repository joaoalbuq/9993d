/* BOTH SETTLE LINES LINK THE LUCK FIGURE TO THE STRIP.
   The floor already did this — its clause is a node that opens the strip, and
   its own comment has always claimed so. This suite holds that claim to the
   code and holds the TABLE to the same bargain, because a round that reports a
   gap and gives no way to see the gap that measures it reports half a fact.
   The table's is the newer half: its strip is the training overlay, which the
   player may have shut, so opening it must not quietly switch their coach on.
*/
const fs = require('fs');
const SRC = fs.readFileSync(__dirname + '/../table-16x9.html', 'utf8');
const FLOOR = fs.readFileSync(__dirname + '/../offline.html', 'utf8');

/* ---- the shared bargain: a clause that is a real control ---- */
if (!/function luckClause\(text\) \{/.test(SRC))
  throw new Error('the table must build its luck clause as a node');
if (!/s\.className = 'luckclause';/.test(SRC))
  throw new Error('the clause carries the class the styling hangs on');
if (!/s\.setAttribute\('role', 'button'\);/.test(SRC) || !/s\.tabIndex = 0;/.test(SRC))
  throw new Error('the clause must be reachable and announced as a control, not just clickable');
if (!/Open the reconciliation/.test(SRC))
  throw new Error('the clause must say what a tap will do');

/* BOTH handlers, or it is a mouse-only control. Two handlers, two gestures:
   the tap and the keyboard. A control that answers only a mouse is not one. */
const clickH = SRC.match(/s\.addEventListener\('click',[\s\S]*?\}\);/);
if (!clickH || !/openLuck\(\);/.test(clickH[0]))
  throw new Error('a click on the clause must open the strip');
if (!/s\.addEventListener\('keydown',[\s\S]*?e\.key !== 'Enter' && e\.key !== ' '[\s\S]*?openLuck\(\);/.test(SRC))
  throw new Error('Enter and Space must fire the clause too: it carries role=button and tabindex');

/* ---- the tap opens the strip, and opens it BUILT ---- */
if (!/function openLuck\(\) \{/.test(SRC)) throw new Error('the table needs its own openLuck');
const open = SRC.slice(SRC.indexOf('function openLuck() {'), SRC.indexOf('function setStatus(s, luck)'));
/* ORDER, not mere presence: openLuck also calls renderTrain when it puts the
   overlay back, so a bare presence check passes an openLuck that renders
   nothing at the moment it opens — which is the empty box this forbids. The
   render that matters is the one BEFORE the overlay is unhidden. */
const beforeOpen = open.slice(0, open.indexOf('el.hidden = false;'));
if (!/renderTrain\(\);/.test(beforeOpen))
  throw new Error('openLuck must render the overlay BEFORE opening it, or the tap opens an empty box');
if (open.indexOf('renderTrain();') > open.indexOf('el.hidden = false;') && beforeOpen.indexOf('renderTrain();') < 0)
  throw new Error('the render must come first, not after the overlay is shown');
if (!/el\.hidden = false;/.test(open))
  throw new Error('a tap must open the overlay even when the player shut the coach');

/* ---- and it must NOT rewrite the player's own setting ---- */
if (/setCoach\(\s*true\s*\)/.test(open))
  throw new Error('a tap that explains a number must not switch the coach on behind the player');
if (!/if \(!coachOn\) el\.hidden = true;/.test(open))
  throw new Error('the overlay opened only to be read must close again, leaving the coach as found');
/* the bloom is a CLASS, so the CSS alone proves nothing: without the class
   being added the keyframes never run and the tap opens the overlay in silence */
if (!/el\.classList\.add\('flash'\);/.test(open))
  throw new Error('the overlay must be given the bloom class, or the tap opens it without saying so');

/* ---- the settle line passes the clause as its own part ---- */
if (!/function setStatus\(s, luck\) \{[\s\S]*?statusTxt\.textContent = s;[\s\S]*?if \(luck\) statusTxt\.appendChild\(luckClause\(luck\)\);/.test(SRC))
  throw new Error('the table setStatus must take the clause apart from the sentence');
if (!/Round settles — the payout walk/.test(SRC))
  throw new Error('the settle sentence must survive the rewiring');
const settle = SRC.slice(SRC.indexOf('Round settles — the payout walk'), SRC.indexOf('var beat = 0;', SRC.indexOf('Round settles — the payout walk')));
if (!/luck, both felts reconcile/.test(settle))
  throw new Error('the clause still reports the round gap');
if (!/\)\s*,\s*\n\s*\/\*[^\n]*\n[^\n]*\n\s*evRoundT && evPricedT \?/.test(settle))
  throw new Error('the clause must be passed as setStatus\'s second argument, not concatenated into the sentence');

/* ---- an unpriced round still says nothing ---- */
if (!/evRoundT && evPricedT \? ' · ' \+ LUCK999\.word/.test(settle))
  throw new Error('only a priced round narrates a gap: the clause stays inside the guard');

/* ---- the styling, so the door LOOKS like a door ---- */
if (!/\.status \.luckclause \{ cursor: pointer; color: #d8b56a;/.test(SRC))
  throw new Error('the clause must be styled as a control, in the table\'s own gold');
if (!/\.status \.luckclause:focus-visible/.test(SRC))
  throw new Error('a keyboard that lands on the clause must see where it is');
if (!/\.training\.flash \{ animation: luckopen/.test(SRC))
  throw new Error('the overlay must bloom once when the tap opens it, or the eye cannot tell what answered');
if (!/\.status \.luckclause:hover/.test(SRC))
  throw new Error('the clause must answer the pointer: a dotted underline alone does not say it is live');

/* ---- the floor keeps its half of the bargain ---- */
if (!/function luckClause\(text, glow\)/.test(FLOOR))
  throw new Error('the floor must keep its clause builder');
if (!/if \(luck\) el\.appendChild\(luckClause\(luck, glow\)\);/.test(FLOOR))
  throw new Error('the floor must keep routing its clause through setScore');
if (!/function openLuck\(\) \{[\s\S]*?el\.hidden = false;/.test(FLOOR))
  throw new Error('the floor must keep opening its strip');
const fl = FLOOR.slice(FLOOR.indexOf('var luckNote = \'\';'), FLOOR.indexOf('/* the reel learns the hole card'));
if (!/luck, both felts reconcile/.test(fl))
  throw new Error('the floor still reports the round gap in its own words');
if (!/if \(evRound && evPriced\)/.test(fl))
  throw new Error('the floor clause stays inside the priced-round guard: an unpriced round narrates nothing');

/* ---- and neither one may report a gap it did not price ---- */
if (/luckNote = ' · ' \+ LUCK999\.word/.test(fl) && !/if \(evRound && evPriced\)/.test(fl))
  throw new Error('a gap must never be reported for a round nobody bet on');

/* ---- the clause must not be a way to smuggle markup in ---- */
if (/innerHTML/.test(open) || /innerHTML/.test(SRC.slice(SRC.indexOf('function luckClause(text)'), SRC.indexOf('function openLuck()'))))
  throw new Error('the clause is built from nodes; the round gap never becomes markup');

console.log('6 both settle lines link their luck figure to the strip: ' +
  'click and keyboard, rendered before it opens, coach left as found, unpriced rounds silent');