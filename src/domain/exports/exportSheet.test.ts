import { describe, expect, it } from 'vitest'
import {
  FIT_DEFERRED_REASON,
  buildExportRows,
  describeIcsFile,
  exportTrail,
  formatFileSize,
} from './exportSheet'
import { demoBikeWorkout, demoSwimWorkout } from '../demoData'

const CONTEXT = { weekNumber: 7, sessionCount: 7, pageCount: 2 }

describe('exportTrail', () => {
  it('écrit le fil d’Ariane de l’artboard 20', () => {
    expect(exportTrail(7)).toEqual(['Plan', 'Semaine 07', 'Exporter'])
  })
})

describe('buildExportRows', () => {
  const rows = buildExportRows({ ...CONTEXT, workout: demoBikeWorkout })

  it('rend les quatre cartes de l’artboard, dans son ordre', () => {
    expect(rows.map((row) => row.format)).toEqual(['.FIT', '.ZWO', '.ICS', '.PDF'])
  })

  it('n’ombre que la première carte', () => {
    expect(rows.filter((row) => row.featured).map((row) => row.format)).toEqual(['.FIT'])
  })

  it('reprend les intitulés et les descriptions de l’artboard', () => {
    expect(rows[0].title).toBe('Séance structurée → montre')
    expect(rows[1].detail).toBe('Zwift, Rouvy, MyWhoosh · % de FTP, pas de watts figés')
    expect(rows[2].detail).toBe('heure, durée, déroulé dans la description · aucun rappel')
    expect(rows[3].title).toBe('Plan imprimable · atlas des zones')
  })

  /** Décision antérieure du projet : le binaire Garmin est reporté, pas bricolé. */
  it('garde le .FIT inerte avec son motif, jamais « bientôt disponible »', () => {
    expect(rows[0].unavailableReason).toBe(FIT_DEFERRED_REASON)
    expect(rows[0].unavailableReason).not.toMatch(/bientôt/i)
  })

  it('n’affiche aucun poids pour un fichier qu’on n’écrit pas', () => {
    expect(rows[0].aside).toBe('1 séance')
    expect(rows[0].aside).not.toMatch(/Ko/)
  })

  it('ouvre le .ZWO sur une séance de vélo', () => {
    expect(rows[1].unavailableReason).toBeNull()
  })

  it('ferme le .ZWO sur toute autre discipline, en disant pourquoi', () => {
    const swim = buildExportRows({ ...CONTEXT, workout: demoSwimWorkout })
    expect(swim[1].unavailableReason).toBe('Le .ZWO ne décrit qu’une séance de vélo.')
  })

  it('ferme le .ZWO quand aucune séance n’est visée', () => {
    expect(buildExportRows(CONTEXT)[1].unavailableReason).toBe('Aucune séance de vélo sélectionnée.')
  })

  it('compte les événements du .ICS et les pages du .PDF', () => {
    expect(rows[2].aside).toBe('semaine · 7 événements')
    expect(rows[3].aside).toBe('A4 · 2 pages')
  })

  it('accorde le singulier', () => {
    const alone = buildExportRows({ ...CONTEXT, sessionCount: 1, pageCount: 1 })
    expect(alone[2].aside).toBe('semaine · 1 événement')
    expect(alone[3].aside).toBe('A4 · 1 page')
  })

  it('ferme le .ICS d’une semaine vide, en disant pourquoi', () => {
    const empty = buildExportRows({ ...CONTEXT, sessionCount: 0 })
    expect(empty[2].unavailableReason).toBe(
      'Cette semaine ne porte aucune séance à mettre dans l’agenda.',
    )
  })
})

describe('formatFileSize', () => {
  it('compte les octets réellement écrits', () => {
    expect(formatFileSize('abc')).toBe('3 o')
    // « é » pèse deux octets en UTF-8 : la taille est celle du fichier, pas du texte.
    expect(formatFileSize('é')).toBe('2 o')
    expect(formatFileSize('x'.repeat(6144))).toBe('6 Ko')
  })
})

describe('describeIcsFile', () => {
  it('écrit la mention de l’en-tête de l’artboard 24', () => {
    expect(describeIcsFile('x'.repeat(6144), 7)).toBe('7 événements · 6 Ko')
  })
})
