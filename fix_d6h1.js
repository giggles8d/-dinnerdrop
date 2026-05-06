const fs = require('fs')
const path = require('path')

const ROOT = 'C:\\Users\\setzl\\dd-ops-session'
let fixes = 0

function applyFix(filePath, oldStr, newStr, description) {
  const fullPath = path.join(ROOT, filePath)
  let content = fs.readFileSync(fullPath, 'utf8')
  // Normalize to LF for matching, then restore CRLF after
  const hasCRLF = content.includes('\r\n')
  const normalized = content.replace(/\r\n/g, '\n')
  const oldNorm = oldStr.replace(/\r\n/g, '\n')
  const newNorm = newStr.replace(/\r\n/g, '\n')
  if (!normalized.includes(oldNorm)) {
    console.log(`SKIP (not found): ${description}`)
    return
  }
  let fixed = normalized.replace(oldNorm, newNorm)
  if (hasCRLF) fixed = fixed.replace(/\n/g, '\r\n')
  fs.writeFileSync(fullPath, fixed, 'utf8')
  console.log(`FIXED: ${description}`)
  fixes++
}

// ─── FIX 1: subscribe/page.tsx — redirect to signup on 401 ───
applyFix(
  'app/subscribe/page.tsx',
  `      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }`,
  `      if (res.status === 401) {
        // Not logged in — redirect to signup, then back here with coupon preserved
        const dest = '/subscribe' + (couponCode ? '?coupon=' + couponCode : '')
        window.location.href = '/signup?redirect=' + encodeURIComponent(dest)
        return
      }
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }`,
  'subscribe: redirect to signup when unauthenticated (401)'
)

// ─── FIX 2: history/page.tsx — null guard on week_start in formatWeekOf ───
applyFix(
  'app/(app)/history/page.tsx',
  `function formatWeekOf(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}`,
  `function formatWeekOf(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown week'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}`,
  'history: null guard on week_start (older plans may have null week_start)'
)

console.log(`\nTotal fixes applied: ${fixes}`)
