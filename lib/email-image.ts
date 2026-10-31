/**
 * Recipe photos for EMAIL. The library photos are WebP (photo diet), which classic Outlook (Word renderer)
 * and some older clients can't show — the Thanksgiving email on Oct 31 rendered "linked image cannot be
 * displayed" there. Every WebP has its JPEG original beside it, so emails use Supabase's image renderer to
 * serve a resized JPEG (~80 KB) instead of the 1 MB original.
 */
const SUPABASE_PUBLIC = /^(https:\/\/[a-z0-9]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+?)\.webp(\?.*)?$/i

export function emailImageUrl(url: string | null | undefined, width = 480): string | null {
  if (!url) return null
  const m = url.match(SUPABASE_PUBLIC)
  if (!m) return url
  return `${m[1]}/storage/v1/render/image/public/${m[2]}.jpg?width=${width}&quality=72&format=origin`
}
