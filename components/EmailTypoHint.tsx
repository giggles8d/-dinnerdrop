'use client'

/**
 * "Did you mean name@gmail.com? [Use this]" under an email field. (Sarah, Nov 25 2026; lib/email-typo)
 *
 * Never blocks: the first submit with a likely typo pauses once so the suggestion can be seen; the next submit goes
 * through with whatever they typed. Accepting is tracked as cta_tap meta.id 'email_typo_fix' (domains only).
 */
import { useRef, useState } from 'react'
import { emailDomain, suggestEmail } from '@/lib/email-typo'
import { trackAfterSignIn } from '@/lib/activation'

export function useEmailTypo(email: string, setEmail: (v: string) => void, page: string) {
  const [shown, setShown] = useState(false)
  const [kept, setKept] = useState<string | null>(null)
  const paused = useRef<string | null>(null)
  const typed = email.trim().toLowerCase()
  const raw = suggestEmail(email)
  const suggestion = raw && kept !== typed ? raw : null

  return {
    suggestion,
    visible: !!suggestion && shown,
    onBlur: () => { if (suggestion) setShown(true) },
    /** Call first thing in submit. True = stop this one submit so they can see the suggestion (once per address). */
    holdSubmit: (): boolean => {
      if (!suggestion || paused.current === typed) return false
      paused.current = typed
      setShown(true)
      return true
    },
    accept: () => {
      if (!suggestion) return
      trackAfterSignIn('cta_tap', { id: 'email_typo_fix', page, from: emailDomain(email), to: emailDomain(suggestion) })
      setEmail(suggestion)
      setShown(false)
    },
    keep: () => { setKept(typed); setShown(false) },
  }
}

export default function EmailTypoHint({ hint }: { hint: ReturnType<typeof useEmailTypo> }) {
  if (!hint.visible || !hint.suggestion) return null
  const at = hint.suggestion.lastIndexOf('@')
  return (
    <div role="status" aria-live="polite" className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <p>
        Did you mean <strong className="break-all">{hint.suggestion.slice(0, at)}@<span className="underline">{hint.suggestion.slice(at + 1)}</span></strong>?
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4">
        <button type="button" onClick={hint.accept} className="min-h-[44px] rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">
          Use this
        </button>
        <button type="button" onClick={hint.keep} className="min-h-[44px] text-amber-950 underline">
          Keep what I typed
        </button>
      </div>
    </div>
  )
}
