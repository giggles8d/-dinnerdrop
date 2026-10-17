import type { GroceryItem } from '@/types'

/**
 * Instacart Developer Platform — Create Shopping List Page
 *
 * Docs: https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page
 *
 * Sandbox base: https://connect.dev.instacart.tools  (use with dev API key)
 * Prod base:    https://connect.instacart.com        (use with prod API key)
 *
 * Switch envs via INSTACART_API_ENV ("sandbox" | "production"). Defaults to sandbox.
 */

interface InstacartLineItem {
  name: string
  quantity?: number
  unit?: string | null
  display_text?: string
}

interface InstacartPayload {
  title: string
  image_url: string
  link_type: 'shopping_list' | 'recipe'
  expires_in?: number // days; defaults to 7 server-side
  line_items: InstacartLineItem[]
  landing_page_configuration?: {
    partner_linkback_url?: string
    enable_pantry_items?: boolean
  }
}

function getInstacartBaseUrl(): string {
  const env = (process.env.INSTACART_API_ENV || 'sandbox').toLowerCase()
  return env === 'production'
    ? 'https://connect.instacart.com'
    : 'https://connect.dev.instacart.tools'
}

/**
 * Instacart affiliate attribution (Impact.com, IDP affiliate program — Partner ID 7359743,
 * campaign 20313, approved 2026-10-17). Instacart appends these parameters to every
 * products_link URL it returns, so NEVER call this on an API-created link (duplicates
 * break attribution, per Instacart's docs). It is only for our own fallback links —
 * search pages and the homepage — which would otherwise carry no tracking at all.
 */
const AFFILIATE_PARTNER_ID = process.env.INSTACART_AFFILIATE_PARTNER_ID || '7359743' // Impact media partner (irmp)
const AFFILIATE_CAMPAIGN_ID = process.env.INSTACART_AFFILIATE_CAMPAIGN_ID || '20313'
const AFFILIATE_AD_ID = process.env.INSTACART_AFFILIATE_AD_ID || '1744632' // Impact ad id (irad) from the contract's tracking link

export function withInstacartAffiliate(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname !== 'www.instacart.com' && u.hostname !== 'instacart.com') return url
    let hasUtm = false
    u.searchParams.forEach((_, k) => { if (k.startsWith('utm_')) hasUtm = true })
    if (hasUtm || u.searchParams.has('irmp')) return url
    // Impact direct-link click tracking (what the contract's last-click / 7-day window keys on)
    u.searchParams.set('irmp', AFFILIATE_PARTNER_ID)
    u.searchParams.set('irad', AFFILIATE_AD_ID)
    u.searchParams.set('utm_campaign', 'instacart-idp')
    u.searchParams.set('utm_medium', 'affiliate')
    u.searchParams.set('utm_source', 'instacart_idp')
    u.searchParams.set('utm_term', 'partnertype-mediapartner')
    u.searchParams.set('utm_content', `campaignid-${AFFILIATE_CAMPAIGN_ID}_partnerid-${AFFILIATE_PARTNER_ID}`)
    return u.toString()
  } catch {
    return url
  }
}

function fallbackSearch(term: string): string {
  return withInstacartAffiliate(`https://www.instacart.com/products/search?q=${encodeURIComponent(term)}`)
}

export async function createInstacartLink(
  items: GroceryItem[]
): Promise<{ link: string; fallback: boolean }> {
  const apiKey = process.env.INSTACART_API_KEY
  if (!apiKey) {
    console.error('INSTACART_API_KEY is not set')
    return {
      link: fallbackSearch(items[0]?.searchTerm || 'groceries'),
      fallback: true,
    }
  }

  const payload: InstacartPayload = {
    title: 'DinnerDrop Weekly Groceries',
    image_url: 'https://dinnerdrop.app/og-image.png?v=2',
    link_type: 'shopping_list',
    expires_in: 7,
    line_items: items.map((item) => ({
      name: item.searchTerm || item.name,
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || null,
      display_text: `${item.quantity} ${item.unit} ${item.name}`.trim(),
    })),
    landing_page_configuration: {
      partner_linkback_url: 'https://dinnerdrop.app/grocery-list',
      enable_pantry_items: true,
    },
  }

  const endpoint = `${getInstacartBaseUrl()}/idp/v1/products/products_link`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      console.error(
        `Instacart API error: ${response.status} ${response.statusText} — ${errBody.slice(0, 500)}`
      )
      const firstItem = items[0]?.searchTerm || 'groceries'
      return {
        link: fallbackSearch(firstItem),
        fallback: true,
      }
    }

    const data = (await response.json()) as { products_link_url?: string }
    if (!data.products_link_url) {
      console.error('Instacart API: missing products_link_url in response')
      return {
        link: withInstacartAffiliate('https://www.instacart.com/'),
        fallback: true,
      }
    }
    return { link: data.products_link_url, fallback: false }
  } catch (err) {
    console.error('Instacart API call threw:', err)
    return {
      link: withInstacartAffiliate('https://www.instacart.com/'),
      fallback: true,
    }
  }
}
