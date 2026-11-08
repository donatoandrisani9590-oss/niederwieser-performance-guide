#!/usr/bin/env node
// Phase 1b: überträgt die Darstellungswerte in index.html auf die n.Org-Tokens.
// Ändert ausschließlich Klassen-Namen und Farb-/Größenwerte in Styles. Logik, Daten, Texte bleiben.
// Ausführung:  node docs/redesign/tools/map-tokens.mjs [--dry]
// Danach Pflicht: node tests/protected/fingerprint.mjs  und  cd tests && npm test
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const require = createRequire(join(root, 'tests', 'package.json'));
const palette = require('tailwindcss/colors');
const file = join(root, 'index.html');
let src = readFileSync(file, 'utf8');
const stats = {};
const count = (k, n = 1) => { stats[k] = (stats[k] || 0) + n; };

// ---------------------------------------------------------------- Tokens
const T = {
  panel: '#F4F2EE', white: '#FFFFFF', line: '#E4E0DA', 'line-2': '#EEEBE6',
  'nw-blue': '#243186', 'nw-blue-90': '#3A46A0', 'nw-blue-25': '#C9CDE3', 'nw-blue-12': '#E6E8F2', 'nw-blue-06': '#F2F3F8',
  'nw-green': '#6EBD84', 'nw-green-15': '#E8F5EC', 'nw-grey': '#D7CFC5', 'nw-grey-40': '#F3F0EC',
  ink: '#1C1F2E', 'ink-60': '#5F6377', 'ink-40': '#8B8FA1',
  ok: '#2F7A48', 'ok-bg': '#E8F5EC', warn: '#9A6414', 'warn-bg': '#FBF1DD', danger: '#9B2C22', 'danger-bg': '#FBECEA',
  'traffic-red': '#E50046', 'traffic-amber': '#F59D24',
};
const TOKEN_HEX = new Set(Object.values(T).map((h) => h.toUpperCase()));
const HEX_TO_TOKEN = {};
for (const [k, v] of Object.entries(T)) HEX_TO_TOKEN[v.toUpperCase()] ??= k; // erste Rolle gewinnt (ok-bg = nw-green-15 → nw-green-15)

