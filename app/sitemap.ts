import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getPublishedPosts } from '@/lib/published-posts'

const BASE = 'https://www.dinnerdrop.app'

// Re-generate hourly so future-dated posts enter the sitemap on their publish date.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Public recipe library pages (server-rendered since 2026-10-18).
  let recipeEntries: MetadataRoute.Sitemap = []
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.from('recipes').select('slug, updated_at, created_at').order('kept_count', { ascending: false }).limit(500)
    recipeEntries = (data ?? []).filter((r) => r.slug).map((r) => ({
      url: `${BASE}/recipes/${r.slug}`,
      lastModified: new Date(r.updated_at ?? r.created_at ?? Date.now()),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch { /* leave recipes out of this build of the sitemap */ }
  const blogEntries: MetadataRoute.Sitemap = getPublishedPosts().map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.publishDate),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    {
      url: `${BASE}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/start`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE}/mealime`,
      lastModified: new Date('2026-10-18'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    { url: `${BASE}/recipes`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
    ...['gluten-free-family-dinners', 'picky-eater-dinners', 'dinners-under-30-minutes', 'family-dinners-under-100'].map((slug) => ({
      url: `${BASE}/dinners/${slug}`,
      lastModified: new Date('2026-10-18'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE}/gift`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE}/cookware`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE}/disclosure`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/affiliates`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...blogEntries,
    ...recipeEntries,
    {
      url: `${BASE}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
