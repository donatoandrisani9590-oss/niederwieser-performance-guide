# Konzept: Rollen, Freigaben und Mitarbeiterbereich

Stand: 23.11.2026 · Branch `feature/rollen-und-freigaben` · Status: **freigegeben (Phasen 0–3), in Umsetzung**

Dieses Konzept beschreibt, wie sich der Performance Manager von einem Werkzeug für Führungskräfte zu einer
App mit drei sauber getrennten Rollen entwickelt: **Mitarbeiter**, **Führungskraft** und **HR-Admin**.
Es berührt den Schutzbereich (Anmeldung, Rollen und Rechte, Datenmodell, Sicherheitsregeln). Deshalb wird
erst nach deiner Freigabe umgesetzt.

---

## 1. Ziel in einem Satz

Jede Person sieht nach der Anmeldung genau das, was sie betrifft, und kann ohne Erklärung das tun, was ihre
Rolle verlangt. Ein Ergebnis wird für den Mitarbeiter erst sichtbar, wenn die Führungskraft es aktiv teilt.

## 2. Die drei Rollen

| | Mitarbeiter | Führungskraft | HR-Admin |
|---|---|---|---|
| Eigene Selbstreflexion ausfüllen, abschicken | ✓ | ✓ (eigene) | ✓ (eigene) |
| Eigene Selbstreflexion später lesen und als PDF laden | ✓ | ✓ | ✓ |
| Geteilte Beurteilung und Zielvereinbarung lesen (nur lesen) | ✓ | – | – |
| Kenntnisnahme bestätigen („Gelesen und besprochen“) | ✓ | – | – |
| Team verwalten, beurteilen, Ziele vereinbaren | – | ✓ (eigenes Team) | ✓ (alle) |
| Ergebnis mit dem Mitarbeiter teilen oder das Teilen zurücknehmen | – | ✓ | ✓ |
| Alle Daten sehen, bearbeiten, exportieren | – | – | ✓ |
| Benutzer verwalten (Rolle, sperren, Passwort-Reset, löschen) | – | – | ✓ |
| Protokoll aller Änderungen einsehen | – | – | ✓ |

Die bestehenden Zusatzrechte für Salary Review und Ziel-Dashboard (`salaryReviewAccess`, Rollen
`manager`/`executive`) bleiben unverändert und gelten zusätzlich.

## 3. Ist-Zustand und Befunde

1. **HR-Admin** ist fest im Code hinterlegt (`HR_ADMIN_EMAILS`). Es gibt keine Rollenverwaltung.
2. **Führungskraft** ist jeder angemeldete Nutzer. Was er sieht, ergibt sich aus `teamMembers.userId` und `sharedWith`.
3. **Mitarbeiter** haben kein Konto. Sie öffnen einen Link `?accessCode=…` und werden anonym angemeldet.
   Die App sucht dann per Abfrage in `teamMembers` nach dem Code.
4. **Sicherheitsregeln (Firestore Rules)** liegen nur in der Firebase-Konsole, nicht im Code, und sind
   nicht getestet. Weil anonyme Nutzer `teamMembers` abfragen können müssen, sind die heutigen Regeln
   vermutlich großzügig. **Bevor wir Beurteilungen mit Mitarbeitern teilen, müssen die Regeln stimmen.**
   Sonst könnte ein anonymer Nutzer mehr lesen als gewollt.
5. **Kein Server-Code.** Konten löschen oder Rollen fälschungssicher im Anmelde-Token hinterlegen geht nur
   über Cloud Functions. Die brauchen den Blaze-Tarif, und die Abrechnung ist derzeit geschlossen.
6. **14 Selbstreflexionen 2025 nie abgeschickt.** Der Abschicken-Knopf war schwer zu finden; das ist in
   PR #4 behoben. Mit dem Mitarbeiterbereich sieht jeder Mitarbeiter künftig selbst, ob seine
   Selbstreflexion abgeschickt ist.

## 4. Zielarchitektur

### 4.1 Identität und Anmeldung

