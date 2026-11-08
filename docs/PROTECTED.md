# Schutzbereich – darf beim Redesign NICHT verändert werden

Stand: 2026-11-08, App v93 (`index.html`, Commit `02607b8`).

Diese Liste beschreibt alles, was beim Umbau auf das n.Org-Designsystem unverändert bleiben muss.
**Würde eine Designänderung einen Eingriff in einen dieser Punkte verlangen: STOPP, dem Auftraggeber erklären
und auf seine Entscheidung warten.**

## Wie geprüft wird

Die gesamte App steckt in **einer** Datei (`index.html`, ca. 28 500 Zeilen, React 18 ohne Build-Schritt).
Ein Datei-Diff „Schutzbereich leer“ ist daher nicht möglich, ohne das Redesign selbst zu verbieten.
Stattdessen gilt:

| Prüfung | Befehl | Muss |
|---|---|---|
| Geschützte Code-Stellen unverändert | `node tests/protected/fingerprint.mjs` | „Schutzbereich unverändert“ |
| Geschützte Dateien unverändert | `git diff --stat main -- tests/protected/baseline.txt` | leer |
| Kritische Abläufe funktionieren | `cd tests && npm test` | alle grün |

`fingerprint.mjs` zieht aus `index.html` jeden Datenbank-, Storage- und Auth-Zugriff (als ganzes Statement),
alle Browser-Speicher-Schlüssel, URL-Parameter, die Firebase-Konfiguration, die CSP, alle externen Skript-Versionen
und die vollständigen Körper der Berechnungs- und Datenfunktionen heraus und vergleicht sie mit
`tests/protected/baseline.txt`. Verschieben von Code ist erlaubt, Ändern nicht.
Die Baseline darf **nur nach ausdrücklicher Freigabe** mit `--update` neu geschrieben werden.

---

## 1. Dateien

| Datei | Schutz |
|---|---|
| `index.html` | Nur Darstellungsschicht darf geändert werden. Geschützte Stellen siehe Abschnitte 2–8. |
| `tests/protected/baseline.txt` | Nicht ändern ohne Freigabe. |
| `backups/` | Nicht ändern, nicht löschen. |
| `NOTFALL-BACKUP.md` | Nur ergänzen. |

Es gibt in diesem Repository **keinen** Server-Code, keine Firestore-/Storage-Sicherheitsregeln und keine
Hosting-Konfiguration. Diese liegen in der Firebase-Konsole und werden nicht angefasst.

## 2. Backend und Konfiguration (Firebase)

- Projekt `performance-manager-b0967`, Konfiguration `firebaseConfig` (apiKey, authDomain, projectId,
  storageBucket `performance-manager-b0967.firebasestorage.app`, messagingSenderId, appId, measurementId).
- Firebase JS SDK **10.7.1 compat** (`firebase-app/auth/firestore/storage-compat.js` von gstatic).
- Initialisierung: `firebase.initializeApp` → globale `auth`, `db`, `storage`; `window.db`.
- Content-Security-Policy im `<meta>`-Tag (Sicherheitskonfiguration). Muss sie für das Design geändert werden
  (z. B. Schrift von Google Fonts), vorher fragen. Alternative ohne CSP-Änderung: Schrift selbst ausliefern
  (`font-src 'self' data:` ist erlaubt).
- Externe Bibliotheken und Versionen: Tailwind Play CDN 3.4.17, html2pdf.js 0.10.1, React/ReactDOM 18.2.0
  und lucide-react 0.292.0 über esm.sh. Nicht aktualisieren oder entfernen ohne Rückfrage.

## 3. Anmeldung, Rollen und Rechte

