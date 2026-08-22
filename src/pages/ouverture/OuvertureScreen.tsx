import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { DisciplineBadge } from '../../components/ui/Badge/Badge'
import { Card } from '../../components/ui/Card/Card'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { NoteBox } from '../../components/ui/NoteBox/NoteBox'
import { PrimaryAction } from '../../components/ui/PrimaryAction/PrimaryAction'
import { ProgressBar, type ProgressSegment } from '../../components/ui/ProgressBar/ProgressBar'
import { SecondaryAction } from '../../components/ui/SecondaryAction/SecondaryAction'
import { useProfile, usePlans, useRaces, useWorkouts } from '../../context/AppDataContext'
import { SEED_WORKOUTS } from '../../domain/seedWorkouts'
import { CALCULATORS } from '../tools/calculators/registry'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { selectOpeningState, type OpeningState, type OpeningStateKind } from '../../domain/openingState'
import { todayIso } from '../../domain/planWeek'
import { PLANS_PATH } from '../../navigation'
import styles from './OuvertureScreen.module.css'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'

/**
 * Écran d'ouverture — mockups 01 / 01b / 01c (mobile) et S9 / S9b / S9c (desktop).
 *
 * Trois états, un seul écran : `selectOpeningState` décide lequel d'après ce qui est enregistré
 * sur l'appareil, et cette vue ne fait que peindre. La structure commune (bandeau sombre, panneau
 * « Sur cet appareil », encart jaune, appels à l'action) est écrite une fois ; seuls le bloc
 * central du panneau et une poignée de libellés changent d'un état à l'autre.
 *
 * Les deux largeurs ne sont pas la même page réagencée : en desktop le bandeau devient une colonne
 * sombre pleine hauteur qui porte les appels à l'action, en mobile il devient un en-tête et les
 * appels à l'action tombent en bas de page, la liste des plans archivés se réduisant à une ligne.
 * Le DOM diffère donc réellement : on choisit la mise en page avec `useBreakpoint()` (comme
 * `AppShell` pour son rail) plutôt qu'avec un `@media` qui devrait masquer des blocs entiers.
 */
export function OuvertureScreen() {
  const { plans, loading } = usePlans()
  const { races } = useRaces()
  const { workouts } = useWorkouts()
  const { profile } = useProfile()
  const breakpoint = useBreakpoint()

  const state = useMemo(
    () => selectOpeningState({ plans, races, workouts, profile, today: todayIso() }),
    [plans, races, workouts, profile],
  )

  if (loading) return null

  return breakpoint === 'desktop' ? <DesktopLayout state={state} /> : <MobileLayout state={state} />
}

/* --- Copie propre à chaque état ---------------------------------------------------------- */

interface StateCopy {
  /** Libellé de l'appel à l'action principal (le seul mot qui change dans la colonne sombre). */
  primaryAction: string
  /** Appel à l'action secondaire, desktop uniquement. */
  secondaryAction: string
  /** Note de bas de colonne sombre, desktop. */
  desktopNote: (state: OpeningState) => string
  /** Note mono sous le titre, mobile. */
  mobileKicker: (state: OpeningState) => string
  calloutTitle: string
  calloutBody: string
  /** Avertissement de bas de panneau, desktop. */
  panelFooter: string
}

const OFFLINE_KICKER = 'Hors-ligne · sans compte'

/**
 * Les artboards annoncent « 312 séances » et « 4 calculateurs ». Ce sont les chiffres du contenu
 * final, pas ceux de la base : le catalogue en porte 32 aujourd'hui, et le produit compte douze
 * calculateurs. On lit donc la donnée — un compte affiché qui ne correspond à rien est exactement
 * ce que le produit s'interdit.
 */
const catalogueCount = SEED_WORKOUTS.length
const calculatorCount = CALCULATORS.length

