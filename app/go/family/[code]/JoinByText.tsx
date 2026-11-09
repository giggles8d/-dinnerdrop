'use client'
import { useState } from 'react'

export default function JoinByText({ code, number, pretty }: { code: string; number: string; pretty: string }) {
  const [name, setName] = useState('')
  const text = `JOIN ${code}${name.trim() ? ` ${name.trim().split(/\s+/)[0]}` : ''}`
  // "?&body=" opens a prefilled text on both iPhone and Android.
  const href = `sms:${number}?&body=${encodeURIComponent(text)}`
  return (
    <div className="rounded-2xl border border-primary/20 bg-secondary/40 p-5">
      <label htmlFor="jn" className="block text-sm font-semibold text-foreground">Your first name</label>
      <input id="jn" value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} autoComplete="given-name" placeholder="e.g. Emma"
        className="mt-2 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-base" />
      <a href={href} className={`mt-4 block text-center px-5 py-3 rounded-xl font-semibold ${name.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground pointer-events-none'}`} aria-disabled={!name.trim()}>
        Text to join →
      </a>
      <p className="text-xs text-muted-foreground mt-3">Button not opening your texts? Send <span className="font-mono font-semibold text-foreground select-all">{text}</span> to <span className="font-semibold text-foreground select-all">{pretty}</span>.</p>
    </div>
  )
}
