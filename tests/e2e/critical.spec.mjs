// Kritische Wege: Anmeldung, Daten laden, Datensatz anlegen/ändern/speichern, nach Neuladen wiederfinden.
// Läuft nur gegen den Firebase-Emulator mit synthetischen Testdaten (siehe fixtures.mjs / seed.mjs).
import { test, expect, openApp, manualDialogs } from './fixtures.mjs';
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
  await expect(page.getByText('Entwurf gespeichert').first()).toBeVisible(); // angepasst: ohne das Zeichen ✎ davor (Designsystem: keine Symbolzeichen)
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
  await page.getByTestId('user-card').click(); // angepasst (Shell 2.0): „Abmelden“ steht im Konto-Popover der Nutzerkarte
  await page.getByRole('button', { name: 'Abmelden' }).click();
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
  // Abschluss-Prüfung nennt offene Punkte (Zielerreichung fehlt) und fragt nach: bestätigen
  let completionMsg = '';
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => { completionMsg = d.message(); d.accept().catch(() => {}); });
  await page.getByRole('button', { name: /Abschließen/ }).first().click();
  await expect.poll(() => completionMsg).toContain('2 von 2 Zielen ohne Zielerreichung');
  // Angepasst: Hier stand ein Rest aus der Zeit vor dem Dialog („falls noch ein Bestätigen-Knopf sichtbar ist, klicken“).
  // Die Rückfrage beantwortet der dialog-Listener oben. Der Rest traf nach U4 den gleichnamigen Knopf in der Leiste.

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
  await expect(page.getByText('Lege dein Team an')).toBeVisible();
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

test('Zurück und Start: auf jeder Seite, Schritt für Schritt zurück, Formular fragt vor dem Verlassen', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  const back = page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('button', { name: 'Zurück' });
  // angepasst (Shell 2.0): Zurück und Start sind die Pillen in der Seitenleiste; „Home“ heißt „Start“
  const home = page.getByRole('navigation', { name: 'Seitennavigation' }).getByRole('button', { name: 'Start' });
  await page.getByText('Kalibrierung', { exact: true }).first().click();
  await expect(page.getByText(/Review-Periode/)).toBeVisible();
  await page.getByText('Kompetenzen', { exact: true }).first().click();
  // Schritt für Schritt zurück: Kompetenzen → Kalibrierung → Team-Übersicht
  await back.click();
  await expect(page.getByText(/Review-Periode/)).toBeVisible();
  await back.click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  // Start führt zum Dashboard, dort ist die Start-Pille gesperrt (sichtbar, aber ohne Wirkung)
  await home.click();
  await expect(page.getByText(`Wo ich stehe · ${YEAR}`)).toBeVisible();
  await expect(home).toBeDisabled();
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
  await expect(page.getByTestId('form-bar').getByRole('button', { name: 'Entwurf speichern' })).toBeInViewport(); // angepasst: hieß in der Leiste „Speichern“ (U4)
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
  await expect(page.getByTestId('form-bar').getByRole('button', { name: 'Abschicken', exact: true })).toBeInViewport(); // angepasst: hieß „Fertig & senden“ (U4)
});

test('Nicht abgeschickte Selbstreflexion: als Entwurf sichtbar und ansehbar, im Dashboard als offener Punkt', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  const row = memberRow(page, 'David Muster');
  await expect(row).toContainText('Entwurf, nicht abgeschickt');
  await expect(row).not.toContainText('Eingegangen');
  await rowButton(page, 'David Muster', 'Ansehen').click();
  await expect(page.getByText('Planung').first()).toBeVisible();
  await page.getByText('Dashboard', { exact: true }).first().click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Selbstreflexion David Muster liegt nur als Entwurf vor' })).toBeVisible();
});

test('Mitarbeiter-Link: am Ende des Bogens ein klarer Abschicken-Schritt', async ({ page }) => {
  await openApp(page, '?accessCode=CODE-tm-emil');
  await page.getByRole('button', { name: /Selbstreflexion starten/ }).click();
  const submit = page.getByRole('button', { name: 'Selbstreflexion abschicken' }).last(); // der Knopf im Abschluss-Kasten (im Kopf heißt er jetzt gleich, U4)
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeVisible();
  await expect(page.getByText('Bisher ist deine Selbstreflexion nur als Entwurf gespeichert.')).toBeVisible();
});

