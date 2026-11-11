'use client'

import { budgetOptions, dinnersCovered } from '@/lib/budget-math'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DeleteAccount from '@/components/DeleteAccount'
import TripsSettings from '@/components/TripsSettings'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductPrefsEditor from '@/components/ProductPrefsEditor'
import SalesCard from '@/components/SalesCard'
import StoreDealsSettings from '@/components/StoreDealsSettings'
import { FOOD_STYLES, selectedStyles } from '@/lib/styles'
import { applyStyles, MAX_STYLES } from '@/lib/apply-style'
import { createClient } from '@/lib/supabase'
import {
  mergeSettings, DEFAULT_SETTINGS, WEEKDAYS, WEEKDAY_LABEL, CUISINE_OPTIONS, PROTEIN_OPTIONS,
  EQUIPMENT_OPTIONS, DIETARY_OPTIONS, AGE_BANDS, setSundayDinner, type Settings, type Channel,
} from '@/lib/settings'
import { MIX_GROUPS, MIX_EVERY, hasMix, type ProteinMix } from '@/lib/protein-mix'

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

const COOK_TIMES = [15, 20, 30, 45, 60]
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu']

/* ------------------------------------------------------------------ */
/* Small UI helpers                                                     */
/* ------------------------------------------------------------------ */

/** The diets most families pick, shown up top on the Food tab (the full list stays under Household). */
const EATING_STYLES = ['Keto', 'Low-carb', 'Vegetarian', 'Pescatarian', 'Gluten-free', 'Dairy-free']

function mixTotal(mix: ProteinMix | undefined): number {
  return Object.values(mix ?? {}).reduce((s: number, n) => s + (Number(n) || 0), 0)
}

/** First tap on "Set my mix": an even starting point the family then adjusts. */
function starterMix(dinners: number): NonNullable<ProteinMix> {
  const order: Array<keyof NonNullable<ProteinMix>> = ['chicken', 'beef', 'pork', 'fish', 'turkey', 'meatless', 'chicken']
  const mix: NonNullable<ProteinMix> = {}
  for (let i = 0; i < Math.max(1, dinners); i++) { const k = order[i % order.length]; mix[k] = (mix[k] ?? 0) + 1 }
  return mix
}

/** A choice button whose picked state is unmistakable: solid green with a check when on, a plain "+" when off. */
function PickChip({ on, onClick, title, children }: { on: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-sm transition-colors ${on
        ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-sm'
        : 'bg-white text-gray-600 border-gray-200 hover:border-primary/60 hover:text-foreground'}`}
    >
      <span aria-hidden="true" className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[11px] leading-none ${on ? 'bg-white text-primary font-bold' : 'border border-gray-300 text-gray-400'}`}>{on ? '✓' : '+'}</span>
      {children}
    </button>
  )
}

/** Plain-words summary under a chip group, so a family can see at a glance what is (and isn't) set. */
function PickedLine({ names, none }: { names: string[]; none: string }) {
  return names.length
    ? <p className="text-xs mt-2 text-primary font-medium">✓ Picked: {names.join(', ')}</p>
    : <p className="text-xs mt-2 text-amber-700">{none}</p>
}