| Teil | Wo (Stand v93) |
|---|---|
| E-Mail/Passwort-Login und Registrierung | `LoginView` → `handleSubmit` (`auth.signInWithEmailAndPassword`, `auth.createUserWithEmailAndPassword`, `updateProfile({displayName})`, Nachtragen in `registeredUsers`, Namens-Abfrage per `prompt`) |
| Sitzung | `auth.onAuthStateChanged` in `PerformanceApp` (setzt `user`, startet Migration, prüft wartende Selbstreflexionen) |
| Gast-Zugang per Link | URL `?accessCode=<code>` → `checkAccessCode` → bei Bedarf `auth.signInAnonymously()` → `teamMembers.where('accessCode','==',code)` → Gast-Modus `guestWelcome`/`guestForm` |
| Anonyme Anmeldung beim Speichern der Selbstreflexion | `auth.signInAnonymously()` im Gast-Formular (Auto-Save und Absenden) |
| Abmelden | `auth.signOut()` |
| HR-Admin | `HR_ADMIN_EMAILS = ['d.andrisani@niederwiesergroup.com']`, `isUserHRAdmin(email)` → `isHRAdmin` (sieht alle Daten, HR-Dashboard, Backup/Restore, Reparaturen) |
| Führungskraft | Sieht `teamMembers` mit `userId == uid` und mit `sharedWith array-contains <eigene E-Mail>`, plus zugehörige `teamAppraisals` |
| Gehaltsrunde | `salaryReviewAccess` (Rollen `executive`, `manager`; Flags `accessSalary`, `accessGoals`, `teamMemberIds`) |
| Anzeigename | `getUserDisplayName(user)`: displayName → aus E-Mail formatiert → „Manager“ |

Firebase Authentication enthält 143 Konten (Stand Backup), davon 31 mit E-Mail/Passwort; der Rest sind
anonyme Gast-Konten. Auth-Provider, Redirect-Verhalten und Session-Logik bleiben unverändert.

## 4. Datenmodell (Firestore)

Verknüpfungen, die über das Wiederfinden der Daten entscheiden:

- `teamMembers.userId` = Firebase-UID der Führungskraft (Besitzer).
- `teamMembers.sharedWith[]` = E-Mails, mit denen ein Mitarbeiter geteilt ist.
- `teamMembers.accessCode` = Code im Gast-Link.
- `teamAppraisals.employeeId` = Dokument-ID in `teamMembers`.
- `teamAppraisals.userId` / `managerId` = UID der Führungskraft.
- `teamAppraisals.pendingForEmail` + `pendingStatus` (`pending_claim` → `claimed`) = Selbstreflexion wartet auf Zuordnung.
- `registeredUsers/<uid>`.

Collections, Feldnamen und Typen (abgeleitet aus dem Datenbestand, **nur Struktur, keine Inhalte**):

### `teamMembers`
`accessCode` string · `createdAt` string(ISO) · `department` string · `email` string · `goalMeetingDone` bool ·
`goalMeetingDoneAt` string|null · `invitedAt` string|null · `lastReminderAt` null · `meetingCompleted` bool ·
`meetingCompletedAt` null · `meetingDone` bool · `meetingDoneAt` string · `migratedAt` string ·
`migratedFromLocal` bool · `name` string · `ownerEmail` string · `position` string · `scheduledAt` string ·
`scheduledSource` (`form`|`manual`) · `sharedWith` array<string> · `userId` string

### `teamAppraisals`
- Typ `type`: `review`, `goals`, `goals_pdf`, `self`, `self_assessment`, `self_assessment_standalone`, `self_pdf`
- Status `status`: `draft`, `completed`, `pdf_uploaded`
- Felder: `careerChecks` array · `claimedAt`, `claimedByEmail` string · `coreComments` map · `coreList` array ·
  `coreScores` map (`fach`,`komm`,`prob`,`adapt`,`orga`; in Altdaten auch zufällige numerische Schlüssel) ·
  `createdAt` string · `createdByEmail` string · `createdByUid` string|null · `department` string ·
  `devGoals`, `devPlan` array · `employeeEmail`, `employeeId`, `employeeName`, `employeePosition` string ·
  `finalGPS`, `gpsScore`, `wasScore`, `wieCoreScore` number · `wieLeadScore` number|null · `wieLeaderScore` number ·
  `formData` map (`careerComment`, `date`, `development1/2`, `employee`, `feedbackManager`, `feedbackQ1`…`feedbackQ7`,
  `manager`, `managerEmail`, `plannedBonus`, `position`, `strengths1/2`, `wishesNextYear`) ·
  `goals` array · `id` string · `importedAt` string · `includeLeadership`, `isAutoSave`, `isManager`, `isPdfUpload`,
  `isSelfAssessment`, `isStandalone`, `noGoalsMode`, `migratedFromLocal` bool · `lastEditedAt`, `lastEditedBy` string ·
  `leadList` array · `leaderComments` map · `leaderScores` map (`lead`,`strat`,`decide`,`exec`,`stake`) ·
  `managerId`, `managerName` string · `originalTimestamp` string · `pdfFileName`, `pdfUrl` string · `pdfSize` int ·
  `pendingForEmail`, `pendingStatus` string|null · `period` string · `position` string ·
  `selfCoreComments`, `selfCoreScores` map · `selfLeaderComments`, `selfLeaderScores` map|null ·
  `storageMethod` (`firebase_storage`|`base64_firestore`) · `storagePath` string|null · `submittedAt` string ·
  `totalBonus`, `totalPayout` int · `updatedAt`, `uploadedAt`, `uploadedBy` string · `userId` string ·
  `versionHistory` array · `accessCodeUsed` null
