import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deleteDatabase } from '../storage/db'
import { AppDataProvider, useProfile } from './AppDataContext'
import type { AthleteProfile } from '../domain/types'

const demoProfile: AthleteProfile = {
  id: 'singleton',
  weightKg: 72.5,
  sweatRateLPerH: 1.1,
  maxHeartRateBpm: 186,
  language: 'fr',
  theme: 'light',
}

function ProfileProbe() {
  const { profile, saveProfile, loading } = useProfile()
  if (loading) return <p>Chargement…</p>
  return (
    <div>
      <p data-testid="weight">{profile ? `${profile.weightKg}kg` : 'aucun profil'}</p>
      <button type="button" onClick={() => void saveProfile(demoProfile)}>
        Enregistrer le profil
      </button>
    </div>
  )
}

beforeEach(async () => {
  await deleteDatabase()
})

afterEach(async () => {
  await deleteDatabase()
})

describe('AppDataProvider integration', () => {
  it('loads state from IndexedDB on mount, exposes it through useProfile, and persists writes', async () => {
    const user = userEvent.setup()

    const { unmount } = render(
      <AppDataProvider>
        <ProfileProbe />
      </AppDataProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('weight')).toHaveTextContent('aucun profil'))

    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }))

    await waitFor(() => expect(screen.getByTestId('weight')).toHaveTextContent('72.5kg'))

    // Remonte un tout nouveau Provider : la seule source possible pour retrouver
    // le profil est IndexedDB, pas un etat React residuel.
    unmount()

    render(
      <AppDataProvider>
        <ProfileProbe />
      </AppDataProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('weight')).toHaveTextContent('72.5kg'))
  })
})
