/** Family-plan access, in one place. */
export function isFamilyProfile(p: {
  subscription_status?: string | null
  is_beta_member?: boolean | null
  family_until?: string | null
}): boolean {
  const s = p.subscription_status
  if (s === 'active' || s === 'trialing' || s === 'past_due') return true
  if (p.is_beta_member) return true
  if (p.family_until && new Date(p.family_until) > new Date()) return true
  return false
}
