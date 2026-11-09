// Synthetische Testdaten für den Firebase-Emulator. Enthält KEINE echten Daten.
// Struktur (Collections, Felder, Verknüpfungen) entspricht docs/PROTECTED.md.

export const PROJECT = 'performance-manager-b0967'; // so heißt das Projekt in index.html; Daten landen NUR im Emulator
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099';

export const USERS = {
  managerA: { email: 'fk.anna@test.local', password: 'Test-1234', name: 'Anna Testleiterin' },
  managerB: { email: 'fk.bernd@test.local', password: 'Test-1234', name: 'Bernd Testmann' },
  hr: { email: 'd.andrisani@niederwiesergroup.com', password: 'Test-1234', name: 'HR Test' }, // = HR_ADMIN_EMAILS
};

export const ACCESS_CODE = 'TESTCODE-0001';
// Laufendes Beurteilungsjahr (Zyklus Jul–Jun, wie in der App): Die Team-Übersicht zeigt es standardmäßig.
// PREV_YEAR prüft den Jahreswechsel, NEXT_YEAR die Zielvereinbarung für das Folgejahr.
const _now = new Date();
export const YEAR = String(_now.getMonth() < 6 ? _now.getFullYear() - 1 : _now.getFullYear());
export const PREV_YEAR = String(Number(YEAR) - 1);
export const NEXT_YEAR = String(Number(YEAR) + 1);

const iso = (d) => new Date(d).toISOString();

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
}

