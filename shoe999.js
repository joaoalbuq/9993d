/* The shoe and its settlement, in one place. The 3D table and the
   practice shoe deal from the same stack and settle by the same
   rules — the counts, the soft aces, the natural, the push, the
   3:2 — so both pages load this one file rather than each
   keeping a copy that could drift from the other.

   Shipped as a plain <script> (window.SHOE999) on both pages, and
   required directly by the tests.                            */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SHOE999 = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var TEN = { '10': 1, 'J': 1, 'Q': 1, 'K': 1 };
  function build(decks) {
    var a = [], d, s, r, i, j, t;
    for (d = 0; d < decks; d++)
      for (s = 0; s < 4; s++)
        for (r = 0; r < RANKS.length; r++) a.push({ rank: RANKS[r], suit: s });
    for (i = a.length - 1; i > 0; i--) {           /* Fisher-Yates */
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function draw(stack) {
    return stack.length ? stack.pop() : null;    /* pages reshuffle at their cut */
  }
  function cutBetween(cards, lo, hi) {           /* where the cut card lands */
    return Math.round(cards * (lo + Math.random() * (hi - lo)));
  }
  function value(cards, rname) {                 /* best total; soft = an ace still counts 11 */
    var rk = rname || 'rank', t = 0, aces = 0, i, r;
    for (i = 0; i < cards.length; i++) {
      r = cards[i][rk];
      if (r === 'A') { aces++; t += 11; }
      else if (TEN[r]) t += 10;
      else t += parseInt(r, 10);
    }
    while (t > 21 && aces) { t -= 10; aces--; }
    return { total: t, soft: aces > 0 };
  }
  function total(cards, rname) { return value(cards, rname).total; }
  /* the floor's one settlement (spec 5): bust 0, blackjack 3:2,
     win 2:1, push returns the stake. The European no-peek
     flavor both pages play: a dealer's natural takes the stake,
     naturals cancel to a push, a player natural pays 3:2.       */
  function settle(you, dealer, stake, rname) {
    var p = total(you, rname), d = total(dealer, rname);
    var nat = you.length === 2 && p === 21;
    var dn = dealer.length === 2 && d === 21;
    var kind;
    if (p > 21) kind = 'bust';
    else if (nat && dn) kind = 'push';
    else if (nat) kind = 'blackjack';
    else if (dn) kind = 'lose';
    else if (d > 21 || p > d) kind = 'win';
    else if (p === d) kind = 'push';
    else kind = 'lose';
    var mult = kind === 'blackjack' ? 2.5 : kind === 'win' ? 2 : kind === 'push' ? 1 : 0;
    return { kind: kind, mult: mult, prize: stake * mult, net: stake * mult - stake };
  }
  function chips(prize) {                        /* the money edge: integer chips, house rounds up */
    return Math.ceil(prize - 1e-9) + 0;
  }
  return { RANKS: RANKS, build: build, draw: draw, cutBetween: cutBetween,
           value: value, total: total, settle: settle, chips: chips };
});
