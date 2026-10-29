import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { shrinkRecipeImages } from '@/lib/shrink-images'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAIL = 'setzl1979@gmail.com'

/** Admin-session trigger for the recipe photo diet (see lib/shrink-images.ts). GET ?limit=30. */
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
  return NextResponse.json(await shrinkRecipeImages(admin, { limit, budgetMs: 48000 }))
}
