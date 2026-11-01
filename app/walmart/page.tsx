import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Meal Plan with Walmart Grocery Pickup — DinnerDrop',
  description: 'Five weeknight dinners planned for your family and budget, every ingredient matched to a Walmart product, and one tap fills your Walmart cart for pickup or delivery. Free, no card.',
  alternates: { canonical: 'https://www.dinnerdrop.app/walmart' },
  openGraph: { title: 'Meal Plan with Walmart Grocery Pickup — DinnerDrop', description: 'Five dinners, one list, your Walmart cart filled in one tap. Free.' },
}

const GREEN = '#1a5c38'
const GOLD = '#e8a838'
const FREE_HREF = '/signup?redirect=' + encodeURIComponent('/dashboard')

// Landing page for "walmart meal plan" / "meal plan walmart grocery pickup" searches and ads.
// Text only for the Walmart name (no logo — affiliate branding needs Walmart's approval).
export default function WalmartPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} /><span className="font-bold text-xl" style={{ color: GREEN }}>DinnerDrop</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-800">Sign in</Link>
            <Link href={FREE_HREF} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: GREEN }}>Start free</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 sm:py-20 max-w-3xl text-center">
        <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: GREEN }}>Works with Walmart pickup &amp; delivery</p>
        <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-4" style={{ color: GREEN }}>
          Dinner planned. <span style={{ color: GOLD }}>Walmart cart filled.</span>
        </h1>
        <p className="text-base sm:text-lg font-semibold text-gray-700 max-w-xl mx-auto leading-relaxed mb-6">
          Five weeknight dinners built around your family and budget, every ingredient matched to a real Walmart product, and one tap puts the whole list in your Walmart cart. You pick pickup or delivery and check out on Walmart.com.
        </p>
        <Link href={FREE_HREF} className="inline-block px-10 py-4 rounded-xl text-white font-bold text-lg shadow-sm hover:opacity-90 w-full sm:w-auto" style={{ backgroundColor: GREEN }}>
          Start free &mdash; no card needed &rarr;
        </Link>
        <p className="text-sm text-gray-600 mt-3">Free forever &middot; also works with Instacart and Kroger &middot; no app to download</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-14 text-left">
          {[
            { step: '1', title: 'Four taps about your family', desc: 'How many are eating, what you want to spend, anything to avoid. Under a minute.' },
            { step: '2', title: 'Five dinners and one list', desc: 'Weeknight dinners your family will eat, with every ingredient on one deduplicated grocery list.' },
            { step: '3', title: 'Tap “Shop at Walmart”', desc: 'Each line is matched to a Walmart product with its price. Swap anything you like, then one tap fills your Walmart cart.' },
          ].map((s) => (
            <div key={s.step} className="p-5 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white mb-3" style={{ backgroundColor: GREEN }}>{s.step}</div>
              <h3 className="font-bold text-sm mb-1" style={{ color: GREEN }}>{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-white p-5 text-left text-sm text-gray-600 leading-relaxed mb-14" style={{ borderColor: '#e8e8e8' }}>
          <p className="font-bold mb-1" style={{ color: GREEN }}>How the Walmart cart works</p>
          DinnerDrop fills the cart in your own Walmart account. You see every item and its price before anything is added, you can swap any product, and you check out on Walmart.com at Walmart&apos;s prices for your store. We never charge your account and never mark anything up. DinnerDrop may earn a small commission from Walmart when you shop through it, at no cost to you.
        </div>

        <section className="text-left space-y-6 mb-10">
          <h2 className="text-3xl font-bold text-center" style={{ color: GREEN }}>Questions</h2>
          {[
            { q: 'Do I need a Walmart+ membership?', a: 'No. Pickup is free on orders over Walmart’s minimum; delivery fees follow Walmart’s normal rules. Walmart+ just waives those if you have it.' },
            { q: 'What if Walmart doesn’t have something?', a: 'Items with no close match stay on your DinnerDrop list, marked so you can grab them elsewhere. Everything else goes in the cart.' },
            { q: 'Can I still use Instacart?', a: 'Yes. Both buttons sit side by side on your list — Instacart for any store on it, Walmart for pickup or delivery from Walmart. Family members can push to a Kroger cart too.' },
            { q: 'What does it cost?', a: 'Planning, the list and the Walmart cart are free with no card. The Family plan ($4.99/month or $39/year, 14 days free) adds family texting, per-person profiles and reminders.' },
          ].map((f) => (
            <div key={f.q} className="p-6 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
              <h3 className="font-bold text-base mb-2" style={{ color: GREEN }}>{f.q}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </section>

        <Link href={FREE_HREF} className="inline-block px-8 py-3 rounded-xl text-white font-bold shadow-sm hover:opacity-90" style={{ backgroundColor: GREEN }}>
          Plan my week free &rarr;
        </Link>
        <p className="text-xs text-gray-500 mt-8">Walmart is a trademark of Walmart Inc. DinnerDrop is an independent service and is not affiliated with or endorsed by Walmart.</p>
      </main>
    </div>
  )
}
