const fs = require('fs')
const { execSync } = require('child_process')

const toDelete = ['check_content.js', 'fix_d6h1.js', 'fix_d6h1_v2.js', 'fix_v2b.js', 'commit_msg.txt', 'do_commit.bat']
toDelete.forEach(f => {
  try { fs.unlinkSync(f); console.log('deleted', f) } catch (e) { console.log('skip', f) }
})

fs.writeFileSync('_commit_cleanup.txt', 'chore: remove session fix scripts from repo root')
execSync('git add -A', { stdio: 'inherit' })
execSync('git commit -F _commit_cleanup.txt', { stdio: 'inherit' })
fs.unlinkSync('_commit_cleanup.txt')
execSync('git push origin main', { stdio: 'inherit' })
console.log('DONE')
