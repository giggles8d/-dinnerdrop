import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import ActivateDay1 from '@/emails/ActivateDay1'
import { buildFirstPlan } from '@/lib/first-plan'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function authorized(request: NextRequest): Promise<boolean> {
  const secret = request.headers.get('x-admin-secret')
  if (secret && process.env.SETUP_SECRET && secret === process.env.SETUP_SECRET) return true
  const token = request.headers.get('x-image-token')
  if (!token || token.length < 32) return false
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin.from('app_kv').select('value').eq('key', 'recipe_image_token').maybeSingle()
  return (data?.value as { token?: string } | null)?.token === token
}

/**
 * POST { userIds: string[], sendEmail?: boolean }
 * For families who signed up but never got a saved plan: save their first week from the
 * recipe library, then (sendEmail) send the "your dinners are ready" email once
 * (email #1 of the activation sequence, so the daily cron won't send it again).
 */
export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.slice(0, 50) : []
  const sendEmail = body.sendEmail === true
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const results: Array<Record<string, unknown>> = []

  for (const id of userIds) {
    const r: Record<string, unknown> = { id }
    try {
      const plan = await buildFirstPlan(admin, id)
      r.plan = plan.ok ? (plan.existing ? 'already had one' : `saved ${plan.meals.length} dinners`) : plan.reason
      if (sendEmail && plan.ok) {
        const { data: p } = await admin.from('profiles').select('email, email_unsubscribed, email_sequence_sent').eq('id', id).single()
        const sent: number[] = p?.email_sequence_sent ?? []
        if (!p?.email || p.email_unsubscribed) r.email = 'skipped (no email / unsubscribed)'
        else if (sent.includes(1)) r.email = 'skipped (already sent)'
        else if (!resend) r.email = 'skipped (Resend not configured)'
        else {
          const unsubscribeUrl = `https://www.dinnerdrop.app/unsubscribe?uid=${id}`
          const html = await render(React.createElement(ActivateDay1, { firstName: 'there', unsubscribeUrl }))
          const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
            to: p.email,
            subject: 'Your 5 dinners for this week are ready 🍽️',
            html,
            headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          })
          if (error) r.email = `failed: ${error.message}`
          else {
            await admin.from('profiles').update({ email_sequence_sent: [...sent, 1] }).eq('id', id)
            r.email = 'sent'
          }
        }
      }
    } catch (e) {
      r.error = e instanceof Error ? e.message : String(e)
    }
    results.push(r)
  }
  return NextResponse.json({ results })
}
