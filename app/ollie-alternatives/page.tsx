import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/site/PublicHeader'

// Nov 6 2026: Ollie (and Ollie for Meals) shut down today. Honest comparison for families looking for a replacement.
// Competitor facts come from the linked pages; re-check prices before editing.

const title = 'Ollie alternatives for family meal planning (2026): 7 apps compared'
const description =
  'Ollie and Ollie for Meals shut down on November 6, 2026. Seven alternatives compared on what Ollie families used: dinner ideas, one grocery list, store delivery and family texting.'
const URL = 'https://www.dinnerdrop.app/ollie-alternatives'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: URL },
  openGraph: { title, description, url: URL, siteName: 'DinnerDrop', type: 'article', images: [{ url: '/og-image.png?v=3', width: 1200, height: 630, alt: 'DinnerDrop — Dinner, handled' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png?v=3'] },
}

const GREEN = '#1a5c38'
const GOLD = '#e8a838'
const SIGNUP = '/signup?redirect=%2Ffavorites&utm_source=ollie_alternatives&code=OLLIE'

type Row = { name: string; ours?: boolean; best: string; grocery: string; texting: string; price: string; src?: { label: string; href: string } }

const ROWS: Row[] = [
  {
    name: 'DinnerDrop', ours: true,
    best: 'Families who want the week planned and the cart filled',
    grocery: 'One tap to Instacart (any store on it), a Walmart cart link, or a Kroger cart',
    texting: 'Yes: family members text a number to vote on dinners and add items. No app needed',
    price: 'Planning and the Instacart cart are free. Family is free for 14 days with no card, then $4.99/month or $39/year',
  },
  {
    name: 'eMeals', best: 'Ready-made weekly menus by diet',
    grocery: 'Sends the list to Walmart, Amazon, Kroger or Instacart', texting: 'No',
    price: '14-day free trial, from $4.99/month on a 12-month plan',
    src: { label: 'Carly comparison', href: 'https://www.usecarly.com/blog/ollie-meal-planner-alternatives/' },
  },
  {
    name: 'Cozi Max', best: 'A shared family calendar with meal planning added',
    grocery: 'Shared shopping lists', texting: 'No',
    price: '$79.99/year',
    src: { label: 'Carly comparison', href: 'https://www.usecarly.com/blog/ollie-meal-planner-alternatives/' },
  },
  {
    name: 'Plan to Eat', best: 'Families with their own saved recipes',
    grocery: 'Shopping lists built from your recipes, with pantry tracking', texting: 'No',
    price: '14-day trial, then $5.95/month or $49/year',
    src: { label: 'Fortune', href: 'https://fortune.com/article/best-meal-planning-apps/' },
  },
  {
    name: 'Mealime', best: 'Diet and allergy filters',
    grocery: 'A grocery list from the plan', texting: 'No',
    price: 'Free; Pro is $2.99/month',
    src: { label: 'Fortune', href: 'https://fortune.com/article/best-meal-planning-apps/' },
  },
  {
    name: 'Carly', best: 'Dinners planned around your calendar, by text',
    grocery: 'Texts an aisle-sorted grocery list', texting: 'Texts you (one person)',
    price: 'Free workflows; AI agents from $35/month',
    src: { label: 'Carly', href: 'https://www.usecarly.com/blog/ollie-meal-planner-alternatives/' },
  },
  {
    name: 'ChatGPT', best: 'One-off ideas if you do the setup',
    grocery: 'You copy the list into your store app yourself', texting: 'No',
    price: 'Free; you ask again each week',
    src: { label: 'Carly comparison', href: 'https://www.usecarly.com/blog/ollie-meal-planner-alternatives/' },
  },
]

const FAQ = [
  { q: 'When did Ollie shut down?', a: 'Ollie announced on October 30, 2026 that Ollie and Ollie for Meals would close on November 6, 2026. Subscriptions were canceled and refunded for unused time.' },
  { q: 'Can I bring my Ollie dinners to another app?', a: 'Ollie texted families an export of their data before it closed. On DinnerDrop you can paste that export (or just type the dinners your family liked) at dinnerdrop.app/ollie, and your first week is planned around them.' },
  { q: 'Which Ollie alternative lets the whole family add to the grocery list by text?', a: 'DinnerDrop. On the Family plan, anyone in the family texts the DinnerDrop number to vote on dinners or add items like "add granola bars", and they land on the one shared list.' },
]

export default function OllieAlternativesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="container mx-auto px-4 py-10 sm:py-16 max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: GOLD }}>Updated November 6, 2026</p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4" style={{ color: GREEN }}>
          The best Ollie alternatives for family meal planning
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-3">
          Ollie and Ollie for Meals shut down on November 6, 2026. Families used it for three things: dinner ideas that fit everyone, one grocery list, and getting that list into a store cart. Here are seven apps compared on exactly those, plus whether the whole family can join in by text.
        </p>
        <p className="text-sm text-gray-500 mb-10">
          Full disclosure: we make DinnerDrop, so it&apos;s listed first. Every other app&apos;s details link to where we found them. Prices change, so check each app before you sign up.
        </p>

        <div className="overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: '#e8e8e8' }}>
          <table className="w-full text-sm text-left min-w-[760px]">
            <thead style={{ backgroundColor: '#f3f4f1' }}>
              <tr className="text-gray-700">
                <th className="p-3 font-semibold">App</th>
                <th className="p-3 font-semibold">Best for</th>
                <th className="p-3 font-semibold">Grocery list and store</th>
                <th className="p-3 font-semibold">Family can text in</th>
                <th className="p-3 font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.name} className="border-t align-top" style={{ borderColor: '#eee', backgroundColor: r.ours ? '#fef9ee' : undefined }}>
                  <td className="p-3 font-bold" style={{ color: GREEN }}>
                    {r.name}
                    {r.ours && <span className="block text-[11px] font-semibold text-gray-500">Our app</span>}
                    {r.src && <a className="block text-[11px] font-normal underline text-gray-500" href={r.src.href} rel="nofollow noopener" target="_blank">Source: {r.src.label}</a>}
                  </td>
                  <td className="p-3 text-gray-700">{r.best}</td>
                  <td className="p-3 text-gray-700">{r.grocery}</td>
                  <td className="p-3 text-gray-700">{r.texting}</td>
                  <td className="p-3 text-gray-700">{r.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-12 space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold" style={{ color: GREEN }}>How to choose</h2>
          <p><strong>You want the week planned and the cart filled:</strong> DinnerDrop or eMeals. DinnerDrop plans around each person&apos;s tastes and allergies and sends the list to Instacart in one tap; eMeals gives you set menus by diet and works with more grocers.</p>
          <p><strong>Your family used to text Ollie:</strong> DinnerDrop is the only app here where everyone in the house can text one number to vote on dinners and add to the shared list. Carly texts, but with one person.</p>
          <p><strong>You mostly need a family calendar:</strong> Cozi Max puts meals next to everyone&apos;s schedule.</p>
          <p><strong>You cook from your own recipes:</strong> Plan to Eat. <strong>You need strict diet filters on a budget:</strong> Mealime.</p>
        </section>

        <section className="mt-12 rounded-2xl p-6 border" style={{ backgroundColor: '#fef9ee', borderColor: GOLD }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: GREEN }}>Moving from Ollie to DinnerDrop</h2>
          <p className="text-gray-700 mb-4">Paste your Ollie export, or just the dinners your family liked, and your first week is planned around them. Code OLLIE gives you 3 months of Family free, no card.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/ollie" className="inline-block px-6 py-3 rounded-xl font-bold border" style={{ borderColor: GREEN, color: GREEN }}>Import my Ollie dinners</Link>
            <Link href={SIGNUP} className="inline-block px-6 py-3 rounded-xl text-white font-bold" style={{ backgroundColor: GREEN }}>Start free with code OLLIE &rarr;</Link>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-4" style={{ color: GREEN }}>Questions</h2>
          <div className="space-y-5">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="font-bold text-gray-800">{f.q}</h3>
                <p className="text-gray-600 mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-gray-500 mt-12">
          Shutdown details from Ollie&apos;s announcement of October 30, 2026 (<a className="underline" href="https://runtimewire.com/article/ollie-shuts-down-november-6th-eight-weeks-after-7-5m-seed" rel="nofollow noopener">RuntimeWire</a>, <a className="underline" href="https://creatorstoolbox.com/blog/ollie-shuts-down-on-november-6" rel="nofollow noopener">Creators Toolbox</a>).
          Ollie and the other app names are trademarks of their owners. DinnerDrop is not affiliated with or endorsed by Ollie.
        </p>
      </main>
    </div>
  )
}
