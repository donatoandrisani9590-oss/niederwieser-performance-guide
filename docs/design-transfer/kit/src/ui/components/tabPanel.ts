// Verknüpfung Reiter ↔ Inhalt (Audit 23.09.2026, WP16-F19): Mit `id` vergibt
// Tabs jedem Reiter `${id}-tab-${key}` und aria-controls auf das Gegenstück,
// das der Inhalt über tabPanelProps(id, key) erhält (role tabpanel, benannt
// nach dem Reiter, per Tab erreichbar). Ohne `id` bleibt aria-controls weg —
// ein Verweis ins Leere wäre schlechter als keiner. Eigene Datei, weil eine
// Komponenten-Datei nur Komponenten exportieren soll (Fast Refresh).
export const tabId = (id: string, key: string) => `${id}-tab-${key}`
export const panelId = (id: string, key: string) => `${id}-panel-${key}`

export function tabPanelProps(id: string, key: string) {
  return { id: panelId(id, key), role: 'tabpanel', 'aria-labelledby': tabId(id, key), tabIndex: 0 } as const
}
