/**
 * Chemins des cinq écrans système (artboards S2, S3, 17, 18, 19). Les routes elles-mêmes sont
 * déclarées dans `src/App.tsx` ; ce module ne porte que leur construction, pour qu'aucun écran
 * n'écrive une URL à la main.
 */

/** Artboard S2 · Réglages — « depuis le menu → Réglages ». */
export const SETTINGS_PATH = '/settings'

/** Artboard S3 · Langue — « depuis Réglages → Langue » (fil d'Ariane `Menu / Réglages / Langue`). */
export const LANGUAGE_PATH = '/settings/langue'

/**
 * Artboard 17 · Hors-ligne. Le canevas coiffe cet écran du bandeau de section « PLAN » : c'est
 * depuis le plan qu'on ouvre l'explication du hors-ligne, et le libellé du bandeau doit rester
 * vrai. La route vit donc sous `/plan`, sans quoi le rail desktop désignerait une autre section
 * que celle qu'annonce l'en-tête.
 */
export const OFFLINE_PATH = '/plan/hors-ligne'

/**
 * Artboard 19 · Import refusé — fil d'Ariane `Outils / Import-export / Import`. La route n'affiche
 * quelque chose que si un refus l'accompagne (voir `ImportRoute`) : le canevas ne dessine pas
 * d'écran « choisir un fichier », seulement le refus et sa reprise.
 */
export const IMPORT_PATH = '/import-export/import'
