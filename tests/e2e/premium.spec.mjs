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

test('Gesprächs-Haken umschalten: Rückmeldung mit „Rückgängig“, das den alten Stand wiederherstellt', async ({ page, consoleErrors }) => {
  await loginTeam(page, USERS.managerA);
  // Clara ist eine eigene Mitarbeiterin (bei geteilten erlauben die Firestore-Regeln das Ändern nicht), Gespräch ist geführt
  const row = memberRow(page, 'Clara Beispiel');
  await expect(row).toContainText('Gespräch geführt');
  await row.getByRole('button', { name: /Weitere Aktionen/ }).click();
  await page.getByRole('menuitem', { name: 'Beurteilungsgespräch: zurücksetzen' }).click();
  const toast = page.locator('#nw-toast-region');
  await expect(toast).toContainText('Gespräch mit Clara Beispiel ist wieder offen');
  await expect(row).not.toContainText('Gespräch geführt');
  await expect.poll(async () => field(await getDoc('teamMembers/tm-clara'), 'meetingDone'), { timeout: 10000 }).toBe(false);
  await toast.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(toast).toContainText('Gespräch mit Clara Beispiel als geführt markiert');
  await expect(row).toContainText('Gespräch geführt');
  await expect.poll(async () => field(await getDoc('teamMembers/tm-clara'), 'meetingDone'), { timeout: 10000 }).toBe(true);
  // Nach dem Zurücknehmen gibt es kein zweites „Rückgängig“ (keine Endlosschleife)
  await expect(toast.getByRole('button', { name: 'Rückgängig' })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test('Geteilte Beurteilung (Schalter an): nach späterem Speichern Hinweis „Seit dem Teilen geändert“ mit „Erneut teilen“', async ({ page }) => {
  await page.addInitScript(() => { window.__NW_FEATURES__ = { shareWithEmployee: true }; });
  const doc = await getDoc('teamAppraisals/ap-clara-review');
  const sharedAt = new Date(Date.now() - 3600 * 1000).toISOString();
  // Geteilt vor einer Stunde, danach noch einmal gespeichert (updatedAt jünger als das Teilen)
  const plainMember = { sharedWithEmployee: true, sharedWithEmployeeAt: sharedAt, sharedWithEmployeeBy: USERS.managerA.email, updatedAt: new Date().toISOString() };
  const res = await fetch(`http://127.0.0.1:8080/v1/${doc.name}?updateMask.fieldPaths=sharedWithEmployee&updateMask.fieldPaths=sharedWithEmployeeAt&updateMask.fieldPaths=sharedWithEmployeeBy&updateMask.fieldPaths=updatedAt`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { sharedWithEmployee: { booleanValue: true }, sharedWithEmployeeAt: { stringValue: plainMember.sharedWithEmployeeAt }, sharedWithEmployeeBy: { stringValue: plainMember.sharedWithEmployeeBy }, updatedAt: { stringValue: plainMember.updatedAt } } }),
  });
  expect(res.ok).toBe(true);
  await loginTeam(page, USERS.managerA);
  const row = memberRow(page, 'Clara Beispiel');
  await expect(row.getByTestId('changed-since-share')).toContainText('Seit dem Teilen geändert');
  await expect(row.getByRole('button', { name: 'Erneut teilen' })).toBeVisible();
  // Erneut teilen (Rückfrage bestätigen): Hinweis verschwindet, weil das Teilen jetzt jünger ist als die Änderung
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await row.getByRole('button', { name: 'Erneut teilen' }).click();
  await expect(row.getByTestId('changed-since-share')).toHaveCount(0, { timeout: 10000 });
  await expect(row).toContainText('Mit Mitarbeiter geteilt');
});

test('Nutzerkarte: Name vollständig lesbar, Abmelden erreichbar', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  const name = page.locator('aside').getByText(USERS.managerA.name, { exact: true });
  await expect(name).toBeVisible();
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true); // nicht abgeschnitten
  await expect(page.locator('aside').getByRole('button', { name: 'Abmelden' })).toBeVisible();
});

