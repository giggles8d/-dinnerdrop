/**
 * Ask the image host for a right-sized photo instead of routing it through Vercel's optimizer.
 * Unsplash (imgix) takes w/q/auto params; other hosts (our Supabase storage) are returned as-is.
 */
export function sizedImage(url: string, width: number): string {
  if (!url) return url
  try {
    const u = new URL(url)
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('w', String(width))
      u.searchParams.set('q', '70')
      u.searchParams.set('auto', 'format')
      u.searchParams.set('fit', 'crop')
      return u.toString()
    }
  } catch { /* relative or odd URL: leave it */ }
  return url
}

export const isUnsplash = (url: string) => /^https:\/\/images\.unsplash\.com\//.test(url)
