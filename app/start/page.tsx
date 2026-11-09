import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { lookupPromo, promoState } from '@/lib/promo'
import StartClient from './StartClient'

/**
 * /start. A link with a promo code (/start?code=THANKYOU) gets its own link preview that names the offer
 * ("3 months of DinnerDrop Family, free") instead of the standard "Try it free for 14 days" card, so a shared post
 * and its preview say the same thing (Sarah, Nov 8 2026). Everything else comes from layout.tsx as before.
 */
export async function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Promise<Metadata> {
  const raw = String(searchParams.code ?? searchParams.promo ?? '').toUpperCase()
  if (!raw) return {}
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const p = await lookupPromo(admin, raw)
    if (!p || promoState(p) !== 'ok') return {}
    const months = Math.round(p.family_days / 30)
    const offer = months >= 1 ? `${months} month${months > 1 ? 's' : ''}` : `${p.family_days} days`
    const title = `${offer} of DinnerDrop Family, free`
    const description = 'Your week of family dinners planned in about a minute, the family votes by text, and one tap sends the grocery list to Instacart. No card needed.'
    const image = `https://www.dinnerdrop.app/api/promo-image?code=${encodeURIComponent(p.code)}`
    const url = `https://www.dinnerdrop.app/start?code=${encodeURIComponent(p.code)}`
    return {
      title, description,
      openGraph: { title, description, url, siteName: 'DinnerDrop', type: 'website', images: [{ url: image, width: 1200, height: 630, alt: title }] },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
    }
  } catch {
    return {}
  }
}

export default function StartPage() {
  return <StartClient />
}
