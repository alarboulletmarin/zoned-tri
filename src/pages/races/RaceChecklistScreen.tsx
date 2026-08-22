import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { useRaces } from '../../context/AppDataContext'
import type { ChecklistItem, Race } from '../../domain/types'
import { checklistGroups, checklistProgress } from '../../domain/raceView'
import { racePath } from './routes'
import s from './RaceScreens.module.css'
import own from './RaceChecklistScreen.module.css'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'

export interface RaceChecklistScreenProps {
  race: Race
  /** Bascule d'une case. Par défaut l'enregistrement en base ; l'aperçu passe la sienne. */
  onToggle?: (item: ChecklistItem) => void
}

/**
 * Artboard 30 · Courses · checklist du parc à vélo — trois emplacements, des cases qui restent
 * cochées hors ligne, aucun rappel. Cocher est réversible d'un second appui : la règle « rien dans
 * le dos de l'utilisateur » n'exige ni confirmation ni bandeau d'annulation pour un geste qui
 * s'annule lui-même, et le canevas n'en montre aucun.
 *
 * LIMITATIONS assumées : les exports `.PDF` et `.PNG` sont rendus inertes ; la remise à zéro
 * automatique après la course annoncée par le pied d'écran n'est pas implémentée.
 */
export function RaceChecklistScreen({ race, onToggle }: RaceChecklistScreenProps) {
  const navigate = useNavigate()
  const { saveRace } = useRaces()
  const items = race.transitionChecklist ?? []
  const groups = checklistGroups(items)
  const progress = checklistProgress(items)

  function toggle(item: ChecklistItem) {
    if (onToggle) {
      onToggle(item)
      return
    }
    void saveRace({
      ...race,
      transitionChecklist: items.map((entry) =>
        entry.id === item.id ? { ...entry, done: !entry.done } : entry,
      ),
    })
  }

  return (
    <div className={s.screen}>
      <AppHeader
        variant="detail"
        trail={['Courses', race.name, 'Checklist']}
        desktopTitle={`${race.name} · checklist`}
        onBack={() => navigate(racePath(race.id))}
      />

      <div className={s.column}>
        <div className={`${s.hero} ${s.heroDense}`}>
          <StackedTitle className={s.title34} lines={['Parc à', 'vélo']} />
          <span className={`${s.countdown} ${s.countdownSm}`}>{progress.label}</span>
        </div>

        <ProgressBar
          className={s.strip}
          percent={progress.percent}
          height={14}
          framed
          label="Avancement de la checklist"
        />

        {groups.length === 0 ? (
          <div className={s.emptyBlock}>
            <EmptyState
              headline="Rien à cocher"
              sentence="Aucune checklist n’est enregistrée pour cette course : la liste du parc se remplit avec ton propre matériel, elle ne s’invente pas."
            />
          </div>
        ) : (
          groups.map((group, index) => (
            <section key={group.section} className={`${s.block} ${index > 0 ? s.blockTight : ''}`}>
              <div className={s.sectionLabel}>{group.label}</div>
              <div className={s.listTop}>
                {group.items.map((item) => (
                  <label key={item.id} className={own.itemRow}>
                    <input
                      type="checkbox"
                      className={own.checkbox}
                      checked={item.done}
                      onChange={() => toggle(item)}
                    />
                    <span className={item.done ? own.labelDone : own.label}>{item.label}</span>
                  </label>
                ))}
              </div>
            </section>
          ))
        )}

        <div className={`${s.footer} ${own.footer}`}>
          <div className={`${s.footerNote} ${s.footerNoteTight}`}>
            Les cases restent cochées hors ligne et se remettent à zéro après la course. Aucun rappel.
          </div>
          <div className={s.exportRow}>
            <span className={s.exportLabel}>Imprimer ou exporter</span>
            {/* `SecondaryAction shape="chip"` garde la taille du canevas (6 × 8 px, mono 10) et
                porte sa cible de 44 px par un pseudo-élément : les deux règles sont tenues. */}
            <SecondaryAction className={own.exportChip} disabled title="Bientôt disponible">
              .PDF
            </SecondaryAction>
            <SecondaryAction className={own.exportChip} disabled title="Bientôt disponible">
              .PNG
            </SecondaryAction>
          </div>
        </div>
      </div>
    </div>
  )
}
