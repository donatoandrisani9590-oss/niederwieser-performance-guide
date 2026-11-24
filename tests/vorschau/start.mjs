// Lokale Vorschau zum Ausprobieren im eigenen Browser – NUR mit Testdaten im Emulator, nie mit Produktivdaten.
// Start (im Ordner tests):  npm run vorschau   → dann http://127.0.0.1:5174/index.html öffnen
// Was hier passiert (index.html selbst bleibt unverändert):
//  - Emulatoren laufen mit den eingespielten Regeln (rules/vorschlag.rules), Testdaten aus e2e/seed.mjs
//  - index.html wird beim Ausliefern um ein kleines Skript ergänzt, das Firebase auf den Emulator umleitet,
//    und die CSP-Zeile wird nur in dieser Auslieferung entfernt (sie würde den Emulator blockieren)
//  - Schutz: Erreicht die Seite trotzdem keine Emulator-Verbindung, zeigt sie einen roten Hinweis.
// Testkonten (nur im Emulator): siehe USERS in e2e/seed.mjs, Passwort Test-1234.
// Mitarbeiter-Link zum Testen: http://127.0.0.1:5174/index.html?accessCode=CODE-tm-emil
// Ausgeschaltete Funktionen testen: http://127.0.0.1:5174/index.html?nwFeatures=shareWithEmployee,userAdmin
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed, USERS } from '../e2e/seed.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 5174;
const PATCH = `<script>
(() => {
  // Ausgeschaltete Funktionen nur in der Vorschau einschalten: ?nwFeatures=shareWithEmployee,userAdmin
  try { const f = new URLSearchParams(location.search).get('nwFeatures');
    if (f) { window.__NW_FEATURES__ = Object.fromEntries(f.split(',').map((k) => [k.trim(), true])); sessionStorage.setItem('nwPreviewFeatures', f); }
    else if (sessionStorage.getItem('nwPreviewFeatures')) window.__NW_FEATURES__ = Object.fromEntries(sessionStorage.getItem('nwPreviewFeatures').split(',').map((k) => [k.trim(), true]));
  } catch (e) {}
  let fb;
  Object.defineProperty(window, 'firebase', { configurable: true, get() { return fb; }, set(v) {
    fb = v;
    if (v && v.initializeApp && !v.__emu) {
      const orig = v.initializeApp.bind(v);
      v.initializeApp = (...a) => { const app = orig(...a);
        app.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
        app.firestore().useEmulator('127.0.0.1', 8080);
        try { app.storage().useEmulator('127.0.0.1', 9199); } catch (e) {}
        window.__EMULATOR_CONNECTED__ = true; return app; };
      v.__emu = true;
    }
  } });
  window.addEventListener('load', () => {
    const bar = document.createElement('div');
    bar.textContent = window.__EMULATOR_CONNECTED__ ? 'LOKALE VORSCHAU · nur Testdaten (Emulator)' : 'ACHTUNG: keine Emulator-Verbindung – nichts eingeben, Fenster schließen';
    bar.style.cssText = 'position:fixed;left:0;bottom:0;z-index:99999;padding:2px 8px;font:600 11px system-ui;color:#fff;background:' + (window.__EMULATOR_CONNECTED__ ? '#1F3D7A' : '#B42318');
    document.body.appendChild(bar);
  });
})();
</script>`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };

await seed();
console.log('Testdaten angelegt. Testkonten (Passwort Test-1234):');
for (const [k, u] of Object.entries(USERS)) console.log(`  ${k.padEnd(9)} ${u.email}  (${u.name})`);

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); return res.end('nicht gefunden'); }
  let data = readFileSync(file);
  if (file.endsWith('index.html')) {
    data = String(data).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '').replace('<head>', '<head>' + PATCH);
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(data);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`\nVorschau: http://127.0.0.1:${PORT}/index.html`);
  console.log(`Mitarbeiter-Link: http://127.0.0.1:${PORT}/index.html?accessCode=CODE-tm-emil`);
  console.log(`Mit Schaltern:    http://127.0.0.1:${PORT}/index.html?nwFeatures=shareWithEmployee,userAdmin`);
  console.log('Beenden mit Ctrl+C. Testdaten neu: einfach neu starten.');
});
