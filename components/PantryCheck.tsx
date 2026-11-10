'use client'

import { useEffect, useMemo, useState } from 'react'

/**
 * "Already have these?" (Sarah, Nov 10 2026). A family's $225 cart showed the list buys whole bottles and jars of
 * staples a recipe barely uses — about $55 a week on average across families, since few tap "have it". Before the
 * list goes to a store, the staples on it are shown pre-checked; checked ones stay off the cart.
 */
export const PANTRY_STAPLE = /\b(olive oil|vegetable oil|canola oil|cooking spray|sesame oil|oil|salt|black pepper|pepper flakes|ground pepper|peppercorns|cumin|paprika|oregano|chili powder|garlic powder|onion powder|cinnamon|thyme|rosemary|dried basil|italian seasoning|taco seasoning|cayenne|curry powder|nutmeg|ginger powder|ground ginger|bay leaves|seasoning|spice|flour|sugar|brown sugar|baking soda|baking powder|vanilla|vinegar|soy sauce|tamari|worcestershire|hot sauce|sriracha|ketchup|mustard|mayonnaise|mayo|honey|maple syrup|cornstarch|rice|bouillon)\b/i

export interface PantryRow { id: string; name: string; have: boolean; checked: boolean; ordered_at?: string | null }

export default function PantryCheck({ rows, weekKey, onKeepOff }: { rows: PantryRow[]; weekKey: string; onKeepOff: (ids: string[]) => Promise<void> }) {
  const staples = useMemo(() => rows.filter((r) => !r.have && !r.checked && !r.ordered_at && PANTRY_STAPLE.test(r.name) && !/\b(fresh|bell pepper|jalape|poblano|serrano|green pepper|red pepper|cauliflower rice|rice noodles?)\b/i.test(r.name)), [rows])
  const key = `dd_pantry_check:${weekKey}`
  const [done, setDone] = useState(true)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let seen = false
    try { seen = localStorage.getItem(key) === '1' } catch { /* private mode */ }
    setDone(seen)
  }, [key])
  useEffect(() => { setPicked(new Set(staples.map((s) => s.id))) }, [staples])
  if (done || staples.length === 0) return null
  const finish = () => { try { localStorage.setItem(key, '1') } catch { /* ignore */ } setDone(true) }
  return (
    <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 print:hidden dark:bg-amber-950/30">
      <p className="font-semibold text-foreground">Already have these?</p>
      <p className="text-sm text-muted-foreground mt-1">Your recipes use a little of each, but a store sells the whole bottle or bag. Checked ones stay off your cart. Uncheck anything you&apos;re out of.</p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
        {staples.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
            <input type="checkbox" className="h-4 w-4" checked={picked.has(s.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n })} />
            <span>{s.name}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={async () => { setBusy(true); try { await onKeepOff(Array.from(picked)) } finally { setBusy(false); finish() } }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
          {picked.size ? `Keep ${picked.size} off my cart` : 'Done'}
        </button>
        <button onClick={finish} className="px-4 py-2 rounded-lg border border-border text-sm">I need all of these</button>
      </div>
    </div>
  )
}
