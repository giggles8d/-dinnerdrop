import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET() {
  const clientId = process.env.KROGER_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Kroger not configured' }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'}/auth/kroger/callback`

  const authUrl = new URL('https://api.kroger.com/v1/connect/oauth2/authorize')
  authUrl.searchParams.set('scope', 'cart.basic:write product.compact')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  // OAuth state (Nov 21 2026 review): the callback only accepts the code if it comes back with the state we set
  // in this browser, so a crafted link can't attach someone else's Kroger account to this family.
  const state = randomBytes(16).toString('hex')
  authUrl.searchParams.set('state', state)

  const res = NextResponse.redirect(authUrl.toString())
  res.cookies.set('kroger_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 })
  return res
}