test('Phase 1 (Schalter an): Führungskraft teilt Beurteilung mit Mitarbeiter und nimmt es zurück, mit Lese-Fassung und Protokoll', async ({ page }) => {
  await page.addInitScript(() => { window.__NW_FEATURES__ = { shareWithEmployee: true }; });
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await memberRow(page, 'Clara Beispiel').getByRole('button', { name: 'Mit Mitarbeiter teilen' }).first().click();
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('Mit Mitarbeiter geteilt');
  await expect.poll(async () => field(await getDoc('teamAppraisals/ap-clara-review'), 'sharedWithEmployee'), { timeout: 10000 }).toBe(true);
  await expect.poll(async () => (await listDocs('auditLog')).length, { timeout: 10000 }).toBeGreaterThan(0);
  let doc = await getDoc('teamAppraisals/ap-clara-review');
  expect(field(doc, 'sharedEmployeeEmail')).toBe('tm-clara@test.local');
  expect(doc.fields.sharedSnapshot.mapValue.fields.gpsScore).toBeTruthy();
  // Bestehende Felder unverändert
  expect(field(doc, 'status')).toBe('completed');
  expect(field(doc, 'employeeId')).toBe('tm-clara');
  const log = (await listDocs('auditLog')).map((d) => field(d, 'action'));
  expect(log).toContain('share_with_employee');
  // Zurücknehmen
  await memberRow(page, 'Clara Beispiel').getByRole('button', { name: 'Teilen zurücknehmen' }).click();
  await expect(memberRow(page, 'Clara Beispiel').getByRole('button', { name: 'Mit Mitarbeiter teilen' }).first()).toBeVisible();
  await expect.poll(async () => field(await getDoc('teamAppraisals/ap-clara-review'), 'sharedWithEmployee'), { timeout: 10000 }).toBe(false);
});

test('Phase 1 (Schalter aus, Standard): kein Teilen-Knopf', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mit Mitarbeiter teilen' })).toHaveCount(0);
});

test('Mitarbeiter löschen: nur mit eingetipptem Namen, vorher automatische Sicherungsdatei', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  const remove = async (typed) => {
    page.removeAllListeners('dialog');
    page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(typed) : d.accept()).catch(() => {}));
    await memberRow(page, 'Emil Probe').getByRole('button', { name: /Weitere Aktionen/ }).click();
    await page.getByRole('menuitem', { name: 'Entfernen' }).click();
  };
  // Falscher Name: Der Knopf bleibt gesperrt, nichts gelöscht.
  // (Angepasst: Früher kam nach dem Browser-Fenster die Meldung „Name stimmt nicht überein“. Der neue Dialog
  // lässt „In den Papierkorb“ erst zu, wenn der Name stimmt.)
  manualDialogs(page, true);
  await memberRow(page, 'Emil Probe').getByRole('button', { name: /Weitere Aktionen/ }).click();
  await page.getByRole('menuitem', { name: 'Entfernen' }).click();
  const dlg = page.locator('[data-nw-dialog]');
  await expect(dlg).toContainText('Emil Probe entfernen?');
  await expect(dlg).toContainText('Papierkorb');
  await dlg.locator('input').fill('Emil');
  await expect(dlg.locator('[data-nw-ok]')).toBeDisabled();
  await dlg.locator('input').press('Enter'); // Enter bestätigt nicht, solange der Name nicht stimmt
  await expect(dlg).toBeVisible();
  await dlg.locator('[data-nw-cancel]').click();
  await expect(dlg).toHaveCount(0);
  manualDialogs(page, false);
  expect((await listDocs('teamMembers')).some((d) => d.name.endsWith('/tm-emil'))).toBe(true);
  // Richtiger Name: Sicherungsdatei, dann gelöscht
  const [download] = await Promise.all([page.waitForEvent('download'), remove('Emil Probe')]);
  expect(download.suggestedFilename()).toMatch(/^Sicherung_Emil_Probe_/);
  await expect.poll(async () => (await listDocs('teamMembers')).some((d) => d.name.endsWith('/tm-emil')), { timeout: 10000 }).toBe(false);
  // Vorher vollständig im Papierkorb abgelegt
  const trash = (await listDocs('trash')).filter((d) => field(d, 'memberId') === 'tm-emil');
  expect(trash).toHaveLength(1);
  expect(field(trash[0], 'status')).toBe('complete');
  const items = await listDocs(trash[0].name.split('/documents/')[1] + '/items');
  expect(items.map((d) => d.name.split('/').pop()).sort()).toEqual(['ap-emil-goals', 'ap-emil-goals-next']);
});

