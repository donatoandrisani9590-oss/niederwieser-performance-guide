// Gemeinsame Test-Umgebung:
//  - CDN-Dateien werden lokal aus tests/vendor/dist ausgeliefert (gleiche Versionen wie index.html)
//  - Firebase wird beim Start auf den lokalen Emulator umgeleitet (ohne index.html zu ändern)
//  - JEDE Anfrage an echte Google-/Firebase-Server wird blockiert und lässt den Test scheitern.
//    So kann ein Test niemals Produktivdaten lesen oder schreiben.
import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'vendor', 'dist');

const CDN = {
  'https://cdn.tailwindcss.com/3.4.17': ['tailwind-cdn.js', 'application/javascript'],
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js': ['html2pdf.bundle.min.js', 'application/javascript'],
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js': ['firebase-app-compat.js', 'application/javascript'],
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js': ['firebase-auth-compat.js', 'application/javascript'],
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js': ['firebase-firestore-compat.js', 'application/javascript'],
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js': ['firebase-storage-compat.js', 'application/javascript'],
  'https://esm.sh/react@18.2.0': ['react.mjs', 'application/javascript'],
  'https://esm.sh/react-dom@18.2.0/client': ['react-dom-client.mjs', 'application/javascript'],
  'https://esm.sh/lucide-react@0.292.0': ['lucide-react.mjs', 'application/javascript'],
};
const cache = {};
const body = (f) => (cache[f] ||= readFileSync(join(dist, f)));

// Läuft vor jedem Skript der Seite: hängt sich an firebase.initializeApp und verbindet Emulatoren.
const EMULATOR_PATCH = `
(() => {
  let fb;
  Object.defineProperty(window, 'firebase', {
    configurable: true,
    get() { return fb; },
    set(v) {
      fb = v;
      if (v && v.initializeApp && !v.__emu) {
        const orig = v.initializeApp.bind(v);
        v.initializeApp = (...a) => {
          const app = orig(...a);
          app.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
          app.firestore().useEmulator('127.0.0.1', 8080);
          try { app.storage().useEmulator('127.0.0.1', 9199); } catch (e) {}
          window.__EMULATOR_CONNECTED__ = true;
          return app;
        };
        v.__emu = true;
      }
    },
  });
})();`;

export const test = base.extend({
  blockedRequests: async ({}, use) => { await use([]); },
  consoleErrors: async ({}, use) => { await use([]); },
  page: async ({ page, blockedRequests, consoleErrors }, use) => {
    await page.addInitScript(EMULATOR_PATCH);
    await page.route('**/*', (route) => {
      const url = route.request().url();
      const u = new URL(url);
      if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return route.continue();
      const hit = CDN[url.split('?')[0]];
      if (hit) return route.fulfill({ status: 200, contentType: hit[1], body: body(hit[0]), headers: { 'access-control-allow-origin': '*' } });
      blockedRequests.push(url);
      return route.abort('blockedbyclient');
    });
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
    page.on('dialog', (d) => d.dismiss().catch(() => {}));
    await use(page);
    // Harte Sicherung: Niemals echte Firebase-/Google-Server erreicht
    const prod = blockedRequests.filter((x) => /googleapis\.com|firebaseio\.com|firebaseapp\.com|cloudfunctions\.net|firebasestorage/.test(x));
    expect(prod, 'Anfragen an Produktiv-Server (wurden blockiert)').toEqual([]);
  },
});

export { expect };

export async function openApp(page, query = '') {
  await page.goto('/index.html' + query);
  await expect.poll(() => page.evaluate(() => window.__EMULATOR_CONNECTED__ === true), { timeout: 15000 }).toBe(true);
}

export async function login(page, { email, password }) {
  await openApp(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('form button[type="submit"]').click();
}
