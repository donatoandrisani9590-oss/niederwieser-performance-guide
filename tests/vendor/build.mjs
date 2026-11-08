// Baut lokale Kopien der CDN-Abhängigkeiten der App aus npm (gleiche Versionen wie in index.html).
// Nur für die Tests: Die Testumgebung hat keinen Zugriff auf die CDNs. index.html bleibt unverändert
// und lädt im Betrieb weiterhin von den CDNs.
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const tests = join(here, '..');
const dist = join(here, 'dist');
const require = createRequire(join(tests, 'package.json'));
mkdirSync(dist, { recursive: true });

const REACT_URL = 'https://esm.sh/react@18.2.0';
const REACT_NAMES = Object.keys(require('react')).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== 'default');

// require('react') innerhalb von react-dom/lucide auf die gemeinsame React-Instanz (URL) umbiegen
const sharedReact = {
  name: 'shared-react',
  setup(b) {
    b.onResolve({ filter: /^react$/ }, (a) => (a.importer.endsWith('react-entry.js') ? null : { path: 'react', namespace: 'shared-react' }));
    b.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: 'react/jsx-runtime', namespace: 'shared-react' }));
    b.onLoad({ filter: /.*/, namespace: 'shared-react' }, (a) => ({
      contents: a.path === 'react'
        ? `import R from '${REACT_URL}'; export default R; export const { ${REACT_NAMES.join(', ')} } = R;`
        : `import R from '${REACT_URL}'; const jsx=(t,p,k)=>R.createElement(t,k===undefined?p:{...p,key:k}); export {jsx, jsx as jsxs}; export const Fragment=R.Fragment;`,
      loader: 'js',
    }));
    b.onResolve({ filter: /^https:\/\// }, (a) => ({ path: a.path, external: true }));
  },
};

async function cjsToEsm(pkg, outName) {
  const mod = require(pkg);
  const names = Object.keys(mod).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && k !== 'default');
  const entry = join(dist, `${outName}-entry.js`);
  writeFileSync(entry, `import M from '${pkg}';\nexport default M;\nexport const { ${names.join(', ')} } = M;\n`);
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', outfile: join(dist, `${outName}.mjs`),
    define: { 'process.env.NODE_ENV': '"production"' }, plugins: pkg === 'react' ? [] : [sharedReact],
    absWorkingDir: tests, logLevel: 'error',
  });
}

await cjsToEsm('react', 'react');
await cjsToEsm('react-dom/client', 'react-dom-client');
await build({
  stdin: { contents: "export * from 'lucide-react';", resolveDir: tests }, bundle: true, format: 'esm',
  outfile: join(dist, 'lucide-react.mjs'), plugins: [sharedReact], logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"production"' },
});

for (const f of ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js', 'firebase-storage-compat.js']) {
  copyFileSync(join(tests, 'node_modules', 'firebase', f), join(dist, f));
}
copyFileSync(join(tests, 'node_modules', 'html2pdf.js', 'dist', 'html2pdf.bundle.min.js'), join(dist, 'html2pdf.bundle.min.js'));

// Tailwind: statt Play-CDN (JIT im Browser) einmal mit derselben Version (3.4.17) über index.html kompilieren.
// Die Theme-Erweiterung (Animationen) wird aus index.html übernommen.
const html = readFileSync(join(tests, '..', 'index.html'), 'utf8');
const cfgMatch = html.match(/tailwind\.config = (\{[\s\S]*?\n {8}\});/);
writeFileSync(join(dist, 'tailwind.config.cjs'),
  `module.exports = Object.assign(${cfgMatch ? cfgMatch[1] : '{}'}, { content: [${JSON.stringify(join(tests, '..', 'index.html'))}] });\n`);
writeFileSync(join(dist, 'tailwind.in.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
execFileSync(join(tests, 'node_modules', '.bin', 'tailwindcss'),
  ['-c', join(dist, 'tailwind.config.cjs'), '-i', join(dist, 'tailwind.in.css'), '-o', join(dist, 'tailwind.css')], { stdio: 'pipe' });
const css = readFileSync(join(dist, 'tailwind.css'), 'utf8');
writeFileSync(join(dist, 'tailwind-cdn.js'),
  `window.tailwind = window.tailwind || {};\n(function(){var s=document.createElement('style');s.setAttribute('data-test-tailwind','');s.textContent=${JSON.stringify(css)};(document.head||document.documentElement).appendChild(s);})();\n`);

console.log('Vendor-Dateien gebaut in', dist);
