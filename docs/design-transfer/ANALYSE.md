# n.Org: Analyse von Frontend, Designsystem, Engines und Features

> Stand: 08.11.2026 · Branch `audit/2026-09-23` · Commit `512fcdf`
> Zweck: Grundlage, um das Designsystem von n.Org (inkl. Logo) in eine **andere,
> bereits bestehende App** zu übernehmen. Ausführliche Pixel-Spezifikation:
> [`design-system.md`](design-system.md) (Stand 23.09.2026, Token-Teil unverändert gültig).
> Was seitdem dazukam, steht in §9.

---

## 1. Kurzfassung

n.Org ist der Org-Chart-Manager der Niederwieser-Gruppe: eine React-19-App, die
Organigramme pflegt und als BRCGS-konformes A3-Blatt (PDF) ausgibt. Die Oberfläche
folgt einer klaren, kleinen Designsprache, dem **„ruhigen Werkzeug“**:

- **Eine Akzentfarbe** (NW-Blau `#243186`) auf **warmem Beige** (`#F4F2EE`), weiße Flächen, warme Rahmen.
- **Inter**, 14 px Body, **feste Skala mit 8 Stufen** (die Tailwind-Standardgrößen sind abgeschaltet).
- **Ein** Button-Set, **ein** Icon-Set (Lucide-Pfade inline), **drei** Schatten, Radien 7/8 · 10 · 12 · full.
- **Kein Top-Header**: schwebende Seitenleiste links mit dem Logo oben links.
- **Kein Komponenten-Framework**: eigene Bausteine (`src/ui/components/`), Tailwind 3 als einzige Styling-Schicht, keine CSS-Variablen, kein Dark Mode.
- **Bewegung ohne Bibliothek**: CSS-Keyframes und die Web Animations API, jede Animation mit kürzerem Abgang, unter `prefers-reduced-motion` aus.

**Übertragbar** sind Tokens, Logo, Bausteine, Shell-Anatomie, Layoutmuster, Interaktions-
und Feedbackregeln sowie einige Architekturprinzipien. **Nicht übertragbar** (domänenspezifisch)
sind die Druck-Engine (A3-Layout, SVG/PDF), das Stellenmodell, BRC-Prüfungen, Import und Assistent.

---

## 2. Technischer Frontend-Stack

| Bereich | Wahl | Bemerkung für die Übernahme |
|---|---|---|
| Framework | **React 19.2**, `StrictMode` | Bausteine nutzen `forwardRef`, `createPortal`, Hooks; keine Server Components |
| Build | **Vite 8**, TypeScript 6 (`strict`) | Bausteine sind Framework-neutral genug für Next.js / Remix (nur `'use client'` nötig) |
| Styling | **Tailwind CSS 3.4** + PostCSS + Autoprefixer | Für Tailwind 4: `tokens/tailwind-v4-theme.css` (geprüft mit v4.1.13) |
| Schrift | `inter-ui` (npm, lokal gebündelt) | `import 'inter-ui/inter-latin.css'` – kein CDN |
| State | **Zustand 5** | Kit braucht nur einen Mini-Store für Toast/Navigation (Shim liegt bei) |
| Routing | **eigener Hash-Router** (`#/<screen>/<gesellschaft>`) | In der Ziel-App durch deren Router ersetzen |
| i18n | eigene Kataloge (DE/IT/EN/ES), `useT()` | Kit-Shim mit den deutschen Texten liegt bei |
| Icons | Lucide-Pfade **inline** in `Icon.tsx` (53 Glyphen) | kein Paket; erweiterbar durch weitere Lucide-Pfade |
| Animation | CSS + WAAPI (`motion.ts`), **keine** Motion-Bibliothek | ADR 0008 |
| Tests | Vitest 4, Testing Library, jsdom, fast-check | Bausteine haben a11y-Tests im Original |
| Schwere Bibliotheken | jsPDF, svg2pdf, SheetJS, qrcode, WebLLM: **nur nachgeladen** | Muster „Lazy Screens + Skeleton“ übertragbar |

---

## 3. Designprinzipien (verbindlich in n.Org)

