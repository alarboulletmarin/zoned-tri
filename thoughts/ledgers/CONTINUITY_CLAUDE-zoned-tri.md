# Continuity — zoned-tri

## Goal
Reconstruire "Zoned TRI Brut" (app triathlon offline-first, PWA) en code réel à partir des mockups Claude Design, avec une logique de calcul solide, vérifiable et honnête (chaque métrique affichée trace sa source/preuve). Succès = les 51 écrans du mockup implémentés, testés, PWA installable, aucune formule inventée sans le dire.

## Constraints
- Stack : Vite + React + TypeScript, PWA via `vite-plugin-pwa`, graphiques `recharts`, responsive (mobile/tablette/desktop comme écran S4 du mockup).
- 100% local/offline — pas de compte, pas de backend, IndexedDB (`idb`) comme source de vérité.
- TDD obligatoire sur toute logique de calcul (skill `test-driven-development`).
- Design tokens et interdits stricts du Design System Zoned Tri (§7 de la research) — jamais de coin arrondi, ombre floutée, dégradé, quantité hors Space Mono.
- Principe produit central : « une preuve par affirmation » → composant `ProofBadge`+`EvidenceNote` réutilisable partout où un chiffre est calculé/recommandé.

## Key Decisions
- 9/12 calculateurs manquants dans le mockup : proposition sourcée validée par l'utilisateur (voir `thoughts/shared/research/2026-08-21-calculators-spec.md`).
- Catégorie « Brick » = étiquette transverse sur des séances déjà comptées en N/V/C (pas une 5e discipline) — validé utilisateur.
- Export PDF (atlas/plan A4) via `@media print`, pas de lib PDF. Export PNG carte de séance via Canvas 2D fait main. Export .ICS/.ZWO faits main (formats simples). Export `.FIT` **reporté** — format binaire Garmin non trivial, décision à prendre séparément plutôt que bricolée (voir plan §Décisions).
- Import/export JSON : tout-ou-rien strict (accepter/refuser en bloc), pas de fusion — tranché en faveur du Design System spécifique Zoned Tri contre le fallback générique non pertinent.
- Pas de Redux/state lib externe — Context + hooks par domaine sur IndexedDB.