test.describe('Handy (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function loginTeamMobile(page, user) {
    await openApp(page);
    await page.getByRole('button', { name: 'Menü' }).click();
    await page.locator('#nw-sidebar-menu').getByText('Team-Übersicht', { exact: true }).click();
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').first().fill(user.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
  }
  const card = (page, name) => page.getByTestId('member-compact-card').filter({ hasText: name });
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

  test('Team-Übersicht: je Mitarbeiter eine Karte mit allen drei Schritten, nichts liegt seitlich außerhalb', async ({ page, consoleErrors }) => {
    await loginTeamMobile(page, USERS.managerA);
    await expect(page.getByTestId('member-compact-card')).toHaveCount(4);
    await expect(page.locator('main table')).toHaveCount(0); // keine breite Tabelle mehr
    expect(await overflow(page)).toBe(0);
    const emil = card(page, 'Emil Probe');
    await expect(emil).toContainText('Selbstreflexion');
    await expect(emil).toContainText('Beurteilung & Gespräch');
    await expect(emil).toContainText('Zielvereinbarung');
    // Jede Aktion der Karte liegt innerhalb der Bildschirmbreite
    const boxes = await emil.getByRole('button').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }));
    expect(boxes.length).toBeGreaterThan(3);
    for (const [left, right] of boxes) { expect(left).toBeGreaterThanOrEqual(0); expect(right).toBeLessThanOrEqual(390); }
    // Der hervorgehobene nächste Schritt führt in den Bogen
    await emil.getByRole('button', { name: 'Starten', exact: true }).click();
    await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('Team-Übersicht: ⋯-Menü ganz sichtbar, „Entfernen“ erreichbar, Dialog passt auf den Bildschirm', async ({ page }) => {
    await loginTeamMobile(page, USERS.managerA);
    manualDialogs(page, true);
    const frieda = card(page, 'Frieda Geteilt'); // letzte Karte, unten am Bildschirm
    await frieda.getByRole('button', { name: /Weitere Aktionen/ }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400); // Nachrollen abwarten (Scrollen schließt ein offenes Menü)
    await frieda.getByRole('button', { name: /Weitere Aktionen/ }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await expect(page.getByRole('menuitem', { name: 'Entfernen' })).toBeInViewport({ ratio: 1 });
    await page.getByRole('menuitem', { name: 'Entfernen' }).click();
    const dlg = page.locator('[data-nw-dialog]');
    await expect(dlg).toContainText('aus deiner Ansicht entfernen?');
    const panel = await dlg.getByRole('alertdialog').boundingBox();
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(390);
    await expect(dlg.locator('[data-nw-ok]')).toBeInViewport({ ratio: 1 });
    await dlg.locator('[data-nw-cancel]').click();
    await expect(dlg).toHaveCount(0);
  });

  test('Wechsel der Breite: am Desktop wieder die Tabelle, dieselben Aktionen', async ({ page }) => {
    await loginTeamMobile(page, USERS.managerA);
    await expect(page.getByTestId('member-compact-card')).toHaveCount(4);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('main table')).toHaveCount(1);
    await expect(page.getByTestId('member-compact-card')).toHaveCount(0);
    await expect(memberRow(page, 'Emil Probe').getByRole('button', { name: 'Starten', exact: true })).toBeVisible();
  });
});

test('⋯-Menü in der untersten Zeile bleibt ganz im sichtbaren Bereich (niedriges Fenster)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 620 });
  await loginTeam(page, USERS.managerA);
  const btn = memberRow(page, 'Frieda Geteilt').getByRole('button', { name: /Weitere Aktionen/ });
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await btn.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect.poll(async () => { const b = await menu.boundingBox(); return b ? Math.round(b.y + b.height) : 9999; }).toBeLessThanOrEqual(620);
  await expect(page.getByRole('menuitem', { name: 'Entfernen' })).toBeInViewport({ ratio: 1 });
});

