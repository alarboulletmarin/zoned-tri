/**
 * Build de démonstration — celle qu'on déploie pour montrer l'application à quelqu'un qui n'a pas
 * de plan sur son appareil.
 *
 * Elle amorce la base d'un plan de démonstration (cf. `dev/devSeed`) et le DIT : le produit ne
 * présente jamais un faux plan comme un vrai (règle de l'artboard 01b). Le drapeau n'est posé que
 * par `VITE_DEMO=1`, donc jamais par la build du produit.
 *
 * Le plan amorcé n'est pas une maquette : il sort du vrai générateur, nourri du vrai catalogue.
 * Ce qu'on montre est ce que l'application produit.
 */
export const IS_DEMO_BUILD = import.meta.env.VITE_DEMO === '1'
