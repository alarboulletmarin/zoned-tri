import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../context/AppDataContext'
import type { AthleteProfile } from '../../domain/types'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { CalculatorCard } from './CalculatorCard'
import { CALCULATORS, CALCULATOR_COUNT } from './calculators/registry'
import { TOOLS_PATH } from './toolsRoutes'
import styles from './CalculatorsScreen.module.css'

export interface CalculatorsScreenProps {
  /** Injecté par l'atelier d'aperçu et les tests. */
  profile?: AthleteProfile
}

/**
 * Écran 13 (liste) — les douze calculateurs, avant la fiche.
 *
 * Le canevas ne donne pas d'artboard à cette liste : il ouvre directement sur la fiche 04/12, dont
 * la ligne grise dit « depuis Outils → liste des 12 calculateurs ». La liste emprunte donc son
 * en-tête à l'artboard 13 (compteur mono, titre 34 px, frise de 14 px) et sa carte à l'artboard S8,
 * sans introduire aucune forme que le canevas n'écrive déjà.
 */
export function CalculatorsScreen({ profile: profileProp }: CalculatorsScreenProps) {
  const navigate = useNavigate()
  const { profile: storedProfile } = useProfile()
  const profile = profileProp ?? storedProfile

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Outils', 'Calculateurs']}
        onBack={() => navigate(TOOLS_PATH)}
      />

      <div className={styles.column}>
        <div className={styles.head}>
          <div className={styles.counter}>{CALCULATOR_COUNT} calculateurs</div>
          <h1 className={styles.title}>Calculateurs</h1>
        </div>
        <div className={styles.frieze} aria-hidden="true" />

        <div className={styles.list}>
          {CALCULATORS.map((definition) => (
            <CalculatorCard key={definition.id} definition={definition} profile={profile} />
          ))}
        </div>
      </div>
    </div>
  )
}
