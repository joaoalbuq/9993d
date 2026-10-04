/* The bar tap is reversible while it is undecided: tap the same bar
   again and the auto-staked hand is taken back, so a different cell
   can be stacked instead. What must hold:
     - the undo exists only for the hand the bar itself dealt
     - it returns betting, refunds the house's chip, and puts back
       the count the cancelled cards moved
     - a hand the PLAYER has acted on is never taken back
     - a settled or reset floor has nothing to undo            */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}

/* --- the handler: the same bar, undecided, undoes --- */
const dn = grab('  function drillNow(cell, now) {', '\n  }');
if (!/if \(now && drillAuto && drillAuto\.cell === cell && phase !== 'betting'\) return undoBarTap\(\);/.test(dn))
  throw new Error('the same bar, once its hand is undecided, must take the tap back');
if (!/drillAuto = \{ cell: cell, hiLo: hiLo, roundNo: roundNo \};\s*\n\s*deal\(\);/.test(dn))
  throw new Error('the auto-stake must record the cell, the count and the round it dealt');
if (!/Tap that bar again to take it back\./.test(dn))
  throw new Error('the status must say the tap can be taken back');
console.log('the seam: the same bar, undecided, undoes — and the status says so');

/* --- the undo restores the floor exactly --- */
const ud = grab('  function undoBarTap() {', '\n  }');
if (!/var saved = drillAuto;\s*\n\s*if \(!saved\) return false;/.test(ud))
  throw new Error('the undo must read the saved hand before clearing it');
if (!/token\+\+;/.test(ud))
  throw new Error('the cancelled round must stop firing: token++');
if (!/you = \[\]; dealerArr = \[\]; hands = \[\]; splitActive = 0;/.test(ud))
  throw new Error('the dealt hand must be cleared');
if (!/clearBet\(\);/.test(ud))
  throw new Error("the house's chip must come back off the tray");
if (!/hiLo = saved\.hiLo;/.test(ud) || !/roundNo = saved\.roundNo;/.test(ud))
  throw new Error('the count and the round must be put back what the cancelled hand moved');
if (!/phase = 'betting';/.test(ud))
  throw new Error('betting must reopen so any bar may be stacked');
/* ORDER MATTERS: clearBet only pays out while phase is betting, so the
   phase must be reopened BEFORE it is called. Swap these and the chip
   silently stays on the tray — the undo looks like it worked and the
   bank is short by exactly the house's stake. */
if (ud.indexOf("phase = 'betting';") > ud.indexOf('clearBet();'))
  throw new Error('betting must reopen BEFORE clearBet, or the chip is never refunded');
if (!/drillFree = false;/.test(ud) || !/drillChart = null;/.test(ud) || !/drillReopen = false;/.test(ud))
  throw new Error('the free-hand flags must all go back');
if (/saveReplay|saveEv|saveCoach|evRound =|renderEvStrip/.test(ud))
  throw new Error('a taken-back hand was never played: nothing may be booked');
console.log('the undo: token++ cancels, the hand clears, the chip returns, the count is put back, betting reopens');

/* --- a decided hand is never taken back --- */
for (const fn of ['hit()', 'stand()', 'doubleDown()']) {
  const body = grab('  function ' + fn + ' {', '\n  }');
  if (!/drillAuto = null;/.test(body))
    throw new Error(fn + ' must close the undo: the hand was played from');
}
if (!/if \(drillReopen\) \{\s*\n\s*drillReopen = false;\s*\n\s*drillAuto = null;/.test(src))
  throw new Error('the settled free hand must close the undo');
if (!/drillFree = false; drillReopen = false; drillAuto = null;/.test(src))
  throw new Error('the full reset must close the undo');
console.log('the close: hit, stand, double, the settle and the reset all shut the undo');

/* --- the state is declared once, and it starts shut --- */
if (!/var drillAuto = null;/.test(src))
  throw new Error('drillAuto must be declared, and start empty');
const decl = src.match(/var drillAuto = null;/g) || [];
if (decl.length !== 1) throw new Error('drillAuto must be declared exactly once: ' + decl.length);
console.log('the state: one declaration, starts shut, and nothing books a hand it undid');

/* --- THE UNDO MUST BE REACHABLE WHERE THE PLAYER LOOKS. -------------
   The handler existing is not the promise. The status line tells the
   player "tap that bar again to take it back", so that bar has to still
   be there when they do. It was not: the tappable EV bars are drawn only
   in the review sheet, and dealing a hand LEAVES the review ("one mode
   at a time"), so the very tap that staked the hand destroyed the only
   control that could undo it. The undo was real, reachable, and
   untouchable — and a unit test that calls undoBarTap() directly can
   never see that. So the panel now carries the take-back itself.        */
const panel = grab("      (drillAuto\n", "      heldHtml +");
if (!/Out now: /.test(panel))
  throw new Error('while a house-staked hand is out, the panel must say so');
if (!/<span class="ixundo" data-cell="'/ .test(panel))
  throw new Error('the take-back must be a real control, not a sentence');
if (!/role="button" tabindex="0"/.test(panel))
  throw new Error('the take-back carries role and tabindex, or a keyboard cannot reach it');
if (!/take this hand back/.test(panel))
  throw new Error('the take-back must say what tapping it does');
/* the old sentence must be REPLACED, not merely followed: "next hand the
   shoe deals" is a different claim, and both at once would be a lie */
if (!/next \? 'Next hand: /.test(panel))
  throw new Error('with nothing out, the panel must still name the next hand');
/* the two sentences must be ALTERNATIVES, not a pair: one hand cannot be
   both out now and promised as the next. The ternary is what says so. */
if (!/\? 'Out now: /.test(panel) || !/: next \? 'Next hand: /.test(panel))
  throw new Error('the out-now sentence must stand in place of the next-hand one, never beside it');
if (panel.indexOf("'Out now: ") > panel.indexOf(": next ? 'Next hand: "))
  throw new Error('the out-now branch must come FIRST, or a hand out would still be promised as next');

/* the panel is drawn BEFORE the hand is staked, so it must be drawn again
   after — otherwise the way back is not on the page yet, which is exactly
   how this shipped broken */
const stake = grab("      drillAuto = { cell: cell, hiLo: hiLo, roundNo: roundNo };\n      deal();", "      setStatus('Drill: ");
if (!/renderLeaks\(\);/.test(stake))
  throw new Error('the panel must be redrawn once drillAuto exists, or the take-back never reaches the page');

/* both gestures, or it is a mouse-only control */
const clicks = grab("leakBoxEl.addEventListener('click'", "\n  });");
if (!/closest\('\.ixundo'\)\)\s*\n?\s*undoBarTap\(\);/.test(clicks))
  throw new Error('a click on the take-back must undo');
const keys = grab("leakBoxEl.addEventListener('keydown'", "closest('.sparkwk')");
if (!/closest\('\.ixundo'\)/.test(keys) || !/undoBarTap\(\);/.test(keys))
  throw new Error('Enter and Space must fire the take-back too: it carries role=button and tabindex');

/* and it must be styled as the control it is */
if (!/\.leaks \.ixundo \{ cursor: pointer; color: #d8b56a;/.test(src))
  throw new Error('the take-back must look like a control');
if (!/\.leaks \.ixundo:focus-visible/.test(src))
  throw new Error('a keyboard that lands on the take-back must see where it is');
console.log('the way back: the panel carries the take-back, and both gestures fire it');

console.log('\nbar tap undo verified');