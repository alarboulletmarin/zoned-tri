import { describe, expect, it } from 'vitest'
import { demoPlan } from './demoData'
import type { AthleteProfile, TrainingPlan } from './types'
import { applyDraft, diffProfiles, draftFromProfile, planImpact, validateDraft } from './referenceEdit'

const profile: AthleteProfile = {
  id: 'athlete',
  weightKg: 72,
  sweatRateLPerH: 1.2,
  maxHeartRateBpm: 186,
  css: { paceMinPer100m: '1:32', measuredAt: '2026-08-03' },
  language: 'fr',
  theme: 'system',
}

describe('validateDraft', () => {
  it('nomme le champ coupable plutôt que de refuser en bloc', () => {
    const draft = { ...draftFromProfile(profile, '2026-08-22'), css: '92', ftp: 'beaucoup' }
    const errors = validateDraft(draft)
    expect(errors.css).toMatch(/m:ss/)
    expect(errors.ftp).toMatch(/watts/)
    expect(errors.runThreshold).toBeUndefined()
  })

  it('accepte un champ vide : c’est « jamais mesurée », pas une erreur', () => {
    const draft = { ...draftFromProfile(profile, '2026-08-22'), css: '', ftp: '' }
    expect(validateDraft(draft)).toEqual({})
  })

  it('refuse une valeur nulle ou négative, qui voudrait dire zéro et pas « absente »', () => {
    const draft = { ...draftFromProfile(profile, '2026-08-22'), weightKg: '0' }
    expect(validateDraft(draft).weightKg).toBeDefined()
  })
})

describe('applyDraft', () => {
  it('efface la référence quand le champ est vidé, au lieu de la mettre à zéro', () => {
    const next = applyDraft({ ...draftFromProfile(profile, '2026-08-22'), css: '' }, profile)
    expect(next.css).toBeUndefined()
  })

  it('date la référence écrite avec la date de mesure saisie', () => {
    const next = applyDraft(
      { ...draftFromProfile(profile, '2026-08-22'), ftp: '248', measuredAt: '2026-08-20' },
      profile,
    )
    expect(next.ftp).toEqual({ watts: 248, measuredAt: '2026-08-20' })
  })

  it('sait partir d’un appareil sans profil', () => {
    const next = applyDraft({ ...draftFromProfile(undefined, '2026-08-22'), ftp: '210' }, undefined)
    expect(next.ftp?.watts).toBe(210)
    expect(next.weightKg).toBe(0)
  })
})

describe('diffProfiles', () => {
  it('ne liste que ce qui change', () => {
    const next = applyDraft({ ...draftFromProfile(profile, '2026-08-22'), ftp: '248' }, profile)
    expect(diffProfiles(profile, next).map((change) => change.key)).toEqual(['ftp'])
  })

  it('dit « jamais mesurée » du côté qui n’existait pas', () => {
    const next = applyDraft({ ...draftFromProfile(profile, '2026-08-22'), ftp: '248' }, profile)
    expect(diffProfiles(profile, next)[0]).toMatchObject({ before: null, after: '248' })
  })
})

/**
 * Le cœur de la reprise : le bouton était gris au motif qu'« écrire une référence change les
 * allures de toutes les séances à venir ». C'est faux — un plan porte son propre instantané.
 */
describe('planImpact', () => {
  const planWithFtp: TrainingPlan = {
    ...demoPlan,
    referencesSnapshot: { ...demoPlan.referencesSnapshot, ftpWatts: 240 },
  }

  it('dit que le plan en cours ne bouge pas quand il portait déjà la référence', () => {
    const next = applyDraft({ ...draftFromProfile(profile, '2026-08-22'), ftp: '248' }, profile)
    const message = planImpact(diffProfiles(profile, next), planWithFtp)
    expect(message).toMatch(/ne bouge pas/)
    expect(message).toMatch(/allures prises à sa génération/)
  })

  it('avertit quand le plan n’avait PAS la référence : là, il l’adopte', () => {
    const withoutFtp: TrainingPlan = {
      ...demoPlan,
      referencesSnapshot: { ...demoPlan.referencesSnapshot, ftpWatts: undefined },
    }
    const next = applyDraft({ ...draftFromProfile(profile, '2026-08-22'), ftp: '248' }, profile)
    expect(planImpact(diffProfiles(profile, next), withoutFtp)).toMatch(/n’avait pas de ftp vélo/)
  })

  it('sans plan actif, annonce que la référence servira au prochain', () => {
    expect(planImpact([], undefined)).toMatch(/prochain plan généré/)
  })

  it('ne parle pas d’allures quand seules les mesures du corps changent', () => {
    const next = applyDraft({ ...draftFromProfile(profile, '2026-08-22'), weightKg: '70' }, profile)
    expect(planImpact(diffProfiles(profile, next), planWithFtp)).toMatch(/ne servent qu’aux calculateurs/)
  })
})
