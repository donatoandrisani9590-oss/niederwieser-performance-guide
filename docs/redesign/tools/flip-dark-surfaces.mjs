#!/usr/bin/env node
// Phase 4a: dunkle Flächen (bg-nw-blue mit weißer Schrift) → ruhige n.Org-Flächen (weiß, Rahmen, blaue Überschriften).
// Arbeitet nur auf Klassen-Strings innerhalb der betroffenen Elemente. Logik, Texte, Daten bleiben.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const file = join(root, 'index.html');
let src = readFileSync(file, 'utf8');

const DARK_BG = /(?<![\w-])(?:[a-z-]+:)?bg-(?:nw-blue|nw-blue-90|ink|ok|danger|warn|nw-blue\/\d+)(?![\w-])/;
const SURFACE_BG = /(?<![\w-])bg-(?:nw-blue|nw-blue-90)(?:\/\d+)?(?![\w-])/;

// Ende eines createElement-Aufrufs ab der öffnenden Klammer (Strings/Templates/Kommentare überspringen)
function callEnd(text, open) {
  let depth = 0, i = open;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { i = text.indexOf('\n', i); continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'") { i++; while (i < text.length && text[i] !== c) { if (text[i] === '\\') i++; i++; } i++; continue; }
    if (c === '`') { i = tmplEnd(text, i); continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return text.length;
}
function tmplEnd(text, i) {
  i++;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '`') return i + 1;
    if (text[i] === '$' && text[i + 1] === '{') { i = callEnd(text, i + 1); continue; }
    i++;
  }
  return i;
}

// Klassen in einem String innerhalb einer umgedrehten Fläche anpassen
function flipString(str) {
  if (!/(text-|bg-white|border-)/.test(str)) return str;
  if (DARK_BG.test(str) && !SURFACE_BG.test(str)) return str; // eigene dunkle Fläche (Knopf, Badge) behalten
  let s = str;
  // invertierte Knöpfe (weiß auf blau) → Primärknopf
  if (/(?<![\w-])bg-white(?![\w\/-])/.test(s) && /(?<![\w-])text-nw-blue(?![\w-])/.test(s) && !/(?<![\w-])border(?![\w-])/.test(s)) {
    s = s.replace(/(?<![\w-])bg-white(?![\w\/-])/g, 'bg-nw-blue').replace(/(?<![\w-])text-nw-blue(?![\w-])/g, 'text-white')
      .replace(/hover:bg-(?:nw-blue-06|nw-blue-12|white\/\d+|nw-grey-40)/g, 'hover:bg-nw-blue-90');
    return s;
  }
  const heading = /font-semibold/.test(s) && /(?<![\w-])text-(?:base|md|lg|xl|2xl)(?![\w-])/.test(s);
  s = s.replace(/(?<![\w-])hover:text-white(?![\w\/-])/g, 'hover:text-nw-blue');
  s = s.replace(/(?<![\w-])text-white\/\d+(?![\w-])/g, 'text-ink-60');
  s = s.replace(/(?<![\w-])text-white(?![\w\/-])/g, heading ? 'text-nw-blue' : 'text-ink');
  s = s.replace(/(?<![\w-])text-(?:nw-blue-25|nw-blue-12|nw-blue-06|nw-grey|nw-grey-40|line)(?![\w-])/g, 'text-ink-60');
  s = s.replace(/(?<![\w-])text-nw-green(?![\w-])/g, 'text-ok');
  s = s.replace(/(?<![\w-])bg-white\/(?:5|10|15|20)(?![\w-])/g, 'bg-nw-blue-06');
  s = s.replace(/(?<![\w-])bg-white\/\d+(?![\w-])/g, 'bg-nw-blue-12');
  s = s.replace(/(?<![\w-])hover:bg-white\/\d+(?![\w-])/g, 'hover:bg-nw-blue-12');
  s = s.replace(/(?<![\w-])border-(?:white\/\d+|nw-blue-90|ink-60|ink)(?![\w-])/g, 'border-line');
  return s;
}
function flipStringsIn(text) {
  return text.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, (lit) => {
    if (lit[0] === '`') return lit.replace(/(?<=^`|\})([^`$]*)(?=\$\{|`$)/g, (m) => flipString(m)).replace(/'([^'\n]*)'/g, (m, inner) => `'${flipString(inner)}'`);
    return lit[0] + flipString(lit.slice(1, -1)) + lit[0];
  });
}

const re = /(?:React\.createElement|\be)\(\s*'(div|section|header|footer|thead|tr|li|form|aside)'\s*,\s*\{/g;
let out = '', last = 0, n = 0, m;
while ((m = re.exec(src))) {
  const start = m.index;
  if (start < last) continue; // liegt in bereits umgedrehtem Element
  const propsStart = src.indexOf('{', start + m[0].length - 1);
  const propsEnd = callEnd(src, propsStart);
  const props = src.slice(propsStart, propsEnd);
  const cm = props.match(/className:\s*('[^'\n]*'|"[^"\n]*"|`[^`]*`)/);
  if (!cm) continue;
  const cls = cm[1];
  // Hintergrund kann auch im style stehen: style: { background(Color): '#243186' }
  const styleBg = props.match(/(background(?:Color)?):\s*(['"])#(?:243186|3A46A0)\2,?\s*/);
  const styleWhite = /color:\s*['"](?:white|#FFFFFF)['"]/.test(props);
  if (!(SURFACE_BG.test(cls) || styleBg)) continue;
  // nur Flächen: mit Innenabstand, nicht rund (Avatare, Zahlenpunkte)
  if (!/(?<![\w-])(?:p|px|py)-(?:4|5|6|8|10|12)(?![\w-])/.test(cls) && !['thead', 'tr'].includes(m[1])) continue;
  if (/rounded-full/.test(cls)) continue;
  const open = src.indexOf('(', start);
  const end = callEnd(src, open);
  let el = src.slice(start, end);
  // Fläche selbst
  const isTable = ['thead', 'tr'].includes(m[1]);
  const surface = isTable ? 'bg-panel' : 'bg-white border border-line shadow-card';
  const newCls = (SURFACE_BG.test(cls) ? cls.replace(SURFACE_BG, surface) : cls.replace(/(['"`])$/, ' ' + surface + '$1'))
    .replace(/(?<![\w-])text-white(?![\w\/-])/, isTable ? 'text-ink-60' : 'text-ink')
    .replace(/(?<![\w-])border-t-4 border-t-nw-green(?![\w-])/, '')
    .replace(/(?<![\w-])shadow-float(?![\w-])/, '');
  if (styleBg) el = el.replace(styleBg[0], '');
  el = el.replace(/color:\s*['"](?:white|#FFFFFF)['"],?\s*/, '');
  el = el.replace(cls, '\u0000CLS\u0000');
  el = flipStringsIn(el);
  el = el.replace('\u0000CLS\u0000', newCls);
  out += src.slice(last, start) + el;
  last = end;
  re.lastIndex = end;
  n++;
}
out += src.slice(last);
console.log('umgedrehte Flächen:', n);
if (!process.argv.includes('--dry')) writeFileSync(file, out);
