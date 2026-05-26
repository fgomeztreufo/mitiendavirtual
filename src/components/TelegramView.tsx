import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { normalizePlanType } from '../utils/planUtils'
import { Session } from '@supabase/supabase-js'

interface TelegramViewProps {
  session: Session
  profile: any
  instance: any
  onUpdate?: () => void
  goToPlans?: () => void
}

interface OwnBotInfo {
  bot_type: 'own' | 'platform'
  bot_username?: string
  bot_id?: string
  connected_at?: string
}

export default function TelegramView({ session, profile, instance, onUpdate, goToPlans }: TelegramViewProps) {
  const API_BASE = '/api';
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [savingToken, setSavingToken] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [botToken, setBotToken] = useState('')
  const [ownBotInfo, setOwnBotInfo] = useState<OwnBotInfo | null>(null)

  // Deep-link for platform bot (used in Basic plan to avoid asking store name)
  const [platformDeepLink, setPlatformDeepLink] = useState<string | null>(null)
  const [platformLinkLoading, setPlatformLinkLoading] = useState(false)

  const planCode = normalizePlanType(profile?.plan_type)
  const [planMessagesLimit, setPlanMessagesLimit] = useState<number | null>(null)

  const [botChoice, setBotChoice] = useState<'platform' | 'own'>('platform')
  const [tokenConnected, setTokenConnected] = useState(false)
  const [lastTokenRow, setLastTokenRow] = useState<any | null>(null)
  const [disconnectingToken, setDisconnectingToken] = useState(false)

  useEffect(() => {
    if (session?.user?.id) fetchConfigs()
  }, [session?.user?.id])

  useEffect(() => {
    let mounted = true
    async function loadPlanLimit() {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('messages_limit')
          .eq('code', planCode)
          .single()
        if (!error && mounted) setPlanMessagesLimit(data?.messages_limit ?? null)
      } catch (_) { /* silent */ }
    }
    if (planCode) loadPlanLimit()
    return () => { mounted = false }
  }, [planCode])

  // Load own bot info from instance.channels.telegram
  useEffect(() => {
    if (instance?.channels?.telegram) {
      const tg = instance.channels.telegram
      setOwnBotInfo(tg)
      if (tg.bot_type === 'own') setBotChoice('own')
    }
  }, [instance])

  // Helper to obtain a valid access token: prefer prop, fallback to supabase client session
  async function getAccessToken(): Promise<string> {
    const propToken = (session as any)?.access_token || (session as any)?.accessToken || ''
    if (propToken) return propToken
    try {
      // supabase-js v2: auth.getSession()
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { data } = await supabase.auth.getSession()
      return data?.session?.access_token || data?.session?.accessToken || ''
    } catch (e) {
      return ''
    }
  }

  // Downgrade protection: allow own bots for Basic/Pro/Full, auto-disconnect otherwise
  useEffect(() => {
    if (
      ownBotInfo?.bot_type === 'own' &&
      ownBotInfo?.bot_username &&
      !['basic', 'pro', 'full'].includes(planCode)
    ) {
      // Show alert and auto-disconnect
      Swal.fire({
        title: 'Bot propio desconectado',
        html: `<p>Tu plan actual (<b>${planCode === 'free' ? 'Semilla' : 'Básico'}</b>) no incluye bot propio.</p><p>Tu bot <b>@${ownBotInfo.bot_username}</b> ha sido desconectado automáticamente.</p><p>Para volver a usarlo, actualiza tu plan.</p>`,
        icon: 'warning',
        confirmButtonText: 'Ver planes',
        showCancelButton: true,
        cancelButtonText: 'Entendido'
      }).then((result) => {
        if (result.isConfirmed) goToPlans?.()
      })

      // Fire disconnect in background
      const accessToken = (session as any)?.access_token || (session as any)?.accessToken || ''
      if (accessToken) {
        fetch(`${API_BASE}/telegram-own-bot`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ instance_id: instance?.id })
        }).then(() => {
          setOwnBotInfo({ bot_type: 'platform' })
          setBotChoice('platform')
          if (onUpdate) onUpdate()
        }).catch((err) => console.error('Auto-disconnect failed', err))
      }
    }
  }, [ownBotInfo, planCode])

  async function fetchConfigs() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_notification_configs')
        .select('*')
        .eq('user_id', session.user.id)

      if (error) throw error
      setConfigs(data || [])

      // También comprobamos la tabla telegram_link_tokens para determinar
      // si el usuario ya está "conectado" según la regla: existe una
      // fila con user_id, used = true y telegram_username = 'admin'.
      // NOTE: used=true es la fuente de verdad para actividad; no eliminamos
      // registros por política comercial.
      try {
        const { data: tkData, error: tkErr } = await supabase
          .from('telegram_link_tokens')
          .select('id, token, chat_id, telegram_username, used, created_at')
          .eq('user_id', session.user.id)
          .eq('telegram_username', 'admin')
          .eq('used', true)
          .order('created_at', { ascending: false })
          .limit(1)

        if (!tkErr && tkData && tkData.length > 0) {
          setTokenConnected(true)
          setLastTokenRow(tkData[0])
        } else {
          setTokenConnected(false)
          setLastTokenRow(null)
        }
      } catch (e) {
        console.error('Error checking telegram_link_tokens', e)
        setTokenConnected(false)
        setLastTokenRow(null)
      }
    } catch (err) {
      console.error('Error fetching configs:', err)
      setTokenConnected(false)
      setLastTokenRow(null)
    } finally {
      setLoading(false)
    }
  }

  // Start a link flow: generate a start token + show modal + poll for token use
  async function startTelegramLink() {
    if (!session?.user?.id) return
    const accessToken = await getAccessToken()
    if (!accessToken) return Swal.fire('Error', 'Sesión no válida. Vuelve a iniciar sesión.', 'error')

    try {
      setLinking(true)
      const res = await fetch(`${API_BASE}/telegram-link-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ user_id: session.user.id })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 403) {
          // The backend blocks link-start when an own-bot is active. Offer to
          // disconnect the own-bot so the user can use the shared bot instead.
          const resp = await Swal.fire({
            title: 'Bot propio activo',
            html: `Esta tienda tiene un bot propio activo; no puedes vincular con el bot compartido.<br/><br/>¿Deseas desconectar el bot propio para usar el bot compartido?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Desconectar bot propio',
            cancelButtonText: 'Cancelar'
          })
          if (resp.isConfirmed) {
            // Disconnect without asking again, then retry the link-start
            await disconnectOwnBot(true)
            // Small delay to allow DB/webhook to settle before retrying
            await new Promise(r => setTimeout(r, 800))
            return startTelegramLink()
          }
          return
        }
        Swal.fire('Error', json.message || 'No se pudo generar el enlace.', 'error')
        return
      }

      const deepLink = json.url
      const linkToken = json.token

      Swal.fire({
        title: 'Vincular Telegram',
        html: `
          <div class="p-2 text-center">
            <p class="text-sm text-gray-400 mb-4">Toca el botón para abrir Telegram y vincula tu cuenta con nuestro bot.</p>
            <a href="${deepLink}" target="_blank" rel="noopener noreferrer"
              class="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-colors"
              style="text-decoration:none;color:white;background:#2AABEE;border-radius:12px;padding:12px 24px;display:inline-block;">
              📱 Abrir en Telegram
            </a>
            <p class="text-xs text-gray-500 mt-4" id="tg-status">Esperando confirmación...</p>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        didOpen: () => {
          let attempts = 0
          const maxAttempts = 100
          const interval = setInterval(async () => {
            attempts++
            try {
              const { data } = await supabase
                .from('telegram_link_tokens')
                .select('used, chat_id')
                .eq('token', linkToken)
                .single()

              if (data?.used && data?.chat_id) {
                clearInterval(interval)
                fetchConfigs()
                Swal.fire('¡Éxito!', '✅ Telegram vinculado correctamente.', 'success')
                return
              }
              const el = document.getElementById('tg-status')
              if (el) el.textContent = `Esperando confirmación... (${attempts * 3}s)`
            } catch { /* ignore */ }

            if (attempts >= maxAttempts) {
              clearInterval(interval)
              const el = document.getElementById('tg-status')
              if (el) el.textContent = '⏱ Tiempo agotado. Intenta de nuevo.'
            }
          }, 3000)

          (window as any)._tgPollInterval = interval
        },
        willClose: () => {
          clearInterval((window as any)._tgPollInterval)
          delete (window as any)._tgPollInterval
        }
      })
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Ocurrió un error al generar el enlace.', 'error')
    } finally {
      setLinking(false)
    }
  }

  // Generate a deep-link for the shared platform bot that includes the start token.
  async function generatePlatformDeepLink(force = false) {
    if (!session?.user?.id) return
    if (!force && platformDeepLink) return
    const accessToken = await getAccessToken()
    if (!accessToken) return

    try {
      setPlatformLinkLoading(true)
      const res = await fetch(`${API_BASE}/telegram-link-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ user_id: session.user.id })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.url) {
        setPlatformDeepLink(json.url)
      } else {
        console.error('No se pudo generar deep-link', json)
      }
    } catch (err) {
      console.error('Error generando deep-link', err)
    } finally {
      setPlatformLinkLoading(false)
    }
  }

  // Auto-generate the platform deep-link when a Basic user opens this view
  useEffect(() => {
    if (planCode === 'basic' && session?.user?.id) {
      void generatePlatformDeepLink()
    }
  }, [planCode, session?.user?.id])

  // Bind the platform bot to this store: generate deep-link and copy it
  async function bindPlatformBot() {
    await generatePlatformDeepLink(true)
    if (platformDeepLink) {
      try {
        await navigator.clipboard.writeText(platformDeepLink)
        Swal.fire('Vinculado', 'Enlace generado y copiado al portapapeles.', 'success')
      } catch (err) {
        Swal.fire('Vinculado', 'Enlace generado.', 'success')
      }
    } else {
      Swal.fire('Error', 'No se pudo generar el enlace. Intenta nuevamente.', 'error')
    }
  }

  async function saveBotToken() {
    if (!botToken) return Swal.fire('Error', 'Ingresa el token del bot.', 'warning')
    const accessToken = await getAccessToken()
    if (!accessToken) return Swal.fire('Error', 'Sesión no válida. Vuelve a iniciar sesión.', 'error')

    try {
      setSavingToken(true)
      const res = await fetch(`${API_BASE}/telegram-own-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ bot_token: botToken, instance_id: instance?.id })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        Swal.fire('Error', json.message || 'No se pudo guardar el token.', 'error')
        return
      }
      Swal.fire('¡Bot conectado!', `Tu bot @${json.bot_username} está activo y listo para recibir mensajes.`, 'success')
      setBotToken('')
      setOwnBotInfo({ bot_type: 'own', bot_username: json.bot_username, bot_id: json.bot_id, connected_at: new Date().toISOString() })
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Ocurrió un error al guardar el token.', 'error')
    } finally {
      setSavingToken(false)
    }
  }

  async function disconnectOwnBot(skipConfirm = false) {
    const accessToken = await getAccessToken()
    if (!accessToken) return Swal.fire('Error', 'Sesión no válida.', 'error')

    if (!skipConfirm) {
      const confirm = await Swal.fire({
        title: '¿Desconectar bot propio?',
        text: 'Tu bot dejará de recibir mensajes. Se usará el bot de MiTiendaVirtual como respaldo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Desconectar',
        cancelButtonText: 'Cancelar'
      })
      if (!confirm.isConfirmed) return
    }

    try {
      setDisconnecting(true)
      const res = await fetch(`${API_BASE}/telegram-own-bot`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ instance_id: instance?.id })
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        Swal.fire('Error', json.message || 'No se pudo desconectar.', 'error')
        return
      }
      Swal.fire('Desconectado', 'Bot propio desconectado. Se usará el bot de plataforma.', 'success')
      setOwnBotInfo({ bot_type: 'platform' })
      setBotChoice('platform')
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Error al desconectar el bot.', 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  async function disconnectLinkToken() {
    const confirm = await Swal.fire({
      title: '¿Desconectar Telegram?',
      text: 'La vinculación se eliminará y no recibirás más mensajes en este canal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Desconectar',
      cancelButtonText: 'Cancelar'
    })
    if (!confirm.isConfirmed) return

      try {
        setDisconnectingToken(true)

        // Llamamos al endpoint que marca telegram_link_tokens.used = false
        // para todos los tokens del usuario (incluyendo admin).
        const accessToken = await getAccessToken()
        try {
          const res = await fetch(`${API_BASE}/telegram-deactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ chat_id: telegramConfig?.telegram_chat_id || null })
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            console.error('telegram-deactivate failed', json)
            Swal.fire('Error', json.message || 'No se pudo desvincular Telegram.', 'error')
            return
          }
        } catch (e) {
          console.error('Error calling telegram-deactivate', e)
          Swal.fire('Error', 'Error al comunicarse con el servidor.', 'error')
          return
        }

        // Refrescar configuración local
        await fetchConfigs()
        Swal.fire('Desconectado', 'Telegram ha sido desactivado para este canal. Los registros de vinculación se conservaron para análisis.', 'success')
        setOwnBotInfo({ bot_type: 'platform' })
        setBotChoice('platform')
        if (onUpdate) onUpdate()
      } catch (err) {
        console.error(err)
        Swal.fire('Error', 'Error al desactivar Telegram.', 'error')
      } finally {
        setDisconnectingToken(false)
      }
  }

  const telegramConfig = configs.find(c => c.channel_type === 'telegram')

  // ── Créditos ────────────────────────────────────────────────
  const messagesUsedTl = profile?.messages_used_tl ?? 0
  const messagesLimit: number | null = planMessagesLimit
  const usagePct = messagesLimit ? Math.min((messagesUsedTl / messagesLimit) * 100, 100) : 0
  let barColor = '#6366f1'
  if (usagePct > 85) barColor = '#ef4444'
  else if (usagePct > 60) barColor = '#f59e0b'
  const hasNotificationChat = !!telegramConfig?.telegram_chat_id
  const hasOwnBot = ownBotInfo?.bot_type === 'own' && ownBotInfo?.bot_username
  // También consideramos conectado si existe un token en telegram_link_tokens
  // con used = true y telegram_username = 'admin' (regla solicitada).
  const isTelegramConnected = !!hasOwnBot || tokenConnected
  const limitReached = messagesLimit !== null && messagesUsedTl >= messagesLimit
  const canDisconnectOwnBot = !!hasOwnBot

  // Clases del card Estado del Bot (evita ternarios anidados en JSX)
  let statusCardBg: string
  let statusDotClass: string
  let statusTextClass: string
  let statusLabel: string
  if (limitReached) {
    statusCardBg = 'bg-red-950/20 border-red-500/30'
    statusDotClass = 'bg-red-500'
    statusTextClass = 'text-red-400'
    statusLabel = 'Bot Pausado'
  } else if (hasOwnBot || tokenConnected) {
    statusCardBg = 'bg-emerald-900/20 border-emerald-700/30'
    statusDotClass = 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]'
    statusTextClass = 'text-emerald-400'
    statusLabel = 'Telegram Conectado'
  } else if (hasNotificationChat) {
    statusCardBg = 'bg-sky-900/10 border-sky-500/20'
    statusDotClass = 'bg-sky-400'
    statusTextClass = 'text-sky-300'
    statusLabel = 'Notificaciones activas'
  } else {
    statusCardBg = 'bg-gray-900/60 border-white/5'
    statusDotClass = 'bg-gray-600'
    statusTextClass = 'text-gray-500'
    statusLabel = 'Sin Conexión'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold text-white">Telegram</h2>
      <p className="text-gray-400 text-sm">Configura el bot de ventas IA para tu tienda en Telegram.</p>

      {/* ── Cards de estado ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ESTADO DEL BOT */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-4 backdrop-blur-sm">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase text-center">Estado del Bot</p>
          <div className={`rounded-xl p-4 text-center space-y-2 border ${statusCardBg}`}>
            <div className={`w-3 h-3 rounded-full mx-auto ${statusDotClass}`} />
            <p className={`text-sm font-extrabold tracking-widest uppercase ${statusTextClass}`}>
              {statusLabel}
            </p>
            {ownBotInfo?.bot_type === 'own' && ownBotInfo?.bot_username && (
              <>
                <div className="h-px bg-white/5 mx-2" />
                <p className="text-[10px] tracking-widest text-gray-500 uppercase">Bot vinculado</p>
                <div className="inline-block bg-black/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-white font-mono">@{ownBotInfo.bot_username}</span>
                </div>
              </>
            )}
            {telegramConfig?.telegram_chat_id && (
              <>
                <div className="h-px bg-white/5 mx-2" />
                <p className="text-[10px] tracking-widest text-gray-500 uppercase">Chat ID vinculado</p>
                <div className="inline-block bg-black/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-white font-mono">{telegramConfig.telegram_chat_id}</span>
                </div>
              </>
            )}
          </div>
          {canDisconnectOwnBot ? (
            <button
              className="w-full text-center text-[10px] text-red-400/80 cursor-pointer hover:text-red-400 transition-colors bg-transparent border-0"
              onClick={disconnectOwnBot}
            >
              DESVINCULAR CUENTA
            </button>
          ) : tokenConnected ? (
            <button
              className="w-full text-center text-[10px] text-red-400/80 cursor-pointer hover:text-red-400 transition-colors bg-transparent border-0"
              onClick={disconnectLinkToken}
              disabled={disconnectingToken}
            >
              {disconnectingToken ? 'Desconectando...' : 'DESVINCULAR CUENTA'}
            </button>
          ) : null}
        </div>

        {/* CRÉDITOS MENSUALES */}
        <div className={`rounded-2xl bg-white/[0.03] border p-5 space-y-4 backdrop-blur-sm ${limitReached ? 'border-red-500/40' : 'border-white/5'}`}>
          <p className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase text-center">Créditos Mensuales</p>
          <div className={`rounded-xl border p-4 text-center space-y-3 ${limitReached ? 'bg-red-950/30 border-red-500/30' : 'bg-gray-900/60 border-white/5'}`}>
            <p className="text-4xl font-black tracking-tight text-white italic">{(profile?.plan_type || 'FREE').toUpperCase()}</p>
            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>USO</span>
              <span className="font-mono text-white">
                {messagesUsedTl.toLocaleString('es-CL')} / {messagesLimit ? messagesLimit.toLocaleString('es-CL') : '∞'}
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: messagesLimit ? `${usagePct}%` : '100%', background: messagesLimit ? barColor : '#6366f1', opacity: messagesLimit ? 1 : 0.4 }}
              />
            </div>
            {!messagesLimit && (
              <p className="text-[10px] text-indigo-400/70 italic">Mensajes ilimitados bajo política de uso justo</p>
            )}
            {limitReached && (
              <p className="text-[10px] text-red-400 font-bold tracking-wide uppercase">Límite alcanzado — bot pausado</p>
            )}
            {!limitReached && messagesLimit && usagePct > 85 && (
              <p className="text-[10px] text-amber-400 italic">Cerca del límite — considera actualizar tu plan</p>
            )}
          </div>
          {planCode !== 'full' && (
            <button
              onClick={() => goToPlans?.()}
              className="w-full py-2 text-xs font-bold rounded-xl border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition-all"
            >
              Ver planes →
            </button>
          )}
        </div>
      </div>

      {/* Info: notificaciones están en pestaña separada */}
      <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-800/40 text-sm text-blue-300">
        💬 Para recibir alertas de ventas e inventario en tu Telegram personal, ve a <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'notifications' }))} className="underline font-medium">Notificaciones</button>.
      </div>

      {/* BLOQUEO POR LÍMITE */}
      {limitReached && (
        <div className="relative rounded-2xl overflow-hidden border border-red-500/40 bg-red-950/20 p-6 text-center space-y-3">
          <div className="text-3xl">🚫</div>
          <p className="text-red-400 font-bold text-base">Bot pausado — límite mensual alcanzado</p>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Has usado todos tus mensajes de Telegram este mes. El bot no responderá hasta que actualices tu plan.
          </p>
          <button
            onClick={() => goToPlans?.()}
            className="mt-2 inline-block py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
          >
            Actualizar plan →
          </button>
        </div>
      )}

      {planCode === 'free' ? (
        <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-300 mb-4">El bot de ventas IA no está disponible en el plan Semilla.</p>
          <div className="flex gap-3">
            <button onClick={() => (goToPlans ? goToPlans() : window.dispatchEvent(new CustomEvent('changeTab', { detail: 'plans' })))} className="py-2 px-4 bg-blue-600 text-white rounded-xl">Ver planes</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          
          {['basic', 'pro', 'full'].includes(planCode) && (
            <div className="p-5 rounded-2xl border bg-gray-900 transition-all border-gray-800">
              <div className="mb-3">
                <div className="text-white font-medium">Bot de Ventas IA en Telegram</div>
                <div className="text-xs text-gray-400">Puedes usar el bot de MiTiendaVirtual o conectar tu propio bot. El token se almacena cifrado.</div>
              </div>

              {/* Bot propio conectado — mostrar estado + QR + desconectar */}
              {ownBotInfo?.bot_type === 'own' && ownBotInfo.bot_username ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-900/20 border border-emerald-800/40">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <div className="text-sm text-white font-medium">@{ownBotInfo.bot_username}</div>
                      <div className="text-xs text-gray-400">Bot propio activo</div>
                    </div>
                  </div>

                  {/* QR para compartir — bot propio */}
                  <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                    <p className="text-sm text-gray-300 mb-2 font-medium">Comparte tu bot con clientes</p>
                    <div className="flex items-center gap-4">
                      <img
                        src={'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent('https://t.me/' + ownBotInfo.bot_username)}
                        alt="QR Bot propio"
                        className="w-32 h-32 rounded-lg bg-white p-1"
                      />
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>Link directo:</p>
                        <a href={`https://t.me/${ownBotInfo.bot_username}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">
                          t.me/{ownBotInfo.bot_username}
                        </a>
                        <p className="mt-2">Los clientes abren el bot y hablan directo con tu IA de ventas.</p>
                      </div>
                    </div>
                  </div>

                  <button onClick={disconnectOwnBot} disabled={disconnecting} className="py-2 px-4 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-sm transition-colors">
                    {disconnecting ? 'Desconectando...' : 'Desconectar bot propio'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Selector de tipo de bot */}
                  <div className="mb-4 flex gap-2">
                    <button type="button" onClick={() => {
                      setBotChoice('platform')
                      void startTelegramLink()
                    }} className={`py-2 px-4 rounded-xl text-sm ${botChoice === 'platform' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                      Usar bot de MiTiendaVirtual
                    </button>
                    <button type="button" onClick={() => setBotChoice('own')} className={`py-2 px-4 rounded-xl text-sm ${botChoice === 'own' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                      Usar mi bot
                    </button>
                  </div>

                  {botChoice === 'own' ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" className="flex-1 bg-black border border-gray-800 rounded-xl p-3 text-white outline-none text-sm" />
                        <button onClick={() => saveBotToken()} disabled={savingToken} className="py-2 px-4 bg-emerald-600 text-white rounded-xl text-sm whitespace-nowrap">{savingToken ? 'Conectando...' : 'Conectar bot'}</button>
                      </div>
                      <p className="text-xs text-gray-500">Obtén el token desde <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@BotFather</a> en Telegram → /newbot o /mybot → API Token.</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                      <p className="text-sm text-gray-300 mb-2 font-medium">QR del bot de plataforma</p>
                      <div className="flex items-center gap-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://t.me/mi_tienda_virtual_bot')}`}
                          alt="QR Bot MiTiendaVirtual"
                          className="w-32 h-32 rounded-lg bg-white p-1"
                        />
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>Bot compartido de MiTiendaVirtual.</p>
                          <p>Los clientes entran y escriben el nombre de tu tienda para conectarse.</p>
                          <a href="https://t.me/mi_tienda_virtual_bot" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                            t.me/mi_tienda_virtual_bot
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
