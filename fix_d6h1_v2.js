const fs = require('fs')
const path = require('path')

const ROOT = 'C:\\Users\\setzl\\dd-ops-session'
let fixes = 0

function applyFix(filePath, oldStr, newStr, description) {
  const fullPath = path.join(ROOT, filePath)
  let content = fs.readFileSync(fullPath, 'utf8')
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

// ─── FIX 1: beta/page.tsx — header "Try free" missing coupon ───
applyFix(
  'app/beta/page.tsx',
  `<Link href="/subscribe" className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#1a5c38' }}>`,
  `<Link href="/subscribe?coupon=BETA100" className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#1a5c38' }}>`,
  'beta/page.tsx: header "Try free" now includes ?coupon=BETA100'
)

// ─── FIX 2: beta-v2/page.tsx — same header CTA bug ───
applyFix(
  'app/beta-v2/page.tsx',
  `<Link href="/subscribe" className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#1a5c38' }}>`,
  `<Link href="/subscribe?coupon=BETA100" className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ backgroundColor: '#1a5c38' }}>`,
  'beta-v2/page.tsx: header "Try free" now includes ?coupon=BETA100'
)

console.log(`\nTotal fixes applied: ${fixes}`)
