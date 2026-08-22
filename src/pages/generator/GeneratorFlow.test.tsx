import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import { getAllPlans, putPlan } from '../../storage/repository'
import { demoPlan } from '../../domain/demoData'
import { GeneratePlanScreen } from './GeneratePlanScreen'

beforeEach(async () => {
  await deleteDatabase()
  window.sessionStorage.clear()
})

afterEach(async () => {
  await deleteDatabase()
  window.sessionStorage.clear()
})

/** Publie l'adresse courante : c'est ce qui prouve que l'étape vit bien dans l'URL. */
function LocationProbe() {
  const location = useLocation()
  return <span data-testid="url">{`${location.pathname}${location.search}`}</span>
}

function renderGenerator(entry = '/generate-plan') {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/generate-plan" element={<GeneratePlanScreen />} />
          <Route path="/plan" element={<p>Aujourd’hui</p>} />
          <Route path="/" element={<p>Ouverture</p>} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  )
}

async function advance(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let step = 0; step < times; step += 1) {
    await user.click(await screen.findByRole('button', { name: /Continuer/i }))
  }
}

/**
 * L'étape était un `useState` : le bouton « retour » du navigateur sortait du parcours d'un coup
 * depuis n'importe quelle étape, et un rechargement le ramenait à l'étape 1 — réponses perdues.
 */
describe('Générateur · l’étape vit dans l’adresse', () => {
  it('écrit l’étape dans l’URL à chaque avancée', async () => {
    const user = userEvent.setup()
    renderGenerator()

    await screen.findByRole('button', { name: /Continuer/i })
    expect(screen.getByTestId('url')).toHaveTextContent('/generate-plan')

    await advance(user, 2)
    expect(screen.getByTestId('url')).toHaveTextContent('etape=availability')
  })

  it('ouvre directement l’étape que l’adresse nomme', async () => {
    renderGenerator('/generate-plan?etape=references')
    expect(await screen.findByRole('heading', { name: /Tes allures\s+de référence/ })).toBeInTheDocument()
  })

  it('ignore une étape inconnue plutôt que de rendre un écran vide', async () => {
    renderGenerator('/generate-plan?etape=nimportequoi')
    expect(await screen.findByRole('heading', { name: /Quel\s+format \?/ })).toBeInTheDocument()
  })
})

/**
 * Le seul endroit du produit où l'utilisateur saisit quelque chose de long était le seul sans
 * filet : cinq réponses vivaient dans un état React, qu'un rechargement effaçait.
 */
describe('Générateur · le brouillon survit à un rechargement', () => {
  it('retrouve les réponses ET l’étape après un remontage complet', async () => {
    const user = userEvent.setup()
    const first = renderGenerator()

    await user.type(await screen.findByRole('textbox', { name: /course/i }), '70.3 Vichy')
    await advance(user, 3)
    first.unmount()

    // Remontage sur l'adresse nue : c'est ce que fait un rechargement de page.
    renderGenerator()
    expect(await screen.findByRole('heading', { name: /Ce que tu as\s+sous la main/ })).toBeInTheDocument()

    // La réponse de l'étape 1 est toujours là : on y revient pour le vérifier.
    await user.click(screen.getByRole('button', { name: /Étape précédente/ }))
    await user.click(screen.getByRole('button', { name: /Étape précédente/ }))
    await user.click(screen.getByRole('button', { name: /Étape précédente/ }))
    expect(screen.getByRole('textbox', { name: /course/i })).toHaveValue('70.3 Vichy')
  })
})

/** La barre à segments montrait le chemin parcouru sans permettre d'y retourner. */
describe('Générateur · la barre à segments ramène en arrière', () => {
  it('rend cliquables les étapes franchies, et elles seules', async () => {
    const user = userEvent.setup()
    renderGenerator()

    await advance(user, 3)
    const bar = screen.getByRole('progressbar')
    const reachable = within(bar).getAllByRole('button')
    // Étape 4 en cours : les trois premières sont des destinations, pas la quatrième ni les suivantes.
    expect(reachable).toHaveLength(3)

    await user.click(within(bar).getByRole('button', { name: /Revenir à l’étape 02/ }))
    expect(await screen.findByRole('heading', { name: /Quelle\s+date \?/ })).toBeInTheDocument()
  })
})

/**
 * « Générer le plan » écrivait le plan, ses séances datées et une fiche de course, et archivait le
 * plan en cours — quatre écritures pour un clic, sans un mot (règle nº 2).
 */
describe('Générateur · rien ne s’écrit sans être annoncé', () => {
  it('montre ce qu’il pose sur l’appareil avant d’écrire, et n’écrit rien si on renonce', async () => {
    const user = userEvent.setup()
    renderGenerator()

    await user.type(await screen.findByRole('textbox', { name: /course/i }), '70.3 Vichy')
    await advance(user, 5)
    await user.click(screen.getByRole('button', { name: /Générer le plan/i }))

    const sheet = await screen.findByRole('alertdialog')
    expect(within(sheet).getByText(/semaines de plan/)).toBeInTheDocument()
    expect(within(sheet).getByText(/séances datées sur cet appareil/)).toBeInTheDocument()
    expect(within(sheet).getByText(/une fiche de course « 70.3 Vichy »/)).toBeInTheDocument()

    await user.click(within(sheet).getByRole('button', { name: /Revenir au récapitulatif/ }))
    expect(await getAllPlans()).toHaveLength(0)
  }, 30_000)

  it('annonce que le plan en cours part en archive, en nommant où il s’est arrêté', async () => {
    await putPlan(demoPlan)
    const user = userEvent.setup()
    renderGenerator()

    await advance(user, 5)
    await user.click(await screen.findByRole('button', { name: /Générer le plan/i }))

    const sheet = await screen.findByRole('alertdialog')
    expect(within(sheet).getByText(/Remplacer ton plan en cours \?/)).toBeInTheDocument()
    expect(within(sheet).getByText(/passe en archive/)).toBeInTheDocument()
    expect(within(sheet).getByText(/« Mes plans » le rouvre/)).toBeInTheDocument()
  }, 30_000)
})
