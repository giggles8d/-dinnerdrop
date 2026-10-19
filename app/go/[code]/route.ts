import { NextRequest, NextResponse } from 'next/server'

/** dinnerdrop.app/go/mealime → /start?code=MEALIME (middleware sets the promo cookie). Short link for posts and comments. */
export function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = String(params.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
  const url = req.nextUrl.clone()
  url.pathname = '/start'
  url.search = ''
  if (code) { url.searchParams.set('code', code); url.searchParams.set('utm_source', 'code'); url.searchParams.set('utm_campaign', code.toLowerCase()) }
  return NextResponse.redirect(url, 302)
}
