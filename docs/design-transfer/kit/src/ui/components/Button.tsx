import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

// Ein Button-Baustein für die ganze App (Design-Review 18.08., Befund 8):
// vier Varianten × drei Größen, feste Höhen 28/32/36, Radius 7/8, ein
// Disabled-Zustand. Genau EINE primary-Aktion pro Ansicht.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-primary'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
  // Die App arbeitet (PDF, Veröffentlichen): Icon weicht einem Spinner,
  // Knopf ist gesperrt und aria-busy — bei reduced-motion bleibt der
  // Disabled-Zustand als Auskunft lesbar.
  loading?: boolean
}

// Nur Icon, quadratisch — aria-label ist dann Pflicht (title wird gespiegelt).
// Seit Audit 23.09.2026 (WP16-F16) prüft das der Typ statt eines Kommentars;
// ein wechselndes iconOnly={collapsed} bleibt erlaubt, braucht aber den Namen.
export type ButtonProps = ButtonBaseProps & ({ iconOnly: true; 'aria-label': string } | { iconOnly?: false })

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-nw-blue text-white hover:bg-nw-blue-90 border-transparent',
  secondary: 'bg-white text-ink border-line hover:border-nw-blue-25 hover:bg-nw-blue-06',
  ghost: 'bg-transparent text-ink-60 border-transparent hover:bg-nw-blue-06 hover:text-nw-blue',
  danger: 'bg-transparent text-danger border-transparent hover:bg-danger-bg',
  'danger-primary': 'bg-danger text-white border-transparent hover:bg-[#82241C]',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-[7px]',
  md: 'h-8 px-3 text-sm gap-2 rounded-lg',
  lg: 'h-9 px-3.5 text-base gap-2 rounded-lg',
}
const ICON_ONLY: Record<ButtonSize, string> = { sm: 'w-7 px-0', md: 'w-8 px-0', lg: 'w-9 px-0' }
const ICON_PX: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 16 }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, iconOnly, loading, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  // Versprechen aus dem iconOnly-Kommentar einloesen (Audit 31.08.): ohne
  // eigenen title wird das aria-label als Tooltip gespiegelt — Icon-only
  // erklaert sich damit ueberall per Hover.
  const title = rest.title ?? (iconOnly ? rest['aria-label'] : undefined)
  const spinner = (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )
  // loading sperrt NICHT über disabled (Review-Befund: disabled blurrt den
  // gerade gedrückten Knopf auf <body>): Fokus bleibt, Aktivierung wird im
  // Handler unterbunden, Zeiger per CSS — Screenreader hören aria-busy.
  const { onClick, ...attrs } = rest
  return (
    <button
      ref={ref}
      type={type}
      title={title}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      disabled={disabled}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      className={`inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap border font-medium leading-none transition-[color,background-color,border-color,opacity,transform] duration-150 hover:scale-[1.02] active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 disabled:active:scale-100 ${loading ? 'pointer-events-none opacity-70' : ''} ${VARIANT[variant]} ${SIZE[size]} ${iconOnly ? ICON_ONLY[size] : ''} ${className ?? ''}`}
      {...attrs}
    >
      {loading ? spinner : icon && <Icon name={icon} size={ICON_PX[size]} />}
      {!iconOnly && children}
      {iconRight && (
        <Icon
          name={iconRight}
          size={ICON_PX[size]}
          // Aufklapp-Quittung: chevron-down dreht bei aria-expanded auf 180°
          // (Menü/Popover), chevron-right auf 90° (Aufklapp-Panels).
          className={iconRight === 'chevron-down' ? 'menu-chevron' : iconRight === 'chevron-right' ? 'disclose-chevron' : undefined}
        />
      )}
    </button>
  )
})
