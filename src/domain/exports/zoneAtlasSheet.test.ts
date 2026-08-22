import { describe, expect, it } from 'vitest'
import { buildZoneAtlasSheet, formatDayMonthYear } from './zoneAtlasSheet'
import { demoAthleteProfile, demoPlan } from '../demoData'
import type { AthleteProfile } from '../types'

const TODAY = '2026-08-21'

describe('buildZoneAtlasSheet', () => {
  const sheet = buildZoneAtlasSheet(demoAthleteProfile, demoPlan, TODAY)

  it('date la feuille de la référence mesurée la plus récente', () => {
    // CSS du 3 août, FTP du 20 juillet, seuil du 15 juin → la plus récente est le CSS.
    expect(sheet.subtitle).toBe('Zoned Tri · références du 3 août 2026')
  })

  it('écrit les trois encadrés de références comme l’artboard', () => {
    expect(sheet.references.map((reference) => reference.text)).toEqual([
      'CSS · 1:32 /100 m',
      'FTP · 248 W · 3,4 W/kg',
      'Seuil · 4:12 /km',
    ])
  })

  it('rend six lignes, une par zone', () => {
    expect(sheet.rows.map((row) => row.zone)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6'])
    expect(sheet.missing).toEqual([])
  })

  it('met en évidence la ligne du seuil, et elle seule', () => {
    expect(sheet.rows.filter((row) => row.emphasis).map((row) => row.zone)).toEqual(['Z4'])
  })

  it('note les allures avec les bornes ouvertes de l’artboard', () => {
    const [z1, z2, , , , z6] = sheet.rows
    expect(z1.swim).toMatch(/^\d:\d{2}\+$/)
    expect(z2.swim).toMatch(/^\d:\d{2}–\d:\d{2}$/)
    expect(z6.swim).toMatch(/^< \d:\d{2}$/)
    expect(z1.run).toMatch(/^\d:\d{2}\+$/)
    expect(z6.run).toMatch(/^< \d:\d{2}$/)
  })

  /**
   * Les bornes sont celles de `ftpPowerZones`, pas celles écrites à la main sur l'artboard
   * (« 136–173 », « > 298 ») : le calculateur fait autorité sur les chiffres, la feuille sur
   * leur NOTATION. L'écart est signalé dans le rapport de reprise.
   */
  it('note les watts en quantité croissante', () => {
    const [z1, z2, , , , z6] = sheet.rows
    expect(z1.bike).toBe('< 136')
    expect(z2.bike).toBe('136–186')
    expect(z6.bike).toBe('> 299')
  })

  it('écrit « max » pour la FC de la zone la plus haute, comme l’artboard', () => {
    expect(sheet.rows.at(-1)!.heartRate).toBe('max')
    expect(sheet.rows[0].heartRate).toBe('< 112')
  })

  it('reprend la cible de répartition du plan', () => {
    expect(sheet.distribution).toEqual({
      weeksCount: 18,
      z1z2Percent: 78,
      z3Percent: 8,
      z4PlusPercent: 14,
    })
  })

  it('n’a rien à dire sur la répartition sans plan', () => {
    expect(buildZoneAtlasSheet(demoAthleteProfile, undefined, TODAY).distribution).toBeNull()
  })

  /**
   * Un tableau rempli à moitié mentirait sur les colonnes qu'il ne peut pas calculer : sans les
   * quatre références, on ne rend rien et on NOMME ce qui manque.
   */
  it('ne rend aucune ligne quand une référence manque, et la nomme', () => {
    const partial: AthleteProfile = { ...demoAthleteProfile }
    delete partial.ftp
    const incomplete = buildZoneAtlasSheet(partial, demoPlan, TODAY)
    expect(incomplete.rows).toEqual([])
    expect(incomplete.missing).toEqual(['FTP vélo'])
    expect(incomplete.references[1].text).toBe('FTP · —')
  })

  it('nomme les quatre références absentes d’un profil vide', () => {
    const bare: AthleteProfile = {
      id: 'x',
      weightKg: 0,
      sweatRateLPerH: 0,
      maxHeartRateBpm: 0,
      language: 'fr',
      theme: 'light',
    }
    const sheetWithout = buildZoneAtlasSheet(bare, demoPlan, TODAY)
    expect(sheetWithout.missing).toEqual([
      'CSS natation',
      'FTP vélo',
      'Allure seuil course',
      'FC max',
    ])
    expect(sheetWithout.subtitle).toBe('Zoned Tri · aucune référence mesurée')
  })

  it('nomme le vide même sans profil du tout', () => {
    expect(buildZoneAtlasSheet(undefined, demoPlan, TODAY).missing).toHaveLength(4)
  })
})

describe('formatDayMonthYear', () => {
  it('ajoute l’année à la date courte des écrans', () => {
    expect(formatDayMonthYear('2026-08-03')).toBe('3 août 2026')
  })
})
