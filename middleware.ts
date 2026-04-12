import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const protectedPaths = ['/dashboard', '/grocery-list', '/favorites', '/recipe', '/onboarding', '/pantry']
  const isProtectedRoute = protectedPaths.some(path => pathname.startsWith(path))

  const authPaths = ['/login', '/signup']
  const isAuthRoute = authPaths.some(path => pathname.startsWith(path))

  const hasSession = request.cookies.getAll().some(c => c.name.includes('auth-token') || c.name.includes('sb-') )

  if (isProtectedRoute && !hasSession) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && hasSession) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
