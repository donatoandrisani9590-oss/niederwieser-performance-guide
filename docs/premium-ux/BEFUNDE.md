# Premium-UX: priorisierte Befundliste

Stand: 23.11.2026 · Branch `feature/premium-ux` (von `feature/rollen-und-freigaben`, Commit `3cc3070`)

Grundlage: alle drei Rollen in der lokalen Vorschau durchgespielt (Emulator, nur Testdaten), Desktop 1440 px und
schmale Ansicht, dazu Code-Durchsicht. Ausgangslage: 57 von 57 Tests grün, Schutzbereich unverändert,
**keine Konsolenfehler** in allen Abläufen.

**Prio:** P1 = falsches Bild oder Fehlbedienung wahrscheinlich · P2 = stört den Ablauf · P3 = Feinschliff.
**Aufwand:** S = unter 1 Stunde · M = halber Tag · L = ein Tag oder mehr.
**Schutzbereich:** *nein* = reine Darstellung, setze ich um · *ja* = berührt Speichern, Anmeldung, Berechnung oder
Kennzahlen, wartet auf deine Freigabe.

## A. Ohne Schutzbereich (wichtigste zuerst)

**Stand 23.11.2026:** erledigt sind U1 bis U12 und U15. Offen ist U14.
Details im [Übergabebericht](UEBERGABE.md).

