# Redesign auf n.Org – Abschlussbericht

Stand: 08.11.2026 · Branch `redesign/n-org` · Grundlage: `docs/design-transfer/` (n.Org, Commit `160d75c`)

## Kurzfassung

Die gesamte App ist auf das n.Org-Designsystem umgestellt: Inter, Tokens, ruhige weiße Flächen auf warmem Beige,
NW-Blau als einzige Akzentfarbe, schwebende Seitenleiste mit Logo oben links, eine Primäraktion je Ansicht.
Daten, Anmeldung, Rollen, Speicherschlüssel, Links, Export-Formate und Berechnungen sind **unverändert**.

| Prüfung | Vorher (Phase 0) | Nachher |
|---|---|---|
| Automatische Tests | 14 / 14 grün | **24 / 24 grün** (10 neue) |
| Schutzbereich (`node tests/protected/fingerprint.mjs`) | Baseline angelegt | **unverändert** (Baseline seit Anlage nicht angefasst) |
| Konsolenfehler in allen Abläufen | 0 | 0 |
| WCAG 2 A/AA (axe-core) auf 6 Kernseiten | nicht gemessen | **0 Verstöße** |
| Tailwind-Standardfarben im Code | 3 263 | 12 (nur in der geschützten Berechnung und ihrer Übersetzungstabelle) |
| Fremde Hex-Werte (verschiedene) | 83 | 1 (`#82241C`, Hover von danger-primary aus dem n.Org-Kit) |
| Verläufe | 110 | 0 |

## Zuordnung bestehender Screens → n.Org-Layoutmuster

| Screen (`activeView`) | Muster | Umsetzung |
|---|---|---|
| Anmeldung (Team-Zugang) | Stufe 1, zentrierte Karte | Segmented Anmelden/Registrieren, Felder 36 px, Primärknopf, Fehlermeldung `role=alert` |
| Dashboard (`dashboard`) | B Kopf + Flächen | PageHeader mit Begrüßung, **„Ihr nächster Schritt“** mit genau einer Primäraktion je Lage, StatCards, Schnellstart als Zwei-Spalten-Fläche, übrige Inhalte als ruhige Flächen |
| Anleitung (`guide`) | B | Schritt-Flächen, Quick Tips als Fläche |
| Kompetenzen (`list`, `detail`) | A Kartenraster | Bereichskarten, Detail als Flächen |
| GPS Formel (`gpsexplainer`) | B | Flächen statt dunkler Blöcke |
| Meine Selbstreflexion (`mySelfReflection`) | B mit angehefteter Aktionsleiste | Senden = Primär, Entwurf = Sekundär, PDF = Ghost |
| Team-Übersicht (`teamoverview`) | B | PageHeader mit Fortschritt und Segmented Karten/Liste, 4 StatCards, Anlage-Fläche, einheitliche Knöpfe in den Karten, Leerzustand |
| Beurteilung (`formular`), Zielvereinbarung (`zielvereinbarung`) | B mit angehefteter Aktionsleiste | Abschließen = Primär, Entwurf speichern = Sekundär, Abbrechen = Ghost, Schließen als Icon-Knopf |
| Kalibrierung (`teamcalibration`) | B | Flächen, 9-Box und Heatmap in Token-Farben |
| Selbstreflexion ansehen (`viewSelfAssessment`) | B | Flächen |
| HR-Dashboard (`hrdashboard`) | B + Tabs | Reiter als n.Org-Tabs (`role=tab`) |
| Salary Review (`salaryreview`), Ziel-Dashboard (`goalsdashboard`) | B, volle Breite | Kopf mit Haarlinie, Felder mit n.Org-Fokus |
| Mitarbeiter-Link (`guestWelcome`, `guestForm`) | Stufe 1 ohne Shell | Logo, ruhige Karte, Primärknopf „Selbstreflexion starten“ |
| Ladebildschirm | – | Panel, Logo, pulsierende Punkte, `role=status` |

Bausteine (aus `kit/` als `React.createElement` nachgebaut, ohne Build): `NwButton`, `NwChip`/`NwTag`/`NwDot`,
`NwPageHeader`, `NwPane`/`NwPaneHeader`, `NwStatCard`, `NwEmptyState`, `NwSegmented`, Toast (`showToast`), Tabs.

