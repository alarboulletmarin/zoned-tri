import { useMemo, useState } from 'react'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProofGauge } from '../../components/ui/ProofBadge/ProofBadge'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { ToggleRow } from '../generator/GeneratorRows'
import {
  SETTING_SECTION_LABEL,
  SETTING_TRAIL_LABEL,
  applySettingToPlan,
  compareWeeks,
  formFromPlan,
  settingScopes,
  settingValueOfForm,
  weeklyVolumeDelta,
  type AppliedPlan,
} from '../../domain/planSettings'
import {
  VOLUME_MAX_MIN,
  VOLUME_MIN_MIN,
  VOLUME_STEP_MIN,
  type AvailableDays,
  type GeneratorForm,
} from '../../domain/planGenerator/form'
import { generatePlan } from '../../domain/planGenerator/generatePlan'
import { findCurrentWeek } from '../../domain/planWeek'
import { formatDurationMin } from '../../domain/workoutFormat'
import type {
  AthleteProfile,
  PlanSettingKey,
  PlanSettingScope,
  Race,
  TrainingPlan,
  Workout,
} from '../../domain/types'
import styles from './PlanSettingChangeScreen.module.css'

const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const GEAR_TOGGLES = [
  { key: 'pool', label: 'Piscine', meta: 'sans piscine, aucune séance en bassin dans le plan' },
  { key: 'openWater', label: 'Eau libre', meta: 'sans eau libre, aucune séance en milieu naturel' },
  { key: 'homeTrainer', label: 'Home-trainer', meta: 'sans home-trainer, aucune séance vélo en intérieur' },
  { key: 'powerMeter', label: 'Capteur de puissance', meta: 'sinon les séances passent en FC / ressenti' },
  {
    key: 'timeTrialBike',
    label: 'Vélo de contre-la-montre',
    meta: 'sans vélo de contre-la-montre, aucune séance en position aéro',
  },
] as const

export interface PlanSettingChangeScreenProps {
  plan: TrainingPlan
  /** Séances du plan en base — elles disent lesquelles sont faites, donc intouchables. */
  workouts: Workout[]
  /** Catalogue dans lequel le moteur puise pour rejouer les semaines. */
  catalogue: Workout[]
  setting: PlanSettingKey
  race?: Race
  profile?: AthleteProfile
  /** Jour courant ISO — injecté pour garder l'écran testable sans horloge. */
  today: string
  onBack: () => void
  /** Écrit le plan et son entrée de journal, puis rend la main avec de quoi annuler. */
  onApply: (applied: AppliedPlan, before: string, after: string, scope: PlanSettingScope) => void
}

/**
 * Écran 38 · Avant / après — « rien dans ton dos ».
 *
 * Le cadre en pointillé d'encre est l'engagement de l'écran : **rien de ce qui est affiché n'est
 * écrit**. On y voit, dans cet ordre : la valeur d'avant barrée et celle d'après, le contrôle qui
 * la produit, la portée choisie avec son décompte réel de semaines, la semaine en cours avant et
 * après, ce que le changement demande, et enfin ce qui ne bougera pas.
 *
 * L'« après » n'est pas une estimation : c'est le plan que le moteur produit réellement pour le
 * formulaire modifié — le même appel à `generatePlan` que celui de l'écriture. Ce qu'on prévisualise
 * est exactement ce qu'on enregistrera.
 *
 * LIMITATION : les deux réglages d'impact « tout » (format, date) ne passent pas par ici — ils
 * refont le plan de zéro et repassent par le générateur. L'écran 37 le dit sur la ligne elle-même.
 */
