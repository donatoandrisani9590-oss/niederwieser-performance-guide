// Handy (390 px, Touch): die zwei wichtigsten Abläufe und das Layout der Bögen.
// Ergänzt die Desktop-Tests; gefunden wurden hier überlappende Kopfknöpfe und gequetschte Leisten (Vollprüfung 23.11.2026).
import { test, expect, openApp } from './fixtures.mjs';
import { seed, USERS, listDocs } from './seed.mjs';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test.beforeEach(async () => { await seed(); });

const field = (doc, name) => { const v = doc && doc.fields && doc.fields[name]; return v ? Object.values(v)[0] : undefined; };
const noSideScroll = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
// Kein Bedienelement ragt aus dem Bildschirm und keine zwei überlappen sich
const tidy = async (page, locator) => {
  const boxes = [];
  for (const el of await locator.all()) { if (await el.isVisible()) boxes.push(await el.boundingBox()); }
  for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(391); }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const overlap = a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
    expect(overlap, `Knöpfe ${i} und ${j} überlappen`).toBe(false);
  }
  return boxes.length;
};
async function loginPhone(page, user) {
  await openApp(page);
  await page.getByRole('button', { name: 'Menü' }).click();
  await page.getByRole('dialog', { name: 'Navigation' }).getByText('Team-Übersicht', { exact: true }).click();
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('4 Mitarbeiter')).toBeVisible();
}

test('Handy, Mitarbeiter: Link öffnen, starten, abschicken – ohne Überlauf und mit erreichbaren Knöpfen', async ({ page, consoleErrors }) => {
  await openApp(page, '?accessCode=CODE-tm-emil');
  await expect(page.getByText(/Willkommen, Emil Probe/)).toBeVisible({ timeout: 15000 });
  await noSideScroll(page);
  await page.getByRole('button', { name: /Selbstreflexion starten/ }).click();
  const head = page.getByRole('button', { name: /Entwurf speichern|Selbstreflexion abschicken/ });
  await expect(head.first()).toBeVisible();
  expect(await tidy(page, head)).toBeGreaterThanOrEqual(2);
  await noSideScroll(page);
  // Abschnittsleiste: eigene Zeile über den Aktionen, mehrere Abschnitte sichtbar (vorher auf einen halben Chip gequetscht)
  const bar = page.getByTestId('form-bar');
  const chips = bar.getByRole('navigation').getByRole('button');
  await bar.scrollIntoViewIfNeeded(); // die Leiste steht unter dem Kopf des Bogens
  await expect(chips.nth(2)).toBeInViewport();
  const navBox = await bar.getByRole('navigation').boundingBox();
  expect(navBox.width).toBeGreaterThan(300);
  page.removeAllListeners('dialog');
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.getByRole('button', { name: /Selbstreflexion abschicken/ }).first().click();
  const isSelf = (d) => field(d, 'employeeId') === 'tm-emil' && /^self/.test(String(field(d, 'type')));
  await expect.poll(async () => (await listDocs('teamAppraisals')).filter(isSelf).length, { timeout: 20000 }).toBeGreaterThan(0);
  expect(consoleErrors).toEqual([]);
});

test('Handy, Führungskraft: Beurteilung starten, Kopfknöpfe sauber, Entwurf speichern bleibt im Bogen', async ({ page, consoleErrors }) => {
  await loginPhone(page, USERS.managerA);
  await noSideScroll(page);
  const card = page.getByTestId('member-compact-card').filter({ hasText: 'Emil Probe' });
  // Tippflächen der Karte sind mindestens 36 px hoch
  for (const b of await card.getByRole('button').all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(36);
  await card.getByRole('button', { name: 'Starten' }).click();
  const actions = page.getByRole('button', { name: /^(Entwurf speichern|Abschließen|Abbrechen)$/ });
  await expect(actions.first()).toBeVisible();
  expect(await tidy(page, actions)).toBeGreaterThanOrEqual(3);
  await noSideScroll(page);
  await page.getByRole('button', { name: 'Entwurf speichern' }).first().click();
  // „Entwurf speichern“ bleibt im Bogen (Freigabe 23.11.2026): Meldung erscheint, zurück geht es über das Menü
  await expect(page.getByText(/als Entwurf gespeichert/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('form-bar')).toBeVisible();
  await page.getByRole('button', { name: 'Menü' }).click();
  await page.getByRole('dialog', { name: 'Navigation' }).getByText('Team-Übersicht', { exact: true }).click();
  await expect(page.getByTestId('member-compact-card').filter({ hasText: 'Emil Probe' })).toContainText('Entwurf', { timeout: 15000 });
  const drafts = (await listDocs('teamAppraisals')).filter((d) => field(d, 'employeeId') === 'tm-emil' && field(d, 'type') === 'review' && field(d, 'status') === 'draft');
  expect(drafts.length).toBe(1);
  expect(consoleErrors).toEqual([]);
});

test('Handy, HR: Dashboard, Reiter und Salary Review ohne seitliches Scrollen der Seite', async ({ page, consoleErrors }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Menü' }).click();
  await page.getByRole('dialog', { name: 'Navigation' }).getByText('Team-Übersicht', { exact: true }).click();
  await page.locator('input[type="email"]').fill(USERS.hr.email);
  await page.locator('input[type="password"]').first().fill(USERS.hr.password);
  await page.locator('form button[type="submit"]').click();
  const nav = async (t) => { await page.getByRole('button', { name: 'Menü' }).click(); await page.getByRole('dialog', { name: 'Navigation' }).getByText(t, { exact: true }).click(); };
  await nav('HR Dashboard');
  const tabs = page.getByRole('tablist', { name: 'HR Dashboard' }).getByRole('tab');
  await expect(tabs.first()).toBeVisible();
  for (const t of await tabs.all()) { await t.click(); await page.waitForTimeout(250); await noSideScroll(page); }
  await nav('Salary Review');
  await expect(page.getByText(/Salary Review \d{4}/)).toBeVisible();
  await noSideScroll(page);
  expect(consoleErrors).toEqual([]);
});