const COPY: Record<OpeningStateKind, StateCopy> = {
  plan_in_progress: {
    primaryAction: 'Générer mon plan',
    secondaryAction: "Voir une séance d'exemple",
    desktopNote: () =>
      'Six questions : discipline dominante, course visée, temps disponible, matériel, références mesurées, jours interdits.',
    mobileKicker: () => OFFLINE_KICKER,
    calloutTitle: "Générer n'écrase rien",
    calloutBody: "le plan en cours passe en archive et se reprend là où il s'était arrêté",
    panelFooter:
      "Un seul plan alimente « Aujourd'hui ». Aucune donnée ne quitte l'appareil : rien à créer, rien à connecter.",
  },
  first_visit: {
    primaryAction: 'Commencer',
    secondaryAction: "Voir une séance d'exemple",
    desktopNote: () => "Sans plan, l'application n'a rien à afficher : la génération est la première étape.",
    mobileKicker: () => OFFLINE_KICKER,
    calloutTitle: "Rien n'est enregistré avant la fin",
    calloutBody: "tu peux quitter à n'importe quelle question · aucune réponse n'est conservée",
    panelFooter: "Pas de compte, pas d'e-mail. Le plan vit sur cet appareil et s'exporte quand tu veux.",
  },
  race_done: {
    primaryAction: 'Plan suivant',
    secondaryAction: 'Revoir le bilan',
    desktopNote: (state) =>
      state.referencesDateLabel
        ? `Tes références du ${state.referencesDateLabel} sont conservées : le plan suivant part de là, pas de zéro.`
        : 'Tes références sont conservées : le plan suivant part de là, pas de zéro.',
    mobileKicker: (state) =>
      state.referencesDateLabel ? `Références du ${state.referencesDateLabel} conservées` : OFFLINE_KICKER,
    calloutTitle: 'Deux semaines de coupure conseillées',
    calloutBody: 'le plan suivant peut démarrer plus tard : tu choisis la date de reprise',
    panelFooter: "Aucun plan actif : « Aujourd'hui » affiche le bilan jusqu'à la prochaine génération.",
  },
}


/**
 * Répartition des disciplines dans la bibliothèque — la frise de 14 px sous le bandeau (artboard 01).
 * Elle est à l'échelle du temps réel, comme toute barre de répartition du système.
 */
const STRIPE: ProgressSegment[] = [
  { key: 'N', percent: 27, color: 'var(--color-discipline-n)', label: 'natation' },
  { key: 'V', percent: 31, color: 'var(--color-discipline-v)', label: 'vélo' },
  { key: 'C', percent: 28, color: 'var(--color-discipline-c)', label: 'course' },
  { key: 'R', percent: 14, color: 'var(--color-discipline-r)', label: 'renforcement' },
]

const QUESTIONS: { index: string; title: string; detail: string }[] = [
  { index: '01', title: 'Ta course', detail: 'date, distance, format' },
  { index: '02', title: 'Tes disponibilités', detail: 'heures par semaine, jours interdits' },
  { index: '03', title: 'Tes références', detail: 'ou une estimation, corrigeable plus tard' },
]

/* --- Mise en page mobile (mockups 01 / 01b / 01c) ----------------------------------------- */

