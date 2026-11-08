import type { ReactNode } from 'react'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'

// Layout-Bausteine (Design-Review 18.08.): Seitenkopf mit genau einem Titel
// und seinen Aktionen (ersetzt Brotkrumen + „Zurück"-Leiste), Flächen mit
// Haarlinie, Leerzustand mit Icon statt grauer Dauerzeile.

export function PageHeader({
  eyebrow,
  title,
  meta,
  back,
  actions,
  children,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  // Meta-Zeile unter dem Titel: Zahlen, Codes, Sprache — keine Erklärsätze
  meta?: ReactNode
  back?: { label: string; onClick: () => void }
  actions?: ReactNode
  // z. B. Tabs unter dem Kopf
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={`mb-4 ${className ?? ''}`}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {back && (
            <Button variant="ghost" size="sm" icon="arrow-left" onClick={back.onClick} className="-ml-2 mb-1 text-nw-blue">
              {back.label}
            </Button>
          )}
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <h1 className="text-xl font-semibold tracking-[-.014em] text-nw-blue">{title}</h1>
          {meta && <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-60">{meta}</div>}
        </div>
        {/* Die rechte Ecke gehört den Aktionen des Bildschirms. Die App-Sprache
            saß hier kurzzeitig mit drin; sie wohnt seit dem 03.09.2026 in der
            Seitenleiste neben Start und Zurück — ein Ort für die ganze App. */}
        {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-0.5">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

// Trennpunkt in Meta-Zeilen
export function Sep() {
  return <span aria-hidden className="text-ink-40">·</span>
}

export function Pane({
  children,
  className,
  as: As = 'div',
  dataTour,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'aside'
  // Anker fuer die Seiten-Einweisung (Tour-Spotlight)
  dataTour?: string
}) {
  return (
    <As data-tour={dataTour} className={`rounded-card border border-line bg-white ${className ?? ''}`}>
      {children}
    </As>
  )
}

export function PaneHeader({
  title,
  hint,
  children,
  className,
}: {
  title: ReactNode
  hint?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-h-[46px] flex-wrap items-center gap-2.5 border-b border-line-2 px-4 py-2 ${className ?? ''}`}>
      <h2 className="text-base font-semibold text-nw-blue">{title}</h2>
      {hint && <span className="text-xs text-ink-40">{hint}</span>}
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function EmptyState({
  icon = 'info',
  title,
  hint,
  action,
  className,
}: {
  icon?: IconName
  title: ReactNode
  hint?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center px-4 py-7 text-center ${className ?? ''}`}>
      <span className="mb-2.5 grid h-9 w-9 place-items-center rounded-full border border-line bg-nw-grey-40 text-ink-40">
        <Icon name={icon} size={16} />
      </span>
      <p className="text-sm text-ink-60">{title}</p>
      {hint && <p className="mt-0.5 max-w-[52ch] text-xs text-ink-40">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

// Ruhige Statuskarte (Übersicht): Overline · große Zahl · Untertitel
export function StatCard({
  label,
  value,
  unit,
  sub,
  tone = 'neutral',
  action,
  className,
}: {
  label: string
  value: ReactNode
  unit?: ReactNode
  sub?: ReactNode
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
  action?: ReactNode
  className?: string
}) {
  const border = tone === 'warn' ? 'border-[#EBD9B4]' : tone === 'danger' ? 'border-[#EBC5C0]' : 'border-line'
  const labelColor = tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-ink-40'
  const valueColor = tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : tone === 'ok' ? 'text-ok' : 'text-ink'
  return (
    <div className={`rounded-card border bg-white px-4 py-3.5 transition-colors duration-300 ${border} ${className ?? ''}`}>
      <div className={`eyebrow transition-colors duration-300 ${labelColor}`}>{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-xl font-semibold tracking-[-.02em] tnum transition-colors duration-300 ${valueColor}`}>{value}</span>
        {unit && <span className="text-sm text-ink-60">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-40">{sub}</div>}
      {action && <div className="mt-1.5 -ml-2">{action}</div>}
    </div>
  )
}

// Lade-Skelett (Premium-Runde 31.08.): pulsierende Platzhalter statt
// Textzeile — die Seite „steht" schon, bevor die Projektdatei da ist.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-nw-grey-40/70 ${className ?? ''}`} />
}
