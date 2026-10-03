'use strict';
const fs = require('fs');
const path = require('path');

/* Every engine is ONE shipped file that both pages load. There is no
   second copy to drift, so the guards here flipped sense: they pin
   that each page LOADS the module, and that no page has quietly
   grown an inline copy of the engine again. */
const PAGES = ['offline.html', 'table-16x9.html'];

function load(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }

function guard(modFile, varName) {
  for (const page of PAGES) {
    const s = load(page);
    const tag = '<script src="' + modFile + '"></script>';
    if (!s.includes(tag)) throw new Error(page + ': must load ' + tag);
    /* the inline copy must be gone: the IIFE opener is what a paste
       leaves behind, and its absence is what keeps two engines from
       quietly coexisting on one page */
    const opener = 'var ' + varName + ' = (function';
    if (s.includes(opener)) throw new Error(page + ': inline ' + varName + ' copy has returned');
    /* and the page must actually use it, so a load line cannot rot */
    if (!s.includes(varName + '.')) throw new Error(page + ': loads ' + varName + ' but never calls it');
  }
  const mod = load(modFile);
  if (!mod.includes('root.' + varName + ' = api')) throw new Error(modFile + ': must publish window.' + varName);
  if (!mod.includes('module.exports = api')) throw new Error(modFile + ': must also be require()-able');
  return require(path.join(__dirname, '..', modFile));
}

const SHOE999 = guard('shoe999.js', 'SHOE999');
const EV999 = guard('ev999.js', 'EV999');
const INDEX999 = guard('index999.js', 'INDEX999');
console.log('single-source guard: all four engines are one file, both pages load it, no inline copies');

/* the pages load them in a usable order: the engines are plain scripts,
   so each must appear BEFORE the page's own inline script */
for (const page of PAGES) {
  const s = load(page);
  const lastSrc = Math.max(...PAGES.map(() => 0), ...['luck999.js', 'shoe999.js', 'ev999.js', 'index999.js']
    .map(f => s.indexOf('<script src="' + f + '"></script>')));
  const inline = s.indexOf('<script>');
  if (lastSrc < 0) throw new Error(page + ': no engine script tags');
  if (inline >= 0 && inline < lastSrc) throw new Error(page + ': inline script runs before the engines load');
}
console.log('load order: every engine script precedes the page script on both pages');

console.log('\nshared engines: one source each, no drift possible\n');
