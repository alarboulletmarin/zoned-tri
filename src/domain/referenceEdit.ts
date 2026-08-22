import { parsePaceToSeconds, type ReferenceKey } from './toolsReferences'
import type { AthleteProfile, TrainingPlan } from './types'

/**
 * Écrire une référence, et dire ce que ça change.
 *
 * « Enregistrer une référence » était l'un des boutons gris du produit, avec ce motif : « écrire
 * une référence change les allures de toutes les séances à venir : l'écran qui montre d'abord
 * lesquelles bougent n'existe pas encore ». Le motif était prudent — et il était FAUX.
 *
 * Un plan porte son propre `referencesSnapshot`, pris à la génération, et `planSettings.ts` le lit
 * en priorité : `snapshot.ftpWatts ?? profile.ftp.watts`. Changer une référence du profil ne
 * touche donc pas un plan qui la portait déjà. Elle ne le touche que dans un cas — quand le plan a
 * été généré SANS cette référence : le repli sur le profil devient alors la valeur du plan.
 *
 * C'est cette distinction que la feuille de confirmation annonce, plutôt qu'une menace vague.
 */
export interface ReferenceDraft {
  /** `1:32` — vide = « pas de valeur », ce qui efface la référence. */
  css: string
  /** `248` en watts. */
  ftp: string
  /** `4:12` au kilomètre. */
  runThreshold: string
  /** Date de mesure commune aux références modifiées (ISO). */
  measuredAt: string
  weightKg: string
  sweatRateLPerH: string
  maxHeartRateBpm: string
}

export function draftFromProfile(profile: AthleteProfile | undefined, today: string): ReferenceDraft {
  return {
    css: profile?.css?.paceMinPer100m ?? '',
    ftp: profile?.ftp ? String(profile.ftp.watts) : '',
    runThreshold: profile?.runThreshold?.paceMinPerKm ?? '',
    measuredAt: today,
    weightKg: profile && profile.weightKg > 0 ? String(profile.weightKg) : '',
    sweatRateLPerH: profile && profile.sweatRateLPerH > 0 ? String(profile.sweatRateLPerH) : '',
    maxHeartRateBpm: profile && profile.maxHeartRateBpm > 0 ? String(profile.maxHeartRateBpm) : '',
  }
}

/** Un champ mal saisi, dit à l'endroit où il se saisit — jamais un refus global sans coupable. */
export type ReferenceFieldKey = keyof ReferenceDraft
export type ReferenceErrors = Partial<Record<ReferenceFieldKey, string>>

function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : Number.NaN
}

export function validateDraft(draft: ReferenceDraft): ReferenceErrors {
  const errors: ReferenceErrors = {}

  if (draft.css.trim() !== '' && parsePaceToSeconds(draft.css) === null) {
    errors.css = 'Format attendu : m:ss aux 100 m, par exemple 1:32.'
  }
  if (draft.runThreshold.trim() !== '' && parsePaceToSeconds(draft.runThreshold) === null) {
    errors.runThreshold = 'Format attendu : m:ss au kilomètre, par exemple 4:12.'
  }

  const numeric: [ReferenceFieldKey, string, string][] = [
    ['ftp', draft.ftp, 'Une puissance en watts, par exemple 248.'],
    ['weightKg', draft.weightKg, 'Un poids en kilogrammes, par exemple 72.'],
    ['sweatRateLPerH', draft.sweatRateLPerH, 'Un débit en litres par heure, par exemple 1,2.'],
    ['maxHeartRateBpm', draft.maxHeartRateBpm, 'Une fréquence en battements par minute, par exemple 186.'],
  ]
  for (const [key, raw, message] of numeric) {
    const value = parseDecimal(raw)
    if (value === null) continue
    if (Number.isNaN(value) || value <= 0) errors[key] = message
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.measuredAt)) {
    errors.measuredAt = 'Une date de mesure est attendue : c’est elle qui rend la référence lisible.'
  }

  return errors
}

/**
 * Le profil que le brouillon produit. `undefined` quand le profil n'existe pas encore ET que rien
 * n'a été saisi : on ne crée pas une fiche vide pour rien.
 */
