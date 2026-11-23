# Prompt für den neuen Chat (lokal auf dem Mac, mit Claude in Chrome)

Alles zwischen den Linien in den neuen Chat kopieren.

---

Du arbeitest als Team aus Senior Software Engineer, UX-/UI-Designer und HR-Experte am **Niederwieser Performance
Manager**. Mit der App führen Führungskräfte die jährliche Mitarbeiterbeurteilung durch: Selbstreflexion des
Mitarbeiters, Beurteilung inklusive Gespräch und Zielvereinbarung für das Folgejahr. HR steuert und wertet aus.
Echte Mitarbeiter arbeiten täglich damit.

**Ziel:** Die App soll sich für jede Rolle wie ein Premium-Produkt anfühlen, das viele tausend Euro kostet. Sie soll
flüssig, modern, intuitiv, selbsterklärend und nahezu idiotensicher sein. Es soll alles da sein, was man für die
Beurteilung braucht, aber nichts Überflüssiges. Du arbeitest so lange, bis du als Team überzeugt bist, eine
übergabereife Premium-Arbeit abzuliefern, alles geprüft ist und alles läuft.

## 1. Zuerst orientieren (vor jeder Änderung lesen)

Repository: `donatoandrisani9590-oss/niederwieser-performance-guide` (GitHub). Falls auf dem Mac noch nicht vorhanden,
klonen. Arbeitsbasis ist der Branch **`feature/rollen-und-freigaben`**, denn er enthält alles.

Lies vollständig:
1. `CLAUDE.md`: verbindliche Regeln (Schutzbereich, Pflichtprüfungen, Designsystem)
2. `docs/PROTECTED.md`: was nicht verändert werden darf
3. `docs/konzept/ROLLEN-UND-FREIGABEN.md`: Rollen, Architektur, Entscheidungen, §11 Prüfliste Bedienbarkeit mit Stand
4. `docs/konzept/FIRESTORE-REGELN.md`: Sicherheitsregeln, Befund, was eingespielt ist
5. `docs/design-transfer/`: Designsystem n.Org (Farben, Schriftskala, Radien, Komponenten)
6. `docs/BASELINE.md`: Ausgangslage der Tests

**Was wo auf welchem Stand ist:**

| Ort | Stand |
|---|---|
| `main` | **Live-Version, die die Mitarbeiter heute nutzen** (alter Stand v93, nur `index.html`). Nie direkt ändern. |
| PR #3 `redesign/n-org` → main | Redesign auf n.Org (Entwurf, nicht gemergt) |
| PR #4 `feature/team-matrix-jahre` → #3 | Jahreswähler, Status-Matrix, Zielübernahme (Entwurf) |
| PR #5 `feature/rollen-und-freigaben` → #4 | **Neuester Stand**, alles oben plus Konzept, Teilen, Benutzerverwaltung, Papierkorb, Abschluss-Prüfung, Gespräche je Jahr, E-Mail ergänzen, Offline-Hinweis, Backup-Vorschau, Firestore-Regeln mit Tests |
| PR #2, PR #1 | #2 = Notfall-Sicherung v93. #1 = Umbenennung in `Index.html`. **Nicht mergen**, sonst bricht die URL. |
| Vercel-Vorschau von PR #5 | https://nw-performance-preview-git-fe-917e74-donato-andrisanis-projects.vercel.app **Achtung: Sie ist mit den ECHTEN Firebase-Daten verbunden.** Dort nichts eingeben, nichts speichern, nichts löschen. Höchstens ansehen. |
| Firebase-Projekt `performance-manager-b0967` | Produktion. Firestore-Regeln „Stufe 1“ sind seit 23.11.2026 eingespielt (`tests/rules/vorschlag.rules`). Die alten Regeln liegen in `tests/rules/aktuell.rules`. |
| Schalter `NW_FEATURES` in `index.html` | `shareWithEmployee`, `employeeArea`, `userAdmin`: standardmäßig AUS |

Nichts ist gemergt. Mergen, freigeben oder etwas auf `main` bringen gibt es nur auf ausdrückliche Anweisung des Auftraggebers.

## 2. So testest du im Browser (nur mit Testdaten)

Teste **ausschließlich in der lokalen Vorschau**. Sie arbeitet mit dem Firebase-Emulator und synthetischen Testdaten und
kann echte Daten weder lesen noch schreiben.

```bash
cd tests && npm install && npm run vorschau
```

Voraussetzungen auf dem Mac: Node.js ab Version 20 und Java ab Version 11, das der Firestore-Emulator braucht.
Fehlt eins davon, frag den Auftraggeber vor der Installation, zum Beispiel `brew install node openjdk`.

Dann in Chrome (Claude in Chrome):
- App: `http://127.0.0.1:5174/index.html`. Unten links muss „LOKALE VORSCHAU · nur Testdaten“ stehen. Steht dort
  ein roter Hinweis: sofort aufhören.
- Mitarbeiter-Link: `http://127.0.0.1:5174/index.html?accessCode=CODE-tm-emil`
- Ausgeschaltete Funktionen: `http://127.0.0.1:5174/index.html?nwFeatures=shareWithEmployee,userAdmin`
- Testkonten, nur im Emulator, Passwort `Test-1234`: Führungskraft A `fk.anna@test.local`, Führungskraft B
  `fk.bernd@test.local`, HR `d.andrisani@niederwiesergroup.com`. Das HR-Konto im Emulator ist ein Testkonto.
  Das echte Passwort des Auftraggebers wird nie verwendet.
- Frische Testdaten: Vorschau neu starten.