| # | Rolle | Stelle | Problem | Vorschlag | Prio | Aufwand |
|---|---|---|---|---|---|---|
| U1 ✅ | alle | jeder Seitenwechsel | Der Inhaltsbereich behält die alte Scroll-Position. Eine Selbstreflexion öffnete sich bei Pixel 941, der Beurteilungsbogen mitten im Kopf. Man landet irgendwo und sucht den Anfang | Bei jedem Wechsel der Ansicht nach oben springen | P1 | S |
| U2 ✅ | Führungskraft | Dashboard „Meine offenen Punkte“, Team-Übersicht, Kennzahl „Überfällig“ | Ein Gespräch mit Datum **heute** gilt sofort als „überfällig“ (rot, oberster offener Punkt). Der Vergleich nimmt Mitternacht gegen die aktuelle Uhrzeit. Speichert man einen Entwurf, steht direkt danach ein falscher Alarm da | „Überfällig“ erst ab dem Folgetag, heute heißt „Gespräch heute“. Nur Anzeige, gespeichert wird nichts anders | P1 | S |
| U3 ✅ | alle | 27 Rückfragen und 5 Eingaben über Browser-Fenster (`confirm`, `prompt`, `alert`) | Graue Systemfenster mit „OK / Abbrechen“, die Aktion steht nur im Text („OK = trotzdem abschließen“). Blockieren den ganzen Tab, sehen auf jedem Gerät anders aus, auf dem Handy abgeschnitten. Offen als A3 in §11 | Ein einheitlicher n.Org-Dialog: Titel, Liste der offenen Punkte, klar beschriftete Knöpfe („Trotzdem abschließen“ / „Weiter bearbeiten“), rot bei endgültigem Löschen, Namensfeld mit Live-Prüfung beim Entfernen, Esc und Enter, Fokus gefangen | P1 | L |
| U4 ✅ | Führungskraft, Mitarbeiter | Bögen | Dieselbe Aktion heißt dreimal anders: „Entwurf speichern“ / „Speichern“ / „Als Entwurf speichern“ und „Abschließen“ / „Fertig & abschließen“ bzw. „Abschließen & Senden“ / „Fertig & senden“ / „Selbstreflexion abschicken“. Dazu Emojis in Knöpfen (💾, ✓) | Je Aktion ein Wort, überall gleich. Emojis durch Icons ersetzen | P2 | S |
| U5 ✅ | alle | Rückmeldungen (Toasts) | „Bewertung abgeschlossen gespeichert!“, „Bewertung (Entwurf) gespeichert!“: holprig, „Bewertung“ statt „Beurteilung“, Ausrufezeichen. Nach „Gespräch geführt“ kein „Rückgängig“ | Klare Sätze („Beurteilung für Emil Probe abgeschlossen“). Toast mit Aktionsknopf „Rückgängig“ dort, wo ein vorhandener Umschalter es ohne neue Datenzugriffe erlaubt (Gespräch geführt, Zielgespräch geführt) | P2 | M |
| U6 ✅ | Führungskraft | Team-Übersicht auf dem Handy | Die Status-Matrix ist 961 px breit in 458 px. Beurteilung, Ziele und das Menü liegen unsichtbar rechts, kein Hinweis auf das Wischen. Bei 390 px ließ sich das ⋯-Menü im automatischen Durchlauf nicht öffnen. Ursache gefunden und behoben: Das Menü ragte unten aus dem Bildschirm, der letzte Eintrag „Entfernen“ war abgeschnitten (auch in unteren Zeilen am Desktop) | Unter 768 px je Mitarbeiter eine Karte mit denselben Zellen und Aktionen untereinander | P2 | M |
| U7 ✅ | Führungskraft | Nutzerkarte unten links | „Anna Te…“ und „Führungskr…“ abgeschnitten, weil „Abmelden“ als Text daneben steht | Abmelden als Icon-Knopf mit Beschriftung beim Darüberfahren, Name und Rolle voll lesbar | P3 | S |
| U8 ✅ | HR | HR-Dashboard, Reiter | Fünf Reiter mit Emojis (🔔 ⚖️ 🕸️ 📋 💾), vier mit Icons. Kennzahl-Titel „⚠ ÜBERFÄLLIG!“ | Durchgehend Icons, ruhige Titel | P3 | S |
| U9 ✅ | Führungskraft | Team-Übersicht mit Schalter `shareWithEmployee` | Nach dem Teilen geänderte Beurteilung weicht still von der geteilten Fassung ab (F3 in §11) | Hinweis „Seit dem Teilen geändert“ mit „Erneut teilen“ (ruft die vorhandene Teilen-Funktion auf) | P2 | S |
| U10 ✅ | alle | Fachbegriffe GPS, WAS, WIE, BARS | Ohne Erklärung an Kennzahlen und Chips (A5 in §11) | Kurze Erklärung beim Darüberfahren und bei Tastaturfokus, einheitlicher Baustein | P3 | M |
| U11 ✅ | Führungskraft | Selbstreflexion ansehen | Drei „Zurück“-Knöpfe, aber kein nächster Schritt | Ein „Zurück zum Team“, dazu „Beurteilung starten/fortsetzen“ als Hauptaktion | P2 | S |
| U12 ✅ | Führungskraft | Dashboard unter der Falz | Für Führungskräfte mit Team folgen lange Erklärblöcke (Werte, Kompass, BARS, Jahreszyklus), die es in „Anleitung“ und „GPS Formel“ schon gibt | Wie der Schnellstart-Guide einklappbar, offen für neue Nutzer. Nichts wird entfernt | P3 | S |
| U15 ✅ | Führungskraft | Dashboard, Jahreskalender | Der aktuelle Monat ist markiert, hervorgehoben ist aber fest „Q1: Ziele“, auch im November | Die Phase hervorheben, in der der aktuelle Monat liegt (Q1, Q2–Q3, Q4) | P3 | S |
| U13 (kein Befund) | Mitarbeiter | Willkommensseite des Links | Knopf „Zurück zur App“: Nachgeprüft, er erscheint schon heute nur für angemeldete Führungskräfte. Ich hatte ihn gesehen, weil ich im selben Browser noch angemeldet war | nichts zu tun | – | – |
| U14 | IT, EN | rund 220 Textstellen | Nur Deutsch und Englisch hinterlegt, Italienisch zeigt dann Englisch. Der Lösch-Dialog nennt auf IT/EN noch „endgültig“, obwohl es den Papierkorb gibt (A6 in §11) | Sichtbarste Stellen zuerst (Dialoge, Toasts, Matrix), Rest als Liste für eine eigene Runde | P2 | L |

## B. Berührt den Schutzbereich (wartet auf deine Entscheidung, nichts davon ist umgesetzt)

