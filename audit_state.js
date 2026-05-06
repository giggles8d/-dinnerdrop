const fs = require('fs')

// Check middleware
const mid = fs.readFileSync('middleware.ts', 'utf8')
console.log('=== MIDDLEWARE protectedPaths ===')
const midIdx = mid.indexOf('protectedPaths')
console.log(mid.substring(midIdx, midIdx + 160).replace(/\r\n/g, '\n'))

// Check subscribe page
const sub = fs.readFileSync('app/subscribe/page.tsx', 'utf8')
console.log('\n=== SUBSCRIBE handleCheckout (key part) ===')
const subIdx = sub.indexOf('if (res.status === 401')
if (subIdx >= 0) {
  console.log('ALREADY HAS 401 check at index', subIdx)
} else {
  const subIdx2 = sub.indexOf('setError(data.error')
  console.log('setError at index:', subIdx2)
  console.log(sub.substring(subIdx2 - 80, subIdx2 + 80).replace(/\r\n/g, '\n'))
}

// Check history page formatWeekOf
const hist = fs.readFileSync('app/(app)/history/page.tsx', 'utf8')
console.log('\n=== HISTORY formatWeekOf ===')
const histIdx = hist.indexOf('formatWeekOf')
console.log(hist.substring(histIdx, histIdx + 200).replace(/\r\n/g, '\n'))
