import Link from 'next/link'
import type { Metadata } from 'next'
import { activeProducts } from '@/lib/products'
import BuyButton from '@/components/BuyButton'
import PublicHeader from '@/components/site/PublicHeader'
import SocialLinks from '@/components/SocialLinks'

export const metadata: Metadata = {
  title: 'Shop — Printable Meal Planners & Family Kitchen Downloads | DinnerDrop',
  description:
    'Instant-download meal planners, grocery checklists, and meal-prep printables for busy families. Buy once, download instantly.',
  alternates: { canonical: 'https://www.dinnerdrop.app/shop' },
}

export default function ShopPage() {
  const products = activeProducts()

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader active="shop" />

      <section className="container mx-auto px-4 max-w-5xl pt-16 pb-8">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">DinnerDrop Shop</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground mb-4">
          Printables for busy families
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          Planners, checklists, and meal-prep printables. Buy once, download instantly — no account needed.
        </p>
      </section>

      <section className="container mx-auto px-4 max-w-5xl pb-20">
        {products.length === 0 ? (
          <p className="text-muted-foreground">New downloads are on the way — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-secondary overflow-hidden flex flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="w-full h-44 object-cover" />
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="font-heading font-bold text-lg text-foreground">{p.name}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2 flex-1">{p.description}</p>
                  <div className="mt-5">
                    <BuyButton productId={p.id} priceUsd={p.priceUsd} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-10 max-w-2xl">
          Payments are processed securely by Stripe. Digital products are delivered as an instant download
          after purchase. Because these are downloadable files, all sales are final. Questions? Email support@dinnerdrop.app.
        </p>
      </section>

      <footer className="border-t border-border bg-white">
        <div className="container mx-auto px-4 py-6 max-w-5xl flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-heading font-bold text-sm text-primary">DinnerDrop</span>
          <p>&copy; 2026 DinnerDrop</p>
          <SocialLinks />
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
