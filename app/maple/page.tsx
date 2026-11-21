import type { Metadata } from 'next'
import Link from 'next/link'
import MapleImportForm from './MapleImportForm'
import MapleDeadline from '@/components/MapleDeadline'
import SocialLinks from '@/components/SocialLinks'

const title = 'Maple is shutting down — keep your family’s dinners in DinnerDrop'
const description =
  'Maple Family Organizer closes Dec 31, 2026 and deletes your data. Move your meal plans and grocery lists to DinnerDrop in 2 minutes. Free, plus 30 days of Family.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://www.dinnerdrop.app/maple' },
  openGraph: {
    title,
    description,
    url: 'https://www.dinnerdrop.app/maple',
    siteName: 'DinnerDrop',
    type: 'website',
    images: [{ url: '/og-image.png?v=4', width: 1200, height: 630, alt: 'DinnerDrop — Dinner, handled' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png?v=4'] },
}

const GREEN = '#1a5c38'
const GOLD = '#e8a838'
const SIGNUP = '/signup?redirect=%2Ffavorites&utm_source=maple'

const faq = [
  {
    q: 'When does Maple shut down?',
    a: 'Maple’s website says the app sunsets on December 31, 2026, after its team joined Wander. Some families report the notice inside the app says November 30, and Maple hasn’t explained the difference, so copy anything you need before November 30 to be safe.',
  },
  {
    q: 'What happens to my Maple data?',
    a: 'Maple says accounts close on the shutdown date and all data is deleted with no way to recover it, including meal plans, lists and calendar connections. Events that live in Google, Apple or Outlook calendars stay there; things created only inside Maple do not.',
  },
  {
    q: 'Can I export my meal plans from Maple?',
    a: 'Maple asks families to export or transfer their data but doesn’t describe a meal-plan export. The reliable way is the one below: copy your dinners’ names (or screenshot your meal plan and lists) and paste the names into DinnerDrop.',
  },
  {
    q: 'Does DinnerDrop replace all of Maple?',
    a: 'No. DinnerDrop is the dinner part: the weekly meal plan, one combined grocery list, and the Instacart cart. It has no shared calendar, chore chart or school-email inbox. For those, a free shared Google or Apple calendar covers most families.',
  },
  {
    q: 'Is it really free?',
    a: 'Planning dinners, the grocery list and the Instacart cart are free, with no card. Maple families also get 30 days of the Family plan free (texted family votes, a shared list anyone can text onto, a profile for each person). After that, Family is $4.99/month or $39/year if you want to keep it; nothing charges automatically.',
  },
]

export default function MaplePage() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />
            <span className="font-bold text-xl" style={{ color: GREEN }}>DinnerDrop</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">Sign in</Link>
            <Link href={SIGNUP} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: GREEN }}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 sm:py-16 max-w-3xl">
        <MapleDeadline />
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-5" style={{ backgroundColor: '#fef9ee', borderColor: GOLD, color: GREEN }}>
          For Maple families
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4" style={{ color: GREEN }}>
          Maple is shutting down. <span style={{ color: GOLD }}>Your family&apos;s dinners don&apos;t have to.</span>
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-4">
          Maple Family Organizer closes on December 31, 2026, and deletes every account&apos;s data with no recovery. If Maple was where your family planned dinners and kept the grocery list, DinnerDrop picks that part up: it plans your week around your family, builds one combined grocery list, and fills your Instacart cart in one tap.
        </p>
        <p className="text-base text-gray-700 mb-8">
          <strong style={{ color: GREEN }}>Maple families get 30 days of DinnerDrop Family free</strong> &mdash; no card, nothing to cancel.
        </p>

        <section className="mb-10 rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: '#e8e8e8' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: GREEN }}>Before Maple closes: a 5-minute checklist</h2>
          <ol className="space-y-3 text-sm text-gray-700 leading-relaxed list-decimal pl-5">
            <li><strong>Copy your dinners.</strong> Open Maple&apos;s meal planner and copy the names of the dinners your family actually eats (scroll back a few weeks). Paste them in the box below.</li>
            <li><strong>Save your grocery staples.</strong> Screenshot your grocery lists, or copy the items you buy every week into a note. In DinnerDrop they go on your pantry list.</li>
            <li><strong>Keep the recipes you love as written.</strong> For a recipe with a link or a photo, save the link or take the photo now; DinnerDrop brings it in exactly.</li>
            <li><strong>Move your calendar separately.</strong> Events from Google, Apple or Outlook stay in those calendars. Anything created only in Maple, write down or re-add to a shared calendar.</li>
            <li><strong>Check your subscription.</strong> Maple says annual plans won&apos;t renew and monthly plans run until December 31.</li>
          </ol>
        </section>

        <MapleImportForm />

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-6" style={{ color: GREEN }}>What carries over from Maple</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { t: 'Your family’s dinners', d: 'Paste the names and each one comes in as a full recipe for your family size, ready to rotate into your weeks.' },
              { t: 'The weekly meal plan', d: 'Every week is planned for you around family size, budget, cook time, allergies and picky eaters. Swap any dinner in one tap.' },
              { t: 'One grocery list', d: 'The whole week becomes one combined list, organized by store section, with what you already have checked off.' },
              { t: 'The cart, filled for you', d: 'One tap opens the list in Instacart with every item matched. You pick the store, review, and check out at Instacart’s prices.' },
              { t: 'The whole family in the loop', d: 'With Family, everyone gets the week’s dinner ideas by text and votes with a number, and anyone can text an item onto the list.' },
              { t: 'Your data stays yours', d: 'Ask any time and we send you a copy of your plans, favorites and lists. No lock-in, ever.' },
            ].map((b) => (
              <div key={b.t} className="p-5 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
                <h3 className="font-bold text-sm mb-1" style={{ color: GREEN }}>{b.t}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-4" style={{ color: GREEN }}>Questions Maple families ask</h2>
          <div className="space-y-5">
            {faq.map((f) => (
              <div key={f.q}>
                <h3 className="font-bold text-gray-800 mb-1">{f.q}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 text-center">
          <Link
            href={SIGNUP}
            className="inline-block px-10 py-4 rounded-xl text-white font-bold text-lg shadow-sm hover:opacity-90"
            style={{ backgroundColor: GREEN }}
          >
            Start free &mdash; no card needed &rarr;
          </Link>
          <p className="text-sm text-gray-600 mt-3">Two minutes to set up. Your first week of dinners is ready right away.</p>
          <p className="text-xs text-gray-400 mt-6">DinnerDrop isn&apos;t affiliated with Maple or Wander. Shutdown details are from Maple&apos;s announcement at growmaple.com.</p>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-20">
        <div className="container mx-auto px-4 py-6 max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center text-xs text-gray-500">
          <span className="font-bold text-sm" style={{ color: GREEN }}>DinnerDrop</span>
          <p>&copy; 2026 DinnerDrop</p>
          <SocialLinks />
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/terms" className="hover:text-gray-700">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
