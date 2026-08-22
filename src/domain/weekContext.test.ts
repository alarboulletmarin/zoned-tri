import { describe, expect, it } from 'vitest'
import { demoAthleteProfile, demoPlan, demoWorkouts } from './demoData'
import { buildWeekDays } from './planWeek'
import { buildWeekContext, computeWeekBars } from './weekContext'

// La semaine 07 du plan de démonstration court du lundi 15 au dimanche 21 juin 2026.
const WEDNESDAY = new Date('2026-06-17T10:00:00Z')
const TODAY = new Date('2026-08-21T10:00:00Z')

describe('buildWeekContext', () => {
  it('libelle la semaine avec son numéro et le total du plan (canevas S4 « SEMAINE 07 / 18 »)', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, WEDNESDAY)
    expect(context?.weekLabel).toBe('Semaine 07 / 18')
  })

  it('dresse sept colonnes, une par jour, initiales L M M J V S D', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, WEDNESDAY)
    expect(context?.bars.map((bar) => bar.dayInitial)).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D'])
  })

  it('colore chaque colonne par la discipline dominante du jour', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, WEDNESDAY)
    expect(context?.bars[0].colorVar).toBe('var(--color-discipline-n)')
    expect(context?.bars[1].colorVar).toBe('var(--color-discipline-v)')
    expect(context?.bars[2].colorVar).toBe('var(--color-discipline-c)')
  })

  it('laisse le jour vide en pointillé, pleine hauteur', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, WEDNESDAY)
    const friday = context!.bars[4]
    expect(friday.colorVar).toBeNull()
    expect(friday.heightPercent).toBe(100)
    expect(friday.loadMin).toBe(0)
  })

  it('nomme le jour libre sous l’histogramme', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, WEDNESDAY)
    expect(context?.freeDayNote).toBe('colonne en pointillé · vendredi libre, aucune séance prévue')
  })

  it('ne liste dans « reste cette semaine » que ce qui vient après aujourd’hui', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, WEDNESDAY)
    expect(context?.rest.map((entry) => entry.dayLabel)).toEqual(['Jeu', 'Sam', 'Sam', 'Dim'])
    expect(context?.rest[0].discipline).toBe('R')
  })

  it('garde la semaine entière quand aujourd’hui tombe hors du plan', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, TODAY)
    expect(context?.rest).toHaveLength(7)
  })

  it('ignore un identifiant de séance absent du catalogue plutôt que d’inventer une ligne', () => {
    const context = buildWeekContext(demoPlan, [], demoAthleteProfile, WEDNESDAY)
    expect(context?.rest).toEqual([])
    expect(context?.bars.every((bar) => bar.colorVar === null)).toBe(true)
  })

  it('dérive la prochaine référence à partir de la dernière mesure', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, TODAY)
    expect(context?.nextReference?.value).toBe('test CSS dans 12 j')
  })

  it('n’invente pas de référence quand le profil n’en a aucune', () => {
    const bareProfile = { ...demoAthleteProfile, css: undefined, ftp: undefined, runThreshold: undefined }
    const context = buildWeekContext(demoPlan, demoWorkouts, bareProfile, TODAY)
    expect(context?.nextReference).toBeNull()
  })

  it('renvoie null quand le plan n’a aucune semaine', () => {
    expect(buildWeekContext({ ...demoPlan, weeks: [] }, demoWorkouts, demoAthleteProfile, TODAY)).toBeNull()
  })
})

describe('computeWeekBars', () => {
  const days = buildWeekDays(demoPlan.weeks[0], demoWorkouts, '2026-06-17')

  it('échelonne les hauteurs sur le jour le plus chargé', () => {
    const bars = computeWeekBars(days)
    const peak = Math.max(...days.map((day) => day.totalMin))
    expect(days[5].totalMin).toBe(peak)
    expect(bars[5].heightPercent).toBe(100)
    expect(bars[0].heightPercent).toBe(Math.round((days[0].totalMin / peak) * 100))
  })

  it('laisse le jour libre sans couleur — c’est la colonne en pointillé du canevas', () => {
    const bars = computeWeekBars(days)
    expect(bars[4].colorVar).toBeNull()
    expect(bars[4].loadMin).toBe(0)
    expect(bars[4].heightPercent).toBe(100)
  })

  it('sert le même calcul que la colonne de contexte de S4', () => {
    const context = buildWeekContext(demoPlan, demoWorkouts, demoAthleteProfile, WEDNESDAY)
    expect(context?.bars).toEqual(computeWeekBars(days))
  })
})
