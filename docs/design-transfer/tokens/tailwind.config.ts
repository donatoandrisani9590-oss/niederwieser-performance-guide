import type { Config } from 'tailwindcss'

// Corporate-Tokens Niederwieser — Quelle: Spec Kap. 8.4 + Mockup.
// Orange ist nicht Teil der Palette (Spec 8.4); Amber dient nur App-UI-Status
// (Entwurfs-Badges) und darf nie im Chart/PDF erscheinen.
//
// Design-Review 18.08.2026 (docs/design-review-2026-08-18.md): Ergänzt um
// Status-Tokens (ok/warn/danger), eine feste Schriftskala (6 Stufen) und
// Bausteinmaße — nichts davon ersetzt die Corporate-Farben.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Feste Skala statt Sonderwerte: Overline · Caption · Sekundär · Body ·
    // Abschnitt · Zwischentitel · Seitentitel. Body ist 14 px.
    fontSize: {
      '2xs': ['11px', { lineHeight: '14px' }],
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['13px', { lineHeight: '18px' }],
      base: ['14px', { lineHeight: '20px' }],
      md: ['15px', { lineHeight: '20px' }],
      lg: ['17px', { lineHeight: '24px' }],
      xl: ['22px', { lineHeight: '28px' }],
      '2xl': ['26px', { lineHeight: '32px' }],
    },
    extend: {
      colors: {
        'nw-blue': '#243186',
        'nw-blue-90': '#3A46A0',
        'nw-blue-25': '#C9CDE3',
        'nw-blue-12': '#E6E8F2',
        'nw-blue-06': '#F2F3F8',
        'nw-green': '#6EBD84',
        'nw-green-15': '#E8F5EC',
        'nw-grey': '#D7CFC5',
        'nw-grey-40': '#F3F0EC',
        ink: '#1C1F2E',
        'ink-60': '#5F6377',
        'ink-40': '#8B8FA1',
        line: '#E4E0DA',
        'line-2': '#EEEBE6',
        panel: '#F4F2EE',
        // Statusfarben (nur App-UI): Grün = freigegeben/passt, Amber = Hinweis,
        // Rot = Fehler/destruktiv. Kontrast auf Weiß jeweils ≥ 4,5:1.
        ok: '#2F7A48',
        'ok-bg': '#E8F5EC',
        warn: '#9A6414',
        'warn-bg': '#FBF1DD',
        danger: '#9B2C22',
        'danger-bg': '#FBECEA',
        // Brandbook 2026 „Traffic light rating colours" — nur für FLÄCHEN
        // (Ampelpunkte, Statusflächen); Text behält die kontraststarken Töne.
        'traffic-red': '#E50046',
        'traffic-amber': '#F59D24',
        // Rückwärtskompatible Aliasse (werden schrittweise durch warn ersetzt)
        amber: '#9A6414',
        'amber-bg': '#FBF1DD',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        // 8 px = Bedienelemente (rounded-lg), 10 px = Flächen, 12 px = Dialoge (rounded-xl)
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,31,46,.05)',
        float: '0 1px 2px rgba(28,31,46,.05), 0 12px 32px -16px rgba(28,31,46,.18)',
        sheet: '0 1px 2px rgba(28,31,46,.08), 0 24px 48px -24px rgba(28,31,46,.28)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(.98) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translate(-50%, 8px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Signature-Moment: das A3-Blatt gleitet beim Öffnen in die Einpassung
        'sheet-enter': {
          from: { opacity: '0', transform: 'scale(.96) translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Abgänge spiegeln die Auftritte (Motion-Runde 31.08.): kürzer als
        // der jeweilige Auftritt, damit Schließen nie zäh wirkt.
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'menu-out': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(-4px)' },
        },
        'pop-out': {
          from: { opacity: '1', transform: 'scale(1) translateY(0)' },
          to: { opacity: '0', transform: 'scale(.98) translateY(4px)' },
        },
        // Toast-Auf-/Abgang: nur Y — die Zentrierung trägt der äußere
        // Live-Region-Wrapper (translate-x bliebe sonst doppelt).
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-out': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(8px)' },
        },
        // Wow-Runde 02.09.2026 — alle einmalig, alle unter reduced-motion aus:
        // Aufmerksamkeits-Puls (offene Ampelpunkte, genau ein Atemzug)
        attention: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.45)' },
        },
        // Lichtlauf um eine Karte (frisch veröffentlichte Fassung im Hub)
        'shine-sweep': {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        // Stempel setzt auf: groß und blass → satt und leicht überschwingend
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(1.7) rotate(-8deg)' },
          '60%': { opacity: '1', transform: 'scale(.94) rotate(-8deg)' },
          '80%': { transform: 'scale(1.04) rotate(-8deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-8deg)' },
        },
        // Wasserzeichen ENTWURF löst sich auf
        dissolve: {
          from: { opacity: '1', filter: 'blur(0)' },
          to: { opacity: '0', filter: 'blur(6px)' },
        },
        // Tinten-Puls unter dem Stempel
        'ink-pulse': {
          '0%': { opacity: '0', transform: 'scale(.6)' },
          '15%': { opacity: '.3' },
          '100%': { opacity: '0', transform: 'scale(1.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out both',
        'pop-in': 'pop-in .18s cubic-bezier(.2,.8,.2,1) both',
        'slide-up': 'slide-up .2s cubic-bezier(.2,.8,.2,1) both',
        'menu-in': 'menu-in .14s ease-out both',
        'sheet-enter': 'sheet-enter .65s cubic-bezier(.2,.8,.2,1) both',
        'fade-out': 'fade-out .12s ease-in both',
        'menu-out': 'menu-out .12s ease-in both',
        'pop-out': 'pop-out .12s ease-in both',
        'toast-in': 'toast-in .2s cubic-bezier(.2,.8,.2,1) both',
        'toast-out': 'toast-out .18s ease-in both',
        // Blattwechsel: bewusst schwächer als sheet-enter — nur Deckkraft
        'sheet-swap': 'fade-in .14s ease-out both',
        // Wow-Runde 02.09.2026
        attention: 'attention .5s cubic-bezier(.2,.8,.2,1) 1 both',
        'shine-sweep': 'shine-sweep 1.6s ease-in-out 1 both',
        'stamp-in': 'stamp-in .55s cubic-bezier(.2,.8,.2,1) both',
        dissolve: 'dissolve .5s ease-in both',
        'ink-pulse': 'ink-pulse .7s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config
