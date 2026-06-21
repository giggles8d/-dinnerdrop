'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function SuccessInner() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [name, setName] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [email, setEmail] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setState('error')
      setMessage('Missing your order reference.')
      return
    }
    fetch(`/api/shop/download?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not verify your purchase')
        setName(data.name)
        setDownloadUrl(data.downloadUrl)
        setEmail(data.email)
        setState('ready')
      })
      .catch((err) => {
        setState('error')
        setMessage(err instanceof Error ? err.message : 'Something went wrong')
      })
  }, [sessionId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {state === 'loading' && (
          <>
            <div className="text-5xl">⏳</div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Confirming your purchase…</h1>
          </>
        )}
        {state === 'ready' && (
          <>
            <div className="text-5xl">🎉</div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Thank you! Your download is ready.</h1>
            <p className="text-muted-foreground">{name}</p>
            <a
              href={downloadUrl}
              className="inline-block w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Download now →
            </a>
            <p className="text-xs text-muted-foreground">
              {email ? <>A receipt was sent to {email}. </> : null}
              This link works for 24 hours — save your file somewhere safe.
            </p>
            <Link href="/shop" className="text-sm text-primary hover:underline">← Back to the shop</Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="text-5xl">😕</div>
            <h1 className="text-2xl font-heading font-bold text-foreground">We couldn&apos;t load your download</h1>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">
              If you were charged, email support@dinnerdrop.app with your receipt and we&apos;ll send your file right away.
            </p>
            <Link href="/shop" className="text-sm text-primary hover:underline">← Back to the shop</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function ShopSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <SuccessInner />
    </Suspense>
  )
}