## Was je Phase umgebaut wurde

1. **Fundament**: Inter 400/500/600 als data-URI (kein CDN, CSP unverändert), Tokens aus `tokens/tailwind.config.ts`
   im eingebetteten `tailwind.config`, `tokens/index.css` als `<style type="text/tailwindcss">`, Favicon, Logo.
2. **Token-Übertragung** per Tabelle (`docs/redesign/tools/map-tokens.mjs`): Farben, Hex, Schriftgrößen (8-Stufen-Skala),
   Gewichte 400/500/600, Radien 8/10/12, Schatten card/float, Verläufe entfernt.
3. **Shell**: weiße schwebende Seitenleiste (256 px), Logo oben links (Klick → Start), Sprache als Segmented,
   HR-Copilot-Knopf mit ⌘J/Strg+J, Navigation mit Eyebrows/Icons/`aria-current`, Nutzerkarte mit Abmelden.
   Auf dem Handy klappt das Menü auf und zu.
4. **Screens**: dunkle Banner → ruhige Flächen (`flip-dark-surfaces.mjs`), Dashboard und Team-Übersicht von Hand
   neu, Formulare mit angehefteter Aktionsleiste, HR-Tabs, Eingabefelder einheitlich (`inputs.mjs`).
5. **Feinschliff**:
   - Überschriften, Knöpfe und Texte ohne dekorative Emojis (die Wörter bleiben).
   - Hinweisbalken „Brauchst du Hilfe? Der HR-Copilot unten rechts …“ in der Team-Übersicht entfernt.
     Der HR-Copilot steht dauerhaft in der Seitenleiste.
   - Schnellstart-Guide aufklappbar, nach „erklären, wenn gefragt“: offen für neue Nutzer, eingeklappt für Führungskräfte mit Team.
   - Restliche grüne und dunkle Kacheln als ruhige Flächen.
   - Toasts (dunkel, Live-Region), Assistent per Tastatur, Bewegung nur mit n.Org-Keyframes und unter
   `prefers-reduced-motion` aus, WCAG AA (`warn-contrast.mjs`, automatische Beschriftung von Feldern und Icon-Knöpfen,
   `<html lang>` folgt der App-Sprache).

Nebenbei behobene **Darstellungsfehler** (vorher schon vorhanden):
- 44 Klassenverkettungen ohne Leerzeichen. Dadurch war z. B. der aktive HR-Reiter unsichtbar und der Jahreszyklus ohne Markierung.
- Der Jahreszyklus zeigte fest „Januar“, jetzt den aktuellen Monat.
- Neben Namen ohne GPS stand eine verirrte „0“.

## Schutzbereich – Bestätigung

- `node tests/protected/fingerprint.mjs` meldet „Schutzbereich unverändert“ für alle 83 Datenbankzugriffe, 17 Auth-Stellen,
  57 Speicherschlüssel, 9 URL-Parameter, 31 Berechnungs- und Datenfunktionen und die Konfiguration
  (Firebase-Config, HR-Admins, CSP, Skript-Versionen).
- `tests/protected/baseline.txt` ist seit seiner Anlage (Commit `76e6527`) unverändert.
- Zwei bewusste Verschiebungen ohne inhaltliche Änderung:
  - `handleLogout` steht jetzt eine Ebene höher, damit die Seitenleiste es nutzen kann.
  - Die Ampelklassen der geschützten `calculateGPSConfidence` werden erst bei der Anzeige auf Status-Tokens übersetzt.
    Die Funktion selbst ist Byte für Byte gleich.
- Keine Abhängigkeit der App aktualisiert oder entfernt. Neue Pakete gibt es nur in `tests/` (Testwerkzeuge).

## Tests

Alle Tests laufen gegen den Firebase-Emulator mit erfundenen Testdaten. Echte Firebase-Server sind im Test blockiert.

```bash
cd tests && npm install && npm test
```