1. **Eine Handlung pro Blick**: genau eine gefüllte `primary`-Aktion je Ansicht; Sekundäres umrandet; der Rest im `⋯`-Menü.
2. **Kontext statt Navigation**: Kontext (bei n.Org die Gesellschaft) wird oben in der Seitenleiste umgeschaltet; keine Brotkrumen.
3. **Ruhe durch System**: keine neue Hex-Farbe, keine neue Schriftgröße, kein neuer Radius.
4. **Erklären, wenn gefragt**: Tooltip oder Empty State statt Dauertext unter Überschriften.
5. **Das Werkstück ist der Held**: Hauptinhalt (bei n.Org das A3-Blatt) in voller Breite, Werkzeuge schweben.
6. **Wohlfühlen durch Feedback**: Speichern sichtbar, Erfolg quittiert, weiche Übergänge (150–200 ms).

Dazu: **Alle Überschriften sind NW-Blau, nie Schwarz.** **Sperren statt Verstecken**
(gesperrte Aktionen bleiben sichtbar, Grund im `title`). **Vier Zustände je Ansicht**
(Lädt als Skeleton, Leer, Fehler, Inhalt).

---

## 4. Marke & Logo

| Asset | Datei | Inhalt |
|---|---|---|
| Wortmarke | [`assets/nw-logo.svg`](assets/nw-logo.svg) | „NIEDERWIESER“ + „Flexible Food Packaging“, **2 Pfade**: NW-Blau `#243186` und NW-Grün `#6EBD84`. viewBox `0 0 453.543 150.236` (≈ 3,02 : 1). Aus `06_Niederwieser-LmP_CMYK.pdf`, RGB normiert |
| Logo als TS-Konstante | [`assets/logoPaths.ts`](assets/logoPaths.ts) | dieselben Pfade als `NW_LOGO` (für SVG-Erzeugung ohne Asset-Import, z. B. PDF/Server). Erzeugt mit `scripts/genLogo.mjs` |
| Favicon / App-Signet | [`assets/favicon.svg`](assets/favicon.svg) | 32×32, NW-Blau-Quadrat (Radius 7), weißes „n“ in Inter 600, darunter grüner Balken (18 × 2,5, rund) |

**Verwendung in der App**

- **Immer oben links** als erste Zone der Seitenleiste, Breite **196 px** (`w-[196px]`), Zone `px-4 pt-4 pb-3`, darunter eine Haarlinie (`mx-4 mb-2 border-line-2`). Groß genug, dass „Flexible Food Packaging“ lesbar bleibt.
- Klick aufs Logo führt zur Startseite. In der eingeklappten Leiste (84 px) ersetzt der runde Start-Knopf das Logo.
- Kein Top-Header, also nie ein zweites Logo oben.
- Im Druck (A3): rechts oben, Höhe 10,6 mm.
- In n.Org steht das Logo nur auf Weiß und immer in Originalfarben (Empfehlung für die Ziel-App: nicht umfärben, nicht stauchen, nicht auf farbige Flächen setzen).
- Einbindung im Original: `import logoUrl from '../assets/nw-logo.svg'` → `<img src={logoUrl} alt="Niederwieser — Flexible Food Packaging" className="h-auto w-[196px] max-w-full" />`.

---

## 5. Tokens: Kurzreferenz

Vollständig in [`tokens/`](tokens/): `tailwind.config.ts` (Original, Tailwind 3), `index.css` (Original),
`tailwind-v4-theme.css`, `tokens.css` (CSS-Variablen), `tokens.json` (W3C-DTCG).

### Farben

| Rolle | Token | Wert |
|---|---|---|
| Seite | `panel` | `#F4F2EE` |
| Fläche | `white` | `#FFFFFF` |
| Rahmen | `line` / `line-2` | `#E4E0DA` / `#EEEBE6` |
| Überschrift, Primär, Fokus | `nw-blue` | `#243186` (Hover `nw-blue-90` `#3A46A0`) |
| Blau-Abstufungen | `nw-blue-25` / `-12` / `-06` | `#C9CDE3` / `#E6E8F2` / `#F2F3F8` |
| Akzent | `nw-green` / `-15` | `#6EBD84` / `#E8F5EC` |
| Warmes Grau | `nw-grey` / `-40` | `#D7CFC5` / `#F3F0EC` |
| Text | `ink` / `ink-60` / `ink-40` | `#1C1F2E` / `#5F6377` / `#8B8FA1` (ink-40 nur Meta, 3,2:1) |
| Status Text/Fläche | `ok` `warn` `danger` (+`-bg`) | `#2F7A48`/`#E8F5EC` · `#9A6414`/`#FBF1DD` · `#9B2C22`/`#FBECEA` |
| Ampel (nur Flächen) | `traffic-red` / `traffic-amber` / `nw-green` | `#E50046` / `#F59D24` / `#6EBD84` |
| Overlay | `ink/30` | `rgba(28,31,46,.30)` |

