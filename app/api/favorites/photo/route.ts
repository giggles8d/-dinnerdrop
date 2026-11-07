import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/** POST { id, dataUrl } — the family's own photo for one of their saved favorites (JPEG/PNG/WebP, shrunk in the browser). */
export async function POST(req: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { id?: string; dataUrl?: string }
  const m = String(b.dataUrl ?? '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!m) return NextResponse.json({ error: 'That photo couldn\'t be read. Try a JPEG or PNG.' }, { status: 400 })
  const bytes = Buffer.from(m[2], 'base64')
  if (bytes.length > 4 * 1024 * 1024) return NextResponse.json({ error: 'That photo is too big.' }, { status: 413 })
  const { data: row } = await supabase.from('favorites').select('id, meal_data').eq('id', String(b.id ?? '')).eq('user_id', user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'That favorite wasn\'t found.' }, { status: 404 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg'
  const path = `fav-${row.id}.${ext}`
  const { error } = await admin.storage.from('recipe-images').upload(path, bytes, { contentType: m[1], upsert: true, cacheControl: '31536000' })
  if (error) return NextResponse.json({ error: 'Could not save the photo.' }, { status: 500 })
  const url = `${admin.storage.from('recipe-images').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
  const meal = { ...(row.meal_data as object), imageUrl: url, ownPhoto: true }
  await supabase.from('favorites').update({ meal_data: meal }).eq('id', row.id)
  return NextResponse.json({ ok: true, url, meal })
}
