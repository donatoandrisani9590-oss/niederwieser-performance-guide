import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './Icon'
import { focusableIn, trapTab } from './useFocusTrap'

// Aufklappmenü und Popover (Design-Review 18.08., Befund 1/2/3): Aktionen
// zweiter und dritter Ordnung wandern aus Buttonwänden in ein ⋯-Menü.
// Das Panel wird per Portal an <body> gehängt und am Auslöser ausgerichtet —
// so schneidet keine scrollende Tabelle und kein overflow-Container es ab.
// Tastatur: Escape schließt (Fokus zurück zum Auslöser), Pfeile wandern
// zyklisch, Home/End springen, Enter/Leertaste löst aus, Tab schließt;
// Klick außerhalb schließt; Scrollen/Größenänderung schließt ebenfalls.
// Popover (FX19, WP16-F02): Fokus ins Panel, Tab bleibt darin — siehe dort.

export interface MenuItem {
  label: string
  onSelect: () => void
  icon?: IconName
  disabled?: boolean
  // Sperrgrund als Tooltip am deaktivierten Eintrag (statt Text unter der Zeile);
  // Tastatur und Screenreader hören ihn als Beschreibung (WP16-F19)
  title?: string
  danger?: boolean
  hint?: string
  separatorBefore?: boolean
}

interface DisclosureProps {
  // Auslöser: erhält onClick, aria-haspopup, aria-expanded und aria-controls
  trigger: ReactElement<Record<string, unknown>>
  align?: 'left' | 'right'
  className?: string
  // Klassen für die Wurzel um den Auslöser — Standard inline-flex (shrink-to-
  // fit); ein Auslöser mit w-full braucht hier `flex w-full`, sonst richtet
  // sich seine Breite nach dem Inhalt und läuft über (Nutzerkarte 02.09.2026).
  rootClassName?: string
}

