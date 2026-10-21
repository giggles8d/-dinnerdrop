import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const protectedPaths = [
  '/dashboard', '/grocery-list', '/favorites', '/recipe',
  '/onboarding', '/pantry', '/history', '/account', '/settings', '/join',
]
const authPaths = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Inside the iOS/Android app (Capacitor appends "DinnerDropApp" to the UA), nothing sells the
  // subscription: checkout pages bounce to Account, which shows plan status only.
  const inApp = (request.headers.get('user-agent') ?? '').includes('DinnerDropApp')
  if (inApp && (pathname.startsWith('/subscribe') || pathname.startsWith('/go/'))) {
    const u = request.nextUrl.clone(); u.pathname = '/account'; u.search = ''
    return NextResponse.redirect(u)
  }
  // The website's marketing/pricing pages aren't part of the app: go straight to the family's
  // dinners (signed-out users land on sign-in from there). Keeps prices out of the app.
  const marketing = ['/', '/start', '/mealime', '/affiliates', '/beta', '/beta-v2', '/pricing']
  if (inApp && marketing.includes(pathname)) {
    const u = request.nextUrl.clone(); u.pathname = '/dashboard'; u.search = ''
    return NextResponse.redirect(u)
  }
  // Sign-up headed to the Family trial checkout: in the app it's a plain free sign-up.
  if (inApp && pathname === '/signup' && /subscribe/.test(request.nextUrl.searchParams.get('redirect') ?? '')) {
    const u = request.nextUrl.clone(); u.search = ''
    return NextResponse.redirect(u)
  }

  // Exact segment match, so '/recipe' (the plan's recipe pages) does not capture the public '/recipes' library.
  const isProtectedRoute = protectedPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
  const isAuthRoute = authPaths.some(path => pathname.startsWith(path))

  // Referral capture: ?ref=CODE on any page → 30-day cookie, attached at signup.
  const ref = request.nextUrl.searchParams.get('ref')
  const refCookie = ref && /^[A-Z0-9]{6,12}$/i.test(ref) ? ref.toUpperCase() : null
  // Promo capture: ?code=MEALIME (or ?promo=) on any page → 30-day cookie, redeemed on first dashboard load.
  const promo = request.nextUrl.searchParams.get('code') ?? request.nextUrl.searchParams.get('promo')
  const promoCookie = promo && /^[A-Z0-9]{3,20}$/i.test(promo) ? promo.toUpperCase() : null

  // Skip auth check for routes that don't need it
  if (!isProtectedRoute && !isAuthRoute) {
    const res = NextResponse.next()
    if (refCookie) res.cookies.set('dd_ref', refCookie, { maxAge: 30 * 86400, path: '/', sameSite: 'lax' })
    if (promoCookie) res.cookies.set('dd_promo', promoCookie, { maxAge: 30 * 86400, path: '/', sameSite: 'lax' })
    return res
  }

  // Use Supabase SSR to properly validate session and refresh expired tokens
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Apply updated cookies to both the request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the JWT server-side and refreshes if expired
  const { data: { user } } = await supabase.auth.getUser()

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  if (refCookie) response.cookies.set('dd_ref', refCookie, { maxAge: 30 * 86400, path: '/', sameSite: 'lax' })
  if (promoCookie) response.cookies.set('dd_promo', promoCookie, { maxAge: 30 * 86400, path: '/', sameSite: 'lax' })
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
