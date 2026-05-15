const fs = require('fs');
const lines = fs.readFileSync('lib/blog-posts.ts', 'utf8').split('\n');
const slugLines = lines.filter(l => /^\s+slug:\s+'/.test(l));
console.log('Total slugs:', slugLines.length);
console.log('Last 8:');
slugLines.slice(-8).forEach(l => console.log(' ', l.trim()));
