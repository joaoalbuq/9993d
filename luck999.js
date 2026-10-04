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
     gap tops its first spread.

     `over` is the other half of that mark, and the standing one: it
     rides WHILE the gap is past a spread, not only on the draw it got
     there. The crossing flash says an outlier happened; once it is
     over, the band word was the only thing still saying so, and a
     word is exactly what the eye skips. `over` lets the NUMBER carry
     it — a soft bloom in its own tone — so an outlier session can be
     seen without reading `hot` or `cold`. Same test as the band edge,
     so the glow and the word can never disagree about a session.  */
  function stripLine(s, crossed) {
    if (!s || !s.rounds) return '';
    function w(v, dec) {
      return (v < 0 ? '\u2212' : '+') + (dec ? Math.abs(v).toFixed(1) : chips(Math.abs(v)));
    }
    var b = band(s), sig = sigma(s), tn = tone(s), ov = out(s);
    var cls = 'luck' + (tn ? ' ' + tn : '') + (ov ? ' over' : '') + (crossed ? ' crossed' : '');
    return 'EV <b>' + w(s.ev, true) + '</b> engine \u00b7 <b>' + w(s.felt) + '</b> felt \u00b7 <b' +
      (tn || ov || crossed ? ' class="' + cls + '"' : '') + '>' + word(s) + '</b> luck \u00b7 ' +
      s.rounds + ' round' + (s.rounds === 1 ? '' : 's') +
      (sig ? ' \u00b7 <span class="sd">' + sig + '</span>' + (b ? ' ' + b : '') : '');
  }
  /* ---- the week over week, and nothing else --------------------- */
  /* Both surfaces show how much a cell leaked THIS week against last, off
     one shared set of Monday-midnight snapshots (`999.practice.weekbase`).
     That reading used to be written twice — the floor's `leakedIn` over its
     own ledger, the table's `leakedInT` over the same one handed in — and the
     two copies were identical arithmetic under different names. A week that
     ran to a different boundary on one surface would have disagreed with the
     other silently, which is exactly the drift this file exists to stop.

     So it lives here, PURE: the ledger and the snapshot map are arguments,
     never storage. The floor passes its own, the table passes the floor's
     read back, and neither can reach the other's bookkeeping. What stays
     local to each page is only where the snapshots are stored and when they
     are written — policy, not arithmetic.                             */
  function weekStart(ms) {                 /* Monday 00:00, local */
    var d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  }
  function prevWeek(ws) { var d = new Date(ws); d.setDate(d.getDate() - 7); return d.getTime(); }
  function nextWeek(ws) { var d = new Date(ws); d.setDate(d.getDate() + 7); return d.getTime(); }
  /* chips leaked inside week ws: the ledger's move from that week's snapshot
     to the next week's — the present, for a week still running. A CLOSED week
     needs the NEXT snapshot to know where it ended, and a week missing one
     says nothing rather than guessing. Null when it cannot be measured. */
  function leakedIn(lk, wb, cell, ws, now) {
    now = now || Date.now();
    if (!wb || !wb[ws]) return null;
    var before = wb[ws][cell] || 0;
    if (ws === weekStart(now)) return ((lk && lk[cell] && lk[cell].cost) || 0) - before;
    var nx = wb[nextWeek(ws)];
    if (!nx) return null;
    return (nx[cell] || 0) - before;
  }
  /* this week's leak against last week's, in chips, with the direction:
     -1 improving (it bled less), 1 worsening, 0 level. Null when either week
     cannot be weighed, so an unmarked cell says nothing rather than inventing
     a direction. */
  function weekSplit(lk, wb, cell, now) {
    now = now || Date.now();
    var cur = weekStart(now), prev = prevWeek(cur);
    if (!wb || !wb[cur] || !wb[prev]) return null;
    var l = leakedIn(lk, wb, cell, cur, now), was = leakedIn(lk, wb, cell, prev, now);
    if (l == null || was == null) return null;
    return { now: l, was: was, dir: l < was ? -1 : l > was ? 1 : 0 };
  }
  /* The same leniency for the plain records, not just the book: a stored
     object is repaired ONE FIELD at a time, and the rest of it rides on.
     The fault this prevents is old and quiet — `if (raw && typeof raw.a
     === 'number' && typeof raw.b === 'number') use(raw)` — where a
     single bad field throws the whole record away, so a player's months
     of discipline record vanish because one counter was saved as a
     string. Here `seed` says what a sound record looks like; every
     finite number in `raw` keeps its value, and anything unreadable in
     it keeps the seed's, field by field. Nested objects, arrays and
     explicit nulls ride through untouched, because "never recorded" and
     "recorded as an object" are answers, not damage — and the SEED
     declares what kind each field is, so a number can never land in a
     field that holds an object and an array can never stand in for a
     count. A field the seed does not know is dropped: the shape on
     record is the one this build writes.                          */
  function numInto(raw, seed) {
    var out = {}, k, v, s;
    for (k in seed) out[k] = seed[k];
    if (raw && typeof raw === 'object') {
      for (k in raw) {
        v = raw[k];
        s = seed[k];
        if (typeof v === 'number') {
          if (isFinite(v) && (typeof s === 'number' || s === null)) out[k] = v;
        } else if (v === null) {
          if (s === null || typeof s === 'object') out[k] = null;
        } else if (v && typeof v === 'object' && (typeof s === 'object' || s === null)) {
          out[k] = v;
        }
      }
    }
    return out;
  }
  function weekDir(lk, wb, cell, now) {
    var w = weekSplit(lk, wb, cell, now);
    return w ? w.dir : null;
  }
  return { HAND_SD: HAND_SD, chips: chips, word: word, band: band, sigma: sigma,
           tone: tone, out: out, cross: cross, stripLine: stripLine,
           z: z, bandOf: bandOf, zSig: zSig,
           weekStart: weekStart, prevWeek: prevWeek, nextWeek: nextWeek,
           leakedIn: leakedIn, weekSplit: weekSplit, weekDir: weekDir,
           evFields: EV_FIELDS.slice(), evRestore: evRestore, evMigrated: evMigrated,
           numInto: numInto };
});
