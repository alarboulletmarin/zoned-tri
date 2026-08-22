import { describe, expect, it } from 'vitest'
import { demoPlan } from './demoData'
import {
  PLAN_PHASE_LABELS,
  buildPlanMacroView,
  computePhaseRows,
  computePlanShares,
  computeWeekVolumeBars,
  weeksElapsed,
} from './planMacro'
import type { PlanWeek, TrainingPlan } from './types'

/** Lundi de la semaine 07 du plan de démonstration (15 → 21 juin 2026). */
const TODAY = '2026-06-15'

function week(weekNumber: number, totalVolumeMin: number, phase: PlanWeek['phase'] = 'Build'): PlanWeek {
  return {
    weekNumber,
    phase,
    totalVolumeMin,
    volumeByDiscipline: {},
    days: [],
    easyPercent: 80,
    hardPercent: 20,
  }
}

describe('weeksElapsed', () => {
  it('compte la semaine en cours, comme l’avancement de l’ouverture', () => {
    expect(weeksElapsed(demoPlan, TODAY)).toBe(7)
  })

  it('vaut zéro avant le départ et tout le plan après la course', () => {
    expect(weeksElapsed(demoPlan, '2026-01-01')).toBe(0)
    expect(weeksElapsed(demoPlan, '2026-12-01')).toBe(18)
  })
})

describe('computePlanShares', () => {
  it('additionne les volumes du plan entier, sans le renforcement', () => {
    const shares = computePlanShares(demoPlan)

    expect(shares.map((share) => share.discipline)).toEqual(['N', 'V', 'C'])
    expect(shares.map((share) => share.totalMin)).toEqual([100, 210, 150])
    // 460 min de triathlon : le renforcement (30 min) ne découpe pas la frise.
    expect(Math.round(shares[1].percent)).toBe(46)
  })

  it('ne rend aucune part quand le plan ne porte aucun volume', () => {
    expect(computePlanShares({ ...demoPlan, weeks: [] })).toEqual([])
  })
})

describe('computeWeekVolumeBars', () => {
  it('donne une colonne par semaine, relative à la semaine la plus chargée', () => {
    const bars = computeWeekVolumeBars([week(1, 300), week(2, 600, 'Base'), week(3, 0, 'Taper')])

    expect(bars.map((bar) => bar.heightPercent)).toEqual([50, 100, 0])
    expect(bars[1].colorVar).toBe('var(--color-zone-1)')
    expect(bars[2].colorVar).toBe('var(--color-zone-3)')
  })

  it('n’efface aucune semaine : 18 semaines donnent 18 colonnes', () => {
    const weeks = Array.from({ length: 18 }, (_, index) => week(index + 1, 0))
    expect(computeWeekVolumeBars(weeks)).toHaveLength(18)
  })
})

describe('computePhaseRows', () => {
  it('écrit FAIT, le décompte de la phase en cours, et rien pour les phases à venir', () => {
    const rows = computePhaseRows(demoPlan, TODAY)

    expect(rows.map((row) => row.statusLabel)).toEqual(['FAIT', '3/8', undefined, undefined])
    expect(rows.map((row) => row.isActive)).toEqual([false, true, false, false])
    expect(rows[1].label).toBe(`${PLAN_PHASE_LABELS.Build} · 8 semaines`)
  })

  it('pose l’appel de note sur l’affûtage, et sur lui seul', () => {
    expect(computePhaseRows(demoPlan, TODAY).map((row) => row.hasEvidence)).toEqual([false, false, false, true])
  })
})

describe('buildPlanMacroView', () => {
  const race = { name: '70.3 Vichy', date: '2026-08-30' }

  it('titre l’objectif et date le plan', () => {
    const view = buildPlanMacroView({ plan: demoPlan, race, today: TODAY })

    expect(view.goalTitle).toBe('70.3 Vichy')
    expect(view.goalMeta).toBe('30 août · 18 semaines · J-76')
    expect(view.weeksLabel).toBe('18 semaines')
    expect(view.weeksDoneLabel).toBe('7/18')
  })

  it('retombe sur le format du plan et n’écrit ni date ni décompte sans course', () => {
    const view = buildPlanMacroView({ plan: demoPlan, today: TODAY })

    expect(view.goalTitle).toBe('70.3')
    expect(view.goalMeta).toBe('18 semaines')
  })

  it('n’écrit pas de décompte négatif une fois la course passée', () => {
    expect(buildPlanMacroView({ plan: demoPlan, race, today: '2026-09-15' }).goalMeta).toBe('30 août · 18 semaines')
  })

  it('compte les séances prévues et arrondit les heures du plan', () => {
    const plan: TrainingPlan = {
      ...demoPlan,
      weeks: [
        { ...week(1, 480), days: [{ date: '2026-05-04', workoutIds: ['a', 'b'] }] },
        { ...week(2, 540), days: [{ date: '2026-05-11', workoutIds: ['c'] }] },
      ],
    }

    const view = buildPlanMacroView({ plan, today: TODAY })
    expect(view.sessionCount).toBe(3)
    expect(view.hoursLabel).toBe('17 h')
  })
})
