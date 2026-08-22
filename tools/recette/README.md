# Recette de fidélité — comparer l'app au canevas, en mesurant

Ces deux scripts existent pour une seule raison : **l'œil ne voit pas 2 px, et 2 px répétés sur
douze blocs font un écran qui ne ressemble plus à la maquette.** On ne valide pas un écran à l'œil,
on le mesure.

## Prérequis

```bash
npx vite --port 5177 --strictPort &     # le serveur de développement
```

Chrome est piloté par `playwright-core` (déjà en dépendance de développement) avec
`executablePath:'/usr/bin/google-chrome-stable'`. Les scripts s'importent par chemin absolu depuis
`node_modules/playwright-core/index.mjs` — c'est volontaire : ça les rend exécutables depuis
n'importe quel répertoire.

Canevas de référence :
`/home/andrea/Downloads/Zoned Tri(1)/design_handoff_zoned_tri/Zoned TRI Brut - App.dc.html`

## `cmp.mjs` — comparaison bloc à bloc

```bash
node tools/recette/cmp.mjs <label> <url> <largeur> <hauteur>
node tools/recette/cmp.mjs 02 http://localhost:5177/apercu/aujourdhui/02 390 780
```

Affiche côte à côte, pour l'artboard et pour l'app, la suite des blocs visibles avec leur position
verticale et leur hauteur. Une ligne marquée `<<` signale un écart de plus de 2 px.

Le script descend automatiquement dans les conteneurs sans peinture propre (ni fond, ni contour, ni
gouttière) : ils organisent, ils ne se voient pas, ils ne doivent donc pas fausser la comparaison.

**Décalage normal de 2 px** : l'artboard porte un cadre de 2 px que l'application n'a pas. Un écart
constant de 2 px sur toute la colonne est donc attendu ; ce sont les écarts *variables* qui comptent.

## `probe.mjs` — comparaison élément par élément

```bash
node tools/recette/probe.mjs <sélecteur-canevas> <url> <sélecteur-app> <largeur> <hauteur>
node tools/recette/probe.mjs '[data-screen-label="02b"] > div:nth-child(4)' \
  http://localhost:5177/apercu/aujourdhui/02b '[class*="doneBlock"]' 390 780
```

Quand `cmp.mjs` signale un bloc trop haut, `probe.mjs` dit lequel de ses enfants en est la cause :
hauteur, `margin-top`, `padding-top`, `font-size`.

## Le piège qui revient tout le temps

**Le canevas est en `content-box`, l'application en `border-box`.** Chaque fois qu'un élément du
canevas porte à la fois une `height`/`min-height` et une bordure, sa hauteur réelle est
`height + 2 × bordure`. Trois exemples déjà rencontrés :

| Canevas | Rendu réel | En `border-box`, écrire |
|---|---|---|
| `height:14px; border-bottom:2px` | 16 px | `box-sizing: content-box` |
| `min-height:44px; border:2px` | 48 px | `min-height: calc(44px + 2 * 2px)` |
| `width:56%; padding:0 30px` | 56 % **+ 60 px** | `box-sizing: content-box` |

Avant de conclure « le canevas fait 4 px de plus sans raison », vérifier le `box-sizing`.

## Ce qui compte comme « fini »

Pour chaque écran, aux trois largeurs (390 / 834 / 1280) :

1. `cmp.mjs` ne signale plus d'écart autre que ceux causés par les **données** (un titre plus court
   qui tient sur une ligne au lieu de deux) — et ces écarts-là se disent dans le rapport ;
2. aucun débordement horizontal (`scrollWidth === clientWidth`) ;
3. en-tête à 46 px, filet de 2 px ;
4. aucune cible interactive sous 44 px (pseudo-élément d'extension si le jeton est plus petit) ;
5. aucun `border-radius`, aucune ombre floutée ;
6. chaque vide porte un cadre pointillé et une phrase ;
7. `npx tsc -b` et `npx vitest run` verts.
