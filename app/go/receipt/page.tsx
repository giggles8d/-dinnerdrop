import type { Metadata } from 'next'
import { verifyFollowup } from '@/lib/followup'
import ReceiptUpload from '@/components/ReceiptUpload'

export const metadata: Metadata = { title: 'Upload your receipt · DinnerDrop', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** The day-after email's one-tap receipt link (signed, no sign-in). */
export default function GoReceipt({ searchParams }: { searchParams: { u?: string; s?: string; a?: string } }) {
  const u = searchParams.u ?? ''
  const s = searchParams.s ?? ''
  const valid = /^[0-9a-f-]{36}$/i.test(u) && verifyFollowup(u, 'receipt', s)
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">DinnerDrop</p>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-3">{searchParams.a === 'ordered' ? 'Thanks — glad it went through!' : searchParams.a === 'missing' ? 'Sorry some things didn’t come' : 'How did the order go?'}</h1>
        <p className="text-muted-foreground">Add your receipt and DinnerDrop checks it against your list: anything the store was out of goes back on the list, and your real total makes next week&rsquo;s price estimates more accurate.</p>
        {valid ? <ReceiptUpload endpoint="/api/go/receipt" auth={{ u, s }} /> : (
          <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm">
            This link has expired. <a href="/grocery-list" className="font-semibold text-primary underline">Sign in and open your grocery list</a> to upload it there.
          </div>
        )}
      </div>
    </main>
  )
}
