import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import RecipeClient, { type RecipeRow } from './RecipeClient'

// Server-rendered recipe page: title, description, photo and Recipe JSON-LD in the first HTML.
export const revalidate = 600

async function getRecipe(slug: string): Promise<RecipeRow | null> {
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.from('recipes').select('*').eq('slug', slug).maybeSingle()
    return (data as RecipeRow) ?? null
  } catch { return null }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const r = await getRecipe(params.slug)
  if (!r) return { title: 'Recipe not found — DinnerDrop' }
  const mins = (r.cook_time ?? 0) + (r.prep_time ?? 0)
  const cost = Number(r.estimated_cost ?? 0)
  const description = `${r.name}: ${mins ? `${mins} minutes` : 'weeknight dinner'}, serves ${r.servings ?? 4}${cost > 0 ? `, about $${cost.toFixed(0)}` : ''}. Ingredients, steps, and a grocery list that lands in your Instacart cart in one tap.`
  const url = `https://www.dinnerdrop.app/recipes/${r.slug}`
  return {
    title: `${r.name} — Family Dinner Recipe | DinnerDrop`,
    description,
    alternates: { canonical: url },
    openGraph: { title: r.name, description, url, images: r.image_url ? [{ url: r.image_url }] : undefined },
  }
}

export default async function LibraryRecipePage({ params }: { params: { slug: string } }) {
  const r = await getRecipe(params.slug)
  if (!r) notFound()
  const mins = (r.cook_time ?? 0) + (r.prep_time ?? 0)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.name,
    image: r.image_url ? [r.image_url] : undefined,
    author: { '@type': 'Organization', name: 'DinnerDrop' },
    recipeYield: `${r.servings ?? 4} servings`,
    prepTime: r.prep_time ? `PT${r.prep_time}M` : undefined,
    cookTime: r.cook_time ? `PT${r.cook_time}M` : undefined,
    totalTime: mins ? `PT${mins}M` : undefined,
    recipeCuisine: r.cuisine ?? undefined,
    keywords: (r.tags ?? []).join(', ') || undefined,
    recipeIngredient: (r.ingredients ?? []).map((i) => `${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.replace(/\s+/g, ' ').trim()),
    recipeInstructions: (r.steps ?? []).map((s) => ({ '@type': 'HowToStep', text: s })),
    nutrition: r.nutrition ? { '@type': 'NutritionInformation', calories: `${r.nutrition.calories} calories`, proteinContent: `${r.nutrition.protein} g` } : undefined,
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecipeClient initial={r} />
    </>
  )
}
