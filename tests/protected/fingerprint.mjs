#!/usr/bin/env node
// Schutzbereich-Prüfung für index.html (siehe docs/PROTECTED.md).
//
// Die App besteht aus einer einzigen Datei. Ein Datei-Diff gegen den Schutzbereich ist daher
// nicht möglich, ohne das Redesign zu verbieten. Stattdessen zieht dieses Skript alle
// geschützten Code-Stellen heraus (Datenbankzugriffe, Auth, Storage-Schlüssel, URL-Parameter,
// Konfiguration, Berechnungs- und Datenfunktionen) und vergleicht sie mit einer Baseline.
//
//   node tests/protected/fingerprint.mjs            -> Prüfen gegen baseline.txt (Exit 1 bei Abweichung)
//   node tests/protected/fingerprint.mjs --update   -> Baseline neu schreiben (NUR nach Freigabe!)
//   node tests/protected/fingerprint.mjs --print    -> Aktuellen Stand ausgeben
//
// Reihenfolge wird bewusst ignoriert (sortiert): Verschieben von Code ist erlaubt,
// Ändern des Inhalts nicht.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const src = readFileSync(join(root, 'index.html'), 'utf8');
const baselinePath = join(here, 'baseline.txt');

const norm = (s) => s.replace(/\s+/g, ' ').trim();

// Scannt ab `start` bis zum Ende eines Ausdrucks/Statements bzw. bis zur passenden Klammer.
// Überspringt Strings, Template-Literale und Kommentare.
function scan(text, start, { untilSemicolon = false, matchFirstBrace = false } = {}) {
  let depth = 0, i = start, started = false;
  const stack = [];
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { i = text.indexOf('\n', i); if (i < 0) return text.length; continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < text.length && text[i] !== c) { if (text[i] === '\\') i++; if (text[i] === '\n') break; i++; }
      i++; continue;
    }
    if (c === '`') { stack.push('`'); i++;
      while (i < text.length && stack.length) {
        const d = text[i];
        if (d === '\\') { i += 2; continue; }
        if (d === '`' && stack[stack.length - 1] === '`') { stack.pop(); i++; if (!stack.length) break; continue; }
        if (d === '$' && text[i + 1] === '{' && stack[stack.length - 1] === '`') { stack.push('{'); i += 2; continue; }
        if (d === '{' && stack[stack.length - 1] !== '`') { stack.push('{'); i++; continue; }
        if (d === '}' && stack[stack.length - 1] === '{') { stack.pop(); i++; continue; }
        if (d === '`') { stack.push('`'); i++; continue; }
        i++;
      }
      continue;
    }
    if (c === '(' || c === '{' || c === '[') { depth++; started = true; }
    else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (matchFirstBrace && started && depth === 0) return i + 1;
      if (depth < 0) return i; // Ende des umgebenden Ausdrucks
    } else if (untilSemicolon && depth === 0 && (c === ';' || (c === ',' && started))) return i + 1;
    i++;
  }
  return text.length;
}

const lineStart = (i) => src.lastIndexOf('\n', i) + 1;
const out = {};
const add = (section, value) => { (out[section] ||= []).push(norm(value)); };

