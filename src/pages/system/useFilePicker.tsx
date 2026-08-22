import { useRef } from 'react'
import styles from './useFilePicker.module.css'

/**
 * Le sélecteur de fichier natif, caché, plus la commande qui l'ouvre.
 *
 * Il vit dans son propre module parce que l'artboard 19 est le seul du canevas à dessiner une
 * commande de sélection de fichier — « Choisir un autre fichier » — et que le point d'entrée de
 * l'import, lui, n'est dessiné nulle part. Le jour où il le sera, il n'aura qu'à appeler ce hook.
 */
export function useFilePicker(onFile: (file: File) => void) {
  const inputRef = useRef<HTMLInputElement>(null)

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="application/json,.json"
      className={styles.hiddenInput}
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        const file = event.target.files?.[0]
        // Le champ est remis à zéro : rechoisir DEUX FOIS le même fichier doit relancer l'import.
        event.target.value = ''
        if (file) onFile(file)
      }}
    />
  )

  return { input, open: () => inputRef.current?.click() }
}
