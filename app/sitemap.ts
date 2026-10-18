import { MetadataRoute } from 'next'
import { getPublishedPosts } from '@/lib/published-posts'

const BASE = 'https://www.dinnerdrop.app'

// Re-generate hourly so future-dated posts enter the sitemap on their publish date.
export const revalidate = 3600

export default function sitemap(): MetadataRoute.Sitemap {
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
