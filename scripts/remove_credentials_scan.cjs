#!/usr/bin/env node
const fs = require('fs');
const src = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.json';
const out = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.sanitized.json';
let s = fs.readFileSync(src,'utf8');

function removeKeyObject(text, key) {
  let idx = 0;
  while ((idx = text.indexOf('"'+key+'"', idx)) !== -1) {
    // find ':' after key
    const colon = text.indexOf(':', idx);
    if (colon === -1) break;
    // find first '{' after colon
    const brace = text.indexOf('{', colon);
    if (brace === -1) break;
    // scan to matching brace
    let depth = 0;
    let i = brace;
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    if (depth !== 0) break;
    // remove possible trailing comma after i
    let j = i;
    while (j < text.length && /[ \t\r\n]/.test(text[j])) j++;
    if (text[j] === ',') { i = j+1; }
    // remove from start of key to i
    const start = text.lastIndexOf('\n', idx) >=0 ? text.lastIndexOf('\n', idx)+1 : idx;
    text = text.slice(0, idx) + text.slice(i);
    // continue after idx
  }
  return text;
}

function removeKeyValue(text, key) {
  // remove lines like "webhookId": "...",
  const re = new RegExp('"'+key+'"\\s*:\\s*"[^"]*"\\s*,?', 'g');
  return text.replace(re, '');
}

s = removeKeyObject(s, 'credentials');
 s = removeKeyValue(s, 'webhookId');
// remove any duplicate commas like ,\n\n} -> \n}\n
s = s.replace(/,\s*(\]|\})/g, '$1');

fs.writeFileSync(out, s, 'utf8');
console.log('Wrote sanitized (scanned):', out);
