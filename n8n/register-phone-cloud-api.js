const discover = $('Discover WABA + Phone (GraphAPI)').item.json;
const accessToken = discover.access_token;
const phoneNumberId = discover.phone_number_id;
const wabaId = discover.waba_id;
const GRAPH = 'https://graph.facebook.com/v25.0';

let registerResult = null;
let subscribeResult = null;

// 1. Register the phone number with Cloud API
try {
  const regRes = await this.helpers.request({
    method: 'POST',
    url: GRAPH + '/' + phoneNumberId + '/register',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: {
      messaging_product: 'whatsapp',
      pin: '123456'
    },
    json: true
  });
  registerResult = {success: true, data: regRes};
} catch (e) {
  registerResult = {success: false, error: e.message};
}

// 2. Subscribe app to WABA webhooks
try {
  const subRes = await this.helpers.request({
    method: 'POST',
    url: GRAPH + '/' + wabaId + '/subscribed_apps',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    json: true
  });
  subscribeResult = {success: true, data: subRes};
} catch (e) {
  subscribeResult = {success: false, error: e.message};
}

return [{json: {
  phone_number_id: phoneNumberId,
  waba_id: wabaId,
  register: registerResult,
  subscribe: subscribeResult
}}];
