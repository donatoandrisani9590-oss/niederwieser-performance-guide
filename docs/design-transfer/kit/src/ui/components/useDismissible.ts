import { useEffect, useState, type FocusEvent } from 'react'

// Tooltip abweisbar (Audit 23.09.2026, WP16-F09/WP13-F13, WCAG 1.4.13): Escape
// blendet ihn aus, solange Zeiger oder Fokus auf dem Auslöser liegen — auch
// wenn er nur überfahren ist und der Fokus woanders steht (daher am document).
// Erst wenn beide ihn verlassen haben, darf er wieder erscheinen. Die Hülle
// bekommt `handlers`; `dismissed` nimmt dem Tooltip seine Anzeige-Klassen.
export function useDismissible() {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    if ((!hover && !focus) || dismissed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hover, focus, dismissed])
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false)
      if (!focus) setDismissed(false)
    },
    onFocus: () => setFocus(true),
    onBlur: (e: FocusEvent<HTMLElement>) => {
      // Fokuswechsel innerhalb der Hülle zählt nicht als Verlassen
      if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
      setFocus(false)
      if (!hover) setDismissed(false)
    },
  }
  return { dismissed, handlers }
}
