import { describe, expect, it } from 'vitest'
import { buildPlanSheet } from './planSheet'
import {
  demoBikeWorkout,
  demoBrickRunWorkout,
  demoPlan,
  demoRace,
  demoRunWorkout,
  demoSwimWorkout,
  demoWorkouts,
} from '../demoData'
import type { PlanWeek, TrainingPlan, Workout } from '../types'

/** La semaine 07 du plan de démonstration court du lundi 15 au dimanche 21 juin 2026. */
const MONDAY = '2026-06-15'
const SATURDAY = '2026-06-20'
const TODAY = '2026-06-16'

function sheetOf(plan: TrainingPlan, today = TODAY) {
  return buildPlanSheet({ plan, catalogue: demoWorkouts, today, race: demoRace })
}

describe('buildPlanSheet', () => {
  const sheet = sheetOf(demoPlan)

  it('titre le plan par sa course', () => {
    expect(sheet.title).toBe('70.3 Vichy · plan')
  })

  it('résume le plan en quatre quantités, comme l’artboard', () => {
    expect(sheet.subtitle).toMatch(/^18 semaines · \d+ séances · .+ · .+ \/ sem$/)
  })

  it('donne une ligne par semaine — jamais un repli de plusieurs semaines', () => {
    expect(sheet.rows).toHaveLength(demoPlan.weeks.length)
  })

  it('nomme la semaine par son numéro et sa phase', () => {
    expect(sheet.rows[0].label).toBe('07 constr.')
  })

  it('rend toujours sept colonnes, lundi → dimanche', () => {
    expect(sheet.rows[0].cells).toHaveLength(7)
  })

  it('écrit le tiret d’un jour sans séance', () => {
    // Vendredi 19 juin : aucune séance au plan de démonstration.
    const friday = sheet.rows[0].cells[4]
    expect(friday.text).toBe('—')
    expect(friday.tone).toBe('rest')
  })

  it('marque le jour courant à l’encre', () => {
    const tuesday = sheet.rows[0].cells[1]
    expect(tuesday.tone).toBe('ink')
    expect(tuesday.text).toBe('V')
  })

  it('hachure la journée qui porte l’enchaînement', () => {
    const saturday = sheet.rows[0].cells[5]
    expect(saturday.text).toBe('V+C')
    expect(saturday.tone).toBe('key')
  })

  /** Un enchaînement est une séance CLÉ, même seul dans sa journée (artboard 22 : hachure). */
  it('hachure un enchaînement même seul dans sa journée', () => {
    const brickWeek: PlanWeek = {
      ...demoPlan.weeks[0],
      days: demoPlan.weeks[0].days.map((day) =>
        day.date === MONDAY ? { ...day, workoutIds: [demoBrickRunWorkout.id] } : day,
      ),
    }
    expect(sheetOf({ ...demoPlan, weeks: [brickWeek] }).rows[0].cells[0].tone).toBe('key')
  })

  /**
   * Une seule case grise par semaine : LA sortie longue et souple. L'artboard 22 n'en grise
   * jamais deux — un plan polarisé compte 78 % de facile, tout griser noircirait la page.
   */
  it('ne grise que la plus longue journée souple de la semaine', () => {
    const longEasy: Workout = { ...demoRunWorkout, id: 'long-easy', zone: 'Z2', durationMin: 180 }
    const shortEasy: Workout = { ...demoRunWorkout, id: 'short-easy', zone: 'Z2', durationMin: 40 }
    const week: PlanWeek = {
      ...demoPlan.weeks[0],
      days: demoPlan.weeks[0].days.map((day, index) =>
        index === 0
          ? { ...day, workoutIds: [shortEasy.id] }
          : index === 2
            ? { ...day, workoutIds: [longEasy.id] }
            : day,
      ),
    }
    const rows = buildPlanSheet({
      plan: { ...demoPlan, weeks: [week] },
      catalogue: [...demoWorkouts, longEasy, shortEasy],
      today: '2027-01-01',
      race: demoRace,
    }).rows
    expect(rows[0].cells.filter((cell) => cell.tone === 'easy')).toHaveLength(1)
    expect(rows[0].cells[2].tone).toBe('easy')
    expect(rows[0].cells[0].tone).toBe('session')
  })

  it('ne grise rien quand aucune journée n’est souple', () => {
    const hard = sheetOf(demoPlan, '2027-01-01')
    expect(hard.rows[0].cells.some((cell) => cell.tone === 'easy')).toBe(false)
  })

  it('cumule le volume de la semaine dans sa dernière colonne', () => {
    expect(sheet.rows[0].volumeLabel).toMatch(/^\d+ h( \d{2})?$/)
  })

  it('met la semaine courante en gras', () => {
    expect(sheet.rows[0].emphasis).toBe(true)
  })

  it('ne met rien en gras quand ni la course ni le jour courant n’y tombent', () => {
    expect(sheetOf(demoPlan, '2027-01-01').rows[0].emphasis).toBe(false)
  })

  it('pose la course à l’encre, sous son format, quel que soit le contenu du jour', () => {
    const raceOnSaturday = sheetOf({ ...demoPlan }, TODAY)
    expect(raceOnSaturday.rows[0].cells[5].text).toBe('V+C')

    const withRaceThatWeek = buildPlanSheet({
      plan: demoPlan,
      catalogue: demoWorkouts,
      today: TODAY,
      race: { ...demoRace, date: SATURDAY },
    })
    expect(withRaceThatWeek.rows[0].cells[5]).toMatchObject({ text: '70.3', tone: 'ink' })
    expect(withRaceThatWeek.rows[0].label).toBe('07 course')
  })

  it('bascule une semaine bloquée sur son aplat et le dit dans son intitulé', () => {
    const blocked = sheetOf({
      ...demoPlan,
      weeks: [{ ...demoPlan.weeks[0], blockedReason: 'Déplacement pro' }],
    })
    expect(blocked.rows[0].label).toBe('07 bloqué')
    expect(blocked.rows[0].reduced).toBe(true)
    expect(blocked.footnotes[0]).toBe('Sem. 07 réduite : Déplacement pro')
  })

  it('dit les semaines bloquées consécutives en fourchette', () => {
    const twoWeeks: TrainingPlan = {
      ...demoPlan,
      constraints: {
        ...demoPlan.constraints,
        blockedWeeks: [
          { weekNumber: 4, reason: 'Déplacement pro' },
          { weekNumber: 5, reason: 'Déplacement pro' },
        ],
      },
      weeks: [
        { ...demoPlan.weeks[0], weekNumber: 4 },
        { ...demoPlan.weeks[0], weekNumber: 5 },
      ],
    }
    expect(sheetOf(twoWeeks).footnotes[0]).toBe('Sem. 04–05 réduites : Déplacement pro')
  })

  it('rappelle en pied ce que fait l’affûtage, quand la phase le décrit', () => {
    const taper = demoPlan.phases.find((phase) => phase.name === 'Taper')!
    expect(sheet.footnotes.at(-1)).toBe(`Affûtage : ${taper.description}`)
  })

  it('n’écrit aucun pied de page quand le plan n’a rien à signaler', () => {
    const plain: TrainingPlan = {
      ...demoPlan,
      constraints: { ...demoPlan.constraints, blockedWeeks: [] },
      phases: demoPlan.phases.map((phase) => {
        const copy = { ...phase }
        delete copy.description
        return copy
      }),
    }
    expect(sheetOf(plain).footnotes).toEqual([])
  })

  it('titre par le format quand aucune course n’est visée', () => {
    const orphan = buildPlanSheet({ plan: demoPlan, catalogue: demoWorkouts, today: TODAY })
    expect(orphan.title).toBe('70.3 · plan')
  })

  it('rend sept colonnes même si la semaine ne date pas les sept jours', () => {
    const short: PlanWeek = {
      ...demoPlan.weeks[0],
      days: [
        { date: MONDAY, workoutIds: [demoSwimWorkout.id] },
        { date: '2026-06-16', workoutIds: [demoBikeWorkout.id] },
        { date: '2026-06-17', workoutIds: [demoRunWorkout.id] },
      ],
    }
    const rows = sheetOf({ ...demoPlan, weeks: [short] }).rows
    expect(rows[0].cells).toHaveLength(7)
    expect(rows[0].cells.slice(3).every((cell) => cell.text === '—')).toBe(true)
  })
})
