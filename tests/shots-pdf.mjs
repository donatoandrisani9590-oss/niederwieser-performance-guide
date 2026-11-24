// Erzeugt echte PDFs (HR-Export und Beurteilungsbogen) aus zwei Fassungen der App, nur lokale Vorschau/Emulator.
// Aufruf im Ordner tests, während „npm run vorschau“ läuft:  node shots-pdf.mjs <vorher-index.html> <zielordner>
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { seed, USERS } from './e2e/seed.mjs';

const URL0 = 'http://127.0.0.1:5174/index.html';
const baseHtml = readFileSync(process.argv[2], 'utf8');
const out = process.argv[3];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });

async function run(tag, useBase) {
  await seed();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE', acceptDownloads: true });
  const page = await ctx.newPage();
  let server = null, url = URL0;
  if (useBase) {
    const live = await (await fetch(URL0)).text();
    const patch = live.slice(live.indexOf('<head>') + 6, live.indexOf('</script>') + 9);
    const html = baseHtml.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '').replace('<head>', '<head>' + patch);
    server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html); });
    await new Promise((r) => server.listen(5180, '127.0.0.1', r));
    url = 'http://127.0.0.1:5180/index.html';
  }
  const nav = (t) => page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText(t, { exact: true }).click();
  const login = async (u) => {
    await page.goto(url);
    await page.waitForFunction(() => window.__EMULATOR_CONNECTED__ === true);
    await nav('Team-Übersicht');
    await page.locator('input[type="email"]').fill(u.email);
    await page.locator('input[type="password"]').first().fill(u.password);
    await page.locator('form button[type="submit"]').click();
    await page.getByTestId('user-card').waitFor();
  };
  const save = async (name, trigger) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), trigger()]);
    await dl.saveAs(join(out, `${name}-${tag}.pdf`));
    console.log('gespeichert', `${name}-${tag}.pdf`);
  };
  // 1) HR-Export einer abgeschlossenen Beurteilung
  await login(USERS.hr);
  await nav('HR Dashboard');
  const row = page.getByRole('row').filter({ hasText: 'Clara Beispiel' }).filter({ hasText: 'Review' }).first();
  await row.getByRole('button', { name: 'Ansehen' }).click();
  await save('hr-export', () => page.getByRole('button', { name: 'PDF', exact: true }).click());
  await ctx.close();
  // 2) Beurteilungsbogen der Führungskraft
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE', acceptDownloads: true });
  const p2 = await ctx2.newPage();
  await p2.goto(url);
  await p2.waitForFunction(() => window.__EMULATOR_CONNECTED__ === true);
  await p2.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Team-Übersicht', { exact: true }).click();
  await p2.locator('input[type="email"]').fill(USERS.managerA.email);
  await p2.locator('input[type="password"]').first().fill(USERS.managerA.password);
  await p2.locator('form button[type="submit"]').click();
  await p2.getByText('4 Mitarbeiter').waitFor();
  await p2.getByRole('row').filter({ hasText: 'Clara Beispiel' }).getByRole('button', { name: 'Öffnen' }).first().click();
  const btn = p2.getByRole('button', { name: /PDF herunterladen/ }).first();
  await btn.waitFor();
  const [dl] = await Promise.all([p2.waitForEvent('download', { timeout: 90000 }), btn.click()]);
  await dl.saveAs(join(out, `bogen-${tag}.pdf`));
  console.log('gespeichert', `bogen-${tag}.pdf`);
  await ctx2.close();
  if (server) await new Promise((r) => server.close(r));
}
await run('vorher', true);
await run('nachher', false);
await browser.close();
