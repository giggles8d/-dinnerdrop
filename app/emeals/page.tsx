import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/site/PublicHeader'
import EmealsImportForm from './EmealsImportForm'

const title = 'Leaving eMeals? Plan your family dinners free with DinnerDrop'
const description =
  'Switching from eMeals? Type the dinners your family loved and DinnerDrop builds its own versions, plans your week and fills your Instacart or Walmart cart. Free, no card. Family is free for 14 days.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://www.dinnerdrop.app/emeals' },
  openGraph: { title, description, url: 'https://www.dinnerdrop.app/emeals', siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png?v=4', width: 1200, height: 630, alt: 'DinnerDrop — Dinner, handled' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png?v=4'] },
}

const GREEN = '#1a5c38'
const GOLD = '#e8a838'
// Code EMEALS (90 days) was dropped from this page: no new stacking offers (Nov 22 2026 review, Sarah approved).
const SIGNUP = '/signup?redirect=%2Ffavorites&utm_source=emeals'

export default function EmealsSwitchPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <PublicHeader />
      <main className="container mx-auto px-4 py-10 sm:py-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-5" style={{ backgroundColor: '#fef9ee', borderColor: GOLD, color: GREEN }}>
          For families leaving eMeals
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4" style={{ color: GREEN }}>
          Leaving eMeals? <span style={{ color: GOLD }}>Plan free, forever.</span>
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-4">
          DinnerDrop plans five dinners around your family, builds one grocery list, and puts it in your Instacart or Walmart cart in one tap. Planning and the cart are free with no card, and they stay free.
        </p>
        <div className="rounded-2xl p-5 mb-8 border" style={{ backgroundColor: '#fef9ee', borderColor: GOLD }}>
          <p className="font-bold" style={{ color: GREEN }}>Your first 14 days of Family are free, no card</p>
          <p className="text-sm text-gray-700 mt-1">
            Every new family gets them when you sign up. Family adds family voting by text, per-person tastes and the Kroger cart push. Nothing bills when the 14 days end; you go back to the free plan. To keep Family, add a card: $4.99 a month or $39 a year.
          </p>
        </div>

        <EmealsImportForm />
        <p className="text-xs text-gray-500 mt-3">
          We don&apos;t copy eMeals recipes. DinnerDrop writes its own version of each dinner you name.
        </p>

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-6" style={{ color: GREEN }}>What you get that eMeals doesn&apos;t offer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { t: 'Free plan, no card', d: 'eMeals asks for a card or PayPal to start its 14-day trial. DinnerDrop is free to use for as long as you like.' },
              { t: 'Month-to-month Family', d: '$4.99 a month, cancel in one tap. eMeals’ $4.99 a month price means paying $59.99 for the year up front.' },
              { t: 'The family votes by text', d: 'Everyone in the house gets the week’s dinner ideas by text and replies with the numbers they want. No app to install.' },
              { t: 'Built for your house', d: 'Family size, budget, allergies, each person’s dislikes and a weekly protein mix (say, 2 chicken, 1 beef, 1 fish).' },
              { t: 'Snap the fridge', d: 'Take a photo of the fridge and get dinners you can make tonight with what’s in it.' },
              { t: 'Compare your stores', d: 'See what your list costs at the stores you shop, and split it between two.' },
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
            <li><strong className="text-gray-800">eMeals has a bigger library.</strong> It lists 25,000+ recipes; DinnerDrop has 1,100+ and adds more every night. Any dinner you want can go in by name.</li>
            <li><strong className="text-gray-800">Both work with Walmart.</strong> DinnerDrop fills a Walmart or Instacart cart for free, and a Kroger cart on Family. eMeals also lists Amazon Fresh, Albertsons, Safeway, H-E-B and Shipt.</li>
            <li><strong className="text-gray-800">eMeals has Android and iPhone apps.</strong> DinnerDrop has an iPhone app and works in any phone browser. No Android app yet.</li>
            <li><strong className="text-gray-800">Already paid for an eMeals year?</strong> Use both until it runs out. Turn off eMeals&apos; auto-renew in your eMeals account settings so you decide later.</li>
          </ul>
          <p className="text-sm mt-4"><Link href="/vs/emeals" className="underline font-medium" style={{ color: GREEN }}>See the full side-by-side comparison →</Link></p>
        </section>

        <section className="mt-14 text-center">
          <Link href={SIGNUP} className="inline-block px-10 py-4 rounded-xl text-white font-bold text-lg shadow-sm hover:opacity-90" style={{ backgroundColor: GREEN }}>
            Start free, no card &rarr;
          </Link>
          <p className="text-sm text-gray-600 mt-3">Two minutes to set up. Your first week of dinners is ready right away.</p>
        </section>

        <p className="text-[11px] text-gray-500 mt-12">
          eMeals details checked on eMeals&apos; website, checkout page and App Store listing on November 22, 2026; prices change and eMeals sometimes runs promotions.
          eMeals is a trademark of eMeals, Inc. DinnerDrop is not affiliated with or endorsed by eMeals.
        </p>
      </main>
    </div>
  )
}
