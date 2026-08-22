/**
 * « Sources du moteur » de l'artboard 14 — les cinq entrées que le canevas écrit, mot pour mot,
 * et rien d'autre. Le marqueur de 22 × 9 px reprend le vocabulaire du canevas : aplat plein pour
 * une source retenue et solide, contour vide pour une source transposée, hachure pour une règle
 * écartée.
 */
export type SourceMark = 'solid' | 'outline' | 'hatch'

export interface EngineSource {
  title: string
  meta: string
  mark: SourceMark
}

export const ENGINE_SOURCES: EngineSource[] = [
  { title: 'Affûtage — Bosquet 2007', meta: 'méta-analyse · utilisé', mark: 'solid' },
  { title: 'Glucides 60→90 g/h — Jeukendrup', meta: 'revues répétées · utilisé', mark: 'solid' },
  { title: 'Vitesse critique — Wakayoshi 1992', meta: 'transposé au CSS · utilisé', mark: 'outline' },
  { title: 'Règle des 10 %', meta: 'non démontrée · écartée', mark: 'hatch' },
  { title: 'ACWR charge aiguë / chronique', meta: 'contesté depuis 2019 · écartée', mark: 'hatch' },
]

/** Les quatre sorties de l'artboard 14. Seule la sauvegarde `.JSON` est écrite (`storage/backup.ts`). */
export interface ExportRow {
  title: string
  /** Sous-titre mono. `null` quand il dépend des données (compté à l'affichage). */
  meta: string | null
  format: string
  available: boolean
  /** Dit pourquoi la sortie est inerte — jamais un bouton mort sans explication. */
  unavailableReason?: string
}

export const EXPORT_ROWS: ExportRow[] = [
  {
    title: 'Séance → montre',
    meta: 'fichier structuré',
    format: '.FIT',
    available: false,
    unavailableReason:
      'Le .FIT est un binaire Garmin : son écriture est reportée plutôt que bricolée — un fichier mal formé casserait la montre, pas l’application.',
  },
  // Ces deux-là étaient annoncés « pas encore implémentés » alors que `zwoFile.ts` et
  // `icsFile.ts` les écrivent, testés, depuis la reprise des artboards 20 et 24.
  {
    title: 'Séance → home-trainer',
    meta: 'Zwift, Rouvy, MyWhoosh',
    format: '.ZWO',
    available: true,
  },
  {
    title: 'Plan → agenda',
    meta: null,
    format: '.ICS',
    available: true,
  },
  {
    title: 'Sauvegarde complète',
    meta: 'profil, plan, séances, courses',
    format: '.JSON',
    available: true,
  },
]
