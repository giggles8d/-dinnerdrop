import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { FULL_COLUMNS, toLibRow } from '@/lib/recipe-filters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GREEN = '#1a5c38'
const GOLD = '#e8a838'

/**
 * GET /api/pin-image/<recipe slug>?k=<kicker> — a 1000×1500 Pinterest pin for a public library recipe: the photo on top,
 * the dinner name, time, cost and servings on a green band, dinnerdrop.app at the foot. Same look as the first hand-made
 * pins (Nov 8 2026). Lets the daily scheduled task make pins with no browser (Publer pulls the image from this URL).
 * Public data only (the recipe page already shows all of it).
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  if (!/^[a-z0-9-]{3,140}$/.test(params.slug)) return new Response('Not found', { status: 404 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin.from('recipes').select(FULL_COLUMNS).eq('slug', params.slug).maybeSingle()
  if (!data) return new Response('Not found', { status: 404 })
  const r = toLibRow(data as unknown as Parameters<typeof toLibRow>[0])
  if (!r.image_url) return new Response('No photo', { status: 404 })

  const sharp = (await import('sharp')).default
  let photo: string
  try {
    const res = await fetch(r.image_url, { cache: 'no-store' })
    if (!res.ok) throw new Error(String(res.status))
    const buf = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: 1000, height: 1000, fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()
    photo = `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {
    return new Response('Photo unavailable', { status: 502 })
  }

  // Inter (OFL) from the @fontsource package on jsDelivr: the renderer's built-in font has no bold. Cached for a day.
  const fontUrl = (w: number) => `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-${w}-normal.woff`
  const [bold, medium] = await Promise.all([700, 500].map((w) => fetch(fontUrl(w), { next: { revalidate: 86400 } }).then((x) => (x.ok ? x.arrayBuffer() : null)).catch(() => null)))
  const fonts = [bold && { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const }, medium && { name: 'Inter', data: medium, weight: 500 as const, style: 'normal' as const }].filter((f): f is NonNullable<typeof f> => !!f)

  const kicker = (new URL(req.url).searchParams.get('k') ?? '').replace(/[^A-Za-z0-9 ·&,'+-]/g, '').slice(0, 32).trim()
  const time = r.time > 120 ? `${Math.round(r.time / 60)} hrs on low` : `${r.time} minutes`
  const meta = [time, r.cost ? `about $${Math.round(r.cost)}` : '', r.servings ? `serves ${r.servings}` : ''].filter(Boolean).join('  ·  ')
  const title = r.name.length > 70 ? `${r.name.slice(0, 68)}…` : r.name
  const titleSize = title.length > 44 ? 62 : title.length > 26 ? 70 : 76

  const png = new ImageResponse(
    (
      <div style={{ width: 1000, height: 1500, display: 'flex', flexDirection: 'column', background: GREEN, fontFamily: fonts.length ? 'Inter' : 'sans-serif' }}>
        <div style={{ width: 1000, height: 1000, display: 'flex', position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} width={1000} height={1000} style={{ objectFit: 'cover' }} alt="" />
          {kicker ? (
            <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex', background: GOLD, color: GREEN, fontSize: 34, fontWeight: 700, padding: '12px 26px', borderRadius: 40, textTransform: 'uppercase' }}>{kicker}</div>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '44px 50px 40px' }}>
          <div style={{ display: 'flex', color: '#fff', fontSize: titleSize, fontWeight: 700, lineHeight: 1.12 }}>{title}</div>
          <div style={{ display: 'flex', color: GOLD, fontSize: 40, fontWeight: 500, marginTop: 18 }}>{meta}</div>
          <div style={{ display: 'flex', marginTop: 'auto', justifyContent: 'space-between', color: '#fff', fontSize: 36, fontWeight: 700 }}>
            <span>dinnerdrop.app</span><span>Full recipe</span>
          </div>
        </div>
      </div>
    ),
    { width: 1000, height: 1500, ...(fonts.length ? { fonts } : {}) },
  )
  const jpg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 86, mozjpeg: true }).toBuffer()
  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, s-maxage=86400, max-age=3600' } })
}
