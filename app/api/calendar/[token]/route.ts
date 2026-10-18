import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WEEKDAYS, WEEKDAY_LABEL } from '@/lib/settings'
import type { Meal } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * Private iCal feed: /api/calendar/<token>.ics
 * One all-day event per cook night (title = dinner, description = cook time +
 * steps) for the family's latest plans. Subscribe once in Google/Apple Calendar.
 */
function ics(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}
function ymd(d: Date) { return d.toISOString().slice(0, 10).replace(/-/g, '') }

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token.replace(/\.ics$/i, '')
  if (!/^[a-f0-9]{16,64}$/i.test(token)) return new NextResponse('Not found', { status: 404 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await admin.from('profiles').select('id, full_name').eq('calendar_token', token).single()
  if (!profile) return new NextResponse('Not found', { status: 404 })

  const { data: plans } = await admin
    .from('meal_plans')
    .select('id, week_start, meals, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(6)

  const lines: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DinnerDrop//Dinner plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${ics(`DinnerDrop — ${(profile.full_name || 'our').split(' ')[0]}'s dinners`)}`,
    'X-WR-TIMEZONE:UTC',
  ]
  const seenWeek = new Set<string>()
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  for (const plan of plans ?? []) {
    if (!plan.week_start || seenWeek.has(plan.week_start)) continue // latest plan per week wins
    seenWeek.add(plan.week_start)
    const monday = new Date(plan.week_start + 'T00:00:00Z')
    for (const meal of (plan.meals as Meal[]) ?? []) {
      const idx = WEEKDAYS.findIndex((d) => WEEKDAY_LABEL[d] === meal.day)
      if (idx < 0) continue
      const date = new Date(monday); date.setUTCDate(monday.getUTCDate() + idx)
      const end = new Date(date); end.setUTCDate(date.getUTCDate() + 1)
      const desc = [`${meal.prepTime + meal.cookTime} min · ${meal.servings} servings`, '', ...(meal.steps ?? []).map((s, i) => `${i + 1}. ${s}`), '', `https://www.dinnerdrop.app/recipe/${encodeURIComponent(meal.day.toLowerCase())}?cook=1`].join('\n')
      lines.push(
        'BEGIN:VEVENT',
        `UID:${plan.id}-${idx}@dinnerdrop.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(date)}`,
        `DTEND;VALUE=DATE:${ymd(end)}`,
        `SUMMARY:${ics(`🍽️ ${meal.name}`)}`,
        `DESCRIPTION:${ics(desc)}`,
        `URL:https://www.dinnerdrop.app/recipe/${encodeURIComponent(meal.day.toLowerCase())}`,
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  return new NextResponse(lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=900', 'Content-Disposition': 'inline; filename="dinnerdrop.ics"' },
  })
}
