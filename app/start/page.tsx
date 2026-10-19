'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import StorePriceExample from '@/components/StorePriceExample'
import { InstacartCarrot, PoweredByInstacart } from '@/components/InstacartMark'
import FamilyTextingSection from '@/components/FamilyTextingSection'

// Primary conversion page for ads and campaigns.
// Offer (2026-10-18): Free forever, no card — unlimited plans + one-tap Instacart cart.
// Family: $4.99/mo or $39/yr, 14-day free trial, card at signup, cancel anytime.
// Flow: /start → /signup → /dashboard (free) or → /subscribe?auto=1 → Stripe Checkout (Family).
const FREE_HREF = '/signup?redirect=' + encodeURIComponent('/dashboard')
const FAMILY_HREF = '/signup?redirect=' + encodeURIComponent('/subscribe?auto=1')

const GREEN = '#1a5c38'
const GOLD = '#e8a838'

function PromoBanner() {
  const params = useSearchParams()
  const code = (params.get('code') || params.get('promo') || '').toUpperCase()
  const [promo, setPromo] = useState<{ code: string; days: number; label: string } | null>(null)
  useEffect(() => {
    if (!code) return
    fetch(`/api/promo/check?code=${encodeURIComponent(code)}`).then((r) => r.json()).then((j) => { if (j?.ok) setPromo(j) }).catch(() => {})
  }, [code])
  if (!promo) return null
  const months = Math.round(promo.days / 30)
  return (
    <div className="mx-auto max-w-2xl mb-5 sm:mb-6 rounded-2xl border-2 px-5 py-4 text-left shadow-sm" style={{ borderColor: GOLD, backgroundColor: '#fff8e8' }}>
      <p className="text-sm font-bold" style={{ color: GREEN }}>Code {promo.code} is on — {months} month{months === 1 ? '' : 's'} of the Family plan free, no card needed.</p>
      <p className="text-sm text-gray-700 mt-1">Sign up below and it applies automatically: family texting, per-person profiles and reminders, on top of the free plans and your one-tap Instacart cart. Nothing to cancel when it ends — you just go back to the free plan.</p>
    </div>
  )
}

