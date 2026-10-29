/**
 * Photo diet for recipe images (Sarah, Oct 29 2026). Stored photos arrive as ~1 MB JPEGs; this
 * re-saves each as a 900px-wide WebP (~40–100 KB) beside the original (`<id>.webp`; the `<id>.jpg`
 * stays in storage) and points the recipe at it, so cards can load photos directly instead of
 * leaning on Vercel's image resizer. Runs a time-boxed batch from the daily cron (also picks up new
 * photos as they're added) and from the admin route. Safe to re-run.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const PATTERN = '%/storage/v1/object/public/recipe-images/%'

export async function shrinkRecipeImages(admin: SupabaseClient, opts: { limit: number; budgetMs: number }) {
  const started = Date.now()
  // Loaded here, not at the top, so a native-module problem can never take down the daily job that imports this file.
  const sharp = (await import('sharp')).default
  const { data: rows } = await admin.from('recipes').select('id, image_url')
    .like('image_url', PATTERN).not('image_url', 'like', '%.webp%').limit(opts.limit)
  let processed = 0, before = 0, after = 0
  const errors: Array<{ id: string; error: string }> = []
  for (const r of rows ?? []) {
    if (Date.now() - started > opts.budgetMs) break
    try {
      const res = await fetch(r.image_url as string, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`download ${res.status}`)
      const input = Buffer.from(await res.arrayBuffer())
      const out = await sharp(input).rotate().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer()
      const path = `${r.id}.webp`
      const { error } = await admin.storage.from('recipe-images').upload(path, out, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' })
      if (error) throw new Error(error.message)
      const { data: pub } = admin.storage.from('recipe-images').getPublicUrl(path)
      await admin.from('recipes').update({ image_url: `${pub.publicUrl}?v=${Date.now()}` }).eq('id', r.id)
      processed++; before += input.length; after += out.length
    } catch (e) {
      errors.push({ id: r.id as string, error: e instanceof Error ? e.message : String(e) })
    }
  }
  const { count: remaining } = await admin.from('recipes').select('id', { count: 'exact', head: true })
    .like('image_url', PATTERN).not('image_url', 'like', '%.webp%')
  return { processed, kbBefore: Math.round(before / 1024), kbAfter: Math.round(after / 1024), errors: errors.slice(0, 10), remaining }
}
