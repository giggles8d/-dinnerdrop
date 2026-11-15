import type { Metadata } from 'next'
import { verifyFollowup } from '@/lib/followup'
import TextingForm from './TextingForm'

export const metadata: Metadata = { title: 'Add your family’s numbers · DinnerDrop', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default function GoTexting({ searchParams }: { searchParams: { u?: string; s?: string; m?: string } }) {
  const u = searchParams.u ?? ''
  const s = searchParams.s ?? ''
  const me = searchParams.m === 'me'   // "Text me my week" email (Nov 15 2026): just your number first
  const valid = /^[0-9a-f-]{36}$/i.test(u) && verifyFollowup(u, 'texting', s)
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-10">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">DinnerDrop family texting</p>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-3">{me ? 'Get your week by text' : 'Let the family pick dinner'}</h1>
        {me
          ? <p className="text-muted-foreground mb-6">Every week we text you your dinners and a link to your grocery cart, already filled. Tap, check out, done. Reply <span className="font-semibold text-foreground">SWAP 2</span> to change a dinner, or text <span className="font-semibold text-foreground">ADD milk</span> to add something.</p>
          : <p className="text-muted-foreground mb-6">Add the numbers below. DinnerDrop texts everyone the week’s dinners to vote on, anyone can text <span className="font-semibold text-foreground">ADD milk</span> onto the grocery list, and you get a heads-up before you order. No app for anyone to install.</p>}
        {valid ? <TextingForm u={u} s={s} me={me} /> : (
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            This link has expired. <a href="/settings?section=texting" className="font-semibold text-primary underline">Sign in and open Settings → Texting</a> to add numbers there.
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-6">{me ? 'By tapping “Text me my week,” you agree to receive automated texts from DinnerDrop about your dinners and grocery list at this number (a few a week, never ads). Msg & data rates may apply. Reply STOP to stop, HELP for help.' : 'Each person gets one text and replies YES to join. Reply STOP anytime. Msg & data rates may apply.'}</p>
      </div>
    </main>
  )
}
