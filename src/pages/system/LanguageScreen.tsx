import { useNavigate } from 'react-router-dom'
import { useProfile, useWorkouts } from '../../context/AppDataContext'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { SETTINGS_PATH } from './systemRoutes'
import styles from './LanguageScreen.module.css'
import { InertNote } from '../../components/ui/InertNote/InertNote'

/**
 * Hachure d'encre du canevas — `repeating-linear-gradient(45deg,#0B0B0A 0 1px,transparent 1px 5px)`.
 * C'est un motif, pas un dégradé : le seul que le système autorise, et la légende de l'artboard le
 * nomme elle-même « non traduit ».
 */
const HATCH = 'repeating-linear-gradient(45deg, var(--color-ink) 0 1px, transparent 1px 5px)'

/**
 * Couverture réelle de l'anglais : **zéro partout**. Aucune chaîne du produit n'est traduite —
 * il n'existe ni catalogue de traductions ni mécanisme de substitution. L'artboard affiche
 * 100 / 46 / 12 % ; ces trois nombres ne sont adossés à rien, et une jauge qui ment est pire
 * qu'une jauge à zéro. Les trois barres restent dessinées : c'est ce que l'écran a à dire.
 */
const EN_COVERAGE_PERCENT = 0

export interface LanguageScreenProps {
  /** Injecté par l'atelier d'aperçu et les tests ; par défaut le catalogue enregistré. */
  workoutCount?: number
}

/**
 * Écran S3 · Langue — « depuis Réglages → Langue · présent, pas encore complet ».
 *
 * L'écran ne propose pas un interrupteur, il montre d'abord ce que le changement coûterait : la
 * couverture de chaque famille de textes, puis ce qui arrive à une chaîne manquante. C'est la
 * règle « rien dans le dos de l'utilisateur » appliquée à la langue.
 *
 * LIMITATION assumée : l'anglais est inerte. Les trois barres de couverture valent zéro, et le
 * choix reste désactivé avec sa raison — exactement ce que fait déjà le pied du menu S1, validé.
 */
export function LanguageScreen({ workoutCount }: LanguageScreenProps) {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { workouts } = useWorkouts()

  const language = profile?.language ?? 'fr'
  const catalogueSize = workoutCount ?? workouts.length

  const coverage = [
    { key: 'interface', label: 'Interface' },
    { key: 'workouts', label: `Séances · ${catalogueSize}` },
    { key: 'notes', label: 'Notes et sources' },
  ]

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Réglages', 'Langue']}
        onBack={() => navigate(SETTINGS_PATH)}
      />

      <div className={styles.column}>
        <div className={styles.head}>
          <StackedTitle className={styles.title} lines={['Langue']} />
          <div className={styles.subtitle}>deux langues · traduction en cours</div>
        </div>
        <div className={styles.frieze} aria-hidden="true" />

        <section className={styles.languages}>
          <h2 className={styles.hiddenLabel}>Langue de l’interface</h2>
          <button
            type="button"
            className={`${styles.langRow} ${language === 'fr' ? styles.langRowActive : ''}`}
            aria-pressed={language === 'fr'}
          >
            <span className={styles.langBody}>
              <span className={styles.langName}>Français</span>
              <span className={styles.langNote}>langue de référence</span>
            </span>
            <span className={styles.langMark} aria-hidden="true">
              {language === 'fr' ? '✓' : 'FR'}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.langRow} ${language === 'en' ? styles.langRowActive : ''}`}
            aria-pressed={language === 'en'}
            disabled
            aria-describedby="inert-langue-en"
          >
            <span className={styles.langBody}>
              <span className={styles.langName}>English</span>
              {/* L'artboard écrit « interface traduite · contenu partiel ». Ce serait faux : la
                  couverture ci-dessous vaut zéro, et la ligne doit dire la même chose qu'elle. */}
              <span className={styles.langNote}>aucune chaîne traduite</span>
            </span>
            <span className={styles.langMark} aria-hidden="true">
              EN
            </span>
          </button>
          <InertNote id="inert-langue-en">
            Aucune chaîne n’est traduite : passer en anglais laisserait tout l’écran en français.
          </InertNote>
        </section>

        <section className={styles.section}>
          <h2 className={styles.label}>Couverture</h2>
          <div className={styles.coverage}>
            {coverage.map((row) => (
              <div key={row.key}>
                <div className={styles.coverageHead}>
                  <span>{row.label}</span>
                  <span>EN {EN_COVERAGE_PERCENT} %</span>
                </div>
                <ProgressBar
                  className={styles.coverageBar}
                  height={12}
                  outlined
                  segments={[
                    { key: 'traduit', percent: EN_COVERAGE_PERCENT, color: 'var(--color-ink)' },
                    { key: 'non-traduit', percent: 100 - EN_COVERAGE_PERCENT, color: HATCH },
                  ]}
                />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.label}>Ce qui se passe si une chaîne manque</h2>
          <p className={styles.prose}>
            La phrase reste en français plutôt que d’afficher une traduction automatique. Le texte non
            traduit est signalé par un fond tramé, jamais masqué.
          </p>
          <div className={styles.legend}>
            <span className={styles.legendSwatch} aria-hidden="true" />
            <span className={styles.legendLabel}>non traduit</span>
          </div>
        </section>

        <div className={styles.footer}>
          Le changement de langue est immédiat, hors ligne, et n’efface rien.
        </div>
      </div>
    </div>
  )
}
