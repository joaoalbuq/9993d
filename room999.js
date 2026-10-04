/* room999.js — the voices of the two felts, in one place.
   ---------------------------------------------------------------
   Both surfaces already shared their luck arithmetic in luck999.js,
   for one reason: a value written twice on two pages eventually
   disagrees with itself, silently, and nobody hears the seam. The
   voices are the same hazard. The floor and the table each declare
   their own sends as bare numbers in their own source, which is how
   a tuning change made on one surface quietly fails to reach the
   other — or, worse, half-reaches it.

   So the whole voice vocabulary lives here: every voice either
   surface can sound, the gain it ships at, the room send it ships
   with, and the persisted tuning a player (or a developer) dials in.
   Neither page keeps a copy of a number that is listed here. A page
   asks `ROOM999.gain('clack')` and gets the shipped value until
   somebody tunes it, then the tuned one — and both surfaces get the
   same answer, because there is only one answer.

   The registry is deliberately dumb: names, defaults, and where each
   voice lives. Nothing here touches audio. The pages own their
   graphs; this file owns the numbers those graphs read.

   Tuning is by STEP, not by slider: a voice's gain moves in fixed
   dB-ish quanta and its send in fixed fractions, so a tuned value is
   always one of a small known set. That keeps the persisted record
   legible ("clack send 0.75×") instead of an arbitrary float, and it
   means two people tuning the same voice land on the same number.  */
