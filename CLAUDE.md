# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SaaS de e-commerce con IA para negocios chilenos. Plataforma de automatización de ventas multicanal con agentes de IA, gestión de catálogo, CRM de leads, sistema de agendamiento, y entrenamiento RAG de bots con FAQ y productos.

**URL producción:** mitiendavirtual.cl | **Deploy:** Vercel | **Moneda:** CLP (pesos chilenos)

## Commands

```bash
npm run dev       # Dev server (localhost:5173)
npm run build     # Production build
npm run preview   # Preview production build locally
npm run e2e       # E2E tests (Playwright via tests/run_e2e_planes.cjs)
```

## Tech Stack

- **Frontend:** React 18.3 + TypeScript 5 + Vite 5 + Tailwind CSS 3
- **Routing:** React Router 7 (SPA)
- **Database:** Supabase (Auth + PostgreSQL + Storage + Realtime + RPC)
- **Firebase:** Cloud Messaging (push notifications) + Firestore (testimonials)
- **Payments:** Mercado Pago (vía webhook n8n)
- **Automation:** n8n (webhook orchestration en `webhook.mitiendavirtual.cl`)
- **Channels:** Meta Graph API v25.0 (Instagram + WhatsApp), Telegram Bot API, Google Calendar
- **UI:** Framer Motion (animaciones), SweetAlert2 (modals), Lucide React + Phosphor Icons, canvas-confetti
- **Icons:** lucide-react (excluido de Vite optimize), @phosphor-icons/react, react-icons

## Architecture

### Routing (`App.tsx`)

| Ruta | Auth | Componente | Propósito |
|------|------|-----------|-----------|
| `/` | No | IndexLanding | Landing; redirige a /dashboard si autenticado |
| `/login` | No | LoginPage | Supabase Auth UI (email + Google OAuth) |
| `/dashboard` | Sí | Dashboard | Shell principal protegido |
| `/payment-result` | No | PaymentResult | Callback Mercado Pago |
| `/privacy`, `/terms`, `/data-deletion` | No | LegalPages | Páginas legales (modal) |
| `/knowlower` | Parcial | KnowlowerView | Vista cerebro IA; acepta userId como fallback |
| `*` | - | Navigate → `/` | Catch-all 404 |

### Auth Flow

1. `supabase.auth.getSession()` al montar App.tsx
2. `onAuthStateChange` listener mantiene session state
3. Rutas protegidas redirigen a `/login` si no hay session
4. Si hay session y está en `/`, redirige a `/dashboard`
5. Logout via `supabase.auth.signOut()` en Dashboard

### Multi-tenancy

Todos los datos están scoped por `user_id` o `instance_id`. RLS enforced en todas las tablas.

### State Management

Local `useState`/`useEffect` only — no global store (no Redux/Zustand).

### Dashboard (`Dashboard.tsx`)

Renderiza vistas condicionalmente por tab activo en sidebar. Tabs disponibles según plan del usuario.

**Sidebar Navigation:**
- **Channels:** Instagram (siempre), Telegram (Basic+), WhatsApp (Pro+), Google Calendar (Full)
- **AI Training:** FAQs, Cerebro IA (KnowlowerView), Subir Producto, Inventario
- **Agent Config:** Configuración por canal (Instagram, Telegram, WhatsApp)
- **Other:** Notificaciones, Planes, Logout

**Tab → Component mapping:**
- `home` → AgentsDashboard
- `instagram` → InstagramView
- `telegram` / `telegram-leads` → TelegramView / TelegramLeadsView
- `whatsapp` / `wpp-leads` / `wpp-messages` → WhatsAppView / WhatsAppLeadsView / WhatsAppMessagesView
- `scheduling` → SchedulingView
- `faqs` → FaqsView
- `knowlower` → KnowlowerView
- `catalog` → CatalogView
- `inventory` → ProductsListView
- `notifications` → NotificationsView
- `plans` → PlansView

### Supabase Calls

