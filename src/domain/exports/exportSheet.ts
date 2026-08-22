// Contenu de la feuille d'export — artboard 20, « appelée depuis n'importe quel écran ·
// **dit ce que contient chaque fichier** ».
//
// C'est la pièce qui relie les autres : avant de produire quoi que ce soit, elle annonce ce que
// chaque fichier contiendra, et pour ceux qui ne s'écrivent pas encore, POURQUOI. Les quatre
// intitulés et les quatre descriptions sont ceux de l'artboard, mot pour mot.
//
// LE `.FIT` RESTE INERTE, et c'est une décision antérieure du projet, pas un oubli : c'est un
// binaire Garmin (en-têtes, CRC, table de définitions de messages) que personne ne bricole en
// une passe. Sa puce garde donc son motif, comme l'exige la méthode — jamais un bouton mort sans
// explication.

import type { Workout } from '../types'

export type ExportFormat = '.FIT' | '.ZWO' | '.ICS' | '.PDF'

export interface ExportRow {
  format: ExportFormat
  /** Mention de droite : « 1 séance », « semaine · 7 événements », « A4 · 2 pages ». */
  aside: string
  /** « Séance structurée → montre ». */
  title: string
  /** « intervalles, cibles d'allure et de puissance, temps de repos ». */
  detail: string
  /** L'artboard n'ombre QUE la première carte (ombre lime de 5 px). */
  featured: boolean
  /** `null` = le fichier s'écrit. Sinon la raison, portée par le `title` de la puce. */
  unavailableReason: string | null
}

export interface ExportSheetContext {
  /** Numéro de la semaine exportée — il donne le fil d'Ariane et le nom du fichier. */
  weekNumber: number
  /** Séances de la semaine, une par événement du `.ICS`. */
  sessionCount: number
  /** Séance de l'écran appelant, quand il y en a une : c'est elle que `.FIT` et `.ZWO` visent. */
  workout?: Workout
  /** Pages réellement produites par l'impression A4. */
  pageCount: number
}

/** Titre et promesse de la feuille — artboard 20. */
export const EXPORT_SHEET_TITLE = 'Exporter'
export const EXPORT_SHEET_PROMISE =
  'Le fichier est écrit sur l’appareil. Rien ne part sur un serveur, aucun compte n’est créé.'

/** Les deux lignes du pied de feuille, en mono, sous un filet clair. */
export interface ExportFootnote {
  format: string
  text: string
}

export const EXPORT_FOOTNOTES: ExportFootnote[] = [
  { format: '.PNG', text: 'carte de séance 1080 × 1080, sans nom, sans FC, sans position.' },
  {
    format: '.JSON',
    text: 'sauvegarde complète (profil, plan, séances, courses), dans Réglages / Données.',
  },
]

/**
 * Le motif du `.FIT`. Il dit ce qu'est le format et pourquoi il attend, pas « bientôt
 * disponible » : la méthode veut une raison, pas une promesse.
 */
export const FIT_DEFERRED_REASON =
  'Le .FIT est un binaire Garmin : son écriture est reportée plutôt que bricolée.'

const ZWO_WRONG_DISCIPLINE_REASON = 'Le .ZWO ne décrit qu’une séance de vélo.'
const ZWO_NO_SESSION_REASON = 'Aucune séance de vélo sélectionnée.'

function plural(count: number, singular: string, many: string): string {
  return `${count} ${count > 1 ? many : singular}`
}

/** Le fil d'Ariane de l'artboard 20 : « Plan / Semaine 07 / Exporter ». */
export function exportTrail(weekNumber: number): string[] {
  return ['Plan', `Semaine ${String(weekNumber).padStart(2, '0')}`, EXPORT_SHEET_TITLE]
}

export function buildExportRows(context: ExportSheetContext): ExportRow[] {
  const { workout, sessionCount, pageCount } = context

  return [
    {
      format: '.FIT',
      // L'artboard écrit « 1 séance · 4 Ko ». Le poids est celui d'un fichier qu'on n'écrit pas :
      // il n'est donc pas affiché — une taille inventée serait un mensonge de plus qu'un vide.
      aside: workout ? '1 séance' : 'aucune séance',
      title: 'Séance structurée → montre',
      detail: 'intervalles, cibles d’allure et de puissance, temps de repos',
      featured: true,
      unavailableReason: FIT_DEFERRED_REASON,
    },
    {
      format: '.ZWO',
      aside: '1 séance vélo',
      title: 'Séance → home-trainer',
      detail: 'Zwift, Rouvy, MyWhoosh · % de FTP, pas de watts figés',
      featured: false,
      unavailableReason: !workout
        ? ZWO_NO_SESSION_REASON
        : workout.discipline === 'V'
          ? null
          : ZWO_WRONG_DISCIPLINE_REASON,
    },
    {
      format: '.ICS',
      aside: `semaine · ${plural(sessionCount, 'événement', 'événements')}`,
      title: 'Plan daté → agenda',
      detail: 'heure, durée, déroulé dans la description · aucun rappel',
      featured: false,
      unavailableReason:
        sessionCount > 0 ? null : 'Cette semaine ne porte aucune séance à mettre dans l’agenda.',
    },
    {
      format: '.PDF',
      aside: `A4 · ${plural(pageCount, 'page', 'pages')}`,
      title: 'Plan imprimable · atlas des zones',
      detail: 'noir et blanc lisible, pensé pour la poche du maillot',
      featured: false,
      unavailableReason: null,
    },
  ]
}

/** `6 Ko` — le poids d'un fichier réellement écrit, jamais estimé. */
export function formatFileSize(text: string): string {
  const bytes = new TextEncoder().encode(text).length
  if (bytes < 1024) return `${bytes} o`
  return `${Math.round(bytes / 1024)} Ko`
}

/** « 7 événements · 6 Ko » — la mention de l'en-tête de l'artboard 24. */
export function describeIcsFile(text: string, eventCount: number): string {
  return `${plural(eventCount, 'événement', 'événements')} · ${formatFileSize(text)}`
}
