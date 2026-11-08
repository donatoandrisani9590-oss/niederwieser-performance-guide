import { useEffect, useState } from 'react'
import { useUiStore } from '../../state/uiStore'
import { Icon } from './Icon'

// Abgangsdauer der Quittung — muss zur toast-out-Animation (180 ms) passen,
// damit CSS- und JS-Uhr nicht auseinanderlaufen.
const OUT_MS = 200

// Quittung unten in der Mitte (Design-Review 18.08., Befund 6): Erfolg mit
// grünem Häkchen, Fehler mit rotem Kreuz und längerer Standzeit; gleitet
// weich ein — und am Ende der Standzeit ebenso weich wieder hinaus.
export function Toast() {
  const toast = useUiStore((s) => s.toast)
  const clearToast = useUiStore((s) => s.clearToast)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!toast) return
    setLeaving(false)
    // Mit Aktions-Knopf („Rückgängig"/„Öffnen") länger stehen lassen
    const life = toast.action ? 8000 : toast.kind === 'error' ? 6000 : 3500
    const out = window.setTimeout(() => setLeaving(true), life - OUT_MS)
    const id = window.setTimeout(clearToast, life)
    return () => {
      window.clearTimeout(out)
      window.clearTimeout(id)
    }
  }, [toast, clearToast])

  // Die Live-Region ist DAUERHAFT gemountet (Review-Befund: konditionales
  // Mounten macht Screenreader-Ansagen unzuverlässig); nur der Inhalt kommt
  // und geht, mit Instanz-ID als Key — dieselbe Meldung zweimal spielt neu.
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      {toast && (
        <div
          key={toast.id}
          className={`pointer-events-auto flex max-w-[min(560px,calc(100vw-32px))] ${leaving ? 'animate-toast-out' : 'animate-toast-in'} items-center gap-2.5 rounded-card bg-ink px-3.5 py-2.5 text-sm text-white shadow-float`}
        >
          {toast.kind === 'success' && (
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok text-white">
              <Icon name="check" size={12} className="[stroke-width:3]" />
            </span>
          )}
          {toast.kind === 'error' && (
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger text-white">
              <Icon name="x" size={12} className="[stroke-width:3]" />
            </span>
          )}
          <span className="min-w-0">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run()
                clearToast()
              }}
              className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:scale-[1.02] hover:bg-white/25 active:scale-[.97]"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
