import { useEffect, useRef, useState } from 'react'
import { motionAllowed } from '../motion/motion'

// Hochzählende Kennzahl (Wow-Runde 02.09.2026): beim Ankommen läuft die Zahl
// in ~0,7 s von 0 (bzw. vom vorigen Wert) zum Ziel — „gerechnet, nicht
// abgeschrieben". Vorleser bekommen nur den Endwert (sr-only).
// Ohne rAF oder bei reduzierter Bewegung steht der Endwert sofort.

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function NumberTicker({
  value,
  format,
  duration = 700,
  className,
}: {
  value: number
  format: (n: number) => string
  duration?: number
  className?: string
}) {
  const canTick = typeof requestAnimationFrame === 'function' && motionAllowed()
  const [shown, setShown] = useState(canTick ? 0 : value)
  const fromRef = useRef(0)
  const shownRef = useRef(shown)
  shownRef.current = shown

  useEffect(() => {
    if (!canTick) {
      setShown(value)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const v = from + (value - from) * easeOutCubic(t)
      setShown(t >= 1 ? value : v)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      // Nächster Lauf startet dort, wo dieser stand (kein Rücksprung auf 0)
      fromRef.current = shownRef.current
    }
    // canTick ist je Umgebung konstant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  // Kein Live-Region-Element: role=status hätte jeden Zwischenwert vorgelesen.
  // Vorleser bekommen nur den Endwert (sr-only), die laufende Zahl ist versteckt.
  return (
    <span className={className}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden>{format(shown)}</span>
    </span>
  )
}
