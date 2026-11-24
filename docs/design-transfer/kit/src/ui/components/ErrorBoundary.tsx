import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useUiStore } from '../../state/uiStore'
import { useT } from '../useT'
import { Button } from './Button'
import { EmptyState } from './Layout'

// Audit A2 02.09.2026 (P1.1): Ein Render-Fehler in einem Screen machte die
// ganze App weiß — ohne Meldung, ohne Ausweg. Die Grenze fängt den Fehler
// je Screen-Inhalt ab und bietet „Neu laden" (harter Neustart) und „Zur
// Übersicht" (Grenze zurücksetzen + Hub). Das Fehlerdetail bleibt einklappbar
// sichtbar, damit eine Meldung an die IT etwas Greifbares enthält.
// Klassenkomponente: React kennt Fehlergrenzen nur als Klasse.

interface Props {
  children: ReactNode
  // Schlüssel des umgebenden Inhalts (Screen + Gesellschaft): App.tsx setzt
  // ihn als React-key, damit ein Seitenwechsel die Grenze frisch aufbaut.
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Konsole statt stillem Schlucken — im Dev-Server sieht man den Stack,
    // in Produktion bleibt der Fehler im Browser-Log auffindbar.
    console.error('[n.Org] Render-Fehler im Screen:', error, info.componentStack)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    if (this.state.error) return <ErrorFallback error={this.state.error} onReset={this.reset} />
    return this.props.children
  }
}

// Funktionale Anzeige, weil Hooks (Sprache, Store) in der Klasse nicht gehen.
function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const t = useT()
  const go = useUiStore((s) => s.go)
  const detail = error.stack ? `${error.message}\n\n${error.stack}` : error.message
  return (
    <div role="alert" className="rounded-card border border-line bg-white">
      <EmptyState
        icon="alert-triangle"
        title={t.ux.errorTitle}
        hint={t.ux.errorHint}
        className="min-h-[420px] justify-center"
        action={
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon="undo" onClick={() => window.location.reload()}>
                {t.ux.errorReload}
              </Button>
              <Button
                variant="secondary"
                icon="home"
                onClick={() => {
                  // Erst die Grenze zurücksetzen, dann navigieren: liegt der
                  // Fehler auf dem Hub selbst, ändert sich der key nicht —
                  // ohne Reset bliebe die Fehlerseite stehen.
                  onReset()
                  go('start')
                }}
              >
                {t.ux.errorToStart}
              </Button>
            </div>
            <details className="w-full max-w-[560px] text-left">
              <summary className="cursor-pointer text-xs text-ink-40">{t.ux.errorDetails}</summary>
              <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line-2 bg-nw-grey-40/40 p-2 text-2xs text-ink-60">
                {detail}
              </pre>
            </details>
          </div>
        }
      />
    </div>
  )
}
