'use client'

/**
 * Settings → Plan shape → "Your week & shopping trips" (Nov 1 2026, from the approved mockup).
 * Defaults are the original setup (Monday week, one trip); nothing changes until the family edits this.
 */
import { WEEKDAYS, WEEKDAY_LABEL, type Settings, type Weekday, tripsConfig } from '@/lib/settings'
import { resolveTrips, type TripSetting } from '@/lib/trips'

const SHORT: Record<Weekday, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const BEFORE: Record<Weekday, Weekday> = { mon: 'sun', tue: 'mon', wed: 'tue', thu: 'wed', fri: 'thu', sat: 'fri', sun: 'sat' }
const COLORS = [
  { ink: 'text-[#1a5c38]', bg: 'bg-[#eef5f0]', border: 'border-[#a9cbb6]', pill: 'bg-[#1a5c38]' },
  { ink: 'text-[#8a5a00]', bg: 'bg-[#fdf4e3]', border: 'border-[#ecc985]', pill: 'bg-[#8a5a00]' },
  { ink: 'text-[#2b5d9b]', bg: 'bg-[#eef3fa]', border: 'border-[#a9c0e0]', pill: 'bg-[#2b5d9b]' },
]
const PRESETS: Record<number, Weekday[]> = { 2: ['sun', 'wed'], 3: ['sun', 'tue', 'thu'] }

interface Props {
  settings: Settings
  patch: (fn: (s: Settings) => void) => void
  isFamily: boolean
}

