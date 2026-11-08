// Erststart ohne Anleitung: Eine neue Führungskraft folgt ausschließlich den sichtbaren Hauptaktionen
// („Ihr nächster Schritt“) – vom ersten Aufruf bis zur ersten abgeschlossenen Beurteilung. Der Guide wird nie geöffnet.
import { test, expect, openApp } from './fixtures.mjs';
import { seed, listDocs } from './seed.mjs';

const field = (d, n) => { const v = d.fields?.[n]; return v ? Object.values(v)[0] : undefined; };
const nextStep = (page) => page.locator('section', { hasText: 'Ihr nächster Schritt' }).getByRole('button').first();

test('Erststart: vom ersten Aufruf bis zur ersten abgeschlossenen Beurteilung nur über die Hauptaktionen', async ({ page, consoleErrors }) => {
  await seed();
  await openApp(page);

  // 1) Unangemeldet: genau ein klarer nächster Schritt
  await expect(page.getByText('Als Führungskraft anmelden')).toBeVisible();
  await nextStep(page).click();

  // 2) Registrieren (Formular erklärt sich über Felder und Umschalter)
  await page.getByRole('tab', { name: 'Registrieren' }).click();
  await page.locator('input[type="email"]').fill('erst.start@test.local');
  await page.locator('input[type="text"]').first().fill('Erika Erststart');
  await page.locator('input[type="password"]').nth(0).fill('Test-1234');
  await page.locator('input[type="password"]').nth(1).fill('Test-1234');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('Noch keine Mitarbeiter')).toBeVisible({ timeout: 15000 });

  // 3) Dashboard schlägt das Anlegen des Teams vor
  await page.getByText('Dashboard', { exact: true }).first().click();
  await expect(page.getByText('Legen Sie Ihr Team an')).toBeVisible();
  await nextStep(page).click();

  // 4) Ersten Mitarbeiter anlegen
  await page.locator('#add-name').fill('Mia Muster');
  await page.locator('#add-pos').fill('Einkauf');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await expect(page.getByText('1 Mitarbeiter')).toBeVisible();

  // 5) Die Status-Matrix zeigt die nächste Aktion; Beurteilung starten und abschließen
  await page.getByRole('row').filter({ hasText: 'Mia Muster' }).getByRole('button', { name: 'Starten', exact: true }).click();
  await page.getByRole('button', { name: /Abschließen/ }).first().click();
  const confirm = page.getByRole('button', { name: /Ja|Bestätigen|Abschließen/ }).last();
  if (await confirm.isVisible().catch(() => false)) await confirm.click().catch(() => {});
  await expect.poll(async () => (await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeName') === 'Mia Muster' && field(d, 'status') === 'completed').length, { timeout: 15000 }).toBe(1);

  // 6) Dashboard bestätigt den Fortschritt und führt weiter
  await page.getByText('Dashboard', { exact: true }).first().click();
  await expect(page.getByText('Alle Beurteilungen abgeschlossen')).toBeVisible();
  // Der Schnellstart-Guide war dafür nie nötig
  expect(consoleErrors).toEqual([]);
});

test('Erststart Mitarbeiter: Link öffnen, starten, absenden – Selbstreflexion landet beim richtigen Mitarbeiter', async ({ page, consoleErrors }) => {
  const ids = await seed();
  await openApp(page, '?accessCode=CODE-tm-emil');
  await expect(page.getByText(/Willkommen, Emil Probe/)).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Selbstreflexion starten/ }).click();
  await page.getByRole('button', { name: /Abschließen & Senden/ }).first().click();
  const confirm = page.getByRole('button', { name: /Ja|Bestätigen|Senden/ }).last();
  if (await confirm.isVisible().catch(() => false)) await confirm.click().catch(() => {});
  // Emil hat im Seed bereits eine Zielvereinbarung; gesucht ist die neue Selbstreflexion
  const isSelf = (d) => field(d, 'employeeId') === 'tm-emil' && /^self/.test(String(field(d, 'type')));
  await expect.poll(async () => (await listDocs('teamAppraisals')).filter(isSelf).length, { timeout: 20000 }).toBeGreaterThan(0);
  const doc = (await listDocs('teamAppraisals')).find(isSelf);
  expect(String(field(doc, 'type'))).toMatch(/^self/);
  expect(field(doc, 'userId')).toBe(ids.uidA); // zugeordnet zur richtigen Führungskraft
  expect(consoleErrors).toEqual([]);
});