Neu seit Phase 0:
- `a11y.spec.mjs`: 4 Tests, WCAG 2 A/AA auf Dashboard, Anmeldung, Team-Übersicht, Beurteilung, HR-Dashboard und Mitarbeiter-Link.
- `mobile.spec.mjs`: Handy-Menü, Anmeldung und Team ohne horizontalen Überlauf.
- `screens.spec.mjs`: Dialog-Hintergrund bleibt halbtransparent (Schutz gegen versehentlich weiße Overlays).
- `first-run.spec.mjs`: **Erststart ohne Anleitung.** Diese Tests folgen ausschließlich den sichtbaren Hauptaktionen:
  - **Führungskraft:** erster Aufruf → Anmeldung → Registrierung → „Team anlegen“ → erster Mitarbeiter → Beurteilung
    abgeschlossen → das Dashboard meldet „Alle Beurteilungen abgeschlossen“.
  - **Mitarbeiter:** Link → starten → absenden. Die Selbstreflexion landet beim richtigen Mitarbeiter und bei der richtigen Führungskraft.
- `critical.spec.mjs`:
  - Registrierung einer neuen Führungskraft (Erststart: leeres Team, Hinweis, nächster Schritt).
  - PDF-Export der Beurteilung (echte PDF-Datei; Logo und Titel geprüft).

Screenshots: `docs/screenshots/before/` (Ausgangslage) und `docs/screenshots/after/` (gleiche Seiten, gleiche Testdaten).

## Bewusste Abweichungen von n.Org

| Punkt | n.Org | Hier | Grund |
|---|---|---|---|
| Eyebrows und Metatext | `ink-40` (3,2:1) | `ink-60` (6,1:1) | Vorgabe WCAG AA |
| Warn-Chips | `bg-warn-bg text-warn` (4,45:1) | weiß mit Amber-Rahmen | WCAG AA |
| Assistent | nur Seitenleiste | Seitenleiste + bisheriger runder Knopf unten rechts | bestehende Nutzer kennen den Knopf, nichts entfernen |
| Suche ⌘K, Rückgängig-Verlauf, Start/Zurück-Pillen | vorhanden | nicht eingebaut | bräuchten neue Logik bzw. einen Verlauf/Router, also kein reines Design |
| PDF-Vorlagen | – | Inhalt und Aufbau unverändert, nur Logo im Kopf | Export-Formate geschützt |

## Offene Punkte – brauchen deine Entscheidung

1. **Registrierung schreibt `registeredUsers` nicht.** `LoginView.handleSubmit` prüft `window.db`, das nirgends gesetzt wird.
   Das war schon vor dem Redesign so und passt zu den echten Daten (31 Passwort-Konten, 4 `registeredUsers`).
   Es liegt im Schutzbereich Anmeldung, deshalb habe ich es nicht geändert. Die Behebung wäre eine einzige Zeile.
2. **Firebase-Abrechnungskonto geschlossen.** PDFs in Firebase Storage sind deshalb nicht abrufbar (Fehler 402).
   Das betrifft „PDF ansehen/hochladen“ im Live-Betrieb.
3. **Pull Request #1** benennt `index.html` in `Index.html` um. Das würde Mitarbeiter-Links und Lesezeichen brechen.
4. **Tailwind läuft im Browser (Play CDN).** Das ist so gewollt (kein Build), aber langsamer als vorkompiliertes CSS.
   Ein Build-Schritt wäre eine eigene Entscheidung.
5. **Emojis** sind aus Überschriften (41), Knopftexten (7) und 45 weiteren Textstellen entfernt.
   Es bleiben:
   - Farbkreise (🟢 🔴 …) und Flaggen, weil sie Bedeutung tragen,
   - Texte, die aus mehreren Teilen zusammengesetzt werden,
   - die Inhalte des HR-Copilot,
   - die PDF-Vorlage.
6. **Live-Abnahme mit echten Konten** fehlt noch. Deine Regel lautet, nie gegen Produktivdaten zu arbeiten. Deshalb ist alles nur
   gegen den Emulator mit Testdaten geprüft. Empfehlung: vor dem Zusammenführen eine Testperson mit eigenem Konto
   das Erst-Login durchspielen lassen und die Checkliste in `NOTFALL-BACKUP.md` §3 abarbeiten.

## Nachvollziehbarkeit

Jeder Schritt ist ein eigener Commit und lässt sich einzeln zurücknehmen. Die Skripte der automatischen Umstellungen
liegen unter `docs/redesign/tools/`. Die Notfall-Sicherung des Ausgangsstands liegt unter `backups/v93_2026-11-08/`
(siehe `NOTFALL-BACKUP.md`).