export function applyDraft(
  draft: ReferenceDraft,
  profile: AthleteProfile | undefined,
): AthleteProfile {
  const base: AthleteProfile = profile ?? {
    id: 'athlete',
    weightKg: 0,
    sweatRateLPerH: 0,
    maxHeartRateBpm: 0,
    language: 'fr',
    theme: 'system',
  }

  const next: AthleteProfile = {
    ...base,
    weightKg: parseDecimal(draft.weightKg) ?? 0,
    sweatRateLPerH: parseDecimal(draft.sweatRateLPerH) ?? 0,
    maxHeartRateBpm: parseDecimal(draft.maxHeartRateBpm) ?? 0,
  }

  // Une valeur effacée efface la référence : la propriété disparaît, elle ne passe pas à zéro.
  // C'est ce qui fait dire « — · jamais mesurée » plutôt que « 0 W » aux écrans qui la lisent.
  if (draft.css.trim() === '') delete next.css
  else next.css = { paceMinPer100m: draft.css.trim(), measuredAt: draft.measuredAt }

  const ftp = parseDecimal(draft.ftp)
  if (ftp === null) delete next.ftp
  else next.ftp = { watts: Math.round(ftp), measuredAt: draft.measuredAt }

  if (draft.runThreshold.trim() === '') delete next.runThreshold
  else next.runThreshold = { paceMinPerKm: draft.runThreshold.trim(), measuredAt: draft.measuredAt }

  return next
}

export interface ReferenceChange {
  key: ReferenceKey | 'weightKg' | 'sweatRateLPerH' | 'maxHeartRateBpm'
  label: string
  /** `null` = la référence n'existait pas / est effacée. */
  before: string | null
  after: string | null
}

function paceOf(value: string | undefined): string | null {
  return value ?? null
}

function measureOf(value: number): string | null {
  return value > 0 ? String(value) : null
}

/** Ce qui change réellement entre deux profils — les lignes identiques ne sont pas listées. */
export function diffProfiles(before: AthleteProfile | undefined, after: AthleteProfile): ReferenceChange[] {
  const rows: ReferenceChange[] = [
    {
      key: 'css',
      label: 'CSS natation',
      before: paceOf(before?.css?.paceMinPer100m),
      after: paceOf(after.css?.paceMinPer100m),
    },
    {
      key: 'ftp',
      label: 'FTP vélo',
      before: before?.ftp ? String(before.ftp.watts) : null,
      after: after.ftp ? String(after.ftp.watts) : null,
    },
    {
      key: 'runThreshold',
      label: 'Allure seuil course',
      before: paceOf(before?.runThreshold?.paceMinPerKm),
      after: paceOf(after.runThreshold?.paceMinPerKm),
    },
    { key: 'weightKg', label: 'Poids', before: measureOf(before?.weightKg ?? 0), after: measureOf(after.weightKg) },
    {
      key: 'sweatRateLPerH',
      label: 'Taux de sudation',
      before: measureOf(before?.sweatRateLPerH ?? 0),
      after: measureOf(after.sweatRateLPerH),
    },
    {
      key: 'maxHeartRateBpm',
      label: 'FC max',
      before: measureOf(before?.maxHeartRateBpm ?? 0),
      after: measureOf(after.maxHeartRateBpm),
    },
  ]

  return rows.filter((row) => row.before !== row.after)
}

const SNAPSHOT_KEY: Record<ReferenceKey, 'cssPaceMinPer100m' | 'ftpWatts' | 'runThresholdPaceMinPerKm'> = {
  css: 'cssPaceMinPer100m',
  ftp: 'ftpWatts',
  runThreshold: 'runThresholdPaceMinPerKm',
}

const REFERENCE_KEYS: ReferenceKey[] = ['css', 'ftp', 'runThreshold']

/** Une ligne de diff qui porte une des trois références du seuil, par opposition aux mesures. */
function isReferenceRow(change: ReferenceChange): change is ReferenceChange & { key: ReferenceKey } {
  return (REFERENCE_KEYS as ReferenceChange['key'][]).includes(change.key)
}

/**
 * Ce que le plan actif devient. Une seule phrase, et elle dit la vérité du code : le plan garde son
 * instantané, sauf pour les références qu'il n'avait pas.
 */
export function planImpact(changes: ReferenceChange[], activePlan: TrainingPlan | undefined): string {
  if (!activePlan) return 'Aucun plan actif : ces références serviront au prochain plan généré.'

  const referenceChanges = changes.filter(isReferenceRow)
  if (referenceChanges.length === 0) {
    return 'Ton plan en cours ne bouge pas : ces mesures ne servent qu’aux calculateurs.'
  }

  const adopted = referenceChanges.filter(
    (change) => activePlan.referencesSnapshot[SNAPSHOT_KEY[change.key]] === undefined,
  )

  if (adopted.length === 0) {
    return 'Ton plan en cours ne bouge pas : il garde les allures prises à sa génération. Les nouvelles valeurs s’appliquent aux écrans de la bibliothèque, aux exports et au prochain plan.'
  }

  const names = adopted.map((change) => change.label.toLowerCase()).join(', ')
  return `Ton plan en cours n’avait pas de ${names} : ses séances vont désormais s’appuyer dessus. Les autres allures du plan ne bougent pas.`
}
