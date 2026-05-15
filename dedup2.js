const fs = require('fs');
const content = fs.readFileSync('lib/blog-posts.ts', 'utf8');

// Split into: header, entries, footer
const ARRAY_START = 'export const BLOG_POSTS: BlogPost[] = [\n';
const arrayIdx = content.indexOf(ARRAY_START);
if (arrayIdx === -1) { console.error('No BLOG_POSTS'); process.exit(1); }

const header = content.slice(0, arrayIdx + ARRAY_START.length);
const rest = content.slice(arrayIdx + ARRAY_START.length);

// Find footer (closing ] followed by export function)
const footerRe = /\n\]\nexport function/;
const footerMatch = rest.search(footerRe);
if (footerMatch === -1) { console.error('No footer'); process.exit(1); }

const arrayBody = rest.slice(0, footerMatch);
const footer = rest.slice(footerMatch);

// Split arrayBody into entries using a reliable boundary marker.
// Each entry starts with "  {\n    slug:" (2 spaces brace, 4 spaces slug)
// We split on the start pattern, keeping the delimiter
const entryBoundary = /(?=  \{\r?\n\s{4}slug:)/g;
const rawEntries = arrayBody.split(entryBoundary).filter(e => e.trim());

console.log('Raw entry chunks:', rawEntries.length);

// For each entry, extract the slug
const seenSlugs = new Set();
const uniqueEntries = [];
let skipped = 0;

rawEntries.forEach((entry, i) => {
  const m = entry.match(/^\s*\{\r?\n\s+slug:\s*['"]([^'"]+)['"]/);
  if (!m) {
    // Not a valid entry (might be whitespace between entries), skip
    return;
  }
  const slug = m[1];
  if (seenSlugs.has(slug)) {
    skipped++;
    return;
  }
  seenSlugs.add(slug);
  
  // Normalize: ensure entry ends with  }, and a newline
  let e = entry.trimEnd();
  // Remove trailing comma if present, then re-add
  if (e.endsWith('},')) { /* ok */ }
  else if (e.endsWith('}')) { e = e + ','; }
  else if (e.endsWith(',')) { /* ok */ }
  uniqueEntries.push(e);
});

console.log('Unique entries:', uniqueEntries.length);
console.log('Duplicates removed:', skipped);
console.log('Last 5 slugs:', [...seenSlugs].slice(-5));

// Reconstruct
const newContent = header
  + uniqueEntries.join('\n\n')
  + '\n'
  + footer;

fs.writeFileSync('lib/blog-posts.ts', newContent, 'utf8');
console.log('Written. Lines:', newContent.split('\n').length);

// Quick verify
let verifyCount = 0;
const verifyLines = newContent.split('\n');
const verifySeen = new Set();
const verifyDupes = [];
let inTpl = false;
verifyLines.forEach(line => {
  if (!inTpl && line.match(/content:\s*`/)) { inTpl = true; return; }
  if (inTpl && line.match(/^`\s*,?\s*$|^`\s*$/)) { inTpl = false; return; }
  if (!inTpl) {
    const sm = line.match(/^\s+slug:\s*['"]([^'"]+)['"]/);
    if (sm) {
      verifyCount++;
      if (verifySeen.has(sm[1])) verifyDupes.push(sm[1]);
      else verifySeen.add(sm[1]);
    }
  }
});
console.log('Verify - slug entries outside templates:', verifyCount);
console.log('Verify - unique:', verifySeen.size);
console.log('Verify - dupes:', verifyDupes.length, verifyDupes.slice(0,5));
