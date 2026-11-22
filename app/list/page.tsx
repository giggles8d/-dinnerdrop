import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import InStoreList from '@/components/InStoreList'
import { listCartUrl, loadSharedList, verifyListLink } from '@/lib/list-link'

export const metadata: Metadata = { title: 'Your grocery list · DinnerDrop', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * /list?u=&s= — the family's grocery list with no sign-in (Nov 22 2026 review, Sarah approved). Reached from
 * "Text me this list", the shop-day morning text or email, and the day-1 texts. Web families have no password, so
 * the old links to /grocery-list ended on a sign-in screen in the store.
 */
export default async function SharedList({ searchParams }: { searchParams: { u?: string; s?: string } }) {
  const u = searchParams.u ?? ''
  const s = searchParams.s ?? ''
  const valid = verifyListLink(u, s)
  const admin = valid ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) : null
  const list = admin ? await loadSharedList(admin, u) : null
  // Record the open as its own event, not a send (Sarah approved Nov 22 2026). Link previews in Messages and chat apps
  // fetch the page too, so skip bots, and log at most once per 6 hours.
  if (admin && list) {
    const ua = headers().get('user-agent') ?? ''
    if (!/bot|preview|facebookexternalhit|whatsapp|slack|telegram|discord|crawler|spider/i.test(ua)) {
      try {
        const { count } = await admin.from('activation_events').select('id', { count: 'exact', head: true }).eq('user_id', u).eq('step', 'list_link_open').gte('created_at', new Date(Date.now() - 6 * 3600000).toISOString())
        if (!count) await admin.from('activation_events').insert({ user_id: u, step: 'list_link_open', meta: { lines: list.lines.length } })
      } catch { /* tracking only */ }
    }
  }

  return (
    <main className="min-h-[100svh] bg-background">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <p className="text-sm font-semibold text-primary">DinnerDrop</p>
        {!valid ? (
          <div className="mt-4">
            <h1 className="text-2xl font-heading font-bold text-foreground">This link doesn&apos;t work anymore</h1>
            <p className="mt-2 text-muted-foreground">Sign in to see your grocery list.</p>
            <a href="/grocery-list" className="mt-5 inline-flex min-h-[44px] items-center px-5 rounded-xl bg-primary text-primary-foreground font-semibold">Open my grocery list</a>
          </div>
        ) : !list ? (
          <div className="mt-4">
            <h1 className="text-2xl font-heading font-bold text-foreground">No dinners planned yet</h1>
            <p className="mt-2 text-muted-foreground">Plan your week and your grocery list shows up here.</p>
            <a href="/dashboard" className="mt-5 inline-flex min-h-[44px] items-center px-5 rounded-xl bg-primary text-primary-foreground font-semibold">Plan my week</a>
          </div>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-heading font-bold text-foreground">Your grocery list</h1>
            {list.dinners.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">For {list.dinners.length} dinner{list.dinners.length === 1 ? '' : 's'}: {list.dinners.slice(0, 7).join(', ')}</p>
            )}
            {list.lines.length === 0 ? (
              <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <p className="font-semibold text-foreground">{list.allBought ? 'Everything on this list is bought.' : 'Your list is empty right now.'}</p>
                <p className="mt-1 text-sm text-muted-foreground">Anything you or your family adds to the list shows up here.</p>
              </div>
            ) : (
              <InStoreList u={u} s={s} weekKey={list.weekStart ?? 'now'} lines={list.lines} />
            )}
            {list.lines.length > 0 && (
              <div className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
                <p>Rather order online?</p>
                <a href={listCartUrl(u, s)} className="mt-1 inline-flex min-h-[44px] items-center font-semibold text-primary underline underline-offset-4">Send this list to my Instacart cart</a>
                <p className="mt-1 text-xs">Opens Instacart with every item. You check out there.</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
