'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('redirect') || null
  // beta=1 means this user clicked through from the beta landing page. We mark
  // them as a beta member (is_beta_member=true) in the auth callback, no Stripe
  // checkout, no credit card collected. 6 months free is just "free."
  const isBeta = searchParams.get('beta') === '1'

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // For beta users we land them on /onboarding directly with the beta flag.
    // For non-beta users with a `redirect` URL we preserve it.
    const postOnboardingTarget = isBeta
      ? '/onboarding?beta=1'
      : nextUrl ? `/onboarding?next=${encodeURIComponent(nextUrl)}` : '/onboarding'
    const callbackUrl = isBeta
      ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(postOnboardingTarget)}&beta=1`
      : `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(postOnboardingTarget)}`
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Fire a branded "thanks for signing up" email immediately — the Supabase verification
    // email comes from noreply@mail.app.supabase.io and often lands in spam. A first-touch
    // branded email primes them to look for it.
    if (signUpData?.user?.email) {
      try {
        await fetch('/api/email/welcome-unverified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: signUpData.user.email, userId: signUpData.user.id }),
        })
      } catch (err) {
        // Never block signup on welcome-email failure
        console.warn('[signup] welcome-unverified email failed:', err)
      }
    }

    const onboardingUrl = isBeta
      ? '/onboarding?beta=1'
      : nextUrl ? '/onboarding?next=' + encodeURIComponent(nextUrl) : '/onboarding'
    router.push(onboardingUrl)
    router.refresh()
  }

  async function handleGoogleSignup() {
    const onboardingNext = isBeta
      ? '/onboarding?beta=1'
      : nextUrl ? `/onboarding?next=${encodeURIComponent(nextUrl)}` : '/onboarding'
    const callbackUrl = isBeta
      ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(onboardingNext)}&beta=1`
      : `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(onboardingNext)}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {isBeta && (
          <div className="rounded-xl border-2 px-4 py-3 text-center" style={{borderColor:'#e8a838',backgroundColor:'#fef9ee'}}>
            <p className="text-sm font-bold" style={{color:'#1a5c38'}}>🎉 You're claiming your 6 free months</p>
            <p className="text-xs mt-1" style={{color:'#1a5c38'}}>No credit card. No checkout. Just create your account and you're in.</p>
          </div>
        )}
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {isBeta ? 'Claim your beta access' : 'Create your account'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isBeta ? 'Just an email and password. No card. 60 seconds.' : 'Start planning better dinners in 60 seconds'}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignup}
          className="w-full rounded-md border border-input bg-background px-4 py-2 text-foreground font-medium hover:bg-muted transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
