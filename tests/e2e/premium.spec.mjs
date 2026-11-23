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
  await page.getByTestId('dashboard-basics').getByRole('button', { name: /Grundlagen/ }).click(); // aufklappen, damit die Seite lang genug zum Scrollen ist (U12)
  // Das Akkordeon gleitet 280 ms auf: scrollen, sobald die Seite lang genug ist
  await expect.poll(async () => { await page.evaluate(() => { document.querySelector('main').scrollTop = 900; }); return top(); }).toBeGreaterThan(300);
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

test('Nutzerkarte: Name vollständig lesbar, Konto-Popover mit Rolle und Abmelden', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  const card = page.getByTestId('user-card');
  const name = card.getByText(USERS.managerA.name, { exact: true });
  await expect(name).toBeVisible();
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true); // nicht abgeschnitten
  await card.click();
  const pop = page.getByRole('dialog', { name: 'Konto' });
  await expect(pop).toContainText('Angemeldet');
  await expect(pop).toContainText(USERS.managerA.email);
  await expect(pop).toContainText('Führungskraft');
  await expect(pop.getByRole('button', { name: 'Abmelden' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
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

test('Glossar: „GPS“ an der Kennzahl erklärt sich beim Darüberfahren und per Tastatur, Esc blendet aus', async ({ page, consoleErrors }) => {
  await loginTeam(page, USERS.managerA);
  const term = page.locator('main [data-nw-term="GPS"]').first();
  const tip = page.locator('[data-nw-gloss]');
  await expect(term).toHaveText('GPS');
  await expect(tip).toHaveCount(0);
  await term.hover();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Global Performance Score');
  await expect(tip).toContainText('50 % WAS (Zielerreichung) und 50 % WIE (Kompetenzen)');
  // Der Zeiger kann auf das Kärtchen hinüberfahren, ohne dass es verschwindet
  await tip.hover();
  await page.waitForTimeout(400);
  await expect(tip).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(tip).toHaveCount(0);
  // Tastatur: Fokus zeigt, Esc blendet aus
  await term.focus();
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toHaveCount(0);
  // Screenreader: Beschreibung hängt dauerhaft am Begriff
  const described = await term.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')).textContent);
  expect(described).toContain('Global Performance Score');
  expect(consoleErrors).toEqual([]);
});

test('Glossar im Bogen: Überschriften behalten ihren Wortlaut, WAS/WIE/GPS/BARS sind erklärt, die Abschnittsleiste bleibt', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  await memberRow(page, 'Emil Probe').getByRole('button', { name: 'Starten', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Teil B: Zielerreichung (WAS) – 50% Gewichtung' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Teil C: Kern-Kompetenzen (WIE)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Teil C.3: Global Performance Score (GPS)' })).toBeVisible();
  for (const key of ['WAS', 'WIE', 'GPS', 'BARS']) await expect(page.locator(`main [data-nw-term="${key}"]`).first()).toBeAttached();
  const nav = page.getByRole('navigation', { name: 'Abschnitte des Bogens' });
  for (const code of ['A', 'B', 'C', 'C.3', 'D']) await expect(nav.getByRole('button', { name: code, exact: true })).toBeVisible();
  const wie = page.locator('main [data-nw-term="WIE"]').first();
  await wie.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await wie.hover();
  const tip = page.locator('[data-nw-gloss="WIE"]');
  await expect(tip).toContainText('WIE: Verhalten & Kompetenzen');
  const box = await tip.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1440);
  expect(box.y + box.height).toBeLessThanOrEqual(900);
  // Seitenwechsel räumt ein offenes Kärtchen weg
  manualDialogs(page, true);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.locator('[data-nw-ok]').click();
  await expect(page.locator('[data-nw-gloss]')).toHaveCount(0);
});

test('Glossar auf Italienisch: COSA und COME mit italienischer Erklärung', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  await page.getByRole('button', { name: /^Sprache/ }).click();
  await page.getByRole('menuitemradio', { name: /Italiano/ }).click();
  await page.getByRole('row').filter({ hasText: 'Emil Probe' }).getByRole('button', { name: 'Avvia', exact: true }).click();
  const cosa = page.locator('main [data-nw-term="WAS"]').first();
  await expect(cosa).toHaveText('COSA');
  await cosa.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await cosa.hover();
  await expect(page.locator('[data-nw-gloss="WAS"]')).toContainText('COSA: Obiettivi & Risultati');
  await expect(page.locator('[data-nw-gloss="WAS"]')).toContainText('Vale il 50 % del GPS');
});

