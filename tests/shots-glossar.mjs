// Bildschirmfotos des Glossars für docs/premium-ux (nur lokale Vorschau, Emulator, Testdaten).
// Aufruf im Ordner tests, während „npm run vorschau“ läuft:  node shots-glossar.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed, USERS } from './e2e/seed.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'premium-ux', 'screenshots');
mkdirSync(out, { recursive: true });
await seed();
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE' })).newPage();
await page.goto('http://127.0.0.1:5174/index.html');
await page.waitForFunction(() => window.__EMULATOR_CONNECTED__ === true); // nie ohne Emulator weitermachen
await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Team-Übersicht', { exact: true }).click();
await page.locator('input[type="email"]').fill(USERS.managerA.email);
await page.locator('input[type="password"]').first().fill(USERS.managerA.password);
await page.locator('form button[type="submit"]').click();
await page.getByText('4 Mitarbeiter').waitFor();
await page.locator('main [data-nw-term="GPS"]').first().hover();
await page.locator('[data-nw-gloss]').waitFor();
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, '15-glossar-kennzahl-nachher.png'), clip: { x: 760, y: 130, width: 680, height: 260 } });
await page.getByRole('row').filter({ hasText: 'Emil Probe' }).getByRole('button', { name: 'Starten', exact: true }).click();
const wie = page.locator('main [data-nw-term="WIE"]').first();
await wie.scrollIntoViewIfNeeded();
await page.evaluate(() => { document.querySelector('main').scrollTop += 120; });
await page.waitForTimeout(500);
await wie.hover();
await page.locator('[data-nw-gloss="WIE"]').waitFor();
await page.waitForTimeout(400);
const b = await wie.boundingBox();
await page.screenshot({ path: join(out, '16-glossar-bogen-nachher.png'), clip: { x: 300, y: Math.max(0, b.y - 60), width: 900, height: 230 } });
await browser.close();
console.log('fertig');
