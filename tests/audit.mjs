// Vollprüfung in der lokalen Vorschau (Emulator, Testdaten): jede Ansicht je Rolle, Desktop und Handy.
// Misst Konsolenfehler, waagrechten Überlauf, abgeschnittene Texte, kleine Tippflächen, Bedienelemente ohne Namen.
// Aufruf im Ordner tests, während „npm run vorschau“ läuft:  node audit.mjs <zielordner>
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seed, USERS, ACCESS_CODE } from './e2e/seed.mjs';

const URL0 = 'http://127.0.0.1:5174/index.html';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const findings = [];

const measure = (mobile) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const txt = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  const res = { overflowX: [], clipped: [], small: [], unnamed: [], unlabeled: [], undef: [] };
  const vw = document.documentElement.clientWidth;
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 && r.left < vw && !el.closest('.overflow-x-auto, .table-scroll, [class*="overflow-x-auto"]') && el.children.length === 0) res.overflowX.push(el.tagName + ':' + txt(el));
    if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(getComputedStyle(el).overflowX) && (el.innerText || '').trim()) res.clipped.push(txt(el));
  }
  for (const el of document.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="menuitem"]')) {
    if (!vis(el)) continue;
    if (!txt(el)) res.unnamed.push(el.outerHTML.slice(0, 110));
    const r = el.getBoundingClientRect();
    if (mobile && (r.height < 36 || r.width < 36)) res.small.push(Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + txt(el));
  }
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea')) {
    if (!vis(el)) continue;
    const named = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || el.placeholder || (el.id && document.querySelector('label[for="' + el.id + '"]')) || el.closest('label');
    if (!named) res.unlabeled.push(el.tagName + '[' + (el.type || '') + '] ' + (el.className || '').slice(0, 40));
  }
  const t = document.body.innerText;
  for (const m of t.matchAll(/.{0,25}\b(undefined|NaN|null|\[object Object\])\b.{0,25}/g)) res.undef.push(m[0].replace(/\s+/g, ' '));
  return res;
};

async function session(tag, viewport, mobile, mode) {
  await seed();
  const ctx = await browser.newContext({ viewport, locale: 'de-DE', hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  let n = 0;
  const check = async (name) => {
    await page.waitForTimeout(700);
    const id = `${tag}-${String(++n).padStart(2, '0')}-${name}`;
    const h = await page.evaluate(() => Math.max(innerHeight, ...[...document.querySelectorAll('*')].filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 300).map((el) => el.scrollHeight + el.getBoundingClientRect().top)));
    // Am Handy getrennt messen und fotografieren: Fenstergröße ändern hebt die Touch-Emulation auf.
    if (mode === 'shots') { await page.screenshot({ path: join(out, id + '.png') }); return; }
    const r = await page.evaluate(measure, mobile);
    if (mode !== 'measure') {
      await page.setViewportSize({ width: viewport.width, height: Math.min(Math.ceil(h), 9000) });
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(out, id + '.png'), fullPage: true });
      await page.setViewportSize(viewport);
    }
    findings.push({ id, height: h, errors: errs.splice(0), ...r });
  };
  const openNav = async () => { if (mobile) { await page.getByRole('button', { name: 'Menü' }).click(); await page.waitForTimeout(350); } };
  const nav = async (t) => { await openNav(); const scope = mobile ? page.getByRole('dialog', { name: 'Navigation' }) : page.getByRole('navigation', { name: 'Hauptnavigation' }); await scope.getByText(t, { exact: true }).first().click(); };
  const go = async (q = '') => { await page.goto(URL0 + q); await page.waitForFunction(() => window.__EMULATOR_CONNECTED__ === true); };
  const login = async (u) => {
    await go(); await nav('Team-Übersicht');
    await check('anmeldung');
    await page.locator('input[type="email"]').fill(u.email);
    await page.locator('input[type="password"]').first().fill(u.password);
    await page.locator('form button[type="submit"]').click();
    await (mobile ? page.getByRole('button', { name: 'Menü' }) : page.getByTestId('user-card')).waitFor();
    await page.waitForTimeout(900);
  };
  const step = async (name, fn) => { try { await fn(); await check(name); } catch (e) { findings.push({ id: `${tag}-FEHLER-${name}`, errors: [String(e).split('\n')[0].slice(0, 220)] }); } };
  return { page, ctx, check, nav, go, login, step };
}

