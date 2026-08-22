import { describeIcsFile } from '../../domain/exports/exportSheet'
import { firstEventBlock } from '../../domain/exports/icsFile'
import styles from './IcsPreview.module.css'

/**
 * Deux propriétés portent ce que l'athlète LIT dans son agenda ; les autres sont l'enveloppe.
 * C'est la distinction que l'artboard 24 fait à l'encre : le contenu en `#EFEDE6`, la mécanique
 * en `#BDBBB2`.
 */
const CONTENT_PROPERTIES = new Set(['SUMMARY', 'DESCRIPTION'])

interface IcsLine {
  key: string
  name: string | null
  value: string
  content: boolean
}

/**
 * Découpe le bloc en lignes physiques telles que le fichier les porte, pliage compris. Une ligne
 * de continuation (celles qui commencent par une espace, RFC 5545 §3.1) hérite du ton de la
 * propriété qu'elle poursuit — sinon la description se lirait par morceaux.
 */
function splitIcsBlock(block: string): IcsLine[] {
  let inContent = false

  return block.split('\n').map((raw, index) => {
    if (raw.startsWith(' ')) {
      return { key: `line-${index}`, name: null, value: raw, content: inContent }
    }
    const separator = raw.indexOf(':')
    if (separator === -1) {
      inContent = false
      return { key: `line-${index}`, name: null, value: raw, content: false }
    }
    const name = raw.slice(0, separator + 1)
    inContent = CONTENT_PROPERTIES.has(name.split(';')[0].slice(0, -1))
    return { key: `line-${index}`, name, value: raw.slice(separator + 1), content: inContent }
  })
}

export interface IcsPreviewProps {
  /** Le fichier entier, tel que `buildIcs` l'écrit. */
  ics: string
  fileName: string
  eventCount: number
}

/**
 * Artboard 24 · Contenu du fichier .ICS — « ce que l'agenda reçoit exactement — un événement par
 * séance ».
 *
 * C'est une PREUVE, pas un écran de produit : elle donne à lire, à l'octet près, ce que
 * `buildIcs` a écrit, et se mesure contre l'artboard. Aucun artboard ne montre cette vue à
 * l'intérieur de l'application — elle n'est donc montée que par l'atelier d'aperçu, en
 * développement.
 */
export function IcsPreview({ ics, fileName, eventCount }: IcsPreviewProps) {
  const lines = splitIcsBlock(firstEventBlock(ics))

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.fileName}>{fileName}</span>
        <span className={styles.size}>{describeIcsFile(ics, eventCount)}</span>
      </div>

      <pre className={styles.body}>
        {lines.map((line) => (
          <span key={line.key} className={styles.line}>
            {line.name}
            <span className={line.content ? styles.content : undefined}>{line.value}</span>
            {'\n'}
          </span>
        ))}
      </pre>

      <div className={styles.foot}>
        Aucun VALARM : l’app ne pose pas de rappel. Aucun UID lié à un compte. Un jour à deux
        séances produit deux événements distincts, jamais un seul bloc.
      </div>
    </div>
  )
}
