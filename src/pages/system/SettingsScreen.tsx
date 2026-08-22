import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useJournal, usePlans, useProfile, useRaces, useWorkouts } from '../../context/AppDataContext'
import { todayIso } from '../../domain/planWeek'
import { APP_VERSION, type AppTheme } from '../../domain/types'
import { exportBackup } from '../../storage/backup'
import { deleteDatabase } from '../../storage/db'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet/ConfirmSheet'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import { IMPORT_EXPORT_PATH } from '../tools/toolsRoutes'
import { LANGUAGE_PATH } from './systemRoutes'
import styles from './SettingsScreen.module.css'

/** Les trois segments d'« Apparence », dans l'ordre où l'artboard les pose. */
const THEMES: { value: AppTheme; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Système' },
]

/**
 * Aucune palette sombre n'existe : `src/styles/tokens.css` ne définit qu'un jeu de couleurs, et
 * enregistrer `theme:'dark'` changerait la donnée sans changer un pixel. Les deux segments restent
 * dessinés, inertes, avec leur raison — plutôt qu'un réglage qui ment.
 */
const NO_DARK_PALETTE = 'Aucune palette sombre n’est encore définie : les jetons du produit n’ont qu’un thème clair.'

const NO_PROFILE = 'Aucun profil enregistré : le réglage n’a rien où s’écrire.'

/**
 * Les trois unités du canevas. Elles ne sont pas réglables : le modèle ne porte aucun champ
 * d'unité, et tout le produit — calculateurs, fiches, exports — chiffre en métrique. Le tableau
 * dit donc ce qui EST, il n'ouvre pas un choix qui n'existe pas.
 */
const UNITS: { label: string; value: string }[] = [
  { label: 'Distances', value: 'km' },
  { label: 'Allure natation', value: '/100 m' },
  { label: 'Température', value: '°C' },
]

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export interface SettingsScreenProps {
  /**
   * Effacement des données locales. Par défaut la suppression de la base IndexedDB, suivie d'un
   * rechargement complet : le contexte de données garde sinon en mémoire des tableaux qui ne
   * correspondent plus à rien. Injecté par les tests.
   */
  onWipe?: () => Promise<void>
}

/**
 * Écran S2 · Réglages — « depuis le menu → Réglages ».
 *
 * Quatre réglages et un pied de page, dans l'ordre du canevas : apparence, langue, unités,
 * données. Le tout tient sur une colonne ; aucun artboard large n'existe pour cet écran, la
 * colonne se borne donc au-delà de 768 px au lieu de s'étirer.
 *
 * LIMITATIONS assumées, faute de données ou de moteur derrière :
 * — « Sombre » et « Système » sont inertes : il n'existe qu'une palette ;
 * — le tableau des unités est en lecture seule : le modèle ne porte aucun champ d'unité ;
 * — la bascule « fiches course hors ligne » est inerte et vraie : tout est déjà écrit sur
 *   l'appareil, il n'y a rien à activer.
 */
