import { describe, expect, it } from 'vitest'
import { demoRace } from './demoData'
import {
  CHECKLIST_TEMPLATE,
  checklistFromRows,
  emptyRow,
  newItemId,
  rowsFromRace,
  templateRows,
} from './raceChecklistEdit'

describe('CHECKLIST_TEMPLATE', () => {
  /**
   * La liste type est un POINT DE DÉPART, pas une prescription : elle ne porte aucun chiffre. La
   * pression, le grammage et le pignon appartiennent à la course et à l'athlète — les inventer
   * serait exactement ce que la règle nº 4 interdit.
   */
  it('ne porte aucune quantité ni aucun réglage', () => {
    expect(CHECKLIST_TEMPLATE.some((entry) => /\d/.test(entry.label))).toBe(false)
  })

  it('couvre les trois emplacements de l’artboard 30', () => {
    const sections = new Set(CHECKLIST_TEMPLATE.map((entry) => entry.section))
    expect([...sections].sort()).toEqual(['T1', 'T2', 'bike'])
  })

  it('rend des lignes toutes décochées : rien n’est fait à la place de l’athlète', () => {
    expect(templateRows().every((row) => !row.done)).toBe(true)
  })
})

describe('rowsFromRace', () => {
  it('reprend la liste enregistrée, cases comprises', () => {
    const rows = rowsFromRace(demoRace)
    expect(rows).toHaveLength(demoRace.transitionChecklist?.length ?? 0)
    expect(rows.some((row) => row.done)).toBe(true)
  })

  it('rend une liste vide plutôt que d’en proposer une d’office', () => {
    expect(rowsFromRace({ ...demoRace, transitionChecklist: undefined })).toEqual([])
  })
})

describe('checklistFromRows', () => {
  it('oublie les lignes vides plutôt que de les refuser', () => {
    const kept = checklistFromRows([emptyRow('T1'), { id: newItemId(), section: 'bike', label: 'Bidons', done: false }])
    expect(kept.map((item) => item.label)).toEqual(['Bidons'])
  })

  it('range les lignes dans l’ordre des trois emplacements', () => {
    const kept = checklistFromRows([
      { id: newItemId(), section: 'T2', label: 'Casquette', done: false },
      { id: newItemId(), section: 'T1', label: 'Casque', done: false },
      { id: newItemId(), section: 'bike', label: 'Bidons', done: false },
    ])
    expect(kept.map((item) => item.section)).toEqual(['T1', 'bike', 'T2'])
  })

  it('garde l’identifiant d’une ligne existante : sa case reste cochée après une correction', () => {
    const kept = checklistFromRows([{ id: 'casque', section: 'T1', label: ' Casque et lunettes ', done: true }])
    expect(kept[0]).toEqual({ id: 'casque', section: 'T1', label: 'Casque et lunettes', done: true })
  })
})
