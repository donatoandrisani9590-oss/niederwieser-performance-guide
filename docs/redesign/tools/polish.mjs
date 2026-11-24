#!/usr/bin/env node
// Phase 4b: Feinschliff nach n.Org-Regeln (nur Klassen und Style-Farbwerte, keine Logik/Texte).
//  - Überschriften immer NW-Blau (auch wenn per style grün gefärbt)
//  - grüne Schrift auf Weiß (Kontrast 2,3:1) → ok-Grün (#2F7A48, 5,4:1)
//  - weiße Schrift auf NW-Grün (Kontrast-Fehler) → Primärknopf/-fläche in NW-Blau
//  - grüne Hinweisflächen → helle Statusfläche (nw-green-15) mit ok-Text
//  - dicke Akzentrahmen (border-2/-4 in Grün/Blau) auf Karten → Haarlinie
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const file = join(root, 'index.html');
let src = readFileSync(file, 'utf8');
const stats = {};
const c = (k) => { stats[k] = (stats[k] || 0) + 1; };
const has = (s, cls) => new RegExp(`(?<![\\w:/-])${cls.replace(/[/[\]]/g, '\\$&')}(?![\\w/-])`).test(s);
const rep = (s, from, to) => s.replace(new RegExp(`(?<![\\w:/-])${from.replace(/[/[\]]/g, '\\$&')}(?![\\w/-])`, 'g'), to);

// 1) Überschriften mit grüner Inline-Farbe → NW-Blau
src = src.replace(/((?:React\.createElement|\be)\('h[1-6]',\s*\{[^{}]*?style:\s*\{[^{}]*?)color:\s*(['"])#6EBD84\2/g, (m, a, q) => { c('heading-green'); return `${a}color: ${q}#243186${q}`; });
// 2) übrige grüne Inline-Textfarbe → ok
src = src.replace(/([{,]\s*)color:\s*(['"])#6EBD84\2/g, (m, a, q) => { c('text-green-inline'); return `${a}color: ${q}#2F7A48${q}`; });

// 3) Klassen-Strings
src = src.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, (lit) => {
  const q = lit[0];
  let s = lit.slice(1, -1);
  if (!/(?:bg|text|border)-/.test(s) || s.length > 600) return lit;
  const before = s;
  // weiße Schrift auf NW-Grün → NW-Blau-Primär
  if (has(s, 'bg-nw-green') && has(s, 'text-white')) {
    s = rep(s, 'bg-nw-green', 'bg-nw-blue');
    s = s.replace(/hover:bg-(?:ok|nw-green|nw-green\/\d+)(?![\w-])/g, 'hover:bg-nw-blue-90');
    c('green-on-white-fill');
  }
  // grüne Hinweisfläche (mit Innenabstand, nicht rund) → helle Statusfläche
  if (has(s, 'bg-nw-green') && /(?<![\w-])p[xy]?-(?:2|3|4|5|6)(?![\w-])/.test(s) && !/rounded-full|h-\d|w-\d/.test(s)) {
    s = rep(s, 'bg-nw-green', 'bg-nw-green-15');
    s = rep(s, 'text-nw-blue', 'text-ok');
    c('green-hint');
  }
  // grüne Schrift (Text) auf Weiß → ok
  if (has(s, 'text-nw-green') && !/(?<![\w-])bg-(?:nw-blue|ink|ok|danger|nw-blue-90)(?![\w-])/.test(s)) { s = rep(s, 'text-nw-green', 'text-ok'); c('text-green'); }
  if (/(?<![\w:-])hover:text-nw-green(?![\w-])/.test(s)) { s = s.replace(/hover:text-nw-green(?![\w-])/g, 'hover:text-ok'); c('hover-text-green'); }
  // dicke farbige Kartenrahmen → Haarlinie
  if (/(?<![\w-])border-(?:2|4)(?![\w-])/.test(s) && /(?<![\w-])border-(?:nw-green|nw-blue|ok)(?![\w/-])/.test(s) && /(?<![\w-])p-(?:4|5|6|8)(?![\w-])/.test(s)) {
    s = s.replace(/(?<![\w-])border-(?:2|4)(?![\w-])/g, 'border').replace(/(?<![\w:-])border-(?:nw-green|nw-blue|ok)(?![\w/-])/g, 'border-line');
    c('thick-border');
  }
  // sehr helle Schrift aus früheren Dunkelflächen, die jetzt auf Weiß steht
  if (has(s, 'text-nw-green-15') && !/(?<![\w-])bg-(?:nw-blue|ink|ok|danger|warn|nw-blue-90)(?![\w-])/.test(s)) { s = rep(s, 'text-nw-green-15', 'text-ink-60'); c('pale-text'); }
  // weiße Knöpfe mit grüner Schrift (früher auf Blau) → Sekundärknopf
  if (has(s, 'bg-white') && has(s, 'text-ok') && /(?<![\w-])px-\d/.test(s) && /rounded-lg/.test(s) && !has(s, 'border')) {
    s = rep(s, 'text-ok', 'text-ink') + ' border border-line hover:border-nw-blue-25';
    c('white-green-btn');
  }
  return s === before ? lit : q + s + q;
});
console.log(stats);
if (!process.argv.includes('--dry')) writeFileSync(file, src);
