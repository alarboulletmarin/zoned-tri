import {
  CURRENT_SCHEMA_VERSION,
  type BackupFile,
  type Zone,
} from '../domain/types'

export interface ValidationError {
  path: string
  expectedType: string
  receivedValue: unknown
  message: string
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: ValidationError[] }

const ZONE_VALUES: readonly Zone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']
const DISCIPLINE_VALUES = ['N', 'V', 'C', 'R'] as const
const PLAN_FORMAT_VALUES = ['Sprint', 'Olympique', '70.3', 'Ironman'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fieldPath(parentPath: string, key: string): string {
  return parentPath ? `${parentPath}.${key}` : key
}

function addError(
  errors: ValidationError[],
  path: string,
  expectedType: string,
  receivedValue: unknown,
): void {
  errors.push({
    path,
    expectedType,
    receivedValue,
    message: `ligne inconnue · champ "${path}" attendu en ${expectedType}, reçu ${JSON.stringify(receivedValue)}`,
  })
}

function expectString(
  obj: Record<string, unknown>,
  key: string,
  parentPath: string,
  expectedType: string,
  errors: ValidationError[],
): void {
  const value = obj[key]
  if (typeof value !== 'string' || value.length === 0) {
    addError(errors, fieldPath(parentPath, key), expectedType, value)
  }
}

function expectNumber(
  obj: Record<string, unknown>,
  key: string,
  parentPath: string,
  expectedType: string,
  errors: ValidationError[],
): void {
  const value = obj[key]
  if (typeof value !== 'number' || Number.isNaN(value)) {
    addError(errors, fieldPath(parentPath, key), expectedType, value)
  }
}

function expectBoolean(
  obj: Record<string, unknown>,
  key: string,
  parentPath: string,
  expectedType: string,
  errors: ValidationError[],
): void {
  const value = obj[key]
  if (typeof value !== 'boolean') {
    addError(errors, fieldPath(parentPath, key), expectedType, value)
  }
}

function expectEnum<T extends string>(
  obj: Record<string, unknown>,
  key: string,
  parentPath: string,
  allowed: readonly T[],
  errors: ValidationError[],
): void {
  const value = obj[key]
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    addError(errors, fieldPath(parentPath, key), `une valeur parmi ${allowed.join('|')}`, value)
  }
}

function expectRecord(
  obj: Record<string, unknown>,
  key: string,
  parentPath: string,
  expectedType: string,
  errors: ValidationError[],
): Record<string, unknown> | undefined {
  const value = obj[key]
  if (!isRecord(value)) {
    addError(errors, fieldPath(parentPath, key), expectedType, value)
    return undefined
  }
  return value
}

function expectArray(
  obj: Record<string, unknown>,
  key: string,
  parentPath: string,
  expectedType: string,
  errors: ValidationError[],
): unknown[] | undefined {
  const value = obj[key]
  if (!Array.isArray(value)) {
    addError(errors, fieldPath(parentPath, key), expectedType, value)
    return undefined
  }
  return value
}

function validateProfile(obj: Record<string, unknown>, path: string, errors: ValidationError[]): void {
  expectString(obj, 'id', path, 'string', errors)
  expectNumber(obj, 'weightKg', path, 'number (kg)', errors)
  expectNumber(obj, 'sweatRateLPerH', path, 'number (L/h)', errors)
  expectNumber(obj, 'maxHeartRateBpm', path, 'number (bpm)', errors)
  expectEnum(obj, 'language', path, ['fr', 'en'] as const, errors)
  expectEnum(obj, 'theme', path, ['light', 'dark', 'system'] as const, errors)

  if (obj.css !== undefined) {
    const css = expectRecord(obj, 'css', path, 'objet CSS', errors)
    if (css) {
      const cssPath = fieldPath(path, 'css')
      expectString(css, 'paceMinPer100m', cssPath, 'string (allure /100m)', errors)
      expectString(css, 'measuredAt', cssPath, 'string (date ISO)', errors)
    }
  }

  if (obj.ftp !== undefined) {
    const ftp = expectRecord(obj, 'ftp', path, 'objet FTP', errors)
    if (ftp) {
      const ftpPath = fieldPath(path, 'ftp')
      expectNumber(ftp, 'watts', ftpPath, 'number (watts)', errors)
      expectString(ftp, 'measuredAt', ftpPath, 'string (date ISO)', errors)
    }
  }

  if (obj.runThreshold !== undefined) {
    const runThreshold = expectRecord(obj, 'runThreshold', path, 'objet seuil course', errors)
    if (runThreshold) {
      const runThresholdPath = fieldPath(path, 'runThreshold')
      expectString(runThreshold, 'paceMinPerKm', runThresholdPath, 'string (allure /km)', errors)
      expectString(runThreshold, 'measuredAt', runThresholdPath, 'string (date ISO)', errors)
    }
  }
}

