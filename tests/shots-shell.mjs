// Bildschirmfotos der Shell 2.0 in ihren drei Zuständen (nur lokale Vorschau, Emulator, Testdaten).
// Aufruf im Ordner tests, während „npm run vorschau“ läuft:  node shots-shell.mjs
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
const shot = (name, opts) => page.screenshot({ path: join(out, name + '.png'), ...opts });
await page.goto('http://127.0.0.1:5174/index.html');
await page.waitForFunction(() => window.__EMULATOR_CONNECTED__ === true); // nie ohne Emulator weitermachen
await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Team-Übersicht', { exact: true }).click();
await page.locator('input[type="email"]').fill(USERS.managerA.email);
await page.locator('input[type="password"]').first().fill(USERS.managerA.password);
await page.locator('form button[type="submit"]').click();
await page.getByText('4 Mitarbeiter').waitFor();
await page.waitForTimeout(600);
await shot('20-shell-desktop');
await page.getByTestId('user-card').click();
await page.getByRole('dialog', { name: 'Konto' }).waitFor();
await page.waitForTimeout(300);
await shot('21-shell-konto-popover', { clip: { x: 0, y: 560, width: 420, height: 340 } });
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Zurück', exact: true }).hover();
await page.waitForTimeout(450);
await shot('22-shell-pillen', { clip: { x: 0, y: 0, width: 300, height: 190 } });
await page.mouse.move(700, 400);
await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForTimeout(500);
await shot('23-shell-tablet-rail');
await page.getByRole('button', { name: 'Seitenleiste aufklappen' }).click();
await page.waitForTimeout(500);
await shot('24-shell-tablet-overlay');
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await shot('25-shell-handy-topleiste');
await page.getByRole('button', { name: 'Menü' }).click();
await page.waitForTimeout(500);
await shot('26-shell-handy-schublade');
await browser.close();
console.log('fertig');
