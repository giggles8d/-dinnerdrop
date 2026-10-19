/**
 * "Your recipes for the week" — sent once per plan, right after the family sends the list to
 * Instacart or Kroger (or on demand from the grocery list page). One printable PDF per dinner.
 */
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meal } from '@/types'
import { recipePdf, recipeFileName } from '@/lib/recipe-pdf'

export async function sendWeekRecipes(admin: SupabaseClient, userId: string, opts: { force?: boolean; planId?: string } = {}): Promise<{ sent: boolean; reason?: string; count?: number; to?: string; id?: string; bytes?: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'no_resend_key' }
  const { data: prof } = await admin.from('profiles').select('email, full_name, settings').eq('id', userId).single()
  if (!prof?.email) return { sent: false, reason: 'no_email' }

  const planQuery = admin.from('meal_plans').select('id, week_start, meals, created_at').eq('user_id', userId)
  const { data: plan } = opts.planId
    ? await planQuery.eq('id', opts.planId).single()
    : await planQuery.order('created_at', { ascending: false }).limit(1).single()
  if (!plan) return { sent: false, reason: 'no_plan' }
  const meals = ((plan.meals as Meal[]) ?? []).filter((m) => m && m.name)
  if (!meals.length) return { sent: false, reason: 'empty_plan' }

  const settings = (prof.settings as Record<string, unknown> | null) ?? {}
  const emailed = (settings.recipesEmailed as Record<string, string> | undefined) ?? {}
  if (emailed[plan.id] && !opts.force) return { sent: false, reason: 'already_sent' }

  const weekLabel = plan.week_start ? `Week of ${new Date(plan.week_start + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'This week'
  const familyName = (prof.full_name as string | null)?.trim() ? `${(prof.full_name as string).trim().split(' ')[0]}'s family` : undefined

  const attachments = await Promise.all(meals.map(async (m) => ({
    filename: recipeFileName(m, m.day),
    content: Buffer.from(await recipePdf(m, { familyName, weekLabel, nightLabel: m.day })).toString('base64'),
  })))

  const rows = meals.map((m) => `<tr><td style="padding:6px 10px 6px 0;color:#1a5c38;font-weight:600;white-space:nowrap">${esc(m.day)}</td><td style="padding:6px 0">${esc(m.name)} <span style="color:#6b7280">· ${(m.cookTime ?? 0) + (m.prepTime ?? 0)} min · serves ${m.servings}</span></td></tr>`).join('')
  const html = `<!doctype html><html><body style="margin:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#1a5c38;padding:20px 28px"><span style="color:#e8a838;font-size:22px;font-weight:700">DinnerDrop</span></div>
    <div style="padding:28px">
      <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 14px">Groceries are on their way. Here are your recipes for the week — one PDF per dinner, attached, so you can print the one you need or open it on your phone at the stove.</p>
      <table style="border-collapse:collapse;font-size:15px;color:#374151;margin:8px 0 18px">${rows}</table>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 14px">Each card has the total time, how many pans, a safe bet for the picky eater, the ingredients sized for your family, and the steps. Cook mode on <a href="https://www.dinnerdrop.app/dashboard" style="color:#1a5c38">your dashboard</a> has the same steps, one at a time.</p>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0">Swap a dinner before you cook it? Reply to this email or tap <em>swap</em> on the dashboard and we&rsquo;ll resend the card.</p>
    </div>
    <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">You get this because your family&rsquo;s grocery list was sent to a store from DinnerDrop. <a href="https://www.dinnerdrop.app/settings" style="color:#6b7280">Settings</a></div>
  </div></body></html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
    to: prof.email as string,
    subject: `Your recipes for the week — ${meals.length} dinners, one card each`,
    html,
    attachments,
    tags: [{ name: 'type', value: 'week-recipes' }],
  })
  if (error) return { sent: false, reason: typeof error === 'string' ? error : JSON.stringify(error) }
  await admin.from('profiles').update({ settings: { ...settings, recipesEmailed: { ...emailed, [plan.id]: new Date().toISOString() } } }).eq('id', userId)
  return { sent: true, count: meals.length, to: prof.email as string, id: data?.id, bytes: attachments.reduce((n, a) => n + a.content.length, 0) }
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
