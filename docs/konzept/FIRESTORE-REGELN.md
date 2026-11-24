# Firestore-Regeln: Befund und Vorschlag (Stufe 1)

Stand 23.11.2026. Grundlage: die in der Firebase-Konsole eingespielten Regeln, Kopie in `tests/rules/aktuell.rules`.
Vorschlag: `tests/rules/vorschlag.rules`. **Eingespielt am 23.11.2026.** `tests/rules/aktuell.rules` enthält seitdem die
alten Regeln (zum Zurückwechseln).

## Befund der aktuellen Regeln

Geprüft mit `npm run rules:aktuell` (im Ordner `tests`, nur Emulator und Testdaten). 14 Abweichungen vom Sollzustand:

| Lücke | Bedeutung |
|---|---|
| Wer einen Mitarbeiter-Link hat (anonyme Anmeldung), kann **Gehaltsdaten lesen** | `salaryReviewData` ist für jede Anmeldung offen, auch anonym |
| Jeder, auch anonym, kann sich **selbst Gehalts-Zugriff geben** | `salaryReviewAccess` ist für jede Anmeldung beschreibbar |
| Anonym können Beurteilungen **angelegt, geändert und gelöscht** werden | `teamAppraisals` ist für jede Anmeldung voll beschreibbar |
| Anonym ist die **Kontenliste** lesbar | `registeredUsers` für jede Anmeldung lesbar |
| Führungskräfte ohne Einladung lesen Gehaltsdaten | wie oben |
| Eine gesperrte Person kann die **Sperre selbst aufheben** | eigener Eintrag in `registeredUsers` frei änderbar |
| HR-Adresse der App fehlt in der Regel-Liste `isHRAdmin` | HR kann fremde Mitarbeiter nicht anlegen/wiederherstellen |
| Protokoll, Papierkorb, HR-Benutzerverwaltung sind nicht freigegeben | die neuen Funktionen greifen in der echten App nicht (Papierkorb fragt dann nach endgültigem Löschen) |

Was heute schon korrekt ist: Mitarbeiter (`teamMembers`) darf nur die eigene Führungskraft anlegen, ändern, löschen;
der Gehalts-Verlauf ist nicht änderbar; Konten können nicht gelöscht werden.

## Der Vorschlag (Stufe 1)

Ändert nichts an Daten und nichts an der App. Alles, was heute funktioniert, funktioniert weiter:
alle 57 App-Tests laufen unter dem Vorschlag (`npm run rules:vorschlag`), und die heute live laufende Version (`main`)
nutzt dieselben Datenbankzugriffe.

- Gehaltsdaten und Gehalts-Verlauf nur für HR und eingeladene Personen (Eintrag in `salaryReviewAccess`).
  Geprüft an der Sicherung vom 08.11.2026: alle 3 bestehenden Einladungen haben das erwartete Format.
- Gehalts-Zugriff vergeben nur HR.
- Mitarbeiter-Link (anonym): nur Selbstreflexionen anlegen und ändern, nichts löschen, keine Kontenliste.
- Konten: eigener Name änderbar, die Sperre nicht. HR darf Name und Sperre ändern, sonst nichts.
- Protokoll (`auditLog`): nur anhängen, nur im eigenen Namen, lesen nur HR, nie ändern/löschen.
- Papierkorb (`trash`): ablegen durch die entfernende Person, lesen/wiederherstellen/endgültig löschen nur HR.
- HR-Liste um die HR-Adresse der App ergänzt (die bisherigen zwei Adressen bleiben).

**Bleibt offen bis Stufe 2:** Lesen von Mitarbeitern und Beurteilungen ist weiter für jede Anmeldung offen, auch über
den Mitarbeiter-Link. Das zu schließen braucht den Umbau der Abfragen (`accessUids`, `accessLinks`, Konzept Abschnitt 9).

## Einspielen (5 Minuten)

1. Firebase-Konsole → Projekt `performance-manager-b0967` → Firestore Database → Reiter **Regeln**.
2. Den heutigen Text zur Sicherheit noch einmal kopieren und aufheben (eine Kopie liegt in `tests/rules/aktuell.rules`).
3. Den ganzen Inhalt von `tests/rules/vorschlag.rules` einfügen → **Veröffentlichen**.
4. Kurz prüfen: als Führungskraft anmelden, Team sehen; einen Mitarbeiter-Link öffnen; als HR das HR-Dashboard öffnen.

**Zurück:** Den Text aus `tests/rules/aktuell.rules` einfügen und veröffentlichen. Daten werden dabei nie verändert.

## Prüfen lassen

```bash
cd tests && npm run rules:aktuell     # zeigt die Lücken der heutigen Regeln
cd tests && npm run rules:vorschlag   # Sicherheitsprüfung + alle App-Tests unter dem Vorschlag
```
