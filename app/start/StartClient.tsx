'use client'

import ReceiptRewardBanner from '@/components/ReceiptRewardBanner'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { promoLength } from '@/lib/promo-length'
import StorePriceExample from '@/components/StorePriceExample'
import { InstacartCarrot, PoweredByInstacart } from '@/components/InstacartMark'
import FamilyTextingSection from '@/components/FamilyTextingSection'
import SocialLinks from '@/components/SocialLinks'

// Primary conversion page for ads and campaigns.
// Offer (Nov 22 2026 review, Sarah approved): Free forever, no card: unlimited plans + one-tap Instacart or Walmart cart.
// Family: every new account gets 14 days of Family free with no card. A card is asked only to keep Family after
// day 14 ($4.99/mo or $39/yr). So every "Start" button goes to free sign-up; the card path (FAMILY_HREF) is a small
// secondary link for people who already know they want to keep Family.
// Flow: /start → /signup → /dashboard (free, Family included for 14 days) or → /subscribe?auto=1 → Stripe Checkout.
const FREE_HREF = '/signup?redirect=' + encodeURIComponent('/dashboard')
const FAMILY_HREF = '/signup?redirect=' + encodeURIComponent('/subscribe?auto=1')

const GREEN = '#1a5c38'
const GOLD = '#e8a838'

// Nov 22 2026 review, Sarah approved: the name makes some people think we deliver meals. Say plainly that we don't,
// near the top, on every version of this page.
const NOT_DELIVERY = "We don't deliver food. We plan your week and send your grocery list."

function PromoBanner() {
  const params = useSearchParams()
  const code = (params.get('code') || params.get('promo') || '').toUpperCase()
  const [promo, setPromo] = useState<{ code: string; days: number; label: string } | null>(null)
  useEffect(() => {
    if (!code) return
    fetch(`/api/promo/check?code=${encodeURIComponent(code)}`).then((r) => r.json()).then((j) => { if (j?.ok) setPromo(j) }).catch(() => {})
  }, [code])
  if (!promo) return null
  // Nov 27 2026: FRIENDS is 730 days, which must read "2 years", not "a year".
  const length = promoLength(promo.days)
  return (
    <div className="mx-auto max-w-2xl mb-5 sm:mb-6 rounded-2xl border-2 px-5 py-4 text-left shadow-sm" style={{ borderColor: GOLD, backgroundColor: '#fff8e8' }}>
      <p className="text-sm font-bold" style={{ color: GREEN }}>{promo.label.startsWith('A gift') ? `${promo.label}: ${length} of the Family plan, no card needed.` : `Code ${promo.code} is on: ${length} of the Family plan free, no card needed.`}</p>
      <p className="text-sm text-gray-700 mt-1">Sign up below and it applies automatically: family texting, per-person profiles and reminders, on top of the free plans and your one-tap grocery cart. When it ends you go back to the free plan. There is nothing to cancel.</p>
    </div>
  )
}

// Headline that matches the ad that sent them (Nov 21 2026 review; texting angle added Nov 22 2026, Sarah approved):
// ?angle=vote|512|texting, or a utm_content naming it. Order matters: "vote" and "512" win over "text".
type Angle = 'vote' | '512' | 'texting' | null
function adAngle(): Angle {
  try {
    const q = new URLSearchParams(window.location.search)
    const a = (q.get('angle') || q.get('utm_content') || '').toLowerCase()
    if (/vote/.test(a)) return 'vote'
    if (/512|5-12|5:12/.test(a)) return '512'
    if (/text/.test(a)) return 'texting'
  } catch { /* ignore */ }
  return null
}

