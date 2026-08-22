import { describe, expect, it } from 'vitest'
import { demoAthleteProfile, demoPlan, demoRaces, demoWorkouts } from '../../domain/demoData'
import { CURRENT_SCHEMA_VERSION } from '../../domain/types'
import { validateBackupFile } from '../../storage/validation'
import { buildUntouchedLines, formatBlockingLine, formatFileSize } from './importReport'

/** Le plan de démonstration court du 4 mai au 30 août 2026 ; sa semaine 07 tombe mi-juin. */
const TODAY = '2026-06-16'

describe('formatBlockingLine · encart « Ce qui bloque » de l’artboard 19', () => {
  it('nomme le champ, l’attendu et le reçu', () => {
    expect(
      formatBlockingLine({
        path: 'profile.ftp.watts',
        expectedType: 'number (watts)',
        receivedValue: '248 W',
        message: '',
      }),
    ).toBe('champ « profile.ftp.watts » attendu en number (watts), reçu « 248 W »')
  })

  it('dit « rien » plutôt que de laisser un blanc quand la clé est absente', () => {
    expect(
      formatBlockingLine({
        path: 'workoutsDone[3].discipline',
        expectedType: 'une valeur parmi N|V|C|R',
        receivedValue: undefined,
        message: '',
      }),
    ).toBe('champ « workoutsDone[3].discipline » attendu en une valeur parmi N|V|C|R, reçu rien')
  })

  it('donne à la version du schéma la troisième ligne de l’artboard', () => {
    expect(
      formatBlockingLine({ path: 'schemaVersion', expectedType: 'version 1.5', receivedValue: 1.1, message: '' }),
    ).toBe(`version du fichier : 1.1 · version lue : ${CURRENT_SCHEMA_VERSION}`)
  })

  it('parle du fichier entier, sans champ à nommer, quand rien n’a pu être lu', () => {
    expect(
      formatBlockingLine({ path: '$', expectedType: 'objet JSON', receivedValue: 'Unexpected end of input', message: '' }),
    ).toBe('le fichier n’est pas un objet JSON · « Unexpected end of input »')
  })

  it('rend lisibles les vraies erreurs du validateur', () => {
    const result = validateBackupFile({ schemaVersion: 1.1, profile: 3, plans: [], workoutsDone: [], races: [], journal: [] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const lines = result.errors.map(formatBlockingLine)
    expect(lines).toContain(`version du fichier : 1.1 · version lue : ${CURRENT_SCHEMA_VERSION}`)
    expect(lines).toContain('champ « profile » attendu en objet profil, reçu 3')
  })
})

describe('formatFileSize', () => {
  it('chiffre en mégaoctets à la française', () => {
    expect(formatFileSize(1_468_006)).toBe('1,4 Mo')
  })

  it('reste en kilooctets sous le mégaoctet', () => {
    expect(formatFileSize(4_096)).toBe('4 ko')
  })
})

describe('buildUntouchedLines · « Ce qui n’a pas bougé »', () => {
  it('écrit les trois lignes de l’artboard à partir de la base', () => {
    expect(
      buildUntouchedLines({
        plans: [demoPlan],
        workouts: demoWorkouts,
        races: demoRaces,
        profile: demoAthleteProfile,
        today: TODAY,
      }),
    ).toEqual([
      'Ton plan en cours, semaine 07 sur 18',
      'Tes références : CSS 1:32, FTP 248 W, seuil 4:12',
      `Tes ${demoRaces.length} courses et leurs fiches`,
    ])
  })

  it('n’écrit que ce que la base porte — pas de ligne inventée', () => {
    expect(
      buildUntouchedLines({ plans: [], workouts: [], races: [], profile: undefined, today: TODAY }),
    ).toEqual([])
  })

  it('accorde la ligne des courses au singulier', () => {
    const lines = buildUntouchedLines({
      plans: [],
      workouts: [],
      races: [demoRaces[0]],
      profile: undefined,
      today: TODAY,
    })
    expect(lines).toEqual(['Ta course et sa fiche'])
  })

  it('omet les références jamais mesurées plutôt que d’écrire un tiret', () => {
    const bare = { ...demoAthleteProfile }
    delete bare.css
    delete bare.runThreshold
    const lines = buildUntouchedLines({
      plans: [],
      workouts: [],
      races: [],
      profile: bare,
      today: TODAY,
    })
    expect(lines).toEqual(['Tes références : FTP 248 W'])
  })
})