test.describe('Handy (390 px): Glossar', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('Antippen zeigt die Erklärung ganz im Bild, Antippen daneben blendet sie aus', async ({ page }) => {
    await openApp(page, '?accessCode=CODE-tm-emil');
    await page.getByRole('button', { name: /Selbstreflexion starten/ }).click();
    const was = page.locator('[data-nw-term="WAS"]').first();
    await was.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await was.tap();
    const tip = page.locator('[data-nw-gloss="WAS"]');
    await expect(tip).toBeVisible();
    const box = await tip.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await page.getByRole('heading', { name: /^Teil A/ }).tap({ force: true }).catch(() => {});
    await page.mouse.click(5, 300);
    await expect(tip).toHaveCount(0);
  });
});

test('Dashboard: Grundlagen für Führungskräfte mit Team eingeklappt, auf Klick vollständig da', async ({ page, consoleErrors }) => {
  await loginTeam(page, USERS.managerA);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Dashboard', { exact: true }).click();
  await expect(page.getByText('Meine offenen Punkte')).toBeVisible();
  const basics = page.getByTestId('dashboard-basics');
  await expect(basics.getByRole('heading', { name: 'Grundlagen: Werte, GPS und Jahreszyklus' })).toBeVisible();
  // Eingeklappt: die langen Erklärblöcke sind nicht zu sehen, der Jahreskalender bleibt
  await expect(page.getByText('Performance-Jahreszyklus')).toBeVisible();
  await expect(page.getByText('Dein Performance Kompass')).toBeHidden();
  await expect(page.getByText('Wie funktioniert BARS?')).toBeHidden();
  const collapsed = await page.evaluate(() => document.querySelector('main').scrollHeight);
  // Aufklappen: alle Inhalte wie bisher
  await basics.getByRole('button', { name: /Grundlagen/ }).click();
  for (const text of ['Dein Performance Kompass', 'Wie funktioniert BARS?', 'DER JAHRESZYKLUS IM ÜBERBLICK', 'Fast', 'Fair', 'Personal'])
    await expect(basics.getByText(text, { exact: true }).first()).toBeVisible();
  await expect(basics.getByRole('button', { name: 'Kompetenzen ansehen' })).toBeVisible();
  // eingeklappt ist die Seite deutlich kürzer (das Aufklappen gleitet 280 ms)
  await expect.poll(() => page.evaluate(() => document.querySelector('main').scrollHeight)).toBeGreaterThan(collapsed + 1000);
  // Per Tastatur bedienbar
  await basics.getByRole('button', { name: /Grundlagen/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Dein Performance Kompass')).toBeHidden();
  expect(consoleErrors).toEqual([]);
});

test('Dashboard: Grundlagen für neue Nutzer (nicht angemeldet) offen', async ({ page }) => {
  await openApp(page);
  const basics = page.getByTestId('dashboard-basics');
  await expect(basics.getByText('Dein Performance Kompass')).toBeVisible();
  await expect(basics.getByText('Wie funktioniert BARS?')).toBeVisible();
  await basics.getByRole('button', { name: 'Kompetenzen ansehen' }).click();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Kompetenzen' })).toHaveAttribute('aria-current', 'page');
});

// ---------- n.Org Design System 2.0 (docs/design-transfer bzw. Übergabepaket „Application 2.0“) ----------

test('Designsystem 2.0: Tokens und Rollen wirken (Radius-Token, KPI-Schrift, Shimmer, Touch-Variante, Motion-Tokens)', async ({ page, consoleErrors }) => {
  await loginTeam(page, USERS.managerA);
  // rounded-ctl (7 px) am kleinen Knopf, t-kpi 32/38 am Kennzahl-Wert
  const small = memberRow(page, 'Clara Beispiel').getByRole('button', { name: 'Ansehen' });
  expect(await small.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('7px');
  const kpi = page.locator('main .t-kpi').first();
  expect(await kpi.evaluate((el) => getComputedStyle(el).fontSize + '/' + getComputedStyle(el).lineHeight)).toBe('32px/38px');
  // Klassen aus dem Stilblock und der Konfiguration werden erzeugt
  const probe = await page.evaluate(async () => {
    const box = document.createElement('div');
    box.innerHTML = '<div class="skeleton h-3 w-24"></div><div class="duration-emph ease-standard transition-[width]"></div><div class="animate-view-in"></div><div class="coarse:h-10"></div><div class="shadow-drawer text-touch bg-chart-3"></div>';
    document.body.appendChild(box);
    await new Promise((r) => setTimeout(r, 400)); // Tailwind erzeugt die Klassen im Browser
    const cs = (i) => getComputedStyle(box.children[i]);
    const css = [...document.styleSheets].map((sh) => { try { return [...sh.cssRules].map((r) => r.cssText).join(' '); } catch (e) { return ''; } }).join(' ');
    const out = { shimmer: cs(0).animationName, emph: cs(1).transitionDuration, standard: cs(1).transitionTimingFunction, viewIn: cs(2).animationName,
      coarse: /pointer:\s*coarse/.test(css), touch: cs(4).fontSize, chart3: cs(4).backgroundColor };
    box.remove();
    return out;
  });
  expect(probe).toEqual({ shimmer: 'shimmer', emph: '0.4s', standard: 'cubic-bezier(0.2, 0, 0, 1)', viewIn: 'view-in', coarse: true, touch: '16px', chart3: 'rgb(146, 152, 195)' });
  expect(consoleErrors).toEqual([]);
});

test('Designsystem 2.0: Dashboard-Akkordeon gleitet auf, eingeklappter Inhalt ist nicht erreichbar', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Dashboard', { exact: true }).click();
  const basics = page.getByTestId('dashboard-basics');
  const button = basics.getByRole('button', { name: /Grundlagen/ });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  const panel = basics.locator('.disclose');
  expect(await panel.evaluate((el) => getComputedStyle(el.firstElementChild).visibility)).toBe('hidden');
  expect(await panel.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.28s');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(basics.getByText('Dein Performance Kompass')).toBeVisible();
  // Schnellstart-Guide nutzt dasselbe Muster
  const quick = page.getByTestId('dashboard-quickstart').getByRole('button', { name: /Schnellstart-Guide/ });
  await expect(quick).toHaveAttribute('aria-expanded', 'false');
  await quick.click();
  await expect(page.getByTestId('dashboard-quickstart').getByText('Für Führungskräfte')).toBeVisible();
});

test.describe('Handy (390 px): Designsystem 2.0', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('Dialog kommt als Bottom-Sheet von unten: volle Breite, oben gerundet, Knöpfe 44 px', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Menü' }).click();
    await page.locator('#nw-sidebar-menu').getByText('Team-Übersicht', { exact: true }).click();
    await page.locator('input[type="email"]').fill(USERS.managerA.email);
    await page.locator('input[type="password"]').first().fill(USERS.managerA.password);
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
    manualDialogs(page, true);
    const emil = page.getByTestId('member-compact-card').filter({ hasText: 'Emil Probe' });
    await emil.getByRole('button', { name: 'Starten', exact: true }).click();
    await page.getByRole('button', { name: 'Zurück', exact: true }).first().click();
    const sheet = page.locator('[data-nw-dialog]').getByRole('alertdialog');
    await expect(sheet).toBeVisible();
    await page.waitForTimeout(450); // Auftritt (280 ms) abwarten
    const box = await sheet.boundingBox();
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.y + box.height)).toBe(844);
    const style = await sheet.evaluate((el) => { const c = getComputedStyle(el); return [c.borderTopLeftRadius, c.borderBottomLeftRadius, c.animationName]; });
    expect(style).toEqual(['12px', '0px', 'sheet-up']);
    const ok = await page.locator('[data-nw-ok]').boundingBox();
    const cancel = await page.locator('[data-nw-cancel]').boundingBox();
    expect(Math.round(ok.height)).toBe(44);
    expect(cancel.x).toBeLessThan(ok.x); // Abbrechen links, Hauptaktion rechts
    await page.locator('[data-nw-cancel]').click();
    await expect(page.locator('[data-nw-dialog]')).toHaveCount(0);
  });
});

