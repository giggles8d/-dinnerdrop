'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('redirect') || null
  // beta=1 means this user clicked through from the beta landing page. We mark
  // them as a beta member (is_beta_member=true) in the auth callback, no Stripe
  // checkout, no credit card collected. 6 months free is just &quot;free.&quot;
  const isBeta = searchParams.get('beta') === '1'

  const supabase = createClient()

  function buildCallbackUrl() {
    const onboardingNext = isBeta
      ? '/onboarding?beta=1'
      : nextUrl
        ? `/onboarding?next=${encodeURIComponent(nextUrl)}`
        : '/onboarding'
    return isBeta
      ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(onboardingNext)}&beta=1`
      : `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(onboardingNext)}`
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Magic-link signup: one-step. Clicking the link IS the email verification.
    // No password to remember, no separate confirm-email step. Highest-conversion
    // signup path for B2C consumer apps.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildCallbackUrl(),
        shouldCreateUser: true,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMagicSent(true)
    setLoading(false)
  }

  async function handleGoogleSignup() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildCallbackUrl(),
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="text-6xl">📩</div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Check your inbox</h1>
          <p className="text-muted-foreground leading-relaxed">
            We sent a magic link to <strong className="text-foreground">{email}</strong>.
            <br />Click it to finish setting up your account.
          </p>
          {isBeta && (
            <div className="rounded-xl border-2 px-4 py-3" style={{borderColor:'#e8a838',backgroundColor:'#fef9ee'}}>
              <p className="text-sm font-bold" style={{color:'#1a5c38'}}>🎉 Your 6-month beta is locked in.</p>
              <p className="text-xs mt-1" style={{color:'#1a5c38'}}>The moment you click the link, you&apos;re in. No card, no checkout.</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Didn&apos;t get it? Check your spam folder, or{' '}
            <button onClick={() => setMagicSent(false)} className="text-primary hover:underline font-medium">
              try a different email
            </button>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {isBeta && (
          <div className="rounded-xl border-2 px-4 py-3 text-center" style={{borderColor:'#e8a838',backgroundColor:'#fef9ee'}}>
            <p className="text-sm font-bold" style={{color:'#1a5c38'}}>🎉 You&apos;re claiming your 6 free months</p>
            <p className="text-xs mt-1" style={{color:'#1a5c38'}}>No credit card. No password. Just your email — we&apos;ll send a one-click sign-in link.</p>
          </div>
        )}
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {isBeta ? 'Claim your beta access' : 'Create your account'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isBeta
              ? 'No password to remember. Just your email.'
              : "We'll email you a one-click sign-in link."}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleMagicLink} className="space-y-4">
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
              autoFocus
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-3 text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading
              ? 'Sending your link...'
              : isBeta
                ? 'Send my beta access link →'
                : 'Email me a magic link →'}
          </button>
          <p className="text-xs text-center text-muted-foreground">
            No password. No card. We&apos;ll just email you a one-click sign-in link.
          </p>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
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
