# Niederwieser Performance Manager – Regeln für jede Sitzung

Die App ist eine einzelne Datei `index.html` (React 18 ohne Build, Firebase compat SDK 10.7.1, Tailwind Play CDN).
Echte Nutzer arbeiten damit. **Daten dürfen nie verloren gehen, verschoben oder vertauscht werden.**
Wer sich mit seinem bisherigen Konto anmeldet, muss alle alten Daten und Eingaben unverändert wiederfinden.

## Schutzbereich – darf NICHT verändert werden

Konkrete Liste: **`docs/PROTECTED.md`** (vor jeder Änderung lesen).

- Datenmodelle, Typen der Daten, Datenbankschema, Migrationen, gespeicherte Dateiformate
- API-Endpunkte, Request-/Response-Formate, Backend- und Server-Code
- Anmeldung: Auth-Provider, Konfiguration, Redirect-URIs, Rollen und Rechte, Session-Logik
- Schlüssel in localStorage/sessionStorage/Cookies, Umgebungsvariablen, Secrets
- URLs und Routen (Lesezeichen und Links müssen weiter funktionieren, Dateiname `index.html` bleibt)
- Import/Export-Formate, Geschäftslogik, Berechnungen, Validierungen
- Bestehende Funktionen: nichts entfernen, nichts stillschweigend weglassen

**Würde eine Änderung einen Eingriff in diesen Bereich verlangen: STOPP, dem Auftraggeber erklären und auf seine
Entscheidung warten.**

## Pflichtprüfungen vor jedem Commit

```bash
node tests/protected/fingerprint.mjs
```

```bash
cd tests && npm install && npm test
```

- `fingerprint.mjs` muss „Schutzbereich unverändert“ melden. Die Baseline (`tests/protected/baseline.txt`) wird nur
  nach ausdrücklicher Freigabe mit `--update` neu geschrieben.
- Alle E2E-Tests grün (mindestens so grün wie in `docs/BASELINE.md`), keine neuen Konsolenfehler.
- Nie gegen Produktivdaten arbeiten. Tests laufen nur gegen den Firebase-Emulator mit synthetischen Testdaten;
  echte Firebase-Server sind im Test blockiert. Keine echten Zugangsdaten verwenden oder speichern.

## Arbeitsregeln

- Redesign: nur die Darstellungsschicht ändern. Komponenten bekommen dieselben Daten und Props wie vorher;
  Datenabrufe, Zustände (useState/useEffect mit Daten), Handler bleiben, wie sie sind.
- IDs und Texte, auf die sich Tests stützen (`#add-name`, `#add-pos`, `#add-email`, Navigationstexte,
  Button-Texte wie „Entwurf speichern“, „Abschließen“), bleiben erhalten oder die Tests werden mit Begründung angepasst.
- Kleine Commits, je Commit ein abgegrenzter Schritt, einzeln rücknehmbar. Nie direkt auf `main` arbeiten.
- Keine Abhängigkeiten aktualisieren oder entfernen, außer es ist für das Design nötig (dann vorher fragen).
- Designsystem: `docs/design-transfer/` (n.Org). Regeln: keine neuen Hex-Farben, keine Schriftgrößen außerhalb der
  Skala, kein neuer Radius, Überschriften NW-Blau, kein Orange, `prefers-reduced-motion` respektieren, WCAG AA.

## Neue Features (nach dem Redesign)

Jeweils eigener Branch. Datenänderungen nur rückwärtskompatibel: neue Felder optional, bestehende Felder nie
umbenennen oder löschen, Migrationen umkehrbar, bestehende Daten müssen unverändert laden. Neue Funktionen wenn
möglich hinter einem Schalter, der standardmäßig aus ist.

## Notfall

Sicherungen und Wiederherstellung: `NOTFALL-BACKUP.md`.
