// Vorher-Nachher-Bildschirmfotos für docs/premium-ux (nur lokale Vorschau, Emulator, Testdaten).
// Aufruf im Ordner tests, während „npm run vorschau“ läuft:  node shots-premium.mjs <vorher-index.html>
// „Vorher“ liefert die übergebene alte index.html über einen eigenen lokalen Server aus (Port 5180), mit demselben
// Emulator-Skript wie die Vorschau. Beide Durchläufe prüfen vor der Anmeldung, dass der Emulator verbunden ist.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed, USERS, setDoc, getDoc } from './e2e/seed.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'docs', 'premium-ux', 'screenshots');
mkdirSync(out, { recursive: true });
const URL0 = 'http://127.0.0.1:5174/index.html';
const baseHtml = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : null;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const plain = (doc) => Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, Object.values(v)[0]]));

async function run(tag, useBase) {
  await seed();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  await setDoc('teamMembers/tm-emil', { ...plain(await getDoc('teamMembers/tm-emil')), scheduledAt: today.toISOString(), scheduledSource: 'form' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' });
  const page = await ctx.newPage();
  let server = null;
  let url = URL0;
  if (useBase) {
    const live = await (await fetch(URL0)).text();
    const patch = live.slice(live.indexOf('<head>') + 6, live.indexOf('</script>') + 9); // Emulator-Skript der Vorschau
    const html = baseHtml.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '').replace('<head>', '<head>' + patch);
    server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html); });
    await new Promise((r) => server.listen(5180, '127.0.0.1', r));
    url = 'http://127.0.0.1:5180/index.html';
  }
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  const shot = (name, opts) => page.screenshot({ path: join(out, `${name}-${tag}.png`), ...opts });
  const login = async (u) => {
    await page.goto(url);
    await page.waitForFunction(() => window.__EMULATOR_CONNECTED__ === true);
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Team-Übersicht', { exact: true }).click();
    await page.locator('input[type="email"]').fill(u.email);
    await page.locator('input[type="password"]').first().fill(u.password);
    await page.locator('form button[type="submit"]').click();
  };
  const nav = (t) => page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText(t, { exact: true }).click();
  const row = (n) => page.getByRole('row').filter({ hasText: n });

  await login(USERS.managerA);
  await page.getByText('4 Mitarbeiter').waitFor();
  await page.waitForTimeout(600);
  await shot('01-team-uebersicht');                                   // „Gespräch heute“ statt „überfällig“, Kennzahl
  await shot('02-nutzerkarte', { clip: { x: 0, y: 760, width: 290, height: 140 } });
  await nav('Dashboard');
  await page.getByText('Meine offenen Punkte').waitFor();
  await shot('03-dashboard-offene-punkte', { clip: { x: 300, y: 0, width: 1140, height: 520 } });
  // Seitenwechsel: gescrollt eine Selbstreflexion öffnen
  await nav('Team-Übersicht');
  await page.getByText('4 Mitarbeiter').waitFor();
  await page.evaluate(() => { document.querySelector('main').scrollTop = 260; });
  await row('Clara Beispiel').getByRole('button', { name: 'Ansehen' }).click();
  await page.getByRole('heading', { name: 'Clara Beispiel' }).waitFor({ state: 'attached' });
  await page.waitForTimeout(500);
  await shot('04-selbstreflexion-oeffnen');
  if (!useBase) {
    // Neuer Dialog (vorher: graues Browser-Fenster, lässt sich nicht fotografieren)
    await nav('Team-Übersicht');
    await page.getByText('4 Mitarbeiter').waitFor();
    await row('Emil Probe').getByRole('button', { name: 'Starten', exact: true }).click();
    await page.getByRole('button', { name: /Abschließen/ }).first().click();
    await page.locator('[data-nw-dialog]').last().waitFor();
    await page.waitForTimeout(350);
    await shot('05-dialog-abschluss-pruefung');
    await page.locator('[data-nw-cancel]').last().click();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.locator('[data-nw-dialog]').last().waitFor();
    await page.waitForTimeout(350);
    await shot('06-dialog-formular-verlassen');
    await page.locator('[data-nw-ok]').last().click();
    await nav('Team-Übersicht');
    await page.getByText('4 Mitarbeiter').waitFor();
    await row('Emil Probe').getByRole('button', { name: /Weitere Aktionen/ }).click();
    await page.getByRole('menuitem', { name: 'Entfernen' }).click();
    await page.locator('[data-nw-dialog] input').last().fill('Emil Pro');
    await page.waitForTimeout(350);
    await shot('07-dialog-entfernen-name');
    await page.locator('[data-nw-cancel]').last().click();
    await row('Clara Beispiel').getByRole('button', { name: /Weitere Aktionen/ }).click();
    await page.getByRole('menuitem', { name: 'Beurteilungsgespräch: zurücksetzen' }).click();
    await page.locator('#nw-toast-region').getByRole('button', { name: 'Rückgängig' }).waitFor();
    await page.waitForTimeout(300);
    await shot('08-toast-rueckgaengig');
  }
  // HR-Reiter
  await page.locator('aside').getByText('Abmelden').first().click();
  await login(USERS.hr);
  await page.getByText('Abmelden').first().waitFor();
  await nav('HR Dashboard');
  await page.getByRole('tab', { name: /Normalverteilung/ }).waitFor();
  await page.waitForTimeout(800);
  await shot('10-hr-reiter', { clip: { x: 300, y: 0, width: 1140, height: 330 } });
  await ctx.close();
  if (server) server.close();
}

if (baseHtml && !process.env.NUR_NACHHER) await run('vorher', true);
await run('nachher', false);
await browser.close();
console.log('Bildschirmfotos in', out);