- **Mitarbeiter-Konto** über die vorhandene Firebase-Anmeldung, gebunden an die E-Mail in `teamMembers.email`.
  Empfohlen ist die **Anmeldung per E-Mail-Link** (passwortlos): Der Mitarbeiter gibt seine E-Mail ein und
  bekommt einen Anmeldelink. Es gibt kein Passwort, das vergessen werden kann. Bei Bedarf geht später auch
  Microsoft-Login (SSO).
- **Der bestehende Selbstreflexions-Link bleibt** und funktioniert weiter. Wer sich zusätzlich anmeldet,
  sieht in „Mein Bereich“ alle eigenen Unterlagen.
- **Rollen** stehen als optionales Feld `role` in `registeredUsers/{uid}` (`employee` | `manager` | `hr_admin`).
  Ohne Feld gilt das heutige Verhalten: `HR_ADMIN_EMAILS` ist HR, jeder andere angemeldete Nutzer ist
  Führungskraft. Ein Konto, dessen E-Mail in `teamMembers` steht und das kein eigenes Team hat, gilt als
  Mitarbeiter.
- **Später (mit Blaze-Tarif):** Die Rollen werden per Cloud Function als Custom Claims ins Anmelde-Token
  geschrieben. Dann prüfen die Sicherheitsregeln die Rolle, ohne ein Dokument zu lesen.

### 4.2 Datenmodell (nur neue, optionale Felder)

Bestehende Felder werden weder umbenannt noch gelöscht. Alte Daten laden unverändert.

| Sammlung | Neues Feld | Bedeutung |
|---|---|---|
| `teamAppraisals` (Beurteilung, Zielvereinbarung) | `sharedWithEmployee` (bool) | für den Mitarbeiter sichtbar, nur nach aktivem Teilen |
| | `sharedWithEmployeeAt`, `sharedWithEmployeeBy` | wann und von wem geteilt |
| | `employeeAcknowledgedAt` | Mitarbeiter hat bestätigt, es gelesen zu haben |
| | `employeeEmail` | wird beim Teilen aus `teamMembers.email` gesetzt (für die Regeln) |
| `registeredUsers` | `role`, `disabled`, `disabledAt`, `disabledBy` | Rolle; gesperrtes Konto |
| `auditLog` (neu) | `{ at, by, action, target, details }` | Protokoll: geteilt, zurückgenommen, Rolle geändert, gesperrt, gelöscht |

Beim Teilen wird ein **Schnappschuss** gespeichert (`sharedSnapshot`). Der Mitarbeiter sieht genau die
geteilte Fassung, auch wenn die Führungskraft danach noch etwas ändert. Ein erneutes Teilen ersetzt den
Schnappschuss.

### 4.3 Sicherheitsregeln (neu im Repository, mit Tests)

Die Regeln kommen als `firestore.rules` ins Repository und werden im Emulator automatisch getestet. Danach
werden sie in der Firebase-Konsole eingespielt. Grundsätze:

- **Mitarbeiter** liest eigene Selbstreflexionen. Beurteilungen und Zielvereinbarungen liest er nur, wenn
  `sharedWithEmployee == true` und `employeeEmail` seiner Anmelde-E-Mail entspricht. Schreiben darf er nur
  die eigene Selbstreflexion bis zum Abschicken und die Kenntnisnahme.
- **Führungskraft** liest und schreibt nur Unterlagen ihres Teams (`userId`, `managerId`, `sharedWith`), wie heute.
- **HR-Admin** darf alles.
- **Anonymer Link-Zugang** wird eingeengt: Der Zugangscode wird künftig über ein eigenes Dokument
  `accessLinks/{code}` aufgelöst, das nur gezielt gelesen werden kann (`get`, kein `list`). Ein anonymer
  Nutzer kann so die Mitarbeiterliste nicht mehr durchsuchen. Bestehende Links funktionieren weiter: Beim
  ersten Aufruf wird `accessLinks/{code}` einmalig angelegt (rückwärtskompatibel).

### 4.4 Benutzerverwaltung (HR)

