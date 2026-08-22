import type { ReactNode } from 'react'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { StepDots } from '../../components/navigation/StepDots/StepDots'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { GENERATOR_STEP_COUNT } from '../../domain/planGenerator/form'
import styles from './GeneratorStepFrame.module.css'

/**
 * Échelle des titres d'affiche du parcours. Le canevas ne les écrit PAS tous à la même taille : il
 * réduit la chasse quand la ligne s'allonge, pour que le titre tienne dans la même silhouette.
 *
 * | Artboard | Titre | Taille |
 * |---|---|---|
 * | G1 | Quel / format ? | 40 px |
 * | G2 | Quelle / date ? | 40 px |
 * | G3 | Combien / de temps ? | 38 px |
 * | G4 | Ce que tu as / sous la main | 36 px |
 * | G5 | Tes allures / de référence | 36 px |
 * | G6 | Récapi- / tulatif | 40 px |
 */
export type GeneratorTitleScale = 'lg' | 'md' | 'sm'

const TITLE_SCALE_CLASS: Record<GeneratorTitleScale, string> = {
  lg: styles.titleLg,
  md: styles.titleMd,
  sm: styles.titleSm,
}

export interface GeneratorStepFrameProps {
  /** Numéro d'étape 1-indexé (G1 → 1). */
  stepIndex: number
  /**
   * Titre d'affiche, **une entrée par ligne du canevas**. Jamais un `<br/>` : il ne porte aucune
   * espace et le titre se lirait « Quelformat ? » pour une technologie d'assistance (méthode §5 bis).
   */
  titleLines: string[]
  /** Chasse du titre — cf. `GeneratorTitleScale`. 40 px par défaut. */
  titleScale?: GeneratorTitleScale
  /** Chapeau optionnel sous le titre (G1 et G5 en ont un). */
  intro?: ReactNode
  /** Ligne mono sous le titre, dans le même bloc (G6 : « chaque ligne renvoie à son étape »). */
  headNote?: ReactNode
  onBack: () => void
  ctaLabel: string
  onContinue: () => void
  ctaDisabled?: boolean
  /** Ligne mono au-dessus du bouton (« Aucune donnée envoyée : tout reste sur l'appareil. »). */
  footerNote?: ReactNode
  children: ReactNode
}

/**
 * Coque commune aux 6 étapes du générateur (canevas G1→G6) : bandeau unique de 46 px portant le
 * fil d'Ariane « Plan / Générer » et le compteur « 01 / 06 », barre à 6 segments, titre d'affiche,
 * contenu propre à l'étape, puis pied collé (`margin-top:auto`) portant la note et l'action.
 *
 * Comme le canevas, chaque bloc porte sa propre gouttière (`0 20px`) et il n'y a **aucune colonne
 * enveloppante** en mobile : c'est ce qui permet au pied de coller au bas de l'écran et à chaque
 * bloc de se mesurer un à un contre l'artboard. Le desktop, lui, borne la mesure.
 *
 * Les 6 écrans partagent strictement cette structure dans le canevas : elle est donc écrite une
 * fois ici, et chaque étape ne fournit que son titre, son contenu et le libellé de son bouton.
 */
export function GeneratorStepFrame({
  stepIndex,
  titleLines,
  titleScale = 'lg',
  intro,
  headNote,
  onBack,
  ctaLabel,
  onContinue,
  ctaDisabled = false,
  footerNote,
  children,
}: GeneratorStepFrameProps) {
  const counter = `${String(stepIndex).padStart(2, '0')} / ${String(GENERATOR_STEP_COUNT).padStart(2, '0')}`

  return (
    <div className={styles.screen}>
      {/* Canevas G1 l. 688-693 : bandeau unique de 46 px — carré de retour, « Plan / Générer »,
          compteur d'étape, burger. La coquille n'en ajoute aucun au-dessus. */}
      <AppHeader
        variant="detail"
        trail={['Plan', 'Générer']}
        onBack={onBack}
        backLabel="Étape précédente"
        counter={counter}
        desktopTitle="Plan · générer"
      />

      <div className={styles.column}>
        {/* Canevas : `padding:14px 20px 0`, six segments de 6 px espacés de 4 px. */}
        <div className={styles.steps}>
          <StepDots
            total={GENERATOR_STEP_COUNT}
            current={stepIndex}
            label={`Étape ${stepIndex} sur ${GENERATOR_STEP_COUNT}`}
          />
        </div>

        <div className={styles.head}>
          <StackedTitle className={`${styles.title} ${TITLE_SCALE_CLASS[titleScale]}`} lines={titleLines} />
          {intro && <p className={styles.intro}>{intro}</p>}
          {headNote && <p className={styles.headNote}>{headNote}</p>}
        </div>

        <div className={styles.content}>{children}</div>

        <div className={styles.footer}>
          {footerNote && <p className={styles.footerNote}>{footerNote}</p>}
          {/* Canevas : encre pleine, texte lime, ombre orange de 6 px, flèche poussée à droite.
              Ni contour ni aplat lime — le parcours n'a pas d'action lime. */}
          <PrimaryAction tone="ink-shadow" trailing="→" onClick={onContinue} disabled={ctaDisabled}>
            {ctaLabel}
          </PrimaryAction>
        </div>
      </div>
    </div>
  )
}

/**
 * Écart au-dessus d'une section, tel que le canevas l'écrit d'un artboard à l'autre : 16 px (G5,
 * G6), 18 px (G1, G3, G4, G5) ou 20 px (G2, G3). Ce n'est pas un choix libre, c'est une mesure.
 */
export type GeneratorSectionGap = 'sm' | 'md' | 'lg'

const SECTION_GAP_CLASS: Record<GeneratorSectionGap, string> = {
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
}

/** Section d'étape : filet supérieur, intitulé mono en capitales, contenu. Motif répété dans G1→G6. */
export interface GeneratorSectionProps {
  label?: ReactNode
  /**
   * Élément poussé à droite de l'intitulé, sur sa ligne (G5 : la qualification de preuve à droite
   * de « Pourquoi pas d'estimation »).
   */
  labelAside?: ReactNode
  /** Retire le filet supérieur (G6 : le récapitulatif est un cadre de 2 px, pas un filet). */
  noRule?: boolean
  gap?: GeneratorSectionGap
  children: ReactNode
}

/**
 * Le canevas ne laisse de respiration sous le filet que **quand la section porte un intitulé**
 * (`padding-top:14px`). Les sections qui ouvrent directement sur une liste — les formats de G1,
 * les bascules de G4, les références de G5 — collent leur première ligne au filet.
 */
export function GeneratorSection({
  label,
  labelAside,
  noRule = false,
  gap = 'md',
  children,
}: GeneratorSectionProps) {
  const classes = [
    styles.section,
    SECTION_GAP_CLASS[gap],
    noRule ? styles.sectionFlush : '',
    label ? styles.sectionLabelled : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes}>
      {label && (
        <div className={styles.sectionLabel}>
          <span>{label}</span>
          {labelAside}
        </div>
      )}
      {children}
    </section>
  )
}
