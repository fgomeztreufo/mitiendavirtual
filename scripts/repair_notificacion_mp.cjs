#!/usr/bin/env node
const fs = require('fs');
const src = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.json';
const out = '/Users/fgomezt/n8n_mitiendavirtual/n8n_mitiendavirtualcl/workflows/notificacionmercadopago.repaired.json';
let s = fs.readFileSync(src, 'utf8');

// Replace complex monthly_limit inline functions (they contain 'toLowerCase' and many parentheses)

s = s.replace(/"fieldId":\s*"monthly_limit",[\s\S]*?"fieldValue":\s*"=\{\{[\s\S]*?\}\}\"/g,
  '"fieldId": "monthly_limit",\n                "fieldValue": "={{ 50 }}"');

// Replace complex plan_type inline functions with a safer extraction from additional_info
s = s.replace(/"fieldId":\s*"plan_type",[\s\S]*?"fieldValue":\s*"=\{\{[\s\S]*?\}\}\"/g,
  '"fieldId": "plan_type",\n                "fieldValue": "={{ $(\'Consultar Estado Pago\').item.json.additional_info.items[0].title || $json.external_reference }}"');

// Also ensure no stray unescaped control chars by removing literal \r (carriage returns)
s = s.replace(/\r/g, '\\r');

try {
  JSON.parse(s);
  fs.writeFileSync(out, s, 'utf8');
  console.log('Wrote repaired JSON:', out);
} catch (e) {
  console.error('Repaired JSON still invalid:', e.message);
  fs.writeFileSync(out + '.partial', s, 'utf8');
  process.exit(1);
}
