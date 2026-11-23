// Sicherheitsprüfung der Firestore-Regeln gegen den Emulator (nur Testdaten, nie Produktivdaten).
// Aufruf: npm run rules:aktuell   bzw.   npm run rules:vorschlag
// Versucht gezielt, was erlaubt bzw. verboten sein soll, und vergleicht mit der Erwartung für den Vorschlag.
// Exit-Code 1, wenn der Vorschlag eine Erwartung verfehlt. Für die aktuellen Regeln wird nur berichtet.
import { seed, USERS, PROJECT } from '../e2e/seed.mjs';

const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const which = process.argv[2] || 'vorschlag';

const token = async (u) => {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake-api-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, password: u.password, returnSecureToken: true }) });
  return (await r.json()).idToken;
};
const anonToken = async () => {
  const r = await fetch(`${AUTH}/accounts:signUp?key=fake-api-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
  return (await r.json()).idToken;
};
const val = (v) => typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) };
const fields = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)])) });
const call = async (tok, method, path, body, mask) => {
  const q = mask ? '?' + mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&') : '';
  const r = await fetch(`${FS}/${path}${q}`, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined });
  return r.ok;
};

const ids = await seed();
const t = { anon: await anonToken(), a: await token(USERS.managerA), b: await token(USERS.managerB), hr: await token(USERS.hr) };

// [Beschreibung, erwartet im Vorschlag (true = erlaubt), Aufruf]
const checks = [
  ['Mitarbeiter-Link (anonym) liest Gehaltsdaten', false, () => call(t.anon, 'GET', 'salaryReviewData/current')],
  ['Mitarbeiter-Link (anonym) gibt sich Gehalts-Zugriff', false, () => call(t.anon, 'PATCH', 'salaryReviewAccess/hacker', fields({ email: 'x@y.z', role: 'executive' }))],
  ['Mitarbeiter-Link (anonym) löscht eine Beurteilung', false, () => call(t.anon, 'DELETE', 'teamAppraisals/ap-clara-review')],
  ['Mitarbeiter-Link (anonym) legt eine Beurteilung an', false, () => call(t.anon, 'PATCH', 'teamAppraisals/fake-review', fields({ type: 'review', employeeId: 'tm-clara', status: 'completed' }))],
  ['Mitarbeiter-Link (anonym) legt eine Selbstreflexion an', true, () => call(t.anon, 'PATCH', 'teamAppraisals/self-neu', fields({ type: 'self_assessment', employeeId: 'tm-emil', status: 'draft' }))],
  ['Mitarbeiter-Link (anonym) liest die Kontenliste', false, () => call(t.anon, 'GET', 'registeredUsers')],
  ['Führungskraft ohne Einladung liest Gehaltsdaten', false, () => call(t.b, 'GET', 'salaryReviewData/current')],
  ['Eingeladene Führungskraft liest Gehaltsdaten', true, () => call(t.a, 'GET', 'salaryReviewData/current')],
  ['Führungskraft vergibt sich Gehalts-Zugriff', false, () => call(t.b, 'PATCH', 'salaryReviewAccess/fk_bernd_test_local', fields({ email: USERS.managerB.email, role: 'executive' }))],
  ['HR vergibt Gehalts-Zugriff', true, () => call(t.hr, 'PATCH', 'salaryReviewAccess/neu_test_local', fields({ email: 'neu@test.local', role: 'manager' }))],
  ['Führungskraft ändert den Namen einer anderen', false, () => call(t.b, 'PATCH', `registeredUsers/${ids.uidA}`, fields({ fullName: 'X' }), ['fullName'])],
  ['Führungskraft ändert den eigenen Namen', true, () => call(t.b, 'PATCH', `registeredUsers/${ids.uidB}`, fields({ fullName: 'Bernd T.' }), ['fullName'])],
  ['HR sperrt ein Konto', true, () => call(t.hr, 'PATCH', `registeredUsers/${ids.uidB}`, fields({ disabled: true, disabledAt: 'now', disabledBy: USERS.hr.email }), ['disabled', 'disabledAt', 'disabledBy'])],
  ['Gesperrte Person hebt die eigene Sperre auf', false, () => call(t.b, 'PATCH', `registeredUsers/${ids.uidB}`, fields({ disabled: false }), ['disabled'])],
  ['HR ändert die E-Mail eines Kontos (nicht vorgesehen)', false, () => call(t.hr, 'PATCH', `registeredUsers/${ids.uidA}`, fields({ email: 'x@y.z' }), ['email'])],
  ['Führungskraft schreibt Protokoll im eigenen Namen', true, () => call(t.a, 'POST', 'auditLog', fields({ at: 'now', byUid: ids.uidA, action: 'test' }))],
  ['Führungskraft schreibt Protokoll im fremden Namen', false, () => call(t.a, 'POST', 'auditLog', fields({ at: 'now', byUid: ids.uidB, action: 'test' }))],
  ['Führungskraft liest das Protokoll', false, () => call(t.a, 'GET', 'auditLog')],
  ['HR liest das Protokoll', true, () => call(t.hr, 'GET', 'auditLog')],
  ['Führungskraft legt im Papierkorb ab', true, () => call(t.a, 'PATCH', 'trash/t-test', fields({ kind: 'teamMember', status: 'pending', deletedByUid: ids.uidA }))],
  ['Führungskraft liest den Papierkorb', false, () => call(t.a, 'GET', 'trash')],
  ['HR liest den Papierkorb', true, () => call(t.hr, 'GET', 'trash')],
  ['HR stellt fremden Mitarbeiter wieder her', true, () => call(t.hr, 'PATCH', 'teamMembers/tm-wieder', fields({ name: 'Wieder Da', userId: ids.uidA }))],
  ['Führungskraft legt Mitarbeiter für fremde FK an', false, () => call(t.b, 'PATCH', 'teamMembers/tm-fremd', fields({ name: 'Fremd', userId: ids.uidA }))],
  // Geteilte Mitarbeiter (tm-frieda gehört Bernd, geteilt mit Anna; tm-clara gehört Anna, nicht geteilt)
  ['Eingeladene FK trägt bei geteiltem Mitarbeiter einen Termin ein', true, () => call(t.a, 'PATCH', 'teamMembers/tm-frieda', fields({ scheduledAt: '2026-12-01T09:00:00.000Z', scheduledSource: 'manual', scheduledByName: 'Anna Testleiterin' }), ['scheduledAt', 'scheduledSource', 'scheduledByName'])],
  ['Eingeladene FK markiert bei geteiltem Mitarbeiter das Gespräch als geführt', true, () => call(t.a, 'PATCH', 'teamMembers/tm-frieda', fields({ meetingDone: true, meetingDoneByName: 'Anna Testleiterin' }), ['meetingDone', 'meetingDoneByName'])],
  ['Eingeladene FK trägt einen Termin unter fremdem Namen ein', false, () => call(t.a, 'PATCH', 'teamMembers/tm-frieda', fields({ scheduledAt: '2026-12-02T09:00:00.000Z', scheduledByName: 'Bernd Testmann' }), ['scheduledAt', 'scheduledByName'])],
  ['Besitzer trägt einen Termin unter fremdem Namen ein', false, () => call(t.b, 'PATCH', 'teamMembers/tm-frieda', fields({ scheduledAt: '2026-12-03T09:00:00.000Z', scheduledByName: 'Anna Testleiterin' }), ['scheduledAt', 'scheduledByName'])],
  ['Besitzer ändert das Datum und lässt den fremden Vermerk stehen', false, () => call(t.b, 'PATCH', 'teamMembers/tm-frieda', fields({ scheduledAt: '2026-12-04T09:00:00.000Z' }), ['scheduledAt'])],
  ['Besitzer trägt einen Termin unter eigenem Namen ein', true, () => call(t.b, 'PATCH', 'teamMembers/tm-frieda', fields({ scheduledAt: '2026-12-05T09:00:00.000Z', scheduledByName: 'Bernd Testmann' }), ['scheduledAt', 'scheduledByName'])],
  ['Eingeladene FK ändert bei geteiltem Mitarbeiter den Namen', false, () => call(t.a, 'PATCH', 'teamMembers/tm-frieda', fields({ name: 'Umbenannt' }), ['name'])],
  ['Eingeladene FK macht sich bei geteiltem Mitarbeiter zum Besitzer', false, () => call(t.a, 'PATCH', 'teamMembers/tm-frieda', fields({ userId: ids.uidA }), ['userId'])],
  ['Fremde FK übernimmt einen nicht geteilten Mitarbeiter (trägt sich als Besitzer ein)', false, () => call(t.b, 'PATCH', 'teamMembers/tm-clara', fields({ userId: ids.uidB }), ['userId'])],
  ['Mitarbeiter-Link (anonym) übernimmt einen Mitarbeiter', false, () => call(t.anon, 'PATCH', 'teamMembers/tm-clara', fields({ userId: 'anon' }), ['userId'])],
  ['Besitzer ändert den eigenen Mitarbeiter', true, () => call(t.a, 'PATCH', 'teamMembers/tm-clara', fields({ position: 'Sachbearbeiterin Einkauf' }), ['position'])],
  ['Fremde FK trägt bei nicht geteiltem Mitarbeiter einen Termin ein', false, () => call(t.b, 'PATCH', 'teamMembers/tm-clara', fields({ scheduledAt: '2026-12-01T09:00:00.000Z', scheduledByName: 'Bernd Testmann' }), ['scheduledAt', 'scheduledByName'])],
  // Bleibt bis Stufe 2 offen (bewusst, sonst funktioniert die heutige App nicht):
  ['(Stufe 2) Mitarbeiter-Link (anonym) liest alle Beurteilungen', true, () => call(t.anon, 'GET', 'teamAppraisals')],
];

let failed = 0;
console.log(`\nRegeln: ${which}\n`);
for (const [label, expected, run] of checks) {
  const allowed = await run();
  const ok = allowed === expected;
  if (!ok) failed++;
  console.log(`${allowed ? 'erlaubt ' : 'verboten'}  ${which === 'vorschlag' ? (ok ? '✓' : '✗ ERWARTET ' + (expected ? 'erlaubt' : 'verboten')) : (ok ? '  ' : '!!')}  ${label}`);
}
if (which === 'vorschlag') {
  console.log(failed ? `\n${failed} Erwartung(en) verfehlt.` : '\nAlle Erwartungen erfüllt.');
  process.exit(failed ? 1 : 0);
} else {
  console.log(`\n${failed} Abweichung(en) vom Vorschlag (!!). Das sind die Lücken bzw. fehlenden Freigaben der aktuellen Regeln.`);
}
