import { createClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/** Photo hosts we store dinner photos on; anything else is not fetched. */
function allowedHost(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const ours = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname
    return [ours, 'images.unsplash.com', 'raw.githubusercontent.com'].includes(u.hostname)
  } catch { return false }
}

/**
 * GET /api/sms/dinner-image/<planId>/<n> — dinner n (1-based) of a saved week as a JPEG: the picture texted with the
 * TONIGHT reply (Nov 9 2026: "I don't need the cooking instructions, just the image"). Picture messages want JPEG and
 * library photos are WebP, so the photo is converted here. The plan id is an unguessable UUID; the response is only
 * that dinner's own photo.
 */
export async function GET(_req: Request, { params }: { params: { planId: string; n: string } }) {
  const n = Number(params.n)
  if (!/^[0-9a-f-]{36}$/i.test(params.planId) || !Number.isInteger(n) || n < 1 || n > 14) return new Response('Not found', { status: 404 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
  const { data } = await admin.from('meal_plans').select('meals').eq('id', params.planId).maybeSingle()
  const meal = ((data?.meals as Meal[] | null) ?? [])[n - 1]
  if (!meal) return new Response('Not found', { status: 404 })
  let url = meal.imageUrl ?? ''
  // Planned before its library photo existed: borrow the recipe library's photo by name.
  if (!url) {
    const { data: lib } = await admin.from('recipes').select('image_url').eq('name', meal.name).not('image_url', 'is', null).limit(1)
    url = (lib?.[0]?.image_url as string | undefined) ?? ''
  }
  if (!url || !allowedHost(url)) return new Response('Not found', { status: 404 })
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(String(res.status))
    const sharp = (await import('sharp')).default
    const buf = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer()
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
