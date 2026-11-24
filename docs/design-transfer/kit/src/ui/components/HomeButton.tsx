import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { useUiStore } from '../../state/uiStore'
import { useT } from '../useT'

// Pillen-Knöpfe der Seitenleiste (Wunsch Donato 31.08., nach einer
// Uiverse-Idee von vinodjangid07, an die NW-Tokens angepasst): ruhender Kreis
// mit Symbol; beim Überfahren weitet er sich zur Pille, das Symbol gleitet
// nach oben hinaus und das Wort gleitet herein. In der eingeklappten
// Seitenleiste bleibt der Kreis stehen (Tooltip statt Expand).
// prefers-reduced-motion schaltet die Übergänge global ab (index.css).
//
// Exportiert (03.09.2026), weil die Sprachwahl in dieselbe Reihe gezogen ist:
// Sie ist kein Navigationsziel, sondern eine Einstellung — deshalb `variant
// "plain"` (weißer Kreis mit Flagge statt blauem Kreis mit Symbol) bei sonst
// gleicher Form, gleichem Ring und gleicher Aufweit-Bewegung. `glyph` ersetzt
// das Symbol, Fremd-Props gehen durch, damit der Knopf als Popover-Auslöser
// taugt (aria-haspopup/-expanded werden hineingeklont).

export interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName
  glyph?: ReactNode
  label: string
  title: string
  expand: boolean
  variant?: 'brand' | 'plain'
  labelWidth?: string
}

export function PillButton({
  icon,
  glyph,
  label,
  title,
  expand,
  variant = 'brand',
  labelWidth = '5.5rem',
  className,
  ...rest
}: PillButtonProps) {
  const brand = variant === 'brand'
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      style={expand ? ({ '--pill-w': labelWidth } as React.CSSProperties) : undefined}
      className={`group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_3px_theme(colors.nw-blue-12)] transition-[width,background-color,border-color] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nw-blue active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 ${
        brand ? 'bg-nw-blue hover:bg-nw-blue-90' : 'border border-line bg-white hover:border-nw-blue-25'
      } ${expand ? 'hover:w-[var(--pill-w)]' : ''} ${className ?? ''}`}
      {...rest}
    >
      <span className={`transition-transform duration-300 ${expand ? 'group-hover:-translate-y-9' : ''}`}>
        {glyph ?? (icon && <Icon name={icon} size={17} className={brand ? 'text-white' : 'text-nw-blue'} />)}
      </span>
      {expand && (
        <span
          aria-hidden
          className={`absolute inset-0 grid translate-y-6 place-items-center whitespace-nowrap px-2 text-sm font-semibold opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-y-0 group-hover:opacity-100 ${
            brand ? 'text-white' : 'text-nw-blue'
          }`}
        >
          {label}
        </span>
      )}
    </button>
  )
}

export function HomeButton({ expand = true }: { expand?: boolean }) {
  const t = useT()
  const go = useUiStore((s) => s.go)
  // Auf der Gesellschaftswahl selbst ohne Wirkung → gesperrt (Audit A1 02.09.2026, P3.20)
  const onHome = useUiStore((s) => s.screen === 'home')
  return <PillButton icon="home" label={t.ux.home} title={t.ux.homeTitle} disabled={onHome} onClick={() => go('home')} expand={expand} />
}

// Ein Schritt zurück — über den eigenen Verlauf (endet nie außerhalb der App).
export function BackButton({ expand = true }: { expand?: boolean }) {
  const t = useT()
  const canGoBack = useUiStore((s) => s.backStack.length > 0)
  const popBack = useUiStore((s) => s.popBack)
  return (
    <PillButton
      icon="arrow-left"
      label={t.nav.back}
      title={t.nav.backTitle}
      disabled={!canGoBack}
      onClick={() => {
        const prev = popBack()
        if (prev) window.location.hash = prev
      }}
      expand={expand}
    />
  )
}
