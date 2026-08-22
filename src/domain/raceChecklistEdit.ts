import type { ChecklistItem, ChecklistSection, Race } from './types'

/**
 * Écrire la checklist du parc — le pendant du déroulé du jour J.
 *
 * Même impasse : `Race.transitionChecklist` existait, `RaceChecklistScreen` savait la cocher et la
 * compter, mais aucun écran ne savait l'écrire. Sur un appareil réel, « Checklist parc » était
 * éteint pour toujours, et l'écran ne s'ouvrait que dans le jeu de démonstration.
 */
export interface ChecklistRow {
  /** Identifiant du modèle : conservé pour qu'une case déjà cochée le reste après une édition. */
  id: string
  section: ChecklistSection
  label: string
  done: boolean
}

let counter = 0

export function newItemId(): string {
  counter += 1
  return `item-${Date.now().toString(36)}-${counter}`
}

export const CHECKLIST_SECTIONS: { section: ChecklistSection; label: string }[] = [
  { section: 'T1', label: 'Emplacement T1 · natation → vélo' },
  { section: 'bike', label: 'Sur le vélo' },
  { section: 'T2', label: 'Emplacement T2 · vélo → course' },
]

/**
 * Liste type du parc à vélo — un POINT DE DÉPART, pas une prescription.
 *
 * Ce n'est pas une entorse à « on n'invente rien » : la règle interdit d'inventer une MESURE (une
 * FTP estimée, une allure devinée), pas de proposer un gabarit qu'on édite. Le produit embarque
 * déjà un catalogue de séances au même titre. Chaque ligne est du matériel générique de triathlon,
 * sans quantité ni réglage : les chiffres — pression, glucides, pignon — appartiennent à la course
 * et à l'athlète, et c'est à eux de les écrire.
 */
export const CHECKLIST_TEMPLATE: { section: ChecklistSection; label: string }[] = [
  { section: 'T1', label: 'Casque, sangles écartées' },
  { section: 'T1', label: 'Chaussures vélo en place' },
  { section: 'T1', label: 'Lunettes et bonnet de natation' },
  { section: 'T1', label: 'Serviette pliée en repère visuel' },
  { section: 'bike', label: 'Bidons remplis' },
  { section: 'bike', label: 'Ravitaillement fixé au cadre' },
  { section: 'bike', label: 'Pression des pneus vérifiée' },
  { section: 'bike', label: 'Compteur remis à zéro' },
  { section: 'bike', label: 'Nécessaire de réparation' },
  { section: 'T2', label: 'Chaussures de course délacées' },
  { section: 'T2', label: 'Ceinture porte-dossard' },
  { section: 'T2', label: 'Casquette et lunettes' },
]

export function templateRows(): ChecklistRow[] {
  return CHECKLIST_TEMPLATE.map((entry) => ({
    id: newItemId(),
    section: entry.section,
    label: entry.label,
    done: false,
  }))
}

export function rowsFromRace(race: Race): ChecklistRow[] {
  return (race.transitionChecklist ?? []).map((item) => ({
    id: item.id,
    section: item.section,
    label: item.label,
    done: item.done,
  }))
}

export function emptyRow(section: ChecklistSection): ChecklistRow {
  return { id: newItemId(), section, label: '', done: false }
}

/** Les lignes vides sont retirées, pas refusées : une ligne ajoutée puis laissée vide s'oublie. */
export function checklistFromRows(rows: ChecklistRow[]): ChecklistItem[] {
  const order = CHECKLIST_SECTIONS.map((entry) => entry.section)
  return rows
    .filter((row) => row.label.trim() !== '')
    .sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section))
    .map((row) => ({ id: row.id, section: row.section, label: row.label.trim(), done: row.done }))
}