test.describe('Handy (390 px): Rückmeldung', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('Toast nutzt die Bildschirmbreite und liegt über dem Assistent-Knopf, nicht darauf', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Menü' }).click();
    await page.locator('#nw-sidebar-menu').getByText('Team-Übersicht', { exact: true }).click();
    await page.locator('input[type="email"]').fill(USERS.managerA.email);
    await page.locator('input[type="password"]').first().fill(USERS.managerA.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
    const clara = page.getByTestId('member-compact-card').filter({ hasText: 'Clara Beispiel' });
    await clara.getByRole('button', { name: /Weitere Aktionen/ }).click();
    await page.getByRole('menuitem', { name: 'Beurteilungsgespräch: zurücksetzen' }).click();
    const toast = page.locator('#nw-toast-region > div').last();
    await expect(toast).toContainText('Gespräch mit Clara Beispiel ist wieder offen');
    await expect(toast.getByRole('button', { name: 'Rückgängig' })).toBeVisible();
    const box = await toast.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.width).toBeGreaterThan(280); // vorher rund 195 px (halbe Breite), der Text brach nach jedem Wort um
    expect(box.height).toBeLessThan(70);    // höchstens zwei Zeilen
    const assistant = await page.getByRole('button', { name: /HR-Copilot|Assistent/ }).last().boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(assistant.y); // Toast endet über dem runden Knopf
    await toast.getByRole('button', { name: 'Rückgängig' }).click();
    await expect.poll(async () => field(await getDoc('teamMembers/tm-clara'), 'meetingDone'), { timeout: 10000 }).toBe(true);
  });
});

test('Bögen der Führungskraft: je Aktion ein Wort, im Kopf und in der Leiste gleich', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  await memberRow(page, 'Emil Probe').getByRole('button', { name: 'Starten', exact: true }).click();
  const bar = page.getByTestId('form-bar');
  await expect(bar.getByRole('button', { name: 'Entwurf speichern' })).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Abschließen', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entwurf speichern' })).toHaveCount(2); // Kopf und Leiste
  await expect(page.getByRole('button', { name: 'Abschließen', exact: true })).toHaveCount(2);
  for (const old of ['Fertig & abschließen', 'Als Entwurf']) await expect(page.getByRole('button', { name: old })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toHaveCount(0);
});

test('Mitarbeiter-Link: „Selbstreflexion abschicken“ heißt überall gleich, die Hinweise nennen denselben Knopf', async ({ page }) => {
  await openApp(page, '?accessCode=CODE-tm-emil');
  await expect(page.getByText('dann „Selbstreflexion abschicken“')).toBeVisible();
  await page.getByRole('button', { name: /Selbstreflexion starten/ }).click();
  await expect(page.getByRole('button', { name: 'Selbstreflexion abschicken' })).toHaveCount(2); // Kopf und Abschluss-Kasten
  await expect(page.getByTestId('form-bar').getByRole('button', { name: 'Abschicken', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entwurf speichern' })).toHaveCount(3); // Kopf, Leiste, Abschluss-Kasten
  await expect(page.getByText('Am Ende auf „Selbstreflexion abschicken“ klicken.')).toBeVisible();
  await expect(page.getByText(/Abschließen & Senden|Fertig & senden|Als Entwurf speichern/)).toHaveCount(0);
});

test('Selbstreflexion ansehen: nächster Schritt „Beurteilung fortsetzen“ führt in den Bogen, Ansehen ändert nichts', async ({ page, consoleErrors }) => {
  const before = JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields));
  await loginTeam(page, USERS.managerA);
  // David: Selbstreflexion als Entwurf, Beurteilung als Entwurf
  await memberRow(page, 'David Muster').getByRole('button', { name: 'Ansehen' }).click();
  await expect(page.getByRole('heading', { name: 'David Muster' })).toBeVisible();
  const next = page.getByTestId('self-next-step');
  await expect(next).toHaveText('Beurteilung fortsetzen');
  await expect(page.getByRole('button', { name: 'Beurteilung fortsetzen' })).toHaveCount(2); // oben und am Ende
  await expect(page.getByRole('button', { name: 'Zurück zum Team' })).toBeVisible();
  await next.click();
  await expect(page.getByRole('button', { name: /Entwurf speichern/ }).first()).toBeVisible();
  await expect(page.getByText('David Muster').first()).toBeVisible();
  expect(JSON.stringify((await listDocs('teamAppraisals')).map((d) => d.fields))).toBe(before);
  expect(consoleErrors).toEqual([]);
});

test('Selbstreflexion ansehen: bei abgeschlossener Beurteilung „Beurteilung öffnen“ als Nebenaktion, PDF bleibt Hauptaktion', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  await memberRow(page, 'Clara Beispiel').getByRole('button', { name: 'Ansehen' }).click();
  await expect(page.getByRole('heading', { name: 'Clara Beispiel' })).toBeVisible();
  await expect(page.getByTestId('self-next-step')).toHaveText('Beurteilung öffnen');
  await expect(page.getByRole('button', { name: 'PDF herunterladen' })).toBeVisible();
});
