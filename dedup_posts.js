const fs = require('fs');

const content = fs.readFileSync('lib/blog-posts.ts', 'utf8');

// Extract the header (interface + BLOG_POSTS declaration start)
const arrayStart = content.indexOf('export const BLOG_POSTS: BlogPost[] = [');
if (arrayStart === -1) { console.error('Cannot find BLOG_POSTS'); process.exit(1); }

const header = content.substring(0, arrayStart + 'export const BLOG_POSTS: BlogPost[] = [\n'.length);

// Extract the footer (closing ] + exported functions)
const footerMatch = content.match(/\n\]\nexport function/);
if (!footerMatch) { console.error('Cannot find footer'); process.exit(1); }
const footerStart = content.indexOf('\n]\nexport function');
const footer = content.substring(footerStart);

// Parse the array body: find each entry using backtick depth tracking
const arrayBody = content.substring(arrayStart + 'export const BLOG_POSTS: BlogPost[] = [\n'.length, footerStart);

const entries = [];
let i = 0;
let inBacktick = false;
let entryStart = -1;
let braceDepth = 0;

// Find all top-level { ... } entries
while (i < arrayBody.length) {
  const ch = arrayBody[i];
  
  if (inBacktick) {
    // Check for escaped backtick
    if (ch === '\\' && arrayBody[i+1] === '`') {
      i += 2;
      continue;
    }
    if (ch === '`') inBacktick = false;
    i++;
    continue;
  }
  
  // Not in backtick
  if (ch === '`') { inBacktick = true; i++; continue; }
  
  if (ch === '{') {
    if (braceDepth === 0) entryStart = i;
    braceDepth++;
    i++;
    continue;
  }
  
  if (ch === '}') {
    braceDepth--;
    if (braceDepth === 0 && entryStart !== -1) {
      // Found a complete entry
      let entryText = arrayBody.substring(entryStart, i + 1);
      // Get trailing comma if present
      let j = i + 1;
      while (j < arrayBody.length && (arrayBody[j] === ',' || arrayBody[j] === ' ' || arrayBody[j] === '\r')) j++;
      const hasComma = arrayBody[i + 1] === ',';
      entries.push({ text: entryText, hasComma });
      entryStart = -1;
    }
    i++;
    continue;
  }
  
  i++;
}

console.log('Total entries parsed:', entries.length);

// Extract slug from each entry
function getSlug(text) {
  const m = text.match(/\n\s+slug:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

// Deduplicate: keep first occurrence of each slug
const seenSlugs = new Set();
const uniqueEntries = [];
const skipped = [];

entries.forEach(entry => {
  const slug = getSlug(entry.text);
  if (!slug) { console.log('Entry with no slug:', entry.text.substring(0, 100)); return; }
  if (seenSlugs.has(slug)) {
    skipped.push(slug);
    return;
  }
  seenSlugs.add(slug);
  uniqueEntries.push(entry);
});

console.log('Unique entries:', uniqueEntries.length);
console.log('Duplicates removed:', skipped.length);
console.log('Unique slugs:', [...seenSlugs].slice(-5));

// Check if teriyaki is missing — if so, note it
const hasTeriyaki = seenSlugs.has('teriyaki-chicken') || seenSlugs.has('chicken-teriyaki');
console.log('Has teriyaki:', hasTeriyaki);

// Reconstruct file
const reconstructed = header
  + uniqueEntries.map((e, idx) => {
      // Ensure trailing comma on all entries
      let text = e.text;
      if (!text.endsWith(',')) text = text + ',';
      return '  ' + text;
    }).join('\n\n')
  + footer;

fs.writeFileSync('lib/blog-posts.ts', reconstructed, 'utf8');
console.log('File written. New length:', reconstructed.split('\n').length, 'lines');
