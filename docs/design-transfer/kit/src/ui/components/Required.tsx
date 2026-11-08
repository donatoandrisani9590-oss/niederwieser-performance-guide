import { Hint } from './Field'
import { useT } from '../useT'

// Pflichtfelder sichtbar machen (Erstnutzer-Test 05.09.2026, Befunde 12/28):
// Sternchen am Feldnamen, Fußzeile „* Pflichtfeld" im Dialog und — solange der
// Knopf gesperrt ist — ein Klartext, WELCHE Felder noch fehlen. Vorher war der
// OK-Knopf einfach grau, und niemand wusste, warum.

export function RequiredMark() {
  const t = useT()
  return (
    <>
      <span aria-hidden className="ml-0.5 text-danger">
        *
      </span>
      <span className="sr-only"> ({t.common.required})</span>
    </>
  )
}

// ink-60 statt ink-40 (FX19, WP16-F11): die Fußzeile ist Lesetext, kein
// Meta — design-system.md lässt ink-40 (3,2:1) dafür nicht zu.
export function RequiredFooter() {
  const t = useT()
  return <p className="mt-3 text-2xs text-ink-60">{t.common.requiredFooter}</p>
}

// Liste der noch leeren Pflichtfelder — nur gerendert, wenn etwas fehlt.
export function MissingFields({ fields }: { fields: Array<[label: string, missing: boolean]> }) {
  const t = useT()
  const missing = fields.filter(([, m]) => m).map(([label]) => label)
  if (missing.length === 0) return null
  return <Hint tone="warn">{t.common.missingFields(missing.join(', '))}</Hint>
}
