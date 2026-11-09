import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import JoinByText from './JoinByText'

export const metadata: Metadata = { title: 'Join your family’s dinner texts · DinnerDrop', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * The link a planner shares with their family (Nov 9 2026). Each person types their first name and taps one
 * button: their phone opens a text "JOIN <code> <name>" to DinnerDrop. Sending it is their opt-in
 * (lib/texting joinByText). Nobody has to type anyone else's number.
 */
export default async function FamilyJoin({ params }: { params: { code: string } }) {
  const code = (params.code ?? '').toUpperCase()
  let first = ''
  if (/^[A-Z0-9]{8}$/.test(code)) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await admin.from('profiles').select('full_name').eq('referral_code', code).maybeSingle()
    if (data) first = ((data.full_name as string | null) || '').trim().split(' ')[0] || ' '
  }
  const number = process.env.TWILIO_FROM_NUMBER ?? ''
  const pretty = number.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
  const who = first.trim() ? `${first.trim().charAt(0).toUpperCase()}${first.trim().slice(1)}’s` : 'Your'
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-10">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">DinnerDrop family texting</p>
        {first ? (
          <>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-3">{who} family wants your dinner vote</h1>
            <p className="text-muted-foreground mb-6">Once a week you get a few dinner ideas by text. Reply with the numbers you like, and the top picks make the week. Need something from the store? Text <span className="font-semibold text-foreground">ADD granola bars</span> and it lands on the grocery list. No app to install.</p>
            <JoinByText code={code} number={number} pretty={pretty} />
            <p className="text-xs text-muted-foreground mt-6">Sending the text signs you up. About 2–4 texts a week. Msg &amp; data rates may apply. Reply STOP anytime to stop.</p>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 text-sm">This family link doesn’t work anymore. Ask whoever sent it for a new one.</div>
        )}
      </div>
    </main>
  )
}
