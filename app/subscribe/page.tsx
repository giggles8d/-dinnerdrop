'use client'

import { BF_SALE, blackFridayOpen } from '@/lib/bf-sale'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { openExternal } from '@/lib/native'
import ConversionTracker from '@/components/ConversionTracker'
import { createClient } from '@/lib/supabase'
import { trialPlan } from '@/lib/trial-date'
import { trackOnce } from '@/lib/activation'
import { ArrowLeft, Check, MessageSquareText, ShoppingCart, Users, CalendarClock } from 'lucide-react'

type Interval = 'monthly' | 'yearly'

function SubscribeContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [interval, setInterval] = useState<Interval>('monthly')
  const searchParams = useSearchParams()

  const autoCheckout = searchParams.get('auto') === '1'

  // The first-charge date uses the same rule as checkout (lib/trial-date, Nov 22 2026 review): the trial ends when
  // this family's free Family days end, no trial if they're over, 14 days if they never had any.
  // undefined = not loaded or signed out (shows the standard 14 days).
  const [familyUntil, setFamilyUntil] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('family_until').eq('id', user.id).maybeSingle()
      setFamilyUntil((data?.family_until as string | null | undefined) ?? null)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const coupon = searchParams.get('coupon')
    // The founding offer (BETA100) closed on 2026-10-16. Legacy bookmarks land on /start.
    if (coupon === 'BETA100') {
      window.location.replace('/start')
      return
    }
    if (coupon) setCouponCode(coupon)
    if (searchParams.get('plan') === 'yearly' || (blackFridayOpen() && searchParams.get('plan') !== 'monthly')) setInterval('yearly')
    // Subscribe-page view (Nov 26 2026, sale tracking). Signed-in visitors only (/api/track needs a user).
    trackOnce('subscribe_view', {
      interval: searchParams.get('plan') === 'monthly' ? 'monthly' : (searchParams.get('plan') === 'yearly' || blackFridayOpen()) ? 'yearly' : 'monthly',
      sale: blackFridayOpen() ? 'bf-2026' : '',
      src: (searchParams.get('utm_content') || searchParams.get('utm_medium') || (searchParams.get('auto') ? 'auto' : '')).slice(0, 40),
    })
  }, [searchParams])

  // /start → /signup → /subscribe?auto=1: the user already chose "Try Family free",
  // so go straight to Stripe Checkout instead of asking twice.
  useEffect(() => {
    if (autoCheckout) handleCheckout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckout])

  async function handleCheckout() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponCode || undefined, interval }),
      })
      if (res.status === 401) {
        const dest = '/subscribe?auto=1' + (interval === 'yearly' ? '&plan=yearly' : '') + (couponCode ? '&coupon=' + couponCode : '')
        window.location.href = '/signup?redirect=' + encodeURIComponent(dest)
        return
      }
      const data = await res.json()
      if (data.url) {
        await openExternal(data.url, 'sameTab')
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const plan = trialPlan(familyUntil)
  const firstCharge = plan.firstCharge.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const chargeNow = plan.trialEnd === null
  const bf = blackFridayOpen()
  const price = interval === 'monthly' ? '$4.99' : bf ? BF_SALE.yearlyPrice : '$39'

  return (
    <div className="min-h-screen bg-background">
      {/* Just signed up on the way to the Family trial: report the signup to the ad platforms. */}
      {searchParams.get('new') === '1' && <ConversionTracker value={10} onceKey="dd_signup_conv" />}
      <header className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-4 max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Keep using Free
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left: value prop */}
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
              DinnerDrop Family
            </p>
            <h1 className="text-5xl font-heading font-bold text-foreground leading-tight mb-6">
              Get the whole<br />household in on it.
            </h1>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Planning and your Instacart or Walmart cart stay free. Family makes dinner a shared job instead of yours alone. Every new account gets Family free for 14 days with no card. Add a card here only to keep it after that.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Push straight to your Kroger cart</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Connect Kroger once; every list lands in your cart with quantities set.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <MessageSquareText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Priority support from the founder</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Email goes straight to Sarah, answered first.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">The family features</p>
                  <p className="text-sm text-muted-foreground mt-0.5">The week&apos;s dinners texted to everyone to vote on, a shared list anyone can text foods to, per-person preferences, and a text the day before shopping asking what each person wants.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Cancel in one tap</p>
                  <p className="text-sm text-muted-foreground mt-0.5">From your Account page. No calls, no hoops. We email you 3 days before your free Family days end.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: pricing card */}
          <div className="lg:sticky lg:top-8">
            <div className="rounded-2xl border-2 border-primary bg-white p-8 shadow-sm">
              {/* Interval toggle */}
              <div className="flex rounded-xl bg-secondary p-1 mb-6 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setInterval('monthly')}
                  className={`flex-1 py-2 rounded-lg transition-colors ${interval === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setInterval('yearly')}
                  className={`flex-1 py-2 rounded-lg transition-colors ${interval === 'yearly' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'}`}
                >
                  Yearly <span className="text-xs font-bold text-accent-foreground bg-accent px-1.5 py-0.5 rounded ml-1">{blackFridayOpen() ? '50% off' : 'save 35%'}</span>
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                  {interval === 'monthly' ? (
                    <>
                      <span className="text-5xl font-heading font-bold text-foreground">$4.99</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                    </>
                  ) : (
                    bf ? (
                      <span className="flex flex-col">
                        <span className="flex items-baseline gap-2">
                          <span className="text-5xl font-heading font-bold text-foreground">{BF_SALE.yearlyPrice}</span>
                          <span className="text-muted-foreground text-lg">first year</span>
                          <span className="text-muted-foreground line-through">$39</span>
                        </span>
                        <span className="text-xs font-semibold text-accent-foreground bg-accent rounded px-2 py-1 mt-2 self-start">Black Friday: 50% off until {BF_SALE.deadlineLabel}</span>
                        <span className="text-xs text-muted-foreground mt-1">Then $39/year. Cancel anytime.</span>
                      </span>
                    ) : (
                    <>
                      <span className="text-5xl font-heading font-bold text-foreground">$39</span>
                      <span className="text-muted-foreground text-lg">/year</span>
                    </>
                    )
                  )}
                </div>
                <div className="inline-block bg-secondary text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20 mt-2">
                  {chargeNow ? 'Your free days are over' : plan.basis === 'standard_14' ? 'First 14 days free' : `Free until ${firstCharge}`} &middot; {chargeNow ? `${price} today` : '$0 today'}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Free',
                  'Kroger cart push',
                  'Priority support',
                  'Family texting: everyone votes on the week by text',
                  'A profile for each person',
                  'Text reminders on cook nights',
                  'Cancel anytime',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? 'Opening secure checkout...' : 'Add a card to keep Family →'}
              </button>

              {error && (
                <p className="mt-3 text-sm text-destructive text-center">{error}</p>
              )}

              <p className="text-sm text-muted-foreground text-center mt-4 leading-snug">
                {chargeNow
                  ? <>Your free Family days are over, so the first charge of {price} is today. Cancel any time from Account.</>
                  : <>A card is needed only to keep Family after your free days. $0 today. First charge of {price} on {firstCharge}{plan.basis === 'free_days' ? ', the day your free Family days end,' : ''} unless you cancel.{plan.basis === 'free_days_min_48h' ? '' : ' We email you 3 days before.'}</>}
              </p>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Payments processed by Stripe &middot; We never see your card number &middot; sarah@dinnerdrop.app
              </p>
            </div>

            <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SubscribeContent />
    </Suspense>
  )
}