**Orange gibt es nicht** (Corporate-Vorgabe). Amber/Warn nur als App-Status, nie im Druckbild.

### Typografie

| Klasse | px / Zeile | Rolle |
|---|---|---|
| `text-2xs` | 11 / 14 | Eyebrow (Versalien, +7 %), Tag, Chip |
| `text-xs` | 12 / 16 | Label, Caption, Meta |
| `text-sm` | 13 / 18 | Sekundär, Tabellenzelle, Menü, Input |
| `text-base` | **14 / 20** | **Body**, Tabs, H2 (Pane-Titel) |
| `text-md` | 15 / 20 | H3 (Dialogtitel) |
| `text-lg` | 17 / 24 | Zwischentitel |
| `text-xl` | 22 / 28 | **H1** (Seitentitel, `tracking-[-.014em]`), Kennzahl |
| `text-2xl` | 26 / 32 | Reserve |

Gewichte nur 400 / 500 (Bedienelemente) / 600 (Überschriften, Labels). Body mit
`font-feature-settings: 'cv11','ss01'`, Zahlenkolonnen mit `.tnum`.

### Maße & Effekte

- **Raster** 4 · 8 · 12 · 16 · 24 · 32 (Tailwind-Standardskala). Häufigste: `gap-2`, `px-4`, `py-2`.
- **Bedienhöhen** 28 (sm) · 32 (md, Input, Nav) · 36 (lg, Pillen-Knopf); Chip 24, Tag 18, Dot 8.
- **Radien**: 7/8 Bedienelement · 10 Fläche (`rounded-card`) · 12 Dialog (`rounded-xl`) · full Status.
- **Schatten**: `card` (ruhend) · `float` (alles Schwebende) · `sheet` (Werkstück).
- **Ebenen**: 10 inline · 20 Sidebar · 30 Popover/Menü/Tooltip · 40 Modal · 50 Toast. Alles ab 30 per Portal an `body`.
- **Bewegung**: 150 ms Standard (Hover/Press), Auftritt 180–200 ms, Abgang 120 ms (immer kürzer), Bedeutungswechsel 300 ms, Signature-Moment 650 ms. Easing „Glide“ `cubic-bezier(.2,.8,.2,1)`, Feder `SPRING_EASE` (`linear()`) für WAAPI.
- **Mikrobewegung**: Buttons `hover:scale-[1.02] active:scale-[.97]`, Nav `active:scale-[.98]`, Karten `hover:-translate-y-0.5`; disabled setzt Skalierung immer zurück.
- **Fokus** global `outline: 2px solid #243186; outline-offset: 2px`; Inputs zusätzlich `shadow-[0_0_0_3px_#F2F3F8]`.

---

## 6. Komponenten-Inventar

### 6.1 Im Kit enthalten (`kit/src/ui/…`, kompiliert eigenständig)