function Hero({ angle }: { angle: Angle }) {
  const h1 = 'text-4xl sm:text-6xl font-bold leading-tight mb-3 sm:mb-4'
  const sub = 'text-sm sm:text-base font-semibold text-gray-700 max-w-xl mx-auto leading-relaxed mb-3'
  let title: string
  let body: ReactNode
  if (angle === 'vote') {
    title = 'Your family picks dinner by text. You tap once to shop.'
    body = <>Every week DinnerDrop texts everyone in your house a few dinner ideas. They reply with numbers, the top picks become your week, and the whole grocery list goes to <strong>your Instacart or Walmart cart</strong> in one tap. Planning is free forever. Family texting is free for your first 14 days, no card, then $4.99/month if you keep it.</>
  } else if (angle === '512') {
    title = 'It’s 5:12pm. Dinner’s already decided.'
    body = <>Plan the whole week in about two minutes: five weeknight dinners for your family, and the grocery list in <strong>your Instacart or Walmart cart</strong> in one tap. Free, no card.</>
  } else if (angle === 'texting') {
    title = 'Everyone texts in their dinner votes and groceries. You tap once to shop.'
    body = <>Each week the family gets dinner ideas by text and replies with the numbers they want. Anyone can text &ldquo;add granola bars&rdquo; and it lands on one grocery list. One tap sends it all to <strong>your Instacart or Walmart cart</strong>. Family texting is free for your first 14 days, no card. Planning stays free after that.</>
  } else {
    title = 'Your week of family dinners, planned free.'
    body = <>Five weeknight dinners for your family and budget, and the whole grocery list in <strong>your Instacart or Walmart cart</strong> in one tap. Free forever, no card.</>
  }
  return (
    <>
      <h1 className={h1} style={{ color: GREEN }}>{title}</h1>
      <p className={sub}>{body}</p>
      <p className="text-sm sm:text-base font-bold max-w-xl mx-auto mb-5" style={{ color: GREEN }}>{NOT_DELIVERY}</p>
    </>
  )
}

