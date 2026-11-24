import { create } from 'zustand'

// SHIM für das Übergabepaket — ersetzt n.Orgs `src/state/uiStore.ts`.
//
// Das Original hält Screen, Gesellschaft, Sprachen, Fokusziele, Verlauf und
// Toast (über 300 Zeilen, an den URL-Hash gekoppelt). Die Kit-Bausteine
// brauchen davon nur: Toast (Toast.tsx), go/screen (HomeButton, ErrorBoundary)
// und den eigenen Zurück-Verlauf (BackButton).
//
// In der Ziel-App: `go` an den eigenen Router hängen (React Router:
// `navigate(...)`, Next: `router.push(...)`) und `Screen` auf die eigenen
// Seiten setzen. Toast-Aufruf überall gleich: `useUiStore.getState().showToast('Gespeichert', 'success')`.

export type Screen = 'home' | 'start' | (string & {})
export type ToastKind = 'info' | 'success' | 'error'
export interface ToastAction {
  label: string
  run: () => void
}

interface UiState {
  screen: Screen
  go: (screen: Screen) => void
  backStack: string[]
  pushBack: (hash: string) => void
  popBack: () => string | null
  toast: { id: number; message: string; kind: ToastKind; action?: ToastAction } | null
  showToast: (message: string, kind?: ToastKind, action?: ToastAction) => void
  clearToast: () => void
}

let toastSeq = 0

export const useUiStore = create<UiState>((set, get) => ({
  screen: 'home',
  go: (screen) => {
    const here = typeof window !== 'undefined' ? window.location.hash : ''
    if (here) get().pushBack(here)
    set({ screen })
    if (typeof window !== 'undefined') window.location.hash = `#/${screen}`
  },
  backStack: [],
  // Wie im Original: höchstens 20 Schritte, der Verlauf führt nie aus der App
  pushBack: (hash) => set((s) => ({ backStack: [...s.backStack.slice(-19), hash] })),
  popBack: () => {
    const st = get().backStack
    if (st.length === 0) return null
    set({ backStack: st.slice(0, -1) })
    return st[st.length - 1] ?? null
  },
  toast: null,
  // Neue Instanz-ID je Aufruf: dieselbe Meldung zweimal spielt sichtbar neu
  showToast: (message, kind = 'info', action) => set({ toast: { id: ++toastSeq, message, kind, action } }),
  clearToast: () => set({ toast: null }),
}))