| Baustein | Datei | API / Kern |
|---|---|---|
| `Button` | `Button.tsx` | `variant` primary · secondary (Standard) · ghost · danger · danger-primary; `size` sm 28 / md 32 / lg 36; `icon`, `iconRight`, `iconOnly` (dann `aria-label` Pflicht per Typ), `loading` (Spinner, `aria-busy`, Fokus bleibt) |
| `Icon` | `Icon.tsx` | 53 Lucide-Glyphen, 24er-viewBox, Strich 1,9, `currentColor`; ohne Label `aria-hidden` |
| `Chip`, `Tag`, `Dot` | `Badge.tsx` | `Tone` ok · warn · danger · brand · neutral. Chip 24 px rund für **Zustände** (optional klickbar mit `aria-pressed`); Tag 18 px Versalien für **Klassifizierungen**; Dot 8 px Ampel |
| `PageHeader`, `Pane`, `PaneHeader`, `StatCard`, `EmptyState`, `Skeleton`, `Sep` | `Layout.tsx` | Seitenkopf (Eyebrow, H1, Meta, Aktionen rechts), Standardfläche, Kennzahlkarte, Leerzustand, Ladeplatzhalter |
| `Label`, `Hint`, `Toggle`, `SearchField` | `Field.tsx` | Formular-Grundbausteine; Toggle statt nackter Checkbox |
| `SearchSelect` | `SearchSelect.tsx` | Dropdown mit Suche, WAI-ARIA Combobox |
| `Modal`, `DialogButtons` | `Modal.tsx` + `dialogPrimary.ts` + `useFocusTrap.ts` | Portal, Fokusfalle, Esc, Enter = Primäraktion, Abgang 130 ms per Timer |
| `Menu`, `Popover` | `Menu.tsx` | `⋯`-Menü mit Tastatur (↑↓ Home End Esc), freies Panel; Chevron dreht bei `aria-expanded` |
| `Tabs`, `Segmented` | `Tabs.tsx` + `tabPanel.ts` | unterstrichene Tabs (Roving Tabindex) bzw. Pillen-Auswahl |
| `Tip`, `TagTip` | `Tooltip.tsx` + `useDismissible.ts` | Tooltip per Portal |
| `ToolTrack`, `ToolButton`, `ToolDivider`, `StatusItem` | `Toolbar.tsx` | schwebende Werkzeugleiste über dem Werkstück |
| `Toast` | `Toast.tsx` | unten mittig, dunkel (`bg-ink`), Erfolg grün/Fehler rot, Aktionsknopf („Rückgängig“), Live-Region dauerhaft gemountet |
| `PillButton`, `HomeButton`, `BackButton` | `HomeButton.tsx` | Signature-Interaktion: blauer Kreis 36 px weitet sich beim Hover zur Pille, Icon fährt hinaus, Wort herein (300 ms) |
| `NumberTicker` | `NumberTicker.tsx` | Kennzahl zählt einmalig hoch (reduced-motion: sofort) |
| `RequiredMark` | `Required.tsx` | Pflichtfeld-Stern + Fußzeile |
| `ErrorBoundary` | `ErrorBoundary.tsx` | Fehlerseite als EmptyState mit „Neu laden“ / „Zur Übersicht“ |
| Helfer | `shortcut.ts`, `motion.ts` | ⌘/Strg-Beschriftung je OS; `motionAllowed`, `flipElements` (FLIP), `SPRING_EASE`, `GLIDE_EASE` |

Abhängigkeiten zur App sind durch zwei Shims ersetzt: `kit/src/ui/useT.ts` (Texte) und
`kit/src/state/uiStore.ts` (Toast, `go`, Zurück-Verlauf). Details: [`kit/README.md`](kit/README.md).

### 6.2 Nicht im Kit (App-gebunden, als Muster in `design-system.md` beschrieben)

`AppShell` (Seitenleiste), `LanguageMenu` (Flaggen-Pille), `Tour` (Einführung mit Spotlight),
`ShortcutsOverlay` (`?`), `RoleGate`, `GlobalSearch` (⌘K), `AssistantPanel` (⌘J), `AgendaList`,
`StampCeremony` (Freigabe-Stempel), alle Screens und HR-Dialoge.

---

## 7. Shell, Informationsarchitektur, Layoutmuster

**Shell** (`design-system.md` §7.1): kein Top-Header. Links eine weiße, schwebende Karte
(`sticky top-0 h-screen p-3 pr-0`, Karte `rounded-xl border-line bg-white shadow-card`),
**256 px** breit bzw. **84 px** eingeklappt (`transition-[width] duration-200`). Von oben nach unten:

1. Einklapp-Knopf (rund, 24 px, an der rechten Kante)
2. **Logo** (196 px), Haarlinie
3. Pillen-Knöpfe **Start** und **Zurück**, rechts die App-Sprache
4. Suche (öffnet ⌘K), darunter der Assistent-Knopf (⌘J)
5. Navigation mit Eyebrows („Menü“, „Gesellschaft“), Kontext-Umschalter, Untereinträge mit Baumlinie (`ml-[19px] border-l border-line-2 pl-2.5`), Trenner, Zähler-Badges; scrollt intern mit Fade
6. Speicherstatus („✓ Gespeichert · 14:32“) + Rückgängig mit Verlauf, feste Höhe
7. Präsenz (wer noch da ist) und **Nutzerkarte** am Fuß (Avatar mit Verlauf, Rolle, Abmelden im Popover)

Nav-Eintrag: `h-8 px-2.5 rounded-lg text-sm`, ruhend `text-ink-60 hover:bg-nw-grey-40/60 hover:text-ink`,
aktiv `bg-nw-blue-06 font-semibold text-nw-blue` mit `aria-current="page"`. Ausgewählte Zeilen in
Listen (Editor) tragen zusätzlich die Markierung links `shadow-[inset_3px_0_0_#243186]`.