export function PlanSettingChangeScreen({
  plan,
  workouts,
  catalogue,
  setting,
  race,
  profile,
  today,
  onBack,
  onApply,
}: PlanSettingChangeScreenProps) {
  const baseForm = useMemo(() => formFromPlan(plan, race, profile), [plan, race, profile])
  const [draft, setDraft] = useState<GeneratorForm>(baseForm)
  const [scope, setScope] = useState<PlanSettingScope>('upcoming_weeks')

  const currentWeek = findCurrentWeek(plan, today)
  const currentWeekNumber = currentWeek?.weekNumber ?? 1

  const before = settingValueOfForm(setting, baseForm)
  const after = settingValueOfForm(setting, draft)
  const changed = before !== after

  // Le plan candidat : le MÊME appel que celui de l'écriture. Il repart du lundi de la semaine
  // courante, donc sa semaine 1 est la semaine en cours du plan enregistré.
  const candidate = useMemo(
    () => generatePlan(draft, today, catalogue, { idPrefix: plan.id }),
    [draft, today, catalogue, plan.id],
  )

  const beforeWeek = currentWeek ?? plan.weeks[0]
  const afterWeek = candidate.plan.weeks[0]
  const rows = beforeWeek && afterWeek ? compareWeeks(beforeWeek, afterWeek) : []
  const delta = beforeWeek && afterWeek ? weeklyVolumeDelta(beforeWeek, afterWeek) : 0

  const scopes = settingScopes(plan, currentWeekNumber)
  const chosen = scopes.find((option) => option.scope === scope) ?? scopes[1]

  const completedIds = useMemo(
    () => new Set(workouts.filter((workout) => workout.status === 'completed').map((workout) => workout.id)),
    [workouts],
  )

  const pastWeeks = Math.max(0, currentWeekNumber - 1)
  const taperWeeks = plan.phases.find((phase) => phase.name === 'Taper')?.weeksCount ?? 0

  function apply() {
    const applied = applySettingToPlan(plan, candidate, scope, currentWeekNumber, completedIds)
    onApply(applied, before, after, scope)
  }

  return (
    <div className={styles.screen}>
      <AppHeader
        variant="detail"
        trail={['Plan', 'Réglages du plan', SETTING_TRAIL_LABEL[setting]]}
        onBack={onBack}
        counter="non enregistré"
      />

      <div className={styles.column}>
        <div className={styles.head}>
          <div className={styles.sectionLabel}>{SETTING_SECTION_LABEL[setting]}</div>
          <div className={styles.change}>
            <span className={styles.before}>{before}</span>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
            <span className={changed ? styles.after : styles.afterSame}>{after}</span>
          </div>
        </div>

        <SettingEditor
          setting={setting}
          draft={draft}
          weekCount={plan.weeksCount}
          onChange={setDraft}
        />

        <section className={styles.block}>
          <div className={styles.sectionLabel}>Jusqu’où appliquer</div>
          <div className={styles.scopes} role="group" aria-label="Portée du changement">
            {scopes.map((option) => (
              <button
                key={option.scope}
                type="button"
                className={option.scope === scope ? styles.scopeChosen : styles.scope}
                aria-pressed={option.scope === scope}
                disabled={option.inertReason !== undefined}
                title={option.inertReason}
                onClick={() => setScope(option.scope)}
              >
                <span>{option.label}</span>
                <span className={styles.scopeCount}>
                  {option.weeksLabel}
                  {option.scope === scope ? ' · ✓' : ''}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Semaine {String(currentWeekNumber).padStart(2, '0')}</span>
            <span>Avant</span>
            <span>Après</span>
          </div>
          {rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <span className={styles.rowLabel}>{row.label}</span>
              <span className={styles.rowBefore}>{row.before}</span>
              <span className={row.changed ? styles.rowAfterChanged : styles.rowAfter}>{row.after}</span>
            </div>
          ))}
        </div>

        {/* Encart jaune : ce que le changement coûte, avec la qualification de la preuve. La
            progression de charge est une règle métier assumée, pas une affirmation sourcée — d'où
            la preuve modérée, exactement comme le canevas la qualifie. */}
        <div className={styles.demand}>
          <div className={styles.demandHead}>
            <span className={styles.demandLabel}>Ce que ça demande</span>
            <ProofGauge level="moderate" />
          </div>
          <p className={styles.demandText}>{demandSentence(delta, rows)}</p>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerNote}>
            Ne bougeront pas : {pastWeeks > 0 ? `les ${pastWeeks} semaines déjà passées, ` : ''}
            {completedIds.size > 0 ? `les ${completedIds.size} séances cochées, ` : ''}
            {race ? 'ta course, ' : ''}
            {taperWeeks > 0 ? `l’affûtage de ${taperWeeks} semaines. ` : ''}
            Le pointillé veut dire que rien n’est écrit — revenir en arrière rend l’état exact d’avant.
          </p>
          <PrimaryAction
            tone="ink-shadow"
            className={styles.apply}
            disabled={!changed}
            title={changed ? undefined : 'Rien n’a changé : il n’y a rien à appliquer.'}
            onClick={apply}
          >
            Appliquer aux {chosen.weeksLabel}
          </PrimaryAction>
          <SecondaryAction shape="link" className={styles.keep} onClick={onBack}>
            Garder {before}
          </SecondaryAction>
        </div>
      </div>
    </div>
  )
}

