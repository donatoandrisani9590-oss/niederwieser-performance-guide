// Tastenkürzel je Betriebssystem (Erstnutzer-Test 05.09.2026, Befund 36):
// „⌘K" sagt einer Windows-Nutzerin nichts — dort heißt es „Strg+K".
export function isMacLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const p = `${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`
  return /Mac|iPhone|iPad|iPod/i.test(p)
}

export function searchShortcutLabel(): string {
  return isMacLike() ? '⌘K' : 'Strg+K'
}

/** KI-Assistent (17.10.2026): ⌘J bzw. Strg+J. */
export function assistantShortcutLabel(): string {
  return isMacLike() ? '⌘J' : 'Strg+J'
}

export function zoomShortcutLabel(): string {
  return isMacLike() ? '⌘ + Scrollen' : 'Strg + Scrollen'
}
