import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/ui/AppHeader/AppHeader'
import { EmptyState } from '../../components/ui/EmptyState/EmptyState'
import { NoteBox } from '../../components/ui/NoteBox/NoteBox'
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar'
import { ProofGauge } from '../../components/ui/ProofBadge/ProofBadge'
import type { EvidenceNoteData, Race } from '../../domain/types'
import { PROOF_WORD, fluidDetail, nutritionPlan } from '../../domain/raceView'
import { racePath } from './routes'
import s from './RaceScreens.module.css'
import own from './RaceNutritionScreen.module.css'
import { RaceSegment } from '../../components/navigation/RaceSegment/RaceSegment'

export interface RaceNutritionScreenProps {
  race: Race
}

/** Les deux appels de note du pied d'écran (artboard 10 : « 5. » glucides, « 6. » sodium). */
const CARBS_NOTE = 5
const SODIUM_NOTE = 6

function Footnote({ mark, note }: { mark: number; note: EvidenceNoteData }) {
  return (
    <div className={s.footnote}>
      <span className={s.footnoteMark}>{mark}.</span>
      <span className={s.footnoteText}>
        {note.text} — <span className={s.footnoteLevel}>preuve {PROOF_WORD[note.level]}</span>.
      </span>
    </div>
  )
}

/**
 * Artboard 10 · Courses · plan nutrition — combien de glucides sur la durée de l'effort, comment ils
 * se répartissent entre le vélo et la course, ce qu'il faut emporter, et le sodium avec la réserve
 * qui lui revient.
 *
 * Le total et la répartition ne sont pas écrits à la main : ils viennent de `carbsForDuration`
 * (Jeukendrup, preuve solide) appliqué à la durée vélo + course du pacing, répartie au prorata du
 * temps de chaque segment. La ligne « Eau » se calcule de la même façon depuis le débit du plan.
 */
export function RaceNutritionScreen({ race }: RaceNutritionScreenProps) {
  const navigate = useNavigate()
  const nutrition = race.nutrition
  const plan = nutritionPlan(race)
  const water = fluidDetail(race)

  return (
    <div className={s.screen}>
      <AppHeader
        variant="detail"
        trail={['Courses', { label: race.name, to: racePath(race.id) }, 'Nutrition']}
        onBack={() => navigate(racePath(race.id))}
      />
      <RaceSegment raceId={race.id} current="nutrition" />

      <div className={s.column}>
        {!nutrition || !plan || plan.effortSec === 0 ? (
          <div className={s.emptyBlock}>
            <EmptyState
              headline="Pas de plan"
              sentence="Le plan nutrition se calcule sur la durée de l’effort : sans plan de pacing enregistré, il n’y a rien à répartir."
            />
          </div>
        ) : (
          <>
            <div className={own.headline}>
              <div className={s.overline}>Sur {plan.effortLabel} d’effort</div>
              <div className={own.total}>{plan.totalGrams} G</div>
              <div className={own.rate}>
                {nutrition.carbsGPerH} g/h · glucose + fructose {nutrition.glucoseFructoseRatio}
                {nutrition.carbsEvidence && <sup className={own.noteRef}>{CARBS_NOTE}</sup>}
              </div>
            </div>

            <ProgressBar
              className={s.strip}
              segments={plan.shares.map((share) => ({
                key: share.key,
                percent: share.percent,
                color: `var(--color-discipline-${share.discipline.toLowerCase()})`,
                label: share.label,
              }))}
              height={14}
              framed
              label="Répartition des glucides par discipline"
            />

            <div className={own.shareLegend}>
              {plan.shares.map((share) => (
                <span key={share.key}>{share.label}</span>
              ))}
            </div>

            <section className={own.carried}>
              <div className={s.sectionLabel}>À emporter</div>
              <div className={own.carriedList}>
                {plan.items.map((item) => (
                  <div key={item.label} className={own.carriedRow}>
                    <div>
                      <div className={s.rowTitleStrong}>{item.label}</div>
                      {item.detail && <div className={s.rowDetail}>{item.detail}</div>}
                    </div>
                    <span className={own.quantity}>{item.quantity}</span>
                  </div>
                ))}
                {plan.fluidLabel && (
                  <div className={own.carriedRow}>
                    <div>
                      <div className={s.rowTitleStrong}>Eau</div>
                      {water && <div className={s.rowDetail}>{water}</div>}
                    </div>
                    <span className={own.quantity}>{plan.fluidLabel}</span>
                  </div>
                )}
              </div>
            </section>

            {nutrition.sodiumMgPerH !== undefined && (
              <NoteBox className={own.sodium}>
                <div className={s.proofHeader}>
                  <span className={own.sodiumTitle}>Sodium</span>
                  {nutrition.sodiumEvidence && <ProofGauge level={nutrition.sodiumEvidence.level} />}
                </div>
                <div className={own.sodiumValue}>
                  ~{nutrition.sodiumMgPerH} MG/H
                  {nutrition.sodiumEvidence && <sup className={own.noteRefSm}>{SODIUM_NOTE}</sup>}
                </div>
                {nutrition.sodiumRationale && <p className={own.sodiumText}>{nutrition.sodiumRationale}</p>}
              </NoteBox>
            )}

            <div className={own.notes}>
              {nutrition.carbsEvidence && <Footnote mark={CARBS_NOTE} note={nutrition.carbsEvidence} />}
              {nutrition.sodiumEvidence && <Footnote mark={SODIUM_NOTE} note={nutrition.sodiumEvidence} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
