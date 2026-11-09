// Kritische Wege: Anmeldung, Daten laden, Datensatz anlegen/ändern/speichern, nach Neuladen wiederfinden.
// Läuft nur gegen den Firebase-Emulator mit synthetischen Testdaten (siehe fixtures.mjs / seed.mjs).
import { test, expect, openApp } from './fixtures.mjs';
import { seed, USERS, ACCESS_CODE, YEAR, PREV_YEAR, NEXT_YEAR, listDocs, getDoc, setDoc } from './seed.mjs';

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
// Zeile der Status-Matrix (Standardansicht der Team-Übersicht) und Knopf darin
const memberRow = (page, name) => page.getByRole('row').filter({ hasText: name });
// Formularfeld mit genau diesem Wert vorhanden? (Eingaben sind gesteuert, value steht nicht als Attribut im DOM)
const hasFieldValue = (page, v) => expect.poll(() => page.evaluate((x) => [...document.querySelectorAll('input, textarea')].some((el) => el.value === x), v), { timeout: 10000 });
const rowButton = (page, name, label) => memberRow(page, name).getByRole('button', { name: label, exact: true });

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
  // Status-Matrix: Unterlagen des laufenden Jahres richtig zugeordnet
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('GPS 3.9');
  await expect(memberRow(page, 'David Muster')).toContainText('Entwurf');
  await expect(memberRow(page, 'Emil Probe')).toContainText('Vereinbart · 2 Ziele');
  await expect(memberRow(page, 'Frieda Geteilt')).toContainText('Geteilt');
  // Kartenansicht zeigt dieselben Daten
  await page.getByRole('radio', { name: 'Karten' }).click();
  await expect(page.getByText('Geteilt von: fk.bernd@test.local')).toBeVisible();
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
  await page.getByRole('button', { name: 'Mitarbeiter hinzufügen' }).click();
  await page.locator('#add-name').fill('Gerda Neu');
  await page.locator('#add-pos').fill('Assistenz');
  await page.locator('#add-email').fill('gerda.neu@test.local');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
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

  // Emil hat noch keine Beurteilung, aber eine Zielvereinbarung für das laufende Jahr
  const before = (await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil' && field(d, 'type') === 'review');
  expect(before).toHaveLength(0);
  await expect(memberRow(page, 'Emil Probe')).toContainText(`2 Ziele ${YEAR} werden übernommen`);

  await rowButton(page, 'Emil Probe', 'Starten').click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  // Vereinbarte Ziele sind automatisch eingesetzt, Erreichung noch offen
  await expect(page.getByText(`Ziele aus der Zielvereinbarung ${YEAR} übernommen`)).toBeVisible();
  await hasFieldValue(page, 'Wartungsquote 95 %').toBe(true);
  await page.getByRole('button', { name: /Entwurf speichern/ }).first().click();

  await expect.poll(async () => (await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil' && field(d, 'type') === 'review').length, { timeout: 15000 }).toBe(1);
  let doc = (await listDocs('teamAppraisals')).find((d) => field(d, 'employeeId') === 'tm-emil' && field(d, 'type') === 'review');
  expect(field(doc, 'userId')).toBe(ids.uidA);
  expect(field(doc, 'status')).toBe('draft');
  expect(field(doc, 'employeeName')).toBe('Emil Probe');
  expect(String(field(doc, 'period'))).toBe(YEAR);
  const savedGoals = (doc.fields.goals.arrayValue.values || []).map((v) => v.mapValue.fields.name.stringValue);
  expect(savedGoals).toEqual(['Wartungsquote 95 %', 'Dokumentation digitalisieren']);
  // Zielvereinbarung selbst unverändert
  const agreement = await getDoc('teamAppraisals/ap-emil-goals');
  expect(field(agreement, 'status')).toBe('completed');
  expect(agreement.fields.goals.arrayValue.values).toHaveLength(2);

  // Neu laden → Entwurf ist da und wird fortgesetzt
  await page.reload();
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await expect(memberRow(page, 'David Muster').getByRole('button', { name: 'Fortsetzen', exact: true })).toHaveCount(1); // Seed-Entwurf
  await rowButton(page, 'Emil Probe', 'Fortsetzen').click();
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

test('Neue Führungskraft registriert sich: Konto mit Namen und registeredUsers angelegt, leeres Team mit Hinweis', async ({ page }) => {
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
  // registeredUsers/<uid> wird angelegt (behoben 08.11.2026: window.db war nie gesetzt), Feldnamen unverändert
  await expect.poll(async () => (await listDocs('registeredUsers')).filter((d) => field(d, 'email') === 'nina.neu@test.local').length, { timeout: 15000 }).toBe(1);
  const reg = (await listDocs('registeredUsers')).find((d) => field(d, 'email') === 'nina.neu@test.local');
  expect(field(reg, 'fullName')).toBe('Nina Neu');
  expect(field(reg, 'uid')).toBe(nina.localId);
  expect(reg.name.split('/').pop()).toBe(nina.localId);
  // Dashboard führt als nächsten Schritt zum Anlegen des Teams
  await page.getByText('Dashboard', { exact: true }).first().click();
  await expect(page.getByText('Legen Sie Ihr Team an')).toBeVisible();
});

test('PDF-Export der Beurteilung erzeugt eine PDF-Datei', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await rowButton(page, 'Clara Beispiel', 'Öffnen').click();
  const pdfBtn = page.getByRole('button', { name: /Als PDF herunterladen|PDF/ }).first();
  await expect(pdfBtn).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 45000 }), pdfBtn.click()]);
  const path = await download.path();
  if (process.env.PDF_COPY) (await import('node:fs')).copyFileSync(path, process.env.PDF_COPY);
  const head = (await import('node:fs')).readFileSync(path).subarray(0, 5).toString();
  expect(head).toBe('%PDF-');
  expect((await import('node:fs')).statSync(path).size).toBeGreaterThan(10000);
});


