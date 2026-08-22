import { describe, expect, it } from 'vitest'
import { buildZwo, zonePowerFraction, zwoFileName } from './zwoFile'
import { demoBikeWorkout, demoSwimWorkout } from '../demoData'
import type { Workout } from '../types'

describe('zonePowerFraction', () => {
  it('prend le milieu d’une zone fermée des deux côtés', () => {
    // Z4 = 91–105 % de FTP dans `ftpPowerZones` → 0,98.
    expect(zonePowerFraction('Z4')).toBeCloseTo(0.98, 3)
  })

  it('prend l’unique borne connue d’une zone ouverte', () => {
    expect(zonePowerFraction('Z1')).toBeCloseTo(0.55, 3)
    expect(zonePowerFraction('Z6')).toBeCloseTo(1.21, 3)
  })

  it('reste dans l’ordre des zones', () => {
    const fractions = (['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6'] as const).map(zonePowerFraction)
    expect(fractions).toEqual([...fractions].sort((a, b) => a - b))
  })
})

describe('buildZwo', () => {
  const xml = buildZwo(demoBikeWorkout)!

  it('refuse toute discipline autre que le vélo', () => {
    expect(buildZwo(demoSwimWorkout)).toBeNull()
  })

  it('écrit un fichier Zwift complet', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<workout_file>')).toBe(true)
    expect(xml).toContain('<sportType>bike</sportType>')
    expect(xml).toContain('<name>3 × 12′ au seuil</name>')
    expect(xml.trimEnd().endsWith('</workout_file>')).toBe(true)
  })

  /** « % de FTP, pas de watts figés » — carte `.ZWO` de l'artboard 20. */
  it('n’écrit AUCUN watt, seulement des fractions de FTP', () => {
    expect(xml).not.toMatch(/\d+\s*W/)
    expect(xml).toContain('Power="0.96"')
  })

  it('reprend la cible de puissance du bloc quand elle existe, et sa cadence', () => {
    // Échauffement de l'artboard 28 : 12 min à 65 % de FTP, 90 rpm.
    expect(xml).toContain('<SteadyState Duration="720" Power="0.65" Cadence="90"/>')
  })

  it('dérive la puissance de la zone quand le bloc ne porte pas de cible', () => {
    const zoneOnly: Workout = {
      ...demoBikeWorkout,
      blocks: [{ kind: 'segment', phase: 'warmup', effort: 'effort', durationMin: 15, zone: 'Z2' }],
    }
    // Z2 = 55–75 % de FTP dans `ftpPowerZones` → 0,65, sans cadence à déclarer.
    expect(buildZwo(zoneOnly)).toContain('<SteadyState Duration="900" Power="0.65"/>')
  })

  it('rend une série effort / récupération en IntervalsT', () => {
    const intervals: Workout = {
      ...demoBikeWorkout,
      blocks: [
        {
          kind: 'repeat',
          count: 5,
          steps: [
            { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 4, zone: 'Z5' },
            { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 2, zone: 'Z1' },
          ],
        },
      ],
    }
    expect(buildZwo(intervals)).toContain(
      '<IntervalsT Repeat="5" OnDuration="240" OffDuration="120" OnPower="1.13" OffPower="0.55"/>',
    )
  })

  it('déplie une série que IntervalsT déformerait', () => {
    const three: Workout = {
      ...demoBikeWorkout,
      blocks: [
        {
          kind: 'repeat',
          count: 2,
          steps: [
            { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 1, zone: 'Z5' },
            { kind: 'segment', phase: 'main', effort: 'effort', durationMin: 1, zone: 'Z4' },
            { kind: 'segment', phase: 'main', effort: 'recovery', durationMin: 1, zone: 'Z1' },
          ],
        },
      ],
    }
    const output = buildZwo(three)!
    expect(output).not.toContain('IntervalsT')
    expect(output.match(/<SteadyState/g)).toHaveLength(6)
  })

  it('sort un bloc sans zone ni cible en FreeRide, jamais en puissance inventée', () => {
    const free: Workout = {
      ...demoBikeWorkout,
      blocks: [{ kind: 'segment', phase: 'main', effort: 'effort', durationMin: 30 }],
    }
    expect(buildZwo(free)).toContain('<FreeRide Duration="1800"/>')
  })

  it('échappe le XML du titre', () => {
    const tricky: Workout = { ...demoBikeWorkout, title: 'Seuil <&> "test"' }
    expect(buildZwo(tricky)).toContain('<name>Seuil &lt;&amp;&gt; &quot;test&quot;</name>')
  })
})

describe('zwoFileName', () => {
  it('réduit le titre à un nom de fichier', () => {
    expect(zwoFileName(demoBikeWorkout)).toBe('zonedtri-3-12-au-seuil.zwo')
  })

  it('garde un nom même si le titre ne laisse rien', () => {
    expect(zwoFileName({ ...demoBikeWorkout, title: '×××' })).toBe('zonedtri-seance.zwo')
  })
})
