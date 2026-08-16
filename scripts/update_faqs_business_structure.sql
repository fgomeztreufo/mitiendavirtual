-- =============================================================
-- Script: Actualizar servicios y FAQs del negocio
-- Fecha: 2026-08-16
-- Cubre: Plans, Credit Packs, Referidos, FAQs
-- =============================================================
-- USO: Ejecutar en Supabase SQL Editor
-- =============================================================

-- user_id para FAQs: dcbbe3e4-b3d9-4359-9cea-97446e86351b

-- =============================================================
-- 0A. ACTUALIZAR TABLA PLANS (estructura actual)
-- =============================================================
-- Limpiar planes obsoletos que puedan quedar
DELETE FROM plans WHERE code IN ('basic', 'full', 'inicial', 'pyme', 'pro');

-- Upsert planes vigentes
INSERT INTO plans (code, display_name, monthly_price_clp, messages_limit, products_limit, branches_limit, duration_days, description, channels)
VALUES
  ('free', 'Gratis', 0, 100, 10, NULL, NULL,
   'Todos los canales. 100 créditos IA/mes. Ideal para probar.',
   '["instagram","telegram","whatsapp","google_calendar"]'::jsonb),
  ('emprendedor', 'Emprendedor', 19900, 1500, 100, NULL, 30,
   'Todos los canales. 1,500 créditos IA/mes.',
   '["instagram","telegram","whatsapp","google_calendar"]'::jsonb),
  ('negocio', 'Negocio', 49900, 5000, 500, NULL, 30,
   'Todos los canales. 5,000 créditos IA/mes.',
   '["instagram","telegram","whatsapp","google_calendar"]'::jsonb),
  ('escala', 'Escala', 99900, 15000, 2000, NULL, 30,
   'Todos los canales. 15,000 créditos IA/mes.',
   '["instagram","telegram","whatsapp","google_calendar"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_clp = EXCLUDED.monthly_price_clp,
  messages_limit = EXCLUDED.messages_limit,
  products_limit = EXCLUDED.products_limit,
  branches_limit = EXCLUDED.branches_limit,
  duration_days = EXCLUDED.duration_days,
  description = EXCLUDED.description,
  channels = EXCLUDED.channels;

-- Verificar planes
SELECT code, display_name, monthly_price_clp, messages_limit, products_limit FROM plans ORDER BY monthly_price_clp;

-- =============================================================
-- 0B. ACTUALIZAR TABLA CREDIT_PACKS (bolsas de recarga)
-- =============================================================
INSERT INTO credit_packs (code, display_name, credits, price_clp, sort_order, is_active)
VALUES
  ('pack_s',  'Bolsa S',  250,  6990,  1, true),
  ('pack_m',  'Bolsa M',  500,  11990, 2, true),
  ('pack_l',  'Bolsa L',  1500, 29990, 3, true),
  ('pack_xl', 'Bolsa XL', 3000, 49990, 4, true)
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  credits = EXCLUDED.credits,
  price_clp = EXCLUDED.price_clp,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Verificar credit packs
SELECT code, display_name, credits, price_clp FROM credit_packs ORDER BY sort_order;

-- =============================================================
-- 1. LIMPIAR FAQs ANTIGUAS DE ESTAS CATEGORÍAS (opcional)
-- =============================================================
-- Descomenta si quieres reemplazar las FAQs existentes de estas categorías:
--
-- DELETE FROM faqs WHERE user_id = 'dcbbe3e4-b3d9-4359-9cea-97446e86351b' AND category IN ('planes', 'bolsas', 'referidos', 'creditos', 'pagos');

-- =============================================================
-- 2. FAQs — PLANES Y CRÉDITOS
-- =============================================================
INSERT INTO faqs (user_id, question, answer, category, is_active) VALUES

-- Planes generales
('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué planes tienen disponibles?',
 'Tenemos 4 planes: Gratis ($0, 100 créditos IA, 10 productos), Emprendedor ($19.900/mes, 1.500 créditos, 100 productos), Negocio ($49.900/mes, 5.000 créditos, 500 productos) y Escala ($99.900/mes, 15.000 créditos, 2.000 productos). Todos los planes incluyen todos los canales: Instagram, Telegram, WhatsApp y Google Calendar.',
 'planes', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cuánto cuesta el plan más económico?',
 'El plan Emprendedor cuesta $19.900 al mes e incluye 1.500 créditos IA y hasta 100 productos. También tenemos un plan Gratis con 100 créditos para que pruebes la plataforma.',
 'planes', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué incluye el plan Gratis?',
 'El plan Gratis incluye 100 créditos IA al mes, hasta 10 productos en tu catálogo, y acceso a todos los canales (Instagram, Telegram, WhatsApp). Es ideal para probar la plataforma sin compromiso.',
 'planes', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué incluye el plan Emprendedor?',
 'El plan Emprendedor cuesta $19.900/mes e incluye 1.500 créditos IA, hasta 100 productos, y todos los canales. Ideal para negocios que están empezando a automatizar sus ventas.',
 'planes', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué incluye el plan Negocio?',
 'El plan Negocio cuesta $49.900/mes e incluye 5.000 créditos IA, hasta 500 productos, y todos los canales. Perfecto para negocios con volumen medio de consultas.',
 'planes', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué incluye el plan Escala?',
 'El plan Escala cuesta $99.900/mes e incluye 15.000 créditos IA, hasta 2.000 productos, y todos los canales. Diseñado para negocios con alto volumen de ventas y consultas.',
 'planes', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué son los créditos IA?',
 'Los créditos IA son la unidad que mide el uso de nuestros asistentes inteligentes. Cada vez que un cliente conversa con tu agente IA en cualquier canal (Instagram, Telegram o WhatsApp), se consumen créditos. Tu plan mensual incluye una cantidad de créditos y puedes comprar bolsas adicionales si los necesitas.',
 'creditos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué pasa si se me acaban los créditos?',
 'Si se agotan tus créditos IA mensuales, tu agente dejará de responder automáticamente hasta que se renueven el próximo mes o compres una bolsa de recarga. Puedes comprar bolsas adicionales en cualquier momento desde la sección Planes.',
 'creditos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Los créditos se acumulan de un mes a otro?',
 'Los créditos del plan mensual se renuevan cada mes y no se acumulan. Sin embargo, los créditos de bolsas de recarga sí se suman a tu saldo disponible inmediatamente.',
 'creditos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Puedo cambiar de plan?',
 'Sí, puedes cambiar de plan en cualquier momento desde la sección Planes en tu dashboard. El cambio se aplica inmediatamente.',
 'planes', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué canales están incluidos en todos los planes?',
 'Todos los planes, incluido el Gratis, tienen acceso a todos los canales: Instagram, Telegram, WhatsApp y Google Calendar. La diferencia entre planes es la cantidad de créditos IA y productos.',
 'planes', true),

-- =============================================================
-- 3. FAQs — BOLSAS DE RECARGA
-- =============================================================

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Qué son las bolsas de recarga?',
 'Las bolsas de recarga son paquetes de créditos IA adicionales que puedes comprar cuando necesites más. Hay 4 tamaños: Pack S (250 créditos por $6.990), Pack M (500 créditos por $11.990), Pack L (1.500 créditos por $29.990) y Pack XL (3.000 créditos por $49.990).',
 'bolsas', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cuánto cuesta una bolsa de recarga?',
 'Tenemos 4 opciones: Pack S con 250 créditos por $6.990, Pack M con 500 créditos por $11.990, Pack L con 1.500 créditos por $29.990, y Pack XL con 3.000 créditos por $49.990. A mayor tamaño, mejor precio por crédito.',
 'bolsas', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cómo compro una bolsa de recarga?',
 'Puedes comprar bolsas de recarga desde la sección Planes en tu dashboard. Solo selecciona el tamaño que necesites y serás redirigido a Mercado Pago para completar el pago. Los créditos se acreditan automáticamente.',
 'bolsas', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Las bolsas de recarga expiran?',
 'Los créditos de las bolsas de recarga se suman a tu saldo de créditos bonus y están disponibles inmediatamente después de la compra.',
 'bolsas', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cuál bolsa de recarga me conviene?',
 'Depende de tu volumen de consultas. Si tienes pocas consultas extra, el Pack S (250 créditos, $6.990) es suficiente. Para negocios con alto tráfico, el Pack XL (3.000 créditos, $49.990) ofrece el mejor precio por crédito.',
 'bolsas', true),

