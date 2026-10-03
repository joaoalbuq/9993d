/* The measured gap, in one place. The practice floor and the live
   table both read the same luck arithmetic — the signed word, the
   band (the gap as a distance in the session's own spreads), the
   sigma that measures it, the sign-only colour, the crossing mark,
   and the reconciliation strip those all draw into — plus the one
   lenient restore they both read their book through, so a book
   saved by an older build is migrated field by field instead of
   being thrown away whole. They load this one file so the two
   surfaces cannot drift.

   Shipped as a plain <script> (window.LUCK999) on both pages, and
   required directly by the tests.                            */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LUCK999 = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var HAND_SD = 1.15;      /* a blackjack hand's spread, in betting units —
                              the engine prices the mean; this is how wide */
  /* plain chips: whole numbers grouped, halves to one decimal   */
  function chips(n) { return n % 1 ? n.toFixed(1) : n.toLocaleString(); }
  function gap(s) { return s.felt - s.ev; }
  /* the gap's own word: felt minus engine, one decimal, signed —
     the one number both the strip and the score lines read      */
  function word(s) {
    var luck = gap(s);
    return (luck < 0 ? '\u2212' : '+') + Math.abs(luck).toFixed(1);
  }
  /* the gap's own band: how unusual is this luck? The session's
     spread is the square root of the accumulated per-round
     variance, so the gap reads as a distance in those spreads —
     even inside one, cool or warm inside two, cold or hot inside
     three, and past three a freak either way. Hot and cold are
     not moods; they are sizes.                             */
  /* the gap as a signed distance in the session's spreads — the one
     quantity the band word, the sigma and the remembered extremes
     all read. Null when nothing has spread.                   */
  function z(s) {
    var sd = Math.sqrt(s.sd2 || 0);
    if (!sd) return null;
    return gap(s) / sd;
  }
  /* the band word, from a signed z alone: even inside one spread,
     cool/warm inside two, cold/hot inside three, freak past.  */
  function bandOf(z) {
    var az = Math.abs(z);
    if (!(az >= 1)) return 'even';
    if (az < 2) return z < 0 ? 'cool' : 'warm';
    if (az < 3) return z < 0 ? 'cold' : 'hot';
    return z < 0 ? 'freak cold' : 'freak hot';
  }
  /* the sigma string, from a signed z: "+2.4σ" */
  function zSig(z) {
    return (z < 0 ? '\u2212' : '+') + Math.abs(z).toFixed(1) + '\u03c3';
  }
  function band(s) {
    var zz = z(s);
    return zz == null ? '' : bandOf(zz);
  }
  /* the quality readout: the gap measured in the engine's own
     spreads, signed one decimal, so a hot streak knows HOW hot
     it is — "+2.4σ". The band names the size; this measures it.
     Nothing spread, nothing to measure.                     */
  function sigma(s) {
    var zz = z(s);
    return zz == null ? '' : zSig(zz);
  }
  /* the luck's colour, by sign: run-good — a felt ABOVE the engine —
     always reads green, however far it runs; only a COLD gap, the
     felt behind the engine, reads red. The distance from even no
     longer picks the colour, only the sign. Dead even is no call at
     all, and no spread keeps the strip's own gold.          */
  function tone(s) {
    if (!Math.sqrt(s.sd2 || 0)) return '';   /* a book from before the spread keeps its gold */
    var luck = gap(s);
    return luck > 0 ? 'ok' : luck < 0 ? 'out' : '';
  }
  /* the crossing: the band leaves "even" the moment the gap tops
     its first spread — that edge is the outlier mark, hot or cold
     alike. `prev` is the last draw's mark, null before the first,
     so a session restored already past a spread sets its mark
     quietly instead of pulsing on load.                     */
  function out(s) {
    var b = band(s);
    return !!b && b !== 'even';
  }
  function cross(prev, s) {
    var now = out(s);
    return { out: now, fire: prev !== null && now && !prev };
  }
  /* The book, restored the lenient way, the way the replay reel
     reads its own: a stored entry that cannot be used is repaired
     or dropped ALONE and the rest of the record rides on. So the
     reconciliation walks its four fields one at a time, keeps every
     one that is a real number, and starts a fresh book only when
     there was nothing to keep. A book written before the spread —
     rounds, engine and felt but no sd2 — is MIGRATED, not thrown
     away: its totals stay exactly as they were and the band simply
     has nothing to measure against until the next round adds one.
     Returns a complete book, whatever was stored.               */
  var EV_FIELDS = ['rounds', 'ev', 'felt', 'sd2'];
  function plain(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function evRestore(raw) {
    var b = { rounds: 0, ev: 0, felt: 0, sd2: 0 }, i, v;
    if (raw && typeof raw === 'object') {
      for (i = 0; i < EV_FIELDS.length; i++) {
        v = plain(raw[EV_FIELDS[i]]);
        if (v != null) b[EV_FIELDS[i]] = v;
      }
    }
    if (b.rounds < 0) b.rounds = 0;   /* a count and a sum of squares
                                          are never negative: a book
                                          that says so is repaired
                                          here, not discarded    */
    if (b.sd2 < 0) b.sd2 = 0;
    return b;
  }
  /* did a stored book need repairing or migrating on the way in?
     The two surfaces say so in their own words when they did.   */
  function evMigrated(raw) {
    if (!raw || typeof raw !== 'object') return false;
    for (var i = 0; i < EV_FIELDS.length; i++) {
      if (plain(raw[EV_FIELDS[i]]) == null) return true;
    }
    return raw.rounds < 0 || raw.sd2 < 0;
  }
  /* the reconciliation strip: engine and felt, the gap, the rounds,
     the signed sigma and the band — the same markup on both
     surfaces. `crossed` adds the pulse class on the one draw the
     gap tops its first spread                              */
  function stripLine(s, crossed) {
    if (!s || !s.rounds) return '';
    function w(v, dec) {
      return (v < 0 ? '\u2212' : '+') + (dec ? Math.abs(v).toFixed(1) : chips(Math.abs(v)));
    }
    var b = band(s), sig = sigma(s), tn = tone(s);
    var cls = 'luck' + (tn ? ' ' + tn : '') + (crossed ? ' crossed' : '');
    return 'EV <b>' + w(s.ev, true) + '</b> engine \u00b7 <b>' + w(s.felt) + '</b> felt \u00b7 <b' +
      (tn || crossed ? ' class="' + cls + '"' : '') + '>' + word(s) + '</b> luck \u00b7 ' +
      s.rounds + ' round' + (s.rounds === 1 ? '' : 's') +
      (sig ? ' \u00b7 <span class="sd">' + sig + '</span>' + (b ? ' ' + b : '') : '');
  }
  return { HAND_SD: HAND_SD, chips: chips, word: word, band: band, sigma: sigma,
           tone: tone, out: out, cross: cross, stripLine: stripLine,
           z: z, bandOf: bandOf, zSig: zSig,
           evFields: EV_FIELDS.slice(), evRestore: evRestore, evMigrated: evMigrated };
});