Directos desde componentes con `async/await` + `try/catch`. Errores mostrados via `Swal.fire()`. Realtime subscriptions para cambios en personalidad del agente.

### Webhooks

n8n en `webhook.mitiendavirtual.cl`. Product uploads usan `FormData` al webhook, no API directa.

## Components (src/components/) — 26 archivos

| Componente | Propósito | Tablas Supabase |
|-----------|-----------|-----------------|
| AgentPersonalitySection | Config personalidad agente IA por canal | `agent_prompts`, `instance_personalities` |
| AgentsDashboard | Dashboard resumen con stats y overview | `leads`, `appointments`, `instances`, `telegram_link_tokens` |
| AgentsOfficeScene | Escena visual 3D de agentes | — |
| CatalogView | Subir productos al catálogo IA | `profiles`, `plans` + webhook n8n |
| Dashboard | Shell principal con tab navigation | `profiles`, `instances` |
| FaqsView | Subir FAQs desde archivo .txt | webhook n8n |
| FloatingWhatsAppButton | Botón flotante WhatsApp | — |
| Footer | Footer con variantes (index/login/dashboard/transparent) | — |
| GoogleAnalytics | Integración GA (G-XQ2HLS2SEQ) | — |
| Header | Header/navegación | — |
| Index | Landing page con hero, channels, planes | — |
| InstagramView | Config canal Instagram + agente | `instances`, `instance_personalities`, `plans` |
| KnowlowerView | Base de conocimiento IA (FAQs/docs) | `faqs` |
| Leads | CRM leads Instagram | `leads` (sistema='instagram') |
| LegalPages | Privacidad, Términos, Eliminación de datos | — |
| LoginPage | Auth con Supabase Auth UI | Supabase Auth |
| NotificationsView | Config notificaciones (email/push/telegram) | `user_notification_configs` |
| PaymentResult | Handler callback Mercado Pago | — |
| PlansView | Display planes y compra | `plans`, `profiles` + webhook n8n |
| ProductsListView | Inventario de productos (CRUD) | `products`, `documents`, Storage `catalog/` |
| SchedulingView | Agendamiento completo (5 sub-tabs) | `services`, `staff_members`, `staff_services`, `schedules`, `schedule_overrides`, `appointments` |
| TelegramLeadsView | CRM leads Telegram | `leads` (sistema='telegram') |
| TelegramView | Config canal Telegram (platform/own bot) | `instances`, `telegram_link_tokens`, `user_notification_configs` |
| WhatsAppLeadsView | CRM leads WhatsApp | `leads` (sistema='whatsapp') |
| WhatsAppMessagesView | Historial conversaciones WhatsApp | `whatsapp_messages`, RPC `get_whatsapp_conversations` |
| WhatsAppView | Config canal WhatsApp Business | `whatsapp_connections`, `plans` |

## API Endpoints (api/) — 13 archivos

### Webhooks de Canal

| Endpoint | Método | Auth | Propósito |
|----------|--------|------|-----------|
| `/api/telegram-webhook` | POST | `x-telegram-bot-api-secret-token` | Recibe updates Telegram Bot API. Resuelve user via tokens, forward a n8n |
| `/api/whatsapp-webhook` | GET/POST | `x-whatsapp-webhook-secret` | GET: verificación Meta. POST: forward mensajes a n8n |

### Gestión de Conexiones

| Endpoint | Método | Auth | Propósito |
|----------|--------|------|-----------|
| `/api/telegram-link-start` | POST | Bearer token | Inicia linking bot plataforma via n8n |
| `/api/telegram-own-bot` | POST/DELETE | Bearer token | POST: conecta bot propio (valida, encrypta, registra webhook). DELETE: desconecta |
| `/api/telegram-deactivate` | POST | Bearer token | Desactiva linkage Telegram sin borrar historial |
| `/api/whatsapp-link-start` | GET/POST | Bearer token | GET: estado conexión. POST: inicia embedded signup |
| `/api/whatsapp-disconnect` | POST | Bearer token | Desregistra phone de Meta API, borra de DB |
| `/api/whatsapp-discover` | GET | Optional Bearer | Proxy a n8n discovery workflow |
| `/api/whatsapp-meta-numbers` | GET | Bearer (Meta token) | Consulta directa Graph API v25.0 para WABAs y phone numbers |

