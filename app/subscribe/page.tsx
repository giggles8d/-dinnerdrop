'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Clock, ShoppingCart, Sparkles, TrendingDown } from 'lucide-react'

export default function SubscribePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
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
            Maybe later
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left: value prop */}
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
              DinnerDrop Basic
            </p>
            <h1 className="text-5xl font-heading font-bold text-foreground leading-tight mb-6">
              Dinner, handled.<br />Every week.
            </h1>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Stop staring at the fridge at 5pm. DinnerDrop plans your week, builds your grocery list, and sends it straight to Instacart.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">AI meal plans that learn your taste</p>
                  <p className="text-sm text-muted-foreground mt-0.5">5 dinners every week, personalized to your family size, budget, and preferences.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">One tap to Instacart</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Your full grocery list, deduplicated and organized, sent straight to your cart.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Stay under budget, every week</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Meals planned around your grocery budget with overlapping ingredients to cut waste.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">30 minutes or less, every night</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Every meal is designed for a tired parent on a weeknight. No complicated recipes.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: pricing card */}
          <div className="lg:sticky lg:top-8">
            <div className="rounded-2xl border-2 border-primary bg-white p-8 shadow-sm">
              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-heading font-bold text-foreground">$9</span>
                  <span className="text-muted-foreground text-lg">/month</span>
                </div>
                <div className="inline-block bg-secondary text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20 mt-2">
                  7-day free trial — no charge today
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited weekly meal plans',
                  'AI personalization that improves weekly',
                  'One-tap Instacart grocery push',
                  'Pantry tracker with photo scan',
                  'Meal swap anytime',
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
                {loading ? 'Redirecting to checkout...' : 'Start my free trial →'}
              </button>

              {error && (
                <p className="mt-3 text-sm text-destructive text-center">{error}</p>
              )}

              <p className="text-xs text-muted-foreground text-center mt-4">
                Secure payment by Stripe · Cancel anytime · No commitments
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
