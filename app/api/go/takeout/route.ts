import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/go/takeout?a=doordash|ubereats|grubhub — the "order it" links in the takeout summary text.
 * Goes through our own link so the affiliate tracking URL can be added later without changing any text:
 * set TAKEOUT_DOORDASH_URL / TAKEOUT_UBEREATS_URL / TAKEOUT_GRUBHUB_URL (the program's tracking link) in Vercel.
 */
const APPS: Record<string, { env: string; fallback: string }> = {
  doordash: { env: 'TAKEOUT_DOORDASH_URL', fallback: 'https://www.doordash.com/' },
  ubereats: { env: 'TAKEOUT_UBEREATS_URL', fallback: 'https://www.ubereats.com/' },
  grubhub: { env: 'TAKEOUT_GRUBHUB_URL', fallback: 'https://www.grubhub.com/' },
}

export async function GET(req: NextRequest) {
  const a = APPS[(req.nextUrl.searchParams.get('a') ?? 'doordash').toLowerCase()] ?? APPS.doordash
  const url = process.env[a.env] || a.fallback
  console.log('[go/takeout]', req.nextUrl.searchParams.get('a'), url === a.fallback ? 'untracked' : 'tracked')
  return NextResponse.redirect(url, 302)
}
