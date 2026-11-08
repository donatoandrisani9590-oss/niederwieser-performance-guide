# Ausgangslage vor dem Redesign (Phase 0)

Stand: 2026-11-08, Branch `redesign/n-org`, App v93 unverändert (`index.html` = Commit `02607b8`).

## Build, Lint, Tests vor Phase 0

| Prüfung | Ergebnis |
|---|---|
| Build | Gibt es nicht. Die App ist eine einzelne `index.html` ohne Build-Schritt (React 18 über esm.sh, Tailwind Play CDN). |
| Lint | Gibt es nicht (keine Konfiguration im Repository). |
| Tests | Gab es nicht. |
| Browser-Konsole | Beim Laden und in allen getesteten Abläufen: **keine Fehler** (siehe unten). |

## Neu in Phase 0 (ohne App-Code zu ändern)

| Prüfung | Befehl | Ergebnis Ausgangslage |
|---|---|---|
| Schutzbereich | `node tests/protected/fingerprint.mjs` | unverändert (config 13, firestore 83, auth 17, storage-keys 57, url 9, functions 31) |
| E2E-Tests | `cd tests && npm install && npm test` | **14 von 14 grün**, dreimal hintereinander stabil |

### Was die Tests abdecken (`tests/e2e/`)

`critical.spec.mjs`
1. Falsches Passwort → Fehlermeldung, keine Anmeldung
2. Führungskraft sieht genau eigene + geteilte Mitarbeiter, Beurteilungen richtig zugeordnet
3. Andere Führungskraft sieht keine fremden Mitarbeiter
4. Abmelden → keine Daten sichtbar; erneut anmelden → alle Daten wieder da
5. Sitzung bleibt nach Neuladen erhalten
6. Mitarbeiter anlegen → in Firestore mit richtigem Besitzer und unveränderten Feldnamen → nach Neuladen sichtbar
7. Beurteilung anlegen → Entwurf speichern → neu laden → fortsetzen → abschließen → genau ein Datensatz, Status `completed`, andere Beurteilungen unberührt
8. Mitarbeiter-Link `?accessCode=` öffnet die Selbstreflexion des richtigen Mitarbeiters
9. Ungültiger Link → Hinweis
10. HR-Admin sieht HR-Bereich

`screens.spec.mjs`
11. Öffentliche Seiten + Anmeldung rendern ohne Konsolenfehler
12. Führungskraft: alle Hauptseiten ohne Konsolenfehler, **bloßes Ansehen ändert keinen einzigen Datensatz**
13. HR-Admin: HR-Dashboard mit allen Reitern, Salary Review, Ziel-Dashboard ohne Fehler, keine Datenänderung
14. Mitarbeiter-Link: Willkommen + Formular ohne Fehler

### Sicherheit der Tests

- Laufen ausschließlich gegen den lokalen **Firebase-Emulator** mit **synthetischen Testdaten** (`tests/e2e/seed.mjs`).
- Jede Anfrage an echte Google-/Firebase-Server wird im Browser blockiert; ein Test, der es versucht, schlägt fehl.
- Die CDNs der App sind in der Testumgebung nicht erreichbar. `tests/vendor/build.mjs` baut dieselben Versionen aus npm
  und liefert sie im Test aus. Tailwind wird dafür einmal mit Version 3.4.17 kompiliert statt im Browser (Play CDN);
  minimale Darstellungsunterschiede gegenüber dem Live-Betrieb sind dadurch möglich.

## Screenshots

Vorher-Stand aller Hauptseiten: `docs/screenshots/before/` (mit Testdaten, 1440 px breit, ganze Seite).

## Bekannte Auffälligkeiten (vorher schon so, nicht angefasst)

- Firebase-Projekt: Abrechnungskonto geschlossen. PDFs in Firebase Storage sind deshalb derzeit nicht abrufbar
  (Fehler 402). Betrifft vermutlich auch „PDF ansehen/hochladen“ im Live-Betrieb.
- Pull Request #1 benennt `index.html` in `Index.html` um → würde Links brechen (siehe PROTECTED.md §6).
- Collection `appraisals` ist leer, `mail` wird von der App nicht beschrieben.
