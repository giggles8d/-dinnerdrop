'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { isNativeApp, nativePlatform } from '@/lib/native'
import EmailCodeSignIn from '@/components/EmailCodeSignIn'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('redirect') || null
  // Coming from a "Try Family" button: the next step is Stripe Checkout
  // (14-day trial), so the "no card" line would be false here.
  const toTrial = !!nextUrl && nextUrl.startsWith('/subscribe')

  const supabase = createClient()

  // Instant value: new users land straight on the dashboard, where their first
  // week of dinners auto-generates with smart defaults. The personalization
  // quiz is offered after they've seen the plan — not as a gate before it.
  function buildCallbackUrl() {
    const destination = nextUrl && nextUrl.startsWith('/') ? nextUrl : '/dashboard?new=1'
    return `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(destination)}`
  }

  function postSignupDestination() {
    return nextUrl && nextUrl.startsWith('/') ? nextUrl : '/dashboard?new=1'
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Instant signup: create the account and sign the user straight in — no email
    // to verify, no link to click, no password for them to remember (we generate a
    // strong random one they never see; returning users sign in via magic link).
    // This requires Supabase "Confirm email" to be OFF. If it's still on, or the
    // account already exists, we fall back to a one-click email link so nothing breaks.
    const password = `${crypto.randomUUID()}-${crypto.randomUUID()}`
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: buildCallbackUrl() },
    })

    if (signUpError) {
      // Most likely an existing account. In the phone app, sign in with an emailed code
      // (a magic link would open Safari, not the app).
      if (isNativeApp()) {
        const r = await fetch('/api/auth/email-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, create: true }) })
        const j = await r.json().catch(() => ({}))
        setLoading(false)
        if (!r.ok) { setError(j.error || 'Could not send a code. Try again.'); return }
        setCodeSent(true)
        return
      }
      // Website: send a one-click sign-in link instead.
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: buildCallbackUrl(), shouldCreateUser: true },
      })
      if (otpError) {
        setError(otpError.message)
        setLoading(false)
        return
      }
      setMagicSent(true)
      setLoading(false)
      return
    }

    // Session present → "Confirm email" is OFF, user is logged in instantly.
    if (data.session && data.user) {
      window.location.assign(postSignupDestination())
      return
    }

    // No session → "Confirm email" still enabled. Supabase sent a confirmation
    // email; show the inbox screen as a graceful fallback until the toggle is off.
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

  if (codeSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <EmailCodeSignIn email={email} onBack={() => setCodeSent(false)} onDone={() => window.location.assign(postSignupDestination())} />
      </div>
    )
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
         <div className="text-center">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {toTrial ? 'Start your 14-day Family trial' : 'Create your free account'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {toTrial
              ? 'Step 1 of 2: your email. Step 2: add a card at secure checkout — $0 today, $4.99/month after 14 days unless you cancel.'
              : 'Just your email. No password, no card. Your first week of dinners is ready in seconds.'}
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
              ? 'Setting up your account...'
              : toTrial
                ? 'Continue to secure checkout →'
                : 'Start free →'}
          </button>
          <p className="text-xs text-center text-muted-foreground">
            {toTrial
              ? 'No password to remember. Nothing charged for 14 days. Cancel anytime from Account.'
              : 'Free forever for planning and your Instacart cart. No password — you\'re in instantly.'}
          </p>
        </form>
      {!(isNativeApp() && nativePlatform() === 'ios') && (<>

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
      </>)}

        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
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
