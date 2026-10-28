/**
 * Read-only audit: runs the nightly grower's save-checks over every public library
 * recipe and prints what would be rejected. Usage: npx tsx scripts/check-library-against-grower.ts
 */
import { normalize, check } from '../lib/library-grower'

const URL = 'https://znxuxkqmmulnhkuwlshr.supabase.co/rest/v1/recipes'
const KEY = 'sb_publishable_Bkc4UPRQqSqoTH2ijsasgg_bWQ25ceR'

async function main() {
  const rows: any[] = []
  for (let from = 0; ; from += 500) {
    const res = await fetch(`${URL}?select=id,name,cuisine,protein,prep_time,cook_time,servings,estimated_cost,ingredients,steps,tags,dietary,nutrition,created_at&is_public=eq.true&order=created_at`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 499}` },
    })
    const page = await res.json()
    if (!Array.isArray(page)) throw new Error(JSON.stringify(page))
    rows.push(...page)
    if (page.length < 500) break
  }
  const tally = new Map<string, string[]>()
  for (const r of rows) {
    const m: any = { day: '1', name: r.name, cuisine: r.cuisine, protein: r.protein, prepTime: r.prep_time, cookTime: r.cook_time, servings: r.servings, estimatedCost: Number(r.estimated_cost), ingredients: r.ingredients, steps: r.steps, tags: r.tags, nutrition: r.nutrition, dietary: r.dietary }
    const n = normalize(m)
    // Library recipes can be long-cook (slow cooker), so time limits are not tested here; neither are the generation-only shape limits.
    let why = check({ ...n, steps: (n.steps ?? []).slice(0, 6) }, 10000)
    if (why && /ingredients$|steps$|total time/.test(why)) why = null
    const key = why ? why.replace(/".*"/, '"…"') : 'pass'
    tally.set(key, [...(tally.get(key) ?? []), why ? `${r.name} — ${why}` : r.name])
    if (JSON.stringify(n.tags) !== JSON.stringify(m.tags)) tally.set('tag auto-fix', [...(tally.get('tag auto-fix') ?? []), `${r.name}: ${m.tags} -> ${n.tags}`])
  }
  console.log('public recipes:', rows.length)
  for (const [k, v] of Array.from(tally.entries()).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${k}: ${v.length}`)
    if (k !== 'pass') v.slice(0, 6).forEach((s: string) => console.log('   ', s))
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
