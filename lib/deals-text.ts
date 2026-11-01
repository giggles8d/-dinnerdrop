// "Next week's Tops deals are in" — one text per store per ad week to planners who turned
// on Settings → Store deals → "Text me the best deals" (Family, texting on, own number saved).
import type { SupabaseClient } from '@supabase/supabase-js'
import { isFamilyProfile } from '@/lib/access'
import { smsConfigured } from '@/lib/notify'
import { mergeSettings } from '@/lib/settings'
import { textMember } from '@/lib/texting'
import { APP_URL, ownerMember, type SetupProfile } from '@/lib/texting-setup'
import { canonicalStore, type StoreDeals } from '@/lib/store-deals'
import type { SaleItem } from '@/lib/sales-shared'

function headline(items: SaleItem[]): string[] {
  const pick = (re: RegExp) => items.filter((i) => re.test(i.category ?? '')).slice(0, 2)
  const top = [...pick(/meat|seafood/i), ...pick(/produce/i), ...items.filter((i) => /buy\s*\d|free/i.test(`${i.price} ${i.note ?? ''}`)).slice(0, 1)]
  const seen = new Set<string>()
  return top.filter((i) => !seen.has(i.name) && seen.add(i.name)).slice(0, 4).map((i) => `${i.name} ${i.price}`)
}

/** Text every opted-in family that lists this store. Returns how many texts went out. */
export async function sendDealsTexts(admin: SupabaseClient, set: StoreDeals): Promise<number> {
  if (!smsConfigured()) return 0
  const store = canonicalStore(set.store)
  const intent = `deals:${store.toLowerCase()}:${set.valid_from ?? 'now'}`
  const lines = headline(set.items)
  if (!lines.length) return 0
  const { data: profiles } = await admin.from('profiles')
    .select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until')
    .not('household_id', 'is', null).limit(2000)
  let sent = 0
  for (const p of (profiles ?? []) as SetupProfile[]) {
    const s = mergeSettings(p.settings)
    if (!s.deals.weeklyText || !s.texting.enabled || !isFamilyProfile(p) || !p.household_id) continue
    if (!s.stores.myStores.some((m) => canonicalStore(m.name) === store)) continue
    const { count } = await admin.from('sms_messages').select('id', { count: 'exact', head: true }).eq('household_id', p.household_id).eq('intent', intent)
    if ((count ?? 0) > 0) continue
    const me = await ownerMember(admin, p)
    if (!me) continue
    const when = set.valid_from && set.valid_from > new Date().toISOString().slice(0, 10) ? 'Next week’s' : 'This week’s'
    const body = `DinnerDrop: ${when} ${store} deals are in 🏷️ ${lines.join(' · ')}. Your dinners get built around them — see all ${set.items.length}: ${APP_URL}/deals`
    if (await textMember(admin, me, body, intent)) sent++
  }
  return sent
}
