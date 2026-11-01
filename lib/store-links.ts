/**
 * Store product links texted to the DinnerDrop number (Nov 1 2026, Sarah: "My kids are used to texting me Walmart links").
 * A Walmart link carries the product's item id (walmart.com/ip/<slug>/<id>), which is all the Walmart add-to-cart link
 * needs, and usually a readable name in the slug. Short links (walmrt.us, wmt.co) are followed to the full URL.
 */

export interface WalmartLink {
  url: string
  itemId: number
  name: string | null   // from the URL slug; null when the link has no readable name
}

const WALMART_RE = /https?:\/\/(?:www\.)?(?:walmart\.com\/ip\/|walmrt\.us\/|wmt\.co\/)[^\s<>"']+/gi

/** Every Walmart link in a text, in order. */
export function walmartUrlsIn(text: string): string[] {
  return Array.from(new Set(String(text ?? '').match(WALMART_RE) ?? [])).map((u) => u.replace(/[).,!?]+$/, ''))
}

/** Read item id and name from a full walmart.com/ip/ URL. */
export function parseWalmartUrl(url: string): WalmartLink | null {
  let u: URL
  try { u = new URL(url) } catch { return null }
  if (!/(^|\.)walmart\.com$/i.test(u.hostname)) return null
  const parts = u.pathname.split('/').filter(Boolean)
  const ip = parts.indexOf('ip')
  if (ip < 0) return null
  const rest = parts.slice(ip + 1)
  const idPart = [...rest].reverse().find((p) => /^\d{5,}$/.test(p))
  if (!idPart) return null
  const slug = rest.find((p) => !/^\d+$/.test(p) && p.toLowerCase() !== 'seort')
  let name: string | null = null
  if (slug) {
    try { name = decodeURIComponent(slug) } catch { name = slug }
    name = name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || null
  }
  return { url: `https://www.walmart.com/ip/${slug ? `${encodeURIComponent(slug)}/` : ''}${idPart}`, itemId: Number(idPart), name }
}

/** Resolve a Walmart link (following short links) to item id + name. Never throws. */
export async function resolveWalmartLink(raw: string): Promise<WalmartLink | null> {
  const direct = parseWalmartUrl(raw)
  if (direct) return direct
  let url = raw
  for (let hop = 0; hop < 4; hop++) {
    try {
      const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(4000), headers: { 'User-Agent': 'Mozilla/5.0 (DinnerDrop link reader)' } })
      const loc = res.headers.get('location')
      if (!loc) return null
      url = new URL(loc, url).toString()
      const parsed = parseWalmartUrl(url)
      if (parsed) return parsed
    } catch { return null }
  }
  return null
}