test('Seitenwechsel mit Übergang: fest positionierte Elemente sitzen danach richtig (⋯-Menü am Knopf)', async ({ page }) => {
  await loginTeam(page, USERS.managerA);
  // Die Auftritts-Klasse wird nach dem Übergang abgenommen
  await expect.poll(() => page.evaluate(() => document.querySelector('main > div').classList.contains('animate-view-in'))).toBe(false);
  const btn = memberRow(page, 'Clara Beispiel').getByRole('button', { name: /Weitere Aktionen/ });
  await btn.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const b = await btn.boundingBox();
  // direkt unter dem Knopf (der Auftritt des Menüs bewegt es 140 ms lang um 4 px, deshalb abwarten)
  await expect.poll(async () => { const m = await menu.boundingBox(); return Math.abs(m.y - (b.y + b.height + 4)); }).toBeLessThan(2);
  const m = await menu.boundingBox();
  expect(Math.abs((m.x + m.width) - (b.x + b.width))).toBeLessThan(3); // rechtsbündig am Knopf
});

// ---------- Shell 2.0 (design-system.md §16.1) ----------

test('Shell am Desktop: Seitenleiste mit Logo, Pillen, Sprach-Menü und Konto-Karte; einklappbar zur schmalen Leiste', async ({ page, consoleErrors }) => {
  await loginTeam(page, USERS.managerA);
  const aside = page.locator('aside');
  expect(Math.round((await aside.boundingBox()).width)).toBe(256);
  const logo = aside.getByRole('img', { name: /Niederwieser/ });
  expect(Math.round((await logo.boundingBox()).width)).toBe(196); // LmP_RGB, 196 px
  const pages = page.getByRole('navigation', { name: 'Seitennavigation' });
  await expect(pages.getByRole('button', { name: 'Start' })).toBeEnabled();
  await expect(pages.getByRole('button', { name: 'Zurück' })).toBeEnabled();
  // Pille weitet sich beim Darüberfahren und zeigt das Wort
  const back = pages.getByRole('button', { name: 'Zurück' });
  const before = (await back.boundingBox()).width;
  await back.hover();
  await expect.poll(async () => (await back.boundingBox()).width).toBeGreaterThan(before + 30);
  await page.mouse.move(800, 500);
  // Icon-Knöpfe behalten ihr Icon in voller Größe (⋯-Menü)
  const more = memberRow(page, 'Clara Beispiel').getByRole('button', { name: /Weitere Aktionen/ });
  expect(await more.evaluate((el) => Math.round(el.querySelector('svg').getBoundingClientRect().width))).toBe(14);
  // Sprache über das kompakte Menü
  await page.getByRole('button', { name: /^Sprache/ }).click();
  await page.getByRole('menuitemradio', { name: /English/ }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByText('Team Overview')).toBeVisible();
  await page.getByRole('button', { name: /^Language/ }).click();
  await page.getByRole('menuitemradio', { name: /Deutsch/ }).click();
  // Einklappen → schmale Leiste (84 px) mit denselben Zielen als Icons, wieder aufklappen
  await page.getByRole('button', { name: 'Seitenleiste einklappen' }).click();
  expect(Math.round((await page.locator('aside').boundingBox()).width)).toBe(84);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('Meine offenen Punkte')).toBeVisible();
  await page.getByRole('button', { name: 'Seitenleiste aufklappen' }).click();
  expect(Math.round((await page.locator('aside').boundingBox()).width)).toBe(256);
  expect(consoleErrors).toEqual([]);
});

