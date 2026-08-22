import { useMemo, useRef, useState } from 'react'
import { DisciplineTag, ZoneTag, type ZoneNumber } from '../../components/ui/Badge/Badge'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { buildSessionCard, sessionCardFileName } from '../../domain/exports/sessionCard'
import { zoneToNumber } from '../../domain/workoutFormat'
import { TODAY_FRAME_COLOR_VAR } from '../../domain/workoutBlocks'
import type { Workout } from '../../domain/types'
import { downloadCanvasPng } from './download'
import { SESSION_CARD_PNG_SIZE, drawSessionCard } from './sessionCardCanvas'
import styles from './SessionCard.module.css'

export interface SessionCardScreenProps {
  workout: Workout
  /** Sans elle, la carte se rend seule ; l'aperçu de recette s'en sert pour la mesurer nue. */
  withAction?: boolean
}

/**
 * Écran 23 · Carte de séance · PNG 1080 — « carré, **aucune donnée personnelle** · affiché ici à
 * 420 px ».
 *
 * DEUX RENDUS, UNE SEULE SOURCE. Le gabarit HTML ci-dessous est ce qu'on mesure contre
 * l'artboard et ce qu'une technologie d'assistance lit ; le fichier, lui, est peint par
 * `drawSessionCard` dans un canevas 2D à 1080 × 1080. Les deux lisent le MÊME
 * `buildSessionCard` — le contenu ne peut pas diverger entre ce qu'on montre et ce qu'on écrit.
 *
 * Le choix du canevas 2D plutôt que d'une capture d'écran est argumenté dans
 * `sessionCardCanvas.ts` : une capture n'est pas un export, elle dépend de l'appareil.
 *
 * ÉCART ASSUMÉ : l'artboard coupe son titre à la main (« Pyramide / CSS »). Un titre quelconque
 * ne se coupe pas à la main — le gabarit le laisse revenir à la ligne, le canevas le découpe à
 * la largeur disponible. Aucune coupure n'est inventée.
 */
export function SessionCardScreen({ workout, withAction = true }: SessionCardScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  const card = useMemo(() => buildSessionCard(workout), [workout])

  async function savePng() {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      await drawSessionCard(canvas, { card, size: SESSION_CARD_PNG_SIZE })
      const written = await downloadCanvasPng(sessionCardFileName(workout), canvas)
      setError(written ? null : 'Ce navigateur n’a pas su encoder l’image.')
    } catch {
      setError('Ce navigateur n’a pas su encoder l’image.')
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.top}>
          <span className={styles.badges}>
            <DisciplineTag discipline={card.discipline} size="lg" />
            {card.zone && <ZoneTag zone={zoneToNumber(workout.zone!) as ZoneNumber} size="lg" />}
          </span>
          {card.contextLabel && <span className={styles.context}>{card.contextLabel}</span>}
        </div>

        <StackedTitle as="h2" className={styles.title} lines={[card.title]} />

        <div className={styles.stats}>
          {card.stats.map((stat) => (
            <div key={stat.label}>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className={styles.profile} aria-hidden="true">
          {card.bars.map((bar) => (
            <div
              key={bar.key}
              className={bar.thin ? styles.profileRest : styles.profileBar}
              style={{
                width: `${bar.widthPercent}%`,
                height: `${bar.heightPercent}%`,
                background: bar.colorVar,
              }}
            />
          ))}
        </div>

        {/* Les pastilles reprennent EXACTEMENT la couleur des barres qu'elles nomment. */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: `var(--color-discipline-${card.discipline.toLowerCase()})` }}
            />
            effort
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: TODAY_FRAME_COLOR_VAR }} />
            éch. / RAC
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendRest} />
            repos{card.restLabel && ` · ${card.restLabel} au mur`}
          </span>
        </div>

        <div className={styles.foot}>
          <span className={styles.footLeft}>{card.footerLeft}</span>
          <span className={styles.footRight}>{card.footerRight}</span>
        </div>
      </div>

      {withAction && (
        <div className={styles.actions}>
          <PrimaryAction className={styles.save} onClick={() => void savePng()}>
            Enregistrer le .PNG
          </PrimaryAction>
          <p className={styles.note}>
            1080 × 1080, écrit sur l’appareil. Ni nom, ni fréquence cardiaque, ni position, ni
            allure : la carte nomme la référence, elle ne la publie pas.
          </p>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {/* Le canevas d'écriture reste hors du flux : c'est le support du fichier, pas un dessin
          à regarder — le gabarit ci-dessus montre déjà la carte. */}
      <canvas ref={canvasRef} className={styles.canvas} width={SESSION_CARD_PNG_SIZE} height={SESSION_CARD_PNG_SIZE} />
    </div>
  )
}
