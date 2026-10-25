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
 * campaign 20313, approved 2026-10-17). Safe on any instacart.com link: it does nothing
 * when the link already carries utm_* (i.e. once Instacart tags products_link URLs itself).
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

// Instacart only understands its own units. Anything that means "a package of it" (bag, box, jar,
// 12-pack…) is sent as "package" so the quantity means packages; count words become "each";
// weights/volumes pass through. An unknown unit makes Instacart add ONE package regardless of quantity.
const PACKAGE_UNITS = new Set(['bag', 'bags', 'box', 'boxes', 'pack', 'packs', 'package', 'packages', 'pkg', 'jar', 'jars', 'can', 'cans', 'bottle', 'bottles', 'carton', 'cartons', 'container', 'containers', 'tub', 'tubs', 'loaf', 'loaves', 'roll', 'rolls', 'case', 'cases', 'sleeve', 'sleeves', 'block', 'blocks', 'stick', 'sticks', 'bar', 'bars', 'tube', 'tubes', 'pouch', 'pouches', 'dozen', '12-pack', '6-pack', '24-pack', 'variety pack', 'multipack', 'kit', 'kits', 'set', 'sets'])
const COUNT_UNITS = new Set(['', 'whole', 'each', 'count', 'ct', 'piece', 'pieces', 'item', 'items', 'unit', 'units', 'head', 'heads', 'bunch', 'bunches', 'ear', 'ears', 'stalk', 'stalks'])
const MEASURE_UNITS = new Set(['lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces', 'fl oz', 'gallon', 'gallons', 'quart', 'quarts', 'pint', 'pints', 'liter', 'liters', 'l', 'ml', 'kg', 'g', 'gram', 'grams', 'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons'])
export function instacartUnit(unit: string | null | undefined): string {
  const u = (unit ?? '').trim().toLowerCase()
  if (PACKAGE_UNITS.has(u)) return 'package'
  if (COUNT_UNITS.has(u)) return 'each'
  if (MEASURE_UNITS.has(u)) return u
  return 'package'   // "clove", "slice", "handful"… — safest is one package of it
}

export async function createInstacartLink(
  items: GroceryItem[],
  title = 'DinnerDrop Weekly Groceries'
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
    title,
    image_url: 'https://dinnerdrop.app/og-image.png?v=3',
    link_type: 'shopping_list',
    expires_in: 7,
    line_items: items.map((item) => {
      const qty = parseFloat(item.quantity) || 1
      const unit = instacartUnit(item.unit)
      // Small ingredient counts ("3 cloves garlic", "2 slices") mean one package, not three.
      const quantity = unit === 'package' && !PACKAGE_UNITS.has((item.unit ?? '').trim().toLowerCase()) ? 1 : qty
      return {
        name: item.searchTerm || item.name,
        quantity,
        unit,
        display_text: `${item.quantity} ${item.unit} ${item.name}`.replace(/\s+/g, ' ').trim(),
      }
    }),
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
    // Instacart appends the affiliate parameters (partner 7359743) to API links itself and
    // warns that adding them by hand duplicates them and breaks order attribution
    // (docs: launch_activities/conversions_and_payments). Verified present 2026-10-21. Leave untouched.
    return { link: data.products_link_url, fallback: false }
  } catch (err) {
    console.error('Instacart API call threw:', err)
    return {
      link: withInstacartAffiliate('https://www.instacart.com/'),
      fallback: true,
    }
  }
}