- **Liste aller Konten** (`registeredUsers`) und aller Mitarbeiter (`teamMembers`) mit Suche und Filter,
  zum Beispiel „Mitarbeiter ohne Konto“ oder „Konten ohne Team“.
- **Bearbeiten:** Name, Rolle, zuständige Führungskraft, Mitarbeiter einer anderen Führungskraft zuordnen.
- **Passwort zurücksetzen:** Die App verschickt die Reset-Mail von Firebase. Das geht ohne Server.
- **Sperren und entsperren:** Ein gesperrtes Konto wird sofort abgemeldet und hat keinen Zugriff mehr,
  durchgesetzt über die Regeln. Das geht ohne Server.
- **Löschen:** Zuerst entsteht automatisch eine Sicherung der Daten des Kontos, dann werden die
  App-Daten gelöscht. Das **Anmeldekonto selbst** lässt sich nur per Cloud Function löschen (Blaze-Tarif).
  Bis dahin wird es gesperrt.
- **Export:** wie heute (Backup, PDF), dazu ein Export je Person (DSGVO-Auskunft).

## 5. Ansichten aus Sicht der Nutzer

### Mitarbeiter: „Mein Bereich“

- **Start:** „Hallo Julia“ und eine Karte je Jahr: Selbstreflexion (Entwurf, abgeschickt am …),
  Beurteilung (noch nicht geteilt, geteilt am …) und Zielvereinbarung.
- **Selbstreflexion:** solange nicht abgeschickt, bearbeiten. Danach nur lesen, mit PDF.
- **Beurteilung und Zielvereinbarung:** erst sichtbar, wenn geteilt. Dann nur lesen, mit PDF und dem Knopf
  „Gelesen und besprochen“.
- **Keine** Kalibrierung, keine anderen Mitarbeiter, keine Gehaltsdaten.

### Führungskraft

- In der Team-Übersicht kommt in der Spalte „Beurteilung“ der Status **„Mit Mitarbeiter geteilt am …“** dazu.
  Bei abgeschlossenen Beurteilungen gibt es den Knopf **„Mit Mitarbeiter teilen“** mit Vorschau, was der
  Mitarbeiter sehen wird, und Rückfrage. Das Teilen lässt sich zurücknehmen.
- Ist eine Kenntnisnahme bestätigt, steht dort „Gelesen am …“.
- Alles andere bleibt wie in PR #4.

### HR-Admin

- Das bestehende HR-Dashboard bleibt.
- Neuer Bereich **„Benutzer & Rechte“** (siehe 4.4), dazu ein Bereich **„Protokoll“**.
- HR kann bei jeder Unterlage teilen und zurücknehmen und sieht alle Kenntnisnahmen.

## 6. Umsetzung in Phasen (jede einzeln abnehmbar, hinter Schaltern standardmäßig aus)

| Phase | Inhalt | Braucht |
|---|---|---|
| **0 Grundlage** | `firestore.rules` im Repo plus Emulator-Tests für alle drei Rollen; `accessLinks` (rückwärtskompatibel); Schalter | Deine aktuellen Regeln aus der Konsole; Freigabe Schutzbereich |
| **1 Teilen** | Knopf „Mit Mitarbeiter teilen“ und Zurücknehmen, Schnappschuss, Status in der Matrix, Protokoll | Phase 0 |
| **2 Mein Bereich** | Mitarbeiter-Anmeldung per E-Mail-Link, Mitarbeiter-Startseite, Lesen und PDF, Kenntnisnahme | Phase 0 und 1; E-Mail-Link-Anmeldung in Firebase aktivieren |
| **3 Benutzerverwaltung** | Liste, Rolle, Zuordnung, Passwort-Reset, Sperren, Löschen der App-Daten, Export je Person | Phase 0 |
| **4 Härtung** (optional) | Cloud Functions: Konto löschen, Rollen im Token, E-Mail-Versand aus der App | Blaze-Tarif |

Jede Phase bringt E2E-Tests mit, auch Negativtests wie „Mitarbeiter sieht ungeteilte Beurteilung nicht“
oder „gesperrtes Konto kommt nicht hinein“. Dazu kommen Screenshots, ein Eintrag im Bericht und ein
eigener PR.

