'use client'
import { Minus, Plus, Users } from 'lucide-react'
import { MIN_SERVINGS, MAX_SERVINGS } from '@/lib/servings'

/** "− 6 servings +" pill. */
export default function ServingsStepper({ servings, onChange, disabled }: { servings: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1 bg-muted rounded-full pl-1 pr-1 py-0.5 text-xs font-medium text-muted-foreground">
      <button type="button" onClick={() => onChange(servings - 1)} disabled={disabled || servings <= MIN_SERVINGS} aria-label="Fewer servings" className="p-1 rounded-full hover:bg-background disabled:opacity-40 print:hidden"><Minus className="w-3.5 h-3.5" /></button>
      <span className="flex items-center gap-1.5 px-1 tabular-nums" aria-live="polite"><Users className="w-3.5 h-3.5" />{servings} servings</span>
      <button type="button" onClick={() => onChange(servings + 1)} disabled={disabled || servings >= MAX_SERVINGS} aria-label="More servings" className="p-1 rounded-full hover:bg-background disabled:opacity-40 print:hidden"><Plus className="w-3.5 h-3.5" /></button>
    </div>
  )
}
