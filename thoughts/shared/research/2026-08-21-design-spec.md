# Zoned TRI Brut — Cahier des charges de design (issu des mockups Claude Design)

Source des données : lecture intégrale ligne par ligne des trois fichiers `.dc.html` (mockups HTML statiques, PAS du code applicatif).

- `/home/andrea/Downloads/Zoned TRI Brut - App.dc.html` (2938 lignes) — 51 écrans mockés au total.
- `/home/andrea/Downloads/Zoned TRI Brut - Design System.dc.html` (410 lignes) — design system spécifique au projet, faisant foi.
- `/home/andrea/Downloads/Design System v1.1.dc.html` (1059 lignes) — design system **générique antérieur**, pour une autre famille de produits (« month. », « habit. »). Visuellement sans rapport avec Zoned Tri (monospace système partout, fond `#f2f3f2`, aucun brutalisme d'affiche). Utilisé ici seulement comme filet pour des principes transverses génériques (a11y, i18n, format d'export) quand le fichier spécifique ne précise pas un point — voir section 7.

**Correction de comptage** : le titre de l'app annonce « 41 écrans » et le brief de mission en mentionnait 47. Le compte exact des `data-screen-label` distincts dans le fichier est **51** : écrans numérotés 01 à 41 (41 écrans du parcours principal) + G1 à G6 (6 écrans du générateur de plan) + S1 à S4 (4 écrans système/réglages/nav). Le nombre « 41 » dans le titre de l'app désigne donc uniquement les écrans numérotés de la colonne principale ; G* et S* sont des annexes documentées séparément dans le même fichier. À traiter les 51 comme le périmètre réel.

---

## 0. Faits produits globaux (vérifiés dans le texte)

- **312 séances** au total dans la bibliothèque : natation 84, vélo 96, course 88, repos/renfo 44 (ligne 65-84, écran 01). Écran 40 confirme un découpage différent en filtre disciplines : N 84, V 96, C 88, **Brick 24**, R 20 (ligne 2803-2807) — « Brick » (enchaînements) est donc une sous-catégorie visible séparément dans les filtres, alors que le décompte de l'écran 01 la fond dans les 44 « repos/renfo » ou dans N/V/C. Léger écart à clarifier en implémentation (84+96+88+44=312 vs 84+96+88+24+20=312 — les deux sommes tombent juste à 312, donc "Brick" chevauche probablement N/V/C plutôt que d'être une 5e catégorie strictement additive).
- **Générateur de plan en 6 étapes** (G1-G6).
- **1 240 courses** au catalogue (ligne 466, écran G1 : « catalogue de 1 240 courses »).
- **Aucun compte, aucun cloud, 100 % local/offline-first.** Confirmé explicitement à de multiples endroits : écran 01 (« Pas de compte, pas de suivi automatique »), G1 (« Aucune donnée envoyée : tout reste sur l'appareil »), écran 20 (« Rien ne part sur un serveur, aucun compte n'est créé »), écran S2 (« v 1.4 · aucun compte »).
- **Pas de barre d'onglets.** Navigation unique via panneau burger plein écran (S1). Confirmé dans le Design System (« Pas de logo dans l'app », « Une barre d'onglets » listée dans les interdits, ligne 356).
- **Version affichée** : « v 1.4 · hors ligne » (écran S1, ligne 1166 ; écran S2 « v 1.4 · aucun compte »).
- **Langues** : FR (référence, 100 %) / EN (partiel — interface 100 %, séances 46 %, notes et sources 12 %). Écran S3.
- **support.js** : uniquement référencé en `<script src="./support.js">` (ligne 6 des deux fichiers App et Design System), fichier absent du dossier Downloads, et non trouvé inline nulle part dans les 2938 lignes du fichier App. Le seul bloc `<script>` inline présent est le bloc `data-dc-script` de fin de fichier (lignes 2903-2936), qui ne contient que la config de démonstration du canvas Claude Design (thème clair/sombre, appareil mobile/tablette/desktop, langue FR/EN) — **confirmé : aucune logique métier n'y est cachée**, à ignorer pour l'implémentation.

---

## 1. Catalogue des 51 écrans

Regroupés par section thématique telle que présentée dans le fichier source (numérotation `01` à `11` = sections, distincte de la numérotation d'écran).

### Section « 01 · Plan » (écrans 01-06) — Accueil / dashboard / onboarding

| # | Titre | Ligne | Rôle | Données affichées/éditées | Navigation |
|---|---|---|---|---|---|
| 01 | Ouverture | 53 | Onglet Plan, 1er lancement, aucun plan actif | Titre « Nager Rouler Courir », barre de répartition disciplines (27 % N / 31 % V / 28 % C / 14 % R), compteur séances par discipline (84/96/88/44) | → « Générer mon plan » (vers G1) ; → « Parcourir les 312 séances » (vers bibliothèque, écran 07) |
| 02 | Aujourd'hui | 99 | Onglet Plan, dès qu'un plan est actif — écran d'accueil quotidien | Semaine 07/18, date, séance du jour (discipline, zone, titre, distance/durée/allure, graphique de déroulé), reste de la semaine (3 séances suivantes), note de preuve numérotée | « Marquer comme faite » ; → détail séance (05) ; → semaine (03) |
| 03 | Semaine | 162 | Vue hebdomadaire, accessible depuis Aujourd'hui | Semaine 07, volume total (8h10), répartition N/V/C, graphique en barres 7 jours, liste des 7 jours avec discipline/titre/durée/zone, coché ✓ pour fait, « AUJ. » pour le jour courant, footer 81%/19% facile/dur, exports .ICS/.PDF | → vue macro (04) ; → détail séance |
| 04 | Vue macro | 239 | Vue du plan complet (18 semaines) | Objectif « 70.3 Vichy », 30 août, J-77, compteurs SÉANCES 77 / HEURES 133h / FAITES 7/18, graphique volume hebdo 18 semaines coloré par phase, liste des 4 phases (Base 4 sem FAIT, Construction 8 sem 7/8, Spécifique 3 sem, Affûtage 3 sem, volume −45%), exports .PDF/.ICS, 2 notes de preuve (Bosquet 2007 affûtage solide ; règle des 10% non démontrée écartée) | Retour arrière |
| 05 | Séance · pourquoi | 307 | Détail d'une séance avec justification (bordure orange #FF6A1F = accent) | « Pyramide CSS », distance 2400m, durée 55min, graphique de déroulé, 3 blocs (échauffement/corps/retour au calme) avec durées, encart « Pourquoi cette séance » avec badge preuve SOLIDE, note Wakayoshi 1992, exports .FIT/.PNG | « Marquer comme faite » |
| 06 | Simulation | 373 | Repli automatique quand l'objectif est trop juste en délai (bordure pointillée = rien n'écrit) | « Olympique 11 semaines » proposé en repli du 70.3 refusé, compteurs SÉANCES 77 / H/SEM 7,4 / AFFÛTAGE 2 sem, répartition d'intensité Z1-Z2 78% / Z3 8% / Z4+ 14%, avertissement sur ce qui « va coincer » (natation +40%), note distribution polarisée | « Utiliser ce plan olympique » ; « Générer le 70.3 quand même » |

### Section « 01·B · Générer un plan » (G1-G6) — Générateur de plan, 6 étapes, un seul écran qui progresse

Voir section 4 dédiée ci-dessous pour le détail complet des 6 étapes.

### Section « 02 · Séances » (écran 07) — Bibliothèque

| # | Titre | Ligne | Rôle | Données | Navigation |
|---|---|---|---|---|---|
| 07 | Bibliothèque | 718 | Onglet Séances, liste filtrable des 312 séances | Répartition disciplines, bouton Filtres (badge « 3 » = nb de filtres actifs), tri (durée ↑), export .PDF, puces de filtres actifs retirables (Natation ✕, Z2·Z4 ✕, 45-60min ✕, « Tout retirer »), compteur « 37 séances sur 312 », liste de séances (badge zone, titre, durée/lieu, pastille discipline) | → détail séance ; → feuille de filtres (écran 40) |

