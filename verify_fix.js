const fs = require('fs');
const lines = fs.readFileSync('lib/blog-posts.ts', 'utf8').split('\n');
console.log('Total lines:', lines.length);
console.log('Lines 14415-14430:');
for (let i = 14414; i <= 14429; i++) {
  if (i < lines.length) console.log(`L${i+1}: ${JSON.stringify(lines[i])}`);
}
console.log('\nLines 14570-14580:');
for (let i = 14569; i <= 14579; i++) {
  if (i < lines.length) console.log(`L${i+1}: ${JSON.stringify(lines[i])}`);
}
// Check for any remaining bare commas at end of content fields
let bareCommas = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].replace('\r','');
  if (l === ',') {
    // Check if previous non-empty line is end of blog content
    bareCommas.push(i+1);
  }
}
console.log('\nBare comma-only lines:', bareCommas);
