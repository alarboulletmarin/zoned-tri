import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportSheet } from './ExportSheet'
import { demoBikeWorkout, demoSwimWorkout } from '../../domain/demoData'
import type { IcsDay } from '../../domain/exports/icsFile'

const DAYS: IcsDay[] = [
  { date: '2026-08-24', workouts: [demoSwimWorkout] },
  { date: '2026-08-25', workouts: [demoBikeWorkout] },
]

/** L'écriture d'un fichier passe par un `Blob` et une ancre — jsdom n'en fournit ni l'un ni l'autre. */
function stubDownloads() {
  const created: { name: string; text: string }[] = []
  const blobs: Blob[] = []
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: Blob) => {
      blobs.push(blob)
      return 'blob:stub'
    },
    revokeObjectURL: () => undefined,
  })
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      const blob = blobs.at(-1)
      created.push({ name: this.download, text: '' })
      void blob
    })
  return { created, blobs, click }
}

describe('ExportSheet · artboard 20', () => {
  let stubs: ReturnType<typeof stubDownloads>

  beforeEach(() => {
    stubs = stubDownloads()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function renderSheet(workout = demoBikeWorkout) {
    return render(
      <ExportSheet
        isOpen
        onClose={vi.fn()}
        weekNumber={7}
        days={DAYS}
        workout={workout}
        onPrint={vi.fn()}
      />,
    )
  }

  it('s’annonce comme une feuille, avec son fil d’Ariane', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Exporter' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Plan / Semaine 07 / Exporter')).toBeInTheDocument()
  })

  it('promet que le fichier reste sur l’appareil', () => {
    renderSheet()
    expect(screen.getByText(/Rien ne part sur un serveur/)).toBeInTheDocument()
  })

  it('rend les quatre formats de l’artboard', () => {
    renderSheet()
    for (const format of ['.FIT', '.ZWO', '.ICS', '.PDF']) {
      expect(screen.getByText(format)).toBeInTheDocument()
    }
  })

  /** Décision antérieure du projet : le binaire Garmin est reporté, et la puce dit pourquoi. */
  it('laisse le .FIT inerte avec son motif', () => {
    renderSheet()
    const fit = screen.getByText('.FIT').closest('button')!
    expect(fit).toBeDisabled()
    // Le motif est rendu DANS la carte : la feuille s'ouvre au doigt, un `title` n'y existe pas.
    expect(fit).not.toHaveAttribute('title')
    expect(fit).toHaveAccessibleDescription(/binaire Garmin/)
  })

  it('écrit le .ICS de la semaine', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByText('.ICS').closest('button')!)
    expect(stubs.created.at(-1)?.name).toBe('zonedtri-semaine-07.ics')
    expect(stubs.blobs.at(-1)?.type).toBe('text/calendar;charset=utf-8')
  })

  it('écrit le .ZWO d’une séance de vélo', async () => {
    const user = userEvent.setup()
    renderSheet(demoBikeWorkout)
    await user.click(screen.getByText('.ZWO').closest('button')!)
    expect(stubs.created.at(-1)?.name).toBe('zonedtri-3-12-au-seuil.zwo')
  })

  it('ferme le .ZWO sur une séance qui n’est pas du vélo, en le disant', () => {
    renderSheet(demoSwimWorkout)
    const zwo = screen.getByText('.ZWO').closest('button')!
    expect(zwo).toBeDisabled()
    expect(zwo).toHaveAccessibleDescription('Le .ZWO ne décrit qu’une séance de vélo.')
  })

  it('appelle l’impression pour le .PDF', async () => {
    const user = userEvent.setup()
    const onPrint = vi.fn()
    render(
      <ExportSheet
        isOpen
        onClose={vi.fn()}
        weekNumber={7}
        days={DAYS}
        workout={demoBikeWorkout}
        onPrint={onPrint}
      />,
    )
    await user.click(screen.getByText('.PDF').closest('button')!)
    expect(onPrint).toHaveBeenCalledOnce()
  })

  it('compte les événements de la semaine sur la carte .ICS', () => {
    renderSheet()
    const ics = screen.getByText('.ICS').closest('button')!
    expect(within(ics).getByText('semaine · 2 événements')).toBeInTheDocument()
  })

  it('rappelle en pied les deux sorties qui vivent ailleurs', () => {
    renderSheet()
    expect(screen.getByText('.PNG')).toBeInTheDocument()
    expect(screen.getByText('.JSON')).toBeInTheDocument()
    expect(screen.getByText(/sans nom, sans FC, sans position/)).toBeInTheDocument()
  })

  it('se ferme par la croix de sa barre', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ExportSheet
        isOpen
        onClose={onClose}
        weekNumber={7}
        days={DAYS}
        workout={demoBikeWorkout}
        onPrint={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Fermer la feuille d’export' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
