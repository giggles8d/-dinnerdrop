'use client'
import { Printer } from 'lucide-react'

/** Opens the browser's print dialog. Hidden in the iOS app (its web view has no print dialog) and on paper. */
export default function PrintButton({ label, className }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label={label ?? 'Print'}
      title={label ?? 'Print'}
      className={`web-only print:hidden ${className ?? 'p-2 rounded-full hover:bg-muted transition-colors'}`}
    >
      <Printer className="w-5 h-5 text-muted-foreground" />
      {label && <span>{label}</span>}
    </button>
  )
}
