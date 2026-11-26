'use client'

/**
 * Variant B of the summary-first test (lib/summary-test, Sarah Nov 25 2026): on a family's first list visits, until
 * their first send, the aisles sit behind one "See all N items" button and a short summary shows instead. The
 * estimated total stays only in the top box (Sarah). One tap opens the full list for the rest of the visit.
 */
export default function SummaryFirst({ dinners, itemCount, probablyHave, onExpand }: { dinners: string[]; itemCount: number; probablyHave: number; onExpand: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 print:hidden">
      {dinners.length > 0 && (
        <>
          <p className="text-sm font-semibold text-foreground">Your {dinners.length} dinner{dinners.length === 1 ? '' : 's'}</p>
          <ul className="mt-2 space-y-1">
            {dinners.map((d, i) => <li key={`${d}-${i}`} className="text-sm text-muted-foreground">✓ {d}</li>)}
          </ul>
        </>
      )}
      <p className="mt-4 text-sm text-foreground">{itemCount} item{itemCount === 1 ? '' : 's'}, grouped by aisle.{probablyHave > 0 ? ` ${probablyHave} thing${probablyHave === 1 ? '' : 's'} you probably have stay${probablyHave === 1 ? 's' : ''} off the cart.` : ''}</p>
      <button type="button" data-track="summary_see_all" onClick={onExpand} className="mt-3 inline-flex min-h-[44px] items-center px-5 rounded-xl border-2 border-primary text-primary text-sm font-semibold hover:bg-primary/5">
        See all {itemCount} items
      </button>
    </div>
  )
}