### Integraciones

| Endpoint | Método | Auth | Propósito |
|----------|--------|------|-----------|
| `/api/google-calendar` | GET/POST/DELETE | Bearer token / GCAL_SYNC_SECRET | OAuth flow, list calendars, assign staff, sync busy blocks, create events |
| `/api/send-push-notification` | POST | `x-push-secret` o Bearer | Envía push notifications via Firebase Admin |

### Librería Compartida (api/_lib/)

- **`push-sender.js`**: `sendPushToUser(userId, {title, body, data})` — obtiene FCM tokens de `user_notification_configs`, envía via Firebase Admin, limpia tokens inválidos
- **`google-tokens.js`**: Gestión OAuth tokens Google (store/decrypt/refresh/verify), CORS helpers, Supabase REST wrapper

## Database Schema

### Tablas Principales

| Tabla | Propósito | Columnas Clave |
|-------|-----------|---------------|
| `profiles` | Perfil usuario y plan | `plan_type`, `messages_used`, `messages_used_tl`, `messages_used_wpp`, `current_products`, `trial_plan`, `trial_ends_at`, `original_plan` |
| `plans` | Definición de planes | `code` (PK), `display_name`, `monthly_price_clp`, `products_limit`, `messages_limit` |
| `instances` | Conexión Instagram | `user_id`, `provider_id`, `access_token`, `channels` (JSONB) |
| `instance_personalities` | Personalidad agente (legacy) | `instance_id`, `ai_name`, `tone`, `greeting`, `business_rules` |
| `agent_prompts` | Prompts IA por canal | `instance_id`, `channel`, `system_prompt`, `personality_config` (JSONB), `tools_enabled`, `is_active` |
| `integration_credentials` | Credenciales encriptadas | `user_id`, `instance_id`, `provider`, `credential_type`, `credential_value` (bytea pgp_sym_encrypt) |
| `products` | Catálogo productos | `user_id`, `name`, `price`, `description`, `brand`, `category`, `image_url` |
| `documents` | RAG embeddings | `original_id_saas` (product id), indexado para similarity search |
| `leads` | Pipeline CRM | `user_id`, `sistema` (instagram\|telegram\|whatsapp), `status` (nuevo\|cotizando\|completado) |
| `faqs` | Base conocimiento | `user_id`, `question`, `answer`, `category`, `is_active` |

### Tablas de Canal

| Tabla | Propósito | Columnas Clave |
|-------|-----------|---------------|
| `telegram_link_tokens` | Tokens conexión Telegram | `token` (unique), `user_id`, `chat_id`, `telegram_username`, `used`, `expires_at` (10 min) |
| `whatsapp_connections` | Cuentas WhatsApp Business | `phone_number_id` (unique, routing key), `waba_id`, `display_phone_number`, `access_token`, `active` |
| `whatsapp_messages` | Historial mensajes WPP | `user_id`, `contact_phone`, `direction` (inbound\|outbound), `body`, `media_url`, `wamid` |

### Tablas de Notificaciones

| Tabla | Propósito | Columnas Clave |
|-------|-----------|---------------|
| `user_notification_configs` | Config notificaciones | `user_id`, `channel_type` (email\|push\|telegram), `is_active`, `config` (JSONB con devices[]) |

### Tablas de Agendamiento (Full plan)

