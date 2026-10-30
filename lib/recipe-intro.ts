import type { Meal } from '@/types'
import { COLLECTIONS } from '@/lib/collections'
import { proteinGroup, cuisineGroup, PROTEINS, CUISINES } from '@/lib/recipe-filters'
import { cookware, safeBite } from '@/lib/meal-insights'

type Lite = Pick<Meal, 'name' | 'ingredients' | 'steps' | 'tags' | 'servings' | 'estimatedCost' | 'prepTime' | 'cookTime' | 'safeBite'> & { cuisine?: string | null; protein?: string | null }

/** Two or three plain sentences about a dinner, built from its own data (no AI) — gives the page real text for readers and search. */
export function recipeIntro(m: Lite): string {
  const mins = (m.prepTime ?? 0) + (m.cookTime ?? 0)
  const cuisine = m.cuisine && !/^(other|american)$/i.test(m.cuisine) ? m.cuisine : ''
  const cw = cookware(m)
  const sentences: string[] = []
  sentences.push(
    `${m.name} is a ${cuisine ? cuisine + ' ' : ''}weeknight dinner that serves ${m.servings || 4}` +
    (mins ? ` and is on the table in about ${mins} minutes` : '') +
    (m.estimatedCost > 0 ? `, for around $${m.estimatedCost.toFixed(0)} in groceries` : '') + '.'
  )
  if (cw.label) sentences.push(`You'll need ${cw.label.toLowerCase()}, and the ${m.ingredients.length} ingredients below are everyday supermarket items.`)
  const bite = safeBite(m)
  if (bite) sentences.push(`Cooking for a picky eater? The ${bite.toLowerCase()} can be served plain on its own.`)
  sentences.push('Add it to your week and the whole grocery list lands in your Instacart cart in one tap.')
  return sentences.join(' ')
}

/** Internal links a reader (and a crawler) can follow from this recipe. */
export function relatedLinks(m: Lite): Array<{ href: string; label: string }> {
  const out: Array<{ href: string; label: string }> = []
  for (const c of COLLECTIONS) if (c.match({ name: m.name, tags: m.tags ?? [], cuisine: m.cuisine ?? undefined })) out.push({ href: `/recipes/collections/${c.slug}`, label: `${c.name} dinners` })
  const pg = proteinGroup(m.protein, m.tags ?? [])
  const pl = PROTEINS.find((p) => p.v === pg)?.l.replace(/^[^A-Za-z]+/, '')
  if (pl) out.push({ href: `/recipes?p=${pg}`, label: `More ${pl.toLowerCase()} dinners` })
  const cg = cuisineGroup(m.cuisine)
  const cl = CUISINES.find((c) => c.v === cg)?.l
  if (cl && cg !== 'other') out.push({ href: `/recipes?c=${cg}`, label: `More ${cl} dinners` })
  const mins = (m.prepTime ?? 0) + (m.cookTime ?? 0)
  if (mins && mins <= 30) out.push({ href: '/dinners/dinners-under-30-minutes', label: 'Dinners under 30 minutes' })
  if (safeBite(m)) out.push({ href: '/dinners/picky-eater-dinners', label: 'Picky-eater dinners' })
  out.push({ href: '/cookware', label: 'Kitchen essentials we use' })
  return out.slice(0, 6)
}
