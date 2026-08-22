# Continuity — reprise écran par écran (handoff du 21/08)

## AU RÉVEIL — l'essentiel en dix lignes

**57 artboards sur 63 sont faits.** Il ne reste que les six **gestes** (31 → 36), le bloc le plus
lourd : glisser-déposer avec coût calculé en direct, pas de la mise en page.

État vérifié : 18 routes × 3 largeurs = **54 rendus, tout propre** · `tsc` propre · **881 tests**
sur 93 fichiers · `oxlint` 11 avertissements tous préexistants · **zéro valeur en dur restante**
(plus un seul `TODO jeton`) · plus un seul `PlaceholderPage`.

Pour manipuler : `npx vite --port 5177`. Chaque section a son atelier d'aperçu, monté en
développement seulement : `/apercu/aujourdhui/:state` · `/apercu/semaine/:state` ·
`/apercu/macro/:state` · `/apercu/plans/:state` · `/apercu/seance/:state` · `/apercu/seances/:state` ·
`/apercu/courses/:state` · `/apercu/outils/:state` · `/apercu/systeme/:state` ·
`/apercu/generateur/:state` · `/apercu/reglages/:state` · `/apercu/exports/:state`.

**Six décisions t'attendent** — voir « Open Questions » plus bas. La plus urgente : `/plan/reglages`
n'a aucune porte d'entrée, et aucun artboard n'en dessine une.


## Goal
Refaire l'UI de Zoned Tri écran par écran contre `Zoned TRI Brut - App.dc.html`, dans l'ordre du
README §5, en trois largeurs (390 / 834 / 1280), avec validation de l'utilisateur entre chaque
écran. Fini pour un écran = mesuré au getComputedStyle contre son artboard, aucun débordement,
en-tête 46 px, cibles ≥ 44 px, tout vide nommé, tests + tsc + oxlint verts.

## Constraints
- Le socle non visuel est conservé (domaine, 12 calculateurs, stockage IndexedDB, 472 tests) —
  décision utilisateur du 21/08. Seule l'UI est refaite.
- La maquette du nouveau handoff est **byte-identique** à celle déjà utilisée
  (`md5 be17020b…` App, `e1c73a3d…` Design System) : `/home/andrea/Downloads/Zoned Tri(1)/design_handoff_zoned_tri/`.
- Aucune valeur en dur dans les écrans : tout passe par `src/styles/tokens.css`.
- Vérification obligatoire : comparaison mesurée app ↔ artboard, pas à l'œil.

## Key Decisions
- **Arbitrages README ↔ canevas** (le canevas rendu l'emporte, l'écart est signalé) :
  - Zones : 6 paliers du Design System (Z5 `#E5261B`, Z6 `#8A46E0`), pas les 5 du README §2
    (qui donne Z5 = `#FF5A3C`, la couleur de la course — simplification fautive).
  - Colonne sombre de S9 : `width:56%` **en `content-box`**, soit 774,5 px réels (60,7 %), parce
    que c'est ce que rend l'artboard. Le README dit « 56 % » en citant la valeur CSS.
  - Nombre d'écrans : 63 étiquettes `data-screen-label`, pas 53.
