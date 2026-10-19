import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createInstacartLink } from '@/lib/instacart'
import { createClient } from '@supabase/supabase-js'
import { sendWeekRecipes } from '@/lib/recipe-email'
import { stockStaplesFromList } from '@/lib/pantry'
import type { GroceryItem } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groceryList, estTotal, weekStart, store, quoteOnly } = await request.json()
    const storeName = typeof store === 'string' ? store.slice(0, 40) : ''

    if (!groceryList || typeof groceryList !== 'object') {
      return NextResponse.json({ error: 'Invalid grocery list' }, { status: 400 })
    }

    const allItems = Object.values(groceryList).flat() as GroceryItem[]

    if (allItems.length === 0) {
      return NextResponse.json({ error: 'Grocery list is empty' }, { status: 400 })
    }

    const result = await createInstacartLink(allItems, storeName ? `DinnerDrop — ${storeName} list` : 'DinnerDrop Weekly Groceries')

    // Log the handoff (best-effort — never block the response on analytics).
    if (result.link && !result.fallback) {
      try {
        // quoteOnly: the Saturday price read builds a list page just to read prices — not a handoff.
        if (!quoteOnly) await supabase.from('grocery_handoffs').insert({
          user_id: user.id,
          store: storeName ? `Instacart · ${storeName}` : 'Instacart',
          item_count: allItems.length,
          est_total: Number(estTotal) > 0 ? Number(estTotal) : null,
          week_start: typeof weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(weekStart) ? weekStart : null,
        })
      } catch (logErr) {
        console.error('[instacart] handoff log failed:', logErr)
      }
      // The week's recipe cards go out once the groceries are on their way (once per plan).
      if (!quoteOnly) {
        try {
          const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
          await stockStaplesFromList(admin, user.id, typeof weekStart === 'string' ? weekStart : null).catch((e) => console.error('[instacart] staple stock failed:', e))
          await sendWeekRecipes(admin, user.id)
        } catch (mailErr) {
          console.error('[instacart] recipe email failed:', mailErr)
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating Instacart link:', error)
    return NextResponse.json(
      { error: 'Failed to create Instacart link.' },
      { status: 500 }
    )
  }
}
