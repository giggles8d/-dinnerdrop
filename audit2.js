const fs = require('fs');
const c = fs.readFileSync('lib/blog-posts.ts', 'utf8');
// Check for teriyaki
const m = c.match(/slug:\s*['"]([^'"]*teriyaki[^'"]*)['"]/);
console.log('teriyaki slug:', m ? m[1] : 'NOT FOUND');
// Check total line count
const lines = c.split('\n');
console.log('Total lines:', lines.length);
// Count all slug occurrences (including duplicates)
const allSlugs = [];
lines.forEach(l => {
  const sm = l.match(/^\s+slug:\s*['"]([^'"]+)['"]/);
  if (sm) allSlugs.push(sm[1]);
});
console.log('Total slug entries (incl dupes):', allSlugs.length);
// Show last 5 unique
const seen = new Set();
const uniq = [];
allSlugs.forEach(s => { if (!seen.has(s)) { seen.add(s); uniq.push(s); }});
console.log('Unique posts:', uniq.length);
console.log('Last 5 unique slugs:', uniq.slice(-5));