async function http(method, url, body, headers = {}) {
  const res = await fetch(url, {
    method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export async function resetEmulators() {
  await http('DELETE', `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`);
  const cfg = await http('GET', `${AUTH}/emulator/v1/projects/demo-nw-test/config`).catch(() => null);
  for (const p of ['demo-nw-test', PROJECT]) await http('DELETE', `${AUTH}/emulator/v1/projects/${p}/accounts`).catch(() => {});
  return cfg;
}

async function createUser({ email, password, name }) {
  const r = await http('POST', `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    { email, password, displayName: name, returnSecureToken: true }, { Authorization: '' });
  return r.localId;
}

export async function setDoc(path, data) {
  const [coll, id] = path.split('/');
  return http('PATCH', `${FS}/${coll}/${id}`, { fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) });
}

export async function getDoc(path) {
  const res = await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer owner' } });
  if (res.status === 404) return null;
  return res.json();
}

export async function listDocs(coll) {
  const out = [];
  let tok = '';
  do {
    const r = await http('GET', `${FS}/${coll}?pageSize=300${tok ? '&pageToken=' + tok : ''}`);
    out.push(...(r.documents || []));
    tok = r.nextPageToken || '';
  } while (tok);
  return out;
}

const CORE = { fach: 4, komm: 3, prob: 4, adapt: 3, orga: 5 };
const LEAD = { lead: 4, strat: 3, decide: 4, exec: 3, stake: 4 };

export async function seed() {
  await resetEmulators();
  const uidA = await createUser(USERS.managerA);
  const uidB = await createUser(USERS.managerB);
  const uidHR = await createUser(USERS.hr);

  for (const [uid, u] of [[uidA, USERS.managerA], [uidB, USERS.managerB], [uidHR, USERS.hr]]) {
    await setDoc(`registeredUsers/${uid}`, { email: u.email, uid, fullName: u.name, createdAt: iso('2025-01-10') });
  }

  const member = (id, owner, ownerEmail, name, position, extra = {}) => setDoc(`teamMembers/${id}`, {
    name, position, department: '', email: `${id}@test.local`, userId: owner, ownerEmail,
    accessCode: `CODE-${id}`, createdAt: iso('2025-02-01'), invitedAt: null, lastReminderAt: null, ...extra,
  });
  await member('tm-clara', uidA, USERS.managerA.email, 'Clara Beispiel', 'Sachbearbeiterin Einkauf',
    { accessCode: ACCESS_CODE, meetingDone: true, meetingDoneAt: iso(`${YEAR}-11-20`), scheduledAt: iso(`${YEAR}-11-20`), scheduledSource: 'form' });
  await member('tm-david', uidA, USERS.managerA.email, 'David Muster', 'Teamleiter Produktion', { goalMeetingDone: false, goalMeetingDoneAt: null });
  await member('tm-emil', uidA, USERS.managerA.email, 'Emil Probe', 'Techniker');
  await member('tm-frieda', uidB, USERS.managerB.email, 'Frieda Geteilt', 'Controllerin', { sharedWith: [USERS.managerA.email] });

  const base = (id, emp, owner, type, status, extra) => setDoc(`teamAppraisals/${id}`, {
    id, type, status, period: YEAR, employeeId: emp.id, employeeName: emp.name, employeePosition: emp.position,
    position: emp.position, userId: owner, managerId: owner, managerName: 'Testleitung', createdAt: iso(`${YEAR}-11-01`),
    updatedAt: iso(`${YEAR}-11-15`), ...extra,
  });
  const clara = { id: 'tm-clara', name: 'Clara Beispiel', position: 'Sachbearbeiterin Einkauf' };
  const david = { id: 'tm-david', name: 'David Muster', position: 'Teamleiter Produktion' };
  const frieda = { id: 'tm-frieda', name: 'Frieda Geteilt', position: 'Controllerin' };

  await base('ap-clara-review', clara, uidA, 'review', 'completed', {
    isManager: false, includeLeadership: false, noGoalsMode: false,
    goals: [{ id: 1, name: 'Lieferantenbasis erweitern', weight: 60, achievement: 110 }, { id: 2, name: 'Durchlaufzeit senken', weight: 40, achievement: 90 }],
    coreScores: CORE, coreComments: { fach: 'Sehr sicher', komm: '', prob: '', adapt: '', orga: 'Vorbildlich' },
    wasScore: 102, wieCoreScore: 3.8, gpsScore: 3.9, finalGPS: 3.9,
    formData: { employee: clara.name, position: clara.position, manager: 'Anna Testleiterin', date: '2025-11-20', plannedBonus: '',
      strengths1: 'Verhandlungsgeschick', strengths2: 'Zuverlässigkeit', careerComment: '', feedbackQ1: '', feedbackQ7: 4 },
    devPlan: [{ id: 1, measure: 'Schulung SAP MM', responsible: 'HR', deadline: '2026-03-31' }], careerChecks: [false, false, false],
    versionHistory: [],
  });
  await base('ap-clara-self', clara, uidA, 'self_assessment', 'completed', {
    isSelfAssessment: true, selfCoreScores: CORE, selfCoreComments: { fach: 'Ich kenne mich gut aus' }, selfLeaderScores: null,
    selfLeaderComments: null, pendingForEmail: null, pendingStatus: null, submittedAt: iso(`${YEAR}-11-10`),
  });
  await base('ap-david-draft', david, uidA, 'review', 'draft', {
    isManager: true, includeLeadership: true, noGoalsMode: false, isAutoSave: true,
    goals: [{ id: 1, name: 'Ausschuss reduzieren', weight: 100, achievement: 0 }],
    coreScores: {}, leaderScores: {}, wasScore: 0, wieCoreScore: 0, gpsScore: 0,
    formData: { employee: david.name, position: david.position, manager: 'Anna Testleiterin', date: '2025-11-25' }, versionHistory: [],
  });
  await base('ap-david-goals', david, uidA, 'goals', 'completed', {
    goals: [{ id: 1, name: 'OEE auf 85 %', weight: 50, achievement: 0 }, { id: 2, name: 'Team-Schulungen', weight: 50, achievement: 0 }],
    devGoals: [{ id: 1, name: 'Führung', category: 'leadership', target: 'Führungstraining', deadline: '2026-06-30' }],
  });
  // Emil: Zielvereinbarung im laufenden Jahr, noch keine Beurteilung (Ziel-Übernahme)
  const emil = { id: 'tm-emil', name: 'Emil Probe', position: 'Techniker' };
  await base('ap-emil-goals', emil, uidA, 'goals', 'completed', {
    goals: [{ id: 1, name: 'Wartungsquote 95 %', weight: 70, target: '95 %', type: 'performance' }, { id: 2, name: 'Dokumentation digitalisieren', weight: 30, target: 'bis Q3', type: 'performance' }],
    devGoals: [],
  });
  // Emil: Ziele für das Folgejahr bereits vereinbart (Spalte „Zielvereinbarung NEXT_YEAR“)
  await base('ap-emil-goals-next', emil, uidA, 'goals', 'completed', {
    period: NEXT_YEAR, goals: [{ id: 1, name: 'Neue Anlage einfahren', weight: 50, target: 'Q2', type: 'performance' }, { id: 2, name: 'Azubi betreuen', weight: 50, target: 'laufend', type: 'performance' }],
    devGoals: [],
  });
  // David: Vorjahres-Beurteilung, im Januar des laufenden Jahres geführt und deshalb mit period = YEAR gespeichert
  // (so in den Echtdaten gefunden: früher wurde das Kalenderjahr eingetragen). Muss unter PREV_YEAR erscheinen.
  await base('ap-david-review-legacy', david, uidA, 'review', 'completed', {
    period: YEAR, isManager: true, includeLeadership: true, noGoalsMode: false,
    goals: [{ id: 1, name: 'Linie 3 stabilisieren', weight: 100, achievement: 100 }],
    coreScores: CORE, leaderScores: LEAD, wasScore: 100, wieCoreScore: 3.6, gpsScore: 3.4, finalGPS: 3.4,
    createdAt: iso(`${YEAR}-01-20`), updatedAt: iso(`${YEAR}-01-22`),
    formData: { employee: david.name, position: david.position, manager: 'Anna Testleiterin', date: `${YEAR}-01-20` }, versionHistory: [],
  });
  // Clara: Beurteilung aus dem Vorjahr (darf im laufenden Jahr nicht als „abgeschlossen“ zählen)
  await base('ap-clara-review-prev', clara, uidA, 'review', 'completed', {
    period: PREV_YEAR, isManager: false, includeLeadership: false, noGoalsMode: false,
    goals: [{ id: 1, name: 'Rahmenverträge neu verhandeln', weight: 100, achievement: 95 }],
    coreScores: CORE, wasScore: 95, wieCoreScore: 3.4, gpsScore: 3.2, finalGPS: 3.2,
    createdAt: iso(`${PREV_YEAR}-11-01`), updatedAt: iso(`${PREV_YEAR}-11-20`),
    formData: { employee: clara.name, position: clara.position, manager: 'Anna Testleiterin', date: `${PREV_YEAR}-11-20` }, versionHistory: [],
  });
  await base('ap-frieda-review', frieda, uidB, 'review', 'completed', {
    isManager: false, includeLeadership: false, goals: [{ id: 1, name: 'Monatsabschluss in 3 Tagen', weight: 100, achievement: 100 }],
    coreScores: CORE, leaderScores: LEAD, wasScore: 100, wieCoreScore: 3.8, gpsScore: 3.8, finalGPS: 3.8,
    formData: { employee: frieda.name, position: frieda.position, manager: 'Bernd Testmann', date: '2025-11-18' }, versionHistory: [],
  });

  await setDoc('salaryReviewData/current', {
    budget: 10000, lastModifiedAt: iso('2025-12-01'), lastModifiedBy: USERS.hr.email,
    employees: [{ id: 1, name: 'Clara Beispiel', position: 'Sachbearbeiterin Einkauf', baseSalary: 42000, currentBonus: 1000, newBonus: 1200, increasePercent: 3, gpsScore: 3.9 }],
  });
  await setDoc('salaryReviewAccess/acc-anna', {
    email: USERS.managerA.email, role: 'manager', accessSalary: false, accessGoals: true, teamMemberIds: ['tm-clara', 'tm-david'],
    grantedAt: iso('2025-12-01'), grantedBy: USERS.hr.email,
  });

  return { uidA, uidB, uidHR };
}
