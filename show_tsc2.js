const fs = require('fs');
const out = fs.readFileSync('tsc_out.txt', 'utf8');
const lines = out.split('\n').filter(l => l.trim());
const newErrors = lines.filter(l => !l.includes('blog-posts.ts(11,'));
console.log('New errors (first 30):');
newErrors.slice(0, 30).forEach(l => console.log(l));
console.log('\nTotal new errors:', newErrors.length);
