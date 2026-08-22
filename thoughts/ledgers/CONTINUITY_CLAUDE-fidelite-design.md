# Continuity — Passe de fidélité design (EN PAUSE, limite d'usage utilisateur)

## Goal
Auditer puis refondre les écrans déjà construits contre le canevas (`thoughts/shared/METHODE-FIDELITE-DESIGN.md` obligatoire). Fini = tableau d'écarts par écran, classement par gravité, refonte des pires, tests/tsc/oxlint verts + vérif navigateur.

## Constraints
- L'app EST le design ; S1 · Menu validé utilisateur = référence, NE PAS TOUCHER.
- État repo protégé : 436 tests verts, tsc propre, oxlint 8 warnings préexistants. Générateur (G1→G6) fraîchement terminé.
- Agents : navigateur MCP partagé interdit en parallèle → recette headless isolée : `playwright-core` (installé en devDependency exprès) + `executablePath:'/usr/bin/google-chrome-stable'`, import par chemin absolu `node_modules/playwright-core/index.mjs`, PoC validé dans le scratchpad (`poc-audit.mjs`).

## Key Decisions
- `/plan` = Aujourd'hui (racine onglet Plan), `/plan/semaine` = Semaine — conforme canevas.
- Audit en 6 agents Opus parallèles, un par écran, zéro édition de fichier, rapports = tableaux « design X / code Y » mesurés au getComputedStyle + note /10 + effort.

## State
- Done:
  - [x] Bloc Aujourd'hui (02/02a/02b/02c/15) implémenté, vérifié, rapporté
  - [x] Méthode lue, outillage d'isolation prouvé, 6 audits LANCÉS