**Informationsarchitektur**: Stufe 1 Anmeldung (ohne Shell) → Stufe 2 Kontextwahl (Shell minimal,
Kartenraster) → Stufe 3 Arbeit in einem Kontext (volle Navigation). Navigation erscheint erst ab Stufe 2.

**Layoutmuster** (jeder Screen genau eins):

| Muster | Aufbau | Beispiel |
|---|---|---|
| A Kartenraster | zentriert `max-w-4xl`, H1 + Satz, Raster `gap-4 sm:grid-cols-2 lg:grid-cols-3`, Raster 60 ms später | Gesellschaftswahl |
| B Kopf + Flächen | `PageHeader` + `Pane`s | Übersicht, Logbuch, Freigabe |
| C Drei Spalten | `xl:grid-cols-[240px_minmax(0,1fr)_316px]`, Detail sticky | Editor |
| D Zwei Spalten | `xl:grid-cols-[400px_minmax(0,1fr)]` | Einstellungen |
| E Vollfläche | Werkstück voll, Toolbar schwebt in 3 Gruppen | Chart |

Desktop-first, sparsame Breakpoints (Tailwind-Standard), keine mobile Navigation.

---

## 8. Interaktions- und Feedbackregeln

- **Tastatur**: ⌘K Suche · ⌘J Assistent · `?` Tastenübersicht · Esc schließt die oberste Ebene · Tab im Dialog gefangen · Enter = Primäraktion · Pfeile in Menü/Combobox/Tabs.
- **Vier Feedback-Kanäle, nie doppelt**: Toast (abgeschlossene Handlung) · Statuszeile (Dauerzustand) · Chip/Tag (Objektzustand) · Banner (Systemlage).
- **Rückgängig**: Toast mit „Rückgängig“-Knopf (8 s Standzeit), Verlaufsmenü der letzten 10 Schritte.
- **Sperren statt Verstecken**, **Dialoge global** (aus der Seitenleiste, nicht pro Seite dupliziert).
- **Belohnende Momente**, jeder genau einmal, alle unter reduced-motion aus: Werkstück gleitet ein (`sheet-enter`), Freigabe-Stempel (`stamp-in` + `ink-pulse` + `dissolve`), Lichtlauf über frische Karte (`shine-sweep`), Ampelpunkt atmet einmal (`attention`).
- **Barrierefreiheit**: Kontrast AA (ink-40 nur Meta), Icon-only mit `aria-label` (per Typ erzwungen), Live-Regionen dauerhaft gemountet, Fokus kehrt zum Auslöser zurück, Combobox/Tabs/Menü nach WAI-ARIA.

UX-Prüfliste vor jedem Merge: `design-system.md` §7.7.

---

## 9. Neu seit der Design-Doku (23.09. → 08.11.2026)

Tokens, `index.css` und alle Basisbausteine sind seit dem 23.09. **unverändert** (geprüft per `git diff`).
Neu dazugekommen und in `design-system.md` noch nicht beschrieben:

| Element | Muster |
|---|---|
| **KI-Assistent-Panel** (⌘J) | `fixed inset-y-0 right-0 z-40 w-full max-w-[420px] animate-pop-in flex-col border-l border-line bg-white shadow-float`. Verlauf `bg-panel px-4 py-4`. Nutzer-Blase `rounded-xl rounded-tr-sm bg-nw-blue text-white`, Antwort-Blase `rounded-xl rounded-tl-sm border shadow-card`. Vorschlagskarte `rounded-xl border-nw-blue-25 bg-white p-3 shadow-card` mit Vorher/Nachher und „Übernehmen“. Vorschlagsknöpfe gestrichelt (`border-dashed border-nw-blue-25 bg-white/70 text-xs text-nw-blue`). Tipp-Indikator: drei pulsierende Punkte (`bg-nw-blue/60`, Verzögerung 0/150/300 ms), Schreibmaschinen-Cursor |
| **Assistent-Knopf** in der Seitenleiste | `h-8 rounded-lg border-nw-blue-25 bg-nw-blue-06 text-nw-blue` mit `sparkles`-Icon und `kbd` „⌘J“ (`border-nw-blue-25 bg-white text-2xs`) |
| **„Was steht an“** (Agenda-Liste) | Tag je Dringlichkeit (überfällig = danger, bald = warn, später = neutral) + Satz + Knopf `secondary sm`; als Karte auf der Übersicht und kompakt im Chat; Zähler-Badge am Nav-Eintrag |
| **Präsenz** | bis zu 3 Initialen-Kreise `h-5 w-5 rounded-full border-white bg-nw-green text-[9px]`, überlappend (`-space-x-1.5`), Text `text-2xs text-ink-40`, Namen im Tooltip |
| **Live-Abgleich-Toasts** | „Aktualisiert: Änderungen von …“ (info), „… zusammengeführt“ (success) |
| **Druckinhalte-Popover** | Popover in der Chart-Toolbar mit Toggles je Blattinhalt |