function validatePlan(obj: Record<string, unknown>, path: string, errors: ValidationError[]): void {
  expectString(obj, 'id', path, 'string', errors)
  expectEnum(obj, 'format', path, PLAN_FORMAT_VALUES, errors)
  expectString(obj, 'startDate', path, 'string (date ISO)', errors)
  expectString(obj, 'endDate', path, 'string (date ISO)', errors)
  expectNumber(obj, 'weeksCount', path, 'number', errors)
  expectEnum(
    obj,
    'status',
    path,
    ['active', 'archived_completed', 'archived_abandoned'] as const,
    errors,
  )

  const settings = expectRecord(obj, 'settings', path, 'objet reglages', errors)
  if (settings) {
    const settingsPath = fieldPath(path, 'settings')
    expectNumber(settings, 'weeklyVolumeTargetMin', settingsPath, 'number (min)', errors)
    const availableDays = settings.availableDays
    if (
      !Array.isArray(availableDays) ||
      availableDays.length !== 7 ||
      !availableDays.every((day) => typeof day === 'boolean')
    ) {
      addError(errors, fieldPath(settingsPath, 'availableDays'), 'tableau de 7 booleens', availableDays)
    }
  }

  const constraints = expectRecord(obj, 'constraints', path, 'objet contraintes', errors)
  if (constraints) {
    const constraintsPath = fieldPath(path, 'constraints')
    expectArray(constraints, 'blockedWeeks', constraintsPath, 'tableau', errors)
  }

  expectRecord(obj, 'referencesSnapshot', path, 'objet references', errors)

  const phases = expectArray(obj, 'phases', path, 'tableau de phases', errors)
  phases?.forEach((phase, index) => {
    const phasePath = `${fieldPath(path, 'phases')}[${index}]`
    if (!isRecord(phase)) {
      addError(errors, phasePath, 'objet phase', phase)
      return
    }
    expectEnum(phase, 'name', phasePath, ['Base', 'Build', 'Specific', 'Taper'] as const, errors)
    expectNumber(phase, 'weeksCount', phasePath, 'number', errors)
    expectEnum(phase, 'status', phasePath, ['upcoming', 'active', 'done'] as const, errors)
  })

  const intensity = expectRecord(obj, 'intensityDistribution', path, 'objet intensite', errors)
  if (intensity) {
    const intensityPath = fieldPath(path, 'intensityDistribution')
    expectNumber(intensity, 'z1z2Percent', intensityPath, 'number (%)', errors)
    expectNumber(intensity, 'z3Percent', intensityPath, 'number (%)', errors)
    expectNumber(intensity, 'z4PlusPercent', intensityPath, 'number (%)', errors)
  }

  expectArray(obj, 'weeks', path, 'tableau de semaines', errors)
}

function validateWorkout(obj: Record<string, unknown>, path: string, errors: ValidationError[]): void {
  expectString(obj, 'id', path, 'string', errors)
  expectString(obj, 'title', path, 'string', errors)
  expectEnum(obj, 'discipline', path, DISCIPLINE_VALUES, errors)

  const zone = obj.zone
  if (zone !== null && !ZONE_VALUES.includes(zone as Zone)) {
    addError(errors, fieldPath(path, 'zone'), 'Z1-Z6 ou null', zone)
  }

  expectNumber(obj, 'durationMin', path, 'number (min)', errors)
  expectEnum(obj, 'status', path, ['planned', 'completed', 'cancelled'] as const, errors)

  const blocksPath = fieldPath(path, 'blocks')
  const blocks = expectArray(obj, 'blocks', path, 'tableau de blocs', errors)
  blocks?.forEach((block, index) => {
    validateWorkoutBlock(block, `${blocksPath}[${index}]`, errors)
  })
}

function validateWorkoutSegment(obj: Record<string, unknown>, path: string, errors: ValidationError[]): void {
  expectEnum(obj, 'phase', path, ['warmup', 'main', 'cooldown'] as const, errors)
  expectEnum(obj, 'effort', path, ['effort', 'recovery', 'rest'] as const, errors)
  expectNumber(obj, 'durationMin', path, 'number (min)', errors)
  if (obj.zone !== undefined && !ZONE_VALUES.includes(obj.zone as Zone)) {
    addError(errors, fieldPath(path, 'zone'), 'Z1-Z6', obj.zone)
  }
}