- **Cibles tactiles** : les jetons de 21 px du canevas (chip « Voir », icônes d'en-tête) gardent
  leur apparence et reçoivent une cible de 44 px par pseudo-élément centré.
- **Tablette** : aucun artboard. Règles du README §3 appliquées — affiche empilée à fond perdu,
  état en `1fr / 292px`, gouttière 26 px, action principale « en bas de la colonne » (elle suit le
  contenu, elle n'est pas poussée en bas de l'écran, ce qui creuserait un blanc muet).
- `Button` (ancien) est conservé pour les écrans pas encore repris ; il disparaît quand le dernier
  appelant est migré vers `PrimaryAction` / `SecondaryAction`.

## State
- Done:
  - [x] Étape 0 · jetons alignés (§2) + les 13 composants du §4
  - [x] Écran 01 · Ouverture (01 / 01b / 01c + S9 / S9b / S9c), trois largeurs, mesuré — VALIDÉ
  - [x] Écran 02 · Aujourd'hui, **mobile** (02, 02a, 02b, 02c, 15) — mesuré bloc à bloc
  - [x] Écran 02 · Aujourd'hui, **tablette + desktop** (S4) — agent, puis vérifié et complété
  - [x] Courses · 08, 09, 10, 11, 27, 30, S7 — agent, routes câblées, jetons ajoutés, vérifié
  - [x] Outils · 12, 13, 14, S8 — agent, routes câblées, vérifié
  - [x] Semaine · 03, 16, S6 — agent, jetons et encart de rail ajoutés, vérifié
  - [x] Système · S2, S3, 17, 18, 19 — agent, routes et jeton câblés, vérifié
  - [x] Bibliothèque · 07, S5, 25, 26, 40 — agent, jetons et route câblés, vérifié
  - [x] Générateur · G1→G6, 06, 37, 38, 39 — agent, routes et jetons câblés, vérifié
  - [x] Vue macro · 04 + Mes plans · 41 — agent, routes et jetons câblés, vérifié
  - [x] Détail de séance · 05, 28, 29 — agent, jetons, route et coutures câblés, vérifié
  - [x] Sorties fichier · 20, 21, 22, 23, 24 — agent, routes et jetons câblés, vérifié
  - [x] **Plus aucun `PlaceholderPage` dans le produit** — toutes les routes mènent à un écran
  - [x] Méthode écrite (`thoughts/shared/METHODE-REPRISE-ECRAN.md`) + recette outillée (`tools/recette/`)
  - [x] Atelier d'aperçu en développement : `/apercu/aujourdhui/:state`
- Now: [→] l'utilisateur dort et m'a confié la conduite du projet. Deux agents en vol :
  - Sorties fichier · 20, 21, 22, 23, 24 (`src/pages/exports/`)
- Remaining (ordre du README §5) :
  - [ ] 05 · Détail de séance (05, 28, 29) + 06 simulation
  - [ ] G1 → G6 · Génération (+ 37, 38, 39)
  - [ ] 07 · Bibliothèque (+ S5, 25, 26, 40)
  - [ ] 08 → 11 · Courses (+ 27, 30, S7)
  - [ ] 12 → 14 · Outils (+ S8)
  - [ ] S1, S2, S3, 17, 18, 19 · Système
  - [ ] 20 → 24 · Impression et exports
  - [ ] **31 → 36 · Gestes** — le seul bloc entièrement à faire (annuler 6 s, dépôt coûteux,
        test 30 min, glisser pour déplacer, remplacer, ajouter/supprimer). C'est le plus lourd :
        glisser-déposer avec coût calculé en direct, pas de la mise en page.

## Composants du §4 — état
| README | Fichier | État |
|---|---|---|
| AppFrame | `components/AppShell.tsx` | existant |
| ScreenHeader | `components/ui/AppHeader/` | existant (+ cible 44 px ajoutée) |
| DisciplineTag | `components/ui/Badge/` (`DisciplineTag`) | refait : mono 700, tailles sm/md/lg, encre |
| ZoneTag | `components/ui/Badge/` (`ZoneTag`) | refait : idem, Z5/Z6 en papier |
| Card | `components/ui/Card/` | **nouveau** — plain / featured / hypothesis |
| EmptyState | `components/ui/EmptyState/` | **nouveau** — `sentence` obligatoire |
| NoteBox | `components/ui/NoteBox/` | **nouveau** |
| PrimaryAction | `components/ui/PrimaryAction/` | **nouveau** — lime+ombre orange / ink |
| SecondaryAction | `components/ui/SecondaryAction/` | **nouveau** — chip / block / link |
| ProgressBar | `components/ui/ProgressBar/` | **nouveau** — avancement ou répartition |
| WeekStrip | `components/ui/WeekStrip/` | **nouveau** — 7 colonnes, jour libre en pointillé |
| UndoBanner | `components/ui/UndoToast/` | existant |
| ConfirmSheet | `components/ui/ConfirmSheet/` | **nouveau** — `effect` obligatoire |

## Journal

### 2026-08-21 · Écran 02 · Aujourd'hui, mobile — terminé
Mesuré au `getComputedStyle` contre 02 / 02a / 02b / 02c / 15. Après correction, les blocs
coïncident au pixel ; les seuls écarts restants viennent des **données** (le titre de la séance de
démonstration tient sur une ligne là où l'artboard en met deux).

Corrigé :
- **la frise de répartition faisait 10 px de couleur au lieu de 14** — le canevas l'écrit en
  `content-box`, ses deux filets de 2 px s'ajoutent. `ProgressBar` gagne une variante `framed` ;
- **les jetons perdaient 2 px de haut** (`line-height:1.3` imposé là où le canevas laisse `normal`) ;
- **les boutons bordés perdaient 4 px** (même cause : `min-height` en `content-box` dans le canevas) ;
- **les pieds d'écran flottaient au milieu de la page** — ils sont maintenant collés en bas
  (`margin-top:auto`), comme le `justify-content:space-between` du canevas ;
- **la note de preuve** était un encart `EvidenceNote` ; l'artboard 02 en fait un appel de note
  « 1. » en mono 10 px, lié au `<sup>1</sup>` de la ligne chiffrée ;
- **la légende du mini-profil** annonçait « hauteur et couleur · zone » alors que les barres sont
  colorées par discipline dans 02 et S4 — contradiction interne. Nouveau
  `buildTodayProfileBars()` : effort en couleur de discipline, éch./RAC en `#8F8F86`, arrêt en
  filet, et la légende à trois entrées de l'artboard ;
- **« voir la semaine → » ajouté à 02b** et **« Reste cette semaine » ajouté à 15** : deux contenus
  qui n'existent pas dans ces artboards, retirés ;
- **les distances de natation** perdaient leur séparateur de milliers (« 2400 m » au lieu de
  « 2 400 m ») en trois endroits ;
- **les données de démonstration étaient écrites sans accents** (« Allure derivee du CSS mesure le
  3 aout ») ; réécrites, et les titres alignés sur ceux des artboards.

Écart assumé : la frise montre **quatre** segments (N/V/C/R) là où l'artboard en montre trois,
parce que la semaine de démonstration porte 30 min de renforcement. C'est la donnée qui diffère,
pas le code — masquer R cacherait du volume réel.

### 2026-08-21 · Écran 02 · S4 (tablette + desktop) — terminé
Construit par un agent, puis vérifié et complété par moi. La grille passe à `1fr 292px` dès 768 px
et `1.3fr 400px` en desktop, le rail de 240 px apparaît en desktop seulement, le tableau
`BLOC / CIBLE / REPOS` et l'histogramme des sept jours n'apparaissent qu'à partir de la tablette —
exactement ce que dit le script `renderVals()` de l'artboard S4, qui est la source la plus précise
du responsive de tout le produit.

L'agent a écrit un outil qui résout les `{{ tweaks }}` de S4 et réinjecte le balisage dans la page
du canevas : les valeurs tablette et desktop sont donc **mesurées**, pas déduites. Le tableau des
blocs tombe à 122 px des deux côtés, le bloc de rail à 68 px, l'histogramme à 78 px.

Complété après coup :
- **cinq cibles interactives sous 44 px** trouvées à la mesure — les entrées du rail (43 px), la
  puce `.FIT` (31), le lien vers la semaine (15), et surtout **« Marquer comme faite » (24 px)**,
  l'action principale de l'écran. Toutes étendues par pseudo-élément, sans rien déplacer ;
- le décompte « n séances restantes cette semaine » n'apparaissait qu'en desktop : `AppHeader`
  gagne `rootActions`, et il s'affiche dès la tablette comme dans S4 ;
- `swimSetRows.ts` remonté de `src/pages/workouts/detail/` vers `src/domain/` : c'est du calcul,
  et l'écran Aujourd'hui l'importait de page à page ;
- **le lien « voir la semaine → » retiré de la colonne latérale**, que S4 n'a pas. Il était le seul
  chemin vers `/plan/semaine` au-delà de 768 px : c'est désormais l'intitulé « Semaine 07 / 18 »
  de la colonne qui y mène — aucun élément ajouté, aucun cul-de-sac. Le bloc retombe à 157 px,
  la valeur du canevas.

Écarts assumés, à arbitrer :
- **bandeau tablette à 46 px** là où S4 en dessine 52. Le README §3 dit 46 pour la tablette ; on
  suit le README, l'écart est de 6 px sur toute la colonne à 834 px ;
- **coin haut droit : le volume hebdomadaire**, pas le décompte `J-77` de S4. Le décompte est
  publié dans le rail, comme S4 le fait aussi ;
- **date sur une ligne dès 768 px** (`MARDI 25 AOÛT`) alors que l'artboard 02 la coupe en deux :
  chaque artboard est suivi à sa largeur.

### 2026-08-21 · Courses et Outils — 11 artboards livrés par deux agents
**Courses** (08, 09, 10, 11, 27, 30, S7) et **Outils** (12, 13, 14, S8). Tous les blocs à 2 px près
du canevas, 42 rendus contrôlés (14 écrans × 3 largeurs) : aucun débordement, aucune cible sous
44 px, aucun arrondi, aucune ombre floutée, aucune erreur de page.

Câblé par moi : les onze routes dans `App.tsx`, les quatre jetons manquants
(`--fs-data-sm/md/lg`, `--fs-title-sm`) en remplacement des valeurs en dur.

Deux défauts trouvés à la vérification, tous deux systémiques :
- **le carré de retour faisait 38 px** — six de moins que la cible minimale, sur *tous* les écrans
  non racines du produit. Étendu à 44 px par pseudo-élément dans le composant ;
- **tous les titres coupés se lisaient d'un mot** : `Mes<br />références` donne « Mesréférences »
  à un lecteur d'écran. Nouveau composant `StackedTitle`, qui coupe par le texte et non par un
  élément vide ; huit titres migrés, un test de garde, la règle ajoutée à la méthode.
Plus un défaut local : l'unité du grand résultat de l'artboard 13 se brisait entre « /100 » et
« m », l'exposant de note venant s'intercaler.

Décision prise : **la version de schéma passe à 1.5**, découplée de la version de produit (`1.4`,
que les artboards S2 et S3 écrivent). `RaceNutrition.items` a changé de forme ; une sauvegarde 1.4
se serait importée sans erreur en rendant des libellés vides. L'import la refuse désormais, ce qui
est exactement ce que l'artboard 19 décrit. Réversible en une ligne.

### 2026-08-21 · Semaine · 03, 16, S6 — terminé, et l'audit corrigé
**L'audit de la première passe était périmé sur cinq points sur six.** Mesuré avant de toucher au
code : `03` mobile existait bel et bien, le bandeau desktop faisait déjà 52 px, le rail actif était
déjà un aplat, la frise faisait déjà 18 px, la frise se limitait déjà à N/V/C, et le texte héritait
déjà de l'encre. **Le vrai trou était l'artboard `16` (jours doublés), absent — que l'audit ne
mentionnait pas.** Leçon retenue et inscrite dans la méthode : on mesure avant de croire un rapport.

Livré : `16` monté comme un **état** et non comme un écran (la bascule découle des données —
`doubledDayCount > 0`), deux variantes de jeton nommées (`outline` au filet, `ink` inversé sur le
lime), la frise et l'histogramme rendus par `ProgressBar` et `WeekStrip`, et surtout **un seul
calcul de barres pour tout le produit** : `computeWeekBars` est désormais partagée par la colonne
de contexte de S4 et l'histogramme de 03, avec un test qui l'exige. Un doublon de
`dominantDiscipline` a été supprimé.

Mesures : les sept blocs de `03` au pixel (46/65/18/26/122/392/55), les trois formes de ligne de
`16` exactes (simple 54, groupe doublé 108, jour de repos 36), et S6 identique au canevas sur son
rail comme sur sa grille.

Complété par moi : les cinq jetons demandés (`--space-1`, `--space-25`, `--fs-title-lg`,
`--ls-label-tight`, `--ls-label-loose`), l'**encart jaune du rail de S6** — « Rien n'est écrit sans
que tu le voies » — qui était le seul bloc du canevas encore absent du produit, et l'atelier
d'aperçu rapatrié sur `/apercu/semaine/:state`.

Écart assumé : **le glisser-déposer n'est pas implémenté**, délibérément. La règle exige l'aperçu
avant / après, une validation explicite et 6 s d'annulation ; un demi-geste aurait été pire que
rien. La poignée et sa mention sont là, inertes, avec un `title` qui le dit.

### 2026-08-22 · Système · S2, S3, 17, 18, 19 — terminé
Cinq artboards qui n'avaient aucun code. Tous les blocs à ±0 px du canevas, mesurés à 390 px et à
386 px (la largeur réelle de la colonne de l'artboard, cadre déduit — l'astuce isole les vrais
écarts des artefacts de cadre).

Le `PlaceholderPage` a disparu du dépôt : **plus une seule route du produit ne mène à un écran
vide**. Le `*` de fin rend l'artboard 18, dans la coquille, avec son fil d'Ariane et deux sorties.

Trois corrections que seule la mesure pouvait donner : la bascule de S2 est en `content-box` et
occupe 48 × 28 et non 44 × 24 ; les lignes de liste font 43 px et non 44 (la cible passe par un
pseudo-élément) ; l'action d'encre de 18 et 19 fait 48 px là où le générateur en pose 51.

**L'agent a refusé d'inventer, et c'est le point le plus important du lot.** L'artboard S3 affiche
« 100 / 46 / 12 % » de couverture de traduction : rien n'adosse ces chiffres, **aucune chaîne du
produit n'est traduite**. Les trois barres valent donc 0 %, l'anglais est inerte avec sa raison, et
deux formules qui auraient menti ont été réécrites — « EN · partiel » devient « EN · non traduit »,
« interface traduite · contenu partiel » devient « aucune chaîne traduite ». Même traitement pour
« catalogue des 1 240 courses » (aucun catalogue distant n'existe) et pour « dernier catalogue ·
12 août · 09:41 » (rien n'a jamais été téléchargé → tiret).

Un écart de deux lignes sur l'artboard 17 s'explique par **l'apostrophe** : le canevas écrit `L'app`
avec une apostrophe droite, le produit `L’app` avec une courbe, plus étroite. La phrase est pile sur
la limite de retour à la ligne. Notre typographie est la bonne.

**L'import a enfin une porte** : l'artboard 19 en donne une (« Choisir un autre fichier »), et elle
est branchée sur `importBackup` en tout-ou-rien. Il manque toujours le **premier** point d'entrée,
qu'aucun artboard ne dessine — le contrat est prêt du côté de l'artboard 14.

### 2026-08-22 · Bibliothèque · 07, S5, 25, 26, 40 — terminé
La passe la plus rigoureuse du lot. **Six griefs de l'audit sur seize étaient périmés** — l'en-tête
de 07, les jetons de zone, les commandes de S5, son titre, son rail actif et son bloc de rail
étaient déjà conformes. Dix étaient réels et sont corrigés.

Sur le tag `BRICK` : le grief était juste sur la ligne de liste, **faux sur le fond**. « Brick 24 »
existe bel et bien dans le canevas — artboard 40, rangée *Discipline* de la feuille de filtres.
C'est une facette filtrable, et rien d'autre : retiré des lignes, gardé dans 40.

Ce que l'audit n'avait pas vu, et que la mesure a sorti — dont **un `border-radius: 50%`** sur une
loupe dessinée en CSS dans l'artboard 25, c'est-à-dire l'interdit absolu du système ; un en-tête à
48 px qui faisait sauter la page à l'ouverture de la recherche ; un « aucun résultat » rendu en
paragraphe nu, sans cadre ni phrase nommée (règle 1 violée) ; des jetons de filtres rendus deux
fois ; et les six aplats de zone éteints à 0,4 tant qu'aucune zone n'était filtrée — ce qui se lit
« tout est exclu » alors que tout passe.

Mesures : tous les blocs des cinq artboards à ±1 px. Les écarts restants sont de données.

**Correction que je dois porter au compte rendu : le catalogue compte 32 séances, pas 312.** Le
canevas écrit 312, c'est le chiffre du contenu final. J'avais écrit « 312 » en dur dans l'écran
d'ouverture, et « 4 calculateurs » là où il y en a douze. Les deux comptes viennent désormais de la
donnée (`SEED_WORKOUTS.length`, `CALCULATORS.length`). Un compte affiché qui ne correspond à rien
est exactement ce que ce produit s'interdit.

**Le carré orange de 8 × 8 px n'est rendu nulle part**, et c'est délibéré. Il apparaît deux fois
dans tout le canevas (07 l. 1002, 25 l. 2905), toujours sur la première ligne, jamais légendé, et
n'encode ni la discipline ni l'appartenance au plan. Aucune règle n'en est dérivable : le poser
serait en inventer une.

### 2026-08-22 · Générateur · G1→G6, 06, 37, 38, 39 — terminé
Trois griefs de l'audit sur six encore périmés (le double chrome, le retour en glyphe et la ligne
désaxée de G1 étaient déjà conformes — le débord de 10 px est même **voulu** par le canevas).

**La jauge de preuve que j'avais approuvée était fausse, et elle s'était propagée.** Je l'avais
posée « remplie à proportion » (100 / 55 / 25 %). L'agent a relevé ses **26 occurrences** dans le
canevas : les trois niveaux se distinguent **au motif**, pas au remplissage — solide = aplat
d'encre sans contour, modérée = contour de 2 px vide, faible = hachures à 45° au filet de 1 px.
Corrigé dans le composant partagé, ce qui redresse du même coup les artboards 09, 10 et 13.

Livré aussi : `37`, `38` et `39`, c'est-à-dire le cœur de « rien dans le dos de l'utilisateur ».
`38` est **au pixel sur toute sa colonne**. Et surtout, aucun second calcul : `formFromPlan` relit
un plan enregistré comme un formulaire, `generatePlan` produit le candidat, et l'écran compare —
l'« après » affiché **est** le plan qui sera écrit. Un test l'exige (rejouer un plan inchangé rend
le même plan). `applySettingToPlan` n'écrase jamais une semaine passée ni une semaine portant une
séance faite.

Écarts assumés, tous du même genre : le canevas **dessine** un réglage, le produit doit
l'**offrir**. Une ligne inerte de 29 px devient une vraie cible de 44 ; une raison affichée devient
une raison saisissable ; une aide qui nomme une option devient l'option. Chaque fois, +14 à +89 px
et la règle des 44 px l'emporte.

### 2026-08-22 · Vue macro · 04 et Mes plans · 41 — terminé
`04` est **au pixel sur ses sept blocs**, et jusque dans le détail (pastilles 26 × 10, statut à
x328, hachure 30 × 10). `41` a trois écarts de 5 à 6 px, tous assumés : ce sont **les règles du
système contre le dessin** — le canevas y pose des boutons de 42 et 46 px, sous les 44 px exigés,
et repeindre le padding d'un `NoteBox` par écran serait le repeint local que la méthode interdit.

Deux incohérences internes de l'artboard 04, tranchées en dérivant plutôt qu'en recopiant : la
phase active y est marquée `7/8` alors que la semaine 07 sur 18, après 4 semaines de base, est la
**3ᵉ** de la construction — le « 7 » est celui de « Semaine 07 », recopié ; et `J-77` correspond au
14 juin, hors de la semaine 07, quand le lundi de cette semaine donne `J-76`.

Câblé par moi : les quatre routes, les jetons (`--fs-data-xl`, et surtout **`--color-phase-*`**,
des alias nommés — le canevas réemploie la palette des zones, mais une phase n'est pas une
intensité), et **le titre de la Semaine devenu la porte de la vue macro**, comme la ligne grise de
`04` le prescrit. Sa cible ne faisait que 34 px, portée à 44.

`/plans` était une **dépendance ferme** : l'écran d'ouverture y envoie désormais ses archives, dont
les boutons étaient jusqu'ici désactivés sur « L'archive des plans n'a pas encore d'écran » — une
phrase devenue fausse.

### 2026-08-22 · Détail de séance · 05, 28, 29 — terminé
**Cinq griefs de l'audit sur six encore périmés** — un seul bandeau, le carré de retour, le fil
d'Ariane, la colorisation, les répétitions dessinées une à une et les libellés étaient tous déjà
conformes. Le seul défaut réel n'était pas dans la liste : un `margin-top:2px` de trop sur les
valeurs chiffrées, 83 px contre 81.

**Deux découvertes de fond.**

1. **L'échelle des hauteurs de barres était fausse.** Le code plafonnait Z4 à 78 %, valeur
   qu'aucun artboard n'écrit. Relevé croisé de six profils (Design System, 15, 28, 29, 05, S5) :
   `Z1 34 · Z2 42 · Z3 58 · Z4 96 · Z5/Z6 100`. C'était **11 px d'erreur** sur le graphe de 29.
   La correction redresse aussi le graphe encadré de l'artboard 15 dans Aujourd'hui.
2. **L'artboard 05 est seul à colorer l'effort par discipline**, et le canevas se contredit
   lui-même : le panneau de S5 dessine *la même* séance avec l'effort en couleur de zone, et le
   composant canonique du Design System aussi. Cinq artboards contre un — on garde la zone pour
   les fiches, la discipline restant réservée à Aujourd'hui (02, S4). Documenté dans le domaine.

**`WorkoutContextPanel` supprimé.** Il avait été bâti d'après S4, donc d'après l'écran Aujourd'hui,
et **il mentait** : il affichait la semaine du plan actif même quand la fiche ouverte venait du
catalogue. La fiche vit désormais dans une colonne bornée à 440 px, centrée dès la tablette — la
largeur du panneau de S5, seul artboard qui montre une fiche en large.

Ajouts réels : les watts calculés depuis la FTP (96 % × 248 W = 238 W, la valeur de l'artboard au
watt près), l'encart « sans capteur de puissance » avec sa fourchette de FC et la phrase du canevas
« les watts sont masqués, pas estimés », la ligne « Terrain » de 29, la colonne IF rendue **inerte**
avec sa raison — un IF demande une puissance normalisée, donc un enregistrement.

Câblé par moi : les huit jetons, la route d'aperçu, **le fil d'Ariane à trois segments** (les deux
appelants nomment leur écran) et **la composition de S5 dans son panneau** de la Bibliothèque, qui
rendait jusqu'ici la version mobile.

### 2026-08-22 · Sorties fichier · 20, 21, 22, 23, 24 — terminé
**Quatre formats sur cinq sont réellement écrits**, plus seulement dessinés :
- **`.ICS`** conforme à la RFC 5545, avec le pliage de ligne compté en octets et l'échappement des
  sauts de ligne — sans quoi l'agenda afficherait le déroulé en un seul paragraphe ;
- **`.ZWO`** en XML Zwift ;
- **`.PDF`** par `@media print`, sans bibliothèque : vérifié à 594,96 × 841,92 pts, trois pages,
  aucune page blanche. L'unité `--u` vaut `1px` à l'écran et `210mm/520` au papier, si bien que
  `calc(26 * var(--u))` se relit contre le `padding:26px` de l'artboard ;
- **`.PNG`** par canevas 2D fait main, vérifié à 1080 × 1080 — une capture d'écran aurait dépendu
  de l'appareil et du zoom. Le gabarit mesurable et le fichier écrit lisent le même modèle.

**`.FIT` reste inerte**, avec son motif exact : binaire Garmin, décision antérieure du projet.

Deux points d'honnêteté : la carte PNG **nomme** la référence (« Allure au CSS ») sans la publier,
et un test l'exige ; et l'artboard 20 annonce « 1 séance · 4 Ko » pour le `.FIT` — on n'affiche que
« 1 séance », parce qu'un poids inventé pour un fichier jamais écrit serait pire qu'un vide.

Deux trames d'abord fausses, corrigées d'après ce que l'artboard dessine : « facile » appliqué à
toute journée Z1/Z2 noircissait la page (un plan polarisé en compte 78 %), et « séance clé »
appliqué à toute journée doublée hachurait presque tout.

## Open Questions

### À arbitrer par l'utilisateur
1. **Deux calculateurs contredisent leur artboard.** `openWaterPaceFromPool` donne 1:33 là où
   l'artboard 13 affiche 1:41 ; `cssFrom400And200` donne 1:36 là où la carte de S8 affiche 1:34.
   Les calculateurs sont écrits en TDD avec leurs sources ; les artboards sont dessinés à la main.
   **Recommandation : garder le calculateur.** Afficher un chiffre que le moteur ne sait pas
   reproduire ruinerait la promesse « chaque chiffre trace sa source ».
2. **Temps cible de la course : 5:24:30 (somme des segments) ou 7:08:30 (en-tête de l'artboard 09) ?**
   L'artboard affiche un total qui n'est pas celui de ses propres parts. L'agent a gardé la somme.
   Même raisonnement, même recommandation.
3. **Total de glucides : 370 g (calculé) ou 348 g (artboard 10) ?** 348 g n'est pas dérivable de
   78 g/h sur 4 h 45. Idem.
4. **Quatre ou douze calculateurs ?** S8 dit « 4 calculateurs » et n'en dessine que quatre ; la
   ligne grise de la section et la spécification en annoncent douze. L'agent a mis les douze.
5. **Bandeau tablette : 46 px (README) ou 52 px (S4) ?** Écart de 6 px sur toute la colonne à 834.

### Manques à combler, signalés par les agents
- **`/plan/reglages` n'a toujours aucun point d'entrée — DÉCISION À PRENDRE.** L'agent de la vue
  macro a mesuré et conclu que `04` n'offre aucune place : 17 px de marge libre sous le pied, et
  87 px sur la rangée d'export, ce qui mélangerait un export et un réglage. Il n'a donc rien posé,
  et je le suis. `/plan/journal` est atteignable dès que 37 l'est (le fil d'Ariane de 39 dit
  « Plan / Réglages / Journal », et l'écran 37 câble déjà l'accès).
  Trois options chiffrées :
  1. **une quatrième ligne au pied de 04** — l'écran passe de 780 à ~792 px, aucun bloc au-dessus
     ne bouge (vérifié : le pied est le seul élément à `margin-top:auto`) ;
  2. **le rail desktop**, qui porte déjà « ≡ Réglages » vers `/settings` et pourrait porter
     « Réglages du plan » quand un plan est actif — mais le canevas ne lui donne qu'une ligne de
     pied ;
  3. **le menu S1**, validé par l'utilisateur et donc intouchable sans son accord.
  Note : `PlanSettingsScreen` renvoie son retour vers `/plan`. Si la porte finit ailleurs, ce
  retour est à revoir.
- **`TrainingPlan` n'a pas de champ `name`.** L'artboard 41 nomme ses plans (« Hiver base ») ; le
  produit retombe sur la course, sinon sur le format.
- **`39 · Défaire` est inerte** : un vrai retour arrière suppose un instantané du plan d'avant, que
  `PlanJournalEntry` ne porte pas. L'annulation de 6 s, elle, est réellement tenue.
- **Aucun artboard ne dessine le PREMIER point d'entrée de l'import.** Le retour d'erreur (19) en
  a un et il est branché ; ce qui manque est la commande initiale, qui appartiendrait à l'artboard
  14. Il faut un artboard, ou une décision.
- **Le thème sombre n'a pas de palette.** `renderVals()` de S4 en définit une complète
  (`#141412`, `#EFEDE6`, `#4EB8DC`…) ; `tokens.css` n'en porte qu'une. Les options « Sombre » et
  « Système » de S2 sont rendues, inertes, avec leur raison.
- **Aucune chaîne n'est traduite** : S3 est structurellement là, la traduction reste à faire.
- **Le catalogue compte 32 séances sur les 312 annoncées** et 23 d'entre elles n'ont pas de
  distance. Une passe de contenu reste à faire ; aucun écran ne fige le chiffre.
- **Le carré orange de 8 × 8 px des artboards 07 et 25** : sens inconnu, non rendu. Trois lignes
  suffiront le jour où on saura ce qu'il dit.
- **La facette « Matériel » de la feuille de filtres** est inerte : `Workout` n'a qu'un champ
  `location`, et « bassin 25 m » / « home-trainer » / « sans capteur » sont trois notions que le
  modèle ne distingue pas.
- `AthleteProfile.maxHeartRateBpm` est obligatoire alors que S8 dessine « jamais mesurée » — le
  champ devrait être optionnel.
- Un marqueur `isReferenceTest` sur `Workout` réglerait proprement « prochain test au plan », qui
  se résout aujourd'hui par le titre de la séance.
- La jauge de preuve : l'artboard 09 dessine un rectangle **vide** pour « modérée » et 10 un
  rectangle **hachuré** pour « faible », là où on remplit à proportion. À harmoniser.

- UNCONFIRMED : une autre session écrivait dans `src/pages/workouts/detail/` (dernière écriture
  22:21, silencieuse depuis). `swimSetRows.ts` en a été remonté vers `src/domain/`.
- UNCONFIRMED : le README §3 retire la loupe de l'en-tête tablette. Non appliqué — la recherche
  plein écran n'aurait plus aucun accès entre 768 et 1023 px (cul-de-sac).

## Working Set
- Branche `main`, non commité. Maquette : `/home/andrea/Downloads/Zoned Tri(1)/design_handoff_zoned_tri/`
- Vérifs : `npx tsc -b --force` · `npx vitest run` · `npx oxlint` · serveur `npx vite --port 5177`
- Recette de mesure (scratchpad de session) : `shot.mjs` (3 largeurs + contrôles), `box.mjs` /
  `box9.mjs` (diff bloc à bloc app ↔ artboard), `canvas.mjs` (rendu d'un artboard),
  `diff01.mjs` (diff typographique par repère de texte). Chrome via
  `playwright-core` + `executablePath:'/usr/bin/google-chrome-stable'`.
