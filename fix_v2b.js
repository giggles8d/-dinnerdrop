const fs = require('fs')

const ROOT = 'C:\\Users\\setzl\\dd-ops-session'
const filePath = ROOT + '\\app\\beta-v2\\page.tsx'
let content = fs.readFileSync(filePath, 'utf8')
// Log what we see around line 29
const lines = content.split('\n')
for (let i = 27; i <= 32; i++) {
  console.log(i + ':', JSON.stringify(lines[i]))
}
