import { describe, expect, it } from 'vitest'
import { carbsForDuration } from './calculators/carbs'
import { hydrationForDuration } from './calculators/hydration'
import { demoPastRace, demoPreparationRaces, demoRace, demoRaces } from './demoData'
import {
  aidStationsLabel,
  bikeIfHeading,
  checklistGroups,
  checklistProgress,
  disciplineShares,
  fluidDetail,
  formatCumulative,
  formatEffortDuration,
  formatFullTime,
  formatKm,
  formatNumberFr,
  formatRaceDistances,
  formatSegmentTime,
  formatSwimDistance,
  nutritionPlan,
  pacingRows,
  pacingShares,
  preparationNote,
  preparednessLabel,
  raceCountdown,
  raceResultLabel,
  racesOverview,
  timelineGroups,
} from './raceView'
import type { Race } from './types'

/** Jour de référence de l'atelier d'aperçu : le seul pour lequel les compteurs du canevas tombent. */
const TODAY = '2026-06-14'

describe('formatage', () => {
  it('écrit les décimales à la française', () => {
    expect(formatNumberFr(21.1)).toBe('21,1')
    expect(formatNumberFr(19.5)).toBe('19,5')
    expect(formatNumberFr(0.78, 2)).toBe('0,78')
    expect(formatNumberFr(90)).toBe('90')
  })

  it('passe la natation en kilomètres au-delà de 1 000 m', () => {
    expect(formatSwimDistance(1900)).toBe('1,9 km')
    expect(formatSwimDistance(750)).toBe('750 m')
    expect(formatKm(21.1)).toBe('21,1 km')
  })

  it('n’écrit l’heure d’un segment que lorsqu’il en dure une', () => {
    expect(formatSegmentTime(2052)).toBe('34:12')
    expect(formatSegmentTime(210)).toBe('3:30')
    expect(formatSegmentTime(10500)).toBe('2:55:00')
    expect(formatSegmentTime(6578)).toBe('1:49:38')
  })

  it('tronque le cumul à la minute et le temps cible à la seconde', () => {
    expect(formatCumulative(12762)).toBe('3:32')
    expect(formatFullTime(19470)).toBe('5:24:30')
  })

  it('arrondit la durée d’effort à la minute', () => {
    expect(formatEffortDuration(17078)).toBe('4 h 45')
    expect(formatEffortDuration(7200)).toBe('2 h')
    expect(formatEffortDuration(1800)).toBe('30 min')
  })

  it('omet les parties absentes d’une distance', () => {
    expect(formatRaceDistances(demoRace)).toBe('1,9 km · 90 km · 21,1 km')
    // L'aquathlon n'a pas de vélo : sa distance ne se lit pas « 0 km ».
    expect(formatRaceDistances(demoPreparationRaces[1])).toBe('1 km · 5 km')
  })
})

describe('raceCountdown', () => {
  it('donne le J-77 des artboards 08, 27 et S7 au jour de référence', () => {
    expect(raceCountdown(demoRace, TODAY).label).toBe('J-77')
  })

  it('nomme le jour même et les jours d’après', () => {
    expect(raceCountdown(demoRace, '2026-08-30')).toEqual({ days: 0, label: 'JOUR J', past: false })
    expect(raceCountdown(demoRace, '2026-09-01').label).toBe('J+2')
    expect(raceCountdown(demoRace, '2026-09-01').past).toBe(true)
  })
})

describe('pacingRows', () => {
  it('déduit la durée de chaque segment de la différence des cumuls', () => {
    const rows = pacingRows(demoRace)
    expect(rows.map((row) => row.durationSec)).toEqual([2052, 210, 10500, 130, 6578])
  })

  it('reprend les segments de l’artboard 09, transitions nommées', () => {
    const rows = pacingRows(demoRace)
    expect(rows.map((row) => row.title)).toEqual([
      '1,9 km',
      'Transition 1',
      '90 km',
      'Transition 2',
      '21,1 km',
    ])
    expect(rows[1].discipline).toBeNull()
    expect(rows[2].discipline).toBe('V')
  })

  it('le temps cible enregistré est bien la somme de ses segments', () => {
    const rows = pacingRows(demoRace)
    const sum = rows.reduce((total, row) => total + row.durationSec, 0)
    expect(sum).toBe(demoRace.pacing?.targetTimeSec)
  })
})

describe('répartitions', () => {
  it('la frise à trois parts ignore les transitions et fait 100 %', () => {
    const shares = disciplineShares(demoRace)
    expect(shares.map((share) => share.key)).toEqual(['N', 'V', 'C'])
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBeCloseTo(100, 6)
  })

  it('la frise de pacing porte les cinq segments, transitions en gris de repos', () => {
    const shares = pacingShares(demoRace)
    expect(shares).toHaveLength(5)
    expect(shares[1].color).toBe('var(--color-discipline-r)')
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBeCloseTo(100, 6)
  })

  it('rend une frise vide plutôt qu’une frise inventée sans pacing', () => {
    const bare: Race = { ...demoRace, pacing: undefined }
    expect(disciplineShares(bare)).toEqual([])
    expect(pacingShares(bare)).toEqual([])
  })
})

describe('bikeIfHeading', () => {
  it('reprend l’IF cible du vélo dans son titre', () => {
    expect(bikeIfHeading(demoRace.pacing!)).toBe('Pourquoi 0,78 au vélo')
  })

  it('ne titre rien quand l’IF n’est pas renseigné', () => {
    expect(bikeIfHeading({ ...demoRace.pacing!, bikeTargetIf: undefined })).toBeNull()
  })
})

