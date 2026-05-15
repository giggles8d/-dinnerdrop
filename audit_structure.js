const fs = require('fs');
const content = fs.readFileSync('lib/blog-posts.ts', 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// Find all slugs
const slugs = [];
lines.forEach((l, i) => {
  const m = l.match(/^\s+slug:\s+'([^']+)'/);
  if (m) slugs.push({ line: i+1, slug: m[1] });
});
console.log('\nAll slugs found:', slugs.length);
slugs.forEach(s => console.log(`  L${s.line}: ${s.slug}`));

// Find the TS error spots
console.log('\n=== Lines 14418-14432 ===');
for (let i = 14417; i <= 14431; i++) {
  if (i < lines.length) console.log(`L${i+1}: ${JSON.stringify(lines[i])}`);
}

console.log('\n=== Lines 14570-14590 ===');
for (let i = 14569; i <= 14589; i++) {
  if (i < lines.length) console.log(`L${i+1}: ${JSON.stringify(lines[i])}`);
}

// Check the area just before error at 14421
// Find the object containing chicken-pot-pie
let cpIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("slug: 'chicken-pot-pie'")) { cpIdx = i; break; }
}
console.log('\nchicken-pot-pie slug at line', cpIdx+1);
console.log('Lines before chicken-pot-pie:');
for (let i = Math.max(0, cpIdx-5); i <= cpIdx+3; i++) {
  console.log(`L${i+1}: ${JSON.stringify(lines[i])}`);
}