test('Bestehendes Konto ohne registeredUsers-Eintrag: Anmeldung trägt ihn nach, Teamdaten unverändert', async ({ page }) => {
  // Konto wie aus der Zeit vor dem Fix: Auth-Konto mit Namen, aber ohne registeredUsers-Dokument
  const r = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alt.konto@test.local', password: 'Test-1234', displayName: 'Alt Konto', returnSecureToken: true }) })).json();
  const before = JSON.stringify((await listDocs('teamMembers')).map((d) => d.fields));
  expect((await listDocs('registeredUsers')).filter((d) => field(d, 'email') === 'alt.konto@test.local')).toHaveLength(0);
  await gotoTeamAndLogin(page, { email: 'alt.konto@test.local', password: 'Test-1234' });
  await expect(page.getByText('Noch keine Mitarbeiter')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => (await listDocs('registeredUsers')).filter((d) => field(d, 'email') === 'alt.konto@test.local').length, { timeout: 15000 }).toBe(1);
  const reg = (await listDocs('registeredUsers')).find((d) => field(d, 'email') === 'alt.konto@test.local');
  expect(field(reg, 'uid')).toBe(r.localId);
  expect(JSON.stringify((await listDocs('teamMembers')).map((d) => d.fields))).toBe(before);
});

test('Jahreswechsel in der Team-Übersicht: jedes Jahr zeigt nur seine Unterlagen, Daten bleiben unverändert', async ({ page }) => {
  const before = JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields));
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  const yearPicker = page.getByRole('radiogroup', { name: 'Jahr' });
  await expect(yearPicker.getByRole('radio', { name: YEAR })).toHaveAttribute('aria-checked', 'true');
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('GPS 3.9');
  await expect(page.getByRole('columnheader', { name: `Beurteilung & Gespräch ${YEAR}` })).toBeVisible();

  await yearPicker.getByRole('radio', { name: PREV_YEAR }).click();
  await expect(page.getByRole('columnheader', { name: `Beurteilung & Gespräch ${PREV_YEAR}` })).toBeVisible();
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('GPS 3.2');
  await expect(memberRow(page, 'Clara Beispiel')).not.toContainText('GPS 3.9');
  await expect(memberRow(page, 'David Muster')).not.toContainText('Entwurf');
  // Beurteilung des Vorjahres öffnen: richtiges Dokument
  await rowButton(page, 'Clara Beispiel', 'Öffnen').click();
  await hasFieldValue(page, 'Rahmenverträge neu verhandeln').toBe(true);
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();

  // Ansehen und Umschalten verändert keine Daten
  expect(JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields))).toBe(before);
});

