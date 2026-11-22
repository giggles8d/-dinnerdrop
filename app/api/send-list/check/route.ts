import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyListLink } from '@/lib/list-link'

export const dynamic = 'force-dynamic'

/**
 * POST { u, s, id, checked } from the no-sign-in list page (app/list): ticks a line off while the family shops, so
 * the list in the app matches what's in the basket (Nov 22 2026 review, Sarah approved). Signed like the list link;
 * only that family's own open lines can change, and only their "checked" mark.
 */
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as { u?: string; s?: string; id?: string; checked?: boolean }
  const u = String(b.u ?? '')
  if (!verifyListLink(u, String(b.s ?? ''))) return NextResponse.json({ error: 'This link has expired.' }, { status: 401 })
  const id = String(b.id ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Bad item' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await admin.from('list_items').update({ checked: b.checked === true }).eq('id', id).eq('user_id', u).is('ordered_at', null)
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
