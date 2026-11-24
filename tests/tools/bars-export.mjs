// Exportiert die BARS-Inhalte, die die App AKTUELL verwendet, direkt aus index.html (nur lesen, ändert die App nicht).
// Aufruf (im Ordner tests):  node tools/bars-export.mjs
// Ergebnis: docs/bars/BARS-AKTUELL.md (zum Lesen) und docs/bars/bars-aktuell.json (für andere Chats/Werkzeuge).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'index.html'), 'utf8');

// Objekt-Literal ab "const NAME =" bis zur passenden schließenden Klammer (Strings, Template-Strings, Kommentare beachtet)
function literal(name) {
  const start = src.indexOf(`const ${name} =`);
  if (start < 0) throw new Error(`${name} nicht gefunden`);
  let i = src.indexOf('=', start) + 1;
  while (/\s/.test(src[i])) i++;
  const open = src[i], close = open === '[' ? ']' : '}';
  let depth = 0, q = null;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '/' && src[j + 1] === '/') { j = src.indexOf('\n', j); continue; }
    if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j) + 1; continue; }
    if (c === open) depth++;
    if (c === close && --depth === 0) return src.slice(i, j + 1);
  }
  throw new Error(`${name}: Ende nicht gefunden`);
}
// Auswerten; unbekannte Namen (z. B. Icon-Komponenten) werden zu Platzhaltern
const scope = new Proxy({}, { has: (t, k) => typeof k === 'string' && !(k in globalThis), get: (t, k) => (k === Symbol.unscopables ? undefined : `[${String(k)}]`) });
const evalLit = (name) => new Function('scope', `with (scope) { return (${literal(name)}); }`)(scope);

const FORM_TEXT = evalLit('FORM_TEXT');
const APP_DATA = evalLit('APP_DATA');
const BARS_RANGES = evalLit('BARS_RANGES');
const RATINGS = evalLit('RATINGS');
const CORE = evalLit('CORE_COMPETENCIES_CALC');
const LEAD = evalLit('LEADERSHIP_COMPETENCIES_CALC');

let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch (e) {}
const strip = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v);
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'icon' || k === 'color' ? undefined : strip(v))));

const out = { quelle: 'index.html', commit, erzeugt: new Date().toISOString().slice(0, 10), sprachen: {} };
for (const lang of ['de', 'it', 'en']) {
  out.sprachen[lang] = {
    kurzanker_im_bogen: clean(FORM_TEXT[lang]?.barsCompetency || {}),
    kompetenzen: clean((APP_DATA[lang]?.competencies || []).map((c) => ({ id: c.id, titel: c.title, kategorie: c.category, definition: c.definition, stufen: c.levels }))),
  };
}
out.gewichte = { kern: clean(CORE.map(({ id, name, weight }) => ({ id, name, gewicht: weight }))), leadership: clean(LEAD.map(({ id, name, weight }) => ({ id, name, gewicht: weight }))) };
out.zielerreichung_in_bars_stufe = clean(BARS_RANGES);
out.gps_einstufung = clean(RATINGS.map(({ min, max, label, desc }) => ({ min, max, label, desc })));

mkdirSync(join(root, 'docs', 'bars'), { recursive: true });
writeFileSync(join(root, 'docs', 'bars', 'bars-aktuell.json'), JSON.stringify(out, null, 2) + '\n');

const de = out.sprachen.de;
let md = `# BARS – was die App aktuell verwendet\n\n`;
md += `Automatisch aus \`index.html\` erzeugt (Commit \`${commit}\`, ${out.erzeugt}). **Nicht von Hand ändern**: Quelle ist die App; neu erzeugen mit \`cd tests && node tools/bars-export.mjs\`.\n`;
md += `Alle Sprachen (DE/IT/EN) maschinenlesbar in [bars-aktuell.json](bars-aktuell.json).\n\n`;
md += `## Skala und Umrechnung\n\n| Zielerreichung | BARS-Stufe |\n|---|---|\n`;
for (const r of out.zielerreichung_in_bars_stufe) md += `| ${r.label} | ${r.score} |\n`;
md += `\n| GPS | Einstufung | Bedeutung |\n|---|---|---|\n`;
for (const r of out.gps_einstufung) md += `| ${r.min.toFixed(2)} – ${r.max.toFixed(2)} | ${r.label} | ${r.desc} |\n`;
md += `\nGewichte: Kern-Kompetenzen je ${out.gewichte.kern[0].gewicht} %, Leadership-Kompetenzen je ${out.gewichte.leadership[0].gewicht} % (innerhalb ihres Blocks).\n\n`;
md += `## Kurzanker im Beurteilungsbogen\n\n`;
const names = Object.fromEntries([...out.gewichte.kern, ...out.gewichte.leadership].map((c) => [c.id, c.name]));
for (const [id, lv] of Object.entries(de.kurzanker_im_bogen)) {
  md += `**${names[id] || id}** (\`${id}\`)\n\n`;
  for (const s of [1, 2, 3, 4, 5]) md += `- ${s}: ${lv[s]}\n`;
  md += '\n';
}
md += `## Kompetenzen ausführlich (Seite „Kompetenzen“)\n\n`;
for (const c of de.kompetenzen) {
  md += `### ${c.titel} (${c.kategorie === 'core' ? 'Kern' : 'Leadership'}, \`${c.id}\`)\n\n${c.definition || ''}\n\n`;
  for (const s of [1, 2, 3, 4, 5]) {
    const l = c.stufen?.[s] || {};
    md += `**Stufe ${s}:** ${l.text || ''}\n\n`;
    if (l.example) md += `*Beispiele:* ${l.example}\n\n`;
  }
}
// Befund (nur Hinweis, nichts geändert): Die Umrechnung im Beurteilungsbogen weicht an einer Grenze von der Tabelle ab
if (/if \(pct >= 130\) return 5;/.test(src)) md += `## Hinweis (Befund, an der App nichts geändert)\n\nDer Bogen und die gespeicherten Werte vergeben Stufe 5 ab **131 %** (Tabelle oben). Nur die Druck-/PDF-Vorlage (\`PrintLayout\`) rechnet mit einer eigenen Kopie und vergibt Stufe 5 bereits ab **130 %**. Bei genau 130 % Zielerreichung kann der Ausdruck also eine andere Stufe zeigen als die App. Das ist Berechnungslogik (Schutzbereich) und bleibt, bis HR entscheidet, welche Grenze gilt.\n`;
writeFileSync(join(root, 'docs', 'bars', 'BARS-AKTUELL.md'), md);
console.log(`docs/bars/BARS-AKTUELL.md und bars-aktuell.json erzeugt (${de.kompetenzen.length} Kompetenzen, ${Object.keys(de.kurzanker_im_bogen).length} Kurzanker-Sätze, Commit ${commit}).`);