const FAMILY = {
  slate: 'neutral', gray: 'neutral', zinc: 'neutral', neutral: 'neutral', stone: 'neutral',
  blue: 'blue', indigo: 'blue', sky: 'blue', violet: 'blue', purple: 'blue', fuchsia: 'blue',
  green: 'green', emerald: 'green', teal: 'green', cyan: 'green', lime: 'green',
  red: 'red', rose: 'red', pink: 'red',
  amber: 'warn', yellow: 'warn', orange: 'warn',
};
const S = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const row = (...v) => Object.fromEntries(S.map((s, i) => [s, v[i]]));
// Rolle → Familie → Stufe → Token (optional mit Deckkraft "token/NN")
const MAP = {
  bg: {
    neutral: row('panel', 'nw-grey-40', 'line', 'nw-grey', 'ink-40', 'ink-60', 'ink-60', 'ink', 'ink', 'ink', 'ink'),
    blue: row('nw-blue-06', 'nw-blue-12', 'nw-blue-25', 'nw-blue-25', 'nw-blue-90', 'nw-blue', 'nw-blue', 'nw-blue-90', 'nw-blue', 'nw-blue', 'nw-blue'),
    green: row('nw-green-15', 'nw-green-15', 'nw-green-15', 'nw-green', 'nw-green', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'),
    red: row('danger-bg', 'danger-bg', 'danger-bg', 'danger-bg', 'danger', 'danger', 'danger', 'danger', 'danger', 'danger', 'danger'),
    warn: row('warn-bg', 'warn-bg', 'warn-bg', 'traffic-amber', 'traffic-amber', 'warn', 'warn', 'warn', 'warn', 'warn', 'warn'),
  },
  text: {
    neutral: row('nw-grey-40', 'nw-grey-40', 'line', 'nw-grey', 'ink-40', 'ink-60', 'ink-60', 'ink', 'ink', 'ink', 'ink'),
    blue: row('nw-blue-06', 'nw-blue-12', 'nw-blue-25', 'nw-blue-25', 'nw-blue', 'nw-blue', 'nw-blue', 'nw-blue', 'nw-blue', 'nw-blue', 'nw-blue'),
    green: row('nw-green-15', 'nw-green-15', 'nw-green-15', 'nw-green', 'nw-green', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'),
    red: row('danger-bg', 'danger-bg', 'danger-bg', 'danger', 'danger', 'danger', 'danger', 'danger', 'danger', 'danger', 'danger'),
    warn: row('warn-bg', 'warn-bg', 'warn-bg', 'traffic-amber', 'traffic-amber', 'warn', 'warn', 'warn', 'warn', 'warn', 'warn'),
  },
  border: {
    neutral: row('line-2', 'line-2', 'line', 'line', 'nw-grey', 'ink-40', 'ink-40', 'ink-60', 'ink', 'ink', 'ink'),
    blue: row('nw-blue-12', 'nw-blue-12', 'nw-blue-25', 'nw-blue-25', 'nw-blue', 'nw-blue', 'nw-blue', 'nw-blue', 'nw-blue', 'nw-blue', 'nw-blue'),
    green: row('nw-green/40', 'nw-green/40', 'nw-green/40', 'nw-green', 'nw-green', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'),
    red: row('danger/30', 'danger/30', 'danger/30', 'danger/30', 'danger', 'danger', 'danger', 'danger', 'danger', 'danger', 'danger'),
    warn: row('warn/30', 'warn/30', 'warn/30', 'warn/30', 'warn', 'warn', 'warn', 'warn', 'warn', 'warn', 'warn'),
  },
};
const ROLE_OF_PREFIX = {
  bg: 'bg', from: 'bg', via: 'bg', to: 'bg', fill: 'text', stroke: 'text',
  text: 'text', placeholder: 'text', accent: 'text', caret: 'text', decoration: 'text',
  border: 'border', 'border-t': 'border', 'border-b': 'border', 'border-l': 'border', 'border-r': 'border',
  'border-x': 'border', 'border-y': 'border', ring: 'border', divide: 'border', outline: 'border', 'ring-offset': 'border',
};
const tokenFor = (role, family, shade, hasOpacity) => {
  let t = MAP[role][family][shade];
  if (hasOpacity) t = t.split('/')[0];
  return t;
};

// ---------------------------------------------------------------- 1) Verläufe → Flächenfarbe
// bg-gradient-to-X entfernen; from-C → bg-C; via-*/to-* entfernen (n.Org hat keine Verläufe).
src = src.replace(/(?<![\w-])bg-gradient-to-(?:t|tr|r|br|b|bl|l|tl)(?![\w-])\s?/g, () => { count('gradient-class'); return ''; });
src = src.replace(/(?<![\w-:])((?:[a-z-]+:)*)from-([a-z]+-\d{2,3}|\[#[0-9a-fA-F]{3,6}\]|white|black|transparent)((?:\/\d+)?)(?![\w-])/g,
  (m, v, c, o) => { count('gradient-from'); return `${v}bg-${c}${o}`; });
src = src.replace(/\s?(?<![\w-])(?:[a-z-]+:)*(?:via|to)-(?:[a-z]+-\d{2,3}|\[#[0-9a-fA-F]{3,6}\]|white|black|transparent)(?:\/\d+)?(?![\w-])/g, () => { count('gradient-via-to'); return ''; });

// ---------------------------------------------------------------- 2) Standardfarben in Klassen
const famRe = Object.keys(FAMILY).join('|');
const prefRe = Object.keys(ROLE_OF_PREFIX).sort((a, b) => b.length - a.length).join('|');
src = src.replace(new RegExp(`(?<![\\w-])(${prefRe})-(${famRe})-(\\d{2,3})(\\/\\d+)?(?![\\w-])`, 'g'), (m, p, fam, shade, op) => {
  const t = tokenFor(ROLE_OF_PREFIX[p], FAMILY[fam], Number(shade), !!op);
  if (!t) return m;
  count('color-class');
  return `${p}-${t}${op || ''}`;
});
// farbige Schatten entfernen (n.Org: drei neutrale Schatten)
src = src.replace(/\s?(?<![\w-])(?:[a-z-]+:)*shadow-(?:[a-z]+-\d{2,3}|nw-[a-z0-9-]+|ink[a-z0-9-]*|ok|warn|danger)(?:\/\d+)?(?![\w-])/g, (m) => { count('shadow-color'); return ''; });
// Schwarz → ink, Overlays einheitlich ink/30
src = src.replace(/(?<![\w-])bg-black\/\d+(?![\w-])/g, () => { count('overlay'); return 'bg-ink/30'; });
src = src.replace(/(?<![\w-])(bg|text|border)-black(?![\w-])/g, (m, p) => { count('black'); return `${p}-ink`; });

// ---------------------------------------------------------------- 3) Hex-Werte
const hexToRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const PAL = [];
for (const [fam, shades] of Object.entries(palette)) {
  if (!FAMILY[fam] || typeof shades !== 'object') continue;
  for (const [sh, hex] of Object.entries(shades)) PAL.push({ fam: FAMILY[fam], shade: Number(sh), rgb: hexToRgb(hex) });
}
const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
function hexToTokenHex(hex, role) {
  const H = hex.toUpperCase().length === 4 ? '#' + [...hex.slice(1).toUpperCase()].map((c) => c + c).join('') : hex.toUpperCase();
  if (TOKEN_HEX.has(H)) return H;
  if (H === '#000000') return T.ink;
  const rgb = hexToRgb(H);
  // sehr helle Grautöne → Weiß bzw. Panel
  if (Math.min(...rgb) >= 250) return T.white;
  // nächster Ton der Tailwind-Palette oder direkt nächster Token (Markenfarb-Varianten wie #1A2564, #5DA872)
  let best = PAL[0], bd = Infinity;
  for (const p of PAL) { const d = dist(p.rgb, rgb); if (d < bd) { bd = d; best = p; } }
  let tokBest = null, td = Infinity;
  for (const [k, v] of Object.entries(T)) { const d = dist(hexToRgb(v), rgb); if (d < td) { td = d; tokBest = k; } }
  if (td <= bd || td < 900) return T[tokBest];
  const t = tokenFor(role, best.fam, best.shade, true);
  return T[t];
}
const roleOfKey = (key) => {
  const k = key.toLowerCase();
  if (/background|^bg|fill/.test(k)) return 'bg';
  if (/border|outline|stroke|ring/.test(k)) return 'border';
  if (/color/.test(k)) return 'text';
  return 'bg';
};
// 3a) arbitrary Klassen: bg-[#xxx] → bg-token
src = src.replace(new RegExp(`(?<![\\w-])(${prefRe})-\\[(#[0-9a-fA-F]{3,6})\\](\\/\\d+)?`, 'g'), (m, p, hex, op) => {
  const th = hexToTokenHex(hex, ROLE_OF_PREFIX[p]);
  const name = HEX_TO_TOKEN[th];
  count('hex-class');
  return name ? `${p}-${name}${op || ''}` : `${p}-[${th}]${op || ''}`;
});
// 3b) Hex in Styles (JS-Objekte, CSS, SVG): Rolle aus dem vorangehenden Schlüssel ableiten
src = src.replace(/#[0-9a-fA-F]{6}(?![\w-])|#[0-9a-fA-F]{3}(?![\w-])/g, (hex, idx, all) => {
  const before = all.slice(Math.max(0, idx - 60), idx);
  // nicht in URLs, Ankern oder Kommentaren mit "#" als Nummer anfassen
  if (/[&?=\/]$/.test(before) || /['"`]$/.test(before) && /^#[0-9]{3}$/.test(hex)) return hex;
  const km = before.match(/([A-Za-z-]+)\s*[:=]\s*['"]?[^;,{}'"]*$/);
  const role = km ? roleOfKey(km[1]) : 'bg';
  const out = hexToTokenHex(hex, role);
  if (out.toUpperCase() !== hex.toUpperCase()) count('hex-value');
  return out;
});
// 3c) Verläufe in Styles → erste Farbe
src = src.replace(/linear-gradient\((?:[^()]|\([^()]*\))*\)/g, (g) => {
  const m = g.match(/#[0-9A-Fa-f]{6}|rgba?\([^)]*\)/);
  count('style-gradient');
  return m ? m[0] : g;
});

// ---------------------------------------------------------------- 4) Schriftgrößen, Gewichte
src = src.replace(/(?<![\w-])((?:[a-z-]+:)*)text-(3xl|4xl|5xl|6xl|7xl|8xl|9xl)(?![\w-])/g, (m, v) => { count('size-big'); return `${v}text-2xl`; });
src = src.replace(/(?<![\w-])((?:[a-z-]+:)*)text-\[(9|10)px\]/g, (m, v) => { count('size-tiny'); return `${v}text-2xs`; });
src = src.replace(/fontSize: ?'(9|10)px'/g, () => { count('size-inline'); return "fontSize: '11px'"; });
src = src.replace(/fontSize: ?'20px'/g, () => { count('size-inline'); return "fontSize: '22px'"; });
src = src.replace(/(?<![\w-])((?:[a-z-]+:)*)font-(bold|extrabold|black)(?![\w-])/g, (m, v) => { count('weight'); return `${v}font-semibold`; });
src = src.replace(/fontWeight: ?('bold'|'700'|'800'|'900'|700|800|900)(?=\s*[,}])/g, () => { count('weight-inline'); return "fontWeight: '600'"; });

// ---------------------------------------------------------------- 5) Radien, Schatten
src = src.replace(/(?<![\w-])((?:[a-z-]+:)*)rounded-((?:[trbl]|tr|tl|br|bl)-)?(2xl)(?![\w-])/g, (m, v, side) => { count('radius'); return `${v}rounded-${side || ''}card`; });
src = src.replace(/(?<![\w-])((?:[a-z-]+:)*)rounded-((?:[trbl]|tr|tl|br|bl)-)?(3xl)(?![\w-])/g, (m, v, side) => { count('radius'); return `${v}rounded-${side || ''}xl`; });
src = src.replace(/(?<![\w-])((?:[a-z-]+:)*)rounded-((?:[trbl]|tr|tl|br|bl)-)?(md|sm)(?![\w-])/g, (m, v, side) => { count('radius'); return `${v}rounded-${side || ''}lg`; });
src = src.replace(/(?<![\w-:])((?:[a-z-]+:)*)rounded(?=['"\s`])/g, (m, v) => { count('radius'); return `${v}rounded-lg`; });
src = src.replace(/(?<![\w-])((?:[a-z-]+:)*)shadow-(sm|md)(?![\w-])/g, (m, v) => { count('shadow'); return `${v}shadow-card`; });
src = src.replace(/(?<![\w-:])((?:[a-z-]+:)*)shadow(?=['"\s`])/g, (m, v) => { count('shadow'); return `${v}shadow-card`; });
src = src.replace(/(?<![\w-])((?:[a-z-]+:)*)shadow-(lg|xl|2xl)(?![\w-])/g, (m, v) => { count('shadow'); return `${v}shadow-float`; });

// Doppelte Leerzeichen in Klassenstrings, die durch Entfernen entstanden sind
src = src.replace(/className: '([^']*)'/g, (m, c) => `className: '${c.replace(/ {2,}/g, ' ').trim()}'`);

console.log(stats);
if (!process.argv.includes('--dry')) writeFileSync(file, src);
