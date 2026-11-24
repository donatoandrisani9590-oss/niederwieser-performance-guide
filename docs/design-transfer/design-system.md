# Design System — n.Org / Org-Chart-Manager (Niederwieser)

> **Hinweis zum Übergabepaket (08.11.2026):** Kopie aus dem n.Org-Repository. Pfade wie
> `src/ui/components/…` beziehen sich auf n.Org; die Bausteine liegen im Paket unter `kit/src/ui/components/`,
> die Tokens unter `tokens/`. Tokens und Basisbausteine sind seit dem 23.09.2026 unverändert. Was danach dazukam
> (Assistent-Panel, „Was steht an“, Präsenz, Druckinhalte), beschreibt `ANALYSE.md` §9.

> Vollständige, implementierungsnahe Spezifikation der visuellen Designsprache.
> Stand: 23.09.2026 (Nachführung Audit FX41) · Quelle: `tailwind.config.ts`,
> `src/index.css`, `src/ui/**`; Druckbild (§8): `src/layout/constants.ts`,
> `src/render/**`, `src/domain/settings/chartSettings.ts`
>
> **Ziel dieser Datei:** Ein Entwickler oder eine KI kann damit die Oberfläche
> 1:1 nachbauen, ohne den Quellcode zu lesen. Die Werte stammen aus der Codebase.
> Zum Stand geprüft: A.1/A.2 sind byte-gleich mit `tailwind.config.ts` und
> `src/index.css` (`diff`), alle 323 Klassen der `tsx`-Code-Proben in §0–§7
> kommen in `src/**` vor (`grep`), Druckmaße in §8 tragen ihre Fundstelle.
> Wer Code ändert, zieht die betroffene Stelle hier nach — sonst gilt der Code.

---

## 0. Executive Summary

| Aspekt | Entscheidung |
|---|---|
| Styling-Framework | **Tailwind CSS 3.4.19** (Utility-first), PostCSS + Autoprefixer |
| Komponenten-Bibliothek | **Keine** — eigene Bausteine in `src/ui/components/` |
| CSS-in-JS / CSS Modules | **Nicht verwendet** |
| Theme-Provider | **Keiner** — Tokens leben ausschließlich in `tailwind.config.ts` |
| CSS Custom Properties | **Keine** (bewusst: kein Runtime-Theming) |
| Dark Mode | **Nicht implementiert** (siehe §1.3) |
| Schrift | App-Oberfläche **Inter** (`inter-ui` npm-Paket, lokal gebündelt); A3-Aushang und PDF **Arial** bzw. Helvetica (§8.2) |
| Grundfarbe | Warm-neutrales Beige `#F4F2EE` mit **genau einem** Akzent: NW-Blau `#243186` |
| Leitprinzip | „Ruhiges Werkzeug" — eine Primäraktion pro Ansicht, wenige Schriftstufen (§1.4), 1 Icon-Set |
| Shell | **Kein Top-Header** — Seitenleiste links (Logo oben links), Inhalt rechts (siehe §7.1) |

### Gestaltungsregeln (verbindlich)

1. **Eine Handlung pro Blick** — genau eine gefüllte `primary`-Aktion je Ansicht; Sekundäraktionen umrandet; alles Weitere im `⋯`-Menü.
2. **Kontext statt Navigation** — Gesellschaft in der Seitenleiste umschaltbar; keine Brotkrumen.
3. **Ruhe durch System** — ein Button-Set, sieben genutzte Schriftstufen (§1.4), ein Icon-Set, Raster 4·8·12·16·24·32, Radien 7/8/10/12, drei Schatten.
4. **Erklären, wenn gefragt** — Tooltip / Empty State statt Dauertext.
5. **Das Blatt ist der Held** — Chart in voller Breite, Werkzeuge schweben.
6. **Wohlfühlen durch Feedback** — Speichern sichtbar, Erfolg quittiert, weiche Übergänge (150–200 ms).

---

## 1. Design Tokens

Alle Farb-Tokens sind in `tailwind.config.ts` unter `theme.extend.colors` definiert
und werden als Utility-Klassen konsumiert (`bg-nw-blue`, `text-ink-60`, `border-line` …).
**Es gibt keine CSS-Variablen** — der Tokenname *ist* der Tailwind-Klassenname.

### 1.1 Farbschema

#### Marke / Primär

| Token | Klassenname | HEX | RGB | HSL | Verwendung |
|---|---|---|---|---|---|
| `nw-blue` | `bg-nw-blue` `text-nw-blue` `border-nw-blue` | `#243186` | `36, 49, 134` | `232°, 58%, 33%` | Primärknopf, alle Überschriften, aktive Zustände, Fokusring |
| `nw-blue-90` | `bg-nw-blue-90` | `#3A46A0` | `58, 70, 160` | `233°, 47%, 43%` | Hover des Primärknopfs |
| `nw-blue-25` | `border-nw-blue-25` | `#C9CDE3` | `201, 205, 227` | `231°, 32%, 84%` | Hover-Rahmen sekundärer Flächen, gestrichelte Rahmen |
| `nw-blue-12` | `bg-nw-blue-12` | `#E6E8F2` | `230, 232, 242` | `230°, 32%, 93%` | Segmented-Control-Spur, Tag `brand`, Zähler aktiv |
| `nw-blue-06` | `bg-nw-blue-06` | `#F2F3F8` | `242, 243, 248` | `230°, 30%, 96%` | Hover-Fläche (Ghost/Menü/Nav), Chip `brand`, Input-Fokus-Ring |

#### Sekundär / Akzent

| Token | HEX | RGB | HSL | Verwendung |
|---|---|---|---|---|
| `nw-green` | `#6EBD84` | `110, 189, 132` | `137°, 37%, 59%` | Ampelpunkt „ok" (Fläche), Chart-Akzent |
| `nw-green-15` | `#E8F5EC` | `232, 245, 236` | `138°, 39%, 94%` | Sehr helle Erfolgsfläche |

#### Neutral (warm)

| Token | HEX | RGB | HSL | Verwendung |
|---|---|---|---|---|
| `nw-grey` | `#D7CFC5` | `215, 207, 197` | `33°, 18%, 81%` | Warmes Grau (Chart) |
| `nw-grey-40` | `#F3F0EC` | `243, 240, 236` | `34°, 23%, 94%` | Tabellenkopf, `kbd`, neutrale Chips, Empty-State-Kreis |
| `line` | `#E4E0DA` | `228, 224, 218` | `36°, 16%, 87%` | **Standard-Rahmen** aller Flächen und Felder |
| `line-2` | `#EEEBE6` | `238, 235, 230` | `37°, 19%, 92%` | Sekundärer Rahmen: Trenner, Tabellenzeilen, Panel-Kopf |
| `panel` | `#F4F2EE` | `244, 242, 238` | `40°, 21%, 95%` | **App-Hintergrund** (`body`) |

#### Text („ink")

| Token | HEX | RGB | HSL | Kontrast auf `#FFF` | Verwendung |
|---|---|---|---|---|---|
| `ink` | `#1C1F2E` | `28, 31, 46` | `230°, 24%, 15%` | 16.3:1 | Fließtext, Toast-Hintergrund, Overlay-Basis |
| `ink-60` | `#5F6377` | `95, 99, 119` | `230°, 11%, 42%` | 5.9:1 | Sekundärtext, Labels, inaktive Navigation |
| `ink-40` | `#8B8FA1` | `139, 143, 161` | `229°, 10%, 59%` | 3.2:1 | Meta, Placeholder, dekorative Icons (kein Lesetext, siehe Regel) |

> **Kontrast-Regel:** `ink` und `ink-60` erfüllen WCAG AA für Fließtext (≥ 4,5:1).
> `ink-40` (3,2:1) erfüllt AA **nur für Großtext ≥ 18,7 px / ≥ 14 px fett** und
> ist daher ausschließlich für Meta-Angaben, Platzhalter und dekorative Icons
> zugelassen — nie für Inhalte, die man lesen muss. `nw-blue` auf Weiß: 11,3:1.
>
> **Bekannte Abweichung im Bestand (Stand 23.09.2026):** Der neutrale `Hint`
> (`src/ui/components/Field.tsx › Hint`) und die Hinweiszeile des `Toggle` (`› Toggle`) setzen
> Erklärtext noch in `ink-40`. Die Tabelle nannte bis zu dieser Nachführung
> „Hinweise" als zulässige Verwendung und widersprach damit der Regel. Ob die
> beiden Bausteine auf `ink-60` wechseln, ist eine offene Token-Entscheidung
> (Audit 23.09.2026, K145/E11). Bis dahin gilt die Regel für neuen Code.

#### Statusfarben (nur App-UI — **niemals** im Chart/PDF)

| Token | HEX | RGB | Kontrast auf Weiß | Bedeutung |
|---|---|---|---|---|
| `ok` | `#2F7A48` | `47, 122, 72` | 5.3:1 | freigegeben / passt |
| `ok-bg` | `#E8F5EC` | `232, 245, 236` | — | Fläche zu `ok` |
| `warn` | `#9A6414` | `154, 100, 20` | 5.0:1 | Hinweis / Entwurf |
| `warn-bg` | `#FBF1DD` | `251, 241, 221` | — | Fläche zu `warn` |
| `danger` | `#9B2C22` | `155, 44, 34` | 7.6:1 | Fehler / destruktiv |
| `danger-bg` | `#FBECEA` | `251, 236, 234` | — | Fläche zu `danger` |
| `danger` hover-Fläche | `#82241C` | `130, 36, 28` | — | Hover des `danger-primary`-Knopfs (Inline-Wert) |

Sonderrahmen für getönte Karten (Inline-Hex, kein Token):
`border-[#EBD9B4]` (warn) · `border-[#EBC5C0]` (danger).

#### Ampel-Flächenfarben (Brandbook 2026)

Nur für **Flächen** (Ampelpunkte, Statusflächen, Badges) — Text behält die
kontraststarken Töne oben.

| Token | HEX | RGB | Verwendung |
|---|---|---|---|
| `traffic-red` | `#E50046` | `229, 0, 70` | Ampelpunkt rot, Zähler-Badge in der Navigation |
| `traffic-amber` | `#F59D24` | `245, 157, 36` | Ampelpunkt gelb |

#### Rückwärtskompatible Aliasse (Auslauf)

`amber` → `#9A6414` (identisch mit `warn`), `amber-bg` → `#FBF1DD`.
**Nicht mehr neu verwenden** — durch `warn` / `warn-bg` ersetzen.

#### Chart-/Druckpalette (getrennt von der App-UI)

Definiert in `src/domain/settings/chartSettings.ts`. Gilt für Organigramm-Blatt
und PDF-Export. **Orange/Amber ist hier verboten** (Spec 8.4).

| ID | HEX | Label |
|---|---|---|
| `blue` | `#243186` | Niederwieser Blue |
| `light-blue` | `#BBD4F0` | Light Blue |
| `light-blue-50` | `#DDEAF8` | Light Blue 50 % |
| `light-blue-25` | `#EEF5FC` | Light Blue 25 % |
| `green` | `#6EBD84` | Niederwieser Green |
| `green-75` | `#92CEA3` | Green 75 % |
| `green-50` | `#B7DEC2` | Green 50 % |
| `green-25` | `#DBEEE0` | Green 25 % |
| `grey` | `#D7CFC5` | Warm Grey |
| `grey-75` | `#E1DBD4` | Warm Grey 75 % |
| `grey-50` | `#EBE7E2` | Warm Grey 50 % |
| `grey-25` | `#F5F3F0` | Warm Grey 25 % |
| `white` | `#FFFFFF` | White |

Hierarchie-Standardfüllungen (Werkseinstellung): `leadership` = `#BBD4F0`,
`management` = `#DDEAF8`, `team` = `#EBE7E2`. Die Gruppe hat Leadership am
18.09.2026 in den Projektdaten auf `#B7DEC2` getauscht — siehe §8.5.

### 1.2 Semantische Farbzuordnung

```
Hintergrund Seite ........ bg-panel        #F4F2EE
Hintergrund Fläche ....... bg-white        #FFFFFF
Rahmen Fläche ............ border-line     #E4E0DA
Rahmen innen/Trenner ..... border-line-2   #EEEBE6
Überschrift .............. text-nw-blue    #243186
Fließtext ................ text-ink        #1C1F2E
Sekundärtext ............. text-ink-60     #5F6377
Meta/Placeholder ......... text-ink-40     #8B8FA1
Hover-Fläche ............. bg-nw-blue-06   #F2F3F8
Aktiv/Ausgewählt ......... bg-nw-blue-06 + text-nw-blue + font-semibold
Overlay-Schleier ......... bg-ink/30       rgba(28,31,46,.30)
```

### 1.3 Dark / Light Mode

**Es gibt keinen Dark Mode.** Verifiziert:

- `tailwind.config.ts` enthält **keinen** `darkMode`-Schlüssel (Default `'media'` ist damit inaktiv, weil keine `dark:`-Utilities existieren).
- **0 Vorkommen** von `dark:`-Klassen in `src/**`.
- **Keine** `@media (prefers-color-scheme)`-Regel in `src/index.css`.
- Keine CSS-Variablen, über die ein Theme umschaltbar wäre.

**Begründung (aus dem Code dokumentiert):** Die App ist ein Druckvorstufen-Werkzeug.
Die Bildschirmdarstellung ist eine WYSIWYG-Vorschau des A3-Blatts (weißes Papier,
Corporate-Palette). Ein invertiertes Schema würde die Farbtreue zum PDF brechen.

**Falls Dark Mode nachgerüstet wird**, wäre dies das empfohlene Mapping — es ist
**noch nicht implementiert** und hier nur als Vorschlag dokumentiert:

| Rolle | Light (Ist) | Dark (Vorschlag) |
|---|---|---|
| Seite | `#F4F2EE` | `#15161C` |
| Fläche | `#FFFFFF` | `#1D1F27` |
| Rahmen | `#E4E0DA` | `#2E3140` |
| Text | `#1C1F2E` | `#ECEDF2` |
| Sekundärtext | `#5F6377` | `#A2A6B8` |
| Meta | `#8B8FA1` | `#767B8E` |
| Akzent | `#243186` | `#8E99E8` (aufgehellt, sonst < 4,5:1) |
| Chart-Blatt | — | **bleibt Weiß** (Papiervorschau) |

### 1.4 Typografie

#### Font-Family

```ts
// tailwind.config.ts → theme.extend.fontFamily
sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
```

Einbindung (lokal gebündelt, kein CDN):

```tsx
// src/main.tsx
import 'inter-ui/inter-latin.css'
import './index.css'
```

OpenType-Features global aktiv:

```css
body { font-feature-settings: 'cv11', 'ss01'; }
```

