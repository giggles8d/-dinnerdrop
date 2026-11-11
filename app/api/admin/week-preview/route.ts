import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { libraryWeek } from '@/lib/first-plan'
import { coreRecipeIds } from '@/lib/recipe-library'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Read-only (Nov 10 2026, core dinners): what a family's next library week would look like, without saving it.
 *  POST { userIds: string[] } (≤ 12) → [{ user, meals: [{ name, core }] }]. Auth: x-image-token; on a Vercel preview
 *  deployment (already behind Vercel's login wall) no token is needed, so a change can be checked before it goes live.
 */
async function authorized(req: NextRequest, admin: SupabaseClient): Promise<boolean> {
  const token = req.headers.get('x-image-token') ?? ''
  if (token.length < 32) return false
  const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
  return (data?.value as { token?: string } | null)?.token === token
}

export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (process.env.VERCEL_ENV !== 'preview' && !(await authorized(req, admin))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({})) as { userIds?: string[] }
  const ids = (b.userIds ?? []).map(String).slice(0, 12)
  const core = await coreRecipeIds(admin)
  const out = []
  for (const uid of ids) {
    // Built the way the Saturday plan (lib/autoplan) builds a library week.
    const w = await libraryWeek(admin, uid, [], { firstWeek: true }).catch((e) => ({ ok: false as const, reason: String(e) }))
    out.push(w.ok
      ? { user: uid, meals: w.meals.map((m) => ({ name: m.name, core: !!m.recipeId && core.has(String(m.recipeId)), protein: m.protein, budgetPick: !!(m as { budgetPick?: boolean }).budgetPick })) }
      : { user: uid, error: w.reason })
  }
  return NextResponse.json({ core: core.size, results: out })
}