test('Papierkorb: HR stellt einen entfernten Mitarbeiter mit allen Unterlagen unverändert wieder her', async ({ page }) => {
  const memberBefore = JSON.stringify((await getDoc('teamMembers/tm-emil')).fields);
  const docsBefore = JSON.stringify((await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil').map((d) => [d.name, d.fields]).sort());
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('Emil Probe') : d.accept()).catch(() => {}));
  await memberRow(page, 'Emil Probe').getByRole('button', { name: /Weitere Aktionen/ }).click();
  await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Entfernen' }).click()]);
  await expect(page.getByText('Emil Probe ist im Papierkorb')).toBeVisible();
  await expect.poll(async () => (await getDoc('teamMembers/tm-emil')) === null, { timeout: 10000 }).toBe(true);
  // HR: Papierkorb → Wiederherstellen
  await page.getByTestId('user-card').click(); // angepasst (Shell 2.0): „Abmelden“ steht im Konto-Popover der Nutzerkarte
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByText('Abmelden')).toHaveCount(0);
  await page.reload();
  await gotoTeamAndLogin(page, USERS.hr);
  await page.getByText('HR Dashboard', { exact: true }).first().click();
  await page.getByRole('tab', { name: 'Papierkorb' }).click();
  const row = page.getByTestId('hr-trash-table').getByRole('row').filter({ hasText: 'Emil Probe' });
  await expect(row).toContainText('Im Papierkorb');
  await row.getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(row).toContainText('Wiederhergestellt');
  expect(JSON.stringify((await getDoc('teamMembers/tm-emil')).fields)).toBe(memberBefore);
  expect(JSON.stringify((await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil').map((d) => [d.name, d.fields]).sort())).toBe(docsBefore);
  const log = (await listDocs('auditLog')).map((d) => field(d, 'action'));
  expect(log).toEqual(expect.arrayContaining(['member_trashed', 'member_restored']));
});

test('HR-Dashboard: Jahresfilter, Standard „Alle Jahre“ wie bisher, Daten unverändert', async ({ page }) => {
  const before = JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields));
  await gotoTeamAndLogin(page, USERS.hr);
  await page.getByText('HR Dashboard', { exact: true }).first().click();
  const label = page.getByTestId('hr-year-label');
  await expect(label).toHaveText('Alle Jahre');
  const entries = page.getByText(/^\d+ Einträge$/);
  const count = async () => Number((await entries.textContent()).split(' ')[0]);
  await expect.poll(count).toBeGreaterThan(0);
  const all = await count();
  const select = page.locator('#hr-year-filter');
  await expect(select.locator('option')).toContainText([/^Alle Jahre/, new RegExp('^' + YEAR), new RegExp('^' + PREV_YEAR)]);
  await select.selectOption(PREV_YEAR);
  await expect(label).toHaveText(`Beurteilungsjahr ${PREV_YEAR} (Ziele ${YEAR})`);
  await expect.poll(count).toBeLessThan(all);
  const prev = await count();
  await select.selectOption(YEAR);
  await expect.poll(count).toBe(all - prev);
  await page.getByRole('button', { name: 'Zurücksetzen' }).click();
  await expect(label).toHaveText('Alle Jahre');
  await expect.poll(count).toBe(all);
  expect(JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields))).toBe(before);
});

