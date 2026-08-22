import { useNavigate } from 'react-router-dom'
import { usePlans, useWorkouts } from '../../context/AppDataContext'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import styles from './OfflineScreen.module.css'

const PLAN_PATH = '/plan'

/**
 * Les cinq lignes du tableau « Fonction / État ». Les deux premières sont vraies aujourd'hui : tout
 * est écrit dans IndexedDB et les calculateurs sont locaux. Les trois suivantes attendent un réseau
 * que le produit n'appelle nulle part — elles restent dessinées, en attente, comme le canevas les
 * pose : c'est le sujet de l'écran.
 *
 * Écart assumé : l'artboard écrit « Catalogue des 1 240 courses ». Ce nombre n'est adossé à rien —
 * aucun catalogue distant n'existe — et une quantité inventée est précisément ce que la méthode
 * interdit. La ligne garde son intitulé, sans le compte.
 */
const FUNCTIONS: { label: string; ready: boolean }[] = [
  { label: 'Plan, séances, fiches course', ready: true },
  { label: 'Calculateurs et exports', ready: true },
  { label: 'Catalogue des courses', ready: false },
  { label: 'Météo et température de l’eau', ready: false },
  { label: 'Mise à jour de la bibliothèque', ready: false },
]

export interface OfflineScreenProps {
  /** Injecté par l'atelier d'aperçu et les tests ; par défaut le catalogue enregistré. */
  workoutCount?: number
  /** Idem : le bandeau ne mentionne « ton plan » que s'il y en a un d'actif. */
  hasActivePlan?: boolean
}

/**
 * Écran 17 · Hors-ligne — « état permanent assumé : l'app fonctionne sans réseau, le bandeau dit
 * ce qui attend ».
 *
 * L'écran n'annonce pas une panne : il fait l'inventaire de ce qui marche. D'où l'absence de tout
 * bouton « réessayer », que le canevas prend soin d'expliquer en pied de page — il n'y a rien à
 * relancer, et la seule sortie est de continuer.
 *
 * Le canevas coiffe cet écran du bandeau de section « PLAN » : la route vit donc sous `/plan`
 * (voir `systemRoutes.ts`), pour que le libellé du bandeau et le rail desktop disent la même chose.
 *
 * LIMITATIONS assumées :
 * — « Dernier catalogue » n'a pas de date à donner : aucun catalogue distant n'a jamais été
 *   téléchargé. Le tiret veut dire « pas de donnée », pas « jamais » ;
 * — le bandeau est rendu en permanence sur cet écran, qui est l'explication du hors-ligne. Le
 *   brancher sur l'état réel du réseau pour TOUTE l'application appartient à la coquille.
 */
export function OfflineScreen({ workoutCount, hasActivePlan }: OfflineScreenProps) {
  const navigate = useNavigate()
  const { workouts } = useWorkouts()
  const { plans } = usePlans()

  const catalogueSize = workoutCount ?? workouts.length
  const withPlan = hasActivePlan ?? plans.some((plan) => plan.status === 'active')

  return (
    <div className={styles.screen}>
      <AppHeader variant="root" label="Plan" />

      <div className={styles.column}>
        {/* `background:#0B0B0A; color:#EFEDE6; padding:12px 16px` avec un carré jaune de 10 px. */}
        <div className={styles.banner} role="status">
          <span className={styles.bannerDot} aria-hidden="true" />
          <span>
            Hors-ligne · les {catalogueSize} séances{withPlan && ' et ton plan'} restent lisibles
          </span>
        </div>

        <div className={styles.head}>
          <StackedTitle className={styles.title} lines={['Rien ne', 'manque ici']} />
          <p className={styles.lead}>
            L’app ne dépend pas du réseau : tout est écrit sur l’appareil. Trois choses seulement
            attendent une connexion.
          </p>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Fonction</span>
            <span>État</span>
          </div>
          {FUNCTIONS.map((row) => (
            <div key={row.label} className={styles.tableRow}>
              <span className={row.ready ? styles.rowLabel : styles.rowLabelWaiting}>{row.label}</span>
              <span className={row.ready ? styles.stateOk : styles.stateWaiting}>
                {row.ready ? 'OK' : 'EN ATTENTE'}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.lastBlock}>
          <div className={styles.lastRow}>
            <span className={styles.label}>Dernier catalogue</span>
            {/* Aucun catalogue distant n'a jamais été téléchargé : il n'y a pas de date à écrire,
                et on n'en fabrique pas une. Le tiret est l'idiome du produit pour « pas de donnée ». */}
            <span className={styles.lastValue} title="Aucun catalogue n’a encore été téléchargé.">
              —
            </span>
          </div>
          <p className={styles.lastNote}>
            Rien n’est perdu hors-ligne : séances faites et modifications de plan sont écrites
            localement, sans file d’attente.
          </p>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerNote}>
            Le bandeau disparaît dès que le réseau revient. Aucun bouton « réessayer » : il n’y a rien
            à relancer.
          </div>
          <SecondaryAction shape="block" className={styles.continueAction} onClick={() => navigate(PLAN_PATH)}>
            Continuer sans réseau
          </SecondaryAction>
        </div>
      </div>
    </div>
  )
}