(`cv11` = einstöckiges „g" · `ss01` = alternative Ziffern/Buchstabenformen)

Für Zahlenkolonnen zusätzlich die Utility-Klasse `.tnum`:

```css
.tnum { font-variant-numeric: tabular-nums; }
```

#### Schriftskala — **ersetzt** die Tailwind-Defaults

`theme.fontSize` steht **nicht** unter `extend`. Das heißt: alle Tailwind-Standardgrößen
(`text-4xl`, `text-6xl` …) existieren nicht mehr. Es gibt genau acht Stufen;
im Einsatz sind sieben — `text-2xl` ist Reserve (0 Treffer in `src/**`, Stand 23.09.2026):

| Klasse | Größe | Line-Height | Verhältnis | Rolle |
|---|---|---|---|---|
| `text-2xs` | 11 px | 14 px | 1.27 | Overline / Eyebrow, Tags, Chips, Hinweise in Menüs |
| `text-xs` | 12 px | 16 px | 1.33 | Caption, Labels, Meta, Hilfstexte |
| `text-sm` | 13 px | 18 px | 1.38 | Sekundärtext, Tabellenzellen, Menüeinträge |
| `text-base` | **14 px** | 20 px | 1.43 | **Body (Default am `body`)**, Tabs, Pane-Titel |
| `text-md` | 15 px | 20 px | 1.33 | Abschnitt / Dialogtitel |
| `text-lg` | 17 px | 24 px | 1.41 | Zwischentitel (z. B. Login-H1) |
| `text-xl` | 22 px | 28 px | 1.27 | **Seitentitel (H1)**, große Kennzahlen |
| `text-2xl` | 26 px | 32 px | 1.23 | Reserve / Sonderfälle |

#### Font-Weights

Nur drei Gewichte im Einsatz:

| Klasse | Wert | Verwendung |
|---|---|---|
| `font-normal` | 400 | Fließtext, Zellen, Hinweise |
| `font-medium` | 500 | Buttons, Tabs, Navigation, `kbd` |
| `font-semibold` | 600 | Überschriften, Labels, Eyebrows, Tags, Chips, aktive Navigation |

`font-bold` (700) nur an einer Stelle: Zähler-Badge in der Navigation (`text-[10px] font-bold`).

#### Heading-Hierarchie (verbindlich)

```tsx
/* H1 — Seitentitel (Layout.tsx → PageHeader) */
<h1 className="text-xl font-semibold tracking-[-.014em] text-nw-blue">…</h1>

/* H2 — Flächen-/Panel-Titel (Layout.tsx → PaneHeader) */
<h2 className="text-base font-semibold text-nw-blue">…</h2>

/* H3 — Dialogtitel (Modal.tsx) */
<h3 className="text-md font-semibold text-nw-blue">…</h3>

/* Overline / Eyebrow — Abschnittsbeschriftung (index.css) */
<div className="eyebrow">…</div>
/* ≙ text-2xs font-semibold uppercase tracking-[.07em] text-ink-40 */
```

**Alle Überschriften sind `nw-blue`, nie schwarz.**

#### Letter-Spacing (Laufweite)

| Kontext | Wert |
|---|---|
| H1 (22 px) | `tracking-[-.014em]` |
| Login-H1 (17 px) | `tracking-[-.012em]` |
| Große Kennzahl (StatCard) | `tracking-[-.02em]` |
| Overline / Eyebrow | `tracking-[.07em]` |
| Tag (Versalien) | `tracking-[.04em]` |
| Chip | `tracking-[.01em]` |
| Avatar-Initialen | `tracking-[.04em]` |
| Rollen-Pille | `tracking-[.05em]` |

**Regel:** Große Schrift → negatives Tracking. Kleine Versalien → positives Tracking.

### 1.5 Spacing (Abstands-Skala)

Es gilt die **Tailwind-Standardskala** (1 Einheit = 0.25 rem = 4 px), aber
diszipliniert eingesetzt. Das interne Raster lautet **4 · 8 · 12 · 16 · 24 · 32**.

| Klasse | px | Rolle |
|---|---|---|
| `0.5` | 2 | Mikro-Versatz (Segmented-Innenabstand, Zähler) |
| `1` | 4 | Icon↔Text eng, `mt-1` unter Labels |
| `1.5` | 6 | Icon↔Text Standard (`gap-1.5`) |
| `2` | 8 | **Standard-Gap zwischen Bedienelementen** (`gap-2`) |
| `2.5` | 10 | Menüeintrag-Innenabstand, Chip-Padding |
| `3` | 12 | Gruppenabstand, Seitenleisten-Padding |
| `3.5` | 14 | Karten-Innenabstand vertikal |
| `4` | 16 | **Flächen-Innenabstand horizontal** (`px-4`), Rasterlücke |
| `5` | 20 | Dialog-Innenabstand (`p-5`) |
| `6` | 24 | Seiten-Innenabstand horizontal (`px-6`) |
| `7` | 28 | Login-Karte (`p-7`), Empty-State vertikal |
| `10` | 40 | Seiten-Innenabstand unten (`pb-10`) |

**Tatsächliche Häufigkeit** (Codebase-Messung, Top 8):
`gap-2` (92×) · `px-4` (70×) · `py-2` (61×) · `px-2` (46×) · `mt-1` (45×) ·
`gap-1.5` (43×) · `gap-3` (39×) · `px-3` (35×).

**Kanonische Kombinationen:**

```
Fläche (Pane) Inhalt ......... p-4         oder px-4 py-3
Pane-Kopf .................... px-4 py-2  (min-h-[46px])
Tabellenzelle ................ px-4 py-2.5
Menüeintrag .................. px-2.5 py-1.5
Dialog ....................... p-5
Knopfzeile im Dialog ......... mt-5 gap-2
Karten-Raster ................ gap-4
Statuskarte .................. px-4 py-3.5
```

### 1.6 Border-Radius

| Klasse | Wert | Verwendung | Häufigkeit |
|---|---|---|---|
| `rounded-[2px]` / `rounded-[3px]` | 2–3 px | Chart-Mikroelemente | 6× |
| `rounded-sm` | 2 px | Farbfelder | 6× |
| `rounded` | 4 px | `kbd`, Tag | — |
| `rounded-[7px]` | 7 px | **Button `size="sm"`** (28 px hoch) | 2× |
| `rounded-md` | 6 px | Menüeintrag, Icon-Knopf im Dialog, Segmented-Pille | 18× |
| `rounded-lg` | **8 px** | **Bedienelemente**: Button `md`/`lg`, Inputs, Nav-Einträge, Segmented-Spur | 45× |
| `rounded-card` | **10 px** | **Flächen**: Pane, StatCard, Menü-/Popover-Panel, Toast | 33× |
| `rounded-xl` | **12 px** | **Dialoge**: Modal-Panel, Seitenleisten-Karte, Login-Karte | 7× |
| `rounded-full` | 9999 px | Chips, Ampelpunkte, Avatare, Toggle, Zähler | 33× |

> **Merksatz:** 7/8 = Bedienelement · 10 = Fläche · 12 = Dialog · full = Status.

```ts
// tailwind.config.ts → theme.extend.borderRadius
borderRadius: { card: '10px' }
```

### 1.7 Effekte

#### Box-Shadows

```ts
// tailwind.config.ts → theme.extend.boxShadow
boxShadow: {
  card:  '0 1px 2px rgba(28,31,46,.05)',
  float: '0 1px 2px rgba(28,31,46,.05), 0 12px 32px -16px rgba(28,31,46,.18)',
  sheet: '0 1px 2px rgba(28,31,46,.08), 0 24px 48px -24px rgba(28,31,46,.28)',
}
```

| Token | Verwendung | Häufigkeit |
|---|---|---|
| `shadow-card` | Ruhende Flächen: Seitenleiste, Karten, Segmented-Pille aktiv, Einklapp-Knopf | 10× |
| `shadow-float` | **Schwebendes**: Menü, Popover, Modal, Toast, Tooltip, Karten-Hover | 24× |
| `shadow-sheet` | Das A3-Blatt im Chart (stärkste Ebene) | 2× |

Inline-Sonderschatten (bewusste Einzelfälle):

```
shadow-[inset_3px_0_0_#243186]                        /* Aktiv-Markierung links */
shadow-[inset_0_1px_0_rgba(255,255,255,.18)]          /* Avatar-Glanzkante */
shadow-[0_0_0_3px_#F2F3F8]                            /* Input-Fokusring */
shadow-[0_0_0_1px_rgba(255,255,255,.7)]               /* Kontrastkante */
```

#### Transitions

**Standarddauer: 150 ms.** Übergänge werden **immer auf konkrete Eigenschaften**
gesetzt, nie als nacktes `transition-all`.

| Dauer | Verwendung |
|---|---|
| 120 ms | Abgänge (`fade-out`, `menu-out`, `pop-out`) |
| **150 ms** | **Standard**: Hover/Press an Buttons, Nav, Feldern |
| 180 ms | `fade-in`, `pop-in`, `toast-out` |
| 200 ms | Karten-Hover, Seitenleisten-Breite, `slide-up`, `toast-in` |
| 300 ms | **Bedeutungswechsel** von Farben (Chip/Tag/Dot/StatCard rot→grün) |
| 650 ms | `sheet-enter` (Signature-Moment) |

Kanonische Easing-Kurven:

```
ease-out                     /* Auftritte, schlicht */
ease-in                      /* Abgänge */
cubic-bezier(.2,.8,.2,1)     /* „Glide" — Auftritte mit Charakter, Kamera-Flüge */
```

Zusätzlich in `src/ui/motion/motion.ts`:

```ts
// Feder-Kurve mit ~4 % Überschwingen für JS-Animationen (Web Animations API)
export const SPRING_EASE = 'linear(0, 0.0065 1%, … 1 42%, 1 100%)'
export const GLIDE_EASE   = 'cubic-bezier(.2,.8,.2,1)'
export function motionAllowed(): boolean   // fragt prefers-reduced-motion ab
```

#### Interaktions-Mikrobewegung (durchgängiges Muster)

```
hover:scale-[1.02]   active:scale-[.97]    /* Buttons */
hover:scale-[1.02]   active:scale-[.98]    /* Nav-Einträge, Menüeinträge */
hover:scale-[1.03]   active:scale-[.98]    /* Tabs */
hover:scale-105      active:scale-95       /* runde Kleinknöpfe, Chips */
hover:-translate-y-0.5 hover:scale-[1.02]  /* Karten (Home) */
disabled:hover:scale-100  disabled:active:scale-100   /* immer mit sperren! */
```

#### Z-Index-Ebenen

| Ebene | Klasse | Inhalt |
|---|---|---|
| 1 | `z-[1]` | Chart-Interna |
| 10 | `z-10` | SearchSelect-Listbox (im Fluss), Seitenleisten-Einklappknopf |
| 20 | `z-20` | Sticky-Seitenleiste (`aside`) |
| 30 | `z-30` | **Menü- und Popover-Panels (Portal), Tooltip** |
| 40 | `z-40` | **Modal-Overlay + Dialogpanel (Portal an `<body>`)** |
| 50 | `z-50` | **Toast**, Konflikt-`alertdialog`, Tour-Spotlight |

> **Regel:** Alles über Ebene 20 hängt per `createPortal` an `document.body` —
> so kann kein `overflow-hidden`-Container etwas abschneiden.

#### Keyframes & Animationen

```ts
// tailwind.config.ts → theme.extend.animation
'fade-in':     'fade-in .18s ease-out both',
'pop-in':      'pop-in .18s cubic-bezier(.2,.8,.2,1) both',
'slide-up':    'slide-up .2s cubic-bezier(.2,.8,.2,1) both',
'menu-in':     'menu-in .14s ease-out both',
'sheet-enter': 'sheet-enter .65s cubic-bezier(.2,.8,.2,1) both',
'fade-out':    'fade-out .12s ease-in both',
'menu-out':    'menu-out .12s ease-in both',
'pop-out':     'pop-out .12s ease-in both',
'toast-in':    'toast-in .2s cubic-bezier(.2,.8,.2,1) both',
'toast-out':   'toast-out .18s ease-in both',
'sheet-swap':  'fade-in .14s ease-out both',
// Sondereffekte (jeweils EINMALIG):
attention:     'attention .5s cubic-bezier(.2,.8,.2,1) 1 both',   // Puls 1 → 1.45 → 1
'shine-sweep': 'shine-sweep 1.6s ease-in-out 1 both',             // Lichtlauf über Karte
'stamp-in':    'stamp-in .55s cubic-bezier(.2,.8,.2,1) both',     // Freigabe-Stempel
dissolve:      'dissolve .5s ease-in both',                       // ENTWURF löst sich auf
'ink-pulse':   'ink-pulse .7s ease-out both',                     // Tintenring
```

**Spiegel-Prinzip:** Jeder Auftritt hat einen **kürzeren** Abgang
(`pop-in` 180 ms ↔ `pop-out` 120 ms · `menu-in` 140 ms ↔ `menu-out` 120 ms).
Das Unmounten wird per `setTimeout(130ms)` gesteuert, **nicht** per `animationend`
— denn bei `prefers-reduced-motion` feuert kein `animationend`, geschlossen
werden muss trotzdem.

#### Reduced Motion (global)

```css
/* src/index.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

JS-Animationen prüfen zusätzlich selbst via `motionAllowed()`.

#### Fokus-Sichtbarkeit (global)

```css
/* src/index.css — gilt für ALLE fokussierbaren Elemente */
:focus-visible {
  outline: 2px solid #243186;   /* theme('colors.nw-blue') */
  outline-offset: 2px;
  border-radius: 4px;
}
```

Eingabefelder haben zusätzlich einen eigenen weichen Ring:

```
focus:border-nw-blue focus:shadow-[0_0_0_3px_#F2F3F8] focus:outline-none
```

---

## 2. Layout & Grid

### 2.1 Breakpoints

**Tailwind-Standard, unverändert** (kein `screens`-Override im Config):

| Name | min-width |
|---|---|
| `sm` | 640 px |
| `md` | 768 px |
| `lg` | 1024 px |
| `xl` | 1280 px |
| `2xl` | 1536 px |

**Wichtig:** Die App ist **desktop-first** und nutzt Breakpoints sparsam
(insgesamt < 30 responsive Utilities). Es gibt **keine mobile Navigation** —
die Seitenleiste ist stattdessen manuell ein-/ausklappbar. Responsive Regeln
betreffen fast ausschließlich Kartenraster:

```
grid gap-4 sm:grid-cols-2 lg:grid-cols-3     /* Gesellschaftskarten (Home) */
grid gap-4 sm:grid-cols-2 xl:grid-cols-3     /* Statuskarten */
grid gap-3 sm:grid-cols-2 md:grid-cols-4     /* Kennzahlen */
xl:sticky xl:top-5                            /* Detailspalte ab 1280 px */
```

### 2.2 Shell-Maße

```tsx
/* src/ui/AppShell.tsx — Grundgerüst */
<div className="flex min-h-screen bg-panel">

  {/* Seitenleiste: sticky, volle Höhe, schwebende weiße Karte */}
  <aside
    data-modal-inert
    className="sticky top-0 z-20 h-screen shrink-0 p-3 pr-0
               transition-[width] duration-200 w-[256px]"   /* eingeklappt: w-[84px] */
  >
    <div className="relative flex h-full flex-col rounded-xl border border-line
                    bg-white shadow-card">
      …
    </div>
  </aside>

  {/* Inhalt */}
  <div data-modal-inert className="flex min-w-0 flex-1 flex-col">
    <main className="min-w-0 flex-1 px-6 pb-10 pt-5">{children}</main>
  </div>
</div>
```

| Maß | Wert |
|---|---|
| Seitenleiste ausgeklappt | **256 px** (`w-[256px]`) |
| Seitenleiste eingeklappt | **84 px** (`w-[84px]`) |
| Seitenleisten-Außenabstand | `p-3 pr-0` (12 px, rechts bündig zum Inhalt) |
| Breitenübergang | `transition-[width] duration-200` |
| Einklapp-Knopf | 24 × 24 px, `absolute -right-3 top-7`, rund, `shadow-card` |
| Logo | `w-[196px]`, Zone `px-4 pt-4 pb-3` |
| Inhaltsbereich | `px-6 pt-5 pb-10` (24 / 20 / 40 px) |
| Warn-/Fehlerbanner | `mx-6 mt-3 px-4 py-2` (`src/ui/AppShell.tsx › „mx-6 mt-3 animate-fade-in“`) |
| **Es gibt keinen Top-Header** | Die Seitenleiste trägt alles (Logo, Suche, Nav, Status, Nutzer) |

### 2.3 Container-Breiten

| Kontext | Klasse | px |
|---|---|---|
| Startseite (Gesellschaftswahl) | `mx-auto max-w-4xl px-2 pt-6` | 896 |
| Login-Karte | `w-full max-w-sm` | 384 |
| Dialog Standard | `max-w-md` | 448 |
| Dialog groß (`size="lg"`) | `max-w-2xl` | 672 |
| Dialog Maximalhöhe | `max-h-[90vh] overflow-auto` | — |
| Toast | `max-w-[min(560px,calc(100vw-32px))]` | ≤ 560 |
| Menü-Panel | `min-w-[200px]` | ≥ 200 |
| Popover-Panel | `min-w-[240px]` | ≥ 240 |
| Nutzer-Popover | `w-[272px] !p-3` | 272 |
| Tooltip | `w-[260px]` (`TagTip`: 240) | 260 |
| Arbeitsflächen-Raster | `grid-cols-[240px_minmax(0,1fr)_316px]` | Liste·Inhalt·Detail |
| Editor-Raster | `grid-cols-[400px_minmax(0,1fr)]` | — |

### 2.4 Bedienhöhen (verbindlich)

| Element | Höhe |
|---|---|
| Button `sm` | **28 px** (`h-7`) |
| Button `md` (Default) | **32 px** (`h-8`) |
| Button `lg` | **36 px** (`h-9`) |
| Eingabefeld (`.dlg-input`) | **32 px** (`h-8`) |
| Suchfeld `sm` | 28 px |
| Chip | 24 px (`h-6`) |
| Tag | 18 px (`h-[18px]`) |
| Ampelpunkt (`Dot`) | 8 px (`h-2 w-2`) |
| Nav-Eintrag | 32 px (eingerückt 28, eingeklappt 36) |
| Pane-Kopf | min. 46 px |
| Tabellenzeile | ~46 px (`py-2.5` + `text-sm`) |
| Segmented | 28 / 32 px |
| Toggle | 30 × 18 px, Knauf 14 px |

---

## 3. UI-Komponenten-Spezifikation

Alle Bausteine liegen in `src/ui/components/`. Es gibt **keine** externe
Komponentenbibliothek.

### 3.1 Button — `components/Button.tsx`

**5 Varianten × 3 Größen.** Genau **eine** `primary`-Aktion pro Ansicht.

#### Basisklassen (immer aktiv)

```
inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap
border font-medium leading-none
transition-[color,background-color,border-color,opacity,transform] duration-150
hover:scale-[1.02] active:scale-[.97]
disabled:cursor-not-allowed disabled:opacity-45
disabled:hover:scale-100 disabled:active:scale-100
```

#### Varianten

| Variante | Normal | Hover | Verwendung |
|---|---|---|---|
| `primary` | `bg-nw-blue text-white border-transparent` | `hover:bg-nw-blue-90` | Die eine Hauptaktion |
| `secondary` *(Default)* | `bg-white text-ink border-line` | `hover:border-nw-blue-25 hover:bg-nw-blue-06` | Nebenaktionen |
| `ghost` | `bg-transparent text-ink-60 border-transparent` | `hover:bg-nw-blue-06 hover:text-nw-blue` | Abbrechen, Zurück, Icon-Knöpfe |
| `danger` | `bg-transparent text-danger border-transparent` | `hover:bg-danger-bg` | Löschen in Listen |
| `danger-primary` | `bg-danger text-white border-transparent` | `hover:bg-[#82241C]` | Destruktive Bestätigung im Dialog |

#### Größen

| Größe | Klassen | Höhe | Icon |
|---|---|---|---|
| `sm` | `h-7 px-2.5 text-xs gap-1.5 rounded-[7px]` | 28 px | 14 px |
| `md` *(Default)* | `h-8 px-3 text-sm gap-2 rounded-lg` | 32 px | 16 px |
| `lg` | `h-9 px-3.5 text-base gap-2 rounded-lg` | 36 px | 16 px |

`iconOnly` macht den Knopf quadratisch: `sm → w-7 px-0` · `md → w-8 px-0` · `lg → w-9 px-0`.
**`aria-label` ist dann Pflicht** und wird automatisch als `title` gespiegelt.

#### Zustände

| Zustand | Umsetzung |
|---|---|
| **Normal** | siehe oben |
| **Hover** | `scale(1.02)` + Variantenfarbe, 150 ms |
| **Active** | `scale(.97)` |
| **Focus** | global `:focus-visible` → 2 px `#243186`, Offset 2 px, Radius 4 px |
| **Disabled** | `opacity-45`, `cursor-not-allowed`, Skalierung deaktiviert, natives `disabled` |
| **Loading** | Icon → Spinner; **kein** `disabled` (sonst springt der Fokus auf `<body>`), stattdessen `aria-busy` + `aria-disabled` + `pointer-events-none opacity-70`, `onClick` wird abgefangen |

Spinner-Markup:

```tsx
<span aria-hidden className="inline-block h-3.5 w-3.5 shrink-0 animate-spin
  rounded-full border-2 border-current border-t-transparent" />
```

#### Beispiel

```tsx
<Button variant="primary" size="lg" icon="publish" onClick={publish} loading={busy}>
  Fassung veröffentlichen
</Button>

<Button variant="ghost" iconOnly icon="more" aria-label="Weitere Aktionen" />
```

#### Übergangs-Alias (Legacy, in `index.css`)

```css
.btn-row {
  @apply inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[7px]
         border border-line bg-white px-2.5 text-xs font-medium text-ink
         transition-colors hover:border-nw-blue-25 hover:bg-nw-blue-06;
}
/* ≙ <Button variant="secondary" size="sm"> — wird schrittweise ersetzt */
```

### 3.2 Formularelemente

#### Label & Eingabefeld (`index.css`)

```css
.dlg-label {
  @apply mt-3 block text-xs font-semibold text-ink-60;
}
.dlg-input {
  @apply mt-1 h-8 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink
         transition-[border-color,box-shadow] duration-150
         placeholder:text-ink-40
         focus:border-nw-blue focus:shadow-[0_0_0_3px_#F2F3F8] focus:outline-none;
}
textarea.dlg-input { @apply h-auto py-2; }
```

| Zustand | Stil |
|---|---|
| **Normal** | `border-line` (#E4E0DA), `bg-white`, 13 px Text |
| **Placeholder** | `text-ink-40` |
| **Focus** | `border-nw-blue` + Ring `0 0 0 3px #F2F3F8`, kein `outline` |
| **Error** | Rahmen `border-danger` + `<Hint tone="danger">` darunter |
| **Disabled** | `opacity-50 cursor-not-allowed` am umschließenden Label |

#### `Label` / `Hint` — `components/Field.tsx`

```tsx
<Label htmlFor="name" optional="(optional)">Anzeigename</Label>
<input id="name" className="dlg-input" />
<Hint tone="danger">Dieser Name ist bereits vergeben.</Hint>
```

`Hint`-Klassen: `mt-1 text-xs leading-snug` +
`neutral → text-ink-40` · `warn → text-warn` · `danger → text-danger`.
Nicht-neutrale Hinweise erscheinen mit `animate-fade-in` (weicher Auftritt).

#### `Toggle` (Ja/Nein-Schalter statt nackter Checkbox)

Semantisch eine `<input type="checkbox" className="peer sr-only">`, visuell eine Spur:

```tsx
{/* Spur */}
<span className="block h-[18px] w-[30px] rounded-full bg-[#D2CCC3] transition-colors
  peer-checked:bg-nw-blue
  peer-focus-visible:outline peer-focus-visible:outline-2
  peer-focus-visible:outline-offset-2 peer-focus-visible:outline-nw-blue" />
{/* Knauf */}
<span className="pointer-events-none absolute left-[2px] top-[2px] h-[14px] w-[14px]
  rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-3" />
```

| Zustand | Spurfarbe |
|---|---|
| Aus | `#D2CCC3` |
| An | `#243186` (`nw-blue`) |
| Fokus | 2 px Outline `nw-blue`, Offset 2 |
| Disabled | Label `opacity-50 cursor-not-allowed` |

#### `SearchField` (Suchfeld mit Lupe)

```tsx
<span className="relative inline-flex items-center">
  <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 text-ink-40" />
  <input type="search" className="w-full rounded-lg border border-line bg-white
    pl-8 pr-3 text-sm text-ink transition-[border-color,box-shadow] duration-150
    placeholder:text-ink-40 focus:border-nw-blue focus:shadow-[0_0_0_3px_#F2F3F8]
    focus:outline-none h-8" />
</span>
{/* size="sm": h-7 rounded-[7px] text-xs */}
```

#### `SearchSelect` (Dropdown mit Suche — WAI-ARIA Combobox)

Ersetzt native `<select>` ab ~20 Einträgen. Kein Fremdpaket.

```tsx
<input role="combobox" aria-expanded={open} aria-controls={listId}
       aria-autocomplete="list" aria-activedescendant={…}
       className="dlg-input pr-7" />

{/* Chevron, dreht bei offen */}
<span aria-hidden className="pointer-events-none absolute right-2.5 top-1 flex h-8
  items-center text-ink-40">
  <Icon name="chevron-down" size={14} className="transition-transform rotate-180" />
</span>

{/* Liste */}
<ul role="listbox" className="absolute z-10 mt-1 max-h-60 w-full animate-menu-in
  overflow-auto rounded-lg border border-line bg-white py-1 shadow-float">
  <li role="option" aria-selected={…}
      className="cursor-pointer px-3 py-1.5 text-sm transition-colors
                 bg-nw-blue-06 text-nw-blue" />   {/* aktiv */}
</ul>
```

| Zustand der Option | Stil |
|---|---|
| Aktiv (Tastatur/Hover) | `bg-nw-blue-06 text-nw-blue` |
| Gewählt | zusätzlich `font-semibold` |
| „nichts gewählt" | `text-ink-60` |
| Keine Treffer | `px-3 py-2 text-xs text-ink-40` |
| Überlauf (> 40) | Fußzeile `border-t border-line-2 px-3 py-1.5 text-xs text-ink-40 tnum` |

Tastatur: `↓/↑` navigieren · `Enter` wählt · `Esc` schließt **nur die Liste**
(`stopImmediatePropagation`, damit der Dialog offen bleibt) · `Tab` schließt.

### 3.3 Cards & Flächen — `components/Layout.tsx`

#### `Pane` (Standardfläche)

```tsx
<div className="rounded-card border border-line bg-white">…</div>
```

#### `PaneHeader`

```tsx
<div className="flex min-h-[46px] flex-wrap items-center gap-2.5
                border-b border-line-2 px-4 py-2">
  <h2 className="text-base font-semibold text-nw-blue">{title}</h2>
  <span className="text-xs text-ink-40">{hint}</span>
  <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
</div>
```

#### `PageHeader`

```tsx
<header className="mb-4">
  <div className="flex items-start gap-4">
    <div className="min-w-0 flex-1">
      {/* optionaler Zurück-Knopf */}
      <Button variant="ghost" size="sm" icon="arrow-left" className="-ml-2 mb-1 text-nw-blue" />
      <div className="eyebrow mb-1">{eyebrow}</div>
      <h1 className="text-xl font-semibold tracking-[-.014em] text-nw-blue">{title}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-60">
        {meta}
      </div>
    </div>
    {/* nur wenn actions übergeben — die rechte Ecke gehört den Aktionen */}
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-0.5">
      {actions}
    </div>
  </div>
  {children /* z. B. Tabs */}
</header>
```

Trennpunkt in Meta-Zeilen: `<span aria-hidden className="text-ink-40">·</span>`

#### `StatCard` (Kennzahl)

```tsx
<div className="rounded-card border border-line bg-white px-4 py-3.5
                transition-colors duration-300">
  <div className="eyebrow transition-colors duration-300 text-ink-40">{label}</div>
  <div className="mt-2 flex items-baseline gap-2">
    <span className="text-xl font-semibold tracking-[-.02em] tnum
                     transition-colors duration-300 text-ink">{value}</span>
    <span className="text-sm text-ink-60">{unit}</span>
  </div>
  <div className="mt-1 text-xs text-ink-40">{sub}</div>
</div>
```

Tonwerte (Rahmen / Label / Wert):

| `tone` | Rahmen | Label | Wert |
|---|---|---|---|
| `neutral` | `border-line` | `text-ink-40` | `text-ink` |
| `ok` | `border-line` | `text-ink-40` | `text-ok` |
| `warn` | `border-[#EBD9B4]` | `text-warn` | `text-warn` |
| `danger` | `border-[#EBC5C0]` | `text-danger` | `text-danger` |

#### Klickbare Karte (Home-Muster)

```tsx
<button className="group rounded-card border border-line bg-white p-5 text-left
  shadow-card transition-[transform,box-shadow,border-color] duration-200
  hover:-translate-y-0.5 hover:scale-[1.02] hover:border-nw-blue-25 hover:shadow-float
  active:scale-[.99]">
  <span className="grid h-10 w-10 place-items-center rounded-card bg-nw-blue-06
    text-nw-blue transition-colors group-hover:bg-nw-blue group-hover:text-white">
    <Icon name="building" size={20} />
  </span>
  <div className="mt-3.5 text-base font-semibold leading-snug">{name}</div>
  <div className="mt-1 text-xs text-ink-60 tnum">{meta}</div>
  {/* Aufforderung erscheint erst bei Hover */}
  <div className="mt-3.5 inline-flex items-center gap-1 text-sm font-medium text-nw-blue
    opacity-0 transition-opacity duration-200 group-hover:opacity-100">
    Öffnen <Icon name="arrow-right" size={15}
      className="transition-transform duration-200 group-hover:translate-x-0.5" />
  </div>
</button>
```

#### `EmptyState`

```tsx
<div className="flex flex-col items-center px-4 py-7 text-center">
  <span className="mb-2.5 grid h-9 w-9 place-items-center rounded-full
    border border-line bg-nw-grey-40 text-ink-40">
    <Icon name="info" size={16} />
  </span>
  <p className="text-sm text-ink-60">{title}</p>
  <p className="mt-0.5 max-w-[52ch] text-xs text-ink-40">{hint}</p>
  <div className="mt-3">{action}</div>
</div>
```

#### `Skeleton`

```tsx
<div aria-hidden className="animate-pulse rounded-lg bg-nw-grey-40/70 h-[150px]" />
```

### 3.4 Modal / Dialog — `components/Modal.tsx`

```tsx
{/* Overlay — Portal an <body> */}
<div className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4
                animate-fade-in">   {/* beim Schließen: animate-fade-out */}
  <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
       className="max-h-[90vh] w-full animate-pop-in overflow-auto rounded-xl
                  bg-white p-5 shadow-float outline-none max-w-md">
    {/* size="lg" → max-w-2xl */}
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="text-md font-semibold text-nw-blue">{title}</h3>
        <p className="mt-0.5 text-sm text-ink-60">{subtitle}</p>
      </div>
      <button data-dialog-close aria-label="Schließen"
        className="-mr-1.5 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md
          text-ink-40 transition-[color,background-color,transform] duration-150
          hover:scale-[1.02] hover:bg-nw-blue-06 hover:text-ink active:scale-[.97]">
        <Icon name="x" size={16} />
      </button>
    </div>
    <div className="mt-2">{children}</div>
  </div>
</div>
```

**Verhalten (verbindlich nachzubauen):**

| Aspekt | Umsetzung |
|---|---|
| Rendering | `createPortal(…, document.body)` |
| Overlay | `bg-ink/30` = `rgba(28,31,46,.30)` |
| Auftritt / Abgang | `fade-in` + `pop-in` / `fade-out` + `pop-out`, Unmount nach **130 ms** |
| Escape | schließt (mit Abgangsanimation) |
| Außenklick | schließt (nur wenn `e.target === e.currentTarget`) |
| Fokus-Trap | `Tab`/`Shift+Tab` zyklisch innerhalb des Panels |
| Startfokus | erstes Bedienelement, das **nicht** `[data-dialog-close]` ist |
| Fokus-Rückgabe | an das auslösende Element, **nach** Aufheben von `inert` |
| Hintergrund | alle `[data-modal-inert]`-Elemente bekommen `inert` (Zähler für gestapelte Dialoge) |
| Scroll-Lock | `document.body.style.overflow = 'hidden'` |
| Enter | löst den registrierten Primärknopf aus (nicht in `textarea`, nicht in Combobox, nicht bei offenem Menü) |

#### `DialogButtons` (Knopfzeile)

```tsx
<div className="mt-5 flex flex-wrap items-center justify-end gap-2">
  <div className="mr-auto">{extra}</div>
  <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
  <Button variant={danger ? 'danger-primary' : 'primary'}
          onClick={onOk} disabled={okDisabled}>{okLabel}</Button>
</div>
```

**Reihenfolge ist fest: Abbrechen links, Primär rechts.**

### 3.5 Badges — `components/Badge.tsx`

Drei Formen, ein `tone`-System: `ok | warn | danger | brand | neutral`.

#### `Chip` (24 px, rund, mit Icon) — für **Zustände**

```tsx
<span className="inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap
  rounded-full px-2.5 text-2xs font-semibold tracking-[.01em]
  transition-colors duration-300 bg-ok-bg text-ok">
  <Icon name="check-circle" size={13} /> Alles geprüft
</span>
```

| `tone` | Klassen |
|---|---|
| `ok` | `bg-ok-bg text-ok` |
| `warn` | `bg-warn-bg text-warn` |
| `danger` | `bg-danger-bg text-danger` |
| `brand` | `bg-nw-blue-06 text-nw-blue` |
| `neutral` | `bg-nw-grey-40 text-ink-60 border border-line` |

Klickbar → zusätzlich
`cursor-pointer hover:scale-105 hover:opacity-85 active:scale-95` mit
**getrennten Dauern**: `[transition:color_.3s,background-color_.3s,border-color_.3s,opacity_.15s,transform_.15s]`
— Bedeutungswechsel gleitet (300 ms), Hover bleibt flink (150 ms).

#### `Tag` (18 px, Versalien) — für **Klassifizierungen**

```tsx
<span className="inline-flex h-[18px] shrink-0 items-center whitespace-nowrap
  rounded px-1.5 text-2xs font-semibold uppercase leading-none tracking-[.04em]
  transition-colors duration-300 bg-nw-blue-12 text-nw-blue">
  Entwurf
</span>
```

`brand` nutzt hier `bg-nw-blue-12` (statt `-06` beim Chip), `neutral` ist
rahmenlos: `bg-nw-grey-40 text-ink-60`.

#### `Dot` (Ampelpunkt, 8 px)

```tsx
<span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full
  transition-colors duration-300 bg-nw-green" />
```

| `tone` | Farbe |
|---|---|
| `ok` | `bg-nw-green` `#6EBD84` |
| `warn` | `bg-traffic-amber` `#F59D24` |
| `danger` | `bg-traffic-red` `#E50046` |
| `brand` | `bg-nw-blue` `#243186` |
| `neutral` | `bg-ink-40` `#8B8FA1` |

#### Zähler-Badge (Navigation)

```tsx
<span key={badge} className="grid h-4 min-w-4 animate-pop-in place-items-center
  rounded-full bg-traffic-red px-1 text-[10px] font-bold leading-none text-white">
  {badge > 9 ? '9+' : badge}
</span>
```

`key={badge}` sorgt dafür, dass der Zähler bei **jedem Wertwechsel genau einmal**
einpoppt — kein Dauerpulsieren.

### 3.6 Tables

Es gibt keine Table-Komponente — ein festes Markup-Muster:

```tsx
<Pane className="overflow-hidden">
  <table className="w-full border-collapse text-sm">
    <thead>
      <tr className="bg-nw-grey-40/60 text-left">
        <th className="eyebrow px-4 py-2 font-semibold">Zeit</th>
        …
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-line-2 align-top last:border-b-0">
        <td className="whitespace-nowrap px-4 py-2.5 text-ink-60 tnum">…</td>
        <td className="whitespace-nowrap px-4 py-2.5 font-medium">…</td>
        <td className="px-4 py-2.5">…</td>
      </tr>
    </tbody>
  </table>
</Pane>
```

| Element | Stil |
|---|---|
| Wrapper | `Pane` + `overflow-hidden` (damit die Ecken den Kopf beschneiden) |
| Kopfzeile | `bg-nw-grey-40/60`, Zellen mit `.eyebrow` (11 px Versalien) `px-4 py-2` |
| Zeilentrenner | `border-b border-line-2`, letzte Zeile ohne |
| Zellen | `px-4 py-2.5 text-sm`, `align-top` |
| Zahlen/Daten | zusätzlich `tnum` (Tabellenziffern) und `whitespace-nowrap` |
| Leerzustand | `<EmptyState>` **statt** leerer `<tbody>` |
| Zeilenaktion | genau **ein** `⋯`-`Menu` rechts, nie eine Buttonreihe |

### 3.7 Navigationselemente

#### Nav-Eintrag (Seitenleiste)

```tsx
<button aria-current={active ? 'page' : undefined} aria-label={label}
  className="relative flex w-full items-center gap-2.5 rounded-lg text-left text-sm
    transition-[background-color,color,transform] duration-150
    hover:scale-[1.02] active:scale-[.98]
    disabled:cursor-not-allowed disabled:opacity-45
    disabled:hover:scale-100 disabled:hover:bg-transparent disabled:active:scale-100
    h-8 px-2.5
    /* aktiv:   */ bg-nw-blue-06 font-semibold text-nw-blue
    /* inaktiv: */ text-ink-60 hover:bg-nw-grey-40/60 hover:text-ink">
  <Icon name={icon} size={16} />
  <span className="min-w-0 flex-1 truncate">{label}</span>
</button>
```

Höhenvarianten: `h-8` normal · `h-7` eingerückt (Unterpunkt) · `h-9 justify-center px-0` eingeklappt.

#### `Tabs` (unterstrichen — Ansichtswechsel im Screen)

```tsx
<div role="tablist" className="flex gap-0.5 border-b border-line">
  <button role="tab" aria-selected={active} tabIndex={active ? 0 : -1}
    className="-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-2
      text-base font-medium transition-[color,border-color,transform]
      hover:scale-[1.03] active:scale-[.98]
      /* aktiv:   */ border-nw-blue text-nw-blue
      /* inaktiv: */ border-transparent text-ink-60 hover:text-ink">
    {label}
    <span className="rounded-full px-1.5 py-px text-2xs font-semibold tnum
      transition-colors bg-nw-blue-12 text-nw-blue">{count}</span>
  </button>
</div>
```

Tastatur: Roving-Tabindex — nur der aktive Tab ist in der Tab-Reihenfolge,
`←`/`→` wechseln zyklisch und verschieben den Fokus mit.

#### `Segmented` (Pillen — kleine exklusive Auswahl)

```tsx
<div role="group" className="inline-flex shrink-0 gap-0.5 rounded-lg
                             bg-nw-blue-12 p-[3px] h-8">
  <button aria-pressed={active}
    className="inline-flex h-full min-w-[26px] items-center justify-center rounded-md
      px-2 font-medium tnum
      transition-[color,background-color,transform,box-shadow]
      hover:scale-[1.05] active:scale-[.97]
      disabled:opacity-40 disabled:hover:scale-100 text-xs
      /* aktiv:   */ bg-white text-nw-blue shadow-card
      /* inaktiv: */ text-ink-60 hover:text-ink">
    {label}
  </button>
</div>
```

`size="sm"` → `h-7` + `text-2xs`.

#### `Menu` (⋯-Aufklappmenü) — `components/Menu.tsx`

```tsx
{/* Panel — Portal an <body>, per getBoundingClientRect am Auslöser positioniert */}
<div role="menu" style={{ position: 'fixed', top, left|right }}
  className="z-30 min-w-[200px] animate-menu-in rounded-card border border-line
             bg-white p-1 shadow-float">
  <div className="my-1 border-t border-line-2" />   {/* separatorBefore */}
  <button role="menuitem"
    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left
      text-sm outline-none transition-[background-color,transform]
      hover:scale-[1.02] active:scale-[.98] focus-visible:bg-nw-blue-12
      focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-blue
      disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100
      /* normal: */ text-ink hover:bg-nw-blue-06
      /* danger: */ text-danger hover:bg-danger-bg">
    <Icon name={icon} size={15} className="text-ink-60" />
    <span className="flex-1">{label}</span>
    <span className="text-2xs text-ink-40">{hint}</span>   {/* z. B. Shortcut */}
  </button>
</div>
```

**Positionierung:** unterhalb des Auslösers (+4 px); passt es nicht,
oberhalb (−4 px), mindestens 8 px Abstand zum Viewport-Rand.
Bis zur Vermessung ist das Panel `visibility: hidden` — der Fokus wandert erst
danach hinein (sonst löst `focus()` ein Scrollen aus, das das Menü sofort schließt).

**Tastatur:** `↓/↑` zyklisch · `Home`/`End` · `Enter`/`Space` löst aus ·
`Tab` schließt · `Esc` schließt und gibt den Fokus an den Auslöser zurück.
**Schließen:** Außenklick, Scrollen (außer im Panel selbst), Resize.

#### `Popover` (freies Panel)

Wie `Menu`, aber `role="dialog"` und:

```tsx
<div className="z-30 min-w-[240px] animate-menu-in rounded-card border border-line
                bg-white p-3.5 shadow-float">
  <div className="eyebrow mb-2">{title}</div>
  {children}
</div>
```

Ein Klick auf ein Element mit `[data-popover-close]` schließt das Popover
(nötig, bevor ein Dialog darüber geöffnet wird).

**Tastatur (FX19):** Nach der Vermessung wandert der Fokus auf das erste
Bedienelement im Panel (ohne eines auf das Panel, `tabIndex={-1}`),
`Tab`/`Umschalt+Tab` bleiben im Panel, `Esc` schließt und gibt den Fokus an
den Auslöser zurück.

#### Aufklapp-Quittung (Chevron dreht)

```css
/* index.css */
.menu-chevron, .disclose-chevron { @apply transition-transform duration-150; }
[aria-expanded='true'] .menu-chevron     { transform: rotate(180deg); }
[aria-expanded='true'] .disclose-chevron { transform: rotate(90deg); }
```

`<Button iconRight="chevron-down">` bekommt die Klasse automatisch.

#### `kbd` (Tastenkappe)

```tsx
<kbd className="rounded border border-line bg-white px-1.5 py-px
                font-sans text-2xs font-medium text-ink-40">⌘K</kbd>

{/* in der Shortcut-Übersicht: */}
<kbd className="shrink-0 rounded border border-line bg-nw-grey-40 px-2 py-0.5
                font-sans text-xs font-medium text-ink-60">Esc</kbd>
```

### 3.8 Toast — `components/Toast.tsx`

```tsx
{/* Live-Region ist DAUERHAFT gemountet — nur der Inhalt wechselt */}
<div role="status" aria-live="polite"
     className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
  <div key={toast.id} className="pointer-events-auto flex
    max-w-[min(560px,calc(100vw-32px))] animate-toast-in items-center gap-2.5
    rounded-card bg-ink px-3.5 py-2.5 text-sm text-white shadow-float">
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full
                     bg-ok text-white">
      <Icon name="check" size={12} className="[stroke-width:3]" />
    </span>
    <span className="min-w-0">{message}</span>
    <button className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 text-xs
      font-semibold text-white transition-[background-color,transform] duration-150
      hover:scale-[1.02] hover:bg-white/25 active:scale-[.97]">Rückgängig</button>
  </div>
</div>
```

| Art | Icon-Fläche | Standzeit |
|---|---|---|
| `success` | `bg-ok` + `check` | **3500 ms** |
| `error` | `bg-danger` + `x` | **6000 ms** |
| mit Aktionsknopf | — | **8000 ms** |

Der Abgang startet `life − 200 ms` (passend zu `toast-out` 180 ms).

### 3.9 Tooltip — `components/Tooltip.tsx`

Rein CSS über `group-hover` / `group-focus-within`, **kein Portal**. Der Tooltip
liegt `absolute` in der Hülle und wird deshalb von **jedem** Vorfahren mit
`overflow-hidden` (oder `overflow-auto`) abgeschnitten.

**Regel:** Ein `Tip` steht nie unterhalb eines Containers mit `overflow-hidden`.
`Pane` und `StatCard` sind ohne Überlauf-Klasse. Das Tabellen-Muster (§3.6) und
Muster B (§7.3) setzen `Pane className="overflow-hidden"` für die Eckbeschneidung —
dort gehören keine Tooltips hinein. Wer beides braucht, nimmt den `Popover`
(Portal, §3.7). Als Wächter prüft `StartScreen.test.tsx` („kein overflow-hidden
zwischen Tooltip und Versionsliste"), dass die Versionszeile den Tooltip nicht beschneidet.

```tsx
<span className="group/tip relative inline-flex" {...handlers /* useDismissible */}>
  {trigger}
  <span id={id} role="tooltip" className="absolute left-1/2 top-full mt-1.5
    before:bottom-full z-30 hidden w-[260px] -translate-x-1/2 animate-fade-in
    rounded-lg border border-line bg-white p-2.5 text-left shadow-float
    before:absolute before:inset-x-0 before:h-1.5 before:content-['']
    group-focus-within/tip:block group-hover/tip:block">
    {content}
  </span>
</span>
```

| Verhalten | Umsetzung |
|---|---|
| Tastatur | Ist das Kind nicht fokussierbar (Tag, Text), bekommt es eine Hülle mit `tabIndex={0}`, `aria-describedby` und sichtbarem Fokusrahmen. Fokussierbare Kinder (Button, Link, Chip mit Aktion) erhalten nur `aria-describedby`; eine vorhandene Beschreibung bleibt. |
| Abweisen | `Escape` blendet den Tooltip aus, solange Zeiger oder Fokus auf dem Auslöser liegen (`useDismissible.ts`, WCAG 1.4.13). Erst wenn beide ihn verlassen haben, erscheint er wieder. |
| Zeiger | Der Tooltip nimmt den Zeiger an (kein `pointer-events-none`). Eine unsichtbare Brücke (`before:h-1.5`, 6 px) über den Abstand hält ihn beim Hinüberfahren offen. |

`side="top"` → `bottom-full mb-1.5 before:top-full`. `TagTip` ist die Variante für Abzeichen
(`w-[240px]`, Inhalt `text-2xs leading-relaxed text-ink-60`).

### 3.10 Icons — `components/Icon.tsx`

Ein einziges Set: **Lucide-Pfade als Inline-SVG**, kein npm-Paket, keine Emoji,
keine Unicode-Pfeile.

```tsx
<svg viewBox="0 0 24 24" width={size} height={size}
     fill="none" stroke="currentColor" strokeWidth={1.9}
     strokeLinecap="round" strokeLinejoin="round"
     aria-hidden={title ? undefined : true}
     role={title ? 'img' : undefined} aria-label={title}
     className="shrink-0">
  {GLYPHS[name]}
</svg>
```

| Eigenschaft | Wert |
|---|---|
| Standardgröße | **16 px** |
| Strichstärke | **1.9 px** |
| Farbe | immer `currentColor` |
| Größen im Einsatz | 12 · 13 · 14 · 15 · 16 · 20 px |

**Verfügbare Namen (`IconName`):**
`inbox` `search` `chevron-down` `chevron-up` `chevrons-up-down` `chevron-right`
`chevron-left` `arrow-left` `arrow-right` `arrow-left-right` `more` `undo`
`download` `upload` `publish` `sliders` `settings` `plus` `minus` `x` `check`
`check-circle` `x-circle` `alert-triangle` `info` `building` `layout-grid` `home`
`history` `pencil` `network` `user` `users` `user-plus` `user-minus` `maximize`
`trash` `eye` `lock` `map-pin` `compare` `table` `file-text` `shield-check` `copy`
`languages` `calendar` `log-out` `panel-right` `image`

### 3.11 Sonstige Muster

#### Avatar

```tsx
<span className="grid h-8 w-8 place-items-center rounded-full
  bg-gradient-to-br from-nw-blue-90 to-nw-blue text-2xs font-semibold
  tracking-[.04em] text-white
  shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_1px_2px_rgba(36,49,134,.25)]
  transition-transform duration-200 group-hover/user:scale-105">
  {initialen}
</span>
```

Große Variante im Popover: `h-10 w-10 text-xs`.

#### Rollen-Pille

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full bg-nw-blue-06
  px-2 py-0.5 text-2xs font-medium uppercase tracking-[.05em] text-nw-blue">
  Administrator
</span>
```

#### Inline-Warnbanner

```tsx
<details className="mx-6 mt-3 animate-fade-in rounded-card border border-[#EBD9B4]
                    bg-warn-bg px-4 py-2 text-sm text-warn">…</details>

<div role="alert" className="mx-6 mt-3 flex animate-fade-in items-center gap-2
  rounded-card border border-[#EBC5C0] bg-danger-bg px-4 py-2
  text-sm text-danger">…</div>
```

#### Login-Hintergrund (Punktraster)

```tsx
<div className="relative grid min-h-screen place-items-center overflow-hidden
  bg-panel px-4
  [background-image:radial-gradient(circle_at_1px_1px,rgba(28,31,46,.06)_1px,transparent_0)]
  [background-size:22px_22px]">
```

---

## 4. Technischer Framework-Stack

### 4.1 Übersicht

| Schicht | Technologie | Version |
|---|---|---|
| UI-Bibliothek | React | `^19.2.8` |
| Build-Tool | Vite | `^8.2.0` |
| Sprache | TypeScript | `~6.0.2` |
| **Styling** | **Tailwind CSS** | `^3.4.19` |
| CSS-Pipeline | PostCSS + Autoprefixer | `^8.5.26` / `^10.5.4` |
| Schrift | `inter-ui` (lokal gebündelt, nur App-Oberfläche; Blatt/PDF: Arial/Helvetica, §8.2) | `^4.1.1` |
| State | **Zustand** | `^5.0.14` |
| Layout-Rechnung | `d3-hierarchy` | `^3.1.2` |
| PDF-Export | `jspdf` + `svg2pdf.js` | `^4.2.1` / `^2.7.0` |
| Tabellen-Import | `xlsx` (SheetJS CDN-Tarball) | 0.20.3 |
| Tests | Vitest + Testing Library + fast-check | — |
| Linting | oxlint | `^1.75.0` |

**Explizit NICHT verwendet:** MUI, shadcn/ui, Radix, Headless UI, Chakra,
styled-components, Emotion, CSS Modules, SASS/SCSS, clsx/cva, Framer Motion,
lucide-react (die Pfade sind inline kopiert), react-router (Routing läuft über
`window.location.hash` + Zustand).

### 4.2 CSS-Pipeline

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

```ts
// tailwind.config.ts (Auszug)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    fontSize: { /* ERSETZT die Defaults — siehe §1.4 */ },
    extend: { colors, fontFamily, borderRadius, boxShadow, keyframes, animation },
  },
  plugins: [],          // keine Tailwind-Plugins
} satisfies Config
```

### 4.3 Einbindung / Provider

**Es gibt keine Provider für Theming, Styling oder UI.** Der Wurzelbaum ist
bewusst flach:

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'inter-ui/inter-latin.css'   // 1. Schrift
import './index.css'                // 2. Tailwind + Basis-Layer
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

```html
<!-- index.html -->
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Org-Chart-Manager</title>
  </head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

Der einzige React-Context im UI-Bereich ist funktional, nicht visuell:

```ts
// src/ui/components/dialogPrimary.ts
export const DialogPrimaryContext =
  createContext<((primary: DialogPrimary | null) => void) | null>(null)
// Zweck: ein Dialog-Kind meldet seinen Primärknopf beim Modal an,
// damit Enter in Eingabefeldern ihn auslöst.
```

Sprache, Rolle, Projektdaten und UI-Zustand laufen über **Zustand-Stores**
(`src/state/`: `uiStore`, `sessionStore`, `projectStore`, `draftStore`,
`importStore`), Übersetzungen über den Hook `useT()` (`src/ui/useT.ts`)
gegen `src/i18n/ui.ts` — vier Sprachen: DE · IT · EN · ES.

### 4.4 Globales Stylesheet

`src/index.css` ist die **einzige** CSS-Datei des Projekts (64 Zeilen):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-panel text-ink font-sans antialiased text-base;
    font-feature-settings: 'cv11', 'ss01';
  }
  :focus-visible {
    outline: 2px solid theme('colors.nw-blue');
    outline-offset: 2px;
    border-radius: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }
}

@layer components {
  .btn-row   { /* Legacy-Alias, siehe §3.1 */ }
  .dlg-label { @apply mt-3 block text-xs font-semibold text-ink-60; }
  .dlg-input { /* siehe §3.2 */ }
  textarea.dlg-input { @apply h-auto py-2; }
  .tnum      { font-variant-numeric: tabular-nums; }
  .eyebrow   { @apply text-2xs font-semibold uppercase tracking-[.07em] text-ink-40; }
  .menu-chevron, .disclose-chevron { @apply transition-transform duration-150; }
  [aria-expanded='true'] .menu-chevron     { transform: rotate(180deg); }
  [aria-expanded='true'] .disclose-chevron { transform: rotate(90deg); }
}
```

### 4.5 Barrierefreiheit — Systemregeln

| Regel | Umsetzung |
|---|---|
| Fokus immer sichtbar | globales `:focus-visible` (2 px `nw-blue`, Offset 2) |
| Kontrast | Statusfarben ≥ 4,5:1 auf Weiß; `ink-40` nur für Meta, nie für Fließtext |
| Overlays | Portal an `<body>`, Hintergrund `inert`, Fokus-Trap, Fokus-Rückgabe |
| Tastatur | `Esc` schließt · `Tab` zyklisch im Dialog · Pfeile in Menu/Tabs/Combobox · `Enter` = Primäraktion · `⌘K` = Suche |
| Icon-only | `aria-label` Pflicht, wird als `title` gespiegelt |
| Live-Regionen | Toast `role="status" aria-live="polite"` (dauerhaft gemountet), Fehler `role="alert"` |
| Zustand | `aria-current="page"`, `aria-selected`, `aria-pressed`, `aria-expanded`, `aria-busy` |
| Bewegung | `prefers-reduced-motion` global + `motionAllowed()` für JS |
| Dekoration | jedes rein visuelle Element `aria-hidden` |

---

## 5. Nachbau-Checkliste (1:1-Rekonstruktion)

1. **Projekt aufsetzen:** Vite + React 19 + TypeScript, Tailwind 3.4, PostCSS, Autoprefixer.
2. **`tailwind.config.ts`** exakt übernehmen — insbesondere: `fontSize` steht **außerhalb** von `extend` (ersetzt die Defaults), Farben/Radien/Schatten/Keyframes stehen **innerhalb** von `extend`. Keine Plugins.
3. **`src/index.css`** mit den drei `@tailwind`-Direktiven, dem `base`-Layer (body, `:focus-visible`, reduced-motion) und dem `components`-Layer (`.dlg-input`, `.dlg-label`, `.eyebrow`, `.tnum`, `.btn-row`, Chevron-Regeln).
4. **`inter-ui/inter-latin.css` vor `index.css`** importieren, in `main.tsx`.
5. **Keine** CSS-Variablen, **kein** Theme-Provider, **keine** `dark:`-Klassen anlegen.
6. **Bausteine in dieser Reihenfolge bauen:** `Icon` → `Button` → `Badge` (Chip/Tag/Dot) → `Field` (Label/Hint/Toggle/SearchField) → `Layout` (PageHeader/Pane/PaneHeader/EmptyState/StatCard/Skeleton) → `Menu`/`Popover` → `Modal`/`DialogButtons` → `Tabs`/`Segmented` → `SearchSelect` → `Toast` → `Tooltip`.
7. **Shell:** `flex min-h-screen bg-panel` + `aside` 256/84 px + `main px-6 pt-5 pb-10`. Kein Top-Header.
8. **Shell nach §7.1 aufbauen:** Logo oben links in der Seitenleiste, darunter Start-/Zurück-Pillen, Suche, Navigation (scrollend), Speicherstatus, Nutzerkarte. Kein Top-Header.
9. **Screens nach §7.3** einem der fünf Layoutmuster zuordnen und **alle vier Zustände** (Lädt · Leer · Fehler · Inhalt) nach §7.5 bedienen.
10. **Regeln durchhalten:** eine `primary`-Aktion pro Ansicht · Überschriften immer `nw-blue` · Übergänge nur auf konkrete Eigenschaften · jede Hover-Skalierung mit `disabled:hover:scale-100` paaren · alles über z-30 per Portal · jeder Auftritt braucht einen kürzeren Abgang.

---

## 6. Quellenverzeichnis

| Datei | Inhalt |
|---|---|
| `tailwind.config.ts` | Farben, Schriftskala, Radien, Schatten, Keyframes, Animationen |
| `src/index.css` | Basis-Layer, Fokus, reduced-motion, `.dlg-*`, `.eyebrow`, `.tnum` |
| `src/main.tsx` | Schrift- und CSS-Einbindung, React-Root |
| `src/ui/components/Button.tsx` | Buttons (5 Varianten × 3 Größen) |
| `src/ui/components/Badge.tsx` | Chip · Tag · Dot |
| `src/ui/components/Field.tsx` | Label · Hint · Toggle · SearchField |
| `src/ui/components/Layout.tsx` | PageHeader · Pane · PaneHeader · EmptyState · StatCard · Skeleton |
| `src/ui/components/Modal.tsx` | Dialog, Fokus-Trap, DialogButtons |
| `src/ui/components/Menu.tsx` | Menu · Popover (Portal + Positionierung) |
| `src/ui/components/Tabs.tsx` | Tabs · Segmented |
| `src/ui/components/Toast.tsx` | Quittungen |
| `src/ui/components/Tooltip.tsx` | Tip · TagTip |
| `src/ui/components/Icon.tsx` | Icon-Set (Lucide inline) |
| `src/ui/components/SearchSelect.tsx` | Combobox |
| `src/ui/AppShell.tsx` | Seitenleiste, Inhaltsrahmen, Banner |
| `src/ui/motion/motion.ts` | SPRING_EASE · GLIDE_EASE · motionAllowed · FLIP |
| `src/domain/settings/chartSettings.ts` | Chart-/Druckpalette |
| `src/layout/constants.ts` | Druckmaße in mm (A3 quer, Zonen, Knoten, Abstände), Schriftgrößen und Maßstäbe (§8) |
| `src/render/styles.ts` | Kasten- und Linienstile des Blatts (§8.5) |
| `src/render/sheet/*.ts` | Kopf, Zeichenzone, Fußzone, Rollenverzeichnis, Fußleiste (§8.3–8.8) |
| `docs/design-review-2026-08-18.md` | Herleitung des Systems, Befunde, Zielbild |

---

## 7. Vollständige UX-Spezifikation

> Abschnitte 1–3 liefern das *Aussehen*, dieser Abschnitt liefert das *Verhalten
> und die Anordnung*: wo das Logo sitzt, in welcher Reihenfolge die Navigation
> aufgebaut ist, wie jeder Screen strukturiert ist und welche Gesetze für
> Tastatur, Rückmeldung und Zustände gelten.

### 7.1 Shell-Anatomie — die Seitenleiste von oben nach unten

**Es gibt keinen Top-Header.** Die gesamte Orientierung liegt in einer weißen,
schwebenden Karte am linken Rand. Die Reihenfolge ist verbindlich:

```
┌─ aside ─────────────────────────┐  sticky top-0 z-20 h-screen
│  p-3 pr-0 · w-[256px] / w-[84px]│  transition-[width] duration-200
│ ┌─ Karte ─────────────────────┐ │  rounded-xl border-line bg-white shadow-card
│ │                          ○──┼─┼─ (1) Einklapp-Knopf, absolute -right-3 top-7
│ │  ┌───────────────────────┐  │ │      h-6 w-6 rounded-full, Chevron ‹ / ›
│ │  │  N I E D E R W I E S E R│ │ │  (2) LOGO — oben links, w-[196px]
│ │  │  Flexible Food Packaging│ │ │      Zone: px-4 pt-4 pb-3, klickt → Start
│ │  └───────────────────────┘  │ │      darunter Haarlinie mx-4 mb-2
│ │  ─────────────────────────  │ │
│ │  ⌂  ←                  (DE) │ │  (3) Pillen-Knöpfe Start + Zurück,
│ │                             │ │      rechts die App-Sprache (Flaggen-Pille,
│ │                             │ │      LanguageMenu variant="sidebar"), px-4 pb-2
│ │  ┌─────────────────┐ ⌘K     │ │  (4) Suche (Auslöser, öffnet ⌘K-Dialog)
│ │  └─────────────────┘        │ │      px-3 pb-2, h-8
│ ├─────────────────────────────┤ │
│ │  MENÜ                       │ │  (5) nav — scrollt intern (min-h-0 flex-1)
│ │  ● Gesellschaft ▾           │ │      Eyebrow „Menü", px-2.5
│ │  ▦ Übersicht                │ │      Gesellschafts-Umschalter (h-9, Menu)
│ │  ⬡ Chart                    │ │      Hauptnavigation, gap-0.5
│ │  ✎ Bearbeiten               │ │
│ │    │ Stellen                │ │      Untereinträge mit Baumlinie:
│ │    │ Rollen                 │ │      ml-[19px] border-l border-line-2 pl-2.5
│ │  ↑ Festhalten & freigeben   │ │
│ │  ───────────────            │ │      Trenner my-1.5 mx-2 border-line-2
│ │  GESELLSCHAFT               │ │      Eyebrow
│ │  🏢 Stammdaten bearbeiten   │ │
│ │  📍 Standorte               │ │
│ │  📄 Fußnoten des Aushangs … │ │
│ │  👥 Personalvorgänge     ›  │ │      → Untermenü (Menu, align="left")
│ │  ⤓ Als Excel herunterladen  │ │
│ │  ⇄ Versionen vergleichen    │ │
│ │  ───────────────            │ │
│ │  ✉ Rückmeldungen       (3)  │ │      gesellschaftsübergreifend + Zähler
│ │  ↺ Logbuch                  │ │
│ │  ⚙ Einstellungen            │ │
│ │  ░░░ Scroll-Fade ░░░        │ │  (6) Fade, wenn die Navigation überläuft
│ ├─────────────────────────────┤ │      h-14, from-white → transparent
│ │  ✓ Gespeichert · 14:32  ↺ ⌃ │ │  (7) Speicherstatus + Rückgängig + Verlauf
│ │  ┌─────────────────────┐    │ │      border-t border-line-2 pt-2, min-h-7
│ │  │ (DA) Donato A.   ⌃⌄ │    │ │  (8) Nutzerkarte → Popover w-[272px]
│ │  │      Freigeber      │    │ │      Avatar 32 px + Präsenzpunkt
│ │  └─────────────────────┘    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

#### Verbindliche Regeln der Shell

| Regel | Umsetzung |
|---|---|
| **Logo immer oben links** | Erste Zone der Seitenleiste, `w-[196px]`, groß genug, dass „Flexible Food Packaging" lesbar bleibt. Klick → Startseite. Eingeklappt ersetzt der runde Start-Knopf das Logo. |
| Kein Top-Header, keine Brotkrumen | Die Seitenleiste trägt Marke, Kontext, Navigation, Status und Konto. |
| Navigation erst ab Stufe 2 | Der Block „Menü" erscheint **nur**, wenn eine Gesellschaft gewählt ist (`showNav`). Auf der Startseite bleibt die Leiste minimal. |
| Kontext oben, Konto unten | Gesellschaft wechselt man oben im Menü, das eigene Konto liegt am Fuß. |
| Statuszeile hat feste Höhe | `min-h-7` — auch wenn noch nie gespeichert wurde, springt die Fußzeile nie. |
| Gesperrte Einträge bleiben sichtbar | Nie ausblenden: `disabled` + `title` mit dem Sperrgrund (z. B. „Entwurf ist privat"). |
| Einklappen ändert Höhen, nicht Struktur | `h-8 px-2.5` → `h-9 justify-center px-0`; Labels weichen dem Tooltip; Zähler wandert nach `absolute right-1 top-1`. |

#### Die Pillen-Knöpfe „Start" und „Zurück" (Signature-Interaktion)

Ruhender blauer Kreis (36 px), der sich beim Überfahren zur Pille weitet:
Symbol gleitet nach oben hinaus, Wort gleitet von unten herein — 300 ms.

```tsx
/* PillButton — components/HomeButton.tsx; Zielbreite als CSS-Variable
   (labelWidth, Standard 5.5rem), nur bei expand */
<button style={{ '--pill-w': '5.5rem' }}
  className="group relative inline-flex h-9 w-9 shrink-0 items-center
  justify-center overflow-hidden rounded-full bg-nw-blue
  shadow-[0_0_0_3px_theme(colors.nw-blue-12)]
  transition-[width,background-color,border-color] duration-300
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-nw-blue active:scale-[.97]
  disabled:cursor-not-allowed disabled:opacity-40
  hover:w-[var(--pill-w)] hover:bg-nw-blue-90">
  {/* Symbol fährt hinaus */}
  <span className="transition-transform duration-300 group-hover:-translate-y-9">
    <Icon name="home" size={17} className="text-white" />
  </span>
  {/* Wort fährt herein */}
  <span aria-hidden className="absolute inset-0 grid translate-y-6 place-items-center
    text-sm font-semibold text-white opacity-0
    transition-[transform,opacity] duration-300
    group-hover:translate-y-0 group-hover:opacity-100">
    Start
  </span>
</button>
```

Variante `plain` (App-Sprache, `src/ui/components/LanguageMenu.tsx › „variant="plain"“`): `border border-line
bg-white hover:border-nw-blue-25`, Flagge statt Symbol, Wort in `text-nw-blue`,
Zielbreite `6.5rem`.

In der eingeklappten Leiste bleibt der Kreis stehen (`expand={false}`) — dann
erklärt der Tooltip. „Start" ist auf der Startseite selbst gesperrt, „Zurück"
ohne Verlauf ebenfalls (führt nie aus der App hinaus).

#### Gesellschafts-Umschalter

```tsx
<button className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-line
  text-left text-sm font-semibold
  transition-[border-color,background-color,transform] duration-150
  hover:scale-[1.02] hover:border-nw-blue-25 hover:bg-nw-blue-06 active:scale-[.98] h-9 px-2.5">
  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-nw-blue" />
  <span className="min-w-0 flex-1 truncate">{legalName}</span>
  <Icon name="chevron-down" size={14} className="menu-chevron text-ink-40" />
</button>
```

#### Nutzerkarte am Fuß

Rahmenlos, ruhig; öffnet ein Popover (272 px) mit Konto-Kopf, Rollenpille und
Abmelden. Avatar mit Verlauf `from-nw-blue-90 to-nw-blue` und grünem
Präsenzpunkt (`h-2.5 w-2.5 rounded-full border-2 border-white bg-ok`,
`absolute -bottom-px -right-px`). Offen färbt sich die Karte
`aria-expanded:bg-nw-blue-06`.

### 7.2 Informationsarchitektur

Drei Stufen, streng hierarchisch:

```
Stufe 1  Anmeldung            LoginScreen        (ohne Shell)
   ↓
Stufe 2  Gesellschaftswahl    HomeScreen         (Shell, minimale Leiste)
   ↓
Stufe 3  Arbeit an EINER Gesellschaft            (Shell, volle Navigation)
         ├── Übersicht        StartScreen        Dashboard, Einstieg
         ├── Chart            ChartViewScreen    „Das Blatt ist der Held"
         ├── Bearbeiten       EditorScreen       └ Stellen · Rollen
         ├── Festhalten & freigeben  PublishScreen
         ├── Rückmeldungen    InboxScreen        (gesellschaftsübergreifend)
         ├── Logbuch          LogScreen
         └── Einstellungen    SettingsScreen     (nur Freigeber)

Sonderräume (außerhalb der Shell):
         Geteilte Ansicht     SharedViewScreen   #/shared/<token>, ohne Anmeldung
         Gesperrter Entwurf   LockedDraftScreen
         Import               ImportScreen       vierstufiger Assistent
```

**Routing:** `window.location.hash` + Zustand-Store, kein Router-Paket.
Hash-Format `#/<screen>/<entityId>[?v=<versionId>]`. Browser-Zurück/-Vor,
Reload und geteilte Links funktionieren; ein unbekannter Link fällt still auf
den Arbeitsstand zurück.

### 7.3 Screen-Layoutmuster

Jeder Screen der Stufe 3 folgt genau einem dieser fünf Muster:

#### Muster A — Kartenraster (HomeScreen)

```tsx
<div className="mx-auto max-w-4xl px-2 pt-6">
  <h1 className="animate-fade-in text-center text-xl font-semibold
                 tracking-[-.014em] text-nw-blue">…</h1>
  <p className="animate-fade-in mt-1 text-center text-sm text-ink-60">…</p>
  <div className="mt-7 grid animate-fade-in gap-4 sm:grid-cols-2 lg:grid-cols-3"
       style={{ animationDelay: '60ms' }}>
    {/* klickbare Karten, siehe §3.3 */}
  </div>
</div>
```

Gestaffelter Auftritt: Titel sofort, Raster mit **60 ms Verzögerung**.

#### Muster B — Kopf + Flächen (StartScreen, LogScreen, InboxScreen, PublishScreen)

Menü- und Seitennamen kommen aus `t.nav.screens` (`src/i18n/ui.ts › nav.screens`): ein Name
je Seite in Menü, Kopf und Fenstertitel — „Festhalten & freigeben" (PublishScreen),
„Rückmeldungen" (InboxScreen).

```tsx
<>
  <PageHeader eyebrow={…} title={…} meta={<>… <Sep /> …</>} actions={<Button variant="primary" />} />
  <Pane className="overflow-hidden">…</Pane>
</>
```

#### Muster C — Drei Spalten (EditorScreen)

```tsx
<div className="grid items-start gap-3.5 xl:grid-cols-[240px_minmax(0,1fr)_316px]">
  {/* Liste · Inhalt · Detailpanel */}
</div>
```

Unter 1280 px stapeln die Spalten. Das Detailpanel ist `xl:sticky xl:top-5`.

#### Muster D — Zwei Spalten (SettingsScreen)

```tsx
<div className="grid items-start gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
```

#### Muster E — Vollflächiges Blatt (ChartViewScreen)

Das A3-Blatt bekommt die volle Breite; die Werkzeuge schweben darüber.
Toolbar in **drei Gruppen**: Blatt-Segment · Status-/Prüf-Chips ·
„Ansicht"-Popover + „PDF ▾"-Split-Button. Zoom schwebt.

> **Kopfzeilen:** Die rechte Ecke gehört den Aktionen des Bildschirms — es wird
> kein Platz reserviert. Die App-Sprache sitzt seit dem 03.09.2026 in der
> Seitenleiste neben Start und Zurück (§7.1, Zone 3;
> `src/ui/components/Layout.tsx › „Die rechte Ecke gehört den Aktionen“`,
> `src/ui/AppShell.tsx › „<LanguageMenu variant="sidebar"“`). Die früheren Klassen `pr-48`/`pr-52` gibt es nicht mehr.

### 7.4 Interaktionsgesetze

#### Tastatur (global)

| Taste | Wirkung |
|---|---|
| `⌘K` / `Strg+K` | Globale Suche öffnen |
| `?` | Tastatur-Übersicht (nicht in Eingabefeldern) |
| `Esc` | Oberste Ebene schließen: Dialog → Popover → Liste |
| `Tab` / `Shift+Tab` | Im Dialog zyklisch gefangen |
| `Enter` | Im Dialog: Primäraktion (nicht in `textarea`/Combobox/offenem Menü) |
| `↑` `↓` | Menü, Combobox |
| `←` `→` | Tabs (Roving Tabindex) |
| `Home` / `End` | Menü: erster/letzter Eintrag |
| `⌘`/`Strg` + Scroll | Chart zoomen |
| Doppelklick | Teilbaum auf-/zuklappen |
| Rechtsklick | Kontextmenü am Knoten |
| Ziehen | Knoten umhängen |

#### Rückmeldung — vier Kanäle, klar getrennt

| Kanal | Wofür | Beispiel |
|---|---|---|
| **Toast** (unten mittig) | Abgeschlossene Handlung | „Fassung veröffentlicht" · „Rückgängig: Person zugeordnet" |
| **Statuszeile** (Fuß der Leiste) | Dauerzustand | „✓ Gespeichert · 14:32" |
| **Chip/Tag** (im Kontext) | Zustand eines Objekts | „Entwurf" · „3 Hinweise" |
| **Banner** (über dem Inhalt) | Systemlage | Datenprüfung (warn) · Ladefehler (danger) |

**Regel:** Nie zwei Kanäle für dieselbe Sache. Ein Toast wiederholt nicht,
was ohnehin als Chip sichtbar ist.

#### Speicherstatus & Rückgängig

- Statuszeile zeigt `✓ Gespeichert · hh:mm` mit `animate-fade-in`; das Häkchen poppt (`animate-pop-in text-ok`).
- Fehler ersetzt sie durch `<Chip tone="danger" icon="x-circle">Nicht gespeichert</Chip>`.
- `aria-live="polite"` sitzt **nur** um den Statusinhalt — der Rückgängig-Knopf daneben darf nicht als Statuswechsel vorgelesen werden.
- Rückgängig: Icon-Knopf + Chevron-Menü mit den letzten **10** Schritten (neueste zuerst); Klick auf den n-ten macht n Schritte auf einmal rückgängig; die Quittung nennt den zurückgenommenen Schritt.

#### Sperren statt Verstecken

Gesperrte Aktionen bleiben sichtbar und tragen den Grund im `title`:

```tsx
<NavItem label="Vergleichen" disabled={noVersion}
         title="Es gibt noch keine veröffentlichte Fassung" … />
```

#### Dialoge global, nicht pro Seite

Verwaltungsdialoge (Stammdaten, Standorte, Fußnoten, Personalvorgänge,
Vergleich) werden aus der Seitenleiste geöffnet und sind auf **jeder** Seite
verfügbar — es gibt keine Duplikate auf den Screens.

### 7.5 Zustands-Choreografie

Jede Ansicht kennt vier Zustände. Alle vier sind Pflicht:

| Zustand | Darstellung |
|---|---|
| **Lädt** | `<Skeleton>`-Platzhalter in der Form des späteren Inhalts, `role="status" aria-label="Lädt"` — **nie** ein Spinner in der Seitenmitte, **nie** eine Textzeile |
| **Leer** | `<EmptyState>` mit Icon, Satz, Hinweis und – wenn sinnvoll – einer Aktion |
| **Fehler** | `role="alert"`-Banner (`border-[#EBC5C0] bg-danger-bg`) oder, wenn gar nichts geladen wurde, `<EmptyState icon="alert-triangle">` mit „Erneut versuchen"-Knopf |
| **Inhalt** | Der Normalfall |

Skelett-Beispiel (die Seite „steht" bereits, bevor Daten da sind):

```tsx
<div role="status" aria-label="Lädt" className="mx-auto max-w-4xl">
  <Skeleton className="mx-auto mb-2 mt-1 h-7 w-64" />
  <Skeleton className="mx-auto mb-6 h-4 w-96" />
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <Skeleton className="h-[150px]" /><Skeleton className="h-[150px]" /><Skeleton className="h-[150px]" />
  </div>
</div>
```

### 7.6 Belohnende Momente (bewusst dosiert)

Fünf Effekte, jeder **genau einmal** und unter `prefers-reduced-motion` aus:

| Moment | Effekt | Wo |
|---|---|---|
| Blatt öffnet sich | `animate-sheet-enter` 650 ms, `transformOrigin: '50% 42%'` | Chart |
| Blatt wechselt | `animate-sheet-swap` (nur Deckkraft, 140 ms) — bewusst schwächer | Chart |
| Freigabe | `stamp-in` + `ink-pulse` + `dissolve`: der ENTWURF-Wasserzeichen löst sich auf, der Stempel setzt auf (Verzögerung 560 ms) | Festhalten & freigeben |
| Frisch veröffentlicht | `shine-sweep` — ein Lichtlauf über die Karte | Übersicht |
| Offener Prüfpunkt | `attention` — genau ein Atemzug (Skalierung 1 → 1.45 → 1) | Ampelpunkt |

**Regel:** Kein Effekt wiederholt sich, keiner läuft dauerhaft, keiner blockiert.

### 7.7 UX-Prüfliste vor jedem Merge

- [ ] Genau **eine** gefüllte `primary`-Aktion in der Ansicht?
- [ ] Zeilenaktionen in **einem** `⋯`-Menü statt als Buttonreihe?
- [ ] Alle vier Zustände da (Lädt · Leer · Fehler · Inhalt)?
- [ ] Gesperrtes sichtbar **mit Grund** statt versteckt?
- [ ] Erklärtext als Tooltip / Empty State — nicht als Dauerzeile unter der Überschrift?
- [ ] Jede abgeschlossene Handlung quittiert (Toast), jeder Dauerzustand angezeigt (Chip/Statuszeile)?
- [ ] `Esc` schließt, `Tab` bleibt gefangen, Fokus kehrt zum Auslöser zurück?
- [ ] Jedes Icon-only-Element mit `aria-label`?
- [ ] Jede Animation hat einen kürzeren Abgang und ist unter `prefers-reduced-motion` still?
- [ ] Keine neue Hex-Farbe, keine neue Schriftgröße, kein neuer Radius?

---

## 8. Druckbild — der A3-Aushang

> Abschnitte 1–7 beschreiben die App-Oberfläche. Dieser Abschnitt beschreibt das
> **gedruckte Blatt**: Zonen, Schrift, Kästen, Linien, Legende, Fuß. Er beschreibt
> nur. Maßgeblich bleibt der Code; jede Zahl trägt ihre Fundstelle als Symbol
> (`Datei › Name`, geprüft von `scripts/docRefs.test.mjs`). Wer eine dieser
> Konstanten ändert, zieht die Tabelle nach.

### 8.1 Grundsätze (verbindlich)

| Regel | Beleg |
|---|---|
| **Eine Quelle** für Bildschirmvorschau und PDF: ein SVG in mm, `viewBox 0 0 420 297` | `src/render/sheetSpec.ts › „Eine einzige SVG-Quelle für“`, `› buildSheet` |
| **A3 quer**, Druckrand 10 mm rundum | `src/layout/constants.ts › PAGE` |
| **Ein-Blatt-Fassung liefert immer ein Blatt** — nie eine Meldung statt Blatt. Die Poster-Schriftgrößen sind Nenngrößen, keine Sperre (Entscheid Donato 07.09.2026) | `src/layout/constants.ts › „Poster-Typografie (ADR 0005“`, `› COMPACT_MIN_SCALE`; `src/layout/typography.test.ts › „der Ein-Blatt-Modus liefert immer ein Blatt“` |
| **Anordnung ist Referenz**: neue Anordnungsmechaniken nur als Einstellung mit Standard AUS; die Kastenhöhe folgt dem Text | `src/domain/settings/chartSettings.ts › DEFAULT_CHART_SETTINGS` (`compactSheets: false`, `zones: { enabled: false }`); `src/layout/constants.ts › „Boxhöhe folgt dem Text“` |
| **Kein Wortbruch** mitten im Wort: die ganze Ebene wird so breit wie ihr längstes Wort | `src/layout/nodeMetrics.ts › requiredWidthMm`, `src/layout/constants.ts › „Die Breiten sind UNTERGRENZEN“` |
| **Orange existiert nicht**; Unterscheidung auch im Schwarzweißdruck über Rahmenstärke, Strichelung und Kürzel | `src/render/styles.ts › „Orange existiert hier bewusst nicht“` |
| Außerhalb des Chart-Maßstabs (Kopf, Fußzone, Fußleiste) steht **nichts unter 8 pt** | `src/render/sheetSpec.test.ts › „kein font-size außerhalb des Chart-<g> unter 8 pt“` |

### 8.2 Schrift

| Ort | Schrift | Beleg |
|---|---|---|
| SVG (Vorschau) | `font-family="Arial, Helvetica, sans-serif"` | `src/render/svg.ts › „font-family="Arial, Helvetica, sans-serif"“` |
| PDF | jsPDF-Standardschrift **Helvetica**, nicht eingebettet (metrisch gleich Arial, Text bleibt durchsuchbar) | `src/pdf/registerFonts.ts › applyPdfBaseFont`, `src/layout/measure/TextMeasurer.ts › „Schrift seit 07.09.2026: ARIAL“` |
| Messung | Advance-Width-Tabelle `fontMetrics.json` aus den System-Arial-Schnitten (`npm run gen:fonts`) — Bildschirm, PDF und Tests brechen identisch um | `src/layout/measure/TextMeasurer.ts › „Deterministische Textmessung“` |

Inter ist die Schrift der App-Oberfläche (§1.4) und kommt auf dem Blatt nicht vor.

Typografische Hierarchie im Kasten: **Funktion fett und größer** als der Name,
Name normal, Vertretung normal (nicht kursiv) in Dunkelgrau `#444444`
(`src/render/styles.ts › inkSecondary`).

### 8.3 Zonen des Blatts (mm, von oben)

| Zone | Lage | Beleg |
|---|---|---|
| Rand oben | 0–10 | `src/layout/constants.ts › PAGE.margin` |
| Kopf | 10–22, Trennlinie bei 22 (0,6 mm, NW-Blau) | `src/layout/constants.ts › ZONES.headBottom`; `src/render/sheet/head.ts › „S.colors.headRule, 0.6“` |
| Puffer | 22–24 | `src/layout/constants.ts › ZONES.drawTop` |
| Kopf-Zeile 2 (opt-in) | hebt Trennlinie und Zeichenzone um 2,5 | `src/render/sheet/head.ts › HEAD_LINE2_EXTRA` |
| Zeichenzone | 24 bis Fußzonen-Oberkante − 1,5 | `src/render/sheetSpec.ts › CHART_FOOT_GAP`, `› „Vorbedingungen (sonst überlappen Chart und Fußzone“` |
| Fußzone | **unten verankert**, Unterkante 280, Höhe = Inhalt | `src/layout/constants.ts › ZONES.footBottom`; `src/render/sheetSpec.ts › footZoneHeight` |
| Fußleiste | 281–287, eine Zeile | `src/layout/constants.ts › ZONES.footerTop`, `› ZONES.footerBottom` |
| Rand unten | 287–297 | `src/layout/constants.ts › PAGE.height`, `› PAGE.margin` |

Kontrollrechnung: 10 + 14 + Zeichenzone + 1,5 + Fußzone + 1 + 6 + 10 = 297
(`src/layout/constants.ts › „10 + 14 + Zeichenzone + 1,5 + Fußzone + 1 + 6 + 10 = 297“`). Die Zeichenbreite ist
400 mm (`src/layout/constants.ts › ZONES.drawWidth`).

### 8.4 Kopf (Kopfhöhe 24 mm ab Blattkante)

| Element | Vorgabe | Beleg |
|---|---|---|
| Titel | „Organigramm ‹Firmierung›" oder eigener Titel, **28 pt fett, NW-Blau**, Grundlinie 17,1 (Oberkante bündig mit dem Logo) | `src/layout/constants.ts › FONTS.chartTitle`; `src/render/sheet/head.ts › HEAD_TITLE_Y`, `› renderHead` |
| Titel zu lang | wird bis **22 pt** eingepasst, statt ins Logo zu laufen | `src/layout/constants.ts › FONTS.chartTitleMin`; `src/render/sheet/head.ts › „bis auf 22 pt eingepasst“` |
| Logo | rechts oben (Standard), Oberkante 10, Höhe 10,6 mm (Kopfband 12 − 1,4 Luft) | `src/domain/settings/chartSettings.ts › „logoPosition: 'top-right'“`; `src/render/sheet/logo.ts › LOGO_HEAD_MAX_H` |
| QR-Code (opt.) | links vom Logo, 10,6 mm, 1 mm Ruhezone, Bildunterschrift 8 pt in `ink60` | `src/render/sheet/head.ts › QR_HEAD_SIZE`, `› QR_QUIET`, `› QR_CAPTION_Y` |
| Zeile 2 (opt.) | Untertitel · Standorte, 8 pt, Grundlinie 22,3; **ab Werk aus** | `src/render/sheet/head.ts › HEAD_LINE2_Y`, `› hasHeadLine2`; `src/domain/settings/chartSettings.ts › „showLocations: false“` |

Die Pflichtangaben der Dokumentenlenkung stehen nicht im Kopf, sondern in der
Fußleiste (§8.8). Test: `src/render/sheetSpec.test.ts › „Kopf 24 mm: Titel-Grundlinie 17,1, Trennlinie 22“`.

### 8.5 Kästen, Ebenen und Linien (Zeichenzone)

**Ebenen-Staffelung** — Führungsebenen erkennt man an Breite und Titelgröße,
nicht nur an der Farbe. Die Breiten sind Untergrenzen; `requiredWidthMm` zieht
eine Ebene breiter, wenn ein Wort es verlangt (`src/layout/constants.ts › LEVELS`):

| Ebene | Bedeutung | Breite (mm) | Titelfaktor | Titel bei Nenngröße |
|---|---|---|---|---|
| 0 | Leadership | 84 | 1,45 | 15,95 pt |
| 1 | Board | 77 | 1,30 | 14,3 pt |
| 2 | Group-/Standortführung | 69 | 1,15 | 12,65 pt |
| 3 | betriebliche Führung | 54 | 1,05 | 11,55 pt |
| 4+ | Teams und Mitarbeitende | 50 | 1,00 | 11 pt |

| Maß | Wert | Beleg |
|---|---|---|
| Namensliste (Sammelbox) | Ebenenbreite × 48/58, gerundet | `src/layout/constants.ts › CLUSTER`, `› listWidthAt` |
| Kastenecke | 1,4 mm (Einstellung `boxCornerMm`) | `src/domain/settings/chartSettings.ts › „boxCornerMm: 1.4“` |
| Rahmen | 0,25 mm; Leadership 0,4 mm | `src/layout/constants.ts › NODE.stroke`, `› NODE.strokeLeadership` |
| Abstand Geschwister / abteilungsübergreifend / Ebenen | 6 / 9 / 11 mm (per Einstellung übersteuerbar, übergreifend = Geschwister + 3) | `src/layout/constants.ts › GAPS`, `› effectiveGaps` |
| Linienende vor dem Kasten | 1 mm | `src/layout/constants.ts › GAPS.edgeToNode` |
| Kastenhöhe | folgt dem Text (Zeilen + Polster), keine Mindesthöhe | `src/layout/constants.ts › „Boxhöhe folgt dem Text“`; `src/layout/nodeMetrics.ts › slotHeightMm` |

**Standort-Chip** — der Standort ist genau einmal codiert: Chip unten rechts im
Kasten, auf einer **eigenen reservierten Zeile** (kann keinen Namen überdecken).
Höhe = Versalhöhe + 2 × Polster, waagerechtes Polster ≥ halbe Höhe
(`src/layout/nodeMetrics.ts › locChipMetrics`, `› locChipBox`). Nur bei mehr als einem Standort
(Einstellung `showLocationCode: 'auto'`, `src/domain/settings/chartSettings.ts › „showLocationCode: 'auto'“`).

**Kastenstile** (`src/render/styles.ts › NODE_STYLES`, Vorrang `› nodeStyleKind`: Vakanz vor
Fremdgesellschaft vor extern vor zugewiesener Kastenart vor Automatik):

| Stil | Füllung | Rahmen | Schrift |
|---|---|---|---|
| Wurzel (`board`) | `#243186` | `#243186` 0,25 | Weiß |
| Leadership (Werkseinstellung) | `#BBD4F0` | `#243186` 0,4 | `#243186` |
| Führungskraft (`management`) | `#DDEAF8` | `#243186` 0,25 | `#243186` |
| Team | `#EBE7E2` | `#D7CFC5` 0,25 | `#243186` |
| Vakanz | `#FFFFFF` | `#243186` 0,25, gestrichelt `1 0.7` | `#7C83B6` |
| Fremdgesellschaft | `#DBEEE0` | `#6EBD84` 0,25 | `#243186` |
| extern besetzt | `#FFFFFF` | `#7C83B6` 0,25, gestrichelt `0.4 0.8` | `#7C83B6` |

Kastenarten sind pflegbar (`src/domain/settings/chartSettings.ts › DEFAULT_BOX_STYLES`).
Die Werkseinstellungen oben gelten, solange die Projektdaten nichts anderes
sagen. **Farbtausch 18.09.2026 (Entscheid Donato):** Die Gruppe überschreibt in
den Projektdaten (`settings.boxStyles`, gilt für alle Gesellschaften)
Leadership mit `#B7DEC2` (Green 50 %) und führt die eigene Kastenart „Site
Management Team Member" mit `#BBD4F0`. Das steht nur in den Daten, nicht im
Code. Geprüft am 23.09.2026 durch Lesen der Projektdatei.

**Linien** (`src/render/styles.ts › EDGE_STYLES`):

| Linie | Farbe | Stärke | Strichelung |
|---|---|---|---|
| Berichtslinie (disziplinarisch) | `#243186` | 0,25 mm | durchgezogen |
| Fachliche Linie | `#6EBD84` | **0,5 mm** (seit 18.09.2026) | `2.4 1.4` |
| extern | `#8B8FA1` | 0,25 mm | `0.4 0.8` |

Die fachliche Linie tritt seitlich auf halber Kastenhöhe ein; ihre Schiene läuft
versetzt zur Berichtslinie. Von oben kommt nur die disziplinarische Linie
(`src/layout/layoutChart.ts › functionalEdges`).

### 8.6 Schriftnenngrößen und Untergrenzen

Nenngröße gilt bei Maßstab 1. Beim Einpassen wird jede Chart-Schrift an ihrer
Untergrenze geklemmt (`src/layout/constants.ts › scaledFontPt`). Die Klassen im
Chart-Maßstab stehen in `SCALED_FONT_CLASSES` (`src/layout/constants.ts › SCALED_FONT_CLASSES`).

| Klasse | Nenngröße | Untergrenze | Schnitt | Beleg |
|---|---|---|---|---|
| Blatttitel | 28 pt | (Einpassen bis 22 pt) | fett | `src/layout/constants.ts › FONTS.chartTitle`, `› FONTS.chartTitleMin` |
| Kopf-Zeile 2, Metablock | 8 pt | — | normal | `src/layout/constants.ts › FONTS.locationLine`, `› FONTS.metaBlock` |
| Funktion (`positionTitle`) | 11 pt × Titelfaktor | 6,5 pt | fett | `src/layout/constants.ts › FONTS.positionTitle`, `› LEVELS` |
| Person (`personName`) | 10 pt | 6,0 pt | normal | `src/layout/constants.ts › FONTS.personName` |
| Vertretung (`deputyLine`) | 9 pt | 6,0 pt | normal, `#444444` | `src/layout/constants.ts › FONTS.deputyLine` |
| Namensliste (`listName`) | 9 pt | 6,0 pt | normal | `src/layout/constants.ts › FONTS.listName` |
| Standortkürzel (`locationCode`) | 8 pt | 6,0 pt | fett | `src/layout/constants.ts › FONTS.locationCode` |
| Zonentitel (`zoneTitle`) | 11 pt | 6,5 pt | fett, gedämpft | `src/layout/constants.ts › FONTS.zoneTitle` |
| Legende | 9 pt | 8 pt (Fallback vor Umbruch) | normal | `src/layout/constants.ts › FONTS.legend` |
| Regelzeile (`footnotes`) | 8 pt | 8 pt | normal | `src/layout/constants.ts › FONTS.footnotes` |
| Fußleiste (`footerBar`) | 8 pt | 8 pt | normal | `src/layout/constants.ts › FONTS.footerBar` |

**Maßstäbe:**

| Konstante | Wert | Bedeutung | Beleg |
|---|---|---|---|
| `MIN_SCALE` | 0,6 | 6 pt / 10 pt — Personenzeile an der Härteregel; bewusst nicht 1 | `src/layout/constants.ts › MIN_SCALE` |
| `COMPACT_MIN_SCALE` | 0,6 | Lesegrenze-Referenz der Ein-Blatt-Fassung. Passt das Bild bei keinem Maßstab, druckt sie **trotzdem** ein Blatt, dann unter der Klemmung, und meldet die echte Größe | `src/layout/constants.ts › COMPACT_MIN_SCALE` |
| `PAGINATE_MIN_SCALE` | 0,7 | Mehrblatt-Fassung (Lesefassung): schneiden, bis jedes Blatt bei ≥ 0,7 passt (7-pt-Namen) | `src/layout/constants.ts › PAGINATE_MIN_SCALE` |
| `FILL_MAX_SCALE` | 1,25 | kleine Charts höchstens auf 125 % vergrößern (12,5-pt-Namen) | `src/layout/constants.ts › FILL_MAX_SCALE` |
| `POSTER_MIN_PERSON_PT` | 8 pt | Unter 8 pt gedruckter Personenzeile erscheint ein **Hinweis** in der Prüfung, keine Sperre | `src/domain/validation/renderChecks.ts › POSTER_MIN_PERSON_PT` |

Zwei Schwellen stehen nebeneinander: Der Prüfhinweis greift unter 8 pt
(`POSTER_MIN_PERSON_PT`), die Maßstabs-Anzeige der Chartansicht färbt sich erst
unter 7 pt (`src/ui/screens/ChartViewScreen.tsx › „personPt < 7“`, Text `smallFontHint` in
`src/i18n/ui.ts › smallFontHint`). Das ist eine bekannte Unstimmigkeit, keine Vorgabe.

Tests: `typography.test.ts` (Klemmung je Maßstab, alle Titelfaktoren ≥ 1,
MIN_SCALE = 0,6).

### 8.7 Fußzone (Legende, Regelzeile, Sonderrollen)

Aufbau von oben nach unten (`src/render/sheet/footZone.ts › FOOT`, Planung `› planFootZone`):

| Schicht | Maß (mm) | Inhalt |
|---|---|---|
| Trennlinie | 0,2 mm, `#D7CFC5` | `src/render/sheet/footZone.ts › „S.colors.footRule, 0.2“` |
| Luft | 1,0 | `FOOT.padTop` |
| Legende | 4,4 je Zeile, Grundlinie +3,4 | **eine Zeile zu 9 pt**; passt sie nicht, 8 pt; erst dann Umbruch. Kein Eintrag entfällt |
| Regelzeile | 3,2 je Zeile + 0,4 Unterlänge | Vertretungsregel · Weisungsrecht, 8 pt, **immer** (Pflicht) |
| Luft | 2,0 | nur wenn Sonderrollen folgen |
| Kachelzeile(n) | höchste Kachel; 2,0 zwischen zwei Zeilen | Sonderrollen |
| Bodenluft | 0,5 | → Unterkante 280 |

**Legende** — datengetrieben, auf allen Blättern einer Gesellschaft gleich
(`src/render/sheet/footZone.ts › legendEntries`): Wurzel, genutzte Kastenarten, Vakanz und extern nur wenn
vorhanden, Linienarten nur wenn es beide gibt (mit echtem Linienmuster 7 mm),
alle Marker-Rollen, Datumsklammer nur bei Bedarf, Standortkürzel nur bei mehr
als einem Standort. Einstellung `showLegend` lässt sie weg.

**Sonderrollen als Kacheln** (Standard `roleStyle: 'tiles'`, `roleTiles: 'brc'`,
`src/domain/settings/chartSettings.ts › DEFAULT_CHART_SETTINGS`):

- `'brc'` druckt nur das BRC-Minimum: Slots `sortOrder` 1 (HACCP-/HARA-Leitung),
  2 (BRC-Verantwortung), 4 (Krisenmanagement) und Team-Rollen mit Marker
  (`src/domain/validation/renderChecks.ts › BRC_ROLE_SLOTS`, `› sheetRoles`).
  `'all'` druckt jede Rolle mit `showInRoleBox`. Obergrenze `ROLE_BOX_MAX = 12`
  (`src/domain/validation/renderChecks.ts › ROLE_BOX_MAX`). Nicht gedruckte Rollen
  meldet die Prüfung (`role_off_sheet`).
- Kachel = Kastenformat des Charts: Breite **69 mm** (Ebene 2), Abstand 6 mm,
  Typografie der Ebene 4 bei Nenngröße (11 fett / 10 / 9 / Chip 8 fett), gesetzt
  über dieselben Funktionen wie die Chart-Kästen (`src/render/sheet/footZone.ts › TILE_WIDTH`, `› slotTile`).
- Höchstens fünf Slot-Kacheln je Zeile; die Team-Kachel füllt den Rest der Zeile
  (mindestens 120 mm, sonst eigene Zeile) und setzt alle Mitglieder in Spalten
  (`src/render/sheet/footZone.ts › slotsPerRow`, `› teamTile`, `› planTiles`).
- `roleStyle: 'list'` ersetzt die Kacheln durch ein flaches Verzeichnis in 8 pt,
  3 oder 4 Spalten (die flachere gewinnt), Umbruch nur an Leerzeichen und nach „/"
  (`src/render/sheet/roleRegister.ts › REGISTER`, `› planRegister`).

Gemessene Fußzonenhöhen (Tests): S.p.A. 32,0 ± 0,5 mm, Gesellschaft ohne
BRC-Rollen 9,5 ± 0,3 mm (`src/render/sheetSpec.test.ts › „Fußzone der S.p.A. 32,0 ± 0,5 mm“`,
`› „Entität ohne BRC-Rollen → 9,5 ± 0,3 mm“`).

### 8.8 Fußleiste (281–287 mm)

Eine 8-pt-Zeile, Grundlinie 285,0, Farben nie heller als `ink60`
(`src/render/sheet/footerBar.ts › FOOTER_LINE_Y`, `› renderFooterBar`):

- **links** die Dokumentenlenkung (`src/render/sheet/footerBar.ts › metaPairs`): immer
  sichtbar Dokumentcode, Version, Stand, Freigegeben von (`META_FIELD_LOCKED`,
  `src/domain/settings/chartSettings.ts › META_FIELD_LOCKED`); ab Werk dazu Freigegeben am. Ersteller und nächste
  Prüfung sind ab Werk aus (`src/domain/settings/chartSettings.ts › META_FIELD_HIDDEN_DEFAULT`);
- danach „Blatt n von m" nur bei mehreren Blättern, Druckzeitpunkt nur im
  Arbeitsstand, optional ein Zusatztext;
- **rechts** je nach Fassung: roter Warnbalken `#E50046` ab x 292 (Arbeitsstand),
  Hinweis „interne Fassung", oder in der freigegebenen Fassung das
  Unterschriftsfeld x 365–410 (Einstellung `signatureField`, ab Werk an).

Was rechts nicht mehr in die Zeile passt, meldet der Renderer
(`src/render/sheetSpec.ts › droppedFooterEntries`). Gestrichen und nicht mehr
vorgesehen: Druckhinweis, „nicht gelenkte Kopie" (`src/render/sheetSpec.ts › „Gestrichen: Druckhinweis“`).

**Arbeitsstand-Wasserzeichen:** Text 60 pt fett, `#F1EEE9` (Warm Grey 35 %
gegen Weiß vorgemischt, keine Transparenz im PDF), um −30° gedreht, hinter dem
Inhalt (`src/render/sheetSpec.ts › „rotate(-30“`, `src/render/styles.ts › „vermeidet Transparenz (ExtGState)“`).

### 8.9 Farben im Blatt vs. App

Das Blatt hat eine eigene, am Brandbook ausgerichtete Palette
(`src/render/styles.ts › COLORS`, `› DEFAULT_PALETTE`). Die gedämpften Blatt-Töne
sind NW-Blau bei 60 % bzw. 40 % gegen Weiß (`ink60 #7C83B6`, `ink40 #A7ADCF`) und
damit **nicht** die App-Tokens `ink-60`/`ink-40` aus §1.1. Statusfarben der App
(§1.1) kommen im Blatt nie vor.

### 8.10 Wächter

| Aussage | Test |
|---|---|
| Kopf 24 mm, Titel-Grundlinie 17,1, Trennlinie 22 | `src/render/sheetSpec.test.ts › „Kopf 24 mm: Titel-Grundlinie 17,1“` |
| Fußleiste auf einer Grundlinie 285 | `src/render/sheetSpec.test.ts › „alle Texte auf EINER Grundlinie (285)“` |
| Legende genau eine Zeile | `src/render/sheetSpec.test.ts › „Legende: genau EINE Zeile“` |
| Kacheln tragen die Chart-Typografie | `src/render/sheetSpec.test.ts › „Kacheln tragen exakt die Chart-Typografie“` |
| nichts unter 8 pt außerhalb des Charts | `src/render/sheetSpec.test.ts › „kein font-size außerhalb des Chart-<g> unter 8 pt“` |
| Klemmung, Titelfaktoren, MIN_SCALE | `src/layout/typography.test.ts` |
| jede aktive Stelle auf genau einem Blatt | `src/layout/completeness.test.ts` |
| Geometrie (Überlappung, Chip, Linien) | `src/layout/geometryChecks.test.ts` |
| PDF: A3 quer, Text durchsuchbar | `src/ui/chart/pdfAcceptance.test.ts` |

---

## 9. Anhang A — Kopierfertige Quelldateien

> Die Abschnitte 1–8 **beschreiben** das System. Dieser Anhang **liefert es**.
> Wer diese drei Blöcke wörtlich übernimmt, hat alle Tokens, alle Animationen
> und alle Icons — ohne Rückgriff auf das Original-Repository.

### A.1 `tailwind.config.ts` — vollständig

```ts
import type { Config } from 'tailwindcss'

// Corporate-Tokens Niederwieser — Quelle: Spec Kap. 8.4 + Mockup.
// Orange ist nicht Teil der Palette (Spec 8.4); Amber dient nur App-UI-Status
// (Entwurfs-Badges) und darf nie im Chart/PDF erscheinen.
//
// Design-Review 18.08.2026 (docs/design-review-2026-08-18.md): Ergänzt um
// Status-Tokens (ok/warn/danger), eine feste Schriftskala (6 Stufen) und
// Bausteinmaße — nichts davon ersetzt die Corporate-Farben.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Feste Skala statt Sonderwerte: Overline · Caption · Sekundär · Body ·
    // Abschnitt · Zwischentitel · Seitentitel. Body ist 14 px.
    fontSize: {
      '2xs': ['11px', { lineHeight: '14px' }],
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['13px', { lineHeight: '18px' }],
      base: ['14px', { lineHeight: '20px' }],
      md: ['15px', { lineHeight: '20px' }],
      lg: ['17px', { lineHeight: '24px' }],
      xl: ['22px', { lineHeight: '28px' }],
      '2xl': ['26px', { lineHeight: '32px' }],
    },
    extend: {
      colors: {
        'nw-blue': '#243186',
        'nw-blue-90': '#3A46A0',
        'nw-blue-25': '#C9CDE3',
        'nw-blue-12': '#E6E8F2',
        'nw-blue-06': '#F2F3F8',
        'nw-green': '#6EBD84',
        'nw-green-15': '#E8F5EC',
        'nw-grey': '#D7CFC5',
        'nw-grey-40': '#F3F0EC',
        ink: '#1C1F2E',
        'ink-60': '#5F6377',
        'ink-40': '#8B8FA1',
        line: '#E4E0DA',
        'line-2': '#EEEBE6',
        panel: '#F4F2EE',
        // Statusfarben (nur App-UI): Grün = freigegeben/passt, Amber = Hinweis,
        // Rot = Fehler/destruktiv. Kontrast auf Weiß jeweils ≥ 4,5:1.
        ok: '#2F7A48',
        'ok-bg': '#E8F5EC',
        warn: '#9A6414',
        'warn-bg': '#FBF1DD',
        danger: '#9B2C22',
        'danger-bg': '#FBECEA',
        // Brandbook 2026 „Traffic light rating colours" — nur für FLÄCHEN
        // (Ampelpunkte, Statusflächen); Text behält die kontraststarken Töne.
        'traffic-red': '#E50046',
        'traffic-amber': '#F59D24',
        // Rückwärtskompatible Aliasse (werden schrittweise durch warn ersetzt)
        amber: '#9A6414',
        'amber-bg': '#FBF1DD',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        // 8 px = Bedienelemente (rounded-lg), 10 px = Flächen, 12 px = Dialoge (rounded-xl)
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,31,46,.05)',
        float: '0 1px 2px rgba(28,31,46,.05), 0 12px 32px -16px rgba(28,31,46,.18)',
        sheet: '0 1px 2px rgba(28,31,46,.08), 0 24px 48px -24px rgba(28,31,46,.28)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(.98) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translate(-50%, 8px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Signature-Moment: das A3-Blatt gleitet beim Öffnen in die Einpassung
        'sheet-enter': {
          from: { opacity: '0', transform: 'scale(.96) translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Abgänge spiegeln die Auftritte (Motion-Runde 31.08.): kürzer als
        // der jeweilige Auftritt, damit Schließen nie zäh wirkt.
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'menu-out': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(-4px)' },
        },
        'pop-out': {
          from: { opacity: '1', transform: 'scale(1) translateY(0)' },
          to: { opacity: '0', transform: 'scale(.98) translateY(4px)' },
        },
        // Toast-Auf-/Abgang: nur Y — die Zentrierung trägt der äußere
        // Live-Region-Wrapper (translate-x bliebe sonst doppelt).
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-out': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(8px)' },
        },
        // Wow-Runde 02.09.2026 — alle einmalig, alle unter reduced-motion aus:
        // Aufmerksamkeits-Puls (offene Ampelpunkte, genau ein Atemzug)
        attention: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.45)' },
        },
        // Lichtlauf um eine Karte (frisch veröffentlichte Fassung im Hub)
        'shine-sweep': {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        // Stempel setzt auf: groß und blass → satt und leicht überschwingend
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(1.7) rotate(-8deg)' },
          '60%': { opacity: '1', transform: 'scale(.94) rotate(-8deg)' },
          '80%': { transform: 'scale(1.04) rotate(-8deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-8deg)' },
        },
        // Wasserzeichen ENTWURF löst sich auf
        dissolve: {
          from: { opacity: '1', filter: 'blur(0)' },
          to: { opacity: '0', filter: 'blur(6px)' },
        },
        // Tinten-Puls unter dem Stempel
        'ink-pulse': {
          '0%': { opacity: '0', transform: 'scale(.6)' },
          '15%': { opacity: '.3' },
          '100%': { opacity: '0', transform: 'scale(1.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out both',
        'pop-in': 'pop-in .18s cubic-bezier(.2,.8,.2,1) both',
        'slide-up': 'slide-up .2s cubic-bezier(.2,.8,.2,1) both',
        'menu-in': 'menu-in .14s ease-out both',
        'sheet-enter': 'sheet-enter .65s cubic-bezier(.2,.8,.2,1) both',
        'fade-out': 'fade-out .12s ease-in both',
        'menu-out': 'menu-out .12s ease-in both',
        'pop-out': 'pop-out .12s ease-in both',
        'toast-in': 'toast-in .2s cubic-bezier(.2,.8,.2,1) both',
        'toast-out': 'toast-out .18s ease-in both',
        // Blattwechsel: bewusst schwächer als sheet-enter — nur Deckkraft
        'sheet-swap': 'fade-in .14s ease-out both',
        // Wow-Runde 02.09.2026
        attention: 'attention .5s cubic-bezier(.2,.8,.2,1) 1 both',
        'shine-sweep': 'shine-sweep 1.6s ease-in-out 1 both',
        'stamp-in': 'stamp-in .55s cubic-bezier(.2,.8,.2,1) both',
        dissolve: 'dissolve .5s ease-in both',
        'ink-pulse': 'ink-pulse .7s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
```

### A.2 `src/index.css` — vollständig

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-panel text-ink font-sans antialiased text-base;
    font-feature-settings: 'cv11', 'ss01';
  }
  :focus-visible {
    outline: 2px solid theme('colors.nw-blue');
    outline-offset: 2px;
    border-radius: 4px;
  }
  /* Ruhe für alle, die Bewegung reduziert haben wollen */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
}

@layer components {
  /* Übergangs-Alias: entspricht <Button variant="secondary" size="sm">.
     Wird beim Umzug der Screens auf die Komponente ersetzt. */
  .btn-row {
    @apply inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-line bg-white px-2.5 text-xs font-medium text-ink transition-colors hover:border-nw-blue-25 hover:bg-nw-blue-06;
  }
  /* Formularfelder in Dialogen — Bausteinmaße: Label 12/600, Feld 32 px hoch */
  .dlg-label {
    @apply mt-3 block text-xs font-semibold text-ink-60;
  }
  .dlg-input {
    @apply mt-1 h-8 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-40 focus:border-nw-blue focus:shadow-[0_0_0_3px_#F2F3F8] focus:outline-none;
  }
  textarea.dlg-input {
    @apply h-auto py-2;
  }
  .tnum {
    font-variant-numeric: tabular-nums;
  }
  /* Overline: Abschnittsbeschriftung 11/600, +7 % Laufweite */
  .eyebrow {
    @apply text-2xs font-semibold uppercase tracking-[.07em] text-ink-40;
  }
  /* Aufklapp-Quittung (Motion-Runde 31.08.): Chevrons an Menü-/Popover-
     Auslösern drehen bei offenem Panel — Rotation auf dem Icon, nie auf dem
     skalierenden Button. aria-expanded liefern Menu/Popover bereits. */
  .menu-chevron,
  .disclose-chevron {
    @apply transition-transform duration-150;
  }
  [aria-expanded='true'] > .menu-chevron,
  [aria-expanded='true'] .menu-chevron {
    transform: rotate(180deg);
  }
  [aria-expanded='true'] > .disclose-chevron,
  [aria-expanded='true'] .disclose-chevron {
    transform: rotate(90deg);
  }
}
```

### A.3 Icon-Set — vollständige SVG-Pfade

Die Glyphen stammen aus [Lucide](https://lucide.dev) (MIT-Lizenz) und sind
bewusst **inline** kopiert statt als Paket eingebunden. Jeder Eintrag wird in
das SVG-Gerüst aus §3.10 gesetzt (`viewBox="0 0 24 24"`, `fill="none"`,
`stroke="currentColor"`, `strokeWidth={1.9}`, runde Enden).

```tsx
const GLYPHS = {
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-up': <path d="m18 15-6-6-6 6" />,
  'chevrons-up-down': (
    <>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </>
  ),
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'arrow-left': (
    <>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  'arrow-left-right': (
    <>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </>
  ),
  publish: (
    <>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </>
  ),
  sliders: (
    <>
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  plus: (
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  building: (
    <>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </>
  ),
  'layout-grid': (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </>
  ),
  home: (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  pencil: (
    <>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </>
  ),
  network: (
    <>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  'user-plus': (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </>
  ),
  'user-minus': (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </>
  ),
  maximize: (
    <>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lock: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  compare: (
    <>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <path d="M11 18H8a2 2 0 0 1-2-2V9" />
    </>
  ),
  table: (
    <>
      <path d="M12 3v18" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </>
  ),
  'file-text': (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  // Sonderrollen 02.09.2026: Duplizieren im ⋯-Menü
  copy: (
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  languages: (
    <>
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  'log-out': (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </>
  ),
  'panel-right': (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M15 3v18" />
    </>
  ),
  image: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
} satisfies Record<string, ReactNode>
```

### A.4 Versions-Warnung: Tailwind 3 vs. 4

Dieses System ist für **Tailwind CSS 3.4** geschrieben. Tailwind 4 hat die
Konfiguration grundlegend geändert — wer versehentlich v4 installiert, bekommt
**keine Fehlermeldung, sondern eine Seite ohne Design**.

| | Tailwind 3.4 (dieses System) | Tailwind 4 |
|---|---|---|
| Konfiguration | `tailwind.config.ts` (JS-Objekt) | `@theme { … }` im CSS |
| Einbindung | `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| PostCSS-Plugin | `tailwindcss` | `@tailwindcss/postcss` |
| `theme.fontSize` ersetzen | wie hier dokumentiert | `--text-*`-Variablen |

**Beim Nachbau:** entweder `tailwindcss@^3.4.19` festnageln (empfohlen — dann
gilt dieses Dokument 1:1), oder A.1/A.2 vorher nach v4-Syntax übersetzen.

### A.5 Was dieses Dokument *nicht* leisten kann

Ehrliche Abgrenzung — damit niemand mit falschen Erwartungen startet:

| Abgedeckt (1:1 reproduzierbar) | Nicht abgedeckt |
|---|---|
| Alle Farben, Schriftstufen, Abstände, Radien, Schatten | Die **Organigramm-Zeichen-Engine** (`src/layout/**`, d3-hierarchy, Einpassen, Kompaktierung, PDF-Export) — das gezeichnete Ergebnis beschreibt §8 |
| Alle Animationen inkl. Keyframes und Dauern | **Datenmodell, Rollen, Berechtigungen, Import/Export** |
| Alle Hover-/Focus-/Active-/Disabled-Zustände | **Texte/Übersetzungen** (`src/i18n/**`, 4 Sprachen) |
| Alle Icons als SVG-Pfade | **Zustandsverwaltung** (Zustand-Stores, Persistenz) |
| Komplettes Markup jeder Komponente | Die **fertige TypeScript-Implementierung** — sie muss aus der Spezifikation neu geschrieben werden |
| **Shell-Anatomie, Logo-Position, Navigationsordnung** (§7.1–7.2) | Fachlogik: Versionierung, BRC-Prüfungen, Personalvorgänge |
| **Screen-Layoutmuster, Zustands-Choreografie, Tastaturgesetze** (§7.3–7.5) | |
| **Druckbild des A3-Aushangs**: Zonen, Schrift, Kästen, Linien, Legende, Fuß, Untergrenzen (§8) | |
| Interaktionsverhalten als Prosa-Spezifikation (Fokus-Trap, Portal-Positionierung, Timing) | |

**Kurz:** Das Dokument liefert die vollständige *Designsprache*, das
*Erscheinungsbild* **und die gesamte UX-Struktur** — eine neue App sieht damit
exakt aus wie n.Org, ist genauso aufgebaut und fühlt sich genauso an.
Was sie fachlich *tut*, steht hier nicht.
