import { useMemo } from 'react'
import { BottomSheet } from '../../components/ui/BottomSheet/BottomSheet'
import { StackedTitle } from '../../components/ui/StackedTitle/StackedTitle'
import {
  EXPORT_FOOTNOTES,
  EXPORT_SHEET_PROMISE,
  EXPORT_SHEET_TITLE,
  buildExportRows,
  exportTrail,
  type ExportFormat,
  type ExportRow,
} from '../../domain/exports/exportSheet'
import { buildIcs, icsWeekFileName, type IcsDay } from '../../domain/exports/icsFile'
import { buildZwo, zwoFileName } from '../../domain/exports/zwoFile'
import type { Workout } from '../../domain/types'
import { downloadIcs, downloadZwo } from './download'
import styles from './ExportSheet.module.css'

export interface ExportSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Numéro de la semaine exportée — fil d'Ariane et nom du fichier `.ICS`. */
  weekNumber: number
  /** Les sept journées de la semaine, séances déjà résolues contre le catalogue. */
  days: IcsDay[]
  /** Séance de l'écran appelant, quand il y en a une : c'est elle que `.FIT` et `.ZWO` visent. */
  workout?: Workout
  /** Ce que fait la puce `.PDF`. L'appelant décide : ouvrir le document A4, ou imprimer. */
  onPrint: () => void
  /** Pages réellement produites par le document A4 — l'artboard écrit « A4 · 3 pages ». */
  pageCount?: number
}

/**
 * Écran 20 · Feuille d'export — « appelée depuis n'importe quel écran · **dit ce que contient
 * chaque fichier** ».
 *
 * Ce n'est pas un menu de boutons : c'est une feuille qui ANNONCE. Chaque carte donne le format,
 * ce qu'il pèse ou compte, ce qu'il devient une fois ouvert, et ce qu'il contient exactement. La
 * règle « rien dans le dos de l'utilisateur » vaut aussi pour un fichier : on sait ce qu'on écrit
 * avant de l'écrire.
 *
 * DEUX FORMATS S'ÉCRIVENT ICI : le `.ICS` (texte, RFC 5545) et le `.ZWO` (XML Zwift). Le `.PDF`
 * passe par l'impression du navigateur — voir `PrintDocument`.
 *
 * LE `.FIT` RESTE INERTE : binaire Garmin, reporté par décision antérieure du projet. Sa puce
 * porte son motif, jamais « bientôt disponible ».
 */
export function ExportSheet({
  isOpen,
  onClose,
  weekNumber,
  days,
  workout,
  onPrint,
  pageCount = 2,
}: ExportSheetProps) {
  const sessionCount = useMemo(
    () => days.reduce((total, day) => total + day.workouts.length, 0),
    [days],
  )

  const rows = useMemo(
    () => buildExportRows({ weekNumber, sessionCount, workout, pageCount }),
    [weekNumber, sessionCount, workout, pageCount],
  )

  const actions: Record<ExportFormat, () => void> = {
    '.FIT': () => undefined,
    '.ZWO': () => {
      if (!workout) return
      const xml = buildZwo(workout)
      if (xml) downloadZwo(zwoFileName(workout), xml)
    },
    '.ICS': () => downloadIcs(icsWeekFileName(weekNumber), buildIcs(days)),
    '.PDF': onPrint,
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      variant="cover"
      title={EXPORT_SHEET_TITLE}
      trail={exportTrail(weekNumber)}
      closeLabel="Fermer la feuille d’export"
    >
      <div className={styles.head}>
        {/* Le canevas écrit « Exporter » d'un seul tenant : une seule ligne, mais le même
            composant que les titres coupés — jamais de `<br />` dans un titre. */}
        <StackedTitle className={styles.title} lines={[EXPORT_SHEET_TITLE]} />
        <p className={styles.promise}>{EXPORT_SHEET_PROMISE}</p>
      </div>

      {/* 20 l. 2709 : une bande d'encre pleine largeur de 14 px sépare la promesse des formats. */}
      <div className={styles.frieze} aria-hidden="true" />

      <div className={styles.cards}>
        {rows.map((row) => (
          <FormatCard key={row.format} row={row} onPick={actions[row.format]} />
        ))}
      </div>

      <div className={styles.footnotes}>
        {EXPORT_FOOTNOTES.map((note) => (
          <div key={note.format}>
            <span className={styles.footnoteFormat}>{note.format}</span> · {note.text}
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}

function FormatCard({ row, onPick }: { row: ExportRow; onPick: () => void }) {
  const inert = row.unavailableReason !== null
  return (
    <button
      type="button"
      className={row.featured ? `${styles.card} ${styles.cardFeatured}` : styles.card}
      onClick={inert ? undefined : onPick}
      disabled={inert}
      title={row.unavailableReason ?? undefined}
    >
      <span className={styles.cardTop}>
        <span className={styles.cardFormat}>{row.format}</span>
        <span className={styles.cardAside}>{row.aside}</span>
      </span>
      <span className={styles.cardTitle}>{row.title}</span>
      <span className={styles.cardDetail}>{row.detail}</span>
    </button>
  )
}
