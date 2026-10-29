import type { Metadata } from 'next'
import Link from 'next/link'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import PublicHeader from '@/components/site/PublicHeader'
import { giftFromSession, giftLink, GIFT_PLANS, type GiftPlanId } from '@/lib/gifts'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Your DinnerDrop gift — thank you!', robots: { index: false } }

export default async function GiftThanks({ searchParams }: { searchParams: { session_id?: string } }) {
  const id = searchParams.session_id ?? ''
  let gift: Awaited<ReturnType<typeof giftFromSession>> = null
  let pending = false
  if (/^cs_[A-Za-z0-9_]+$/.test(id)) {
    try {
      const session = await new Stripe(process.env.STRIPE_SECRET_KEY!).checkout.sessions.retrieve(id)
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      gift = await giftFromSession(admin, session)
      pending = !gift && session.metadata?.kind === 'gift' && session.payment_status !== 'paid'
    } catch (e) { console.error('[gift/thanks]', e) }
  }
  const length = gift ? GIFT_PLANS[String(gift.months) as GiftPlanId]?.label ?? `${gift.months} months` : ''
  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden"><PublicHeader active="gift" /></div>
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {!gift ? (
          <div className="text-center py-10">
            <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{pending ? 'Your payment is still processing' : "We couldn't find that gift"}</h1>
            <p className="text-muted-foreground mb-6">{pending ? 'Refresh in a minute — your gift code will appear here and in your email.' : 'If you just paid, check your email for the gift code (it can take a few minutes), or reply to your Stripe receipt and we’ll sort it out.'}</p>
            <Link href="/gift" className="text-primary font-semibold underline">Back to gifts</Link>
          </div>
        ) : (
          <>
            <div className="print:hidden text-center mb-8">
              <p className="text-4xl mb-2">🎁</p>
              <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Thank you{gift.buyer_name ? `, ${gift.buyer_name}` : ''}!</h1>
              <p className="text-muted-foreground">
                {gift.recipient_email && gift.emailed_recipient_at ? `We emailed the gift to ${gift.recipient_email}. ` : ''}
                {gift.buyer_email ? `Your receipt and the code are on their way to ${gift.buyer_email}.` : ''}
              </p>
            </div>
            {/* The printable card */}
            <div className="rounded-3xl border-2 border-accent bg-[#fff8e8] p-8 text-center shadow-sm print:shadow-none print:border-black">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">A gift for your dinner table</p>
              <h2 className="text-3xl font-heading font-bold text-foreground mb-2">{length} of DinnerDrop</h2>
              {gift.recipient_name && <p className="text-lg text-foreground mb-1">For {gift.recipient_name}</p>}
              {gift.buyer_name && <p className="text-sm text-muted-foreground mb-4">From {gift.buyer_name}</p>}
              {gift.message && <p className="italic text-foreground max-w-md mx-auto mb-5">&ldquo;{gift.message}&rdquo;</p>}
              <p className="text-sm text-muted-foreground mb-1">5 dinners planned every week · one grocery list · one tap to Instacart</p>
              <p className="text-sm text-muted-foreground mb-4">Claim it at <strong>dinnerdrop.app/start</strong> with code</p>
              <p className="inline-block rounded-xl bg-white border border-border px-5 py-2 text-2xl font-bold tracking-[0.15em] text-primary">{gift.code}</p>
              <p className="text-[11px] text-muted-foreground mt-4">No card needed. It starts when they sign up.</p>
            </div>
            <div className="print:hidden mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <PrintButton />
              <a href={`sms:?&body=${encodeURIComponent(`A little gift for you 🎁 ${length} of DinnerDrop — it plans our weeknight dinners and sends the grocery list to Instacart. Claim it here: ${giftLink(gift.code)}`)}`} className="px-5 py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-muted">Text them the link</a>
              <span className="text-xs text-muted-foreground break-all">{giftLink(gift.code)}</span>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
