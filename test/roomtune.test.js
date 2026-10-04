/* The shared voice registry. Every voice either felt can sound, the
   gain and send it ships with, the tuning a Levels panel dials in, and
   the ladder that tuning climbs — plus the wiring that puts the panel on
   both pages and keeps either page from holding a number of its own.

   The ladder is the property most worth pinning: it is arithmetic that
   two surfaces depend on, it is stepped by hand in a UI, and both of its
   real bugs (walking a voice off its own ladder, and treating a muted
   rung as unset so the ladder wrapped instead of clamping) shipped
   because nothing here existed to catch them.                       */
'use strict';
const fs = require('fs');
const path = require('path');

/* a store we control, so the persistence is observed and not assumed */
const mem = {};
const store = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; }
};
for (const k of Object.keys(mem)) delete mem[k];
global.localStorage = store;

/* the module reads its store at load, so give it ours before it loads */
const src = fs.readFileSync(path.join(__dirname, '..', 'room999.js'), 'utf8');
/* loaded exactly the way a <script src="room999.js"> loads it: run the
   file, let it find the store we installed, and read what it published
   on the global. That is the object both pages actually get. */
new Function('root', src)(globalThis);
const R = globalThis.ROOM999;
if (!R) throw new Error('the registry must publish itself on its root');
if (typeof window === 'undefined' && R !== globalThis.ROOM999)
  throw new Error('the registry must hang off the global a page shares');
/* and the same file, pulled in as a module, must expose the same shape
   of API — not necessarily the same instance, since a double load is
   two registries over one store, which is exactly the tolerant path */
const Rq = require(path.join(__dirname, '..', 'room999.js'));
if (Object.keys(Rq).join() !== Object.keys(R).join())
  throw new Error('the module must export the same API it publishes');
if (!Rq.VOICES.length) throw new Error('the module export must carry the voices');

/* --- the shipped vocabulary: one answer, and it is the table's own --- */
const ids = R.VOICES.map(v => v.id);
if (ids.join(',') !== 'riffle,whoosh,stinger,clack,snap,cue,cut,bets,tap,bonus,chime')
  throw new Error('the registry must hold exactly the eleven voices: ' + ids.join(','));
const shipped = { riffle: 1.7, whoosh: 1.5, stinger: 1.4, clack: 0.6, snap: 0, cue: 1.5, cut: 1.25, bets: 1.6, tap: 0.45, bonus: 1.3, chime: 2.0 };
for (const [id, v] of Object.entries(shipped)) {
  if (R.send(id) !== v) throw new Error(id + ' must ship at send ' + v + ', not ' + R.send(id));
}
const gains = { riffle: 0.09, whoosh: 0.05, stinger: 0.17, clack: 0.28, snap: 0.20, cue: 0.05, cut: 0.05, bets: 0.05, tap: 0.055, bonus: 0.05 };
for (const [id, v] of Object.entries(gains)) {
  if (Math.abs(R.gain(id) - v) > 1e-9) throw new Error(id + ' must ship at gain ' + v + ', not ' + R.gain(id));
}
if (!(R.send('riffle') > R.send('whoosh') && R.send('whoosh') > R.send('stinger') && R.send('stinger') > R.send('clack')))
  throw new Error('the sends must keep the ranking the table always had');
console.log('the registry holds eleven voices at the table\u2019s own shipped levels, ranked as always');

/* --- untouched means untouched: no tuning, no change --- */
if (R.gain('clack') !== 0.28 || R.send('clack') !== 0.6) throw new Error('a fresh registry must read shipped');
if (R.isTuned('clack') || R.anyTuned()) throw new Error('nothing is tuned until somebody tunes it');
if (R.readout('clack') !== ' shipped') throw new Error('an untouched voice must read as shipped: ' + R.readout('clack'));
R.reset();

/* --- the ladder climbs the RIGHT WAY and stops at both ends ---
   both directions, every rung, and a clamp rather than a wrap       */
