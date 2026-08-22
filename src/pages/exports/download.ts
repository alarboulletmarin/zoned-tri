/**
 * Écriture d'un fichier sur l'appareil — la promesse de l'artboard 20 : « Le fichier est écrit
 * sur l'appareil. Rien ne part sur un serveur, aucun compte n'est créé. »
 *
 * Rien de plus qu'un `Blob` et une ancre : aucune requête, aucune bibliothèque. C'est la seule
 * couche du dossier qui touche au DOM — le contenu des fichiers, lui, vit dans `src/domain/exports`.
 */

function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Le `charset=utf-8` n'est pas décoratif : sans lui, un « é » de description arrive cassé. */
export function downloadText(filename: string, text: string, mimeType: string): void {
  saveBlob(filename, new Blob([text], { type: `${mimeType};charset=utf-8` }))
}

export function downloadIcs(filename: string, text: string): void {
  downloadText(filename, text, 'text/calendar')
}

export function downloadZwo(filename: string, text: string): void {
  downloadText(filename, text, 'application/xml')
}

/**
 * `HTMLCanvasElement.toBlob` est asynchrone : c'est lui qui encode le PNG, et il faut l'attendre
 * avant d'écrire. `null` quand le navigateur refuse d'encoder — l'appelant le dit, il ne se tait pas.
 */
export async function downloadCanvasPng(filename: string, canvas: HTMLCanvasElement): Promise<boolean> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return false
  saveBlob(filename, blob)
  return true
}
