import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST { kept: string[], skipped: string[] } — recipe ids the family kept
 * (confirmed into a plan) or passed on. Feeds the library's "proven dinners"
 * ranking that future plans draw from.
 */
export async function POST(request: Request) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const kept: string[] = Array.isArray(body.kept) ? body.kept.filter((x: unknown) => typeof x === 'string') : []
  const skipped: string[] = Array.isArray(body.skipped) ? body.skipped.filter((x: unknown) => typeof x === 'string') : []
  if (!kept.length && !skipped.length) return Response.json({ ok: true })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await Promise.all([
    ...kept.map((id) => admin.rpc('bump_recipe_counter', { recipe_id: id, counter: 'kept_count' })),
    ...skipped.map((id) => admin.rpc('bump_recipe_counter', { recipe_id: id, counter: 'skipped_count' })),
  ])
  return Response.json({ ok: true })
}