function walk(id, kind, dir) {
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const v = R.step(id, kind, dir);
    seen.push(v);
    if (v == null) break;
  }
  R.reset();
  return seen;
}
const up = walk('clack', 'g', 1);
if (up[up.length - 1] !== null) throw new Error('the gain ladder must stop at its top: ' + JSON.stringify(up));
if (!up.slice(0, -1).every((v, i) => i === 0 || v > up[i - 1]))
  throw new Error('gain UP must climb: ' + JSON.stringify(up));
const down = walk('clack', 'g', -1);
if (down[down.length - 1] !== null) throw new Error('the gain ladder must stop at its bottom: ' + JSON.stringify(down));
if (!down.slice(0, -1).every((v, i) => i === 0 || v < down[i - 1]))
  throw new Error('gain DOWN must fall: ' + JSON.stringify(down));
const sup = walk('clack', 's', 1), sdown = walk('clack', 's', -1);
if (sup[sup.length - 1] !== null || sdown[sdown.length - 1] !== null)
  throw new Error('the send ladder must clamp at both ends: ' + JSON.stringify([sup, sdown]));
if (!sup.slice(0, -1).every((v, i) => i === 0 || v > sup[i - 1]) ||
    !sdown.slice(0, -1).every((v, i) => i === 0 || v < sdown[i - 1]))
  throw new Error('the send ladder must climb and fall the right way: ' + JSON.stringify([sup, sdown]));
console.log('the ladder: gain ' + up.slice(0, -1).join(' \u2192 ') + ' \u2192 clamped, and the same both ways for a send');

/* a muted rung is a REAL rung: stepping to silence must stay silent,
   not wrap round to the middle of the ladder */
R.reset();
for (let i = 0; i < 8; i++) if (R.step('clack', 's', -1) == null) break;
if (R.send('clack') !== 0) throw new Error('the bottom rung must be silence: ' + R.send('clack'));
if (R.step('clack', 's', -1) !== null) throw new Error('already at the bottom: it must refuse, not wrap');
if (R.send('clack') !== 0) throw new Error('a refused step must not move the voice: ' + R.send('clack'));
R.reset();
console.log('a muted voice stays muted \u2014 the bottom rung is silence, and stepping past it is refused, not wrapped');

/* --- a voice that ships DRY can still be tuned INTO the room ---
   a multiplier can never lift zero off the floor, so the snap's ladder
   must be its send absolutely                                        */
if (R.send('snap') !== 0) throw new Error('the snap ships dry');
if (R.currentFactor('snap', 's') !== 0) throw new Error('an untouched dry voice must START at zero, not at 1');
const snapUp = R.step('snap', 's', 1);
if (!(snapUp > 0)) throw new Error('the first step up must turn the room ON, not scale a silence: ' + snapUp);
if (!(R.send('snap') > 0)) throw new Error('the snap must be tunable into the room: ' + R.send('snap'));
R.reset();
if (R.send('snap') !== 0) throw new Error('reset must put the snap back on the cloth');
console.log('the snap ships dry at 0\u00d7 and its first step turns the room on \u2014 the one voice you can add to the room');

/* --- the tuning persists, and is shared: one key, both felts --- */
if (R.KEY !== '999.room.tuning') throw new Error('the record lives at 999.room.tuning, and nowhere else: ' + R.KEY);
R.step('clack', 'g', 1);
R.step('tap', 's', -1);
const raw = store.getItem(R.KEY);
if (!raw) throw new Error('tuning must persist under one key');
const back = JSON.parse(raw);
if (!(back.clack && back.clack.g > 1)) throw new Error('the gain must persist: ' + raw);
if (!(back.tap && back.tap.s < 1)) throw new Error('the send must persist: ' + raw);
if (R.gain('clack') <= 0.28) throw new Error('the tuned gain must be live after a write');
console.log('tuning persists under ' + R.KEY + ' \u2014 one record, so a tune on one felt is the other felt\u2019s too');

