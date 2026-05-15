const fs = require('fs');
const lines = fs.readFileSync('lib/blog-posts.ts', 'utf8').split('\n');
console.log('Total lines:', lines.length);

// Find all slugs
const slugLines = [];
lines.forEach((l,i) => { if (/^\s+slug:\s+'/.test(l)) slugLines.push({i, slug: l.match(/'([^']+)'/)[1]}); });
console.log('Total slugs:', slugLines.length);
console.log('Last 6 slugs:');
slugLines.slice(-6).forEach(s => console.log(`  L${s.i+1}: ${s.slug}`));

// Find array close
let arrClose = -1;
for (let i = lines.length-1; i >= 0; i--) {
  if (lines[i].replace('\r','') === ']') { arrClose = i; break; }
}
console.log('\nLast ] at line', arrClose+1, ':', JSON.stringify(lines[arrClose]));

// Show lines around array close
console.log('\nLines', arrClose-3, 'to', arrClose+12, ':');
for (let i = arrClose-3; i <= arrClose+11 && i < lines.length; i++) {
  console.log(`L${i+1}: ${JSON.stringify(lines[i])}`);
}

// Check for getAllPostSlugs corruption
let getAllIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('getAllPostSlugs')) { getAllIdx = i; break; }
}
console.log('\ngetAllPostSlugs at line', getAllIdx+1, ':', JSON.stringify(lines[getAllIdx]));

// Check L1403 area
console.log('\nLines 1400-1408:');
for (let i = 1399; i <= 1407; i++) console.log(`L${i+1}: ${JSON.stringify(lines[i])}`);
