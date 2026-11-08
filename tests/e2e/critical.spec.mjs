// Kritische Wege: Anmeldung, Daten laden, Datensatz anlegen/ändern/speichern, nach Neuladen wiederfinden.
// Läuft nur gegen den Firebase-Emulator mit synthetischen Testdaten (siehe fixtures.mjs / seed.mjs).
import { test, expect, openApp } from './fixtures.mjs';
import { seed, USERS, ACCESS_CODE, listDocs, getDoc } from './seed.mjs';

const field = (doc, name) => {
  const v = doc.fields?.[name];
  return v ? Object.values(v)[0] : undefined;
};

async function gotoTeamAndLogin(page, user) {
  await openApp(page);
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page.locator('form button[type="submit"]').click();
}

const memberCard = (page, name) => page.getByText(name, { exact: true }).first();

let ids;
test.beforeEach(async () => { ids = await seed(); });

test('Anmeldung mit falschem Passwort zeigt Fehler und meldet nicht an', async ({ page }) => {
  await gotoTeamAndLogin(page, { ...USERS.managerA, password: 'falsch-falsch' });
  await expect(page.getByText(/Ungültige E-Mail oder falsches Passwort|Authentifizierungsfehler/)).toBeVisible();
  await expect(page.getByText('Abmelden')).toHaveCount(0);
});

test('Führungskraft sieht nach Anmeldung genau ihre eigenen und geteilten Mitarbeiter', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  for (const n of ['Clara Beispiel', 'David Muster', 'Emil Probe', 'Frieda Geteilt']) await expect(memberCard(page, n)).toBeVisible();
  await expect(page.getByText('Geteilt von: fk.bernd@test.local')).toBeVisible();
  // Bestehende Beurteilungen werden ihren Mitarbeitern richtig zugeordnet
  await expect(page.getByText('GPS 3.9').first()).toBeVisible();
  await expect(page.getByText('✎ Entwurf gespeichert')).toBeVisible();
});

test('Andere Führungskraft sieht keine fremden Mitarbeiter', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerB);
  await expect(page.getByText('1 Mitarbeiter')).toBeVisible();
  await expect(memberCard(page, 'Frieda Geteilt')).toBeVisible();
  for (const n of ['Clara Beispiel', 'David Muster', 'Emil Probe']) await expect(page.getByText(n, { exact: true })).toHaveCount(0);
});

test('Abmelden und erneut anmelden: alle Daten wieder da', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await page.getByText('Abmelden').first().click();
  await expect(page.getByText('Abmelden')).toHaveCount(0);
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.getByText('Clara Beispiel', { exact: true })).toHaveCount(0); // abgemeldet: keine Daten sichtbar
  await page.reload();
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await expect(memberCard(page, 'Clara Beispiel')).toBeVisible();
});

test('Sitzung bleibt nach Neuladen erhalten', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await page.reload();
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
});

test('Mitarbeiter anlegen: wird gespeichert und nach Neuladen wiedergefunden', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await page.locator('#add-name').fill('Gerda Neu');
  await page.locator('#add-pos').fill('Assistenz');
  await page.locator('#add-email').fill('gerda.neu@test.local');
  await page.getByRole('button', { name: /Hinzufügen/ }).first().click();
  await expect(page.getByText('5 Mitarbeiter')).toBeVisible();

  // In der Datenbank: richtiger Besitzer, Felder unverändert benannt
  const gerda = async () => (await listDocs('teamMembers')).filter((d) => field(d, 'name') === 'Gerda Neu');
  await expect.poll(async () => (await gerda()).length, { timeout: 15000 }).toBe(1);
  const docs = await gerda();
  expect(field(docs[0], 'userId')).toBe(ids.uidA);
  expect(field(docs[0], 'ownerEmail')).toBe(USERS.managerA.email);
  expect(field(docs[0], 'position')).toBe('Assistenz');
  expect(field(docs[0], 'email')).toBe('gerda.neu@test.local');
  expect(field(docs[0], 'accessCode')).toBeTruthy();

  await page.reload();
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await expect(page.getByText('5 Mitarbeiter')).toBeVisible();
  await expect(memberCard(page, 'Gerda Neu')).toBeVisible();
});

test('Beurteilung anlegen, als Entwurf speichern, ändern, abschließen und nach Neuladen wiederfinden', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();

  // Emil hat noch keine Beurteilung
  const before = (await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil');
  expect(before).toHaveLength(0);

  await page.getByText('→ Review starten').first().click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /Entwurf speichern/ }).first().click();

  await expect.poll(async () => (await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil' && field(d, 'type') === 'review').length, { timeout: 15000 }).toBe(1);
  let doc = (await listDocs('teamAppraisals')).find((d) => field(d, 'employeeId') === 'tm-emil');
  expect(field(doc, 'userId')).toBe(ids.uidA);
  expect(field(doc, 'status')).toBe('draft');
  expect(field(doc, 'employeeName')).toBe('Emil Probe');

  // Neu laden → Entwurf ist da und wird fortgesetzt
  await page.reload();
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await expect(page.getByText('→ Fortsetzen')).toHaveCount(2); // David (Seed) + Emil (neu)
  await page.getByText('→ Fortsetzen').nth(1).click();
  await expect(page.getByRole('button', { name: /Abschließen/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /Abschließen/ }).first().click();
  const confirm = page.getByRole('button', { name: /Ja|Bestätigen|Abschließen/ }).last();
  if (await confirm.isVisible().catch(() => false)) await confirm.click().catch(() => {});

  await expect.poll(async () => {
    const d = (await listDocs('teamAppraisals')).filter((x) => field(x, 'employeeId') === 'tm-emil' && field(x, 'type') === 'review');
    return d.map((x) => field(x, 'status')).join(',');
  }, { timeout: 15000 }).toBe('completed');

  // Keine Duplikate, andere Beurteilungen unberührt
  const all = await listDocs('teamAppraisals');
  expect(all.filter((x) => field(x, 'employeeId') === 'tm-emil' && field(x, 'type') === 'review')).toHaveLength(1);
  const clara = await getDoc('teamAppraisals/ap-clara-review');
  expect(field(clara, 'status')).toBe('completed');
  expect(field(clara, 'employeeId')).toBe('tm-clara');
});

test('Mitarbeiter-Link (accessCode) öffnet die Selbstreflexion für den richtigen Mitarbeiter', async ({ page }) => {
  await openApp(page, `?accessCode=${ACCESS_CODE}`);
  await expect(page.getByText(/Clara/).first()).toBeVisible({ timeout: 15000 });
});

test('Ungültiger Mitarbeiter-Link zeigt Hinweis', async ({ page }) => {
  await openApp(page, '?accessCode=GIBT-ES-NICHT');
  await expect(page.getByText('Ungültiger oder abgelaufener Link')).toBeVisible({ timeout: 15000 });
});

test('HR-Admin sieht alle Mitarbeiter und den HR-Bereich', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.hr);
  await expect(page.getByText(/HR.?Dashboard/).first()).toBeVisible({ timeout: 15000 });
});
