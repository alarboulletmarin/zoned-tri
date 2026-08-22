import { RACE_FORMATS, raceFormat } from './planGenerator/formats'
import type { PlanFormat, Race, RaceRole, TrainingPlan } from './types'

/**
 * Créer, modifier et supprimer une course — ce que le produit ne savait pas faire.
 *
 * Une course n'entrait dans l'application que par la porte du générateur, qui en demande le nom et
 * la date à l'étape 1 et les écrit avec le plan. Conséquences : impossible d'ajouter une course de
 * préparation (le modèle a pourtant `role: 'preparation'`, `purpose` et `easyDaysBefore`), de
 * corriger une date décalée, de renseigner l'heure de départ que l'écran « Jour J » affiche, ou de
 * supprimer une course entrée par erreur. « Ajouter une course » menait au générateur : ajouter une
 * course voulait dire refaire un plan.
 */
export interface RaceDraft {
  name: string
  date: string
  format: PlanFormat
  role: RaceRole
  /** « 07:20 » — l'heure que l'écran Jour J affiche, et qu'aucun écran ne savait saisir. */
  startTime: string
  /** Rôle d'une course de préparation (artboard 27 : « test d'allure »). */
  purpose: string
  /** Jours faciles réservés avant une prépa (artboard 27 : « 3 jours faciles avant »). */
  easyDaysBefore: string
}

export const RACE_FORMAT_OPTIONS = RACE_FORMATS

export function emptyRaceDraft(today: string): RaceDraft {
  return {
    name: '',
    date: today,
    format: '70.3',
    role: 'primary_goal',
    startTime: '',
    purpose: '',
    easyDaysBefore: '',
  }
}

export function draftFromRace(race: Race): RaceDraft {
  return {
    name: race.name,
    date: race.date,
    format: race.format,
    role: race.role,
    startTime: race.startTime ?? '',
    purpose: race.purpose ?? '',
    easyDaysBefore: race.easyDaysBefore === undefined ? '' : String(race.easyDaysBefore),
  }
}

export type RaceFieldKey = keyof RaceDraft
export type RaceErrors = Partial<Record<RaceFieldKey, string>>

export function validateRaceDraft(draft: RaceDraft): RaceErrors {
  const errors: RaceErrors = {}

  if (draft.name.trim() === '') {
    errors.name = 'Une course a un nom : c’est lui qui la nomme partout dans l’application.'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    errors.date = 'Une date est attendue : c’est elle qui place la course dans le calendrier.'
  }
  if (draft.startTime !== '' && !/^\d{2}:\d{2}$/.test(draft.startTime)) {
    errors.startTime = 'Format attendu : hh:mm, par exemple 07:20.'
  }

  if (draft.easyDaysBefore !== '') {
    const days = Number(draft.easyDaysBefore)
    if (!Number.isInteger(days) || days < 0 || days > 14) {
      errors.easyDaysBefore = 'Un nombre de jours entre 0 et 14.'
    }
  }

  return errors
}

/**
 * La course que le brouillon produit. Les distances viennent du format officiel : on n'invente
 * aucune distance, et on ne demande pas à l'utilisateur de retaper 1,9 / 90 / 21,1.
 */
export function applyRaceDraft(draft: RaceDraft, existing: Race | undefined, id: string): Race {
  const race: Race = {
    ...(existing ?? {}),
    id: existing?.id ?? id,
    name: draft.name.trim(),
    date: draft.date,
    format: draft.format,
    role: draft.role,
    distances: raceFormat(draft.format).distances,
  }

  if (draft.startTime === '') delete race.startTime
  else race.startTime = draft.startTime

  // `purpose` et `easyDaysBefore` ne veulent rien dire sur une course objectif : le canevas ne les
  // dessine que sur l'encadré « PRÉPA ». On ne les garde donc pas quand le rôle change.
  if (draft.role !== 'preparation' || draft.purpose.trim() === '') delete race.purpose
  else race.purpose = draft.purpose.trim()

  if (draft.role !== 'preparation' || draft.easyDaysBefore === '') delete race.easyDaysBefore
  else race.easyDaysBefore = Number(draft.easyDaysBefore)

  return race
}

/**
 * Ce que supprimer une course emporte avec elle, dit avant.
 *
 * Un plan actif peut viser la course : le supprimer serait pire que la garder, donc on ne le
 * supprime pas — mais on dit qu'il perd sa cible, et ce que ça lui coûte.
 */
export function raceDeletionEffect(race: Race, plans: TrainingPlan[]): string[] {
  const lines = [`La fiche « ${race.name} », son pacing, sa nutrition et sa checklist.`]

  const aiming = plans.filter((plan) => plan.raceId === race.id)
  const active = aiming.filter((plan) => plan.status === 'active')

  if (active.length > 0) {
    lines.push(
      'Ton plan en cours visait cette course : il reste en place, avec ses dates et ses séances, mais il n’aura plus de course à afficher.',
    )
  } else if (aiming.length > 0) {
    lines.push('Un plan archivé visait cette course : il garde ses semaines, sans nom de course.')
  }

  return lines
}