test.describe('Tablet (1024 px): Shell 2.0', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('Schmale Leiste als Standard, Aufklappen als Overlay über dem Inhalt, Navigation schließt es', async ({ page }) => {
    await openApp(page);
    expect(Math.round((await page.locator('aside').boundingBox()).width)).toBe(84);
    const mainLeft = (await page.locator('main').boundingBox()).x;
    await page.getByRole('button', { name: 'Seitenleiste aufklappen' }).click();
    const nav = page.getByRole('dialog', { name: 'Navigation' });
    await expect(nav).toBeVisible();
    expect((await page.locator('main').boundingBox()).x).toBe(mainLeft); // der Inhalt springt nicht
    await nav.getByRole('button', { name: 'Team-Übersicht' }).click();
    await expect(nav).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    // Esc schließt das Overlay
    await page.getByRole('button', { name: 'Seitenleiste aufklappen' }).click();
    await expect(nav).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(nav).toHaveCount(0);
  });
});

test.describe('Handy (390 px): Shell 2.0', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('Top-Leiste 56 px mit Menü, Logo ohne Payoff und Assistent; Navigation als Schublade von links', async ({ page }) => {
    await openApp(page);
    const bar = page.locator('header').first();
    expect(Math.round((await bar.boundingBox()).height)).toBe(56);
    expect(Math.round((await bar.getByRole('img', { name: 'Niederwieser' }).boundingBox()).width)).toBe(112); // LoP_RGB
    const menu = bar.getByRole('button', { name: 'Menü' });
    const size = await menu.boundingBox();
    expect(Math.round(size.width)).toBe(44); expect(Math.round(size.height)).toBe(44);
    await expect(page.locator('aside')).toHaveCount(0);
    await menu.click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(400);
    const box = await drawer.boundingBox();
    expect(Math.round(box.x)).toBe(0);
    expect(box.width).toBeLessThanOrEqual(300);
    await expect(drawer.getByText('Sprache')).toBeVisible();               // Sprachwahl im Fuß
    await expect(drawer.getByRole('radio', { name: 'IT' })).toBeVisible();
    await drawer.getByRole('button', { name: 'Schließen' }).click();
    await expect(drawer).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
});
