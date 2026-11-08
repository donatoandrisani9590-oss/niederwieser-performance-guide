import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import type { Tone } from './Badge'

// Werkzeugleiste (Aufräum-Runde 03.09.2026, Feedback Donato: „verschiedene
// Platzierungen, verschiedene Größen, verschiedene Arten der Darstellung").
//
// Zwei Bausteine, zwei Ränge — mehr braucht eine Kopfzeile nicht:
//
//  • ToolTrack/ToolButton — Ansichts-Schalter auf einer 32-px-Spur. Dieselbe
//    Optik wie die Blattwahl und der Schriftregler, die es in der App schon
//    gibt: helle Blauspur, darin 26-px-Segmente, aktiv = weißes Segment mit
//    Schattenkante. Alles, was die Darstellung ändert, sitzt hier — dadurch
//    liest sich die Zeile als EIN System statt als Sammlung einzelner Knöpfe.
//  • StatusItem — Auskunft ohne Bedienelement-Optik: Symbol plus Text im Ton
//    der Bedeutung, ohne Pillen-Hintergrund. Vorher trugen Zustände (passt
//    auf A3) und Schalter (Zeitreise) dieselbe Chip-Form und waren dadurch
//    nicht unterscheidbar.
//
// Echte Aktionen (Teilen, PDF) bleiben bewusst gewöhnliche Button-Bausteine:
// Spur = Zustand, Knopf = Handlung.

export function ToolTrack({
  label,
  className,
  children,
}: {
  label?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex h-8 shrink-0 items-center gap-0.5 rounded-lg bg-nw-blue-12 p-[3px] ${className ?? ''}`}
    >
      {children}
    </div>
  )
}

export interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName
  // Rein optisch: gedrückter Schalter ODER geöffnetes Menü (aria-expanded
  // setzt denselben Zustand über die CSS-Variante). Das ARIA dazu setzt die
  // aufrufende Stelle — aria-pressed am Schalter, aria-expanded am Menü.
  active?: boolean
  chevron?: boolean
  count?: number
}

export const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(function ToolButton(
  { icon, active, chevron, count, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex h-[26px] shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium leading-none transition-[background-color,color,box-shadow,transform] duration-200 hover:scale-[1.04] active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 aria-expanded:bg-white aria-expanded:text-nw-blue aria-expanded:shadow-card ${
        active ? 'bg-white text-nw-blue shadow-card' : 'text-ink-60 hover:bg-white/70 hover:text-nw-blue'
      } ${className ?? ''}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} />}
      {children && <span className="truncate">{children}</span>}
      {count !== undefined && (
        <span
          className={`inline-flex h-4 min-w-4 animate-pop-in items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tnum transition-colors duration-200 ${
            active ? 'bg-nw-blue text-white' : 'bg-white/80 text-ink-60'
          }`}
        >
          {count}
        </span>
      )}
      {chevron && <Icon name="chevron-down" size={12} className="menu-chevron -mr-0.5 opacity-70" />}
    </button>
  )
})

// Haarlinie zwischen zwei Gruppen — trennt Zustand von Handlung, ohne dass
// die Zeile dafür einen Abstand vergeuden muss.
export function ToolDivider({ className }: { className?: string }) {
  return <span aria-hidden className={`h-5 w-px shrink-0 bg-line ${className ?? ''}`} />
}

const STATUS_TONE: Record<Tone, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  brand: 'text-nw-blue',
  neutral: 'text-ink-60',
}

// Auskunft in der Statuszeile. Ohne onClick ein reiner Text (span), mit
// onClick ein Aufklapp-Schalter mit gedrehtem Chevron — der Unterschied ist
// sichtbar, ohne dass beide wie Knöpfe aussehen.
export function StatusItem({
  tone = 'neutral',
  icon,
  title,
  onClick,
  expanded,
  className,
  children,
}: {
  tone?: Tone
  icon?: IconName
  title?: string
  onClick?: () => void
  expanded?: boolean
  // z. B. `min-w-0` für den einen Eintrag, der bei engem Fenster kürzen darf
  className?: string
  children: ReactNode
}) {
  const cls = `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium leading-none transition-colors duration-300 ${STATUS_TONE[tone]} ${className ?? ''}`
  const inner = (
    <>
      {icon && <Icon name={icon} size={14} className="shrink-0" />}
      {children}
    </>
  )
  if (!onClick)
    return (
      <span title={title} className={cls}>
        {inner}
      </span>
    )
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-expanded={expanded}
      className={`${cls} rounded-md underline-offset-4 transition-[color,transform] hover:scale-[1.03] hover:underline active:scale-[.98]`}
    >
      {inner}
      <Icon name="chevron-down" size={12} className="menu-chevron opacity-70" />
    </button>
  )
}
