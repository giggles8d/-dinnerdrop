'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function BetaPage() {
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
            <Link href="/subscribe" className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#1a5c38' }}>
              Try free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20 max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-6" style={{ backgroundColor: '#fef9ee', borderColor: '#e8a838', color: '#1a5c38' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#e8a838' }} />
          Limited beta — {spotsRemaining !== null ? `${spotsRemaining} spots remaining` : 'Loading...'}
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6" style={{ color: '#1a5c38' }}>
          Join the DinnerDrop Beta
        </h1>
        <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed mb-12">
          First 100 families get <strong>6 months completely free</strong> — no credit card required to start.
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 text-left">
          {[
            { icon: '🗓️', title: 'Unlimited meal plans', desc: 'AI-planned weeknight dinners every week, personalized to your family.' },
            { icon: '🛒', title: 'One-tap grocery handoff', desc: 'Full grocery list sent directly to your favorite store in one tap.' },
            { icon: '💬', title: 'Direct line to the founder', desc: 'Your feedback shapes the product. You get a private channel to Sarah.' },
          ].map((benefit) => (
            <div key={benefit.title} className="p-5 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
              <div className="text-2xl mb-3">{benefit.icon}</div>
              <h3 className="font-bold text-sm mb-1" style={{ color: '#1a5c38' }}>{benefit.title}</h3>
              <p className="text-sm text-gray-500">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* One ask */}
        <div className="inline-flex items-start gap-3 px-5 py-4 rounded-xl border text-sm text-left mb-10 max-w-md mx-auto" style={{ backgroundColor: '#fef9ee', borderColor: '#e8a838' }}>
          <span className="text-base mt-0.5">📋</span>
          <p className="text-gray-600">
            <strong style={{ color: '#1a5c38' }}>One ask:</strong> Complete a 5-minute feedback survey after 30 days. That&apos;s it.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <Link href="/subscribe?coupon=BETA100" className="px-10 py-4 rounded-xl text-white font-bold text-lg transition-colors shadow-sm hover:opacity-90" style={{ backgroundColor: '#1a5c38' }}>
            Claim my free 6 months &rarr;
          </Link>
          <p className="text-xs text-gray-400">
            No credit card required for your first 7 days. After 6 months, $9/month. Cancel anytime.
          </p>
        </div>

        {/* Spots counter */}
        {spotsRemaining !== null && (
          <div className="mt-8">
            <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
              <div className="h-2 rounded-full transition-all" style={{ backgroundColor: '#1a5c38', width: `${Math.max(0, 100 - spotsRemaining)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{100 - spotsRemaining} of 100 spots claimed</p>
          </div>
        )}
      </main>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#1a5c38' }}>
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { step: '1', title: 'Tell us about your family', desc: 'Set your household size, budget, cook time, and any dietary needs in a quick 2-minute setup.' },
            { step: '2', title: 'Get your 5-dinner plan', desc: 'Every week, AI generates a personalized dinner plan built around what your family actually likes.' },
            { step: '3', title: 'Send it to your store', desc: 'Tap once to send the full grocery list to Walmart, Amazon Fresh, Kroger, Target, or Instacart.' },
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

      {/* FAQ */}
      <section className="container mx-auto px-4 pb-16 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#1a5c38' }}>
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: "Do I need a credit card?",
              a: "No. The beta is completely free for 6 months — no credit card required to get started. We'll ask for payment info only when your beta period ends, and you'll have full control to cancel before then.",
            },
            {
              q: "What happens after 6 months?",
              a: "After your 6-month free beta, DinnerDrop is $9/month. You'll receive an email reminder before your trial ends. You can cancel anytime — no hassle, no fine print.",
            },
            {
              q: "How do I submit feedback?",
              a: "As a beta member, you'll have a direct line to Sarah (the founder) via email. You'll also receive a short 5-minute survey at the 30-day mark. Your feedback directly shapes what we build next.",
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
    </div>
  )
}
