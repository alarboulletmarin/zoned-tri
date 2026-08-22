import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AppDataProvider } from './context/AppDataContext'
import { OuvertureScreen } from './pages/ouverture/OuvertureScreen'
import { GeneratePlanScreen } from './pages/generator/GeneratePlanScreen'
import {
  PlanMacroRoute,
  PlanMonthRoute,
  PlanRoute,
  PlanWeekRoute,
  SemainePreviewRoute,
} from './pages/plan/PlanRoute'
import { PlansRoute } from './pages/plan/PlansRoute'
import { PlanMacroPreview } from './pages/plan/PlanMacroPreview'
import { PlansPreview } from './pages/plan/PlansPreview'
import { TodayPreview } from './pages/plan/TodayPreview'
import {
  RaceChecklistRoute,
  RaceDayRoute,
  RaceNutritionRoute,
  RacePacingRoute,
  RaceSheetRoute,
  RacesRoute,
} from './pages/races/RacesRoute'
import { RaceFormScreen } from './pages/races/RaceFormScreen'
import { RaceTimelineScreen } from './pages/races/RaceTimelineScreen'
import { RaceChecklistEditScreen } from './pages/races/RaceChecklistEditScreen'
import { RacesPreview } from './pages/races/RacesPreview'
import { ToolsScreen } from './pages/tools/ToolsScreen'
import { ReferencesScreen } from './pages/tools/ReferencesScreen'
import { CalculatorsScreen } from './pages/tools/CalculatorsScreen'
import { CalculatorScreen } from './pages/tools/CalculatorScreen'
import { ImportExportScreen } from './pages/tools/ImportExportScreen'
import { ToolsPreview } from './pages/tools/ToolsPreview'
import { SettingsScreen } from './pages/system/SettingsScreen'
import { LanguageScreen } from './pages/system/LanguageScreen'
import { OfflineScreen } from './pages/system/OfflineScreen'
import { NotFoundScreen } from './pages/system/NotFoundScreen'
import { ImportRoute } from './pages/system/ImportRoute'
import { SystemPreview } from './pages/system/SystemPreview'
import { WorkoutsPreview } from './pages/workouts/WorkoutsPreview'
import { WorkoutDetailPreview } from './pages/workouts/detail/WorkoutDetailPreview'
import { ExportSheetRoute, PrintDocumentRoute, SessionCardRoute } from './pages/exports/ExportsRoutes'
import { ExportsPreview, PrintDocumentPreview } from './pages/exports/ExportsPreview'
import {
  PlanSettingChangeRoute,
  PlanJournalRoute,
  PlanSettingsRoute,
} from './pages/planSettings/PlanSettingsRoutes'
import { GeneratorPreview } from './pages/generator/GeneratorPreview'
import { PlanSettingsPreview } from './pages/planSettings/PlanSettingsPreview'
import { WorkoutsScreen } from './pages/workouts/WorkoutsScreen'
import { WorkoutDetailScreen } from './pages/workouts/detail/WorkoutDetailScreen'

