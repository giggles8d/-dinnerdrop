const fs = require('fs')
const c = fs.readFileSync('middleware.ts', 'utf8')
// Check line endings
const hasCRLF = c.includes('\r\n')
console.log('Has CRLF:', hasCRLF)
// Find the protected paths line
const idx = c.indexOf('protectedPaths')
console.log('protectedPaths at index:', idx)
console.log('Content around it:', JSON.stringify(c.substring(idx, idx + 120)))
