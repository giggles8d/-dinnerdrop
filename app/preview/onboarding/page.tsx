'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Walkthrough from '@/components/Walkthrough'

// Design preview of the first-visit setup (no account, nothing saved). ?step=0..8
function Preview() {
  const params = useSearchParams()
  const step = Number(params.get('step') ?? 0)
  const [done, setDone] = useState<string | null>(null)
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <p className="text-xs text-muted-foreground mb-4">Preview only — nothing is saved. Add ?step=1 to 8 to jump.</p>
        <Walkthrough key={step} demo initialStep={step} onDone={(a) => setDone(JSON.stringify(a))} />
        {done && <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{done}</pre>}
      </div>
    </div>
  )
}

export default function PreviewOnboardingPage() {
  return <Suspense fallback={null}><Preview /></Suspense>
}
