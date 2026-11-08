// Alle Hauptseiten öffnen: rendern ohne Fehler, Screenshot, und das bloße Ansehen verändert keine Daten.
// Screenshots landen in $SHOT_DIR (Standard: ../docs/screenshots/current).
import { test, expect, openApp } from './fixtures.mjs';
import { seed, USERS, ACCESS_CODE, listDocs } from './seed.mjs';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOT_DIR = process.env.SHOT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'screenshots', 'current');
mkdirSync(SHOT_DIR, { recursive: true });

const snapshotAll = async () => {
  const out = {};
  for (const c of ['teamMembers', 'teamAppraisals', 'registeredUsers', 'salaryReviewData', 'salaryReviewAccess', 'salaryReviewHistory']) {
    for (const d of await listDocs(c)) out[d.name.split('/documents/')[1]] = JSON.stringify(d.fields);
  }
  return out;
};

async function shot(page, name) {
  await page.waitForTimeout(600); // Animationen ausklingen lassen
  // Die App scrollt in einem eigenen Container: Fenster kurz auf volle Inhaltshöhe ziehen (max. 8000 px)
  const vp = page.viewportSize();
  const h = await page.evaluate(() => Math.max(innerHeight, ...[...document.querySelectorAll('*')]
    .filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 300)
    .map((el) => el.scrollHeight + el.getBoundingClientRect().top)));
  await page.setViewportSize({ width: vp.width, height: Math.min(Math.ceil(h), 8000) });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: true });
  await page.setViewportSize(vp);
}

async function loginVia(page, user) {
  await openApp(page);
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('Abmelden').first()).toBeVisible({ timeout: 15000 });
}

// Navigationseinträge der Seitenleiste (Text) → Dateiname
const PUBLIC_NAV = [['Dashboard', '01-dashboard'], ['Anleitung', '02-anleitung'], ['Kompetenzen', '03-kompetenzen'], ['GPS Formel', '04-gps-formel'], ['Meine Selbstreflexion', '05-meine-selbstreflexion']];
const MANAGER_NAV = [['Team-Übersicht', '11-team-uebersicht'], ['Kalibrierung', '12-kalibrierung'], ['Ziel-Dashboard', '13-ziel-dashboard']];

async function clickNav(page, label) {
  await page.getByText(label, { exact: true }).first().click();
}

test('Öffentliche Seiten und Anmeldung rendern ohne Fehler', async ({ page, consoleErrors }) => {
  await seed();
  await openApp(page);
  for (const [label, file] of PUBLIC_NAV) { await clickNav(page, label); await shot(page, file); }
  await clickNav(page, 'Kompetenzen');
  await page.getByText(/Administration|Verwaltung/).first().click().catch(() => {});
  await shot(page, '03b-kompetenzen-bereich');
  await clickNav(page, 'Team-Übersicht');
  await shot(page, '10-anmeldung');
  expect(consoleErrors).toEqual([]);
});

test('Führungskraft: alle Hauptseiten rendern ohne Fehler und Ansehen ändert keine Daten', async ({ page, consoleErrors }) => {
  await seed();
  const before = await snapshotAll();
  await loginVia(page, USERS.managerA);
  for (const [label, file] of MANAGER_NAV) { await clickNav(page, label); await shot(page, file); }
  await clickNav(page, 'Team-Übersicht');
  await page.getByText('Liste', { exact: true }).first().click();
  await shot(page, '11b-team-liste');
  await page.getByText('Karten', { exact: true }).first().click();
  await page.getByText('→ Bearbeiten').first().click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  await shot(page, '14-beurteilung-formular');
  await clickNav(page, 'Team-Übersicht');
  await page.getByText('→ Erstellen').first().click();
  await shot(page, '15-zielvereinbarung');
  await clickNav(page, 'Team-Übersicht');
  await page.getByText('Digital ansehen').first().click();
  await shot(page, '16-selbstreflexion-ansehen');
  expect(consoleErrors).toEqual([]);
  expect(await snapshotAll()).toEqual(before);
});

test('HR-Admin: HR-Seiten rendern ohne Fehler', async ({ page, consoleErrors }) => {
  await seed();
  const before = await snapshotAll();
  await loginVia(page, USERS.hr);
  await clickNav(page, 'HR Dashboard');
  await shot(page, '21-hr-dashboard');
  const tabs = [['Normalverteilung', '21b-hr-normalverteilung'], ['Rater-Bias', '21c-hr-rater-bias'], ['Kompetenz-Radar', '21d-hr-kompetenz-radar'],
    ['Versionen', '21e-hr-versionen'], ['Backup & Restore', '21f-hr-backup']];
  for (const [label, file] of tabs) {
    await page.getByRole('button', { name: new RegExp(label.replace(/[&]/g, '.')) }).first().click();
    await shot(page, file);
  }
  await clickNav(page, 'Salary Review');
  await page.keyboard.press('Escape');
  await shot(page, '22-gehaltsrunde');
  await page.getByText('Ziel-Dashboard', { exact: true }).last().click();
  await shot(page, '23-hr-ziel-dashboard');
  expect(consoleErrors).toEqual([]);
  // HR-Ansichten dürfen beim bloßen Ansehen nur die bekannten Auto-Reparatur-Felder setzen
  const after = await snapshotAll();
  const changed = Object.keys(after).filter((k) => after[k] !== before[k]);
  expect(changed, 'Beim Ansehen veränderte Dokumente').toEqual([]);
});

test('Mitarbeiter-Link: Willkommen und Formular rendern ohne Fehler', async ({ page, consoleErrors }) => {
  await seed();
  await openApp(page, `?accessCode=${ACCESS_CODE}`);
  await expect(page.getByText(/Clara/).first()).toBeVisible({ timeout: 15000 });
  await shot(page, '31-gast-willkommen');
  const start = page.getByRole('button', { name: /Starten|Los geht|Beginnen|Start/ }).first();
  if (await start.isVisible().catch(() => false)) { await start.click(); await shot(page, '32-gast-formular'); }
  expect(consoleErrors).toEqual([]);
});
