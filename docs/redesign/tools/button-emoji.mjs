#!/usr/bin/env node
// n.Org: Knöpfe und Texte ohne dekorative Emojis (Icons kommen aus Lucide).
// Aufruf: node button-emoji.mjs [--all]   (--all: alle Textelemente statt nur Knöpfe)
// Fasst NUR direkte Textkinder von <button>/NwButton an (reine Strings, Sprach-Ternäre, getText(...)),
// nie Props, Handler oder verschachtelte Elemente. Entfernt nur echte Emoji (ab U+1F000); → ✓ ✎ bleiben.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'index.html');
let src = readFileSync(file, 'utf8');
const E = '(?:[\\u{1F300}-\\u{1F5FF}\\u{1F600}-\\u{1F6FF}\\u{1F900}-\\u{1F9FF}\\u{1FA70}-\\u{1FAFF}\\u{1F7F0}-\\u{1F7FF}]|[\\u2600-\\u26FF\\u2728\\u23F3\\u2B50])(?:\\uFE0F|\\u200D[\\u{1F300}-\\u{1FAFF}])*\\uFE0F?';
const lead = new RegExp('^\\s*(?:' + E + '\\s*)+', 'u'), trail = new RegExp('(?:\\s*' + E + ')+\\s*$', 'u');

function skipString(t, i) { const q = t[i]; i++; while (i < t.length && t[i] !== q) { if (t[i] === '\\') i++; i++; } return i + 1; }
function tmplEnd(t, i) { i++; while (i < t.length) { if (t[i] === '\\') { i += 2; continue; } if (t[i] === '`') return i + 1; if (t[i] === '$' && t[i + 1] === '{') { i = blockEnd(t, i + 1); continue; } i++; } return i; }
function blockEnd(t, open) {
  let d = 0, i = open;
  while (i < t.length) {
    const c = t[i], n = t[i + 1];
    if (c === '/' && n === '/') { i = t.indexOf('\n', i); continue; }
    if (c === '/' && n === '*') { i = t.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'") { i = skipString(t, i); continue; }
    if (c === '`') { i = tmplEnd(t, i); continue; }
    if (c === '(' || c === '{' || c === '[') d++;
    else if (c === ')' || c === '}' || c === ']') { d--; if (d === 0) return i + 1; }
    i++;
  }
  return t.length;
}
// Argumente eines Aufrufs (Positionen) auf oberster Ebene
function topArgs(t, open, close) {
  const args = []; let start = open + 1, i = open + 1;
  while (i < close - 1) {
    const c = t[i], n = t[i + 1];
    if (c === '/' && n === '/') { i = t.indexOf('\n', i); continue; }
    if (c === '"' || c === "'") { i = skipString(t, i); continue; }
    if (c === '`') { i = tmplEnd(t, i); continue; }
    if (c === '(' || c === '{' || c === '[') { i = blockEnd(t, i); continue; }
    if (c === ',') { args.push([start, i]); start = i + 1; }
    i++;
  }
  args.push([start, close - 1]);
  return args;
}
const TEXT_ARG = /^\s*(?:(?:lang\s*===\s*'[a-z]{2}'\s*\?\s*)?'(?:[^'\\\n]|\\.)*'\s*:?\s*)+$|^\s*getText\(\s*lang\s*(?:,\s*'(?:[^'\\\n]|\\.)*'\s*)+\)\s*$/;

const pa = src.indexOf('const PrintLayout = ('), pb = src.indexOf('const Zielvereinbarung = (');
const edits = [];
const ALL = process.argv.includes('--all');
const ELEM = ALL ? /(?:React\.createElement|\be)\(\s*(?:'(?:button|p|span|div|h[1-6]|li|label|strong|td|th|summary|option)'|NwButton)\s*,/g : /(?:React\.createElement|\be)\(\s*(?:'button'|NwButton)\s*,/g;
// Hilfe-Assistent (Wissensinhalte) auslassen
const ha = src.indexOf('function HelpChat('), hb = src.indexOf('function PerformanceApp(');
for (const m of src.matchAll(ELEM)) {
  if (m.index >= ha && m.index < hb) continue;
  if (m.index >= pa && m.index < pb) continue;
  const open = src.indexOf('(', m.index);
  const close = blockEnd(src, open);
  const args = topArgs(src, open, close).slice(2); // ab dem 3. Argument: Kinder
  for (const [a, b] of args) {
    const txt = src.slice(a, b);
    if (!TEXT_ARG.test(txt)) continue;
    const neu = txt.replace(/'((?:[^'\\\n]|\\.)*)'/g, (lit, inner) => {
      if (/^[a-z]{2}$/.test(inner)) return lit;
      const s = inner.replace(lead, '').replace(trail, '');
      return s === inner || !s.trim() ? lit : `'${s}'`;
    });
    if (neu !== txt) edits.push([a, b, neu]);
  }
}
edits.sort((x, y) => y[0] - x[0]);
for (const [a, b, neu] of edits) src = src.slice(0, a) + neu + src.slice(b);
console.log('Knopftexte bereinigt:', edits.length);
if (!process.argv.includes('--dry')) writeFileSync(file, src);