test('Bestehender Beurteilungsentwurf: Ziele der Zielvereinbarung nur auf Knopfdruck, gespeichert erst mit Entwurf speichern', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await rowButton(page, 'David Muster', 'Fortsetzen').last().click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  // Entwurf bleibt wie gespeichert
  await hasFieldValue(page, 'Ausschuss reduzieren').toBe(true);
  const banner = page.getByTestId('goal-agreement-banner');
  await expect(banner).toContainText(`Zielvereinbarung ${YEAR} vorhanden`);
  // Rückfrage abgelehnt (Fixture lehnt Dialoge ab) → nichts ersetzt
  await banner.getByRole('button', { name: 'Ziele übernehmen' }).click();
  await hasFieldValue(page, 'Ausschuss reduzieren').toBe(true);
  // Rückfrage bestätigt → Ziele der Zielvereinbarung eingesetzt
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await banner.getByRole('button', { name: 'Ziele übernehmen' }).click();
  await hasFieldValue(page, 'OEE auf 85 %').toBe(true);
  await expect(banner).toContainText(`Ziele aus der Zielvereinbarung ${YEAR} übernommen`);
  // Noch nichts gespeichert
  const draft = await getDoc('teamAppraisals/ap-david-draft');
  expect(draft.fields.goals.arrayValue.values.map((v) => v.mapValue.fields.name.stringValue)).toEqual(['Ausschuss reduzieren']);
});

test('Kalibrierung: nur das gewählte Jahr, jeder Mitarbeiter einmal gezählt', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await page.getByText('Kalibrierung', { exact: true }).first().click();
  await expect(page.getByText(`3 Mitarbeiter | Review-Periode: ${YEAR}`)).toBeVisible();
  const heatmapRows = page.getByRole('row').filter({ hasText: 'Clara Beispiel' });
  await expect(heatmapRows).toHaveCount(1);
  await expect(heatmapRows).toContainText('3.9');
  // Jahr wechseln: Vorjahres-Beurteilung, gleiche Auswahl wie in der Team-Übersicht
  await page.getByRole('radiogroup', { name: 'Jahr' }).getByRole('radio', { name: PREV_YEAR }).click();
  await expect(page.getByText(`2 Mitarbeiter | Review-Periode: ${PREV_YEAR}`)).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Clara Beispiel' })).toContainText('3.2');
  await page.getByText('Team-Übersicht', { exact: true }).first().click();
  await expect(page.getByRole('columnheader', { name: `Beurteilung & Gespräch ${PREV_YEAR}` })).toBeVisible();
});

test('Ziel-Dashboard: Jahresfilter optional, Standard „Alle Jahre“ wie bisher', async ({ page }) => {
  await setDoc('teamAppraisals/ap-david-goals-prev', {
    id: 'ap-david-goals-prev', type: 'goals', status: 'completed', period: PREV_YEAR, employeeId: 'tm-david', employeeName: 'David Muster',
    userId: ids.uidA, managerId: ids.uidA, createdAt: new Date(`${PREV_YEAR}-02-01`).toISOString(), updatedAt: new Date(`${PREV_YEAR}-02-01`).toISOString(),
    goals: [{ id: 1, name: 'Altziel Vorjahr', weight: 100 }],
  });
  const before = JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields));
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await page.getByText('Ziel-Dashboard', { exact: true }).first().click();
  const picker = page.getByRole('radiogroup', { name: 'Jahr' });
  await expect(picker.getByRole('radio', { name: 'Alle Jahre' })).toHaveAttribute('aria-checked', 'true');
  const kpi = page.locator('.text-2xl.font-semibold.text-nw-blue').first();
  const all = Number(await kpi.textContent());
  await picker.getByRole('radio', { name: PREV_YEAR }).click();
  await expect.poll(async () => Number(await kpi.textContent())).toBeLessThan(all);
  await picker.getByRole('radio', { name: 'Alle Jahre' }).click();
  await expect.poll(async () => Number(await kpi.textContent())).toBe(all);
  expect(JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields))).toBe(before);
});

test('Altdaten: im Januar geführte Vorjahres-Beurteilung erscheint im Vorjahr und behält beim Öffnen ihr gespeichertes Jahr', async ({ page }) => {
  const before = JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields));
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  // Laufendes Jahr: Davids Vorjahres-Beurteilung (period = laufendes Jahr, angelegt im Januar) zählt hier nicht
  await expect(memberRow(page, 'David Muster')).toContainText('Entwurf');
  await expect(memberRow(page, 'David Muster')).not.toContainText('GPS 3.4');
  await page.getByRole('radiogroup', { name: 'Jahr' }).getByRole('radio', { name: PREV_YEAR }).click();
  await expect(memberRow(page, 'David Muster')).toContainText('GPS 3.4');
  // Öffnen übergibt das gespeicherte Jahr (kein Überschreiben beim späteren Speichern)
  await rowButton(page, 'David Muster', 'Öffnen').first().click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  const ctx = await page.evaluate(() => JSON.parse(localStorage.getItem('nw_current_employee')));
  expect(String(ctx.period)).toBe(YEAR);
  expect(ctx.appraisalId).toBe('ap-david-review-legacy');
  expect(JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields))).toBe(before);
});

