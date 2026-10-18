'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function JoinHouseholdPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [state, setState] = useState<'working' | 'done' | 'error'>('working')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace(`/signup?redirect=${encodeURIComponent(`/join/${token}`)}`); return }
      const res = await fetch('/api/household/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); setMsg(data.error || 'Could not join.'); return }
      setState('done')
    })()
  }, [token, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        {state === 'working' && <><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-muted-foreground">Joining your family&apos;s DinnerDrop…</p></>}
        {state === 'done' && <>
          <div className="text-4xl">🎉</div>
          <h1 className="text-2xl font-heading font-bold">You&apos;re in</h1>
          <p className="text-muted-foreground">You now see the same week of dinners and the same grocery list. Add anything to the list and it shows up for both of you.</p>
          <Link href="/dashboard" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">See this week&apos;s dinners</Link>
        </>}
        {state === 'error' && <>
          <h1 className="text-2xl font-heading font-bold">Hmm</h1>
          <p className="text-muted-foreground">{msg}</p>
          <Link href="/dashboard" className="text-primary underline text-sm">Go to my dashboard</Link>
        </>}
      </div>
    </div>
  )
}