## 7. Datenschutz und Mitbestimmung

Beurteilungen sind sensible Personaldaten. Das Teilen schafft Transparenz und braucht klare Regeln:
Wer darf teilen, was wird geteilt, wie lange bleibt es sichtbar? In Deutschland und Italien kann für ein
Beurteilungssystem mit Mitarbeiterzugang die **Mitbestimmung des Betriebsrats** greifen. Bitte vor dem
Einschalten von Phase 2 klären. Technisch sorgen dafür: das Protokoll aller Freigaben, Teilen nur aktiv,
jederzeit zurücknehmbar, und Mitarbeiter sehen nie die Daten anderer.

## 8. Entscheidungen (getroffen am 23.11.2026)

- **Schutzbereich für die Phasen 0–3 freigegeben.**
- **Mitarbeiter melden sich mit E-Mail und Passwort an** (wie Führungskräfte). Pflicht dabei: **bestätigte
  E-Mail-Adresse**, bevor geteilte Ergebnisse sichtbar werden. Firebase prüft beim Registrieren nicht, ob
  jemandem die Adresse gehört. Ohne Bestätigung könnte sich ein Dritter mit fremder Adresse registrieren.
  Die Regeln prüfen deshalb `request.auth.token.email_verified == true`.
- **Blaze-Tarif später.** Bis dahin werden Konten gesperrt statt gelöscht.

## 9. Sicherheitsbefund aus der Code-Analyse (wichtig, unabhängig vom neuen Feature)

Die App liest an mehreren Stellen **alle** Beurteilungen und Mitarbeiter (HR-Dashboard, Ziel-Dashboard) und
fragt Beurteilungen nur per `employeeId` ab, ohne Bezug auf den Fragenden. Damit das funktioniert, müssen
die heutigen Regeln jedem angemeldeten Nutzer Lesezugriff auf alles geben. Sehr wahrscheinlich gilt das
auch für **anonyme** Nutzer über den Mitarbeiter-Link, und auch für `salaryReviewData`. Firestore-Regeln
filtern nicht, sie erlauben oder verweigern ganze Abfragen. Strenge Regeln würden die heutigen Abfragen
deshalb ablehnen.

**Lösung (Kern von Phase 0):**

1. **Zugriffsfeld** `accessUids` (Liste von Nutzer-IDs) an jeder Unterlage in `teamAppraisals` und an jedem
   Eintrag in `teamMembers`: Eigentümer, geteilte Führungskräfte und, nach dem Teilen, der Mitarbeiter.
   Das Feld ist neu und optional. Eine Migration füllt es für alle vorhandenen Dokumente. Sie ist
   umkehrbar, indem das Feld entfernt wird, und geschieht mit vorheriger Sicherung.
2. **Abfragen umstellen:** Führungskräfte fragen mit `where('accessUids','array-contains', uid)` ab. Nur HR
   und die freigegebenen Zusatzrollen (Ziel-Dashboard, Salary Review) lesen ganze Sammlungen.
3. **Mitarbeiter-Link** über `accessLinks/{code}` mit reinem Einzelzugriff (`get`). Der Gast liest danach
   nur die Unterlagen seiner eigenen Selbstreflexion.
4. **Regeln** `firestore.rules` im Repository. Die E2E-Tests laufen künftig immer unter diesen Regeln,
   dazu kommen Negativtests: Fremde, anonyme, nicht bestätigte und gesperrte Konten sehen nichts.
5. **Einspielen:** Die neuen Regeln spielst du oder eure IT in der Firebase-Konsole ein. Davor die alten
   Regeln sichern, damit man zurückwechseln kann.

**Bis Phase 0 eingespielt ist, bleibt „Mein Bereich“ ausgeschaltet.** Erst die Regeln stellen sicher,
dass Mitarbeiter nur ihre eigenen, geteilten Unterlagen sehen.

## 10. Offene Punkte

1. **Aktuelle Firestore-Regeln:** Firebase-Konsole → Firestore → Regeln → Text kopieren und mir schicken.
   Damit kann ich den Befund aus Abschnitt 9 bestätigen und den Wechsel absichern.
