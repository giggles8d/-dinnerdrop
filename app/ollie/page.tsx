import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/site/PublicHeader'
import OllieImportForm from './OllieImportForm'

const title = 'Ollie closed Nov 6 — keep your family dinners going with DinnerDrop (free)'
const description =
  'Ollie shut down on November 6, 2026. Type the dinners your family loved and DinnerDrop plans your week around them, builds one grocery list and fills your Instacart or Walmart cart. Free, no card. Family is free for 14 days.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://www.dinnerdrop.app/ollie' },
  openGraph: { title, description, url: 'https://www.dinnerdrop.app/ollie', siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png?v=4', width: 1200, height: 630, alt: 'DinnerDrop — Dinner, handled' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png?v=4'] },
}

const GREEN = '#1a5c38'
const GOLD = '#e8a838'
// Code OLLIE (90 days) was dropped from this page: no new stacking offers (Nov 22 2026 review, Sarah approved).
const SIGNUP = '/signup?redirect=%2Ffavorites&utm_source=ollie'

export default function OllieSwitchPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <PublicHeader />
      <main className="container mx-auto px-4 py-10 sm:py-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-5" style={{ backgroundColor: '#fef9ee', borderColor: GOLD, color: GREEN }}>
          For Ollie families
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4" style={{ color: GREEN }}>
          Ollie closed November 6. <span style={{ color: GOLD }}>Dinner doesn&apos;t have to stop.</span>
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-4">
          Ollie announced on October 30 that it would shut down on November 6, and it has now closed. DinnerDrop does the part families relied on: five dinners planned around your family, one grocery list, and the whole list in your Instacart or Walmart cart in one tap. It&apos;s free with no card, on the web and the iPhone app.
        </p>
        <div className="rounded-2xl p-5 mb-8 border" style={{ backgroundColor: '#fef9ee', borderColor: GOLD }}>
          <p className="font-bold" style={{ color: GREEN }}>Your first 14 days of Family are free, no card</p>
          <p className="text-sm text-gray-700 mt-1">
            Every new family gets them when you sign up. Family adds a profile for each person, the week&apos;s dinner ideas texted to everyone to vote on, tastes learned per person, and the Kroger cart push. Nothing bills when the 14 days end; you go back to the free plan.
          </p>
        </div>

        <OllieImportForm />
        <p className="text-xs text-gray-500 mt-3">
          Ollie texted families an export of their data before it closed. If you saved it, paste it into the box above. Want a recipe exactly as written? Paste it on your Recipes page after you sign up.
        </p>

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-6" style={{ color: GREEN }}>What carries over</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { t: 'Everyone’s needs, remembered', d: 'A profile for each person: allergies, dislikes, safe foods and age. Set it once; every week follows it.' },
              { t: 'Plans that fit your week', d: 'Pick how many dinners, a time limit for busy nights, a leftovers night, and a weekly mix (say, 2 chicken, 1 beef, 1 fish).' },
              { t: 'Snap the fridge', d: 'Take a photo of the fridge and get dinners you can make tonight with what’s in it.' },
              { t: 'One list, one tap', d: 'Every plan becomes one grocery list sorted by aisle, and goes to your Walmart cart or your Instacart cart at any store on Instacart. Kroger cart on Family.' },
              { t: 'Real recipes, real photos', d: '1,100+ family dinners with nutrition on every one, plus any recipe you add by link, text or photo.' },
              { t: 'Your data is yours', d: 'Ask any time and we send you a copy of your plans, favorites and lists.' },
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
            <li><strong className="text-gray-800">Ollie was a chat-first app.</strong> DinnerDrop plans the week for you and you swap any dinner in one tap. On the Family plan, the family can text the DinnerDrop number to vote, add to the list, or suggest a dinner.</li>
            <li><strong className="text-gray-800">Ollie had iPhone and Android apps.</strong> DinnerDrop has an iPhone app and works in any phone browser. Android is browser-only for now.</li>
            <li><strong className="text-gray-800">Ollie connected to Walmart and Amazon Fresh.</strong> DinnerDrop sends your list to Instacart (any store on it), a Walmart cart, or straight into a Kroger cart. Amazon Fresh isn&apos;t supported yet.</li>
            <li><strong className="text-gray-800">Pricing.</strong> Planning and the Instacart and Walmart carts are free, always. Family is free for your first 14 days with no card, then $4.99 a month or $39 a year if you keep it.</li>
          </ul>
        </section>

        <section className="mt-14 text-center">
          <Link href={SIGNUP} className="inline-block px-10 py-4 rounded-xl text-white font-bold text-lg shadow-sm hover:opacity-90" style={{ backgroundColor: GREEN }}>
            Start free &rarr;
          </Link>
          <p className="text-sm text-gray-600 mt-3">Two minutes to set up. Your first week of dinners is ready right away.</p>
        </section>

        <p className="text-[11px] text-gray-500 mt-12">
          Shutdown date from Ollie&apos;s announcement of October 30, 2026 (<a className="underline" href="https://techcrunch.com/2026/10/30/ollie-a-privacy-focused-ai-assistant-is-shutting-down/" rel="nofollow noopener">TechCrunch</a>).
          Ollie is a trademark of its owner. DinnerDrop is not affiliated with or endorsed by Ollie.
        </p>
      </main>
    </div>
  )
}