/* --- the lenient restore: junk is dropped ALONE, the rest rides on --- */
store.setItem(R.KEY, JSON.stringify({
  clack: { g: 1.5 },                 /* good */
  tap: { g: 'loud', s: -1 },          /* both junk */
  bogus: { g: 2 },                   /* not a voice at all */
  bets: { s: 0.75 },                 /* good, and no gain set */
  whoosh: { g: NaN }
}));
const R2 = (function () {
  new Function('root', src)(globalThis);
  return globalThis.ROOM999;
})();
if (!(Math.abs(R2.gain('clack') - 0.42) < 1e-9)) throw new Error('a good gain must survive the restore: ' + R2.gain('clack'));
if (Math.abs(R2.send('bets') - 1.2) > 1e-9) throw new Error('a stored send alone must survive: ' + R2.send('bets'));
if (R2.gain('bets') !== 0.05) throw new Error('a voice tuned only on its send must keep its shipped gain');
if (R2.gain('tap') !== 0.055 || R2.send('tap') !== 0.45) throw new Error('junk must fall back to shipped, not poison the voice');
if (R2.send('whoosh') !== 1.5) throw new Error('a NaN must fall back to shipped');
if (R2.gain('bogus') !== 1) throw new Error('a record for no such voice must be inert');
console.log('the restore is lenient: a junk entry is dropped alone, the rest of the record rides on');

/* --- reset: one voice, or every voice --- */
R.step('clack', 'g', 1);
R.step('tap', 's', -1);
R.reset('clack');
if (R.isTuned('clack')) throw new Error('resetting one voice must clear it');
if (!R.isTuned('tap')) throw new Error('resetting one voice must leave the others alone');
R.reset();
if (R.anyTuned()) throw new Error('resetting all must clear the record');
if (store.getItem(R.KEY) !== '{}') throw new Error('reset must persist the empty record');
console.log('reset puts one voice back, or all of them, and persists the change');

/* --- each surface is told only the voices it can sound --- */
const floor = R.list('floor').map(v => v.id).join(',');
const table = R.list('table').map(v => v.id).join(',');
if (floor !== 'riffle,whoosh,stinger,clack,snap,cue,chime') throw new Error('the floor\u2019s voices: ' + floor);
if (table !== 'riffle,whoosh,stinger,clack,snap,cut,bets,tap,bonus,chime') throw new Error('the table\u2019s voices: ' + table);
const shared = floor.split(',').filter(id => table.split(',').includes(id)).join(',');
if (shared !== 'riffle,whoosh,stinger,clack,snap,chime')
  throw new Error('the two felts share six voices, and only those six: ' + shared);
/* and each voice must be honest about where it lives, so a page can ask
   for what it can sound without guessing */
for (const v of R.VOICES) {
  const on = [R.list('floor').includes(v), R.list('table').includes(v)];
  const want = v.where === 'both' ? [true, true] : v.where === 'floor' ? [true, false] : [false, true];
  if (on[0] !== want[0] || on[1] !== want[1])
    throw new Error(v.id + ' says it is ' + v.where + ' but lists as ' + JSON.stringify(on));
}
console.log('seven voices on the floor, ten on the table, six of them shared, each saying where it lives');

