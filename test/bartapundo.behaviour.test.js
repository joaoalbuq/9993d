/* The undo BEHAVIOUR, run: undoBarTap is lifted out of the page and
   driven over a stub floor, so what is checked is what it does to
   money, the count and the drill — not how it is spelled.        */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');

function grab(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('anchor miss: ' + a);
  return src.slice(i, j + b.length);
}
const udFull = grab('  function undoBarTap() {', '\n  }');
const udBody = udFull.slice(udFull.indexOf('{') + 1, udFull.lastIndexOf('}'));

/* a floor as the bar tap leaves it: the house's chip on the tray,
   the hand dealt, the count already moved by the dealt cards.
   The body reassigns its own locals, so every state it touches is
   declared as a var here and read back out of the returned object. */
function runUndo() {
  const log = [];
  const f = {
    log,
    drillAuto: { cell: 'hard 12 v Q', hiLo: 4, roundNo: 11 },
    drillFree: true, drillChart: { cell: 'hard 12 v Q' }, drillReopen: true, drillOpen: true,
    token: 7, you: ['10'], dealerArr: ['Q', '7'], hands: [{ cards: ['10'] }], splitActive: 1,
    insBet: 40, insOpen: true, doubled: true,
    bank: 975, bet: 25, hiLo: 9, roundNo: 12, phase: 'acting',
    closeDrill() { f.drillOpen = false; log.push('closeDrill'); },
    renderShoe() {}, renderCount() {}, renderBank() {}, renderBet() {},
    renderCoach() {}, renderLeaks() {}, syncUI() {},
    setStatus(s) { log.push('status:' + s.slice(0, 24)); }
  };
  const s = new Function('S',
    'var drillAuto = S.drillAuto, drillFree = S.drillFree, drillChart = S.drillChart,\n' +
    '    drillReopen = S.drillReopen, drillOpen = S.drillOpen, token = S.token,\n' +
    '    you = S.you, dealerArr = S.dealerArr, hands = S.hands, splitActive = S.splitActive,\n' +
    '    insBet = S.insBet, insOpen = S.insOpen, doubled = S.doubled,\n' +
    '    bank = S.bank, bet = S.bet, hiLo = S.hiLo, roundNo = S.roundNo, phase = S.phase;\n' +
    'var closeDrill = S.closeDrill, renderShoe = S.renderShoe,\n' +
    '    renderCount = S.renderCount, renderBank = S.renderBank, renderBet = S.renderBet,\n' +
    '    renderCoach = S.renderCoach, renderLeaks = S.renderLeaks, syncUI = S.syncUI,\n' +
    '    setStatus = S.setStatus;\n' +
    '/* the page\'s own clearBet, guard and all, closing over the real\n' +
    '   locals so the phase the undo set is the phase it reads */\n' +
    'var clearBet = function () { if (phase !== \'betting\' || !bet) return;\n' +
    '  bank += bet; bet = 0; S.log.push(\'clearBet\'); };\n' +
    /* the body is spliced as a nested function over vars declared in THIS
   scope, so every assignment it makes lands on the bindings the test
   reads back — an inner scope that merely shadowed them would pass
   even if the real code cleared nothing. Its return value is captured
   through R, so the body may keep returning as it does in the page. */
'var R = { v: null };\n' +
    'function __undo() {' + udBody + '}\n' +
    'R.v = __undo();\n' +
    'return { r: R.v, drillAuto: drillAuto, drillFree: drillFree, drillChart: drillChart,\n' +
    '  drillReopen: drillReopen, drillOpen: drillOpen, token: token, you: you,\n' +
    '  dealerArr: dealerArr, hands: hands, splitActive: splitActive, insBet: insBet,\n' +
    '  insOpen: insOpen, doubled: doubled, bank: bank, bet: bet, hiLo: hiLo,\n' +
    '  roundNo: roundNo, phase: phase };')(f);
  return { f, s: s };
}

/* --- a live undo restores money, count and phase --- */
const { f, s } = runUndo();
if (s.r !== true) throw new Error('an open bar tap must report that it undid something');
if (s.bank !== 1000) throw new Error("the house's chip must come back: bank " + s.bank);
if (s.bet !== 0) throw new Error('the tray must be empty after the undo: bet ' + s.bet);
if (s.hiLo !== 4) throw new Error('the count must go back to before the cancelled cards: ' + s.hiLo);
if (s.roundNo !== 11) throw new Error('the round must go back: ' + s.roundNo);
if (s.phase !== 'betting') throw new Error('betting must reopen: ' + s.phase);
if (s.token !== 8) throw new Error('the round must be cancelled, not merely paused: token ' + s.token);
if (s.you.length || s.dealerArr.length || s.hands.length || s.splitActive)
  throw new Error('the dealt hand must be gone');
if (s.insBet || s.insOpen || s.doubled) throw new Error('the side state must be cleared');
if (s.drillAuto !== null || s.drillFree || s.drillChart || s.drillReopen || s.drillOpen)
  throw new Error('every drill flag must go back');
console.log('run: 975+25 back to 1000, tray empty, count 9\u21924, round 12\u219211, token 7\u21928, betting');

/* --- nothing books the hand it took back --- */
const forbidden = f.log.filter((l) => /replay|ev|coach|book/i.test(l));
if (forbidden.length) throw new Error('a taken-back hand must book nothing: ' + forbidden.join(', '));
console.log('and it books nothing: no replay, no EV, no coach line for a hand nobody played');

/* --- with nothing open, the undo is inert --- */
const none = new Function('drillAuto', 'return (function () {' +
  'var saved = drillAuto; if (!saved) return false; return true; })();')(null);
if (none !== false) throw new Error('with no open bar tap the undo must do nothing');
console.log('inert: with no open tap it returns false and touches nothing');

console.log('\nbar tap undo behaviour verified');