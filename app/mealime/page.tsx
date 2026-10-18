import type { Metadata } from 'next'
import Link from 'next/link'
import MealimeImportForm from './MealimeImportForm'

const title = 'Mealime is closing — bring your dinners to DinnerDrop (free)'
const description =
  'Mealime shuts down on October 21, 2026 with no export. Type the names of the dinners your family loves and DinnerDrop rebuilds them, plans your week, and puts the grocery list in your Instacart cart. Free, no card needed.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://www.dinnerdrop.app/mealime' },
  openGraph: {
    title,
    description,
    url: 'https://www.dinnerdrop.app/mealime',
    siteName: 'DinnerDrop',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop — Dinner, handled' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
}

const GREEN = '#1a5c38'
const GOLD = '#e8a838'

export default function MealimePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />
            <span className="font-bold text-xl" style={{ color: GREEN }}>DinnerDrop</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">Sign in</Link>
            <Link href="/signup?redirect=%2Ffavorites&utm_source=mealime" className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: GREEN }}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 sm:py-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-5" style={{ backgroundColor: '#fef9ee', borderColor: GOLD, color: GREEN }}>
          For Mealime families
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4" style={{ color: GREEN }}>
          Mealime is closing on October 21. <span style={{ color: GOLD }}>Your dinners don&apos;t have to go with it.</span>
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          Albertsons is shutting Mealime down on October 21 and moving its recipes into its own Meals Hub, with no way to export your plans, favorites, or lists. DinnerDrop does the part you relied on &mdash; pick dinners, get one combined grocery list &mdash; and then opens that list in your Instacart cart in one tap, at any store. It&apos;s free, with no card.
        </p>

        <MealimeImportForm />

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-6" style={{ color: GREEN }}>What carries over, and what&apos;s better</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { t: 'Your favorites', d: 'Type the names of the dinners your family actually eats. We rebuild each one as a full recipe for your family size and keep it in your rotation.' },
              { t: 'One combined grocery list', d: 'Every plan becomes one deduplicated list, organized by store section, the way Mealime did it.' },
              { t: 'The cart, filled for you', d: 'One tap opens the whole list in Instacart with every item matched. You pick the store, glance, add to cart, and check out at Instacart’s prices — we add nothing.' },
              { t: 'Plans built around your family', d: 'Family size, weekly budget, cook time, and dietary needs shape every week. Swap any dinner in one tap; it learns what you keep.' },
              { t: 'Free, and it stays free', d: 'Planning and the Instacart cart cost nothing and never will. Instacart pays us a small commission when you shop, at no extra cost to you.' },
              { t: 'Your data is yours', d: 'Ask any time and we send you a copy of your plans, favorites, and lists. No lock-in.' },
            ].map((b) => (
              <div key={b.t} className="p-5 rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
                <h3 className="font-bold text-sm mb-1" style={{ color: GREEN }}>{b.t}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-4" style={{ color: GREEN }}>Honest differences</h2>
          <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <li><strong className="text-gray-800">Mealime had a browseable recipe library.</strong> DinnerDrop has one too — every dinner it has planned, with real photos, plus any recipe you add by link, text or photo — and it writes the week for you from it. If you want a specific dinner, add it to your favorites and it will show up.</li>
            <li><strong className="text-gray-800">Mealime shopped through delivery partners.</strong> DinnerDrop fills your Instacart cart directly (and, on the Family plan, your Kroger cart). In-store shoppers get the same list on their phone.</li>
            <li><strong className="text-gray-800">Mealime Pro was a paid upgrade.</strong> DinnerDrop&apos;s planning and cart are free. The optional Family plan is $4.99/month or $39/year after a 14-day trial, for the household features (the week&apos;s dinner ideas texted to everyone, who reply with the numbers they want; a list anyone can text an item onto; a profile for each person), text reminders, the Kroger cart push, and priority support.</li>
          </ul>
        </section>

        <section className="mt-14 text-center">
          <Link
            href="/signup?redirect=%2Ffavorites&utm_source=mealime"
            className="inline-block px-10 py-4 rounded-xl text-white font-bold text-lg shadow-sm hover:opacity-90"
            style={{ backgroundColor: GREEN }}
          >
            Start free &mdash; no card needed &rarr;
          </Link>
          <p className="text-sm text-gray-600 mt-3">Two minutes to set up. Your first week of dinners is ready right away.</p>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-20">
        <div className="container mx-auto px-4 py-6 max-w-5xl flex items-center justify-between text-xs text-gray-500">
          <span className="font-bold text-sm" style={{ color: GREEN }}>DinnerDrop</span>
          <p>&copy; 2026 DinnerDrop</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-700">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