function MobileLayout({ state }: { state: OpeningState }) {
  const navigate = useNavigate()
  const copy = COPY[state.kind]

  return (
    <div className={styles.screen}>
      {/* Artboard 01 : bandeau de 46 px portant le mot-symbole — l'ouverture n'est pas une section,
          elle n'a pas de libellé mono. Sur desktop (S9) il n'y a aucun bandeau : voir DesktopLayout. */}
      <AppHeader variant="opening" />

      <section className={styles.heroBanner}>
        <HeroTitle className={styles.heroTitle} />
        <p className={styles.heroLead}>
          Six questions, puis un plan jusqu'à ta course : chaque séance dit ce qu'elle vise.
        </p>
        <div className={styles.heroKicker}>{copy.mobileKicker(state)}</div>
      </section>

      <ProgressBar
        className={styles.stripe}
        segments={STRIPE}
        height={14}
        underlined
        label={`Répartition des ${catalogueCount} séances`}
      />

      {/* Dès la tablette, l'état passe en deux colonnes `1fr / 292px` (README §3) : la largeur sert
          à mettre l'encart en regard de ce qu'il commente, pas à étirer les lignes. En mobile le
          conteneur est transparent et les blocs se suivent, dans l'ordre de l'artboard 01. */}
      <div className={styles.state}>
        <div className={styles.stateMain}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Sur cet appareil</span>
            <span className={styles.panelSummary}>{state.summaryLabel}</span>
          </div>

          <div className={styles.panelBlock}>
            <MainCard state={state} layout="mobile" />
          </div>

          <SecondaryBlock state={state} layout="mobile" />
        </div>

        <div className={styles.stateAside}>
          <NoteBox className={styles.callout} title={copy.calloutTitle}>
            {copy.calloutBody}
          </NoteBox>
          {/* L'artboard 01 n'a pas la place de porter cette phrase ; S9 la met en pied de panneau.
              Dès que la largeur la permet, elle revient — c'est la colonne qui l'accueille. */}
          <p className={styles.asideFooter}>{copy.panelFooter}</p>
        </div>
      </div>

      <div className={styles.mobileActions}>
        <PrimaryAction trailing="→" onClick={() => navigate('/generate-plan')}>
          {copy.primaryAction}
        </PrimaryAction>
        <SecondaryAction shape="link" className={styles.libraryLink} onClick={() => navigate('/workouts')}>
          Parcourir les {catalogueCount} séances
        </SecondaryAction>
      </div>
    </div>
  )
}

/* --- Mise en page desktop (mockups S9 / S9b / S9c) ---------------------------------------- */

function DesktopLayout({ state }: { state: OpeningState }) {
  const navigate = useNavigate()
  const copy = COPY[state.kind]

  return (
    <div className={styles.desktopScreen}>
      <section className={styles.heroColumn}>
        <div className={styles.heroColumnTop}>
          <span className={styles.wordmark}>Zoned Tri</span>
          <span className={styles.heroKickerDesktop}>{OFFLINE_KICKER}</span>
        </div>

        <HeroTitle className={styles.heroTitleDesktop} />
        <p className={styles.heroLeadDesktop}>
          Six questions, puis un plan complet jusqu'à ta course — chaque séance annonce ce qu'elle vise, sur quelle
          mesure elle s'appuie, et ce qu'elle coûte à la suivante.
        </p>

        <div className={styles.stats}>
          <span>
            {catalogueCount} séances
            <br />
            documentées
          </span>
          <span>
            {calculatorCount} calculateurs
            <br />
            et leurs sources
          </span>
          <span>
            exports .FIT
            <br />
            .ZWO · .ICS · .PDF
          </span>
        </div>

        <div className={styles.heroActions}>
          <PrimaryAction
            large
            trailing="→"
            className={styles.primaryActionDesktop}
            onClick={() => navigate('/generate-plan')}
          >
            {copy.primaryAction}
          </PrimaryAction>
          <SecondaryAction
            shape="block"
            onInk
            className={styles.secondaryActionDesktop}
            onClick={() => navigate(state.kind === 'race_done' ? '/races' : '/workouts')}
          >
            {copy.secondaryAction}
          </SecondaryAction>
        </div>

        <div className={styles.heroNote}>{copy.desktopNote(state)}</div>
      </section>

      <section className={styles.panel}>
        {/* L'unique bandeau de 46 px de S9 : il titre la colonne de droite. La colonne sombre n'en
            a pas — c'est une affiche, pas un écran à naviguer. */}
        <header className={styles.panelHeaderDesktop}>
          <span className={styles.panelLabelDesktop}>Sur cet appareil</span>
          <span className={styles.panelSummaryDesktop}>{state.summaryLabel}</span>
        </header>

        <div className={styles.panelBlock}>
          <MainCard state={state} layout="desktop" />
        </div>

        <SecondaryBlock state={state} layout="desktop" />

        <NoteBox className={styles.callout} title={copy.calloutTitle}>
          {copy.calloutBody}
        </NoteBox>

        <div className={styles.panelFooter}>{copy.panelFooter}</div>
      </section>
    </div>
  )
}

