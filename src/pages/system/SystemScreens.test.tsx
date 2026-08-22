import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { demoAthleteProfile, demoPlan, demoRaces, demoWorkouts } from '../../domain/demoData'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { validateBackupFile } from '../../storage/validation'
import { ImportRefusedScreen } from './ImportRefusedScreen'
import { ImportRoute } from './ImportRoute'
import { LanguageScreen } from './LanguageScreen'
import { NotFoundScreen } from './NotFoundScreen'
import { OfflineScreen } from './OfflineScreen'
import { SettingsScreen } from './SettingsScreen'

const spies = vi.hoisted(() => ({
  saveProfile: vi.fn(),
  exportBackup: vi.fn(),
}))

vi.mock('../../storage/backup', () => ({ exportBackup: spies.exportBackup }))

vi.mock('../../context/AppDataContext', async () => {
  const demo = await import('../../domain/demoData')
  return {
    useProfile: () => ({ profile: demo.demoAthleteProfile, saveProfile: spies.saveProfile, loading: false }),
    usePlans: () => ({ plans: [demo.demoPlan], savePlan: vi.fn(), deletePlan: vi.fn(), loading: false }),
    useWorkouts: () => ({ workouts: demo.demoWorkouts, saveWorkout: vi.fn(), loading: false }),
    useRaces: () => ({ races: demo.demoRaces, saveRace: vi.fn(), loading: false }),
    useJournal: () => ({ journal: [], addJournalEntry: vi.fn(), loading: false }),
  }
})