- Reparatur-Markierungen: `_repairedAt`, `_repairedBy`, `_repairedManagerIdFrom`, `_repairedUserIdFrom`,
  `_autoRepairedAt`, `_autoRepairedBy`, `_autoRepairedUserIdFrom`

### `registeredUsers/<uid>`
`email`, `uid`, `createdAt`, `fullName`, `fullNameUpdatedAt` string

### `salaryReviewData/current`
`budget` int · `employees` array · `lastModifiedAt`, `lastModifiedBy` string

### `salaryReviewAccess`
`email`, `grantedAt`, `grantedBy`, `role` string · `accessGoals`, `accessSalary` bool · `teamMemberIds` array

### `salaryReviewHistory`
`id`, `employeeName`, `field`, `changedAt`, `changedBy` string · `employeeId`, `oldValue`, `newValue` int

### `appraisals` (Altbestand)
Wird im HR-Bereich gelesen, exportiert (`legacy_appraisals_backup_*.json`) und bearbeitet. Aktuell leer.

### `mail`
Wird von der aktuellen App nicht beschrieben (vermutlich Firebase-Erweiterung „Trigger Email“ bzw. ältere Version).
Felder: `to`, `type` (`invitation`|`reminder`), `managerEmail`, `managerId`, `employeeName`, `createdAt`,
`message.subject`, `message.html`. Nicht anfassen.

### Firebase Storage
`pdfs/<uid>/<typ>_pdf_<id>_<jahr>_<zeitstempel>.pdf` – verknüpft über `teamAppraisals.storagePath` / `pdfUrl`.

## 5. Browser-Speicher (localStorage)

Keine Cookies und kein sessionStorage in Gebrauch (sessionStorage wird nur im Debug-Panel gezählt).

| Schlüssel | Zweck |
|---|---|
| `nw_current_employee` | Kontext der gerade geöffneten Beurteilung/Zielvereinbarung (auch React-`key` der Formulare) |
| `nw_view_self_assessment` | Selbstreflexion zur Ansicht (auch neuer Tab) |
| `nw_return_to_appraisal` | Rücksprung in die Beurteilung |
| `nw_hr_edit_appraisal_id` | HR bearbeitet Beurteilung |
| `nw_draft_<id>` | Entwürfe (`DraftManager`, Ablauf 24 h) |
| `nw_migrated_<uid>` | Migration lokal → Firestore erledigt |
| `nw_salary_review_welcome_seen_<email>` | Willkommensdialog Gehaltsrunde gesehen |
| `nw_team_members`, `nw_team_appraisals` | Altdaten vor der Cloud-Migration (gelesen, nach Migration gelöscht) |
| `nw_team_members_backup`, `nw_team_appraisals_backup`, `nw_team_appraisals_cache` | Sicherungs-/Cache-Kopien |
| `goalsDash_<filter>` | Filter im Ziele-Dashboard |

## 6. URLs und Routen

Die App ist eine einzelne Seite (`index.html`), Navigation intern über den Zustand `activeView`
(nicht in der URL). Geschützt sind daher Dateiname/Pfad und diese Parameter:

