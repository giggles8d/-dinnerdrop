import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import RecipeClient, { type RecipeRow } from './RecipeClient'
import { recipeIntro } from '@/lib/recipe-intro'

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
    openGraph: { title: r.name, description, url, siteName: 'DinnerDrop', type: 'article', images: [r.image_url ? { url: r.image_url, alt: r.name } : { url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop' }] },
    twitter: { card: 'summary_large_image', title: r.name, description, images: [r.image_url || '/og-image.png'] },
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
    // Google requires an image for Recipe rich results; recipes still waiting on their nightly photo use the site image.
    image: [r.image_url || 'https://www.dinnerdrop.app/og-image.png'],
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
    recipeIngredient: (r.ingredients ?? []).map((i) => `${i.quantity ?? ''} ${i.unit ?? ''} ${i.name}`.replace(/\s+/g, ' ').trim()),
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
    </>
  )
}
