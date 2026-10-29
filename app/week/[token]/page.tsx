import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'
import PublicHeader from '@/components/site/PublicHeader'
import { sizedImage } from '@/lib/image-src'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Our dinners this week — planned with DinnerDrop',
  description: '5 weeknight dinners, one grocery list, one tap to Instacart. Plan your own week free.',
  robots: { index: false },
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')

/** Read-only "our dinners this week" page a family shares in a group chat. No names, emails or prices. */
export default async function SharedWeek({ params }: { params: { token: string } }) {
  if (!/^[a-z0-9]{8,16}$/.test(params.token)) notFound()
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: share } = await admin.from('plan_shares').select('user_id').eq('token', params.token).maybeSingle()
  if (!share) notFound()
  const { data: plan } = await admin.from('meal_plans').select('meals, week_start').eq('user_id', share.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const meals: Meal[] = Array.isArray(plan?.meals) ? (plan!.meals as Meal[]) : []
  // Public library pages + photos for the dinners that have them.
  const { data: lib } = meals.length
    ? await admin.from('recipes').select('normalized_name, slug, image_url, is_public').in('normalized_name', meals.map((m) => norm(m.name)))
    : { data: [] }
  const byName = new Map((lib ?? []).map((r) => [r.normalized_name as string, r as { slug: string | null; image_url: string | null; is_public: boolean }]))
  const week = plan?.week_start ? new Date(plan.week_start + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : ''

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">This week&apos;s dinners{week ? ` · week of ${week}` : ''}</p>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-6">What we&apos;re eating this week 🍽️</h1>
        {meals.length === 0 ? (
          <p className="text-muted-foreground">No dinners planned yet this week — check back soon.</p>
        ) : (
          <ul className="space-y-3">
            {meals.map((m, i) => {
              const r = byName.get(norm(m.name))
              const img = m.imageUrl || r?.image_url || ''
              const href = r?.is_public && r.slug ? `/recipes/${r.slug}` : null
              const body = (
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow">
                  {img
                    ? <img src={sizedImage(img, 240)} alt="" loading="lazy" className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg object-cover flex-shrink-0 bg-orange-100" /> // eslint-disable-line @next/next/no-img-element
                    : <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-orange-100 flex items-center justify-center text-3xl flex-shrink-0">🍽️</div>}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{m.day || `Dinner ${i + 1}`}</p>
                    <p className="font-heading font-semibold text-foreground leading-tight">{m.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{(m.cookTime ?? 0) + (m.prepTime ?? 0) ? `${(m.cookTime ?? 0) + (m.prepTime ?? 0) > 60 ? `${m.cookTime} min (hands-off)` : `${(m.cookTime ?? 0) + (m.prepTime ?? 0)} min`}` : ''}{href ? ' · see the recipe →' : ''}</p>
                  </div>
                </div>
              )
              return <li key={i}>{href ? <Link href={href}>{body}</Link> : body}</li>
            })}
          </ul>
        )}
        <section className="mt-10 rounded-2xl bg-foreground text-primary-foreground p-6 text-center">
          <h2 className="text-xl font-heading font-bold mb-2">Want a week like this for your family?</h2>
          <p className="text-sm text-primary-foreground/70 mb-4">DinnerDrop picks 5 dinners for your family and budget, builds one grocery list, and puts it in your Instacart cart in one tap. Free.</p>
          <Link href="/start?utm_source=shared_week&utm_medium=link" className="inline-block px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold">Plan my week free →</Link>
        </section>
      </main>
    </div>
  )
}
