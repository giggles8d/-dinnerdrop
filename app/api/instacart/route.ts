import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createInstacartLink } from '@/lib/instacart'
import type { GroceryItem } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groceryList } = await request.json()

    if (!groceryList || typeof groceryList !== 'object') {
      return NextResponse.json({ error: 'Invalid grocery list' }, { status: 400 })
    }

    const allItems = Object.values(groceryList).flat() as GroceryItem[]

    if (allItems.length === 0) {
      return NextResponse.json({ error: 'Grocery list is empty' }, { status: 400 })
    }

    const result = await createInstacartLink(allItems)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating Instacart link:', error)
    return NextResponse.json(
      { error: 'Failed to create Instacart link.' },
      { status: 500 }
    )
  }
}