(function (root) {
  'use strict';

  /* the store, resolved once and lazily: the pages have one, the tests
     hand in their own. Never touched at load, so merely loading this
     file cannot throw in a context with no storage at all. */
  var store = root && root.localStorage ? root.localStorage : null;

  /* The sent values are the table's own, value for value, and the
     floor reads them unchanged — the whole point of the last change.
     `where` says which surface can sound a voice: 'both' for the
     seven they share, or the single surface for the voices only it
     has (the floor's coach cue, the table's cut whisper, betting
     chime, shoe tap and bonus chime).                                  */
  var VOICES = [
    { id: 'riffle', label: 'riffle',   where: 'both',  note: 'the shuffle \u2014 four decks filling the air', gain: 0.09,  send: 1.7 },
    { id: 'whoosh', label: 'whoosh',   where: 'both',  note: 'the deal \u2014 air moving, so it swims',          gain: 0.05,  send: 1.5 },
    { id: 'stinger', label: 'stinger', where: 'both',  note: 'the verdict, blooming over it',              gain: 0.17,  send: 1.4 },
    { id: 'clack',  label: 'clack',    where: 'both',  note: 'chips on cloth \u2014 dry-ish, near the cloth', gain: 0.28,  send: 0.6 },
    { id: 'snap',   label: 'snap',     where: 'both',  note: 'the one plain voice: it lands on the cloth', gain: 0.20,  send: 0 },
    { id: 'cue',    label: 'coach cue', where: 'floor', note: 'calling across a quiet felt IS the room',    gain: 0.05,  send: 1.5 },
    { id: 'cut',    label: 'cut whisper', where: 'table', note: 'paper is nearly all air',                  gain: 0.05,  send: 1.25 },
    { id: 'bets',   label: 'betting chime', where: 'table', note: 'calls the round across the felt',          gain: 0.05,  send: 1.6 },
    { id: 'tap',    label: 'shoe tap', where: 'table',  note: 'one per card \u2014 must never stack',        gain: 0.055, send: 0.45 },
    { id: 'bonus',  label: 'bonus chime', where: 'table', note: 'pays out rather than calls',               gain: 0.05,  send: 1.3 },
    { id: 'chime', label: 'crossing chime', where: 'both', note: 'a felt tops its own spread \u2014 said, not celebrated', gain: 0.045, send: 2.0 }
  ];

  var BY_ID = {};
  for (var i = 0; i < VOICES.length; i++) BY_ID[VOICES[i].id] = VOICES[i];

  /* The tuning steps. Gain moves in the same small quanta for every
     voice (a sixth of its shipped level per step, floored at zero),
     so "one step quieter" means the same thing on a clack and on a
     whisper; send moves in fixed fractions of a turn, so the whole
     vocabulary stays on a ladder the ear already knows.            */
  var GAIN_STEPS = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];   /* × the shipped gain */
  var SEND_STEPS = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];    /* × the shipped send */

  var KEY = '999.room.tuning';

  /* The persisted record, read the lenient way: a stored tuning that
     cannot be used is dropped ALONE and the rest rides on, exactly as
     evRestore repairs a book rather than discarding it. A stored gain
     must be a real number at or above zero; a stored send must be a
     real number at or above zero. Anything else falls back to shipped. */
  function readTuning() {
    var out = {}, raw;
    if (!store) return out;
    try { raw = JSON.parse(store.getItem(KEY) || 'null'); } catch (e) { return out; }
    if (!raw || typeof raw !== 'object') return out;
    for (var id in raw) {
      if (!BY_ID[id] || !raw[id] || typeof raw[id] !== 'object') continue;
      var g = raw[id].g, s = raw[id].s;
      if (typeof g === 'number' && isFinite(g) && g >= 0) out[id] = { g: g };
      if (typeof s === 'number' && isFinite(s) && s >= 0) {
        if (!out[id]) out[id] = { g: 1 };
        out[id].s = s;
      }
    }
    return out;
  }
  function saveTuning(t) {
    if (!store) return;
    try { store.setItem(KEY, JSON.stringify(t)); } catch (e) { }
  }

  var tuned = readTuning();

  /* one voice's tuned record, or an empty one — never undefined, so a
     caller never has to guard */
  function rec(id) { return tuned[id] || { g: 1 }; }

  function ship(id) {
    var v = BY_ID[id];
    return v ? v : { gain: 1, send: 1, label: id, where: 'none', note: '' };
  }
  /* the gain a page should play a voice at: the shipped one until
     somebody tunes it */
  function gain(id) { return ship(id).gain * rec(id).g; }
  /* the send a page should route it through: the shipped one until
     tuned. The snap ships at 0 and stays at 0 unless tuned UP, which
     is the honest reading — it is dry by design, and tuning it into
     the room is a choice, not a default. */
  function send(id) {
    var s = ship(id).send, f = rec(id).s;
    if (f == null) return s;
    /* A voice that ships DRY (the snap) has a shipped send of zero, and a
       multiplier can never lift it out of nothing. So for such a voice the
       ladder is its send ABSOLUTELY: untouched it is still 0, and the
       first step up turns the room on rather than scaling a silence. */
    return s > 0 ? s * f : f;
  }

  /* the step ladder, exposed so a panel can draw the same rungs the
     setter climbs */
  function steps(kind) { return kind === 'g' ? GAIN_STEPS : SEND_STEPS; }

  /* Walk a voice one step up (dir > 0) or down (dir < 0) on `kind`.
     The ladder is relative to the SHIPPED value, so stepping down
     from a tuned value lands on the next rung below rather than
     compounding — the same number means the same thing every time. */
  function step(id, kind, dir) {
    var ladder = steps(kind);
    /* `cur` is already the MULTIPLIER on the ladder (1 = untouched), so
       the rung we stand on is that number itself \u2014 not a ratio against
       the shipped value, which would walk a voice off its own ladder */
    var r = rec(id);
    /* zero is a REAL rung \u2014 a muted voice \u2014 so only a missing value falls back
       to 1; treating 0 as unset would wrap the ladder round */
    var cur = (kind === 'g' ? r.g : r.s);
    if (cur == null) cur = 1;
    var factor = cur;
    var idx = 0, best = 1e9;
    for (var i = 0; i < ladder.length; i++) {
      var d = Math.abs(ladder[i] - factor);
      if (d < best) { best = d; idx = i; }
    }
    var next = idx + (dir > 0 ? 1 : -1);
    if (next < 0 || next >= ladder.length) return null;   /* already at an end */
    var val = ladder[next];
    if (!tuned[id]) tuned[id] = { g: 1 };
    if (kind === 'g') tuned[id].g = val; else tuned[id].s = val;
    saveTuning(tuned);
    return val;
  }
  /* put one voice, or every voice, back where it shipped */
  function reset(id) {
    if (id) { delete tuned[id]; } else { tuned = {}; }
    saveTuning(tuned);
  }
  function isTuned(id) { return !!tuned[id]; }
  function anyTuned() {
    for (var k in tuned) if (tuned[k] && (tuned[k].g !== 1 || (tuned[k].s != null && tuned[k].s !== 1))) return true;
    return false;
  }
  /* the voices a surface can sound, in registry order */
  function list(where) {
    return VOICES.filter(function (v) { return !where || v.where === 'both' || v.where === where; });
  }
  /* the level a voice is playing at, as a short string a row can print */
  function readout(id) {
    var r = rec(id);
    var g = r.g === 1 ? '' : ' \u00b7 gain ' + fmt(r.g) + '\u00d7';
    var s = (r.s == null || r.s === 1) ? '' : ' \u00b7 send ' + fmt(r.s) + '\u00d7';
    return (g || s) ? g + s : ' shipped';
  }
  function fmt(x) { return String(Math.round(x * 100) / 100); }

  /* ---- the preview panel -----------------------------------
     One renderer, both surfaces: a row per voice, with the voice's
     own name, what it is for, a tap to HEAR it alone (no round, no
     deal), and a stepper on each of its two numbers. The markup is
     here rather than on either page so the two panels cannot drift,
     and so the steppers climb the same ladder `step` climbs.     */
  function panelHtml(where) {
    var vs = list(where), rows = '', i, v, gi, si;
    for (i = 0; i < vs.length; i++) {
      v = vs[i];
      gi = currentFactor(v.id, 'g');
      si = currentFactor(v.id, 's');
      rows += '<div class="lvrow' + (isTuned(v.id) ? ' tuned' : '') + '" data-voice="' + v.id + '">' +
        '<span class="lvname" title="' + esc(v.note) + '">' + esc(v.label) + '</span>' +
        '<span class="lvplay" role="button" tabindex="0" data-lvplay="' + v.id +
        '" title="hear ' + esc(v.label) + ' on its own \u2014 no round, no deal">\u25B6</span>' +
        '<span class="lvstep" data-lvkind="g" data-lvvoice="' + v.id + '">' +
        '<span class="lvdown" data-lvstep="-1">\u25BC</span>' +
        '<span class="lvval">' + fmt(gi) + '\u00d7</span>' +
        '<span class="lvup" data-lvstep="1">\u25B2</span></span>' +
        '<span class="lvstep" data-lvkind="s" data-lvvoice="' + v.id + '">' +
        '<span class="lvdown" data-lvstep="-1">\u25BC</span>' +
        '<span class="lvval">' + fmt(si) + '\u00d7</span>' +
        '<span class="lvup" data-lvstep="1">\u25B2</span></span>' +
        '<span class="lvship" data-lvreset="' + v.id + '" title="put this voice back where it shipped">\u21BA</span>' +
        '</div>';
    }
    return '<p class="lvhead">Levels \u00b7 tap \u25B6 to hear a voice alone \u00b7 ' +
      '\u25BC\u25B2 step a gain or a send</p>' +
      '<div class="lvrows">' + rows + '</div>' +
      '<p class="lvfoot">' + (anyTuned() ?
        '<span class="lvreset" data-lvreset="all">\u21BA reset every voice</span> \u00b7 ' +
        'shared with the other felt \u2014 tuning here moves it there too.' :
        'Shipped levels. Tuning is remembered, and both felts read it.') + '</p>';
  }
  /* where a voice stands on its ladder, 1 = untouched */
  function currentFactor(id, kind) {
    var r = rec(id);
    var f = kind === 'g' ? r.g : r.s;
    /* a voice shipping dry STARTS at zero, so its first step up is the
       first rung of the room rather than a step above "no room" */
    if (f == null) return kind === 's' && ship(id).send <= 0 ? 0 : 1;
    return f;
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  root.ROOM999 = {
    VOICES: VOICES,
    list: list,
    ship: ship,
    gain: gain,
    send: send,
    steps: steps,
    step: step,
    reset: reset,
    isTuned: isTuned,
    anyTuned: anyTuned,
    readout: readout,
    panelHtml: panelHtml,
    currentFactor: currentFactor,
    esc: esc,
    KEY: KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Shipped as a plain <script> (window.ROOM999) on both pages, and
   required directly by the tests. */
if (typeof module === 'object' && module.exports) module.exports = (typeof window !== 'undefined' ? window : globalThis).ROOM999;