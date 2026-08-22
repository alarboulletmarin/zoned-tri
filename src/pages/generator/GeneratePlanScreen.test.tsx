import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import { getAllPlans, getAllRaces, getAllWorkouts } from '../../storage/repository'
import { GeneratePlanScreen } from './GeneratePlanScreen'

beforeEach(async () => {
  await deleteDatabase()
})

afterEach(async () => {
  await deleteDatabase()
})

function renderGenerator() {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={['/generate-plan']}>
        <Routes>
          <Route path="/generate-plan" element={<GeneratePlanScreen />} />
          <Route path="/plan" element={<p>Aujourd’hui</p>} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  )
}

/** Traverse les 6 étapes avec les valeurs par défaut, sans rien modifier. */
async function walkToSummary(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 5; step += 1) {
    await user.click(await screen.findByRole('button', { name: /Continuer/i }))
  }
}

/**
 * « Générer le plan » ne génère plus : il MONTRE ce qu'il va écrire, puis attend. Trois écritures
 * partaient jusqu'ici d'un seul clic — le plan, ses séances datées, une fiche de course — et le
 * plan en cours passait en archive sans un mot (règle nº 2).
 */
async function generateAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /Générer le plan/i }))
  await user.click(await screen.findByRole('button', { name: /^Écrire le plan$/ }))
}

describe("GeneratePlanScreen — parcours complet depuis une base vide", () => {
  it('enregistre un plan actif, ses séances et la course visée, puis renvoie sur Aujourd’hui', async () => {
    const user = userEvent.setup()
    renderGenerator()

    await user.type(await screen.findByRole('textbox', { name: /course/i }), '70.3 Vichy')
    await walkToSummary(user)
    await generateAndConfirm(user)

    // La redirection vers « Aujourd'hui » prouve que l'écriture est allée au bout.
    expect(await screen.findByText('Aujourd’hui')).toBeInTheDocument()

    const plans = await getAllPlans()
    expect(plans).toHaveLength(1)
    const [plan] = plans
    expect(plan.status).toBe('active')
    expect(plan.weeks.length).toBeGreaterThan(0)

    // Chaque identifiant du plan doit être résolu par une séance réellement enregistrée : c'est
    // ce qui permet à « Aujourd'hui » et « Semaine » de se remplir avec des données réelles.
    const workouts = await getAllWorkouts()
    const known = new Set(workouts.map((workout) => workout.id))
    const referenced = plan.weeks.flatMap((week) => week.days.flatMap((day) => day.workoutIds))
    expect(referenced.length).toBeGreaterThan(0)
    expect(referenced.filter((id) => !known.has(id))).toEqual([])

    // Le nom de course saisi librement devient une vraie fiche, sinon il disparaîtrait.
    const races = await getAllRaces()
    expect(races.map((race) => race.name)).toEqual(['70.3 Vichy'])
    expect(plan.raceId).toBe(races[0].id)
  }, 30_000)

  it("archive le plan en cours au lieu de l'écraser (règle « Générer n'écrase rien »)", async () => {
    const user = userEvent.setup()
    const first = renderGenerator()

    await walkToSummary(user)
    await generateAndConfirm(user)
    await screen.findByText('Aujourd’hui')
    const [initialPlan] = await getAllPlans()
    first.unmount()

    renderGenerator()
    await walkToSummary(user)
    await generateAndConfirm(user)
    await screen.findByText('Aujourd’hui')

    await waitFor(async () => {
      const plans = await getAllPlans()
      expect(plans).toHaveLength(2)
      expect(plans.filter((plan) => plan.status === 'active')).toHaveLength(1)
      expect(plans.find((plan) => plan.id === initialPlan.id)?.status).toBe('archived_abandoned')
    })
  }, 30_000)
})
