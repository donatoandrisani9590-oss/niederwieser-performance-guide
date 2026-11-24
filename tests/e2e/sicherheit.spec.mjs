// Sicherheit: Text aus den Bögen darf nirgends als HTML ausgeführt werden (Audit 23.11.2026, S2).
// Vorher lief ein Bild-Element mit Fehler-Handler aus einem Kommentarfeld der Selbstreflexion in der Sitzung der
// Führungskraft, sobald sie ein PDF erzeugte. Der Test schreibt Schadtext in alle Freitextfelder der Testdaten und
// löst jede Stelle aus, die HTML als Text zusammenbaut (vier PDF-Vorlagen, HR-Export, Detail-Fenster).
import { test, expect, openApp } from './fixtures.mjs';
import { seed, USERS, listDocs, setDoc } from './seed.mjs';

const BAD = '<img src=x onerror="window.__xss=(window.__xss||0)+1">"\'><svg onload="window.__xss=(window.__xss||0)+1">';
const KEEP = /^(id|type|status|period|userId|managerId|employeeId|employeeName|createdAt|updatedAt|submittedAt|sharedAt|accessCode|email|ownerEmail|date|deadline|category|storagePath|pdfUrl|location)$/;
const conv = (v) => { const k = Object.keys(v)[0]; if (k === 'mapValue') return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([a, b]) => [a, conv(b)])); if (k === 'arrayValue') return (v.arrayValue.values || []).map(conv); if (k === 'integerValue' || k === 'doubleValue') return Number(v[k]); if (k === 'nullValue') return null; return v[k]; };
const poison = (o, key) => { if (typeof o === 'string') return KEEP.test(key || '') || /^\d{4}-\d{2}-\d{2}/.test(o) ? o : o + ' ' + BAD; if (Array.isArray(o)) return o.map((x) => poison(x, key)); if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, poison(v, k)])); return o; };

test.beforeEach(async ({ page }) => {
  await seed();
  for (const d of await listDocs('teamAppraisals')) {
    const id = d.name.split('/').pop();
    const data = Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, conv(v)]));
    // Freitext auch dort ergänzen, wo die Testdaten leer sind
    data.formData = { ...(data.formData || {}), strengths: 'Stärke', devAreas: 'Feld', comment: 'Kommentar' };
    await setDoc('teamAppraisals/' + id, poison(data));
  }
  // Jede Zuweisung von HTML-Text mitschreiben, um zu prüfen, dass der Schadtext als Text ankommt
  await page.addInitScript(() => { window.__html = []; const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(Element.prototype, 'innerHTML', { set(v) { d.set.call(this, v); if (typeof v === 'string' && v.length > 800) window.__html.push(this.innerHTML); }, get() { return d.get.call(this); }, configurable: true }); });
});

const login = async (page, u) => {
  await openApp(page);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Team-Übersicht', { exact: true }).click();
  await page.locator('input[type="email"]').fill(u.email);
  await page.locator('input[type="password"]').first().fill(u.password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByTestId('user-card')).toBeVisible();
};
const row = (page, n) => page.getByRole('row').filter({ hasText: n });
// Löst ein PDF aus und prüft: kein Code gelaufen, der Schadtext steht maskiert im erzeugten HTML
const pdfSafe = async (page, rx = /PDF herunterladen/) => {
  const b = page.getByRole('button', { name: rx }).first();
  await expect(b).toBeVisible();
  const dl = page.waitForEvent('download', { timeout: 60000 }).catch(() => null);
  await b.click(); await dl; await page.waitForTimeout(400);
  const html = (await page.evaluate(() => window.__html.splice(0))).join('\n');
  expect(await page.evaluate(() => window.__xss || 0), 'eingeschleuster Code wurde ausgeführt').toBe(0);
  expect(html.length, 'Vorlage wurde erzeugt').toBeGreaterThan(800);
  expect(html, 'kein Element aus Nutzdaten').not.toMatch(/<img src="x"|<svg onload/i);
  return html;
};

test('PDF Selbstreflexion (Ansicht der Führungskraft): Schadtext wird nicht ausgeführt', async ({ page }) => {
  await login(page, USERS.managerA);
  await row(page, 'Clara Beispiel').getByRole('button', { name: 'Ansehen' }).click();
  const html = await pdfSafe(page);
  expect(html).toContain('&lt;img src=x'); // steht als Text im PDF
});

test('PDF Beurteilung und Zielvereinbarung: Schadtext wird nicht ausgeführt', async ({ page }) => {
  await login(page, USERS.managerA);
  await row(page, 'Clara Beispiel').getByRole('button', { name: 'Öffnen' }).first().click();
  expect(await pdfSafe(page)).toContain('&lt;img src=x');
  page.on('dialog', (d) => d.accept().catch(() => {}));
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('Team-Übersicht', { exact: true }).click();
  await row(page, 'Emil Probe').getByRole('button', { name: 'Öffnen' }).last().click();
  expect(await pdfSafe(page)).toContain('&lt;img src=x');
});

test('PDF im Mitarbeiter-Link: Schadtext aus dem eigenen Entwurf wird nicht ausgeführt', async ({ page }) => {
  await openApp(page, '?accessCode=CODE-tm-emil');
  await page.getByRole('button', { name: /Selbstreflexion starten/ }).click();
  const field = page.locator('textarea').first();
  await field.fill('Mein Text ' + BAD);
  await pdfSafe(page, /Als PDF herunterladen/);
});

test('HR: Export-PDF und Detail-Fenster im Ziel-Dashboard führen Schadtext nicht aus', async ({ page }) => {
  await login(page, USERS.hr);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByText('HR Dashboard', { exact: true }).click();
  await row(page, 'Clara Beispiel').filter({ hasText: 'Review' }).first().getByRole('button', { name: 'Ansehen' }).click();
  const dl = page.waitForEvent('download', { timeout: 60000 }).catch(() => null);
  await page.getByRole('button', { name: 'PDF', exact: true }).click(); await dl;
  expect(await page.evaluate(() => window.__xss || 0)).toBe(0);
  await page.keyboard.press('Escape');
  await page.getByRole('tablist', { name: 'HR Dashboard' }).getByRole('tab', { name: /Ziel-Dashboard/ }).click();
  await page.evaluate(() => window.__html.splice(0));
  await page.getByText('David Muster').first().click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__xss || 0), 'Detail-Fenster hat Code ausgeführt').toBe(0);
  const html = (await page.evaluate(() => window.__html.splice(0))).join('\n');
  expect(html).not.toMatch(/<img src="x"|<svg onload/i);
});
