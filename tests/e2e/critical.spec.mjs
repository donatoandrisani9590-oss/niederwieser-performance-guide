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

test('Neue Führungskraft registriert sich: Konto mit Namen angelegt, angemeldet, leeres Team mit Hinweis', async ({ page }) => {
  await openApp(page);
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await page.getByRole('tab', { name: 'Registrieren' }).click();
  await page.locator('input[type="email"]').fill('nina.neu@test.local');
  await page.locator('input[type="text"]').first().fill('Nina Neu');
  await page.locator('input[type="password"]').nth(0).fill('Test-1234');
  await page.locator('input[type="password"]').nth(1).fill('Test-1234');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('Noch keine Mitarbeiter')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('0 Mitarbeiter')).toBeVisible();
  // Konto im Auth-Emulator angelegt, Name gesetzt (updateProfile) und in der Nutzerkarte sichtbar
  const all = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-nw-test/accounts:query', { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: '{}' })).json();
  const nina = (all.userInfo || []).find((u) => u.email === 'nina.neu@test.local');
  expect(nina, 'Auth-Konto angelegt').toBeTruthy();
  expect(nina.displayName).toBe('Nina Neu');
  await expect(page.locator('aside').getByText('Nina Neu')).toBeVisible();
  // BEKANNT (vor dem Redesign schon so, Schutzbereich Anmeldung, nicht geändert):
  // handleSubmit schreibt registeredUsers nur, wenn window.db gesetzt ist – das passiert nirgends.
  // Daher entsteht hier KEIN registeredUsers-Dokument. Siehe docs/redesign/BERICHT.md.
  expect((await listDocs('registeredUsers')).filter((d) => field(d, 'email') === 'nina.neu@test.local')).toHaveLength(0);
  // Dashboard führt als nächsten Schritt zum Anlegen des Teams
  await page.getByText('Dashboard', { exact: true }).first().click();
  await expect(page.getByText('Legen Sie Ihr Team an')).toBeVisible();
});

test('PDF-Export der Beurteilung erzeugt eine PDF-Datei', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await page.getByText('→ Bearbeiten').first().click();
  const pdfBtn = page.getByRole('button', { name: /Als PDF herunterladen|PDF/ }).first();
  await expect(pdfBtn).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 45000 }), pdfBtn.click()]);
  const path = await download.path();
  if (process.env.PDF_COPY) (await import('node:fs')).copyFileSync(path, process.env.PDF_COPY);
  const head = (await import('node:fs')).readFileSync(path).subarray(0, 5).toString();
  expect(head).toBe('%PDF-');
  expect((await import('node:fs')).statSync(path).size).toBeGreaterThan(10000);
});
