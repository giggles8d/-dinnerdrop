import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAIL = 'setzl1979@gmail.com'

/**
 * One-off photo diet (Sarah, Oct 29 2026): our stored recipe photos are ~1 MB JPEGs, which is why
 * cards leaned on Vercel's image resizer (and showed broken images when it failed). This re-saves
 * each as a 900px-wide WebP (~60–100 KB) next to the original (`<id>.webp`; the `<id>.jpg` original
 * stays in storage) and points the recipe at it. Admin session only. GET ?limit=30 per call; returns
 * how many are left, so it can be called until `remaining` is 0. Safe to re-run.
 */
export async function GET(request: NextRequest) {
  try {
    const sb = createServerSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user?.email?.toLowerCase() !== ADMIN_EMAIL) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') ?? 30), 1), 60)
  const pattern = '%/storage/v1/object/public/recipe-images/%'
  const { data: rows } = await admin.from('recipes').select('id, image_url')
    .like('image_url', pattern).not('image_url', 'like', '%.webp%').limit(limit)

  const started = Date.now()
  const results: Array<{ id: string; before: number; after: number } | { id: string; error: string }> = []
  for (const r of rows ?? []) {
    if (Date.now() - started > 48000) break
    try {
      const res = await fetch(r.image_url as string, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`download ${res.status}`)
      const input = Buffer.from(await res.arrayBuffer())
      const out = await sharp(input).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer()
      const path = `${r.id}.webp`
      const { error } = await admin.storage.from('recipe-images').upload(path, out, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' })
      if (error) throw new Error(error.message)
      const { data: pub } = admin.storage.from('recipe-images').getPublicUrl(path)
      await admin.from('recipes').update({ image_url: `${pub.publicUrl}?v=${Date.now()}` }).eq('id', r.id)
      results.push({ id: r.id, before: input.length, after: out.length })
    } catch (e) {
      results.push({ id: r.id, error: e instanceof Error ? e.message : String(e) })
    }
  }

  const { count: remaining } = await admin.from('recipes').select('id', { count: 'exact', head: true })
    .like('image_url', pattern).not('image_url', 'like', '%.webp%')
  const ok = results.filter((x): x is { id: string; before: number; after: number } => 'before' in x)
  return NextResponse.json({
    processed: ok.length,
    errors: results.filter((x) => 'error' in x),
    kbBefore: Math.round(ok.reduce((s, x) => s + x.before, 0) / 1024),
    kbAfter: Math.round(ok.reduce((s, x) => s + x.after, 0) / 1024),
    remaining,
  })
}
