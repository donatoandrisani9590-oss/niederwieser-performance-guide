// SHIM für das Übergabepaket — ersetzt n.Orgs `src/ui/useT.ts`.
//
// Im Original liefert useT() den vollständigen Stringkatalog der aktuellen
// Oberflächensprache (DE/IT/EN/ES, `src/i18n/ui.ts`, über 1.400 Zeilen je
// Sprache). Die Bausteine im Kit brauchen davon nur die Schlüssel unten.
//
// In der Ziel-App: entweder diese Datei behalten und die Texte anpassen, oder
// useT() auf das eigene i18n umbiegen (z. B. i18next: `const { t } = useTranslation()`
// und die Aufrufe `t.common.cancel` → `t('common.cancel')`). Die Werte sind die
// deutschen Originaltexte von n.Org.

const DE = {
  common: {
    cancel: 'Abbrechen',
    required: 'Pflichtfeld',
    requiredFooter: '* Pflichtfeld',
    missingFields: (list: string) => `Noch auszufüllen: ${list}`,
  },
  nav: {
    back: 'Zurück',
    backTitle: 'Zurück zur vorherigen Seite',
  },
  ux: {
    close: 'Schließen',
    home: 'Start',
    homeTitle: 'Zur Startseite',
    errorTitle: 'Hier ist etwas schiefgelaufen.',
    errorHint:
      'Die Seite konnte nicht dargestellt werden. Neu laden hilft meist; sonst zurück zur Übersicht — Ihre gespeicherten Daten sind nicht betroffen.',
    errorReload: 'Neu laden',
    errorToStart: 'Zur Übersicht',
    errorDetails: 'Fehlerdetails anzeigen',
  },
}

export type UiStrings = typeof DE

export function useT(): UiStrings {
  return DE
}