| Tabla | Propósito | Columnas Clave |
|-------|-----------|---------------|
| `services` | Servicios agendables | `user_id`, `name`, `duration_minutes`, `price`, `buffer_minutes`, `is_active` |
| `staff_members` | Personal | `user_id`, `name`, `role`, `email`, `phone`, `google_calendar_id`, `is_active` |
| `staff_services` | Junction staff↔services | `staff_id`, `service_id` (unique pair) |
| `schedules` | Horarios semanales | `staff_id`, `day_of_week` (0-6), `start_time`, `end_time`, `is_active` |
| `schedule_overrides` | Excepciones/bloqueos | `staff_id`, `override_date`, `is_available`, `start_time`, `end_time`, `reason` |
| `appointments` | Citas agendadas | `user_id`, `staff_id`, `service_id`, `client_name`, `client_phone`, `starts_at`, `ends_at`, `status`, `source`, `google_event_id` |

### RPC Functions

| Función | Propósito |
|---------|-----------|
| `store_integration_credential()` | Encripta y almacena credenciales (pgp_sym_encrypt) |
| `get_decrypted_credential()` | Desencripta credenciales (solo server-side) |
| `upsert_instance_channel()` | Merge channel config en instances.channels JSONB |
| `get_available_slots()` | Calcula slots disponibles considerando schedules, overrides, appointments, buffers |
| `get_whatsapp_conversations()` | Agrupa mensajes WPP por contacto |
| `increment_messages_wpp_rpc()` | Incrementa contador messages_used_wpp |
| `expire_trials()` | Revierte plan_type a original_plan cuando trial expira |
| `purge_old_whatsapp_messages()` | Elimina mensajes WPP > 90 días |

### DB Migrations (db/) — 31 archivos

Secuencialmente numerados `001_` a `028c_`. Continuar la secuencia al agregar nuevas migraciones.

## Plan System

### Tiers y Límites

| Plan | Código | Precio CLP/mes | Productos | Mensajes/mes | Canales |
|------|--------|----------------|-----------|-------------|---------|
| Semilla | `free` | $0 | 10 | 50 | Instagram |
| Básico | `basic` | $14,990 | 50 | 500 | Instagram + Telegram |
| Pro | `pro` | $44,990 | 500 | Ilimitados* | Instagram + Telegram + WhatsApp |
| Full | `full` | $79,990 | 2,000 | Ilimitados* | Todos + Google Calendar + Agendamiento |

### Plan Normalization (`planUtils.ts`)

Sanitiza input (remueve acentos, lowercase) y mapea variantes:
- free/semilla → `'free'`
- básico/basico/emprendedor → `'basic'`
- pro/crecimiento/empresario → `'pro'`
- full/completo → `'full'`

### Permission Matrix

```
free:  ['email', 'push']
basic: ['email', 'telegram', 'push']
pro:   ['email', 'telegram', 'push']
full:  ['email', 'telegram', 'push', 'scheduling']
```

### Trial System

- `profiles.trial_plan`: plan temporal
- `profiles.trial_ends_at`: expiración
- `profiles.original_plan`: plan original para revertir
- `isInTrial(profile)`: verifica si trial está activo
- `trialDaysLeft(profile)`: días restantes
- `expire_trials()` RPC: ejecutado por cron n8n, revierte automáticamente

### Pool de Mensajes

Todos los canales (Instagram, Telegram, WhatsApp) comparten un pool de mensajes por plan. Contadores separados: `messages_used` (Instagram), `messages_used_tl` (Telegram), `messages_used_wpp` (WhatsApp).

## Integration Flows

### Instagram

1. Login via Meta OAuth (scope: `instagram_basic, instagram_manage_messages, pages_manage_metadata, pages_read_engagement, pages_show_list, business_management, instagram_manage_comments, pages_messaging`)
2. Callback a `webhook.mitiendavirtual.cl/webhook/instagram-auth`
3. Almacena `provider_id` en `instances`
4. Mensajes procesados por n8n
5. Disconnect via `webhook.mitiendavirtual.cl/webhook/instagram-unsuscribed`

### WhatsApp

