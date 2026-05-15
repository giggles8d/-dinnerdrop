const fs = require('fs');
const lines = fs.readFileSync('lib/blog-posts.ts', 'utf8').split('\n');
const slugs = [];
const dupes = [];
lines.forEach(line => {
  const m = line.match(/^\s+slug:\s*['"]([^'"]+)['"]/);
  if (m) {
    if (slugs.includes(m[1])) dupes.push(m[1]);
    else slugs.push(m[1]);
  }
});
console.log('Total unique slugs:', slugs.length);
console.log('Duplicates:', dupes.length > 0 ? dupes : 'none');
console.log('\nAll slugs:');
slugs.forEach((s, i) => console.log(`  ${i+1}. ${s}`));