function validateWorkoutBlock(block: unknown, path: string, errors: ValidationError[]): void {
  if (!isRecord(block)) {
    addError(errors, path, 'objet bloc (segment ou repeat)', block)
    return
  }

  if (block.kind === 'repeat') {
    expectNumber(block, 'count', path, 'number', errors)
    const steps = expectArray(block, 'steps', path, 'tableau de segments', errors)
    steps?.forEach((step, index) => {
      const stepPath = `${fieldPath(path, 'steps')}[${index}]`
      if (!isRecord(step)) {
        addError(errors, stepPath, 'objet segment', step)
        return
      }
      validateWorkoutSegment(step, stepPath, errors)
    })
    return
  }

  if (block.kind === 'segment') {
    validateWorkoutSegment(block, path, errors)
    return
  }

  addError(errors, fieldPath(path, 'kind'), "'segment' ou 'repeat'", block.kind)
}

function validateRace(obj: Record<string, unknown>, path: string, errors: ValidationError[]): void {
  expectString(obj, 'id', path, 'string', errors)
  expectString(obj, 'name', path, 'string', errors)
  expectString(obj, 'date', path, 'string (date ISO)', errors)
  expectEnum(obj, 'format', path, PLAN_FORMAT_VALUES, errors)
  expectEnum(obj, 'role', path, ['primary_goal', 'preparation'] as const, errors)

  const distances = expectRecord(obj, 'distances', path, 'objet distances', errors)
  if (distances) {
    const distancesPath = fieldPath(path, 'distances')
    expectNumber(distances, 'swimM', distancesPath, 'number (m)', errors)
    expectNumber(distances, 'bikeKm', distancesPath, 'number (km)', errors)
    expectNumber(distances, 'runKm', distancesPath, 'number (km)', errors)
  }
}

function validateJournalEntry(obj: Record<string, unknown>, path: string, errors: ValidationError[]): void {
  expectString(obj, 'id', path, 'string', errors)
  expectString(obj, 'planId', path, 'string', errors)
  expectString(obj, 'at', path, 'string (date ISO)', errors)
  expectEnum(obj, 'author', path, ['user', 'engine'] as const, errors)
  expectString(obj, 'description', path, 'string', errors)
  expectBoolean(obj, 'undone', path, 'boolean', errors)
}

export function validateBackupFile(value: unknown): ValidationResult<BackupFile> {
  const errors: ValidationError[] = []

  if (!isRecord(value)) {
    addError(errors, '$', 'objet JSON', value)
    return { ok: false, errors }
  }

  if (typeof value.schemaVersion !== 'number') {
    addError(errors, 'schemaVersion', 'number', value.schemaVersion)
  } else if (value.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    addError(errors, 'schemaVersion', `version ${CURRENT_SCHEMA_VERSION}`, value.schemaVersion)
  }

  const profile = expectRecord(value, 'profile', '', 'objet profil', errors)
  if (profile) validateProfile(profile, 'profile', errors)

  const plans = expectArray(value, 'plans', '', 'tableau de plans', errors)
  plans?.forEach((plan, index) => {
    const path = `plans[${index}]`
    if (isRecord(plan)) validatePlan(plan, path, errors)
    else addError(errors, path, 'objet plan', plan)
  })

  const workoutsDone = expectArray(value, 'workoutsDone', '', 'tableau de seances', errors)
  workoutsDone?.forEach((workout, index) => {
    const path = `workoutsDone[${index}]`
    if (isRecord(workout)) validateWorkout(workout, path, errors)
    else addError(errors, path, 'objet seance', workout)
  })

  const races = expectArray(value, 'races', '', 'tableau de courses', errors)
  races?.forEach((race, index) => {
    const path = `races[${index}]`
    if (isRecord(race)) validateRace(race, path, errors)
    else addError(errors, path, 'objet course', race)
  })

  const journal = expectArray(value, 'journal', '', 'tableau de journal', errors)
  journal?.forEach((entry, index) => {
    const path = `journal[${index}]`
    if (isRecord(entry)) validateJournalEntry(entry, path, errors)
    else addError(errors, path, 'objet entree de journal', entry)
  })

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, data: value as unknown as BackupFile }
}
