import type { AthleteProfile, Workout } from '../../../domain/types'

/**
 * `compact` = artboards mobiles 05 / 28 / 29, et panneau côte à côte de S5 (l'hôte ne sait pas
 * passer de prop : c'est donc le défaut). `wide` = fiche du panneau de S5 (l. 1741-1768), la seule
 * fiche large que le canevas dessine : ligne de méta, tableau Bloc / Cible / Repos, pas de bandeau
 * de discipline. Il n'existe AUCUN artboard de fiche pleine largeur — S4 est l'écran Aujourd'hui.
 */
export type DetailLayout = 'compact' | 'wide'

export interface DisciplineDetailProps {
  workout: Workout
  layout?: DetailLayout
  /**
   * Références mesurées de l'athlète. Elles ne changent aucun contenu : elles changent l'UNITÉ dans
   * laquelle une cible se lit (watts contre % de FTP, artboard 28). Absentes, la fiche reste dans
   * l'unité que le domaine stocke, et le dit.
   */
  profile?: AthleteProfile
}
