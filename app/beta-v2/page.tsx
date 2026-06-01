import { redirect } from 'next/navigation'

// /beta-v2 was a stale A/B variant. Redirecting to the canonical /beta page
// to avoid serving outdated copy to any bookmarked / shared links.
export default function BetaV2Redirect() {
  redirect('/beta')
}
