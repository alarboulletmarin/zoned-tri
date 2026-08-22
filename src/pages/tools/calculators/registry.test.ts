import { describe, expect, it } from 'vitest'
import { demoAthleteProfile } from '../../../domain/demoData'
import {
  CALCULATORS,
  CALCULATOR_COUNT,
  calculatorCounter,
  findCalculator,
  formatClock,
  initialValues,
} from './registry'

describe('le registre', () => {
  it('compte exactement douze calculateurs', () => {
    expect(CALCULATOR_COUNT).toBe(12)
  })

  it('donne à chacun un identifiant et un index uniques, de 01 à 12', () => {
    expect(new Set(CALCULATORS.map((c) => c.id)).size).toBe(12)
    expect(CALCULATORS.map((c) => c.index).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
  })

  it('garde les index que le canevas et la spécification ont fixés', () => {
    const indexOf = (id: string) => findCalculator(id)?.index
    expect(indexOf('zones-de-puissance')).toBe(3)
    expect(indexOf('bassin-eau-libre')).toBe(4)
    expect(indexOf('test-20-min-ftp')).toBe(7)
    expect(indexOf('test-30-min-course')).toBe(8)
    expect(indexOf('css-400-200')).toBe(9)
    expect(indexOf('zones-allure-course')).toBe(11)
    expect(indexOf('zones-frequence-cardiaque')).toBe(12)
  })

  it('écrit le compteur de l’artboard 13', () => {
    expect(calculatorCounter(findCalculator('bassin-eau-libre')!)).toBe('04 / 12')
  })

  it('donne un résultat à chaque calculateur depuis le profil de démonstration', () => {
    // Le pacing est la seule exception attendue : la vitesse seuil vélo n'existe pas au modèle.
    const failures = CALCULATORS.filter(
      (definition) => !definition.run(initialValues(definition, demoAthleteProfile), demoAthleteProfile).ok,
    ).map((definition) => definition.id)
    expect(failures).toEqual(['pacing-course'])
  })

  it('accompagne chaque résultat de la source du calculateur du domaine', () => {
    for (const definition of CALCULATORS) {
      const outcome = definition.run(initialValues(definition, demoAthleteProfile), demoAthleteProfile)
      if (!outcome.ok) continue
      expect(outcome.source.length).toBeGreaterThan(10)
    }
  })
})

describe('formatClock', () => {
  it('écrit m:ss sous l’heure et h:mm:ss au-dessus', () => {
    expect(formatClock(1810)).toBe('30:10')
    expect(formatClock(1920)).toBe('32:00')
    expect(formatClock(25710)).toBe('7:08:30')
  })
})

describe('04/12 · bassin → eau libre (artboard 13)', () => {
  const definition = findCalculator('bassin-eau-libre')!

  it('part de l’allure en bassin du profil et des options de l’artboard', () => {
    expect(initialValues(definition, demoAthleteProfile)).toEqual({
      poolPace: '1:32',
      poolLength: '25',
      wetsuit: 'oui',
      sighting: 'elevee',
    })
  })

  it('rend une estimation centrale, une fourchette et le niveau FAIBLE du canevas', () => {
    const outcome = definition.run(initialValues(definition, demoAthleteProfile), demoAthleteProfile)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.proofLevel).toBe('weak')
    expect(outcome.headlineUnit).toBe('/100 m')
    expect(outcome.range).toBeDefined()
    expect(outcome.range!.caption).toBe('fourchette réelle')
    expect(outcome.range!.lowPercent).toBeLessThan(outcome.range!.highPercent)
  })

  it('refuse de calculer sans allure lisible plutôt que d’en inventer une', () => {
    const outcome = definition.run({ poolPace: '', poolLength: '25', wetsuit: 'oui', sighting: 'elevee' }, undefined)
    expect(outcome.ok).toBe(false)
  })

  it('garde le paragraphe et la note de bas de fiche de l’artboard', () => {
    expect(definition.worth).toContain('trois effets mal quantifiés')
    expect(definition.footnote?.mark).toBe('8.')
  })
})

describe('09/12 · CSS et 07/12 · FTP', () => {
  it('calcule le CSS depuis le couple 400/200 de l’artboard S8', () => {
    const definition = findCalculator('css-400-200')!
    const outcome = definition.run(initialValues(definition, demoAthleteProfile), demoAthleteProfile)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.proofLevel).toBe('moderate')
    expect(outcome.headline).toBe('1:36')
  })

  it('reconstruit la puissance du test de 20 min depuis la FTP enregistrée, et la retrouve', () => {
    const definition = findCalculator('test-20-min-ftp')!
    const values = initialValues(definition, demoAthleteProfile)
    expect(values['power20']).toBe('261')
    const outcome = definition.run(values, demoAthleteProfile)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.headline).toBe('248')
    expect(outcome.secondary).toBe('3,4 W/kg')
    expect(outcome.proofLevel).toBe('weak')
  })
})

describe('12/12 · zones cardiaques', () => {
  const definition = findCalculator('zones-frequence-cardiaque')!

  it('rend six bornes depuis la FC max mesurée', () => {
    const outcome = definition.run({ maxHr: '186' }, demoAthleteProfile)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.rows).toHaveLength(6)
    expect(outcome.rowsHead).toEqual(['Zone', 'Fréquence'])
  })

  it('ne devine aucune FC max quand elle manque', () => {
    const outcome = definition.run({ maxHr: '' }, undefined)
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.reason).toContain('jamais estimée d’après l’âge')
  })
})

describe('les définitions ne portent pas de badge de preuve', () => {
  it('sort « definition » pour les conversions et « product_rule » pour le pacing', () => {
    const converter = findCalculator('convertisseur-allure-natation')!
    const outcome = converter.run(initialValues(converter, demoAthleteProfile), demoAthleteProfile)
    expect(outcome.ok && outcome.proofLevel).toBe('definition')

    const load = findCalculator('intensite-et-charge')!
    const charge = load.run(initialValues(load, demoAthleteProfile), demoAthleteProfile)
    expect(charge.ok && charge.proofLevel).toBe('definition')
  })
})
