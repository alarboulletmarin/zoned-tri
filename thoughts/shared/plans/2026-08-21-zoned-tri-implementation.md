# Plan d'implémentation — Zoned TRI Brut

Sources : `thoughts/shared/research/2026-08-21-design-spec.md` (51 écrans, tokens, navigation) et `2026-08-21-calculators-spec.md` (12 calculateurs sourcés). Décisions produit déjà validées avec l'utilisateur : proposition de calculateurs acceptée, Brick = étiquette transverse (pas une 5e discipline), stack Vite + React + TypeScript + PWA (vite-plugin-pwa) + recharts, responsive comme le mockup S4, 100% local/offline, pas de compte/backend.

## Décisions d'architecture (à ma charge, cohérentes avec les contraintes déjà fixées)

- **Routing** : `react-router-dom` v7, une route par écran du catalogue, id d'écran conservé en commentaire pour traçabilité (ex. `/plan/aujourdhui` ↔ écran 02).
- **State & persistance** : IndexedDB via `idb` (wrapper léger) comme source de vérité — pas `localStorage` seul (volume de données : 312 séances + plans + journal, exemple mockup de sauvegarde à 1,4 Mo). React Context + hooks par domaine (profil, plan, bibliothèque, courses, journal), chargés au boot depuis IndexedDB. Pas de Redux/Zustand (YAGNI — la surface de state ne le justifie pas).
- **Style** : CSS Modules + variables CSS pour les tokens (couleurs, typo, espacement) du fichier `2026-08-21-design-spec.md` §7. Pas de framework utilitaire (Tailwind) — le système de tokens est fermé et précis (2px encre, jamais de radius/ombre floutée/dégradé), des classes utilitaires génériques n'apportent rien ici.
- **Graphiques** : `recharts` pour tout graphique interactif en écran (déroulé de séance, volume hebdo/18 semaines, %FTP). Les gabarits imprimables A4 et la carte PNG sont dessinés séparément (voir Export ci-dessous), pas via recharts.
- **Tests** : `vitest` + `@testing-library/react`. TDD obligatoire sur toute la logique de calcul (12 calculateurs, moteur de génération de plan, dérivation de zones) — tests écrits avant l'implémentation, sur la base des exemples chiffrés déjà vérifiés dans les specs.
- **Export PDF (atlas A4, plan A4)** : mise en page via feuille de style `@media print` ciblant le format A4 (`210mm × 297mm`), export = `window.print()` → "Enregistrer en PDF" du navigateur. Pas de lib PDF côté client (jsPDF, etc.) : le mockup décrit des gabarits imprimables, pas un rendu pixel-perfect programmatique, et l'impression navigateur est fiable hors-ligne sans dépendance supplémentaire.
- **Export PNG (carte de séance 1080×1080)** : dessiné à la main via l'API Canvas 2D (pas de lib de capture DOM-vers-image type `html-to-image`, qui est plus fragile et plus lourde pour un layout aussi simple à reproduire directement).
- **Export .ICS** : générateur texte fait main (format `VEVENT` simple, testable ligne à ligne — voir l'exemple exact déjà donné dans le mockup).
- **Export .ZWO** : XML fait main (structure simple, format ouvert Zwift).
- **Export .FIT** : **point bloquant à traiter séparément** — le format Garmin FIT est binaire, avec un SDK officiel non trivial à réimplémenter correctement à la main. L'implémenter de façon approximative produirait un fichier invalide, ce qui serait malhonnête (fausse promesse d'export). → reporté à une phase dédiée, avec décision explicite à prendre avec l'utilisateur (SDK officiel vs abandon du format vs alternative) plutôt que bricolé maintenant.
- **PWA** : `vite-plugin-pwa` en mode `generateSW`, cache-first pour le shell + les données statiques (312 séances, catalogue de courses), manifest avec icônes brutalistes dérivées des tokens (encre `#0B0B0A` / lime `#D6F24B`), installable (`display: standalone`).

## Phasage

Chaque phase est livrée, testée (vitest vert) et vérifiée avant la suivante. Le ledger de continuité (`thoughts/ledgers/CONTINUITY_CLAUDE-zoned-tri.md`) suit l'avancement réel.

- [x] **Phase 0 — Scaffold** : Vite+React+TS+router+recharts+pwa-plugin+vitest installés.
- [x] **Phase 1 — Fondations design system** : tokens CSS, primitives (Bouton, Badge zone/discipline, `ProofBadge`+`EvidenceNote`, ligne de liste, bottom sheet, toast annulable 6s, en-tête), coquille de navigation responsive (mobile colonne / tablette rail 86px / desktop rail 236px + panneau 320px, cf écran S4). 59/59 tests verts, build OK.
- [ ] **Phase 2 — Domaine & persistance** : types TS du modèle de données (§3 design-spec), couche IndexedDB (`idb`), import/export JSON tout-ou-rien avec validation stricte et erreurs ligne par ligne (écran 19), jeux de données de démonstration (profil + quelques séances/plan/course) pour développer sans attendre le contenu des 312 séances réelles.
- [ ] **Phase 3 — Moteur de calculateurs** : les 12 calculateurs de `2026-08-21-calculators-spec.md`, en TDD strict (tests d'abord, à partir des exemples chiffrés vérifiés), 100% fonctions pures testables hors UI.
- [ ] **Phase 4 — Bibliothèque & séances** : écrans 07 (bibliothèque), 40 (filtres), 25/26 (recherche), 05/28/29 (détail séance par discipline), 15/16 (jour à séances multiples).
- [ ] **Phase 5 — Plan & générateur** : écrans 01/02/41 (accueil), 03 (semaine), 04 (macro), G1-G6 (générateur) + 06 (simulation/repli), 31-39 (le plan qui vit : marquer fait, glisser-déposer, remplacer, ajouter/supprimer, réglages avant/après, journal). Le moteur de génération applique explicitement les règles de §4 (phases, 78/8/14% polarisé, refus ACWR/règle des 10%).
- [ ] **Phase 6 — Courses** : écrans 27 (mes courses), 08 (fiche course), 09 (pacing), 10 (nutrition), 11 (jour J), 30 (checklist parc).
- [ ] **Phase 7 — Exports** : feuille d'export (20), atlas A4 (21), plan A4 (22), carte PNG (23), .ICS (24) + import/export JSON déjà posé en Phase 2. `.FIT`/`.ZWO` traités selon la décision bloquante notée plus haut.
- [ ] **Phase 8 — États système & réglages** : hors-ligne (17), 404 (18), import refusé (19, UI), menu burger complet (S1), réglages (S2), langue (S3).
- [ ] **Phase 9 — PWA & responsive final** : manifest, icônes, service worker, installabilité testée, passage des 3 largeurs (mobile/tablette/desktop) sur tous les écrans, audit accessibilité (contraste, cible tactile 44px, focus visible — repères du fallback générique §7).
- [ ] **Phase 10 — Vérification finale** : chaque donnée affichée à l'écran retrace une source ou un `ProofBadge` (audit systématique contre §9 de la research), suite de tests complète, build de prod.

## Hors périmètre (confirmé)

- Écran « Méthodologie » (annoncé « bientôt » dans le mockup lui-même).
- Compte utilisateur, synchronisation cloud, tout backend serveur.
- `.FIT` tant que la décision du point bloquant n'est pas prise.
