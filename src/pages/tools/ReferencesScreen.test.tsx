import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from '../../context/AppDataContext'
import { deleteDatabase } from '../../storage/db'
import { getProfile, putProfile } from '../../storage/repository'
import { demoAthleteProfile } from '../../domain/demoData'
import { ReferencesScreen } from './ReferencesScreen'

beforeEach(async () => {
  await deleteDatabase()
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
})

afterEach(async () => {
  await deleteDatabase()
})

function renderScreen(entry = '/tools/references') {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/tools/references" element={<ReferencesScreen />} />
          <Route path="/tools" element={<p>Mes références</p>} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  )
}

/**
 * L'écran n'existait pas : « Enregistrer une référence » était un bouton gris, et les douze
 * calculateurs trouvaient une FTP que rien ne savait retenir.
 */
describe('ReferencesScreen · écrire une référence', () => {
  it('n’a rien à enregistrer tant que rien n’a changé', async () => {
    await putProfile(demoAthleteProfile)
    renderScreen()

    expect(await screen.findByRole('button', { name: 'Rien à enregistrer' })).toBeDisabled()
  })

  it('montre l’avant / après avant d’écrire, et n’écrit rien si on annule', async () => {
    await putProfile(demoAthleteProfile)
    const user = userEvent.setup()
    renderScreen()

    const ftp = await screen.findByLabelText('FTP vélo')
    await user.clear(ftp)
    await user.type(ftp, '265')
    await user.click(screen.getByRole('button', { name: /Enregistrer 1 changement/ }))

    const sheet = await screen.findByRole('alertdialog')
    expect(within(sheet).getByText(/FTP vélo :/)).toHaveTextContent('→ 265')

    await user.click(within(sheet).getByRole('button', { name: 'Annuler' }))
    expect((await getProfile())?.ftp?.watts).toBe(demoAthleteProfile.ftp?.watts)
  })

  it('écrit après confirmation, date la mesure, et laisse de quoi se dédire', async () => {
    await putProfile(demoAthleteProfile)
    const user = userEvent.setup()
    renderScreen()

    const ftp = await screen.findByLabelText('FTP vélo')
    await user.clear(ftp)
    await user.type(ftp, '265')
    await user.click(screen.getByRole('button', { name: /Enregistrer 1 changement/ }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Enregistrer' }))

    const written = await getProfile()
    expect(written?.ftp?.watts).toBe(265)
    expect(written?.ftp?.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Règle nº 2 : l'écriture s'annonce ET se défait.
    await user.click(await screen.findByRole('button', { name: /Annuler/ }))
    expect((await getProfile())?.ftp?.watts).toBe(demoAthleteProfile.ftp?.watts)
  })

  it('refuse une allure mal écrite en nommant le champ, sans bloquer l’écran', async () => {
    await putProfile(demoAthleteProfile)
    const user = userEvent.setup()
    renderScreen()

    const css = await screen.findByLabelText('CSS natation')
    await user.clear(css)
    await user.type(css, '92 secondes')

    expect(screen.getByRole('alert')).toHaveTextContent(/m:ss aux 100 m/)
    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeDisabled()
  })

  it('efface une référence quand on vide son champ, au lieu de l’écrire à zéro', async () => {
    await putProfile(demoAthleteProfile)
    const user = userEvent.setup()
    renderScreen()

    await user.clear(await screen.findByLabelText('FTP vélo'))
    await user.click(screen.getByRole('button', { name: /Enregistrer 1 changement/ }))

    const sheet = await screen.findByRole('alertdialog')
    expect(within(sheet).getByText(/FTP vélo :/)).toHaveTextContent('→ effacée')
  })

  it('accueille un report de calculateur dans le champ qu’il vise', async () => {
    renderScreen('/tools/references?ref=ftp&valeur=248')
    expect(await screen.findByLabelText('FTP vélo')).toHaveValue('248')
  })
})
