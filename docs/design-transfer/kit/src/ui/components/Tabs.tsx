import { panelId, tabId } from './tabPanel'

// Reiter und Segmente (Design-Review 18.08., Befund 8): bisher fünf
// verschiedene Implementierungen. Tabs = unterstrichen, für Ansichtswechsel
// innerhalb eines Screens; Segmented = Pillen im grauen Rahmen, für kleine
// exklusive Auswahlen (Blatt 1…8, Rolle, A−/A+).

export function Tabs<K extends string>({
  id,
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  id?: string
  tabs: Array<{ key: K; label: string; count?: number }>
  value: K
  onChange: (key: K) => void
  ariaLabel: string
  className?: string
}) {
  // Vollständiges Tablist-Muster (Review-Befund: role=tab ohne Roving-
  // Tabindex/Pfeiltasten ist für Screenreader-Nutzer ein leeres Versprechen):
  // genau der aktive Tab liegt in der Tab-Reihenfolge, Pfeile wechseln direkt,
  // Home/End springen an den Anfang und das Ende (WP16-F19).
  const go = (e: React.KeyboardEvent, to: number) => {
    e.preventDefault()
    onChange(tabs[to].key)
    ;(e.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[to] as HTMLElement)?.focus()
  }
  const move = (e: React.KeyboardEvent, dir: 1 | -1) => {
    const i = tabs.findIndex((tb) => tb.key === value)
    go(e, (i + dir + tabs.length) % tabs.length)
  }
  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex gap-0.5 border-b border-line ${className ?? ''}`}>
      {tabs.map((tab) => {
        const active = tab.key === value
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={id ? tabId(id, tab.key) : undefined}
            aria-controls={id ? panelId(id, tab.key) : undefined}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') move(e, 1)
              if (e.key === 'ArrowLeft') move(e, -1)
              if (e.key === 'Home') go(e, 0)
              if (e.key === 'End') go(e, tabs.length - 1)
            }}
            onClick={() => onChange(tab.key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-2 text-base font-medium transition-[color,border-color,transform] hover:scale-[1.03] active:scale-[.98] ${
              active ? 'border-nw-blue text-nw-blue' : 'border-transparent text-ink-60 hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-px text-2xs font-semibold tnum transition-colors ${
                  active ? 'bg-nw-blue-12 text-nw-blue' : 'bg-nw-grey-40 text-ink-60'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: {
  options: Array<{ value: V; label: string; title?: string; disabled?: boolean }>
  value: V
  onChange: (v: V) => void
  ariaLabel: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 gap-0.5 rounded-lg bg-nw-blue-12 p-[3px] ${size === 'sm' ? 'h-7' : 'h-8'} ${className ?? ''}`}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            title={o.title}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-full min-w-[26px] items-center justify-center rounded-md px-2 font-medium tnum transition-[color,background-color,transform,box-shadow] hover:scale-[1.05] active:scale-[.97] disabled:opacity-40 disabled:hover:scale-100 ${
              size === 'sm' ? 'text-2xs' : 'text-xs'
            } ${active ? 'bg-white text-nw-blue shadow-card' : 'text-ink-60 hover:text-ink'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