/* --- the panel renders one row per voice, with every hook a tap needs --- */
for (const [where, n] of [['floor', 7], ['table', 10]]) {
  const html = R.panelHtml(where);
  /* lvrows is the wrapper: the rows themselves close the class name, or
     the wrapper would be counted as a seventh row */
  if ((html.match(/class="lvrow"/g) || []).length !== n) throw new Error('the ' + where + ' panel must draw ' + n + ' rows');
  if ((html.match(/data-lvplay="/g) || []).length !== n) throw new Error('every row must be hearable: ' + where);
  if ((html.match(/data-lvstep="/g) || []).length !== n * 4) throw new Error('every row needs two rungs of two: ' + where);
  if ((html.match(/data-lvkind="g"/g) || []).length !== n || (html.match(/data-lvkind="s"/g) || []).length !== n)
    throw new Error('every row must name both kinds it steps: ' + where);
  /* the voice name rides on BOTH rungs of the row, because the stepper
     is the thing a tap lands on and it has to know whose row it is */
  if ((html.match(/data-lvvoice="/g) || []).length !== n * 2)
    throw new Error('both rungs of every row must name their voice: ' + where);
  for (const id of R.list(where).map(v => v.id)) {
    if (html.indexOf('data-lvplay="' + id + '"') < 0) throw new Error(where + ' cannot hear ' + id);
    if (html.indexOf('data-lvreset="' + id + '"') < 0) throw new Error(where + ' cannot put ' + id + ' back');
    if (html.indexOf('data-voice="' + id + '"') < 0) throw new Error(where + ' panel is missing the row for ' + id);
  }
  /* one voice at a time, from the start; all eleven, only once something is tuned */
  if (/data-lvreset="all"/.test(html)) throw new Error('nothing is tuned yet: ' + where + ' has nothing to reset');
  if (!/Levels \u00b7 tap/.test(html)) throw new Error('the panel must say what it is for: ' + where);
  /* nothing it prints may be able to break the box it is dropped into */
  if (/<script|onerror=|javascript:/i.test(html)) throw new Error('the panel must not print live markup: ' + where);
}
/* once something IS tuned, the row says so, and the panel offers the way back */
R.step('clack', 'g', 1);
const tunedHtml = R.panelHtml('floor');
if (!/class="lvrow tuned"/.test(tunedHtml)) throw new Error('a tuned row must say it is tuned');
if (!/data-lvreset="all"/.test(tunedHtml)) throw new Error('once tuned, the panel must offer a way back to shipped');
if (!/shared with the other felt/.test(tunedHtml)) throw new Error('the panel must say the tuning is shared');
R.reset();
if (/class="lvrow tuned"/.test(R.panelHtml('floor'))) throw new Error('after a reset no row may claim to be tuned');
console.log('the panel: a row per voice, each hearable and steppable, with a way back to shipped');

/* --- both pages load it, mount the panel, and own no number of their own --- */
const floor_ = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf8');
const table_ = fs.readFileSync(path.join(__dirname, '..', 'table-16x9.html'), 'utf8');
const srv = fs.readFileSync(path.join(__dirname, '..', 'serve.js'), 'utf8');
for (const [name, page] of [['floor', floor_], ['table', table_]]) {
  if (!/<script src="room999\.js"><\/script>/.test(page)) throw new Error('the ' + name + ' must load the registry');
  if (!/id="levelsBox"/.test(page)) throw new Error('the ' + name + ' must have a levels box');
  if (!/id="levelsBtn"|id="btnLevels"/.test(page)) throw new Error('the ' + name + ' must offer the panel a tap');
  if (!/function levelsClick\(/.test(page)) throw new Error('the ' + name + ' must wire the panel');
  if (!/function playVoice\(/.test(page)) throw new Error('the ' + name + ' must be able to play a voice on its own');
  /* the panel's taps must all be handled, or a row is decoration */
  for (const hook of ['data-lvplay', 'data-lvreset', 'data-lvstep', 'data-lvkind', 'data-lvvoice']) {
    if (page.indexOf(hook) < 0) throw new Error('the ' + name + ' ignores ' + hook);
  }
  /* and it must keep no send or gain literal of its own */
  if (/ROOM = [\d.]+[,;]/.test(page)) throw new Error('the ' + name + ' must not keep a send number of its own');
}
if (!/'\/room999\.js': \['room999\.js'/.test(srv)) throw new Error('the server must serve the registry');
if (!/require\(path\.join\(__dirname, '\.\.', 'room999\.js'\)\)/.test(src + fs.readFileSync(path.join(__dirname, 'roomreverb.test.js'), 'utf8')))
  throw new Error('a suite must bind the registry itself, or the registry is untested');
console.log('both pages load the registry, mount the panel, handle every tap on it, and hold no number of their own');

console.log('\nroom tuning verified');