describe('nutritionPlan', () => {
  it('ne compte que le vélo et la course dans la durée ravitaillée', () => {
    const plan = nutritionPlan(demoRace)!
    expect(plan.effortSec).toBe(10500 + 6578)
    expect(plan.effortLabel).toBe('4 h 45')
  })

  it('délègue le total à carbsForDuration plutôt que de le recalculer', () => {
    const plan = nutritionPlan(demoRace)!
    const expected = carbsForDuration(demoRace.nutrition!.carbsGPerH, plan.effortSec / 3600)
    expect(plan.totalGrams).toBe(Math.round(expected.value))
    expect(plan.carbsProofLevel).toBe(expected.proofLevel)
    expect(plan.carbsSource).toBe(expected.source)
  })

  it('répartit les glucides au prorata du temps de chaque segment', () => {
    const plan = nutritionPlan(demoRace)!
    expect(plan.shares.map((share) => share.discipline)).toEqual(['V', 'C'])
    expect(plan.shares.reduce((sum, share) => sum + share.grams, 0)).toBeCloseTo(plan.totalGrams, 0)
    expect(plan.shares.reduce((sum, share) => sum + share.percent, 0)).toBeCloseTo(100, 6)
  })

  it('calcule le volume de boisson depuis le débit du plan — 2,8 L à l’artboard 10', () => {
    expect(nutritionPlan(demoRace)!.fluidLabel).toBe('2,8 L')
    expect(fluidDetail(demoRace)).toBe('600 ml/h · ravitos km 30, 60')
  })

  it('rend null quand la course ne porte pas de plan nutrition', () => {
    expect(nutritionPlan({ ...demoRace, nutrition: undefined })).toBeNull()
    expect(fluidDetail({ ...demoRace, nutrition: undefined })).toBeNull()
  })

  it('qualifie le sodium au même niveau que le calculateur d’hydratation', () => {
    expect(demoRace.nutrition?.sodiumEvidence?.level).toBe(hydrationForDuration(1, 1).proofLevel)
  })
})

describe('aidStationsLabel', () => {
  it('écrit les ravitaillements de l’artboard 08', () => {
    expect(aidStationsLabel(demoRace)).toBe('km 30, km 60')
  })

  it('rend un tiret plutôt qu’un zéro quand il n’y en a pas', () => {
    expect(aidStationsLabel({ ...demoRace, aidStationsKm: undefined })).toBe('—')
  })
})

describe('timelineGroups', () => {
  it('sépare la veille du jour de course, dans cet ordre', () => {
    const groups = timelineGroups(demoRace)
    expect(groups.map((group) => group.phase)).toEqual(['eve', 'race_day'])
    expect(groups[0].events).toHaveLength(3)
    expect(groups[1].events).toHaveLength(6)
    expect(groups[1].events.at(-1)?.isStart).toBe(true)
  })

  it('ne rend aucun groupe vide', () => {
    expect(timelineGroups({ ...demoRace, timeline: [] })).toEqual([])
  })
})

describe('checklist', () => {
  it('groupe les trois emplacements dans l’ordre du parc', () => {
    const groups = checklistGroups(demoRace.transitionChecklist!)
    expect(groups.map((group) => group.section)).toEqual(['T1', 'bike', 'T2'])
    expect(groups.map((group) => group.items.length)).toEqual([4, 4, 2])
  })

  it('compte ce qui est coché, et rien d’autre', () => {
    const progress = checklistProgress(demoRace.transitionChecklist!)
    expect(progress).toEqual({ done: 3, total: 10, percent: 30, label: '3 / 10' })
  })

  it('ne divise pas par zéro sur une liste vide', () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, percent: 0, label: '0 / 0' })
  })
})

describe('racesOverview', () => {
  it('range les quatre courses de l’artboard 27', () => {
    const overview = racesOverview(demoRaces, TODAY)
    expect(overview.goal?.id).toBe(demoRace.id)
    expect(overview.preparations.map((race) => race.id)).toEqual(demoPreparationRaces.map((r) => r.id))
    expect(overview.past.map((race) => race.id)).toEqual([demoPastRace.id])
    expect(overview.countLabel).toBe('4 · dont 1 passée')
    expect(overview.breakdownLabel).toBe('1 objectif · 2 prépa · 1 passée')
  })

  it('range une course dans les passées dès que sa date est derrière, quel que soit son rôle', () => {
    const overview = racesOverview(demoRaces, '2026-09-01')
    expect(overview.goal).toBeUndefined()
    expect(overview.preparations).toEqual([])
    expect(overview.past).toHaveLength(4)
  })

  it('ne compte pas de passée quand il n’y en a pas', () => {
    expect(racesOverview([demoRace], TODAY).countLabel).toBe('1')
  })
})

describe('libellés de liste', () => {
  it('dit l’écart à la cible d’une course courue', () => {
    expect(raceResultLabel(demoPastRace)).toBe('1:18:42 · 12 s de mieux que la cible')
  })

  it('ne dit rien quand aucun résultat n’est enregistré', () => {
    expect(raceResultLabel(demoRace)).toBeNull()
  })

  it('accorde les jours faciles d’une prépa', () => {
    expect(preparationNote(demoPreparationRaces[0])).toBe("test d'allure · 3 jours faciles avant")
    expect(preparationNote({ ...demoPreparationRaces[0], easyDaysBefore: 1 })).toBe(
      "test d'allure · 1 jour facile avant",
    )
    expect(preparationNote(demoPastRace)).toBeNull()
  })

  it('n’annonce prêt que ce qui est réellement enregistré', () => {
    expect(preparednessLabel(demoRace)).toBe('pacing, nutrition et jour J prêts')
    expect(preparednessLabel({ ...demoRace, nutrition: undefined, timeline: [] })).toBe('pacing prêt')
    expect(preparednessLabel(demoPastRace)).toBeNull()
  })
})
