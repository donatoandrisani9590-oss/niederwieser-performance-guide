import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DialogPrimaryContext, useDialogPrimary, type DialogPrimary } from './dialogPrimary'
import { Button } from './Button'
import { Icon } from './Icon'
import { useT } from '../useT'
import { useFocusTrap } from './useFocusTrap'

const ENTER_IGNORED_INPUT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color'])

function isEnterField(el: Element): boolean {
  if (el.tagName === 'SELECT') return true
  if (el.tagName === 'INPUT') return !ENTER_IGNORED_INPUT_TYPES.has((el as HTMLInputElement).type)
  return false
}

// Dialog (Design-Review 18.08.): Radius 12, weiches Einblenden (Deckkraft +
// 98 → 100 %), Titel 15/600, Untertitel als Meta — destruktive Bestätigungen
// tragen die Aktion im Titel und den roten Knopf rechts (DialogButtons danger).
// Audit A1 02.09.2026 (P2.4): Portal an <body>, Fokus-Trap (Tab/Umschalt+Tab
// zyklisch), Hintergrund inert, Fokus-Rückgabe an den Auslöser beim Schließen.
// FX19: Trap, inert, Scroll-Sperre und Fokus-Rückgabe liegen in useFocusTrap
// auf einem gemeinsamen Stapel — gestapelte Dialoge schließen Ebene für Ebene.
// busy (Audit 23.09.2026, WP16-F16): Solange der Aufrufer arbeitet (Import
// übernehmen), schließen Escape, X und Schleier nicht — vorher verschwand der
// Dialog, die Übernahme lief weiter, und der Nutzer glaubte, abgebrochen zu haben.
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  size = 'md',
  busy = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  size?: 'md' | 'lg'
  busy?: boolean
}) {
  const t = useT()
  const panelRef = useRef<HTMLDivElement>(null)
  // Vor dem Anfangsfokus-Effekt unten: das Rückgabeziel wird beim Öffnen gemerkt
  const { onTabKey, isTopmost } = useFocusTrap(panelRef)

  // Angemeldeter Primärknopf (Audit A3 02.09.2026, P2.5) — siehe useDialogPrimary
  const primaryRef = useRef<DialogPrimary | null>(null)
  const registerPrimary = useCallback((primary: DialogPrimary | null) => {
    primaryRef.current = primary
  }, [])
  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const panel = panelRef.current
    // Ereignisse aus einem geschachtelten Dialog (eigenes Portal) steigen im
    // React-Baum bis hierher — DOM-Zugehörigkeit prüfen, sonst fängt der
    // äußere Dialog die Tastatur des inneren ab.
    if (!panel || !(e.target instanceof Node) || !panel.contains(e.target)) return
    // Tab/Umschalt+Tab zyklisch im Dialog (Audit A1 02.09.2026, P2.4)
    if (onTabKey(e)) return
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || e.nativeEvent.isComposing) return
    const el = e.target as Element
    if (!isEnterField(el)) return
    if (el.closest('[role="combobox"], [role="listbox"]')) return
    if (document.querySelector('[role="menu"]')) return
    const primary = primaryRef.current
    if (!primary || primary.disabled) return
    e.preventDefault()
    primary.run()
  }

  // Abgang spiegelt den Auftritt (Motion-Runde 31.08.): Escape, X und
  // Außenklick spielen erst den kurzen Abgang, dann erst onClose (Unmount).
  // Timeout statt animationend — reduced-motion schaltet Animationen ab,
  // geschlossen werden muss trotzdem. Die OK-/Abbrechen-Knöpfe der Aufrufer
  // schließen weiterhin direkt (dort übernimmt meist eine Quittung den Blick).
  // onClose lebt in einem Ref: Aufrufer übergeben Inline-Funktionen, und ein
  // Eltern-Re-Render während der 130 ms darf den laufenden Timer nicht
  // zurücksetzen (Review-Befund: Overlay bliebe sonst unsichtbar gemountet).
  const [closing, setClosing] = useState(false)
  const requestClose = useCallback(() => setClosing(true), [])
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    if (!closing) return
    const id = window.setTimeout(() => onCloseRef.current(), 130)
    return () => window.clearTimeout(id)
  }, [closing])

  // Escape schließt den Dialog (Audit F-25 — Tastaturbedienung), aber nur den
  // obersten (FX19, WP16-F01/WP13-F07): vorher schloss ein Escape in der
  // Bestätigung auch den Dialog darunter samt Eingaben. Liegt der Fokus in
  // einer fremden modalen Ebene (Befehlspalette), gehört Escape ihr.
  // Am document statt window und mit stopPropagation: window-Hörer der Seite
  // (Zeitreise-Leiste, Kontextmenü) sehen ein vom Dialog verbrauchtes Escape nicht.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isTopmost()) return
      const owner = e.target instanceof Element ? e.target.closest('[aria-modal="true"]') : null
      if (owner && owner !== panelRef.current) return
      // Auch während busy verbraucht: das Escape gehört dem Dialog, nicht der Seite
      e.stopPropagation()
      if (!busy) requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [requestClose, isTopmost, busy])

  // Scroll-Lock + Fokus (Review 11.08., N-07): Solange ein Dialog offen ist,
  // scrollt die Seite dahinter nicht mit (vorher blieb sie nach dem
  // Schließen verscrollt zurück), und der Fokus landet auf dem ersten
  // Bedienelement — Tastatur- und Screenreader-Nutzer starten IM Dialog.
  // Sperre, inert und Fokus-Rückgabe regelt useFocusTrap (FX19).
  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-dialog-close])',
    )
    if (first) first.focus()
    else panelRef.current?.focus()
  }, [])

  // Außenklick schließt nur, wenn der Zeiger auf dem Schleier gedrückt UND
  // losgelassen wurde (FX19, WP16-F15): Wer im Feld Text markiert und außerhalb
  // loslässt, erzeugt einen click am gemeinsamen Vorfahren — dem Schleier.
  const downOnBackdrop = useRef(false)

  return createPortal(
    // Portal an <body> (Audit A1 02.09.2026, P2.4): der Dialog liegt außerhalb
    // der inert gesetzten Shell-Bereiche — egal, welcher Screen ihn öffnet.
    // inert während des Abgangs: sperrt Tastatur UND Zeiger im ganzen Baum —
    // pointer-events allein ließe Enter auf fokussierten Knöpfen durch.
    <div
      inert={closing || undefined}
      className={`fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget && !busy) requestClose()
        downOnBackdrop.current = false
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
        className={`max-h-[90vh] w-full ${closing ? 'animate-pop-out' : 'animate-pop-in'} overflow-auto rounded-xl bg-white p-5 shadow-float outline-none ${
          size === 'lg' ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-md font-semibold text-nw-blue">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-ink-60">{subtitle}</p>}
          </div>
          <button
            type="button"
            data-dialog-close
            disabled={busy}
            onClick={requestClose}
            aria-label={t.ux.close}
            title={t.ux.close}
            className="-mr-1.5 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-40 transition-[color,background-color,transform] duration-150 hover:scale-[1.02] hover:bg-nw-blue-06 hover:text-ink active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="mt-2">
          <DialogPrimaryContext.Provider value={registerPrimary}>{children}</DialogPrimaryContext.Provider>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function DialogButtons({
  okLabel,
  okDisabled,
  onOk,
  onCancel,
  cancelLabel,
  danger,
  extra,
}: {
  okLabel: string
  okDisabled: boolean
  onOk: () => void
  onCancel: () => void
  cancelLabel?: string
  // Destruktive Bestätigung: roter Primärknopf
  danger?: boolean
  // Weitere Aktion links neben Abbrechen (z. B. „Vertretung entfernen")
  extra?: ReactNode
}) {
  const t = useT()
  // Enter in Eingabefeldern löst OK aus (Audit A3 02.09.2026, P2.5)
  useDialogPrimary(onOk, okDisabled)
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
      {extra && <div className="mr-auto">{extra}</div>}
      <Button variant="ghost" onClick={onCancel}>
        {cancelLabel ?? t.common.cancel}
      </Button>
      <Button variant={danger ? 'danger-primary' : 'primary'} onClick={onOk} disabled={okDisabled}>
        {okLabel}
      </Button>
    </div>
  )
}
