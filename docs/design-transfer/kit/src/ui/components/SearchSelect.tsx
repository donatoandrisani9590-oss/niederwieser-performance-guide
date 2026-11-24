import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'

// Durchsuchbare Auswahl (Review 11.08., N-05): Ersatz für native <select>-
// Listen mit dutzenden bis hunderten Einträgen (Umhängen-Ziel, Funktionslinie,
// abweichende Berichtslinie, Personalvorgänge). Tippen filtert Label + Hinweis,
// Pfeiltasten/Enter wählen, Escape schließt NUR die Liste (nicht den Dialog).
// Bewusst ohne Fremdpaket — die App hat keinen UI-Kit-Layer, und ein
// Combobox-Muster nach WAI-ARIA ist in ~120 Zeilen sauber machbar.

export interface SearchOption {
  value: string
  label: string
  hint?: string // z. B. „ID 3012 · Logistik & Lager" — wird mitgefiltert
}

const MAX_VISIBLE = 40

export function SearchSelect({
  id,
  value,
  options,
  onChange,
  emptyLabel,
  placeholder,
  noHitsLabel,
  moreLabel,
}: {
  id: string
  value: string
  options: SearchOption[]
  onChange: (value: string) => void
  emptyLabel?: string // wenn gesetzt: „nichts gewählt" ist eine gültige Option (value '')
  placeholder: string
  noHitsLabel: string
  moreLabel: (n: number) => string
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const selectedText = selected ? selected.label : value === '' && emptyLabel ? emptyLabel : ''

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = emptyLabel ? [{ value: '', label: emptyLabel } as SearchOption, ...options] : options
    if (!q) return base
    return base.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q) || o.value === '',
    )
  }, [query, options, emptyLabel])
  const visible = filtered.slice(0, MAX_VISIBLE)
  const hidden = filtered.length - visible.length

  // Klick außerhalb schließt die Liste
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setActive(0)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
    setActive(0)
  }

  function choose(v: string) {
    onChange(v)
    close()
    inputRef.current?.blur()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (open) {
        // Escape gehört der Liste, nicht dem umgebenden Modal
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        close()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        // Öffnen setzt auf die gewählte bzw. erste Option (Audit 23.09.2026,
        // WP16-F07): vorher rückte ↓ gleich weiter und traf die zweite —
        // „keine Leitung" (emptyLabel) war per ↓ nicht erreichbar.
        setOpen(true)
        setActive(Math.max(0, visible.findIndex((o) => o.value === value)))
        return
      }
      setActive((a) => Math.min(a + 1, visible.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && visible[active]) {
        e.preventDefault()
        choose(visible[active].value)
      }
    } else if (e.key === 'Tab') {
      close()
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && visible[active] ? `${listId}-${active}` : undefined}
        className="dlg-input pr-7"
        value={open ? query : selectedText}
        placeholder={open ? selectedText || placeholder : placeholder}
        autoComplete="off"
        // Bewusst NICHT bei Fokus öffnen: der Modal setzt den Fokus beim
        // Öffnen aufs erste Feld — die Liste soll erst auf Klick, Tippen
        // oder Pfeil-runter aufklappen. Bei Fokus wird der angezeigte Wert
        // markiert, damit Tippen ihn ersetzt statt anzuhängen.
        onFocus={(e) => e.target.select()}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          // Geschlossen zeigt das Feld den gewählten Wert; tippt jemand ohne
          // Markierung weiter, zählt nur der neu eingegebene Teil als Suche.
          const raw = e.target.value
          const next = !open && selectedText && raw.startsWith(selectedText) ? raw.slice(selectedText.length) : raw
          setQuery(next)
          setActive(0)
          if (!open) setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {/* Aufklapp-Pfeil: mittig im 32-px-Feld (das mt-1 unter dem Label sitzt), reagiert nicht auf Klicks */}
      <span aria-hidden className="pointer-events-none absolute right-2.5 top-1 flex h-8 items-center text-ink-40">
        <Icon name="chevron-down" size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </span>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full animate-menu-in overflow-auto rounded-lg border border-line bg-white py-1 shadow-float"
        >
          {visible.length === 0 && (
            <li className="px-3 py-2 text-xs text-ink-40">{noHitsLabel}</li>
          )}
          {visible.map((o, i) => (
            <li
              key={o.value || '__empty'}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()} // Fokus bleibt im Input
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
              className={`cursor-pointer px-3 py-1.5 text-sm transition-colors ${
                i === active ? 'bg-nw-blue-06 text-nw-blue' : o.value === '' ? 'text-ink-60' : 'text-ink'
              } ${o.value === value ? 'font-semibold' : ''}`}
            >
              <span>{o.label}</span>
              {o.hint && <span className="ml-2 text-xs text-ink-40">{o.hint}</span>}
            </li>
          ))}
          {hidden > 0 && (
            <li className="border-t border-line-2 px-3 py-1.5 text-xs text-ink-40 tnum">{moreLabel(hidden)}</li>
          )}
        </ul>
      )}
    </div>
  )
}
