# Zoned Tri

Application d'entraînement triathlon. Hors-ligne complet, aucun compte, données locales.

Le style est une affiche de club sérigraphiée : contours noirs de 2 px, aucun arrondi, ombres dures
sans flou, aplats de couleur, une grotesque et Space Mono. La couleur ne dit que deux choses — la
discipline et la zone d'intensité.

Aucune police ne vient d'un tiers : Space Mono est servie depuis `public/fonts` (SIL OFL 1.1, texte
dans `licenses/`), et le rôle « display » — General Sans sur le canevas — s'appuie sur la grotesque
du système, la licence de General Sans n'autorisant pas clairement la redistribution de ses
fichiers. Le code est sous licence MIT (`LICENSE`).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npx vitest run     # la suite de tests
npx oxlint         # le lint
```

## Trois règles qui gouvernent tout le produit

1. **Un vide se nomme.** Jamais de blanc muet : toute case, colonne ou liste vide porte un cadre
   pointillé et une phrase. Le composant `EmptyState` rend la règle impossible à contourner — sa
   phrase est un paramètre obligatoire.
2. **Rien dans le dos de l'utilisateur.** Toute action qui modifie le plan montre d'abord son effet
   (`ConfirmSheet`, dont l'effet est obligatoire), puis un bandeau d'annulation de 6 s. Toute
   suppression est confirmée. L'« après » que montre l'écran de comparaison **est** le plan qui sera
   écrit, produit par le même moteur — pas une simulation.
3. **Le desktop n'est pas un mobile étiré.** La largeur sert à comparer — la semaine en sept
   colonnes, la séance à côté de son contexte — pas à allonger les lignes.

Et une quatrième, qui les tient toutes : **on n'invente rien**. Un chiffre affiché trace sa source
ou n'est pas affiché ; une valeur absente se rend « — » avec sa légende, jamais estimée en douce ;
une commande que les données ne permettent pas encore reste inerte avec son motif, jamais désactivée
sans explication.

## Organisation

```
src/domain/        le calcul — plan, séances, courses, 12 calculateurs, exports. Testé, sans UI.
src/storage/       IndexedDB, import/export JSON en tout-ou-rien.
src/components/ui/ les treize composants du système, et eux seuls peignent.
src/pages/         les écrans, qui composent avec les treize et ne repeignent rien.
src/styles/        les jetons. Aucune valeur en dur ailleurs.
```

## Reprise du design

L'interface est reprise artboard par artboard depuis un canevas de référence, et **vérifiée à la
mesure, jamais à l'œil** : le canevas est en `content-box`, l'application en `border-box`, et deux
pixels répétés sur douze blocs font un écran qui ne ressemble plus à la maquette.

- `thoughts/shared/METHODE-REPRISE-ECRAN.md` — la méthode : ce qui fait autorité, les interdits,
  les pièges, le déroulé.
- `tools/recette/` — les deux scripts qui comparent l'application au canevas, bloc à bloc.
- `thoughts/ledgers/` — le journal de reprise, écran par écran, avec les décisions et leurs motifs.

## Ateliers d'aperçu

Plusieurs écrans ont des états qui dépendent entièrement des données (jour de repos, journée finie,
semaine en pause, croisement de filtres vide). Les atteindre à la main demanderait de générer un
plan puis d'attendre le bon jour — et le produit ne montre jamais de faux plan.

Des ateliers d'aperçu, **montés en développement uniquement** et absents du build, rendent chaque
état inspectable :

```
/apercu/aujourdhui/:state   /apercu/semaine/:state    /apercu/macro/:state
/apercu/plans/:state        /apercu/seance/:state     /apercu/seances/:state
/apercu/courses/:state      /apercu/outils/:state     /apercu/systeme/:state
/apercu/generateur/:state   /apercu/reglages/:state   /apercu/exports/:state
```