async function run(tag, viewport, mobile, mode) {
  // A) ohne Anmeldung
  let s = await session(tag + '-gast', viewport, mobile, mode);
  await s.go(); await s.check('dashboard');
  for (const v of ['Anleitung', 'Kompetenzen', 'GPS Formel', 'Meine Selbstreflexion']) await s.step(v.toLowerCase().replace(/\s+/g, '-'), () => s.nav(v));
  await s.step('link-willkommen', () => s.go('?accessCode=' + ACCESS_CODE));
  await s.step('link-formular', async () => { await s.page.getByRole('button', { name: /starten|beginnen|Los|Weiter|fortsetzen/i }).first().click(); });
  await s.ctx.close();
  // B) Führungskraft
  s = await session(tag + '-fk', viewport, mobile, mode);
  await s.login(USERS.managerA); await s.check('team');
  const p = s.page;
  const member = (name) => mobile ? p.getByTestId('member-compact-card').filter({ hasText: name }) : p.getByRole('row').filter({ hasText: name });
  await s.step('team-zeilenmenue', async () => { await member('Clara Beispiel').getByRole('button', { name: /Weitere Aktionen|Aktionen|Mehr/ }).first().click(); });
  await p.keyboard.press('Escape');
  await s.step('dialog-link-senden', async () => { await member('Emil Probe').getByRole('button', { name: 'Link senden' }).click(); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await s.step('dialog-termin', async () => { await member('Emil Probe').getByText('Termin planen').click(); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await s.step('dialog-mitarbeiter-neu', async () => { await p.getByRole('button', { name: /Mitarbeiter hinzufügen/ }).first().click(); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await s.step('selbstreflexion-ansehen', async () => { await member('Clara Beispiel').getByRole('button', { name: 'Ansehen' }).click(); });
  await s.step('team-zurueck', () => s.nav('Team-Übersicht'));
  await s.step('beurteilung-fortsetzen', async () => { await member('David Muster').getByRole('button', { name: 'Fortsetzen' }).click(); });
  await s.step('beurteilung-abschliessen-dialog', async () => { await p.getByRole('button', { name: /Abschließen/ }).first().click(); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await s.step('team-nach-formular', async () => { await s.nav('Team-Übersicht'); await p.waitForTimeout(400); const d = p.locator('[data-nw-dialog]'); if (await d.count()) await d.locator('[data-nw-ok]').click(); });
  await s.step('zielvereinbarung-neu', async () => { await member('Clara Beispiel').getByRole('button', { name: 'Erstellen' }).click(); });
  await s.step('team-2', async () => { await s.nav('Team-Übersicht'); await p.waitForTimeout(400); const d = p.locator('[data-nw-dialog]'); if (await d.count()) await d.locator('[data-nw-ok]').click(); });
  for (const v of ['Kalibrierung', 'Ziel-Dashboard', 'Dashboard', 'Meine Selbstreflexion']) await s.step(v.toLowerCase().replace(/\s+/g, '-'), () => s.nav(v));
  await s.ctx.close();
  // C) HR
  s = await session(tag + '-hr', viewport, mobile, mode);
  await s.login(USERS.hr); await s.check('start');
  await s.step('hr-dashboard', () => s.nav('HR Dashboard'));
  const tabs = await s.page.getByRole('tablist', { name: 'HR Dashboard' }).getByRole('tab').allInnerTexts();
  for (const t of tabs.slice(1)) await s.step('hr-' + t.trim().toLowerCase().replace(/[^a-zäöü]+/g, '-'), async () => { await s.page.getByRole('tablist', { name: 'HR Dashboard' }).getByRole('tab', { name: t.trim() }).click(); });
  await s.step('hr-ansehen', async () => { await s.page.getByRole('tablist', { name: 'HR Dashboard' }).getByRole('tab').first().click(); await s.page.getByRole('button', { name: 'Ansehen' }).first().click(); });
  await s.page.keyboard.press('Escape');
  for (const v of ['Salary Review', 'Ziel-Dashboard', 'Team-Übersicht', 'Dashboard']) await s.step(v.toLowerCase().replace(/\s+/g, '-'), () => s.nav(v));
  await s.ctx.close();
}
const only = process.argv[3] || 'alle';
if (only !== 'handy') await run('d', { width: 1440, height: 900 }, false);
await run('m', { width: 390, height: 844 }, true, 'measure');
await run('m', { width: 390, height: 3800 }, true, 'shots');
await browser.close();
writeFileSync(join(out, 'befunde.json'), JSON.stringify(findings, null, 1));
for (const f of findings) {
  const parts = [];
  for (const k of ['errors', 'overflowX', 'clipped', 'small', 'unnamed', 'unlabeled', 'undef']) if (f[k] && f[k].length) parts.push(`  ${k} (${f[k].length}): ` + [...new Set(f[k])].slice(0, 6).join(' | '));
  console.log(f.id + (f.height ? ` [${f.height}px]` : ''));
  if (parts.length) console.log(parts.join('\n'));
}
