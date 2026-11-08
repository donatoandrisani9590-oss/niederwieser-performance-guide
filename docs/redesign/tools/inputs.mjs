#!/usr/bin/env node
// Phase 4c: Eingabefelder, Auswahllisten und Textfelder einheitlich im n.Org-Stil
// (Haarlinie, weiß, Fokus = NW-Blau-Rahmen + heller Ring). Nur Klassen-Strings.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'index.html');
let src = readFileSync(file, 'utf8');
let n = 0;
const FOCUS = 'focus:border-nw-blue focus:shadow-[0_0_0_3px_#F2F3F8] focus:outline-none';
src = src.replace(/'([^'\n]*focus:ring-[^'\n]*)'/g, (m, c) => {
  let s = c;
  s = s.replace(/(?<![\w-])focus:ring(?:-\d)?(?![\w-])/g, '')
       .replace(/(?<![\w-])focus:ring-(?:offset-\d|[a-z][\w-]*(?:\/\d+)?)(?![\w-])/g, '')
       .replace(/(?<![\w-])focus:border-transparent(?![\w-])/g, '')
       .replace(/(?<![\w-])(?:focus:)?outline-none(?![\w-])/g, '')
       .replace(/(?<![\w-])focus:border-[a-z][\w-]*(?:\/\d+)?(?![\w-])/g, '')
       .replace(/(?<![\w-])focus:bg-white(?![\w-])/g, '');
  // graue Flächen-Felder → weiße Felder mit Haarlinie
  if (/(?<![\w-])bg-nw-grey-40(?![\w-])/.test(s) && /(?<![\w-])border-transparent(?![\w-])/.test(s)) {
    s = s.replace(/(?<![\w-])bg-nw-grey-40(?![\w-])/, 'bg-white').replace(/(?<![\w-])border-transparent(?![\w-])/, 'border border-line');
  }
  if (!/(?<![\w-])border(?![\w-])/.test(s) && /(?:px|py|p)-\d/.test(s)) s += ' border border-line';
  s = s.replace(/(?<![\w-])border-2(?![\w-])/g, 'border');
  s = s.replace(/(?<![\w-])rounded-(?:card|xl)(?![\w-])/g, 'rounded-lg');
  s = (s + ' ' + FOCUS + ' transition-[border-color,box-shadow] duration-150').replace(/\s+/g, ' ').trim();
  n++;
  return `'${s}'`;
});
console.log('Felder vereinheitlicht:', n);
if (!process.argv.includes('--dry')) writeFileSync(file, src);
