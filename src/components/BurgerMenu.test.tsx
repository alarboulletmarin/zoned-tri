import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDataProvider } from '../context/AppDataContext'
import { deleteDatabase } from '../storage/db'
import * as repo from '../storage/repository'
import { demoPlan, demoRace, demoWorkouts } from '../domain/demoData'
import { alignWeekToWeekOf, todayIso } from '../domain/planWeek'
import { SEED_WORKOUTS } from '../domain/seedWorkouts'
import { BurgerMenu } from './BurgerMenu'

/** Les compteurs viennent de la base : chaque cas sème ce dont il a besoin. */
function renderMenu(props: { isOpen?: boolean; onClose?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <AppDataProvider>
        <BurgerMenu isOpen={props.isOpen ?? true} onClose={props.onClose ?? vi.fn()} />
      </AppDataProvider>
    </MemoryRouter>,
  )
}

async function seedActivePlan() {
  const today = todayIso()
  await repo.putRace(demoRace)
  for (const workout of demoWorkouts) await repo.putWorkout(workout)
  await repo.putPlan({ ...demoPlan, weeks: demoPlan.weeks.map((week) => alignWeekToWeekOf(week, today)) })
}

beforeEach(async () => {
  await deleteDatabase()
})

afterEach(async () => {
  await deleteDatabase()
})

describe('BurgerMenu', () => {
  it('renders nothing when closed', () => {
    renderMenu({ isOpen: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('carries the wordmark and a close cross in its header (écran S1)', async () => {
    renderMenu()
    expect(await screen.findByText('Zoned Tri')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fermer le menu' })).toBeInTheDocument()
  })

  it('sends the wordmark back to the opening screen', async () => {
    renderMenu()
    expect(await screen.findByRole('link', { name: 'Zoned Tri' })).toHaveAttribute('href', '/')
  })

  it('renders the 4 root sections in the canvas order', async () => {
    renderMenu()
    // Portée à la seule liste des sections : l'en-tête du panneau porte lui aussi un lien.
    const sections = await screen.findByRole('navigation', { name: 'Sections' })
    const links = within(sections).getAllByRole('link')
    expect(links.slice(0, 4).map((link) => link.textContent)).toEqual([
      expect.stringContaining('Plan'),
      expect.stringContaining('Séances'),
      expect.stringContaining('Courses'),
      expect.stringContaining('Outils'),
    ])
  })

  it('shows the real counters read from the device and from the catalogue', async () => {
    await seedActivePlan()
    renderMenu()
    expect(await screen.findByText('sem. 07')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Séances/ })).toHaveTextContent(String(SEED_WORKOUTS.length))
    expect(screen.getByRole('link', { name: /Courses/ })).toHaveTextContent('1')
  })

  it('announces « aucun plan » when nothing is stored', async () => {
    renderMenu()
    expect(await screen.findByText('aucun plan')).toBeInTheDocument()
  })

  it('renders the featured "Générer un plan" action and the two secondary links', async () => {
    renderMenu()
    expect(await screen.findByRole('link', { name: /Générer un plan/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Import \/ export/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Réglages/ })).toBeInTheDocument()
  })

  it('renders the "Méthodologie · bientôt" future row as disabled', async () => {
    renderMenu()
    expect(await screen.findByText("Ce qui n'existe pas encore")).toBeInTheDocument()
    const row = screen.getByText('Méthodologie').closest('[aria-disabled="true"]')
    expect(row).not.toBeNull()
    expect(row).toHaveTextContent('bientôt')
  })

  it('renders the language footer with FR active, EN disabled and the version', async () => {
    renderMenu()
    expect(await screen.findByText('Langue')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FR' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'EN' })).toBeDisabled()
    expect(screen.getByText('v 1.4 · hors ligne')).toBeInTheDocument()
  })

  it('closes when a root link is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderMenu({ onClose })
    await user.click(await screen.findByRole('link', { name: /Plan/ }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the cross is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderMenu({ onClose })
    await user.click(await screen.findByRole('button', { name: 'Fermer le menu' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderMenu({ onClose })
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('moves focus onto the first control of the panel and traps Tab inside it', async () => {
    const user = userEvent.setup()
    renderMenu()
    // Premier élément focalisable du panneau : le mot-symbole, qui ramène à l'ouverture.
    const wordmark = await screen.findByRole('link', { name: 'Zoned Tri' })
    expect(wordmark).toHaveFocus()

    const panel = screen.getByRole('dialog')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Fermer le menu' })).toHaveFocus()

    await user.tab({ shift: true })
    expect(wordmark).toHaveFocus()
    // Shift+Tab depuis le premier élément repart sur le dernier, sans quitter le panneau.
    await user.tab({ shift: true })
    expect(panel).toContainElement(document.activeElement as HTMLElement)
  })
})
