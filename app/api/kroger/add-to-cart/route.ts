import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getClientCredentialsToken, searchProduct, addItemsToCart, refreshKrogerToken } from '@/lib/kroger'
import type { GroceryItem } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('kroger_access_token, kroger_refresh_token, kroger_token_expires_at')
      .eq('id', user.id)
      .single()

    if (!profile?.kroger_access_token) {
      return NextResponse.json({ error: 'Kroger account not connected' }, { status: 403 })
    }

    // Check token expiry — attempt silent refresh before failing hard
    let accessToken = profile.kroger_access_token
    if (profile.kroger_token_expires_at && new Date(profile.kroger_token_expires_at) < new Date()) {
      if (!profile.kroger_refresh_token) {
        return NextResponse.json({ error: 'Kroger session expired. Please reconnect.' }, { status: 403 })
      }
      try {
        const refreshed = await refreshKrogerToken(profile.kroger_refresh_token)
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        await supabase.from('profiles').update({
          kroger_access_token: refreshed.access_token,
          kroger_refresh_token: refreshed.refresh_token,
          kroger_token_expires_at: newExpiresAt,
        }).eq('id', user.id)
        accessToken = refreshed.access_token
      } catch {
        return NextResponse.json({ error: 'Kroger session expired. Please reconnect.' }, { status: 403 })
      }
    }

    const { groceryList } = await request.json()
    const allItems = Object.values(groceryList).flat() as GroceryItem[]

    // Search for each item using client credentials token
    const searchToken = await getClientCredentialsToken()
    const cartItems: { productId: string; quantity: number }[] = []

    for (const item of allItems) {
      const product = await searchProduct(item.searchTerm || item.name, searchToken)
      if (product) {
        cartItems.push({
          productId: product.productId,
          quantity: Math.ceil(parseFloat(item.quantity) || 1),
        })
      }
    }

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'No matching products found' }, { status: 404 })
    }

    // Add to cart using user's OAuth token (refreshed if needed)
    const success = await addItemsToCart(cartItems, accessToken)

    if (!success) {
      return NextResponse.json({ error: 'Failed to add items to Kroger cart' }, { status: 500 })
    }

    // Log the handoff (best-effort — never block the response on analytics).
    try {
      await supabase.from('grocery_handoffs').insert({
        user_id: user.id,
        store: 'Kroger',
        item_count: cartItems.length,
      })
    } catch (logErr) {
      console.error('[kroger] handoff log failed:', logErr)
    }

    return NextResponse.json({
      added: cartItems.length,
      total: allItems.length,
    })
  } catch (error) {
    console.error('Kroger add-to-cart error:', error)
    return NextResponse.json(
      { error: 'Failed to add items to Kroger cart' },
      { status: 500 }
    )
  }
}
