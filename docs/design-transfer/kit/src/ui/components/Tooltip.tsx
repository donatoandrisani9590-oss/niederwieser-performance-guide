import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { useDismissible } from './useDismissible'

// Fokussierbar ist ein Kind, das selbst einen Tab-Halt mitbringt: natives
// Bedienelement, eigener tabIndex, oder eine Komponente mit onClick/href
// (Button, Chip mit Aktion rendern einen <button>). Tag und Text sind es nicht.
const NATIVE_FOCUSABLE = new Set(['a', 'button', 'input', 'select', 'textarea'])
function isFocusable(node: ReactNode): node is ReactElement<Record<string, unknown>> {
  if (!isValidElement<Record<string, unknown>>(node)) return false
  const p = node.props
  return (typeof node.type === 'string' && NATIVE_FOCUSABLE.has(node.type)) || p.tabIndex !== undefined || p.onClick !== undefined || p.href !== undefined
}

// Einheitlicher Hover-Tooltip (Premium-Runde 31.08., Wunsch Donato: „jedes
// verdichtete Element erklärt sich beim Überfahren"). Rein CSS über
// group-hover/focus-within — kein Portal, funktioniert daher nur in
// Containern OHNE overflow-hidden (Pane/StatCard erfüllen das). Für Fälle
// mit eigener Positionierung (Chart-Hover-Karte, Blattvorschau) gibt es
// weiterhin maßgeschneiderte Lösungen.
// Tastatur (Audit 23.09.2026, WP16-F09): Vorher umschlossen alle TagTips ein
// nicht fokussierbares Tag — focus-within feuerte nie, die Erklärung blieb
// Tastatur und Screenreader verborgen. Ein solches Kind bekommt jetzt einen
// eigenen Tab-Halt mit dem Tooltip als Beschreibung (aria-describedby löst
// auch das per display:none verborgene Element auf). Ein fokussierbares Kind
// erhält nur die Beschreibung; bringt es schon eine eigene mit (Versions-
// Tooltip der Übersicht), bleibt sie. Der Tooltip nimmt den Zeiger an, eine
// unsichtbare Brücke über den Abstand hält ihn beim Hinüberfahren offen.
export function Tip({
  content,
  children,
  side = 'bottom',
  width = 'w-[260px]',
  className,
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  width?: string
  className?: string
}) {
  const id = useId()
  const { dismissed, handlers } = useDismissible()
  const pos = side === 'top' ? 'bottom-full mb-1.5 before:top-full' : 'top-full mt-1.5 before:bottom-full'
  const trigger = !isFocusable(children) ? (
    <span
      // Tooltip-Auslöser nach APG: der Tab-Halt ist hier der Zweck
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-describedby={id}
      className="inline-flex rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nw-blue"
    >
      {children}
    </span>
  ) : children.props['aria-describedby'] === undefined ? (
    cloneElement(children, { 'aria-describedby': id })
  ) : (
    children
  )
  return (
    <span className={`group/tip relative inline-flex ${className ?? ''}`} {...handlers}>
      {trigger}
      <span
        id={id}
        role="tooltip"
        className={`absolute left-1/2 ${pos} z-30 hidden ${width} -translate-x-1/2 animate-fade-in rounded-lg border border-line bg-white p-2.5 text-left shadow-float before:absolute before:inset-x-0 before:h-1.5 before:content-[''] ${
          dismissed ? '' : 'group-focus-within/tip:block group-hover/tip:block'
        }`}
      >
        {content}
      </span>
    </span>
  )
}

// Erklaer-Tooltip um ein Abzeichen (Audit 31.08.: aus StartScreen in den
// Baustein gehoben, damit Uebersicht, Veroeffentlichen & Co. dasselbe
// Muster nutzen): Hover sagt, was „aktuell"/„intern"/„privat" … bedeuten.
export function TagTip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <Tip width="w-[240px]" content={<span className="block text-2xs leading-relaxed text-ink-60">{text}</span>}>
      {children}
    </Tip>
  )
}
