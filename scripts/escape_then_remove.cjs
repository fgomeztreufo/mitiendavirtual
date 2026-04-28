#!/usr/bin/env node
const fs = require('fs');
const src = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.json';
const out = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.sanitized.json';
let s = fs.readFileSync(src,'utf8');

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
        const code = ch.charCodeAt(0);
        if (code < 32) {
          if (ch === '\n') out += '\\n';
          else if (ch === '\r') out += '\\r';
          else if (ch === '\t') out += '\\t';
          else out += '\\u' + code.toString(16).padStart(4, '0');
        } else out += ch;
      }
    }
  }
  return out;
}

function removeKeyObject(text, key) {
  let idx = 0;
  while ((idx = text.indexOf('"'+key+'"', idx)) !== -1) {
    const colon = text.indexOf(':', idx);
    if (colon === -1) break;
    const brace = text.indexOf('{', colon);
    if (brace === -1) break;
    let depth = 0; let i = brace;
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    if (depth !== 0) break;
    let j = i; while (j < text.length && /[ \t\r\n]/.test(text[j])) j++;
    if (text[j] === ',') { i = j+1; }
    text = text.slice(0, idx) + text.slice(i);
  }
  return text;
}
function removeKeyValue(text, key) {
  const re = new RegExp('"'+key+'"\\s*:\\s*"[^"]*"\\s*,?', 'g');
  return text.replace(re, '');
}

try {
  const escaped = sanitizeText(s);
  let cleaned = removeKeyObject(escaped, 'credentials');
  cleaned = removeKeyValue(cleaned, 'webhookId');
  cleaned = cleaned.replace(/,\s*(\]|\})/g, '$1');
  // validate
  JSON.parse(cleaned);
  fs.writeFileSync(out, cleaned, 'utf8');
  console.log('Sanitized and validated:', out);
} catch (e) {
  console.error('Failed to sanitize/validate JSON:', e.message);
  // write best-effort cleaned file for manual inspection
  try { fs.writeFileSync(out, cleaned || escaped || s, 'utf8'); console.log('Wrote best-effort output to', out); } catch(_){}
  process.exit(1);
}
