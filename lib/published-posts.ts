import { BLOG_POSTS, BlogPost } from '@/lib/blog-posts'

// B-04: render-time publish filter. Posts dated in the future are hidden from
// the blog index, return 404 on their detail route, and are excluded from the
// sitemap. They auto-publish on their publishDate with no further work.
// publishDate strings like '2026-06-09' parse as UTC midnight, so a post goes
// live at 00:00 UTC on its date.
export function isPublished(post: BlogPost | null | undefined): post is BlogPost {
  if (!post || !post.slug || !post.publishDate) return false
  const d = new Date(post.publishDate)
  return !isNaN(d.getTime()) && d.getTime() <= Date.now()
}

export function getPublishedPosts(): BlogPost[] {
  return BLOG_POSTS.filter(isPublished)
}

export function getPublishedPostBySlug(slug: string): BlogPost | undefined {
  return getPublishedPosts().find((p) => p.slug === slug)
}
