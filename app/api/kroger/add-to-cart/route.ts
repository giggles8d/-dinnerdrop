import { NextResponse } from 'next/server'
import { parseQuantity } from '@/lib/portions'
import { createClient } from '@supabase/supabase-js'
import { sendWeekRecipes } from '@/lib/recipe-email'
import { stockStaplesFromList } from '@/lib/pantry'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getClientCredentialsToken, searchProduct, addItemsToCart, refreshKrogerToken } from '@/lib/kroger'
import type { GroceryItem } from '@/types'
import { loadProductPrefs, applyPrefsToItems } from '@/lib/product-prefs'
import { grantCartOffer } from '@/lib/cart-offer'
import { serviceClient, getKrogerTokens, saveKrogerTokens } from '@/lib/kroger-tokens'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const svc = serviceClient()
    const tok = await getKrogerTokens(svc, user.id)

    if (!tok?.access_token) {
      return NextResponse.json({ error: 'Kroger account not connected' }, { status: 403 })
    }

    // Check token expiry — attempt silent refresh before failing hard
    let accessToken = tok.access_token
    if (tok.expires_at && new Date(tok.expires_at) < new Date()) {
      if (!tok.refresh_token) {
        return NextResponse.json({ error: 'Kroger session expired. Please reconnect.' }, { status: 403 })
      }
      try {
        const refreshed = await refreshKrogerToken(tok.refresh_token)
        await saveKrogerTokens(svc, user.id, refreshed)
        accessToken = refreshed.access_token
      } catch {
        return NextResponse.json({ error: 'Kroger session expired. Please reconnect.' }, { status: 403 })
      }
    }

    const { groceryList, chosen, locationId, weekStart } = await request.json()
    const allItems = applyPrefsToItems(Object.values(groceryList ?? {}).flat() as GroceryItem[], (await loadProductPrefs(supabase, user.id)).prefs)
    // Reviewed in the app: the family already saw and (maybe) changed what goes in; push exactly that.
    const picked = Array.isArray(chosen) ? (chosen as Array<{ name: string; productId: string; quantity: number }>).filter((c) => c && typeof c.productId === 'string' && c.productId) : null

    // Search for each item using client credentials token
    const searchToken = await getClientCredentialsToken()
    const cartItems: { productId: string; quantity: number }[] = []
    const sentNames: string[] = []

    if (picked) {
      for (const c of picked) { sentNames.push(c.name); cartItems.push({ productId: c.productId, quantity: Math.min(20, Math.max(1, Math.round(Number(c.quantity) || 1))) }) }
    } else {
      for (const item of allItems) {
        const product = await searchProduct(item.searchTerm || item.name, searchToken, typeof locationId === 'string' ? locationId : undefined)
        if (product) {
          sentNames.push(item.name)
          cartItems.push({ productId: product.productId, quantity: Math.ceil(parseQuantity(item.quantity) || 1) })
        }
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
        week_start: typeof weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(weekStart) ? weekStart : null,
      })
      await grantCartOffer(user.id)
    } catch (logErr) {
      console.error('[kroger] handoff log failed:', logErr)
    }
    try {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await stockStaplesFromList(admin, user.id, null).catch((e) => console.error('[kroger] staple stock failed:', e))
      // Lines stay on the list until the family confirms the order went through.
      await sendWeekRecipes(admin, user.id)
    } catch (mailErr) {
      console.error('[kroger] recipe email failed:', mailErr)
    }

    return NextResponse.json({
      added: cartItems.length,
      total: picked ? picked.length : allItems.length,
    })
  } catch (error) {
    console.error('Kroger add-to-cart error:', error)
    return NextResponse.json(
      { error: 'Failed to add items to Kroger cart' },
      { status: 500 }
    )
  }
}
