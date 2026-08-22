import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PLAN_MONTH_PATH } from '../../navigation'
import type { WeekNavView } from '../../domain/weekNav'
import styles from './WeekNavigator.module.css'

export interface WeekNavigatorProps {
  view: WeekNavView
  /** Ouvre une autre semaine du plan. */
  onSelect: (weekNumber: number) => void
}

/**
 * Barre de navigation entre les semaines — artboard 03 (l. 415-435).
 *
 * Trois blocs, dans l'ordre du canevas : les deux flèches encadrant le titre de la semaine, la
 * ligne d'état avec son retour à aujourd'hui, puis le rail où toutes les semaines du plan se
 * comparent. Le rail défile horizontalement et se recentre sur la semaine affichée — le canevas
 * n'en montre que sept à la fois et écrit « glisse pour parcourir les 18 semaines ».
 *
 * Rendu aux deux largeurs, et non seulement en mobile : le canevas ne donne pas d'artboard large à
 * cette barre, mais retirer sur desktop la seule façon de changer de semaine referait exactement
 * le cul-de-sac qu'elle vient d'ouvrir.
 */
export function WeekNavigator({ view, onSelect }: WeekNavigatorProps) {
  const railRef = useRef<HTMLDivElement>(null)

  // La semaine affichée doit rester visible dans le rail, même après un saut depuis le Mois.
  useEffect(() => {
    const selected = railRef.current?.querySelector<HTMLElement>(`[data-selected="true"]`)
    // `scrollIntoView` n'existe pas sous jsdom : le recentrage est un confort, jamais une
    // condition d'affichage. On le tente, on ne s'y appuie pas.
    selected?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [view.rail])

  return (
    <div className={styles.navigator}>
      <div className={styles.titleRow}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => view.previousWeek !== undefined && onSelect(view.previousWeek)}
          disabled={view.previousWeek === undefined}
          aria-label="Semaine précédente"
        >
          ←
        </button>
        <div className={styles.heading}>
          <div className={styles.range}>{view.rangeLabel}</div>
          <h1 className={styles.title}>{view.title}</h1>
          <div className={styles.planned}>{view.plannedLabel}</div>
        </div>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => view.nextWeek !== undefined && onSelect(view.nextWeek)}
          disabled={view.nextWeek === undefined}
          aria-label="Semaine suivante"
        >
          →
        </button>
      </div>

      <div className={styles.stateRow}>
        <span className={styles.state}>{view.stateLabel}</span>
        {/* Sur la semaine en cours, le bouton n'a nulle part où aller : le canevas le dessine
            quand même, éteint. Il dit où l'on est, il ne disparaît pas. */}
        <button
          type="button"
          className={styles.backToToday}
          onClick={() => view.currentWeekNumber !== undefined && onSelect(view.currentWeekNumber)}
          disabled={view.isCurrent || view.currentWeekNumber === undefined}
        >
          Revenir à aujourd’hui
        </button>
      </div>

      <div className={styles.rail} ref={railRef} role="tablist" aria-label="Semaines du plan">
        {view.rail.map((cell) => (
          <button
            key={cell.weekNumber}
            type="button"
            role="tab"
            aria-selected={cell.isSelected}
            data-selected={cell.isSelected}
            className={`${styles.railCell} ${cell.isSelected ? styles.railCellSelected : ''}`}
            onClick={() => onSelect(cell.weekNumber)}
            title={cell.isCurrent ? 'Semaine en cours' : undefined}
          >
            <span className={styles.railNumber}>{String(cell.weekNumber).padStart(2, '0')}</span>
            <span className={styles.railTrack} aria-hidden="true">
              <span className={styles.railBar} style={{ height: `${cell.percent}%` }} />
            </span>
          </button>
        ))}
      </div>

      {/* 03 l. 434 : la mention de glissement à gauche, le passage au mois à droite. Le rail
          s'arrête aux dix-huit semaines du plan ; au-delà, c'est le Mois qui prend le relais. */}
      <div className={styles.railFooter}>
        <span>{view.railHint}</span>
        <Link className={styles.monthLink} to={PLAN_MONTH_PATH}>
          Mois <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}
