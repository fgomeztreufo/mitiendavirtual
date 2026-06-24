const body = $input.item.json.body || {};
const code = body.code || '';
const userId = body.user_id || '';

if (!code || !userId) {
  return [{ json: { _error: true, message: 'Faltan code o user_id en el body.' } }];
}

return [{ json: {
  _error: false,
  code: code,
  user_id: userId,
  waba_id: body.waba_id || null,
  phone_number_id: body.phone_number_id || null
} }];