// 1) Firebase-Konfiguration, HR-Admins, CSP
{
  const i = src.indexOf('const firebaseConfig = {');
  add('config', src.slice(i, scan(src, i + 'const firebaseConfig = '.length, { matchFirstBrace: true })));
  const m = src.match(/const HR_ADMIN_EMAILS = [^\n]+/); add('config', m[0]);
  const h = src.match(/const isUserHRAdmin = [^\n]+/); add('config', h[0]);
  const wdb = src.match(/window\.db = db;[^\n]*/); if (wdb) add('auth', wdb[0]); // freigegeben 08.11.2026
  const csp = src.match(/<meta http-equiv="Content-Security-Policy"[^>]+>/); add('config', csp[0]);
  for (const s of src.match(/<script src="[^"]+"><\/script>/g)) add('config', s);
  for (const s of src.match(/import [^;]+ from 'https:\/\/esm\.sh\/[^']+';/gs)) add('config', s.replace(/\{[^}]*\}/s, '{…}'));
}

// 2) Jeder Firestore-/Storage-Zugriff als ganzes Statement
for (const re of [/\.collection\(/g, /storage\.ref\(/g, /\.batch\(\)/g]) {
  for (const m of src.matchAll(re)) {
    const s = lineStart(m.index);
    add('firestore', src.slice(s, scan(src, s, { untilSemicolon: true })));
  }
}

// 3) Auth-Aufrufe
for (const m of src.matchAll(/\b(auth\.(signIn\w*|signOut|createUser\w*|onAuthStateChanged|currentUser\b)|\.updateProfile\()/g)) {
  const s = lineStart(m.index);
  add('auth', src.slice(s, src.indexOf('\n', m.index)));
}

// 4) Browser-Speicher-Schlüssel
for (const m of src.matchAll(/(safeLocalStorage|localStorage|sessionStorage)\.(getItem|setItem|removeItem)\(\s*([^,)]+)/g)) add('storage-keys', `${m[1]}.${m[2]}(${m[3]})`);
for (const m of src.matchAll(/(DRAFT_PREFIX: '[^']+'|`nw_[^`]+`|'nw_[a-z_]+' \+ [\w.]+|'goalsDash_' \+ key)/g)) add('storage-keys', m[0]);

// 5) URL-Parameter und erzeugte Links
for (const m of src.matchAll(/(params|urlParams)\.get\('[^']+'\)|\?accessCode=|\?import_self=|viewParam === '[^']+'/g)) add('url', m[0]);

// 6) Daten- und Berechnungsfunktionen (kompletter Funktionskörper)
const FUNCS = [
  'calculateGPSConfidence', 'getBarsScore', 'validateSMART', 'calculateWASForSave', 'calculateWIEForSave',
  'calculateWAS', 'calculateWIE', 'calculateGaps', 'getSelfScore', 'migrateLocalDataToFirebase', 'calcAvg',
  'calculateCompaRatio', 'calculateGPSForAppraisal', 'repairManagerIds', 'calculateIncrease', 'convertWAStoBARS',
  'calculateStdDev', 'calculateWieAverage', 'calculateWasScore', 'calcGPS', 'exportFullBackup',
  'restoreAppraisalFromBackup', 'checkAccessCode', 'safeLocalStorage', 'DraftManager', 'getUserDisplayName',
];
for (const name of FUNCS) {
  const re = new RegExp(`(const|function) ${name}\\b`, 'g');
  let n = 0;
  for (const m of src.matchAll(re)) {
    n++;
    const from = m.index;
    let end;
    const arrow = src.indexOf('=>', from);
    const brace = src.indexOf('{', from);
    const eol = src.indexOf('\n', from);
    if (arrow > 0 && arrow < brace && arrow < from + 300) {
      const after = src.slice(arrow + 2).match(/^\s*/)[0].length + arrow + 2;
      end = src[after] === '{' ? scan(src, after, { matchFirstBrace: true }) : scan(src, after, { untilSemicolon: true });
    } else {
      end = scan(src, brace, { matchFirstBrace: true });
    }
    if (end <= from || brace < 0 || (brace > eol + 200 && arrow < 0)) continue;
    add('functions', `${name}#${n}: ${src.slice(from, end)}`);
  }
}

// 7) LoginView-Anmeldelogik (handleSubmit innerhalb LoginView)
{
  const lv = src.indexOf('const LoginView = (');
  const hs = src.indexOf('const handleSubmit = async (e) => {', lv);
  add('auth', 'LoginView.handleSubmit: ' + src.slice(hs, scan(src, src.indexOf('{', hs + 30), { matchFirstBrace: true })));
}

const render = () => Object.keys(out).sort().map((k) =>
  `### ${k} (${out[k].length})\n` + [...out[k]].sort().join('\n')).join('\n\n') + '\n';

const current = render();
const arg = process.argv[2];
if (arg === '--print') { process.stdout.write(current); process.exit(0); }
if (arg === '--update') { writeFileSync(baselinePath, current); console.log('Baseline geschrieben:', baselinePath); process.exit(0); }
if (!existsSync(baselinePath)) { console.error('Keine Baseline vorhanden. Erst mit --update anlegen.'); process.exit(2); }

const base = readFileSync(baselinePath, 'utf8');
if (base === current) {
  const counts = Object.entries(out).map(([k, v]) => `${k}=${v.length}`).join(', ');
  console.log(`Schutzbereich unverändert (${counts}).`);
  process.exit(0);
}
const a = new Set(base.split('\n')), b = new Set(current.split('\n'));
const removed = [...a].filter((l) => !b.has(l)), added = [...b].filter((l) => !a.has(l));
console.error('SCHUTZBEREICH VERÄNDERT. Bitte stoppen und mit dem Auftraggeber klären.\n');
for (const l of removed) console.error('- ' + l.slice(0, 400));
for (const l of added) console.error('+ ' + l.slice(0, 400));
process.exit(1);
