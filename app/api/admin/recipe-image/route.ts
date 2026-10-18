import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAIL = 'setzl1979@gmail.com'

async function authorized(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  // Image pipeline token (app_kv.recipe_image_token, generated in the database; used by the scheduled photo task).
  const imgToken = request.headers.get('x-image-token')
  if (imgToken && imgToken.length >= 32) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
    if (data?.value && (data.value as { token?: string }).token === imgToken) return true
  }
  try {
    const sb = createServerSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()
    return user?.email?.toLowerCase() === ADMIN_EMAIL
  } catch { return false }
}

/**
 * GET  — recipes with no DinnerDrop-owned photo yet (name + id), oldest-most-planned first.
 * POST { recipeId, imageUrl } — downloads the generated image, stores it in the
 * public `recipe-images` bucket, and points the recipe at it. Also POST { recipeId, dataUrl }.
 * Used by the image pipeline (Cowork + OpenArt), so every family's menu shares one photo per dinner.
 */
export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 40), 200)
  const { data } = await admin
    .from('recipes')
    .select('id, name, cuisine, protein, tags, image_url, image_credit, times_planned')
    .or('image_url.is.null,image_credit.neq.DinnerDrop')
    .order('times_planned', { ascending: false })
    .limit(limit)
  return NextResponse.json({ recipes: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const recipeId = String(body.recipeId ?? '')
  if (!/^[0-9a-f-]{36}$/.test(recipeId)) return NextResponse.json({ error: 'recipeId required' }, { status: 400 })

  let bytes: ArrayBuffer
  let contentType = 'image/jpeg'
  if (typeof body.dataUrl === 'string' && body.dataUrl.startsWith('data:image/')) {
    const m = body.dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/)
    if (!m) return NextResponse.json({ error: 'bad dataUrl' }, { status: 400 })
    contentType = m[1]; bytes = Buffer.from(m[2], 'base64').buffer as ArrayBuffer
  } else if (typeof body.imageUrl === 'string' && /^https?:\/\//.test(body.imageUrl)) {
    const res = await fetch(body.imageUrl, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return NextResponse.json({ error: `download ${res.status}` }, { status: 502 })
    contentType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
    bytes = await res.arrayBuffer()
  } else {
    return NextResponse.json({ error: 'imageUrl or dataUrl required' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const path = `${recipeId}.${ext}`
  const { error } = await admin.storage.from('recipe-images').upload(path, Buffer.from(bytes), { contentType, upsert: true, cacheControl: '31536000' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: pub } = admin.storage.from('recipe-images').getPublicUrl(path)
  const url = `${pub.publicUrl}?v=${Date.now()}`
  await admin.from('recipes').update({ image_url: url, image_credit: 'DinnerDrop', updated_at: new Date().toISOString() }).eq('id', recipeId)
  // Plans and favorites that already carry this dinner pick up the photo too.
  return NextResponse.json({ ok: true, url })
}
