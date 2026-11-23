// Premium-UX (Branch feature/premium-ux): Seitenwechsel, Überfällig-Anzeige und der einheitliche Dialog.
// Nur Emulator und Testdaten, wie alle anderen Tests.
import { test, expect, openApp, manualDialogs } from './fixtures.mjs';
import { seed, USERS, getDoc, setDoc, listDocs } from './seed.mjs';

const field = (doc, name) => { const v = doc && doc.fields && doc.fields[name]; return v ? Object.values(v)[0] : undefined; };
const memberRow = (page, name) => page.getByRole('row').filter({ hasText: name });

async function loginTeam(page, user) {
  await openApp(page);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Team-Übersicht', { exact: true }).click();
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
}

test.beforeEach(async () => { await seed(); });

test('Seitenwechsel: jede Ansicht beginnt oben, auch nach Scrollen auf der vorigen Seite', async ({ page, consoleErrors }) => {
  await loginTeam(page, USERS.managerA);
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  const top = () => page.evaluate(() => document.querySelector('main').scrollTop);
  await nav.getByText('Dashboard', { exact: true }).click();
  await expect(page.getByText('Meine offenen Punkte')).toBeVisible();
  await page.evaluate(() => { document.querySelector('main').scrollTop = 900; });
  expect(await top()).toBeGreaterThan(300);
  await nav.getByText('Team-Übersicht', { exact: true }).click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  expect(await top()).toBe(0);
  // Aus der gescrollten Liste eine Selbstreflexion öffnen: beginnt beim Namen, nicht mitten im Bogen
  await page.evaluate(() => { document.querySelector('main').scrollTop = 250; });
  await memberRow(page, 'Clara Beispiel').getByRole('button', { name: 'Ansehen' }).click();
  await expect(page.getByRole('heading', { name: 'Clara Beispiel' })).toBeVisible();
  expect(await top()).toBe(0);
  expect(consoleErrors).toEqual([]);
});

test('Gespräch mit Datum heute ist „heute“, nicht „überfällig“; ab gestern überfällig', async ({ page }) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
  const emil = await getDoc('teamMembers/tm-emil');
  const plain = Object.fromEntries(Object.entries(emil.fields).map(([k, v]) => [k, Object.values(v)[0]]));
  await setDoc('teamMembers/tm-emil', { ...plain, scheduledAt: today.toISOString(), scheduledSource: 'form' });
  await loginTeam(page, USERS.managerA);
  await expect(memberRow(page, 'Emil Probe')).toContainText('Gespräch heute');
  await expect(memberRow(page, 'Emil Probe')).not.toContainText('überfällig');
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Dashboard', { exact: true }).click();
  await expect(page.getByText('Meine offenen Punkte')).toBeVisible();
  await expect(page.getByText(/Gespräch mit Emil Probe überfällig/)).toHaveCount(0);
  // Gestern: überfällig, im Dashboard als offener Punkt
  await setDoc('teamMembers/tm-emil', { ...plain, scheduledAt: yesterday.toISOString(), scheduledSource: 'form' });
  await expect(page.getByText(/Gespräch mit Emil Probe überfällig/)).toBeVisible({ timeout: 10000 });
});

test('Einheitlicher Dialog: Formular verlassen fragt mit klaren Knöpfen, Esc bleibt im Formular, Fokus kehrt zurück', async ({ page, consoleErrors }) => {
  const before = JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields));
  await loginTeam(page, USERS.managerA);
  await memberRow(page, 'Emil Probe').getByRole('button', { name: 'Starten', exact: true }).click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  manualDialogs(page, true);
  const back = page.getByRole('button', { name: 'Zurück', exact: true }).first();
  await back.click();
  const dlg = page.locator('[data-nw-dialog]');
  await expect(dlg.getByRole('alertdialog')).toBeVisible();
  await expect(dlg).toContainText('Formular verlassen?');
  await expect(dlg.getByRole('button', { name: 'Verlassen ohne Speichern' })).toBeVisible();
  // Bei „verlieren“-Rückfragen liegt der Fokus auf dem sicheren Knopf
  await expect(dlg.getByRole('button', { name: 'Im Formular bleiben' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible(); // noch im Formular
  await expect(back).toBeFocused();
  // Bestätigen verlässt das Formular, gespeichert wird dabei nichts
  await back.click();
  await dlg.getByRole('button', { name: 'Verlassen ohne Speichern' }).click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  expect(JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields))).toBe(before);
  expect(consoleErrors).toEqual([]);
});

test('Einheitlicher Dialog: Abschluss-Prüfung listet offene Punkte, „Weiter bearbeiten“ speichert nichts', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  await memberRow(page, 'Emil Probe').getByRole('button', { name: 'Starten', exact: true }).click();
  await expect(page.getByRole('button', { name: /Abschließen/ }).first()).toBeVisible();
  manualDialogs(page, true);
  await page.getByRole('button', { name: /Abschließen/ }).first().click();
  const dlg = page.locator('[data-nw-dialog]');
  await expect(dlg).toContainText('Beurteilung abschließen?');
  await expect(dlg.getByRole('listitem')).toContainText(['2 von 2 Zielen ohne Zielerreichung', 'Keine Entwicklungsmaßnahme']);
  await expect(dlg.getByRole('button', { name: 'Trotzdem abschließen' })).toBeVisible();
  await dlg.getByRole('button', { name: 'Weiter bearbeiten' }).click();
  await expect(dlg).toHaveCount(0);
  await page.waitForTimeout(800);
  expect((await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil' && field(d, 'type') === 'review')).toHaveLength(0);
});

test('Einheitlicher Dialog: E-Mail ergänzen mit Eingabefeld, Enter speichert', async ({ page }) => {
  const emil = await getDoc('teamMembers/tm-emil');
  const plain = Object.fromEntries(Object.entries(emil.fields).map(([k, v]) => [k, Object.values(v)[0]]));
  await setDoc('teamMembers/tm-emil', { ...plain, email: '' });
  await loginTeam(page, USERS.managerA);
  manualDialogs(page, true);
  await memberRow(page, 'Emil Probe').getByRole('button', { name: 'E-Mail ergänzen' }).click();
  const dlg = page.locator('[data-nw-dialog]');
  await expect(dlg).toContainText('E-Mail-Adresse von Emil Probe');
  const input = dlg.getByRole('textbox', { name: 'E-Mail-Adresse' });
  await expect(input).toBeFocused();
  await input.fill('emil.probe@test.local');
  await input.press('Enter');
  await expect(dlg).toHaveCount(0);
  await expect.poll(async () => field(await getDoc('teamMembers/tm-emil'), 'email'), { timeout: 10000 }).toBe('emil.probe@test.local');
});
