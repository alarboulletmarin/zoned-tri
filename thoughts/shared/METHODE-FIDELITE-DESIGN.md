# Méthode de fidélité au design — procédure obligatoire

**Principe fondateur du projet : l'app EST le design.** Le canevas Claude Design fait foi.
Toute divergence non documentée est un bug, pas une interprétation.

Cette méthode a été mise au point sur l'écran `S1 · Menu` et a révélé 8 écarts majeurs
qu'une comparaison « à l'œil » avait laissés passer pendant plusieurs itérations.
**Elle est obligatoire pour tout écran, nouveau ou refait.**

## La source de vérité

`/home/andrea/Downloads/Zoned Tri/Zoned TRI Brut - App.dc.html` (canevas complet, ~518 Ko).

- Retrouver un écran : `grep -n 'data-screen-label' "<fichier>"` (les numéros de ligne bougent
  à chaque mise à jour du canevas — ne jamais se fier à des numéros mémorisés).
- Lire aussi la **légende descriptive** juste avant l'artboard : elle porte l'intention de l'écran.
- ⚠️ **Ne PAS lire ce fichier via l'outil DesignSync** : il plafonne à 256 Ko et tronque en silence.

## Les 5 étapes

### 1. Lire le markup littéral, jamais un résumé
Lire le bloc HTML de l'artboard **en entier**, avec le tool Read (offset/limit).
Un résumé — même le sien, même récent — perd systématiquement les valeurs qui comptent :
graisses, letter-spacing, paddings asymétriques, ordre des éléments, casse exacte des libellés.

### 2. Extraire l'artboard dans une page servie en local
Isoler le markup de l'artboard dans un fichier HTML autonome, servi localement.
C'est ce qui rend la comparaison **mécanique** au lieu de subjective.

### 3. Rendre le design et l'app dans le MÊME navigateur, au MÊME viewport
Via playwright (`mcp__playwright__browser_*`), serveur de dev sur `http://localhost:5173`.
Même largeur exacte (mobile 390 px, desktop ≥ 1280 px selon ce que définit l'artboard).

### 4. Comparer valeur par valeur avec `getComputedStyle`
**Pas à l'œil.** Bloc par bloc, mesurer et confronter :
couleurs résolues (`rgb(...)`), tailles de police, graisses, `letter-spacing`, `text-transform`,
paddings, gaps, hauteurs de ligne, épaisseurs et couleurs de filets, largeurs de colonnes.
Itérer jusqu'à superposition.

### 5. Vérifier l'autre breakpoint
Un écran conforme en mobile peut être cassé en desktop (et inversement).
Si le canevas ne définit pas de variante pour un breakpoint, **ne pas en inventer une** :
appliquer la règle de la légende et le documenter.

## Règles de conduite

- **Ne jamais inventer une donnée absente.** Un compteur, une date, une métrique qui n'existe pas
  dans le modèle s'affiche en tiret avec une note explicite — jamais une valeur plausible inventée.
- **Ne jamais rendre cliquable ce qui ne mène nulle part.** Un bouton dont l'écran cible n'existe
  pas encore est `disabled` avec un `title` explicatif, pas un lien mort.
- **Vérifier la source réelle des données.** Piège vécu sur S1 : le compteur « Séances » affichait 0
  parce qu'il lisait IndexedDB alors que la bibliothèque lit le catalogue statique. Seule la
  vérification navigateur l'a révélé — les tests unitaires passaient.
- **Documenter tout écart assumé** dans le rapport ET en commentaire dans le code.

## Chaîne de vérification avant de conclure

```bash
npx vitest run        # tout vert, aucun test cassé
npx tsc -b --noEmit   # 0 erreur
npx oxlint            # aucune NOUVELLE remontée (8 warnings préexistants tolérés)
```

Puis vérification visuelle réelle (étapes 3-4 ci-dessus), puis nettoyage de la racine :

```bash
rm -f /home/andrea/projets/github/zoned-tri/*.png
rm -rf /home/andrea/projets/github/zoned-tri/.playwright-mcp
```

## Pièges d'architecture récurrents

- **Chaîne de hauteur non bornée** : un écran desktop qui scrolle mal vient presque toujours de là.
  `.shell { height: 100svh; overflow: hidden }` dans `AppShell.module.css` borne la coquille ;
  chaque colonne interne doit porter `min-height: 0` pour que son `overflow-y: auto` soit actif.
- **Responsive** : `useBreakpoint()` quand le DOM diffère réellement entre mobile et desktop,
  `@media (min-width: 1024px)` dans le `.module.css` quand seules des valeurs CSS basculent.
  Les deux coexistent dans ce repo — rester cohérent avec l'existant.
- **Fichiers partagés** (`src/styles/tokens.css`, `src/App.tsx`, `src/navigation.ts`,
  `src/components/AppShell.*`) : jamais deux agents dessus en parallèle. Les réserver à un seul,
  et n'y ajouter que des lignes (jamais réorganiser) quand du travail concurrent tourne.
