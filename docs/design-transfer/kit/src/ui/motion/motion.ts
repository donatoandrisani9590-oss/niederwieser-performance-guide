// Gemeinsame Bewegungs-Hilfen (Wow-Runde 02.09.2026). Bewusst OHNE
// Bibliothek: CSS-Transitions und die Web Animations API reichen; jsdom
// (Tests) und ältere Browser fallen still auf „keine Bewegung" zurück.
// Die globale reduced-motion-Regel in index.css deckt nur CSS ab — Skripte
// müssen selbst fragen (motionAllowed).

// Feder-Kurve als CSS linear()-Easing (ein weiches Überschwingen ~4 %),
// damit Auftritte „landen" statt bloß auszurollen. Browser ohne linear()
// (Safari < 17.2) verwerfen den Wert in CSS still, element.animate() wirft
// dagegen einen TypeError — flipElements prüft deshalb vorher (springEase).
export const SPRING_EASE =
  'linear(0, 0.0065 1%, 0.0273, 0.0625 3%, 0.1126 4%, 0.1746, 0.2451 6%, 0.3208, 0.3986 8%, 0.4759, 0.5504 10%, 0.6206, 0.6853 12%, 0.7437, 0.7955 14%, 0.8405, 0.8788 16%, 0.9107, 0.9366 18%, 0.9572, 0.9729 20%, 0.9846, 0.9928 22%, 0.9983, 1.0018 24%, 1.0037, 1.0045 26%, 1.0046, 1.0041 28%, 1.0034, 1.0026 30%, 1.0018, 1.0011 32%, 1.0006, 1.0002 34%, 1.0, 0.9998 36%, 0.9997, 0.9997 38%, 0.9997, 0.9998 40%, 0.9999, 1 42%, 1 100%)'

// Weiches Ausrollen für Kamera-Flüge (kein Überschwingen — das Blatt soll
// ankommen, nicht wippen)
export const GLIDE_EASE = 'cubic-bezier(.2,.8,.2,1)'

// Feder, wo der Browser linear() versteht, sonst das weiche Ausrollen.
// Ohne CSS.supports (jsdom, sehr alte Browser) gilt: nicht unterstützt.
function springEase(): string {
  const ok = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('transition-timing-function', SPRING_EASE)
  return ok ? SPRING_EASE : GLIDE_EASE
}

export function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Positionen einer Menge adressierbarer Elemente merken (First)
export function measureRects(entries: Iterable<[string, Element]>): Map<string, DOMRect> {
  const m = new Map<string, DOMRect>()
  for (const [id, el] of entries) m.set(id, el.getBoundingClientRect())
  return m
}

// FLIP: Elemente, die es vorher schon gab und die woanders gelandet sind,
// gleiten von der alten an die neue Stelle. `scale` = aktueller Maßstab des
// Blatts (Bildschirm-Pixel → Blatt-Einheiten), weil die Elemente INNERHALB
// des skalierten Hosts animiert werden. Gibt die Zahl gespielter Animationen
// zurück (0 = nichts zu tun / nicht erlaubt).
export function flipElements(
  before: Map<string, DOMRect>,
  after: Iterable<[string, Element]>,
  opts: { duration: number; scale: number | ((el: Element) => number); easing?: string },
): number {
  if (!motionAllowed()) return 0
  const easing = opts.easing ?? springEase()
  let played = 0
  for (const [id, el] of after) {
    const prev = before.get(id)
    if (!prev) continue
    if (typeof (el as Element & { animate?: unknown }).animate !== 'function') continue
    const next = el.getBoundingClientRect()
    const k = typeof opts.scale === 'function' ? opts.scale(el) : opts.scale
    if (!(k > 0)) continue
    const dx = (prev.left - next.left) / k
    const dy = (prev.top - next.top) / k
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) continue
    // Bewegung ist Zugabe: scheitert sie (unbekanntes Easing, exotische
    // Engine), landet das Element ohne Gleiten am neuen Platz — kein Absturz
    // im Blatt-Effekt.
    try {
      el.animate(
        [{ transform: `translate(${round(dx)}px, ${round(dy)}px)` }, { transform: 'translate(0px, 0px)' }],
        { duration: opts.duration, easing, fill: 'none' },
      )
    } catch {
      continue
    }
    played++
  }
  return played
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
