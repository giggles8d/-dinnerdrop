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

export async function createInstacartLink(
  items: GroceryItem[]
): Promise<{ link: string; fallback: boolean }> {
  const apiKey = process.env.INSTACART_API_KEY
  if (!apiKey) {
    console.error('INSTACART_API_KEY is not set')
    return {
      link: `https://www.instacart.com/products/search?q=${encodeURIComponent(
        items[0]?.searchTerm || 'groceries'
      )}`,
      fallback: true,
    }
  }

  const payload: InstacartPayload = {
    title: 'DinnerDrop Weekly Groceries',
    image_url: 'https://dinnerdrop.app/og-image.png',
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
        link: `https://www.instacart.com/products/search?q=${encodeURIComponent(firstItem)}`,
        fallback: true,
      }
    }

    const data = (await response.json()) as { products_link_url?: string }
    if (!data.products_link_url) {
      console.error('Instacart API: missing products_link_url in response')
      return {
        link: 'https://www.instacart.com/',
        fallback: true,
      }
    }
    return { link: data.products_link_url, fallback: false }
  } catch (err) {
    console.error('Instacart API call threw:', err)
    return {
      link: 'https://www.instacart.com/',
      fallback: true,
    }
  }
}