2. **Betriebsrat und Datenschutz:** vor dem Einschalten von „Mein Bereich“ klären.

## Anhang: ursprüngliche Entscheidungsfragen

1. **Freigabe Schutzbereich** für die Phasen 0 bis 3 (Anmeldung, Rollen, neue optionale Felder, Sicherheitsregeln).
2. **Anmeldung der Mitarbeiter:** E-Mail-Link (empfohlen), Passwort oder Microsoft-Login.
3. **Aktuelle Firestore-Regeln:** Firebase-Konsole → Firestore → Regeln → Text kopieren und mir schicken.
   Ich ändere nichts in der Konsole. Die neuen Regeln spielst du oder eure IT ein.
4. **Blaze-Tarif** für Phase 4: jetzt, später oder gar nicht. Ohne ihn werden Konten gesperrt statt gelöscht.
5. **Betriebsrat und Datenschutz:** geklärt oder noch offen. Phase 2 bleibt ausgeschaltet, bis das geklärt ist.

---

## 11. Prüfung: Was fehlt für eine intuitive, idiotensichere Bedienung? (23.11.2026)

Vorgehen: jeden Weg je Rolle im Code und in der Vorschau durchgegangen und geprüft, wo man sich verirren,
etwas übersehen oder Daten verlieren kann. **P1** = Datenverlust oder falsches Ergebnis möglich,
**P2** = häufige Verwirrung, **P3** = Komfort.
Spalte „Freigabe“: *frei* = reine Darstellung, das darf ich ohne Rückfrage umsetzen; *nötig* = berührt
Geschäftslogik oder Datenmodell, das braucht deine Freigabe.

### Alle Rollen

| # | Befund | Vorschlag | Prio | Freigabe |
|---|---|---|---|---|
| A1 | „Mitarbeiter entfernen“ löschte alle Unterlagen aller Jahre nach einem einfachen „Wirklich löschen?“ | **Erledigt:** Folgen werden genannt, der Name muss eingetippt werden, vorher automatische Sicherungsdatei | P1 | erledigt |
| A2 | Löschen ist endgültig | **Papierkorb** statt Löschen: archivieren und ausblenden, HR kann 90 Tage wiederherstellen | P1 | nötig |
| A3 | 24 Browser-Rückfragen (`confirm`), Knöpfe nur „OK/Abbrechen“ | Einheitlicher Dialog mit klarer Aktion („Endgültig löschen“, rot) und „Rückgängig“ in der Meldung danach | P2 | frei |
| A4 | Kein Hinweis bei Verbindungsverlust | Banner „Offline – Änderungen werden gespeichert, sobald du wieder online bist“, Speichern-Knopf bis dahin gesperrt | P2 | frei |
| A5 | Fachbegriffe ohne Erklärung (GPS, WAS/WIE, BARS, SR-Link) | Kurze Erklärung beim Darüberfahren und Tippen (Glossar) | P3 | frei |
| A6 | Italienisch und Englisch sind an einigen Stellen unvollständig (nur Deutsch hinterlegt) | Fehlende Texte automatisch finden und nachtragen | P2 | frei |

### Mitarbeiter

| # | Befund | Vorschlag | Prio | Freigabe |
|---|---|---|---|---|
| M1 | 14 Selbstreflexionen 2025 blieben unbemerkt als Entwurf liegen | **Erledigt:** Leiste mit „Fertig & senden“, Abschluss-Kasten, Entwürfe für die Führungskraft sichtbar | P1 | erledigt |
| M2 | Nach dem Abschicken ist das Eingetragene nicht mehr einsehbar; Link verloren = kein Zugang | „Mein Bereich“ mit Anmeldung (Phase 2) | P1 | erteilt |
| M3 | Beim Abschicken wird nicht gezeigt, was fehlt | Vor dem Senden eine Übersicht: „3 Kompetenzen ohne Kommentar, Teil E leer – trotzdem senden?“ | P2 | frei |
| M4 | Ziele muss der Mitarbeiter selbst abtippen | Ziele aus der Zielvereinbarung vorbefüllen (setzt Phase 0 voraus: Zugriff des Links auf die eigene Zielvereinbarung) | P2 | erteilt (Phase 0) |
| M5 | „Geplanter Bonus“ und die GPS-Note „2,00“ vor jeder Eingabe verunsichern | Im Mitarbeiterbogen ausblenden bzw. erst nach dem Ausfüllen zeigen | P2 | nötig (offen) |
| M6 | Langer Bogen auf dem Handy | Tabellen als Karten, Leiste mit Abschnitten bleibt sichtbar (teilweise erledigt) | P2 | frei |

