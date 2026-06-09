import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Affiliate Disclosure — DinnerDrop',
  description: 'How DinnerDrop works with grocery partners like Instacart and Kroger, and how we may earn commissions.',
  openGraph: {
    title: 'Affiliate Disclosure — DinnerDrop',
    description: 'How DinnerDrop works with grocery partners like Instacart and Kroger, and how we may earn commissions.',
    url: 'https://dinnerdrop.app/disclosure',
    siteName: 'DinnerDrop',
    type: 'website',
  },
  alternates: { canonical: 'https://dinnerdrop.app/disclosure' },
}

export default function DisclosurePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-3xl flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-foreground">
            DinnerDrop
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
          Affiliate Disclosure
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: June 2026</p>

        <div className="space-y-8 text-sm text-foreground leading-relaxed">
          <section>
            <p>
              DinnerDrop helps busy families plan weeknight dinners and turn those plans into a
              ready-to-shop grocery list. To make shopping effortless, we connect that list to
              grocery partners so you can send it to your cart in one tap.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              How we may earn money from grocery links
            </h2>
            <p>
              Some of the links DinnerDrop uses to send your grocery list to a store —
              including <strong>Instacart</strong> and <strong>Kroger</strong> — are affiliate
              links. This means that if you place an order after using one of those links,
              DinnerDrop may earn a small commission from the retailer, at <strong>no extra cost
              to you</strong>. The price you pay is the same whether or not you use our link.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              Our recommendations are not for sale
            </h2>
            <p>
              The meals and ingredients DinnerDrop suggests are generated from your stated
              preferences — your family size, budget, cook time, and dietary needs. Commissions
              never influence which meals we recommend or which ingredients land on your list.
              We recommend the grocery partners we&apos;ve actually integrated with because they
              make the one-tap handoff possible, not because of what we earn.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              FTC compliance
            </h2>
            <p>
              In accordance with the U.S. Federal Trade Commission&apos;s guidelines on
              endorsements and affiliate relationships, we disclose that DinnerDrop participates
              in affiliate programs and may be compensated for purchases made through our grocery
              partner links. We share this so you can make informed choices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              Questions
            </h2>
            <p>
              If you have any questions about how DinnerDrop works with grocery partners, email
              us at{' '}
              <a href="mailto:info@dinnerdrop.app" className="text-primary underline">
                info@dinnerdrop.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex gap-4 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </div>
      </main>
    </div>
  )
}