export default function StartPage() {
  const [angle, setAngle] = useState<Angle>(null)
  useEffect(() => { setAngle(adAngle()) }, [])
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />
            <span className="font-heading font-bold text-xl" style={{ color: GREEN }}>DinnerDrop</span>
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
          {/* "Over 700" checked Nov 25 2026: 800 profiles, 8 of them internal @dinnerdrop.app test accounts (read-only count). */}
          <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border" style={{ backgroundColor: '#fef9ee', borderColor: GOLD, color: GREEN }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: GOLD }} />
            Over 700 families have signed up for DinnerDrop
          </span>
        </div>
        <Suspense fallback={null}><PromoBanner /></Suspense>
        <ReceiptRewardBanner variant="start" />
        <Hero angle={angle} />

        {/* Primary CTA, above the fold on mobile */}
        <div className="flex flex-col items-center gap-2 mb-6 sm:mb-8">
          <Link href={FREE_HREF} className="px-10 py-4 rounded-xl text-white font-bold text-lg transition-colors shadow-sm hover:opacity-90 w-full sm:w-auto" style={{ backgroundColor: GREEN }}>
            Start free, no card needed &rarr;
          </Link>
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2 flex-wrap">
            <InstacartCarrot height={14} /> Works with Instacart (and every store on it) and Walmart, free forever &middot; Kroger cart on Family &middot; Family free for your first 14 days, no card
          </p>
        </div>

        {/* Real app screens (Nov 22 2026 review: no paid landing page showed the product). Cropped from the App Store
            screenshots in apps/mobile/store/screenshots (Oct 20 2026), with the marketing headline above each one removed. */}
        <figure className="mx-auto max-w-md mb-10 sm:mb-12">
          <div className="grid grid-cols-2 gap-3">
            <Image
              src="/app-week-plan.jpg"
              alt="Screenshot of the DinnerDrop app's weekly plan page: This week's dinners, 5 dinners planned around your budget, with Monday's Instant Pot Beef and Potato Stew"
              width={640}
              height={1044}
              sizes="(max-width: 640px) 45vw, 220px"
              className="w-full h-auto rounded-2xl border shadow-sm bg-white"
              style={{ borderColor: '#e8e8e8' }}
            />
            <Image
              src="/app-grocery-list.jpg"
              alt="Screenshot of the DinnerDrop grocery list page: a budget bar, a Shop ingredients button that opens Instacart, and a Connect Kroger button"
              width={640}
              height={1044}
              sizes="(max-width: 640px) 45vw, 220px"
              className="w-full h-auto rounded-2xl border shadow-sm bg-white"
              style={{ borderColor: '#e8e8e8' }}
            />
          </div>
          <figcaption className="text-xs text-gray-500 mt-3 leading-snug">
            Real screens from the DinnerDrop app (October 2026): your week of dinners, and the grocery list with its one-tap cart button.
          </figcaption>
        </figure>

        <p className="text-base sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed mb-10 sm:mb-12">
          Tell us your family size, budget, and how long you have to cook. Every week you get five dinners planned around your family and one combined grocery list, ready for your <strong>Instacart</strong> or <strong>Walmart</strong> cart (or your Kroger cart on Family).
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 text-left">
          {[
            { title: 'Unlimited weekly plans', desc: 'Weeknight dinners planned for you every week, around your family size, budget, and dietary needs.' },
            { title: 'One tap, in your cart', desc: 'Your full list loads into Instacart (any store on it) or your Walmart cart. You review the items and check out there. On the Family plan, it can go straight to your Kroger cart.' },
            { title: 'Built to your budget', desc: 'Set a weekly number. Every plan is built to fit it, with overlapping ingredients so less goes to waste.' },
          ].map((benefit) => (
            <div key={benefit.title} className="p-5 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
              <h3 className="font-bold text-sm mb-1" style={{ color: GREEN }}>{benefit.title}</h3>
              <p className="text-sm text-gray-500">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* Cart mechanics: the question every parent asks */}
        <div className="rounded-2xl border bg-white p-5 mb-12 text-left text-sm text-gray-600 leading-relaxed" style={{ borderColor: '#e8e8e8' }}>
          <p className="font-bold mb-1" style={{ color: GREEN }}>How the cart works</p>
          DinnerDrop fills the cart in your own Instacart, Walmart or Kroger account. You review every item and check out there at that store&apos;s prices (plus any of their fees). The store delivers it or you pick it up. We never charge your grocery account and never mark anything up.
        </div>

        {/* Who builds it. The three quotes that were here were placeholders from the first code scaffold (Mar 14 2026),
            not real families, and were removed (Nov 22 2026 review, Sarah approved). Add real quotes only with permission. */}
        <div className="rounded-2xl border bg-white p-5 mb-4 text-left text-sm text-gray-600 leading-relaxed" style={{ borderColor: '#e8e8e8' }}>
          Built by Sarah, a parent who got tired of the 5pm scramble of deciding what to make. Questions before you sign up? Write to her at{' '}
          <a href="mailto:sarah@dinnerdrop.app" className="font-semibold underline" style={{ color: GREEN }}>sarah@dinnerdrop.app</a>.
        </div>
        <p className="text-xs text-gray-500 mb-12">
          DinnerDrop plans around your saved dietary preferences. Always check ingredient labels before cooking or checkout.
        </p>

        {/* Pricing */}
        <section id="pricing" className="text-left mb-4">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ color: GREEN }}>Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-7 rounded-2xl border bg-white space-y-5" style={{ borderColor: '#e8e8e8' }}>
              <h3 className="font-bold" style={{ color: GREEN }}>Free</h3>
              <p className="text-4xl font-bold text-gray-900">$0<span className="text-sm font-normal text-gray-500"> forever</span></p>
              <ul className="space-y-2 text-sm text-gray-600">
                {['Unlimited weekly dinner plans', 'Diets and allergies checked on every dinner', 'Deduplicated grocery list', 'One-tap Instacart or Walmart cart', 'Swap any dinner', 'Pantry scan', 'Favorites and meal history'].map((li) => (
                  <li key={li} className="flex items-start gap-2"><span style={{ color: GREEN }}>✓</span>{li}</li>
                ))}
              </ul>
              <Link href={FREE_HREF} className="block text-center px-4 py-3 rounded-xl border font-semibold transition-colors" style={{ borderColor: GREEN, color: GREEN }}>
                Start free, no card
              </Link>
            </div>
            <div className="p-7 rounded-2xl border-2 bg-white space-y-5 relative shadow-lg" style={{ borderColor: GREEN }}>
              <div className="absolute -top-3 left-6 px-3 py-0.5 text-xs font-bold rounded-full" style={{ backgroundColor: GOLD, color: '#111' }}>For the whole family</div>
              <h3 className="font-bold" style={{ color: GREEN }}>Family</h3>
              <div>
                <p className="text-4xl font-bold text-gray-900">$4.99<span className="text-sm font-normal text-gray-500">/month</span></p>
                <p className="text-sm text-gray-600 mt-1">or $39/year &middot; first 14 days free, no card &middot; cancel anytime</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                {['Everything in Free', 'Family texting: the week’s dinner ideas go to everyone by text, they reply with the numbers they want, the top picks become the week', 'A profile for each person: likes, won’t-eats, kid-safe foods', 'Anyone can text an item (or a photo of one) onto the grocery list', 'Text reminders on your cook nights', 'Push straight to your Kroger cart', 'Priority support, answered by the founder'].map((li) => (
                  <li key={li} className="flex items-start gap-2"><span style={{ color: GREEN }}>✓</span>{li}</li>
                ))}
              </ul>
              <Link href={FREE_HREF} className="block text-center px-4 py-3 rounded-xl text-white font-semibold transition-colors hover:opacity-90" style={{ backgroundColor: GREEN }}>
                Start free with 14 days of Family &rarr;
              </Link>
              <p className="text-sm text-gray-600 leading-snug">
                Every new family gets Family free for the first 14 days. No card. To keep it after day 14, add a card from Account: $4.99/month or $39/year, cancel in one tap. We email you 3 days before your free Family days end.
              </p>
              <p className="text-xs text-gray-500 leading-snug">
                Already know you want to keep it? <Link href={FAMILY_HREF} className="underline font-semibold" style={{ color: GREEN }}>Add a card now</Link>. $0 today.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Real store prices */}
      <StorePriceExample ctaHref="/signup" tone="cream" />

      {/* How it works */}
      <FamilyTextingSection ctaHref={FREE_HREF} />

      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: GREEN }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { step: '1', title: 'A few quick taps about your family', desc: 'Who’s eating, what they like, your nights and your budget. About a minute, and you can skip ahead to your dinners anytime.' },
            { step: '2', title: 'Get your 5-dinner plan', desc: 'Every week you get a dinner plan built around what your family actually eats.' },
            { step: '3', title: 'One tap to your cart', desc: 'Your full grocery list opens in your Instacart cart or fills your Walmart cart. Review it and check out there.' },
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
          Start free, no card needed &rarr;
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
              q: 'Does DinnerDrop deliver food?',
              a: 'No. We don’t deliver food. DinnerDrop plans your week and sends your grocery list to your own Instacart, Walmart or Kroger cart. You check out there, and the store delivers it or you pick it up.',
            },
            {
              q: 'Is it really free?',
              a: 'Yes. Unlimited weekly dinner plans, the grocery list, and the one-tap Instacart and Walmart carts are free, with no card. Instacart pays us a small commission when you shop through DinnerDrop, at no extra cost to you. That is what keeps the free plan free.',
            },
            {
              q: 'What does Family add, and what does it cost?',
              a: 'Every new family gets Family free for the first 14 days, no card. It adds family texting (the week’s dinner ideas go to everyone by text, they reply with numbers, the top picks become the week, and anyone can text an item onto the list), a profile for each person, text reminders, the Kroger cart push, and priority support. To keep it after day 14, add a card from Account: $4.99/month or $39/year. If you don’t, you go back to the free plan.',
            },
            {
              q: 'Will I be charged by surprise?',
              a: 'No. Your free Family days need no card, so nothing can be charged. If you add a card to keep Family, we email you 3 days before your free Family days end, and the Account page shows your exact billing date. Cancel in one tap from Account, no calls. Payments are processed by Stripe; we never see or store your card number.',
            },
            {
              q: 'Does the Instacart cart really work in one tap?',
              a: 'Yes. DinnerDrop is built on the Instacart Developer Platform. Tap “Shop ingredients” and your full, deduplicated list opens in Instacart with the items pre-loaded. You pick your store, review the items, and check out at Instacart’s prices for that store. We add nothing.',
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
      <p className="container mx-auto px-4 max-w-3xl text-center text-xs text-gray-500 pb-8">Works on your phone: get the iPhone app, or open dinnerdrop.app in Safari or Chrome and tap <em>Add to Home Screen</em>.</p>
      <footer className="border-t border-gray-200 bg-white mt-20 pb-20 sm:pb-0">
        <div className="container mx-auto px-4 py-6 max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
            <span className="font-heading font-bold text-sm" style={{ color: GREEN }}>DinnerDrop</span>
          </div>
          <p>&copy; 2026 DinnerDrop</p>
          <SocialLinks />
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

      {/* Mobile sticky bottom CTA: most traffic is mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
        <Link
          href={FREE_HREF + '&cta=mobile_sticky'}
          className="block w-full text-center px-6 py-3 rounded-xl text-white font-bold text-base"
          style={{ backgroundColor: GREEN }}
        >
          Start free, no card needed &rarr;
        </Link>
        <p className="text-center text-[13px] text-gray-600 mt-1">Free forever &middot; Family free for 14 days, no card</p>
      </div>
    </div>
  )
}
