import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendSms, smsConfigured } from '@/lib/notify'
import { isFamilyProfile } from '@/lib/access'
import { mergeSettings } from '@/lib/settings'
import { openRound, sendOptIn, voteBody, type MemberRow } from '@/lib/texting'
import { deliveryProblem, deliveryStatuses, intentLabel } from '@/lib/text-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * The planner's Texts screen (Sarah, Nov 7 2026): every text in and out, whether it reached the phone, and fixes.
 *  GET ?days=14 → people (status, texts this week) + every message, newest first, with delivery status
 *  POST { action: 'send' | 'vote_plain' | 'invite' | 'plain_text', memberId, message?, on? }
 */
async function ctx() {
  const auth = createServerSupabaseClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('id, household_id, full_name, settings, subscription_status, is_beta_member, family_until').eq('id', user.id).single()
  if (!profile?.household_id) return null
  return { admin, profile }
}

export async function GET(req: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ people: [], messages: [] })
  const { admin, profile } = c
  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get('days')) || 14, 1), 60)
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const weekAgo = Date.now() - 7 * 86400000
  const settings = mergeSettings(profile.settings)
  const [{ data: members }, { data: rows }, round] = await Promise.all([
    admin.from('household_members').select('*').eq('household_id', profile.household_id),
    admin.from('sms_messages').select('id, member_id, direction, to_number, from_number, body, intent, twilio_sid, created_at').eq('household_id', profile.household_id).gte('created_at', since).order('created_at', { ascending: false }).limit(500),
    openRound(admin, profile.household_id),
  ])
  const ms = (members ?? []) as MemberRow[]
  const delivery = await deliveryStatuses(ms.map((m) => m.phone).filter((p): p is string => !!p), Math.min(days, 14))
  const first = (profile.full_name || 'You').trim().split(' ')[0]
  const byId = new Map(ms.map((m) => [m.id, m]))

  const messages = (rows ?? []).map((r) => {
    const d = r.twilio_sid ? delivery[r.twilio_sid] : undefined
    const mms = String(r.twilio_sid ?? '').startsWith('MM')
    const failed = d && (d.status === 'undelivered' || d.status === 'failed')
    const mem = r.member_id ? byId.get(r.member_id) : undefined
    return {
      id: r.id,
      memberId: r.member_id,
      person: mem ? (mem.profile_id === profile.id ? `${mem.name} (you)` : mem.name) : (r.to_number || r.from_number || 'Unknown'),
      direction: r.direction as 'in' | 'out',
      from: r.direction === 'in' ? (mem?.name ?? 'Someone') : r.intent === 'owner_message' ? first : 'DinnerDrop',
      body: r.body ?? '',
      kind: intentLabel(r.intent, r.direction),
      picture: mms && r.direction === 'out',
      at: r.created_at,
      delivery: r.direction === 'out' ? (d ? (failed ? 'failed' : d.status === 'delivered' ? 'delivered' : d.status === 'read' ? 'delivered' : 'sending') : r.twilio_sid ? 'unknown' : 'not sent') : null,
      problem: failed ? deliveryProblem(d!.errorCode, mms) : null,
    }
  })

  const people = ms.map((m) => {
    const mine = messages.filter((x) => x.memberId === m.id)
    const outWeek = (rows ?? []).filter((r) => r.member_id === m.id && r.direction === 'out' && new Date(r.created_at).getTime() >= weekAgo && !['reply', 'opt_in', 'dinner_ask'].includes(String(r.intent).split(':')[0])).length
    const lastFail = mine.find((x) => x.direction === 'out' && x.delivery === 'failed')
    const lastIn = mine.find((x) => x.direction === 'in')
    return {
      id: m.id,
      name: m.name,
      you: m.profile_id === profile.id,
      phone: m.phone ? `•••${m.phone.slice(-4)}` : null,
      status: !m.phone ? 'no phone' : m.phone_opted_out ? 'stopped' : m.phone_opt_in_at ? 'joined' : 'invited',
      sentThisWeek: outWeek,
      cap: settings.texting.weeklyCap,
      plainText: settings.texting.plainTextIds.includes(m.id),
      lastReply: lastIn?.at ?? null,
      problem: lastFail ? { at: lastFail.at, what: lastFail.problem, picture: lastFail.picture } : null,
    }
  })
  return NextResponse.json({ people, messages, openVote: !!round, configured: smsConfigured(), family: isFamilyProfile(profile) })
}

export async function POST(req: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
  const { admin, profile } = c
  if (!isFamilyProfile(profile)) return NextResponse.json({ error: 'Family texting is part of the Family plan.' }, { status: 403 })
  const b = await req.json().catch(() => ({})) as { action?: string; memberId?: string; message?: string; on?: boolean }
  const { data: mrow } = await admin.from('household_members').select('*').eq('id', String(b.memberId ?? '')).eq('household_id', profile.household_id).maybeSingle()
  const m = mrow as MemberRow | null
  if (!m) return NextResponse.json({ error: 'That person isn\'t in your family.' }, { status: 404 })
  const settings = mergeSettings(profile.settings)
  const first = (profile.full_name || 'Your planner').trim().split(' ')[0]

  if (b.action === 'plain_text') {
    const ids = new Set(settings.texting.plainTextIds)
    if (b.on) ids.add(m.id); else ids.delete(m.id)
    const raw = (profile.settings as Record<string, unknown> | null) ?? {}
    const texting = { ...((raw.texting as object) ?? {}), plainTextIds: Array.from(ids) }
    await admin.from('profiles').update({ settings: { ...raw, texting } }).eq('id', profile.id)
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'invite') {
    if (!m.phone) return NextResponse.json({ error: `Add a phone number for ${m.name} in Settings first.` }, { status: 400 })
    if (m.phone_opted_out) return NextResponse.json({ error: `${m.name} texted STOP. They need to text START to (866) 722-4708 to get texts again.` }, { status: 400 })
    const ok = await sendOptIn(admin, m, first)
    return NextResponse.json({ ok, note: ok ? `Sent ${m.name} the join text. They reply YES to join.` : m.phone_opt_in_at ? `${m.name} already joined.` : `${m.name} got a join text in the last 3 days. They just need to reply YES.` })
  }
  if (!m.phone || !m.phone_opt_in_at || m.phone_opted_out) return NextResponse.json({ error: `${m.name} hasn't joined the texts yet.` }, { status: 400 })

  if (b.action === 'vote_plain') {
    const round = await openRound(admin, profile.household_id)
    if (!round) return NextResponse.json({ error: 'There\'s no vote open right now.' }, { status: 400 })
    const body = voteBody(first, round)
    const r = await sendSms(m.phone, body)
    await admin.from('sms_messages').insert({ household_id: profile.household_id, member_id: m.id, direction: 'out', to_number: m.phone, body, intent: `vote_request:${round.id}`, twilio_sid: r.sid ?? null })
    return NextResponse.json({ ok: r.ok, note: r.ok ? `Sent ${m.name} the vote as a plain text.` : 'Could not send.' })
  }
  if (b.action === 'send') {
    const message = String(b.message ?? '').trim().slice(0, 600)
    if (message.length < 2) return NextResponse.json({ error: 'Type a message first.' }, { status: 400 })
    const r = await sendSms(m.phone, `${first}: ${message}`)
    await admin.from('sms_messages').insert({ household_id: profile.household_id, member_id: m.id, direction: 'out', to_number: m.phone, body: message, intent: 'owner_message', twilio_sid: r.sid ?? null })
    return NextResponse.json({ ok: r.ok, note: r.ok ? `Sent to ${m.name}.` : 'Could not send.' })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