test('Phase 3 (Schalter an): HR-Benutzerverwaltung – Name ändern, Passwort-Reset, Export, Sperren mit Protokoll', async ({ page }) => {
  await page.addInitScript(() => { window.__NW_FEATURES__ = { userAdmin: true }; });
  const membersBefore = JSON.stringify((await listDocs('teamMembers')).map((d) => d.fields));
  await gotoTeamAndLogin(page, USERS.hr);
  await page.getByText('HR Dashboard', { exact: true }).first().click();
  await page.getByRole('tab', { name: 'Benutzer' }).click();
  const row = (name) => page.getByTestId('hr-users-table').getByRole('row').filter({ hasText: name });
  await expect(row(USERS.managerA.name)).toContainText('Führungskraft');
  await expect(row(USERS.hr.name)).toContainText('HR-Admin');
  await expect(row(USERS.managerB.name)).toContainText('Aktiv');
  const menu = async (name, item) => {
    await row(name).getByRole('button', { name: /^Aktionen für/ }).click();
    await page.getByRole('menuitem', { name: item }).click();
  };
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('Bernd Neumann') : d.accept()).catch(() => {}));
  const uidB = (await listDocs('registeredUsers')).find((d) => field(d, 'email') === USERS.managerB.email).name.split('/').pop();
  // Name ändern
  await menu(USERS.managerB.name, 'Name ändern');
  await expect.poll(async () => field(await getDoc(`registeredUsers/${uidB}`), 'fullName'), { timeout: 10000 }).toBe('Bernd Neumann');
  await expect(row('Bernd Neumann')).toBeVisible();
  // Passwort-Reset: Firebase verschickt die Mail (im Emulator als oobCode sichtbar)
  await menu('Bernd Neumann', 'Passwort-Reset senden');
  await expect(page.getByText(`Reset-Mail an ${USERS.managerB.email} gesendet`)).toBeVisible();
  // Auth-Emulator-Projekt der Tests (siehe resetEmulators)
  const oob = await (await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-nw-test/oobCodes')).json();
  expect(oob.oobCodes.some((c) => c.email === USERS.managerB.email && c.requestType === 'PASSWORD_RESET')).toBe(true);
  // Export je Person
  const [download] = await Promise.all([page.waitForEvent('download'), menu(USERS.managerA.name, 'Daten exportieren')]);
  expect(download.suggestedFilename()).toMatch(/^Export_Anna_Testleiterin_/);
  // Sperren, HR-Konto nicht sperrbar
  await menu('Bernd Neumann', 'Konto sperren');
  await expect(row('Bernd Neumann')).toContainText('Gesperrt');
  expect(field(await getDoc(`registeredUsers/${uidB}`), 'disabled')).toBe(true);
  await menu(USERS.hr.name, 'Konto sperren');
  await expect(page.getByText('HR-Admin-Konten und dein eigenes Konto kannst du nicht sperren.')).toBeVisible();
  // Protokoll, Mitarbeiterdaten unverändert
  const log = (await listDocs('auditLog')).map((d) => field(d, 'action'));
  expect(log).toEqual(expect.arrayContaining(['user_renamed', 'password_reset_sent', 'user_exported', 'user_disabled']));
  expect(JSON.stringify((await listDocs('teamMembers')).map((d) => d.fields))).toBe(membersBefore);
});