---

## 10. Engines und Features

| Engine / Feature | Ort | Was sie tut | Übertragbar? |
|---|---|---|---|
| **Datenmodell** (stellenbasiert, SAP-OM-Logik) | `src/domain/model/` | Gesellschaften, Standorte, Abteilungen, Stellen, Personen, Zuordnungen mit Gültigkeit; `parseProjectFile` als einzige Eingangsprüfung | Muster ja (eine Parse-Funktion als Tor) |
| **Berichtslinien-Ableitung** | `src/domain/reporting/` | berechnet statt gepflegt: Ausnahme → Abteilungsleitung → Abteilungsbaum → Wurzel; `buildOrgTree` | nein (domänenspezifisch) |
| **Edit-Engine** + Undo | `src/domain/editing/edits.ts`, `state/draftStore.ts`, `state/projectStore.ts` | jede Aktion ist ein `Edit` (reine Funktion), Ketten alles-oder-nichts, 20 Undo-Schritte, Logbuch nur anhängend | **Muster ja** (Command-Pattern + Undo-Stapel) |
| **Konflikt & Live-Sync** | `state/liveSync.ts`, `io/local/LocalFileAdapter.ts` | ETag/If-Match, bei 412 Edits auf neuem Stand nachspielen, Polling übernimmt fremde Stände, Präsenz | Muster ja |
| **Layout-Engine** (A3) | `src/layout/` | Reingold-Tilford (`d3-hierarchy`), Paginierung, Ein-Blatt-Kompaktierung vs. Zonen-Kandidat, Füllen, deterministische Textmessung über `fontMetrics.json` (Arial) | nein |
| **Render-Engine** | `src/render/` | A3-Blatt als SVG-String (viewBox 420×297 mm), Kopf, Fußzone, Rollenregister, Legende; eine Quelle für Schirm und PDF | Prinzip ja („eine Quelle für Vorschau und Export“) |
| **PDF-Export** | `src/pdf/` | jsPDF + svg2pdf, Helvetica, nachgeladen | ja, falls PDF gebraucht |
| **Prüf-Engines** | `src/domain/brc/`, `domain/validation/`, `layout/displayLogic.ts` | BRCGS-Pflichtprüfungen als Ampel, Stammdatenprüfung, Darstellungsbefunde | Ampel-UI ja, Regeln nein |
| **Versionierung & Freigabe** | `src/domain/versioning/` | Fassung festhalten (tief eingefrorener Snapshot), Changelog, Freigabe-Workflow, Sperrlogik | Muster ja (Entwurf → Fassung → Freigabe) |
| **Fristen-Engine** „Was steht an“ | `src/domain/agenda/` | vergleicht Aushang mit heute: veraltet, anstehende Vorgänge (60 Tage), jährliche Prüfung, wartende Freigabe | Muster ja |
| **HR-Kennzahlen, Vertretungsvorschläge, Personalvorgänge** | `src/domain/hr/` | KPIs je Gesellschaft, Vorschläge für Vertretungen, Assistent für Eintritt/Austritt/Wechsel | nein |
| **Excel-Import** | `src/import/` | Blatt erkennen → Spalten profilieren → Zuordnung vorschlagen → Struktur → Abgleich → Diff → Übernahme; Excel-Export und -Sicherung | Wizard-Muster ja |
| **KI-Assistent** | `src/domain/assistant/`, `server/assistant.ts`, `io/assistant/localLlm.ts` | Regel-Parser DE/IT/EN (115-Sätze-Korpus, 100 %), optional Server-LLM (Azure OpenAI / Foundry-Claude) oder lokale KI im Browser (WebLLM, Qwen2.5-1.5B). Modell liefert nur Absichten, Anwendung erst nach „Übernehmen“ | UI-Muster ja, Logik nein |
| **Teilen & Gastansicht** | `server/core/handlers.ts`, `ui/hr/ShareDialog.tsx` | Token-Links mit Ablauf, QR-Code, zugeschnittene Daten, Rückmeldungen (Inbox) | Muster ja |
| **Datenschutz** | `src/domain/privacy/` | Anonymisieren ehemaliger Mitarbeitender | nein |
| **Auth** | `src/io/auth/` | `MockAuth` (Dev), `EntraAuth` (Microsoft Entra ID / SWA) hinter einem Adapter | Muster ja |
| **Server/Betrieb** | `server/`, `api/` | ein Server-Kern für Dev-Middleware, Node-Server (App Service) und Azure Functions (Static Web Apps Free), Blob Storage, Excel-Sicherung nach SharePoint | nein |
| **i18n** | `src/i18n/` | UI in DE/IT/EN/ES, Blattsprache getrennt, Pluralregeln | Muster ja |