function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            {/* Racine = écran d'ouverture (mockups 01/S9) : l'application s'ouvre sur ce qui est
                enregistré sur l'appareil, pas sur une section. */}
            <Route index element={<OuvertureScreen />} />
            <Route path="/plan" element={<PlanRoute />} />
            <Route path="/plan/semaine" element={<PlanWeekRoute />} />
            {/* Artboard 04m · le mois, entre la semaine et la saison. */}
            <Route path="/plan/mois" element={<PlanMonthRoute />} />
            {/* Artboard 04 · vue macro, désormais le segment SAISON du plan. */}
            <Route path="/plan/macro" element={<PlanMacroRoute />} />
            {/* Artboard 41 · mes plans — l'ouverture y envoie ses archives. */}
            <Route path="/plans" element={<PlansRoute />} />
            <Route path="/workouts" element={<WorkoutsScreen />} />
            <Route path="/workouts/:id" element={<WorkoutDetailScreen />} />
            {/* Courses — artboards 08, 09, 10, 11, 27, 30 et S7. `RacesRoute` choisit la racine :
                S7 en desktop, 27 dès qu'il y a plusieurs courses, sinon la fiche 08 directement. */}
            <Route path="/races" element={<RacesRoute />} />
            {/* Créer, corriger, supprimer une course : le canevas ne dessine aucun de ces écrans,
                et sans eux une course n'entre dans l'app que par le générateur. */}
            <Route path="/races/nouvelle" element={<RaceFormScreen mode="create" />} />
            <Route path="/races/:id" element={<RaceSheetRoute />} />
            <Route path="/races/:id/modifier" element={<RaceFormScreen mode="edit" />} />
            <Route path="/races/:id/pacing" element={<RacePacingRoute />} />
            <Route path="/races/:id/nutrition" element={<RaceNutritionRoute />} />
            <Route path="/races/:id/jour-j" element={<RaceDayRoute />} />
            <Route path="/races/:id/jour-j/modifier" element={<RaceTimelineScreen />} />
            <Route path="/races/:id/checklist" element={<RaceChecklistRoute />} />
            <Route path="/races/:id/checklist/modifier" element={<RaceChecklistEditScreen />} />
            {/* Outils — artboards 12 (profil et références), 13 (les douze calculateurs) et S8. */}
            <Route path="/tools" element={<ToolsScreen />} />
            {/* L'écriture des références : le canevas dessine le bouton, pas l'écran derrière. */}
            <Route path="/tools/references" element={<ReferencesScreen />} />
            <Route path="/tools/calculateurs" element={<CalculatorsScreen />} />
            <Route path="/tools/calculateurs/:id" element={<CalculatorScreen />} />
            {/* Système — artboards S2 (réglages), S3 (langue), 17 (hors-ligne), 19 (import refusé).
                17 vit sous `/plan` parce que le canevas le coiffe du bandeau de section « PLAN ». */}
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/settings/langue" element={<LanguageScreen />} />
            <Route path="/plan/hors-ligne" element={<OfflineScreen />} />
            {/* Artboards 37, 38, 39 — les six étapes restent réouvrables après acceptation, tout
                changement passe d'abord par son avant / après, et le journal garde tout. */}
            <Route path="/plan/reglages" element={<PlanSettingsRoute />} />
            <Route path="/plan/reglages/:setting" element={<PlanSettingChangeRoute />} />
            <Route path="/plan/journal" element={<PlanJournalRoute />} />
            <Route path="/import-export/import" element={<ImportRoute />} />
            {/* Sorties fichier — artboards 20 (feuille), 21 et 22 (gabarits A4), 23 (carte PNG). */}
            <Route path="/exports" element={<ExportSheetRoute />} />
            <Route path="/exports/impression" element={<PrintDocumentRoute />} />
            <Route path="/exports/carte/:id" element={<SessionCardRoute />} />

            {/* Artboard 14 · import / export · sources. */}
            <Route path="/import-export" element={<ImportExportScreen />} />
            <Route path="/generate-plan" element={<GeneratePlanScreen />} />
            {/* Atelier de recette, développement uniquement : les cinq états d'Aujourd'hui, que
                le produit n'atteint qu'avec un vrai plan et le bon jour. Absent du build. */}
            {import.meta.env.DEV && <Route path="/apercu/aujourdhui/:state" element={<TodayPreview />} />}
            {import.meta.env.DEV && <Route path="/apercu/courses/:state" element={<RacesPreview />} />}
            {import.meta.env.DEV && <Route path="/apercu/outils/:state" element={<ToolsPreview />} />}
            {/* La Semaine passe encore par `?apercu=` sur `/plan/semaine` : cette route la rapatrie
                sur le même patron que les autres ateliers. */}
            {import.meta.env.DEV && (
              <Route path="/apercu/semaine/:state" element={<SemainePreviewRoute />} />
            )}
            {import.meta.env.DEV && <Route path="/apercu/systeme/:state" element={<SystemPreview />} />}
            {import.meta.env.DEV && <Route path="/apercu/seances/:state" element={<WorkoutsPreview />} />}
            {import.meta.env.DEV && (
              <Route path="/apercu/seance/:state" element={<WorkoutDetailPreview />} />
            )}
            {import.meta.env.DEV && (
              <Route path="/apercu/generateur/:state" element={<GeneratorPreview />} />
            )}
            {import.meta.env.DEV && (
              <Route path="/apercu/reglages/:state" element={<PlanSettingsPreview />} />
            )}
            {import.meta.env.DEV && <Route path="/apercu/exports/:state" element={<ExportsPreview />} />}
            {import.meta.env.DEV && (
              <Route path="/apercu/exports-pdf" element={<PrintDocumentPreview />} />
            )}
            {import.meta.env.DEV && <Route path="/apercu/macro/:state" element={<PlanMacroPreview />} />}
            {import.meta.env.DEV && <Route path="/apercu/plans/:state" element={<PlansPreview />} />}

            {/* Artboard 18 · adresse introuvable. En DERNIER, et dans la coquille : le canevas lui
                donne le bandeau, le fil d'Ariane et une sortie — jamais un cul-de-sac. */}
            <Route path="*" element={<NotFoundScreen />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppDataProvider>
  )
}

export default App