## State
- Done:
  - [x] Import/lecture des 2 fichiers de design (`~/Downloads/Zoned TRI Brut - App.dc.html`, `- Design System.dc.html`) + fallback `Design System v1.1.dc.html`
  - [x] Recherche exhaustive écrite : `thoughts/shared/research/2026-08-21-design-spec.md` (51 écrans, tokens, navigation, honnêteté)
  - [x] Spec des 12 calculateurs sourcée : `thoughts/shared/research/2026-08-21-calculators-spec.md`
  - [x] Plan d'implémentation phasé : `thoughts/shared/plans/2026-08-21-zoned-tri-implementation.md`
  - [x] Phase 0 — scaffold Vite+React+TS+react-router-dom+recharts+vite-plugin-pwa+vitest/testing-library, installé et fonctionnel
  - [x] Phase 1 — Fondations design system : tokens CSS (`src/styles/tokens.css`), primitives (`Button`, `Badge`, `ProofBadge`+`EvidenceNote`, `ListRow`, `BottomSheet`, `UndoToast`, `AppHeader`), hooks TDD (`useBreakpoint`, `useFocusTrap`), `BurgerMenu`+`AppShell` responsive, routing placeholder. 59/59 tests verts, build OK, vérifié indépendamment. Écart noté : polices chargées via Google Fonts/Fontshare avec fallback système (pas d'auto-hébergement possible, pas de fichiers de police ni réseau de téléchargement disponibles dans le sandbox) — à revisiter si l'auto-hébergement devient nécessaire pour l'offline strict.
  - [x] Phase 2 — Domaine & persistance : types (`src/domain/types.ts`), IndexedDB (`idb` + `fake-indexeddb` en test), import/export tout-ou-rien (transaction unique, validation exhaustive avant écriture), `AppDataContext` unique (5 hooks fins). 87/87 tests, build OK.
  - [x] Correction de fidélité visuelle post-retour utilisateur (bandeau "Zoned Tri" + loupe + burger, contraste badges discipline, cadre affiche 2px) — voir section dédiée plus haut. 88/88 tests, vérifié par capture Playwright réelle.
  - [x] Audit `zoned` (app sœur) vs spec calculateurs → spec révisée : zones vélo sourcées Allen & Coggan 2019, CSS re-sourcé Ginn 1993 + Wakayoshi 1992, TSS unifié ajouté, coefficient VMA-30min dégradé MODÉRÉE→FAIBLE (non confirmé).
  - [x] Phase 3 — Moteur des 12 calculateurs (TDD), `src/domain/calculators/`. 121/121 tests, build OK, vérifié indépendamment.
  - [x] Correction post-Phase 3 (2026-08-21) : vérification manuelle contre les vraies valeurs de l'atlas du mockup (écran 21) → (a) zones course : le passage à Daniels/VMA fait après l'audit `zoned` a été annulé, retour à Friel/allure-seuil qui reproduit bien mieux l'atlas Zoned Tri ; (b) zones natation : bug réel corrigé — Z4 "Seuil" incluait une allure plus rapide que le CSS au lieu de l'englober (Friel numérote ses zones natation dans l'ordre inverse de ses zones vélo/course, décalage non repéré à la 1re passe) ; (c) zones vélo : écart résiduel avec l'atlas du mockup documenté et assumé (les vrais % Coggan sont gardés, le mockup semble avoir des valeurs d'exemple saisies à la main). `runPaceZonesFromVma` renommé `runPaceZonesFromThreshold` (input redevenu allure seuil, pas VMA). 121/121 tests toujours verts après correction.
  - [x] Routes anglicisées (2026-08-21, demande utilisateur) : `/seances→/workouts`, `/courses→/races`, `/outils→/tools`, `/reglages→/settings`, `/generer-un-plan→/generate-plan`. `/plan` et `/import-export` déjà anglais.
  - [x] Anglicisation des identifiants de domaine (2026-08-21) : tous les statuts/enums de `src/domain/types.ts` passés en anglais (voir table de correspondance dans l'historique de session si besoin). Au passage, `EvidenceLevel`/`ProofLevel` unifiés en un seul type `ProofLevel = 'solid'|'moderate'|'weak'`, désormais défini dans `src/domain/types.ts` (le domaine ne dépend plus d'un composant UI — sens de dépendance corrigé). `'regle_produit'` → `'product_rule'` également corrigé après coup. 121/121 tests toujours verts, build OK. Les libellés affichés à l'utilisateur restent 100% en français, seuls les identifiants de code ont changé.
  - [x] Audit contenu `zoned` pour Phase 4 (2026-08-21) : 239 vrais gabarits de séances (209 course à pied exploitables, 10 natation, 10 vélo — loin des volumes cibles), **aucun catalogue de courses nulle part** (1 240 à construire de zéro, pas de raccourci). Bug de modèle trouvé et corrigé : `Workout`/`WorkoutBlock` n'avait qu'une zone par séance entière et des blocs plats — corrigé en union discriminée `WorkoutSegment | WorkoutRepeat` (zone par bloc, répétitions structurées type "8×150m"), `validation.ts` et `demoData.ts` mis à jour en conséquence. 121/121 tests toujours verts après le fix.
  - [x] Décisions de scope contenu (2026-08-21, validées utilisateur) : bibliothèque = jeu réduit réaliste (~30 séances, mix gabarits course à pied portés de `zoned` + natation/vélo/brick écrits à la main) avec UI pensée pour scaler à 312 plus tard (passe de contenu dédiée, séparée du travail d'ingénierie) ; catalogue de courses = **entièrement reporté**, écran G1 en saisie libre du nom sans recherche catalogue pour l'instant.
  - [x] Contenu Phase 4 (2026-08-21) : `src/domain/seedWorkouts.ts`, 30 séances (10 course à pied portées de `zoned`, reste écrit à la main), 127/127 tests.
  - [x] Écrans Phase 4 construits (2026-08-21) : bibliothèque (07, `/workouts`), feuille de filtres (40), recherche en place (25), résultat vide (26), détail de séance N/V/C/R (`/workouts/:id`). 185/185 tests, build OK.
  - [x] Cadre extérieur de page retiré (2026-08-21, retour utilisateur direct : « je n'aime pas du tout la bordure autour de la page ») — `AppShell.module.css` `.main` n'a plus de `margin`/`border`, l'app remplit tout le viewport. Vérifié par capture d'écran.
  - [x] Correction bibliothèque suite à retour utilisateur sévère (2026-08-21, « très moche, pas utilisable, ne respecte pas le système ») : cause racine identifiée — les séances sans zone (repos/renfort) n'affichaient aucun badge du tout (juste un trou), cassant l'alignement des lignes et donnant une impression de contenu vide/instable au changement de filtre. Corrigé dans `WorkoutListRow.tsx` : chaque ligne a maintenant un slot de badge de largeur fixe (zone colorée OU tiret mono "—" sur fond `--color-neutral-fill`, conforme à la règle documentée "valeur absente = tiret, jamais un vide"), un point de couleur discipline systématique, et un tag "BRICK" textuel au lieu d'un point de couleur ambigu. Vérifié par capture d'écran avant/après.
  - [ ] Point non résolu à trancher si besoin : les écrans de détail (05/28/29) ont dans le mockup une bordure de carte colorée par discipline (orange natation/bleu vélo/rouge-orangé course, `border:2px solid #FF6A1F` etc. à la racine de l'écran) — actuellement PAS implémentée, par cohérence avec le retrait du cadre de page demandé par l'utilisateur. À vérifier avec l'utilisateur si cette bordure spécifique (différente du cadre générique retiré) doit revenir.
  - [x] Refonte de la coquille desktop (2026-08-21) suite à un fichier mockup révisé fourni par l'utilisateur (`~/Downloads/Zoned TRI Brut - App.dc(2).html`, écran S4 "piloté par les tweaks" + nouveau S5 "Séances desktop"). Le script de démo du fichier donne les valeurs exactes par appareil (desktop 1280×648, tablette 834×672, mobile 390×780). Changements : le rail latéral n'apparaît QU'au desktop (pas tablette, contrairement à ma première implémentation) ; largeur rail 240px (pas 236) ; le burger disparaît quand le rail est visible (`AppHeader.onOpenMenu` maintenant optionnel) ; l'en-tête affiche le nom de section au lieu du mot-symbole sur desktop (`showWordmark` prop) ; suppression du panneau latéral générique factice ("Résumé semaine") — chaque écran doit gérer son propre layout 2 colonnes desktop plutôt qu'un panneau partagé à contenu fixe. Vérifié par capture d'écran à 1280px, conforme à S4. 188/188 tests.
  - [x] Patron S5 implémenté (2026-08-21) : bibliothèque desktop, liste + fiche côte à côte (`grid-template-columns:1fr 440px`), première séance sélectionnée par défaut, clic = sélection locale (pas de navigation) sur desktop, ligne sélectionnée en surbrillance encre. Composants de détail (`Swim/Bike/Run/GenericWorkoutDetail`) ont gagné un prop `showBreadcrumb` pour être réutilisés en panneau sans fil d'Ariane dupliqué ; nouveau `WorkoutDetailContent` partagé entre la route `/workouts/:id` et le panneau. 189/189 tests, build OK, vérifié par capture d'écran à 1280px conforme au mockup S5.
  - [x] Écran S6 « Plan · semaine » desktop créé (2026-08-21) : `src/pages/plan/SemaineScreen.tsx` + module CSS (grille `repeat(7,1fr)`, jour « aujourd'hui » en aplat encre, jour libre en pointillé filet, pieds de colonne, barre de proportion 14px, légende de pied de page), dérivations pures dans `src/domain/planWeek.ts` (TDD). Plomberie manquante branchée au passage : `AppDataProvider` était écrit/testé mais **monté nulle part** — il enveloppe désormais le routeur dans `src/App.tsx`, et `/plan` choisit Ouverture (aucun plan actif) vs Semaine (plan actif) via `src/pages/plan/PlanRoute.tsx`. Route `/plan/semaine` ajoutée pour l'accès direct (repli sur le plan de démonstration recalé sur la semaine en cours tant que le générateur n'existe pas, mention « semaine de démonstration » en pied de page). 223/223 tests, vérifié par capture à 1280×800 et 1440×900.
    - LIMITATION assumée : **le glisser-déposer entre jours n'est pas implémenté** — la poignée `≡` de chaque carte et la mention « glisser par ≡ pour déplacer » du pied de page sont présentes (elles sont dans le canevas) mais inertes. À faire dans une passe dédiée.
    - LIMITATION : `Bloquer la semaine` et `.ICS` sont présentationnels (boutons désactivés, encre inactive), comme le `.PDF` de la bibliothèque.
    - DETTE : le canevas S6 met aussi dans le rail un bloc de contexte semaine (« SEMAINE 07/18 », barre 39 %/61 %, « J-77 · 70.3 Vichy ») et un encart jaune — absents de `AppShell`, hors scope de cette passe.
  - [x] Phase 5 — bloc 2 « Générateur de plan (G1→G6) » (2026-08-21), fait par 3 agents Opus en parallèle sur un contrat écrit en amont par l'orchestrateur (types du formulaire, `StepDots`, `GeneratorStepFrame`, primitives de ligne, `formats.ts`/`dates.ts`/`summary.ts`), pour que les 6 écrans ne divergent pas.
    - Moteur : `src/domain/planGenerator/generatePlan.ts` + `phases.ts` — pur et déterministe (`idPrefix` injectable). Semaine 1 contient toujours le jour courant (sinon « Aujourd'hui » n'a rien à afficher juste après la génération), 4 phases Base/Build/Specific/Taper (affûtage 2 sem., 1 sous 6 sem.), cycle de charge 3:1, semaines bloquées à 50 % sans sortie longue, sortie longue vélo au samedi / course au dimanche, brick en Build/Specific, plafonds par discipline, filtres piscine/eau libre/home-trainer, tests de référence en semaine 1. **Ni règle des 10 %, ni ACWR** — écartés explicitement par le canevas G6, absence documentée en tête de fichier. `plan.intensityDistribution` porte la répartition RÉELLEMENT obtenue (77/9/14 sur un 70.3 de 16 sem.), pas la cible 78/8/14.
    - Écrans : `src/pages/generator/` — G1 Objectif, G2 Date (barre disponibles/manquantes + alerte de délai preuve SOLIDE), G3 Disponibilité (curseur de volume, jours, plafonds), G4 Contraintes (matériel + semaines bloquées), G5 Références (édition en place, tests proposés, encart « pourquoi pas d'estimation » preuve FAIBLE), G6 Récapitulatif (lignes cliquables vers leur étape + « ce que le moteur va faire » avec les 4 pastilles de statut, dont la ligne ACWR écartée), et écran 06 · Simulation (cadre pointillé, compteurs réels du plan de repli, rien d'écrit).
    - Machine à états : `GeneratePlanScreen.tsx` (route `/generate-plan`, n'est plus un placeholder). Détient l'unique exemplaire du formulaire, décide repli vs enregistrement direct, applique la règle de l'écran 01c « Générer n'écrase rien » (le plan actif passe en `archived_abandoned` avec sa semaine atteinte), et transforme la saisie libre de course en vraie fiche `Race` (sinon le nom saisi disparaissait et l'app n'affichait que « 70.3 »).
    - Plomberie ajoutée : `repository.putWorkouts` (lot en une transaction), `AppDataContext.savePlanWithWorkouts`, `SemaineScreen` prend un `catalogue` (résolution des séances d'un plan généré, pas seulement du catalogue statique), `WorkoutDetailScreen` résout aussi les séances enregistrées, `navigation.sectionForPath` (rattache `/generate-plan` à la section Plan). 2 gabarits ajoutés à `seedWorkouts` : `run-test-seuil-30min` et `swim-test-css-400-200` (30 → 32 séances).
    - Bug réel trouvé par le test d'intégration : le moteur étant pur, deux générations aux mêmes réponses produisaient le MÊME identifiant de plan, donc la seconde écrasait l'archive de la première — exactement ce que « Générer n'écrase rien » interdit. L'unicité est maintenant décidée par l'écran (`newPlanId()`) et injectée dans le moteur, qui reste déterministe.
    - Vérifié : 424/424 tests, `tsc -b` propre, `oxlint` sans nouvelle remontée, build de prod OK, et parcours de bout en bout au navigateur depuis une base VIDE (mobile 390 et desktop 1280/1440) : ouverture « rien pour l'instant » → 6 étapes → plan enregistré → « Aujourd'hui » (Semaine 01/16, 6 h 45, tests de référence placés) et « Semaine » remplis de données réelles, ouverture qui affiche « 70.3 Vichy · J-107 », puis 2e génération qui archive bien la 1re (« 1 en cours · 1 archivé »). Écran 06 vérifié avec une date à 8 semaines (repli Sprint, 51 séances, 6,3 h/sem).
    - LIMITATIONS assumées : catalogue de 1 240 courses toujours reporté (saisie libre, la mention « catalogue » du canevas n'est pas affichée puisqu'elle serait fausse) ; la date de mesure des références n'est pas affichée en G5 (le modèle du formulaire ne la porte pas, tiret plutôt qu'une date inventée) ; la section « ce qui va coincer » de l'écran 06 n'est pas implémentée (elle reposerait sur des faits que rien ne fournit) ; changer de format en G1 ne recalcule pas la date par défaut déjà proposée en G2 ; « maxi tenable » de G3 traité comme un plafond dur du volume, à confirmer côté produit.
- Now: [→] Phase 4 — poursuivre la vérification (filtres, recherche, écrans 15/16 jour multi-séances pas encore construits) puis passer Phase 5
- Next: Phase 5 — reste du « plan qui vit » (écrans 31-39 : glisser-déposer, remplacer, ajouter/supprimer, réglages du plan 37, journal), écran 04 vue macro, écrans 15/16
- Remaining:
  - [ ] Phase 4 — Bibliothèque & séances
  - [ ] Phase 5 — Plan & générateur (générateur G1-G6 + écran 06 FAITS ; reste : 04 macro, 31-39 le plan qui vit)
  - [ ] Phase 6 — Courses
  - [ ] Phase 7 — Exports
  - [ ] Phase 8 — États système & réglages
  - [ ] Phase 9 — PWA & responsive final
  - [ ] Phase 10 — Vérification finale

## Open Questions
- UNCONFIRMED: décision `.FIT` (SDK officiel vs abandon vs alternative) — à trancher avant Phase 7.
- ~~UNCONFIRMED: contenu réel des 312 séances et 1 240 courses~~ → RÉSOLU 2026-08-21 : source trouvée, voir `/home/andrea/projets/github/zoned` ci-dessous.

## Correction de fidélité visuelle (2026-08-21, après retour utilisateur)

L'utilisateur a jugé le rendu Phase 1 trop éloigné du mockup malgré des tokens corrects. Cause : les agents ont travaillé depuis mon résumé texte (`design-spec.md`) au lieu de copier le markup/CSS littéral du `.dc.html`. Correctifs appliqués à la main (pas délégués), vérifiés par capture d'écran réelle (Playwright, `localhost:5183/plan`) comparée à une capture de référence fournie par l'utilisateur :

1. **`AppHeader`** — refonte : bandeau d'app permanent "Zoned Tri" (wordmark statique, pas le nom de section dynamique) + icônes loupe et burger **sans boîte/bordure** (juste les glyphes CSS géométriques, comme le mockup), au lieu du burger encadré 40×40 précédent. `sectionName` reste en `aria-label` du `<header>` pour l'accessibilité (non affiché visuellement). Décision produit confirmée par l'utilisateur : le bandeau "Zoned Tri" EST une vraie barre d'app à construire, pas juste du chrome d'outil — malgré l'interdit "pas de logo" du Design System (le wordmark texte n'est apparemment pas considéré comme un logo graphique).
2. **`DisciplineBadge`** — bug de contraste corrigé : le composant forçait `color: var(--color-paper)` (texte clair) sur les 4 disciplines, alors que le mockup ne met du texte clair que sur V (bleu foncé) ; N/C/R utilisent du texte encre. Bug universel (affectait toutes les vignettes discipline de l'app).
3. **`AppShell` / `.main`** — ajout du cadre "affiche" : marge (`--space-gutter-mobile`/`--space-gutter-dense`) + bordure 2px encre autour du contenu, `overflow: visible` pour laisser les ombres décalées déborder du cadre (comme le bouton CTA sur l'écran 01). Confirmé cohérent avec design-spec §7 ("cadre 2px encre" documenté comme token, pas juste un artefact de présentation Claude Design).
4. **Écran 01 réel implémenté** (`src/pages/plan/OuvertureScreen.tsx`) — premier écran construit avec un vrai contenu porté depuis le markup exact du mockup (pas une interprétation), sert de référence de méthode pour les écrans suivants : lire le HTML/CSS littéral ligne par ligne, pas juste s'appuyer sur `design-spec.md`.
5. **Méthode de vérification adoptée pour la suite** : après chaque écran non trivial, prendre une capture Playwright réelle et la comparer visuellement (moi-même, avant de dire "c'est fait") plutôt que de se fier au seul passage des tests.

`Button` a aussi gagné un prop `endAdornment` (bouton pleine largeur avec flèche à droite, `justify-content: space-between`) — pattern qui revient sur au moins G1-G6 et plusieurs CTA.

**Tests : 88/88 verts, build OK, dev server tourne sur `localhost:5183`.**

## Nouvelle source de données pour Phase 4+ : `/home/andrea/projets/github/zoned`

Application "Zoned" existante (running, zoned.run) repérée par l'utilisateur comme source à réutiliser pour la bibliothèque de séances et le catalogue de courses. Aperçu rapide (pas encore exploré en profondeur) :
- `src/data/workouts/` (dont `race_pace.json`), `src/data/prebuilt-plans/`, `src/data/prebuilt-weeks/`, `src/data/strength/sessions/`
- `src/lib/planGenerator/` (`sessionBuilder.ts`, `raceWeek.ts`, `intermediateRaceWeek.ts`) — moteur de génération de plan déjà existant, à étudier avant de réinventer celui de Zoned Tri (Phase 5)
- `src/lib/workoutStructure.ts`, `workoutMetrics.ts`, `workoutAdjust.ts`, `raceSimulator.ts` — logique de calcul déjà écrite et testée (fichiers `.test.ts` présents)
- `src/lib/export/` (`raceSimPdf.ts`, `workoutHero.ts`), `src/lib/share/` — patterns d'export déjà en prod, à regarder avant la Phase 7
- **Ne pas copier aveuglément** : Zoned Tri est multi-discipline (natation/vélo/course) alors que `zoned` semble être course à pied seule (running) — à vérifier avant de réutiliser un format de séance ou un moteur de plan qui pourrait être mono-discipline. Exploration approfondie à faire en tête de Phase 4/5, pas maintenant.

## Écran S1 « Menu (burger ouvert) » refait à l'identique (2026-08-21, retour utilisateur « non conforme »)

Le menu de la Phase 1 avait été écrit depuis `design-spec.md`, pas depuis le markup littéral de
l'artboard S1 (lignes 1397-1426 du `.dc.html`) — même cause racine que la correction de fidélité
de Phase 1. Refait ligne à ligne contre le canevas, puis vérifié en comparant une capture de l'app
(mobile 390×844) à une capture de l'artboard S1 isolé rendu dans le même navigateur.

Écarts corrigés : en-tête du panneau absent (le canevas porte le mot-symbole + une croix 18 px,
le code n'avait qu'un bouton « Fermer » cerclé) ; libellés de section à 17 px bas-de-casse au lieu
de 30 px capitales `-0.05em` ; filets `border-bottom` au lieu de `border-top` + filet de fermeture
sous la 4e section ; gouttière 20 px au lieu de 16 ; texte `--color-paper` au lieu du « desk »
#EFEDE6 du canevas ; action lime centrée sans flèche au lieu d'un `space-between` libellé/flèche ;
« Méthodologie · bientôt » en une seule ligne 14 px au lieu d'une ligne à deux colonnes sous un
filet ; pied de page sans le mot « Langue », sans la pastille FR en aplat, en 9 px au lieu de 10.

Décisions :
- Compteurs (le canevas montre `sem. 07` / `312` / `2` / `12`) : chacun compte désormais ce que sa
  section montre vraiment (`src/domain/menuCounts.ts`). Plan = semaine courante du plan actif lue
  en base, « aucun plan » sinon ; Séances = `SEED_WORKOUTS.length`, c'est-à-dire le catalogue que
  la bibliothèque affiche réellement (et non le magasin IndexedDB `workouts`, qui reste vide tant
  qu'aucun plan n'a été généré — le menu aurait annoncé 0 devant un écran qui en liste 32) ;
  Courses = fiches en base. **Outils reste le « 12 » du canevas** : son écran n'existe pas, aucune
  donnée ne peut l'alimenter — placeholder assumé et commenté.
- `RootSection.placeholderCount` supprimé de `src/navigation.ts` (le rail ne s'en servait pas).
- Sélecteur de langue : « EN » rendu `disabled` plutôt que faussement cliquable — il n'y a pas d'i18n.
- `AppShell` : `isOpen={isMenuOpen && !showRail}` — un menu ouvert en mobile puis élargi jusqu'au
  desktop se referme, le rail prenant le relais.
- 3 tokens ajoutés (`--color-on-ink-text/-hairline/-muted`) : le canevas écrit sur encre avec des
  valeurs absentes de la palette papier.

LIMITATION : les cibles du menu qui pointent vers un écran non construit (`/tools`, `/settings`,
`/import-export`) mènent toujours à `PlaceholderPage`.

## Working Set
- Repo : `/home/andrea/projets/github/zoned-tri` (branche `main`)
- Repo source de données à explorer (Phase 4+) : `/home/andrea/projets/github/zoned`
- Fichiers sources design (hors repo) : `~/Downloads/Zoned TRI Brut - App.dc.html`, `~/Downloads/Zoned TRI Brut - Design System.dc.html`, `~/Downloads/Design System v1.1.dc.html`
- Commandes : `npm run dev`, `npm run build`, `npx vitest run`, `npm run lint` (oxlint)
- Dev server de vérification visuelle : `localhost:5183` (lancé en arrière-plan pendant cette session)
