#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Ajusta esta ruta si tu copia de workflows está en otra ubicación
const WORKFLOWS_DIR = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows';
const OUT_DIR = path.join(WORKFLOWS_DIR, 'sanitized');

if (!fs.existsSync(WORKFLOWS_DIR)) {
  console.error('Workflows dir not found:', WORKFLOWS_DIR);
  process.exit(2);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function stripCredentials(obj) {
  if (Array.isArray(obj)) return obj.map(stripCredentials);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) {
      if (k === 'credentials') continue;
      if (k === 'webhookId') continue;
      out[k] = stripCredentials(obj[k]);
    }
    return out;
  }
  return obj;
}

const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));
for (const file of files) {
  try {
    const p = path.join(WORKFLOWS_DIR, file);
    const src = fs.readFileSync(p, 'utf8');
    const obj = JSON.parse(src);
    const cleaned = stripCredentials(obj);
    const outPath = path.join(OUT_DIR, file);
    fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf8');
    console.log('Wrote sanitized:', outPath);
  } catch (e) {
    console.error('Failed to sanitize', file, e.message);
  }
}

console.log('Sanitization finished. Output dir:', OUT_DIR);