| URL | Wirkung |
|---|---|
| `…/index.html` bzw. `…/` | Startseite |
| `?accessCode=<code>` | Gast-Link zur Selbstreflexion (wird per E-Mail/Kopieren verschickt: `origin + pathname + '?accessCode=' + code`) |
| `?view=competencies` | öffnet Kompetenz-Liste |
| `?view=viewSelfAssessment` | öffnet Selbstreflexions-Ansicht (neuer Tab) |
| `?import_self=<base64(JSON)>` | Import einer Selbstreflexion per Link |

Hinweis: Pull Request #1 (`donatoandrisani9590-oss-patch-1`) benennt `index.html` in `Index.html` um.
Das würde auf Servern mit Groß-/Kleinschreibung bestehende Links und Lesezeichen brechen.

Interne Ansichten (`activeView`), die alle erhalten bleiben müssen: `dashboard`, `list`, `detail`, `guide`,
`gpsexplainer`, `formular`, `zielvereinbarung`, `teamoverview`, `teamcalibration`, `goalsdashboard`,
`hrdashboard`, `salaryreview`, `mySelfReflection`, `viewSelfAssessment`, `guestWelcome`, `guestForm`.

## 7. Import-/Export-Formate

| Format | Wo |
|---|---|
| Voll-Backup JSON `niederwieser_backup_<datum>_<ts>.json` (`exportedAt`, `exportedBy`, `version`, `data{teamAppraisals,teamMembers,salaryReviewData,salaryReviewAccess}`) | `exportFullBackup`, Wiederherstellung `restoreAppraisalFromBackup` + Restore-Modal |
| Alt-Beurteilungen JSON `legacy_appraisals_backup_<datum>.json` | HR-Bereich |
| Versions-Export JSON `version_<name>_<datum>.json` | Versionsverlauf (Team und HR) |
| CSV `HR_Dashboard_Export_<datum>.csv` | HR-Dashboard |
| PDF-Erzeugung über html2pdf (`PrintLayout` und Formular-PDFs) | Inhalt und Datenfelder unverändert; das Aussehen der PDFs gehört zur Darstellung, Änderungen daran vorher zeigen |
| PDF-Upload (Firebase Storage bzw. base64 in Firestore) | `storageMethod`, `storagePath`, `pdfUrl` |
| Selbstreflexions-Import per Link `?import_self=` | siehe Abschnitt 6 |

## 8. Geschäftslogik, Berechnungen, Validierungen

Vollständig geschützt (Funktionskörper werden von `fingerprint.mjs` verglichen):
`calculateGPSConfidence`, `getBarsScore` (2×), `validateSMART`, `calculateWASForSave`, `calculateWIEForSave`,
`calculateWAS` (2×), `calculateWIE` (2×), `calculateGaps`, `getSelfScore` (2×), `calcAvg` (2×), `calcGPS`,
`calculateCompaRatio`, `calculateGPSForAppraisal`, `calculateIncrease`, `convertWAStoBARS`, `calculateStdDev`,
`calculateWieAverage`, `calculateWasScore`, `migrateLocalDataToFirebase`, `repairManagerIds` (inkl. Auto-Reparatur),
`exportFullBackup`, `restoreAppraisalFromBackup`, `checkAccessCode`, `safeLocalStorage`, `DraftManager`,
`getUserDisplayName`, `LoginView.handleSubmit`.

Außerdem geschützt, auch wenn nicht als eigene Funktion benannt:
- jede Speicher-, Lade-, Lösch- und Teilen-Logik (Handler mit `db.collection(...)`, Auto-Save-Intervalle, Duplikat-Prüfungen),
- Pflichtfeld- und Plausibilitätsprüfungen in Formularen (z. B. Namenspflicht bei Registrierung, Passwort-Bestätigung),
- Texte und Übersetzungen (DE/IT/EN) dürfen neu angeordnet, aber nicht inhaltlich weggelassen werden.

## 9. Bestehende Funktionen

Nichts entfernen, nichts stillschweigend weglassen. Das betrifft auch versteckte und selten genutzte Funktionen:
Debug-Panel (🔧), Hilfe-Chat, Migration lokaler Altdaten, Reparatur-Werkzeuge für HR, Versionsverlauf,
Teilen per E-Mail, Termin planen, Erinnerungen, Sprache DE/IT/EN, PDF-Export und -Upload.
