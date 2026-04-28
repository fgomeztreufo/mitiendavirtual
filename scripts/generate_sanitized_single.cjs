#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const src = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.json';
const out = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.sanitized.json';

function strip(obj) {
  if (Array.isArray(obj)) return obj.map(strip);
  if (obj && typeof obj === 'object') {
    const o = {};
    for (const k of Object.keys(obj)) {
      if (k === 'credentials' || k === 'webhookId') continue;
      o[k] = strip(obj[k]);
    }
    return o;
  }
  return obj;
}

try {
  const data = fs.readFileSync(src, 'utf8');
  const obj = JSON.parse(data);
  const cleaned = strip(obj);
  fs.writeFileSync(out, JSON.stringify(cleaned, null, 2), 'utf8');
  console.log('Wrote sanitized file:', out);
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}
