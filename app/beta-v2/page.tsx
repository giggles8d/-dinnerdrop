'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function BetaV2Page() {
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/stripe/beta-spots')
      .then((res) => res.json())
      .then((data) => setSpotsRemaining(data.spotsRemaining))
      .catch(() => setSpotsRemaining(100))
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e8a838' }} />
            <span className="font-bold text-xl" style={{ color: '#1a5c38' }}>DinnerDrop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
              Sign in
            </Link>
            <Link href="/subscribe?coupon=BETA100" className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#1a5c38' }}>
              Try free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20 max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-6" style={{ backgroundColor: '#fef9ee', borderColor: '#e8a838', color: '#1a5c38' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#e8a838' }} />
          {spotsRemaining !== null ? `${spotsRemaining} beta spots left` : 'Limited spots available'}
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-4" style={{ color: '#1a5c38' }}>
          Dinner, handled.
        </h1>
        <p className="text-2xl font-semibold mb-6" style={{ color: '#e8a838' }}>
          5 dinners planned in 30 seconds. Groceries sent to your store in one tap.
        </p>
        <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
          Join 100 families getting <strong>6 months completely free</strong> — then just $9/month. No credit card to start.
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col items-center gap-3 mb-14">
          <Link
            href="/subscribe?coupon=BETA100"
            className="px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-md hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#e8a838', color: '#1a3a20' }}
          >
            Start my free trial &rarr;
          </Link>
          <p className="text-xs text-gray-400">
            No credit card required · 6 months free · Cancel anytime
          </p>
        </div>

        {/* Social proof — outcome-focused "quotes" */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12 text-left">
          {[
            {
              quote: '"I used to spend 45 minutes every Sunday just figuring out what to cook. Now it\'s done before my coffee gets cold."',
              name: 'Amanda R.',
              detail: 'Mom of 3, beta tester',
            },
            {
              quote: '"The grocery handoff to Walmart is the part I didn\'t know I needed. No more forgetting half the list."',
              name: 'James K.',
              detail: 'Dad, busy schedule',
            },
            {
              quote: '"Finally an app that doesn\'t just give me recipes — it actually plans the week and orders the food."',
              name: 'Priya M.',
              detail: 'Working parent, beta tester',
            },
          ].map((item) => (
            <div key={item.name} className="p-5 rounded-2xl border bg-white flex flex-col gap-3" style={{ borderColor: '#e8e8e8' }}>
              <p className="text-sm text-gray-600 italic leading-relaxed flex-1">{item.quote}</p>
              <div>
                <p className="text-sm font-bold" style={{ color: '#1a5c38' }}>{item.name}</p>
                <p className="text-xs text-gray-400">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Spots progress bar */}
        {spotsRemaining !== null && (
          <div className="mb-10">
            <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-xs mx-auto">
              <div
                className="h-2.5 rounded-full transition-all"
                style={{ backgroundColor: '#e8a838', width: `${Math.max(5, 100 - spotsRemaining)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">
              {100 - spotsRemaining} of 100 beta spots claimed — {spotsRemaining} remaining
            </p>
          </div>
        )}

        {/* One ask */}
        <div className="inline-flex items-start gap-3 px-5 py-4 rounded-xl border text-sm text-left max-w-md mx-auto" style={{ backgroundColor: '#fef9ee', borderColor: '#e8a838' }}>
          <span className="text-base mt-0.5">📋</span>
          <p className="text-gray-600">
            <strong style={{ color: '#1a5c38' }}>One ask:</strong> Fill out a 5-minute feedback survey at 30 days. That&apos;s the only thing we need from you.
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
            { step: '1', title: '2-minute setup', desc: 'Tell us your household size, budget, cook time, and dietary needs. Done once, used forever.' },
            { step: '2', title: 'Your 5-dinner plan arrives', desc: 'Every week, AI generates dinners your family will actually eat — no more "what\'s for dinner?" stress.' },
            { step: '3', title: 'One tap to your store', desc: 'Send the full grocery list to Walmart, Amazon Fresh, Kroger, Target, or Instacart instantly.' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg" style={{ backgroundColor: '#e8a838', color: '#1a3a20' }}>
                {item.step}
              </div>
              <h3 className="font-bold text-base" style={{ color: '#1a5c38' }}>{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="container mx-auto px-4 pb-10 max-w-xl text-center">
        <Link
          href="/subscribe?coupon=BETA100"
          className="inline-block px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-md hover:opacity-90"
          style={{ backgroundColor: '#e8a838', color: '#1a3a20' }}
        >
          Start my free trial &rarr;
        </Link>
        <p className="text-xs text-gray-400 mt-3">No credit card · 6 months free · $9/month after · Cancel anytime</p>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 pb-16 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#1a5c38' }}>
          Questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: 'Is this actually free for 6 months?',
              a: 'Yes — no credit card required to start. The beta is 100% free for your first 6 months. After that, DinnerDrop is $9/month. You\'ll get an email reminder before the trial ends and can cancel any time.',
            },
            {
              q: 'Which stores do you support?',
              a: 'Walmart, Amazon Fresh, Kroger, Target, and Instacart. You pick your preferred store during setup. One tap sends your full weekly grocery list directly into your cart.',
            },
            {
              q: 'What do you need from me?',
              a: 'Just a 5-minute feedback survey at the 30-day mark. Your input directly shapes what we build — beta members have a direct line to the founder.',
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
      <footer className="border-t border-gray-200 bg-white mt-10">
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
    </div>
  )
}
