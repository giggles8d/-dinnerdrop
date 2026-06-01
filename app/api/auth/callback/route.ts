import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const isBeta = searchParams.get('beta') === '1'

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(`${origin}/login?error=config`)
    }

    const cookieStore = cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name)
        },
      },
    })

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If this user came through the beta funnel, mark their profile as a beta
      // member. No Stripe checkout, no card collected — 6 months free is just free.
      // We use the service-role key so the update bypasses RLS even before the
      // user's first request hits the dashboard.
      if (isBeta && sessionData?.user?.id) {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceKey) {
          try {
            const admin = createClient(supabaseUrl, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            })
            await admin
              .from('profiles')
              .update({ is_beta_member: true })
              .eq('id', sessionData.user.id)
          } catch (e) {
            // Never block signup on this update — we can backfill later.
            console.error('[auth/callback] beta-member flag failed:', e)
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