export function SettingsScreen({ onWipe }: SettingsScreenProps) {
  const navigate = useNavigate()
  const { profile, saveProfile } = useProfile()
  const { plans } = usePlans()
  const { workouts } = useWorkouts()
  const { races } = useRaces()
  const { journal } = useJournal()
  const [confirmingWipe, setConfirmingWipe] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const theme: AppTheme = profile?.theme ?? 'light'
  const language = profile?.language ?? 'fr'

  async function exportJson() {
    try {
      const backup = await exportBackup()
      download(`zoned-tri-${todayIso()}.json`, JSON.stringify(backup, null, 2))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export impossible.')
    }
  }

  async function selectTheme(value: AppTheme) {
    if (!profile || profile.theme === value) return
    await saveProfile({ ...profile, theme: value })
  }

  async function wipe() {
    setConfirmingWipe(false)
    if (onWipe) {
      await onWipe()
      return
    }
    await deleteDatabase()
    window.location.replace('/')
  }

  return (
    <div className={styles.screen}>
      <AppHeader variant="detail" trail={['Réglages']} onBack={() => navigate(-1)} />

      <div className={styles.column}>
        <div className={styles.head}>
          <StackedTitle className={styles.title} lines={['Réglages']} />
        </div>
        <div className={styles.frieze} aria-hidden="true" />

        <section className={styles.block}>
          <h2 className={styles.label}>Apparence</h2>
          <div className={styles.themeRow}>
            {THEMES.map((option) => {
              const unavailable = option.value !== 'light'
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.themeOption} ${option.value === theme ? styles.themeOptionActive : ''}`}
                  aria-pressed={option.value === theme}
                  disabled={unavailable || !profile}
                  title={unavailable ? NO_DARK_PALETTE : profile ? undefined : NO_PROFILE}
                  onClick={() => void selectTheme(option.value)}
                >
                  {option.label}
                  {option.value === theme && <span className={styles.check}> ✓</span>}
                </button>
              )
            })}
          </div>
        </section>

        {/* Le canevas ne dessine pas de flèche sur ces deux lignes, mais S3 se dit « depuis
            Réglages → Langue » : ce sont elles qui y mènent. Chacune nomme une langue et son état,
            et toutes deux ouvrent l'écran où le choix se fait vraiment. */}
        <section className={styles.block}>
          <h2 className={styles.label}>Langue</h2>
          <div className={styles.hairlineList}>
            <Link className={styles.row} to={LANGUAGE_PATH}>
              <span className={language === 'fr' ? styles.rowNameStrong : styles.rowName}>Français</span>
              <span className={language === 'fr' ? styles.rowValueStrong : styles.rowValue}>
                {language === 'fr' ? '✓ FR' : 'FR'}
              </span>
            </Link>
            <Link className={styles.row} to={LANGUAGE_PATH}>
              <span className={language === 'en' ? styles.rowNameStrong : styles.rowName}>English</span>
              {/* « partiel » serait un mensonge : aucune chaîne n'est traduite. La couverture réelle
                  est celle que l'artboard S3 affiche, et elle vaut zéro. */}
              <span className={styles.rowValue}>EN · non traduit</span>
            </Link>
          </div>
        </section>

        <section className={styles.units}>
          <div className={styles.unitsHead}>
            <span>Unités</span>
            <span>Valeur</span>
          </div>
          {UNITS.map((unit) => (
            <div key={unit.label} className={styles.unitRow}>
              <span className={styles.rowName}>{unit.label}</span>
              <span className={styles.unitValue}>{unit.value}</span>
            </div>
          ))}
        </section>

        <section className={styles.block}>
          <h2 className={styles.label}>Données</h2>
          <div className={styles.hairlineList}>
            <button type="button" className={styles.row} onClick={() => void exportJson()}>
              <span className={styles.rowName}>Sauvegarde complète</span>
              <span className={styles.rowValue}>.JSON</span>
            </button>
            <button
              type="button"
              className={`${styles.row} ${styles.rowDanger}`}
              onClick={() => setConfirmingWipe(true)}
            >
              <span className={styles.rowName}>Effacer les données locales</span>
              <span className={styles.rowValue} aria-hidden="true">
                →
              </span>
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </section>

        <div className={styles.toggleRow}>
          <button
            type="button"
            className={styles.switch}
            role="switch"
            aria-checked="true"
            aria-label="Garder les fiches course lisibles hors ligne"
            disabled
            title="Tout est écrit sur l’appareil : les fiches course sont lisibles hors ligne, sans réglage à activer."
          >
            <span className={styles.knob} aria-hidden="true" />
          </button>
          <span className={styles.toggleText}>Garder les fiches course lisibles hors ligne</span>
        </div>

        <div className={styles.footer}>
          <span>v {APP_VERSION} · aucun compte</span>
          <Link className={styles.sources} to={IMPORT_EXPORT_PATH}>
            sources ↗
          </Link>
        </div>
      </div>

      <ConfirmSheet
        isOpen={confirmingWipe}
        title="Effacer les données locales"
        effect={
          <>
            <p className={styles.effectLead}>
              Tout ce qui est écrit sur cet appareil disparaît, sans copie ailleurs : il n’y a pas de
              compte, donc pas de restauration.
            </p>
            <ul className={styles.effectList}>
              <li>{countLabel(plans.length, 'plan', 'plans')}</li>
              <li>{countLabel(workouts.length, 'séance', 'séances')}</li>
              <li>{countLabel(races.length, 'course', 'courses')}</li>
              <li>{countLabel(journal.length, 'entrée de journal', 'entrées de journal')}</li>
              <li>{profile ? 'ton profil et tes références' : 'aucun profil enregistré'}</li>
            </ul>
          </>
        }
        confirmLabel="Effacer"
        cancelLabel="Garder mes données"
        onConfirm={() => void wipe()}
        onCancel={() => setConfirmingWipe(false)}
      />
    </div>
  )
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`
}
