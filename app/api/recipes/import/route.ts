import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateWithClaude, generateWithClaudeImage, parseClaudeJSON } from '@/lib/claude'
import { upsertRecipes } from '@/lib/recipe-library'
import type { Meal } from '@/types'

export const maxDuration = 60

/**
 * Add your own recipe. POST one of:
 *   { url }    — a recipe page; we read it (JSON-LD Recipe schema when present) and structure it
 *   { text }   — pasted recipe text, a photo's caption, grandma's index card typed out
 *   { image }  — data URL of a photo (jpeg/png/webp) of a recipe card or cookbook page
 * The recipe is saved to the family's library (private) and to favorites so the
 * planner can rotate it in.
 */

const SCHEMA = `Return ONLY valid JSON, no markdown:
{
  "name": "string",
  "cuisine": "Italian",
  "protein": "chicken",
  "cookTime": 25,
  "prepTime": 10,
  "servings": 4,
  "estimatedCost": 18.5,
  "tags": ["quick"],
  "ingredients": [{ "name": "string", "quantity": "1 1/2", "unit": "lb", "category": "Meat & Seafood", "searchTerm": "chicken breast" }],
  "steps": ["Step 1", "Step 2"]
}
category must be one of: Produce, Meat & Seafood, Dairy & Eggs, Pantry & Dry Goods, Frozen, Bakery, Beverages.
Quantities must be shoppable (what you'd buy), singular units ("lb", "cup", "clove"). If servings differ from ${'{servings}'}, scale the ingredient quantities to ${'{servings}'} servings and set servings accordingly.`

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|li|h\d|div|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
}

function findRecipeJsonLd(html: string): unknown | null {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []
  for (const b of blocks) {
    const inner = b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')
    try {
      const json = JSON.parse(inner)
      const nodes: unknown[] = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json]
      for (const n of nodes) {
        const t = (n as { '@type'?: string | string[] })['@type']
        if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return n
      }
    } catch { /* ignore */ }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const auth = createServerSupabaseClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json().catch(() => ({}))

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: profile } = await admin.from('profiles').select('family_size, dietary_needs').eq('id', user.id).single()
    const servings = Number(profile?.family_size) > 0 ? Number(profile?.family_size) : 4
    const schema = SCHEMA.replace(/\{servings\}/g, String(servings))

    let text = ''
    let sourceNote = ''
    if (typeof body.url === 'string' && /^https?:\/\//i.test(body.url)) {
      const res = await fetch(body.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinnerDropBot/1.0; +https://www.dinnerdrop.app)' }, redirect: 'follow' })
      if (!res.ok) return NextResponse.json({ error: `Couldn't open that page (${res.status}).` }, { status: 400 })
      const html = await res.text()
      const ld = findRecipeJsonLd(html)
      text = ld ? `Recipe structured data:\n${JSON.stringify(ld).slice(0, 12000)}` : stripHtml(html).slice(0, 14000)
      sourceNote = `Source: ${body.url}`
    } else if (typeof body.text === 'string' && body.text.trim().length > 10) {
      text = body.text.trim().slice(0, 14000)
    } else if (typeof body.image === 'string' && body.image.startsWith('data:image/')) {
      const m = body.image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/)
      if (!m) return NextResponse.json({ error: 'Unsupported image. Use a JPG, PNG or WebP photo.' }, { status: 400 })
      const raw = await generateWithClaudeImage(
        `This photo shows a recipe (card, cookbook page, screenshot or handwritten note). Read it carefully and write it as a complete weeknight dinner recipe for ${servings} people. Fill in anything missing with sensible defaults and keep the dish faithful to the photo.\n${schema}`,
        { base64: m[2], mediaType: m[1] as 'image/jpeg' },
      )
      return await finish(admin, user.id, raw, profile?.dietary_needs ?? [], 'photo')
    } else {
      return NextResponse.json({ error: 'Give me a link, pasted text, or a photo.' }, { status: 400 })
    }

    const raw = await generateWithClaude(
      `Turn this into a complete weeknight dinner recipe for ${servings} people. Keep the dish and its name faithful to the source; if the source is a page with several recipes, use the main one. ${sourceNote}\n\n${text}\n\n${schema}`,
      3000,
    )
    return await finish(admin, user.id, raw, profile?.dietary_needs ?? [], sourceNote ? 'url' : 'text')
  } catch (e) {
    console.error('[recipes/import]', e)
    return NextResponse.json({ error: 'Could not read that recipe. Try pasting the text instead.' }, { status: 500 })
  }
}

async function finish(admin: SupabaseClient, userId: string, raw: string, dietary: string[], via: string) {
  let meal: Meal
  try {
    const parsed = parseClaudeJSON<Partial<Meal>>(raw)
    if (!parsed.name || !Array.isArray(parsed.ingredients) || !Array.isArray(parsed.steps)) throw new Error('incomplete')
    meal = {
      day: 'Saved',
      name: parsed.name,
      cuisine: parsed.cuisine,
      protein: parsed.protein,
      cookTime: Number(parsed.cookTime) || 30,
      prepTime: Number(parsed.prepTime) || 10,
      servings: Number(parsed.servings) || 4,
      estimatedCost: Number(parsed.estimatedCost) || 0,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 4) : [],
      ingredients: parsed.ingredients,
      steps: parsed.steps,
    }
  } catch {
    return NextResponse.json({ error: 'That didn\'t look like a recipe. Try a clearer photo or paste the text.' }, { status: 422 })
  }
  // Private library row + favorite (so it rotates into plans).
  const [stored] = await upsertRecipes(admin, [meal], { userId, dietary, source: 'user' })
  const saved = stored ?? meal
  const { data: existingFav } = await admin.from('favorites').select('id').eq('user_id', userId).eq('meal_name', saved.name).limit(1)
  if (!existingFav?.length) await admin.from('favorites').insert({ user_id: userId, meal_name: saved.name, meal_data: saved })
  return NextResponse.json({ meal: saved, via })
}
