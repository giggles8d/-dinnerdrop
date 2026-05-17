import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

// A/B test: route 50% of /beta traffic to /beta-v2
// Cookie "dd_ab_beta" keeps each visitor in the same variant (30-day TTL)
function getBetaVariant(request: NextRequest): 'control' | 'variant' {
  const existing = request.cookies.get('dd_ab_beta')
  if (existing) return existing.value as 'control' | 'variant'
  return Math.random() < 0.5 ? 'variant' : 'control'
}

const protectedPaths = [
  '/dashboard', '/grocery-list', '/favorites', '/recipe',
  '/onboarding', '/pantry', '/history', '/account',
]
const authPaths = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // A/B test: /beta -> 50% see /beta-v2, variant sticky via cookie
  if (pathname === '/beta') {
    const variant = getBetaVariant(request)
    if (variant === 'variant') {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = '/beta-v2'
      const res = NextResponse.rewrite(rewriteUrl)
      if (!request.cookies.get('dd_ab_beta')) {
        res.cookies.set('dd_ab_beta', 'variant', { maxAge: 30 * 24 * 60 * 60, path: '/', sameSite: 'lax' })
      }
      return res
    }
    if (!request.cookies.get('dd_ab_beta')) {
      const res = NextResponse.next()
      res.cookies.set('dd_ab_beta', 'control', { maxAge: 30 * 24 * 60 * 60, path: '/', sameSite: 'lax' })
      return res
    }
  }

  const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path))
  const isAuthRoute = authPaths.some(path => pathname.startsWith(path))

  // Skip auth check for routes that don't need it
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next()
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

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
