import type { Discipline } from './types'

export type WorkoutDetailTemplate = 'swim' | 'bike' | 'run' | 'generic'

const TEMPLATE_BY_DISCIPLINE: Record<Discipline, WorkoutDetailTemplate> = {
  N: 'swim',
  V: 'bike',
  C: 'run',
  R: 'generic',
}

export function selectDetailTemplate(discipline: Discipline): WorkoutDetailTemplate {
  return TEMPLATE_BY_DISCIPLINE[discipline]
}
