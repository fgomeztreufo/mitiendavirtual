# Migración n8n: Canales Abiertos + Nuevos Tiers

## Contexto

El frontend y la DB ahora usan nuevos códigos de plan:
- `free` (antes: inicial/basic/semilla) — $0, 100 créditos
- `emprendedor` — $19.900, 1.500 créditos
- `negocio` (antes: pyme/pro) — $49.900, 5.000 créditos
- `escala` (antes: full/completo) — $99.900, 15.000 créditos

**Todos los canales están abiertos para todos los planes.** Ya no se verifica acceso a canal.
**El sistema de trial fue eliminado.** `trial_plan`, `trial_ends_at`, `original_plan` son NULL.

## Cambios Requeridos en n8n

### 1. create-payment webhook
- Aceptar nuevos códigos: `emprendedor`, `negocio`, `escala`
- El plan `free` no genera pago (es gratis)
- Seguir aceptando `type: 'credit_pack'` sin cambios

### 2. notificacion-mercado-pago (callback)
- Al actualizar `profiles.plan_type`, usar los nuevos códigos
- Mapeo: si el pago fue para "Emprendedor" → `plan_type = 'emprendedor'`, etc.
- **Ya no setear** `trial_plan`, `trial_ends_at`, ni `original_plan`

### 3. Portero IG / TLG / WPP (flujos de mensajes entrantes)
- **Eliminar** cualquier check de acceso a canal (ej: "si plan no tiene whatsapp, rechazar")
- **Mantener** la verificación de créditos: llamar `effective_credit_limit(user_id)` RPC
- Si el usuario no tiene créditos, responder con mensaje de "créditos agotados"

### 4. Monthly reset cron
- Verificar que resetea `ai_credits_used` para todos los códigos nuevos
- **NO** tocar `bonus_credits` (eso no cambia)
- La función `expire_trials()` ahora es no-op — puede seguir llamándose sin efecto

### 5. Instagram auth callback
- Al crear el profile inicial, usar `plan_type = 'free'` (no `'inicial'`)
- **No setear** trial

### 6. Cualquier nodo que lea plan_type
- Actualizar condiciones: `free`, `emprendedor`, `negocio`, `escala`
- Los códigos `inicial`, `pyme`, `pro` ya no existen en la DB

## Plan de ejecución sugerido

1. Actualizar create-payment y notificacion-mercado-pago primero (bloquea pagos si no se hace)
2. Actualizar los porteros (IG/TLG/WPP) para remover channel gates
3. Actualizar monthly reset cron
4. Ejecutar migración SQL `052_open_channels_plan_restructure.sql`
5. Deploy frontend
