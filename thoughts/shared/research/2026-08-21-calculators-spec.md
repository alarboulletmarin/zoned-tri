# Zoned TRI Brut — Spécification des 12 calculateurs

Complète `2026-08-21-design-spec.md` § 2. Les 3 premiers calculateurs sont **confirmés par le mockup** (nom + index). Les 9 suivants sont **une proposition validée par l'utilisateur** (2026-08-21) — chaque formule est sourcée ou explicitement signalée comme non sourcée, jamais inventée sans le dire. Chaque calculateur porte le même badge de preuve que le reste de l'app (SOLIDE / MODÉRÉE / FAIBLE / définition / règle produit non sourcée).

Convention de nommage technique : `id` en kebab-case, utilisé comme clé de route et de test.

---

## 03/12 — FTP → zones de puissance *(confirmé mockup, ligne 1940)*

- **Input** : FTP (W)
- **Output** : bornes Z1-Z6 en watts
- **Méthode** : modèle Coggan à 7 zones, **fusionné en 6 zones** pour coller à l'atlas de l'app (Z6 « Neuro » regroupe les zones Coggan 6 « Capacité anaérobie » et 7 « Neuromusculaire », qui n'ont de toute façon pas de plafond mesurable en watts moyens).

| Zone | % FTP | Borne haute pour FTP=248W (exemple mockup) |
|---|---|---|
| Z1 Récup | < 55% | < 136 W |
| Z2 Endurance | 55–75% | 136–186 W |
| Z3 Tempo | 76–90% | 187–223 W |
| Z4 Seuil | 91–105% | 224–260 W |
| Z5 VO₂ | 106–120% | 261–298 W |
| Z6 Neuro | > 120% | > 298 W |

Vérification : Z4 haut = 260W tombe dans la fourchette « Z4 211-260W » visible sur l'atlas mockup (écran 21) → cohérent.

- **Source** : Allen & Coggan, *Training and Racing with a Power Meter*, 3e éd. (2019) — modèle de zones le plus répandu en cyclisme de puissance.
- **Recoupement 2026-08-21** : l'app sœur `zoned` (`src/lib/planGenerator/cyclingPaceEngine.ts`) implémente le modèle Coggan complet à **7 zones**, avec la même source citée nommément. Décision maintenue : Zoned Tri fusionne les zones 6 et 7 de Coggan en une seule Z6 « Neuro », parce que l'atlas de l'app (écran 21) affiche un tableau unique à 6 zones partagé entre les 3 disciplines + FC — un 7e palier casserait cette grille unifiée. Divergence assumée et documentée, pas une erreur.
- **Vérification contre l'atlas du mockup (écran 21, ligne 1774-1779)** : pour FTP=248W, l'atlas affiche Z2 136–173W et Z3 174–210W, alors que les vrais pourcentages Coggan (55/75/90/105/120%) donnent Z2 136–186W et Z3 187–223W — écart notable au milieu du tableau (les bornes basse/haute de Z1/Z4/Z5/Z6 coïncident, celles de Z2/Z3 non). Ce n'est pas une erreur de notre formule : les chiffres du mockup ne retombent sur AUCUN jeu de pourcentages ronds et citables que nous ayons pu identifier (testé aussi contre les zones natation/course du même tableau, même écart) — ce sont vraisemblablement des valeurs saisies à la main par l'auteur du mockup à titre illustratif, pas calculées depuis une formule précise. Décision : garder les pourcentages Coggan réels et vérifiables plutôt que caler notre calcul sur des chiffres d'exemple non sourcés — c'est le choix le plus honnête au regard du principe « preuve par affirmation ».
- **Niveau de preuve affiché** : **MODÉRÉE** — convention largement adoptée par l'industrie (confirmée en prod par `zoned`), non issue d'un essai contrôlé validant ces bornes précises pour chaque individu.

---

## 04/12 — Bassin → eau libre *(confirmé mockup, ligne 1047)*

- **Inputs** : allure bassin /100m, port de combinaison (oui/non), fréquence de sighting (respirations de visée par longueur)
- **Output** : allure eau libre estimée + fourchette
- **Méthode** — le mockup dit explicitement qu'aucune formule numérique n'existe pour ce calcul (« trois effets mal quantifiés »). On formalise les 3 facteurs qu'il cite, en additionnant des ajustements en secondes/100m, **chacun étiqueté comme un dire d'expert non issu d'une étude contrôlée** :
  - Perte de virages (le bassin permet une poussée tous les 25-50m, l'eau libre non) : +0 à +2 s/100m selon la longueur du bassin déclarée
  - Flottaison combinaison : −2 à −4 s/100m si portée (effet positif documenté qualitativement, pas de coefficient validé)
  - Coût du sighting : +1 à +3 s/100m selon la fréquence déclarée
  - Fourchette finale = somme centrale ± l'étendue cumulée des trois incertitudes
- **Source** : aucune — le mockup lui-même n'en cite pas. À afficher tel quel dans l'UI : « estimation par règle empirique, pas une formule validée ».
- **Niveau de preuve affiché** : **FAIBLE** (déjà le verdict du mockup — à conserver tel quel).

---

## 07/12 — Test 20 min → seuil (FTP) *(confirmé mockup, ligne 1941 et écran 12 note 7)*

- **Input** : puissance moyenne sur un test de 20 min à effort maximal soutenable
- **Output** : FTP estimée
- **Formule (seule formule chiffrée présente dans tout le mockup)** : `FTP ≈ 0,95 × puissance_moyenne_20min`
- **Source** : protocole de terrain popularisé par Hunter Allen & Andrew Coggan ; le mockup le qualifie lui-même d'« heuristique de terrain, pas un protocole validé » et recommande un test de puissance critique (CP) comme alternative plus rigoureuse.
- **Niveau de preuve affiché** : **FAIBLE** (déjà le verdict du mockup).

---

## 08/12 — Test 30 min (course) → allure seuil + VMA

- **Inputs** : distance parcourue en 30 min à effort maximal soutenable (ex. 7140 m, valeur écran 33)
- **Outputs** : allure seuil (min/km), vitesse en km/h, VMA estimée
- **Formule** :
  - `vitesse_seuil (km/h) = distance_m / 1000 / (30/60)`
  - `allure_seuil (min/km) = 30 / (distance_m / 1000)`
  - `VMA estimée (km/h) ≈ vitesse_seuil / 0,92` — un test de 30 min soutenu se court traditionnellement autour de 90-92% de la VMA (référence terrain proche du protocole utilisé pour dériver la VMA d'un test de Cooper/30min, ex. méthodes d'entraîneurs francophones type Billat)
- Exemple mockup : 7140m/30min → 14,3 km/h → 4:12/km, VMA 17,2 km/h. Vérification : 14,3/0,92 = 15,5 — **ne retombe pas exactement sur 17,2 km/h du mockup**. Le ratio implicite du mockup est donc plus proche de 14,3/17,2 = **0,83**, pas 0,92. À l'implémentation, caler le coefficient sur celui qu'implique l'exemple mockup (0,83) plutôt que sur la référence Billat générique, et le documenter comme tel : « VMA ≈ allure de seuil 30 min ÷ 0,83, coefficient calé sur les données produit, pas une constante physiologique universelle ».
- **Source** : dérivation interne cohérente avec l'exemple chiffré du mockup (écran 33), pas une formule académique citée nommément dans le texte.
- **Recoupement 2026-08-21** : vérifié contre `zoned` (app sœur) — **non confirmé**. `zoned` ne dérive jamais la VMA d'un test de 30 min dans son code ; la VMA y est toujours une saisie directe de l'utilisateur (test VAMEVAL/Cooper externe). Le coefficient 0,83 reste donc calé sur un seul point de donnée (l'exemple du mockup), sans recoupement externe.
- **Niveau de preuve affiché** : **FAIBLE** (revu à la baisse depuis MODÉRÉE le 2026-08-21 — le recalcul de zones qui en découle reste SOLIDE selon le mockup une fois la VMA connue, mais la formule VMA elle-même n'a aucune source, ni dans le mockup ni dans le produit sœur).

---

## 09/12 — CSS via test 400 m / 200 m

- **Inputs** : temps sur 400m nagé à effort maximal, temps sur 200m nagé à effort maximal (séances séparées, même séance d'évaluation)
- **Output** : CSS (Critical Swim Speed) en m/s, converti en allure /100m
- **Formule** : `CSS (m/s) = (400 − 200) / (t400 − t200)`, avec t en secondes
- **Source** : deux citations complémentaires, pas contradictoires — Wakayoshi et al. (1992) a établi le concept de vitesse critique en natation et c'est ce que cite déjà le mockup (écran 12, note 1) ; la formule arithmétique exacte à deux distances (400m/200m) utilisée ici est plus directement attribuable à Ginn (1993), qui l'a appliquée telle quelle. À l'implémentation, garder la citation Wakayoshi 1992 dans l'UI (cohérence avec le texte déjà écrit du mockup) et ajouter Ginn 1993 en référence secondaire dans la doc technique/Sources.
- **Recoupement 2026-08-21** : `zoned` (`src/lib/planGenerator/swimmingPaceEngine.ts:127-133`) implémente exactement la même formule `(400-200)/(t400-t200)`, sourcée Ginn (1993) — confirme le calcul.
- **Niveau de preuve affiché** : **MODÉRÉE** — protocole validé et largement utilisé en natation de fond, mais sensible à la pacing réelle du nageur pendant le test.

---

## 10/12 — Atlas des zones (vue combinée)

- **Inputs** : CSS (natation), FTP (vélo), allure seuil course — pris depuis le profil athlète
- **Output** : tableau 6 zones × 4 colonnes (natation /100m, vélo watts, course /km, FC), reproduisant l'écran 21
- **Méthode** : compose les 3 calculateurs de zones (celui-ci, le 03/12 vélo, et le 11/12 course ci-dessous) plus un calcul natation par pourcentage de CSS, sur le modèle Friel (*The Triathlete's Training Bible*) adapté à 6 zones.

**Bug corrigé le 2026-08-21** : la première version de ce tableau plaçait l'allure seuil (CSS, 100%) dans la zone Z3 « Tempo » au lieu de Z4 « Seuil » — parce que Friel numérote ses 6 zones natation dans l'ordre inverse de ses zones vélo/course (sa zone qui contient l'allure seuil est sa zone 3 sur 6, pas sa zone 4). Décalage corrigé pour que Z4 « Seuil » contienne bien l'allure seuil mesurée, cohérent avec les zones vélo (Z4 contient FTP) et course (Z4 contient l'allure seuil) :

| Zone | % CSS (natation, allure — plus lent = %>100) |
|---|---|
| Z1 Récup | > 120% |
| Z2 Endurance | 112–120% |
| Z3 Tempo | 105–111% |
| Z4 Seuil | 98–104% |
| Z5 VO₂ | 92–97% |
| Z6 Neuro | < 92% |

- **Source** : Joe Friel, *The Triathlete's Training Bible* — zones natation par % d'allure seuil. L'assignation aux 6 zones de l'app est un décalage assumé de la structure de Friel (voir ci-dessus), pas une citation inchangée de ses bornes de zone-index.
- **Niveau de preuve affiché** : **MODÉRÉE** — convention d'entraîneur largement diffusée, pas un essai contrôlé. Écart résiduel avec l'exemple chiffré de l'atlas du mockup (probablement des valeurs saisies à la main, voir 03/12 et 11/12).
- Ce calculateur est un **agrégat** des sorties 03/12, 09/12 (via CSS) et 11/12 — pas de nouvelle formule physiologique, juste la mise en tableau commune que montre l'écran 21.

---

## 11/12 — Allure seuil course → zones d'allure

**Révisé une 2e fois le 2026-08-21.** Le passage au modèle Daniels/VMA de `zoned` (décidé plus tôt dans la journée après l'audit de l'app sœur) a été **annulé** après vérification directe contre les vrais chiffres de l'atlas du mockup Zoned Tri (écran 21, colonne « Course /km », seuil=4:12/km) : les pourcentages calculés à partir du modèle Friel/% d'allure seuil (proposition initiale, avant l'audit `zoned`) reproduisent l'atlas à quelques secondes près sur les 6 zones ; le modèle Daniels/VMA ne s'en approchait pas (cadre de référence différent — VMA n'est pas l'allure seuil). Conclusion : le produit sœur a une bonne formule, mais **pour son propre usage (course seule, pas de zones natation/vélo unifiées)** — Zoned Tri revient donc à l'input déjà collecté dans le profil (allure seuil, pas VMA) et au modèle Friel, qui s'aligne mieux avec ce que montre le mockup Zoned Tri lui-même.

- **Input** : allure seuil course (/km), depuis le profil ou le calculateur 08/12
- **Output** : bornes Z1-Z6 en allure /km, dérivées en % de l'allure seuil (plus lent = %>100)

| Zone | % allure seuil |
|---|---|
| Z1 Récup | > 129% |
| Z2 Endurance | 114–128% |
| Z3 Tempo | 106–113% |
| Z4 Seuil | 97–105% |
| Z5 VO₂ | 90–96% |
| Z6 Neuro | < 90% |

- **Source** : Joe Friel, *The Triathlete's Training Bible* — zones course à pied par % d'allure seuil (fusion des paliers 4a/4b Friel dans notre Z4, et 5b/5c dans notre Z6, pour tenir sur 6 zones au lieu de 8).
- **Niveau de preuve affiché** : **MODÉRÉE** — convention répandue, pas une loi physiologique universelle. Écart résiduel avec les chiffres exacts de l'atlas du mockup : quelques secondes/km sur certaines zones (ex. Z3 mockup 4:32-5:00 vs notre calcul 4:27-4:45) — cohérent avec des valeurs d'exemple probablement saisies à la main par l'auteur du mockup plutôt que calculées, comme pour les zones vélo (voir 03/12).

---

## 12/12 — Zones de fréquence cardiaque

- **Input** : FC max mesurée (bpm) — seule donnée FC présente dans le profil (pas de FC de repos ni de FC de seuil mesurée)
- **Output** : bornes Z1-Z6 en bpm
- **Méthode** : % de FC max (méthode simple, **pas** la méthode de Karvonen/réserve cardiaque qui exigerait une FC de repos non collectée dans ce profil) :

| Zone | % FC max |
|---|---|
| Z1 Récup | < 60% |
| Z2 Endurance | 60–70% |
| Z3 Tempo | 70–80% |
| Z4 Seuil | 80–87% |
| Z5 VO₂ | 87–93% |
| Z6 Neuro | > 93% |

- **Source** : convention %FCmax généraliste (ex. lignes directrices ACSM). Moins précise que le %FC de réserve (Karvonen, 1957) faute de FC de repos dans le profil.
- **Niveau de preuve affiché** : **FAIBLE**, explicitement — cohérent avec le principe produit « un capteur/une mesure absent(e) donne un ressenti, jamais une donnée inventée ». L'UI doit proposer d'ajouter une FC de repos mesurée pour passer en méthode Karvonen (MODÉRÉE) si l'utilisateur la renseigne un jour — mais ce n'est **pas** à construire dans cette itération (YAGNI tant que le profil ne collecte pas cette donnée).

---

## Calculateurs utilitaires (comptent dans les 12 mais n'affichent pas de badge de preuve — ce sont des définitions/conversions, pas des affirmations scientifiques)

Le principe « preuve par affirmation » ne s'applique qu'aux affirmations (recommandations, estimations). Une conversion d'unité ou une définition mathématique n'a pas besoin de source — l'app ne doit **pas** afficher de faux badge FAIBLE sur une simple multiplication, ce serait aussi malhonnête que l'inverse.

Ces calculateurs restants comptent dans le total de 12 annoncé par le mockup mais n'ont pas d'index confirmé — l'ordre 01-02, 05-06 ci-dessous est arbitraire, à ajuster librement à l'implémentation :

### Intensity Factor (IF) & TSS unifié
**Étendu le 2026-08-21** après recoupement `zoned` (`src/lib/planGenerator/tss.ts`) — l'app sœur a un modèle plus complet que ma proposition initiale, repris ici à l'identique :
- Vélo : `IF = puissance normalisée / FTP` (définition standard Coggan/TrainingPeaks)
- Course : `IF = vitesse_seuil / vitesse_réelle` (équivalent course de la même définition)
- Natation : `IF = CSS / allure_réelle` — **inversé par rapport aux deux autres** (nager plus vite qu'une référence donne un IF plus haut, alors qu'une allure /100m plus rapide est un temps plus *petit* : attention au sens de la division à l'implémentation).
- `TSS = heures × IF² × 100` — définition Coggan (2003) pour le vélo, étendue aux autres disciplines par Skiba (2008). Permet une équivalence de charge cross-discipline (ex. écran 35 "Remplacer une séance" : comparer deux séances de disciplines différentes par leur TSS plutôt que par leur durée seule).
- Pas de badge de preuve sur la définition elle-même (IF, TSS sont des définitions mathématiques, pas des hypothèses) — mais toute équivalence de charge affichée à l'utilisateur (ex. "cette séance de remplacement porte la même charge") doit rappeler que c'est un modèle de charge, pas une mesure physiologique directe.

### Glucides course
- `total_g = débit_g_par_h × durée_h`
- Repère de débit : jusqu'à 90 g/h atteignables avec un mélange glucose:fructose ≈ 2:1 (deux transporteurs intestinaux distincts), **à condition d'un entraînement digestif préalable**.
- **Source** : Jeukendrup, A. (2014), *Nutrition Reviews* — déjà cité nommément dans le mockup (écran 14).
- **Niveau de preuve affiché** : **SOLIDE** (déjà le verdict du mockup pour ce point précis).

### Sodium / hydratation
- `pertes_hydriques_L = taux_sudation_L_par_h (profil) × durée_h`
- Repère sodium : 400 à 800 mg/L de sueur perdue (fourchette large, grande variabilité individuelle).
- **Source** : recommandations générales type ACSM *Position Stand on Exercise and Fluid Replacement* — fourchette large explicitement due à l'hétérogénéité inter-individuelle, cohérent avec le mockup.
- **Niveau de preuve affiché** : **FAIBLE** (déjà le verdict du mockup).

### Pacing multi-segments triathlon
- Input : format de course, distances par segment, temps cible total (ou allures/puissances cibles par segment)
- Output : tableau segment → allure/puissance cible → temps → cumul (reproduit l'écran 09)
- **Méthode** : répartition du temps cible par segment à partir des références de l'athlète (CSS, FTP, seuil course) pondérées par un IF cible par discipline saisi par l'utilisateur (ex. IF vélo 0,78 dans l'exemple), plus des durées de transition T1/T2 fixes ou déclarées. C'est une **règle produit d'allocation, pas une formule sourcée** — à documenter comme telle dans l'UI, sur le même principe que la règle « longues sorties le samedi » du générateur (assumée, non prétendue scientifique).
- Pas de badge SOLIDE/MODÉRÉE/FAIBLE : afficher plutôt la mention « répartition calculée depuis tes références, pas une prédiction validée par une étude ».

### Convertisseur d'allure natation
- Conversions pures entre allure /100m, vitesse km/h, vitesse m/s, et temps sur une distance donnée. Arithmétique simple, aucune source nécessaire.

---

## Récapitulatif des 12

| # | Nom | Statut | Badge |
|---|---|---|---|
| 03 | FTP → zones de puissance | confirmé mockup | MODÉRÉE |
| 04 | Bassin → eau libre | confirmé mockup | FAIBLE |
| 07 | Test 20 min → seuil (FTP) | confirmé mockup | FAIBLE |
| 08 | Test 30 min course → seuil + VMA | proposé, validé utilisateur | FAIBLE *(revu à la baisse 2026-08-21, non confirmé par `zoned`)* |
| 09 | CSS via 400m/200m | proposé, validé utilisateur | MODÉRÉE *(source précisée : Ginn 1993, confirmée par `zoned`)* |
| 10 | Atlas des zones (vue combinée) | proposé, validé utilisateur | MODÉRÉE |
| 11 | Allure seuil course → zones d'allure | proposé, validé utilisateur | MODÉRÉE *(basculé sur Daniels puis revenu à Friel le 2026-08-21 — Friel reproduit mieux l'atlas du mockup Zoned Tri)* |
| 12 | Zones de FC (%FCmax) | proposé, validé utilisateur | FAIBLE |
| — | Intensity Factor & TSS unifié | proposé, validé utilisateur ; étendu 2026-08-21 (`zoned`) | définition |
| — | Glucides course | proposé, validé utilisateur | SOLIDE |
| — | Sodium / hydratation | proposé, validé utilisateur | FAIBLE |
| — | Pacing multi-segments triathlon | proposé, validé utilisateur | règle produit non sourcée |
| — | Convertisseur d'allure natation | proposé, validé utilisateur | définition |

12 calculateurs distincts au total (les 5 derniers sans index confirmé se partagent les indices 01-02/05-06 restants, ordre libre à l'implémentation).
