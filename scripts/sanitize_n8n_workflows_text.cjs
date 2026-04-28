#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows';
const OUT_DIR = path.join(WORKFLOWS_DIR, 'sanitized');

if (!fs.existsSync(WORKFLOWS_DIR)) {
  console.error('Workflows dir not found:', WORKFLOWS_DIR);
  process.exit(2);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));
for (const file of files) {
  const p = path.join(WORKFLOWS_DIR, file);
  let src = fs.readFileSync(p, 'utf8');
  // Remove credentials blocks (simple heuristic)
  src = src.replace(/"credentials"\s*:\s*\{[\s\S]*?\}\s*,?/g, '');
  // Remove webhookId fields
  src = src.replace(/"webhookId"\s*:\s*"[^"]*"\s*,?/g, '');
  // Remove trailing commas before closing objects/arrays introduced by removals
  src = src.replace(/,\s*(\}|\])/g, '$1');

  const outPath = path.join(OUT_DIR, file);
  try {
    // Try to parse and reformat; if parse fails, write cleaned text as-is
    const obj = JSON.parse(src);
    fs.writeFileSync(outPath, JSON.stringify(obj, null, 2), 'utf8');
    console.log('Wrote sanitized (parsed):', outPath);
  } catch (e) {
    fs.writeFileSync(outPath, src, 'utf8');
    console.warn('Wrote sanitized (raw) - parsing failed for:', file, e.message);
  }
}

console.log('Textual sanitization finished. Output dir:', OUT_DIR);
