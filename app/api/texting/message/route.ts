import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendSms, smsConfigured } from '@/lib/notify'
import { isFamilyProfile } from '@/lib/access'

/**
 * The planner's note to the family, by text.
 *  GET  → the recent family thread (the planner's notes, what people texted back, what the bot passed on)
 *  POST { message } → texts every opted-in member; replies come back through the bot and are passed to the planner.
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

const THREAD_INTENTS = ['owner_message', 'for_planner', 'relay', 'pick', 'dislike', 'allgood', 'none', 'add', 'suggest', 'tally', 'tonight', 'recipe', 'menu', 'list', 'unknown']

export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ messages: [], members: [] })
  const { admin, profile } = c
  const [{ data: rows }, { data: members }] = await Promise.all([
    admin.from('sms_messages').select('id, member_id, direction, body, intent, created_at').eq('household_id', profile.household_id).in('intent', THREAD_INTENTS).order('created_at', { ascending: false }).limit(40),
    admin.from('household_members').select('id, name, phone, phone_opt_in_at, phone_opted_out').eq('household_id', profile.household_id),
  ])
  const byId = new Map((members ?? []).map((m) => [m.id, m.name as string]))
  const first = (profile.full_name || 'You').trim().split(' ')[0]
  const messages = (rows ?? []).reverse().map((r) => ({
    id: r.id,
    who: r.direction === 'in' ? (byId.get(r.member_id) ?? 'Someone') : r.intent === 'owner_message' ? first : 'DinnerDrop',
    mine: r.direction === 'out' && r.intent === 'owner_message',
    bot: r.direction === 'out' && r.intent !== 'owner_message',
    body: r.body ?? '',
    at: r.created_at,
  }))
  const reach = (members ?? []).filter((m) => m.phone && m.phone_opt_in_at && !m.phone_opted_out).map((m) => m.name as string)
  return NextResponse.json({ messages, members: reach, family: isFamilyProfile(profile), configured: smsConfigured() })
}

export async function POST(request: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { admin, profile } = c
  if (!isFamilyProfile(profile)) return NextResponse.json({ error: 'family_required' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { message?: string }
  const message = String(body.message ?? '').trim().slice(0, 600)
  if (message.length < 2) return NextResponse.json({ error: 'Say something first.' }, { status: 400 })
  const first = (profile.full_name || 'Your planner').trim().split(' ')[0]
  const { data: members } = await admin.from('household_members').select('id, name, phone, phone_opt_in_at, phone_opted_out, profile_id').eq('household_id', profile.household_id)
  const to = (members ?? []).filter((m) => m.phone && m.phone_opt_in_at && !m.phone_opted_out && m.profile_id !== profile.id)
  if (!to.length) return NextResponse.json({ error: 'Nobody has joined the texts yet — add numbers under Settings → Family texting.' }, { status: 400 })
  const text = `${first}: ${message}`
  let sent = 0
  for (const m of to) {
    const r = await sendSms(m.phone as string, text)
    await admin.from('sms_messages').insert({ household_id: profile.household_id, member_id: m.id, direction: 'out', to_number: m.phone, body: message, intent: 'owner_message', twilio_sid: r.sid ?? null })
    if (r.ok) sent++
  }
  return NextResponse.json({ ok: true, sent, to: to.map((m) => m.name) })
}
