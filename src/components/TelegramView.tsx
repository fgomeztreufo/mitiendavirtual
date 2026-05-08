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

export default function TelegramView({ session, profile, instance, onUpdate, goToPlans }: TelegramViewProps) {
  // Endpoints Vercel serverless — no requieren configuración extra
  const API_BASE = '/api';
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [savingToken, setSavingToken] = useState(false)
  const [botToken, setBotToken] = useState('')

  const planCode = normalizePlanType(profile?.plan_type)

  const [botChoice, setBotChoice] = useState<'platform' | 'own'>('platform')

  useEffect(() => {
    if (session?.user?.id) fetchConfigs()
  }, [session?.user?.id])

  async function fetchConfigs() {
    try {
      const { data, error } = await supabase
        .from('user_notification_configs')
        .select('*')
        .eq('user_id', session.user.id)

      if (error) throw error
      setConfigs(data || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function startTelegramLink() {
    const accessToken = (session as any)?.access_token || (session as any)?.accessToken || ''
    if (!accessToken) return Swal.fire('Error', 'Sesión no válida. Vuelve a iniciar sesión.', 'error')

    try {
      setLinking(true)
      const res = await fetch(`${API_BASE}/telegram-link-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) {
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
              } else {
                const el = document.getElementById('tg-status')
                if (el) el.textContent = `Esperando confirmación... (${attempts * 3}s)`
              }
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

  async function saveBotToken() {
    if (!botToken) return Swal.fire('Error', 'Ingresa el token del bot.', 'warning')
    const accessToken = (session as any)?.access_token || (session as any)?.accessToken || ''
    if (!accessToken) return Swal.fire('Error', 'Sesión no válida. Vuelve a iniciar sesión.', 'error')

    try {
      setSavingToken(true)
      // Para Pro/Full con bot propio se sigue usando n8n para almacenamiento seguro
      const WEBHOOK_BASE = ((import.meta as any).env?.VITE_WEBHOOK_BASE as string) || 'https://webhook.mitiendavirtual.cl/webhook';
      const res = await fetch(`${WEBHOOK_BASE}/telegram-store-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ bot_token: botToken, instance_id: instance?.id, tienda_id: instance?.id })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        Swal.fire('Error', json.message || 'No se pudo guardar el token.', 'error')
        return
      }
      Swal.fire('Guardado', 'Token guardado correctamente en el servidor.', 'success')
      setBotToken('')
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Ocurrió un error al guardar el token.', 'error')
    } finally {
      setSavingToken(false)
    }
  }

  const telegramConfig = configs.find(c => c.channel_type === 'telegram')

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <h2 className="text-2xl font-bold text-white">Telegram</h2>
      <p className="text-gray-400 text-sm">Configura el bot de ventas IA para tu tienda en Telegram.</p>

      {/* Info: notificaciones están en pestaña separada */}
      <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-800/40 text-sm text-blue-300">
        💬 Para recibir alertas de ventas e inventario en tu Telegram personal, ve a <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'notifications' }))} className="underline font-medium">Notificaciones</button>.
      </div>

      {planCode === 'free' ? (
        <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-300 mb-4">El bot de ventas IA no está disponible en el plan Semilla.</p>
          <div className="flex gap-3">
            <button onClick={() => (goToPlans ? goToPlans() : window.dispatchEvent(new CustomEvent('changeTab', { detail: 'plans' })))} className="py-2 px-4 bg-blue-600 text-white rounded-xl">Ver planes</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {planCode === 'basic' && (
            <div className="p-5 rounded-2xl border bg-gray-900 border-gray-800">
              <p className="text-sm text-gray-300 mb-1 font-medium">Bot de ventas IA</p>
              <p className="text-xs text-gray-500 mb-4">El bot de ventas IA con bot propio está disponible desde el plan Pro. Con el plan Basic usas el bot de MiTiendaVirtual.</p>
              <button onClick={() => (goToPlans ? goToPlans() : window.dispatchEvent(new CustomEvent('changeTab', { detail: 'plans' })))} className="py-2 px-4 bg-blue-600 text-white rounded-xl text-sm">Actualizar a Pro</button>
            </div>
          )}
          {['pro', 'full'].includes(planCode) && (
            <div className="p-5 rounded-2xl border bg-gray-900 transition-all border-gray-800">
              <div className="mb-3">
                <div className="text-white font-medium">Conectar Bot propio (Ventas con IA)</div>
                <div className="text-xs text-gray-400">Puedes usar el bot de MiTiendaVirtual o conectar tu propio bot pegando su token. El token se almacenará de forma segura.</div>
              </div>

              <div className="mb-4 flex gap-2">
                <button type="button" onClick={() => {
                  setBotChoice('platform')
                  void startTelegramLink()
                }} className={`py-2 px-4 rounded-xl ${botChoice === 'platform' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                  Usar bot de MiTiendaVirtual
                </button>
                <button type="button" onClick={() => setBotChoice('own')} className={`py-2 px-4 rounded-xl ${botChoice === 'own' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                  Usar mi bot
                </button>
              </div>

              {botChoice === 'own' ? (
                <div className="flex gap-3">
                  <input value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" className="flex-1 bg-black border border-gray-800 rounded-xl p-3 text-white outline-none" />
                  <button onClick={() => saveBotToken()} disabled={savingToken} className="py-2 px-4 bg-emerald-600 text-white rounded-xl">{savingToken ? 'Guardando...' : 'Guardar token'}</button>
                </div>
              ) : (
                <div className="text-sm text-gray-400">Se usará el bot oficial de MiTiendaVirtual para enviar notificaciones.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
