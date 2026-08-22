import { GENERATOR_STEPS, type GeneratorForm, type GeneratorStepId } from './form'

/**
 * Les réponses en cours du générateur, gardées le temps de la session de navigation.
 *
 * Le parcours tient cinq questions dans un état React et rien d'autre : un rechargement de page,
 * un lien ouvert par erreur, un retour arrière du navigateur, et tout était perdu — sans le
 * moindre avertissement. C'est le seul endroit du produit où l'utilisateur SAISIT quelque chose de
 * long, et c'était le seul endroit sans filet.
 *
 * `sessionStorage` et non `localStorage` : un brouillon est lié à l'onglet et à la visite. Le
 * retrouver trois jours plus tard, à moitié rempli, poserait une question qu'on ne saurait pas
 * répondre (« ces réponses sont-elles encore les miennes ? »). Il est effacé dès que le plan est
 * écrit — le brouillon a alors un successeur, il n'a plus de raison d'être.
 */
const STORAGE_KEY = 'zoned-tri:generator-draft'

export interface GeneratorDraft {
  form: GeneratorForm
  step: GeneratorStepId
}

/**
 * Toutes les entrées/sorties passent par un `try` : `sessionStorage` lève en navigation privée sur
 * certains navigateurs, et un brouillon perdu ne doit jamais empêcher de générer un plan.
 */
export function readGeneratorDraft(): GeneratorDraft | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { form, step } = parsed as { form?: unknown; step?: unknown }
    // On ne valide pas le formulaire champ à champ : il vient de cette application, et une
    // vérification de forme suffit à écarter une clé étrangère ou une version périmée.
    if (typeof form !== 'object' || form === null) return null
    if (typeof step !== 'string' || !GENERATOR_STEPS.includes(step as GeneratorStepId)) return null

    return { form: form as GeneratorForm, step: step as GeneratorStepId }
  } catch {
    return null
  }
}

export function writeGeneratorDraft(draft: GeneratorDraft): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Rien à faire : le parcours fonctionne sans filet, comme avant.
  }
}

export function clearGeneratorDraft(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Idem.
  }
}
