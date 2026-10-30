// Kroger client credentials OAuth + API helpers

let clientToken: { accessToken: string; expiresAt: number } | null = null

export async function getClientCredentialsToken(): Promise<string> {
  if (clientToken && Date.now() < clientToken.expiresAt) {
    return clientToken.accessToken
  }

  const clientId = process.env.KROGER_CLIENT_ID
  const clientSecret = process.env.KROGER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Kroger credentials not configured')
  }
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  })

  if (!res.ok) {
    throw new Error(`Kroger auth failed: ${res.status}`)
  }

  const data = await res.json()
  clientToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  return clientToken.accessToken
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const clientId = process.env.KROGER_CLIENT_ID
  const clientSecret = process.env.KROGER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Kroger credentials not configured')
  }
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.dinnerdrop.app'}/auth/kroger/callback`

  const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kroger token exchange failed: ${res.status} ${text}`)
  }

  return res.json()
}

export interface KrogerProduct { productId: string; name: string; brand?: string; size?: string; price?: number; image?: string; inStock?: boolean }

/** Kroger product matches for a search term (up to `limit`), with size, price and a thumbnail when a store is set. */
export async function searchProducts(query: string, accessToken: string, opts: { limit?: number; locationId?: string } = {}): Promise<KrogerProduct[]> {
  const params = new URLSearchParams({ 'filter.term': query.slice(0, 80), 'filter.limit': String(Math.min(opts.limit ?? 5, 20)) })
  if (opts.locationId) params.set('filter.locationId', opts.locationId)
  const res = await fetch(`https://api.kroger.com/v1/products?${params}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } })
  if (!res.ok) return []
  const data = await res.json()
  type Raw = { productId: string; description: string; brand?: string; items?: Array<{ size?: string; price?: { regular?: number; promo?: number }; fulfillment?: { inStore?: boolean; curbside?: boolean; delivery?: boolean } }>; images?: Array<{ perspective?: string; sizes?: Array<{ size: string; url: string }> }> }
  return ((data.data ?? []) as Raw[]).map((p) => {
    const it = p.items?.[0]
    const img = (p.images ?? []).find((i) => i.perspective === 'front') ?? p.images?.[0]
    const thumb = img?.sizes?.find((z) => z.size === 'thumbnail' || z.size === 'small')?.url ?? img?.sizes?.[0]?.url
    const price = it?.price?.promo && it.price.promo > 0 ? it.price.promo : it?.price?.regular
    const f = it?.fulfillment
    return { productId: p.productId, name: p.description, brand: p.brand, size: it?.size, price: price && price > 0 ? price : undefined, image: thumb, inStock: f ? !!(f.inStore || f.curbside || f.delivery) : undefined }
  })
}

export async function searchProduct(query: string, accessToken: string, locationId?: string): Promise<{ productId: string; name: string } | null> {
  const [p] = await searchProducts(query, accessToken, { limit: 1, locationId })
  return p ? { productId: p.productId, name: p.name } : null
}

/** Nearby Kroger-family stores for a ZIP (to price and stock-check products). */
export async function findLocations(zip: string, accessToken: string): Promise<Array<{ locationId: string; name: string; address: string }>> {
  const params = new URLSearchParams({ 'filter.zipCode.near': zip, 'filter.limit': '6' })
  const res = await fetch(`https://api.kroger.com/v1/locations?${params}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } })
  if (!res.ok) return []
  const data = await res.json()
  type Loc = { locationId: string; name: string; chain?: string; address?: { addressLine1?: string; city?: string; state?: string } }
  return ((data.data ?? []) as Loc[]).map((l) => ({ locationId: l.locationId, name: l.chain ? `${l.chain} — ${l.name}` : l.name, address: [l.address?.addressLine1, l.address?.city, l.address?.state].filter(Boolean).join(', ') }))
}

export async function addItemsToCart(
  items: { productId: string; quantity: number }[],
  accessToken: string
): Promise<boolean> {
  const res = await fetch('https://api.kroger.com/v1/cart/add', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        upc: item.productId,
        quantity: item.quantity,
      })),
    }),
  })

  return res.ok
}

export async function refreshKrogerToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const clientId = process.env.KROGER_CLIENT_ID
  const clientSecret = process.env.KROGER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Kroger credentials not configured')
  }
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kroger token refresh failed: ${res.status} ${text}`)
  }

  return res.json()
}
