import Link from 'next/link'
import type { Meal } from '@/types'
import { cookwareForMeal, cookwareUrl } from '@/lib/cookware'

/** "Cookware you'll need" on a recipe: get it all out first (Mealime's tip), each with an Amazon link. */
export default function CookwareList({ meal }: { meal: Pick<Meal, 'steps' | 'tags' | 'name'> }) {
  const items = cookwareForMeal(meal)
  if (!items.length) return null
  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Cookware you&apos;ll need</h2>
      <p className="text-xs text-muted-foreground mb-3">Set these out before you start — it saves hunting through drawers mid-recipe.</p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
            <span className="text-sm text-foreground flex-1">{it.name}</span>
            <a href={cookwareUrl(it)} target="_blank" rel="sponsored nofollow noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">Don&apos;t have one? Amazon →</a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground mt-2">
        <Link href="/cookware" className="underline underline-offset-2 hover:text-primary">Our kitchen essentials list</Link>
        {' '}· As an Amazon Associate, DinnerDrop earns from qualifying purchases.
      </p>
    </section>
  )
}