export default function StartPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />
            <span className="font-bold text-xl" style={{ color: GREEN }}>DinnerDrop</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
              Sign in
            </Link>
            <Link href={FREE_HREF} className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: GREEN }}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-8 sm:py-20 max-w-3xl text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4 sm:mb-6">
          <PoweredByInstacart />
          <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border" style={{ backgroundColor: '#fef9ee', borderColor: GOLD, color: GREEN }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: GOLD }} />
            Over 200 families plan dinner with DinnerDrop
          </span>
        </div>
        <Suspense fallback={null}><PromoBanner /></Suspense>
        <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-3 sm:mb-4" style={{ color: GREEN }}>
          Dinner, handled. <span style={{ color: GOLD }}>Free.</span>
        </h1>
        <p className="text-sm sm:text-base font-semibold text-gray-700 max-w-xl mx-auto leading-relaxed mb-5">
          Five weeknight dinners planned for your family, and your whole grocery list in <strong>your Instacart cart</strong> in one tap. No card needed.
        </p>

        {/* Primary CTA — above the fold on mobile */}
        <div className="flex flex-col items-center gap-2 mb-6 sm:mb-8">
          <Link href={FREE_HREF} className="px-10 py-4 rounded-xl text-white font-bold text-lg transition-colors shadow-sm hover:opacity-90 w-full sm:w-auto" style={{ backgroundColor: GREEN }}>
            Start free &mdash; no card needed &rarr;
          </Link>
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2 flex-wrap">
            <InstacartCarrot height={14} /> Works with your Instacart account and every store on it &middot; Free forever &middot; Family plan $4.99/month, 14 days free
          </p>
        </div>

        <p className="text-base sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed mb-10 sm:mb-12">
          Tell us your family size, budget, and how long you have to cook. Every week you get five dinners your family will actually eat and one deduplicated list &mdash; ready for <strong>Instacart</strong> or your <strong>Kroger</strong> cart.
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 text-left">
          {[
            { icon: '🗓️', title: 'Unlimited weekly plans', desc: 'AI-planned weeknight dinners every week, personalized to your family size, budget, and dietary needs.' },
            { icon: '🛒', title: 'One tap, in your cart', desc: 'Your full list auto-loads into Instacart — pick your store, review, check out. Family members can push straight to a Kroger cart.' },
            { icon: '💰', title: 'Built to your budget', desc: 'Set a weekly number. Every plan is built to fit it, with overlapping ingredients so nothing goes to waste.' },
          ].map((benefit) => (
            <div key={benefit.title} className="p-5 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
              <div className="text-2xl mb-3">{benefit.icon}</div>
              <h3 className="font-bold text-sm mb-1" style={{ color: GREEN }}>{benefit.title}</h3>
              <p className="text-sm text-gray-500">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* Cart mechanics — the question every parent asks */}
        <div className="rounded-2xl border bg-white p-5 mb-12 text-left text-sm text-gray-600 leading-relaxed" style={{ borderColor: '#e8e8e8' }}>
          <p className="font-bold mb-1" style={{ color: GREEN }}>How the cart works</p>
          DinnerDrop fills the cart in your own Instacart or Kroger account. You review every item and check out there at Instacart&apos;s or Kroger&apos;s prices for that store (plus their fees). We never charge your grocery account and never mark anything up.
        </div>

        {/* Social proof */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-left">
          {[
            { quote: "45 minutes deciding what to cook — now it's zero.", name: 'James L.', label: 'Family of 2' },
            { quote: 'It respects our dietary preferences, which makes weekly planning so much easier.', name: 'Priya K.', label: 'Family of 3' },
            { quote: "The grocery list dropping straight into my Instacart cart is the feature I didn't know I needed.", name: 'Amanda R.', label: 'Working parent, Colorado' },
          ].map((t) => (
            <div key={t.name} className="p-4 rounded-2xl border bg-white text-sm" style={{ borderColor: '#e8e8e8' }}>
              <p className="text-gray-600 leading-relaxed mb-3 italic">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-bold text-xs" style={{ color: GREEN }}>{t.name}</p>
              <p className="text-xs text-gray-500">{t.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mb-12">
          DinnerDrop plans around your saved dietary preferences &mdash; always check ingredient labels before cooking or checkout.
        </p>

        {/* Pricing */}
        <section id="pricing" className="text-left mb-4">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ color: GREEN }}>Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-7 rounded-2xl border bg-white space-y-5" style={{ borderColor: '#e8e8e8' }}>
              <h3 className="font-bold" style={{ color: GREEN }}>Free</h3>
              <p className="text-4xl font-bold text-gray-900">$0<span className="text-sm font-normal text-gray-500"> forever</span></p>
              <ul className="space-y-2 text-sm text-gray-600">
                {['Unlimited weekly dinner plans', 'Deduplicated grocery list', 'One-tap Instacart cart', 'Swap any dinner', 'Pantry scan', 'Favorites and meal history'].map((li) => (
                  <li key={li} className="flex items-start gap-2"><span style={{ color: GREEN }}>✓</span>{li}</li>
                ))}
              </ul>
              <Link href={FREE_HREF} className="block text-center px-4 py-3 rounded-xl border font-semibold transition-colors" style={{ borderColor: GREEN, color: GREEN }}>
                Start free &mdash; no card
              </Link>
            </div>
            <div className="p-7 rounded-2xl border-2 bg-white space-y-5 relative shadow-lg" style={{ borderColor: GREEN }}>
              <div className="absolute -top-3 left-6 px-3 py-0.5 text-xs font-bold rounded-full" style={{ backgroundColor: GOLD, color: '#111' }}>For the whole family</div>
              <h3 className="font-bold" style={{ color: GREEN }}>Family</h3>
              <div>
                <p className="text-4xl font-bold text-gray-900">$4.99<span className="text-sm font-normal text-gray-500">/month</span></p>
                <p className="text-sm text-gray-600 mt-1">or $39/year &middot; 14-day free trial &middot; cancel anytime</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                {['Everything in Free', 'Family texting: the week’s dinner ideas go to everyone by text, they reply with the numbers they want, the top picks become the week', 'A profile for each person — likes, won’t-eats, allergies, kid-safe foods', 'Anyone can text an item (or a photo of one) onto the grocery list', 'Text reminders on your cook nights', 'Push straight to your Kroger cart', 'Priority support, answered by the founder'].map((li) => (
                  <li key={li} className="flex items-start gap-2"><span style={{ color: GREEN }}>✓</span>{li}</li>
                ))}
              </ul>
              <Link href={FAMILY_HREF} className="block text-center px-4 py-3 rounded-xl text-white font-semibold transition-colors hover:opacity-90" style={{ backgroundColor: GREEN }}>
                Try Family free for 14 days &rarr;
              </Link>
              <p className="text-sm text-gray-600 leading-snug">
                Card required for the Family trial. $0 today. We email you on day 11, three days before the first charge. Cancel in one tap from Account.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Real store prices */}
      <StorePriceExample ctaHref="/signup" tone="cream" />

      {/* How it works */}
      <FamilyTextingSection ctaHref={FAMILY_HREF} />

      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: GREEN }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { step: '1', title: 'Tell us about your family', desc: 'Household size, budget, cook time, and any dietary needs in a quick 2-minute setup — or skip it and get a plan right away.' },
            { step: '2', title: 'Get your 5-dinner plan', desc: 'Every week, AI builds a personalized dinner plan around what your family actually eats.' },
            { step: '3', title: 'One tap to your cart', desc: 'Your full grocery list opens in your Instacart cart with every item pre-loaded — you pick the store and check out.' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: GREEN }}>
                {item.step}
              </div>
              <h3 className="font-bold text-base" style={{ color: GREEN }}>{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="container mx-auto px-4 py-10 max-w-3xl text-center">
        <p className="text-gray-500 text-sm mb-4">Your first week of dinners takes two minutes.</p>
        <Link
          href={FREE_HREF}
          className="inline-block px-8 py-3 rounded-xl text-white font-bold text-base transition-colors shadow-sm hover:opacity-90"
          style={{ backgroundColor: GREEN }}
        >
          Start free &mdash; no card needed &rarr;
        </Link>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 pb-16 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: GREEN }}>
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: 'Is it really free?',
              a: 'Yes. Unlimited weekly dinner plans, the grocery list, and the one-tap Instacart cart are free, with no card. Instacart pays us a small commission when you shop through DinnerDrop, at no extra cost to you — that is what keeps the free plan free.',
            },
            {
              q: 'What does Family add, and what does it cost?',
              a: 'Family is $4.99/month or $39/year after a 14-day free trial. It adds family texting (the week’s dinner ideas go to everyone by text, they reply with numbers, the top picks become the week, and anyone can text an item onto the list), a profile for each person, text reminders, the Kroger cart push, and priority support. You add a card to start the trial; nothing is charged for 14 days.',
            },
            {
              q: 'Will I be charged by surprise?',
              a: 'No. We email you on day 11 of a Family trial, three days before the first charge, and the Account page shows your exact billing date. Cancel in one tap from Account — no calls, no hoops. Payments are processed by Stripe; we never see or store your card number.',
            },
            {
              q: 'Does the Instacart cart really work in one tap?',
              a: 'Yes. DinnerDrop is built on the Instacart Developer Platform. Tap “Shop ingredients” and your full, deduplicated list opens in Instacart with every item pre-loaded. You pick your store, review the items, and check out at Instacart’s prices for that store — we add nothing.',
            },
            {
              q: 'What if my family is picky?',
              a: 'Swap any dinner in one tap and DinnerDrop learns what you keep and what you skip. Dietary needs (gluten-free, dairy-free, vegetarian, nut allergies, and more) are respected on every plan.',
            },
          ].map((item) => (
            <div key={item.q} className="p-6 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
              <h3 className="font-bold text-base mb-2" style={{ color: GREEN }}>{item.q}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <p className="container mx-auto px-4 max-w-3xl text-center text-xs text-gray-500 pb-8">Works on your phone: open dinnerdrop.app in Safari or Chrome and tap <em>Add to Home Screen</em>. No app store, nothing to download.</p>
      <footer className="border-t border-gray-200 bg-white mt-20 pb-20 sm:pb-0">
        <div className="container mx-auto px-4 py-6 max-w-5xl flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
            <span className="font-bold text-sm" style={{ color: GREEN }}>DinnerDrop</span>
          </div>
          <p>&copy; 2026 DinnerDrop</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

      {/* Mobile sticky bottom CTA — most traffic is mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
        <Link
          href={FREE_HREF + '&utm_source=mobile_sticky'}
          className="block w-full text-center px-6 py-3 rounded-xl text-white font-bold text-base"
          style={{ backgroundColor: GREEN }}
        >
          Start free &mdash; no card needed &rarr;
        </Link>
        <p className="text-center text-[13px] text-gray-600 mt-1">Free forever &middot; Family $4.99/mo after a 14-day trial</p>
      </div>
    </div>
  )
}