/** « +1 h 30 par semaine · 9 séances au lieu de 7 » — la phrase de l'encart, sans rien estimer. */
function demandSentence(deltaMin: number, rows: ReturnType<typeof compareWeeks>): string {
  const sessions = rows.find((row) => row.label === 'Séances')
  const sessionPart =
    sessions && sessions.changed ? `\n${sessions.after} séances au lieu de ${sessions.before}` : ''

  if (deltaMin === 0) return `Aucun volume supplémentaire sur la semaine en cours.${sessionPart}`
  const sign = deltaMin > 0 ? '+' : '−'
  return `${sign}${formatDurationMin(Math.abs(deltaMin))} sur la semaine en cours.${sessionPart}`
}

// --- Les contrôles, un par réglage ---------------------------------------------------------------

/**
 * Le contrôle qui produit la valeur d'après. Il prend la place que le canevas donne à la frise de
 * 14 px : pour le volume, cette frise EST le contrôle (la part d'encre marque la position de la
 * valeur sur l'échelle 4 h – 12 h, exactement les 62 % de l'artboard pour 9 h).
 */
function SettingEditor({
  setting,
  draft,
  weekCount,
  onChange,
}: {
  setting: PlanSettingKey
  draft: GeneratorForm
  /** Longueur du plan enregistré : la rangée des semaines réduites en montre exactement autant. */
  weekCount: number
  onChange: (next: GeneratorForm) => void
}) {
  if (setting === 'volume') {
    const ratio =
      (draft.weeklyVolumeTargetMin - VOLUME_MIN_MIN) / (VOLUME_MAX_MIN - VOLUME_MIN_MIN)
    return (
      <div className={styles.band}>
        <div className={styles.bandFill} style={{ width: `${ratio * 100}%` }} aria-hidden="true" />
        <input
          type="range"
          className={styles.bandRange}
          min={VOLUME_MIN_MIN}
          max={VOLUME_MAX_MIN}
          step={VOLUME_STEP_MIN}
          value={draft.weeklyVolumeTargetMin}
          aria-label="Nouveau volume hebdomadaire"
          aria-valuetext={formatDurationMin(draft.weeklyVolumeTargetMin)}
          onChange={(event) =>
            onChange({ ...draft, weeklyVolumeTargetMin: Number(event.target.value) })
          }
        />
      </div>
    )
  }

  if (setting === 'days') {
    return (
      <div className={styles.days} role="group" aria-label="Jours d’entraînement">
        {DAY_INITIALS.map((initial, index) => (
          <button
            key={DAY_NAMES[index]}
            type="button"
            className={styles.day}
            data-active={draft.availableDays[index]}
            aria-pressed={draft.availableDays[index]}
            aria-label={DAY_NAMES[index]}
            onClick={() => {
              const next = [...draft.availableDays] as AvailableDays
              next[index] = !next[index]
              onChange({ ...draft, availableDays: next })
            }}
          >
            {initial}
          </button>
        ))}
      </div>
    )
  }

  if (setting === 'gear') {
    return (
      <div className={styles.gear}>
        {GEAR_TOGGLES.map((toggle) => (
          <ToggleRow
            key={toggle.key}
            label={toggle.label}
            meta={toggle.meta}
            checked={draft.constraints[toggle.key]}
            onToggle={(next) =>
              onChange({ ...draft, constraints: { ...draft.constraints, [toggle.key]: next } })
            }
          />
        ))}
      </div>
    )
  }

  if (setting === 'reduced_weeks') {
    const blocked = new Set(draft.constraints.blockedWeeks.map((week) => week.weekNumber))
    const reason = draft.constraints.blockedWeeks[0]?.reason ?? ''
    return (
      <div className={styles.weeks} role="group" aria-label="Semaines réduites">
        {Array.from({ length: Math.max(1, weekCount) }, (_, index) => {
          const weekNumber = index + 1
          const isBlocked = blocked.has(weekNumber)
          return (
            <button
              key={weekNumber}
              type="button"
              className={styles.week}
              aria-pressed={isBlocked}
              aria-label={`Semaine ${weekNumber}`}
              onClick={() => {
                const next = isBlocked
                  ? draft.constraints.blockedWeeks.filter((week) => week.weekNumber !== weekNumber)
                  : [...draft.constraints.blockedWeeks, { weekNumber, reason }].sort(
                      (a, b) => a.weekNumber - b.weekNumber,
                    )
                onChange({ ...draft, constraints: { ...draft.constraints, blockedWeeks: next } })
              }}
            >
              <span className={isBlocked ? styles.weekFillBlocked : styles.weekFill} />
            </button>
          )
        })}
      </div>
    )
  }

  // Format et date ne passent pas par cet écran : l'écran 37 ne les y envoie jamais.
  return null
}
