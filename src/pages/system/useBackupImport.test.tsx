import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CURRENT_SCHEMA_VERSION } from '../../domain/types'
import { demoAthleteProfile, demoPlan, demoRace } from '../../domain/demoData'
import { useBackupImport } from './useBackupImport'

const importBackup = vi.fn(async (_file: unknown) => ({ ok: true as const }))
const exportBackup = vi.fn(async () => ({ schemaVersion: CURRENT_SCHEMA_VERSION }))
const downloadText = vi.fn()

vi.mock('../../storage/backup', () => ({
  importBackup: (file: unknown) => importBackup(file),
  exportBackup: () => exportBackup(),
}))
vi.mock('../exports/download', () => ({ downloadText: (...args: unknown[]) => downloadText(...args) }))
vi.mock('../../context/AppDataContext', () => ({
  usePlans: () => ({ plans: [demoPlan], loading: false }),
  useWorkouts: () => ({ workouts: [], loading: false }),
  useRaces: () => ({ races: [demoRace], loading: false }),
  useJournal: () => ({ journal: [], loading: false }),
}))

const SAUVEGARDE = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  profile: demoAthleteProfile,
  plans: [],
  workoutsDone: [],
  races: [],
  journal: [],
}

function Ecran({ onImported }: { onImported: () => void }) {
  const { input, sheet, open } = useBackupImport({ onImported })
  return (
    <>
      {input}
      <button type="button" onClick={open}>
        Choisir un fichier .JSON
      </button>
      {sheet}
    </>
  )
}

function Refus() {
  const { state } = useLocation()
  return <span data-testid="refus">{JSON.stringify(state)}</span>
}

function renderEcran() {
  const onImported = vi.fn()
  render(
    <MemoryRouter initialEntries={['/import-export']}>
      <Routes>
        <Route path="/import-export" element={<Ecran onImported={onImported} />} />
        <Route path="/import-export/import" element={<Refus />} />
      </Routes>
    </MemoryRouter>,
  )
  return { onImported }
}

/**
 * Le `<input type="file">` du sélecteur est caché et porte `pointer-events: none` — c'est voulu :
 * le canevas ne le dessine nulle part, c'est la commande visible qui l'ouvre. On lui pose donc le
 * fichier par un événement, comme le navigateur le fait après le choix de l'utilisateur.
 */
async function deposer(contenu: string, nom = 'sauvegarde.json') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([contenu], nom, { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: async () => contenu })
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  importBackup.mockClear()
  exportBackup.mockClear()
  downloadText.mockClear()
})

describe('useBackupImport', () => {
  /**
   * Le cœur du lot : `importBackup` validait et écrivait d'un seul geste, ce qui ne laissait aucun
   * moment pour montrer ce que l'appareil allait perdre. Un import remplace la base entière.
   */
  it('montre l’avant et l’après AVANT d’écrire quoi que ce soit', async () => {
    renderEcran()

    await deposer(JSON.stringify(SAUVEGARDE))

    expect(await screen.findByText('Remplacer les données de cet appareil ?')).toBeInTheDocument()
    expect(screen.getByText(/Plans : 1 plan → 0 plan/)).toBeInTheDocument()
    expect(screen.getByText(/Courses : 1 → 0/)).toBeInTheDocument()
    expect(importBackup).not.toHaveBeenCalled()
  })

  it('n’écrit qu’une fois « Remplacer » confirmé', async () => {
    const user = userEvent.setup()
    const { onImported } = renderEcran()

    await deposer(JSON.stringify(SAUVEGARDE))
    await user.click(await screen.findByRole('button', { name: 'Remplacer' }))

    expect(importBackup).toHaveBeenCalledOnce()
    expect(onImported).toHaveBeenCalledOnce()
  })

  it('« Garder mes données » referme sans rien écrire', async () => {
    const user = userEvent.setup()
    renderEcran()

    await deposer(JSON.stringify(SAUVEGARDE))
    await user.click(await screen.findByRole('button', { name: 'Garder mes données' }))

    expect(screen.queryByText('Remplacer les données de cet appareil ?')).not.toBeInTheDocument()
    expect(importBackup).not.toHaveBeenCalled()
  })

  /**
   * Il n'y a pas d'annulation possible après l'écriture : la base d'avant n'existe plus. « Exporter
   * d'abord » est la seule contrepartie honnête, et elle ne referme pas la feuille.
   */
  it('« Exporter d’abord » écrit la sauvegarde sans fermer la feuille', async () => {
    const user = userEvent.setup()
    renderEcran()

    await deposer(JSON.stringify(SAUVEGARDE))
    await user.click(await screen.findByRole('button', { name: 'Exporter d’abord' }))

    expect(exportBackup).toHaveBeenCalledOnce()
    expect(downloadText).toHaveBeenCalledOnce()
    expect(screen.getByText('Remplacer les données de cet appareil ?')).toBeInTheDocument()
    expect(importBackup).not.toHaveBeenCalled()
  })

  it('un fichier illisible ne montre aucune feuille et part sur l’écran de refus', async () => {
    renderEcran()

    await deposer('ceci n’est pas du JSON', 'casse.json')

    const refus = await screen.findByTestId('refus')
    expect(refus.textContent).toContain('casse.json')
    expect(screen.queryByText('Remplacer les données de cet appareil ?')).not.toBeInTheDocument()
    expect(importBackup).not.toHaveBeenCalled()
  })

  it('un fichier valide en JSON mais pas en sauvegarde part aussi sur le refus', async () => {
    renderEcran()

    await deposer(JSON.stringify({ schemaVersion: 1 }), 'incomplet.json')

    const refus = await screen.findByTestId('refus')
    expect(refus.textContent).toContain('incomplet.json')
    expect(importBackup).not.toHaveBeenCalled()
  })
})
