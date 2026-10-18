'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Store } from 'lucide-react'

interface Quote { store: string; total: number; itemCount: number | null; swaps: number }
interface Example { readAt?: string; weekStart?: string; itemCount?: number; quotes: Quote[] }

/**
 * "Same list, five stores" — the founder's real weekly list priced at each local store from Instacart,
 * re-read every Sunday morning. Shown on / and /start so the one thing no other planner does is visible before signup.
 */
export default function StorePriceExample({ ctaHref = '/signup', tone = 'default' }: { ctaHref?: string; tone?: 'default' | 'cream' }) {
  const [ex, setEx] = useState<Example | null>(null)
  useEffect(() => { fetch('/api/public/store-example').then((r) => r.json()).then(setEx).catch(() => setEx({ quotes: [] })) }, [])
  const quotes = ex?.quotes ?? []
  const best = quotes[0], worst = quotes[quotes.length - 1]
  const saves = best && worst ? worst.total - best.total : 0
  const readOn = ex?.readAt ? new Date(ex.readAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''

  return (
    <section className={tone === 'cream' ? 'border-y border-border' : ''} style={tone === 'cream' ? { backgroundColor: '#FBF8F1' } : undefined}>
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Real prices, every store</p>
        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4 max-w-2xl leading-tight">
          Same list. Every store you shop. Pick the cheapest — or split it.
        </h2>
        <p className="text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          Every Sunday morning DinnerDrop prices your whole list at each of your stores using Instacart&apos;s real prices for that week, sales included. Then it shows you which store wins, and can send each item to whichever store is cheaper for it. No flyers to load, nothing to type.
        </p>

        {quotes.length >= 2 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              {quotes.map((q, i) => (
                <div key={q.store} className={`rounded-2xl border p-4 bg-white ${i === 0 ? 'border-primary shadow-md' : 'border-border'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground truncate">{q.store}</span>
                    {i === 0 && <span className="text-[10px] uppercase tracking-wide text-primary font-bold">cheapest</span>}
                  </div>
                  <p className="text-2xl font-heading font-bold text-foreground mt-1">${q.total.toFixed(0)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{q.swaps ? `${q.swaps} store-brand swap${q.swaps === 1 ? '' : 's'}` : 'every item matched'}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mb-8 max-w-3xl">
              A real family of five in upstate New York — their {ex?.itemCount ?? ''}-item list for the week, read from Instacart on {readOn}.
              {saves > 0 ? ` Cheapest store saved $${saves.toFixed(0)} against the priciest, before fees.` : ''} Prices are Instacart&apos;s for each store and change weekly. &ldquo;Store-brand swaps&rdquo; are items that store didn&apos;t match exactly; they aren&apos;t in that store&apos;s total here, and inside the app they&apos;re counted at a typical price so no store wins by missing a match.
            </p>
          </>
        )}
        {quotes.length < 2 && ex && (
          <p className="text-xs text-muted-foreground mb-8">Tell DinnerDrop which stores you shop and it prices your list at each one every Sunday.</p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Link href={ctaHref} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm">
            <Store className="w-4 h-4" /> Compare my stores — free
          </Link>
          <span className="text-sm text-muted-foreground">Works with any store on Instacart. Included in the free plan.</span>
        </div>
      </div>
    </section>
  )
}