**Übertragbare Architekturprinzipien**: Schichtregel mit Prüfskript (`scripts/checkLayers.mjs`:
`domain` ohne Pakete und ohne React; React nur in `ui`), Adapter-Naht für Ablage und Anmeldung
(`io/adapters.ts`), kein `localStorage` für Nutzdaten, schwere Bibliotheken nur nachladen,
Lazy Screens mit Skeleton, ADRs für tragende Entscheidungen (`docs/adr/`).

---

## 11. Übernahme in eine bestehende App: Vorgehen

**Phase 0: Bestandsaufnahme der Ziel-App.** Stack (React? Tailwind 3/4? anderes CSS?), vorhandene
Komponentenbibliothek, Router, i18n, Icon-Set, Dark Mode ja/nein.

**Phase 1: Fundament.**
- Inter einbinden (`npm i inter-ui`, `import 'inter-ui/inter-latin.css'`).
- Tokens einspielen: Tailwind 3 → `tokens/tailwind.config.ts` mergen (Achtung: `theme.fontSize` **ersetzt** die Standardgrößen) + `tokens/index.css`; Tailwind 4 → `tokens/tailwind-v4-theme.css`; ohne Tailwind → `tokens/tokens.css`.
- Body auf `bg-panel text-ink text-base`, globaler Fokusring, reduced-motion-Regel.
- Logo und Favicon aus `assets/` übernehmen.

**Phase 2: Bausteine.** `kit/src/ui/components` + `motion` kopieren; Shims auf eigenen Router/i18n
umbiegen; alte Buttons, Badges, Dialoge, Menüs, Toasts, Tabs durch die Kit-Bausteine ersetzen.
Hat die Ziel-App eine Bibliothek (MUI, shadcn, Chakra …), entweder deren Theme auf die Tokens
mappen oder die Kit-Bausteine an ihre Stelle setzen; nicht beides mischen.

**Phase 3: Shell.** Top-Header entfernen, Seitenleiste nach §7 bauen (Logo oben links,
Start/Zurück, Suche, Navigation mit Eyebrows, Statuszeile, Nutzerkarte).

**Phase 4: Screens.** Jeden Screen einem Layoutmuster A–E zuordnen; `PageHeader` + `Pane`;
eine Primäraktion; vier Zustände; Empty States.

**Phase 5: Feinschliff.** Mikrobewegung, Toast-Quittungen, Tastaturkürzel, Tooltips statt
Dauertext, belohnende Momente sparsam.

**Abnahme**: UX-Prüfliste `design-system.md` §7.7, dazu: keine fremden Hex-Werte mehr
(`grep -rE '#[0-9a-fA-F]{3,6}' src`), keine Tailwind-Standardfarben (`blue-500`, `gray-*`),
keine Schriftgrößen außerhalb der Skala, Kontrast AA.

**Offene Entscheidungen, die die Ziel-App treffen muss**

- **Dark Mode**: n.Org hat keinen. Ein Vorschlag fürs Mapping steht in `design-system.md` §1.3 (nicht implementiert).
- **Mobile**: n.Org ist desktop-first ohne mobile Navigation.
- **Marke**: Das Logo gehört der Niederwieser-Gruppe. Ist die Ziel-App keine Niederwieser-App, Logo und Favicon ersetzen und nur die Designsprache übernehmen.
