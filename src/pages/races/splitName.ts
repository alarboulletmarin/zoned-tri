/**
 * « 70.3 Vichy » se casse après le premier mot, comme les artboards 08 et S7 l'écrivent :
 * « 70.3 <br> Vichy ». Un nom d'un seul mot reste sur une ligne.
 */
export function splitName(name: string): [string, string | null] {
  const index = name.indexOf(' ')
  if (index === -1) return [name, null]
  return [name.slice(0, index), name.slice(index + 1)]
}
