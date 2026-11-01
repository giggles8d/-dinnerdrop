import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/site/PublicHeader'
import OllieImportForm from './OllieImportForm'

const title = 'Ollie is closing Nov 6 — keep your family dinners going with DinnerDrop (free)'
const description =
  'Ollie shuts down November 6, 2026. Type the dinners your family loved and DinnerDrop plans your week around them, builds one grocery list and loads your Instacart cart. Free, no card. Code OLLIE adds 3 months of Family.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://www.dinnerdrop.app/ollie' },
  openGraph: { title, description, url: 'https://www.dinnerdrop.app/ollie', siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png?v=3', width: 1200, height: 630, alt: 'DinnerDrop — Dinner, handled' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png?v=3'] },
}

const GREEN = '#1a5c38'
const GOLD = '#e8a838'
const SIGNUP = '/signup?redirect=%2Ffavorites&utm_source=ollie&code=OLLIE'

export default function OllieSwitchPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <PublicHeader />
      <main className="container mx-auto px-4 py-10 sm:py-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border mb-5" style={{ backgroundColor: '#fef9ee', borderColor: GOLD, color: GREEN }}>
          For Ollie families
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4" style={{ color: GREEN }}>
          Ollie closes November 6. <span style={{ color: GOLD }}>Dinner doesn&apos;t have to stop.</span>
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-4">
          Ollie announced on October 30 that it is shutting down on November 6. DinnerDrop does the part families relied on: five dinners planned around your family, one grocery list, and the whole list in your Instacart cart in one tap. It&apos;s free with no card, on the web and your phone.
        </p>
        <div className="rounded-2xl p-5 mb-8 border" style={{ backgroundColor: '#fef9ee', borderColor: GOLD }}>
          <p className="font-bold" style={{ color: GREEN }}>Code OLLIE: 3 months of Family free</p>
          <p className="text-sm text-gray-700 mt-1">
            It&apos;s applied for you when you sign up from this page. Family adds a profile for each person, the week&apos;s dinner ideas texted to everyone to vote on, tastes learned per person, and the Kroger cart push. No card, and nothing bills when the 3 months end.
          </p>
        </div>

        <OllieImportForm />
        <p className="text-xs text-gray-500 mt-3">
          Ollie is texting families an export of their data before it closes. Save it, then paste it into the box above. Want a recipe exactly as written? Paste it on your Recipes page after you sign up.
        </p>

        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-6" style={{ color: GREEN }}>What carries over</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { t: 'Everyone’s needs, remembered', d: 'A profile for each person: allergies, dislikes, safe foods and age. Set it once; every week follows it.' },
              { t: 'Plans that fit your week', d: 'Pick how many dinners, a time limit for busy nights, a leftovers night, and a weekly mix (say, 2 chicken, 1 beef, 1 fish).' },
              { t: 'Snap the fridge', d: 'Take a photo of the fridge and get dinners you can make tonight with what’s in it.' },
              { t: 'One list, one tap', d: 'Every plan becomes one grocery list sorted by aisle, and opens in your Instacart cart at any store on Instacart. Kroger cart on Family.' },
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
            <li><strong className="text-gray-800">Ollie had native iPhone and Android apps.</strong> DinnerDrop works in any phone browser and saves to your home screen. An iPhone app is on the way.</li>
            <li><strong className="text-gray-800">Ollie connected to Walmart and Amazon Fresh.</strong> DinnerDrop sends your list to Instacart (any store on it) or straight into a Kroger cart. Walmart isn&apos;t supported yet.</li>
            <li><strong className="text-gray-800">Pricing.</strong> Planning and the Instacart cart are free, always. Family is $4.99 a month or $39 a year if you keep it after your free months.</li>
          </ul>
        </section>

        <section className="mt-14 text-center">
          <Link href={SIGNUP} className="inline-block px-10 py-4 rounded-xl text-white font-bold text-lg shadow-sm hover:opacity-90" style={{ backgroundColor: GREEN }}>
            Start free with code OLLIE &rarr;
          </Link>
          <p className="text-sm text-gray-600 mt-3">Two minutes to set up. Your first week of dinners is ready right away.</p>
        </section>

        <p className="text-[11px] text-gray-500 mt-12">
          Shutdown date from Ollie&apos;s announcement of October 30, 2026 (<a className="underline" href="https://techcrunch.com/2026/10/30/ollie-a-privacy-focused-ai-assistant-is-shutting-down/" rel="nofollow noopener">TechCrunch</a>). Code OLLIE: 90 days of Family for new or existing DinnerDrop accounts, one code per account, redeem by March 31, 2027.
          Ollie is a trademark of its owner. DinnerDrop is not affiliated with or endorsed by Ollie.
        </p>
      </main>
    </div>
  )
}