function useDisclosure(align: 'left' | 'right') {
  // Drei Phasen statt Bool (Motion-Runde 31.08.): beim Schließen bleibt das
  // Panel für den kurzen Spiegel-Abgang (menu-out) stehen und verschwindet
  // per Timeout — bewusst KEIN animationend, damit reduced-motion (Animation
  // aus) das Panel trotzdem zuverlässig entfernt.
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
  const open = phase === 'open'
  const rendered = phase !== 'closed'
  const rootRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // Bis zur Vermessung unsichtbar und fixiert — so löst der Fokus auf den
  // ersten Eintrag kein Scrollen aus (das würde das Menü sofort schließen).
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' })

  // Fokus-Rückgabe gehört in JEDEN Schließweg (Review-Befund: nach Auswahl
  // oder Außenklick unmountete das Panel mit dem noch fokussierten Eintrag —
  // der Browser wirft den Fokus dann auf <body>).
  const close = useCallback(() => {
    if (panelRef.current?.contains(document.activeElement)) {
      rootRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
    }
    setPhase((p) => (p === 'open' ? 'closing' : p))
  }, [])
  const toggle = useCallback(() => setPhase((p) => (p === 'open' ? 'closing' : 'open')), [])
  useEffect(() => {
    if (phase !== 'closing') return
    const id = window.setTimeout(() => setPhase('closed'), 130)
    return () => window.clearTimeout(id)
  }, [phase])

  // Position am Auslöser: unterhalb, rechts- oder linksbündig; fehlt unten
  // der Platz, oberhalb. Während des Abgangs bleibt die letzte Position stehen.
  useLayoutEffect(() => {
    if (phase === 'closed') {
      setStyle({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' })
      return
    }
    if (phase !== 'open') return
    const trigger = rootRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const r = trigger.getBoundingClientRect()
    const h = panel.offsetHeight
    const below = r.bottom + 4 + h <= window.innerHeight - 8
    const next: CSSProperties = { position: 'fixed', top: below ? r.bottom + 4 : Math.max(8, r.top - h - 4) }
    if (align === 'right') next.right = Math.max(8, document.documentElement.clientWidth - r.right)
    else next.left = Math.max(8, r.left)
    setStyle(next)
  }, [phase, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Liegt ein Modal über dem Popover (?-Overlay, ⌘K, Dialog): Escape
        // gehört der obersten Ebene — veraltetes Popover still mitschließen,
        // Ereignis NICHT kappen und keinen Fokus hinter das Modal ziehen.
        if (document.querySelector('[aria-modal="true"]')) {
          setPhase((p) => (p === 'open' ? 'closing' : p))
          return
        }
        e.stopPropagation()
        close()
        rootRef.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
      }
    }
    const onScroll = (e: Event) => {
      // Scrollen im Panel selbst ist erlaubt; alles andere schließt
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      close()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, close])

  // Abgangsklasse; inert am Panel sperrt während des Schließens Tastatur,
  // Fokus UND Zeiger (pointer-events allein ließe Enter-Wiederholung durch).
  const phaseClass = phase === 'closing' ? 'animate-menu-out' : 'animate-menu-in'
  const closing = phase === 'closing'
  // Offen UND vermessen — erst dann darf der Fokus ins Panel (Audit A1 02.09.2026)
  const positioned = open && style.visibility !== 'hidden'
  return { open, positioned, rendered, closing, close, toggle, rootRef, panelRef, style, phaseClass }
}

function withTrigger(
  trigger: ReactElement<Record<string, unknown>>,
  props: { onClick: () => void; 'aria-haspopup': 'menu' | 'dialog'; 'aria-expanded': boolean; 'aria-controls': string },
) {
  if (!isValidElement(trigger)) return trigger
  const prevOnClick = trigger.props.onClick as (() => void) | undefined
  return cloneElement(trigger, {
    ...props,
    onClick: () => {
      prevOnClick?.()
      props.onClick()
    },
  })
}

export function Menu({ trigger, items, align = 'right', className }: DisclosureProps & { items: MenuItem[] }) {
  const { open, positioned, rendered, closing, close, toggle, rootRef, panelRef, style, phaseClass } = useDisclosure(align)
  const id = useId()

  // Fokus auf den ersten aktiven Eintrag — erst NACH der Vermessung (Audit A1
  // 02.09.2026, P1.1): vorher lief focus() noch gegen das unsichtbare Panel
  // (visibility:hidden nimmt keinen Fokus an), die Tastatur blieb am Auslöser.
  useEffect(() => {
    if (!positioned) return
    const first = panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
    first?.focus({ preventScroll: true })
  }, [positioned, panelRef])

  // Tastatur im Menü (Audit A1 02.09.2026, P1.1): ↑/↓ zyklisch, Home/End,
  // Enter/Leertaste lösen den Eintrag aus (nativer Button-Klick), Tab schließt
  // und lässt den Fokus regulär weiterwandern; Escape regelt useDisclosure.
  // Gesperrte Einträge (Audit 23.09.2026, WP16-F19) sind aria-disabled statt
  // disabled: Sie bleiben per Pfeil erreichbar und nennen ihren Sperrgrund über
  // aria-describedby — vorher stand er nur im title, und der Eintrag war für
  // die Tastatur unsichtbar. Auslösen sperrt der Klick-Handler.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
        close()
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
      e.preventDefault()
      const els = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      if (els.length === 0) return
      const i = els.indexOf(document.activeElement as HTMLElement)
      const next =
        e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length
      els[next]?.focus({ preventScroll: true })
    },
    [panelRef, close],
  )

  return (
    <span ref={rootRef} className="inline-flex">
      {withTrigger(trigger, {
        onClick: toggle,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': id,
      })}
      {rendered &&
        createPortal(
          <div
            id={id}
            ref={panelRef}
            role="menu"
            inert={closing || undefined}
            style={style}
            onKeyDown={onKeyDown}
            className={`z-30 min-w-[200px] ${phaseClass} rounded-card border border-line bg-white p-1 shadow-float ${className ?? ''}`}
          >
            {items.map((it, i) => (
              <div key={i}>
                {it.separatorBefore && i > 0 && <div className="my-1 border-t border-line-2" />}
                <button
                  type="button"
                  role="menuitem"
                  aria-disabled={it.disabled || undefined}
                  aria-describedby={it.disabled && it.title ? `${id}-reason-${i}` : undefined}
                  title={it.title}
                  onClick={() => {
                    // Guard gegen Doppel-Enter im Schließfenster (inert deckt
                    // den Normalfall, der Guard den Rest)
                    if (!open || it.disabled) return
                    close()
                    it.onSelect()
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition-[background-color,transform] hover:scale-[1.02] active:scale-[.98] focus-visible:bg-nw-blue-12 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nw-blue aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:scale-100 aria-disabled:active:scale-100 ${
                    it.danger ? 'text-danger hover:bg-danger-bg' : 'text-ink hover:bg-nw-blue-06'
                  }`}
                >
                  {it.icon && <Icon name={it.icon} size={15} className={it.danger ? '' : 'text-ink-60'} />}
                  <span className="flex-1">{it.label}</span>
                  {it.hint && <span className="text-2xs text-ink-40">{it.hint}</span>}
                </button>
                {it.disabled && it.title && (
                  <span id={`${id}-reason-${i}`} hidden>
                    {it.title}
                  </span>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </span>
  )
}

// Freies Popover — z. B. „Ansicht" im Chart mit Schriftgröße/Blattmodus/Sprache.
// Tastatur (FX19, WP16-F02): Vorher blieb der Fokus am Auslöser, und Tab lief
// durch die Seite statt ins Panel (das per Portal am Ende von <body> hängt);
// Blattmodus, Schriftgröße, Arbeitsstand und Abmelden waren ohne Maus nicht
// bedienbar. Jetzt wandert der Fokus nach der Vermessung auf das erste
// Bedienelement (ohne eines auf das Panel), Tab/Umschalt+Tab bleiben im Panel,
// Escape und Außenklick schließen wie beim Menü. Scrollen außerhalb schließt
// weiterhin — ausgelöst wird es jetzt nur noch, wenn man das Panel verlässt,
// denn Tab führt nicht mehr hinaus und der Fokus scrollt nicht (preventScroll).
export function Popover({
  trigger,
  align = 'right',
  className,
  rootClassName,
  title,
  children,
}: DisclosureProps & { title?: string; children: ReactNode }) {
  const { open, positioned, rendered, closing, close, toggle, rootRef, panelRef, style, phaseClass } = useDisclosure(align)
  const id = useId()

  useEffect(() => {
    if (!positioned) return
    const panel = panelRef.current
    if (!panel) return
    const target = focusableIn(panel)[0] ?? panel
    target.focus({ preventScroll: true })
  }, [positioned, panelRef])

  return (
    <span ref={rootRef} className={rootClassName ?? 'inline-flex'}>
      {withTrigger(trigger, {
        onClick: toggle,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        'aria-controls': id,
      })}
      {rendered &&
        createPortal(
          <div
            id={id}
            ref={panelRef}
            role="dialog"
            aria-label={title}
            tabIndex={-1}
            inert={closing || undefined}
            style={style}
            onKeyDown={(e) => {
              if (panelRef.current) trapTab(e, panelRef.current)
            }}
            // Ein Klick auf ein Element mit data-popover-close (z. B. „Dialog
            // öffnen …") schließt das Popover — sonst läge es über dem Dialog.
            onClick={(e) => {
              if ((e.target as Element).closest?.('[data-popover-close]')) close()
            }}
            className={`z-30 min-w-[240px] ${phaseClass} rounded-card border border-line bg-white p-3.5 shadow-float outline-none ${className ?? ''}`}
          >
            {title && <div className="eyebrow mb-2">{title}</div>}
            {children}
          </div>,
          document.body,
        )}
    </span>
  )
}
