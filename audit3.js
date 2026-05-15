const fs = require('fs');
const c = fs.readFileSync('lib/blog-posts.ts', 'utf8');
// Count actual duplicate blog entries by checking for slug pattern NOT inside template literals
// We need to track backtick state
let inTemplate = false;
let count = 0;
const seen = new Set();
const dupes = [];
const lines = c.split('\n');
lines.forEach(line => {
  if (!inTemplate) {
    // Count backtick starts (content: `)
    const btMatch = line.match(/content:\s*`/);
    if (btMatch) { inTemplate = true; return; }
    // Look for slug lines
    const m = line.match(/^\s+slug:\s*['"]([^'"]+)['"]/);
    if (m) {
      count++;
      if (seen.has(m[1])) dupes.push(m[1]);
      else seen.add(m[1]);
    }
  } else {
    // Look for end of template literal: line ending with `, or `  },
    if (line.match(/^`\s*,?\s*$/) || line.match(/^`\s*$/)) {
      inTemplate = false;
    }
  }
});
console.log('Slug entries outside template literals:', count);
console.log('Unique slugs:', seen.size);
console.log('True duplicates:', dupes.length, dupes.length > 0 ? dupes.slice(0,5) : '');
