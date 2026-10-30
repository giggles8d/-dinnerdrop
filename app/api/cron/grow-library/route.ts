import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { growLibrary } from '@/lib/library-grower'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Nightly (vercel.json, 3am ET): add ~20 checked, original recipes to the library,
// aimed at its thinnest areas. Photos are added afterwards by the nightly photo task.
export async function GET(request: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  let ok = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  const token = request.headers.get('x-image-token')
  if (!ok && token && token.length >= 32) {
    const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
    ok = (data?.value as { token?: string } | null)?.token === token
  }
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  // ?seed=1 loads data/recipe-concepts.json into the concept queue (only if the queue is empty), then returns.
  if (sp.get('seed')) {
    const { data: kv } = await admin.from('app_kv').select('value').eq('key', 'recipe_concepts').maybeSingle()
    const pending = (kv?.value as { pending?: string[] } | null)?.pending ?? []
    if (pending.length) return NextResponse.json({ seeded: false, pending: pending.length })
    const file = (await import('@/data/recipe-concepts.json')).default as { concepts: string[] }
    await admin.from('app_kv').upsert({ key: 'recipe_concepts', value: { pending: file.concepts, done: 0, source: 'data/recipe-concepts.json' }, updated_at: new Date().toISOString() })
    return NextResponse.json({ seeded: true, pending: file.concepts.length })
  }
  const report = await growLibrary(admin, {
    batches: Number(sp.get('batches')) || undefined,
    perBatch: Number(sp.get('perBatch')) || undefined,
  })
  await admin.from('app_kv').upsert({ key: 'library_growth_last', value: { at: new Date().toISOString(), saved: report.saved.length, rejected: report.rejected.length, focuses: report.focuses, rejectedWhy: report.rejected.slice(0, 40) }, updated_at: new Date().toISOString() })
  return NextResponse.json(report)
}
