'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DeleteAccount from '@/components/DeleteAccount'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SalesCard from '@/components/SalesCard'
import { FOOD_STYLES, styleByKey } from '@/lib/styles'
import { applyStyle } from '@/lib/apply-style'
import { createClient } from '@/lib/supabase'
import {
  mergeSettings, DEFAULT_SETTINGS, WEEKDAYS, WEEKDAY_LABEL, CUISINE_OPTIONS, PROTEIN_OPTIONS,
  EQUIPMENT_OPTIONS, DIETARY_OPTIONS, AGE_BANDS, type Settings, type Channel,
} from '@/lib/settings'

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface ProfileRow {
  id: string
  full_name: string | null
  family_size: number
  weekly_budget: string
  max_cook_time: number
  cuisine_preference: string
  dietary_needs: string[] | null
  preferred_store: string | null
  timezone: string | null
  settings: unknown
  household_id: string | null
  calendar_token: string | null
  referral_code: string | null
  subscription_status: string | null
  is_beta_member: boolean | null
  family_until: string | null
}

interface Member {
  id: string
  household_id: string
  name: string
  role: 'adult' | 'kid'
  age_band: string | null
  phone: string | null
  phone_opt_in_at: string | null
  phone_opted_out: boolean
  can_vote: boolean
  can_add: boolean
  likes: string[]
  dislikes: string[]
  allergies: string[]
  safe_foods: string[]
}

type Section = 'household' | 'food' | 'plan' | 'schedule' | 'texting' | 'stores' | 'data'

const SECTIONS: Array<{ key: Section; label: string }> = [
  { key: 'household', label: 'Household' },
  { key: 'food', label: 'Food' },
  { key: 'plan', label: 'Plan shape' },
  { key: 'schedule', label: 'Schedule & reminders' },
  { key: 'texting', label: 'Family texting' },
  { key: 'stores', label: 'Stores' },
  { key: 'data', label: 'Data' },
]

const BUDGETS = ['$50', '$75', '$100', '$125', '$150', '$200', '$250+']
const COOK_TIMES = [15, 20, 30, 45, 60]
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu']

/* ------------------------------------------------------------------ */
/* Small UI helpers                                                     */
/* ------------------------------------------------------------------ */

function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'}`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

// Common answers, one tap to add (typing still works for anything else).
const PICKS = {
  allergies: ['Peanuts', 'Tree nuts', 'Dairy', 'Eggs', 'Gluten', 'Soy', 'Shellfish', 'Fish', 'Sesame'],
  dislikes: ['Mushrooms', 'Onions', 'Olives', 'Spicy food', 'Cilantro', 'Tomatoes', 'Bell peppers', 'Beans', 'Seafood', 'Avocado', 'Eggplant', 'Coconut', 'Anything mixed together'],
  likes: ['Pasta', 'Tacos', 'Pizza', 'Chicken', 'Rice bowls', 'Burgers', 'Soup', 'Mac and cheese', 'Stir-fry', 'Quesadillas', 'Broccoli', 'Potatoes'],
  safe: ['Plain rice', 'Plain pasta', 'Buttered noodles', 'Plain chicken', 'Cheese quesadilla', 'Bread or a roll', 'Corn', 'Fruit', 'Cucumber slices', 'Shredded cheese'],
  never: ['Cilantro', 'Mushrooms', 'Olives', 'Blue cheese', 'Anchovies', 'Coconut', 'Capers', 'Goat cheese', 'Raisins', 'Eggplant', 'Spicy peppers'],
}