Spiele jede Rolle komplett durch, auf dem Desktop (1440 px) und als Handy (390 px):
- **Mitarbeiter:** Link öffnen → Selbstreflexion ausfüllen → Entwurf → abschicken
- **Führungskraft:** Dashboard → Team → Selbstreflexion ansehen → Beurteilung → Gespräch → Abschluss →
  Zielvereinbarung Folgejahr → Jahreswechsel → PDF → Mitarbeiter entfernen (Papierkorb)
- **HR:** HR-Dashboard mit Jahresfilter → Kalibrierung → Ziel-Dashboard → Export → Backup und Vorschau → Papierkorb und
  Wiederherstellen → Benutzer (mit Schalter)

Achte dabei auf Konsolenfehler, Ladezeiten, ruckelnde Übergänge, unklare Texte, Sackgassen, fehlende Rückmeldungen
und Stellen, an denen man Daten verlieren oder etwas falsch machen kann.

## 3. Was du verbessern darfst, und was nicht

**Unantastbar: das Bewertungssystem.** Der Bogen bleibt inhaltlich genau so: Teile, Kompetenzen, BARS-Anker,
Skalen, Gewichte, GPS-, WAS- und WIE-Formeln, Bonus- und Berechnungslogik, Pflicht- und Freiwilligkeit der Felder.
Es wird nichts entfernt und nichts umgedeutet. Außerdem unantastbar: alles in `docs/PROTECTED.md`, also Datenmodell,
Anmeldung, Speicher-Schlüssel, URLs, Import- und Exportformate. Bestehende Daten müssen unverändert laden.
Würde eine Idee das berühren: **STOPP**, dem Auftraggeber erklären und auf seine Entscheidung warten.

**Erwünscht:** alles an der Darstellung und Bedienung, was die App premium, flüssig und selbsterklärend macht:
- Mikrointeraktionen, sanfte Übergänge, Lade- und Leerzustände, Skelett-Ladeanzeigen
- klare nächste Schritte, Fortschritt, Bestätigungen mit „Rückgängig“
- ein einheitlicher Dialog statt Browser-`confirm` (offen als A3 in §11)
- Tastaturbedienung, mobile Ansicht, Erklärungen beim Darüberfahren (A5 Glossar), vollständige IT-/EN-Texte (A6)
- „Seit dem Teilen geändert“ (F3)

**Inspiration:** Uiverse.io, hover.dev, saasframe.io und ähnliche. Diese Regeln gelten:
- Nur Ideen und Muster übernehmen und mit den n.Org-Tokens nachbauen: keine neuen Hex-Farben, nur Schriftgrößen der
  Skala, kein neuer Radius, Überschriften in NW-Blau, kein Orange.
- `prefers-reduced-motion` respektieren, WCAG AA einhalten.
- Lizenzen beachten: Uiverse ist MIT; bei hover.dev nur frei nutzbare Muster, keine kostenpflichtigen Komponenten kopieren.
- **Keine neuen Bibliotheken** (zum Beispiel Framer Motion). Animationen mit CSS und Tailwind. Ausnahmen nur nach
  Rückfrage beim Auftraggeber.
- Nicht überfrachten. Jede Ergänzung muss einer Rolle bei der Beurteilung wirklich helfen.

## 4. Arbeitsweise

1. Neuen Branch von `feature/rollen-und-freigaben` anlegen, zum Beispiel `feature/premium-ux`. Kleine Commits,
   jeder einzeln rücknehmbar.
2. Zuerst eine **priorisierte Befundliste** schreiben. Je Punkt: Rolle, Stelle, Problem, Vorschlag, Aufwand und ob
   der Schutzbereich berührt ist. Dann umsetzen, wichtigste Punkte zuerst. Punkte mit Schutzbereich zuerst
   freigeben lassen.
3. Vor jedem Commit prüfen:
   ```bash
   node tests/protected/fingerprint.mjs
   ```
   ```bash
   cd tests && npm test
   ```
   `fingerprint.mjs` muss „Schutzbereich unverändert“ melden. Die Baseline nur nach ausdrücklicher Freigabe mit
   `--update` neu schreiben. Ändert ein Schritt etwas an Regeln oder Datenzugriffen, zusätzlich
   `npm run rules:vorschlag` laufen lassen.
4. Für neue Abläufe E2E-Tests ergänzen (`tests/e2e/`), nach dem Muster der vorhandenen.
5. Pushen und einen Draft-PR auf `feature/rollen-und-freigaben` anlegen. Nie mergen, nie auf `main` pushen.
6. Sprache in der App: überall **Du**.

## 5. Fertig ist es, wenn

- jede Rolle ihren Ablauf ohne Erklärung, ohne Sackgasse und ohne Datenverlust-Risiko schafft, auf Desktop und Handy,
- alle Tests grün sind und keine neuen Konsolenfehler auftreten,
- der Schutzbereich unverändert ist oder nur ausdrücklich freigegebene Punkte geändert sind,
- das Bewertungssystem inhaltlich identisch ist,
- ein Übergabebericht vorliegt: was geändert wurde, Vorher-Nachher-Bildschirmfotos, was offen bleibt, was der
  Auftraggeber entscheiden oder freigeben muss.

**Bekannte offene Punkte:**
- Sicherheit Stufe 2: Lesen über den Mitarbeiter-Link einschränken (braucht Umbau der Abfragen, Konzept §9).
- „Mein Bereich“ für Mitarbeiter: Schalter `employeeArea`, erst nach Stufe 2 und nach Klärung mit Betriebsrat und
  Datenschutz.
- M5 (Bonus- und GPS-Anzeige im Mitarbeiterbogen): braucht eine Entscheidung des Auftraggebers.

---
