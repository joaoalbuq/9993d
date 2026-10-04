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
  /* a signed figure in the strip's own spelling: one decimal where the
     engine is quoted (its prices are fractions), grouped chips where the
     felt is, and the typographic minus either way. It was a helper
     inside stripLine; it is lifted out because a hover has to say the
     same figures in plain text, and a second spelling of the engine's
     leg would be one more thing to keep in agreement. */
  function signed(v, dec) {
    return (v < 0 ? '\u2212' : '+') + (dec ? Math.abs(v).toFixed(1) : chips(Math.abs(v)));
  }
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
    var b = band(s), sig = sigma(s), tn = tone(s), ov = out(s);
    var cls = 'luck' + (tn ? ' ' + tn : '') + (ov ? ' over' : '') + (crossed ? ' crossed' : '');
    return 'EV <b>' + signed(s.ev, true) + '</b> engine \u00b7 <b>' + signed(s.felt) + '</b> felt \u00b7 <b' +
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
  /* THE TREND SPARKLINE, shared so both felts draw the same shape
     from the same numbers. It lived on the practice floor alone,
     which meant the table could show a cell's direction (this week
     against last) but never its line: two answers to "how has this
     cell been bleeding", from the one ledger both surfaces read.
     So the walk, the glyphs and the direction all moved here, and
     the floor now calls these. Eight weeks is the window EVERYWHERE
     it is drawn — the leak rows and the EV bars are the same series
     for the same cell, and two lengths of one series would be two
     answers. A week never seen is skipped, not zero-filled: a
     zero-filling line would read as a week that leaked nothing.  */
  var SPARK_WEEKS = 8;
  /* EVERY readable week, oldest first. The window below pages over
     this walk rather than slicing it off the end, so a week that
     leaves the line has not left the record: it is one page back.  */
  function sparkAll(lk, wb, cell, now) {
    now = now || Date.now();
    var keys = [], k;
    for (k in wb) keys.push(Number(k));
    keys.sort(function (a, b) { return a - b; });
    var out = [], i;
    for (i = 0; i < keys.length; i++) {
      var l = leakedIn(lk, wb, cell, keys[i], now);
      if (l != null) out.push({ ws: keys[i], v: l });
    }
    return out;
  }
  /* how many windows of history a cell actually has. Never zero:
     with nothing to page through there is still the newest page.  */
  function sparkPages(lk, wb, cell, now) {
    var n = sparkAll(lk, wb, cell, now).length;
    return n < 2 ? 1 : Math.ceil(n / SPARK_WEEKS);
  }
  /* ONE window of weeks, oldest first. `back` counts whole windows
     scrolled into the past, clamped to what exists — a player can
     walk the whole ladder but never off the end of it. The oldest
     window is short when the record does not fill it.            */
  function sparkWeeks(lk, wb, cell, now, back) {
    var a = sparkAll(lk, wb, cell, now);
    var pages = a.length < 2 ? 1 : Math.ceil(a.length / SPARK_WEEKS);
    back = Math.floor(Number(back) || 0);
    if (!(back > 0)) back = 0;               /* NaN and junk read as the newest */
    if (back > pages - 1) back = pages - 1;
    var end = a.length - back * SPARK_WEEKS;
    var start = end - SPARK_WEEKS;
    if (start < 0) start = 0;
    if (end < 0) end = 0;
    return a.slice(start, end);
  }
  function sparkValues(lk, wb, cell, now, back) {
    var w = sparkWeeks(lk, wb, cell, now, back), vals = [], i;
    for (i = 0; i < w.length; i++) vals.push(w[i].v);
    return vals;
  }
  /* eight steps of ink, the series scaled to its own range: a flat
     series sits on the mid glyph, a rising one climbs left to
     right. Fewer than two points, or no leak anywhere, is no line. */
  function sparkLine(vals) {
    if (!vals || vals.length < 2) return '';
    var max = vals[0], min = vals[0], i;
    for (i = 1; i < vals.length; i++) {
      if (vals[i] > max) max = vals[i];
      if (vals[i] < min) min = vals[i];
    }
    if (!(max > 0)) return '';                 /* no leak anywhere: no line */
    var glyph = '\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';   /* the ladder of eight: no canvas, no font swap */
    var out = '';
    for (i = 0; i < vals.length; i++) {
      var v = max > min ? (vals[i] - min) / (max - min) : 0.5;
      if (!(v > 0)) v = 0;
      if (v > 1) v = 1;
      out += glyph.charAt(Math.min(7, Math.round(v * 7)));
    }
    return out;
  }
  /* the line's own direction: newest against oldest. -1 is
     improving — the latest week bled less than the first.  */
  function sparkDir(vals) {
    if (!vals || vals.length < 2) return 0;
    var first = vals[0], last = vals[vals.length - 1];
    return last < first ? -1 : last > first ? 1 : 0;
  }
  /* the week-over-week marker, built ONCE for both felts. The glyph
     says which way a cell is bleeding; the figures say by how much.
     A direction with no magnitude beside it is only half an answer,
     and the live table used to draw exactly that half. Nothing here
     needs escaping: the figures are numbers and the wording is ours.*/
  /* The two books, side by side. `combined` is the WHOLE reconciliation
   and `named` the part of it belonging to one felt; `rest` is the
   other felt's own. It only reads as two when BOTH sides hold rounds
   — a book with none of its own has no luck to set beside the other's,
   and a reset on either side (the counts disagreeing) reads as one. */
  function splitFelt(combined, named) {
    if (!named || !(named.rounds > 0)) return null;
    if (!combined || combined.rounds <= named.rounds) return null;
    return {
      named: { rounds: named.rounds, ev: named.ev, felt: named.felt, sd2: named.sd2 },
      rest: { rounds: combined.rounds - named.rounds, ev: combined.ev - named.ev,
              felt: combined.felt - named.felt, sd2: combined.sd2 - named.sd2 }
    };
  }
  /* one felt of the duel, read the strip's way: the signed gap, its
     band and the sigma that measures it — each book against its OWN
     accumulated spread, so each side's hot and cold are sizes too,
     not just a sign. `crossed` blooms THIS side on the one draw its
     own gap tops its own first spread. A book from before the spread
     banked no width, so its sigma is genuinely unknown — the side
     says so rather than standing there as a bare sign the player
     could read as "no spreads run".                               */
  function feltTag(label, s, crossed) {
    var tn = tone(s);            /* the same sign-only colour the strip keeps */
    var bd = band(s), sg = sigma(s), ov = out(s);
    var cls = 'luck' + (tn ? ' ' + tn : '') + (ov ? ' over' : '') + (crossed ? ' crossed' : '');
    return label + ' <b' + (tn || ov || crossed ? ' class="' + cls + '"' : '') + '>' + word(s) + '</b>' +
      (bd ? ' ' + bd : '') +
      ' <span class="sd' + (sg ? '' : ' na') + '">' + (sg || 'no spread yet') + '</span>';
  }
  function leakFig(v) {
    /* a leak figure in the floor's shorthand: a minus for chips thrown
       away, and NOTHING in front of a figure that is already negative.
       A cell being drilled away reads negative, so prefixing that sign
       gave a double one — an em dash then a minus — that reads as
       nothing at all rather than as a recovery.                    */
    var n = Math.round(v);
    return n < 0 ? String(n) : '\u2212' + n;
  }
  function weekPillHtml(wk) {
    if (!wk) return '';                 /* no basis on either end: no marker at all */
    var tone = wk.dir < 0 ? 'down' : wk.dir > 0 ? 'up' : 'flat';
    var why = wk.dir < 0 ? 'bleeding less than last week'
      : wk.dir > 0 ? 'bleeding more than last week' : 'bleeding the same as last week';
    return ' <span class="wk evdir ' + tone + '" title="chips leaked this week v last week \u00b7 ' +
      leakFig(wk.now) + ' this week against ' + leakFig(wk.was) + ' last week \u00b7 ' + why + '">' +
      (wk.dir < 0 ? '\u25BC' : wk.dir > 0 ? '\u25B2' : '\u00b7') + ' ' +
      Math.round(wk.now) + ' v ' + Math.round(wk.was) + '</span>';
  }
  return { HAND_SD: HAND_SD, chips: chips, signed: signed, word: word, band: band, sigma: sigma,
           tone: tone, out: out, cross: cross, stripLine: stripLine,
           z: z, bandOf: bandOf, zSig: zSig,
           weekStart: weekStart, prevWeek: prevWeek, nextWeek: nextWeek,
           leakedIn: leakedIn, weekSplit: weekSplit, weekDir: weekDir,
           SPARK_WEEKS: SPARK_WEEKS,
           sparkWeeks: sparkWeeks, sparkValues: sparkValues,
           sparkAll: sparkAll, sparkPages: sparkPages,
           sparkLine: sparkLine, sparkDir: sparkDir,
           weekPillHtml: weekPillHtml, leakFig: leakFig,
           splitFelt: splitFelt, feltTag: feltTag,
           evFields: EV_FIELDS.slice(), evRestore: evRestore, evMigrated: evMigrated,
           numInto: numInto };
});
