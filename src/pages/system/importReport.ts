/**
 * Ce que l'artboard 19 rend lisible : les erreurs typées de `storage/validation.ts` d'un côté,
 * l'inventaire de ce que le refus a laissé intact de l'autre.
 *
 * Rien n'est calculé ici qui ne vienne du fichier refusé ou de la base : l'écran ne récite pas
 * l'artboard, il en reprend la forme avec les valeurs réelles.
 */

import { selectOpeningState } from '../../domain/openingState'
import { buildToolsReferences } from '../../domain/toolsReferences'
import { CURRENT_SCHEMA_VERSION, type AthleteProfile, type Race, type TrainingPlan, type Workout } from '../../domain/types'
import type { ValidationError } from '../../storage/validation'

/** `« 248 W »` pour une chaîne, `rien` pour une clé absente — jamais un blanc. */
function formatReceived(value: unknown): string {
  if (value === undefined) return 'rien'
  if (value === null) return 'null'
  if (typeof value === 'string') return `« ${value} »`
  if (Array.isArray(value)) return `un tableau de ${value.length}`
  if (typeof value === 'object') return 'un objet'
  return String(value)
}

/**
 * Une ligne de l'encart « Ce qui bloque ».
 *
 * L'artboard préfixe chaque ligne du numéro de ligne du fichier (`ligne 1 842 · …`). On ne peut
 * pas le produire : `JSON.parse` rend un objet, pas des positions, et le validateur travaille sur
 * l'objet. Le chemin du champ (`profile.ftp.watts`) est l'adresse dont on dispose, et c'est celle
 * qu'un éditeur de texte permet de retrouver — voir le rapport de reprise.
 */
export function formatBlockingLine(error: ValidationError): string {
  // `$` est le chemin que le validateur donne au fichier entier — et celui qu'on lui donne quand
  // `JSON.parse` refuse d'aller plus loin. Il n'y a alors aucun champ à nommer.
  if (error.path === '$') {
    return `le fichier n’est pas un ${error.expectedType} · ${formatReceived(error.receivedValue)}`
  }
  if (error.path === 'schemaVersion') {
    return `version du fichier : ${formatReceived(error.receivedValue)} · version lue : ${CURRENT_SCHEMA_VERSION}`
  }
  return `champ « ${error.path} » attendu en ${error.expectedType}, reçu ${formatReceived(error.receivedValue)}`
}

/** `1,4 Mo` — la taille du fichier refusé, telle que l'artboard la pose sous le titre. */
export function formatFileSize(bytes: number): string {
  const kilo = 1024
  const mega = kilo * kilo
  if (bytes < mega) return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / kilo)} ko`
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / mega)} Mo`
}

export interface UntouchedInput {
  plans: TrainingPlan[]
  workouts: Workout[]
  races: Race[]
  profile: AthleteProfile | undefined
  today: string
}

/**
 * Les trois lignes de « Ce qui n'a pas bougé ». Chacune ne s'écrit que si la base la porte : sans
 * plan actif, il n'y a pas de plan à dire intact, et une ligne inventée serait pire qu'une ligne
 * absente. Quand les trois manquent, l'écran nomme le vide — c'est `EmptyState` qui s'en charge.
 */
export function buildUntouchedLines({ plans, workouts, races, profile, today }: UntouchedInput): string[] {
  const lines: string[] = []

  const { activePlan } = selectOpeningState({ plans, races, workouts, profile, today })
  if (activePlan) {
    // `weekLabel` vaut « Semaine 07 / 18 » ; l'artboard écrit « semaine 07 sur 18 ».
    lines.push(`Ton plan en cours, ${activePlan.weekLabel.toLowerCase().replace(' / ', ' sur ')}`)
  }

  const measured = buildToolsReferences(profile, today).lines.filter((line) => line.value !== null)
  if (measured.length > 0) {
    const parts = measured.map((line) =>
      line.key === 'ftp' ? `FTP ${line.value} W` : line.key === 'css' ? `CSS ${line.value}` : `seuil ${line.value}`,
    )
    lines.push(`Tes références : ${parts.join(', ')}`)
  }

  if (races.length === 1) lines.push('Ta course et sa fiche')
  else if (races.length > 1) lines.push(`Tes ${races.length} courses et leurs fiches`)

  return lines
}
