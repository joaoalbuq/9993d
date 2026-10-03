/* The count's corrections, in one place: the deviations from basic
   strategy that are correct ONLY at a count — thirteen v two runs
   the other way once the shoe goes cold, and insurance, the
   count's own bet, turns at +3. Below the threshold the chart
   rules.

   Shipped as a plain <script> (window.INDEX999) on both pages, and
   required directly by the tests.                            */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.INDEX999 = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var INDICES = {
    'hard 16 v 10': { play: 'stand', at: 1,
      why: 'tens left make a draw bust too often to chase' },
    'hard 15 v 10': { play: 'stand', at: 4,
      why: 'the same tens logic, but 15 needs a richer deck to stand' },
    'hard 13 v 2': { play: 'hit', at: -1, below: true,
      why: 'a cold shoe keeps the dealer alive \u2014 better to draw small cards' },
    'hard 12 v 2': { play: 'stand', at: 1,
      why: 'tens left turn the dealer\'s weak 2 into busts' },
    'hard 12 v 3': { play: 'stand', at: 2,
      why: 'the 3 busts later than the 2 \u2014 it takes a richer deck' },
    'hard 11 v A': { play: 'double', at: 1,
      why: 'fewer aces left make the unseen natural cheaper to chase' },
    'hard 10 v 10': { play: 'double', at: 4,
      why: 'ten-rich shoes outdraw the dealer\'s 20 \u2014 two units on it' },
    'hard 9 v 2': { play: 'double', at: 1,
      why: 'tens land your 19 often enough to press a weak 2' }
  };
  var INSURE_AT = 3;                 /* the count's own bet: insurance turns at +3 */
  var INS_WHY_IN = 'more than a third of the deck is tens \u2014 the 2:1 pays';
  var INS_WHY_OUT = 'it pays only past a third tens \u2014 true +3 is that rich';
  function cell(t, soft, up) {
    return (soft ? 'soft ' : 'hard ') + t + ' v ' + (up === 11 ? 'A' : up);
  }
  function flip(t, soft, up, tc, canD) {
    var ix = INDICES[cell(t, soft, up)];
    if (!ix) return null;
    if (ix.play === 'double' && !canD) return null;   /* a double that isn't legal
                                                         is the chart's stand-in  */
    return (ix.below ? tc <= ix.at : tc >= ix.at) ? ix.play : null;
  }
  function tenDensity(stack) {       /* the exact share of ten-valued cards left */
    var tens = 0, i;
    for (i = 0; i < stack.length; i++) {
      var r = stack[i].rank;
      if (r === '10' || r === 'J' || r === 'Q' || r === 'K') tens++;
    }
    return stack.length ? tens / stack.length : 0;
  }
  function insEdge(stack) {          /* insurance pays 2:1: EV per unit = 3p − 1,
                                        breakeven at p = 1/3, near true +3       */
    return 3 * tenDensity(stack) - 1;
  }
  return { INDICES: INDICES, INSURE_AT: INSURE_AT, INS_WHY_IN: INS_WHY_IN,
           INS_WHY_OUT: INS_WHY_OUT, cell: cell,
           flip: flip, tenDensity: tenDensity, insEdge: insEdge };
});