export default function TripsSettings({ settings, patch, isFamily }: Props) {
  const cfg = tripsConfig(settings)
  const trips = resolveTrips(cfg)
  const count = settings.schedule.trips.length > 1 ? settings.schedule.trips.length : 1
  const start = settings.schedule.weekStart
  const order = [...WEEKDAYS.slice(WEEKDAYS.indexOf(start)), ...WEEKDAYS.slice(0, WEEKDAYS.indexOf(start))]
  const nightTrip = new Map<Weekday, number>()
  const shopTrip = new Map<Weekday, number>()
  trips.forEach((t) => { shopTrip.set(t.shopDay, t.index); t.nights.forEach((n) => nightTrip.set(n, t.index)) })
  const storeOptions = Array.from(new Set(['Instacart', ...settings.stores.myStores.map((s) => s.name).filter(Boolean), 'Walmart', 'Kroger', 'In store']))

  function setCount(n: number) {
    patch((s) => {
      if (n <= 1) { s.schedule.trips = []; return }
      const days = PRESETS[n]
      s.schedule.trips = days.map((d, i) => ({ shopDay: d, vote: true, store: s.schedule.trips[i]?.store }))
    })
  }

  // Tap a night: move it to the next trip (explicit nights are then saved for every trip).
  function moveNight(d: Weekday) {
    if (count <= 1 || !nightTrip.has(d)) return
    const from = nightTrip.get(d)!
    const to = (from + 1) % trips.length
    patch((s) => {
      const resolved = resolveTrips(tripsConfig(s))
      const next: TripSetting[] = resolved.map((t) => ({ ...s.schedule.trips.find((x) => x.shopDay === t.shopDay), shopDay: t.shopDay, nights: t.nights.filter((x) => x !== d) }))
      next[to].nights = [...(next[to].nights ?? []), d]
      s.schedule.trips = next
    })
  }

  function setTrip(i: number, change: Partial<TripSetting>) {
    patch((s) => {
      const resolved = resolveTrips(tripsConfig(s))
      const target = resolved[i]
      s.schedule.trips = s.schedule.trips.map((t) => {
        if (t.shopDay !== target.shopDay) return change.shopDay ? { ...t, nights: undefined } : t
        return { ...t, ...change, ...(change.shopDay ? { nights: undefined } : {}) }
      })
    })
  }

  const glance = trips.flatMap((t) => {
    const first = t.nights[0], last = t.nights[t.nights.length - 1]
    const range = !first ? 'no dinners' : first === last ? SHORT[first] : `${SHORT[first]}–${SHORT[last]}`
    const rows = []
    if (count > 1 && isFamily && t.vote && settings.texting.enabled) rows.push({ when: `${SHORT[BEFORE[t.shopDay]]} 6 PM`, what: `Family gets dinner ideas for ${range} by text and votes` })
    rows.push({ when: `${SHORT[t.shopDay]}`, what: count > 1 ? `Trip ${t.index + 1}: list for ${t.nights.length} dinner${t.nights.length === 1 ? '' : 's'} (${range}), one tap to the cart` : `Shop for the week (${range})` })
    return rows
  })

  return (
    <div className="space-y-5 rounded-2xl border border-border p-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-semibold text-foreground text-lg">Your week &amp; shopping trips</h2>
          <span className="text-[10px] font-bold text-[#7a4d00] bg-[#fdf0d8] border border-[#efcf93] rounded-full px-2 py-0.5">NEW</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Shop once a week or a few times. Each trip gets its own dinners, its own list and its own family vote.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium text-foreground">Week starts on</span>
          <select value={start} onChange={(e) => patch((s) => { s.schedule.weekStart = e.target.value as Weekday })} className="block w-48 rounded-md border border-input bg-background px-3 py-2 text-sm">
            {WEEKDAYS.map((d) => <option key={d} value={d}>{WEEKDAY_LABEL[d]}</option>)}
          </select>
          <span className="block text-xs text-muted-foreground">Your plans, lists and history follow this week.</span>
        </label>
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">How often do you shop?</span>
          <div role="group" aria-label="Shopping trips per week" className="flex flex-wrap gap-2">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)}
                className={`px-4 py-2 rounded-full border text-sm font-semibold ${count === n ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'}`}>
                {n === 1 ? 'Once a week' : n === 2 ? 'Twice' : '3 times'}
              </button>
            ))}
          </div>
          {count === 1 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              Shop on
              <select value={settings.schedule.reminders.shopBy.day} onChange={(e) => patch((s) => { s.schedule.reminders.shopBy.day = e.target.value as Weekday })} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                {WEEKDAYS.map((d) => <option key={d} value={d}>{WEEKDAY_LABEL[d]}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">Your week</span>
        <div className="grid grid-cols-7 gap-1.5">
          {order.map((d) => {
            const ti = nightTrip.get(d)
            const si = shopTrip.get(d)
            const c = ti !== undefined ? COLORS[ti] : null
            const sc = si !== undefined ? COLORS[si] : null
            return (
              <button key={d} type="button" onClick={() => moveNight(d)} disabled={count <= 1 || ti === undefined}
                aria-label={`${WEEKDAY_LABEL[d]}${si !== undefined ? `, shop day for trip ${si + 1}` : ''}${ti !== undefined ? `, dinner from trip ${ti + 1}` : ', no planned dinner'}`}
                className={`min-h-[84px] flex flex-col items-center justify-between gap-1 rounded-xl border px-1 py-2 ${c ? `${c.bg} ${c.border}` : 'bg-white border-border'} disabled:cursor-default`}>
                <span className="text-[11px] font-semibold text-muted-foreground">{SHORT[d]}</span>
                {sc && count > 1 ? <span className={`text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 ${sc.pill}`}>Shop</span> : (si !== undefined ? <span className="text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 bg-primary">Shop</span> : <span className="h-4" />)}
                <span className={`text-[11px] font-semibold ${c ? c.ink : 'text-muted-foreground'}`}>{ti === undefined ? 'No dinner' : count > 1 ? `Trip ${ti + 1}` : 'Dinner'}</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {count > 1 ? 'Each trip covers the cook nights until the next shop day. Tap a night to move it to the other trip.' : 'Dinner nights come from the checkboxes below.'}
        </p>
      </div>

      {count > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trips.map((t) => {
            const c = COLORS[t.index]
            const setting = settings.schedule.trips.find((x) => x.shopDay === t.shopDay)
            return (
              <div key={t.shopDay} className={`rounded-xl border p-4 space-y-3 ${c.bg} ${c.border}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading font-semibold text-foreground">Trip {t.index + 1} · {WEEKDAY_LABEL[t.shopDay]}</span>
                  <span className={`text-xs font-bold bg-white border rounded-full px-2 py-0.5 ${c.ink} ${c.border}`}>{t.nights.length} dinner{t.nights.length === 1 ? '' : 's'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-foreground space-y-1 block">Shop on
                    <select value={t.shopDay} onChange={(e) => setTrip(t.index, { shopDay: e.target.value as Weekday })} className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                      {WEEKDAYS.map((d) => <option key={d} value={d} disabled={d !== t.shopDay && shopTrip.has(d)}>{WEEKDAY_LABEL[d]}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-foreground space-y-1 block">Store
                    <select value={setting?.store ?? ''} onChange={(e) => setTrip(t.index, { store: e.target.value || undefined })} className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                      <option value="">Same as usual</option>
                      {storeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
                <p className="text-sm text-foreground"><span className="font-semibold">Dinners:</span> {t.nights.length ? t.nights.map((n) => WEEKDAY_LABEL[n]).join(', ') : 'none (tap a night above to move one here)'}</p>
                <label className={`flex items-center justify-between gap-2 text-sm ${isFamily ? '' : 'opacity-60'}`}>
                  <span>Family votes the day before ({SHORT[BEFORE[t.shopDay]]}) <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5 ml-1">FAMILY</span></span>
                  <input type="checkbox" disabled={!isFamily} checked={isFamily && t.vote} onChange={(e) => setTrip(t.index, { vote: e.target.checked })} className="accent-[#1a5c38] w-4 h-4" />
                </label>
              </div>
            )
          })}
        </div>
      )}

      {count > 1 && (
        <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-4">
          <span className="space-y-0.5">
            <span className="block text-sm font-medium text-foreground">Buy pantry items on the first trip</span>
            <span className="block text-xs text-muted-foreground">Garlic, onions, spices, oils and cheese go on {WEEKDAY_LABEL[trips[0].shopDay]}&apos;s list. Later trips mark them &ldquo;have it&rdquo; so you don&apos;t buy them twice.</span>
          </span>
          <input type="checkbox" checked={settings.schedule.pantryFirstTrip} onChange={(e) => patch((s) => { s.schedule.pantryFirstTrip = e.target.checked })} className="accent-[#1a5c38] w-4 h-4 mt-1" />
        </label>
      )}

      <div className="rounded-xl bg-[#f6f9f7] p-4 space-y-2">
        <span className="font-heading font-semibold text-foreground text-sm">Your week at a glance</span>
        {glance.map((g, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <span className="w-24 flex-shrink-0 font-semibold text-primary">{g.when}</span>
            <span className="text-foreground">{g.what}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