function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o)
        return <PickChip key={o} on={on} onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}>{o}</PickChip>
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

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
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

  // What DinnerDrop has learned from each person's votes (lib/tastes) — adjusts the menu on its own.
  type Learned = { id: string; votes: number; likes: Array<{ key: string; label: string }>; skips: Array<{ key: string; label: string }> }
  const [learnedTastes, setLearnedTastes] = useState<Record<string, Learned>>({})
  useEffect(() => {
    fetch('/api/tastes', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      const map: Record<string, Learned> = {}
      for (const m of (j.members ?? []) as Learned[]) map[m.id] = m
      setLearnedTastes(map)
    }).catch(() => { /* ignore */ })
  }, [])
  async function forgetTaste(memberId: string, key: string) {
    const r = await fetch('/api/tastes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId, key }) })
    if (!r.ok) return
    setLearnedTastes((prev) => {
      const m = prev[memberId]; if (!m) return prev
      return { ...prev, [memberId]: { ...m, likes: m.likes.filter((x) => x.key !== key), skips: m.skips.filter((x) => x.key !== key) } }
    })
    // Keep the local copy in step so a later Save doesn't bring it back.
    setSettings((prev) => ({ ...prev, tastes: { hidden: { ...prev.tastes.hidden, [memberId]: Array.from(new Set([...(prev.tastes.hidden[memberId] ?? []), key])) } } }))
  }

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
                    <Select value={profile.timezone ?? 'America/New_York'} onChange={(v) => { patchProfile({ timezone: v }); patch((s) => { s.tzKnown = true; s.tzManual = true }) }} options={TIMEZONES.map((t) => ({ value: t, label: t.replace('America/', '').replace('Pacific/', '').replace('_', ' ') }))} />
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
                        {/* Health need (lib/member-needs): the shared dinner stays; their plate gets a starch side or a carb note. */}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                          <Field label="Carbs (health need)" hint="For a doctor's rule, not a taste. Carb counts are estimates — not medical advice.">
                            <Select
                              value={settings.health[m.id]?.carbs ?? ''}
                              onChange={(v) => patch((s) => { const cur = s.health[m.id] ?? {}; if (!v) { delete s.health[m.id] } else { s.health[m.id] = { ...cur, carbs: v as 'every_meal' | 'limit', updatedAt: new Date().toISOString() } } })}
                              options={[{ value: '', label: 'No carb rule' }, { value: 'every_meal', label: 'Needs carbs at every dinner' }, { value: 'limit', label: 'Keeps carbs low' }]}
                            />
                          </Field>
                          {settings.health[m.id]?.carbs === 'limit' && (
                            <Field label="Daily limit (g)">
                              <input type="number" min={10} max={400} value={settings.health[m.id]?.carbsPerDay ?? ''} onChange={(e) => patch((s) => { const g = Number(e.target.value); s.health[m.id] = { ...(s.health[m.id] ?? {}), carbsPerDay: g > 0 ? Math.round(g) : undefined } })} className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </Field>
                          )}
                        </div>
                        {settings.health[m.id]?.notes?.length ? <p className="text-xs text-muted-foreground">From their texts: {settings.health[m.id]!.notes!.join(' · ')}</p> : null}
                        {(() => {
                          const lt = learnedTastes[m.id]
                          if (!lt || lt.votes < 3 || (!lt.likes.length && !lt.skips.length)) return null
                          const chip = (x: { key: string; label: string }, tone: string) => (
                            <span key={x.key} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${tone}`}>
                              {x.label}
                              <button type="button" aria-label={`Forget ${x.label}`} title="Not right? Remove it" onClick={() => forgetTaste(m.id, x.key)} className="opacity-60 hover:opacity-100">✕</button>
                            </span>
                          )
                          return (
                            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                              <p className="text-xs font-semibold text-foreground mb-1.5">Learned from {m.name}&apos;s {lt.votes} votes <span className="font-normal text-muted-foreground">— the menu adjusts to this on its own</span></p>
                              {lt.likes.length > 0 && <div className="flex flex-wrap items-center gap-1.5 mb-1"><span className="text-xs text-muted-foreground mr-1">Leans toward</span>{lt.likes.map((x) => chip(x, 'bg-emerald-50 border-emerald-200 text-emerald-900'))}</div>}
                              {lt.skips.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="text-xs text-muted-foreground mr-1">Usually skips</span>{lt.skips.map((x) => chip(x, 'bg-amber-50 border-amber-200 text-amber-900'))}</div>}
                            </div>
                          )
                        })()}
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
                <Field label="How your family eats" hint="Every dinner follows these, for the whole family. Keto: 20 g carbs or less per serving, no rice, pasta, bread, potatoes, beans or sugar. Low-carb: 30 g or less. More diets (dairy-free, halal…) are under Household.">
                  <Chips options={EATING_STYLES} value={(profile.dietary_needs || []).filter((d) => EATING_STYLES.includes(d))} onChange={(v) => patchProfile({ dietary_needs: [...(profile.dietary_needs || []).filter((d) => !EATING_STYLES.includes(d)), ...v] })} />
                </Field>
                <Field label="Your weekly mix" hint={hasMix(settings.food.mix) ? `Plans, the dinner ideas texted for votes, and the voted week all follow this. Set to ${mixTotal(settings.food.mix)} of ${settings.plan.dinnersPerWeek} dinners${mixTotal(settings.food.mix) !== settings.plan.dinnersPerWeek ? ' — the planner keeps these proportions' : ''}. 0 means none of that kind. Under each one, pick how often: every week, every other week or once a month.` : 'Any mix: the planner spreads proteins out on its own. Or set how many dinners of each kind you want each week.'}>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <PickChip on={!hasMix(settings.food.mix)} onClick={() => patch((s) => { s.food.mix = null })}>Any mix</PickChip>
                    <PickChip on={hasMix(settings.food.mix)} onClick={() => patch((s) => { if (!hasMix(s.food.mix)) s.food.mix = starterMix(s.plan.dinnersPerWeek) })}>Set my mix</PickChip>
                  </div>
                  {hasMix(settings.food.mix) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {MIX_GROUPS.map((g) => {
                        const n = Number(settings.food.mix?.[g.key]) || 0
                        const set = (v: number) => patch((s) => { s.food.mix = { ...(s.food.mix ?? {}), [g.key]: Math.max(0, Math.min(7, v)) } })
                        return (
                          <div key={g.key} className={`rounded-xl border-2 px-3 py-2 ${n ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${n ? 'text-foreground font-semibold' : 'text-gray-500'}`}>{g.label}</span>
                              <span className="flex items-center gap-2">
                                <button type="button" aria-label={`Fewer ${g.label}`} onClick={() => set(n - 1)} disabled={n === 0} className="w-7 h-7 rounded-full border border-border text-foreground disabled:opacity-30">−</button>
                                <span className="w-4 text-center text-sm font-semibold tabular-nums">{n}</span>
                                <button type="button" aria-label={`More ${g.label}`} onClick={() => set(n + 1)} className="w-7 h-7 rounded-full border border-border text-foreground">+</button>
                              </span>
                            </div>
                            {n > 0 && (
                              <select aria-label={`How often ${g.label}`} value={Number(settings.food.mixEvery?.[g.key]) || 1}
                                onChange={(e) => { const v = Number(e.target.value) as 1 | 2 | 4; patch((s) => { s.food.mixEvery = { ...(s.food.mixEvery ?? {}), [g.key]: v } }) }}
                                className="mt-1.5 w-full text-xs rounded-md border border-border bg-white px-2 py-1 text-foreground">
                                {MIX_EVERY.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                              </select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Field>
                <Field label="Your style" hint="Pick up to 3, most important first (Keto + Slow cooker, say). Health needs like Diabetic-friendly always come first, and only one eating pattern (Keto, Low-carb, Paleo or Plant-based) is used. Each one sets diets, time, calories or equipment for you; change any of those below afterwards.">
                  <div className="flex flex-wrap gap-2">
                    {FOOD_STYLES.map((st) => {
                      const picked = selectedStyles(settings.food).map((x) => x.key)
                      const on = picked.includes(st.key)
                      return (
                        <PickChip key={st.key} on={on} title={st.blurb}
                          onClick={async () => { if (!profile) return; if (!on && picked.length >= MAX_STYLES) { setSaved(`Up to ${MAX_STYLES} styles: remove one first`); return } if (dirty) await save(); setSaving(true); await applyStyles(supabase, profile.id, on ? picked.filter((k) => k !== st.key) : [...picked, st.key]); await load(); setSaving(false); setSaved(on ? 'Style removed (your other changes were saved too)' : 'Style added (your other changes were saved too)') }}>
                          {st.emoji} {st.name}
                        </PickChip>
                      )
                    })}
                  </div>
                  <PickedLine names={selectedStyles(settings.food).map((x) => x.name)} none="No style picked yet: tap any that fit your family." />
                  {selectedStyles(settings.food).length > 0 && (
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {selectedStyles(settings.food).map((x) => <li key={x.key}><span className="font-medium text-foreground">{x.name}:</span> {x.blurb}</li>)}
                    </ul>
                  )}
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
                  <Toggle checked={settings.food.fullPlate} onChange={(v) => patch((s) => { s.food.fullPlate = v })} label="Full plate" hint="Every dinner has a protein, a starch and a vegetable. If a recipe is missing one, a simple side is added and goes on your list. Low-carb families get a second vegetable instead of the starch." />
                  <Field label="Family recipes vs. new ideas in each vote" hint={<>How many of the dinner ideas the family votes on are your own recipes from <a href="/favorites" className="underline">Favorites</a>; the rest are new ideas. Higher-starred recipes come up more often. Labeled &ldquo;family recipe&rdquo; in the vote.</>}><Select value={String(settings.food.familyRecipesPerWeek)} onChange={(v) => patch((s) => { s.food.familyRecipesPerWeek = Number(v) })} options={[0, 1, 2, 3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: n === 0 ? 'None (all new ideas)' : `${n} family recipe${n === 1 ? '' : 's'}, rest new` }))} /></Field>
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
                <TripsSettings settings={settings} patch={patch} isFamily={isFamily} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <Field label="Dinners to cook each week" hint={settings.schedule.trips.length > 1 ? 'With more than one trip, each trip plans the nights it covers (checked below).' : 'Leftover and takeout nights are the rest.'}>
                    <Select value={String(settings.plan.dinnersPerWeek)} onChange={(v) => patch((s) => { s.plan.dinnersPerWeek = Number(v) })} options={['3', '4', '5', '6', '7'].map((n) => ({ value: n, label: n }))} />
                  </Field>
                  <div className="sm:col-span-3"><Toggle checked={settings.plan.pickMyOwn} onChange={(v) => patch((s) => { s.plan.pickMyOwn = v })} label="I pick my dinners each week" hint="Every week your dashboard shows 12–15 dinners that fit your family, and your week is only the ones you choose. Off: we pick the week and you swap what you don't love." /></div>
                  <Field label="Options to choose from" hint="How many ideas the planner offers before you pick.">
                    <Select value={String(settings.plan.optionsCount)} onChange={(v) => patch((s) => { s.plan.optionsCount = Number(v) })} options={['5', '6', '8', '10', '12'].map((n) => ({ value: n, label: n }))} />
                  </Field>
                  <Field label="Weekly dinner budget" hint="What you want to pay at checkout. Every week stays inside it; dinners picked to fit are marked “Budget pick”. Raise it for more choice.">
                    <Select value={profile.weekly_budget} onChange={(v) => patchProfile({ weekly_budget: v })} options={(() => {
                      // Choices follow family size and dinners (Nov 10 2026). A budget saved before stays listed until changed.
                      const opts = budgetOptions(profile.family_size, settings.plan.dinnersPerWeek)
                      const all = profile.weekly_budget && !opts.includes(profile.weekly_budget) ? [profile.weekly_budget, ...opts] : opts
                      return all.map((b) => ({ value: b, label: b }))
                    })()} />
                    {(() => {
                      // Budgets we can't hit (Nov 10 2026): say how many dinners it really covers, at checkout prices.
                      const covers = dinnersCovered(profile.weekly_budget, settings.stores, profile.family_size)
                      if (!covers || covers >= settings.plan.dinnersPerWeek) return null
                      const how = settings.stores.mode === 'instore' ? 'at the store' : 'through Instacart'
                      return <p className="text-xs text-amber-700 mt-2">{profile.weekly_budget} {how} usually covers about {Math.max(1, covers)}{covers >= 2 ? `–${covers + 1}` : ''} dinners for {profile.family_size}, not {settings.plan.dinnersPerWeek}. We&apos;ll stay inside it with the cheapest dinners. {settings.stores.mode === 'instore' ? '' : 'Pickup or shopping in person stretches it further. '}Or raise the budget, or plan fewer dinners.</p>
                    })()}
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
                <div className={`rounded-2xl border-2 p-4 ${settings.plan.sundayDinner.on ? 'border-[#e8a838] bg-[#fef6e6]' : 'border-gray-200 bg-white'}`}>
                  <Toggle checked={settings.plan.sundayDinner.on} onChange={(v) => patch((s) => setSundayDinner(s, v))} label="🍗 Sunday family dinner" hint="One bigger sit-down dinner on Sunday: a roast, pot roast, lasagna, roast chicken, with real sides. The family gets Sunday ideas as their own group in the vote text, then the weeknight ideas. The top-voted Sunday idea always goes on Sunday." />
                  {settings.plan.sundayDinner.on && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1.5">How much time on Sunday? <span className="font-normal text-muted-foreground">Pick more than one for a mix.</span></p>
                        <div className="flex flex-wrap gap-2">
                          {[{ m: 60, l: '1 hour' }, { m: 120, l: '2 hours' }, { m: 240, l: 'All afternoon' }].map((o) => (
                            <PickChip key={o.m} on={(settings.plan.sundayDinner.times ?? [settings.plan.sundayDinner.minutes]).includes(o.m)} onClick={() => patch((s) => { const cur = s.plan.sundayDinner.times?.length ? s.plan.sundayDinner.times : [s.plan.sundayDinner.minutes]; const next = cur.includes(o.m) ? cur.filter((x) => x !== o.m) : [...cur, o.m]; if (next.length) setSundayDinner(s, true, next) })}>{o.l}</PickChip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1.5">How many Sunday ideas to send the family? <span className="font-normal text-muted-foreground">They come in their own group, before the weeknights.</span></p>
                        <div className="flex flex-wrap gap-2">
                          {[2, 3, 4, 5].map((n) => <PickChip key={n} on={(settings.plan.sundayDinner.options || 3) === n} onClick={() => patch((s) => { s.plan.sundayDinner.options = n })}>{n}</PickChip>)}
                        </div>
                      </div>
                      <PickChip on={settings.plan.sundayDinner.extraForMonday} onClick={() => patch((s) => setSundayDinner(s, true, undefined, !s.plan.sundayDinner.extraForMonday))}>Make extra for Monday leftovers</PickChip>
                    </div>
                  )}
                </div>
                <Field label="All-day dinners per week" hint="Slow cooker dinners that cook for hours (Instant Pot dinners are quick and don't count). Keeps the planner from filling the week with them.">
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
                  <Field label="What does your family call you?" hint={`Texts to the family use this name: "${settings.texting.leaderTitle.trim() || (profile?.full_name || 'Sarah').trim().split(' ')[0]} changed Tuesday to tacos." Leave blank to use your first name.`}>
                    <input value={settings.texting.leaderTitle} onChange={(e) => patch((s) => { s.texting.leaderTitle = e.target.value.slice(0, 24) })} placeholder="Mom, Dad, Head Chef, Grandma…" className="w-full sm:w-72 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </Field>
                  <Toggle checked={settings.texting.reviewFirst} onChange={(v) => patch((s) => { s.texting.reviewFirst = v })} label="Let me check the vote before the family gets it" hint="You get the dinner list first. Drop, swap or add dinners (here or by text), then send it. If you don't, it goes out on its own." />
                  {settings.texting.reviewFirst && (
                    <Field label="If I don't send it, send it after"><Select value={String(settings.texting.reviewHours)} onChange={(v) => patch((s) => { s.texting.reviewHours = Number(v) })} options={['1', '2', '3', '4', '6', '8', '12'].map((n) => ({ value: n, label: `${n} hour${n === '1' ? '' : 's'}` }))} /></Field>
                  )}
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
                  <Field label="No texts before" hint="In your time zone (Household). Default 9 AM."><input type="time" value={settings.texting.quietEnd} onChange={(e) => patch((s) => { s.texting.quietEnd = e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                  <Field label="No texts after" hint="Default 8 PM. Reminders set outside these hours wait until morning."><input type="time" value={settings.texting.quietStart} onChange={(e) => patch((s) => { s.texting.quietStart = e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                  <Field label="Dinner ideas to text" hint={`The family picks from these; the top ${settings.plan.dinnersPerWeek} make the week.`}><Select value={String(Math.max(settings.texting.optionsToText, settings.plan.dinnersPerWeek))} onChange={(v) => patch((s) => { s.texting.optionsToText = Number(v) })} options={['5', '6', '7', '8', '9', '10', '12'].filter((n) => Number(n) >= settings.plan.dinnersPerWeek).map((n) => ({ value: n, label: n }))} /></Field>
                  <Toggle checked={settings.texting.askDinner} onChange={(v) => patch((s) => { s.texting.askDinner = v })} label="Text me at 7 PM: “what was dinner tonight?”" hint="Only on nights with nothing planned, and only to you. Reply the way you'd say it and it's saved to your family recipes. Reply NO to skip. Doesn't count toward the weekly text limit." />
                  <Field label="Max texts per person per week"><Select value={String(settings.texting.weeklyCap)} onChange={(v) => patch((s) => { s.texting.weeklyCap = Number(v) })} options={['2', '3', '4', '6', '8', '10', '12', '15'].map((n) => ({ value: n, label: n }))} /></Field>
                  <Field label="When someone texts a Walmart link" hint={settings.texting.walmartLinks === 'cart' ? 'You get a text right away with a one-tap link that adds it to your Walmart cart. Walmart needs that one tap from you.' : 'It goes on the grocery list, and \u201cWalmart picks\u201d puts them all in your Walmart cart in one tap.'}><Select value={settings.texting.walmartLinks} onChange={(v) => patch((s) => { s.texting.walmartLinks = v as 'list' | 'cart' })} options={[{ value: 'list', label: 'Add it to the grocery list' }, { value: 'cart', label: 'Text me a one-tap Walmart cart link' }]} /></Field>
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
                  <div className="sm:col-span-2"><Toggle checked={!!settings.stores.storeBrand} onChange={(v) => patch((s) => { s.stores.storeBrand = v })} label="Buy store brand" hint="Pantry items, dairy, frozen, bread and drinks go to your cart as your store's own brand (Great Value, Aldi's brands, Kroger…) when they have one. Usually about 15% less, so your budget goes further." /></div>
                  <Field label="Usual store" hint="Shown on the list; Instacart lets you pick at checkout."><input value={settings.stores.usualStore} onChange={(e) => patch((s) => { s.stores.usualStore = e.target.value })} placeholder="Wegmans, Kroger, Aldi…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Field>
                </div>
                <p className="text-sm text-muted-foreground">Connect or disconnect Kroger from the <Link href="/grocery-list" className="text-primary underline">grocery list</Link> page.</p>
                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-1">My products</h2>
                  <p className="text-sm text-muted-foreground mb-3">The exact product your family buys. We&apos;ll use it every time a recipe calls for it.</p>
                  <ProductPrefsEditor value={settings.food.productPrefs} onChange={(v) => patch((s) => { s.food.productPrefs = v })} />
                  <div className="mt-4">
                    <Toggle checked={settings.food.storeBrands} onChange={(v) => patch((s) => { s.food.storeBrands = v })} label="Prefer store brands" hint="Great Value at Walmart, Kroger brand at Kroger, when it's a match for what the recipe needs." />
                  </div>
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-foreground mb-1">Store deals</h2>
                  <p className="text-sm text-muted-foreground mb-3">Tell us where you shop. We read each store&apos;s weekly ad for you, plan dinners around what&apos;s on sale, and tag sale prices on your list.</p>
                </div>
                <Field label="My stores" hint="Tops, Aldi, Price Chopper, Family Fare, Publix, Walmart and Kroger ads are read automatically; snap any other store's flyer below (Wegmans has no weekly ad).">
                  <TagInput value={settings.stores.myStores.map((s) => s.name)} onChange={(names) => patch((s) => { s.stores.myStores = names.map((n) => s.stores.myStores.find((x) => x.name === n) ?? { name: n }) })} placeholder="Wegmans, Tops, Aldi, Sam's Club" />
                  {settings.stores.myStores.some((s) => s.factor) && (
                    <p className="text-[11px] text-muted-foreground mt-1">Learned so far: {settings.stores.myStores.filter((s) => s.factor).map((s) => `${s.name} ${s.factor!.toFixed(2)}×`).join(' · ')}</p>
                  )}
                </Field>
                <StoreDealsSettings stores={settings.stores.myStores.map((s) => s.name)} />
                <Toggle checked={settings.food.useSales} onChange={(v) => patch((s) => { s.food.useSales = v })} label="Plan around this week's sales" hint="Most dinners are built on sale proteins and produce when an ad is loaded." />
                <Toggle checked={settings.deals.stockUp} onChange={(v) => patch((s) => { s.deals.stockUp = v })} label="Suggest stock-ups" hint="Buy-2-get-2 and pantry deals at your stores show up on the list and the deals page so you can add extras." />
                <Toggle checked={settings.deals.weeklyText} onChange={(v) => patch((s) => { s.deals.weeklyText = v })} label="Text me the best deals each week" hint="One text when a new ad lands for your stores (Family, with texting on)." />
                <p className="text-xs text-muted-foreground">Sale prices come from each store&apos;s public weekly ad and can vary by location. You check out yourself in Instacart or Walmart — we never buy anything for you.</p>
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