- Now: [→] PAUSE demandée par l'utilisateur (limite d'usage). Les 6 audits ont TOUS livré leurs mesures (résumés ci-dessous, dumps dans le scratchpad). Aucun navigateur laissé ouvert, repo intact.
- Next: classer par gravité (pré-classement à chaud : Semaine-mobile-03 et Détail-05/S4 les plus dégradés — écrans/structures manquants ; puis Bibliothèque, Générateur, Aujourd'hui, Ouverture — motif transversal chrome/encre à traiter en premier car partagé), rapporter le classement au coordinateur, puis refonte
- Remaining:
  - [ ] Classement gravité + rapport étape 1
  - [ ] Refonte écrans les plus dégradés (agents Opus, fichiers disjoints)

## Résultats partiels d'audit déjà reçus (mesurés au getComputedStyle, non rédigés)
- **Semaine** : 03 mobile = écart MAJEUR total (l'écran mobile du canevas — en-tête 46px, titre SEMAINE 07 38px, histogramme 7 barres, liste 7 jours avec ligne du jour en aplat #D6F24B, pied 81%/19% + .ICS/.PDF — n'existe pas ; le code empile les colonnes desktop). S6 desktop globalement fidèle, écarts : double bandeau (AppHeader 62px + header écran 53px vs un seul 52px), rail sans bloc contextuel semaine/jauge/J-77 ni encart jaune, nav active filet gauche vs aplat, barre 12px vs 14, 4e segment R ajouté, texte #3B3A33 vs encre #0B0B0A. Dumps : scratchpad `audit-semaine/` (d-03.json, d-s6.json, app-*.json).
- **Détail séance** : 05 MAJEUR (2 barres d'en-tête vs 1 ; retour glyphe vs carré 38×38 bordé ; fil d'Ariane faux ; barres d'effort couleur zone vs légende couleur discipline — contradiction interne ; répétitions écrasées en 1 barre ; libellés « Répétitions » vs « Corps de séance », « 10 min » vs « 12′ », « 2,3 km » vs « 2 400 m » ; badge « Z 4 » 400 papier vs « Z4 » 700 encre ; systémique : texte hérite --color-text #3b3a33 au lieu de --color-ink). S4 MAJEUR (tableau BLOC/CIBLE/REPOS absent ; méta absente ; CTA différent ; panneau 300px vs 400px sans graphe 7 barres ni « reste cette semaine » ; bug hauteur : layout 738px / enfants 896px, CTA hors écran). **28/29 = variantes par discipline, déjà partiellement en code (BikeWorkoutDetail/RunWorkoutDetail), dumps non dépouillés.** Scratchpad `audit-detail/`.
- **Générateur** : G1→G6 mesurés (06 Simulation + desktop restants). MAJEUR : double chrome 105px (AppHeader+fil d'Ariane) vs en-tête unique 46px — `AppHeader variant="detail"` existe et n'est pas utilisé ; retour glyphe vs 38×38 ; ProofBadge pilule 57×21 vs pastille+libellé mono (13 occurrences) ; ligne G1 sélectionnée désaxée 20px ; titres 40px partout vs échelle 40/40/38/36/36/40 ; CTA 46px bordé vs 51px sans bordure. Écarts assumés du code jugés corrects. Scratchpad `audit-generateur/`.
- **Motif transversal déjà visible** (à traiter en refonte, probablement via composants partagés) : double chrome AppHeader+header d'écran sur tous les écrans non-racine, bouton retour non conforme, texte en #3B3A33 là où le canevas veut l'encre #0B0B0A.
- **Aujourd'hui** : mesures terminées sur les 5 artboards (restait : ombre CTA 02c, desktop, rédaction). Écarts : titres en #3B3A51→(59,58,51) au lieu d'encre (systématique, écrase la nuance voulue en 02b) ; barre 10px de couleur vs 14 (box-sizing) et 4 segments vs 3 ; note de preuve en composant EvidenceNote vs note de bas de page mono 10px « 1. » ; légende mini-profil réécrite (2 items vs 3 « effort / éch.-RAC / repos · 30″ au mur ») ; « Reste cette semaine » AJOUTÉE dans 15 (l'artboard ne l'a pas) ; « voir la semaine → » ajouté en 02b ; dayTitle 34 vs 32px (15) ; durée dupliquée (15) ; « 2400 m » sans séparateur ; « dérive » tronqué ; blocs bordés 4px trop petits (border-box) ; pause sans motif non représentable. Dumps : scratchpad `audit-aujourdhui/`.
- **Bibliothèque** : mesures faites pour 07, S5, 40, 25, 26 (25 non dépouillé, verdict non rédigé). MAJEUR — 07 : en-tête « Zoned Tri » 62px vs « Séances » Space Mono 46px ; ZoneBadge 9px w400 crème vs 10px w700 encre ; carré discipline ajouté sur chaque ligne (canevas : 1 seul, à droite, 1re ligne) ; tag BRICK inventé ; bande 14px vs 18. S5 : contrôles Filtres/Tri/.PDF sortis de l'en-tête (commentaire CSS faux lignes ~1690-99 du module) ; titre 24px w600 vs 17px w700 capitales ; rail actif invisible (`border-left:3px` déclaré mais border-style:none) ; bloc « Bibliothèque 312/37 » absent du rail ; pieds de liste absents ; composition de ligne inversée. 40 : sliders natifs vs gabarit carrés 14px ; Matériel/Lieu fusionnés ; libellés longs vs codes N/V/C/R ; voile 0.5 vs 0.12 ; poignée absente. 26 : cascade de coûts et « Les plus proches » absents ; ombre lime vs 5px 5px 0 #FF6A1F. Scratchpad `audit-bibliotheque/` (m-design-*/m-app-*).
- **Ouverture** : mesures terminées (6 artboards vs 6 rendus). MAJEUR — titre héros desktop 96px vs 104px (ls -5.72px, bloc 256px) sur S9/S9b/S9c ; couleur ambiante (59,58,51) vs encre (11,11,10) sur cardHeadline/calloutTitle/panelLabelDesktop ; en-tête mobile AppShell 62px vs 46px (padding et ls du wordmark faux) → débordement à 390×780 (786/806px). MINEUR — border-box (frise 12 vs 14px, CTA 44/48 vs 48/52, rangée desktop 56 vs 60) ; badge 28×28 vs chip 18×19 ; rythmes normalisés vs variés ; 2 libellés inexacts. Dumps : scratchpad `audit-ouverture/`.
- **LES 6 AUDITS ONT TOUS LIVRÉ LEURS MESURES** (rédaction des tableaux notés interrompue par la pause — les dumps du scratchpad suffisent pour la refonte). (agents stoppés en vol — relancer via SendMessage ou relire leurs notifications si arrivées après la pause).

## Open Questions
- UNCONFIRMED: 28/29 = variantes du détail séance ou écrans distincts (l'agent détail devait trancher)
- UNCONFIRMED: rapports partiels des 6 audits exploitables ou à relancer

## Working Set
- Branche main, non commité. Scratchpad session : /tmp/claude-1000/-home-andrea-projets-github-zoned-tri/e2a413bd-8cf1-420c-b671-085512b0b302/scratchpad/ (poc-audit.mjs, sous-dossiers audit-*)
- Vérifs : `npx vitest run` · `npx tsc -b` · `npx oxlint` ; dev server localhost:5173 ; nettoyage racine `rm -f *.png && rm -rf .playwright-mcp`

## Lot 1 — journal d'avancement

- **2026-08-21 · Chantier 1 (chrome unique) — code posé, vitest 435 vert, tsc 0, oxlint 8 (inchangé).**
  Mécanisme retenu : **la coquille ne rend plus AUCUN bandeau ; chaque écran rend le sien** via
  `AppHeader` (3 variantes : `root` / `opening` / `detail`), la coquille ne fournissant que
  burger + recherche (`src/context/shellChrome.ts` + `ShellChromeContext.tsx`). C'est ce que dit
  le canevas : chaque artboard commence par sa propre barre, dont le contenu est propre à l'écran.
  `HeaderCounterContext` → `RailBlockContext` (le compteur S5 vit dans le RAIL, pas dans la barre).
  Fichiers : `src/components/ui/AppHeader/{AppHeader.tsx,.module.css,.test.tsx}`,
  `src/components/ui/BackSquare/{BackSquare.tsx,.module.css}`, `src/components/AppShell.{tsx,module.css}`,
  `src/components/AppShell.test.tsx`, `src/components/AppShellSearch.test.tsx`,
  `src/context/{shellChrome.ts,ShellChromeContext.tsx,RailBlockContext.tsx}` (HeaderCounterContext.tsx supprimé),
  `src/styles/tokens.css` (--shell-header-height 62→52, +--screen-header-height-mobile 46px),
  `src/setupTests.ts` (stub matchMedia : useBreakpoint est désormais appelé dans tout l'arbre),
  `src/pages/ouverture/OuvertureScreen.tsx`, `src/pages/plan/{TodayScreen.tsx,SemaineScreen.tsx,SemaineScreen.module.css,SemaineScreen.test.tsx}`,
  `src/pages/workouts/{WorkoutsScreen.tsx,WorkoutsScreen.module.css,WorkoutsScreen.test.tsx}`,
  `src/pages/workouts/detail/DetailBreadcrumb.tsx` (+ 4 gabarits, DetailBreadcrumb.module.css supprimé),
  `src/pages/generator/{GeneratorStepFrame.tsx,GeneratorStepFrame.module.css,SimulationScreen.tsx,SimulationScreen.module.css}`,
  `src/pages/PlaceholderPage.tsx`, `src/pages/workouts/detail/WorkoutDetailScreen.test.tsx`.
  Reste : mesures navigateur (non encore faites), chantiers 2 (fait au passage : BackSquare partout), 3 et 4.
- **2026-08-21 · Chantiers 3 (encre) et 4 (hauteur du détail) — verts (435 tests, tsc 0, oxlint 8).**
  Encre : hypothèse CONFIRMÉE au markup (canevas l. 22 pose `color:#0B0B0A` sur la racine, les
  artboards héritent ; #3B3A33 est toujours explicite). Correction faite au bon endroit :
  `body { color: var(--color-ink) }` dans `src/index.css` + commentaire de règle dans `tokens.css`.
  Vérifié par diff getComputedStyle avant/après sur 6 routes × 2 breakpoints : 41 bascules, toutes
  légitimes (titres 01/02/05/07/S6, valeurs de stats, lignes de blocs, mot-symbole du rail) ; les
  #3B3A33 voulus (prose 02a, corps d'encart, libellés de rail, titre 02b `.doneTitle`) sont restés.
  Hauteur : cause racine = colonne de grille sans `min-height:0` (donc `min-height:auto` = hauteur
  du contenu) sous `.shell{height:100svh;overflow:hidden}` → aucun conteneur ne pouvait défiler.
  Corrigé dans `WorkoutDetailScreen.module.css` (`.main`) et `WorkoutContextPanel.module.css`.
  Aussi : `TodayScreen` — bandeau sorti de la colonne bornée 560px (S4 : la barre court sur toute
  la largeur), `.dayHeader` repassé de `header` à `div` (c'est du contenu, pas un bandeau).
  Reste : recette navigateur écran par écran + vérif S1 inchangé + rapport.
- **2026-08-21 · Recette navigateur passée, LOT 1 TERMINÉ.** 435 tests verts, tsc 0, oxlint 8.
  Mesuré au getComputedStyle (scripts dans le scratchpad `lot1-chrome/` : lib.mjs, recette.mjs,
  colors.mjs, detail-height.mjs, shots.mjs) :
  - mobile 390 : 1 bandeau par écran, 46 px, filet 2px encre, retrait `0 16px` (racine/ouverture)
    ou `0 14px 0 12px` (non racine) ; carré de retour 38×38, bord 2px encre, flèche SVG 20 px sur
    Semaine, Détail, Générateur ; aucun débordement à 390×780 (l'ouverture débordait avant).
  - desktop 1280 : 1 bandeau de 52 px à droite du rail 236 px (en-tête de rail 52 px, filets
    alignés), titre 17px/700/-0.51px ; ouverture desktop = 0 bandeau, 0 rail (S9).
  - détail desktop : layout 596 px dans 648 px, `.main` devient conteneur de défilement
    (scrollHeight 890-1006 / clientHeight 596), CTA atteignable — le bug 738/896 est mort.
  - S1 · Menu STRICTEMENT inchangé (fichiers non touchés, panneau mesuré 390×844, encre #0B0B0A,
    texte #EFEDE6, mêmes entrées).
  Dernier remaniement du lot : le bandeau du détail est remonté dans `WorkoutDetailScreen`
  (hors de la grille) — sur S4 la barre court au-dessus des deux colonnes ; `showBreadcrumb` et
  `DetailBreadcrumb` supprimés, les 4 gabarits ne rendent plus que du contenu.
  Écarts assumés restants : pas de loupe dans le bandeau desktop (le canevas n'en met pas — la
  recherche plein écran n'est donc atteignable qu'en mobile, à arbitrer) ; compteur d'étape
  « 01 / 06 » absent du bandeau desktop du générateur (pas d'artboard desktop, StepDots reste) ;
  rail 236 px vs 240 px du canevas (écart préexistant, hors lot).

## Lot 2 — journal (écran Semaine : artboards 03 mobile + S6 desktop)

- **2026-08-21 · 03 mobile CONSTRUIT + S6 corrigé — vert.** 15 tests d'écran (7 mobile / 7 desktop
  + ids introuvables) et 18 tests `planWeek`, tsc 0 sur mes fichiers, oxlint 8 (inchangé).
  Fichiers : `src/pages/plan/SemaineScreen.{tsx,module.css,test.tsx}`, `src/domain/planWeek.{ts,test.ts}`.
  - **Le DOM diffère réellement** entre 03 et S6 → bascule en `useBreakpoint()` (`MobileWeek` /
    `DesktopWeek`), le `@media` ne garde plus que le bornage de hauteur desktop. La rangée
    `mobileActions` (inventée, faute d'artboard 03) est SUPPRIMÉE : le volume rejoint le titre et
    les exports descendent dans le pied de page, comme le canevas.
  - 03 posé littéralement : titre 38 px/700/lh .9/ls -.05em, barre 14 px filetée 2 px en haut ET
    en bas, ligne N/V/C mono 11 px, histogramme 7 barres de 84 px (hauteur ∝ jour le plus chargé,
    couleur = discipline dominante du jour), liste des jours (ligne PAR séance, quantième écrit
    une seule fois par jour), ligne du jour en aplat `#D6F24B` débordant de 8 px sur la gouttière,
    pied 81 % / 19 % + `.ICS` / `.PDF`. Les lignes ouvrent `/workouts/:id` (légende de 05 :
    « depuis Aujourd'hui ou Semaine → appui sur une séance »).
  - S6 : barre de répartition remise à **14 px de couleur** (`box-sizing: content-box` — le
    `border-box` global la rognait à 12 px) et ramenée à **3 segments** (`TRIATHLON_DISCIPLINES` :
    03 l. 426 et S6 l. 1811 en comptent trois alors que les deux semaines dessinées portent une
    séance de renfo). Pastilles `line-height: normal` (19 px comme l'artboard, pas 18).
  - Trois bogues trouvés uniquement au navigateur : le `<button>` de ligne se dimensionnait au
    contenu (filet bas coupé au milieu de la liste) ; la ligne du jour perdait 16 px de largeur ;
    la barre de répartition perdait 2 px de couleur.
  - Mesures : scratchpad `lot2-semaine/` (lib.mjs, m03.mjs, mS6.mjs, demo-check.mjs, d-*.json,
    a-*.json, captures). Reliquat 03 = 25 écarts, S6 = 24, tous expliqués (cadre 2 px de
    l'artboard, données réelles vs données dessinées, capitales littérales vs `text-transform`,
    boutons désactivés en encre inactive, rail hors périmètre).
  - **Écarts assumés / hors périmètre** : rail desktop sans jauge 8 px, sans « J-77 · 70.3 Vichy »
    ni encart jaune, et `railBlockLines` en 11 px/#3B3A33 au lieu de 10 px/#5B594F → tout cela
    vit dans `AppShell` + `RailBlockContext` (interdits ce lot) ; `.ICS`/`.PDF`/« Bloquer la
    semaine » désactivés en encre inactive (rien n'est branché) ; durée notée `45′` et non
    « 45 min » (le canevas mélange les deux, S6 tient le `′`) ; titre de séance non grisé pour une
    séance « optionnelle » (le modèle n'a pas ce drapeau) ; `BackSquare` à 13,33 px de font-size
    (valeur UA du `<button>`, sans effet — il ne contient qu'un SVG).
