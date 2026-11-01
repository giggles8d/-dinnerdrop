import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { applyStyle } from '@/lib/apply-style'
import { trackStep } from '@/lib/activation'
import { ensureHousehold, setupFamilyTexting, type SetupProfile } from '@/lib/texting-setup'
import { GOAL_KEYS, type Goal } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

/**
 * POST — a brand-new family's first-visit answers, saved in one go before their first week is built:
 * { goal, familySize, weeklyBudget, dietaryNeeds, style, picky, ownerPhone, partnerPhone, skipped }
 * Phone → texting on + the planner opted in (their own number on our form); family numbers get the YES text.
 */
export async function POST(request: Request) {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const body = await request.json().catch(() => ({})) as {
    goal?: string; familySize?: number; weeklyBudget?: string; dietaryNeeds?: string[]; style?: string | null
    picky?: string; ownerPhone?: string; partnerName?: string; partnerPhone?: string; skipped?: boolean
  }
  const { data: p } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', user.id).single()
  if (!p) return NextResponse.json({ error: 'No profile' }, { status: 404 })
  const profile = p as SetupProfile

  const goal = GOAL_KEYS.includes(String(body.goal)) ? (body.goal as Goal) : null
  const familySize = Math.min(Math.max(Number(body.familySize) || 4, 1), 12)
  const weeklyBudget = /^\$\d{2,4}\+?$/.test(String(body.weeklyBudget ?? '')) ? String(body.weeklyBudget) : '$150'
  const dietaryNeeds = Array.isArray(body.dietaryNeeds) ? body.dietaryNeeds.map(String).slice(0, 8) : []
  const settings = { ...((profile.settings as Record<string, unknown> | null) ?? {}) }
  if (goal) settings.goal = goal
  await admin.from('profiles').update({
    family_size: familySize,
    weekly_budget: weeklyBudget,
    dietary_needs: dietaryNeeds,
    settings,
    ...(body.skipped ? {} : { onboarding_complete: true }),
  }).eq('id', user.id)
  profile.settings = settings
  if (!body.skipped && body.style) await applyStyle(admin, user.id, body.style).catch(() => {})

  // The picky one gets a profile row so the planner can text and the bot can learn their won't-eats.
  const picky = String(body.picky ?? '').trim().slice(0, 40)
  if (picky) {
    const hid = await ensureHousehold(admin, profile)
    if (hid) {
      const { data: same } = await admin.from('household_members').select('id').eq('household_id', hid).ilike('name', picky).limit(1)
      if (!same?.length) await admin.from('household_members').insert({ household_id: hid, name: picky, role: 'kid', age_band: 'kid', can_vote: true, can_add: false, dislikes: [] })
    }
  }

  let texting: { saved: number; sent?: number; familyRequired?: boolean } | null = null
  if (body.ownerPhone || body.partnerPhone) {
    const r = await setupFamilyTexting(admin, profile, {
      ownerPhone: body.ownerPhone,
      members: body.partnerPhone ? [{ name: body.partnerName || 'Partner', phone: body.partnerPhone }] : [],
    })
    if (!('error' in r)) texting = r
  }
  await trackStep(admin, user.id, body.skipped ? 'quick_setup_skipped' : 'quick_setup_done', { goal, phone: !!body.ownerPhone, picky: !!picky })
  return NextResponse.json({ ok: true, texting })
}
