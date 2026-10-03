/* The pricing engine, in one place: an infinite deck in S17 with
   European no-peek, priced from the upcard as the expected chips
   back per unit staked. The gap between the book play and the
   click is the price of the mistake — accuracy alone never showed
   that. The engine shares the canon rules; it only ever judges,
   never deals.

   Shipped as a plain <script> (window.EV999) on both pages, and
   required directly by the tests.                            */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EV999 = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function val(r) {
    return r === 'A' ? 11 : (r === '10' || r === 'J' || r === 'Q' || r === 'K') ? 10 : parseInt(r, 10);
  }
  var dists = {};                      /* up rank -> dealer final distribution */
  function dealerDist(up) {
    if (dists[up]) return dists[up];
    var d = {};
    function step(t, aces, nc, p) {    /* aces = live aces still counting 11 */
      if (t >= 17) {                   /* S17: every 17 stands */
        var k = t + '|' + (nc === 2 ? 2 : 3);
        d[k] = (d[k] || 0) + p;
        return;
      }
      for (var i = 0; i < RANKS.length; i++) {
        var r = RANKS[i], t2 = t + val(r), a2 = aces;
        if (r === 'A') a2++;
        while (t2 > 21 && a2) { t2 -= 10; a2--; }
        if (t2 > 21) d.bust = (d.bust || 0) + p / 13;
        else step(t2, a2, nc + 1, p / 13);
      }
    }
    step(val(up), up === 'A' ? 1 : 0, 1, 1);
    dists[up] = d;
    return d;
  }
  var tables = {};                     /* up rank -> the stand/hit return tables */
  function tbl(up) {
    if (tables[up]) return tables[up];
    var d = dealerDist(up), S = {}, W = {};
    function pay(t, f) {
      if (f === 'bust') return 2;
      var fv = parseInt(f, 10);
      return t > fv ? 2 : t === fv ? 1 : 0;
    }
    /* stand: every final but the dealer's two-card natural
       pays — the natural itself returns zero (European)     */
    for (var t = 4; t <= 21; t++) {
      var s = 0;
      for (var k in d) if (k !== '21|2') s += d[k] * pay(t, k);
      S[t] = s;
    }
    function hitCont(t, aces) {        /* the return of drawing, then playing on */
      var key = t + '|' + aces;
      if (W[key] != null) return W[key];
      var h = 0;
      for (var i = 0; i < RANKS.length; i++) {
        var r = RANKS[i], t2 = t + val(r), a2 = aces;
        if (r === 'A') a2++;
        while (t2 > 21 && a2) { t2 -= 10; a2--; }
        if (t2 > 21) continue;         /* the draw busts: zero back */
        h += (1 / 13) * Math.max(S[t2], hitCont(t2, a2));
      }
      W[key] = h;
      return h;
    }
    tables[up] = { S: S, hit: hitCont };
    return tables[up];
  }
  function prices(t, soft, up, canDouble) {
    /* every price is the expected PROFIT per unit staked —
       the stake itself is netted out, so stand, hit and double
       are comparable in the chips they actually make or lose  */
    var aces = soft ? 1 : 0;           /* two aces can never both count 11 (22>21):
                                          a non-bust hand holds 0 or 1 live ace   */
    var T = tbl(up);
    var dbl = null;
    if (canDouble) {
      var e = 0;
      for (var i = 0; i < RANKS.length; i++) {
        var r = RANKS[i], t2 = t + val(r), a2 = aces;
        if (r === 'A') a2++;
        while (t2 > 21 && a2) { t2 -= 10; a2--; }
        if (t2 > 21) continue;
        e += (1 / 13) * T.S[t2];
      }
      dbl = 2 * e - 2;             /* two units STAKED: the price is the
                                      PROFIT, never the raw return — the
                                      extra unit is real money out        */
    }
    return { stand: T.S[t] - 1, hit: T.hit(t, aces) - 1, double: dbl };
  }
  return { prices: prices, dealerDist: dealerDist };
});
