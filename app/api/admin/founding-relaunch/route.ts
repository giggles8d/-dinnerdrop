import React from 'react'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import FoundingRelaunch from '@/emails/FoundingRelaunch'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'setzl1979@gmail.com'
const MARKER = 98                 // profiles.email_sequence_sent marker for this campaign
const CAMPAIGN = 'founding-relaunch-oct26'
const TARGET = 50
export const maxDuration = 60

/**
 * One-shot: "come try it this week" to 50 founding families (Oct 2026).
 *   GET ?test=1          → one preview copy to Sarah
 *   GET                  → dry run: the 50 who would get it
 *   GET ?confirm=send    → send (chunked; reload until remaining = 0)
 *   GET ?report=1        → what the 50 did since the send (sign-ins, plans, handoffs, order totals)
 * Selection: founding members with an email, not unsubscribed, not internal; people who already
 * onboarded or planned come first (most recent activity), then the newest signups, up to 50.
 */
async function authorized(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  try {
    const sb = createServerSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()
    return user?.email?.toLowerCase() === ADMIN_EMAIL
  } catch { return false }
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function latestStores(db: ReturnType<typeof admin>): Promise<Array<[string, number]>> {
  const { data: prof } = await db.from('profiles').select('id').eq('email', ADMIN_EMAIL).single()
  if (!prof) return []
  const { data } = await db.from('store_quotes').select('store, total, created_at').eq('user_id', prof.id).order('created_at', { ascending: false }).limit(20)
  if (!data?.length) return []
  const newest = new Date(data[0].created_at).getTime(); const seen = new Set<string>()
  return data.filter((r) => newest - new Date(r.created_at).getTime() < 6 * 3600e3).filter((r) => { const k = r.store.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
    .map((r) => [r.store, Number(r.total)] as [string, number]).sort((a, b) => a[1] - b[1])
}

interface Target { id: string; email: string; name: string; created_at: string; onboarded: boolean; plans: number; lastActive: string | null; sent: boolean }

async function pickTargets(db: ReturnType<typeof admin>): Promise<Target[]> {
  const [{ data: profiles }, { data: plans }] = await Promise.all([
    db.from('profiles').select('id, email, full_name, created_at, is_beta_member, email_unsubscribed, onboarding_complete, email_sequence_sent').eq('is_beta_member', true),
    db.from('meal_plans').select('user_id, created_at'),
  ])
  const planCount = new Map<string, number>(); const lastPlan = new Map<string, string>()
  for (const p of plans ?? []) { planCount.set(p.user_id, (planCount.get(p.user_id) ?? 0) + 1); if (!lastPlan.has(p.user_id) || p.created_at > lastPlan.get(p.user_id)!) lastPlan.set(p.user_id, p.created_at) }
  const all: Target[] = (profiles ?? [])
    .filter((p) => p.email && !p.email_unsubscribed && !p.email.toLowerCase().endsWith('@dinnerdrop.app') && p.email.toLowerCase() !== ADMIN_EMAIL)
    .map((p) => ({ id: p.id, email: p.email as string, name: (p.full_name as string | null)?.split(' ')[0] || '', created_at: p.created_at, onboarded: !!p.onboarding_complete, plans: planCount.get(p.id) ?? 0, lastActive: lastPlan.get(p.id) ?? null, sent: Array.isArray(p.email_sequence_sent) && (p.email_sequence_sent as number[]).includes(MARKER) }))
  // Already-sent people stay in the list (so the report covers them) but don't count toward new picks.
  const sentOnes = all.filter((t) => t.sent)
  const fresh = all.filter((t) => !t.sent).sort((a, b) => {
    const ea = a.onboarded || a.plans > 0 ? 1 : 0, eb = b.onboarded || b.plans > 0 ? 1 : 0
    if (ea !== eb) return eb - ea
    const la = a.lastActive ?? a.created_at, lb = b.lastActive ?? b.created_at
    return lb.localeCompare(la)
  })
  return [...sentOnes, ...fresh.slice(0, Math.max(0, TARGET - sentOnes.length))]
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const db = admin()
  const stores = await latestStores(db)

  if (url.searchParams.get('test') === '1') {
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(React.createElement(FoundingRelaunch, { firstName: 'Sarah', stores }))
    const { data, error } = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>', to: ADMIN_EMAIL, reply_to: ADMIN_EMAIL, subject: '[TEST] Same list, five stores — DinnerDrop now tells you which one to pick', html })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ test: true, sentTo: ADMIN_EMAIL, id: data?.id, stores })
  }

  const targets = await pickTargets(db)

  if (url.searchParams.get('report') === '1') {
    const sent = targets.filter((t) => t.sent)
    const ids = sent.map((t) => t.id)
    if (!ids.length) return NextResponse.json({ sent: 0, note: 'nothing sent yet' })
    const { data: sendLog } = await db.from('profiles').select('id, settings').in('id', ids)
    const sentAt = new Map((sendLog ?? []).map((r) => [r.id, (r.settings as { campaigns?: Record<string, string> } | null)?.campaigns?.[CAMPAIGN] ?? null]))
    const since = Array.from(sentAt.values()).filter(Boolean).sort()[0] ?? new Date(0).toISOString()
    const [{ data: plans }, { data: handoffs }, { data: users }] = await Promise.all([
      db.from('meal_plans').select('user_id, created_at').in('user_id', ids).gte('created_at', since),
      db.from('grocery_handoffs').select('user_id, created_at, actual_total, store').in('user_id', ids).gte('created_at', since),
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])
    const signedIn = (users?.users ?? []).filter((u) => ids.includes(u.id) && u.last_sign_in_at && u.last_sign_in_at >= since)
    const planned = new Set((plans ?? []).map((p) => p.user_id)); const handed = new Set((handoffs ?? []).map((h) => h.user_id))
    return NextResponse.json({
      campaign: CAMPAIGN, sent: sent.length, sinceFirstSend: since,
      signedIn: signedIn.length, plannedAWeek: planned.size, sentListToStore: handed.size,
      orderTotalsReported: (handoffs ?? []).filter((h) => h.actual_total).map((h) => ({ store: h.store, total: h.actual_total })),
      people: sent.map((t) => ({ email: t.email, signedIn: signedIn.some((u) => u.id === t.id), planned: planned.has(t.id), handoff: handed.has(t.id) })),
    })
  }

  const fresh = targets.filter((t) => !t.sent)
  if (url.searchParams.get('confirm') !== 'send') {
    return NextResponse.json({ dryRun: true, wouldSend: fresh.length, alreadySent: targets.length - fresh.length, stores, people: fresh.map((t) => ({ email: t.email, onboarded: t.onboarded, plans: t.plans, signedUp: t.created_at.slice(0, 10) })) })
  }

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>'
  const sent: string[] = []; const failed: Array<{ email: string; error: string }> = []
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
  for (const t of fresh.slice(0, 60)) {
    if (sent.length + failed.length) await sleep(250)
    const unsubscribeUrl = `https://www.dinnerdrop.app/unsubscribe?uid=${t.id}`
    const loginUrl = `https://www.dinnerdrop.app/login?utm_source=email&utm_medium=email&utm_campaign=${CAMPAIGN}`
    try {
      const html = await render(React.createElement(FoundingRelaunch, { firstName: t.name || 'there', loginUrl, unsubscribeUrl, stores }))
      const { error } = await resend.emails.send({
        from, to: t.email, reply_to: ADMIN_EMAIL,
        subject: 'Same list, five stores — DinnerDrop now tells you which one to pick',
        html,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        tags: [{ name: 'campaign', value: CAMPAIGN }],
      })
      if (error) { failed.push({ email: t.email, error: typeof error === 'string' ? error : JSON.stringify(error) }); continue }
      sent.push(t.email)
      const { data: prof } = await db.from('profiles').select('email_sequence_sent, settings').eq('id', t.id).single()
      const markers = Array.isArray(prof?.email_sequence_sent) ? (prof!.email_sequence_sent as number[]) : []
      const settings = (prof?.settings as Record<string, unknown> | null) ?? {}
      const campaigns = ((settings.campaigns as Record<string, string> | undefined) ?? {})
      await db.from('profiles').update({ email_sequence_sent: [...markers, MARKER], settings: { ...settings, campaigns: { ...campaigns, [CAMPAIGN]: new Date().toISOString() } } }).eq('id', t.id)
    } catch (e) { failed.push({ email: t.email, error: e instanceof Error ? e.message : String(e) }) }
  }
  return NextResponse.json({ sent: sent.length, failed, remaining: Math.max(0, fresh.length - sent.length - failed.length) })
}
