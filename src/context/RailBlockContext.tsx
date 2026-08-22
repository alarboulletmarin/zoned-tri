import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface RailBlock {
  /** Intitulé mono en capitales (canevas S5 : « Bibliothèque »). */
  title: string
  /** Lignes mono sous l'intitulé (canevas S5 : « 312 séances » / « 37 après filtres »). */
  lines: string[]
  /**
   * Avancement 0-100 rendu en barre de 8 px entre l'intitulé et les lignes — canevas S4 l. 1558,
   * où le bloc du rail porte « Semaine 07 / 18 », la barre du plan, puis « J-77 ». Absent partout
   * ailleurs : le bloc de S5 et S6 ne compte que des séances, il n'y a rien à avancer.
   */
  percent?: number
  /**
   * Encart jaune sous le bloc — canevas S6 l. 1796 : « Rien n'est écrit sans que tu le voies : un
   * déplacement montre d'abord ce que la semaine devient. » Le seul rail du canevas qui en porte
   * un, parce que c'est le seul écran où l'on déplace quelque chose.
   */
  note?: string
}

interface RailBlockStore {
  block: RailBlock | null
  setBlock: (block: RailBlock | null) => void
}

const RailBlockContext = createContext<RailBlockStore | null>(null)

/**
 * Bloc contextuel du rail desktop (canevas S5 lignes 1677-1680, S6 lignes 1791-1795) : le rail
 * appartient à la coquille, le chiffre appartient à l'écran. L'écran le publie ici, la coquille
 * le lit. Hors provider (tests unitaires d'écran), tout est inerte.
 *
 * Anciennement `HeaderCounterContext`, qui poussait le même chiffre dans le bandeau : le canevas
 * le place dans le rail, pas dans la barre de titre, qui ne porte que le titre et les commandes.
 */
export function RailBlockProvider({ children }: { children: ReactNode }) {
  const [block, setBlock] = useState<RailBlock | null>(null)
  const value = useMemo(() => ({ block, setBlock }), [block])
  return <RailBlockContext.Provider value={value}>{children}</RailBlockContext.Provider>
}

export function useRailBlock(): RailBlock | null {
  return useContext(RailBlockContext)?.block ?? null
}

/** Publie le bloc de l'écran courant, et le retire au démontage. */
export function usePublishRailBlock(
  title: string,
  lines: string[] | null,
  percent?: number,
  note?: string,
): void {
  const store = useContext(RailBlockContext)
  const setBlock = store?.setBlock
  // `lines` est un tableau littéral côté appelant : on le stabilise sur son contenu sérialisé,
  // sinon chaque rendu de l'écran republierait et relancerait un rendu de la coquille.
  const serialized = lines === null ? null : JSON.stringify(lines)

  useEffect(() => {
    if (!setBlock) return
    setBlock(
      serialized === null ? null : { title, lines: JSON.parse(serialized) as string[], percent, note },
    )
    return () => setBlock(null)
  }, [setBlock, title, serialized, percent, note])
}