function renderScreen(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// --- S2 · Réglages ---------------------------------------------------------------------------

describe('SettingsScreen · artboard S2', () => {
  it('titre l’écran comme l’artboard, sous le fil « Menu / Réglages »', () => {
    renderScreen(<SettingsScreen />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Réglages')
    expect(screen.getByText('Menu', { exact: false })).toBeInTheDocument()
  })

  it('pose les quatre intitulés de section du canevas', () => {
    renderScreen(<SettingsScreen />)
    for (const label of ['Apparence', 'Langue', 'Données']) {
      expect(screen.getByRole('heading', { level: 2, name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('Unités')).toBeInTheDocument()
  })

  it('laisse « Sombre » et « Système » inertes, avec leur raison', () => {
    renderScreen(<SettingsScreen />)
    expect(screen.getByRole('button', { name: /^Clair/ })).toHaveAttribute('aria-pressed', 'true')
    for (const label of ['Sombre', 'Système']) {
      const option = screen.getByRole('button', { name: label })
      expect(option).toBeDisabled()
      expect(option).toHaveAttribute('title', expect.stringContaining('palette sombre'))
    }
  })

  it('mène les deux langues à l’écran S3', () => {
    renderScreen(<SettingsScreen />)
    for (const name of [/Français/, /English/]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', '/settings/langue')
    }
  })

  it('ne prétend pas que l’anglais est partiellement traduit', () => {
    renderScreen(<SettingsScreen />)
    expect(screen.getByText('EN · non traduit')).toBeInTheDocument()
    expect(screen.queryByText(/partiel/)).not.toBeInTheDocument()
  })

  it('rend le tableau des unités en lecture seule — aucun champ d’unité au modèle', () => {
    renderScreen(<SettingsScreen />)
    for (const value of ['km', '/100 m', '°C']) {
      expect(screen.getByText(value)).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /km/ })).not.toBeInTheDocument()
  })

  it('branche la sauvegarde .JSON sur storage/backup', () => {
    renderScreen(<SettingsScreen />)
    fireEvent.click(screen.getByRole('button', { name: /Sauvegarde complète/ }))
    expect(spies.exportBackup).toHaveBeenCalled()
  })

  it('montre l’effet de l’effacement AVANT de l’exécuter', () => {
    const onWipe = vi.fn().mockResolvedValue(undefined)
    renderScreen(<SettingsScreen onWipe={onWipe} />)

    fireEvent.click(screen.getByRole('button', { name: /Effacer les données locales/ }))
    const sheet = screen.getByRole('alertdialog')
    expect(within(sheet).getByText(/pas de compte, donc pas de restauration/)).toBeInTheDocument()
    expect(within(sheet).getByText(`${demoWorkouts.length} séances`)).toBeInTheDocument()
    expect(within(sheet).getByText(`${demoRaces.length} courses`)).toBeInTheDocument()
    expect(onWipe).not.toHaveBeenCalled()

    fireEvent.click(within(sheet).getByRole('button', { name: 'Effacer' }))
    expect(onWipe).toHaveBeenCalledTimes(1)
  })

  it('garde la bascule hors ligne inerte et vraie', () => {
    renderScreen(<SettingsScreen />)
    const toggle = screen.getByRole('switch', { name: /fiches course lisibles hors ligne/ })
    expect(toggle).toBeDisabled()
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(toggle).toHaveAttribute('title', expect.stringContaining('écrit sur l’appareil'))
  })

  it('ferme sur la version et l’absence de compte', () => {
    renderScreen(<SettingsScreen />)
    expect(screen.getByText(/aucun compte/)).toBeInTheDocument()
  })
})

// --- S3 · Langue -----------------------------------------------------------------------------

describe('LanguageScreen · artboard S3', () => {
  it('marque le français comme langue retenue et l’anglais comme inaccessible', () => {
    renderScreen(<LanguageScreen />)
    expect(screen.getByRole('button', { name: /Français/ })).toHaveAttribute('aria-pressed', 'true')
    const english = screen.getByRole('button', { name: /English/ })
    expect(english).toBeDisabled()
    expect(english).toHaveAttribute('title', expect.stringContaining('Aucune chaîne'))
  })

  it('donne à la couverture ses valeurs réelles — zéro partout', () => {
    renderScreen(<LanguageScreen workoutCount={312} />)
    expect(screen.getAllByText('EN 0 %')).toHaveLength(3)
    expect(screen.getByText('Séances · 312')).toBeInTheDocument()
  })

  it('explique ce qui arrive à une chaîne manquante, et nomme la trame', () => {
    renderScreen(<LanguageScreen />)
    expect(screen.getByText(/reste en français plutôt que d’afficher une traduction automatique/)).toBeInTheDocument()
    expect(screen.getByText('non traduit')).toBeInTheDocument()
  })

  it('ferme sur la promesse du canevas', () => {
    renderScreen(<LanguageScreen />)
    expect(screen.getByText(/immédiat, hors ligne, et n’efface rien/)).toBeInTheDocument()
  })
})

// --- 17 · Hors-ligne -------------------------------------------------------------------------

describe('OfflineScreen · artboard 17', () => {
  it('coiffe l’écran du bandeau de section « Plan » et de son bandeau d’encre', () => {
    renderScreen(<OfflineScreen workoutCount={312} />)
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Hors-ligne · les 312 séances et ton plan restent lisibles',
    )
  })

  it('titre « Rien ne manque ici » — et pas « Rienne manque ici »', () => {
    renderScreen(<OfflineScreen />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rien ne manque ici')
  })

  it('déclare deux fonctions prêtes et trois en attente', () => {
    renderScreen(<OfflineScreen />)
    expect(screen.getAllByText('OK')).toHaveLength(2)
    expect(screen.getAllByText('EN ATTENTE')).toHaveLength(3)
  })

  it('ne date pas un catalogue qui n’a jamais été téléchargé', () => {
    renderScreen(<OfflineScreen />)
    expect(screen.getByText('—')).toHaveAttribute(
      'title',
      expect.stringContaining('Aucun catalogue n’a encore été téléchargé'),
    )
  })

  it('ne propose aucun « réessayer », seulement la sortie du canevas', () => {
    renderScreen(<OfflineScreen />)
    expect(screen.queryByRole('button', { name: /réessayer/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuer sans réseau' })).toBeInTheDocument()
  })
})

// --- 18 · Adresse introuvable ------------------------------------------------------------------

describe('NotFoundScreen · artboard 18', () => {
  it('affiche l’erreur, le titre coupé et l’adresse morte', () => {
    renderScreen(<NotFoundScreen pathname="/seance/8f2c-pyramide-css-v2" catalogue={SEED_WORKOUTS} />)
    expect(screen.getByText('Erreur 404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cette séance n’existe plus')
    expect(screen.getByText('/seance/8f2c-pyramide-css-v2')).toBeInTheDocument()
  })

  it('propose ce que les mots de l’adresse rapprochent vraiment', () => {
    renderScreen(<NotFoundScreen pathname="/seance/8f2c-pyramide-css-v2" catalogue={SEED_WORKOUTS} />)
    expect(screen.getByRole('button', { name: /Pyramide CSS courte/ })).toBeInTheDocument()
  })

  it('nomme le vide plutôt que de proposer les deux premières venues', () => {
    renderScreen(<NotFoundScreen pathname="/workouts/8f2c" catalogue={SEED_WORKOUTS} />)
    expect(screen.getByText(/Aucun mot de cette adresse/)).toBeInTheDocument()
  })

  it('rassure sur les plans qui utilisaient la séance retirée', () => {
    renderScreen(<NotFoundScreen pathname="/workouts/inconnu" catalogue={SEED_WORKOUTS} />)
    expect(screen.getByText('Si tu es arrivé là depuis ton plan')).toBeInTheDocument()
  })

  it('offre toujours deux sorties', () => {
    renderScreen(<NotFoundScreen pathname="/workouts/inconnu" catalogue={SEED_WORKOUTS} />)
    expect(screen.getByRole('button', { name: 'Ouvrir la bibliothèque' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revenir à mon plan' })).toBeInTheDocument()
  })

  it('suit la section de l’adresse dans le fil d’Ariane', () => {
    renderScreen(<NotFoundScreen pathname="/races/inconnue" catalogue={SEED_WORKOUTS} />)
    expect(screen.getByText('Courses', { exact: false })).toBeInTheDocument()
  })
})

// --- 19 · Import refusé --------------------------------------------------------------------------

function refusal() {
  const broken = {
    schemaVersion: 1.1,
    profile: { ...demoAthleteProfile, ftp: { watts: '248 W', measuredAt: '2026-07-20' } },
    plans: [demoPlan],
    workoutsDone: [{ ...demoWorkouts[0], discipline: undefined }],
    races: demoRaces,
    journal: [],
  }
  const result = validateBackupFile(broken)
  return {
    fileName: 'zonedtri-sauvegarde-2025-11-02.json',
    fileSizeBytes: 1_468_006,
    errors: result.ok ? [] : result.errors,
  }
}

describe('ImportRefusedScreen · artboard 19', () => {
  it('annonce le refus et l’absence de modification', () => {
    renderScreen(<ImportRefusedScreen refusal={refusal()} onPickAnotherFile={vi.fn()} today="2026-06-16" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Import invalide — rien n’a été modifié')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fichier illisible')
  })

  it('nomme le fichier refusé et sa taille', () => {
    renderScreen(<ImportRefusedScreen refusal={refusal()} onPickAnotherFile={vi.fn()} today="2026-06-16" />)
    expect(screen.getByText('zonedtri-sauvegarde-2025-11-02.json · 1,4 Mo')).toBeInTheDocument()
  })

  it('rend lisibles les erreurs typées du validateur', () => {
    renderScreen(<ImportRefusedScreen refusal={refusal()} onPickAnotherFile={vi.fn()} today="2026-06-16" />)
    expect(screen.getByText(/champ « profile.ftp.watts » attendu en number \(watts\), reçu « 248 W »/)).toBeInTheDocument()
    expect(screen.getByText(/version du fichier : 1.1/)).toBeInTheDocument()
  })

  it('énumère ce que le refus a laissé intact, avec les valeurs de la base', () => {
    renderScreen(<ImportRefusedScreen refusal={refusal()} onPickAnotherFile={vi.fn()} today="2026-06-16" />)
    expect(screen.getByText('Ton plan en cours, semaine 07 sur 18')).toBeInTheDocument()
    expect(screen.getByText('Tes références : CSS 1:32, FTP 248 W, seuil 4:12')).toBeInTheDocument()
  })

  it('branche « Choisir un autre fichier » sur le sélecteur', () => {
    const onPick = vi.fn()
    renderScreen(<ImportRefusedScreen refusal={refusal()} onPickAnotherFile={onPick} today="2026-06-16" />)
    fireEvent.click(screen.getByRole('button', { name: 'Choisir un autre fichier' }))
    expect(onPick).toHaveBeenCalledTimes(1)
  })

  it('laisse deux sorties en plus de la reprise', () => {
    renderScreen(<ImportRefusedScreen refusal={refusal()} onPickAnotherFile={vi.fn()} today="2026-06-16" />)
    expect(screen.getByRole('button', { name: 'Voir le format' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abandonner' })).toBeInTheDocument()
  })

  it('nomme le vide quand la base n’avait rien à préserver', () => {
    const bare = { ...demoAthleteProfile }
    delete bare.css
    delete bare.ftp
    delete bare.runThreshold
    renderScreen(
      <ImportRefusedScreen
        refusal={refusal()}
        onPickAnotherFile={vi.fn()}
        today="2026-06-16"
        plans={[]}
        workouts={[]}
        races={[]}
        profile={bare}
      />,
    )
    expect(screen.getByText(/Rien n’est encore enregistré sur cet appareil/)).toBeInTheDocument()
  })
})

// --- La route qui porte l'état du refus -----------------------------------------------------------

describe('ImportRoute', () => {
  it('ne montre rien sans refus à montrer — le canevas ne dessine pas d’écran « choisir un fichier »', () => {
    render(
      <MemoryRouter initialEntries={['/import-export/import']}>
        <Routes>
          <Route path="/import-export/import" element={<ImportRoute />} />
          <Route path="/import-export" element={<p>Import / export</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Import / export')).toBeInTheDocument()
  })

  it('rend l’artboard 19 quand un refus l’accompagne', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/import-export/import', state: refusal() }]}>
        <Routes>
          <Route path="/import-export/import" element={<ImportRoute />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('rien n’a été modifié')
    expect(screen.getByRole('button', { name: 'Choisir un autre fichier' })).toBeInTheDocument()
  })
})