1. Facebook SDK v25.0 embedded signup en WhatsAppView
2. Exchange auth code → session tokens
3. `/api/whatsapp-link-start` POST → proxy a n8n
4. Almacena en `whatsapp_connections`
5. Mensajes entrantes via `/api/whatsapp-webhook` → forward a n8n
6. Mensajes loggeados en `whatsapp_messages`
7. Disconnect via `/api/whatsapp-disconnect` (deregistra de Meta API)

### Telegram (Platform Bot)

1. `/api/telegram-link-start` POST → crea token temporal (10 min)
2. Genera deep-link `/start` con token
3. Usuario abre en Telegram, trigger `/start`
4. `/api/telegram-webhook` resuelve user_id desde token
5. Token marcado `used=true`
6. Forward a n8n para automatización

### Telegram (Own Bot — Pro/Full)

1. Usuario ingresa bot token en `/api/telegram-own-bot` POST
2. Valida via Telegram getMe API
3. Encripta con pgp_sym_encrypt, almacena en `integration_credentials`
4. Registra webhook con `secret_token = instance_id`
5. Actualiza `instances.channels.telegram` con `bot_type='own'`
6. Desactiva platform link tokens (exclusividad)

### Google Calendar (Full plan)

1. OAuth en `/api/google-calendar?action=auth` POST → redirect a Google
2. Callback intercambia code por tokens, almacena encriptados
3. List calendars: `?action=list`
4. Assign calendar a staff: `?action=assign`
5. Sync cron (n8n): `?action=sync` — freeBusy API 14 días → `schedule_overrides`
6. Create events: `?action=event` — sync citas a Google Calendar
7. Push notification después de crear evento

### Payment (Mercado Pago)

1. PlansView → POST `webhook.mitiendavirtual.cl/webhook/create-payment` con `{plan_name, plan_code, amount, user_id, email}`
2. Webhook retorna `{init_point}` (URL checkout Mercado Pago)
3. Redirect a Mercado Pago
4. Callback a `/payment-result?status={approved|rejected|in_process}`
5. PaymentResult muestra UI según status (confetti en success)

### Push Notifications (Firebase)

1. `usePushNotifications` hook registra service worker, obtiene FCM token
2. Almacena device en `user_notification_configs.config.devices[]`
3. Server/n8n llama `/api/send-push-notification`
4. `push-sender.js` envía via Firebase Admin multicast
5. Limpia tokens inválidos de DB

## Webhook Summary

### External (Client → n8n)

| URL | Propósito |
|-----|-----------|
| `webhook.mitiendavirtual.cl/webhook/subir-productos` | Upload producto (FormData) |
| `webhook.mitiendavirtual.cl/webhook/carga-faqs` | Upload FAQs (.txt) |
| `webhook.mitiendavirtual.cl/webhook/instagram-auth` | OAuth callback Instagram |
| `webhook.mitiendavirtual.cl/webhook/instagram-unsuscribed` | Disconnect Instagram |
| `webhook.mitiendavirtual.cl/webhook/create-payment` | Crear link pago Mercado Pago |

### Internal (Client → Vercel API)

| Endpoint | Propósito |
|----------|-----------|
| `/api/whatsapp-link-start` | Iniciar conexión WhatsApp |
| `/api/whatsapp-disconnect` | Desconectar WhatsApp |
| `/api/whatsapp-discover` | Proxy discovery n8n |
| `/api/whatsapp-meta-numbers` | Consulta directa Meta Graph API |
| `/api/telegram-link-start` | Iniciar linking bot plataforma |
| `/api/telegram-own-bot` | Gestionar bot propio |
| `/api/telegram-deactivate` | Desactivar linkage |
| `/api/google-calendar` | OAuth + sync + events |
| `/api/send-push-notification` | Enviar push notification |

## Security

### Row-Level Security (RLS)

