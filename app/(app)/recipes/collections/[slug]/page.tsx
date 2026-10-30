import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { collectionBySlug, COLLECTIONS } from '@/lib/collections'
import { libraryIndex } from '@/lib/recipe-index'
import MealCardImage from '@/components/MealCardImage'

export const revalidate = 600

export function generateStaticParams() { return COLLECTIONS.map((c) => ({ slug: c.slug })) }

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = collectionBySlug(params.slug)
  if (!c) return {}
  const title = `${c.name} dinners — family recipes with a one-tap grocery list | DinnerDrop`
  const description = `${c.blurb} Real family weeknight dinners with honest cook times, cost per meal, and a grocery list that lands in your Instacart cart in one tap.`
  const url = `https://www.dinnerdrop.app/recipes/collections/${c.slug}`
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  }
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const c = collectionBySlug(params.slug)
  if (!c) notFound()
  const rows = (await libraryIndex()).filter((r) => c.match({ name: r.name, tags: r.tags, cuisine: r.cuisine }))
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.dinnerdrop.app/' },
      { '@type': 'ListItem', position: 2, name: 'Recipes', item: 'https://www.dinnerdrop.app/recipes' },
      { '@type': 'ListItem', position: 3, name: c.name, item: `https://www.dinnerdrop.app/recipes/collections/${c.slug}` },
    ],
  }
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/recipes" className="text-sm text-muted-foreground hover:text-foreground">← Recipe library</Link>
        <p className="mt-4 text-xs font-semibold tracking-widest text-primary uppercase">Collection</p>
        <h1 className="text-3xl font-heading font-bold text-foreground"><span aria-hidden="true">{c.emoji} </span>{c.name}</h1>
        <p className="text-muted-foreground mt-1 mb-6">{c.blurb} {rows.length} dinners.</p>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Dinners are being added — check back soon.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map((r) => (
            <Link key={r.id} href={`/recipes/${r.slug}`} className="rounded-xl border border-border bg-card overflow-hidden group hover:shadow-md transition-shadow block">
              <MealCardImage mealName={r.name} dayLabel="" imageUrl={r.image_url ?? undefined} />
              <div className="p-4">
                <h3 className="font-heading font-semibold leading-tight text-card-foreground group-hover:text-primary">{r.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{r.time} min · {r.servings} servings{r.kept > 0 ? ` · kept by ${r.kept} ${r.kept === 1 ? 'family' : 'families'}` : ''}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-12 rounded-2xl bg-foreground text-primary-foreground p-6 text-center">
          <h2 className="text-xl font-heading font-bold mb-2">Want these planned into your week?</h2>
          <p className="text-sm text-primary-foreground/70 mb-4">Heart any dinner and it rotates into your plans. The grocery list lands in your Instacart cart in one tap.</p>
          <Link href={`/start?utm_source=collection&utm_medium=site&utm_campaign=${c.slug}`} className="inline-block px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold">Plan my week free →</Link>
        </div>
      </div>
    </div>
  )
}
