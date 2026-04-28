#!/usr/bin/env node
const fs = require('fs');
const src = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.json';
const out = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.sanitized.json';

function escapeChar(ch) {
  switch (ch) {
    case '\\': return '\\\\';
    case '"': return '\\"';
    case '\b': return '\\b';
    case '\f': return '\\f';
    case '\n': return '\\n';
    case '\r': return '\\r';
    case '\t': return '\\t';
  }
  const code = ch.charCodeAt(0);
  if (code < 32) {
    return '\\u' + code.toString(16).padStart(4, '0');
  }
  return ch;
}

function sanitizeText(text) {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!inString) {
      if (ch === '"') { inString = true; out += ch; }
      else out += ch;
    } else {
      if (escape) { out += ch; escape = false; }
      else if (ch === '\\') { out += ch; escape = true; }
      else if (ch === '"') { inString = false; out += ch; }
      else {
        // If control char (code < 32) replace
        const code = ch.charCodeAt(0);
        if (code < 32) {
          // map common
          if (ch === '\n') out += '\\n';
          else if (ch === '\r') out += '\\r';
          else if (ch === '\t') out += '\\t';
          else out += '\\u' + code.toString(16).padStart(4, '0');
        } else {
          out += ch;
        }
      }
    }
  }
  return out;
}

try {
  const raw = fs.readFileSync(src, 'utf8');
  const sanitizedText = sanitizeText(raw);
  // validate
  JSON.parse(sanitizedText);
  fs.writeFileSync(out, sanitizedText, 'utf8');
  console.log('Sanitized and validated:', out);
} catch (e) {
  console.error('Failed to sanitize/validate JSON:', e.message);
  process.exit(1);
}
