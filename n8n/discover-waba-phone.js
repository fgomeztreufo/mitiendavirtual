const resp = $input.item.json;
const accessToken = resp.access_token || '';
const body = $('Extraer code + user_id').item.json;
const userId = body.user_id;

if (!accessToken) {
  return [{json: {_error: true, message: 'Meta no devolvio access_token.'}}];
}

const GRAPH = 'https://graph.facebook.com/v25.0';

// Si el frontend envio waba_id y phone_number_id (Embedded Signup v4),
// usarlos directamente sin necesidad de descubrir via API
const bodyWabaId = body.waba_id || null;
const bodyPhoneId = body.phone_number_id || null;

if (bodyWabaId && bodyPhoneId) {
  // Obtener display_phone_number del phone_number_id
  let displayPhone = '';
  let verifiedName = '';
  try {
    const p = await this.helpers.request({
      method: 'GET',
      url: GRAPH + '/' + bodyPhoneId,
      qs: {
        fields: 'display_phone_number,verified_name,quality_rating',
        access_token: accessToken
      },
      json: true
    });
    displayPhone = p.display_phone_number || '';
    verifiedName = p.verified_name || '';
  } catch (e) {}

  return [{json: {
    _error: false,
    user_id: userId,
    access_token: accessToken,
    waba_id: bodyWabaId,
    waba_name: verifiedName,
    phone_number_id: bodyPhoneId,
    display_phone_number: displayPhone,
    verified_name: verifiedName
  }}];
}

// Fallback: intentar descubrir WABAs via Graph API
let wabas = [];

try {
  const bizRes = await this.helpers.request({
    method: 'GET',
    url: GRAPH + '/me/businesses',
    qs: {access_token: accessToken},
    json: true
  });
  const businesses = bizRes.data || [];
  for (const biz of businesses) {
    try {
      const o = await this.helpers.request({
        method: 'GET',
        url: GRAPH + '/' + biz.id + '/owned_whatsapp_business_accounts',
        qs: {fields: 'id,name', access_token: accessToken},
        json: true
      });
      if (o && o.data) {
        wabas.push(...o.data);
      }
    } catch (e) {}
  }
} catch (e) {}

if (wabas.length === 0) {
  try {
    const w = await this.helpers.request({
      method: 'GET',
      url: GRAPH + '/me/whatsapp_business_accounts',
      qs: {fields: 'id,name', access_token: accessToken},
      json: true
    });
    if (w && w.data) {
      wabas = w.data;
    }
  } catch (e) {}
}

if (wabas.length === 0) {
  return [{json: {_error: true, message: 'No se encontraron WABAs. El frontend no envio waba_id/phone_number_id.'}}];
}

const waba = wabas[0];
let phones = [];
try {
  const p = await this.helpers.request({
    method: 'GET',
    url: GRAPH + '/' + waba.id + '/phone_numbers',
    qs: {fields: 'id,display_phone_number,verified_name,quality_rating', access_token: accessToken},
    json: true
  });
  if (p && p.data) {
    phones = p.data;
  }
} catch (e) {}

if (phones.length === 0) {
  return [{json: {_error: true, message: 'WABA encontrada pero sin numeros.'}}];
}

const phone = phones[0];
return [{json: {
  _error: false,
  user_id: userId,
  access_token: accessToken,
  waba_id: waba.id,
  waba_name: waba.name || '',
  phone_number_id: phone.id,
  display_phone_number: phone.display_phone_number || '',
  verified_name: phone.verified_name || ''
}}];
