# Bausteine-Kit (React + Tailwind)

Kopie der UI-Bausteine aus n.Org (`src/ui/components/`, `src/ui/motion/`), Stand 08.11.2026.
Die Ordnerstruktur entspricht dem Original, damit die relativen Importe unverändert bleiben.
Das Kit kompiliert eigenständig: `npx tsc -p kit/tsconfig.json` (geprüft mit TypeScript 6, React 19).

```
kit/src/
├── ui/
│   ├── components/   21 Dateien (Button, Badge, Icon, Field, Layout, Modal, Menu, Tabs,
│   │                 Toast, Tooltip, SearchSelect, Toolbar, HomeButton, NumberTicker,
│   │                 Required, ErrorBoundary + Hooks/Helfer)
│   ├── motion/motion.ts
│   └── useT.ts       SHIM: Texte (Original: 4-sprachiger Katalog)
└── state/
    └── uiStore.ts    SHIM: Toast, go(), Zurück-Verlauf (Original: App-Store mit Hash-Router)
```

## Voraussetzungen in der Ziel-App

- `react` ≥ 18 (getestet 19), `react-dom`, `zustand` ≥ 4 (nur für den Shim-Store)
- Tailwind mit den n.Org-Tokens (`../tokens/`), sonst fehlen Klassen wie `bg-nw-blue`, `rounded-card`, `animate-pop-in`
- `content`/`@source` von Tailwind muss die Kit-Dateien einschließen, sonst werden die Klassen weggeworfen
- Inter (`inter-ui`)

## Einbauen

1. `kit/src/ui/components` und `kit/src/ui/motion` nach z. B. `src/ui/` der Ziel-App kopieren.
2. **`useT.ts`**: auf das eigene i18n umstellen oder als einfache DE-Texte behalten. Die Bausteine lesen nur
   `t.common.*`, `t.nav.back/backTitle`, `t.ux.*`.
3. **`uiStore.ts`**: `go(screen)` an den eigenen Router hängen; `Screen` auf die eigenen Seiten typisieren.
   Alternativ in `HomeButton.tsx` und `ErrorBoundary.tsx` direkt den Router benutzen.
4. `<Toast />` **einmal** in der App-Wurzel rendern (die Live-Region muss dauerhaft gemountet sein).
   Aufruf überall: `useUiStore.getState().showToast('Gespeichert', 'success')`, mit Aktion:
   `showToast('Zeile gelöscht', 'success', { label: 'Rückgängig', run: undo })`.
5. Next.js (App Router): `'use client'` an den Anfang jeder Baustein-Datei.

## Kurz-Beispiele

```tsx
import { Button } from './ui/components/Button'
import { Chip, Tag, Dot } from './ui/components/Badge'
import { PageHeader, Pane, PaneHeader, EmptyState, StatCard, Skeleton } from './ui/components/Layout'
import { Modal, DialogButtons } from './ui/components/Modal'
import { Menu } from './ui/components/Menu'
import { Tabs, Segmented } from './ui/components/Tabs'

<PageHeader eyebrow="Übersicht" title="Muster GmbH" actions={<Button variant="primary" icon="publish">Freigeben</Button>} />

<Pane>
  <PaneHeader title="Offene Punkte" />
  …
</Pane>

<Button>Abbrechen</Button>                                  {/* secondary ist Standard */}
<Button variant="ghost" iconOnly icon="more" aria-label="Weitere Aktionen" />
<Button variant="primary" loading={saving}>Speichern</Button>

<Chip tone="ok" icon="check-circle">Passt</Chip>             {/* Zustand */}
<Tag tone="warn">Entwurf</Tag>                                {/* Klassifizierung */}
<Dot tone="danger" />                                         {/* Ampel */}
```

Die genauen Props stehen in den Dateien (TSDoc-Kommentare auf Deutsch) und in `../design-system.md` §3.

## Regeln, die die Bausteine voraussetzen

- Genau **eine** `variant="primary"` je Ansicht.
- Icon-only immer mit `aria-label` (der Typ von `Button` erzwingt das).
- Alles Schwebende (Menü, Popover, Tooltip, Modal, Toast) hängt per Portal an `document.body`; z-Ebenen 30/40/50.
- Abgänge laufen über Timer (≈130 ms), nicht über `animationend`, damit Schließen auch unter reduced-motion funktioniert.
