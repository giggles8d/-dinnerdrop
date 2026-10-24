import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolvePlanOwner } from '@/lib/household'
import { parseReceipt, reconcileReceipt, matchLines, type SentLine } from '@/lib/receipts'

const ADMIN_EMAIL = 'setzl1979@gmail.com'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function authorized(request: NextRequest): Promise<{ ok: boolean; userId?: string }> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return { ok: true }
  try {
    const sb = createServerSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()
    return user?.email?.toLowerCase() === ADMIN_EMAIL ? { ok: true, userId: user.id } : { ok: false }
  } catch { return { ok: false } }
}

/**
 * Admin-only test harness for the forwarded-receipt pipeline (no webhook needed).
 * POST { text: "<pasted receipt email>", apply?: boolean, userId?: string }
 *  - default: parses the receipt and shows how its lines would match the latest sent list — no writes
 *  - apply: true — runs the real reconcile for that user (writes receipts/list_items/pantry)
 */
export async function POST(request: NextRequest) {
  const auth = await authorized(request)
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { text, apply, userId } = await request.json().catch(() => ({})) as { text?: string; apply?: boolean; userId?: string }
  if (!text || text.trim().length < 40) return NextResponse.json({ error: 'text required' }, { status: 400 })
  const parsed = await parseReceipt(text.slice(0, 24000))
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const uid = userId ?? auth.userId
  if (!uid) return NextResponse.json({ parsed })
  const { ownerId } = await resolvePlanOwner(admin, uid)
  if (apply) {
    const result = await reconcileReceipt(admin, ownerId, parsed, { emailId: `test:${Date.now()}`, fromEmail: ADMIN_EMAIL, rawText: text })
    return NextResponse.json({ parsed, result })
  }
  const since = new Date(Date.now() - 14 * 86400000).toISOString()
  const { data: sent } = await admin.from('list_items').select('id, name, search_term, quantity, unit, category, week_start, household_id').eq('user_id', ownerId).not('ordered_at', 'is', null).gte('ordered_at', since)
  const m = matchLines(parsed.items, (sent as SentLine[]) ?? [])
  return NextResponse.json({
    parsed,
    preview: {
      sentLines: (sent ?? []).length,
      matched: m.pairs.map((p) => ({ receipt: p.receipt.name, list: p.line.name, score: Math.round(p.score * 100) / 100, status: p.receipt.status })),
      onReceiptNotOnList: m.unmatchedReceipt.map((r) => r.name),
      wouldRestore: [...m.pairs.filter((p) => p.receipt.status === 'refunded').map((p) => p.line.name), ...m.unmatchedSent.map((s) => s.name)],
    },
  })
}
