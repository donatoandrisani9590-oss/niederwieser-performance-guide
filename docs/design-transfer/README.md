# n.Org Designsystem: Übergabepaket

Alles, was nötig ist, um das Designsystem von **n.Org** (Org-Chart-Manager der Niederwieser-Gruppe)
inklusive Logo auf eine **andere, bestehende App** zu übertragen. Stand 08.11.2026.

## Inhalt

| Pfad | Was | Wofür |
|---|---|---|
| [`ANALYSE.md`](ANALYSE.md) | Gesamtanalyse: Stack, Prinzipien, Logo, Tokens, Bausteine, Shell, Interaktion, Engines & Features, Übernahmeplan | **zuerst lesen** |
| [`design-system.md`](design-system.md) | Vollständige Pixel-Spezifikation (2.700 Zeilen, Stand 23.09.2026; Tokens bis heute unverändert) | Nachschlagen beim Umbau |
| [`tokens/tailwind.config.ts`](tokens/tailwind.config.ts) · [`tokens/index.css`](tokens/index.css) · [`tokens/postcss.config.js`](tokens/postcss.config.js) | Original-Dateien für **Tailwind 3** | 1:1 übernehmen / mergen |
| [`tokens/tailwind-v4-theme.css`](tokens/tailwind-v4-theme.css) | Dieselben Tokens für **Tailwind 4** (`@theme`), geprüft mit v4.1.13 | Ziel-App mit Tailwind 4 |
| [`tokens/tokens.css`](tokens/tokens.css) | CSS-Variablen + Grundregeln | Ziel-App **ohne** Tailwind |
| [`tokens/tokens.json`](tokens/tokens.json) | W3C-Design-Tokens (DTCG) | Style Dictionary, Figma Tokens, MUI-/Chakra-Theme |
| [`assets/nw-logo.svg`](assets/nw-logo.svg) | Wortmarke Niederwieser (Blau + Grün) | Seitenleiste oben links, 196 px |
| [`assets/favicon.svg`](assets/favicon.svg) | App-Signet „n“ | Favicon, App-Icon |
| [`assets/logoPaths.ts`](assets/logoPaths.ts) | Logo-Pfade als TS-Konstante | SVG/PDF-Erzeugung ohne Asset-Import |
| [`kit/`](kit/) | 21 Dateien mit React-Bausteinen und Hooks + Motion-Helfer, kompilieren eigenständig, Anleitung in [`kit/README.md`](kit/README.md) | direkt in die Ziel-App kopieren |
| [`preview.html`](preview.html) | Visuelle Referenz (Farben, Schrift, Knöpfe, Chips, Karten, Shell) ohne Build | im Browser öffnen, als Soll-Bild |

## So nutzt du das Paket im anderen Claude-Projekt

1. Den Ordner `design-transfer/` in das Repository der Ziel-App kopieren (z. B. nach `docs/design-transfer/`).
2. In Claude Code im Ziel-Projekt diesen Auftrag einfügen:

```text
Im Ordner docs/design-transfer/ liegt das Designsystem einer anderen App (n.Org, Niederwieser).
Gestalte diese App vollständig auf dieses Designsystem um.

Vorgehen:
1. Lies docs/design-transfer/README.md und ANALYSE.md vollständig, design-system.md nach Bedarf.
   Öffne preview.html als Soll-Bild.
2. Erfasse den Ist-Stand dieser App: Stack, Styling (Tailwind-Version oder anderes),
   Komponentenbibliothek, Router, i18n, Icons, Seitenstruktur. Zeig mir eine kurze Zuordnung
   „bestehender Baustein/Screen → n.Org-Baustein/Layoutmuster A–E“, bevor du umbaust.
3. Setze danach ANALYSE.md §11 Phase für Phase um:
   Fundament (Inter, Tokens passend zur Tailwind-Version, Logo/Favicon) → Bausteine aus kit/
   (Shims useT/uiStore an unseren Router und unser i18n anbinden) → Shell (Seitenleiste links,
   Logo oben links, kein Top-Header) → Screens (je ein Layoutmuster, eine Primäraktion,
   vier Zustände) → Feinschliff (Bewegung, Toasts, Tastatur).
4. Fachlogik, Datenmodell und APIs dieser App bleiben unverändert. Nur Oberfläche und Design.
5. Regeln: keine neuen Hex-Farben, keine Schriftgrößen außerhalb der Skala, kein neuer Radius,
   alle Überschriften NW-Blau, Orange gibt es nicht, reduced-motion respektieren, WCAG AA.
6. Prüfe am Ende gegen die UX-Prüfliste in design-system.md §7.7 und die Abnahme in
   ANALYSE.md §11 und zeig mir Screenshots vorher/nachher.
```

3. Entscheidungen, die du vorher treffen solltest (ANALYSE.md §11, letzter Abschnitt): Dark Mode ja/nein,
   Mobile-Unterstützung, und ob das Niederwieser-Logo in der Ziel-App passt.

## Was bewusst nicht im Paket ist

Druck-Engine (A3-Layout, SVG/PDF), Stellenmodell, BRC-Prüfungen, Excel-Import, KI-Assistent-Logik,
Server. Diese sind fachlich an n.Org gebunden; ANALYSE.md §10 beschreibt sie und sagt je Engine,
welches Muster sich trotzdem übertragen lässt.
