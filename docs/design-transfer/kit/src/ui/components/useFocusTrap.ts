import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'

// Fokus-Trap (Audit A1 02.09.2026, P2.4): alles, was im Dialog per Tab
// erreichbar ist — deaktivierte und per inert/hidden versteckte Elemente nicht.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function focusableIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest('[inert], [hidden]') && el.getAttribute('aria-hidden') !== 'true',
  )
}

// Tab/Umschalt+Tab zyklisch im Panel. Gibt true zurück, wenn die Taste Tab
// war (dann ist sie behandelt) — Aufrufer werten danach ihre übrigen Tasten aus.
// Auch vom nicht-modalen Popover genutzt (FX19, WP16-F02).
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault: () => void }, panel: HTMLElement): boolean {
  if (e.key !== 'Tab') return false
  const els = focusableIn(panel)
  if (els.length === 0) {
    e.preventDefault()
    panel.focus()
    return true
  }
  const first = els[0]
  const last = els[els.length - 1]
  const current = document.activeElement
  if (e.shiftKey && (current === first || current === panel || !panel.contains(current))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (current === last || !panel.contains(current))) {
    e.preventDefault()
    first.focus()
  }
  return true
}

// Modulweiter Stapel der offenen modalen Ebenen (FX19, WP16-F01/WP13-F07).
// Vorher zählte ein Zähler die Dialoge, und jeder merkte sich Scroll-Sperre
// und Fokus selbst: Schlossen zwei gestapelte Dialoge zusammen, stellte der
// obere das „hidden" des unteren wieder her (Seite scrollte bis zum Neuladen
// nicht), und der Fokus fiel auf <body>. Jetzt gilt:
// - inert am Hintergrund und die Scroll-Sperre hängen am Stapel: gesetzt beim
//   ersten Eintrag, gelöst erst mit dem letzten (Ausgangswert einmal gemerkt);
// - Fokus-Rückgabe nur beim Verlassen der obersten Ebene, NACH dem Lösen von
//   inert (inerte Elemente nehmen keinen Fokus an); fällt eine tiefere Ebene
//   weg, erbt die darüberliegende deren Rückgabeziel — ihr eigenes lag in der
//   verschwundenen Ebene;
// - nur die oberste Ebene reagiert auf Escape (isTopmost).
interface Layer {
  token: symbol
  prevFocus: HTMLElement | null
  lockScroll: boolean
}

const layers: Layer[] = []
// Ausgangswert von body.style.overflow, solange die Sperre greift; sonst null
let savedOverflow: string | null = null

// Hintergrund sperren, solange mindestens eine Ebene offen ist: Seitenleiste
// und Inhalt tragen data-modal-inert (AppShell); die Dialoge selbst hängen per
// Portal an <body> bzw. außerhalb dieser Bereiche und bleiben bedienbar.
function syncBackground(): void {
  const on = layers.length > 0
  document.querySelectorAll<HTMLElement>('[data-modal-inert]').forEach((el) => {
    if (on) el.setAttribute('inert', '')
    else el.removeAttribute('inert')
  })
  const lock = layers.some((l) => l.lockScroll)
  if (lock && savedOverflow === null) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else if (!lock && savedOverflow !== null) {
    document.body.style.overflow = savedOverflow
    savedOverflow = null
  }
}

// Modale Ebene für panelRef: Stapeleintrag, inert am Hintergrund, optional
// Scroll-Sperre (die Tour misst beim Scrollen neu und sperrt deshalb nicht),
// Fokus-Rückgabe beim Schließen. Den Anfangsfokus setzt der Aufrufer selbst
// (Modal: erstes Bedienelement, Tour: die Karte) — im Effekt NACH diesem
// Hook, damit das Rückgabeziel vorher gemerkt ist. Vorgesehen auch für
// Konfliktdialog und Befehlspalette (FX59).
export function useFocusTrap(
  panelRef: RefObject<HTMLElement | null>,
  { lockScroll = true }: { lockScroll?: boolean } = {},
): { onTabKey: (e: KeyboardEvent) => boolean; isTopmost: () => boolean } {
  const tokenRef = useRef<symbol | null>(null)
  // lockScroll gilt ab dem Öffnen; ein späterer Wechsel wirkt nicht (kein Aufrufer braucht das)
  const lockRef = useRef(lockScroll)

  useEffect(() => {
    const layer: Layer = {
      token: Symbol('modal-layer'),
      prevFocus: document.activeElement as HTMLElement | null,
      lockScroll: lockRef.current,
    }
    tokenRef.current = layer.token
    layers.push(layer)
    syncBackground()
    return () => {
      const i = layers.indexOf(layer)
      if (i < 0) return
      const wasTop = i === layers.length - 1
      layers.splice(i, 1)
      if (!wasTop) layers[i].prevFocus = layer.prevFocus
      syncBackground()
      if (wasTop) layer.prevFocus?.focus?.({ preventScroll: true })
    }
  }, [])

  const onTabKey = useCallback(
    (e: KeyboardEvent) => {
      const panel = panelRef.current
      return panel ? trapTab(e, panel) : false
    },
    [panelRef],
  )
  const isTopmost = useCallback(() => {
    const top = layers[layers.length - 1]
    return top !== undefined && top.token === tokenRef.current
  }, [])
  return { onTabKey, isTopmost }
}