### Section « 03 · Courses » (écrans 08-11) — Fiches course

| # | Titre | Ligne | Rôle | Données | Navigation |
|---|---|---|---|---|---|
| 08 | Fiche course | 785 | Onglet Courses, fiche détaillée d'une course objectif | « 70.3 Vichy », 30 août, J-77, distances N/V/C (1,9km/90km/21,1km), profil altimétrique vélo (720m D+, segments >4% pente en surbrillance), température eau 19,5°C, combinaison autorisée, drafting interdit, ravitos km 30/60 | → Plan de pacing (09) ; → Plan nutrition (10) ; → Timeline jour J (11) |
| 09 | Pacing | 831 | Plan d'allure segment par segment | Temps cible 7:08:30, tableau N/T1/V/T2/C avec allure cible et cumul, encart « Pourquoi 0,78 au vélo » (IF, preuve MODÉRÉE), export fiche | Retour |
| 10 | Nutrition | 893 | Plan glucides/hydratation course | 348g de glucides sur 4h45 (78g/h, ratio glucose+fructose 2:1), répartition vélo 236g / course 112g, liste « à emporter » (bidons, gels, barres, eau 2,8L), encart sodium ~600mg/h (preuve FAIBLE) | Retour |
| 11 | Jour J | 934 | Timeline du jour de course | Timeline « la veille » (dépôt vélo, repas, coucher) et « à rebours du départ » (réveil 04:20, petit-déj 2g glucides/kg, ouverture parc, échauffement, gel, départ 07:20) | → Checklist parc (30) ; export .ICS |

### Section « 04 · Outils » (écrans 12-14) — Références, calculateurs, import/export

| # | Titre | Ligne | Rôle | Données | Navigation |
|---|---|---|---|---|---|
| 12 | Profil athlète | 990 | Racine Outils, références de l'athlète | CSS 1:32/100m, FTP 248W (3,4 W/kg), Seuil 4:12/km (VMA 17,2), poids 72,5kg, taux sudation 1,1L/h, FC max 186bpm, note preuve FAIBLE sur l'estimation FTP à 95% d'un test 20min | → Calculateurs (13) |
| 13 | Calculateur (exemple : Bassin → eau libre) | 1037 | Vue type d'un calculateur, ici « 04/12 » | Input allure bassin 1:32/100m + combinaison oui + sighting tous les 6 cycles ; output estimation eau libre 1:41/100m (fourchette 30:10-34:20), note preuve FAIBLE | Retour |
| 14 | Import / export · sources | 1087 | Explique le remplacement de la synchro cloud + liste les sources scientifiques utilisées | Tableau des 4 exports (.FIT séance→montre, .ZWO séance→HT, .ICS plan→agenda, .JSON sauvegarde complète), liste « Sources du moteur » (Bosquet 2007 utilisé, Jeukendrup utilisé, Wakayoshi 1992 utilisé, règle des 10% écartée, ACWR écartée) | Retour |

### Section « 05 · Système » (S1-S4) — Menu burger, réglages

Voir section 8 « Navigation » ci-dessous pour le détail complet.

### Section « 06 · Jour chargé » (écrans 15-16) — Règle d'affichage multi-séances/jour

| # | Titre | Ligne | Rôle | Données | Navigation |
|---|---|---|---|---|---|
| 15 | Aujourd'hui · 2 séances | 1401 | Le jour possède une pile : une carte par séance, numérotée | Samedi 29 août, « 2 séances », cumul 3h05, cartes « 1/2 · 09:00 · Séance clé » (vélo) et « 2/2 · 11:50 · Enchaînement » (course), note « Pourquoi les deux le même jour » (preuve MODÉRÉE) | Marquer chaque séance faite séparément ; export .ICS/.PDF |
| 16 | Semaine · jours doublés | 1475 | Dans la liste hebdo, le jour doublé n'est écrit qu'une fois avec un filet 2px reliant ses séances | Semaine 12, 11h20, 10 séances/6 jours dont 3 doublés, liste 7 jours avec sous-listes 1/2 · 2/2 pour mar/jeu/sam | Retour |

### Section « 07 · États système » (écrans 17-19) — États d'erreur / hors-ligne

Voir section 6 « États d'erreur et cas limites » ci-dessous.

### Section « 08 · Exports & impression » (écrans 20-24) — Formats d'export

Voir section 5 « Import/export & PDF/ICS » ci-dessous.

### Section « 09 · Recherche & impasses » (écrans 25-27) — Recherche, résultats vides, liste des courses

| # | Titre | Ligne | Rôle | Données | Navigation |
|---|---|---|---|---|---|
| 25 | Recherche en place | 1905 | La loupe de l'en-tête ouvre une recherche in-place (jamais un nouvel écran) | Requête « seuil vélo », 48 résultats en 3 natures : Séances (41, dont 4 exemples), Calculateurs (2 : « FTP → zones de puissance » 03/12, « Test 20 min → seuil » 07/12), Dans mon plan (5, dont 2 exemples) | « Annuler » restaure l'écran identique |
| 26 | Rien à ce croisement | 1957 | Résultat vide à 4 filtres cumulés (Natation × Z6 × <30′ × Eau libre) | Message expliquant le filtre le plus restrictif (durée), chaîne de réduction 84→7→3→0, 2 séances « les plus proches » (Z6, hors eau libre ou hors durée) | « Élargir à <45′ » ; « Retirer le lieu » |
| 27 | Mes courses | 1998 | Racine Courses quand il y en a plusieurs | 4 courses dont 1 passée, carte « Objectif principal » (70.3 Vichy, cible 7:08:30), 2 courses de préparation (badge PRÉPA, jours faciles avant), 1 course passée (Sprint de Senlis, résultat 1:18:42, 12s de mieux que la cible) | « Ajouter une course » |

### Section « 10 · Détails de séance » (écrans 28-30) — Vue vélo/course/checklist