/* --- Blocs partagés par les deux mises en page -------------------------------------------- */

type Layout = 'mobile' | 'desktop'

function HeroTitle({ className }: { className: string }) {
  return (
    <StackedTitle className={className} lines={['Un plan', 'qui dit', 'pourquoi']} />
  )
}

/** Bloc central du panneau : la seule zone qui change vraiment d'un état à l'autre. */
function MainCard({ state, layout }: { state: OpeningState; layout: Layout }) {
  if (state.activePlan) return <ActivePlanCard state={state} />
  if (state.finishedPlan) return <FinishedPlanCard state={state} />
  return <EmptyCard layout={layout} />
}

function ActivePlanCard({ state }: { state: OpeningState }) {
  const navigate = useNavigate()
  const plan = state.activePlan
  if (!plan) return null

  return (
    <Card tone="featured" className={styles.featuredCard}>
      <div className={styles.cardTopRow}>
        <span className={styles.cardKicker}>En cours · {plan.title}</span>
        {plan.countdownLabel && <span className={styles.countdown}>{plan.countdownLabel}</span>}
      </div>
      <div className={styles.cardHeadline}>{plan.weekLabel}</div>
      <ProgressBar
        className={styles.progress}
        percent={plan.progressPercent}
        label={`Avancement du plan ${plan.title}`}
      />
      {plan.nextSession && (
        <div className={styles.cardDetail}>
          prochaine séance : {plan.nextSession.dayLabel} · {plan.nextSession.detail}
        </div>
      )}
      <PrimaryAction tone="ink" className={styles.cardAction} onClick={() => navigate('/plan')}>
        Reprendre
      </PrimaryAction>
    </Card>
  )
}

function FinishedPlanCard({ state }: { state: OpeningState }) {
  const navigate = useNavigate()
  const plan = state.finishedPlan
  if (!plan) return null

  return (
    <Card className={styles.plainCard}>
      <div className={styles.cardTopRow}>
        <span className={styles.cardKicker}>Terminé · {plan.title}</span>
        {plan.isRaceRun && <span className={styles.runBadge}>Couru</span>}
      </div>
      <div className={styles.cardHeadline}>{plan.headline}</div>
      <ProgressBar className={styles.progress} percent={100} label={`Avancement du plan ${plan.title}`} />
      <div className={styles.cardDetail}>{plan.detail}</div>
      <SecondaryAction shape="block" className={styles.cardAction} onClick={() => navigate('/races')}>
        Voir le bilan
      </SecondaryAction>
    </Card>
  )
}

function EmptyCard({ layout }: { layout: Layout }) {
  return (
    <EmptyState
      className={styles.emptyCard}
      headline="Rien pour l'instant"
      sentence={
        layout === 'desktop'
          ? "c'est normal : tu ouvres Zoned Tri pour la première fois. Aucun plan, aucune séance, aucune référence enregistrée."
          : 'première ouverture : aucun plan, aucune référence enregistrée.'
      }
    />
  )
}

/** Bloc sous la carte centrale : archives, questions du générateur, ou références à reporter. */
function SecondaryBlock({ state, layout }: { state: OpeningState; layout: Layout }) {
  if (state.kind === 'first_visit') return <QuestionsBlock layout={layout} />
  if (state.kind === 'race_done') return <ReferencesBlock state={state} />
  return <ArchivedBlock state={state} layout={layout} />
}

