import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — DinnerDrop',
  description: 'DinnerDrop privacy policy — how we collect, use, and protect your data.',
  openGraph: {
    title: 'Privacy Policy — DinnerDrop',
    description: 'DinnerDrop privacy policy — how we collect, use, and protect your data.',
    url: 'https://www.dinnerdrop.app/privacy',
    siteName: 'DinnerDrop',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop' }],
  },
  alternates: { canonical: 'https://www.dinnerdrop.app/privacy' },
}

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: October 19, 2026
        </p>

        <div className="space-y-8 text-sm text-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              1. What Data We Collect
            </h2>
            <p className="mb-3">
              When you use DinnerDrop, we collect the following types of information:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Account information:</span> Name,
                email address, and password
              </li>
              <li>
                <span className="font-medium text-foreground">Profile preferences:</span> Household
                size, weekly grocery budget, maximum cook time, cuisine preferences, and dietary
                needs or restrictions
              </li>
              <li>
                <span className="font-medium text-foreground">Meal history:</span> Generated meal
                plans, saved recipes, favorited meals, and grocery lists
              </li>
              <li>
                <span className="font-medium text-foreground">Household and family texting (Family plan):</span> The
                names, roles, likes, won&apos;t-eats, allergies and safe foods you enter for people in your
                household; the mobile numbers you enter for yourself and for household members who opt in to
                texts; the text messages and photos they send to DinnerDrop&apos;s number (votes, items to add,
                pictures of products), and our replies. You are responsible for having each household
                member&apos;s permission before entering their number; anyone can stop texts at any time by
                replying STOP. We never sell phone numbers and never send marketing texts to household members.
              </li>
              <li>
                <span className="font-medium text-foreground">Photos you choose to send:</span> Pantry photos and
                product photos (from the app or by text) are used only to read what is in them — the items go on
                your list or into your library — and are not used for advertising.
              </li>
              <li>
                <span className="font-medium text-foreground">Usage data:</span> How you interact
                with the Service, including pages visited, features used, meal swaps, and grocery handoffs
                (which store you sent a list to and when — not what you bought)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              2. How We Use Your Data
            </h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Generate personalized meal plans tailored to your preferences and budget</li>
              <li>Create accurate, consolidated grocery lists from your meal plans</li>
              <li>Improve meal recommendations over time based on your favorites and swaps</li>
              <li>Process payments and manage your subscription</li>
              <li>Send transactional emails (account verification, password resets, plan updates)</li>
              <li>Analyze aggregated, anonymized usage patterns to improve the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              3. Third-Party Services
            </h2>
            <p className="mb-3">
              We use the following third-party services to operate DinnerDrop. Each service
              processes your data according to their own privacy policies:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Supabase:</span> Authentication,
                database, and data storage
              </li>
              <li>
                <span className="font-medium text-foreground">Anthropic (Claude):</span> AI-powered
                meal plan and recipe generation — your dietary preferences and household information
                are sent to Anthropic to generate personalized plans
              </li>
              <li>
                <span className="font-medium text-foreground">Instacart:</span> Grocery delivery
                integration — your grocery list is shared with Instacart when you choose to push
                your cart
              </li>
              <li>
                <span className="font-medium text-foreground">Kroger:</span> Cart push and
                product matching — if you connect a Kroger account, your grocery list is sent to
                Kroger when you choose to push it to your cart
              </li>
              <li>
                <span className="font-medium text-foreground">Stripe:</span> Payment processing
                for the Family plan — we never see or store your card number
              </li>
              <li>
                <span className="font-medium text-foreground">Resend:</span> Transactional email
                (account, billing, and plan notifications)
              </li>
              <li>
                <span className="font-medium text-foreground">Vercel:</span> Hosting and
                privacy-friendly site analytics
              </li>
              <li>
                <span className="font-medium text-foreground">Google Ads, Meta, Pinterest, and Reddit:</span>{' '}
                Advertising measurement — see section 6
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              4. Data Retention
            </h2>
            <p className="mb-3">
              We retain your account data and meal history for as long as your account is active.
              If you delete your account, we will remove your personal data within 30 days, except
              where we are required to retain it for legal or compliance purposes.
            </p>
            <p>
              Anonymized, aggregated data (such as overall usage statistics) may be retained
              indefinitely to improve the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              5. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Access your data:</span> View all
                personal data we store about you through your account settings
              </li>
              <li>
                <span className="font-medium text-foreground">Export your data:</span> Request a
                copy of your meal plans, favorites, and profile in a machine-readable format
              </li>
              <li id="delete">
                <span className="font-medium text-foreground">Delete your account:</span> Permanently
                delete your account and all associated personal data yourself from Settings &rarr; Data &rarr; Delete account (in the
                app or on the website); billing stops immediately. Or email{' '}
                <a href="mailto:info@dinnerdrop.app?subject=Delete%20my%20DinnerDrop%20account" className="text-primary underline">info@dinnerdrop.app</a>{' '}
                from the address on your account with the subject &ldquo;Delete my DinnerDrop account&rdquo; and
                we will delete your profile, meal plans, favorites, pantry, and grocery-handoff records within 30 days
                and confirm by email. Subscription billing records are retained only as required by law.
              </li>
              <li>
                <span className="font-medium text-foreground">Correct your data:</span> Update
                inaccurate personal information through your profile settings
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:info@dinnerdrop.app" className="text-primary hover:underline">
                info@dinnerdrop.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              6. Cookies
            </h2>
            <p className="mb-3">
              DinnerDrop uses essential cookies to manage authentication sessions and remember your
              preferences. These are required for the Service to function and cannot be disabled.
            </p>
            <p className="mb-3">
              We also use advertising measurement tags from Google Ads, Meta (Facebook and
              Instagram), Pinterest, and Reddit on our public marketing pages. These set third-party
              cookies and may collect your IP address, device identifiers, and the pages you
              visit, so that we can measure whether our ads led to signups and show relevant ads
              on those platforms. They do not load at all inside the DinnerDrop iPhone or Android app. Apart from a single &ldquo;signed up&rdquo; event when you first create
              your account on the website, they are not used to track what you do inside the app,
              and we never share your meal plans, grocery lists, or dietary information with
              advertising platforms.
            </p>
            <p>
              You can opt out of interest-based advertising through your browser&rsquo;s cookie
              settings, Google&rsquo;s{' '}
              <a href="https://adssettings.google.com" className="text-primary underline" target="_blank" rel="noopener noreferrer">Ads Settings</a>,
              Meta&rsquo;s{' '}
              <a href="https://www.facebook.com/adpreferences" className="text-primary underline" target="_blank" rel="noopener noreferrer">Ad Preferences</a>,
              Pinterest&rsquo;s and Reddit&rsquo;s privacy settings, or through the{' '}
              <a href="https://optout.aboutads.info" className="text-primary underline" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              7. Children&rsquo;s Privacy
            </h2>
            <p>
              DinnerDrop is not intended for children under the age of 13. We do not knowingly
              collect personal information from children under 13. If you believe a child under 13
              has provided us with personal data, please contact us at{' '}
              <a href="mailto:info@dinnerdrop.app" className="text-primary hover:underline">
                info@dinnerdrop.app
              </a>{' '}
              and we will promptly delete the information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              8. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your personal data,
              including encryption in transit (TLS) and at rest. However, no method of electronic
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on this page and updating the &ldquo;Last
              updated&rdquo; date. Your continued use of the Service after changes are posted
              constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              10. Contact Us
            </h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices,
              please contact us at{' '}
              <a href="mailto:info@dinnerdrop.app" className="text-primary hover:underline">
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
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <span className="font-medium text-foreground">Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
