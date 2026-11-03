import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { foodFacts, latestPlan, ownerForHousehold, parseMeant, smsContext, understandPrompt, type BotFacts, type MemberRow } from '@/lib/texting'
import { mergeSettings } from '@/lib/settings'
import { generateSmart } from '@/lib/claude'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST { memberId, body } — what the texting bot would understand and answer for this message, with that member's
 * real context, WITHOUT saving or sending anything. For testing bot changes. Auth: pipeline token or SETUP_SECRET.
 */
export async function POST(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const secret = req.headers.get('x-admin-secret')
  let ok = !!secret && !!process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET
  if (!ok) {
    const token = req.headers.get('x-image-token') ?? ''
    if (token.length >= 32) {
      const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
      ok = (data?.value as { token?: string } | null)?.token === token
    }
  }
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { memberId, body } = await req.json().catch(() => ({})) as { memberId?: string; body?: string }
  if (!memberId || !body) return NextResponse.json({ error: 'memberId and body required' }, { status: 400 })
  const { data: m } = await admin.from('household_members').select('*').eq('id', memberId).maybeSingle()
  if (!m) return NextResponse.json({ error: 'No such member' }, { status: 404 })
  const owner = await ownerForHousehold(admin, (m as MemberRow).household_id)
  const plan = owner ? await latestPlan(admin, owner.id) : null
  const meals = plan?.meals ?? []
  const ctx = await smsContext(admin, memberId)
  const settings = mergeSettings(owner?.settings)
  const family = (owner?.full_name || '').trim().split(' ')[0] || 'your family'
  const facts: BotFacts = { family, ...(await foodFacts(admin, m as MemberRow, owner, plan, meals, owner?.timezone || 'America/New_York', settings)) }
  const prompt = understandPrompt(body, ctx, meals, 'week', facts)
  const meant = parseMeant(await generateSmart(prompt, 900), meals.length)
  return NextResponse.json({ meant, facts })
}