function TagInput({ value, onChange, placeholder, suggestions }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [draft, setDraft] = useState('')
  function commit() {
    const items = draft.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
    if (items.length) onChange(Array.from(new Set([...value, ...items])))
    setDraft('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-sm text-foreground">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${v}`}>×</button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
        onBlur={commit}
        placeholder={placeholder ?? 'Type and press Enter'}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {suggestions && suggestions.some((o) => !value.some((v) => v.toLowerCase() === o.toLowerCase())) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground mr-0.5">Tap to add:</span>
          {suggestions.filter((o) => !value.some((v) => v.toLowerCase() === o.toLowerCase())).map((o) => (
            <button key={o} type="button" onClick={() => onChange([...value, o])} className="px-2.5 py-1 rounded-full border border-dashed border-border text-xs text-foreground hover:border-primary/60 hover:bg-primary/5">+ {o}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-[#1a5c38]" />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

const CHANNEL_OPTIONS: Array<{ value: Channel; label: string }> = [
  { value: 'off', label: 'Off' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'Text' }, { value: 'both', label: 'Email + text' },
]
const DAY_OPTIONS = WEEKDAYS.map((d) => ({ value: d, label: WEEKDAY_LABEL[d] }))

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [members, setMembers] = useState<Member[]>([])
  const [section, setSection] = useState<Section>('household')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [runBusy, setRunBusy] = useState(false)
  const [runMsg, setRunMsg] = useState<string | null>(null)

  async function runVoteNow() {
    setRunBusy(true); setRunMsg(null)
    try {
      const r = await fetch('/api/sms/run-vote', { method: 'POST' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed')
      const bits: string[] = []
      if (j.planned) bits.push(`new dinner ideas for the week of ${j.weekStart}`)
      if (j.optInsSent) bits.push(`opt-in text sent to ${j.optInsSent}`)
      if (j.voteTextsSent) bits.push(`menu sent to ${j.voteTextsSent}`)
      if (j.skipped?.length) bits.push(`skipped: ${j.skipped.join('; ')}`)
      setRunMsg(bits.length ? `Done — ${bits.join(', ')}. Replies are checked every couple of minutes; when everyone has picked (or after 24h) the top picks become the week and you get a text.` : 'Nothing to send right now.')
      await load()
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : 'Failed')
    } finally { setRunBusy(false) }
  }
  const [inviteBusy, setInviteBusy] = useState(false)

  async function makeInvite() {
    setInviteBusy(true)
    try {
      const r = await fetch('/api/household/invite', { method: 'POST' })
      const j = await r.json()
      if (j.url) {
        setInviteUrl(j.url)
        try { await navigator.clipboard.writeText(j.url) } catch { /* ignore */ }
      }
    } finally { setInviteBusy(false) }
  }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login?redirect=/settings'); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, family_size, weekly_budget, max_cook_time, cuisine_preference, dietary_needs, preferred_store, timezone, settings, household_id, calendar_token, referral_code, subscription_status, is_beta_member, family_until')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile(data as ProfileRow)
      setSettings(mergeSettings((data as ProfileRow).settings))
      if ((data as ProfileRow).household_id) {
        const { data: m } = await supabase.from('household_members').select('*').eq('household_id', (data as ProfileRow).household_id).order('created_at')
        setMembers((m as Member[]) || [])
      }
    }
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  function patch(fn: (s: Settings) => void) {
    setSettings((prev) => { const next = structuredClone(prev); fn(next); return next })
    setDirty(true)
  }
  function patchProfile(p: Partial<ProfileRow>) {
    setProfile((prev) => (prev ? { ...prev, ...p } : prev))
    setDirty(true)
  }

  async function save() {
    if (!profile) return
    setSaving(true); setError(null); setSaved(null)
    const { error: err } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      family_size: profile.family_size,
      weekly_budget: profile.weekly_budget,
      max_cook_time: profile.max_cook_time,
      cuisine_preference: settings.food.cuisines.length === 1 ? settings.food.cuisines[0] : 'mixed',
      dietary_needs: profile.dietary_needs || [],
      preferred_store: settings.stores.mode === 'kroger' ? 'Kroger' : settings.stores.mode === 'instore' ? 'In store' : 'Instacart',
      timezone: profile.timezone || 'America/New_York',
      settings,
      onboarding_complete: true,
    }).eq('id', profile.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setDirty(false)
    let note = 'Saved. Your next plan uses these settings.'
    if (settings.texting.enabled && (settings.texting.ownerPhone || members.some((m) => m.phone && !m.phone_opt_in_at && !m.phone_opted_out))) {
      try {
        const r = await fetch('/api/sms/optin', { method: 'POST' })
        const j = await r.json().catch(() => ({}))
        if (j.sent) note = `Saved. Opt-in text sent to ${j.sent} ${j.sent === 1 ? 'person' : 'people'} — they reply YES to join.`
        else if (j.reason === 'family_required') note = 'Saved. Family texting starts once your Family trial is on.'
        else if (j.reason === 'sms_not_configured') note = 'Saved. Texting is being switched on — opt-in texts go out as soon as it is.'
      } catch { /* ignore */ }
      await load()
    }
    setSaved(note)
    setTimeout(() => setSaved(null), 6000)
  }

  /* ---- members ---- */
  async function addMember() {
    if (!profile?.household_id) return
    const { data, error: err } = await supabase.from('household_members').insert({
      household_id: profile.household_id, name: 'New person', role: 'kid', age_band: 'kid',
    }).select('*').single()
    if (err) { setError(err.message); return }
    setMembers((m) => [...m, data as Member])
  }
  async function updateMember(id: string, p: Partial<Member>) {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...p } : m)))
    const { error: err } = await supabase.from('household_members').update(p).eq('id', id)
    if (err) setError(err.message)
  }
  async function removeMember(id: string) {
    setMembers((ms) => ms.filter((m) => m.id !== id))
    await supabase.from('household_members').delete().eq('id', id)
  }

  const [promoInput, setPromoInput] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoMsg, setPromoMsg] = useState('')
  async function redeemCode(e: React.FormEvent) {
    e.preventDefault()
    setPromoBusy(true); setPromoMsg('')
    try {
      const j = await fetch('/api/promo/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoInput.trim() }) }).then((r) => r.json())
      if (j?.ok) {
        setPromoMsg(`Code ${j.code} applied — Family is on through ${new Date(j.until + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`)
        setProfile((p) => (p ? { ...p, family_until: j.until } : p))
        setPromoInput('')
      } else {
        const why: Record<string, string> = { invalid: 'That code isn\u2019t one we recognize.', expired: 'That code has expired.', exhausted: 'That code has been fully claimed.', already_redeemed: 'A code has already been used on this account.', has_subscription: 'You\u2019re already on a paid Family plan — nothing to add.' }
        setPromoMsg(why[j?.reason] ?? 'Could not apply that code.')
      }
    } catch { setPromoMsg('Could not apply that code. Try again.') }
    setPromoBusy(false)
  }
  const isFamily = !!profile && (
    profile.subscription_status === 'active' || profile.subscription_status === 'trialing' || profile.is_beta_member === true ||
    (!!profile.family_until && new Date(profile.family_until) > new Date())
  )

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const calendarUrl = profile.calendar_token ? `https://www.dinnerdrop.app/api/calendar/${profile.calendar_token}.ics` : null
  const referralUrl = profile.referral_code ? `https://www.dinnerdrop.app/start?ref=${profile.referral_code}` : null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Everything the planner knows about your family. Change anything, any time.</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-primary">{saved}</span>}
            {error && <span className="text-sm text-destructive">{error}</span>}
            <button onClick={save} disabled={saving || !dirty} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <button key={s.key} onClick={() => setSection(s.key)} className={`text-left px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${section === s.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                {s.label}
              </button>
            ))}
          </nav>

          <div className="bg-white rounded-2xl border border-border p-6 space-y-8">

            {/* ---------------- Household ---------------- */}
            {section === 'household' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Your name">
                    <input value={profile.full_name ?? ''} onChange={(e) => patchProfile({ full_name: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="First name is enough" />
                  </Field>
                  <Field label="People at dinner" hint="Portions and the grocery list scale to this.">
                    <Select value={String(profile.family_size)} onChange={(v) => patchProfile({ family_size: Number(v) })} options={['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => ({ value: n, label: n }))} />
                  </Field>
                  <Field label="Time zone" hint="For reminders and automatic plans.">
                    <Select value={profile.timezone ?? 'America/New_York'} onChange={(v) => patchProfile({ timezone: v })} options={TIMEZONES.map((t) => ({ value: t, label: t.replace('America/', '').replace('Pacific/', '').replace('_', ' ') }))} />
                  </Field>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-heading font-semibold text-foreground">Who&apos;s eating</h2>
                    <button onClick={addMember} className="text-sm font-semibold text-primary hover:underline">+ Add a person</button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Each person&apos;s likes, won&apos;t-eats, and allergies shape the plan. With Family, a kid&apos;s <em>safe foods</em> guarantee one thing they&apos;ll eat on every plate.
                  </p>
                  {members.length === 0 && <p className="text-sm text-muted-foreground">No one added yet. Add the people you cook for.</p>}
                  <div className="space-y-4">
                    {members.map((m) => (
                      <div key={m.id} className="rounded-xl border border-border p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
                          <Field label="Name"><input value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                          <Field label="Role"><Select value={m.role} onChange={(v) => updateMember(m.id, { role: v as 'adult' | 'kid' })} options={[{ value: 'adult', label: 'Adult' }, { value: 'kid', label: 'Kid' }]} /></Field>
                          <Field label="Age"><Select value={m.age_band ?? 'adult'} onChange={(v) => updateMember(m.id, { age_band: v })} options={AGE_BANDS} /></Field>
                          <button onClick={() => removeMember(m.id)} className="text-xs text-muted-foreground hover:text-destructive pb-2.5">Remove</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Loves"><TagInput value={m.likes} onChange={(v) => updateMember(m.id, { likes: v })} placeholder="pasta, tacos, broccoli" suggestions={PICKS.likes} /></Field>
                          <Field label="Won't eat"><TagInput value={m.dislikes} onChange={(v) => updateMember(m.id, { dislikes: v })} placeholder="mushrooms, anything mixed" suggestions={PICKS.dislikes} /></Field>
                          <Field label="Allergies" hint="Hard exclusions on every plan."><TagInput value={m.allergies} onChange={(v) => updateMember(m.id, { allergies: v })} placeholder="peanuts, shellfish" suggestions={PICKS.allergies} /></Field>
                          <Field label="Safe foods" hint="One of these lands on their plate every night."><TagInput value={m.safe_foods} onChange={(v) => updateMember(m.id, { safe_foods: v })} placeholder="plain rice, cheese quesadilla" suggestions={PICKS.safe} /></Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
                  <h2 className="font-heading font-semibold text-foreground">Share with your partner</h2>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">They get their own login, see the same week and the same grocery list, and anything either of you adds shows up for both.</p>
                  <button onClick={makeInvite} disabled={inviteBusy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{inviteBusy ? 'Making link…' : inviteUrl ? 'Copied — make another' : 'Get an invite link'}</button>
                  {inviteUrl && <code className="block mt-3 text-xs bg-white border border-border rounded-md px-3 py-2 break-all">{inviteUrl}</code>}
                  {inviteUrl && <p className="text-[11px] text-muted-foreground mt-1">Copied to your clipboard. Text or email it; the link works for 30 days.</p>}
                </div>

                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-2">Dietary needs for the whole table</h2>
                  <Chips options={DIETARY_OPTIONS} value={profile.dietary_needs || []} onChange={(v) => patchProfile({ dietary_needs: v })} />
                </div>
              </>
            )}

            {/* ---------------- Food ---------------- */}
            {section === 'food' && (
              <>
                <Field label="Your style" hint="A one-tap preset: it sets diets, time, calories or equipment for you. Change any of those below afterwards.">
                  <div className="flex flex-wrap gap-2">
                    {FOOD_STYLES.map((st) => {
                      const on = settings.food.style === st.key
                      return (
                        <button key={st.key} type="button" title={st.blurb}
                          onClick={async () => { if (!profile) return; setSaving(true); await applyStyle(supabase, profile.id, on ? null : st.key); await load(); setSaving(false); setSaved('Style applied') }}
                          className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'}`}>
                          {st.emoji} {st.name}
                        </button>
                      )
                    })}
                  </div>
                  {styleByKey(settings.food.style) && <p className="text-xs text-muted-foreground mt-2">{styleByKey(settings.food.style)!.blurb}</p>}
                </Field>
                <Field label="Cuisines you like" hint="Leave empty for a mix.">
                  <Chips options={CUISINE_OPTIONS} value={settings.food.cuisines} onChange={(v) => patch((s) => { s.food.cuisines = v })} />
                </Field>
                <Field label="Proteins to avoid">
                  <Chips options={PROTEIN_OPTIONS} value={settings.food.avoidProteins} onChange={(v) => patch((s) => { s.food.avoidProteins = v })} />
                </Field>
                <Field label="Never put these in a recipe" hint="Beyond dietary needs — the ingredients your house just won't do.">
                  <TagInput value={settings.food.neverIngredients} onChange={(v) => patch((s) => { s.food.neverIngredients = v })} placeholder="cilantro, olives, blue cheese" suggestions={PICKS.never} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Spice level">
                    <Select value={settings.food.spice} onChange={(v) => patch((s) => { s.food.spice = v })} options={[{ value: 'mild', label: 'Mild — kids at the table' }, { value: 'medium', label: 'Medium' }, { value: 'hot', label: 'Bring it' }]} />
                  </Field>
                </div>
                <Field label="Equipment you'll actually use" hint="Plans lean on what you pick.">
                  <Chips options={EQUIPMENT_OPTIONS} value={settings.food.equipment} onChange={(v) => patch((s) => { s.food.equipment = v })} />
                </Field>
                <div className="space-y-3">
                  <Toggle checked={settings.food.kidFriendly} onChange={(v) => patch((s) => { s.food.kidFriendly = v })} label="Kid-friendly by default" hint="Familiar flavors, components kept separate, one safe thing on every plate." />
                  <Toggle checked={settings.food.nutritionInfo} onChange={(v) => patch((s) => { s.food.nutritionInfo = v })} label="Show nutrition per serving (calories, protein, carbs, fat)" />
                </div>
                <Field label="Calories per serving" hint="Dinners are planned under this number. Estimates from the ingredients; brands and portions vary.">
                  <select value={settings.food.maxCalories} onChange={(e) => patch((s) => { s.food.maxCalories = Number(e.target.value) })} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value={0}>No limit</option>
                    {[400, 500, 600, 700, 800].map((n) => <option key={n} value={n}>Under {n} cal</option>)}
                  </select>
                </Field>
              </>
            )}

            {/* ---------------- Plan shape ---------------- */}
            {section === 'plan' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <Field label="Dinners to cook each week" hint="Leftover and takeout nights are the rest.">
                    <Select value={String(settings.plan.dinnersPerWeek)} onChange={(v) => patch((s) => { s.plan.dinnersPerWeek = Number(v) })} options={['3', '4', '5', '6', '7'].map((n) => ({ value: n, label: n }))} />
                  </Field>
                  <Field label="Options to choose from" hint="How many ideas the planner offers before you pick.">
                    <Select value={String(settings.plan.optionsCount)} onChange={(v) => patch((s) => { s.plan.optionsCount = Number(v) })} options={['5', '6', '8', '10', '12'].map((n) => ({ value: n, label: n }))} />
                  </Field>
                  <Field label="Weekly dinner budget">
                    <Select value={profile.weekly_budget} onChange={(v) => patchProfile({ weekly_budget: v })} options={BUDGETS.map((b) => ({ value: b, label: b }))} />
                  </Field>
                  <Field label="Takeout costs us about (per person)" hint="Used for the “you saved vs takeout” number on your dashboard.">
                    <Select value={String(settings.stores.takeoutPerServing ?? 15)} onChange={(v) => patch((s) => { s.stores.takeoutPerServing = Number(v) })} options={[8, 10, 12, 15, 18, 20, 25, 30].map((n) => ({ value: String(n), label: `$${n}` }))} />
                  </Field>
                </div>
                <Field label="Default cook time per night (minutes)" hint="Prep included. Override any night below.">
                  <Select value={String(profile.max_cook_time)} onChange={(v) => patchProfile({ max_cook_time: Number(v) })} options={COOK_TIMES.map((n) => ({ value: String(n), label: `${n} min` }))} />
                </Field>
                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-1">Nights you cook, and how long you have</h2>
                  <p className="text-xs text-muted-foreground mb-3">Practice night gets 15 minutes; Sunday can take 45. The planner matches each dinner to its night.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {WEEKDAYS.map((d) => {
                      const on = settings.plan.cookDays.includes(d)
                      return (
                        <div key={d} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${on ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={on} onChange={(e) => patch((s) => { s.plan.cookDays = e.target.checked ? Array.from(new Set([...s.plan.cookDays, d])) : s.plan.cookDays.filter((x) => x !== d) })} className="accent-[#1a5c38]" />
                            {WEEKDAY_LABEL[d]}
                          </label>
                          <select disabled={!on} value={String(settings.plan.weekdayCookTimes[d] ?? '')} onChange={(e) => patch((s) => { const v = Number(e.target.value); if (v) s.plan.weekdayCookTimes[d] = v; else delete s.plan.weekdayCookTimes[d] })} className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-40">
                            <option value="">default ({profile.max_cook_time} min)</option>
                            {COOK_TIMES.map((n) => <option key={n} value={n}>{n} min</option>)}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Field label="All-day dinners per week" hint="Slow cooker or Instant Pot dinners that cook for hours. Keeps the planner from filling the week with them.">
                  <Select value={String(settings.plan.maxLongCookNights)} onChange={(v) => patch((s) => { s.plan.maxLongCookNights = Number(v) })} options={[{ value: '0', label: 'None' }, { value: '1', label: 'Up to 1' }, { value: '2', label: 'Up to 2' }, { value: '3', label: 'Up to 3' }, { value: '-1', label: 'No limit' }]} />
                </Field>
                <div className="space-y-3">
                  <Toggle checked={settings.plan.leftoverNight} onChange={(v) => patch((s) => { s.plan.leftoverNight = v })} label="Plan a leftover night" hint="One dinner is sized for two nights; the planner marks the second night 'leftovers'." />
                  <Toggle checked={settings.plan.includeLunches} onChange={(v) => patch((s) => { s.plan.includeLunches = v })} label="Add simple lunches to the grocery list" hint="Sandwich and wrap basics for the week, added to the same list and cart." />
                  <Toggle checked={settings.plan.includeBreakfasts} onChange={(v) => patch((s) => { s.plan.includeBreakfasts = v })} label="Add breakfast basics to the grocery list" />
                </div>
              </>
            )}

            {/* ---------------- Schedule ---------------- */}
            {section === 'schedule' && (
              <>
                <Toggle checked={settings.schedule.autoPlan} onChange={(v) => patch((s) => { s.schedule.autoPlan = v })} label="Create next week's menu automatically" hint="A fresh plan is waiting on the day and time you pick. You can still swap anything." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Plan day"><Select value={settings.schedule.planDay} onChange={(v) => patch((s) => { s.schedule.planDay = v })} options={DAY_OPTIONS} /></Field>
                  <Field label="Plan time"><input type="time" value={settings.schedule.planTime} onChange={(e) => patch((s) => { s.schedule.planTime = e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-3">Reminders</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
                      <div><p className="text-sm font-medium">Your plan is ready</p><p className="text-xs text-muted-foreground">Sent when a new week is generated.</p></div>
                      <Select value={settings.schedule.reminders.planReady} onChange={(v) => patch((s) => { s.schedule.reminders.planReady = v })} options={CHANNEL_OPTIONS} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                      <div><p className="text-sm font-medium">Time to shop</p><p className="text-xs text-muted-foreground">A nudge with the cart link if the list hasn&apos;t been sent.</p></div>
                      <Select value={settings.schedule.reminders.shopBy.channel} onChange={(v) => patch((s) => { s.schedule.reminders.shopBy.channel = v })} options={CHANNEL_OPTIONS} />
                      <Select value={settings.schedule.reminders.shopBy.day} onChange={(v) => patch((s) => { s.schedule.reminders.shopBy.day = v })} options={DAY_OPTIONS} />
                      <input type="time" value={settings.schedule.reminders.shopBy.time} onChange={(e) => patch((s) => { s.schedule.reminders.shopBy.time = e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center">
                      <div><p className="text-sm font-medium">Tonight&apos;s dinner</p><p className="text-xs text-muted-foreground">What&apos;s cooking and how long it takes, every cook night.</p></div>
                      <Select value={settings.schedule.reminders.cookTonight.channel} onChange={(v) => patch((s) => { s.schedule.reminders.cookTonight.channel = v })} options={CHANNEL_OPTIONS} />
                      <input type="time" value={settings.schedule.reminders.cookTonight.time} onChange={(e) => patch((s) => { s.schedule.reminders.cookTonight.time = e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Text reminders go to the phone numbers in Family texting and need the Family plan.</p>
                </div>
              </>
            )}

            {/* ---------------- Texting ---------------- */}
            {section === 'texting' && (
              <>
                {!isFamily && (
                  <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
                    <span className="native-only">Family texting is included with the Family plan.</span>
                    <span className="web-only">Family texting is part of the Family plan. <Link href="/subscribe" className="font-semibold text-primary underline">Try Family free for 14 days</Link> — $4.99/month after, cancel anytime.</span>
                  </div>
                )}
                <Toggle checked={settings.texting.enabled} onChange={(v) => patch((s) => { s.texting.enabled = v })} label="Text the household" hint="Everyone with a number gets the week's dinners to vote on, and can text a food to add it to the list." />
                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-1">Phone numbers</h2>
                  <p className="text-xs text-muted-foreground mb-3">Add numbers under each person. They get one opt-in text and reply YES to join; STOP always works.</p>
                  {members.length === 0 && <p className="text-sm text-muted-foreground">Add people under Household first.</p>}
                  <div className="space-y-3">
                    {members.map((m) => (
                      <div key={m.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-center rounded-lg border border-border px-3 py-2">
                        <span className="text-sm font-medium">{m.name} <span className="text-xs text-muted-foreground">({m.role})</span></span>
                        <input value={m.phone ?? ''} onChange={(e) => updateMember(m.id, { phone: e.target.value })} placeholder="+1 555 123 4567" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={m.can_vote} onChange={(e) => updateMember(m.id, { can_vote: e.target.checked })} className="accent-[#1a5c38]" />votes</label>
                        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={m.can_add} onChange={(e) => updateMember(m.id, { can_add: e.target.checked })} className="accent-[#1a5c38]" />can add to list</label>
                        <span className="sm:col-span-4 text-[11px] text-muted-foreground">
                          {m.phone_opted_out ? 'Opted out (texted STOP)' : m.phone_opt_in_at ? `Opted in ${new Date(m.phone_opt_in_at).toLocaleDateString()}` : m.phone ? 'Opt-in text goes out when texting is on and saved' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <Field label="Your number" hint="Where the &quot;everyone&apos;s voted — add the rest and approve the order&quot; text goes.">
                    <input value={settings.texting.ownerPhone} onChange={(e) => patch((s) => { s.texting.ownerPhone = e.target.value })} placeholder="+1 555 123 4567" className="w-full sm:w-72 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </Field>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={runVoteNow} disabled={runBusy || dirty || !isFamily} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                      {runBusy ? 'Texting…' : 'Text my family now'}
                    </button>
                    <span className="text-xs text-muted-foreground">{dirty ? 'Save your changes first.' : `Generates ${Math.max(settings.texting.optionsToText, settings.plan.dinnersPerWeek)} dinner ideas, sends the opt-in to anyone new, and texts the ideas to everyone who has joined. The top ${settings.plan.dinnersPerWeek} picks become the week.`}</span>
                  </div>
                  {runMsg && <p className="text-sm text-foreground">{runMsg}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Vote day" hint="The week's dinners are texted this day for keep/skip."><Select value={settings.texting.voteDay} onChange={(v) => patch((s) => { s.texting.voteDay = v })} options={DAY_OPTIONS} /></Field>
                  <Field label="'Bring it back?' day" hint="Everyone picks which dinners should return."><Select value={settings.texting.againDay} onChange={(v) => patch((s) => { s.texting.againDay = v })} options={DAY_OPTIONS} /></Field>
                  <Field label="Quiet hours start"><input type="time" value={settings.texting.quietStart} onChange={(e) => patch((s) => { s.texting.quietStart = e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                  <Field label="Quiet hours end"><input type="time" value={settings.texting.quietEnd} onChange={(e) => patch((s) => { s.texting.quietEnd = e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                  <Field label="Dinner ideas to text" hint={`The family picks from these; the top ${settings.plan.dinnersPerWeek} make the week.`}><Select value={String(Math.max(settings.texting.optionsToText, settings.plan.dinnersPerWeek))} onChange={(v) => patch((s) => { s.texting.optionsToText = Number(v) })} options={['5', '6', '7', '8', '9', '10', '12'].filter((n) => Number(n) >= settings.plan.dinnersPerWeek).map((n) => ({ value: n, label: n }))} /></Field>
                  <Field label="Max texts per person per week"><Select value={String(settings.texting.weeklyCap)} onChange={(v) => patch((s) => { s.texting.weeklyCap = Number(v) })} options={['2', '3', '4', '6', '8'].map((n) => ({ value: n, label: n }))} /></Field>
                </div>
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div>
                    <h2 className="font-heading font-semibold text-foreground mb-1">Last call before you order</h2>
                    <p className="text-xs text-muted-foreground">The &ldquo;Ask the family first&rdquo; button on the grocery list texts everyone this message. Replies (ADD + item, or a photo) land on the list until time&rsquo;s up or you order. Placeholders: {'{name}'} {'{store}'} {'{minutes}'}.</p>
                  </div>
                  <Field label="Message">
                    <textarea value={settings.texting.lastCall.message} onChange={(e) => patch((s) => { s.texting.lastCall.message = e.target.value })} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </Field>
                  <Field label="How long they have" hint="You can change it each time you send."><Select value={String(settings.texting.lastCall.minutes)} onChange={(v) => patch((s) => { s.texting.lastCall.minutes = Number(v) })} options={['10', '15', '20', '30', '45', '60'].map((n) => ({ value: n, label: `${n} minutes` }))} /></Field>
                </div>
              </>
            )}

            {/* ---------------- Stores ---------------- */}
            {section === 'stores' && (
              <>
                <Field label="How you usually get groceries">
                  <Select value={settings.stores.mode} onChange={(v) => patch((s) => { s.stores.mode = v })} options={[{ value: 'instacart', label: 'Instacart (delivery or pickup)' }, { value: 'kroger', label: 'Kroger cart (Family)' }, { value: 'instore', label: 'I shop in store' }]} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Delivery or pickup"><Select value={settings.stores.fulfillment} onChange={(v) => patch((s) => { s.stores.fulfillment = v })} options={[{ value: 'delivery', label: 'Delivery' }, { value: 'pickup', label: 'Pickup' }]} /></Field>
                  <Field label="Usual store" hint="Shown on the list; Instacart lets you pick at checkout."><input value={settings.stores.usualStore} onChange={(e) => patch((s) => { s.stores.usualStore = e.target.value })} placeholder="Wegmans, Kroger, Aldi…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                </div>
                <p className="text-sm text-muted-foreground">Connect or disconnect Kroger from the <Link href="/grocery-list" className="text-primary underline">grocery list</Link> page.</p>
                <Field label="My stores" hint="The stores you compare. Load each one's flyer and the grocery list shows which is cheapest this week; tell DinnerDrop the total after each order and it learns each store's prices.">
                  <TagInput value={settings.stores.myStores.map((s) => s.name)} onChange={(names) => patch((s) => { s.stores.myStores = names.map((n) => s.stores.myStores.find((x) => x.name === n) ?? { name: n }) })} placeholder="Wegmans, Tops, Aldi, Sam's Club" />
                  {settings.stores.myStores.some((s) => s.factor) && (
                    <p className="text-[11px] text-muted-foreground mt-1">Learned so far: {settings.stores.myStores.filter((s) => s.factor).map((s) => `${s.name} ${s.factor!.toFixed(2)}×`).join(' · ')}</p>
                  )}
                </Field>
                <Toggle checked={settings.food.useSales} onChange={(v) => patch((s) => { s.food.useSales = v })} label="Plan around this week's sales" hint="When a flyer is loaded, most dinners are built on sale proteins and produce, and sale items are tagged on the list." />
                <SalesCard />
              </>
            )}

            {/* ---------------- Data ---------------- */}
            {section === 'data' && (
              <>
                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-1">Calendar feed</h2>
                  <p className="text-xs text-muted-foreground mb-2">Subscribe in Google Calendar, Apple Calendar, or a kitchen display. Each cook night shows the dinner and its time.</p>
                  {calendarUrl && <code className="block text-xs bg-muted rounded-md px-3 py-2 break-all">{calendarUrl}</code>}
                </div>
                <div className="web-only">
                  <h2 className="font-heading font-semibold text-foreground mb-1">Invite your family</h2>
                  <p className="text-xs text-muted-foreground mb-2">Share this link and they get DinnerDrop free too. When they start Family, you both get a month of Family free.</p>
                  {referralUrl && <code className="block text-xs bg-muted rounded-md px-3 py-2 break-all">{referralUrl}</code>}
                </div>
                <div className="web-only">
                  <h2 className="font-heading font-semibold text-foreground mb-1">Have a code?</h2>
                  <p className="text-xs text-muted-foreground mb-2">Promo codes add Family-plan time to your account — no card needed.{profile.family_until && new Date(profile.family_until) > new Date() ? ` Family is on through ${new Date(profile.family_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.` : ''}</p>
                  <form onSubmit={redeemCode} className="flex gap-2 max-w-sm">
                    <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="MEALIME" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm uppercase tracking-wide" maxLength={20} />
                    <button type="submit" disabled={promoBusy || !promoInput.trim()} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{promoBusy ? 'Checking…' : 'Apply'}</button>
                  </form>
                  {promoMsg && <p className="text-xs mt-2 text-foreground">{promoMsg}</p>}
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-1">Your data</h2>
                  <p className="text-xs text-muted-foreground mb-2">Download everything — profile, plans, favorites, lists — any time.</p>
                  <a href="/api/export" className="inline-block px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted">Download my data (JSON)</a>
                </div>
                <DeleteAccount />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
