import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GREEN = '#1b5a3c'
const CREAM = '#faf7f0'
const TILE_COLORS = ['#e9a23b', '#c8553d', '#5b8e7d', '#8c6a9c', '#3d6fa5', '#b5838d']

/** Smaller Unsplash renditions keep the MMS well under Twilio's size limit. */
function sized(url: string): string {
  if (!url.includes('images.unsplash.com')) return url
  const u = new URL(url)
  u.searchParams.set('w', '360'); u.searchParams.set('h', '260'); u.searchParams.set('fit', 'crop'); u.searchParams.set('q', '70'); u.searchParams.set('fm', 'jpg')
  return u.toString()
}

/**
 * GET /api/sms/menu-image/<roundId> — the picture texted with the weekly vote:
 * every dinner choice as a photo tile with the number to reply with.
 * The round id is an unguessable UUID; the image shows only dinner names and photos.
 */
export async function GET(_req: Request, { params }: { params: { roundId: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.roundId)) return new Response('Not found', { status: 404 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin.from('vote_rounds').select('candidates').eq('id', params.roundId).single()
  const meals = ((data?.candidates as Meal[]) ?? []).slice(0, 12)
  if (!meals.length) return new Response('Not found', { status: 404 })
  // Dinners generated before their library photo existed: borrow the recipe library's photo by name.
  const missing = meals.filter((m) => !m.imageUrl).map((m) => m.name)
  if (missing.length) {
    const { data: lib } = await admin.from('recipes').select('name, image_url').in('name', missing).not('image_url', 'is', null)
    const byName = new Map((lib ?? []).map((r) => [String(r.name).toLowerCase(), r.image_url as string]))
    meals.forEach((m) => { if (!m.imageUrl) m.imageUrl = byName.get(m.name.toLowerCase()) })
  }

  const W = 720
  const PAD = 20
  const GAP = 14
  const tileW = (W - PAD * 2 - GAP) / 2
  const photoH = Math.round(tileW * 0.72)
  const tileH = photoH + 72
  const rows = Math.ceil(meals.length / 2)
  const H = 104 + rows * tileH + (rows - 1) * GAP + PAD + 48

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: CREAM, padding: PAD, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: GREEN }}>This week&apos;s dinner choices</div>
          <div style={{ fontSize: 22, color: '#555', marginTop: 4 }}>Text back the numbers you want</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: GAP }}>
          {meals.map((m, i) => (
            <div key={i} style={{ width: tileW, height: tileH, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '2px solid #e6e1d6' }}>
              <div style={{ width: tileW, height: photoH, display: 'flex', position: 'relative', background: TILE_COLORS[i % TILE_COLORS.length] }}>
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sized(m.imageUrl)} width={tileW} height={photoH} style={{ objectFit: 'cover' }} alt="" />
                ) : (
                  <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 72 }}>🍽️</div>
                )}
                <div style={{ position: 'absolute', top: 10, left: 10, width: 54, height: 54, borderRadius: 27, background: GREEN, color: '#fff', fontSize: 32, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff' }}>{i + 1}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', height: 72, padding: '0 12px', fontSize: 20, fontWeight: 700, color: '#222', lineHeight: 1.15 }}>
                {m.name.length > 64 ? `${m.name.slice(0, 62)}…` : m.name}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', justifyContent: 'center', fontSize: 20, color: GREEN, fontWeight: 700 }}>DinnerDrop</div>
      </div>
    ),
    { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=86400' } },
  )
}
