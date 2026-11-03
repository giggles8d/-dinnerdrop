import type { Metadata } from 'next'
import { verifyFollowup } from '@/lib/followup'
import TextingForm from './TextingForm'

export const metadata: Metadata = { title: 'Add your family’s numbers · DinnerDrop', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default function GoTexting({ searchParams }: { searchParams: { u?: string; s?: string } }) {
  const u = searchParams.u ?? ''
  const s = searchParams.s ?? ''
  const valid = /^[0-9a-f-]{36}$/i.test(u) && verifyFollowup(u, 'texting', s)
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">DinnerDrop family texting</p>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-3">Let the family pick dinner</h1>
        <p className="text-muted-foreground mb-6">Add the numbers below. DinnerDrop texts everyone the week’s dinners to vote on, anyone can text <span className="font-semibold text-foreground">ADD milk</span> onto the grocery list, and you get a heads-up before you order. No app for anyone to install.</p>
        {valid ? <TextingForm u={u} s={s} /> : (
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            This link has expired. <a href="/settings?section=texting" className="font-semibold text-primary underline">Sign in and open Settings → Texting</a> to add numbers there.
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-6">Each person gets one text and replies YES to join. Reply STOP anytime. Msg &amp; data rates may apply.</p>
      </div>
    </main>
  )
}
