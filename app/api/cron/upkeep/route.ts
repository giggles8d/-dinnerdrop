import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { backfillImages } from '@/lib/recipe-library'
import { shrinkRecipeImages } from '@/lib/shrink-images'
import { reconcileGifts } from '@/lib/gifts'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Daily upkeep, started by /api/cron/daily so it gets its own 300 s budget (Nov 8 2026: the one daily function ran
 * out of time on a long Sunday and skipped the gift check and photo shrinking). Gifts first: they matter most.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const started = Date.now()
  const out: Record<string, unknown> = {}
  // Gift purchases that never reached the thank-you page (closed tab) still get their code + emails.
  try { out.gifts = await reconcileGifts(admin, new Stripe(process.env.STRIPE_SECRET_KEY!)) } catch (e) { out.gifts = { error: String(e) } }
  try { out.recipeImages = await backfillImages(admin) } catch (e) { out.recipeImages = { error: String(e) } }
  // Recipe photo diet: ~1 MB JPEGs → 900px WebP, a time-boxed batch per day (new photos included).
  const shrinkMs = Math.min(180000, 270000 - (Date.now() - started))
  if (shrinkMs > 15000) { try { out.shrinkImages = await shrinkRecipeImages(admin, { limit: 400, budgetMs: shrinkMs }) } catch (e) { out.shrinkImages = { error: String(e) } } }
  else out.shrinkImages = { skipped: 'out of time today' }
  return NextResponse.json({ ok: true, ms: Date.now() - started, ...out })
}
