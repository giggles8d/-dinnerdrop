import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * May this request act for `userId`? (Nov 8 2026 review: the AI routes only checked that the userId in the body
 * existed, so anyone holding a family's id — it appears in email links — could run AI calls on our bill.)
 * Allowed: our own server jobs (the cron secret), the signed-in user themselves, or a signed-in member of the same
 * household (partners plan and shop on the owner's account).
 */
export async function mayActFor(request: Request, admin: SupabaseClient, userId: string): Promise<boolean> {
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true
  let me: string | null = null
  try {
    const { data: { user } } = await createServerSupabaseClient().auth.getUser()
    me = user?.id ?? null
  } catch { me = null }
  if (!me) return false
  if (me === userId) return true
  const { data } = await admin.from('profiles').select('id, household_id').in('id', [me, userId])
  const a = data?.find((p) => p.id === me)?.household_id
  const b = data?.find((p) => p.id === userId)?.household_id
  return !!a && a === b
}
