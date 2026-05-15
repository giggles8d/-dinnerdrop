const fs = require('fs');
const out = fs.readFileSync('tsc_out.txt', 'utf8');
const lines = out.split('\n');
// Filter out the pre-existing TS2322 error on line 11 and show the rest
const errors = lines.filter(l => l.includes('error TS') && !l.includes('(11,14)'));
console.log('New errors (excluding pre-existing line 11 TS2322):');
errors.slice(0, 20).forEach(e => console.log(e));
console.log(`Total new errors: ${errors.length}`);
