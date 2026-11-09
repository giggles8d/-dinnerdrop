import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { lookupPromo, promoState } from '@/lib/promo'

export const runtime = 'nodejs'

const GREEN = '#1a5c38'
const GOLD = '#e8a838'

/** GET /api/promo-image?code=THANKYOU — the 1200×630 link-preview image for a promo link (/start?code=…). */
export async function GET(req: Request) {
  const raw = (new URL(req.url).searchParams.get('code') ?? '').toUpperCase()
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const p = raw ? await lookupPromo(admin, raw) : null
  if (!p || promoState(p) !== 'ok') return new Response('Not found', { status: 404 })
  const months = Math.round(p.family_days / 30)
  const offer = months >= 1 ? `${months} month${months > 1 ? 's' : ''}` : `${p.family_days} days`

  const fontUrl = (w: number) => `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-${w}-normal.woff`
  const [bold, medium] = await Promise.all([700, 500].map((w) => fetch(fontUrl(w), { next: { revalidate: 86400 } }).then((x) => (x.ok ? x.arrayBuffer() : null)).catch(() => null)))
  const fonts = [bold && { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const }, medium && { name: 'Inter', data: medium, weight: 500 as const, style: 'normal' as const }].filter((f): f is NonNullable<typeof f> => !!f)

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: GREEN, padding: '0 80px', fontFamily: fonts.length ? 'Inter' : 'sans-serif' }}>
        <div style={{ display: 'flex', color: GOLD, fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>DinnerDrop</div>
        <div style={{ display: 'flex', color: '#fff', fontSize: 86, fontWeight: 700, lineHeight: 1.05, marginTop: 24 }}>{offer} of DinnerDrop Family, free</div>
        <div style={{ display: 'flex', color: '#e7efe9', fontSize: 36, fontWeight: 500, lineHeight: 1.3, marginTop: 28 }}>Dinners planned in about a minute. One tap sends the list to Instacart.</div>
        <div style={{ display: 'flex', marginTop: 40 }}>
          <div style={{ display: 'flex', background: GOLD, color: GREEN, fontSize: 32, fontWeight: 700, padding: '16px 34px', borderRadius: 40 }}>No card needed · Code {p.code}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, s-maxage=86400, max-age=3600' }, ...(fonts.length ? { fonts } : {}) },
  )
}