-- =============================================================
-- 4. FAQs — SISTEMA DE REFERIDOS
-- =============================================================

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Tienen programa de referidos?',
 'Sí, tenemos un programa de referidos donde ganas 150 créditos IA por cada persona que invites y se active en la plataforma. Tu referido también recibe 150 créditos de bienvenida. Puedes ganar hasta 1.500 créditos extra al mes por referidos.',
 'referidos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cómo funciona el programa de referidos?',
 'Es muy simple: comparte tu link de referido (lo encuentras en la sección Referidos de tu dashboard). Cuando alguien se registra con tu link y se activa (conecta un canal o usa 20+ créditos), ambos reciben 150 créditos IA de regalo.',
 'referidos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cuántos créditos gano por referir?',
 'Ganas 150 créditos IA por cada referido que se active. Puedes referir hasta 10 personas al mes, ganando un máximo de 1.500 créditos mensuales por referidos. Es como tener un plan Emprendedor gratis solo con referidos.',
 'referidos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cómo obtengo mi link de referido?',
 'Tu link de referido está en la sección Referidos dentro de tu dashboard. Puedes copiarlo y compartirlo por WhatsApp, redes sociales o email.',
 'referidos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cuándo recibo los créditos por referir?',
 'Los créditos se acreditan cuando tu referido se activa en la plataforma, es decir, cuando conecta un canal (Instagram, Telegram o WhatsApp) o usa más de 20 créditos IA.',
 'referidos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Hay límite de referidos?',
 'Puedes referir personas sin límite, pero el máximo de créditos que puedes ganar por referidos es de 1.500 al mes (equivalente a 10 referidos activados). El contador se reinicia cada mes.',
 'referidos', true),

-- =============================================================
-- 5. FAQs — PAGOS
-- =============================================================

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Cómo puedo pagar?',
 'Aceptamos pagos a través de Mercado Pago, que incluye tarjetas de crédito, débito y otros medios de pago disponibles en Chile.',
 'pagos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Los precios incluyen IVA?',
 'Los precios mostrados son los precios finales. El pago se procesa a través de Mercado Pago.',
 'pagos', true),

('dcbbe3e4-b3d9-4359-9cea-97446e86351b',
 '¿Puedo cancelar mi suscripción?',
 'Sí, puedes cancelar en cualquier momento. Tu plan se mantendrá activo hasta el final del período pagado.',
 'pagos', true);

-- =============================================================
-- VERIFICACIÓN
-- =============================================================
SELECT category, count(*) as total
FROM faqs
WHERE user_id = 'dcbbe3e4-b3d9-4359-9cea-97446e86351b'
  AND category IN ('planes', 'bolsas', 'referidos', 'creditos', 'pagos')
GROUP BY category
ORDER BY category;
