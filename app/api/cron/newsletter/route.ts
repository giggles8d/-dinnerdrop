import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import SundayDrop from '@/emails/SundayDrop'
import { buildDrop, dayLabel, dropConfig, sendDropPreviews, DROP_PROFILE_COLS, type DropProfile, type Segment } from '@/lib/sunday-drop'
import { libraryWeek } from '@/lib/first-plan'

// The Sunday Drop v3 (Nov 8 2026). Sending no longer happens here: each family gets it on their planning day from the
// daily reminders, and everyone else on Sunday from the texting poll's sweep (lib/sunday-drop). This route is the
// admin preview:
//   ?preview=1[&segments=shop,vote,picked,done,comeback]  → one test email per version to Sarah (built from her account)
//   ?html=1&segment=shop                                   → that version's HTML (nothing saved, nothing sent)
// Auth: Sarah's logged-in session or the admin x-image-token header.

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const ADMIN_EMAIL = 'setzl1979@gmail.com'
const ALL: Segment[] = ['shop', 'vote', 'picked', 'done', 'comeback']

async function isAdminSession(): Promise<boolean> {
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { get(name: string) { return cookieStore.get(name)?.value }, set() {}, remove() {} },
    })
    const { data: { user } } = await supabase.auth.getUser()
    return user?.email?.toLowerCase() === ADMIN_EMAIL
  } catch { return false }
}

export async function GET(request: NextRequest) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const url = new URL(request.url)
  if (request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}` && !url.searchParams.get('preview') && !url.searchParams.get('html')) {
    return NextResponse.json({ skipped: 'The Sunday Drop now sends from the daily reminders and the Sunday poll sweep (lib/sunday-drop).' })
  }
  const token = request.headers.get('x-image-token')
  let ok = await isAdminSession()
  if (!ok && token && token.length >= 32) {
    const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
    ok = (data?.value as { token?: string } | null)?.token === token
  }
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (url.searchParams.get('html') === '1') {
    const seg = (url.searchParams.get('segment') ?? 'shop') as Segment
    const { data: p } = await admin.from('profiles').select(DROP_PROFILE_COLS).eq('email', ADMIN_EMAIL).maybeSingle()
    if (!p) return NextResponse.json({ error: 'no profile' }, { status: 404 })
    const cfg = await dropConfig(admin)
    const b = await buildDrop(admin, p as DropProfile, { address: cfg.address || '[mailing address goes here]', dryRun: true, force: seg })
    if ((seg === 'picked' || seg === 'comeback')) {
      const built = await libraryWeek(admin, (p as DropProfile).id)
      if (built.ok) { b.props.dinners = built.meals.slice(0, 3).map((m, i) => ({ day: dayLabel(m.day, i), name: m.name })); b.props.moreCount = Math.max(0, built.meals.length - 3) }
    }
    if (seg === 'vote' && !b.props.vote) b.props.vote = { voted: 3, members: 5, leaders: ['Meatloaf', 'Chicken Alfredo'] }
    const html = await render(React.createElement(SundayDrop, b.props))
    return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'x-drop-subject': encodeURIComponent(b.subject) } })
  }
  if (url.searchParams.get('preview') === '1') {
    const wanted = (url.searchParams.get('segments') ?? '').split(',').filter((s): s is Segment => (ALL as string[]).includes(s))
    const results = await sendDropPreviews(admin, wanted.length ? wanted : ALL)
    return NextResponse.json({ preview: true, results })
  }
  return NextResponse.json({ usage: '?preview=1[&segments=shop,vote,picked,done,comeback] or ?html=1&segment=shop', live: (await dropConfig(admin)).live })
}
