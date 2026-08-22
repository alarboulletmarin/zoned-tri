# Méthode — reprendre un écran contre le canevas

À lire **en entier** avant de toucher un fichier. Elle vaut pour tous les écrans restants.

---

## 1. Ce qui fait autorité

| Source | Rôle |
|---|---|
| `/home/andrea/Downloads/Zoned Tri(1)/design_handoff_zoned_tri/Zoned TRI Brut - App.dc.html` | **La vérité.** 63 artboards, chacun dans `[data-screen-label="XX"]` |
| `…/Zoned TRI Brut - Design System.dc.html` | Le système : palettes, zones, interdits |
| `…/README.md` | La spécification de reprise : jetons, règles de largeur, ordre |

En cas de contradiction : **le canevas rendu l'emporte sur le texte du README**, et l'écart se
signale dans le rapport. Deux contradictions déjà tranchées :
- le README §2 donne cinq zones avec Z5 = `#FF5A3C` ; le Design System en donne **six**, Z5 =
  `#E5261B`, Z6 = `#8A46E0`. On suit le Design System.
- le README dit « affiche 56 % » pour S9 ; l'artboard rend **60,7 %** parce que sa colonne est en
  `content-box`. On suit l'artboard.

Lire aussi la **ligne grise au-dessus de l'artboard** : elle donne l'intention, et l'intention prime
sur le pixel en cas de doute.

## 2. Les trois règles non négociables

1. **Un vide se nomme.** Jamais de blanc muet : cadre pointillé + une phrase. Le composant
   `EmptyState` rend la règle impossible à contourner (`sentence` est obligatoire).
2. **Rien dans le dos de l'utilisateur.** Toute modification du plan montre son effet AVANT
   (`ConfirmSheet`, dont `effect` est obligatoire), puis un bandeau d'annulation de 6 s
   (`UndoToast`). Toute suppression est confirmée.
3. **Le desktop n'est pas un mobile étiré.** La largeur sert à comparer (semaine en 7 colonnes,
   séance + contexte côte à côte), pas à allonger les lignes. Ligne max ≈ 46 caractères.

## 3. Interdits absolus

Aucun `border-radius`. Aucune ombre floutée (`5px 5px 0`, `6px 6px 0`, `8px 8px 0`, jamais de blur).
Aucun dégradé — sauf la hachure de la semaine en pause, qui est un motif, pas un dégradé. Aucun
emoji. Aucune quantité en General Sans : **tout chiffre passe en Space Mono**.

## 4. N'invente rien

C'est le défaut le plus grave de la première passe, et il a coûté cher. Ont été trouvés dans le
code des éléments qui n'existent nulle part dans le canevas : un tag `BRICK`, une 4ᵉ colonne dans
des barres qui en ont trois, un bloc « Reste cette semaine » ajouté à un artboard qui ne l'a pas, un
lien « voir la semaine → » ajouté à un autre.

Si l'artboard ne le montre pas, **ça n'existe pas**. Si une donnée manque pour le remplir, on le dit
dans le rapport — on ne comble pas avec une invention plausible.

Inversement : ce que l'artboard montre et que les données ne permettent pas encore de calculer se
rend quand même, à l'état inerte, avec un `disabled` et un `title` qui dit pourquoi. Jamais un bouton
mort sans explication.

## 5. Les treize composants du §4

Ils existent tous dans `src/components/ui/`. **On compose avec, on ne repeint pas localement.**

`AppShell` (AppFrame) · `AppHeader` (ScreenHeader) · `Badge` (`DisciplineTag` / `ZoneTag`) ·
`Card` · `EmptyState` · `NoteBox` · `PrimaryAction` · `SecondaryAction` · `ProgressBar` ·
`WeekStrip` · `UndoToast` (UndoBanner) · `ConfirmSheet`.

`Button` est **l'ancien** composant : il ne sert plus que les écrans pas encore repris. Ne pas
l'utiliser dans un écran qu'on reprend ; le remplacer par `PrimaryAction` / `SecondaryAction`.

Si un artboard demande une forme que les treize ne couvrent pas, **étendre le composant** (une
variante nommée, documentée par son artboard) plutôt que peindre dans le CSS de l'écran. Le CSS de
l'écran ne porte que le placement et ce qui lui est propre.

