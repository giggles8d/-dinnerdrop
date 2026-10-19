import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lookupPromo, promoState } from '@/lib/promo'

/** GET ?code=XXX — public: is this code live, and what does it give? (for the /start banner) */
export async function GET(req: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const promo = await lookupPromo(admin, req.nextUrl.searchParams.get('code') ?? '')
  const state = promoState(promo)
  if (state !== 'ok' || !promo) return NextResponse.json({ ok: false, reason: state })
  return NextResponse.json({ ok: true, code: promo.code, days: promo.family_days, label: promo.label })
}
