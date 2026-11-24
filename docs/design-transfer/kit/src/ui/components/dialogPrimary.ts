import { createContext, useContext, useEffect, useRef } from 'react'

// Enter sendet den Dialog ab (Audit A3 02.09.2026, P2.5; eigene Datei wegen
// Fast Refresh — Modal.tsx exportiert nur Komponenten): DialogButtons — oder
// eine eigene Knopfzeile über useDialogPrimary — meldet den Primärknopf beim
// umgebenden Modal an; Enter in einem Text-/Datums-/Auswahlfeld löst ihn aus,
// sofern er nicht gesperrt ist. Nicht in Textareas (Zeilenumbruch), nicht in
// SearchSelect (combobox/listbox: Enter wählt den Eintrag) und nicht, solange
// ein Menü offen ist (Enter wählt den Menüeintrag).
export interface DialogPrimary {
  run: () => void
  disabled: boolean
}

export const DialogPrimaryContext = createContext<((primary: DialogPrimary | null) => void) | null>(null)

export function useDialogPrimary(onOk: () => void, disabled: boolean): void {
  const register = useContext(DialogPrimaryContext)
  // onOk lebt in einem Ref: Aufrufer übergeben Inline-Funktionen, die sich
  // je Render ändern — neu registriert wird nur bei Sperrwechsel.
  const onOkRef = useRef(onOk)
  useEffect(() => {
    onOkRef.current = onOk
  })
  useEffect(() => {
    if (!register) return
    register({ run: () => onOkRef.current(), disabled })
    return () => register(null)
  }, [register, disabled])
}