| # | Titre | Ligne | Rôle | Données | Navigation |
|---|---|---|---|---|---|
| 28 | Séance vélo | 2067 | Cibles en watts et %FTP, repli FC (bordure bleu #2F6BE0) | « 3 × 12′ au seuil », durée 1h05, cible 238W, IF 0,88, graphique %FTP, tableau blocs/watts/cadence, encart « Sans capteur de puissance » (161-172bpm), note preuve MODÉRÉE sur durée des blocs, exports .ZWO/.FIT | « Marquer comme faite » |
| 29 | Séance course | 2126 | Allures au kilomètre (bordure rouge-orange #FF5A3C) | « 6 × 1 000 m au seuil », volume 13km, allure 4:12, durée 1h02, tableau répétitions/allure/temps, note preuve SOLIDE (régularité > vitesse), exports .FIT/.PNG | « Marquer comme faite » |
| 30 | Checklist parc à vélo | 2186 | Checklist cochable hors-ligne, promise depuis fiche course et jour J | Progression 14/22, sections « Emplacement T1 », « Sur le vélo », « Emplacement T2 » avec cases à cocher, exports .PDF/.PNG | Retour |

### Section « 11 · Le plan qui vit » (écrans 31-41) — Interactions d'édition du plan

| # | Titre | Ligne | Rôle | Données | Navigation |
|---|---|---|---|---|---|
| 31 | Séance faite · annuler 6s | 2251 | Confirmation d'action réversible sans dialogue | Séance barrée, bandeau lime « Séance marquée faite / Annuler », barre de temps 6s, impact sur volume fait de la semaine | « Annuler » (6s) |
| 32 | Dépôt coûteux · à confirmer | 2302 | Seul cas où le drag-and-drop demande confirmation : 2 intensités le même jour (bordure pointillée) | Séance « Longue 1h40 » glissée dim→mar, sélecteur de jour (jours grisés indisponibles), encart « Ce que le décalage coûte » (preuve MODÉRÉE), tableau Avant/Après (jours doublés 0→1, facile/dur 81/19→79/21) | « Confirmer le dépôt du mardi » ; « Prendre samedi » ; « Supprimer » |
| 33 | Test 30 min CLM | 2358 | Saisie d'un résultat de test, recalcul immédiat des allures | Distance 7140m, seuil déduit 4:12/km (14,3km/h, VMA estimée 17,2), tableau zones Avant/Après, note « 22 séances de course à venir seront réécrites, l'historique jamais » (preuve SOLIDE) | « Enregistrer le seuil » ; « Garder l'ancien » |
| 34 | Glisser pour déplacer | 2410 | Drag direct sans écran intermédiaire | Semaine avec zones de dépôt (« Déposer ici », « Déposer en 1re/2e position »), jour indisponible hachuré, badge « MEILLEUR » sur jour libre sans intensité, encart « Si tu relâches sur mardi » | Glisser-déposer |
| 35 | Remplacer une séance | 2481 | Glissement latéral sur la ligne, 3 exécutions pour la même intention | Séance actuelle vs 3 alternatives (même intention seuil course) avec deltas (−10min même charge / −12min charge −15% / discipline changée), note preuve SOLIDE (temps au seuil compte, pas la forme) | « Remplacer par 3×12′ » ; « Chercher dans les 312 séances » |
| 36 | Ajouter · supprimer | 2548 | 4 gestes visibles (≡ glisser, ⇄ remplacer, × supprimer, + ajouter), suppression sans confirmation | Jeudi 27 août, swipe gauche = « Supprimer », bandeau annulable 6s, encart « Les deux seules confirmations : supprimer un plan entier · supprimer une course », suggestions d'ajout (2 max, basées sur ce qui manque) | Swipe, tap |
| 37 | Réglages du plan | 2619 | Les 6 étapes du générateur restent modifiables une par une après acceptation | Tableau réglage/valeur/impact (format+course = tout, date = tout, volume = à venir, jours = à venir, matériel = séances, semaines réduites = à venir), liste « Décisions prises par le moteur » (longues sorties samedi, 78% Z1-Z2, affûtage 2 sem, natation 2×/sem) chacune « Changer » | → Journal (39) ; « Refaire le plan » |
| 38 | Avant/après | 2680 | Tout changement de réglage passe par cet écran pointillé, portée choisie | Volume 7h30→9h00, 3 portées (cette semaine / semaines à venir ✓ / tout le plan), tableau Avant/Après semaine 08 (séances 7→9, doublés 0→2, facile/dur 81/19→80/20), note preuve MODÉRÉE | « Appliquer aux 11 semaines » ; « Garder 7h30 » |
| 39 | Journal du plan | 2731 | Historique daté de toutes les actions moteur/utilisateur, chacune annulable 30j | 14 entrées, légende toi (encre) / moteur (gris), chaque entrée avec motif + bouton « Défaire », encart « Ce que le moteur ne fera jamais seul » | « Défaire » par entrée |
| 40 | Feuille de filtres | 2790 | Bottom-sheet complète du filtrage (la liste ne garde que 2 boutons) | Discipline (N84/V96/C88/Brick24/R20), Zone (Z1-Z6 toggle), Durée (slider 45-60′), Matériel/Lieu (checkbox), compteur « 37 sur 312 » | « Tout retirer » ; « Voir les 37 séances » |
| 41 | Ouverture avec plans existants | 2850 | L'écran 01 ne revient jamais une fois un 1er plan créé : reprise / archive / second plan | « 1 en cours · 2 archivés », carte plan en cours (70.3 Vichy, semaine 07/18, prochaine séance), liste archivés (Sprint de Senlis terminé, Hiver base abandonné sem.09) avec « Rouvrir », encart « Si tu en génères un second : l'ancien passe en archive » | « Reprendre » ; « Rouvrir » ; « Générer un nouveau plan » |

---

## 2. Les 12 calculateurs

**Constat important** : le mockup mentionne « 12 calculateurs » à plusieurs endroits (écran 12 « Ouvrir les calculateurs », section 04 « 12 calculateurs », compteur « Calculateur 04/12 » sur l'écran 13) mais **ne présente aucun écran listant les 12 par leur nom**. Seuls **3 calculateurs sont nommés explicitement avec leur index** dans le texte (via l'écran de recherche, écran 25, et l'écran calculateur détaillé, écran 13) :

| Index | Nom exact (mockup) | Ligne source | Inputs visibles | Outputs visibles | Formule/méthode mentionnée dans le texte |
|---|---|---|---|---|---|
| 03/12 | **FTP → zones de puissance** | 1940 | FTP (W) — déduit implicitement | Zones de puissance vélo (Z1-Z6 en watts, ex. Z4 211-260W visibles sur l'atlas écran 21) | **Non explicitée dans le mockup.** L'atlas des zones (écran 21) montre des bornes en % vraisemblables mais aucun pourcentage n'est écrit noir sur blanc à côté de FTP — à documenter avec les zones Coggan usuelles lors de l'implémentation, en le signalant comme un choix externe au mockup. |
| 04/12 | **Bassin → eau libre** | 1047 (titre écran 13) | Allure bassin 25m (ex. 1:32/100m), combinaison (oui/non), fréquence de sighting | Estimation allure eau libre (ex. 1:41/100m) avec fourchette (30:10-34:20 sur 1,9km) | Explicitement qualifiée de **preuve FAIBLE** : « La conversion additionne trois effets mal quantifiés : plus de virages, flottaison de la combinaison, coût du sighting. » Aucune formule numérique donnée — uniquement le principe (3 facteurs additifs) et l'avertissement que la fourchette est large. **Formule arithmétique non explicitée — à documenter avec une source lors de l'implémentation.** |
| 07/12 | **Test 20 min → seuil** | 1941 | Résultat d'un test de puissance/allure de 20 minutes | Seuil (FTP ou allure seuil course) | **Non explicitée dans le mockup** au niveau de cet écran précis, mais le principe général de la conversion « test 20 min → 95 % = FTP » (protocole Coggan classique) est cité ailleurs dans le texte : écran 12, note 7 : « Estimée à 95 % d'un test de 20 min : heuristique de terrain, pas un protocole validé. » C'est la seule formule *chiffrée* explicite du corpus (**FTP ≈ 0,95 × puissance moyenne sur 20 min**), qualifiée de preuve FAIBLE dans le texte (l'app recommande un test de puissance critique comme alternative plus juste). |

**Les 9 autres calculateurs ne sont pas nommés dans le mockup.** Ce qui est déductible du reste du contenu (fonctions équivalentes rencontrées dans l'app, à confirmer/nommer lors de l'implémentation — **ce ne sont pas des calculateurs confirmés par le texte, seulement des fonctions de calcul qui existent ailleurs dans l'app et qui pourraient recouper la liste des 12** ; à ne pas prendre pour argent comptant sans clarification utilisateur) :

- **Test 30 min (course) → allure seuil** — vu en pleine page sur l'écran 33 (Distance 7140m sur 30min → 4:12/km, VMA estimée 17,2km/h). Fonctionnellement très proche d'un calculateur mais présenté comme une étape du parcours « plan qui vit », pas explicitement comme l'un des 12.
- **CSS (vitesse critique natation) via test 400/200** — mentionné écran 12 (« test 400/200 ») et sourcé Wakayoshi et al. 1992. Aucune formule chiffrée donnée dans le texte, seulement la méthode nommée (protocole 400m/200m).
- **CSS/Seuil/FTP → atlas complet des 6 zones par discipline** — l'écran 21 (Atlas des zones) affiche un tableau à 6 zones × 3 disciplines (natation /100m, vélo watts, course /km) + FC, entièrement calculé depuis CSS 1:32, FTP 248W, Seuil 4:12 — mais aucune formule de dérivation des bornes de zone n'est donnée dans le texte (seulement les valeurs résultantes). Ce calcul de zones (probablement plusieurs calculateurs par discipline) pourrait constituer 1 à 3 des 12 calculateurs restants.
- **Nutrition course : g/h × durée = total glucides** — écran 10 (78 g/h × 4h45 = 348g). C'est une simple multiplication affichée, pas nécessairement un « calculateur » séparé dans le menu Outils, plutôt intégré à la fiche course.
- **Sodium** — écran 10 (~600mg/h), présenté comme un repère fixe plutôt qu'un calcul personnalisé, preuve FAIBLE.
- **Intensity Factor (IF) vélo** — écran 09 (pacing, IF 0,78) et écran 28 (IF 0,88 séance). Valeur affichée sans formule ; IF = puissance normalisée / FTP est la définition standard du domaine (non citée dans le texte comme telle, à documenter en implémentation).
- **Pacing course (temps cible → allures par segment)** — écran 09, calcul complexe multi-segments (N/T1/V/T2/C) avec cumul, mais présenté comme une fonctionnalité de la fiche course plutôt qu'un calculateur listé.

**Conclusion pour l'implémentation** : seuls 3 calculateurs sur 12 ont un nom et un index confirmés par le texte du mockup (03, 04, 07). Les 9 restants (indices 01-02, 05-06, 08-12) ne sont ni nommés ni indexés nulle part dans les 2938 lignes lues. **Il faudra demander à l'utilisateur la liste complète des 12 calculateurs** avant implémentation, ou accepter de la construire à partir des fonctions de calcul déjà visibles ailleurs dans l'app (zones par discipline, pacing, nutrition, IF, tests) en le signalant clairement comme une extrapolation non confirmée par le design.

---

## 3. Modèle de données implicite

Déduit de ce qui est affiché/édité dans les 51 écrans (noms de champs en français, proposition de nommage technique en anglais entre parenthèses à titre indicatif seulement) :

### Profil / Athlète (`AthleteProfile`)
- poids (kg) — écran 12 : 72,5 kg
- taux de sudation (L/h) — écran 12 : 1,1 L/h
- FC max mesurée (bpm) — écran 12 : 186
- références par discipline : CSS (allure /100m + date de mesure), FTP (watts + date + W/kg dérivé), seuil course (allure /km + date + VMA dérivée)
- langue (FR/EN), thème (clair/sombre/système), unités (distance km, allure natation /100m, température °C)

### Séance (`Workout`)
- id, titre, discipline (N/V/C/R), zone principale (Z1-Z6 ou « pas de donnée »)
- distance, durée, lieu/matériel (bassin 25m, bassin 50m, eau libre, home-trainer, route, piste, tapis)
- déroulé structuré : liste de blocs (échauffement, corps, retour au calme) avec type (effort/récup/repos), durée, cible (allure, watts %FTP, cadence)
- « pourquoi » : texte justificatif + niveau de preuve (SOLIDE/MODÉRÉE/FAIBLE) + note de source numérotée
- statut : planifiée / faite (avec heure de complétion) / annulée
- export possible en .FIT, .ZWO (vélo uniquement), .PNG

### Plan (`TrainingPlan`)
- id, objectif (course liée ou aucune), format (Sprint/Olympique/70.3/Ironman), date de début, date de fin, nb de semaines
- statut : en cours / archivé (terminé ou abandonné, avec semaine d'abandon)
- volume hebdo cible, jours d'entraînement disponibles (bitmask 7 jours), séances max par discipline/semaine
- contraintes : accès (piscine, eau libre, home-trainer, capteur puissance, vélo CLM), semaines bloquées (avec motif)
- références (CSS/FTP/seuil au moment de la génération)
- phases : liste de {nom (Base/Construction/Spécifique/Affûtage), nb semaines, description, statut}
- répartition d'intensité cible (% Z1-Z2, % Z3, % Z4+)
- réglages réouvrables (les 6 du générateur), chacun avec portée d'application possible (cette semaine / semaines à venir / tout le plan)

### Semaine (`PlanWeek`)
- numéro, phase, volume total, volume par discipline, liste de jours
- flag « bloquée/réduite » avec motif
- % facile/dur

### Jour (`PlanDay`)
- date, liste ordonnée de séances (1 à N, pile numérotée si plusieurs), jour déclaré indisponible (bool)

### Course (`Race`)
- id, nom, date, format, rôle (objectif principal / préparation), distances N/V/C
- profil altimétrique vélo (D+, segments de pente)
- conditions : température eau, règles combinaison, drafting, ravitos
- résultat si passée (temps, écart à la cible)
- pacing : temps cible, table par segment (allure, IF, cumul)
- nutrition : g/h glucides, ratio glucose/fructose, items à emporter (bidons, gels, barres, eau), sodium mg/h
- timeline jour J : liste d'événements datés (veille + jour même)
- checklist parc (items cochables, par zone T1/vélo/T2)

### Journal (`PlanJournalEntry`)
- id, date/heure, auteur (utilisateur / moteur), description, motif (si moteur), action annulable (« Défaire », fenêtre 30 jours), état annulé (bool)

### Zone (`Zone`)
- code (Z1-Z6), nom (récup/endurance/tempo/seuil/VO2/neuro), couleur, bornes par discipline (natation /100m, vélo watts, course /km, FC)

### Discipline (`Discipline`)
- code (N/V/C/R), nom, couleur

### Import/export (`BackupFile`)
- schemaVersion (le mockup montre une version « 1.4 » lue vs « 1.1 » dans un fichier refusé — donc un champ de version numérique simple, pas nécessairement semver)
- profil, plan(s), séances faites, courses

---

## 4. Générateur de plan (G1-G6) — détail complet

Un seul écran qui progresse à travers 6 étapes (indicateur « 01/06 » à « 06/06 » + barre de progression à 6 segments), accessible depuis l'écran 01 (« Générer mon plan ») ou S1 (menu burger, « Générer un plan »).

### G1 · Objectif (ligne 435)
- **Question** : « Quel format ? »
- **Choix de format** (liste à sélection unique) avec distances et durée minimale : Sprint (750m/20km/5km, 8 sem. min.), Olympique (1,5km/40km/10km, 11 sem. min.), **70.3** (1,9km/90km/21,1km, 16 sem. min. — sélectionné dans l'exemple), Ironman (3,8km/180km/42,2km, 24 sem. min.)
- **Course visée** : champ texte/recherche dans un catalogue de 1 240 courses, ou option « aucune course, je m'entraîne »
- Note : « Aucune donnée envoyée : tout reste sur l'appareil. »
- CTA : « Continuer → »

### G2 · Date (ligne 477)
- **Question** : « Quelle date ? »
- Input date (ex. 30 août 2026), affichage « dans 11 semaines · dimanche »
- Visualisation « ce que ça laisse comme préparation » : barre proportionnelle semaines disponibles (pleines) vs manquantes (hachurées)
- **Alerte conditionnelle** (bordure jaune #E0B400) si le délai est insuffisant pour le format choisi : « Délai trop court pour un 70.3 » avec preuve SOLIDE (« 16 semaines est le plancher raisonnable... Tu peux continuer quand même — l'app proposera un repli en fin de parcours, sans le forcer. ») → c'est ce qui mène à l'écran 06 (Simulation/repli) en fin de parcours.
- Champs additionnels : « Course de préparation » (optionnel), « Semaines bloquées » (renvoie à l'étape 4)
- CTA : « Continuer → »

### G3 · Disponibilité (ligne 518)
- **Question** : « Combien de temps ? »
- **Volume hebdo visé** : slider avec valeur affichée (7h30 dans l'exemple), bornes 4h à 12h, marqueur « maxi tenable : 9h » (donc une limite personnalisée/déclarée ailleurs, pas juste la borne du slider)
- **Jours d'entraînement** : sélecteur des 7 jours (L M M J V S D), toggle actif/inactif (ex. 6 jours actifs, vendredi laissé libre)
- **Séances maxi par discipline** : compteur par discipline (N 2/sem, V 3/sem, C 3/sem)
- CTA : « Continuer → »

### G4 · Contraintes (ligne 578)
- **Titre** : « Ce que tu as sous la main »
- **Accès/matériel** (liste de toggles) : Piscine (bassin 25m, créneaux lun/mar soir) ✓, Eau libre (lac à 20min, dispo à partir de juin) ✓, Home-trainer (connecté, séances .ZWO possibles) ✓, Capteur de puissance (absent dans l'exemple — « sinon les séances passent en FC/ressenti ») —, Vélo de contre-la-montre (2 séances position aéro/sem.) ✓
- **Semaines bloquées** : sélecteur visuel de semaines (barres), avec motif texte libre (ex. « sem. 04 et 05 — déplacement pro : volume réduit, pas de longue sortie »)
- Note : « Ces contraintes façonnent le plan ; elles ne servent à rien d'autre. »
- CTA : « Continuer → »

### G5 · Références (ligne 613)
- **Titre** : « Tes allures de référence », pré-remplies depuis « Mes références » (écran 12)
- Affiche CSS (1:32/100m, source « test 400/200 », date), FTP (248W, source note 7, date), Seuil (« non renseigné » dans l'exemple → texte « test sem. 1 »)
- **Test proposé** si référence manquante : ex. « 30 min contre-la-montre · course à pied · semaine 1, jeudi », toggle actif
- Encart « Pourquoi pas d'estimation » (preuve FAIBLE) : « Déduire une allure de course d'un FTP vélo donne des écarts de 20 à 40 s/km. Mieux vaut mesurer une fois. » → principe produit : **pas d'estimation croisée entre disciplines quand une mesure directe est possible**
- CTA : « Continuer → »

### G6 · Récapitulatif (ligne 665)
- **Titre** : « Récapitulatif », « chaque ligne renvoie à son étape »
- Tableau étape/valeur : FORMAT (70.3 Vichy), DATE (30 août · 11 sem.), VOLUME (7h30 · 6 jours), CONTRAINTES (piscine 2×, HT, sem. 04-05), RÉFÉRENCES (CSS, FTP · seuil à tester)
- **« Ce que le moteur va faire »** — liste explicite de règles de génération, avec statut (appliqué/à définir/écarté) :
  - Placer 4 phases et un affûtage de 2 semaines (note 2 : Bosquet 2007)
  - Répartir 78 % du volume en Z1-Z2 (note 3 : distribution polarisée/pyramidale)
  - Caler les longues sorties sur le samedi (règle métier, pas de source citée)
  - **Aucun calcul de charge type ACWR : écarté faute de preuve** (icône hachurée) — confirmation explicite que l'algorithme de génération n'utilise PAS le ratio de charge aiguë/chronique
- Note : « L'étape suivante est une simulation : rien n'est enregistré avant que tu l'acceptes. »
- CTA : « Générer le plan → » — mène à l'écran 06 (Simulation) si le délai est insuffisant, sinon directement au plan actif (écran 02 Aujourd'hui)

**Logique de génération déductible (résumé)** : le moteur prend en entrée format+course+date+volume+jours+contraintes+références, produit un plan en 4 phases (Base/Construction/Spécifique/Affûtage), applique une distribution d'intensité pyramidale (~78/8/14 en Z1-2/Z3/Z4+), place les longues sorties le week-end (samedi de préférence), respecte les contraintes matérielles/de calendrier déclarées, et **refuse explicitement d'utiliser des modèles de charge d'entraînement non consensuels** (règle des 10 %, ACWR). Si le délai est insuffisant pour le format choisi, il propose un repli vers un format plus court plutôt que de forcer un plan non réaliste.

---

## 5. Import / export & PDF / ICS

### Format de sauvegarde complète
- **Format** : `.JSON` (confirmé écran 14, ligne 1107 : « Sauvegarde complète · profil, plan, séances, courses »)
- Nommage observé : `zonedtri-sauvegarde-2025-11-02.json` (écran 19)
- **Versionnage** : champ de version explicite dans le fichier, un import est refusé si la version ne correspond pas au parseur (« version du fichier : 1.1 · version lue : 1.4 » — écran 19). Le format de version observé est un simple nombre (« 1.1 », « 1.4 »), pas nécessairement du semver complet.
- **Garantie « tout ou rien »** (transaction atomique) — texte exact (écran 19, ligne 1684) : *« Un import est tout ou rien : il n'écrit jamais à moitié. Tu peux réessayer avec un autre fichier sans risque. »* Confirmé aussi dans le brief produit initial. C'est un principe central : **aucune écriture partielle possible**, en cas d'erreur de validation rien n'est modifié dans les données existantes.
- **Le fichier est du texte lisible/éditable à la main** (écran 19, ligne 1688) : *« Le fichier est du texte : les deux lignes en cause sont modifiables dans n'importe quel éditeur. Le format complet est décrit dans la page Sources. »* → implique une page « Sources » documentant le schéma JSON complet, mentionnée mais non mockée en détail dans les 51 écrans lus.
- Le fichier v1.1 du Design System générique (fallback) donne un schéma générique plausible pour ce type de produit (§ Données, i18n, persistance, ligne 881) : `{ "schemaVersion": 1, "data": {}, "settings": {} }`, avec la règle : « Import validé contre le schéma, migration explicite entre versions, jamais d'écrasement silencieux : l'utilisateur choisit fusionner ou remplacer. » — **ceci est une convention générique du designer, pas une confirmation issue du mockup Zoned Tri lui-même**, à valider avec l'utilisateur.

### Les 4 exports mentionnés dans la mission (détaillés écran 20, « Exporter »)
1. **Feuille d'export** (écran 20 lui-même) : bottom-sheet/modal listant tous les formats disponibles depuis l'écran courant, avec description de contenu pour chacun. Texte d'intro : « Le fichier est écrit sur l'appareil. Rien ne part sur un serveur, aucun compte n'est créé. »
2. **Atlas des zones A4** (écran 21) : gabarit imprimable 210×297mm, noir sur blanc (fond blanc pur `#FFFFFF`, pas le papier crème habituel), une seule encre, page 1/3. Contenu : en-tête avec les 3 références (CSS/FTP/seuil) et leur date, tableau 6 zones × 4 colonnes (natation /100m, vélo watts, course /km, FC), cible de répartition d'intensité (78/8/14%), note « sans capteur de puissance » (repli FC/ressenti). Footer : source de dérivation + date d'impression.
3. **Plan A4** (écran 22) : gabarit imprimable 210×297mm, page 2/3. 18 semaines sur une page, grille semaine × 7 jours avec code discipline par case (N/V/C/R/—), semaines bloquées en aplat gris, séance clé en trame hachurée, semaine de course en aplat encre inversé. Légende en en-tête (séance/facile/séance clé/repos).
4. **Carte de séance PNG** (écran 23) : format carré 1080×1080px, **« sans nom, sans FC, sans position »** (écran 20, ligne 1749 — confidentialité explicite, aucune donnée personnelle). Contenu : badge discipline+zone, titre, 3 stats (distance/durée/corps), graphique de déroulé, footer avec allure cible + logo « Zoned Tri ».

### Contenu du fichier .ICS (écran 24, exemple complet donné dans le texte)
Nommage : `zonedtri-semaine-07.ics`. Un événement `VEVENT` par séance, structure observée :
```
BEGIN:VEVENT
DTSTART;TZID=Europe/Paris:20260825T063000
DTEND;TZID=Europe/Paris:20260825T072500
SUMMARY: N · Z4 · Pyramide CSS 2 400 m
LOCATION: Piscine · bassin 25 m
DESCRIPTION: Éch. 400 m + 4 × 50 éduc. (12′)
 Corps 8 × 150 @ 1:34/100 — r 20 s (32′)
 RAC 200 m souple (6′)
 Allure dérivée du CSS du 3 août.
CATEGORIES: Zoned Tri,Natation,Seuil
STATUS: CONFIRMED
END:VEVENT
```
Règles explicites (ligne 1887) : **« Aucun VALARM : l'app ne pose pas de rappel. Aucun UID lié à un compte. Un jour à deux séances produit deux événements distincts, jamais un seul bloc. »**

### Autres formats d'export mentionnés (hors des 4 principaux)
- `.FIT` : séance structurée → montre (intervalles, cibles allure/puissance, temps de repos)
- `.ZWO` : séance vélo → home-trainer (Zwift, Rouvy, MyWhoosh — en % de FTP, « pas de watts figés »)

---

## 6. États d'erreur et cas limites

### Écran 17 · Hors-ligne (état permanent assumé, pas une erreur ponctuelle)
Bandeau persistant (fond encre) : « Hors-ligne · les 312 séances et ton plan restent lisibles ». Tableau de statut par fonction :
- OK hors-ligne : Plan/séances/fiches course, Calculateurs et exports
- EN ATTENTE (nécessite réseau) : Catalogue des 1 240 courses, Météo et température de l'eau, Mise à jour de la bibliothèque
Texte clé : « Aucun bouton "réessayer" : il n'y a rien à relancer. » — l'app ne fait **aucune tentative de reconnexion active**, le bandeau disparaît seul au retour réseau.

### Écran 18 · Adresse introuvable (404)
Cas : lien partagé vers une séance retirée du catalogue. Message explicite : la séance retirée du catalogue **reste dans les plans qui l'utilisaient déjà** — « elle n'est jamais effacée d'un plan déjà accepté ». Propose 2 séances proches en remplacement + retour bibliothèque/plan.

### Écran 19 · Import refusé (bordure rouge #E5261B)
Voir section 5 ci-dessus pour le détail du principe « tout ou rien ». Affiche les erreurs ligne par ligne (« ligne 1842 · champ "ftp" attendu en watts, reçu "248 W" » — donc validation de types stricte), confirme qu'aucune donnée existante n'a bougé, propose de réparer le fichier texte à la main ou de choisir un autre fichier. Aucune confirmation supplémentaire requise pour « Choisir un autre fichier », mais « Abandonner » est en rouge (signal cohérent avec l'usage du rouge = irréversible/destructif dans le design system).

### Écrans à bordure pointillée (`border: 2px dashed`) — confirmés comme des états de simulation, PAS des états vides
Contrairement à l'hypothèse de départ (« probablement des états vides/placeholder »), la lecture complète montre que **la bordure pointillée signale systématiquement « rien n'est encore écrit / simulation »**, jamais un placeholder vide :
- **Écran 06** (Simulation) : plan de repli non enregistré, mène soit à l'acceptation soit à l'abandon.
- **Écran 32** (Dépôt coûteux à confirmer) : bordure pointillée + libellé explicite « non enregistré » dans l'en-tête. Simulation d'un déplacement de séance avant confirmation.
- **Écran 38** (Avant/après réglage) : bordure pointillée + libellé « non enregistré » également. Simulation d'un changement de volume avant application.

C'est un token de design confirmé par le Design System (ligne 162) : *« 2 px pointillé — rien n'est encore écrit »*. À implémenter comme un style d'état réutilisable (`variant="simulation"` ou équivalent), pas comme un état vide/empty-state classique.

### Écran 26 · Résultat de recherche/filtre vide
Déjà détaillé section 1. Principe : le vide **nomme toujours sa cause** (jamais un vide générique) et propose des relâchements de filtre ciblés, sans jamais retirer un filtre à la place de l'utilisateur.

### Les deux seules actions demandant une confirmation modale dans toute l'app
Confirmé à 2 endroits (écran 36, ligne 2593 ; écran 41, ligne 2890 ; Design System, ligne 262) : **supprimer un plan entier**, et **supprimer une course**. Tout le reste (supprimer une séance d'un jour, décaler, remplacer) est réversible sans dialogue via le bandeau d'annulation 6 secondes.

---

## 7. Design tokens

### Couleurs (source faisant foi : Zoned TRI Brut - Design System.dc.html)

**Papier & encre (neutres)**
| Rôle | Hex |
|---|---|
| Encre (texte principal, structure) | `#0B0B0A` |
| Texte courant | `#3B3A33` |
| Étiquettes mono | `#5B594F` |
| Inactif | `#9A978C` |
| Filet 1px | `#CFCCC0` |
| Aplat neutre | `#E4E1D6` |
| Fond hors écran (desk) | `#EFEDE6` |
| Papier de l'écran | `#FCFBF6` |

**Disciplines** (« la couleur ne dit que deux choses — la discipline et la zone »)
| Code | Discipline | Hex |
|---|---|---|
| N | Natation | `#3AA0C8` |
| V | Vélo | `#2F6BE0` |
| C | Course | `#FF5A3C` |
| R | Repos / renfo | `#8F8F86` |

**Zones d'intensité** (6 paliers, du gris au violet)
| Zone | Nom | Hex |
|---|---|---|
| Z1 | Récup | `#8F8F86` |
| Z2 | Endurance | `#2FA84A` |
| Z3 | Tempo | `#E0B400` |
| Z4 | Seuil | `#FF6A1F` |
| Z5 | VO₂ | `#E5261B` |
| Z6 | Neuro | `#8A46E0` |

Règle : un aplat non renseigné = `#E4E1D6` (gris neutre) et signifie « pas de donnée », **jamais** « zéro » — toujours accompagné d'une légende sur le graphique concerné.

**Signaux d'interface** (3 seulement, sens fixe)
| Signal | Usage | Hex |
|---|---|---|
| Action / valeur vive (lime) | CTA principal, texte sur fond encre uniquement | `#D6F24B` |
| Règle à connaître (jaune) | Encart d'avertissement non bloquant | `#E0B400` |
| Irréversible (rouge) | Action destructive / erreur bloquante | `#E5261B` |
| Ombre portée | `#FF6A1F` (par défaut) ou `#D6F24B`, 5-6px, jamais floutée | |

### Typographie
- **General Sans** (titres et prose) : poids 700 pour display (34-96px, line-height .82-.94, letter-spacing −.045 à −.055em, capitales) ; 600 pour titres d'écran (24px) et sous-titres (17px) et lignes de liste (14px) ; 400/600 pour la prose (13px, line-height 1.45, couleur `#3B3A33`, largeur max 52 caractères — seul endroit où l'app « parle en phrases complètes »).
- **Space Mono** (étiquettes et TOUS les chiffres) : étiquette de section 10px/.14em/capitales ; micro-libellé 9px/.08em/capitales ; bouton 11px/.1em/capitales ; donnée courante 11-40px sans capitales forcées. Règle absolue (Design System, ligne 136) : *« Toute quantité passe en mono... Une quantité en General Sans est une erreur. »*
- Polices chargées via Fontshare (General Sans 400/500/600/700) et Google Fonts (Space Mono 400/700).

### Grille & matière
- Écran mobile de référence : **390×780px**, papier `#FCFBF6`, cadre 2px encre, gouttière latérale 20px (18px sur écrans denses), colonne flex, pied collé (`margin-top:auto`), **aucune barre d'onglets — hauteur pleine**.
- Rythme vertical : bloc→bloc 11-14px ; filet 1px `#CFCCC0` + 9-11px ; étiquette→contenu 8-10px ; ligne de liste 9-11px vertical ; pied de page filet + 9px + note mono.
- Traits : **2px encre = structure** (cadre, en-tête, carte) ; **1px `#CFCCC0` = lecture** (lignes, sections) ; **2px pointillé = rien n'est encore écrit** (simulation).
- **Aucun rayon d'angle nulle part, aucune ombre floutée, aucun dégradé.** (règle absolue du DS)
- Écrans A4 (atlas, plan imprimable) : 210×297mm, fond blanc pur `#FFFFFF` (pas `#FCFBF6`), une seule encre.

### Composants de base (catalogués dans le Design System, section 04)
- **Actions** : bouton principal encre+lime+ombre décalée (`background:#0B0B0A; color:#D6F24B; box-shadow:6px 6px 0 #FF6A1F`), min-height 46px ; bouton secondaire = cadre 2px seul ; export = pastille cadre 2px avec extension (.FIT/.PNG/.ICS) ; lien souligné = action sans conséquence. **Règle : une seule action encre-et-ombre par écran.**
- **En-tête** : un seul modèle. Écran racine = nom de section à gauche + burger à droite. Écran de détail = flèche retour + fil d'Ariane + burger à droite. **Burger à droite partout, sans exception, seule navigation. Pas de logo dans l'app.**
- **Filtres & puces** : 2 boutons dans la barre (Filtres avec badge compteur, Tri), tamis complet dans une feuille (bottom sheet) ; puce de filtre actif = supprimable directement (✕) sans ouvrir la feuille ; chaque option de filtre affiche ce qu'elle laisse (ex. « 84 », « 7 », « 3 »).
- **Ligne de liste** : vignette discipline (carré coloré + initiale), 2 niveaux de texte (titre + méta mono), zone de valeur à droite. Un tiret mono remplace une valeur absente, jamais un zéro.
- **Carte mise en avant** : cadre 2px + ombre décalée lime (`box-shadow:5px 5px 0 #D6F24B`). Une seule carte à ombre par écran (celle qui porte la reprise).
- **Encarts de règle** : jaune `#E0B400` = règle à connaître avant d'agir ; rouge `#E5261B` = irréversible ; pointillé + fond `#E4E1D6` = simulation/projection. Aucun autre encart coloré n'existe.
- **Déroulé de séance** : graphique en barres largeur=durée / hauteur=zone, tableau exact sous le graphique (jamais l'inverse).
- **Retour d'action (toast/snackbar)** : bandeau bas d'écran fond encre, 6 secondes, barre de temps visible qui se vide, remplace toute boîte de dialogue pour les actions réversibles.
- **Déplacement par glisser** : poignée `≡` ouvre le drag ; tous les jours acceptent le dépôt ; un jour déjà occupé propose un **rang** (pas une heure — l'app ne gère aucun horaire) ; ramener la séance à sa place annule le geste.

### Principes de design (6, section 05 du DS)
1. **Rien dans le dos** — toute modification du plan est montrée avant d'être écrite, chiffrée, annulable.
2. **Une preuve par affirmation** — chaque conseil dit sur quoi il s'appuie ; pas d'estimation déguisée en donnée (capteur absent → ressenti, jamais watts inventés).
3. **Le vide parle** — case vide = jour libre / donnée manquante / semaine hors plan, jamais un trou décoratif ; légende systématique.
4. **Modifiable partout** — tout ce que le générateur a écrit se reprend à la main (décaler, remplacer, supprimer, ajouter, bloquer une semaine).
5. **Le moins de friction** — zéro boîte de dialogue pour ce qui s'annule ; 2 confirmations dans toute l'app ; geste direct avant formulaire.
6. **Emportable** — fonctionne hors-ligne, exportable (.FIT/.ZWO/.ICS/.PNG/.PDF) depuis l'écran où on le regarde, pas depuis un centre d'export unique.

### Liste explicite des interdits (section 06 du DS, `showDonts`)
1. Couleur de zone utilisée comme couleur de marque/bouton/fond de section.
2. Angles arrondis, ombre floutée, dégradé, icône illustrative.
3. Barre d'onglets, logo dans l'app, 2 niveaux de navigation concurrents.
4. Chiffre en General Sans, ou quantité sans unité ni espace insécable.
5. « Êtes-vous sûr ? » sur une action réversible, ou notification poussée non demandée.
6. Horaire de séance / « matin-soir » : le plan connaît des dates et un rang, jamais une heure.

### Fallback générique (Design System v1.1, autre famille de produits — à utiliser seulement si un point manque au DS spécifique)
Ce fichier décrit un système visuellement différent (monospace système partout, fond `#f2f3f2`, ink `#17181a`, radius 4-6px, ombres interdites aussi mais pour une raison différente) destiné à une autre famille d'apps (« month. », « habit. »). Points génériques potentiellement réutilisables comme repères (non confirmés pour Zoned Tri) :
- Accessibilité cible **WCAG 2.2 AA** : contraste texte 4.5:1, non-texte 3:1, cible tactile 44×44px, focus visible 2px/offset 3, zoom texte 200% sans perte, `prefers-reduced-motion` respecté.
- i18n : clés `domaine.composant.clé`, prévoir +30% de longueur de libellé pour l'anglais, pluriels via `Intl.PluralRules`.
- Dates stockées en ISO 8601, jamais formatées en base.
- Schéma d'import/export générique : `{ "schemaVersion": 1, "data": {}, "settings": {} }`, migration explicite entre versions, choix fusionner/remplacer à l'import (à confronter avec le principe « tout ou rien » du DS spécifique — voir section 5, potentielle divergence à trancher : le DS spécifique de Zoned Tri ne mentionne aucune option fusion/remplacement, seulement accepter/refuser en bloc).

---

## 8. Navigation

**Aucune barre d'onglets.** Confirmé explicitement (titre app ligne 29 : « Aucune barre d'onglets : chaque écran garde toute sa hauteur et la navigation vit dans le panneau burger » ; Design System liste « une barre d'onglets » dans les interdits).

### Panneau burger (écran S1, ligne 1139) — seule navigation du produit
Panneau plein écran fond encre (`#0B0B0A`), ouvert depuis l'icône burger toujours en haut à droite de l'en-tête. Contenu :
- 4 sections racines avec compteur : **Plan** (sem. 07), **Séances** (312), **Courses** (2), **Outils** (12)
- Action mise en avant (fond lime) : « Générer un plan → »
- 2 liens secondaires (cadre) : « Import / export → », « Réglages → »
- Section « Ce qui n'existe pas encore » : Méthodologie (« bientôt ») — trace explicite d'une fonctionnalité prévue mais non implémentée
- Pied : sélecteur langue (FR actif / EN), version « v 1.4 · hors ligne »

### Structure de navigation déduite (racines et sous-écrans)
```
Burger (S1)
├── Plan (racine, écran 01 si pas de plan / 02 si plan actif)
│   ├── Aujourd'hui (02) → Semaine (03) → Vue macro (04)
│   ├── Séance détail (05, 28 vélo, 29 course)
│   ├── Générateur (G1→G2→G3→G4→G5→G6) → Simulation (06) → plan actif
│   ├── Réglages du plan (37) → Avant/après (38) → Journal (39)
│   ├── Glisser/déplacer (34), Dépôt à confirmer (32), Remplacer (35), Ajouter/supprimer (36)
│   ├── Jour à 2+ séances (15), Semaine jours doublés (16)
│   ├── Test/mesure (33)
│   └── Mes plans (41, si plusieurs plans existent) — remplace l'écran 01 une fois un 1er plan créé
├── Séances (racine, écran 07 Bibliothèque)
│   ├── Feuille de filtres (40)
│   └── Recherche en place (25), résultat vide (26)
├── Courses (racine, écran 27 Mes courses si plusieurs / écran 08 Fiche directement si une seule)
│   ├── Fiche course (08) → Pacing (09), Nutrition (10), Jour J (11) → Checklist parc (30)
├── Outils (racine, écran 12 Profil athlète)
│   ├── Calculateurs (13, liste non mockée en détail, 12 items)
│   └── Import / export · Sources (14)
├── Import / export (accès direct depuis burger) → Import refusé (19) en cas d'erreur
├── Réglages (S2) → Langue (S3)
└── États système transverses : Hors-ligne (17, bandeau permanent), 404 (18), Feuille d'export (20, modal accessible depuis n'importe quel écran)
```

### Recherche
La loupe dans l'en-tête ouvre une recherche **en place** (jamais un nouvel écran, écran 25) — remplace l'en-tête, résultats groupés par nature (Séances / Calculateurs / Dans mon plan), « Annuler » restaure l'écran identique. Fonctionne hors-ligne, jamais envoyée en réseau.

### Layouts responsive (écran S4, ligne 1280)
Un seul écran « piloté par tweaks » démontre le comportement multi-device :
- **Mobile** : colonne unique, pas de rail latéral (`showRail:false`).
- **Tablette** : rail latéral compact 86px avec icônes seules (labels masqués).
- **Desktop** : rail latéral large 236px avec labels visibles + panneau latéral droit 320px (résumé semaine + raccourcis). `flexDir:row` au lieu de `column`.
- Le rail liste les 4 sections racines (Plan actif en surbrillance lime/encre) + Réglages en pied de rail.

---

## 9. Honnêteté / vérifiabilité — « une preuve annoncée à chaque affirmation »

Principe produit central, cité explicitement (titre app, ligne 29) : *« ... et une preuve annoncée à chaque affirmation. »* Traduit dans le Design System (principe 02) : *« Chaque conseil dit sur quoi il s'appuie : la mesure, la date, le nombre de séances. Pas d'estimation déguisée en donnée — un capteur absent donne un ressenti, jamais des watts inventés. »*

### Mécanique observée dans les mockups
Chaque affirmation non triviale porte : (1) un badge de niveau de preuve — **SOLIDE** (aplat encre plein) / **MODÉRÉE** (cadre encre creux) / **FAIBLE** (aplat hachuré) — et (2) une note numérotée en pied d'écran citant la source. Liste des occurrences relevées avec leur verdict et leur source :

| Écran | Affirmation | Niveau | Source citée |
|---|---|---|---|
| 02, 05 | Allure natation dérivée du CSS | (note 1) | Wakayoshi et al. 1992 — vitesse critique en natation |
| 04, G6, 14 | Affûtage −40 à −60% volume, intensité/fréquence maintenues | SOLIDE (note 2) | Bosquet et al. 2007, méta-analyse |
| 04, G6 | Progression de charge : PAS de « règle des 10 % » | — | non démontrée, explicitement écartée (hachuré) |
| 06, 21, G6 | Distribution polarisée/pyramidale (78/8/14%) | SOLIDE (note 3) | citée comme consensus en endurance |
| 09 | IF 0,78 au vélo pour un 70.3 | MODÉRÉE (note 4) | « consensus d'entraîneurs, peu d'essais contrôlés » |
| 10 | 78 g/h glucides, 2 transporteurs (glucose+fructose) | SOLIDE (note 5) | Jeukendrup — 60-90 g/h avec transporteurs multiples, à condition de l'avoir entraîné |
| 10 | ~600 mg/h sodium | FAIBLE (note 6) | « protocoles hétérogènes » |
| 12, G5 | FTP estimée à 95 % d'un test 20 min | — (note 7) | « heuristique de terrain, pas un protocole validé » |
| 13 | Conversion bassin → eau libre | FAIBLE (note 8) | « 3 effets mal quantifiés » |
| 15 | Course après vélo le même jour (brick) | MODÉRÉE | pas de note numérotée, texte inline |
| 28 | Blocs seuil 12′ plutôt que 20′ | MODÉRÉE | pas de note numérotée, texte inline |
| 29 | Régularité > vitesse (répétitions seuil) | SOLIDE | pas de note numérotée, texte inline |
| 33 | Recalcul complet des zones après un nouveau test | SOLIDE | « les séances déjà faites gardent leurs allures : l'historique n'est jamais réécrit » |
| 35 | Le temps au seuil compte, pas la forme des répétitions | SOLIDE | pas de note numérotée, texte inline |
| G6 | Pas de calcul de charge ACWR | — | « écarté faute de preuve » (hachuré, explicitement non implémenté) |
| 14 | Récapitulatif des « sources du moteur » | mixte | Bosquet 2007 (utilisé), Jeukendrup (utilisé), Wakayoshi 1992 (transposé/utilisé), règle des 10% (non démontrée/écartée), ACWR (contesté depuis 2019/écartée) |

### Endroits qui « montrent le calcul derrière un chiffre »
- **Écran 33** (Test 30 min CLM) : tableau explicite « Ce qui va être réécrit » — liste noir sur blanc les 22 séances futures affectées, le changement exact d'allure cible (5:12 → 5:04/km), et confirme que l'atlas + PDF seront regénérés. C'est l'exemple le plus complet de traçabilité d'un recalcul.
- **Écran 32 / 38** : tableau « Avant / Après » systématique avant toute application d'un changement de réglage — jamais d'application silencieuse.
- **Écran 39** (Journal du plan) : chaque action du moteur porte son motif texte + un bouton « Défaire », annulable 30 jours, jamais supprimée du journal même après annulation.
- **Écran 14** (Sources) : page dédiée qui expose la liste complète des sources utilisées par le moteur, avec leur statut utilisé/écarté — c'est la « preuve de la preuve » au niveau système, pas seulement au niveau d'un écran individuel.
- **Écran 19** (Import refusé) : expose les erreurs de validation ligne par ligne du fichier JSON plutôt qu'un message générique — même logique de transparence appliquée aux erreurs techniques.

### Règle de conception qui en découle pour l'implémentation
Toute donnée calculée ou recommandée affichée dans l'UI doit être accompagnée, quelque part accessible (inline ou via une info-bulle/lien « pourquoi »), de : (a) son niveau de confiance parmi 3 valeurs fixes, (b) sa source si elle existe, (c) ce qui se passera si l'utilisateur agit dessus (tableau avant/après quand pertinent). C'est un pattern transverse à répliquer comme composant réutilisable (`ProofBadge` + `EvidenceNote`), pas une feature isolée à quelques écrans.

---

## Annexe — points à clarifier avec l'utilisateur avant implémentation

1. **Liste complète des 12 calculateurs** : seuls 3/12 sont nommés dans le mockup (FTP→zones de puissance, Bassin→eau libre, Test 20min→seuil). Il manque les 9 autres noms et leurs formules.
2. **Formules exactes non données** : aucune formule arithmétique n'est écrite en clair pour la conversion bassin→eau libre, la dérivation des bornes de zone à partir de CSS/FTP/seuil, ni pour le calcul détaillé du pacing multi-segments. Seuls les principes (facteurs pris en compte) et les valeurs résultantes sont visibles.
3. **Incohérence mineure de comptage des séances par catégorie** : écran 01 (N84/V96/C88/R44) vs écran 40 (N84/V96/C88/Brick24/R20) — les deux totalisent 312 mais la répartition « Brick » vs « Repos/renfo » diffère. À trancher : Brick est-il une sous-catégorie de N/V/C ou une 5e catégorie distincte des 44 « R » ?
4. **Schéma JSON exact d'import/export** n'est jamais montré en détail (seule une page « Sources » est mentionnée comme la documentant, non mockée).
5. **Fusion vs remplacement à l'import** : le fallback générique (DS v1.1) suggère un choix fusionner/remplacer, alors que le DS spécifique de Zoned Tri ne mentionne qu'un modèle accepter/refuser en bloc (tout ou rien). À clarifier lequel s'applique réellement.
6. **Écran « Méthodologie »** annoncé « bientôt » dans le menu burger (S1) — hors périmètre du mockup actuel, à traiter comme non implémenté pour cette itération.
