import { sideFor } from '@/lib/sides'
import { sideRecipes, scaleSideItems } from '@/lib/side-steps'
import { formatQuantity, parseQuantity } from '@/lib/portions'
import type { Meal } from '@/types'

/** "On the side": what to buy and how to make the dinner's side, sized to the dinner's servings (lib/side-steps). */
export default function SideSteps({ meal, variant = 'page' }: { meal: Meal; variant?: 'page' | 'print' }) {
  const side = sideFor(meal)
  const parts = sideRecipes(side)
  if (!side?.name || !parts.length) return null
  const items = scaleSideItems(side, meal.servings)
  const qty = (q: string, u: string) => { const n = parseQuantity(q); return n == null ? q : formatQuantity(n, u) }
  const steps = parts.flatMap((p) => (parts.length > 1 ? p.steps.map((s, i) => (i === 0 ? `${p.name}: ${s}` : s)) : p.steps))
  const small = variant === 'print'
  return (
    <section className={small ? 'mt-5' : 'mb-8 mt-8'}>
      <h2 className={small ? 'text-xs font-bold text-primary uppercase tracking-widest mb-2' : 'text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3'}>
        On the side: {side.name} <span className="normal-case tracking-normal font-normal">({side.minutes} min)</span>
      </h2>
      {items.length > 0 && (
        <p className={small ? 'text-sm mb-2' : 'text-base mb-3'}>
          {items.map((i, n) => {
            const q = qty(String(i.quantity ?? ''), i.unit || '')
            const many = (parseQuantity(q) ?? 1) > 1
            const u = i.unit && !/^count$/i.test(i.unit) ? ` ${many && /^(cup|bag|package|bottle|loaf|jar|container|box|pack)$/i.test(i.unit) ? (i.unit.toLowerCase() === 'loaf' ? 'loaves' : i.unit + 's') : i.unit}` : ''
            return <span key={n}>{n ? ', ' : ''}<span className="font-semibold">{q}{u}</span> {i.name.toLowerCase()}</span>
          })}
        </p>
      )}
      <ol className={small ? 'list-decimal pl-5 space-y-1.5 text-sm' : 'list-decimal pl-6 space-y-3 text-base leading-relaxed marker:text-foreground'}>
        {steps.map((s, i) => <li key={i} className="pl-1">{s}</li>)}
      </ol>
    </section>
  )
}
