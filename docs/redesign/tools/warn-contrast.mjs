#!/usr/bin/env node
// Phase 5: WCAG AA für Warn-Töne. warn (#9A6414) auf warn-bg (#FBF1DD) hat nur 4,45:1.
//  - Chips/Pillen (bg-warn-bg + text-warn im selben String) → weiß mit Amber-Rahmen (5,0:1)
//  - Text in Warn-Kästen → ink / ink-60 (Icons behalten Amber, die Fläche bleibt warn-bg)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'index.html');
let src = readFileSync(file, 'utf8');
const st = { chip: 0, box: 0, text: 0 };

function callEnd(text, open) {
  let depth = 0, i = open;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { i = text.indexOf('\n', i); continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'") { i++; while (i < text.length && text[i] !== c) { if (text[i] === '\\') i++; i++; } i++; continue; }
    if (c === '`') { i++; while (i < text.length && text[i] !== '`') { if (text[i] === '\\') i++; else if (text[i] === '$' && text[i + 1] === '{') { i = callEnd(text, i + 1); continue; } i++; } i++; continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return text.length;
}
const W = /(?<![\w:-])text-warn(?![\w\/-])/;
const BG = /(?<![\w:-])bg-warn-bg(?![\w\/-])/;
// 1) Chips im selben String
src = src.replace(/'[^'\n]*'|"[^"\n]*"/g, (lit) => {
  const s = lit.slice(1, -1);
  if (BG.test(s) && W.test(s) && !/(?<![\w-])p-(?:3|4|5|6)(?![\w-])/.test(s)) {
    st.chip++;
    return lit[0] + s.replace(BG, 'bg-white border border-warn/30') + lit[0];
  }
  return lit;
});
// 2) Warn-Kästen: Text im Inneren dunkel
const re = /(?:React\.createElement|\be)\(\s*'(div|section|p|li|td|tr|label)'\s*,\s*\{/g;
let out = '', last = 0, m;
while ((m = re.exec(src))) {
  if (m.index < last) continue;
  const propsStart = src.indexOf('{', m.index + m[0].length - 1);
  const props = src.slice(propsStart, callEnd(src, propsStart));
  const cm = props.match(/className:\s*('[^'\n]*'|"[^"\n]*"|`[^`]*`)/);
  if (!cm || !BG.test(cm[1])) continue;
  const end = callEnd(src, src.indexOf('(', m.index));
  let el = src.slice(m.index, end);
  el = el.replace(/'[^'\n]*'|"[^"\n]*"/g, (lit) => {
    const s = lit.slice(1, -1);
    if (!W.test(s)) return lit;
    const isText = /(?<![\w-])(?:text-(?:2xs|xs|sm|base|md|lg|xl)|font-(?:medium|semibold))(?![\w-])/.test(s) || s === cm[1].slice(1, -1);
    if (!isText) return lit; // Icons behalten Amber
    st.text++;
    return lit[0] + s.replace(W, /font-semibold/.test(s) ? 'text-ink' : 'text-ink-60') + lit[0];
  });
  st.box++;
  out += src.slice(last, m.index) + el;
  last = end; re.lastIndex = end;
}
out += src.slice(last);
console.log(st);
if (!process.argv.includes('--dry')) writeFileSync(file, out);
