/**
 * "Your dinners for the week are planned" — the Sunday email for families whose week was planned automatically.
 * Shows each dinner with its photo, the total, and one tap to the grocery list.
 */
import { emailImageUrl } from './email-image'
import type { Meal } from '@/types'

const APP = 'https://www.dinnerdrop.app'
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const link = (path: string, c: string) => `${APP}${path}${path.includes('?') ? '&' : '?'}utm_source=email&utm_medium=plan-ready&utm_campaign=${c}`

export function planReadySubject(meals: Meal[]): string {
  const first = meals[0]?.name
  return first ? `Your week is planned — ${first} and ${meals.length - 1} more` : 'Your dinners for the week are planned'
}

export function planReadyHtml(opts: { firstName: string; meals: Meal[]; weekLabel: string; unsubscribeUrl: string; note?: string }): string {
  const { firstName, meals, weekLabel, unsubscribeUrl, note } = opts
  const total = meals.reduce((s, m) => s + (Number(m.estimatedCost) || 0), 0)
  const mins = (m: Meal) => (Number(m.prepTime) || 0) + (Number(m.cookTime) || 0)
  const rows = meals.map((m) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eeebe3;width:76px;vertical-align:top">
        ${emailImageUrl(m.imageUrl) ? `<img src="${emailImageUrl(m.imageUrl, 200)}" width="68" height="68" alt="" style="display:block;width:68px;height:68px;object-fit:cover;border-radius:10px;background:#eee">` : `<div style="width:68px;height:68px;border-radius:10px;background:#e9efe9"></div>`}
      </td>
      <td style="padding:8px 0 8px 12px;border-bottom:1px solid #eeebe3;vertical-align:top">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1a5c38">${esc(m.day)}</p>
        <p style="margin:2px 0 2px;font-size:16px;font-weight:700;line-height:1.3;color:#1f2a24">${esc(m.name)}</p>
        <p style="margin:0;font-size:13px;color:#5b6660">${mins(m) ? `${mins(m)} min` : 'weeknight'}${Number(m.estimatedCost) > 0 ? ` · about $${Number(m.estimatedCost).toFixed(0)}` : ''}</p>
      </td>
    </tr>`).join('')
  return `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e6e2d8">
  <tr><td style="padding:24px 28px 6px">
    <p style="margin:0 0 14px;font-weight:700;color:#1a5c38;font-size:13px;letter-spacing:.08em;text-transform:uppercase">DinnerDrop</p>
    <h1 style="margin:0 0 6px;font-size:24px;line-height:1.25">Hi ${esc(firstName)}, your week is planned 🗓️</h1>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#3d4a43">${meals.length} dinners for the week of ${esc(weekLabel)}${total > 0 ? `, about <strong>$${total.toFixed(0)}</strong> in groceries` : ''}. ${note ? esc(note) + ' ' : ''}Swap anything you like, then send the whole list to your cart in one tap.</p>
  </td></tr>
  <tr><td style="padding:10px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
  <tr><td align="center" style="padding:18px 28px 6px">
    <a href="${link('/grocery-list', 'shop')}" style="display:inline-block;background:#1a5c38;color:#ffffff;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;text-decoration:none">Send my list to Instacart →</a>
    <p style="margin:12px 0 0;font-size:14px"><a href="${link('/dashboard', 'swap')}" style="color:#1a5c38">Swap a dinner</a> · <a href="${link('/recipes', 'browse')}" style="color:#1a5c38">Browse the library</a></p>
  </td></tr>
  <tr><td style="padding:14px 28px 6px">
    <p style="margin:0;font-size:14px;line-height:1.55;color:#3d4a43"><em>P.S. Want the family to pick? <a href="${link('/dashboard?texting=1', 'texting')}" style="color:#1a5c38">Add their numbers</a> and DinnerDrop texts them the options to vote on — and anyone can text “ADD milk” to put it on the list.</em></p>
  </td></tr>
  <tr><td style="padding:16px 28px 22px;border-top:1px solid #e6e2d8">
    <p style="margin:0;font-size:12px;line-height:1.5;color:#8a8577">You're getting this because automatic weekly plans are on in your DinnerDrop settings. <a href="${APP}/settings" style="color:#8a8577">Change reminders</a> · <a href="${unsubscribeUrl}" style="color:#8a8577">Unsubscribe</a></p>
  </td></tr>
</table></td></tr></table></body></html>`
}