## 5 bis. Les titres coupés en lignes

Le canevas coupe ses titres d'affiche à la main. **N'écris jamais `Mes<br />références`** : un `<br>`
n'apporte aucune espace, et le titre se lit « Mesréférences » pour une technologie d'assistance.
C'était le cas de tous les titres du produit. Utilise `StackedTitle` :

```tsx
<StackedTitle className={styles.title} lines={['Mes', 'références']} />
<StackedTitle as="h2" className={styles.sessionTitle} lines={['Rien', 'aujourd’hui']} />
```

Il coupe par le texte (`white-space: pre-line`), pas par un élément vide : même silhouette, mot
rendu. Le même piège vaut pour les valeurs coupées dans un paragraphe.

## 6. Les jetons

Tout est dans `src/styles/tokens.css`. **Aucune valeur en dur dans un écran.** L'échelle brute
(`--space-2` … `--space-30`) existe précisément pour que la valeur de l'artboard reste lisible dans
le CSS : `padding: var(--space-13) var(--space-20)` se relit contre `padding:13px 20px`.

## 7. Les trois largeurs

| | Mobile 390 | Tablette 834 | Desktop 1280 |
|---|---|---|---|
| Navigation | en-tête 46 px : logo + recherche + burger | 46 px, idem | **rail gauche 240 px**, pas de burger |
| Contenu | une colonne | `1fr / 292px` | `1.3fr / 400px` |
| Semaine | liste verticale | liste + colonne latérale | **7 colonnes** |
| Action principale | ancrée en bas de l'écran | en bas de la **colonne** | en bas de la colonne gauche |

L'artboard `S4` est **paramétré** : son script (fin du fichier `.dc.html`, chercher
`renderVals()`) donne les valeurs exactes des trois appareils — `gridCols`, `mainPad`, `sidePad`,
`h1Size`, `dateSize`, `profileH`, `showRail`, `showSets`, `showWeekBars`. C'est la source la plus
précise qui existe pour le responsive : s'en servir plutôt que deviner.

Écarts assumés déjà décidés :
- la loupe reste dans l'en-tête tablette (le README ne garde que logo + burger, mais la recherche
  n'aurait alors plus aucun accès entre 768 et 1023 px) ;
- le rail desktop garde son carré de retour sur les écrans non racines : le canevas ne leur donne
  pas d'artboard desktop, et le retirer priverait le générateur de son retour d'étape.

## 8. Le déroulé, écran par écran

1. **Lire l'artboard** dans le `.dc.html` (`grep -n 'data-screen-label="XX"'` puis `sed -n`), **et**
   la ligne grise au-dessus.
2. **Lire le code existant** de l'écran. Beaucoup est déjà juste : on corrige, on ne réécrit pas
   pour le plaisir.
3. **Écrire**, en composant avec les treize.
4. **Mesurer** — `tools/recette/README.md`. C'est l'étape qu'on ne saute pas.
5. **Vérifier** : `npx tsc -b` · `npx vitest run` · `npx oxlint`.
6. **Rapporter** : ce qui colle au pixel, ce qui s'écarte et pourquoi, ce qui manque faute de
   données, les décisions prises.

## 9. Données de démonstration

Le produit ne montre jamais de faux plan : sans plan actif, `/plan` renvoie à l'ouverture, comme le
veut l'artboard 01b. Pour rendre les états inspectables sans générer un plan, il existe un **atelier
d'aperçu monté uniquement en développement** (`import.meta.env.DEV`) :

```
/apercu/aujourdhui/:state     →  02 · 02a · 02b · 02c · 15
```

Modèle : `src/pages/plan/TodayPreview.tsx`. Un écran qui a plusieurs états en fait autant, sur le
même patron. L'aperçu n'apparaît dans aucune navigation et ne survit pas au build.

Les fixtures vivent dans `src/domain/demoData.ts` et reprennent les valeurs des artboards. Les
compléter est permis ; les rendre incohérentes avec les artboards ne l'est pas.

## 10. Zone interdite

`src/pages/workouts/detail/` est susceptible d'être édité par une autre session. Ne pas y toucher
sans vérifier d'abord (`ls -la --time-style=+%H:%M`).
