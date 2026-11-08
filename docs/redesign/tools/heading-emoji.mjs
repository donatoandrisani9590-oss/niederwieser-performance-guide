#!/usr/bin/env node
// n.Org: Überschriften ohne Emojis (Icons kommen aus Lucide). Entfernt nur Bildzeichen am Anfang/Ende
// von Text-Strings in h1–h4 und in NwPaneHeader-Titeln. Wörter bleiben unverändert.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'index.html');
let src = readFileSync(file, 'utf8');
const EMO = /(?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*️?)/u;
const strip = (t) => t.replace(new RegExp('^\\s*(?:' + EMO.source + '\\s*)+', 'u'), '').replace(new RegExp('(?:\\s*' + EMO.source + ')+\\s*$', 'u'), '');
function callEnd(text, open) {
  let depth = 0, i = open;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") { i++; while (i < text.length && text[i] !== c) { if (text[i] === '\\') i++; i++; } i++; continue; }
    if (c === '`') { i++; while (i < text.length && text[i] !== '`') { if (text[i] === '\\') i++; i++; } i++; continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return text.length;
}
let n = 0, out = '', last = 0, m;
const re = /(?:React\.createElement|\be)\(\s*(?:'h[1-4]'|NwPaneHeader|NwPageHeader)\s*,/g;
// PrintLayout (PDF-Vorlage) auslassen
const pa = src.indexOf('const PrintLayout = ('), pb = src.indexOf('const Zielvereinbarung = (');
while ((m = re.exec(src))) {
  if (m.index >= pa && m.index < pb) continue;
  const open = src.indexOf('(', m.index);
  const end = callEnd(src, open);
  let el = src.slice(m.index, end);
  const before = el;
  el = el.replace(/(?<!className:\s*)'((?:[^'\\\n]|\\.)*)'/g, (lit, inner) => {
    if (!EMO.test(inner) || /^[a-z0-9\-:\[\]\/ .#_]+$/.test(inner)) return lit;
    const s = strip(inner);
    return s === inner ? lit : `'${s}'`;
  });
  if (el !== before) n++;
  out += src.slice(last, m.index) + el; last = end; re.lastIndex = end;
}
out += src.slice(last);
console.log('Überschriften bereinigt:', n);
if (!process.argv.includes('--dry')) writeFileSync(file, out);
