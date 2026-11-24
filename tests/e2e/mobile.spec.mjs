// Schmale Bildschirme (Handy): Menü klappt auf/zu, kein horizontaler Überlauf, Anmeldung und Daten erreichbar.
import { test, expect, openApp } from './fixtures.mjs';
import { seed, USERS } from './seed.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const SHOT_DIR = process.env.SHOT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'screenshots', 'current');
mkdirSync(SHOT_DIR, { recursive: true });
test.use({ viewport: { width: 390, height: 844 } });

test('Handy: Menü, Anmeldung und Team ohne horizontalen Überlauf', async ({ page, consoleErrors }) => {
  await seed();
  await openApp(page);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const menu = page.getByRole('button', { name: 'Menü' });
  await expect(menu).toBeVisible();
  await expect(page.locator('#nw-sidebar-menu')).toBeHidden();
  expect(await overflow()).toBe(0);
  await page.screenshot({ path: join(SHOT_DIR, '41-handy-dashboard.png') });
  await menu.click();
  await expect(page.locator('#nw-sidebar-menu')).toBeVisible();
  await page.screenshot({ path: join(SHOT_DIR, '42-handy-menue.png') });
  await page.locator('#nw-sidebar-menu').getByText('Team-Übersicht', { exact: true }).click();
  await expect(page.locator('#nw-sidebar-menu')).toBeHidden();
  await page.locator('input[type="email"]').fill(USERS.managerA.email);
  await page.locator('input[type="password"]').first().fill(USERS.managerA.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await expect(page.getByText('Clara Beispiel', { exact: true }).first()).toBeVisible();
  expect(await overflow()).toBe(0);
  await page.screenshot({ path: join(SHOT_DIR, '43-handy-team.png') });
  expect(consoleErrors).toEqual([]);
});
