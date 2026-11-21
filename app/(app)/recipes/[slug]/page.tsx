import type { Metadata } from 'next'
import { formatQuantity } from '@/lib/format-qty'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { retryFetch } from '@/lib/retry-fetch'
import RecipeClient, { type RecipeRow } from './RecipeClient'
import { recipeIntro } from '@/lib/recipe-intro'
import Link from 'next/link'

// Server-rendered recipe page: title, description, photo and Recipe JSON-LD in the first HTML.
export const revalidate = 600

async function getRecipe(slug: string): Promise<RecipeRow | null> {
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: retryFetch } })
    const { data } = await admin.from('recipes').select('*').eq('slug', slug).maybeSingle()
    return (data as RecipeRow) ?? null
  } catch { return null }
}

/** Six other recipes like this one (same protein, else same cuisine), most-kept first — so recipe pages aren't dead ends (Nov 21 2026 review). */
async function getSimilar(r: RecipeRow): Promise<Array<{ slug: string; name: string; image_url: string | null; mins: number }>> {
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: retryFetch } })
    const pick = async (col: 'protein' | 'cuisine', val: string | null) => {
      if (!val) return []
      const { data } = await admin.from('recipes').select('slug, name, image_url, prep_time, cook_time').eq(col, val).neq('slug', r.slug).not('slug', 'is', null).not('is_public', 'is', false).order('kept_count', { ascending: false, nullsFirst: false }).limit(6)
      return (data ?? []) as Array<{ slug: string; name: string; image_url: string | null; prep_time: number | null; cook_time: number | null }>
    }
    let rows = await pick('protein', r.protein)
    if (rows.length < 6) rows = [...rows, ...(await pick('cuisine', r.cuisine)).filter((x) => !rows.some((y) => y.slug === x.slug))].slice(0, 6)
    return rows.map((x) => ({ slug: x.slug, name: x.name, image_url: x.image_url, mins: (x.prep_time ?? 0) + (x.cook_time ?? 0) }))
  } catch { return [] }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const r = await getRecipe(params.slug)
  if (!r) return { title: 'Recipe not found — DinnerDrop' }
  const mins = (r.cook_time ?? 0) + (r.prep_time ?? 0)
  const cost = Number(r.estimated_cost ?? 0)
  const description = `${r.name}: ${mins ? `${mins} minutes` : 'weeknight dinner'}, serves ${r.servings ?? 4}${cost > 0 ? `, about $${cost.toFixed(0)}` : ''}. Ingredients, steps, and a grocery list that lands in your Instacart cart in one tap.`
  const url = `https://www.dinnerdrop.app/recipes/${r.slug}`
  // Google shows about 60 characters of a title (Nov 8 2026 review: 755 recipe titles ran past that).
  // Longest form that fits: "Name — Family Dinner Recipe | DinnerDrop", then "Name | DinnerDrop", then the name alone.
  const title = [`${r.name} — Family Dinner Recipe | DinnerDrop`, `${r.name} Recipe | DinnerDrop`, `${r.name} | DinnerDrop`].find((t) => t.length <= 60) ?? r.name
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: r.name, description, url, siteName: 'DinnerDrop', type: 'article', images: [r.image_url ? { url: r.image_url, alt: r.name } : { url: '/og-image.png?v=4', width: 1200, height: 630, alt: 'DinnerDrop' }] },
    twitter: { card: 'summary_large_image', title: r.name, description, images: [r.image_url || '/og-image.png?v=4'] },
  }
}

export default async function LibraryRecipePage({ params }: { params: { slug: string } }) {
  const r = await getRecipe(params.slug)
  const similar = r ? await getSimilar(r) : []
  if (!r) notFound()
  const mins = (r.cook_time ?? 0) + (r.prep_time ?? 0)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.name,
    // Google requires an image for Recipe rich results; recipes still waiting on their nightly photo use the site image.
    image: [r.image_url || 'https://www.dinnerdrop.app/og-image.png?v=4'],
    description: recipeIntro({ name: r.name, ingredients: r.ingredients ?? [], steps: r.steps ?? [], tags: r.tags ?? [], servings: r.servings ?? 4, estimatedCost: Number(r.estimated_cost ?? 0), prepTime: r.prep_time ?? 0, cookTime: r.cook_time ?? 0, cuisine: r.cuisine, protein: r.protein }),
    recipeCategory: 'Dinner',
    datePublished: (r as { created_at?: string }).created_at ?? undefined,
    author: { '@type': 'Organization', name: 'DinnerDrop', url: 'https://www.dinnerdrop.app' },
    recipeYield: `${r.servings ?? 4} servings`,
    prepTime: r.prep_time ? `PT${r.prep_time}M` : undefined,
    cookTime: r.cook_time ? `PT${r.cook_time}M` : undefined,
    totalTime: mins ? `PT${mins}M` : undefined,
    recipeCuisine: r.cuisine ?? undefined,
    keywords: (r.tags ?? []).join(', ') || undefined,
    recipeIngredient: (r.ingredients ?? []).map((i) => `${formatQuantity(i.quantity ?? '', i.unit ?? '')} ${i.name}`.replace(/\s+/g, ' ').trim()),
    recipeInstructions: (r.steps ?? []).map((s) => ({ '@type': 'HowToStep', text: s })),
    nutrition: r.nutrition ? {
      '@type': 'NutritionInformation', servingSize: '1 serving', calories: `${r.nutrition.calories} calories`, proteinContent: `${r.nutrition.protein} g`,
      ...(r.nutrition.carbs != null ? { carbohydrateContent: `${r.nutrition.carbs} g` } : {}),
      ...(r.nutrition.fat != null ? { fatContent: `${r.nutrition.fat} g` } : {}),
      ...(r.nutrition.satFat != null ? { saturatedFatContent: `${r.nutrition.satFat} g` } : {}),
      ...(r.nutrition.fiber != null ? { fiberContent: `${r.nutrition.fiber} g` } : {}),
      ...(r.nutrition.sugar != null ? { sugarContent: `${r.nutrition.sugar} g` } : {}),
      ...(r.nutrition.sodium != null ? { sodiumContent: `${r.nutrition.sodium} mg` } : {}),
    } : undefined,
  }
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.dinnerdrop.app/' },
      { '@type': 'ListItem', position: 2, name: 'Recipes', item: 'https://www.dinnerdrop.app/recipes' },
      { '@type': 'ListItem', position: 3, name: r.name, item: `https://www.dinnerdrop.app/recipes/${r.slug}` },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <RecipeClient initial={r} />
      {similar.length > 0 && (
        <section aria-label="More recipes like this" className="container mx-auto px-4 pb-12 max-w-3xl print:hidden">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">You might also like</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {similar.map((x) => (
              <li key={x.slug}>
                <Link href={`/recipes/${x.slug}`} className="block rounded-xl border border-border overflow-hidden hover:border-primary/50 bg-card h-full">
                  {x.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={x.image_url} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover bg-muted" />
                    : <div className="w-full aspect-[4/3] bg-muted" />}
                  <span className="block px-3 py-2 text-sm font-semibold leading-snug text-foreground">{x.name}</span>
                  {x.mins > 0 && <span className="block px-3 pb-2 -mt-1 text-xs text-muted-foreground">{x.mins} min</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
