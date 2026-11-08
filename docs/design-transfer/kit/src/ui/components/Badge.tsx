import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

// Statusanzeigen (Design-Review 18.08.): Chip = 24 px, rund, mit Icon —
// für Zustände (passt/Hinweise/Version); Tag = 18 px, Versalien — für
// Klassifizierungen (Entwurf/freigegeben/intern/Leitung). Farbe trägt Bedeutung:
// Grün = ok, Amber = Hinweis, Rot = Fehler, Blau = Auswahl/Version, Grau = neutral.

export type Tone = 'ok' | 'warn' | 'danger' | 'brand' | 'neutral'

const CHIP: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  brand: 'bg-nw-blue-06 text-nw-blue',
  neutral: 'bg-nw-grey-40 text-ink-60 border border-line',
}

export function Chip({
  tone = 'neutral',
  icon,
  children,
  onClick,
  pressed,
  title,
  className,
}: {
  tone?: Tone
  icon?: IconName
  children: ReactNode
  onClick?: () => void
  // Umschalt-Chip (Audit 23.09.2026, WP16-F10): der Zustand steckte nur im
  // Ton (brand = gewählt) — hörbar erst über aria-pressed. Nur mit onClick.
  pressed?: boolean
  title?: string
  className?: string
}) {
  // Bedeutungswechsel gleiten (Motion-Runde 31.08.): Rot/Gelb → Grün blendet
  // in 300 ms; Hover/Press bleiben mit 150 ms flink (getrennte Dauern je Kanal).
  const cls = `inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-2xs font-semibold tracking-[.01em] ${CHIP[tone]} ${
    onClick
      ? 'cursor-pointer [transition:color_.3s,background-color_.3s,border-color_.3s,opacity_.15s,transform_.15s] hover:scale-105 hover:opacity-85 active:scale-95'
      : 'transition-colors duration-300'
  } ${className ?? ''}`
  const inner = (
    <>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={pressed} title={title} className={cls}>
      {inner}
    </button>
  ) : (
    <span title={title} className={cls}>
      {inner}
    </span>
  )
}

const TAG: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  brand: 'bg-nw-blue-12 text-nw-blue',
  neutral: 'bg-nw-grey-40 text-ink-60',
}

export function Tag({
  tone = 'neutral',
  children,
  title,
  className,
}: {
  tone?: Tone
  children: ReactNode
  title?: string
  className?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex h-[18px] shrink-0 items-center whitespace-nowrap rounded px-1.5 text-2xs font-semibold uppercase leading-none tracking-[.04em] transition-colors duration-300 ${TAG[tone]} ${className ?? ''}`}
    >
      {children}
    </span>
  )
}

// Ampelpunkt (BRC-Ampel, Gesellschafts-Status) — Flächenfarben aus dem
// Brandbook 2026 (traffic light rating); Texte behalten die dunkleren Töne.
export function Dot({ tone, className }: { tone: Tone; className?: string }) {
  const color =
    tone === 'ok' ? 'bg-nw-green' : tone === 'warn' ? 'bg-traffic-amber' : tone === 'danger' ? 'bg-traffic-red' : tone === 'brand' ? 'bg-nw-blue' : 'bg-ink-40'
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full transition-colors duration-300 ${color} ${className ?? ''}`} />
}
