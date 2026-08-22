import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Garde-fou de source — la seule façon de faire tenir une règle qui porte sur TOUT le produit.
 *
 * Deux interdits, tous deux nés du même constat : le produit s'interdisait « un bouton mort sans
 * explication » et tenait la règle dans un attribut `title`, qu'un doigt ne survole jamais. Sur
 * téléphone — l'appareil que ce produit vise — trente-quatre explications n'existaient donc pas.
 *
 * 1. **« Bientôt disponible » est une promesse, pas un motif.** Elle ne dit ni ce qui manque, ni
 *    pourquoi, ni ce qu'on peut faire en attendant. Elle est bannie du produit.
 * 2. **Un `title` n'est pas un motif.** Une commande inerte porte son `aria-describedby` vers un
 *    `InertNote` rendu à l'écran. Les `title` qui restent servent autre chose (une infobulle sur
 *    une commande ACTIVE, une mention d'état), et le test ne les touche pas.
 */

const ROOTS = ['src/pages', 'src/components']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return []
    return [path]
  })
}

const FILES = ROOTS.flatMap((root) => sourceFiles(root))

interface Hit {
  file: string
  line: number
  text: string
}

function scan(matches: (line: string) => boolean): Hit[] {
  const hits: Hit[] = []
  for (const file of FILES) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, index) => {
        if (matches(text)) hits.push({ file, line: index + 1, text: text.trim() })
      })
  }
  return hits
}

function report(hits: Hit[]): string {
  return hits.map((hit) => `  ${hit.file}:${hit.line}  ${hit.text.slice(0, 110)}`).join('\n')
}

describe('motifs des commandes inertes', () => {
  it('ne promet jamais « bientôt disponible »', () => {
    // Les commentaires — de bloc comme JSX — parlent de la règle : ils ne la violent pas.
    const hits = scan(
      (line) =>
        /bientôt disponible/i.test(line) &&
        !line.trimStart().startsWith('*') &&
        !line.trimStart().startsWith('//') &&
        !line.includes('{/*'),
    )
    expect(
      hits.length,
      `« Bientôt disponible » est une promesse, pas un motif : dire ce qui manque, ou retirer la commande.\n${report(hits)}`,
    ).toBe(0)
  })

  /**
   * Le motif ne peut pas vivre dans un `title` sur une commande désactivée : c'est précisément la
   * combinaison que personne ne peut lire au doigt. Sur la même ligne ou sur la suivante — les
   * deux façons de l'écrire en JSX.
   */
  it('ne cache jamais le motif d’une commande désactivée dans un title', () => {
    const hits: Hit[] = []
    for (const file of FILES) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((text, index) => {
        const window = lines.slice(Math.max(0, index - 3), index + 4).join(' ')
        const isProp = /\bdisabled\b(?!:)/.test(text) && !text.trimStart().startsWith('*')
        if (!isProp) return
        if (!/\stitle=/.test(window)) return
        // `title` posé sur la branche ACTIVE d'un ternaire (`disabled={x} title={x ? undefined : …}`)
        // reste un `title` sur une commande désactivée : c'est le cas qu'on chasse.
        hits.push({ file, line: index + 1, text: text.trim() })
      })
    }
    expect(
      hits.length,
      `Le motif d'une commande inerte se rend à l'écran (composant InertNote + aria-describedby), jamais dans un title : au doigt, un title n'existe pas.\n${report(hits)}`,
    ).toBe(0)
  })
})
