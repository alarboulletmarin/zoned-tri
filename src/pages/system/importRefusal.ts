import type { ValidationError } from '../../storage/validation'

/**
 * Le refus d'import, tel que l'artboard 19 a besoin de le lire : le fichier qu'on lui a soumis, et
 * ce que `validateBackupFile` lui a répondu. Rien de plus — l'écran dérive tout le reste de la base.
 *
 * C'est aussi le contrat que le futur point d'entrée de l'import devra transporter :
 * `navigate(IMPORT_PATH, { state: refusal })`.
 */
export interface ImportRefusal {
  fileName: string
  /** Taille en octets, telle que le `File` la donne. */
  fileSizeBytes: number
  errors: ValidationError[]
}

export function isImportRefusal(value: unknown): value is ImportRefusal {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ImportRefusal>
  return (
    typeof candidate.fileName === 'string' &&
    typeof candidate.fileSizeBytes === 'number' &&
    Array.isArray(candidate.errors)
  )
}

/** `JSON.parse` a refusé le fichier : il n'y a pas de champ fautif, seulement un fichier illisible. */
export function parseFailure(cause: unknown): ValidationError {
  const detail = cause instanceof Error ? cause.message : String(cause)
  return { path: '$', expectedType: 'objet JSON', receivedValue: detail, message: detail }
}