Todas las tablas tienen RLS habilitado:
- Patrón estándar: `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE
- `auth.role() = 'service_role'` para acceso backend/n8n
- Políticas complejas para junction tables (verifican owner del recurso padre)

### Encryption

- `integration_credentials`: encriptadas con `pgp_sym_encrypt` usando `SUPABASE_ENCRYPT_KEY`
- Nunca se pasan al client; solo desencriptadas server-side via RPC

### Input Sanitization (`sanitizeInstructions.ts`)

1. Remueve code blocks (``` ```)
2. Remueve backticks inline
3. Strip `<script>` tags
4. Remueve todos los HTML tags
5. Reemplaza keywords peligrosos: `curl`, `wget`, `eval`, `exec`, `import`, `require`, `os.`, `subprocess`, `ssh`, `scp`, `rm -rf`, `sudo`, `nc`, `netcat`, `bash`, `sh`, `python`
6. Colapsa whitespace excesivo
7. Limita a 2000 caracteres

`looksMalicious()`: detecta patrones de prompt injection (`eval(`, `exec(`, `system(`, `curl http`, `base64 -d`, etc.)

### Agent Prompt Sanitization (DB trigger)

Trigger `sanitize_agent_prompt` en `agent_prompts`: remueve code blocks, scripts, limita a 4000 chars.

### CORS

API endpoints permiten: `localhost:5173`, `mitiendavirtual.cl`, `www.mitiendavirtual.cl`

## Agent Personality Configuration

### Storage

- **Primary:** `agent_prompts` tabla (`personality_config` JSONB)
- **Fallback:** `instance_personalities` tabla (legacy)

### Config Structure

```typescript
{
  ai_name: string,
  tone: 'amigable' | 'formal' | 'casual' | 'profesional',
  greeting: string,
  business_rules: string
}
```

### System Prompt Template

```
Te llamas {ai_name}.
Eres un asistente virtual de ventas con tono {tone} para el canal {channel}.
Cuando un cliente te escriba por primera vez, salúdalo así: "{greeting}"
Reglas de negocio que debes seguir siempre:
{business_rules}
```

Realtime subscription para cambios inmediatos en personalidad del agente.

## Config Files

- **`src/config/siteConfig.ts`**: Company info, planes web (Basic/Medium/Advanced), planes automation (Starter/Crecimiento/Escala), GA ID (G-XQ2HLS2SEQ), feature toggles (`showOffers`, `showClientsSection`)
- **`src/config/firebase.ts`**: Firebase client init (Firestore + Cloud Messaging)
- **`src/hooks/usePushNotifications.ts`**: Hook para FCM — subscribe/unsubscribe, gestión de devices, foreground notifications
- **`src/supabaseClient.ts`**: Singleton Supabase client

## Code Style

- Components: PascalCase (`InstagramView.tsx`). Functions/hooks: camelCase.
- Footer tiene variantes de contexto: `index`, `login`, `dashboard`, `transparent`.
- Telegram auth soporta `Authorization: Bearer <access_token>` desde UI o `TLG_SHARED_SECRET` desde runners confiables.
- FAQs format: `Question | Answer` por línea (pipe-separated) en archivo .txt.

## Design System

- **Colors:** `customDark (#121212)`, `customGold (#D4AF37)`, `customLightGray (#F5F5F5)`. Scales: primary, success, warning, error (50-900)
- **Fonts:** Inter (body/sans), Playfair Display (headings/serif)
- **Classes:** `.btn-primary`, `.btn-secondary`, `.card`, `.section-padding`
- **Animations:** fade-in-up, bounce-slow, pulse-slow (custom Tailwind)
- **Responsive:** Mobile-first
- **Chunk limit:** 1000 KB warning (Vite config)
- **Build target:** ES2020+

## Environment Variables

### Frontend (VITE_*)

| Variable | Requerida | Propósito |
|----------|-----------|-----------|
| `VITE_SUPABASE_URL` | Sí | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Sí | Supabase anonymous key |
| `VITE_FIREBASE_API_KEY` | No | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | No | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | No | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | No | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | No | Firebase app ID |
| `VITE_FIREBASE_VAPID_KEY` | No | Firebase push VAPID key |
| `VITE_TELEGRAM_BOT_USERNAME` | No | Telegram bot username |

### Backend (Vercel Serverless)

| Variable | Propósito |
|----------|-----------|
| `SUPABASE_URL` | Supabase URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key para bypass RLS |
| `SUPABASE_ANON_KEY` | Anon key (server-side) |
| `SUPABASE_ENCRYPT_KEY` | Key para pgp_sym_encrypt/decrypt |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin credentials |
| `WHATSAPP_WEBHOOK_SECRET` | Secret para verificar webhooks WPP |
| `N8N_WEBHOOK_URL` | n8n webhook base URL |
| `N8N_WPP_INBOUND_URL` | n8n WhatsApp inbound URL |
| `N8N_WPP_LINK_START_URL` | n8n WPP link start URL |
| `N8N_WPP_DISCOVER_URL` | n8n WPP discover URL |
| `N8N_WPP_STATUS_URL` | n8n WPP status URL |
| `N8N_LINK_START_URL` | n8n Telegram link start URL |
| `TELEGRAM_WEBHOOK_SECRET` | Secret webhooks Telegram |
| `OWN_BOT_WEBHOOK_URL` | URL para registrar webhooks de bots propios |
| `PUSH_WEBHOOK_SECRET` | Secret para push notifications |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI |
| `GCAL_SYNC_SECRET` | Secret para sync cron Google Calendar |
| `SITE_URL` | URL del sitio |

## Directory Structure

```
mitiendavirtual/
├── api/                    # Vercel serverless functions (13 endpoints)
│   └── _lib/               # Shared libs (push-sender, google-tokens)
├── db/                     # SQL migrations (001_ a 028c_)
├── public/                 # Static assets (images, service worker)
├── scripts/                # One-off Node utilities (11 scripts)
├── src/
│   ├── components/         # React components (26 archivos)
│   ├── config/             # siteConfig.ts, firebase.ts
│   ├── hooks/              # usePushNotifications.ts
│   ├── utils/              # planUtils.ts, sanitizeInstructions.ts
│   ├── App.tsx             # Router + auth listener
│   ├── main.tsx            # React entry point
│   ├── supabaseClient.ts   # Supabase singleton
│   └── index.css           # Global styles
├── tests/                  # E2E tests (Playwright)
├── postman/                # API test collections
├── n8n/                    # Exported workflow JSONs (branch remotes/origin/n8n)
└── vercel.json             # SPA rewrites config
```

## Scripts (scripts/) — 11 archivos

| Script | Propósito |
|--------|-----------|
| `run_migration_node.js` | Ejecutar migraciones DB via Node |
| `run_migrations.sh` | Shell script para migraciones |
| `normalize_profiles_plan_type.js` | Normalizar plan_type en profiles |
| `sanitize_n8n_workflows.cjs` | Sanitizar exports n8n (CommonJS) |
| `sanitize_n8n_workflows.js` | Sanitizar exports n8n (ES module) |
| `sanitize_n8n_workflows_text.cjs` | Sanitización text-based n8n |
| `fix_json_control_chars.cjs` | Fix caracteres de control en JSON |
| `escape_then_remove.cjs` | Utilidad de escape y remoción |
| `generate_sanitized_single.cjs` | Generar output sanitizado |
| `remove_credentials_scan.cjs` | Escanear y remover credenciales |
| `repair_notificacion_mp.cjs` | Reparar notificaciones Mercado Pago |

## Git Branches

- `main` — producción actual
- `dashboar_agentico` — dashboard agéntico
- `mejoras-visuales` — mejoras UI
- `mejoras_impacto` — mejoras de impacto
- `telegram` — feature Telegram
- `n8n` (remote) — workflow definitions

## Vercel Config

SPA rewrites: todas las rutas no-API y no-asset reescritas a `/index.html`.

## Legal

Must comply with Chilean data protection law (Ley 19.628).