### Führungskraft

| # | Befund | Vorschlag | Prio | Freigabe |
|---|---|---|---|---|
| F1 | „Abschließen“ ist auch bei unvollständiger Beurteilung möglich (Gewichte ≠ 100 %, Erreichung leer) | **Abschluss-Prüfung** mit Liste der Lücken; bei Gewichten ≠ 100 % blockieren | P1 | nötig (Validierung) |
| F2 | Keine Reihenfolge sichtbar: Selbstreflexion → Beurteilung → Gespräch → Ziele | In jeder Zeile der nächste Schritt hervorgehoben, im Dashboard „Meine offenen Punkte“ (erledigt) | P2 | frei |
| F3 | Nach „Teilen“ geänderte Beurteilung weicht von der geteilten Fassung ab | Hinweis „Seit dem Teilen geändert – erneut teilen?“ | P2 | frei |
| F4 | Gesprächs-Merker gilt nicht je Jahr (Datenmodell) | Optionales Feld je Jahr (`meetings[2026]`), alte Daten bleiben | P2 | nötig |
| F5 | Mitarbeiter ohne E-Mail können nicht eingeladen oder geteilt werden | In der Matrix kennzeichnen, mit „E-Mail ergänzen“ direkt in der Zeile | P2 | frei |

### HR-Admin

| # | Befund | Vorschlag | Prio | Freigabe |
|---|---|---|---|---|
| H1 | Keine Benutzerverwaltung | **Teilweise erledigt (Schalter `userAdmin`, aus):** Reiter „Benutzer“ mit Suche und Filter (mit/ohne Team, gesperrt), Name ändern, Passwort-Reset-Mail, Sperren/Entsperren (Abmeldung, HR-Admins und das eigene Konto ausgenommen), Export je Person, jede Aktion im `auditLog`. Offen: Rolle vergeben und Mitarbeiter umhängen (erst mit den Regeln aus Phase 0 sicher), Anmeldekonto löschen (Blaze) | P1 | erteilt |
| H2 | HR-Dashboard mischt alle Jahre | **Erledigt:** Auswahl „Beurteilungsjahr“ mit Anzahl je Jahr; wirkt auf Kennzahlen, Liste und Export. Standard „Alle Jahre“, damit ein Export nie unbemerkt Jahre auslässt | P1 | erledigt |
| H3 | Kein Protokoll, wer was geändert, gelöscht oder geteilt hat | Protokoll-Ansicht (Teilen wird seit Phase 1 schon protokolliert); Löschen und Wiederherstellen ergänzen | P2 | erteilt |
| H4 | Wiederherstellen aus Backup überschreibt ohne Vorschau der Unterschiede | Vorschau „wird ersetzt / neu“ und Bestätigung mit Anzahl | P2 | frei |
| H5 | Sicherheitsregeln unbekannt, vermutlich zu offen (Abschnitt 9) | Phase 0 | P1 | erteilt |

### Empfohlene Reihenfolge

1. **Phase 0 (Sicherheit)**, dann H2 und A3/A4: Schutz und Grundvertrauen.
2. **Phase 3 (Benutzerverwaltung)** und H3: HR arbeitsfähig machen.
3. **Phase 2 („Mein Bereich“)** mit M2/M4: erst nach Einspielen der Regeln und Klärung mit Betriebsrat und Datenschutz.
4. Danach F1, A2, F4 (brauchen deine Freigabe) und die restlichen P2/P3-Punkte.
