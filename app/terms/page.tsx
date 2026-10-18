import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — DinnerDrop',
  description: 'DinnerDrop terms of service and user agreement.',
  openGraph: {
    title: 'Terms of Service — DinnerDrop',
    description: 'DinnerDrop terms of service and user agreement.',
    url: 'https://www.dinnerdrop.app/terms',
    siteName: 'DinnerDrop',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop' }],
  },
  alternates: { canonical: 'https://www.dinnerdrop.app/terms' },
}

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: October 18, 2026
        </p>

        <div className="space-y-8 text-sm text-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              1. Service Description
            </h2>
            <p>
              DinnerDrop (&ldquo;the Service&rdquo;) is an AI-powered meal planning platform that
              generates personalized weekly dinner plans based on your household size, budget,
              dietary preferences, and cooking time constraints. The Service also generates
              consolidated grocery lists and integrates with third-party grocery delivery
              providers to streamline your shopping experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              2. User Accounts and Responsibilities
            </h2>
            <p className="mb-3">
              To use DinnerDrop, you must create an account with a valid email address. You are
              responsible for maintaining the confidentiality of your account credentials and for
              all activity that occurs under your account.
            </p>
            <p>You agree to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>Provide accurate and complete information when creating your account</li>
              <li>Keep your login credentials secure and not share them with others</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Use the Service only for lawful, personal, non-commercial meal planning purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              3. Subscription and Payment Terms
            </h2>
            <p className="mb-3">
              DinnerDrop offers a free plan and a paid Family plan:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-3">
              <li>
                <span className="font-medium text-foreground">Free:</span> Unlimited weekly meal
                plans, grocery list generation, one-tap Instacart shopping list, meal swaps, pantry
                scan, favorites and meal history. No payment method is required.
              </li>
              <li>
                <span className="font-medium text-foreground">Family ($4.99/month or $39/year):</span>{' '}
                Everything in Free, plus the household texting features (voting, shared list, reminders),
                per-person profiles, Kroger cart push, and priority support. Family starts with a 14-day free trial; a payment method is
                required to begin the trial and nothing is charged until the trial ends.
              </li>
            </ul>
            <p className="mb-3">
              Family subscriptions renew automatically at the end of each billing period (monthly
              or yearly) until canceled. We email you three days before your trial ends and before
              each renewal. You may cancel at any time from your Account page; you keep Family
              features through the end of the current billing period, and your account then
              continues on the Free plan. Refunds are not provided for partial billing periods.
            </p>
            <p>
              Households that joined under an earlier offer keep the free period they were
              promised; their plan then continues at the current Family price unless canceled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              4. AI-Generated Content Disclaimer
            </h2>
            <p className="mb-3">
              Meal plans, recipes, grocery lists, and nutritional information provided by DinnerDrop
              are generated by artificial intelligence and are intended for informational purposes
              only. While we strive for accuracy, AI-generated content may contain errors.
            </p>
            <p className="font-medium">
              DinnerDrop does not guarantee the nutritional accuracy, allergen safety, or dietary
              suitability of any generated content. Always verify ingredients against known allergies
              and dietary restrictions before preparing meals. Consult a healthcare professional for
              specific dietary or nutritional advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              5. Third-Party Integrations
            </h2>
            <p className="mb-3">
              DinnerDrop integrates with third-party services including, but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-3">
              <li>
                <span className="font-medium text-foreground">Instacart:</span> For grocery
                delivery and pickup ordering
              </li>
              <li>
                <span className="font-medium text-foreground">Kroger:</span> For adding your
                grocery list to your Kroger cart (Family plan, with a connected Kroger account)
              </li>
            </ul>
            <p>
              These integrations are provided for convenience. DinnerDrop is not responsible for
              the availability, pricing, accuracy, or fulfillment of orders placed through
              third-party services. Your use of third-party services is subject to their respective
              terms of service and privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              6. Limitation of Liability
            </h2>
            <p className="mb-3">
              To the fullest extent permitted by applicable law, DinnerDrop and its officers,
              directors, employees, and agents shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including but not limited to loss of
              profits, data, or goodwill, arising out of or in connection with your use of the
              Service.
            </p>
            <p>
              In no event shall DinnerDrop&rsquo;s total liability to you for all claims arising
              from the Service exceed the amount you paid to DinnerDrop in the twelve (12) months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              7. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your account at any time if you violate
              these Terms of Service or engage in conduct that we determine, in our sole discretion,
              to be harmful to the Service, other users, or third parties. You may delete your
              account at any time by emailing info@dinnerdrop.app from the address on your account
              (see our Privacy Policy for details). Upon termination, your right to
              use the Service will immediately cease, and we may delete your data in accordance
              with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              8. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of New York and the United States. Any disputes arising under these Terms shall be
              resolved in the federal or state courts located in New York, and you consent to the personal
              jurisdiction of such courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              8a. Family texting
            </h2>
            <p className="mb-3">
              The Family plan can send dinner ideas, reminders and replies by text message to you and to
              household members whose mobile numbers you enter. By entering a household member&apos;s number
              you confirm that you have their permission (and, for anyone under 18, that you are their parent
              or guardian). Each number receives a one-time opt-in text first; nothing else is sent until that
              person replies YES. Anyone can reply STOP at any time to end texts, or HELP for help. Message and
              data rates may apply. Texts are limited to the dinner plan and grocery list — we do not send
              marketing by text.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              9. Changes to These Terms
            </h2>
            <p>
              We may update these Terms of Service from time to time. We will notify you of
              material changes by posting the updated terms on this page and updating the
              &ldquo;Last updated&rdquo; date. Your continued use of the Service after changes
              are posted constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              10. Contact Us
            </h2>
            <p>
              If you have questions about these Terms of Service, please contact us at{' '}
              <a
                href="mailto:info@dinnerdrop.app"
                className="text-primary hover:underline"
              >
                info@dinnerdrop.app
              </a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-6 max-w-3xl flex items-center justify-between text-xs text-muted-foreground">
          <p>&copy; 2026 DinnerDrop. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="font-medium text-foreground">Terms</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