| # | Rolle | Stelle | Problem | Vorschlag | Was berührt wäre |
|---|---|---|---|---|---|
| S1 ✅ | Führungskraft | Bogen, Knopf „Speichern“ | Zwischenspeichern wirft zurück in die Team-Übersicht. Wer mitten im Gespräch sichert, muss den Bogen neu öffnen und seine Stelle suchen | „Speichern“ bleibt im Bogen und zeigt „Gespeichert · 14:32“. Verlassen nur über „Abschließen“ oder „Schließen“ | Ablauf nach dem Speichern im Speicher-Handler |
| S2 ✅ | Führungskraft | Team-Übersicht, Kennzahl „Ø GPS-Score“ | Ein eben angelegter Entwurf mit Vorgabewerten (GPS 2,00) zieht den Team-Durchschnitt von 3,8 auf 3,2 | Durchschnitt nur über abgeschlossene Beurteilungen | Kennzahl |
| S3 ✅ | HR | HR-Dashboard „Fortschritt“ | „150 % Reviews“ bei „Alle Jahre“ (6 Beurteilungen auf 4 Mitarbeiter) | Anzahl statt Prozent, oder Prozent nur bei gewähltem Jahr | Kennzahl |
| S4 | alle | Anmeldung | Kein „Passwort vergessen?“. Heute geht das nur über HR mit dem Schalter `userAdmin` | Link, der die Reset-Mail von Firebase auslöst | Anmeldung (neuer Auth-Aufruf) |
| S5 | Führungskraft | Termin löschen, E-Mail ergänzen | „Rückgängig“ bräuchte hier einen neuen Schreibzugriff | Toast mit „Rückgängig“, der den alten Wert zurückschreibt | neuer Datenzugriff |
| S6 | HR | unter jedem Reiter | Unter Papierkorb, Benutzer, Backup und Versionen steht weiter die ganze Beurteilungsliste samt „GPS für alle neu berechnen“ | Liste und Sammelaktion nur in „Übersicht“ | Sichtbarkeit einer HR-Funktion |
| S7 ✅ | Führungskraft | geteilte Mitarbeiter (Kennzeichen „Geteilt“) | „Als geführt markieren“, „Termin planen“ und der Zielgespräch-Haken schreiben in `teamMembers`. Die eingespielten Regeln erlauben das nur der Besitzer-Führungskraft und HR (war in den alten Regeln schon so). Bisher schlug der Klick **still** fehl, jetzt erscheint „Speichern fehlgeschlagen“ | Entweder die Regeln erlauben geteilten Führungskräften genau diese Felder, oder die Aktionen sind bei geteilten Mitarbeitern gesperrt mit Grund („nur die zuständige Führungskraft“) | Sicherheitsregeln bzw. Sichtbarkeit einer Funktion |
| S8 ✅ | HR | HR-Dashboard, Kennzahl „Fertig“ | „8/5 Fertig“ bei „Alle Jahre“: mehr erledigte als gezählte Unterlagen (gleiche Ursache wie S3) | zusammen mit S3 klären | Kennzahl |
| M5 | Mitarbeiter | Selbstreflexion | „Geplanter Bonus“ und „Final GPS 2,00“ vor jeder Eingabe (bekannt aus §11) | Im Mitarbeiterbogen ausblenden oder erst nach dem Ausfüllen zeigen | Inhalt des Bogens |

## C. Geprüft und in Ordnung

- Anmeldung, Abmeldung, Sitzung nach Neuladen, Rollen-Navigation (Führungskraft, HR, Zusatzrechte).
- Status-Matrix mit hervorgehobenem nächsten Schritt je Zeile, Jahreswähler, Zielübernahme mit Hinweis.
- Abschnittsleiste im Bogen bleibt sichtbar und zeigt den aktuellen Teil.
- Mitarbeiter-Link: Willkommen, automatische Speicherung mit Hinweis, Abschluss-Kasten am Ende.
- HR: Jahresfilter mit Anzahl je Jahr, Papierkorb, Benutzerliste mit Filtern, Backup-Zahlen.
- Offline-Hinweis, Fokusfalle und Esc in Dialogen, `prefers-reduced-motion`.