test('Status-Matrix: Zielvereinbarung gilt dem Folgejahr, Beurteilung zeigt Gespräch', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: `Zielvereinbarung ${NEXT_YEAR}` })).toBeVisible();
  await expect(memberRow(page, 'Emil Probe')).toContainText('Vereinbart · 2 Ziele');
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('Gespräch geführt');
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('Eingegangen');
  await expect(memberRow(page, 'David Muster')).toContainText('Kein Gesprächstermin');
  await expect(memberRow(page, 'David Muster').getByRole('button', { name: 'Termin planen' })).toBeVisible();
});

test('Dashboard: Stand des Jahres und offene Punkte mit Direktaktion', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await page.getByText('Dashboard', { exact: true }).first().click();
  await expect(page.getByText(`Wo ich stehe · ${YEAR}`)).toBeVisible();
  await expect(page.getByRole('progressbar', { name: `Beurteilungen ${YEAR} abgeschlossen` })).toHaveAttribute('aria-valuenow', '2');
  const item = page.getByRole('listitem').filter({ hasText: 'Beurteilung David Muster fortsetzen' });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Fortsetzen' }).click();
  await hasFieldValue(page, 'Ausschuss reduzieren').toBe(true);
});

test('Kalibrierung ohne 9-Box-Grid', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await page.getByText('Kalibrierung', { exact: true }).first().click();
  await expect(page.getByText('Kompetenz-Heatmap')).toBeVisible();
  await expect(page.getByText(/9-Box Grid/)).toHaveCount(0);
});

test('Zurück und Home: auf jeder Seite, Schritt für Schritt zurück, Formular fragt vor dem Verlassen', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  const back = page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('button', { name: 'Zurück' });
  const home = page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('button', { name: 'Home' });
  await page.getByText('Kalibrierung', { exact: true }).first().click();
  await expect(page.getByText(/Review-Periode/)).toBeVisible();
  await page.getByText('Kompetenzen', { exact: true }).first().click();
  // Schritt für Schritt zurück: Kompetenzen → Kalibrierung → Team-Übersicht
  await back.click();
  await expect(page.getByText(/Review-Periode/)).toBeVisible();
  await back.click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  // Home führt zum Dashboard, dort gibt es keinen Home-Knopf
  await home.click();
  await expect(page.getByText(`Wo ich stehe · ${YEAR}`)).toBeVisible();
  await expect(home).toHaveCount(0);
  // Formular: Rückfrage abgelehnt → bleibt im Formular, nichts gespeichert
  await back.click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  const before = JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields));
  await rowButton(page, 'David Muster', 'Fortsetzen').first().click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  await back.click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  // Rückfrage bestätigt → zurück zur Team-Übersicht
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await back.click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  expect(JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields))).toBe(before);
});

test('Bögen: Abschnittsleiste bleibt sichtbar und springt, keine Halo-Warnung vor dem Bewerten', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await rowButton(page, 'Emil Probe', 'Starten').click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Abschnitte des Bogens' });
  await expect(nav.getByRole('button', { name: 'D' })).toBeVisible();
  await nav.getByRole('button', { name: 'D' }).click();
  await expect(page.getByRole('heading', { name: /^Teil D/ })).toBeInViewport();
  // Leiste nach dem Sprung weiterhin sichtbar, Speichern erreichbar
  await expect(nav).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeInViewport();
  // Vorbelegung „alle 3“ ist noch keine Bewertung
  await expect(page.getByText('Möglicher Halo-Effekt')).toHaveCount(0);
});

test('Mitarbeiter-Link: Abschnittsleiste unter der Kopfzeile, Spaltenköpfe der Maßnahmen sichtbar', async ({ page }) => {
  await openApp(page, '?accessCode=CODE-tm-emil');
  await page.getByRole('button', { name: /Selbstreflexion starten/ }).click();
  const nav = page.getByRole('navigation', { name: 'Abschnitte des Bogens' });
  await nav.getByRole('button', { name: 'D' }).click();
  await expect(page.getByRole('heading', { name: /^Teil D/ })).toBeInViewport();
  await expect(nav).toBeInViewport();
  await expect(page.getByRole('columnheader', { name: 'Maßnahme' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fertig & senden' })).toBeInViewport();
});
