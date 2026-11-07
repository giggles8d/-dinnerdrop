import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildFamilyRecipes, describeDinnerFromPhotos, splitDescriptions } from '@/lib/family-recipes'
import type { ClaudeImage } from '@/lib/claude'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * POST { text?: string, images?: [{ base64, mediaType }] } — the family's own dinners, described in their words
 * (typed or spoken) and/or shown in photos, written up as recipes for a preview. Nothing is saved here.
 */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { text?: unknown; images?: unknown }

  const lines = splitDescriptions(String(body.text ?? '').slice(0, 4000))
  const images: ClaudeImage[] = (Array.isArray(body.images) ? body.images : [])
    .filter((i): i is ClaudeImage => !!i && typeof i === 'object' && typeof (i as ClaudeImage).base64 === 'string' && TYPES.includes((i as ClaudeImage).mediaType))
    .filter((i) => i.base64.length < 3_000_000)
    .slice(0, 4)
  if (!lines.length && !images.length) return NextResponse.json({ error: 'Tell us at least one dinner, or add a photo.' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('family_size, dietary_needs, full_name').eq('id', user.id).single()
  const servings = Number(profile?.family_size) > 0 ? Number(profile?.family_size) : 4
  try {
    const fromPhotos = images.length ? await describeDinnerFromPhotos(images, lines.length === 1 ? lines[0] : '') : []
    // A single typed line with photos is the caption for the photos, not a separate dinner.
    const descriptions = images.length && lines.length === 1 && fromPhotos.length ? fromPhotos : [...lines, ...fromPhotos]
    if (!descriptions.length) return NextResponse.json({ error: "We couldn't find a dinner in that photo. Try typing it instead." }, { status: 422 })
    const meals = await buildFamilyRecipes(descriptions, { servings, dietary: Array.isArray(profile?.dietary_needs) ? profile!.dietary_needs : [] })
    if (!meals.length) return NextResponse.json({ error: "We couldn't turn that into a dinner. Try saying what's in it, like \"kielbasa and pierogies with onions\"." }, { status: 422 })
    return NextResponse.json({ meals })
  } catch (e) {
    console.error('[family-recipes/preview]', e)
    return NextResponse.json({ error: 'Something went wrong writing that up. Please try again.' }, { status: 500 })
  }
}
