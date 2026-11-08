import type { ReactNode } from 'react'
import { Icon } from './Icon'

// Formular-Bausteine (Design-Review 18.08.): Label 12/600 ink-60, Hinweis
// 12 ink-40, Schalter statt nackter Checkbox für Ja/Nein-Kennzeichen.
// Eingabefelder selbst nutzen weiter die Klassen .dlg-input / .dlg-label
// (Bausteinmaße in index.css), damit bestehende Dialoge ohne Umbau passen.

export function Label({
  htmlFor,
  children,
  optional,
  className,
}: {
  htmlFor?: string
  children: ReactNode
  optional?: string
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={`dlg-label ${className ?? ''}`}>
      {children}
      {optional && <span className="ml-1 font-normal text-ink-40">{optional}</span>}
    </label>
  )
}

// Sperrgründe und Warnungen werden angesagt (FX19, WP12-F08): warn als
// höfliche Statusmeldung, danger als Alarm — vorher sah nur, wer hinschaute,
// warum OK gesperrt war. id erlaubt dem Feld aria-describedby auf den Hinweis.
export function Hint({
  children,
  tone = 'neutral',
  className,
  id,
}: {
  children: ReactNode
  tone?: 'neutral' | 'warn' | 'danger'
  className?: string
  id?: string
}) {
  const color = tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : 'text-ink-40'
  const role = tone === 'warn' ? 'status' : tone === 'danger' ? 'alert' : undefined
  // Warnungen erscheinen weich (Motion-Runde 31.08.) — sie sollen nicht
  // härter auftreten als ein Menü; neutrale Hinweise stehen meist dauerhaft.
  const enter = tone !== 'neutral' ? 'animate-fade-in' : ''
  return (
    <p id={id} role={role} className={`mt-1 text-xs leading-snug ${color} ${enter} ${className ?? ''}`}>
      {children}
    </p>
  )
}

// Ja/Nein-Schalter mit sichtbarem Zustand; semantisch eine Checkbox.
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
  title,
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: ReactNode
  hint?: string
  disabled?: boolean
  title?: string
  className?: string
}) {
  return (
    <label
      title={title}
      className={`flex cursor-pointer items-center justify-between gap-3 text-sm ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className ?? ''}`}
    >
      <span className="min-w-0">
        <span className="block">{label}</span>
        {hint && <span className="block text-xs text-ink-40">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className="block h-[18px] w-[30px] rounded-full bg-[#D2CCC3] transition-colors peer-checked:bg-nw-blue peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-nw-blue"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-3"
        />
      </span>
    </label>
  )
}

// Suchfeld mit Lupe — Listen filtern, Personen finden
export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  autoFocus,
  size = 'md',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel: string
  className?: string
  autoFocus?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 text-ink-40" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`w-full rounded-lg border border-line bg-white pl-8 pr-3 text-sm text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-40 focus:border-nw-blue focus:shadow-[0_0_0_3px_#F2F3F8] focus:outline-none ${
          size === 'sm' ? 'h-7 rounded-[7px] text-xs' : 'h-8'
        }`}
      />
    </span>
  )
}
