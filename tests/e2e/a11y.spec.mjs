// Barrierefreiheit (WCAG 2 A/AA) der wichtigsten Seiten mit axe-core. Läuft gegen den Emulator mit Testdaten.
import { test, expect, openApp } from './fixtures.mjs';
import { seed, USERS, ACCESS_CODE } from './seed.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSrc = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function violations(page) {
  await page.waitForTimeout(500);
  await page.addScriptTag({ content: axeSrc });
  return page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations
    .map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`));
}

async function login(page, user) {
  await openApp(page);
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('Abmelden').first()).toBeVisible({ timeout: 15000 });
}

test.beforeEach(async () => { await seed(); });

test('Dashboard und Anmeldung: keine WCAG-AA-Verstöße', async ({ page }) => {
  await openApp(page);
  expect(await violations(page), 'Dashboard').toEqual([]);
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  expect(await violations(page), 'Anmeldung').toEqual([]);
});

test('Team-Übersicht und Beurteilungsformular: keine WCAG-AA-Verstöße', async ({ page }) => {
  await login(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  expect(await violations(page), 'Team-Übersicht').toEqual([]);
  await page.getByText('→ Bearbeiten').first().click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  expect(await violations(page), 'Beurteilungsformular').toEqual([]);
});

test('HR-Dashboard: keine WCAG-AA-Verstöße', async ({ page }) => {
  await login(page, USERS.hr);
  await page.getByText('HR Dashboard', { exact: true }).first().click();
  expect(await violations(page), 'HR-Dashboard').toEqual([]);
});

test('Mitarbeiter-Link: keine WCAG-AA-Verstöße', async ({ page }) => {
  await openApp(page, `?accessCode=${ACCESS_CODE}`);
  await expect(page.getByText(/Clara/).first()).toBeVisible({ timeout: 15000 });
  expect(await violations(page), 'Gast-Willkommen').toEqual([]);
});
