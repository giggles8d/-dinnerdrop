import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { growLibrary } from '@/lib/library-grower'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  const report = await growLibrary(admin, {
    batches: Number(sp.get('batches')) || undefined,
    perBatch: Number(sp.get('perBatch')) || undefined,
  })
  await admin.from('app_kv').upsert({ key: 'library_growth_last', value: { at: new Date().toISOString(), saved: report.saved.length, rejected: report.rejected.length, focuses: report.focuses }, updated_at: new Date().toISOString() })
  return NextResponse.json(report)
}
