import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 30 // cache 30s server-side

// Returns the most-recent beta-member signups as anonymized ticker entries.
// Privacy: we never return the actual email — only the first letter of the
// local part. Used by the RecentSignupsTicker component on /beta to show
// real social proof ("S. just joined • 4 min ago").
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Pull last 10 beta members. Joining auth.users to grab email (which lives there,
    // not on profiles). RLS doesn't apply — we're using the service role key.
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, created_at, family_size, is_beta_member')
      .eq('is_beta_member', true)
      .order('created_at', { ascending: false })
      .limit(10)

    if (profilesErr) {
      console.error('[signups-ticker] profiles error:', profilesErr.message)
      return NextResponse.json({ entries: [] }, { status: 200 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ entries: [] }, { status: 200 })
    }

    // Fetch matching auth.users entries one at a time (admin API). We only need
    // the email first-letter; we never expose the full email.
    const entries = await Promise.all(
      profiles.map(async (p) => {
        let initial = '?'
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(p.id)
          const email = userData?.user?.email || ''
          initial = (email.charAt(0) || '?').toUpperCase()
        } catch {
          // Fall back to hash-derived deterministic placeholder if admin fetch fails.
          initial = createHash('md5').update(p.id).digest('hex').charAt(0).toUpperCase()
        }
        return {
          initial,
          createdAt: p.created_at,
          familySize: p.family_size ?? null,
        }
      })
    )

    return NextResponse.json({ entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[signups-ticker] fatal:', message)
    return NextResponse.json({ entries: [] }, { status: 200 })
  }
}
