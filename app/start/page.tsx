'use client'

import Link from 'next/link'
import RecentSignupsTicker from '@/components/RecentSignupsTicker'

// Primary conversion page (replaces /beta as the CTA target, 2026-10-16).
// Offer: 14-day free trial → $9/mo, card at signup, cancel anytime.
// Flow: /start → /signup (instant, email only) → /subscribe?auto=1 → Stripe Checkout.
const TRIAL_HREF = '/signup?redirect=' + encodeURIComponent('/subscribe?auto=1')

export default function StartPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e8a838' }} />
            <span className="font-bold text-xl" style={{ color: '#1a5c38' }}>DinnerDrop</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
              Sign in
            </Link>
            <Link href={TRIAL_HREF} className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#1a5c38' }}>
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-8 sm:py-20 max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-4 sm:mb-6" style={{ backgroundColor: '#fef9ee', borderColor: '#e8a838', color: '#1a5c38' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: '#e8a838' }} />
          Over 200 families already plan dinner with DinnerDrop
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-3 sm:mb-4" style={{ color: '#1a5c38' }}>
          Dinner, handled. <span style={{ color: '#e8a838' }}>Try it free for 14 days.</span>
        </h1>
        <p className="text-sm sm:text-base font-semibold text-gray-700 max-w-xl mx-auto leading-relaxed mb-5">
          $0 today · $9/month after your trial · cancel in one tap
        </p>

        {/* Primary CTA — above the fold on mobile */}
        <div className="flex flex-col items-center gap-2 mb-6 sm:mb-8">
          <Link href={TRIAL_HREF} className="px-10 py-4 rounded-xl text-white font-bold text-lg transition-colors shadow-sm hover:opacity-90 w-full sm:w-auto" style={{ backgroundColor: '#1a5c38' }}>
            Start my 14-day free trial &rarr;
          </Link>
          <p className="text-xs text-gray-400">
            Card required to start · Nothing charged for 14 days · Cancel anytime
          </p>
        </div>

        <p className="text-base sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed mb-8">
          Five weeknight dinners planned for your family and budget. Tap once and your whole grocery list lands in your <strong>Instacart</strong> cart, ready to check out.
        </p>

        {/* Live recent-signups ticker — hides gracefully when the feed is empty */}
        <div className="mb-10 sm:mb-12">
          <RecentSignupsTicker />
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 text-left">
          {[
            { icon: '🗓️', title: 'Unlimited meal plans', desc: 'AI-planned weeknight dinners every week, personalized to your family size, budget, and dietary needs.' },
            { icon: '🛒', title: 'One tap, in your cart', desc: 'Your full list auto-loads into Instacart — pick your store, check out, done. Or push straight to your Kroger cart.' },
            { icon: '💰', title: 'Built to your budget', desc: 'Set a weekly number. Every plan is built to hit it, with overlapping ingredients so nothing goes to waste.' },
          ].map((benefit) => (
            <div key={benefit.title} className="p-5 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
              <div className="text-2xl mb-3">{benefit.icon}</div>
              <h3 className="font-bold text-sm mb-1" style={{ color: '#1a5c38' }}>{benefit.title}</h3>
              <p className="text-sm text-gray-500">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
          {[
            { quote: "45 minutes deciding what to cook — now it's zero.", name: "James L.", label: "Family of 2" },
            { quote: "It respects our dietary preferences, which makes weekly planning so much easier.", name: "Priya K.", label: "Family of 3" },
            { quote: "The grocery list dropping straight into my Instacart cart is the feature I didn't know I needed.", name: "Amanda R.", label: "Working parent, Colorado" },
          ].map((t) => (
            <div key={t.name} className="p-4 rounded-2xl border bg-white text-sm" style={{ borderColor: '#e8e8e8' }}>
              <p className="text-gray-600 leading-relaxed mb-3 italic">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-bold text-xs" style={{ color: '#1a5c38' }}>{t.name}</p>
              <p className="text-xs text-gray-400">{t.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 -mt-6 mb-10">
          DinnerDrop plans around your saved dietary preferences — always check ingredient labels before cooking or checkout.
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <Link href={TRIAL_HREF} className="px-10 py-4 rounded-xl text-white font-bold text-lg transition-colors shadow-sm hover:opacity-90" style={{ backgroundColor: '#1a5c38' }}>
            Start my 14-day free trial &rarr;
          </Link>
          <p className="text-xs text-gray-400">
            Nothing charged for 14 days. After that, $9/month if you keep it.<br />Cancel anytime from your account — no calls, no fine print.
          </p>
        </div>
      </main>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#1a5c38' }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { step: '1', title: 'Tell us about your family', desc: 'Household size, budget, cook time, and any dietary needs in a quick 2-minute setup — or skip it and get a plan right away.' },
            { step: '2', title: 'Get your 5-dinner plan', desc: 'Every week, AI builds a personalized dinner plan around what your family actually eats.' },
            { step: '3', title: 'One tap to your cart', desc: 'Your full grocery list drops straight into your Instacart cart in one tap — or push to your Kroger cart via your account.' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: '#1a5c38' }}>
                {item.step}
              </div>
              <h3 className="font-bold text-base" style={{ color: '#1a5c38' }}>{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="container mx-auto px-4 py-10 max-w-3xl text-center">
        <p className="text-gray-500 text-sm mb-4">Two weeks of dinners, on us. See if it sticks.</p>
        <Link
          href={TRIAL_HREF}
          className="inline-block px-8 py-3 rounded-xl text-white font-bold text-base transition-colors shadow-sm hover:opacity-90"
          style={{ backgroundColor: '#1a5c38' }}
        >
          Start my 14-day free trial &rarr;
        </Link>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 pb-16 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#1a5c38' }}>
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: 'Do I need a credit card?',
              a: 'Yes — you add a card to start your trial, and nothing is charged for 14 days. If you cancel before day 14 you pay $0. We email you 3 days before your trial ends so there are no surprises.',
            },
            {
              q: 'What happens after 14 days?',
              a: 'Your plan continues at $9/month. Cancel anytime from your Account page in one tap — no calls, no hoops.',
            },
            {
              q: 'Does the Instacart cart really work in one tap?',
              a: 'Yes. DinnerDrop is built on the Instacart Developer Platform. Tap “Shop ingredients” and your full, deduplicated list opens in Instacart with every item pre-loaded — you pick your store and check out. Kroger shoppers can push directly to their Kroger cart.',
            },
            {
              q: 'What if my family is picky?',
              a: 'Swap any dinner in one tap and DinnerDrop learns what you keep and what you skip. Dietary needs (gluten-free, dairy-free, vegetarian, nut allergies, and more) are respected on every plan.',
            },
          ].map((item) => (
            <div key={item.q} className="p-6 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
              <h3 className="font-bold text-base mb-2" style={{ color: '#1a5c38' }}>{item.q}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-20">
        <div className="container mx-auto px-4 py-6 max-w-5xl flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#e8a838' }} />
            <span className="font-bold text-sm" style={{ color: '#1a5c38' }}>DinnerDrop</span>
          </div>
          <p>&copy; 2026 DinnerDrop</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

      {/* Mobile sticky bottom CTA — 92% of traffic is mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
        <Link
          href={TRIAL_HREF + '&utm_source=mobile_sticky'}
          className="block w-full text-center px-6 py-3 rounded-xl text-white font-bold text-base"
          style={{ backgroundColor: '#1a5c38' }}
        >
          Start my 14-day free trial &rarr;
        </Link>
      </div>
    </div>
  )
}