function QuestionsBlock({ layout }: { layout: Layout }) {
  return (
    <div className={`${styles.panelBlock} ${styles.secondBlock}`}>
      <div className={styles.blockHeader}>
        <span className={styles.blockLabel}>
          {layout === 'desktop' ? "Ce que l'on va te demander" : "Ce qu'on va te demander"}
        </span>
        <span className={styles.blockMeta}>≈ 4 min · 6 questions</span>
      </div>
      <div className={styles.rows}>
        {QUESTIONS.map((question) => (
          <div key={question.index} className={styles.row}>
            <span className={styles.rowIndex}>{question.index}</span>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{question.title}</span>
              <span className={styles.rowDetail}>{question.detail}</span>
            </span>
          </div>
        ))}
      </div>
      {layout === 'desktop' && (
        <div className={styles.blockNote}>+ matériel, discipline à prioriser, semaines de coupure</div>
      )}
    </div>
  )
}

function ReferencesBlock({ state }: { state: OpeningState }) {
  if (state.references.length === 0) return null

  return (
    <div className={`${styles.panelBlock} ${styles.secondBlock}`}>
      <div className={styles.blockLabel}>Références à reporter</div>
      <div className={styles.rows}>
        {state.references.map((reference) => (
          <div key={reference.discipline} className={styles.row}>
            <DisciplineBadge discipline={reference.discipline} />
            <span className={styles.referenceLabel}>{reference.label}</span>
            {reference.deltaLabel && (
              <span className={reference.improved ? styles.deltaImproved : styles.delta}>{reference.deltaLabel}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * L'archive des plans a désormais son écran : l'artboard 41, « Mes plans » (`PLANS_PATH`). C'est
 * lui qui porte la réouverture d'un plan archivé — avec la feuille qui en montre l'effet et le
 * bandeau d'annulation de 6 s, parce que rouvrir un plan change celui qui alimente « Aujourd'hui ».
 * Les deux boutons de ce bloc y mènent donc, au lieu d'être inertes comme ils l'étaient.
 */
function ArchivedBlock({ state, layout }: { state: OpeningState; layout: Layout }) {
  const navigate = useNavigate()

  // Le bloc disparaissait quand l'archive était vide — c'est-à-dire dans le cas le PLUS fréquent,
  // celui d'un premier plan. Deux règles y passaient : un vide se nomme (nº 1), et « Mes plans »
  // n'avait alors plus aucun chemin, puisque c'était son unique porte.
  if (state.archivedPlans.length === 0) {
    return (
      <div className={`${styles.panelBlock} ${styles.secondBlock}`}>
        <div className={styles.blockLabel}>Archivés</div>
        <EmptyState
          className={styles.archivedEmpty}
          sentence="aucun plan archivé · le premier y arrivera quand tu en généreras un second"
          action={<SecondaryAction onClick={() => navigate(PLANS_PATH)}>Voir mes plans</SecondaryAction>}
        />
      </div>
    )
  }

  // Mobile : la liste complète ne tient pas sous la carte du plan en cours, elle se réduit à un
  // compte et un accès (mockup 01) ; desktop : une ligne par plan avec son bouton (mockup S9).
  if (layout === 'mobile') {
    const count = state.archivedPlans.length
    return (
      <div className={`${styles.panelBlock} ${styles.secondBlock} ${styles.archivedBlock}`}>
        <div className={styles.archivedSummaryRow}>
          <span className={styles.archivedSummaryText}>
            {count} {count > 1 ? 'plans archivés' : 'plan archivé'}
          </span>
          <SecondaryAction onClick={() => navigate(PLANS_PATH)}>Voir</SecondaryAction>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.panelBlock} ${styles.secondBlock}`}>
      <div className={styles.blockLabel}>Archivés</div>
      <div className={styles.rows}>
        {state.archivedPlans.map((plan) => (
          <div key={plan.planId} className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{plan.title}</span>
              <span className={styles.rowDetail}>{plan.detail}</span>
            </span>
            {/* La réouverture elle-même appartient à l'écran 41 : elle écrit, et une écriture
                montre son effet avant. Le bouton y mène, il ne bascule pas le plan d'ici. */}
            <SecondaryAction onClick={() => navigate(PLANS_PATH)}>Rouvrir</SecondaryAction>
          </div>
        ))}
      </div>
    </div>
  )
}