test('Phase 3 (Schalter an): gesperrtes Konto wird abgemeldet und sieht den Hinweis', async ({ page }) => {
  await page.addInitScript(() => { window.__NW_FEATURES__ = { userAdmin: true }; });
  const docB = (await listDocs('registeredUsers')).find((d) => field(d, 'email') === USERS.managerB.email);
  const uidB = docB.name.split('/').pop();
  await setDoc(`registeredUsers/${uidB}`, { email: USERS.managerB.email, uid: uidB, fullName: USERS.managerB.name, createdAt: '2025-01-10T00:00:00.000Z', disabled: true });
  await gotoTeamAndLogin(page, USERS.managerB);
  await expect(page.getByText('Dein Konto ist gesperrt. Bitte wende dich an HR.')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
});

test('Phase 3 (Schalter aus, Standard): Sperrfeld ohne Wirkung', async ({ page }) => {
  const docB = (await listDocs('registeredUsers')).find((d) => field(d, 'email') === USERS.managerB.email);
  const uidB = docB.name.split('/').pop();
  await setDoc(`registeredUsers/${uidB}`, { email: USERS.managerB.email, uid: uidB, fullName: USERS.managerB.name, createdAt: '2025-01-10T00:00:00.000Z', disabled: true });
  await gotoTeamAndLogin(page, USERS.managerB);
  await expect(page.getByTestId('user-card')).toBeVisible({ timeout: 15000 }); // angepasst (Shell 2.0): „Abmelden“ steht im Konto-Popover der Nutzerkarte
  await page.waitForTimeout(1500);
  await expect(page.getByText('Dein Konto ist gesperrt.')).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('Phase 3 (Schalter aus, Standard): kein Benutzer-Reiter im HR-Dashboard', async ({ page }) => {
  await gotoTeamAndLogin(page, USERS.hr);
  await page.getByText('HR Dashboard', { exact: true }).first().click();
  await expect(page.getByRole('tab', { name: 'Backup & Restore' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Benutzer' })).toHaveCount(0);
});

test('Offline-Hinweis: erscheint bei Verbindungsverlust und verschwindet danach wieder', async ({ page, context }) => {
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
  await context.setOffline(true);
  await expect(page.getByTestId('offline-banner')).toContainText('Keine Internetverbindung');
  await context.setOffline(false);
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
  await expect(page.getByText('Verbindung wieder da')).toBeVisible();
});

test('Team-Übersicht: Mitarbeiter ohne E-Mail-Adresse gekennzeichnet, Adresse direkt ergänzen', async ({ page }) => {
  await setDoc('teamMembers/tm-fritz', { name: 'Fritz Ohnemail', position: 'Lager', department: '', email: '', userId: ids.uidA, ownerEmail: USERS.managerA.email, accessCode: 'CODE-tm-fritz', createdAt: '2025-02-01T00:00:00.000Z' });
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('5 Mitarbeiter')).toBeVisible();
  await expect(memberRow(page, 'Fritz Ohnemail')).toContainText('Keine E-Mail');
  await expect(memberRow(page, 'Clara Beispiel')).not.toContainText('Keine E-Mail');
  // Ungültige Adresse: nichts gespeichert; gültige: gespeichert, Kennzeichnung verschwindet
  const add = async (typed) => {
    page.removeAllListeners('dialog');
    page.on('dialog', (d) => d.accept(typed).catch(() => {}));
    await memberRow(page, 'Fritz Ohnemail').getByRole('button', { name: 'E-Mail ergänzen' }).click();
  };
  await add('fritz-ohne-at');
  await expect(page.getByText('Das ist keine gültige E-Mail-Adresse')).toBeVisible();
  expect(field(await getDoc('teamMembers/tm-fritz'), 'email')).toBe('');
  await add(' Fritz@Test.Local ');
  await expect.poll(async () => field(await getDoc('teamMembers/tm-fritz'), 'email'), { timeout: 10000 }).toBe('fritz@test.local');
  await expect(memberRow(page, 'Fritz Ohnemail')).not.toContainText('Keine E-Mail');
  expect(field(await getDoc('teamMembers/tm-fritz'), 'name')).toBe('Fritz Ohnemail');
});

test('Mitarbeiter-Link: vor dem Abschicken Übersicht der leeren Felder, Abbrechen schickt nichts ab', async ({ page }) => {
  const completedSelf = async () => (await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil' && /self/.test(field(d, 'type') || '') && field(d, 'status') === 'completed').length;
  const before = await completedSelf();
  await openApp(page, '?accessCode=CODE-tm-emil');
  await page.getByRole('button', { name: /Selbstreflexion starten/ }).click();
  const submit = page.getByRole('button', { name: 'Selbstreflexion abschicken' }).last(); // der Knopf im Abschluss-Kasten (im Kopf heißt er jetzt gleich, U4)
  await submit.scrollIntoViewIfNeeded();
  let message = '';
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => { if (d.message().startsWith('Selbstreflexion abschicken?')) message = d.message(); d.dismiss().catch(() => {}); });
  await submit.click();
  await expect.poll(() => message).toContain('Noch leer (alles freiwillig)');
  expect(message).toContain('Kompetenzen ohne Kommentar');
  expect(message).toContain('Feedback an die Führungskraft');
  await page.waitForTimeout(1000);
  expect(await completedSelf()).toBe(before);
  // OK: wird abgeschickt
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await submit.click();
  await expect.poll(completedSelf, { timeout: 15000 }).toBe(before + 1);
});

test('Backup wiederherstellen: Vorschau zeigt neu, ersetzt und „Bestand neuer“, ohne etwas zu schreiben', async ({ page }) => {
  const before = JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields));
  const backup = { exportedAt: '2025-01-01T00:00:00.000Z', data: { teamMembers: [], salaryReviewData: [], salaryReviewAccess: [], teamAppraisals: [
    { id: 'ap-clara-review', type: 'review', employeeName: 'Clara Beispiel', updatedAt: '2000-01-01T00:00:00.000Z' },
    { id: 'ap-emil-goals', type: 'goals', employeeName: 'Emil Probe', updatedAt: '2999-01-01T00:00:00.000Z' },
    { id: 'ap-gibt-es-nicht', type: 'review', employeeName: 'Nur im Backup', updatedAt: '2025-01-01T00:00:00.000Z' },
  ] } };
  await gotoTeamAndLogin(page, USERS.hr);
  await page.getByText('HR Dashboard', { exact: true }).first().click();
  await page.getByRole('tab', { name: 'Backup & Restore' }).click();
  await page.locator('input[type="file"][accept=".json"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  const cmp = page.getByTestId('restore-compare');
  await expect(cmp).toContainText('1 neu');
  await expect(cmp).toContainText('1 werden durch den Stand im Backup ersetzt');
  await expect(cmp).toContainText('1 sind aktuell NEUER als im Backup');
  const item = (name) => page.locator('div.px-4.py-2.border-b').filter({ hasText: name });
  await expect(item('Clara Beispiel')).toContainText('Bestand neuer');
  await expect(item('Nur im Backup')).toContainText('Neu');
  await expect(item('Emil Probe')).toContainText('Ersetzt');
  expect(JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields))).toBe(before);
});

test('Abschluss-Prüfung: Zielgewichte ungleich 100 % sperren das Abschließen, der Entwurf bleibt', async ({ page }) => {
  await setDoc('teamAppraisals/ap-david-draft', {
    id: 'ap-david-draft', type: 'review', status: 'draft', period: YEAR, employeeId: 'tm-david', employeeName: 'David Muster',
    employeePosition: 'Teamleiter Produktion', position: 'Teamleiter Produktion', userId: ids.uidA, managerId: ids.uidA, managerName: 'Testleitung',
    createdAt: `${YEAR}-11-01T00:00:00.000Z`, updatedAt: `${YEAR}-11-15T00:00:00.000Z`, isManager: true, includeLeadership: true, noGoalsMode: false,
    goals: [{ id: 1, name: 'Ausschuss reduzieren', weight: 50, achievement: 100 }, { id: 2, name: 'Rüstzeit senken', weight: 30, achievement: 90 }],
    coreScores: {}, leaderScores: {}, wasScore: 0, wieCoreScore: 0, gpsScore: 0,
    formData: { employee: 'David Muster', position: 'Teamleiter Produktion', manager: 'Anna Testleiterin', date: `${YEAR}-11-25` }, versionHistory: [],
  });
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await rowButton(page, 'David Muster', 'Fortsetzen').click();
  await expect(page.getByRole('button', { name: /Abschließen/ }).first()).toBeVisible();
  const messages = [];
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => { messages.push(d.message()); d.accept().catch(() => {}); });
  await page.getByRole('button', { name: /Abschließen/ }).first().click();
  await expect.poll(() => messages.join('|')).toContain('80 % statt 100 %');
  await page.waitForTimeout(1500);
  expect(field(await getDoc('teamAppraisals/ap-david-draft'), 'status')).toBe('draft');
  expect(messages.some((m) => m.includes('abschließen?'))).toBe(false); // keine Rückfrage, sondern gesperrt
});

test('Abschluss-Prüfung Zielvereinbarung: leere Vereinbarung fragt nach, Abbrechen speichert nichts', async ({ page }) => {
  const count = async () => (await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-david' && field(d, 'type') === 'goals').length;
  const before = await count();
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  await rowButton(page, 'David Muster', 'Erstellen').click();
  await expect(page.getByRole('button', { name: /Abschließen/ }).first()).toBeVisible();
  let msg = '';
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => { if (!msg) msg = d.message(); d.dismiss().catch(() => {}); });
  await page.getByRole('button', { name: /Abschließen/ }).first().click();
  await expect.poll(() => msg).toContain('Keine Ziele eingetragen');
  await page.waitForTimeout(1000);
  expect(await count()).toBe(before);
});

test('Gespräche je Jahr: Haken gilt nur für sein Jahr, der Vorjahres-Haken bleibt erhalten', async ({ page }) => {
  // Altdaten: Gespräch im Vorjahr geführt (nur die alten Felder)
  await setDoc('teamMembers/tm-clara', { name: 'Clara Beispiel', position: 'Sachbearbeiterin Einkauf', department: '', email: 'tm-clara@test.local',
    userId: ids.uidA, ownerEmail: USERS.managerA.email, accessCode: ACCESS_CODE, createdAt: '2025-02-01T00:00:00.000Z',
    meetingDone: true, meetingDoneAt: `${PREV_YEAR}-11-20T00:00:00.000Z`, scheduledAt: null });
  await gotoTeamAndLogin(page, USERS.managerA);
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  const yearPicker = page.getByRole('radiogroup', { name: 'Jahr' });
  await expect(memberRow(page, 'Clara Beispiel')).not.toContainText('Gespräch geführt');
  await memberRow(page, 'Clara Beispiel').getByRole('button', { name: 'Als geführt markieren' }).click();
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('Gespräch geführt');
  await expect.poll(async () => {
    const d = await getDoc('teamMembers/tm-clara');
    const by = d.fields.meetingsByYear?.mapValue.fields || {};
    return [by[YEAR]?.mapValue.fields.reviewDone?.booleanValue, by[PREV_YEAR]?.mapValue.fields.reviewDone?.booleanValue].join(',');
  }, { timeout: 10000 }).toBe('true,true');
  let doc = await getDoc('teamMembers/tm-clara');
  expect(doc.fields.meetingsByYear.mapValue.fields[PREV_YEAR].mapValue.fields.reviewDoneAt.stringValue).toBe(`${PREV_YEAR}-11-20T00:00:00.000Z`);
  expect(field(doc, 'meetingDone')).toBe(true); // alte Felder werden weiter geschrieben
  // Vorjahr: Haken weiter sichtbar, mit altem Datum
  await yearPicker.getByRole('radio', { name: PREV_YEAR }).click();
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('Gespräch geführt');
  await expect(memberRow(page, 'Clara Beispiel')).toContainText(`20.11.${PREV_YEAR.slice(2)}`);
  // Laufendes Jahr zurücksetzen: Vorjahr bleibt
  await yearPicker.getByRole('radio', { name: YEAR }).click();
  await memberRow(page, 'Clara Beispiel').getByRole('button', { name: /Weitere Aktionen/ }).click();
  await page.getByRole('menuitem', { name: 'Beurteilungsgespräch: zurücksetzen' }).click();
  await expect(memberRow(page, 'Clara Beispiel')).not.toContainText('Gespräch geführt');
  await yearPicker.getByRole('radio', { name: PREV_YEAR }).click();
  await expect(memberRow(page, 'Clara Beispiel')).toContainText('Gespräch geführt');
});
